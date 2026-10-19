/* ══════════════════════════════════════════════════════════════
   Tests voor bewaarde opstellingen (src/domein/wedstrijden.js)
   Draaien:  node tests/opstelling-bewaren.test.js
   Verzoek van Evan, 14 oktober 2026: bij Wedstrijd → Opstelling tot
   vijf opstellingen met een naam bewaren, plus "Laatste opstelling".
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const BRON = process.env.TT_WEDSTRIJDEN || path.join(__dirname, "..", "src", "domein", "wedstrijden.js");
eval(fs.readFileSync(BRON, "utf8").replace(/^const /gm, "var "));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);
const NU = new Date(2026, 9, 14, 12, 0);
const OPST = { naam: "Thuis", formatie: "4-4-2", toewijzing: { GK: 1, CB1: 2, ST1: null }, wisselIds: [5] };

groep("bewaren");
let r = bewaarOpstellingSjabloon([], OPST, NU);
ok("eerste opstelling erbij", [r.fout, r.lijst.length, r.vervangen], [null, 1, false]);
ok("lege plekken gaan er niet in mee", r.lijst[0].toewijzing, { GK: 1, CB1: 2 });
ok("met formatie, bank en datum", [r.lijst[0].formatie, r.lijst[0].wisselIds, r.lijst[0].bewaardOp], ["4-4-2", [5], NU.toISOString()]);
ok("zonder naam: niet bewaard", bewaarOpstellingSjabloon([], Object.assign({}, OPST, { naam: "  " })).fout !== null, true);
ok("zonder spelers op het veld: niet bewaard", bewaarOpstellingSjabloon([], Object.assign({}, OPST, { toewijzing: {} })).fout !== null, true);
ok("naam wordt hoogstens 40 tekens", bewaarOpstellingSjabloon([], Object.assign({}, OPST, { naam: "x".repeat(60) })).lijst[0].naam.length, 40);

groep("hoogstens vijf");
let lijst = [];
for (let i = 1; i <= 5; i++) lijst = bewaarOpstellingSjabloon(lijst, Object.assign({}, OPST, { naam: "Opstelling " + i })).lijst;
ok("vijf passen", lijst.length, 5);
r = bewaarOpstellingSjabloon(lijst, Object.assign({}, OPST, { naam: "Zesde" }));
ok("de zesde niet", [r.lijst.length, r.fout !== null], [5, true]);
r = bewaarOpstellingSjabloon(lijst, Object.assign({}, OPST, { naam: "opstelling 3", formatie: "3-5-2" }));
ok("dezelfde naam (andere hoofdletters) overschrijft, ook als het vol is", [r.fout, r.vervangen, r.lijst.length, r.lijst[2].formatie], [null, true, 5, "3-5-2"]);
ok("en houdt zijn plek en id", r.lijst[2].id, lijst[2].id);

groep("laatste opstelling");
const rij = (id, plek, st) => ({ spelerId: id, positieId: plek, spelStatus: st || "basis" });
const WED = [
  { id: 1, datum: "2026-09-26", tegenstander: "Birdaard", formatie: "4-3-3A", opstelling: [rij(1, "GK"), rij(2, "CB1"), rij(3, null, "wissel")] },
  { id: 2, datum: "2026-10-03", tegenstander: "Berlikum", formatie: "4-4-2", opstelling: [rij(4, "GK"), rij(5, null, "wissel"), rij(6, null, "afwezig")] },
  { id: 3, datum: "2026-10-10", tegenstander: "Zonder posities", opstelling: [rij(7, null)] },
  { id: 4, datum: "2026-10-24", tegenstander: "Later", formatie: "5-3-2", opstelling: [rij(8, "GK")] },
  { id: 5, datum: "2026-10-17", tegenstander: "Deze", opstelling: [rij(9, "GK")] }
];
const l = laatsteOpstelling(WED, WED[4]);
ok("de vorige wedstrijd met posities, niet deze en niet een latere", [l.bron.tegenstander, l.formatie], ["Berlikum", "4-4-2"]);
ok("basis op zijn plek, bank als wissels, afwezigen niet", [l.toewijzing, l.wisselIds], [{ GK: 4 }, [5]]);
ok("geen eerdere wedstrijd: niets", laatsteOpstelling([WED[4]], WED[4]), null);

groep("toepassen");
const SPELERS = [1, 2, 3, 4, 5].map((id) => ({ id, naam: "Speler " + id }));
const SJ = { naam: "Thuis", formatie: "4-4-2", toewijzing: { GK: 1, CB1: 2, ST1: 9 }, wisselIds: [3, 4, 2] };
let t = pasOpstellingToe(SJ, SPELERS, [3]);
ok("wie niet meer in de selectie staat valt weg", t.toewijzing, { GK: 1, CB1: 2 });
ok("wie er niet is (afgemeld) valt van de bank, en niemand staat dubbel", t.wisselIds, [4]);
ok("overgeslagen wordt gemeld", t.overgeslagen, [9, 3]);
ok("formatie gaat mee", t.formatie, "4-4-2");
ok("tekst- en getal-id zijn dezelfde speler", pasOpstellingToe({ toewijzing: { GK: "1" }, wisselIds: [] }, SPELERS, []).toewijzing, { GK: "1" });

groep("één lijst met Selectie › Opstellingen (19 oktober 2026)");
const OUD = [
  { id: 11, naam: "Selectie A", formatie: "4-4-2A", toewijzing: { GK: { id: 1, naam: "Keeper", aanvalInstructie: "Snel uitgooien" }, ST: { spelerId: 9, naam: "Spits" }, LB: null } },
  { id: 12, naam: "Selectie B", formatie: "4-3-3A", toewijzing: { GK: 1 } }
];
const omgezet = oudeOpstellingAlsSjabloon(OUD[0]);
ok("hele spelers worden nummers, lege plek valt weg", omgezet.toewijzing, { GK: 1, ST: 9 });
ok("instructies blijven bewaard", omgezet.instructies, { GK: { aanval: "Snel uitgooien", verdediging: "" } });
ok("geen wissels in de oude lijst: lege bank", omgezet.wisselIds, []);
const NIEUW = [{ id: 12, naam: "Selectie B (nieuw)", formatie: "4-3-3A", toewijzing: { GK: 2 }, wisselIds: [5] },
               { id: 20, naam: "Wedstrijd", formatie: "4-4-2A", toewijzing: { GK: 3 }, wisselIds: [] }];
const samen = alleOpstellingSjablonen(NIEUW, OUD);
ok("beide lijsten samen, de nieuwe wint bij hetzelfde id", samen.map((x) => x.naam), ["Selectie B (nieuw)", "Wedstrijd", "Selectie A"]);
ok("id als tekst of getal is hetzelfde", alleOpstellingSjablonen([{ id: "11", naam: "x" }], OUD).length, 2);
const weg = verwijderOpstellingSjabloon(NIEUW, OUD, 11);
ok("verwijderen haalt hem uit allebei", [weg.sjablonen.map((x) => x.id), weg.oude.map((x) => x.id)], [[12, 20], [12]]);
ok("en hij komt niet terug", alleOpstellingSjablonen(weg.sjablonen, weg.oude).map((x) => x.id), [12, 20]);
r = bewaarOpstellingSjabloon(samen, { naam: "selectie a", formatie: "4-4-2A", toewijzing: { GK: 1 }, wisselIds: [7, 8], instructies: { GK: { aanval: "x", verdediging: "" } } });
ok("bewaren met wissels en instructies, zelfde naam overschrijft", [r.vervangen, r.lijst[2].wisselIds, r.lijst[2].instructies.GK.aanval, r.lijst[2].id], [true, [7, 8], "x", 11]);
ok("wissels uit Selectie gaan mee naar de wedstrijd", pasOpstellingToe(r.lijst[2], SPELERS, []).wisselIds, []);
ok("…tenzij ze niet meer in de selectie staan; wie er wel is komt op de bank",
   pasOpstellingToe({ toewijzing: { GK: 1 }, wisselIds: [2, 3, 99] }, SPELERS, []).wisselIds, [2, 3]);

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
process.exit(fout ? 1 : 0);
