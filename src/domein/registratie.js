// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: registreren — e-mailadres, wachtwoord, akkoord
   ─────────────────────────────────────────────────────────────
   Besluit van Evan (13 oktober 2026), na een test waarin accounts
   zonder geldig e-mailadres konden worden aangemaakt:
     · het e-mailadres moet er geldig uitzien (en wordt daarna met een
       bevestigingsmail gecontroleerd — dat doet Supabase);
     · een sterk wachtwoord: minimaal 8 tekens, met een hoofdletter,
       een kleine letter, een cijfer en een symbool;
     · verplicht akkoord op de algemene voorwaarden en het
       privacybeleid, met datum vastgelegd.

   Dezelfde wachtwoordeisen staan ook in Supabase (Authentication →
   Policies), zodat ze niet buiten de app om te omzeilen zijn. Daarom
   is "symbool" hier precies de lijst die Supabase kent: een teken
   als € telt daar niet mee, en dan zou de app "groen" zeggen en de
   server toch weigeren.

   Puur: geen opslag, geen scherm. Geen import/export (tools/bouw.js).
   ══════════════════════════════════════════════════════════════ */

/* De symbolen die Supabase meetelt (in deze vorm geschreven zodat er
   geen losse aanhalingstekens in de bron staan). */
const WACHTWOORD_SYMBOLEN = "!@#$%^&*()_+-=[]{};\x27:\x22|<>?,./`~";
const WACHTWOORD_MIN = 8;
/* Versie van de voorwaarden waarop iemand akkoord geeft. Verandert de
   tekst wezenlijk, dan hier een nieuwe datum: dan is terug te vinden
   wie op welke versie akkoord gaf. */
const VOORWAARDEN_VERSIE = "2026-10-09";
const VOORWAARDEN_URL = "https://teamtakkie.nl/algemene-voorwaarden";
const PRIVACY_URL = "https://teamtakkie.nl/privacybeleid";

/* Ziet dit eruit als een e-mailadres? Iets voor de @, een domein met
   een punt erin en een extensie van minstens twee letters erachter.
   Een tikfout als "gmial.com" vangt dit niet — daarvoor is de
   bevestigingsmail. */
/** @param {any} e @returns {boolean} */
function emailGeldig(e) {
  var s = String(e == null ? "" : e).trim();
  if (s.length > 254 || /\s/.test(s)) return false;
  var m = s.match(/^([^@]+)@([^@]+)$/);
  if (!m) return false;
  var naam = m[1], domein = m[2];
  if (naam.length > 64 || naam.charAt(0) === "." || naam.charAt(naam.length - 1) === "." || naam.indexOf("..") >= 0) return false;
  var delen = domein.toLowerCase().split(".");
  if (delen.length < 2) return false;
  if (!/^[a-z]{2,}$/.test(delen[delen.length - 1])) return false;
  return delen.every(function (d) { return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(d); });
}
/** @param {any} e @returns {string} */
function emailNetjes(e) { return String(e == null ? "" : e).trim().toLowerCase(); }

/* De eisen, elk apart: zo kan het scherm ze één voor één afvinken. */
/** @param {any} w @returns {{id:string, tekst:string, ok:boolean}[]} */
function wachtwoordEisen(w) {
  var s = String(w == null ? "" : w);
  var symbool = false;
  for (var i = 0; i < s.length; i++) if (WACHTWOORD_SYMBOLEN.indexOf(s.charAt(i)) >= 0) symbool = true;
  return [
    { id: "lengte", tekst: "Minimaal " + WACHTWOORD_MIN + " tekens", ok: s.length >= WACHTWOORD_MIN },
    { id: "hoofd", tekst: "Een hoofdletter (A–Z)", ok: /[A-Z]/.test(s) },
    { id: "klein", tekst: "Een kleine letter (a–z)", ok: /[a-z]/.test(s) },
    { id: "cijfer", tekst: "Een cijfer (0–9)", ok: /[0-9]/.test(s) },
    { id: "symbool", tekst: "Een symbool, zoals ! ? # @ . -", ok: symbool }
  ];
}
/** @param {any} w @returns {boolean} */
function wachtwoordSterkGenoeg(w) { return wachtwoordEisen(w).every(function (e) { return e.ok; }); }

/* Een indruk van de sterkte, 0 (leeg) tot 4 (sterk), voor de balk.
   Alle eisen gehaald is minstens 3; lengte maakt het verschil. */
/** @param {any} w @returns {number} */
function wachtwoordSterkte(w) {
  var s = String(w == null ? "" : w);
  if (!s) return 0;
  var gehaald = wachtwoordEisen(s).filter(function (e) { return e.ok; }).length;
  if (gehaald < 5) return gehaald <= 2 ? 1 : 2;
  /* Steeds hetzelfde teken of een bekende reeks is nooit sterk. */
  if (/^(.)\1+$/.test(s) || /(123456|abcdef|qwerty|wachtwoord|password)/i.test(s)) return 2;
  return s.length >= 12 ? 4 : 3;
}

/* Alles samen: mag de knop "Account aanmaken" aan, en zo niet, waarom
   niet (de eerste reden, in gewone taal). */
/**
 * @param {{email:any, wachtwoord:any, akkoord:boolean}} f
 * @returns {{mag:boolean, reden:string}}
 */
function registratieControle(f) {
  if (!emailGeldig(f.email)) return { mag: false, reden: "Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl." };
  if (!wachtwoordSterkGenoeg(f.wachtwoord)) return { mag: false, reden: "Je wachtwoord voldoet nog niet aan alle eisen." };
  if (!f.akkoord) return { mag: false, reden: "Ga akkoord met de algemene voorwaarden en het privacybeleid." };
  return { mag: true, reden: "" };
}

/* Wat er bij het account wordt bewaard (Supabase: user_metadata). Het
   tijdstip komt van dit apparaat; Supabase bewaart daarnaast zelf
   wanneer het account werd aangemaakt. */
/** @param {Date} [nu] @returns {{akkoord_voorwaarden:string, voorwaarden_versie:string}} */
function akkoordGegevens(nu) {
  return { akkoord_voorwaarden: (nu || new Date()).toISOString(), voorwaarden_versie: VOORWAARDEN_VERSIE };
}
