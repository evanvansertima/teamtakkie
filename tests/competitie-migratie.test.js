/* ══════════════════════════════════════════════════════════════
   Tests voor het omzetten van bestaande gegevens naar de competitie
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/competitie-migratie.test.js

   Stap 3 van release 1 (docs/updateplan-competitie-toernooi-ai.md,
   hoofdstukken 6 en 11). Geschreven vóór de functies bestonden.

   WAAR HET HIER OM GAAT
   - M1: bestaande eigen competitiewedstrijden komen in de competitie,
     maar pas NA bevestiging, en in de fase die de gebruiker kiest.
     Niets wordt geraden.
   - Scenario 10: de eigen W/GL/V/voor/tegen vóór de omzetting is
     precies de som over alle fases ná de omzetting — ook als de
     wedstrijden over twee fases worden verdeeld.
   - De oude gegevens (wedstrijden, oude handmatige stand) worden niet
     aangeraakt: alle functies zijn puur.
   - De controlefunctie vangt een kapotte omzetting.
   - M3: spelers krijgen een persoonId; binnen één team over seizoenen
     dezelfde; over teams heen alleen een VOORSTEL bij gelijke naam én
     geboortedatum, nooit alleen op naam.

   Gebruikt de vaste vulling van het gouden origineel
   (tools/gouden-origineel/vulling.js) als echte bestaande gegevens.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const WORTEL = path.join(__dirname, "..");
const MODULE = process.env.TT_COMPETITIE || path.join(WORTEL, "src", "domein", "competitie.js");
const wedstrijdenBron = fs.readFileSync(path.join(WORTEL, "src", "domein", "wedstrijden.js"), "utf8").split("\n");
function knip(regels, naam) {
  const a = regels.findIndex((r) => new RegExp("^function " + naam + "\\(").test(r));
  if (a < 0) throw new Error(naam + " niet gevonden");
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}
eval(knip(wedstrijdenBron, "maakPouleSchema"));
eval(fs.readFileSync(MODULE, "utf8").replace(/^const /gm, "var "));

const vulling = require(path.join(WORTEL, "tools", "gouden-origineel", "vulling.js"));
const opslag = vulling.opslag("club");
const sleutel = (soort) => Object.keys(opslag).find((k) => k.endsWith("::" + soort));
const WEDSTRIJDEN = JSON.parse(opslag[sleutel("fch_wedstrijden_v1")]);
const SPELERS = JSON.parse(opslag[sleutel("fch_spelers_v1")]);

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);
const kopie = (x) => JSON.parse(JSON.stringify(x));

/* De eigen rij zoals de oude app hem uitrekende (eigenStandRij in
   src/domein/statistieken.js): competitie, gespeeld, score.fch/teg. */
function oudeEigenRij(ws) {
  const g = ws.filter((w) => w.status === "gespeeld" && (w.soort || "competitie") === "competitie");
  return {
    w: g.filter((w) => w.score.fch > w.score.teg).length,
    gl: g.filter((w) => w.score.fch === w.score.teg).length,
    v: g.filter((w) => w.score.fch < w.score.teg).length,
    dv: g.reduce((s, w) => s + w.score.fch, 0),
    dt: g.reduce((s, w) => s + w.score.teg, 0)
  };
}
function somEigenOverFases(c, ws) {
  const som = { w: 0, gl: 0, v: 0, dv: 0, dt: 0 };
  c.fases.forEach((f) => {
    const r = standVanFase(c, f.id, ws).filter((x) => x.eigen)[0];
    som.w += r.winst; som.gl += r.gelijk; som.v += r.verlies; som.dv += r.voor; som.dt += r.tegen;
  });
  return som;
}

/* Een oude, met de hand ingevulde stand zoals StandTab die bewaarde.
   Eén naam is anders geschreven dan in de wedstrijden; dat mag geen
   tweede team opleveren. */
const OUDE_STAND = [
  { id: 1, naam: "vv nevelmeer o19-1", gespeeld: 3, winst: 2, gelijk: 0, verlies: 1, doelVoor: 7, doelTegen: 4 },
  { id: 2, naam: "SV Kwelderhorst O19-1", gespeeld: 3, winst: 1, gelijk: 1, verlies: 1, doelVoor: 5, doelTegen: 5 }
];

(function draai() {

groep("de vulling zelf (zodat de test weet waar hij op rekent)");
ok("5 eigen wedstrijden, 3 gespeeld", [WEDSTRIJDEN.length, WEDSTRIJDEN.filter((w) => w.status === "gespeeld").length], [5, 3]);
const VOOR = oudeEigenRij(WEDSTRIJDEN);
ok("oude eigen rij: 1 gewonnen, 1 gelijk, 1 verloren, 8–7", VOOR, { w: 1, gl: 1, v: 1, dv: 8, dt: 7 });

groep("M1: competitie aanmaken");
const ingangW = kopie(WEDSTRIJDEN), ingangS = kopie(OUDE_STAND);
const c0 = migreerNaarCompetitie({ id: "c1", faseId: "f1", eigenNaam: "VV Verzonnen Kamp JO19-2",
  oudeStand: ingangS, wedstrijden: ingangW });
ok("één fase, actief, open, handmatig", [c0.fases.length, c0.actieveFaseId, c0.fases[0].status, c0.fases[0].vorm], [1, "f1", "open", "handmatig"]);
const namen = c0.teams.map((t) => t.naam);
ok("teams: eigen + oude stand + tegenstanders, zonder dubbele Nevelmeer",
   c0.teams.length, 1 + 5 + 1);        // eigen, 5 tegenstanders, Kwelderhorst
ok("precies één eigen team", c0.teams.filter((t) => t.eigen).length, 1);
ok("het eigen team heet zoals het team", c0.teams.filter((t) => t.eigen)[0].naam, "VV Verzonnen Kamp JO19-2");
ok("Nevelmeer één keer, in de schrijfwijze van de wedstrijd", namen.filter((n) => /nevelmeer/i.test(n)), ["VV Nevelmeer O19-1"]);
ok("en de andere schrijfwijze bewaard als alias",
   c0.teams.filter((t) => /nevelmeer/i.test(t.naam))[0].aliassen, ["vv nevelmeer o19-1"]);
ok("alle teams zijn deelnemer van Fase 1", c0.fases[0].deelnemers.length, c0.teams.length);
ok("er staan nog GEEN wedstrijden in: eerst bevestigen", c0.fases[0].wedstrijden.length, 0);

groep("voorstel tot indeling");
const voorstel = voorstelIndeling(c0, ingangW);
ok("alle 5 eigen competitiewedstrijden, ook de geplande", voorstel.map((v) => v.wedstrijdId), ["w01", "w02", "w03", "w04", "w05"]);
ok("voorstel: allemaal de actieve fase", voorstel.every((v) => v.faseId === "f1"), true);
const metOefen = ingangW.concat([Object.assign(kopie(ingangW[0]), { id: "w99", soort: "oefen" })]);
ok("een oefenwedstrijd zit niet in het voorstel", voorstelIndeling(c0, metOefen).some((v) => v.wedstrijdId === "w99"), false);

groep("bevestigen, alles in Fase 1 (scenario 10)");
const r1 = bevestigIndeling(c0, ingangW, voorstel);
ok("5 competitiewedstrijden in Fase 1", r1.competitie.fases[0].wedstrijden.length, 5);
ok("elk verwijst naar zijn eigen wedstrijd", r1.competitie.fases[0].wedstrijden.map((w) => w.wedstrijdId), ["w01", "w02", "w03", "w04", "w05"]);
ok("de eigen wedstrijden weten in welke fase ze zitten",
   r1.wedstrijden.map((w) => w.competitie && w.competitie.faseId), ["f1", "f1", "f1", "f1", "f1"]);
ok("thuis/uit klopt: w02 was een uitwedstrijd",
   (() => { const cw = r1.competitie.fases[0].wedstrijden[1]; const eigen = r1.competitie.teams.filter((t) => t.eigen)[0].id; return cw.uitId === eigen; })(), true);
ok("som over fases = oude eigen rij", somEigenOverFases(r1.competitie, r1.wedstrijden), VOOR);
ok("controle: in orde", controleMigratie(ingangW, r1.competitie, r1.wedstrijden), { ok: true, meldingen: [] });

groep("bevestigen, verdeeld over twee fases");
const c2 = nieuweFase(c0, { id: "f2", naam: "Fase 2", kopieerDeelnemers: true, kopieerRegels: true });
const verdeeld = voorstelIndeling(c2, ingangW).map((v) => Object.assign({}, v, { faseId: v.datum < "2026-10-01" ? "f1" : "f2" }));
const r2 = bevestigIndeling(c2, ingangW, verdeeld);
ok("Fase 1 twee wedstrijden, Fase 2 drie", r2.competitie.fases.map((f) => f.wedstrijden.length), [2, 3]);
ok("som over beide fases = oude eigen rij", somEigenOverFases(r2.competitie, r2.wedstrijden), VOOR);
ok("controle: in orde", controleMigratie(ingangW, r2.competitie, r2.wedstrijden).ok, true);

groep("niets dubbel, niets aangeraakt");
const r3 = bevestigIndeling(r1.competitie, r1.wedstrijden, voorstelIndeling(r1.competitie, r1.wedstrijden));
ok("nog een keer bevestigen maakt geen tweede set", r3.competitie.fases[0].wedstrijden.length, 5);
ok("de oorspronkelijke wedstrijden zijn niet aangepast", JSON.stringify(ingangW), JSON.stringify(WEDSTRIJDEN));
ok("de oude stand is niet aangepast", JSON.stringify(ingangS), JSON.stringify(OUDE_STAND));
ok("en de competitie van vóór het bevestigen ook niet", c0.fases[0].wedstrijden.length, 0);

groep("de controle vangt een kapotte omzetting");
const kapot = kopie(r1.competitie); kapot.fases[0].wedstrijden.pop();
const k1 = controleMigratie(ingangW, kapot, r1.wedstrijden);
ok("een ontbrekende wedstrijd: niet in orde", k1.ok, false);
ok("met een melding die zegt wat er mis is", k1.meldingen.length > 0 && /w05/.test(k1.meldingen.join(" ")), true);
const dubbel = kopie(r1.competitie); dubbel.fases.push(Object.assign(kopie(dubbel.fases[0]), { id: "fx" }));
ok("een wedstrijd in twee fases: niet in orde", controleMigratie(ingangW, dubbel, r1.wedstrijden).ok, false);
const gewijzigd = kopie(r1.wedstrijden); gewijzigd[0].score.fch = 9;
ok("een gewijzigde uitslag: niet in orde", controleMigratie(ingangW, r1.competitie, gewijzigd).ok, false);
/* Ook een wijziging die de totalen NIET raakt moet opvallen: een
   veranderde score bij een geplande wedstrijd telt nergens mee, maar is
   evengoed een wijziging aan iemands gegevens. */
const stil = kopie(r1.wedstrijden); stil[3].score = { fch: 2, teg: 1 };
const k2 = controleMigratie(ingangW, r1.competitie, stil);
ok("een stille wijziging bij een geplande wedstrijd: niet in orde, met de wedstrijd erbij",
   [k2.ok, /w04/.test(k2.meldingen.join(" "))], [false, true]);

groep("M3: persoonId");
let teller = 0;
const maakId = () => "p" + (++teller);
const s1 = kopie(SPELERS.slice(0, 3));
const s2 = kopie(SPELERS.slice(0, 2));      // volgend seizoen: twee spelers mee
const met = geefPersoonIds([{ seizoen: "2025/2026", spelers: s1 }, { seizoen: "2026/2027", spelers: s2 }], maakId);
ok("iedere speler een persoonId", met.every((s) => s.spelers.every((x) => typeof x.persoonId === "string")), true);
ok("dezelfde speler (zelfde id) houdt over seizoenen dezelfde persoonId",
   met[1].spelers.map((x) => x.persoonId), met[0].spelers.slice(0, 2).map((x) => x.persoonId));
ok("de invoer is niet aangepast", s1.some((x) => x.persoonId), false);
const nogEens = geefPersoonIds(met, maakId);
ok("opnieuw toepassen verandert niets", JSON.stringify(nogEens), JSON.stringify(met));

groep("M3: persoonVan — zonder iets in de spelers te schrijven");
ok("zelfde team, zelfde speler-id: in elk seizoen hetzelfde kenmerk",
   persoonVan({ id: "s01" }, "tgoud") === persoonVan({ id: "s01" }, "tgoud"), true);
ok("ander team, zelfde speler-id: ander kenmerk",
   persoonVan({ id: "s01" }, "jo17") === persoonVan({ id: "s01" }, "jo19"), false);
ok("een gekoppelde speler gebruikt zijn persoonId", persoonVan({ id: "s01", persoonId: "daan" }, "jo19"), "daan");
const zonder = koppelPersonen({ jo17: [{ id: 1 }], jo19: [{ id: 11 }] }, { teamId: "jo17", spelerId: 1 }, { teamId: "jo19", spelerId: 11 });
ok("koppelen kan ook als nog niemand een persoonId had",
   [zonder.jo17[0].persoonId, zonder.jo19[0].persoonId], ["p-jo17-1", "p-jo17-1"]);
ok("doelpunten van een ongekoppelde speler tellen per team apart",
   doelpuntenPerPersoon([{ teamId: "jo17", seizoen: "s", wedstrijd: { scorers: [{ spelerId: 5, eigenTeam: true }] } },
                         { teamId: "jo19", seizoen: "s", wedstrijd: { scorers: [{ spelerId: 5, eigenTeam: true }] } }], {}),
   { "p-jo17-5": 1, "p-jo19-5": 1 });

groep("M3: koppelvoorstellen over teams heen");
const teamA = { teamId: "jo17", spelers: [
  { id: 1, naam: "Daan de Vries", geboortedatum: "2009-03-14" },
  { id: 2, naam: "Sem Bakker", geboortedatum: "2009-07-01" },
  { id: 3, naam: "Lars Smit", geboortedatum: "" }] };
const teamB = { teamId: "jo19", spelers: [
  { id: 11, naam: "daan de vries", geboortedatum: "2009-03-14" },   // zelfde persoon, andere schrijfwijze
  { id: 12, naam: "Sem Bakker", geboortedatum: "2008-02-02" },      // zelfde naam, andere persoon
  { id: 13, naam: "Lars Smit", geboortedatum: "" }] };              // geen geboortedatum: geen voorstel
ok("alleen bij gelijke naam én geboortedatum", koppelVoorstellen(teamA, teamB), [{ a: 1, b: 11 }]);
const gekoppeld = koppelPersonen({ jo17: [{ id: 1, persoonId: "pA" }], jo19: [{ id: 11, persoonId: "pB" }] },
  { teamId: "jo17", spelerId: 1 }, { teamId: "jo19", spelerId: 11 });
ok("koppelen geeft de tweede speler de persoonId van de eerste", gekoppeld.jo19[0].persoonId, "pA");
const los = ontkoppelPersoon(gekoppeld, { teamId: "jo19", spelerId: 11 }, () => "pNieuw");
ok("ontkoppelen geeft weer een eigen persoonId", los.jo19[0].persoonId, "pNieuw");
ok("en laat de ander staan", los.jo17[0].persoonId, "pA");

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
})();
