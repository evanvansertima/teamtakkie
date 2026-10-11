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
      var persoon = persoonVan(sp || { id: s.spelerId }, item.teamId);
      tel[persoon] = (tel[persoon] || 0) + 1;
    });
  });
  return tel;
}

/* ══ OMZETTEN VAN BESTAANDE GEGEVENS ══════════════════════════
   Release 1, stap 3 (hoofdstuk 6 van het plan). Uitgangspunt: niets
   verdwijnt en niets wordt geraden. De oude handmatige stand
   (fch_stand_v1) en de eigen wedstrijden blijven precies zoals ze waren;
   deze functies lezen ze alleen en geven nieuwe objecten terug. */

/* Een team-id dat volgt uit de naam: dezelfde club, anders geschreven,
   geeft hetzelfde id — dus nooit twee keer hetzelfde team. */
/** @param {string} naam @returns {string} */
function teamIdUitNaam(naam) {
  return "t-" + normaliseerTeamNaam(naam).replace(/ /g, "-");
}
/** @param {CompTeam[]} teams @param {string} naam @returns {CompTeam|null} */
function zoekTeamOpNaam(teams, naam) {
  var n = normaliseerTeamNaam(naam);
  if (!n) return null;
  return teams.filter(function (t) {
    return normaliseerTeamNaam(t.naam) === n ||
      (t.aliassen || []).some(function (a) { return normaliseerTeamNaam(a) === n; });
  })[0] || null;
}
/** @param {any} w @returns {boolean} */
function isEigenCompetitie(w) { return (w.soort || "competitie") === "competitie"; }

/* M1, deel 1: de competitie zelf. Eén fase, handmatig, met alle teams
   die we al kennen: het eigen team, de tegenstanders uit de eigen
   competitiewedstrijden en de teams uit de oude handmatige stand. Nog
   GEEN wedstrijden: die komen pas na bevestiging (bevestigIndeling). */
/**
 * @param {{id?:string, faseId?:string, eigenNaam:string, oudeStand?:any[], wedstrijden?:any[]}} o
 * @returns {Competitie}
 */
function migreerNaarCompetitie(o) {
  /** @type {CompTeam[]} */
  var teams = [{ id: "t-eigen", naam: o.eigenNaam || "Eigen team", eigen: true, aliassen: [] }];
  /** @param {string} naam */
  function voegToe(naam) {
    var schoon = String(naam || "").trim();
    if (!normaliseerTeamNaam(schoon)) return;
    var bestaand = zoekTeamOpNaam(teams, schoon);
    if (bestaand) {
      if (!bestaand.eigen && bestaand.naam !== schoon && (bestaand.aliassen || []).indexOf(schoon) < 0) {
        bestaand.aliassen = (bestaand.aliassen || []).concat([schoon]);
      }
      return;
    }
    teams.push({ id: teamIdUitNaam(schoon), naam: schoon, eigen: false, aliassen: [] });
  }
  (o.wedstrijden || []).filter(isEigenCompetitie).forEach(function (w) { voegToe(w.tegenstander); });
  (o.oudeStand || []).forEach(function (t) { voegToe(t.naam); });
  var faseId = o.faseId || ("f" + Date.now().toString(36));
  return {
    id: o.id || ("c" + Date.now().toString(36)),
    naam: "Competitie",
    actieveFaseId: faseId,
    teams: teams,
    fases: [{
      id: faseId, naam: "Fase 1", van: "", tot: "", status: "open", vorm: "handmatig",
      regels: JSON.parse(JSON.stringify(STANDAARD_REGELS)),
      deelnemers: teams.map(function (t) { return t.id; }), rondes: [], wedstrijden: []
    }],
    logboek: []
  };
}

/* M1, deel 2: het VOORSTEL. Elke eigen competitiewedstrijd, ook de
   geplande, met als voorgestelde fase: de fase waar hij al in zit, of
   anders de actieve. Het scherm laat de gebruiker per wedstrijd of per
   datum kiezen; pas daarna bevestigIndeling. */
/**
 * @param {Competitie} c
 * @param {any[]} wedstrijden
 * @returns {{wedstrijdId:any, faseId:string, datum:string, tegenstander:string, status:string}[]}
 */
function voorstelIndeling(c, wedstrijden) {
  return (wedstrijden || []).filter(isEigenCompetitie).map(function (w) {
    var al = w.competitie && w.competitie.competitieId === c.id ? w.competitie.faseId : null;
    return { wedstrijdId: w.id, faseId: al || c.actieveFaseId, datum: w.datum || "",
             tegenstander: w.tegenstander || "", status: w.status };
  });
}

/* M1, deel 3: na "Indeling bevestigen". Maakt per eigen wedstrijd één
   competitiewedstrijd die ernaar verwijst (geen eigen uitslag: die
   blijft in de Wedstrijd), en zet in de Wedstrijd in welke fase hij zit.
   Een wedstrijd die al gekoppeld is, wordt overgeslagen — twee keer
   bevestigen maakt geen tweede set. */
/**
 * @param {Competitie} c
 * @param {any[]} wedstrijden
 * @param {{wedstrijdId:any, faseId:string}[]} indeling
 * @returns {{competitie:Competitie, wedstrijden:any[]}}
 */
function bevestigIndeling(c, wedstrijden, indeling) {
  /** @type {Competitie} */
  var nieuw = JSON.parse(JSON.stringify(c));
  var eigen = nieuw.teams.filter(function (t) { return t.eigen; })[0];
  /** @type {Object<string, {competitieId:string, faseId:string, compWedstrijdId:string}>} */
  var koppeling = {};
  /** @param {any} id */
  function alGekoppeld(id) {
    return nieuw.fases.some(function (f) { return f.wedstrijden.some(function (x) { return x.wedstrijdId === id; }); });
  }
  (indeling || []).forEach(function (keuze) {
    var w = (wedstrijden || []).filter(function (x) { return x.id === keuze.wedstrijdId; })[0];
    if (!w || !isEigenCompetitie(w) || alGekoppeld(w.id)) return;
    var f = nieuw.fases.filter(function (x) { return x.id === keuze.faseId; })[0];
    if (!f) return;
    var tegen = zoekTeamOpNaam(nieuw.teams, w.tegenstander);
    if (!tegen) {
      tegen = { id: teamIdUitNaam(w.tegenstander || "onbekend"), naam: w.tegenstander || "Onbekend", eigen: false, aliassen: [] };
      nieuw.teams.push(tegen);
    }
    [eigen.id, tegen.id].forEach(function (id) { if (f.deelnemers.indexOf(id) < 0) f.deelnemers.push(id); });
    var cwId = "cw-" + w.id;
    f.wedstrijden.push({
      id: cwId, rondeId: "", thuisId: w.thuis ? eigen.id : tegen.id, uitId: w.thuis ? tegen.id : eigen.id,
      datum: w.datum || "", tijd: w.tijd || "", locatie: w.locatie || "",
      status: "gepland", uitslag: null, notitie: "", wedstrijdId: w.id
    });
    koppeling[String(w.id)] = { competitieId: nieuw.id, faseId: f.id, compWedstrijdId: cwId };
  });
  return {
    competitie: nieuw,
    wedstrijden: (wedstrijden || []).map(function (w) {
      var k = koppeling[String(w.id)];
      return k ? Object.assign({}, w, { competitie: k }) : w;
    })
  };
}

/* De controle na het omzetten. Drie dingen moeten waar zijn, anders is
   de omzetting niet in orde en blijft de oude weergave staan:
   1. elke eigen competitiewedstrijd staat in precies één fase;
   2. geen enkele uitslag is veranderd;
   3. de eigen winst/gelijk/verlies/voor/tegen over alle fases samen is
      precies wat de oude app (eigenStandRij) uitrekende. */
/**
 * @param {any[]} voor   eigen wedstrijden vóór het omzetten
 * @param {Competitie} c
 * @param {any[]} na     eigen wedstrijden ná het omzetten
 * @returns {{ok:boolean, meldingen:string[]}}
 */
function controleMigratie(voor, c, na) {
  /** @type {string[]} */
  var meldingen = [];
  var eigenVoor = (voor || []).filter(isEigenCompetitie);
  eigenVoor.forEach(function (w) {
    var keer = 0;
    c.fases.forEach(function (f) { f.wedstrijden.forEach(function (x) { if (x.wedstrijdId === w.id) keer++; }); });
    if (keer === 0) meldingen.push("Wedstrijd " + w.id + " (" + (w.tegenstander || "?") + ") staat in geen enkele fase.");
    if (keer > 1) meldingen.push("Wedstrijd " + w.id + " (" + (w.tegenstander || "?") + ") staat in " + keer + " fases.");
    var n = (na || []).filter(function (x) { return x.id === w.id; })[0];
    if (!n || n.status !== w.status || JSON.stringify(n.score) !== JSON.stringify(w.score)) {
      meldingen.push("De uitslag of status van wedstrijd " + w.id + " is veranderd.");
    }
  });
  /** @param {any[]} ws */
  function oud(ws) {
    var g = ws.filter(function (w) { return w.status === "gespeeld" && isEigenCompetitie(w); });
    return [g.filter(function (w) { return w.score.fch > w.score.teg; }).length,
            g.filter(function (w) { return w.score.fch === w.score.teg; }).length,
            g.filter(function (w) { return w.score.fch < w.score.teg; }).length,
            g.reduce(function (s, w) { return s + (Number(w.score.fch) || 0); }, 0),
            g.reduce(function (s, w) { return s + (Number(w.score.teg) || 0); }, 0)];
  }
  var som = [0, 0, 0, 0, 0];
  c.fases.forEach(function (f) {
    var r = standVanFase(c, f.id, na || []).filter(function (x) { return x.eigen; })[0];
    if (r) { som[0] += r.winst; som[1] += r.gelijk; som[2] += r.verlies; som[3] += r.voor; som[4] += r.tegen; }
  });
  var verwacht = oud(eigenVoor);
  if (som.join(",") !== verwacht.join(",")) {
    meldingen.push("De eigen totalen kloppen niet: vóór W/GL/V/voor/tegen " + verwacht.join("/") +
                   ", ná " + som.join("/") + ".");
  }
  return { ok: meldingen.length === 0, meldingen: meldingen };
}

/* ══ SPELERS OVER TEAMS HEEN (besluit 3) ══════════════════════
   Elke speler heeft per team een eigen id. persoonId koppelt dezelfde
   persoon over seizoenen en teams. Binnen één team over seizoenen is
   dat zeker (de id blijft gelijk bij het kopiëren naar een nieuw
   seizoen); over teams heen NOOIT automatisch: twee keer "Daan" is
   niet per se dezelfde Daan. Daar alleen een voorstel, bij gelijke
   naam én geboortedatum, dat de gebruiker bevestigt. */

/* Het kenmerk van een speler zolang hij niet is gekoppeld: afgeleid uit
   team en speler-id. Daardoor hoeft er bij de overstap naar persoonId
   NIETS in de bestaande spelersgegevens te worden geschreven: binnen één
   team is het over seizoenen vanzelf gelijk (de id blijft gelijk bij het
   kopiëren naar een nieuw seizoen), tussen teams altijd verschillend.
   Pas bij koppelen komt er een echte persoonId op de speler te staan. */
/**
 * @param {{id:any, persoonId?:string}} speler
 * @param {string} teamId
 * @returns {string}
 */
function persoonVan(speler, teamId) {
  return speler && speler.persoonId ? speler.persoonId : ("p-" + teamId + "-" + (speler ? speler.id : ""));
}
/** @returns {string} */
function nieuwPersoonId() {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return "p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
/**
 * @param {{seizoen:string, spelers:any[]}[]} perSeizoen  oudste seizoen eerst
 * @param {() => string} [maakId]
 * @returns {{seizoen:string, spelers:any[]}[]}
 */
function geefPersoonIds(perSeizoen, maakId) {
  var nieuwId = maakId || nieuwPersoonId;
  /** @type {Object<string, string>} */
  var perId = {};
  (perSeizoen || []).forEach(function (s) {
    (s.spelers || []).forEach(function (sp) { if (sp.persoonId && !perId[String(sp.id)]) perId[String(sp.id)] = sp.persoonId; });
  });
  return (perSeizoen || []).map(function (s) {
    return { seizoen: s.seizoen, spelers: (s.spelers || []).map(function (sp) {
      if (sp.persoonId) return sp;
      var k = String(sp.id);
      if (!perId[k]) perId[k] = nieuwId();
      return Object.assign({}, sp, { persoonId: perId[k] });
    }) };
  });
}
/**
 * @param {{teamId:string, spelers:any[]}} a
 * @param {{teamId:string, spelers:any[]}} b
 * @returns {{a:any, b:any}[]}
 */
function koppelVoorstellen(a, b) {
  /** @type {{a:any, b:any}[]} */
  var uit = [];
  (a.spelers || []).forEach(function (sa) {
    if (!sa.geboortedatum) return;
    (b.spelers || []).forEach(function (sb) {
      if (sb.geboortedatum === sa.geboortedatum && normaliseerTeamNaam(sb.naam) === normaliseerTeamNaam(sa.naam)) {
        uit.push({ a: sa.id, b: sb.id });
      }
    });
  });
  return uit;
}
/**
 * @param {Object<string, any[]>} spelersPerTeam
 * @param {{teamId:string, spelerId:any}} a
 * @param {{teamId:string, spelerId:any}} b
 * @returns {Object<string, any[]>}
 */
function koppelPersonen(spelersPerTeam, a, b) {
  var kopie = JSON.parse(JSON.stringify(spelersPerTeam || {}));
  var sa = (kopie[a.teamId] || []).filter(function (/** @type {any} */ x) { return x.id === a.spelerId; })[0];
  var sb = (kopie[b.teamId] || []).filter(function (/** @type {any} */ x) { return x.id === b.spelerId; })[0];
  if (!sa || !sb) throw new Error("Speler om te koppelen niet gevonden");
  sa.persoonId = persoonVan(sa, a.teamId);
  sb.persoonId = sa.persoonId;
  return kopie;
}
/**
 * @param {Object<string, any[]>} spelersPerTeam
 * @param {{teamId:string, spelerId:any}} x
 * @param {() => string} [maakId]
 * @returns {Object<string, any[]>}
 */
function ontkoppelPersoon(spelersPerTeam, x, maakId) {
  var kopie = JSON.parse(JSON.stringify(spelersPerTeam || {}));
  var sp = (kopie[x.teamId] || []).filter(function (/** @type {any} */ s) { return s.id === x.spelerId; })[0];
  if (!sp) throw new Error("Speler om te ontkoppelen niet gevonden");
  sp.persoonId = (maakId || nieuwPersoonId)();
  return kopie;
}

/* ══ BEWERKINGEN VOOR HET SCHERM (release 1, stap 5) ═══════════
   Klein en puur, zodat het scherm geen eigen regels hoeft te kennen. */

/* Een team aan een fase toevoegen. Bestaat het team al in de competitie
   (ook onder een andere schrijfwijze), dan wordt dát team gebruikt: geen
   dubbel. Geeft {competitie, teamId, nieuw} terug. */
/**
 * @param {Competitie} c
 * @param {string} faseId
 * @param {string} naam
 * @returns {{competitie:Competitie, teamId:string, nieuw:boolean}}
 */
function voegTeamToe(c, faseId, naam) {
  var schoon = String(naam || "").trim();
  if (!normaliseerTeamNaam(schoon)) throw new Error("Vul een teamnaam in.");
  zoekFase(c, faseId);
  /** @type {Competitie} */
  var kopie = JSON.parse(JSON.stringify(c));
  var bestaand = zoekTeamOpNaam(kopie.teams, schoon);
  var id = bestaand ? bestaand.id : teamIdUitNaam(schoon);
  if (!bestaand) {
    var basis = id, n = 2;
    while (kopie.teams.some(function (t) { return t.id === id; })) id = basis + "-" + (n++);
    kopie.teams.push({ id: id, naam: schoon, eigen: false, aliassen: [] });
  }
  var f = zoekFase(kopie, faseId);
  if (f.deelnemers.indexOf(id) < 0) f.deelnemers.push(id);
  return { competitie: kopie, teamId: id, nieuw: !bestaand };
}

/* Een team uit een fase halen. Heeft het in die fase wedstrijden, dan
   niet: die zouden dan naar een team wijzen dat er niet meer bij hoort.
   Andere fases merken er niets van. Het eigen team kan er niet uit. */
/**
 * @param {Competitie} c
 * @param {string} faseId
 * @param {string} teamId
 * @returns {Competitie}
 */
function verwijderDeelnemer(c, faseId, teamId) {
  var f = zoekFase(c, faseId);
  var team = c.teams.filter(function (t) { return t.id === teamId; })[0];
  if (team && team.eigen) throw new Error("Je eigen team hoort altijd bij de competitie.");
  var aantal = f.wedstrijden.filter(function (w) { return w.thuisId === teamId || w.uitId === teamId; }).length;
  if (aantal > 0) {
    throw new Error("Dit team heeft " + aantal + (aantal === 1 ? " wedstrijd" : " wedstrijden") +
                    " in " + f.naam + ". Haal die eerst weg.");
  }
  return Object.assign({}, c, { fases: c.fases.map(function (x) {
    return x.id !== faseId ? x : Object.assign({}, x, { deelnemers: x.deelnemers.filter(function (d) { return d !== teamId; }) });
  }) });
}

/* Fase afsluiten of heropenen, met een logregel. */
/**
 * @param {Competitie} c
 * @param {string} faseId
 * @param {"open"|"afgesloten"} status
 * @param {{tijd:string, door:string}} wie
 * @returns {Competitie}
 */
function zetFaseStatus(c, faseId, status, wie) {
  var f = zoekFase(c, faseId);
  if (status !== "open" && status !== "afgesloten") throw new Error("Onbekende status: " + status);
  if (f.status === status) return c;
  return Object.assign({}, c, {
    fases: c.fases.map(function (x) { return x.id === faseId ? Object.assign({}, x, { status: status }) : x; }),
    logboek: (c.logboek || []).concat([{ tijd: wie.tijd, door: wie.door, wat: "fase-status", faseId: faseId,
      voor: { status: f.status }, na: { status: status } }])
  });
}

/* Welke eigen competitiewedstrijden zitten nog in geen enkele fase? Die
   wachten op het indeelscherm; tot die tijd is de stand onvolledig. */
/**
 * @param {Competitie} c
 * @param {any[]} wedstrijden
 * @returns {any[]}
 */
function nietIngedeeld(c, wedstrijden) {
  return (wedstrijden || []).filter(function (w) {
    return isEigenCompetitie(w) && !c.fases.some(function (f) {
      return f.wedstrijden.some(function (x) { return x.wedstrijdId === w.id; });
    });
  });
}

/* ══ SPEELRONDES EN WEDSTRIJDEN MET DE HAND (wens van Evan, 11 okt.) ══
   Speelrondes aanmaken, per ronde zelf kiezen wie tegen wie speelt, en
   daar de uitslag invullen. Een wedstrijd van het eigen team verwijst
   altijd naar een eigen Wedstrijd (wedstrijdId): de uitslag staat daar,
   ook als hij hier wordt ingevuld — één registratie. */

/**
 * @param {Competitie} c
 * @param {string} faseId
 * @param {string} [naam]
 * @returns {{competitie:Competitie, rondeId:string}}
 */
function voegRondeToe(c, faseId, naam) {
  var f = zoekFase(c, faseId);
  var nummer = (f.rondes || []).reduce(function (m, r) { return Math.max(m, Number(r.nummer) || 0); }, 0) + 1;
  var id = "r" + nummer + "-" + Date.now().toString(36);
  var ronde = { id: id, nummer: nummer, naam: String(naam || "").trim() || ("Speelronde " + nummer), datum: "" };
  return {
    competitie: Object.assign({}, c, { fases: c.fases.map(function (x) {
      return x.id === faseId ? Object.assign({}, x, { rondes: (x.rondes || []).concat([ronde]) }) : x;
    }) }),
    rondeId: id
  };
}

/* Een ronde weghalen kan alleen als er geen wedstrijden in staan. */
/** @param {Competitie} c @param {string} faseId @param {string} rondeId @returns {Competitie} */
function verwijderRonde(c, faseId, rondeId) {
  var f = zoekFase(c, faseId);
  if (f.wedstrijden.some(function (w) { return w.rondeId === rondeId; })) {
    throw new Error("Er staan nog wedstrijden in deze speelronde. Haal die eerst weg.");
  }
  return Object.assign({}, c, { fases: c.fases.map(function (x) {
    return x.id === faseId ? Object.assign({}, x, { rondes: x.rondes.filter(function (r) { return r.id !== rondeId; }) }) : x;
  }) });
}

/* Welke teams spelen al in deze ronde? Een team speelt per ronde één keer. */
/** @param {Fase} f @param {string} rondeId @returns {string[]} */
function teamsInRonde(f, rondeId) {
  /** @type {string[]} */
  var uit = [];
  f.wedstrijden.forEach(function (w) { if (w.rondeId === rondeId) { uit.push(w.thuisId); uit.push(w.uitId); } });
  return uit;
}

/** @type {Object<string, string>} */
var FOUT_TEKST = {
  "zelf": "Een team kan niet tegen zichzelf spelen.",
  "geen-deelnemer": "Dat team doet niet mee in deze fase.",
  "dubbel": "Deze twee teams spelen in deze fase al tegen elkaar.",
  "al-in-ronde": "Een van deze teams speelt al in deze speelronde.",
  "gespeeld-zonder-uitslag": "Vul beide scores in.",
  "uitslag-zonder-gespeeld": "Een uitslag hoort bij een gespeelde wedstrijd.",
  "score-ongeldig": "Een score is een heel getal vanaf 0."
};

/* Een wedstrijd in een ronde zetten. Bij het eigen team hoort er een
   wedstrijdId bij (zie hierboven); het scherm zorgt daarvoor. */
/**
 * @param {Competitie} c
 * @param {string} faseId
 * @param {{rondeId:string, thuisId:string, uitId:string, wedstrijdId?:any, id?:string}} w
 * @returns {{competitie:Competitie, id:string}}
 */
function voegWedstrijdToe(c, faseId, w) {
  var f = zoekFase(c, faseId);
  if (!(f.rondes || []).some(function (r) { return r.id === w.rondeId; })) throw new Error("Kies een speelronde.");
  var id = w.id || ("cw-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  /** @type {CompWedstrijd} */
  var nieuw = { id: id, rondeId: w.rondeId, thuisId: w.thuisId, uitId: w.uitId, datum: "", tijd: "", locatie: "",
                status: "gepland", uitslag: null, notitie: "" };
  if (w.wedstrijdId !== undefined && w.wedstrijdId !== null) nieuw.wedstrijdId = w.wedstrijdId;
  var fouten = valideerWedstrijd(f, nieuw);
  var bezet = teamsInRonde(f, w.rondeId);
  if (!fouten.length && (bezet.indexOf(w.thuisId) >= 0 || bezet.indexOf(w.uitId) >= 0)) fouten.push("al-in-ronde");
  if (fouten.length) throw new Error(FOUT_TEKST[fouten[0]] || fouten[0]);
  return {
    competitie: Object.assign({}, c, { fases: c.fases.map(function (x) {
      return x.id === faseId ? Object.assign({}, x, { wedstrijden: x.wedstrijden.concat([nieuw]) }) : x;
    }) }),
    id: id
  };
}

/* Een wedstrijd uit de competitie halen. Niet als er een uitslag is: die
   eerst leegmaken, zodat er nooit stilletjes een resultaat verdwijnt. */
/** @param {Competitie} c @param {string} faseId @param {string} id @param {any[]} eigenWedstrijden @returns {Competitie} */
function verwijderWedstrijd(c, faseId, id, eigenWedstrijden) {
  var f = zoekFase(c, faseId);
  var w = f.wedstrijden.filter(function (x) { return x.id === id; })[0];
  if (!w) return c;
  if (uitslagVan(w, eigenWedstrijden)) throw new Error("Deze wedstrijd heeft een uitslag. Maak die eerst leeg.");
  return Object.assign({}, c, { fases: c.fases.map(function (x) {
    return x.id === faseId ? Object.assign({}, x, { wedstrijden: x.wedstrijden.filter(function (y) { return y.id !== id; }) }) : x;
  }) });
}

/* Een wedstrijd naar een (andere) ronde, bijvoorbeeld een ingedeelde
   eigen wedstrijd die nog geen ronde had. */
/** @param {Competitie} c @param {string} faseId @param {string} id @param {string} rondeId @returns {Competitie} */
function zetWedstrijdInRonde(c, faseId, id, rondeId) {
  var f = zoekFase(c, faseId);
  var w = f.wedstrijden.filter(function (x) { return x.id === id; })[0];
  if (!w) throw new Error("Onbekende wedstrijd: " + id);
  if (!(f.rondes || []).some(function (r) { return r.id === rondeId; })) throw new Error("Kies een speelronde.");
  var bezet = f.wedstrijden.filter(function (x) { return x.rondeId === rondeId && x.id !== id; })
    .reduce(function (/** @type {string[]} */ l, x) { return l.concat([x.thuisId, x.uitId]); }, []);
  if (bezet.indexOf(w.thuisId) >= 0 || bezet.indexOf(w.uitId) >= 0) throw new Error(FOUT_TEKST["al-in-ronde"]);
  return Object.assign({}, c, { fases: c.fases.map(function (x) {
    return x.id !== faseId ? x : Object.assign({}, x, { wedstrijden: x.wedstrijden.map(function (y) {
      return y.id === id ? Object.assign({}, y, { rondeId: rondeId }) : y; }) });
  }) });
}

/* Twee invulvakjes → wat er moet gebeuren. Allebei leeg: geen uitslag.
   Allebei een heel getal ≥ 0: gespeeld. Eén leeg: nog niet compleet
   (er wordt niets bewaard). Iets anders: fout. Een lege uitslag is dus
   nooit 0–0. */
/**
 * @param {string} thuis
 * @param {string} uit
 * @returns {{soort:"leeg"}|{soort:"half"}|{soort:"fout"}|{soort:"uitslag", uitslag:Uitslag}}
 */
function leesUitslagInvoer(thuis, uit) {
  var a = String(thuis == null ? "" : thuis).trim(), b = String(uit == null ? "" : uit).trim();
  if (a === "" && b === "") return { soort: "leeg" };
  if (a === "" || b === "") return { soort: "half" };
  if (!/^\d{1,3}$/.test(a) || !/^\d{1,3}$/.test(b)) return { soort: "fout" };
  return { soort: "uitslag", uitslag: { thuis: Number(a), uit: Number(b) } };
}

/* De uitslag van een competitiewedstrijd vertaald naar de eigen
   Wedstrijd (score.fch = eigen team). null = geen uitslag. */
/**
 * @param {CompWedstrijd} cw
 * @param {string} eigenId
 * @param {Uitslag|null} uitslag
 * @returns {{status:string, score:{fch:number, teg:number}, thuis:boolean}}
 */
function eigenScoreUit(cw, eigenId, uitslag) {
  var thuis = cw.thuisId === eigenId;
  if (!uitslag) return { status: "gepland", score: { fch: 0, teg: 0 }, thuis: thuis };
  return { status: "gespeeld", thuis: thuis,
           score: thuis ? { fch: uitslag.thuis, teg: uitslag.uit } : { fch: uitslag.uit, teg: uitslag.thuis } };
}

/* ══ NOTITIE EN AUTOMATISCH SCHEMA ════════════════════════════ */

/* Een korte opmerking of verslag bij een wedstrijd. */
/** @param {Competitie} c @param {string} faseId @param {string} id @param {string} tekst @returns {Competitie} */
function zetNotitie(c, faseId, id, tekst) {
  var f = zoekFase(c, faseId);
  var w = f.wedstrijden.filter(function (x) { return x.id === id; })[0];
  if (!w) throw new Error("Onbekende wedstrijd: " + id);
  var nieuw = String(tekst || "").trim();
  if ((w.notitie || "") === nieuw) return c;
  return Object.assign({}, c, { fases: c.fases.map(function (x) {
    return x.id !== faseId ? x : Object.assign({}, x, { wedstrijden: x.wedstrijden.map(function (y) {
      return y.id === id ? Object.assign({}, y, { notitie: nieuw }) : y; }) });
  }) });
}

/* Een volledig schema voor de deelnemers van een fase: halve of hele
   competitie. Wat er al staat blijft staan; alleen ontbrekende paren
   komen erbij, in nieuwe speelrondes ná de bestaande. Een ronde zonder
   nieuwe wedstrijden wordt niet aangemaakt.

   Een wedstrijd van het eigen team moet naar een eigen Wedstrijd
   verwijzen; koppelEigen(cwId, tegenId, eigenThuis) levert die id (het
   scherm koppelt aan een bestaande of maakt er een). */
/**
 * @param {Competitie} c
 * @param {string} faseId
 * @param {"half"|"heel"} vorm
 * @param {(cwId:string, tegenId:string, eigenThuis:boolean) => any} [koppelEigen]
 * @returns {{competitie:Competitie, nieuw:number, alAanwezig:number, ingepland:number, rondes:number}}
 */
function maakSchema(c, faseId, vorm, koppelEigen) {
  var f = zoekFase(c, faseId);
  if (vorm !== "half" && vorm !== "heel") throw new Error("Kies halve of hele competitie.");
  if (f.deelnemers.length < 2) throw new Error("Er zijn minstens twee teams nodig.");
  var eigen = c.teams.filter(function (t) { return t.eigen; })[0];
  var eigenId = eigen ? eigen.id : null;
  var schema = genereerSchema(f.deelnemers, vorm);
  var startNummer = (f.rondes || []).reduce(function (m, r) { return Math.max(m, Number(r.nummer) || 0); }, 0);
  var stempel = Date.now().toString(36);
  /** @type {any[]} */ var rondes = (f.rondes || []).slice();
  /** @type {CompWedstrijd[]} */ var wedstrijden = f.wedstrijden.slice();
  var nieuw = 0, alAanwezig = 0, ingepland = 0, rondeTeller = 0, volg = 0;
  /** @param {string} id */
  function heeftRonde(id) { return rondes.some(function (r) { return r.id === id; }); }
  schema.rondes.forEach(function (sr) {
    /** @type {string} */
    var rondeId = "";
    function zorgVoorRonde() {
      if (rondeId) return;
      rondeTeller++;
      var nummer = startNummer + rondeTeller;
      rondeId = "r" + nummer + "-" + stempel;
      rondes.push({ id: rondeId, nummer: nummer, naam: "Speelronde " + nummer, datum: "",
                    vrijTeamId: sr.vrijTeamId });
    }
    sr.paren.forEach(function (p) {
      var bestaand = wedstrijden.filter(function (x) {
        if (x.thuisId === p[0] && x.uitId === p[1]) return true;
        return vorm === "half" && x.thuisId === p[1] && x.uitId === p[0];
      })[0];
      if (bestaand) {
        alAanwezig++;
        /* Een bestaande wedstrijd zonder speelronde (bijvoorbeeld een
           ingedeelde eigen wedstrijd) krijgt meteen de ronde waar hij in
           het schema hoort; thuis/uit blijft zoals hij was. */
        if (!heeftRonde(bestaand.rondeId || "")) {
          zorgVoorRonde();
          var rid = rondeId;
          wedstrijden = wedstrijden.map(function (x) { return x === bestaand ? Object.assign({}, x, { rondeId: rid }) : x; });
          ingepland++;
        }
        return;
      }
      zorgVoorRonde();
      var cwId = "cw-" + stempel + "-" + (volg++);
      /** @type {CompWedstrijd} */
      var w = { id: cwId, rondeId: rondeId, thuisId: p[0], uitId: p[1], datum: "", tijd: "", locatie: "",
                status: "gepland", uitslag: null, notitie: "" };
      if (eigenId && (p[0] === eigenId || p[1] === eigenId)) {
        if (!koppelEigen) throw new Error("Een wedstrijd van het eigen team heeft een koppeling nodig.");
        w.wedstrijdId = koppelEigen(cwId, p[0] === eigenId ? p[1] : p[0], p[0] === eigenId);
      }
      wedstrijden.push(w);
      nieuw++;
    });
  });
  return {
    competitie: Object.assign({}, c, { fases: c.fases.map(function (x) {
      return x.id === faseId ? Object.assign({}, x, { vorm: vorm, rondes: rondes, wedstrijden: wedstrijden }) : x;
    }) }),
    nieuw: nieuw, alAanwezig: alAanwezig, ingepland: ingepland, rondes: rondeTeller
  };
}

/* ══ STATISTIEKEN OVER FASES, SEIZOENEN EN TEAMS (stap 7) ══════
   Rekent over een verzameling uit verzamelWedstrijden(): dus nooit een
   wedstrijd dubbel. Wat niet is bijgehouden is GEEN nul: een wedstrijd
   zonder opstelling zegt niets over wie meedeed of hoe lang, en wordt
   apart geteld (zonderOpstelling) zodat het scherm "—" kan tonen. */

/**
 * @param {{teamId:string, seizoen:string, wedstrijd:any}[]} verzameling
 * @returns {{gespeeld:number, winst:number, gelijk:number, verlies:number, voor:number, tegen:number}}
 */
function teamTotalen(verzameling) {
  var t = { gespeeld: 0, winst: 0, gelijk: 0, verlies: 0, voor: 0, tegen: 0 };
  (verzameling || []).forEach(function (item) {
    var s = item.wedstrijd.score || {};
    var f = Number(s.fch) || 0, g = Number(s.teg) || 0;
    t.gespeeld++; t.voor += f; t.tegen += g;
    if (f > g) t.winst++; else if (f < g) t.verlies++; else t.gelijk++;
  });
  return t;
}

/**
 * @param {{teamId:string, seizoen:string, wedstrijd:any}[]} verzameling
 * @param {Object<string, any[]>} spelersPerTeam  per team-id de spelers (laatste seizoen eerst is het handigst voor de naam)
 * @returns {any[]}  per persoon: naam, teams, wedstrijden, minuten, doelpunten, assists, geel, rood, zonderOpstelling
 */
function spelerTotalen(verzameling, spelersPerTeam) {
  /** @type {Object<string, any>} */
  var rij = {};
  /** @param {string} teamId @param {any} spelerId */
  function persoon(teamId, spelerId) {
    var sp = ((spelersPerTeam || {})[teamId] || []).filter(function (x) { return x.id === spelerId; })[0];
    var p = persoonVan(sp || { id: spelerId }, teamId);
    if (!rij[p]) rij[p] = { persoonId: p, naam: sp ? sp.naam : "Onbekende speler", teams: [],
      wedstrijden: 0, minuten: 0, minutenOnbekend: 0, doelpunten: 0, assists: 0, geel: 0, rood: 0, zonderOpstelling: 0, _gezien: {} };
    if (rij[p].teams.indexOf(teamId) < 0) rij[p].teams.push(teamId);
    return rij[p];
  }
  /* Iedereen die in een gekozen team zit, staat in de lijst — ook met
     nul doelpunten. Wie in een wedstrijd zonder opstelling zat, weten
     we niet: die wedstrijd telt voor iedereen van dat team als
     "zonder opstelling". */
  /** @type {Object<string, boolean>} */
  var teamsInVerzameling = {};
  (verzameling || []).forEach(function (i) { teamsInVerzameling[i.teamId] = true; });
  Object.keys(teamsInVerzameling).forEach(function (tid) {
    ((spelersPerTeam || {})[tid] || []).forEach(function (sp) { persoon(tid, sp.id); });
  });
  (verzameling || []).forEach(function (item) {
    var w = item.wedstrijd, tid = item.teamId;
    var heeftOpstelling = (w.opstelling || []).length > 0;
    if (heeftOpstelling) {
      (w.opstelling || []).forEach(function (/** @type {any} */ o) {
        /* Oude of geïmporteerde gegevens kunnen een kale lijst speler-id's
           zijn: wel meegedaan, maar hoe lang is onbekend — niet 0. */
        if (typeof o === "string" || typeof o === "number") { var k = persoon(tid, o); k.wedstrijden++; k.minutenOnbekend++; return; }
        if ((o.spelStatus || "basis") === "afwezig") return;
        var r = persoon(tid, o.spelerId);
        r.wedstrijden++;
        if (o.minuten === undefined || o.minuten === null || o.minuten === "") r.minutenOnbekend++;
        else r.minuten += Number(o.minuten) || 0;
      });
    } else {
      ((spelersPerTeam || {})[tid] || []).forEach(function (sp) { persoon(tid, sp.id).zonderOpstelling++; });
    }
    (w.scorers || []).forEach(function (/** @type {any} */ s) {
      if (s.eigenTeam && s.spelerId !== null && s.spelerId !== undefined) persoon(tid, s.spelerId).doelpunten++;
      if (s.eigenTeam && s.assist !== null && s.assist !== undefined && s.assist !== "") persoon(tid, s.assist).assists++;
    });
    (w.kaarten || []).forEach(function (/** @type {any} */ k) {
      if (k.spelerId === null || k.spelerId === undefined) return;
      if (k.type === "geel") persoon(tid, k.spelerId).geel++; else persoon(tid, k.spelerId).rood++;
    });
  });
  return Object.keys(rij).map(function (k) { var r = rij[k]; delete r._gezien; return r; })
    .sort(function (a, b) { return b.doelpunten - a.doelpunten || b.wedstrijden - a.wedstrijden || a.naam.localeCompare(b.naam, "nl"); });
}
