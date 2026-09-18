/* ══════════════════════════════════════════════════════════════
   DOMEIN: wedstrijden
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P3,
   stap 2 van docs/professionaliseringsplan.md). Geen import/export:
   tools/bouw.js plakt dit bestand vóór src/app.jsx aan elkaar (ná
   src/domein/boetepot.js, zie DOMEIN_VOLGORDE in tools/bouw.js), dus
   alles hieronder is nog altijd gewoon top-level function/const in
   dezelfde scope als src/app.jsx. Er verandert dus functioneel
   niets — dit is een verhuizing, geen herschrijving.

   Rekenwerk rond de wedstrijd zelf: de uitslag, welk soort wedstrijd
   het is en of hij meetelt, de tegenstanderanalyse, wie welke rol of
   taak krijgt, wie is opgegeven of uitgeleend, gastspelers, en de
   toernooiplanner. Geen opslag, geen DOM — alleen berekeningen op de
   gegevens die de aanroeper meegeeft.

   Anders dan in app.jsx (waar deze functies verspreid tussen
   React-componenten in stonden) staan ze hier gegroepeerd per
   onderwerp — dat kan omdat de volgorde van los-van-elkaar-staande
   function/const-declaraties in JavaScript er niet toe doet: alles
   is hoe dan ook pas bekend als de app draait, niet in leesvolgorde.

   Dit bestand gebruikt een aantal dingen die niet hier staan omdat ze
   breder gebruikt worden dan alleen hier — bijvoorbeeld in JSX-
   componenten die pas ná dit bestand geparst worden:
     - BESCHIKBAARHEID (het spelersformulier, spelers.jsx)
     - LEEG_SPELER (het spelersformulier, spelers.jsx)
     - standMetPunten, laadJson (gedeelde helpers, blijven in app.jsx)
   Dat werkt ondanks de plakvolgorde omdat function-declaraties in
   dezelfde scope pas bij aánroep worden opgezocht, niet bij het
   inladen — en tegen de tijd dat bijvoorbeeld toernooiStand()
   daadwerkelijk draait, is alles al geparst. Hetzelfde principe
   als bij boetepotActief() en huidigSeizoen() in src/domein/boetepot.js.

   BIJGEWERKT BIJ P4 STAP 8 (18 september 2026) — een eerdere versie van
   deze comment zei dat WEDSTRIJD_ROLLEN, VLAG_ROLLEN, TEGEN_TENUE en
   LEEG_WEDSTRIJD (en hun opslag: TAKEN_KEY/laadTaken/STANDAARD_TAKEN,
   TOERNOOIEN_KEY/laadToernooien/LEEG_TOERNOOI) in app.jsx bleven omdat
   ze "gebruikt worden door React-componenten die niets met dit bestand
   te maken hebben." Dat was waar op het moment dat P3 dit schreef —
   toen stonden nog tientallen componenten verspreid door app.jsx. Nu
   bijna alle schermmodules van P4 zijn verplaatst, is dat nagerekend:
   alle gebruiksplekken van deze vijf/zes bleken binnen de wedstrijden-
   module te liggen, en ze staan sinds P4 stap 8 in
   src/schermen/wedstrijden.jsx — nergens anders meer. Werkt nog steeds
   ondanks de plakvolgorde, om dezelfde reden als hierboven: de functies
   in dit bestand die ze aanroepen (rolNaarLabel, vlagAantal e.d.) doen
   dat pas bij een gebruikersactie, ruim ná het laden van alle scripts.

   Wat hier NIET staat, met opzet:
     - berekenSpelerStats blijft (voorlopig) in src/app.jsx — dat is
       voor een latere stap (src/domein/statistieken.js);
     - BESCHIKBAARHEID, OPGAVE_OPTIES, LEEG_SPELER blijven in src/app.jsx:
       BESCHIKBAARHEID en LEEG_SPELER worden ook gebruikt door
       spelers.jsx en horen dus niet exclusief bij de wedstrijdlogica;
       OPGAVE_OPTIES heeft bij narekenen voor stap 8 geen enkele
       aanroeper meer opgeleverd (mogelijk verouderd) en is met rust
       gelaten — dat opruimen is geen onderdeel van dit plan;
     - de React-componenten rond wedstrijden, rollen, taken, gasten en
       toernooien staan sinds P4 stap 8 in src/schermen/wedstrijden.jsx
       — alleen de losse rekenfuncties errond stonden al hier.
   ══════════════════════════════════════════════════════════════ */

/* ── SCORE & UITSLAG ── */
/* Op een scorebord staat de thuisploeg links. Bij een uitwedstrijd is
   dat dus de tegenstander. De cijfers zelf blijven "wij" en "zij" —
   alleen de volgorde op het scherm draait om, zodat een ingevulde
   uitslag nooit van betekenis verandert.
   Geeft twee vakken terug, van links naar rechts. */
function scoreVolgorde(thuis, eigenNaam, tegenNaam) {
  var eigen = {kant:"fch",  naam: eigenNaam  || "Wij",           eigenTeam:true};
  var tegen = {kant:"teg",  naam: tegenNaam  || "Tegenstander",  eigenTeam:false};
  return (thuis === false) ? [tegen, eigen] : [eigen, tegen];
}

function resultaat(w) {
  if(w.status!=="gespeeld") return "gepland";
  if(w.score.fch>w.score.teg) return "winst";
  if(w.score.fch<w.score.teg) return "verlies";
  return "gelijk";
}

/* De uitslag zoals je hem opschrijft: altijd wij eerst */
function uitslagTekst(w) {
  return (Number(w.score && w.score.fch)||0) + " – " + (Number(w.score && w.score.teg)||0);
}

/* ═══════════════════════════════════════════════════════════
   SOORT WEDSTRIJD
   Een oefenpot hoort niet in je seizoenscijfers. Wedstrijden van
   vóór deze wijziging hebben nog geen soort en vallen terug op
   competitie, zodat er met terugwerkende kracht niets verandert.
═══════════════════════════════════════════════════════════ */
const WEDSTRIJD_SOORTEN = [
  {id:"competitie", label:"Competitie",     kort:"Comp.",  kleur:"#004aad", telt:true,
   uitleg:"Telt mee in de seizoenscijfers"},
  {id:"beker",      label:"Beker",          kort:"Beker",  kleur:"#7c3aed", telt:true,
   uitleg:"Telt mee in de seizoenscijfers"},
  {id:"oefen",      label:"Oefenwedstrijd", kort:"Oefen",  kleur:"#64748b", telt:false,
   uitleg:"Telt niet mee, ook niet voor de spelers"},
  {id:"toernooi",   label:"Toernooi",       kort:"Toern.", kleur:"#b45309", telt:false,
   uitleg:"Telt niet mee, ook niet voor de spelers"}
];
function wedstrijdSoort(w) {
  var id = (w && typeof w === "object") ? w.soort : w;
  return WEDSTRIJD_SOORTEN.filter(function(s){ return s.id===id; })[0] || WEDSTRIJD_SOORTEN[0];
}
/* Telt deze wedstrijd mee in de cijfers? */
function wedstrijdTelt(w) { return wedstrijdSoort(w).telt; }
/* Alleen de wedstrijden die meetellen, gespeeld en wel */
function tellendeWedstrijden(lijst) {
  return (lijst||[]).filter(function(w){ return w.status==="gespeeld" && wedstrijdTelt(w); });
}

/* ═══════════════════════════════════════════════════════════
   TEGENSTANDERANALYSE
   Tot nu toe was de tegenstander alleen een naam. Hier leg je vast
   hoe ze spelen, op wie je moet letten, en wat er de vorige keer
   gebeurde — dat laatste haalt de app zelf op.
═══════════════════════════════════════════════════════════ */
const LEEG_TEGEN = { formatie:"4-3-3A", spelers:{}, uitgelicht:[], sterk:"", zwak:"", afspraken:"" };

function tegenAnalyse(wedstrijd) {
  return Object.assign({}, LEEG_TEGEN, (wedstrijd && wedstrijd.tegen) || {});
}
/* Hoeveel is er ingevuld? Voor het tellertje op de knop. */
function tegenIngevuld(wedstrijd) {
  var t = tegenAnalyse(wedstrijd);
  var n = 0;
  n += Object.keys(t.spelers||{}).filter(function(k){
    var s = t.spelers[k]; return s && ((s.naam||"").trim() || (s.nummer||"").trim());
  }).length ? 1 : 0;
  n += (t.uitgelicht||[]).length ? 1 : 0;
  ["sterk","zwak","afspraken"].forEach(function(v){ if ((t[v]||"").trim()) n++; });
  return n;
}
/* De opstelling omzetten naar de vorm die het veld verwacht */
function tegenToewijzing(analyse) {
  var uit = {};
  Object.keys(analyse.spelers||{}).forEach(function(k){
    var s = analyse.spelers[k];
    if (!s) return;
    var naam = (s.naam||"").trim(), nummer = (s.nummer||"").trim();
    if (!naam && !nummer) return;
    uit[k] = {id:"teg-"+k, naam: naam || ("#"+nummer), rugnummer: nummer};
  });
  return uit;
}
/* Eerder tegen deze club gespeeld? Op naam vergelijken, want een
   tegenstander is bij ons geen apart record. */
function eerdereOntmoetingen(wedstrijden, tegenstander, negeerId) {
  var naam = String(tegenstander||"").toLowerCase().trim();
  if (!naam) return [];
  return (wedstrijden||[]).filter(function(w){
    return w.id !== negeerId
      && w.status === "gespeeld"
      && String(w.tegenstander||"").toLowerCase().trim() === naam;
  }).sort(function(a,b){ return String(b.datum).localeCompare(String(a.datum)); });
}

/* ── SPELERSROLLEN PER WEDSTRIJD ──────────────────────────
   Rollen die niet meer bestaan maar wel in oude wedstrijden staan. Wie
   in september "vt-16" invulde, hoort in mei niet naar een leeg vakje te
   kijken: die keuze verhuist naar de rol die ervoor in de plaats kwam. */
const ROL_OPGEVOLGD = {"vt-16":"vrije-trap", "vt-lang":"vrije-trap", "vt-kort":"vrije-trap"};
function rollenNu(rollen) {
  var uit = {};
  Object.keys(rollen || {}).forEach(function (r) {
    var naar = ROL_OPGEVOLGD[r] || r;
    /* Stond er meer dan één oude vrije trap, dan wint de eerste. Twee
       namen in één vakje kan niet, en gokken is erger dan kiezen. */
    if (uit[naar] === undefined) uit[naar] = rollen[r];
  });
  return uit;
}

/* De twee vlaghelften tellen samen, zodat het eerlijk rouleert */
function vlagTelling(spelerId, wedstrijden) {
  return (wedstrijden||[]).reduce(function(t,w){
    if (!w.rollen) return t;
    return t + VLAG_ROLLEN.filter(function(r){ return w.rollen[r]===spelerId; }).length;
  }, 0);
}
/* Wie is het minst vaak aan de beurt geweest? */
function volgendeVlagger(spelers, wedstrijden, alBezet) {
  var bezet = alBezet || [];
  var vrij = (spelers||[]).filter(function(s){ return bezet.indexOf(s.id)<0; });
  if (!vrij.length) vrij = (spelers||[]).slice();
  if (!vrij.length) return null;
  var beste = null, laagste = Infinity;
  vrij.forEach(function(s){
    var n = vlagTelling(s.id, wedstrijden);
    if (n < laagste) { laagste = n; beste = s; }
  });
  return beste;
}
function rolInfo(id) {
  return WEDSTRIJD_ROLLEN.filter(function(r){ return r.id===id; })[0] || WEDSTRIJD_ROLLEN[0];
}

/* Wie staat er in dit rolvakje?

   Een rol wees vroeger altijd naar een speler uit de selectie. Bij het
   vlaggen klopt dat niet: dat doet net zo vaak een vader, of iemand van
   het tweede die toch al langs de lijn staat.

   In plaats van een tweede veldje ernaast voor "iemand anders" — twee
   plekken die uit elkaar kunnen lopen — mag er nu ook gewoon een naam in
   het vakje staan. Staat er een spelersnummer, dan is het een speler;
   staat er iets anders, dan is het een naam. Eén vakje, één waarheid, en
   alles wat er al in stond blijft werken. */
function rolPersoon(waarde, spelers) {
  if (waarde === null || waarde === undefined || waarde === "") return null;
  var s = (spelers || []).filter(function (p) { return String(p.id) === String(waarde); })[0];
  if (s) return {id: s.id, naam: s.naam, rugnummer: s.rugnummer, speler: s};
  var naam = String(waarde).trim();
  return naam ? {id: null, naam: naam, rugnummer: "", speler: null} : null;
}
/* Alle rollen van één speler in deze wedstrijd */
function rollenVanSpeler(wedstrijd, spelerId) {
  var r = rollenNu((wedstrijd && wedstrijd.rollen) || {});
  return WEDSTRIJD_ROLLEN.filter(function(rol){ return r[rol.id]===spelerId; });
}
/* Hoe vaak had deze speler deze rol al, zodat je kunt afwisselen */
function rolTelling(rolId, spelerId, wedstrijden) {
  return (wedstrijden||[]).filter(function(w){
    return w.rollen && w.rollen[rolId]===spelerId;
  }).length;
}
/* De laatst gespeelde wedstrijd waarin rollen zijn ingevuld */
function laatsteRollen(wedstrijden, behalveId) {
  var kandidaten = (wedstrijden||[])
    .filter(function(w){ return w.id!==behalveId && w.rollen && Object.keys(w.rollen).some(function(k){ return w.rollen[k]; }); })
    .sort(function(a,b){ return new Date(b.datum) - new Date(a.datum); });
  return kandidaten.length ? kandidaten[0] : null;
}

/* ── TEAMTAKEN ──
   Hoe vaak deed deze speler deze taak al? */
function taakTelling(taakId, spelerId, wedstrijden) {
  return (wedstrijden||[]).filter(function(w){
    return w.taken && w.taken[taakId]===spelerId;
  }).length;
}
/* Eerlijk verdelen: wie het minst vaak aan de beurt was, en het langst geleden */
function volgendeVoorTaak(taakId, spelers, wedstrijden, alToegewezen) {
  var bezet = alToegewezen || [];
  var kandidaten = (spelers||[]).filter(function(s){ return bezet.indexOf(s.id)<0; });
  if (kandidaten.length===0) kandidaten = (spelers||[]).slice();
  if (kandidaten.length===0) return null;
  var gesorteerd = (wedstrijden||[]).slice().sort(function(a,b){ return new Date(b.datum)-new Date(a.datum); });
  function laatstGeleden(spelerId) {
    for (var i=0;i<gesorteerd.length;i++) {
      var w = gesorteerd[i];
      if (w.taken && w.taken[taakId]===spelerId) return i;
    }
    return 9999;
  }
  var beste = null, besteScore = null;
  kandidaten.forEach(function(s){
    var score = [taakTelling(taakId, s.id, wedstrijden), -laatstGeleden(s.id)];
    if (besteScore===null || score[0]<besteScore[0] || (score[0]===besteScore[0] && score[1]<besteScore[1])) {
      beste = s; besteScore = score;
    }
  });
  return beste ? beste.id : null;
}

/* ── BESCHIKBAARHEID ── */
function beschikbaarheidInfo(id) {
  return BESCHIKBAARHEID.find(function(b){return b.id===id;}) || BESCHIKBAARHEID[0];
}

/* ── OPGAVE: aanwezigheid vooraf ── */
function opgaveVanSpeler(lijst, spelerId) {
  var r = (lijst||[]).find(function(o){return o.spelerId===spelerId;});
  return r ? r.status : "onbekend";
}
function zetOpgave(lijst, speler, status) {
  var bestaat = (lijst||[]).some(function(o){return o.spelerId===speler.id;});
  if (bestaat) {
    return lijst.map(function(o){
      return o.spelerId===speler.id ? Object.assign({},o,{status:status}) : o;
    });
  }
  return (lijst||[]).concat([{spelerId:speler.id, naam:speler.naam, status:status}]);
}
/* ══ UITLENEN ════════════════════════════════════════════════
   De status zegt dát hij is uitgeleend; hier staat waarheen.

   Twee velden staan er met opzet al in terwijl er nog niets mee gebeurt:
   bronTeamId en bronWedstrijdId. Zodra de JO19-1 ook TEAMTAKKIE
   gebruikt, kan Tommy's wedstrijd daar aan deze regel gekoppeld worden,
   en verschijnen zijn minuten en doelpunten in zijn eigen spelershistorie
   zonder dat ze meetellen als cijfers van de JO19-2. Dat is dan een
   invuloefening en geen verbouwing.

   Wat er níét gebeurt zolang die koppeling er niet is: minuten,
   doelpunten en assists worden niet verzonnen. Nul zou een leugen zijn
   — hij heeft gespeeld, alleen niet hier. Daarom is het antwoord op
   "hoeveel minuten?" een streepje en geen getal.
   ══════════════════════════════════════════════════════════ */
function uitleenVan(bron, spelerId) {
  /* Eén opzoeking, geen twee. Na een reis over de server zijn de sleutels
     tekst geworden en de spelersnummers nog getallen — maar JavaScript
     maakt van elke sleutel toch tekst, dus alle[2001] en alle["2001"]
     zijn hetzelfde vakje. Een tweede poging met String() eromheen zou
     een verschil suggereren dat er niet is. Waar het wél moet, staat het
     er wel: bij het vergelijken van twee waarden, verderop. */
  return ((bron && bron.uitleen) || {})[spelerId] || null;
}
function zetUitleen(bron, spelerId, gegevens) {
  var alle = Object.assign({}, (bron && bron.uitleen) || {});
  if (!gegevens) delete alle[spelerId];
  else alle[spelerId] = Object.assign(
    {naar: "", opmerking: "", bronTeamId: null, bronWedstrijdId: null}, gegevens);
  return alle;
}
/* Was deze speler bij deze wedstrijd uitgeleend? Dat is de vraag die
   elke telling moet stellen voordat hij een nul opschrijft. */
function isUitgeleend(wedstrijd, spelerId) {
  if (!wedstrijd) return false;
  if (opgaveVanSpeler(wedstrijd.opgave, spelerId) === "uitgeleend") return true;
  return !!uitleenVan(wedstrijd, spelerId);
}
/* Iedereen die bij deze wedstrijd is uitgeleend, als lijst nummers. */
function uitgeleendIn(wedstrijd) {
  if (!wedstrijd) return [];
  var uit = [];
  ((wedstrijd.opgave) || []).forEach(function (o) {
    if (o && o.status === "uitgeleend") uit.push(o.spelerId);
  });
  Object.keys((wedstrijd.uitleen) || {}).forEach(function (k) {
    if (uit.map(String).indexOf(String(k)) < 0) uit.push(k);
  });
  return uit;
}
/* Waar speelde hij dan? Voor op het scherm, en later voor de koppeling. */
function uitleenNaar(wedstrijd, spelerId) {
  var r = uitleenVan(wedstrijd, spelerId);
  return (r && String(r.naar || "").trim()) || "";
}

function telOpgave(lijst, spelers, status) {
  return (spelers||[]).filter(function(s){ return opgaveVanSpeler(lijst, s.id)===status; }).length;
}

/* ═══════════════════════════════════════════════════════════
   GASTSPELERS
   Een jongen die één wedstrijd meedoet, geleend uit een ander
   elftal. Hij hoort niet in de selectie thuis en mag de cijfers
   van het team niet vervuilen. Daarom staat hij bij de wedstrijd
   zelf en niet bij de spelers: alle statistieken lopen over
   laadSpelers(), dus hij valt er vanzelf buiten.
═══════════════════════════════════════════════════════════ */
var _gastTeller = 0;
/* Negatief nummer, zodat het nooit botst met een echte speler —
   die krijgt Date.now(), en dat is altijd positief. */
function maakGast(velden) {
  _gastTeller++;
  return Object.assign({}, LEEG_SPELER, {
    id: -(Date.now() + _gastTeller),
    gast: true,
    naam: (velden.naam||"").trim(),
    rugnummer: (velden.rugnummer||"").trim(),
    positie: velden.positie || "",
    vanTeam: (velden.vanTeam||"").trim()
  });
}
function gastenVan(wedstrijd) { return (wedstrijd && wedstrijd.gasten) || []; }
/* De selectie plus de gasten van déze wedstrijd */
function spelersMetGasten(spelers, wedstrijd) {
  return (spelers||[]).concat(gastenVan(wedstrijd));
}
/* Deed de gast echt mee? Anders kun je hem zonder gedoe weghalen. */
function gastInGebruik(wedstrijd, id) {
  if ((wedstrijd.opstelling||[]).some(function(r){ return r.spelerId===id; })) return true;
  if ((wedstrijd.scorers||[]).some(function(s){ return s.spelerId===id || s.assist===id; })) return true;
  if ((wedstrijd.kaarten||[]).some(function(k){ return k.spelerId===id; })) return true;
  if (wedstrijd.motm === id) return true;
  if (Object.keys(wedstrijd.rollen||{}).some(function(k){ return wedstrijd.rollen[k]===id; })) return true;
  return false;
}

/* ── TOERNOOIEN ──
   Halve competitie volgens de cirkelmethode: iedereen één keer tegen elkaar */
function maakPouleSchema(teamIds) {
  var ids = teamIds.slice();
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push(null); // vrijloter
  var n = ids.length;
  var lijst = ids.slice();
  var rondes = [];
  for (var r = 0; r < n-1; r++) {
    var paren = [];
    for (var i = 0; i < n/2; i++) {
      var a = lijst[i], b = lijst[n-1-i];
      if (a !== null && b !== null) paren.push(r % 2 === 0 ? [a,b] : [b,a]);
    }
    rondes.push(paren);
    var vast = lijst[0];
    var rest = lijst.slice(1);
    rest.unshift(rest.pop());
    lijst = [vast].concat(rest);
  }
  return rondes;
}

function tijdPlusMinuten(tijd, minuten) {
  var d = String(tijd||"09:00").split(":");
  var totaal = (Number(d[0])||0)*60 + (Number(d[1])||0) + minuten;
  totaal = ((totaal % 1440) + 1440) % 1440;
  var u = Math.floor(totaal/60), m = totaal % 60;
  return (u<10?"0":"")+u+":"+(m<10?"0":"")+m;
}

/* Rondes over velden en tijdsloten verdelen */
function planToernooi(rondes, aantalVelden, starttijd, speelduur, pauze) {
  var velden = Math.max(1, Number(aantalVelden)||1);
  var wedstrijden = [];
  var slot = 0;
  rondes.forEach(function(ronde){
    for (var i = 0; i < ronde.length; i += velden) {
      var groep = ronde.slice(i, i+velden);
      var tijd = tijdPlusMinuten(starttijd, slot * ((Number(speelduur)||15) + (Number(pauze)||0)));
      groep.forEach(function(paar, v){
        wedstrijden.push({
          id: "w"+wedstrijden.length+"-"+Date.now(),
          thuisId: paar[0], uitId: paar[1],
          veld: v+1, tijd: tijd,
          score: {thuis:0, uit:0}, gespeeld: false
        });
      });
      slot++;
    }
  });
  return wedstrijden;
}

/* Stand binnen een toernooi, uit de gespeelde wedstrijden */
function toernooiStand(teams, wedstrijden) {
  var rijen = (teams||[]).map(function(t){
    return {id:t.id, naam:t.naam, eigen:t.eigen, gespeeld:0, winst:0, gelijk:0, verlies:0, doelVoor:0, doelTegen:0};
  });
  function zoek(id){ return rijen.find(function(r){return r.id===id;}); }
  (wedstrijden||[]).filter(function(w){return w.gespeeld;}).forEach(function(w){
    var t = zoek(w.thuisId), u = zoek(w.uitId);
    if (!t || !u) return;
    var st = Number(w.score.thuis)||0, su = Number(w.score.uit)||0;
    t.gespeeld++; u.gespeeld++;
    t.doelVoor += st; t.doelTegen += su;
    u.doelVoor += su; u.doelTegen += st;
    if (st > su) { t.winst++; u.verlies++; }
    else if (st < su) { u.winst++; t.verlies++; }
    else { t.gelijk++; u.gelijk++; }
  });
  return standMetPunten(rijen);
}
