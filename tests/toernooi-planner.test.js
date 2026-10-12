/* ══════════════════════════════════════════════════════════════
   Tests voor de toernooiplanner (release 3, hoofdstuk 5f)
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/toernooi-planner.test.js

   WAAR HET OM GAAT
   - Een automatisch schema heeft nul conflicten (veld, team, rust,
     volgorde, speeltijd) — met dezelfde controle als handmatig plannen.
   - Vroegst mogelijk, voorspelbaar (twee keer plannen = hetzelfde).
   - Vastgezette en gespeelde wedstrijden blijven staan.
   - Past iets niet, dan een reden én een voorstel.
   - Scheidsrechters: nooit twee wedstrijden tegelijk, eerlijk verdeeld,
     beschikbaarheid en uitsluitingen gerespecteerd.
   - Laadproef: 200+ wedstrijden, 4 dagen, 12 velden binnen 3 seconden.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const WORTEL = path.join(__dirname, "..");
const MODULE = process.env.TT_TOERNOOI || path.join(WORTEL, "src", "domein", "toernooi.js");
const lees = (p) => fs.readFileSync(path.join(WORTEL, p), "utf8");
function knip(bron, naam) {
  const regels = bron.split("\n");
  const a = regels.findIndex((r) => new RegExp("^function " + naam + "\\(").test(r));
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}
eval(knip(lees("src/domein/wedstrijden.js"), "maakPouleSchema"));
eval(lees("src/domein/competitie.js").replace(/^const /gm, "var "));
eval(fs.readFileSync(MODULE, "utf8").replace(/^const /gm, "var "));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

/* Een toernooi met één categorie; velden en dagen naar keuze. */
function opzet(o) {
  let t = maakToernooi({ id: "t", naam: "Proef" });
  const dagen = [];
  for (let i = 0; i < (o.dagen || 1); i++) dagen.push({ id: "d" + (i + 1), datum: "2027-04-1" + (i + 1), start: o.start || "09:00", eind: o.eind || "17:00" });
  const velden = [];
  for (let i = 0; i < (o.velden || 2); i++) velden.push({ id: "v" + (i + 1), naam: "Veld " + (i + 1) });
  t = Object.assign({}, t, { dagen: dagen, locaties: [{ id: "l1", naam: "Park", velden: velden }],
    categorieen: [Object.assign(nieuweCategorie(), { id: "c", naam: "JO11", wedstrijdduur: o.duur || 20, wisseltijd: o.wissel === undefined ? 5 : o.wissel, minRust: o.rust === undefined ? 10 : o.rust })] });
  const ids = [];
  for (let i = 0; i < o.teams; i++) { const r = voegDeelnemerToe(t, { categorieId: "c", naam: "Team " + (i + 1) }); t = r.toernooi; ids.push(r.id); }
  const per = o.poules || 1, poules = [];
  for (let p = 0; p < per; p++) poules.push(ids.filter((_, i) => i % per === p));
  t = maakGroepsfase(t, "c", { poules: poules, perPoule: o.door || 0, besteNummers: null });
  if (o.door) t = maakKnockoutNaGroepsfase(t, "c", t.stadia[0].id, { troostfinale: false });
  return t;
}
const tijd = (w) => minVan(w.start);

(function draai() {

groep("automatisch plannen: alles past, nul conflicten");
{
  const t = opzet({ teams: 8, poules: 2, door: 2, velden: 2 });
  const kopie = JSON.stringify(t);
  const r = planAutomatisch(t);
  ok("alle 15 wedstrijden ingepland (12 poule + 2 halve + finale)", [r.gepland, r.ongepland.length, t.wedstrijden.length], [15, 0, 15]);
  ok("nul conflicten volgens dezelfde controle als handmatig", conflicten(r.toernooi), []);
  ok("het toernooi zelf is niet aangepast", JSON.stringify(t), kopie);
  ok("twee keer plannen geeft hetzelfde schema", JSON.stringify(planAutomatisch(t).toernooi), JSON.stringify(r.toernooi));
  const w = r.toernooi.wedstrijden;
  ok("eerste twee wedstrijden om 09:00 op veld 1 en 2", [w[0].start, w[0].veldId, w[1].start, w[1].veldId], ["09:00", "v1", "09:00", "v2"]);
  const laatsteGroep = Math.max(...w.filter((x) => x.rondeNaam.indexOf("Groepsfase") === 0).map((x) => tijd(x) + 20));
  const eersteKo = Math.min(...w.filter((x) => x.rondeNaam === "Halve finale").map(tijd));
  ok("knock-out pas na de hele groepsfase plus rust", eersteKo >= laatsteGroep + 10, true);
  const halve = w.filter((x) => x.rondeNaam === "Halve finale"), finale = w.filter((x) => x.rondeNaam === "Finale")[0];
  ok("finale pas na beide halve finales plus rust", tijd(finale) >= Math.max(...halve.map(tijd)) + 20 + 10, true);
  const opVeld = {}; let dubbel = false;
  w.forEach((x) => { const k = x.veldId + x.start; if (opVeld[k]) dubbel = true; opVeld[k] = 1; });
  ok("nooit twee wedstrijden op hetzelfde veld en tijdstip", dubbel, false);
}

groep("rust per team");
{
  const t = opzet({ teams: 4, velden: 4, rust: 30 });
  const r = planAutomatisch(t);
  const perTeam = {};
  r.toernooi.wedstrijden.forEach((w) => [w.thuis.deelnemerId, w.uit.deelnemerId].forEach((id) => (perTeam[id] = perTeam[id] || []).push(tijd(w))));
  const kleinsteGat = Math.min(...Object.values(perTeam).map((l) => { l.sort((a, b) => a - b); let m = 999; for (let i = 1; i < l.length; i++) m = Math.min(m, l[i] - l[i - 1] - 20); return m; }));
  ok("met 4 velden toch minstens 30 minuten rust tussen twee wedstrijden van een team", kleinsteGat >= 30, true);
  ok("en het kan ook precies: kleinste gat is 30", kleinsteGat, 30);
}

groep("vastgezet en gespeeld blijven staan");
{
  let t = opzet({ teams: 4, velden: 1 });
  const eerste = t.wedstrijden[0].id, tweede = t.wedstrijden[1].id;
  t = planWedstrijd(t, eerste, { dagId: "d1", veldId: "v1", start: "11:00" });
  t = Object.assign({}, t, { wedstrijden: t.wedstrijden.map((w) => w.id === eerste ? Object.assign({}, w, { vastgezet: true }) : w) });
  t = planWedstrijd(t, tweede, { dagId: "d1", veldId: "v1", start: "15:00" });
  t = zetUitslag(t, tweede, { thuis: 1, uit: 0 }, null);
  const r = planAutomatisch(t);
  const w = (id) => r.toernooi.wedstrijden.filter((x) => x.id === id)[0];
  ok("vastgezette wedstrijd blijft om 11:00", w(eerste).start, "11:00");
  ok("gespeelde wedstrijd blijft om 15:00", w(tweede).start, "15:00");
  ok("de rest wordt eromheen gepland zonder conflict", conflicten(r.toernooi), []);
  ok("de eerste vrije plek is gewoon 09:00", r.toernooi.wedstrijden.filter((x) => x.id !== eerste && x.id !== tweede).map((x) => x.start).sort()[0], "09:00");
}

groep("alleen ongeplande wedstrijden");
{
  let t = opzet({ teams: 4, velden: 2 });
  const id = t.wedstrijden[2].id;
  t = planWedstrijd(t, id, { dagId: "d1", veldId: "v2", start: "13:00" });
  const r = planAutomatisch(t, { alleenOngepland: true });
  ok("al geplande wedstrijd blijft waar hij stond", r.toernooi.wedstrijden.filter((x) => x.id === id)[0].start, "13:00");
  ok("zonder die optie wordt hij naar voren gehaald", planAutomatisch(t).toernooi.wedstrijden.filter((x) => x.id === id)[0].start < "13:00", true);
  ok("geen conflicten", conflicten(r.toernooi), []);
}

groep("past niet: reden en voorstel");
{
  /* 3 teams, één poule: elk team speelt twee keer. Dag tot 09:45, 20 min,
     geen wisseltijd, 10 min rust: de tweede wedstrijd past alleen zonder rust. */
  const t = opzet({ teams: 3, velden: 3, eind: "09:45", wissel: 0, rust: 10 });
  const r = planAutomatisch(t);
  ok("één wedstrijd past, twee niet", [r.gepland, r.ongepland.length], [1, 2]);
  ok("reden noemt de rust en de teams", /Geen veld vrij .* 10 min rust voor Team \d en Team \d\./.test(r.ongepland[0].reden), true);
  ok("voorstel: rust verlagen", r.ongepland[0].voorstel, "Verlaag de minimale rust van JO11 (nu 10 min).");
  ok("ongeplande wedstrijden hebben geen dag, veld of tijd", r.toernooi.wedstrijden.filter((w) => !w.start).length, 2);

  const kort = opzet({ teams: 4, poules: 2, velden: 1, eind: "09:30", wissel: 0, rust: 0 });
  const r2 = planAutomatisch(kort);
  ok("dag te kort: voorstel om later te eindigen", r2.ongepland.map((x) => x.voorstel), ["Laat een dag een uur later eindigen."]);

  const vol = opzet({ teams: 8, poules: 2, door: 2, velden: 1, eind: "11:00", rust: 0 });
  const r3 = planAutomatisch(vol);
  const finale = vol.wedstrijden.filter((w) => w.rondeNaam === "Finale")[0];
  const fr = r3.ongepland.filter((x) => x.wedstrijdId === finale.id)[0];
  ok("finale wacht op een halve finale die zelf niet past", /^Wacht op wedstrijd \d+, die zelf nergens past\.$/.test(fr.reden), true);
  /* 90 minuten per wedstrijd, dag tot 10:30: ook een uur langer helpt niet. */
  const lang = opzet({ teams: 4, velden: 1, eind: "10:30", duur: 90, rust: 0 });
  const r4 = planAutomatisch(lang);
  ok("zonder iets dat helpt: veld of dag toevoegen", r4.ongepland.length > 0 && r4.ongepland.every((x) => /^Voeg een veld of een dag toe/.test(x.voorstel)), true);
}

groep("meerdere dagen en evenementen");
{
  const t = opzet({ teams: 6, velden: 1, dagen: 3, eind: "11:00", rust: 0 });
  const r = planAutomatisch(t);
  ok("15 wedstrijden over drie dagen (5 per dag), niets ongepland", [r.gepland, r.ongepland.length], [15, 0]);
  ok("dag 1 eerst vol, daarna dag 2", [r.toernooi.wedstrijden.filter((w) => w.dagId === "d1").length > 0, r.toernooi.wedstrijden.some((w) => w.dagId === "d2")], [true, true]);
  ok("nul conflicten", conflicten(r.toernooi), []);

  const ev = Object.assign({}, opzet({ teams: 4, velden: 2 }), { evenementen: [{ id: "e", naam: "Opening", dagId: "d1", start: "09:00", duur: 30 }] });
  const r2 = planAutomatisch(ev);
  ok("tijdens de opening (09:00–09:30) wordt niet gespeeld", r2.toernooi.wedstrijden.map((w) => w.start).sort()[0], "09:30");
  const ev2 = Object.assign({}, ev, { locaties: ev.locaties.concat([{ id: "l2", naam: "Elders", velden: [{ id: "v9", naam: "Veld 9" }] }]),
    evenementen: [{ id: "e", naam: "Opening", dagId: "d1", start: "09:00", duur: 30, locatieId: "l1" }] });
  const r3 = planAutomatisch(ev2);
  ok("een evenement op één locatie blokkeert alleen die locatie", r3.toernooi.wedstrijden.filter((w) => w.start === "09:00").map((w) => w.veldId), ["v9"]);
}

groep("verplaatsen zonder slepen: vrije tijdvakken");
{
  const t = planAutomatisch(opzet({ teams: 4, velden: 2, eind: "11:00" })).toernooi;
  const w = t.wedstrijden[0];
  const slots = vrijeSlots(t, w.id);
  ok("tijdvakken in stappen van 25 min (20 + 5), op beide velden", slots.slice(0, 4).map((s) => s.start + " " + s.veldId), ["09:00 v1", "09:00 v2", "09:25 v1", "09:25 v2"]);
  ok("zijn eigen plek is vrij (hij telt zichzelf niet mee)", slots.filter((s) => s.veldId === w.veldId && s.start === w.start)[0].problemen, []);
  const ander = t.wedstrijden.filter((x) => x.id !== w.id && x.start)[0];
  const daar = slots.filter((s) => s.veldId === ander.veldId && s.start === ander.start)[0];
  ok("een bezet tijdvak zegt door welke wedstrijd", daar.problemen.some((p) => p === "veld bezet door wedstrijd " + ander.nummer), true);
  ok("geen tijdvak voorbij het einde van de dag", slots.every((s) => minVan(s.start) + 20 <= minVan("11:00")), true);
}

groep("scheidsrechters indelen");
{
  let t = planAutomatisch(opzet({ teams: 8, poules: 2, velden: 2 })).toernooi;
  t = Object.assign({}, t, { scheidsrechters: [{ id: "s1", naam: "Anna" }, { id: "s2", naam: "Bart" }] });
  const r = deelScheidsrechtersIn(t);
  ok("alle 12 wedstrijden een scheidsrechter", [r.toegewezen, r.zonder.length], [12, 0]);
  ok("nooit dezelfde scheidsrechter bij twee wedstrijden tegelijk", conflicten(r.toernooi).filter((c) => c.soort === "scheids"), []);
  const telling = ["s1", "s2"].map((id) => r.toernooi.wedstrijden.filter((w) => w.scheidsId === id).length);
  ok("eerlijk verdeeld: 6 en 6", telling, [6, 6]);

  /* Eén veld: alles na elkaar, dus iedereen is steeds vrij. Zonder eerlijk
     verdelen zou de eerste in de lijst alles fluiten. */
  const naElkaar = Object.assign({}, planAutomatisch(opzet({ teams: 4, velden: 1 })).toernooi,
    { scheidsrechters: [{ id: "s1", naam: "Anna" }, { id: "s2", naam: "Bart" }, { id: "s3", naam: "Cas" }] });
  ok("na elkaar met drie scheidsrechters: 2, 2 en 2", ["s1", "s2", "s3"].map((id) => deelScheidsrechtersIn(naElkaar).toernooi.wedstrijden.filter((w) => w.scheidsId === id).length), [2, 2, 2]);
  const een = Object.assign({}, t, { scheidsrechters: [{ id: "s1", naam: "Anna" }] });
  const r1 = deelScheidsrechtersIn(een);
  ok("één scheidsrechter bij twee velden: de helft blijft zonder", [r1.toegewezen, r1.zonder.length], [6, 6]);

  const uit = Object.assign({}, t, { scheidsrechters: [{ id: "s1", naam: "Anna", nietCategorieen: ["c"] }, { id: "s2", naam: "Bart" }] });
  ok("uitgesloten voor de categorie: krijgt niets", deelScheidsrechtersIn(uit).toernooi.wedstrijden.some((w) => w.scheidsId === "s1"), false);

  const besch = Object.assign({}, t, { scheidsrechters: [{ id: "s1", naam: "Anna", beschikbaar: [{ dagId: "d1", van: "09:00", tot: "10:00" }] }, { id: "s2", naam: "Bart" }] });
  const rb = deelScheidsrechtersIn(besch);
  ok("alleen binnen de beschikbaarheid (09:00–10:00)", rb.toernooi.wedstrijden.filter((w) => w.scheidsId === "s1").every((w) => minVan(w.start) + 20 <= 600), true);
  ok("en dan wel ingezet", rb.toernooi.wedstrijden.some((w) => w.scheidsId === "s1"), true);

  const voork = Object.assign({}, t, { scheidsrechters: [{ id: "s1", naam: "Anna" }, { id: "s2", naam: "Bart", voorkeurCategorieen: ["c"] }] });
  ok("voorkeur voor de categorie gaat voor", deelScheidsrechtersIn(voork).toernooi.wedstrijden.filter((w) => w.start === "09:00").map((w) => w.scheidsId).sort(), ["s1", "s2"]);
  ok("…en krijgt de eerste wedstrijd", deelScheidsrechtersIn(voork).toernooi.wedstrijden[0].scheidsId, "s2");

  const handmatig = Object.assign({}, r.toernooi, { wedstrijden: r.toernooi.wedstrijden.map((w) => w.start === "09:00" ? Object.assign({}, w, { scheidsId: "s1" }) : w) });
  ok("handmatig dubbel ingedeeld: conflict", conflicten(handmatig).filter((c) => c.soort === "scheids").length, 1);
  ok("bestaande toewijzingen blijven, tenzij opnieuw", deelScheidsrechtersIn(handmatig).toernooi.wedstrijden.filter((w) => w.start === "09:00").map((w) => w.scheidsId), ["s1", "s1"]);
  ok("met opnieuw: weer netjes verdeeld", conflicten(deelScheidsrechtersIn(handmatig, { opnieuw: true }).toernooi).filter((c) => c.soort === "scheids"), []);
}

groep("reistijd tussen locaties");
{
  /* Twee locaties, één veld elk, 20 minuten fietsen. 4 teams, rust 10. */
  let t = opzet({ teams: 4, velden: 1, rust: 10, wissel: 0 });
  t = Object.assign({}, t, { locaties: [
    { id: "l1", naam: "Noord", velden: [{ id: "v1", naam: "Veld 1" }], reistijdNaar: { l2: 20 } },
    { id: "l2", naam: "Zuid", velden: [{ id: "v2", naam: "Veld 2" }] } ] });
  const r = planAutomatisch(t);
  ok("alles gepland, nul conflicten (ook volgens de handmatige controle)", [r.ongepland.length, conflicten(r.toernooi)], [0, []]);
  const w = r.toernooi.wedstrijden;
  let kleinste = 999;
  w.forEach((a) => w.forEach((b) => {
    if (a === b || a.veldId === b.veldId) return;
    const samen = [a.thuis.deelnemerId, a.uit.deelnemerId].some((id) => id === b.thuis.deelnemerId || id === b.uit.deelnemerId);
    if (samen && tijd(b) >= tijd(a)) kleinste = Math.min(kleinste, tijd(b) - tijd(a) - 20);
  }));
  ok("een team dat van locatie wisselt heeft minstens rust + reistijd (10 + 20 = 30 min)", kleinste >= 30, true);
  ok("reistijd geldt in beide richtingen (alleen Noord→Zuid ingevuld)", [reistijdTussen(t, "v1", "v2"), reistijdTussen(t, "v2", "v1"), reistijdTussen(t, "v1", "v1")], [20, 20, 0]);
  /* Met de hand te krap: op Zuid 25 minuten na afloop op Noord. */
  let h = planWedstrijd(t, t.wedstrijden[0].id, { dagId: "d1", veldId: "v1", start: "09:00" });
  const tweede = t.wedstrijden.filter((x) => x.id !== t.wedstrijden[0].id && [x.thuis.deelnemerId, x.uit.deelnemerId].indexOf(t.wedstrijden[0].thuis.deelnemerId) >= 0)[0];
  h = planWedstrijd(h, tweede.id, { dagId: "d1", veldId: "v2", start: "09:45" });
  const c = conflicten(h).filter((x) => x.soort === "rust");
  ok("handmatig te krap: conflict met de reistijd erin", [c.length, /reizen 20 min/.test(c[0] && c[0].tekst)], [1, true]);
  ok("op dezelfde locatie was 25 minuten wel genoeg", conflicten(planWedstrijd(h, tweede.id, { dagId: "d1", veldId: "v1", start: "09:45" })).filter((x) => x.soort === "rust").length, 0);
}

groep("velden per spelvorm");
{
  /* Twee categorieën; veld 2 heeft kleine doeltjes en is alleen voor 6x6. */
  let t = opzet({ teams: 4, velden: 2 });
  t = Object.assign({}, t, {
    categorieen: t.categorieen.map((c) => Object.assign({}, c, { spelvorm: "8x8" })),
    locaties: [{ id: "l1", naam: "Park", velden: [{ id: "v1", naam: "Veld 1" }, { id: "v2", naam: "Veld 2", spelvormen: ["6x6"] }] }] });
  const r = planAutomatisch(t);
  ok("8x8 komt nooit op het 6x6-veld", r.toernooi.wedstrijden.filter((w) => w.veldId === "v2").length, 0);
  ok("alles gepland op veld 1, zonder conflicten", [r.ongepland.length, conflicten(r.toernooi).length], [0, 0]);
  const fout = planWedstrijd(t, t.wedstrijden[0].id, { dagId: "d1", veldId: "v2", start: "09:00" });
  ok("met de hand op het verkeerde veld: conflict", conflicten(fout).map((c) => c.soort), ["veldsoort"]);
  const slots = vrijeSlots(t, t.wedstrijden[0].id);
  ok("bij verplaatsen zegt het verkeerde veld waarom", slots.filter((x) => x.veldId === "v2")[0].problemen, ["veld niet geschikt voor 8x8"]);
  const geen = Object.assign({}, t, { locaties: [{ id: "l1", naam: "Park", velden: [{ id: "v2", naam: "Veld 2", spelvormen: ["6x6"] }] }] });
  const rg = planAutomatisch(geen);
  ok("geen enkel geschikt veld: reden en voorstel", [rg.gepland, rg.ongepland[0].reden, rg.ongepland[0].voorstel],
     [0, "Geen enkel veld is ingesteld voor 8x8.", "Zet bij Instellingen een veld ook op 8x8."]);
  ok("leeg spelvormenlijstje = geschikt voor alles", veldGeschikt(Object.assign({}, t, { locaties: [{ id: "l", velden: [{ id: "v9", spelvormen: [] }] }] }), "v9", "11x11"), true);
}

groep("laadproef: 4 dagen, 12 velden, 200+ wedstrijden");
{
  let t = maakToernooi({ id: "groot", naam: "Groot" });
  const velden = []; for (let i = 0; i < 12; i++) velden.push({ id: "v" + i, naam: "Veld " + i });
  t = Object.assign({}, t, { dagen: [1, 2, 3, 4].map((i) => ({ id: "d" + i, datum: "2027-05-0" + i, start: "09:00", eind: "17:00" })),
    locaties: [{ id: "l", naam: "Park", velden: velden }], categorieen: [] });
  for (let c = 0; c < 7; c++) {
    const cat = Object.assign(nieuweCategorie(), { id: "c" + c, naam: "Cat " + c, wedstrijdduur: 15 + c, wisseltijd: 5, minRust: 10 });
    t = Object.assign({}, t, { categorieen: t.categorieen.concat([cat]) });
    const ids = [];
    for (let i = 0; i < 16; i++) { const r = voegDeelnemerToe(t, { categorieId: cat.id, naam: "T" + c + "-" + i }); t = r.toernooi; ids.push(r.id); }
    t = maakGroepsfase(t, cat.id, { poules: [ids.slice(0, 4), ids.slice(4, 8), ids.slice(8, 12), ids.slice(12)], perPoule: 2, besteNummers: null });
    const gf = t.stadia.filter((s) => s.categorieId === cat.id)[0];
    t = maakKnockoutNaGroepsfase(t, cat.id, gf.id, { troostfinale: true });
  }
  const begin = Date.now();
  const r = planAutomatisch(t);
  const ms = Date.now() - begin;
  ok("meer dan 200 wedstrijden", t.wedstrijden.length > 200, true);
  ok("alles ingepland", r.ongepland.length, 0);
  ok("nul conflicten", conflicten(r.toernooi).length, 0);
  ok("binnen 3 seconden (" + ms + " ms)", ms < 3000, true);
}

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
})();
