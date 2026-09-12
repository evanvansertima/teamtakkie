/* ══════════════════════════════════════════════════════════════
   Tests voor de pakketlaag (entitlements) in online/index.html
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/pakket.test.js

   Deze test knipt MODULES, PAKKETTEN, PAGINA_MODULE en de zes
   pakketfuncties uit de app zelf en draait ze tegen een nagebootste
   localStorage. Geen bouwstap, geen testframework, geen npm install
   — node en verder niets.

   Waarom uit het bestand zelf en niet een kopie: een kopie loopt uit
   de pas. Deze test faalt zodra iemand de functies hernoemt, en dat
   is precies wat je wilt weten.

   ── HERZIEN OP 11 SEPTEMBER 2026 ─────────────────────────────
   Bron: docs/pakketten-besluit.md. Dat document is leidend; loopt
   deze test ermee uit de pas, dan wint het document.

   Er zijn geen vier pakketten meer maar drie:

     | Pakket | Teams      | Schermen                              |
     |--------|------------|---------------------------------------|
     | free   | 1          | dashboard, selectie, wedstrijden,     |
     |        |            | agenda                                |
     | coach  | 1          | alles                                 |
     | club   | onbeperkt  | alles                                 |

   Twee dingen verschuiven daarbij, en die staan hieronder allebei
   apart als test:

     1. Agenda gaat van de module "trainingen" naar de basis. De regel
        agenda:"trainingen" in PAGINA_MODULE verdwijnt; dan valt agenda
        vanzelf terug op de basis en krijgt Free hem erbij.
     2. Ontwikkeling is betaald, maar is géén scherm. Het is een
        tabblad, en het staat niet eens rechtstreeks op Selectie —
        zie de groep "waar het tabblad Ontwikkeling staat" onderaan.

   ── DE UITSLAG HEEFT DRIE GETALLEN, GEEN TWEE ────────────────
   Er staat onderaan niet alleen "geslaagd" en "gefaald", maar ook
   "niet te meten". Dat derde getal is er om één reden, en die reden
   is bij het herzien van deze test bijna misgegaan:

   Zet je het apparaat op "coach" terwijl dat pakket nog niet in de app
   staat, dan valt pakketNu() terug op het laatste pakket in de rij —
   vandaag max, en die mag alles. Een test als "coach mag bij analyse"
   staat dan groen, maar hij heeft max gemeten en niet coach. Vijftien
   tests stonden in de eerste opzet zo groen om de verkeerde reden.
   Zulke tests worden nu overgeslagen en apart geteld; ze doen vanzelf
   mee zodra het pakket bestaat, en dán is groen ook echt groen.

   ┌─────────────────────────────────────────────────────────────┐
   │ ROOD BETEKENT HIER WEER GEWOON: ER IS IETS STUK.            │
   │                                                             │
   │ Tot 12 september stond er een merkteken [ROOD] voor de acht │
   │ tests die op het slot wachtten. Zolang dat merkteken er     │
   │ stond, werd een falende test altijd geëxcuseerd: hij telde  │
   │ niet mee als onverwacht rood. Dat klopte toen -- het slot   │
   │ was nog niet gebouwd -- maar het is nu een gat: breekt      │
   │ iemand het slot, dan zouden die acht tests rood worden en   │
   │ tóch als "verwacht" geteld worden.                          │
   │                                                             │
   │ Het slot is gebouwd (commit 5dbc94f) en alle acht staan     │
   │ groen. De merktekens zijn daarom weggehaald. Gaat een van   │
   │ deze tests nu rood, dan is dat een echte regressie.         │
   │                                                             │
   │ ── [WACHT] blijft wél bestaan ──────────────────────────────│
   │ Dat merkteken hoort bij iets anders: een test die niet te   │
   │ méten is omdat het pakket nog niet in de app staat. Zo'n    │
   │ test wordt overgeslagen en apart geteld, niet geëxcuseerd.  │
   │ Dat onderscheid is de reden dat de uitslag drie getallen    │
   │ heeft in plaats van twee.                                   │
   └─────────────────────────────────────────────────────────────┘
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const APP = path.join(__dirname, "..", "online", "index.html");
const bron = fs.readFileSync(APP, "utf8");
const regels = bron.split("\n");

const zoek = (re) => { for (let i = 0; i < regels.length; i++) if (re.test(regels[i])) return i; return -1; };
const eis = (re, wat) => { const i = zoek(re); if (i < 0) throw new Error(wat + " niet gevonden in online/index.html"); return i; };

/* Eén regel uit de app (de sleutelnaam staat los van het blok) */
function knipRegel(re, wat) { return regels[eis(re, wat)]; }

/* Het blok van const MODULES t/m het einde van magNieuwTeam */
function knipBlok() {
  const a = eis(/^const MODULES = \[/, "const MODULES");
  const b = eis(/^function magNieuwTeam\(\)/, "function magNieuwTeam");
  if (b < a) throw new Error("magNieuwTeam staat vóór MODULES — het blok is verplaatst");
  return regels.slice(a, b + 1).join("\n");
}

/* De broncode van één functie, voor de structurele tests */
function knipFunctie(naam) {
  const a = eis(new RegExp("^function " + naam + "\\("), "function " + naam);
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}

/* Een stuk van het bestand tussen twee ankers */
function knipGebied(startRe, eindRe, wat) {
  const a = eis(startRe, wat);
  let e = a + 1; while (e < regels.length && !eindRe.test(regels[e])) e++;
  return regels.slice(a, Math.min(e + 1, regels.length)).join("\n");
}

/* Het <nav>-blok waarin een menu daadwerkelijk wordt uitgetekend,
   plus elke regel die het menu bij naam noemt. Daar hoort het zeven
   te gebeuren — niet bij de lijst zelf, want die is maar een lijst. */
function knipNavRondom(naam) {
  /* het gebruik, niet de definitie — en bewust niet vastgepind op
     ".map(", want een filter ervoor zetten is juist de reparatie */
  const def = new RegExp("^const " + naam + " = \\[");
  let i = -1;
  for (let k = 0; k < regels.length; k++)
    if (new RegExp("\\b" + naam + "\\b").test(regels[k]) && !def.test(regels[k])) { i = k; break; }
  if (i < 0) throw new Error(naam + " wordt nergens gebruikt in online/index.html");
  let a = i; while (a > 0 && !/<nav[ >]/.test(regels[a])) a--;
  let e = i; while (e < regels.length && !/<\/nav>/.test(regels[e])) e++;
  const blok = regels.slice(a, Math.min(e + 1, regels.length));
  const noemt = regels.filter((r) => new RegExp("\\b" + naam + "\\b").test(r));
  return blok.concat(noemt).join("\n");
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

/* magNieuwTeam leest de teamlijst van het apparaat */
var _teams = [];

/* const in een eval lekt niet naar buiten; de functies eronder zien
   hem wel. Daarom wordt hij er aan het eind uitdrukkelijk uitgereikt. */
try {
  eval(
    knipRegel(/^const LICENTIE_KEY\b/, "const LICENTIE_KEY") + "\n" +
    knipBlok() + "\n" +
    ";Object.assign(global, {MODULES, PAKKETTEN, PAGINA_MODULE, LICENTIE_KEY});"
  );
} catch (e) {
  /* Meestal betekent dit: iemand heeft een functie hernoemd of het
     blok verplaatst. Dat is geen kapotte test, dat is de melding. */
  console.log("\nDe pakketlaag is niet uit online/index.html te knippen:");
  console.log("  " + (e && e.message || e));
  console.log("\n0 geslaagd, 1 gefaald");
  process.exit(1);
}

/* Hernoemt iemand een functie, dan is de knip nog gelukt (het blok
   loopt van MODULES tot magNieuwTeam) maar valt de test halverwege om
   met een ReferenceError. Liever hier één duidelijke melding. */
const NAMEN = ["pakketNu", "zetPakket", "magModule", "magPagina", "maxTeams", "magNieuwTeam"];
const zoek1 = NAMEN.filter((n) => { try { return typeof eval(n) !== "function"; } catch (e) { return true; } });
if (zoek1.length) {
  console.log("\nDeze functies staan niet meer in het pakketblok van online/index.html:");
  zoek1.forEach((n) => console.log("  - " + n + "  (hernoemd? verplaatst?)"));
  console.log("\n0 geslaagd, " + zoek1.length + " gefaald");
  process.exit(1);
}

/* ── minimale testhulp ─────────────────────────────────────── */
/* Drie tellers in plaats van twee. Een test die [WACHT] of [ROOD] in
   zijn naam heeft mág vandaag rood zijn; dat telt als "gepland".
   Alleen "onverwacht" is een echte bevinding — en een geplande test
   die ineens groen is óók, want dan klopt de kop niet meer. */
/* Is de verhuizing naar free/coach/club al gedaan?
   Dit is nodig omdat [WACHT] anders te veel excuseert. Toen ik deze
   test met opzettelijke fouten controleerde, bleven drie fouten
   onzichtbaar — een verkeerde pakketnaam, een verkeerde pakket-id en
   agenda die terugkroop in PAGINA_MODULE. Ze máákten de test wel
   rood, maar dat rood viel weg in "bewust rood".

   [WACHT] mag dus alleen een excuus zijn zolang de oude pakketten er
   nog staan. Zijn basic, pro en max verdwenen, dan is de verhuizing
   gedaan en is elk rood vanaf dat moment een echte bevinding. */
const OUDE_PAKKETTEN = ["basic", "pro", "max"].filter((i) => PAKKETTEN.some((p) => p.id === i));
const FENNA_KLAAR = OUDE_PAKKETTEN.length === 0;

let goed = 0, gepland = 0, onverwacht = 0, ongemeten = 0;
const teVroegGroen = [];
const nietTeMeten = [];
const GEMERKT = /^\[WACHT\]/;
/* JSON.stringify(Infinity) geeft "null". Zonder deze vervanger zou
   teams:null hetzelfde lijken als teams:Infinity — en dat is precies
   de fout die iemand maakt die pakket_grenzen (waar club op null
   staat) overneemt in JavaScript. null breekt magNieuwTeam(), want
   "iets < null" is altijd onwaar en dan mag club géén enkel team
   meer aanmaken. Die twee moeten dus uit elkaar te houden zijn.
   Hetzelfde geldt voor NaN en undefined. */
const toon = (v) => JSON.stringify(v, (k, x) => {
  if (x === Infinity) return "«Infinity»";
  if (x === -Infinity) return "«-Infinity»";
  if (typeof x === "number" && isNaN(x)) return "«NaN»";
  if (x === undefined) return "«undefined»";
  return x;
});
const ok = (naam, echt, verwacht) => {
  const gelijk = toon(echt) === toon(verwacht);
  const merk = GEMERKT.test(naam);
  /* [ROOD] blijft altijd een excuus: het slot is apart werk. [WACHT]
     alleen zolang de oude pakketten nog in de app staan. */
  const excuus = merk && !FENNA_KLAAR;   /* alleen [WACHT] nog; zie de kop */
  let teken;
  if (gelijk) {
    goed++;
    teken = "ok  ";
    if (excuus) teVroegGroen.push(naam);
  } else if (excuus) {
    gepland++;
    teken = "wacht";
  } else {
    onverwacht++;
    teken = "FOUT";
  }
  console.log(`  ${teken} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${toon(echt)}\n        verwacht ${toon(verwacht)}`));
};
const leeg = () => { for (const k of Object.keys(kast)) delete kast[k]; _teams = []; };
const groep = (t) => console.log("\n" + t);

/* Zet het apparaat op een pakket zonder zetPakket te gebruiken —
   anders test je de ene functie met de andere. */
const opPakket = (id) => { kast[LICENTIE_KEY] = JSON.stringify({pakket: id}); };

/* ── niet groen, niet rood: niet te meten ────────────────────
   Dit is de belangrijkste les uit de eerste versie van deze herziening.
   Zet je het apparaat op "coach" terwijl dat pakket nog niet in de app
   staat, dan valt pakketNu() terug op het laatste pakket (vandaag max),
   en dat mág alles. Een test als "coach mag bij analyse" is dan groen
   — maar hij meet max, niet coach. Vijftien tests stonden zo groen om
   de verkeerde reden.

   Een gedragstest over een pakket dat nog niet bestaat is dus geen
   uitslag. Hij wordt hier overgeslagen en apart geteld, met de reden
   erbij. Zodra Fenna de pakketten bijwerkt gaan ze vanzelf meedoen,
   en dán is groen ook echt groen. */
const bestaat = (id) => PAKKETTEN.some((p) => p.id === id);
const pak = (id) => PAKKETTEN.filter((p) => p.id === id)[0];
const okAls = (ids, naam, echtFn, verwacht) => {
  const missen = [].concat(ids).filter((i) => !bestaat(i));
  if (missen.length) {
    ongemeten++;
    nietTeMeten.push(naam + "   (pakket " + missen.map((m) => '"' + m + '"').join(" en ") +
                     " staat nog niet in online/index.html)");
    console.log("  n.t.m " + naam);
    return;
  }
  ok(naam, echtFn(), verwacht);
};

/* De regels waarop een naam echt wórdt aangeroepen: niet de eigen
   definitieregel, en niet een vermelding in een stuk toelichting. */
const aanroepen = (naam) => regels
  .map((r, i) => ({nr: i + 1, tekst: r}))
  .filter((r) =>
    new RegExp("\\b" + naam + "\\s*\\(").test(r.tekst) &&
    !new RegExp("^\\s*function\\s+" + naam + "\\s*\\(").test(r.tekst) &&
    !/^\s*(\/\/|\/\*|\*)/.test(r.tekst))
  .map((r) => r.nr);

function draai() {

console.log(FENNA_KLAAR
  ? "De pakketten in online/index.html staan op free/coach/club. Elk rood\n" +
    "dat hieronder [WACHT] heet is vanaf nu een echte bevinding."
  : "De pakketten in online/index.html staan nog op " +
    PAKKETTEN.map((p) => p.id).join("/") + " — de oude indeling.\n" +
    "Daarom mogen de [WACHT]-tests rood staan; ze zijn Fenna's lijstje.");

/* ══ 1. de pakketten zelf ══ */
groep("PAKKETTEN — drie trappen, en wat je op elke trap krijgt");
ok("[WACHT] er zijn drie pakketten", PAKKETTEN.length, 3);
ok("[WACHT] in oplopende volgorde", PAKKETTEN.map((p) => p.id), ["free", "coach", "club"]);
ok("[WACHT] met leesbare namen", PAKKETTEN.map((p) => p.naam), ["Free", "Coach", "Club"]);
ok("[WACHT] free en coach zijn één team, club is onbeperkt",
   PAKKETTEN.map((p) => p.teams), [1, 1, Infinity]);
/* In pakket_grenzen staat club op teams = null. In JavaScript kan dat
   niet: magNieuwTeam() rekent met _teams.length < maxTeams(), en
   "iets < null" is altijd onwaar. Infinity is hier hetzelfde besluit
   in een andere taal. */
ok("[WACHT] club is onbegrensd — null in de SQL, Infinity in de app",
   (pak("club") || {}).teams, Infinity);
/* De valkuil, uitgeschreven omdat hij makkelijk te lopen is: in
   pakket_grenzen staat club op null. Neem je dat één op één over in
   JavaScript, dan doet magNieuwTeam() _teams.length < null, en dat is
   altijd onwaar — club zou dan géén enkel team meer mogen aanmaken.
   Precies omgekeerd aan de bedoeling. */
okAls("club", "en teams staat niet op null — dat zou club juist op nul teams zetten",
   () => pak("club").teams === null, false);
ok("free geeft alleen de basis", pak("free").modules, ["basis"]);
okAls("coach", "coach geeft alles", () => pak("coach").modules, MODULES);
okAls(["coach", "club"], "club geeft hetzelfde als coach — het verschil is het aantal teams",
   () => pak("club").modules, MODULES);
ok("[WACHT] ontwikkeling zit alleen in de betaalde pakketten",
   PAKKETTEN.filter((p) => p.modules.indexOf("ontwikkeling") >= 0).map((p) => p.id),
   ["coach", "club"]);
ok("elk pakket bevat de basis", PAKKETTEN.every((p) => p.modules.indexOf("basis") >= 0), true);
ok("geen pakket noemt een onderdeel dat niet bestaat",
   PAKKETTEN.flatMap((p) => p.modules).filter((m) => MODULES.indexOf(m) < 0), []);
ok("elk pakket geeft minstens zoveel als het pakket eronder",
   PAKKETTEN.every((p, i) => i === 0 ||
     PAKKETTEN[i - 1].modules.every((m) => p.modules.indexOf(m) >= 0)), true);
ok("de vijf onderdelen staan vast",
   MODULES, ["basis", "trainingen", "ontwikkeling", "analyse", "clubhuis"]);

/* ══ 2. welk scherm bij welk onderdeel hoort ══ */
groep("PAGINA_MODULE — de sleutel tussen scherm en onderdeel");
ok("trainingen hoort bij trainingen",   PAGINA_MODULE.trainingen, "trainingen");
/* Dit is de verhuizing uit het besluit: agenda hoorde bij trainingen
   en hoort nu bij de basis. Staat een scherm niet in PAGINA_MODULE,
   dan valt het onder de basis en mag iedereen erbij. */
ok("[WACHT] agenda hoort bij de basis en staat er dus niet meer in",
   PAGINA_MODULE.agenda, undefined);
ok("statistieken hoort bij analyse",    PAGINA_MODULE.statistieken, "analyse");
ok("live hoort óók bij analyse",        PAGINA_MODULE.live, "analyse");
ok("clubhuis hoort bij clubhuis",       PAGINA_MODULE.clubhuis, "clubhuis");
ok("[WACHT] en verder niets", Object.keys(PAGINA_MODULE).sort(),
   ["clubhuis", "live", "statistieken", "trainingen"]);
ok("dashboard staat er niet in en valt dus onder de basis", PAGINA_MODULE.dashboard, undefined);
ok("selectie ook niet — selectie is voor iedereen",         PAGINA_MODULE.selectie, undefined);
ok("wedstrijden ook niet",                                  PAGINA_MODULE.wedstrijden, undefined);
ok("elk genoemd onderdeel bestaat",
   Object.values(PAGINA_MODULE).filter((m) => MODULES.indexOf(m) < 0), []);
/* Ontwikkeling is een tabblad, geen scherm. PAGINA_MODULE gaat over
   schermen, dus hier hoort het niet te staan — en dat betekent dat
   magPagina() er niets over kan zeggen. Zie (c1) en de groep over het
   tabblad onderaan. */
ok("ontwikkeling heeft geen eigen scherm — het is een tabblad",
   Object.values(PAGINA_MODULE).indexOf("ontwikkeling"), -1);

/* Elke pagina die de router kent moet hier te plaatsen zijn */
const ROUTER = knipGebied(/^  function renderPagina\(\)/, /^  \}\s*$/, "function renderPagina");
const routerPaginas = (ROUTER.match(/case "([a-z]+)":/g) || []).map((c) => c.slice(6, -2));
groep("de router en PAGINA_MODULE moeten bij elkaar blijven");
ok("de router kent acht schermen", routerPaginas.length, 8);
ok("en het zijn deze", routerPaginas.sort(),
   ["agenda", "clubhuis", "dashboard", "live", "selectie", "statistieken", "trainingen", "wedstrijden"]);
ok("PAGINA_MODULE noemt geen scherm dat de router niet kent",
   Object.keys(PAGINA_MODULE).filter((p) => routerPaginas.indexOf(p) < 0), []);

/* Alle menu-items moeten ook door de router te halen zijn */
const MENUS = knipGebied(/^const navItems = \[/, /^\];\s*$/, "const navItems") + "\n" +
              knipGebied(/^const zijGroepen = \[/, /^\];\s*$/, "const zijGroepen");
const menuPaginas = [...new Set((MENUS.match(/\{id:"([a-z]+)"/g) || []).map((m) => m.slice(5, -1)))];
ok("de menu's wijzen alleen naar schermen die de router kent",
   menuPaginas.filter((p) => routerPaginas.indexOf(p) < 0), []);
ok("en samen dekken ze alle acht", menuPaginas.sort(), routerPaginas.slice().sort());

/* ══ 3. pakketNu — wat het apparaat denkt te hebben ══ */
groep("pakketNu — leest het pakket van het apparaat");
leeg(); opPakket("free");
ok("free wordt herkend",           pakketNu().id, "free");
opPakket("coach");
ok("[WACHT] coach wordt herkend",  pakketNu().id, "coach");
opPakket("club");
ok("[WACHT] club wordt herkend",   pakketNu().id, "club");
ok("[WACHT] en je krijgt het hele pakket terug, niet alleen de naam",
   pakketNu().naam, "Club");

/* De oude namen mogen niet blijven werken. Een apparaat waar nog
   basic/pro/max op staat hoort door de terugval te worden opgevangen,
   niet door een pakket dat er stiekem nog is. */
opPakket("basic");
ok("[WACHT] basic bestaat niet meer",
   PAKKETTEN.some((p) => p.id === "basic"), false);
opPakket("pro");
ok("[WACHT] pro bestaat niet meer",
   PAKKETTEN.some((p) => p.id === "pro"), false);
opPakket("max");
ok("[WACHT] max bestaat niet meer",
   PAKKETTEN.some((p) => p.id === "max"), false);

leeg(); kast[LICENTIE_KEY] = "{ dit is geen json";
ok("kapotte opslag loopt niet vast", typeof pakketNu().id, "string");
leeg(); kast[LICENTIE_KEY] = JSON.stringify({iets: "anders"});
ok("opslag zonder pakketveld loopt niet vast", typeof pakketNu().id, "string");
leeg(); opPakket("platinum");
ok("een onbekend pakket loopt niet vast", typeof pakketNu().id, "string");
leeg(); opPakket("club");
ok("hij leest elke keer opnieuw — zet je hem om, dan volgt het antwoord",
   (opPakket("free"), pakketNu().id), "free");

/* ══ 4. zetPakket ══ */
groep("zetPakket — legt het pakket op het apparaat vast");
leeg();
const gezet = zetPakket("coach");
ok("[WACHT] hij geeft het nieuwe pakket terug", gezet.id, "coach");
ok("en schrijft naar de licentiesleutel", JSON.parse(kast[LICENTIE_KEY]), {pakket: "coach"});
ok("de sleutel is tt_licentie_v1", LICENTIE_KEY, "tt_licentie_v1");
ok("er wordt niets anders weggeschreven", Object.keys(kast), [LICENTIE_KEY]);
zetPakket("club");
ok("omzetten overschrijft", JSON.parse(kast[LICENTIE_KEY]), {pakket: "club"});
ok("[WACHT] en pakketNu volgt meteen", pakketNu().id, "club");
ok("een onbekend pakket wordt wél opgeslagen — dat is het gedrag van nu",
   (zetPakket("platinum"), JSON.parse(kast[LICENTIE_KEY]).pakket), "platinum");

/* ══ 5. magModule ══ */
groep("magModule — mag ik bij dit onderdeel");
leeg(); opPakket("free");
ok("basis mag altijd",                       magModule("basis"), true);
ok("niets opgegeven mag ook — dat is basis", magModule(undefined), true);
ok("een lege naam mag ook",                  magModule(""), true);
ok("free mag niet bij trainingen",           magModule("trainingen"), false);
ok("free mag niet bij ontwikkeling",         magModule("ontwikkeling"), false);
ok("free mag niet bij analyse",              magModule("analyse"), false);
ok("free mag niet bij clubhuis",             magModule("clubhuis"), false);
okAls("coach", "coach mag bij trainingen",   () => (opPakket("coach"), magModule("trainingen")), true);
okAls("coach", "coach mag bij ontwikkeling", () => (opPakket("coach"), magModule("ontwikkeling")), true);
okAls("coach", "coach mag bij analyse",      () => (opPakket("coach"), magModule("analyse")), true);
okAls("coach", "coach mag bij clubhuis",     () => (opPakket("coach"), magModule("clubhuis")), true);
okAls("club",  "club mag bij ontwikkeling",  () => (opPakket("club"),  magModule("ontwikkeling")), true);
okAls("club",  "club mag bij analyse",       () => (opPakket("club"),  magModule("analyse")), true);
okAls("club",  "club mag bij clubhuis",      () => (opPakket("club"),  magModule("clubhuis")), true);
opPakket("free");
ok("een onderdeel dat niet bestaat mag niet", magModule("teletekst"), false);

/* ══ 6. magPagina — de matrix ══ */
/* De volgorde van de kolommen is die van de tabel in
   docs/pakketten-besluit.md, zodat je ze naast elkaar kunt leggen. */
groep("magPagina — het antwoord per scherm, per pakket");
const SCHERMEN = ["dashboard", "selectie", "wedstrijden", "agenda",
                  "trainingen", "statistieken", "live", "clubhuis"];
const rijVan = (p) => { opPakket(p); return SCHERMEN.map((s) => magPagina(s)); };
const J = true, N = false;
leeg();
ok("[WACHT] free  ziet vier van de acht", rijVan("free"),  [J, J, J, J, N, N, N, N]);
okAls("coach", "coach ziet alles",      () => rijVan("coach"), [J, J, J, J, J, J, J, J]);
okAls("club",  "club  ziet alles",      () => rijVan("club"),  [J, J, J, J, J, J, J, J]);
okAls(["coach", "club"], "coach en club zien precies hetzelfde",
   () => rijVan("coach"), [J, J, J, J, J, J, J, J]);
opPakket("free");
ok("[WACHT] free mag bij de agenda — die is verhuisd naar de basis",
   magPagina("agenda"), true);
ok("free mag niet bij trainingen", magPagina("trainingen"), false);
ok("free mag bij selectie — selectie is voor iedereen",
   magPagina("selectie"), true);
ok("een scherm dat niet bestaat valt onder de basis en mag",
   magPagina("bestaatniet"), true);
ok("geen scherm opgegeven mag ook", magPagina(undefined), true);

/* ══ 7. maxTeams en magNieuwTeam ══ */
groep("maxTeams — hoeveel teams past er in je pakket");
leeg();
ok("free  is één team",           (opPakket("free"),  maxTeams()), 1);
okAls("coach", "coach is óók één team — daar zit het verschil niet",
   () => (opPakket("coach"), maxTeams()), 1);
okAls("club", "club  is onbegrensd",
   () => (opPakket("club"), maxTeams()), Infinity);

groep("magNieuwTeam — past er nog een team bij");
leeg(); opPakket("free");
_teams = [];
ok("free met nul teams mag er een aanmaken", magNieuwTeam(), true);
_teams = [{id: "t1"}];
ok("free met één team zit vol",              magNieuwTeam(), false);
_teams = [{id: "t1"}, {id: "t2"}];
ok("free boven zijn grens blijft dicht",     magNieuwTeam(), false);
okAls("coach", "coach met nul teams mag er een aanmaken",
   () => (opPakket("coach"), _teams = [], magNieuwTeam()), true);
okAls("coach", "coach met één team zit vol — net als free",
   () => (opPakket("coach"), _teams = [{id: "t1"}], magNieuwTeam()), false);
okAls("club", "club met één team mag nog",
   () => (opPakket("club"), _teams = [{id: "t1"}], magNieuwTeam()), true);
okAls("club", "club met zesentwintig teams mag nog steeds — de gemiddelde club",
   () => (opPakket("club"), _teams = Array.from({length: 26}, (_, i) => ({id: "t" + i})), magNieuwTeam()), true);
okAls("club", "club zit nooit vol",
   () => (opPakket("club"), _teams = Array.from({length: 9999}, (_, i) => ({id: "t" + i})), magNieuwTeam()), true);
leeg(); opPakket("free");
ok("zonder teams op het apparaat mag je beginnen", magNieuwTeam(), true);

groep("magNieuwTeam wordt ook echt gebruikt — de drie plekken uit het plan");
const nieuwTeamPlekken = aanroepen("magNieuwTeam");
ok("er zijn drie aanroepen", nieuwTeamPlekken.length, 3);
console.log("        regels: " + nieuwTeamPlekken.join(", "));
ok("de knop 'team toevoegen' vraagt het na",
   /if \(!magNieuwTeam\(\)\) return;/.test(bron), true);
ok("het scherm verbergt de knop als het niet mag",
   /\{magNieuwTeam\(\) \? \(/.test(bron), true);
ok("en het aanmaakscherm legt uit waaróm het niet mag",
   /if \(!eerste && !magNieuwTeam\(\)\)/.test(bron), true);

/* ══ 8. waar het tabblad Ontwikkeling staat ══
   Het besluit noemt Ontwikkeling "een tabblad in Selectie". In de code
   klopt dat niet helemaal, en dat verschil is precies wat Fenna moet
   weten voor ze een slot gaat zetten. Deze tests leggen vast wat er
   écht staat, zodat het opvalt als het verschuift. */
groep("het tabblad Ontwikkeling — waar het écht staat");
const SELECTIE_TABS = knipRegel(/\{id:"spelers",\s*ic:/, "de tabbalk van SelectiePagina");
const SPELERPROFIEL = knipGebied(/^function SpelerProfiel\(/, /^\}\s*$/, "function SpelerProfiel");
ok("de tabbalk van Selectie heeft vijf tabbladen",
   (SELECTIE_TABS.match(/\{id:"/g) || []).length, 5);
ok("en dat zijn deze",
   (SELECTIE_TABS.match(/\{id:"([a-z]+)"/g) || []).map((m) => m.slice(5, -1)),
   ["spelers", "opstellingen", "tactieken", "blessures", "boetepot"]);
ok("Ontwikkeling zit er NIET bij — het is geen tabblad van Selectie zelf",
   /ontwikkeling/i.test(SELECTIE_TABS), false);
ok("het zit één laag dieper, in het spelerprofiel",
   /tab==="ontwikkeling"/.test(SPELERPROFIEL), true);
ok("het spelerprofiel heeft twee tabbladen: Profiel en Ontwikkeling",
   (SPELERPROFIEL.match(/setTab\("([a-z]+)"\)/g) || []).map((m) => m.slice(8, -2)).sort(),
   ["ontwikkeling", "profiel"]);
ok("en de component die erachter hangt heet OntwikkelingTab",
   /<OntwikkelingTab speler=/.test(SPELERPROFIEL), true);
ok("die component bestaat ook echt",
   /^function OntwikkelingTab\(/m.test(bron), true);

/* ══════════════════════════════════════════════════════════════
   (a) HET SLOT — vandaag ROOD, en dat hoort zo
   ══════════════════════════════════════════════════════════════ */
groep("(a) het slot — magPagina moet ergens worden aangeroepen");
const paginaPlekken = aanroepen("magPagina");
if (!paginaPlekken.length) {
  console.log("   magPagina() rekent keurig uit wie waar bij mag, maar niemand");
  console.log("   vráágt het. De uitkomst gaat nergens heen. Rood hier betekent");
  console.log("   'nog niet gebouwd', niet 'vangnet stuk' — zie de kop.");
}
console.log("        aangeroepen op regel(s): " + (paginaPlekken.join(", ") || "nergens"));
ok("(a1) magPagina wordt minstens één keer aangeroepen buiten zijn definitie",
   paginaPlekken.length > 0, true);
ok("(a2) de router renderPagina() vraagt het na voor hij een scherm toont",
   /magPagina\s*\(/.test(ROUTER), true);
ok("(a3) het zijmenu zeeft zijn items voor het ze tekent",
   /mag(Pagina|Module)\s*\(/.test(knipNavRondom("zijGroepen")), true);
ok("(a4) de onderbalk op de telefoon zeeft ook",
   /mag(Pagina|Module)\s*\(/.test(knipNavRondom("navItems")), true);

/* (a5) — gevonden doordat het weghalen van dit slot door NIETS werd gevangen.
   gaNaar() is de enige doorgang naar een ander scherm. Haal je de controle
   daar weg, dan komt niemand alsnog op een vergrendeld scherm: de useEffect
   eronder stuurt terug naar het dashboard, met dezelfde melding. De
   eindtoestand is dus gelijk, en daarom zag het gouden origineel het niet --
   dat wacht tot het scherm stilstaat.

   Wat er wél gebeurt is een flits: de app rendert één keer met de
   vergrendelde pagina, renderPagina() geeft niets terug, en dan springt hij
   terug. Je verliest je plek in het scherm en je ziet een lege pagina
   opflikkeren. Geen gat in de betaalmuur, wel een zichtbare hapering die
   niemand zou opmerken tot een gebruiker erover belt.

   Deze test is statisch en kijkt alleen of de vraag nog gesteld wordt. */
const GANAAR = (function () {
  const a = regels.findIndex((r) => /^\s+function gaNaar\s*\(/.test(r));
  if (a < 0) {
    console.log("\n   gaNaar() staat niet meer in online/index.html.");
    console.log("   Hernoemd of verplaatst? Zoek hem op en pas deze test aan.");
    return "";
  }
  const inspring = regels[a].match(/^(\s*)/)[1];
  let e = a + 1;
  while (e < regels.length && regels[e] !== inspring + "}") e++;
  return regels.slice(a, e + 1).join("\n");
})();
ok("(a5) gaNaar() vraagt het na voor hij van scherm wisselt",
   /mag(Pagina|Module)\s*\(/.test(GANAAR), true);

/* ══════════════════════════════════════════════════════════════
   (b) DE TERUGVAL — vandaag ROOD, en dat hoort zo
   ══════════════════════════════════════════════════════════════ */
groep("(b) de terugval — een leeg apparaat hoort op free uit te komen");
const PAKKETNU = knipFunctie("pakketNu");
const BETAALD = /["'](max|pro|basic|coach|club)["']/;
if (BETAALD.test(PAKKETNU)) {
  console.log("   pakketNu() begint met var id = \"max\". Zolang daar een betaald");
  console.log("   pakket staat is elk apparaat zonder licentie een betalende klant");
  console.log("   die niets betaalt. Rood hier betekent 'nog niet gebouwd', niet");
  console.log("   'vangnet stuk' — zie de kop.");
}
ok("(b1) pakketNu() heeft geen hardgecodeerd betaald pakket als terugval",
   BETAALD.test(PAKKETNU), false);
leeg();
const ruimste = PAKKETTEN[PAKKETTEN.length - 1].id;
ok("(b2) een apparaat zonder licentie komt niet op het ruimste pakket uit",
   pakketNu().id !== ruimste, true);
ok("(b3) en het komt precies op free uit — het zuinigste, niet het ruimste",
   pakketNu().id, "free");
console.log("        (b2/b3) een leeg apparaat krijgt nu: " + pakketNu().id +
            "   (ruimste pakket is: " + ruimste + ")");
if (pakketNu().id === ruimste) {
  console.log("   (b1) kun je groen maken door alleen regel 3533 te wissen;");
  console.log("   (b2) blijft dan rood, want de laatste regel van pakketNu");
  console.log("   valt terug op PAKKETTEN[PAKKETTEN.length - 1] — het ruimste.");
  console.log("   Dat moet PAKKETTEN[0] worden, en op de server staat het al zo:");
  console.log("   pakket_van_club() eindigt op coalesce(..., 'free').");
}

/* ══════════════════════════════════════════════════════════════
   (c) HET TABBLAD — vandaag ROOD, en dat hoort zo
   ══════════════════════════════════════════════════════════════ */
groep("(c) het slot op het tabblad Ontwikkeling");
/* magPagina() kan hier niets: Ontwikkeling is geen scherm en staat
   dus niet in PAGINA_MODULE. De enige functie die er iets over kan
   zeggen is magModule("ontwikkeling"). Vandaag wordt magModule alleen
   door magPagina aangeroepen, dus wordt die vraag nergens gesteld.
   Deze test schrijft niet voor hóé het slot eruitziet — alleen dat de
   vraag ergens gesteld wordt. */
const moduleVraag = regels
  .map((r, i) => ({nr: i + 1, tekst: r}))
  .filter((r) => /magModule\s*\(\s*["']ontwikkeling["']\s*\)/.test(r.tekst))
  .map((r) => r.nr);
console.log("        magModule(\"ontwikkeling\") staat op regel(s): " +
            (moduleVraag.join(", ") || "nergens"));
ok("(c1) ergens in de app wordt magModule(\"ontwikkeling\") gevraagd",
   moduleVraag.length > 0, true);

}

/* ── uitslag ──────────────────────────────────────────────── */
try { draai(); } catch (e) {
  console.log("\nDe test zelf liep vast: " + (e && e.stack || e));
  onverwacht++;
}
const totaalFout = gepland + onverwacht;
console.log(`\n${goed} geslaagd, ${totaalFout} gefaald, ${ongemeten} niet te meten`);
console.log(`  waarvan ${gepland} bewust rood ([WACHT] — zie de kop)`);
console.log(`  ONVERWACHT ROOD: ${onverwacht}   (dit getal hoort nul te zijn)`);
if (nietTeMeten.length) {
  console.log("\nNiet te meten (" + nietTeMeten.length + ") — geen groen en geen rood.");
  console.log("Deze gedragstests gaan over een pakket dat nog niet in de app staat;");
  console.log("ze zouden max meten in plaats van coach of club. Ze doen vanzelf mee");
  console.log("zodra PAKKETTEN in online/index.html is bijgewerkt.");
  nietTeMeten.forEach((n) => console.log("  - " + n));
}
if (teVroegGroen.length) {
  const wacht = teVroegGroen.filter((n) => n.indexOf("[WACHT]") === 0);
  const rood = teVroegGroen.filter((n) => n.indexOf("[ROOD]") === 0);
  console.log("\nGOED NIEUWS, EN EEN OPDRACHT — " + teVroegGroen.length +
              " test(s) staan als bewust rood in de kop, maar zijn groen.");
  if (wacht.length)
    console.log("  " + wacht.length + "x [WACHT]: online/index.html is bijgewerkt. Haal die " +
                "merktekens\n  weg uit dit bestand, anders weet niemand meer wat er nog open staat.");
  if (rood.length)
    console.log("  " + rood.length + "x [ROOD]: er is een slot bijgekomen. Werk de kop bij.");
  teVroegGroen.forEach((n) => console.log("  - " + n));
}
process.exit(totaalFout ? 1 : 0);
