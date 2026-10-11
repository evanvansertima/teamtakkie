// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: toernooi — categorieën, poules, knock-out, schema
   ─────────────────────────────────────────────────────────────
   Release 2 van docs/updateplan-competitie-toernooi-ai.md (hoofdstuk
   4e, 5e, 5f). Geschreven tegen tests/toernooi.test.js.

   DRIE REGELS DIE OVERAL GELDEN
   1. Een wedstrijd verbindt alleen deelnemers uit DEZELFDE categorie.
      Daardoor speelt een 11x11-team nooit tegen een 6x6-team.
   2. Doorstroming gebeurt pas als de organisator op "Start knock-out"
      klikt. Daarna wordt een plaatsing nooit ongemerkt veranderd: een
      late correctie in de groepsfase levert een melding op, en een al
      gespeelde vervolgwedstrijd blijft zoals hij was.
   3. Strafschoppen staan apart van de uitslag. Ze bepalen alleen de
      winnaar van een knock-outwedstrijd en tellen nergens als doelpunt.

   Een poulestand wordt uitgerekend met standVanFase uit
   src/domein/competitie.js: dezelfde puntentelling en hetzelfde
   onderlinge resultaat als in de competitie. In de competitie heet een
   deel van het seizoen "Fase"; hier heten de delen Groepsfase,
   Kwartfinale, Halve finale, Finale — nooit "Fase".

   Puur: invoer wordt niet aangepast. Geen import/export (tools/bouw.js).
   ══════════════════════════════════════════════════════════════ */

/** @typedef {{deelnemerId?:string, poulePlek?:{stadiumId:string,pouleId:string,plek:number},
 *   besteNummer?:{stadiumId:string,plek:number,rang:number}, winnaarVan?:string, verliezerVan?:string}} Bron */

const SPELVORMEN = ["11x11", "9x9", "8x8", "6x6", "4x4", "2x2", "1x1"];
const GESLACHTEN = ["jongens", "meisjes", "heren", "dames"];

var _tVolg = 0;
/** @param {string} voor @returns {string} */
function tId(voor) { _tVolg++; return voor + Date.now().toString(36) + "-" + _tVolg; }
/** @param {string} tijd @returns {number} minuten sinds middernacht */
function minVan(tijd) { var d = String(tijd || "0:0").split(":"); return (Number(d[0]) || 0) * 60 + (Number(d[1]) || 0); }

/** @returns {any} */
function nieuweCategorie() {
  return { id: tId("c"), naam: "Categorie", spelvorm: "11x11", geslacht: "jongens", leeftijd: "", niveau: "",
           wedstrijdduur: 20, wisseltijd: 5, minRust: 10,
           regels: JSON.parse(JSON.stringify(STANDAARD_REGELS)),
           knockoutGelijk: "strafschoppen", bonus: { aan: false, regels: [] }, spelerStats: false };
}

/** @param {{id?:string, naam?:string, datum?:string}} o @returns {any} */
function maakToernooi(o) {
  var c = nieuweCategorie();
  return {
    id: o.id || tId("t"), naam: o.naam || "Toernooi", versie: 2,
    dagen: [{ id: tId("d"), datum: o.datum || "", start: "09:00", eind: "17:00" }],
    locaties: [{ id: tId("l"), naam: "Locatie", adres: "", velden: [{ id: tId("v"), naam: "Veld 1" }] }],
    categorieen: [c], deelnemers: [], scheidsrechters: [], stadia: [], wedstrijden: [], evenementen: [],
    presentatie: {}, logboek: []
  };
}

/** @param {any} t @param {string} id */
function categorieVan(t, id) {
  var c = t.categorieen.filter(function (/** @type {any} */ x) { return x.id === id; })[0];
  if (!c) throw new Error("Onbekende categorie");
  return c;
}

/* Een deelnemer toevoegen. In dezelfde categorie geen tweede met
   dezelfde naam (zelfde normalisatie als bij de competitie). Bij 1x1 is
   een deelnemer een speler, geen team. */
/**
 * @param {any} t
 * @param {{categorieId:string, naam:string, sterkte?:number, coach?:string, email?:string, telefoon?:string, spelers?:string[], logo?:string}} d
 * @returns {{toernooi:any, id:string, nieuw:boolean}}
 */
function voegDeelnemerToe(t, d) {
  var naam = String(d.naam || "").trim();
  if (!normaliseerTeamNaam(naam)) throw new Error("Vul een naam in.");
  var cat = categorieVan(t, d.categorieId);
  var n = normaliseerTeamNaam(naam);
  var bestaand = t.deelnemers.filter(function (/** @type {any} */ x) {
    return x.categorieId === cat.id && normaliseerTeamNaam(x.naam) === n;
  })[0];
  if (bestaand) return { toernooi: t, id: bestaand.id, nieuw: false };
  var id = tId("dn");
  var nieuw = { id: id, categorieId: cat.id, soort: cat.spelvorm === "1x1" ? "speler" : "team", naam: naam,
                logo: d.logo || "", spelers: d.spelers || [], coach: d.coach || "", email: d.email || "",
                telefoon: d.telefoon || "", sterkte: d.sterkte || null };
  return { toernooi: Object.assign({}, t, { deelnemers: t.deelnemers.concat([nieuw]) }), id: id, nieuw: true };
}

/* Poules verdelen. Geplaatste teams (sterkte 1, 2, 3 …) eerst, in
   slangvorm (A, B, B, A, A, B …), de rest herhaalbaar door elkaar op
   een zaadwaarde: "opnieuw verdelen" met hetzelfde zaad geeft dezelfde
   indeling. Grotere poules eerst. */
/**
 * @param {string[]} ids
 * @param {number} aantal
 * @param {Object<string, number>} sterkte
 * @param {number} zaad
 * @returns {string[][]}
 */
function verdeelPoules(ids, aantal, sterkte, zaad) {
  var n = Math.max(1, Math.floor(aantal || 1));
  var geplaatst = ids.filter(function (id) { return sterkte && sterkte[id]; })
    .sort(function (a, b) { return sterkte[a] - sterkte[b]; });
  var rest = ids.filter(function (id) { return !(sterkte && sterkte[id]); }).slice();
  var s = (Math.floor(zaad) || 1) >>> 0;
  function toeval() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
  for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(toeval() * (i + 1)); var x = rest[i]; rest[i] = rest[j]; rest[j] = x; }
  var volgorde = geplaatst.concat(rest);
  /** @type {string[][]} */
  /** @type {any[]} */
  var poules = [];
  for (var p = 0; p < n; p++) poules.push([]);
  volgorde.forEach(function (id, k) {
    var ronde = Math.floor(k / n), pos = k % n;
    poules[ronde % 2 === 0 ? pos : n - 1 - pos].push(id);
  });
  return poules.map(function (l, k) { return { l: l, k: k }; })
    .sort(function (a, b) { return b.l.length - a.l.length || a.k - b.k; })
    .map(function (x) { return x.l; });
}

/** @param {any} t @returns {number} */
function volgendNummer(t) { return t.wedstrijden.reduce(function (/** @type {number} */ m, /** @type {any} */ w) { return Math.max(m, w.nummer || 0); }, 0) + 1; }

/** @param {any} t @param {string} catId @param {string|null} soort */
function zonderStadia(t, catId, soort) {
  var weg = t.stadia.filter(function (/** @type {any} */ s) { return s.categorieId === catId && (!soort || s.soort === soort); })
    .map(function (/** @type {any} */ s) { return s.id; });
  return Object.assign({}, t, {
    stadia: t.stadia.filter(function (/** @type {any} */ s) { return weg.indexOf(s.id) < 0; }),
    wedstrijden: t.wedstrijden.filter(function (/** @type {any} */ w) { return weg.indexOf(w.stadiumId) < 0; })
  });
}

/** @param {number} k @returns {string} "Poule A", "Poule B" … */
function pouleNaam(k) { return "Poule " + String.fromCharCode(65 + k); }

/** @param {any} catId @param {any} stadiumId @returns {any} */
function leegWedstrijd(catId, stadiumId) {
  return { id: tId("tw"), nummer: 0, categorieId: catId, stadiumId: stadiumId, pouleId: null, rondeNaam: "",
           thuis: {}, uit: {}, thuisVast: null, uitVast: null, dagId: null, veldId: null, start: null,
           scheidsId: null, vastgezet: false, status: "gepland", uitslag: null, strafschoppen: null, notitie: "" };
}

/* Een groepsfase voor één categorie. Vervangt wat er voor die categorie
   al stond (het scherm vraagt vooraf om bevestiging). */
/**
 * @param {any} t
 * @param {string} catId
 * @param {{poules:string[][], perPoule:number, besteNummers:({plek:number, aantal:number}|null)}} o
 * @returns {any}
 */
function maakGroepsfase(t, catId, o) {
  categorieVan(t, catId);
  o.poules.forEach(function (p) {
    p.forEach(function (id) {
      var d = t.deelnemers.filter(function (/** @type {any} */ x) { return x.id === id; })[0];
      if (!d || d.categorieId !== catId) throw new Error("Een deelnemer hoort niet bij deze categorie.");
    });
  });
  var nt = zonderStadia(t, catId, null);
  var stadium = { id: tId("s"), categorieId: catId, soort: "poule", naam: "Groepsfase",
    poules: o.poules.map(function (p, k) { return { id: tId("p"), naam: pouleNaam(k), deelnemers: p.slice() }; }),
    doorgaan: { perPoule: o.perPoule || 0, besteNummers: o.besteNummers || null } };
  var schemas = stadium.poules.map(function (p) { return maakPouleSchema(p.deelnemers); });
  var rondes = schemas.reduce(function (m, s) { return Math.max(m, s.length); }, 0);
  var nummer = volgendNummer(nt);
  /** @type {any[]} */
  var ws = [];
  for (var r = 0; r < rondes; r++) {
    stadium.poules.forEach(function (p, k) {
      (schemas[k][r] || []).forEach(function (paar) {
        var w = leegWedstrijd(catId, stadium.id);
        w.nummer = nummer++; w.pouleId = p.id; w.rondeNaam = "Groepsfase · ronde " + (r + 1);
        w.thuis = { deelnemerId: paar[0] }; w.uit = { deelnemerId: paar[1] };
        ws.push(w);
      });
    });
  }
  return Object.assign({}, nt, { stadia: nt.stadia.concat([stadium]), wedstrijden: nt.wedstrijden.concat(ws) });
}

/** @param {any} t @param {string} id */
function stadiumVan(t, id) {
  var s = t.stadia.filter(function (/** @type {any} */ x) { return x.id === id; })[0];
  if (!s) throw new Error("Onbekend toernooistadium");
  return s;
}

/* De stand van één poule, via standVanFase (src/domein/competitie.js). */
/** @param {any} t @param {string} stadiumId @param {string} pouleId @returns {any[]} */
function pouleStand(t, stadiumId, pouleId) {
  var s = stadiumVan(t, stadiumId);
  var p = s.poules.filter(function (/** @type {any} */ x) { return x.id === pouleId; })[0];
  var cat = categorieVan(t, s.categorieId);
  var c = { id: "x", naam: "", actieveFaseId: "f", logboek: [],
    teams: t.deelnemers.filter(function (/** @type {any} */ d) { return d.categorieId === s.categorieId; })
      .map(function (/** @type {any} */ d) { return { id: d.id, naam: d.naam, eigen: false, aliassen: [] }; }),
    fases: [{ id: "f", naam: "", status: "open", vorm: "handmatig", regels: cat.regels, deelnemers: p.deelnemers, rondes: [],
      wedstrijden: t.wedstrijden.filter(function (/** @type {any} */ w) { return w.pouleId === pouleId; })
        .map(function (/** @type {any} */ w) { return { id: w.id, thuisId: w.thuis.deelnemerId, uitId: w.uit.deelnemerId,
          status: w.status, uitslag: w.uitslag }; }) }] };
  return standVanFase(c, "f", []);
}

/** @param {any} t @param {string} stadiumId @returns {boolean} */
function groepsfaseCompleet(t, stadiumId) {
  var ws = t.wedstrijden.filter(function (/** @type {any} */ w) { return w.stadiumId === stadiumId; });
  return ws.length > 0 && ws.every(function (/** @type {any} */ w) { return w.status === "gespeeld" && w.uitslag; });
}

/* Beste nummers X over (mogelijk ongelijke) poules: op GEMIDDELDE per
   wedstrijd — punten, dan doelsaldo, dan doelpunten voor — zodat een
   poule met een team minder niet benadeeld wordt. */
/** @param {any} t @param {string} stadiumId @returns {any[]} */
function besteNummers(t, stadiumId) {
  var s = stadiumVan(t, stadiumId);
  var b = s.doorgaan && s.doorgaan.besteNummers;
  if (!b) return [];
  /** @type {any[]} */
  var kandidaten = [];
  s.poules.forEach(function (/** @type {any} */ p) {
    var rij = pouleStand(t, stadiumId, p.id)[b.plek - 1];
    if (rij) kandidaten.push(rij);
  });
  /** @param {any} r @param {string} veld */
  function gem(r, veld) { return r.gespeeld ? r[veld] / r.gespeeld : 0; }
  return kandidaten.sort(function (x, y) {
    return gem(y, "punten") - gem(x, "punten") || gem(y, "saldo") - gem(x, "saldo") || gem(y, "voor") - gem(x, "voor");
  }).slice(0, b.aantal);
}

/** @param {any} t @param {string} stadiumId @returns {string[]} */
function doorgaanders(t, stadiumId) {
  var s = stadiumVan(t, stadiumId);
  /** @type {any[]} */
  var uit = [];
  for (var plek = 1; plek <= (s.doorgaan.perPoule || 0); plek++) {
    s.poules.forEach(function (/** @type {any} */ p) {
      var r = pouleStand(t, stadiumId, p.id)[plek - 1];
      if (r) uit.push(r.teamId);
    });
  }
  return uit.concat(besteNummers(t, stadiumId).map(function (r) { return r.teamId; }));
}

/* Plaatsingsvolgorde in een bracket van 2^k: 1 tegen de laatste, de
   twee besten pas in de finale. */
/** @param {number} grootte @returns {number[]} */
function plaatsingsVolgorde(grootte) {
  var v = [1, 2];
  while (v.length < grootte) {
    var m = v.length * 2 + 1;
    /** @type {number[]} */
    var n = [];
    v.forEach(function (s) { n.push(s, m - s); });
    v = n;
  }
  return v;
}
/** @param {number} m aantal teams in deze ronde @returns {string} */
function rondeNaamVoor(m) {
  return m === 2 ? "Finale" : m === 4 ? "Halve finale" : m === 8 ? "Kwartfinale" : m === 16 ? "Achtste finale" : "Ronde van " + m;
}

/* Een knock-out. bronnen staan in plaatsingsvolgorde (de beste eerst).
   Het bracket is de eerstvolgende macht van 2; de overgebleven plekken
   zijn vrijstellingen voor de hoogst geplaatsten. Een vrijstelling levert
   geen wedstrijd op: de vervolgwedstrijd verwijst dan rechtstreeks naar
   dat team. */
/**
 * @param {any} t
 * @param {string} catId
 * @param {Bron[]} bronnen
 * @param {{troostfinale?:boolean}} o
 * @returns {any}
 */
function maakKnockout(t, catId, bronnen, o) {
  categorieVan(t, catId);
  if (bronnen.length < 2) throw new Error("Een knock-out heeft minstens twee deelnemers nodig.");
  var grootte = 2;
  while (grootte < bronnen.length) grootte *= 2;
  var stadium = { id: tId("s"), categorieId: catId, soort: "knockout", naam: "Knock-out",
    bracket: { grootte: grootte, troostfinale: !!(o && o.troostfinale), vrijstellingen: /** @type {Bron[]} */ ([]) } };
  /** @type {(Bron|null)[]} */
  var plekken = plaatsingsVolgorde(grootte).map(function (s) { return s <= bronnen.length ? bronnen[s - 1] : null; });
  var nummer = volgendNummer(t), halve = /** @type {string[]} */ ([]);
  /** @type {any[]} */
  var ws = [];
  var m = grootte;
  while (plekken.length > 1) {
    var naam = rondeNaamVoor(m);
    /** @type {(Bron|null)[]} */
    var volgende = [];
    if (m === 2 && stadium.bracket.troostfinale && halve.length === 2) {
      var tf = leegWedstrijd(catId, stadium.id);
      tf.nummer = nummer++; tf.rondeNaam = "Troostfinale";
      tf.thuis = { verliezerVan: halve[0] }; tf.uit = { verliezerVan: halve[1] };
      ws.push(tf);
    }
    for (var i = 0; i < plekken.length; i += 2) {
      var a = plekken[i], b = plekken[i + 1];
      if (!a && !b) { volgende.push(null); continue; }
      if (!a || !b) {
        var vrij = /** @type {Bron} */ (a || b);
        if (m === grootte) stadium.bracket.vrijstellingen.push(vrij);
        volgende.push(vrij); continue;
      }
      var w = leegWedstrijd(catId, stadium.id);
      w.nummer = nummer++; w.rondeNaam = naam; w.thuis = a; w.uit = b;
      ws.push(w);
      if (m === 4) halve.push(w.id);
      volgende.push({ winnaarVan: w.id });
    }
    plekken = volgende; m = m / 2;
  }
  return Object.assign({}, t, { stadia: t.stadia.concat([stadium]), wedstrijden: t.wedstrijden.concat(ws) });
}

/* Knock-out na een groepsfase. Volgorde van de doorgaanders: alle
   nummers 1 (A, B, …), dan alle nummers 2, dan de beste nummers X. Bij
   twee poules met twee doorgaanders geeft dat 1A–2B en 1B–2A. */
/** @param {any} t @param {string} catId @param {string} gfId @param {{troostfinale?:boolean}} o @returns {any} */
function maakKnockoutNaGroepsfase(t, catId, gfId, o) {
  var s = stadiumVan(t, gfId);
  /** @type {Bron[]} */
  /** @type {any[]} */
  var bronnen = [];
  for (var plek = 1; plek <= (s.doorgaan.perPoule || 0); plek++) {
    s.poules.forEach(function (/** @type {any} */ p) { bronnen.push({ poulePlek: { stadiumId: gfId, pouleId: p.id, plek: plek } }); });
  }
  var b = s.doorgaan.besteNummers;
  if (b) for (var r = 1; r <= b.aantal; r++) bronnen.push({ besteNummer: { stadiumId: gfId, plek: b.plek, rang: r } });
  return maakKnockout(zonderStadia(t, catId, "knockout"), catId, bronnen, o);
}

/** @param {any} t @param {string} id */
function wedstrijdVan(t, id) {
  var w = t.wedstrijden.filter(function (/** @type {any} */ x) { return x.id === id; })[0];
  if (!w) throw new Error("Onbekende wedstrijd");
  return w;
}

/* Wie staat er nu op een plek in de groepsfase (voor "Start knock-out"
   en het controleren van de plaatsing achteraf). */
/** @param {any} t @param {Bron} bron @returns {string|null} */
function huidigePlaatsing(t, bron) {
  if (bron.poulePlek) {
    var r = pouleStand(t, bron.poulePlek.stadiumId, bron.poulePlek.pouleId)[bron.poulePlek.plek - 1];
    return r ? r.teamId : null;
  }
  if (bron.besteNummer) {
    var b = besteNummers(t, bron.besteNummer.stadiumId)[bron.besteNummer.rang - 1];
    return b ? b.teamId : null;
  }
  return null;
}

/** @param {any} t @param {any} wOfId @returns {string|null} */
function winnaarVan(t, wOfId) {
  var w = wedstrijdVan(t, typeof wOfId === "string" ? wOfId : wOfId.id);
  if (w.status !== "gespeeld" || !w.uitslag) return null;
  var d = deelnemersVan(t, w);
  if (!d.thuis || !d.uit) return null;
  var a = w.uitslag.thuis, b = w.uitslag.uit;
  if (a === b && w.strafschoppen) { a = w.strafschoppen.thuis; b = w.strafschoppen.uit; }
  return a > b ? d.thuis : a < b ? d.uit : null;
}
/** @param {any} t @param {any} wOfId @returns {string|null} */
function verliezerVan(t, wOfId) {
  var w = wedstrijdVan(t, typeof wOfId === "string" ? wOfId : wOfId.id);
  var win = winnaarVan(t, w);
  if (!win) return null;
  var d = deelnemersVan(t, w);
  return win === d.thuis ? d.uit : d.thuis;
}
/** @param {any} t @param {Bron} bron @returns {string|null} */
function bronDeelnemer(t, bron) {
  if (!bron) return null;
  if (bron.deelnemerId) return bron.deelnemerId;
  if (bron.winnaarVan) return winnaarVan(t, bron.winnaarVan);
  if (bron.verliezerVan) return verliezerVan(t, bron.verliezerVan);
  return null;  // poulePlek / besteNummer: pas na "Start knock-out" (thuisVast/uitVast)
}
/** @param {any} t @param {any} w @returns {{thuis:(string|null), uit:(string|null)}} */
function deelnemersVan(t, w) {
  /* Altijd de huidige versie uit het toernooi: een scherm of test kan
     een oudere kopie van de wedstrijd in handen hebben. */
  w = t.wedstrijden.filter(function (/** @type {any} */ x) { return x.id === (typeof w === "string" ? w : w.id); })[0] || w;
  return { thuis: w.thuisVast || bronDeelnemer(t, w.thuis), uit: w.uitVast || bronDeelnemer(t, w.uit) };
}

/** @param {any} t @param {Bron} bron @returns {string} */
function bronTekst(t, bron) {
  /** @param {string} id */
  function naam(id) { var d = t.deelnemers.filter(function (/** @type {any} */ x) { return x.id === id; })[0]; return d ? d.naam : "?"; }
  if (bron.deelnemerId) return naam(bron.deelnemerId);
  if (bron.poulePlek) {
    var s = stadiumVan(t, bron.poulePlek.stadiumId);
    var pp = bron.poulePlek;
    var p = s.poules.filter(function (/** @type {any} */ x) { return x.id === pp.pouleId; })[0];
    return bron.poulePlek.plek + "e " + (p ? p.naam : "poule");
  }
  if (bron.besteNummer) return "Beste nummer " + bron.besteNummer.plek + (bron.besteNummer.rang > 1 ? " (" + bron.besteNummer.rang + ")" : "");
  if (bron.winnaarVan) return "Winnaar wedstrijd " + wedstrijdVan(t, bron.winnaarVan).nummer;
  if (bron.verliezerVan) return "Verliezer wedstrijd " + wedstrijdVan(t, bron.verliezerVan).nummer;
  return "?";
}

/* "Start knock-out": de plekken uit de groepsfase worden vastgezet. Kan
   pas als de groepsfase(s) waar de knock-out naar verwijst compleet zijn. */
/** @param {any} t @param {string} koId @returns {any} */
function startKnockout(t, koId) {
  stadiumVan(t, koId);
  /** @type {Object<string, boolean>} */
  var bronStadia = {};
  t.wedstrijden.forEach(function (/** @type {any} */ w) {
    if (w.stadiumId !== koId) return;
    [w.thuis, w.uit].forEach(function (b) {
      if (b.poulePlek) bronStadia[b.poulePlek.stadiumId] = true;
      if (b.besteNummer) bronStadia[b.besteNummer.stadiumId] = true;
    });
  });
  Object.keys(bronStadia).forEach(function (id) {
    if (!groepsfaseCompleet(t, id)) throw new Error("De groepsfase is nog niet compleet: vul eerst alle uitslagen in.");
  });
  return Object.assign({}, t, { wedstrijden: t.wedstrijden.map(function (/** @type {any} */ w) {
    if (w.stadiumId !== koId) return w;
    var n = Object.assign({}, w);
    if (w.thuis.poulePlek || w.thuis.besteNummer) n.thuisVast = huidigePlaatsing(t, w.thuis);
    if (w.uit.poulePlek || w.uit.besteNummer) n.uitVast = huidigePlaatsing(t, w.uit);
    return n;
  }) });
}

/* Klopt een vastgezette plaatsing nog met de stand? Zo niet, dan een
   melding — nooit een stille wijziging. gespeeld: true betekent dat de
   vervolgwedstrijd al gespeeld is; die wordt ook bij bijwerken nooit
   veranderd. */
/** @param {any} t @returns {{wedstrijdId:string, kant:string, was:(string|null), nu:(string|null), gespeeld:boolean}[]} */
function plaatsingAfwijkingen(t) {
  /** @type {any[]} */
  var uit = [];
  t.wedstrijden.forEach(function (/** @type {any} */ w) {
    [["thuis", "thuisVast"], ["uit", "uitVast"]].forEach(function (k) {
      var bron = w[k[0]], vast = w[k[1]];
      if (!vast || !(bron.poulePlek || bron.besteNummer)) return;
      var nu = huidigePlaatsing(t, bron);
      if (nu !== vast) uit.push({ wedstrijdId: w.id, kant: k[0], was: vast, nu: nu, gespeeld: w.status === "gespeeld" });
    });
  });
  return uit;
}
/** @param {any} t @param {string} wId @returns {any} */
function bijwerkPlaatsing(t, wId) {
  var w = wedstrijdVan(t, wId);
  if (w.status === "gespeeld") return t;
  var n = Object.assign({}, w);
  if (w.thuisVast && (w.thuis.poulePlek || w.thuis.besteNummer)) n.thuisVast = huidigePlaatsing(t, w.thuis);
  if (w.uitVast && (w.uit.poulePlek || w.uit.besteNummer)) n.uitVast = huidigePlaatsing(t, w.uit);
  return Object.assign({}, t, { wedstrijden: t.wedstrijden.map(function (/** @type {any} */ x) { return x.id === wId ? n : x; }) });
}

/* Een uitslag invoeren of leegmaken (uitslag null). In de knock-out moet
   een gelijke stand beslist worden met strafschoppen; strafschoppen bij
   een winnaar, of in een poule, kloppen niet. */
/**
 * @param {any} t
 * @param {string} wId
 * @param {{thuis:number, uit:number}|null} uitslag
 * @param {{thuis:number, uit:number}|null} straf
 * @returns {any}
 */
function zetUitslag(t, wId, uitslag, straf) {
  var w = wedstrijdVan(t, wId);
  /** @param {any} u */
  function geldig(u) { return u && [u.thuis, u.uit].every(function (n) { return typeof n === "number" && isFinite(n) && n >= 0 && Math.floor(n) === n; }); }
  /** @type {any} */
  var n;
  if (!uitslag) {
    n = Object.assign({}, w, { status: "gepland", uitslag: null, strafschoppen: null });
  } else {
    if (!geldig(uitslag)) throw new Error("Een score is een heel getal vanaf 0.");
    var ko = stadiumVan(t, w.stadiumId).soort === "knockout";
    var d = deelnemersVan(t, w);
    if (ko && (!d.thuis || !d.uit)) throw new Error("Het is nog niet bekend wie deze wedstrijd speelt.");
    if (straf && !geldig(straf)) throw new Error("Een score is een heel getal vanaf 0.");
    if (straf && (!ko || uitslag.thuis !== uitslag.uit)) throw new Error("Strafschoppen horen alleen bij een gelijke knock-outwedstrijd.");
    if (ko && uitslag.thuis === uitslag.uit) {
      var cat = categorieVan(t, w.categorieId);
      if (cat.knockoutGelijk !== "loting" && (!straf || straf.thuis === straf.uit)) {
        throw new Error("Gelijk in de knock-out: vul de strafschoppen in (met een winnaar).");
      }
    }
    n = Object.assign({}, w, { status: "gespeeld", uitslag: { thuis: uitslag.thuis, uit: uitslag.uit },
                               strafschoppen: straf ? { thuis: straf.thuis, uit: straf.uit } : null });
  }
  return Object.assign({}, t, { wedstrijden: t.wedstrijden.map(function (/** @type {any} */ x) { return x.id === wId ? n : x; }) });
}

/* Welke deelnemers kregen een vrijstelling in de eerste ronde? */
/** @param {any} t @param {string} catId @returns {string[]} */
function vrijgesteld(t, catId) {
  /** @type {any[]} */
  var uit = [];
  t.stadia.forEach(function (/** @type {any} */ s) {
    if (s.categorieId !== catId || s.soort !== "knockout") return;
    (s.bracket.vrijstellingen || []).forEach(function (/** @type {Bron} */ b) { if (b.deelnemerId) uit.push(b.deelnemerId); });
  });
  return uit;
}

/* ── Het schema ──────────────────────────────────────────────── */

/** @param {any} t @param {string} wId @param {{dagId:string, veldId:string, start:string}|null} plek @returns {any} */
function planWedstrijd(t, wId, plek) {
  var w = wedstrijdVan(t, wId);
  /** @type {any} */
  var n;
  if (!plek) n = Object.assign({}, w, { dagId: null, veldId: null, start: null });
  else {
    if (!t.dagen.some(function (/** @type {any} */ d) { return d.id === plek.dagId; })) throw new Error("Onbekende dag");
    if (!t.locaties.some(function (/** @type {any} */ l) { return l.velden.some(function (/** @type {any} */ v) { return v.id === plek.veldId; }); })) throw new Error("Onbekend veld");
    if (!/^\d{1,2}:\d{2}$/.test(String(plek.start))) throw new Error("Vul een tijd in als 09:30.");
    n = Object.assign({}, w, { dagId: plek.dagId, veldId: plek.veldId, start: plek.start });
  }
  return Object.assign({}, t, { wedstrijden: t.wedstrijden.map(function (/** @type {any} */ x) { return x.id === wId ? n : x; }) });
}

/* Alle conflicten in het schema. Niets wordt tegengehouden — de
   organisator beslist — maar alles wordt getoond:
     veld   — twee wedstrijden tegelijk op hetzelfde veld (incl. wisseltijd)
     team   — een team speelt twee wedstrijden tegelijk
     rust   — te weinig rust tussen twee wedstrijden van een team
     tijd   — buiten de begin- en eindtijd van de dag
     volgorde — een vervolgwedstrijd begint voordat zijn bron klaar is */
/** @param {any} t @returns {{soort:string, wedstrijden:string[], tekst:string}[]} */
function conflicten(t) {
  /** @type {any[]} */
  var gepland = t.wedstrijden.filter(function (/** @type {any} */ w) { return w.dagId && w.veldId && w.start; })
    .map(function (/** @type {any} */ w) {
      var cat = categorieVan(t, w.categorieId);
      var b = minVan(w.start);
      var d = deelnemersVan(t, w);
      return { w: w, b: b, e: b + (cat.wedstrijdduur || 0), bezet: b + (cat.wedstrijdduur || 0) + (cat.wisseltijd || 0),
               rust: cat.minRust || 0, teams: [d.thuis, d.uit].filter(Boolean) };
    });
  /** @type {any[]} */
  var uit = [];
  var dagIndex = {};
  t.dagen.forEach(function (/** @type {any} */ d, /** @type {number} */ i) { /** @type {any} */ (dagIndex)[d.id] = i; });
  gepland.forEach(function (/** @type {any} */ x) {
    var dag = t.dagen.filter(function (/** @type {any} */ d) { return d.id === x.w.dagId; })[0];
    if (dag && (x.b < minVan(dag.start) || x.e > minVan(dag.eind))) {
      uit.push({ soort: "tijd", wedstrijden: [x.w.id], tekst: "Wedstrijd " + x.w.nummer + " valt buiten " + dag.start + "–" + dag.eind + "." });
    }
  });
  for (var i = 0; i < gepland.length; i++) for (var j = i + 1; j < gepland.length; j++) {
    var a = gepland[i], b = gepland[j];
    if (a.w.dagId !== b.w.dagId) continue;
    if (a.w.veldId === b.w.veldId && a.b < b.bezet && b.b < a.bezet) {
      uit.push({ soort: "veld", wedstrijden: [a.w.id, b.w.id], tekst: "Wedstrijd " + a.w.nummer + " en " + b.w.nummer + " staan tegelijk op hetzelfde veld." });
    }
    var samen = a.teams.filter(function (/** @type {string} */ id) { return b.teams.indexOf(id) >= 0; });
    if (!samen.length) continue;
    if (a.b < b.e && b.b < a.e) {
      uit.push({ soort: "team", wedstrijden: [a.w.id, b.w.id], tekst: "Een team speelt wedstrijd " + a.w.nummer + " en " + b.w.nummer + " tegelijk." });
    } else {
      var eerst = a.b <= b.b ? a : b, later = eerst === a ? b : a;
      var rust = later.b - eerst.e;
      if (rust < Math.max(eerst.rust, later.rust)) {
        uit.push({ soort: "rust", wedstrijden: [eerst.w.id, later.w.id],
                   tekst: "Te weinig rust tussen wedstrijd " + eerst.w.nummer + " en " + later.w.nummer + " (" + rust + " min)." });
      }
    }
  }
  gepland.forEach(function (/** @type {any} */ x) {
    [x.w.thuis, x.w.uit].forEach(function (bron) {
      var bronId = bron.winnaarVan || bron.verliezerVan;
      if (!bronId) return;
      var y = gepland.filter(function (/** @type {any} */ g) { return g.w.id === bronId; })[0];
      if (!y) return;
      var dx = /** @type {any} */ (dagIndex)[x.w.dagId], dy = /** @type {any} */ (dagIndex)[y.w.dagId];
      if (dx < dy || (dx === dy && x.b < y.e + x.rust)) {
        uit.push({ soort: "volgorde", wedstrijden: [y.w.id, x.w.id], tekst: "Wedstrijd " + x.w.nummer + " begint voordat wedstrijd " + y.w.nummer + " klaar is." });
      }
    });
  });
  return uit;
}

/* ── Oude toernooien (v1, één poule) omzetten ──────────────────── */
/** @param {any} oud @returns {any} */
function migreerToernooiV1(oud) {
  var t = maakToernooi({ id: String(oud.id), naam: oud.naam || "Toernooi", datum: oud.datum || "" });
  var dag = t.dagen[0], loc = t.locaties[0], cat = t.categorieen[0];
  dag.start = oud.starttijd || "09:00"; dag.eind = "18:00";
  loc.naam = oud.locatie || "Locatie";
  loc.velden = [];
  for (var v = 1; v <= Math.max(1, Number(oud.aantalVelden) || 1); v++) loc.velden.push({ id: loc.id + "-v" + v, naam: "Veld " + v });
  cat.naam = "Toernooi"; cat.wedstrijdduur = Number(oud.speelduur) || 15; cat.wisseltijd = Number(oud.pauze) || 0;
  t.deelnemers = (oud.teams || []).map(function (/** @type {any} */ x) {
    return { id: String(x.id), categorieId: cat.id, soort: "team", naam: x.naam, logo: "", spelers: [], coach: "", email: "", telefoon: "", sterkte: null, eigen: !!x.eigen };
  });
  if ((oud.wedstrijden || []).length) {
    var st = { id: t.id + "-gf", categorieId: cat.id, soort: "poule", naam: "Groepsfase",
               poules: [{ id: t.id + "-p1", naam: "Poule A", deelnemers: t.deelnemers.map(function (/** @type {any} */ d) { return d.id; }) }],
               doorgaan: { perPoule: 0, besteNummers: null } };
    t.stadia = [st];
    t.wedstrijden = oud.wedstrijden.map(function (/** @type {any} */ w, /** @type {number} */ i) {
      var n = leegWedstrijd(cat.id, st.id);
      n.id = String(w.id); n.nummer = i + 1; n.pouleId = st.poules[0].id; n.rondeNaam = "Groepsfase";
      n.thuis = { deelnemerId: String(w.thuisId) }; n.uit = { deelnemerId: String(w.uitId) };
      if (w.tijd) { n.dagId = dag.id; n.veldId = loc.id + "-v" + (Number(w.veld) || 1); n.start = w.tijd; }
      if (w.gespeeld) { n.status = "gespeeld"; n.uitslag = { thuis: Number(w.score && w.score.thuis) || 0, uit: Number(w.score && w.score.uit) || 0 }; }
      return n;
    });
  }
  return t;
}

/* ── Downloads ─────────────────────────────────────────────────
   Het schema als regels, gesorteerd op dag, tijd en veld (ongeplande
   wedstrijden achteraan). Alleen namen: contactgegevens van teams en
   scheidsrechters komen NOOIT in een download (hoofdstuk 4e). */
/** @param {any} t @returns {{nummer:number, dag:string, tijd:string, veld:string, locatie:string, categorie:string, ronde:string, thuis:string, uit:string, scheids:string, uitslag:string}[]} */
function schemaRegels(t) {
  /** @type {Object<string, any>} */ var veldInfo = {};
  t.locaties.forEach(function (/** @type {any} */ l) { l.velden.forEach(function (/** @type {any} */ v) { veldInfo[v.id] = { veld: v.naam, locatie: l.naam }; }); });
  /** @type {Object<string, any>} */ var dagInfo = {};
  t.dagen.forEach(function (/** @type {any} */ d, /** @type {number} */ i) { dagInfo[d.id] = { datum: d.datum, i: i }; });
  return t.wedstrijden.slice().sort(function (/** @type {any} */ a, /** @type {any} */ b) {
    var da = a.dagId ? dagInfo[a.dagId].i : 99, db = b.dagId ? dagInfo[b.dagId].i : 99;
    return da - db || minVan(a.start || "99:99") - minVan(b.start || "99:99") ||
           String(a.veldId || "").localeCompare(String(b.veldId || "")) || a.nummer - b.nummer;
  }).map(function (/** @type {any} */ w) {
    var cat = categorieVan(t, w.categorieId);
    var d = deelnemersVan(t, w);
    /** @param {string|null} id @param {Bron} bron */
    function naam(id, bron) { var x = id && t.deelnemers.filter(function (/** @type {any} */ y) { return y.id === id; })[0]; return x ? x.naam : bronTekst(t, bron); }
    var s = w.scheidsId && t.scheidsrechters.filter(function (/** @type {any} */ y) { return y.id === w.scheidsId; })[0];
    return { nummer: w.nummer, dag: w.dagId ? dagInfo[w.dagId].datum : "", tijd: w.start || "",
             veld: w.veldId && veldInfo[w.veldId] ? veldInfo[w.veldId].veld : "",
             locatie: w.veldId && veldInfo[w.veldId] ? veldInfo[w.veldId].locatie : "",
             categorie: cat.naam, ronde: w.rondeNaam, thuis: naam(d.thuis, w.thuis), uit: naam(d.uit, w.uit),
             scheids: s ? s.naam : "",
             uitslag: w.uitslag ? w.uitslag.thuis + "-" + w.uitslag.uit + (w.strafschoppen ? " (" + w.strafschoppen.thuis + "-" + w.strafschoppen.uit + " n.s.)" : "") : "" };
  });
}
/* CSV met puntkomma's (wat Excel in Nederland verwacht), velden met
   een puntkomma of aanhalingsteken tussen aanhalingstekens. */
/** @param {any} t @returns {string} */
function schemaCsv(t) {
  /** @type {any[]} */
  var kop = ["Nr", "Dag", "Tijd", "Locatie", "Veld", "Categorie", "Ronde", "Thuis", "Uit", "Scheidsrechter", "Uitslag"];
  /** @param {any} v */
  function cel(v) { var s = String(v == null ? "" : v); return /[;"\n]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s; }
  return /** @type {any[][]} */ ([kop]).concat(schemaRegels(t).map(function (r) {
    return [r.nummer, r.dag, r.tijd, r.locatie, r.veld, r.categorie, r.ronde, r.thuis, r.uit, r.scheids, r.uitslag];
  })).map(function (rij) { return rij.map(cel).join(";"); }).join("\n");
}
