/* ══════════════════════════════════════════════════════════════
   Tests voor de vaste vulling van het gouden origineel
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/vulling.test.js

   Geen testframework, geen npm install — node en
   verder niets. (Het opnemen zélf heeft een browser nodig; dat is
   tools/gouden-origineel.js. Deze test niet.)

   ── WAAROM DIT BESTAAT ───────────────────────────────────────
   Op 12 september 2026 bleek dat de kaarten in de vulling onder de
   verkeerde naam stonden: `soort` in plaats van `type`. De app leest
   k.type. Gevolg: in het gouden origineel bestónd er geen enkele
   kaart. De Discipline-kaart op Statistieken stond op 0 gele en 0
   rode kaarten, de opname daarvan was groen, en alles wat van kaarten
   afhangt was in schijn gedekt. Bij de doelpunten was hetzelfde aan de
   hand: zonder eigenTeam:true telt de app ze als tegendoelpunten.

   Een opname die niets bevat is geen vangnet, en het ergste is dat
   hij er precies zo groen uitziet als een opname die alles bevat.

   Deze test haalt de vulling door de échte functies uit
   src/app.jsx en controleert de uitkomst tegen getallen die
   met de hand zijn uitgerekend. Staat er weer een veld onder de
   verkeerde naam, dan komen daar nullen uit en wordt dit rood —
   zonder dat er een browser aan te pas hoeft te komen.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

/* Sinds de bouwstap (P1) is src/app.jsx de bron die mensen bewerken en
   is online/index.html wat esbuild daarvan maakt: zonder commentaar en
   met de JSX al vertaald naar React.createElement. Voor déze test is
   dat laatste beslissend — verderop staat

       /\{a\.naam\}/.test(bron)

   en dat is letterlijk JSX. In het gebouwde bestand bestaat die vorm
   niet meer; a.naam is daar een argument geworden. Die controle kán
   dus alleen op de bron, en dat is precies waar hij thuishoort: de
   vraag is of de app de naam uittékent, en dat schrijft een mens op.

   Of de bóuwstap die JSX goed vertaalt is een andere vraag, en die
   wordt beantwoord waar hij hoort: tools/gouden-origineel.js draait
   het gebouwde online/index.html in een echte browser en vergelijkt
   de DOM en de beeldpunten. */
const APP = path.join(__dirname, "..", "src", "app.jsx");
const VULLING = path.join(__dirname, "..", "tools", "gouden-origineel", "vulling.js");
const bron = fs.readFileSync(APP, "utf8");
const regels = bron.split("\n");

/* De presentielijst (TrainingDetail, met {a.naam}) zat tot en met P4
   stap 3 in src/app.jsx; op 17 september 2026 (P4 stap 4,
   docs/p4-stappenplan.md §1) is TrainingDetail verhuisd naar
   src/schermen/trainingen.jsx. Zelfde reden als bij de andere
   met-naam-genoemde bronnen in deze reeks tests: een aparte bron,
   zodat een hernoemen of opnieuw verplaatsen deze test rood maakt in
   plaats van hem stilletjes tegen de oude, niet meer bestaande plek in
   app.jsx te laten testen. */
const TRAININGEN_SCHERM = path.join(__dirname, "..", "src", "schermen", "trainingen.jsx");
const bronTrainingenScherm = fs.readFileSync(TRAININGEN_SCHERM, "utf8");

/* Sinds P3 stap 2 (professionaliseringsplan.md, 17 september 2026)
   staan WEDSTRIJD_SOORTEN/wedstrijdSoort/wedstrijdTelt/tellendeWedstrijden
   niet meer in src/app.jsx maar in src/domein/wedstrijden.js. Sinds
   stap 3 (dezelfde dag) staat berekenSpelerStats niet meer in src/app.jsx
   maar in src/domein/statistieken.js. */
const DOMEIN = path.join(__dirname, "..", "src", "domein", "wedstrijden.js");
const regelsDomein = fs.readFileSync(DOMEIN, "utf8").split("\n");
const DOMEIN_STAT = path.join(__dirname, "..", "src", "domein", "statistieken.js");
const regelsStat = fs.readFileSync(DOMEIN_STAT, "utf8").split("\n");

const zoekIn = (bronRegels, re) => { for (let i = 0; i < bronRegels.length; i++) if (re.test(bronRegels[i])) return i; return -1; };
const eisIn = (bronRegels, bronNaam, re, wat) => {
  const i = zoekIn(bronRegels, re);
  if (i < 0) throw new Error(wat + " niet gevonden in " + bronNaam);
  return i;
};
const zoek = (re) => zoekIn(regels, re);
const eis = (re, wat) => eisIn(regels, "src/app.jsx", re, wat);
function knipFunctieUit(bronRegels, bronNaam, naam) {
  const a = eisIn(bronRegels, bronNaam, new RegExp("^function " + naam + "\\("), "function " + naam);
  let e = a; while (e < bronRegels.length && !/^\}/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knipFunctie(naam) { return knipFunctieUit(regels, "src/app.jsx", naam); }
function knipFunctieDomein(naam) { return knipFunctieUit(regelsDomein, "src/domein/wedstrijden.js", naam); }
function knipFunctieStat(naam) { return knipFunctieUit(regelsStat, "src/domein/statistieken.js", naam); }
function knipConstUit(bronRegels, bronNaam, naam) {
  const a = eisIn(bronRegels, bronNaam, new RegExp("^const " + naam + " = \\["), "const " + naam);
  let e = a; while (e < bronRegels.length && !/^\];/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knipConstDomein(naam) { return knipConstUit(regelsDomein, "src/domein/wedstrijden.js", naam); }

try {
  eval(
    knipConstDomein("WEDSTRIJD_SOORTEN") + "\n" +
    knipFunctieDomein("wedstrijdSoort") + "\n" +
    knipFunctieDomein("wedstrijdTelt") + "\n" +
    knipFunctieDomein("tellendeWedstrijden") + "\n" +
    knipFunctieStat("berekenSpelerStats")
  );
} catch (e) {
  console.log("\nDe statistiekfuncties zijn niet uit src/app.jsx of src/domein/wedstrijden.js te knippen:");
  console.log("  " + (e && e.message || e));
  console.log("\n0 geslaagd, 1 gefaald");
  process.exit(1);
}

/* ── de vulling, precies zoals hij in de browser komt ───────── */
const vulling = require(VULLING);
const kast = vulling.opslag("club");
const sleutel = (basis) => "tt_" + vulling.TEAM_ID + "__" + vulling.SEIZOEN + "::" + basis;
const uit = (basis) => JSON.parse(kast[sleutel(basis)]);
const SPELERS     = uit("fch_spelers_v1");
const WEDSTRIJDEN = uit("fch_wedstrijden_v1");
const TRAININGEN  = uit("fch_trainingen_v1");

/* ── minimale testhulp ─────────────────────────────────────── */
let goed = 0, fout = 0;
const toon = (v) => JSON.stringify(v);
const ok = (naam, echt, verwacht) => {
  const gelijk = toon(echt) === toon(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${toon(echt)}\n        verwacht ${toon(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

/* Wat de app zélf uit deze wedstrijden haalt, per speler. `begin` op
   nul, zodat hier alleen staat wat er uit de wedstrijden komt en niet
   wat er als beginstand bij de speler is ingevuld. */
const uitWed = (id) => berekenSpelerStats(id, WEDSTRIJDEN, {}).uitWedstrijden;
const gespeeld = WEDSTRIJDEN.filter((w) => w.status === "gespeeld");
const alleKaarten = [].concat.apply([], gespeeld.map((w) => w.kaarten || []));
const alleScorers = [].concat.apply([], gespeeld.map((w) => w.scorers || []));

/* ══ 1. de kaarten bestaan echt ══ */
groep("De kaarten — `type`, niet `soort`");
ok("er staan vier kaarten in de vulling", alleKaarten.length, 4);
ok("elke kaart heeft een type dat de app kent",
   alleKaarten.filter((k) => k.type === "geel" || k.type === "rood").length, 4);
ok("geen enkele kaart heeft nog een veld `soort`",
   alleKaarten.filter((k) => "soort" in k).length, 0);
ok("elke kaart heeft een id en een naam",
   alleKaarten.filter((k) => k.id && k.naam).length, 4);
ok("de app leest kaarten op k.type — anders klopt de test hierboven niet",
   /k\.type/.test(knipFunctieStat("berekenSpelerStats")), true);

groep("Wat de app uit die kaarten rekent");
ok("Bas Kolderhorst heeft twee gele kaarten", uitWed("s04").geelKaarten, 2);
ok("Mees Halfweegs heeft er één",             uitWed("s07").geelKaarten, 1);
ok("Jesse Pluimgaard heeft een rode",         uitWed("s11").roodKaarten, 1);
ok("samen drie gele en één rode — dit staat op Statistieken › Discipline",
   [SPELERS.reduce((s, p) => s + uitWed(p.id).geelKaarten, 0),
    SPELERS.reduce((s, p) => s + uitWed(p.id).roodKaarten, 0)], [3, 1]);

/* ══ 2. de doelpunten tellen voor het eigen team ══ */
groep("De doelpunten — eigenTeam:true, anders zijn het tegendoelpunten");
ok("er staan acht doelpunten in de vulling", alleScorers.length, 8);
ok("en alle acht zijn van ons eigen team",
   alleScorers.filter((s) => s.eigenTeam === true).length, 8);
ok("elk doelpunt heeft een id en een naam",
   alleScorers.filter((s) => s.id && s.naam).length, 8);
ok("de ingevulde uitslagen tellen op tot diezelfde acht",
   gespeeld.reduce((s, w) => s + w.score.fch, 0), 8);

groep("Wat de app uit die doelpunten rekent");
ok("Luuk Grasmaaijer maakte er vier", uitWed("s09").doelpunten, 4);
ok("Stijn Ravelijn twee",             uitWed("s10").doelpunten, 2);
ok("Sil Draaiboom één",               uitWed("s06").doelpunten, 1);
ok("Ravi Kwartelaar één",             uitWed("s02").doelpunten, 1);
ok("en de keeper geen",               uitWed("s01").doelpunten, 0);

/* ══ 3. de presentielijsten dragen een naam ══ */
groep("De presentielijsten — de app tekent a.naam rechtstreeks");
const presentie = [].concat.apply([], TRAININGEN.map((t) => t.aanwezigheid || []));
ok("drie trainingen hebben een presentielijst",
   TRAININGEN.filter((t) => (t.aanwezigheid || []).length).length, 3);
ok("elke regel heeft een spelerId, een naam en een status",
   presentie.filter((a) => a.spelerId && a.naam && a.status).length, presentie.length);
ok("en die naam hoort bij die speler",
   presentie.filter((a) => {
     const s = SPELERS.filter((p) => p.id === a.spelerId)[0];
     return !s || s.naam !== a.naam;
   }).length, 0);
ok("de app tekent die naam ook echt (a.naam in de presentielijst)",
   /\{a\.naam\}/.test(bronTrainingenScherm), true);

/* ══════════════════════════════════════════════════════════════
   4. EEN OPEN VRAAG, VASTGELEGD ALS TEST
   De opstelling in de vulling is een rij tekst-id's: ["s01","s02",…].
   De app schrijft daar rijen met velden: {spelerId, naam, foto,
   rugnummer, positie, spelStatus, minuten, …} en leest ze op
   o.spelerId (berekenSpelerStats, veldStand, minutenPerPositie).

   Daardoor staat er in het gouden origineel niemand in een opstelling:
   geen speler is aan een wedstrijd gekoppeld, dus "wedstrijden" en
   "speelminuten" komen uit geen enkele wedstrijd en alles wat er op
   het scherm staat komt uit de handmatige beginstand bij de speler.

   Dat is niet gerepareerd, en dat is met opzet: een goede opstelling
   vraagt keuzes die niemand hier mag verzinnen — wie stond er in de
   basis, wie op de bank, hoeveel minuten maakte ieder. Die vraag ligt
   bij Evan.

   Tot die tijd staat het gat hier, als test. Wordt dit rood, dan is
   de opstelling gerepareerd — en dan moet het gouden origineel
   opnieuw opgenomen worden.
   ══════════════════════════════════════════════════════════════ */
groep("OPEN VRAAG — niemand staat in een opstelling (zie de uitleg hierboven)");
ok("de opstelling is een rij tekst en geen rij rijen",
   gespeeld.map((w) => (w.opstelling || []).every((o) => typeof o === "string")),
   [true, true, true]);
ok("dus telt de app nul wedstrijden voor Joep Bramsloot", uitWed("s01").wedstrijden, 0);
ok("en nul speelminuten voor het hele team",
   SPELERS.reduce((s, p) => s + uitWed(p.id).speelMinuten, 0), 0);

/* ── uitslag ────────────────────────────────────────────────── */
console.log("\n" + goed + " geslaagd, " + fout + " gefaald");
process.exit(fout ? 1 : 0);
