/* ══════════════════════════════════════════════════════════════
   Tests voor de seizoenlogica in online/index.html
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/seizoen.test.js

   Deze test knipt de seizoenfuncties uit de app zelf en draait ze
   tegen een nagebootste localStorage. Geen bouwstap, geen
   testframework, geen npm install — node en verder niets.

   Waarom uit het bestand zelf en niet een kopie: een kopie loopt uit
   de pas. Deze test faalt zodra iemand de functies hernoemt, en dat
   is precies wat je wilt weten.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const APP = path.join(__dirname, "..", "online", "index.html");
const regels = fs.readFileSync(APP, "utf8").split("\n");

/* Het blok van seizoenVanDatum t/m het einde van seizoenVerhuizing */
function knipBlok() {
  const zoek = (re) => { for (let i = 0; i < regels.length; i++) if (re.test(regels[i])) return i; return -1; };
  const a = zoek(/^function seizoenVanDatum\(d\)/);
  const b = zoek(/^function seizoenVerhuizing\(\)/);
  if (a < 0 || b < 0) throw new Error("seizoenVanDatum of seizoenVerhuizing niet gevonden in online/index.html");
  let e = b; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
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
const SEIZOENACTIEF_KEY = "tt_seizoenactief_v1";
const TEAMS_KEY = "tt_teams_v1";
var _actiefTeam = null;
eval(knipBlok());

/* ── minimale testhulp ─────────────────────────────────────── */
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const leeg = () => { for (const k of Object.keys(kast)) delete kast[k]; };
const groep = (t) => console.log("\n" + t);

/* ══ 1. de grens tussen twee seizoenen ══ */
groep("seizoenVanDatumTekst — het seizoen loopt juli t/m juni");
ok("30 juni 2026 hoort bij 2025-2026", seizoenVanDatumTekst("2026-06-30"), "2025-2026");
ok("1 juli 2026 hoort bij 2026-2027",  seizoenVanDatumTekst("2026-07-01"), "2026-2027");
ok("8 september 2026 hoort bij 2026-2027", seizoenVanDatumTekst("2026-09-08"), "2026-2027");
ok("1 mei 2027 hoort bij 2026-2027",   seizoenVanDatumTekst("2027-05-01"), "2026-2027");
ok("onleesbare datum geeft niets",     seizoenVanDatumTekst("geen datum"), null);
ok("lege datum geeft niets",           seizoenVanDatumTekst(""), null);
ok("maand 13 geeft niets",             seizoenVanDatumTekst("2026-13-01"), null);

/* ══ 2. laag versus seizoen ══ */
groep("seizoenUitSleutel en heeftLaag");
ok("2026-2027 is een seizoen",              seizoenUitSleutel("2026-2027::x"), "2026-2027");
ok("een geparkeerde laag is GEEN seizoen",  seizoenUitSleutel("archief-verhuizing::x"), null);
ok("maar hij heeft wel een laag",           heeftLaag("archief-verhuizing::x"), true);
ok("een blote sleutel heeft geen laag",     heeftLaag("fch_trainingen_v1"), false);

/* ══ 3. verdelen over seizoenen ══ */
groep("verdeelOverSeizoenen");
const gemengd = JSON.stringify([
  { id: 1, datum: "2026-05-10" },   // 2025-2026
  { id: 2, datum: "2026-08-15" },   // 2026-2027
  { id: 3, datum: "2026-09-08" },   // 2026-2027
]);
const d1 = verdeelOverSeizoenen(gemengd, "2025-2026");
ok("splitst een lijst over twee seizoenen", Object.keys(d1).sort(), ["2025-2026", "2026-2027"]);
ok("  het ene item in 2025-2026",  JSON.parse(d1["2025-2026"]).length, 1);
ok("  de twee andere in 2026-2027", JSON.parse(d1["2026-2027"]).length, 2);
ok("lijst zonder datums blijft heel", Object.keys(verdeelOverSeizoenen('[{"id":9}]', "2025-2026")), ["2025-2026"]);
ok("een object blijft heel",          Object.keys(verdeelOverSeizoenen('{"seizoen":"x"}', "2025-2026")), ["2025-2026"]);
ok("een lege lijst blijft heel",      Object.keys(verdeelOverSeizoenen("[]", "2025-2026")), ["2025-2026"]);

/* ══ 4. de bug uit productie, nagespeeld ══ */
groep("het scenario van 10 september 2026");
console.log("   blote sleutels, instellingen zeggen 2025/2026,");
console.log("   maar alle trainingen vallen in augustus/september 2026");
leeg();
_teams = [{ id: "tmtnc8gx3ga1ame", naam: "JO19-2" }];
const V = "tt_tmtnc8gx3ga1ame__";
kast[V + "fch_teaminstellingen_v1"] = JSON.stringify({ seizoen: "2025/2026", teamNaam: "JO19-2" });
kast[V + "fch_trainingen_v1"] = JSON.stringify([
  { id: 101, datum: "2026-08-11" }, { id: 102, datum: "2026-08-18" }, { id: 103, datum: "2026-08-25" },
  { id: 104, datum: "2026-09-01" }, { id: 105, datum: "2026-09-08" },
]);
kast[V + "fch_wedstrijden_v1"] = JSON.stringify([{ id: 201, datum: "2026-09-14" }]);
kast[V + "fch_spelers_v1"] = JSON.stringify([{ id: 301, naam: "Speler" }]);
seizoenVerhuizing();
const laag = (k) => Object.keys(kast).filter((x) => x.startsWith(V) && x.endsWith(k))
  .map((x) => x.slice(V.length, x.length - k.length - 2)).sort();
ok("trainingen landen in 2026-2027, niet in 2025-2026", laag("fch_trainingen_v1"), ["2026-2027"]);
ok("wedstrijden landen in 2026-2027",                   laag("fch_wedstrijden_v1"), ["2026-2027"]);
ok("spelers volgen de datums van de rest",              laag("fch_spelers_v1"), ["2026-2027"]);
ok("alle vijf trainingen zijn bewaard", JSON.parse(kast[V + "2026-2027::fch_trainingen_v1"]).length, 5);
ok("er blijft geen blote sleutel over", Object.keys(kast).filter((k) => k.startsWith(V) && !k.includes("::")).length, 0);
ok("er is GEEN 2025-2026-laag ontstaan", Object.keys(kast).some((k) => k.includes("2025-2026::")), false);

/* ══ 5. de kringloop is verbroken ══ */
groep("een tweede keer draaien doet niets meer");
kast[V + "fch_trainingen_v1"] = JSON.stringify([{ id: 999, datum: "2026-08-11" }]); // server duwt terug
ok("de verhuizing slaat over", seizoenVerhuizing(), 0);
ok("de teruggekomen sleutel blijft onaangeroerd", kast[V + "fch_trainingen_v1"] !== undefined, true);
ok("2026-2027 is niet overschreven", JSON.parse(kast[V + "2026-2027::fch_trainingen_v1"]).length, 5);

/* ══ 6. een botsing laat bestaande gegevens met rust ══ */
groep("botsing — er staat al iets in de doellaag");
leeg();
_teams = [{ id: "teamX", naam: "X" }];
const W = "tt_teamX__";
kast[W + "2026-2027::fch_trainingen_v1"] = JSON.stringify([{ id: 77, datum: "2026-08-01" }]);
kast[W + "fch_trainingen_v1"] = JSON.stringify([{ id: 88, datum: "2026-08-02" }]);
seizoenVerhuizing();
ok("de bestaande laag is NIET overschreven",
   JSON.parse(kast[W + "2026-2027::fch_trainingen_v1"]).map((x) => x.id), [77]);
ok("de blote sleutel is wel opgeruimd", W + "fch_trainingen_v1" in kast, false);

/* ══ 7. de vlag staat per team ══ */
groep("per team, niet per apparaat");
leeg();
_teams = [{ id: "teamA", naam: "A" }];
kast["tt_teamA__fch_trainingen_v1"] = JSON.stringify([{ id: 1, datum: "2026-08-11" }]);
seizoenVerhuizing();
ok("team A is verhuisd", "tt_teamA__2026-2027::fch_trainingen_v1" in kast, true);
ok("de vlag staat op teamA", !!kast["tt_verhuisd_v1_teamA"], true);
ok("er is geen globale vlag", kast["tt_verhuisd_v1"] === undefined, true);
_teams = [{ id: "teamA", naam: "A" }, { id: "teamB", naam: "B" }];
kast["tt_teamB__fch_wedstrijden_v1"] = JSON.stringify([{ id: 2, datum: "2026-09-14" }]);
ok("een team dat later verschijnt wordt alsnog verhuisd",
   (seizoenVerhuizing(), "tt_teamB__2026-2027::fch_wedstrijden_v1" in kast), true);
ok("team A blijft met rust", !("tt_teamA__fch_trainingen_v1" in kast), true);
leeg();
_teams = [];
seizoenVerhuizing();
ok("een apparaat zonder teams zet geen vlag",
   Object.keys(kast).filter((k) => k.startsWith("tt_verhuisd")).length, 0);

/* ── uitslag ──────────────────────────────────────────────── */
console.log(`\n${goed} geslaagd, ${fout} gefaald`);
process.exit(fout ? 1 : 0);
