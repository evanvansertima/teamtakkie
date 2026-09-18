// @ts-check
/* ══════════════════════════════════════════════════════════════
   KERN: sleutels, seizoenen, teams
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 16 september 2026 (P2,
   stap 1 van docs/professionaliseringsplan.md). Geen import/export:
   tools/bouw.js plakt dit bestand vóór de rest van de app aan elkaar
   (zie de vaste volgorde in tools/bouw.js), dus alles hieronder is
   nog altijd gewoon top-level function/const in dezelfde scope als
   src/app.jsx. Er verandert dus functioneel niets — dit is een
   verhuizing, geen herschrijving.

   Wat hier staat, en waarom het bij elkaar hoort:
     - de opslagsleutels (welke localStorage-sleutel bij welk team
       en seizoen hoort — sleutelVoor() is de enige plek die dat
       bepaalt);
     - de seizoenlogica (welk seizoen bij een datum hoort, en de
       eenmalige gegevensverhuizing van vóór-seizoenen naar de
       laag-per-seizoen-sleutels);
     - de teamlijst zelf (aanmaken, hernoemen, verwijderen, wisselen).

   Wat hier NIET staat, met opzet: het pakket-blok (PAKKETTEN,
   magPagina, enzovoort) en het club-blok (zorgVoorClub, hefClubOp,
   enzovoort) blijven in src/app.jsx staan. Beide raken dit bestand
   inhoudelijk, maar zijn niet meeverplaatst — dat is een bewust
   genomen beslissing, geen vergeten stuk.
   ══════════════════════════════════════════════════════════════ */

/* ══ MEER DAN ÉÉN TEAM ═══════════════════════════════════════
   Tot nu toe stond alles onder één sleutel — fch_spelers_v1 — en
   was er dus maar één elftal mogelijk. Wie een tweede team wilde,
   moest zijn eerste weggooien.

   De hele app haalt zijn gegevens al op via laadJson en slaJson.
   Dat is één deur, en die deur is nu de enige plek die weet bij welk
   team iets hoort: sleutelVoor() plakt het nummer van het actieve
   team voor de sleutel. Elk scherm werd daarmee in één keer
   meerteams, zonder dat er in die schermen iets veranderde.

   Straks, met een database erachter, wordt dit één kolom: team_id.
   Daarom staat het nu al zo, en niet als één grote pot met alles
   erin — dat zou later opnieuw uit elkaar getrokken moeten worden.
   ══════════════════════════════════════════════════════════ */

/** Eén item uit de teamlijst. LET OP — bekend, niet opgelost punt uit
 * de typenproef van 18 september 2026 (P5): dit object krijgt via twee
 * routes een net ANDER veldenpakket. maakTeam() zet {id, naam, club,
 * gemaakt} neer; teamsVerhuizing() zet {id, naam, seizoen, speelduur,
 * locatie, gemaakt} neer — géén club, wél drie velden die maakTeam()
 * nooit vult. Beide routes leveren dus een team op waar de andere drie
 * (of het ene) veld(en) ontbreken. Vandaar dat hieronder alles behalve
 * id/naam/gemaakt optioneel (met [ ]) staat: dat is de eerlijke
 * beschrijving van wat er al gebeurt, geen keuze om het recht te
 * praten. Rechttrekken (één van de twee routes aanpassen, of het
 * object normaliseren) is een echte gedragswijziging en dus geen
 * P5-typenklus — al aan Evan gemeld, geen actie hier.
 * @typedef {Object} Team
 * @property {string} id
 * @property {string} naam
 * @property {string} [club]
 * @property {string} gemaakt   ISO-datumtekst
 * @property {string} [seizoen]    alleen gezet door teamsVerhuizing()
 * @property {number} [speelduur]  alleen gezet door teamsVerhuizing()
 * @property {string} [locatie]    alleen gezet door teamsVerhuizing()
 */

const TEAMS_KEY   = "tt_teams_v1";      /* de lijst met teams */
const ACTIEF_KEY  = "tt_actief_v1";     /* welk team je nu bekijkt */
const VOORKEUR_KEY = "tt_voorkeuren_v1"; /* taal, thema, clubwapen */
const LICENTIE_KEY = "tt_licentie_v1";  /* welk pakket je hebt */
/* Wat je hebt weggegooid, en wanneer.

   Zonder deze lijst kwam een verwijderd team terug. Weggooien haalde
   het alleen hier weg; de server wist van niets, en bij de volgende
   uitwisseling zag de app een team op de server dat hij zelf niet
   had — precies het beeld van een tweede apparaat dat iets nieuws
   heeft aangemaakt. Dus kwam het netjes terug.

   Een verwijdering is dus zelf een gegeven en moet ook omhoog. Tot
   dat gelukt is blijft het hier staan, zodat het ook werkt als je
   langs de lijn zonder bereik een team weggooit. */
const TEAMSWEG_KEY = "tt_teams_weg_v1";
const SEIZOENACTIEF_KEY = "tt_seizoenactief_v1"; /* welk seizoen je per team bekijkt */

/* Wat hoort bij het team, en wat bij jou?

   Bij het team hoort alles van dit seizoen: spelers, wedstrijden,
   trainingen, doelen, de stand, de tenues. Wissel je van team, dan
   wissel je dat allemaal mee.

   Bij jou horen je voorkeuren, je oefeningenbibliotheek, jouw
   uitslag op de spelregelquiz en het sportpark van de club. Die
   gelden over al je teams heen; ze per team bijhouden zou betekenen
   dat je hetzelfde complex vijftien keer moet bouwen. */
/** @type {string[]} sleutels die NOOIT met team/seizoen worden voorvoegd. */
const GEDEELDE_SLEUTELS = [
  "fch_instellingen_v1",   /* je voorkeuren; het teamdeel gaat apart */
  "fch_oefeningen_v1",     /* je oefeningenbibliotheek */
  "fch_quiz_v1",           /* jouw spelregelkennis */
  "fch_sportpark_v1",      /* het complex van de club */
  "fch_sportparken_v1",
  "fch_parksfeer_v1",
  TEAMS_KEY, ACTIEF_KEY, VOORKEUR_KEY, LICENTIE_KEY, TEAMSWEG_KEY,
  SEIZOENACTIEF_KEY
];

/* Waar staat dit? Dit is de enige plek waar dat wordt bepaald.
   Zolang er nog geen teams zijn — bij een app die net is bijgewerkt
   en nog niet is verhuisd — blijft alles staan waar het stond. Dat
   maakt de bijwerking onschadelijk: gaat er iets mis met de
   verhuizing, dan werkt de app gewoon zoals gisteren. */
/**
 * @param {string} basis  een van de vaste opslagsleutels (bijv. "fch_spelers_v1")
 * @returns {string} de sleutel zoals die echt in localStorage staat —
 *   ongewijzigd voor gedeelde sleutels of zolang er nog geen team is,
 *   anders voorzien van team- (en, zodra bekend, seizoen-)voorvoegsel.
 */
function sleutelVoor(basis) {
  if (!basis || GEDEELDE_SLEUTELS.indexOf(basis) >= 0) return basis;
  var t = _actiefTeam;
  if (!t) return basis;
  var s = seizoenNu();
  return s ? ("tt_" + t + "__" + s + "::" + basis)
           : ("tt_" + t + "__" + basis);
}

/* ══ SEIZOENEN ═══════════════════════════════════════════════
   Een elftal bestaat langer dan een seizoen. Een JO19-2 is in 2027/2028
   hetzelfde team als in 2026/2027 — andere spelers misschien, andere
   uitslagen zeker, maar hetzelfde team.

   Sportief begint elk seizoen bij nul. Dat is geen weergavekwestie: een
   doelpunt uit oktober 2026 mag in 2027/2028 nergens meetellen, in geen
   enkele telling, ook niet per ongeluk. De enige manier om dat écht
   zeker te weten is de gegevens uit elkaar te houden in plaats van ze
   bij elke berekening uit elkaar te moeten filteren. Eén vergeten
   filter is anders genoeg om de topscorerslijst van vorig jaar in het
   nieuwe seizoen te laten staan.

   Daarom zit het seizoen in de sleutel, net als het team:

       tt_<team>__<seizoen>::<soort>

   Dit is dezelfde ingreep als destijds bij de teams, en om dezelfde
   reden: één functie hierboven weet ervan, en elk scherm in de app werd
   in één klap seizoenbewust zonder dat er in die schermen iets
   veranderde. Statistieken hoeven niets te weten van seizoenen — ze
   zien nooit meer dan één seizoen tegelijk.

   Wat er over de seizoenen heen loopt, staat er dus buiten: de naam van
   het team en de club staan in de teamlijst, en jouw persoonlijke
   spullen staan onder de gedeelde sleutels.

   Op de server verandert hier niets van. De kolom sleutel is tekst, en
   de tekst wordt alleen langer.
   ══════════════════════════════════════════════════════════ */

/**
 * In welk seizoen valt deze datum? Het voetbalseizoen loopt van juli
 * tot en met juni. Een wedstrijd in mei 2027 hoort dus bij 2026/2027.
 * @param {Date} [d]  standaard: nu
 * @returns {string} seizoen-id, bijv. "2026-2027"
 */
function seizoenVanDatum(d) {
  d = d || new Date();
  var jaar = d.getFullYear();
  if (d.getMonth() < 6) jaar -= 1;
  return jaar + "-" + (jaar + 1);
}
/**
 * "2026/2027" en "2026-2027" zijn hetzelfde seizoen. In de sleutel mag
 * geen schuine streep staan, op het scherm hoort hij juist wel.
 * @param {string} [tekst]  vrije tekst, bijv. "2026/2027" of "2026-2027"
 * @returns {string|null} seizoen-id met koppelteken, of null als de
 *   tekst geen geldig seizoen beschrijft
 */
function seizoenId(tekst) {
  var m = String(tekst || "").match(/(\d{4})\s*[\/\-–]\s*(\d{2,4})/);
  if (!m) return null;
  var a = parseInt(m[1], 10);
  var b = m[2].length === 2 ? (Math.floor(a / 100) * 100 + parseInt(m[2], 10)) : parseInt(m[2], 10);
  if (b !== a + 1) return null;
  return a + "-" + b;
}
/**
 * @param {string} [id]  seizoen-id, bijv. "2026-2027"
 * @returns {string} leesbaar label, bijv. "2026/2027"
 */
function seizoenLabel(id) {
  var s = String(id || "");
  return s.indexOf("-") > 0 ? s.replace("-", "/") : s;
}
/**
 * @param {string} [id]  seizoen-id, bijv. "2026-2027"
 * @returns {string} het eerstvolgende seizoen-id; bij een onherkenbaar
 *   of ontbrekend id valt dit terug op het seizoen van vandaag
 */
function seizoenVolgend(id) {
  var m = String(id || "").match(/^(\d{4})-(\d{4})$/);
  if (!m) return seizoenVanDatum();
  var a = parseInt(m[1], 10) + 1;
  return a + "-" + (a + 1);
}
/**
 * De twee helften van een sleutel. Staat er geen ::, dan komt de
 * sleutel van vóór de seizoenen en hoort hij nergens bij.
 * @param {string} s  het deel van een localStorage-sleutel ná "tt_<team>__"
 * @returns {string|null} het seizoen-id vóór de "::", of null als er
 *   geen "::" in zit of de kop geen geldig seizoen is
 */
function seizoenUitSleutel(s) {
  var i = String(s || "").indexOf("::");
  if (i < 0) return null;
  /* Alleen 2026-2027 is een seizoen. Elke andere kop — bijvoorbeeld een
     geparkeerde laag uit een herstelactie — hoort niet in de
     seizoenkiezer thuis, want dan ruil je het ene raadsel voor het
     andere. */
  var kop = String(s).slice(0, i);
  return /^\d{4}-\d{4}$/.test(kop) ? kop : null;
}
/**
 * Zit er überhaupt een laag voor deze sleutel? Dit is iets anders dan de
 * vraag hierboven: een geparkeerde laag is geen seizoen, maar de sleutel
 * is wél al verhuisd en moet met rust worden gelaten.
 * @param {string} s
 * @returns {boolean}
 */
function heeftLaag(s) {
  return String(s || "").indexOf("::") >= 0;
}
/**
 * In welk seizoen valt deze datum, als tekst? Zelfde rekensom als
 * seizoenVanDatum, maar zonder Date — deze wordt aangeroepen tijdens de
 * verhuizing, en die draait voordat de helft van de app bestaat.
 * @param {string} [d]  datumtekst die begint met "JJJJ-MM" (bijv. "2026-09-08")
 * @returns {string|null} seizoen-id, of null als d geen bruikbare datum is
 */
function seizoenVanDatumTekst(d) {
  var m = String(d || "").match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  var jaar = parseInt(m[1], 10), maand = parseInt(m[2], 10);
  if (!jaar || !maand || maand < 1 || maand > 12) return null;
  return maand < 7 ? (jaar - 1) + "-" + jaar : jaar + "-" + (jaar + 1);
}
/* Verdeelt één opgeslagen blok over de seizoenen waar het thuishoort.

   Een lijst met datums bepaalt dat zelf: een wedstrijd van 8 september
   2026 hoort in 2026-2027, wat er ook in de instellingen stond. Loopt de
   lijst over twee seizoenen, dan wordt hij gesplitst. Valt er niets te
   verdelen — geen lijst, of geen enkel item met een bruikbare datum —
   dan blijft het blok heel en gaat het naar de terugval. */
/**
 * @param {string} tekst     opgeslagen JSON-tekst (meestal een array)
 * @param {string} terugval  seizoen-id om te gebruiken als er niets te
 *   verdelen valt of geen enkel item een bruikbare datum heeft
 * @returns {Object<string,string>} per seizoen-id de bijbehorende JSON-tekst
 */
function verdeelOverSeizoenen(tekst, terugval) {
  /** @type {Object<string,string>} */
  var uit = {}, lijst = null;
  try { lijst = JSON.parse(tekst); } catch(e) { lijst = null; }
  if (!Array.isArray(lijst) || !lijst.length) { uit[terugval] = tekst; return uit; }

  var metDatum = 0, /** @type {Object<string,any[]>} */ groepen = {};
  lijst.forEach(function (item) {
    var s = item ? seizoenVanDatumTekst(item.datum || item.date) : null;
    if (s) metDatum++; else s = terugval;
    (groepen[s] = groepen[s] || []).push(item);
  });
  if (!metDatum) { uit[terugval] = tekst; return uit; }
  Object.keys(groepen).forEach(function (s) {
    try { uit[s] = JSON.stringify(groepen[s]); } catch(e) {}
  });
  if (!Object.keys(uit).length) uit[terugval] = tekst;
  return uit;
}
/**
 * @param {string} s
 * @returns {string} het deel van de sleutel ná de "::" (of s zelf als
 *   er geen laag in zit)
 */
function basisUitSleutel(s) {
  var i = String(s || "").indexOf("::");
  return i < 0 ? s : s.slice(i + 2);
}

/* Welke seizoenen heeft dit team?

   Niet uit een aparte lijst, maar uit wat er staat. Een lijst zou een
   tweede waarheid zijn die stil uit de pas kan lopen met de gegevens —
   en die bovendien apart zou moeten worden bijgehouden op elk apparaat.
   Nu verschijnt een seizoen op je tablet zodra de gegevens ervan
   binnenkomen, zonder dat daar iets voor geregeld hoeft te worden. */
/**
 * @param {string} [id]  team-id
 * @returns {string[]} seizoen-ids van dit team, nieuwste eerst
 */
function seizoenenVan(id) {
  if (!id) return [];
  var voor = "tt_" + id + "__", /** @type {Object<string,boolean>} */ gezien = {};
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(voor) !== 0) continue;
      var s = seizoenUitSleutel(k.slice(voor.length));
      if (s) gezien[s] = true;
    }
  } catch(e) {}
  return Object.keys(gezien).sort().reverse();
}

/* Welk seizoen je per team hebt gekozen. Geen kopie in het geheugen:
   deze wordt een paar keer per scherm gelezen en dat is te weinig om er
   een tweede waarheid voor in de lucht te houden die uit de pas kan
   lopen met wat er werkelijk staat. */
/** @returns {Object<string,string>} per team-id het gekozen seizoen-id */
function seizoenKeuzes() {
  try {
    var o = JSON.parse(localStorage.getItem(SEIZOENACTIEF_KEY) || "{}");
    return (o && typeof o === "object") ? o : {};
  } catch(e) { return {}; }
}

/* Welk seizoen kijk je nu? Wat je hebt gekozen, anders het nieuwste dat
   er is, anders het seizoen waar vandaag in valt. Nooit niets — zonder
   seizoen zou sleutelVoor terugvallen op de oude vorm en zou je naar de
   gegevens van vóór deze versie kijken.

   Een gekozen seizoen telt altijd, ook als er nog niets in staat. Anders
   zou je een nieuw seizoen nooit kunnen beginnen: het bestaat pas als er
   iets in staat, en er komt pas iets in te staan als je erin kijkt. */
/**
 * @param {string} [team]  team-id; standaard het actieve team
 * @returns {string|null} seizoen-id, of null als er geen (actief) team is
 */
function seizoenNu(team) {
  var t = team || _actiefTeam;
  if (!t) return null;
  var gekozen = seizoenKeuzes()[t];
  if (gekozen) return gekozen;
  var alle = seizoenenVan(t);
  return alle.length ? alle[0] : seizoenVanDatum();
}
/**
 * @param {string} id      te kiezen seizoen-id
 * @param {string} [team]  team-id; standaard het actieve team
 * @returns {string|null} het gekozen seizoen-id, of het huidige seizoen
 *   als er geen team of geen id is
 */
function kiesSeizoen(id, team) {
  var t = team || _actiefTeam;
  if (!t || !id) return seizoenNu();
  var alle = seizoenKeuzes();
  alle[t] = id;
  try { localStorage.setItem(SEIZOENACTIEF_KEY, JSON.stringify(alle)); } catch(e) {}
  return id;
}

/**
 * Een nieuw teamnummer. Lang genoeg om nooit tweemaal hetzelfde te
 * krijgen, ook niet als twee apparaten los van elkaar een team
 * aanmaken en die later samenkomen in één database.
 * @returns {string}
 */
function nieuwTeamId() {
  return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** @returns {Team[]} */
function _leesTeams() {
  try {
    var r = localStorage.getItem(TEAMS_KEY);
    var l = r ? JSON.parse(r) : [];
    return Array.isArray(l) ? l.filter(function(t){ return t && t.id; }) : [];
  } catch(e) { return []; }
}
/** @type {Team[]} de teamlijst, in het geheugen gehouden zodat teams()
 * niet bij elke aanroep localStorage hoeft te lezen. */
var _teams = _leesTeams();
/** @type {string|null} het id van het team dat nu bekeken wordt. */
var _actiefTeam = (function(){
  try {
    var id = localStorage.getItem(ACTIEF_KEY);
    /* Wijst het naar een team dat er niet meer is, dan het eerste. */
    if (id && _teams.some(function(t){ return t.id === id; })) return id;
    return _teams.length ? _teams[0].id : null;
  } catch(e) { return null; }
})();

/** @returns {{id:string,op:string}[]} weggegooide teams met het moment van weggooien */
function teamsWeg() {
  try {
    var r = localStorage.getItem(TEAMSWEG_KEY);
    var l = r ? JSON.parse(r) : [];
    return Array.isArray(l) ? l.filter(function (g) { return g && g.id; }) : [];
  } catch(e) { return []; }
}
/** @param {string} id @returns {boolean} */
function teamIsWeg(id) {
  return teamsWeg().some(function (g) { return g.id === id; });
}
/** @param {string} id @returns {void} */
function noteerTeamWeg(id) {
  if (!id || teamIsWeg(id)) return;
  var l = teamsWeg().concat([{id: id, op: new Date().toISOString()}]);
  try { localStorage.setItem(TEAMSWEG_KEY, JSON.stringify(l)); } catch(e) {}
}
/* Weg is weg: zodra de server het ook als verwijderd kent, hoeft de
   grafsteen hier niet te blijven staan. Vanaf dat moment is de server
   degene die het onthoudt, en zou hij het team niet meer terugsturen. */
/** @param {string} id @returns {void} */
function vergeetTeamWeg(id) {
  var l = teamsWeg().filter(function (g) { return g.id !== id; });
  try { localStorage.setItem(TEAMSWEG_KEY, JSON.stringify(l)); } catch(e) {}
}

/** @returns {Team[]} */
function teams() { return _teams; }
/** @returns {string|null} het id van het actieve team */
function teamId() { return _actiefTeam; }
/** @returns {Team|null} het actieve team zelf, of null als er geen is */
function teamNu() {
  for (var i = 0; i < _teams.length; i++) if (_teams[i].id === _actiefTeam) return _teams[i];
  return null;
}
/**
 * @param {Team[]} lijst  de volledige, nieuwe teamlijst
 * @returns {Team[]} de opgeslagen lijst (na filtering op geldige items)
 */
function slaTeamsOp(lijst) {
  _teams = (lijst || []).filter(function(t){ return t && t.id; });
  try { localStorage.setItem(TEAMS_KEY, JSON.stringify(_teams)); } catch(e) {}
  /* Is het actieve team net verdwenen, dan schuiven we naar het
     eerste dat er nog is. Anders kijk je naar een leeg scherm zonder
     te begrijpen waarom. */
  if (!_teams.some(function(t){ return t.id === _actiefTeam; }))
    zetActiefTeam(_teams.length ? _teams[0].id : null);
  return _teams;
}
/**
 * @param {string|null} [id]  team-id, of null/niets om het actieve team op te heffen
 * @returns {string|null} het nieuwe actieve team-id
 */
function zetActiefTeam(id) {
  _actiefTeam = id || null;
  try {
    if (_actiefTeam) localStorage.setItem(ACTIEF_KEY, _actiefTeam);
    else localStorage.removeItem(ACTIEF_KEY);
  } catch(e) {}
  return _actiefTeam;
}

/* Van team wisselen. De gegevens zelf hoeven niet verplaatst te worden:
   sleutelVoor() wijst vanaf nu vanzelf naar het andere team. Wel moeten
   de instellingen opnieuw gelezen worden, en moet elk scherm zijn oude
   gegevens loslaten — dat laatste doet de app door de hele boom opnieuw
   op te bouwen. */
/* Alles wat de app op dit apparaat heeft neergezet, weghalen.
   Nodig bij uitloggen: wie uitlogt hoort niets meer te zien van het
   team waar hij net in zat. Dat is niet alleen netjes, het is ook
   nodig als er straks meerdere mensen op één computer werken.

   Het adres van de server blijft staan — dat is geen gegeven van jou
   maar een instelling van de app. */
/** @returns {number} het aantal weggehaalde localStorage-sleutels */
function wisAllesLokaal() {
  var weg = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k) continue;
      if (k === SERVER_KEY || k === APPARAAT_KEY) continue;
    /* ROL_KEY en de beheerdersvlag horen bij je aanmelding en gaan dus
       mee weg; ze worden bij de volgende aanmelding opnieuw opgehaald. */
      if (k.indexOf("tt_") === 0 || k.indexOf("fch_") === 0) weg.push(k);
    }
    weg.forEach(function (k) { localStorage.removeItem(k); });
  } catch(e) {}
  _teams = [];
  _actiefTeam = null;
  _syncStaat = {};
  return weg.length;
}

/**
 * @param {string} id  team-id om naar over te schakelen
 * @returns {string|null} het (eventueel ongewijzigde) actieve team-id
 */
function kiesTeam(id) {
  if (!id || id === _actiefTeam) return _actiefTeam;
  if (!_teams.some(function(t){ return t.id === id; })) return _actiefTeam;
  zetActiefTeam(id);
  herlaadInstellingen();
  return _actiefTeam;
}
/**
 * @param {string} [naam]
 * @param {string} [club]
 * @returns {Team} het nieuw aangemaakte team
 */
function maakTeam(naam, club) {
  var team = {id: nieuwTeamId(),
              naam: (naam || "").trim() || "Nieuw team",
              club: (club || "").trim(),
              gemaakt: new Date().toISOString()};
  slaTeamsOp(_teams.concat([team]));
  return team;
}
/* Het allereerste team van een account.

   Wie de app al gebruikte vóór er teams bestonden, heeft zijn spelers
   en wedstrijden onder de losse sleutels staan. Die horen bij dit
   eerste team en verhuizen mee — anders begint hij met een leeg scherm
   terwijl zijn seizoen half gespeeld is. Valt er niets te verhuizen,
   dan is dit gewoon een nieuw team.

   Dit staat hier en niet in het scherm omdat het te belangrijk is om
   alleen met de hand te controleren: gaat het mis, dan is iemand zijn
   halve seizoen kwijt op het moment dat hij voor het eerst inlogt. */
/**
 * @param {string} [naam]  gewenste naam voor het (eventueel verhuisde) team
 * @returns {Team} het eerste team, nieuw of verhuisd
 */
function maakEersteTeam(naam) {
  var team = teamEigenSleutels().length ? teamsVerhuizing() : null;
  if (team) { kiesTeam(team.id); hernoemTeam(team.id, naam); return team; }
  team = maakTeam(naam, inst().clubNaam);
  kiesTeam(team.id);
  return team;
}
/**
 * @param {string} id
 * @param {string} [naam]  lege of ontbrekende naam wordt genegeerd
 * @returns {Team[]} de bijgewerkte teamlijst
 */
function hernoemTeam(id, naam) {
  var n = (naam || "").trim();
  if (!n) return _teams;
  slaTeamsOp(_teams.map(function (t) {
    return t.id === id ? Object.assign({}, t, {naam: n}) : t;
  }));
  if (id === _actiefTeam) zetInstellingen({teamNaam: n});
  return _teams;
}
/* Een team weggooien haalt ook zijn gegevens weg. Laat je die staan,
   dan blijft er een berg spelers en wedstrijden achter waar niemand
   meer bij kan, en loopt de opslag op een telefoon een keer vol. */
/**
 * @param {string} id  team-id om weg te gooien, met al zijn gegevens
 * @returns {Team[]} de teamlijst zonder dit team
 */
function wisTeam(id) {
  noteerTeamWeg(id);
  try {
    var keuzes = seizoenKeuzes();
    if (keuzes[id]) { delete keuzes[id]; localStorage.setItem(SEIZOENACTIEF_KEY, JSON.stringify(keuzes)); }
  } catch(e) {}
  var voor = "tt_" + id + "__";
  try {
    var weg = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(voor) === 0) weg.push(k);
    }
    weg.forEach(function (k) { try { localStorage.removeItem(k); } catch(e) {} });
  } catch(e) {}
  slaTeamsOp(_teams.filter(function (t) { return t.id !== id; }));
  herlaadInstellingen();
  /* Meteen proberen door te geven. Lukt het niet — geen bereik, niet
     ingelogd — dan blijft de grafsteen staan en gaat het de volgende
     keer alsnog mee. */
  if (typeof syncStraks === "function") syncStraks(0);
  return _teams;
}

/* ══ DE VERHUIZING NAAR SEIZOENEN ════════════════════════════
   Alles wat er nu staat is ergens in een seizoen gespeeld, alleen wist
   de app dat niet. Deze verhuizing zet het onder het seizoen waar het
   hoort. Daarna kan er een nieuw seizoen naast, zonder dat het oude
   ook maar één keer wordt aangeraakt.

   Twee regels maken dit onschadelijk:

   Er wordt niets overschreven. Staat er onder het seizoen al iets, dan
   is dat nieuwer dan wat hier nog los rondslingert, en blijft het staan.

   Er wordt niets weggegooid voordat het staat. Pas als de kopie er
   werkelijk is, verdwijnt het origineel — en lukt het schrijven niet,
   bijvoorbeeld omdat de opslag vol zit, dan blijft alles zoals het was.

   Welk seizoen? Wat je zelf in de instellingen had ingevuld, want dat
   is wat je zelf dacht. Stond daar niets bruikbaars, dan het seizoen
   waar vandaag in valt.
   ══════════════════════════════════════════════════════════ */
/* Eén keer per team, en daarna nooit meer.

   De verhuizing draaide bij elke lading. Op zichzelf onschuldig — er viel
   na de eerste keer niets meer te verhuizen. Maar de blote sleutels
   stonden nog op de server, de synchronisatie haalde ze terug, en dan
   vond hij ze opnieuw. Stond het seizoen waar hij ze in zette nog leeg,
   dan stroomde de inhoud van vóór de verhuizing erin. Zo vulde elk nieuw
   seizoen zich met oude gegevens.

   Waarom per team en niet één vlag voor het hele apparaat: deze functie
   loopt langs de teams die op dít moment bestaan. Een apparaat waar nog
   geen enkel team op staat — vers, of net uitgelogd — zou met één vlag
   meteen "klaar" zijn en dat daarna blijven, ook voor teams die later
   binnenkomen. Zo'n vlag doet dan een uitspraak over werk dat hij nooit
   heeft gedaan. Per team zegt hij alleen wat hij werkelijk heeft
   afgehandeld. */
const VERHUISD_VOOR = "tt_verhuisd_v1_";
/** @param {string} id @returns {boolean} */
function isVerhuisd(id) {
  try { return !!localStorage.getItem(VERHUISD_VOOR + id); } catch(e) { return false; }
}
/** @param {string} id @returns {void} */
function zetVerhuisd(id) {
  try { localStorage.setItem(VERHUISD_VOOR + id, new Date().toISOString()); } catch(e) {}
}
/** @returns {number} het aantal sleutels dat naar een seizoenslaag is verhuisd */
function seizoenVerhuizing() {
  var verhuisd = 0;
  _teams.forEach(function (team) {
    if (isVerhuisd(team.id)) return;
    var voor = "tt_" + team.id + "__";
    var oud = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(voor) !== 0) continue;
        var rest = k.slice(voor.length);
        if (heeftLaag(rest)) continue;              /* al verhuisd of geparkeerd */
        oud.push(rest);
      }
    } catch(e) { return; }   /* opslag onleesbaar: geen vlag, volgende keer opnieuw */
    if (!oud.length) { zetVerhuisd(team.id); return; }

    /* Waar hoort dit team thuis?

       Hier ging het mis. Vroeger keek deze functie in het vrije tekstveld
       "seizoen" uit de teaminstellingen. Dat veld zei "2025/2026" terwijl
       elke training en elke wedstrijd eronder in augustus of september
       2026 viel — dus in 2026/2027. Alles belandde een seizoen te vroeg,
       en niets controleerde dat.

       Wat iemand ooit intypte is een vermoeden; de datum van een
       wedstrijd is een feit. Dus tellen we eerst de datums: elk item met
       een datum brengt een stem uit op zijn seizoen, en het seizoen met
       de meeste stemmen wordt de terugval voor alles wat zélf geen datum
       heeft — de selectie, de instellingen, het tenue.

       Pas als er in het hele team geen enkele datum te vinden is, komt
       het oude tekstveld alsnog aan bod. */
    /** @type {Object<string,number>} stemmen per seizoen-id */
    var stemmen = {};
    oud.forEach(function (basis) {
      var lijst = null;
      /* BEKEND, NIET OPGELOST — typenproef 18 september 2026 (P5):
         localStorage.getItem() geeft string|null, en JSON.parse() wil
         een string. tsc meldt dit dus als typefout. Onschadelijk in de
         praktijk: JSON.parse(null) gooit geen uitzondering (null wordt
         eerst naar de tekst "null" omgezet, en dat parseert weer terug
         tot null), en de try/catch hierboven vangt eventuele andere
         fouten alsnog op. Geen actie hier — al aan Evan gemeld. */
      try { lijst = JSON.parse(localStorage.getItem(voor + basis)); } catch(e) {}
      if (!Array.isArray(lijst)) return;
      lijst.forEach(function (item) {
        var s = item ? seizoenVanDatumTekst(item.datum || item.date) : null;
        if (s) stemmen[s] = (stemmen[s] || 0) + 1;
      });
    });
    var terugval = Object.keys(stemmen).sort(function (a, b) {
      return stemmen[b] - stemmen[a] || (a < b ? 1 : -1);
    })[0] || null;

    if (!terugval) {
      try {
        var ri = localStorage.getItem(voor + "fch_teaminstellingen_v1");
        if (ri) terugval = seizoenId((JSON.parse(ri) || {}).seizoen);
      } catch(e) {}
    }
    if (!terugval) terugval = seizoenId(team.seizoen) || seizoenVanDatum();

    oud.forEach(function (basis) {
      var van = voor + basis;
      try {
        var waarde = localStorage.getItem(van);
        if (waarde === null) return;

        /* tsc meldt hier "string | null" voor terugval, ook al is
           terugval hierboven altijd op een niet-lege string gezet
           vóór deze forEach begint: terugval wordt van búiten deze
           geneste functie meegenomen (een closure), en tsc vertrouwt
           een controle op zo'n meegenomen variabele niet — hij zou in
           theorie tussen het zetten en dit gebruik kunnen veranderen.
           Geen echt risico hier (terugval verandert daarna niet meer),
           puur een grens van wat tsc kan navolgen. */
        var delen = verdeelOverSeizoenen(waarde, terugval);
        var lagen = Object.keys(delen);

        /* Staat er ergens al iets? Dan is die laag van de gebruiker en
           blijft hij zoals hij is. De oude sleutel mag dan weg: zijn
           inhoud staat al ergens. */
        var botsing = lagen.some(function (s) {
          return localStorage.getItem(voor + s + "::" + basis) !== null;
        });
        if (botsing) { localStorage.removeItem(van); return; }

        /* Eerst alles schrijven, dan pas terugkijken, en pas opruimen als
           élk deel is aangekomen. Loopt de opslag halverwege vol — en een
           browser schrijft dan niets weg zonder het te zeggen — dan blijft
           de oude sleutel staan en is er niets kwijt. */
        var aangekomen = true;
        lagen.forEach(function (s) {
          var naar = voor + s + "::" + basis;
          try {
            localStorage.setItem(naar, delen[s]);
            if (localStorage.getItem(naar) === null) aangekomen = false;
          } catch(e) { aangekomen = false; }
        });
        if (!aangekomen) return;                    /* laat de oude staan */
        localStorage.removeItem(van);
        verhuisd++;
      } catch(e) {}
    });
    if (!seizoenKeuzes()[team.id]) kiesSeizoen(terugval, team.id);
    zetVerhuisd(team.id);
  });
  return verhuisd;
}

/* ── De eenmalige verhuizing ─────────────────────────────────
   Wie de app al gebruikte heeft één elftal onder de oude sleutels
   staan. Dat wordt zijn eerste team.

   Dit gaat in drie stappen, en die volgorde is het hele punt:
   eerst kopiëren, dan teruglezen en vergelijken, en pas als álles
   is aangekomen de oude sleutels opruimen. Loopt de opslag halverwege
   vol — en een browser schrijft dan niets weg zonder het te zeggen —
   dan worden de halve kopieën weggegooid en blijft alles staan waar
   het stond. De app werkt dan gewoon zoals gisteren, en niemand is
   iets kwijt. Dat is belangrijker dan dat de verhuizing lukt.

   Deze functie draait één keer: zodra er een team is, doet hij
   niets meer.

   TEAMINST_KEY zelf, en de aanroep die deze verhuizing in gang zet,
   staan niet hier maar in src/app.jsx, op precies de plek waar ze al
   stonden vóór P2. Ze zijn expres blijven staan: TEAMINST_KEY wordt
   ook gebruikt door de instellingen verderop in app.jsx, en de
   aanroep moet lopen op het moment dat hij nu al doet. Onder de
   aaneenschakeling in tools/bouw.js werkt die aanroep gewoon, want
   teamsVerhuizing() staat dan al vóór hem in dezelfde scope. */

/** @returns {string[]} localStorage-sleutels van vóór de teams die bij het eerste team horen */
function teamEigenSleutels() {
  var uit = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k) continue;
      if (k.indexOf("tt_") === 0) continue;              /* al verhuisd */
      if (k.indexOf("fch_") !== 0) continue;             /* niet van ons */
      if (GEDEELDE_SLEUTELS.indexOf(k) >= 0) continue;   /* van jou, niet van het team */
      uit.push(k);
    }
  } catch(e) {}
  return uit;
}
/**
 * De eenmalige verhuizing van vóór-teams-sleutels naar het eerste team.
 * Zie het typedef Team hierboven voor het bekende veldverschil met
 * maakTeam(): dit is de route die seizoen/speelduur/locatie zet.
 * @returns {Team|null} het nieuwe eerste team, of null als er al teams
 *   zijn of de verhuizing halverwege mislukte
 */
function teamsVerhuizing() {
  if (_teams.length) return null;          /* al gebeurd */
  /** @type {Object<string,any>} het oude, vrije instellingenblok van vóór teams */
  var oudeInst = {};
  try {
    var ri = localStorage.getItem("fch_instellingen_v1");
    if (ri) oudeInst = JSON.parse(ri) || {};
  } catch(e) {}

  var team = {
    id: nieuwTeamId(),
    naam: (oudeInst.teamNaam || "").trim() || "Mijn team",
    seizoen: oudeInst.seizoen || "",
    speelduur: oudeInst.speelduur,
    locatie: oudeInst.locatie || "",
    gemaakt: new Date().toISOString()
  };
  var voor = "tt_" + team.id + "__";
  /** @type {string[]} sleutels die al gezet zijn — nodig om bij een
   * mislukte verhuizing precies deze weer terug te draaien. */
  var gezet = [];
  try {
    teamEigenSleutels().forEach(function (k) {
      var waarde = localStorage.getItem(k);
      if (waarde === null) return;
      localStorage.setItem(voor + k, waarde);
      gezet.push(k);
      /* Meteen teruglezen. Zit de opslag vol, dan mislukt het schrijven
         bij sommige browsers zonder een fout te geven; dan mag de
         verhuizing niet doorgaan alsof er niets aan de hand is. */
      if (localStorage.getItem(voor + k) !== waarde)
        throw new Error("niet aangekomen: " + k);
    });
    /* De vier velden die bij het team horen gaan naar het team zelf */
    /** @type {Object<string,any>} */
    var teamDeel = {};
    ["teamNaam", "seizoen", "speelduur", "locatie"].forEach(function (v) {
      if (oudeInst[v] !== undefined) teamDeel[v] = oudeInst[v];
    });
    localStorage.setItem(voor + TEAMINST_KEY, JSON.stringify(teamDeel));
    /* En uit het gedeelde blok halen, zodat er niet twee versies van
       de teamnaam blijven rondslingeren die uit elkaar kunnen lopen. */
    /** @type {Object<string,any>} */
    var restInst = {};
    Object.keys(oudeInst).forEach(function (v) {
      if (["teamNaam", "seizoen", "speelduur", "locatie"].indexOf(v) < 0)
        restInst[v] = oudeInst[v];
    });
    localStorage.setItem("fch_instellingen_v1", JSON.stringify(restInst));

    /* Pas nu bestaat het team echt, en pas nu ruimen we op. */
    localStorage.setItem(TEAMS_KEY, JSON.stringify([team]));
    localStorage.setItem(ACTIEF_KEY, team.id);
    gezet.forEach(function (k) { try { localStorage.removeItem(k); } catch(e2) {} });
    _teams = [team];
    _actiefTeam = team.id;
    /* Twee verhuizingen achter elkaar: eerst naar een team, en meteen
       daarna naar een seizoen. Wie de app al gebruikte vóór beide
       bestonden, komt hier langs. */
    seizoenVerhuizing();
    return team;
  } catch(fout) {
    /* Niets half doen. De kopieën weg, het team weg, en alles staat
       nog waar het stond. */
    gezet.forEach(function (k) { try { localStorage.removeItem(voor + k); } catch(e3) {} });
    try {
      localStorage.removeItem(voor + TEAMINST_KEY);
      localStorage.removeItem(TEAMS_KEY);
      localStorage.removeItem(ACTIEF_KEY);
    } catch(e4) {}
    _teams = [];
    _actiefTeam = null;
    return null;
  }
}

