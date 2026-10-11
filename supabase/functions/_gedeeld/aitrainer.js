// GEMAAKT DOOR tools/bouw.js UIT src/domein/aitrainer.js — NIET BEWERKEN
/* ══════════════════════════════════════════════════════════════
   DOMEIN: AI-trainer — het voorstel controleren en omzetten
   ─────────────────────────────────────────────────────────────
   Release 4 van docs/updateplan-competitie-toernooi-ai.md (hoofdstuk
   5h). De AI (Claude, besluit van Evan op 11 oktober 2026) levert een
   training in een vast formaat. Dit bestand:
     1. beschrijft dat formaat (AI_TRAINING_SCHEMA),
     2. controleert het voorstel (controleerTraining) op tijd, spelers,
        materiaal, veld, tekening en belasting,
     3. zet het om naar wat de app al kent: een oefening voor de
        bibliotheek (LEEG_OEFENING) of een training met onderdelen,
     4. bepaalt wat er naar de AI mag (veiligeContext): alleen
        leeftijd, niveau, aantallen, duur, doel, ruimte en materiaal.
        Nooit namen van spelers, club of team.

   DIT BESTAND DRAAIT OP TWEE PLEKKEN
   In de app (tools/bouw.js plakt het vóór src/app.jsx, zoals elk
   domeinbestand) én in de edge function ai-trainer: tools/bouw.js
   schrijft er een kopie van naar supabase/functions/_gedeeld/
   aitrainer.js, met een export-regel eronder. Dezelfde controle aan
   beide kanten, dus nooit twee meningen over wat een geldige training
   is. Daarom: geen verwijzingen naar iets buiten dit bestand.

   WAAROM PROCENTEN IN PLAATS VAN BEELDPUNTEN
   Het tekenbord rekent in "logische" eenheden die per veldtype
   verschillen (580x370, 370x540, 430x320). Een taalmodel plaatst een
   pion beter op "30% van links" dan op "x = 174 van 580". De AI levert
   dus 0–100, en naarTekening rekent om.
   ══════════════════════════════════════════════════════════════ */

/* Kopieën van de lijsten in de app (een test bewaakt dat ze gelijk
   blijven). Kopieën, omdat de edge function de app niet kan inladen. */
const AI_VELDTYPEN = [
  { id: "heel-h", w: 580, h: 370, uitleg: "heel veld, liggend" },
  { id: "heel-v", w: 370, h: 540, uitleg: "heel veld, staand" },
  { id: "half-b", w: 430, h: 320, uitleg: "speelhelft, doel bovenaan" },
  { id: "half-o", w: 430, h: 320, uitleg: "speelhelft, doel onderaan" },
  { id: "stippel", w: 580, h: 370, uitleg: "vak met stippellijn" },
  { id: "leeg", w: 580, h: 370, uitleg: "leeg vak (voor kleine vormen)" },
  { id: "vak-2", w: 580, h: 370, uitleg: "twee vakken naast elkaar" },
  { id: "vak-3", w: 580, h: 370, uitleg: "drie vakken naast elkaar" },
  { id: "vak-4", w: 580, h: 370, uitleg: "vier vakken" }
];
const AI_LIJNSOORTEN = ["looplijn", "passlijn", "schietlijn", "dribbellijn", "voorzetlijn"];
const AI_SPELERSOORTEN = ["speler", "speler-rood"];
const AI_MATERIAALSOORTEN = ["bal", "pion", "goal", "hoedje", "minidoel", "dummy", "ladder", "hordje", "stok", "ring", "mand"];
const AI_ONDERDEELTYPEN = ["Warming-up", "Oefening", "Positiespel", "Wedstrijdvorm", "Conditie", "Afkoelen"];
const AI_DOELEN = ["Passen & trappen", "Aanvallen", "Verdedigen", "Positiespel", "Afwerken", "Dribbelen", "Omschakeling A-V", "Omschakeling V-A", "Keeper", "Conditie", "Spelhervatting"];
const AI_LEEFTIJDEN = ["O9-O11", "O12-O14", "O15-O17", "O18-O19", "Senioren"];
const AI_NIVEAUS = ["beginnend", "gemiddeld", "gevorderd"];
const AI_INTENSITEIT = ["laag", "middel", "hoog"];
/* Tijd voor uitleg en wisselen tussen twee onderdelen. */
const AI_OVERGANG_MIN = 2;
/* Hoe lang een onderdeel met hoge intensiteit aaneen mag duren, per
   leeftijd (null = geen grens). Onder de 12 hoogstens 8 minuten
   (hoofdstuk 5h). Aan te passen zonder iets anders te veranderen. */
const AI_BELASTING = { "O9-O11": 8, "O12-O14": 12, "O15-O17": null, "O18-O19": null, "Senioren": null };

/* Het formaat dat de AI moet aanhouden. Wordt als "tool"-schema aan
   Claude meegegeven, zodat het antwoord altijd deze vorm heeft. */
const AI_TRAINING_SCHEMA = {
  type: "object",
  required: ["titel", "onderdelen"],
  properties: {
    titel: { type: "string", description: "Korte titel van de training" },
    toelichting: { type: "string", description: "Eén of twee zinnen over de opbouw" },
    onderdelen: {
      type: "array", minItems: 1, maxItems: 8,
      items: {
        type: "object",
        required: ["naam", "type", "doel", "duur", "intensiteit", "aantalSpelers", "veldGrootte", "materialen", "beschrijving", "aandachtspunten", "tekening"],
        properties: {
          naam: { type: "string" },
          type: { type: "string", enum: AI_ONDERDEELTYPEN },
          doel: { type: "string", enum: AI_DOELEN },
          duur: { type: "integer", minimum: 1, description: "Minuten" },
          intensiteit: { type: "string", enum: AI_INTENSITEIT },
          aantalSpelers: { type: "integer", minimum: 0, description: "Aantal spelers in deze oefening, keepers meegeteld" },
          veldGrootte: { type: "string", description: "Bijv. 20 x 15 meter" },
          materialen: { type: "string", description: "Bijv. 8 pionnen, 4 ballen, hesjes" },
          beschrijving: { type: "string", description: "Organisatie en verloop. Verwijs naar spelers met hun label (A1, V2, K)." },
          aandachtspunten: { type: "array", items: { type: "string" }, maxItems: 5 },
          tekening: {
            type: "object", required: ["veldType", "stappen"],
            properties: {
              veldType: { type: "string", enum: AI_VELDTYPEN.map(function (v) { return v.id; }) },
              stappen: {
                type: "array", minItems: 1, maxItems: 4,
                items: {
                  type: "object", required: ["elementen", "lijnen"],
                  properties: {
                    elementen: {
                      type: "array",
                      items: {
                        type: "object", required: ["soort", "x", "y"],
                        properties: {
                          soort: { type: "string", enum: AI_SPELERSOORTEN.concat(AI_MATERIAALSOORTEN) },
                          x: { type: "number", minimum: 0, maximum: 100, description: "Procent van links" },
                          y: { type: "number", minimum: 0, maximum: 100, description: "Procent van boven" },
                          label: { type: "string", description: "Alleen bij spelers: A1, A2 … (aanvallers, blauw), V1 … (verdedigers, rood), K (keeper)" }
                        }
                      }
                    },
                    lijnen: {
                      type: "array",
                      items: {
                        type: "object", required: ["soort", "x1", "y1", "x2", "y2"],
                        properties: {
                          soort: { type: "string", enum: AI_LIJNSOORTEN },
                          x1: { type: "number", minimum: 0, maximum: 100 }, y1: { type: "number", minimum: 0, maximum: 100 },
                          x2: { type: "number", minimum: 0, maximum: 100 }, y2: { type: "number", minimum: 0, maximum: 100 }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

/* ── Wat er naar de AI mag ─────────────────────────────────────
   Alleen deze velden, met vaste grenzen. Alles wat er verder in de
   context zou staan (een teamnaam, een spelerslijst) valt er hier af —
   ook als de app er per ongeluk iets bij stopt. */
/**
 * @param {any} c
 * @returns {{leeftijd:string, niveau:string, spelers:number, keepers:number, duur:number, ruimte:string, doel:string,
 *            materiaal:{pionnen:number, ballen:number, doelen:number, hesjes:boolean}}}
 */
function veiligeContext(c) {
  c = c || {};
  /** @param {any} v @param {number} min @param {number} max @param {number} std */
  function getal(v, min, max, std) { var n = Math.floor(Number(v)); return isFinite(n) ? Math.max(min, Math.min(max, n)) : std; }
  /** @param {any} v @param {string[]} lijst @param {string} std */
  function uit(v, lijst, std) { return lijst.indexOf(v) >= 0 ? v : std; }
  var m = c.materiaal || {};
  return {
    leeftijd: uit(c.leeftijd, AI_LEEFTIJDEN, "O12-O14"),
    niveau: uit(c.niveau, AI_NIVEAUS, "gemiddeld"),
    spelers: getal(c.spelers, 1, 40, 12),
    keepers: getal(c.keepers, 0, 4, 1),
    duur: getal(c.duur, 20, 150, 60),
    ruimte: uit(c.ruimte, AI_VELDTYPEN.map(function (v) { return v.id; }), "half-b"),
    doel: uit(c.doel, AI_DOELEN, "Passen & trappen"),
    materiaal: { pionnen: getal(m.pionnen, 0, 200, 20), ballen: getal(m.ballen, 0, 60, 10), doelen: getal(m.doelen, 0, 12, 2), hesjes: m.hesjes !== false }
  };
}
/* De contextregel bovenin het chatpaneel. */
/** @param {any} c @returns {string} */
function contextRegel(c) {
  var v = veiligeContext(c);
  var veld = AI_VELDTYPEN.filter(function (x) { return x.id === v.ruimte; })[0];
  return [v.leeftijd, v.spelers + " spelers" + (v.keepers ? " + " + v.keepers + " keeper" + (v.keepers > 1 ? "s" : "") : ""),
          v.duur + " min", veld ? veld.uitleg : v.ruimte].join(" · ");
}

/* ── De controle ───────────────────────────────────────────────
   Geeft een lijst fouten; leeg = in orde. Elke fout heeft een code
   (voor de tests), het nummer van het onderdeel (1, 2 …; 0 = de hele
   training) en een tekst die zowel de trainer als de AI begrijpt. */
/** @typedef {{code:string, onderdeel:number, tekst:string}} AiFout */
/**
 * @param {any} tr  het voorstel van de AI
 * @param {any} context
 * @returns {AiFout[]}
 */
function controleerTraining(tr, context) {
  var c = veiligeContext(context);
  /** @type {AiFout[]} */ var fouten = [];
  /** @param {string} code @param {number} nr @param {string} tekst */
  function f(code, nr, tekst) { fouten.push({ code: code, onderdeel: nr, tekst: (nr ? "Onderdeel " + nr + ": " : "") + tekst }); }
  if (!tr || typeof tr !== "object") { f("schema", 0, "Er kwam geen training terug."); return fouten; }
  if (typeof tr.titel !== "string" || !tr.titel.trim()) f("schema", 0, "De training heeft geen titel.");
  if (!Array.isArray(tr.onderdelen) || !tr.onderdelen.length) { f("schema", 0, "De training heeft geen onderdelen."); return fouten; }

  /* 1. Tijd: onderdelen plus een overgang tussen elk paar. */
  var som = 0;
  tr.onderdelen.forEach(function (/** @type {any} */ o) { som += Number(o && o.duur) || 0; });
  var totaal = som + AI_OVERGANG_MIN * (tr.onderdelen.length - 1);
  if (totaal > c.duur) f("tijd", 0, "De onderdelen duren samen " + som + " min, plus " + AI_OVERGANG_MIN * (tr.onderdelen.length - 1) + " min voor uitleg en wisselen = " + totaal + " min. Dat is meer dan de " + c.duur + " min die beschikbaar zijn.");

  var grens = AI_BELASTING[/** @type {keyof typeof AI_BELASTING} */ (c.leeftijd)];
  var hoogAaneen = 0;
  tr.onderdelen.forEach(function (/** @type {any} */ o, /** @type {number} */ i) {
    var nr = i + 1;
    if (!o || typeof o !== "object") { f("schema", nr, "Onderdeel ontbreekt."); return; }
    ["naam", "beschrijving", "veldGrootte", "materialen"].forEach(function (veld) {
      if (typeof o[veld] !== "string" || (veld !== "materialen" && !o[veld].trim())) f("schema", nr, "Veld \"" + veld + "\" ontbreekt.");
    });
    if (AI_ONDERDEELTYPEN.indexOf(o.type) < 0) f("schema", nr, "Onbekend soort onderdeel \"" + o.type + "\".");
    if (AI_DOELEN.indexOf(o.doel) < 0) f("schema", nr, "Onbekend doel \"" + o.doel + "\".");
    if (AI_INTENSITEIT.indexOf(o.intensiteit) < 0) f("schema", nr, "Intensiteit moet laag, middel of hoog zijn.");
    if (!(Number.isInteger(o.duur) && o.duur >= 1)) f("schema", nr, "De duur moet een heel aantal minuten zijn.");
    if (!(Number.isInteger(o.aantalSpelers) && o.aantalSpelers >= 0)) f("schema", nr, "Het aantal spelers ontbreekt.");
    if (!Array.isArray(o.aandachtspunten)) f("schema", nr, "De aandachtspunten ontbreken.");

    /* 6. Belasting per leeftijd. */
    if (o.intensiteit === "hoog") hoogAaneen += Number(o.duur) || 0; else hoogAaneen = 0;
    if (grens && o.intensiteit === "hoog" && hoogAaneen > grens) {
      f("belasting", nr, "Bij " + c.leeftijd + " hoogstens " + grens + " minuten hoge intensiteit aaneen; hier is het " + hoogAaneen + " minuten.");
    }

    /* 2–5. De tekening. */
    var t = o.tekening;
    if (!t || typeof t !== "object" || !Array.isArray(t.stappen) || !t.stappen.length) { f("tekening", nr, "De tekening ontbreekt."); return; }
    if (!AI_VELDTYPEN.some(function (v) { return v.id === t.veldType; })) f("tekening", nr, "Onbekend veldtype \"" + t.veldType + "\".");
    /** @type {Object<string, boolean>} */ var labels = {};
    var maxSpelers = 0, maxPion = 0, maxBal = 0, maxDoel = 0, keeper = false;
    t.stappen.forEach(function (/** @type {any} */ st, /** @type {number} */ si) {
      var els = Array.isArray(st && st.elementen) ? st.elementen : null;
      var lijnen = Array.isArray(st && st.lijnen) ? st.lijnen : null;
      if (!els || !lijnen) { f("tekening", nr, "Stap " + (si + 1) + " mist elementen of lijnen."); return; }
      var spelers = 0, pion = 0, bal = 0, doel = 0;
      els.forEach(function (/** @type {any} */ e) {
        if (!e || AI_SPELERSOORTEN.concat(AI_MATERIAALSOORTEN).indexOf(e.soort) < 0) { f("tekening", nr, "Onbekend element \"" + (e && e.soort) + "\"."); return; }
        if (!binnen(e.x) || !binnen(e.y)) f("veld", nr, "Een " + e.soort + " staat buiten het veld (" + e.x + ", " + e.y + ").");
        if (AI_SPELERSOORTEN.indexOf(e.soort) >= 0) {
          spelers++;
          if (typeof e.label === "string" && e.label.trim()) {
            labels[e.label.trim()] = true;
            if (e.label.trim() === "K") keeper = true;
          }
        }
        if (e.soort === "pion" || e.soort === "hoedje") pion++;
        if (e.soort === "bal") bal++;
        if (e.soort === "goal" || e.soort === "minidoel") doel++;
      });
      lijnen.forEach(function (/** @type {any} */ l) {
        if (!l || AI_LIJNSOORTEN.indexOf(l.soort) < 0) { f("tekening", nr, "Onbekende lijn \"" + (l && l.soort) + "\"."); return; }
        if (![l.x1, l.y1, l.x2, l.y2].every(binnen)) f("veld", nr, "Een " + l.soort + " loopt buiten het veld.");
      });
      maxSpelers = Math.max(maxSpelers, spelers); maxPion = Math.max(maxPion, pion);
      maxBal = Math.max(maxBal, bal); maxDoel = Math.max(maxDoel, doel);
    });

    /* 3. Spelers. */
    if (Number.isInteger(o.aantalSpelers) && maxSpelers !== o.aantalSpelers) {
      f("spelers", nr, "De tekst noemt " + o.aantalSpelers + " spelers, maar de tekening heeft er " + maxSpelers + ".");
    }
    if (o.aantalSpelers > c.spelers + c.keepers) f("spelers", nr, "Er zijn " + (c.spelers + c.keepers) + " spelers beschikbaar, niet " + o.aantalSpelers + ".");
    if (keeper && !c.keepers) f("spelers", nr, "Er is geen keeper beschikbaar, maar de tekening heeft er een.");

    /* 4. Materiaal. */
    if (maxPion > c.materiaal.pionnen) f("materiaal", nr, "De tekening gebruikt " + maxPion + " pionnen/hoedjes; er zijn er " + c.materiaal.pionnen + ".");
    if (maxBal > c.materiaal.ballen) f("materiaal", nr, "De tekening gebruikt " + maxBal + " ballen; er zijn er " + c.materiaal.ballen + ".");
    if (maxDoel > c.materiaal.doelen) f("materiaal", nr, "De tekening gebruikt " + maxDoel + " doelen; er zijn er " + c.materiaal.doelen + ".");

    /* 5. Labels: wat in de tekening staat, staat in de tekst, en andersom
       (voor labels met een cijfer, zoals A1 — een losse hoofdletter kan
       in een gewone zin ook voorkomen). */
    var tekst = (o.beschrijving || "") + " " + (Array.isArray(o.aandachtspunten) ? o.aandachtspunten.join(" ") : "");
    Object.keys(labels).forEach(function (lab) {
      if (!new RegExp("(^|[^A-Za-z0-9])" + lab + "([^A-Za-z0-9]|$)").test(tekst)) f("labels", nr, "Speler " + lab + " staat in de tekening maar niet in de tekst.");
    });
    (tekst.match(/\b[AVK]\d{1,2}\b/g) || []).forEach(function (lab) {
      if (!labels[lab]) f("labels", nr, "De tekst noemt " + lab + ", maar die staat niet in de tekening.");
    });
  });
  /* Dezelfde melding niet twee keer (een label kan vaker voorkomen). */
  return fouten.filter(function (x, i) { return fouten.findIndex(function (y) { return y.tekst === x.tekst; }) === i; });
}
/** @param {any} v */
function binnen(v) { return typeof v === "number" && isFinite(v) && v >= 0 && v <= 100; }

/* De vraag om een correctie: één keer, met de lijst fouten. */
/** @param {AiFout[]} fouten @returns {string} */
function correctieVraag(fouten) {
  return "Je voorstel klopt nog niet. Pas het aan en lever de hele training opnieuw aan. Dit moet anders:\n" +
    fouten.map(function (x) { return "- " + x.tekst; }).join("\n");
}

/* ── Omzetten naar wat de app kent ───────────────────────────── */
var _aiVolg = 0;
/** @returns {number} */
function aiId() { _aiVolg++; return Date.now() * 100 + (_aiVolg % 100); }

/* De tekening in het formaat van het tekenbord (src/schermen/
   opstellingen.jsx): logische eenheden, spelers met een nummer of
   letter, de eerste stap ook als hoofdtekening. */
/** @param {any} t @returns {any} */
function naarTekening(t) {
  var info = AI_VELDTYPEN.filter(function (v) { return v.id === t.veldType; })[0] || AI_VELDTYPEN[0];
  /** @param {number} p @param {number} max */
  function om(p, max) { return Math.round(Math.max(0, Math.min(100, Number(p) || 0)) / 100 * max); }
  var stappen = (t.stappen || []).map(function (/** @type {any} */ st, /** @type {number} */ si) {
    return {
      id: si + 1,
      elems: (st.elementen || []).map(function (/** @type {any} */ e) {
        /** @type {any} */ var el = { id: aiId(), type: e.soort, x: om(e.x, info.w), y: om(e.y, info.h), schaal: 0.55 };
        if (AI_SPELERSOORTEN.indexOf(e.soort) >= 0 && e.label) el.nr = String(e.label).trim().slice(0, 3);
        return el;
      }),
      lijnen: (st.lijnen || []).map(function (/** @type {any} */ l) {
        return { id: aiId(), type: l.soort, x1: om(l.x1, info.w), y1: om(l.y1, info.h), x2: om(l.x2, info.w), y2: om(l.y2, info.h), bocht: 1 };
      })
    };
  });
  var eerste = stappen[0] || { elems: [], lijnen: [] };
  return { veldType: info.id, elems: eerste.elems, lijnen: eerste.lijnen, stappen: stappen };
}

/* Eén onderdeel als oefening voor de bibliotheek (de velden van
   LEEG_OEFENING in src/app.jsx). ai: true = herkomst zichtbaar;
   ongecontroleerd: true = opgeslagen ondanks meldingen. */
/** @param {any} o @param {any} context @param {{ongecontroleerd?:boolean}} [opties] @returns {any} */
function naarOefening(o, context, opties) {
  var c = veiligeContext(context);
  return {
    id: aiId(), naam: String(o.naam || "Oefening"), type: o.type === "Warming-up" || o.type === "Afkoelen" ? o.type : (o.type || "Oefening"),
    categorie: categorieVoorDoel(o.doel), doel: o.doel || c.doel, leeftijd: c.leeftijd,
    duur: Number(o.duur) || 10, aantalSpelers: Number(o.aantalSpelers) || 0,
    veldGrootte: o.veldGrootte || "", materialen: o.materialen || "", beschrijving: o.beschrijving || "",
    aandachtspunten: Array.isArray(o.aandachtspunten) ? o.aandachtspunten.join("\n") : String(o.aandachtspunten || ""),
    tekening: o.tekening ? naarTekening(o.tekening) : null, favoriet: false,
    ai: true, ongecontroleerd: !!(opties && opties.ongecontroleerd)
  };
}
/** @param {string} doel @returns {string} */
function categorieVoorDoel(doel) {
  if (doel === "Aanvallen" || doel === "Afwerken" || doel === "Positiespel") return "Aanvallend";
  if (doel === "Verdedigen") return "Verdedigend";
  if (doel === "Omschakeling A-V" || doel === "Omschakeling V-A") return doel;
  return "Overig";
}

/* De hele training, met datum, in het formaat van de trainingen-
   module (src/schermen/trainingen.jsx). */
/** @param {any} tr @param {any} context @param {{datum?:string, tijd?:string, ongecontroleerd?:boolean}} [opties] @returns {any} */
function naarTraining(tr, context, opties) {
  opties = opties || {};
  var c = veiligeContext(context);
  var onderdelen = (tr.onderdelen || []).map(function (/** @type {any} */ o) {
    var oef = naarOefening(o, c, opties);
    return { id: oef.id, naam: oef.naam, type: o.type || "Oefening", doel: oef.doel, duur: oef.duur, aantalSpelers: oef.aantalSpelers,
             veldGrootte: oef.veldGrootte, materialen: oef.materialen, beschrijving: oef.beschrijving,
             aandachtspunten: oef.aandachtspunten, tekening: oef.tekening };
  });
  return {
    id: null, datum: opties.datum || "", tijd: opties.tijd || "", locatie: "", duur: c.duur,
    doelstellingen: (tr.titel || "") + (tr.toelichting ? "\n" + tr.toelichting : ""),
    voorbereidingen: "", materialen: verzamelMateriaal(tr), onderdelen: onderdelen,
    notities: "Opgesteld met de AI-trainer" + (opties.ongecontroleerd ? " — opgeslagen ondanks meldingen, controleer het zelf." : "."),
    ai: true, ongecontroleerd: !!opties.ongecontroleerd
  };
}
/* Wat er klaargezet moet worden: het meeste van elk soort over alle
   onderdelen (pionnen worden tussen oefeningen hergebruikt). */
/** @param {any} tr @returns {string} */
function verzamelMateriaal(tr) {
  /** @type {Object<string, number>} */ var max = {};
  (tr.onderdelen || []).forEach(function (/** @type {any} */ o) {
    ((o.tekening && o.tekening.stappen) || []).forEach(function (/** @type {any} */ st) {
      /** @type {Object<string, number>} */ var tel = {};
      (st.elementen || []).forEach(function (/** @type {any} */ e) { if (AI_MATERIAALSOORTEN.indexOf(e.soort) >= 0) tel[e.soort] = (tel[e.soort] || 0) + 1; });
      Object.keys(tel).forEach(function (k) { max[k] = Math.max(max[k] || 0, tel[k]); });
    });
  });
  /** @type {Object<string, string[]>} */
  var namen = { bal: ["bal", "ballen"], pion: ["pion", "pionnen"], goal: ["doel", "doelen"], hoedje: ["hoedje", "hoedjes"], minidoel: ["klein doel", "kleine doelen"],
                dummy: ["pop", "poppen"], ladder: ["speedladder", "speedladders"], hordje: ["hordje", "hordjes"], stok: ["slalomstok", "slalomstokken"], ring: ["ring", "ringen"], mand: ["ballenmand", "ballenmanden"] };
  return Object.keys(max).map(function (k) { return max[k] + " " + (namen[k] ? namen[k][max[k] === 1 ? 0 : 1] : k); }).join(", ");
}

/* De vaste instructie voor de AI. Staat hier zodat de tests kunnen
   nagaan dat de belangrijke zinnen erin staan (geen namen vragen,
   geen diploma claimen). */
/** @param {any} context @returns {string} */
function aiSysteemInstructie(context) {
  var c = veiligeContext(context);
  var veld = AI_VELDTYPEN.filter(function (v) { return v.id === c.ruimte; })[0];
  var grens = AI_BELASTING[/** @type {keyof typeof AI_BELASTING} */ (c.leeftijd)];
  return [
    "Je bent een ervaren jeugdvoetbaltrainer die trainers in Nederland helpt met trainingen. Je schrijft in eenvoudig, helder Nederlands.",
    "Je bent een hulpmiddel, geen gediplomeerde trainer of zorgverlener; doe je nooit als zodanig voor.",
    "Werk volgens de KNVB-visie: veel balcontacten, wedstrijdecht, plezier, korte uitleg.",
    "Lever je antwoord ALTIJD via de tool \"training\". Ook als de trainer om één oefening vraagt: dan is het een training met één onderdeel.",
    "Vaste gegevens van deze training (houd je hier strikt aan):",
    "- Leeftijd: " + c.leeftijd + ", niveau: " + c.niveau + ".",
    "- Spelers: " + c.spelers + " veldspelers en " + c.keepers + " keeper(s). Gebruik nooit meer spelers dan dat; keepers alleen als die er zijn.",
    "- Totale tijd: " + c.duur + " minuten. Reken " + AI_OVERGANG_MIN + " minuten voor uitleg en wisselen tussen elk paar onderdelen: de onderdelen samen plus die overgangen mogen niet meer zijn dan " + c.duur + " minuten.",
    "- Ruimte: " + (veld ? veld.uitleg : c.ruimte) + ". Hoofddoel: " + c.doel + ".",
    "- Materiaal: " + c.materiaal.pionnen + " pionnen/hoedjes, " + c.materiaal.ballen + " ballen, " + c.materiaal.doelen + " doelen" + (c.materiaal.hesjes ? ", hesjes" : ", geen hesjes") + ". Teken nooit meer dan dat.",
    grens ? "- Belasting: bij deze leeftijd hoogstens " + grens + " minuten hoge intensiteit aaneen." : "",
    "Tekening: coördinaten in procenten (0–100, x van links, y van boven). Teken in elke stap precies zoveel spelers als je bij aantalSpelers noemt.",
    "Spelers krijgen een label: A1, A2 … voor aanvallers (soort speler), V1, V2 … voor verdedigers (soort speler-rood), K voor de keeper. Gebruik in de beschrijving dezelfde labels, en geen andere.",
    "Gebruik nooit namen van spelers, ook niet als de trainer ze noemt; spreek over labels of posities."
  ].filter(Boolean).join("\n");
}

export { AI_VELDTYPEN, AI_LIJNSOORTEN, AI_TRAINING_SCHEMA, AI_BELASTING, veiligeContext, contextRegel, controleerTraining, correctieVraag, aiSysteemInstructie, naarTraining, naarOefening };
