/* ══════════════════════════════════════════════════════════════
   Tests voor registreren (src/domein/registratie.js)
   Draaien:  node tests/registratie.test.js
   Besluit van Evan, 13 oktober 2026: geldig e-mailadres, sterk
   wachtwoord (8+, hoofdletter, kleine letter, cijfer, symbool) en
   verplicht akkoord op de voorwaarden.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const MODULE = process.env.TT_REG || path.join(__dirname, "..", "src", "domein", "registratie.js");
eval(fs.readFileSync(MODULE, "utf8").replace(/^const /gm, "var "));
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

groep("e-mailadres");
ok("geldige adressen", ["evan@teamtakkie.nl", "jan.de.vries@gmail.com", "a+test@sub.club.co.uk", " Evan@TeamTakkie.NL "].map(emailGeldig), [true, true, true, true]);
ok("Evans testgevallen: zonder extensie en zonder @", ["jemoeder@test", "jemoedertest.nl"].map(emailGeldig), [false, false]);
ok("andere ongeldige vormen", ["", "@club.nl", "jan@", "jan@@club.nl", "jan @club.nl", "jan@club.n", "jan@club.123", "jan@.nl", "jan@club..nl", ".jan@club.nl", "jan.@club.nl", "ja..n@club.nl", "jan@-club.nl", null].map(emailGeldig),
   [false, false, false, false, false, false, false, false, false, false, false, false, false, false]);
ok("netjes: spaties weg en kleine letters", emailNetjes("  Evan@TeamTakkie.NL "), "evan@teamtakkie.nl");

groep("wachtwoord");
const eisen = (w) => wachtwoordEisen(w).filter((e) => e.ok).map((e) => e.id);
ok("leeg: niets gehaald", eisen(""), []);
ok("alleen kleine letters", eisen("voetballen"), ["lengte", "klein"]);
ok("alles behalve symbool", eisen("Voetbal2026"), ["lengte", "hoofd", "klein", "cijfer"]);
ok("alles", eisen("Voetbal2026!"), ["lengte", "hoofd", "klein", "cijfer", "symbool"]);
ok("7 tekens is te kort, 8 is goed", [wachtwoordSterkGenoeg("Vb2026!"), wachtwoordSterkGenoeg("Vb2026!x")], [false, true]);
ok("€ telt niet als symbool (Supabase kent hem niet)", eisen("Voetbal2026€").indexOf("symbool"), -1);
ok("alle symbolen die Supabase kent tellen", "!@#$%^&*()_+-=[]{};':\"|<>?,./`~".split("").every((s) => wachtwoordSterkGenoeg("Voetbal1" + s)), true);
ok("een spatie is geen symbool", wachtwoordSterkGenoeg("Voetbal 2026"), false);

groep("sterkte (voor de balk)");
ok("oplopend", ["", "voetbal", "Voetbal2026", "Voetb26!", "Lange-Zomeravond-2026"].map(wachtwoordSterkte), [0, 1, 2, 3, 4]);
ok("bekende reeksen zijn nooit sterk, ook als ze aan de eisen voldoen", ["Password123!", "Qwerty123!", "Wachtwoord1!", "Abcdef12!"].map(wachtwoordSterkte), [2, 2, 2, 2]);

groep("alles samen");
ok("alles goed", registratieControle({ email: "evan@teamtakkie.nl", wachtwoord: "Voetbal2026!", akkoord: true }), { mag: true, reden: "" });
ok("ongeldig e-mailadres eerst", registratieControle({ email: "jemoeder@test", wachtwoord: "x", akkoord: false }).reden, "Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.");
ok("zwak wachtwoord", registratieControle({ email: "evan@teamtakkie.nl", wachtwoord: "voetbal", akkoord: true }).mag, false);
ok("zonder akkoord", registratieControle({ email: "evan@teamtakkie.nl", wachtwoord: "Voetbal2026!", akkoord: false }).reden, "Ga akkoord met de algemene voorwaarden en het privacybeleid.");
const a = akkoordGegevens(new Date("2026-10-13T10:00:00Z"));
ok("akkoord met datum en versie", a, { akkoord_voorwaarden: "2026-10-13T10:00:00.000Z", voorwaarden_versie: VOORWAARDEN_VERSIE });
ok("links naar de echte pagina's", [VOORWAARDEN_URL, PRIVACY_URL].every((u) => /^https:\/\/teamtakkie\.nl\//.test(u)), true);

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
