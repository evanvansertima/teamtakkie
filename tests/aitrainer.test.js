/* ══════════════════════════════════════════════════════════════
   Tests voor de AI-trainer: controleren en omzetten (release 4)
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/aitrainer.test.js

   Met nagemaakte AI-antwoorden — geldig, ongeldig en half geldig —
   zodat er nooit een echte AI nodig is om te weten of de controle
   klopt (hoofdstuk 5h en 8 van docs/updateplan-competitie-toernooi-ai.md).
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const WORTEL = path.join(__dirname, "..");
const MODULE = process.env.TT_AI || path.join(WORTEL, "src", "domein", "aitrainer.js");
const lees = (p) => fs.readFileSync(path.join(WORTEL, p), "utf8");
eval(fs.readFileSync(MODULE, "utf8").replace(/^const /gm, "var "));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);
const codes = (f) => f.map((x) => x.code + "@" + x.onderdeel);

const CONTEXT = { leeftijd: "O12-O14", niveau: "gemiddeld", spelers: 10, keepers: 1, duur: 60, ruimte: "half-b", doel: "Positiespel",
                  materiaal: { pionnen: 20, ballen: 10, doelen: 2, hesjes: true } };
/* Spelers op een rij, met labels. */
function spelers(labels) {
  return labels.map((l, i) => ({ soort: l[0] === "V" ? "speler-rood" : "speler", x: 10 + (i * 8) % 80, y: 20 + Math.floor(i / 10) * 30, label: l }));
}
function pionnen(n) { return Array.from({ length: n }, (_, i) => ({ soort: "pion", x: 5 + i * 4, y: 90 })); }
function geldig() {
  return {
    titel: "Positiespel met omschakeling",
    toelichting: "Van klein naar groot.",
    onderdelen: [
      { naam: "Passen in tweetallen", type: "Warming-up", doel: "Passen & trappen", duur: 12, intensiteit: "laag", aantalSpelers: 10,
        veldGrootte: "20 x 20 meter", materialen: "8 pionnen, 5 ballen",
        beschrijving: "A1 tot en met A5 passen met V1 tot en met V5. A1 A2 A3 A4 A5 V1 V2 V3 V4 V5 wisselen na twee minuten.",
        aandachtspunten: ["Pas over de grond", "Aannemen met de verste voet"],
        tekening: { veldType: "leeg", stappen: [{ elementen: spelers(["A1", "A2", "A3", "A4", "A5", "V1", "V2", "V3", "V4", "V5"]).concat(pionnen(8), [{ soort: "bal", x: 50, y: 50 }]),
                                                lijnen: [{ soort: "passlijn", x1: 10, y1: 20, x2: 50, y2: 20 }] }] } },
      { naam: "Rondo 5 tegen 2", type: "Positiespel", doel: "Positiespel", duur: 15, intensiteit: "middel", aantalSpelers: 7,
        veldGrootte: "12 x 12 meter", materialen: "4 pionnen, 2 ballen",
        beschrijving: "A1, A2, A3, A4 en A5 houden de bal rond; V1 en V2 jagen.",
        aandachtspunten: ["Sta breed"],
        tekening: { veldType: "leeg", stappen: [{ elementen: spelers(["A1", "A2", "A3", "A4", "A5", "V1", "V2"]).concat(pionnen(4), [{ soort: "bal", x: 40, y: 40 }]),
                                                lijnen: [{ soort: "passlijn", x1: 10, y1: 20, x2: 26, y2: 20 }, { soort: "looplijn", x1: 50, y1: 20, x2: 40, y2: 30 }] },
                                              { elementen: spelers(["A1", "A2", "A3", "A4", "A5", "V1", "V2"]).concat(pionnen(4)), lijnen: [] }] } },
      { naam: "Partijvorm 5 tegen 5 met keeper", type: "Wedstrijdvorm", doel: "Aanvallen", duur: 25, intensiteit: "middel", aantalSpelers: 11,
        veldGrootte: "halve speelhelft", materialen: "2 doelen, 6 pionnen, hesjes",
        beschrijving: "A1–A5 tegen V1–V5 op één groot doel met keeper K. A1 A2 A3 A4 A5 V1 V2 V3 V4 V5 K.",
        aandachtspunten: ["Snel omschakelen na balverlies"],
        tekening: { veldType: "half-b", stappen: [{ elementen: spelers(["A1", "A2", "A3", "A4", "A5", "V1", "V2", "V3", "V4", "V5", "K"]).concat(pionnen(6), [{ soort: "goal", x: 50, y: 2 }, { soort: "minidoel", x: 50, y: 98 }, { soort: "bal", x: 50, y: 50 }]),
                                                  lijnen: [{ soort: "schietlijn", x1: 50, y1: 40, x2: 50, y2: 5 }] }] } }
    ]
  };
}
const kopie = (x) => JSON.parse(JSON.stringify(x));

(function draai() {

groep("lijsten gelijk aan de app (de edge function heeft een kopie)");
{
  const opst = lees("src/schermen/opstellingen.jsx"), app = lees("src/app.jsx");
  const veld = opst.slice(opst.indexOf("const VELD_TYPEN = ["), opst.indexOf("];", opst.indexOf("const VELD_TYPEN = [")));
  const zichtbaar = (veld.match(/\{id:"([a-z0-9-]+)",[^}]*w:(\d+),h:(\d+)(?![^}]*verborgen)/g) || []).map((r) => r.match(/id:"([^"]+)".*w:(\d+),h:(\d+)/).slice(1).join(":"));
  ok("veldtypen en maten", AI_VELDTYPEN.map((v) => v.id + ":" + v.w + ":" + v.h), zichtbaar);
  ok("lijnsoorten", AI_LIJNSOORTEN, JSON.parse(opst.match(/const LIJN_TOOLS = (\[[^\]]+\])/)[1]));
  ok("soorten onderdeel", AI_ONDERDEELTYPEN, JSON.parse(app.match(/const TRAINING_TYPES = (\[[^\]]+\])/)[1]));
  ok("doelen", AI_DOELEN, JSON.parse(app.match(/const OEFENING_DOELEN = (\[[^\]]+\])/)[1]));
  const mat = (opst.match(/^const MATERIAAL = \[[\s\S]*?\];/m)[0].match(/id:"([a-z]+)"/g) || []).map((x) => x.slice(4, -1));
  ok("al het materiaal van het tekenbord is bekend", mat.filter((m) => AI_MATERIAALSOORTEN.indexOf(m) < 0), []);
  ok("leeftijden komen uit de oefeningenbibliotheek (zonder 'Alle')", AI_LEEFTIJDEN, JSON.parse(app.match(/const OEFENING_LEEFTIJDEN = (\[[^\]]+\])/)[1]).filter((x) => x !== "Alle"));
}

groep("wat er naar de AI mag");
{
  const v = veiligeContext(Object.assign({}, CONTEXT, { teamNaam: "FC Harlingen JO19-2", spelersLijst: ["Jan", "Piet"], email: "a@b.nl", spelers: 999, ruimte: "maanbasis" }));
  ok("alleen de toegestane velden", Object.keys(v).sort(), ["doel", "duur", "keepers", "leeftijd", "materiaal", "niveau", "ruimte", "spelers"]);
  ok("geen teamnaam, namen of e-mail in wat er naar de AI gaat", /Harlingen|Jan|Piet|a@b/.test(JSON.stringify(v) + aiSysteemInstructie(v)), false);
  ok("getallen begrensd, onbekende ruimte wordt de standaard", [v.spelers, v.ruimte], [40, "half-b"]);
  ok("contextregel", contextRegel(CONTEXT), "O12-O14 · 10 spelers + 1 keeper · 60 min · speelhelft, doel bovenaan");
  const instr = aiSysteemInstructie(CONTEXT);
  ok("instructie: geen diploma claimen, geen namen gebruiken, altijd via de tool", [/geen gediplomeerde/.test(instr), /nooit namen van spelers/i.test(instr), /tool "training"/.test(instr)], [true, true, true]);
  ok("instructie noemt tijd, spelers en materiaal", [/60 minuten/.test(instr), /10 veldspelers en 1 keeper/.test(instr), /20 pionnen/.test(instr)], [true, true, true]);
}

groep("geldig antwoord");
{
  ok("geen enkele melding", controleerTraining(geldig(), CONTEXT), []);
}

groep("ongeldig antwoord");
{
  ok("geen antwoord", codes(controleerTraining(null, CONTEXT)), ["schema@0"]);
  ok("geen onderdelen", codes(controleerTraining({ titel: "x", onderdelen: [] }, CONTEXT)), ["schema@0"]);
  const t = kopie(geldig()); t.onderdelen[2].duur = 35;   // 12 + 15 + 35 + 4 = 66
  ok("te lang: tijd inclusief overgangen", codes(controleerTraining(t, CONTEXT)), ["tijd@0"]);
  ok("…met de rekensom in de tekst", /12|62|66/.test(controleerTraining(t, CONTEXT)[0].tekst) && /66 min/.test(controleerTraining(t, CONTEXT)[0].tekst), true);
  const precies = kopie(geldig()); precies.onderdelen[2].duur = 29;   // 12 + 15 + 29 + 4 = 60
  ok("precies passend mag", controleerTraining(precies, CONTEXT), []);
  const sp = kopie(geldig()); sp.onderdelen[1].aantalSpelers = 8;
  ok("tekst en tekening noemen een ander aantal spelers", codes(controleerTraining(sp, CONTEXT)), ["spelers@2"]);
  const zk = kopie(geldig());
  ok("keeper getekend terwijl er geen is", codes(controleerTraining(zk, Object.assign({}, CONTEXT, { keepers: 0 }))).filter((c) => c.indexOf("spelers") === 0), ["spelers@3", "spelers@3"]);
  ok("meer spelers dan er zijn (8 + 1 keeper = 9; warming-up 10, partij 11)", codes(controleerTraining(geldig(), Object.assign({}, CONTEXT, { spelers: 8 }))), ["spelers@1", "spelers@3"]);
  ok("te weinig pionnen", codes(controleerTraining(geldig(), Object.assign({}, CONTEXT, { materiaal: { pionnen: 5, ballen: 10, doelen: 2 } }))), ["materiaal@1", "materiaal@3"]);
  const hoed = kopie(geldig()); hoed.onderdelen[1].tekening.stappen[0].elementen.push({ soort: "hoedje", x: 1, y: 1 }, { soort: "hoedje", x: 2, y: 2 });
  ok("hoedjes tellen mee als pion (4 + 2 = 6 > 5)", codes(controleerTraining(hoed, Object.assign({}, CONTEXT, { materiaal: { pionnen: 5, ballen: 10, doelen: 2 } }))), ["materiaal@1", "materiaal@2", "materiaal@3"]);
  ok("te weinig doelen (groot én klein tellen mee)", codes(controleerTraining(geldig(), Object.assign({}, CONTEXT, { materiaal: { pionnen: 20, ballen: 10, doelen: 1 } }))), ["materiaal@3"]);
  ok("geen ballen", codes(controleerTraining(geldig(), Object.assign({}, CONTEXT, { materiaal: { pionnen: 20, ballen: 0, doelen: 2 } }))), ["materiaal@1", "materiaal@2", "materiaal@3"]);
  const buiten = kopie(geldig()); buiten.onderdelen[0].tekening.stappen[0].elementen[0].x = 130;
  ok("element buiten het veld", codes(controleerTraining(buiten, CONTEXT)), ["veld@1"]);
  const lijn = kopie(geldig()); lijn.onderdelen[1].tekening.stappen[0].lijnen[0].soort = "kronkellijn";
  ok("onbekende lijnsoort", codes(controleerTraining(lijn, CONTEXT)), ["tekening@2"]);
  const vt = kopie(geldig()); vt.onderdelen[0].tekening.veldType = "maan";
  ok("onbekend veldtype", codes(controleerTraining(vt, CONTEXT)), ["tekening@1"]);
  const lab = kopie(geldig()); lab.onderdelen[1].beschrijving = "A1, A2, A3, A4, A5 en A6 houden de bal rond; V1 en V2 jagen.";
  ok("tekst noemt A6 die niet getekend is", codes(controleerTraining(lab, CONTEXT)), ["labels@2"]);
  const lab2 = kopie(geldig()); lab2.onderdelen[1].beschrijving = "A1, A2, A3 en A4 houden de bal rond; V1 en V2 jagen.";
  ok("A5 getekend maar niet in de tekst", codes(controleerTraining(lab2, CONTEXT)), ["labels@2"]);
  const sch = kopie(geldig()); delete sch.onderdelen[0].beschrijving; sch.onderdelen[0].intensiteit = "extreem";
  ok("ontbrekende velden en onbekende waarden", codes(controleerTraining(sch, CONTEXT)).filter((c) => c === "schema@1").length, 2);
}

groep("belasting per leeftijd");
{
  const jong = Object.assign({}, CONTEXT, { leeftijd: "O9-O11" });
  const t = kopie(geldig()); t.onderdelen[1].intensiteit = "hoog"; t.onderdelen[1].duur = 9;
  ok("onder 12: 9 minuten hoog aaneen is te veel", codes(controleerTraining(t, jong)), ["belasting@2"]);
  t.onderdelen[1].duur = 8;
  ok("8 minuten mag", controleerTraining(t, jong), []);
  const twee = kopie(geldig()); twee.onderdelen[1].intensiteit = "hoog"; twee.onderdelen[1].duur = 6; twee.onderdelen[2].intensiteit = "hoog"; twee.onderdelen[2].duur = 6;
  ok("twee hoge onderdelen achter elkaar tellen samen", codes(controleerTraining(twee, jong)), ["belasting@3"]);
  ok("bij senioren geen grens", controleerTraining(twee, Object.assign({}, CONTEXT, { leeftijd: "Senioren" })), []);
}

groep("half geldig: correctievraag");
{
  const t = kopie(geldig()); t.onderdelen[2].duur = 35; t.onderdelen[1].aantalSpelers = 8;
  const f = controleerTraining(t, CONTEXT);
  const vraag = correctieVraag(f);
  ok("de correctievraag noemt elke fout", f.every((x) => vraag.indexOf(x.tekst) >= 0), true);
  ok("en vraagt de hele training opnieuw", /hele training opnieuw/.test(vraag), true);
}

groep("omzetten naar oefening en training");
{
  const tr = geldig();
  const oef = naarOefening(tr.onderdelen[2], CONTEXT);
  const leeg = lees("src/app.jsx").match(/const LEEG_OEFENING = \{([\s\S]*?)\};/)[1];
  const velden = (leeg.match(/([a-zA-Z]+):/g) || []).map((x) => x.slice(0, -1));
  ok("alle velden van een gewone oefening", velden.filter((v) => !(v in oef)), []);
  ok("herkomst AI zichtbaar, leeftijd uit de context", [oef.ai, oef.ongecontroleerd, oef.leeftijd, oef.categorie], [true, false, "O12-O14", "Aanvallend"]);
  ok("aandachtspunten als regels", oef.aandachtspunten, "Snel omschakelen na balverlies");
  const tek = oef.tekening;
  ok("tekening in procenten wordt logische eenheden (half veld 430x320)", [tek.veldType, tek.elems[0].x, tek.elems[0].y], ["half-b", 43, 64]);
  ok("spelers krijgen hun label als rugnummer", tek.elems.filter((e) => e.nr).map((e) => e.nr).slice(-1), ["K"]);
  ok("hoofdtekening = eerste stap", [tek.elems.length, tek.stappen.length, tek.stappen[0].elems === tek.elems], [20, 1, true]);
  ok("lijnen omgerekend", [tek.lijnen[0].type, tek.lijnen[0].y2], ["schietlijn", 16]);
  const t = naarTraining(tr, CONTEXT, { datum: "2026-10-14", tijd: "19:00" });
  ok("training met datum, tijd en drie onderdelen", [t.datum, t.tijd, t.duur, t.onderdelen.length], ["2026-10-14", "19:00", 60, 3]);
  ok("materiaallijst: het meeste van elk soort", t.materialen, "8 pionnen, 1 bal, 1 doel, 1 klein doel");
  ok("doelstelling = titel en toelichting", t.doelstellingen, "Positiespel met omschakeling\nVan klein naar groot.");
  ok("opgeslagen ondanks meldingen: gemarkeerd", [naarTraining(tr, CONTEXT, { ongecontroleerd: true }).ongecontroleerd, /ondanks meldingen/.test(naarTraining(tr, CONTEXT, { ongecontroleerd: true }).notities)], [true, true]);
  const ids = t.onderdelen.map((o) => o.id).concat(t.onderdelen.flatMap((o) => o.tekening.elems.map((e) => e.id)));
  ok("alle ids uniek", new Set(ids).size, ids.length);
}

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
})();
