#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   TYPEN-CONTROLE — losse controle bovenop check.py
   ─────────────────────────────────────────────────────────────
   Draaien:  node tools/typen-check.js

   Waarom dit een apart script is en niet in check.py zit: check.py
   controleert syntax (haakjes, JSX, dubbele verklaringen) met eigen
   regex-code, zonder een externe compiler nodig te hebben. Dit
   script roept de TypeScript-compiler (tsc) aan als los stuk
   gereedschap, precies zoals tools/bouw.js esbuild aanroept. tsc
   raakt de uitgerolde app niet aan: er wordt nooit iets geëmit
   (--noEmit), dit is puur een leesbaarheidscontrole op de bron.
   Zie docs/professionaliseringsplan.md, P5: "Geen herschrijving naar
   TypeScript. Wel // @ts-check met JSDoc-annotaties op de kern en de
   domeinlogica."

   WAAROM ALLE KERN- EN DOMEIN-BESTANDEN MEE DE AANROEP IN GAAN, OOK
   DIE ZONDER // @ts-check
   ─────────────────────────────────────────────────────────────
   src/kern/*.js en src/domein/*.js gebruiken geen import/export —
   net als de rest van de app is alles top-level function/const in
   gedeelde scope, en tools/bouw.js plakt de bestanden in vaste
   volgorde aan elkaar (zie KERN_VOLGORDE/DOMEIN_VOLGORDE hieronder,
   gelijk aan die in tools/bouw.js). Geef je tsc maar één bestand
   tegelijk, dan ziet tsc elk bestand als een eigen, geïsoleerd
   programma en meldt hij "Cannot find name" voor elke functie of
   const die in een ánder bestand staat — vals alarm, want die naam
   bestaat wel degelijk zodra de bestanden zijn samengeplakt.

   De oplossing is een eigenschap van tsc die weinig bekend is: geef
   je GEEN --checkJs mee, dan wordt een .js-bestand alleen op fouten
   gecontroleerd als de EERSTE REGEL // @ts-check is — maar bestanden
   ZONDER die regel doen nog wel gewoon mee in het programma, voor de
   naamsherkenning. Zo kun je alle kern- en domein-bestanden in één
   tsc-aanroep meegeven (kruisverwijzingen lossen op), terwijl er
   alleen fouten worden gerapporteerd voor de bestanden die je zelf
   al hebt voorzien van // @ts-check. Handmatig nagemeten (zie
   docs/ voor de proef): met --checkJs zou tsc OOK ongemoeide
   bestanden zonder JSDoc gaan controleren, met een stortvloed aan
   "implicitly has an any type" over code die nog geen beurt heeft
   gehad. Zonder --checkJs blijft de controle precies bij wat er
   bewust is aangemeld.

   Bestanden die "omhoog" wijzen — naar functies/consts die pas in
   src/app.jsx staan (inst(), zetInstellingen(), TEAMINST_KEY, …) —
   geven op dit moment nog wél "Cannot find name", want app.jsx doet
   nog niet mee in deze aanroep. Dat is geen fout van dit script: dat
   komt pas goed zodra app.jsx (en later de schermmodules) hier ook
   worden meegegeven — een latere stap, niet vandaag.

   VLAGGEN
   ─────────────────────────────────────────────────────────────
   --allowJs --noEmit   : .js-bestanden toestaan, nooit iets schrijven.
   --target es2019      : zelfde doel als tools/bouw.js gebruikt voor
                           esbuild — geen andere aannames over de
                           JavaScript-versie dan de bouwstap al maakt.
   --lib es2019,dom      : "dom" is nodig, anders kent tsc localStorage
                           niet (kern/domein draait in de browser) en
                           zou hij op ELKE localStorage-aanroep een
                           "Cannot find name" geven — geen echte fout,
                           gewoon een ontbrekende omgevingsbeschrijving.
   Bewust GEEN --checkJs: zie hierboven. Bewust geen --strict: dat zou
   ook dingen als "mogelijk null" gaan afdwingen die nu nergens in de
   code zijn opgelost (zie het try/catch-commentaar in sleutels.js) —
   dat is een grotere stap dan wat P5 nu vraagt.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const WORTEL = path.join(__dirname, "..");
const KERN_MAP = path.join(WORTEL, "src", "kern");
const DOMEIN_MAP = path.join(WORTEL, "src", "domein");
const TSC = path.join(__dirname, "node_modules", ".bin", "tsc");

/* Dezelfde volgorde als KERN_VOLGORDE/DOMEIN_VOLGORDE in tools/bouw.js.
   Niet vanuit bouw.js overgenomen (dat bestand voert bij het inladen
   meteen de bouw of de --controleer-actie uit — dat willen we hier
   niet activeren), met opzet hier herhaald. Wijzigt de volgorde in
   bouw.js, werk hem dan ook hier bij: de volgorde bepaalt alleen wie
   van wie gebruik mág maken qua scope, voor tsc's naamsherkenning
   maakt de volgorde zelf niets uit (alle bestanden gaan sowieso
   samen het programma in) — maar uit elkaar laten lopen is verwarrend
   bij het lezen. */
const KERN_VOLGORDE = ["sleutels.js", "server.js", "foutmeldingen.js", "rollen.js", "opslag.js", "sync.js"];
const DOMEIN_VOLGORDE = ["boetepot.js", "wedstrijden.js", "statistieken.js", "opkomst.js"];

function bestaandeBestanden(map, volgorde) {
  return volgorde
    .map((naam) => path.join(map, naam))
    .filter((p) => fs.existsSync(p));
}

const alleBestanden = [
  ...bestaandeBestanden(KERN_MAP, KERN_VOLGORDE),
  ...bestaandeBestanden(DOMEIN_MAP, DOMEIN_VOLGORDE),
];

/* Alleen bestanden met // @ts-check als EERSTE regel worden door tsc
   op fouten gerapporteerd (zie de uitleg hierboven) — dit lijstje is
   puur voor onze eigen leesbare uitvoer (welke bestanden doen nu al
   echt mee), tsc bepaalt dit zelf opnieuw aan de hand van de pragma. */
function heeftTsCheck(bestandspad) {
  const eersteRegel = fs.readFileSync(bestandspad, "utf8").split("\n", 1)[0].trim();
  return eersteRegel === "// @ts-check";
}

const gecontroleerd = alleBestanden.filter(heeftTsCheck);
const relatief = (p) => path.relative(WORTEL, p);

if (!gecontroleerd.length) {
  console.log("geen bestanden met // @ts-check gevonden, niets te controleren");
  process.exit(0);
}

console.log("Typen-controle (tsc " + require(path.join(__dirname, "node_modules", "typescript", "package.json")).version + ")");
console.log("  · meegegeven aan tsc (voor naamsherkenning): " + alleBestanden.map(relatief).join(", "));
console.log("  · daarvan gecontroleerd (// @ts-check): " + gecontroleerd.map(relatief).join(", "));
console.log();

if (!fs.existsSync(TSC)) {
  console.error("FOUT  tsc niet gevonden op " + TSC + " — draai eerst: cd tools && npm install");
  process.exit(1);
}

const resultaat = spawnSync(
  TSC,
  ["--allowJs", "--noEmit", "--target", "es2019", "--lib", "es2019,dom", ...alleBestanden],
  { cwd: WORTEL, encoding: "utf8" }
);

const uitvoer = (resultaat.stdout || "") + (resultaat.stderr || "");
if (uitvoer.trim()) console.log(uitvoer.trim());

if (resultaat.status === 0) {
  console.log("\nOK    typen: geen meldingen in " + gecontroleerd.length + " gecontroleerd bestand(en).");
  process.exit(0);
}

console.log("\nFOUT  typen: tsc meldt bovenstaande melding(en).");
process.exit(1);
