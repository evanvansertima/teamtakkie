// @ts-check
/* ══════════════════════════════════════════════════════════════
   KERN: synchroniseren — syncEen, voegSamen, het vangnet
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 16 september 2026 (P2,
   stap 5, de laatste, van docs/professionaliseringsplan.md). Geen
   import/export: tools/bouw.js plakt dit bestand als laatste van de
   kern-modules vóór de rest van de app (na opslag.js — zie
   KERN_VOLGORDE in tools/bouw.js), dus alles hieronder is nog altijd
   gewoon top-level function/const in dezelfde scope als src/app.jsx.
   Dit is een verhuizing, geen herschrijving: dezelfde tekst, dezelfde
   comments. Deze module komt als laatste omdat hij de andere vier
   gebruikt: sleutels (teams, sleutelVoor), server (serverVraag,
   gebruikerNu), rollen (niet rechtstreeks, wel indirect via de app)
   en opslag (laadJson/slaJson, elders in de app).

   Twee fysiek gescheiden stukken uit src/app.jsx, hier weer bij
   elkaar gezet in dezelfde volgorde: eerst de syncstaat, het
   samenvoegen van lijsten, de club-sleutel en het vangnet; dan, na
   een stuk dat in app.jsx is blijven staan, de daadwerkelijke
   uitwisseling (duwTeamsWeg t/m synchroniseer).

   Wat daartussenin bewust NIET is meeverplaatst: het club-blok
   (zorgVoorClub, maakClub, haalClubGegevens, zetClubGegevens,
   hefClubOp) en bewaarClubGegeven() blijven in src/app.jsx staan. Ze
   raken deze module inhoudelijk — synchroniseer() roept
   haalClubGegevens() aan, en zetClubId()/clubIdNu() uit dit bestand
   worden door het club-blok gebruikt — maar Evan heeft ervoor gekozen
   het club-blok als geheel in app.jsx te laten, net als het
   pakket-blok. Die kruisverwijzingen werken gewoon onder de
   aaneenschakeling in tools/bouw.js.

   synchroniseer() roept ook zetPakket() aan, dat bij het pakket-blok
   in app.jsx hoort — zelfde verhaal, zelfde reden dat het werkt.

   Vóór het knippen is één ding rechtgezet: syncPersoonlijk() las
   voorheen _sessie.gebruikerId rechtstreeks; dat is nu gebruikerNu(),
   de accessor uit src/kern/server.js. Puur een opschoning van een
   losse aanroepplek — geen gedragswijziging, gebruikerNu() geeft
   hetzelfde terug.

   Wat hier NIET is doorgevoerd, met opzet: het oorspronkelijke plan
   (docs/professionaliseringsplan.md) noemde het idee om serverVraag
   een parameter van syncEen te maken, zodat sync.js zonder de globale
   serverVraag getest kan worden. Evan heeft dat expliciet afgewezen:
   de bestaande knip-en-mock-truc in tests/sync.test.js (een
   nagemaakte serverVraag als losse top-level functie in het
   testbestand, die de geknipte code via gewone scope-opzoeking
   oppikt) is voldoende bewezen dekking. Dit is een bewuste keuze van
   de projecteigenaar, geen vergeten punt.
   ══════════════════════════════════════════════════════════════ */

/* ══ SYNCHRONISEREN ══════════════════════════════════════════
   Dit is het lastigste stuk van de hele app, en het is niet
   "opslaan naar de server". Het is: bepalen wat er moet gebeuren als
   je in de bus een wissel invult terwijl je assistent thuis dezelfde
   wedstrijd bewerkt.

   De regel die ik heb gekozen, en waarom:

   Veranderde er maar aan één kant iets, dan wint die kant helemaal —
   inclusief wat er is weggehaald. Dat is het gewone geval en dat moet
   gewoon kloppen.

   Veranderde er aan allebei de kanten iets, dan worden de lijsten
   samengevoegd op id: alles wat aan één van beide kanten bestaat komt
   erin, en bij een speler die aan beide kanten is bijgewerkt wint de
   nieuwste. Dat betekent dat een speler die de één weggooide terwijl
   de ander hem bewerkte, kan terugkomen. Dat is met opzet: liever een
   speler die terugkomt dan een avond werk dat verdwijnt. Je ziet ook
   dat het gebeurd is; het gaat niet stilletjes.

   Voor iets wat geen lijst is — je tenue, de boetetarieven — kan er
   niets samengevoegd worden. Daar wint de nieuwste, en krijg je het
   te zien.
   ══════════════════════════════════════════════════════════ */
/** @typedef {Object} SyncStaat
 * @property {string|null} gezien   het bijgewerkt_op-tijdstip zoals de server het laatst gaf
 * @property {boolean} schoon       is dit apparaat sinds "gezien" ongewijzigd?
 * @property {boolean} [heeftLokaal]  alleen gezet vlak vóór syncBesluit(), zie daar
 */

const SYNC_STAAT_KEY = "tt_syncstaat_v1";   /* wat we van de server weten */

/** @returns {Object<string,SyncStaat>} */
function _leesSyncStaat() {
  try {
    var r = localStorage.getItem(SYNC_STAAT_KEY);
    var o = r ? JSON.parse(r) : null;
    return (o && typeof o === "object") ? o : {};
  } catch(e) { return {}; }
}
/** @type {Object<string,SyncStaat>} per volle sleutel wat we van de server weten */
var _syncStaat = _leesSyncStaat();
/** @returns {void} */
function _schrijfSyncStaat() {
  try { localStorage.setItem(SYNC_STAAT_KEY, JSON.stringify(_syncStaat)); } catch(e) {}
}
/** @param {string} volle @returns {SyncStaat} */
function syncStaat(volle) {
  return _syncStaat[volle] || {gezien: null, schoon: true};
}
/** @param {string} volle @param {SyncStaat} staat @returns {void} */
function zetSyncStaat(volle, staat) {
  _syncStaat[volle] = staat;
  _schrijfSyncStaat();
}
/* Er is hier iets veranderd. Dit wordt vanuit slaJson aangeroepen,
   want dat is de enige plek waar de app iets wegschrijft — en dus de
   enige plek waar je zeker weet dat je niets mist. */
/** @param {string} volle @returns {void} */
function meldWijziging(volle) {
  var s = _syncStaat[volle] || {gezien: null, schoon: true};
  if (!s.schoon) { if (typeof syncStraks === "function") syncStraks(); return; }
  s.schoon = false;
  _syncStaat[volle] = s;
  _schrijfSyncStaat();
  /* En daarmee is het uitwisselen in gang gezet. Je hoeft nergens meer
     op te drukken; dat was nu juist het probleem. */
  if (typeof syncStraks === "function") syncStraks();
}

/* ── Vanzelf uitwisselen ─────────────────────────────────────
   Op een knop moeten drukken is een uitnodiging om het te vergeten.
   En als je het op het verkeerde apparaat als eerste doet, kost dat je
   een middag — dat is op 5 september 2026 gebeurd.

   Dus gebeurt het vanzelf. Een paar seconden nadat je klaar bent met
   typen, niet bij elke toetsaanslag: anders stuur je tijdens het
   invullen van een uitslag vier keer een halve uitslag omhoog.

   Verder ook op de twee momenten waarop het er echt toe doet: als je
   de app wegklikt (dan leg je hem weg en pak je straks de andere),
   en zodra er weer bereik is. Bij dat laatste geldt: langs de lijn
   zakt het netwerk weg, en dan moet het gewoon later alsnog. */
/** @typedef {"rustig"|"open"|"bezig"|"mislukt"} SyncStand */

const SYNC_WACHT_MS = 4000;         /* na de laatste wijziging */
const SYNC_OPNIEUW_MS = 30000;      /* na een mislukte poging */
const SYNC_OPNIEUW_MAX = 300000;    /* en niet vaker dan om de vijf minuten */
/** @type {ReturnType<typeof setTimeout>|null} */
var _syncStraksTimer = null;
var _syncOpnieuwNa = SYNC_OPNIEUW_MS;
/** @type {SyncStand} */
var _syncStand = "rustig";
var _syncBinnen = 0;                /* hoe vaak er iets van buiten binnenkwam */
/** @type {((s: SyncStand) => void)[]} */
var _syncStandLuisteraars = [];
var _syncVanzelfAan = true;

/** @returns {SyncStand} */
function syncStand() { return _syncStand; }
/** @returns {number} */
function syncBinnenTeller() { return _syncBinnen; }
/* Staat er een poging gepland? Na een mislukking hoort dat zo te zijn:
   dat is het verschil tussen "het komt goed" en "het blijft liggen". */
/** @returns {boolean} */
function syncGepland() { return _syncStraksTimer !== null; }
/** @param {SyncStand} s @returns {void} */
function zetSyncStand(s) {
  if (_syncStand === s) return;
  _syncStand = s;
  _syncStandLuisteraars.forEach(function (f) { try { f(s); } catch(e) {} });
}
/**
 * @param {(s: SyncStand) => void} f
 * @returns {() => void} functie om weer te stoppen met luisteren
 */
function volgSyncStand(f) {
  _syncStandLuisteraars.push(f);
  return function () {
    var i = _syncStandLuisteraars.indexOf(f);
    if (i >= 0) _syncStandLuisteraars.splice(i, 1);
  };
}
/* Staat er nog iets klaar dat niet is verstuurd? Dat is precies wat je
   wilt weten voordat je je tablet in de tas doet. */
/** @returns {boolean} */
function ietsOpen() {
  var open = false;
  Object.keys(_syncStaat).forEach(function (k) {
    if (_syncStaat[k] && _syncStaat[k].schoon === false) open = true;
  });
  return open;
}
/** @returns {boolean} */
function kanSynchroniseren() {
  return !!(serverAan() && ingelogd() && clubIdNu());
}
/* Straks, als het even stil is. Elke nieuwe wijziging schuift het
   moment op, zodat er één keer wordt verstuurd in plaats van tien. */
/** @param {number} [vertraging]  ms; standaard SYNC_WACHT_MS @returns {void} */
function syncStraks(vertraging) {
  if (!_syncVanzelfAan || !kanSynchroniseren()) return;
  if (_syncStraksTimer) { clearTimeout(_syncStraksTimer); _syncStraksTimer = null; }
  /* "mislukt" laten staan: dat zegt meer dan "open". Wie geen bereik
     heeft moet dat blijven zien tot het gelukt is, en niet elke paar
     tellen een geruststellender lampje krijgen dan waar is. */
  if (_syncStand !== "mislukt") zetSyncStand("open");
  _syncStraksTimer = setTimeout(function () {
    _syncStraksTimer = null;
    syncStil();
  }, vertraging === undefined ? SYNC_WACHT_MS : vertraging);
}
/* Uitwisselen zonder er iets over te zeggen. Mislukt het, dan gaat de
   app het vanzelf nog eens proberen; daar hoeft niemand iets van te
   merken en al helemaal geen rode balk voor te zien. */
/** @returns {Promise<ServerUitkomst|null>} */
function syncStil() {
  if (!_syncVanzelfAan || !kanSynchroniseren()) return Promise.resolve(null);
  if (_syncBezig) { syncStraks(1500); return Promise.resolve(null); }
  zetSyncStand("bezig");
  return synchroniseer().then(function (r) {
    if (r && r.ok) {
      _syncOpnieuwNa = SYNC_OPNIEUW_MS;
      /* Kwam er iets van een ander apparaat binnen? Dan moet het scherm
         dat weten — maar niet zelf verspringen. Wie langs de lijn een
         uitslag invult, wil niet dat de app onder zijn vingers opnieuw
         opbouwt. Er komt een balkje, en hij drukt zelf. */
      if (r.gegevens && (r.gegevens.gehaald || r.gegevens.samengevoegd)) _syncBinnen++;
      zetSyncStand(ietsOpen() ? "open" : "rustig");
      return r;
    }
    /* Niet gelukt: nog eens proberen, en elke keer wat rustiger aan */
    zetSyncStand("mislukt");
    syncStraks(_syncOpnieuwNa);
    _syncOpnieuwNa = Math.min(_syncOpnieuwNa * 2, SYNC_OPNIEUW_MAX);
    return r;
  });
}
/* Meteen, zonder wachten. Voor het moment waarop je de app wegklikt. */
/** @returns {Promise<ServerUitkomst|null>} */
function syncNu() {
  if (_syncStraksTimer) { clearTimeout(_syncStraksTimer); _syncStraksTimer = null; }
  return syncStil();
}
/** @returns {void} */
function syncLuisterMee() {
  if (typeof window === "undefined" || !window.addEventListener) return;
  /* Weggeklikt of van app gewisseld: nú versturen. Dit is het moment
     waarop iemand zijn tablet dichtklapt en zijn laptop openslaat. */
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") { if (ietsOpen()) syncNu(); }
      else syncStraks(1000);
    });
  }
  window.addEventListener("online", function () {
    _syncOpnieuwNa = SYNC_OPNIEUW_MS;
    syncStraks(500);
  });
  window.addEventListener("pagehide", function () { if (ietsOpen()) syncNu(); });
}

/** @typedef {Object} ServerRij  één regel uit de tabellen "gegevens" of "persoonlijk"
 * @property {string} sleutel
 * @property {any} waarde
 * @property {string} bijgewerkt_op
 * @property {string} [apparaat]
 */
/** @typedef {"niets"|"duw"|"haal"|"samen"} SyncBesluit */

/* Wat er moet gebeuren met één soort gegevens.
     duw    wij hebben iets nieuws, de server niet
     haal   de server heeft iets nieuws, wij niet
     samen  allebei iets, en die moeten bij elkaar
     niets  gelijk, of aan geen van beide kanten iets */
/**
 * @param {(SyncStaat & {heeftLokaal?:boolean})|null} staat
 * @param {ServerRij|null} server
 * @param {string} ditApparaat
 * @returns {SyncBesluit}
 */
function syncBesluit(staat, server, ditApparaat) {
  var schoon = !staat || staat.schoon !== false;
  var gezien = staat ? staat.gezien : null;
  /* Staat er niets op de server, dan gaat het omhoog — ook als er
     sinds de laatste keer niets is veranderd. Anders zou een apparaat
     dat al een heel seizoen aan gegevens heeft maar er vandaag pas een
     account bij krijgt, niets versturen. */
  if (!server) return (staat && staat.heeftLokaal === false) ? "niets" : "duw";
  var serverNieuw = server.bijgewerkt_op !== gezien;
  /* Was die serverwijziging van onszelf — een ander tabblad, of een
     verzoek dat we net zelf verstuurden — dan is het geen botsing. */
  if (serverNieuw && server.apparaat && server.apparaat === ditApparaat)
    return schoon ? "haal" : "duw";
  if (schoon) return serverNieuw ? "haal" : "niets";
  return serverNieuw ? "samen" : "duw";
}

/* Twee lijsten samenvoegen op id. Alles wat aan één kant bestaat komt
   erin; wat aan beide kanten bestaat wordt genomen van de kant die
   het laatst is bijgewerkt. De volgorde volgt die van de winnende
   kant, met wat de ander extra had erachteraan — anders springt een
   opstelling ineens door elkaar. */
/* Welke van twee versies van hetzelfde record houden we?

   Het stempel beslist, en dat is het hele punt van deze verbouwing.
   Vroeger won de kant die zei dat hij iets had veranderd, en dat was
   ook de kant die alleen maar een scherm had geopend.

   Heeft één kant een stempel en de andere niet, dan is die ene kant
   aantoonbaar aangeraakt sinds we stempels bijhouden, en die wint.
   Heeft geen van beide er een — oude gegevens van vóór vandaag — dan
   valt hij terug op wie er volgens zijn eigen boekhouding aan het werk
   was. Dat is de oude regel, en die geldt alleen nog daar. */
/**
 * @param {any} mijn
 * @param {any} hun
 * @param {boolean} mijnWint  wie er wint als geen van beide een stempel heeft
 * @returns {any} mijn of hun, welke er ook wint
 */
function nieuwsteVan(mijn, hun, mijnWint) {
  var a = mijn && mijn[STEMPEL];
  var b = hun && hun[STEMPEL];
  if (a && b) return (a === b) ? (mijnWint ? mijn : hun) : (a > b ? mijn : hun);
  if (a) return mijn;
  if (b) return hun;
  return mijnWint ? mijn : hun;
}
/**
 * @param {any} mijn
 * @param {any} hun
 * @param {boolean} mijnWint
 * @returns {{lijst:any[], erbij:number, overschreven:number}}
 */
function voegLijstenSamen(mijn, hun, mijnWint) {
  var a = Array.isArray(mijn) ? mijn : [];
  var b = Array.isArray(hun) ? hun : [];
  var eerst = mijnWint ? a : b;
  var tweede = mijnWint ? b : a;
  /* De tegenhanger van elk record opzoeken, zodat we per stuk kunnen
     kiezen in plaats van per lijst. */
  /** @type {Object<string, any>} */
  var anders = {};
  tweede.forEach(function (r) {
    if (r && typeof r === "object" && r.id !== undefined && r.id !== null) anders[r.id] = r;
  });
  /** @type {Object<string, boolean>} */
  var gezien = {};
  /** @type {any[]} */
  var uit = [];
  var erbij = 0;
  var overschreven = 0;
  eerst.forEach(function (r) {
    var id = r && r.id;
    if (id === undefined || id === null) { uit.push(r); return; }
    if (gezien[id]) return;
    gezien[id] = true;
    var tegen = anders[id];
    if (tegen === undefined) { uit.push(r); return; }
    var keuze = nieuwsteVan(mijnWint ? r : tegen, mijnWint ? tegen : r, mijnWint);
    if (keuze !== r) overschreven++;
    uit.push(keuze);
  });
  tweede.forEach(function (r) {
    var id = r && r.id;
    if (id === undefined || id === null) return;   /* zonder id niet te matchen */
    if (gezien[id]) return;
    gezien[id] = true;
    uit.push(r);
    erbij++;
  });
  return {lijst: uit, erbij: erbij, overschreven: overschreven};
}
/* Samenvoegen van wat er ook maar staat. Alleen lijsten met id's
   kunnen echt worden samengevoegd; van al het andere wint de
   nieuwste, en dan hoort de gebruiker dat te weten. */
/**
 * @param {any} mijn
 * @param {any} hun
 * @param {boolean} mijnWint
 * @returns {{waarde:any, samengevoegd:boolean, erbij:number, overschreven:number}}
 */
function voegSamen(mijn, hun, mijnWint) {
  if (Array.isArray(mijn) && Array.isArray(hun)) {
    var r = voegLijstenSamen(mijn, hun, mijnWint);
    return {waarde: r.lijst, samengevoegd: true, erbij: r.erbij, overschreven: r.overschreven};
  }
  return {waarde: mijnWint ? mijn : hun, samengevoegd: false, erbij: 0, overschreven: 0};
}

/* ── Het uitwisselen zelf ────────────────────────────────────
   Vier rondes: de club, de teams, de gegevens per team, en wat van
   jou persoonlijk is. In die volgorde, want zonder club geen teams
   en zonder teams geen gegevens. */
const CLUB_KEY = "tt_club_v1";
const SYNC_LAATST_KEY = "tt_synclaatst_v1";

/** @returns {string|null} */
function clubIdNu() { try { return localStorage.getItem(CLUB_KEY) || null; } catch(e) { return null; } }
/** @param {string|null} [id] @returns {string|null|undefined} ongewijzigd teruggegeven, geen enkele aanroeper gebruikt dit */
function zetClubId(id) {
  try { if (id) localStorage.setItem(CLUB_KEY, id); else localStorage.removeItem(CLUB_KEY); } catch(e) {}
  return id;
}
/** @returns {string|null} */
function laatstGesynct() {
  try { return localStorage.getItem(SYNC_LAATST_KEY) || null; } catch(e) { return null; }
}
/** @param {string} t @returns {void} */
function zetLaatstGesynct(t) { try { localStorage.setItem(SYNC_LAATST_KEY, t); } catch(e) {} }

/* Welke sleutels hangen er onder dit team op dit apparaat? */
/** @param {string} id @returns {string[]} */
function teamSleutelsVan(id) {
  var voor = "tt_" + id + "__";
  /** @type {string[]} */
  var uit = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(voor) === 0) uit.push(k.slice(voor.length));
    }
  } catch(e) {}
  return uit;
}
/* Wat er persoonlijk wordt uitgewisseld. De teamlijst gaat niet mee —
   die staat in zijn eigen tabel — en het pakket ook niet, want dat
   komt juist van de server. */
/** @returns {string[]} */
function persoonlijkeSleutels() {
  return GEDEELDE_SLEUTELS.filter(function (k) {
    return k !== TEAMS_KEY && k !== ACTIEF_KEY && k !== LICENTIE_KEY;
  });
}

/** @param {string} volle @returns {any} */
function _lees(volle) {
  try { var r = localStorage.getItem(volle); return r === null ? null : JSON.parse(r); }
  catch(e) { return null; }
}
/** @param {string} volle @param {any} waarde @returns {void} */
function _schrijf(volle, waarde) {
  try { localStorage.setItem(volle, JSON.stringify(waarde)); } catch(e) {}
}

/* ── Het vangnet ─────────────────────────────────────────────
   Alles hierboven is bedoeld om te voorkomen dat er iets verdwijnt.
   Maar "bedoeld om" is niet hetzelfde als "kan niet gebeuren", en dat
   verschil kostte op 5 september een middag werk.

   Dus bewaart de app wat het uitwisselen overschrijft. Niet eeuwig en
   niet alles: de laatste twintig keer dat een synchronisatie iets
   verving door iets anders, met wat er stond. Genoeg om te zeggen
   "zet die wedstrijd terug" en klaar te zijn.

   Dit blijft op dit apparaat. Het gaat niet mee omhoog: een vangnet
   dat over dezelfde lijn loopt als datgene waar het voor vangt, is
   geen vangnet. ────────────────────────────────────────────────── */
const TERUG_KEY = "tt_terug_v1";
const TERUG_MAX = 20;
const TERUG_DAGEN = 21;

/** @typedef {Object} TerugRegel
 * @property {string} id
 * @property {string} tijd     ISO-tijdstip
 * @property {string} sleutel  de volle sleutel die werd overschreven
 * @property {string} reden
 * @property {any} waarde      wat er stond vóór het overschrijven
 */

/** @returns {TerugRegel[]} */
function terugLijst() {
  try {
    var r = localStorage.getItem(TERUG_KEY);
    var l = r ? JSON.parse(r) : [];
    return Array.isArray(l) ? l : [];
  } catch(e) { return []; }
}
/** @param {TerugRegel[]} lijst @returns {void} */
function _schrijfTerug(lijst) {
  try { localStorage.setItem(TERUG_KEY, JSON.stringify(lijst)); }
  catch(e) {
    /* Vol. Dan liever de helft bewaren dan niets: het vangnet mag
       nooit de reden zijn dat er iets anders niet meer past. */
    if (lijst.length > 2) _schrijfTerug(lijst.slice(0, Math.floor(lijst.length / 2)));
  }
}
/**
 * @param {string} volle
 * @param {any} oud       de waarde vóór het overschrijven; null/undefined slaat niets op
 * @param {string} [reden]
 * @returns {string|null} het id van de nieuwe vangnetregel, of null als er niets te bewaren viel
 */
function bewaarVoorTerug(volle, oud, reden) {
  if (oud === null || oud === undefined) return null;
  var nu = Date.now();
  /** @type {TerugRegel} */
  var regel = {
    id: "t" + nu + "-" + Math.random().toString(36).slice(2, 7),
    tijd: new Date(nu).toISOString(),
    sleutel: volle,
    reden: reden || "vervangen",
    waarde: oud
  };
  var grens = nu - TERUG_DAGEN * 86400000;
  var lijst = [regel].concat(terugLijst().filter(function (r) {
    return new Date(r.tijd).getTime() > grens;
  })).slice(0, TERUG_MAX);
  _schrijfTerug(lijst);
  return regel.id;
}
/* Terugzetten is zelf ook een wijziging: wat je terughaalt moet naar
   de server, anders komt het bij de volgende ronde weer weg. En wat je
   daarmee overschrijft gaat óók in het vangnet — je kunt je vergissen
   in welke versie je wilde. */
/** @param {string} id  id van een TerugRegel @returns {boolean} */
function zetTerug(id) {
  var regel = terugLijst().filter(function (r) { return r.id === id; })[0];
  if (!regel) return false;
  bewaarVoorTerug(regel.sleutel, _lees(regel.sleutel), "voor het terugzetten");
  _schrijf(regel.sleutel, regel.waarde);
  if (typeof meldWijziging === "function") meldWijziging(regel.sleutel);
  return true;
}
/** @returns {void} */
function wisTerug() { try { localStorage.removeItem(TERUG_KEY); } catch(e) {} }
/* Van "tt_abc123__fch_wedstrijden_v1" naar iets waar een mens iets aan
   heeft. */
/** @type {Object<string,string>} */
const TERUG_NAMEN = {
  "fch_wedstrijden_v1": "Wedstrijden", "fch_spelers_v1": "Spelers",
  "fch_trainingen_v1": "Trainingen", "fch_events_v1": "Agenda",
  "fch_afwezigheden_v1": "Blessures en afwezigheid",
  "fch_boetes_v1": "Boetepot", "fch_reviews_v1": "Beoordelingen",
  "fch_doelen_v1": "Doelen", "fch_oefeningen_v1": "Oefeningen",
  "fch_instellingen_v1": "Instellingen", "fch_tenue_v1": "Tenues",
  "fch_sportpark_v1": "Sportpark", "fch_formaties_v1": "Formaties",
  "fch_taken_v1": "Taken", "fch_activiteiten_v1": "Activiteiten"
};
/** @param {string} volle @returns {string} leesbare naam, bijv. "Wedstrijden" */
function terugNaam(volle) {
  var kaal = basisUitSleutel(String(volle || "").replace(/^tt_[^_]+__/, ""));
  return TERUG_NAMEN[kaal] || kaal.replace(/^fch_|_v1$/g, "").replace(/_/g, " ");
}
/* Uit welk seizoen kwam dit? In het vangnet kan iets van vorig jaar
   staan, en dan wil je dat zien voordat je het terugzet. */
/** @param {string} volle @returns {string|null} */
function terugSeizoen(volle) {
  var s = seizoenUitSleutel(String(volle || "").replace(/^tt_[^_]+__/, ""));
  return s ? seizoenLabel(s) : null;
}
/** @param {string} volle @returns {string|null} de naam van het team waar deze sleutel bij hoort */
function terugTeam(volle) {
  var m = String(volle || "").match(/^tt_([^_]+)__/);
  if (!m) return null;
  /* Eigen const nodig zodat tsc de "m is niet null"-controle hierboven
     meeneemt in de geneste .filter-functie (zelfde truc als eerder in
     dit bestand en in server.js). */
  const gevonden = m;
  var t = teams().filter(function (x) { return x.id === gevonden[1]; })[0];
  return t ? t.naam : null;
}
/* Hoeveel er in zat. Een lijst van twaalf spelers terugzetten is iets
   anders dan een lege lijst terugzetten, en dat wil je zien. */
/** @param {any} waarde @returns {number|null} */
function terugOmvang(waarde) {
  if (Array.isArray(waarde)) return waarde.length;
  if (waarde && typeof waarde === "object") return Object.keys(waarde).length;
  return null;
}

/* De teams gelijktrekken. Teams die hier bestaan gaan omhoog, teams
   die alleen op de server staan komen erbij. Een team dat op de
   server als verwijderd is gemarkeerd verdwijnt ook hier. */
/* Eerst de verwijderingen, dan pas de rest. Andersom zou het team dat
   je net hebt weggegooid opnieuw omhoog gaan voordat de server hoort
   dat het weg moest.

   Het team blijft als regel bestaan, met een datum erbij. Dat is geen
   halfslachtigheid maar noodzaak: verdween de regel echt, dan zou een
   tweede apparaat dat het team nog wél heeft hem morgen doodleuk
   opnieuw aanmaken. Nu ziet dat apparaat de datum en gooit het ook weg.

   De gegevens gaan wél echt weg. Daar zit het gewicht, en niemand kan
   er nog bij.

   Dezelfde PostgREST-eigenaardigheid als bij hefClubOp() in
   src/app.jsx: een door RLS tegengehouden PATCH is geen fout. Hij
   raakt nul rijen en meldt gewoon 2xx — "gelukt, niets te melden".
   Voor een trainer die geen eigenaar is, of bij een policy die er
   (nog) niet is, is dat precies wat hier terugkomt. Kijken naar r.ok
   alleen is dus niet genoeg; daarom vragen we de geraakte rij terug
   (return=representation) en geldt een lege lijst als MISLUKT.

   Anders dan bij duwSeizoenenWeg() hieronder is nul rijen hier
   ondubbelzinnig een weigering. Dat een team op de server bestaat is
   de voorwaarde om het daar te kunnen markeren: staat de rij er niet,
   dan is er van dit team ook nooit iets omhoog gegaan en had die
   grafsteen hier helemaal niets te zoeken. Nul rijen betekent hier dus
   altijd "iemand hield dit tegen". */
/** @returns {Promise<{ok:boolean}>} */
function duwTeamsWeg() {
  var lijst = teamsWeg();
  if (!lijst.length) return Promise.resolve({ok:true});
  return opEenRij(lijst, function (graf) {
    var pad = "/rest/v1/teams?id=eq." + encodeURIComponent(graf.id);
    return serverVraag(pad, {methode:"PATCH",
        lichaam:{verwijderd_op: graf.op || new Date().toISOString()},
        koppen:{"Prefer":"return=representation"}})
      .then(function (r) {
        /* Alleen bij een echte storing blijft de grafsteen staan, voor
           de volgende sync-poging. */
        if (!r.ok) return;
        /* En net zo goed bij een stille weigering. Zonder grafsteen is
           er niets meer dat het ooit nog eens probeert: het team blijft
           dan stil op de server staan terwijl deze app denkt dat het
           weg is. Liever elke sync opnieuw proberen dan dat verschil. */
        var geraakt = Array.isArray(r.gegevens) ? r.gegevens : [];
        if (!geraakt.length) return;
        return serverVraag("/rest/v1/gegevens?team_id=eq." + encodeURIComponent(graf.id),
                           {methode:"DELETE", koppen:{"Prefer":"return=minimal"}})
          .then(function (d) {
            /* Pas als ook de gegevens echt weg zijn mag de grafsteen
               weg. Mislukt deze DELETE (bereik weg, storing), dan zou
               het vergeten van de grafsteen de gegevens van een
               weggegooid team voorgoed op de server achterlaten —
               onzichtbaar voor iedereen, en zonder dat er nog iets is
               dat ze opruimt. Hier telt alleen d.ok: een lege lijst
               betekent bij deze DELETE niet "geweigerd" maar kan net zo
               goed "er stond al niets" zijn (zelfde afweging als bij
               duwSeizoenenWeg hieronder), en met return=minimal komt er
               sowieso geen lijst terug. */
            if (d && d.ok) vergeetTeamWeg(graf.id);
          });
      });
  }).then(function () { return {ok:true}; });
}

/* Het seizoen-equivalent van duwTeamsWeg() hierboven, maar per team in
   plaats van globaal: een seizoen-grafsteen hoort altijd bij precies
   één team (zie SEIZOENENWEG_KEY in src/kern/sleutels.js), dus is er
   ook niets globaals aan het wegduwen ervan.

   Anders dan bij een team bestaat er voor een seizoen geen aparte
   servertabel om een "verwijderd_op" op te zetten — het seizoen zit
   letterlijk in de sleutel van elke rij in "gegevens" (het deel vóór
   de "::"). Wegduwen is dus meteen de echte verwijdering: alle rijen
   van dit team wier sleutel met dit seizoen begint.

   Zelfde PostgREST-eigenaardigheid als bij hefClubOp() in src/app.jsx:
   een door RLS geblokkeerde DELETE geeft ook een 2xx terug, met een
   lege array. Het verschil met hefClubOp() is wat een lege array daar
   betekent. Bij het opheffen van een club is vooraf zeker dat er íéts
   moet staan (de club zelf) — een lege array is daar dus altijd een
   weigering. Hier is dat niet zeker: een seizoen kan hier ook zijn
   weggegooid zonder dat er ooit een rij van naar de server ging (geen
   bereik gehad, of nooit gesynchroniseerd). Nul geraakte rijen is dan
   gewoon "er stond toch al niets" en geen weigering. Daarom mag de
   grafsteen hier al bij elk ok-antwoord weg, ongeacht het aantal — een
   telling zou hier niets kunnen onderscheiden dat de moeite waard is.
   Alleen bij !r.ok (een echte storing) blijft de grafsteen staan, voor
   de volgende sync-poging. */
/** @param {string} teamId @returns {Promise<{ok:boolean}>} */
function duwSeizoenenWeg(teamId) {
  var lijst = seizoenenWeg().filter(function (g) { return g.teamId === teamId; });
  if (!lijst.length) return Promise.resolve({ok:true});
  return opEenRij(lijst, function (graf) {
    var pad = "/rest/v1/gegevens?team_id=eq." + encodeURIComponent(teamId)
             + "&sleutel=like." + encodeURIComponent(graf.seizoen) + "::*";
    return serverVraag(pad, {methode:"DELETE", koppen:{"Prefer":"return=representation"}})
      .then(function (r) {
        if (r.ok) vergeetSeizoenWeg(teamId, graf.seizoen);
      });
  }).then(function () { return {ok:true}; });
}

/* Welke teams horen er te zijn?

   Drie lijsten komen samen: wat dit apparaat heeft, wat de server
   heeft, en wat hier is weggegooid. Er staat verder geen enkele
   verbinding in — dat is de bedoeling, want dit is het stuk waar het
   fout ging en dat je alleen kunt narekenen als het op zichzelf staat.

   heeftGegevens vertelt of een team hier meer is dan een naam. Dat
   maakt het verschil tussen het lege team dat de app bij installeren
   aanmaakt (weg ermee) en een team dat je zelf hebt gevuld terwijl de
   server nog van niets weet (blijven staan). */
/** @typedef {Object} ServerTeam
 * @property {string} id
 * @property {string} naam
 * @property {string|null} [verwijderd_op]
 */
/**
 * @param {Team[]} [lokaal]
 * @param {ServerTeam[]} [vanServer]
 * @param {string[]} [hierWeg]
 * @param {(id: string) => boolean} [heeftGegevens]
 * @returns {{lijst: Team[], erbij: number}}
 */
function teamlijstSamen(lokaal, vanServer, hierWeg, heeftGegevens) {
  lokaal    = lokaal || [];
  vanServer = vanServer || [];
  hierWeg   = hierWeg || [];
  heeftGegevens = heeftGegevens || function () { return true; };

  var levend = vanServer.filter(function (t) {
    return !t.verwijderd_op && hierWeg.indexOf(t.id) < 0;
  });
  var dood = vanServer.filter(function (t) { return !!t.verwijderd_op; })
    .map(function (t) { return t.id; })
    .concat(hierWeg);

  var lijst = lokaal.slice();
  /* Een net geïnstalleerd apparaat maakt vanzelf een leeg team aan.
     Logt daarna iemand in die al teams heeft, dan is dat lege team een
     overblijfsel en geen elftal. Weg ermee — maar alleen als het echt
     leeg is en de server wél iets heeft, anders gooi je het eerste
     team van een nieuwe gebruiker weg. */
  if (levend.length) {
    lijst = lijst.filter(function (t) {
      return levend.some(function (s) { return s.id === t.id; }) || heeftGegevens(t.id);
    });
  }
  lijst = lijst.filter(function (t) { return dood.indexOf(t.id) < 0; });

  var erbij = 0;
  levend.forEach(function (t) {
    if (lijst.some(function (m) { return m.id === t.id; })) return;
    lijst = lijst.concat([{id:t.id, naam:t.naam, gemaakt:new Date().toISOString()}]);
    erbij++;
  });
  return {lijst: lijst, erbij: erbij};
}

/** @param {string} clubId @returns {Promise<ServerUitkomst>} */
function syncTeams(clubId) {
  /* Eerst kijken wat er al staat, en pas daarna versturen. Andersom
     zou het lege team dat bij het installeren wordt aangemaakt als
     eerste omhoog gaan, en daarna niet meer weg te krijgen zijn. */
  return duwTeamsWeg().then(function () {
  return serverVraag("/rest/v1/teams?select=id,naam,verwijderd_op&club_id=eq." + clubId)
    .then(function (r) {
      if (!r.ok) return r;
      var samen = teamlijstSamen(
        teams(),
        Array.isArray(r.gegevens) ? r.gegevens : [],
        teamsWeg().map(function (g) { return g.id; }),
        function (id) {
          return teamSleutelsVan(id).some(function (s) {
            return basisUitSleutel(s) !== TEAMINST_KEY;
          });
        });
      var lijst = samen.lijst, erbij = samen.erbij;
      if (erbij || lijst.length !== teams().length) slaTeamsOp(lijst);

      var omhoog = lijst.map(function (t) {
        return {id: t.id, club_id: clubId, naam: t.naam};
      });
      if (!omhoog.length) return {ok:true, gegevens:{erbij:erbij}};
      return serverVraag("/rest/v1/teams", {methode:"POST", lichaam: omhoog,
          koppen:{"Prefer":"resolution=merge-duplicates,return=minimal"}})
        .then(function (d) {
          return d.ok ? {ok:true, gegevens:{erbij:erbij}} : d;
        });
    });
  });
}

/** @typedef {Object} SyncUitslag
 * @property {number} geduwd
 * @property {number} gehaald
 * @property {number} samengevoegd
 * @property {{sleutel:string, samengevoegd:boolean, erbij:number}[]} botsingen
 * @property {string[]} fouten
 */

/* Eén soort gegevens van één team of van jou persoonlijk. Alles wat
   hier gebeurt volgt uit syncBesluit; deze functie voert alleen uit.
   Dat scheelt: het denkwerk staat op één plek en is los te testen. */
/**
 * @param {string} tabel          "gegevens" of "persoonlijk"
 * @param {Object<string,string>} waar  vaste velden voor de rij (team_id of gebruiker_id)
 * @param {string} volle          de volle (met team/seizoen voorvoegde) sleutel
 * @param {string} sleutel        de sleutel zoals de server hem kent (zonder team-voorvoegsel)
 * @param {ServerRij|null} server
 * @param {SyncUitslag} uitslag   wordt hier bijgewerkt
 * @returns {Promise<void>}
 */
function syncEen(tabel, waar, volle, sleutel, server, uitslag) {
  var staat = syncStaat(volle);
  var mijn = _lees(volle);
  var besluit = syncBesluit(
    Object.assign({}, staat, {heeftLokaal: mijn !== null}), server, apparaatId());

  /* Kijk je alleen mee, dan gaat er niets omhoog.

     De database zou het toch tegenhouden — daar staat het echte slot —
     maar dan zou de app het elke keer opnieuw proberen en elke keer een
     fout terugkrijgen. Dat levert een rood lampje op bij iemand die
     niets verkeerd doet. Hij haalt op wat er is, en dat is het. */
  if (typeof alleenKijken === "function" && alleenKijken()) {
    if (besluit !== "haal") return Promise.resolve();
  }

  /* Idem voor een Free-club, maar alleen op "gegevens": de server
     weigert daar sinds server/17-free-serverdata.sql (18 september
     2026) elke nieuwe of gewijzigde rij van een club die nog nooit
     heeft betaald ("Free komt helemaal niet op de server",
     docs/pakketten-besluit.md). Zonder deze afslag zou de app dat bij
     elke sync opnieuw proberen en telkens hetzelfde rode lampje geven
     voor iets dat geen fout is. "persoonlijk" blijft hier buiten: die
     tabel is niet aan een pakket gekoppeld (zie server/17, kop). */
  if (tabel === "gegevens" && typeof pakketNu === "function" && pakketNu().id === "free") {
    if (besluit !== "haal") return Promise.resolve();
  }

  if (besluit === "niets") return Promise.resolve();
  if (besluit === "haal") {
    if (!server) return Promise.resolve();
    /* Wat hier wordt vervangen gaat eerst in het vangnet. Meestal is
       dat overbodig — je haalt op wat je zelf net hebt verstuurd. Maar
       "meestal" is precies het woord waar dit vangnet voor bestaat. */
    if (mijn !== null && stabiel(mijn) !== stabiel(server.waarde))
      bewaarVoorTerug(volle, mijn, "opgehaald van de server");
    _schrijf(volle, server.waarde);
    zetSyncStaat(volle, {gezien: server.bijgewerkt_op, schoon: true});
    uitslag.gehaald++;
    return Promise.resolve();
  }

  var waarde = mijn;
  if (besluit === "samen") {
    /* syncBesluit() geeft "samen" per zijn eigen logica nooit terug
       zonder een server-rij (kijk naar de "if (!server) return..."
       vroeg in die functie) — maar tsc kan dat niet over de
       functiegrens heen navolgen. Dezelfde soort vangnet-regel als
       hierboven bij "haal", puur voor de typecontrole. */
    if (!server) return Promise.resolve();
    /* De nieuwste wint bij gelijke id's. Wij zijn nieuwer als we na
       de laatste uitwisseling nog iets hebben veranderd — en dat is
       precies wat "niet schoon" betekent. */
    var samen = voegSamen(mijn, server.waarde, true);
    waarde = samen.waarde;
    if (mijn !== null && stabiel(mijn) !== stabiel(waarde))
      bewaarVoorTerug(volle, mijn, "samengevoegd met een ander apparaat");
    _schrijf(volle, waarde);
    uitslag.samengevoegd++;
    uitslag.botsingen.push({
      sleutel: sleutel,
      samengevoegd: samen.samengevoegd,
      erbij: samen.erbij
    });
  }
  if (waarde === null) return Promise.resolve();

  var regel = Object.assign({}, waar, {sleutel: sleutel, waarde: waarde, apparaat: apparaatId()});
  return serverVraag("/rest/v1/" + tabel, {
    methode: "POST", lichaam: [regel],
    koppen: {"Prefer": "resolution=merge-duplicates,return=representation"}
  }).then(function (r) {
    if (!r.ok) { uitslag.fouten.push(sleutel); return; }
    var terug = Array.isArray(r.gegevens) ? r.gegevens[0] : r.gegevens;
    zetSyncStaat(volle, {gezien: terug ? terug.bijgewerkt_op : null, schoon: true});
    uitslag.geduwd++;
  });
}

/* Een aantal soorten achter elkaar in plaats van tegelijk. Twintig
   verzoeken tegelijk vanaf een telefoon met één streepje bereik
   levert twintig mislukkingen op; één voor één komt er wel doorheen. */
/**
 * @template T
 * @param {T[]} lijst
 * @param {(item: T) => Promise<any>} doe
 * @returns {Promise<void>}
 */
function opEenRij(lijst, doe) {
  return lijst.reduce(function (rij, item) {
    return rij.then(function () { return doe(item); });
  }, Promise.resolve());
}

/** @param {Team} team @param {SyncUitslag} uitslag @returns {Promise<ServerUitkomst>} */
function syncTeamGegevens(team, uitslag) {
  var voor = "tt_" + team.id + "__";
  /* Eerst de weggegooide seizoenen van dit team wegduwen — vóór de rest
     van deze functie zijn sleutellijst opbouwt, om dezelfde reden als
     duwTeamsWeg() vóór syncTeams() staat: anders gaat een sleutel die we
     net hebben weggegooid, mogelijk nog één keer mee omhoog of omlaag
     voordat de server ervan weet. Lukt het duwen niet (geen bereik),
     dan blijft de grafsteen staan en filtert de code hieronder de
     bijbehorende sleutels alsnog uit "alles" — zie de reden bij het
     filter verderop. */
  return duwSeizoenenWeg(team.id).then(function () {
  return serverVraag("/rest/v1/gegevens?select=sleutel,waarde,bijgewerkt_op,apparaat&team_id=eq." +
                     encodeURIComponent(team.id))
    .then(function (r) {
      if (!r.ok) return r;
      /** @type {Object<string,ServerRij>} */
      var opServer = {};
      (Array.isArray(r.gegevens) ? r.gegevens : []).forEach(function (g) { opServer[g.sleutel] = g; });
      /* Welke seizoenen van dit team staan nog als grafsteen open? Zulke
         sleutels horen niet in "alles": lokaal zijn ze al weg (wisSeizoen
         verwijderde ze meteen), en op de server staan ze hooguit nog omdat
         het wegduwen hierboven net is mislukt. Ze alsnog ophalen of duwen
         zou de verwijdering ongedaan maken zodra de sync wél weer lukt. */
      var wegSeizoenen = seizoenenWeg()
        .filter(function (g) { return g.teamId === team.id; })
        .map(function (g) { return g.seizoen; });
      /** @param {string} s @returns {boolean} */
      function bijWeggegooidSeizoen(s) {
        var sz = seizoenUitSleutel(s);
        return sz !== null && wegSeizoenen.indexOf(sz) >= 0;
      }
      /* Alles wat hier staat plus alles wat daar staat: anders mist
         een nieuw apparaat precies datgene wat het nog niet heeft. */
      /* Sleutels zonder :: komen van vóór de seizoenen. Ze staan nog op de
         server omdat de verhuizing ze alleen op het apparaat opruimde, en
         omdat er voor gegevens geen grafsteen bestaat zoals voor teams.
         Haalden we ze op, dan zette de verhuizing ze bij de volgende
         lading in het dan actieve seizoen — en zo vulde elk nieuw seizoen
         zich met de inhoud van vóór de verhuizing.

         Hier houdt die kringloop op. Er wordt niets weggegooid: de rij
         blijft gewoon op de server staan. Hij wordt alleen niet meer
         opgehaald en niet meer geduwd. */
      var alles = teamSleutelsVan(team.id).filter(heeftLaag).filter(function (s) {
        return !bijWeggegooidSeizoen(s);
      });
      Object.keys(opServer).forEach(function (s) {
        if (heeftLaag(s) && alles.indexOf(s) < 0 && !bijWeggegooidSeizoen(s)) alles.push(s);
      });
      return opEenRij(alles, function (sleutel) {
        return syncEen("gegevens", {team_id: team.id}, voor + sleutel,
                       sleutel, opServer[sleutel] || null, uitslag);
      }).then(function () { return {ok:true}; });
    });
  });
}

/** @param {SyncUitslag} uitslag @returns {Promise<ServerUitkomst>} */
function syncPersoonlijk(uitslag) {
  var gebruiker = gebruikerNu();
  var uid = gebruiker && gebruiker.id;
  if (!uid) return Promise.resolve({ok:true});
  /* Eigen const nodig zodat tsc de "uid is niet leeg"-controle
     hierboven meeneemt in de geneste opEenRij-functie verderop
     (zelfde truc als eerder in dit bestand). */
  const gebruikerId = uid;
  return serverVraag("/rest/v1/persoonlijk?select=sleutel,waarde,bijgewerkt_op,apparaat")
    .then(function (r) {
      if (!r.ok) return r;
      /** @type {Object<string,ServerRij>} */
      var opServer = {};
      (Array.isArray(r.gegevens) ? r.gegevens : []).forEach(function (g) { opServer[g.sleutel] = g; });
      var alles = persoonlijkeSleutels().slice();
      Object.keys(opServer).forEach(function (s) { if (alles.indexOf(s) < 0) alles.push(s); });
      return opEenRij(alles, function (sleutel) {
        return syncEen("persoonlijk", {gebruiker_id: gebruikerId}, sleutel,
                       sleutel, opServer[sleutel] || null, uitslag);
      }).then(function () { return {ok:true}; });
    });
}

/* Tot wanneer het huidige abonnement loopt, zoals de server het laatst
   zei. Alleen om te tónen ("loopt tot 3 maart 2027") in het
   abonnementsblok bij Instellingen — er hangt geen enkel recht aan.
   Wat iemand mag blijft hangen aan het pakket, en dat bepaalt de
   database (06-pakketten.sql), niet deze datum op dit apparaat.

   Waarom een eigen sleutel en niet bij LICENTIE_KEY erin: zetPakket()
   schrijft dat vakje helemaal opnieuw ({pakket:...}) en staat op drie
   plekken buiten dit bestand. Een tweede veld erin zou bij elke
   aanroep daarvan stilletjes verdwijnen, en een datum die soms wel en
   soms niet verdwijnt is erger dan geen datum. */
const ABO_TOT_KEY = "tt_abo_tot_v1";
/** @returns {string|null} de einddatum (jjjj-mm-dd) of null als die onbekend is */
function abonnementTot() {
  try { return localStorage.getItem(ABO_TOT_KEY) || null; } catch(e) { return null; }
}
/** @param {string|null} [d] @returns {void} */
function zetAbonnementTot(d) {
  try { if (d) localStorage.setItem(ABO_TOT_KEY, String(d)); else localStorage.removeItem(ABO_TOT_KEY); } catch(e) {}
}

/* Het pakket komt van de server en nergens anders vandaan. In de
   browser is elk slot te openen; in de database niet. */
/** @param {string} clubId @returns {Promise<ServerUitkomst>} */
function syncPakket(clubId) {
  return serverVraag("/rest/v1/abonnementen?select=pakket,geldig_tot&club_id=eq." + clubId)
    .then(function (r) {
      if (!r.ok) return r;
      var rij = Array.isArray(r.gegevens) ? r.gegevens[0] : null;
      if (rij && rij.pakket) zetPakket(rij.pakket);
      /* Ook als er géén rij is, of een rij zonder einddatum: dan hoort
         de datum van gisteren weg. Een "loopt tot" laten staan bij een
         abonnement dat er niet meer is, is een belofte doen namens een
         server die niets beloofd heeft. */
      zetAbonnementTot(rij ? rij.geldig_tot : null);
      return {ok:true};
    });
}

var _syncBezig = false;
/** @returns {Promise<ServerUitkomst>} */
function synchroniseer() {
  if (!serverAan()) return Promise.resolve(serverFout("geen-server", "Er is nog geen server ingesteld."));
  if (!ingelogd()) return Promise.resolve(serverFout("aanmelding", "Je bent niet ingelogd."));
  if (_syncBezig) return Promise.resolve(serverFout("bezig", "Er wordt al gesynchroniseerd."));
  _syncBezig = true;

  /** @type {SyncUitslag} */
  var uitslag = {geduwd:0, gehaald:0, samengevoegd:0, botsingen:[], fouten:[]};
  return zorgVoorClub()
    .then(function (r) {
      if (!r.ok) throw r;
      var clubId = r.gegevens;
      /* Nog geen club? Dan valt er niets uit te wisselen. De app
         stuurt je dan naar het scherm waar je er een aanmaakt. */
      if (!clubId) { _syncBezig = false; throw serverFout("geen-club",
        "Je hoort nog niet bij een vereniging. Maak er eerst een aan."); }
      return haalClubGegevens().then(function () {
      return syncTeams(clubId).then(function (t) {
        if (!t.ok) throw t;
        return opEenRij(teams(), function (team) { return syncTeamGegevens(team, uitslag); });
      }).then(function () {
        return syncPersoonlijk(uitslag);
      }).then(function () {
        return syncPakket(clubId);
      });
      });
    })
    .then(function () {
      _syncBezig = false;
      zetLaatstGesynct(new Date().toISOString());
      /* De instellingen kunnen van de server zijn gekomen */
      herlaadInstellingen();
      return {ok:true, gegevens:uitslag};
    })
    .catch(function (fout) {
      _syncBezig = false;
      if (fout && fout.fout) return fout;
      /* Een echte programmeerfout hoort niet als "onbekend" af te
         gaan: dan zoek je eindeloos in de verkeerde hoek. */
      var tekst = (fout && (fout.message || fout.tekst)) || "onbekende oorzaak";
      return serverFout("onbekend", "Het synchroniseren liep vast: " + tekst);
    });
}

