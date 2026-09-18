/* ══════════════════════════════════════════════════════════════
   De bouwstap — TEAMTAKKIE
   ─────────────────────────────────────────────────────────────
   Draaien:  node tools/bouw.js

   Wat dit doet:
       src/index.html   (het sjabloon: kop, stijl, body, twee inline
                         scriptjes die vóór de app moeten draaien)
     + APP_VERSIE       (sinds P6: één regel met het huidige git-
                         commitnummer, voor de foutrapportage — zie
                         huidigeCommit() hieronder)
     + src/kern/*.js    (sinds P2: de kern-modules, in vaste volgorde
                         — zie KERN_VOLGORDE hieronder)
     + src/domein/*.js  (sinds P3: de domeinlogica, in vaste volgorde
                         — zie DOMEIN_VOLGORDE hieronder)
     + src/schermen/*.jsx (sinds P4: de schermmodules, in vaste
                         volgorde — zie SCHERM_VOLGORDE hieronder)
     + src/app.jsx      (de rest van de applicatie, JSX)
     ─────────────────────────────────────────────────────────
     = online/index.html

   WAAROM DIT BESTAAT
   ─────────────────────────────────────────────────────────────
   Tot nu toe stond de JSX rauw in online/index.html, in een
   <script type="text/babel">-blok, en werd hij door babel-standalone
   in de browser van élke bezoeker vertaald. Ruim 31.000 regels, bij
   elk koud bezoek opnieuw. Op een telefoon langs de lijn met 4G kost
   dat seconden waar de gebruiker niets voor terugkrijgt — de uitkomst
   van die vertaling is voor iedereen identiek. Babel raadt gebruik in
   productie zelf af.

   Nu gebeurt die vertaling één keer, hier, op Evans laptop, vlak
   voordat de map naar Netlify gaat.

   WAT DIT NADRUKKELIJK NIET DOET
   ─────────────────────────────────────────────────────────────
   Niets minificeren. Geen namen inkorten, geen regels samenvoegen,
   geen dode code weggooien. De uitvoer moet zo dicht mogelijk bij de
   bron blijven, want:
     1. de tests in tests/ knippen functies als tékst uit
        online/index.html — herschrijven breekt dat;
     2. als er ooit iets misgaat in productie wil je in het
        uitgerolde bestand nog kunnen lézen wat er staat.

   De uitrol verandert niet: Evan sleept nog steeds de map online/
   naar Netlify. Alleen draait hij er eerst dit script overheen.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const { execSync } = require("child_process");

const WORTEL   = path.join(__dirname, "..");
const SJABLOON = path.join(WORTEL, "src", "index.html");
const APPBRON  = path.join(WORTEL, "src", "app.jsx");
const UITVOER  = path.join(WORTEL, "online", "index.html");
const KERN_MAP    = path.join(WORTEL, "src", "kern");
const DOMEIN_MAP  = path.join(WORTEL, "src", "domein");
const SCHERM_MAP  = path.join(WORTEL, "src", "schermen");

/* Sinds P2 (professionaliseringsplan.md) valt src/app.jsx uiteen in
   losse "kern"-modules onder src/kern/. Geen import/export: elke
   module is gewoon top-level function/const, net als de rest van de
   app, en deze vaste volgorde bepaalt de scope-opbouw vóórdat
   src/app.jsx zelf begint. De volgorde is bewust: elke latere module
   mag functies uit een eerdere gebruiken (gedeelde scope, geen
   import-syntax nodig), dus wie van wie afhangt bepaalt de plek in
   deze lijst. Een module die nog niet bestaat wordt overgeslagen —
   zo werkt bouw.js ook halverwege P2, met drie modules wel en twee
   nog niet geknipt. */
const KERN_VOLGORDE = ["sleutels.js", "server.js", "foutmeldingen.js", "rollen.js", "opslag.js", "sync.js"];

/* Sinds P3 (professionaliseringsplan.md) komt daar een tweede laag
   bovenop: de domeinlogica onder src/domein/ — berekeningen en
   statussen, geen opslag, geen DOM. Dezelfde regel als bij
   KERN_VOLGORDE: geen import/export, gedeelde scope, en de volgorde
   bepaalt wie van wie mag gebruikmaken. Deze modules komen ná de
   kern (boetepot.js gebruikt sleutelVoor() uit src/kern/sleutels.js)
   en vóór src/app.jsx zelf. Een module die nog niet bestaat wordt
   net als bij de kern overgeslagen. */
const DOMEIN_VOLGORDE = ["boetepot.js", "wedstrijden.js", "statistieken.js", "opkomst.js"];

/* Sinds P4 (docs/p4-stappenplan.md) komt daar een derde laag bovenop:
   de schermmodules onder src/schermen/ — de React-componenten van
   src/app.jsx, opgesplitst per scherm. Dezelfde regel als bij KERN_
   en DOMEIN_VOLGORDE: geen import/export, gedeelde scope, en de
   volgorde bepaalt wie van wie mag gebruikmaken (al maakt dat in de
   praktijk voor function-declaraties niets uit door hoisting — zie
   de uitleg bij gedeeld.jsx zelf). "gedeeld.jsx" staat en blijft
   eerst: dat is het enige schermbestand met top-level const-data
   (de tenue-tekendata) die vóór gebruik gedefinieerd moet zijn, in
   tegenstelling tot function-declaraties die overal hoisten. Deze
   modules komen ná de domeinlogica en vóór src/app.jsx zelf (dat na
   alle acht schermstappen alleen nog de schil overhoudt: App,
   renderPagina, zijGroepen, PAKKETTEN, PAGINA_MODULE). Stap 0
   (gedeeld.jsx) is de enige die nu bestaat; de overige acht
   schermmodules komen in latere, aparte stappen. Een module die nog
   niet bestaat wordt net als bij kern en domein overgeslagen, zodat
   dit incrementeel kan groeien zonder dat bouw.js breekt.

   "onboarding.jsx" (P4 stap 1, 17 september 2026) is de tweede
   toevoeging: de kleinste en meest geïsoleerde van de acht
   schermmodules (OnboardingSchil, ServerScherm, AanmeldScherm,
   ClubScherm, TeamScherm) — zie docs/p4-stappenplan.md §1.

   "instellingen.jsx" (P4 stap 2, zelfde dag) is de derde toevoeging:
   isolatie hoog, geen bekende cross-module afhankelijkheid (TeamSheet,
   NieuwSeizoenKaart, PakkettenSheet, TerugSheet, SyncLampje,
   NieuwsBalk, BeheerSheet, AccountSheet, InstellingenSheet) — zie
   docs/p4-stappenplan.md §1, stap 2.

   "statistieken.jsx" (P4 stap 3, zelfde dag) is de vierde toevoeging:
   isolatie hoog (TeamStatistieken, IndividuStatistieken, LiveAnalyse,
   StandTab, StatistiekenModule, StaafGrafiek, LijnGrafiek, RadarGrafiek,
   GrafiekLegenda) — zie docs/p4-stappenplan.md §1, stap 3. De
   opkomst-samenvoeging in IndividuStatistieken (trainPct via
   opkomstVan() uit src/domein/opkomst.js) was al vóór deze stap gedaan;
   die aanroep blijft werken omdat DOMEIN_VOLGORDE hieronder
   src/domein/opkomst.js altijd vóór de schermmodules plakt.

   "spelers.jsx" (P4 stap 5, 17 september 2026) is de zesde toevoeging:
   isolatie middel, de grootste van de drie nieuwe modules (StatInvoer,
   SpelerFormulier, RapportTab, SpelerProfiel, DoelFormulier,
   ReviewFormulier, OntwikkelingTab, SpelersLijst, AfwezigheidFormulier,
   BlessuresTab, BoetepotTab, EigenBoeteToevoegen, BoeteFormulier,
   SelectiePagina, Dashboard, VoetIcoon) — zie docs/p4-stappenplan.md §1,
   stap 5. Twee kruisverwijzingen naar de schil (src/app.jsx) blijven
   werken via gedeelde scope: SelectiePagina roept OpstellingenTab en
   TactiekenTab aan (blijven in app.jsx tot stap 7), en renderPagina()
   in app.jsx roept Dashboard en SelectiePagina hier aan (`case
   "dashboard"`/`case "selectie"`). Geen van beide is een const-
   afhankelijkheid (zie §3 van het stappenplan), dus de bestandsvolgorde
   maakt geen technisch verschil.

   "clubhuis.jsx" (P4 stap 6, zelfde dag) is de zevende toevoeging:
   sportpark, tenue-ontwerper en spelregelquiz (ParkVorm, Spelerkaart,
   HTKBewerken, SpelerkaartTab, QuizTekenveld, SpelregelquizTab,
   TenueVormKnop, TenueOntwerperTab, ClubhuisModule, SportparkDrieD,
   EigenVeldVenster, ParkBewaarPopup, SportparkTab) — zie
   docs/p4-stappenplan.md §1, stap 6. Groter dan die 13 namen: er bleek
   ~3.900 regels exclusief-door-clubhuis-gebruikte hulpcode (het
   spelregelquiz-domein, de sportpark-3D-motor, en de rest van de
   tenue-ontwerpgegevens) tussen en rond die componenten te staan,
   niet met naam genoemd in het stappenplan — zie de bestandskop van
   clubhuis.jsx zelf voor de volledige lijst. Bij dat narekenen bleek
   ook dat gedeeld.jsx (stap 0) al langer op zo'n twintig tenue-
   hulpfuncties leunde die toen niet meeverhuisd waren; die zijn bij
   deze stap alsnog naar gedeeld.jsx verplaatst (zie de bestandskop
   van gedeeld.jsx, onderaan). TenueOntwerperTab roept TenueBeeld drie
   keer aan (blijft in gedeeld.jsx, laadt hiervóór) — werkt via
   gedeelde scope.

   "opstellingen.jsx" (P4 stap 7, zelfde dag) is de achtste en laatste
   toevoeging vóór wedstrijden (stap 8, de schil): opstellingenveld en
   tactiekbord (VeldAchtergrond, TenueStrook, SpelerCircle,
   VeldZoomKnoppen, OpstellingVeld, OpstellingenTab, TactiekTekenBord,
   TactiekenTab, VeldIcoon, FrameMiniatuur, TrainingTekenBord) — zie
   docs/p4-stappenplan.md §1, stap 7, het risicovolste van de negen
   stappen ("de meeste uitgaande afhankelijkheden van alle acht").
   Vier kruisverwijzingen blijven werken via gedeelde scope: TenueStrook
   en VeldZoomKnoppen worden ook door WedstrijdOpstelling gebruikt
   (blijft in app.jsx, stap 8); TrainingTekenBord wordt ook gebruikt
   door WedstrijdTactiek (app.jsx) én driemaal door trainingen.jsx
   (al verplaatst stap 4); en OpstellingVeld — niet met naam genoemd in
   het stappenplan, gevonden bij het narekenen — wordt ook gebruikt
   door WedstrijdOpstelling, WedstrijdTactiek en TegenstanderSectie
   (alle drie in app.jsx). Omgekeerd roept SelectiePagina (spelers.jsx,
   stap 5) op zijn beurt OpstellingenTab/TactiekenTab hier aan — de
   tegenhanger van de kruisverwijzing die spelers.jsx zelf al meldde.
   Groter dan die 11 namen: ~2.750 regels exclusief-door-opstellingen-
   gebruikte tekenbord-hulpcode (zoom, canvas-tekenwerk, materiaal/
   zone-data, video/PDF-export) stond ertussen, niet met naam genoemd
   — zie de bestandskop van opstellingen.jsx voor de volledige lijst.
   Drie stukken die daar fysiek tussenin stonden hoorden niet bij
   opstellingen en zijn bij deze stap alsnog verplaatst: POP_HUID e.a.
   en tenueTeller naar gedeeld.jsx (uitsluitend gebruikt door SpelerPop/
   TenueBeeld, stap 0), en BENEN/beenInfo naar spelers.jsx (uitsluitend
   gebruikt daar, stap 5) — zie de bestandskoppen van gedeeld.jsx en
   spelers.jsx voor de volledige toelichting.

   "wedstrijden.jsx" (P4 stap 8, 18 september 2026) is de negende en
   laatste toevoeging — met deze stap houdt src/app.jsx alleen nog de
   schil over (App, renderPagina, zijGroepen, PAKKETTEN, PAGINA_MODULE),
   plus de bewust nog niet opgeruimde, cross-module gedeelde hulpcode.
   27 met naam genoemde componenten (SpelerKeuzeModal, Kleedkamerbriefje,
   DoelpuntScherm, TegenDoelpuntModal, WisselScherm, UitslagFormulier,
   ToernooiFormulier, ToernooiDetail, ToernooienTab, WedstrijdFormulier,
   ImportSheet, WedstrijdOpstelling, DSMVeldLijnen, DSMLijn, DSMBord,
   DSMSectie, RollenSectie, WedstrijdTactiek, WerkVenster, BewaarMelder,
   UitleenSectie, GastenSectie, TegenstanderSectie, KaartScherm,
   Wedstrijdcentrum, WedstrijdDetail, WedstrijdenModule) — zie
   docs/p4-stappenplan.md §1, stap 8, "grootste en laatste module: 27
   componenten." Groter dan die 27 namen: 30 niet met naam genoemde
   module-exclusieve hulpstukken ertussen (het spelhervattingsbord- en
   tactiekbord-rekenwerk) plus nog eens 24 die fysiek vóór het bereik
   stonden (het programma-importeer-gereedschap, deel-wedstrijd-
   functies, PDF-export, taken/toernooien-opslag, en SPEELDUREN) — zie
   de bestandskop van wedstrijden.jsx voor de volledige lijst. Daarbij
   zijn ook WEDSTRIJD_ROLLEN, VLAG_ROLLEN, TEGEN_TENUE en LEEG_WEDSTRIJD
   meeverhuisd: een P3-comment in src/domein/wedstrijden.js zei dat die
   breder werden gebruikt, wat waar was tot bijna alle P4-modules waren
   verplaatst — nagerekend bleken alle huidige gebruiksplekken binnen
   wedstrijden te liggen, en die comment is bijgewerkt. Ook zijn twee
   eerdere achterstanden ingelopen: de statistieken-achterstand van stap
   3 (exporteerPresentiePDF, hexNaarRgb, ACTIE_CATEGORIEEN, ALLE_ACTIES,
   getActieInfo, VELD_ZONES → statistieken.jsx; vandaagISO bleek bij
   narekenen geen statistieken-gebruiker te hebben en ging naar
   spelers.jsx in plaats daarvan) en de opstellingen-achterstand van
   stap 7 (veldMaten e.a., negen stuks → opstellingen.jsx), plus een
   niet eerder gemelde trainingen-achterstand van stap 4 (deelTraining/
   deelVariantenTraining en het ICS-agendagereedschap, acht stuks →
   trainingen.jsx). Twee kruisverwijzingen blijven werken via gedeelde
   scope, nieuw gevonden bij het narekenen: DSMVeldLijnen (hier) wordt
   aangeroepen door clubhuis.jsx's QuizTekenveld, en WerkVenster (hier)
   door spelers.jsx's RapportTab. Omgekeerd roept deze module
   OpstellingVeld/TenueStrook/VeldZoomKnoppen/TrainingTekenBord
   (opstellingen.jsx) en SpelerStatusRaster (trainingen.jsx) aan, zoals
   die bestanden al vanuit hun kant meldden. */
const SCHERM_VOLGORDE = ["gedeeld.jsx", "onboarding.jsx", "instellingen.jsx", "statistieken.jsx", "trainingen.jsx", "spelers.jsx", "clubhuis.jsx", "opstellingen.jsx", "wedstrijden.jsx"];

/* Het korte git-commitnummer van dit moment, voor de foutrapportage
   (src/kern/foutmeldingen.js, sinds P6). Geen los bestand in src/: er
   is nergens anders in de bron een goede, gedeelde bron voor een
   versienummer (sw.js heeft zijn eigen VERSIE, maar draait in een
   aparte service-worker-scope die niet wordt meegeplakt). "onbekend"
   als git niet beschikbaar is (bijvoorbeeld een kale kopie zonder
   .git-map) — dan blijft foutmeldingen.js's eigen terugval-waarde
   gelden. Dit blijft de build-determinisme-garantie overeind houden:
   zolang je tussen twee builds niet opnieuw committeert, verandert
   deze waarde niet, dus blijven twee builds ná elkaar byte-voor-byte
   gelijk — precies de controle die tools/check.py bij elke wijziging
   uitvoert. */
function huidigeCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: WORTEL }).toString().trim();
  } catch (e) {
    return "onbekend";
  }
}

/* Het merkteken in src/index.html waar de gebouwde app terechtkomt.
   Bewust een commentaarregel en geen los token: zo blijft het sjabloon
   een geldig HTML-bestand dat je in een browser kunt openen zonder dat
   je een syntaxfout in beeld krijgt. */
const MERK = "/* @BOUW:APP@ */";

/* De regel die eruit moet. Staat nog in het sjabloon zodat src/index.html
   regel-voor-regel gelijk is aan de kop van het bestand dat vandaag live
   staat — dat maakt een diff na de bouw leesbaar. Hier gaat hij eruit. */
const BABEL = /^\s*<script src="[^"]*babel-standalone[^"]*"><\/script>\s*$/;

function fout(tekst) {
  console.error("\nBOUW AFGEBROKEN: " + tekst + "\n");
  process.exit(1);
}

async function bouwInGeheugen() {
  for (const p of [SJABLOON, APPBRON]) {
    if (!fs.existsSync(p)) fout("bronbestand ontbreekt: " + p);
  }

  const sjabloonRegels = fs.readFileSync(SJABLOON, "utf8").split("\n");

  /* ── De kern-modules vóór app.jsx plakken ──────────────────────
     Vaste volgorde (KERN_VOLGORDE hierboven), elke module gewoon
     achter elkaar. Geen bundelaar, geen scheidingsteken nodig: het
     is allemaal JS in dezelfde scope, alsof het nooit uit elkaar
     had gelegen. */
  const kernBestanden = KERN_VOLGORDE
    .map((naam) => path.join(KERN_MAP, naam))
    .filter((p) => fs.existsSync(p));
  const kernBron = kernBestanden.map((p) => fs.readFileSync(p, "utf8")).join("\n");
  if (kernBestanden.length) {
    console.log("  · kern-modules meegenomen: " + kernBestanden.map((p) => path.basename(p)).join(", "));
  }

  /* Zelfde plaktruc, nu voor de domeinlogica — ná de kern, vóór
     src/app.jsx, om dezelfde reden als hierboven staat uitgelegd. */
  const domeinBestanden = DOMEIN_VOLGORDE
    .map((naam) => path.join(DOMEIN_MAP, naam))
    .filter((p) => fs.existsSync(p));
  const domeinBron = domeinBestanden.map((p) => fs.readFileSync(p, "utf8")).join("\n");
  if (domeinBestanden.length) {
    console.log("  · domein-modules meegenomen: " + domeinBestanden.map((p) => path.basename(p)).join(", "));
  }

  /* Zelfde plaktruc, nu voor de schermmodules — ná de domeinlogica,
     vóór src/app.jsx zelf. gedeeld.jsx (indien aanwezig) staat door
     SCHERM_VOLGORDE altijd als eerste van de drie, om de reden die
     daar hierboven staat uitgelegd (const-hoisting van de
     tenue-tekendata). */
  const schermBestanden = SCHERM_VOLGORDE
    .map((naam) => path.join(SCHERM_MAP, naam))
    .filter((p) => fs.existsSync(p));
  const schermBron = schermBestanden.map((p) => fs.readFileSync(p, "utf8")).join("\n");
  if (schermBestanden.length) {
    console.log("  · schermmodules meegenomen: " + schermBestanden.map((p) => path.basename(p)).join(", "));
  }

  const versieBron = "const APP_VERSIE = " + JSON.stringify(huidigeCommit()) + ";\n";
  const appBron = versieBron + kernBron + domeinBron + schermBron + fs.readFileSync(APPBRON, "utf8");

  /* ── Babel eruit ────────────────────────────────────────────── */
  const voor = sjabloonRegels.length;
  const zonderBabel = sjabloonRegels.filter((r) => !BABEL.test(r));
  const weg = voor - zonderBabel.length;
  if (weg === 0) console.log("  · babel-standalone stond al niet in het sjabloon");
  else           console.log("  · babel-standalone verwijderd (" + weg + " regel)");

  /* ── JSX vertalen ───────────────────────────────────────────── */
  /* Geen bundle(), maar transform(): ook nu P2 src/app.jsx in kern-
     modules opsplitst, staat er nergens een import of export-regel —
     zie de uitleg bij KERN_VOLGORDE hierboven. Er valt dus nog steeds
     niets "samen te voegen" in de zin die een bundelaar bedoelt, alleen
     achter elkaar te plakken vóór de vertaling. bundle() zou alles
     alsnog in een IIFE wikkelen en élke regel twee spaties inspringen;
     dan staat geen enkele functie meer op kolom 0 en vinden de tests in
     tests/ ze niet meer terug. Dat risico is met het aaneenplakken
     hierboven bewust vermeden, niet toevallig ontweken. */
  const uit = await esbuild.transform(appBron, {
    loader: "jsx",
    jsx: "transform",           /* JSX → React.createElement, net als babel deed */
    minify: false,              /* zie de kop: uitdrukkelijk niet */
    target: "es2019",           /* iPhone 11 / Android 8 halen dit; nieuwer is onnodig risico */
    sourcefile: "src/app.jsx",
    legalComments: "inline",
  });

  for (const w of uit.warnings || []) console.log("  · waarschuwing: " + w.text);

  /* ── In elkaar zetten ───────────────────────────────────────── */
  const heel = zonderBabel.join("\n");
  if (heel.indexOf(MERK) < 0) fout("het merkteken " + MERK + " staat niet in src/index.html");
  if (heel.indexOf(MERK) !== heel.lastIndexOf(MERK)) fout("het merkteken " + MERK + " staat er meer dan één keer in");

  const resultaat = heel.replace(MERK, () => uit.code.replace(/\n$/, ""));

  /* ── Controles op het eindresultaat ─────────────────────────── */
  /* Liever hier hard falen dan een kapot bestand naar Netlify slepen. */
  if (/babel/i.test(resultaat))            fout("er staat nog een verwijzing naar babel in de uitvoer");
  if (/type="text\/babel"/.test(resultaat)) fout("er staat nog een text/babel-scriptblok in de uitvoer");
  if (resultaat.indexOf("</script>") < 0)   fout("de uitvoer bevat geen enkel scriptblok — er is iets grondig mis");
  /* Een </script> binnen de JS-code zou het scriptblok voortijdig sluiten.
     esbuild ontsnapt dit zelf ("<\/script>"), maar controleren is gratis. */
  if (uit.code.indexOf("</script") >= 0)    fout("de gebouwde JS bevat letterlijk </script — dat breekt de pagina");

  const bronRegels = appBron.split("\n").length;
  const uitRegels  = uit.code.split("\n").length;
  return { resultaat, bronRegels, uitRegels };
}

async function bouw() {
  const { resultaat, bronRegels, uitRegels } = await bouwInGeheugen();
  fs.writeFileSync(UITVOER, resultaat);
  console.log("  · JSX vertaald: " + bronRegels + " regels bron → " + uitRegels + " regels JavaScript");
  console.log("  · geschreven:   online/index.html (" + resultaat.split("\n").length + " regels, " +
              Math.round(Buffer.byteLength(resultaat) / 1024) + " kB)");
  console.log("\nKlaar. De map online/ kan naar Netlify.\n");
}

/* Voor check.py: bouwt in het geheugen en vergelijkt met wat er al in
   online/index.html staat, zonder dat bestand aan te raken. Dit vangt
   precies één fout: iemand past src/app.jsx aan en vergeet daarna
   `node tools/bouw.js` te draaien vóór het slepen naar Netlify — dan
   staat er straks een oudere versie live dan wat in de broncode staat,
   zonder dat iets dat meldt. */
async function controleerActueel() {
  const { resultaat } = await bouwInGeheugen();
  if (!fs.existsSync(UITVOER)) fout("online/index.html bestaat niet — draai eerst node tools/bouw.js");
  const huidig = fs.readFileSync(UITVOER, "utf8");
  if (huidig === resultaat) {
    console.log("OK    online/index.html is actueel (komt overeen met src/app.jsx en src/index.html)");
    return true;
  }
  console.log("FOUT  online/index.html komt NIET overeen met wat src/app.jsx en src/index.html nu opleveren.");
  console.log("      Draai: node tools/bouw.js — en sleep pas daarna de map online/ naar Netlify.");
  return false;
}

if (process.argv.includes("--controleer")) {
  controleerActueel().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => {
    fout(String((e && e.message) || e));
  });
} else {
  console.log("\nTEAMTAKKIE bouwen…");
  bouw().catch((e) => {
  /* esbuild geeft bij een syntaxfout een keurige lijst met regelnummers;
     die zijn het waard om helemaal te laten zien in plaats van alleen
     de samenvatting. De regelnummers verwijzen naar src/app.jsx. */
  if (e && e.errors && e.errors.length) {
    console.error("\nBOUW AFGEBROKEN — fout in src/app.jsx:\n");
    for (const f of e.errors) {
      const l = f.location;
      console.error("  " + (l ? l.file + ":" + l.line + ":" + l.column + "  " : "") + f.text);
      if (l && l.lineText) console.error("      " + l.lineText.trim());
    }
    console.error("");
    process.exit(1);
  }
  fout(String((e && e.message) || e));
  });
}
