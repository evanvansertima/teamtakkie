/* ══════════════════════════════════════════════════════════════
   Tests voor de oefeningenbibliotheek (src/domein/bibliotheek.js)
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/bibliotheek.test.js

   Aanleiding: een tester vroeg om oefeningen voor onder de 10–11 jaar
   en om tekeningen (11 oktober 2026). Deze test bewaakt dat elke
   oefening een tekening heeft die het tekenbord kan tonen, dat elke
   oefening voor minstens één leeftijd is, dat er voor de jongste jeugd
   genoeg te kiezen is, en dat elke thematraining past: in de tijd en
   bij de leeftijden van de oefeningen die erin zitten.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const WORTEL = path.join(__dirname, "..");
const MODULE = process.env.TT_BIB || path.join(WORTEL, "src", "domein", "bibliotheek.js");
const lees = (p) => fs.readFileSync(path.join(WORTEL, p), "utf8");
const app = lees("src/app.jsx"), opst = lees("src/schermen/opstellingen.jsx");
var BASIS_OEFENINGEN = JSON.parse(app.match(/const BASIS_OEFENINGEN = (\[.*?\]);\n/s)[1]);
eval(fs.readFileSync(MODULE, "utf8").replace(/^const /gm, "var "));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

(function draai() {
const bib = bibliotheekOefeningen();
const TYPES = JSON.parse(app.match(/const TRAINING_TYPES = (\[[^\]]+\])/)[1]);
const DOELEN = JSON.parse(app.match(/const OEFENING_DOELEN = (\[[^\]]+\])/)[1]);
const LEEFTIJDEN = JSON.parse(app.match(/const OEFENING_LEEFTIJDEN = (\[[^\]]+\])/)[1]);
const BEKEND = new Set((opst.match(/el\.type==="([a-z-]+)"/g) || []).map((x) => x.slice(11, -1)).concat(["zone-vierkant"]));

groep("gelijk aan de app");
{
  const veld = opst.slice(opst.indexOf("const VELD_TYPEN = ["), opst.indexOf("];", opst.indexOf("const VELD_TYPEN = [")));
  const maten = {};
  (veld.match(/\{id:"[a-z0-9-]+",[^}]*w:\d+,h:\d+/g) || []).forEach((r) => { const m = r.match(/id:"([^"]+)".*w:(\d+),h:(\d+)/); maten[m[1]] = [Number(m[2]), Number(m[3])]; });
  ok("veldmaten gelijk aan VELD_TYPEN", Object.keys(BIB_VELDEN).every((k) => JSON.stringify(maten[k]) === JSON.stringify(BIB_VELDEN[k])), true);
  ok("leeftijden gelijk aan OEFENING_LEEFTIJDEN (zonder 'Alle')", BIB_LEEFTIJDEN, LEEFTIJDEN.filter((l) => l !== "Alle"));
  ok("O7-O8 bestaat voor de mini's", LEEFTIJDEN.indexOf("O7-O8") >= 0, true);
}

groep("elke oefening is compleet");
{
  ok("de 50 bestaande plus de nieuwe", [bib.length >= 85, bib.filter((o) => o.id.startsWith("bib-") && Number(o.id.slice(4)) <= 50).length], [true, 50]);
  ok("alle 50 bestaande hebben een eigen aanvulling (geen stille standaard)", BASIS_OEFENINGEN.filter((o) => !BIB_AANVULLING[o.naam]).map((o) => o.naam), []);
  ok("geen aanvulling voor een oefening die niet bestaat", Object.keys(BIB_AANVULLING).filter((n) => !BASIS_OEFENINGEN.some((o) => o.naam === n)), []);
  ok("namen uniek", new Set(bib.map((o) => o.naam)).size, bib.length);
  ok("ids uniek", new Set(bib.map((o) => o.id)).size, bib.length);
  ok("elke oefening een tekening", bib.filter((o) => !o.tekening).map((o) => o.naam), []);
  ok("leeftijden geldig en niet leeg", bib.filter((o) => !o.leeftijden.length || o.leeftijden.some((l) => BIB_LEEFTIJDEN.indexOf(l) < 0)).map((o) => o.naam), []);
  ok("leeftijd (oud veld) = de jongste uit de lijst", bib.every((o) => o.leeftijd === o.leeftijden[0]), true);
  ok("thema Fun, Techniek of Tactiek", bib.filter((o) => BIB_THEMAS.indexOf(o.thema) < 0).map((o) => o.naam), []);
  ok("type bekend in de app", bib.filter((o) => TYPES.indexOf(o.type) < 0).map((o) => o.naam), []);
  ok("doel bekend in de app", bib.filter((o) => DOELEN.indexOf(o.doel) < 0).map((o) => o.naam), []);
  const leeg = app.match(/const LEEG_OEFENING = \{([\s\S]*?)\};/)[1];
  const velden = (leeg.match(/([a-zA-Z]+):/g) || []).map((x) => x.slice(0, -1)).filter((v) => v !== "id");
  ok("alle velden van een gewone oefening", bib.filter((o) => velden.some((v) => !(v in o))).map((o) => o.naam), []);
  ok("beschrijving en aandachtspunten ingevuld", bib.filter((o) => !o.beschrijving || !o.aandachtspunten || o.duur < 1).map((o) => o.naam), []);
  ok("kopbal niet voor de jeugd onder 12 (KNVB-advies)", bib.filter((o) => /kopbal/i.test(o.naam) && o.leeftijden.some((l) => l === "O7-O8" || l === "O9-O11")).map((o) => o.naam), []);
}

groep("tekeningen die het tekenbord kan tonen");
{
  const fouten = [];
  bib.forEach((o) => {
    const t = o.tekening, m = BIB_VELDEN[t.veldType];
    if (!m) fouten.push(o.naam + ": veld"); 
    t.stappen.forEach((st) => {
      st.elems.forEach((e) => {
        if (!BEKEND.has(e.type)) fouten.push(o.naam + ": onbekend " + e.type);
        if (e.x < 0 || e.y < 0 || e.x > m[0] || e.y > m[1]) fouten.push(o.naam + ": buiten het veld");
      });
      st.lijnen.forEach((l) => { if (["looplijn", "passlijn", "schietlijn", "dribbellijn", "voorzetlijn"].indexOf(l.type) < 0) fouten.push(o.naam + ": lijn " + l.type); });
    });
    const spelers = Math.max(...t.stappen.map((st) => st.elems.filter((e) => e.type === "speler" || e.type === "speler-rood").length));
    if (spelers > o.aantalSpelers) fouten.push(o.naam + ": " + spelers + " spelers getekend, " + o.aantalSpelers + " genoemd");
    if (spelers === 0) fouten.push(o.naam + ": geen spelers getekend");
  });
  ok("geen fouten", fouten, []);
  ok("hoofdtekening = eerste stap", bib.every((o) => o.tekening.elems === o.tekening.stappen[0].elems), true);
  ok("element-ids uniek binnen een tekening", bib.every((o) => { const ids = o.tekening.stappen.flatMap((s) => s.elems.map((e) => e.id).concat(s.lijnen.map((l) => l.id))); return new Set(ids).size === ids.length; }), true);
  ok("vakken liggen onder de spelers", bib.every((o) => { const i = o.tekening.elems.findIndex((e) => !String(e.type).startsWith("zone")); return o.tekening.elems.slice(i).every((e) => !String(e.type).startsWith("zone")); }), true);
  ok("een vak dat ná de spelers is genoteerd, komt er toch onder", tekening("leeg", ["a1 10 10; b 20 20; vak 50 50 20 20"], 1).elems.map((e) => e.type), ["zone-vierkant", "speler", "bal"]);
  ok("dezelfde tekening twee keer opbouwen geeft hetzelfde", JSON.stringify(tekening("leeg", ["a1 10 10; pas 10 10 50 50"], 5)), JSON.stringify(tekening("leeg", ["a1 10 10; pas 10 10 50 50"], 5)));
  let foutmelding = "";
  try { tekening("leeg", ["a1 120 10"], 1); } catch (e) { foutmelding = e.message; }
  ok("coördinaat buiten 0–100 wordt geweigerd", /buiten 0–100/.test(foutmelding), true);
  try { tekening("leeg", ["xyz 1 1"], 1); foutmelding = ""; } catch (e) { foutmelding = e.message; }
  ok("onbekend onderdeel wordt geweigerd", /Onbekend/.test(foutmelding), true);
  const t = tekening("half-b", ["k 50 6; v3 50 50; g 50 2"], 1);
  ok("omrekenen naar logische eenheden (430 x 320) en keeper-letter", [t.elems[0].x, t.elems[0].y, t.elems[0].nr, t.elems[1].type, t.elems[1].nr], [215, 19, "K", "speler-rood", 3]);
}

groep("genoeg keus per leeftijd en thema");
{
  const per = (l) => bib.filter((o) => o.leeftijden.indexOf(l) >= 0).length;
  ok("O7-O8: minstens 15 oefeningen", per("O7-O8") >= 15, true);
  ok("O9-O11: minstens 35 oefeningen", per("O9-O11") >= 35, true);
  ok("elke leeftijd minstens 15", BIB_LEEFTIJDEN.every((l) => per(l) >= 15), true);
  ok("elk thema minstens 15", BIB_THEMAS.every((t) => bib.filter((o) => o.thema === t).length >= 15), true);
  ok("oefeningen voor jong én oud (O9-O11 tot en met senioren): minstens 10", bib.filter((o) => o.leeftijden.indexOf("O9-O11") >= 0 && o.leeftijden.indexOf("Senioren") >= 0).length >= 10, true);
}

groep("filteren");
{
  const lijst = [
    { naam: "Jong", leeftijden: ["O7-O8", "O9-O11"], thema: "Fun", doel: "Dribbelen", tekening: {}, beschrijving: "met bal" },
    { naam: "Oud", leeftijden: ["O18-O19"], thema: "Tactiek", doel: "Verdedigen", tekening: null, beschrijving: "druk zetten" },
    { naam: "Eigen oud model", leeftijd: "O9-O11", doel: "Dribbelen", beschrijving: "" },
    { naam: "Eigen alle", leeftijd: "Alle", doel: "Afwerken", beschrijving: "" }
  ];
  const n = (f) => filterOefeningen(lijst, f).map((o) => o.naam);
  ok("op leeftijd, ook voor oude oefeningen met één leeftijd of 'Alle'", n({ leeftijd: "O9-O11" }), ["Jong", "Eigen oud model", "Eigen alle"]);
  ok("op thema", n({ thema: "Tactiek" }), ["Oud"]);
  ok("op doel", n({ doel: "Dribbelen" }), ["Jong", "Eigen oud model"]);
  ok("alleen met tekening", n({ metTekening: true }), ["Jong"]);
  ok("zoeken in naam en uitleg", n({ zoek: "druk" }), ["Oud"]);
  ok("'Alle' filtert niets", n({ leeftijd: "Alle", thema: "Alle", doel: "Alle" }).length, 4);
  ok("de bibliotheek op O9-O11 + Fun", filterOefeningen(bib, { leeftijd: "O9-O11", thema: "Fun" }).length >= 10, true);
}

groep("leeftijd uit de teamnaam");
{
  ok("teamnamen", ["JO11-2", "FC Harlingen JO19-2", "MO13-1", "JO8-1", "O17", "Heren 1", "VR1", "JO7"].map(leeftijdUitTeamnaam),
     ["O9-O11", "O18-O19", "O12-O14", "O7-O8", "O15-O17", null, null, "O7-O8"]);
}

groep("thematrainingen");
{
  ok("minstens 12", BIB_THEMATRAININGEN.length >= 12, true);
  const omschakelen = BIB_THEMATRAININGEN.filter((t) => t.naam === "Omschakelen na balverlies")[0];
  ok("totaal = oefenen + 2 minuten per overgang (80 + 5 x 2 = 90)", themaTotaal(omschakelen), 90);
  const fouten = [];
  BIB_THEMATRAININGEN.forEach((th) => {
    let onderdelen;
    try { onderdelen = onderdelenVanThema(th); } catch (e) { fouten.push(e.message); return; }
    if (themaTotaal(th) > th.duur) fouten.push(th.naam + ": " + themaTotaal(th) + " min, past niet in " + th.duur);
    if (BIB_THEMAS.indexOf(th.thema) < 0) fouten.push(th.naam + ": thema");
    onderdelen.forEach((r) => th.leeftijden.forEach((l) => {
      if (r.oefening.leeftijden.indexOf(l) < 0) fouten.push(th.naam + ": '" + r.oefening.naam + "' is niet voor " + l);
    }));
  });
  ok("elke oefening bestaat, past bij de leeftijden en de training past in de tijd", fouten, []);
  ok("elke leeftijd minstens twee thematrainingen", BIB_LEEFTIJDEN.every((l) => BIB_THEMATRAININGEN.filter((t) => t.leeftijden.indexOf(l) >= 0).length >= 2), true);
  ok("elk thema minstens drie", BIB_THEMAS.every((t) => BIB_THEMATRAININGEN.filter((x) => x.thema === t).length >= 3), true);
  ok("namen uniek", new Set(BIB_THEMATRAININGEN.map((t) => t.naam)).size, BIB_THEMATRAININGEN.length);
  const th = BIB_THEMATRAININGEN[0];
  const tr = trainingUitThema(th, { id: 5000, datum: "2026-10-14", tijd: "18:00" });
  ok("als training: datum, tijd, duur en onderdelen", [tr.datum, tr.tijd, tr.duur, tr.onderdelen.length], ["2026-10-14", "18:00", th.duur, th.onderdelen.length]);
  ok("onderdelen krijgen de duur uit de thematraining", tr.onderdelen.map((o) => o.duur), th.onderdelen.map((r) => r[1]));
  ok("met tekening, als kopie (aanpassen raakt de bibliotheek niet)", [!!tr.onderdelen[0].tekening, tr.onderdelen[0].tekening !== onderdelenVanThema(th)[0].oefening.tekening], [true, true]);
  ok("ids uniek", new Set([tr.id].concat(tr.onderdelen.map((o) => o.id))).size, tr.onderdelen.length + 1);
}

groep("oude basisoefeningen bijwerken");
{
  const oud = BASIS_OEFENINGEN[0];
  const ongewijzigd = Object.assign({}, oud, { id: 111, tekening: null, favoriet: true });
  const aangepast = Object.assign({}, BASIS_OEFENINGEN[1], { id: 222, tekening: null, beschrijving: "Mijn eigen versie" });
  const eigen = { id: 333, naam: "Eigen oefening", leeftijd: "O9-O11", tekening: null };
  const r = werkOudeBasisBij([ongewijzigd, aangepast, eigen]);
  ok("alleen de ongewijzigde kopie bijgewerkt", r.bijgewerkt, 1);
  ok("krijgt tekening, leeftijden en thema; houdt id en favoriet", [!!r.lijst[0].tekening, r.lijst[0].leeftijden.length > 1, r.lijst[0].thema, r.lijst[0].id, r.lijst[0].favoriet], [true, true, "Tactiek", 111, true]);
  ok("zelf aangepaste versie blijft zoals hij was", r.lijst[1], aangepast);
  ok("eigen oefening blijft zoals hij was", r.lijst[2], eigen);
  ok("twee keer bijwerken verandert niets meer", werkOudeBasisBij(r.lijst).bijgewerkt, 0);
}

groep("kopiëren naar mijn oefeningen");
{
  const k = kopieVanBibliotheek(bib[0], 999);
  ok("nieuwe id, geen bron, herkomst bewaard", [k.id, k.bron, k.uitBibliotheek], [999, undefined, bib[0].id]);
  k.tekening.elems[0].x = -1;
  ok("de kopie aanpassen raakt de bibliotheek niet", bib[0].tekening.elems[0].x >= 0, true);
}

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
})();
