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
const PRESENTIE_SOORTEN = [
  {id:"alles",        label:"Alles",        icoon:"fa-solid fa-layer-group"},
  {id:"training",     label:"Trainingen",   icoon:"fa-solid fa-person-running", kleur:"var(--blauw-licht)"},
  {id:"wedstrijd",    label:"Wedstrijden",  icoon:"fa-solid fa-futbol",         kleur:"var(--blauw)"},
  {id:"activiteit",   label:"Activiteiten", icoon:"fa-solid fa-calendar-day",   kleur:"#8b5cf6"}
];

/* Van een wedstrijdopstelling naar dezelfde vorm als een presentielijst */
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

/* Alle gebeurtenissen met een presentielijst, op datum */
function presentieGebeurtenissen(wedstrijden, trainingen, activiteiten) {
  var uit = [];
  (trainingen||[]).forEach(function(t){
    if (!(t.aanwezigheid||[]).length) return;
    uit.push({id:"t"+t.id, soort:"training", datum:t.datum,
              titel:trainingTitel(t), sub:t.locatie||"",
              lijst:t.aanwezigheid});
  });
  (wedstrijden||[]).forEach(function(w){
    if (w.status!=="gespeeld") return;
    var lijst = (w.aanwezigheid||[]).length ? w.aanwezigheid : presentieUitOpstelling(w);
    if (!lijst.length) return;
    uit.push({id:"w"+w.id, soort:"wedstrijd", datum:w.datum,
              titel:"vs. "+(w.tegenstander||"tegenstander"),
              sub:(w.thuis?"Thuis":"Uit"), lijst:lijst, afgeleid:!(w.aanwezigheid||[]).length});
  });
  (activiteiten||[]).forEach(function(a){
    if (!(a.aanwezigheid||[]).length) return;
    uit.push({id:"a"+a.id, soort:"activiteit", datum:a.datum,
              titel:a.titel, sub:activiteitSoort(a.soort).label,
              lijst:a.aanwezigheid});
  });
  return uit.sort(function(x,y){ return new Date(x.datum) - new Date(y.datum); });
}

/* Bouwt de kruistabel: spelers als rijen, gebeurtenissen als kolommen.
   Een lopende afwezigheidsperiode vult de cel in waar niets is
   ingevuld. Stond de speler er wél (aanwezig of te laat), dan wint
   wat jij hebt aangevinkt — hij was er tenslotte gewoon. */
function presentieTabel(spelers, gebeurtenissen, afwezigheden) {
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
function aanwezigInfo(id) {
  return AANWEZIG_KEUZES.filter(function(k){ return k.id===id; })[0] || AANWEZIG_KEUZES[0];
}
/* Te laat komen telt gewoon als aanwezig voor de opkomst */
function teltAlsAanwezig(status) {
  var k = AANWEZIG_KEUZES.filter(function(x){ return x.id===status; })[0];
  return !!(k && k.telt);
}
/* De opkomst van één training. Wie in een periode zit die niet
   meetelt (blessure, schorsing) valt uit teller én noemer, anders
   drukt een revaliderende speler het cijfer van de hele avond. */
function opkomstVan(training, afwezigheden) {
  var lijst = (training && training.aanwezigheid) || [];
  if (!lijst.length) return null;
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
const LEEG_AFWEZIGHEID = { id:null, spelerId:null, soort:"blessure", vanaf:"", tot:"", reden:"", teltMee:null };

function afwezigheidSoort(id) {
  return AFWEZIGHEID_SOORTEN.filter(function(s){ return s.id===id; })[0] || AFWEZIGHEID_SOORTEN[0];
}
/* De soort bepaalt het standaardantwoord, maar je kunt het per
   periode omzetten: een geschorste speler kan wél trainen. */
function afwezigheidTeltMee(rec) {
  if (rec && (rec.teltMee===true || rec.teltMee===false)) return rec.teltMee;
  return afwezigheidSoort(rec && rec.soort).noemer;
}
/* Lege einddatum betekent "tot nader bericht": bij een verse
   blessure weet je nog niet hoe lang het gaat duren. */
function inAfwezigheid(rec, datum) {
  if (!rec) return false;
  var d = parseerDatum(datum);   if (!d) return false;
  var van = parseerDatum(rec.vanaf); if (!van) return false;
  var tot = rec.tot ? parseerDatum(rec.tot) : null;
  if (d < van) return false;
  if (tot && d > tot) return false;
  return true;
}
/* Welke periode geldt voor deze speler op deze dag? Overlappen er
   twee, dan wint degene die niet meetelt — de zwaarste reden. */
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
/* loopt / komt nog / voorbij */
function afwezigheidFase(rec, vandaag) {
  var nu = vandaag || vandaagISO();
  if (inAfwezigheid(rec, nu)) return "nu";
  var van = parseerDatum(rec.vanaf), d = parseerDatum(nu);
  if (van && d && d < van) return "komt";
  return "voorbij";
}
/* Hoeveel dagen duurt de periode? Null als er geen einddatum is. */
function afwezigheidDagen(rec) {
  var van = parseerDatum(rec.vanaf), tot = rec.tot ? parseerDatum(rec.tot) : null;
  if (!van || !tot) return null;
  return Math.round((tot - van) / 86400000) + 1;
}
/* Hoeveel dagen nog te gaan? Negatief bestaat niet, dan is het 0. */
function afwezigheidResterend(rec, vandaag) {
  var tot = rec.tot ? parseerDatum(rec.tot) : null;
  if (!tot) return null;
  var d = parseerDatum(vandaag || vandaagISO());
  if (!d) return null;
  return Math.max(0, Math.round((tot - d) / 86400000));
}
/* Netjes leesbaar: "13 jul. – 26 sep. 2026" of "vanaf 13 jul. 2026" */
function afwezigheidPeriodeTekst(rec) {
  if (!rec || !rec.vanaf) return "";
  var van = formateerDatum(rec.vanaf);
  if (!rec.tot) return "vanaf " + van;
  return van + " – " + formateerDatum(rec.tot);
}
