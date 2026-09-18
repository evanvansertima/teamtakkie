const { useState, useEffect, useRef } = React;

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const initialen = naam => naam ? naam.trim().split(" ").map(d=>d[0]).slice(0,2).join("").toUpperCase() : "?";
/* Een korte naam boven een scoreteller. "FC Harlingen" wordt FH en
   niet "FC", want dat zegt niets. */
function teamKort(naam) {
  var kaal = String(naam || "").trim();
  if (!kaal) return "?";
  var woorden = kaal.split(/\s+/);
  if (woorden.length === 1) return woorden[0].slice(0, 4).toUpperCase();
  return initialen(kaal);
}

const positieKort = pos => ({Keeper:"K",Verdediger:"V",Middenvelder:"M",Aanvaller:"A"})[pos]||"";
const positieKlasse = pos => ({Keeper:"positie-K",Verdediger:"positie-V",Middenvelder:"positie-M",Aanvaller:"positie-A"})[pos]||"";
const leeftijdUitDatum = d => { if(!d) return null; const g=new Date(d),n=new Date(); let l=n.getFullYear()-g.getFullYear(); if(n.getMonth()-g.getMonth()<0||(n.getMonth()-g.getMonth()===0&&n.getDate()<g.getDate()))l--; return l; };
const formateerDatum = d => { if(!d) return "-"; return new Date(d).toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"}); };
const formateerDatumKort = d => { if(!d) return "-"; return new Date(d).toLocaleDateString("nl-NL",{day:"numeric",month:"short"}); };

// localStorage
const SPELERS_KEY = "fch_spelers_v1";
const WEDSTRIJDEN_KEY = "fch_wedstrijden_v1";


/* ── Pakketten ───────────────────────────────────────────────
   Drie pakketten, één tabel. Wat een pakket mag staat hier en
   nergens anders, zodat er nooit twee plekken zijn die het met
   elkaar oneens kunnen worden.

   De indeling komt uit docs/pakketten-besluit.md (11 september 2026)
   en staat gelijk aan pakket_grenzen in server/06-pakketten.sql. Die
   tabel is de baas; loopt deze lijst ermee uit de pas, dan is deze
   lijst fout. Vandaar dezelfde id's en dezelfde aantallen.

   Wat het verschil tussen Coach en Club is: níét welke schermen je
   krijgt, alleen hoeveel teams. Dat is met opzet zo. Zou er ooit een
   scherm tussen Coach en Club in vallen, dan klopt de redenering
   hieronder niet meer — beide zitten namelijk wél op de server, en
   dan valt er ook echt iets te halen.

   Let goed op wat hier níét staat: een slot met een sleutel. Het
   antwoord wordt in de browser gegeven, dus wie de ontwikkelaars-
   console opent zet zijn pakket in tien seconden op club. Dat is hier
   geen probleem: Free komt helemaal niet op de server, dus wie
   zichzelf toegang geeft, geeft zichzelf toegang tot zijn eigen
   gegevens op zijn eigen telefoon. Wat geld kost — de server — wordt
   daarginds bewaakt, niet hier. Wat hier staat ordent de app en laat
   zien wat een pakket oplevert.

   Zodra er een server met accounts is komt het antwoord daarvandaan
   en verandert hier alleen pakketNu(). */
const MODULES = ["basis", "trainingen", "ontwikkeling", "analyse", "clubhuis"];
const PAKKETTEN = [
  {id:"free",  naam:"Free",  teams:1,
   modules:["basis"]},
  {id:"coach", naam:"Coach", teams:1,
   modules:["basis", "trainingen", "ontwikkeling", "analyse", "clubhuis"]},
  /* In pakket_grenzen staat club op teams = null, want SQL kent geen
     oneindig. Dat één op één overnemen gaat hier mis: magNieuwTeam
     rekent met _teams.length < maxTeams, en "iets < null" is altijd
     onwaar. Club zou dan geen enkel team meer mogen aanmaken —
     precies het omgekeerde van onbeperkt. Infinity is hetzelfde
     besluit in een taal die het wél kan opschrijven. */
  {id:"club",  naam:"Club",  teams:Infinity,
   modules:["basis", "trainingen", "ontwikkeling", "analyse", "clubhuis"]}
];
/* Wat een pakket kost. Dit is de enige plek in de app waar een bedrag
   staat, en de bedragen komen uit docs/pakketten-besluit.md (het
   besluit van 11 september). Wijkt dit daarvan af, dan is het besluit
   leidend en dit fout.

   De jaarprijs staat er voluit bij en wordt niet uitgerekend uit de
   maandprijs. Dat is met opzet: twee maanden korting is een besluit
   en geen som, en wie het volgend jaar anders wil doen hoort dat hier
   te kunnen opschrijven zonder eerst een formule te moeten begrijpen.

   Het nadeel dat hier bewust bij is genomen: een prijs die in het
   bestand staat, verandert alleen mee met een nieuwe versie van de
   app. Een prijswijziging is dus een uitrol, geen knop op de server.
   Dat is de prijs voor een prijskaart die overal hetzelfde laat zien,
   ook op een telefoon zonder verbinding langs de lijn. */
const PAKKET_PRIJS = {
  free:  {maand:"Gratis",  jaar:null},
  coach: {maand:"\u20ac 6,99",  jaar:"\u20ac 69,90"},
  club:  {maand:"\u20ac 49,00", jaar:"\u20ac 490,00"}
};
/* Welk scherm hoort bij welke module. Staat een scherm hier niet in,
   dan hoort het bij de basis en mag iedereen erbij.

   De agenda stond hier tot 11 september bij "trainingen". Dat was een
   technische verwantschap (trainingen vullen de agenda), geen
   commerciële: iemand die alleen wedstrijden bijhoudt wil nog steeds
   zien wanneer ze zijn. De agenda hoort dus bij de basis, en dat is
   precies waarom hij hier niet meer staat. */
const PAGINA_MODULE = {
  trainingen:"trainingen",
  statistieken:"analyse",  live:"analyse",
  clubhuis:"clubhuis"
};
/* Een apparaat waar niets op staat is geen klant. Daarom begint dit
   op het zuinigste pakket en niet op het ruimste: iemand die nog
   nooit iets heeft ingesteld hoort niet stilletjes alles te krijgen,
   want dan is er ook niets meer om voor te betalen.

   Let op de laatste regel: ook de terugval voor een pakketnaam die
   we niet kennen (een oude basic/pro/max, of een verschrijving) is
   het eerste pakket, niet het laatste. Op de server staat het al zo —
   pakket_van_club() eindigt op coalesce(..., 'free'). */
function pakketNu() {
  var id = PAKKETTEN[0].id;
  try {
    var r = localStorage.getItem(LICENTIE_KEY);
    if (r) { var o = JSON.parse(r); if (o && o.pakket) id = o.pakket; }
  } catch(e) {}
  for (var i = 0; i < PAKKETTEN.length; i++) if (PAKKETTEN[i].id === id) return PAKKETTEN[i];
  return PAKKETTEN[0];
}
function zetPakket(id) {
  try { localStorage.setItem(LICENTIE_KEY, JSON.stringify({pakket:id})); } catch(e) {}
  return pakketNu();
}
function magModule(module) {
  if (!module || module === "basis") return true;
  return pakketNu().modules.indexOf(module) >= 0;
}
function magPagina(pagina) { return magModule(PAGINA_MODULE[pagina]); }
function maxTeams() { return pakketNu().teams; }
function magNieuwTeam() { return teams().length < maxTeams(); }

/* ── Het slot ────────────────────────────────────────────────
   Hierboven staat wát iemand mag. Hieronder staat wat er gebeurt als
   het antwoord nee is, en dat is met opzet één plek: drie menu's, een
   rooster met snelkoppelingen en een tabblad geven straks allemaal
   hetzelfde antwoord, want ze stellen allemaal dezelfde vraag.

   De toon is die van de melding bij de teamlimiet die er al stond:
   feitelijk, het pakket bij naam, geen uitroepteken. Iemand die dit
   leest staat langs de lijn en heeft geen behoefte aan een verkoper. */

/* Het goedkoopste pakket waar een onderdeel in zit. PAKKETTEN staat
   van zuinig naar ruim, dus het eerste dat past is meteen het
   goedkoopste antwoord — en dat is het pakket dat straks goud
   omrand in de prijskaart staat. */
function pakketVoorModule(module) {
  if (!module) return null;
  for (var i = 0; i < PAKKETTEN.length; i++)
    if (PAKKETTEN[i].modules.indexOf(module) >= 0) return PAKKETTEN[i];
  return null;
}
/* Eén zin per onderdeel. Niet opgebouwd uit losse woorden, want dan
   krijg je "Trainingen hoort bij Coach" — het onderwerp is soms
   enkelvoud en soms meervoud, en een zin die kreupel loopt leest als
   een foutmelding in plaats van als een antwoord. */
const SLOT_ZIN = {
  trainingen:   function (p) { return "Trainingen horen bij " + p + "."; },
  ontwikkeling: function (p) { return "Beoordelingen en ontwikkeling horen bij " + p + "."; },
  analyse:      function (p) { return "Statistieken en live-analyse horen bij " + p + "."; },
  clubhuis:     function (p) { return "Het clubhuis hoort bij " + p + "."; }
};
function slotZin(module) {
  var p = pakketVoorModule(module);
  var naam = p ? p.naam : "een groter pakket";
  var maak = SLOT_ZIN[module];
  return maak ? maak(naam) : "Dit onderdeel hoort bij " + naam + ".";
}
/* De prijskaart opendoen vanuit een slotje. App zet hier bij het
   opstarten zijn eigen functie neer, zoals de toasts dat ook doen:
   het slotje kan overal in de app zitten en hoeft niet via twintig
   schermen een prop doorgereikt te krijgen. Staat er niets, dan
   gebeurt er niets — dat is beter dan een fout in een scherm waar
   iemand middenin een wedstrijd op staat. */
var _pakkettenOpener = null;
/* Wat er gebeurt bij een tik op iets dat vergrendeld is: géén
   navigatie, géén venster dat vanzelf opengaat, géén vraag om te
   bevestigen. Alleen een melding die vanzelf weer weggaat. Een
   ongelukkige tik met natte handen kost zo nul vervolgtikken: niets
   doen is genoeg. Wie wél wil kijken is er met één tik. */
function slotMelding(module) {
  var p = pakketVoorModule(module);
  return toon(slotZin(module), {
    soort:"info",
    actieLabel:"Bekijk pakketten",
    actie:function () { if (_pakkettenOpener) _pakkettenOpener(p ? p.id : null); }
  });
}
/* De uitleg voor een voorleeshulp. Niet het attribuut disabled: een
   uitgeschakelde knop is voor een schermlezer onbereikbaar en meldt
   hooguit "niet beschikbaar", zonder waarom. Deze knop moet juist wél
   bereikbaar zijn en juist wél vertellen wat eraan scheelt. */
function slotLabel(naam, module) {
  var p = pakketVoorModule(module);
  return naam + " — hoort bij " + (p ? p.naam : "een groter pakket");
}


/* Zorgen dat er een club is waar dit account bij hoort. Bestaat er
   al een lidmaatschap, dan die; anders wordt er één opgericht met de
   clubnaam die in de app staat. */
/* Bij welke club hoor je? Alleen zoeken — niet stilletjes aanmaken.
   Een club heeft een naam die de gebruiker zelf kiest, en die vraag je
   hem één keer. Vroeger maakte de app hier "Mijn club" aan en zat je
   daar vervolgens aan vast. */
function zorgVoorClub() {
  var bekend = clubIdNu();
  return serverVraag("/rest/v1/leden?select=club_id,rol&order=gemaakt_op.asc")
    .then(function (r) {
      if (!r.ok) return r;
      var lijst = Array.isArray(r.gegevens) ? r.gegevens : [];
      if (!lijst.length) { zetClubId(null); return {ok:true, gegevens:null}; }
      var kies = lijst.filter(function (l) { return l.club_id === bekend; })[0] || lijst[0];
      zetClubId(kies.club_id);
      /* De rol stond hier al in het antwoord en werd weggegooid. Hij komt
         van de server en niet uit de app: zo kan niemand zichzelf tot
         eigenaar bombarderen door iets in zijn browser aan te passen. */
      zetRol(kies.rol);
      return {ok:true, gegevens:kies.club_id};
    });
}
/* Een club oprichten. Dit is het moment waarop een nieuwe gebruiker
   zijn vereniging een naam geeft; alles wat daarna komt hangt eraan. */
function maakClub(naam, logo) {
  return serverVraag("/rest/v1/rpc/nieuwe_club", {
    methode: "POST",
    lichaam: {club_naam: (naam || "").trim(), mijn_naam: null}
  }).then(function (r) {
    if (!r.ok) return r;
    var id = (typeof r.gegevens === "string") ? r.gegevens : (r.gegevens && r.gegevens.id);
    if (!id) return serverFout("server", "De club kon niet worden aangemaakt.");
    zetClubId(id);
    if (logo) return zetClubGegevens({naam: naam, logo: logo}).then(function(){ return {ok:true, gegevens:id}; });
    return {ok:true, gegevens:id};
  });
}
/* De naam en het wapen van de club horen bij de club en niet bij dit
   apparaat: iedereen die bij dezelfde vereniging hoort ziet hetzelfde. */
function haalClubGegevens() {
  var id = clubIdNu();
  if (!id) return Promise.resolve({ok:true, gegevens:null});
  return serverVraag("/rest/v1/clubs?select=naam,logo&id=eq." + id).then(function (r) {
    if (!r.ok) return r;
    var club = Array.isArray(r.gegevens) ? r.gegevens[0] : null;
    if (club) zetInstellingen({clubNaam: club.naam || "", logo: club.logo || null});
    return {ok:true, gegevens:club};
  });
}
function zetClubGegevens(wijziging) {
  var id = clubIdNu();
  if (!id) return Promise.resolve(serverFout("geen-club", "Er is nog geen club."));
  var lichaam = {};
  if (wijziging.naam !== undefined) lichaam.naam = wijziging.naam;
  if (wijziging.logo !== undefined) lichaam.logo = wijziging.logo;
  return serverVraag("/rest/v1/clubs?id=eq." + id, {
    methode: "PATCH", lichaam: lichaam,
    koppen: {"Prefer": "return=minimal"}
  });
}

/* ── De vereniging opheffen ──────────────────────────────────
   Dit is de enige knop in de app die iets weggooit dat niet terug te
   halen is. Wat er meegaat staat uitgeschreven in de kop van
   server/08-bewaartermijn.sql: de club zelf, alle leden, alle teams
   (ook die in de prullenbak), alles wat onder die teams hangt, en het
   abonnement. De database ruimt dat mee op via "on delete cascade".

   WAAROM HIER "Prefer: return=representation" STAAT, EN WAAROM DAT
   GEEN DETAIL IS.
   Vraag je niets terug, dan antwoordt PostgREST op een verwijdering
   met 204: "gelukt, niets te melden". Dat antwoord krijg je óók als de
   beveiligingsregels je verwijdering hebben tegengehouden en er dus
   nul rijen weg zijn. Tot 15 september 2026 was dat precies de
   situatie — er bestond helemaal geen regel voor verwijderen op clubs,
   en de app kreeg al die tijd een keurig "gelukt" terug terwijl er
   niets gebeurde. Dat is de vervelendste soort fout: eentje die zich
   voordoet als succes.

   Met deze kop komt de verwijderde rij zélf terug. Is die lijst leeg
   terwijl de status 2xx is, dan is er niets weggegooid en zeggen we
   dat ook. Dezelfde afweging staat bij verlaat_club() in
   server/10-laatste-eigenaar.sql.

   Alleen de eigenaar mag dit, en dat wordt op de server beslist
   (is_eigenaar in de policy clubs_weghalen). De knop hiervoor is de
   deur, niet het slot. */
function hefClubOp() {
  var id = clubIdNu();
  if (!id) return Promise.resolve(serverFout("geen-club", "Er is geen vereniging om op te heffen."));
  return serverVraag("/rest/v1/clubs?id=eq." + encodeURIComponent(id), {
    methode: "DELETE",
    koppen: {"Prefer": "return=representation"}
  }).then(function (r) {
    if (!r.ok) return r;
    var weg = Array.isArray(r.gegevens) ? r.gegevens : [];
    if (!weg.length) return serverFout("geweigerd",
      "De vereniging is niet verwijderd — controleer of je de eigenaar bent.");
    /* Pas nu, en geen seconde eerder, mag er lokaal iets weg. Zou dit
       boven de controle staan, dan was een geweigerde verwijdering op
       de server tóch een lege app op dit apparaat geweest.

       De aanmelding blijft staan: het account van deze persoon bestaat
       gewoon nog, alleen zijn vereniging niet meer. Hij hoort dus in
       het scherm "Je vereniging" te belanden en niet op het
       inlogscherm — dat laatste zou lijken alsof hij ook zijn account
       kwijt is. */
    var aanmelding = sessieNu();
    wisAllesLokaal();
    zetSessie(aanmelding);
    herlaadInstellingen();
    return {ok:true, gegevens: weg[0]};
  });
}


/* De naam en het wapen die je in de instellingen aanpast, horen bij
   de vereniging en niet bij dit apparaat. Ze gaan dus ook omhoog —
   stil, want je bent aan het typen en niet aan het synchroniseren.
   Lukt het niet, dan staat het lokaal goed en gaat het bij de volgende
   ronde alsnog mee. Daar is niemand mee geholpen als er een rode balk
   voor verschijnt terwijl je in een tunnel zit. */
function bewaarClubGegeven(wijziging) {
  zetInstellingen(wijziging);
  if (!clubIdNu() || !ingelogd()) return Promise.resolve({ok:true});
  var omhoog = {};
  if (wijziging.clubNaam !== undefined) omhoog.naam = wijziging.clubNaam;
  if (wijziging.logo !== undefined) omhoog.logo = wijziging.logo;
  if (!Object.keys(omhoog).length) return Promise.resolve({ok:true});
  return zetClubGegevens(omhoog);
}

/* teamEigenSleutels() en teamsVerhuizing() staan sinds P2 in
   src/kern/sleutels.js — de uitleg van de driestapsverhuizing staat
   daar nu ook. TEAMINST_KEY en de aanroep hieronder blijven hier: ze
   horen ook bij de instellingen verderop in dit bestand, en de
   aanroep moet op precies dit punt lopen (na de sleutel-familie,
   vóór het eerste scherm iets opvraagt). */
const TEAMINST_KEY = "fch_teaminstellingen_v1";

/* Hier, en niet hoger: de verhuizing kijkt in de teaminstellingen welk
   seizoen je zelf had ingevuld, en die sleutel bestaat pas op deze
   regel. Hij draait vóór het eerste scherm iets opvraagt. */
seizoenVerhuizing();
/* Vroeger maakte de app hier vanzelf een team aan. Dat leek
   vriendelijk, maar het was de bron van bijna alle ellende: elk
   apparaat verzon zijn eigen team met zijn eigen nummer, en zodra er
   een account bij kwam kende de server die teams niet. Dan had je er
   ineens twee, en zag je je spelers niet.

   Nu bestaat er niets tot je bent ingelogd. De server is de waarheid;
   dit apparaat is alleen een venster. De verhuizing hieronder bestaat
   nog wel, maar wordt alleen aangeroepen als je bij het aanmaken van
   je eerste team zegt dat je oude gegevens wilt meenemen. */

const laadSpelers = function() {
  var lijst = laadJson(SPELERS_KEY);
  /* Oude beoordelingen op 1-10 één keer omzetten naar de nieuwe schaal */
  var aangepast = false;
  var uit = lijst.map(function(s){
    var n = migreerSkills(s);
    if (n !== s) aangepast = true;
    return n;
  });
  if (aangepast) slaJson(SPELERS_KEY, uit);
  return uit;
};
const laadWedstrijden = () => laadJson(WEDSTRIJDEN_KEY);
const TRAININGEN_KEY = "fch_trainingen_v1";
const laadTrainingen = () => laadJson(TRAININGEN_KEY);

/* De trainingen die je in dít pakket te zien krijgt. Zit de module
   er niet in, dan komt daar een lege lijst uit.

   Let op wat hier níét gebeurt: er wordt niets gewist, niets
   opgeslagen en niets opgeruimd. De trainingen blijven gewoon in
   localStorage staan en komen ongeschonden terug zodra iemand weer
   Coach of Club heeft. Dit is een weergavefilter, geen opruimactie —
   wie een maand overslaat mag daar niet zijn seizoen door kwijtraken.

   En waarom dan verbergen in plaats van een slotje ernaast, zoals bij
   de schermen zelf? Omdat je met een slotje één maand Coach kunt
   afnemen, daarin alle trainingen van het seizoen kunt vastleggen, en
   daarna op Free vrolijk in diezelfde trainingen kunt doorwerken. Bij
   een scherm is het slotje juist goed: dat laat zien dát trainingen
   bestaan, zonder één training prijs te geven. Bij de gegevens erin
   niet.

   Gebruik dit overal waar trainingen alleen getóónd worden. Alles wat
   met de gegevens zélf omgaat — opslaan, de back-up, het seizoen
   omzetten — blijft met de volledige lijst werken, want daar horen
   álle trainingen in, ook die nu niet in beeld komen. */
function zichtbareTrainingen() {
  return magModule("trainingen") ? laadTrainingen() : [];
}

/* Datum als 18-08-2026 */
function datumCijfers(d) {
  var x = parseerDatum(d);
  if (!x) return "";
  return String(x.getDate()).padStart(2,"0") + "-" +
         String(x.getMonth()+1).padStart(2,"0") + "-" + x.getFullYear();
}
/* Zo heet een training overal: "Training 18-08-2026". De locatie is
   geen naam maar een detail, en stond eerder verwarrend als titel. */
function trainingTitel(t) {
  var d = datumCijfers(t && t.datum);
  return d ? "Training " + d : "Training";
}
/* ── LANGDURIGE AFWEZIGHEID ── */
const AFWEZIGHEDEN_KEY = "fch_afwezigheden_v1";
const laadAfwezigheden = () => laadJson(AFWEZIGHEDEN_KEY);

/* ── EIGEN ACTIVITEITEN in de agenda ── */
const ACTIVITEITEN_KEY = "fch_activiteiten_v1";
const laadActiviteiten = () => laadJson(ACTIVITEITEN_KEY);

const ACTIVITEIT_SOORTEN = [
  {id:"overig",    label:"Algemeen",     icoon:"fa-solid fa-thumbtack",       kleur:"var(--blauw)"},
  {id:"teamuitje", label:"Teamuitje",    icoon:"fa-solid fa-people-group",    kleur:"#8b5cf6"},
  {id:"toernooi",  label:"Toernooi",     icoon:"fa-solid fa-trophy",          kleur:"var(--oranje)"},
  {id:"overleg",   label:"Overleg",      icoon:"fa-solid fa-comments",        kleur:"#0891b2"},
  {id:"klus",      label:"Klus / dienst", icoon:"fa-solid fa-screwdriver-wrench", kleur:"#65a30d"},
  {id:"verjaardag",label:"Verjaardag",   icoon:"fa-solid fa-cake-candles",    kleur:"#db2777"},
  {id:"vrij",      label:"Geen training",icoon:"fa-solid fa-ban",             kleur:"var(--grijs-donker)"}
];
function activiteitSoort(id) {
  return ACTIVITEIT_SOORTEN.filter(function(s){ return s.id===id; })[0] || ACTIVITEIT_SOORTEN[0];
}
const LEEG_ACTIVITEIT = { id:null, titel:"", soort:"overig", datum:"", tijd:"", eindtijd:"", aanwezigheid:[],
  locatie:"", notitie:"", heleDag:true, herhaal:"nee", herhaalTot:"" };

/* Een activiteit kan zich wekelijks of maandelijks herhalen.
   We slaan één regel op en rekenen de losse data uit wanneer we ze nodig hebben. */
function activiteitOpDatum(a, datumStr) {
  if(!a || !a.datum) return false;
  if(a.datum === datumStr) return true;
  if(!a.herhaal || a.herhaal==="nee") return false;
  var start = parseerDatum(a.datum), doel = parseerDatum(datumStr);
  if(!start || !doel || doel <= start) return false;
  if(a.herhaalTot) {
    var tot = parseerDatum(a.herhaalTot);
    if(tot && doel > tot) return false;
  }
  if(a.herhaal==="wekelijks")    return doel.getDay()===start.getDay();
  if(a.herhaal==="tweewekelijks") {
    if(doel.getDay()!==start.getDay()) return false;
    return Math.round((doel-start)/604800000) % 2 === 0;
  }
  if(a.herhaal==="maandelijks")  return doel.getDate()===start.getDate();
  return false;
}

const EVENTS_KEY = "fch_events_v1";
const laadEvents = () => laadJson(EVENTS_KEY);
const LEEG_ONDERDEEL = { id:null, naam:"", type:"Oefening", doel:"", duur:15, aantalSpelers:11,
  veldGrootte:"", materialen:"", beschrijving:"", aandachtspunten:"", tekening:null };


/* ── CLUBLOGO (ingebouwd, vervangbaar via Instellingen) ── */
/* Het TEAMTAKKIE-merk in twee uitvoeringen. Op de donkerblauwe
   balken moet de T wit zijn en op wit papier juist zwart; met één
   versie valt hij ergens altijd weg. Een club die zijn eigen wapen
   instelt gebruikt dat overal, want dat is meestal meerkleurig. */
const LOGO_OP_DONKER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAABT40lEQVR42u19d3gc1dX+e+7MzvZdybLcwKbHCQ6E9tFCkUyzKQZMLEINJCH8QiBAIIUvCbJIJQQCgfBhIBBCcZBoxhg3sGQ6GAMBjOnNxk22yvYyc8/vj5lZjVa9rIq993n20a52d3buvec9/ZwLFEdxFEdxFEdxFEdxFEdxFEdxFEdxFEdxFEdxFEdxFEdxFMegDGYCMxUXojiKI3/U1ioOoChFoBRHcdjAsMAwp3qOtvu8eeEcMurr1SJQimOHB4YA4Fmx4kzx6qtv0aurvtRWrvzVlNv/VFoEyvCP4qIPBzDmzJEgYgIQWLz4pEQw+AsjFD4KDMAwAI8b1NL0uSudun33L9+754PvXbaNbdULkCDi4kIWAbI9AoNBJAUA17LFJ2T9oZ9Jr+94uFxAPCGt3SAwJDRNgccN0drypSb1u8Zt+vyfX55x3sacjTJ3LqOmRhYXtgiQ7QoY3qefPiYZCl0tfb4ZcLmBREICYBAcRjoBgAQkQ9MUuDVQpHWLSKfuKPnqk3lNZ/9wAxeBUgTIqB7MwlxhExjB5csr4oHAVbrmPhmaG4jHJcAMIgVEnW8HM8DMYDYlis8Lam3ZourZe8fEm+ZtOeHUz4pAKQJkVAPDt/zpI1L+kqsNt+dU9niAWIwBkoAlMYitbbC2gh07w44XzAyChKqaQIk0R9R05l7vps23RauqPi4CpQiQUaVKaYsXH5YJha9iTTuDfX4LGCxBpHQEFQCGhCBT2WKWIAgQddwfKRkEA4qiwu8HRVqiajZ7fzCy7R/NJ572nsOYZxAVgVIEyAgAxpo1jJoaU2IsWvTtRLjkZ6xps9kfBOIxBiDbbAxukxKwgAEAPp+ANIBMBvAHgFgMYDZAEABR+y8RwDABpyoKfD5QrDWpZDIPjmnZ+vfGk05/h21pVldHqKoyihtVBMjQrlttrbDdtQKA75nFR6a8oSsMVZvNfj8QjwOA0d7GcKhNzKa71uNVAIYSj73hikZuVrPZT1MlJZcYLq2KA0EVsRggpQGQgCBqU79y1zNtFCEUBP2gaCQlMumH/ZHYP2InnrhKFoFSBMgQ2hcEQIDIAMwAX3Dx4mPj4dDPDM09k71+IBYHwIYpMQjI15IkS4BNiQFAicX/64nH//rUsZX/qQR0+7pjli49sCUQvMJQ1CoOhbQcUIjyVC9us1EACUEK/H5QLCJdeuZRrbXl1sTMU56X9v3X1QlUVUm0F0nFUQTI4AGDARFavnxm3Oe7Qnq8x8LtBuJxhyolrJUlp5FtSQyPAmaIaHS1J5O85ee33/5wTV1dpp0dY3F7AhBa+tR+MX/JlVJzV3Eg6EE8DhjSVL1sidJOZZMMtu7D7wcScajZzBJvNvX3eMWxi2XbnIpBxyJABjiqqwXmziUQGQTggOpq39ojj6xKe72XGj7/gVA1IOEABjmX1TYbWIIEw+tTQIASif7XE4ve8NRx0x+2JQZqa5UOXN2hFhGAkoVLvxkpDVwhXZ6zOBT0IREHDEMHs9ImUdj5xwaKgN9HlM1ApBMvuKLRO87/1a9r71y9OlsEShEg/ZUYAkAOGBPmzRvb8o1vnJV2uX4i/YGpkAykUhIE7mBjAGagzykxiCDisdWeRPLWn//fbfNzEsMk7u7VnTygjHnyya9Hysou0VXX+RwqCSORALJZA7AlSjs/seUhYwNgAZ+PAAkRj73lSiXn7bHm/QfWXnpprOgiLgKkz4Y3AZj8yIO7bx630//LaJ5zORCaCF0H0mkDzGTaAnkSw2l8ez0KhAJqjazxJuPXL7qucn7lym4kRh+lWeiRR3ZPjJvwY92lfY/D4XKkkkAma4BAIAjbNGmnguVA61agCFA08okrlbx753Uf3PPZ+ZdsYfveABTtlCJAbNuC0NAgUFmZZyAHLjZU15kcCIaQSgF61rCkiui4dARLnbEkBqDEY2+rscSth97/rwdW3ndfqtcSo49A2an2Xzttnrjbj3XN+30OhCYinQYyafNehX2vzvtkEygAw60p0FwQ0daNLsOYH4y33LHt+FM+Yqed0tBAqKiw0mF2PDWMdrj5VlcTKioEGhvZdnsSAAkI/7JlMzLB4OWGoh7LgZBAMgHouqme5AftmOxotwQE4PcJgKBEIm+747Gb/nXn/80/s64uw/2VGH0Eym7//ve49ZN3+ZHu8f5QhoK7QNeBVMoAWxLFefdtdyHBbOZ7+TygSGtcyaQX+OPRf57/1JIXb7v11nS7G66tVVBebgLGBAsXAbI9GNrTphHKy8mWEvbED7nxRu9706btk9K043Svd7b0eA8wEwjjlku1i2g2AwCZXNrnEzAMiERitSeduu3nDSseqqmp6b2NMYgeNgIw5d57Szbuscf5utt9sfQF9oaUQCJpE7QC0cm2SyuNRQgFPh+QiEFkMh8Iqa9ySeOVYCz53AFLlny4NB8wO4CEoe0SEHPnEhoaCNOn63ZgzrYSSp94Ymos5D/GcHumSxL7s6rtzsEQkNWBZML2SAkQqI2sqS1xEJAgoSAQADIZKInEi9545KZ7jj9+QRVgBuJqWUEV9d3GmDaNHG7evn0/DyjnV3/P85+jLjhL9/kuNby+A0DC9LjZQOhsSGt+gIDXTXBpJt1HIwYZ+qdCN950ZTLPadHoi1c89NB719kS0ulQaGgwpbNlyxUBMhJUprnTCA3lhIoKw94UGxAT5s+f3Fw+5iBdcx9lKK6jWCjf5FBQAwjIZs3UDiLd9FxRR1XE9AKZhEVCgd8HisWg6NllWjR+a2rGcU+1iy0QDcj4bhNQBEjZ9+vlxWzqjz5aPeXamtOTHvdPDI/7aGgeM2ZDFhByEpLyf0ZaDAEQpMClAS6X6bWOtDJBfiCyxmsuNl4NxBIvTVm16sM3a2oSMv9eGhoUVFSw5SEbdWrZ6AKI06iuqGCbCJyAmHj//Tu3TJx4RMbtOtIQygGsqNPY5w9C00wpkU4D0jDavpYHinyJwZBwqQp8flBra0bJpB73Rlr/Hj/55JekTcgPPzxgr9TEJ2qnbimbeLUU6nh3vOXu9PEznxxgUI/A3C7qH1i69PiYP3iF1LSZ8AeARMJaCzs673AR59DKVt4X2HxBJmA0DXCp5qcjEUlsfCGk8Y5Ipl/zZrMvjm9qevfjc87Z2gERtlo2SqQMjXhA1NUJlJeT06h2AqL88cd3jQSD++madrihiMOZlH04EAhBVc3y1UwG0HVpcWI7vtGFXZF7btZqaJoCtxsUaW1W9OxjgebmWyOnnPLfvLSNvuU35QNj0aKvNZaUXKor6gUcCAbBDGSzEMn485qennf+g/+pvfPOO82gXn296pSS/XVf+xcuPDI1Zsz/M1RtNodCdnReBywpKqir/WhbIVO6WPorKXC5AM1l7koyDpFJNwpdX0MsV2uGvsoXTaw+fdF1X9x15+osjyIpQyNWOuRxTAHg+Msuc79y7LFT0yH/UVmXtr9U1P2ZxFT2+33Q3G0SwjAMgNkR8KN2XNE5dXPTzQ0nkgAJeDwCLhWiteUrJZW8p3zjxrs2nnXWulyGrEkUss/AmDYtF/Are+yxrzWXl18tNffZHAr5EYsDum46EUgI+H0CAlASsTfdqeQd09+rf+Cpi2sSAwBKh3r4kgULpsVKx1xqaO5zZTAcQCYNpNMMIQwQEVi2d1JwXkZxLnLPDJC1hjCdAS6VoGmAogBGFhSPp4nlZ0LKN9Vs9m13Mv7q+C++eufjiy/uKGVsb9kIkDI0bL9bXU0575LpNpT50mHnRx+duC0Y3DvrUvaVLu0wSWJ/FmJ3DocFiADdkhCGYX/fViva69XOoFnbEwmGvaEqNA3QNCCVhsik39PSyft2/+CDu9dedFHTgGos8qLyJQsXfjNWWvpjXVXP41A4aHJvwwaGakk+3dJmCB6PAlVAtLSsdeuZu8rXrf3XunMuaWYbKA0Nssvot7kWsgugMIgkAdhpwYI9N5eMudBwa2dKzb0HvD6Apclssro0DXe2t0W0yzPjPBFMTruNpIUqghCWWuYyP5eIg9LpRsXIvk0Gr3IbmTe0ZObdy2644aPrVq7UueNchkU1oyGVDAC6AsNBt9wS+mS33abGAoH9pcu1v6HQvkzK3uz1lsDtMRfdNqrNrFY2VYIuVCY7F4py9RfS2jRTJbABQQRqjYD07HtKNrPSlUkvOOmuu+ofsT00/c1VyksRCT+9YN9YSfnVhqrO4aCl1tgSQwgVgSDQ2gIy5DYeM6YM2YwZxwAYIILHbdemf+7KpP9VvvmLf24447z1PYLXjPpzb9S9A6qrfe8fdtghhsd3VMblOppJ2Zd93jK43YA02tafLW8d2duXV6/SGVXZdoy5BwxmBS6XJWUEoGdB8XiWWH4kdP0dYcg31WT0rbLm6DtfnX32hg5SxnZioA6gwqXxFxYg1SxQ0x4MAPCdOXO0hnPPnRILBqfpLmV/Bv2PIdR9oYidORCyFkwHMlnAsDkYUQ5P1MN9Mxwi3/L/a9ZmEAOxGIRufCmkfFfVjXp3tLX+zOrqt+9a7dCPBwIMS2IIAMGlT+0XC5RcKhX1HA6FTWBIaUkMqPAHQdGIJGk87W1tvWXy1q1rPt15ygW6z/sjGQzsioxuRsZNaQdoLhUeD6i5aatq6PeVxJrv2Drj1I85TzLMmTNHWVZVtW9kzpw3ubpadJtj5QCKk2ntctdd4zdP3nV/3eM+WBfiULjUaayoUzgQML+XsQHDBgjtVVrqjtTsHDHY3jS2vqdAcwGqam53KglKpVpIyk+E1N9UdP0tNZ5cU9bS8sH6887bOBTGChX64t988PbSjeGJu8d84a8bqvimoYi9QcrXWVGmsC/ggcsFSAmks0DWXmyrUNvWgbtqapCrzmM2F9tSs8hyS2ougAQQi4LS6c8Vqa92ZbMrvcnka/t8/vma5y+9NCbzxXhdXf/ykBy2CQEYu/Sp/VrDZVdnhTKHg2GznsMwdFNJESr8AVA0wkom/Yg30Xpj/ISTX3Xey4Hz5oXfmzr1grTb8/9kIPh1SAmkkgZAJlBcLhV+HyjS0qpm9Id8TU13Rk4++S3bTiqbP39C8157veWJRM5NHHPMMtTXq85AaY9OkTyXOQAcddttgXf23HPvuOo+2HCpR0vVtR8T7c6hkIAQpg2YTbdXeds9bM3XWVXpcG7bhn8bYxNQVQGXC1CFqa0lkyBdbyYpPxTgt9V06vlkxfQHLCWCRwdAqqsF1dRIdeXKPxuBwAWczozjYJCgKKZum9VNCSGluZCMNv0W1LaAuTlTvmHNbSoFE0iYnMcCG0WjTIbxhZD8ttD1F9zRxAu7rXzm7XdvvDEuOwtsDSR1Ig8YwWWLDkr4Qz8xVO0sDoXdZqET62YViVARCIAikSzp2ad8ra03JU488YV2VX9z5khnHOPQK6/0vjlr1plZr/dS6fcfaHqJkhIkzMIrRVHh84EizWlFl3WeeHxe8rjjXlAaVvwys8uuf6YtjZvHfvHFEY1VVR9bKS9GH+bmBEwH1fj86mrP0wcdNDXi9R8kXa6DDUH/w4qyJ/t8QVMtY0stywJsqcUMYe6ZXR3ZiWRpfw/s8JoBBAFVJbhcgN8PatycmPzJpzt/ec45zd2qkyMGINZNVtfWar+fMuUzIxSehGhM5sJuzJTTXXOimNrbDe2sP9udSG3qkstFUF2ASwGyOigWS5GR/VDo+motm37JFUus3vPNNz94o6YmUbBIb56hG1i8+LBEScmVUlFnczCkIBY1VSmHxEAkklVT6Yf9iea/RWbOeqNbr1hewK8WUM5fseK7GZ//MunzHwKhAIm4tGwrQJAJvmgUSirxpKGq/8NuzwRoGlE8/u7EDz6o2HD++U2YO5f6ndLeC7f7hPnzJ7eUlOyb9XoPYVX9HynUaawokzkQNKW5oVuu9yyDhGEltZHDCdC1i5lyMSrTy6m5mTLJxsmNH0/78uRRBpDLbrnFffshh7xteDx7IZ1hkBCdMmhyAoM6SgdhSQdNMz8fj4Oyma0k5ceKId/QkumVpcnYG+tOPfVTYfKswgCiE2AIAL6lS7+dDPh/aiiuOQiHCdEYwGyqMoqwOo+0phXDeMy3ZctN0dNOe71P7uKO1Yzke6bhtHTQd6l0u6dbXRkZDMMEClT4fEA6ZXr5GAZKworY1rj8PzffMrNqzhwM2lr0InB76PXXB9d84xt7pXzBgw23dqAUtB8LsRd7PGF4vCbhZ7KmpGFp5FQGM7OB2rc/ckgcZobbTZRJbQ6tWfP11gsvbBldEqS+3vN7r3et4fHsinRWgkjkJkp5ng070Y0t6eCy1CU9C4pGMyT1z4SUb7p0/TVPIvFa2aZNH376gx80dhmlLUTyXH6HxOXLK9LB4JWG6prF/gAQjQJsSwzVBEZrS8qVTj9UEtt289aTTn9H5l2nz3vFLCCEAWaz4fWyZSemAuHLWXUdn2sUYRgMAdmWgUwAoKMkrCqbNt7NRx11kexvHGWQ3Pd7PfHQpE2+sd9Iqtohust1MEj5Fis0mQNBBapqOWgy5l8zv40sj2WbKdMGkMaJ69d/Y8Ps2dtGFUCufOkl762KslbX3Lsgk5W5Ih6n1FAV02PhcpmUnkyCMpkWYvmxkjXeUNLpFwKx1lcr58///JGOiXFDE4F1BNcEgNDKZ4+KubyXG5p7Nre15zFtDEW17IHWhEina0PNTX9tPfXUNQMERo/3FF6+/IioN/Ajw+X6DquqF3o2T7cnM98sGFDdGzdel6k8upp7Y7QXIgBsqlXtiO+k6mrfi/vuu3syEN6P3a4DdEU9gBXxTVbVMvYGAD1rSkSizgCyder69V9/f7QBZOK8at/Gb81cC493CjIZM0Kd/+NGppUkrxeG8Zaq62+4M4k3Q02RDzr1ew9jdFUA8D6z5LhksPRyVtSZ7PEIJJM6GAYEKVAUFV4fqLkloqZT/w5FWv7RNGvW+znXq9U3q5DgJQBjH3tsj61jxz7B4ZJpSGXs4B5yNpwQBjyaW23c8v/06dPndRlIHArQdGP8E4BdH310XLPPt0da0b6e8vsulz7/t5BJy1zuXA4gya1T139VMICohVoDGQlQntVtTV1KBIJCbWlascfnn5939I03Nt61enVWB5AC0No+DoGcdBjank4EALs8/ni4ubT0+KSq/jQ+bty34fGabX1YAoGACpBqBRpb1diWB0s2bvjb1qqqj7c5gVHI+7av/frrLj7wQMP/6KP6Vo97ErJ6m+0myEz3IAJ0qUIy9PLyO3zLFmWSRPfycIDEJGKjg5QBiBsaiCsqjE+JtgDYQsDL7obnpqS8HgsgEN16vQZ5FA4gXq+jPNVpdxBDIQhBGz88++wNHzAL1EFBeV4agcPgGwYOByLiCNG3paJ8G9nss9oXXywQTEKqIrdmQgiFmZpKtzUu3Pyd73zRaAN77tyhBfSnn0o+8EBWystv4rLyMbR5iwFGgjLpzZBGk5DGlwrzZ0KXn5DkdZKUZkrq8V45CYYOMNxByixerLHXa2Qg8/LAhm4UDiAeDzmD321BIlOHlIZBkpmooUGgagh04T5uGANoPu20RQAWdaeHMoBNTmAMB7CrqoyKe+/1uCdNXmZ8/Ond4Wxqo5ZOb529vqHxH5ffmjYsdj26CjGIUV9voLJSx4rn9C5dvwWelVrQOTIshZDbouGMnMtbELUFgEbisFys3NDQva3W0CCHVeIBWHnhhSkA8wCg0frfrTZDevhh034DgMZGc70LZRcVBizULYcajQBht7v7jKnuJj2SuJhTVx7pw27ZM2cOY+5cWBKNR31PXmH1787v4d1Za9fRJEGKXZWGXtVq97qmZvuaH29HEqTDDNrVZAA9qVZsR5AL4J0agWyAKc9YHsT5j9Q55ysU3Ug5Sd1J+Qiioxkg/VtWGm3qzeATzA49/77wlhCC2DAqbRBY9XrtpAf3YBezICLJzDUAvgUzNKIBaEt4NB9OjutMT5d5D3b8sGH9z4DZONr53HC8Lx3P2fGe8/uG4z7y0+NlHnHnT1o6vksAviSi/1pSA0TEzBwEcKRTE8+TCORYWZH3vuL4a7+nOp4rjs8Ix8N+7bI+b39OzbuGmndt5/3Zc7Xfd1IA5b2WALIA0gB+S0QtzEyUH+zjbgwNwmiWINyfN+3FOBjAjB2EDf4HwFl5BLULgEU7yPwlgD90DYJu1HEGhO7l0QeQ5mZgyi7dqcTcA3BSDi6vDLMbgAr0Hd3ag0wn72Wt/6udWHCDpcwOV0GeU4IQgJZu5yc7u1rbC6mqNOoAEtI0amnLBWpnVPXGSAdQ6gCGsp1yTqfK0xWBiX4AZDTNnwGELbXOqTp2VC47xzaFgILZIKJQM2dNI1AnDZbY7PqciyF2zXVW5umtO5z1uQPM27BocCWALZYNxp3TTB6J5CVoYLQBpGclg7vy3hiWoV4N4AqLuxYPddk+waECqAdwOhGlbAdFJ44q7pK4eJQCRLpc1AH5vfRkWV4shYhuAfB3CyT6DkZA27P0sO3KTwGcSUQxiyl2Pmc2ZIelYR6SZSoYQAKq2kkegDNhsUfZKNlMef8VgLctbmPsQGCg7XiubDkhzieiRmZWqdusYsFdppgUONWkcBLE9CxQh602S2vtGp/upIiZ1kiUBHAOgMgOaI9sjyAxLOnxMyJ60QJHD9qBzMvrGzoSGHobhJkABvfCqnCoWu8CuNi63+1RivAOYqTbbu37iei23oGjqxXj7QAgnLfNzHCURPbK8LaMdpWI/gPgz9YC72j2yPZid6gAPgRwKZtdXWSvKYm5I8vgwgNFFH5duCsO0JeZGZY98r8Alm/n9sj2bHdEAXyXiCK2htA7TaSrkEDhpUhBAUL9mnTX9oj18nwA69He/cvbAQFtz8Cw7Y4riOjNno3yjgTQ8fiKNiqTanL0RdKlqnbsuu5snyr6RhQOe2QTM58N4BmY0dfOosw8CETKAyRsO1lwqAixJ2bRExFRgd6z4x13EtE9/bI7pGWkc+dTH5W5WD5FIYC7y6/p86Qc9sjzzHwlzKpS7oQQC5U71R+9u79SmvoAjqEEY1/nr8AMBv7EsjuMfjGArjTy7aIehAaPDolIt4JKtzPz82ifts1oS9t2NMTO/bAz7RqO95W8h4r26d72w5k67kz5VvKukwBQCWCWQ70ohIplAzAG4PcwXeFutCUBOksDnOn6Ojqm7uudfC6/bIDRPlVfdvJbznuTlpT/0No3ov72rWJ0rizwKG3aIBWFci1M8ruzmx2QeAAgkdZivzNilW/mWwD8y7KZ9H6udXfcxAZeM4DZRNQwoo2RgYCjRx4SHK0AydtgJwMYYHaVVVQkhkhdon583iCi7zGzBHBBP0HCPYCjCcBJRPQKM7sGyfYabGcDAZA04I6HXWYmUmA0GunubFZ0zANg558BbwyNhKZn3XBMSxW8kJmjAC6zQKL0walA3YBjHcwkv9WWXZbF9jrMw0GHJa9g8N28c+ea0/D5QDCj5h22nwBJViy9p55To3TYrmkLJD8FcIPFkHp7elVnkXQbYB8DmG6BQ+l3NHo7GaPSi/XFhg0kd9m1E9jbLXupIOYVM1MBCH0gaiAsIv6FJUmu60TB7M1v2CraOwBmEdHnA0rVKNCaUiGainfWQ22IJErBANKUSBTOIhjqDeqeaAhmUiV3AxI7hvM7Zk4DuB4dG0p0J0F0yxv0umVzbOmN5LBsNB7oWhVsTXvfjZ3aaevkOHAJo7VxXM5I72L+QnABCFYlomye8W7XPg/qRjuuxT15aRwgUYnoL8zcDLNNqE3AshuD17DAsRTA2UTUZIHD6AkcQ2mj2fO3nAV6j2vtWK+RnEZQOICoqhUo7ALhUlKfOI1JadwDp7yRmY92GLLkIDIw99jtuEN7O7RvGZAfV1AsledSIsp0R5QWMegWSO5i5iSAe63rZvN+w6lWuQE8CeA7Nvh7AQ7VijucB+D7aEsUzI//dMaCBTqPGQEd/PW5zwmY+XIagJcB/NgCTOcAra4WIJITH6/dLyXTW5vOOG993872GLpE58IBJJPpXILkXvZBgvRi4SzudZ/lLRrKcSiA8cxcRUTpnji3RbgqET3AzNsAPAHA08XH/QAeBPADBzhkL8HxUwC3DAPTvcSKU4numN3e06ZpH4+f8Dd3PHqxw7nDvbJBhlDkFD7dvcvRu2x3MNPUu+8O7llbWw7mjmW8aJentRrAL22IomM0eLAezkZyWZgR80eY2d0tcXQEyWIAZ8A6QSFvUYIAbiaicy3gUR/AcZEFDmfUvLeP/qyHLQFriOgFay86v9eGBoWI5Ac7Tbo96/NXeBOtrT3TUWd16m0UEhmVEsTrde5cZ6WRPfMB8/Qj4/MXX7yKdDmFiL5vpb13pmLYJbo3AZgN4BAMLBeq19aWRYQnA3iYmb9jqRu9kSSCiJ5i5mdtoDs+8j4RXdmTfdMJOC4HcDPaOoYUOp3ITif5AMD13dZ5MCsg0rVlSy5Kjx33A2ptadGFqvaK1XbTOk7oesFkSuGIJ5MxbRDuAhe9O/5YTnnwwdKM6vpxOhg837do0T4Qwsi1+e/EaLY8O5daXG2olFW7iOtUmF0Sld64R21pY5UV57+X6q0XyQGOn1jgkA5bouD2ufX3p9Y8Ogezxez8ixdXZMaOvx2JhARLSYZF3HPn9jdHiwqZ7j5MBVO9mo8gIt60004/Zn9gHLtcSjIU+gsxm+dfdE5whiXeXwfwFwxtyyAbJGcAuM+SBtRLkPRrg61ovQ2OawDchrbkwaEAh+2ouJ2IlnXpXbP6Xe28cOFOyXDJgyxUFVIKgFyADw4bpD+kRaEC5mIJDMvg3nit5B61teW6x3s5MhlGImnIYHiGtuzpY0AkO5MiDlVLAPgTzPLO4QDJ2cx8lwUS0QuQcH/AYTERnZl/AeCPyJ0pPiTgsKXUFwCu6aGEVoCIo4HwYbKkdBIyad0+9JiVTM/3Siw6nREV3gYpHEAUhUCddDXp5X0REX9RPv4qWVo6DtmsBBHgciHrD89lgCwpQl0QGxFRHMBPht7vkQPJD5n5HxZHFYMZ4beupVgS83cwA4/GEKpV9poSzCrBSJeqlWNoqkowDIawk7x7yRi4q35Z9s5GRyFAOiCjty5ukxONW7BgNz3gvwTxhM2pFCQShgyPOcL77LNngUiiC2+Ro7DqGbQ1njOGASSXMHONBZLBLGiyJcdvAfxmGMBhz+ceInqiN4FLWJ6LHNM0IwB9KQrrQoIQMCpVLDOS3hEsudCd0fmk6+qIiHhbaWk1B0JBZHWGEOaySiYYOqc93uuOvvdej+nd6JIzG5bY/w2AT6y5ymEAybXM/EvbazUI0kNYDOD3MPO6hhocNsPaAuCXXfbT7WS0pOKireEbAIJg3SV6QaXUJfNlptCoVLE6iBBu90p1uzoSa22tgqoqI/T00/sbvsCZiMazIDjPWhdIJHUOhnZ/eaedfgIiibo60Y1eT0QUBXA5hqfpnC25/szM37PjNQMEh2TmnwP49TCAw6la/YqItlrSrFeMp8TrZWcAA0RMbjf3mZTaixCOjUo3r8hS14KS4VJcHVn/nDm8d3W1Fg2G7uLycR54PS4IhyQiAH6/C243ZcaU/dW3cOG3UFVl9KBqKUS0CMC/h0HVck7xKvue+mt3WOAogdn+aCi9Vfmq1ZNEdG9vVau2SThbiNpPkr2TWe2W05m4WFimV7iCKbiR7kz9yeWn6h09V0Ryy/33l1Eq/Tx9+NFSCApzMPB9KIoXkiVUl1Cbm+ZrTO+yKkIuVS3tHW0xAbgawAkAyh2cdyAE39fvJAdpaRWYR5YJDG0FoS05IgAu74tq1cY08yocelvwQCzbPpunqnNhGUThoqxCUC4tmTsBv5KXi2V5NLaed95GAFcCwIGAa/Urr86B5vZCZhgqoSTVese2E05+rh3FdR+xttNQGpn5VzATBIdyOLNyB6E2e8CH6dAAv/d7qxZF6bM07JCgSgC8vfFidWwf5cDLqDxhCrpO6K9r8/XXXYhGeV08PpnAAZZ6jjbS/kAJ19erSCYVzJyZ6WUio22w3wczb+poBxfuSu10dkaxM1YDaDsJaag492CPGIA42h+2mX+f3Ilq5QGwCsBNfWwb6mSaHTNXk70RrHbz6s66mhT2hKkhbPvTPmtadte9euFCAzU1kpYuZTCEKV4JIAEY0kDldB21tdzH7ozS4uBnABiL9v19u0rpFnkg+SPM9PH+uG0Hq/Kvv+kzdkXinTAPzLRzyEQPv2HX06gAWvtrQ3WlO0EzuPfAsraBaYBLMRIA4najrV0kdeCjLLnHhc4kEjpCYcPsHmSBRA7sQAhLvWnsp6EcHyHSYCBr0EJETcNy16xwv4Sq7AS/Q7QDhTsnPZulLrfWTJLgPhMDdWLo9cMb1M91GqgE4E406IFeayBr0K85Dch+Yik67G1G6Xk/RCfTbpPzo7izIvVq1l0Oj9LJ4pE6GBKkrwTFVkHWYKhJXOiV7dnkJbbnNJQCRKH8g3B6Z6ODSXRppAMQPu8ojIO43abrlrvYX+7FETp2TYmz7aSwuNCcYVESxCAAY7jbHInh+mGj3+xBdrKSo/wAHZKSkTvqmTswPwnZ4wzT2azZ+cN5+KchTdulblj2uHja7oBWj2S72AcDMLTeGOndyGFiREYtN+Gu/9eL9AROp8nScUaIbTxiBo/cPe9ev82PYYz0UbDFYjPVhLrcX9nz8ni93o6HyEtjOJdVDhNRF+I6wwAQ2bHLTW/qQTqjIxoakBWQm7gHvNGcyVCHoxM0ZbQSyEi572FjMEp+6IjRdVZ3b2+7wKkmhQNIzs3LnZOKlD36a0nTTDvGGfooHt9JGKXHQxvsOInTzLXuJThEF11NzGze7cyjYR4bIntxiCfbjR/s7zEGHCjcTqQAj8o5kJTtsnm5l80DpRw2eVjAdHdBnTYd7pMdk3cNIijCqqcYvW7eHVbV0w1DNbUB6hv3F47E5Q4nSTKNXoAMDr7ZyUmy4CiYFdzZPBzemJGi2owuFWv1agFmxaVoyfZuXpYikzbFQ7dtf2R7SuChW4LCEZmUvemD20tisCJDigI25J5EZODii7NgVlBdLbDjjdHhqDA7YSo46KAsERnJeGSsFSR2FHX4ekFL3c2YgALW3BYwWXHgXFALBgUYDNOeF0ilOBkqvUl56cWDSjZt/us2og+t1upma58hTp0ojm6AYbb6MQgwdnnkkV02lo+7LKm5f4hUisEgSAYIQvP7VUuC9CJHLT/d3Qo6J0ZlPYgiYRvi7ebVexqWUirQXD4QmRF0w1BZUfz62PKLtrm0M9UXX7hnzJbGW7YQfc4AUF+voqLCGKFA4R0EHIoNjLH33jshstdel3ypeS6VgWAp4nHA0AFBBoRZX2M6YvoqQoauvUDhUk2SSTaj5Z2ZIgxqa3jcccydy2CmUGPjJiUWqyVmiaBfBZhhGDpaIjoraig7tvyKLTtNekO88Nzvdv/3v8ehslIHEVsSpRBchYoA6WLYjfyIjKnXXx901ddfvfUbe7+RHjP2t1IopYhFdUjdAJGE16cSCSiZ9IOlqdWbwEyoqZHdcEqj8+U3l7SQXU0Kmc1r5GaQH+xjAhGFu+QDlgR4D4gJ4Mzxy5/+n63pkp8bHt8cdrtVxGKMrG6gNcKsaKXGuNLffO5yf0978fkbd1v70j0fmJ1Mcl1SRoXNNloN/NpaBXPmSBAZtYBywYoV537k818jQ+GpSKWASNSweCTB61PAgGiNLPE1t/wxfsrM598DANR0f8Oa5u60x5r5R4yu3ryWN+LQeHwjMX8Fl8vszZ3zQEiBbBa6UI74zpw5CioquiVgySw2HXfiKnn44VW+bY2VakvLQmgqwe9TwCyg6wZao7p0eyZnyspv/mifo1b5nqs/r/poqFbHE+qmTeloVLGG7vSY7lUpAWaBqipDELFv2bITv/viSy8kxo37l/R4pyIaNZDNmuDweBT4A4qIx14PNG46HUccNjN2yszne6zNqaiQBIAFHQbDgKOU0HLaCEDK1t0/21qwgpDBlyCWivMcUUo898ISo0T7CdJps9mYLU9SKUB1HbDkoot2B9FHqK4WXYpYq4OiBBAnahBAg++ZZ2am/cFrDL//SBAByaSBdMZAOgPp8U9NhML//t1fXr3Um078KUX0BAOGZTgSRvDR0cMmBfoyqqsFpk0jEBkCQOjZZ4+K+PzXJNyeGVBVIJ4wGR4JhktT4XZDNDW960rFb541b979dXV1GTAT6uoEuivftU6hKnl8/uQWQUcglbQ6xDvoQtOEiLY+v/Tyy9OoNW2f0WGD1NWBAXjSyUcolbR+J9fehGBIgwMhNeP1Hm9xCtED6KTdsFoyi8Sxxy7mww45yrN1y3dFPLYafp8Cj8eUEum0gVjSkP7Awckx5Y/TKy+v9C9Zcpwg4ly70v67hkeCHSGGBSC2y7amRlJVlTF28ZMHiJdeqm0Nl66UofAM6LpEMmGAwNA0BaGQKpKp9d5NGy8/cfmSQ9LHHvvPurq6DGprFRBxj6qvSROUCI2bweGwD4ZhQJDZKcfsliOQzUBLJh9loGCB48IApKpKAsCJzc0vUSLxETRNtBVIsZW+zsgq6kyyRGkvr2s4gEKp6dMf/u0vf3Goe/OmH4pU6gOEQgpcbgVSAomEgURKymD4qPiECcvEK68s9C5deggRSdTUSDAr/YjCbpdnuvcKGERMREbZE09MVV546Z/byia9opeUzmHDYESj5slUqqogFFZFOr3RtXnjdbus+e9BqekVf3+qpiaRc5z01iY01SvOatrJud4GbeBgaJqgWGzrbk1NLzpcXaPGi8VgVuqqqjJkGM/A7WKQPQEyfzeZAAs6onzBQ+Mtzk59AKDpyq2tVWpWrtTT06f/88hVrx6kbdx4NWUyXyIUVKCqCggS8YSBjM56KHxyamzZS8qLLzxY9sQTU4kod41RRrJyyCSZeegNE5Ex8cnaKepzz/2taeKk1/Wysu8zkQuxmA6CAUVREAqppBsx95bGv+780YcH6kcfXf3ZRRdt5vp61WoKaPT6vq0mghMfe6yMFeXbSKVNmrHTVISQ8HqZWL64tqqqyb7P0eXFqjNL/tzJ5IJEOv1jMJz6I0E3DA6Fw5Hk+OMB3I+GBrsNDfoEFPMcQ7GSKAbgxkn33fevxt13/anh8V8mg8FSxOKAYRiIxcAkFL207OwmzTNLfeGFu8e8/fafNldVbenbCasjg68X/LsWkY67667xrV/72iWb3e6fyHBJGeJxIBrRLXtOhT8AikZTSuPm/4QaG//SPHv22i8BZ0yq7/nXJi0YzeHwdA6Fy5BIGiBSHFWEAJhcmcyTafPzBWtMXji35Zw5EgD23LTpBUokvoRbE2DI9p0pBDKa56w+qVmdbTiRaYTX16sbvve9bfqRR1dPXr/uANeWxttIcgKhoAKQgJQGYgmdhRLIlpVfseXQg98MPLvsIjIdC71ZCxog5x8sA72wqp7ZJJv9K5af2XjAAW+ly8dfK13uMkSjOqQ0e2kF/AoxoG7d9lD51i0HG0ceeWHT7Nlr2VZd7ZhUf0ZFBRPAGZf7JChqe1AzM1RFoUgkEty2bbH1+YL1Wy4cQCxv1jvnnx9XDWMRzC7ejqwzFkjEwZr7mMDChXuBSA4or4qIUVmpwzyWTPni9NM/14864rKSbesPVpubHoaiEAJBBUQqsgYjEslwsHRSQvNeOCLWa2TZQgQASdV9FodLJiAWTUPX2ZQYPhUul1BbWlaEtjVWyqO+fc6Wk056h+28OFt1HYjNQ2R87e7rg1Kh45FKASwd0oMlPB5QNvvStjPO2FhI9arwG255s1yp1JNmAVU7Lk2QrHMwpCVLSmb3ypvVW6AQGaiuFsysNM88dY1x+OHf9W/cPF20tC4Ec9o84YgUZDJSUdUm2j6IuhD2eQSZDIOEAkUBGBnR3LrCt2njyfLww49pnTmzQdbWtgGju2h439Qr+mzyfsdyMDQRmbQECWrjq+YTkUo8yQBZ6hVGJ0Asb9Y3Pv30ORGLfQa3u01XNHutEnQdUlHmcHW1GFRRWVMjHUAR8ZNn1OPbh8xyxWPzEPQTAANEAuhTXIR3JICAWVhlCwYCAXJlk0voiMOPScycuUjaAdiqqsEBRp73Svf5zofqQlvNCJnqlaIq1NISL4/HFwFgNDTI0QsQgFFfr75x8cUJRTceg8dt6uJtpKIgmWT2ePYPH3HIgSDCoHuVTKBIPP20+7fMQtPUtOUuZBBBoE+u3u0hn6r3c7A5t0WfQnXpugkMrVexjL4OKzg47vHHd2XVdRziifY0SiTh8zLp+spNs2Z9CWYxqOAcFp26okIyAFcidj9FowbIrtzP2ZoG+/0i7gleQoUkQK/XuI5IZnTdnZPVBEAIhUYaYY4YSda+uR8JxaUSMebM0QtEKwIAmktK5nA47DcdAkTtWphISVom9QC3ea8wugFiGd+pGTP+S5n0S/D5COxICWBWEE+ydHtmly5cuBOqqoxCFkGpQtXzaISHSCzQIIKDhwzNXDiUdwIQo7q6WtVd2jnIGmjzLLLZiVNzKRRpXbf72rULC+29GlqvTEWFkABc2ey/zEgot5ElEcEwDA6XhGIlJecNmrHeHWD7T7gjQcUaKED6DdSMrouCLYCVgnLD4YdPl4HAt5BKSZAVOzN/VMLthqpnHl176aUxO7q/vQDEAIBdvvrqSYpEmuBSFbT3bQukM8gqygUzbrnFbX2+UJpPWz4PzMYQNDTrNZhxkMIfvspsHchiMTMGhJSGtJM+B7tZwpw5TABSPt9l0NymYCdHyIegUCxq+JLJ+xjIBaK3D4BYMZGPzjlnq8ik51tNqQ2ndotUSnIwNHXltGnHo/eBu37Bo631JUE3jL64sUZCWkrhA4VCWIVnetKphCoQMcXk2oNb3mzFMkqWLv0me30nIB7ndmtNZMDvJ0olX2054YT/gpkG3UEwrABx6Pol8fitFImkQULJVYnYXm5FRdrtuYIKqc5Q+1580tmqacQYx8PnLJj45JO+0jvuCB98yy0hIiq1elIRDAMGGxMOqq4OTbz4Yu8uj99bQoMLeo55PJdwIOACs9HONmeTqSnp+K1kunaHjFENHUCsVPOmmTM/UDLpJxHwk5l6ArtmXUE8LmUwNN29bNnRdtZuYabctrWqqvIO1haFurQBALQIMaNln30+XHXAAe9KzX0KEgmASEMyCV1zV6467ti3N/7oovc2hiffmOP+AxmmQ0aWPfTQpKymnYN43C6ZtnEj4fMKEYl8dMya9x+30liM7Q8gpt5IDMCfSt6OdLq9usMAJDM0NzI+38/J0ksH/yZkO1rRdb0vKtZI6GhYmHqQqiqJ6mpxcKP/adL1r7i8fDKEUMCco1OAwKHSXYgxxZuK3TYoE5o7l4iIIxMm/BglY0LQdQlCWxd4BkNToaZT9yy5/PK0JT14+wSI5cI9/s47nxfx2CvweQVgnVVo5vubUsTnm+ld+tSBhZEi+bpzn7o/joSmDYUiDsa0abTywsqUu7n5EsTjeu7wTNtYZpZQVKit0esjJ572puV56r/zwZIeuz366DjdF/gxkknrNOHc7zFcLkHNzU07RVrudTp8tk+AWByjrq7OcCfT10Ny+9aRBLPhnM8vUr7Sa6hAdNCOxiTvaL20uFsGxqykTj31FbU1+gD8fsV0pthFSm5BkUjj2M0bb2Rmwpo1PFBaICJeN3bs5VwSLkM22z7vCiTh95GaSt73+amnbh4q1+7wAsRKTf/F8w1PiUjkTXi91M6jJUhBNC5lMDDb/ezSo1BVZRSsqIkZqioMMRjENbRGeuEO0Jk7l5mZylqbaygai0NRBZjNgje/j0Qqee+mc87ZCmBgaR6W9Ji8+NGJhua+BLG45bm0O5Yww6UKirRGJzU3/52Zqfv2pNsLQACgoUGpqanRtVTqJiiiY4aJlAyXmzKa79pBt0W4/ZyJh4wj0Qi5VvfzNYlebDn99M9FMn4nAn6ChA5NE9TctHls0xc3Dgqxzp1LIOKNWskVMlxSYtoeTtcVDPi8pCaS9395+umfo66u4HlXIwcgFRUGmOmQdZ8/Iloja+HxiHaHehIpiMWkDIWP8T679PjBtEUIRDkti1lmpQxw4QlTYvAChQyz6V7vS1jbD6UXxMvMTGO2bPkLtTQ3QyUBl0pKJHrL5jPO3zJg6WF6vuT4BQt200PhHyOZNLvekEPtFUJQa0vKs63xFmamwjhsRipAiBgNDcrKCy9MKanEH6AolOud1ZaCwlBUpDyB67i6WlgLNHAuTMy5c0Q1TaiQ63pD/FYPJ1cfCdlwrHPJIO5ZmUXodvlAX8AiuafOkzU1EnV1orGqapMrHq9BSVih1qavJm3ZdIdlMw4M7HV1RES8NRyu5mAoCF1nM60+dyyChN8vlGRifmz27A+tFkFyxwEIAFRWGmAWh69c+bBoanrD9GhZBqHN6RJJQ5aMOcRz5JEX5lr2DNjsYLM/rMfjFVsbP5nQ1PQr7nnTiewIcu+khZ0qo1iPdwA8MRD7wXGmeRTANQCeArDF2kOb4I1e3OMYshoodNu4rapKgllcs3LlP8SWxk88Ut795TnnNJucfgBqqVVDEly26CAZCp+DWFSCSGm3QZqLKBqN+5qa/jCc0mN4AQIw6kAra2p0dyZV0z63xz6miwmZLGf9gWsPv/vuIMxuKQOTIhI63G5WkqmN5Zs2nrr+lFO+svXhLgClEFHWIqa9upE2thplE+x6AH8GcAiA/YnoL3mE3k/hSxki+hsRnQJgGoDTATwCIOaQKp0BxY4fXMDMVxORTkTMuaBcJ/szdy5qamr0sRs3nBf4auPgSA9r8WLe0PXs9qiQktuSZ9oCg2oydnt09uxPhlN6jBCnIwsGSDz/wkqseY/x6iodr73Ouccrq3Ss/YBd9c/+2SxC5P7ZIvX1KgHwPP/iTcra9zm8aNF0+//dSBvV+rsLMy9jc0huPyQz647XrzPzD5m5NO9aYvCWjJX86zHz7sz8W2b+2HEveif3a48FzDzeOc+CexcsO9KzZMmZePtdxmuvm3u9arX5ePV1iTf+K+nlVxsn1NaWWz25hjVFZ/izLOrqiAB2RyO/RCppQAg4OvkCBIF4XGZDpT8LLX96fxD12+3LAPRkMuxdt/5XkZNOWoH6ehWVlXpn9oYlOXRmPgHAywCOs7inc8OcqtRqAKcCOISI7iaiZpuQmZloELkgERlEJO37ZLMLyadE9DsA+wG4GMCHeapXu2UAMAvAC8x8pDVPtVv7a6CEaqlKU+++O5gOl1wPye21ATul3eshVyJ2/aaqqkbUQRTPfLGkAgFQ6+v/ibXvM155rb0UeXWVjjVrWTz//HNsplr326MVrq3djwB0VZRlEZ2wnv+UmbMObmwPw8GZNzLzxcys5XF4GtolZOEkcmYOMPMvmHlLF9LEnleCmef0RpIMaFgS3PXss3/F2g9MzaDdHr9u4J21LF54+e0Zt1zmtuzNYU/wHBkZptXVAnPn8uQFCyaunzjpHXZpJchm2x/gyWwg4Fc8G748N3XcjAftg1r6zc064Uw2UVu6+a0ALm0ziHLS1nC4Sm8D8Gci+soGBgBJw8j1rDkIyxAHM0+2bKGzO7l/6ZjX1UR0IzOr1J9mb70wzAOLFx8ZGzehHpIBaQgz44rsls0G3G4luHXzSdFjjnm6AEdXjFIVy3YrAmLdaadtcCXif4bP276Xr/lHIJuV6ZKyv4WXLtgNQP/6aJmNAboEBwDBzPdb4NAd68QO4loDYAYRXUZEX9kSw1J9hlUlIKtVqCUJVSJaR0TnALgAwFbr/o28eUkAf2Xmn/WkbvWLGQHYd+lSfyIQuguqqsDQLbPcts7ZQDCgqK3Ni2IjCBwjByA2N2MW099+++9i67Y34fcqZiKjRbeCCKk0sz9YHvWXziMi7ldpbicBLic4ADwE4FwLHKq1g9LhCboHwGFEtJSZ1ZECjC6AoluqlyCi+wAcBuAZB0js2JJtp9zIzL8YVJA0NChUVWWsdbmqZdnYqUgmdRCJXI4oM0NViWLReCgT/cVwu3VHLkCIGHV1tOTyy9O+ZPynyOpsno/tMNgFKYhGdVky9jht+dIfobJS784L1ReVxCKSBwBUOcDhVEMMAJcS0Q+IKGob8TTCjUgikpZBrxLRxwBOAHCjw+1rg8Se4/XMfO6ggKS2VkFlpe5bsqQyGy79GeJxs8du+wRqA16fcLdGftd87InvjTS37shrZmYSniEaVv7dmDjxMjS3GBCizSiXzNBUJkOPjdm48ZBts2a9b5Vsyv6Cw1JJ7gbwgzxw2CpVE4BziGjJSLAzBmLIA2DLxvopgFvybCz7eRbAyUT0jMUI+q7uVFcLYC522e+J0JcTJr7FPv8uZiMGEjnSYzbg9SnUvG3VRe+/9+07S0uldZwbFwHSvc5KUxcs8H80fsIb0uffE6mUhCDRVlzFBvx+RbS2vnHksiXfXjltWrY/C2sbpMx8LcyD8joDx3oAs4jozYIYsMNjxNsu7PMB3OsABzkkZhOAg4joM0tF6xsDqq9XqbJSFw0N9xrjJ16A1lYHo7NqPVSXJMOQwU3rvx2ZNWtVfxndjmKDtFO1PjjttGgwEr8YUgJCmJlabccnKIgndFlWdsBLlZXXUVWV0dc6ZUec42wHOJzeHQXAOgAzuwOHHefIv/ZQunmdrum8+xLd2CYqEf0bwJkAMmjziNiq1hgADzGzJ89O6xU4UFmpa8uWXWiUj7sAsZjeDhw2A/J5FVdr83VRExzKSIyYj8xy7KoqA/X1auSEY1a4WptvRTCogGGAyZGSQAqiMUMvKf25/5klp/XFHrE4osHMewH4PwfXdHLQ9QCOJ6J3uwOHpePn8prsazv/V2hwWEQvHfEbctgeogvbRGdmFxE9Yjkl7LnbHUV0AIcC+KslPXpHK5bdUbJw4bcyY8puQzojIaV9RLTltGIDwaAqtmx5If3Cc3/k2pEJjpGpYuWpWgcuvNPz5th9XpPB0DTEExKKELnbNiTD5QKxHh27ZcsBjSee+ElPLkKHUc4AGgAc6VCnnAmBxxDR692AgywQ7AvgM4fhbjDzoUT0ivNzhQQHM5cA2ImI1lhEn7XiHyCidd3dg+Pztk3iVDPt5zNt+6tbe8RiCHv/4x/+9/c/4BUZCk9DPCYhFGEdnWYVQmlMRjZWsmH94c2nnrpmJKpWI1uC2KoWgNWzLk4Et249n9LpNDSN20pk2XT9ZrOSPb7QttLwQ/vecIMfc+b0lNBoB9Eut8ChO8BhJxye3QM4FIswLwDwBoBHmTlogeNKAC8z87PMvFOf1ZO+Gdxg5j1gprm8xMzHWsS+C4AVANYw85nWvXYlSbLWPP8O4GYLEPnxn9uYOWy6SLqcC6GhQRFE/ME397lLlpZNQzxuQAjRjg2TMOBShHvrlktbTHAoIzkZcWR3vCGSqK9XW2fNekOLtF4Fr0cBwcgxerJcv/GYIUvKDn7vsIPvF0TSPmOiG9VqCoDrHLaG0yj/JREt6sEgt9WnTQASMPO05jPzZQBusj7zpiWJCiWlbaO6GcBaACEAjzPzSQAeBLAngEYA63oBUMPyzl0N4AULJAba6k32AHC9JYVEl97HykpdXf7sb41xE76LWNS0O3INHwAw6wgGVLVxy78zM2fez/X1aiGObt4xVKzOPCL1Df8xJkw4E5GoDkFqjkzAZhp7SUh1bVr3O73i2GuZWc0/H4/b8nueAHCyAxT238eJaLbl/+82+GfbH8x8LID7AUyw3koBuJaIbhgq+8PKA6uDmYBoA2cVgO8Q0Ze98UI55rMrgNcAjHUY7baqdTgRvdxB1bL2x79o0WmxCZMehQRD6vbZIpZslhJ+vxAtzW/v/vmnR3587rkxmMfnjWh3+ejomVZRYTCzmLrm3R+KlpZ34fOpkGy0xYEJIFIRi+nZsvG/9ax45mIQ6Zg3z9UF533f8do2QD8H8CO7eKonu8EiJjcRPQMzJ8uwCGkNEd3AzC7mwvaks+s5iCgD4DyYBVR2wdYvLXC4e+OidQQTPwfwY2tl2QGOFwF80aG4zPJYuZ987LD4hIkPAiAYuoBol0cnoblBiWRr6eaNZ3583nkRpxpdBMgg2SPvXXppLLxl83cplYzB5SJIye1koSEVpLMyWVL2f95li2fTxRdn8zxbDDNQ9nMAf3R4awjAFUS01bJRZC+4tyCiNDNPB3CldS0VwAHMfD0RZanAurWd5sLMLgD/BjAObQVbNzPzBOseRS8BZ7t/H7XUNHtOrwM4lYg22MB0eqym1Nbulh6308Osaj7oWYbiBAcYiiqhKsLX3HjJtu98532YqtWoKIIaPV03zXNG1OZTT13j3rb1h1CEgKJIs66gzfyGrhMYSI0tf8D31BOVTvevvbEW1/01gLkANADziWhBb6PGdkSamY8E8DDMGvF7rZgCAfgFM/+Zmcs6i5MMFjgAEDOHAMyHWYvSaKmOqwHsC+AZZj7Cutfe7rXtGv45gDiAT2FG1bdZTKENHFVVxi61tRO+mrLr0+wPTrbqeRyRcsu2CwRUd+OWGxMzZjzUVQ1OcQymPQJAW7HiWry3lvHqqixeXcV59SMG3nyL8cYbLcElTx2eUwUcxGWXmjLzb5j5a50F27ohTvu7l1k1FY/Y9SDMfJWjsnDvvly3r14s69p7MPMGZo4z87et977GzJ9Z9R8/dXq9+ughu4CZD3POGUCulmbfG27wixdfeQHvfWDug3MPXlvNePX1LNZ+yGLlc4866nhG1VmNNAohQqivV6w0hvnGhInfRUurDiHU3IyYAGlIeDxCGJmtY77acMLWWbPeyOde/Uqh6EhMhwB4h4gSjjjIEQBesqv+erJn8j/jrEvppZE+EcAkIlrtiGvsAUAjorX9icU4v9Pu+1btzoF3zvW+Oe34J+SYsceZThOoeRcwEAgq1NL8zh6ffnzEx+eeG8XcuTQcva12NIA4gogLPW+WlS2RJaVHIhprA0mbsmDA41ZIz2weu23TjMYTTn6rM5BYdgn3AxwdiKhLwurZe9QBrL1R+fJ+r8O1BsIEbEmS+74FjvqKCuW43//+UX3chFloadVBUNtlzrM04PUqIp74bNwnH1ZuOvfcL0ZyMHD7sEHyjfa5c7F61qzE1z7++HQRjaxFwK9CGu2JSZCCVNpgl2f81pKxT5c+XrtPfkqKnSoyAC+ScBKp7VnqLde2CHqcTdiW2kTMXN4be8gGpRMIjmsNSELa6SpOcPzooIPU4//wh4f1snEOcDh4remxUiidjgYbN31n07nnfjHgJtdFgPRj1NRI1NYq73/ve9vKNmw4RSQSX8DnV8CyI0iSCYPdvoktk3dbVrZs0UGDUUfSHcB6U0BlV/wx859hRrx/4LjWPADvMfMlvTHy7VysLol7oKO6WqCmRlZXVCj33PL3B7Jjx89GLOoAR05iSygKka6ntQ3rz2idNesNMI+Y6sAdR8VyDsubMuGZZ/beXFKygl3aeKRSBkgoHdQtr0cR2eRW/4b1s6KzZr88nB4VS30RlhdsNszYwnQAUyyXLQD8FcCvLBVQDuf67n3bbYH399tvviwbdzKiER1gNe94ZoaqMoiEf9NX302cdNLDvB14rEY/QGwPVWWl7nvyyQOSkyYtZVUbi1TSTJIzydGcqmEa7jCykVCkqSo6/filw7WJeWW+TwGYYblVBQA3gN8Q0Z8KmezYW3DsPu/P4c/3OfpxWTa2Eq2tZuCwXfMjzoHDtWHdBdlTTrlve3Hnbh8AcYAktHDhwdGJE5eyqpUglTIgHG0tQYAhJdyaIJnJ+LZu/n5ixikPcn29iopKw3He1VCCxI5YvwbgQOv1rUT0U2bWrCj5sK3nxNraKZsmT3mUQ6UHIRax1CpHE3ZpgUMowr3pq4syM2fezdtRrGP7AYhjU8cuXnxkU/m4J6WqliCZklAUx7kTliGpCEEuFa6WpiuyFdNvsb1ZQ5n+4PA6zQLwT5j5TwDwHswqxk8GwxXd33Use+SRr7dM3uVJIxjaC9FInkFuqVUulUFCuDeuvyhz0knbFTi2P4A4Njf45JOHxSZOeoo19xgkE+3r2k1JwlAUhtclXFs2/9E45rhfW37RIXFH5gAJfBvAIpjZuP8EsAuAYwG8BbOQaS366YbuFz3U1yswEw+PS5SPe5A93nIkk6Ykdt4BQ0JRCEKQa9NXP9RPPPGfvB1Gybe/A14tD1V01qyXg5s2zqR0egu8PgWG7d2yeIIiCFISEmkjO3Hn/xUvvvjAvjdc5be6yCsDJf5OynBFF+v/ewsc84nohwDOAfAJzBaiv4VVvOSoWOysvJYGnM5SXS3ADKqs1D3Llp0XHzf+KdbcbeAwXWPmQ7KEyyWIYPg3fXXu9gqO7VOC5EmS0oULv9k6adIiqXmmWAdT5kd8AZCOoF8Vrc2rxnz62Tlbzznno/4amZ0F9xxBRGcAz/7fPhYQLgSQsP53JIAfAbgIQNqkzc6DkH0NTHZnjDNA2sqVN+glpVdxRjezEYSjC4lpc0i43YKymUxoW+PZkRkzHuXtOL9q+wWI0yZ57LGvbZs0aSEHQl+zGgjkgQSAlDoCfpWS8U2+1m1nJY6b2cC1tUo/u6V8C2Yx1Ra0tRWaSkQf9MazRV10fnTUfuxGRB84urJMBhAlopY+g8Rao13uvXfCuq9//U5ZWnYKWiMSkJSr52izOcwIeSbV5N208cz4ySc/s70nH4rtGiCVlTpqa5Wts2d/OPmjjypEtPVllIRVMOtwHtBOAIRQEUsY7HJPSIwpX+567tkrRVWVASLuTTd5S83RmPk8AMsA3OhoA3oqgFeZ+er8jieOyLndfIGd/8tTr8oBPAqg3kpl15nZB2ABgEVWpWTvSnzNju0KVVbqwSeeOGTd3tOelyVlpyAS0UFoX+xkfl5HMKhQKrUxuO7L4xM7ADi2f4AAsE/J/fK88zbu9dxzJ6hNWxcgFDRLSllyToia3aIUpDOSJamZ8ok3iZde+Ofu8+aF7S4rPXF+mPUTR8CsyziHmX9pZcP+G0AYZgo6OSW3DQon1+/kf/bnPZZtMhFArZWQOB/A/gCmAii3vkM9gEPAAq+3vv6HsZ2n1Euvb09EWg2QM8ZhSw7oCIZUEYv+d8yGdZWtp5++mneQtHXCjjIs75QAoDy38uZsWfnlSCRNPZusGgY7ImH24JIIBhQRaXnft3nDRfFZs1/IxS268HI51KCrYEbBASAJwAvgSQCnOUHQT5fwngDqAewMYBvMWpRWmF1YVvfoFrYIe98bbvCvPfTQv2RLyy5BOgMYutn1kLitvyKDIYREKKyIrVuWTXrlpbPWX3VV00hqLl2UIIPGCkiiulpIZtKPOvoK78YNl5GgDNxuAenI37IgAEBBa8SQHt/X4xN2XuFaWX8Nm16cLr1cFjjcRHQjzP630uL6rxDRqTZD6o8hnddfd7ZlvJfCbBNaZYFD7RIcppdKkNWz6t2jKp7Plk+4BImkAUPnXEtQtjxVthvX7VFcWzbd+tubbzplRwPHjiVBnHO2upuEliypjJaOvU8G/JMRi7VFiZ1DSgkhBAI+qK0tK8o2bLx8yxlnvMvMAnPntusW75AgU2CeG/g/1ltbAVxCRHX9DfzlnV3ye5g5WjZQHwBwoWWTdDTSLakhAKgrGn6aDYX+wG5vAKlEWw8scjosrDKBjJ7RmrZemT3huNslEXDttWK01XMUATJAD9ek+fMnb9p993/JcOl0RCIGpGwzUB3UCckSAZ9C6WRMi8d+njm68g52XMeRNrI/zPLbfQCshNkM4nsWxz8LZkeVPh/J5khuvAZmyyIAuANmMDEA4HYAVwHI5KWog4hk2cKFe7WUjf2bXjLmJCSTgJ6VbT2rCA6DXIc/oFIssiG0eeM5kVNOabAbdu+Ix6HtuAABcv7/OXPmaE9cdvn12ZLwFcjqgK4bbUcTt0tRMaCqCjwaRLRl0ZiN6362bfZZH17LLN4DqBYISeAxAVTA7Ot7hNVZ5FFLLXoX5hkd8b6oWg77Y28Ab1uS4xdW95QzAfzH+uhsInqcmRVqaCBbanhWrPhBMhD6K/uDJYjHDIDNriPsIAMpGUJhBINCNDU9X/bF+gsbz5r9yY5eQ75jA8TmstddJ4kZ7mefPS8dKvkHez1BxBM6QCryaVgyAyQR9CsUjzZrycS12aMrb5OWNOGKChfMYxRetJpeE8zs3KsAPEhEn/ezBNZOTTkcwL5E9H+O8lr7eLWHKxoaaGVFhUFEXP7II7tvnTjpbzIYnoVMFjCyeSk3NjjYgKYpEARXc/Ot/3vJxVfXvPdeZkezN4oA6Zr6zH69REZJXd2+kclT7pShkkMQjUgwI2fA5vR062wLl6rA64aItq4INW/9WeuMU/7LnXi1CnPLnZTqWp46BshX/8xP0r5QtQyExiIeM6z3qL1KxQwiA/6gSvFYk2/r5ksTM2fOZyLgWilQsyOfT76jebG6dxGZhFJfr7bMmfP28Q8+cLR725ab4HIJaJoAS70dT7Fbnuo6IxI3pD80vXXspJddzz//mzk33uhVAVQzqzR3rjN/Sh2M7iZWnpfiKK/lamZNIQIRyTFPP32o8uKLK5LlE2+VqmssohGza6TIA4fBEkIhBAKqiDQ1lH728ZHxmTPnM7MCKakIjqIE6YoCBUhIAYZv6dLTE+GSW2QwNBnRqHlGer4Bb9onBhRFgc8DEY+8627adm36hBMft5KuCmfgOlSgve+6a8xHU6deq3v9l7LHqyARt2wN5/0SIBkQpMPrUymZzLjisevSFUf9icwzIpWR3iu3CJARARIQwAJExm533TV+3Tf2/oseDJ0P3QAyGTO71W4e6Gzrzyzh9SgwslCTiYXBltZft5x00js5b1dFhTEoQLElEZGsP/podUbN77+f8bqv4UBoV8RiANg6CzBvmyVLEBFCIRKtzav9Gzf8JHbaaa/2FAAtAqQ4uuXQAoDn2Ybzk37/9RwMTrCkCdoyXeH0dEkQgGBAUDwaV9PJO3b+8sMbPj/7os1sSxSTELlfwKirI/uefMuXn5oMhn9jBAIHQTeAdMpWpxzfoTZbw+NVKZ1iLRG/4ZsP3l+z+s47E8VOh0WADNyAr6sTqKoydnr0/p03T9zjBj0Q/C4MCaQzBgim8dtuKdn0DCmkIBCAaG3+Sk3E/nLAm0/f9cpVf0vmq0e98rTNnUsgMghAYOnSQ5KB0K91r/cUuFxAMmmYEgCiw7ZKNj1Xfj9EtPU9T9O2nyVnzlzKfb2HIkCKowegKCAyBABt+fIzM8HwH2QovAdiMbNRWq6LCjuJ0zyUR3MpcLshoq3veuLxGxZdd91DlStXmlybaxVQVecSxT6uwQLG2Kce369pzPhfSJe7iv0BBbGYtLKRRS6PrL3UkPAFFIrHs1oi+pejnnryT8tvvDGOHTjwVwRIIYcVmQaR3Of220vf33ff/9Xd3ivZ61UQj1tcPN8lbNsnkPC4FSgCIhp53ZdM/iV6zDGPkn2UgJNoHaoUAShbtOhrreHwVbpLu4BDYc0EJTvOHG8XzDSdBpqmQNOgtrbW+7Zu+2V01omrilKjCJAhtU0IgP/pp49Ijhn7ByMQPApZHcikzJOZ7JgD59snxPB6FIAhErHXvKnELUf++YZHlyxZkm7zoplZx2ULF36reUzJTwzNcxYHwwHE4oA0DDPr1tFaxD5EyAZNMATR2rrZHY3OTRxbOY8ALkqNIkCG3jaxgosMkH/lyu+lvL7/lYHgXkgkrHQV0dGTBJgJkGDA6xEQBBGNvu1KJ2+e9cZb/3n0qquS/sVPHpYMll5mqNoZHA5riCfMaj6CAOW7ma0acWLA7xeUSOhKOvWf8q/W/3pTVdWXRQ9VESDDL03OPNMAMw6/++7gqr2mXq17fZdzwB9G1Ha5OtM7nOqQNDm6x6NAVSBam98T0lhnqNoJHC4BYgnLvrEdAc4tI1MiMTF8HgWGhBqPLg81bf1t88knv+rwmBXVqSJARo4RTwDGPvbYHs3jx19jaJ4L2OtTEIuZBVhEHetI2lzDDLdbgaoA8YQNrI6qGpkhPcCyaVQVIhZd44tE5yaOrXxE2qDtRy19cRQBMmRqV84dGwz/Rtc8J8PtBhJx21vVpnoxO8Fivm+6aynXZqedV4wk3G4Fmhsi0vKpJxG//qSFC+6v+9vfkiiqU0WAjBpv17RpuYCed/nyY9PB0C8Nt/dYVtUugGJth9MrldsiCxgulwKPByIS2aglEzdP+2DtvNUXX9yKoneqCJBRKlFyKSECgP/ZZ0+MewK/kD7f0aYqFbdVL1NiMNpLDGYJEMNjSgxqbdngSsZu3Xnd2ns+O/+SLTk7o+idKgJk1Bvylk0gAPifaZiZDHh/ZmjuY9njAeJx00vFZFf4mYmRXq+AIkDR2JeuRPL2MZ9tvGfzD6oai8AoAmSHAEpw2bJjov7AZVJ1n4xgUEEyaWpTXi+gG1AS8Xe1eOwfe6565eF3r7mmuQiM4thxgGI3YQAQfnr5/q4XX76DXl3dSK+tjqkvv7bEu+SZ0y677DK3Q93Kfac4imNHAoqwgbLbggXjw4sX75rXmboIjOIoGvPtem0xk9XutAiM4iiOdsCori6WQRdHcRRHcRRHcRRHcRRHcRRHcRRHcRRHcRRHcRRHcRRHcQzO+P8Up3TZnL8xRgAAAABJRU5ErkJggg==";
const LOGO_OP_LICHT = "data:image/png;base64,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";
const LOGO_VOL = "data:image/png;base64,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";

/* ── APP-INSTELLINGEN (mini-store met abonnement) ── */
/* ── TEAMTAKKIE ─────────────────────────────────────────────
   De app heet TEAMTAKKIE. De clubnaam, de teamnaam en het logo zijn
   van de club die hem gebruikt en staan bij de instellingen. Alles wat
   vroeger een vaste clubnaam in de code had, leest die nu daar. */
const APP_NAAM = "TEAMTAKKIE";
const APP_SLOGAN_SLEUTEL = "app.slogan";

/* ── Talen ──────────────────────────────────────────────────
   Nederlands is de brontaal. Ontbreekt een tekst in het Engels of
   Duits, dan verschijnt de Nederlandse en niet een lege plek of een
   ruwe sleutel: zo blijft de app bruikbaar terwijl er nog wordt
   vertaald. */
const TALEN = [
  {id:"nl", label:"Nederlands", kort:"NL"},
  {id:"en", label:"English",    kort:"EN"},
  {id:"de", label:"Deutsch",    kort:"DE"}
];
const TAAL_BRON = "nl";
function taalBestaat(id) {
  return TALEN.some(function(t){ return t.id === id; });
}
/* Welke taal spreekt dit apparaat? Alleen bij de allereerste start;
   daarna geldt wat je zelf hebt gekozen. */
function taalVanApparaat() {
  try {
    var lijst = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || TAAL_BRON];
    for (var i = 0; i < lijst.length; i++) {
      var kort = String(lijst[i]).slice(0, 2).toLowerCase();
      if (taalBestaat(kort)) return kort;
    }
  } catch(e) {}
  return TAAL_BRON;
}

const INSTELLINGEN_KEY = "fch_instellingen_v1";
const STANDAARD_INSTELLINGEN = {
  clubNaam:"", teamNaam:"", seizoen:"2025/2026",
  speelduur:90, locatie:"", thema:"systeem", logo:null, accent:"club",
  taal:"", /* leeg betekent: volg het apparaat */
  /* Hoe groot het opstellingsveld op dit apparaat staat, in procenten.
     Op een groot scherm wil je hem groter dan op een telefoon. */
  veldZoom:100
};
/* logo:null betekent "gebruik het ingebouwde clublogo" */
/* Het merk voor een balk of vlak. opDonker vertelt waar het terecht
   komt; heeft de club een eigen wapen ingesteld, dan geldt dat overal. */
function logoKopbalk(opDonker) {
  return inst().logo || (opDonker ? LOGO_OP_DONKER : LOGO_OP_LICHT);
}
function logoExport()  { return inst().logo || LOGO_VOL; }
/* ── Van jou, of van dít team? ───────────────────────────────
   De teamnaam spreekt voor zich. De speelduur verschilt per
   leeftijdsgroep, en het seizoen en de thuislocatie horen ook bij
   het team: coach je een JO19 en een JO13, dan zijn die niet gelijk.

   De rest is van jou en geldt over al je teams heen: je taal, je
   thema, het clubwapen, en hoe groot je het opstellingsveld op dit
   apparaat wilt hebben.

   Naar buiten toe blijft het één geheel. inst() geeft de twee stukken
   samengevoegd terug en zetInstellingen() splitst ze weer, zodat de
   honderd plekken in de app die inst() gebruiken hier niets van
   merken. Er is precies één lijst die de scheiding bepaalt. */
const TEAM_INSTELLINGEN = ["teamNaam", "seizoen", "speelduur", "locatie"];
function _leesDeel(sleutel) {
  try {
    var r = localStorage.getItem(sleutel);
    var o = r ? JSON.parse(r) : null;
    return (o && typeof o === "object") ? o : {};
  } catch(e) { return {}; }
}
function _leesInstellingen() {
  var vanJou = _leesDeel(INSTELLINGEN_KEY);
  /* Is er geen team — een app die net is bijgewerkt en waarvan de
     verhuizing niet is doorgegaan — dan staat alles nog bij elkaar in
     het oude blok en moet het daar ook vandaan komen. Zou ik het
     teamdeel dan toch weggooien, dan raakt zo iemand zijn teamnaam en
     zijn speelduur kwijt zonder dat er iets kapot is. */
  if (!teamId()) return Object.assign({}, STANDAARD_INSTELLINGEN, vanJou);
  /* Met een team komt het teamdeel bij het team vandaan. Wat er nog in
     het gedeelde blok staat is een restant en telt niet mee: anders
     zou de teamnaam van je vorige team blijven hangen. */
  TEAM_INSTELLINGEN.forEach(function (v) { delete vanJou[v]; });
  return Object.assign({}, STANDAARD_INSTELLINGEN, vanJou,
                       _leesDeel(sleutelVoor(TEAMINST_KEY)));
}
var _instellingen = _leesInstellingen();
var _instLuisteraars = [];
function inst() { return _instellingen; }
function teamNaamVol() {
  var i = _instellingen;
  return (i.clubNaam+" "+i.teamNaam).trim();
}
/* De twee helften wegschrijven. Alles wat in TEAM_INSTELLINGEN staat
   gaat naar dit team, de rest naar jou. */
function _schrijfInstellingen() {
  var vanJou = {}, vanTeam = {};
  Object.keys(_instellingen).forEach(function (v) {
    if (TEAM_INSTELLINGEN.indexOf(v) >= 0) vanTeam[v] = _instellingen[v];
    else vanJou[v] = _instellingen[v];
  });
  try { localStorage.setItem(INSTELLINGEN_KEY, JSON.stringify(vanJou)); } catch(e) {}
  if (teamId()) {
    try { localStorage.setItem(sleutelVoor(TEAMINST_KEY), JSON.stringify(vanTeam)); } catch(e) {}
  }
}
function zetInstellingen(wijziging) {
  _instellingen = Object.assign({}, _instellingen, wijziging);
  _schrijfInstellingen();
  /* De naam van het team staat op twee plekken: in de instellingen en
     in de teamlijst waaruit de wisselaar put. Eén bron zou mooier zijn,
     maar de lijst moet zonder het team te openen leesbaar blijven.
     Dus houden we ze hier gelijk, op één plek. */
  if (wijziging && wijziging.teamNaam !== undefined && teamId()) {
    slaTeamsOp(_teams.map(function (t) {
      return t.id === teamId()
        ? Object.assign({}, t, {naam: (wijziging.teamNaam || "").trim() || t.naam})
        : t;
    }));
  }
  _instLuisteraars.slice().forEach(function(f){ f(_instellingen); });
}
/* Na het wisselen van team opnieuw inlezen en iedereen bijpraten. */
function herlaadInstellingen() {
  _instellingen = _leesInstellingen();
  _instLuisteraars.slice().forEach(function(f){ f(_instellingen); });
  return _instellingen;
}
function gebruikInstellingen() {
  const [waarde, zet] = useState(_instellingen);
  useEffect(function(){
    function luister(n){ zet(n); }
    _instLuisteraars.push(luister);
    return function(){ _instLuisteraars = _instLuisteraars.filter(function(f){return f!==luister;}); };
  },[]);
  return waarde;
}
/* ── Het tekstenboek ────────────────────────────────────────
   Sleutels in plaats van Engelse of Nederlandse zinnen als sleutel:
   dan blijft een sleutel staan als de tekst verandert. Nederlands is
   compleet; Engels en Duits groeien mee. */
const TEKSTEN = {
  nl: {
    "app.slogan": "Je team verdient beter dan een appgroep",
    "app.eigenaar": "Team Manager",

    "nav.groep.team": "Team",
    "nav.groep.analyse": "Analyse",
    "nav.groep.extra": "Extra",
    "nav.dashboard": "Dashboard",
    "nav.wedstrijden": "Wedstrijden",
    "nav.trainingen": "Trainingen",
    "nav.selectie": "Selectie",
    "nav.agenda": "Agenda",
    "nav.statistieken": "Statistieken",
    "nav.live": "Live analyse",
    "nav.clubhuis": "Clubhuis",
    "nav.instellingen": "Instellingen",
    "nav.kort.dashboard": "Home",
    "nav.kort.wedstrijden": "Wedstrijden",
    "nav.kort.selectie": "Selectie",
    "nav.kort.trainingen": "Training",
    "nav.kort.statistieken": "Stats",

    "clubhuis.titel": "Clubhuis",
    "clubhuis.onder": "Het leuke werk. Kies waar je mee aan de slag wilt.",
    "clubhuis.sportpark": "De Bouwput",
    "clubhuis.sportpark.tekst": "Bouw jullie eigen complex in 3D: velden, tribunes, kantine, materiaal.",
    "clubhuis.kaarten": "De Kaartfabriek",
    "clubhuis.kaarten.tekst": "Een kaart van elke speler, met cijfers uit zijn rapporten of met de hand ingevuld.",
    "clubhuis.tenue": "De Kleedkamer",
    "clubhuis.tenue.tekst": "Ontwerp het thuis-, uit- en derde tenue en de twee keeperstenues, tot en met de sokken.",
    "clubhuis.quiz": "Betweterige Scheids",
    "clubhuis.quiz.tekst": "Vijf vragen over de spelregels, plus een bonusopdracht waarin je het antwoord tekent.",

    "taal.titel": "Taal",
    "taal.onder": "Kies de taal van de app. Je eigen gegevens blijven staan zoals je ze hebt ingevuld.",
    "taal.apparaat": "Volg mijn apparaat"
  },
  en: {
    "app.slogan": "Your team deserves better than a group chat",
    "app.eigenaar": "Team Manager",

    "nav.groep.team": "Team",
    "nav.groep.analyse": "Analysis",
    "nav.groep.extra": "Extra",
    "nav.dashboard": "Dashboard",
    "nav.wedstrijden": "Matches",
    "nav.trainingen": "Training",
    "nav.selectie": "Squad",
    "nav.agenda": "Calendar",
    "nav.statistieken": "Statistics",
    "nav.live": "Live analysis",
    "nav.clubhuis": "Clubhouse",
    "nav.instellingen": "Settings",
    "nav.kort.dashboard": "Home",
    "nav.kort.wedstrijden": "Matches",
    "nav.kort.selectie": "Squad",
    "nav.kort.trainingen": "Training",
    "nav.kort.statistieken": "Stats",

    "clubhuis.titel": "Clubhouse",
    "clubhuis.onder": "The fun part. Pick what you want to work on.",
    "clubhuis.sportpark": "The Ground",
    "clubhuis.sportpark.tekst": "Build your own complex in 3D: pitches, stands, clubhouse, equipment.",
    "clubhuis.kaarten": "Card Lab",
    "clubhuis.kaarten.tekst": "A card for every player, with ratings from their reports or filled in by hand.",
    "clubhuis.tenue": "Kit Room",
    "clubhuis.tenue.tekst": "Design the home, away and third kit plus both keeper kits, right down to the socks.",
    "clubhuis.quiz": "Smart-Ass Ref",
    "clubhuis.quiz.tekst": "Five questions on the laws of the game, plus a bonus round where you draw the answer.",

    "taal.titel": "Language",
    "taal.onder": "Choose the language of the app. Your own data stays exactly as you entered it.",
    "taal.apparaat": "Follow my device"
  },
  de: {
    "app.slogan": "Dein Team verdient mehr als einen Gruppenchat",
    "app.eigenaar": "Team Manager",

    "nav.groep.team": "Mannschaft",
    "nav.groep.analyse": "Analyse",
    "nav.groep.extra": "Extra",
    "nav.dashboard": "Übersicht",
    "nav.wedstrijden": "Spiele",
    "nav.trainingen": "Training",
    "nav.selectie": "Kader",
    "nav.agenda": "Kalender",
    "nav.statistieken": "Statistiken",
    "nav.live": "Live-Analyse",
    "nav.clubhuis": "Vereinsheim",
    "nav.instellingen": "Einstellungen",
    "nav.kort.dashboard": "Start",
    "nav.kort.wedstrijden": "Spiele",
    "nav.kort.selectie": "Kader",
    "nav.kort.trainingen": "Training",
    "nav.kort.statistieken": "Stats",

    "clubhuis.titel": "Vereinsheim",
    "clubhuis.onder": "Der schöne Teil. Such dir aus, woran du arbeiten willst.",
    "clubhuis.sportpark": "Der Bolzplatz",
    "clubhuis.sportpark.tekst": "Baut euer eigenes Gelände in 3D: Plätze, Tribünen, Vereinsheim, Material.",
    "clubhuis.kaarten": "Kartenwerk",
    "clubhuis.kaarten.tekst": "Eine Karte für jeden Spieler, mit Noten aus seinen Berichten oder von Hand eingetragen.",
    "clubhuis.tenue": "Die Kabine",
    "clubhuis.tenue.tekst": "Entwirf Heim-, Auswärts- und drittes Trikot plus beide Torwarttrikots, bis hin zu den Stutzen.",
    "clubhuis.quiz": "Der Besserwisser-Schiri",
    "clubhuis.quiz.tekst": "Fünf Fragen zu den Regeln, dazu eine Bonusaufgabe, bei der du die Antwort zeichnest.",

    "taal.titel": "Sprache",
    "taal.onder": "Wähle die Sprache der App. Deine eigenen Daten bleiben genau so, wie du sie eingetragen hast.",
    "taal.apparaat": "Meinem Gerät folgen"
  }
};

/* Welke taal er nu geldt. Leeg in de instellingen betekent: volg het
   apparaat. */
function taalNu() {
  var gekozen = (typeof inst === "function" ? (inst().taal || "") : "");
  if (taalBestaat(gekozen)) return gekozen;
  return taalVanApparaat();
}
/* Een tekst opzoeken. Ontbreekt hij in de gekozen taal, dan de
   Nederlandse; ontbreekt die ook, dan wat er is meegegeven, en anders
   de sleutel zelf zodat je in het testen ziet wat er mist. */
function t(sleutel, terugval) {
  var boek = TEKSTEN[taalNu()];
  if (boek && boek[sleutel] !== undefined) return boek[sleutel];
  var bron = TEKSTEN[TAAL_BRON];
  if (bron && bron[sleutel] !== undefined) return bron[sleutel];
  return terugval !== undefined ? terugval : sleutel;
}
/* Hoe ver een taal af is, om in de instellingen te tonen */
function taalDekking(id) {
  var bron = TEKSTEN[TAAL_BRON] || {}, boek = TEKSTEN[id] || {};
  var sleutels = Object.keys(bron);
  if (!sleutels.length) return 1;
  var gedaan = sleutels.filter(function(s){ return boek[s] !== undefined; }).length;
  return gedaan / sleutels.length;
}

/* Logo verkleinen naar max 160px zodat localStorage niet volloopt */
/* ══ AFBEELDINGEN VERKLEINEN ═════════════════════════════════
   Elke afbeelding die de app bewaart, gaat hier eerst doorheen.

   Waarom dat moet: een foto uit je telefoon is drie tot vijf megabyte,
   en als tekst opgeslagen wordt dat nog een derde meer. De browser geeft
   je vijf tot tien megabyte in totaal, voor álles bij elkaar. Twee
   spelersfoto's en de opslag zit vol — en een volle opslag weigert
   stilletjes: je typt een wissel in, er verschijnt geen foutmelding, en
   hij staat er de volgende dag niet meer.

   Erger nog gaat elke foto integraal mee naar de server, bij elke
   uitwisseling, over de mobiele verbinding van een parkeerplaats bij een
   sportpark.

   Vierhonderd pixels is ruim voor een pasfotootje van veertig pixels op
   het scherm, ook op een scherm met dubbele puntdichtheid. Wat eruit
   komt is dertig kilobyte in plaats van vijf megabyte: honderdvijftig
   keer kleiner, en op het scherm zie je geen verschil.

   Doorzichtigheid blijft behouden waar die er was — een clubwapen of een
   uitgeknipt logo hoort geen witte rand te krijgen. Een gewone foto
   wordt jpeg, want daar is niets doorzichtigs aan en dat scheelt nog
   eens een factor vijf.
   ══════════════════════════════════════════════════════════ */
const FOTO_MAX_PX = 400;     /* spelersfoto */
const LOGO_MAX_PX = 160;     /* clubwapen */
const LAAG_MAX_PX = 600;     /* een afbeelding op een tenue */
const BESTAND_MAX_MB = 12;   /* wat we überhaupt willen openen */
/* Waar we alsnog te groot uitkomen — een enorme PNG met veel details —
   gaan we een stap terug in kwaliteit. Boven een halve megabyte is er
   iets aan de hand dat we niet in de opslag willen hebben. */
const AFBEELDING_GRENS = 500 * 1024;

function afbeeldingSoort(bestand) {
  var t = (bestand && bestand.type) || "";
  /* png, gif en webp kunnen doorzichtig zijn; jpeg niet. */
  return /png|gif|webp|svg/i.test(t) ? "image/png" : "image/jpeg";
}

function verkleinAfbeelding(bestand, opties, klaar) {
  opties = opties || {};
  var max = opties.max || FOTO_MAX_PX;
  if (!bestand) { klaar("Geen bestand gekozen."); return; }
  if (bestand.size > BESTAND_MAX_MB * 1024 * 1024) {
    klaar("Die afbeelding is te groot (max " + BESTAND_MAX_MB + " MB).");
    return;
  }
  var lezer = new FileReader();
  lezer.onload = function (ev) {
    var img = new Image();
    img.onload = function () {
      try {
        var soort = opties.soort || afbeeldingSoort(bestand);
        var kwaliteit = opties.kwaliteit === undefined ? 0.82 : opties.kwaliteit;
        function teken(grootte, kw) {
          var schaal = Math.min(1, grootte / Math.max(img.width, img.height));
          var b = Math.max(1, Math.round(img.width * schaal));
          var hh = Math.max(1, Math.round(img.height * schaal));
          var c = document.createElement("canvas");
          c.width = b; c.height = hh;
          var x = c.getContext("2d");
          /* Een jpeg kent geen doorzichtigheid; zonder witte ondergrond
             worden de doorzichtige delen zwart. */
          if (soort === "image/jpeg") { x.fillStyle = "#ffffff"; x.fillRect(0, 0, b, hh); }
          x.drawImage(img, 0, 0, b, hh);
          return c.toDataURL(soort, kw);
        }
        var uit = teken(max, kwaliteit);
        /* Nog steeds fors? Dan een stap terug. Twee pogingen, en daarna
           houdt het op — beter een iets korrelige foto dan een app die
           morgen niets meer kan opslaan. */
        if (uit.length > AFBEELDING_GRENS) uit = teken(Math.round(max * 0.75), 0.7);
        if (uit.length > AFBEELDING_GRENS) uit = teken(Math.round(max * 0.5), 0.6);
        klaar(null, uit);
      } catch (e) { klaar("Deze afbeelding kon niet verwerkt worden."); }
    };
    img.onerror = function () { klaar("Dit lijkt geen geldige afbeelding."); };
    img.src = ev.target.result;
  };
  lezer.onerror = function () { klaar("Bestand kon niet gelezen worden."); };
  lezer.readAsDataURL(bestand);
}

/* Het clubwapen: klein, en met behoud van doorzichtigheid. */
function verwerkLogoBestand(bestand, klaar) {
  verkleinAfbeelding(bestand, {max: LOGO_MAX_PX, soort: "image/png"}, klaar);
}

/* Voorgeladen logo voor canvas-exports */
var _logoCache = {bron:null, img:null};
/* ── ONTWERP EN HERKOMST ──────────────────────────────────
   Eén plek waar staat wie de app gemaakt heeft, zodat het in
   de app en in elke PDF hetzelfde is. */
const ONTWERPER = {
  studio: "TEAMTAKKIE",
  naam:   "EVS production",
  regel:  "TEAMTAKKIE  |  EVS production"
};

/* Zet het clubwapen linksboven op een PDF en geeft terug tot waar
   de tekst mag beginnen. */
function pdfWapen(doc, x, y, hoogte) {
  var img = logoAfbeelding();
  if (!img) return x;
  try {
    var hh = hoogte || 14;
    var bb = Math.round(img.naturalWidth / img.naturalHeight * hh);
    if (bb > hh * 1.4) { bb = Math.round(hh * 1.4); hh = Math.round(img.naturalHeight / img.naturalWidth * bb); }
    doc.addImage(img, "PNG", x, y, bb, hh);
    return x + bb + 5;
  } catch (e) { return x; }
}

/* Voettekst met clubnaam links, ontwerper rechts. Overal gelijk. */
function pdfVoet(doc, W, H, opties) {
  var o = opties || {};
  var M = o.marge || 16;
  var donker = !!o.donker;
  if (donker) {
    doc.setFillColor(0,40,115);
    doc.rect(0, H-18, W, 18, "F");
    doc.setTextColor(170,205,255);
  } else {
    doc.setDrawColor(225,229,234); doc.setLineWidth(0.3);
    doc.line(M, H-14, W-M, H-14);
    doc.setTextColor(140,148,160);
  }
  doc.setFont("helvetica","normal");
  doc.setFontSize(7.5);
  var yy = donker ? H-7 : H-8.5;
  var links = teamNaamVol() + "  ·  " + new Date().toLocaleDateString("nl-NL");
  if (o.seizoen) links = teamNaamVol() + "  ·  Seizoen " + inst().seizoen + "  ·  " + new Date().toLocaleDateString("nl-NL");
  doc.text(links, M, yy);
  var rechts = ONTWERPER.regel + (o.paginas > 1 ? "   ·   " + o.pagina + " / " + o.paginas : "");
  doc.text(rechts, W-M, yy, {align:"right"});
}

function logoAfbeelding() {
  var bron = logoExport();
  if (!bron) return null;
  if (_logoCache.bron !== bron) {
    var img = new Image();
    img.src = bron;
    _logoCache = {bron:bron, img:img};
  }
  var i = _logoCache.img;
  return (i && i.complete && i.naturalWidth) ? i : null;
}

function pasThemaToe(keuze) {
  var t = keuze || _instellingen.thema || "systeem";
  var donker = t==="donker" || (t==="systeem" &&
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-thema", donker ? "donker" : "licht");
  pasAccentToe(_instellingen.accent || "club", donker);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", donker ? "#0b0c11" : accentInfo(_instellingen.accent||"club").l[0]);
}

/* ── TOASTS (meldingen met optionele ongedaan-maken actie) ── */
var _toastLuisteraars = [];
var _toastTeller = 0;
function toon(bericht, opties) {
  var o = opties || {};
  var t = {
    id: ++_toastTeller,
    bericht: bericht,
    soort: o.soort || "info",
    actieLabel: o.actieLabel || null,
    actie: o.actie || null,
    duur: o.duur || (o.actie ? 7000 : 3500)
  };
  _toastLuisteraars.slice().forEach(function(f){ f(t); });
  return t.id;
}
function meldFout(bericht) { return toon(bericht, {soort:"fout"}); }
function meldGoed(bericht) { return toon(bericht, {soort:"goed"}); }


const ACCENTEN = [
  {id:"club",    label:"Clubblauw", l:["#004aad","#38b6ff"], d:["#1f6fe0","#5cc4ff"], op:"#052e5c"},
  {id:"magenta", label:"Magenta",   l:["#c2166a","#ff5ba7"], d:["#d81b74","#ff5ba7"], op:"#2a0416"},
  {id:"paars",   label:"Paars",     l:["#6528b8","#b98cff"], d:["#7038c8","#b98cff"], op:"#1d0a3a"},
  {id:"oranje",  label:"Oranje",    l:["#b34a08","#fb923c"], d:["#c2540c","#ffa657"], op:"#2e1400"},
  {id:"limoen",  label:"Limoen",    l:["#357719","#7ed957"], d:["#33741b","#8fe36a"], op:"#122a06"}
];
function accentInfo(id) {
  return ACCENTEN.find(function(a){ return a.id===id; }) || ACCENTEN[0];
}
function pasAccentToe(id, donker) {
  var a = accentInfo(id);
  var paar = donker ? a.d : a.l;
  var s = document.documentElement.style;
  s.setProperty("--blauw", paar[0]);
  s.setProperty("--blauw-licht", paar[1]);
  s.setProperty("--op-licht", a.op);
}


/* Welk tenue draagt een speler: veldspelers het gekozen tenue, de
   keeper het bijbehorende keeperstenue. */
function tenueVoor(tenue, keuze, isKeeper) {
  if (isKeeper) return tenueSet(tenue, keuze === "thuis" ? "keeperT" : "keeperU");
  return tenueSet(tenue, keuze || "thuis");
}

/* Van een tenue naar een CSS-vulling. Alles wat een shirt als vlak
   moet tonen komt hier langs, zodat een nieuw patroon maar op één
   plek hoeft te worden toegevoegd. */
function tenueVulling(set) {
  var s = Object.assign({}, STANDAARD_SET, set || {});
  var a = s.shirt, b = s.shirt2;
  if (s.patroon==="strepen")   return "repeating-linear-gradient(90deg,"+a+" 0 5px,"+b+" 5px 10px)";
  if (s.patroon==="banden")    return "repeating-linear-gradient(0deg,"+a+" 0 6px,"+b+" 6px 12px)";
  if (s.patroon==="halven")    return "linear-gradient(90deg,"+a+" 0 50%,"+b+" 50% 100%)";
  if (s.patroon==="diagonaal") return "linear-gradient(135deg,"+a+" 0 50%,"+b+" 50% 100%)";
  if (s.patroon==="keper")     return "linear-gradient(135deg,"+a+" 0 34%,"+b+" 34% 62%,"+a+" 62% 100%)";
  if (s.patroon==="mouwen")    return "linear-gradient(90deg,"+(s.mouw||b)+" 0 22%,"+a+" 22% 78%,"+(s.mouw||b)+" 78% 100%)";
  return a;
}


/* Welk tenue je bij een wedstrijd aanhebt. Heb je zelf iets gekozen
   dan geldt dat; anders volgt het vanzelf uit thuis of uit spelen. */
function tenueVanWedstrijd(wedstrijd) {
  var w = wedstrijd || {};
  if (["thuis","uit","derde"].indexOf(w.tenueKeuze) >= 0) return w.tenueKeuze;
  return w.thuis === false ? "uit" : "thuis";
}


/* ── OEFENINGENBIBLIOTHEEK ── */
const OEFENINGEN_KEY = "fch_oefeningen_v1";
const laadOefeningen = () => laadJson(OEFENINGEN_KEY);
const OEFENING_DOELEN = ["Passen & trappen","Aanvallen","Verdedigen","Positiespel","Afwerken","Dribbelen","Omschakeling A-V","Omschakeling V-A","Keeper","Conditie","Spelhervatting"];
const OEFENING_LEEFTIJDEN = ["Alle","O9-O11","O12-O14","O15-O17","O18-O19","Senioren"];
/* 50 kant-en-klare oefeningen, geschreven volgens de KNVB-driedeling */
const BASIS_OEFENINGEN = [{"naam": "Rondo 5 tegen 2", "type": "Positiespel", "categorie": "Aanvallend", "doel": "Positiespel", "leeftijd": "O18-O19", "duur": 12, "aantalSpelers": 7, "veldGrootte": "12 x 12 meter", "materialen": "4 pionnen, 2 ballen, hesjes", "beschrijving": "Vijf spelers staan in een cirkel rond twee verdedigers in het midden. De buitenspelers houden de bal rond met maximaal twee balcontacten. Verovert een verdediger de bal of gaat hij eruit, dan wisselt de foutmaker met de verdediger. Verzwaar door één balcontact te eisen.", "aandachtspunten": "Sta breed zodat de passlijn openligt\nSpeel op de voet weg van de verdediger\nKijk voor je de bal krijgt waar de ruimte zit\nSpeel de derde man vrij in plaats van terug", "tekening": null, "favoriet": false}, {"naam": "Opbouwen van achteruit 7 tegen 5", "type": "Positiespel", "categorie": "Aanvallend", "doel": "Positiespel", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 12, "veldGrootte": "halve speelhelft", "materialen": "hesjes, 4 doeltjes, 6 ballen", "beschrijving": "Zeven opbouwers met keeper spelen tegen vijf storende spelers. De opbouwende ploeg scoort door de bal beheerst over de middenlijn te dribbelen of in te spelen op een aanspeelpunt. De storende ploeg scoort in twee kleine doeltjes op de zijlijnen.", "aandachtspunten": "Maak het veld zo groot mogelijk bij balbezit\nDe keeper doet mee als extra man\nZoek de vrije man aan de kant waar de druk vandaan komt\nSpeel pas vooruit als de tegenstander is uitgelokt", "tekening": null, "favoriet": false}, {"naam": "Derde man vrijspelen", "type": "Oefening", "categorie": "Aanvallend", "doel": "Passen & trappen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 9, "veldGrootte": "25 x 25 meter", "materialen": "8 pionnen, 3 ballen", "beschrijving": "Drie groepjes op de hoeken van een vierkant. A speelt in op B, die kaatst terug op A, waarna A direct doorspeelt op C die aan de andere kant is losgekomen. Na de pass sluit iedere speler aan bij de groep waar hij naartoe speelde. Beide kanten opbouwen.", "aandachtspunten": "De kaatsende speler komt de bal tegemoet\nDe derde man beweegt al voordat de kaats gegeven wordt\nPass met de binnenkant, hard en over de grond\nEerste aanname met de verste voet, richting de volgende pass", "tekening": null, "favoriet": false}, {"naam": "Y-passvorm met doorlopen", "type": "Oefening", "categorie": "Aanvallend", "doel": "Passen & trappen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 8, "veldGrootte": "25 x 12 meter", "materialen": "6 pionnen, 2 ballen", "beschrijving": "Twee ballen lopen tegelijk door een Y-vorm. Speler A speelt op B bij de dichtstbijzijnde pion, krijgt de kaats terug en speelt door op C. B loopt mee en ontvangt van C, waarna de bal via de andere tak terugkomt. Spelers volgen hun eigen pass.", "aandachtspunten": "Speel in het juiste tempo, niet harder dan de ontvanger aankan\nVraag de bal met een handgebaar of stem\nDraai je heup open bij de aanname\nHoud beide ballen tegelijk in beweging", "tekening": null, "favoriet": false}, {"naam": "Buitenspelers diep sturen", "type": "Positiespel", "categorie": "Aanvallend", "doel": "Aanvallen", "leeftijd": "O18-O19", "duur": 18, "aantalSpelers": 12, "veldGrootte": "40 x 30 meter", "materialen": "hesjes, 2 grote doelen, 6 ballen", "beschrijving": "Zes tegen zes op een veld met twee vrije zones langs de lijnen. Alleen de aanvallende ploeg mag die zones gebruiken. Wie de bal in de zone ontvangt, mag ongehinderd voorzetten. Doelpunt uit een voorzet telt dubbel.", "aandachtspunten": "Speel de vleugelspeler in de loop aan, niet in de voeten\nZorg dat er minstens twee spelers de zestien inlopen\nEén op de eerste paal, één op de tweede\nWissel snel van kant als de bal er aan één zijde niet doorkomt", "tekening": null, "favoriet": false}, {"naam": "Voorzetten en afronden", "type": "Oefening", "categorie": "Aanvallend", "doel": "Afwerken", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 10, "veldGrootte": "halve speelhelft", "materialen": "groot doel, 8 pionnen, 10 ballen", "beschrijving": "Vanaf beide flanken wordt afwisselend voorgezet. Drie aanvallers lopen de zestien in: eerste paal, tweede paal en terugleggen aan de rand. De voorzetter kiest zelf hard laag of hoog naar de tweede paal. Na tien voorzetten wisselen de rollen.", "aandachtspunten": "Loop niet te vroeg in, wacht tot de voorzetter zijn hoofd opheft\nDe eerste paal loopt kort en scherp\nGa er met snelheid in, sta niet stil te wachten\nBij een lage voorzet: raak hem, richting is belangrijker dan kracht", "tekening": null, "favoriet": false}, {"naam": "Vier tegen twee in het blok", "type": "Positiespel", "categorie": "Aanvallend", "doel": "Positiespel", "leeftijd": "O18-O19", "duur": 12, "aantalSpelers": 8, "veldGrootte": "18 x 18 meter", "materialen": "hesjes, 4 pionnen, 3 ballen", "beschrijving": "Vier balbezitters spelen rond tegen twee jagers in een afgebakend vak. Na acht passes op rij is er een punt. Verliest de balbezittende ploeg de bal, dan wisselt het duo dat de fout maakte met de jagers.", "aandachtspunten": "Zoek altijd de passlijn die het verst vooruit ligt\nBied aan in een driehoek, nooit in één lijn\nSpeel de bal weg van de jager\nBlijf bewegen ook zonder bal", "tekening": null, "favoriet": false}, {"naam": "Kruisen en doorlopen", "type": "Oefening", "categorie": "Aanvallend", "doel": "Aanvallen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 8, "veldGrootte": "30 x 25 meter", "materialen": "pionnen, 4 ballen, 1 doel", "beschrijving": "Twee spelers naast elkaar krijgen de bal van achteren. Zij kruisen: de bal wordt overgelaten of overgedragen, waarna één van beiden doorstoot richting doel. De verdediger mag pas ingrijpen als het kruisen begonnen is.", "aandachtspunten": "Kruis dicht langs elkaar, laat geen gat vallen\nDe man zonder bal bepaalt door zijn loopactie wat er gebeurt\nGeef vooraf een teken, met stem of oogcontact\nNa het kruisen direct richting doel, niet nog een keer draaien", "tekening": null, "favoriet": false}, {"naam": "Afwerken na wandpass", "type": "Oefening", "categorie": "Aanvallend", "doel": "Afwerken", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 8, "veldGrootte": "30 x 20 meter", "materialen": "groot doel, 6 pionnen, 10 ballen", "beschrijving": "Een aanvaller speelt op een vaste kaatser aan de rand van het strafschopgebied, loopt langs hem heen en werkt af op de terugleg. Wissel de kant en de voet af. Voeg later een passieve verdediger toe die de kaats mag storen.", "aandachtspunten": "Speel de wandpass hard en strak in\nLoop langs de kaatser, niet er omheen\nDe kaats komt vooruit in de loop, niet in de voeten\nKijk waar de keeper staat voor je afdrukt", "tekening": null, "favoriet": false}, {"naam": "Een tegen een op de flank", "type": "Oefening", "categorie": "Aanvallend", "doel": "Dribbelen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 8, "veldGrootte": "20 x 15 meter", "materialen": "pionnen, 6 ballen, 2 doeltjes", "beschrijving": "De aanvaller krijgt de bal met de verdediger tegenover zich op de flank. Hij probeert langs de buitenkant te komen en de achterlijn te halen, of naar binnen te snijden en te scoren in een klein doel. Rollen wisselen na elke poging.", "aandachtspunten": "Neem de bal aan in de loop, niet stilstaand\nGa er met snelheid op af, dan moet de verdediger kiezen\nGebruik een schijnbeweging voordat je versnelt\nBij de achterlijn: kijk op voor je voorzet", "tekening": null, "favoriet": false}, {"naam": "Positiespel 6 tegen 4 met kantelen", "type": "Positiespel", "categorie": "Aanvallend", "doel": "Positiespel", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 12, "veldGrootte": "35 x 30 meter", "materialen": "hesjes, pionnen, 4 ballen", "beschrijving": "Het vak is in tweeën gedeeld. Zes balbezitters spelen tegen vier jagers in één helft. Na zes passes mag er gekanteld worden naar de andere helft, waar twee nieuwe jagers wachten. Doel is de bal onder druk beheerst overbrengen.", "aandachtspunten": "Kantelen doe je met één lange bal of twee snelle korte\nDe verste speler biedt zich aan zodra de kanteling eraan komt\nHoud minstens één speler achter de bal\nSpeel niet te vroeg over, lok eerst de druk uit", "tekening": null, "favoriet": false}, {"naam": "Diepte zoeken via de spits", "type": "Positiespel", "categorie": "Aanvallend", "doel": "Aanvallen", "leeftijd": "O18-O19", "duur": 18, "aantalSpelers": 11, "veldGrootte": "40 x 35 meter", "materialen": "hesjes, 2 doelen, 6 ballen", "beschrijving": "Vijf tegen vijf met aan elke kant een vaste spits in een aparte zone bij het doel. De ploeg in balbezit probeert de eigen spits in te spelen; die kaatst terug of legt af op een inkomende speler. Alleen na een inspeel op de spits mag er gescoord worden.", "aandachtspunten": "De spits laat zich zien op het moment dat de passer opkijkt\nSpeel in op de voet die van de verdediger af staat\nEén speler loopt altijd om de spits heen\nBij de kaats direct vooruit, niet terug", "tekening": null, "favoriet": false}, {"naam": "Vier goals partij", "type": "Wedstrijdvorm", "categorie": "Aanvallend", "doel": "Aanvallen", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 12, "veldGrootte": "45 x 35 meter", "materialen": "hesjes, 4 doeltjes, 6 ballen", "beschrijving": "Beide ploegen verdedigen twee kleine doelen en vallen aan op twee kleine doelen. Door de vier doelen ontstaat er ruimte aan de zijkanten en moet er voortdurend van speelrichting gewisseld worden.", "aandachtspunten": "Kijk welk doel het minst bewaakt is\nSpeel snel van kant naar kant\nOpen je lichaam zodat je beide doelen ziet\nHoud het veld breed als je de bal hebt", "tekening": null, "favoriet": false}, {"naam": "Combineren in het laatste dertig", "type": "Positiespel", "categorie": "Aanvallend", "doel": "Aanvallen", "leeftijd": "O18-O19", "duur": 22, "aantalSpelers": 14, "veldGrootte": "40 x 30 meter", "materialen": "hesjes, groot doel, 8 ballen", "beschrijving": "Zeven aanvallers tegen vijf verdedigers plus keeper op een halve helft. De aanvallers moeten binnen dertig seconden tot een schot komen. Lukt dat niet, of verovert de verdediging de bal, dan volgt er een nieuwe start van de trainer.", "aandachtspunten": "Zoek de één-tweetjes op korte ruimte\nZorg voor bezetting van de zestien voor er voorgezet wordt\nSchiet als je kans hebt, twijfel niet\nDe man aan de rand vangt de tweede bal op", "tekening": null, "favoriet": false}, {"naam": "Aanvallende overtal drie tegen twee", "type": "Wedstrijdvorm", "categorie": "Aanvallend", "doel": "Aanvallen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 10, "veldGrootte": "30 x 25 meter", "materialen": "groot doel, hesjes, 8 ballen", "beschrijving": "Drie aanvallers starten op de middenlijn tegen twee verdedigers en een keeper. Het overtal moet snel worden uitgespeeld, binnen tien seconden. Na afloop sprinten de aanvallers terug en start de volgende groep.", "aandachtspunten": "De middelste speler kiest, de buitensten bieden aan\nSpeel de bal naar de kant waar de verdediger niet staat\nBenut het overtal snel, twijfelen kost het voordeel\nAfronden gaat voor mooi combineren", "tekening": null, "favoriet": false}, {"naam": "Schotoefening met draai", "type": "Oefening", "categorie": "Aanvallend", "doel": "Afwerken", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 8, "veldGrootte": "25 x 20 meter", "materialen": "groot doel, pionnen, 10 ballen", "beschrijving": "De aanvaller staat met de rug naar het doel en krijgt de bal ingespeeld. Hij draait in één beweging weg van de meegekomen verdediger en schiet. Wissel af tussen links en rechts wegdraaien.", "aandachtspunten": "Kijk over je schouder voordat de bal komt\nZet je lichaam tussen bal en verdediger\nDraai met de eerste aanname weg, niet in twee keer\nSchiet laag in de hoek", "tekening": null, "favoriet": false}, {"naam": "Insnijden en afronden", "type": "Oefening", "categorie": "Aanvallend", "doel": "Afwerken", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 8, "veldGrootte": "30 x 25 meter", "materialen": "groot doel, pionnen, 10 ballen", "beschrijving": "De buitenspeler start breed op de flank, snijdt met de bal naar binnen langs een pion en werkt af met de sterke voet. Later wordt de pion vervangen door een halfactieve verdediger die de binnenkant dicht wil houden.", "aandachtspunten": "Neem de bal mee met de voet die het verst van de verdediger staat\nDe eerste stap naar binnen is de belangrijkste\nMaak je actie op snelheid, niet op kracht\nMik op de verre hoek", "tekening": null, "favoriet": false}, {"naam": "Wisselen van speelhelft", "type": "Positiespel", "categorie": "Aanvallend", "doel": "Positiespel", "leeftijd": "O18-O19", "duur": 18, "aantalSpelers": 14, "veldGrootte": "50 x 35 meter", "materialen": "hesjes, pionnen, 6 ballen", "beschrijving": "Zeven tegen zeven op een breed veld met een middenzone. Een punt scoor je door de bal van de ene buitenzone naar de andere te brengen zonder balverlies. De middenzone mag door maximaal twee verdedigers bezet worden.", "aandachtspunten": "Speel de lange bal met de wreef, in de loop\nDe speler aan de overkant komt eerst naar binnen, dan naar buiten\nWissel pas van kant als de druk aan één zijde vastzit\nOntvang met de borst of dij en leg direct klaar", "tekening": null, "favoriet": false}, {"naam": "Corner aanvallend", "type": "Oefening", "categorie": "Aanvallend", "doel": "Spelhervatting", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 12, "veldGrootte": "zestien meter gebied", "materialen": "groot doel, 10 ballen, hesjes", "beschrijving": "Vaste hoekschopvarianten oefenen: één korte variant, één naar de eerste paal en één naar de rand van het gebied. Vier spelers lopen in vaste looplijnen, twee blijven achter voor de restverdediging.", "aandachtspunten": "Loop pas in als de corner genomen wordt\nDe eerste paal verlengt, de tweede paal duikt in\nEén speler blijft altijd aan de rand voor de tweede bal\nTwee spelers blijven achter tegen de counter", "tekening": null, "favoriet": false}, {"naam": "Vrije trap rond de zestien", "type": "Oefening", "categorie": "Aanvallend", "doel": "Spelhervatting", "leeftijd": "O18-O19", "duur": 12, "aantalSpelers": 10, "veldGrootte": "halve speelhelft", "materialen": "groot doel, muur, 10 ballen", "beschrijving": "Vrije trappen vanaf verschillende afstanden en hoeken met een muur van drie man. Wissel af tussen direct schieten, over de muur krullen en een afgesproken korte variant waarbij de bal opzij wordt gelegd.", "aandachtspunten": "Spreek vooraf af wie er schiet en wie er aflegt\nBij de korte variant: de aflegger loopt weg om ruimte te maken\nMik boven de muur maar onder de lat\nZorg voor twee spelers op de rebound", "tekening": null, "favoriet": false}, {"naam": "Een tegen een verdedigen", "type": "Oefening", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 8, "veldGrootte": "20 x 15 meter", "materialen": "pionnen, 6 ballen, 2 doeltjes", "beschrijving": "De aanvaller start met de bal, de verdediger komt hem tegemoet. De verdediger probeert de aanvaller naar buiten te sturen en de bal te veroveren zonder in de tackle te gaan. Wisselen na elke poging.", "aandachtspunten": "Kom snel uit maar rem af op twee meter afstand\nSta zijwaarts, wijs hem één kant op\nWacht op zijn tweede aanraking\nBlijf op je voeten, ga niet liggen", "tekening": null, "favoriet": false}, {"naam": "Druk zetten vanaf voren", "type": "Positiespel", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 14, "veldGrootte": "40 x 35 meter", "materialen": "hesjes, 2 doelen, 6 ballen", "beschrijving": "De opbouwende ploeg speelt vanaf de keeper. Op het teken van de trainer zet de aanvallende ploeg met drie man druk, terwijl de rest de passlijnen dichthoudt. Balverovering binnen zes seconden levert een punt op.", "aandachtspunten": "De eerste druk komt in een boog, zodat de terugspeelbal dicht is\nDe tweede man dekt de dichtstbijzijnde passlijn\nJaag samen, of jaag niet\nGeef het startsein duidelijk met je stem", "tekening": null, "favoriet": false}, {"naam": "Compact blok verdedigen", "type": "Wedstrijdvorm", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 22, "aantalSpelers": 16, "veldGrootte": "50 x 40 meter", "materialen": "hesjes, 2 doelen, 6 ballen", "beschrijving": "Acht tegen acht waarbij de verdedigende ploeg de opdracht heeft om binnen vijfentwintig meter compact te blijven. De trainer meet de afstand tussen de laatste lijn en de spits; bij te veel ruimte volgt een fluitsignaal.", "aandachtspunten": "Houd de afstand tussen de linies onder de vijftien meter\nSchuif mee met de bal, allemaal tegelijk\nDe spits jaagt niet alleen, hij stuurt\nBij een lange bal: samen naar achteren", "tekening": null, "favoriet": false}, {"naam": "Knijpen en kantelen achterin", "type": "Oefening", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 18, "aantalSpelers": 10, "veldGrootte": "40 x 25 meter", "materialen": "pionnen, hesjes, 6 ballen", "beschrijving": "Vier verdedigers verdedigen tegen vier aanvallers die de bal van links naar rechts laten rondgaan. De verdediging schuift mee: de bal-nabije speler knijpt naar de bal, de verste geeft rugdekking en komt naar binnen.", "aandachtspunten": "De bal bepaalt waar iedereen staat, niet de tegenstander\nDe verste verdediger komt naar binnen, niet mee naar buiten\nSchuif als een ketting, blijf verbonden\nRoep naar elkaar wie er uitstapt", "tekening": null, "favoriet": false}, {"naam": "Verdedigen in ondertal", "type": "Wedstrijdvorm", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 10, "veldGrootte": "30 x 25 meter", "materialen": "groot doel, hesjes, 8 ballen", "beschrijving": "Twee verdedigers plus keeper tegen drie aanvallers. De verdedigers moeten tijd rekken tot er na acht seconden een derde verdediger mag aansluiten. Doel is vertragen in plaats van veroveren.", "aandachtspunten": "Zak terug, ga niet jagen als je in ondertal bent\nStuur ze naar de zijkant, weg van het doel\nBlijf tussen bal en doel\nWacht op je hulp voordat je uitstapt", "tekening": null, "favoriet": false}, {"naam": "Duel om de tweede bal", "type": "Oefening", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 12, "veldGrootte": "25 x 25 meter", "materialen": "hesjes, 6 ballen", "beschrijving": "De trainer speelt een hoge bal het vak in. Twee groepjes van drie duelleren om het kopduel en vooral om de bal die daarna vrijkomt. Wie de tweede bal onder controle brengt en uitspeelt, scoort een punt.", "aandachtspunten": "Kijk waar de bal heen kopt, niet naar de kopper\nZet je lichaam tussen bal en tegenstander\nDe tweede bal is belangrijker dan de eerste\nBlijf op je tenen staan, niet plat", "tekening": null, "favoriet": false}, {"naam": "Verdedigen van de voorzet", "type": "Wedstrijdvorm", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 12, "veldGrootte": "halve speelhelft", "materialen": "groot doel, hesjes, 10 ballen", "beschrijving": "Vanaf de flanken worden voortdurend voorzetten gegeven. Vier verdedigers plus keeper verdedigen tegen drie aanvallers. Elke bal die wordt weggewerkt buiten de zestien telt als geslaagd.", "aandachtspunten": "De verste verdediger dekt de tweede paal\nStap naar voren bij de bal, wacht niet af\nKop de bal hoog, ver en breed weg\nEén speler dekt altijd de rand van de zestien", "tekening": null, "favoriet": false}, {"naam": "Buitenspelval", "type": "Oefening", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 12, "veldGrootte": "40 x 30 meter", "materialen": "hesjes, pionnen, 6 ballen", "beschrijving": "Vier verdedigers oefenen het gezamenlijk uitstappen op teken van de centrale verdediger. Aanvallers proberen op het juiste moment diep te gaan. De trainer beoordeelt of de lijn gelijk stond.", "aandachtspunten": "Eén speler geeft het teken, de rest volgt zonder na te denken\nStap uit op het moment dat de passer zijn hoofd naar beneden doet\nLoop rechtuit naar voren, niet schuin\nBij twijfel: niet uitstappen", "tekening": null, "favoriet": false}, {"naam": "Pressing in het rondo", "type": "Positiespel", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 12, "aantalSpelers": 10, "veldGrootte": "15 x 15 meter", "materialen": "hesjes, 4 pionnen, 3 ballen", "beschrijving": "Vier tegen vier met twee neutrale spelers. De ploeg die de bal verliest moet direct met zijn tweeën jagen. Balverovering binnen vijf seconden levert een punt op; daarna gaat het spel gewoon door.", "aandachtspunten": "Jaag met zijn tweeën, één op de bal en één op de uitweg\nSluit de kortste passlijn af\nBlijf jagen tot de vijf seconden om zijn\nDaarna zakken en het blok herstellen", "tekening": null, "favoriet": false}, {"naam": "Terugzakken bij balverlies", "type": "Wedstrijdvorm", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 14, "veldGrootte": "50 x 35 meter", "materialen": "hesjes, 2 doelen, 6 ballen", "beschrijving": "Zeven tegen zeven waarbij de ploeg die de bal verliest eerst terug moet tot achter een middellijn voordat er weer gejaagd mag worden. Zo wordt het herstellen van de organisatie afgedwongen.", "aandachtspunten": "Sprint terug op de kortste lijn, niet met de bal mee\nKijk over je schouder waar je moet zijn\nDe dichtstbijzijnde speler vertraagt, de rest herstelt\nPas jagen als het blok weer staat", "tekening": null, "favoriet": false}, {"naam": "Dekken en rugdekking", "type": "Oefening", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 9, "veldGrootte": "25 x 20 meter", "materialen": "pionnen, hesjes, 6 ballen", "beschrijving": "Twee verdedigers tegen twee aanvallers. De verdediger op de bal zet druk, zijn maat neemt schuin achter hem positie in. Bij een pass wisselen de rollen: de rugdekker wordt de druk en andersom.", "aandachtspunten": "De rugdekker staat schuin achter, nooit naast\nAfstand ongeveer vijf meter\nPraat met elkaar: ik ga, jij dekt\nWissel de rollen in één beweging als de bal gaat", "tekening": null, "favoriet": false}, {"naam": "Doelpogingen blokken", "type": "Oefening", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 12, "aantalSpelers": 8, "veldGrootte": "20 x 20 meter", "materialen": "groot doel, pionnen, 10 ballen", "beschrijving": "Aanvallers schieten van net buiten de zestien. Verdedigers oefenen het uitstappen en blokken zonder een overtreding te maken. Een geblokt schot telt als punt voor de verdediging.", "aandachtspunten": "Kom recht op de bal af, niet schuin\nBenen dicht bij elkaar, handen langs het lichaam\nBlok met je lichaam, niet met je voet vooruit\nDraai je hoofd weg maar blijf kijken", "tekening": null, "favoriet": false}, {"naam": "Spits in de rug dekken", "type": "Oefening", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 8, "veldGrootte": "25 x 20 meter", "materialen": "pionnen, hesjes, 6 ballen", "beschrijving": "Een spits laat zich voortdurend afzakken om de bal in de voeten te vragen. De verdediger moet kiezen tussen meegaan of afgeven. De trainer speelt de ballen in en beoordeelt de keuze.", "aandachtspunten": "Sta in zijn rug maar op een halve meter afstand\nGa mee zolang je rugdekking hebt\nDwing hem met de rug naar het doel te ontvangen\nStap in op het moment dat hij de bal aanneemt", "tekening": null, "favoriet": false}, {"naam": "Jagen op de bal in zones", "type": "Positiespel", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 14, "veldGrootte": "45 x 30 meter", "materialen": "hesjes, pionnen, 6 ballen", "beschrijving": "Het veld is in drie zones verdeeld. De verdedigende ploeg mag alleen jagen in de zone waar de bal is, met maximaal drie spelers. De rest houdt de andere zones dicht. Zo wordt gericht en gezamenlijk jagen geoefend.", "aandachtspunten": "Alleen jagen als de eerste druk goed staat\nDe zone achter de bal blijft bezet\nDwing ze naar de zijlijn, dat is je extra verdediger\nBij het overspelen: zone uit, zone in", "tekening": null, "favoriet": false}, {"naam": "Corner verdedigen", "type": "Oefening", "categorie": "Verdedigend", "doel": "Spelhervatting", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 12, "veldGrootte": "zestien meter gebied", "materialen": "groot doel, 10 ballen, hesjes", "beschrijving": "Vaste taakverdeling bij hoekschoppen oefenen: twee man op de palen, mandekking op de gevaarlijkste koppers, één op de korte variant en één aan de rand voor de tweede bal.", "aandachtspunten": "Neem je man over zodra de bal genomen wordt\nKop hoog en breed weg, nooit door het midden\nDe man op de rand vangt de terugvallende bal\nEén speler blijft voorin staan voor de counter", "tekening": null, "favoriet": false}, {"naam": "Muur bij vrije trap", "type": "Oefening", "categorie": "Verdedigend", "doel": "Spelhervatting", "leeftijd": "O18-O19", "duur": 12, "aantalSpelers": 10, "veldGrootte": "halve speelhelft", "materialen": "groot doel, 10 ballen", "beschrijving": "De muur opstellen op aanwijzing van de keeper. Wissel af tussen drie, vier en vijf man. Oefen ook het uitstappen van de muur op het moment dat er wordt afgelegd in plaats van geschoten.", "aandachtspunten": "De keeper bepaalt de plek van de muur, niemand anders\nSpring pas als de bal geraakt is\nEén speler ligt achter de muur bij een lage bal\nBij een aflegger stapt de hele muur uit", "tekening": null, "favoriet": false}, {"naam": "Verdedigen met een man minder", "type": "Wedstrijdvorm", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 15, "veldGrootte": "45 x 35 meter", "materialen": "hesjes, 2 doelen, 6 ballen", "beschrijving": "Zeven tegen acht. De ploeg in ondertal moet de nul houden gedurende acht minuten. Daarna wisselen. Het accent ligt op compact blijven en ruimte weggeven waar het niet gevaarlijk is.", "aandachtspunten": "Geef de zijkanten weg, houd het midden dicht\nZak terug in plaats van te jagen\nHoud de linies dicht bij elkaar\nDe spits blijft voorin voor de ontlasting", "tekening": null, "favoriet": false}, {"naam": "Eerste druk op de bal", "type": "Oefening", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 12, "aantalSpelers": 8, "veldGrootte": "20 x 20 meter", "materialen": "pionnen, hesjes, 6 ballen", "beschrijving": "Een aanvaller ontvangt de bal met de rug naar het doel of half opengedraaid. De dichtstbijzijnde verdediger oefent het moment en de hoek van zijn eerste druk. De trainer varieert de scherpte van de inspeelpass.", "aandachtspunten": "Vertrek op het moment dat de bal onderweg is\nRem af voordat je bij hem bent\nSluit de kant af waar hij naartoe wil\nRaak hem niet aan, dwing hem terug", "tekening": null, "favoriet": false}, {"naam": "Zonedekking op het middenveld", "type": "Positiespel", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 14, "veldGrootte": "40 x 35 meter", "materialen": "hesjes, pionnen, 6 ballen", "beschrijving": "Vier middenvelders verdedigen een zone tegen zes aanvallers die de bal door de zone willen spelen. De verdedigers dekken ruimte, niet man. Elke onderschepping levert een punt op.", "aandachtspunten": "Sta in de passlijn, niet op de man\nSchuif mee met de bal als een blok van vier\nHoud je schouder open zodat je beide kanten ziet\nStap in als de bal in de lucht is", "tekening": null, "favoriet": false}, {"naam": "Herstellen na de tegenaanval", "type": "Wedstrijdvorm", "categorie": "Verdedigend", "doel": "Verdedigen", "leeftijd": "O18-O19", "duur": 18, "aantalSpelers": 12, "veldGrootte": "50 x 35 meter", "materialen": "hesjes, 2 doelen, 6 ballen", "beschrijving": "De aanvallende ploeg krijgt telkens een bal ingespeeld voor een snelle aanval. De verdedigers starten vijf meter achter en moeten terugsprinten om het gevaar te keren. Zo wordt de terugloop onder vermoeidheid getraind.", "aandachtspunten": "Sprint naar het doel, niet naar de bal\nDe eerste terugkomer vertraagt, de rest sluit aan\nKijk over je schouder terwijl je terugloopt\nGa niet in de tackle, hou hem op", "tekening": null, "favoriet": false}, {"naam": "Direct terugjagen na balverlies", "type": "Wedstrijdvorm", "categorie": "Omschakeling A-V", "doel": "Omschakeling A-V", "leeftijd": "O18-O19", "duur": 18, "aantalSpelers": 14, "veldGrootte": "40 x 35 meter", "materialen": "hesjes, 4 doeltjes, 6 ballen", "beschrijving": "Zeven tegen zeven op vier kleine doelen. De ploeg die de bal verliest heeft zes seconden om hem terug te veroveren. Lukt dat, dan levert het een punt op, ook zonder doelpunt. Lukt het niet, dan moet iedereen terug achter de middellijn.", "aandachtspunten": "De dichtstbijzijnde speler jaagt direct, zonder aarzelen\nDe tweede man sluit de uitweg af\nJaag naar de zijlijn, nooit naar het midden\nNa zes seconden: stoppen en terugzakken", "tekening": null, "favoriet": false}, {"naam": "Restverdediging bij eigen aanval", "type": "Positiespel", "categorie": "Omschakeling A-V", "doel": "Omschakeling A-V", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 14, "veldGrootte": "50 x 35 meter", "materialen": "hesjes, 2 doelen, 6 ballen", "beschrijving": "De aanvallende ploeg valt aan met zes man, maar moet altijd drie spelers achter de bal houden. Verliest de ploeg de bal, dan moet die restverdediging de counter opvangen. De trainer beoordeelt of de bezetting klopte.", "aandachtspunten": "Twee centraal en één controlerend, altijd achter de bal\nSchuif mee met de aanval maar blijf achter de bal\nBij verlies: eerst vertragen, dan pas druk\nKijk voortdurend achterom naar de spitsen van de tegenstander", "tekening": null, "favoriet": false}, {"naam": "Omschakelspel vier tegen vier plus drie", "type": "Positiespel", "categorie": "Omschakeling A-V", "doel": "Omschakeling A-V", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 11, "veldGrootte": "30 x 25 meter", "materialen": "hesjes, 3 ballen", "beschrijving": "Vier tegen vier met drie neutrale spelers die altijd met de balbezittende ploeg meedoen. Bij balverlies wisselt het overtal onmiddellijk van kant, waardoor spelers razendsnel van aanvallen naar verdedigen moeten schakelen.", "aandachtspunten": "Herken het moment van verlies direct, kijk niet naar de bal die je kwijt bent\nDe neutrale spelers schakelen als eerste\nSchreeuw bij het omschakelen zodat iedereen wakker is\nEerste twee seconden bepalen alles", "tekening": null, "favoriet": false}, {"naam": "Terugsprint na eigen kans", "type": "Oefening", "categorie": "Omschakeling A-V", "doel": "Omschakeling A-V", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 10, "veldGrootte": "hele speelhelft", "materialen": "2 doelen, hesjes, 8 ballen", "beschrijving": "Drie aanvallers gaan op doel af. Zodra er geschoten is of de keeper de bal heeft, speelt die direct lang op twee spelers die op de middenlijn staan. De aanvallers moeten terugsprinten en dat gevaar keren.", "aandachtspunten": "Sprint terug op het moment dat het schot valt, niet erna\nDe verste speler herstelt als eerste\nVertraag de tegenstander tot je hulp hebt\nBlijf tussen bal en eigen doel", "tekening": null, "favoriet": false}, {"naam": "Van aanvallen naar blok in tien seconden", "type": "Wedstrijdvorm", "categorie": "Omschakeling A-V", "doel": "Omschakeling A-V", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 16, "veldGrootte": "55 x 40 meter", "materialen": "hesjes, 2 doelen, 6 ballen", "beschrijving": "Acht tegen acht. Elke keer dat de trainer fluit, moet de balbezittende ploeg de bal loslaten en binnen tien seconden een compact verdedigend blok vormen achter de middellijn. Daarna gaat het spel gewoon door.", "aandachtspunten": "Iedereen weet vooraf welke plek hij inneemt\nDe verste spelers hebben de langste weg, dus zij vertrekken eerst\nVorm eerst de lijn, dan pas de druk\nBlijf communiceren tijdens het terugzakken", "tekening": null, "favoriet": false}, {"naam": "Counter na balverovering", "type": "Wedstrijdvorm", "categorie": "Omschakeling V-A", "doel": "Omschakeling V-A", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 14, "veldGrootte": "55 x 35 meter", "materialen": "hesjes, 2 doelen, 6 ballen", "beschrijving": "Zeven tegen zeven. Na een balverovering heeft de veroverende ploeg tien seconden om tot een doelpoging te komen. Lukt dat, dan telt het doelpunt dubbel. Zo wordt de directheid na verovering beloond.", "aandachtspunten": "Kijk vooruit voordat je de bal aanneemt\nDe eerste pass gaat vooruit als het kan\nTwee spelers sprinten meteen diep\nSpeel simpel, snelheid gaat voor schoonheid", "tekening": null, "favoriet": false}, {"naam": "Snel omschakelen via de flank", "type": "Oefening", "categorie": "Omschakeling V-A", "doel": "Omschakeling V-A", "leeftijd": "O18-O19", "duur": 18, "aantalSpelers": 12, "veldGrootte": "hele speelhelft", "materialen": "2 doelen, hesjes, 8 ballen", "beschrijving": "De verdediging verovert de bal na een ingespeelde aanval en zoekt direct de vleugelspeler die al breed staat. Vandaar volgt een voorzet op twee inkomende spelers. Het gaat om het tempo tussen verovering en voorzet.", "aandachtspunten": "De vleugelspeler staat al breed voordat de bal veroverd is\nEerste pass met de wreef, hard en vooruit\nTwee spelers vullen de zestien, één blijft aan de rand\nNiet meer dan drie passes tot de voorzet", "tekening": null, "favoriet": false}, {"naam": "Uitverdedigen naar de spits", "type": "Oefening", "categorie": "Omschakeling V-A", "doel": "Omschakeling V-A", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 10, "veldGrootte": "hele speelhelft", "materialen": "2 doelen, hesjes, 8 ballen", "beschrijving": "Na een verovering achterin wordt de bal direct lang op de spits gespeeld, die kaatst op een inkomende middenvelder. Van daaruit volgt een aanval op het andere doel met drie spelers.", "aandachtspunten": "De spits laat zich zien op het moment van verovering\nSpeel de lange bal op zijn borst of voet, niet in de ruimte\nDe middenvelder loopt al voordat de kaats komt\nMinstens drie spelers steunen de aanval", "tekening": null, "favoriet": false}, {"naam": "Omschakelspel met twee doelen", "type": "Wedstrijdvorm", "categorie": "Omschakeling V-A", "doel": "Omschakeling V-A", "leeftijd": "O18-O19", "duur": 20, "aantalSpelers": 12, "veldGrootte": "45 x 35 meter", "materialen": "hesjes, 4 doeltjes, 6 ballen", "beschrijving": "Zes tegen zes met aan beide kanten twee kleine doelen. Na balverovering moet er binnen acht seconden gescoord worden in een van de twee doelen. Door de twee doelen ontstaat er altijd een vrije kant.", "aandachtspunten": "Kijk direct na de verovering welk doel het minst bewaakt is\nSpeel weg van de plek waar je de bal veroverde\nDe eerste pass bepaalt of de counter slaagt\nBlijf breed, dan houd je beide doelen bereikbaar", "tekening": null, "favoriet": false}, {"naam": "Eerste pass vooruit", "type": "Positiespel", "categorie": "Omschakeling V-A", "doel": "Omschakeling V-A", "leeftijd": "O18-O19", "duur": 15, "aantalSpelers": 12, "veldGrootte": "40 x 30 meter", "materialen": "hesjes, pionnen, 6 ballen", "beschrijving": "Zes tegen zes in een vak. Na balverovering moet de eerste pass vooruit zijn, anders gaat de bal naar de tegenstander. Zo leren spelers direct de diepte te zoeken in plaats van veilig terug te spelen.", "aandachtspunten": "Kijk over je schouder voordat je de bal verovert\nEén speler biedt zich altijd diep aan\nDurf de risicovolle pass te geven op dit moment\nLukt de diepe bal niet, dan pas terug", "tekening": null, "favoriet": false}];

const OEFENING_CATEGORIEEN = ["Aanvallend","Verdedigend","Omschakeling A-V","Omschakeling V-A","Overig"];
const LEEG_OEFENING = { id:null, naam:"", type:"Oefening", categorie:"Overig", doel:"Passen & trappen", leeftijd:"O18-O19",
  duur:15, aantalSpelers:11, veldGrootte:"", materialen:"", beschrijving:"", aandachtspunten:"", tekening:null, favoriet:false };


/* ── SEIZOENSPLANNER ── */
const SEIZOEN_KEY = "fch_seizoen_v1";
const laadBlokken = () => laadJson(SEIZOEN_KEY);
const BLOK_THEMAS = [
  {id:"voorbereiding", label:"Voorbereiding", kleur:"#fd7e14"},
  {id:"opbouw",        label:"Opbouw",        kleur:"#38b6ff"},
  {id:"competitie",    label:"Competitie",    kleur:"#004aad"},
  {id:"winterstop",    label:"Winterstop",    kleur:"#6c757d"},
  {id:"eindfase",      label:"Eindfase",      kleur:"#28a745"},
  {id:"herstel",       label:"Herstel",       kleur:"#17a2b8"}
];
function blokThema(id) {
  return BLOK_THEMAS.find(function(t){return t.id===id;}) || BLOK_THEMAS[2];
}
const LEEG_BLOK = { id:null, naam:"", thema:"competitie", vanaf:"", tot:"", focus:"" };

function inPeriode(datum, vanaf, tot) {
  if (!datum || !vanaf || !tot) return false;
  var d = parseerDatum(datum), a = parseerDatum(vanaf), b = parseerDatum(tot);
  if (!d || !a || !b) return false;
  return d.getTime() >= a.getTime() && d.getTime() <= b.getTime();
}
function aantalWeken(vanaf, tot) {
  var a = parseerDatum(vanaf), b = parseerDatum(tot);
  if (!a || !b) return 0;
  var dagen = Math.round((b.getTime()-a.getTime())/86400000) + 1;
  return Math.max(1, Math.round(dagen/7));
}
function blokDagen(vanaf, tot) {
  var a = parseerDatum(vanaf), b = parseerDatum(tot);
  if (!a || !b) return 0;
  return Math.max(1, Math.round((b.getTime()-a.getTime())/86400000) + 1);
}
function isNuBezig(vanaf, tot) {
  var nu = new Date(); nu.setHours(12,0,0,0);
  var a = parseerDatum(vanaf), b = parseerDatum(tot);
  if (!a || !b) return false;
  return nu.getTime() >= a.getTime() && nu.getTime() <= b.getTime();
}


/* De hele FC-skills-rekenlaag (fcCategorieen, fcWaarde, fcCategorieWaarde,
   fcSterren, heeftSkills, fcNorm, fcOvr, migreerSkills, en de bijbehorende
   FC_CATEGORIEEN/FC_KEEPER/FC_NORM/OVR_GEWICHT) staat sinds P3 stap 3 in
   src/domein/statistieken.js. FC_STERREN en ovrKleur hieronder blijven
   hier omdat React-componenten verderop ze rechtstreeks gebruiken. */
const FC_STERREN = [
  {id:"trucs",    label:"Trucjes",       uitleg:"Hoeveel technische trucs beheerst hij?"},
  {id:"zwakbeen", label:"Andere been",   uitleg:"Hoe goed is hij met zijn niet-favoriete been?"}
];
/* Kleur zoals in het spel: rood zwak, oranje matig, groen sterk */
function ovrKleur(v) {
  var n = Number(v) || 0;
  if (n >= 75) return "#22c55e";
  if (n >= 65) return "#84cc16";
  if (n >= 55) return "#eab308";
  if (n >= 45) return "#f59e0b";
  return "#ef4444";
}


/* ═══════════════════════════════════════════════════════════
   RAPPORTEN
   Drie momenten per seizoen. Bij elk rapport leggen we de skills
   vast zoals ze op dat moment waren, zodat je de groei later
   naast elkaar kunt zetten.
   De rekenfuncties (rapportSoort, rapportenVan, rapportVan, maakRapport,
   rapportAlsSpeler, rapportVerschil, cijferKleur) staan sinds P3 stap 3
   in src/domein/statistieken.js. RAPPORT_SOORTEN blijft hier omdat een
   React-component verderop hem rechtstreeks gebruikt.
═══════════════════════════════════════════════════════════ */
const RAPPORT_SOORTEN = [
  {id:"begin",  label:"Beginrapport",  kort:"Begin",  icoon:"fa-solid fa-flag",          kleur:"#3b82f6",
   uitleg:"Waar staat hij aan het begin van het seizoen?"},
  {id:"tussen", label:"Tussenrapport", kort:"Tussen", icoon:"fa-solid fa-hourglass-half", kleur:"#f59e0b",
   uitleg:"Halverwege: wat gaat goed, waar werken we aan?"},
  {id:"eind",   label:"Eindrapport",   kort:"Eind",   icoon:"fa-solid fa-flag-checkered", kleur:"#22c55e",
   uitleg:"Terugblik op het hele seizoen en de stap naar volgend jaar."}
];


/* ── SPELERONTWIKKELING: doelen & reviews ──
   De rekenfuncties (doelenVanSpeler, reviewsVanSpeler, ontwikkelingsScore,
   telBehaald) staan sinds P3 stap 3 in src/domein/statistieken.js. Wat
   hier blijft is opslag: de sleutels en de lege sjablonen. */
const DOELEN_KEY = "fch_doelen_v1";
const REVIEWS_KEY = "fch_reviews_v1";
const laadDoelen = () => laadJson(DOELEN_KEY);
const laadReviews = () => laadJson(REVIEWS_KEY);
const DOEL_THEMAS = ["Techniek","Tactiek","Fysiek","Mentaal","Positiespel","Leiderschap"];
const LEEG_DOEL = { id:null, spelerId:null, titel:"", thema:"Techniek", omschrijving:"",
  meetbaar:"", streefdatum:"", voortgang:0, behaald:false, aangemaakt:null };
const LEEG_REVIEW = { id:null, spelerId:null, datum:"", wedstrijdId:null, cijfer:null,
  sterk:"", beter:"", afspraak:"" };


/* ── BESCHIKBAARHEID ──
   beschikbaarheidInfo() zelf staat sinds P3 stap 2 in
   src/domein/wedstrijden.js; deze lijst blijft hier omdat een
   React-component verderop hem rechtstreeks gebruikt. */
const BESCHIKBAARHEID = [
  /* De id's blijven zoals ze waren, anders raken opgeslagen spelers hun status kwijt */
  {id:"fit",         label:"Beschikbaar", kleur:"#28a745", icoon:"fa-solid fa-circle-check"},
  {id:"twijfel",     label:"Twijfel",     kleur:"#fd7e14", icoon:"fa-solid fa-circle-question"},
  {id:"geblesseerd", label:"Blessure",    kleur:"#dc3545", icoon:"fa-solid fa-kit-medical"},
  {id:"geschorst",   label:"Geschorst",   kleur:"#6c757d", icoon:"fa-solid fa-ban"},
  {id:"vakantie",    label:"Vakantie",    kleur:"#0ea5e9", icoon:"fa-solid fa-umbrella-beach"}
];

/* ── OPGAVE: aanwezigheid vooraf ──
   De rekenfuncties (opgaveVanSpeler, zetOpgave, de uitleenfuncties,
   telOpgave) staan sinds P3 stap 2 in src/domein/wedstrijden.js. */
const OPGAVE_OPTIES = [
  {id:"ja",        label:"Ja",  kleur:"#28a745"},
  {id:"misschien", label:"Mis", kleur:"#fd7e14"},
  {id:"nee",       label:"Nee", kleur:"#dc3545"}
];


/* ── COMPETITIESTAND ──
   eigenStandRij en standMetPunten staan sinds P3 stap 3 in
   src/domein/statistieken.js. Wat hier blijft is opslag. */
const STAND_KEY = "fch_stand_v1";
const laadStand = () => laadJson(STAND_KEY);

const TRAINING_TYPES = ["Warming-up","Oefening","Positiespel","Wedstrijdvorm","Conditie","Afkoelen"];

function parseerDatum(d) {
  if (!d) return null;
  const parts = d.split("-");
  return new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
}

const FORMATIES_KEY = "fch_formaties_v1";
const TACTIEKEN_KEY = "fch_tactieken_v1";

const FORMATIES_DATA = {
  /* ── 3 VERDEDIGERS ─────────────────── */
  "3-1-4-2": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"CB1",l:"CV",x:25,y:74},{id:"CB2",l:"CV",x:50,y:77},{id:"CB3",l:"CV",x:75,y:74},
    {id:"DM",l:"CVM",x:50,y:64},
    {id:"LM",l:"LM",x:8,y:52},{id:"LCM",l:"CM",x:32,y:51},{id:"RCM",l:"CM",x:68,y:51},{id:"RM",l:"RM",x:92,y:52},
    {id:"ST1",l:"SP",x:36,y:22},{id:"ST2",l:"SP",x:64,y:22},
  ],
  "3-3-4": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"CB1",l:"CV",x:25,y:74},{id:"CB2",l:"CV",x:50,y:77},{id:"CB3",l:"CV",x:75,y:74},
    {id:"LCM",l:"LM",x:22,y:54},{id:"CM",l:"CM",x:50,y:52},{id:"RCM",l:"RM",x:78,y:54},
    {id:"LW",l:"LVA",x:8,y:28},{id:"LF",l:"SP",x:34,y:20},{id:"RF",l:"SP",x:66,y:20},{id:"RW",l:"RVA",x:92,y:28},
  ],
  "3-4-1-2": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"CB1",l:"CV",x:25,y:74},{id:"CB2",l:"CV",x:50,y:77},{id:"CB3",l:"CV",x:75,y:74},
    {id:"LWB",l:"LVV",x:8,y:54},{id:"LCM",l:"CM",x:32,y:52},{id:"RCM",l:"CM",x:68,y:52},{id:"RWB",l:"RVV",x:92,y:54},
    {id:"AM",l:"CAM",x:50,y:39},
    {id:"ST1",l:"SP",x:35,y:22},{id:"ST2",l:"SP",x:65,y:22},
  ],
  "3-4-2-1": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"CB1",l:"CV",x:25,y:74},{id:"CB2",l:"CV",x:50,y:77},{id:"CB3",l:"CV",x:75,y:74},
    {id:"LWB",l:"LVV",x:8,y:54},{id:"LCM",l:"CM",x:32,y:52},{id:"RCM",l:"CM",x:68,y:52},{id:"RWB",l:"RVV",x:92,y:54},
    {id:"LAM",l:"CAM",x:30,y:37},{id:"RAM",l:"CAM",x:70,y:37},
    {id:"ST",l:"SP",x:50,y:18},
  ],
  "3-4-3A": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"CB1",l:"CV",x:25,y:74},{id:"CB2",l:"CV",x:50,y:77},{id:"CB3",l:"CV",x:75,y:74},
    {id:"LWB",l:"LVV",x:8,y:52},{id:"LCM",l:"CM",x:32,y:50},{id:"RCM",l:"CM",x:68,y:50},{id:"RWB",l:"RVV",x:92,y:52},
    {id:"LW",l:"LVA",x:14,y:24},{id:"ST",l:"SP",x:50,y:17},{id:"RW",l:"RVA",x:86,y:24},
  ],
  "3-4-3B": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"CB1",l:"CV",x:25,y:74},{id:"CB2",l:"CV",x:50,y:77},{id:"CB3",l:"CV",x:75,y:74},
    {id:"DM",l:"CVM",x:50,y:62},
    {id:"LM",l:"LM",x:14,y:50},{id:"RM",l:"RM",x:86,y:50},
    {id:"AM",l:"CAM",x:50,y:40},
    {id:"LW",l:"LVA",x:14,y:24},{id:"ST",l:"SP",x:50,y:17},{id:"RW",l:"RVA",x:86,y:24},
  ],
  "3-5-2": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"CB1",l:"CV",x:25,y:74},{id:"CB2",l:"CV",x:50,y:77},{id:"CB3",l:"CV",x:75,y:74},
    {id:"LWB",l:"LVV",x:8,y:52},{id:"LCM",l:"LM",x:30,y:50},{id:"CM",l:"CM",x:50,y:48},{id:"RCM",l:"RM",x:70,y:50},{id:"RWB",l:"RVV",x:92,y:52},
    {id:"ST1",l:"SP",x:34,y:22},{id:"ST2",l:"SP",x:66,y:22},
  ],
  /* ── 4 VERDEDIGERS ─────────────────── */
  "4-1-2-1-2A": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM",l:"CVM",x:50,y:62},
    {id:"LCM",l:"CM",x:34,y:51},{id:"RCM",l:"CM",x:66,y:51},
    {id:"AM",l:"CAM",x:50,y:39},
    {id:"ST1",l:"SP",x:35,y:22},{id:"ST2",l:"SP",x:65,y:22},
  ],
  "4-1-2-1-2B": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM",l:"CVM",x:50,y:62},
    {id:"LCM",l:"CM",x:22,y:51},{id:"RCM",l:"CM",x:78,y:51},
    {id:"AM",l:"CAM",x:50,y:39},
    {id:"ST1",l:"SP",x:35,y:22},{id:"ST2",l:"SP",x:65,y:22},
  ],
  "4-1-3-2": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM",l:"CVM",x:50,y:62},
    {id:"LM",l:"LM",x:20,y:49},{id:"CM",l:"CM",x:50,y:49},{id:"RM",l:"RM",x:80,y:49},
    {id:"ST1",l:"SP",x:35,y:22},{id:"ST2",l:"SP",x:65,y:22},
  ],
  "4-1-4-1": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM",l:"CVM",x:50,y:60},
    {id:"LM",l:"LM",x:10,y:44},{id:"LCM",l:"CM",x:34,y:44},{id:"RCM",l:"CM",x:66,y:44},{id:"RM",l:"RM",x:90,y:44},
    {id:"ST",l:"SP",x:50,y:18},
  ],
  "4-2-1-3": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM1",l:"CVM",x:36,y:59},{id:"DM2",l:"CVM",x:64,y:59},
    {id:"AM",l:"CAM",x:50,y:43},
    {id:"LW",l:"LVA",x:14,y:24},{id:"ST",l:"SP",x:50,y:18},{id:"RW",l:"RVA",x:86,y:24},
  ],
  "4-2-2-2": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM1",l:"CVM",x:36,y:59},{id:"DM2",l:"CVM",x:64,y:59},
    {id:"LM",l:"LM",x:18,y:45},{id:"RM",l:"RM",x:82,y:45},
    {id:"ST1",l:"SP",x:35,y:22},{id:"ST2",l:"SP",x:65,y:22},
  ],
  "4-2-3-1A": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM1",l:"CVM",x:36,y:58},{id:"DM2",l:"CVM",x:64,y:58},
    {id:"LW",l:"LVA",x:14,y:37},{id:"AM",l:"CAM",x:50,y:36},{id:"RW",l:"RVA",x:86,y:37},
    {id:"ST",l:"SP",x:50,y:18},
  ],
  "4-2-3-1B": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM1",l:"CVM",x:36,y:60},{id:"DM2",l:"CVM",x:64,y:60},
    {id:"LAM",l:"CAM",x:26,y:44},{id:"CAM",l:"CAM",x:50,y:43},{id:"RAM",l:"CAM",x:74,y:44},
    {id:"ST",l:"SP",x:50,y:18},
  ],
  "4-2-4": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM1",l:"CVM",x:36,y:56},{id:"DM2",l:"CVM",x:64,y:56},
    {id:"LW",l:"LVA",x:8,y:28},{id:"LF",l:"SP",x:34,y:20},{id:"RF",l:"SP",x:66,y:20},{id:"RW",l:"RVA",x:92,y:28},
  ],
  "4-3-3A": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM",l:"CVM",x:50,y:57},
    {id:"LAM",l:"CAM",x:26,y:44},{id:"RAM",l:"CAM",x:74,y:44},
    {id:"LW",l:"LVA",x:13,y:22},{id:"ST",l:"SP",x:50,y:15},{id:"RW",l:"RVA",x:87,y:22},
  ],
  "4-3-3B": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM1",l:"CVM",x:33,y:57},{id:"DM2",l:"CVM",x:67,y:57},
    {id:"AM",l:"CAM",x:50,y:43},
    {id:"LW",l:"LVA",x:13,y:22},{id:"ST",l:"SP",x:50,y:15},{id:"RW",l:"RVA",x:87,y:22},
  ],
  "4-4-1-1": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"LM",l:"LM",x:10,y:52},{id:"LCM",l:"CM",x:35,y:53},{id:"RCM",l:"CM",x:65,y:53},{id:"RM",l:"RM",x:90,y:52},
    {id:"SS",l:"CAM",x:50,y:35},
    {id:"ST",l:"SP",x:50,y:18},
  ],
  "4-4-2A": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"LM",l:"LM",x:10,y:52},{id:"LCM",l:"CM",x:37,y:53},{id:"RCM",l:"CM",x:63,y:53},{id:"RM",l:"RM",x:90,y:52},
    {id:"ST1",l:"SP",x:36,y:22},{id:"ST2",l:"SP",x:64,y:22},
  ],
  "4-4-2B": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM",l:"CVM",x:50,y:60},
    {id:"LM",l:"LM",x:13,y:49},{id:"RM",l:"RM",x:87,y:49},
    {id:"AM",l:"CAM",x:50,y:38},
    {id:"ST1",l:"SP",x:35,y:22},{id:"ST2",l:"SP",x:65,y:22},
  ],
  "4-5-1A": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"LM",l:"LM",x:8,y:50},{id:"LCM",l:"CM",x:28,y:52},{id:"CM",l:"CM",x:50,y:50},{id:"RCM",l:"CM",x:72,y:52},{id:"RM",l:"RM",x:92,y:50},
    {id:"ST",l:"SP",x:50,y:18},
  ],
  "4-5-1B": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LB",l:"LV",x:14,y:72},{id:"CB1",l:"CV",x:37,y:76},{id:"CB2",l:"CV",x:63,y:76},{id:"RB",l:"RV",x:86,y:72},
    {id:"DM1",l:"CVM",x:34,y:60},{id:"DM2",l:"CVM",x:66,y:60},
    {id:"LM",l:"LM",x:10,y:48},{id:"CM",l:"CM",x:50,y:50},{id:"RM",l:"RM",x:90,y:48},
    {id:"ST",l:"SP",x:50,y:18},
  ],
  /* ── 5 VERDEDIGERS ─────────────────── */
  "5-2-1-2": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LWB",l:"LVV",x:8,y:70},{id:"CB1",l:"CV",x:26,y:76},{id:"CB2",l:"CV",x:50,y:78},{id:"CB3",l:"CV",x:74,y:76},{id:"RWB",l:"RVV",x:92,y:70},
    {id:"DM1",l:"CVM",x:36,y:57},{id:"DM2",l:"CVM",x:64,y:57},
    {id:"AM",l:"CAM",x:50,y:42},
    {id:"ST1",l:"SP",x:35,y:22},{id:"ST2",l:"SP",x:65,y:22},
  ],
  "5-2-3": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LWB",l:"LVV",x:8,y:70},{id:"CB1",l:"CV",x:26,y:76},{id:"CB2",l:"CV",x:50,y:78},{id:"CB3",l:"CV",x:74,y:76},{id:"RWB",l:"RVV",x:92,y:70},
    {id:"CM1",l:"CM",x:34,y:52},{id:"CM2",l:"CM",x:66,y:52},
    {id:"LW",l:"LVA",x:14,y:24},{id:"ST",l:"SP",x:50,y:18},{id:"RW",l:"RVA",x:86,y:24},
  ],
  "5-3-2A": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LWB",l:"LVV",x:8,y:70},{id:"CB1",l:"CV",x:26,y:76},{id:"CB2",l:"CV",x:50,y:78},{id:"CB3",l:"CV",x:74,y:76},{id:"RWB",l:"RVV",x:92,y:70},
    {id:"LCM",l:"LM",x:24,y:50},{id:"CM",l:"CM",x:50,y:48},{id:"RCM",l:"RM",x:76,y:50},
    {id:"ST1",l:"SP",x:34,y:20},{id:"ST2",l:"SP",x:66,y:20},
  ],
  "5-3-2B": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LWB",l:"LVV",x:8,y:70},{id:"CB1",l:"CV",x:26,y:76},{id:"CB2",l:"CV",x:50,y:78},{id:"CB3",l:"CV",x:74,y:76},{id:"RWB",l:"RVV",x:92,y:70},
    {id:"DM",l:"CVM",x:50,y:58},
    {id:"LCM",l:"CM",x:28,y:47},{id:"RCM",l:"CM",x:72,y:47},
    {id:"ST1",l:"SP",x:35,y:22},{id:"ST2",l:"SP",x:65,y:22},
  ],
  "5-4-1A": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LWB",l:"LVV",x:8,y:70},{id:"CB1",l:"CV",x:26,y:76},{id:"CB2",l:"CV",x:50,y:78},{id:"CB3",l:"CV",x:74,y:76},{id:"RWB",l:"RVV",x:92,y:70},
    {id:"LM",l:"LM",x:10,y:52},{id:"LCM",l:"CM",x:34,y:52},{id:"RCM",l:"CM",x:66,y:52},{id:"RM",l:"RM",x:90,y:52},
    {id:"ST",l:"SP",x:50,y:18},
  ],
  "5-4-1B": [
    {id:"GK",l:"DM",x:50,y:88},
    {id:"LWB",l:"LVV",x:8,y:70},{id:"CB1",l:"CV",x:26,y:76},{id:"CB2",l:"CV",x:50,y:78},{id:"CB3",l:"CV",x:74,y:76},{id:"RWB",l:"RVV",x:92,y:70},
    {id:"DM",l:"CVM",x:50,y:60},
    {id:"LM",l:"LM",x:14,y:50},{id:"RM",l:"RM",x:86,y:50},
    {id:"AM",l:"CAM",x:50,y:40},
    {id:"ST",l:"SP",x:50,y:20},
  ],
};

/* Welke spelerspositie hoort bij een plek in de formatie */
const POSITIECODE_NAAR_ROL = {
  DM:"Keeper",
  CV:"Verdediger", LV:"Verdediger", RV:"Verdediger", LVV:"Verdediger", RVV:"Verdediger",
  CVM:"Middenvelder", CM:"Middenvelder", LM:"Middenvelder", RM:"Middenvelder", CAM:"Middenvelder",
  LVA:"Aanvaller", RVA:"Aanvaller", SP:"Aanvaller"
};
/* Hoe goed past een speler bij deze plek: lager is beter */
const ROL_VOLGORDE = ["Keeper","Verdediger","Middenvelder","Aanvaller"];

/* Alles wat hierop rekent — positiePassendheid, plekLabels/plekCode/
   plekNaam, positieRang, veldStand en de hele familie eromheen
   (staatOpVeld, veldOpstelling, wisselOpties, opDeBankNu) — staat sinds
   P3 stap 3 in src/domein/statistieken.js. POSITIECODE_NAAR_ROL en
   ROL_VOLGORDE hierboven blijven hier omdat React-componenten verderop
   ze ook rechtstreeks gebruiken. */


/* wedstrijdDuur en duurTekst staan sinds P3 stap 3 in
   src/domein/statistieken.js. SPEELDUREN zelf stond hier ook nog, maar
   is bij P4 stap 8 (18 september 2026) verplaatst naar
   src/schermen/wedstrijden.jsx: zijn enige gebruiker is het
   wedstrijdformulier, dat daar sinds die stap ook staat. Ook
   wedstrijdTijdlijn (met ruilPaar), doelpuntenTelling, scoreVerschil,
   minutenPerPositie, meestGespeeldePositie, linieVanSpeler,
   sorteerOpLinie en vulFormatieAutomatisch staan sinds stap 3 in
   src/domein/statistieken.js. */

/* ── WEKEN ────────────────────────────────────────────────
   Nederland gebruikt ISO-weken: de week begint op maandag en
   week 1 is de week waarin de eerste donderdag van het jaar valt. */
function maandagVan(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var dag = x.getDay() || 7;                 // zondag telt als dag 7
  x.setDate(x.getDate() - dag + 1);
  return x;
}
function isoWeek(d) {
  var don = maandagVan(d);
  don.setDate(don.getDate() + 3);            // donderdag van die week
  var eersteDon = new Date(don.getFullYear(), 0, 4);
  eersteDon = maandagVan(eersteDon);
  eersteDon.setDate(eersteDon.getDate() + 3);
  return {
    nr: 1 + Math.round((don - eersteDon) / 604800000),
    jaar: don.getFullYear()
  };
}
function weekSleutel(d) {
  var w = isoWeek(d);
  return w.jaar + "-W" + String(w.nr).padStart(2, "0");
}
/* "18 – 24 augustus" of "29 sep – 5 okt" als de week over een maandgrens loopt */
function weekBereik(maandag) {
  var zondag = new Date(maandag);
  zondag.setDate(zondag.getDate() + 6);
  var mA = MAANDEN_VOL[maandag.getMonth()], mB = MAANDEN_VOL[zondag.getMonth()];
  var kort = function(m){ return m.slice(0,3); };
  if (mA === mB) return maandag.getDate() + " – " + zondag.getDate() + " " + mA;
  return maandag.getDate() + " " + kort(mA) + " – " + zondag.getDate() + " " + kort(mB);
}
/* Groepeert op week en houdt de volgorde aan die er al is */
function groepeerPerWeek(lijst) {
  var groepen = [], index = {};
  (lijst||[]).forEach(function(item){
    var d = parseerDatum(item.datum);
    var sleutel = d ? weekSleutel(d) : "zonder-datum";
    if (!index[sleutel]) {
      index[sleutel] = {
        sleutel: sleutel,
        maandag: d ? maandagVan(d) : null,
        week: d ? isoWeek(d) : null,
        items: []
      };
      groepen.push(index[sleutel]);
    }
    index[sleutel].items.push(item);
  });
  return groepen;
}


const FORMATIE_GROEPEN = [
  {label:"3 Verdedigers", namen:["3-1-4-2","3-3-4","3-4-1-2","3-4-2-1","3-4-3A","3-4-3B","3-5-2"]},
  {label:"4 Verdedigers", namen:["4-1-2-1-2A","4-1-2-1-2B","4-1-3-2","4-1-4-1","4-2-1-3","4-2-2-2","4-2-3-1A","4-2-3-1B","4-2-4","4-3-3A","4-3-3B","4-4-1-1","4-4-2A","4-4-2B","4-5-1A","4-5-1B"]},
  {label:"5 Verdedigers", namen:["5-2-1-2","5-2-3","5-3-2A","5-3-2B","5-4-1A","5-4-1B"]},
];

/* ═══════════════════════════════════════════════════════════
   DEELBERICHTEN — WhatsApp
   Alle emoji hieronder zitten in de Unicode-basis (BMP) of zijn
   standaard-emoji die WhatsApp op elk toestel kent. Geen vlaggen,
   geen huidskleur-modifiers, geen zeldzame combinaties: die geven
   op sommige telefoons en op de wa.me-voorbeeldpagina blokjes.
═══════════════════════════════════════════════════════════ */

const DAGEN_VOL = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
const MAANDEN_VOL = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

function datumLang(d) {
  if(!d) return "";
  var x = new Date(d);
  if(isNaN(x)) return String(d);
  return DAGEN_VOL[x.getDay()]+" "+x.getDate()+" "+MAANDEN_VOL[x.getMonth()];
}

/* "vandaag" / "morgen" / "over 5 dagen" — of leeg als het in het verleden ligt */
function dagenTot(d) {
  if(!d) return "";
  var doel = new Date(d); if(isNaN(doel)) return "";
  doel.setHours(0,0,0,0);
  var nu = new Date(); nu.setHours(0,0,0,0);
  var v = Math.round((doel-nu)/86400000);
  if(v<0) return "";
  if(v===0) return "vandaag";
  if(v===1) return "morgen";
  if(v===2) return "overmorgen";
  return "over "+v+" dagen";
}

/* Tijd verschuiven, bijv. "14:30" met -75 minuten -> "13:15" */
function tijdVerschoven(tijd, minuten) {
  if(!tijd || tijd.indexOf(":")<0) return "";
  var d = tijd.split(":");
  var tot = (Number(d[0])||0)*60 + (Number(d[1])||0) + minuten;
  while(tot<0) tot += 1440;
  tot = tot % 1440;
  return String(Math.floor(tot/60)).padStart(2,"0")+":"+String(tot%60).padStart(2,"0");
}

/* Bouwt een bericht uit regels. null en "" vallen weg, "" wordt een lege regel. */
function berichtUitRegels(regels) {
  return regels.filter(function(r){ return r!==null && r!==undefined; }).join("\n")
    .replace(/\n{3,}/g,"\n\n").trim();
}

const DEEL_STREEP = "━━━━━━━━━━━━━━";

/* Haalt alle emoji en opmaak eruit voor wie liever nuchter deelt */
function zonderEmoji(tekst) {
  return tekst
    .replace(/━+/g,"@@STREEP@@")
    .replace(/[←-⇿⌀-➿⬀-⯿️⃣]/g,"")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,"")
    .replace(/@@STREEP@@/g,"--------------")
    .split("\n").map(function(r){ return r.replace(/\s+$/,"").replace(/^\s+/,""); }).join("\n")
    .replace(/\n{3,}/g,"\n\n").trim();
}


function whatsappLink(tekst) {
  return "https://wa.me/?text=" + encodeURIComponent(tekst);
}

/* ═══════════════════════════════════════════════════════════
   DEELVENSTER — laat vooraf zien wat je verstuurt
═══════════════════════════════════════════════════════════ */

/* WhatsApp-opmaak (*vet*, _cursief_) omzetten naar echte opmaak in het voorbeeld */
function waOpmaak(tekst) {
  var stukken = [];
  var rest = tekst;
  var teller = 0;
  var patroon = /\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/;
  while(true) {
    var m = patroon.exec(rest);
    if(!m) { if(rest) stukken.push(rest); break; }
    if(m.index>0) stukken.push(rest.slice(0,m.index));
    teller++;
    if(m[1]) stukken.push(<strong key={"v"+teller}>{m[1]}</strong>);
    else if(m[2]) stukken.push(<em key={"c"+teller}>{m[2]}</em>);
    else stukken.push(<s key={"d"+teller}>{m[3]}</s>);
    rest = rest.slice(m.index+m[0].length);
  }
  return stukken;
}


/* ═══════════════════════════════════════════════════════════
   BOETEPOT
   Puur administratie: bijhouden wie wat verschuldigd is en wat
   er betaald is. Er gaat hier geen geld doorheen.

   Het grootste deel vult zichzelf, want de aanleiding staat al
   in de app: te laat komen, niet afmelden, een gele of rode
   kaart. Dat scheelt overtypen én het blijft kloppen als je
   later een presentie corrigeert.

   Bedragen worden in hele centen gerekend. Met kommagetallen
   krijg je 0,1 + 0,2 = 0,30000000000000004 en dan klopt een
   pot van dertig boetes op den duur niet meer.
═══════════════════════════════════════════════════════════ */
const BOETES_KEY      = "fch_boetes_v1";        /* losse, handmatige boetes */
const BETALINGEN_KEY  = "fch_betalingen_v1";
const laadBoetes     = () => laadJson(BOETES_KEY);
const laadBetalingen = () => laadJson(BETALINGEN_KEY);

/* ══ EEN NIEUW SEIZOEN BEGINNEN ══════════════════════════════
   Wat gaat er mee en wat niet?

   Mee gaat wat je zelf hebt opgebouwd en wat niets met de uitslagen te
   maken heeft: je selectie, je tenues, je formaties, je afspraken. Dat
   opnieuw invoeren zou een avond kosten en niets opleveren.

   Niet mee gaat alles wat gespeeld is. Wedstrijden, trainingen,
   aanwezigheid, doelpunten, kaarten, boetes, de stand. Dat is de
   geschiedenis van vorig seizoen, en die hoort daar te blijven staan.
   Ze verdwijnen niet — ze staan onder het oude seizoen, waar je ze kunt
   blijven bekijken. Ze tellen alleen niet meer mee.

   Let op wat hier níét gebeurt: er wordt niets weggegooid en niets
   verplaatst. Er wordt alleen gekopieerd naar een plek die nog leeg
   was. Gaat er iets mis, dan staat vorig seizoen nog precies zoals het
   stond, want daar is niet aan geraakt.
   ══════════════════════════════════════════════════════════ */
const SEIZOEN_MEE = [
  {id:"spelers",  label:"Spelers en staf",
   uitleg:"Je hele selectie, met rugnummers, foto’s en beoordelingen.",
   sleutels:function(){ return [SPELERS_KEY]; }},
  {id:"instellingen", label:"Teaminstellingen",
   uitleg:"Teamnaam, thuislocatie en speelduur.",
   sleutels:function(){ return [TEAMINST_KEY]; }},
  {id:"tenue",    label:"Tenues",
   uitleg:"Het tenue dat je hebt ontworpen.",
   sleutels:function(){ return [TENUE_KEY]; }},
  {id:"tactiek",  label:"Formaties en tactieken",
   uitleg:"Je opstellingen en tactische plannen.",
   sleutels:function(){ return [FORMATIES_KEY, TACTIEKEN_KEY]; }},
  {id:"afspraken", label:"Teamtaken en boetetarieven",
   uitleg:"De rijschema’s en het boetereglement — niet de openstaande boetes.",
   sleutels:function(){ return [TAKEN_KEY, BOETETARIEF_KEY]; }}
];

/* Een nieuw seizoen beginnen. Geeft terug wat er is gekopieerd, of null
   als het seizoen al bestaat — dan is er niets te beginnen. */
function startSeizoen(nieuw, mee, team) {
  var t = team || teamId();
  if (!t || !nieuw) return null;
  var van = seizoenNu(t);
  if (nieuw === van) return null;
  var voor = "tt_" + t + "__";
  var gekopieerd = [];
  (mee || []).forEach(function (id) {
    var onderdeel = SEIZOEN_MEE.filter(function (m) { return m.id === id; })[0];
    if (!onderdeel) return;
    onderdeel.sleutels().forEach(function (s) {
      try {
        var waarde = localStorage.getItem(voor + van + "::" + s);
        if (waarde === null) return;
        localStorage.setItem(voor + nieuw + "::" + s, waarde);
        gekopieerd.push(s);
      } catch(e) {}
    });
  });
  /* Het seizoen moet bestaan, ook als je niets meeneemt. Zonder één
     sleutel zou het nergens uit af te leiden zijn en morgen weer weg. */
  try {
    var instSleutel = voor + nieuw + "::" + TEAMINST_KEY;
    var bestaand = {};
    try { bestaand = JSON.parse(localStorage.getItem(instSleutel) || "{}") || {}; } catch(e) {}
    bestaand.seizoen = seizoenLabel(nieuw);
    localStorage.setItem(instSleutel, JSON.stringify(bestaand));
  } catch(e) {}
  kiesSeizoen(nieuw, t);
  herlaadInstellingen();
  if (typeof syncStraks === "function") syncStraks(0);
  return {seizoen: nieuw, gekopieerd: gekopieerd};
}

/* Welk seizoen je bekijkt. Vroeger een tekstveld in de instellingen dat
   je zelf moest bijhouden; nu de laag waar je gegevens werkelijk onder
   staan. Er kan dus niet langer "2025/2026" in het vak staan terwijl je
   naar de wedstrijden van dit jaar kijkt. */
function huidigSeizoen() { return seizoenLabel(seizoenNu()) || "dit seizoen"; }

const LEEG_SPELER = { id:null,naam:"",rugnummer:"",positie:"",geboortedatum:"",positie2:"",favorietBeen:"",skills:{},sterren:{},rapporten:[],adres:"",land:"Nederland",telefoon:"",email:"",foto:null, beschikbaar:"fit", beschikbaarNotitie:"", vaardigheden:{}, stats:{doelpunten:0,assists:0,geelKaarten:0,roodKaarten:0,speelMinuten:0,wedstrijden:0} };


/* Gastspelers (maakGast, gastenVan, spelersMetGasten, gastInGebruik)
   staan sinds P3 stap 2 in src/domein/wedstrijden.js. LEEG_SPELER
   hierboven blijft in dit bestand omdat het spelersformulier hem ook
   gebruikt. De hele SPELERSKAART-rekenlaag die hierna kwam (KAART_WEGING,
   KAART_SOORTEN, kaartSoort, kaartWaarden, kaartHandmatig,
   kaartEigenCijfer, kaartCijfer, kaartPositie, kaartCompleet) staat
   sinds P3 stap 3 in src/domein/statistieken.js. */


/* ═══════════════════════════════════════════════════════════
   VERJAARDAGEN
   Uit de geboortedatum van de spelers, dus je hoeft ze niet zelf
   in te voeren. Ze verschijnen elk jaar opnieuw.
═══════════════════════════════════════════════════════════ */
function verjaardagenIn(spelers, jaar) {
  return (spelers||[]).map(function(s){
    var d = parseerDatum(s.geboortedatum);
    if (!d) return null;
    function tw(n){ return (n<10?"0":"")+n; }
    var datum = jaar + "-" + tw(d.getMonth()+1) + "-" + tw(d.getDate());
    return {
      id: "vj-" + s.id + "-" + jaar,
      spelerId: s.id,
      naam: s.naam,
      datum: datum,
      wordt: jaar - d.getFullYear(),
      titel: s.naam + " wordt " + (jaar - d.getFullYear())
    };
  }).filter(Boolean).sort(function(a,b){ return a.datum.localeCompare(b.datum); });
}
/* Wie is er jarig op deze dag? */
function verjaardagenOp(spelers, datum) {
  var d = parseerDatum(datum);
  if (!d) return [];
  return verjaardagenIn(spelers, d.getFullYear()).filter(function(v){ return v.datum===datum; });
}
/* De eerstvolgende verjaardagen vanaf vandaag, over de jaargrens heen */
function komendeVerjaardagen(spelers, vanaf, aantal) {
  var start = parseerDatum(vanaf) || new Date();
  var lijst = verjaardagenIn(spelers, start.getFullYear())
    .concat(verjaardagenIn(spelers, start.getFullYear()+1));
  var vandaagStr = vanaf || "";
  return lijst.filter(function(v){ return v.datum >= vandaagStr; }).slice(0, aantal || 5);
}


/* StatInvoer, SpelerFormulier, RapportTab, SpelerProfiel, DoelFormulier,
   ReviewFormulier, OntwikkelingTab, SpelersLijst, AfwezigheidFormulier,
   BlessuresTab, BoetepotTab, EigenBoeteToevoegen, BoeteFormulier,
   SelectiePagina en Dashboard stonden hier. Sinds P4 stap 5 (17
   september 2026) staan ze in src/schermen/spelers.jsx — zie
   docs/p4-stappenplan.md §1 stap 5. renderPagina() hieronder roept
   Dashboard en SelectiePagina nog steeds aan; dat werkt via gedeelde
   scope (hoisting), precies zoals bij de andere schermmodules. */


/* SpelerStatusRaster en OPGAVE_KEUZES stonden hier, maar horen bij
   trainingen/agenda. Sinds P4 stap 4 (17 september 2026) staan ze in
   src/schermen/trainingen.jsx. WedstrijdDetail riep SpelerStatusRaster
   vanuit hier nog aan tot P4 stap 8 (18 september 2026); WedstrijdDetail
   staat sinds die stap zelf in src/schermen/wedstrijden.jsx en roept
   SpelerStatusRaster nog steeds aan, gewoon via gedeelde scope/hoisting
   — zie docs/p4-stappenplan.md §1 stap 4 en stap 8. */

/* AANWEZIG_KEUZES, aanwezigInfo, teltAlsAanwezig, opkomstVan,
   AFWEZIGHEID_SOORTEN, LEEG_AFWEZIGHEID, afwezigheidSoort,
   afwezigheidTeltMee, inAfwezigheid, afwezigheidOp, afwezigheidFase,
   afwezigheidDagen, afwezigheidResterend en afwezigheidPeriodeTekst
   staan sinds stap 4 (17 september 2026) in src/domein/opkomst.js.
   vandaagISO stond hier ook nog, met als reden "gebruikt buiten dat
   domein, in agenda en verjaardagen" — bij narekenen voor P4 stap 8 (18
   september 2026) bleek geen van beide daadwerkelijk vandaagISO aan te
   roepen (agenda en verjaardagen-functies staan trouwens zelf nog wel
   hier in app.jsx, gedeeld tussen trainingen.jsx en spelers.jsx). Zijn
   echte gebruikers zijn spelers.jsx (AfwezigheidFormulier,
   ReviewFormulier e.a.) en dit domeinbestand. Hij staat sinds stap 8 in
   src/schermen/spelers.jsx; opkomst.js roept hem gewoon aan over de
   bestandsgrens heen, zoals hierboven. */


/* ═══════════════════════════════════════════════════════════
   STATISTIEKEN MODULE — hoort bij LiveAnalyse in src/schermen/statistieken.jsx,
   staat hier met opzet toch in app.jsx
   ─────────────────────────────────────────────────────────
   Bij P4 stap 8 (18 september 2026) is dit blok eerst wél naar
   statistieken.jsx verplaatst, als onderdeel van het inlopen van een
   achterstand uit P3 stap 3. Dat bleek de app te breken: ACTIE_CATEGORIEEN
   is een top-level const die inst().clubNaam meteen bij het laden van het
   script opvraagt (de gele/rode-kaart-labels, "Geel "+teamKort(...)) — niet
   pas bij een render, zoals de rest van de app. inst() geeft pas een
   bruikbaar antwoord zodra _instellingen (regel ~556 hierboven) is gezet,
   en die regel zit in dít bestand — dat als LAATSTE wordt geplakt, ná alle
   schermmodules (zie SCHERM_VOLGORDE in tools/bouw.js). Stond dit blok in
   statistieken.jsx, dan probeerde het inst() te lezen vóórdat app.jsx ooit
   heeft gedraaid: "Cannot read properties of undefined (reading
   'clubNaam')", de app kwam niet eens tot een eerste scherm.
   Dit is precies de uitzondering die het P4-stappenplan zelf al noemde:
   const-declaraties hoisten niet zoals function-declaraties. Terugverplaatst
   naar hier, ná de _instellingen-initialisatie — blijft daarmee net als vóór
   P4 een documentbekende achterstand van P3 stap 3, niet iets om nu verder
   op te lossen. */
const ACTIE_CATEGORIEEN = [
  {id:"aanval", label:"Aanval", kleur:"#28a745", acties:[
    {type:"goal",        icoon:"fa-solid fa-futbol", label:"Doelpunt",      team:"fch"},
    {type:"schot-doel",  icoon:"fa-solid fa-crosshairs", label:"Schot op doel", team:"fch"},
    {type:"schot-naast", icoon:"fa-solid fa-arrow-trend-up", label:"Schot naast",   team:"fch"},
    {type:"assist",      icoon:"fa-solid fa-circle-plus", label:"Assist",        team:"fch"},
    {type:"corner-fch",  icoon:"fa-solid fa-flag", label:"Corner",        team:"fch"},
    {type:"vrije-trap",  icoon:"fa-solid fa-circle-dot", label:"Vrije trap",    team:"fch"},
    {type:"straf-fch",   icoon:"fa-solid fa-bolt", label:"Strafschop",    team:"fch"},
    {type:"kans-gemist", icoon:"fa-solid fa-circle-xmark", label:"Kans gemist",   team:"fch"},
  ]},
  {id:"verdediging", label:"Verdediging", kleur:"#17a2b8", acties:[
    {type:"redding",     icoon:"fa-solid fa-hands", label:"Redding",       team:"fch"},
    {type:"tackle",      icoon:"fa-solid fa-shield", label:"Tackle",        team:"fch"},
    {type:"interceptie", icoon:"fa-solid fa-ban", label:"Interceptie",   team:"fch"},
    {type:"balverov",    icoon:"fa-solid fa-arrow-up", label:"Balverovering", team:"fch"},
    {type:"kopbal",      icoon:"fa-solid fa-chevron-up", label:"Kopbal gew.",   team:"fch"},
    {type:"fout",        icoon:"fa-solid fa-hand", label:"Fout gemaakt",  team:"fch"},
  ]},
  {id:"tegenpartij", label:"Tegenstander", kleur:"#dc3545", acties:[
    {type:"goal-teg",        icoon:"fa-solid fa-futbol", label:"Tegengoal",     team:"teg"},
    {type:"schot-doel-teg",  icoon:"fa-solid fa-crosshairs", label:"Schot op doel", team:"teg"},
    {type:"schot-naast-teg", icoon:"fa-solid fa-arrow-trend-up", label:"Schot naast",   team:"teg"},
    {type:"corner-teg",      icoon:"fa-solid fa-flag", label:"Corner teg.",   team:"teg"},
    {type:"vrije-trap-teg",  icoon:"fa-solid fa-circle-dot", label:"Vrije trap",    team:"teg"},
    {type:"straf-teg",       icoon:"fa-solid fa-bolt", label:"Strafschop",    team:"teg"},
  ]},
  {id:"discipline", label:"Discipline", kleur:"#856404", acties:[
    {type:"geel",     icoon:"fa-solid fa-square", kleur:"#ffc107", label:"Geel " + teamKort(inst().clubNaam),  team:"fch"},
    {type:"rood",     icoon:"fa-solid fa-square", kleur:"#dc3545", label:"Rood " + teamKort(inst().clubNaam),  team:"fch"},
    {type:"geel-teg", icoon:"fa-solid fa-square", kleur:"#ffc107", label:"Geel Teg.", team:"teg"},
    {type:"rood-teg", icoon:"fa-solid fa-square", kleur:"#dc3545", label:"Rood Teg.", team:"teg"},
    {type:"wissel",   icoon:"fa-solid fa-arrows-rotate", label:"Wissel",    team:"fch"},
    {type:"blessure", icoon:"fa-solid fa-kit-medical", label:"Blessure",  team:"fch"},
    {type:"rust",     icoon:"fa-solid fa-pause", label:"Rust",      team:"fch"},
  ]},
];

const ALLE_ACTIES = ACTIE_CATEGORIEEN.reduce(function(arr,cat){
  return arr.concat(cat.acties.map(function(a){return Object.assign({},a,{catKleur:cat.kleur});}));
},[]);

function getActieInfo(type) {
  return ALLE_ACTIES.find(function(a){return a.type===type;}) || {icoon:"fa-solid fa-clipboard",label:type,catKleur:"#999",team:"fch"};
}

const VELD_ZONES = [
  {id:"aan-l",label:"Links",  sub:"Aanvallend",  bg:"#27ae60",tc:"white"},
  {id:"aan-m",label:"Midden", sub:"Aanvallend",  bg:"#2ecc71",tc:"white"},
  {id:"aan-r",label:"Rechts", sub:"Aanvallend",  bg:"#27ae60",tc:"white"},
  {id:"mid-l",label:"Links",  sub:"Middenveld",  bg:"#1a8f40",tc:"white"},
  {id:"mid-m",label:"Midden", sub:"Middenveld",  bg:"#1fac4e",tc:"white"},
  {id:"mid-r",label:"Rechts", sub:"Middenveld",  bg:"#1a8f40",tc:"white"},
  {id:"afw-l",label:"Links",  sub:"Verdedigend", bg:"#145a32",tc:"rgba(255,255,255,.85)"},
  {id:"afw-m",label:"Midden", sub:"Verdedigend", bg:"#17703e",tc:"rgba(255,255,255,.85)"},
  {id:"afw-r",label:"Rechts", sub:"Verdedigend", bg:"#145a32",tc:"rgba(255,255,255,.85)"},
];

/* ═══════════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════════ */
/* Onderbalk op de telefoon: vijf knoppen, meer past er niet */
const navItems = [
  {id:"dashboard",    tekstSleutel:"nav.kort.dashboard",    icoon:"fa-solid fa-house"},
  {id:"wedstrijden",  tekstSleutel:"nav.kort.wedstrijden",  icoon:"fa-solid fa-futbol"},
  {id:"selectie",     tekstSleutel:"nav.kort.selectie",     icoon:"fa-solid fa-users"},
  {id:"trainingen",   tekstSleutel:"nav.kort.trainingen",   icoon:"fa-solid fa-person-running"},
  {id:"statistieken", tekstSleutel:"nav.kort.statistieken", icoon:"fa-solid fa-chart-bar"}
];

/* Zijmenu op tablet en laptop: daar is ruimte voor alles */
const zijGroepen = [
  {kop:null, items:[
    {id:"dashboard",    tekstSleutel:"nav.dashboard",    icoon:"fa-solid fa-house"},
    {id:"wedstrijden",  tekstSleutel:"nav.wedstrijden",  icoon:"fa-solid fa-futbol"},
    {id:"trainingen",   tekstSleutel:"nav.trainingen",   icoon:"fa-solid fa-person-running"},
    {id:"selectie",     tekstSleutel:"nav.selectie",     icoon:"fa-solid fa-users"},
    {id:"agenda",       tekstSleutel:"nav.agenda",       icoon:"fa-solid fa-calendar-days"}
  ]},
  {kopTekstSleutel:"nav.groep.analyse", items:[
    {id:"statistieken", tekstSleutel:"nav.statistieken", icoon:"fa-solid fa-chart-bar"},
    {id:"live",         tekstSleutel:"nav.live",         icoon:"fa-solid fa-stopwatch"}
  ]},
  {kopTekstSleutel:"nav.groep.extra", items:[
    {id:"clubhuis",     tekstSleutel:"nav.clubhuis",     icoon:"fa-solid fa-map"}
  ]}
];

function App() {
  const [pagina,setPagina]=useState("dashboard");
  const [instellingenOpen,setInstellingenOpen]=useState(false);
  const [teamsOpen,setTeamsOpen]=useState(false);
  /* Waar je bent in de aanloop. "bezig" betekent: we vragen het even
     na bij de server. De volgorde is dwingend — zonder account geen
     vereniging, zonder vereniging geen team. */
  const [poort, setPoort] = useState("bezig");
  const [poortStand, setPoortStand] = useState(0);
  const sessie = gebruikSessie();
  /* Wisselen van team betekent dat elk scherm zijn gegevens moet
     loslaten. In plaats van vijftig schermen daarover in te lichten,
     telt dit getal op en bouwt React de hele boom opnieuw op. Alle
     schermen halen hun gegevens dan gewoon opnieuw op, precies zoals
     bij het opstarten. */
  const [teamStand,setTeamStand]=useState(0);
  /* Welk pakket goud omrand in de prijskaart staat. null betekent
     dicht. Deze staat hoort hier en niet in Instellingen, want een
     slotje kan overal in de app zitten en moet de prijskaart kunnen
     openen zonder eerst een instellingenscherm te passeren. */
  const [slotPakket,setSlotPakket]=useState(null);
  const i = gebruikInstellingen();

  /* De taal van de pagina meegeven aan de browser: dat bepaalt hoe
     hij afbreekt en hoe een voorleeshulp de tekst uitspreekt. */
  useEffect(function(){
    try { document.documentElement.setAttribute("lang", taalNu()); } catch(e) {}
  }, [i.taal]);

  /* Een kopie van "pagina" buiten React bijhouden, voor de twee
     foutopvangplekken die geen React-state kunnen lezen: de
     unhandledrejection-listener en FoutOpvang (de ErrorBoundary)
     staan allebei buiten deze component en worden pas ná een fout
     geraadpleegd — dan is een module-brede variabele de eenvoudigste
     weg, in plaats van "pagina" ergens via een prop of een eigen
     luisteraarlijst naar buiten te reiken zoals _sessieLuisteraars
     dat voor de sessie doet. */
  useEffect(function(){ _huidigeSchermVoorFoutmelding = pagina; }, [pagina]);

  useEffect(function(){
    pasThemaToe(i.thema);
    if (i.thema!=="systeem" || !window.matchMedia) return;
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    function volg(){ pasThemaToe("systeem"); }
    if (mq.addEventListener) mq.addEventListener("change", volg);
    else if (mq.addListener) mq.addListener(volg);
    return function(){
      if (mq.removeEventListener) mq.removeEventListener("change", volg);
      else if (mq.removeListener) mq.removeListener(volg);
    };
  },[i.thema, i.accent]);

  /* Het slotje mag overal in de app zitten — in een tegel op het
     dashboard, op een tabblad drie schermen diep. Het zou onzinnig
     zijn om daarvoor een prop door twintig componenten te reiken, dus
     zet App hier zijn eigen opener neer, precies zoals de toasts hun
     luisteraar aanmelden. */
  useEffect(function(){
    _pakkettenOpener = function(id){ setSlotPakket(id || "-"); };
    return function(){ _pakkettenOpener = null; };
  }, []);

  /* De enige plek in de app die "nee" zegt tegen een scherm. Elke
     knop die van pagina wisselt loopt hierlangs, zodat er nergens een
     tweede plek is die het antwoord anders kan geven dan magPagina.

     Een geweigerde tik navigeert niet en opent niets: er komt alleen
     een melding die vanzelf weer verdwijnt. Iemand die er tijdens de
     wedstrijd per ongeluk op tikt is er dus zonder één vervolgtik
     weer vanaf. */
  function gaNaar(p) {
    if (!magPagina(p)) { slotMelding(PAGINA_MODULE[p]); return; }
    setPagina(p);
  }

  /* Ook als alle knoppen kloppen kun je hier staan: je pakket
     verandert terwijl je op een betaald scherm bent, of je komt
     ergens binnen langs een weg die we vandaag nog niet kennen. Dan
     hoort er geen leeg of half scherm te verschijnen, maar hetzelfde
     rustige antwoord als bij een knop — en het dashboard eronder.

     Het pakket staat er met opzet bij als aanleiding en niet alleen
     de pagina: syncPakket() haalt elke dertig seconden op wat de
     server zegt, dus een club die terugvalt naar Free kan dat
     meemaken terwijl er iemand op Statistieken staat. Zonder deze
     aanleiding zou dat scherm leeg blijven tot de eerstvolgende
     paginawissel, en een leeg scherm zonder uitleg is precies wat
     hier niet mag gebeuren. */
  const pakketId = pakketNu().id;
  useEffect(function(){
    if (magPagina(pagina)) return;
    slotMelding(PAGINA_MODULE[pagina]);
    setPagina("dashboard");
  }, [pagina, pakketId]);

  function renderPagina() {
    /* De router houdt zich aan dezelfde regel als de knoppen. Het
       terugsturen doet de useEffect hierboven; hier wordt alleen
       voorkomen dat een geweigerd scherm ook maar één tel in beeld
       komt. */
    if (!magPagina(pagina)) return null;
    switch(pagina) {
      case "dashboard":    return <Dashboard navigeer={gaNaar} />;
      case "selectie":     return <SelectiePagina />;
      case "wedstrijden":  return <WedstrijdenModule />;
      case "trainingen":   return <TrainingenModule />;
      case "agenda":       return <AgendaModule navigeer={gaNaar} />;
      case "statistieken": return <StatistiekenModule />;
      case "live":         return <StatistiekenModule defaultTab="live" />;
      case "clubhuis":     return <ClubhuisModule />;
      default: return null;
    }
  }
  /* De poort. Dit bepaalt wat je te zien krijgt, en het draait
     opnieuw zodra je in- of uitlogt. Werkt de app al (club én team
     bekend), dan gaan we er meteen doorheen en synchroniseren we op de
     achtergrond — anders sta je te wachten op een server terwijl je
     langs de lijn staat. */
  useEffect(function () {
    if (!serverAan()) { setPoort("server"); return; }
    if (!ingelogd()) { setPoort("aanmelden"); return; }
    if (clubIdNu() && teams().length) {
      setPoort("app");
      synchroniseer().then(function () { setTeamStand(function(n){ return n+1; }); });
      return;
    }
    setPoort("bezig");
    synchroniseer().then(function () {
      if (!clubIdNu()) { setPoort("club"); return; }
      setPoort(teams().length ? "app" : "team");
    });
  }, [sessie, poortStand]);

  /* Het uitwisselen op gang brengen en aan de praat houden. Eén keer,
     bij het opstarten: vanaf dat moment gaat het vanzelf. */
  useEffect(function () {
    syncLuisterMee();
    syncStraks(2500);
  }, []);

  function poortVerder() { setPoortStand(function (n) { return n + 1; }); }

  if (poort === "bezig") return (
    <div className="onboard"><div className="onboard-kaart onboard-wacht">
      <i className="fa-solid fa-circle-notch fa-spin"/>
      <p>Even je gegevens ophalen…</p>
    </div></div>
  );
  if (poort === "server")    return <ServerScherm opKlaar={poortVerder} />;
  if (poort === "aanmelden") return <AanmeldScherm opKlaar={poortVerder} />;
  if (poort === "club")      return <ClubScherm opKlaar={poortVerder} />;
  if (poort === "team")      return <TeamScherm opKlaar={poortVerder} eerste={true} />;

  return (
    <div className="app-schil">
      <aside className="zijbalk">
        {/* Ook hier van team wisselen. De kopbalk met dezelfde knop is
            op een breed scherm verborgen, en dan was er geen enkele
            manier om bij je andere teams te komen. */}
        <button className="zijbalk-merk zijbalk-team"
          onClick={function(){ setTeamsOpen(true); }}
          title="Van team wisselen">
          <Logo />
          <div className="header-tekst">
            <h1>{i.clubNaam||APP_NAAM}</h1>
            <div className="header-subtitel">
              {i.teamNaam || t("app.slogan")}
              <i className="fa-solid fa-chevron-down header-pijl"/>
            </div>
          </div>
        </button>
        <nav className="zijbalk-nav">
          {zijGroepen.map(function(groep,gi){
            return (
              <React.Fragment key={"g"+gi}>
                {groep.kopTekstSleutel && <div className="zijbalk-kop">{t(groep.kopTekstSleutel)}</div>}
                {groep.items.map(function(item){
                  /* Hier wordt het gevraagd, niet in zijGroepen zelf:
                     die lijst is een lijst en hoort niet te weten wat
                     iemand betaalt. Bovendien verandert het antwoord
                     zodra het pakket verandert, en dan moet het menu
                     mee — een lijst die één keer is samengesteld doet
                     dat niet. */
                  const open = magPagina(item.id);
                  return (
                    <button key={item.id}
                      className={"zij-item"+(pagina===item.id?" actief":"")}
                      aria-current={pagina===item.id?"page":undefined}
                      aria-label={open?undefined:slotLabel(t(item.tekstSleutel), PAGINA_MODULE[item.id])}
                      onClick={function(){ gaNaar(item.id); }}>
                      <span className="zij-icoon"><i className={item.icoon}/></span>
                      <span>{t(item.tekstSleutel)}</span>
                      {!open && <SlotJe />}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </nav>
        <div className="zijbalk-voet">
          <SyncLampje opKlik={function(){ setInstellingenOpen(true); }} />
          <button className="zij-item" onClick={function(){setInstellingenOpen(true);}}>
            <span className="zij-icoon"><i className="fa-solid fa-gear"/></span>
            <span>{t("nav.instellingen")}</span>
          </button>
          <div className="zij-ontwerp">
            <span className="zij-ontwerp-studio">{ONTWERPER.studio}</span>
            <span className="zij-ontwerp-naam">{ONTWERPER.naam}</span>
          </div>
        </div>
      </aside>

      <header className="header">
        <button className="header-logo header-team" onClick={function(){ setTeamsOpen(true); }}
          title="Van team wisselen">
          <Logo />
          <div className="header-tekst">
            <h1>{i.clubNaam||APP_NAAM}</h1>
            <div className="header-subtitel">
              {i.teamNaam ? i.teamNaam+" \u00b7 "+APP_NAAM : t("app.slogan")}
              <i className="fa-solid fa-chevron-down header-pijl"/>
            </div>
          </div>
        </button>
        <button aria-label="Instellingen"
          style={{fontSize:20,cursor:"pointer",background:"none",border:"none",color:"inherit",padding:"6px 4px"}}
          onClick={function(){setInstellingenOpen(true);}}>
          <i className="fa-solid fa-gear"/>
        </button>
      </header>
      <main key={pagina+"|"+teamStand} className="inhoud">
        <NieuwsBalk opVerversen={function(){ setTeamStand(function(n){ return n+1; }); }} />
        {renderPagina()}
      </main>
      {teamsOpen && <TeamSheet onSluiten={function(){setTeamsOpen(false);}}
        onGewisseld={function(){ setTeamStand(function(n){ return n+1; }); }} />}
      {instellingenOpen && <InstellingenSheet onSluiten={function(){setInstellingenOpen(false);}}
        onTeams={function(){ setInstellingenOpen(false); setTeamsOpen(true); }}
        onGewisseld={function(){ setTeamStand(function(n){ return n+1; }); }} />}
      {/* De prijskaart vanuit een slotje. Hij gaat nooit vanzelf open:
          alleen als iemand in de melding op "Bekijk pakketten" tikt.
          Het pakket dat het antwoord geeft staat goud omrand. */}
      {slotPakket && <PakkettenSheet nadruk={slotPakket}
        onSluiten={function(){ setSlotPakket(null); }} />}
      <ToastHouder />
      <nav className="bottom-nav">
        {navItems.map(item=>{
          /* Zelfde vraag als in het zijmenu, op de plek waar getekend
             wordt. De vijf knoppen blijven staan waar ze staan: een
             balk die van vorm verandert zodra je up- of downgradet
             haalt de plek waar je duim op vertrouwt onder je vandaan. */
          const open = magPagina(item.id);
          return (
          <button key={item.id} className={`nav-item ${pagina===item.id?"actief":""}`}
            aria-label={open?undefined:slotLabel(t(item.tekstSleutel), PAGINA_MODULE[item.id])}
            onClick={()=>gaNaar(item.id)}>
            <div className="nav-pip"/>
            <span className="nav-icon"><i className={item.icoon}/>{!open && <SlotJe badge />}</span>
            <span>{t(item.tekstSleutel)}</span>
          </button>
          );
        })}
      </nav>
    </div>
  );
}

/* Buiten App() bijgehouden, want zowel de unhandledrejection-listener
   hieronder als FoutOpvang worden pas aangeroepen op het moment dat er
   toevallig een fout optreedt — lang ná de render waarin App() deze
   waarde voor het laatst zette (zie de useEffect op "pagina" hierboven).
   "onbekend" tot de eerste keer dat die effect draait. */
var _huidigeSchermVoorFoutmelding = "onbekend";

/* Een onafgehandelde promise-afwijzing (bijvoorbeeld een vergeten
   .catch() op een serveraanroep) verschijnt normaal alleen als rode
   ruis in de devtools-console — de gebruiker ziet niets, maar de fout
   is wél echt. In tegenstelling tot de foutopvang in src/index.html
   (die stopt zodra #root een kind heeft) moet dit ALTIJD actief zijn,
   dus dit staat los van App en wordt precies één keer aangemeld, bij
   het laden van dit bestand. */
window.addEventListener("unhandledrejection", function (e) {
  try {
    var reden = e && e.reason;
    var bericht = (reden && reden.message) ? reden.message : String(reden);
    var stack = (reden && reden.stack) ? String(reden.stack) : undefined;
    stuurFoutmelding({
      bericht: bericht,
      stack: stack,
      scherm: _huidigeSchermVoorFoutmelding,
      fouttype: "onafgehandelde-promise"
    });
  } catch (fout) { /* een foutmelding mag nooit zelf een nieuwe fout geven */ }
});

/* React staat een ErrorBoundary niet toe als function-component: alleen
   een class-component kent de twee levenscyclusmethoden hieronder
   (getDerivedStateFromError/componentDidCatch), en hooks (useState,
   useEffect) bestaan niet voor classes. Dit is daarom de enige plek in
   de hele app waar een class in plaats van een function nodig is — geen
   ouderwetse gewoonte die is blijven hangen, maar een eis van React
   zelf: er is geen hooks-equivalent voor "vang een renderfout in mijn
   kinderen op". */
class FoutOpvang extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fout: null };
  }
  static getDerivedStateFromError(fout) {
    return { fout: fout };
  }
  componentDidCatch(fout, info) {
    try {
      stuurFoutmelding({
        bericht: (fout && fout.message) || String(fout),
        stack: (fout && fout.stack) ? String(fout.stack) : undefined,
        scherm: _huidigeSchermVoorFoutmelding,
        fouttype: "render-fout"
      });
    } catch (foutBijMelden) { /* nooit een tweede fout bovenop de eerste */ }
  }
  render() {
    if (!this.state.fout) return this.props.children;
    /* Zelfde toon en stijl als de foutmelding in src/index.html: rustig,
       kort, en met precies één vervolgstap — hier kán die vervolgstap
       ook echt iets doen (een herlaad), in tegenstelling tot een
       kapotte build waar niets aan te doen valt tot de volgende uitrol. */
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,
        fontFamily:"'Helvetica Neue',Arial,sans-serif",background:"#f6f7f9",color:"#191e26"}}>
        <div style={{maxWidth:460,textAlign:"center"}}>
          <div style={{fontSize:34,marginBottom:10}}>⚠️</div>
          <div style={{fontSize:17,fontWeight:800}}>Er ging iets mis</div>
          <div style={{fontSize:13,color:"#6c757d",marginTop:8,lineHeight:1.6}}>
            Probeer de pagina opnieuw te laden. Blijft dit gebeuren, geef dan door wat je deed
            toen het misging.
          </div>
          <button onClick={function(){ window.location.reload(); }}
            style={{marginTop:16,padding:"10px 20px",borderRadius:10,border:"none",
              background:"#191e26",color:"#fff",fontWeight:700,cursor:"pointer"}}>
            Probeer opnieuw
          </button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(<FoutOpvang><App /></FoutOpvang>);
