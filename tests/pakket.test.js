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

   ┌─────────────────────────────────────────────────────────────┐
   │ LET OP — ZES TESTS HOREN VANDAAG ROOD TE ZIJN.              │
   │                                                             │
   │ Rood betekent hier NIET "het vangnet is stuk". Het betekent │
   │ "dit stuk is nog niet gebouwd". De pakketlaag kan vandaag   │
   │ wél rekenen maar houdt niemand tegen: magPagina() wordt     │
   │ nergens aangeroepen en pakketNu() zet iedereen op max.      │
   │ Het slot ligt naast de deur.                                │
   │                                                             │
   │ Deze zes staan in de groepen HET SLOT (a) en DE TERUGVAL    │
   │ (b), en ze zijn hieronder allemaal gemerkt met [ROOD].      │
   │                                                             │
   │   (a1) magPagina wordt ergens aangeroepen                   │
   │        → groen zodra een van de drie plekken hieronder      │
   │          hem gebruikt                                       │
   │   (a2) de router renderPagina() vraagt het na               │
   │        → groen zodra de switch op ~33774 een geweigerde     │
   │          pagina niet meer rendert                           │
   │   (a3) het zijmenu zeeft zijn items                         │
   │        → groen zodra de zijGroepen.map op ~33845 een        │
   │          geweigerde knop niet meer tekent                   │
   │   (a4) de onderbalk zeeft zijn items                        │
   │        → groen zodra de navItems.map op ~33906 hetzelfde    │
   │          doet                                               │
   │   (b1) pakketNu() heeft geen hardgecodeerde "max"           │
   │        → groen zodra regel ~3533 (var id = "max") weg is    │
   │   (b2) een leeg apparaat krijgt niet stilletjes max         │
   │        → groen zodra óók de laatste terugval                │
   │          (PAKKETTEN[PAKKETTEN.length - 1]) niet meer op     │
   │          max uitkomt. Dit is de dubbele bodem: (b1) kun je  │
   │          groen maken zonder het lek te dichten, (b2) niet.  │
   │                                                             │
   │ Alle andere tests horen groen te zijn. Gaat er één van die  │
   │ op rood, dan is er iets kapot.                              │
   │                                                             │
   │ Verwacht vandaag:  82 geslaagd, 6 gefaald.                  │
   │ Verwacht straks:   88 geslaagd, 0 gefaald.                  │
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
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const leeg = () => { for (const k of Object.keys(kast)) delete kast[k]; _teams = []; };
const groep = (t) => console.log("\n" + t);

/* Zet het apparaat op een pakket zonder zetPakket te gebruiken —
   anders test je de ene functie met de andere. */
const opPakket = (id) => { kast[LICENTIE_KEY] = JSON.stringify({pakket: id}); };

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

/* ══ 1. de pakketten zelf ══ */
groep("PAKKETTEN — vier trappen, en wat je op elke trap krijgt");
ok("er zijn vier pakketten", PAKKETTEN.length, 4);
ok("in oplopende volgorde", PAKKETTEN.map((p) => p.id), ["free", "basic", "pro", "max"]);
ok("met leesbare namen", PAKKETTEN.map((p) => p.naam), ["Free", "Basic", "Pro", "Max"]);
ok("het aantal teams loopt op", PAKKETTEN.map((p) => p.teams), [1, 3, 15, null]);
ok("max is onbegrensd", PAKKETTEN[3].teams, Infinity);
ok("free geeft alleen de basis", PAKKETTEN[0].modules, ["basis"]);
ok("basic geeft er trainingen en ontwikkeling bij",
   PAKKETTEN[1].modules, ["basis", "trainingen", "ontwikkeling"]);
ok("pro geeft alles", PAKKETTEN[2].modules, MODULES);
ok("max geeft hetzelfde als pro", PAKKETTEN[3].modules, PAKKETTEN[2].modules);
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
ok("agenda hoort óók bij trainingen",   PAGINA_MODULE.agenda, "trainingen");
ok("statistieken hoort bij analyse",    PAGINA_MODULE.statistieken, "analyse");
ok("live hoort óók bij analyse",        PAGINA_MODULE.live, "analyse");
ok("clubhuis hoort bij clubhuis",       PAGINA_MODULE.clubhuis, "clubhuis");
ok("en verder niets", Object.keys(PAGINA_MODULE).sort(),
   ["agenda", "clubhuis", "live", "statistieken", "trainingen"]);
ok("dashboard staat er niet in en valt dus onder de basis", PAGINA_MODULE.dashboard, undefined);
ok("selectie ook niet",                                     PAGINA_MODULE.selectie, undefined);
ok("wedstrijden ook niet",                                  PAGINA_MODULE.wedstrijden, undefined);
ok("elk genoemd onderdeel bestaat",
   Object.values(PAGINA_MODULE).filter((m) => MODULES.indexOf(m) < 0), []);
ok("ontwikkeling heeft (nog) geen eigen scherm — dat is bekend, geen fout",
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
ok("free wordt herkend",  pakketNu().id, "free");
opPakket("basic");
ok("basic wordt herkend", pakketNu().id, "basic");
opPakket("pro");
ok("pro wordt herkend",   pakketNu().id, "pro");
opPakket("max");
ok("max wordt herkend",   pakketNu().id, "max");
ok("en je krijgt het hele pakket terug, niet alleen de naam", pakketNu().teams, Infinity);

leeg(); kast[LICENTIE_KEY] = "{ dit is geen json";
ok("kapotte opslag loopt niet vast", typeof pakketNu().id, "string");
leeg(); kast[LICENTIE_KEY] = JSON.stringify({iets: "anders"});
ok("opslag zonder pakketveld loopt niet vast", typeof pakketNu().id, "string");
leeg(); opPakket("platinum");
ok("een onbekend pakket loopt niet vast", typeof pakketNu().id, "string");
leeg(); opPakket("pro");
ok("hij leest elke keer opnieuw — zet je hem om, dan volgt het antwoord",
   (opPakket("free"), pakketNu().id), "free");

/* ══ 4. zetPakket ══ */
groep("zetPakket — legt het pakket op het apparaat vast");
leeg();
const gezet = zetPakket("basic");
ok("hij geeft het nieuwe pakket terug", gezet.id, "basic");
ok("en schrijft naar de licentiesleutel", JSON.parse(kast[LICENTIE_KEY]), {pakket: "basic"});
ok("de sleutel is tt_licentie_v1", LICENTIE_KEY, "tt_licentie_v1");
ok("er wordt niets anders weggeschreven", Object.keys(kast), [LICENTIE_KEY]);
zetPakket("pro");
ok("omzetten overschrijft", JSON.parse(kast[LICENTIE_KEY]), {pakket: "pro"});
ok("en pakketNu volgt meteen", pakketNu().id, "pro");
ok("een onbekend pakket wordt wél opgeslagen — dat is het gedrag van nu",
   (zetPakket("platinum"), JSON.parse(kast[LICENTIE_KEY]).pakket), "platinum");

/* ══ 5. magModule ══ */
groep("magModule — mag ik bij dit onderdeel");
leeg(); opPakket("free");
ok("basis mag altijd",                      magModule("basis"), true);
ok("niets opgegeven mag ook — dat is basis", magModule(undefined), true);
ok("een lege naam mag ook",                 magModule(""), true);
ok("free mag niet bij trainingen",          magModule("trainingen"), false);
ok("free mag niet bij analyse",             magModule("analyse"), false);
ok("free mag niet bij clubhuis",            magModule("clubhuis"), false);
opPakket("basic");
ok("basic mag bij trainingen",              magModule("trainingen"), true);
ok("basic mag bij ontwikkeling",            magModule("ontwikkeling"), true);
ok("basic mag niet bij analyse",            magModule("analyse"), false);
ok("basic mag niet bij clubhuis",           magModule("clubhuis"), false);
opPakket("pro");
ok("pro mag bij analyse",                   magModule("analyse"), true);
ok("pro mag bij clubhuis",                  magModule("clubhuis"), true);
ok("een onderdeel dat niet bestaat mag niet", magModule("teletekst"), false);

/* ══ 6. magPagina — de matrix ══ */
groep("magPagina — het antwoord per scherm, per pakket");
const SCHERMEN = ["dashboard", "selectie", "wedstrijden", "trainingen",
                  "agenda", "statistieken", "live", "clubhuis"];
const rijVan = (p) => { opPakket(p); return SCHERMEN.map((s) => magPagina(s)); };
const J = true, N = false;
leeg();
ok("free  ziet drie van de acht", rijVan("free"),  [J, J, J, N, N, N, N, N]);
ok("basic ziet er vijf",          rijVan("basic"), [J, J, J, J, J, N, N, N]);
ok("pro   ziet alles",            rijVan("pro"),   [J, J, J, J, J, J, J, J]);
ok("max   ziet alles",            rijVan("max"),   [J, J, J, J, J, J, J, J]);
opPakket("free");
ok("een scherm dat niet bestaat valt onder de basis en mag",
   magPagina("bestaatniet"), true);
ok("geen scherm opgegeven mag ook", magPagina(undefined), true);

/* ══ 7. maxTeams en magNieuwTeam ══ */
groep("maxTeams — hoeveel teams past er in je pakket");
leeg();
ok("free  is één team",       (opPakket("free"),  maxTeams()), 1);
ok("basic is drie teams",     (opPakket("basic"), maxTeams()), 3);
ok("pro   is vijftien teams", (opPakket("pro"),   maxTeams()), 15);
ok("max   is onbegrensd",     (opPakket("max"),   maxTeams()), Infinity);

groep("magNieuwTeam — past er nog een team bij");
leeg(); opPakket("free");
_teams = [];
ok("free met nul teams mag er een aanmaken", magNieuwTeam(), true);
_teams = [{id: "t1"}];
ok("free met één team zit vol",              magNieuwTeam(), false);
_teams = [{id: "t1"}, {id: "t2"}];
ok("free boven zijn grens blijft dicht",     magNieuwTeam(), false);
opPakket("basic");
ok("basic met twee teams mag er nog een",    magNieuwTeam(), true);
_teams = [{id: "t1"}, {id: "t2"}, {id: "t3"}];
ok("basic met drie teams zit vol",           magNieuwTeam(), false);
opPakket("pro");
ok("pro met drie teams mag nog",             magNieuwTeam(), true);
_teams = Array.from({length: 15}, (_, i) => ({id: "t" + i}));
ok("pro met vijftien teams zit vol",         magNieuwTeam(), false);
opPakket("max");
ok("max zit nooit vol",                      magNieuwTeam(), true);
_teams = Array.from({length: 9999}, (_, i) => ({id: "t" + i}));
ok("ook niet bij negenduizend teams",        magNieuwTeam(), true);
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

/* ══════════════════════════════════════════════════════════════
   (a) HET SLOT — vandaag ROOD, en dat hoort zo
   ══════════════════════════════════════════════════════════════ */
groep("[ROOD] (a) het slot — magPagina moet ergens worden aangeroepen");
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

/* ══════════════════════════════════════════════════════════════
   (b) DE TERUGVAL — vandaag ROOD, en dat hoort zo
   ══════════════════════════════════════════════════════════════ */
groep("[ROOD] (b) de terugval — een leeg apparaat mag geen max krijgen");
const PAKKETNU = knipFunctie("pakketNu");
if (/["']max["']/.test(PAKKETNU)) {
  console.log("   pakketNu() begint met var id = \"max\". Zolang dat er staat is");
  console.log("   elk apparaat zonder licentie een Max-abonnee. Rood hier betekent");
  console.log("   'nog niet gebouwd', niet 'vangnet stuk' — zie de kop.");
}
ok("(b1) pakketNu() heeft geen hardgecodeerde terugval op \"max\"",
   /["']max["']/.test(PAKKETNU), false);
leeg();
ok("(b2) een apparaat zonder licentie komt niet op max uit",
   pakketNu().id !== "max", true);
console.log("        (b2) een leeg apparaat krijgt nu: " + pakketNu().id);
if (pakketNu().id === "max") {
  console.log("   (b1) kun je groen maken door alleen regel 3533 te wissen;");
  console.log("   (b2) blijft dan rood, want de laatste regel van pakketNu");
  console.log("   valt terug op PAKKETTEN[PAKKETTEN.length - 1] — óók max.");
}

}

/* ── uitslag ──────────────────────────────────────────────── */
try { draai(); } catch (e) {
  console.log("\nDe test zelf liep vast: " + (e && e.stack || e));
  fout++;
}
console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout === 6) console.log("(6 gefaald is de verwachte stand zolang het slot er niet op zit — zie de kop van dit bestand)");
process.exit(fout ? 1 : 0);
