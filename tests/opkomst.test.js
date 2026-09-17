/* ══════════════════════════════════════════════════════════════
   Tests voor de opkomstberekeningen in src/domein/opkomst.js
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/opkomst.test.js

   Deze test knipt de functies uit de app zelf (geen kopie) en
   draait ze tegen vaste, met de hand uitgerekende vulling. Geen
   testframework, geen npm install — node en verder niets.

   ── WAAROM DEZE TEST ANDERS IS DAN DE ANDERE DOMEINTESTS ─────
   De andere P3-tests (boetepot, wedstrijden, statistieken) leggen
   vast dat één verhuisde berekening blijft werken zoals hij werkte.
   Deze test moet dat ook, maar heeft er nog een taak bij: de app
   rekent opkomst vandaag op VIJF verschillende, het NIET met elkaar
   eens zijnde manieren uit:

     1. opkomstVan          — src/domein/opkomst.js (deze verhuizing)
        Kijkt alleen naar trainingen. Een training zonder ingevulde
        presentielijst levert null op en telt nergens in mee.
     2. presentieTabel      — src/domein/opkomst.js (deze verhuizing)
        Kijkt over trainingen, wedstrijden én activiteiten heen.
     3. trainPct            — inline in IndividuStatistieken,
        src/app.jsx. Telt een training zonder ingevulde presentie-
        lijst gewoon mee in de noemer (trainingen.length).
     4. de inline berekening in spelerInzichten — sinds P3 stap 3 in
        src/domein/statistieken.js. Telt alleen trainingen mee waar
        deze speler ÜBERHAUPT een presentieregel heeft (aanwezig of
        niet), ongeacht ingevulde-lijst-lengte van de héle training.
     5. het inline opkomst-blokje in het Dashboard — src/app.jsx,
        niet hier getest (geen losse functie om te knippen; het
        dashboardblokje rekent inline in de component zelf).

   Dat is geen bug die je hier stilletjes repareert: het is de
   aanleiding voor een latere, aparte samenvoegingsstap. Vóór die
   stap moet er een vangnet staan dat het HUIDIGE (inconsistente)
   gedrag van alle vijf vastlegt — anders is achteraf niet te bewijzen
   of de samenvoeging het gedrag verandert of niet. Vandaar dat deze
   test niet alleen "klopt opkomstVan nog" test, maar er zorg voor
   draagt dat trainPct en de statistieken.js-variant NIET stiekem
   hetzelfde antwoord beginnen te geven als opkomstVan — dat zou
   namelijk betekenen dat iemand de samenvoeging al half heeft gedaan
   zonder dat er over nagedacht is.

   Dit is stap 4 van docs/professionaliseringsplan.md (P3), de laatste
   van de vier veilige stappen. De samenvoeging zelf komt hierna, apart.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

/* Zelfde reden als in de andere P3-tests: knippen uit de bron, niet
   uit een kopie, zodat hernoemen of verplaatsen deze test rood maakt
   in plaats van hem stilletjes te laten liegen. */
const APP = path.join(__dirname, "..", "src", "app.jsx");
const regels = fs.readFileSync(APP, "utf8").split("\n");

/* De opkomstfuncties zelf (opkomstVan, presentieTabel en hun
   rechtstreekse hulpfuncties) zijn sinds P3 stap 4 verhuisd naar
   src/domein/opkomst.js. */
const OPKOMST = path.join(__dirname, "..", "src", "domein", "opkomst.js");
const regelsOpkomst = fs.readFileSync(OPKOMST, "utf8").split("\n");

/* De vierde variant (spelerInzichten) zit sinds P3 stap 3 in
   src/domein/statistieken.js. */
const STATISTIEKEN = path.join(__dirname, "..", "src", "domein", "statistieken.js");
const regelsStatistieken = fs.readFileSync(STATISTIEKEN, "utf8").split("\n");

const zoekIn = (bronRegels, re) => { for (let i = 0; i < bronRegels.length; i++) if (re.test(bronRegels[i])) return i; return -1; };
const eisIn = (bronRegels, bronNaam, re, wat) => {
  const i = zoekIn(bronRegels, re);
  if (i < 0) throw new Error(wat + " niet gevonden in " + bronNaam);
  return i;
};
const eis = (re, wat) => eisIn(regels, "src/app.jsx", re, wat);

/* Eén functie, van de kop tot de eerste accolade in de eerste kolom. */
function knipFunctieUit(bronRegels, bronNaam, naam) {
  const a = eisIn(bronRegels, bronNaam, new RegExp("^function " + naam + "\\("), "function " + naam);
  let e = a; while (e < bronRegels.length && !/^\}/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knipFunctie(naam) { return knipFunctieUit(regels, "src/app.jsx", naam); }
function knipFunctieOpkomst(naam) { return knipFunctieUit(regelsOpkomst, "src/domein/opkomst.js", naam); }

/* Eén const-blok, van de kop tot de regel die met ]; begint. */
function knipConstUit(bronRegels, bronNaam, naam) {
  const a = eisIn(bronRegels, bronNaam, new RegExp("^const " + naam + " = \\["), "const " + naam);
  let e = a; while (e < bronRegels.length && !/^\];/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knipConst(naam) { return knipConstUit(regels, "src/app.jsx", naam); }
function knipConstOpkomst(naam) { return knipConstUit(regelsOpkomst, "src/domein/opkomst.js", naam); }

/* Twee losse regels bij elkaar zoeken op tekst — voor trainPct, dat
   inline in een groot React-component zit (IndividuStatistieken) en
   dus niet als functie te knippen is. Zelfde soort truc als
   SELECTIE_TABS in tests/pakket.test.js: exact de rekenregels
   knippen in plaats van de hele component na te bouwen. */
function knipRegel(re, wat) { return regels[eis(re, wat)]; }

/* Eén blok binnen een grotere functie, van een gegeven startregel tot
   de eerstvolgende regel die precies "  }" is (twee spaties, dan de
   sluitende accolade — de inspringing van het if-blok eromheen). Voor
   het trainingsopkomst-stukje in spelerInzichten, dat net als trainPct
   geen eigen functie heeft. */
function knipBlokUit(bronRegels, bronNaam, startRe, wat) {
  const a = eisIn(bronRegels, bronNaam, startRe, wat);
  let e = a + 1;
  while (e < bronRegels.length && bronRegels[e] !== "  }") e++;
  if (e >= bronRegels.length) throw new Error("sluitende '  }' niet gevonden voor " + wat + " in " + bronNaam);
  return bronRegels.slice(a, e + 1).join("\n");
}

/* ── nagebootste omgeving ──────────────────────────────────────
   sorteerOpLinie (linie-sortering van spelers) leeft sinds stap 3 in
   src/domein/statistieken.js, maar hangt zelf weer af van
   POSITIECODE_NAAR_ROL/ROL_VOLGORDE — grote schermdata die met
   opkomst niets te maken heeft. Net als sleutelVoor/huidigSeizoen in
   tests/boetepot.test.js wordt hij hier vervangen door een simpele
   nabootsing: presentieTabel roept hem alleen aan om de rijen te
   ordenen, niet om te tellen, dus de volgorde doet voor déze test
   niet ter zake. */
function sorteerOpLinie(lijst) { return lijst.slice(); }
/* teltAlsAanwezig() en dus opkomstVan() hebben geen mening over
   spelStatus; alleen presentieUitOpstelling() (via presentieGebeurtenissen,
   voor wedstrijden zonder eigen aanwezigheidslijst) leest hem. */
function voeg() { /* spelerInzichten's inzicht-berichten zijn hier niet het onderwerp */ }

try {
  eval(
    knipFunctie("parseerDatum") + "\n" +
    knipFunctie("datumCijfers") + "\n" +
    knipFunctie("trainingTitel") + "\n" +
    knipConst("ACTIVITEIT_SOORTEN") + "\n" +
    knipFunctie("activiteitSoort") + "\n" +
    knipConstOpkomst("AANWEZIG_KEUZES") + "\n" +
    knipFunctieOpkomst("aanwezigInfo") + "\n" +
    knipFunctieOpkomst("teltAlsAanwezig") + "\n" +
    knipFunctieOpkomst("opkomstVan") + "\n" +
    knipConstOpkomst("AFWEZIGHEID_SOORTEN") + "\n" +
    knipFunctieOpkomst("afwezigheidSoort") + "\n" +
    knipFunctieOpkomst("afwezigheidTeltMee") + "\n" +
    knipFunctieOpkomst("inAfwezigheid") + "\n" +
    knipFunctieOpkomst("afwezigheidOp") + "\n" +
    knipFunctieOpkomst("presentieUitOpstelling") + "\n" +
    knipFunctieOpkomst("presentieGebeurtenissen") + "\n" +
    knipFunctieOpkomst("presentieTabel") + "\n" +
    ";Object.assign(global, {AANWEZIG_KEUZES, AFWEZIGHEID_SOORTEN});"
  );

  /* trainPct — twee losse regels, inline in IndividuStatistieken
     (src/app.jsx). Ongewijzigd overgenomen en verpakt in een functie
     die dezelfde `sp` en `trainingen` als parameter neemt, zodat de
     rekenregels zelf letterlijk hetzelfde blijven als in de app. */
  const TRAINPCT_AANW = knipRegel(/^\s*const trainAanw = trainingen\.filter/, "de trainAanw-regel van trainPct");
  const TRAINPCT_PCT  = knipRegel(/^\s*const trainPct\s*=\s*trainingen\.length>0/, "de trainPct-regel van trainPct");
  eval(
    "global.trainPctBerekening = function(trainingen, sp) {\n" +
    TRAINPCT_AANW + "\n" + TRAINPCT_PCT + "\n" +
    "return trainPct;\n};"
  );

  /* De vierde variant: het trainingsopkomst-blokje uit spelerInzichten
     (src/domein/statistieken.js). Ongewijzigd overgenomen, inclusief
     de if (metOpkomst.length >= 4)-drempel die in de app ook geldt —
     onder die drempel toont de app helemaal geen inzicht, en dat is
     hier net zo goed onderdeel van "hoe deze variant zich gedraagt". */
  const INZICHT_BLOK = knipBlokUit(regelsStatistieken, "src/domein/statistieken.js",
    /^\s*\/\* 6\. trainingsopkomst \*\/\s*$/, "het trainingsopkomst-blokje in spelerInzichten");
  eval(
    "global.trainingsopkomstBerekening = function(trainingen, speler) {\n" +
    INZICHT_BLOK + "\n" +
    "return {metOpkomst: metOpkomst, aanw: (typeof aanw!=='undefined'?aanw:null), pct: (typeof pct!=='undefined'?pct:null)};\n};"
  );
} catch (e) {
  console.log("\nDe opkomstberekeningen zijn niet uit src/app.jsx, src/domein/opkomst.js of");
  console.log("src/domein/statistieken.js te knippen:");
  console.log("  " + (e && e.message || e));
  console.log("\n0 geslaagd, 1 gefaald");
  process.exit(1);
}

const NAMEN = ["opkomstVan", "presentieTabel", "presentieGebeurtenissen", "teltAlsAanwezig",
               "afwezigheidOp", "afwezigheidTeltMee", "afwezigheidSoort", "trainPctBerekening",
               "trainingsopkomstBerekening"];
const missen = NAMEN.filter((n) => { try { return typeof eval(n) !== "function"; } catch (e) { return true; } });
if (missen.length) {
  console.log("\nDeze functies staan niet meer waar deze test ze zoekt:");
  missen.forEach((n) => console.log("  - " + n + "  (hernoemd? verplaatst?)"));
  console.log("\n0 geslaagd, " + missen.length + " gefaald");
  process.exit(1);
}

/* ── minimale testhulp ─────────────────────────────────────── */
let goed = 0, fout = 0;
const toon = (v) => JSON.stringify(v);
const ok = (naam, echt, verwacht) => {
  const gelijk = toon(echt) === toon(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${toon(echt)}\n        verwacht ${toon(verwacht)}`));
};
/* Voor de vallen hieronder: twee uitkomsten die júíst niet gelijk mogen zijn. */
const okAnders = (naam, a, b) => {
  const anders = toon(a) !== toon(b);
  anders ? goed++ : fout++;
  console.log(`  ${anders ? "ok  " : "FOUT"} ${naam}` +
    (anders ? "" : `\n        beide    ${toon(a)}  — deze twee horen te verschillen`));
};
const groep = (t) => console.log("\n" + t);

/* ══════════════════════════════════════════════════════════════
   (a) opkomstVan en langdurige afwezigheid
   Vier spelers op één training, 15 september 2026:
     s01  geenbericht,  geen afwezigheidsperiode
     s02  aanwezig
     s03  geblesseerd,  MET een periode "blessure" (noemer:false)
     s04  geenbericht,  MET een periode "vakantie" (noemer:true)
   Met de hand uitgerekend:
     s01 telt niet als aanwezig, maar telt wél mee in de noemer (geen
         periode van toepassing) — tot 1, aanw 0
     s02 telt mee als aanwezig                    — tot 2, aanw 1
     s03 valt buiten teller ÉN noemer (blessure telt niet mee)
     s04 telt niet als aanwezig, maar zit in een periode die WEL
         meetelt (vakantie) — dus precies als s01: tot 3, aanw 1
   Totaal: aanwezig 1, totaal 3, pct round(1/3*100) = 33.
   ══════════════════════════════════════════════════════════════ */
groep("(a) opkomstVan — een niet-meetellende afwezigheidsperiode sluit uit, een wél-meetellende telt als afwezig");

const TRAINING_A = {id: "ta1", datum: "2026-09-15", aanwezigheid: [
  {spelerId: "s01", status: "geenbericht"},
  {spelerId: "s02", status: "aanwezig"},
  {spelerId: "s03", status: "geblesseerd"},
  {spelerId: "s04", status: "geenbericht"}
]};
const AFWEZIGHEDEN_A = [
  {id: 1, spelerId: "s03", soort: "blessure", vanaf: "2026-09-01", tot: "2026-09-30"},
  {id: 2, spelerId: "s04", soort: "vakantie", vanaf: "2026-09-01", tot: "2026-09-30"}
];

ok("s03 zit in een periode die niet meetelt",
   afwezigheidTeltMee(afwezigheidOp(AFWEZIGHEDEN_A, "s03", "2026-09-15")), false);
ok("s04 zit in een periode die wél meetelt",
   afwezigheidTeltMee(afwezigheidOp(AFWEZIGHEDEN_A, "s04", "2026-09-15")), true);
ok("opkomstVan sluit s03 uit van teller én noemer, en telt s04 als afwezig",
   opkomstVan(TRAINING_A, AFWEZIGHEDEN_A), {aanwezig: 1, totaal: 3, pct: 33});

/* ══════════════════════════════════════════════════════════════
   (b) opkomstVan zonder presentieregels
   ══════════════════════════════════════════════════════════════ */
groep("(b) opkomstVan — een training zonder presentielijst geeft null, niet 0%");
ok("lege aanwezigheidslijst geeft null",
   opkomstVan({id: "tb1", datum: "2026-09-15", aanwezigheid: []}, []), null);
ok("ontbrekend aanwezigheid-veld geeft ook null",
   opkomstVan({id: "tb2", datum: "2026-09-15"}, []), null);

/* ══════════════════════════════════════════════════════════════
   (c) presentieTabel neemt wedstrijden en activiteiten mee,
       opkomstVan alleen trainingen — een concreet verschil.
   Speler s02 is aanwezig bij precies één training, één (gespeelde)
   wedstrijd en één activiteit, alle drie op andere datums.
   ══════════════════════════════════════════════════════════════ */
groep("(c) presentieTabel telt over alle soorten heen, opkomstVan alleen over trainingen");

const SPELERS_C = [{id: "s01", naam: "Speler Een"}, {id: "s02", naam: "Speler Twee"}];
const TRAINING_C = {id: "tc1", datum: "2026-09-01", aanwezigheid: [{spelerId: "s02", status: "aanwezig"}]};
const WEDSTRIJD_C = {id: "wc1", datum: "2026-09-08", status: "gespeeld", tegenstander: "VV Testland",
  thuis: true, aanwezigheid: [{spelerId: "s02", status: "telaat"}]};
const ACTIVITEIT_C = {id: "ac1", datum: "2026-09-15", titel: "Teamavond", soort: "overig",
  aanwezigheid: [{spelerId: "s02", status: "aanwezig"}]};

const GEBEURTENISSEN_C = presentieGebeurtenissen([WEDSTRIJD_C], [TRAINING_C], [ACTIVITEIT_C]);
ok("er zijn drie gebeurtenissen: training, wedstrijd én activiteit",
   GEBEURTENISSEN_C.map((g) => g.soort), ["training", "wedstrijd", "activiteit"]);

const TABEL_C = presentieTabel(SPELERS_C, GEBEURTENISSEN_C, []);
const rijS02 = TABEL_C.rijen.filter((r) => r.speler.id === "s02")[0];
ok("presentieTabel telt s02 mee bij alle drie de gebeurtenissen",
   rijS02.meegedaan, 3);

const OPKOMST_C = opkomstVan(TRAINING_C, []);
ok("opkomstVan ziet alleen de training, dus totaal 1",
   OPKOMST_C, {aanwezig: 1, totaal: 1, pct: 100});
okAnders("presentieTabel (3 gebeurtenissen) en opkomstVan (1 training) meten dus iets anders",
   rijS02.meegedaan, OPKOMST_C.totaal);

/* ══════════════════════════════════════════════════════════════
   (d) trainPct (IndividuStatistieken, app.jsx) telt een training
       zonder ingevulde presentielijst gewoon mee in de noemer;
       opkomstVan negeert zo'n training (geeft er null voor).
   Dezelfde speler, dezelfde vier trainingen — d3 heeft geen enkele
   presentieregel (niemand is voor die avond ingevuld).
   ══════════════════════════════════════════════════════════════ */
groep("(d) trainPct vs. opkomstVan — een training zonder presentielijst telt bij trainPct wél mee in de noemer");

const SP_D = {id: "s01"};
const TRAININGEN_D = [
  {id: "d1", datum: "2026-09-01", aanwezigheid: [{spelerId: "s01", status: "aanwezig"}]},
  {id: "d2", datum: "2026-09-08", aanwezigheid: [{spelerId: "s01", status: "aanwezig"}]},
  {id: "d3", datum: "2026-09-15", aanwezigheid: []},
  {id: "d4", datum: "2026-09-22", aanwezigheid: [{spelerId: "s01", status: "aanwezig"}]}
];

ok("opkomstVan geeft null voor d3, de training zonder presentielijst",
   opkomstVan(TRAININGEN_D[2], []), null);

/* trainPct in de app rekent over trainingen.length — inclusief d3,
   ook al zegt d3 niets over deze speler. */
const TRAINPCT_D = trainPctBerekening(TRAININGEN_D, SP_D);
ok("trainPct telt d3 mee in de noemer: 3 van de 4 trainingen bijgewoond, dus 75%",
   TRAINPCT_D, 75);

/* Het opkomstVan-equivalent van "hoe vaak was hij er": som alleen de
   trainingen op waar opkomstVan iets over kan zeggen (d1, d2, d4) —
   d3 valt buiten de telling in plaats van als gemist te tellen. */
const NIET_NULL_D = TRAININGEN_D.map((t) => opkomstVan(t, [])).filter((r) => r !== null);
const AANWEZIG_D = NIET_NULL_D.reduce((s, r) => s + r.aanwezig, 0);
const TOTAAL_D = NIET_NULL_D.reduce((s, r) => s + r.totaal, 0);
const OPKOMSTVAN_PCT_D = Math.round(AANWEZIG_D / TOTAAL_D * 100);
ok("opkomstVan-gebaseerd (d3 buiten beschouwing): 3 van de 3 meetellende trainingen, dus 100%",
   OPKOMSTVAN_PCT_D, 100);
okAnders("trainPct (75%, noemer 4) en de opkomstVan-optelling (100%, noemer 3) geven dus een ander percentage",
   TRAINPCT_D, OPKOMSTVAN_PCT_D);

/* ── bonus: de vierde variant (spelerInzichten) trekt hier dezelfde
   conclusie als opkomstVan, niet dezelfde als trainPct — nóg een
   concreet verschil tussen de vijf, met een eigen dataset omdat de
   app pas vanaf vier "geraakte" trainingen iets teruggeeft. ── */
groep("(d, vervolg) de statistieken.js-variant (spelerInzichten) sluit een lege training ook uit — net als opkomstVan, anders dan trainPct");

const SPELER_E = {id: "s01", naam: "Speler Een"};
const TRAININGEN_E = [
  {id: "e1", datum: "2026-09-01", aanwezigheid: [{spelerId: "s01", status: "aanwezig"}]},
  {id: "e2", datum: "2026-09-08", aanwezigheid: [{spelerId: "s01", status: "aanwezig"}]},
  {id: "e3", datum: "2026-09-15", aanwezigheid: [{spelerId: "s01", status: "aanwezig"}]},
  {id: "e4", datum: "2026-09-22", aanwezigheid: [{spelerId: "s01", status: "aanwezig"}]},
  {id: "e5", datum: "2026-09-29", aanwezigheid: []}
];
const INZICHT_E = trainingsopkomstBerekening(TRAININGEN_E, SPELER_E);
ok("spelerInzichten telt e5 niet mee: metOpkomst bevat 4 trainingen, niet 5",
   INZICHT_E.metOpkomst.length, 4);
ok("en komt daarmee op 100%, want alle 4 meetellende trainingen zijn bijgewoond",
   INZICHT_E.pct, 100);
const TRAINPCT_E = trainPctBerekening(TRAININGEN_E, SP_D);
ok("trainPct op dezelfde vulling telt e5 wél mee in de noemer: 4 van de 5, dus 80%",
   TRAINPCT_E, 80);
okAnders("spelerInzichten (100%) en trainPct (80%) verschillen dus ook hier",
   INZICHT_E.pct, TRAINPCT_E);

/* ── uitslag ────────────────────────────────────────────────── */
console.log("\n" + goed + " geslaagd, " + fout + " gefaald");
process.exit(fout ? 1 : 0);
