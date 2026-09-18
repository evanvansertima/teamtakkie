// @ts-check
/* ══════════════════════════════════════════════════════════════
   KERN: rollen, beheerderstatus
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 16 september 2026 (P2,
   stap 3 van docs/professionaliseringsplan.md). Geen import/export:
   tools/bouw.js plakt dit bestand vóór de rest van de app aan elkaar
   (na server.js, vóór opslag.js — zie KERN_VOLGORDE in
   tools/bouw.js), dus alles hieronder is nog altijd gewoon top-level
   function/const in dezelfde scope als src/app.jsx. Dit is een
   verhuizing, geen herschrijving: dezelfde tekst, dezelfde comments.

   Wat hier staat: de drie clubrollen (eigenaar, trainer, kijker) en
   wat elke rol mag, plus de beheerdersstatus (een aparte, aan de
   server gebonden vlag voor wie de achterkant mag zien) — en de drie
   "achterkant"-functies alleGebruikers, zetPakketVan en
   verwijderAccount. Die drie horen inhoudelijk net zo goed bij de
   server als bij rollen; Evan heeft ervoor gekozen ze hier te zetten,
   samen met de rest van de beheerderstatus, in plaats van in
   src/kern/server.js.

   zetPakketVan() verwijst naar PAKKETTEN, dat in het pakket-blok in
   src/app.jsx blijft staan (met opzet niet meeverplaatst — zie de kop
   van src/kern/sleutels.js). Die kruisverwijzing werkt gewoon onder
   de aaneenschakeling in tools/bouw.js: alles staat straks in
   dezelfde scope, alsof het nooit uit elkaar had gelegen.

   Bestaand dekkingsgat, niet door deze verplaatsing veroorzaakt: geen
   enkele test knipt functies uit dit bestand.
   ══════════════════════════════════════════════════════════════ */

/* ── De achterkant ───────────────────────────────────────────
   Hier ziet één iemand wat alle anderen niet mogen zien: elk account,
   bij welke vereniging het hoort en welk pakket eraan hangt.

   Dat "één iemand" staat niet in de app maar in de database, in een
   tabel die alleen via de SQL-editor te vullen is. Zou het hier staan,
   dan kon iedereen die de bestandsnaam kent zichzelf beheerder maken.
   De knoppen hieronder zijn dus geen slot: het slot zit aan de andere
   kant, en dit is alleen de deurklink. Wie geen beheerder is krijgt van
   de server een weigering terug, hoe hard hij ook klikt. */
/* ══ WAT MAG JE? ═════════════════════════════════════════════
   Drie rollen, en met opzet niet meer.

   Ze staan al in de database en worden daar ook afgedwongen: de
   beveiligingsregels laten alleen een eigenaar of trainer schrijven, een
   kijker niet. Dat is het echte slot. Wat hier staat is de deur ervoor —
   het zorgt dat een kijker geen knoppen ziet die het toch niet doen, en
   dat een trainer niet in het clubbeheer terechtkomt.

   Een vierde rol erbij verzinnen die alleen de app kent, zou een slot
   zijn dat niet op slot zit: de knop verdwijnt, maar wie de
   ontwikkelaarsconsole opent kan alles nog. Liever drie rollen die
   werkelijk iets betekenen dan vijf die mooi staan.

   Wat je als ontwikkelaar mag — de achterkant, de back-up, de
   verbindingstest — staat hier los van. Dat komt uit een eigen tabel op
   de server en heeft niets met je clubrol te maken.
   ══════════════════════════════════════════════════════════ */
/** @typedef {Object} Rol
 * @property {string} id
 * @property {string} label
 * @property {string} icoon    Font Awesome-klasse
 * @property {string} uitleg
 * @property {string[]} mag    welke rechten deze rol heeft
 */

const ROL_KEY = "tt_rol_v1";
/** @type {Rol[]} */
const ROLLEN = [
  {id:"eigenaar", label:"Eigenaar", icoon:"fa-solid fa-key",
   uitleg:"Beheert de vereniging: teams, seizoenen, clubgegevens en het abonnement.",
   mag:["kijken", "wedstrijd", "selectie", "team", "club"]},
  {id:"trainer",  label:"Trainer",  icoon:"fa-solid fa-clipboard-user",
   uitleg:"Beheert zijn eigen team: selectie, tactiek, wedstrijden en cijfers.",
   mag:["kijken", "wedstrijd", "selectie"]},
  {id:"kijker",   label:"Kijker",   icoon:"fa-solid fa-eye",
   uitleg:"Kijkt mee en wijzigt niets.",
   mag:["kijken"]}
];
/** @param {string} id @returns {Rol|null} */
function rolInfoVan(id) {
  return ROLLEN.filter(function (r) { return r.id === id; })[0] || null;
}
/* Zonder server heb je geen clubrol, en dan ben je gewoon de baas over je
   eigen apparaat. Anders zou iemand die de app offline gebruikt nergens
   meer bij kunnen. */
/** @returns {string} het id van de huidige rol */
function rolNu() {
  if (typeof ingelogd === "function" && !ingelogd()) return "eigenaar";
  try {
    var r = localStorage.getItem(ROL_KEY);
    if (r && rolInfoVan(r)) return r;
  } catch(e) {}
  return "eigenaar";
}
/** @param {string} id @returns {string} de (eventueel ongewijzigde) huidige rol */
function zetRol(id) {
  try {
    if (rolInfoVan(id)) localStorage.setItem(ROL_KEY, id);
    else localStorage.removeItem(ROL_KEY);
  } catch(e) {}
  return rolNu();
}
/** @param {string} recht @returns {boolean} */
function magRol(recht) {
  var r = rolInfoVan(rolNu());
  return !!r && r.mag.indexOf(recht) >= 0;
}
/* Kijk je alleen mee? Dan hoort daar één keer duidelijk te staan waarom
   je nergens op kunt drukken, in plaats van vijftien knoppen die niets
   doen. */
/** @returns {boolean} */
function alleenKijken() { return rolNu() === "kijker"; }

const BEHEER_KEY = "tt_beheerder_v1";
/** @returns {boolean} */
function beheerderNu() {
  try { return localStorage.getItem(BEHEER_KEY) === "ja"; } catch(e) { return false; }
}
/** @param {boolean} ja @returns {void} */
function zetBeheerder(ja) {
  try {
    if (ja) localStorage.setItem(BEHEER_KEY, "ja");
    else localStorage.removeItem(BEHEER_KEY);
  } catch(e) {}
}
/* Eén keer per aanmelding navragen. De tabel geeft door de beveiliging
   heen alleen jouw eigen regel terug: staat die er, dan ben je het.
   Bestaat de tabel niet (het beheerbestand is nooit gedraaid), dan is
   het antwoord gewoon nee en gaat er verder niets stuk. */
/** @returns {Promise<boolean>} ben je beheerder? */
function haalBeheerder() {
  if (!ingelogd()) { zetBeheerder(false); return Promise.resolve(false); }
  return serverVraag("/rest/v1/beheerders?select=gebruiker_id")
    .then(function (r) {
      var ja = !!(r.ok && Array.isArray(r.gegevens) && r.gegevens.length);
      zetBeheerder(ja);
      return ja;
    })
    .catch(function () { return beheerderNu(); });
}
/** @returns {Promise<ServerUitkomst>} */
function alleGebruikers() {
  return serverVraag("/rest/v1/rpc/alle_gebruikers", {methode:"POST", lichaam:{}})
    .then(function (r) {
      if (!r.ok) return r;
      return {ok:true, gegevens: Array.isArray(r.gegevens) ? r.gegevens : []};
    });
}
/**
 * @param {string} clubId
 * @param {string} pakket   pakket-id, moet voorkomen in PAKKETTEN (src/app.jsx)
 * @param {string} [tot]    ISO-datum tot wanneer, of niets voor onbeperkt
 * @returns {Promise<ServerUitkomst>}
 */
function zetPakketVan(clubId, pakket, tot) {
  if (!clubId) return Promise.resolve(serverFout("geen-club", "Dit account hoort nog bij geen enkele vereniging."));
  if (PAKKETTEN.filter(function (p) { return p.id === pakket; }).length === 0) {
    return Promise.resolve(serverFout("pakket", "Onbekend pakket: " + pakket));
  }
  return serverVraag("/rest/v1/rpc/zet_pakket", {
    methode: "POST",
    lichaam: {doel: clubId, nieuw: pakket, tot: tot || null}
  });
}
/** @param {string} gebruikerId @returns {Promise<ServerUitkomst>} */
function verwijderAccount(gebruikerId) {
  if (!gebruikerId) return Promise.resolve(serverFout("account", "Geen account opgegeven."));
  return serverVraag("/rest/v1/rpc/verwijder_account", {
    methode: "POST", lichaam: {doel: gebruikerId}
  });
}

