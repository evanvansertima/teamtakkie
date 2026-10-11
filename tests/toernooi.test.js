/* ══════════════════════════════════════════════════════════════
   Tests voor de toernooimodule (release 2)
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/toernooi.test.js

   Geschreven tegen docs/updateplan-competitie-toernooi-ai.md, hoofdstuk
   4e, 5e en 5f, vóór src/domein/toernooi.js af was.

   WAAR HET OM GAAT
   11  Meerdere categorieën, dagen en locaties; nooit een wedstrijd
       tussen twee categorieën.
   13  Een gecorrigeerde poule-uitslag verandert een al gespeelde
       knock-outwedstrijd niet ongemerkt.
       Plus: poules verdelen (met sterkte, herhaalbaar), poulewedstrijden,
       stand per poule (gedeeld met de competitie), beste nummers drie
       over ongelijke poules (gemiddelden), knock-out met vrijstellingen,
       strafschoppen apart, doorstroming pas na "Start knock-out",
       conflicten in het schema.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const WORTEL = path.join(__dirname, "..");
const MODULE = process.env.TT_TOERNOOI || path.join(WORTEL, "src", "domein", "toernooi.js");
const lees = (p) => fs.readFileSync(path.join(WORTEL, p), "utf8");
function knip(bron, naam) {
  const regels = bron.split("\n");
  const a = regels.findIndex((r) => new RegExp("^function " + naam + "\\(").test(r));
  if (a < 0) throw new Error(naam + " niet gevonden");
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}
eval(knip(lees("src/domein/wedstrijden.js"), "maakPouleSchema"));
eval(knip(lees("src/domein/wedstrijden.js"), "tijdPlusMinuten"));
eval(knip(lees("src/domein/wedstrijden.js"), "toernooiStand"));
eval(knip(lees("src/domein/statistieken.js"), "standMetPunten"));
/* De oude stand zoals het oude toernooischerm hem toonde. */
function toernooiStandV1(oud) { return toernooiStand(oud.teams, oud.wedstrijden).map((r) => [r.naam, r.gespeeld, r.punten]); }
eval(lees("src/domein/competitie.js").replace(/^const /gm, "var "));
if (!fs.existsSync(MODULE)) { console.log("src/domein/toernooi.js bestaat nog niet.\n0 geslaagd, 1 gefaald"); process.exitCode = 1; return; }
eval(fs.readFileSync(MODULE, "utf8").replace(/^const /gm, "var "));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);
const veilig = (f) => { try { return f(); } catch (e) { return "WERPT: " + e.message; } };

/* Een toernooi met twee categorieën, twee dagen, twee locaties. */
function basis() {
  let t = maakToernooi({ id: "t1", naam: "Paastoernooi" });
  t = Object.assign({}, t, {
    dagen: [{ id: "d1", datum: "2027-04-17", start: "09:00", eind: "17:00" }, { id: "d2", datum: "2027-04-18", start: "09:00", eind: "15:00" }],
    locaties: [{ id: "l1", naam: "Sportpark A", velden: [{ id: "v1", naam: "Veld 1" }, { id: "v2", naam: "Veld 2" }] },
               { id: "l2", naam: "Sportpark B", velden: [{ id: "v3", naam: "Veld 3" }] }],
    categorieen: [
      Object.assign(nieuweCategorie(), { id: "c11", naam: "JO11", spelvorm: "6x6", wedstrijdduur: 15, wisseltijd: 5, minRust: 10 }),
      Object.assign(nieuweCategorie(), { id: "c13", naam: "JO13", spelvorm: "8x8", wedstrijdduur: 20, wisseltijd: 5, minRust: 15 })
    ]
  });
  return t;
}
const namen11 = ["VV A", "VV B", "VV C", "VV D", "VV E", "VV F", "VV G", "VV H"];

(function draai() {

groep("toernooi aanmaken en deelnemers (11)");
let t = basis();
namen11.forEach((n) => { t = voegDeelnemerToe(t, { categorieId: "c11", naam: n }).toernooi; });
["SC P", "SC Q", "SC R", "SC S"].forEach((n) => { t = voegDeelnemerToe(t, { categorieId: "c13", naam: n }).toernooi; });
ok("twee categorieën, twee dagen, twee locaties", [t.categorieen.length, t.dagen.length, t.locaties.length], [2, 2, 2]);
ok("12 deelnemers, 8 + 4", [t.deelnemers.length, t.deelnemers.filter((d) => d.categorieId === "c11").length], [12, 8]);
const dubbel = voegDeelnemerToe(t, { categorieId: "c11", naam: "v.v. a" });
ok("zelfde naam in dezelfde categorie: geen tweede", [dubbel.nieuw, dubbel.toernooi.deelnemers.length], [false, 12]);
ok("zelfde naam in een andere categorie mag wel", voegDeelnemerToe(t, { categorieId: "c13", naam: "VV A" }).nieuw, true);
ok("zonder naam: weigert", String(veilig(() => voegDeelnemerToe(t, { categorieId: "c11", naam: " " }))).indexOf("WERPT") === 0, true);
const een = voegDeelnemerToe(Object.assign({}, t, { categorieen: t.categorieen.concat([Object.assign(nieuweCategorie(), { id: "c1", naam: "Penalty", spelvorm: "1x1" })]) }),
  { categorieId: "c1", naam: "Jan" });
ok("bij 1x1 is een deelnemer een speler", een.toernooi.deelnemers.filter((d) => d.categorieId === "c1")[0].soort, "speler");

groep("poules verdelen");
const ids11 = t.deelnemers.filter((d) => d.categorieId === "c11").map((d) => d.id);
const p1 = verdeelPoules(ids11, 2, {}, 7);
ok("8 teams, 2 poules: 4 + 4", p1.map((p) => p.length), [4, 4]);
ok("iedereen precies één keer", [].concat(...p1).sort(), ids11.slice().sort());
ok("zelfde zaad: zelfde verdeling (herhaalbaar)", JSON.stringify(verdeelPoules(ids11, 2, {}, 7)), JSON.stringify(p1));
const sterk = {}; sterk[ids11[0]] = 1; sterk[ids11[1]] = 2; sterk[ids11[2]] = 3; sterk[ids11[3]] = 4;
const p2 = verdeelPoules(ids11, 2, sterk, 7);
ok("geplaatste teams in slangvorm: 1 en 4 in poule A, 2 en 3 in B",
   [p2[0].includes(ids11[0]) && p2[0].includes(ids11[3]), p2[1].includes(ids11[1]) && p2[1].includes(ids11[2])], [true, true]);
ok("7 teams, 2 poules: 4 + 3", verdeelPoules(ids11.slice(0, 7), 2, {}, 1).map((p) => p.length), [4, 3]);

groep("groepsfase, wedstrijden en stand per poule");
t = maakGroepsfase(t, "c11", { poules: [ids11.slice(0, 4), ids11.slice(4)], perPoule: 2, besteNummers: null });
const gf = t.stadia.filter((s) => s.categorieId === "c11" && s.soort === "poule")[0];
ok("twee poules A en B", gf.poules.map((p) => p.naam), ["Poule A", "Poule B"]);
const wpA = t.wedstrijden.filter((w) => w.pouleId === gf.poules[0].id);
ok("4 teams in een poule: 6 wedstrijden; totaal 12", [wpA.length, t.wedstrijden.filter((w) => w.stadiumId === gf.id).length], [6, 12]);
ok("wedstrijden genummerd vanaf 1", t.wedstrijden.map((w) => w.nummer).slice(0, 3), [1, 2, 3]);
ok("geen wedstrijd tussen twee categorieën (11)",
   t.wedstrijden.every((w) => { const a = t.deelnemers.find((d) => d.id === (w.thuis.deelnemerId)); const b = t.deelnemers.find((d) => d.id === (w.uit.deelnemerId)); return a.categorieId === w.categorieId && b.categorieId === w.categorieId; }), true);
ok("poule nog niet compleet", groepsfaseCompleet(t, gf.id), false);
/* Uitslagen poule A: A wint alles, B tweede, C derde, D vierde */
const [A, B, C, D] = gf.poules[0].deelnemers;
const uit = (x, y, a, b) => { const w = t.wedstrijden.find((w) => w.pouleId === gf.poules[0].id &&
  ((w.thuis.deelnemerId === x && w.uit.deelnemerId === y) || (w.thuis.deelnemerId === y && w.uit.deelnemerId === x)));
  const omgedraaid = w.thuis.deelnemerId === y; t = zetUitslag(t, w.id, omgedraaid ? { thuis: b, uit: a } : { thuis: a, uit: b }, null); };
uit(A, B, 2, 0); uit(A, C, 3, 0); uit(A, D, 1, 0); uit(B, C, 2, 1); uit(B, D, 2, 0); uit(C, D, 2, 1);
ok("stand poule A: A, B, C, D", pouleStand(t, gf.id, gf.poules[0].id).map((r) => r.teamId), [A, B, C, D]);
ok("A 9 punten", pouleStand(t, gf.id, gf.poules[0].id)[0].punten, 9);
/* Poule B: E, F, G, H in volgorde */
const [E, F, G, H] = gf.poules[1].deelnemers;
const uitB = (x, y, a, b) => { const w = t.wedstrijden.find((w) => w.pouleId === gf.poules[1].id &&
  ((w.thuis.deelnemerId === x && w.uit.deelnemerId === y) || (w.thuis.deelnemerId === y && w.uit.deelnemerId === x)));
  const om = w.thuis.deelnemerId === y; t = zetUitslag(t, w.id, om ? { thuis: b, uit: a } : { thuis: a, uit: b }, null); };
uitB(E, F, 1, 0); uitB(E, G, 1, 0); uitB(E, H, 1, 0); uitB(F, G, 1, 0); uitB(F, H, 1, 0); uitB(G, H, 1, 0);
ok("groepsfase compleet", groepsfaseCompleet(t, gf.id), true);
ok("lege uitslag weer leegmaken: niet meer compleet", groepsfaseCompleet(zetUitslag(t, wpA[0].id, null, null), gf.id), false);

ok("een team uit een andere categorie in een poule: weigert (11)",
   String(veilig(() => maakGroepsfase(t, "c11", { poules: [[ids11[0], t.deelnemers.find((d) => d.categorieId === "c13").id]], perPoule: 1, besteNummers: null }))).indexOf("categorie") >= 0, true);

groep("knock-out na de groepsfase");
t = maakKnockoutNaGroepsfase(t, "c11", gf.id, { troostfinale: true });
const ko = t.stadia.filter((s) => s.categorieId === "c11" && s.soort === "knockout")[0];
const koW = t.wedstrijden.filter((w) => w.stadiumId === ko.id);
ok("4 doorgaanders: 2 halve finales, finale en troostfinale", koW.map((w) => w.rondeNaam), ["Halve finale", "Halve finale", "Troostfinale", "Finale"]);
ok("halve finales: 1e A – 2e B en 1e B – 2e A",
   koW.slice(0, 2).map((w) => [bronTekst(t, w.thuis), bronTekst(t, w.uit)]), [["1e Poule A", "2e Poule B"], ["1e Poule B", "2e Poule A"]]);
ok("de finale verwijst naar de winnaars", [bronTekst(t, koW[3].thuis), bronTekst(t, koW[3].uit)], ["Winnaar wedstrijd " + koW[0].nummer, "Winnaar wedstrijd " + koW[1].nummer]);
ok("vóór Start knock-out: nog niemand ingevuld", deelnemersVan(t, koW[0]), { thuis: null, uit: null });
t = startKnockout(t, ko.id);
ok("na Start knock-out: A tegen F, E tegen B", [deelnemersVan(t, koW[0]), deelnemersVan(t, koW[1])], [{ thuis: A, uit: F }, { thuis: E, uit: B }]);
ok("starten kan niet als de groepsfase niet compleet is",
   String(veilig(() => startKnockout(zetUitslag(t, wpA[0].id, null, null), ko.id))).indexOf("WERPT") === 0, true);

groep("strafschoppen apart");
t = zetUitslag(t, koW[0].id, { thuis: 1, uit: 1 }, { thuis: 4, uit: 3 });
ok("gelijk na de reguliere tijd, A wint na strafschoppen", winnaarVan(t, koW[0]), A);
ok("strafschoppen tellen niet in de doelpunten", t.wedstrijden.find((w) => w.id === koW[0].id).uitslag, { thuis: 1, uit: 1 });
ok("gelijkspel in de knock-out zonder strafschoppen: weigert",
   String(veilig(() => zetUitslag(t, koW[1].id, { thuis: 0, uit: 0 }, null))).indexOf("strafschoppen") >= 0, true);
ok("strafschoppen bij een winnaar: weigert",
   String(veilig(() => zetUitslag(t, koW[1].id, { thuis: 2, uit: 0 }, { thuis: 5, uit: 4 }))).indexOf("WERPT") === 0, true);
t = zetUitslag(t, koW[1].id, { thuis: 0, uit: 2 }, null);
ok("de finale vult zich: A tegen B", deelnemersVan(t, koW[3]), { thuis: A, uit: B });
ok("de troostfinale: F tegen E", deelnemersVan(t, koW[2]), { thuis: F, uit: E });

groep("late correctie in de groepsfase (13)");
/* Correctie: C wint alsnog van B → C tweede in poule A */
const wBC = t.wedstrijden.find((w) => w.pouleId === gf.poules[0].id && [w.thuis.deelnemerId, w.uit.deelnemerId].sort().join() === [B, C].sort().join());
const t2 = zetUitslag(t, wBC.id, wBC.thuis.deelnemerId === B ? { thuis: 0, uit: 5 } : { thuis: 5, uit: 0 }, null);
const afw = plaatsingAfwijkingen(t2);
ok("de afwijking wordt gemeld", afw.length > 0, true);
ok("de gespeelde halve finale (E–B) blijft E–B", deelnemersVan(t2, koW[1]), { thuis: E, uit: B });
ok("en is gemarkeerd als al gespeeld", afw.find((x) => x.wedstrijdId === koW[1].id).gespeeld, true);
const t3 = bijwerkPlaatsing(t2, koW[1].id);
ok("een gespeelde wedstrijd bijwerken: niets verandert", deelnemersVan(t3, koW[1]), { thuis: E, uit: B });
/* Zelfde correctie vóór de halve finale gespeeld is: bijwerken mag dan */
const vroeg = zetUitslag(zetUitslag(t, koW[1].id, null, null), wBC.id, wBC.thuis.deelnemerId === B ? { thuis: 0, uit: 5 } : { thuis: 5, uit: 0 }, null);
ok("niet gespeeld: melding, maar nog niet veranderd", deelnemersVan(vroeg, koW[1]), { thuis: E, uit: B });
ok("pas na bijwerken: E tegen C", deelnemersVan(bijwerkPlaatsing(vroeg, koW[1].id), koW[1]), { thuis: E, uit: C });

groep("knock-out met vrijstellingen");
let tk = basis();
["1", "2", "3", "4", "5", "6"].forEach((n) => { tk = voegDeelnemerToe(tk, { categorieId: "c13", naam: "Team " + n, sterkte: Number(n) }).toernooi; });
tk = maakKnockout(tk, "c13", tk.deelnemers.map((d) => ({ deelnemerId: d.id })), { troostfinale: false });
const kw = tk.wedstrijden.filter((w) => w.categorieId === "c13");
ok("6 teams: bracket van 8, 2 vrijstellingen, 2 + 2 + 1 = 5 wedstrijden", kw.length, 5);
ok("eerste ronde heet kwartfinale; vrijstellingen voor 1 en 2",
   [kw.filter((w) => w.rondeNaam === "Kwartfinale").length, vrijgesteld(tk, "c13").map((id) => tk.deelnemers.find((d) => d.id === id).naam).sort()], [2, ["Team 1", "Team 2"]]);
ok("een halve finale verwijst direct naar een vrijgesteld team",
   kw.filter((w) => w.rondeNaam === "Halve finale").some((w) => w.thuis.deelnemerId || w.uit.deelnemerId), true);

groep("beste nummers drie bij ongelijke poules");
let tb = basis();
["a1", "a2", "a3", "a4", "b1", "b2", "b3"].forEach((n) => { tb = voegDeelnemerToe(tb, { categorieId: "c11", naam: n }).toernooi; });
const idb = (n) => tb.deelnemers.find((d) => d.naam === n).id;
tb = maakGroepsfase(tb, "c11", { poules: [["a1", "a2", "a3", "a4"].map(idb), ["b1", "b2", "b3"].map(idb)], perPoule: 2, besteNummers: { plek: 3, aantal: 1 } });
const sb = tb.stadia[0];
const zet = (x, y, a, b) => { const w = tb.wedstrijden.find((w) => [w.thuis.deelnemerId, w.uit.deelnemerId].sort().join() === [idb(x), idb(y)].sort().join());
  const om = w.thuis.deelnemerId === idb(y); tb = zetUitslag(tb, w.id, om ? { thuis: b, uit: a } : { thuis: a, uit: b }, null); };
/* Met de hand uitgerekend, zó dat totaal en gemiddelde verschillen:
   a3: 3 wedstrijden, winst + gelijk + verlies = 4 punten, gem. 1,33
   b3: 2 wedstrijden, winst + verlies          = 3 punten, gem. 1,50
   Op totaal zou a3 doorgaan; op gemiddelde (de regel) b3. */
zet("a1", "a2", 1, 0); zet("a1", "a3", 1, 0); zet("a1", "a4", 1, 0); zet("a2", "a3", 0, 0); zet("a2", "a4", 3, 0); zet("a3", "a4", 1, 0);
zet("b1", "b2", 3, 0); zet("b2", "b3", 2, 0); zet("b3", "b1", 1, 0);
ok("nummers drie: a3 en b3", sb.poules.map((p) => tb.deelnemers.find((d) => d.id === pouleStand(tb, sb.id, p.id)[2].teamId).naam), ["a3", "b3"]);
ok("beste nummer drie op gemiddelde: b3 (1,50) vóór a3 (1,33), hoewel a3 meer punten heeft",
   besteNummers(tb, sb.id).map((r) => tb.deelnemers.find((d) => d.id === r.teamId).naam), ["b3"]);
ok("doorgaanders: 2 per poule + de beste nummer drie = 5", doorgaanders(tb, sb.id).length, 5);

groep("conflicten in het schema");
let ts = basis();
["X1", "X2", "X3", "X4"].forEach((n) => { ts = voegDeelnemerToe(ts, { categorieId: "c11", naam: n }).toernooi; });
ts = maakGroepsfase(ts, "c11", { poules: [ts.deelnemers.map((d) => d.id)], perPoule: 2, besteNummers: null });
const ws = ts.wedstrijden;
const plan = (t0, id, dagId, veldId, start) => planWedstrijd(t0, id, { dagId, veldId, start });
ok("nog niets gepland: geen conflicten", conflicten(ts), []);
let tc = plan(ts, ws[0].id, "d1", "v1", "09:00");
tc = plan(tc, ws[1].id, "d1", "v1", "09:10");   // zelfde veld, overlapt (15 min + 5 wissel)
const c1 = conflicten(tc);
ok("dubbele veldbezetting wordt gemeld", c1.some((c) => c.soort === "veld"), true);
ok("ook als alleen de wisseltijd overlapt (09:00 + 15 + 5 > 09:17)",
   conflicten(plan(plan(ts, ws[0].id, "d1", "v1", "09:00"), ws[1].id, "d1", "v1", "09:17")).some((c) => c.soort === "veld"), true);
ok("na de wisseltijd (09:20) is het veld vrij",
   conflicten(plan(plan(ts, ws[0].id, "d1", "v1", "09:00"), ws[1].id, "d1", "v1", "09:20")).some((c) => c.soort === "veld"), false);
tc = plan(tc, ws[1].id, "d1", "v2", "09:00");
const deelt = [ws[0].thuis.deelnemerId, ws[0].uit.deelnemerId].some((x) => [ws[1].thuis.deelnemerId, ws[1].uit.deelnemerId].includes(x));
ok("zelfde tijd, ander veld: alleen een probleem als een team twee keer speelt",
   conflicten(tc).some((c) => c.soort === "team"), deelt);
const naIn = ts.wedstrijden.find((w) => w.id !== ws[0].id && [w.thuis.deelnemerId, w.uit.deelnemerId].some((x) => [ws[0].thuis.deelnemerId, ws[0].uit.deelnemerId].includes(x)));
let tr = plan(ts, ws[0].id, "d1", "v1", "09:00");
tr = plan(tr, naIn.id, "d1", "v2", "09:20");   // einde 09:15, rust 5 < 10
ok("te weinig rust wordt gemeld", conflicten(tr).some((c) => c.soort === "rust"), true);
tr = plan(tr, naIn.id, "d1", "v2", "09:25");
ok("met 10 minuten rust: in orde", conflicten(tr).some((c) => c.soort === "rust"), false);
ok("buiten de dag (na 17:00) wordt gemeld", conflicten(plan(ts, ws[0].id, "d1", "v1", "16:50")).some((c) => c.soort === "tijd"), true);
ok("een onbekend veld: weigert", String(veilig(() => plan(ts, ws[0].id, "d1", "vX", "09:00"))).indexOf("WERPT") === 0, true);

groep("downloads: schema en CSV");
{
  let td = basis();
  ["Één; twee", "B \"bee\""].forEach((n) => { td = voegDeelnemerToe(td, { categorieId: "c11", naam: n, email: "geheim@club.nl", telefoon: "0612345678" }).toernooi; });
  td = Object.assign({}, td, { scheidsrechters: [{ id: "s1", naam: "Piet", email: "piet@mail.nl", telefoon: "0699999999" }] });
  td = maakGroepsfase(td, "c11", { poules: [td.deelnemers.map((d) => d.id)], perPoule: 1, besteNummers: null });
  const wid = td.wedstrijden[0].id;
  td = planWedstrijd(td, wid, { dagId: "d1", veldId: "v3", start: "10:00" });
  td = Object.assign({}, td, { wedstrijden: td.wedstrijden.map((w) => Object.assign({}, w, { scheidsId: "s1" })) });
  const r = schemaRegels(td)[0];
  ok("regel met dag, tijd, locatie, veld, scheidsrechter", [r.dag, r.tijd, r.locatie, r.veld, r.scheids], ["2027-04-17", "10:00", "Sportpark B", "Veld 3", "Piet"]);
  const csv = schemaCsv(td);
  ok("CSV met puntkomma's en een kopregel", csv.split("\n")[0], "Nr;Dag;Tijd;Locatie;Veld;Categorie;Ronde;Thuis;Uit;Scheidsrechter;Uitslag");
  ok("een naam met een puntkomma of aanhalingsteken wordt netjes ingepakt", csv.indexOf('"Één; twee"') >= 0 && csv.indexOf('"B ""bee"""') >= 0, true);
  ok("geen e-mailadres of telefoonnummer in de download", /geheim@|0612345678|piet@|0699999999/.test(csv), false);
}

groep("publiceren: momentopname zonder contactgegevens");
{
  let tp = basis();
  tp = voegDeelnemerToe(tp, { categorieId: "c11", naam: "VV A", email: "geheim@a.nl", telefoon: "0612345678", coach: "Jan Geheim", spelers: ["Kind Een"] }).toernooi;
  tp = voegDeelnemerToe(tp, { categorieId: "c11", naam: "VV B" }).toernooi;
  tp = voegDeelnemerToe(tp, { categorieId: "c11", naam: "VV C" }).toernooi;
  tp = Object.assign({}, tp, { scheidsrechters: [{ id: "s1", naam: "Piet", email: "piet@x.nl", telefoon: "0699999999", beschikbaar: [{ dagId: "d1", van: "09:00", tot: "12:00" }] }],
    logboek: [{ op: "x" }], presentatie: { kleur: "#ff0000", mededeling: "Welkom!" } });
  tp = maakGroepsfase(tp, "c11", { poules: [tp.deelnemers.map((d) => d.id)], perPoule: 0, besteNummers: null });
  tp = zetUitslag(tp, tp.wedstrijden[0].id, { thuis: 2, uit: 1 }, null);
  tp = Object.assign({}, tp, { wedstrijden: tp.wedstrijden.map((w, i) => i === 0 ? Object.assign({}, w, { notitie: "blessure van Kind Een" }) : w) });
  const kopie = JSON.stringify(tp);
  const m = publiekeMomentopname(tp, { nu: "2027-04-17T10:00:00.000Z" });
  const tekst = JSON.stringify(m);
  ok("geen e-mail, telefoon, contactpersoon, spelers of notitie", /geheim@|0612345678|Jan Geheim|Kind Een|piet@|0699999999|blessure/.test(tekst), false);
  ok("ook de veldnamen email en telefoon komen niet voor (de server weigert ze)", /"email"|"telefoon"/.test(tekst), false);
  ok("geen logboek en geen beschikbaarheid", [m.logboek.length, /beschikbaar/.test(tekst)], [0, false]);
  ok("namen, schema en uitslag staan er wel in", [m.deelnemers.map((d) => d.naam), m.wedstrijden[0].uitslag, m.scheidsrechters[0].naam], [["VV A", "VV B", "VV C"], { thuis: 2, uit: 1 }, "Piet"]);
  ok("de stand op de openbare pagina is dezelfde als in de app",
     pouleStand(m, m.stadia[0].id, m.stadia[0].poules[0].id), pouleStand(tp, tp.stadia[0].id, tp.stadia[0].poules[0].id));
  ok("schemaRegels werkt op de momentopname", schemaRegels(m).length, tp.wedstrijden.length);
  ok("kleur en mededeling gaan mee, het logo alleen als je het meegeeft", [m.presentatie.kleur, m.presentatie.mededeling, m.presentatie.logo], ["#ff0000", "Welkom!", ""]);
  ok("het toernooi zelf is niet aangepast", JSON.stringify(tp), kopie);
}

groep("oude toernooien omzetten (v1)");
{
  const oud = { id: 123, naam: "Zomertoernooi", datum: "2026-06-20", locatie: "Sportpark", aantalVelden: 2, speelduur: 12, pauze: 3, starttijd: "10:00",
    teams: [{ id: 1, naam: "Eigen", eigen: true }, { id: 2, naam: "Twee" }, { id: 3, naam: "Drie" }],
    wedstrijden: [{ id: "a", thuisId: 1, uitId: 2, veld: 1, tijd: "10:00", score: { thuis: 2, uit: 1 }, gespeeld: true },
                  { id: "b", thuisId: 3, uitId: 1, veld: 2, tijd: "10:00", score: { thuis: 0, uit: 0 }, gespeeld: false },
                  { id: "c", thuisId: 2, uitId: 3, veld: 1, tijd: "10:15", score: { thuis: 1, uit: 1 }, gespeeld: true }],
    opgezet: true };
  const kopie = JSON.stringify(oud);
  const nt = migreerToernooiV1(oud);
  ok("naam, dag, locatie, 2 velden, duur", [nt.naam, nt.dagen[0].datum, nt.dagen[0].start, nt.locaties[0].naam, nt.locaties[0].velden.length, nt.categorieen[0].wedstrijdduur], ["Zomertoernooi", "2026-06-20", "10:00", "Sportpark", 2, 12]);
  ok("3 deelnemers, 3 wedstrijden in één poule", [nt.deelnemers.length, nt.wedstrijden.length, nt.stadia[0].poules.length], [3, 3, 1]);
  ok("een niet-gespeelde 0–0 blijft zonder uitslag", nt.wedstrijden[1].uitslag, null);
  const oudeStand = toernooiStandV1(oud);
  const nieuweStand = pouleStand(nt, nt.stadia[0].id, nt.stadia[0].poules[0].id).map((r) => [r.naam, r.gespeeld, r.punten]);
  ok("de stand is dezelfde als in het oude toernooi", nieuweStand, oudeStand);
  ok("het schema blijft staan (veld en tijd)", [nt.wedstrijden[1].veldId === nt.locaties[0].velden[1].id, nt.wedstrijden[1].start], [true, "10:00"]);
  ok("het oude toernooi is niet aangepast", JSON.stringify(oud), kopie);
}

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
})();
