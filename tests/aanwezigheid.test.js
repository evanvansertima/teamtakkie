/* ══════════════════════════════════════════════════════════════
   Tests voor Aanwezigheid en het opkomstfilter
   (src/domein/opkomst.js en de uitleenregels in src/domein/wedstrijden.js)
   Draaien:  node tests/aanwezigheid.test.js

   Verzoek van Evan, 14 oktober 2026:
     · één lijst Aanwezigheid met acht statussen bij training,
       wedstrijd en activiteit, in plaats van ja/misschien/nee vooraf;
     · in de opkomst filteren op trainingen, wedstrijden, competitie,
       beker, oefen, toernooi en activiteiten;
     · wat nog moet komen telt niet mee.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const lees = (p) => fs.readFileSync(process.env[p.env] || path.join(__dirname, "..", p.pad), "utf8").replace(/^const /gm, "var ");

/* Uit app.jsx en de schermen; voor deze test doet hun inhoud er niet toe. */
function parseerDatum(d) { if (!d) return null; const p = d.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
function trainingTitel(t) { return "Training " + t.datum; }
function activiteitSoort() { return { label: "Overig" }; }
function sorteerOpLinie(l) { return l.slice(); }

eval(lees({ env: "TT_OPKOMST", pad: "src/domein/opkomst.js" }));
eval(lees({ env: "TT_WEDSTRIJDEN", pad: "src/domein/wedstrijden.js" }));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

const SPELERS = [{ id: 1, naam: "Jinne" }, { id: 2, naam: "Milan" }, { id: 3, naam: "Stan" }, { id: 4, naam: "Luuk" }];
const NU = new Date(2026, 9, 14, 12, 0);

groep("de oude opgave gaat niet verloren");
ok("ja wordt aanwezig", opgaveAlsAanwezig("ja"), "aanwezig");
ok("nee wordt afgemeld", opgaveAlsAanwezig("nee"), "afwezig");
ok("uitgeleend blijft uitgeleend", opgaveAlsAanwezig("uitgeleend"), "uitgeleend");
ok("misschien en onbekend worden open", [opgaveAlsAanwezig("misschien"), opgaveAlsAanwezig("onbekend")], [null, null]);
const OUD = { opgave: [{ spelerId: 1, status: "ja" }, { spelerId: 2, status: "nee" }, { spelerId: 3, status: "misschien" }] };
ok("statussen uit een oude opgave", aanwezigheidStatussen(OUD, SPELERS), { 1: "aanwezig", 2: "afwezig", 3: "open", 4: "open" });

groep("wat bij Aanwezigheid staat wint");
const MIX = { aanwezigheid: [{ spelerId: 2, status: "ziek" }], opgave: OUD.opgave };
ok("eigen regel boven opgave", aanwezigheidStatussen(MIX, SPELERS)[2], "ziek");
ok("terugval (opstelling) boven opgave", aanwezigheidStatussen(MIX, SPELERS, (id) => id === 1 ? "afwezig" : null)[1], "afwezig");
ok("eigen regel boven terugval", aanwezigheidStatussen(MIX, SPELERS, () => "aanwezig")[2], "ziek");
ok("een regel 'open' telt als niets", aanwezigheidStatussen({ aanwezigheid: [{ spelerId: 1, status: "open" }] }, SPELERS)[1], "open");
ok("tekst- en getal-id zijn dezelfde speler", aanwezigheidStatussen({ aanwezigheid: [{ spelerId: "3", status: "werk" }] }, SPELERS)[3], "werk");

groep("invullen");
let lijst = zetAanwezigheid(OUD, SPELERS, [4], "telaat");
ok("wat het scherm liet zien wordt vastgelegd, open niet",
   lijst.map((a) => [a.spelerId, a.status]), [[1, "aanwezig"], [2, "afwezig"], [4, "telaat"]]);
ok("met de naam erbij", lijst.map((a) => a.naam), ["Jinne", "Milan", "Luuk"]);
lijst = zetAanwezigheid({ aanwezigheid: lijst }, SPELERS, [1], "open");
ok("terug naar open haalt de regel weg", lijst.map((a) => a.spelerId), [2, 4]);
lijst = zetAanwezigheid({ aanwezigheid: [{ spelerId: 99, naam: "Vertrokken", status: "aanwezig" }] }, SPELERS, [1], "werk");
ok("wie niet meer in de selectie staat houdt zijn regel", lijst.map((a) => a.spelerId), [1, 99]);

groep("Rest aanwezig");
lijst = vulOpenAan({ aanwezigheid: [{ spelerId: 2, status: "afwezig" }, { spelerId: 3, status: "geblesseerd" }] }, SPELERS, "aanwezig");
ok("alleen wie open stond", lijst.map((a) => [a.spelerId, a.status]),
   [[1, "aanwezig"], [2, "afwezig"], [3, "geblesseerd"], [4, "aanwezig"]]);

groep("wat nog moet komen telt niet mee");
ok("morgen", nogNietGeweest("2026-10-15", NU), true);
ok("vandaag telt wel", nogNietGeweest("2026-10-14", NU), false);
ok("gisteren", nogNietGeweest("2026-10-13", NU), false);
ok("geen datum: niet tegenhouden", nogNietGeweest("", NU), false);
const TOEKOMST = { id: "tt", datum: "2999-01-01", aanwezigheid: [{ spelerId: 1, status: "aanwezig" }] };
ok("opkomstVan van een training in de toekomst is null", opkomstVan(TOEKOMST, []), null);
ok("opkomstVan van een gewone training rekent", opkomstVan({ datum: "2026-09-01", aanwezigheid: [{ spelerId: 1, status: "aanwezig" }, { spelerId: 2, status: "afwezig" }] }, []),
   { aanwezig: 1, totaal: 2, pct: 50 });

groep("wedstrijd: eigen invulling plus opstelling");
const W = { id: 7, status: "gespeeld", datum: "2026-10-03", soort: "beker",
  opstelling: [{ spelerId: 1, spelStatus: "basis" }, { spelerId: 2, spelStatus: "wissel" }, { spelerId: 3, spelStatus: "afwezig" }],
  aanwezigheid: [{ spelerId: 3, status: "ziek" }] };
ok("ziek uit Aanwezigheid, de rest uit de opstelling",
   presentieVanWedstrijd(W).map((a) => [a.spelerId, a.status]), [[3, "ziek"], [1, "aanwezig"], [2, "aanwezig"]]);
ok("zonder eigen invulling: alleen de opstelling", presentieVanWedstrijd(Object.assign({}, W, { aanwezigheid: [] })).length, 3);

groep("filter op soort");
const OEFEN = { id: 8, status: "gespeeld", datum: "2026-08-31", soort: "oefen", opstelling: [{ spelerId: 1 }] };
const OUDE_ZONDER_SOORT = { id: 9, status: "gespeeld", datum: "2026-09-05", opstelling: [{ spelerId: 1 }] };
const GEPLAND = { id: 10, status: "gepland", datum: "2026-10-17", soort: "oefen", aanwezigheid: [{ spelerId: 1, status: "aanwezig" }] };
const TRAININGEN = [{ id: 1, datum: "2026-10-13", aanwezigheid: [{ spelerId: 1, status: "aanwezig" }] },
                    { id: 2, datum: "2026-10-15", aanwezigheid: [{ spelerId: 1, status: "aanwezig" }] }];
const ACT = [{ id: 1, datum: "2026-10-01", titel: "Teamavond", aanwezigheid: [{ spelerId: 1, status: "aanwezig" }] }];
const geb = presentieGebeurtenissen([W, OEFEN, OUDE_ZONDER_SOORT, GEPLAND], TRAININGEN, ACT, NU);
ok("training van morgen en geplande wedstrijd vallen weg", geb.map((g) => g.id), ["w8", "w9", "a1", "w7", "t1"]);
const tel = (f) => geb.filter((g) => presentiePast(g, f)).map((g) => g.id);
ok("alles", tel("alles").length, 5);
ok("trainingen", tel("training"), ["t1"]);
ok("wedstrijden: alle soorten", tel("wedstrijd"), ["w8", "w9", "w7"]);
ok("oefen", tel("oefen"), ["w8"]);
ok("beker", tel("beker"), ["w7"]);
ok("wedstrijd zonder soort telt als competitie", tel("competitie"), ["w9"]);
ok("toernooi: leeg", tel("toernooi"), []);
ok("activiteiten", tel("activiteit"), ["a1"]);
ok("elke filterknop bestaat", ["alles", "training", "wedstrijd", "competitie", "beker", "oefen", "toernooi", "activiteit"]
   .every((id) => presentieSoortInfo(id).id === id), true);

groep("uitgeleend: Aanwezigheid beslist");
ok("uitgeleend via Aanwezigheid", isUitgeleend({ aanwezigheid: [{ spelerId: 4, status: "uitgeleend" }] }, 4), true);
ok("oude opgave zegt uitgeleend, Aanwezigheid zegt aanwezig: niet uitgeleend",
   isUitgeleend({ opgave: [{ spelerId: 4, status: "uitgeleend" }], aanwezigheid: [{ spelerId: 4, status: "aanwezig" }] }, 4), false);
ok("alleen de oude opgave: nog steeds uitgeleend", isUitgeleend({ opgave: [{ spelerId: 4, status: "uitgeleend" }] }, 4), true);
ok("uitgeleendIn volgt dezelfde voorrang",
   uitgeleendIn({ opgave: [{ spelerId: 4, status: "uitgeleend" }, { spelerId: 2, status: "uitgeleend" }],
                  aanwezigheid: [{ spelerId: 4, status: "aanwezig" }, { spelerId: 3, status: "uitgeleend" }] }), [2, 3]);

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
process.exit(fout ? 1 : 0);
