// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: competitie — fases, schema, stand, onderling resultaat
   ─────────────────────────────────────────────────────────────
   Release 1, stap 2 van docs/updateplan-competitie-toernooi-ai.md.
   Geschreven tegen tests/competitie.test.js, die er eerder was.

   WAAROM DIT BESTAAT
   De oude stand (Statistieken › Stand) rekende alleen de eigen rij uit;
   alle andere teams waren met de hand getypte totalen. Een uitslag
   tussen twee andere teams bestond dus niet, en omdat er geen fases
   waren, telde de eigen rij alle wedstrijden van het seizoen. Hier
   wordt de stand per fase berekend uit uitslagen, voor álle teams.

   DRIE REGELS DIE OVERAL GELDEN
   1. Een wedstrijd hoort bij een fase door WAAR hij staat, niet door
      zijn datum. Een uitgestelde wedstrijd uit Fase 1 die in de periode
      van Fase 2 wordt gespeeld, telt in Fase 1.
   2. Geen uitslag is geen 0–0. Alleen status "gespeeld" met een
      uitslag telt. Er worden nooit resultaten verzonnen.
   3. Een eigen wedstrijd bestaat één keer: als Wedstrijd (met
      opstelling en doelpunten). De competitiewedstrijd verwijst ernaar
      met wedstrijdId en leest daar de uitslag uit. Zo kunnen stand en
      spelerstatistieken nooit uit twee registraties ontstaan.

   Alle functies zijn puur: ze veranderen hun invoer niet en geven een
   nieuw object terug. Geen import/export: tools/bouw.js plakt dit
   bestand in dezelfde scope als de rest (zie DOMEIN_VOLGORDE). Gebruikt
   maakPouleSchema uit src/domein/wedstrijden.js.
   ══════════════════════════════════════════════════════════════ */

/** @typedef {{thuis:number, uit:number}} Uitslag */
/** @typedef {{id:string, naam:string, eigen:boolean, aliassen?:string[], logo?:string}} CompTeam */
/** @typedef {{id:string, rondeId?:string, thuisId:string, uitId:string, datum?:string, tijd?:string,
 *   locatie?:string, status:string, uitslag:(Uitslag|null), notitie?:string, wedstrijdId?:any}} CompWedstrijd */
/** @typedef {{winst:number, gelijk:number, verlies:number, volgorde:string[]}} PuntRegels */
/** @typedef {{id:string, naam:string, van?:string, tot?:string, status:string, vorm:string,
 *   regels:PuntRegels, deelnemers:string[], rondes:any[], wedstrijden:CompWedstrijd[]}} Fase */
/** @typedef {{id:string, naam:string, actieveFaseId:string, teams:CompTeam[], fases:Fase[], logboek:any[]}} Competitie */

const STANDAARD_REGELS = { winst: 3, gelijk: 1, verlies: 0, volgorde: ["punten", "saldo", "voor", "onderling"] };

/* ── Teamnamen ────────────────────────────────────────────────
   Om dubbele teams te voorkomen als dezelfde club op twee manieren is
   geschreven ("V.V. Bolsward JO19-1" en "vv bolsward jo19-1"). Het
   teamnummer blijft staan: JO19-1 en JO19-2 zijn echt andere teams. */
/**
 * @param {string} naam
 * @returns {string}
 */
function normaliseerTeamNaam(naam) {
  return String(naam || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9-]+/g, " ")
    .replace(/\s+/g, " ").trim();
}

/* ── Schema ───────────────────────────────────────────────────
   Halve competitie: de bestaande cirkelmethode (maakPouleSchema),
   die bij een oneven aantal per ronde één team vrij laat. Hele
   competitie: dezelfde rondes nog een keer, met thuis en uit om. */
/**
 * @param {string[]} teamIds
 * @param {"half"|"heel"} vorm
 * @returns {{rondes: {nummer:number, paren:[string,string][], vrijTeamId:(string|null)}[]}}
 */
function genereerSchema(teamIds, vorm) {
  var ids = (teamIds || []).slice();
  var basis = maakPouleSchema(ids);
  /** @param {[string,string][]} paren @returns {string|null} */
  function vrijIn(paren) {
    if (ids.length % 2 === 0) return null;
    /** @type {Object<string, boolean>} */
    var spelen = {};
    paren.forEach(function (p) { spelen[p[0]] = true; spelen[p[1]] = true; });
    var vrij = ids.filter(function (id) { return !spelen[id]; });
    return vrij.length === 1 ? vrij[0] : null;
  }
  var rondes = basis.map(function (paren, i) {
    return { nummer: i + 1, paren: paren, vrijTeamId: vrijIn(paren) };
  });
  if (vorm === "heel") {
    var terug = basis.map(function (paren, i) {
      /** @type {[string,string][]} */
      var om = paren.map(function (p) { return /** @type {[string,string]} */ ([p[1], p[0]]); });
      return { nummer: basis.length + i + 1, paren: om, vrijTeamId: vrijIn(om) };
    });
    rondes = rondes.concat(terug);
  }
  return { rondes: rondes };
}

/* ── De uitslag van één competitiewedstrijd ───────────────────
   Een eigen wedstrijd (met wedstrijdId) heeft hier geen eigen uitslag:
   die staat in de Wedstrijd. In die Wedstrijd is score.fch altijd het
   eigen team; "thuis" zegt of het eigen team thuis speelde. */
/**
 * @param {CompWedstrijd} w
 * @param {any[]} eigenWedstrijden
 * @returns {Uitslag|null}
 */
function uitslagVan(w, eigenWedstrijden) {
  if (w.wedstrijdId !== undefined && w.wedstrijdId !== null) {
    var e = (eigenWedstrijden || []).filter(function (x) { return x.id === w.wedstrijdId; })[0];
    if (!e || e.status !== "gespeeld" || !e.score) return null;
    var fch = Number(e.score.fch), teg = Number(e.score.teg);
    if (!isFinite(fch) || !isFinite(teg)) return null;
    return e.thuis ? { thuis: fch, uit: teg } : { thuis: teg, uit: fch };
  }
  if (w.status !== "gespeeld" || !w.uitslag) return null;
  return { thuis: Number(w.uitslag.thuis), uit: Number(w.uitslag.uit) };
}

/** @param {Competitie} c @param {string} faseId @returns {Fase} */
function zoekFase(c, faseId) {
  var f = (c.fases || []).filter(function (x) { return x.id === faseId; })[0];
  if (!f) throw new Error("Onbekende fase: " + faseId);
  return f;
}

/* ── Tellen ───────────────────────────────────────────────────
   Telt G/W/GL/V/voor/tegen voor een groep teams over een lijst
   wedstrijden. Wordt twee keer gebruikt: voor de hele fase, en voor de
   minicompetitie bij onderling resultaat (alleen de duels binnen de
   groep). */
/**
 * @param {string[]} ids
 * @param {{thuisId:string, uitId:string, u:Uitslag}[]} gespeeld
 * @param {PuntRegels} regels
 */
function telRijen(ids, gespeeld, regels) {
  /** @type {Object<string, any>} */
  var rij = {};
  ids.forEach(function (id) {
    rij[id] = { gespeeld: 0, winst: 0, gelijk: 0, verlies: 0, voor: 0, tegen: 0, saldo: 0, punten: 0 };
  });
  gespeeld.forEach(function (g) {
    var t = rij[g.thuisId], u = rij[g.uitId];
    if (!t || !u) return;
    t.gespeeld++; u.gespeeld++;
    t.voor += g.u.thuis; t.tegen += g.u.uit;
    u.voor += g.u.uit; u.tegen += g.u.thuis;
    if (g.u.thuis > g.u.uit) { t.winst++; u.verlies++; }
    else if (g.u.thuis < g.u.uit) { u.winst++; t.verlies++; }
    else { t.gelijk++; u.gelijk++; }
  });
  ids.forEach(function (id) {
    var r = rij[id];
    r.saldo = r.voor - r.tegen;
    r.punten = r.winst * regels.winst + r.gelijk * regels.gelijk + r.verlies * regels.verlies;
  });
  return rij;
}

/* ── Rangschikken ─────────────────────────────────────────────
   Geeft een lijst GROEPEN terug: teams in één groep staan op alle
   criteria gelijk (gedeelde plek). Onderling resultaat (hoofdstuk 5a
   van het plan):
     1. minicompetitie van alleen de duels binnen de gelijke groep;
     2. daarin op punten, dan doelsaldo, dan doelpunten voor;
     3. valt de groep uiteen maar blijft een deelgroep gelijk, dan
        opnieuw — alleen tussen die deelgroep;
     4. verandert er niets meer, dan door met het volgende criterium. */
/**
 * @param {string[]} ids
 * @param {string[]} criteria
 * @param {Object<string, any>} totaal
 * @param {{thuisId:string, uitId:string, u:Uitslag}[]} gespeeld
 * @param {PuntRegels} regels
 * @returns {string[][]}
 */
function rangschik(ids, criteria, totaal, gespeeld, regels) {
  if (ids.length <= 1 || criteria.length === 0) return [ids];
  var c = criteria[0], rest = criteria.slice(1);
  if (c === "onderling") {
    var gesplitst = onderling(ids, gespeeld, regels);
    if (gesplitst.length === 1) return rangschik(ids, rest, totaal, gespeeld, regels);
    /** @type {string[][]} */
    var uit = [];
    gesplitst.forEach(function (groep) {
      rangschik(groep, criteria, totaal, gespeeld, regels).forEach(function (g) { uit.push(g); });
    });
    return uit;
  }
  return verdeel(ids, function (/** @type {string} */ id) { return [totaal[id][c]]; }).reduce(function (/** @type {string[][]} */ acc, groep) {
    return acc.concat(rangschik(groep, rest, totaal, gespeeld, regels));
  }, []);
}
/**
 * @param {string[]} ids
 * @param {{thuisId:string, uitId:string, u:Uitslag}[]} gespeeld
 * @param {PuntRegels} regels
 * @returns {string[][]}
 */
function onderling(ids, gespeeld, regels) {
  var binnen = gespeeld.filter(function (g) { return ids.indexOf(g.thuisId) >= 0 && ids.indexOf(g.uitId) >= 0; });
  var mini = telRijen(ids, binnen, regels);
  return verdeel(ids, function (/** @type {string} */ id) { return [mini[id].punten, mini[id].saldo, mini[id].voor]; });
}
/* Groepeert op een rij getallen, hoogste eerst; gelijke rijen samen. */
/**
 * @param {string[]} ids
 * @param {(id: string) => number[]} sleutel
 * @returns {string[][]}
 */
function verdeel(ids, sleutel) {
  var gesorteerd = ids.slice().sort(function (a, b) {
    var x = sleutel(a), y = sleutel(b);
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i];
    return 0;
  });
  /** @type {string[][]} */
  var groepen = [];
  gesorteerd.forEach(function (id) {
    var laatste = groepen[groepen.length - 1];
    if (laatste && sleutel(laatste[0]).join("|") === sleutel(id).join("|")) laatste.push(id);
    else groepen.push([id]);
  });
  return groepen;
}

/* ── De stand van één fase ────────────────────────────────────
   Alleen wedstrijden van DEZE fase met een definitieve uitslag. Er is
   geen opgeslagen stand: elke correctie geeft vanzelf de juiste stand. */
/**
 * @param {Competitie} c
 * @param {string} faseId
 * @param {any[]} eigenWedstrijden   de Wedstrijd-records van het eigen team
 * @returns {any[]}
 */
function standVanFase(c, faseId, eigenWedstrijden) {
  var f = zoekFase(c, faseId);
  var regels = f.regels || STANDAARD_REGELS;
  var ids = (f.deelnemers || []).slice();
  /** @type {{thuisId:string, uitId:string, u:Uitslag}[]} */
  var gespeeld = [];
  (f.wedstrijden || []).forEach(function (w) {
    var u = uitslagVan(w, eigenWedstrijden);
    if (u) gespeeld.push({ thuisId: w.thuisId, uitId: w.uitId, u: u });
  });
  var totaal = telRijen(ids, gespeeld, regels);
  /** @type {Object<string, CompTeam>} */
  var teams = {};
  (c.teams || []).forEach(function (t) { teams[t.id] = t; });
  /** @param {string} id */
  function naamVan(id) { return teams[id] ? teams[id].naam : id; }

  var groepen = rangschik(ids, regels.volgorde || STANDAARD_REGELS.volgorde, totaal, gespeeld, regels);
  /** @type {any[]} */
  var stand = [];
  var plek = 1;
  groepen.forEach(function (groep) {
    groep.slice().sort(function (a, b) { return naamVan(a).localeCompare(naamVan(b), "nl"); })
      .forEach(function (id) {
        stand.push(Object.assign({ teamId: id, naam: naamVan(id), eigen: !!(teams[id] && teams[id].eigen),
          plek: plek, gedeeld: groep.length > 1 }, totaal[id]));
      });
    plek += groep.length;
  });
  return stand;
}

/* ── Achterstallige uitslagen ─────────────────────────────────
   Een geplande wedstrijd met een datum vóór vandaag en zonder uitslag.
   Uitgesteld of afgelast is geen ontbrekende uitslag. */
/**
 * @param {Competitie} c
 * @param {string} faseId
 * @param {any[]} eigenWedstrijden
 * @param {string} vandaag  "JJJJ-MM-DD"
 * @returns {string[]}
 */
function achterstallig(c, faseId, eigenWedstrijden, vandaag) {
  return zoekFase(c, faseId).wedstrijden.filter(function (w) {
    return w.status === "gepland" && !!w.datum && w.datum < vandaag && !uitslagVan(w, eigenWedstrijden);
  }).map(function (w) { return w.id; });
}

/* ── Nieuwe fase ──────────────────────────────────────────────
   Kopieert op verzoek deelnemers en regels — NOOIT wedstrijden,
   uitslagen of punten. De vorige fase blijft precies zoals hij was. */
/**
 * @param {Competitie} c
 * @param {{id?:string, naam:string, kopieerDeelnemers?:boolean, kopieerRegels?:boolean, vorm?:string}} opties
 * @returns {Competitie}
 */
function nieuweFase(c, opties) {
  var vorige = (c.fases || []).filter(function (x) { return x.id === c.actieveFaseId; })[0] ||
               (c.fases || [])[(c.fases || []).length - 1];
  /** @type {Fase} */
  var nieuw = {
    id: opties.id || ("f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    naam: opties.naam, van: "", tot: "", status: "open",
    vorm: opties.vorm || (vorige ? vorige.vorm : "handmatig"),
    regels: JSON.parse(JSON.stringify(opties.kopieerRegels && vorige ? vorige.regels : STANDAARD_REGELS)),
    deelnemers: opties.kopieerDeelnemers && vorige ? vorige.deelnemers.slice() : [],
    rondes: [], wedstrijden: []
  };
  return Object.assign({}, c, { fases: (c.fases || []).concat([nieuw]), actieveFaseId: nieuw.id });
}

/* ── Validatie van één wedstrijd ──────────────────────────────
   Foutcodes, in vaste volgorde. Bij een halve competitie is elk paar
   één keer toegestaan (ook omgedraaid); bij een hele of handmatige één
   keer per thuis-uit. Een eigen wedstrijd (wedstrijdId) heeft zijn
   uitslag elders en wordt daarop dus niet gecontroleerd. */
/**
 * @param {Fase} fase
 * @param {CompWedstrijd} w
 * @returns {string[]}
 */
function valideerWedstrijd(fase, w) {
  if (w.thuisId === w.uitId) return ["zelf"];
  var fouten = [];
  if (fase.deelnemers.indexOf(w.thuisId) < 0 || fase.deelnemers.indexOf(w.uitId) < 0) fouten.push("geen-deelnemer");
  var dubbel = (fase.wedstrijden || []).some(function (x) {
    if (x.id === w.id) return false;
    if (x.thuisId === w.thuisId && x.uitId === w.uitId) return true;
    return fase.vorm === "half" && x.thuisId === w.uitId && x.uitId === w.thuisId;
  });
  if (dubbel) fouten.push("dubbel");
  var eigen = w.wedstrijdId !== undefined && w.wedstrijdId !== null;
  if (!eigen) {
    if (w.status === "gespeeld" && !w.uitslag) fouten.push("gespeeld-zonder-uitslag");
    if (w.status !== "gespeeld" && w.uitslag) fouten.push("uitslag-zonder-gespeeld");
    if (w.uitslag && [w.uitslag.thuis, w.uitslag.uit].some(function (n) {
      return typeof n !== "number" || !isFinite(n) || n < 0 || Math.floor(n) !== n;
    })) fouten.push("score-ongeldig");
  }
  return fouten;
}

/* ── Bewerkingen ──────────────────────────────────────────────
   Wijzigingen gaan als kleine bewerking, zodat ze bij een botsing in de
   synchronisatie opnieuw kunnen worden toegepast op de nieuwste versie.
   Dezelfde bewerking twee keer toepassen verandert niets en levert geen
   tweede logregel op. Elke echte wijziging komt in het logboek met de
   oude en de nieuwe waarde. */
/**
 * @param {Competitie} c
 * @param {{soort:string, faseId:string, wedstrijdId:string, status:string, uitslag:(Uitslag|null), tijd:string, door:string}} op
 * @returns {Competitie}
 */
function pasBewerkingToe(c, op) {
  if (op.soort !== "uitslag") throw new Error("Onbekende bewerking: " + op.soort);
  var f = zoekFase(c, op.faseId);
  var oud = f.wedstrijden.filter(function (w) { return w.id === op.wedstrijdId; })[0];
  if (!oud) throw new Error("Onbekende wedstrijd: " + op.wedstrijdId);
  var uitslag = op.status === "gespeeld" && op.uitslag ? { thuis: op.uitslag.thuis, uit: op.uitslag.uit } : null;
  var nieuw = Object.assign({}, oud, { status: op.status, uitslag: uitslag });
  var fouten = valideerWedstrijd(f, nieuw);
  if (fouten.length) throw new Error("Ongeldige uitslag: " + fouten.join(", "));
  if (oud.status === nieuw.status && JSON.stringify(oud.uitslag) === JSON.stringify(nieuw.uitslag)) return c;
  var nieuweFaseObj = Object.assign({}, f, {
    wedstrijden: f.wedstrijden.map(function (w) { return w.id === op.wedstrijdId ? nieuw : w; })
  });
  return Object.assign({}, c, {
    fases: c.fases.map(function (x) { return x.id === f.id ? nieuweFaseObj : x; }),
    logboek: (c.logboek || []).concat([{
      tijd: op.tijd, door: op.door, wat: "uitslag", faseId: f.id, wedstrijdId: op.wedstrijdId,
      voor: { status: oud.status, uitslag: oud.uitslag }, na: { status: nieuw.status, uitslag: nieuw.uitslag }
    }])
  });
}

/* ── Statistieken over fases, seizoenen en teams ──────────────
   Een selectie is een bron (de wedstrijden van één team in één seizoen)
   plus optioneel een lijst fases. Meerdere selecties worden samengevoegd
   als VERZAMELING op team + seizoen + wedstrijd-id: een wedstrijd die
   via twee selecties binnenkomt, telt één keer. Wedstrijd-id's zijn
   alleen uniek binnen één team en seizoen, vandaar die drie samen. */
/**
 * @param {{bron:{teamId:string, seizoen:string, wedstrijden:any[]}, fases:(string[]|null)}[]} selecties
 * @param {string[]} soorten   bv. ["competitie","beker"]
 * @returns {{teamId:string, seizoen:string, wedstrijd:any}[]}
 */
function verzamelWedstrijden(selecties, soorten) {
  /** @type {Object<string, boolean>} */
  var gezien = {};
  /** @type {{teamId:string, seizoen:string, wedstrijd:any}[]} */
  var uit = [];
  (selecties || []).forEach(function (sel) {
    (sel.bron.wedstrijden || []).forEach(function (w) {
      if (w.status !== "gespeeld") return;
      if ((soorten || []).indexOf(w.soort || "competitie") < 0) return;
      if (sel.fases && !(w.competitie && sel.fases.indexOf(w.competitie.faseId) >= 0)) return;
      var sleutel = sel.bron.teamId + "|" + sel.bron.seizoen + "|" + w.id;
      if (gezien[sleutel]) return;
      gezien[sleutel] = true;
      uit.push({ teamId: sel.bron.teamId, seizoen: sel.bron.seizoen, wedstrijd: w });
    });
  });
  return uit;
}
/* Doelpunten per persoon over teams heen. Een speler heeft per team een
   eigen id; persoonId koppelt ze (gezet in het koppelscherm, nooit
   automatisch op naam). Zonder persoonId telt de speler alleen binnen
   zijn eigen team. Alleen doelpunten van ons eigen team (eigenTeam). */
/**
 * @param {{teamId:string, seizoen:string, wedstrijd:any}[]} verzameling
 * @param {Object<string, {id:any, persoonId?:string}[]>} spelersPerTeam
 * @returns {Object<string, number>}
 */
function doelpuntenPerPersoon(verzameling, spelersPerTeam) {
  /** @type {Object<string, number>} */
  var tel = {};
  (verzameling || []).forEach(function (item) {
    var spelers = (spelersPerTeam || {})[item.teamId] || [];
    (item.wedstrijd.scorers || []).forEach(function (/** @type {any} */ s) {
      if (!s.eigenTeam || s.spelerId === null || s.spelerId === undefined) return;
      var sp = spelers.filter(function (x) { return x.id === s.spelerId; })[0];
      var persoon = sp && sp.persoonId ? sp.persoonId : (item.teamId + ":" + s.spelerId);
      tel[persoon] = (tel[persoon] || 0) + 1;
    });
  });
  return tel;
}
