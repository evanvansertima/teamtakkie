/* ══════════════════════════════════════════════════════════════
   CLUBHUIS — sportpark, tenue-ontwerper en spelregelquiz
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P4 stap 6
   van docs/p4-stappenplan.md — "risico: middel"). Geen import/export:
   tools/bouw.js plakt dit bestand (SCHERM_VOLGORDE) na gedeeld.jsx,
   onboarding.jsx, instellingen.jsx, statistieken.jsx, trainingen.jsx
   en spelers.jsx, en vóór src/app.jsx aan elkaar, dus alles hieronder
   is nog altijd gewoon top-level function/const in dezelfde scope als
   src/app.jsx. Dit is een verhuizing, geen herschrijving: dezelfde
   tekst, dezelfde comments.

   DE 13 MET NAAM GENOEMDE COMPONENTEN
   ParkVorm, Spelerkaart, HTKBewerken, SpelerkaartTab, QuizTekenveld,
   SpelregelquizTab, TenueVormKnop, TenueOntwerperTab, ClubhuisModule,
   SportparkDrieD, EigenVeldVenster, ParkBewaarPopup, SportparkTab.
   TenueOntwerperTab roept TenueBeeld drie keer aan; TenueBeeld staat
   sinds P4 stap 0 in src/schermen/gedeeld.jsx (dat vóór dit bestand
   laadt), dus die drie aanroepen blijven werken via gedeelde scope —
   precies de verwevenheid met opstellingen die het stappenplan noemde,
   en die door stap 0 al was opgelost vóórdat deze stap begon.

   VEEL MEER MEEVERHUISD DAN DIE 13 NAMEN
   Bij het uitvoeren bleek tussen en rond die 13 componenten nog
   ~3.900 regels exclusief-door-clubhuis-gebruikte code te staan, niet
   met naam genoemd in het stappenplan (gevonden bij het narekenen,
   net als de vondsten bij eerdere stappen — zie §2 van het
   stappenplan voor het patroon). Alles hieronder geverifieerd met
   grep: nul treffers in de al-verplaatste schermmodules, nul treffers
   ná de opstellingen/wedstrijden-grens in src/app.jsx. Drie delen:
   1. Het spelregelquiz-domein (was regel 3024-3199 in het narekenen
      van het stappenplan): QUIZ_KEY, QUIZ_AANTAL, QUIZ_CATEGORIEEN,
      quizCategorie(), QUIZ_VRAGEN (de vragenbank), QUIZ_TEKENVRAGEN,
      quizHussel(), quizTrek(), quizHusselOpties(), quizRonde(),
      quizOordeel().
   2. De sportpark-3D-motor: alle park*- en pv*-functies en constanten
      (plaatsingsregels, botsing/vastklikken, camera/zoom/sleep, de
      onderdelencatalogus PARK_ONDERDELEN, en de bouwfuncties per
      onderdeel — doel, dugout, kantine, tribune, dak, container etc.),
      inclusief tekenParkVorm en de laatste bouwstukken
      (parkBalkWijkt/parkSpookMaken/parkSpookKleur/parkGrondTextuur/
      parkTextuur/parkBouwStuk) die tussen ClubhuisModule en
      SportparkDrieD in stonden.
   3. De rest van de TENUE_*-ontwerpgegevens en -hulpfuncties van de
      tenue-ontwerper (tabblad "De Kleedkamer"): TENUE_PATRONEN,
      TENUE_BEGIN, TENUE_GROEPEN, TENUE_VORMEN, TENUE_DELEN,
      TENUE_FONTS, TENUE_GREPEN, TENUE_ZOOMS, TENUE_HISTORIE_MAX,
      TENUE_GROEP_MS, plus ~40 kleine tenue*()-hulpfuncties die er
      fysiek tussenin stonden (laag toevoegen/verwijderen/verplaatsen,
      undo/redo-geschiedenis, zoomstappen, sleepgeometrie, SVG-export).

   WAT HIER BEWUST NIET IS MEEGEKOMEN
   Van diezelfde tenue-cluster gebruikt src/schermen/gedeeld.jsx een
   deel al vandaag (TenueBeeld/TenueKader hebben ze nodig om een tenue
   te kunnen tekenen) — die ~23 functies/constanten zijn daarom naar
   gedeeld.jsx verhuisd in plaats van hierheen, met dezelfde redenering
   als getalKlem/getalTyp/getalKlaar/aanraakScherm (zie gedeeld.jsx).
   Drie andere functies die middenin deze cluster stonden horen
   helemaal niet bij clubhuis: tenueVoor(), tenueVulling() en
   tenueVanWedstrijd() worden uitsluitend door nog-niet-verplaatste
   wedstrijden/opstellingen-code gebruikt en blijven onaangeroerd in
   src/app.jsx, voor een latere stap.
   TENUE_GREEP_PX blijft (net als de rest van de "geen-vinger"-maten)
   niet hier maar bij tenueKaderMaten() in gedeeld.jsx, om dezelfde
   reden.

   TESTAANPASSING BIJ DEZE STAP
   Geen van de zeven testbestanden verwijst met naam of regelnummer
   naar iets in deze module (gecontroleerd met grep) — het vangnet
   loopt hier volledig via het gouden origineel.

   VANGNET
   "clubhuis" (top-scherm), "clubhuis-sportpark" ("De Bouwput"),
   "clubhuis-tenue" ("De Kleedkamer") en "clubhuis-quiz"
   ("Betweterige Scheids") in tools/gouden-origineel.js (alle vier
   toegevoegd op 17 september) bewaken deze module rechtstreeks.
   Verwachting van deze verplaatsing: volledig identiek.

   Zie docs/p4-stappenplan.md §1 (stap 6) en §2 voor de volledige
   redenering achter wat wél en niet met naam was genoemd. */

/* ═══════════════════════════════════════════════════════════
   TENUE-ONTWERPGEGEVENS EN -HULPFUNCTIES (exclusief clubhuis)
   Zie de bestandskop hierboven, punt 3, voor wat hier wél en wat in
   gedeeld.jsx staat.
═══════════════════════════════════════════════════════════ */
const TENUE_PATRONEN = [
  {id:"effen",     label:"Effen"},
  {id:"strepen",   label:"Strepen"},
  {id:"banden",    label:"Banden"},
  {id:"halven",    label:"Halven"},
  {id:"diagonaal", label:"Diagonaal"},
  {id:"keper",     label:"Sjerp"},
  {id:"mouwen",    label:"Mouwen"}
];
/* Waar een tenue mee begint als er nog niets is ingevuld */
const TENUE_BEGIN = {
  thuis:   {shirt:"#004aad", shirt2:"#ffffff", kraag:"#ffffff", broek:"#ffffff",
            sokken:"#004aad", tekst:"#ffffff", patroon:"effen"},
  uit:     {shirt:"#ffffff", shirt2:"#004aad", kraag:"#004aad", broek:"#004aad",
            sokken:"#ffffff", tekst:"#004aad", patroon:"effen"},
  derde:   {shirt:"#1b1f2a", shirt2:"#f5c542", kraag:"#f5c542", broek:"#1b1f2a",
            sokken:"#f5c542", tekst:"#f5c542", patroon:"effen"},
  keeperT: {shirt:"#28a745", shirt2:"#1b5e2a", kraag:"#1b5e2a", broek:"#1b1f2a",
            sokken:"#28a745", tekst:"#ffffff", patroon:"effen"},
  keeperU: {shirt:"#f5771b", shirt2:"#1b1f2a", kraag:"#1b1f2a", broek:"#1b1f2a",
            sokken:"#f5771b", tekst:"#1b1f2a", patroon:"effen"}
};
function tenueAchtergrond(tenue, isKeeper) {
  var t = tenue || STANDAARD_TENUE;
  return tenueVulling(t.sets
    ? tenueVoor(t, t.keuze || "thuis", isKeeper)
    : (isKeeper ? Object.assign({}, STANDAARD_SET, {shirt:t.keeper, patroon:"effen"})
                : Object.assign({}, STANDAARD_SET, t)));
}
/* ── De vormenbibliotheek ───────────────────────────────────
   Alles wordt getekend in een vierkant van 100 bij 100. Daardoor kan
   elke vorm op elk kledingstuk worden gezet, op elke maat en onder
   elke hoek, zonder dat er ergens een tweede versie van moet bestaan.
   Een streepjespatroon vult dat vierkant helemaal; een schild of een
   symbool staat er als losse vorm in. */
const TENUE_GROEPEN = [
  {id:"vorm",    label:"Vormen",   icoon:"fa-solid fa-shapes"},
  {id:"patroon", label:"Patronen", icoon:"fa-solid fa-bars-staggered"},
  {id:"schild",  label:"Schilden", icoon:"fa-solid fa-shield-halved"},
  {id:"cijfer",  label:"Cijfers",  icoon:"fa-solid fa-7"},
  {id:"tekst",   label:"Tekst",    icoon:"fa-solid fa-font"},
  {id:"symbool", label:"Symbolen", icoon:"fa-solid fa-star"},
  {id:"beeld",   label:"Eigen",    icoon:"fa-solid fa-image"}
];
/* Een blok liggende banen, staande strepen of blokjes. Deze worden
   uitgerekend in plaats van uitgetekend: dan klopt de verdeling altijd
   en hoef ik geen zestig bijna gelijke paden te onderhouden. */
function tvStrepen(aantal, staand) {
  var uit = [], stap = 100 / (aantal * 2);
  for (var i = 0; i < aantal; i++) {
    var a = i * stap * 2;
    uit.push(staand ? {x:a, y:0, b:stap, h:100} : {x:0, y:a, b:100, h:stap});
  }
  return uit;
}
function tvBlokjes(n) {
  var uit = [], m = 100 / n;
  for (var r = 0; r < n; r++) for (var k = 0; k < n; k++)
    if ((r + k) % 2 === 0) uit.push({x:k*m, y:r*m, b:m, h:m});
  return uit;
}
function tvChevrons(aantal, omlaag) {
  var uit = [], stap = 100 / aantal, dik = stap * 0.45;
  for (var i = 0; i < aantal; i++) {
    var y = i * stap;
    uit.push(omlaag
      ? {d:"M0 " + y + "L50 " + (y+stap*0.6) + "L100 " + y + "V" + (y+dik) +
             "L50 " + (y+stap*0.6+dik) + "L0 " + (y+dik) + "Z"}
      : {d:"M0 " + (y+stap*0.6) + "L50 " + y + "L100 " + (y+stap*0.6) + "V" + (y+stap*0.6+dik) +
             "L50 " + (y+dik) + "L0 " + (y+stap*0.6+dik) + "Z"});
  }
  return uit;
}
const TENUE_VORMEN = [
  /* ── Basisvormen ── */
  {id:"cirkel",    groep:"vorm", label:"Cirkel",    d:"M4 50A46 46 0 1 0 96 50A46 46 0 1 0 4 50Z"},
  {id:"ring",      groep:"vorm", label:"Ring",      regel:"evenodd",
   d:"M4 50A46 46 0 1 0 96 50A46 46 0 1 0 4 50ZM26 50A24 24 0 1 0 74 50A24 24 0 1 0 26 50Z"},
  {id:"vierkant",  groep:"vorm", label:"Vierkant",  d:"M6 6H94V94H6Z"},
  {id:"afgerond",  groep:"vorm", label:"Afgerond",
   d:"M20 6H80A14 14 0 0 1 94 20V80A14 14 0 0 1 80 94H20A14 14 0 0 1 6 80V20A14 14 0 0 1 20 6Z"},
  {id:"driehoek",  groep:"vorm", label:"Driehoek",  d:"M50 6L94 90H6Z"},
  {id:"punt",      groep:"vorm", label:"Punt",      d:"M6 10H94L50 94Z"},
  {id:"ruit",      groep:"vorm", label:"Ruit",      d:"M50 4L96 50L50 96L4 50Z"},
  {id:"zeshoek",   groep:"vorm", label:"Zeshoek",   d:"M28 8H72L94 50L72 92H28L6 50Z"},
  {id:"achthoek",  groep:"vorm", label:"Achthoek",  d:"M32 6H68L94 32V68L68 94H32L6 68V32Z"},
  {id:"halveMaan", groep:"vorm", label:"Halve",     d:"M4 70A46 46 0 0 1 96 70Z"},
  {id:"kwart",     groep:"vorm", label:"Kwart",     d:"M6 94V6A88 88 0 0 1 94 94Z"},
  {id:"druppel",   groep:"vorm", label:"Druppel",
   d:"M50 4C74 30 90 46 90 62A40 40 0 0 1 10 62C10 46 26 30 50 4Z"},
  {id:"wig",       groep:"vorm", label:"Wig",       d:"M6 94V6L94 94Z"},
  {id:"kruis",     groep:"vorm", label:"Kruis",     d:"M36 6H64V36H94V64H64V94H36V64H6V36H36Z"},
  {id:"balk",      groep:"vorm", label:"Balk",      d:"M6 36H94V64H6Z"},
  {id:"pijl",      groep:"vorm", label:"Pijl",      d:"M50 4L88 42H66V96H34V42H12Z"},

  /* ── Patronen: die vullen het hele vak ── */
  {id:"strepen4",  groep:"patroon", label:"Strepen",       vul:true, maak:function(){ return tvStrepen(4, true); }},
  {id:"strepen7",  groep:"patroon", label:"Smal",          vul:true, maak:function(){ return tvStrepen(7, true); }},
  {id:"strepen12", groep:"patroon", label:"Fijn",          vul:true, maak:function(){ return tvStrepen(12, true); }},
  {id:"banen4",    groep:"patroon", label:"Banen",         vul:true, maak:function(){ return tvStrepen(4, false); }},
  {id:"banen8",    groep:"patroon", label:"Smalle banen",  vul:true, maak:function(){ return tvStrepen(8, false); }},
  {id:"halvenV",   groep:"patroon", label:"Halven",        vul:true, maak:function(){ return [{x:50, y:0, b:50, h:100}]; }},
  {id:"halvenH",   groep:"patroon", label:"Onderhelft",    vul:true, maak:function(){ return [{x:0, y:50, b:100, h:50}]; }},
  {id:"kwarten",   groep:"patroon", label:"Kwarten",       vul:true,
   maak:function(){ return [{x:50, y:0, b:50, h:50}, {x:0, y:50, b:50, h:50}]; }},
  {id:"diagonaalL",groep:"patroon", label:"Diagonaal",     vul:true, maak:function(){ return [{d:"M0 100H100V0Z"}]; }},
  {id:"diagonaalR",groep:"patroon", label:"Andersom",      vul:true, maak:function(){ return [{d:"M0 0H100V100Z"}]; }},
  {id:"sjerp",     groep:"patroon", label:"Sjerp",         vul:true,
   maak:function(){ return [{d:"M0 82L82 0H100V18L18 100H0Z"}]; }},
  {id:"dambord",   groep:"patroon", label:"Dambord",       vul:true, maak:function(){ return tvBlokjes(6); }},
  {id:"damfijn",   groep:"patroon", label:"Fijn dambord",  vul:true, maak:function(){ return tvBlokjes(12); }},
  {id:"chevronOp", groep:"patroon", label:"Chevrons",      vul:true, maak:function(){ return tvChevrons(5, false); }},
  {id:"chevronNeer",groep:"patroon",label:"Omgekeerd",     vul:true, maak:function(){ return tvChevrons(5, true); }},
  {id:"vhals",     groep:"patroon", label:"Schouderband",  vul:true,
   maak:function(){ return [{d:"M0 0H100V16L50 32L0 16Z"}]; }},
  {id:"zoom",      groep:"patroon", label:"Zoom",          vul:true, maak:function(){ return [{x:0, y:86, b:100, h:14}]; }},
  {id:"rand",      groep:"patroon", label:"Rand",          vul:true, regel:"evenodd",
   maak:function(){ return [{d:"M0 0H100V100H0ZM8 8V92H92V8Z"}]; }},

  /* ── Schilden en heraldiek ── */
  {id:"schildPunt",  groep:"schild", label:"Schild",
   d:"M8 8H92V52C92 76 50 94 50 94C50 94 8 76 8 52Z"},
  {id:"schildRond",  groep:"schild", label:"Rond schild",
   d:"M10 10H90V50A40 44 0 0 1 50 94A40 44 0 0 1 10 50Z"},
  {id:"schildKlas",  groep:"schild", label:"Klassiek",
   d:"M50 6L92 16V50C92 74 50 94 50 94C50 94 8 74 8 50V16Z"},
  {id:"schildRecht", groep:"schild", label:"Recht",  d:"M12 8H88V70L50 94L12 70Z"},
  {id:"schildV",     groep:"schild", label:"Punt",   d:"M8 8H92L50 94Z"},
  {id:"wimpel",      groep:"schild", label:"Wimpel", d:"M14 8H86V92L50 68L14 92Z"},
  {id:"kroon",       groep:"schild", label:"Kroon",  d:"M8 80H92L96 24L72 46L50 12L28 46L4 24Z"},
  {id:"vleugel",     groep:"schild", label:"Vleugel",
   d:"M6 44C28 26 56 24 78 34L96 22L80 48C62 68 32 72 4 62Z"},
  {id:"lauwer",      groep:"schild", label:"Lauwer",
   d:"M50 94C28 78 18 52 26 22C44 32 54 52 50 94ZM50 94C72 78 82 52 74 22C56 32 46 52 50 94Z"},
  {id:"fleur",       groep:"schild", label:"Fleur",
   d:"M50 6C58 22 70 30 70 42C70 52 62 58 50 58C38 58 30 52 30 42C30 30 42 22 50 6ZM10 46C28 42 40 50 44 64C30 74 14 68 10 46ZM90 46C86 68 70 74 56 64C60 50 72 42 90 46ZM38 66H62L58 94H42Z"},
  {id:"band",        groep:"schild", label:"Naamband",
   d:"M4 40H96L88 62H12ZM4 40L14 54L4 62ZM96 40L86 54L96 62Z"},

  /* ── Symbolen ── */
  {id:"bal",       groep:"symbool", label:"Bal", regel:"evenodd",
   d:"M4 50A46 46 0 1 0 96 50A46 46 0 1 0 4 50ZM50 26L68 39L61 60H39L32 39Z"},
  {id:"ster5",     groep:"symbool", label:"Ster",
   d:"M50 4L62 36L96 38L69 59L79 92L50 72L21 92L31 59L4 38L38 36Z"},
  {id:"ster6",     groep:"symbool", label:"Zeshoekster",
   d:"M50 4L64 30H94L79 54L94 78H64L50 96L36 78H6L21 54L6 30H36Z"},
  {id:"hart",      groep:"symbool", label:"Hart",
   d:"M50 92C20 70 6 52 6 34A24 24 0 0 1 50 22A24 24 0 0 1 94 34C94 52 80 70 50 92Z"},
  {id:"schoppen",  groep:"symbool", label:"Schoppen",
   d:"M50 6C50 6 94 40 94 60A20 20 0 0 1 56 66L64 94H36L44 66A20 20 0 0 1 6 60C6 40 50 6 50 6Z"},
  {id:"klaverKrt", groep:"symbool", label:"Klaveren",
   d:"M50 8A20 20 0 0 1 68 38A20 20 0 1 1 68 68H56L64 94H36L44 68H32A20 20 0 1 1 32 38A20 20 0 0 1 50 8Z"},
  {id:"ruitKaart", groep:"symbool", label:"Ruiten", d:"M50 4L86 50L50 96L14 50Z"},
  {id:"bliksem",   groep:"symbool", label:"Bliksem", d:"M58 4L18 56H44L38 96L82 40H54Z"},
  {id:"vlam",      groep:"symbool", label:"Vlam",
   d:"M50 4C62 26 82 34 82 58A32 32 0 0 1 18 58C18 44 28 40 34 30C36 44 44 46 46 38C48 28 44 16 50 4Z"},
  {id:"klaver",    groep:"symbool", label:"Klavertje",
   d:"M34 20A16 16 0 1 1 34 52A16 16 0 1 1 34 20ZM66 20A16 16 0 1 1 66 52A16 16 0 1 1 66 20ZM34 52A16 16 0 1 1 34 84A16 16 0 1 1 34 52ZM66 52A16 16 0 1 1 66 84A16 16 0 1 1 66 52Z"},
  {id:"blad",      groep:"symbool", label:"Blad",
   d:"M88 8C42 8 12 38 12 66C12 78 18 90 18 90L32 76C28 60 40 40 74 30C50 44 40 58 38 72L50 84C80 76 92 40 88 8Z"},
  {id:"vlok",      groep:"symbool", label:"Sneeuwvlok",
   d:"M46 4H54V96H46ZM4 46H96V54H4ZM17 21L21 17L83 79L79 83ZM79 17L83 21L21 83L17 79Z"},
  {id:"golf",      groep:"symbool", label:"Golf",
   d:"M4 56C18 34 32 34 46 56C60 78 74 78 88 56L96 66C78 92 60 92 46 70C32 48 20 48 10 66Z"},
  {id:"driehoekje",groep:"symbool", label:"Punten",
   d:"M20 20L38 56H2ZM62 20L80 56H44ZM41 58L59 94H23Z"}
];
function tenueVormen(groep) {
  return TENUE_VORMEN.filter(function(v){ return v.groep === groep; });
}
/* ── Lagen ──────────────────────────────────────────────────
   Een tenue is een stapel: eerst de kleur van het kledingstuk, dan
   laag voor laag wat je erop legt. Elke laag hoort bij één kledingstuk
   en bij één kant, zodat een embleem op de borst niet ineens op de
   broek opduikt. */
const TENUE_DELEN = [
  {id:"shirtVoor",  label:"Shirt voor",   stuk:"shirt", kant:"voor"},
  {id:"shirtAchter",label:"Shirt achter", stuk:"shirt", kant:"achter"},
  {id:"broek",      label:"Broek",        stuk:"broek", kant:"beide"},
  {id:"sok",        label:"Sokken",       stuk:"sok",   kant:"beide"}
];
function tenueDeel(id) {
  for (var i = 0; i < TENUE_DELEN.length; i++)
    if (TENUE_DELEN[i].id === id) return TENUE_DELEN[i];
  return TENUE_DELEN[0];
}
const TENUE_LAAG_MAX = 12;                 /* per kledingstuk */
/* Lettertypes die op elke computer aanwezig zijn, met per stuk een
   eigen dikte en letterafstand: zonder dat verschil zien de meeste er
   in hoofdletters toch hetzelfde uit. */
const TENUE_FONTS = [
  {id:"blok",      label:"Blok",        css:"'Helvetica Neue',Helvetica,Arial,sans-serif", vet:800, spatie:0},
  {id:"smal",      label:"Smal",        css:"'Arial Narrow','Helvetica Neue',Arial,sans-serif", vet:700, spatie:0},
  {id:"breed",     label:"Breed",       css:"Verdana,Geneva,sans-serif", vet:700, spatie:2},
  {id:"stadion",   label:"Stadion",     css:"Impact,'Haettenschweiler','Arial Narrow',sans-serif", vet:400, spatie:1},
  {id:"rond",      label:"Rond",        css:"'Trebuchet MS','Lucida Grande',sans-serif", vet:700, spatie:0},
  {id:"klassiek",  label:"Klassiek",    css:"Georgia,'Times New Roman',serif", vet:700, spatie:0},
  {id:"krant",     label:"Krant",       css:"'Times New Roman',Times,serif", vet:700, spatie:0},
  {id:"sierlijk",  label:"Sierlijk",    css:"'Palatino Linotype',Palatino,'Book Antiqua',serif", vet:700, spatie:1},
  {id:"machine",   label:"Typemachine", css:"'Courier New',Courier,monospace", vet:700, spatie:0},
  {id:"schrijf",   label:"Schrijf",     css:"'Brush Script MT','Snell Roundhand',cursive", vet:400, spatie:0},
  {id:"systeem",   label:"Systeem",     css:"system-ui,'Segoe UI',Roboto,sans-serif", vet:800, spatie:0},
  {id:"gespat",    label:"Gespat",      css:"'Helvetica Neue',Helvetica,Arial,sans-serif", vet:800, spatie:8}
];
/* Wat een tekstlaag laat zien: je eigen woorden, het rugnummer van de
   speler, of zijn naam. Zo staat de plek en de opmaak in het tenue en
   de inhoud bij de speler. */
const TENUE_BRONNEN = [
  {id:"",        label:"Eigen tekst"},
  {id:"nummer",  label:"Rugnummer"},
  {id:"naam",    label:"Spelersnaam"}
];
const TENUE_LIJNDIKTES = [
  {id:0, label:"Geen"}, {id:1, label:"Dun"}, {id:2, label:"Gewoon"},
  {id:4, label:"Dik"},  {id:7, label:"Heel dik"}
];
const TENUE_KLIK_STAP = 15;                /* graden, als vastklikken aanstaat */
const STANDAARD_LAAG = {
  deel:"shirtVoor", vorm:"cirkel", kleur:"#ffffff",
  lijn:"#000000", lijnDik:0,
  x:50, y:50, breed:40, hoog:40, hoek:0,
  spiegel:false, spiegelV:false, doorzicht:1,
  tekst:"", bron:"", font:"blok", boog:0
};
function tenueGetal(w, laag, hoog, terug) {
  var n = Number(w);
  if (!isFinite(n)) return terug;
  return Math.max(laag, Math.min(hoog, n));
}
function tenueDeelBestaat(id) {
  return TENUE_DELEN.some(function(d){ return d.id === id; });
}
/* Hoe een laag in de lijst heet */
function tenueLaagNaam(laag) {
  var l = laag || {};
  if (l.beeld) return "Afbeelding";
  if (tenueLaagSoort(l) === "tekst") {
    var b = TENUE_BRONNEN.filter(function(x){ return x.id === l.bron; })[0];
    return (l.bron && b) ? b.label : (l.tekst || "Tekst");
  }
  var v = tenueVorm(l.vorm);
  return v ? v.label : String(l.vorm || "Vorm");
}
/* Lagen van hetzelfde kledingstuk, ongeacht de kant: die delen samen
   de teller van twaalf. */
function tenueLaagRuimte(set, deelId) {
  return TENUE_LAAG_MAX - tenueLagen(set, deelId).length;
}
function tenueLaagToe(set, laag) {
  var s = Object.assign({}, set);
  var n = tenueLaagVernieuw(Object.assign({}, laag));
  if (tenueLaagRuimte(s, n.deel) <= 0) return s;
  s.lagen = ((s.lagen) || []).map(tenueLaagVernieuw).concat([n]);
  return s;
}
function tenueLaagWeg(set, id) {
  var s = Object.assign({}, set);
  s.lagen = ((s.lagen) || []).map(tenueLaagVernieuw)
    .filter(function(l){ return l.id !== id; });
  return s;
}
function tenueLaagZet(set, id, veld, waarde) {
  var s = Object.assign({}, set);
  s.lagen = ((s.lagen) || []).map(function(l){
    if (l.id !== id) return tenueLaagVernieuw(l);
    var n = Object.assign({}, l); n[veld] = waarde;
    return tenueLaagVernieuw(n);
  });
  return s;
}
/* Naar voren of naar achteren, binnen het eigen kledingstuk. Ruilen
   met de buurman in de volledige lijst zou een laag van het shirt
   met een laag van de broek kunnen verwisselen. */
function tenueLaagSchuif(set, id, omhoog) {
  var s = Object.assign({}, set);
  var alles = ((s.lagen) || []).map(tenueLaagVernieuw);
  var hier = alles.filter(function(l){ return l.id === id; })[0];
  if (!hier) return s;
  var eigen = alles.filter(function(l){ return l.deel === hier.deel; });
  var i = eigen.indexOf(hier), j = i + (omhoog ? 1 : -1);
  if (j < 0 || j >= eigen.length) return s;
  var a = alles.indexOf(eigen[i]), b = alles.indexOf(eigen[j]);
  alles[a] = eigen[j]; alles[b] = eigen[i];
  s.lagen = alles;
  return s;
}
/* De draaiing laten vastklikken op nette stappen, zoals de magneet in
   het voorbeeld. Uit staat hij vrij. */
function tenueHoekKlik(hoek, vast) {
  var n = tenueGetal(hoek, -3600, 3600, 0);
  if (vast) n = Math.round(n / TENUE_KLIK_STAP) * TENUE_KLIK_STAP;
  return ((n % 360) + 360) % 360;
}
/* Een laag verdubbelen, iets verschoven zodat je ziet dat er twee
   liggen. De kopie komt bovenop en krijgt een eigen nummer. */
function tenueLaagKopie(set, id) {
  var s = Object.assign({}, set);
  var alles = ((s.lagen) || []).map(tenueLaagVernieuw);
  var bron = alles.filter(function(l){ return l.id === id; })[0];
  if (!bron) return s;
  if (tenueLaagRuimte(s, bron.deel) <= 0) return s;
  var kopie = tenueLaagVernieuw(Object.assign({}, bron, {
    id:"l" + Math.random().toString(36).slice(2, 9),
    x: bron.x + 6, y: bron.y + 6
  }));
  s.lagen = alles.concat([kopie]);
  return s;
}
/* Een laag netjes midden op het kledingstuk leggen */
function tenueLaagMidden(set, id) {
  return tenueLaagZet(tenueLaagZet(set, id, "x", 50), id, "y", 50);
}
/* ── De tenues als PDF ──────────────────────────────────────
   De tekeningen worden niet nagebouwd maar overgenomen van het
   scherm: dan kan de PDF nooit iets anders laten zien dan wat je ziet
   staan. Een tekening wordt als afbeelding ingelezen en op een doek
   getekend, en dat doek gaat de PDF in. */
function tenueSvgNaarBeeld(svg, breed, hoog) {
  return new Promise(function(klaar, mis){
    var kopie = svg.cloneNode(true);
    kopie.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    kopie.setAttribute("width", breed);
    kopie.setAttribute("height", hoog);
    kopie.style.filter = "none";
    kopie.style.overflow = "visible";
    var tekst = new XMLSerializer().serializeToString(kopie);
    var beeld = new Image();
    beeld.onload = function(){ klaar(beeld); };
    beeld.onerror = function(){ mis(new Error("tekening kon niet worden ingelezen")); };
    beeld.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(tekst);
  });
}
/* Een tekening op een wit doek, klaar voor de PDF. Drie keer zo groot
   als hij in het document komt, anders wordt hij bij het afdrukken
   korrelig. */
function tenueDoekVan(svg, breedMm) {
  var schaal = 3, punten = breedMm * schaal * 4;
  var hoogte = punten * TENUE_VEL.h / TENUE_VEL.b;
  return tenueSvgNaarBeeld(svg, punten, hoogte).then(function(beeld){
    var doek = document.createElement("canvas");
    doek.width = punten; doek.height = hoogte;
    var t = doek.getContext("2d");
    t.fillStyle = "#ffffff"; t.fillRect(0, 0, punten, hoogte);
    t.drawImage(beeld, 0, 0, punten, hoogte);
    return doek;
  });
}
/* Het tenue als afbeelding: voor- en achterkant naast elkaar op een
   wit vlak. Op vier keer de tekenmaat, zodat hij ook op een grote
   telefoon of in een appje scherp blijft. */
function tenuePlaatje(svgVoor, svgAchter, breed) {
  var b = breed || 520;
  var hoog = Math.round(b * TENUE_VEL.h / TENUE_VEL.b);
  var marge = Math.round(b * 0.06);
  return Promise.all([
    tenueSvgNaarBeeld(svgVoor, b, hoog),
    tenueSvgNaarBeeld(svgAchter, b, hoog)
  ]).then(function(beelden){
    var doek = document.createElement("canvas");
    doek.width = b * 2 + marge * 3;
    doek.height = hoog + marge * 2;
    var t = doek.getContext("2d");
    t.fillStyle = "#ffffff"; t.fillRect(0, 0, doek.width, doek.height);
    t.drawImage(beelden[0], marge, marge, b, hoog);
    t.drawImage(beelden[1], marge * 2 + b, marge, b, hoog);
    return doek;
  });
}
/* Een bestandsnaam zonder rare tekens, zodat elk besturingssysteem
   hem accepteert. */
function tenueBestandsnaam(label) {
  var kaal = String(label || "tenue").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return "tenue-" + (kaal || "tenue") + "-fc-harlingen-jo19-2.png";
}
/* Welke kleuren er in een tenue zitten, met hun code erbij: dat is
   wat een leverancier nodig heeft. */
function tenueKleurlijst(set) {
  var s = Object.assign({}, STANDAARD_SET, set || {});
  var uit = [["Shirt", s.shirt], ["Tweede kleur", s.shirt2]];
  if (s.mouw) uit.push(["Mouwen", s.mouw]);
  uit.push(["Kraag en boorden", s.kraag], ["Broek", s.broek],
           ["Sokken", s.sokken], ["Naam en nummer", s.tekst]);
  return uit;
}
/* Wat er onder een tenue aan tekst komt te staan */
function tenueOmschrijving(set) {
  var s = Object.assign({}, STANDAARD_SET, set || {});
  var n = (s.lagen || []).length;
  var stukken = [n === 0 ? "geen opgelegde vormen"
                : n === 1 ? "1 opgelegde vorm" : n + " opgelegde vormen"];
  if (s.embleem) stukken.push("clubwapen");
  if (s.sponsor) stukken.push("sponsor " + s.sponsor);
  return stukken.join(", ");
}
/* ── Ongedaan maken ─────────────────────────────────────────
   Twee stapels: wat er was en wat je hebt teruggedraaid. Het rekenen
   staat hier los van het scherm, zodat het na te lopen is. */
const TENUE_HISTORIE_MAX = 40;
function tenueDuw(stapel, waarde) {
  return (stapel || []).concat([waarde]).slice(-TENUE_HISTORIE_MAX);
}
/* Iets nieuws doen: dat gaat op de stapel, en wat je had teruggedraaid
   vervalt. Anders zou opnieuw je naar een versie brengen die niet meer
   bij het huidige ontwerp past. */
function tenueOnthoud(nu, terug) {
  return {terug: tenueDuw(terug, nu), vooruit: []};
}
function tenueStapTerug(nu, terug, vooruit) {
  if (!terug || !terug.length) return null;
  return {waarde: terug[terug.length - 1],
          terug: terug.slice(0, -1),
          vooruit: [nu].concat(vooruit || []).slice(0, TENUE_HISTORIE_MAX)};
}
/* Een kleurenkiezer stuurt tijdens het slepen tientallen wijzigingen,
   en een getalveld één per toetsaanslag. Die horen bij elkaar: het is
   één handeling. Zonder dit gaat ongedaan maken per kleurtintje terug
   en lijkt het alsof de knop niets doet. */
const TENUE_GROEP_MS = 1200;
function tenueZelfdeHandeling(vorige, sleutel, nu) {
  if (!sleutel || !vorige || vorige.sleutel !== sleutel) return false;
  return (nu - vorige.tijd) < TENUE_GROEP_MS;
}
/* De hele beslissing in één keer: hoort dit bij de vorige handeling,
   en wat wordt de nieuwe stand? De tijd schuift altijd mee, ook als
   het dezelfde handeling is; anders knipt een lange sleepbeweging
   alsnog in stukken zodra hij langer duurt dan het venster. */
function tenueDaad(vorige, sleutel, nu) {
  var zelfde = tenueZelfdeHandeling(vorige, sleutel, nu);
  return {zelfde: zelfde, daad: {sleutel: sleutel || "", tijd: nu}};
}
function tenueStapVooruit(nu, terug, vooruit) {
  if (!vooruit || !vooruit.length) return null;
  return {waarde: vooruit[0],
          terug: tenueDuw(terug, nu),
          vooruit: vooruit.slice(1)};
}
/* Hoe breed de tekening op het scherm komt. Honderd procent is de
   grootste maat die nog helemaal in het vak past; daarboven ga je
   schuiven. Dit wordt uitgerekend en niet aan de opmaak overgelaten:
   een hoogte in procenten werkt niet door in een vak dat zelf ook al
   in procenten staat, en dan lijkt inzoomen niets te doen. */
function tenuePasBreedte(vakBreed, vakHoog) {
  var b = Number(vakBreed), hg = Number(vakHoog);
  if (!isFinite(b) || !isFinite(hg) || b <= 0 || hg <= 0) return 200;
  return Math.max(80, Math.min(b, hg * TENUE_VEL.b / TENUE_VEL.h));
}
/* ── Zoomen ─────────────────────────────────────────────────
   Vaste stappen in plaats van vrij schuiven: dan land je altijd op
   een ronde vergroting en kun je met twee klikken terug naar honderd
   procent. */
const TENUE_ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 10, 14, 20];
function tenueZoomKlem(v) {
  var n = Number(v);
  if (!isFinite(n)) return 1;
  return Math.max(TENUE_ZOOMS[0], Math.min(TENUE_ZOOMS[TENUE_ZOOMS.length - 1], n));
}
/* De eerstvolgende stap omhoog of omlaag. Zit je tussen twee stappen
   in, bijvoorbeeld na knijpen op een trackpad, dan gaat hij naar de
   eerste stap die echt de goede kant op ligt. */
function tenueZoomStap(nu, omhoog) {
  var v = tenueZoomKlem(nu);
  if (omhoog) {
    for (var i = 0; i < TENUE_ZOOMS.length; i++)
      if (TENUE_ZOOMS[i] > v + 1e-9) return TENUE_ZOOMS[i];
    return TENUE_ZOOMS[TENUE_ZOOMS.length - 1];
  }
  for (var j = TENUE_ZOOMS.length - 1; j >= 0; j--)
    if (TENUE_ZOOMS[j] < v - 1e-9) return TENUE_ZOOMS[j];
  return TENUE_ZOOMS[0];
}
/* De acht handvatten om een laag. sx en sy vertellen aan welke kant
   het handvat zit: -1 links of boven, 1 rechts of onder, 0 in het
   midden van die zijde. */
/* De sleutel heet nadrukkelijk naam en niet id: een laag heeft ook
   een id, en toen die twee allebei id heetten won bij het samenvoegen
   de naam van het handvat. Het slepen keek daarna naar de verkeerde
   laag en deed niets. */
const TENUE_GREPEN = [
  {naam:"nw", sx:-1, sy:-1}, {naam:"n",  sx: 0, sy:-1}, {naam:"ne", sx: 1, sy:-1},
  {naam:"w",  sx:-1, sy: 0},                            {naam:"e",  sx: 1, sy: 0},
  {naam:"sw", sx:-1, sy: 1}, {naam:"s",  sx: 0, sy: 1}, {naam:"se", sx: 1, sy: 1}
];
/* Aan een handvat trekken. De overkant blijft liggen, want dat is wat
   je verwacht als je aan een hoek trekt: alleen die hoek beweegt.
   px en py zijn punten op het tenuevel, niet op het scherm. */
function tenueTrek(laag, stuk, greep, px, py) {
  var m = tenueLaagMaat(laag, stuk);
  var r = m.hoek * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
  var sx = (greep && greep.sx) || 0, sy = (greep && greep.sy) || 0;
  /* Het handvat aan de overkant blijft op zijn plek liggen. De nieuwe
     maat wordt vanaf dát punt gemeten en niet vanaf het oude midden:
     anders wordt de vorm twee keer zo groot als je vraagt, want het
     midden schuift zelf ook mee. */
  var ax = m.cx + co * (-sx * m.hw) - si * (-sy * m.hh);
  var ay = m.cy + si * (-sx * m.hw) + co * (-sy * m.hh);
  var dx = px - ax, dy = py - ay;
  var lx =  dx * co + dy * si;
  var ly = -dx * si + dy * co;
  var min = 4 / 100 * m.eenheid / 2, max = 200 / 100 * m.eenheid / 2;
  var hw = sx ? Math.min(max, Math.max(min, sx * lx / 2)) : m.hw;
  var hh = sy ? Math.min(max, Math.max(min, sy * ly / 2)) : m.hh;
  var cx = ax + co * (sx * hw) - si * (sy * hh);
  var cy = ay + si * (sx * hw) + co * (sy * hh);
  return {x: (cx - m.vak.x) / m.vak.b * 100,
          y: (cy - m.vak.y) / m.vak.h * 100,
          breed: hw * 2 / m.eenheid * 100,
          hoog:  hh * 2 / m.eenheid * 100};
}
/* Hoeveel graden staat de vinger ten opzichte van het middelpunt? Het
   draaiknopje hangt bóven de vorm, dus bij hoek nul wijst het omhoog. */
function tenueDraaiNaar(laag, stuk, px, py, vast) {
  var m = tenueLaagMaat(laag, stuk);
  var g = Math.atan2(py - m.cy, px - m.cx) * 180 / Math.PI + 90;
  return tenueHoekKlik(g, vast);
}
/* Hoe licht een kleur is, van 0 tot 1. Hiermee kan ik waarschuwen dat
   een rugnummer wegvalt tegen het shirt. */
function kleurHelder(hex) {
  var m = /^#?([0-9a-f]{6})$/i.exec(String(hex||"").trim());
  if (!m) return 0.5;
  var n = parseInt(m[1], 16);
  var d = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function(v){
    var c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126*d[0] + 0.7152*d[1] + 0.0722*d[2];
}
function tenueContrast(a, b) {
  var x = kleurHelder(a) + 0.05, y = kleurHelder(b) + 0.05;
  return x > y ? x / y : y / x;
}
/* Waar het rugnummer op kan komen te liggen. Op een effen shirt is
   dat één kleur; zodra er een patroon op zit valt het nummer deels op
   de ene en deels op de andere kleur, en moet het tegen allebei
   afsteken. Alleen naar de tweede kleur kijken is te makkelijk. */
function tenueNummerOnder(set) {
  var s = Object.assign({}, STANDAARD_SET, set || {});
  if (s.patroon === "effen" || s.patroon === "mouwen") return [s.shirt];
  return [s.shirt, s.shirt2];
}
/* Waar de ontwerper voor waarschuwt. Leeg is goed. */
function tenueWaarschuwing(set) {
  var s = Object.assign({}, STANDAARD_SET, set || {});
  var slechtst = tenueNummerOnder(s).reduce(function(laag, kl){
    return Math.min(laag, tenueContrast(s.tekst, kl));
  }, 99);
  if (slechtst < 2.2)
    return "Het rugnummer valt bijna weg tegen het shirt.";
  if (s.patroon !== "effen" && tenueContrast(s.shirt, s.shirt2) < 1.5)
    return "De twee shirtkleuren lijken zo veel op elkaar dat je het patroon niet ziet.";
  return "";
}
/* Twee tenues moeten uit elkaar te houden zijn op het veld */
function tenueBotst(a, b) {
  return tenueContrast((a||{}).shirt, (b||{}).shirt) < 1.6;
}

/* ═══════════════════════════════════════════════════════════
   SPELREGELQUIZ
   De vragen komen uit de spelregels van de KNVB, die de Laws of
   the Game van de IFAB volgt. Elke ronde worden er vijf getrokken
   uit de bank en worden ook de antwoorden door elkaar gehusseld,
   dus je krijgt nooit twee keer hetzelfde rijtje.
═══════════════════════════════════════════════════════════ */
const QUIZ_KEY = "fch_quiz_v1";
const QUIZ_AANTAL = 5;

const QUIZ_CATEGORIEEN = [
  {id:"buitenspel",   label:"Buitenspel",     kleur:"#0891b2"},
  {id:"overtreding",  label:"Overtredingen",  kleur:"#b3261e"},
  {id:"hervatting",   label:"Spelhervatting", kleur:"#0d9488"},
  {id:"keeper",       label:"De keeper",      kleur:"#7c3aed"},
  {id:"kaarten",      label:"Kaarten",        kleur:"#e08a0b"},
  {id:"veld",         label:"Veld en spel",   kleur:"#004aad"}
];
function quizCategorie(id) {
  return QUIZ_CATEGORIEEN.filter(function(c){ return c.id===id; })[0] || QUIZ_CATEGORIEEN[5];
}

const QUIZ_VRAGEN = [
  /* ── Buitenspel ── */
  {id:"b1", cat:"buitenspel", vraag:"Wanneer wordt buitenspel beoordeeld?",
   opties:["Op het moment dat de bal gespeeld wordt door een medespeler",
           "Op het moment dat de speler de bal aanneemt",
           "Op het moment dat de scheidsrechter fluit"],
   goed:0, uitleg:"Het moment van spelen telt, niet het moment van aannemen. Daarom kan een speler die bij de pass gelijk staat, daarna gewoon doorlopen."},
  {id:"b2", cat:"buitenspel", vraag:"Kun je buitenspel staan uit een inworp?",
   opties:["Nee, nooit","Ja, altijd","Alleen op de helft van de tegenstander"],
   goed:0, uitleg:"Uit een inworp kun je niet buitenspel staan. Hetzelfde geldt voor een hoekschop en een doelschop."},
  {id:"b3", cat:"buitenspel", vraag:"Een speler staat buitenspel maar raakt de bal niet en hindert niemand. Wat beslist de scheidsrechter?",
   opties:["Doorspelen, hij is niet strafbaar","Vrije trap tegen","Vrije trap tegen én geel"],
   goed:0, uitleg:"Buitenspel staan is niet strafbaar. Pas als hij het spel beïnvloedt, een tegenstander hindert of voordeel trekt uit die positie, wordt er gefloten."},
  {id:"b4", cat:"buitenspel", vraag:"Bepaalt de laatste verdediger de buitenspellijn?",
   opties:["Nee, de op één na laatste tegenstander of de bal, wat verder is",
           "Ja, altijd de laatste verdediger",
           "Nee, altijd de middenlijn"],
   goed:0, uitleg:"Meestal is de keeper de laatste en de laatste verdediger dus de op één na laatste. Staat de keeper eruit, dan telt de op één na laatste veldspeler."},

  /* ── Overtredingen ── */
  {id:"o1", cat:"overtreding", vraag:"Een verdediger raakt in het strafschopgebied de bal met de hand, zonder opzet, na een schot van dichtbij tegen zijn arm die langs zijn lichaam hangt. Wat is de beslissing?",
   opties:["Doorspelen","Strafschop","Strafschop en geel"],
   goed:0, uitleg:"Een arm die dicht langs het lichaam hangt maakt het lichaam niet onnatuurlijk groter. Bij een schot van dichtbij zonder die onnatuurlijke houding wordt er niet gefloten."},
  {id:"o2", cat:"overtreding", vraag:"Wat is het gevolg als een aanvaller de bal met de hand in het doel werkt?",
   opties:["Doel afgekeurd, vrije trap tegen","Doel afgekeurd, vrije trap tegen en geel","Het doel telt gewoon"],
   goed:1, uitleg:"Scoren met de hand is altijd strafbaar, ook als het per ongeluk gebeurt, en levert een gele kaart op."},
  {id:"o3", cat:"overtreding", vraag:"Een speler maakt een overtreding buiten het strafschopgebied, maar de bal ligt erbinnen. Waar wordt hervat?",
   opties:["Op de plek van de overtreding","Op de plek van de bal","Op de rand van het strafschopgebied"],
   goed:0, uitleg:"Er wordt hervat waar de overtreding gebeurde, niet waar de bal lag."},
  {id:"o4", cat:"overtreding", vraag:"Mag je een tegenstander wegduwen om bij de bal te komen?",
   opties:["Nee, dat is een directe vrije trap","Ja, als je zelf ook naar de bal speelt","Ja, met de schouder mag alles"],
   goed:0, uitleg:"Duwen is een van de overtredingen die altijd een directe vrije trap oplevert. Een schouderduel mag wél, maar dan met de schouder en met de bal binnen speelbereik."},

  /* ── Spelhervatting ── */
  {id:"h1", cat:"hervatting", vraag:"Kun je rechtstreeks scoren uit een hoekschop?",
   opties:["Ja","Nee, hij moet eerst iemand raken","Alleen bij een indirecte hoekschop"],
   goed:0, uitleg:"Uit een hoekschop mag rechtstreeks gescoord worden. Dat kan alleen in het doel van de tegenstander, niet in je eigen doel."},
  {id:"h2", cat:"hervatting", vraag:"Hoe ver moeten tegenstanders bij een vrije trap van de bal blijven?",
   opties:["Minstens 9,15 meter","Minstens 5 meter","Minstens 11 meter"],
   goed:0, uitleg:"Negen meter vijftien, oftewel tien yards. Bij een muur van drie of meer verdedigers moeten aanvallers minstens één meter van die muur blijven."},
  {id:"h3", cat:"hervatting", vraag:"Wat gebeurt er als een inworp verkeerd genomen wordt?",
   opties:["Inworp voor de tegenpartij","Overnemen","Vrije trap voor de tegenpartij"],
   goed:0, uitleg:"Bij een foute inworp — bijvoorbeeld met één hand of met een voet van de grond — gaat de bal naar de tegenpartij."},
  {id:"h4", cat:"hervatting", vraag:"Mag de nemer van een vrije trap de bal twee keer achter elkaar raken?",
   opties:["Nee, indirecte vrije trap tegen","Ja, dat mag","Ja, maar alleen buiten het strafschopgebied"],
   goed:0, uitleg:"Wie een spelhervatting neemt mag de bal pas weer raken als iemand anders hem heeft aangeraakt. Gebeurt dat toch, dan volgt een indirecte vrije trap."},
  {id:"h5", cat:"hervatting", vraag:"Bij een scheidsrechtersbal: wie krijgt de bal?",
   opties:["De ploeg die hem het laatst raakte, of de keeper bij een onderbreking in het strafschopgebied",
           "Beide ploegen, ze duelleren erom",
           "De ploeg die het laatst scoorde"],
   goed:0, uitleg:"Er wordt niet meer geduelleerd om een scheidsrechtersbal. De bal gaat naar één speler; alle anderen blijven op minstens vier meter."},

  /* ── De keeper ── */
  {id:"k1", cat:"keeper", vraag:"Hoe lang mag een keeper de bal sinds 2025 in zijn handen houden?",
   opties:["Acht seconden","Zes seconden","Tien seconden"],
   goed:0, uitleg:"Sinds het seizoen 2025/26 is dat acht seconden. De scheidsrechter telt de laatste vijf zichtbaar af. Duurt het langer, dan volgt een hoekschop voor de tegenpartij — vroeger was dat een indirecte vrije trap."},
  {id:"k2", cat:"keeper", vraag:"Een verdediger speelt de bal bewust met de voet terug naar de keeper. Mag die hem oppakken?",
   opties:["Nee, indirecte vrije trap tegen","Ja","Ja, maar alleen buiten het doelgebied"],
   goed:0, uitleg:"De terugspeelregel: een bewust met de voet teruggespeelde bal mag de keeper niet met de handen spelen. Kopt of borst een medespeler hem terug, dan mag het wel."},
  {id:"k3", cat:"keeper", vraag:"Mag de keeper bij een strafschop bewegen voordat er geschoten wordt?",
   opties:["Ja, zijwaarts, maar hij moet met minstens één voet op of boven de doellijn blijven",
           "Nee, hij moet volledig stilstaan",
           "Ja, hij mag doen wat hij wil"],
   goed:0, uitleg:"Hij mag bewegen, maar niet vooruit van de lijn af: minstens één voet moet op of boven de doellijn blijven tot de bal geschopt is."},
  {id:"k4", cat:"keeper", vraag:"De keeper pakt buiten het strafschopgebied de bal met de hand. Wat volgt?",
   opties:["Directe vrije trap, en meestal een kaart","Indirecte vrije trap","Doorspelen"],
   goed:0, uitleg:"Buiten zijn gebied is de keeper een gewone veldspeler. Handsbal levert een directe vrije trap op, en als hij daarmee een duidelijke scoringskans wegneemt zelfs rood."},

  /* ── Kaarten ── */
  {id:"c1", cat:"kaarten", vraag:"Wat levert een rode kaart op bij het neerhalen van een doorgebroken speler?",
   opties:["Rood als er geen duidelijke poging tot de bal was; anders geel",
           "Altijd rood","Altijd geel"],
   goed:0, uitleg:"Bij een duidelijke scoringskans in het strafschopgebied wordt het geel als er een echte poging tot de bal was. Buiten het gebied, of zonder poging tot de bal, blijft het rood."},
  {id:"c2", cat:"kaarten", vraag:"Een speler trekt zijn shirt uit bij het vieren van een doelpunt. Wat volgt?",
   opties:["Geel","Niets","Rood"],
   goed:0, uitleg:"Shirt uit bij een viering is altijd geel, ook als het doelpunt de winnende was en zelfs als het je tweede gele kaart wordt."},
  {id:"c3", cat:"kaarten", vraag:"Wanneer krijgt een speler geel voor natrappen op de bal na een fluitsignaal?",
   opties:["Als het onsportief is of het spel ophoudt","Nooit","Alleen bij herhaling"],
   goed:0, uitleg:"De bal wegtrappen of vasthouden om een snelle hervatting te voorkomen valt onder onsportief gedrag en levert geel op."},

  /* ── Veld en spel ── */
  {id:"v1", cat:"veld", vraag:"Is de bal uit als hij op de lijn ligt?",
   opties:["Nee, de bal moet er helemaal over","Ja, zodra hij de lijn raakt","Dat bepaalt de grensrechter"],
   goed:0, uitleg:"De hele bal moet volledig over de hele lijn. Ligt er nog een randje boven de lijn, dan is hij in het spel."},
  {id:"v2", cat:"veld", vraag:"Hoe breed is een doel?",
   opties:["7,32 meter","6,50 meter","8,00 meter"],
   goed:0, uitleg:"7,32 meter breed en 2,44 meter hoog — acht bij acht yards. De doelpalen mogen niet dikker zijn dan twaalf centimeter."},
  {id:"v3", cat:"veld", vraag:"Hoe ver ligt de strafschopstip van de doellijn?",
   opties:["11 meter","9,15 meter","16,5 meter"],
   goed:0, uitleg:"Elf meter. De boog buiten het strafschopgebied is de cirkel van 9,15 meter om die stip; daar mogen bij een strafschop geen spelers in staan."},
  {id:"v4", cat:"veld", vraag:"Mag een doelpunt rechtstreeks uit een doelschop?",
   opties:["Ja, maar alleen in het doel van de tegenstander","Nee","Ja, ook in eigen doel"],
   goed:0, uitleg:"Rechtstreeks scoren uit een doelschop mag. Gaat hij rechtstreeks in eigen doel, dan is het een hoekschop voor de tegenpartij."},
  {id:"v5", cat:"veld", vraag:"Sinds wanneer mag de bal bij een doelschop binnen het strafschopgebied worden aangenomen?",
   opties:["Dat mag: de bal is in het spel zodra hij getrapt is",
           "Dat mag niet, hij moet het gebied uit",
           "Alleen door de keeper"],
   goed:0, uitleg:"De bal is in het spel zodra hij duidelijk bewogen is. Medespelers mogen dus binnen het strafschopgebied aannemen; tegenstanders moeten er wel buiten blijven tot dat moment."},
  {id:"v6", cat:"veld", vraag:"Een speler scoort rechtstreeks uit de aftrap. Telt dat?",
   opties:["Ja","Nee, hij moet eerst iemand raken","Alleen in de tweede helft"],
   goed:0, uitleg:"Rechtstreeks scoren uit de aftrap mag. Gaat hij in eigen doel, dan is het een hoekschop voor de tegenpartij."}
];

/* De bonusvraag: hier teken je het antwoord in plaats van te kiezen. */
const QUIZ_TEKENVRAGEN = [
  {id:"t1", vraag:"Vrije trap voor de tegenstander, twintig meter recht voor het doel. Teken waar jullie muur komt te staan en wie waar staat.",
   uitleg:"De muur staat op 9,15 meter van de bal, op de lijn tussen de bal en de dichtstbijzijnde paal, zodat die hoek dicht zit. De keeper dekt de andere helft. Eén speler blijft bij de muur voor de korte variant, en twee spelers blijven achter tegen de counter."},
  {id:"t2", vraag:"Hoekschop tegen. Teken hoe jullie verdedigen: wie op de palen, wie op de man, en wie vangt de tweede bal op.",
   uitleg:"Twee spelers op de palen, mandekking op hun gevaarlijkste koppers, één speler op de korte variant en één aan de rand van de zestien voor de bal die terugvalt. Eén speler blijft voorin staan voor de counter."},
  {id:"t3", vraag:"Teken de buitenspellijn op het moment dat jullie spits wordt ingespeeld, en zet de op één na laatste verdediger erop.",
   uitleg:"De lijn loopt door de op één na laatste tegenstander — meestal de laatste veldspeler, omdat de keeper de laatste is. De spits mag daar gelijk mee staan, maar niet voorbij, op het moment dat de bal gespeeld wordt."},
  {id:"t4", vraag:"Jullie nemen een hoekschop. Teken de looplijnen: wie gaat naar de eerste paal, wie naar de tweede, en wie blijft achter.",
   uitleg:"Eén speler kort naar de eerste paal om te verlengen, één die op de tweede paal induikt, één aan de rand van de zestien voor de terugvallende bal, en twee spelers achter de bal tegen de tegenaanval."},
  {id:"t5", vraag:"De keeper heeft de bal in zijn handen en wil snel omschakelen. Teken waar jullie spelers zich aanbieden.",
   uitleg:"Breed en diep tegelijk: de backs opengaan langs de lijn, een middenvelder die zich vrijloopt in de ruimte, en de spits die diep dreigt zodat de tegenstander niet kan opschuiven."}
];

/* Een lijst door elkaar husselen. Fisher-Yates, want dat is de enige
   manier die elke volgorde even waarschijnlijk maakt. */
function quizHussel(lijst, toeval) {
  var uit = (lijst||[]).slice();
  var r = toeval || Math.random;
  for (var i = uit.length - 1; i > 0; i--) {
    var j = Math.floor(r() * (i + 1));
    var t = uit[i]; uit[i] = uit[j]; uit[j] = t;
  }
  return uit;
}
/* Vijf vragen trekken, en vragen die je net had zoveel mogelijk
   overslaan. Zijn er te weinig over, dan vullen we aan met de rest —
   liever een herhaling dan een korte quiz. */
function quizTrek(bank, recent, aantal, toeval) {
  var n = aantal || QUIZ_AANTAL;
  var gehad = {};
  (recent||[]).forEach(function(id){ gehad[id] = true; });
  var vers = (bank||[]).filter(function(v){ return !gehad[v.id]; });
  var oud  = (bank||[]).filter(function(v){ return gehad[v.id]; });
  var uit = quizHussel(vers, toeval).slice(0, n);
  if (uit.length < n) uit = uit.concat(quizHussel(oud, toeval).slice(0, n - uit.length));
  return uit;
}
/* De antwoorden husselen, met het goede antwoord mee. Zo herken je een
   vraag niet aan de plek van het juiste antwoord. */
function quizHusselOpties(vraag, toeval) {
  var paren = vraag.opties.map(function(tekst, i){ return {tekst:tekst, goed: i===vraag.goed}; });
  var door = quizHussel(paren, toeval);
  return {
    id: vraag.id, cat: vraag.cat, vraag: vraag.vraag, uitleg: vraag.uitleg,
    opties: door.map(function(p){ return p.tekst; }),
    goed: door.findIndex(function(p){ return p.goed; })
  };
}
/* Een hele ronde klaarzetten */
function quizRonde(recent, toeval) {
  var vragen = quizTrek(QUIZ_VRAGEN, recent, QUIZ_AANTAL, toeval)
    .map(function(v){ return quizHusselOpties(v, toeval); });
  var bonus = quizHussel(QUIZ_TEKENVRAGEN, toeval)[0];
  return {vragen: vragen, bonus: bonus};
}
/* Hoe deed je het? */
function quizOordeel(goed, totaal) {
  var p = totaal ? goed/totaal : 0;
  if (p === 1)    return {kop:"Alles goed!", tekst:"Je kent de spelregels beter dan menig scheidsrechter."};
  if (p >= 0.8)   return {kop:"Sterk",       tekst:"Bijna alles goed. Eén om nog even na te lezen."};
  if (p >= 0.6)   return {kop:"Redelijk",    tekst:"De basis zit erin, maar er valt nog wat te halen."};
  if (p >= 0.4)   return {kop:"Kan beter",   tekst:"Lees de uitleg bij de vragen die je fout had eens rustig door."};
  return {kop:"Oefenen", tekst:"De spelregels zijn nog wat wennen. Probeer het gerust nog eens."};
}

/* ═══════════════════════════════════════════════════════════
   SPORTPARK
   Een raster waarop je je eigen complex neerzet. Elk onderdeel
   beschrijft zichzelf als een lijstje vormen in eigen maten;
   het scherm tekent die als SVG, de deelknop tekent precies
   dezelfde vormen op een canvas. Zo kunnen die twee niet uit
   elkaar lopen — dat is bij het voetbalveld eerder misgegaan.
═══════════════════════════════════════════════════════════ */
const SPORTPARK_KEY = "fch_sportpark_v1";
/* Het park waar je nu aan werkt staat in SPORTPARK_KEY; hieronder
   passen vijf bewaarde versies. Meer dan vijf wordt een lijst waar
   je toch niets meer in terugvindt. */
const SPORTPARKEN_KEY = "fch_sportparken_v1";
const PARK_MAX_BEWAARD = 5;

function parkKopie(stukken) {
  /* Een echte kopie, anders verandert een bewaard park mee zodra je
     verder bouwt — dat kostte me bij de formaties ooit een middag. */
  return (stukken || []).map(function(s){ return Object.assign({}, s); });
}
function parkBewaardeNaam(parken, voorstel) {
  var namen = (parken || []).map(function(x){ return (x.naam||"").toLowerCase(); });
  var naam = (voorstel || "").trim() || "Sportpark";
  if (namen.indexOf(naam.toLowerCase()) < 0) return naam;
  for (var i = 2; i < 99; i++) {
    if (namen.indexOf((naam + " " + i).toLowerCase()) < 0) return naam + " " + i;
  }
  return naam;
}
/* Eén vakje is ongeveer tien meter, dus het terrein is 480 bij 320
   meter. Een wedstrijdveld van 105 bij 68 meter wordt daarmee 11 bij
   7 vakjes; twee velden naast elkaar met een tribune ertussen passen
   ruim, en er blijft plek over om uit te breiden. */
const PARK_KOLOMMEN = 192, PARK_RIJEN = 128;
const PARK_METER = 2.5;
/* Het hulpraster in de scène tekenen we grover dan we rekenen, anders
   kijk je tegen een dicht gaas aan. */
const PARK_RASTER_STAP = 4;

/* Kleuren op één plek, zodat het geheel bij elkaar past */
const PARK_KLEUR = {
  gras:"#48a04d", grasDonker:"#347a38", lijn:"rgba(255,255,255,.75)",
  steen:"#c8cdd4", steenDonker:"#aab1ba", dak:"#8b5e3c", dakDonker:"#754e32",
  asfalt:"#5b616b", asfaltLijn:"rgba(255,255,255,.55)",
  hout:"#a97142", blad:"#2f7d32", bladLicht:"#4caf50",
  metaal:"#9aa1aa", zand:"#d9c9a3", water:"#4a90d9", rood:"#b3261e", blauw:"#004aad",
  kunstgras:"#3f9450", haag:"#2e6b34",
  /* Kale plek: doorgelopen gras, niet helemaal zand */
  sleet:"rgba(150,132,86,.34)"
};

/* Kleine hulpjes om vormen te maken; scheelt herhaling hieronder */
function pvRect(x,y,b,h,vul,extra) { return Object.assign({soort:"rect",x:x,y:y,b:b,h:h,vul:vul}, extra||{}); }
function pvLijn(x1,y1,x2,y2,kleur,dikte) { return {soort:"lijn",x1:x1,y1:y1,x2:x2,y2:y2,lijn:kleur,dikte:dikte||0.04}; }
function pvCirkel(x,y,r,vul,extra) { return Object.assign({soort:"cirkel",x:x,y:y,r:r,vul:vul}, extra||{}); }

/* Het maaipatroon van een grasveld. Een maaimachine laat een spoor
   na dat licht of donker oogt afhankelijk van welke kant het gras op
   ligt; welke vorm hij rijdt is een keuze van de terreinknecht. */
function pvMaaien(b, h, langsX, lengte, breedte, patroon) {
  var D = PARK_KLEUR.grasDonker, v = [];
  var soort = (patroon || "banen");
  var breed = 6 / PARK_METER;                 /* een baan is zes meter */
  if (soort === "glad") return v;

  if (soort === "banen" || soort === "lengte") {
    /* "banen" loopt dwars op de lengte, "lengte" van doel naar doel */
    var overLengte = (soort === "banen");
    var langs = overLengte ? lengte : breedte;
    var n = Math.max(4, Math.round(langs / breed));
    for (var i = 1; i < n; i += 2) {
      var dwars = (overLengte === langsX);
      if (dwars) v.push(pvRect(i*b/n, 0, b/n, h, D));
      else       v.push(pvRect(0, i*h/n, b, h/n, D));
    }
    return v;
  }
  if (soort === "blokken") {
    var kx = Math.max(3, Math.round(b / breed));
    var ky = Math.max(2, Math.round(h / breed));
    for (var x = 0; x < kx; x++) for (var y = 0; y < ky; y++) {
      if ((x + y) % 2) v.push(pvRect(x*b/kx, y*h/ky, b/kx, h/ky, D));
    }
    return v;
  }
  if (soort === "diagonaal") {
    /* Schuine banen, getekend als een trapje van smalle balkjes: de
       tekening kent geen schuine vlakken. Elk balkje wordt links,
       rechts én onderaan afgesneden op de rand van het veld — anders
       loopt de onderste rij het gras naast het veld op. */
    /* De traphoogte is een vaste maat en geen deel van de velddiepte:
       zo ziet de diagonaal er op een pupillenveld hetzelfde uit als
       op een heel veld. Dat betekent wel dat de onderste tree er
       meestal niet meer precies op past, vandaar het afsnijden. */
    var stap = breed, dik = breed / 3, aantal = Math.ceil((b + h) / stap);
    for (var d = 0; d < aantal; d += 2) {
      for (var yy = 0; yy < h - 1e-9; yy += dik) {
        var hoog = Math.min(dik, h - yy);
        var xx = d*stap - yy;
        var links = Math.max(0, xx), rechts = Math.min(b, xx + stap);
        if (rechts > links) v.push(pvRect(links, yy, rechts - links, hoog, D));
      }
    }
    return v;
  }
  if (soort === "cirkels") {
    var groot = Math.sqrt(b*b + h*h) / 2;
    var ringen = Math.max(3, Math.round(groot / breed));
    for (var r = ringen; r >= 1; r--) {
      v.push(pvCirkel(b/2, h/2, groot * r/ringen, r % 2 ? D : PARK_KLEUR.gras));
    }
    return v;
  }
  return v;
}

/* Een voetbalveld van b bij h vakjes, met de lijnen erop */
function pvVeld(b, h, metLijnen, kunst, patroon) {
  /* De lengte van een veld loopt over de langste zijde, en de doelen
     staan op de korte zijden. Alle markeringen zijn afgeleid van de
     echte maten van een wedstrijdveld (105 bij 68 meter) en schalen
     mee, zodat een pupillenveld dezelfde verhoudingen houdt. */
  var langsX = b >= h;
  var lengte  = langsX ? b : h;
  var breedte = langsX ? h : b;

  /* Banen van vijf à zes meter, dwars op de lengte — zoals een
     maaimachine ze rijdt. */
  var v = [pvRect(0, 0, b, h, kunst ? PARK_KLEUR.kunstgras : PARK_KLEUR.gras, {r:0.12})];
  /* Kunstgras wordt niet gemaaid, dus daar horen geen banen op. Dat is
     op de luchtfoto van de Vierkantsdijk precies het verschil tussen
     het middelste veld en de twee grasvelden ernaast. */
  if (!kunst) v = v.concat(pvMaaien(b, h, langsX, lengte, breedte, patroon));
  var m = 0.28, L = PARK_KLEUR.lijn, d = 0.06;
  var sl = lengte - 2*m, sb = breedte - 2*m;          /* speelvlak */

  /* Waar het meest gelopen wordt is het gras kaal: voor de doelen en
     rond de middenstip. Kunstgras slijt niet zo, dus daar niet. */
  if (!kunst) {
    var kaalB = sb * 0.26, kaalD = sl * 0.075;
    [[0, "start"], [sl - kaalD, "eind"]].forEach(function(q){
      var p = langsX ? [m + q[0], m + (sb - kaalB)/2] : [m + (sb - kaalB)/2, m + q[0]];
      v.push(pvRect(p[0], p[1], langsX ? kaalD : kaalB, langsX ? kaalB : kaalD,
                    PARK_KLEUR.sleet, {r: Math.min(kaalB, kaalD) * 0.4}));
    });
    v.push(pvCirkel(b/2, h/2, Math.min(sl, sb) * 0.045, PARK_KLEUR.sleet));
  }

  if (!metLijnen) return v;
  /* Verhoudingen van een echt veld */
  var zestienB = sb * (40.32/68), zestienD = sl * (16.5/105);
  var vijfB    = sb * (18.32/68), vijfD    = sl * (5.5/105);
  var stipD    = sl * (11/105);
  var cirkelR  = sb * (9.15/68);
  var hoekR    = Math.min(sl, sb) * 0.02;

  /* In veldcoördinaten: x langs de lengte, y over de breedte. Daarna
     omzetten naar de tekening, zodat één beschrijving beide
     richtingen bedient. */
  function P(x, y) { return langsX ? [m + x, m + y] : [m + y, m + x]; }
  function vlak(x, y, bb, hh, opties) {
    /* pvRect neemt de vulkleur als vijfde argument, niet het hele
       optieobject — dat kostte me net een lege tekening. */
    var p = P(x, y);
    return pvRect(p[0], p[1], langsX ? bb : hh, langsX ? hh : bb, opties.vul, opties);
  }
  function lijn(x1, y1, x2, y2) {
    var a = P(x1, y1), c = P(x2, y2);
    return pvLijn(a[0], a[1], c[0], c[1], L, d);
  }

  v.push(vlak(0, 0, sl, sb, {vul:"none", lijn:L, dikte:d}));
  v.push(lijn(sl/2, 0, sl/2, sb));                                  /* middenlijn */
  var mid = P(sl/2, sb/2);
  v.push(pvCirkel(mid[0], mid[1], cirkelR, "none", {lijn:L, dikte:d}));
  v.push(pvCirkel(mid[0], mid[1], 0.09, L));
  /* Strafschopgebieden en doelgebieden aan beide korte zijden */
  [0, 1].forEach(function(kant){
    var x0 = kant ? sl - zestienD : 0;
    v.push(vlak(x0, (sb - zestienB)/2, zestienD, zestienB, {vul:"none", lijn:L, dikte:d}));
    var x1 = kant ? sl - vijfD : 0;
    v.push(vlak(x1, (sb - vijfB)/2, vijfD, vijfB, {vul:"none", lijn:L, dikte:d}));
    var stip = P(kant ? sl - stipD : stipD, sb/2);
    v.push(pvCirkel(stip[0], stip[1], 0.09, L));
  });
  /* Hoekbogen als kleine kwartcirkeltjes, met vier lijntjes benaderd */
  [[0,0],[sl,0],[0,sb],[sl,sb]].forEach(function(hk){
    var tx = hk[0] === 0 ? 1 : -1, ty = hk[1] === 0 ? 1 : -1;
    for (var k = 0; k < 4; k++) {
      var a1 = (k/4) * Math.PI/2, a2 = ((k+1)/4) * Math.PI/2;
      v.push(lijn(hk[0] + tx*hoekR*Math.cos(a1), hk[1] + ty*hoekR*Math.sin(a1),
                  hk[0] + tx*hoekR*Math.cos(a2), hk[1] + ty*hoekR*Math.sin(a2)));
    }
  });
  return v;
}
/* ── Variatie die vastligt ─────────────────────────────────
   Twee bomen naast elkaar horen niet identiek te zijn, maar een boom
   mag ook niet bij elke muisbeweging van kleur verschieten. Daarom
   geen toeval maar een vaste ruis: dezelfde sleutel geeft altijd
   hetzelfde getal tussen 0 en 1. */
function parkRuis(sleutel, nummer) {
  var s = String(sleutel) + "|" + (nummer || 0);
  var g = 2166136261;
  for (var i = 0; i < s.length; i++) {
    g ^= s.charCodeAt(i);
    g = Math.imul(g, 16777619);
  }
  return ((g >>> 0) % 1000003) / 1000003;
}
/* Bladgroen laten verschillen in helderheid én in warmte: de ene boom
   wat geliger, de andere wat blauwer. Alleen lichter en donkerder
   maken geeft te weinig verschil om twintig bomen uit elkaar te
   houden. Beide waarden lopen van 0 tot 1. */
function parkBladTint(basis, licht, warmte) {
  var v = String(basis).replace("#", "");
  if (v.length !== 6) return basis;
  var l = (licht - 0.5) * 0.34;
  var w = (warmte - 0.5) * 0.30;
  var kanaal = [ 1 + w*0.9, 1 + w*0.1, 1 - w*1.1 ];   /* rood op, blauw af = warmer */
  var uit = "#";
  for (var i = 0; i < 3; i++) {
    var k = parseInt(v.substr(i*2, 2), 16) * kanaal[i];
    k = l >= 0 ? k + (255 - k) * l : k * (1 + l);
    k = Math.max(0, Math.min(255, Math.round(k)));
    uit += (k < 16 ? "0" : "") + k.toString(16);
  }
  return uit;
}
/* Een kleur iets lichter of donkerder maken. -1 tot 1. */
function parkTint(hex, verschuiving) {
  var v = String(hex).replace("#", "");
  if (v.length !== 6) return hex;
  var uit = "#";
  for (var i = 0; i < 3; i++) {
    var k = parseInt(v.substr(i*2, 2), 16);
    k = verschuiving >= 0 ? k + (255 - k) * verschuiving : k * (1 + verschuiving);
    k = Math.max(0, Math.min(255, Math.round(k)));
    uit += (k < 16 ? "0" : "") + k.toString(16);
  }
  return uit;
}
/* Een rij auto's, elk met een eigen kleur en een klein beetje scheef
   geparkeerd. Twintig blokjes lezen meteen als een volle parkeerplaats. */
const PARK_AUTOKLEUREN = ["#c8ccd2","#2f3841","#8e99a6","#b3261e","#1f4e8c",
                          "#f0f2f4","#4a6b3f","#8a5a2a","#5c5f66","#d4a017"];
function parkAutos(b, h, ruis) {
  var uit = [], rijen = 2, perRij = Math.max(2, Math.floor(b/2) - 1);
  for (var r = 0; r < rijen; r++) {
    for (var i = 0; i < perRij; i++) {
      var n = r*perRij + i;
      if (ruis(100 + n) < 0.18) continue;                 /* niet elke plek bezet */
      var x = 1.1 + i * ((b - 2.2) / Math.max(1, perRij - 1));
      var z = r === 0 ? h*0.27 : h*0.73;
      var kleur = PARK_AUTOKLEUREN[Math.floor(ruis(200 + n) * PARK_AUTOKLEUREN.length)];
      var lang = 1.7 + ruis(300 + n) * 0.25;
      uit.push({vorm:"doos", x:x, z:z, y:0.02, b:0.72, d:lang, hoog:0.5, kleur:kleur});
      uit.push({vorm:"doos", x:x, z:z, y:0.5,  b:0.6,  d:lang*0.55, hoog:0.26,
                kleur:parkTint(kleur, -0.25)});
    }
  }
  return uit;
}
/* Publiek op de tribune: rijtjes bolletjes in wisselende kleuren. */
function parkPubliek(b, h, aantalRijen, top, ruis, vol) {
  /* Eén bolletje per toeschouwer wordt op een grote tribune al snel
     duizend stuks. Voorbij dit aantal dunnen we uit; op afstand zie
     je het verschil toch niet. */
  var uit = [], diepte = h/aantalRijen, maxTotaal = 420;
  var kleuren = ["#e8e2d6","#2f3841","#b3261e","#1f4e8c","#d9c9a3","#3f5c7a","#8a5a2a"];
  for (var r = 0; r < aantalRijen; r++) {
    var hoogte = top*(r+1)/aantalRijen;
    var perRij = Math.max(3, Math.round(b/0.55));
    for (var i = 0; i < perRij; i++) {
      var n = r*perRij + i;
      if (ruis(400 + n) > (vol === undefined ? 0.72 : vol)) continue;
      if (uit.length >= maxTotaal) break;
      uit.push({
        vorm:"bol",
        x: 0.35 + i * ((b - 0.7) / Math.max(1, perRij - 1)),
        z: diepte*(r + 0.35),
        y: hoogte,
        straal: 0.12 + ruis(500 + n) * 0.03,
        kleur: kleuren[Math.floor(ruis(600 + n) * kleuren.length)]
      });
    }
  }
  return uit;
}
/* Reclameborden langs de zijlijnen van een veld */
function parkReclame(b, h) {
  /* Borden staan langs de lange zijden — dat zijn de zijlijnen. */
  var uit = [], kleuren = ["#004aad","#ffffff","#38b6ff","#004aad","#e8ecf0"];
  var langsX = b >= h;
  var lang = langsX ? b : h;
  var aantal = Math.max(4, Math.floor((lang - 1) / 1.6));
  var stukB = (lang - 1) / aantal * 0.92;
  for (var i = 0; i < aantal; i++) {
    var s = 0.5 + (i + 0.5) * ((lang - 1) / aantal);
    var kleur = kleuren[i % kleuren.length];
    [0.14, (langsX ? h : b) - 0.14].forEach(function(over){
      uit.push(langsX
        ? {vorm:"doos", x:s, z:over, y:0, b:stukB, d:0.06, hoog:0.38, kleur:kleur}
        : {vorm:"doos", x:over, z:s, y:0, b:0.06, d:stukB, hoog:0.38, kleur:kleur});
    });
  }
  return uit;
}

/* Ramen langs de gevels, zodat een gebouw niet zomaar een blok is */
function parkRamen(b, h, hoog, kleur) {
  var uit = [], glas = kleur || "#8fb6d6";
  var raamB = 0.7, raamH = Math.min(0.55, hoog*0.4), onder = hoog*0.35;
  var langs = Math.max(1, Math.floor(b/1.6));
  for (var i = 0; i < langs; i++) {
    var x = (i + 0.5) * b/langs;
    uit.push({vorm:"doos", x:x, z:0.04, y:onder, b:raamB, d:0.08, hoog:raamH, kleur:glas});
    uit.push({vorm:"doos", x:x, z:h-0.04, y:onder, b:raamB, d:0.08, hoog:raamH, kleur:glas});
  }
  var diep = Math.max(1, Math.floor(h/1.6));
  for (var j = 0; j < diep; j++) {
    var z = (j + 0.5) * h/diep;
    uit.push({vorm:"doos", x:0.04, z:z, y:onder, b:0.08, d:raamB, hoog:raamH, kleur:glas});
    uit.push({vorm:"doos", x:b-0.04, z:z, y:onder, b:0.08, d:raamB, hoog:raamH, kleur:glas});
  }
  return uit;
}
/* Een band ramen in een gevel, met kozijn eromheen. Losse ruitjes
   met stijlen ertussen; dat maakt het verschil met een blauwe streep. */
function parkRaamband(x, z, langsX, lengte, y, hoog, glas, kozijn, band) {
  var uit = [], n = Math.max(1, Math.round(lengte / 0.55)), dik = 0.1;
  var vak = lengte / n;
  /* Onder een gewone lat, boven een accentband als die is meegegeven:
     op de foto's van het clubhuis zijn de stijlen licht en loopt er
     alleen bovenlangs een donkerblauwe band. */
  var boven = band || kozijn, bh = band ? 0.15 : 0.07;
  [[y - 0.06, kozijn, 0.07], [y + hoog, boven, bh]].forEach(function(rij){
    var yy = rij[0], kl = rij[1], hh = rij[2];
    uit.push(langsX
      ? {vorm:"doos", x:x, z:z, y:yy, b:lengte + 0.12, d:dik + 0.02, hoog:hh, kleur:kl}
      : {vorm:"doos", x:z, z:x, y:yy, b:dik + 0.02, d:lengte + 0.12, hoog:hh, kleur:kl});
  });
  for (var i = 0; i < n; i++) {
    var s = x - lengte/2 + (i + 0.5) * vak;
    uit.push(langsX
      ? {vorm:"doos", x:s, z:z, y:y, b:vak - 0.07, d:dik, hoog:hoog, kleur:glas}
      : {vorm:"doos", x:z, z:s, y:y, b:dik, d:vak - 0.07, hoog:hoog, kleur:glas});
    if (i) uit.push(langsX
      ? {vorm:"doos", x:x - lengte/2 + i*vak, z:z, y:y, b:0.06, d:dik + 0.02, hoog:hoog, kleur:kozijn}
      : {vorm:"doos", x:z, z:x - lengte/2 + i*vak, y:y, b:dik + 0.02, d:0.06, hoog:hoog, kleur:kozijn});
  }
  return uit;
}
/* Een gemetseld volume: muur, plint en een lijst langs de dakrand */
function parkMuurwerk(x, z, b, d, y, hoog, steen, plint, rand) {
  var uit = [
    {vorm:"doos", x:x, z:z, y:y, b:b, d:d, hoog:hoog, kleur:steen},
    {vorm:"doos", x:x, z:z, y:y, b:b + 0.07, d:d + 0.07, hoog:0.2, kleur:plint || steen}];
  if (rand) uit.push({vorm:"doos", x:x, z:z, y:y + hoog - 0.1, b:b + 0.12, d:d + 0.12,
                      hoog:0.14, kleur:rand});
  return uit;
}
/* Een picknicktafel: blad met twee banken */
function parkPicknick(x, z, hout) {
  return [
    {vorm:"doos", x:x, z:z, y:0.3, b:0.55, d:1.1, hoog:0.06, kleur:hout},
    {vorm:"doos", x:x, z:z-0.42, y:0.17, b:0.5, d:0.22, hoog:0.05, kleur:hout},
    {vorm:"doos", x:x, z:z+0.42, y:0.17, b:0.5, d:0.22, hoog:0.05, kleur:hout},
    {vorm:"doos", x:x-0.22, z:z, y:0, b:0.05, d:0.9, hoog:0.3, kleur:"#6b737d"},
    {vorm:"doos", x:x+0.22, z:z, y:0, b:0.05, d:0.9, hoog:0.3, kleur:"#6b737d"}];
}

/* ── Losse dingen op het terrein ─────────────────────────────
   Een mens is 1,75 meter, en een vakje is 2,5 meter: dus 0,7 hoog.
   Kinderen halen daar ongeveer driekwart van. */
const PARK_HUID = ["#e8c39e","#d8a878","#a9714b","#6f4630","#f0d3b5"];
const PARK_KLEDING = ["#1f4e8c","#b3261e","#16a34a","#e8e2d6","#3f3f46","#c9a227","#7c3aed"];
function parkPersoon(x, z, y, hoog, ruis, n) {
  var h = hoog || 0.7, o = y || 0;
  var kleur = PARK_KLEDING[Math.floor(ruis(400 + n) * PARK_KLEDING.length)];
  var broek = PARK_KLEDING[Math.floor(ruis(500 + n) * PARK_KLEDING.length)];
  var huid  = PARK_HUID[Math.floor(ruis(600 + n) * PARK_HUID.length)];
  return [
    {vorm:"doos",     x:x, z:z, y:o,          b:h*0.24, d:h*0.16, hoog:h*0.45, kleur:broek},
    {vorm:"doos",     x:x, z:z, y:o + h*0.45, b:h*0.30, d:h*0.19, hoog:h*0.33, kleur:kleur},
    {vorm:"bol",      x:x, z:z, y:o + h*0.78, straal:h*0.105,               kleur:huid}
  ];
}
/* Een groepje mensen, netjes verspreid over het vakje */
function parkMensen(b, h, ruis, hoog, aantal) {
  var uit = [], n = aantal || Math.max(3, Math.round(b * h * 1.2));
  for (var i = 0; i < n; i++) {
    var x = 0.25 + ruis(i * 7 + 1) * (b - 0.5);
    var z = 0.25 + ruis(i * 11 + 3) * (h - 0.5);
    uit = uit.concat(parkPersoon(x, z, 0, (hoog || 0.7) * (0.9 + ruis(i*13+5) * 0.22), ruis, i));
  }
  return uit;
}
/* Een bank: zitting, rugleuning en twee poten */
function parkBank(x, z, hout, langsX) {
  var lang = 0.78, uit = [];
  function d(bx, bz, y, bb, dd, hh, k) {
    return {vorm:"doos", x: x + (langsX ? bx : bz), z: z + (langsX ? bz : bx),
            y:y, b: langsX ? bb : dd, d: langsX ? dd : bb, hoog:hh, kleur:k};
  }
  uit.push(d(0, 0, 0.2, lang, 0.28, 0.05, hout));
  uit.push(d(0, 0.16, 0.25, lang, 0.05, 0.26, hout));
  uit.push(d(-lang/2 + 0.06, 0, 0, 0.06, 0.28, 0.2, "#6b737d"));
  uit.push(d( lang/2 - 0.06, 0, 0, 0.06, 0.28, 0.2, "#6b737d"));
  return uit;
}
/* Een fiets, van opzij een paar strepen en twee wielen */
function parkFiets(x, z, kleur) {
  return [
    {vorm:"cilinder", x:x - 0.28, z:z, y:0.26, straal:0.26, hoog:0.05, kleur:"#2f353c",
     kantel: Math.PI/2, midden:true},
    {vorm:"cilinder", x:x + 0.28, z:z, y:0.26, straal:0.26, hoog:0.05, kleur:"#2f353c",
     kantel: Math.PI/2, midden:true},
    {vorm:"doos", x:x, z:z, y:0.34, b:0.52, d:0.05, hoog:0.05, kleur:kleur},
    {vorm:"doos", x:x + 0.2, z:z, y:0.38, b:0.05, d:0.05, hoog:0.24, kleur:kleur},
    {vorm:"doos", x:x + 0.2, z:z, y:0.6, b:0.05, d:0.3, hoog:0.04, kleur:"#2f353c"},
    {vorm:"doos", x:x - 0.16, z:z, y:0.44, b:0.2, d:0.09, hoog:0.05, kleur:"#2f353c"}
  ];
}
/* Eén auto, dezelfde vorm als die op de parkeerplaats */
function parkAuto(x, z, kleur, langsX) {
  var lang = 1.8, breed = 0.75;
  var b1 = langsX ? lang : breed, d1 = langsX ? breed : lang;
  return [
    {vorm:"doos", x:x, z:z, y:0.06, b:b1, d:d1, hoog:0.42, kleur:kleur},
    {vorm:"doos", x:x, z:z, y:0.48, b:b1*0.56, d:d1*0.56, hoog:0.26,
     kleur:parkTint(kleur, -26)},
    {vorm:"doos", x:x, z:z, y:0.02, b:b1*0.98, d:d1*0.98, hoog:0.07, kleur:"#20242a"}
  ];
}

/* Een hoog hek van vier meter: palen, gaas, en een bovenrand. Bij
   een deurstuk zit er een poort in met een frame eromheen. */
function parkHoogHek(b, h, soort) {
  var METAAL = "#8d959e", GAAS = "#7d858f", hoog = 1.6, uit = [];
  var palen = Math.max(2, Math.round(b / 2));
  for (var i = 0; i <= palen; i++) {
    var x = parkKlem(i * b / palen, 0.06, b - 0.06);
    uit.push({vorm:"doos", x:x, z:h/2, y:0, b:0.1, d:0.1, hoog:hoog, kleur:METAAL});
  }
  uit.push({vorm:"doos", x:b/2, z:h/2, y:hoog - 0.08, b:b, d:0.08, hoog:0.08, kleur:METAAL});
  uit.push({vorm:"doos", x:b/2, z:h/2, y:0.1, b:b, d:0.04, hoog:hoog - 0.24,
            kleur:GAAS, dekking:0.5});
  if (soort !== "dicht") {
    /* De poort zelf, met een frame en een klink */
    var links = soort === "links";
    var dx = links ? b*0.25 : b*0.75;
    uit.push({vorm:"doos", x:dx, z:h/2 - 0.05, y:0.04, b:b*0.5 - 0.12, d:0.06,
              hoog:hoog - 0.2, kleur:"#b6bcc4"});
    uit.push({vorm:"doos", x:dx, z:h/2 - 0.05, y:0.1, b:b*0.5 - 0.24, d:0.03,
              hoog:hoog - 0.36, kleur:GAAS, dekking:0.5});
    uit.push({vorm:"doos", x:dx + (links ? b*0.24 : -b*0.24), z:h/2 - 0.12, y:hoog*0.45,
              b:0.06, d:0.12, hoog:0.06, kleur:"#5f6873"});
  }
  return uit;
}

/* Een deur aan de voorkant */
function parkDeur(b, h, hoog, kleur) {
  return [{vorm:"doos", x:b/2, z:h-0.03, y:0, b:0.9, d:0.1, hoog:hoog*0.62, kleur:kleur||"#5c4433"}];
}
/* Een schuin dak: twee oplopende platen die elkaar in de nok raken */
function parkZadeldak(b, h, start, hoogte, kleur) {
  var uit = [], lagen = 7;
  for (var i = 0; i < lagen; i++) {
    var f = i/lagen;
    uit.push({vorm:"doos", x:b/2, z:h/2, y:start + f*hoogte,
              b:b*(1.06 - f*0.06), d:h*(1.06 - f*0.92),
              hoog:hoogte/lagen + 0.01, kleur:kleur});
  }
  return uit;
}
/* Het clubhuis van bovenaf: het puntdak in het midden, lagere delen
   met een plat dak ernaast, en de bestrating aan de veldkant. */
function pvKantine(b, h) {
  var kant = 0.25, achter = 0.3, over = 0.24;
  var voor = h*0.2, dz = voor, dd = h - voor - achter;
  var x0 = kant, breed = b - kant*2;
  var linkB = breed*0.42, midB = breed*0.30, rechtB = breed - linkB - midB;
  var midX0 = x0 + linkB, rechtX0 = x0 + linkB + midB;
  var v = [pvRect(0, 0, b, voor, "#c4bfb4", {r:0.06})];
  /* De platte daken van de twee vleugels, met hun overstek */
  [[x0, linkB], [rechtX0, rechtB]].forEach(function(deel){
    var dx = deel[0], db = deel[1];
    v.push(pvRect(dx - over, dz - over, db + over*2, dd + over*2, "#e8e6df", {r:0.06}));
    v.push(pvRect(dx + 0.2, dz + 0.2, db - 0.4, dd - 0.4, "#d8d6d0", {r:0.05}));
  });
  /* Het puntdak in het midden, met de nok van voor naar achter */
  v.push(pvRect(midX0 - over, dz - over, midB + over*2, dd + over*2, "#8b9096", {r:0.06}));
  v.push(pvLijn(midX0 + midB/2, dz - over + 0.15, midX0 + midB/2, dz + dd + over - 0.15,
                "#6a6f75", 0.14));
  return v;
}
/* ── Bediening met vingers ──────────────────────────────────
   Een muis heeft een wiel, een rechterknop en een Shift-toets. Een
   vinger heeft niets daarvan. Alles wat je op een telefoon met twee
   vingers doet komt binnen als losse gebeurtenissen per vinger; deze
   functies maken daar een beweging van.

   Ze rekenen alleen. Ze weten niets van de tekening, van Three.js of
   van React, en veranderen niets aan wat er binnenkomt. Daardoor zijn
   ze los te testen, en gebruiken de Bouwput en de Kleedkamer dezelfde
   regels in plaats van ieder hun eigen. ────────────────────────── */

/* Hoever iets mag verschuiven voordat we het slepen noemen.
   Een muis staat stil als je klikt; een vinger nooit. Een vingertop
   rolt bij het neerzetten altijd een paar punten weg. Zonder deze
   drempel verschuif je elk onderdeel dat je alleen maar wilde
   aantikken, en dat was precies wat er misging. */
const AANRAAK_DREMPEL = 9;
const MUIS_DREMPEL = 2;
function sleepDrempel(soort) {
  return (soort === "mouse") ? MUIS_DREMPEL : AANRAAK_DREMPEL;
}
/* Is de vinger of muis ver genoeg weg van waar hij begon? */
function voorbijDrempel(x0, y0, x, y, soort) {
  var dx = Number(x) - Number(x0), dy = Number(y) - Number(y0);
  if (!isFinite(dx) || !isFinite(dy)) return false;
  var d = sleepDrempel(soort);
  return (dx * dx + dy * dy) >= d * d;
}

/* De vingers die op dit moment op het scherm liggen. We houden er
   hoogstens twee bij: knijpen doe je met twee, en met drie vingers
   tegelijk is er geen bedoeling die we kennen. Een derde vinger
   negeren is rustiger dan het beeld laten springen.

   Alle drie geven een nieuwe lijst terug in plaats van de oude aan te
   passen, zodat een halve beweging nooit half doorwerkt. */
const VINGERS_MAX = 2;
function vingersBij(lijst, id, x, y) {
  var uit = (lijst || []).filter(function (v) { return v.id !== id; });
  if (uit.length >= VINGERS_MAX) return uit;
  return uit.concat([{id: id, x: Number(x), y: Number(y)}]);
}
function vingersVerplaats(lijst, id, x, y) {
  return (lijst || []).map(function (v) {
    return v.id === id ? {id: v.id, x: Number(x), y: Number(y)} : v;
  });
}
function vingersAf(lijst, id) {
  return (lijst || []).filter(function (v) { return v.id !== id; });
}

/* Het midden tussen twee vingers en hun onderlinge afstand. Allebei
   veranderen terwijl je knijpt: het midden vertelt hoe ver je schuift,
   de spreiding hoeveel je zoomt. */
function knijpMeting(lijst) {
  if (!lijst || lijst.length < 2) return null;
  var a = lijst[0], b = lijst[1];
  var dx = b.x - a.x, dy = b.y - a.y;
  return {mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
          spreiding: Math.sqrt(dx * dx + dy * dy)};
}
/* Van twee metingen naar een beweging. De schaal is hoeveel de
   vingers uit elkaar zijn gegaan: groter dan een is inzoomen.

   Liggen de vingers bijna op elkaar, dan wordt die deling wild — een
   spreiding van een halve punt naar twee is factor vier. Daaronder
   houden we de schaal op een, zodat het beeld niet wegschiet. */
const KNIJP_MINSTE = 12;
function knijpBeweging(vorige, nu) {
  if (!vorige || !nu) return null;
  var schaal = (vorige.spreiding >= KNIJP_MINSTE && nu.spreiding >= KNIJP_MINSTE)
             ? nu.spreiding / vorige.spreiding : 1;
  if (!isFinite(schaal) || schaal <= 0) schaal = 1;
  return {dx: nu.mx - vorige.mx, dy: nu.my - vorige.my, schaal: schaal};
}
/* Knijpen omrekenen naar hetzelfde soort stappen als het muiswiel.
   De camera zoomt per stap met een vaste factor; hoeveel van die
   stappen in deze knijpbeweging zitten is de logaritme ervan. Uit
   elkaar knijpen is dichterbij, en dat is een negatieve stap. */
function knijpStappen(schaal, grondtal) {
  var g = Number(grondtal) || 1.12;
  var s = Number(schaal);
  if (!isFinite(s) || s <= 0 || g <= 1) return 0;
  return -Math.log(s) / Math.log(g);
}

/* Een gebouwtje van bovenaf: muren met een dak en een deur */
function pvGebouw(b, h, dakKleur, deur) {
  var v = [
    pvRect(0.08, 0.08, b-0.16, h-0.16, PARK_KLEUR.steenDonker, {r:0.1}),
    pvRect(0.18, 0.18, b-0.36, h-0.36, dakKleur || PARK_KLEUR.dak, {r:0.08})
  ];
  for (var i=1; i<Math.round(b*2); i++) {
    v.push(pvLijn(0.18+i*(b-0.36)/Math.round(b*2), 0.18,
                  0.18+i*(b-0.36)/Math.round(b*2), h-0.18, PARK_KLEUR.dakDonker, 0.03));
  }
  if (deur !== false) v.push(pvRect(b/2-0.22, h-0.22, 0.44, 0.18, PARK_KLEUR.steen, {r:0.04}));
  return v;
}
/* Een tribune: trapsgewijze rijen stoeltjes, eventueel met dak */
function pvTribune(b, h, metDak) {
  var v = [pvRect(0, 0, b, h, PARK_KLEUR.steenDonker, {r:0.08})];
  var rijen = Math.max(2, Math.round(h*2.2));
  for (var r=0; r<rijen; r++) {
    var y = 0.1 + r*(h-0.2)/rijen;
    v.push(pvRect(0.12, y, b-0.24, (h-0.2)/rijen*0.72,
      r%2 ? PARK_KLEUR.blauw : "#1a5fc4", {r:0.03}));
  }
  if (metDak) v.push(pvRect(0, 0, b, h*0.3, "rgba(0,0,0,.28)", {r:0.08}));
  return v;
}

/* Elk onderdeel heeft een platte tekening (die wordt de bovenkant van
   het 3D-object) en een hoogte in vakjes. Eén vakje is 2,5 meter, dus
   een kantine van zeven meter hoog krijgt hoogte 2.8.

   `bouw` geeft de losse stukken terug waar het object uit bestaat:
   muren, ramen, een dak, een boomkruin, de treden van een tribune.
   Maten daarin zijn in vakjes, met x en z over de grond en y omhoog. */
const PARK_ONDERDELEN = [
  /* ── Velden ── */
  {id:"veld11",   groep:"Velden", label:"Wedstrijdveld", b:42, h:28, hoogte:0.05, zijkant:"#2f6f33",
   vorm:function(b,h,sf){ return pvVeld(b,h,true,false,sf&&sf.maaien); },
   bouw:function(b,h){ return parkReclame(b,h); }},
  {id:"kunstgras",groep:"Velden", label:"Kunstgrasveld", b:42, h:28, hoogte:0.05, zijkant:"#2c6b3a",
   vorm:function(b,h){ return pvVeld(b,h,true,true); },
   bouw:function(b,h){ return parkReclame(b,h); }},
  /* Een half veld is letterlijk de helft van een wedstrijdveld:
     68 breed bij 52,5 lang. Het stond op 65 bij 45 en dat was te klein. */
  {id:"veld8",    groep:"Velden", label:"Half veld", b:28, h:21, hoogte:0.05, zijkant:"#2f6f33",
   vorm:function(b,h,sf){ return pvVeld(b,h,true,false,sf&&sf.maaien); },
   bouw:function(b,h){ return parkReclame(b,h); }},
  {id:"kunstgras8",groep:"Velden", label:"Half kunstgras", b:28, h:21, hoogte:0.05, zijkant:"#2c6b3a",
   vorm:function(b,h){ return pvVeld(b,h,true,true); },
   bouw:function(b,h){ return parkReclame(b,h); }},
  /* Het middelste veld aan de Vierkantsdijk is even breed als de
     andere twee maar korter: opgemeten op de luchtfoto zo'n 73% van
     een heel veld. Driekwart van 105 meter is 78,75 en dat past niet
     op het raster van 2,5 meter; 77,5 komt er het dichtst bij. */
  {id:"kunstgras34",groep:"Velden", label:"Driekwart kunstgras", b:28, h:31, hoogte:0.05,
   zijkant:"#2c6b3a",
   vorm:function(b,h){ return pvVeld(b,h,true,true); },
   bouw:function(b,h){ return parkReclame(b,h); }},
  {id:"veld34",   groep:"Velden", label:"Driekwart veld", b:28, h:31, hoogte:0.05, zijkant:"#2f6f33",
   vorm:function(b,h,sf){ return pvVeld(b,h,true,false,sf&&sf.maaien); },
   bouw:function(b,h){ return parkReclame(b,h); }},
  {id:"pupillen", groep:"Velden", label:"Pupillenveld", b:16, h:12, hoogte:0.05, zijkant:"#2f6f33",
   vorm:function(b,h,sf){ return pvVeld(b,h,true,false,sf&&sf.maaien); }},
  {id:"training", groep:"Velden", label:"Trainingsveld", b:32, h:24, hoogte:0.05, zijkant:"#2f6f33",
   vorm:function(b,h,sf){ return pvVeld(b,h,false,false,sf&&sf.maaien); }},
  {id:"eigenveld",groep:"Velden", label:"Eigen maat", b:24, h:16, hoogte:0.05, zijkant:"#2f6f33",
   eigenMaat:true, vorm:function(b,h,sf){ return pvVeld(b,h,true,false,sf&&sf.maaien); }},
  {id:"panna",    groep:"Velden", label:"Pannakooi", b:8, h:5, hoogte:0.06, zijkant:"#2f6f33",
   vorm:function(b,h){ return [pvRect(0,0,b,h,"#2f6f33",{r:0.6}),
     pvCirkel(b/2,h/2,0.9,"none",{lijn:PARK_KLEUR.lijn,dikte:0.12})]; },
   bouw:function(b,h){
     var uit=[], hg=1.2, d=0.14;
     [[0,0,b,d],[0,h-d,b,d],[0,0,d,h],[b-d,0,d,h]].forEach(function(r){
       uit.push({vorm:"doos", x:r[0]+r[2]/2, z:r[1]+r[3]/2, y:0, b:r[2], d:r[3], hoog:hg, kleur:PARK_KLEUR.metaal});
     });
     return uit; }},

  /* ── Materiaal ── */
  {id:"goalGroot",groep:"Materiaal", label:"Grote goal", b:3, h:1, hoogte:0, los:true, zijkant:"#e8ecf0",
   vorm:function(b,h){ return [pvRect(0,h*0.35,b,h*0.3,"#e8ecf0",{r:0.05})]; },
   bouw:function(b,h){ return parkGoal(b, h, 0.98); }},
  {id:"goalPupil",groep:"Materiaal", label:"Pupillengoal", b:2, h:1, hoogte:0, los:true, zijkant:"#e8ecf0",
   vorm:function(b,h){ return [pvRect(0,h*0.35,b,h*0.3,"#e8ecf0",{r:0.05})]; },
   bouw:function(b,h){ return parkGoal(b, h, 0.8); }},
  {id:"goalMini", groep:"Materiaal", label:"Minigoal", b:1, h:1, hoogte:0, los:true, zijkant:"#e8ecf0",
   vorm:function(b,h){ return [pvRect(0.05,h*0.4,b-0.1,h*0.25,"#e8ecf0",{r:0.04})]; },
   bouw:function(b,h){ return parkGoal(b, h, 0.4); }},
  {id:"pionnen",  groep:"Materiaal", label:"Pionnen", b:2, h:2, hoogte:0, los:true, zijkant:"#e06b2a",
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.12,"#e06b2a")]; },
   bouw:function(b,h){
     var uit=[], plek=[[0.4,0.4],[1.5,0.5],[0.6,1.5],[1.6,1.4],[1.0,0.95]];
     plek.forEach(function(q){
       uit.push({vorm:"kegel", x:q[0], z:q[1], y:0, straal:0.12, hoog:0.18, kleur:"#e06b2a"});
     });
     return uit; }},
  {id:"dopjes",   groep:"Materiaal", label:"Dopjes", b:2, h:2, hoogte:0, los:true, zijkant:"#e8c33a",
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.1,"#e8c33a")]; },
   bouw:function(b,h){
     var uit=[];
     for (var i=0;i<8;i++) {
       uit.push({vorm:"cilinder", x:0.3+(i%4)*0.48, z:0.5+Math.floor(i/4)*0.9, y:0,
                 straal:0.09, hoog:0.03, kleur:i%2?"#e8c33a":"#d94f4f"});
     }
     return uit; }},
  {id:"ladder",   groep:"Materiaal", label:"Loopladder", b:4, h:1, hoogte:0, los:true, zijkant:"#e8c33a",
   vorm:function(b,h){ return [pvRect(0,h*0.3,b,h*0.4,"#e8c33a",{r:0.04})]; },
   bouw:function(b,h){
     var uit=[
       {vorm:"doos", x:b/2, z:h*0.32, y:0, b:b, d:0.05, hoog:0.02, kleur:"#e8c33a"},
       {vorm:"doos", x:b/2, z:h*0.68, y:0, b:b, d:0.05, hoog:0.02, kleur:"#e8c33a"}];
     for (var i=0;i<=b*2;i++)
       uit.push({vorm:"doos", x:i/2, z:h/2, y:0, b:0.05, d:h*0.36, hoog:0.02, kleur:"#e8c33a"});
     return uit; }},
  {id:"horden",   groep:"Materiaal", label:"Horden", b:3, h:1, hoogte:0, los:true, zijkant:"#d94f4f",
   vorm:function(b,h){ return [pvRect(0,h*0.4,b,h*0.2,"#d94f4f",{r:0.03})]; },
   bouw:function(b,h){
     var uit=[];
     for (var i=0;i<3;i++) {
       var x=0.5+i;
       uit.push({vorm:"doos", x:x, z:h/2, y:0.16, b:0.06, d:0.5, hoog:0.05, kleur:"#d94f4f"});
       uit.push({vorm:"doos", x:x, z:h/2-0.25, y:0, b:0.06, d:0.06, hoog:0.18, kleur:"#e8ecf0"});
       uit.push({vorm:"doos", x:x, z:h/2+0.25, y:0, b:0.06, d:0.06, hoog:0.18, kleur:"#e8ecf0"});
     }
     return uit; }},
  {id:"pion",     groep:"Materiaal", label:"Losse pion", b:1, h:1, hoogte:0, los:true,
   zijkant:"#e06b2a",
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.13,"#e06b2a")]; },
   bouw:function(b,h){ return [
     {vorm:"doos",  x:b/2, z:h/2, y:0, b:0.26, d:0.26, hoog:0.02, kleur:"#e06b2a"},
     {vorm:"kegel", x:b/2, z:h/2, y:0.02, straal:0.11, hoog:0.17, kleur:"#e06b2a"}]; }},
  {id:"dopje",    groep:"Materiaal", label:"Los dopje", b:1, h:1, hoogte:0, los:true,
   zijkant:"#e8c33a",
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.1,"#e8c33a")]; },
   bouw:function(b,h){ return [
     {vorm:"cilinder", x:b/2, z:h/2, y:0, straal:0.09, hoog:0.03, kleur:"#e8c33a"}]; }},
  {id:"dummy",    groep:"Materiaal", label:"Dummy", b:1, h:1, hoogte:0, los:true,
   zijkant:"#1f4e8c",
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.16,"#1f4e8c")]; },
   bouw:function(b,h){ return [
     {vorm:"cilinder", x:b/2, z:h/2, y:0,    straal:0.2,  hoog:0.04, kleur:"#2f353c"},
     {vorm:"cilinder", x:b/2, z:h/2, y:0.04, straal:0.09, hoog:0.5,  kleur:"#1f4e8c"},
     {vorm:"doos",     x:b/2, z:h/2, y:0.54, b:0.3, d:0.14, hoog:0.16, kleur:"#e8e2d6"}]; }},
  /* Een muur van drie poppen om vrije trappen op te oefenen */
  {id:"muurPoppen", groep:"Materiaal", label:"Muur van drie", b:2, h:1, hoogte:0, los:true,
   zijkant:"#1f4e8c",
   vorm:function(b,h){
     var v=[]; for (var i=0;i<3;i++) v.push(pvCirkel(b*(i+0.5)/3, h/2, 0.14, "#1f4e8c"));
     return v; },
   bouw:function(b,h,ruis){
     var uit=[], r = ruis || function(){ return 0.5; };
     for (var i=0;i<3;i++) {
       var x = b*(i+0.5)/3;
       uit.push({vorm:"cilinder", x:x, z:h/2, y:0, straal:0.19, hoog:0.04, kleur:"#2f353c"});
       uit = uit.concat(parkPersoon(x, h/2, 0.04, 0.68, r, i*3));
     }
     return uit; }},
  {id:"ballenvanger", groep:"Materiaal", label:"Ballenvanger", b:8, h:1, hoogte:0, zijkant:"#2f4a35",
   vorm:function(b,h){ return [pvLijn(0,h/2,b,h/2,"#2f4a35",0.2)]; },
   bouw:function(b,h){
     var uit=[], hoog=2.4;
     for (var i=0;i<=b;i+=2)
       uit.push({vorm:"cilinder", x:Math.min(i,b-0.1), z:h/2, y:0, straal:0.07, hoog:hoog, kleur:"#5f6873"});
     uit.push({vorm:"doos", x:b/2, z:h/2, y:0.15, b:b, d:0.05, hoog:hoog-0.15, kleur:"#3d6b45"});
     uit.push({vorm:"doos", x:b/2, z:h/2, y:hoog, b:b, d:0.09, hoog:0.09, kleur:"#5f6873"});
     return uit; }},
  {id:"ballenkar",groep:"Materiaal", label:"Ballenkar", b:1, h:1, hoogte:0, los:true, zijkant:"#6b737d",
   vorm:function(b,h){ return [pvRect(0.15,0.2,b-0.3,h-0.4,"#6b737d",{r:0.06})]; },
   bouw:function(b,h){ return [
     {vorm:"doos", x:b/2, z:h/2, y:0.06, b:b-0.3, d:h-0.4, hoog:0.35, kleur:"#6b737d"},
     {vorm:"bol",  x:b/2-0.12, z:h/2, y:0.42, straal:0.09, kleur:"#f0f0f0"},
     {vorm:"bol",  x:b/2+0.12, z:h/2-0.08, y:0.42, straal:0.09, kleur:"#f0f0f0"}]; }},

  /* ── Gebouwen ── */
  /* Het clubhuis van de Vierkantsdijk: geel metselwerk met een lichte
     bovengevel, puntdak in het midden met het clubbord erop, en
     lagere delen met een plat dak aan weerskanten. */
  {id:"kantine",   groep:"Gebouwen", label:"Kantine", b:12, h:6, hoogte:0.02,
   zijkant:"#cbb98d",
   vorm:function(b,h){ return pvKantine(b,h); },
   bouw:function(b,h,ruis,sf){ return parkKantine(b,h,sf); }},
  {id:"overkapping", groep:"Gebouwen", label:"Overkapping", b:8, h:4, hoogte:0.02,
   zijkant:"#c4bfb4",
   vorm:function(b,h){
     var v = [pvRect(0, 0, b, h, "#c4bfb4", {r:0.06}),
              pvRect(0.5, h*0.42, b-1, h*0.18, "#b98a52", {r:0.05})];
     var n = Math.max(2, Math.round(b/3));
     for (var i = 0; i <= n; i++) {
       v.push(pvRect(i*b/n - 0.09, 0.1, 0.18, 0.18, "#9aa1aa"));
       v.push(pvRect(i*b/n - 0.09, h - 0.28, 0.18, 0.18, "#9aa1aa"));
     }
     return v; },
   bouw:function(b,h,ruis,sf){ return parkTerrasKap(b,h,sf); }},
  {id:"terras",    groep:"Gebouwen", label:"Terras", b:8, h:5, hoogte:0.12, zijkant:"#b9a48a",
   vorm:function(b,h){
     var v=[pvRect(0,0,b,h,"#c9b394",{r:0.2})];
     for (var i=1;i<b;i++) v.push(pvLijn(i,0.1,i,h-0.1,"rgba(0,0,0,.12)",0.05));
     return v; },
   bouw:function(b,h){
     /* Tafels op een rooster van ruim drie bij drie vakjes, zodat een
        groter terras er meer krijgt in plaats van dezelfde vijf. */
     var uit = [], kol = Math.max(1, Math.round(b/3.2)), rij = Math.max(1, Math.round(h/3.2));
     for (var i = 0; i < kol; i++) for (var j = 0; j < rij; j++) {
       var x = (i + 0.5) * b/kol, z = (j + 0.5) * h/rij;
       uit.push({vorm:"cilinder", x:x, z:z, y:0.12, straal:0.5, hoog:0.06, kleur:"#e8e2d6"});
       uit.push({vorm:"cilinder", x:x, z:z, y:0.18, straal:0.05, hoog:0.9, kleur:"#8a9199"});
       uit.push({vorm:"cilinder", x:x, z:z, y:1.05, straal:0.95, hoog:0.12, kleur:"#d94f4f"});
     }
     return uit; }},
  {id:"bar",       groep:"Gebouwen", label:"Buitenbar", b:5, h:3, hoogte:1.1, zijkant:"#8a5a3a",
   vorm:function(b,h){ return [pvRect(0,0,b,h,"#a97142",{r:0.15}),
     pvRect(0.2,0.2,b-0.4,h*0.4,"#6b4426",{r:0.1})]; },
   bouw:function(b,h){ return [
     {vorm:"doos", x:b/2, z:h/2, y:1.1, b:b+0.5, d:h+0.5, hoog:0.12, kleur:"#5c4433"},
     {vorm:"cilinder", x:0.3, z:0.3, y:0, straal:0.08, hoog:1.1, kleur:"#6b4426"},
     {vorm:"cilinder", x:b-0.3, z:0.3, y:0, straal:0.08, hoog:1.1, kleur:"#6b4426"},
     {vorm:"cilinder", x:0.3, z:h-0.3, y:0, straal:0.08, hoog:1.1, kleur:"#6b4426"},
     {vorm:"cilinder", x:b-0.3, z:h-0.3, y:0, straal:0.08, hoog:1.1, kleur:"#6b4426"}]; }},
  /* Een lage gemetselde rij met een flauw hellend dak, een luifel
     over de deuren en hoge smalle raampjes — zoals kleedkamers er
     nu eenmaal uitzien. */
  {id:"kleedkamer",groep:"Gebouwen", label:"Kleedkamers", b:16, h:6, hoogte:0.05, zijkant:"#cfd4da",
   vorm:function(b,h){ return pvGebouw(b,h,"#7d8590"); },
   bouw:function(b,h){
     var STEEN="#d9dde2", PLINT="#aab2bb", KOZIJN="#12457c", GLAS="#a9c9e2", DAK="#5f6873";
     var uit = [], vg = 0.05, hoog = 1.15, diepte = h*0.82, zMid = diepte/2;
     uit = parkMuurwerk(b/2, zMid, b, diepte, vg, hoog, STEEN, PLINT, "#eef1f3");
     uit.push({vorm:"wig", x:b/2, z:zMid, y:vg+hoog, b:b+0.2, d:diepte+0.2, hoog:0.3, kleur:DAK});
     /* Eén deur per tien meter. Stond op vier, en dan kreeg een rij
        van tachtig meter vier deuren met twintig meter ertussen. */
     var zVoor = diepte - 0.02, deuren = Math.max(2, Math.round(b/4));
     for (var i = 0; i < deuren; i++) {
       var x = (i + 0.5) * b/deuren;
       uit.push({vorm:"doos", x:x, z:zVoor, y:vg, b:0.8, d:0.12, hoog:0.92, kleur:KOZIJN});
       uit.push({vorm:"doos", x:x, z:zVoor+0.28, y:vg+1.0, b:1.3, d:0.7, hoog:0.07, kleur:"#8d959e"});
       uit.push({vorm:"doos", x:x, z:zVoor+0.6, y:vg+0.5, b:0.06, d:0.06, hoog:0.5, kleur:"#8d959e"});
       uit = uit.concat(parkRaamband(x + b/(deuren*2), zVoor, true, 0.5, vg+0.62, 0.36, GLAS, KOZIJN));
     }
     uit.push({vorm:"doos", x:b*0.5, z:zVoor+0.9, y:0.28, b:2.4, d:0.32, hoog:0.06, kleur:"#b98a52"});
     return uit; }},
  {id:"bestuur",   groep:"Gebouwen", label:"Bestuurskamer", b:6, h:5, hoogte:0.02,
   zijkant:"#cbb98d",
   vorm:function(b,h){
     var voor = h*0.2;
     return [pvRect(0, 0, b, voor, "#c4bfb4", {r:0.05}),
             pvRect(0, voor, b, h-voor, "#e8e6df", {r:0.06}),
             pvRect(0.25, voor+0.2, b-0.5, h-voor-0.4, "#d8d6d0", {r:0.05})]; },
   bouw:function(b,h,ruis,sf){ return parkBestuur(b,h,sf); }},
  {id:"huis",      groep:"Gebouwen", label:"Woonhuis", b:5, h:4, hoogte:2.4, zijkant:"#e6d7c3",
   vorm:function(b,h){ return pvGebouw(b,h,"#9c4a3a"); },
   bouw:function(b,h){ return parkRamen(b,h,2.4,"#a9c6da")
     .concat(parkDeur(b,h,2.4,"#4a3826"))
     .concat(parkZadeldak(b,h,2.4,1.3,"#9c4a3a"))
     .concat([{vorm:"doos", x:b*0.25, z:h*0.35, y:3.1, b:0.3, d:0.3, hoog:0.7, kleur:"#8a6a52"}]); }},
  {id:"materiaal", groep:"Gebouwen", label:"Materiaalhok", b:4, h:3, hoogte:1.3, zijkant:"#c9b99e",
   vorm:function(b,h){ return pvGebouw(b,h,"#6b5b45"); },
   bouw:function(b,h){ return parkDeur(b,h,1.3,"#4a3826")
     .concat([{vorm:"doos", x:b/2, z:h/2, y:1.3, b:b+0.15, d:h+0.15, hoog:0.12, kleur:"#5a4c39"}]); }},
  {id:"ingang",    groep:"Gebouwen", label:"Hoofdingang", b:5, h:2, hoogte:1.8, zijkant:"#cdd2d8",
   vorm:function(b,h){ return [pvRect(0,0.2,b,h-0.4,PARK_KLEUR.steenDonker,{r:0.15}),
     pvRect(b/2-0.9,0.05,1.8,h-0.1,PARK_KLEUR.blauw,{r:0.12})]; },
   bouw:function(b,h){ return [
     {vorm:"doos", x:0.5, z:h/2, y:0, b:0.7, d:h, hoog:1.8, kleur:"#cdd2d8"},
     {vorm:"doos", x:b-0.5, z:h/2, y:0, b:0.7, d:h, hoog:1.8, kleur:"#cdd2d8"},
     {vorm:"doos", x:b/2, z:h/2, y:1.8, b:b, d:h*0.6, hoog:0.3, kleur:PARK_KLEUR.blauw}]; }},

  /* ── Publiek ── */
  {id:"tribune",   groep:"Publiek", label:"Tribune", b:20, h:3, hoogte:0.05, zijkant:"#9aa1aa",
   vorm:function(b,h){ return pvTribune(b,h,false); },
   bouw:function(b,h,ruis,sf){ var t = parkTribuneMaat(h);
     return parkTreden(b,h,false,sf).concat(parkPubliek(b,h,t.rijen,t.top,ruis,0.6)); }},
  {id:"tribuneDak",groep:"Publiek", label:"Overdekte tribune", b:28, h:5, hoogte:0.05, zijkant:"#9aa1aa",
   vorm:function(b,h){ return pvTribune(b,h,true); },
   bouw:function(b,h,ruis,sf){ var t = parkTribuneMaat(h);
     return parkTreden(b,h,true,sf).concat(parkPubliek(b,h,t.rijen,t.top,ruis,0.72)); }},
  {id:"tribuneKort", groep:"Publiek", label:"Kleine overdekte tribune", b:14, h:4, hoogte:0.05,
   zijkant:"#9aa1aa",
   vorm:function(b,h){ return pvTribune(b,h,true); },
   bouw:function(b,h,ruis,sf){ var t = parkTribuneMaat(h);
     return parkTreden(b,h,true,sf).concat(parkPubliek(b,h,t.rijen,t.top,ruis,0.66)); }},
  /* Onze dug-out: een gebogen kap van doorzichtige platen, blauwe
     kuipstoeltjes erin en een reclamebord op de achterwand. */
  {id:"dugout",    groep:"Publiek", label:"Dug-out", b:4, h:1, hoogte:0.02, zijkant:"#b9b3a6",
   vorm:function(b,h,sf){
     var v = [pvRect(0, 0, b, h, "#b9b3a6", {r:0.08})];
     /* De ribben van bovenaf, en de rij stoeltjes eronder */
     var ribben = Math.max(3, Math.round(b/0.9));
     for (var i = 0; i <= ribben; i++)
       v.push(pvLijn(i*b/ribben, 0.06, i*b/ribben, h-0.06, "#9aa1aa", 0.06));
     var n = Math.max(3, Math.round(b*2.2));
     for (var j = 0; j < n; j++)
       v.push(pvRect((j+0.14)*b/n, h*0.52, b/n*0.72, h*0.3,
                     j%2 ? "#ffffff" : ((sf && sf.stoel) || PARK_KLEUR.blauw), {r:0.03}));
     return v; },
   bouw:function(b,h,ruis,sf){ return parkDugout(b, h, sf); }},
  /* De rechte tussenstukken van dezelfde ring. Acht vakjes diep is
     precies de ringdiepte van een bocht op standaardmaat, en omdat
     het aantal rijen en de hoogte uit diezelfde diepte volgen sluiten
     ze naadloos op elkaar aan. Zet je een bocht groter, trek dan het
     tussenstuk even diep mee. */
  {id:"tribuneRing", groep:"Publiek", label:"Aansluittribune", b:28, h:8, hoogte:0.05,
   zijkant:"#9aa1aa",
   vorm:function(b,h,sf){ return pvTribune(b,h,false); },
   bouw:function(b,h,ruis,sf){ var t = parkTribuneMaat(h);
     return parkTreden(b,h,false,sf).concat(parkPubliek(b,h,t.rijen,t.top,ruis,0.7)); }},
  {id:"bochtHalf", groep:"Publiek", label:"Halve bocht", b:14, h:14, hoogte:0.05,
   zijkant:"#9aa1aa",
   vorm:function(b,h,sf){ return pvBocht(b,h,90,sf); },
   bouw:function(b,h,ruis,sf){ return parkBocht(b,h,90,sf); }},
  {id:"bochtHeel", groep:"Publiek", label:"Hele bocht", b:28, h:14, hoogte:0.05,
   zijkant:"#9aa1aa",
   vorm:function(b,h,sf){ return pvBocht(b,h,180,sf); },
   bouw:function(b,h,ruis,sf){ return parkBocht(b,h,180,sf); }},
  {id:"staanTribune", groep:"Publiek", label:"Staantribune", b:20, h:5, hoogte:0.05,
   zijkant:"#b6bcc4",
   vorm:function(b,h,sf){ return pvTribune(b,h,false); },
   bouw:function(b,h,ruis,sf){
     /* Een echte staantribune: treden zonder stoelen, met dwarshekjes
        zodat het publiek niet één golf wordt. */
     var t = parkTribuneMaat(h);
     var uit = parkTreden(b, h, false, sf).filter(function(d){
       return d.kleur !== ((sf && sf.stoel) || PARK_KLEUR.blauw);
     });
     var vakken = Math.max(2, Math.round(b / 5));
     for (var i = 1; i < vakken; i++) {
       var x = i * b / vakken;
       uit.push({vorm:"doos", x:x, z:h/2, y:0, b:0.08, d:h, hoog:t.top + 0.7,
                 kleur:"#8d959e"});
     }
     for (var r = 0; r < t.rijen; r++) {
       var z = (h/t.rijen) * (r + 0.5), y = t.top * (r + 1) / t.rijen;
       uit.push({vorm:"doos", x:b/2, z:z - h/t.rijen*0.3, y:y + 0.5, b:b, d:0.06,
                 hoog:0.06, kleur:"#b6bcc4"});
     }
     return uit.concat(parkPubliek(b, h, t.rijen, t.top, ruis, 0.8)); }},
  {id:"dakPlat",   groep:"Daken", los:true, overkapping:true, label:"Plat dak", b:28, h:8, hoogte:0, zijkant:"#5a626c",
   vorm:function(b,h,sf){ return pvDak(b,h,"plat",false,sf); },
   bouw:function(b,h,ruis,sf){ return parkDak(b,h,"plat",false,sf); }},
  {id:"dakPlatGlas", groep:"Daken", los:true, overkapping:true, label:"Plat dak glas", b:28, h:8, hoogte:0,
   zijkant:"#b9d6e8",
   vorm:function(b,h,sf){ return pvDak(b,h,"plat",true,sf); },
   bouw:function(b,h,ruis,sf){ return parkDak(b,h,"plat",true,sf); }},
  {id:"dakSchuin", groep:"Daken", los:true, overkapping:true, label:"Schuin dak", b:28, h:8, hoogte:0, zijkant:"#5a626c",
   vorm:function(b,h,sf){ return pvDak(b,h,"schuin",false,sf); },
   bouw:function(b,h,ruis,sf){ return parkDak(b,h,"schuin",false,sf); }},
  {id:"dakSchuinGlas", groep:"Daken", los:true, overkapping:true, label:"Schuin dak glas", b:28, h:8, hoogte:0,
   zijkant:"#b9d6e8",
   vorm:function(b,h,sf){ return pvDak(b,h,"schuin",true,sf); },
   bouw:function(b,h,ruis,sf){ return parkDak(b,h,"schuin",true,sf); }},
  {id:"dakBoog",   groep:"Daken", los:true, overkapping:true, label:"Boogdak", b:28, h:8, hoogte:0, zijkant:"#5a626c",
   vorm:function(b,h,sf){ return pvDak(b,h,"boog",false,sf); },
   bouw:function(b,h,ruis,sf){ return parkDak(b,h,"boog",false,sf); }},
  {id:"dakBoogGlas", groep:"Daken", los:true, overkapping:true, label:"Boogdak glas", b:28, h:8, hoogte:0,
   zijkant:"#b9d6e8",
   vorm:function(b,h,sf){ return pvDak(b,h,"boog",true,sf); },
   bouw:function(b,h,ruis,sf){ return parkDak(b,h,"boog",true,sf); }},
  /* Ringvormige daken die precies op de bochttribunes passen: dezelfde
     meetkunde, dus dezelfde straal en dezelfde ringdiepte. */
  {id:"dakBochtHalf", groep:"Daken", los:true, overkapping:true, label:"Kwart bochtdak", b:14, h:14, hoogte:0,
   zijkant:"#5a626c",
   vorm:function(b,h,sf){ return pvBochtDak(b,h,90,false,sf); },
   bouw:function(b,h,ruis,sf){ return parkBochtDak(b,h,90,false,sf); }},
  {id:"dakBochtHalfGlas", groep:"Daken", los:true, overkapping:true, label:"Kwart bochtdak glas", b:14, h:14, hoogte:0,
   zijkant:"#b9d6e8",
   vorm:function(b,h,sf){ return pvBochtDak(b,h,90,true,sf); },
   bouw:function(b,h,ruis,sf){ return parkBochtDak(b,h,90,true,sf); }},
  {id:"dakBochtHeel", groep:"Daken", los:true, overkapping:true, label:"Halve bochtdak", b:28, h:14, hoogte:0,
   zijkant:"#5a626c",
   vorm:function(b,h,sf){ return pvBochtDak(b,h,180,false,sf); },
   bouw:function(b,h,ruis,sf){ return parkBochtDak(b,h,180,false,sf); }},
  {id:"dakBochtHeelGlas", groep:"Daken", los:true, overkapping:true, label:"Halve bochtdak glas", b:28, h:14, hoogte:0,
   zijkant:"#b9d6e8",
   vorm:function(b,h,sf){ return pvBochtDak(b,h,180,true,sf); },
   bouw:function(b,h,ruis,sf){ return parkBochtDak(b,h,180,true,sf); }},
  {id:"skybox",    groep:"Publiek", label:"Skybox", b:8, h:3, hoogte:0, zijkant:"#4a525c",
   vorm:function(b,h){ return pvSkybox(b,h); },
   bouw:function(b,h,ruis,sf){ return parkSkybox(b,h,sf); }},
  {id:"container", groep:"Publiek", label:"Zeecontainer", b:5, h:1, hoogte:0, zijkant:"#7c2d12",
   vorm:function(b,h){ return pvContainer(b,h,"dicht"); },
   bouw:function(b,h,ruis,sf){ return parkContainer(b,h,"dicht",sf); }},
  {id:"containerRaam", groep:"Publiek", label:"Container met luik", b:5, h:1, hoogte:0,
   zijkant:"#b45309",
   vorm:function(b,h){ return pvContainer(b,h,"raam"); },
   bouw:function(b,h,ruis,sf){ return parkContainer(b,h,"raam",sf); }},
  {id:"containerDak", groep:"Publiek", label:"Container met dakterras", b:5, h:1, hoogte:0,
   zijkant:"#2f6f7a",
   vorm:function(b,h){ return pvContainer(b,h,"dak"); },
   bouw:function(b,h,ruis,sf){ return parkContainer(b,h,"dak",sf); }},
  {id:"staan",     groep:"Publiek", label:"Staanplaatsen", b:16, h:2, hoogte:0.05, zijkant:"#b6bcc4",
   vorm:function(b,h){ return [pvRect(0,0.1,b,h-0.2,PARK_KLEUR.steen,{r:0.1})]; },
   bouw:function(b,h,ruis,sf){ var t = parkTribuneMaat(h);
     return parkTreden(b,h,false,sf).concat(parkPubliek(b,h,t.rijen,t.top,ruis,0.45)); }},

  /* ── Buiten ── */
  {id:"plein",     groep:"Terrein", label:"Bestrating", b:8, h:6, hoogte:0.03, zijkant:"#a9a49b",
   vorm:function(b,h){
     var v=[pvRect(0,0,b,h,"#bdb8ae",{r:0.15})];
     for (var i=1;i<b;i++) v.push(pvLijn(i,0.1,i,h-0.1,"rgba(0,0,0,.09)",0.05));
     for (var j=1;j<h;j++) v.push(pvLijn(0.1,j,b-0.1,j,"rgba(0,0,0,.09)",0.05));
     return v; }},
  {id:"pad",       groep:"Terrein", label:"Pad", b:8, h:1, hoogte:0.03, zijkant:"#a9a49b",
   vorm:function(b,h){
     var v=[pvRect(0,0.1,b,h-0.2,"#c4bfb4",{r:0.1})];
     for (var i=1;i<b;i++) v.push(pvLijn(i,0.2,i,h-0.2,"rgba(0,0,0,.08)",0.04));
     return v; }},
  {id:"parkeer",   groep:"Terrein", label:"Parkeerplaats", b:20, h:10, hoogte:0.02, zijkant:"#4e545d",
   vorm:function(b,h){
     var v=[pvRect(0,0,b,h,PARK_KLEUR.asfalt,{r:0.2})];
     for (var i=1;i<b/2;i++) v.push(pvLijn(i*2,0.3,i*2,h/2-0.3,PARK_KLEUR.asfaltLijn,0.08));
     for (var j=1;j<b/2;j++) v.push(pvLijn(j*2,h/2+0.3,j*2,h-0.3,PARK_KLEUR.asfaltLijn,0.08));
     return v; },
   bouw:function(b,h,ruis){ return parkAutos(b,h,ruis); }},
  {id:"fietsen",   groep:"Sfeer", label:"Fietsenstalling", b:10, h:2, hoogte:0, zijkant:"#868d97",
   vorm:function(b,h){ return [pvRect(0,0.3,b,h-0.6,"#767d87",{r:0.15})]; },
   bouw:function(b,h){
     var uit=[{vorm:"doos", x:b/2, z:h/2, y:0.95, b:b, d:h, hoog:0.1, kleur:"#5f6873"}];
     for (var i=0;i<b;i++)
       uit.push({vorm:"doos", x:0.5+i, z:h/2, y:0, b:0.06, d:0.7, hoog:0.35, kleur:PARK_KLEUR.metaal});
     [[0.3,0.3],[b-0.3,0.3],[0.3,h-0.3],[b-0.3,h-0.3]].forEach(function(q){
       uit.push({vorm:"cilinder", x:q[0], z:q[1], y:0, straal:0.06, hoog:0.95, kleur:"#6b737d"});
     });
     return uit; }},
  {id:"lichtmast", groep:"Terrein", label:"Lichtmast", b:1, h:1, hoogte:0, zijkant:"#8a9199",
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.18,"#4a5058")]; },
   bouw:function(b,h,ruis,dag){
     var aan = !!(dag && dag.masten);
     var uit = [
       {vorm:"cilinder", x:b/2, z:h/2, y:0, straal:0.09, hoog:PARK_MAST_HOOG,
        kleur:"#8a9199"},
       /* De arm waar het armatuur aan hangt, een stukje naar voren */
       {vorm:"doos", x:b/2, z:h/2 + 0.09, y:PARK_MAST_HOOG - 0.06, b:0.1, d:0.28,
        hoog:0.1, kleur:"#8a9199"},
       {vorm:"doos", x:b/2, z:h/2 + 0.12, y:PARK_MAST_HOOG, b:1.6, d:0.34, hoog:0.42,
        kleur: aan ? "#fff6c9" : "#f5e6a3"}];
     if (aan) {
       /* Een lichtmast staat niet recht naar beneden te schijnen maar
          schuin vooruit, het veld op. Draai de mast met de knopjes om
          hem te richten; de bundel volgt. */
       var kantel = PARK_MAST_KANTEL * Math.PI/180;
       var vooruit = PARK_MAST_HOOG * Math.tan(kantel);
       var lengte  = PARK_MAST_HOOG / Math.cos(kantel);
       /* Het armatuur kijkt mee naar voren */
       uit.push({vorm:"doos", x:b/2, z:h/2 + 0.12, y:PARK_MAST_HOOG - 0.06,
                 b:1.75, d:0.5, hoog:0.5, kleur:"#fff8d6", gloed:true, dekking:0.8});
       /* De bundel hangt aan de lamp en zwaait naar voren */
       uit.push({vorm:"kegel", x:b/2, z:h/2, y:PARK_MAST_HOOG + 0.2,
                 straal:3.6, hoog:lengte, punt:true, kantel:-kantel,
                 kleur:"#fff3c4", gloed:true, dekking:0.075});
       /* En de plas licht die hij op het gras maakt, uitgerekt in de
          richting waarin hij schijnt */
       uit.push({vorm:"cilinder", x:b/2, z:h/2 + vooruit, y:0.03,
                 straal:3.8, hoog:0.02, rek:[1, 1, 1.55],
                 kleur:"#fff0b8", gloed:true, dekking:0.13});
     }
     return uit; }},
  {id:"boom",      groep:"Groen", label:"Boom", b:2, h:2, hoogte:0, zijkant:"#7a5a3a", varieert:true,
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.25,"#7a5a3a")]; },
   bouw:function(b,h,ruis){
     var groen = parkBladTint(PARK_KLEUR.blad, ruis(1), ruis(10));
     var licht = parkBladTint(PARK_KLEUR.bladLicht, ruis(2), ruis(11));
     var stam = 1.1 + ruis(3)*0.7;
     return [
       {vorm:"cilinder", x:b/2, z:h/2, y:0, straal:0.12+ruis(4)*0.05, hoog:stam, kleur:PARK_KLEUR.hout},
       {vorm:"bol", x:b/2, z:h/2, y:stam, straal:0.7+ruis(5)*0.3, kleur:groen},
       {vorm:"bol", x:b/2-0.3+ruis(6)*0.2, z:h/2-0.25+ruis(7)*0.2, y:stam+0.7, straal:0.45+ruis(8)*0.2, kleur:licht}]; }},
  {id:"boomGroot", groep:"Groen", label:"Grote boom", b:3, h:3, hoogte:0, zijkant:"#7a5a3a",
   varieert:true,
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.42,"#7a5a3a")]; },
   bouw:function(b,h,ruis){
     /* Een oude boom: dikke stam, en een kruin uit een paar bollen
        zodat hij niet als een lolly oogt. */
     var stam = 1.7 + ruis(3)*0.6;
     var uit = [
       {vorm:"cilinder", x:b/2, z:h/2, y:0, straal:0.24 + ruis(4)*0.06, hoog:stam,
        kleur:PARK_KLEUR.hout},
       {vorm:"bol", x:b/2, z:h/2, y:stam - 0.2, straal:1.05 + ruis(5)*0.25,
        kleur:parkBladTint(PARK_KLEUR.blad, ruis(1), ruis(10))}];
     for (var i = 0; i < 3; i++) {
       uit.push({vorm:"bol",
         x:b/2 + (ruis(20+i) - 0.5) * 1.0, z:h/2 + (ruis(30+i) - 0.5) * 1.0,
         y:stam + 0.25 + ruis(40+i) * 0.5, straal:0.55 + ruis(50+i) * 0.3,
         kleur:parkBladTint(PARK_KLEUR.bladLicht, ruis(60+i), ruis(70+i))});
     }
     return uit; }},
  {id:"boompjes",  groep:"Groen", label:"Jonge boompjes", b:2, h:2, hoogte:0,
   zijkant:"#7a5a3a",
   vorm:function(b,h){
     var v=[]; [[0.6,0.6],[1.4,0.8],[0.9,1.5]].forEach(function(q){
       v.push(pvCirkel(q[0]*b/2, q[1]*h/2, 0.16, "#5f9f52")); });
     return v; },
   bouw:function(b,h,ruis){
     var uit=[], plek=[[0.3,0.3],[0.7,0.4],[0.45,0.75]];
     for (var i=0;i<plek.length;i++) {
       var x = plek[i][0]*b, z = plek[i][1]*h;
       var stam = 0.55 + ruis(10+i)*0.3;
       uit.push({vorm:"cilinder", x:x, z:z, y:0, straal:0.055, hoog:stam,
                 kleur:PARK_KLEUR.hout});
       uit.push({vorm:"kegel", x:x, z:z, y:stam - 0.1, straal:0.26 + ruis(20+i)*0.08,
                 hoog:0.7 + ruis(30+i)*0.25,
                 kleur:parkBladTint(PARK_KLEUR.blad, ruis(40+i), ruis(50+i))});
       /* Een boomband, zoals bij een pas geplante boom */
       uit.push({vorm:"cilinder", x:x + 0.12, z:z, y:0, straal:0.025, hoog:stam*0.8,
                 kleur:"#a97142"});
     }
     return uit; }},
  {id:"struik",    groep:"Groen", label:"Struik", b:1, h:1, hoogte:0, zijkant:"#3d8b41", varieert:true,
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.3,"#3d8b41")]; },
   bouw:function(b,h,ruis){ return [
     {vorm:"bol", x:b/2-0.15, z:h/2, y:0, straal:0.24+ruis(1)*0.12,
      kleur:parkBladTint("#357a39", ruis(2), ruis(10))},
     {vorm:"bol", x:b/2+0.18, z:h/2+0.1, y:0, straal:0.18+ruis(3)*0.1,
      kleur:parkBladTint(PARK_KLEUR.bladLicht, ruis(4), ruis(11))}]; }},
  {id:"picknick",  groep:"Sfeer", label:"Picknicktafel", b:1, h:1, hoogte:0, los:true,
   zijkant:"#b98a52",
   vorm:function(b,h){ return [pvRect(b/2-0.28,h/2-0.55,0.56,1.1,"#b98a52",{r:0.08})]; },
   bouw:function(b,h){ return parkPicknick(b/2, h/2, "#b98a52"); }},
  {id:"tafel",     groep:"Sfeer", label:"Tafel", b:1, h:1, hoogte:0, los:true,
   zijkant:"#c9b394",
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.32,"#e8e2d6")]; },
   bouw:function(b,h){ return [
     {vorm:"cilinder", x:b/2, z:h/2, y:0.34, straal:0.34, hoog:0.05, kleur:"#e8e2d6"},
     {vorm:"cilinder", x:b/2, z:h/2, y:0,    straal:0.05, hoog:0.34, kleur:"#8a9199"},
     {vorm:"cilinder", x:b/2, z:h/2, y:0,    straal:0.2,  hoog:0.03, kleur:"#8a9199"}]; }},
  {id:"bank",      groep:"Sfeer", label:"Bank", b:1, h:1, hoogte:0, los:true,
   zijkant:"#b98a52",
   vorm:function(b,h){ return [pvRect(b/2-0.4,h/2-0.14,0.8,0.28,"#b98a52",{r:0.06})]; },
   bouw:function(b,h){ return parkBank(b/2, h/2, "#b98a52", true); }},
  {id:"fiets",     groep:"Sfeer", label:"Fiets", b:1, h:1, hoogte:0, los:true,
   zijkant:"#2f353c",
   vorm:function(b,h){ return [pvRect(b/2-0.32,h/2-0.08,0.64,0.16,"#2f353c",{r:0.06})]; },
   bouw:function(b,h,ruis){
     var kleuren = ["#1f4e8c","#b3261e","#16a34a","#2f353c"];
     var r = ruis || function(){ return 0.5; };
     return parkFiets(b/2, h/2, kleuren[Math.floor(r(9) * kleuren.length)]); }},
  {id:"auto",      groep:"Sfeer", label:"Auto", b:2, h:1, hoogte:0, los:true,
   zijkant:"#4e545d",
   vorm:function(b,h){ return [pvRect(0.1,h/2-0.16,b-0.2,0.32,"#5b616b",{r:0.1})]; },
   bouw:function(b,h,ruis){
     var r = ruis || function(){ return 0.5; };
     return parkAuto(b/2, h/2, PARK_AUTOKLEUREN[Math.floor(r(7) * PARK_AUTOKLEUREN.length)],
                     true); }},
  {id:"bootje",    groep:"Sfeer", label:"Houten bootje", b:2, h:1, hoogte:0, los:true,
   zijkant:"#a97142",
   vorm:function(b,h){ return [pvRect(0.15,h/2-0.2,b-0.3,0.4,"#a97142",{r:0.2})]; },
   bouw:function(b,h){
     var HOUT = "#a97142", DONKER = "#7a5a3a", uit = [];
     /* Een roeibootje: romp, boorden en twee doften */
     uit.push({vorm:"doos", x:b/2, z:h/2, y:0.02, b:b*0.78, d:0.42, hoog:0.16, kleur:HOUT});
     uit.push({vorm:"doos", x:b/2, z:h/2 - 0.2, y:0.1, b:b*0.8, d:0.05, hoog:0.14,
               kleur:DONKER});
     uit.push({vorm:"doos", x:b/2, z:h/2 + 0.2, y:0.1, b:b*0.8, d:0.05, hoog:0.14,
               kleur:DONKER});
     uit.push({vorm:"doos", x:b*0.36, z:h/2, y:0.16, b:0.1, d:0.4, hoog:0.04, kleur:DONKER});
     uit.push({vorm:"doos", x:b*0.64, z:h/2, y:0.16, b:0.1, d:0.4, hoog:0.04, kleur:DONKER});
     /* Puntige voor- en achtersteven */
     uit.push({vorm:"kegel", x:b*0.1, z:h/2, y:0.02, straal:0.21, hoog:0.16, kleur:HOUT});
     uit.push({vorm:"kegel", x:b*0.9, z:h/2, y:0.02, straal:0.21, hoog:0.16, kleur:HOUT});
     return uit; }},
  {id:"mensen",    groep:"Sfeer", label:"Mensen", b:2, h:2, hoogte:0, los:true,
   zijkant:"#1f4e8c",
   vorm:function(b,h){
     var v=[]; [[0.3,0.35],[0.7,0.3],[0.45,0.7],[0.75,0.72]].forEach(function(q){
       v.push(pvCirkel(q[0]*b, q[1]*h, 0.13, "#1f4e8c")); });
     return v; },
   bouw:function(b,h,ruis){
     return parkMensen(b, h, ruis || function(n){ return ((n*37)%100)/100; }, 0.7, 5); }},
  {id:"kinderen",  groep:"Sfeer", label:"Kinderen", b:2, h:2, hoogte:0, los:true,
   zijkant:"#16a34a",
   vorm:function(b,h){
     var v=[]; [[0.28,0.3],[0.62,0.25],[0.4,0.62],[0.72,0.68],[0.2,0.75]].forEach(function(q){
       v.push(pvCirkel(q[0]*b, q[1]*h, 0.1, "#16a34a")); });
     return v; },
   bouw:function(b,h,ruis){
     /* Kinderen halen ongeveer driekwart van een volwassene */
     return parkMensen(b, h, ruis || function(n){ return ((n*23)%100)/100; }, 0.5, 6); }},
  {id:"speeltuin", groep:"Sfeer", label:"Speeltuin", b:10, h:7, hoogte:0.04, zijkant:"#c4b48c",
   vorm:function(b,h){ return [pvRect(0,0,b,h,PARK_KLEUR.zand,{r:0.4})]; },
   bouw:function(b,h){ return [
     {vorm:"doos", x:2.5, z:h/2, y:0.04, b:2.2, d:2.2, hoog:1.1, kleur:"#e07a5f"},
     {vorm:"kegel", x:2.5, z:h/2, y:1.14, straal:1.8, hoog:1.0, kleur:"#c85a3f"},
     {vorm:"doos", x:b-2.5, z:h/2, y:0.04, b:0.16, d:3, hoog:1.5, kleur:"#3d9970"},
     {vorm:"doos", x:b-2.5, z:h/2, y:1.5, b:2.4, d:0.16, hoog:0.16, kleur:"#3d9970"}]; }},
  {id:"vlag",      groep:"Terrein", label:"Vlaggenmast", b:1, h:1, hoogte:0, zijkant:"#9aa1aa",
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.14,PARK_KLEUR.metaal)]; },
   bouw:function(b,h){ return [
     {vorm:"cilinder", x:b/2, z:h/2, y:0, straal:0.06, hoog:4.4, kleur:PARK_KLEUR.metaal},
     {vorm:"doos", x:b/2+0.36, z:h/2, y:3.3, b:0.72, d:0.04, hoog:0.6, kleur:PARK_KLEUR.blauw}]; }},
  {id:"hek",       groep:"Terrein", label:"Hek", b:12, h:1, hoogte:0, zijkant:"#9aa1aa",
   vorm:function(b,h){ return [pvLijn(0,h/2,b,h/2,PARK_KLEUR.metaal,0.14)]; },
   bouw:function(b,h){
     var uit=[{vorm:"doos", x:b/2, z:h/2, y:0.55, b:b, d:0.08, hoog:0.07, kleur:PARK_KLEUR.metaal}];
     for (var i=0;i<=b*2;i++)
       uit.push({vorm:"doos", x:i/2, z:h/2, y:0, b:0.07, d:0.07, hoog:0.62, kleur:PARK_KLEUR.metaal});
     return uit; }},
  /* Een hoog hek van vier meter, zoals er om een sportpark staat.
     De deuren zijn losse stukken die je ertussen zet. */
  {id:"hekHoog",   groep:"Terrein", label:"Hoog hek", b:12, h:1, hoogte:0, zijkant:"#8d959e",
   vorm:function(b,h){ return [pvLijn(0,h/2,b,h/2,"#7d858f",0.2)]; },
   bouw:function(b,h){ return parkHoogHek(b, h, "dicht"); }},
  {id:"hekDeurL",  groep:"Terrein", label:"Hoog hek, deur links", b:2, h:1, hoogte:0,
   zijkant:"#8d959e",
   vorm:function(b,h){ return [pvLijn(0,h/2,b,h/2,"#7d858f",0.2),
     pvRect(0.05,h/2-0.16,b*0.5,0.32,"#b6bcc4",{r:0.04})]; },
   bouw:function(b,h){ return parkHoogHek(b, h, "links"); }},
  {id:"hekDeurR",  groep:"Terrein", label:"Hoog hek, deur rechts", b:2, h:1, hoogte:0,
   zijkant:"#8d959e",
   vorm:function(b,h){ return [pvLijn(0,h/2,b,h/2,"#7d858f",0.2),
     pvRect(b*0.5-0.05,h/2-0.16,b*0.5,0.32,"#b6bcc4",{r:0.04})]; },
   bouw:function(b,h){ return parkHoogHek(b, h, "rechts"); }},
  {id:"lantaarn",  groep:"Terrein", label:"Lantaarnpaal", b:1, h:1, hoogte:0, zijkant:"#8a9199",
   vorm:function(b,h){ return [pvCirkel(b/2,h/2,0.12,"#5f6873")]; },
   bouw:function(b,h,ruis,sf){
     var aan = !!(sf && sf.masten), METAAL = "#8a9199", uit = [];
     uit.push({vorm:"cilinder", x:b/2, z:h/2, y:0, straal:0.13, hoog:0.1, kleur:"#5f6873"});
     uit.push({vorm:"cilinder", x:b/2, z:h/2, y:0.1, straal:0.06, hoog:2.4, kleur:METAAL});
     /* De arm buigt naar één kant, met de lamp aan het eind */
     uit.push({vorm:"doos", x:b/2 + 0.22, z:h/2, y:2.42, b:0.5, d:0.07, hoog:0.07,
               kleur:METAAL});
     uit.push({vorm:"doos", x:b/2 + 0.44, z:h/2, y:2.34, b:0.28, d:0.16, hoog:0.1,
               kleur: aan ? "#fff3c4" : "#c9ccd1"});
     if (aan) {
       uit.push({vorm:"kegel", x:b/2 + 0.44, z:h/2, y:2.36, straal:1.5, hoog:2.4,
                 punt:true, kleur:"#fff3c4", gloed:true, dekking:0.07});
       uit.push({vorm:"cilinder", x:b/2 + 0.44, z:h/2, y:0.03, straal:1.5, hoog:0.02,
                 kleur:"#fff0b8", gloed:true, dekking:0.1});
     }
     return uit; }},
  /* Een hoge ballenvanger met palen die naar achteren hellen, zodat
     het net niet terugkaatst het veld op. */
  {id:"ballenvangerGroot", groep:"Terrein", label:"Grote ballenvanger", b:12, h:2, hoogte:0,
   zijkant:"#2f4a35",
   vorm:function(b,h){ return [pvLijn(0,h*0.3,b,h*0.3,"#2f4a35",0.24),
     pvLijn(0,h*0.75,b,h*0.75,"rgba(0,0,0,.18)",0.1)]; },
   bouw:function(b,h){
     var hoog = 3.2, helling = 0.22, METAAL = "#5f6873", uit = [];
     var top = Math.cos(helling) * hoog, achter = Math.sin(helling) * hoog;
     for (var i = 0; i <= b; i += 2) {
       var x = Math.min(i, b - 0.1);
       /* De paal staat scheef: het midden schuift dus mee naar achteren */
       uit.push({vorm:"cilinder", x:x, z:h*0.25 + achter/2, y:top/2, straal:0.08,
                 hoog:hoog, kleur:METAAL, kantel:helling, midden:true});
     }
     /* Het net ertussen, in twee vlakken: recht omhoog en het schuine deel */
     uit.push({vorm:"doos", x:b/2, z:h*0.25 + achter/2, y:top/2, b:b, d:0.05, hoog:hoog,
               kleur:"#3d6b45", dekking:0.55, kantel:helling, midden:true});
     /* Onderaan een strook dicht doek */
     uit.push({vorm:"doos", x:b/2, z:h*0.25, y:0, b:b, d:0.07, hoog:0.5, kleur:"#2f4a35"});
     return uit; }},
  {id:"water",     groep:"Terrein", label:"Sloot", b:16, h:2, hoogte:0.02, zijkant:"#3a6f9e",
   vorm:function(b,h){ return [pvRect(0,0.25,b,h-0.5,PARK_KLEUR.water,{r:0.4})]; }},
  /* Geen varieert: dat geeft het hele rijtje één willekeurige draai
     om zijn middelpunt, en dan staat een haag van dertig meter dwars
     op zijn eigen vakjes. De losse bollen variëren al via ruis. */
  {id:"haag",      groep:"Groen", label:"Haag", b:12, h:1, hoogte:0, zijkant:"#2e6b34",
   vorm:function(b,h){ return [pvRect(0,h*0.25,b,h*0.5,PARK_KLEUR.haag,{r:0.2})]; },
   bouw:function(b,h,ruis){
     /* Een geschoren haag: bollen die elkaar net raken, zodat je geen
        gaten ziet maar de bovenkant toch niet kaarsrecht is. */
     var uit=[], n=Math.max(2, Math.round(b*1.6));
     for (var i=0;i<n;i++) {
       var x=(i+0.5)*b/n;
       uit.push({vorm:"bol", x:x, z:h/2, y:0.18+ruis(i)*0.06,
                 straal:0.42+ruis(i+40)*0.08,
                 kleur:parkBladTint(PARK_KLEUR.haag, ruis(i+80), ruis(i+120))});
     }
     return uit; }},
  {id:"bomenrij",  groep:"Groen", label:"Bomenrij", b:12, h:2, hoogte:0, zijkant:"#7a5a3a",
   vorm:function(b,h){
     var v=[], n=Math.max(2, Math.round(b/3));
     for (var i=0;i<n;i++) v.push(pvCirkel((i+0.5)*b/n, h/2, 0.5, "#7a5a3a"));
     return v; },
   bouw:function(b,h,ruis){
     /* Scheelt twaalf keer een losse boom neerzetten langs de rand. */
     var uit=[], n=Math.max(2, Math.round(b/3));
     for (var i=0;i<n;i++) {
       var x=(i+0.5)*b/n, z=h/2+(ruis(i)-0.5)*0.5;
       var stam=1.4+ruis(i+20)*0.9;
       uit.push({vorm:"cilinder", x:x, z:z, y:0, straal:0.13+ruis(i+40)*0.05,
                 hoog:stam, kleur:PARK_KLEUR.hout});
       uit.push({vorm:"bol", x:x, z:z, y:stam, straal:0.8+ruis(i+60)*0.3,
                 kleur:parkBladTint(PARK_KLEUR.blad, ruis(i+80), ruis(i+100))});
       uit.push({vorm:"bol", x:x-0.3+ruis(i+120)*0.3, z:z-0.2, y:stam+0.75,
                 straal:0.5+ruis(i+140)*0.2,
                 kleur:parkBladTint(PARK_KLEUR.bladLicht, ruis(i+160), ruis(i+180))});
     }
     return uit; }},
  {id:"weg",       groep:"Terrein", label:"Weg", b:20, h:3, hoogte:0.02, zijkant:"#4d525a",
   vorm:function(b,h){
     var v=[pvRect(0,0,b,h,PARK_KLEUR.asfalt)];
     for (var i=0;i<b;i+=1.6) v.push(pvRect(i,h/2-0.05,0.9,0.1,PARK_KLEUR.asfaltLijn));
     return v; }},
  /* Een kwartslag asfalt, precies zo breed als een recht stuk weg, met
     de middenstreep van het midden van de ene rand naar het midden van
     de rand ernaast. Zo sluiten de stukken op elkaar aan, hoe je hem
     ook draait. Rek je hem uit, dan wordt de boog een ellipse en blijft
     hij de randen in het midden raken. */
  {id:"wegBocht",  groep:"Terrein", label:"Wegbocht", b:3, h:3, hoogte:0.02, zijkant:"#4d525a",
   vorm:function(b,h){
     var v = [pvRect(0, 0, b, h, PARK_KLEUR.asfalt)];
     /* Oneven aantal stukjes, en dan om en om een streep. Zo is het
        eerste streepje 0..1 en het laatste n-1..n, en raken ze allebei
        precies de rand. Bij een even aantal stopte de laatste streep
        een stukje ervoor en zat er een gaatje in de aansluiting. */
     var n = 13;
     for (var i = 0; i < n; i += 2) {
       var a1 = (i/n) * Math.PI/2, a2 = ((i+1)/n) * Math.PI/2;
       v.push(pvLijn((b/2)*Math.cos(a1), (h/2)*Math.sin(a1),
                     (b/2)*Math.cos(a2), (h/2)*Math.sin(a2), PARK_KLEUR.asfaltLijn, 0.1));
     }
     return v; }},
  {id:"wegStoep",  groep:"Terrein", label:"Weg met stoeprand", b:20, h:4, hoogte:0.02,
   zijkant:"#9aa1aa",
   vorm:function(b,h){
     var stoep = 0.5;
     var v = [pvRect(0, 0, b, h, "#bdb8ae"),
              pvRect(0, stoep, b, h - 2*stoep, PARK_KLEUR.asfalt)];
     for (var i = 0; i < b; i += 1.6)
       v.push(pvRect(i, h/2 - 0.05, 0.9, 0.1, PARK_KLEUR.asfaltLijn));
     /* voegen in de stoeptegels */
     for (var j = 1; j < b; j++) {
       v.push(pvLijn(j, 0.05, j, stoep - 0.05, "rgba(0,0,0,.1)", 0.04));
       v.push(pvLijn(j, h - stoep + 0.05, j, h - 0.05, "rgba(0,0,0,.1)", 0.04));
     }
     return v; },
   bouw:function(b,h){
     /* De band ligt een handbreedte boven het asfalt */
     return [
       {vorm:"doos", x:b/2, z:0.25,     y:0.02, b:b, d:0.5, hoog:0.11, kleur:"#c8cdd4"},
       {vorm:"doos", x:b/2, z:h - 0.25, y:0.02, b:b, d:0.5, hoog:0.11, kleur:"#c8cdd4"}];
   }},
  /* Eén tegel om een gat mee dicht te leggen. Trek hem met het handvat
     zo groot als je nodig hebt. */
  {id:"tegel",     groep:"Terrein", label:"Tegel", b:1, h:1, hoogte:0.03, zijkant:"#a9a49b",
   vorm:function(b,h){
     var v = [pvRect(0, 0, b, h, "#bdb8ae")];
     for (var i = 1; i < b; i++) v.push(pvLijn(i, 0, i, h, "rgba(0,0,0,.11)", 0.05));
     for (var j = 1; j < h; j++) v.push(pvLijn(0, j, b, j, "rgba(0,0,0,.11)", 0.05));
     return v; }}
];
/* ═══ Sjabloon: Sportpark Vierkantsdijk ═══════════════════════
   De grondvorm van ons eigen complex, nagemeten op de luchtfoto:
   drie velden naast elkaar met het kunstgras in het midden, de
   kleedkamers en de kantine aan de zuidoostkant, parkeren langs de
   oostkant, de trainingshoek in het zuidwesten en overal bomen en
   hagen. Bedoeld als startpunt — daarna schuif je zelf.
   Elke plek is nagerekend: alles ligt binnen het terrein en niets
   overlapt. ═══════════════════════════════════════════════════ */
function parkSjabloonVierkantsdijk() {
  var L = [];
  /* De indeling staat hieronder in linksbovenhoeken, want zo lees je
     hem het makkelijkst terug op de luchtfoto. parkVernieuw rekent
     dat om naar het middelpunt en de hoek waar de bouwer mee werkt. */
  function z(type, x, y, gedraaid) {
    L.push(parkVernieuw({id:parkNieuwId(), type:type, x:x, y:y, gedraaid:!!gedraaid}));
  }
  function rij(type, x, y, n, dx, dy, gedraaid) {
    for (var i = 0; i < n; i++) z(type, x + i*dx, y + i*dy, gedraaid);
  }

  /* Twee grote velden met daartussen het kunstgrasveld: even breed
     als de andere twee maar korter, en daaronder — in diezelfde
     middenstrook — de kantine en de kleedkamers. Zo ligt het op de
     luchtfoto van de Vierkantsdijk. */
  var WEST = 40, MIDDEN = 72, OOST = 104, VY = 24;
  z("veld11",      WEST,   VY, true);   /* 70 bij 105, staand    */
  z("kunstgras34", MIDDEN, VY, false);  /* 70 bij 77,5, ertussen */
  z("veld11",      OOST,   VY, true);

  /* De strook tussen twee velden is precies vier vakjes: genoeg voor
     een tribune op zijn kant, en daaronder de dug-outs. */
  z("tribuneKort",  68, 28, true);
  z("tribuneKort", 100, 28, true);
  [68, 100].forEach(function(x){ z("dugout", x, 50); z("dugout", x, 54); });

  /* Clubgebouwen onder het kunstgras */
  z("kleedkamer", MIDDEN,    58);
  z("bestuur",    MIDDEN+18, 58);
  z("kantine",    MIDDEN,    66);
  z("terras",     MIDDEN+14, 66);
  z("materiaal",  MIDDEN+24, 66);

  /* Ballenvangers achter de zes doelen, lichtmasten op de veldhoeken */
  z("ballenvanger", WEST+10,   22); z("ballenvanger", WEST+10,   67);
  z("ballenvanger", OOST+10,   22); z("ballenvanger", OOST+10,   67);
  z("ballenvanger", MIDDEN+10, 22); z("ballenvanger", MIDDEN+10, 56);
  [[38,22],[68,22],[38,67],[68,67],
   [102,22],[132,22],[102,67],[132,67],
   [70,22],[100,22],[70,56],[100,56]].forEach(function(q){ z("lichtmast", q[0], q[1]); });

  /* Ingang, fietsen en parkeren aan de noordoostkant, waar je er
     vanaf de Oosterparkweg het complex op loopt */
  z("ingang",  140, 22);
  z("plein",   138, 26);
  z("pad",     134, 33);
  z("fietsen", 138, 34);
  z("vlag", 136, 22); z("vlag", 147, 22);
  z("parkeer", 140, 40);
  z("parkeer", 140, 52);
  z("pad", 136, 40, true);

  /* Trainingshoek in het zuidwesten */
  z("pupillen",  40, 76);
  z("panna",     60, 76);
  z("speeltuin", 72, 78);

  /* Groen, water en de twee wegen langs het complex */
  rij("bomenrij", 24, 24, 4, 0, 14, true);    /* rand langs de westkant  */
  rij("bomenrij", 40, 15, 6, 16, 0, false);   /* rand langs de noordkant */
  rij("bomenrij", 136, 66, 2, 0, 14, true);   /* rand langs de oostkant  */
  rij("haag",  40, 69, 2, 14, 0, false);      /* haag onder de grote velden */
  rij("haag", 104, 69, 2, 14, 0, false);
  rij("water",    14, 22, 4, 0, 18, true);    /* sloot langs de rijksweg */
  rij("weg",      36,  8, 6, 20, 0, false);   /* Oosterparkweg           */
  rij("weg",      24, 104, 6, 20, 0, false);  /* Vierkantsdijk           */

  return L;
}

/* Een doel: twee palen, een lat en een net dat naar achteren afloopt */
function parkGoal(b, h, hoog) {
  /* Een echte doelpaal is twaalf centimeter dik; bij een vakje van
     2,5 meter is dat 0.05. Met een dikkere lat werd het doel bijna
     drie meter hoog in plaats van 2,44. */
  var d = 0.025, net = "rgba(255,255,255,.55)";
  var uit = [
    {vorm:"doos", x:d,     z:h*0.2, y:0,    b:d*2, d:d*2, hoog:hoog, kleur:"#f2f5f8"},
    {vorm:"doos", x:b-d,   z:h*0.2, y:0,    b:d*2, d:d*2, hoog:hoog, kleur:"#f2f5f8"},
    {vorm:"doos", x:b/2,   z:h*0.2, y:hoog, b:b,   d:d*2, hoog:d*2,  kleur:"#f2f5f8"},
    {vorm:"doos", x:b/2,   z:h*0.55, y:0,   b:b,   d:h*0.7, hoog:0.02, kleur:net},
    {vorm:"doos", x:b/2,   z:h*0.9, y:0,    b:b,   d:d,   hoog:hoog*0.45, kleur:net}
  ];
  return uit;
}
/* Oplopende treden voor een tribune, eventueel met een dak erboven */
/* ── Bochttribune ────────────────────────────────────────────
   Ringen die naar buiten toe oplopen. Bij een kwartbocht ligt het
   middelpunt in de linkerbovenhoek, bij een halve cirkel midden op
   de onderrand — dan valt de boog precies binnen de voetafdruk.
   Eén beschrijving voor de tekening, de 3D en de capaciteit, zodat
   die drie niet uit elkaar kunnen lopen. */
function parkBochtMaat(b, h, graden) {
  var heel = graden >= 180;
  var straal = heel ? Math.min(b/2, h) : Math.min(b, h);
  var binnen = straal * 0.42;
  var diepte = Math.max(1, straal - binnen);
  var tm = parkTribuneMaat(diepte);
  return {
    heel: heel, graden: graden, straal: straal, binnen: binnen, diepte: diepte,
    rijen: tm.rijen, top: tm.top, stap: diepte / tm.rijen,
    mx: heel ? b/2 : 0, mz: heel ? h : 0,
    /* Van welke hoek tot welke hoek de boog loopt, tegen de klok in
       gemeten vanaf de x-as. */
    van: heel ? Math.PI : 0, tot: heel ? Math.PI*2 : Math.PI/2
  };
}
/* Hoeveel stoelen er op een boog passen: de lengte van de ring op
   halve hoogte gedeeld door de breedte van een stoel. */
function parkBochtPlaatsen(b, h, graden) {
  var m = parkBochtMaat(b, h, graden);
  var mid = (m.binnen + m.straal) / 2;
  var perRij = Math.floor((mid * (m.tot - m.van)) / PARK_ZITBREED);
  return {rijen: m.rijen, perRij: Math.max(0, perRij), aantal: m.rijen * Math.max(0, perRij)};
}

/* De tekening van een bocht van bovenaf: ringen vanaf het middelpunt.
   Wat buiten de voetafdruk valt snijdt het doek er vanzelf af. */
function pvBocht(b, h, graden, sfeer) {
  var m = parkBochtMaat(b, h, graden);
  var STOEL = (sfeer && sfeer.stoel) || PARK_KLEUR.blauw;
  var v = [];
  for (var r = m.rijen; r >= 1; r--) {
    var straal = m.binnen + r * m.stap;
    v.push(pvCirkel(m.mx, m.mz, straal, r % 2 ? STOEL : parkTint(STOEL, -22)));
  }
  /* Het gat in het midden is het veld, geen tribune */
  v.push(pvCirkel(m.mx, m.mz, m.binnen, "#c9ccd1"));
  return v;
}
/* En in het echt: per rij een reeks treetjes langs de boog, elk een
   slag gedraaid zodat ze de ronding volgen. */
function parkBocht(b, h, graden, sfeer) {
  var m = parkBochtMaat(b, h, graden);
  var STOEL = (sfeer && sfeer.stoel) || PARK_KLEUR.blauw;
  var BETON = "#c9ccd1", METAAL = "#8d959e";
  var uit = [];
  for (var r = 0; r < m.rijen; r++) {
    var straal = m.binnen + (r + 0.5) * m.stap;
    var hoogte = m.top * (r + 1) / m.rijen;
    /* Genoeg stukjes om de ronding glad te houden, maar niet zoveel
       dat de scène eraan onderdoor gaat. */
    var n = parkKlem(Math.round(straal * (m.tot - m.van) / 0.8), 8, 96);
    for (var i = 0; i < n; i++) {
      var a = m.van + (i + 0.5) * (m.tot - m.van) / n;
      var breed = (straal * (m.tot - m.van) / n) * 1.06;
      var x = m.mx + Math.cos(a) * straal, z = m.mz + Math.sin(a) * straal;
      /* Bij een gedraaid onderdeel wijst de eerste maat langs de
         straal en de tweede langs de boog. Die stonden verwisseld,
         waardoor de treden zo diep waren als ze breed hoorden te zijn
         en er gaten tussen de segmenten vielen. */
      uit.push({vorm:"doos", x:x, z:z, y:0, b:m.stap, d:breed, hoog:hoogte,
                kleur:BETON, draai:-a});
      uit.push({vorm:"doos", x:m.mx + Math.cos(a)*(straal + m.stap*0.18),
                z:m.mz + Math.sin(a)*(straal + m.stap*0.18), y:hoogte,
                b:m.stap*0.34, d:breed*0.9, hoog:0.07, kleur:STOEL, draai:-a});
      uit.push({vorm:"doos", x:m.mx + Math.cos(a)*(straal + m.stap*0.38),
                z:m.mz + Math.sin(a)*(straal + m.stap*0.38), y:hoogte,
                b:0.07, d:breed*0.9, hoog:0.28, kleur:STOEL, draai:-a});
    }
  }
  /* Een reling langs de binnenrand, zodat niemand van de onderste
     tree het veld op stapt. */
  var nRel = parkKlem(Math.round(m.binnen * (m.tot - m.van) / 1.2), 6, 60);
  for (var k = 0; k <= nRel; k++) {
    var ar = m.van + k * (m.tot - m.van) / nRel;
    uit.push({vorm:"cilinder", x:m.mx + Math.cos(ar)*m.binnen,
              z:m.mz + Math.sin(ar)*m.binnen, y:0, straal:0.05, hoog:0.66, kleur:METAAL});
  }
  return uit;
}

/* ── Het clubhuis ───────────────────────────────────────────
   Nagebouwd van de foto's van de Vierkantsdijk: gele baksteen met
   een lichte bovengevel, een puntdak in het midden met het clubbord
   op een donkerblauwe band, en aan weerskanten lagere delen met een
   plat dak. Stevige blauwe kozijnen om grote puien.

   De kleuren staan hier bij elkaar, zodat de kantine, de
   bestuurskamer en de overkapping één familie blijven. */
const CLUB = {
  steen:"#cbb98d", steenDonker:"#b5a377", boven:"#eceae4",
  kozijn:"#12386b", kozijnLicht:"#f4f3ef", glas:"#bcd3e2",
  dak:"#8b9096", dakRand:"#f2f1ee",
  bord:"#12294f", wapen:"#b3261e", metaal:"#9aa1aa", hout:"#b98a52"
};
/* Het clubbord met een wapen aan weerskanten */
function parkClubbord(x, z, y, breed, hoog) {
  var uit = [{vorm:"doos", x:x, z:z, y:y, b:breed, d:0.07, hoog:hoog, kleur:CLUB.bord}];
  /* De wapens liggen op de band zelf, netjes binnen de rand, en niet
     ernaast als losse blokjes. */
  var wapen = hoog * 0.6, rand = wapen * 0.5 + hoog * 0.14;
  [x - breed/2 + rand, x + breed/2 - rand].forEach(function(wx){
    uit.push({vorm:"doos", x:wx, z:z - 0.05, y:y + (hoog - wapen)/2,
              b:wapen*0.8, d:0.03, hoog:wapen, kleur:CLUB.wapen});
  });
  /* De clubnaam ertussen, als een lichte balk */
  var naam = Math.max(0.12, breed - rand*3.4);
  uit.push({vorm:"doos", x:x, z:z - 0.045, y:y + hoog*0.33, b:naam, d:0.02,
            hoog:hoog*0.32, kleur:"#ffffff"});
  return uit;
}
/* Een gemetseld deel met een lichte bovengevel erop, zoals het
   clubhuis: onderaan baksteen, daarboven lichte panelen. */
function parkClubMuur(x, z, b, d, y, hoog) {
  var steenHoog = hoog * 0.45;
  return [
    {vorm:"doos", x:x, z:z, y:y, b:b, d:d, hoog:steenHoog, kleur:CLUB.steen},
    {vorm:"doos", x:x, z:z, y:y, b:b + 0.07, d:d + 0.07, hoog:0.14,
     kleur:CLUB.steenDonker},
    {vorm:"doos", x:x, z:z, y:y + steenHoog, b:b, d:d, hoog:hoog - steenHoog,
     kleur:CLUB.boven}
  ];
}
/* Een plat dak met een lichte rand eromheen */
function parkPlatDakje(x, z, b, d, y, over) {
  var o = (over === undefined) ? 0.12 : over;
  return [
    {vorm:"doos", x:x, z:z, y:y, b:b + o*2, d:d + o*2, hoog:0.1, kleur:CLUB.dakRand},
    {vorm:"doos", x:x, z:z, y:y + 0.1, b:b + o*2 - 0.14, d:d + o*2 - 0.14, hoog:0.06,
     kleur:"#d8d6d0"}
  ];
}

function parkKantine(b, h, sfeer) {
  var uit = [];
  var kant = 0.25, achter = 0.3;          /* marge, zodat het dakoverstek
                                             binnen het eigen vak blijft */
  var voor = h * 0.2;                     /* strook bestrating aan de veldkant */
  var dz = voor, dd = h - voor - achter;  /* het gebouw zelf */
  var zMid = dz + dd/2, zVoor = dz + 0.02;
  var x0 = kant, breed = b - kant*2;
  /* Het gebouw is niet symmetrisch: links loopt een lange lage vleugel
     door, dan komt de puntgevel, en rechts een kortere vleugel. */
  var linkB = breed * 0.42, midB = breed * 0.30, rechtB = breed - linkB - midB;
  var linkX = x0 + linkB/2;
  var midX  = x0 + linkB + midB/2;
  var rechtX = x0 + breed - rechtB/2;
  var hoogZij = 1.04, hoogMid = 1.2, nok = 0.5, over = 0.24;
  var dakZij = 0.04 + hoogZij, dakMid = 0.04 + hoogMid;

  /* Bestrating ervoor */
  uit.push({vorm:"doos", x:b/2, z:voor/2, y:0, b:b, d:voor, hoog:0.04, kleur:"#c4bfb4"});

  /* De twee lage vleugels, met een plat dak dat over de gevel steekt */
  [[linkX, linkB], [rechtX, rechtB]].forEach(function(deel){
    var mx = deel[0], mb = deel[1];
    uit = uit.concat(parkClubMuur(mx, zMid, mb, dd, 0.04, hoogZij));
    uit = uit.concat(parkPlatDakje(mx, zMid, mb, dd, dakZij, over));
    uit = uit.concat(parkRaamband(mx, zVoor, true, mb * 0.7, 0.04 + hoogZij*0.26,
                                  hoogZij*0.46, CLUB.glas, CLUB.kozijnLicht, CLUB.kozijn));
  });

  /* Het middendeel met het puntdak. De nok loopt van voor naar achter,
     dus bij langs:"z" is d de breedte en b de diepte. */
  uit = uit.concat(parkClubMuur(midX, zMid, midB, dd, 0.04, hoogMid));
  uit.push({vorm:"wig", x:midX, z:zMid, y:dakMid, b:dd + over*2, d:midB + over*2,
            hoog:nok, langs:"z", kleur:CLUB.dak});
  /* Een lichte lijst langs de dakrand van de puntgevel */
  uit.push({vorm:"doos", x:midX, z:zMid, y:dakMid - 0.03, b:midB + over*2,
            d:dd + over*2, hoog:0.09, kleur:CLUB.dakRand});
  /* De grote pui aan de veldkant */
  uit = uit.concat(parkRaamband(midX, zVoor, true, midB * 0.8, 0.04 + hoogMid*0.22,
                                hoogMid*0.44, CLUB.glas, CLUB.kozijnLicht, CLUB.kozijn));
  /* Het clubbord hangt op de gevel onder de dakrand, niet in de punt */
  uit = uit.concat(parkClubbord(midX, dz - 0.05, dakMid - 0.42, midB*0.72, 0.3));
  /* Twee vlaggenmasten op de nok, zoals op de foto */
  [midX - midB*0.3, midX + midB*0.3].forEach(function(fx){
    uit.push({vorm:"cilinder", x:fx, z:zMid, y:dakMid + nok*0.5, straal:0.035,
              hoog:0.9, kleur:CLUB.metaal});
    uit.push({vorm:"doos", x:fx + 0.2, z:zMid, y:dakMid + nok*0.5 + 0.55,
              b:0.4, d:0.03, hoog:0.26,
              kleur:(sfeer && sfeer.stoel) || PARK_KLEUR.blauw});
  });
  /* De ingang in de linkervleugel, met een luifel */
  uit.push({vorm:"doos", x:linkX - linkB*0.3, z:zVoor, y:0.04, b:0.75, d:0.1, hoog:0.82,
            kleur:CLUB.kozijn});
  uit.push({vorm:"doos", x:linkX - linkB*0.3, z:zVoor - 0.28, y:0.04 + 0.9, b:1.3, d:0.62,
            hoog:0.07, kleur:CLUB.dakRand});
  /* Zijramen in de linkergevel */
  uit = uit.concat(parkRaamband(zMid, x0 - 0.04, false, dd*0.5, 0.04 + hoogZij*0.3,
                                hoogZij*0.4, CLUB.glas, CLUB.kozijnLicht, CLUB.kozijn));
  return uit;
}

function parkBestuur(b, h, sfeer) {
  var uit = [], hoog = 1.04, kant = 0.22, achter = 0.26, over = 0.22;
  var voor = h * 0.2, dz = voor, dd = h - voor - achter, zMid = dz + dd/2;
  var x0 = kant, breed = b - kant*2;
  uit.push({vorm:"doos", x:b/2, z:voor/2, y:0, b:b, d:voor, hoog:0.04, kleur:"#c4bfb4"});
  uit = uit.concat(parkClubMuur(b/2, zMid, breed, dd, 0.04, hoog));
  uit = uit.concat(parkPlatDakje(b/2, zMid, breed, dd, 0.04 + hoog, over));
  /* Eén brede pui aan de veldkant en een deur ernaast */
  uit = uit.concat(parkRaamband(b*0.58, dz + 0.02, true, breed*0.58, 0.04 + hoog*0.3,
                                hoog*0.44, CLUB.glas, CLUB.kozijnLicht, CLUB.kozijn));
  uit.push({vorm:"doos", x:x0 + breed*0.14, z:dz + 0.02, y:0.04, b:0.7, d:0.1, hoog:0.8,
            kleur:CLUB.kozijn});
  /* En een klein raam in de zijgevel: de bespreekruimte */
  uit = uit.concat(parkRaamband(zMid + dd*0.22, x0 - 0.04, false, dd*0.3, 0.04 + hoog*0.32,
                                hoog*0.4, CLUB.glas, CLUB.kozijnLicht, CLUB.kozijn));
  return uit;
}

/* De overkapping naast de kantine: een plat dak op stalen palen met
   een lange tafel eronder waar iedereen na afloop aanschuift.
   (Niet te verwarren met parkOverkapping, dat vertelt of een onderdeel
   een los dak is.) */
function parkTerrasKap(b, h, sfeer) {
  var uit = [], hoog = 1.15;
  /* Bestrating als vloer */
  uit.push({vorm:"doos", x:b/2, z:h/2, y:0, b:b, d:h, hoog:0.04, kleur:"#c4bfb4"});
  /* Palen: twee rijen, aan de voor- en achterkant */
  var palen = Math.max(2, Math.round(b / 3));
  for (var i = 0; i <= palen; i++) {
    var x = parkKlem(i * b / palen, 0.18, b - 0.18);
    [0.18, h - 0.18].forEach(function(z){
      uit.push({vorm:"cilinder", x:x, z:z, y:0.04, straal:0.065, hoog:hoog,
                kleur:CLUB.metaal});
    });
  }
  uit = uit.concat(parkPlatDakje(b/2, h/2, b, h, 0.04 + hoog));
  /* De lange tafel, met banken aan weerskanten */
  var tz = h * 0.5;
  uit.push({vorm:"doos", x:b/2, z:tz, y:0.34, b:b - 1.2, d:0.42, hoog:0.06,
            kleur:CLUB.hout});
  [-0.42, 0.42].forEach(function(dz2){
    uit.push({vorm:"doos", x:b/2, z:tz + dz2, y:0.2, b:b - 1.4, d:0.22, hoog:0.05,
              kleur:CLUB.hout});
  });
  var poten = Math.max(2, Math.round((b - 1.2) / 1.6));
  for (var k = 0; k <= poten; k++) {
    var px = parkKlem(0.6 + k * (b - 1.2) / poten, 0.6, b - 0.6);
    uit.push({vorm:"doos", x:px, z:tz, y:0.04, b:0.07, d:0.7, hoog:0.3,
              kleur:CLUB.metaal});
  }
  return uit;
}

/* ── Dug-out ────────────────────────────────────────────────
   Een gebogen kap van perspex, zoals ze langs elk amateurveld staan:
   de ribben beginnen op de grond aan de veldkant, buigen omhoog en
   naar achteren, en eindigen vlak boven de achterwand. Het was een
   trapje van vijf platte plaatjes; dat leest niet als een boog.

   De boog is een kwartcirkel met zijn middelpunt op de grond aan de
   achterkant. Een paneel op hoek a staat (90° − a) gekanteld: recht
   overeind vooraan, vlak bovenop. ─────────────────────────────── */
function parkDugout(b, h, sfeer) {
  var STOEL = (sfeer && sfeer.stoel) || PARK_KLEUR.blauw;
  var FRAME = "#9aa1aa", PERSPEX = "#cfe4f2", TEGEL = "#b9b3a6";
  var uit = [], r = h;
  /* Het middelpunt van de boog ligt op de grond aan de veldkant. De
     kap staat daardoor recht overeind achterin en loopt vlak over de
     bank heen naar voren: dichte rug, open naar het veld. */
  function opBoog(a) { return {z: r*Math.cos(a), y: r*Math.sin(a)}; }

  /* Een tegelvloertje eronder, iets ruimer dan de kap */
  uit.push({vorm:"doos", x:b/2, z:h/2, y:0, b:b + 0.2, d:h + 0.16, hoog:0.04, kleur:TEGEL});

  /* De doorzichtige panelen tussen de ribben door */
  var vlakken = Math.max(6, Math.round(r * 9));
  var stap = (Math.PI/2) / vlakken;
  for (var i = 0; i < vlakken; i++) {
    var a = (i + 0.5) * stap;
    var p = opBoog(a);
    uit.push({vorm:"doos", x:b/2, z:p.z, y:p.y + 0.04, b:b, d:r*stap*1.12, hoog:0.03,
              kleur:PERSPEX, dekking:0.34, kantel: Math.PI/2 - a, midden:true});
  }
  /* De ribben zelf: dezelfde boog, maar smal en van metaal */
  var ribben = Math.max(3, Math.round(b / 0.9));
  for (var k = 0; k <= ribben; k++) {
    var x = parkKlem(k * b / ribben, 0.05, b - 0.05);
    for (var j = 0; j < vlakken; j++) {
      var aa = (j + 0.5) * stap;
      var q = opBoog(aa);
      uit.push({vorm:"doos", x:x, z:q.z, y:q.y + 0.04, b:0.09, d:r*stap*1.12, hoog:0.07,
                kleur:FRAME, kantel: Math.PI/2 - aa, midden:true});
    }
  }
  /* De zijkanten dicht met perspex. Niet als taartpunten maar als een
     reeks staande stroken onder de boog: die sluiten precies aan en
     overlappen elkaar niet, en dat scheelt bij doorzichtig glas een
     hoop donkere randen. */
  var stroken = 14;
  for (var s = 0; s < stroken; s++) {
    var zz = (s + 0.5) * r / stroken;
    var hoogte = Math.sqrt(Math.max(0, r*r - zz*zz));
    if (hoogte < 0.02) continue;
    [0.04, b - 0.04].forEach(function(zx){
      uit.push({vorm:"doos", x:zx, z:zz, y:0.04, b:0.05, d:r/stroken + 0.01,
                hoog:hoogte, kleur:PERSPEX, dekking:0.3});
    });
  }
  /* De randen van die zijpanelen, zodat er een frame omheen staat */
  [0.04, b - 0.04].forEach(function(zx){
    uit.push({vorm:"doos", x:zx, z:r - 0.04, y:0.04, b:0.07, d:0.08, hoog:r*0.6,
              kleur:FRAME});
  });

  /* De achterwand: dicht tot heuphoogte, met een bord erop */
  uit.push({vorm:"doos", x:b/2, z:h - 0.05, y:0.04, b:b, d:0.1, hoog:r*0.52, kleur:FRAME});
  uit.push({vorm:"doos", x:b/2, z:h - 0.005, y:0.12, b:b - 0.24, d:0.04, hoog:r*0.3,
            kleur:STOEL});

  /* De bank: een metalen frame met om en om een blauwe en een witte
     kuip, precies zoals op de foto. */
  var n = Math.max(3, Math.round(b * 2.2));
  uit.push({vorm:"doos", x:b/2, z:h*0.62, y:0.04, b:b - 0.16, d:0.1, hoog:0.28,
            kleur:FRAME});
  for (var t = 0; t < n; t++) {
    var sx = (t + 0.5) * b / n, kleur = (t % 2) ? "#ffffff" : STOEL;
    uit.push({vorm:"doos", x:sx, z:h*0.58, y:0.32, b:b/n - 0.07, d:0.3, hoog:0.05,
              kleur:kleur});
    uit.push({vorm:"doos", x:sx, z:h*0.74, y:0.32, b:b/n - 0.07, d:0.06, hoog:0.3,
              kleur:kleur});
    uit.push({vorm:"doos", x:sx, z:h*0.58, y:0.04, b:0.05, d:0.05, hoog:0.28,
              kleur:FRAME});
  }
  return uit;
}

/* ── Zeecontainers ──────────────────────────────────────────
   Een zeecontainer is 12,19 bij 2,44 bij 2,59 meter. Op ons raster
   van 2,5 meter is dat vijf bij één vakje en iets meer dan een vakje
   hoog. Drie smaken: dicht, met een luik, en met een dakterras. */
const PARK_CONTAINER_HOOG = 2.59 / PARK_METER;
function pvContainer(b, h, soort) {
  var kleur = soort === "raam" ? "#b45309" : (soort === "dak" ? "#2f6f7a" : "#7c2d12");
  var v = [pvRect(0, 0.05, b, h - 0.1, kleur, {r:0.06})];
  if (soort === "dak") {
    v.push(pvRect(0.18, 0.18, b - 0.36, h - 0.36, "#5a626c", {r:0.04}));
    for (var i = 1; i < Math.round(b); i++)
      v.push(pvLijn(i, 0.2, i, h - 0.2, "rgba(255,255,255,.25)", 0.04));
  } else {
    for (var j = 1; j < Math.round(b * 2); j++)
      v.push(pvLijn(j/2, 0.12, j/2, h - 0.12, "rgba(0,0,0,.18)", 0.04));
  }
  return v;
}
function parkContainer(b, h, soort, sfeer) {
  var romp = soort === "raam" ? "#b45309" : (soort === "dak" ? "#2f6f7a" : "#7c2d12");
  var hoog = PARK_CONTAINER_HOOG;
  var METAAL = "#8d959e", uit = [];
  uit.push({vorm:"doos", x:b/2, z:h/2, y:0, b:b, d:h*0.92, hoog:hoog, kleur:romp});
  /* De ribbels in de wand, want zonder die is het gewoon een doos */
  var ribbels = Math.max(4, Math.round(b * 3));
  for (var i = 0; i < ribbels; i++) {
    var x = (i + 0.5) * b / ribbels;
    uit.push({vorm:"doos", x:x, z:h*0.04, y:0.08, b:b/ribbels*0.45, d:0.05,
              hoog:hoog - 0.16, kleur:parkTint(romp, -26)});
    uit.push({vorm:"doos", x:x, z:h*0.96, y:0.08, b:b/ribbels*0.45, d:0.05,
              hoog:hoog - 0.16, kleur:parkTint(romp, -26)});
  }
  /* Hoekstukken */
  [[0.1, h*0.08],[b-0.1, h*0.08],[0.1, h*0.92],[b-0.1, h*0.92]].forEach(function(q){
    uit.push({vorm:"doos", x:q[0], z:q[1], y:0, b:0.2, d:0.14, hoog:hoog, kleur:METAAL});
  });
  if (soort === "raam") {
    /* Een luik dat openklapt, zoals een kiosk. De klep en het blad
       steken bewust maar een klein stukje uit: een container is maar
       één vakje diep, en wat verder uitsteekt staat zo in de buurman
       terwijl het botsen alleen naar de voetafdruk kijkt. */
    uit.push({vorm:"doos", x:b/2, z:h*0.03, y:hoog*0.42, b:b*0.55, d:0.08,
              hoog:hoog*0.34, kleur:"#1f2937"});
    uit.push({vorm:"doos", x:b/2, z:h*0.03 - 0.16, y:hoog*0.78, b:b*0.57, d:0.34,
              hoog:0.06, kleur:parkTint(romp, 18)});
    uit.push({vorm:"doos", x:b/2, z:h*0.03 - 0.14, y:hoog*0.5, b:b*0.5, d:0.12,
              hoog:0.06, kleur:"#b98a52"});
  }
  if (soort === "dak") {
    /* Dakterras met een reling eromheen: hier staat publiek op */
    var STOEL = (sfeer && sfeer.stoel) || PARK_KLEUR.blauw;
    uit.push({vorm:"doos", x:b/2, z:h/2, y:hoog, b:b, d:h*0.92, hoog:0.06, kleur:"#5a626c"});
    var relH = 0.44;
    [[b/2, h*0.06, b, 0.06],[b/2, h*0.94, b, 0.06],
     [0.05, h/2, 0.06, h*0.92],[b-0.05, h/2, 0.06, h*0.92]].forEach(function(q){
      uit.push({vorm:"doos", x:q[0], z:q[1], y:hoog + relH, b:q[2], d:q[3],
                hoog:0.05, kleur:STOEL});
    });
    var palen = Math.max(4, Math.round(b * 1.4));
    for (var k = 0; k <= palen; k++) {
      var px = parkKlem(k * b / palen, 0.06, b - 0.06);
      uit.push({vorm:"cilinder", x:px, z:h*0.06, y:hoog, straal:0.035, hoog:relH, kleur:METAAL});
      uit.push({vorm:"cilinder", x:px, z:h*0.94, y:hoog, straal:0.035, hoog:relH, kleur:METAAL});
    }
    /* Een laddertje tegen de kopse kant, binnen de eigen maat */
    for (var t = 0; t < 5; t++)
      uit.push({vorm:"doos", x:b - 0.1, z:h/2, y:0.2 + t*(hoog-0.2)/5,
                b:0.1, d:0.42, hoog:0.05, kleur:METAAL});
    uit.push({vorm:"doos", x:b - 0.1, z:h/2 - 0.2, y:0, b:0.07, d:0.07,
              hoog:hoog + 0.3, kleur:METAAL});
    uit.push({vorm:"doos", x:b - 0.1, z:h/2 + 0.2, y:0, b:0.07, d:0.07,
              hoog:hoog + 0.3, kleur:METAAL});
  }
  return uit;
}

/* ── Daken ──────────────────────────────────────────────────
   Losse overkappingen om boven een tribune te hangen. Plat of gebogen,
   dicht of doorzichtig. De kolommen staan aan de achterkant en lopen
   naar beneden, zodat het dak ergens op lijkt te rusten ook als je
   hem in de lucht zet. */
function pvDak(b, h, soort, glas, sfeer) {
  var boog = (soort === "boog");
  var kleur = glas ? "rgba(160,205,230,.55)" : parkDakKleur(false, sfeer);
  var v = [pvRect(0, 0, b, h, kleur, {r: boog ? 0.5 : 0.1})];
  if (soort === "schuin") {
    /* Een aflopend dak lees je van bovenaf aan de schaduw aan de lage kant */
    v.push(pvRect(0, 0, b, h*0.28, "rgba(0,0,0,.16)"));
  }
  if (boog) {
    var n = Math.max(4, Math.round(h * 1.4));
    for (var i = 1; i < n; i++)
      v.push(pvLijn(0.2, i*h/n, b - 0.2, i*h/n, "rgba(0,0,0,.13)", 0.05));
  } else {
    var m = Math.max(3, Math.round(b / 3));
    for (var j = 1; j < m; j++)
      v.push(pvLijn(j*b/m, 0.2, j*b/m, h - 0.2, "rgba(0,0,0,.13)", 0.05));
  }
  return v;
}
/* De kleur van een dak: dicht neemt de dakkleur over, glas een lichte
   tint daarvan zodat een blauw dak ook blauwig glas geeft. */
function parkDakKleur(glas, sfeer) {
  var basis = (sfeer && sfeer.dak) || "#5a626c";
  return glas ? parkTint(basis, 62) : basis;
}
function parkDak(b, h, soort, glas, sfeer) {
  var boog = (soort === "boog"), schuin = (soort === "schuin");
  var DEK = parkDakKleur(glas, sfeer);
  var RAND = parkTint(DEK, -35), METAAL = "#8d959e";
  var dekking = glas ? 0.42 : undefined;
  /* De kolommen staan óp de grond en het dak erboven, niet andersom.
     Ze liepen eerst onder nul door, en dan steekt een dak dat je
     gewoon op het gras zet met zijn poten de aarde in. Zo werkt hij
     ook als losse overkapping, en getild komt alles mee omhoog. */
  var uit = [], dik = 0.1, voet = 1.9;

  if (schuin) {
    /* Aflopend naar voren: de achterkant hoog, de voorkant laag. Zo
       kijkt het publiek er onderdoor en loopt het water weg. */
    var kantel = -0.26;
    var zak = Math.sin(-kantel) * h / 2;
    uit.push({vorm:"doos", x:b/2, z:h/2, y:voet + zak*0.5, b:b, d:h, hoog:dik,
              kleur:DEK, dekking:dekking, kantel:kantel});
    uit.push({vorm:"doos", x:b/2, z:0.06, y:voet - zak*0.5 - 0.2, b:b, d:0.14,
              hoog:0.26, kleur:RAND});
  } else if (!boog) {
    uit.push({vorm:"doos", x:b/2, z:h/2, y:voet, b:b, d:h, hoog:dik,
              kleur:DEK, dekking:dekking});
    /* Een randbalk voor en achter, zodat het geen zwevend velletje is */
    uit.push({vorm:"doos", x:b/2, z:0.06, y:voet-0.16, b:b, d:0.14, hoog:0.24, kleur:RAND});
    uit.push({vorm:"doos", x:b/2, z:h-0.06, y:voet-0.16, b:b, d:0.14, hoog:0.24, kleur:RAND});
  } else {
    /* Een boog van platen: elk stukje een slag verder gekanteld. */
    var n = Math.max(6, Math.round(h * 2.2));
    /* De boog spant precies van de voorrand naar de achterrand: met
       een grotere straal steekt hij aan beide kanten buiten zijn eigen
       vakjes uit, en dan hangt hij over de buren heen. */
    var straal = h / 2, mz = h/2, my = voet;
    for (var i = 0; i < n; i++) {
      var a = Math.PI * (i + 0.5) / n;              /* van 0 tot pi */
      var z = mz - Math.cos(a) * straal;
      var y = my + Math.sin(a) * straal * 0.55;
      var lengte = (Math.PI * straal / n) * 1.12;
      uit.push({vorm:"doos", x:b/2, z:z, y:y, b:b, d:lengte, hoog:dik,
                kleur:DEK, dekking:dekking, kantel: a - Math.PI/2});
    }
    /* Spanten langs de boog */
    var spanten = Math.max(2, Math.round(b / 5));
    for (var k = 0; k <= spanten; k++) {
      var sx = parkKlem(k * b / spanten, 0.12, b - 0.12);
      for (var j = 0; j < n; j++) {
        var aa = Math.PI * (j + 0.5) / n;
        uit.push({vorm:"doos", x:sx, z:mz - Math.cos(aa)*straal,
                  y:my + Math.sin(aa)*straal*0.55 - 0.06,
                  b:0.12, d:(Math.PI*straal/n)*1.12, hoog:0.08,
                  kleur:METAAL, kantel: aa - Math.PI/2});
      }
    }
  }
  /* Kolommen aan de achterkant, naar beneden */
  var palen = Math.max(2, Math.round(b / 6));
  var paalHoog = voet + (schuin ? Math.sin(0.26) * h / 2 : 0);
  for (var p = 0; p <= palen; p++) {
    var px = parkKlem(p * b / palen, 0.2, b - 0.2);
    uit.push({vorm:"doos", x:px, z:h - 0.2, y:0, b:0.18, d:0.18,
              hoog:paalHoog, kleur:METAAL});
  }
  return uit;
}

/* Een dak dat de ronding van een bochttribune volgt: een ring van
   panelen op kolommen aan de buitenkant. Dezelfde meetkunde als de
   bocht zelf, zodat de twee op elkaar passen. */
function pvBochtDak(b, h, graden, glas, sfeer) {
  var m = parkBochtMaat(b, h, graden);
  var kleur = glas ? "rgba(170,210,232,.6)" : parkDakKleur(false, sfeer);
  var v = [pvCirkel(m.mx, m.mz, m.straal + 0.3, kleur)];
  v.push(pvCirkel(m.mx, m.mz, m.binnen - 0.3, "rgba(0,0,0,0)"));
  return v;
}
function parkBochtDak(b, h, graden, glas, sfeer) {
  var m = parkBochtMaat(b, h, graden);
  var DEK = parkDakKleur(glas, sfeer), METAAL = "#8d959e";
  var dekking = glas ? 0.42 : undefined;
  var voet = m.top + 0.9, uit = [];
  var mid = (m.binnen + m.straal) / 2, diep = (m.straal - m.binnen) + 0.5;
  var n = parkKlem(Math.round(mid * (m.tot - m.van) / 1.1), 8, 72);
  for (var i = 0; i < n; i++) {
    var a = m.van + (i + 0.5) * (m.tot - m.van) / n;
    var breed = (mid * (m.tot - m.van) / n) * 1.1;
    /* Eerst de straalrichting, dan de booglengte — zie de opmerking
       bij parkBocht. */
    uit.push({vorm:"doos", x:m.mx + Math.cos(a)*mid, z:m.mz + Math.sin(a)*mid,
              y:voet, b:diep, d:breed, hoog:0.1, kleur:DEK, dekking:dekking, draai:-a});
  }
  /* Kolommen langs de buitenrand */
  var palen = parkKlem(Math.round(m.straal * (m.tot - m.van) / 4), 3, 24);
  for (var k = 0; k <= palen; k++) {
    var ap = m.van + k * (m.tot - m.van) / palen;
    uit.push({vorm:"doos", x:m.mx + Math.cos(ap)*(m.straal - 0.2),
              z:m.mz + Math.sin(ap)*(m.straal - 0.2), y:0,
              b:0.18, d:0.18, hoog:voet, kleur:METAAL, draai:-ap});
  }
  return uit;
}

/* ── Skybox ─────────────────────────────────────────────────
   Een glazen loge op poten, met een rij stoelen erachter het glas. */
function pvSkybox(b, h) {
  return [pvRect(0, 0, b, h, "#4a525c", {r:0.12}),
          pvRect(0.25, 0.25, b - 0.5, h*0.45, "#9fd0ea", {r:0.08})];
}
function parkSkybox(b, h, sfeer) {
  var STOEL = (sfeer && sfeer.stoel) || PARK_KLEUR.blauw;
  var MUUR = (sfeer && sfeer.muur) || "#d3cec4";
  var poot = 1.5, hoog = 1.15, uit = [];
  [[0.35,0.35],[b-0.35,0.35],[0.35,h-0.35],[b-0.35,h-0.35]].forEach(function(q){
    uit.push({vorm:"doos", x:q[0], z:q[1], y:0, b:0.3, d:0.3, hoog:poot, kleur:"#8d959e"});
  });
  uit.push({vorm:"doos", x:b/2, z:h/2, y:poot, b:b, d:h, hoog:0.14, kleur:MUUR});
  uit.push({vorm:"doos", x:b/2, z:h/2, y:poot + 0.14, b:b - 0.3, d:h - 0.3,
            hoog:hoog, kleur:MUUR});
  /* De pui aan de veldkant */
  uit = uit.concat(parkRaamband(b/2, 0.16, true, b*0.86, poot + 0.34, hoog*0.62,
                                "#9fd0ea", "#41474e"));
  /* Stoelen erachter */
  var n = Math.max(3, Math.round(b * 1.4));
  for (var i = 0; i < n; i++) {
    var x = (i + 0.5) * b / n;
    uit.push({vorm:"doos", x:x, z:h*0.42, y:poot + 0.2, b:b/n - 0.1, d:0.3,
              hoog:0.07, kleur:STOEL});
    uit.push({vorm:"doos", x:x, z:h*0.56, y:poot + 0.2, b:b/n - 0.1, d:0.07,
              hoog:0.26, kleur:STOEL});
  }
  uit.push({vorm:"doos", x:b/2, z:h/2, y:poot + 0.14 + hoog, b:b + 0.24, d:h + 0.24,
            hoog:0.12, kleur:parkTint(MUUR, -40)});
  return uit;
}

/* Een tribune zoals die van ons op de Vierkantsdijk: betonnen
   traptreden met blauwe stoeltjes, een reling voorlangs, en bij een
   overdekte een gemetselde achterwand met een glasstrook en een plat
   dak dat vóór de kolommen uitsteekt. Het waren gewoon blauwe blokken
   die als een trap opliepen — vandaar dat het er zo hard uitzag. */
/* Hoeveel rijen er op een tribune passen en hoe hoog hij daarmee
   wordt. Dat stond per tribune met de hand ingevuld, dus een diepere
   tribune kreeg diepere treden in plaats van meer rijen. */
function parkTribuneMaat(h) {
  return {rijen: parkKlem(Math.round(h * 1.6), 3, 14), top: h * 0.44};
}
function parkTreden(b, h, metDak, sfeer) {
  var tm = parkTribuneMaat(h), aantal = tm.rijen, top = tm.top;
  var BETON = "#c9ccd1", NEUS = "#e2e5e8", METAAL = "#8d959e", GLAS = "#b9d2e4";
  var STOEL = (sfeer && sfeer.stoel) || PARK_KLEUR.blauw;
  var STEEN = (sfeer && sfeer.muur)  || "#d3cec4";
  var DAK   = parkTint(STEEN, -40);
  var uit = [], diepte = h/aantal;
  for (var i = 0; i < aantal; i++) {
    var zMid = diepte*(i+0.5), hoogte = top*(i+1)/aantal;
    uit.push({vorm:"doos", x:b/2, z:zMid, y:0, b:b, d:diepte, hoog:hoogte, kleur:BETON});
    /* De neus van de trede iets lichter; dat geeft de trap reliëf */
    uit.push({vorm:"doos", x:b/2, z:zMid - diepte/2 + 0.05, y:hoogte - 0.05,
              b:b, d:0.1, hoog:0.06, kleur:NEUS});
    /* Een doorlopende rij stoeltjes: zitting en rugleuning */
    uit.push({vorm:"doos", x:b/2, z:zMid + diepte*0.1, y:hoogte, b:b-0.5, d:diepte*0.4,
              hoog:0.07, kleur:STOEL});
    uit.push({vorm:"doos", x:b/2, z:zMid + diepte*0.32, y:hoogte, b:b-0.5, d:0.07,
              hoog:0.28, kleur:STOEL});
  }
  /* Reling langs de voorkant, zodat niemand van de onderste trede stapt */
  uit.push({vorm:"doos", x:b/2, z:0.06, y:0.62, b:b, d:0.06, hoog:0.06, kleur:METAAL});
  for (var r = 0; r <= Math.round(b/2.5); r++)
    uit.push({vorm:"cilinder", x:Math.min(r*2.5, b-0.1), z:0.06, y:0, straal:0.045,
              hoog:0.68, kleur:METAAL});
  if (metDak) {
    var muur = top + 1.35;
    /* Gemetselde achterwand met een glasstrook erboven */
    uit.push({vorm:"doos", x:b/2, z:h-0.12, y:0, b:b, d:0.24, hoog:muur*0.62, kleur:STEEN});
    uit.push({vorm:"doos", x:b/2, z:h-0.12, y:muur*0.62, b:b-0.3, d:0.16,
              hoog:muur*0.38, kleur:GLAS});
    /* Zijwanden */
    [0.12, b-0.12].forEach(function(x){
      uit.push({vorm:"doos", x:x, z:h/2, y:0, b:0.24, d:h, hoog:muur*0.5, kleur:STEEN});
    });
    /* Kolommen vooraan, zoals op de foto: het dak rust erop en steekt
       er nog een stuk overheen. */
    var kolomZ = h*0.22;
    var kolommen = Math.max(2, Math.round(b/5));
    for (var k = 0; k <= kolommen; k++)
      uit.push({vorm:"doos", x:parkKlem(k*b/kolommen, 0.25, b-0.25), z:kolomZ, y:0,
                b:0.16, d:0.16, hoog:muur, kleur:METAAL});
    /* Het dak loopt van de achterwand tot een stuk vóór de tribune.
       Het stak eerst ook aan de achterkant uit, dwars door de wand
       heen en over de buren — dat is nergens voor nodig. */
    var dakVoor = -0.3;
    uit.push({vorm:"doos", x:b/2, z:(h + dakVoor)/2, y:muur,
              b:b+0.3, d:h - dakVoor, hoog:0.12, kleur:DAK});
    uit.push({vorm:"doos", x:b/2, z:dakVoor + 0.07, y:muur - 0.16,
              b:b+0.3, d:0.14, hoog:0.28, kleur:"#41474e"});
  }
  return uit;
}
/* ── Licht op het complex ────────────────────────────────────
   Drie momenten van de dag. Bewust als losse beschrijving en niet
   verspreid door de scène heen, zodat ik de zonstand en de kleuren
   kan narekenen zonder ernaar te kunnen kijken. De zon staat als een
   richting ten opzichte van waar je naar kijkt; de lengte van die
   richting bepaalt hoe lang de schaduwen worden. */
const PARK_DAGDELEN = [
  {id:"ochtend", label:"Ochtend", icoon:"fa-solid fa-cloud-sun",
   lucht:"#cfe0ee", mist:[300, 700],
   /* Laag uit het oosten: lange schaduwen naar het westen */
   zon:{x:132, y:38, z:26, kleur:0xffe6c4, kracht:0.82},
   omgeving:0.24, hemel:{boven:0xe2edf7, onder:0x4a7a3f, kracht:0.5},
   gras:"#5f9f52", masten:false},
  {id:"middag",  label:"Middag",  icoon:"fa-solid fa-sun",
   lucht:"#bcd9ee", mist:[260, 620],
   zon:{x:-70, y:110, z:46, kleur:0xfff4e0, kracht:1.05},
   omgeving:0.20, hemel:{boven:0xcfe4f5, onder:0x4a7a3f, kracht:0.55},
   gras:"#5a9a4e", masten:false},
  /* Een neutrale grijze ruimte zonder lucht en zonder zonstand: dan
     ziet je complex eruit als een maquette op tafel in plaats van als
     een terrein op een zomerdag. */
  {id:"studio",  label:"Studio",  icoon:"fa-solid fa-cube",
   lucht:"#9aa0a6", mist:[420, 900],
   zon:{x:-46, y:96, z:64, kleur:0xffffff, kracht:0.72},
   omgeving:0.46, hemel:{boven:0xffffff, onder:0xbfc4c9, kracht:0.62},
   gras:"#79868c", masten:false, vlak:true},
  {id:"avond",   label:"Avond",   icoon:"fa-solid fa-moon",
   lucht:"#2c3c5e", mist:[170, 460],
   /* Laag uit het westen en zwak: de lichtmasten doen het werk */
   zon:{x:-146, y:24, z:-34, kleur:0xffa860, kracht:0.30},
   omgeving:0.15, hemel:{boven:0x35507a, onder:0x1c2f22, kracht:0.34},
   gras:"#2f5b30", masten:true}
];
function parkDagdeel(id) {
  return PARK_DAGDELEN.filter(function(d){ return d.id === id; })[0] || PARK_DAGDELEN[1];
}
/* Hoe schuin de zon staat, in graden boven de horizon. Puur om te
   kunnen nakijken dat ochtend en avond echt laag staan. */
function parkZonHoogte(dagdeel) {
  var z = parkDagdeel(dagdeel.id ? dagdeel.id : dagdeel).zon;
  return Math.atan2(z.y, Math.sqrt(z.x*z.x + z.z*z.z)) * 180 / Math.PI;
}

/* ── De camera ──────────────────────────────────────────────
   Three.js heeft zelf geen camerabesturing in het bestand dat wij
   inladen, dus die reken ik hier uit. Bewust als losse functies,
   zodat ik ze kan nalopen zonder de scène te zien. */
const PARK_CAM = {
  afstandMin: 8, afstandMax: 320,
  /* Bijna langs het gras tot recht van boven. De ondergrens is laag
     genoeg om vanaf de zijlijn over het veld te kijken. */
  kantelMin: 0.04, kantelMax: 1.5,
  start: {afstand: 150, draai: -0.7, kantel: 0.55}
};
function parkCameraPositie(doel, afstand, draai, kantel) {
  var vlak = Math.cos(kantel) * afstand;
  return {
    x: doel.x + vlak * Math.sin(draai),
    y: doel.y + Math.sin(kantel) * afstand,
    z: doel.z + vlak * Math.cos(draai)
  };
}
function parkKlem(waarde, min, max) { return Math.max(min, Math.min(max, waarde)); }
/* Draaien en kantelen na een sleepbeweging. De kanteling wordt
   begrensd, anders kiep je onder de grond door of sta je loodrecht
   boven het veld zonder diepte. */
function parkCameraDraai(huidig, dx, dy) {
  return {
    draai:  huidig.draai - dx * 0.006,
    kantel: parkKlem(huidig.kantel + dy * 0.005, PARK_CAM.kantelMin, PARK_CAM.kantelMax),
    afstand: huidig.afstand
  };
}
/* Wat de camera in beeld heeft, afhankelijk van hoever je uitzoomt.
   Bij een terrein van 480 meter moet je ook een heel eind kunnen
   verschuiven zonder dat je de rand kwijtraakt. */
/* Alles in beeld: het kleinste vak dat om alle onderdelen heen past,
   en hoe ver de camera daarvoor moet staan. De kijkhoek van 45 graden
   staat ook in de camera zelf; die twee moeten gelijk blijven. */
const PARK_CAM_HOEK = 45;
function parkAllesInBeeld(stukken, verhouding, kantel) {
  var vakken = (stukken || []).map(parkVak);
  if (!vakken.length) {
    return {doel:{x:PARK_KOLOMMEN/2, y:0, z:PARK_RIJEN/2},
            afstand: PARK_CAM.start.afstand};
  }
  var x1 = Math.min.apply(null, vakken.map(function(v){ return v.x; }));
  var y1 = Math.min.apply(null, vakken.map(function(v){ return v.y; }));
  var x2 = Math.max.apply(null, vakken.map(function(v){ return v.x + v.b; }));
  var y2 = Math.max.apply(null, vakken.map(function(v){ return v.y + v.h; }));
  var b = Math.max(6, x2 - x1), d = Math.max(6, y2 - y1);
  var vh = Math.max(0.5, verhouding || 1.5);
  var kant = parkKlem(kantel === undefined ? PARK_CAM.start.kantel : kantel,
                      PARK_CAM.kantelMin, PARK_CAM.kantelMax);
  /* Schuin kijken drukt de diepte in elkaar: hoe platter de camera,
     hoe verder je moet staan om dezelfde diepte te zien. */
  var plat = Math.max(0.35, Math.sin(kant));
  var halveHoek = Math.tan(PARK_CAM_HOEK * Math.PI / 360);
  var nodig = Math.max((d / plat) / 2 / halveHoek, (b / vh) / 2 / halveHoek);
  return {
    doel: {x:(x1 + x2)/2, y:0, z:(y1 + y2)/2},
    afstand: parkKlem(nodig * 1.22, PARK_CAM.afstandMin, PARK_CAM.afstandMax)
  };
}
function parkCameraGrens() { return Math.max(PARK_KOLOMMEN, PARK_RIJEN) * 0.35; }
/* Hoe groot maken we het vak waarbinnen schaduwen berekend worden?
   Het hele terrein zou 480 meter zijn en dat wordt korrelig, dus het
   vak loopt mee met hoever je uitzoomt — altijd ruim om wat je ziet
   heen, maar nooit zo groot dat de randen blokkerig worden. */
function parkSchaduwVak(afstand) {
  return parkKlem(afstand * 0.75, 40, 120);
}
function parkCameraZoom(huidig, stappen) {
  return Object.assign({}, huidig, {
    afstand: parkKlem(huidig.afstand * Math.pow(1.12, stappen), PARK_CAM.afstandMin, PARK_CAM.afstandMax)
  });
}
/* Schuiven over de grond, in de richting waarin de camera kijkt.
   Zonder die draaiing schuift het terrein de verkeerde kant op zodra
   je een kwartslag om je complex heen bent gelopen. */
function parkCameraSchuif(doel, draai, afstand, dx, dy) {
  var f = afstand * 0.0022;
  var vx = -dx * f, vz = -dy * f;
  var g = parkCameraGrens();
  return {
    x: parkKlem(doel.x + vx * Math.cos(draai) - vz * Math.sin(draai), -g, PARK_KOLOMMEN + g),
    y: doel.y,
    z: parkKlem(doel.z + vx * Math.sin(draai) + vz * Math.cos(draai), -g, PARK_RIJEN + g)
  };
}
/* ── Waar een onderdeel staat en hoe het gedraaid is ─────────
   Vroeger was dit een linksbovenhoek plus "gedraaid: ja of nee".
   Dat werkt niet meer nu je in stappen van vijftien graden mag
   draaien: om een hoekpunt draaien laat een onderdeel wegzwiepen.
   Daarom ligt de plek nu in het midden en is de stand een hoek.
   Oude parken worden bij het lezen omgerekend, zonder te
   verspringen — parkVernieuw doet dat. ─────────────────────── */
const PARK_HOEK_STAP = 15;

function parkOnderdeel(id) {
  return PARK_ONDERDELEN.filter(function(o){ return o.id===id; })[0] || null;
}
/* Buiten was een restbak geworden: bestrating, hekken, bomen, water,
   speeltuin en wegen door elkaar. Nu gaat elk tabblad ergens over. */
const PARK_GROEPEN = ["Velden","Materiaal","Gebouwen","Publiek","Daken",
                      "Terrein","Groen","Sfeer"];

/* Hoe een onderdeel van maat verandert als je aan het handvat trekt:
     "vlak"    breedte en diepte allebei — gebouwen, velden, verharding
     "lengte"  alleen langer of korter — hek, haag, weg, ballenvanger
     "formaat" één percentage — boom, lichtmast, doeltjes; die bestaan
               uit bollen en cilinders met een vaste straal en trekken
               zich van breedte en diepte niets aan. */
const PARK_SCHAAL = {
  lengte: ["ballenvanger","ladder","horden","dugout","pad","hek","weg","wegStoep",
           "haag","bomenrij","water","fietsen"],
  formaat:["goalGroot","goalPupil","goalMini","pionnen","dopjes","ballenkar",
           "lichtmast","boom","struik","vlag"]
};
function parkSchaalSoort(type) {
  if (PARK_SCHAAL.lengte.indexOf(type)  >= 0) return "lengte";
  if (PARK_SCHAAL.formaat.indexOf(type) >= 0) return "formaat";
  return "vlak";
}
/* Niets kleiner dan één vakje; een veld niet onder de tien meter,
   want daaronder slaat de belijning nergens meer op. */
function parkMaatGrens(type) {
  var o = parkOnderdeel(type);
  return {min: (o && o.groep === "Velden") ? 4 : 1,
          max: Math.min(PARK_KOLOMMEN, PARK_RIJEN)};
}
const PARK_FORMAAT_MIN = 0.4, PARK_FORMAAT_MAX = 2.5, PARK_FORMAAT_STAP = 0.05;
/* De derde richting: hoe veel keer zijn eigen hoogte een onderdeel
   wordt. Breedte en diepte zitten in de voetafdruk, de hoogte niet —
   die lag per soort vast. Dit rekt hem uit; een hek van zes meter in
   plaats van vier, een gebouw met een verdieping erbij. */
const PARK_HOOG_MIN = 0.3, PARK_HOOG_MAX = 4, PARK_HOOG_STAP = 0.05;
function parkHoogMaal(stuk) {
  var v = stuk && stuk.hoogMaal;
  if (typeof v !== "number" || !isFinite(v) || v <= 0) return 1;
  return parkKlem(v, PARK_HOOG_MIN, PARK_HOOG_MAX);
}
/* Een lichtmast is zeventien en een halve meter hoog en staat twee­ën­dertig
   graden voorover, waarmee de plas licht ruim tien meter voor de mast
   op het gras valt. Recht naar beneden schijnen doen ze niet. */
const PARK_MAST_HOOG = 7, PARK_MAST_KANTEL = 32;

/* ── Kleuren en maaipatroon van het complex ──────────────────
   De stoeltjes stonden hard op clubblauw. Jullie tenuekleur staat al
   in de app, dus daar beginnen we mee; wie een ander complex bouwt
   zet hem gewoon om. */
const PARKSFEER_KEY = "fch_parksfeer_v1";
const PARK_MAAIPATRONEN = [
  {id:"banen",     label:"Banen",     uitleg:"Dwars op de lengte, zoals een maaimachine ze rijdt"},
  {id:"blokken",   label:"Blokken",   uitleg:"Geruit, als een schaakbord"},
  {id:"diagonaal", label:"Diagonaal", uitleg:"Schuin over het veld"},
  {id:"lengte",    label:"In de lengte", uitleg:"Banen van doel naar doel"},
  {id:"cirkels",   label:"Cirkels",   uitleg:"Ringen vanaf de middenstip"},
  {id:"glad",      label:"Glad",      uitleg:"Geen patroon"}
];
function parkMaaipatroon(id) {
  return PARK_MAAIPATRONEN.filter(function(m){ return m.id === id; })[0] || PARK_MAAIPATRONEN[0];
}
function laadParkSfeer() {
  var tenue = (typeof laadTenue === "function") ? laadTenue() : {};
  var uit = {stoel: tenue.shirt || "#004aad", muur: "#c9ccd1",
             dak: "#5a626c", maaien: "banen"};
  try {
    var r = localStorage.getItem(sleutelVoor(PARKSFEER_KEY));
    if (r) {
      var o = JSON.parse(r) || {};
      if (typeof o.stoel  === "string") uit.stoel  = o.stoel;
      if (typeof o.muur   === "string") uit.muur   = o.muur;
      if (typeof o.dak    === "string") uit.dak    = o.dak;
      if (typeof o.maaien === "string") uit.maaien = o.maaien;
    }
  } catch(e) {}
  return uit;
}
function slaParkSfeer(v) { try { localStorage.setItem(sleutelVoor(PARKSFEER_KEY), JSON.stringify(v)); } catch(e) {} }

/* ── Wat er staat, in cijfers ────────────────────────────────
   Een tribune weet zelf hoeveel rijen hij heeft; hoeveel mensen erop
   passen volgt daaruit. Een zitplaats is een halve meter breed, een
   staanplaats vijfendertig centimeter. Alles afgeleid uit wat er
   neergezet is, dus er valt niets uit de pas te lopen. */
const PARK_ZITBREED = 0.5 / PARK_METER;   /* in vakjes */
const PARK_STABREED = 0.35 / PARK_METER;
/* Welke soort plaats een onderdeel oplevert. Een dichte container en
   een container met een luik leveren niets op: daar staat niemand op. */
const PARK_PLAATS_NAAM = {
  staan:"staanplaatsen", zit:"zitplaatsen", overdekt:"overdekte plaatsen", vip:"VIP-plaatsen"
};
const PARK_PLAATS_SOORT = {
  tribune:"zit", tribuneDak:"overdekt", tribuneKort:"overdekt", tribuneRing:"zit",
  bochtHalf:"zit", bochtHeel:"zit",
  staan:"staan", staanTribune:"staan", containerDak:"staan",
  skybox:"vip"
};
function parkPlaatsen(stuk) {
  var type = stuk && stuk.type;
  var soort = PARK_PLAATS_SOORT[type];
  if (!soort) return null;
  var e = parkEigenMaat(stuk);
  var rijen, perRij;

  if (type === "bochtHalf" || type === "bochtHeel") {
    var bp = parkBochtPlaatsen(e.b, e.h, type === "bochtHeel" ? 180 : 90);
    rijen = bp.rijen; perRij = bp.perRij;
  } else if (type === "containerDak") {
    /* Alleen het dak telt, en de reling gaat eraf */
    var db = Math.max(0, e.b - 0.24), dd = Math.max(0, e.h * 0.92 - 0.24);
    rijen = Math.max(1, Math.round(dd * 1.6));
    perRij = Math.floor(db / PARK_STABREED);
  } else if (type === "skybox") {
    /* Eén rij fauteuils achter het glas; ruimer dan een stoeltje */
    rijen = Math.max(1, Math.round(e.h * 0.5));
    perRij = Math.floor(e.b / (0.75 / PARK_METER));
  } else {
    var staat = (soort === "staan");
    rijen = staat ? Math.max(2, Math.round(e.h * 1.6)) : parkTribuneMaat(e.h).rijen;
    perRij = Math.floor(e.b / (staat ? PARK_STABREED : PARK_ZITBREED));
  }
  return {soort: soort, rijen: rijen, perRij: Math.max(0, perRij),
          aantal: Math.max(0, rijen * Math.max(0, perRij))};
}
function parkCijfers(stukken) {
  var uit = {
    staan:0, zit:0, overdekt:0, vip:0, totaal:0,
    velden:0, veldOppervlak:0, gebouwen:0, parkeer:0, lichtmasten:0,
    bomen:0, onderdelen:(stukken||[]).length, oppervlak:0
  };
  (stukken||[]).forEach(function(s){
    var o = parkOnderdeel(s.type);
    if (!o) return;
    var e = parkEigenMaat(s);
    var m2 = e.b * e.h * PARK_METER * PARK_METER;
    var p = parkPlaatsen(s);
    if (p) uit[p.soort] += p.aantal;
    if (o.groep === "Velden")   { uit.velden++; uit.veldOppervlak += m2; }
    if (o.groep === "Gebouwen") uit.gebouwen++;
    if (s.type === "parkeer") {
      /* Een plek is 2,5 bij 5 meter, en ongeveer een derde gaat op
         aan rijbanen. */
      uit.parkeer += Math.max(0, Math.round(e.b * (e.h/2) * 0.62));
    }
    if (s.type === "lichtmast") uit.lichtmasten++;
    if (s.type === "boom")      uit.bomen += 1;
    if (s.type === "bomenrij")  uit.bomen += Math.max(2, Math.round(e.b/3));
    if (!parkLos(s)) uit.oppervlak += m2;
  });
  uit.totaal = uit.staan + uit.zit + uit.overdekt + uit.vip;
  return uit;
}

function parkHoek(stuk) {
  if (stuk && typeof stuk.hoek === "number")
    return ((Math.round(stuk.hoek) % 360) + 360) % 360;
  return (stuk && stuk.gedraaid) ? 90 : 0;
}
/* De eigen maat van het onderdeel, ongedraaid */
/* Welk maaipatroon dit veld heeft. Stond eerst voor het hele park
   ingesteld; dat betekende dat je alle drie de velden tegelijk moest
   omgooien. Zonder eigen keuze valt hij terug op de parkinstelling,
   zodat bestaande parken er hetzelfde uit blijven zien. */
function parkVeldPatroon(stuk, sfeer) {
  if (stuk && typeof stuk.maaien === "string") return stuk.maaien;
  return (sfeer && sfeer.maaien) || "banen";
}
function parkEigenMaat(stuk) {
  var o = parkOnderdeel(stuk && stuk.type);
  /* Een boom of een doeltje heeft geen eigen breedte en diepte maar
     een percentage; dat werkt op allebei tegelijk. */
  var f = (stuk && stuk.formaat) || 1;
  return { b: ((stuk && stuk.b) || (o ? o.b : 1)) * f,
           h: ((stuk && stuk.h) || (o ? o.h : 1)) * f };
}
function parkMidden(stuk) {
  if (stuk && typeof stuk.cx === "number" && typeof stuk.cy === "number")
    return {cx: stuk.cx, cy: stuk.cy};
  /* Een oud onderdeel: de hoek linksboven met de maat zoals die er
     toen uitzag, dus met breedte en hoogte verwisseld als hij stond. */
  var e = parkEigenMaat(stuk);
  var om = stuk && stuk.gedraaid;
  return {cx: (stuk.x||0) + (om ? e.h : e.b)/2,
          cy: (stuk.y||0) + (om ? e.b : e.h)/2};
}
function parkVernieuw(stuk) {
  var m = parkMidden(stuk);
  var n = {id: stuk.id, type: stuk.type, cx: m.cx, cy: m.cy, hoek: parkHoek(stuk)};
  if (stuk.b && stuk.h) { n.b = stuk.b; n.h = stuk.h; }
  if (stuk.formaat && stuk.formaat !== 1) n.formaat = stuk.formaat;
  if (parkOp(stuk) > 0) n.op = parkOp(stuk);
  if (parkHoogMaal(stuk) !== 1) n.hoogMaal = parkHoogMaal(stuk);
  return n;
}
function parkVernieuwAlles(lijst) { return (lijst||[]).map(parkVernieuw); }

/* De vier hoekpunten op het terrein */
/* De cosinus en sinus van een hoek. Bij een kwartslag met de hand,
   want Math.cos(270°) geeft 1,8·10⁻¹⁶ in plaats van nul en dan valt
   een rechte rand net niet meer op het raster. */
function parkDraaiing(hoek) {
  var hk = ((Math.round(hoek) % 360) + 360) % 360;
  if (hk % 90 === 0) { var k = hk / 90; return {co:[1,0,-1,0][k], si:[0,1,0,-1][k]}; }
  var r = hk * Math.PI / 180;
  return {co: Math.cos(r), si: Math.sin(r)};
}
function parkHoekpunten(stuk) {
  var e = parkEigenMaat(stuk), m = parkMidden(stuk);
  var d = parkDraaiing(parkHoek(stuk)), co = d.co, si = d.si;
  var hb = e.b/2, hh = e.h/2;
  return [[-hb,-hh],[hb,-hh],[hb,hh],[-hb,hh]].map(function(q){
    return {x: m.cx + q[0]*co - q[1]*si, y: m.cy + q[0]*si + q[1]*co};
  });
}
/* De rechte rechthoek eromheen: om binnen het terrein te blijven */
function parkVak(stuk) {
  var p = parkHoekpunten(stuk);
  var xs = p.map(function(q){ return q.x; }), ys = p.map(function(q){ return q.y; });
  var x1 = Math.min.apply(null, xs), x2 = Math.max.apply(null, xs);
  var y1 = Math.min.apply(null, ys), y2 = Math.max.apply(null, ys);
  return {x:x1, y:y1, b:x2-x1, h:y2-y1};
}
/* De maat zoals hij in de kist en op het kaartje staat */
function parkMaat(stuk) {
  var e = parkEigenMaat(stuk), hk = parkHoek(stuk);
  return (hk === 90 || hk === 270) ? {b:e.h, h:e.b} : {b:e.b, h:e.h};
}
/* ── Hoogte ─────────────────────────────────────────────────
   Alles stond plat op de grond en het botsen keek alleen naar het
   grondvlak. Een onderdeel heeft nu een hoogte en kan opgetild
   staan; twee dingen zitten elkaar alleen in de weg als ze elkaar
   ook in de hoogte raken. Zo kun je containers op elkaar zetten en
   een dak boven een tribune hangen.

   Hoe hoog iets is meet ik aan wat er getekend wordt, niet aan een
   apart getal: dan kan het niet uit de pas lopen met het model. Per
   soort en maat één keer, daarna uit de kast. */
const _parkHoogKast = {};
function parkHoogte(stuk) {
  var o = parkOnderdeel(stuk && stuk.type);
  if (!o) return 0;
  var e = parkEigenMaat(stuk);
  var sleutel = o.id + "|" + e.b.toFixed(2) + "x" + e.h.toFixed(2);
  /* In de kast zit de hoogte zoals het onderdeel bedoeld is; het
     uitrekken komt er bij het teruggeven overheen. Die factor hoort
     dus ook op deze regel te staan en niet alleen onderaan. */
  if (_parkHoogKast[sleutel] !== undefined)
    return _parkHoogKast[sleutel] * parkHoogMaal(stuk);
  var top = o.hoogte || 0;
  try {
    var delen = o.bouw ? o.bouw(e.b, e.h, function(){ return 0.5; }, null) : [];
    delen.forEach(function(d){
      var boven;
      if (d.vorm === "bol") boven = (d.y||0) + (d.straal||0)*2;
      else if (d.punt)      boven = (d.y||0);          /* hangt aan zijn punt */
      else if (d.midden)    boven = (d.y||0) + (d.hoog||0)/2;
      else                  boven = (d.y||0) + (d.hoog||0);
      if (boven > top) top = boven;
    });
  } catch (e2) {}
  _parkHoogKast[sleutel] = top;
  return top * parkHoogMaal(stuk);
}
/* Op welke hoogte de onderkant staat */
function parkOp(stuk) {
  var v = stuk && stuk.op;
  return (typeof v === "number" && isFinite(v)) ? Math.max(0, v) : 0;
}
/* Raken twee onderdelen elkaar ook in de hoogte? */
function parkOverlaptHoog(a, b) {
  var a0 = parkOp(a), a1 = a0 + parkHoogte(a);
  var b0 = parkOp(b), b1 = b0 + parkHoogte(b);
  /* Precies op elkaar staan mag: dat is juist stapelen. */
  return a0 < b1 - 1e-6 && b0 < a1 - 1e-6;
}
/* Een overkapping staat op zijn eigen poten. Die hoort dus niet
   bovenop een tribune gestapeld te worden — dan tel je de poten er
   twee keer bij en hangt het dak op eenentwintig meter — maar er
   net overheen te schuiven. En omdat die poten langs de tribune naar
   beneden lopen, mag hij ook niets in de weg zitten: anders weigert
   het botsen elke hoogte die je probeert. */
function parkOverkapping(stuk) {
  var o = parkOnderdeel(stuk && stuk.type);
  return !!(o && o.overkapping);
}
/* Hoe hoog de poten van een overkapping zijn: het hoogste deel dat
   vanaf de grond begint. Gemeten aan wat er getekend wordt, net als
   de hoogte zelf. */
const _parkVoetKast = {};
function parkDakVoet(stuk) {
  var o = parkOnderdeel(stuk && stuk.type);
  if (!o || !o.bouw) return 0;
  var e = parkEigenMaat(stuk);
  var sleutel = o.id + "|" + e.b.toFixed(2) + "x" + e.h.toFixed(2);
  if (_parkVoetKast[sleutel] !== undefined)
    return _parkVoetKast[sleutel] * parkHoogMaal(stuk);
  var voet = 0;
  try {
    o.bouw(e.b, e.h, function(){ return 0.5; }, null).forEach(function(d){
      if ((d.y || 0) > 1e-6) return;              /* begint niet op de grond */
      var boven = (d.hoog || 0);
      if (boven > voet) voet = boven;
    });
  } catch (e2) {}
  _parkVoetKast[sleutel] = voet;
  return voet * parkHoogMaal(stuk);
}

/* Hoe hoog je moet beginnen om ergens bovenop te komen */
function parkStapelHoogte(stuk, andere) {
  var top = 0;
  (andere || []).forEach(function(x){
    if (x.id === stuk.id || parkLos(x)) return;
    if (!parkOverlapt(stuk, x)) return;
    var boven = parkOp(x) + parkHoogte(x);
    if (boven > top) top = boven;
  });
  return top;
}

/* Waar en hoe een onderdeel in de scène komt te staan. Als losse
   functie, zodat de plaatsing na te rekenen valt zonder de scène —
   anders is juist de regel die het stapelen zichtbaar maakt de enige
   die niemand controleert. */
function parkPlaatsing(stuk) {
  var mid = parkMidden(stuk);
  var f = (stuk && stuk.formaat) || 1;
  var s = (f && isFinite(f) && f > 0) ? f : 1;
  return {x: mid.cx, y: parkOp(stuk), z: mid.cy,
          draai: -parkHoek(stuk) * Math.PI / 180,
          schaal: s, schaalY: s * parkHoogMaal(stuk)};
}
/* Waar de onderkant van een los deel komt te liggen. Normaal is y de
   onderkant en zit het middelpunt er een halve hoogte boven. Iets dat
   scheef staat heeft geen zinnige onderkant meer; dan geeft midden
   aan dat y al het middelpunt is. Zonder dat zweeft een schuine paal
   een halve paallengte boven het gras. Losse functie, want dit is
   precies zo'n regel die niemand controleert. */
function parkDeelHoogte(deel, hoog) {
  return (deel.y || 0) + (deel.midden ? 0 : (hoog || 0) / 2);
}
function parkBinnen(stuk) {
  return parkHoekpunten(stuk).every(function(q){
    return q.x >= -1e-6 && q.y >= -1e-6 &&
           q.x <= PARK_KOLOMMEN + 1e-6 && q.y <= PARK_RIJEN + 1e-6;
  });
}
/* Zo ver opschuiven dat hij weer helemaal op het terrein past */
function parkBinnenTerrein(stuk) {
  var v = parkVak(stuk), cx = stuk.cx, cy = stuk.cy;
  if (v.b > PARK_KOLOMMEN || v.h > PARK_RIJEN) return Object.assign({}, stuk);
  if (v.x < 0) cx -= v.x;
  else if (v.x + v.b > PARK_KOLOMMEN) cx -= (v.x + v.b - PARK_KOLOMMEN);
  if (v.y < 0) cy -= v.y;
  else if (v.y + v.h > PARK_RIJEN) cy -= (v.y + v.h - PARK_RIJEN);
  return Object.assign({}, stuk, {cx:cx, cy:cy});
}
/* Recht neergezette onderdelen klikken op het raster; schuine op
   halve vakjes, anders krijg je ze nooit meer netjes tegen elkaar. */
function parkKlikVast(stuk) {
  var hk = parkHoek(stuk);
  if (hk % 90 === 0) {
    var m = parkMaat(stuk);
    return Object.assign({}, stuk, {
      cx: Math.round(stuk.cx - m.b/2) + m.b/2,
      cy: Math.round(stuk.cy - m.h/2) + m.h/2 });
  }
  return Object.assign({}, stuk, {
    cx: Math.round(stuk.cx*2)/2, cy: Math.round(stuk.cy*2)/2 });
}

/* Materiaal — pionnen, dopjes, doeltjes, een ladder — hoort juist
   óp een veld te kunnen staan. Alles wat als los gemerkt is botst
   met niets en niets botst ermee. */
function parkLos(stuk) {
  var o = parkOnderdeel(stuk && stuk.type);
  return !!(o && o.los);
}
/* Bestrating, paden, wegen én gras zijn ondergrond: daar hoort juist
   van alles op te staan. Een lichtmast midden op een tegelpad werd
   eerst geweigerd, en dat is precies waar zo'n mast in het echt
   staat. Hetzelfde geldt voor een vlaggenmast, een bankje of een boom
   naast het veld — die staan bijna altijd in het gras. */
const PARK_PLAT = ["tegel","pad","plein","weg","wegBocht","wegStoep","parkeer","terras"];
function parkVeld(stuk) {
  var o = parkOnderdeel(stuk && stuk.type);
  return !!(o && o.groep === "Velden");
}
function parkPlat(stuk) {
  return PARK_PLAT.indexOf(stuk && stuk.type) >= 0 || parkVeld(stuk);
}
/* Twee gedraaide rechthoeken raken elkaar alleen als er geen enkele
   richting is waarin je er een lijn tussendoor kunt trekken. Voor
   rechthoeken zijn vier richtingen genoeg: de zijden van allebei.
   Precies tegen elkaar aan mag; alleen echte overlap telt. */
function parkOverlapt(a, b) {
  var pa = parkHoekpunten(a), pb = parkHoekpunten(b), assen = [];
  [pa, pb].forEach(function(p){
    for (var k = 0; k < 2; k++) {
      var dx = p[k+1].x - p[k].x, dy = p[k+1].y - p[k].y;
      var l = Math.sqrt(dx*dx + dy*dy) || 1;
      assen.push({x: -dy/l, y: dx/l});
    }
  });
  for (var i = 0; i < assen.length; i++) {
    var as = assen[i], a1 = Infinity, a2 = -Infinity, b1 = Infinity, b2 = -Infinity, j, v;
    for (j = 0; j < 4; j++) {
      v = pa[j].x*as.x + pa[j].y*as.y; if (v < a1) a1 = v; if (v > a2) a2 = v;
      v = pb[j].x*as.x + pb[j].y*as.y; if (v < b1) b1 = v; if (v > b2) b2 = v;
    }
    if (a2 <= b1 + 1e-6 || b2 <= a1 + 1e-6) return false;
  }
  return true;
}
/* Vrij bouwen: dan mag alles overal, ook dwars door elkaar heen.
   Staat standaard uit, want zonder botsen leg je zo twee velden half
   over elkaar zonder dat iets je waarschuwt. */
const PARK_BOUWSTAND = {vrij: false};
function parkVrijBouwen(aan) {
  if (aan !== undefined) PARK_BOUWSTAND.vrij = !!aan;
  return PARK_BOUWSTAND.vrij;
}
function parkBotst(stuk, andere) {
  if (PARK_BOUWSTAND.vrij) return false;
  if (parkLos(stuk)) return false;
  var ditVeld = parkVeld(stuk);
  return (andere||[]).some(function(x){
    if (x.id === stuk.id) return false;
    if (parkLos(x)) return false;
    /* Twee velden half over elkaar is een vergissing en geen ontwerp,
       dus die blijven elkaar wél in de weg zitten. Verder geldt:
       staat een van de twee op de grond, dan mag het. */
    if (!(ditVeld && parkVeld(x)) && (parkPlat(stuk) || parkPlat(x))) return false;
    return parkOverlapt(stuk, x) && parkOverlaptHoog(stuk, x);
  });
}
function parkMag(stuk, andere) { return parkBinnen(stuk) && !parkBotst(stuk, andere); }
/* Waar het handvat zit: de hoek van het onderdeel die het verst van
   het vaste punt af ligt. Draait netjes mee als het scheef staat. */
function parkHandvat(stuk) { return parkHoekpunten(stuk)[2]; }

/* Wat een sleepbeweging aan dat handvat met de maat doet. De hoek
   tegenover het handvat blijft staan, zodat het onderdeel van dat
   punt af groeit en niet onder je muis wegschuift. Het sleeppunt
   wordt eerst teruggerekend naar het assenkruis van het onderdeel
   zelf, anders klopt er niets van zodra hij schuin staat. */
function parkTrekMaat(stuk, gx, gy) {
  var basis = parkOnderdeel(stuk.type);
  if (!basis) return stuk;
  var soort = parkSchaalSoort(stuk.type);
  var e = parkEigenMaat(stuk), mid = parkMidden(stuk);
  var d = parkDraaiing(parkHoek(stuk));

  /* Het vaste punt: de hoek tegenover het handvat */
  var ax = mid.cx + (-e.b/2)*d.co - (-e.h/2)*d.si;
  var ay = mid.cy + (-e.b/2)*d.si + (-e.h/2)*d.co;
  /* En het sleeppunt in het assenkruis van het onderdeel */
  var vx =  (gx - ax)*d.co + (gy - ay)*d.si;
  var vy = -(gx - ax)*d.si + (gy - ay)*d.co;

  var g = parkMaatGrens(stuk.type);
  var uit = parkVernieuw(stuk), nb, nh;
  if (soort === "formaat") {
    var f = parkKlem(Math.round((vx / basis.b) / PARK_FORMAAT_STAP) * PARK_FORMAAT_STAP,
                     PARK_FORMAAT_MIN, PARK_FORMAAT_MAX);
    uit.formaat = f;
    delete uit.b; delete uit.h;
    nb = basis.b * f; nh = basis.h * f;
  } else {
    nb = parkKlem(Math.round(vx), g.min, g.max);
    nh = (soort === "lengte") ? e.h : parkKlem(Math.round(vy), g.min, g.max);
    uit.b = nb; uit.h = nh;
  }
  /* Het vaste punt blijft liggen, dus het middelpunt verschuift */
  uit.cx = ax + (nb/2)*d.co - (nh/2)*d.si;
  uit.cy = ay + (nb/2)*d.si + (nh/2)*d.co;
  return parkBinnenTerrein(uit);
}

/* Waar het hoogtehandvat zit: midden boven het onderdeel, op zijn
   eigen bovenkant. */
function parkHoogHandvat(stuk) {
  var m = parkMidden(stuk);
  return {x: m.cx, y: parkOp(stuk) + parkHoogte(stuk), z: m.cy};
}
/* Wat een sleepbeweging aan dat handvat met de hoogte doet. De
   onderkant blijft staan waar hij staat; alleen de bovenkant komt
   mee. In stappen van vijf procent, met een onder- en bovengrens. */
function parkTrekHoogte(stuk, wereldY) {
  var basis = parkHoogte(Object.assign({}, parkVernieuw(stuk), {hoogMaal: 1}));
  if (!(basis > 0)) return parkVernieuw(stuk);
  var wil = (wereldY - parkOp(stuk)) / basis;
  var maal = parkKlem(Math.round(wil / PARK_HOOG_STAP) * PARK_HOOG_STAP,
                      PARK_HOOG_MIN, PARK_HOOG_MAX);
  return Object.assign({}, parkVernieuw(stuk), {hoogMaal: maal});
}

/* Waar een onderdeel landt als je op dit punt klikt: gecentreerd
   onder de muis, ingeklikt op het raster en teruggeduwd als het over
   de rand steekt. Het spookbeeld en het echte neerzetten rekenen
   allebei hiermee, zodat wat je ziet ook is wat je krijgt. */
function parkLandt(type, maat, x, y, hoek, andere) {
  var proef = {id:"__proef", type:type, cx:x, cy:y, hoek:hoek || 0};
  if (maat) { proef.b = maat.b; proef.h = maat.h; }
  proef = parkKlikVast(parkBinnenTerrein(proef));
  /* Staat er al iets onder, dan komt het er bovenop. Dat is wat je
     verwacht als je een container op een container zet, en het scheelt
     je het handmatig omhoog tikken. */
  if (andere) {
    var onder = parkStapelHoogte(proef, andere);
    if (onder > 0) {
      if (parkOverkapping(proef)) {
        /* Net erboven hangen, met zijn poten langs de tribune omlaag */
        proef.op = Math.max(0, onder - parkDakVoet(proef) + 0.12);
      } else {
        proef.op = onder;
      }
    }
  }
  return proef;
}
/* Eerste vrije plek zoeken, zodat een nieuw onderdeel altijd ergens past */
function parkVrijePlek(type, andere, hoek, maat) {
  /* Eerst grof zoeken, dan pas vakje voor vakje. Op een terrein van
     192 bij 128 vakjes scheelt dat een hoop rekenwerk. */
  var stappen = [4, 1];
  for (var s = 0; s < stappen.length; s++) {
    var stap = stappen[s];
    for (var cy = 0; cy <= PARK_RIJEN; cy += stap) {
      for (var cx = 0; cx <= PARK_KOLOMMEN; cx += stap) {
        var proef = {id:"__proef", type:type, cx:cx, cy:cy, hoek:hoek||0};
        if (maat) { proef.b = maat.b; proef.h = maat.h; }
        proef = parkKlikVast(parkBinnenTerrein(proef));
        if (parkMag(proef, andere)) return {cx:proef.cx, cy:proef.cy};
      }
    }
  }
  return null;
}
var _parkTeller = 0;
function parkNieuwId() { _parkTeller++; return "p" + Date.now() + "-" + _parkTeller; }

/* Eén vorm als SVG. Dezelfde beschrijving gaat ook naar het canvas
   bij het delen, zodat scherm en afbeelding gelijk blijven. */
function ParkVorm({ v, mm }) {
  const s = function(n){ return n*mm; };
  if (v.soort === "rect") {
    return <rect x={s(v.x)} y={s(v.y)} width={s(v.b)} height={s(v.h)}
      rx={v.r?s(v.r):0} fill={v.vul||"none"}
      stroke={v.lijn||"none"} strokeWidth={v.dikte?s(v.dikte):0}/>;
  }
  if (v.soort === "cirkel") {
    return <circle cx={s(v.x)} cy={s(v.y)} r={s(v.r)} fill={v.vul||"none"}
      stroke={v.lijn||"none"} strokeWidth={v.dikte?s(v.dikte):0}/>;
  }
  return <line x1={s(v.x1)} y1={s(v.y1)} x2={s(v.x2)} y2={s(v.y2)}
    stroke={v.lijn} strokeWidth={s(v.dikte)} strokeLinecap="round"/>;
}
/* Dezelfde vorm op een canvas, voor de afbeelding die je deelt */
function tekenParkVorm(ctx, v, mm) {
  var s = function(n){ return n*mm; };
  if (v.soort === "rect") {
    if (v.vul && v.vul !== "none") { ctx.fillStyle = v.vul; ctx.fillRect(s(v.x), s(v.y), s(v.b), s(v.h)); }
    if (v.lijn && v.lijn !== "none") {
      ctx.strokeStyle = v.lijn; ctx.lineWidth = s(v.dikte||0.04);
      ctx.strokeRect(s(v.x), s(v.y), s(v.b), s(v.h));
    }
  } else if (v.soort === "cirkel") {
    ctx.beginPath(); ctx.arc(s(v.x), s(v.y), s(v.r), 0, Math.PI*2);
    if (v.vul && v.vul !== "none") { ctx.fillStyle = v.vul; ctx.fill(); }
    if (v.lijn && v.lijn !== "none") { ctx.strokeStyle = v.lijn; ctx.lineWidth = s(v.dikte||0.04); ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.moveTo(s(v.x1), s(v.y1)); ctx.lineTo(s(v.x2), s(v.y2));
    ctx.strokeStyle = v.lijn; ctx.lineWidth = s(v.dikte); ctx.lineCap = "round"; ctx.stroke();
  }
}

/* De kaart als SVG. 300 bij 420 eenheden, schaalt mee met de ruimte. */
function Spelerkaart({ speler, breed }) {
  const cijfer = kaartCijfer(speler);
  const soort = kaartSoort(cijfer);
  const waarden = kaartWaarden(speler);
  const B = 300, H = 420;
  const id = "kaart-" + (speler.id || "x");
  return (
    <svg viewBox={"0 0 "+B+" "+H} className="kaart-svg"
      style={breed?{width:breed}:{}} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id+"-vlak"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={soort.boven}/>
          <stop offset="55%"  stopColor={soort.onder}/>
          <stop offset="100%" stopColor={soort.boven}/>
        </linearGradient>
        <clipPath id={id+"-knip"}>
          <path d={"M 14 4 H "+(B-14)+" a 10 10 0 0 1 10 10 V "+(H-70)+
                   " L "+(B/2)+" "+(H-6)+" L 14 "+(H-70)+" V 14 a 10 10 0 0 1 10 -10 Z"}/>
        </clipPath>
      </defs>

      {/* Het kaartvlak, met een punt onderaan */}
      <g clipPath={"url(#"+id+"-knip)"}>
        <rect x="0" y="0" width={B} height={H} fill={"url(#"+id+"-vlak)"}/>
        <rect x="0" y="0" width={B} height={H} fill="rgba(255,255,255,.14)"
          style={{mixBlendMode:"soft-light"}}/>
        {/* Schuine glans */}
        <path d={"M 0 "+(H*0.16)+" L "+B+" 0 L "+B+" "+(H*0.1)+" L 0 "+(H*0.3)+" Z"}
          fill="rgba(255,255,255,.16)"/>
      </g>
      <path d={"M 14 4 H "+(B-14)+" a 10 10 0 0 1 10 10 V "+(H-70)+
               " L "+(B/2)+" "+(H-6)+" L 14 "+(H-70)+" V 14 a 10 10 0 0 1 10 -10 Z"}
        fill="none" stroke={soort.rand} strokeWidth="3"/>

      {/* Links: cijfer, positie, wapen */}
      <text x="52" y="82" textAnchor="middle" fill={soort.tekst}
        style={{fontSize:"52px",fontWeight:800,fontFamily:"'Helvetica Neue',Arial"}}>
        {cijfer === null ? "–" : cijfer}
      </text>
      <text x="52" y="112" textAnchor="middle" fill={soort.tekst}
        style={{fontSize:"22px",fontWeight:800,letterSpacing:"1px",fontFamily:"'Helvetica Neue',Arial"}}>
        {kaartPositie(speler)}
      </text>
      <line x1="30" y1="126" x2="74" y2="126" stroke={soort.tekst} strokeWidth="2" opacity="0.5"/>
      <g transform="translate(38,138)">
        <path d="M 14 0 L 28 6 V 20 C 28 30 21 38 14 42 C 7 38 0 30 0 20 V 6 Z"
          fill={soort.tekst} opacity="0.75"/>
        <text x="14" y="26" textAnchor="middle" fill={soort.boven}
          style={{fontSize:"12px",fontWeight:800,fontFamily:"'Helvetica Neue',Arial"}}>
          {teamKort(inst().clubNaam)}
        </text>
      </g>
      {speler.rugnummer ? (
        <text x="52" y="212" textAnchor="middle" fill={soort.tekst} opacity="0.8"
          style={{fontSize:"20px",fontWeight:800,fontFamily:"'Helvetica Neue',Arial"}}>
          {"#"+speler.rugnummer}
        </text>
      ) : null}

      {/* Rechts: de speler. SpelerPop levert zelf een <svg> van 64 bij 64,
          dus die nestelen we op zijn plek in plaats van hem te schalen
          met een transform — dat overleeft ook het omzetten naar een
          afbeelding. */}
      <svg x="112" y="34" width="176" height="176" viewBox="0 0 64 64" overflow="visible">
        <SpelerPop naam={speler.naam||"?"} shirt="#004aad" vlak={null} grootte="100%"/>
      </svg>

      {/* Naam */}
      <text x={B/2} y="256" textAnchor="middle" fill={soort.tekst}
        style={{fontSize:"23px",fontWeight:800,letterSpacing:".5px",fontFamily:"'Helvetica Neue',Arial"}}>
        {(speler.naam||"").toUpperCase()}
      </text>
      <line x1="46" y1="270" x2={B-46} y2="270" stroke={soort.tekst} strokeWidth="2" opacity="0.45"/>

      {/* De zes waarden, twee kolommen van drie */}
      {waarden.map(function(w, i){
        var kol = i % 2, rij = Math.floor(i / 2);
        var x = kol ? B/2 + 22 : 62;
        var y = 300 + rij * 30;
        return (
          <g key={w.id}>
            <text x={x} y={y} textAnchor="end" fill={soort.tekst}
              style={{fontSize:"21px",fontWeight:800,fontFamily:"'Helvetica Neue',Arial"}}>
              {w.waarde === null ? "–" : w.waarde}
            </text>
            <text x={x+8} y={y} fill={soort.tekst} opacity="0.85"
              style={{fontSize:"15px",fontWeight:700,letterSpacing:".6px",fontFamily:"'Helvetica Neue',Arial"}}>
              {w.kort}
            </text>
          </g>
        );
      })}
      {waarden.length === 2 ? (
        <text x={B/2} y="366" textAnchor="middle" fill={soort.tekst} opacity="0.7"
          style={{fontSize:"12px",fontWeight:600,fontFamily:"'Helvetica Neue',Arial"}}>
          Keeper
        </text>
      ) : null}
    </svg>
  );
}

/* De zes vakken en het eindcijfer met de hand invullen. Leeg laten
   betekent: neem het cijfer uit de rapporten. */
function HTKBewerken({ speler, onSluiten, onOpslaan }) {
  const waarden = kaartWaarden(speler);
  const [form, setForm] = useState(function(){
    var start = {};
    var h = speler.htk || {};
    waarden.forEach(function(w){ start[w.id] = h[w.id] ? String(h[w.id]) : ""; });
    start.totaal = h.totaal ? String(h.totaal) : "";
    return start;
  });
  function set(k, v) {
    var schoon = String(v).replace(/[^0-9]/g, "").slice(0, 2);
    setForm(function(f){ var n = Object.assign({}, f); n[k] = schoon; return n; });
  }
  function opslaan() {
    var uit = {};
    Object.keys(form).forEach(function(k){
      var n = Number(form[k]);
      if (form[k] !== "" && !isNaN(n) && n > 0) uit[k] = Math.max(1, Math.min(99, n));
    });
    onOpslaan(uit);
    meldGoed(Object.keys(uit).length ? "Kaart aangepast" : "Kaart volgt weer de rapporten");
  }
  return (
    <div className="modal-overlay" style={{zIndex:420}}
      onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel">Cijfers van {speler.naam}</div>
        <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,margin:"0 0 12px"}}>
          Laat een vakje leeg om het cijfer uit zijn rapporten te gebruiken. Wat je invult
          overschrijft dat alleen op de kaart — zijn rapporten blijven ongemoeid.
        </p>
        {waarden.map(function(w){
          return (
            <div key={w.id} className="htk-rij">
              <span className="htk-kort">{w.kort}</span>
              <span className="htk-label">{w.label}</span>
              <span className="htk-uit">
                {w.uitSkills === null ? "geen rapport" : "rapport: " + w.uitSkills}
              </span>
              <input className="formulier-input htk-invoer" value={form[w.id]}
                placeholder={w.uitSkills === null ? "–" : String(w.uitSkills)}
                inputMode="numeric"
                onChange={function(e){ set(w.id, e.target.value); }} />
            </div>
          );
        })}
        <div className="htk-rij htk-totaal">
          <span className="htk-kort">TOT</span>
          <span className="htk-label">Eindcijfer</span>
          <span className="htk-uit">berekend: {kaartCijfer(Object.assign({}, speler, {htk:{}})) || "–"}</span>
          <input className="formulier-input htk-invoer" value={form.totaal}
            placeholder="auto" inputMode="numeric"
            onChange={function(e){ set("totaal", e.target.value); }} />
        </div>
        <div className="modal-knoppen">
          <button className="knop lijn" onClick={function(){
            setForm(function(f){
              var leeg = {};
              Object.keys(f).forEach(function(k){ leeg[k] = ""; });
              return leeg;
            });
          }}>Alles leegmaken</button>
          <button className="knop succes" onClick={opslaan}>
            <i className="fa-solid fa-check"/> Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

function SpelerkaartTab() {
  const [spelers, setSpelers] = useState(laadSpelers);
  const [gekozen, setGekozen] = useState(null);
  const [bewerkOpen, setBewerkOpen] = useState(false);

  function zetHTK(spelerId, htk) {
    setSpelers(function(l){
      var uit = l.map(function(s){ return s.id===spelerId ? Object.assign({}, s, {htk:htk}) : s; });
      slaJson(SPELERS_KEY, uit);
      return uit;
    });
  }
  const metSkills = spelers.filter(heeftSkills);
  const lijst = sorteerOpLinie(spelers.slice());
  const kaartRef = useRef(null);

  function deelKaart(speler) {
    var svg = kaartRef.current ? kaartRef.current.querySelector("svg") : null;
    if (!svg) { meldFout("De kaart kon niet gemaakt worden."); return; }
    var tekst = new XMLSerializer().serializeToString(svg);
    var beeld = new Image();
    var schaal = 3;
    beeld.onload = function(){
      var doek = document.createElement("canvas");
      doek.width = 300*schaal; doek.height = 420*schaal;
      var ctx = doek.getContext("2d");
      ctx.drawImage(beeld, 0, 0, doek.width, doek.height);
      doek.toBlob(function(blob){
        if (!blob) { meldFout("De kaart kon niet opgeslagen worden."); return; }
        var naam = (speler.naam||"speler").replace(/[^a-z0-9]/gi,"-").toLowerCase();
        deelOfDownload(blob, "kaart-"+naam+".png", speler.naam, function(hoe){
          meldGoed(hoe === "gedeeld" ? "Kaart gedeeld" : "Opgeslagen als kaart-"+naam+".png in Downloads");
        });
      }, "image/png");
    };
    beeld.onerror = function(){ meldFout("De kaart kon niet omgezet worden naar een afbeelding."); };
    beeld.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(tekst);
  }

  if (spelers.length === 0) return (
    <div className="leeg">
      <div className="leeg-icoon"><i className="fa-solid fa-id-card"/></div>
      <h3>Nog geen spelers</h3>
      <p>Voeg eerst spelers toe in Selectie, dan maakt de app hun kaart.</p>
    </div>
  );

  const speler = lijst.filter(function(s){ return s.id===gekozen; })[0] || lijst[0];

  return (
    <div>
      <div className="kaart" style={{marginBottom:12}}>
        <div className="kaart-titel"><i className="fa-solid fa-id-card"/> Harlinger Talenten Kaart</div>
        <p style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,margin:"2px 0 0"}}>
          De cijfers komen uit de skills die je per speler invult, dus een nieuw rapport verandert
          de kaart mee. Wil je afwijken — voor een seizoenskaart of een cadeautje — dan vul je ze
          met de hand in. {metSkills.length} van de {spelers.length} spelers hebben skills ingevuld.
        </p>
      </div>

      <div className="kaart-kiezer">
        {lijst.map(function(s){
          var c = kaartCijfer(s);
          return (
            <button key={s.id} className={"kaart-chip"+(speler.id===s.id?" actief":"")}
              onClick={function(){ setGekozen(s.id); }}>
              <span className="kaart-chip-cijfer" style={{background:kaartSoort(c).onder,
                color:kaartSoort(c).tekst}}>{c===null?"–":c}</span>
              {s.naam.split(" ")[0]}
            </button>
          );
        })}
      </div>

      <div className="kaart-podium" ref={kaartRef}>
        <Spelerkaart speler={speler} />
      </div>

      <div style={{display:"flex",gap:8,maxWidth:320,margin:"12px auto 0"}}>
        <button className="knop lijn" style={{flex:1,justifyContent:"center"}}
          onClick={function(){ setBewerkOpen(true); }}>
          <i className="fa-solid fa-sliders"/> Cijfers
        </button>
        <button className="knop lijn" style={{flex:1,justifyContent:"center"}}
          onClick={function(){ deelKaart(speler); }}>
          <i className="fa-brands fa-whatsapp"/> Delen
        </button>
      </div>
      <p style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:400,textAlign:"center",marginTop:8}}>
        {kaartHandmatig(speler) || kaartEigenCijfer(speler)!==null
          ? "Met de hand aangepast"
          : kaartCompleet(speler) + " categorieën uit de rapporten"}
        {kaartCijfer(speler)===null ? " · vul zijn skills in om een cijfer te krijgen" : ""}
      </p>

      {bewerkOpen && (
        <HTKBewerken speler={speler} onSluiten={function(){ setBewerkOpen(false); }}
          onOpslaan={function(htk){ zetHTK(speler.id, htk); setBewerkOpen(false); }} />
      )}
    </div>
  );
}

/* Een leeg halfveld waarop je met de vinger of muis tekent. Bewust
   simpel gehouden: één lijnkleur, een gum en opnieuw beginnen. */
function QuizTekenveld({ tekening, onWijzig }) {
  const svgRef = useRef(null);
  const bezig = useRef(false);
  const [lijnen, setLijnen] = useState(tekening || []);
  const B = 100, D = 77;

  function punt(e) {
    const vak = svgRef.current.getBoundingClientRect();
    if (!vak.width || !vak.height) return null;
    return [ +(((e.clientX - vak.left) / vak.width) * B).toFixed(1),
             +(((e.clientY - vak.top) / vak.height) * D).toFixed(1) ];
  }
  function start(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = punt(e);
    if (!p) return;
    bezig.current = true;
    setLijnen(function(l){ return l.concat([[p]]); });
  }
  function trek(e) {
    if (!bezig.current) return;
    const p = punt(e);
    if (!p) return;
    setLijnen(function(l){
      if (!l.length) return l;
      var uit = l.slice();
      uit[uit.length-1] = uit[uit.length-1].concat([p]);
      return uit;
    });
  }
  function stop() {
    if (!bezig.current) return;
    bezig.current = false;
    setLijnen(function(l){ if (onWijzig) onWijzig(l); return l; });
  }

  return (
    <div>
      <div className="dsm-veld">
        <svg ref={svgRef} viewBox={"0 0 "+B+" "+D} className="dsm-svg"
          style={{touchAction:"none", cursor:"crosshair"}}
          onPointerDown={start} onPointerMove={trek}
          onPointerUp={stop} onPointerCancel={stop}>
          <rect x="0" y="0" width={B} height={D} fill="var(--veld-groen)" rx="2"/>
          {[1,3,5].map(function(i){
            return <rect key={i} x="0" y={i*D/6} width={B} height={D/6} fill="rgba(255,255,255,.035)"/>;
          })}
          <DSMVeldLijnen omgekeerd={false}/>
          {lijnen.map(function(pad, i){
            return <polyline key={i} points={pad.map(function(q){ return q[0]+","+q[1]; }).join(" ")}
              fill="none" stroke="#ffd400" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>;
          })}
        </svg>
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:8}}>
        <button className="knop lijn klein" disabled={!lijnen.length}
          onClick={function(){ setLijnen(function(l){ var u=l.slice(0,-1); if(onWijzig) onWijzig(u); return u; }); }}>
          <i className="fa-solid fa-rotate-left"/> Laatste weg
        </button>
        <button className="knop lijn klein" disabled={!lijnen.length}
          onClick={function(){ setLijnen([]); if(onWijzig) onWijzig([]); }}>
          <i className="fa-solid fa-eraser"/> Alles wissen
        </button>
      </div>
    </div>
  );
}

function SpelregelquizTab() {
  const [ronde, setRonde] = useState(null);
  const [bij, setBij] = useState(0);
  const [gekozen, setGekozen] = useState(null);
  const [antwoorden, setAntwoorden] = useState([]);
  const [bonusFase, setBonusFase] = useState("teken");   /* teken | antwoord | klaar */
  const [bonusGoed, setBonusGoed] = useState(null);
  const [tekening, setTekening] = useState([]);
  const [beste, setBeste] = useState(function(){
    var b = laadJson(QUIZ_KEY);
    return Array.isArray(b) ? (b[0] || {}) : (b || {});
  });

  function bewaarUitslag(nieuw) {
    setBeste(nieuw);
    slaJson(QUIZ_KEY, [nieuw]);
  }
  function begin() {
    setRonde(quizRonde((beste.recent) || []));
    setBij(0); setGekozen(null); setAntwoorden([]);
    setBonusFase("teken"); setBonusGoed(null); setTekening([]);
  }
  function kies(i) {
    if (gekozen !== null) return;
    setGekozen(i);
    setAntwoorden(function(l){ return l.concat([{id:ronde.vragen[bij].id, goed: i===ronde.vragen[bij].goed}]); });
  }
  function verder() {
    setGekozen(null);
    setBij(function(n){ return n+1; });
  }

  const goedeAntwoorden = antwoorden.filter(function(a){ return a.goed; }).length;
  const klaarMetVragen = ronde && bij >= ronde.vragen.length;

  function rondAf(bonusPunt) {
    var totaal = goedeAntwoorden + (bonusPunt ? 1 : 0);
    var recent = ((beste.recent) || []).concat(ronde.vragen.map(function(v){ return v.id; })).slice(-15);
    var nieuw = {
      recent: recent,
      gespeeld: (beste.gespeeld || 0) + 1,
      beste: Math.max(beste.beste || 0, totaal),
      laatste: totaal
    };
    bewaarUitslag(nieuw);
    setBonusFase("klaar");
    setBonusGoed(!!bonusPunt);
  }

  if (!ronde) return (
    <div>
      <div className="kaart" style={{marginBottom:12}}>
        <div className="kaart-titel"><i className="fa-solid fa-clipboard-question"/> Spelregelkennis</div>
        <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,margin:"2px 0 0"}}>
          Vijf vragen over de spelregels, plus een bonusopdracht waarin je het antwoord tekent.
          De vragen komen uit een bank van {QUIZ_VRAGEN.length} stuks en worden elke ronde
          opnieuw getrokken — ook de antwoorden staan steeds in een andere volgorde.
        </p>
        {beste.gespeeld ? (
          <div className="quiz-balk">
            <span><i className="fa-solid fa-repeat"/> {beste.gespeeld}× gespeeld</span>
            <span><i className="fa-solid fa-trophy"/> beste: {beste.beste} van 6</span>
            {beste.laatste !== undefined && <span><i className="fa-solid fa-clock-rotate-left"/> vorige: {beste.laatste}</span>}
          </div>
        ) : null}
      </div>
      <div className="quiz-cats">
        {QUIZ_CATEGORIEEN.map(function(c){
          var n = QUIZ_VRAGEN.filter(function(v){ return v.cat===c.id; }).length;
          return (
            <span key={c.id} className="quiz-cat" style={{background:c.kleur}}>
              {c.label} <b>{n}</b>
            </span>
          );
        })}
      </div>
      <button className="knop" style={{width:"100%",justifyContent:"center",marginTop:14}}
        onClick={begin}>
        <i className="fa-solid fa-play"/> Start de quiz
      </button>
    </div>
  );

  if (!klaarMetVragen) {
    const v = ronde.vragen[bij];
    const c = quizCategorie(v.cat);
    return (
      <div>
        <div className="quiz-voortgang">
          {ronde.vragen.map(function(_, i){
            return <span key={i} className={"quiz-stip"+(i<bij?" gehad":"")+(i===bij?" nu":"")}/>;
          })}
          <span className="quiz-teller">{(bij+1)} van {ronde.vragen.length}</span>
        </div>
        <div className="kaart">
          <span className="quiz-cat" style={{background:c.kleur, marginBottom:10, display:"inline-block"}}>
            {c.label}
          </span>
          <h3 style={{fontSize:16,lineHeight:1.45,margin:"0 0 14px"}}>{v.vraag}</h3>
          {v.opties.map(function(tekst, i){
            var klasse = "quiz-optie";
            if (gekozen !== null) {
              if (i === v.goed) klasse += " goed";
              else if (i === gekozen) klasse += " fout";
              else klasse += " grijs";
            }
            return (
              <button key={i} className={klasse} onClick={function(){ kies(i); }} disabled={gekozen!==null}>
                <span className="quiz-letter">{String.fromCharCode(65+i)}</span>
                <span style={{flex:1}}>{tekst}</span>
                {gekozen !== null && i === v.goed && <i className="fa-solid fa-check"/>}
                {gekozen !== null && i === gekozen && i !== v.goed && <i className="fa-solid fa-xmark"/>}
              </button>
            );
          })}
          {gekozen !== null && (
            <div className="quiz-uitleg">
              <i className="fa-solid fa-circle-info"/>
              <p>{v.uitleg}</p>
            </div>
          )}
        </div>
        {gekozen !== null && (
          <button className="knop" style={{width:"100%",justifyContent:"center",marginTop:12}}
            onClick={verder}>
            {bij+1 < ronde.vragen.length ? "Volgende vraag" : "Naar de bonusvraag"}
            {" "}<i className="fa-solid fa-arrow-right"/>
          </button>
        )}
      </div>
    );
  }

  /* ── De bonusvraag ── */
  if (bonusFase !== "klaar") return (
    <div>
      <div className="kaart" style={{marginBottom:12}}>
        <span className="quiz-cat" style={{background:"#d4a017", marginBottom:10, display:"inline-block"}}>
          Bonusvraag · teken het antwoord
        </span>
        <h3 style={{fontSize:16,lineHeight:1.45,margin:"0 0 4px"}}>{ronde.bonus.vraag}</h3>
        <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,margin:0}}>
          Teken met je vinger of de muis op het veld. Het doel staat bovenaan.
        </p>
      </div>
      {bonusFase === "teken" ? (
        <div>
          <QuizTekenveld tekening={tekening} onWijzig={setTekening} />
          <button className="knop" style={{width:"100%",justifyContent:"center",marginTop:12}}
            onClick={function(){ setBonusFase("antwoord"); }}>
            <i className="fa-solid fa-eye"/> Laat het antwoord zien
          </button>
        </div>
      ) : (
        <div>
          <QuizTekenveld tekening={tekening} onWijzig={setTekening} />
          <div className="kaart quiz-uitleg-kaart">
            <div className="kaart-titel"><i className="fa-solid fa-lightbulb"/> Zo hoort het</div>
            <p style={{fontSize:13,lineHeight:1.65,fontWeight:400,margin:0}}>{ronde.bonus.uitleg}</p>
          </div>
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,textAlign:"center",margin:"12px 0 8px"}}>
            Klopte jouw tekening hiermee? Dat beoordeel je zelf — een tekening kan de app niet nakijken.
          </p>
          <div style={{display:"flex",gap:8}}>
            <button className="knop lijn" style={{flex:1,justifyContent:"center"}}
              onClick={function(){ rondAf(false); }}>
              <i className="fa-solid fa-xmark"/> Niet helemaal
            </button>
            <button className="knop succes" style={{flex:1,justifyContent:"center"}}
              onClick={function(){ rondAf(true); }}>
              <i className="fa-solid fa-check"/> Had ik goed
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* ── De uitslag ── */
  const totaal = goedeAntwoorden + (bonusGoed ? 1 : 0);
  const oordeel = quizOordeel(totaal, ronde.vragen.length + 1);
  return (
    <div>
      <div className="kaart quiz-uitslag">
        <div className="quiz-score">{totaal}<span>/{ronde.vragen.length + 1}</span></div>
        <h3 style={{margin:"6px 0 4px"}}>{oordeel.kop}</h3>
        <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,margin:0}}>{oordeel.tekst}</p>
        {totaal >= (beste.beste || 0) && totaal > 0 && (
          <div className="quiz-record"><i className="fa-solid fa-trophy"/> Je beste score tot nu toe</div>
        )}
      </div>
      <div className="kaart" style={{marginTop:12}}>
        <div className="kaart-titel"><i className="fa-solid fa-list-check"/> Wat je had</div>
        {ronde.vragen.map(function(v, i){
          var a = antwoorden[i];
          return (
            <div key={v.id} className="quiz-terugblik">
              <i className={a && a.goed ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"}
                style={{color: a && a.goed ? "var(--succes)" : "var(--gevaar)"}}/>
              <span>{v.vraag}</span>
            </div>
          );
        })}
        <div className="quiz-terugblik">
          <i className={bonusGoed ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"}
            style={{color: bonusGoed ? "var(--succes)" : "var(--gevaar)"}}/>
          <span>Bonus: {ronde.bonus.vraag}</span>
        </div>
      </div>
      <button className="knop" style={{width:"100%",justifyContent:"center",marginTop:12}}
        onClick={begin}>
        <i className="fa-solid fa-rotate-right"/> Nog een ronde
      </button>
      <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:8}}
        onClick={function(){ setRonde(null); }}>
        Terug naar het begin
      </button>
    </div>
  );
}

/* ── De tenue-ontwerper ─────────────────────────────────────
   Vijf tenues naast elkaar: thuis, uit, derde en twee keeperstenues.
   Wat je hier kiest zie je terug op de spelers in de opstelling. */
/* Een vorm als knopje in het keuzeraster */
function TenueVormKnop({ vorm, onClick }) {
  const delen = tenueVormDelen(vorm.id);
  return (
    <button className="tenue-vormknop" title={vorm.label} onClick={onClick}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{display:"block"}}>
        <g fill="#1b1f2a" fillRule={vorm.regel === "evenodd" ? "evenodd" : "nonzero"}>
          {delen.map(function(d, i){
            return d.d
              ? <path key={i} d={d.d}/>
              : <rect key={i} x={d.x} y={d.y} width={d.b} height={d.h}/>;
          })}
        </g>
      </svg>
    </button>
  );
}

/* ── De tenue-ontwerper ─────────────────────────────────────
   Vijf tenues, en op elk daarvan een stapel lagen: vormen, patronen,
   schilden, cijfers, tekst en een eigen afbeelding. Wat je hier maakt
   zie je terug op de spelers in de opstelling. */
function TenueOntwerperTab() {
  const [tenue, setTenue] = useState(laadTenue);
  const [soort, setSoort] = useState("thuis");
  const [deel, setDeel] = useState("shirtVoor");
  const [groep, setGroep] = useState("vorm");
  const [gekozen, setGekozen] = useState(null);      /* id van de laag */
  const [nieuweTekst, setNieuweTekst] = useState("");
  const [vastklik, setVastklik] = useState(true);
  const [stappen, setStappen] = useState({terug:0, vooruit:0});
  const historie = useRef([]);
  const vooruit = useRef([]);
  const laatsteDaad = useRef({sleutel:"", tijd:0});
  const [smalTab, setSmalTab] = useState("bouw");    /* alleen op een smal scherm */
  const [zoom, setZoom] = useState(1);
  const [vakMaat, setVakMaat] = useState({b:0, h:0});
  const [bezig, setBezig] = useState(false);
  const vakRef = useRef(null);
  const drukvel = useRef(null);
  const doek = useRef(null);
  const vel = useRef(null);
  const sleep = useRef(null);
  /* Welke vingers er op de tekening liggen, en hoe ze bij de vorige
     meting stonden. Twee vingers betekent knijpen; op een telefoon is
     dat de enige manier om in te zoomen, want er is geen muiswiel. */
  const vingers = useRef([]);
  const knijp = useRef(null);
  const eenVinger = useRef(null);
  useEffect(function(){ slaTenueOp(tenue); }, [tenue]);
  /* De ruimte voor de tekening opmeten, en blijven meten als het
     venster verandert. Zonder deze maat weet ik niet wat honderd
     procent is. */
  useEffect(function(){
    var el = vakRef.current;
    if (!el) return;
    var meet = function(){
      setVakMaat({b: el.clientWidth - 20, h: el.clientHeight - 20});
    };
    meet();
    if (typeof ResizeObserver === "function") {
      var kijker = new ResizeObserver(meet);
      kijker.observe(el);
      return function(){ kijker.disconnect(); };
    }
    window.addEventListener("resize", meet);
    return function(){ window.removeEventListener("resize", meet); };
  }, []);
  const doekBreed = tenuePasBreedte(vakMaat.b, vakMaat.h) * zoom;

  const set = tenueSet(tenue, soort);
  const info = TENUE_SOORTEN.find(function(s){ return s.id === soort; }) || TENUE_SOORTEN[0];
  const deelInfo = tenueDeel(deel);
  const eigenLagen = tenueLagen(set, deel);
  const laag = eigenLagen.filter(function(l){ return l.id === gekozen; })[0] || null;
  const vulLaag = laag && (tenueVorm(laag.vorm) || {}).vul;
  const waarschuwing = tenueWaarschuwing(set) ||
    ((soort === "uit" || soort === "derde") && tenueBotst(set, tenueSet(tenue, "thuis"))
      ? "Lijkt te veel op het thuistenue." : "");

  /* Ongedaan maken. Er wordt één stap bewaard per handeling, niet per
     muisbeweging: bij het slepen wordt er vóór het neerdrukken één
     keer bewaard en daarna niet meer, anders kost het terugdraaien van
     één sleepbeweging honderd keer klikken. */
  function meld() {
    setStappen({terug:historie.current.length, vooruit:vooruit.current.length});
  }
  /* sleutel benoemt de handeling. Twee keer vlak achter elkaar aan
     dezelfde knop draaien is één stap; iets anders doen begint een
     nieuwe. Zonder sleutel is het altijd een eigen stap. */
  function bewaar(sleutel) {
    var d = tenueDaad(laatsteDaad.current, sleutel, Date.now());
    laatsteDaad.current = d.daad;
    if (d.zelfde) return;
    var r = tenueOnthoud(tenue, historie.current);
    historie.current = r.terug; vooruit.current = r.vooruit;
    meld();
  }
  function stap(doe) {
    var r = doe(tenue, historie.current, vooruit.current);
    if (!r) return;
    laatsteDaad.current = {sleutel:"", tijd:0};
    historie.current = r.terug; vooruit.current = r.vooruit;
    setGekozen(null);
    setTenue(r.waarde);
    meld();
  }
  function terug()   { stap(tenueStapTerug); }
  function opnieuw() { stap(tenueStapVooruit); }

  /* Dit ene tenue als afbeelding bewaren */
  function bewaarPlaatje() {
    if (!drukvel.current) return;
    var svgs = drukvel.current.querySelectorAll("svg");
    var i = TENUE_SOORTEN.findIndex(function(s){ return s.id === soort; });
    if (i < 0 || svgs.length < (i + 1) * 2) return;
    setBezig(true);
    tenuePlaatje(svgs[i*2], svgs[i*2 + 1], 520).then(function(doek){
      var link = document.createElement("a");
      link.download = tenueBestandsnaam(info.label);
      link.href = doek.toDataURL("image/png");
      link.click();
      setBezig(false);
      meldGoed("Tenue opgeslagen als afbeelding");
    }).catch(function(){
      setBezig(false);
      meldFout("De afbeelding kon niet worden gemaakt.");
    });
  }

  /* De tenues op papier. De tekeningen komen uit een verborgen hoekje
     van het scherm, zodat de PDF precies laat zien wat jij ziet. */
  function maakPdf() {
    if (!window.jspdf) { meldFout("PDF-bibliotheek nog niet geladen. Probeer het zo nog eens."); return; }
    if (!drukvel.current) return;
    var svgs = drukvel.current.querySelectorAll("svg");
    if (svgs.length < TENUE_SOORTEN.length * 2) return;
    setBezig(true);
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({orientation:"portrait", unit:"mm", format:"a4"});
    var W = 210, M = 14, kaartB = 27;
    var kaartH = kaartB * TENUE_VEL.h / TENUE_VEL.b;

    doc.setFillColor(0, 74, 173);
    doc.rect(0, 0, W, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("Tenues", M, 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.text(teamNaamVol(), M, 18.5);
    doc.text(new Date().toLocaleDateString("nl-NL",
      {day:"numeric", month:"long", year:"numeric"}), W - M, 18.5, {align:"right"});

    var y = 34;
    var beurten = TENUE_SOORTEN.map(function(s, i){
      return Promise.all([
        tenueDoekVan(svgs[i*2], kaartB),
        tenueDoekVan(svgs[i*2 + 1], kaartB)
      ]);
    });
    Promise.all(beurten).then(function(paren){
      paren.forEach(function(paar, i){
        var s = TENUE_SOORTEN[i], st = tenueSet(tenue, s.id);
        doc.setDrawColor(224, 227, 232);
        doc.setFillColor(250, 251, 252);
        doc.roundedRect(M, y, W - M*2, kaartH + 10, 2, 2, "FD");
        doc.setTextColor(20, 24, 31);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text(s.label, M + 5, y + 8);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
        doc.setTextColor(110, 118, 129);
        doc.text(tenueOmschrijving(st), M + 5, y + 13);

        doc.addImage(paar[0].toDataURL("image/png"), "PNG", M + 5, y + 16, kaartB, kaartH);
        doc.addImage(paar[1].toDataURL("image/png"), "PNG", M + 5 + kaartB + 4, y + 16, kaartB, kaartH);
        doc.setFontSize(6.5); doc.setTextColor(140, 147, 158);
        doc.text("voor", M + 5 + kaartB/2, y + 18 + kaartH, {align:"center"});
        doc.text("achter", M + 9 + kaartB*1.5, y + 18 + kaartH, {align:"center"});

        /* De kleuren in twee kolommen ernaast, met hun code erbij */
        var kx = M + 5 + kaartB*2 + 14, ky = y + 18;
        tenueKleurlijst(st).forEach(function(k, j){
          var kol = j % 2, rij = Math.floor(j / 2);
          var px = kx + kol * 62, py = ky + rij * 7;
          var kl = String(k[1] || "#000000").replace("#", "");
          doc.setFillColor(parseInt(kl.slice(0,2),16) || 0,
                           parseInt(kl.slice(2,4),16) || 0,
                           parseInt(kl.slice(4,6),16) || 0);
          doc.setDrawColor(190, 196, 204);
          doc.roundedRect(px, py - 3.2, 4.6, 4.6, 0.8, 0.8, "FD");
          doc.setFont("helvetica", "bold"); doc.setFontSize(7);
          doc.setTextColor(20, 24, 31);
          doc.text(k[0], px + 6.4, py);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(120, 127, 138);
          doc.text(String(k[1] || "").toUpperCase(), px + 6.4, py + 3.2);
        });
        y += kaartH + 15;
      });
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.setTextColor(150, 156, 166);
      doc.text("Gemaakt met " + APP_NAAM + " · " + teamNaamVol(),
               W/2, 288, {align:"center"});
      doc.save("tenues-fc-harlingen-jo19-2.pdf");
      setBezig(false);
    }).catch(function(){
      setBezig(false);
      meldFout("De tekeningen konden niet in de PDF worden gezet.");
    });
  }

  function pasAan(maak, sleutel) {
    if (!sleep.current) bewaar(sleutel);
    setTenue(function(t){
      var n = Object.assign({}, t);
      n.sets = Object.assign({}, n.sets);
      n.sets[soort] = maak(tenueSet(t, soort));
      return tenueVernieuw(n);
    });
  }
  function zet(veld, waarde) {
    pasAan(function(s){ var n = Object.assign({}, s); n[veld] = waarde; return n; },
           "stuk:" + soort + ":" + veld);
  }
  function voegToe(extra) {
    if (tenueLaagRuimte(set, deel) <= 0) return;
    var id = "l" + Math.random().toString(36).slice(2, 9);
    pasAan(function(s){
      return tenueLaagToe(s, Object.assign({id:id, deel:deel, kleur:s.shirt2}, extra));
    });
    setGekozen(id);
  }
  function zetLaag(veld, waarde) {
    if (!laag) return;
    pasAan(function(s){ return tenueLaagZet(s, laag.id, veld, waarde); },
           "laag:" + laag.id + ":" + veld);
  }
  function opLaag(doe) {
    if (!laag) return;
    pasAan(function(s){ return doe(s, laag.id); });
  }

  /* Waar je vinger op het tenuevel zit. Dit wordt aan de tekening
     zelf gevraagd in plaats van uitgerekend uit de omvattende doos:
     de tekening staat gecentreerd in zijn vak en kan smaller zijn dan
     die doos, en dan zou alles een stuk verschoven landen. */
  function opVel(e) {
    const svg = vel.current;
    if (svg && svg.getScreenCTM && svg.createSVGPoint) {
      const m = svg.getScreenCTM();
      if (m) {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(m.inverse());
        if (isFinite(p.x) && isFinite(p.y)) return {x:p.x, y:p.y};
      }
    }
    if (!doek.current) return null;
    const r = doek.current.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {x:(e.clientX - r.left) / r.width * TENUE_VEL.b,
            y:(e.clientY - r.top) / r.height * TENUE_VEL.h};
  }
  function vang(e) {
    if (doek.current && doek.current.setPointerCapture)
      doek.current.setPointerCapture(e.pointerId);
  }
  /* Op de vorm zelf: verplaatsen. Op een handvat: uitrekken of draaien. */
  function pak(e) {
    if (!laag || vulLaag) return;
    if (vingers.current.length >= 1) return;   /* de tweede vinger knijpt */
    /* Met een muis blijft het zoals het was: klikken zet de laag waar
       je klikt. Met een vinger kan dat niet, want je raakt de tekening
       ook aan om te zoomen of te schuiven; daar wachten we tot de
       vinger echt een stuk verder is. */
    if (e.pointerType === "mouse") {
      bewaar();
      sleep.current = {soort:"plaats", id:laag.id};
      vang(e);
      schuif(e);
      return;
    }
    sleep.current = {soort:"plaats", id:laag.id, wacht:true,
                     x0:e.clientX, y0:e.clientY, aanwijzer:e.pointerType};
    vang(e);
  }
  function grijp(g, e) {
    if (!laag || vulLaag) return;
    bewaar();
    /* Uitdrukkelijk opbouwen in plaats van samenvoegen: zo kan een
       veld uit het handvat de laag nooit meer overschrijven. */
    sleep.current = {soort:g.soort, sx:g.sx || 0, sy:g.sy || 0, id:laag.id};
    vang(e);
  }
  function schuif(e) {
    const s = sleep.current;
    if (!s || !laag || s.id !== laag.id) return;
    if (vingers.current.length >= 2) return;
    /* Een vingertop staat nooit helemaal stil. Zonder deze drempel
       springt de laag naar elke plek die je aanraakt. */
    if (s.wacht) {
      if (!voorbijDrempel(s.x0, s.y0, e.clientX, e.clientY, s.aanwijzer)) return;
      s.wacht = false;
      bewaar();
    }
    const p = opVel(e);
    if (!p) return;
    if (s.soort === "draai") {
      zetLaag("hoek", tenueDraaiNaar(laag, deelInfo.stuk, p.x, p.y, vastklik));
      return;
    }
    if (s.soort === "maat") {
      const n = tenueTrek(laag, deelInfo.stuk, s, p.x, p.y);
      pasAan(function(set2){
        var t = set2;
        ["x","y","breed","hoog"].forEach(function(v){ t = tenueLaagZet(t, s.id, v, n[v]); });
        return t;
      });
      return;
    }
    const vak = tenueVak(deelInfo.stuk);
    pasAan(function(set2){
      var t = tenueLaagZet(set2, s.id, "x", (p.x - vak.x) / vak.b * 100);
      return tenueLaagZet(t, s.id, "y", (p.y - vak.y) / vak.h * 100);
    });
  }
  function laat() { sleep.current = null; }

  /* ── Knijpen om te zoomen ────────────────────────────────────
     Deze drie hangen aan het vak om de tekening heen, zodat het ook
     werkt als een van je vingers naast het shirt landt. Ze zien de
     gebeurtenissen van de tekening ook langskomen, want die borrelen
     omhoog; daarom kan de tweede vinger hier alsnog het slepen
     afbreken dat de eerste net begonnen was. ──────────────────── */
  function vingerNeer(e) {
    vingers.current = vingersBij(vingers.current, e.pointerId, e.clientX, e.clientY);
    eenVinger.current = {x:e.clientX, y:e.clientY};
    if (vingers.current.length >= 2) {
      sleep.current = null;
      knijp.current = knijpMeting(vingers.current);
    }
  }
  function vingerBeweegt(e) {
    if (!vingers.current.length) return;
    vingers.current = vingersVerplaats(vingers.current, e.pointerId, e.clientX, e.clientY);
    /* Eén vinger naast de tekening: over het vak schuiven. Dat deed de
       browser eerst zelf, maar die kan niet tegelijk knijpen zoals wij
       dat willen, dus doen we het nu allebei met de hand. */
    if (vingers.current.length < 2) {
      if (sleep.current || !eenVinger.current || !vakRef.current) return;
      vakRef.current.scrollLeft -= e.clientX - eenVinger.current.x;
      vakRef.current.scrollTop  -= e.clientY - eenVinger.current.y;
      eenVinger.current = {x:e.clientX, y:e.clientY};
      return;
    }
    const meting = knijpMeting(vingers.current);
    const gebaar = knijpBeweging(knijp.current, meting);
    knijp.current = meting;
    if (!gebaar) return;
    if (gebaar.schaal !== 1)
      setZoom(function(z){ return tenueZoomKlem(z * gebaar.schaal); });
    /* Meeschuiven met het vak eromheen. Dat is precies wat scrollen
       ook doet, dus het blijft binnen de randen van de tekening. */
    if (vakRef.current && (gebaar.dx || gebaar.dy)) {
      vakRef.current.scrollLeft -= gebaar.dx;
      vakRef.current.scrollTop  -= gebaar.dy;
    }
  }
  function vingerOp(e) {
    vingers.current = vingersAf(vingers.current, e.pointerId);
    if (vingers.current.length < 2) knijp.current = null;
    if (!vingers.current.length) { sleep.current = null; eenVinger.current = null; }
  }

  const kleuren = [
    ["shirt", "Shirt"], ["shirt2", "Tweede"], ["mouw", "Mouwen"], ["kraag", "Kraag"],
    ["broek", "Broek"], ["sokken", "Sokken"], ["tekst", "Nummer"]
  ];
  const getalVeld = function(naam, veld, min, max){
    return (
      <span className="tenue-veld" key={veld}>
        <span>{naam}</span>
        <GetalVeld min={min} max={max} waarde={Math.round(laag[veld])}
          opWaarde={function(n){ zetLaag(veld, n); }}/>
      </span>
    );
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap",marginBottom:8}}>
        <h2 style={{margin:0}}>{t("clubhuis.tenue")}</h2>
        <span style={{fontSize:12,color:"var(--grijs-donker)"}}>
          Nog {tenueLaagRuimte(set, deel)} van de {TENUE_LAAG_MAX} lagen vrij op {deelInfo.label.toLowerCase()}.
        </span>
        {waarschuwing && (
          <span style={{fontSize:12,color:"#8a5a00",fontWeight:700}}>
            <i className="fa-solid fa-triangle-exclamation"/> {waarschuwing}
          </span>
        )}
      </div>

      <div className="tenue-soorten">
        {TENUE_SOORTEN.map(function(s){
          var st = tenueSet(tenue, s.id);
          return (
            <button key={s.id} className={"tenue-soort" + (soort===s.id ? " actief" : "")}
              onClick={function(){ setSoort(s.id); setGekozen(null); }}>
              <span className="tenue-stip" style={{background:st.shirt}}/>
              <span>{s.kort}</span>
            </button>
          );
        })}
        <span style={{flex:1}}/>
        {TENUE_DELEN.map(function(d){
          return (
            <button key={d.id} className={"tenue-soort" + (deel===d.id ? " actief" : "")}
              onClick={function(){ setDeel(d.id); setGekozen(null); }}>
              <span>{d.label}</span>
              <span style={{opacity:.55,fontWeight:600}}>{tenueLagen(set, d.id).length}</span>
            </button>
          );
        })}
      </div>

      {/* Op een smal scherm past er maar één paneel naast de tekening */}
      <div className="tenue-soorten alleen-smal" style={{marginBottom:8}}>
        {[["bouw","Vormen kiezen"],["lagen","Lagen en kleuren"]].map(function(t){
          return (
            <button key={t[0]} className={"tenue-soort" + (smalTab===t[0] ? " actief" : "")}
              onClick={function(){ setSmalTab(t[0]); }}>{t[1]}</button>
          );
        })}
      </div>

      {/* Buiten beeld, maar wel echt getekend: hieruit haalt de PDF
          zijn tekeningen, zodat papier en scherm nooit uiteenlopen. */}
      <div ref={drukvel} aria-hidden="true"
        style={{position:"absolute", left:-99999, top:0, width:1, height:1, overflow:"hidden"}}>
        {TENUE_SOORTEN.map(function(s){
          return ["voor","achter"].map(function(k){
            return <TenueBeeld key={s.id + k} set={tenueSet(tenue, s.id)} kant={k}
              nummer={10} naam={s.keeper ? "Keeper" : "Speler"} breed={240} schaduw={false}/>;
          });
        })}
      </div>

      <div className="tenue-werkblad">
        {/* ── Links: waar je vormen vandaan haalt ── */}
        <div className={"tenue-kolom" + (smalTab === "bouw" ? "" : " verborgen")}>
          <div className="tenue-groepbalk" style={{margin:0,borderRadius:"13px 13px 0 0"}}>
            {TENUE_GROEPEN.map(function(g){
              return (
                <button key={g.id} className={"tenue-groep" + (groep===g.id ? " actief" : "")}
                  title={g.label} onClick={function(){ setGroep(g.id); }}>
                  <i className={g.icoon}/>
                </button>
              );
            })}
          </div>
          <div className="tenue-schuifgebied">
            {groep === "tekst" ? (
              <div>
                <input className="formulier-input" type="text" maxLength={14} placeholder="Typ je tekst"
                  value={nieuweTekst} onChange={function(e){ setNieuweTekst(e.target.value); }}/>
                <button className="knop" style={{width:"100%",justifyContent:"center",marginTop:8}}
                  disabled={!nieuweTekst.trim()}
                  onClick={function(){
                    voegToe({vorm:"tekst", tekst:nieuweTekst.trim(), breed:60, hoog:60});
                    setNieuweTekst("");
                  }}>
                  <i className="fa-solid fa-plus"/> Toevoegen
                </button>
                <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:8}}
                  onClick={function(){
                    voegToe({vorm:"tekst", bron:"naam", breed:40, hoog:40, kleur:set.tekst});
                  }}>
                  <i className="fa-solid fa-user"/> Naam van de speler
                </button>
                <div className="tenue-leeg" style={{fontSize:11}}>
                  Een laag met de spelersnaam of het rugnummer laat op het veld de echte
                  naam en het echte nummer zien. Hier zie je een voorbeeld.
                </div>
              </div>
            ) : groep === "cijfer" ? (
              <div>
                <button className="knop" style={{width:"100%",justifyContent:"center",marginBottom:8}}
                  onClick={function(){
                    voegToe({vorm:"cijfer", bron:"nummer", breed:80, hoog:80, kleur:set.tekst});
                  }}>
                  <i className="fa-solid fa-plus"/> Rugnummer van de speler
                </button>
                <div className="tenue-vormen">
                  {[0,1,2,3,4,5,6,7,8,9].map(function(n){
                    return (
                      <button key={n} className="tenue-vormknop"
                        onClick={function(){
                          voegToe({vorm:"cijfer", tekst:String(n), breed:70, hoog:70});
                        }}>
                        <span style={{fontSize:20,fontWeight:800,
                                      fontFamily:"'Helvetica Neue',Arial"}}>{n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : groep === "beeld" ? (
              <div>
                <input type="file" accept="image/*" style={{fontSize:11,width:"100%"}}
                  onChange={function(e){
                    var f = e.target.files && e.target.files[0];
                    e.target.value = "";
                    if (!f) return;
                    /* Ruimer dan een spelersfoto, want een sponsorlogo op
                       een shirt wordt in de PDF groot afgedrukt. Maar niet
                       ongelimiteerd: een tenue met vijf lagen van vier
                       megabyte krijg je nooit meer weg. */
                    verkleinAfbeelding(f, {max: LAAG_MAX_PX}, function(err, uit){
                      if (err) { meldFout(err); return; }
                      voegToe({beeld:uit, vorm:"vierkant", breed:55, hoog:55});
                    });
                  }}/>
                <div className="tenue-leeg">
                  Kies een afbeelding. Die komt als laag op het tenue en kun je daarna
                  verslepen en schalen.
                </div>
              </div>
            ) : (
              <div className="tenue-vormen">
                {tenueVormen(groep).map(function(v){
                  return <TenueVormKnop key={v.id} vorm={v}
                    onClick={function(){
                      voegToe({vorm:v.id, breed:v.vul ? 100 : 45, hoog:v.vul ? 100 : 45});
                    }}/>;
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Midden: de tekening met het gereedschap eronder ── */}
        <div style={{display:"flex",flexDirection:"column",minHeight:0,gap:0}}>
          <div className="tenue-doekvak">
            <div className="tenue-hoekknoppen">
              <button className="tenue-wisknop" title="Dit tenue opslaan als afbeelding"
                disabled={bezig} onClick={bewaarPlaatje}>
                <i className={bezig ? "fa-solid fa-hourglass-half" : "fa-solid fa-image"}/>
              </button>
              <button className="tenue-wisknop" title="Alle vijf de tenues als PDF"
                disabled={bezig} onClick={maakPdf}>
                <i className={bezig ? "fa-solid fa-hourglass-half" : "fa-solid fa-file-pdf"}/>
              </button>
              <button className="tenue-wisknop" title="Ongedaan maken"
                disabled={!stappen.terug} onClick={terug}>
                <i className="fa-solid fa-rotate-left"/>
              </button>
              <button className="tenue-wisknop" title="Opnieuw"
                disabled={!stappen.vooruit} onClick={opnieuw}>
                <i className="fa-solid fa-rotate-right"/>
              </button>
              {laag && (
                <button className="tenue-wisknop weg" title="Deze laag weghalen"
                  onClick={function(){ setGekozen(null); opLaag(tenueLaagWeg); }}>
                  <i className="fa-solid fa-trash"/>
                </button>
              )}
            </div>
            <div className="tenue-mini">
              <TenueBeeld set={set} kant={deelInfo.kant === "achter" ? "voor" : "achter"}
                nummer={10} breed={74}/>
              <div className="tenue-kant">{deelInfo.kant === "achter" ? "Voor" : "Achter"}</div>
            </div>
            <div className="tenue-zoomknoppen">
              <button title="Uitzoomen" disabled={zoom <= TENUE_ZOOMS[0]}
                onClick={function(){ setZoom(tenueZoomStap(zoom, false)); }}>
                <i className="fa-solid fa-magnifying-glass-minus"/>
              </button>
              <span className="tenue-zoomwaarde" title="Terug naar honderd procent"
                onClick={function(){ setZoom(1); }}>{Math.round(zoom * 100) + "%"}</span>
              <button title="Inzoomen" disabled={zoom >= TENUE_ZOOMS[TENUE_ZOOMS.length - 1]}
                onClick={function(){ setZoom(tenueZoomStap(zoom, true)); }}>
                <i className="fa-solid fa-magnifying-glass-plus"/>
              </button>
            </div>
            <div className="tenue-midden" ref={vakRef}
              onPointerDown={vingerNeer} onPointerMove={vingerBeweegt}
              onPointerUp={vingerOp} onPointerCancel={vingerOp}
              onWheel={function(e){
              /* Knijpen op een trackpad komt binnen als scrollen met
                 de ctrl-toets. Gewoon scrollen laat het vak schuiven. */
              if (!e.ctrlKey && !e.metaKey) return;
              e.preventDefault();
              setZoom(function(z){ return tenueZoomKlem(z * (e.deltaY < 0 ? 1.12 : 0.89)); });
            }}>
              <div ref={doek} className="tenue-doek"
                onPointerDown={pak} onPointerMove={schuif} onPointerUp={laat} onPointerCancel={laat}>
                <TenueBeeld set={set} kant={deelInfo.kant === "achter" ? "achter" : "voor"}
                  nummer={10} naam={info.keeper ? "Keeper" : "Speler"}
                  breed={doekBreed} kader={laag} kaderStuk={deelInfo.stuk}
                  onGreep={grijp} vel={vel}/>
              </div>
            </div>
          </div>

          {laag ? (
            <div className="tenue-gereed">
              <input className="tenue-kleur-input" style={{width:32,height:28}} type="color"
                value={laag.kleur} title="Vulkleur"
                onChange={function(e){ zetLaag("kleur", e.target.value); }}/>
              <input className="tenue-kleur-input" style={{width:32,height:28}} type="color"
                value={laag.lijn} title="Lijnkleur"
                onChange={function(e){ zetLaag("lijn", e.target.value); }}/>
              <select className="tenue-knopje" value={laag.lijnDik} title="Lijndikte"
                onChange={function(e){ zetLaag("lijnDik", Number(e.target.value)); }}>
                {TENUE_LIJNDIKTES.map(function(d){
                  return <option key={d.id} value={d.id}>{d.label}</option>;
                })}
              </select>
              {vulLaag ? (
                <span style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:600}}>
                  Dit patroon vult het hele kledingstuk.
                </span>
              ) : (
                <span style={{display:"contents"}}>
                  {getalVeld("x", "x", -20, 120)}
                  {getalVeld("y", "y", -20, 120)}
                  {getalVeld("b", "breed", 4, 200)}
                  {getalVeld("h", "hoog", 4, 200)}
                  <span className="tenue-veld">
                    <i className="fa-solid fa-rotate" style={{fontSize:10}}/>
                    <GetalVeld min={0} max={359} waarde={Math.round(laag.hoek)}
                      opWaarde={function(n){ zetLaag("hoek", tenueHoekKlik(n, vastklik)); }}/>
                  </span>
                  <button className={"tenue-knopje" + (vastklik ? " aan" : "")} title="Vastklikken op 15 graden"
                    onClick={function(){ setVastklik(!vastklik); }}>
                    <i className="fa-solid fa-magnet"/>
                  </button>
                  <button className={"tenue-knopje" + (laag.spiegel ? " aan" : "")} title="Horizontaal spiegelen"
                    onClick={function(){ zetLaag("spiegel", !laag.spiegel); }}>
                    <i className="fa-solid fa-left-right"/>
                  </button>
                  <button className={"tenue-knopje" + (laag.spiegelV ? " aan" : "")} title="Verticaal spiegelen"
                    onClick={function(){ zetLaag("spiegelV", !laag.spiegelV); }}>
                    <i className="fa-solid fa-up-down"/>
                  </button>
                  <button className="tenue-knopje" title="Midden op het kledingstuk"
                    onClick={function(){ opLaag(tenueLaagMidden); }}>
                    <i className="fa-solid fa-crosshairs"/>
                  </button>
                  <button className="tenue-knopje" title="Verdubbelen"
                    onClick={function(){ opLaag(tenueLaagKopie); }}>
                    <i className="fa-regular fa-clone"/>
                  </button>
                  <span className="tenue-veld" title="Dekking">
                    <i className="fa-regular fa-eye" style={{fontSize:10}}/>
                    <GetalVeld min={10} max={100} step={5} leeg={100}
                      waarde={Math.round(laag.doorzicht * 100)}
                      opWaarde={function(n){ zetLaag("doorzicht", n / 100); }}/>
                  </span>
                  {tenueLaagSoort(laag) === "tekst" && (
                    <span style={{display:"contents"}}>
                      <span className="tenue-veld" title="Boog">
                        <i className="fa-solid fa-bezier-curve" style={{fontSize:10}}/>
                        <GetalVeld min={-100} max={100} waarde={Math.round(laag.boog)}
                          opWaarde={function(n){ zetLaag("boog", n); }}/>
                      </span>
                      <select className="tenue-knopje" value={laag.font} title="Lettertype"
                        onChange={function(e){ zetLaag("font", e.target.value); }}>
                        {TENUE_FONTS.map(function(f){
                          return <option key={f.id} value={f.id}>{f.label}</option>;
                        })}
                      </select>
                      <select className="tenue-knopje" value={laag.bron} title="Wat staat er"
                        onChange={function(e){ zetLaag("bron", e.target.value); }}>
                        {TENUE_BRONNEN.map(function(b){
                          return <option key={b.id} value={b.id}>{b.label}</option>;
                        })}
                      </select>
                    </span>
                  )}
                </span>
              )}
            </div>
          ) : (
            <div className="tenue-gereed" style={{justifyContent:"center"}}>
              <span style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:600}}>
                Kies links een vorm, of tik rechts op een laag om hem te bewerken.
              </span>
            </div>
          )}
        </div>

        {/* ── Rechts: de lagen, bovenste bovenaan ── */}
        <div className={"tenue-kolom" + (smalTab === "lagen" ? "" : " verborgen")}>
          <div className="tenue-kolomkop">Lagen</div>
          <div className="tenue-schuifgebied">
            {eigenLagen.length === 0 ? (
              <div className="tenue-leeg" style={{fontSize:11}}>Nog niets opgelegd.</div>
            ) : eigenLagen.slice().reverse().map(function(l){
              var v = tenueVorm(l.vorm);
              var soortL = tenueLaagSoort(l);
              return (
                <div key={l.id} className={"tenue-miniatuur" + (gekozen===l.id ? " actief" : "")}
                  onClick={function(){ setGekozen(l.id); }}>
                  <span className="vak">
                    {soortL === "vorm" && v ? (
                      <svg viewBox="0 0 100 100" width="26" height="26">
                        <g fill={l.kleur} stroke="rgba(0,0,0,.3)" strokeWidth="2"
                           fillRule={v.regel === "evenodd" ? "evenodd" : "nonzero"}>
                          {tenueVormDelen(l.vorm).map(function(d, i){
                            return d.d ? <path key={i} d={d.d}/>
                              : <rect key={i} x={d.x} y={d.y} width={d.b} height={d.h}/>;
                          })}
                        </g>
                      </svg>
                    ) : soortL === "beeld" ? (
                      <img src={l.beeld} alt="" style={{width:26,height:26,objectFit:"contain"}}/>
                    ) : (
                      <span style={{fontSize:9,fontWeight:800,color:l.kleur,
                                    fontFamily:"'Helvetica Neue',Arial",overflow:"hidden"}}>
                        {l.bron === "nummer" ? "10" : l.bron === "naam" ? "Naam" : (l.tekst || "Aa")}
                      </span>
                    )}
                  </span>
                  <span className="tenue-laagnaam" style={{fontSize:10.5}}>{tenueLaagNaam(l)}</span>
                  <span className="pijlen">
                    <button title="Naar voren" onClick={function(e){ e.stopPropagation();
                      pasAan(function(s){ return tenueLaagSchuif(s, l.id, true); }); }}>
                      <i className="fa-solid fa-caret-up"/></button>
                    <button title="Naar achteren" onClick={function(e){ e.stopPropagation();
                      pasAan(function(s){ return tenueLaagSchuif(s, l.id, false); }); }}>
                      <i className="fa-solid fa-caret-down"/></button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="tenue-kolomkop" style={{borderBottom:"none",borderTop:"1px solid var(--grijs)"}}>
            Kleuren
          </div>
          <div className="tenue-schuifgebied" style={{flex:"0 0 auto",maxHeight:190,paddingTop:4}}>
            {kleuren.map(function(v){
              var leeg = v[0] === "mouw" && !set[v[0]];
              return (
                <div key={v[0]} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <input className="tenue-kleur-input" style={{width:30,height:24}} type="color"
                    value={set[v[0]] || set.shirt}
                    onChange={function(e){ zet(v[0], e.target.value); }}/>
                  <span style={{fontSize:11,fontWeight:700,color:leeg?"var(--grijs-donker)":"var(--tekst)",
                                fontFamily:"'Helvetica Neue',Arial"}}>{v[1]}</span>
                </div>
              );
            })}
            {/* Het tenue begint blanco; het wapen en de sponsor zet je
                er zelf bij als je ze wilt. */}
            <button className={"tenue-knopje" + (set.embleem ? " aan" : "")}
              style={{width:"100%",marginTop:4}}
              onClick={function(){ zet("embleem", !set.embleem); }}>
              <i className="fa-solid fa-shield-halved"/> Wapen
            </button>
            <input className="formulier-input" type="text" maxLength={18} placeholder="Sponsor"
              style={{marginTop:6,fontSize:11,padding:"5px 7px"}}
              value={set.sponsor || ""} onChange={function(e){ zet("sponsor", e.target.value); }}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClubhuisModule() {
  const [tab, setTab] = useState(null);       /* null = het dashboard */
  const spelers = laadSpelers();
  const park = laadJson(SPORTPARK_KEY);
  const quiz = (function(){ var b = laadJson(QUIZ_KEY); return (Array.isArray(b) ? b[0] : b) || {}; })();
  const metSkills = spelers.filter(heeftSkills).length;
  const tenue = laadTenue();
  const eigen = TENUE_SOORTEN.filter(function(s){ return (tenue.sets || {})[s.id]; }).length;

  const kaarten = [
    {id:"sportpark", titel:t("clubhuis.sportpark"), icoon:"fa-solid fa-cube", kleur:"#16a34a",
     tekst:t("clubhuis.sportpark.tekst"),
     tel: park.length ? park.length + " onderdelen neergezet" : "Nog niets gebouwd"},
    {id:"kaarten",   titel:t("clubhuis.kaarten"), icoon:"fa-solid fa-id-card", kleur:"#c9a227",
     tekst:t("clubhuis.kaarten.tekst"),
     tel: spelers.length ? metSkills + " van de " + spelers.length + " spelers beoordeeld" : "Nog geen spelers"},
    {id:"tenue",     titel:t("clubhuis.tenue"), icoon:"fa-solid fa-shirt", kleur:"#004aad",
     tekst:t("clubhuis.tenue.tekst"),
     tel: eigen + " van de " + TENUE_SOORTEN.length + " tenues zelf ingericht"},
    {id:"quiz",      titel:t("clubhuis.quiz"), icoon:"fa-solid fa-clipboard-question", kleur:"#0891b2",
     tekst:t("clubhuis.quiz.tekst"),
     tel: quiz.gespeeld ? quiz.gespeeld + "× gespeeld, beste score " + quiz.beste + " van 6" : "Nog niet gespeeld"}
  ];

  if (tab) return (
    <div>
      <button className="back-knop" onClick={function(){ setTab(null); }}>
        <i className="fa-solid fa-chevron-left"/> {t("clubhuis.titel")}
      </button>
      {tab==="sportpark" && <SportparkTab />}
      {tab==="kaarten"   && <SpelerkaartTab />}
      {tab==="tenue"     && <TenueOntwerperTab />}
      {tab==="quiz"      && <SpelregelquizTab />}
    </div>
  );

  return (
    <div>
      <h2 style={{marginBottom:4}}>{t("clubhuis.titel")}</h2>
      <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,margin:"0 0 16px"}}>
        {t("clubhuis.onder")}
      </p>
      <div className="clubhuis-raster">
        {kaarten.map(function(k){
          return (
            <button key={k.id} className="clubhuis-kaart" onClick={function(){ setTab(k.id); }}>
              <span className="clubhuis-icoon" style={{background:k.kleur}}>
                <i className={k.icoon}/>
              </span>
              <span className="clubhuis-titel">{k.titel}</span>
              <span className="clubhuis-tekst">{k.tekst}</span>
              <span className="clubhuis-tel">{k.tel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* De draaibalk zweeft boven het onderdeel en het maat-handvat ligt
   op een hoek ervan. Kijk je er van opzij naar, dan schuiven die twee
   over elkaar heen. Dan wijkt de balk omhoog tot het blokje er weer
   vrij onder ligt. Geeft nul terug als ze elkaar niet in de weg
   zitten, anders het aantal beeldpunten dat de balk omhoog moet. */
function parkBalkWijkt(balk, greep, balkBreed, balkHoog) {
  if (!balk || !greep) return 0;
  if (Math.abs(balk.x - greep.x) > balkBreed/2 + 16) return 0;
  var nodig = balkHoog/2 + 22;
  return Math.max(0, nodig - (greep.y - balk.y));
}

/* Een doorzichtige versie van een onderdeel, om te laten zien waar
   het terechtkomt voordat je klikt. De oorspronkelijke kleur gaat mee
   in userData, zodat we tussen "past" en "past niet" kunnen wisselen
   zonder alles opnieuw op te bouwen. */
function parkSpookMaken(groep) {
  groep.traverse(function(n){
    if (!n.material) return;
    var was = Array.isArray(n.material);
    var lijst = (was ? n.material : [n.material]).map(function(m){
      var c = m.clone();
      c.transparent = true; c.opacity = 0.55; c.depthWrite = false;
      if (c.color) c.userData = Object.assign({}, c.userData, {basis: c.color.getHex()});
      return c;
    });
    n.material = was ? lijst : lijst[0];
    n.castShadow = false; n.receiveShadow = false;
  });
  return groep;
}
function parkSpookKleur(groep, past) {
  groep.traverse(function(n){
    if (!n.material) return;
    (Array.isArray(n.material) ? n.material : [n.material]).forEach(function(m){
      if (!m.color || !m.userData || m.userData.basis === undefined) return;
      m.color.setHex(past ? m.userData.basis : 0xd9534f);
    });
  });
}

/* ── De 3D-scène ────────────────────────────────────────────
   Three.js levert de bouwstenen; de camerabesturing is van ons.
   De platte tekening van elk onderdeel wordt hier de bovenkant
   van het object, zodat de velden hun lijnen houden. */
/* Het gras onder het hele complex was één egale kleur, en dat maakt
   het terrein een tekenvel. Dit legt er zachte vlekken overheen —
   hier wat lichter, daar wat doorgelopen — met steeds hetzelfde
   patroon, zodat het niet danst als je de camera beweegt. */
function parkGrondTextuur(THREE) {
  var px = 256;
  var doek = document.createElement("canvas");
  doek.width = doek.height = px;
  var ctx = doek.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, px, px);
  for (var i = 0; i < 150; i++) {
    var x = parkRuis("grond", i) * px, y = parkRuis("grond", i + 500) * px;
    var r = 9 + parkRuis("grond", i + 900) * 30;
    var licht = parkRuis("grond", i + 1300) > 0.55;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, licht ? "rgba(255,255,255,.34)" : "rgba(60,48,20,.16)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  }
  var t = new THREE.CanvasTexture(doek);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 6);
  t.anisotropy = 4;
  return t;
}
function parkTextuur(THREE, o, kast, sfeer) {
  /* Het maaipatroon hoort bij de sleutel: anders blijft de oude
     tekening in de kast staan als je een ander patroon kiest. */
  var sleutel = o.id + "|" + ((sfeer && sfeer.maaien) || "banen");
  if (kast[sleutel]) return kast[sleutel];
  var px = 64;
  var doek = document.createElement("canvas");
  doek.width  = Math.max(4, Math.round(o.b * px));
  doek.height = Math.max(4, Math.round(o.h * px));
  var ctx = doek.getContext("2d");
  o.vorm(o.b, o.h, sfeer).forEach(function(v){ tekenParkVorm(ctx, v, px); });
  var t = new THREE.CanvasTexture(doek);
  t.anisotropy = 4;
  if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
  kast[sleutel] = t;
  return t;
}
function parkBouwStuk(THREE, stuk, kast, dag) {
  var basis = parkOnderdeel(stuk.type);
  if (!basis) return null;
  /* Bij een eigen maat maken we een kopie met die afmetingen, zodat
     de tekening en de 3D-stukken meeschalen. */
  var o = (stuk.b && stuk.h) ? Object.assign({}, basis, {b:stuk.b, h:stuk.h, id:basis.id+"-"+stuk.b+"x"+stuk.h}) : basis;
  /* Elk veld mag zijn eigen maaipatroon hebben, dus dat gaat mee in
     wat de tekening te zien krijgt. */
  var kijkStuk = Object.assign({}, dag || {}, {maaien: parkVeldPatroon(stuk, dag)});
  /* De buitenste groep staat op het middelpunt en draait daar
     omheen. De binnenste schuift een halve maat terug, zodat alle
     onderdelen gewoon vanaf 0,0 getekend mogen blijven worden. */
  var buiten = new THREE.Group();
  var pl = parkPlaatsing(stuk);
  buiten.position.set(pl.x, pl.y, pl.z);
  buiten.rotation.y = pl.draai;
  /* Een boom of een doeltje heeft geen eigen breedte en diepte maar
     een percentage. Dat schalen we hier, zodat de voetafdruk waarmee
     we rekenen en het ding dat je ziet dezelfde maat houden. */
  if (pl.schaal !== 1 || pl.schaalY !== pl.schaal)
    buiten.scale.set(pl.schaal, pl.schaalY, pl.schaal);
  buiten.userData.stukId = stuk.id;
  var groep = new THREE.Group();
  groep.position.set(-o.b/2, 0, -o.h/2);
  buiten.add(groep);
  groep.userData.stukId = stuk.id;
  /* Eén boom of struik krijgt een eigen stand en maat, om het midden
     van zijn eigen vakje. Alleen voor onderdelen die uit één ding
     bestaan: een rij zou als geheel scheef komen te staan. */
  if (basis.varieert) {
    var midX = basis.b/2, midZ = basis.h/2;
    var draaiing = parkRuis(stuk.id, 90) * Math.PI * 2;
    var maat = 0.78 + parkRuis(stuk.id, 91) * 0.44;
    var binnen = new THREE.Group();
    binnen.position.set(midX, 0, midZ);
    binnen.rotation.y = draaiing;
    binnen.scale.set(maat, 0.85 + parkRuis(stuk.id, 92) * 0.4, maat);
    groep.add(binnen);
    groep.userData.binnen = binnen;
  }

  /* Elke plaatsing krijgt zijn eigen vaste ruis, zodat twee bomen
     verschillen maar dezelfde boom niet verspringt bij het hertekenen. */
  var ruis = function(n){ return parkRuis(stuk.id, n); };

  /* Een gebouw op kale grasgrond zweeft. Een randje bestrating
     eromheen zet het vast op de plek. */
  if (o.hoogte > 0.3) {
    var stoep = new THREE.Mesh(
      new THREE.BoxGeometry(o.b + 0.7, 0.04, o.h + 0.7),
      new THREE.MeshLambertMaterial({color:"#b5b0a6"}));
    stoep.position.set(o.b/2, 0.02, o.h/2);
    stoep.receiveShadow = true;
    groep.add(stoep);
  }

  if (o.hoogte > 0) {
    var zij = new THREE.MeshLambertMaterial({color: o.zijkant || "#c8cdd4"});
    var top = new THREE.MeshLambertMaterial({map: parkTextuur(THREE, o, kast, kijkStuk)});
    /* Elk veld krijgt zijn eigen tint. De tekening zelf blijft
       gedeeld — de kleur vermenigvuldigt hem alleen een beetje, dus
       twee velden naast elkaar zien er nooit identiek uit. */
    if (o.groep === "Velden") {
      var g = 0.88 + parkRuis(stuk.id, 77) * 0.12;
      top.color.setRGB(g * 0.99, g, g * 0.95);
    }
    /* De volgorde van BoxGeometry is +x, -x, +y, -y, +z, -z:
       alleen de bovenkant krijgt de tekening. */
    var doos = new THREE.Mesh(
      new THREE.BoxGeometry(o.b, o.hoogte, o.h), [zij, zij, top, zij, zij, zij]);
    doos.position.set(o.b/2, o.hoogte/2, o.h/2);
    /* Een veld of parkeerplaats is nagenoeg vlak. Die een schaduw
       laten werpen levert alleen strepen over zichzelf op. */
    doos.castShadow = o.hoogte > 0.12;
    doos.receiveShadow = true;
    groep.add(doos);
  }
  (o.bouw ? o.bouw(o.b, o.h, ruis, kijkStuk) : []).forEach(function(d){
    /* Een brandende lamp en zijn lichtkegel moeten niet belicht
       worden maar zelf licht geven; die krijgen een vlak materiaal. */
    var mat = d.gloed
      ? new THREE.MeshBasicMaterial({
          color: d.kleur,
          transparent: d.dekking !== undefined,
          opacity: d.dekking === undefined ? 1 : d.dekking,
          depthWrite: d.dekking === undefined})
      /* Glas hoort wél belicht te worden, alleen doorzichtig. Met een
         vlak materiaal wordt een glazen dak een grijze plaat. */
      : new THREE.MeshLambertMaterial({
          color: d.kleur,
          transparent: d.dekking !== undefined,
          opacity: d.dekking === undefined ? 1 : d.dekking,
          side: d.dekking !== undefined ? THREE.DoubleSide : THREE.FrontSide});
    var geo, hoog;
    if (d.vorm === "cilinder") { geo = new THREE.CylinderGeometry(d.straal, d.straal, d.hoog, 10); hoog = d.hoog; }
    else if (d.vorm === "bol")  { geo = new THREE.SphereGeometry(d.straal, 14, 10); hoog = d.straal*2; }
    else if (d.vorm === "kegel"){
      geo = new THREE.ConeGeometry(d.straal, d.hoog, 14);
      hoog = d.hoog;
      if (d.punt) {
        /* Normaal staat een vorm op zijn onderkant. Een lichtbundel
           hangt juist aan zijn punt: die zit vast aan de lamp en
           zwaait naar voren als de mast scheef staat. Daarom eerst de
           punt op de oorsprong, dan pas kantelen. */
        geo.translate(0, -d.hoog/2, 0);
        if (d.kantel) geo.rotateX(d.kantel);
        hoog = 0;
      }
    }
    else if (d.vorm === "wig")  {
      /* Een driehoekig prisma voor een zadeldak. Tot nu toe werd zoiets
         nagebootst met zeven op elkaar gestapelde plaatjes, en dat is
         precies waarom de gebouwen er blokkerig uitzagen. */
      var tek = new THREE.Shape();
      tek.moveTo(-d.d/2, 0); tek.lineTo(d.d/2, 0); tek.lineTo(0, d.hoog); tek.closePath();
      geo = new THREE.ExtrudeGeometry(tek, {depth: d.b, bevelEnabled: false});
      if (d.langs === "z") { geo.translate(0, -d.hoog/2, -d.b/2); }
      else { geo.rotateY(Math.PI/2); geo.translate(-d.b/2, -d.hoog/2, 0); }
      hoog = d.hoog;
    }
    else if (d.vorm === "schuin") {
      /* Een enkel schuin dakvlak: een dunne plaat onder een hoek */
      geo = new THREE.BoxGeometry(d.b, d.dik || 0.09, d.d);
      geo.rotateX(d.kanteling || 0);
      hoog = (d.dik || 0.09);
    }
    else                        { geo = new THREE.BoxGeometry(d.b, d.hoog, d.d); hoog = d.hoog; }
    var m = new THREE.Mesh(geo, mat);
    var doel = groep.userData.binnen || groep;
    var vx = groep.userData.binnen ? d.x - o.b/2 : d.x;
    var vz = groep.userData.binnen ? d.z - o.h/2 : d.z;
    m.position.set(vx, parkDeelHoogte(d, hoog), vz);
    if (d.rek) m.scale.set(d.rek[0], d.rek[1], d.rek[2]);
    /* Een tree in een bochttribune staat schuin op de straal; zonder
       eigen draaiing wordt een boog een blokkendoos. */
    if (d.draai) m.rotation.y = d.draai;
    /* Een schuine dakplaat kantelt om zijn eigen as; bij een kegel zit
       de kanteling al in de vorm zelf. */
    if (d.kantel && d.vorm !== "kegel") m.rotation.x = d.kantel;
    /* Glas werpt nauwelijks schaduw; een dichte plaat wel. */
    var doorzichtig = d.gloed || (d.dekking !== undefined && d.dekking < 0.6);
    m.castShadow = !doorzichtig && (d.hoog || d.straal*2 || 0) > 0.1;
    m.receiveShadow = !d.gloed;
    doel.add(m);
  });
  return buiten;
}

function SportparkDrieD({ stukken, gekozen, onKies, onVerplaats, onMaat, camKnop, stand,
                          onDraai, onWis, onHoogte, onHoogMaal,
                          plaatsType, plaatsMaat, plaatsHoek, dagdeel,
                          sfeer, onStap, onPlaats, onPlaatsAf }) {
  /* Alles wat de scène nodig heeft om te tekenen op één hoop: tijd
     van de dag, clubkleuren en het maaipatroon. */
  const kijk = Object.assign({}, parkDagdeel(dagdeel), sfeer || {});
  const dagRef = useRef(kijk);
  dagRef.current = kijk;
  /* Wat er aan de muis hangt, en waar het nu zou landen */
  const plaatsRef = useRef(null);
  plaatsRef.current = plaatsType
    ? {type:plaatsType, maat:plaatsMaat, hoek:plaatsHoek||0, zet:onPlaats, af:onPlaatsAf}
    : null;
  const stukkenRef = useRef(stukken);
  stukkenRef.current = stukken;
  const standRef = useRef(stand);
  standRef.current = stand;
  const houder = useRef(null);
  /* Waar de knopjes van het gekozen onderdeel op het scherm staan.
     Dat wordt elk beeldje opnieuw uitgerekend, want zodra je de
     camera draait moeten ze meeschuiven. */
  const [knopPlek, setKnopPlek] = useState(null);
  const knopRef = useRef(null);
  knopRef.current = knopPlek;
  const [greepPlek, setGreepPlek] = useState(null);   /* het maat-handvat */
  const greepRef = useRef(null);
  greepRef.current = greepPlek;
  const [hoogPlek, setHoogPlek] = useState(null);    /* het hoogte-handvat */
  const hoogRef = useRef(null);
  hoogRef.current = hoogPlek;
  const balkRef = useRef(null);
  const w = useRef({});                 /* alles wat niet opnieuw hoeft te renderen */
  const [foutmelding, setFout] = useState(null);

  /* ── Eenmalig opzetten ── */
  useEffect(function(){
    var THREE = window.THREE;
    if (!THREE) { setFout("De 3D-bibliotheek is niet geladen. Ververs de pagina met internetverbinding."); return; }
    var el = houder.current;
    if (!el) return;
    var renderer;
    try {
      /* preserveDrawingBuffer: zonder dit is het doek leeg zodra je er
         een foto van wilt maken om te delen. */
      renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, preserveDrawingBuffer:true});
      /* Zonder deze twee regels wordt er geen enkele schaduw getekend,
         hoeveel castShadow je ook op de objecten zet. */
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      /* Kleuren in de juiste ruimte, anders ogen ze wassig */
      if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    } catch (e) {
      setFout("Dit apparaat kan geen 3D tonen in de browser.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth || 600, el.clientHeight || 400);
    el.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var dag = dagRef.current;
    scene.background = new THREE.Color(dag.lucht);
    scene.fog = new THREE.Fog(dag.lucht, dag.mist[0], dag.mist[1]);

    var camera = new THREE.PerspectiveCamera(45, 1.5, 0.5, 1600);

    /* Weinig vlak omgevingslicht: dat maakte alle zijkanten even licht
       als de daken, waardoor gebouwen als platte blokken oogden. */
    var omgeving = new THREE.AmbientLight(0xffffff, dag.omgeving);
    scene.add(omgeving);
    /* Zachte invulling van boven (lucht) en onder (gras) */
    var hemel = new THREE.HemisphereLight(dag.hemel.boven, dag.hemel.onder, dag.hemel.kracht);
    scene.add(hemel);

    var zon = new THREE.DirectionalLight(dag.zon.kleur, dag.zon.kracht);
    zon.castShadow = true;
    zon.shadow.mapSize.width = 2048;
    zon.shadow.mapSize.height = 2048;
    zon.shadow.camera.near = 1;
    zon.shadow.camera.far = 460;
    /* Tegen streepjes op vlakke oppervlakken */
    zon.shadow.bias = -0.0007;
    if (zon.shadow.normalBias !== undefined) zon.shadow.normalBias = 0.06;
    scene.add(zon);
    scene.add(zon.target);

    /* Het gras onder alles */
    var grond = new THREE.Mesh(
      new THREE.PlaneGeometry(PARK_KOLOMMEN + 60, PARK_RIJEN + 60),
      new THREE.MeshLambertMaterial({color: dag.gras, map: parkGrondTextuur(THREE)}));
    grond.rotation.x = -Math.PI/2;
    grond.position.set(PARK_KOLOMMEN/2, 0, PARK_RIJEN/2);
    grond.receiveShadow = true;
    scene.add(grond);

    /* Eén lijn per vier vakjes, dus per tien meter. Op 192 vakjes zou
       een lijn per vakje een dicht gaas worden. */
    var rasterMaat = Math.max(PARK_KOLOMMEN, PARK_RIJEN);
    var raster = new THREE.GridHelper(rasterMaat,
      Math.round(rasterMaat / PARK_RASTER_STAP), 0x4a8440, 0x4a8440);
    raster.position.set(PARK_KOLOMMEN/2, 0.012, PARK_RIJEN/2);
    raster.material.opacity = 0.35; raster.material.transparent = true;
    scene.add(raster);

    var inhoud = new THREE.Group();
    scene.add(inhoud);
    /* Het spookbeeld staat buiten de inhoud, want die wordt bij elke
       wijziging leeggegooid en opnieuw opgebouwd. En zo raakt de
       muisaanwijzer het ook niet aan. */
    var spookLaag = new THREE.Group();
    scene.add(spookLaag);

    w.current = {
      THREE:THREE, renderer:renderer, scene:scene, camera:camera, inhoud:inhoud,
      spookLaag:spookLaag,
      kast:{}, doel:{x:PARK_KOLOMMEN/2, y:0, z:PARK_RIJEN/2},
      zon:zon, omgeving:omgeving, hemel:hemel, grond:grond,
      cam:Object.assign({}, PARK_CAM.start),
      straal:new THREE.Raycaster(), vlak:new THREE.Plane(new THREE.Vector3(0,1,0), 0),
      vuil:true, leeft:true
    };

    function pasCamera() {
      var s = w.current;
      var p = parkCameraPositie(s.doel, s.cam.afstand, s.cam.draai, s.cam.kantel);
      s.camera.position.set(p.x, p.y, p.z);
      s.camera.lookAt(s.doel.x, s.doel.y, s.doel.z);
      /* De zon staat vast ten opzichte van het terrein, maar het vak
         waarbinnen schaduwen berekend worden schuift mee met wat je
         bekijkt. Anders zijn ze aan de rand van het complex weg. */
      var vak = parkSchaduwVak(s.cam.afstand);
      var sc = zon.shadow.camera;
      sc.left = -vak; sc.right = vak; sc.top = vak; sc.bottom = -vak;
      sc.updateProjectionMatrix();
      var dd = dagRef.current.zon;
      zon.position.set(s.doel.x + dd.x, dd.y, s.doel.z + dd.z);
      zon.target.position.set(s.doel.x, 0, s.doel.z);
      zon.target.updateMatrixWorld();
      s.vuil = true;
    }
    w.current.pasCamera = pasCamera;

    function meet() {
      var s = w.current;
      var b = el.clientWidth || 600, ho = el.clientHeight || 400;
      s.renderer.setSize(b, ho, false);
      s.camera.aspect = b / Math.max(1, ho);
      s.camera.updateProjectionMatrix();
      s.vuil = true;
    }
    w.current.meet = meet;
    meet();
    pasCamera();

    var kijker = window.ResizeObserver ? new ResizeObserver(meet) : null;
    if (kijker) kijker.observe(el);

    (function lus(){
      var s = w.current;
      if (!s || !s.leeft) return;
      if (s.vuil) {
        s.renderer.render(s.scene, s.camera);
        s.vuil = false;
        volgKnoppen(s);
      }
      requestAnimationFrame(lus);
    })();

    return function(){
      var s = w.current;
      if (!s) return;
      s.leeft = false;
      if (kijker) kijker.disconnect();
      try { s.renderer.dispose(); } catch(e) {}
      if (s.renderer.domElement && s.renderer.domElement.parentNode) {
        s.renderer.domElement.parentNode.removeChild(s.renderer.domElement);
      }
      w.current = {};
    };
  }, []);

  /* ── Opnieuw opbouwen zodra er iets verandert ── */
  useEffect(function(){
    var s = w.current;
    if (!s || !s.inhoud) return;
    while (s.inhoud.children.length) s.inhoud.remove(s.inhoud.children[0]);
    (stukken||[]).forEach(function(stuk){
      var g = parkBouwStuk(s.THREE, stuk, s.kast, kijk);
      if (!g) return;
      s.inhoud.add(g);
      if (stuk.id === gekozen) {
        var e = parkEigenMaat(stuk), mid = parkMidden(stuk);
        var rand = new s.THREE.Mesh(
          new s.THREE.BoxGeometry(e.b, 0.06, e.h),
          new s.THREE.MeshBasicMaterial({color:0xffd400}));
        rand.position.set(mid.cx, 0.03, mid.cy);
        rand.rotation.y = -parkHoek(stuk) * Math.PI / 180;
        s.inhoud.add(rand);
        /* Iets boven het onderdeel, zodat de knopjes er niet in zakken */
        s.knopDoel = {x:mid.cx, y:Math.max(1.6, (parkOnderdeel(stuk.type)||{}).hoogte||0) + 1.2, z:mid.cy};
        /* En een handvat op de hoek, om de maat mee te trekken */
        var hv = parkHandvat(stuk);
        s.greepDoel = {x:hv.x, y:0.1, z:hv.y};
        var hh = parkHoogHandvat(stuk);
        s.hoogDoel = {x:hh.x, y:hh.y + 0.25, z:hh.z};
        var blok = new s.THREE.Mesh(
          new s.THREE.BoxGeometry(0.7, 0.5, 0.7),
          new s.THREE.MeshBasicMaterial({color:0xffd400}));
        blok.position.set(hv.x, 0.25, hv.y);
        s.inhoud.add(blok);
      }
    });
    if (!gekozen) { s.knopDoel = null; s.greepDoel = null; s.hoogDoel = null; }
    s.vuil = true;
  }, [stukken, gekozen, dagdeel, sfeer]);

  /* Het gekozen onderdeel naar schermpunten omrekenen, zodat de
     draaiknoppen er precies boven kunnen zweven. */
  function naarScherm(s, punt) {
    var v = new s.THREE.Vector3(punt.x, punt.y, punt.z);
    v.project(s.camera);
    if (v.z > 1) return null;
    var vak = s.renderer.domElement.getBoundingClientRect();
    return {x: (v.x * 0.5 + 0.5) * vak.width, y: (-v.y * 0.5 + 0.5) * vak.height};
  }
  function volgKnoppen(s) {
    function zet(doel, oud, zetter) {
      if (!doel) { if (oud) zetter(null); return; }
      var p = naarScherm(s, doel);
      if (!p) { if (oud) zetter(null); return; }
      if (oud && Math.abs(oud.x - p.x) < 1 && Math.abs(oud.y - p.y) < 1) return;
      zetter(p);
    }
    zet(s.knopDoel,  knopRef.current,  setKnopPlek);
    zet(s.greepDoel, greepRef.current, setGreepPlek);
    zet(s.hoogDoel,  hoogRef.current,  setHoogPlek);
  }

  /* De tijd van de dag omzetten in licht, lucht en grasgroen */
  useEffect(function(){
    var s = w.current;
    if (!s || !s.scene) return;
    var d = parkDagdeel(dagdeel);
    /* Een ander maaipatroon of andere clubkleuren betekenen nieuwe
       tekeningen; de oude uit de kast gooien, anders blijft het beeld
       staan zoals het was. */
    s.kast = {};
    s.scene.background.set(d.lucht);
    s.scene.fog.color.set(d.lucht);
    s.scene.fog.near = d.mist[0];
    s.scene.fog.far  = d.mist[1];
    s.omgeving.intensity = d.omgeving;
    s.hemel.color.set(d.hemel.boven);
    s.hemel.groundColor.set(d.hemel.onder);
    s.hemel.intensity = d.hemel.kracht;
    s.zon.color.set(d.zon.kleur);
    s.zon.intensity = d.zon.kracht;
    s.grond.material.color.set(d.gras);
    if (s.pasCamera) s.pasCamera();
    s.vuil = true;
  }, [dagdeel, sfeer]);

  /* Het spookbeeld: het gekozen onderdeel doorzichtig meebewegen
     met de muis, tot je klikt om het echt neer te zetten. */
  useEffect(function(){
    var s = w.current;
    if (!s || !s.scene) return;
    if (s.spook) { s.spookLaag.remove(s.spook); s.spook = null; s.spookPlek = null; }
    if (plaatsType) {
      var proef = {id:"__spook", type:plaatsType, cx:PARK_KOLOMMEN/2, cy:PARK_RIJEN/2, hoek:0};
      if (plaatsMaat) { proef.b = plaatsMaat.b; proef.h = plaatsMaat.h; }
      var g = parkBouwStuk(s.THREE, proef, s.kast, dagRef.current);
      if (g) {
        s.spook = parkSpookMaken(g);
        s.spookPast = true;
        s.spookLaag.add(s.spook);
        s.spookPlek = proef;
      }
    }
    s.vuil = true;
    return function(){
      var t = w.current;
      if (t && t.spook && t.spookLaag) { t.spookLaag.remove(t.spook); t.spook = null; t.vuil = true; }
    };
  }, [plaatsType, plaatsMaat]);

  /* Waar het spookbeeld op dít moment zou landen */
  /* Draaien terwijl het aan de muis hangt: het spookbeeld draait mee
     op de plek waar het al zweefde, zonder dat je hoeft te bewegen. */
  useEffect(function(){
    var s = w.current;
    if (!s || !s.spook || !s.spookGrond) return;
    spookOp(s.spookGrond.x, s.spookGrond.y);
  }, [plaatsHoek]);

  function spookOp(gx, gy) {
    var s = w.current;
    if (!s || !s.spook || !plaatsRef.current) return null;
    return spookRekenen(s, {x:gx, y:gy});
  }
  function spookNaar(e) {
    var s = w.current;
    if (!s || !s.spook || !plaatsRef.current) return null;
    var g = naarGrond(e);
    if (!g) return null;
    return spookRekenen(s, g);
  }
  function spookRekenen(s, g) {
    s.spookGrond = g;
    var proef = parkLandt(plaatsRef.current.type, plaatsRef.current.maat,
                          g.x, g.y, plaatsRef.current.hoek, stukkenRef.current);
    proef.id = "__spook";
    var mid = parkMidden(proef);
    s.spook.position.set(mid.cx, parkOp(proef) + 0.03, mid.cy);
    s.spook.rotation.y = -parkHoek(proef) * Math.PI / 180;
    var past = parkMag(proef, stukkenRef.current);
    if (past !== s.spookPast) { parkSpookKleur(s.spook, past); s.spookPast = past; }
    s.spookPlek = proef;
    s.vuil = true;
    return proef;
  }

  /* ── De knoppen buiten de scène ── */
  useEffect(function(){
    if (!camKnop) return;
    camKnop.current = function(wat){
      var s = w.current;
      if (!s || !s.pasCamera) return;
      if (wat === "links")  s.cam.draai -= 0.4;
      if (wat === "rechts") s.cam.draai += 0.4;
      if (wat === "in")     s.cam = parkCameraZoom(s.cam, -2);
      if (wat === "uit")    s.cam = parkCameraZoom(s.cam,  2);
      if (wat === "boven")  { s.cam.kantel = PARK_CAM.kantelMax; }
      if (wat === "begin")  {
        s.cam = Object.assign({}, PARK_CAM.start);
        s.doel = {x:PARK_KOLOMMEN/2, y:0, z:PARK_RIJEN/2};
      }
      if (wat === "alles") {
        var vak = s.renderer.domElement.getBoundingClientRect();
        var pas = parkAllesInBeeld(stukkenRef.current,
          vak.height ? vak.width / vak.height : 1.5, s.cam.kantel);
        s.doel = pas.doel;
        s.cam = Object.assign({}, s.cam, {afstand: pas.afstand});
      }
      if (wat === "foto") {
        /* Eerst opnieuw tekenen, anders deel je het vorige beeld */
        s.renderer.render(s.scene, s.camera);
        s.renderer.domElement.toBlob(function(blob){
          if (!blob) { meldFout("De foto kon niet gemaakt worden."); return; }
          deelOfDownload(blob, "sportpark.png", "Sportpark " + teamNaamVol(), function(hoe){
            meldGoed(hoe === "gedeeld" ? "Sportpark gedeeld"
                                       : "Opgeslagen als sportpark.png in Downloads");
          });
        }, "image/png");
        return;
      }
      s.pasCamera();
    };
  }, [camKnop]);

  /* ── Muis en vinger ── */
  function naarGrond(e) {
    var s = w.current;
    if (!s || !s.camera) return null;
    var vak = s.renderer.domElement.getBoundingClientRect();
    if (!vak.width || !vak.height) return null;
    var punt = new s.THREE.Vector2(
      ((e.clientX - vak.left) / vak.width) * 2 - 1,
      -((e.clientY - vak.top) / vak.height) * 2 + 1);
    s.straal.setFromCamera(punt, s.camera);
    var raak = new s.THREE.Vector3();
    return s.straal.ray.intersectPlane(s.vlak, raak) ? {x:raak.x, y:raak.z} : null;
  }
  function watOnder(e) {
    var s = w.current;
    if (!s || !s.inhoud) return null;
    var vak = s.renderer.domElement.getBoundingClientRect();
    var punt = new s.THREE.Vector2(
      ((e.clientX - vak.left) / vak.width) * 2 - 1,
      -((e.clientY - vak.top) / vak.height) * 2 + 1);
    s.straal.setFromCamera(punt, s.camera);
    var raken = s.straal.intersectObjects(s.inhoud.children, true);
    for (var i = 0; i < raken.length; i++) {
      var n = raken[i].object;
      while (n) { if (n.userData && n.userData.stukId) return n.userData.stukId; n = n.parent; }
    }
    return null;
  }

  function omlaag(e) {
    var s = w.current;
    if (!s || !s.camera) return;
    /* Bijhouden welke vingers er liggen. Op een aanraakscherm komt
       elke vinger als een eigen gebeurtenis binnen. Liggen er twee,
       dan is het knijpen, en dat gaat voor op alles wat eronder ligt:
       een telefoon heeft geen wiel om mee te zoomen en geen Shift om
       mee te schuiven. */
    s.vingers = vingersBij(s.vingers, e.pointerId, e.clientX, e.clientY);
    if (s.vingers.length >= 2) {
      /* Lag de eerste vinger al iets te slepen, dan laten we dat hier
         los. Anders sleep je een onderdeel mee terwijl je zoomt. */
      s.sleep = null;
      s.knijp = knijpMeting(s.vingers);
      return;
    }
    /* Hangt er iets aan de muis, dan gaat deze klik daarover. Met de
       rechtermuisknop laat je het weer los. */
    if (plaatsRef.current) {
      if (e.button === 2) { plaatsRef.current.af(); return; }
      var plek = spookNaar(e);
      if (plek) { plaatsRef.current.zet(plek.cx, plek.cy, parkHoek(plek), parkOp(plek)); return; }
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    var id = watOnder(e);
    var grond = naarGrond(e);
    if (id && grond && !e.shiftKey) {
      var stuk = (stukken||[]).filter(function(x){ return x.id===id; })[0];
      onKies(id);
      var mid0 = parkMidden(stuk);
      /* Nog niet verplaatsen, en nog geen stap onthouden. Dat gebeurt
         pas zodra de vinger ver genoeg is weggerold. Een vingertop
         staat nooit stil, dus zonder die drempel verschuift alles wat
         je alleen maar wilde aanwijzen. */
      s.sleep = {soort:"stuk", id:id, dx: grond.x - mid0.cx, dy: grond.y - mid0.cy,
                 x0: e.clientX, y0: e.clientY, aanwijzer: e.pointerType, wacht: true};
    } else {
      if (!id) onKies(null);
      var wil = (standRef.current === "schuif") ? "schuif" : "draai";
      if (e.shiftKey || e.button===2) wil = (wil === "schuif") ? "draai" : "schuif";
      s.sleep = {soort: wil, mx:e.clientX, my:e.clientY};
    }
  }
  /* Het handvat vastpakken. De muisaanwijzer wordt op het blokje zelf
     vastgezet, zodat je hem overal naartoe mag slepen. */
  function greepVast(e) {
    var s = w.current;
    if (!s || !gekozen) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (onStap) onStap();
    s.sleep = {soort:"maat", id:gekozen};
  }
  function greepLos(e) {
    var s = w.current;
    if (s) s.sleep = null;
    if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  /* De hoogte trek je langs een staand vlak dat je recht aankijkt.
     Met alleen de muisbeweging in beeldpunten zou een klik bovenin
     het scherm iets anders betekenen dan onderin. */
  function naarHoogte(e) {
    var s = w.current;
    if (!s || !s.camera || !s.sleep || !s.sleep.punt) return null;
    var vak = s.renderer.domElement.getBoundingClientRect();
    var punt = new s.THREE.Vector2(
      ((e.clientX - vak.left) / vak.width) * 2 - 1,
      -((e.clientY - vak.top) / vak.height) * 2 + 1);
    s.straal.setFromCamera(punt, s.camera);
    var kijk = new s.THREE.Vector3();
    s.camera.getWorldDirection(kijk);
    kijk.y = 0;
    if (kijk.lengthSq() < 1e-6) return null;
    kijk.normalize();
    var vlak = new s.THREE.Plane().setFromNormalAndCoplanarPoint(kijk, s.sleep.punt);
    var raak = new s.THREE.Vector3();
    return s.straal.ray.intersectPlane(vlak, raak) ? raak.y : null;
  }
  function hoogVast(e) {
    var s = w.current;
    if (!s || !gekozen || !gekozenStuk) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (onStap) onStap();
    var m = parkMidden(gekozenStuk);
    s.sleep = {soort:"hoog", id:gekozen,
               punt: new s.THREE.Vector3(m.cx, parkOp(gekozenStuk), m.cy)};
  }
  function hoogBeweeg(e) {
    var s = w.current;
    if (!s || !s.sleep || s.sleep.soort !== "hoog") return;
    var y = naarHoogte(e);
    if (y !== null && onHoogMaal) onHoogMaal(s.sleep.id, y);
  }

  function greepBeweeg(e) {
    var s = w.current;
    if (!s || !s.sleep || s.sleep.soort !== "maat") return;
    var g = naarGrond(e);
    if (g) onMaat(s.sleep.id, g.x, g.y);
  }

  function beweeg(e) {
    var s = w.current;
    if (!s) return;
    /* Twee vingers: knijpen om te zoomen, en samen schuiven om over
       het terrein te lopen. Samen vervangen ze het muiswiel en de
       Shift-toets, die een telefoon geen van beide heeft. */
    if (s.vingers && s.vingers.length >= 2) {
      s.vingers = vingersVerplaats(s.vingers, e.pointerId, e.clientX, e.clientY);
      var meting = knijpMeting(s.vingers);
      var gebaar = knijpBeweging(s.knijp, meting);
      s.knijp = meting;
      if (!gebaar || !s.pasCamera) return;
      if (gebaar.dx || gebaar.dy)
        s.doel = parkCameraSchuif(s.doel, s.cam.draai, s.cam.afstand, gebaar.dx, gebaar.dy);
      if (gebaar.schaal !== 1)
        s.cam = parkCameraZoom(s.cam, knijpStappen(gebaar.schaal));
      s.pasCamera();
      return;
    }
    if (s.vingers && s.vingers.length)
      s.vingers = vingersVerplaats(s.vingers, e.pointerId, e.clientX, e.clientY);
    if (plaatsRef.current && !s.sleep) { spookNaar(e); return; }
    if (!s.sleep) return;
    /* Wachten tot de vinger ver genoeg van zijn beginpunt is. Blijft
       hij binnen de drempel, dan was het een tik en verschuift er
       niets. Pas hier wordt de stap onthouden, zodat ongedaan maken
       niet volloopt met tikken waarbij niets veranderde. */
    if (s.sleep.wacht) {
      if (!voorbijDrempel(s.sleep.x0, s.sleep.y0, e.clientX, e.clientY, s.sleep.aanwijzer))
        return;
      s.sleep.wacht = false;
      if (onStap) onStap();
    }
    if (s.sleep.soort === "maat") {
      var gm = naarGrond(e);
      if (gm) onMaat(s.sleep.id, gm.x, gm.y);
      return;
    }
    if (s.sleep.soort === "stuk") {
      var g = naarGrond(e);
      if (!g) return;
      var stuk = (stukken||[]).filter(function(x){ return x.id===s.sleep.id; })[0];
      if (!stuk) return;
      onVerplaats(s.sleep.id, g.x - s.sleep.dx, g.y - s.sleep.dy);
      return;
    }
    var dx = e.clientX - s.sleep.mx, dy = e.clientY - s.sleep.my;
    s.sleep.mx = e.clientX; s.sleep.my = e.clientY;
    if (s.sleep.soort === "schuif") {
      s.doel = parkCameraSchuif(s.doel, s.cam.draai, s.cam.afstand, dx, dy);
    } else {
      s.cam = parkCameraDraai(s.cam, dx, dy);
    }
    s.pasCamera();
  }
  function omhoog(e) {
    var s = w.current;
    if (!s) return;
    s.vingers = (e && e.pointerId !== undefined) ? vingersAf(s.vingers, e.pointerId) : [];
    /* Til je een van de twee vingers op, dan stopt het knijpen maar
       blijft de andere liggen. Er mag dan niets meer gebeuren tot je
       opnieuw begint: anders springt het beeld op het moment dat je
       een vinger loslaat. */
    if (s.vingers.length < 2) s.knijp = null;
    if (!s.vingers.length) s.sleep = null;
  }
  function wiel(e) {
    var s = w.current;
    if (!s || !s.pasCamera) return;
    e.preventDefault();
    s.cam = parkCameraZoom(s.cam, e.deltaY > 0 ? 1 : -1);
    s.pasCamera();
  }

  if (foutmelding) return (
    <div className="park-fout">
      <i className="fa-solid fa-cube"/>
      <p>{foutmelding}</p>
    </div>
  );

  const gekozenStuk = (stukken||[]).filter(function(s){ return s.id===gekozen; })[0] || null;
  /* De balk wijkt omhoog als het maat-handvat eronder komt te liggen.
     De maat lezen we van de balk zelf, zodat het blijft kloppen als
     er ooit een knopje bij komt. */
  const wijk = parkBalkWijkt(knopPlek, greepPlek,
    (balkRef.current && balkRef.current.offsetWidth)  || 176,
    (balkRef.current && balkRef.current.offsetHeight) || 34);

  return (
    <React.Fragment>
      <div ref={houder} className={"park-3d"+(plaatsType?" plaatsen":"")} style={{touchAction:"none"}}
        onPointerDown={omlaag} onPointerMove={beweeg} onPointerUp={omhoog}
        onPointerCancel={omhoog} onWheel={wiel}
        onContextMenu={function(e){ e.preventDefault(); }} />
      {gekozenStuk && hoogPlek && !plaatsType && (
        <div className="park-hooggreep" style={{left:hoogPlek.x, top:hoogPlek.y}}
          title={"Sleep omhoog of omlaag \u2014 nu " +
                 (parkHoogte(gekozenStuk) * PARK_METER).toFixed(1) + " m hoog"}
          onPointerDown={hoogVast} onPointerMove={hoogBeweeg}
          onPointerUp={greepLos} onPointerCancel={greepLos}>
          <i className="fa-solid fa-up-down"/>
        </div>
      )}
      {gekozenStuk && greepPlek && !plaatsType && (
        <div className="park-maatgreep" style={{left:greepPlek.x, top:greepPlek.y}}
          title={"Sleep om de maat te veranderen — nu " +
                 (parkSchaalSoort(gekozenStuk.type) === "formaat"
                   ? Math.round((gekozenStuk.formaat||1)*100) + "%"
                   : parkMaat(gekozenStuk).b*PARK_METER + " bij " +
                     parkMaat(gekozenStuk).h*PARK_METER + " meter")}
          onPointerDown={greepVast} onPointerMove={greepBeweeg}
          onPointerUp={greepLos} onPointerCancel={greepLos}>
          <i className="fa-solid fa-up-right-and-down-left-from-center"/>
        </div>
      )}
      {gekozenStuk && knopPlek && (
        <div className="park-greep" ref={balkRef}
          style={{left:knopPlek.x, top:knopPlek.y - wijk}}>
          <button className="park-greepknop" title={"Een slag terug (" + PARK_HOEK_STAP + " graden)"}
            onClick={function(){ onDraai(gekozenStuk.id, -PARK_HOEK_STAP); }}>
            <i className="fa-solid fa-rotate-left"/>
          </button>
          <span className="park-greephoek">{parkHoek(gekozenStuk)}&deg;</span>
          <button className="park-greepknop" title={"Een slag verder (" + PARK_HOEK_STAP + " graden)"}
            onClick={function(){ onDraai(gekozenStuk.id, PARK_HOEK_STAP); }}>
            <i className="fa-solid fa-rotate-right"/>
          </button>
          <button className="park-greepknop kwart" title="Een kwartslag"
            onClick={function(){ onDraai(gekozenStuk.id, 90); }}>
            <i className="fa-solid fa-square-caret-right"/>
          </button>
          <span className="park-greepdeel"/>
          <button className="park-greepknop" title="Een halve meter omhoog"
            onClick={function(){ onHoogte(gekozenStuk.id, 0.2); }}>
            <i className="fa-solid fa-arrow-up"/>
          </button>
          {parkOp(gekozenStuk) > 0 &&
            <span className="park-greephoek">{(parkOp(gekozenStuk)*PARK_METER).toFixed(1)}m</span>}
          <button className="park-greepknop" title="Een halve meter omlaag"
            disabled={parkOp(gekozenStuk) <= 0}
            onClick={function(){ onHoogte(gekozenStuk.id, -0.2); }}>
            <i className="fa-solid fa-arrow-down"/>
          </button>
          <button className="park-greepknop weg" title="Weghalen"
            onClick={function(){ onWis(gekozenStuk.id); }}>
            <i className="fa-solid fa-trash"/>
          </button>
        </div>
      )}
    </React.Fragment>
  );
}

function EigenVeldVenster({ onSluiten, onMaken }) {
  const [breed, setBreed] = useState("64");
  const [diep,  setDiep]  = useState("42");
  const bm = Math.round(Number(breed)||0), hm = Math.round(Number(diep)||0);
  /* Op het raster kun je alleen veelvouden van 2,5 meter kwijt */
  const echtB = Math.round(bm/PARK_METER) * PARK_METER;
  const echtH = Math.round(hm/PARK_METER) * PARK_METER;
  const past = echtB >= PARK_METER*2 && echtH >= PARK_METER*2 &&
               echtB <= PARK_KOLOMMEN*PARK_METER && echtH <= PARK_RIJEN*PARK_METER;
  return (
    <div className="modal-overlay" style={{zIndex:420}}
      onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel">Veld op eigen maat</div>
        <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,margin:"0 0 12px"}}>
          Meet je eigen veld op en vul de maten in meters in. Het raster werkt in stappen
          van {PARK_METER} meter, dus de maat wordt daarnaar afgerond.
        </p>
        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Breedte in meters</label>
            <input className="formulier-input" value={breed} inputMode="numeric" autoFocus
              onChange={function(e){ setBreed(e.target.value.replace(/[^0-9]/g,"")); }} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Diepte in meters</label>
            <input className="formulier-input" value={diep} inputMode="numeric"
              onChange={function(e){ setDiep(e.target.value.replace(/[^0-9]/g,"")); }} />
          </div>
        </div>
        <p style={{fontSize:12,fontWeight:700,margin:"0 0 4px",
          color: past ? "var(--succes)" : "var(--gevaar)"}}>
          {past ? "Wordt " + echtB + " × " + echtH + " meter"
                : "Dat past niet op het terrein"}
        </p>
        <div className="park-voorbeelden">
          {[["Groot veld",105,68],["Half veld",64,42],["Zeventallen",64,42],
            ["Pupillen",42,27],["Zeven bij zeven",42,30]].map(function(v,i){
            return (
              <button key={i} className="knop lijn klein"
                onClick={function(){ setBreed(String(v[1])); setDiep(String(v[2])); }}>
                {v[0]}
              </button>
            );
          })}
        </div>
        <div className="modal-knoppen">
          <button className="knop lijn" onClick={onSluiten}>Annuleren</button>
          <button className="knop succes" disabled={!past}
            onClick={function(){ if (past) onMaken(echtB, echtH); }}>
            <i className="fa-solid fa-check"/> Neerzetten
          </button>
        </div>
      </div>
    </div>
  );
}

/* Naam vragen bij het bewaren. Een apart componentje, zodat het
   typen in het veld niet het hele sportpark opnieuw laat tekenen. */
function ParkBewaarPopup({ start, aantal, sluit, bewaar }) {
  const [naam, setNaam] = useState(start.naam || "");
  const veld = useRef(null);
  useEffect(function(){ if (veld.current) veld.current.focus(); }, []);
  function klaar() { bewaar(naam, start.id); }
  return (
    <div className="bevestig-overlay"><div className="bevestig-kaart">
      <h3>{start.id ? "Bijwerken" : "Sportpark bewaren"}</h3>
      <p>
        {start.id
          ? "De " + aantal + " onderdelen die er nu staan vervangen wat er onder deze naam bewaard is."
          : "De " + aantal + " onderdelen die er nu staan worden bewaard onder deze naam."}
      </p>
      <input ref={veld} className="formulier-input" value={naam} maxLength={30}
        placeholder="Bijvoorbeeld: Vierkantsdijk"
        onChange={function(e){ setNaam(e.target.value); }}
        onKeyDown={function(e){ if (e.key==="Enter") klaar(); if (e.key==="Escape") sluit(); }}/>
      <div className="bevestig-knoppen" style={{marginTop:12}}>
        <button className="knop lijn" onClick={sluit}>Annuleren</button>
        <button className="knop" onClick={klaar}>Bewaren</button>
      </div>
    </div></div>
  );
}

function SportparkTab() {
  /* Bij het lezen meteen omrekenen naar de nieuwe manier van plaatsen,
     zodat de rest van het scherm maar één vorm hoeft te kennen. */
  const [stukken, setStukken] = useState(function(){ return parkVernieuwAlles(laadJson(SPORTPARK_KEY)); });
  const [gekozen, setGekozen] = useState(null);
  const [groep, setGroep] = useState("Velden");
  const [leegOpen, setLeegOpen] = useState(false);
  const [sjabloonOpen, setSjabloonOpen] = useState(false);
  const [parken, setParken] = useState(function(){ return laadJson(SPORTPARKEN_KEY); });
  const [bewaarOpen, setBewaarOpen] = useState(null);  /* null | {id, naam} */
  const [wisPark, setWisPark] = useState(null);
  const [uitPark, setUitPark] = useState(null);        /* welk bewaard park staat open */
  const [stand, setStand] = useState("draai");        /* draai | schuif */
  const [plaatsType, setPlaatsType] = useState(null); /* wat er aan de muis hangt */
  const [plaatsMaat, setPlaatsMaat] = useState(null); /* bij een veld op eigen maat */
  const [plaatsHoek, setPlaatsHoek] = useState(0);   /* alvast gedraaid neerzetten */
  const [dagdeel, setDagdeel] = useState("middag");  /* ochtend, middag of avond */
  const [sfeer, setSfeer] = useState(laadParkSfeer);
  const [sfeerOpen, setSfeerOpen] = useState(false);
  const [vol, setVol] = useState(false);            /* schermvullend bouwen */
  /* Staat het gereedschap uitgeklapt? Alleen van belang op een smal
     scherm; daarboven staat toch alles al in beeld. */
  const [gereed, setGereed] = useState(false);
  const [vrij, setVrij] = useState(parkVrijBouwen());
  /* Een stapel vorige standen, zodat een misklik geen halve middag
     kost. Veertig diep is ruim; meer onthouden heeft geen zin. */
  const historie = useRef([]);
  const [stappen, setStappen] = useState(0);
  const [eigenOpen, setEigenOpen] = useState(false);
  const camKnop = useRef(null);

  useEffect(function(){ slaJson(SPORTPARK_KEY, stukken); }, [stukken]);
  useEffect(function(){ slaJson(SPORTPARKEN_KEY, parken); }, [parken]);
  useEffect(function(){ slaParkSfeer(sfeer); }, [sfeer]);

  /* Vóór elke wijziging de huidige stand wegleggen. Het slepen legt
     hem één keer weg bij het oppakken, niet bij elke muisbeweging. */
  function bewaarStap() {
    historie.current = historie.current.concat([stukken]).slice(-40);
    setStappen(historie.current.length);
  }
  /* Het maaipatroon van één veld. Zonder eigen keuze volgt het veld
     de parkinstelling; zodra je er een kiest staat hij vast. */
  function zetVeldPatroon(id, patroon) {
    bewaarStap();
    setStukken(function(l){
      return l.map(function(s){
        return s.id === id ? Object.assign({}, s, {maaien: patroon}) : s;
      });
    });
  }
  /* Hoger of lager zetten, in stappen van een halve meter. Onder de
     grond kan niet; verder is er geen bovengrens, want dat is precies
     het punt van vrij bouwen. */
  function zetHoogte(id, delta) {
    bewaarStap();
    setStukken(function(l){
      var bron = l.filter(function(s){ return s.id===id; })[0];
      if (!bron) return l;
      var nieuw = Object.assign({}, parkVernieuw(bron),
        {op: Math.max(0, Math.round((parkOp(bron) + delta) * 100) / 100)});
      var rest = l.filter(function(s){ return s.id!==id; });
      if (!parkMag(nieuw, rest)) { meldFout("Daar past hij zo niet."); return l; }
      return l.map(function(s){ return s.id===id ? nieuw : s; });
    });
  }
  /* De hoogte uitrekken. De onderkant blijft staan; past het zo niet,
     dan blijft hij zoals hij was. */
  function pasHoogMaal(id, wereldY) {
    setStukken(function(l){
      var bron = l.filter(function(s){ return s.id===id; })[0];
      if (!bron) return l;
      var nieuw = parkTrekHoogte(bron, wereldY);
      var rest = l.filter(function(s){ return s.id!==id; });
      if (!parkMag(nieuw, rest)) return l;
      return l.map(function(s){ return s.id===id ? nieuw : s; });
    });
  }
  function zetVrij(aan) {
    parkVrijBouwen(aan);
    setVrij(aan);
    meldGoed(aan ? "Vrij bouwen aan — alles mag overal"
                 : "Vrij bouwen uit — onderdelen houden weer afstand");
  }
  /* Escape sluit het volle scherm; anders zit je vast als de knop
     onder een paneel wegvalt. */
  useEffect(function(){
    if (!vol) return;
    function toets(e) { if (e.key === "Escape" && !plaatsType) setVol(false); }
    window.addEventListener("keydown", toets);
    return function(){ window.removeEventListener("keydown", toets); };
  }, [vol, plaatsType]);

  /* Zolang je schermvullend bouwt mag de pagina eronder niet scrollen,
     en moet de animatie op de inhoud uit — die zet een transform, en
     dan blijft "fixed" binnen die kolom hangen in plaats van over het
     hele venster. */
  useEffect(function(){
    document.body.classList.toggle("park-vol", vol);
    /* Naar boven scrollen voordat we overschakelen: stond de pagina
       nog halverwege, dan begon het volle scherm daar ook. */
    if (vol && window.scrollTo) window.scrollTo(0, 0);
    return function(){ document.body.classList.remove("park-vol"); };
  }, [vol]);

  /* Bij het wisselen verandert het beeld van vorm; dan alles opnieuw
     inpassen, anders kijk je ineens naar een hoek van het terrein. */
  useEffect(function(){
    var t = setTimeout(function(){ cam("alles"); }, 90);
    return function(){ clearTimeout(t); };
  }, [vol]);

  function ongedaan() {
    if (!historie.current.length) return;
    var terug = historie.current[historie.current.length - 1];
    historie.current = historie.current.slice(0, -1);
    setStappen(historie.current.length);
    setStukken(terug);
    setGekozen(null);
    meldGoed("Laatste stap ongedaan gemaakt");
  }

  /* Uit de kist kiezen hangt het onderdeel aan de muis: je ziet het
     doorzichtig over het terrein bewegen en klikt waar het moet komen.
     Nog een keer op dezelfde knop, Escape of de rechtermuisknop laat
     het weer los. */
  function kiesUitKist(type, maat) {
    if (!maat && plaatsType === type) { stopPlaatsen(); return; }
    var o = parkOnderdeel(type);
    if (o && o.eigenMaat && !maat) { setEigenOpen(true); return; }
    setEigenOpen(false);
    setGekozen(null);
    setPlaatsType(type);
    setPlaatsMaat(maat || null);
  }
  function stopPlaatsen() { setPlaatsType(null); setPlaatsMaat(null); }
  /* De hoek blijft staan als je hem eenmaal gekozen hebt, zodat je
     een rij schuine onderdelen achter elkaar kunt neerzetten zonder
     elke keer opnieuw te draaien. */
  function draaiHangend(graden) {
    setPlaatsHoek(function(v){ return (v + graden + 360) % 360; });
  }
  function zetNeer(vakX, vakY, hoek, op) {
    var type = plaatsType;
    if (!type) return;
    var nieuw = parkLandt(type, plaatsMaat, vakX, vakY,
                          hoek === undefined ? plaatsHoek : hoek, stukken);
    nieuw.id = parkNieuwId();
    if (typeof op === "number") nieuw.op = op;
    if (!parkMag(nieuw, stukken)) {
      meldFout("Daar staat al iets in de weg.");
      return;
    }
    bewaarStap();
    setStukken(function(l){ return l.concat([nieuw]); });
    setGekozen(nieuw.id);
    stopPlaatsen();
  }

  /* Escape laat het onderdeel los */
  useEffect(function(){
    if (!plaatsType) return;
    function toets(e) {
      if (e.key === "Escape") { stopPlaatsen(); return; }
      /* R draait een slag; met Shift de andere kant op. De pijltjes
         doen hetzelfde, want dat is wat je vanzelf probeert. */
      if (e.key === "r" || e.key === "R" || e.key === "ArrowRight") {
        e.preventDefault();
        draaiHangend(e.shiftKey || e.key === "ArrowLeft" ? -PARK_HOEK_STAP : PARK_HOEK_STAP);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault(); draaiHangend(-PARK_HOEK_STAP);
      }
    }
    window.addEventListener("keydown", toets);
    return function(){ window.removeEventListener("keydown", toets); };
  }, [plaatsType]);
  function verplaats(id, cx, cy) {
    setStukken(function(l){
      var proef = l.map(function(s){
        if (s.id !== id) return s;
        var v = parkKlikVast(parkBinnenTerrein(
          Object.assign({}, parkVernieuw(s), {cx:cx, cy:cy})));
        /* Sleep je iets op de grond over iets anders heen, dan klimt
           het erop. Stond het al opgetild, dan blijft die hoogte:
           anders schuift een dak steeds op de tribune eronder. */
        if (parkOp(s) === 0) {
          var op = parkStapelHoogte(v, l.filter(function(x){ return x.id !== id; }));
          if (op > 0) v.op = op;
        }
        return v;
      });
      var verzet = proef.filter(function(s){ return s.id===id; })[0];
      /* Staat er al iets, dan blijft hij gewoon waar hij was */
      return parkMag(verzet, proef) ? proef : l;
    });
  }
  /* De maat veranderen door aan het handvat te trekken. Past de
     nieuwe maat niet, dan blijft hij staan zoals hij stond — net als
     bij het verslepen. */
  function pasMaat(id, gx, gy) {
    setStukken(function(l){
      var bron = l.filter(function(s){ return s.id===id; })[0];
      if (!bron) return l;
      var nieuw = parkTrekMaat(bron, gx, gy);
      var rest = l.filter(function(s){ return s.id!==id; });
      if (!parkMag(nieuw, rest)) return l;
      return l.map(function(s){ return s.id===id ? nieuw : s; });
    });
  }

  /* Draaien om het eigen middelpunt, in stappen van vijftien graden.
     Past hij gedraaid niet meer, dan proberen we hem eerst nog een
     klein stukje op te schuiven voordat we het opgeven. */
  function draai(id, graden) {
    bewaarStap();
    setStukken(function(l){
      var bron = l.filter(function(s){ return s.id===id; })[0];
      if (!bron) return l;
      var d = Object.assign({}, parkVernieuw(bron),
                            {hoek: (parkHoek(bron) + graden + 360) % 360});
      d = parkKlikVast(parkBinnenTerrein(d));
      var rest = l.filter(function(s){ return s.id!==id; });
      if (!parkMag(d, rest)) {
        meldFout("Daar past hij zo gedraaid niet.");
        return l;
      }
      return l.map(function(s){ return s.id===id ? d : s; });
    });
  }
  function wis(id) {
    bewaarStap();
    setStukken(function(l){ return l.filter(function(s){ return s.id!==id; }); });
    setGekozen(null);
  }
  function cam(wat) { if (camKnop.current) camKnop.current(wat); }

  /* ── Bewaren en terughalen ──────────────────────────────────
     Wat je op het terrein hebt staan blijft altijd bewaard, ook als
     je de app sluit. Daarnaast kun je vijf versies wegzetten om
     later weer op te halen — handig om varianten te vergelijken. */
  function bewaar(naam, overId) {
    var schoon = parkBewaardeNaam(parken.filter(function(x){ return x.id!==overId; }), naam);
    var nu = new Date().toISOString();
    if (overId) {
      setParken(function(l){ return l.map(function(x){
        return x.id===overId ? Object.assign({}, x, {naam:schoon, stukken:parkKopie(stukken), bewaard:nu}) : x;
      }); });
      meldGoed("\u201c" + schoon + "\u201d bijgewerkt");
    } else {
      if (parken.length >= PARK_MAX_BEWAARD) {
        meldFout("Je kunt er vijf bewaren. Overschrijf er een of gooi er een weg.");
        return;
      }
      var id = "sp" + Date.now();
      setParken(function(l){ return l.concat([{id:id, naam:schoon, stukken:parkKopie(stukken), bewaard:nu}]); });
      setUitPark(id);
      meldGoed("\u201c" + schoon + "\u201d bewaard");
    }
    setBewaarOpen(null);
  }
  function haalOp(park) {
    bewaarStap();
    setStukken(parkVernieuwAlles(parkKopie(park.stukken)));
    setGekozen(null);
    setUitPark(park.id);
    meldGoed("\u201c" + park.naam + "\u201d geopend");
  }
  function wisBewaard(id) {
    setParken(function(l){ return l.filter(function(x){ return x.id!==id; }); });
    if (uitPark === id) setUitPark(null);
    setWisPark(null);
  }
  /* Het sjabloon vervangt wat er staat — half door elkaar heen zetten
     levert alleen maar botsingen op. Daarom eerst vragen. */
  function zetSjabloon() {
    bewaarStap();
    var nieuw = parkSjabloonVierkantsdijk();
    setStukken(nieuw);
    setGekozen(null);
    setSjabloonOpen(false);
    meldGoed("Sportpark Vierkantsdijk neergezet — " + nieuw.length + " onderdelen");
  }

  const gekozenStuk = stukken.filter(function(s){ return s.id===gekozen; })[0] || null;
  const gekozenIsVeld = gekozenStuk &&
    (parkOnderdeel(gekozenStuk.type)||{}).groep === "Velden" &&
    ["kunstgras","kunstgras8","kunstgras34","panna"].indexOf(gekozenStuk.type) < 0;
  const cijfers = parkCijfers(stukken);

  /* De kist met onderdelen, en de cijferstrook. Allebei als los stuk,
     want ze staan onder de tekening én — schermvullend — erin. */
  const kistDeel = (
    <React.Fragment>
      <div className="tabs">
        {PARK_GROEPEN.map(function(g){
          return (
            <button key={g} className={"tab-knop "+(groep===g?"actief":"")}
              onClick={function(){ setGroep(g); }}>{g}</button>
          );
        })}
      </div>
      <div className="park-kist">
        {PARK_ONDERDELEN.filter(function(o){ return o.groep===groep; }).map(function(o){
          return (
            <button key={o.id} className={"park-knop"+(plaatsType===o.id?" bezig":"")}
              onClick={function(){ kiesUitKist(o.id); }}>
              <svg viewBox={"0 0 "+(o.b*20)+" "+(o.h*20)} className="park-mini">
                {o.vorm(o.b, o.h, sfeer).map(function(v,i){ return <ParkVorm key={i} v={v} mm={20}/>; })}
              </svg>
              <span className="park-knop-naam">{o.label}</span>
              <span className="park-knop-maat">{(o.b*PARK_METER)+" × "+(o.h*PARK_METER)+" m"}</span>
            </button>
          );
        })}
      </div>
    </React.Fragment>
  );

  const gekozenPlaats = gekozenStuk ? parkPlaatsen(gekozenStuk) : null;
  const strookDeel = (
    <div className="park-strook">
      {gekozenStuk && (
        <span className="park-strook-keuze">
          <i className="fa-solid fa-hand-pointer"/>
          <b>{(parkOnderdeel(gekozenStuk.type)||{}).label}</b>
          {parkMaat(gekozenStuk).b*PARK_METER} × {parkMaat(gekozenStuk).h*PARK_METER} m
          {" · " + (parkHoogte(gekozenStuk)*PARK_METER).toFixed(1) + " m hoog"}
          {parkOp(gekozenStuk) > 0 &&
            " · staat op " + (parkOp(gekozenStuk)*PARK_METER).toFixed(1) + " m"}
          {gekozenPlaats && gekozenPlaats.aantal > 0 &&
            " · " + gekozenPlaats.aantal.toLocaleString("nl-NL") + " " +
            PARK_PLAATS_NAAM[gekozenPlaats.soort] +
            " (" + gekozenPlaats.rijen + " rijen van " + gekozenPlaats.perRij + ")"}
        </span>
      )}
      <span>Capaciteit <b className="op">{cijfers.totaal.toLocaleString("nl-NL")}</b></span>
      <span>staan <b>{cijfers.staan.toLocaleString("nl-NL")}</b></span>
      <span>zit <b>{cijfers.zit.toLocaleString("nl-NL")}</b></span>
      <span>overdekt <b>{cijfers.overdekt.toLocaleString("nl-NL")}</b></span>
      <span>VIP <b>{cijfers.vip.toLocaleString("nl-NL")}</b></span>
      <span>velden <b>{cijfers.velden}</b></span>
      <span>gebouwen <b>{cijfers.gebouwen}</b></span>
      <span>parkeren <b>{cijfers.parkeer}</b></span>
      <span>masten <b>{cijfers.lichtmasten}</b></span>
      <span>bomen <b>{cijfers.bomen}</b></span>
      <span>onderdelen <b>{cijfers.onderdelen}</b></span>
      <span>bebouwd <b>{Math.round(cijfers.oppervlak).toLocaleString("nl-NL")} m²</b></span>
    </div>
  );

  const sfeerDeel = (
    <div className="park-sfeerpaneel">
      <div className="park-sfeerkop">
        <span><i className="fa-solid fa-palette"/> Kleuren en gras</span>
        <button onClick={function(){ setSfeerOpen(false); }}><i className="fa-solid fa-xmark"/></button>
      </div>
      <div className="park-sfeer">
        <label className="park-kleurkeuze">
          <span>Plaatsen</span>
          <input type="color" value={sfeer.stoel}
            onChange={function(e){ var v=e.target.value;
              setSfeer(function(s){ return Object.assign({}, s, {stoel:v}); }); }}/>
        </label>
        <label className="park-kleurkeuze">
          <span>Muren</span>
          <input type="color" value={sfeer.muur}
            onChange={function(e){ var v=e.target.value;
              setSfeer(function(s){ return Object.assign({}, s, {muur:v}); }); }}/>
        </label>
        <label className="park-kleurkeuze">
          <span>Daken</span>
          <input type="color" value={sfeer.dak}
            onChange={function(e){ var v=e.target.value;
              setSfeer(function(s){ return Object.assign({}, s, {dak:v}); }); }}/>
        </label>
        <button className="knop lijn klein" onClick={function(){
          var t = laadTenue();
          setSfeer(function(s){ return Object.assign({}, s, {stoel: t.shirt || "#004aad"}); });
        }}>
          <i className="fa-solid fa-shirt"/> Tenuekleur
        </button>
      </div>
      <div className="park-sfeerkop" style={{marginTop:10}}>
        <span><i className="fa-solid fa-seedling"/> Maaipatroon
          {gekozenIsVeld ? " — dit veld" : " — nieuwe velden"}</span>
      </div>
      {!gekozenIsVeld && (
        <p className="park-sfeeruitleg">
          Kies een grasveld in de tekening om alleen dat veld een ander patroon te geven.
          Nu stel je in wat nieuwe velden krijgen.
        </p>
      )}
      <div className="park-maaien">
        {PARK_MAAIPATRONEN.map(function(m){
          var nu = gekozenIsVeld ? parkVeldPatroon(gekozenStuk, sfeer) : sfeer.maaien;
          return (
            <button key={m.id} title={m.uitleg}
              className={"park-maaiknop"+(nu===m.id?" aan":"")}
              onClick={function(){
                if (gekozenIsVeld) zetVeldPatroon(gekozenStuk.id, m.id);
                else setSfeer(function(s){ return Object.assign({}, s, {maaien:m.id}); });
              }}>
              <svg viewBox="0 0 42 28" className="park-maaimini">
                <rect x="0" y="0" width="42" height="28" fill={PARK_KLEUR.gras}/>
                {pvMaaien(42, 28, true, 42, 28, m.id).map(function(v,i){
                  return <ParkVorm key={i} v={v} mm={1}/>;
                })}
              </svg>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <div className="kaart" style={{marginBottom:12}}>
        <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span><i className="fa-solid fa-cube"/> Ons sportpark</span>
          <button className="knop klein" onClick={function(){ setVol(true); }}>
            <i className="fa-solid fa-expand"/> Schermvullend bouwen
          </button>
        </div>
        <p style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,margin:"2px 0 0"}}>
          Kies iets uit de kist: het hangt dan aan je muis, doorzichtig, en je klikt waar
          het moet komen. Draaien mag alvast, met de knopjes in de balk of met de
          <b> R</b> en de pijltjestoetsen. Rood betekent dat er iets in de weg staat.
          Escape of de rechtermuisknop laat het weer los. Wat er staat versleep je gewoon, en met de
          knopjes erboven draai je het in stappen van {PARK_HOEK_STAP} graden.
          Met het gele blokje op de hoek trek je een onderdeel breder of dieper, met het
          blauwe blokje erboven hoger of lager.
          Op gras, bestrating, paden en wegen mag van alles staan; alleen twee velden
          over elkaar heen gaat niet. Zet je iets op iets anders,
          dan klimt het er vanzelf bovenop &mdash; zo stapel je containers en hang je een dak
          boven een tribune. Met de pijltjes in de balk boven het onderdeel zet je het
          hoger of lager. De knoppen staan op een breed scherm in de tekening zelf &mdash;
          linksboven terug, kleuren, vrij bouwen, delen en leegmaken, rechtsonder de camera
          en linksonder de tijd van de dag. Op een smal scherm staan ze onder de tekening,
          zodat ze je bouwvlak niet opeten.
          Materiaal zoals pionnen en doeltjes mag over een veld heen. Sleep naast de
          gebouwen om om je complex heen te lopen. Op een telefoon of tablet knijp je met
          twee vingers om in en uit te zoomen, en schuif je met diezelfde twee vingers over
          het terrein; met een muis gaat dat met het wiel en met Shift ingedrukt slepen.
          Met <b>Vierkantsdijk</b> zet je in één keer de grondvorm van ons eigen complex neer.
          {stukken.length>0 ? " " + stukken.length + " onderdelen geplaatst." : ""}
        </p>
      </div>

      <div className="kaart" style={{marginBottom:12}}>
        <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span><i className="fa-solid fa-floppy-disk"/> Bewaarde sportparken</span>
          <span style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:600}}>
            {parken.length} van de {PARK_MAX_BEWAARD}
          </span>
        </div>
        <div className="park-bewaard">
          {parken.map(function(park){
            return (
              <div key={park.id} className={"park-slot"+(uitPark===park.id?" actief":"")}>
                <div>
                  <div className="park-slot-naam">{park.naam}</div>
                  <div className="park-slot-tel">{(park.stukken||[]).length} onderdelen</div>
                </div>
                <div className="park-slot-knoppen">
                  <button className="park-slot-knop" title="Openen"
                    onClick={function(){ haalOp(park); }}>
                    <i className="fa-solid fa-folder-open"/>
                  </button>
                  <button className="park-slot-knop" title="Overschrijven met wat er nu staat"
                    onClick={function(){ setBewaarOpen({id:park.id, naam:park.naam}); }}>
                    <i className="fa-solid fa-floppy-disk"/>
                  </button>
                  <button className="park-slot-knop gevaar" title="Weggooien"
                    onClick={function(){ setWisPark(park); }}>
                    <i className="fa-solid fa-trash"/>
                  </button>
                </div>
              </div>
            );
          })}
          {parken.length < PARK_MAX_BEWAARD && (
            <button className="park-leegslot" disabled={!stukken.length}
              style={!stukken.length?{opacity:.45,cursor:"default"}:null}
              onClick={function(){ setBewaarOpen({id:null, naam:""}); }}>
              <i className="fa-solid fa-plus"/> Dit park bewaren
            </button>
          )}
        </div>
        {!parken.length && (
          <p style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,margin:"8px 0 0"}}>
            Nog niets bewaard. Wat je op het terrein hebt staan blijft sowieso bewaard —
            hier zet je versies weg die je later terug wilt kunnen halen.
          </p>
        )}
      </div>

      {!vol && kistDeel}

      <div className={"park-doek"+(vol?" vol":"")+(gereed?" gereed":"")}>
        <div className="park-vlak">
        <SportparkDrieD stukken={stukken} gekozen={gekozen} camKnop={camKnop} stand={stand}
          plaatsType={plaatsType} plaatsMaat={plaatsMaat} plaatsHoek={plaatsHoek}
          dagdeel={dagdeel} sfeer={sfeer} onStap={bewaarStap}
          onPlaats={zetNeer} onPlaatsAf={stopPlaatsen}
          onDraai={draai} onWis={wis} onMaat={pasMaat} onHoogte={zetHoogte}
          onHoogMaal={pasHoogMaal}
          onKies={setGekozen} onVerplaats={verplaats} />
        {plaatsType && (
          <div className="park-hangt">
            <i className="fa-solid fa-hand-pointer"/>
            <b>{(parkOnderdeel(plaatsType)||{}).label}</b>
            <span>klik om neer te zetten</span>
            <span className="park-hangt-draai">
              <button title={"Een slag terug (" + PARK_HOEK_STAP + " graden)"}
                onClick={function(){ draaiHangend(-PARK_HOEK_STAP); }}>
                <i className="fa-solid fa-rotate-left"/>
              </button>
              <em>{plaatsHoek}&deg;</em>
              <button title={"Een slag verder (" + PARK_HOEK_STAP + " graden)"}
                onClick={function(){ draaiHangend(PARK_HOEK_STAP); }}>
                <i className="fa-solid fa-rotate-right"/>
              </button>
            </span>
            <button onClick={stopPlaatsen}>Loslaten</button>
          </div>
        )}
        {vol && (
          <button className="park-sluit" onClick={function(){ setVol(false); }}>
            <i className="fa-solid fa-compress"/> Sluiten
          </button>
        )}
        {/* Op een breed scherm doet dit omhulsel niets (display:contents)
            en zweeft alles precies zoals het altijd deed. Op een smal
            scherm wordt het de balk onder de tekening, waarin de
            knoppen van beide blokken samen één rij vormen. */}
        <div className="park-balk">
        <div className="park-dagdelen">
          {PARK_DAGDELEN.map(function(d){
            return (
              <button key={d.id} title={d.label}
                className={"park-dagknop"+(dagdeel===d.id?" aan":"")}
                onClick={function(){ setDagdeel(d.id); }}>
                <i className={d.icoon}/> {d.label}
              </button>
            );
          })}
        </div>
        <div className="park-werk">
          {/* Alles achter één knop, want zestien knoppen naast een
              tekening van driehonderd punten breed is geen bouwen meer.
              Wat je constant nodig hebt blijft staan. */}
          <button className={"park-werkknop park-meer altijd"+(gereed?" aan":"")}
            onClick={function(){ setGereed(!gereed); }}
            title={gereed ? "Gereedschap inklappen" : "Meer gereedschap"}>
            <i className={gereed ? "fa-solid fa-chevron-up" : "fa-solid fa-ellipsis"}/>
            <span className="park-knopnaam">{gereed ? "Minder" : "Meer"}</span>
          </button>
          {!vol && (
            <button className="park-werkknop altijd" onClick={function(){ setVol(true); }}
              title="Schermvullend bouwen">
              <i className="fa-solid fa-expand"/>
              <span className="park-knopnaam">Groot</span>
            </button>
          )}
          <button className="park-werkknop altijd" onClick={ongedaan} disabled={!stappen}
            title="Laatste stap ongedaan maken">
            <i className="fa-solid fa-rotate-left"/>
            <span className="park-knopnaam">Terug</span>
          </button>
          <span className="park-stuur-scheiding"/>
          <button className={"park-werkknop"+(sfeerOpen?" aan":"")}
            onClick={function(){ setSfeerOpen(!sfeerOpen); }}
            title="Clubkleuren en gras">
            <i className="fa-solid fa-palette"/>
            <span className="park-knopnaam">Kleuren</span>
          </button>
          <button className={"park-werkknop"+(parkVrijBouwen()?" aan":"")}
            onClick={function(){ zetVrij(!vrij); }}
            title={vrij ? "Vrij bouwen staat aan: alles mag overal"
                        : "Vrij bouwen: alle regels uit"}>
            <i className="fa-solid fa-unlock"/>
            <span className="park-knopnaam">Vrij</span>
          </button>
          <span className="park-stuur-scheiding"/>
          <button className="park-werkknop" onClick={function(){ setSjabloonOpen(true); }}
            title="Sportpark Vierkantsdijk neerzetten">
            <i className="fa-solid fa-wand-magic-sparkles"/>
            <span className="park-knopnaam">Sjabloon</span>
          </button>
          <button className="park-werkknop" onClick={function(){ cam("foto"); }}
            disabled={!stukken.length} title="Delen als afbeelding">
            <i className="fa-brands fa-whatsapp"/>
            <span className="park-knopnaam">Delen</span>
          </button>
          <button className="park-werkknop gevaar" onClick={function(){ setLeegOpen(true); }}
            disabled={!stukken.length} title="Sportpark leegmaken">
            <i className="fa-solid fa-trash"/>
            <span className="park-knopnaam">Leeg</span>
          </button>
        </div>
        {sfeerOpen && sfeerDeel}
        <div className="park-stuur">
          <button className={"park-stuurknop"+(stand==="draai"?" aan":"")}
            title="Om je complex heen draaien"
            onClick={function(){ setStand("draai"); }}><i className="fa-solid fa-arrows-rotate"/>
            <span className="park-knopnaam">Draaien</span></button>
          <button className={"park-stuurknop"+(stand==="schuif"?" aan":"")}
            title="Over het terrein schuiven"
            onClick={function(){ setStand("schuif"); }}><i className="fa-solid fa-up-down-left-right"/>
            <span className="park-knopnaam">Schuiven</span></button>
          <span className="park-stuur-scheiding"/>
          <button className="park-stuurknop" title="Naar links draaien"
            onClick={function(){ cam("links"); }}><i className="fa-solid fa-rotate-left"/>
            <span className="park-knopnaam">Links</span></button>
          <button className="park-stuurknop" title="Naar rechts draaien"
            onClick={function(){ cam("rechts"); }}><i className="fa-solid fa-rotate-right"/>
            <span className="park-knopnaam">Rechts</span></button>
          <button className="park-stuurknop" title="Inzoomen"
            onClick={function(){ cam("in"); }}><i className="fa-solid fa-magnifying-glass-plus"/>
            <span className="park-knopnaam">In</span></button>
          <button className="park-stuurknop" title="Uitzoomen"
            onClick={function(){ cam("uit"); }}><i className="fa-solid fa-magnifying-glass-minus"/>
            <span className="park-knopnaam">Uit</span></button>
          <button className="park-stuurknop altijd" title="Alles in beeld"
            onClick={function(){ cam("alles"); }}><i className="fa-solid fa-maximize"/>
            <span className="park-knopnaam">Alles</span></button>
          <button className="park-stuurknop" title="Van bovenaf"
            onClick={function(){ cam("boven"); }}><i className="fa-solid fa-map"/>
            <span className="park-knopnaam">Boven</span></button>
          <button className="park-stuurknop" title="Terug naar het begin"
            onClick={function(){ cam("begin"); }}><i className="fa-solid fa-house"/>
            <span className="park-knopnaam">Begin</span></button>
        </div>
        </div>
        </div>
        {vol && kistDeel}
        {vol && strookDeel}
      </div>

      {!vol && strookDeel}

      {gekozenStuk && !vol && (
        <div className="kaart park-bewerk">
          <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <span>
              {(parkOnderdeel(gekozenStuk.type)||{}).label}
              <span className="park-maat">
                {parkMaat(gekozenStuk).b*PARK_METER} × {parkMaat(gekozenStuk).h*PARK_METER} m
                {parkSchaalSoort(gekozenStuk.type)==="formaat" &&
                  " · " + Math.round((gekozenStuk.formaat||1)*100) + "%"}
              </span>
            </span>
            {/* Alles wat ook in de zwevende balk zit. Op een telefoon is
                die balk breder dan het scherm en staat hij daarom uit;
                dan is dit de enige plek, dus mag er niets ontbreken. */}
            <div className="park-bewerkknoppen">
              <span className="park-maat">{parkHoek(gekozenStuk)}&deg; gedraaid</span>
              <button className="knop lijn klein" title={"Een slag terug (" + PARK_HOEK_STAP + " graden)"}
                onClick={function(){ draai(gekozenStuk.id, -PARK_HOEK_STAP); }}>
                <i className="fa-solid fa-rotate-left"/>
              </button>
              <button className="knop lijn klein" title={"Een slag verder (" + PARK_HOEK_STAP + " graden)"}
                onClick={function(){ draai(gekozenStuk.id, PARK_HOEK_STAP); }}>
                <i className="fa-solid fa-rotate-right"/>
              </button>
              <button className="knop lijn klein" title="Een kwartslag"
                onClick={function(){ draai(gekozenStuk.id, 90); }}>
                <i className="fa-solid fa-square-caret-right"/>
              </button>
              <span className="park-maat">
                {(parkOp(gekozenStuk)*PARK_METER).toFixed(1)}m hoog
              </span>
              <button className="knop lijn klein" title="Een stukje omhoog"
                onClick={function(){ zetHoogte(gekozenStuk.id, 0.2); }}>
                <i className="fa-solid fa-arrow-up"/>
              </button>
              <button className="knop lijn klein" title="Een stukje omlaag"
                disabled={parkOp(gekozenStuk) <= 0}
                onClick={function(){ zetHoogte(gekozenStuk.id, -0.2); }}>
                <i className="fa-solid fa-arrow-down"/>
              </button>
              <button className="knop gevaar klein" onClick={function(){ wis(gekozenStuk.id); }}>
                <i className="fa-solid fa-trash"/> Weghalen
              </button>
            </div>
          </div>
          <p style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:400,margin:0}}>
            Sleep hem over de grond naar zijn plek. Draaien gaat met de knopjes hierboven,
            elke tik {PARK_HOEK_STAP} graden, dus schuin neerzetten kan ook. Op een breed scherm
            staan diezelfde knopjes ook boven het onderdeel zelf.
            Met het gele blokje op de hoek trek je hem groter of kleiner;{" "}
            {parkSchaalSoort(gekozenStuk.type)==="lengte"
              ? "deze wordt alleen langer of korter."
              : parkSchaalSoort(gekozenStuk.type)==="formaat"
                ? "deze gaat op percentage, want hij bestaat niet uit vlakken."
                : "de tegenoverliggende hoek blijft staan."}
          </p>
        </div>
      )}

      {eigenOpen && (
        <EigenVeldVenster onSluiten={function(){ setEigenOpen(false); }}
          onMaken={function(bm, hm){
            kiesUitKist("eigenveld", {b: Math.round(bm/PARK_METER), h: Math.round(hm/PARK_METER)});
          }} />
      )}

      {bewaarOpen && (
        <ParkBewaarPopup start={bewaarOpen} aantal={stukken.length}
          sluit={function(){ setBewaarOpen(null); }} bewaar={bewaar}/>
      )}
      {wisPark && (
        <div className="bevestig-overlay"><div className="bevestig-kaart">
          <h3>&ldquo;{wisPark.naam}&rdquo; weggooien?</h3>
          <p>Dit bewaarde park verdwijnt. Wat er nu op het terrein staat blijft gewoon staan.</p>
          <div className="bevestig-knoppen">
            <button className="knop lijn" onClick={function(){ setWisPark(null); }}>Annuleren</button>
            <button className="knop gevaar" onClick={function(){ wisBewaard(wisPark.id); }}>Weggooien</button>
          </div>
        </div></div>
      )}
      {sjabloonOpen && (
        <div className="bevestig-overlay"><div className="bevestig-kaart">
          <h3>Sportpark Vierkantsdijk neerzetten?</h3>
          <p>
            De grondvorm van ons eigen complex: drie velden met het kunstgras in het
            midden, kleedkamers en kantine, parkeren, de trainingshoek en het groen
            eromheen. Daarna schuif je zelf alles op zijn plek.
            {stukken.length > 0
              ? " Let op: de " + stukken.length + " onderdelen die er nu staan verdwijnen."
              : ""}
          </p>
          <div className="bevestig-knoppen">
            <button className="knop lijn" onClick={function(){ setSjabloonOpen(false); }}>Annuleren</button>
            <button className="knop" onClick={zetSjabloon}>Neerzetten</button>
          </div>
        </div></div>
      )}
      {leegOpen && (
        <div className="bevestig-overlay"><div className="bevestig-kaart">
          <h3>Sportpark leegmaken?</h3>
          <p>Alle {stukken.length} onderdelen verdwijnen. Dit kun je niet ongedaan maken.</p>
          <div className="bevestig-knoppen">
            <button className="knop lijn" onClick={function(){ setLeegOpen(false); }}>Annuleren</button>
            <button className="knop gevaar" onClick={function(){
              bewaarStap();
              setStukken([]); setGekozen(null); setLeegOpen(false); meldGoed("Sportpark leeggemaakt");
            }}>Leegmaken</button>
          </div>
        </div></div>
      )}
    </div>
  );
}
