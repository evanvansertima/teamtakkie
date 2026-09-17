/* ══════════════════════════════════════════════════════════════
   Tests voor de boetepot in src/domein/boetepot.js
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/boetepot.test.js

   Deze test knipt de boetefuncties uit de app zelf en draait ze
   tegen een vaste vulling. Geen testframework, geen
   npm install — node en verder niets.

   Waarom uit het bestand zelf en niet een kopie: een kopie loopt uit
   de pas. Deze test faalt zodra iemand de functies hernoemt, en dat
   is precies wat je wilt weten.

   ── WAT HIER BEWAAKT WORDT ───────────────────────────────────
   Op 12 september 2026 zijn de trainingsboetes verborgen voor Free
   (commit d776ebf). De boetes van een training blijven bestaan en
   blijven meetellen; alleen de régel eronder verdwijnt en wordt
   vervangen door één vergrendelde samenvatting.

   De invariant die daarbij hoort staat in één zin:

     Totaal, betaald en openstaand zijn op Free identiek aan Club.
     Alleen het aantal zichtbare regels verschilt.

   Gaat die zin stuk, dan ziet iemand die terugvalt naar Free zijn
   openstaande boetes dalen. Dat leest als "mijn administratie is
   weg" terwijl er niets weg is, en dat is erger dan het gegeven dat
   we hier proberen af te schermen.

   ── WAAROM DEZE TEST TWEE SOORTEN CONTROLES HEEFT ────────────
   Er zijn twee manieren waarop de invariant kan breken, en ze zijn
   geen van beide met één soort test te vangen:

     1. De functies zelf gaan stuk. Rekent boeteRegelsGesplitst()
        straks wél weg in plaats van samen te vouwen, dan zakken de
        getallen. Dat vang je door de functies echt door te rekenen
        met een vaste vulling — groep 1 t/m 5 hieronder.

     2. De bedrading gaat stuk. De functies kloppen dan nog precies,
        maar BoetepotTab voert ze verkeerd: zichtbareTrainingen()
        in plaats van laadTrainingen(), of boeteStand() over de
        zichtbare lijst in plaats van over alles. Dat is niet aan de
        functies te zien, want ze krijgen gewoon een lijst binnen en
        rekenen die netjes door. Dát is de fout die het meeste kost
        (gemeten: het totaal zakt van € 43,00 naar € 25,50) en die
        is alleen aan de aanroep te zien — groep 6 hieronder.

   Eén soort test dekt dus maar de helft. Vandaar allebei.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

/* Sinds de bouwstap (P1) is src/app.jsx de bron die mensen bewerken en
   is online/index.html wat esbuild daarvan maakt: zonder commentaar,
   met de JSX al vertaald en met eenregelige functies over drie regels
   uitgespreid. Voor déze test telt vooral het commentaar: hieronder
   staat zonderCommentaar(), dat het commentaar juist wegstreept omdat
   BoetepotTab in woorden uitlegt wat er níét gebeurt. Op het gebouwde
   bestand zou die functie niets meer te doen hebben — en dan test hij
   ook niet meer of die uitleg nog klopt.

   Deze test knipt op tekst en beantwoordt daarmee de vraag "heeft
   iemand een functie hernoemd of kapotgemaakt" — een vraag over de
   bron. Of de bóuwstap zelf iets verandert is een andere vraag, en die
   wordt beantwoord waar hij hoort: tools/gouden-origineel.js draait
   het gebouwde online/index.html in een echte browser en vergelijkt de
   DOM en de beeldpunten. */
const APP = path.join(__dirname, "..", "src", "app.jsx");
const regels = fs.readFileSync(APP, "utf8").split("\n");

/* Sinds P3 (professionaliseringsplan.md, 17 september 2026) zijn de
   boetefuncties zelf verhuisd naar src/domein/boetepot.js. Wat in
   app.jsx bleef staan (het pakketblok, parseerDatum, datumCijfers,
   trainingTitel, en het React-component BoetepotTab) wordt nog uit
   `regels` geknipt; de rest uit deze tweede bron. */
const DOMEIN = path.join(__dirname, "..", "src", "domein", "boetepot.js");
const regelsDomein = fs.readFileSync(DOMEIN, "utf8").split("\n");

const zoekIn = (bronRegels, re) => { for (let i = 0; i < bronRegels.length; i++) if (re.test(bronRegels[i])) return i; return -1; };
const eisIn = (bronRegels, bronNaam, re, wat) => {
  const i = zoekIn(bronRegels, re);
  if (i < 0) throw new Error(wat + " niet gevonden in " + bronNaam);
  return i;
};
const zoek = (re) => zoekIn(regels, re);
const eis = (re, wat) => eisIn(regels, "src/app.jsx", re, wat);

/* LICENTIE_KEY zelf is sinds P2 verhuisd naar src/kern/sleutels.js —
   het pakket-blok errond (MODULES, PAKKETTEN, de pakketfuncties)
   bleef in app.jsx staan. Vandaar deze ene aparte knip, uit een
   andere bron dan de rest van dit bestand. */
const SLEUTELS = path.join(__dirname, "..", "src", "kern", "sleutels.js");
const regelsSleutels = fs.readFileSync(SLEUTELS, "utf8").split("\n");
const licentieKeyRegel = (() => {
  const re = /^const LICENTIE_KEY\b/;
  for (const r of regelsSleutels) if (re.test(r)) return r;
  throw new Error("const LICENTIE_KEY niet gevonden in src/kern/sleutels.js");
})();

/* BoetepotTab verhuisde op 17 september 2026 (P4 stap 5,
   docs/p4-stappenplan.md) van app.jsx naar src/schermen/spelers.jsx.
   De bedradingstest hieronder (groep 7) knipt de component daarom uit
   deze aparte bron — zelfde patroon als bij de andere P4-stappen. */
const SPELERS_SCHERM = path.join(__dirname, "..", "src", "schermen", "spelers.jsx");
const regelsSpelersScherm = fs.readFileSync(SPELERS_SCHERM, "utf8").split("\n");

/* Eén functie, van de kop tot de eerste accolade in de eerste kolom. */
function knipFunctieUit(bronRegels, bronNaam, naam) {
  const a = eisIn(bronRegels, bronNaam, new RegExp("^function " + naam + "\\("), "function " + naam);
  let e = a; while (e < bronRegels.length && !/^\}/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knipFunctie(naam) { return knipFunctieUit(regels, "src/app.jsx", naam); }
function knipFunctieDomein(naam) { return knipFunctieUit(regelsDomein, "src/domein/boetepot.js", naam); }
/* Eén const-blok, van de kop tot de regel die met ]; begint. */
function knipConstUit(bronRegels, bronNaam, naam) {
  const a = eisIn(bronRegels, bronNaam, new RegExp("^const " + naam + " = \\["), "const " + naam);
  let e = a; while (e < bronRegels.length && !/^\];/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knipConstDomein(naam) { return knipConstUit(regelsDomein, "src/domein/boetepot.js", naam); }
function knipRegelUit(bronRegels, bronNaam, re, wat) { return bronRegels[eisIn(bronRegels, bronNaam, re, wat)]; }
function knipRegel(re, wat) { return knipRegelUit(regels, "src/app.jsx", re, wat); }
function knipRegelDomein(re, wat) { return knipRegelUit(regelsDomein, "src/domein/boetepot.js", re, wat); }

/* Het pakketblok, zodat magModule() het échte antwoord geeft en niet
   een nagebouwd antwoord. Hetzelfde blok als in pakket.test.js. */
function knipPakketBlok() {
  const a = eis(/^const MODULES = \[/, "const MODULES");
  const b = eis(/^function magNieuwTeam\(\)/, "function magNieuwTeam");
  if (b < a) throw new Error("magNieuwTeam staat vóór MODULES — het blok is verplaatst");
  return regels.slice(a, b + 1).join("\n");
}
/* De broncode van een React-component, voor de bedradingstests.
   Loopt van de kop tot de eerste accolade in de eerste kolom. */
function knipComponentUit(bronRegels, bronNaam, naam) {
  const a = eisIn(bronRegels, bronNaam, new RegExp("^function " + naam + "\\("), "component " + naam);
  let e = a + 1; while (e < bronRegels.length && !/^\}/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knipComponent(naam) { return knipComponentUit(regels, "src/app.jsx", naam); }
function knipComponentSpelers(naam) { return knipComponentUit(regelsSpelersScherm, "src/schermen/spelers.jsx", naam); }

/* Dezelfde code zonder het commentaar erin. Nodig omdat het
   commentaar in BoetepotTab uitlegt wat er NIET gebeurt — er staat
   letterlijk "en niet zichtbareTrainingen()". Een test die op tekst
   zoekt zou daar op afgaan en altijd groen (of altijd rood) staan om
   de verkeerde reden. */
function zonderCommentaar(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/* De argumenten waarmee een functie in dit stuk code wordt aangeroepen. */
function aanroep(code, naam) {
  const i = code.indexOf(naam + "(");
  if (i < 0) return "";
  const rest = code.slice(i);
  const eind = rest.indexOf(");");
  return (eind < 0 ? rest : rest.slice(0, eind + 2)).replace(/\s+/g, " ");
}

/* ── nagebootste browseropslag ─────────────────────────────── */
const kast = {};
global.localStorage = {
  get length() { return Object.keys(kast).length; },
  key: (i) => Object.keys(kast)[i] ?? null,
  getItem: (k) => (k in kast ? kast[k] : null),
  setItem: (k, v) => { kast[k] = String(v); },
  removeItem: (k) => { delete kast[k]; },
};

/* Wat de boetefuncties buiten zichzelf nodig hebben. Alleen dingen
   die met de boetepot niets te maken hebben worden nagebootst; alles
   wat wél met boetes te maken heeft wordt uit de app geknipt. */
var _teams = [];                                     /* voor magNieuwTeam */
function sleutelVoor(basis) { return "test::" + basis; }
function huidigSeizoen() { return "2026-2027"; }
function teamNaamVol() { return "JO19-2"; }
const ONTWERPER = { regel: "— TEAMTAKKIE" };

try {
  eval(
    licentieKeyRegel + "\n" +
    knipPakketBlok() + "\n" +
    knipFunctie("parseerDatum") + "\n" +
    knipFunctie("datumCijfers") + "\n" +
    knipFunctie("trainingTitel") + "\n" +
    knipRegelDomein(/^const BOETETARIEF_KEY\b/, "const BOETETARIEF_KEY") + "\n" +
    knipConstDomein("BOETE_REDENEN") + "\n" +
    knipFunctieDomein("boeteReden") + "\n" +
    knipFunctieDomein("laadBoeteTarieven") + "\n" +
    knipFunctieDomein("boetepotActief") + "\n" +
    knipFunctieDomein("centenNaarTekst") + "\n" +
    knipFunctieDomein("tekstNaarCenten") + "\n" +
    knipFunctieDomein("boeteRegels") + "\n" +
    knipFunctieDomein("boeteRegelsGesplitst") + "\n" +
    knipFunctieDomein("boeteStand") + "\n" +
    knipFunctieDomein("deelBoetepot") + "\n" +
    ";Object.assign(global, {BOETE_REDENEN, LICENTIE_KEY, PAKKETTEN});"
  );
} catch (e) {
  /* Meestal betekent dit: iemand heeft een functie hernoemd of
     verplaatst. Dat is geen kapotte test, dat is de melding. */
  console.log("\nDe boetepot is niet uit src/app.jsx of src/domein/boetepot.js te knippen:");
  console.log("  " + (e && e.message || e));
  console.log("\n0 geslaagd, 1 gefaald");
  process.exit(1);
}

const NAMEN = ["boeteRegels", "boeteRegelsGesplitst", "boeteStand", "boetepotActief",
               "laadBoeteTarieven", "centenNaarTekst", "deelBoetepot", "magModule", "trainingTitel"];
const missen = NAMEN.filter((n) => { try { return typeof eval(n) !== "function"; } catch (e) { return true; } });
if (missen.length) {
  console.log("\nDeze functies staan niet meer waar deze test ze zoekt (src/app.jsx of src/domein/boetepot.js):");
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
/* Voor de val hieronder: twee getallen die júíst niet gelijk mogen zijn. */
const okAnders = (naam, a, b) => {
  const anders = toon(a) !== toon(b);
  anders ? goed++ : fout++;
  console.log(`  ${anders ? "ok  " : "FOUT"} ${naam}` +
    (anders ? "" : `\n        beide    ${toon(a)}  — deze twee horen te verschillen`));
};
const groep = (t) => console.log("\n" + t);
/* Zet het pakket zonder zetPakket() te gebruiken — anders test je de
   ene functie met de andere. */
const opPakket = (id) => { kast[LICENTIE_KEY] = JSON.stringify({pakket: id}); };

/* Staan free en club er eigenlijk nog? Zonder die twee meet deze test
   niets: pakketNu() valt bij een onbekende naam terug op het eerste
   pakket, en dan zijn "free" en "club" stilletjes hetzelfde. */
const ontbreekt = ["free", "club"].filter((i) => !PAKKETTEN.some((p) => p.id === i));
if (ontbreekt.length) {
  console.log("\nDeze pakketten staan niet meer in src/app.jsx: " + ontbreekt.join(", "));
  console.log("Zonder die twee meet deze test twee keer hetzelfde pakket.");
  console.log("\n0 geslaagd, 1 gefaald");
  process.exit(1);
}

/* ══════════════════════════════════════════════════════════════
   DE VASTE VULLING
   Twaalf spelers, drie trainingen, twee wedstrijden, één activiteit,
   één handmatige boete. De bedragen zijn de standaardtarieven uit de
   app: te laat € 2,50 · niet afgemeld € 5,00 · geel € 5,00 ·
   rood € 10,00 · handmatig wat je invult.

   Uitgerekend met de hand, zodat de test niet zijn eigen antwoord
   berekent:

     uit trainingen   3 × te laat (750) + 2 × niet afgemeld (1000) = 1750
     uit kaarten      1 × geel (500) + 1 × rood (1000)             = 1500
     wedstrijdpresentie 1 × niet afgemeld                          =  500
     activiteit       1 × te laat                                  =  250
     handmatig        1 ×                                          =  300
                                                              totaal 4300

   Tien regels, waarvan vijf uit trainingen. Op Free blijven er dus
   vijf regels over en één vergrendelde regel van € 17,50 — precies
   de vorm die op het scherm staat.
   ══════════════════════════════════════════════════════════════ */
const SPELERS = [];
for (let i = 1; i <= 12; i++) SPELERS.push({id: "s" + String(i).padStart(2, "0"), naam: "Speler " + i});

const TRAININGEN = [
  {id: "tr1", datum: "2026-09-15", aanwezigheid: [
    {spelerId: "s02", status: "telaat"}, {spelerId: "s03", status: "geenbericht"},
    {spelerId: "s01", status: "aanwezig"}]},
  {id: "tr2", datum: "2026-09-22", aanwezigheid: [
    {spelerId: "s04", status: "telaat"}, {spelerId: "s05", status: "geenbericht"}]},
  {id: "tr3", datum: "2026-10-06", aanwezigheid: [
    {spelerId: "s06", status: "telaat"}, {spelerId: "s01", status: "ziek"}]}
];
const WEDSTRIJDEN = [
  {id: "w01", datum: "2026-09-12", tegenstander: "VV Nevelmeer", status: "gespeeld",
   kaarten: [{spelerId: "s02", type: "geel", minuut: 55}, {spelerId: "s07", type: "rood", minuut: 80}],
   aanwezigheid: [{spelerId: "s08", status: "geenbericht"}]},
  /* Niet gespeeld: de kaart hieronder mag niets opleveren. */
  {id: "w02", datum: "2026-10-17", tegenstander: "VV Stuifzand", status: "gepland",
   kaarten: [{spelerId: "s09", type: "geel", minuut: 10}], aanwezigheid: []}
];
const ACTIVITEITEN = [
  {id: "ac1", datum: "2026-10-30", titel: "Teamavond",
   aanwezigheid: [{spelerId: "s11", status: "telaat"}]}
];
const HANDMATIG = [
  {id: 1, spelerId: "s12", bedrag: 300, reden: "overig", datum: "2026-10-01", omschrijving: "Telefoon in de kleedkamer"}
];
const BETALINGEN = [
  {id: 1, spelerId: "s02", bedrag: 500,  datum: "2026-10-02"},
  {id: 2, spelerId: "s07", bedrag: 1000, datum: "2026-10-03"}
];

const tarieven = laadBoeteTarieven();
const alles = (pakket) => {
  opPakket(pakket);
  const r = boeteRegels(SPELERS, WEDSTRIJDEN, TRAININGEN, ACTIVITEITEN, HANDMATIG, tarieven, true);
  return {regels: r, stand: boeteStand(SPELERS, r, BETALINGEN), lijst: boeteRegelsGesplitst(r)};
};
const club = alles("club");
const free = alles("free");
const som = (lijst) => lijst.reduce((s, r) => s + r.bedrag, 0);

/* ══ 1. de invariant: de getallen zakken niet ══ */
groep("De invariant — totaal, betaald en openstaand zijn op Free gelijk aan Club");
ok("het totaal is op beide pakketten hetzelfde", free.stand.totaal, club.stand.totaal);
ok("en dat totaal is € 43,00",                   centenNaarTekst(free.stand.totaal), "€ 43,00");
ok("het betaalde bedrag is hetzelfde",           free.stand.betaald, club.stand.betaald);
ok("het openstaande bedrag is hetzelfde",        free.stand.open, club.stand.open);
ok("en dat openstaande bedrag is € 28,00",       centenNaarTekst(free.stand.open), "€ 28,00");
ok("de stand per speler is regel voor regel gelijk",
   free.stand.rijen.map((p) => [p.speler.id, p.verschuldigd, p.betaald, p.open, p.aantal]),
   club.stand.rijen.map((p) => [p.speler.id, p.verschuldigd, p.betaald, p.open, p.aantal]));
ok("er staan negen spelers in de stand",         free.stand.rijen.length, 9);

/* ══ 2. alleen het aantal zichtbare regels verschilt ══ */
groep("Wat er wél verschilt — het aantal regels in de lijst");
ok("de berekening levert tien regels op",        club.regels.length, 10);
ok("Club ziet ze alle tien",                     club.lijst.zichtbaar.length, 10);
ok("Club vouwt niets samen",                     [club.lijst.verborgen, club.lijst.verborgenBedrag], [0, 0]);
ok("Free ziet er vijf",                          free.lijst.zichtbaar.length, 5);
ok("Free vouwt er vijf samen",                   free.lijst.verborgen, 5);
ok("voor € 17,50",                               centenNaarTekst(free.lijst.verborgenBedrag), "€ 17,50");
ok("zichtbaar plus verborgen is het geheel",     free.lijst.zichtbaar.length + free.lijst.verborgen, club.regels.length);
ok("en de bedragen tellen ook op tot het totaal",
   som(free.lijst.zichtbaar) + free.lijst.verborgenBedrag, free.stand.totaal);

/* ══ 3. de val is scherp ══
   Deze twee tests staan er om te bewijzen dat groep 1 iets voorstelt.
   Zou de stand over de zichtbare lijst gaan in plaats van over alles
   — Fenna's zwaarste mutatie — dan zakt het totaal. Blijken deze twee
   getallen ineens gelijk te zijn, dan is de vulling zo veranderd dat
   de invariant niets meer te vangen heeft en is groen hierboven
   waardeloos. */
groep("De val is scherp — filteren in plaats van samenvouwen zou wél kosten");
const standGefilterd = boeteStand(SPELERS, free.lijst.zichtbaar, BETALINGEN);
okAnders("een stand over de zichtbare lijst geeft een ánder totaal",
         standGefilterd.totaal, free.stand.totaal);
ok("en precies het trainingsbedrag lager",
   free.stand.totaal - standGefilterd.totaal, free.lijst.verborgenBedrag);
ok("in geld: € 25,50 in plaats van € 43,00",
   [centenNaarTekst(standGefilterd.totaal), centenNaarTekst(free.stand.totaal)],
   ["€ 25,50", "€ 43,00"]);

/* ══ 4. er lekt geen trainingsgegeven ══ */
groep("Wat Free niet te zien krijgt — geen datum, geen trainingsnaam");
ok("geen zichtbare regel komt uit een training",
   free.lijst.zichtbaar.filter((r) => r.herkomst === "training").length, 0);
ok("en geen zichtbare regel draagt een trainingsnaam",
   free.lijst.zichtbaar.filter((r) => /^Training /.test(r.wat || "")).length, 0);
ok("bij Club staan die namen er wél — anders vangt de test hierboven niets",
   club.lijst.zichtbaar.filter((r) => /^Training /.test(r.wat || "")).length, 5);
ok("de trainingsnaam is die uit de app",
   club.regels.filter((r) => r.herkomst === "training")[0].wat, "Training 06-10-2026");
ok("de vergrendelde regel meldt wat er op het scherm staat",
   free.lijst.verborgen + (free.lijst.verborgen === 1 ? " boete" : " boetes") + " uit trainingen",
   "5 boetes uit trainingen");
ok("met het bedrag erbij",                       centenNaarTekst(free.lijst.verborgenBedrag), "€ 17,50");

/* Eén boete uit een training: dan is het enkelvoud. */
groep("De vergrendelde regel bij precies één boete");
const eenTraining = boeteRegels(SPELERS, [], [TRAININGEN[2]], [], [], tarieven, true);
opPakket("free");
const eenLijst = boeteRegelsGesplitst(eenTraining);
ok("één samengevouwen regel",                    eenLijst.verborgen, 1);
ok("en dan staat er 'boete', niet 'boetes'",
   eenLijst.verborgen + (eenLijst.verborgen === 1 ? " boete" : " boetes") + " uit trainingen",
   "1 boete uit trainingen");

/* ══ 5. het bericht dat je deelt ══ */
groep("Het WhatsApp-bericht — dezelfde getallen als op het scherm");
opPakket("free");
const berichtFree = deelBoetepot(free.stand);
opPakket("club");
const berichtClub = deelBoetepot(club.stand);
ok("het gedeelde bericht is op beide pakketten identiek", berichtFree, berichtClub);
ok("met het totaal erin",   berichtFree.indexOf("Totaal: € 43,00") >= 0, true);
ok("het betaalde bedrag",   berichtFree.indexOf("Betaald: € 15,00") >= 0, true);
ok("en het openstaande",    berichtFree.indexOf("Nog openstaand: € 28,00") >= 0, true);

/* ══ 6. boeteRegels zelf ══ */
groep("boeteRegels — wat er wel en niet beboet wordt");
ok("staat de pot uit, dan wordt er niets berekend",
   boeteRegels(SPELERS, WEDSTRIJDEN, TRAININGEN, ACTIVITEITEN, HANDMATIG, tarieven, false).length, 0);
ok("een gastspeler krijgt geen boete",
   boeteRegels(SPELERS, [], [{id: "tx", datum: "2026-09-15",
     aanwezigheid: [{spelerId: "gast99", status: "geenbericht"}]}], [], [], tarieven, true).length, 0);
ok("een kaart in een wedstrijd die nog niet gespeeld is telt niet",
   club.regels.filter((r) => r.id.indexOf("kw02") === 0).length, 0);
ok("een tarief dat uitstaat levert geen regels op",
   boeteRegels(SPELERS, [], TRAININGEN, [], [], Object.assign({}, tarieven,
     {telaat: {bedrag: 250, aan: false}}), true).length, 2);
ok("een handmatige boete heet 'hand' en blijft dus zichtbaar",
   free.lijst.zichtbaar.filter((r) => r.herkomst === "hand").length, 1);
ok("een boete uit een wedstrijd blijft zichtbaar",
   free.lijst.zichtbaar.filter((r) => r.herkomst === "wedstrijd").length, 3);
ok("een boete uit een activiteit blijft zichtbaar",
   free.lijst.zichtbaar.filter((r) => r.herkomst === "activiteit").length, 1);

/* De kaart heet `type` in de app en niet `soort`. Dit stond fout in
   tools/gouden-origineel/vulling.js: daar bestonden de kaarten alleen
   in schijn. Deze twee tests leggen de veldnaam vast, zodat dezelfde
   vergissing niet nog eens ongemerkt kan. */
groep("De veldnaam van een kaart is `type`");
const metType  = boeteRegels(SPELERS, [{id: "wx", datum: "2026-09-12", status: "gespeeld",
  kaarten: [{spelerId: "s02", type: "geel"}]}], [], [], [], tarieven, true);
const metSoort = boeteRegels(SPELERS, [{id: "wx", datum: "2026-09-12", status: "gespeeld",
  kaarten: [{spelerId: "s02", soort: "geel"}]}], [], [], [], tarieven, true);
ok("{type:'geel'} levert een boete van € 5,00 op",
   [metType.length, centenNaarTekst(som(metType))], [1, "€ 5,00"]);
ok("{soort:'geel'} levert niets op — die kaart bestaat niet", metSoort.length, 0);

/* ══════════════════════════════════════════════════════════════
   7. DE BEDRADING IN BoetepotTab
   Alles hierboven kan groen staan terwijl het scherm het toch fout
   doet, want deze functies weten niet wie ze aanroept. Daarom wordt
   hieronder de broncode van BoetepotTab zelf gelezen.

   Dat is met opzet streng op tekst. Hernoemt iemand laadTrainingen(),
   dan wordt deze test rood — en dat is de bedoeling: bij een
   hernoeming moet iemand hier kijken.
   ══════════════════════════════════════════════════════════════ */
groep("De bedrading in BoetepotTab — de berekening loopt over álle trainingen");
const TAB = zonderCommentaar(knipComponentSpelers("BoetepotTab"));
ok("BoetepotTab geeft laadTrainingen() door aan boeteRegels()",
   /laadTrainingen\(\)/.test(aanroep(TAB, "boeteRegels")), true);
ok("en roept zichtbareTrainingen() nergens aan",
   /zichtbareTrainingen/.test(TAB), false);
ok("boeteStand() krijgt de volle lijst, niet de zichtbare",
   aanroep(TAB, "boeteStand"), "boeteStand(spelers, regels, betalingen);");
ok("en het gedeelde bericht rekent over diezelfde stand",
   /deelBoetepot\(\s*stand\s*\)/.test(TAB), true);
ok("de lijst op het scherm is de zichtbare helft",
   /lijst\.zichtbaar/.test(TAB), true);
ok("en de vergrendelde regel leest verborgen en verborgenBedrag",
   [/lijst\.verborgen\b/.test(TAB), /lijst\.verborgenBedrag/.test(TAB)], [true, true]);

groep("Wie stelt de pakketvraag — en wie niet");
const BRON_REGELS    = zonderCommentaar(knipFunctieDomein("boeteRegels"));
const BRON_GESPLITST = zonderCommentaar(knipFunctieDomein("boeteRegelsGesplitst"));
const BRON_STAND     = zonderCommentaar(knipFunctieDomein("boeteStand"));
ok("boeteRegels() vraagt zelf niet naar het pakket",
   /magModule|magPagina|pakketNu/.test(BRON_REGELS), false);
ok("boeteStand() ook niet",
   /magModule|magPagina|pakketNu/.test(BRON_STAND), false);
ok("boeteRegelsGesplitst() doet dat wél — daar hoort de vraag thuis",
   /magModule\(\s*["']trainingen["']\s*\)/.test(BRON_GESPLITST), true);
ok("en boeteRegelsGesplitst() vouwt samen in plaats van weg te gooien",
   [/verborgenBedrag/.test(BRON_GESPLITST), /zichtbaar/.test(BRON_GESPLITST)], [true, true]);

/* ── uitslag ────────────────────────────────────────────────── */
console.log("\n" + goed + " geslaagd, " + fout + " gefaald");
process.exit(fout ? 1 : 0);
