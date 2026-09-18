/* ══════════════════════════════════════════════════════════════
   Tests voor de clientkant van de foutrapportage in src/kern/foutmeldingen.js
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/foutmeldingen-client.test.js

   Deze test knipt drie stukken rechtstreeks uit de bron (geen kopie)
   en draait ze zonder netwerk of browser: geen testframework, geen
   npm install — node en verder niets.

   WAT HIER WEL EN NIET GETEST WORDT
   Getest: ontdoeVanPersoonsgegevens() (het privacyfilter),
   herkenBrowserInfo() (de browserherkenning) en _magFoutmeldingVersturen()
   (de twee overspoelingsgrenzen) — alle drie pure functies zonder
   netwerkverkeer, dus zonder mock rechtstreeks door te rekenen.
   NIET getest: stuurFoutmelding() zelf en apparaatIdFout(), want die
   twee praten met localStorage/_haalOp/serverAan — dat vergt een
   fetch-mock en hoort dus bij een latere, bredere sync-achtige test
   als dat ooit nodig blijkt. Het bewijs dat stuurFoutmelding() de
   twee grenzen ook echt gebruikt staat in het rapport bij deze
   wijziging (handmatig doorgerekend), niet hier.

   ── HET FILTER IS EEN VANGNET, GEEN GARANTIE ─────────────────
   ontdoeVanPersoonsgegevens() vangt alleen de vormen die met een
   herkenbaar label ("speler ", "naam:", ...) of een e-mail-/
   telefoonpatroon geschreven zijn. Een naam zonder zo'n label of
   patroon (bijvoorbeeld midden in een foutmelding die de browser zelf
   heeft opgesteld) glipt erdoorheen — dat is een bewuste, met Evan
   besproken beperking, geen gat dat deze test moet dichten. Deze test
   bewijst dus "het filter doet wat het belooft te doen", niet "elke
   foutmelding is privacyveilig".
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const KERN = path.join(__dirname, "..", "src", "kern", "foutmeldingen.js");
const regels = fs.readFileSync(KERN, "utf8").split("\n");

const zoek = (re) => { for (let i = 0; i < regels.length; i++) if (re.test(regels[i])) return i; return -1; };
/* Knipt van de regel die startRe matcht tot en met de eerstvolgende
   regel die met een "}" op kolom 0 begint — dezelfde truc als de
   andere P2/P3-tests (zie bv. tests/seizoen.test.js). Werkt hier ook
   voor een blok dat met een paar const-regels begint (geen eigen
   accolade): die regels worden gewoon meegenomen tot de eerste "}"
   die volgt, en dat is precies de sluitende accolade van de
   functie die erna komt. */
function knip(startRe) {
  const a = zoek(startRe);
  if (a < 0) throw new Error("niet gevonden in src/kern/foutmeldingen.js: " + startRe);
  let e = a;
  while (e < regels.length && !/^\}/.test(regels[e])) e++;
  if (e >= regels.length) throw new Error("geen sluitende accolade gevonden voor: " + startRe);
  return regels.slice(a, e + 1).join("\n");
}

eval(knip(/^const _FOUT_LABELS/));           // + _FOUT_LABEL_PATROON, _FOUT_EMAIL_PATROON, _FOUT_TELEFOON_PATROON, ontdoeVanPersoonsgegevens
eval(knip(/^function herkenBrowserInfo/));
eval(knip(/^var _foutmeldingSessieTeller/)); // + _foutmeldingLaatsteTijd, de twee grenswaarden, _magFoutmeldingVersturen

/* ── minimale testhulp, zelfde stijl als de andere tests ──────── */
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);

/* ══ 1. ontdoeVanPersoonsgegevens — de labels ══ */
groep("ontdoeVanPersoonsgegevens — een label verbergt de waarde erna, niet zichzelf");
ok("'speler ' + naam wordt verborgen, de rest van de zin ook (geen leesteken)",
   ontdoeVanPersoonsgegevens("Speler Jan de Vries niet gevonden", 300),
   "Speler [VERWIJDERD]");
ok("een komma begrenst wat verborgen wordt",
   ontdoeVanPersoonsgegevens("fout bij speler Jan Jansen, regel 42", 300),
   "fout bij speler [VERWIJDERD], regel 42");
ok("'naam:' verbergt alleen de waarde (spatie ná de dubbele punt hoort bij het label)",
   ontdoeVanPersoonsgegevens("naam: Piet Puk is ongeldig", 300),
   "naam: [VERWIJDERD]");
ok("hoofdletterongevoelig",
   ontdoeVanPersoonsgegevens("SPELER: Jan Jansen", 300),
   "SPELER: [VERWIJDERD]");
ok("tekst zonder label of patroon blijft ongemoeid (bekende, besproken beperking)",
   ontdoeVanPersoonsgegevens("Cannot read properties of undefined (reading 'map')", 300),
   "Cannot read properties of undefined (reading 'map')");

groep("ontdoeVanPersoonsgegevens — e-mail en telefoon, met of zonder label");
ok("een e-mailadres wordt vervangen",
   ontdoeVanPersoonsgegevens("contact: jan.devries@voorbeeld.nl gaf een fout", 300),
   "contact: [E-MAIL] gaf een fout");
ok("e-mail: label plus het adres zelf — de labelstap pakt alleen 'jan' (letters), " +
   "de e-mailstap herkent daarna alsnog het hele overgebleven adres",
   ontdoeVanPersoonsgegevens("e-mail: jan@test.nl", 300),
   "e-mail: [E-MAIL]");
ok("een cijferreeks van 8 of meer wordt vervangen",
   ontdoeVanPersoonsgegevens("telefoon 0612345678 onbereikbaar", 300),
   "telefoon [TELEFOON] onbereikbaar");
ok("een reeks van 7 cijfers blijft staan (geen telefoonnummer-achtige lengte)",
   ontdoeVanPersoonsgegevens("code 1234567 ongeldig", 300),
   "code 1234567 ongeldig");
/* Regressie: bij het handmatig doorrekenen van deze wijziging bleek een
   eerdere versie van het waardegedeelte hier "telefoon:[VERWIJDERD][TELEFOON]"
   te geven — de losse spatie ná "telefoon:" werd zelf als "waarde"
   gelezen omdat de labelregex' \s* die kon afstaan aan de waardegroep
   zodra er geen letter op volgde. Zie de uitleg bij _FOUT_WAARDE in
   src/kern/foutmeldingen.js. */
ok("'telefoon:' gevolgd door alleen cijfers geeft GEEN loze [VERWIJDERD] erbij",
   ontdoeVanPersoonsgegevens("telefoon: 0623456789 onbereikbaar", 300),
   "telefoon: [TELEFOON] onbereikbaar");

groep("ontdoeVanPersoonsgegevens — de afkap gebeurt ná het filteren");
ok("precies op de grens blijft heel", ontdoeVanPersoonsgegevens("abcdefghij", 10), "abcdefghij");
ok("een tekst langer dan de grens wordt afgekapt",
   ontdoeVanPersoonsgegevens("a".repeat(310), 300).length, 300);
ok("lege/undefined tekst geeft een lege string, geen crash",
   ontdoeVanPersoonsgegevens(undefined, 300), "");

/* ══ 2. herkenBrowserInfo — nooit de ruwe user-agent, wel bruikbaar ══ */
groep("herkenBrowserInfo — vier browsers, vijf besturingssysteem-families");
const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const SAFARI_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const SAFARI_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const FIREFOX_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0";
const EDGE_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0";
const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
const CHROME_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1";

ok("Chrome / Windows", herkenBrowserInfo(CHROME_WIN), "Chrome / Windows");
ok("Safari / Mac", herkenBrowserInfo(SAFARI_MAC), "Safari / Mac");
ok("Safari / iOS", herkenBrowserInfo(SAFARI_IOS), "Safari / iOS");
ok("Firefox / Linux", herkenBrowserInfo(FIREFOX_LINUX), "Firefox / Linux");
ok("Edge (bevat ook 'Chrome/') / Windows", herkenBrowserInfo(EDGE_WIN), "Edge / Windows");
ok("Chrome / Android", herkenBrowserInfo(CHROME_ANDROID), "Chrome / Android");
ok("Chrome op iOS (CriOS) telt als Chrome / iOS", herkenBrowserInfo(CHROME_IOS), "Chrome / iOS");
ok("onbekende/lege user-agent geeft geen crash", herkenBrowserInfo(""), "onbekend / overig");
ok("het resultaat is nooit de ruwe user-agent",
   herkenBrowserInfo(CHROME_WIN).indexOf("Mozilla") === -1, true);

/* ══ 3. de twee overspoelingsgrenzen ══ */
groep("_magFoutmeldingVersturen — grens 1: dezelfde fout niet twee keer binnen 10s");
let teltGoedgekeurd = 0;
for (let i = 0; i < 10; i++) {
  if (_magFoutmeldingVersturen("Cannot read properties of undefined", "dashboard", 1000)) teltGoedgekeurd++;
}
ok("10 identieke, gelijktijdige pogingen leveren precies 1 echt verzoek op", teltGoedgekeurd, 1);
ok("dezelfde fout ná 10 seconden mag weer",
   _magFoutmeldingVersturen("Cannot read properties of undefined", "dashboard", 1000 + 10000), true);
ok("een net iets te vroege poging (9999ms later) mag nog niet",
   _magFoutmeldingVersturen("Cannot read properties of undefined", "dashboard", 1000 + 10000 + 9999), false);
ok("een ANDER bericht op hetzelfde scherm mag wel meteen",
   _magFoutmeldingVersturen("Een heel andere fout", "dashboard", 1000), true);
ok("hetzelfde bericht op een ANDER scherm mag ook meteen",
   _magFoutmeldingVersturen("Cannot read properties of undefined", "wedstrijden", 1000), true);

groep("_magFoutmeldingVersturen — grens 2: nooit meer dan 5 per paginasessie");
/* Reset de tellers: dit zijn module-brede variabelen, en de vorige
   groep heeft ze al opgehoogd — een render-lus in het echt begint ook
   niet bij nul als er al eerder iets is misgegaan op de pagina, dus
   dat is geen kunstgreep, dat is precies het scenario waar deze grens
   voor bedoeld is. Voor een schone meting hieronder tellen we het
   sessietotaal expliciet mee in plaats van opnieuw op 0 te beginnen. */
const vorigTotaal = _foutmeldingSessieTeller;
let toegestaanInDezeGroep = 0;
for (let i = 0; i < 20; i++) {
  /* Elke poging heeft een eigen bericht/tijdstip, zodat grens 1
     (de 10-secondendedup) hier niet meedoet — alleen grens 2 wordt
     hier gemeten. */
  if (_magFoutmeldingVersturen("fout nummer " + i, "clubhuis", 1000000 + i * 20000)) toegestaanInDezeGroep++;
}
ok("een render-lus van 20 verschillende fouten levert nooit meer dan (5 - wat er al was) verzoeken op",
   toegestaanInDezeGroep, Math.max(0, 5 - vorigTotaal));
ok("de sessieteller stopt hard op 5, ongeacht hoeveel er nog aangeboden worden",
   _foutmeldingSessieTeller, 5);
ok("een 21ste, weer nieuwe fout wordt ook geweigerd — de sessiegrens wint, niet de dedup-grens",
   _magFoutmeldingVersturen("een compleet nieuwe fout die nooit eerder langskwam", "clubhuis", 999999999), false);

/* ── uitslag ──────────────────────────────────────────────── */
console.log(`\n${goed} geslaagd, ${fout} gefaald`);
process.exit(fout ? 1 : 0);
