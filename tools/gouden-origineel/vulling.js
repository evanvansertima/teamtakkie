/* ══ DE VASTE VULLING ═════════════════════════════════════════
   De begintoestand van het gouden origineel: precies wat er in
   localStorage staat voordat de app voor het eerst wordt getekend.

   Waarom dit een apart bestand is: zonder een identieke begintoestand
   verschilt elke opname van de vorige en is het vangnet waardeloos.
   Dit bestand is dus net zo belangrijk als de vergelijking zelf, en
   het moet te lezen en aan te passen zijn zonder door het script te
   hoeven ploegen.

   Alle namen zijn verzonnen. Geen enkele speler, club of tegenstander
   hier bestaat; de achternamen zijn met opzet onmogelijk (Bramsloot,
   Kwartelaar) zodat niemand ze voor echte persoonsgegevens aanziet.
   E-mailadressen staan op .invalid — dat domein bestaat per definitie
   niet. Telefoonnummers en adressen zijn leeg gelaten.

   Pas je hier iets aan, dan verandert het gouden origineel. Dat is de
   bedoeling, maar het betekent wél dat je daarna opnieuw moet opnemen
   (--opnemen) en in de commit moet uitleggen waarom.
   ══════════════════════════════════════════════════════════ */

/* ── De vaste klok ───────────────────────────────────────────
   Alles wat "vandaag" heet moet elke dag hetzelfde zijn, anders is de
   vergelijking morgen rood zonder dat er iets veranderd is: leeftijden
   uit geboortedatums, "volgende wedstrijd", de agenda-maand.

   15 oktober 2026, 12:00 in Amsterdam. Gekozen omdat die dag midden in
   seizoen 2026-2027 valt, met wedstrijden ervoor én erna, zodat zowel
   "gespeeld" als "gepland" in beeld komt. */
const VASTE_TIJD = "2026-10-15T10:00:00.000Z";   /* = 12:00 Europe/Amsterdam */
const TIJDZONE   = "Europe/Amsterdam";
const TAAL       = "nl-NL";

/* Vaste id's. De app maakt id's normaal met Date.now() en Math.random();
   die zouden bij elke opname anders zijn. Door ze hier vast te zetten
   bestaan ze al en maakt de app geen nieuwe aan. */
const TEAM_ID   = "tgoud0001";
const TEAM2_ID  = "tgoud0002";
const SEIZOEN   = "2026-2027";
const CLUB_ID   = "00000000-0000-4000-8000-000000000001";
const APPARAAT  = "agoudenorigineel";

/* Sleutel van een teamgebonden blok, zoals sleutelVoor() hem maakt:
   tt_<team>__<seizoen>::<soort> */
function teamSleutel(basis, team, seizoen) {
  return "tt_" + (team || TEAM_ID) + "__" + (seizoen || SEIZOEN) + "::" + basis;
}

/* ── De selectie ─────────────────────────────────────────────
   Veertien spelers: genoeg voor een elftal met wissels, weinig genoeg
   om een DOM-verschil nog met het oog te kunnen lezen. */
const SPELERS = [
  spl("s01", "Joep Bramsloot",     1, "Keeper",       "2008-03-11", {doelpunten:0, assists:0, geelKaarten:0, roodKaarten:0, speelMinuten:270, wedstrijden:3}),
  spl("s02", "Ravi Kwartelaar",    2, "Verdediger",   "2008-07-02", {doelpunten:1, assists:0, geelKaarten:1, roodKaarten:0, speelMinuten:270, wedstrijden:3}),
  spl("s03", "Timo Veldwachter",   3, "Verdediger",   "2007-11-25", {doelpunten:0, assists:1, geelKaarten:0, roodKaarten:0, speelMinuten:250, wedstrijden:3}),
  spl("s04", "Bas Kolderhorst",    4, "Verdediger",   "2008-01-19", {doelpunten:0, assists:0, geelKaarten:2, roodKaarten:0, speelMinuten:180, wedstrijden:2}),
  spl("s05", "Niels Wierbaken",    5, "Verdediger",   "2008-05-30", {doelpunten:1, assists:0, geelKaarten:0, roodKaarten:0, speelMinuten:225, wedstrijden:3}),
  spl("s06", "Sil Draaiboom",      6, "Middenvelder", "2007-09-14", {doelpunten:2, assists:2, geelKaarten:0, roodKaarten:0, speelMinuten:270, wedstrijden:3}),
  spl("s07", "Mees Halfweegs",     7, "Middenvelder", "2008-02-08", {doelpunten:0, assists:3, geelKaarten:1, roodKaarten:0, speelMinuten:240, wedstrijden:3}),
  spl("s08", "Daan Steltkruid",    8, "Middenvelder", "2008-10-21", {doelpunten:1, assists:1, geelKaarten:0, roodKaarten:0, speelMinuten:200, wedstrijden:3}),
  spl("s09", "Luuk Grasmaaijer",   9, "Aanvaller",    "2007-12-04", {doelpunten:5, assists:1, geelKaarten:0, roodKaarten:0, speelMinuten:255, wedstrijden:3}),
  spl("s10", "Stijn Ravelijn",    10, "Aanvaller",    "2008-04-16", {doelpunten:3, assists:2, geelKaarten:0, roodKaarten:0, speelMinuten:230, wedstrijden:3}),
  spl("s11", "Jesse Pluimgaard",  11, "Aanvaller",    "2008-06-27", {doelpunten:2, assists:0, geelKaarten:0, roodKaarten:1, speelMinuten:160, wedstrijden:3}),
  spl("s12", "Finn Oosterwoud",   12, "Middenvelder", "2008-08-09", {doelpunten:0, assists:0, geelKaarten:0, roodKaarten:0, speelMinuten:90,  wedstrijden:2}),
  spl("s13", "Tygo Meerkolder",   13, "Verdediger",   "2007-10-03", {doelpunten:0, assists:0, geelKaarten:0, roodKaarten:0, speelMinuten:65,  wedstrijden:2}),
  spl("s14", "Roan Zandhorst",    16, "Keeper",       "2008-12-12", {doelpunten:0, assists:0, geelKaarten:0, roodKaarten:0, speelMinuten:0,   wedstrijden:0})
];
/* Eén speler staat op "blessure" en één op "twijfel": beide kanten van
   de beschikbaarheidsweergave komen zo in beeld. */
SPELERS[10].beschikbaar = "blessure";
SPELERS[10].beschikbaarNotitie = "Enkel, verwacht terug half november";
SPELERS[3].beschikbaar = "twijfel";

function spl(id, naam, nummer, positie, geboren, stats) {
  return {
    id: id, naam: naam, rugnummer: String(nummer), positie: positie,
    geboortedatum: geboren, positie2: "", favorietBeen: "rechts",
    skills: {}, sterren: {}, rapporten: [],
    adres: "", land: "Nederland", telefoon: "", email: "",
    foto: null, beschikbaar: "fit", beschikbaarNotitie: "",
    vaardigheden: {}, stats: stats
  };
}

/* ── De wedstrijden ──────────────────────────────────────────
   Drie gespeeld (vóór 15 oktober), twee gepland (erna). Zo staat er op
   het dashboard altijd zowel een uitslag als een volgende wedstrijd. */
function wed(o) {
  return Object.assign({
    id: null, tegenstander: "", datum: "", tijd: "", locatie: "Sportpark De Verzonnen Kamp",
    thuis: true, status: "gepland", score: {fch: 0, teg: 0}, scorers: [], kaarten: [],
    opstelling: [], wissels: [], posWissels: [], kleedkamer: {plus: [], min: []},
    opgave: [], beoordelingen: {}, motm: null, speelduur: 90, helften: 2,
    formatie: "4-3-3A", notities: "", rollen: {}, dsm: {}, gasten: [],
    soort: "competitie", tegen: null, scheids: "", assistent: ""
  }, o);
}
const BASIS_ELF = ["s01","s02","s03","s04","s05","s06","s07","s08","s09","s10","s11"];
const WEDSTRIJDEN = [
  wed({id: "w01", tegenstander: "VV Nevelmeer O19-1", datum: "2026-09-12", tijd: "14:30",
       thuis: true, status: "gespeeld", score: {fch: 3, teg: 1},
       opstelling: BASIS_ELF.slice(), motm: "s09",
       scorers: [{spelerId:"s09", minuut:12}, {spelerId:"s09", minuut:38}, {spelerId:"s06", minuut:71}],
       kaarten: [{spelerId:"s04", soort:"geel", minuut:55}],
       notities: "Sterke eerste helft, na rust te veel ruimte weggegeven."}),
  wed({id: "w02", tegenstander: "SC Duinklinker O19-2", datum: "2026-09-26", tijd: "12:15",
       thuis: false, locatie: "Sportpark Het Verzonnen Duin", status: "gespeeld",
       score: {fch: 1, teg: 2}, opstelling: BASIS_ELF.slice(), motm: "s07",
       scorers: [{spelerId:"s10", minuut:63}],
       kaarten: [{spelerId:"s07", soort:"geel", minuut:22}, {spelerId:"s11", soort:"rood", minuut:80}],
       notities: "Met tien man de laatste tien minuten."}),
  wed({id: "w03", tegenstander: "RKVV Harkstede O19-3", datum: "2026-10-10", tijd: "11:00",
       thuis: true, status: "gespeeld", score: {fch: 4, teg: 4},
       opstelling: BASIS_ELF.slice(), motm: "s10",
       scorers: [{spelerId:"s09", minuut:9}, {spelerId:"s09", minuut:27},
                 {spelerId:"s10", minuut:44}, {spelerId:"s02", minuut:88}],
       kaarten: [{spelerId:"s04", soort:"geel", minuut:70}],
       notities: "Vier keer op voorsprong, vier keer weggegeven."}),
  wed({id: "w04", tegenstander: "VV Stuifzand O19-1", datum: "2026-10-17", tijd: "14:30",
       thuis: false, locatie: "Sportpark De Verzonnen Heide", status: "gepland"}),
  wed({id: "w05", tegenstander: "SJO Bellevaart O19-2", datum: "2026-10-24", tijd: "12:30",
       thuis: true, status: "gepland"})
];

/* ── De trainingen ───────────────────────────────────────────
   Vier trainingen, drie met een presentielijst. De statussen zijn met
   opzet verschillend, zodat het opkomstpercentage niet toevallig 100
   is: een verandering in de opkomstberekening valt dan op. */
function trn(id, datum, tijd, doel, aanwezigheid, onderdelen) {
  return {
    id: id, datum: datum, tijd: tijd, locatie: "Sportpark De Verzonnen Kamp",
    duur: 90, doelstellingen: doel, voorbereidingen: "", materialen: "hesjes, pionnen, 8 ballen",
    onderdelen: onderdelen || [], notities: "", aanwezigheid: aanwezigheid || []
  };
}
function aanw(patroon) {
  /* patroon is één letter per speler, in de volgorde van SPELERS */
  var kaart = {a:"aanwezig", l:"telaat", m:"afwezig", g:"geenbericht",
               z:"ziek", b:"geblesseerd", w:"werk", u:"uitgeleend"};
  return patroon.split("").map(function (c, i) {
    return {spelerId: SPELERS[i].id, status: kaart[c]};
  });
}
const TRAININGEN = [
  trn("tr1", "2026-09-15", "19:00", "Opbouwen van achteruit",      aanw("aaalaamaaabaag")),
  trn("tr2", "2026-09-22", "19:00", "Omschakeling na balverlies", aanw("aalaaaaazaabga")),
  trn("tr3", "2026-10-06", "19:00", "Afwerken onder druk", aanw("aaaawaaalaabaa")),
  trn("tr4", "2026-10-20", "19:00", "Standaardsituaties", [])
];

/* ── Wat van jou is, niet van het team ───────────────────────*/
const VOORKEUREN = {taal: "nl", thema: "licht", accent: "club"};
const INSTELLINGEN_JIJ = {
  clubNaam: "VV Verzonnen Kamp", thema: "licht", logo: null, accent: "club",
  taal: "nl", veldZoom: 100
};
const TEAM_INST = {
  teamNaam: "JO19-2", seizoen: "2026/2027", speelduur: 90,
  locatie: "Sportpark De Verzonnen Kamp"
};

/* ── De teamlijst ────────────────────────────────────────────
   Twee teams. Het tweede staat er om één reden: de teamkiezer en de
   limiet uit het pakket zijn pas zichtbaar zodra er meer dan één is. */
const TEAMS = [
  {id: TEAM_ID,  naam: "JO19-2", seizoen: "2026/2027", speelduur: 90,
   locatie: "Sportpark De Verzonnen Kamp", gemaakt: "2026-07-01T10:00:00.000Z"},
  {id: TEAM2_ID, naam: "JO13-1", seizoen: "2026/2027", speelduur: 60,
   locatie: "Sportpark De Verzonnen Kamp", gemaakt: "2026-07-01T10:05:00.000Z"}
];

/* ── De aanmelding ───────────────────────────────────────────
   Een verzonnen token dat nooit bij een echte server hoort. Het bestaat
   alleen om ingelogd() waar te maken; élk verzoek naar Supabase wordt
   door het script onderschept en beantwoord zonder het netwerk op te
   gaan. Zie de uitleg bij blokkeerServer() in gouden-origineel.js.

   verlooptOp ligt ruim ná de vaste klok, zodat de app niet halverwege
   besluit het token te gaan verversen. */
const SESSIE = {
  token: "gouden-origineel-geen-echt-token",
  verversToken: "gouden-origineel-geen-echt-ververstoken",
  verlooptOp: Date.parse("2027-01-01T00:00:00.000Z"),
  gebruikerId: "00000000-0000-4000-8000-0000000000aa",
  email: "trainer@voorbeeld.invalid"
};

/* ── Het pakket ──────────────────────────────────────────────
   Dit bestand kent geen vást pakket meer. opslag(pakket) krijgt er
   één mee, want er worden twee opnamesets gemaakt van dezelfde app:

     club  het ruimste pakket. Alle acht schermen staan open, er is
           geen enkel slotje te zien. Dit is de betaalde beleving.
     free  het zuinigste pakket. Vier schermen zitten op slot, en
           juist dát is wat deze set vastlegt: de slotjes in het
           zijmenu en de onderbalk, de vergrendelde Trainingen-kaart
           op het dashboard, het slot op het tabblad Ontwikkeling, de
           melding na een tik en de prijskaart erachter.

   Waarom het er twee moeten zijn: alles wat achter !magPagina(...)
   of !magModule(...) staat is in een opname met club onzichtbaar.
   Eén set dekt dus per definitie maar de helft van het scherm.

   De pakketnaam moet een id zijn dat in PAKKETTEN in
   online/index.html bestaat. Staat hij daar niet in, dan valt
   pakketNu() terug op het eerste pakket (free) en legt de opname
   stilletjes iets anders vast dan de bedoeling. Het script
   controleert dat daarom vooraf; zie controleerSlot() in
   gouden-origineel.js.

   Tot 11 september stond hier "max". Dat pakket bestaat niet meer;
   zie docs/pakketten-besluit.md. */
const PAKKET_STANDAARD = "club";

/* Alles bij elkaar: precies wat er in localStorage komt te staan.
   Waarden zijn tekst, net als in de browser. Alleen het pakket
   verschilt per opnameset; al het andere is voor beide sets
   identiek, zodat een verschil tussen de twee sets nooit aan de
   gegevens kan liggen. */
function opslag(pakket) {
  var o = {};
  function zet(k, v) { o[k] = (typeof v === "string") ? v : JSON.stringify(v); }

  /* Van jou, over alle teams heen */
  zet("fch_instellingen_v1", INSTELLINGEN_JIJ);
  zet("tt_voorkeuren_v1",    VOORKEUREN);
  zet("tt_licentie_v1",      {pakket: pakket || PAKKET_STANDAARD});
  zet("tt_teams_v1",         TEAMS);
  zet("tt_actief_v1",        TEAM_ID);
  zet("tt_seizoenactief_v1", (function(){ var s={}; s[TEAM_ID]=SEIZOEN; s[TEAM2_ID]=SEIZOEN; return s; })());
  zet("tt_teams_weg_v1",     []);

  /* Server, aanmelding, apparaat, club */
  zet("tt_sessie_v1",     SESSIE);
  zet("tt_apparaat_v1",   APPARAAT);
  zet("tt_club_v1",       CLUB_ID);
  zet("tt_synclaatst_v1", "2026-10-15T09:30:00.000Z");
  zet("tt_syncstaat_v1",  {});
  zet("tt_terug_v1",      []);

  /* Van het actieve team, in dit seizoen */
  zet(teamSleutel("fch_spelers_v1"),          SPELERS);
  zet(teamSleutel("fch_wedstrijden_v1"),      WEDSTRIJDEN);
  zet(teamSleutel("fch_trainingen_v1"),       TRAININGEN);
  zet(teamSleutel("fch_teaminstellingen_v1"), TEAM_INST);
  zet(teamSleutel("fch_afwezigheden_v1"),     []);
  zet(teamSleutel("fch_activiteiten_v1"),     [
    {id:"ac1", titel:"Teamavond", soort:"teamuitje", datum:"2026-10-30", tijd:"19:30",
     eindtijd:"", aanwezigheid:[], locatie:"Kantine", notitie:"", heleDag:false,
     herhaal:"nee", herhaalTot:""}
  ]);

  /* Het tweede team bestaat, maar is leeg. Dat is met opzet: zo legt het
     gouden origineel ook vast hoe een leeg team eruitziet zodra iemand
     erheen wisselt. */
  zet("tt_" + TEAM2_ID + "__" + SEIZOEN + "::fch_teaminstellingen_v1",
      {teamNaam: "JO13-1", seizoen: "2026/2027", speelduur: 60,
       locatie: "Sportpark De Verzonnen Kamp"});

  return o;
}

module.exports = {
  VASTE_TIJD: VASTE_TIJD, TIJDZONE: TIJDZONE, TAAL: TAAL,
  TEAM_ID: TEAM_ID, SEIZOEN: SEIZOEN,
  PAKKET_STANDAARD: PAKKET_STANDAARD,
  opslag: opslag
};
