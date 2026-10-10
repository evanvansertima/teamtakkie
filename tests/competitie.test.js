/* ══════════════════════════════════════════════════════════════
   Tests voor de competitie: fases, schema, stand, onderling resultaat
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/competitie.test.js

   Stap 1 van release 1 uit docs/updateplan-competitie-toernooi-ai.md
   (hoofdstuk 11): deze tests zijn geschreven VÓÓR src/domein/competitie.js
   bestaat. Ze leggen vast wat de module moet doen, niet hoe.

   Zoals de andere domeintests: geen kopie, maar de bron zelf. De hele
   module wordt ingelezen (het zijn losse functies in één gedeelde
   scope, zie tools/bouw.js), plus maakPouleSchema uit
   src/domein/wedstrijden.js, die de module moet hergebruiken.

   DE SCENARIO'S (nummers uit hoofdstuk 9 van het plan)
    1  Nieuwe fase begint op nul; de vorige blijft intact.
    2  Uitslag tussen twee andere teams werkt beide bij.
    3  Lege uitslag telt niet; een definitieve 0–0 wel.
    4  Zes teams: halve competitie 15, hele 30.
    5  Oneven aantal: elke ronde één vrij team, ieder één keer.
    6  Uitgestelde wedstrijd blijft in zijn eigen fase tellen.
    7  Statistiekfilters tellen een wedstrijd nooit dubbel.
    8  Onderling resultaat bij drie gelijke teams, opnieuw toegepast
       op de twee die daarna nog gelijk staan.
    9  Correctie werkt de stand bij; het logboek heeft oud en nieuw.
   17  Dezelfde bewerking twee keer = één keer.
   20  Een speler gekoppeld over twee teams telt per wedstrijd één keer.
   Plus: validaties (tegen zichzelf, dubbel paar, uitslag zonder
   status) en het samenvoegen van teamnamen.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const WORTEL = path.join(__dirname, "..");
const MODULE = process.env.TT_COMPETITIE || path.join(WORTEL, "src", "domein", "competitie.js");

if (!fs.existsSync(MODULE)) {
  console.log("\nsrc/domein/competitie.js bestaat nog niet.");
  console.log("Dat hoort zo vóór stap 2 van het implementatiepakket: deze tests");
  console.log("leggen eerst vast wat de module moet doen.\n");
  console.log("0 geslaagd, 1 gefaald");
  process.exitCode = 1;
  return;
}

/* maakPouleSchema uit de bron knippen: de module hoort die te
   hergebruiken in plaats van een tweede cirkelmethode te bouwen. */
const wedstrijdenBron = fs.readFileSync(path.join(WORTEL, "src", "domein", "wedstrijden.js"), "utf8").split("\n");
function knip(regels, naam) {
  const a = regels.findIndex((r) => new RegExp("^function " + naam + "\\(").test(r));
  if (a < 0) throw new Error(naam + " niet gevonden");
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}
eval(knip(wedstrijdenBron, "maakPouleSchema"));
/* De hele module, met const → var zodat de namen buiten de eval
   zichtbaar zijn (zelfde reden als in tests/overstappen.test.js). */
eval(fs.readFileSync(MODULE, "utf8").replace(/^const /gm, "var "));

/* ── minimale testhulp ── */
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);
const veilig = (f) => { try { return f(); } catch (e) { return "WERPT: " + e.message; } };

/* ── bouwstenen voor de vulling ── */
const REGELS = { winst: 3, gelijk: 1, verlies: 0, volgorde: ["punten", "saldo", "voor", "onderling"] };
const team = (id, naam, eigen) => ({ id, naam, eigen: !!eigen, aliassen: [] });
const cw = (id, thuisId, uitId, uitslag, o) => Object.assign({
  id, rondeId: "r1", thuisId, uitId, datum: "", tijd: "", locatie: "",
  status: uitslag ? "gespeeld" : "gepland", uitslag: uitslag || null, notitie: ""
}, o || {});
const fase = (id, deelnemers, wedstrijden, o) => Object.assign({
  id, naam: id, van: "", tot: "", status: "open", vorm: "handmatig",
  regels: REGELS, deelnemers, rondes: [{ id: "r1", nummer: 1, naam: "Ronde 1" }], wedstrijden
}, o || {});
const competitie = (teams, fases, actief) => ({
  id: "c1", naam: "Competitie", actieveFaseId: actief || fases[0].id, teams, fases, logboek: []
});
/* Rij uit de stand, teruggebracht tot wat een test wil vergelijken */
const kaal = (r) => ({ teamId: r.teamId, g: r.gespeeld, w: r.winst, gl: r.gelijk, v: r.verlies, dv: r.voor, dt: r.tegen, p: r.punten });
const rijVan = (stand, id) => stand.filter((r) => r.teamId === id)[0];

/* Een eigen wedstrijd zoals de app hem nu kent (LEEG_WEDSTRIJD),
   met alleen wat de competitie leest. */
const eigenW = (id, thuis, fch, teg, status) => ({
  id, thuis, status: status || "gespeeld", soort: "competitie", score: { fch, teg }
});

(function draai() {

/* ══ teamnamen samenvoegen ══ */
groep("teamnamen");
ok("hoofdletters, puntjes en spaties maken geen verschil",
   normaliseerTeamNaam("V.V. Bolsward  JO19-1"), normaliseerTeamNaam("vv bolsward jo19-1"));
ok("s.v. en sv zijn hetzelfde",
   normaliseerTeamNaam("S.V. Harkema"), normaliseerTeamNaam("sv harkema"));
ok("accenten tellen niet",
   normaliseerTeamNaam("Sneek Wit Zwart Één"), normaliseerTeamNaam("sneek wit zwart een"));
ok("maar een ander teamnummer is een ander team",
   normaliseerTeamNaam("VV Bolsward JO19-1") === normaliseerTeamNaam("VV Bolsward JO19-2"), false);

/* ══ 4 + 5: schema ══ */
groep("schema genereren (4 en 5)");
const zes = ["a", "b", "c", "d", "e", "f"];
const half6 = genereerSchema(zes, "half");
const heel6 = genereerSchema(zes, "heel");
const paren = (s) => [].concat.apply([], s.rondes.map((r) => r.paren));
ok("6 teams, halve competitie: 15 wedstrijden", paren(half6).length, 15);
ok("in 5 rondes", half6.rondes.length, 5);
ok("6 teams, hele competitie: 30 wedstrijden", paren(heel6).length, 30);
ok("in 10 rondes", heel6.rondes.length, 10);
const ongeordend = (p) => p.slice().sort().join("-");
const telParen = (lijst, sleutel) => lijst.reduce((m, p) => { const k = sleutel(p); m[k] = (m[k] || 0) + 1; return m; }, {});
ok("halve competitie: elk paar precies één keer",
   Object.values(telParen(paren(half6), ongeordend)).every((n) => n === 1) && Object.keys(telParen(paren(half6), ongeordend)).length === 15, true);
ok("hele competitie: elk paar precies twee keer",
   Object.values(telParen(paren(heel6), ongeordend)).every((n) => n === 2), true);
ok("hele competitie: elk paar één keer thuis en één keer uit",
   Object.values(telParen(paren(heel6), (p) => p.join(">"))).every((n) => n === 1), true);
ok("geen team speelt tegen zichzelf", paren(heel6).some((p) => p[0] === p[1]), false);

const vijf = ["a", "b", "c", "d", "e"];
const half5 = genereerSchema(vijf, "half");
ok("5 teams: 10 wedstrijden", paren(half5).length, 10);
ok("in 5 rondes", half5.rondes.length, 5);
ok("elke ronde precies één vrij team",
   half5.rondes.every((r) => typeof r.vrijTeamId === "string" && vijf.indexOf(r.vrijTeamId) >= 0), true);
ok("ieder team precies één keer vrij",
   half5.rondes.map((r) => r.vrijTeamId).sort(), vijf.slice().sort());
ok("het vrije team speelt in die ronde niet",
   half5.rondes.every((r) => r.paren.every((p) => p.indexOf(r.vrijTeamId) < 0)), true);
ok("bij een even aantal is niemand vrij",
   half6.rondes.every((r) => r.vrijTeamId === null), true);

/* ══ 3: lege uitslag ≠ 0–0 ══ */
groep("lege uitslag en 0–0 (3)");
{
  const c = competitie([team("a", "A"), team("b", "B"), team("x", "X"), team("y", "Y")], [fase("f1", ["a", "b", "x", "y"], [
    cw("w1", "a", "b", null),                                   // nog geen uitslag
    cw("w2", "x", "y", { thuis: 0, uit: 0 })                    // definitieve 0–0
  ])]);
  const st = standVanFase(c, "f1", []);
  ok("wedstrijd zonder uitslag telt voor niemand als gespeeld",
     [rijVan(st, "a").gespeeld, rijVan(st, "b").gespeeld], [0, 0]);
  ok("een definitieve 0–0 telt: beide 1 gespeeld, 1 gelijk, 1 punt",
     [kaal(rijVan(st, "x")), kaal(rijVan(st, "y"))],
     [{ teamId: "x", g: 1, w: 0, gl: 1, v: 0, dv: 0, dt: 0, p: 1 },
      { teamId: "y", g: 1, w: 0, gl: 1, v: 0, dv: 0, dt: 0, p: 1 }]);
  ok("een uitgestelde wedstrijd telt niet",
     rijVan(standVanFase(competitie(c.teams, [fase("f1", ["a", "b"], [cw("w1", "a", "b", null, { status: "uitgesteld" })])]), "f1", []), "a").gespeeld, 0);
}

/* ══ 2: uitslag tussen twee andere teams ══ */
groep("uitslag tussen twee andere teams (2)");
{
  const c = competitie([team("e", "Eigen", true), team("a", "VV A"), team("b", "VV B")],
    [fase("f1", ["e", "a", "b"], [cw("w1", "a", "b", { thuis: 2, uit: 1 })])]);
  const st = standVanFase(c, "f1", []);
  ok("VV A: gespeeld 1, gewonnen, 2–1, 3 punten", kaal(rijVan(st, "a")), { teamId: "a", g: 1, w: 1, gl: 0, v: 0, dv: 2, dt: 1, p: 3 });
  ok("VV B: gespeeld 1, verloren, 1–2, 0 punten", kaal(rijVan(st, "b")), { teamId: "b", g: 1, w: 0, gl: 0, v: 1, dv: 1, dt: 2, p: 0 });
  ok("het eigen team speelde niet en staat op nul", rijVan(st, "e").gespeeld, 0);
  ok("de eigen rij is als eigen gemarkeerd", rijVan(st, "e").eigen, true);
}

/* ══ 1: nieuwe fase begint op nul ══ */
groep("nieuwe fase (1)");
{
  /* Vijf eigen wedstrijden, gekoppeld via wedstrijdId; de uitslag
     staat in de eigen Wedstrijd, niet in de competitie (één
     registratie, hoofdstuk 4d). */
  const eigen = [
    eigenW("e1", true, 2, 0), eigenW("e2", false, 1, 1), eigenW("e3", true, 3, 1),
    eigenW("e4", false, 0, 2), eigenW("e5", true, 1, 0)
  ];
  const tegen = ["t1", "t2", "t3", "t4", "t5"];
  const f1 = fase("f1", ["e"].concat(tegen), eigen.map((w, i) => cw("c" + (i + 1),
    w.thuis ? "e" : tegen[i], w.thuis ? tegen[i] : "e", null, { status: "gepland", wedstrijdId: w.id })));
  const c = competitie([team("e", "Eigen", true)].concat(tegen.map((t) => team(t, t.toUpperCase()))), [f1]);
  const voor = standVanFase(c, "f1", eigen);
  ok("Fase 1: eigen team 5 gespeeld, 3 gewonnen, 1 gelijk, 1 verloren, 10 punten",
     kaal(rijVan(voor, "e")), { teamId: "e", g: 5, w: 3, gl: 1, v: 1, dv: 7, dt: 4, p: 10 });
  ok("de uitslag wordt gelezen uit de eigen wedstrijd (uitwedstrijd 1–1: tegenstander ook 1 punt)",
     kaal(rijVan(voor, "t2")), { teamId: "t2", g: 1, w: 0, gl: 1, v: 0, dv: 1, dt: 1, p: 1 });

  const na = nieuweFase(c, { id: "f2", naam: "Fase 2", kopieerDeelnemers: true, kopieerRegels: true, vorm: "half" });
  ok("de nieuwe fase is actief", na.actieveFaseId, "f2");
  ok("dezelfde deelnemers zijn overgenomen", na.fases[1].deelnemers, f1.deelnemers);
  ok("geen enkele wedstrijd is overgenomen", na.fases[1].wedstrijden.length, 0);
  ok("Fase 2: eigen team 0 gespeeld, 0 punten",
     kaal(rijVan(standVanFase(na, "f2", eigen), "e")), { teamId: "e", g: 0, w: 0, gl: 0, v: 0, dv: 0, dt: 0, p: 0 });
  ok("Fase 1 is na het openen van Fase 2 onveranderd",
     standVanFase(na, "f1", eigen).map(kaal), voor.map(kaal));
  ok("de oorspronkelijke competitie zelf is niet aangepast (geen verborgen wijziging)",
     [c.fases.length, c.actieveFaseId], [1, "f1"]);
}

/* ══ 6: uitgestelde wedstrijd blijft in zijn fase ══ */
groep("uitgestelde wedstrijd (6)");
{
  const f1 = fase("f1", ["a", "b"], [cw("w1", "a", "b", { thuis: 1, uit: 0 }, { datum: "2026-12-05" })],
    { van: "2026-09-01", tot: "2026-11-30", status: "afgesloten" });
  const f2 = fase("f2", ["a", "b"], [], { van: "2026-12-01", tot: "2027-03-31" });
  const c = competitie([team("a", "A"), team("b", "B")], [f1, f2], "f2");
  ok("gespeeld in de periode van Fase 2, telt toch in Fase 1", rijVan(standVanFase(c, "f1", []), "a").punten, 3);
  ok("en niet in Fase 2", rijVan(standVanFase(c, "f2", []), "a").gespeeld, 0);
}

/* ══ 8: onderling resultaat, drie gelijke teams ══ */
groep("onderling resultaat (8)");
{
  /* Met de hand uitgerekend (zie de uitleg in het plan, 5a):
       A–B 2–1   B–C 3–1   C–A 3–0
       A–D 5–0   B–D 3–1   C–D 3–1
     Totaal: A, B en C allemaal 6 punten, doelsaldo +3, 7 voor.
     Minicompetitie A/B/C: alle drie 3 punten; saldo B +1, C +1, A −2.
     A valt af naar plek 3. B en C staan dan nog gelijk (saldo +1,
     4 voor) → opnieuw, alleen tussen B en C: B won 3–1. */
  const ws = [
    cw("1", "a", "b", { thuis: 2, uit: 1 }), cw("2", "b", "c", { thuis: 3, uit: 1 }),
    cw("3", "c", "a", { thuis: 3, uit: 0 }), cw("4", "a", "d", { thuis: 5, uit: 0 }),
    cw("5", "b", "d", { thuis: 3, uit: 1 }), cw("6", "c", "d", { thuis: 3, uit: 1 })
  ];
  const c = competitie(["a", "b", "c", "d"].map((t) => team(t, t.toUpperCase())), [fase("f1", ["a", "b", "c", "d"], ws)]);
  const st = standVanFase(c, "f1", []);
  ok("vooraf: A, B en C staan gelijk op punten, saldo en voor",
     ["a", "b", "c"].map((t) => { const r = rijVan(st, t); return [r.punten, r.saldo, r.voor]; }),
     [[6, 3, 7], [6, 3, 7], [6, 3, 7]]);
  ok("volgorde B, C, A, D", st.map((r) => r.teamId), ["b", "c", "a", "d"]);
  ok("met plekken 1 t/m 4, niemand gedeeld", st.map((r) => [r.plek, r.gedeeld]), [[1, false], [2, false], [3, false], [4, false]]);

  /* Blijft het gelijk, dan gedeelde plek — niet stiekem beslissen. */
  const c2 = competitie([team("x", "Xenia"), team("y", "Ypsilon")],
    [fase("f1", ["x", "y"], [cw("1", "x", "y", { thuis: 1, uit: 1 })])]);
  const st2 = standVanFase(c2, "f1", []);
  ok("echt gelijk: beide op plek 1, gedeeld", st2.map((r) => [r.teamId, r.plek, r.gedeeld]), [["x", 1, true], ["y", 1, true]]);

  /* De volgorde is instelbaar: met onderling vóór doelsaldo wint de
     winnaar van het onderlinge duel, ook met een slechter saldo. */
  const ws3 = [cw("1", "p", "q", { thuis: 1, uit: 0 }), cw("2", "p", "r", { thuis: 0, uit: 5 }),
               cw("3", "q", "r", { thuis: 5, uit: 0 })];
  const regels2 = { winst: 3, gelijk: 1, verlies: 0, volgorde: ["punten", "onderling", "saldo", "voor"] };
  const c3 = competitie(["p", "q", "r"].map((t) => team(t, t)), [fase("f1", ["p", "q", "r"], ws3, { regels: regels2 })]);
  const st3 = standVanFase(c3, "f1", []);
  /* p, q, r allemaal 3 punten; onderling is dat dezelfde drie wedstrijden,
     dus beslist het onderlinge saldo: q +4, r 0, p −4. */
  ok("instelbare volgorde wordt gevolgd", st3.map((r) => r.teamId), ["q", "r", "p"]);
}

/* ══ 9 + 17: bewerkingen, correcties, logboek ══ */
groep("bewerkingen, correctie en logboek (9, 17)");
{
  const c = competitie([team("a", "A"), team("b", "B")], [fase("f1", ["a", "b"], [cw("w1", "a", "b", null)])]);
  const op1 = { soort: "uitslag", faseId: "f1", wedstrijdId: "w1", status: "gespeeld", uitslag: { thuis: 2, uit: 0 }, tijd: "2026-10-10T10:00:00Z", door: "evan" };
  const na1 = pasBewerkingToe(c, op1);
  ok("na invoeren: A 3 punten", rijVan(standVanFase(na1, "f1", []), "a").punten, 3);
  const op2 = Object.assign({}, op1, { uitslag: { thuis: 0, uit: 1 }, tijd: "2026-10-10T11:00:00Z" });
  const na2 = pasBewerkingToe(na1, op2);
  ok("na correctie naar 0–1: A 0 punten, B 3", [rijVan(standVanFase(na2, "f1", []), "a").punten, rijVan(standVanFase(na2, "f1", []), "b").punten], [0, 3]);
  const laatste = na2.logboek[na2.logboek.length - 1];
  ok("het logboek bewaart oud en nieuw",
     [laatste.wedstrijdId, laatste.voor.uitslag, laatste.na.uitslag, laatste.door],
     ["w1", { thuis: 2, uit: 0 }, { thuis: 0, uit: 1 }, "evan"]);
  ok("twee regels in het logboek", na2.logboek.length, 2);
  const na3 = pasBewerkingToe(na2, op2);
  ok("dezelfde bewerking nog eens: niets verandert", JSON.stringify(na3.fases), JSON.stringify(na2.fases));
  ok("en er komt geen logregel bij", na3.logboek.length, 2);
  ok("de invoer zelf wordt niet aangepast", c.fases[0].wedstrijden[0].uitslag, null);
}

/* ══ validaties ══ */
groep("validaties");
{
  const f = fase("f1", ["a", "b", "c"], [cw("w1", "a", "b", null)], { vorm: "half" });
  ok("tegen zichzelf", valideerWedstrijd(f, cw("x", "a", "a", null)), ["zelf"]);
  ok("een team dat niet in de fase zit", valideerWedstrijd(f, cw("x", "a", "z", null)), ["geen-deelnemer"]);
  ok("halve competitie: hetzelfde paar nog eens (ook omgedraaid)", valideerWedstrijd(f, cw("x", "b", "a", null)), ["dubbel"]);
  const fh = fase("f1", ["a", "b"], [cw("w1", "a", "b", null)], { vorm: "heel" });
  ok("hele competitie: de returnwedstrijd mag", valideerWedstrijd(fh, cw("x", "b", "a", null)), []);
  ok("hele competitie: dezelfde thuis-uit nog eens niet", valideerWedstrijd(fh, cw("x", "a", "b", null)), ["dubbel"]);
  ok("gespeeld zonder uitslag", valideerWedstrijd(f, cw("x", "a", "c", null, { status: "gespeeld" })), ["gespeeld-zonder-uitslag"]);
  ok("uitslag bij een geplande wedstrijd", valideerWedstrijd(f, cw("x", "a", "c", null, { status: "gepland", uitslag: { thuis: 1, uit: 0 } })), ["uitslag-zonder-gespeeld"]);
  ok("negatieve of gebroken score", valideerWedstrijd(f, cw("x", "a", "c", { thuis: -1, uit: 1.5 })), ["score-ongeldig"]);
  ok("een geldige wedstrijd", valideerWedstrijd(f, cw("x", "a", "c", { thuis: 1, uit: 0 })), []);
  ok("pasBewerkingToe weigert een ongeldige uitslag",
     veilig(() => pasBewerkingToe(competitie([team("a", "A"), team("b", "B")], [fase("f1", ["a", "b"], [cw("w1", "a", "b", null)])]),
       { soort: "uitslag", faseId: "f1", wedstrijdId: "w1", status: "gespeeld", uitslag: { thuis: -2, uit: 0 }, tijd: "t", door: "d" })).toString().indexOf("WERPT") === 0, true);
}

/* ══ achterstallig ══ */
groep("onvolledige stand");
{
  const f = fase("f1", ["a", "b", "c"], [
    cw("w1", "a", "b", null, { datum: "2026-10-01" }),          // verleden, geen uitslag
    cw("w2", "b", "c", null, { datum: "2026-12-01" }),          // toekomst
    cw("w3", "a", "c", { thuis: 1, uit: 0 }, { datum: "2026-09-01" })
  ]);
  ok("alleen de wedstrijd in het verleden zonder uitslag is achterstallig",
     achterstallig(competitie([team("a", "A"), team("b", "B"), team("c", "C")], [f]), "f1", [], "2026-10-09"), ["w1"]);
}

/* ══ 7 + 20: statistieken over fases, seizoenen en teams ══ */
groep("statistieken: niets dubbel (7, 20)");
{
  const w = (id, faseId, scorers) => ({ id, status: "gespeeld", soort: "competitie", competitie: faseId ? { faseId } : undefined, scorers: scorers || [] });
  const jo19 = { teamId: "jo19", seizoen: "2026/2027", wedstrijden: [w("1", "f1"), w("2", "f2"), w("3", null)] };
  const totaal = verzamelWedstrijden([
    { bron: jo19, fases: ["f1"] },
    { bron: jo19, fases: ["f1", "f2"] },
    { bron: jo19, fases: null }                                   // heel seizoen
  ], ["competitie", "beker"]);
  ok("fase 1 + fases 1 en 2 + heel seizoen: elke wedstrijd één keer",
     totaal.map((x) => x.wedstrijd.id).sort(), ["1", "2", "3"]);
  const alleenFase2 = verzamelWedstrijden([{ bron: jo19, fases: ["f2"] }], ["competitie"]);
  ok("alleen fase 2", alleenFase2.map((x) => x.wedstrijd.id), ["2"]);
  const oefen = { teamId: "jo19", seizoen: "2026/2027", wedstrijden: [Object.assign(w("9", null), { soort: "oefen" })] };
  ok("een oefenwedstrijd valt weg als oefen niet is gekozen",
     verzamelWedstrijden([{ bron: oefen, fases: null }], ["competitie", "beker"]).length, 0);
  ok("een niet-gespeelde wedstrijd telt nooit",
     verzamelWedstrijden([{ bron: { teamId: "x", seizoen: "s", wedstrijden: [Object.assign(w("8", null), { status: "gepland" })] }, fases: null }], ["competitie"]).length, 0);

  /* Speler Daan zat vorig seizoen in JO17-1 (id 11) en nu in JO19-2
     (id 22), gekoppeld met dezelfde persoonId. Zelfde wedstrijd-id in
     twee teams is toeval en mag niet samensmelten. */
  /* Doelpunten zoals de app ze bewaart: eigenTeam true = van ons,
     eigenTeam false = van de tegenstander (zonder spelerId). */
  const goal = (id) => ({ spelerId: id, eigenTeam: true });
  const tegengoal = { spelerId: null, eigenTeam: false };
  const jo17 = { teamId: "jo17", seizoen: "2025/2026", wedstrijden: [w("1", null, [goal(11), goal(11), tegengoal])] };
  /* Een doelpunt vóór de tegenstander dat tóch een spelerId draagt (zoals
     een eigen doelpunt zou doen) telt niet voor die speler — dezelfde regel
     als berekenSpelerStats in src/domein/statistieken.js (alleen eigenTeam). */
  const voorTegenstander = { spelerId: 33, eigenTeam: false };
  const jo19b = { teamId: "jo19", seizoen: "2026/2027", wedstrijden: [w("1", null, [goal(22), tegengoal]), w("2", null, [goal(22), goal(33), voorTegenstander])] };
  const verz = verzamelWedstrijden([{ bron: jo17, fases: null }, { bron: jo19b, fases: null }, { bron: jo19b, fases: null }], ["competitie"]);
  ok("zelfde wedstrijd-id in twee teams blijven twee wedstrijden", verz.length, 3);
  const spelers = { jo17: [{ id: 11, persoonId: "daan" }], jo19: [{ id: 22, persoonId: "daan" }, { id: 33, persoonId: "sem" }] };
  ok("Daan: 4 doelpunten over twee teams, Sem 1 — niets dubbel, tegengoals tellen niet",
     doelpuntenPerPersoon(verz, spelers), { daan: 4, sem: 1 });
}

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
})();
