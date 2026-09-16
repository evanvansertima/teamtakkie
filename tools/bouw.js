/* ══════════════════════════════════════════════════════════════
   De bouwstap — TEAMTAKKIE
   ─────────────────────────────────────────────────────────────
   Draaien:  node tools/bouw.js

   Wat dit doet:
       src/index.html  (het sjabloon: kop, stijl, body, twee inline
                        scriptjes die vóór de app moeten draaien)
     + src/app.jsx     (de hele applicatie, JSX)
     ─────────────────────────────────────────────────────────
     = online/index.html

   WAAROM DIT BESTAAT
   ─────────────────────────────────────────────────────────────
   Tot nu toe stond de JSX rauw in online/index.html, in een
   <script type="text/babel">-blok, en werd hij door babel-standalone
   in de browser van élke bezoeker vertaald. Ruim 31.000 regels, bij
   elk koud bezoek opnieuw. Op een telefoon langs de lijn met 4G kost
   dat seconden waar de gebruiker niets voor terugkrijgt — de uitkomst
   van die vertaling is voor iedereen identiek. Babel raadt gebruik in
   productie zelf af.

   Nu gebeurt die vertaling één keer, hier, op Evans laptop, vlak
   voordat de map naar Netlify gaat.

   WAT DIT NADRUKKELIJK NIET DOET
   ─────────────────────────────────────────────────────────────
   Niets minificeren. Geen namen inkorten, geen regels samenvoegen,
   geen dode code weggooien. De uitvoer moet zo dicht mogelijk bij de
   bron blijven, want:
     1. de tests in tests/ knippen functies als tékst uit
        online/index.html — herschrijven breekt dat;
     2. als er ooit iets misgaat in productie wil je in het
        uitgerolde bestand nog kunnen lézen wat er staat.

   De uitrol verandert niet: Evan sleept nog steeds de map online/
   naar Netlify. Alleen draait hij er eerst dit script overheen.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const WORTEL   = path.join(__dirname, "..");
const SJABLOON = path.join(WORTEL, "src", "index.html");
const APPBRON  = path.join(WORTEL, "src", "app.jsx");
const UITVOER  = path.join(WORTEL, "online", "index.html");

/* Het merkteken in src/index.html waar de gebouwde app terechtkomt.
   Bewust een commentaarregel en geen los token: zo blijft het sjabloon
   een geldig HTML-bestand dat je in een browser kunt openen zonder dat
   je een syntaxfout in beeld krijgt. */
const MERK = "/* @BOUW:APP@ */";

/* De regel die eruit moet. Staat nog in het sjabloon zodat src/index.html
   regel-voor-regel gelijk is aan de kop van het bestand dat vandaag live
   staat — dat maakt een diff na de bouw leesbaar. Hier gaat hij eruit. */
const BABEL = /^\s*<script src="[^"]*babel-standalone[^"]*"><\/script>\s*$/;

function fout(tekst) {
  console.error("\nBOUW AFGEBROKEN: " + tekst + "\n");
  process.exit(1);
}

async function bouwInGeheugen() {
  for (const p of [SJABLOON, APPBRON]) {
    if (!fs.existsSync(p)) fout("bronbestand ontbreekt: " + p);
  }

  const sjabloonRegels = fs.readFileSync(SJABLOON, "utf8").split("\n");
  const appBron        = fs.readFileSync(APPBRON, "utf8");

  /* ── Babel eruit ────────────────────────────────────────────── */
  const voor = sjabloonRegels.length;
  const zonderBabel = sjabloonRegels.filter((r) => !BABEL.test(r));
  const weg = voor - zonderBabel.length;
  if (weg === 0) console.log("  · babel-standalone stond al niet in het sjabloon");
  else           console.log("  · babel-standalone verwijderd (" + weg + " regel)");

  /* ── JSX vertalen ───────────────────────────────────────────── */
  /* Geen bundle(), maar transform(): er zijn geen import/export-regels
     in app.jsx, dus er valt niets samen te voegen. Het verschil doet er
     wél toe — bundle() wikkelt alles in een IIFE en springt daardoor
     élke regel twee spaties in. Dan staat geen enkele functie meer op
     kolom 0 en vinden de tests in tests/ ze niet meer terug.
     Zodra P2 begint en app.jsx uiteenvalt in modules, moet dit alsnog
     bundle() worden — en dan is dat inspringprobleem een keuze die
     bewust gemaakt moet worden, geen verrassing. */
  const uit = await esbuild.transform(appBron, {
    loader: "jsx",
    jsx: "transform",           /* JSX → React.createElement, net als babel deed */
    minify: false,              /* zie de kop: uitdrukkelijk niet */
    target: "es2019",           /* iPhone 11 / Android 8 halen dit; nieuwer is onnodig risico */
    sourcefile: "src/app.jsx",
    legalComments: "inline",
  });

  for (const w of uit.warnings || []) console.log("  · waarschuwing: " + w.text);

  /* ── In elkaar zetten ───────────────────────────────────────── */
  const heel = zonderBabel.join("\n");
  if (heel.indexOf(MERK) < 0) fout("het merkteken " + MERK + " staat niet in src/index.html");
  if (heel.indexOf(MERK) !== heel.lastIndexOf(MERK)) fout("het merkteken " + MERK + " staat er meer dan één keer in");

  const resultaat = heel.replace(MERK, () => uit.code.replace(/\n$/, ""));

  /* ── Controles op het eindresultaat ─────────────────────────── */
  /* Liever hier hard falen dan een kapot bestand naar Netlify slepen. */
  if (/babel/i.test(resultaat))            fout("er staat nog een verwijzing naar babel in de uitvoer");
  if (/type="text\/babel"/.test(resultaat)) fout("er staat nog een text/babel-scriptblok in de uitvoer");
  if (resultaat.indexOf("</script>") < 0)   fout("de uitvoer bevat geen enkel scriptblok — er is iets grondig mis");
  /* Een </script> binnen de JS-code zou het scriptblok voortijdig sluiten.
     esbuild ontsnapt dit zelf ("<\/script>"), maar controleren is gratis. */
  if (uit.code.indexOf("</script") >= 0)    fout("de gebouwde JS bevat letterlijk </script — dat breekt de pagina");

  const bronRegels = appBron.split("\n").length;
  const uitRegels  = uit.code.split("\n").length;
  return { resultaat, bronRegels, uitRegels };
}

async function bouw() {
  const { resultaat, bronRegels, uitRegels } = await bouwInGeheugen();
  fs.writeFileSync(UITVOER, resultaat);
  console.log("  · JSX vertaald: " + bronRegels + " regels bron → " + uitRegels + " regels JavaScript");
  console.log("  · geschreven:   online/index.html (" + resultaat.split("\n").length + " regels, " +
              Math.round(Buffer.byteLength(resultaat) / 1024) + " kB)");
  console.log("\nKlaar. De map online/ kan naar Netlify.\n");
}

/* Voor check.py: bouwt in het geheugen en vergelijkt met wat er al in
   online/index.html staat, zonder dat bestand aan te raken. Dit vangt
   precies één fout: iemand past src/app.jsx aan en vergeet daarna
   `node tools/bouw.js` te draaien vóór het slepen naar Netlify — dan
   staat er straks een oudere versie live dan wat in de broncode staat,
   zonder dat iets dat meldt. */
async function controleerActueel() {
  const { resultaat } = await bouwInGeheugen();
  if (!fs.existsSync(UITVOER)) fout("online/index.html bestaat niet — draai eerst node tools/bouw.js");
  const huidig = fs.readFileSync(UITVOER, "utf8");
  if (huidig === resultaat) {
    console.log("OK    online/index.html is actueel (komt overeen met src/app.jsx en src/index.html)");
    return true;
  }
  console.log("FOUT  online/index.html komt NIET overeen met wat src/app.jsx en src/index.html nu opleveren.");
  console.log("      Draai: node tools/bouw.js — en sleep pas daarna de map online/ naar Netlify.");
  return false;
}

if (process.argv.includes("--controleer")) {
  controleerActueel().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => {
    fout(String((e && e.message) || e));
  });
} else {
  console.log("\nTEAMTAKKIE bouwen…");
  bouw().catch((e) => {
  /* esbuild geeft bij een syntaxfout een keurige lijst met regelnummers;
     die zijn het waard om helemaal te laten zien in plaats van alleen
     de samenvatting. De regelnummers verwijzen naar src/app.jsx. */
  if (e && e.errors && e.errors.length) {
    console.error("\nBOUW AFGEBROKEN — fout in src/app.jsx:\n");
    for (const f of e.errors) {
      const l = f.location;
      console.error("  " + (l ? l.file + ":" + l.line + ":" + l.column + "  " : "") + f.text);
      if (l && l.lineText) console.error("      " + l.lineText.trim());
    }
    console.error("");
    process.exit(1);
  }
  fout(String((e && e.message) || e));
  });
}
