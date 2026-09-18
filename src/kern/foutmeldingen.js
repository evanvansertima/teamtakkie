// @ts-check
/* ══════════════════════════════════════════════════════════════
   KERN: foutmeldingen — crashes uit de browser naar Supabase sturen
   ─────────────────────────────────────────────────────────────
   Nieuw op 18 september 2026, bij server/16-foutrapportage.sql (de
   tabel public.foutmeldingen — al gebouwd en getest, zie dat bestand
   voor het datamodel en de servergrens van 20 per apparaat per uur).
   Geen import/export: tools/bouw.js plakt dit bestand ná server.js,
   vóór rollen.js (KERN_VOLGORDE in tools/bouw.js) — dus alles
   hieronder is gewoon top-level function/const in dezelfde scope als
   de rest van de app. Ná server.js, omdat stuurFoutmelding() de
   ongeauthenticeerde deur van dat bestand gebruikt (_haalOp, serverAan).

   WAAROM DIT EEN EIGEN BESTAND IS EN GEEN TOEVOEGING AAN opslag.js
   Opslag.js gaat over localStorage van de teamgegevens zelf (spelers,
   wedstrijden, back-ups). Dit bestand gaat over iets heel anders: een
   los, betekenisloos apparaat-id, een tekstfilter, twee
   overspoelingsgrenzen en één netwerkaanroep naar een tabel zonder elke
   koppeling aan een team. Dat samen in opslag.js proppen zou dat
   bestand een tweede, ongerelateerd onderwerp geven. Vandaar een eigen,
   klein bestand.

   WAT HIER NIET STAAT
   De drie plekken die dit bestand daadwerkelijk AANROEPEN (de vroege
   foutopvang in src/index.html, de nieuwe unhandledrejection-listener
   en de ErrorBoundary in src/app.jsx) staan expres niet hier: dit
   bestand is de kern-laag (geen DOM, geen React), zij zijn de
   schermkant. Zie die bestanden voor waar stuurFoutmelding() vandaan
   wordt geroepen.
   ══════════════════════════════════════════════════════════════ */

/* ── Het apparaat-id voor deze ene tabel ────────────────────────
   Dit is BEWUST een andere sleutel dan APPARAAT_KEY ("tt_apparaat_v1")
   uit src/kern/server.js — dat id hoort bij synchronisatie (zodat een
   apparaat zijn eigen wijziging herkent) en staat straks gewoon in de
   sync-back-up en -export. Dit id hoort nergens bij een team, club of
   sync-cyclus, en moet dat ook nooit per ongeluk worden: vandaar het
   eigen "ttf_"-voorvoegsel (foutrapportage) in plaats van het "tt_"
   dat de rest van de app gebruikt, zodat niemand dit veld ooit abusievelijk
   meeneemt in een back-up/export-routine die op het "tt_"-voorvoegsel
   grept. */
const FOUT_APPARAAT_KEY = "ttf_apparaat_v1";

/* Een losse uuid, ver van cryptografisch belangrijk — hij dient alleen
   om de servergrens (20 per apparaat per uur, zie DEEL 2 van
   server/16-foutrapportage.sql) te laten werken, niet om iemand te
   identificeren. crypto.randomUUID() bestaat in elke browser die deze
   app in 2026 nog hoeft te ondersteunen, mits https (Netlify) — de
   handmatige vervanger hieronder is alleen voor het zeldzame geval
   (heel oude browser, of een lokale niet-https-test) waarin die
   functie ontbreekt. */
/** @returns {string} */
function _nieuwFoutApparaatId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
/** @returns {string|null} het (eventueel net aangemaakte) apparaat-id voor foutmeldingen, of null als localStorage niet beschikbaar is */
function apparaatIdFout() {
  try {
    var bestaand = localStorage.getItem(FOUT_APPARAAT_KEY);
    if (bestaand) return bestaand;
    var nieuw = _nieuwFoutApparaatId();
    localStorage.setItem(FOUT_APPARAAT_KEY, nieuw);
    return nieuw;
  } catch (e) {
    return null;
  }
}

/* ── Het filter tegen persoonsgegevens ──────────────────────────
   Dit is een VANGNET, geen garantie. Een foutmelding kan een naam of
   e-mailadres bevatten zonder dat er een herkenbaar label ("speler ",
   "naam:", ...) voor staat — bijvoorbeeld als een foutmelding letterlijk
   "Cannot read properties of undefined (reading 'Jan Jansen')" luidt.
   Zo'n geval vangt dit filter niet, en dat is een bewuste, al met Evan
   besproken beperking (zie de opdracht bij deze wijziging), geen gat
   dat hier alsnog dichtgetimmerd moet worden. Wat dit WEL vangt: de
   meest voorkomende vorm, waarbij de code zelf een naam/e-mail/telefoon
   opzoekt en in de foutmelding zet met een van de labels hieronder, en
   elk e-mailadres of lange cijferreeks, met of zonder label.

   Volgorde is van belang: eerst de labels (die laten het label zelf
   staan en vervangen alleen de waarde erna), dan pas de generieke
   e-mail-/telefoonherkenning, en als allerlaatste de afkap (die moet
   ná het vervangen gebeuren, anders zou een label vlak vóór de grens
   een halve waarde laten staan).

   Het waardegedeelte van een label (_FOUT_WAARDE hieronder) is met
   opzet beperkt tot "woorden" van lettertekens/koppeltekens/apostroffen,
   met maximaal één spatie ertussen — het alfabet van een naam — en
   sluit cijfers, "@" en punten bewust uit. Zonder die beperking zou
   bijvoorbeeld "e-mail: jan@test.nl" al bij de labelstap tot achter de
   punt worden opgegeten (punten tellen als leesteken, dus als
   stopteken), en dan zou het e-mailadres nooit heel genoeg overblijven
   voor de eigen e-mailherkenning hieronder om het net zo consequent
   als "[E-MAIL]" te taggen. Met de lettertekenbeperking pakt de
   labelstap alleen het naamdeel ("jan"), blijft "@test.nl" over, en
   herkent de e-mailstap daarna alsnog het complete adres. Zie de test
   "e-mail: label plus het adres zelf" in tests/foutmeldingen-client.test.js.

   BELANGRIJK, gevonden tijdens het handmatig doorrekenen (niet bij het
   eerste schrijven): het waardegedeelte mag NOOIT een kale spatie op
   zichzelf kunnen zijn. Een eerdere versie liet ook een losse spatie
   toe (zodat "Jan de Vries" met spaties ertussen kon matchen), maar
   dan kan bij bijvoorbeeld "telefoon: 0612345678" de spatie ná de
   dubbele punt zelf als "waarde" worden gelezen zodra er geen letter
   op volgt (de \s* van het label geeft die spatie dan af aan de
   waardegroep) — dat gaf "telefoon:[VERWIJDERD][TELEFOON]" in plaats
   van gewoon "telefoon: [TELEFOON]". Vandaar de eis dat de waarde met
   een ECHT lettertekens moet BEGINNEN en pas daarna eventueel ", spatie
   + nog een woord" mag herhalen — een spatie kan zo nooit als volledige
   waarde op zichzelf overblijven. */
const _FOUT_LABELS = ["speler\\s+", "naam\\s*:\\s*", "speler\\s*:\\s*", "e-?mail\\s*:\\s*", "telefoon\\s*:\\s*"];
const _FOUT_WAARDE = "[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:[ \\t][A-Za-zÀ-ÖØ-öø-ÿ'-]+)*";
const _FOUT_LABEL_PATROON = new RegExp("(" + _FOUT_LABELS.join("|") + ")(" + _FOUT_WAARDE + ")", "gi");
const _FOUT_EMAIL_PATROON = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const _FOUT_TELEFOON_PATROON = /\d{8,}/g;

/**
 * Ontdoet een foutmelding-tekst of stack trace van de meest voor-
 * komende vormen van persoonsgegevens, en kapt hem af op maxLengte.
 * Puur en zonder zij-effecten: geschikt om zonder mock rechtstreeks
 * te testen (zie tests/foutmeldingen-client.test.js).
 * @param {string} tekst
 * @param {number} maxLengte  de kolomgrens in Supabase (300 voor
 *   bericht, 2000 voor stack) — de server WEIGERT een langere tekst
 *   hard in plaats van hem in te korten, dus dit moet vóór het
 *   versturen al gebeurd zijn.
 * @returns {string}
 */
function ontdoeVanPersoonsgegevens(tekst, maxLengte) {
  var uit = String(tekst === undefined || tekst === null ? "" : tekst);
  uit = uit.replace(_FOUT_LABEL_PATROON, function (_heel, label) { return label + "[VERWIJDERD]"; });
  uit = uit.replace(_FOUT_EMAIL_PATROON, "[E-MAIL]");
  uit = uit.replace(_FOUT_TELEFOON_PATROON, "[TELEFOON]");
  if (uit.length > maxLengte) uit = uit.slice(0, maxLengte);
  return uit;
}

/* ── Browserherkenning, zonder de ruwe user-agent te versturen ──
   Geen uitputtende detectiebibliotheek: vier browsers en vijf
   besturingssysteem-families is genoeg om "welke combinatie crasht
   steeds" te herkennen. Volgorde is van belang: CriOS/FxiOS (Chrome/
   Firefox op iOS) worden vóór de generieke Chrome/Firefox-controle
   gezet, al zou het door hun afwijkende tokens ("CriOS", geen
   "Chrome/") ook zonder die volgorde goed gaan — expliciet is hier
   leesbaarder dan toevallig-kloppend. */
/**
 * @param {string} ua  navigator.userAgent — wordt NOOIT zelf teruggegeven
 * @returns {string} bijvoorbeeld "Chrome / Windows", ten hoogste 100 tekens
 */
function herkenBrowserInfo(ua) {
  var tekst = String(ua === undefined || ua === null ? "" : ua);

  var browser = "onbekend";
  if (/Edg\//i.test(tekst)) browser = "Edge";
  else if (/OPR\//i.test(tekst) || /Opera/i.test(tekst)) browser = "Opera";
  else if (/CriOS\//i.test(tekst)) browser = "Chrome";
  else if (/FxiOS\//i.test(tekst)) browser = "Firefox";
  else if (/Chrome\//i.test(tekst) && !/Chromium/i.test(tekst)) browser = "Chrome";
  else if (/Firefox\//i.test(tekst)) browser = "Firefox";
  else if (/Safari\//i.test(tekst) && /Version\//i.test(tekst)) browser = "Safari";

  var os = "overig";
  if (/Windows/i.test(tekst)) os = "Windows";
  else if (/iPhone|iPad|iPod/i.test(tekst)) os = "iOS";
  else if (/Mac OS X/i.test(tekst)) os = "Mac";
  else if (/Android/i.test(tekst)) os = "Android";
  else if (/Linux/i.test(tekst)) os = "Linux";

  return (browser + " / " + os).slice(0, 100);
}

/* Er bestaat vandaag geen versie-constante die src/app.jsx en
   online/sw.js delen. sw.js heeft zijn eigen VERSIE ("takkie-v34"),
   maar dat bestand draait als service worker in een eigen, gescheiden
   scope — het wordt niet door tools/bouw.js meegeplakt met de rest —
   dus die waarde is hier niet zonder duplicatie over te nemen. Bij
   gebrek aan een voor de hand liggende gedeelde bron is dit een vaste
   placeholder; zie het rapport bij deze wijziging voor de open vraag
   aan Evan of en hoe er één gedeelde versie-constante moet komen. */
const FOUT_APP_VERSIE = "onbekend";

/* ── De twee overspoelingsgrenzen, vóór er ooit een verzoek gaat ──
   Beide in-het-geheugen, met opzet niet in localStorage: ze horen bij
   déze paginalaadbeurt en moeten bij een herlaad weer op nul beginnen
   — anders zou een gebruiker die de pagina ververst na vijf fouten
   nooit meer een foutmelding kunnen versturen, ook niet voor een heel
   andere fout. */
var _foutmeldingSessieTeller = 0;
var _foutmeldingLaatsteTijd = /** @type {Object<string,number>} */ ({});
const FOUTMELDING_MAX_PER_SESSIE = 5;
const FOUTMELDING_HERHAAL_MS = 10 * 1000;

/**
 * Bepaalt of stuurFoutmelding() deze fout daadwerkelijk mag versturen
 * en werkt bij een "ja" meteen de tellers bij. Losstaand van het
 * echte versturen gehouden zodat dit zonder netwerkverzoek of mock te
 * testen is (zie tests/foutmeldingen-client.test.js) — en zodat de
 * belangrijkste grens (max 5 per sessie) een render-lus al hier
 * afkapt, vóór er ook maar naar de klok of de servergrens wordt
 * gekeken.
 * @param {string} bericht  al door ontdoeVanPersoonsgegevens gehaald
 * @param {string|null|undefined} scherm
 * @param {number} [nu]  tijdstip in ms; standaard Date.now() (test-haakje)
 * @returns {boolean}
 */
function _magFoutmeldingVersturen(bericht, scherm, nu) {
  if (_foutmeldingSessieTeller >= FOUTMELDING_MAX_PER_SESSIE) return false;
  var tijdstip = nu === undefined ? Date.now() : nu;
  var sleutel = String(bericht) + "|" + String(scherm || "");
  var vorigeKeer = _foutmeldingLaatsteTijd[sleutel];
  if (vorigeKeer !== undefined && (tijdstip - vorigeKeer) < FOUTMELDING_HERHAAL_MS) return false;
  _foutmeldingLaatsteTijd[sleutel] = tijdstip;
  _foutmeldingSessieTeller++;
  return true;
}

/**
 * De ene functie die de drie foutopvangplekken (src/index.html,
 * de unhandledrejection-listener en de ErrorBoundary, allebei in
 * src/app.jsx) aanroepen. Mag NOOIT zelf een zichtbare fout of
 * console-ruis veroorzaken — vandaar de buitenste try/catch en de
 * .catch() op het verzoek zelf: een mislukte verstuurpoging (geen
 * server ingesteld, geen internet, de servergrens van 20/uur al
 * bereikt) is nooit iets om verder op te reageren.
 * @param {{bericht:string, stack?:string, scherm?:string|null, fouttype:string}} opts
 */
function stuurFoutmelding(opts) {
  try {
    var ruwBericht = (opts && opts.bericht) ? String(opts.bericht) : "onbekende fout";
    var bericht = ontdoeVanPersoonsgegevens(ruwBericht, 300);
    var scherm = (opts && opts.scherm) ? String(opts.scherm).slice(0, 50) : null;

    if (!_magFoutmeldingVersturen(bericht, scherm)) return;
    if (!serverAan()) return; /* geen server ingesteld: niets om naartoe te sturen */

    var apparaatId = apparaatIdFout();
    if (!apparaatId) return; /* localStorage niet beschikbaar (bv. privénavigatie) */

    /** @type {Object<string,any>} */
    var lichaam = {
      bericht: bericht,
      apparaat_id: apparaatId,
      fouttype: String((opts && opts.fouttype) || "onbekend").slice(0, 30),
      app_versie: FOUT_APP_VERSIE,
      browser_info: herkenBrowserInfo(typeof navigator !== "undefined" ? navigator.userAgent : "")
    };
    if (opts && opts.stack) lichaam.stack = ontdoeVanPersoonsgegevens(String(opts.stack), 2000);
    if (scherm) lichaam.scherm = scherm;

    /* Met opzet ".insert(...)" zonder ".select()" erachteraan — in
       kale-fetch-termen: geen "Prefer: return=representation"-kop.
       Die combinatie faalt hier altijd, ook zonder iets anders fout:
       zie DEEL 2 van server/16-foutrapportage.sql, scenario 12 in
       tests/foutmeldingen.test.sql. */
    _haalOp("/rest/v1/foutmeldingen", {methode: "POST", lichaam: lichaam}).catch(function () {});
  } catch (fout) {
    /* Zelfs de foutrapportage zelf mag nooit een nieuwe fout geven. */
  }
}
