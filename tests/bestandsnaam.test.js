/* ══════════════════════════════════════════════════════════════
   Tests voor teamBestandsdeel(): de naam van bestanden die een klant
   downloadt (opstelling, tenues).
   Draaien:  node tests/bestandsnaam.test.js

   WAAR HET OM GAAT
   Tot 9 oktober 2026 heette elke download "fc-harlingen-…", bij iedere
   klant. Nu de eigen club- en teamnaam, veilig voor elk
   besturingssysteem, en nooit leeg.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const APP = process.env.TT_APP || path.join(__dirname, "..", "online", "index.html");
const regels = fs.readFileSync(APP, "utf8").split("\n");
function knip(naam) {
  const kop = new RegExp("^function " + naam + "\\(");
  let a = regels.findIndex((r) => kop.test(r));
  if (a < 0) throw new Error(naam + " niet gevonden in " + APP);
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}
var _instellingen = { clubNaam: "", teamNaam: "" };
eval(knip("teamNaamVol"));
eval(knip("teamBestandsdeel"));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const g = echt === verwacht; g ? goed++ : fout++;
  console.log(`  ${g ? "ok  " : "FOUT"} ${naam}` + (g ? "" : `\n        kreeg ${JSON.stringify(echt)}, verwacht ${JSON.stringify(verwacht)}`));
};
const zet = (club, team) => { _instellingen = { clubNaam: club, teamNaam: team }; };

zet("VV De Toekomst", "JO11-1");
ok("club en team, in kleine letters met streepjes", teamBestandsdeel(), "vv-de-toekomst-jo11-1");
zet("SC Één & Twee", "O19 (2)");
ok("accenten en rare tekens worden netjes", teamBestandsdeel(), "sc-een-twee-o19-2");
zet("", "");
ok("nog niets ingevuld: teamtakkie, nooit leeg", teamBestandsdeel(), "teamtakkie");
zet("fc Harlingen", "JO19-2");
ok("de eigen naam, ook als die toevallig fc Harlingen is", teamBestandsdeel(), "fc-harlingen-jo19-2");

const bron = fs.readFileSync(APP, "utf8");
ok("nergens meer een vaste fc-harlingen-bestandsnaam", /["']fc-harlingen|-fc-harlingen-jo19-2/.test(bron), false);
ok("geen vaste kop FC HARLINGEN JO19-2 op het opstellingsplaatje", bron.includes('"FC HARLINGEN JO19-2"'), false);

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
