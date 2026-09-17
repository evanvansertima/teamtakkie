/* ══════════════════════════════════════════════════════════════
   DOMEIN: statistieken
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P3,
   stap 3 van docs/professionaliseringsplan.md). Geen import/export:
   tools/bouw.js plakt dit bestand vóór src/app.jsx aan elkaar (ná
   src/domein/wedstrijden.js, zie DOMEIN_VOLGORDE in tools/bouw.js),
   dus alles hieronder is nog altijd gewoon top-level function/const
   in dezelfde scope als src/app.jsx. Er verandert dus functioneel
   niets — dit is een verhuizing, geen herschrijving.

   Rekenwerk rond de speler en zijn statistieken: de FC-stijl skills en
   het eindcijfer, de rapporten, wedstrijddeelname en cijfers, de
   automatische inzichten, ontwikkeldoelen en reviews, de opstelling en
   speelminuten, de competitiestand, man of the match, de
   spelerstatistieken zelf, de spelerskaart, en alles rond posities,
   linies, het veld en de formatie. Geen opslag, geen DOM — alleen
   berekeningen op de gegevens die de aanroeper meegeeft.

   Zoals bij src/domein/wedstrijden.js staan de functies hier gegroepeerd
   in de volgorde waarin ze in app.jsx stonden — dat is toevallig, niet
   noodzakelijk: de volgorde van los-van-elkaar-staande function/const-
   declaraties doet er in JavaScript niet toe.

   Dit bestand gebruikt een aantal dingen die in src/app.jsx blijven
   staan omdat ze breder gebruikt worden dan alleen hier — bijvoorbeeld
   in JSX-componenten die pas ná dit bestand geparst worden:
     - FC_STERREN, ovrKleur (de skills-editor en de spelerskaart)
     - RAPPORT_SOORTEN (het rapportenscherm)
     - BESCHIKBAARHEID, OPGAVE_OPTIES, TEGEN_TENUE, LEEG_SPELER,
       LEEG_WEDSTRIJD (spelersformulier, wedstrijdformulier — al vóór
       stap 3 in app.jsx gebleven)
     - POSITIECODE_NAAR_ROL, ROL_VOLGORDE (opstellingsveld, rollenscherm)
     - SPEELDUREN (het wedstrijdformulier)
     - FORMATIES_DATA, FORMATIE_GROEPEN, FORMATIES_KEY, TACTIEKEN_KEY
       (opstellingsveld, tactiekbord — dit blijft ook data/opslag)
     - DOELEN_KEY/laadDoelen/LEEG_DOEL, REVIEWS_KEY/laadReviews/
       LEEG_REVIEW, STAND_KEY/laadStand (opslag, geen berekening)
     - parseerDatum, teltAlsAanwezig, laadJson, tellendeWedstrijden,
       wedstrijdSoort, beschikbaarheidInfo, teamNaamVol (gedeelde
       helpers — de laatste drie komen uit src/domein/wedstrijden.js)
   Dat werkt ondanks de plakvolgorde omdat function-declaraties in
   dezelfde scope pas bij aánroep worden opgezocht, niet bij het
   inladen — hetzelfde principe als bij boetepotActief() in
   src/domein/boetepot.js en toernooiStand() in
   src/domein/wedstrijden.js.

   Wat hier NIET staat, met opzet:
     - de opkomstlogica (opkomstVan, presentieTabel, afwezigheid) blijft
       (voorlopig) in src/app.jsx — dat is voor een latere, aparte stap
       (P3 stap 4). spelerInzichten hieronder roept teltAlsAanwezig()
       nog gewoon aan uit app.jsx, en heeft ook zijn eerste, inline
       opkomstberekening ongewijzigd meegekregen — die factoring gebeurt
       pas in die latere stap;
     - het pakketten/entitlements-blok, het 3D-sportpark, de tenue-
       ontwerper, het dead-ball-tekenbord, de grafiek-componenten, alle
       PDF/WhatsApp-deelfuncties en de spelregelquiz blijven in
       src/app.jsx — daar horen ze ook, dat is geen domeinrekenwerk;
     - de React-componenten rond spelers, statistieken, rapporten,
       de spelerskaart, doelen/reviews, de stand, en het opstellingsveld
       blijven in src/app.jsx — alleen de losse rekenfuncties errond
       zijn verhuisd.
   ══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   SKILLS IN FC-STIJL
   Zes categorieën met onderliggende waarden op een schaal van
   1 tot 99, plus een aparte set voor keepers. Daarnaast twee
   sterbeoordelingen: trucjes en het niet-favoriete been.
═══════════════════════════════════════════════════════════ */
const FC_CATEGORIEEN = [
  {id:"pace", label:"Snelheid", kort:"SNE", kleur:"#22c55e", attrs:[
    {id:"acceleratie",    label:"Acceleratie"},
    {id:"sprintsnelheid", label:"Sprintsnelheid"}
  ]},
  {id:"shooting", label:"Schieten", kort:"SCH", kleur:"#ef4444", attrs:[
    {id:"positiespel",    label:"Positiespel"},
    {id:"afwerken",       label:"Afwerken"},
    {id:"schotkracht",    label:"Schotkracht"},
    {id:"afstandsschot",  label:"Afstandsschot"},
    {id:"volley",         label:"Volley"},
    {id:"strafschop",     label:"Strafschop"}
  ]},
  {id:"passing", label:"Passen", kort:"PAS", kleur:"#3b82f6", attrs:[
    {id:"visie",          label:"Visie"},
    {id:"voorzet",        label:"Voorzet"},
    {id:"vrijetrap",      label:"Vrije trap"},
    {id:"kortepass",      label:"Korte pass"},
    {id:"langepass",      label:"Lange pass"},
    {id:"effect",         label:"Effect"}
  ]},
  {id:"dribbling", label:"Dribbelen", kort:"DRI", kleur:"#a855f7", attrs:[
    {id:"wendbaarheid",   label:"Wendbaarheid"},
    {id:"balans",         label:"Balans"},
    {id:"reactie",        label:"Reactievermogen"},
    {id:"balcontrole",    label:"Balcontrole"},
    {id:"dribbelen",      label:"Dribbelen"},
    {id:"kalmte",         label:"Kalmte"}
  ]},
  {id:"defending", label:"Verdedigen", kort:"VER", kleur:"#f59e0b", attrs:[
    {id:"onderscheppen",  label:"Onderscheppen"},
    {id:"kopkracht",      label:"Kopkracht"},
    {id:"verdedigend",    label:"Verdedigend inzicht"},
    {id:"staandetackle",  label:"Staande tackle"},
    {id:"slidingtackle",  label:"Sliding"}
  ]},
  {id:"physical", label:"Fysiek", kort:"FYS", kleur:"#06b6d4", attrs:[
    {id:"sprongkracht",   label:"Sprongkracht"},
    {id:"uithouding",     label:"Uithoudingsvermogen"},
    {id:"kracht",         label:"Kracht"},
    {id:"agressie",       label:"Agressie"}
  ]}
];

const FC_KEEPER = [
  {id:"keeping", label:"Keepen", kort:"KEE", kleur:"#eab308", attrs:[
    {id:"gk_duiken",      label:"Duiken"},
    {id:"gk_vangen",      label:"Vangen"},
    {id:"gk_uittrappen",  label:"Uittrappen"},
    {id:"gk_reflexen",    label:"Reflexen"},
    {id:"gk_snelheid",    label:"Snelheid"},
    {id:"gk_positiespel", label:"Positiespel"}
  ]},
  {id:"physical", label:"Fysiek", kort:"FYS", kleur:"#06b6d4", attrs:[
    {id:"sprongkracht",   label:"Sprongkracht"},
    {id:"kracht",         label:"Kracht"},
    {id:"kalmte",         label:"Kalmte"},
    {id:"langepass",      label:"Lange pass"}
  ]}
];

/* Welke set hoort bij deze speler? */
function fcCategorieen(speler) {
  return (speler && speler.positie==="Keeper") ? FC_KEEPER : FC_CATEGORIEEN;
}
/* Alle waarden die ergens in beide sets voorkomen */
const FC_ALLE_ATTRS = (function(){
  var uit = {};
  FC_CATEGORIEEN.concat(FC_KEEPER).forEach(function(c){
    c.attrs.forEach(function(a){ uit[a.id] = a; });
  });
  return uit;
})();


/* Eén waarde uitlezen, of null als hij nog niet is ingevuld */
function fcWaarde(speler, id) {
  var v = speler && speler.skills ? Number(speler.skills[id]) : NaN;
  return isNaN(v) ? null : Math.max(1, Math.min(99, Math.round(v)));
}
/* Gemiddelde van een categorie, over wat er is ingevuld */
function fcCategorieWaarde(speler, cat) {
  var w = cat.attrs.map(function(a){ return fcWaarde(speler, a.id); })
                   .filter(function(x){ return x!==null; });
  if (!w.length) return null;
  return Math.round(w.reduce(function(a,b){return a+b;},0) / w.length);
}
function fcSterren(speler, id) {
  var v = speler && speler.sterren ? Number(speler.sterren[id]) : NaN;
  return isNaN(v) ? null : Math.max(1, Math.min(5, Math.round(v)));
}
function heeftSkills(speler) {
  return Object.keys(FC_ALLE_ATTRS).some(function(id){ return fcWaarde(speler, id) !== null; });
}

/* Hoe zwaar telt elke categorie mee voor het eindcijfer, per positie.
   Losjes gebaseerd op hoe voetbalspellen dat doen. */
/* Wat je op deze leeftijd van een positie mag verwachten, per categorie.
   Dezelfde schaal als de skills, zodat je ze naast elkaar kunt leggen. */
const FC_NORM = {
  Keeper:       {keeping:65, physical:60},
  Verdediger:   {pace:58, shooting:42, passing:55, dribbling:55, defending:68, physical:66},
  Middenvelder: {pace:60, shooting:57, passing:68, dribbling:66, defending:58, physical:60},
  Aanvaller:    {pace:68, shooting:70, passing:57, dribbling:68, defending:40, physical:58}
};
function fcNorm(positie, catId) {
  var n = FC_NORM[positie];
  return n && n[catId]!==undefined ? n[catId] : 58;
}

const OVR_GEWICHT = {
  Keeper:       {keeping:0.82, physical:0.18},
  Verdediger:   {defending:0.40, physical:0.20, pace:0.14, passing:0.12, dribbling:0.11, shooting:0.03},
  Middenvelder: {passing:0.30, dribbling:0.24, defending:0.15, physical:0.12, shooting:0.13, pace:0.06},
  Aanvaller:    {shooting:0.33, dribbling:0.24, pace:0.18, passing:0.12, physical:0.10, defending:0.03}
};
function ovrGewicht(positie) {
  return OVR_GEWICHT[positie] || {passing:0.2, dribbling:0.2, defending:0.16, physical:0.16, shooting:0.16, pace:0.12};
}
/* Het eindcijfer: gewogen gemiddelde over de categorieën die zijn ingevuld */
function fcOvr(speler) {
  var gew = ovrGewicht(speler && speler.positie);
  var som = 0, gewicht = 0;
  fcCategorieen(speler).forEach(function(c){
    var w = fcCategorieWaarde(speler, c);
    if (w === null) return;
    var g = gew[c.id] || 0.1;
    som += w * g; gewicht += g;
  });
  if (!gewicht) return null;
  return Math.round(som / gewicht);
}

/* ── OVERZETTEN VAN DE OUDE BEOORDELING ──────────────────────
   De app werkte eerst met zeven waarden op een schaal van 1 tot 10.
   Die zetten we één keer om, zodat je eerdere werk niet weg is.
   Een 7 wordt een 70; de waarde vult de hele bijbehorende categorie. */
const OUD_NAAR_NIEUW = {
  passen:        ["visie","voorzet","vrijetrap","kortepass","langepass","effect"],
  afwerken:      ["positiespel","afwerken","schotkracht","afstandsschot","volley","strafschop"],
  verdedigen:    ["onderscheppen","kopkracht","verdedigend","staandetackle","slidingtackle"],
  balbeheersing: ["wendbaarheid","balans","balcontrole","dribbelen"],
  mentaal:       ["reactie","kalmte","agressie"],
  fysiek:        ["sprongkracht","uithouding","kracht","acceleratie","sprintsnelheid"]
};
function migreerSkills(speler) {
  if (!speler || heeftSkills(speler)) return speler;
  var oud = speler.vaardigheden;
  if (!oud || !Object.keys(oud).length) return speler;
  var nieuw = {}, sterren = Object.assign({}, speler.sterren||{});
  Object.keys(OUD_NAAR_NIEUW).forEach(function(sleutel){
    var v = Number(oud[sleutel]);
    if (isNaN(v)) return;
    var op99 = Math.max(1, Math.min(99, Math.round(v*10)));
    OUD_NAAR_NIEUW[sleutel].forEach(function(id){ nieuw[id] = op99; });
  });
  /* Technische trucjes werden een sterbeoordeling */
  var tr = Number(oud.trucjes);
  if (!isNaN(tr)) {
    sterren.trucs = Math.max(1, Math.min(5, Math.round(tr/2)));
    nieuw.dribbelen = Math.max(1, Math.min(99, Math.round(tr*10)));
  }
  if (!Object.keys(nieuw).length) return speler;
  return Object.assign({}, speler, {skills: nieuw, sterren: sterren});
}

function rapportSoort(id) {
  return RAPPORT_SOORTEN.filter(function(r){ return r.id===id; })[0] || RAPPORT_SOORTEN[0];
}
function rapportenVan(speler, seizoen) {
  return (speler.rapporten||[]).filter(function(r){ return !seizoen || r.seizoen===seizoen; });
}
function rapportVan(speler, seizoen, soort) {
  return rapportenVan(speler, seizoen).filter(function(r){ return r.soort===soort; })[0] || null;
}
/* Legt de huidige stand vast */
function maakRapport(speler, seizoen, soort, tekst) {
  return {
    id: Date.now(),
    seizoen: seizoen,
    soort: soort,
    datum: new Date().toISOString().slice(0,10),
    tekst: (tekst||"").trim(),
    positie: speler.positie || "",
    skills: Object.assign({}, speler.skills||{}),
    sterren: Object.assign({}, speler.sterren||{}),
    ovr: fcOvr(speler)
  };
}
/* De skills van een rapport lezen alsof het een speler is */
function rapportAlsSpeler(rapport) {
  return {positie: rapport.positie, skills: rapport.skills, sterren: rapport.sterren};
}
/* Groei tussen twee rapporten, per categorie */
function rapportVerschil(vanRapport, totRapport) {
  if (!vanRapport || !totRapport) return [];
  var a = rapportAlsSpeler(vanRapport), b = rapportAlsSpeler(totRapport);
  return fcCategorieen(b).map(function(cat){
    var va = fcCategorieWaarde(a, cat), vb = fcCategorieWaarde(b, cat);
    return {cat: cat, van: va, tot: vb, groei: (va!==null && vb!==null) ? vb-va : null};
  });
}

/* Kleur van het rapportcijfer, zoals je het op een wedstrijdverslag zou zien */
function cijferKleur(c) {
  var n = Number(c) || 0;
  if (n >= 8) return "var(--succes)";
  if (n >= 6.5) return "var(--blauw)";
  if (n >= 5.5) return "var(--oranje)";
  return "var(--gevaar)";
}

/* ── WEDSTRIJDDEELNAME per speler ── */
function deelnameVanSpeler(spelerId, wedstrijden) {
  var gespeeld = tellendeWedstrijden(wedstrijden)
    .sort(function(a,b){ return new Date(a.datum)-new Date(b.datum); });
  var rijen = [];
  gespeeld.forEach(function(w){
    var r = (w.opstelling||[]).find(function(o){ return o.spelerId===spelerId; });
    if (r && (r.spelStatus||"basis")!=="afwezig") rijen.push({wedstrijd:w, rij:r});
  });
  var basis = rijen.filter(function(x){ return (x.rij.spelStatus||"basis")==="basis"; }).length;
  var minuten = rijen.reduce(function(s,x){ return s + (Number(x.rij.minuten)||0); },0);
  var invalRijen = rijen.filter(function(x){ return (x.rij.spelStatus||"basis")==="wissel"; });
  var invalMinuten = invalRijen.reduce(function(s,x){ return s + (Number(x.rij.minuten)||0); },0);
  return {
    rijen: rijen, aantal: rijen.length, basis: basis, wissel: invalRijen.length,
    minuten: minuten,
    gemMinuten: rijen.length ? Math.round(minuten/rijen.length) : 0,
    gemInvalMinuten: invalRijen.length ? Math.round(invalMinuten/invalRijen.length) : 0,
    beschikbaar: gespeeld.length
  };
}

/* Alle cijfers van een speler op volgorde: uit wedstrijdbeoordelingen en reviews */
function cijfersVanSpeler(spelerId, wedstrijden, reviews) {
  var uit = [];
  tellendeWedstrijden(wedstrijden).forEach(function(w){
    var c = w.beoordelingen ? Number(w.beoordelingen[spelerId]) : NaN;
    if (!isNaN(c) && c>0) uit.push({datum:w.datum, cijfer:c});
  });
  (reviews||[]).filter(function(r){ return r.spelerId===spelerId && r.cijfer; }).forEach(function(r){
    uit.push({datum:r.datum, cijfer:Number(r.cijfer)});
  });
  return uit.sort(function(a,b){ return new Date(a.datum)-new Date(b.datum); });
}

/* ── AUTOMATISCHE INZICHTEN ── */
function spelerInzichten(speler, wedstrijden, trainingen, doelen, reviews, afwezigheden) {
  var uit = [];
  function voeg(soort, tekst) { uit.push({soort:soort, tekst:tekst}); }
  var voornaam = String(speler.naam||"").split(" ")[0] || "Deze speler";

  var st = berekenSpelerStats(speler.id, wedstrijden, speler.stats);
  var d  = deelnameVanSpeler(speler.id, wedstrijden);
  var cijfers = cijfersVanSpeler(speler.id, wedstrijden, reviews).map(function(c){ return c.cijfer; });

  /* 1. kaarten */
  var kaarten = st.geelKaarten + st.roodKaarten;
  if (st.roodKaarten > 0) {
    voeg("aandacht", voornaam+" stond dit seizoen "+st.roodKaarten+"× voor rood. Bespreek wat eraan voorafging.");
  } else if (kaarten >= 3) {
    voeg("aandacht", "Het kaartenaantal van "+voornaam+" loopt op — "+kaarten+" in totaal. Houd dit in de gaten.");
  } else if (kaarten === 0 && d.aantal >= 4) {
    voeg("goed", voornaam+" speelde "+d.aantal+" wedstrijden zonder één kaart. Netjes in de duels.");
  }

  /* 2. invaller of basisspeler */
  if (d.aantal >= 3) {
    var deelWissel = d.wissel / d.aantal;
    if (deelWissel >= 0.6) {
      voeg("aandacht", voornaam+" valt vaak in — "+d.wissel+" van de "+d.aantal+" keer, gemiddeld "+d.gemInvalMinuten+" minuten per invalbeurt. Overweeg een basisplaats.");
    } else if (d.basis === d.aantal && d.aantal >= 5) {
      voeg("neutraal", voornaam+" stond alle "+d.aantal+" wedstrijden in de basis.");
    }
  }

  /* 3. constant of wisselvallig */
  if (cijfers.length >= 3) {
    var laag = Math.min.apply(null, cijfers), hoog = Math.max.apply(null, cijfers);
    var gem = cijfers.reduce(function(a,b){return a+b;},0)/cijfers.length;
    var spreiding = hoog - laag;
    if (spreiding <= 1.5) {
      voeg("goed", voornaam+" is constant — cijfers tussen "+laag+" en "+hoog+". Je weet wat je krijgt.");
    } else if (spreiding >= 3) {
      voeg("aandacht", voornaam+" is wisselvallig — van "+laag+" tot "+hoog+". Zoek uit waar dat verschil vandaan komt.");
    }
    if (gem >= 7.5) voeg("goed", "Gemiddeld een "+(Math.round(gem*10)/10)+" over "+cijfers.length+" beoordelingen.");
  }

  /* 4. vorm: laatste drie tegen de rest */
  if (cijfers.length >= 5) {
    var laatste = cijfers.slice(-3);
    var eerder  = cijfers.slice(0, -3);
    var gl = laatste.reduce(function(a,b){return a+b;},0)/laatste.length;
    var ge = eerder.reduce(function(a,b){return a+b;},0)/eerder.length;
    if (gl - ge >= 0.7) voeg("goed", voornaam+" zit in de lift — laatste drie beoordelingen "+(Math.round((gl-ge)*10)/10)+" punt hoger dan daarvoor.");
    else if (ge - gl >= 0.7) voeg("aandacht", voornaam+" zakt wat weg — laatste drie beoordelingen "+(Math.round((ge-gl)*10)/10)+" punt lager dan daarvoor.");
  }

  /* 5. productie per 90 minuten */
  if (d.minuten >= 180) {
    var bijdragen = st.doelpunten + st.assists;
    var per90 = Math.round(bijdragen / (d.minuten/90) * 100) / 100;
    if (per90 >= 0.7) voeg("goed", voornaam+" is productief — "+per90+" doelpunt of assist per 90 minuten.");
    else if (bijdragen === 0 && d.minuten >= 360) voeg("neutraal", "Nog geen doelpunt of assist in "+d.minuten+" minuten.");
  }

  /* 6. trainingsopkomst */
  var metOpkomst = (trainingen||[]).map(function(t){
    return opkomstVan({datum: t.datum, aanwezigheid:
      (t.aanwezigheid||[]).filter(function(a){ return a.spelerId===speler.id; })}, afwezigheden);
  }).filter(function(o){ return o !== null; });
  if (metOpkomst.length >= 4) {
    var aanw = metOpkomst.reduce(function(s,o){ return s+o.aanwezig; }, 0);
    var pct = Math.round(aanw/metOpkomst.length*100);
    if (pct >= 90) voeg("goed", "Trainingsopkomst "+pct+" procent. Bijna altijd present.");
    else if (pct < 65) voeg("aandacht", "Trainingsopkomst "+pct+" procent — "+(metOpkomst.length-aanw)+" van de "+metOpkomst.length+" gemist.");
  }

  /* 7. man of the match */
  var motm = telMotm(speler.id, wedstrijden);
  if (motm >= 2) voeg("goed", voornaam+" was al "+motm+"× man of the match.");

  /* 8. ontwikkeldoelen */
  var eigen = doelenVanSpeler(speler.id, doelen);
  if (eigen.length === 0) {
    voeg("neutraal", "Nog geen ontwikkeldoelen gesteld voor "+voornaam+".");
  } else {
    var behaald = eigen.filter(function(x){ return x.behaald; }).length;
    if (behaald === eigen.length) voeg("goed", "Alle "+eigen.length+" doelen behaald. Tijd voor nieuwe.");
    var vandaag = new Date(); vandaag.setHours(0,0,0,0);
    var over = eigen.filter(function(x){
      if (x.behaald || !x.streefdatum) return false;
      var sd = parseerDatum(x.streefdatum);
      return sd && sd < vandaag;
    });
    if (over.length > 0) voeg("aandacht", over.length===1
      ? "Het doel \u201c"+over[0].titel+"\u201d is over de streefdatum."
      : over.length+" doelen zijn over hun streefdatum.");
  }

  /* 9. vaardigheden versus positienorm */
  if (heeftSkills(speler) && speler.positie) {
    var sterk = [], zwak = [];
    fcCategorieen(speler).forEach(function(cat){
      var w = fcCategorieWaarde(speler, cat);
      if (w === null) return;
      var verschil = w - fcNorm(speler.positie, cat.id);
      if (verschil >= 8) sterk.push(cat.label.toLowerCase());
      if (verschil <= -8) zwak.push(cat.label.toLowerCase());
    });
    if (sterk.length && zwak.length) voeg("neutraal", "Sterk in "+sterk.join(" en ")+", moet werken aan "+zwak.join(" en ")+".");
    else if (sterk.length) voeg("goed", "Boven de norm voor een "+speler.positie.toLowerCase()+" in "+sterk.join(" en ")+".");
    else if (zwak.length) voeg("aandacht", "Onder de norm voor een "+speler.positie.toLowerCase()+" in "+zwak.join(" en ")+".");
  }

  /* 10. beschikbaarheid */
  if (speler.beschikbaar && speler.beschikbaar!=="fit") {
    voeg("aandacht", voornaam+" staat op "+beschikbaarheidInfo(speler.beschikbaar).label.toLowerCase()+
      (speler.beschikbaarNotitie ? " — "+speler.beschikbaarNotitie : "")+".");
  }

  if (uit.length === 0) voeg("neutraal", "Nog te weinig gegevens voor observaties. Vul uitslagen en beoordelingen in.");
  return uit;
}

function doelenVanSpeler(spelerId, doelen) {
  return (doelen||[]).filter(function(d){ return d.spelerId===spelerId; })
    .sort(function(a,b){ return (a.behaald?1:0)-(b.behaald?1:0) || (b.aangemaakt||0)-(a.aangemaakt||0); });
}
function reviewsVanSpeler(spelerId, reviews) {
  return (reviews||[]).filter(function(r){ return r.spelerId===spelerId; })
    .sort(function(a,b){ return new Date(b.datum)-new Date(a.datum); });
}
function ontwikkelingsScore(spelerId, doelen) {
  var eigen = doelenVanSpeler(spelerId, doelen);
  if (eigen.length===0) return null;
  var som = eigen.reduce(function(s,d){ return s + (d.behaald ? 100 : (Number(d.voortgang)||0)); },0);
  return Math.round(som/eigen.length);
}
function telBehaald(spelerId, doelen) {
  return doelenVanSpeler(spelerId, doelen).filter(function(d){return d.behaald;}).length;
}

/* Een opstelling aanvullen met iedereen uit de selectie die er nog
   niet in staat. Voeg je een speler toe nadat je de opstelling hebt
   opgeslagen, dan heeft hij geen regel en is hij nergens te zien —
   niet als basis, niet als wissel, en ook niet als afwezig. Zo raak je
   iemand kwijt zonder dat er iets misgaat op het scherm. */
function opstellingCompleet(opstelling, spelers) {
  var rijen = (opstelling || []).slice();
  (spelers || []).forEach(function(s){
    if (rijen.some(function(r){ return r.spelerId === s.id; })) return;
    rijen.push({spelerId:s.id, naam:s.naam, foto:s.foto, rugnummer:s.rugnummer,
                positie:s.positie, positieId:null, positieLabel:"", gast:!!s.gast,
                spelStatus:"afwezig", minuten:0});
  });
  return rijen;
}

/* ── SPEELMINUTEN uit wissels berekenen ── */
/* De speelminuten, als optelsom van periodes.

   Hier stond eerst één begin en één einde: de eerste keer dat iemand
   het veld op kwam en de eerste keer dat hij eraf ging. Dat klopt in
   de A-categorie, waar een gewisselde speler niet meer terug mag.

   Wij spelen in de B-categorie en daar mag je doorwisselen. Iemand kan
   in de 22e minuut naar de kant, in de 45e terugkomen en uitspelen —
   dat zijn twee periodes en samen 67 minuten. Met de oude berekening
   stopte zijn wedstrijd in de 22e minuut en kreeg hij er 22.

   Dus lopen we de wissels langs op volgorde van de klok en tellen we
   op hoe lang hij er telkens op stond. */
/* Heeft deze gebeurtenis een minuut? Leeg is iets anders dan nul: nul
   betekent "in de eerste minuut", leeg betekent "ik weet het niet meer". */
function heeftMinuut(g) {
  var m = g && g.minuut;
  if (m === null || m === undefined) return false;
  return String(m).trim() !== "";
}

function berekenMinuten(opstelling, wissels, speelduur, uitgeleend) {
  var duur = Number(speelduur)||90;
  var alle = (wissels||[]);
  /* Wie is uitgeleend heeft gespeeld, alleen niet hier. Nul minuten zou
     dus onwaar zijn — net zo onwaar als een verzonnen getal. Hij krijgt
     hetzelfde streepje als een wissel zonder minuut, en om dezelfde
     reden: we weten het niet. */
  var geleend = {};
  (uitgeleend || []).forEach(function (id) { geleend[String(id)] = true; });
  /* Een wissel zonder minuut maakt de speeltijd van die twee spelers
     onbekend. Niet nul, en al helemaal geen gok: als je niet meer weet
     of Luuk in de 20e of de 70e minuut inviel, is elk getal dat hier
     verschijnt verzonnen. Een streepje is dan het eerlijke antwoord. */
  var onzeker = {};
  alle.forEach(function(s){
    if (heeftMinuut(s)) return;
    if (s.uitId) onzeker[s.uitId] = true;
    if (s.inId)  onzeker[s.inId]  = true;
  });
  var subs = alle.filter(heeftMinuut)
    .sort(function(a,b){return (Number(a.minuut)||0)-(Number(b.minuut)||0);});
  return (opstelling||[]).map(function(o){
    var status = o.spelStatus||"basis";
    if (geleend[String(o.spelerId)])
      return Object.assign({},o,{minuten:null,minutenOnzeker:true,uitgeleend:true});
    if (status==="afwezig") return Object.assign({},o,{minuten:0,minutenOnzeker:false});
    if (onzeker[o.spelerId]) return Object.assign({},o,{minuten:null,minutenOnzeker:true});
    var opHetVeld = (status==="basis");
    var sinds = opHetVeld ? 0 : null;
    var totaal = 0;
    subs.forEach(function(s){
      /* Een minuut buiten de wedstrijd om is een tikfout, geen reden
         voor negatieve of eindeloze speeltijd. */
      var m = Math.max(0, Math.min(duur, Number(s.minuut)||0));
      if (s.uitId===o.spelerId && opHetVeld) {
        totaal += Math.max(0, m - sinds);
        opHetVeld = false; sinds = null;
      } else if (s.inId===o.spelerId && !opHetVeld) {
        opHetVeld = true; sinds = m;
      }
    });
    if (opHetVeld && sinds !== null) totaal += Math.max(0, duur - sinds);
    return Object.assign({},o,{minuten: Math.min(duur, totaal), minutenOnzeker:false});
  });
}

function eigenStandRij(wedstrijden) {
  /* Alleen competitiewedstrijden: een bekerduel of oefenpot hoort
     niet in de ranglijst van de competitie. */
  var g = (wedstrijden||[]).filter(function(w){
    return w.status==="gespeeld" && wedstrijdSoort(w).id==="competitie";
  });
  return {
    id:"__fch", naam:teamNaamVol(), eigen:true,
    gespeeld: g.length,
    winst:  g.filter(function(w){return w.score.fch>w.score.teg;}).length,
    gelijk: g.filter(function(w){return w.score.fch===w.score.teg;}).length,
    verlies:g.filter(function(w){return w.score.fch<w.score.teg;}).length,
    doelVoor: g.reduce(function(s,w){return s+(Number(w.score.fch)||0);},0),
    doelTegen:g.reduce(function(s,w){return s+(Number(w.score.teg)||0);},0)
  };
}
function standMetPunten(rijen) {
  return (rijen||[]).map(function(r){
    return Object.assign({}, r, {
      punten: (Number(r.winst)||0)*3 + (Number(r.gelijk)||0),
      saldo:  (Number(r.doelVoor)||0) - (Number(r.doelTegen)||0)
    });
  }).sort(function(a,b){
    if (b.punten!==a.punten) return b.punten-a.punten;
    if (b.saldo!==a.saldo) return b.saldo-a.saldo;
    return (Number(b.doelVoor)||0)-(Number(a.doelVoor)||0);
  });
}

/* ── PLAYER OF THE MATCH & BEOORDELINGEN ── */
function telMotm(spelerId, wedstrijden) {
  return tellendeWedstrijden(wedstrijden).filter(function(w){
    return w.motm===spelerId;
  }).length;
}
/* ── MAN OF THE SEASON ──────────────────────────────────────
   Wie het vaakst man of the match werd. Punten in plaats van een
   kaal aantal, zodat een gedeelde eerste plek te breken valt: drie
   punten per onderscheiding, plus een punt voor elk cijfer van een
   acht of hoger dat hij die wedstrijd kreeg. */
const MOTS_PUNTEN = {motm:3, hoogCijfer:1, cijferVanaf:8};
function motsRanglijst(spelers, wedstrijden) {
  var telt = tellendeWedstrijden(wedstrijden);
  var rijen = (spelers||[]).map(function(s){
    var motm = 0, hoog = 0, cijfers = [];
    telt.forEach(function(w){
      if (w.motm === s.id) motm++;
      var c = w.beoordelingen ? Number(w.beoordelingen[s.id]) : NaN;
      if (!isNaN(c) && c > 0) {
        cijfers.push(c);
        if (c >= MOTS_PUNTEN.cijferVanaf) hoog++;
      }
    });
    var gem = cijfers.length
      ? cijfers.reduce(function(a,b){ return a+b; }, 0) / cijfers.length : null;
    return {
      speler: s, motm: motm, hoog: hoog, cijfers: cijfers.length,
      gemiddelde: gem === null ? null : Math.round(gem*10)/10,
      punten: motm*MOTS_PUNTEN.motm + hoog*MOTS_PUNTEN.hoogCijfer
    };
  }).filter(function(r){ return r.punten > 0; });

  rijen.sort(function(a,b){
    if (b.punten !== a.punten) return b.punten - a.punten;
    if (b.motm !== a.motm) return b.motm - a.motm;
    return (b.gemiddelde||0) - (a.gemiddelde||0);
  });
  zetPlekken(rijen);
  return rijen;
}
function gemiddeldCijfer(spelerId, wedstrijden) {
  var cijfers = tellendeWedstrijden(wedstrijden)
    .map(function(w){ return w.beoordelingen ? Number(w.beoordelingen[spelerId]) : NaN; })
    .filter(function(c){ return !isNaN(c) && c>0; });
  if (cijfers.length===0) return null;
  return (cijfers.reduce(function(a,b){return a+b;},0)/cijfers.length).toFixed(1);
}

/* Gedeelde plekken krijgen hetzelfde nummer, en daarna wordt er
   doorgeteld: staan er drie op één, dan volgt plek vier. */
function zetPlekken(rijen) {
  var plek = 0, vorige = null;
  (rijen||[]).forEach(function(r, i){
    if (vorige === null || r.punten !== vorige) { plek = i + 1; vorige = r.punten; }
    r.plek = plek;
  });
  return rijen;
}
/* ── SPELERSTATISTIEKEN: afgeleid uit wedstrijden + handmatige beginstand ── */
function berekenSpelerStats(spelerId, wedstrijden, beginstand) {
  var begin = beginstand || {};
  /* Oefenwedstrijden en toernooien tellen niet mee: anders staat er
     na de voorbereiding al een half seizoen aan doelpunten. */
  var gespeeld = tellendeWedstrijden(wedstrijden);
  var doelpunten=0, assists=0, geel=0, rood=0, minuten=0, aantal=0;
  gespeeld.forEach(function(w){
    (w.scorers||[]).forEach(function(sc){
      if (sc.eigenTeam && sc.spelerId===spelerId) doelpunten++;
      if (sc.assist===spelerId) assists++;
    });
    (w.kaarten||[]).forEach(function(k){
      if (k.spelerId===spelerId) { if (k.type==="geel") geel++; else rood++; }
    });
    var rij = (w.opstelling||[]).find(function(o){ return o.spelerId===spelerId; });
    if (rij && (rij.spelStatus||"basis")!=="afwezig") { aantal++; minuten += Number(rij.minuten)||0; }
  });
  function tel(a,b){ return a + (Number(b)||0); }
  return {
    doelpunten:  tel(doelpunten, begin.doelpunten),
    assists:     tel(assists,    begin.assists),
    geelKaarten: tel(geel,       begin.geelKaarten),
    roodKaarten: tel(rood,       begin.roodKaarten),
    speelMinuten:tel(minuten,    begin.speelMinuten),
    wedstrijden: tel(aantal,     begin.wedstrijden),
    uitWedstrijden: {doelpunten:doelpunten,assists:assists,geelKaarten:geel,roodKaarten:rood,speelMinuten:minuten,wedstrijden:aantal}
  };
}

function positiePassendheid(rolVanPlek, spelerPositie) {
  if (!rolVanPlek) return 5;
  if (spelerPositie === rolVanPlek) return 0;
  if (!spelerPositie) return 4;
  var a = ROL_VOLGORDE.indexOf(rolVanPlek);
  var b = ROL_VOLGORDE.indexOf(spelerPositie);
  if (a < 0 || b < 0) return 4;
  /* keeper past nergens anders, en niemand past op keeper */
  if (rolVanPlek === "Keeper" || spelerPositie === "Keeper") return 4;
  return Math.abs(a - b);   // aangrenzende linie telt als bijna passend
}

/* ── Wie staat er op dit moment op het veld? ─────────────────
   Dit leek een vraag met een makkelijk antwoord: de basis, min wie er
   is uitgewisseld, plus wie erin kwam. Zo stond het er ook, en zo
   klopte het niet.

   Want een speler kan er in de 22e minuut uit gaan en in de 45e weer
   in komen. De oude berekening keek alleen óf iemand ooit gewisseld
   was, niet wanneer. Zo verdween Luuk uit het lijstje terwijl hij op
   het veld stond, en zag Evan er acht in plaats van elf.

   De enige manier om dit goed te doen is de wedstrijd naspelen: begin
   bij de opstelling en loop de gebeurtenissen af op volgorde van de
   klok. Dat levert meteen ook op wie op welke plek staat, en dat is
   precies wat je nodig hebt om te kunnen wisselen. ─────────────── */
const POSITIE_VOLGORDE = ["DM", "LV", "LVV", "CV", "RVV", "RV",
                          "LM", "CVM", "CM", "CAM", "RM",
                          "LVA", "SP", "RVA"];
const POSITIE_NAAM = {
  DM:"Doelman", LV:"Linksback", LVV:"Linkervleugelverdediger",
  CV:"Centrale verdediger", RVV:"Rechtervleugelverdediger", RV:"Rechtsback",
  LM:"Linkermiddenvelder", CVM:"Controlerende middenvelder", CM:"Middenvelder",
  CAM:"Aanvallende middenvelder", RM:"Rechtermiddenvelder",
  LVA:"Linksbuiten", SP:"Spits", RVA:"Rechtsbuiten"
};
/* ══ TWEE KEER DEZELFDE PLEK ═════════════════════════════════
   Een 4-2-3-1 heeft twee centrale verdedigers en twee controlerende
   middenvelders. Op het opstellingsveld is dat geen probleem: daar zie
   je wie waar staat. In een lijst wel — bij een positiewissel koos je
   uit "CV" en "CV" en moest je raden welke van de twee je aanwees.

   De formatie weet het antwoord al. Elke plek heeft een eigen nummer
   (CB1, CB2) én een plaats op het veld. Wie links staat wordt CV-L, wie
   rechts staat CV-R, en bij drie op een rij heet de middelste CV-M. Dat
   is precies hoe een trainer het zegt, en het volgt uit de formatie in
   plaats van uit een lijst die je apart moet bijhouden.

   Bij vier of meer op dezelfde hoogte — dat komt niet voor in een echte
   formatie maar wel in een zelfgemaakte — worden het nummers, want dan
   houdt links-midden-rechts op zinnig te zijn.
   ══════════════════════════════════════════════════════════ */
function plekLabels(slots) {
  var perCode = {};
  (slots || []).forEach(function (p) { (perCode[p.l] = perCode[p.l] || []).push(p); });
  var uit = {};
  Object.keys(perCode).forEach(function (code) {
    var groep = perCode[code];
    if (groep.length === 1) { uit[groep[0].id] = code; return; }
    groep = groep.slice().sort(function (a, b) { return (a.x || 0) - (b.x || 0); });
    var achter = groep.length === 2 ? ["L", "R"]
               : groep.length === 3 ? ["L", "M", "R"]
               : groep.map(function (_, i) { return String(i + 1); });
    groep.forEach(function (q, i) { uit[q.id] = code + "-" + achter[i]; });
  });
  return uit;
}
/* "CV-L" is nog steeds een centrale verdediger. Alles wat op de kale
   code werkt — de volgorde van achter naar voren, de volledige naam —
   moet daar niet over struikelen. */
function plekCode(label) {
  var s = String(label || "");
  var i = s.indexOf("-");
  return i < 0 ? s : s.slice(0, i);
}
const PLEK_KANT = {L:"links", M:"midden", R:"rechts"};
function plekNaam(label) {
  var s = String(label || "");
  var basis = POSITIE_NAAM[plekCode(s)] || plekCode(s);
  var i = s.indexOf("-");
  if (i < 0) return basis;
  var kant = s.slice(i + 1);
  return basis + " " + (PLEK_KANT[kant] || kant);
}

function positieRang(code) {
  var i = POSITIE_VOLGORDE.indexOf(plekCode(code));
  return i < 0 ? 90 : i;
}
/* De wedstrijd naspelen tot en met een bepaalde minuut. Zonder minuut:
   helemaal tot het eind. */
function veldStand(opstelling, wissels, posWissels, tot) {
  var op = {}, plek = {};
  (opstelling || []).forEach(function (o) {
    op[o.spelerId] = (o.spelStatus || "basis") === "basis";
    plek[o.spelerId] = o.positieLabel || "";
  });
  var lijst = [];
  (wissels || []).forEach(function (w, i) {
    lijst.push({m: Number(w.minuut) || 0, n: i, soort: "wissel", w: w});
  });
  (posWissels || []).forEach(function (v, i) {
    lijst.push({m: Number(v.minuut) || 0, n: 10000 + i, soort: "plek", v: v});
  });
  /* Op minuut, en bij een gelijke minuut op de volgorde waarin ze zijn
     ingevoerd — dat is de enige volgorde die we kennen. */
  lijst.sort(function (a, b) { return (a.m - b.m) || (a.n - b.n); });
  lijst.forEach(function (g) {
    if (tot !== undefined && tot !== null && g.m > Number(tot)) return;
    if (g.soort === "wissel") {
      if (g.w.uitId) op[g.w.uitId] = false;
      if (g.w.inId) {
        op[g.w.inId] = true;
        /* De invaller neemt de plek over van wie eruit gaat, tenzij er
           bij de wissel een andere plek is opgegeven. */
        plek[g.w.inId] = g.w.naar || plek[g.w.uitId] || plek[g.w.inId] || "";
      }
    } else if (g.v.spelerId) {
      plek[g.v.spelerId] = g.v.naar || plek[g.v.spelerId] || "";
    }
  });
  return {op: op, plek: plek};
}
function staatOpVeld(spelerId, opstelling, wissels, posWissels) {
  return veldStand(opstelling, wissels, posWissels).op[spelerId] === true;
}
/* De elf op het veld, op volgorde van achter naar voren. Wie geen plek
   heeft (een invaller zonder opgave) komt achteraan in plaats van
   ertussenuit te vallen. */
function veldOpstelling(spelers, opstelling, wissels, posWissels) {
  var stand = veldStand(opstelling, wissels, posWissels);
  return (spelers || [])
    .filter(function (s) { return stand.op[s.id] === true; })
    .map(function (s) { return Object.assign({}, s, {plek: stand.plek[s.id] || ""}); })
    .sort(function (a, b) {
      var ra = positieRang(a.plek), rb = positieRang(b.plek);
      if (ra !== rb) return ra - rb;
      return (Number(a.rugnummer) || 99) - (Number(b.rugnummer) || 99);
    });
}
/* Wie kan er nu het veld in?

   In de B-categorie mag je doorwisselen: wie eruit is gehaald, mag er
   later weer in. Die staat dus gewoon weer in het rijtje, en niet
   onderaan bij "niet opgegeven" alsof hij er niet bij hoort.

   En wie zich heeft afgemeld hoort er niet tussen. Vier namen van
   jongens die thuis op de bank liggen, tussen de mensen die je kunt
   inbrengen, maakt het lijstje langer en het kiezen moeilijker. Die
   komen apart onderaan — helemaal weglaten is te streng, want soms
   staat er alsnog iemand langs de lijn. */
function wisselOpties(spelers, opstelling, wissels, posWissels) {
  var stand = veldStand(opstelling, wissels, posWissels);
  var rijBij = {};
  (opstelling || []).forEach(function (o) { rijBij[o.spelerId] = o; });
  var uit = {bank: [], terug: [], overig: [], afgemeld: []};
  (spelers || []).forEach(function (s) {
    if (stand.op[s.id]) return;                    /* staat al op het veld */
    var rij = rijBij[s.id];
    var status = rij ? (rij.spelStatus || "basis") : "basis";
    /* Wanneer ging hij er voor het laatst uit? Dat is wat je wilt zien
       als je hem terugbrengt. */
    var eruit = null;
    (wissels || []).forEach(function (w) {
      if (w.uitId !== s.id) return;
      var m = Number(w.minuut) || 0;
      if (eruit === null || m > eruit) eruit = m;
    });
    var kaart = Object.assign({}, s, {eruitMinuut: eruit});
    if (status === "afwezig") uit.afgemeld.push(kaart);
    else if (eruit !== null) uit.terug.push(kaart);
    else if (status === "wissel") uit.bank.push(kaart);
    else uit.overig.push(kaart);
  });
  function opNummer(a, b) { return (Number(a.rugnummer)||99) - (Number(b.rugnummer)||99); }
  uit.bank.sort(opNummer);
  /* Wie er het langst af staat, staat bovenaan: die is uitgerust. */
  uit.terug.sort(function (a, b) { return (a.eruitMinuut||0) - (b.eruitMinuut||0) || opNummer(a,b); });
  uit.overig.sort(opNummer);
  uit.afgemeld.sort(opNummer);
  return uit;
}

/* Wie er nog op de bank zit: opgegeven als wissel en nog niet gebruikt. */
function opDeBankNu(spelers, opstelling, wissels, posWissels) {
  var stand = veldStand(opstelling, wissels, posWissels);
  return (spelers || []).filter(function (s) {
    if (stand.op[s.id]) return false;
    var rij = (opstelling || []).filter(function (o) { return o.spelerId === s.id; })[0];
    return !!rij && (rij.spelStatus || "basis") === "wissel";
  }).sort(function (a, b) {
    return (Number(a.rugnummer) || 99) - (Number(b.rugnummer) || 99);
  });
}

function wedstrijdDuur(w) {
  var totaal = Number(w && w.speelduur) || 90;
  var helften = Number(w && w.helften) || 2;
  if (helften < 1) helften = 1;
  return {totaal: totaal, helften: helften,
          per: Math.round(totaal / helften),
          rust: helften > 1 ? Math.round(totaal / helften) : null};
}
function duurTekst(w) {
  var d = wedstrijdDuur(w);
  if (d.helften === 1) return d.totaal + " minuten";
  return d.helften + " \u00d7 " + d.per;
}

/* ── De wedstrijd als één tijdlijn ───────────────────────────
   Doelpunten, kaarten, wissels en positiewissels staan in vier aparte
   lijsten. Dat is prima om op te slaan, maar het is niet hoe een
   wedstrijd verloopt: die verloopt op volgorde van de klok.

   Deze functie legt die volgorde er overheen. Alles wat je daarna wilt
   weten — de stand, de speelminuten, wie waar stond — volgt eruit, en
   dat is precies de bedoeling: één bron, geen tellers die uit elkaar
   kunnen lopen.

   Eén ding wordt onderweg opgeruimd. Als twee spelers van plek ruilen
   legt de app dat vast als twee regels, want dat is wat er in de
   gegevens staat. Maar het is één gebeurtenis, en zo hoort het er ook
   te staan: "22' Anne-Jeppe ↔ Mike Damian" leest, twee losse regels
   waarin dezelfde man twee kanten op gaat niet. ─────────────────── */
function ruilPaar(a, b) {
  if (!a || !b) return false;
  if (a.spelerId === b.spelerId) return false;
  if ((Number(a.minuut)||0) !== (Number(b.minuut)||0)) return false;
  return a.van === b.naar && a.naar === b.van && !!a.naar;
}
function wedstrijdTijdlijn(w) {
  var uit = [];
  var n = 0;
  (w && w.scorers || []).forEach(function (s) {
    uit.push({soort: s.eigenTeam ? "goal" : "tegengoal", minuut: Number(s.minuut) || 0,
              volgorde: n++, bron: "scorers", id: s.id, d: s});
  });
  (w && w.kaarten || []).forEach(function (k) {
    uit.push({soort: "kaart", minuut: Number(k.minuut) || 0,
              volgorde: n++, bron: "kaarten", id: k.id, d: k});
  });
  (w && w.wissels || []).forEach(function (s) {
    uit.push({soort: "wissel", minuut: Number(s.minuut) || 0,
              volgorde: n++, bron: "wissels", id: s.id, d: s});
  });
  /* De positiewissels eerst langs de ruil-detectie */
  var plekken = (w && w.posWissels || []).slice();
  var gebruikt = {};
  plekken.forEach(function (a, i) {
    if (gebruikt[i]) return;
    for (var j = i + 1; j < plekken.length; j++) {
      if (gebruikt[j] || !ruilPaar(a, plekken[j])) continue;
      gebruikt[i] = gebruikt[j] = true;
      uit.push({soort: "ruil", minuut: Number(a.minuut) || 0, volgorde: n++,
                bron: "posWissels", id: a.id, tweedeId: plekken[j].id,
                d: a, d2: plekken[j]});
      return;
    }
    gebruikt[i] = true;
    uit.push({soort: "plek", minuut: Number(a.minuut) || 0, volgorde: n++,
              bron: "posWissels", id: a.id, d: a});
  });
  return uit.sort(function (a, b) {
    return (a.minuut - b.minuut) || (a.volgorde - b.volgorde);
  });
}

/* ── De stand ────────────────────────────────────────────────
   De stand volgt uit de doelpunten die je hebt ingevoerd. Maar niet
   iedereen voert elk doelpunt in — je staat langs de lijn en er gaan
   er zes in — dus de ingevulde stand blijft leidend en je kunt hem
   altijd met de hand zetten.

   Wat de app wél doet is het verschil melden. Staat er 6-2 terwijl er
   twee doelpunten zijn ingevoerd, dan weet je dat je nog wat mist. */
function doelpuntenTelling(w) {
  var eigen = 0, tegen = 0;
  (w && w.scorers || []).forEach(function (s) { if (s.eigenTeam) eigen++; else tegen++; });
  return {fch: eigen, teg: tegen};
}
function scoreVerschil(w) {
  var geteld = doelpuntenTelling(w);
  var staat = (w && w.score) || {fch: 0, teg: 0};
  var a = (Number(staat.fch) || 0) - geteld.fch;
  var b = (Number(staat.teg) || 0) - geteld.teg;
  if (!a && !b) return null;
  return {mistEigen: Math.max(0, a), mistTegen: Math.max(0, b),
          teveelEigen: Math.max(0, -a), teveelTegen: Math.max(0, -b)};
}

/* ── Minuten per positie ─────────────────────────────────────
   Wie als middenvelder begint en na een uur linksback wordt, heeft
   zestig minuten op het middenveld gestaan en dertig achterin. Dat is
   iets anders dan "middenvelder" in zijn profiel, en het is precies
   wat je aan het eind van het seizoen wilt kunnen nakijken. */
function minutenPerPositie(spelerId, opstelling, wissels, posWissels, speelduur) {
  var duur = Number(speelduur) || 90;
  var rij = (opstelling || []).filter(function (o) { return o.spelerId === spelerId; })[0];
  if (!rij || (rij.spelStatus || "basis") === "afwezig") return {};
  var lijst = [];
  (wissels || []).forEach(function (s, i) {
    lijst.push({m: Math.max(0, Math.min(duur, Number(s.minuut) || 0)), n: i, w: s});
  });
  (posWissels || []).forEach(function (v, i) {
    lijst.push({m: Math.max(0, Math.min(duur, Number(v.minuut) || 0)), n: 10000 + i, v: v});
  });
  lijst.sort(function (a, b) { return (a.m - b.m) || (a.n - b.n); });

  var op = (rij.spelStatus || "basis") === "basis";
  var plek = rij.positieLabel || "";
  var sinds = op ? 0 : null;
  var uit = {};
  function boek(tot) {
    if (!op || sinds === null) return;
    var sleutel = plek || "?";
    uit[sleutel] = (uit[sleutel] || 0) + Math.max(0, tot - sinds);
  }
  lijst.forEach(function (g) {
    if (g.w) {
      if (g.w.uitId === spelerId && op) { boek(g.m); op = false; sinds = null; }
      else if (g.w.inId === spelerId && !op) {
        op = true; sinds = g.m;
        plek = g.w.naar || plek || "";
      }
    } else if (g.v.spelerId === spelerId) {
      if (op) { boek(g.m); sinds = g.m; }
      plek = g.v.naar || plek;
    }
  });
  boek(duur);
  /* Nul minuten op een plek is geen plek */
  Object.keys(uit).forEach(function (k) { if (!uit[k]) delete uit[k]; });
  return uit;
}
function meestGespeeldePositie(perPositie) {
  var beste = null, meeste = -1;
  Object.keys(perPositie || {}).forEach(function (k) {
    if (perPositie[k] > meeste) { meeste = perPositie[k]; beste = k; }
  });
  return beste;
}

function linieVanSpeler(speler, opstelling) {
  var rij = (opstelling||[]).find(function(o){ return o.spelerId===speler.id; });
  var rol = (rij && rij.positieLabel && POSITIECODE_NAAR_ROL[rij.positieLabel]) || speler.positie;
  var i = ROL_VOLGORDE.indexOf(rol);
  return i < 0 ? 9 : i;
}
function sorteerOpLinie(lijst, opstelling) {
  return lijst.slice().sort(function(a,b){
    var va = linieVanSpeler(a, opstelling), vb = linieVanSpeler(b, opstelling);
    if (va !== vb) return va - vb;
    return (Number(a.rugnummer)||99) - (Number(b.rugnummer)||99);
  });
}

/* Verdeelt spelers over de plekken in een formatie, beste match eerst */
function vulFormatieAutomatisch(posities, spelersLijst) {
  if (!posities || !posities.length || !spelersLijst || !spelersLijst.length) return {};
  var vrij = spelersLijst.slice();
  var uit = {};
  /* keeper eerst, dan achterin naar voren */
  var volgorde = posities.slice().sort(function(a,b){
    var ra = ROL_VOLGORDE.indexOf(POSITIECODE_NAAR_ROL[a.l] || "");
    var rb = ROL_VOLGORDE.indexOf(POSITIECODE_NAAR_ROL[b.l] || "");
    return (ra<0?9:ra) - (rb<0?9:rb);
  });
  volgorde.forEach(function(p){
    if (vrij.length === 0) return;
    var rol = POSITIECODE_NAAR_ROL[p.l];
    var beste = null, besteScore = null;
    vrij.forEach(function(s){
      var score = [positiePassendheid(rol, s.positie), Number(s.rugnummer)||99];
      if (besteScore === null || score[0] < besteScore[0] ||
         (score[0] === besteScore[0] && score[1] < besteScore[1])) {
        beste = s; besteScore = score;
      }
    });
    if (beste) {
      uit[p.id] = beste.id;
      vrij = vrij.filter(function(s){ return s.id !== beste.id; });
    }
  });
  return uit;
}

/* ═══════════════════════════════════════════════════════════
   SPELERSKAART
   Een kaart in de stijl van een voetbalspel, maar met een eigen
   ontwerp en de kleuren van de club — niet die van een uitgever.
   De zes waarden en het eindcijfer komen uit de skills die je
   toch al bijhoudt, dus een nieuw rapport verandert de kaart mee.
═══════════════════════════════════════════════════════════ */

/* Hoe zwaar telt elke categorie mee voor het eindcijfer? Losjes
   gebaseerd op hoe voetbalspellen het doen: een spits wordt niet
   afgerekend op verdedigen, een verdediger niet op afwerken. */
const KAART_WEGING = {
  Keeper:       {keeping:0.75, physical:0.25},
  Verdediger:   {pace:0.14, shooting:0.03, passing:0.14, dribbling:0.10, defending:0.40, physical:0.19},
  Middenvelder: {pace:0.14, shooting:0.18, passing:0.30, dribbling:0.22, defending:0.09, physical:0.07},
  Aanvaller:    {pace:0.22, shooting:0.36, passing:0.14, dribbling:0.22, defending:0.01, physical:0.05}
};
/* Kaartsoorten: hoe hoger het cijfer, hoe mooier de kaart */
const KAART_SOORTEN = [
  {vanaf:85, id:"goud",   label:"Goud",   boven:"#f5d67b", onder:"#c9a227", tekst:"#3a2c05", rand:"#a8871c"},
  {vanaf:70, id:"zilver", label:"Zilver", boven:"#e3e7ec", onder:"#a8b0ba", tekst:"#26303a", rand:"#8d959f"},
  {vanaf:0,  id:"brons",  label:"Brons",  boven:"#e0b088", onder:"#a9713f", tekst:"#33200f", rand:"#8d5c33"}
];
function kaartSoort(cijfer) {
  return KAART_SOORTEN.filter(function(k){ return (cijfer||0) >= k.vanaf; })[0] || KAART_SOORTEN[2];
}
/* De zes vakken op de kaart. Staat er een handmatige waarde in
   `speler.htk`, dan wint die van het cijfer uit de rapporten — zo kun
   je een seizoenskaart of een cadeautje precies maken zoals je wilt. */
function kaartWaarden(speler) {
  var eigen = (speler && speler.htk) || {};
  return fcCategorieen(speler).map(function(cat){
    var uitSkills = fcCategorieWaarde(speler, cat);
    var handmatig = Number(eigen[cat.id]);
    var metHand = !isNaN(handmatig) && handmatig > 0;
    return {
      id: cat.id, kort: cat.kort, label: cat.label,
      waarde: metHand ? Math.max(1, Math.min(99, Math.round(handmatig))) : uitSkills,
      uitSkills: uitSkills,
      handmatig: metHand
    };
  });
}
/* Is er ergens met de hand ingegrepen? */
function kaartHandmatig(speler) {
  return kaartWaarden(speler).some(function(w){ return w.handmatig; });
}
/* Het eindcijfer mag ook met de hand, los van de zes vakken */
function kaartEigenCijfer(speler) {
  var v = Number((speler && speler.htk && speler.htk.totaal));
  return (!isNaN(v) && v > 0) ? Math.max(1, Math.min(99, Math.round(v))) : null;
}
/* Het eindcijfer. Categorieën die nog niet ingevuld zijn tellen niet
   mee, en de weging wordt over de rest verdeeld — anders zakt iemand
   naar 40 alleen omdat je zijn fysiek nog niet hebt beoordeeld. */
function kaartCijfer(speler) {
  var eigen = kaartEigenCijfer(speler);
  if (eigen !== null) return eigen;
  var weging = KAART_WEGING[speler && speler.positie] || KAART_WEGING.Middenvelder;
  var som = 0, gewicht = 0;
  kaartWaarden(speler).forEach(function(w){
    var g = weging[w.id];
    if (!g || w.waarde === null) return;
    som += w.waarde * g; gewicht += g;
  });
  if (!gewicht) return null;
  return Math.max(1, Math.min(99, Math.round(som / gewicht)));
}
/* De afkorting op de kaart: liever de rol uit de opstelling dan
   alleen "Middenvelder". */
function kaartPositie(speler) {
  var kort = {Keeper:"KP", Verdediger:"VD", Middenvelder:"MV", Aanvaller:"AV"};
  return kort[speler && speler.positie] || "SP";
}
function kaartCompleet(speler) {
  var w = kaartWaarden(speler);
  return w.filter(function(x){ return x.waarde !== null; }).length + "/" + w.length;
}
