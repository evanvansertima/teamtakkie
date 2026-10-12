/* ══════════════════════════════════════════════════════════════
   Test: geen twee dezelfde namen in de gedeelde scope
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/dubbele-namen.test.js

   tools/bouw.js plakt src/kern, src/domein, src/schermen en src/app.jsx
   aan elkaar tot één script. Twee functies met dezelfde naam geven dan
   géén foutmelding: de laatste wint stilletjes. Zo overschreef op 12
   oktober 2026 een nieuwe verkleinAfbeelding (dia's) de bestaande
   verkleinAfbeelding van het clublogo, met een andere volgorde van de
   argumenten. Deze test zoekt elke naam die bovenaan in een bestand
   (zonder inspringing) als function, const, let of var wordt gemaakt,
   en faalt als een naam twee keer voorkomt.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const WORTEL = path.join(__dirname, "..");
const bestanden = [path.join(WORTEL, "src", "app.jsx")];
["kern", "domein", "schermen"].forEach((m) => {
  const map = path.join(WORTEL, "src", m);
  fs.readdirSync(map).filter((f) => /\.(js|jsx)$/.test(f)).forEach((f) => bestanden.push(path.join(map, f)));
});
const waar = {};
bestanden.forEach((b) => {
  fs.readFileSync(b, "utf8").split("\n").forEach((r, i) => {
    const m = r.match(/^(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/);
    if (m) { const n = m[1] || m[2]; (waar[n] = waar[n] || []).push(path.relative(WORTEL, b) + ":" + (i + 1)); }
  });
});
const dubbel = Object.keys(waar).filter((n) => waar[n].length > 1);
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt, null, 1)}`));
};
console.log("\ngedeelde scope");
ok("genoeg namen gevonden (de zoekopdracht werkt)", Object.keys(waar).length > 500, true);
ok("geen dubbele namen", dubbel.map((n) => n + " → " + waar[n].join(", ")), []);
console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
