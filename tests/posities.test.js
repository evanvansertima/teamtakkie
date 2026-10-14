/* ══════════════════════════════════════════════════════════════
   Tests voor de precieze posities en de spelerkiezer
   (src/domein/statistieken.js: SPELER_POSITIES, spelerPastOpPlek,
   spelerKeuzeVolgorde)
   Draaien:  node tests/posities.test.js
   Verzoek van Evan, 14 oktober 2026: posities als RVV, CV, CAM, SP;
   in de kiezer wie vrij is en past bovenaan, wie al staat lichtgrijs.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
/* Uit src/app.jsx; hier alleen wat de functies nodig hebben. */
var ROL_VOLGORDE = ["Keeper", "Verdediger", "Middenvelder", "Aanvaller"];
const BRON = process.env.TT_STATISTIEKEN || path.join(__dirname, "..", "src", "domein", "statistieken.js");
eval(fs.readFileSync(BRON, "utf8").replace(/^const /gm, "var "));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

groep("de lijst van Evan");
ok("alle codes", SPELER_POSITIES.map((p) => p.code),
   ["K", "RVV", "RV", "CV", "LV", "LVV", "RM", "RCM", "CM", "CVM", "CAM", "LCM", "LM", "RVA", "SP", "LVA"]);
ok("elke code hoort bij een linie", SPELER_POSITIES.every((p) => ROL_VOLGORDE.indexOf(p.groep) >= 0), true);
ok("elke verwante plek bestaat", Object.keys(POSITIE_VERWANT).every((k) => positieInfo(k) && POSITIE_VERWANT[k].every((v) => positieInfo(v))), true);

groep("van formatieplek naar spelerscode");
ok("doelman is keeper", plekAlsSpelerCode("DM"), "K");
ok("CM links is LCM", plekAlsSpelerCode("CM-L"), "LCM");
ok("CM rechts is RCM", plekAlsSpelerCode("CM-R"), "RCM");
ok("CM midden blijft CM", plekAlsSpelerCode("CM-M"), "CM");
ok("CV links blijft CV", plekAlsSpelerCode("CV-L"), "CV");
ok("elke code uit de formaties is bekend", ["DM", "LV", "LVV", "CV", "RVV", "RV", "LM", "CVM", "CM", "CAM", "RM", "LVA", "SP", "RVA"]
   .every((c) => positieInfo(plekAlsSpelerCode(c))), true);

groep("wie past waar");
const CV = { positie: "Verdediger", positieCode: "CV" };
const RV_CV = { positie: "Verdediger", positieCode: "RV", positieCode2: "CV" };
const RV = { positie: "Verdediger", positieCode: "RV" };
const OUD_VERD = { positie: "Verdediger" };
const CM = { positie: "Middenvelder", positieCode: "CM" };
const SP = { positie: "Aanvaller", positieCode: "SP" };
const K = { positie: "Keeper", positieCode: "K" };
ok("eigen positie: 0", spelerPastOpPlek("CV-L", CV), 0);
ok("extra positie: 1", spelerPastOpPlek("CV", RV_CV), 1);
ok("verwante plek: 2", spelerPastOpPlek("CV", RV), 2);
ok("oude speler, alleen linie: 3", spelerPastOpPlek("CV", OUD_VERD), 3);
ok("middenvelder op CV (linie ernaast): 4", spelerPastOpPlek("CV", CM), 4);
ok("spits op CV: past niet", spelerPastOpPlek("CV", SP), 6);
ok("keeper op CV: past niet", spelerPastOpPlek("CV", K), 6);
ok("keeper op doel: 0", spelerPastOpPlek("DM", K), 0);
ok("CM past op CM-L als verwant", spelerPastOpPlek("CM-L", CM), 2);

groep("de volgorde in de kiezer");
const SPELERS = [
  { id: 1, naam: "Spits", rugnummer: 9, positie: "Aanvaller", positieCode: "SP" },
  { id: 2, naam: "Oud", rugnummer: 4, positie: "Verdediger" },
  { id: 3, naam: "Dirk", rugnummer: 3, positie: "Verdediger", positieCode: "CV" },
  { id: 4, naam: "Virgil", rugnummer: 5, positie: "Verdediger", positieCode: "CV" },
  { id: 5, naam: "Back", rugnummer: 2, positie: "Verdediger", positieCode: "RV" }
];
const v = spelerKeuzeVolgorde(SPELERS, "CV-R", { 4: "CV-L" });
ok("vrij en passend bovenaan, al opgesteld onderaan", v.map((x) => x.speler.naam), ["Dirk", "Back", "Oud", "Spits", "Virgil"]);
ok("wie al staat weet waar", v[4].bezet, "CV-L");
ok("op gelijke passendheid: rugnummer", spelerKeuzeVolgorde([SPELERS[3], SPELERS[2]], "CV").map((x) => x.speler.id), [3, 4]);

groep("tekst onder de naam");
ok("met codes", positieTekst(RV_CV), "RV/CV · Verdediger");
ok("oude speler", positieTekst(OUD_VERD), "Verdediger");

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
process.exit(fout ? 1 : 0);
