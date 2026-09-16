/* ══════════════════════════════════════════════════════════════
   DOMEIN: de boetepot
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P3,
   stap 1 van docs/professionaliseringsplan.md). Geen import/export:
   tools/bouw.js plakt dit bestand vóór src/app.jsx aan elkaar (na de
   src/kern/-modules, zie DOMEIN_VOLGORDE in tools/bouw.js), dus
   alles hieronder is nog altijd gewoon top-level function/const in
   dezelfde scope als src/app.jsx. Er verandert dus functioneel
   niets — dit is een verhuizing, geen herschrijving.

   Puur administratie: bijhouden wie wat verschuldigd is en wat er
   betaald is. Er gaat hier geen geld doorheen. Het grootste deel
   vult zichzelf, want de aanleiding staat al in de app: te laat
   komen, niet afmelden, een gele of rode kaart. Bedragen worden in
   hele centen gerekend — met kommagetallen krijg je
   0,1 + 0,2 = 0,30000000000000004 en dan klopt een pot van dertig
   boetes op den duur niet meer.

   Dit bestand hangt af van sleutelVoor() uit src/kern/sleutels.js
   (geladen vóór dit bestand) en van huidigSeizoen() uit src/app.jsx
   zelf (boetepotActief roept hem aan). Dat laatste werkt ondanks de
   plakvolgorde omdat function-declaraties in dezelfde scope pas bij
   aánroep worden opgezocht, niet bij het inladen — en tegen de tijd
   dat boetepotActief() daadwerkelijk draait, is heel app.jsx al
   geparst.

   Wat hier NIET staat, met opzet:
     - BOETES_KEY, BETALINGEN_KEY, laadBoetes, laadBetalingen blijven
       in src/app.jsx. Ze lezen/schrijven rechtstreeks localStorage
       op dezelfde manier als vóór deze verhuizing en horen inhoudelijk
       dichter bij de opslaglaag dan bij de boeteberekening zelf;
     - het React-component BoetepotTab blijft in src/app.jsx — alleen
       de losse rekenfuncties errond zijn verhuisd;
     - laadBoeteTarieven/bewaarBoeteTarieven zijn ONGEWIJZIGD
       meegenomen: ze lezen/schrijven rechtstreeks localStorage. Dat
       is een bewuste bestaande keuze, geen vergeten opschoning.
   ══════════════════════════════════════════════════════════════ */

const BOETETARIEF_KEY = "fch_boetetarieven_v1";

const BOETE_REDENEN = [
  {id:"telaat",      label:"Te laat",        bron:"presentie", status:"telaat",
   standaard:250,  icoon:"fa-solid fa-clock",        kleur:"#84cc16"},
  {id:"geenbericht", label:"Niet afgemeld",  bron:"presentie", status:"geenbericht",
   standaard:500,  icoon:"fa-solid fa-xmark",        kleur:"#991b1b"},
  {id:"geel",        label:"Gele kaart",     bron:"kaart",     kaart:"geel",
   standaard:500,  icoon:"fa-solid fa-square",       kleur:"#eab308"},
  {id:"rood",        label:"Rode kaart",     bron:"kaart",     kaart:"rood",
   standaard:1000, icoon:"fa-solid fa-square",       kleur:"#b3261e"},
  {id:"overig",      label:"Handmatig",      bron:"hand",
   standaard:250,  icoon:"fa-solid fa-pen",          kleur:"#64748b"}
];
function boeteReden(id) {
  return BOETE_REDENEN.filter(function(r){ return r.id===id; })[0] || BOETE_REDENEN[BOETE_REDENEN.length-1];
}
/* Tarieven, eigen redenen, en per seizoen of de pot überhaupt
   geldt. Een boetepot is een afspraak die je maakt, dus hij staat
   standaard uit: pas als je hem voor dit seizoen aanvinkt gaat er
   iets gerekend worden. */
function laadBoeteTarieven() {
  var opgeslagen = {};
  try { var r = localStorage.getItem(sleutelVoor(BOETETARIEF_KEY)); if (r) opgeslagen = JSON.parse(r) || {}; } catch(e) {}
  var uit = {};
  BOETE_REDENEN.forEach(function(reden){
    var eigen = opgeslagen[reden.id] || {};
    uit[reden.id] = {
      bedrag: (typeof eigen.bedrag === "number") ? eigen.bedrag : reden.standaard,
      aan: eigen.aan === false ? false : true
    };
  });
  /* Zelfbedachte redenen: eigen doelpunt, telefoon in de kleedkamer,
     wat jullie ook maar afspreken. */
  uit.eigen = Array.isArray(opgeslagen.eigen) ? opgeslagen.eigen.filter(function(e){
    return e && e.id && typeof e.label === "string";
  }).map(function(e){
    return {id:e.id, label:e.label, bedrag:Number(e.bedrag)||0, aan: e.aan===false ? false : true};
  }) : [];
  /* Per seizoen aan of uit, op de naam zoals die in de instellingen staat */
  uit.seizoenen = (opgeslagen.seizoenen && typeof opgeslagen.seizoenen === "object")
    ? opgeslagen.seizoenen : {};
  return uit;
}
/* Geldt de pot dit seizoen? Zonder vinkje niet. */
function boetepotActief(tarieven, seizoen) {
  if (!tarieven || !tarieven.seizoenen) return false;
  return tarieven.seizoenen[seizoen || huidigSeizoen()] === true;
}

/* Een eigen reden opzoeken; onbekende redenen vallen terug op
   "handmatig", zodat een oude boete leesbaar blijft als je de
   reden later weghaalt. */
function eigenReden(tarieven, id) {
  return ((tarieven && tarieven.eigen) || []).filter(function(e){ return e.id===id; })[0] || null;
}
function boeteRedenLabel(tarieven, regel) {
  var eig = eigenReden(tarieven, regel.reden);
  if (eig) return eig.label;
  return boeteReden(regel.reden).label;
}
function bewaarBoeteTarieven(t) {
  try { localStorage.setItem(sleutelVoor(BOETETARIEF_KEY), JSON.stringify(t)); } catch(e) {}
}

/* ── Geld ── */
function centenNaarTekst(c) {
  var n = Math.round(Number(c) || 0);
  var min = n < 0 ? "-" : "";
  n = Math.abs(n);
  return min + "€ " + Math.floor(n/100) + "," + String(n%100).padStart(2,"0");
}
/* "12,50" of "12.5" of "€ 12,50" wordt 1250 cent */
function tekstNaarCenten(s) {
  var schoon = String(s == null ? "" : s).replace(/[^0-9,.-]/g, "").replace(",", ".");
  var g = parseFloat(schoon);
  if (!isFinite(g)) return 0;
  return Math.round(g * 100);
}

/* ── Alle boetes bij elkaar: automatisch én handmatig ──
   Elke regel krijgt een eigen sleutel, zodat je hem kunt herkennen
   en er niet per ongeluk twee keer dezelfde in de lijst staat. */
function boeteRegels(spelers, wedstrijden, trainingen, activiteiten, handmatig, tarieven, actief) {
  var tar = tarieven || laadBoeteTarieven();
  /* Geldt de pot dit seizoen niet, dan wordt er niets berekend. De
     administratie blijft gewoon staan voor als je hem later aanzet. */
  if (actief === false) return [];
  var bekend = {};
  (spelers||[]).forEach(function(s){ bekend[s.id] = s; });
  var uit = [];

  /* `herkomst` zegt waar een regel vandaan komt: training, activiteit,
     wedstrijd of met de hand ingevoerd. Dat is iets anders dan `reden`
     (te laat, gele kaart) en iets anders dan de `bron` van een
     BOETE_REDEN (presentie, kaart, hand) — vandaar een derde woord.

     Het staat er omdat de boetepot moet kunnen laten zien dát er
     regels uit trainingen komen zonder ze te tonen. Zonder dit veld
     zou je dat uit de sleutel moeten raden ("begint met een t"), en
     dat is precies het soort afspraak dat een halfjaar later stilletjes
     breekt zodra iemand de sleutel anders opbouwt. */
  function voegToe(herkomst, sleutel, spelerId, datum, redenId, bedrag, wat) {
    /* Een gastspeler staat niet in de selectie en krijgt dus ook
       geen boete: hij is hier te gast. */
    if (!bekend[spelerId]) return;
    if (!bedrag) return;
    uit.push({id:sleutel, spelerId:spelerId, datum:datum||"", reden:redenId,
              bedrag:bedrag, wat:wat, automatisch:true, herkomst:herkomst});
  }

  /* Uit de presentielijsten van trainingen en activiteiten */
  function uitLijst(herkomst, soort, id, datum, titel, lijst) {
    (lijst||[]).forEach(function(a){
      BOETE_REDENEN.forEach(function(reden){
        if (reden.bron !== "presentie" || a.status !== reden.status) return;
        if (!tar[reden.id].aan) return;
        voegToe(herkomst, soort+id+"-"+a.spelerId+"-"+reden.id, a.spelerId, datum,
                reden.id, tar[reden.id].bedrag, titel);
      });
    });
  }
  (trainingen||[]).forEach(function(t){
    uitLijst("training", "t", t.id, t.datum, trainingTitel(t), t.aanwezigheid);
  });
  (activiteiten||[]).forEach(function(a){
    uitLijst("activiteit", "a", a.id, a.datum, a.titel, a.aanwezigheid);
  });
  (wedstrijden||[]).forEach(function(w){
    uitLijst("wedstrijd", "w", w.id, w.datum, "vs. "+(w.tegenstander||"tegenstander"), w.aanwezigheid);
    /* En de kaarten uit gespeelde wedstrijden */
    if (w.status !== "gespeeld") return;
    (w.kaarten||[]).forEach(function(k, i){
      BOETE_REDENEN.forEach(function(reden){
        if (reden.bron !== "kaart" || k.type !== reden.kaart) return;
        if (!tar[reden.id].aan) return;
        voegToe("wedstrijd", "k"+w.id+"-"+i+"-"+reden.id, k.spelerId, w.datum, reden.id,
                tar[reden.id].bedrag, "vs. "+(w.tegenstander||"tegenstander"));
      });
    });
  });

  /* De handmatige boetes erachteraan */
  (handmatig||[]).forEach(function(b){
    if (!bekend[b.spelerId]) return;
    uit.push({id:"h"+b.id, spelerId:b.spelerId, datum:b.datum||"", reden:b.reden||"overig",
              bedrag:Number(b.bedrag)||0, wat:b.omschrijving||"", automatisch:false,
              herkomst:"hand", bronId:b.id});
  });

  return uit.sort(function(a,b){ return String(b.datum).localeCompare(String(a.datum)); });
}

/* ── Wat je van de boetelijst te zien krijgt in dit pakket ──
   Zonder de module trainingen mag een boete die uit een
   trainingspresentie komt niet als losse regel in beeld staan: daar
   staan de datum en de naam van die training in, en dat is precies
   het trainingsgegeven dat niet bij Free hoort. Anders neem je één
   maand Coach, legt daarin het seizoen vast, en leest het daarna
   gratis terug via de boetepot.

   Maar — en dit is de hele reden dat deze functie bestaat in plaats
   van dat boeteRegels() zelf de trainingen weglaat — het bedrag
   blijft meetellen. De totalen boven de lijst, de stand per speler
   en het overzicht dat je deelt rekenen over de vólledige lijst.
   Een openstaand bedrag dat zakt op het moment dat je van pakket
   wisselt, leest als "mijn administratie is weg", en dat is erger
   dan wat we hier proberen te voorkomen. Er wordt dus niets
   weggerekend, alleen samengevouwen.

   Wat eruit komt is daarom een splitsing en geen filter: de regels
   die je mag zien, plus hoeveel er zijn samengevouwen en voor welk
   bedrag. Met die twee getallen kan het scherm één vergrendelde
   regel tonen die het verschil tussen de lijst en het totaal
   uitlegt, zonder één datum of één trainingsnaam prijs te geven. */
function boeteRegelsGesplitst(regels) {
  var alle = regels || [];
  if (magModule("trainingen")) return {zichtbaar: alle, verborgen: 0, verborgenBedrag: 0};
  var zichtbaar = [], verborgen = 0, bedrag = 0;
  alle.forEach(function (r) {
    if (r.herkomst === "training") { verborgen++; bedrag += r.bedrag || 0; return; }
    zichtbaar.push(r);
  });
  return {zichtbaar: zichtbaar, verborgen: verborgen, verborgenBedrag: bedrag};
}

/* De stand per speler en van de pot als geheel */
function boeteStand(spelers, regels, betalingen) {
  var perSpeler = {};
  (spelers||[]).forEach(function(s){
    perSpeler[s.id] = {speler:s, verschuldigd:0, betaald:0, open:0, aantal:0};
  });
  (regels||[]).forEach(function(r){
    var p = perSpeler[r.spelerId];
    if (!p) return;
    p.verschuldigd += r.bedrag;
    p.aantal++;
  });
  (betalingen||[]).forEach(function(b){
    var p = perSpeler[b.spelerId];
    if (!p) return;
    p.betaald += Number(b.bedrag) || 0;
  });
  var rijen = Object.keys(perSpeler).map(function(k){
    var p = perSpeler[k];
    p.open = p.verschuldigd - p.betaald;
    return p;
  }).filter(function(p){ return p.verschuldigd > 0 || p.betaald > 0; });

  rijen.sort(function(a,b){
    if (b.open !== a.open) return b.open - a.open;
    return b.verschuldigd - a.verschuldigd;
  });

  var totaal  = rijen.reduce(function(s,p){ return s + p.verschuldigd; }, 0);
  var betaald = rijen.reduce(function(s,p){ return s + p.betaald; }, 0);
  return {rijen:rijen, totaal:totaal, betaald:betaald, open: totaal - betaald};
}

/* Een bericht met wie er nog openstaat */
function deelBoetepot(stand) {
  var open = stand.rijen.filter(function(p){ return p.open > 0; });
  var regels = [
    "💰 *BOETEPOT " + teamNaamVol() + "*",
    "",
    "Totaal: " + centenNaarTekst(stand.totaal),
    "Betaald: " + centenNaarTekst(stand.betaald),
    "Nog openstaand: " + centenNaarTekst(stand.open),
    ""
  ];
  if (!open.length) {
    regels.push("Iedereen heeft betaald. Netjes 👏");
  } else {
    regels.push("*Nog te voldoen*");
    open.forEach(function(p){
      regels.push("• " + p.speler.naam + " — " + centenNaarTekst(p.open));
    });
  }
  regels.push("", ONTWERPER.regel);
  return regels.join("\n");
}
