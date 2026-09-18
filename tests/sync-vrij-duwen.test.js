/* ══════════════════════════════════════════════════════════════
   Tests voor syncEen() in src/kern/sync.js — de afslag voor Free
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/sync-vrij-duwen.test.js

   WAAROM DEZE TEST BESTAAT

   server/17-free-serverdata.sql (18 september 2026) weigert op de
   server elke nieuwe of gewijzigde rij in public.gegevens van een
   club die nog nooit heeft betaald ("Free komt helemaal niet op de
   server", docs/pakketten-besluit.md). Zonder een afslag aan de kant
   van de app zou syncEen() dat verzoek gewoon blijven versturen —
   het duwt toch iedere keer, ongeacht wat de vorige poging teruggaf —
   en de gebruiker zou bij elke sync een rood lampje zien voor iets
   dat hij niet fout doet. Dat is precies dezelfde reden waarom er al
   een afslag bestaat voor "alleen kijken" (rolNu() === "kijker"),
   iets hoger in dezelfde functie.

   syncEen() zelf werd tot nu toe nergens rechtstreeks getest: elk
   ander testbestand vervangt hem door een eigen nepversie om er
   ándere functies (zoals syncTeamGegevens) los van te kunnen testen.
   Dat betekent dat ook de al bestaande "alleen kijken"-afslag tot nu
   toe geen eigen bewijs had. Dit bestand knipt de ECHTE syncEen() uit
   de bron en test beide afslagen samen, plus de belangrijkste grens:
   de Free-afslag geldt alleen voor "gegevens", niet voor
   "persoonlijk" — die tabel is niet aan een pakket gekoppeld.

   AANTONEN DAT DEZE TEST IETS VANGT
   Zet de nieuwe afslag in src/kern/sync.js om (bijvoorbeeld door
   `tabel === "gegevens"` te veranderen in `tabel !== "gegevens"`, of
   door de hele blok tijdelijk te verwijderen) en draai deze test
   opnieuw: hij hoort dan rood te worden op precies de scenario's die
   de Free-afslag toetsen. Kan ook op een kopie:

       cp src/kern/sync.js /tmp/kapot.js
       TT_SYNC=/tmp/kapot.js node tests/sync-vrij-duwen.test.js
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const BRON = process.env.TT_SYNC || path.join(__dirname, "..", "src", "kern", "sync.js");
const regels = fs.readFileSync(BRON, "utf8").split("\n");

function knip(naam) {
  const kop = new RegExp("^function " + naam + "\\(");
  let a = -1;
  for (let i = 0; i < regels.length; i++) if (kop.test(regels[i])) { a = i; break; }
  if (a < 0) throw new Error(naam + " niet gevonden in " + BRON);
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}

/* ── nagebootste omgeving ────────────────────────────────────── */
let vragen = [];
let _besluit = "duw";
let _alleenKijken = false;
let _pakket = "coach";

function syncStaat() { return {gezien: null, schoon: false}; }
function _lees() { return {waarde: "iets"}; }
function syncBesluit() { return _besluit; }
function apparaatId() { return "toestel-1"; }
function alleenKijken() { return _alleenKijken; }
function pakketNu() { return {id: _pakket}; }
function stabiel(x) { return JSON.stringify(x); }
function bewaarVoorTerug() {}
function _schrijf() {}
function zetSyncStaat() {}
function voegSamen(mijn, server) { return {waarde: server, samengevoegd: [], erbij: []}; }
function serverVraag(pad, opties) {
  vragen.push({pad: pad, opties: opties});
  return Promise.resolve({ok: true, gegevens: [{sleutel: "x", waarde: "iets", bijgewerkt_op: "nu"}]});
}

eval(knip("syncEen"));

/* ── minimale testhulp ─────────────────────────────────────── */
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const leeg = () => { vragen = []; _besluit = "duw"; _alleenKijken = false; _pakket = "coach"; };
const groep = (t) => console.log("\n" + t);

async function draai() {

groep("gewone situatie — een betalend pakket duwt gewoon");
leeg();
await syncEen("gegevens", {team_id:"t1"}, "vol", "s1", null, {fouten:[], gehaald:0, samengevoegd:0, botsingen:[]});
ok("er gaat een verzoek uit", vragen.length, 1);
ok("naar de goede tabel", vragen[0].pad, "/rest/v1/gegevens");

groep("bestaande afslag — alleen kijken");
leeg();
_alleenKijken = true;
await syncEen("gegevens", {team_id:"t1"}, "vol", "s1", null, {fouten:[], gehaald:0, samengevoegd:0, botsingen:[]});
ok("er gaat niets uit", vragen.length, 0);

groep("bestaande afslag — alleen kijken, maar ophalen mag gewoon");
leeg();
_alleenKijken = true;
_besluit = "haal";
await syncEen("gegevens", {team_id:"t1"}, "vol", "s1",
  {waarde:"server-versie", bijgewerkt_op:"nu"}, {fouten:[], gehaald:0, samengevoegd:0, botsingen:[]});
ok("ophalen gaat niet via serverVraag (staat al lokaal klaar)", vragen.length, 0);

groep("nieuwe afslag — Free op gegevens duwt niet");
leeg();
_pakket = "free";
let uitslag = {fouten:[], gehaald:0, samengevoegd:0, botsingen:[]};
await syncEen("gegevens", {team_id:"t1"}, "vol", "s1", null, uitslag);
ok("er gaat niets uit", vragen.length, 0);
ok("en er komt ook geen foutmelding van", uitslag.fouten, []);
console.log("   dat is het hele punt: dit is geen fout, dus geen rood lampje");

groep("nieuwe afslag — Free mag nog gewoon OPHALEN uit gegevens");
leeg();
_pakket = "free";
_besluit = "haal";
await syncEen("gegevens", {team_id:"t1"}, "vol", "s1",
  {waarde:"server-versie", bijgewerkt_op:"nu"}, {fouten:[], gehaald:0, samengevoegd:0, botsingen:[]});
ok("ophalen blijft werken, dat gaat buiten serverVraag om", vragen.length, 0);

groep("de grens die ertoe doet — Free duwt PERSOONLIJK gewoon (geen pakket-koppeling)");
leeg();
_pakket = "free";
await syncEen("persoonlijk", {gebruiker_id:"g1"}, "vol", "s1", null, {fouten:[], gehaald:0, samengevoegd:0, botsingen:[]});
ok("er gaat wél een verzoek uit", vragen.length, 1);
ok("naar persoonlijk, niet naar gegevens", vragen[0].pad, "/rest/v1/persoonlijk");
console.log("   server/17-free-serverdata.sql raakt alleen public.gegevens;");
console.log("   zou deze afslag ook persoonlijk blokkeren, dan verliest een");
console.log("   Free-gebruiker zijn eigen, niet-clubgebonden gegevens");

groep("club en coach blijven op gegevens gewoon duwen, ook na de wijziging");
leeg();
_pakket = "club";
await syncEen("gegevens", {team_id:"t1"}, "vol", "s1", null, {fouten:[], gehaald:0, samengevoegd:0, botsingen:[]});
ok("club duwt gewoon", vragen.length, 1);
leeg();
_pakket = "coach";
await syncEen("gegevens", {team_id:"t1"}, "vol", "s1", null, {fouten:[], gehaald:0, samengevoegd:0, botsingen:[]});
ok("coach duwt gewoon", vragen.length, 1);

/* ── uitslag ─────────────────────────────────────────────── */
console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;

}

draai().catch((e) => { console.error(e); process.exitCode = 1; });
