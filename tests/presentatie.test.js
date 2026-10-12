/* ══════════════════════════════════════════════════════════════
   Tests voor de dia's van de toernooipresentatie
   (src/domein/presentatie.js, wens van Evan op 12 oktober 2026)
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/presentatie.test.js
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const WORTEL = path.join(__dirname, "..");
const MODULE = process.env.TT_PRES || path.join(WORTEL, "src", "domein", "presentatie.js");
const lees = (p) => fs.readFileSync(path.join(WORTEL, p), "utf8");
function knip(bron, naam) {
  const r = bron.split("\n"); const a = r.findIndex((x) => new RegExp("^function " + naam + "\\(").test(x));
  let e = a; while (!/^\}/.test(r[e])) e++; return r.slice(a, e + 1).join("\n");
}
eval(knip(lees("src/domein/wedstrijden.js"), "maakPouleSchema"));
eval(lees("src/domein/competitie.js").replace(/^const /gm, "var "));
eval(lees("src/domein/toernooi.js").replace(/^const /gm, "var "));
eval(fs.readFileSync(MODULE, "utf8").replace(/^const /gm, "var "));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

/* Een toernooi: JO11 met twee poules en knock-out, JO13 met één poule. */
function opzet() {
  let t = maakToernooi({ id: "t", naam: "Pinkstertoernooi" });
  t = Object.assign({}, t, {
    dagen: [{ id: "d1", datum: "2027-05-15", start: "09:00", eind: "17:00" }],
    locaties: [{ id: "l1", naam: "Park", velden: [{ id: "v1", naam: "Veld 1" }, { id: "v2", naam: "Veld 2" }] }],
    categorieen: [Object.assign(nieuweCategorie(), { id: "c1", naam: "JO11", wedstrijdduur: 15, wisseltijd: 5, minRust: 5 }),
                  Object.assign(nieuweCategorie(), { id: "c2", naam: "JO13", wedstrijdduur: 20, wisseltijd: 5, minRust: 5 })] });
  const a = [], b = [];
  ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((n) => { const r = voegDeelnemerToe(t, { categorieId: "c1", naam: "VV " + n }); t = r.toernooi; a.push(r.id); });
  ["P", "Q", "R"].forEach((n) => { const r = voegDeelnemerToe(t, { categorieId: "c2", naam: "SC " + n, email: "geheim@x.nl" }); t = r.toernooi; b.push(r.id); });
  t = maakGroepsfase(t, "c1", { poules: [a.slice(0, 4), a.slice(4)], perPoule: 2, besteNummers: null });
  t = maakKnockoutNaGroepsfase(t, "c1", t.stadia[0].id, { troostfinale: false });
  t = maakGroepsfase(t, "c2", { poules: [b], perPoule: 0, besteNummers: null });
  t = planAutomatisch(t).toernooi;
  return t;
}
const NU = { datum: "2027-05-15", min: 600 };   // 10:00

(function draai() {
let t = opzet();

groep("dia's maken");
{
  const d = nieuweDia("Programma", ["programma", "uitslagen"]);
  ok("nieuwe dia: aan, 8 seconden, twee blokken", [d.aan, d.duur, d.blokken.map((b) => b.soort)], [true, 8, ["programma", "uitslagen"]]);
  ok("blok krijgt zijn beginwaarden", [nieuwBlok("programma").aantal, nieuwBlok("tekst").tekst], [6, "WELKOM"]);
  ok("onbekend blok wordt geweigerd", (() => { try { nieuwBlok("raket"); return "geen fout"; } catch (e) { return "fout"; } })(), "fout");
  ok("duur: leeg of onzin = 8, te kort = 3, te lang = 300", [diaDuur(""), diaDuur("x"), diaDuur(1), diaDuur(999), diaDuur(12.4)], [8, 8, 3, 300, 12]);
  ok("alle blokken van Evans lijst bestaan", ["wedstrijden", "programma", "stand", "uitslagen", "sponsors", "tekst", "kleedkamers", "video", "afbeelding"].every((s) => BLOK_SOORTEN.some((b) => b.id === s)), true);
  ok("indeling: 1, 2, 3 (één groot), 4 blokken", [1, 2, 3, 4].map((n) => diaIndeling(n).plekken.length), [1, 2, 3, 4]);
}

groep("beginset en welke dia's meedoen");
{
  const zonder = standaardDias(t).map((d) => d.naam);
  ok("beginset past bij het toernooi (geen sponsors/kleedkamers)", zonder, ["Welkom", "Programma en uitslagen", "Stand JO11", "Stand JO13", "Knock-out JO11"]);
  const met = Object.assign({}, t, { presentatie: { sponsors: [{ id: "s1", naam: "Bakker Bart" }], kleedkamers: [{ id: "k1", naam: "Kleedkamer 1", teams: [] }] } });
  ok("met sponsors en kleedkamers erbij", standaardDias(met).slice(-2).map((d) => d.naam), ["Kleedkamers", "Sponsors"]);
  ok("nog geen dia's gemaakt: de beginset draait", actieveDias(t).length, 5);
  const eigen = Object.assign({}, t, { presentatie: { dias: [
    Object.assign(nieuweDia("Aan", ["tekst"]), { duur: 12 }),
    Object.assign(nieuweDia("Uit", ["tekst"]), { aan: false }),
    nieuweDia("Leeg", []),
    Object.assign(nieuweDia("Vijf blokken", ["tekst", "tekst", "tekst", "tekst", "tekst"]), { duur: 0 })
  ] } });
  const act = actieveDias(eigen);
  ok("alleen aangevinkte dia's met inhoud", act.map((d) => d.naam), ["Aan", "Vijf blokken"]);
  ok("duur en maximaal vier blokken", [act[0].duur, act[1].duur, act[1].blokken.length], [12, 8, 4]);
  ok("één rondje duurt de som van de dia's", rondjeDuur(act), 20);
  ok("alles uitgevinkt: lege presentatie, niet stiekem de beginset", actieveDias(Object.assign({}, t, { presentatie: { dias: [Object.assign(nieuweDia("x", ["tekst"]), { aan: false })] } })).length, 0);
}

groep("wat er op een blok staat");
{
  /* Uitslagen voor de eerste drie wedstrijden. */
  t.wedstrijden.filter((w) => w.categorieId === "c1").slice(0, 3).forEach((w, i) => { t = zetUitslag(t, w.id, { thuis: i, uit: 1 }, null); });
  const prog = blokGegevens(t, Object.assign(nieuwBlok("programma"), { aantal: 4 }), NU);
  ok("programma: hoogstens 4, geen gespeelde", [prog.rijen.length <= 4, prog.rijen.every((r) => !r.uitslag)], [true, true]);
  ok("programma: niets dat al ruim voorbij is", prog.rijen.every((r) => minVan(r.tijd) + 30 >= NU.min), true);
  const uit = blokGegevens(t, nieuwBlok("uitslagen"), NU);
  ok("laatst gespeeld: drie uitslagen, de laatste bovenaan", [uit.rijen.length, uit.rijen[0].uitslag], [3, "2-1"]);
  const alle = blokGegevens(t, Object.assign(nieuwBlok("wedstrijden"), { categorieId: "c2", aantal: 2 }), NU);
  ok("alle wedstrijden van JO13, met 'en nog' teller", [alle.titel, alle.rijen.length, alle.meer], ["Wedstrijden · JO13", 2, 1]);
  const st = blokGegevens(t, Object.assign(nieuwBlok("stand"), { categorieId: "c1" }), NU);
  ok("stand JO11: twee poules met vier teams", [st.poules.length, st.poules[0].rijen.length, st.poules[0].doorPerPoule], [2, 4, 2]);
  const een = blokGegevens(t, Object.assign(nieuwBlok("stand"), { categorieId: "c1", pouleId: t.stadia[0].poules[1].id }), NU);
  ok("stand van één poule", [een.poules.length, een.poules[0].naam], [1, "Poule B"]);
  ok("stand van alles: categorienaam erbij", blokGegevens(t, nieuwBlok("stand"), NU).poules.map((p) => p.naam), ["JO11 · Poule A", "JO11 · Poule B", "JO13 · Groepsfase"]);
  const ko = blokGegevens(t, Object.assign(nieuwBlok("knockout"), { categorieId: "c1" }), NU);
  ok("knock-out: halve finale en finale, nog geen kampioen", [ko.rondes.map((r) => r.naam), ko.kampioen], [["Halve finale", "Finale"], ""]);
  const bezig = blokGegevens(t, Object.assign(nieuwBlok("wedstrijden"), { aantal: 20 }), { datum: "2027-05-15", min: minVan(t.wedstrijden[3].start) + 2 });
  ok("een wedstrijd die nu loopt is gemarkeerd", bezig.rijen.some((r) => r.bezig && r.nummer === t.wedstrijden[3].nummer), true);
  ok("op een andere dag loopt er niets", blokGegevens(t, Object.assign(nieuwBlok("wedstrijden"), { aantal: 20 }), { datum: "2027-05-16", min: 600 }).rijen.some((r) => r.bezig), false);

  const p = { sponsors: [{ id: "s1", naam: "Bakker Bart", logoId: "m1" }, { id: "s2", naam: "Garage Gijs" }],
              kleedkamers: [{ id: "k1", naam: "Kleedkamer 1", teams: [t.deelnemers[0].id, t.deelnemers[1].id], tijd: "09:00–12:00" }],
              media: [{ id: "m1", soort: "afbeelding", naam: "Logo bakker" }, { id: "m2", soort: "video", naam: "Clubfilm", url: "https://youtu.be/dQw4w9WgXcQ" }] };
  const tp = Object.assign({}, t, { presentatie: p });
  ok("sponsors: allemaal, of een keuze", [blokGegevens(tp, nieuwBlok("sponsors"), NU).sponsors.length, blokGegevens(tp, Object.assign(nieuwBlok("sponsors"), { sponsors: ["s2"] }), NU).sponsors.map((s) => s.naam)], [2, ["Garage Gijs"]]);
  ok("kleedkamers met teamnamen", blokGegevens(tp, nieuwBlok("kleedkamers"), NU).kamers, [{ naam: "Kleedkamer 1", tijd: "09:00–12:00", opmerking: "", teams: ["VV A", "VV B"] }]);
  ok("grote tekst", blokGegevens(tp, Object.assign(nieuwBlok("tekst"), { tekst: "FINALE!", ondertekst: "15:00" }), NU), { titel: "", tekst: "FINALE!", ondertekst: "15:00" });
  const v = blokGegevens(tp, Object.assign(nieuwBlok("video"), { mediaId: "m2" }), NU);
  ok("video uit het materiaal, herkend als YouTube", [v.titel, v.video], ["Clubfilm", { soort: "youtube", id: "dQw4w9WgXcQ" }]);
  ok("afbeelding uit het materiaal", blokGegevens(tp, Object.assign(nieuwBlok("afbeelding"), { mediaId: "m1" }), NU).media.naam, "Logo bakker");
  ok("verkeerd soort media wordt niet gebruikt (video als afbeelding)", blokGegevens(tp, Object.assign(nieuwBlok("afbeelding"), { mediaId: "m2" }), NU).media, null);
}

groep("videolinks");
{
  ok("YouTube in alle vormen", ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube.com/watch?t=3&v=dQw4w9WgXcQ"].map((u) => videoBron(u) && videoBron(u).id), ["dQw4w9WgXcQ", "dQw4w9WgXcQ", "dQw4w9WgXcQ", "dQw4w9WgXcQ"]);
  ok("Vimeo", videoBron("https://vimeo.com/123456789"), { soort: "vimeo", id: "123456789" });
  ok("directe videolink", videoBron("https://club.nl/film/intro.mp4"), { soort: "bestand", url: "https://club.nl/film/intro.mp4" });
  ok("geen https, geen video of iets geks: geweigerd", ["http://youtu.be/dQw4w9WgXcQ", "https://club.nl/pagina", "javascript:alert(1)", "https://x.nl/a.mp4\" onerror=\"x", ""].map(videoBron), [null, null, null, null, null]);
}

groep("openbaar: alleen wat mag");
{
  const p = { kleur: "#123456", thema: "licht", dias: [Object.assign(nieuweDia("Welkom", ["tekst"]), { geheim: "x" })],
              sponsors: [{ id: "s1", naam: "Bakker", logoId: "m1", contact: "bakker@x.nl" }],
              kleedkamers: [{ id: "k1", naam: "K1", teams: ["a"], sleutelcode: "1234" }],
              media: [{ id: "m1", soort: "afbeelding", naam: "Logo", data: "data:image/png;base64,AAAA" }, { id: "m2", soort: "video", naam: "Film", url: "https://youtu.be/dQw4w9WgXcQ" }] };
  const pub = publiekePresentatie(p);
  ok("geen extra velden (contact, codes, pixels)", /bakker@|"1234"|sleutelcode|"geheim"|base64/.test(JSON.stringify(pub)), false);
  ok("wel dia's, sponsors, kleedkamers en verwijzingen", [pub.dias.length, pub.sponsors[0].logoId, pub.kleedkamers[0].teams, pub.media.length, pub.thema], [1, "m1", ["a"], 2, "licht"]);
  const m = publiekeMomentopname(Object.assign({}, t, { presentatie: p }), { nu: "x" });
  ok("de momentopname neemt de dia's mee, zonder e-mail", [m.presentatie.dias.length, /geheim@|bakker@|"email"/.test(JSON.stringify(m))], [1, false]);
  ok("welke afbeeldingen naar de server moeten (logo's en afbeeldingen, geen video)", nodigeMedia(Object.assign({}, p, { sponsors: p.sponsors.concat([{ id: "s2", logoId: "m1" }]) })), ["m1"]);
}

console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;
})();
