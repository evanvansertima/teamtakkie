/* ══════════════════════════════════════════════════════════════
   Tests voor categorie en spelvorm (src/domein/spelvorm.js) en de
   kleine formaties in FORMATIES_DATA (src/app.jsx)
   Draaien:  node tests/spelvorm.test.js
   Aanleiding, 15 oktober 2026: een O10 speelt 6 tegen 6, maar de app
   kende alleen 11 tegen 11.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const BRON = process.env.TT_SPELVORM || path.join(__dirname, "..", "src", "domein", "spelvorm.js");
eval(fs.readFileSync(BRON, "utf8").replace(/^const /gm, "var "));

/* FORMATIES_DATA en FORMATIE_GROEPEN uit de app zelf knippen. */
const app = fs.readFileSync(process.env.TT_APP || path.join(__dirname, "..", "src", "app.jsx"), "utf8");
const knip = (naam) => {
  const start = app.indexOf("const " + naam + " = ");
  if (start < 0) throw new Error(naam + " niet gevonden in src/app.jsx");
  const eind = app.indexOf("\n};", start) >= 0 && naam === "FORMATIES_DATA" ? app.indexOf("\n};", start) + 3 : app.indexOf("\n];", start) + 3;
  return app.slice(start, eind).replace(/^const /, "var ");
};
eval(knip("FORMATIES_DATA")); eval(knip("FORMATIE_GROEPEN"));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

groep("de KNVB-indeling");
const sv = (id) => teamCategorie(id).spelvorm;
ok("O6 2x2, O7 4x4", [sv("O6"), sv("O7")], ["2x2", "4x4"]);
ok("O8 t/m O10 6x6", [sv("O8"), sv("O9"), sv("O10")], ["6x6", "6x6", "6x6"]);
ok("O11 en O12 8x8", [sv("O11"), sv("O12")], ["8x8", "8x8"]);
ok("O13 t/m senioren 11x11", ["O13", "O15", "O19", "Senioren"].map(sv), ["11x11", "11x11", "11x11", "11x11"]);
ok("speelduur waar de KNVB hem noemt", ["O8", "O10", "O11", "O15", "O16", "O19"].map((c) => teamCategorie(c).duur), [40, 50, 60, 70, 80, 90]);
ok("geen verzonnen speelduur", ["O6", "O7", "O13", "O14"].map((c) => teamCategorie(c).duur), [null, null, null, null]);

groep("categorie uit de teamnaam");
ok("JO10-1", categorieUitTeamnaam("JO10-1"), "O10");
ok("MO11", categorieUitTeamnaam("MO11-2"), "O11");
ok("O8-3", categorieUitTeamnaam("O8-3"), "O8");
ok("JO19-2", categorieUitTeamnaam("JO19-2"), "O19");
ok("JO18 wordt O19", categorieUitTeamnaam("JO18-1"), "O19");
ok("Onder 9", categorieUitTeamnaam("Onder 9"), "O9");
ok("Heren 1", categorieUitTeamnaam("Heren 1"), "Senioren");
ok("geen idee", categorieUitTeamnaam("Zaterdag 4"), null);
ok("niet uit een jaartal", categorieUitTeamnaam("Team 2026"), null);

groep("spelvorm van het team");
ok("gekozen wint", teamSpelvorm({ spelvorm: "7x7", categorie: "O10" }), "7x7");
ok("dan de categorie", teamSpelvorm({ categorie: "O11", teamNaam: "JO9-1" }), "8x8");
ok("dan de naam", teamSpelvorm({ teamNaam: "JO10-1" }), "6x6");
ok("anders 11x11, zoals altijd", teamSpelvorm({ teamNaam: "Zaterdag 4" }), "11x11");
ok("onzin-spelvorm telt niet", teamSpelvorm({ spelvorm: "5x5", teamNaam: "JO10" }), "6x6");

groep("formaties");
ok("11x11 krijgt alle bestaande groepen", formatieGroepenVoor("11x11", FORMATIE_GROEPEN), FORMATIE_GROEPEN);
const elke = SPELVORM_VOLGORDE.filter((k) => SPELVORM_INFO[k].formaties);
ok("elke formatie bestaat en hoort bij zijn spelvorm",
   elke.every((k) => SPELVORM_INFO[k].formaties.every((f) => spelvormVanFormatie(f, FORMATIES_DATA) === k)), true);
ok("de standaard staat in de lijst", elke.every((k) => SPELVORM_INFO[k].formaties.indexOf(SPELVORM_INFO[k].standaard) >= 0), true);
ok("alle 11x11-formaties tellen als 11x11",
   FORMATIE_GROEPEN.every((g) => g.namen.every((f) => spelvormVanFormatie(f, FORMATIES_DATA) === "11x11")), true);
ok("plek-id's uniek binnen een formatie",
   Object.keys(FORMATIES_DATA).every((f) => new Set(FORMATIES_DATA[f].map((p) => p.id)).size === FORMATIES_DATA[f].length), true);
ok("met keeper: precies één doelman", elke.filter((k) => SPELVORM_INFO[k].keeper)
   .every((k) => SPELVORM_INFO[k].formaties.every((f) => FORMATIES_DATA[f].filter((p) => p.l === "DM").length === 1)), true);

const NEP = { zes: [1, 2, 3, 4, 5, 6].map((i) => ({ id: "p" + i, l: "CM" })) };
ok("zes plekken zonder keeper is geen 6 tegen 6", spelvormVanFormatie("zes", NEP), null);

groep("waar een opstelling mee begint");
ok("O10 met het oude 4-3-3A: 2-1-2", passendeFormatie("4-3-3A", "6x6", FORMATIES_DATA, false), "2-1-2");
ok("al ingevulde opstelling blijft", passendeFormatie("4-3-3A", "6x6", FORMATIES_DATA, true), "4-3-3A");
ok("passende formatie blijft", passendeFormatie("2-2-1", "6x6", FORMATIES_DATA, false), "2-2-1");
ok("11x11 met 4-4-2A blijft", passendeFormatie("4-4-2A", "11x11", FORMATIES_DATA, false), "4-4-2A");
ok("niets: de standaard", passendeFormatie(null, "8x8", FORMATIES_DATA, false), "3-3-1");

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
process.exit(fout ? 1 : 0);
