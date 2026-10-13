/* ══════════════════════════════════════════════════════════════
   Test: een ander account ziet niets van het vorige account
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/ander-account.test.js

   WAAROM DEZE TEST BESTAAT
   Op 11 oktober 2026 zag Evan met een ander account een toernooi
   ("oefen cup") van zijn eigen account. Uitloggen haalt alles weg,
   maar een verlopen aanmelding of "account aanmaken" in dezelfde
   browser ging langs die deur heen: de gegevens van het vorige account
   bleven staan, zichtbaar voor het nieuwe.
   wisselAccount() in src/kern/server.js onthoudt van wie de gegevens
   zijn en haalt ze weg als er een ánder account inlogt.

   AANTONEN DAT DEZE TEST IETS VANGT
       cp src/kern/server.js /tmp/kapot.js   # en zet in wisselAccount
       # "vorige !== nieuw" om in "false"
       TT_SERVER=/tmp/kapot.js node tests/ander-account.test.js
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const WORTEL = path.join(__dirname, "..");
const SERVER = process.env.TT_SERVER || path.join(WORTEL, "src", "kern", "server.js");
function knip(bestand, naam) {
  const regels = fs.readFileSync(bestand, "utf8").split("\n");
  const a = regels.findIndex((r) => new RegExp("^function " + naam + "\\(").test(r));
  if (a < 0) throw new Error(naam + " niet gevonden");
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}

/* ── nagebootste browser ── */
const opslag = new Map();
global.localStorage = {
  getItem: (k) => (opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => opslag.set(k, String(v)),
  removeItem: (k) => opslag.delete(k),
  key: (i) => Array.from(opslag.keys())[i] || null,
  get length() { return opslag.size; }
};
var SERVER_KEY = "tt_server_v1", APPARAAT_KEY = "tt_apparaat_v1", EIGENAAR_KEY = "tt_eigenaar_v1";
var _teams = [], _actiefTeam = null, _syncStaat = {};
let herladen = 0, sessie = null;
function herlaadInstellingen() { herladen++; }
function zetSessie(s) { sessie = s; }
function serverAan() { return true; }
function serverBoodschap() { return "fout"; }
function verbindingsFout() { return { ok: false }; }
function serverFout(soort, tekst) { return { ok: false, fout: { soort, tekst } }; }
function sessieUit(g) { return g && g.access_token ? { token: g.access_token, gebruikerId: g.user.id } : null; }
let antwoord = null;
function _haalOp() { return Promise.resolve(antwoord); }
eval(knip(path.join(WORTEL, "src", "kern", "sleutels.js"), "wisAllesLokaal"));
eval(knip(SERVER, "wisselAccount"));
eval(knip(SERVER, "serverAanmelden"));
eval(knip(SERVER, "_terugNaBevestiging"));
eval(knip(SERVER, "serverRegistreren"));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
function vulAlsAccountA() {
  opslag.clear();
  opslag.set(SERVER_KEY, "{\"url\":\"x\"}");
  opslag.set(APPARAAT_KEY, "toestel");
  opslag.set(EIGENAAR_KEY, "gebruiker-A");
  opslag.set("tt_teams_v1", "[{\"id\":\"teamA\"}]");
  opslag.set("tt_teamA__2026-2027::fch_toernooien_v2", "[{\"naam\":\"Oefen cup\"}]");
  opslag.set("fch_instellingen_v1", "{}");
}
const heeftOefenCup = () => Array.from(opslag.values()).some((v) => v.indexOf("Oefen cup") >= 0);

(async function () {
  console.log("\ninloggen met een ander account");
  vulAlsAccountA();
  antwoord = { ok: true, gegevens: { access_token: "t", user: { id: "gebruiker-B" } } };
  let r = await serverAanmelden("b@x.nl", "geheim123");
  ok("aanmelden lukt en meldt dat er is opgeruimd", [r.ok, r.gewist], [true, true]);
  ok("de oefen cup van account A is weg", heeftOefenCup(), false);
  ok("de teams van account A zijn weg", opslag.has("tt_teams_v1"), false);
  ok("het serveradres en het toestel blijven staan", [opslag.has(SERVER_KEY), opslag.has(APPARAAT_KEY)], [true, true]);
  ok("account B is nu de eigenaar", opslag.get(EIGENAAR_KEY), "gebruiker-B");
  ok("de sessie is pas gezet nadat er is opgeruimd", sessie && sessie.gebruikerId, "gebruiker-B");

  console.log("\nopnieuw inloggen met hetzelfde account (bijv. na een verlopen aanmelding)");
  vulAlsAccountA();
  antwoord = { ok: true, gegevens: { access_token: "t", user: { id: "gebruiker-A" } } };
  r = await serverAanmelden("a@x.nl", "geheim123");
  ok("niets weggehaald", [r.gewist, heeftOefenCup()], [false, true]);

  console.log("\naccount aanmaken in een browser waar account A werkte");
  vulAlsAccountA();
  antwoord = { ok: true, gegevens: { access_token: "t", user: { id: "gebruiker-C" } } };
  r = await serverRegistreren("c@x.nl", "geheim123");
  ok("de gegevens van A zijn weg", [r.gewist, heeftOefenCup()], [true, false]);

  console.log("\nde app werd nog zonder account gebruikt");
  vulAlsAccountA(); opslag.delete(EIGENAAR_KEY);
  antwoord = { ok: true, gegevens: { access_token: "t", user: { id: "gebruiker-D" } } };
  r = await serverAanmelden("d@x.nl", "geheim123");
  ok("gegevens zonder eigenaar gaan mee naar het eerste account", [r.gewist, heeftOefenCup(), opslag.get(EIGENAAR_KEY)], [false, true, "gebruiker-D"]);

  console.log("\nmislukte aanmelding");
  vulAlsAccountA();
  antwoord = { ok: false, status: 400, gegevens: { msg: "fout" } };
  r = await serverAanmelden("b@x.nl", "verkeerd");
  ok("verkeerd wachtwoord haalt niets weg", [r.ok, heeftOefenCup()], [false, true]);

  console.log(`\n${goed} geslaagd, ${fout} gefaald`);
  if (fout) process.exitCode = 1;
})();
