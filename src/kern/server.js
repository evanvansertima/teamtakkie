// @ts-check
/* ══════════════════════════════════════════════════════════════
   KERN: de server (Supabase), aanmelden, sessie
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 16 september 2026 (P2,
   stap 2 van docs/professionaliseringsplan.md). Geen import/export:
   tools/bouw.js plakt dit bestand vóór de rest van de app aan elkaar
   (na sleutels.js, vóór rollen.js — zie KERN_VOLGORDE in
   tools/bouw.js), dus alles hieronder is nog altijd gewoon top-level
   function/const in dezelfde scope als src/app.jsx. Dit is een
   verhuizing, geen herschrijving: dezelfde tekst, dezelfde comments.

   Wat hier staat: het adres en de sleutel van de Supabase-server,
   serverVraag() (de ene deur waar alle verkeer met de server
   doorheen gaat), aan- en afmelden, en de sessie (wie je bent op dit
   apparaat, en het React-haakje gebruikSessie() dat een scherm laat
   herrenderen zodra die sessie verandert).

   Wat hier NIET staat: de drie "achterkant"-functies (alleGebruikers,
   zetPakketVan, verwijderAccount) horen thematisch bij de server, maar
   zijn met opzet naar src/kern/rollen.js gegaan (stap 3) — Evans
   beslissing, omdat ze inhoudelijk meer met beheerderstatus te maken
   hebben dan met de server-verbinding zelf. Ook geen enkele test knipt
   vandaag functies uit dít bestand: sync.test.js mockt serverVraag()
   juist weg om er omheen te testen. Dat is een bestaand dekkingsgat,
   geen gevolg van deze verplaatsing.
   ══════════════════════════════════════════════════════════════ */

/* ══ DE SERVER ═══════════════════════════════════════════════
   TEAMTAKKIE praat met Supabase zonder extra bibliotheek, gewoon met
   fetch. Dat scheelt honderd kilobyte die bij elk bezoek opnieuw
   geladen zou moeten worden, en het scheelt een afhankelijkheid die
   op een veld zonder bereik ook nog uit de voorraad moet komen.
   Supabase is aan de buitenkant een doodgewone webdienst; er is
   niets nodig wat fetch niet kan.

   Alles wat hier staat is optioneel. Vul je geen adres in, dan werkt
   de app precies zoals hij deed: alles op dit apparaat, niets naar
   buiten. Inloggen is een keuze, geen drempel.
   ══════════════════════════════════════════════════════════ */
const SERVER_KEY  = "tt_server_v1";     /* het adres en de publieke sleutel */
const SESSIE_KEY  = "tt_sessie_v1";     /* je aanmelding op dit apparaat */
const APPARAAT_KEY = "tt_apparaat_v1";  /* wie deze wijziging schreef */

/* Het adres van je eigen Supabase-project. Vul je het hier in, dan
   hoeft niemand het meer op te zoeken; laat je het leeg, dan kan het
   in de app worden ingesteld. De publieke sleutel mag gewoon in dit
   bestand staan — dat is waar hij voor bedoeld is. Wat iemand met
   die sleutel mag, bepaalt de database zelf met zijn regels per rij,
   en niet deze app. */
/* De server waar deze app op draait.

   Deze sleutel is met opzet openbaar. Supabase noemt hem "publishable"
   en hij hoort in de app te staan, net zoals het adres van een winkel
   op de deur staat. Wat iemand met deze sleutel mag, bepaalt de
   database zelf: zonder inloggen niets, en na inloggen alleen de
   gegevens van je eigen vereniging. Dat is de beveiliging — niet de
   geheimhouding van dit stukje tekst.

   Wat hier NOOIT mag staan is de secret key of de service_role key.
   Die zet alle regels buitenspel en zou iedereen bij alles laten.

   Zet een gebruiker hieronder zijn eigen adres in, dan wint dat: dan
   draait hij op zijn eigen server en komt zijn ledenlijst nooit hier
   terecht. */
const SERVER_INGEBOUWD = {
  url: "https://escibxugiyjclrwmivkn.supabase.co",
  sleutel: "sb_publishable_3ygbV3rj8fZa65N88ME2FQ_Q9nMa5EN"
};

/** @typedef {Object} ServerInst
 * @property {string} url      adres van het Supabase-project, zonder eind-schuine-streep
 * @property {string} sleutel  de publieke ("publishable"/"anon") sleutel
 */

/** @returns {ServerInst} het ingebouwde adres, eventueel overschreven door wat lokaal is ingesteld */
function _leesServer() {
  var uit = Object.assign({}, SERVER_INGEBOUWD);
  try {
    var r = localStorage.getItem(SERVER_KEY);
    if (r) {
      var o = JSON.parse(r);
      if (o && o.url) uit.url = String(o.url).trim().replace(/\/+$/, "");
      if (o && o.sleutel) uit.sleutel = String(o.sleutel).trim();
    }
  } catch(e) {}
  return uit;
}
/** @type {ServerInst} */
var _server = _leesServer();
/** @returns {ServerInst} */
function serverInst() { return _server; }
/**
 * @param {Partial<ServerInst>} [v]  velden om over de huidige instelling heen te zetten
 * @returns {ServerInst} de bijgewerkte instelling
 */
function zetServerInst(v) {
  _server = Object.assign({}, _server, v || {});
  if (_server.url) _server.url = String(_server.url).trim().replace(/\/+$/, "");
  try { localStorage.setItem(SERVER_KEY, JSON.stringify(_server)); } catch(e) {}
  return _server;
}
/** @returns {boolean} is er een adres én een sleutel ingesteld? */
function serverAan() { return !!(_server.url && _server.sleutel); }

/* Een nummer voor dit apparaat. Niet om je te volgen: het staat bij
   elke wijziging op de server, zodat een apparaat zijn eigen
   wijziging niet aanziet voor die van iemand anders — en je dus geen
   waarschuwing krijgt over een botsing met jezelf. */
/** @returns {string} het (eventueel net aangemaakte) apparaat-id van dit apparaat */
function apparaatId() {
  try {
    var r = localStorage.getItem(APPARAAT_KEY);
    if (r) return r;
    var n = "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(APPARAAT_KEY, n);
    return n;
  } catch(e) { return "a0"; }
}

/* ── De aanmelding ───────────────────────────────────────────
   Supabase geeft je twee sleutels: een token dat een uur meegaat en
   waarmee je verzoeken doet, en een verversToken waarmee je een
   nieuw token haalt als het eerste verlopen is. Die tweede is de
   belangrijkste: zonder zou je elk uur opnieuw je wachtwoord moeten
   intypen, en dat doet niemand langs de lijn. */
/** @typedef {Object} Sessie
 * @property {string} token          het huidige toegangstoken (een uur geldig)
 * @property {string|null} verversToken  waarmee een nieuw token gehaald wordt
 * @property {number} verlooptOp     tijdstip (ms sinds epoch) waarop token verloopt
 * @property {string|null} gebruikerId
 * @property {string|null} email
 */

/** @type {((s: Sessie|null) => void)[]} functies die willen weten als de sessie verandert */
var _sessieLuisteraars = [];
/** @returns {Sessie|null} de bewaarde sessie, of null als die er niet (geldig) is */
function _leesSessie() {
  try {
    var r = localStorage.getItem(SESSIE_KEY);
    var o = r ? JSON.parse(r) : null;
    return (o && o.token) ? o : null;
  } catch(e) { return null; }
}
/** @type {Sessie|null} */
var _sessie = _leesSessie();
/** @returns {Sessie|null} */
function sessieNu() { return _sessie; }
/** @returns {boolean} */
function ingelogd() { return !!(_sessie && _sessie.token); }
/** @returns {{id:string|null, email:string|null}|null} de ingelogde gebruiker, of null */
function gebruikerNu() { return _sessie ? {id: _sessie.gebruikerId, email: _sessie.email} : null; }
/**
 * @param {Sessie|null} [s]  de nieuwe sessie, of niets/null om uit te loggen
 * @returns {Sessie|null} de zojuist gezette sessie
 */
function zetSessie(s) {
  _sessie = s || null;
  try {
    if (_sessie) localStorage.setItem(SESSIE_KEY, JSON.stringify(_sessie));
    else localStorage.removeItem(SESSIE_KEY);
  } catch(e) {}
  _sessieLuisteraars.slice().forEach(function (f) { f(_sessie); });
  return _sessie;
}
/* Wat er uit een aanmelding komt, omgezet naar wat wij bewaren.
   Supabase geeft de geldigheid als aantal seconden; wij rekenen dat
   meteen om naar een tijdstip, want een aantal seconden is over vijf
   minuten iets anders waard. */
/**
 * @param {any} antwoord  het rauwe antwoord van Supabase Auth
 * @returns {Sessie|null} de sessie zoals wij die bewaren, of null als
 *   het antwoord geen bruikbaar token bevatte
 */
function sessieUit(antwoord) {
  if (!antwoord || !antwoord.access_token) return null;
  var seconden = Number(antwoord.expires_in);
  if (!isFinite(seconden) || seconden <= 0) seconden = 3600;
  return {
    token: antwoord.access_token,
    verversToken: antwoord.refresh_token || null,
    verlooptOp: Date.now() + seconden * 1000,
    gebruikerId: (antwoord.user && antwoord.user.id) || null,
    email: (antwoord.user && antwoord.user.email) || null
  };
}
/* Een token dat over een minuut verloopt is voor een verzoek dat nu
   vertrekt al te oud: onderweg kan het aflopen. Daarom nemen we een
   marge. */
const TOKEN_MARGE_MS = 60 * 1000;
/**
 * @param {Sessie|null} [s]
 * @param {number} [nu]  tijdstip om tegen te toetsen; standaard nu
 * @returns {boolean} is dit token (bijna) verlopen?
 */
function tokenVerlopen(s, nu) {
  if (!s || !s.verlooptOp) return true;
  return (nu || Date.now()) + TOKEN_MARGE_MS >= s.verlooptOp;
}

/* ── Praten met de server ────────────────────────────────────
   Eén deur. Alle verzoeken gaan hierlangs, zodat het verversen van
   een verlopen token op precies één plek staat en niet op twintig.

   Alles komt terug als {ok, gegevens, fout} in plaats van dat er iets
   wordt opgeworpen. Een app die langs de lijn zijn bereik verliest
   moet gewoon doorwerken, niet omvallen. */
/** @typedef {Object} ServerFout
 * @property {string} soort
 * @property {string} tekst
 */
/** @typedef {Object} ServerUitkomst
 *   wat elke functie die met de server praat teruggeeft — nooit een
 *   opgeworpen fout, altijd dit vaste vormpje (zie de kop hierboven).
 *   Geen strikte {ok:true}/{ok:false}-koppeling: op praktisch elke
 *   plek wordt ok als boolean doorgegeven (bijv. `r.ok`) in plaats van
 *   een letterlijke true/false, dus een striktere union zou hier
 *   overal een vals "Type 'boolean' is not assignable to type 'true'"
 *   opleveren zonder dat de code onduidelijker is.
 * @property {boolean} ok
 * @property {any} [gegevens]
 * @property {ServerFout} [fout]
 */
/** @typedef {Object} HttpAntwoord
 * @property {number} status
 * @property {boolean} ok
 * @property {any} gegevens
 */

/** @param {string} pad  bijv. "/rest/v1/leden" @returns {string} */
function serverAdres(pad) { return _server.url + pad; }
/**
 * @param {string} [token]   toegangstoken; standaard de publieke sleutel
 * @param {Object<string,string>} [extra]  extra of overschrijvende koppen
 * @returns {Object<string,string>}
 */
function serverKoppen(token, extra) {
  var k = Object.assign({
    "apikey": _server.sleutel,
    "Content-Type": "application/json"
  }, extra || {});
  /* Ook zonder aanmelding gaat er een Authorization-kop mee, met de
     publieke sleutel erin. Dat is wat de officiële Supabase-bibliotheek
     ook doet, en sommige onderdelen van de server verwachten die kop
     altijd. Het scheelt een foutmelding die nergens op slaat.

     Dit werkt met allebei de soorten sleutels die Supabase uitgeeft:
     de nieuwe die met sb_publishable begint, en de oudere anon-sleutel
     die met eyJ begint. */
  k["Authorization"] = "Bearer " + (token || _server.sleutel);
  return k;
}
/** @param {string} soort @param {string} tekst @returns {ServerUitkomst} */
function serverFout(soort, tekst) { return {ok:false, fout:{soort:soort, tekst:tekst}}; }

/* Wat er misging, in gewone taal, maar zonder de oorzaak weg te
   poetsen. "Geen verbinding" is een prima melding als er echt geen
   bereik is, maar een slechte als er iets anders aan de hand is: dan
   zoek je een uur in de verkeerde richting. */
/** @param {any} e @returns {ServerUitkomst} */
function verbindingsFout(e) {
  var tekst = (e && (e.message || e.name)) || "onbekend";
  return {ok:false, fout:{soort:"verbinding",
    tekst: "De server was niet te bereiken (" + tekst + "). " +
           "Controleer je internetverbinding en het adres bij Account instellen."}};
}
/**
 * @param {string} pad
 * @param {{methode?:string, token?:string, koppen?:Object<string,string>, lichaam?:any}} [opties]
 * @returns {Promise<HttpAntwoord>}
 */
function _haalOp(pad, opties) {
  opties = opties || {};
  return fetch(serverAdres(pad), {
    method: opties.methode || "GET",
    headers: serverKoppen(opties.token, opties.koppen),
    body: opties.lichaam === undefined ? undefined : JSON.stringify(opties.lichaam)
  }).then(function (antwoord) {
    return antwoord.text().then(function (tekst) {
      var gegevens = null;
      if (tekst) { try { gegevens = JSON.parse(tekst); } catch(e) { gegevens = tekst; } }
      return {status: antwoord.status, ok: antwoord.ok, gegevens: gegevens};
    });
  });
}

/* Een nieuw token halen met het verversToken. Lukt dat niet, dan is
   de aanmelding echt voorbij en moet je opnieuw inloggen — dan is het
   eerlijker om dat te zeggen dan om het stil te blijven proberen. */
/** @returns {Promise<ServerUitkomst>} */
function verversAanmelding() {
  var s = _sessie;
  if (!s || !s.verversToken) return Promise.resolve(serverFout("aanmelding", "Je bent niet meer aangemeld."));
  return _haalOp("/auth/v1/token?grant_type=refresh_token",
                 {methode:"POST", lichaam:{refresh_token: s.verversToken}})
    .then(function (r) {
      var nieuw = r.ok ? sessieUit(r.gegevens) : null;
      if (!nieuw) { zetSessie(null); return serverFout("aanmelding", "Je aanmelding is verlopen. Log opnieuw in."); }
      zetSessie(nieuw);
      return {ok:true, gegevens:nieuw};
    })
    .catch(verbindingsFout);
}

/* Een verzoek namens jou. Is het token bijna op, dan wordt het eerst
   ververst; komt er ondanks dat een 401 terug, dan wordt het nog één
   keer geprobeerd. Eén keer, niet eindeloos: anders blijft een app
   met een ongeldig token in een kringetje draaien. */
/**
 * @param {string} pad
 * @param {{methode?:string, koppen?:Object<string,string>, lichaam?:any}} [opties]
 * @returns {Promise<ServerUitkomst>}
 */
function serverVraag(pad, opties) {
  opties = opties || {};
  if (!serverAan()) return Promise.resolve(serverFout("geen-server", "Er is nog geen server ingesteld."));
  if (!ingelogd()) return Promise.resolve(serverFout("aanmelding", "Je bent niet ingelogd."));
  /* ingelogd() hierboven betekent al dat _sessie niet leeg is, maar tsc
     volgt dat niet door een functie-aanroep heen. Een eigen, nooit-
     herschreven (const) naam mét een eigen if-controle geeft tsc wél
     houvast, ook binnen de geneste .then's verderop — in tegenstelling
     tot het gelijksoortige geval met "terugval" in sleutels.js, waar de
     variabele met var werd vastgelegd. Puur een naam erbij voor de
     typecontrole: deze tak wordt in de praktijk nooit genomen. */
  const sessie = _sessie;
  if (!sessie) return Promise.resolve(serverFout("aanmelding", "Je bent niet ingelogd."));

  /** @param {string} token @returns {Promise<HttpAntwoord>} */
  function doe(token) {
    return _haalOp(pad, Object.assign({}, opties, {token: token}));
  }
  var eerst = tokenVerlopen(sessie)
    ? verversAanmelding().then(function (r) { return r.ok ? sessie.token : null; })
    : Promise.resolve(sessie.token);

  return eerst.then(function (token) {
    if (!token) return serverFout("aanmelding", "Je aanmelding is verlopen. Log opnieuw in.");
    return doe(token).then(function (r) {
      if (r.status !== 401) return r.ok
        ? {ok:true, gegevens:r.gegevens}
        : serverFout("server", serverBoodschap(r));
      /* Nog één poging na verversen */
      return verversAanmelding().then(function (v) {
        if (!v.ok) return v;
        return doe(sessie.token).then(function (r2) {
          return r2.ok ? {ok:true, gegevens:r2.gegevens} : serverFout("server", serverBoodschap(r2));
        });
      });
    });
  }).catch(verbindingsFout);
}
/* De meldingen van Supabase zijn Engels en gaan over de database. Een
   trainer die om acht uur 's avonds op een parkeerplaats staat, heeft
   niets aan "Invalid login credentials". Daarom worden de meldingen die
   je in de praktijk tegenkomt hier vertaald naar wat er aan de hand is
   én wat je eraan kunt doen.

   Wat er niet in staat wordt doorgegeven zoals het is. Liever een
   Engelse zin die klopt dan een Nederlandse die gokt. */
/** @type {[RegExp, string][]} */
const SERVER_TAAL = [
  [/signups? not allowed|signup is disabled/i,
   "Er kunnen op dit moment geen nieuwe accounts worden aangemaakt."],
  [/invalid login credentials/i,
   "Dat e-mailadres en dat wachtwoord horen niet bij elkaar. Let op hoofdletters."],
  [/user already registered|already been registered/i,
   "Er bestaat al een account met dit e-mailadres. Log in plaats daarvan in."],
  [/password should be at least (\d+)/i,
   "Je wachtwoord moet minstens $1 tekens lang zijn."],
  [/email not confirmed/i,
   "Je hebt je e-mailadres nog niet bevestigd. Kijk in je mail — ook in de map ongewenst."],
  [/unable to validate email address|invalid format/i,
   "Dat lijkt geen geldig e-mailadres."],
  [/for security purposes.*?(\d+) seconds/i,
   "Even wachten: je mag dit pas over $1 seconden opnieuw proberen."],
  [/email rate limit exceeded|over_email_send_rate_limit/i,
   "Er zijn te veel mails verstuurd. Probeer het over een kwartier nog eens."],
  [/relation "public\.(\w+)" does not exist/i,
   "De tabel $1 bestaat nog niet. Draai 01-schema.sql in de SQL Editor van Supabase."],
  [/could not find the function/i,
   "De server mist een functie. Draai 01-schema.sql (en 03-beheer.sql) opnieuw."],
  [/jwt expired/i,
   "Je aanmelding is verlopen. Log opnieuw in."],
  [/invalid api key|no api key found/i,
   "De server weigert de sleutel van deze app. Controleer hem bij Project Settings, API Keys."],
  [/alleen voor beheerders/i,
   "Dit mag alleen een beheerder."],
  [/violates row-level security|permission denied/i,
   "Je hebt hier geen toegang toe. Hoor je bij de goede vereniging?"]
];
/** @param {string} tekst @returns {string} */
function vertaalServer(tekst) {
  if (!tekst) return tekst;
  for (var i = 0; i < SERVER_TAAL.length; i++) {
    var m = tekst.match(SERVER_TAAL[i][0]);
    if (m) {
      /* Een eigen, nooit-herschreven naam binnen dit blok: tsc volgt de
         "m is niet null"-controle hierboven niet vanzelf tot in de
         geneste .replace-functie, maar wél zodra de waarde in een eigen
         const staat (zelfde truc als bij "sessie" in serverVraag
         hierboven). Puur een naam erbij voor de typecontrole, geen
         gedragswijziging. */
      const gevonden = m;
      return SERVER_TAAL[i][1].replace(/\$(\d)/g, function (_, n) { return gevonden[Number(n)] || ""; });
    }
  }
  return tekst;
}
/* Wat de server terugzegt, in gewone taal. Supabase geeft zijn fouten
   in drie verschillende vormen terug, afhankelijk van welk onderdeel
   antwoordt. */
/** @param {HttpAntwoord} r @returns {string} */
function serverBoodschap(r) {
  var g = r && r.gegevens;
  if (!g) return "De server gaf een fout (" + (r && r.status) + ").";
  if (typeof g === "string") return vertaalServer(g);
  return vertaalServer(g.msg || g.message || g.error_description || g.error || g.hint) ||
         ("De server gaf een fout (" + r.status + ").");
}

/* ── In- en uitloggen ────────────────────────────────────────
   Het wachtwoord gaat één keer naar de server en wordt hier nergens
   bewaard: wat er op dit apparaat achterblijft zijn de twee tokens,
   en die zijn in te trekken. */
/** @param {string} email @param {string} wachtwoord @returns {Promise<ServerUitkomst>} */
function serverAanmelden(email, wachtwoord) {
  if (!serverAan()) return Promise.resolve(serverFout("geen-server", "Er is nog geen server ingesteld."));
  return _haalOp("/auth/v1/token?grant_type=password",
                 {methode:"POST", lichaam:{email:(email||"").trim(), password:wachtwoord||""}})
    .then(function (r) {
      var s = r.ok ? sessieUit(r.gegevens) : null;
      if (!s) return serverFout("aanmelding", serverBoodschap(r));
      zetSessie(s);
      return {ok:true, gegevens:s};
    })
    .catch(verbindingsFout);
}
/** @param {string} email @param {string} wachtwoord @returns {Promise<ServerUitkomst>} */
function serverRegistreren(email, wachtwoord) {
  if (!serverAan()) return Promise.resolve(serverFout("geen-server", "Er is nog geen server ingesteld."));
  return _haalOp("/auth/v1/signup",
                 {methode:"POST", lichaam:{email:(email||"").trim(), password:wachtwoord||""}})
    .then(function (r) {
      if (!r.ok) return serverFout("aanmelding", serverBoodschap(r));
      var s = sessieUit(r.gegevens);
      /* Staat bevestiging per e-mail aan, dan krijg je nog geen token
         terug. Dat is geen fout: je moet eerst je mail openen. */
      if (s) { zetSessie(s); return {ok:true, gegevens:s}; }
      return {ok:true, gegevens:null, bevestigen:true};
    })
    .catch(verbindingsFout);
}
/** @returns {Promise<{ok:boolean}>} */
function serverAfmelden() {
  var token = _sessie && _sessie.token;
  /* Eerst opruimen, dan pas de aanmelding weggooien. Andersom zou de
     app even in een toestand staan waarin hij niet is ingelogd maar
     nog wel gegevens toont. */
  wisAllesLokaal();
  herlaadInstellingen();
  zetSessie(null);
  if (!token || !serverAan()) return Promise.resolve({ok:true});
  return _haalOp("/auth/v1/logout", {methode:"POST", token:token})
    .then(function(){ return {ok:true}; })
    .catch(function(){ return {ok:true}; });
}
/* ── De verbinding doorlichten ───────────────────────────────
   Als het synchroniseren niet lukt zijn er zes plekken waar het mis
   kan gaan, en één melding die dat allemaal op één hoop gooit is
   nutteloos. Dit loopt de stappen los van elkaar af en zegt bij elke
   stap wat er gebeurde. Zo weet je of het aan het adres ligt, aan de
   sleutel, aan je aanmelding of aan de tabellen.

   Elke stap gaat door, ook als de vorige mislukte: één keer kijken
   levert dan het hele beeld op in plaats van alleen het eerste
   struikelpunt. ────────────────────────────────────────────────── */
/** @typedef {{wat:string, goed:boolean, tekst:string}} ServerTestRegel */
/** @returns {Promise<ServerTestRegel[]>} */
function serverTest() {
  /** @type {ServerTestRegel[]} */
  var uit = [];
  /** @param {string} wat @param {boolean} goed @param {string} [tekst] */
  function meld(wat, goed, tekst) { uit.push({wat:wat, goed:goed, tekst:tekst || ""}); }

  if (!serverAan()) {
    meld("Server ingesteld", false, "Er is nog geen adres en sleutel ingevuld.");
    return Promise.resolve(uit);
  }
  meld("Server ingesteld", true, _server.url);

  /* 1. Is het adres te bereiken, en accepteert hij de sleutel? */
  return _haalOp("/auth/v1/settings", {})
    .then(function (r) {
      if (r.status === 200) meld("Adres en sleutel", true, "De server antwoordt.");
      else if (r.status === 401) meld("Adres en sleutel", false,
        "De server is bereikbaar maar weigert de sleutel. Controleer of je de " +
        "publishable of anon-sleutel hebt gebruikt, en niet een secret key.");
      else meld("Adres en sleutel", false, "De server gaf " + r.status + ": " + serverBoodschap(r));
    })
    .catch(function (e) {
      meld("Adres en sleutel", false,
        "Het adres is niet te bereiken (" + ((e && e.message) || "?") + "). " +
        "Klopt het adres, en staat het project in Supabase niet gepauzeerd?");
    })
    /* 2. Ben je aangemeld? */
    .then(function () {
      if (!ingelogd()) { meld("Ingelogd", false, "Je bent niet ingelogd."); return null; }
      meld("Ingelogd", true, (gebruikerNu() || {}).email || "");
      return null;
    })
    /* 3. Mag je de tabellen lezen? Dit is de stap die het vaakst
          misgaat: dan is 01-schema.sql niet gedraaid. */
    .then(function () {
      if (!ingelogd()) return null;
      return serverVraag("/rest/v1/leden?select=club_id&limit=1").then(function (r) {
        if (r.ok) meld("Tabellen aanwezig", true,
          "De tabel leden is gelezen (" + (Array.isArray(r.gegevens) ? r.gegevens.length : 0) + " regels).");
        else meld("Tabellen aanwezig", false,
          (r.fout && r.fout.tekst) + " \u2014 heb je 01-schema.sql in de SQL Editor gedraaid?");
      });
    })
    /* 4. Bestaat de functie die een club aanmaakt?

          Hier wordt iets áángemaakt, en dat is bij een test altijd
          gevaarlijk. Daarom alleen als je nog nergens bij hoort: wie al
          een vereniging heeft krijgt van deze stap geen tweede. En de
          proefclub wordt niet alleen opgeruimd, er wordt ook gekeken of
          dat is gelukt — blijft hij staan, dan zou de app je er de
          volgende keer in kunnen zetten, en dat moet je dan weten. */
    .then(function () {
      if (!ingelogd()) return null;
      if (clubIdNu()) {
        meld("Club aanmaken", true, "Je hoort al bij een vereniging, dus niet geprobeerd.");
        return null;
      }
      return serverVraag("/rest/v1/rpc/nieuwe_club", {
        methode:"POST", lichaam:{club_naam:"Proef \u2014 mag weg", mijn_naam:null}
      }).then(function (r) {
        if (!r.ok) { meld("Club aanmaken", false, (r.fout && r.fout.tekst) || ""); return null; }
        var id = (typeof r.gegevens === "string") ? r.gegevens : null;
        if (!id) { meld("Club aanmaken", true, "De functie nieuwe_club werkt."); return null; }
        return serverVraag("/rest/v1/clubs?id=eq." + id, {methode:"DELETE"})
          .then(function (w) {
            if (w.ok) meld("Club aanmaken", true, "De functie nieuwe_club werkt.");
            else meld("Club aanmaken", false,
              "De proefvereniging is aangemaakt maar niet opgeruimd. Verwijder " +
              "\u201cProef \u2014 mag weg\u201d zelf in Supabase, anders komt de app " +
              "daar de volgende keer in terecht.");
            return null;
          });
      });
    })
    .then(function () { return uit; })
    .catch(function (e) {
      meld("Onverwacht", false, (e && e.message) || String(e));
      return uit;
    });
}

/** @returns {Sessie|null} de huidige sessie; laat het scherm herrenderen zodra die verandert */
function gebruikSessie() {
  const [waarde, zet] = useState(_sessie);
  useEffect(function () {
    /** @param {Sessie|null} n */
    function luister(n) { zet(n); }
    _sessieLuisteraars.push(luister);
    return function () {
      _sessieLuisteraars = _sessieLuisteraars.filter(function (f) { return f !== luister; });
    };
  }, []);
  return waarde;
}

