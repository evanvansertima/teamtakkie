// @ts-check
/* ══════════════════════════════════════════════════════════════
   KERN: opslag — laadJson, slaJson, back-up en terugzetten
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 16 september 2026 (P2,
   stap 4 van docs/professionaliseringsplan.md). Geen import/export:
   tools/bouw.js plakt dit bestand vóór de rest van de app aan elkaar
   (na rollen.js, vóór sync.js — zie KERN_VOLGORDE in tools/bouw.js),
   dus alles hieronder is nog altijd gewoon top-level function/const
   in dezelfde scope als src/app.jsx. Dit is een verhuizing, geen
   herschrijving: dezelfde tekst, dezelfde comments.

   Deze module hangt af van sleutels.js: laadJson en slaJson gebruiken
   sleutelVoor(), en de back-up gebruikt teams(). Vandaar dat opslag.js
   pas in stap 4 komt, ná sleutels.js in stap 1 — de vaste volgorde in
   tools/bouw.js zet sleutels.js al eerder neer, dus dat werkte al
   voordat dit bestand bestond.

   Twee fysiek gescheiden stukken uit src/app.jsx, hier weer bij
   elkaar gezet in dezelfde volgorde: eerst laadJson/slaJson (met
   stabiel/stempelLijst voor "is er echt iets veranderd" en
   meldOpslagVol voor een volle opslag), dan de back-up- en
   terugzetfuncties. Daartussenin stonden in app.jsx de losse laadX-
   accessors (laadSpelers, laadWedstrijden, laadTrainingen, enzovoort)
   — die blijven in app.jsx staan, ze horen bij hun eigen scherm en
   niet bij de opslaglaag zelf.

   laadJson/slaJson worden door tientallen functies door de hele app
   heen gebruikt, tot diep in het sportpark-scherm. Dat werkt onder de
   aaneenschakeling gewoon door: het zijn nog altijd gewone top-level
   functies in dezelfde scope, alleen nu uit een ander bestand.

   Bewuste terugverwijzingen naar src/app.jsx, geen vergeten stukken:
   zetBackupTerug() en importeerAlleData() roepen slaTenueOp(),
   zetInstellingen() en bewaarBoeteTarieven() aan, en meldOpslagVol()
   roept meldFout() aan — geen van die vier verhuist mee. Ze horen bij
   hun eigen scherm (tenue, instellingen, boetepot) of, bij meldFout,
   bij de meldingenlaag in app.jsx, en werken onder de
   aaneenschakeling gewoon door.
   ══════════════════════════════════════════════════════════════ */

/**
 * @param {string} key  een van de vaste opslagsleutels (bijv. SPELERS_KEY)
 * @returns {any} de opgeslagen waarde, of een lege array als er niets
 *   staat of de opslag onleesbaar is
 */
const laadJson = key => { try{ const r=localStorage.getItem(sleutelVoor(key)); return r?JSON.parse(r):[]; }catch{return[];} };
/* ── Wanneer is er echt iets veranderd? ──────────────────────
   Op 5 september 2026 ging hier een middag werk verloren. De tablet
   had de wedstrijd bijgehouden — wissels, doelpunten, minuten — en de
   laptop had alleen het scherm Wedstrijden opengehad. Dat scherm
   schrijft zijn lijst weg zodra het opent, ook als er niets is
   veranderd. Daarmee zei de laptop "bij mij is iets gewijzigd", won
   hij de botsing, en overschreef hij de wedstrijd met de lege versie
   van een uur eerder.

   Twee dingen gingen fout, en allebei worden ze hier rechtgezet.

   Ten eerste: wegschrijven is niet hetzelfde als wijzigen. Staat er
   al precies hetzelfde, dan gebeurt er niets — geen schrijfactie, geen
   melding, geen aanspraak op de winst bij een botsing.

   Ten tweede: bij een botsing moet niet winnen wie het hardst roept,
   maar wat het nieuwst is. Daarom krijgt elk record dat echt verandert
   een tijdstempel mee. Dan maakt het niet meer uit op welk apparaat je
   het eerst op synchroniseren drukt. ────────────────────────────── */
const STEMPEL = "_g";
/* Twee waarden vergelijken zonder je iets aan te trekken van de
   volgorde van de velden of van onze eigen tijdstempels. Dat laatste
   is het punt: een record dat alleen een nieuw stempel heeft, is
   inhoudelijk niet veranderd. */
/**
 * @param {any} w
 * @returns {string} een tekstweergave die onafhankelijk is van
 *   veldvolgorde en van het STEMPEL-veld — twee waarden zijn
 *   inhoudelijk gelijk als deze tekst gelijk is
 */
function stabiel(w) {
  if (w === null || typeof w !== "object") return JSON.stringify(w) || "null";
  if (Array.isArray(w)) return "[" + w.map(stabiel).join(",") + "]";
  var namen = Object.keys(w).filter(function (n) { return n !== STEMPEL; }).sort();
  return "{" + namen.map(function (n) {
    return JSON.stringify(n) + ":" + stabiel(w[n]);
  }).join(",") + "}";
}
/* Elk record dat is bijgekomen of veranderd krijgt de tijd van nu.
   Wat gelijk is gebleven houdt zijn oude stempel, zodat een lijst die
   je alleen maar opent niet in zijn geheel vers lijkt. */
/**
 * @param {any} nieuw  de nieuw te schrijven waarde
 * @param {any} oud    de vorige waarde (voor vergelijking op record-id)
 * @returns {any} nieuw, ongewijzigd als het geen array is, anders met
 *   bijgewerkte of behouden STEMPEL-velden per record
 */
function stempelLijst(nieuw, oud) {
  if (!Array.isArray(nieuw)) return nieuw;
  /** @type {Object<string, any>} */
  var was = {};
  (Array.isArray(oud) ? oud : []).forEach(function (r) {
    if (r && typeof r === "object" && r.id !== undefined && r.id !== null) was[r.id] = r;
  });
  var nu = new Date().toISOString();
  return nieuw.map(function (r) {
    if (!r || typeof r !== "object" || Array.isArray(r)) return r;
    if (r.id === undefined || r.id === null) return r;
    var v = was[r.id];
    if (v && stabiel(v) === stabiel(r)) {
      /* Ongewijzigd: het stempel van toen blijft staan */
      if (v[STEMPEL] === undefined) return r;
      if (r[STEMPEL] === v[STEMPEL]) return r;
      var zelfde = Object.assign({}, r);
      zelfde[STEMPEL] = v[STEMPEL];
      return zelfde;
    }
    var vers = Object.assign({}, r);
    vers[STEMPEL] = nu;
    return vers;
  });
}
/* Eén melding per keer dat de opslag vol zit, niet één per toetsaanslag.
   Wie tien velden invult zou anders tien identieke rode balken krijgen. */
var _volGemeld = 0;
/**
 * @param {string} volle    de volle (met team/seizoen voorvoegde) sleutel
 * @param {number} lengte   lengte van de tekst die niet paste
 * @returns {void}
 */
function meldOpslagVol(volle, lengte) {
  var nu = Date.now();
  if (nu - _volGemeld < 15000) return;
  _volGemeld = nu;
  var wat = (typeof terugNaam === "function") ? terugNaam(volle) : "gegevens";
  var tekst = "De opslag van deze browser zit vol — " + wat +
              " is niet bewaard. Meestal komt dat door foto\u2019s; " +
              "verwijder er een paar bij Selectie.";
  if (typeof meldFout === "function") meldFout(tekst);
  else if (typeof console !== "undefined") console.warn(tekst, volle, lengte);
}

/**
 * @param {string} key   een van de vaste opslagsleutels
 * @param {any} data     de te bewaren waarde
 * @returns {void}
 */
const slaJson  = (key,data) => {
  var volle = sleutelVoor(key);
  var eruit = data;
  var oudeTekst = null;
  try { oudeTekst = localStorage.getItem(volle); } catch(e) {}
  if (Array.isArray(data)) {
    var oud = null;
    if (oudeTekst) { try { oud = JSON.parse(oudeTekst); } catch(e) { oud = null; } }
    /* Precies hetzelfde? Dan is dit een scherm dat opent, geen
       gebruiker die iets doet. Niets schrijven, niets melden. */
    if (oud !== null && stabiel(oud) === stabiel(data)) return;
    eruit = stempelLijst(data, oud);
  }
  var tekst;
  try { tekst = JSON.stringify(eruit); } catch(e) { return; }
  if (tekst === oudeTekst) return;
  /* Lukt het schrijven niet, dan hoort dat op het scherm te komen.

     Hier stond een lege catch: de app deed alsof er niets aan de hand
     was en ging vrolijk verder. Dat is de gevaarlijkste soort stilte —
     je typt langs de lijn een wissel in, ziet geen melding, en de
     volgende dag staat er niets. Bijna altijd is de oorzaak een volle
     opslag, en bijna altijd komt dat door afbeeldingen. */
  try {
    localStorage.setItem(volle, tekst);
  } catch(e) {
    meldOpslagVol(volle, tekst.length);
    return;
  }
  /* Onthouden dat hier iets is veranderd. Dit is de enige plek waar
     de app iets wegschrijft, en dus de enige plek waar je zeker weet
     dat je geen wijziging mist. */
  if (typeof meldWijziging === "function") meldWijziging(volle);
};

/* ── BACK-UP: export & import van alle data ── */
/** @returns {string[]} alle losse (niet-team-specifieke) sleutels die in een back-up van de oude soort horen */
function alleDataKeys() {
  return [SPELERS_KEY,WEDSTRIJDEN_KEY,TRAININGEN_KEY,EVENTS_KEY,"fch_formaties_v1","fch_tactieken_v1","fch_stand_v1",OEFENINGEN_KEY,DOELEN_KEY,REVIEWS_KEY,SEIZOEN_KEY,TOERNOOIEN_KEY,TAKEN_KEY,ACTIVITEITEN_KEY,AFWEZIGHEDEN_KEY,BOETES_KEY,BETALINGEN_KEY,SPORTPARK_KEY,SPORTPARKEN_KEY,
    /* Zonder deze twee raak je bij het terugzetten je clubnaam, logo, thema en tenuekleuren kwijt */
    "fch_instellingen_v1","fch_tenue_v1"];
}
/* ── Alles, van al je teams ──────────────────────────────────
   Een back-up van alleen het team dat je toevallig open had staan is
   geen back-up. Daarom gaat hier alles mee: wat van jou is, en van
   elk team apart alles wat eronder staat.

   We nemen de tekst zoals die in de opslag staat, zonder hem te lezen
   of om te zetten. Dat is niet alleen eenvoudiger, het is ook
   veiliger: er kan niets sneuvelen op iets wat ik vandaag nog niet
   ken. Komt er ooit een sleutel bij, dan gaat die vanzelf mee. */
/**
 * @param {string} id  team-id
 * @returns {Object<string,string|null>} per sleutel (zonder team-voorvoegsel) de rauwe opgeslagen tekst
 */
function teamGegevens(id) {
  var voor = "tt_" + id + "__";
  /** @type {Object<string,string|null>} */
  var uit = {};
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(voor) === 0) uit[k.slice(voor.length)] = localStorage.getItem(k);
    }
  } catch(e) {}
  return uit;
}
/** @typedef {Object} Backup
 * @property {string} app
 * @property {number} versie
 * @property {string} geexporteerd  ISO-tijdstip van export
 * @property {Object<string,string>} gedeeld  jouw eigen (niet-team) sleutels, rauwe tekst
 * @property {{team:any, gegevens:Object<string,string|null>}[]} teams
 */
/** @returns {Backup} */
function maakBackup() {
  /** @type {Backup} */
  var data = { app:APP_NAAM, versie:3, geexporteerd:new Date().toISOString(),
               gedeeld:{}, teams:[] };
  GEDEELDE_SLEUTELS.forEach(function (k) {
    /* De teamlijst en welk team je open had gaan niet mee: die volgen
       uit de teams zelf, en het zou raar zijn als het terugzetten van
       een back-up je naar een ander team gooit. */
    if (k === TEAMS_KEY || k === ACTIEF_KEY) return;
    try {
      var r = localStorage.getItem(k);
      if (r !== null) data.gedeeld[k] = r;
    } catch(e) {}
  });
  teams().forEach(function (team) {
    data.teams.push({team: team, gegevens: teamGegevens(team.id)});
  });
  /* Heeft de verhuizing niet plaatsgevonden, dan staat alles nog los.
     Ook dan moet een back-up compleet zijn. */
  if (!data.teams.length) {
    /** @type {Object<string,string|null>} */
    var los = {};
    teamEigenSleutels().forEach(function (k) {
      try { los[k] = localStorage.getItem(k); } catch(e) {}
    });
    if (Object.keys(los).length)
      data.teams.push({team:{id:"los", naam: inst().teamNaam || "Mijn team"}, gegevens: los});
  }
  return data;
}
/** @returns {void} start een download van een volledige back-up als JSON-bestand */
function exporteerAlleData() {
  var data = maakBackup();
  var blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "teamtakkie-backup-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1500);
}
/**
 * @param {any} data  een back-up, van de nieuwe soort (Backup) of de oude
 *   soort (een los object met arrays onder de vaste sleutels)
 * @returns {number} het totaal aantal items erin
 */
function telBackupItems(data) {
  var n = 0;
  if (data && Array.isArray(data.teams)) {
    /* data is met opzet any (oude én nieuwe back-upsoort door elkaar):
       tsc kan de callback-parameter dan niet uit de aanroep afleiden
       (een methode-aanroep op any levert geen contextueel type op),
       vandaar de expliciete any hieronder. */
    data.teams.forEach(function (/** @type {any} */ t) {
      Object.keys(t.gegevens || {}).forEach(function (k) {
        try { var v = JSON.parse(t.gegevens[k]); if (Array.isArray(v)) n += v.length; } catch(e) {}
      });
    });
    return n;
  }
  alleDataKeys().forEach(function(k){ if(Array.isArray(data[k])) n += data[k].length; });
  return n;
}
/* Een back-up van de nieuwe soort terugzetten. Teams die in het
   bestand staan worden overschreven; teams die er niet in staan
   blijven ongemoeid. Anders zou het terugzetten van één team de rest
   van je seizoenen wissen. */
/** @param {Backup} data @returns {void} */
function zetBackupTerug(data) {
  Object.keys(data.gedeeld || {}).forEach(function (k) {
    try { localStorage.setItem(k, data.gedeeld[k]); } catch(e) {}
  });
  var lijst = teams().slice();
  (data.teams || []).forEach(function (bewaard) {
    var team = bewaard.team || {};
    /* Een team uit een back-up van vóór de teams heeft geen nummer;
       dat gaat naar het team dat nu open staat, of naar een nieuw. */
    var id = (team.id && team.id !== "los") ? team.id : (teamId() || nieuwTeamId());
    var voor = "tt_" + id + "__";
    /* Een bestand van vóór de seizoenen draagt geen seizoen in zijn
       sleutels. Zo'n back-up moet gewoon terug te zetten zijn — je hebt
       hem misschien vorige week gedownload en nooit meer aangeraakt.
       Wat er geen heeft, gaat naar het seizoen dat nu openstaat. */
    var terugSeizoen = seizoenNu(id) || seizoenVanDatum();
    Object.keys(bewaard.gegevens || {}).forEach(function (k) {
      /* heeftLaag en niet seizoenUitSleutel: een sleutel uit een
         geparkeerde laag draagt al een kop, ook al is dat geen seizoen.
         Die hoort niet nóg een keer voorzien te worden. */
      var sleutel = heeftLaag(k) ? k : (terugSeizoen + "::" + k);
      /* BEKEND, NIET OPGELOST — typenproef 18 september 2026 (P5): het
         Backup-typedef zegt hier terecht string|null (zo levert
         teamGegevens() het ook op), en localStorage.setItem() wil een
         string. In de praktijk levert een backupbestand hier altijd
         een string: een null zou alleen ontstaan als iemand het JSON-
         bestand met de hand bewerkt en er "null" in typt. Gebeurt dat
         toch, dan wordt de tekst "null" weggeschreven in plaats van de
         sleutel over te slaan — onschuldig maar niet fraai. Zelfde
         soort punt als bij sleutels.js; geen actie hier, al gemeld. */
      try { localStorage.setItem(voor + sleutel, bewaard.gegevens[k]); } catch(e) {}
    });
    if (!lijst.some(function (t) { return t.id === id; }))
      lijst = lijst.concat([Object.assign({}, team, {id: id})]);
  });
  slaTeamsOp(lijst);
}
/**
 * @param {File} bestand
 * @param {(fout: string|null, aantal?: number) => void} klaar
 * @returns {void}
 */
function importeerAlleData(bestand, klaar) {
  var lezer = new FileReader();
  lezer.onload = function(ev){
    try {
      /* BEKEND, NIET OPGELOST — typenproef 18 september 2026 (P5): de
         DOM-types laten ev.target en .result breder toe dan wat hier
         ooit gebeurt (readAsText geeft altijd een string terug op een
         niet-lege FileReader). Gaat het toch mis, dan gooit JSON.parse
         of de toegang op een niet-bestaand target een fout, en die
         wordt hieronder al opgevangen door de catch — dus onschadelijk,
         geen actie hier. */
      var data = JSON.parse(ev.target.result);
      /* De nieuwe soort: alles van al je teams */
      if (data && Array.isArray(data.teams)) {
        zetBackupTerug(data);
        klaar(null, telBackupItems(data));
        return;
      }
      /* De oude soort, van vóór de teams: die gaat naar het team dat
         je nu open hebt staan. Zo blijft een back-up van vorige week
         gewoon bruikbaar. */
      var gevonden = alleDataKeys().filter(function(k){ return Array.isArray(data[k]); });
      if (gevonden.length===0) { klaar("Dit lijkt geen geldig back-upbestand."); return; }
      gevonden.forEach(function(k){ slaJson(k, data[k]); });
      if (data[TENUE_KEY] && typeof data[TENUE_KEY]==="object") slaTenueOp(data[TENUE_KEY]);
      if (data[INSTELLINGEN_KEY] && typeof data[INSTELLINGEN_KEY]==="object") zetInstellingen(data[INSTELLINGEN_KEY]);
      if (data[BOETETARIEF_KEY] && typeof data[BOETETARIEF_KEY]==="object") bewaarBoeteTarieven(data[BOETETARIEF_KEY]);
      klaar(null, telBackupItems(data));
    } catch(err) { klaar("Bestand kon niet gelezen worden."); }
  };
  lezer.onerror = function(){ klaar("Bestand kon niet gelezen worden."); };
  lezer.readAsText(bestand);
}

