/* ══════════════════════════════════════════════════════════════
   Tests voor de zelfgemaakte avatar (src/domein/avatar.js)
   Draaien:  node tests/avatar.test.js
   Verzoek van Evan, 14 oktober 2026: man/vrouw, kort/normaal/lang
   haar, ogen, neus, mond en kin.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const BRON = process.env.TT_AVATAR || path.join(__dirname, "..", "src", "domein", "avatar.js");
eval(fs.readFileSync(BRON, "utf8").replace(/^const /gm, "var "));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);
const SLEUTELS = ["versie", "geslacht", "huid", "haar", "kapsel", "ogen", "neus", "mond", "kin", "baard"];
const geldig = (a) => SLEUTELS.every((k) => k in a)
  && AVATAR_KAPSELS.some((k) => k.id === a.kapsel) && AVATAR_OGEN.some((k) => k.id === a.ogen)
  && AVATAR_NEUZEN.some((k) => k.id === a.neus) && AVATAR_MONDEN.some((k) => k.id === a.mond)
  && AVATAR_KINNEN.some((k) => k.id === a.kin)
  && a.huid >= 0 && a.huid < AVATAR_HUID_AANTAL && a.haar >= 0 && a.haar < AVATAR_HAAR_AANTAL;

groep("de keuzes");
ok("drie lengtes, elk met kapsels", AVATAR_LENGTES.map((l) => AVATAR_KAPSELS.filter((k) => k.lengte === l.id).length > 0), [true, true, true]);
ok("unieke kapsel-id's", new Set(AVATAR_KAPSELS.map((k) => k.id)).size, AVATAR_KAPSELS.length);
ok("oude kapselnummers bestaan allemaal", AVATAR_OUDE_KAPSELS.every((id) => AVATAR_KAPSELS.some((k) => k.id === id)), true);

groep("uit een naam");
ok("altijd dezelfde", JSON.stringify(avatarVanNaam("Dirk Kuijtemaker")), JSON.stringify(avatarVanNaam("Dirk Kuijtemaker")));
ok("geldig", geldig(avatarVanNaam("Dirk")), true);
ok("vrouw: nooit kort haar, nooit baard", ["Anna", "Fleur", "Sanne", "Noor", "Eva", "Lotte", "Mila", "Julia"]
   .map((n) => avatarVanNaam(n, "v")).every((a) => a.geslacht === "v" && !a.baard && AVATAR_KAPSELS.find((k) => k.id === a.kapsel).lengte !== "kort"), true);
ok("man: nooit lang haar", ["Dirk", "Bas", "Timo", "Luuk", "Sem", "Daan"].map((n) => avatarVanNaam(n)).every((a) => AVATAR_KAPSELS.find((k) => k.id === a.kapsel).lengte !== "lang"), true);

groep("netjes maken");
ok("niets opgeslagen: uit de naam", avatarNetjes(null, "Dirk"), avatarVanNaam("Dirk"));
ok("onzin wordt vervangen", geldig(avatarNetjes({ huid: 99, haar: -1, kapsel: "punk", ogen: 3, kin: null }, "Dirk")), true);
ok("geldige keuzes blijven", (({ huid, kapsel, ogen, neus, mond, kin }) => ({ huid, kapsel, ogen, neus, mond, kin }))(
   avatarNetjes({ huid: 2, kapsel: "vlechten", ogen: "groot", neus: "spits", mond: "lach", kin: "smal", geslacht: "v" }, "x")),
   { huid: 2, kapsel: "vlechten", ogen: "groot", neus: "spits", mond: "lach", kin: "smal" });
ok("versie 1 (kapsel als getal) wordt omgezet", avatarNetjes({ huid: 1, haar: 2, kapsel: 4, baard: true }, "Dirk").kapsel, "krullen");
ok("vrouw met baard: geen baard", avatarNetjes({ geslacht: "v", baard: true }, "x").baard, false);
ok("kaal met baard: geen baard", avatarNetjes({ kapsel: "kaal", baard: true }, "x").baard, false);
ok("man met baard blijft", avatarNetjes({ kapsel: "kort", baard: true }, "x").baard, true);

groep("wisselen van geslacht");
const man = avatarNetjes({ kapsel: "stekels", ogen: "groot", baard: true }, "x");
const vrouw = avatarMetGeslacht(man, "v", "x");
ok("kort haar wordt lang, baard eraf, gezicht blijft", [vrouw.geslacht, vrouw.kapsel, vrouw.baard, vrouw.ogen], ["v", "lang", false, "groot"]);
ok("normaal haar blijft", avatarMetGeslacht(avatarNetjes({ kapsel: "bob" }, "x"), "v", "x").kapsel, "bob");
ok("lang haar wordt kort bij man", avatarMetGeslacht(vrouw, "m", "x").kapsel, "kort");

groep("verras me");
let teller = 0; const vast = () => ((teller++ * 0.37) % 1);
ok("geldig, en het geslacht blijft", [geldig(avatarWillekeurig("v", vast)), avatarWillekeurig("v", vast).geslacht], [true, "v"]);
ok("ook met de hoogste kans", geldig(avatarWillekeurig("m", () => 0.9999)), true);

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
process.exit(fout ? 1 : 0);
