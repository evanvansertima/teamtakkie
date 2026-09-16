/* ══════════════════════════════════════════════════════════════
   Tests voor syncTeamGegevens in src/app.jsx
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/sync.test.js

   Deze test knipt de synchronisatiefuncties uit de app zelf en draait
   ze tegen een nagebootste localStorage en een nagebootste
   serverVraag(). Geen testframework, geen npm install — node en
   verder niets.

   Waarom uit het bestand zelf en niet een kopie: een kopie loopt uit
   de pas. Deze test faalt zodra iemand de functies hernoemt, en dat
   is precies wat je wilt weten.

   Waar het hier om gaat: syncTeamGegevens is de plek waar de kringloop
   wordt verbroken. Sleutels van vóór de seizoenen — zonder :: erin —
   staan nog op de server. Worden ze weer opgehaald of geduwd, dan zet
   de verhuizing ze bij de volgende lading in het dan actieve seizoen,
   en vult elk nieuw seizoen zich met de inhoud van vóór de verhuizing.
   Dat is de bug van 10 september 2026, en de seizoentests vangen hem
   niet: die kijken naar het apparaat, niet naar de uitwisseling.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

/* Sinds de bouwstap (P1) is src/app.jsx de bron die mensen bewerken en
   is online/index.html wat esbuild daarvan maakt: zonder commentaar,
   met de JSX al vertaald en met eenregelige functies over drie regels
   uitgespreid. Deze test knipt op tekst en beantwoordt daarmee de
   vraag "heeft iemand een functie hernoemd of kapotgemaakt" — een
   vraag over de bron. Zou hij het gebouwde bestand lezen, dan werd hij
   ook rood van een nieuwe esbuild-versie die anders afdrukt: ruis die
   niets over de app zegt.

   Of de bóuwstap zelf iets verandert is een andere vraag, en die wordt
   beantwoord waar hij hoort: tools/gouden-origineel.js draait het
   gebouwde online/index.html in een echte browser en vergelijkt de DOM
   en de beeldpunten. Dat vangt precies wat deze knip niet kan zien. */
const APP = path.join(__dirname, "..", "src", "app.jsx");
const regels = fs.readFileSync(APP, "utf8").split("\n");

/* heeftLaag() hoort van oudsher bij de seizoenfamilie (het bepaalt of
   een sleutel al een ::seizoen-laag heeft) en niet bij synchroniseren
   zelf — maar syncTeamGegevens gebruikt hem wel, dus deze test knipte
   hem al mee. Sinds P2 (professionaliseringsplan.md, stap 1) is die
   hele seizoenfamilie verplaatst naar src/kern/sleutels.js, terwijl
   syncTeamGegevens zelf voorlopig nog in src/app.jsx staat (die
   verplaatsing is stap 5). Vandaar twee bronnen voor deze ene knip. */
const SLEUTELS = path.join(__dirname, "..", "src", "kern", "sleutels.js");
const regelsSleutels = fs.readFileSync(SLEUTELS, "utf8").split("\n");

/* Eén functie, van zijn kop tot de eerste } op kolom 1 — uit de
   opgegeven regelset, zodat dezelfde knipper voor beide bronnen werkt. */
function knipUit(bronRegels, bronNaam, naam) {
  const kop = new RegExp("^function " + naam + "\\(");
  let a = -1;
  for (let i = 0; i < bronRegels.length; i++) if (kop.test(bronRegels[i])) { a = i; break; }
  if (a < 0) throw new Error(naam + " niet gevonden in " + bronNaam);
  let e = a; while (e < bronRegels.length && !/^\}/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knip(naam) { return knipUit(regels, "src/app.jsx", naam); }
function knipBlok() {
  return knipUit(regelsSleutels, "src/kern/sleutels.js", "heeftLaag") + "\n" +
    ["teamSleutelsVan", "opEenRij", "syncTeamGegevens"].map(knip).join("\n");
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

/* ── nagebootste server ────────────────────────────────────────
   Legt elke aanroep vast en geeft terug wat de test heeft klaargezet.
   Zo is te zien wát er gevraagd wordt, en hoe vaak. */
let vragen = [];
let antwoord = { ok: true, gegevens: [] };
function serverVraag(pad, opties) {
  vragen.push({ pad: pad, opties: opties || null });
  return Promise.resolve(antwoord);
}
/* Rijen zoals de tabel gegevens ze teruggeeft */
const rij = (sleutel, waarde) => ({
  sleutel: sleutel, waarde: waarde === undefined ? "[]" : waarde,
  bijgewerkt_op: "2026-09-10T12:00:00Z", apparaat: "ander-apparaat",
});
const opServer = (...rijen) => { antwoord = { ok: true, gegevens: rijen }; };

/* ── nagebootste syncEen ───────────────────────────────────────
   Het echte werk van syncEen is elders gedekt; hier telt alleen
   wélke sleutel er langskomt, met welke argumenten, en of dat er
   één tegelijk is. */
let gesynct = [];
let bezig = 0, meestTegelijk = 0;
function syncEen(tabel, waar, volle, sleutel, server, uitslag) {
  gesynct.push({
    tabel: tabel, waar: waar, volle: volle, sleutel: sleutel,
    server: server ? server.sleutel : null, uitslag: uitslag,
  });
  bezig++; if (bezig > meestTegelijk) meestTegelijk = bezig;
  return new Promise((klaar) => setImmediate(() => { bezig--; klaar(); }));
}

eval(knipBlok());

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
  vragen = []; gesynct = []; bezig = 0; meestTegelijk = 0;
  antwoord = { ok: true, gegevens: [] };
};
const groep = (t) => console.log("\n" + t);

/* De sleutels die daadwerkelijk zijn uitgewisseld, op alfabet */
const uitgewisseld = () => gesynct.map((g) => g.sleutel).sort();
const UITSLAG = () => ({ geduwd: 0, gehaald: 0, samengevoegd: 0, botsingen: [], fouten: [] });

async function draai() {

/* ══ 1. wat er aan de server gevraagd wordt ══ */
groep("de vraag aan de server — één keer, en met dit team erin");
leeg();
kast["tt_team1__2026-2027::fch_trainingen_v1"] = "[]";
await syncTeamGegevens({ id: "team1", naam: "JO19-2" }, UITSLAG());
ok("er gaat precies één vraag naar de server", vragen.length, 1);
ok("het is een leesvraag zonder opties", vragen[0].opties, null);
ok("hij gaat naar de tabel gegevens", /^\/rest\/v1\/gegevens\?/.test(vragen[0].pad), true);
ok("hij filtert op dit team", vragen[0].pad.indexOf("team_id=eq.team1") >= 0, true);
ok("hij vraagt om waarde en bijgewerkt_op",
   /select=sleutel,waarde,bijgewerkt_op,apparaat/.test(vragen[0].pad), true);
leeg();
kast["tt_a+b/c__2026-2027::fch_trainingen_v1"] = "[]";
await syncTeamGegevens({ id: "a+b/c" }, UITSLAG());
ok("een team-id met rare tekens wordt gecodeerd",
   vragen[0].pad.indexOf("team_id=eq.a%2Bb%2Fc") >= 0, true);

/* ══ 2. het bekende gat: blote sleutels ══ */
groep("blote sleutels gaan NIET mee in de sync");
console.log("   een sleutel zonder :: komt van vóór de seizoenen;");
console.log("   nemen we hem mee, dan begint de kringloop opnieuw");
leeg();
kast["tt_team1__2026-2027::fch_trainingen_v1"] = "[]";
kast["tt_team1__fch_trainingen_v1"] = "[]";           // bloot, op dit apparaat
kast["tt_team1__fch_teaminstellingen_v1"] = "{}";     // bloot, op dit apparaat
await syncTeamGegevens({ id: "team1" }, UITSLAG());
ok("de gelaagde sleutel wordt uitgewisseld", uitgewisseld(), ["2026-2027::fch_trainingen_v1"]);
ok("de blote sleutel van het apparaat wordt niet geduwd",
   uitgewisseld().some((s) => s.indexOf("::") < 0), false);

leeg();
opServer(rij("fch_trainingen_v1"), rij("fch_wedstrijden_v1"), rij("fch_spelers_v1"));
await syncTeamGegevens({ id: "team1" }, UITSLAG());
ok("blote sleutels van de server worden niet opgehaald", gesynct.length, 0);

leeg();
kast["tt_team1__2026-2027::fch_trainingen_v1"] = "[]";
opServer(rij("2026-2027::fch_wedstrijden_v1"), rij("fch_wedstrijden_v1"));
await syncTeamGegevens({ id: "team1" }, UITSLAG());
ok("een gelaagde sleutel die alleen op de server staat komt er wél bij",
   uitgewisseld(), ["2026-2027::fch_trainingen_v1", "2026-2027::fch_wedstrijden_v1"]);

leeg();
kast["tt_team1__archief-verhuizing::fch_trainingen_v1"] = "[]";
await syncTeamGegevens({ id: "team1" }, UITSLAG());
ok("een geparkeerde laag telt als verhuisd en gaat gewoon mee",
   uitgewisseld(), ["archief-verhuizing::fch_trainingen_v1"]);

/* ══ 3. elke sleutel precies één keer ══ */
groep("geen sleutel dubbel");
leeg();
kast["tt_team1__2026-2027::fch_trainingen_v1"] = "[]";
kast["tt_team1__2026-2027::fch_spelers_v1"] = "[]";
opServer(rij("2026-2027::fch_trainingen_v1"), rij("2026-2027::fch_spelers_v1"));
await syncTeamGegevens({ id: "team1" }, UITSLAG());
ok("hier en daar bekend blijft één uitwisseling", gesynct.length, 2);
ok("en het zijn deze twee", uitgewisseld(),
   ["2026-2027::fch_spelers_v1", "2026-2027::fch_trainingen_v1"]);

/* ══ 4. het scenario van 10 september 2026 ══ */
groep("de kringloop — dezelfde vijf trainingen in twee seizoenen");
console.log("   de server heeft nog de blote rij met id 101 t/m 105,");
console.log("   én dezelfde vijf onder 2026-2027");
leeg();
const VIJF = JSON.stringify([{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }, { id: 105 }]);
kast["tt_tmtnc8gx3ga1ame__2026-2027::fch_trainingen_v1"] = VIJF;
opServer(rij("fch_trainingen_v1", VIJF), rij("2026-2027::fch_trainingen_v1", VIJF));
await syncTeamGegevens({ id: "tmtnc8gx3ga1ame", naam: "JO19-2" }, UITSLAG());
ok("alleen de trainingen van dit seizoen gaan over de lijn",
   uitgewisseld(), ["2026-2027::fch_trainingen_v1"]);
ok("de oude rij op de server wordt met rust gelaten (niet gehaald, niet geduwd)",
   gesynct.filter((g) => g.sleutel === "fch_trainingen_v1").length, 0);
ok("de oude rij blijft wel gewoon op de server staan",
   antwoord.gegevens.some((g) => g.sleutel === "fch_trainingen_v1"), true);
ok("er wordt niets verwijderd", vragen.filter((v) => v.opties).length, 0);

/* ══ 5. alleen dit team ══ */
groep("sleutels van andere teams blijven buiten");
leeg();
kast["tt_team1__2026-2027::fch_trainingen_v1"] = "[]";
kast["tt_team2__2026-2027::fch_trainingen_v1"] = "[]";
kast["fch_trainingen_v1"] = "[]";
kast["tt_teams_v1"] = "[]";
await syncTeamGegevens({ id: "team1" }, UITSLAG());
ok("één sleutel, en die van team1", gesynct.length, 1);
ok("de volle sleutel draagt het voorvoegsel van het team",
   gesynct[0].volle, "tt_team1__2026-2027::fch_trainingen_v1");
ok("de korte sleutel is zonder voorvoegsel",
   gesynct[0].sleutel, "2026-2027::fch_trainingen_v1");

/* ══ 6. wat syncEen meekrijgt ══ */
groep("de argumenten aan syncEen");
leeg();
kast["tt_team1__2026-2027::fch_trainingen_v1"] = "[]";
kast["tt_team1__2026-2027::fch_spelers_v1"] = "[]";
opServer(rij("2026-2027::fch_spelers_v1"));
const eigenUitslag = UITSLAG();
const klaar = await syncTeamGegevens({ id: "team1" }, eigenUitslag);
ok("de tabel is gegevens", gesynct.map((g) => g.tabel), ["gegevens", "gegevens"]);
ok("de voorwaarde is dit team", gesynct[0].waar, { team_id: "team1" });
ok("wat op de server staat wordt meegegeven",
   gesynct.find((g) => g.sleutel === "2026-2027::fch_spelers_v1").server,
   "2026-2027::fch_spelers_v1");
ok("wat er niet staat wordt als niets meegegeven",
   gesynct.find((g) => g.sleutel === "2026-2027::fch_trainingen_v1").server, null);
ok("dezelfde uitslag gaat door de hele rij heen",
   gesynct.every((g) => g.uitslag === eigenUitslag), true);
ok("de functie meldt zich klaar", klaar, { ok: true });

/* ══ 7. één voor één, niet tegelijk ══ */
groep("één verzoek tegelijk — een telefoon met één streepje bereik");
leeg();
for (let i = 1; i <= 6; i++) kast["tt_team1__2026-2027::soort" + i] = "[]";
await syncTeamGegevens({ id: "team1" }, UITSLAG());
ok("zes sleutels uitgewisseld", gesynct.length, 6);
ok("er is er nooit meer dan één tegelijk bezig", meestTegelijk, 1);
ok("en in de volgorde van de opslag",
   gesynct.map((g) => g.sleutel),
   ["2026-2027::soort1", "2026-2027::soort2", "2026-2027::soort3",
    "2026-2027::soort4", "2026-2027::soort5", "2026-2027::soort6"]);

/* ══ 8. de server doet niet mee ══ */
groep("als de server een fout teruggeeft");
leeg();
kast["tt_team1__2026-2027::fch_trainingen_v1"] = "[]";
antwoord = { ok: false, fout: "server", tekst: "Het lukte niet." };
const mis = await syncTeamGegevens({ id: "team1" }, UITSLAG());
ok("de fout komt onveranderd terug", mis, { ok: false, fout: "server", tekst: "Het lukte niet." });
ok("er wordt niets uitgewisseld", gesynct.length, 0);

leeg();
kast["tt_team1__2026-2027::fch_trainingen_v1"] = "[]";
antwoord = { ok: true, gegevens: null };
ok("een antwoord zonder lijst loopt niet vast",
   await syncTeamGegevens({ id: "team1" }, UITSLAG()), { ok: true });
ok("en het apparaat duwt zijn eigen sleutel alsnog",
   uitgewisseld(), ["2026-2027::fch_trainingen_v1"]);

leeg();
antwoord = { ok: true, gegevens: { boodschap: "geen lijst" } };
ok("een antwoord dat helemaal geen rijen is loopt ook niet vast",
   await syncTeamGegevens({ id: "team1" }, UITSLAG()), { ok: true });
ok("en er valt dan niets uit te wisselen", gesynct.length, 0);

/* ══ 9. niets te doen ══ */
groep("een team zonder gegevens");
leeg();
ok("meldt zich gewoon klaar", await syncTeamGegevens({ id: "leegteam" }, UITSLAG()), { ok: true });
ok("zonder iets uit te wisselen", gesynct.length, 0);
ok("maar hij heeft wel gekeken", vragen.length, 1);

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
