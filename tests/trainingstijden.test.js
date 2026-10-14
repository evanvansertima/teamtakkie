/* ══════════════════════════════════════════════════════════════
   Tests voor vaste trainingstijden (src/domein/trainingstijden.js)
   Draaien:  node tests/trainingstijden.test.js
   Verzoek van Evan, 14 oktober 2026: niet bij elke training opnieuw
   een tijd invullen; vaste dagen en tijden per team.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const MODULE = process.env.TT_TIJDEN || path.join(__dirname, "..", "src", "domein", "trainingstijden.js");
eval(fs.readFileSync(MODULE, "utf8").replace(/^const /gm, "var "));
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

/* Woensdag 14 oktober 2026. */
const WOENSDAG = new Date(2026, 9, 14, 9, 30);
const DI_DO = [{ dag: 2, tijd: "19:00", duur: 90, locatie: "" }, { dag: 4, tijd: "19:30", duur: 75, locatie: "Kunstgras 2" }];

groep("netjes maken");
ok("geen lijst: leeg", trainingsmomentenNetjes(undefined), []);
ok("rommel eruit, maandag eerst, één per dag", trainingsmomentenNetjes([
  { dag: 0, tijd: "9:00" }, { dag: 4, tijd: "19:30", duur: 75 }, { dag: 4, tijd: "20:00" }, { dag: 9 }, null, "x", { dag: 1.5 }
]).map((m) => [m.dag, m.tijd, m.duur]), [[4, "19:30", 75], [0, "09:00", 90]]);
ok("ongeldige tijd wordt de standaardtijd van die dag", trainingsmomentenNetjes([{ dag: 2, tijd: "25:00" }, { dag: 6, tijd: "" }]).map((m) => m.tijd), ["19:00", "10:00"]);
ok("onzinnige duur wordt 90", trainingsmomentenNetjes([{ dag: 2, duur: 5 }, { dag: 3, duur: "abc" }]).map((m) => m.duur), [90, 90]);

groep("dag aan- en uitzetten");
ok("eerste dag krijgt 19:00 en 90 minuten", wisselTrainingsdag([], 2), [{ dag: 2, tijd: "19:00", duur: 90, locatie: "" }]);
ok("tweede doordeweekse dag neemt tijd en duur over", wisselTrainingsdag([{ dag: 2, tijd: "18:30", duur: 60 }], 4).map((m) => [m.dag, m.tijd, m.duur]), [[2, "18:30", 60], [4, "18:30", 60]]);
ok("weekenddag krijgt een ochtendtijd", wisselTrainingsdag([{ dag: 2, tijd: "18:30", duur: 60 }], 6).map((m) => [m.dag, m.tijd, m.duur]), [[2, "18:30", 60], [6, "10:00", 60]]);
ok("zondag als eerste dag: ochtendtijd", wisselTrainingsdag([], 0)[0].tijd, "10:00");
ok("nog een keer tikken zet hem uit", wisselTrainingsdag(DI_DO, 2).map((m) => m.dag), [4]);

groep("moment op een datum");
ok("donderdag 15 oktober", trainingsmomentOp(DI_DO, "2026-10-15"), DI_DO[1]);
ok("vrijdag: geen training", trainingsmomentOp(DI_DO, "2026-10-16"), null);
ok("lege of foute datum", [trainingsmomentOp(DI_DO, ""), trainingsmomentOp(DI_DO, "15-10-2026")], [null, null]);
ok("zomertijdwissel verschuift de dag niet (zo 25 okt 2026)", trainingsmomentOp([{ dag: 0, tijd: "10:00" }], "2026-10-25") !== null, true);

groep("voorstel voor een nieuwe training");
ok("woensdag: eerstvolgende is donderdag", trainingVoorstel(DI_DO, WOENSDAG, []), { datum: "2026-10-15", tijd: "19:30", duur: 75, locatie: "Kunstgras 2" });
ok("vandaag telt mee", trainingVoorstel([{ dag: 3, tijd: "18:00" }], WOENSDAG, []).datum, "2026-10-14");
ok("donderdag al gepland: dan dinsdag erna", trainingVoorstel(DI_DO, WOENSDAG, ["2026-10-15"]).datum, "2026-10-20");
ok("datum met tijd erachter telt ook als bezet", trainingVoorstel(DI_DO, WOENSDAG, ["2026-10-15T19:30"]).datum, "2026-10-20");
ok("geen vaste dagen: geen voorstel", trainingVoorstel([], WOENSDAG, []), null);
const alles = [];
for (let i = 0; i < 60; i++) { const d = new Date(2026, 9, 14 + i, 12); alles.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")); }
ok("vier weken vol: dan de week erna", trainingVoorstel(DI_DO, WOENSDAG, alles.slice(0, 28)).datum, "2026-11-12");
ok("acht weken alles vol: geen voorstel", trainingVoorstel(DI_DO, WOENSDAG, alles), null);

groep("korte tekst");
ok("twee dagen, twee tijden", trainingsmomentenTekst(DI_DO), "di 19:00 · do 19:30");
ok("zelfde tijd samen", trainingsmomentenTekst([{ dag: 1 }, { dag: 3 }, { dag: 5 }]), "ma, wo en vr 19:00");
ok("leeg", trainingsmomentenTekst([]), "");

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
