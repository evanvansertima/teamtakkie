// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: opkomst en aanwezigheid
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P3,
   stap 4 van docs/professionaliseringsplan.md — de laatste van de
   vier veilige stappen uit die planning). Geen import/export:
   tools/bouw.js plakt dit bestand vóór src/app.jsx aan elkaar (ná
   src/domein/statistieken.js, zie DOMEIN_VOLGORDE in tools/bouw.js),
   dus alles hieronder is nog altijd gewoon top-level function/const
   in dezelfde scope als src/app.jsx. Er verandert dus functioneel
   niets — dit is een verhuizing, geen herschrijving.

   LET OP — dit bestand bevat NIET alle manieren waarop de app
   opkomst berekent. Er zijn er vandaag vijf, en ze zijn het NIET met
   elkaar eens; dat wordt pas in een latere, aparte stap opgelost:
     1. opkomstVan (hier) — kijkt alleen naar trainingen en sluit een
        niet-meetellende afwezigheidsperiode uit van teller én noemer
        (een training zonder ingevulde presentielijst levert null op,
        telt dus nergens in mee).
     2. presentieTabel (hier) — kijkt over trainingen, wedstrijden én
        activiteiten heen, niet alleen trainingen.
     3. trainPct, inline in IndividuStatistieken in src/app.jsx zelf —
        telt een training zonder ingevulde presentielijst gewoon mee
        in de noemer (trainingen.length), waar opkomstVan zo'n
        training juist negeert.
     4. de inline opkomstberekening in spelerInzichten, sinds stap 3
        in src/domein/statistieken.js.
     5. het inline opkomst-blokje in het Dashboard in src/app.jsx.
   tests/opkomst.test.js legt deze verschillen vast, juist omdat ze
   de aanleiding zijn voor een latere samenvoeging — zonder vastlegging
   van het huidige (inconsistente) gedrag valt niet te bewijzen of die
   samenvoeging het gedrag verandert of niet.

   Dit bestand roept vandaagISO() aan (in afwezigheidFase en
   afwezigheidResterend), dat in src/app.jsx blijft staan omdat het
   daar ook buiten dit domein gebruikt wordt (agenda, verjaardagen).
   Werkt ondanks de plakvolgorde om dezelfde reden als bij
   boetepot.js en huidigSeizoen(): function-declaraties in dezelfde
   scope worden pas bij aanroep opgezocht, niet bij het inladen — en
   tegen de tijd dat deze functies daadwerkelijk draaien, is heel
   app.jsx al geparst.

   Wat hier NIET staat, met opzet:
     - vandaagISO blijft in src/app.jsx (zie hierboven).
     - OPGAVE_KEUZES blijft in src/app.jsx: een andere lijst, voor wat
       een speler vóór een wedstrijd opgeeft, niet voor aanwezigheid
       achteraf — lijkt op AANWEZIG_KEUZES maar is een ander domein.
     - Het inline opkomst-blokje in Dashboard, de inline opkomst-
       berekening in spelerInzichten (nu in statistieken.js), en
       trainPct in IndividuStatistieken blijven waar ze al stonden —
       dat zijn de andere vier varianten hierboven. Dit is een pure
       verplaatsing van opkomstVan en presentieTabel, geen
       samenvoeging van de vijf.
═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   PRESENTIE OVER ALLE SOORTEN
   Trainingen en activiteiten houden hun eigen lijst bij.
   Bij wedstrijden leiden we het af uit de opstelling: wie in de
   basis stond of op de bank zat was er, wie op afwezig staat niet.
   Zo hoef je het niet twee keer bij te houden.
═══════════════════════════════════════════════════════════ */
/* Competitie, beker, oefen en toernooi zijn geen eigen soort
   gebeurtenis maar een uitsnede van de wedstrijden (verzoek van Evan,
   14 oktober 2026): "wedSoort" zegt welke WEDSTRIJD_SOORTEN.id erbij
   hoort. Zo blijft een gebeurtenis altijd één van drie soorten, en
   kleurt de streep boven een kolom nog steeds als wedstrijd. */
const PRESENTIE_SOORTEN = [
  {id:"alles",        label:"Alles",        icoon:"fa-solid fa-layer-group"},
  {id:"training",     label:"Trainingen",   icoon:"fa-solid fa-person-running", kleur:"var(--blauw-licht)"},
  {id:"wedstrijd",    label:"Wedstrijden",  icoon:"fa-solid fa-futbol",         kleur:"var(--blauw)"},
  {id:"competitie",   label:"Competitie",   icoon:"fa-solid fa-trophy",         kleur:"var(--blauw)", wedSoort:"competitie"},
  {id:"beker",        label:"Beker",        icoon:"fa-solid fa-award",          kleur:"var(--blauw)", wedSoort:"beker"},
  {id:"oefen",        label:"Oefen",        icoon:"fa-solid fa-dumbbell",       kleur:"var(--blauw)", wedSoort:"oefen"},
  {id:"toernooi",     label:"Toernooi",     icoon:"fa-solid fa-medal",          kleur:"var(--blauw)", wedSoort:"toernooi"},
  {id:"activiteit",   label:"Activiteiten", icoon:"fa-solid fa-calendar-day",   kleur:"#8b5cf6"}
];
/**
 * @param {string} id
 * @returns {{id:string,label:string,icoon:string,kleur?:string,wedSoort?:string}}
 */
function presentieSoortInfo(id) {
  return PRESENTIE_SOORTEN.filter(function(s){ return s.id===id; })[0] || PRESENTIE_SOORTEN[0];
}
/**
 * Hoort deze gebeurtenis bij het gekozen filter?
 * @param {{soort:string, wedSoort?:string}} g
 * @param {string} filterId
 * @returns {boolean}
 */
function presentiePast(g, filterId) {
  if (!filterId || filterId==="alles") return true;
  var f = presentieSoortInfo(filterId);
  if (f.wedSoort) return g.soort==="wedstrijd" && g.wedSoort===f.wedSoort;
  return g.soort===filterId;
}
/**
 * Ligt deze datum ná vandaag? Wat nog moet gebeuren telt niet mee in
 * de opkomst: een training van volgende week waar iedereen nog op
 * "aanwezig" staat, zou het cijfer anders mooier maken dan het is.
 * Vandaag zelf telt wel: de training van vanavond vul je vanavond in.
 * @param {string} datum
 * @param {Date} [nu]
 * @returns {boolean}
 */
function nogNietGeweest(datum, nu) {
  /* Zelf ontleed in plaats van parseerDatum: die staat in app.jsx en
     dit bestand moet ook los te testen zijn. */
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(datum||""));
  if (!m) return false;
  var d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  var v = nu ? new Date(nu.getTime()) : new Date();
  v.setHours(0,0,0,0);
  return d.getTime() > v.getTime();
}

/**
 * Van een wedstrijdopstelling naar dezelfde vorm als een presentielijst
 * @param {Wedstrijd} wedstrijd
 * @returns {{spelerId:any, naam:string, status:"afwezig"|"aanwezig"}[]}
 */
function presentieUitOpstelling(wedstrijd) {
  return (wedstrijd.opstelling||[]).map(function(r){
    var st = (r.spelStatus||"basis");
    return {
      spelerId: r.spelerId,
      naam: r.naam,
      status: st==="afwezig" ? "afwezig" : "aanwezig"
    };
  });
}

/**
 * De presentie van één gespeelde wedstrijd. Wat de trainer bij
 * Aanwezigheid invulde wint; wie daar open bleef, komt uit de
 * opstelling (basis of bank = aanwezig). Voorheen was het of-of: één
 * ingevulde naam en de hele opstelling deed niet meer mee.
 * @param {Wedstrijd} wedstrijd
 * @returns {any[]}
 */
function presentieVanWedstrijd(wedstrijd) {
  var eigen = (wedstrijd.aanwezigheid||[]).filter(function(a){ return a && a.status && a.status!=="open"; });
  var rest = presentieUitOpstelling(wedstrijd).filter(function(r){
    return !eigen.some(function(a){ return String(a.spelerId)===String(r.spelerId); });
  });
  return eigen.concat(rest);
}

/** @typedef {Object} PresentieGebeurtenis  één training, wedstrijd of
 * activiteit met een presentielijst — de kolom in presentieTabel()
 * @property {string} id
 * @property {"training"|"wedstrijd"|"activiteit"} soort
 * @property {string} [wedSoort]  alleen bij wedstrijd: competitie, beker, oefen of toernooi
 * @property {string} datum
 * @property {string} titel
 * @property {string} sub
 * @property {any[]} lijst      de presentielijst zelf
 * @property {boolean} [afgeleid]  alleen bij wedstrijd: kwam de lijst uit de opstelling in plaats van een eigen presentielijst?
 */
/**
 * Alle gebeurtenissen met een presentielijst, op datum
 * @param {Wedstrijd[]} wedstrijden
 * @param {any[]} [trainingen]
 * @param {any[]} [activiteiten]
 * @param {Date} [nu]  alleen voor de tests; standaard vandaag
 * @returns {PresentieGebeurtenis[]}
 */
function presentieGebeurtenissen(wedstrijden, trainingen, activiteiten, nu) {
  /** @type {PresentieGebeurtenis[]} */
  var uit = [];
  (trainingen||[]).forEach(function(t){
    if (!(t.aanwezigheid||[]).length || nogNietGeweest(t.datum, nu)) return;
    uit.push({id:"t"+t.id, soort:"training", datum:t.datum,
              titel:trainingTitel(t), sub:t.locatie||"",
              lijst:t.aanwezigheid});
  });
  (wedstrijden||[]).forEach(function(w){
    if (w.status!=="gespeeld") return;
    var lijst = presentieVanWedstrijd(w);
    if (!lijst.length) return;
    uit.push({id:"w"+w.id, soort:"wedstrijd", wedSoort:wedstrijdSoort(w).id, datum:w.datum,
              titel:"vs. "+(w.tegenstander||"tegenstander"),
              sub:(w.thuis?"Thuis":"Uit"), lijst:lijst, afgeleid:!(w.aanwezigheid||[]).length});
  });
  (activiteiten||[]).forEach(function(a){
    if (!(a.aanwezigheid||[]).length || nogNietGeweest(a.datum, nu)) return;
    uit.push({id:"a"+a.id, soort:"activiteit", datum:a.datum,
              titel:a.titel, sub:activiteitSoort(a.soort).label,
              lijst:a.aanwezigheid});
  });
  return uit.sort(function(x,y){ return new Date(x.datum).getTime() - new Date(y.datum).getTime(); });
}

/** @typedef {Object} PresentieRij
 * @property {any} speler
 * @property {any[]} cellen
 * @property {number} aanw       aantal keer meegeteld als aanwezig
 * @property {number} meegedaan  aantal cellen dat meetelt
 * @property {number} buiten     aantal cellen dat niet meetelt (blessure e.d.)
 * @property {number|null} pct
 * @property {boolean} [weinigBasis]  gezet ná het sorteren: te weinig cellen voor een eerlijk percentage
 */
/** @typedef {Object} PresentieTabel
 * @property {PresentieRij[]} rijen
 * @property {{aanwezig:number, totaal:number, pct:number|null}[]} perKolom
 * @property {number} buiten
 * @property {number|null} gemiddelde
 */
/**
 * Bouwt de kruistabel: spelers als rijen, gebeurtenissen als kolommen.
 * Een lopende afwezigheidsperiode vult de cel in waar niets is
 * ingevuld. Stond de speler er wél (aanwezig of te laat), dan wint
 * wat jij hebt aangevinkt — hij was er tenslotte gewoon.
 * @param {any[]} spelers
 * @param {PresentieGebeurtenis[]} gebeurtenissen
 * @param {any[]} [afwezigheden]
 * @returns {PresentieTabel}
 */
function presentieTabel(spelers, gebeurtenissen, afwezigheden) {
  /** @type {PresentieRij[]} */
  var rijen = sorteerOpLinie((spelers||[]).slice()).map(function(s){
    var cellen = gebeurtenissen.map(function(g){
      var r = g.lijst.filter(function(a){ return a.spelerId===s.id; })[0];
      var hand = r ? aanwezigInfo(r.status) : null;
      if (hand && hand.telt) return Object.assign({}, hand, {meetelt:true, periode:null});
      var per = afwezigheidOp(afwezigheden, s.id, g.datum);
      if (per) {
        return Object.assign({}, afwezigheidSoort(per.soort),
          {telt:false, periode:per, meetelt:afwezigheidTeltMee(per)});
      }
      return hand ? Object.assign({}, hand, {meetelt:true, periode:null}) : null;
    });
    var mee    = cellen.filter(function(c){ return c && c.meetelt; }).length;
    var aanw   = cellen.filter(function(c){ return c && c.telt; }).length;
    var buiten = cellen.filter(function(c){ return c && !c.meetelt; }).length;
    return {speler:s, cellen:cellen, aanw:aanw, meegedaan:mee, buiten:buiten,
            pct: mee ? Math.round(aanw/mee*100) : null};
  }).filter(function(r){ return r.meegedaan>0 || r.buiten>0; });

  /* Wie het grootste deel van de periode geblesseerd was, heeft
     misschien 100% uit één training. Dat is waar, maar het is geen
     eerlijke vergelijking met iemand die er vijf van de zes was.
     Zulke rijen krijgen hun percentage gewoon te zien, maar zakken
     naar onderen zodat de ranglijst bovenin blijft kloppen. */
  var maxMee = rijen.reduce(function(m,r){ return Math.max(m, r.meegedaan); }, 0);
  var drempel = Math.max(2, Math.ceil(maxMee/2));
  rijen.forEach(function(r){ r.weinigBasis = r.meegedaan < drempel; });

  rijen.sort(function(a,b){
    if (a.weinigBasis !== b.weinigBasis) return a.weinigBasis ? 1 : -1;
    /* Zonder percentage valt er niets te rangschikken: onderaan. */
    var pa = a.pct===null ? -1 : a.pct, pb = b.pct===null ? -1 : b.pct;
    if (pb !== pa) return pb - pa;
    return b.meegedaan - a.meegedaan;
  });

  /* Opkomst per gebeurtenis, voor de onderste rij. Uit de cellen
     gerekend en niet uit de ruwe lijst, zodat de periodes hier
     precies zo meetellen als in de rijen erboven. */
  var perKolom = gebeurtenissen.map(function(g, i){
    var aanw = 0, tot = 0;
    rijen.forEach(function(r){
      var c = r.cellen[i];
      if (!c || !c.meetelt) return;
      tot++; if (c.telt) aanw++;
    });
    return {aanwezig:aanw, totaal:tot, pct: tot ? Math.round(aanw/tot*100) : null};
  });

  var totaalAanw   = rijen.reduce(function(s,r){ return s+r.aanw; }, 0);
  var totaalMee    = rijen.reduce(function(s,r){ return s+r.meegedaan; }, 0);
  var totaalBuiten = rijen.reduce(function(s,r){ return s+r.buiten; }, 0);

  return {rijen:rijen, perKolom:perKolom, buiten:totaalBuiten,
          gemiddelde: totaalMee ? Math.round(totaalAanw/totaalMee*100) : null};
}

/* De id's van de drie oorspronkelijke statussen blijven staan, anders
   raken bestaande trainingen hun aanwezigheid kwijt. "afwezig" betekent
   voortaan afgemeld; wie zich niet meldde krijgt "geenbericht". */
const AANWEZIG_KEUZES = [
  {id:"aanwezig",    label:"Aanwezig",         letter:"P",  kort:"Aanw.",   telt:true,
   kleur:"#16a34a", op:"#0b2f16", vlak:"#dcfce7", icoon:"fa-solid fa-check", snel:true},
  {id:"telaat",      label:"Te laat",          letter:"TL", kort:"Te laat", telt:true,
   kleur:"#84cc16", op:"#1f3007", vlak:"#ecfccb", icoon:"fa-solid fa-clock"},
  {id:"afwezig",     label:"Afgemeld",         letter:"A+", kort:"Afgem.",
   kleur:"#e08a0b", op:"#3d2402", vlak:"#fef3c7", icoon:"fa-solid fa-comment-dots"},
  {id:"geenbericht", label:"Niet afgemeld",    letter:"A−", kort:"Geen ber.",
   kleur:"#991b1b", op:"#ffffff", vlak:"#fee2e2", icoon:"fa-solid fa-xmark"},
  {id:"ziek",        label:"Ziek",             letter:"Z",  kort:"Ziek",
   kleur:"#eab308", op:"#3b2c05", vlak:"#fef9c3", icoon:"fa-solid fa-head-side-cough"},
  {id:"geblesseerd", label:"Blessure",         letter:"B",  kort:"Blessu.",
   kleur:"#6b7280", op:"#ffffff", vlak:"#f1f3f5", icoon:"fa-solid fa-hospital-symbol"},
  {id:"werk",        label:"Werk",             letter:"W",  kort:"Werk",
   kleur:"#2563eb", op:"#ffffff", vlak:"#dbeafe", icoon:"fa-solid fa-briefcase"},
  /* telt:true — zie de uitleg bij OPGAVE_KEUZES. Wie voor een ander
     elftal van de club speelt of traint, is niet afwezig. */
  {id:"uitgeleend",  label:"Uitgeleend",       letter:"U",  kort:"Uitgel.", telt:true,
   kleur:"#7c3aed", op:"#ffffff", vlak:"#f3e8ff", icoon:"fa-solid fa-right-left"}
];
/**
 * @param {string} id
 * @returns {{id:string,label:string,letter:string,kort:string,telt?:boolean,kleur:string,op:string,vlak:string,icoon:string,snel?:boolean}}
 */
function aanwezigInfo(id) {
  return AANWEZIG_KEUZES.filter(function(k){ return k.id===id; })[0] || AANWEZIG_KEUZES[0];
}
/**
 * Te laat komen telt gewoon als aanwezig voor de opkomst
 * @param {string} status
 * @returns {boolean}
 */
function teltAlsAanwezig(status) {
  var k = AANWEZIG_KEUZES.filter(function(x){ return x.id===status; })[0];
  return !!(k && k.telt);
}
/* ═══════════════════════════════════════════════════════════
   AANWEZIGHEID INVULLEN — training, wedstrijd en activiteit
   Besluit van Evan (14 oktober 2026): niet meer "wie komt er?" met
   ja/misschien/nee vooraf, en apart een presentielijst achteraf, maar
   één lijst Aanwezigheid met de acht statussen hierboven — bij een
   training, een wedstrijd én een activiteit. Wie nog niets heeft,
   staat op "open": dat telt nergens mee, ook niet als afwezig.

   Wat er al was ingevuld bij de oude opgave gaat niet verloren: ja
   wordt aanwezig, nee wordt afgemeld, uitgeleend blijft uitgeleend.
   Misschien en onbekend worden open — dat waren geen antwoorden.
═══════════════════════════════════════════════════════════ */
const AANWEZIG_OPEN = {id:"open", label:"Nog niet ingevuld", letter:"?", kort:"Open",
  kleur:null, op:"#ffffff", vlak:null, icoon:"fa-regular fa-circle"};
/**
 * @param {string} status  ja, misschien, nee, uitgeleend of onbekend
 * @returns {string|null}
 */
function opgaveAlsAanwezig(status) {
  if (status==="ja") return "aanwezig";
  if (status==="nee") return "afwezig";
  if (status==="uitgeleend") return "uitgeleend";
  return null;
}
/**
 * De status per speler, zoals het scherm hem laat zien. Volgorde:
 * wat bij Aanwezigheid staat, dan wat `terugval` zegt (bij een
 * gespeelde wedstrijd: de opstelling), dan de oude opgave, dan open.
 * @param {{aanwezigheid?:any[], opgave?:any[]}} item
 * @param {{id:any}[]} spelers
 * @param {(spelerId:any)=>string|null} [terugval]
 * @returns {Object<string,string>}
 */
function aanwezigheidStatussen(item, spelers, terugval) {
  /** @type {Object<string,string>} */
  var uit = {};
  var eigen = (item && item.aanwezigheid) || [];
  var opgave = (item && item.opgave) || [];
  (spelers||[]).forEach(function(s){
    var r = eigen.filter(function(a){ return String(a.spelerId)===String(s.id); })[0];
    if (r && r.status && r.status!=="open") { uit[s.id] = r.status; return; }
    var t = terugval ? terugval(s.id) : null;
    if (t) { uit[s.id] = t; return; }
    var o = opgave.filter(function(a){ return String(a.spelerId)===String(s.id); })[0];
    uit[s.id] = (o && opgaveAlsAanwezig(o.status)) || "open";
  });
  return uit;
}
/**
 * Zet één of meer spelers op een status en geeft de nieuwe lijst
 * terug. Alles wat het scherm liet zien wordt meteen vastgelegd, ook
 * wat uit de opgave of de opstelling kwam — anders verschuift het
 * beeld zodra de opstelling later verandert. "open" haalt de regel weg.
 * Spelers die niet (meer) in de selectie staan, houden hun regel.
 * @param {{aanwezigheid?:any[], opgave?:any[]}} item
 * @param {{id:any, naam?:string, foto?:any}[]} spelers
 * @param {any[]} ids
 * @param {string} status
 * @param {(spelerId:any)=>string|null} [terugval]
 * @returns {any[]}
 */
function zetAanwezigheid(item, spelers, ids, status, terugval) {
  var nu = aanwezigheidStatussen(item, spelers, terugval);
  var sleutels = (ids||[]).map(String);
  var binnen = (spelers||[]).map(function(s){ return String(s.id); });
  /** @type {any[]} */
  var lijst = [];
  (spelers||[]).forEach(function(s){
    var st = sleutels.indexOf(String(s.id))>=0 ? status : nu[s.id];
    if (!st || st==="open") return;
    /** @type {any} */
    var r = {spelerId:s.id, naam:s.naam||"", status:st};
    if (s.foto) r.foto = s.foto;
    lijst.push(r);
  });
  ((item && item.aanwezigheid) || []).forEach(function(a){
    if (binnen.indexOf(String(a.spelerId))<0) lijst.push(a);
  });
  return lijst;
}
/**
 * "Rest aanwezig": wie nog open staat krijgt deze status; wie al iets
 * heeft, houdt dat. Eerst twee afmeldingen aantikken en dan de rest
 * in één keer — zonder dat die twee weer op aanwezig springen.
 * @param {{aanwezigheid?:any[], opgave?:any[]}} item
 * @param {{id:any, naam?:string, foto?:any}[]} spelers
 * @param {string} status
 * @param {(spelerId:any)=>string|null} [terugval]
 * @returns {any[]}
 */
function vulOpenAan(item, spelers, status, terugval) {
  var nu = aanwezigheidStatussen(item, spelers, terugval);
  var open = (spelers||[]).filter(function(s){ return nu[s.id]==="open"; }).map(function(s){ return s.id; });
  return zetAanwezigheid(item, spelers, open, status, terugval);
}

/** @typedef {Object} Opkomst
 * @property {number} aanwezig
 * @property {number} totaal
 * @property {number} pct
 */
/**
 * De opkomst van één training. Wie in een periode zit die niet
 * meetelt (blessure, schorsing) valt uit teller én noemer, anders
 * drukt een revaliderende speler het cijfer van de hele avond.
 *
 * LET OP (P5, 18 september 2026): dit is de ene, centrale opkomst-
 * berekening sinds de opkomst-samenvoeging van 17-18 september — meerdere
 * schermen roepen 'm nu aan (zie de bestandskop hierboven). De logica
 * hieronder is met opzet ongewijzigd gelaten. `training` is met opzet
 * `any` getypeerd in plaats van een preciezer object: dat zou op de
 * `training.datum`-regel verderop een "mogelijk null/undefined"-melding
 * opleveren die alleen is op te lossen door de functie zelf aan te
 * passen (bijvoorbeeld een extra controle toevoegen) — en dat is nu
 * precies wat hier niet mag gebeuren.
 * @param {any} training
 * @param {any[]} [afwezigheden]
 * @returns {Opkomst|null}
 */
function opkomstVan(training, afwezigheden) {
  /** @type {any[]} */
  var lijst = (training && training.aanwezigheid) || [];
  if (!lijst.length) return null;
  /* Toegevoegd 14 oktober 2026: een training die nog moet komen telt
     niet mee. Raakt de rekenregel zelf niet, alleen welke trainingen
     erin gaan — zie nogNietGeweest. */
  if (nogNietGeweest(training.datum)) return null;
  var aanw = 0, tot = 0;
  lijst.forEach(function(a){
    var erbij = teltAlsAanwezig(a.status);
    if (!erbij) {
      var per = afwezigheidOp(afwezigheden, a.spelerId, training.datum);
      if (per && !afwezigheidTeltMee(per)) return;
    }
    tot++; if (erbij) aanw++;
  });
  if (!tot) return null;
  return {aanwezig: aanw, totaal: tot, pct: Math.round(aanw/tot*100)};
}

/* ═══════════════════════════════════════════════════════════
   LANGDURIGE AFWEZIGHEID
   Ligt een speler er drie maanden uit, dan wil je niet dertig
   keer met de hand "blessure" aanvinken. Je legt één periode
   vast en de presentielijst vult zichzelf.
═══════════════════════════════════════════════════════════ */

/* `noemer:false` betekent: hier kan de speler niets aan doen, dus
   deze dagen tellen niet mee in zijn opkomstpercentage. Zonder dat
   onderscheid zakt een jongen met een gescheurde kruisband naar
   20% en zegt dat cijfer voor het hele team niets meer. */
const AFWEZIGHEID_SOORTEN = [
  {id:"blessure",  label:"Blessure",       letter:"B",  noemer:false,
   icoon:"fa-solid fa-hospital-symbol",  kleur:"#6b7280", op:"#ffffff", vlak:"#f1f3f5"},
  {id:"ziekte",    label:"Langdurig ziek", letter:"Z",  noemer:false,
   icoon:"fa-solid fa-head-side-cough", kleur:"#a16207", op:"#ffffff", vlak:"#fef9c3"},
  {id:"schorsing", label:"Schorsing",      letter:"S",  noemer:false,
   icoon:"fa-solid fa-gavel",            kleur:"#7f1d1d", op:"#ffffff", vlak:"#fee2e2"},
  {id:"vakantie",  label:"Vakantie",       letter:"V",  noemer:true,
   icoon:"fa-solid fa-umbrella-beach",   kleur:"#b45309", op:"#ffffff", vlak:"#fef3c7"},
  {id:"werk",      label:"Werk",           letter:"W",  noemer:true,
   icoon:"fa-solid fa-briefcase",        kleur:"#2563eb", op:"#ffffff", vlak:"#dbeafe"},
  {id:"school",    label:"School of stage",letter:"St", noemer:true,
   icoon:"fa-solid fa-graduation-cap",   kleur:"#6d28d9", op:"#ffffff", vlak:"#ede9fe"},
  {id:"overig",    label:"Overig",         letter:"O",  noemer:true,
   icoon:"fa-solid fa-circle-info",      kleur:"#475569", op:"#ffffff", vlak:"#f1f5f9"}
];
/** @typedef {Object} Afwezigheid  een langdurige-afwezigheidsperiode
 * @property {any} id
 * @property {any} spelerId
 * @property {string} soort   een AFWEZIGHEID_SOORTEN.id
 * @property {string} vanaf   ISO-datum
 * @property {string} [tot]   ISO-datum; leeg/ontbrekend = tot nader bericht
 * @property {string} [reden]
 * @property {boolean|null} [teltMee]  overschrijft het standaardantwoord van de soort
 */
/** @type {Afwezigheid} */
const LEEG_AFWEZIGHEID = { id:null, spelerId:null, soort:"blessure", vanaf:"", tot:"", reden:"", teltMee:null };

/**
 * @param {string} [id]
 * @returns {{id:string,label:string,letter:string,noemer:boolean,icoon:string,kleur:string,op:string,vlak:string}}
 */
function afwezigheidSoort(id) {
  return AFWEZIGHEID_SOORTEN.filter(function(s){ return s.id===id; })[0] || AFWEZIGHEID_SOORTEN[0];
}
/**
 * De soort bepaalt het standaardantwoord, maar je kunt het per
 * periode omzetten: een geschorste speler kan wél trainen.
 * @param {Afwezigheid} [rec]
 * @returns {boolean}
 */
function afwezigheidTeltMee(rec) {
  if (rec && (rec.teltMee===true || rec.teltMee===false)) return rec.teltMee;
  return afwezigheidSoort(rec && rec.soort).noemer;
}
/**
 * Lege einddatum betekent "tot nader bericht": bij een verse
 * blessure weet je nog niet hoe lang het gaat duren.
 * @param {Afwezigheid|null|undefined} rec
 * @param {string} datum
 * @returns {boolean}
 */
function inAfwezigheid(rec, datum) {
  if (!rec) return false;
  var d = parseerDatum(datum);   if (!d) return false;
  var van = parseerDatum(rec.vanaf); if (!van) return false;
  var tot = rec.tot ? parseerDatum(rec.tot) : null;
  if (d < van) return false;
  if (tot && d > tot) return false;
  return true;
}
/**
 * Welke periode geldt voor deze speler op deze dag? Overlappen er
 * twee, dan wint degene die niet meetelt — de zwaarste reden.
 * @param {Afwezigheid[]|null|undefined} afwezigheden
 * @param {any} spelerId
 * @param {string} datum
 * @returns {Afwezigheid|null}
 */
function afwezigheidOp(afwezigheden, spelerId, datum) {
  var raak = (afwezigheden||[]).filter(function(r){
    return r.spelerId===spelerId && inAfwezigheid(r, datum);
  });
  if (!raak.length) return null;
  raak.sort(function(a,b){
    return (afwezigheidTeltMee(a)?1:0) - (afwezigheidTeltMee(b)?1:0);
  });
  return raak[0];
}
/**
 * loopt / komt nog / voorbij
 * @param {Afwezigheid} rec
 * @param {string} [vandaag]
 * @returns {"nu"|"komt"|"voorbij"}
 */
function afwezigheidFase(rec, vandaag) {
  var nu = vandaag || vandaagISO();
  if (inAfwezigheid(rec, nu)) return "nu";
  var van = parseerDatum(rec.vanaf), d = parseerDatum(nu);
  if (van && d && d < van) return "komt";
  return "voorbij";
}
/**
 * Hoeveel dagen duurt de periode? Null als er geen einddatum is.
 * @param {Afwezigheid} rec
 * @returns {number|null}
 */
function afwezigheidDagen(rec) {
  var van = parseerDatum(rec.vanaf), tot = rec.tot ? parseerDatum(rec.tot) : null;
  if (!van || !tot) return null;
  return Math.round((tot - van) / 86400000) + 1;
}
/**
 * Hoeveel dagen nog te gaan? Negatief bestaat niet, dan is het 0.
 * @param {Afwezigheid} rec
 * @param {string} [vandaag]
 * @returns {number|null}
 */
function afwezigheidResterend(rec, vandaag) {
  var tot = rec.tot ? parseerDatum(rec.tot) : null;
  if (!tot) return null;
  var d = parseerDatum(vandaag || vandaagISO());
  if (!d) return null;
  return Math.max(0, Math.round((tot - d) / 86400000));
}
/**
 * Netjes leesbaar: "13 jul. – 26 sep. 2026" of "vanaf 13 jul. 2026"
 * @param {Afwezigheid} [rec]
 * @returns {string}
 */
function afwezigheidPeriodeTekst(rec) {
  if (!rec || !rec.vanaf) return "";
  var van = formateerDatum(rec.vanaf);
  if (!rec.tot) return "vanaf " + van;
  return van + " – " + formateerDatum(rec.tot);
}
