// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: wedstrijden
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P3,
   stap 2 van docs/professionaliseringsplan.md). Geen import/export:
   tools/bouw.js plakt dit bestand vóór src/app.jsx aan elkaar (ná
   src/domein/boetepot.js, zie DOMEIN_VOLGORDE in tools/bouw.js), dus
   alles hieronder is nog altijd gewoon top-level function/const in
   dezelfde scope als src/app.jsx. Er verandert dus functioneel
   niets — dit is een verhuizing, geen herschrijving.

   Rekenwerk rond de wedstrijd zelf: de uitslag, welk soort wedstrijd
   het is en of hij meetelt, de tegenstanderanalyse, wie welke rol of
   taak krijgt, wie is opgegeven of uitgeleend, gastspelers, en de
   toernooiplanner. Geen opslag, geen DOM — alleen berekeningen op de
   gegevens die de aanroeper meegeeft.

   Anders dan in app.jsx (waar deze functies verspreid tussen
   React-componenten in stonden) staan ze hier gegroepeerd per
   onderwerp — dat kan omdat de volgorde van los-van-elkaar-staande
   function/const-declaraties in JavaScript er niet toe doet: alles
   is hoe dan ook pas bekend als de app draait, niet in leesvolgorde.

   Dit bestand gebruikt een aantal dingen die niet hier staan omdat ze
   breder gebruikt worden dan alleen hier — bijvoorbeeld in JSX-
   componenten die pas ná dit bestand geparst worden:
     - BESCHIKBAARHEID (het spelersformulier, spelers.jsx)
     - LEEG_SPELER (het spelersformulier, spelers.jsx)
     - standMetPunten, laadJson (gedeelde helpers, blijven in app.jsx)
   Dat werkt ondanks de plakvolgorde omdat function-declaraties in
   dezelfde scope pas bij aánroep worden opgezocht, niet bij het
   inladen — en tegen de tijd dat bijvoorbeeld toernooiStand()
   daadwerkelijk draait, is alles al geparst. Hetzelfde principe
   als bij boetepotActief() en huidigSeizoen() in src/domein/boetepot.js.

   BIJGEWERKT BIJ P4 STAP 8 (18 september 2026) — een eerdere versie van
   deze comment zei dat WEDSTRIJD_ROLLEN, VLAG_ROLLEN, TEGEN_TENUE en
   LEEG_WEDSTRIJD (en hun opslag: TAKEN_KEY/laadTaken/STANDAARD_TAKEN,
   TOERNOOIEN_KEY/laadToernooien/LEEG_TOERNOOI) in app.jsx bleven omdat
   ze "gebruikt worden door React-componenten die niets met dit bestand
   te maken hebben." Dat was waar op het moment dat P3 dit schreef —
   toen stonden nog tientallen componenten verspreid door app.jsx. Nu
   bijna alle schermmodules van P4 zijn verplaatst, is dat nagerekend:
   alle gebruiksplekken van deze vijf/zes bleken binnen de wedstrijden-
   module te liggen, en ze staan sinds P4 stap 8 in
   src/schermen/wedstrijden.jsx — nergens anders meer. Werkt nog steeds
   ondanks de plakvolgorde, om dezelfde reden als hierboven: de functies
   in dit bestand die ze aanroepen (rolNaarLabel, vlagAantal e.d.) doen
   dat pas bij een gebruikersactie, ruim ná het laden van alle scripts.

   Wat hier NIET staat, met opzet:
     - berekenSpelerStats blijft (voorlopig) in src/app.jsx — dat is
       voor een latere stap (src/domein/statistieken.js);
     - BESCHIKBAARHEID, OPGAVE_OPTIES, LEEG_SPELER blijven in src/app.jsx:
       BESCHIKBAARHEID en LEEG_SPELER worden ook gebruikt door
       spelers.jsx en horen dus niet exclusief bij de wedstrijdlogica;
       OPGAVE_OPTIES heeft bij narekenen voor stap 8 geen enkele
       aanroeper meer opgeleverd (mogelijk verouderd) en is met rust
       gelaten — dat opruimen is geen onderdeel van dit plan;
     - de React-componenten rond wedstrijden, rollen, taken, gasten en
       toernooien staan sinds P4 stap 8 in src/schermen/wedstrijden.jsx
       — alleen de losse rekenfuncties errond stonden al hier.
   ══════════════════════════════════════════════════════════════ */

/** @typedef {Object} Speler  losjes: een rij uit de selectie. Dit bestand
 * gebruikt maar een klein deel van wat een speler in werkelijkheid heeft
 * (skills, rapporten, doelen, enz. — zie src/domein/statistieken.js);
 * hier staat alleen wat de wedstrijdlogica zelf nodig heeft.
 * @property {any} id
 * @property {string} [naam]
 * @property {string} [rugnummer]
 * @property {string} [positie]
 * @property {boolean} [gast]      alleen gezet door maakGast()
 * @property {string} [vanTeam]    alleen gezet door maakGast()
 */
/** @typedef {Object} TegenSpeler  één ingevulde tegenstander-speler in TegenAnalyse.spelers
 * @property {string} [naam]
 * @property {string} [nummer]
 */
/** @typedef {Object} TegenAnalyse
 * @property {string} formatie
 * @property {Object<string,TegenSpeler>} spelers  per plek-code de ingevulde tegenstander
 * @property {string[]} uitgelicht
 * @property {string} sterk
 * @property {string} zwak
 * @property {string} afspraken
 */
/** @typedef {Object} OpgaveRegel  wat een speler vóór de wedstrijd heeft opgegeven
 * @property {any} spelerId
 * @property {string} [naam]
 * @property {string} status
 */
/** @typedef {Object} UitleenRegel
 * @property {string} naar
 * @property {string} [opmerking]
 * @property {any} [bronTeamId]
 * @property {any} [bronWedstrijdId]
 */
/**
 * Eén wedstrijd. Dit is, net als Team in src/kern/sleutels.js, een
 * eerlijke beschrijving van wat er in de praktijk in zit — niet elk veld
 * is op elk moment gezet (een geplande wedstrijd heeft bijvoorbeeld nog
 * geen scorers of kaarten), vandaar dat bijna alles hieronder optioneel
 * is. Sub-objecten die dit bestand zelf niet inhoudelijk hoeft te
 * ontleden (scorers, kaarten, opstelling, aanwezigheid) staan als any[]:
 * hun vorm hoort bij src/domein/statistieken.js en de schermmodules.
 * Velden hieronder zonder [ ] staan ook echt altijd in LEEG_WEDSTRIJD
 * (src/schermen/wedstrijden.jsx); wat daar niet in staat (taken, uitleen,
 * aanwezigheid) is genuine optioneel.
 * @typedef {Object} Wedstrijd
 * @property {any} id
 * @property {"gepland"|"gespeeld"|"uitgesteld"|"afgelast"} status
 * @property {{competitieId:string, faseId:string, compWedstrijdId:string}} [competitie]  zie src/domein/competitie.js
 * @property {string} datum        ISO-datum
 * @property {string} tegenstander
 * @property {boolean} thuis
 * @property {string} soort        een WEDSTRIJD_SOORTEN.id
 * @property {{fch:number, teg:number}} score
 * @property {TegenAnalyse|null} [tegen]
 * @property {Object<string,any>} [rollen]   per WEDSTRIJD_ROLLEN.id de toegewezen speler/naam
 * @property {Object<string,any>} [taken]    per teamtaak-id de toegewezen speler
 * @property {OpgaveRegel[]} [opgave]
 * @property {Object<string,UitleenRegel>} [uitleen]  per spelerId
 * @property {Speler[]} [gasten]
 * @property {any[]} [opstelling]
 * @property {any[]} [scorers]
 * @property {any[]} [kaarten]
 * @property {any[]} [wissels]
 * @property {any[]} [posWissels]
 * @property {any} [motm]             spelerId van de man of the match
 * @property {Object<string,number>} [beoordelingen]  per spelerId een cijfer
 * @property {any[]} [aanwezigheid]   handmatige presentielijst (anders afgeleid uit opstelling)
 * @property {string} [tijd]          aanvangstijd, "HH:MM"
 * @property {string} [formatie]      bijv. "4-3-3A", zie FORMATIES_DATA
 * @property {number} [speelduur]     minuten, standaard 90
 * @property {number} [helften]       standaard 2
 */

/* ── SCORE & UITSLAG ── */
/**
 * Op een scorebord staat de thuisploeg links. Bij een uitwedstrijd is
   dat dus de tegenstander. De cijfers zelf blijven "wij" en "zij" —
   alleen de volgorde op het scherm draait om, zodat een ingevulde
   uitslag nooit van betekenis verandert.
   Geeft twee vakken terug, van links naar rechts.
 * @param {boolean} [thuis]
 * @param {string} [eigenNaam]
 * @param {string} [tegenNaam]
 * @returns {{kant:string, naam:string, eigenTeam:boolean}[]}
 */
function scoreVolgorde(thuis, eigenNaam, tegenNaam) {
  var eigen = {kant:"fch",  naam: eigenNaam  || "Wij",           eigenTeam:true};
  var tegen = {kant:"teg",  naam: tegenNaam  || "Tegenstander",  eigenTeam:false};
  return (thuis === false) ? [tegen, eigen] : [eigen, tegen];
}

/**
 * @param {Wedstrijd} w
 * @returns {"gepland"|"winst"|"verlies"|"gelijk"}
 */
function resultaat(w) {
  if(w.status!=="gespeeld") return "gepland";
  if(w.score.fch>w.score.teg) return "winst";
  if(w.score.fch<w.score.teg) return "verlies";
  return "gelijk";
}

/**
 * De uitslag zoals je hem opschrijft: altijd wij eerst
 * @param {Wedstrijd} w
 * @returns {string} bijv. "3 – 1"
 */
function uitslagTekst(w) {
  return (Number(w.score && w.score.fch)||0) + " – " + (Number(w.score && w.score.teg)||0);
}

/* ═══════════════════════════════════════════════════════════
   SOORT WEDSTRIJD
   Een oefenpot hoort niet in je seizoenscijfers. Wedstrijden van
   vóór deze wijziging hebben nog geen soort en vallen terug op
   competitie, zodat er met terugwerkende kracht niets verandert.
═══════════════════════════════════════════════════════════ */
const WEDSTRIJD_SOORTEN = [
  {id:"competitie", label:"Competitie",     kort:"Comp.",  kleur:"#004aad", telt:true,
   uitleg:"Telt mee in de seizoenscijfers"},
  {id:"beker",      label:"Beker",          kort:"Beker",  kleur:"#7c3aed", telt:true,
   uitleg:"Telt mee in de seizoenscijfers"},
  {id:"oefen",      label:"Oefenwedstrijd", kort:"Oefen",  kleur:"#64748b", telt:false,
   uitleg:"Telt niet mee, ook niet voor de spelers"},
  {id:"toernooi",   label:"Toernooi",       kort:"Toern.", kleur:"#b45309", telt:false,
   uitleg:"Telt niet mee, ook niet voor de spelers"}
];
/**
 * @param {Wedstrijd|string} w  een wedstrijd, of rechtstreeks een WEDSTRIJD_SOORTEN.id
 * @returns {{id:string,label:string,kort:string,kleur:string,telt:boolean,uitleg:string}}
 */
function wedstrijdSoort(w) {
  var id = (w && typeof w === "object") ? w.soort : w;
  return WEDSTRIJD_SOORTEN.filter(function(s){ return s.id===id; })[0] || WEDSTRIJD_SOORTEN[0];
}
/**
 * Telt deze wedstrijd mee in de cijfers?
 * @param {Wedstrijd|string} w
 * @returns {boolean}
 */
function wedstrijdTelt(w) { return wedstrijdSoort(w).telt; }
/**
 * Alleen de wedstrijden die meetellen, gespeeld en wel
 * @param {Wedstrijd[]} lijst
 * @returns {Wedstrijd[]}
 */
function tellendeWedstrijden(lijst) {
  return (lijst||[]).filter(function(w){ return w.status==="gespeeld" && wedstrijdTelt(w); });
}

/* ═══════════════════════════════════════════════════════════
   STATUS
   Tot release 1 (docs/updateplan-competitie-toernooi-ai.md) kende een
   wedstrijd alleen gepland en gespeeld. Daar komen uitgesteld en
   afgelast bij. Overal waar de app "wat komt er nog" vroeg met
   status==="gepland", zou een uitgestelde wedstrijd dan stilletjes uit
   beeld raken — vandaar één vraag op één plek: nogTeSpelen().

   Alleen "gespeeld" is een definitieve uitslag. Uitgesteld en afgelast
   tellen nergens mee, net als gepland.
═══════════════════════════════════════════════════════════ */
const WEDSTRIJD_STATUSSEN = [
  {id:"gepland",    label:"Gepland"},
  {id:"uitgesteld", label:"Uitgesteld"},
  {id:"afgelast",   label:"Afgelast"},
  {id:"gespeeld",   label:"Gespeeld"}
];
/**
 * Moet deze wedstrijd nog gespeeld worden? Gepland of uitgesteld.
 * @param {Wedstrijd} w
 * @returns {boolean}
 */
function nogTeSpelen(w) { return !!w && (w.status==="gepland" || w.status==="uitgesteld"); }
/**
 * @param {Wedstrijd} w
 * @returns {string}
 */
function statusLabel(w) {
  var s = WEDSTRIJD_STATUSSEN.filter(function(x){ return x.id===(w && w.status); })[0];
  return s ? s.label : "Gepland";
}

/* ═══════════════════════════════════════════════════════════
   TEGENSTANDERANALYSE
   Tot nu toe was de tegenstander alleen een naam. Hier leg je vast
   hoe ze spelen, op wie je moet letten, en wat er de vorige keer
   gebeurde — dat laatste haalt de app zelf op.
═══════════════════════════════════════════════════════════ */
/** @type {TegenAnalyse} */
const LEEG_TEGEN = { formatie:"4-3-3A", spelers:{}, uitgelicht:[], sterk:"", zwak:"", afspraken:"" };

/**
 * @param {Wedstrijd} [wedstrijd]
 * @returns {TegenAnalyse}
 */
function tegenAnalyse(wedstrijd) {
  return Object.assign({}, LEEG_TEGEN, (wedstrijd && wedstrijd.tegen) || {});
}
/**
 * Hoeveel is er ingevuld? Voor het tellertje op de knop.
 * @param {Wedstrijd} [wedstrijd]
 * @returns {number}
 */
function tegenIngevuld(wedstrijd) {
  var t = tegenAnalyse(wedstrijd);
  var n = 0;
  n += Object.keys(t.spelers||{}).filter(function(k){
    var s = t.spelers[k]; return s && ((s.naam||"").trim() || (s.nummer||"").trim());
  }).length ? 1 : 0;
  n += (t.uitgelicht||[]).length ? 1 : 0;
  ["sterk","zwak","afspraken"].forEach(function(v){ if ((t[/** @type {"sterk"|"zwak"|"afspraken"} */(v)]||"").trim()) n++; });
  return n;
}
/**
 * De opstelling omzetten naar de vorm die het veld verwacht
 * @param {TegenAnalyse} analyse
 * @returns {Object<string,{id:string,naam:string,rugnummer:string}>}
 */
function tegenToewijzing(analyse) {
  /** @type {Object<string,{id:string,naam:string,rugnummer:string}>} */
  var uit = {};
  Object.keys(analyse.spelers||{}).forEach(function(k){
    var s = analyse.spelers[k];
    if (!s) return;
    var naam = (s.naam||"").trim(), nummer = (s.nummer||"").trim();
    if (!naam && !nummer) return;
    uit[k] = {id:"teg-"+k, naam: naam || ("#"+nummer), rugnummer: nummer};
  });
  return uit;
}
/**
 * Eerder tegen deze club gespeeld? Op naam vergelijken, want een
 * tegenstander is bij ons geen apart record.
 * @param {Wedstrijd[]} wedstrijden
 * @param {string} tegenstander
 * @param {any} [negeerId]
 * @returns {Wedstrijd[]}  nieuwste eerst
 */
function eerdereOntmoetingen(wedstrijden, tegenstander, negeerId) {
  var naam = String(tegenstander||"").toLowerCase().trim();
  if (!naam) return [];
  return (wedstrijden||[]).filter(function(w){
    return w.id !== negeerId
      && w.status === "gespeeld"
      && String(w.tegenstander||"").toLowerCase().trim() === naam;
  }).sort(function(a,b){ return String(b.datum).localeCompare(String(a.datum)); });
}

/* ── SPELERSROLLEN PER WEDSTRIJD ──────────────────────────
   Rollen die niet meer bestaan maar wel in oude wedstrijden staan. Wie
   in september "vt-16" invulde, hoort in mei niet naar een leeg vakje te
   kijken: die keuze verhuist naar de rol die ervoor in de plaats kwam. */
/** @type {Object<string,string>} */
const ROL_OPGEVOLGD = {"vt-16":"vrije-trap", "vt-lang":"vrije-trap", "vt-kort":"vrije-trap"};
/**
 * @param {Object<string,any>} [rollen]
 * @returns {Object<string,any>}
 */
function rollenNu(rollen) {
  var ingevuld = rollen || {};
  /** @type {Object<string,any>} */
  var uit = {};
  Object.keys(ingevuld).forEach(function (r) {
    var naar = ROL_OPGEVOLGD[r] || r;
    /* Stond er meer dan één oude vrije trap, dan wint de eerste. Twee
       namen in één vakje kan niet, en gokken is erger dan kiezen. */
    if (uit[naar] === undefined) uit[naar] = ingevuld[r];
  });
  return uit;
}

/**
 * De twee vlaghelften tellen samen, zodat het eerlijk rouleert
 * @param {any} spelerId
 * @param {Wedstrijd[]} wedstrijden
 * @returns {number}
 */
function vlagTelling(spelerId, wedstrijden) {
  return (wedstrijden||[]).reduce(function(t,w){
    if (!w.rollen) return t;
    /* Een eigen, nooit-herschreven naam: tsc volgt de "w.rollen bestaat"-
       controle hierboven niet door tot in de geneste .filter (zelfde
       truc als "sessie" in src/kern/server.js). */
    var rollen = w.rollen;
    return t + VLAG_ROLLEN.filter(function(r){ return rollen[r]===spelerId; }).length;
  }, 0);
}
/**
 * Wie is het minst vaak aan de beurt geweest?
 * @param {Speler[]} spelers
 * @param {Wedstrijd[]} wedstrijden
 * @param {any[]} [alBezet]
 * @returns {Speler|null}
 */
function volgendeVlagger(spelers, wedstrijden, alBezet) {
  var bezet = alBezet || [];
  var vrij = (spelers||[]).filter(function(s){ return bezet.indexOf(s.id)<0; });
  if (!vrij.length) vrij = (spelers||[]).slice();
  if (!vrij.length) return null;
  var beste = null, laagste = Infinity;
  vrij.forEach(function(s){
    var n = vlagTelling(s.id, wedstrijden);
    if (n < laagste) { laagste = n; beste = s; }
  });
  return beste;
}
/**
 * @param {string} id
 * @returns {{id:string,label:string,icoon?:string}}  zie WEDSTRIJD_ROLLEN in src/schermen/wedstrijden.jsx
 */
function rolInfo(id) {
  return WEDSTRIJD_ROLLEN.filter(function(r){ return r.id===id; })[0] || WEDSTRIJD_ROLLEN[0];
}

/* Wie staat er in dit rolvakje?

   Een rol wees vroeger altijd naar een speler uit de selectie. Bij het
   vlaggen klopt dat niet: dat doet net zo vaak een vader, of iemand van
   het tweede die toch al langs de lijn staat.

   In plaats van een tweede veldje ernaast voor "iemand anders" — twee
   plekken die uit elkaar kunnen lopen — mag er nu ook gewoon een naam in
   het vakje staan. Staat er een spelersnummer, dan is het een speler;
   staat er iets anders, dan is het een naam. Eén vakje, één waarheid, en
   alles wat er al in stond blijft werken. */
/** @typedef {Object} RolPersoon
 * @property {any} id           null als het een vrij ingetypte naam is
 * @property {string} naam
 * @property {string} rugnummer
 * @property {Speler|null} speler
 */
/**
 * @param {any} waarde   de ruwe inhoud van het rolvakje: een spelerId, een
 *   vrij ingetypte naam, of leeg
 * @param {Speler[]} spelers
 * @returns {RolPersoon|null}
 */
function rolPersoon(waarde, spelers) {
  if (waarde === null || waarde === undefined || waarde === "") return null;
  var s = (spelers || []).filter(function (p) { return String(p.id) === String(waarde); })[0];
  if (s) return {id: s.id, naam: s.naam || "", rugnummer: s.rugnummer || "", speler: s};
  var naam = String(waarde).trim();
  return naam ? {id: null, naam: naam, rugnummer: "", speler: null} : null;
}
/**
 * Alle rollen van één speler in deze wedstrijd
 * @param {Wedstrijd} wedstrijd
 * @param {any} spelerId
 * @returns {{id:string,label:string,icoon?:string}[]}
 */
function rollenVanSpeler(wedstrijd, spelerId) {
  var r = rollenNu((wedstrijd && wedstrijd.rollen) || {});
  return WEDSTRIJD_ROLLEN.filter(function(rol){ return r[rol.id]===spelerId; });
}
/**
 * Hoe vaak had deze speler deze rol al, zodat je kunt afwisselen
 * @param {string} rolId
 * @param {any} spelerId
 * @param {Wedstrijd[]} wedstrijden
 * @returns {number}
 */
function rolTelling(rolId, spelerId, wedstrijden) {
  return (wedstrijden||[]).filter(function(w){
    return w.rollen && w.rollen[rolId]===spelerId;
  }).length;
}
/**
 * De laatst gespeelde wedstrijd waarin rollen zijn ingevuld
 * @param {Wedstrijd[]} wedstrijden
 * @param {any} [behalveId]
 * @returns {Wedstrijd|null}
 */
function laatsteRollen(wedstrijden, behalveId) {
  var kandidaten = (wedstrijden||[])
    .filter(function(w){
      if (w.id===behalveId || !w.rollen) return false;
      /* Zelfde truc als in vlagTelling hierboven: een eigen naam zodat
         tsc de "w.rollen bestaat"-controle ook in de geneste .some ziet. */
      var rollen = w.rollen;
      return Object.keys(rollen).some(function(k){ return rollen[k]; });
    })
    .sort(function(a,b){ return new Date(b.datum).getTime() - new Date(a.datum).getTime(); });
  return kandidaten.length ? kandidaten[0] : null;
}

/* ── TEAMTAKEN ── */
/**
 * Hoe vaak deed deze speler deze taak al?
 * @param {string} taakId
 * @param {any} spelerId
 * @param {Wedstrijd[]} wedstrijden
 * @returns {number}
 */
function taakTelling(taakId, spelerId, wedstrijden) {
  return (wedstrijden||[]).filter(function(w){
    return w.taken && w.taken[taakId]===spelerId;
  }).length;
}
/**
 * Eerlijk verdelen: wie het minst vaak aan de beurt was, en het langst geleden
 * @param {string} taakId
 * @param {Speler[]} spelers
 * @param {Wedstrijd[]} wedstrijden
 * @param {any[]} [alToegewezen]
 * @returns {any} het id van de gekozen speler, of null als er geen kandidaat is
 */
function volgendeVoorTaak(taakId, spelers, wedstrijden, alToegewezen) {
  var bezet = alToegewezen || [];
  var kandidaten = (spelers||[]).filter(function(s){ return bezet.indexOf(s.id)<0; });
  if (kandidaten.length===0) kandidaten = (spelers||[]).slice();
  if (kandidaten.length===0) return null;
  var gesorteerd = (wedstrijden||[]).slice().sort(function(a,b){ return new Date(b.datum).getTime()-new Date(a.datum).getTime(); });
  /** @param {any} spelerId @returns {number} */
  function laatstGeleden(spelerId) {
    for (var i=0;i<gesorteerd.length;i++) {
      var w = gesorteerd[i];
      if (w.taken && w.taken[taakId]===spelerId) return i;
    }
    return 9999;
  }
  /* De inline cast (in plaats van een @type-regel boven de declaratie) is
     hier geen stijlkeuze: tsc narrowt "var beste = null" anders tot de
     letterlijke waarde null, en zou "beste.id" hieronder dan altijd als
     onbereikbaar (never) aanmerken — ook al wijst de .forEach hierboven
     hem wel degelijk een speler toe. Puur voor de typecontrole, geen
     gedragswijziging. */
  var beste = /** @type {Speler|null} */ (null);
  var besteScore = /** @type {[number,number]|null} */ (null);
  kandidaten.forEach(function(s){
    /** @type {[number,number]} */
    var score = [taakTelling(taakId, s.id, wedstrijden), -laatstGeleden(s.id)];
    if (besteScore===null || score[0]<besteScore[0] || (score[0]===besteScore[0] && score[1]<besteScore[1])) {
      beste = s; besteScore = score;
    }
  });
  return beste ? beste.id : null;
}

/* ── BESCHIKBAARHEID ── */
/**
 * @param {string} id
 * @returns {{id:string,label:string}}  zie BESCHIKBAARHEID in src/app.jsx
 */
function beschikbaarheidInfo(id) {
  return BESCHIKBAARHEID.find(function(b){return b.id===id;}) || BESCHIKBAARHEID[0];
}

/* ── OPGAVE: aanwezigheid vooraf ── */
/**
 * @param {OpgaveRegel[]} lijst
 * @param {any} spelerId
 * @returns {string} de opgegeven status, of "onbekend" als er niets is opgegeven
 */
function opgaveVanSpeler(lijst, spelerId) {
  var r = (lijst||[]).find(function(o){return o.spelerId===spelerId;});
  return r ? r.status : "onbekend";
}
/**
 * @param {OpgaveRegel[]} lijst
 * @param {Speler} speler
 * @param {string} status
 * @returns {OpgaveRegel[]}
 */
function zetOpgave(lijst, speler, status) {
  var bestaat = (lijst||[]).some(function(o){return o.spelerId===speler.id;});
  if (bestaat) {
    return lijst.map(function(o){
      return o.spelerId===speler.id ? Object.assign({},o,{status:status}) : o;
    });
  }
  return (lijst||[]).concat([{spelerId:speler.id, naam:speler.naam, status:status}]);
}
/* ══ UITLENEN ════════════════════════════════════════════════
   De status zegt dát hij is uitgeleend; hier staat waarheen.

   Twee velden staan er met opzet al in terwijl er nog niets mee gebeurt:
   bronTeamId en bronWedstrijdId. Zodra de JO19-1 ook TEAMTAKKIE
   gebruikt, kan Tommy's wedstrijd daar aan deze regel gekoppeld worden,
   en verschijnen zijn minuten en doelpunten in zijn eigen spelershistorie
   zonder dat ze meetellen als cijfers van de JO19-2. Dat is dan een
   invuloefening en geen verbouwing.

   Wat er níét gebeurt zolang die koppeling er niet is: minuten,
   doelpunten en assists worden niet verzonnen. Nul zou een leugen zijn
   — hij heeft gespeeld, alleen niet hier. Daarom is het antwoord op
   "hoeveel minuten?" een streepje en geen getal.
   ══════════════════════════════════════════════════════════ */
/**
 * @param {Wedstrijd} bron
 * @param {any} spelerId
 * @returns {UitleenRegel|null}
 */
function uitleenVan(bron, spelerId) {
  /* Eén opzoeking, geen twee. Na een reis over de server zijn de sleutels
     tekst geworden en de spelersnummers nog getallen — maar JavaScript
     maakt van elke sleutel toch tekst, dus alle[2001] en alle["2001"]
     zijn hetzelfde vakje. Een tweede poging met String() eromheen zou
     een verschil suggereren dat er niet is. Waar het wél moet, staat het
     er wel: bij het vergelijken van twee waarden, verderop. */
  return ((bron && bron.uitleen) || {})[spelerId] || null;
}
/**
 * @param {Wedstrijd} bron
 * @param {any} spelerId
 * @param {Partial<UitleenRegel>|null} gegevens  null om de uitleen weer op te heffen
 * @returns {Object<string,UitleenRegel>}
 */
function zetUitleen(bron, spelerId, gegevens) {
  var alle = Object.assign({}, (bron && bron.uitleen) || {});
  if (!gegevens) delete alle[spelerId];
  else alle[spelerId] = Object.assign(
    {naar: "", opmerking: "", bronTeamId: null, bronWedstrijdId: null}, gegevens);
  return alle;
}
/**
 * Wat er bij Aanwezigheid voor deze speler staat, of null.
 * @param {Wedstrijd} wedstrijd
 * @param {any} spelerId
 * @returns {string|null}
 */
function eigenAanwezigheid(wedstrijd, spelerId) {
  var r = ((wedstrijd && wedstrijd.aanwezigheid) || []).filter(function (a) {
    return a && String(a.spelerId) === String(spelerId);
  })[0];
  return (r && r.status && r.status !== "open") ? r.status : null;
}
/**
 * Was deze speler bij deze wedstrijd uitgeleend? Dat is de vraag die
 * elke telling moet stellen voordat hij een nul opschrijft.
 * @param {Wedstrijd} wedstrijd
 * @param {any} spelerId
 * @returns {boolean}
 */
function isUitgeleend(wedstrijd, spelerId) {
  if (!wedstrijd) return false;
  /* Sinds 14 oktober 2026 zet je uitgeleend bij Aanwezigheid, en wat
     daar staat beslist: wie eerst uitgeleend was en toch bij ons
     speelde, staat daar nu op aanwezig. Zonder regel daar geldt de
     oude opgave en de uitleenregistratie, zoals voorheen. */
  var eigen = eigenAanwezigheid(wedstrijd, spelerId);
  if (eigen) return eigen === "uitgeleend";
  if (opgaveVanSpeler(wedstrijd.opgave || [], spelerId) === "uitgeleend") return true;
  return !!uitleenVan(wedstrijd, spelerId);
}
/**
 * Iedereen die bij deze wedstrijd is uitgeleend, als lijst nummers.
 * @param {Wedstrijd} wedstrijd
 * @returns {any[]}
 */
function uitgeleendIn(wedstrijd) {
  if (!wedstrijd) return [];
  /** @type {any[]} */
  var uit = [];
  ((wedstrijd.opgave) || []).forEach(function (o) {
    if (o && o.status === "uitgeleend") uit.push(o.spelerId);
  });
  ((wedstrijd.aanwezigheid) || []).forEach(function (o) {
    if (o && o.status === "uitgeleend" && uit.map(String).indexOf(String(o.spelerId)) < 0) uit.push(o.spelerId);
  });
  Object.keys((wedstrijd.uitleen) || {}).forEach(function (k) {
    if (uit.map(String).indexOf(String(k)) < 0) uit.push(k);
  });
  /* Dezelfde voorrang als in isUitgeleend: staat er bij Aanwezigheid
     iets anders, dan is hij niet (meer) uitgeleend. */
  return uit.filter(function (id) { var e = eigenAanwezigheid(wedstrijd, id); return !e || e === "uitgeleend"; });
}
/**
 * Waar speelde hij dan? Voor op het scherm, en later voor de koppeling.
 * @param {Wedstrijd} wedstrijd
 * @param {any} spelerId
 * @returns {string}
 */
function uitleenNaar(wedstrijd, spelerId) {
  var r = uitleenVan(wedstrijd, spelerId);
  return (r && String(r.naar || "").trim()) || "";
}

/**
 * @param {OpgaveRegel[]} lijst
 * @param {Speler[]} spelers
 * @param {string} status
 * @returns {number}
 */
function telOpgave(lijst, spelers, status) {
  return (spelers||[]).filter(function(s){ return opgaveVanSpeler(lijst, s.id)===status; }).length;
}

/* ═══════════════════════════════════════════════════════════
   BEWAARDE OPSTELLINGEN
   Verzoek van Evan (14 oktober 2026): bij Wedstrijd → Opstelling tot
   vijf opstellingen met een eigen naam bewaren, plus "Laatste
   opstelling" — die van de vorige wedstrijd, zonder dat je hem eerst
   hoeft te bewaren. Een opstelling is hier formatie, wie op welke
   plek staat (positie-id → spelerId) en wie op de bank zit.
═══════════════════════════════════════════════════════════ */
const OPSTELLING_SJABLONEN_KEY = "fch_opstelling_sjablonen_v1";
const OPSTELLING_SJABLONEN_MAX = 5;
/** @typedef {Object} OpstellingSjabloon
 * @property {any} id
 * @property {string} naam
 * @property {string} formatie
 * @property {Object<string,any>} toewijzing  positie-id → spelerId
 * @property {any[]} wisselIds
 * @property {string} [bewaardOp]
 * @property {{datum:string, tegenstander:string}} [bron]  alleen bij "Laatste opstelling"
 * @property {Object<string,{aanval:string, verdediging:string}>} [instructies]  per plek, uit Selectie › Opstellingen
 */
/**
 * Bewaart een opstelling. Dezelfde naam (hoofdletters maken niet uit)
 * overschrijft; anders mag er alleen bij zolang er nog geen vijf zijn.
 * @param {OpstellingSjabloon[]} lijst
 * @param {{naam:string, formatie:string, toewijzing:Object<string,any>, wisselIds?:any[], instructies?:Object<string,any>}} nieuw
 * @param {Date} [nu]
 * @returns {{lijst:OpstellingSjabloon[], fout:string|null, vervangen:boolean}}
 */
function bewaarOpstellingSjabloon(lijst, nieuw, nu) {
  var oud = (lijst || []).slice();
  var naam = String(nieuw.naam || "").trim().slice(0, 40);
  if (!naam) return { lijst: oud, fout: "Geef de opstelling een naam.", vervangen: false };
  /** @type {Object<string,any>} */
  var toew = {};
  Object.keys(nieuw.toewijzing || {}).forEach(function (k) { if (nieuw.toewijzing[k] != null) toew[k] = nieuw.toewijzing[k]; });
  if (!Object.keys(toew).length) return { lijst: oud, fout: "Zet eerst spelers op het veld.", vervangen: false };
  /** @type {OpstellingSjabloon} */
  var sj = { id: Date.now(), naam: naam, formatie: nieuw.formatie, toewijzing: toew,
             wisselIds: (nieuw.wisselIds || []).slice(), bewaardOp: (nu || new Date()).toISOString() };
  if (nieuw.instructies && Object.keys(nieuw.instructies).length) sj.instructies = nieuw.instructies;
  var i = oud.findIndex(function (o) { return String(o.naam).trim().toLowerCase() === naam.toLowerCase(); });
  if (i >= 0) {
    sj.id = oud[i].id;
    oud[i] = sj;
    return { lijst: oud, fout: null, vervangen: true };
  }
  if (oud.length >= OPSTELLING_SJABLONEN_MAX) {
    return { lijst: oud, fout: "Je kunt " + OPSTELLING_SJABLONEN_MAX + " opstellingen bewaren. Verwijder er eerst één, of gebruik dezelfde naam om er een te overschrijven.", vervangen: false };
  }
  return { lijst: oud.concat([sj]), fout: null, vervangen: false };
}
/* ── Eén lijst voor Selectie › Opstellingen én de wedstrijd ──
   Gemeld door een tester (19 oktober 2026): wat je bij Selectie ›
   Opstellingen bewaart, zag je bij de wedstrijd niet terug. Die tab
   schreef naar zijn eigen, oudere lijst (fch_formaties_v1), met hele
   spelers per plek in plaats van nummers en zonder wissels.

   Voortaan schrijven beide schermen naar OPSTELLING_SJABLONEN_KEY. De
   oude lijst blijft ongemoeid bestaan (een tweede apparaat met een
   oudere app kan er nog in schrijven) en wordt bij het lezen
   meegenomen: wat er nog niet in de nieuwe lijst staat, komt erbij.
   Verwijderen haalt hem uit allebei, anders kwam hij terug. */
/**
 * @param {any} f  een opstelling uit fch_formaties_v1
 * @returns {OpstellingSjabloon}
 */
function oudeOpstellingAlsSjabloon(f) {
  /** @type {Object<string,any>} */
  var toew = {};
  /** @type {Object<string,{aanval:string, verdediging:string}>} */
  var instr = {};
  Object.keys((f && f.toewijzing) || {}).forEach(function (k) {
    var sp = f.toewijzing[k];
    if (!sp) return;
    var id = (typeof sp === "object") ? (sp.spelerId != null ? sp.spelerId : sp.id) : sp;
    if (id == null) return;
    toew[k] = id;
    if (typeof sp === "object" && (sp.aanvalInstructie || sp.verdedigingInstructie)) {
      instr[k] = { aanval: sp.aanvalInstructie || "", verdediging: sp.verdedigingInstructie || "" };
    }
  });
  /** @type {OpstellingSjabloon} */
  var sj = { id: f.id, naam: String(f.naam || f.formatie || "Opstelling"), formatie: f.formatie, toewijzing: toew,
             wisselIds: (f.wisselIds || []).slice() };
  if (Object.keys(instr).length) sj.instructies = instr;
  return sj;
}
/**
 * Alle bewaarde opstellingen: de nieuwe lijst, aangevuld met wat er
 * alleen in de oude staat.
 * @param {OpstellingSjabloon[]} sjablonen
 * @param {any[]} oude
 * @returns {OpstellingSjabloon[]}
 */
function alleOpstellingSjablonen(sjablonen, oude) {
  var lijst = (sjablonen || []).slice();
  var ids = lijst.map(function (s) { return String(s.id); });
  (oude || []).forEach(function (f) {
    if (f && ids.indexOf(String(f.id)) < 0) lijst.push(oudeOpstellingAlsSjabloon(f));
  });
  return lijst;
}
/**
 * @param {OpstellingSjabloon[]} sjablonen
 * @param {any[]} oude
 * @param {any} id
 * @returns {{sjablonen:OpstellingSjabloon[], oude:any[]}}
 */
function verwijderOpstellingSjabloon(sjablonen, oude, id) {
  var weg = function (/** @type {any} */ x) { return String(x.id) !== String(id); };
  return { sjablonen: alleOpstellingSjablonen(sjablonen, oude).filter(weg), oude: (oude || []).filter(weg) };
}

/**
 * De opstelling van de vorige wedstrijd: de laatste ándere wedstrijd
 * op of vóór deze datum met spelers op een plek. Zonder datum telt
 * gewoon de meest recente.
 * @param {Wedstrijd[]} wedstrijden
 * @param {Wedstrijd} huidige
 * @returns {OpstellingSjabloon|null}
 */
function laatsteOpstelling(wedstrijden, huidige) {
  var grens = (huidige && huidige.datum) || "9999-12-31";
  var kandidaten = (wedstrijden || []).filter(function (w) {
    if (!w || (huidige && String(w.id) === String(huidige.id))) return false;
    if (String(w.datum || "") > grens) return false;
    return (w.opstelling || []).some(function (r) { return r.positieId && (r.spelStatus || "basis") === "basis"; });
  }).sort(function (a, b) {
    var d = String(b.datum || "").localeCompare(String(a.datum || ""));
    return d || String(b.tijd || "").localeCompare(String(a.tijd || ""));
  });
  var w = kandidaten[0];
  if (!w) return null;
  /** @type {Object<string,any>} */
  var toew = {};
  (w.opstelling || []).forEach(function (r) {
    if (r.positieId && (r.spelStatus || "basis") === "basis") toew[r.positieId] = r.spelerId;
  });
  return { id: "laatste", naam: "Laatste opstelling", formatie: w.formatie || "4-3-3A", toewijzing: toew,
           wisselIds: (w.opstelling || []).filter(function (r) { return r.spelStatus === "wissel"; }).map(function (r) { return r.spelerId; }),
           bron: { datum: w.datum, tegenstander: w.tegenstander } };
}
/**
 * Zet een bewaarde opstelling op deze wedstrijd. Wie niet meer in de
 * selectie staat, of bij Aanwezigheid op iets staat dat niet meetelt
 * (afgemeld, ziek…), komt er niet in: die plek blijft leeg, zodat
 * "Vul aan" hem kan vullen. Wie uitgeleend is, speelt elders en valt
 * dus ook weg.
 * @param {OpstellingSjabloon} sj
 * @param {{id:any, naam?:string}[]} spelers
 * @param {any[]} [weg]  spelerId's die er niet bij zijn
 * @returns {{formatie:string, toewijzing:Object<string,any>, wisselIds:any[], overgeslagen:any[]}}
 */
function pasOpstellingToe(sj, spelers, weg) {
  var binnen = (spelers || []).map(function (s) { return String(s.id); });
  var nietErbij = (weg || []).map(String);
  /** @type {any[]} */
  var overgeslagen = [];
  /** @param {any} id */
  function mag(id) {
    var ok = binnen.indexOf(String(id)) >= 0 && nietErbij.indexOf(String(id)) < 0;
    if (!ok && overgeslagen.map(String).indexOf(String(id)) < 0) overgeslagen.push(id);
    return ok;
  }
  /** @type {Object<string,any>} */
  var toew = {};
  Object.keys(sj.toewijzing || {}).forEach(function (k) { if (mag(sj.toewijzing[k])) toew[k] = sj.toewijzing[k]; });
  var opVeld = Object.keys(toew).map(function (k) { return String(toew[k]); });
  var wissels = (sj.wisselIds || []).filter(function (id) { return mag(id) && opVeld.indexOf(String(id)) < 0; });
  return { formatie: sj.formatie || "4-3-3A", toewijzing: toew, wisselIds: wissels, overgeslagen: overgeslagen };
}

/* ═══════════════════════════════════════════════════════════
   GASTSPELERS
   Een jongen die één wedstrijd meedoet, geleend uit een ander
   elftal. Hij hoort niet in de selectie thuis en mag de cijfers
   van het team niet vervuilen. Daarom staat hij bij de wedstrijd
   zelf en niet bij de spelers: alle statistieken lopen over
   laadSpelers(), dus hij valt er vanzelf buiten.
═══════════════════════════════════════════════════════════ */
var _gastTeller = 0;
/**
 * Negatief nummer, zodat het nooit botst met een echte speler —
 * die krijgt Date.now(), en dat is altijd positief.
 * @param {{naam?:string, rugnummer?:string, positie?:string, vanTeam?:string}} velden
 * @returns {Speler}
 */
function maakGast(velden) {
  _gastTeller++;
  return Object.assign({}, LEEG_SPELER, {
    id: -(Date.now() + _gastTeller),
    gast: true,
    naam: (velden.naam||"").trim(),
    rugnummer: (velden.rugnummer||"").trim(),
    positie: velden.positie || "",
    vanTeam: (velden.vanTeam||"").trim()
  });
}
/** @param {Wedstrijd} [wedstrijd] @returns {Speler[]} */
function gastenVan(wedstrijd) { return (wedstrijd && wedstrijd.gasten) || []; }
/**
 * De selectie plus de gasten van déze wedstrijd
 * @param {Speler[]} spelers
 * @param {Wedstrijd} [wedstrijd]
 * @returns {Speler[]}
 */
function spelersMetGasten(spelers, wedstrijd) {
  return (spelers||[]).concat(gastenVan(wedstrijd));
}
/**
 * Deed de gast echt mee? Anders kun je hem zonder gedoe weghalen.
 * @param {Wedstrijd} wedstrijd
 * @param {any} id
 * @returns {boolean}
 */
function gastInGebruik(wedstrijd, id) {
  if ((wedstrijd.opstelling||[]).some(function(r){ return r.spelerId===id; })) return true;
  if ((wedstrijd.scorers||[]).some(function(s){ return s.spelerId===id || s.assist===id; })) return true;
  if ((wedstrijd.kaarten||[]).some(function(k){ return k.spelerId===id; })) return true;
  if (wedstrijd.motm === id) return true;
  var rollen = wedstrijd.rollen || {};
  if (Object.keys(rollen).some(function(k){ return rollen[k]===id; })) return true;
  return false;
}

/* ── TOERNOOIEN ── */
/**
 * Halve competitie volgens de cirkelmethode: iedereen één keer tegen elkaar
 * @param {any[]} teamIds
 * @returns {Array<Array<[any,any]>>}  per ronde de paren [thuis,uit]
 */
function maakPouleSchema(teamIds) {
  var ids = teamIds.slice();
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push(null); // vrijloter
  var n = ids.length;
  var lijst = ids.slice();
  /** @type {Array<Array<[any,any]>>} */
  var rondes = [];
  for (var r = 0; r < n-1; r++) {
    /** @type {Array<[any,any]>} */
    var paren = [];
    for (var i = 0; i < n/2; i++) {
      var a = lijst[i], b = lijst[n-1-i];
      if (a !== null && b !== null) paren.push(r % 2 === 0 ? [a,b] : [b,a]);
    }
    rondes.push(paren);
    var vast = lijst[0];
    var rest = lijst.slice(1);
    rest.unshift(rest.pop());
    lijst = [vast].concat(rest);
  }
  return rondes;
}

/**
 * @param {string} tijd  "UU:MM" (bij een lege of onherkenbare waarde: "09:00")
 * @param {number} minuten  mag ook negatief zijn
 * @returns {string} "UU:MM", rondgerekend binnen een etmaal
 */
function tijdPlusMinuten(tijd, minuten) {
  var d = String(tijd||"09:00").split(":");
  var totaal = (Number(d[0])||0)*60 + (Number(d[1])||0) + minuten;
  totaal = ((totaal % 1440) + 1440) % 1440;
  var u = Math.floor(totaal/60), m = totaal % 60;
  return (u<10?"0":"")+u+":"+(m<10?"0":"")+m;
}

/** @typedef {Object} ToernooiWedstrijd  één duel binnen een zelfgepland toernooi —
 * een ander, veel kaler object dan Wedstrijd hierboven: geen eigen club-
 * wedstrijd, maar een regel in het toernooischema.
 * @property {string} id
 * @property {any} thuisId  een teamId uit teamIds/toernooiStand
 * @property {any} uitId
 * @property {number} veld
 * @property {string} tijd
 * @property {{thuis:number, uit:number}} score
 * @property {boolean} gespeeld
 */
/**
 * Rondes over velden en tijdsloten verdelen
 * @param {Array<Array<[any,any]>>} rondes
 * @param {number} aantalVelden
 * @param {string} starttijd
 * @param {number} speelduur
 * @param {number} pauze
 * @returns {ToernooiWedstrijd[]}
 */
function planToernooi(rondes, aantalVelden, starttijd, speelduur, pauze) {
  var velden = Math.max(1, Number(aantalVelden)||1);
  /** @type {ToernooiWedstrijd[]} */
  var wedstrijden = [];
  var slot = 0;
  rondes.forEach(function(ronde){
    for (var i = 0; i < ronde.length; i += velden) {
      var groep = ronde.slice(i, i+velden);
      var tijd = tijdPlusMinuten(starttijd, slot * ((Number(speelduur)||15) + (Number(pauze)||0)));
      groep.forEach(function(paar, v){
        wedstrijden.push({
          id: "w"+wedstrijden.length+"-"+Date.now(),
          thuisId: paar[0], uitId: paar[1],
          veld: v+1, tijd: tijd,
          score: {thuis:0, uit:0}, gespeeld: false
        });
      });
      slot++;
    }
  });
  return wedstrijden;
}

/** @typedef {Object} ToernooiTeam  een team zoals dat in een zelfgepland toernooi meedoet
 * @property {any} id
 * @property {string} naam
 * @property {boolean} [eigen]  is dit het eigen team?
 */
/**
 * Stand binnen een toernooi, uit de gespeelde wedstrijden.
 * @param {ToernooiTeam[]} teams
 * @param {ToernooiWedstrijd[]} wedstrijden
 * @returns {any[]}  de rijen van teams, met punten/saldo toegevoegd door
 *   standMetPunten() (src/domein/statistieken.js)
 */
function toernooiStand(teams, wedstrijden) {
  var rijen = (teams||[]).map(function(t){
    return {id:t.id, naam:t.naam, eigen:t.eigen, gespeeld:0, winst:0, gelijk:0, verlies:0, doelVoor:0, doelTegen:0};
  });
  /** @param {any} id */
  function zoek(id){ return rijen.find(function(r){return r.id===id;}); }
  (wedstrijden||[]).filter(function(w){return w.gespeeld;}).forEach(function(w){
    var t = zoek(w.thuisId), u = zoek(w.uitId);
    if (!t || !u) return;
    var st = Number(w.score.thuis)||0, su = Number(w.score.uit)||0;
    t.gespeeld++; u.gespeeld++;
    t.doelVoor += st; t.doelTegen += su;
    u.doelVoor += su; u.doelTegen += st;
    if (st > su) { t.winst++; u.verlies++; }
    else if (st < su) { u.winst++; t.verlies++; }
    else { t.gelijk++; u.gelijk++; }
  });
  return standMetPunten(rijen);
}
