/* ══════════════════════════════════════════════════════════════
   Tests voor het verwijderen van een seizoen
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/seizoen-verwijderen.test.js

   Twee delen, twee bronnen, net als bij het weggooien van een team
   (wisTeam/duwTeamsWeg): eerst het lokale deel (wisSeizoen() en zijn
   grafsteen in src/kern/sleutels.js), dan het sync-deel
   (duwSeizoenenWeg() in src/kern/sync.js). Beide worden als tekst uit
   de bron geknipt en tegen een nagebootste omgeving gedraaid — geen
   testframework, geen npm install, en geen kopie die uit de pas kan
   lopen met wat er echt in de app staat. Zie tests/sync.test.js voor
   de uitleg van deze knip-en-eval-techniek in detail.

   Waar het hier om gaat: een seizoen zit niet in een eigen servertabel
   zoals een team, maar letterlijk in de sleutel — lokaal als
   "tt_<team>__<seizoen>::<basis>", op de server als "<seizoen>::<basis>"
   in de kolom sleutel van public.gegevens. Weggooien is dus geen rij
   verwijderen maar een voorvoegsel matchen, en dát voorvoegsel moet
   precies goed zijn: te kort en je raakt een ander seizoen, te lang (of
   het team ontbreekt) en je raakt niets. Evan heeft bovendien besloten
   dat het geopende seizoen nooit weg mag — dat is de dubbele bodem die
   hieronder apart wordt getest. */

const fs = require("fs");
const path = require("path");

const SLEUTELS = path.join(__dirname, "..", "src", "kern", "sleutels.js");
const regelsSleutels = fs.readFileSync(SLEUTELS, "utf8").split("\n");
const SYNC = path.join(__dirname, "..", "src", "kern", "sync.js");
const regelsSync = fs.readFileSync(SYNC, "utf8").split("\n");

/* Zelfde knipper als in tests/sync.test.js: één functie, van zijn kop
   tot de eerste } op kolom 1, uit de opgegeven regelset. */
function knipUit(bronRegels, bronNaam, naam) {
  const kop = new RegExp("^function " + naam + "\\(");
  let a = -1;
  for (let i = 0; i < bronRegels.length; i++) if (kop.test(bronRegels[i])) { a = i; break; }
  if (a < 0) throw new Error(naam + " niet gevonden in " + bronNaam);
  let e = a; while (e < bronRegels.length && !/^\}/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knipSleutels(naam) { return knipUit(regelsSleutels, "src/kern/sleutels.js", naam); }
function knipSync(naam) { return knipUit(regelsSync, "src/kern/sync.js", naam); }

/* Het lokale deel: wisSeizoen() met alles waar hij zelf van afhangt —
   de grafsteenfuncties, en de seizoenlogica die seizoenNu()/seizoenenVan()
   nodig hebben. */
function knipLokaalBlok() {
  return ["seizoenVanDatum", "seizoenUitSleutel", "heeftLaag", "seizoenenVan",
          "seizoenKeuzes", "seizoenNu",
          "seizoenenWeg", "seizoenIsWeg", "noteerSeizoenWeg", "vergeetSeizoenWeg",
          "wisSeizoen"].map(knipSleutels).join("\n");
}
/* Het sync-deel: duwSeizoenenWeg() plus de generieke opEenRij() die hij
   gebruikt. seizoenenWeg()/vergeetSeizoenWeg() komen uit het lokale
   blok hierboven, dat vóór dit blok wordt ge-eval'd. */
function knipSyncBlok() {
  return ["opEenRij", "duwSeizoenenWeg"].map(knipSync).join("\n");
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

/* SEIZOENACTIEF_KEY/SEIZOENENWEG_KEY zijn top-level const's in
   sleutels.js, buiten het bereik van knipUit (die knipt op functies).
   Hardcoded overnemen, zoals tests/seizoen.test.js dat al deed voor
   SEIZOENACTIEF_KEY/TEAMS_KEY. */
const SEIZOENACTIEF_KEY = "tt_seizoenactief_v1";
const SEIZOENENWEG_KEY = "tt_seizoenen_weg_v1";

/* herlaadInstellingen() en syncStraks() zijn functies uit src/app.jsx
   die wisSeizoen() aanroept — precies zoals wisTeam() dat ook doet.
   Hier tellen we alleen hoe vaak dat gebeurt. */
let herlaadTeller = 0;
function herlaadInstellingen() { herlaadTeller++; }
let syncStraksAanroepen = [];
function syncStraks(ms) { syncStraksAanroepen.push(ms); }

eval(knipLokaalBlok());

/* ── nagebootste server, zelfde stijl als tests/sync.test.js ──── */
let vragen = [];
let antwoord = { ok: true, gegevens: [] };
function serverVraag(pad, opties) {
  vragen.push({ pad: pad, opties: opties || null });
  return Promise.resolve(antwoord);
}

eval(knipSyncBlok());

/* ── minimale testhulp ─────────────────────────────────────── */
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const leeg = () => {
  for (const k of Object.keys(kast)) delete kast[k];
  vragen = []; antwoord = { ok: true, gegevens: [] };
  herlaadTeller = 0; syncStraksAanroepen = [];
};
const groep = (t) => console.log("\n" + t);

async function draai() {

/* ══ 1. LOKAAL — wisSeizoen gooit precies het juiste weg ══ */
groep("wisSeizoen — alleen dit team, dit seizoen");
leeg();
kast["tt_team1__2025-2026::fch_spelers_v1"] = "[]";
kast["tt_team1__2025-2026::fch_wedstrijden_v1"] = "[]";
kast["tt_team1__2026-2027::fch_spelers_v1"] = "[]";          // ander seizoen, zelfde team
kast["tt_team2__2025-2026::fch_spelers_v1"] = "[]";          // zelfde seizoen, ander team
kast[SEIZOENACTIEF_KEY] = JSON.stringify({ team1: "2026-2027", team2: "2025-2026" });

const rest = wisSeizoen("team1", "2025-2026");

ok("(a) spelers van het weggegooide seizoen zijn weg",
   "tt_team1__2025-2026::fch_spelers_v1" in kast, false);
ok("(a) wedstrijden van het weggegooide seizoen zijn weg",
   "tt_team1__2025-2026::fch_wedstrijden_v1" in kast, false);
ok("(b) een ander seizoen van hetzelfde team blijft staan",
   "tt_team1__2026-2027::fch_spelers_v1" in kast, true);
ok("(b) hetzelfde seizoen van een ander team blijft staan",
   "tt_team2__2025-2026::fch_spelers_v1" in kast, true);
ok("(c) er staat een grafsteen voor team1/2025-2026",
   seizoenIsWeg("team1", "2025-2026"), true);
ok("(c) er staat GEEN grafsteen voor team2 (ander team, zelfde seizoen)",
   seizoenIsWeg("team2", "2025-2026"), false);
ok("de resterende seizoenen van team1 komen terug",
   rest, seizoenenVan("team1"));
ok("en dat is alleen nog 2026-2027", rest, ["2026-2027"]);
ok("herlaadInstellingen is aangeroepen", herlaadTeller, 1);
ok("syncStraks is meteen aangeroepen (vertraging 0)", syncStraksAanroepen, [0]);

/* ══ 2. LOKAAL — de dubbele bodem: het geopende seizoen niet ══ */
groep("wisSeizoen — het geopende seizoen wordt NOOIT gewist");
leeg();
kast["tt_team1__2026-2027::fch_spelers_v1"] = "[]";
kast[SEIZOENACTIEF_KEY] = JSON.stringify({ team1: "2026-2027" });

const restNa = wisSeizoen("team1", "2026-2027");   // het huidige seizoen

ok("(d) de gegevens van het geopende seizoen blijven onaangeroerd",
   "tt_team1__2026-2027::fch_spelers_v1" in kast, true);
ok("(d) er wordt geen grafsteen gezet voor het geopende seizoen",
   seizoenIsWeg("team1", "2026-2027"), false);
ok("(d) herlaadInstellingen wordt niet aangeroepen", herlaadTeller, 0);
ok("(d) syncStraks wordt niet aangeroepen", syncStraksAanroepen, []);
ok("(d) de functie geeft gewoon de bestaande seizoenen terug",
   restNa, ["2026-2027"]);

/* ══ 3. SYNC — duwSeizoenenWeg: het exacte pad en filter ══ */
groep("duwSeizoenenWeg — het DELETE-verzoek");
leeg();
noteerSeizoenWeg("team1", "2025-2026");
antwoord = { ok: true, gegevens: [{ sleutel: "2025-2026::fch_spelers_v1" }] };
await duwSeizoenenWeg("team1");
ok("er gaat precies één verzoek naar de server", vragen.length, 1);
ok("het is een DELETE", vragen[0].opties.methode, "DELETE");
ok("met Prefer: return=representation", vragen[0].opties.koppen, { "Prefer": "return=representation" });
ok("het exacte pad — team en seizoen-filter kloppen",
   vragen[0].pad, "/rest/v1/gegevens?team_id=eq.team1&sleutel=like.2025-2026::*");

/* ══ 4. SYNC — de grafsteen verdwijnt pas na een ok-respons ══ */
groep("duwSeizoenenWeg — de grafsteen ná een geslaagd antwoord");
leeg();
noteerSeizoenWeg("team1", "2025-2026");
antwoord = { ok: true, gegevens: [] };   // nul geraakte rijen — hier gewoon "stond toch al niets"
await duwSeizoenenWeg("team1");
ok("de grafsteen is weg, ook al waren er nul geraakte rijen",
   seizoenIsWeg("team1", "2025-2026"), false);

/* ══ 5. SYNC — de grafsteen blijft staan bij een fout ══ */
groep("duwSeizoenenWeg — een mislukt antwoord laat de grafsteen staan");
leeg();
noteerSeizoenWeg("team1", "2025-2026");
antwoord = { ok: false, fout: "server", tekst: "Het lukte niet." };
await duwSeizoenenWeg("team1");
ok("de grafsteen blijft staan na een fout", seizoenIsWeg("team1", "2025-2026"), true);
ok("er is wel geprobeerd", vragen.length, 1);

/* ══ 6. SYNC — alleen de grafstenen van dít team ══ */
groep("duwSeizoenenWeg — per team, niet globaal");
leeg();
noteerSeizoenWeg("team1", "2025-2026");
noteerSeizoenWeg("team2", "2025-2026");
antwoord = { ok: true, gegevens: [] };
await duwSeizoenenWeg("team1");
ok("er gaat maar één verzoek — dat van team1", vragen.length, 1);
ok("team1's grafsteen is weg", seizoenIsWeg("team1", "2025-2026"), false);
ok("team2's grafsteen blijft ongemoeid staan", seizoenIsWeg("team2", "2025-2026"), true);

/* ══ 7. SYNC — niets weg te duwen, dan ook geen verzoek ══ */
groep("duwSeizoenenWeg — zonder grafstenen gebeurt er niets");
leeg();
const zonder = await duwSeizoenenWeg("team1");
ok("geen enkel verzoek", vragen.length, 0);
ok("meldt zich toch keurig klaar", zonder, { ok: true });

}

/* ── uitslag ──────────────────────────────────────────────── */
draai().then(() => {
  console.log(`\n${goed} geslaagd, ${fout} gefaald`);
  process.exit(fout ? 1 : 0);
}, (e) => {
  console.log("\nDe test zelf liep vast: " + (e && e.stack || e));
  console.log(`\n${goed} geslaagd, ${fout + 1} gefaald`);
  process.exit(1);
});
