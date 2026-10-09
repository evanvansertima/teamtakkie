/* ══════════════════════════════════════════════════════════════
   Tests voor syncPakket(): welk pakket toont de app?
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/pakket-weergave.test.js

   WAAR HET HIER OM GAAT
   De kolom abonnementen.pakket zegt wat er ooit gekocht is, niet wat
   er nu geldt. Na de einddatum (plus respijt, of zonder respijt na
   opzeggen) is het Free — dat beslist pakket_van_club() op de server.
   Tot 9 oktober 2026 las de app alleen de kolom, en bleef een verlopen
   club in het scherm "Coach" zien terwijl de server hem al als Free
   behandelde. Dan lijkt de app kapot zodra iemand iets opslaat.

   AANTONEN DAT DEZE TEST IETS VANGT
       cp online/index.html /tmp/kapot.html
       # laat in /tmp/kapot.html syncPakket weer rij.pakket gebruiken
       TT_APP=/tmp/kapot.html node tests/pakket-weergave.test.js
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const APP = process.env.TT_APP || path.join(__dirname, "..", "online", "index.html");
const regels = fs.readFileSync(APP, "utf8").split("\n");

function knip(naam) {
  const kop = new RegExp("^function " + naam + "\\(");
  let a = -1;
  for (let i = 0; i < regels.length; i++) if (kop.test(regels[i])) { a = i; break; }
  if (a < 0) throw new Error(naam + " niet gevonden in " + APP);
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}
function knipConst(naam) {
  const kop = new RegExp("^const " + naam + " = ");
  for (let i = 0; i < regels.length; i++)
    if (kop.test(regels[i])) return regels[i].replace(/^const /, "var ");
  throw new Error("const " + naam + " niet gevonden in " + APP);
}

/* ── nagebootste omgeving ── */
const opslag = {};
global.localStorage = {
  getItem: (k) => Object.prototype.hasOwnProperty.call(opslag, k) ? opslag[k] : null,
  setItem: (k, v) => { opslag[k] = String(v); },
  removeItem: (k) => { delete opslag[k]; }
};
let gezet = null;
function zetPakket(id) { gezet = id; }
let rij = null;          // wat /rest/v1/abonnementen teruggeeft
let serverZegt = null;   // wat pakket_van_club teruggeeft, of null = mislukt
let vragen = [];
function serverVraag(pad, opties) {
  vragen.push({ pad, opties });
  if (pad.indexOf("/rest/v1/abonnementen") === 0) return Promise.resolve({ ok: true, gegevens: rij ? [rij] : [] });
  if (pad === "/rest/v1/rpc/pakket_van_club") {
    return Promise.resolve(serverZegt === null ? { ok: false, tekst: "weg" } : { ok: true, gegevens: serverZegt });
  }
  throw new Error("onverwachte vraag: " + pad);
}

eval(knipConst("ABO_TOT_KEY"));
eval(knipConst("ABO_OPGEZEGD_KEY"));
eval(knip("abonnementTot"));
eval(knip("zetAbonnementTot"));
eval(knip("abonnementOpgezegd"));
eval(knip("zetAbonnementOpgezegd"));
eval(knip("_vandaagLokaal"));
eval(knip("syncPakket"));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const leeg = () => { gezet = null; rij = null; serverZegt = null; vragen = [];
  Object.keys(opslag).forEach((k) => delete opslag[k]); };
const CLUB = "11111111-2222-3333-4444-555555555555";

(async function () {
  console.log("\nde server beslist, niet de kolom");
  leeg();
  rij = { pakket: "coach", geldig_tot: "2020-01-01", opgezegd_op: null };
  serverZegt = "free";
  await syncPakket(CLUB);
  ok("verlopen zonder opzegging: de app toont Free, zoals de server zegt", gezet, "free");
  ok("en vraagt het pakket_van_club() voor déze club",
     vragen[1] && [vragen[1].pad, vragen[1].opties.lichaam.doel], ["/rest/v1/rpc/pakket_van_club", CLUB]);

  leeg();
  rij = { pakket: "coach", geldig_tot: "2020-01-01", opgezegd_op: null };
  serverZegt = "coach";
  await syncPakket(CLUB);
  ok("in de respijtperiode zegt de server nog coach, en dan de app ook", gezet, "coach");

  leeg();
  rij = { pakket: "club", geldig_tot: "2099-01-01", opgezegd_op: "2026-10-09T07:00:00Z" };
  serverZegt = "club";
  await syncPakket(CLUB);
  ok("opgezegd maar nog lopend: club", gezet, "club");
  ok("en de opzegging wordt onthouden", opslag["tt_abo_opgezegd_v1"], "2026-10-09T07:00:00Z");
  ok("met de einddatum", opslag["tt_abo_tot_v1"], "2099-01-01");

  console.log("\nlukt de vraag aan de server niet");
  leeg();
  rij = { pakket: "coach", geldig_tot: "2020-01-01", opgezegd_op: "2019-12-01T00:00:00Z" };
  serverZegt = null;
  await syncPakket(CLUB);
  ok("opgezegd en verlopen: toch Free", gezet, "free");
  ok("en geen opzegging meer tonen bij een verlopen abonnement", opslag["tt_abo_opgezegd_v1"], undefined);

  leeg();
  rij = { pakket: "coach", geldig_tot: "2099-01-01", opgezegd_op: null };
  serverZegt = null;
  await syncPakket(CLUB);
  ok("lopend: de kolom is dan het beste antwoord", gezet, "coach");

  leeg();
  rij = null;
  serverZegt = "free";
  opslag["tt_abo_tot_v1"] = "2026-01-01";
  await syncPakket(CLUB);
  ok("geen abonnementsrij: de oude einddatum verdwijnt", opslag["tt_abo_tot_v1"], undefined);

  console.log(`\n${goed} geslaagd, ${fout} gefaald`);
  if (fout) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exitCode = 1; });
