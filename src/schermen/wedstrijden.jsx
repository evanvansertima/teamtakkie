/* ══════════════════════════════════════════════════════════════
   WEDSTRIJDEN — programma, matchday, spelhervattingen, tactiek,
   toernooien en het wedstrijdcentrum
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 18 september 2026 (P4 stap 8
   van docs/p4-stappenplan.md — "grootste en laatste, risico hoog vooral
   qua omvang"). Geen import/export: tools/bouw.js plakt dit bestand
   (SCHERM_VOLGORDE) als laatste van de acht schermmodules, ná
   opstellingen.jsx en vóór src/app.jsx zelf (dat na deze stap alleen nog
   de schil overhoudt: App, renderPagina, zijGroepen, PAKKETTEN,
   PAGINA_MODULE — zie docs/p4-stappenplan.md §0). Dit is een verhuizing,
   geen herschrijving: dezelfde tekst, dezelfde comments.

   DE 27 MET NAAM GENOEMDE COMPONENTEN
   SpelerKeuzeModal, Kleedkamerbriefje, DoelpuntScherm, TegenDoelpuntModal,
   WisselScherm, UitslagFormulier, ToernooiFormulier, ToernooiDetail,
   ToernooienTab, WedstrijdFormulier, ImportSheet, WedstrijdOpstelling,
   DSMVeldLijnen, DSMLijn, DSMBord, DSMSectie, RollenSectie,
   WedstrijdTactiek, WerkVenster, BewaarMelder, UitleenSectie,
   GastenSectie, TegenstanderSectie, KaartScherm, Wedstrijdcentrum,
   WedstrijdDetail, WedstrijdenModule.

   VEEL MEER MEEVERHUISD DAN DIE 27 NAMEN
   Tussen die 27 componenten stonden 30 niet met naam genoemde, maar
   module-exclusieve hulpstukken (nul treffers in de andere zeven
   schermbestanden, nagerekend met grep): het hele spelhervattingsbord-
   rekenwerk (DSM_SITUATIES, dsmSituatie, DSM_LIJN_SOORTEN, dsmLijnSoort,
   DSM_PIJL, dsmLijnPunten, dsmLijnPijl, dsmLijnMidden, dsmAfstandTotLijn,
   dsmLijnen, DSM_KANTEN, dsmKant, DSM_START, DSM_BREED, DSM_R_SPELER,
   dsmVeldMaten, dsmOmgekeerd, dsmSchermY, dsmNieuwId, dsmStartOpstelling,
   dsmBegrens, dsmSpiegel, dsmBord, dsmIngevuld, dsmNemers), het
   tactiekbord-ideeënbakje (TACTIEK_FASES, TAAK_IDEEEN, taakIdeeen), en
   twee losse hulpjes (vlaggenUitAssistent, WEDSTRIJD_SECTIES).

   NOG EENS 24 STUKS DIE FYSIEK VÓÓR SPELERKEUZEMODAL STONDEN, OOK NIET
   MET NAAM GENOEMD, GEVONDEN BIJ HET NAREKENEN
   Vóór de eerste met naam genoemde component (SpelerKeuzeModal) stond
   nog een heel programma-importeer-gereedschap en wat losse PDF/deel-
   hulpjes, uitsluitend gebruikt door componenten hierboven — nul
   treffers elders, ook nagerekend:
   - Programma importeren (11): NL_MAANDEN, padGetal, alsDatumString,
     ontvouwICS, ontleedICSDatum, ontleedICS, ontleedPlakTekst,
     striplabel, herkenWedstrijd, bouwImportWedstrijden,
     INGEBOUWD_PROGRAMMA — uitsluitend gebruikt door ImportSheet.
   - Delen via WhatsApp (3): deelWedstrijdVooraf, deelWedstrijdUitslag,
     deelVariantenWedstrijd — uitsluitend aangeroepen vanuit
     WedstrijdDetail's deelknop. (whatsappLink, waOpmaak, zonderEmoji,
     berichtUitRegels en DEEL_STREEP blijven in src/app.jsx: die zijn
     ook nodig voor DeelVenster in gedeeld.jsx en voor trainingen.jsx's
     eigen deelfuncties.)
   - PDF-export (2): tekenDSMBord, exporteerWedstrijdplanPDF —
     uitsluitend gebruikt vanuit Wedstrijdcentrum/WedstrijdDetail.
   - Taken en toernooien-opslag (6): TAKEN_KEY, laadTaken,
     STANDAARD_TAKEN, TOERNOOIEN_KEY, laadToernooien, LEEG_TOERNOOI.
   - Eén losse constante: SPEELDUREN (het wedstrijdformulier).

   WEDSTRIJD_ROLLEN, VLAG_ROLLEN, LEEG_WEDSTRIJD EN TEGEN_TENUE — EEN
   ACHTERHAALDE P3-AANNAME GECORRIGEERD
   src/domein/wedstrijden.js (P3, een eerder plan) documenteerde dat
   WEDSTRIJD_ROLLEN, VLAG_ROLLEN, TEGEN_TENUE en LEEG_WEDSTRIJD in
   app.jsx moesten blijven omdat "React-componenten gebruiken die niets
   met dit bestand te maken hebben" — op het moment dat die comment werd
   geschreven, stonden inderdaad nog tientallen componenten verspreid
   door app.jsx. Nu bijna alle acht modules zijn verplaatst, is dat
   nagerekend: alle negen gebruiksplekken van WEDSTRIJD_ROLLEN/
   VLAG_ROLLEN, alle drie van LEEG_WEDSTRIJD en de enige van TEGEN_TENUE
   liggen binnen déze module (RollenSectie, WedstrijdDetail,
   WedstrijdFormulier, WedstrijdenModule, TegenstanderSectie,
   exporteerWedstrijdplanPDF, vlaggenUitAssistent, dsmNemers) — nul
   treffers in de andere schermbestanden. De P3-aanname was dus waar
   toen hij geschreven werd, en is dat niet meer; de comment in
   src/domein/wedstrijden.js is bijgewerkt. Domein-functies die deze vier
   nog aanroepen (rolNaarLabel, vlagAantal e.d. in src/domein/
   wedstrijden.js) blijven gewoon werken: het zijn function-bodies die
   pas bij een gebruikersactie draaien, ruim nadat dit hele bestand
   — inclusief deze module, die na domein/wedstrijden.js wordt geplakt —
   is ingeladen. Zelfde principe als overal elders in dit plan (zie
   docs/p4-stappenplan.md §3).

   KRUISVERWIJZINGEN NAAR AL VERPLAATSTE MODULES (uitgaand)
   Bevestigd vanuit deze kant, precies zoals opstellingen.jsx (stap 7)
   en trainingen.jsx (stap 4) al vanuit hun kant meldden:
   - OpstellingVeld (opstellingen.jsx) ← WedstrijdOpstelling,
     WedstrijdTactiek, TegenstanderSectie (3 aanroepen).
   - TenueStrook (opstellingen.jsx) ← WedstrijdOpstelling.
   - VeldZoomKnoppen (opstellingen.jsx) ← WedstrijdOpstelling.
   - TrainingTekenBord (opstellingen.jsx) ← WedstrijdTactiek.
   - SpelerStatusRaster (trainingen.jsx) ← WedstrijdDetail (de ene plek
     die trainingen.jsx al noemde).
   Alle vijf werken via gedeelde scope (hoisting) — geen aanpassing nodig.

   KRUISVERWIJZINGEN VANUIT AL VERPLAATSTE MODULES (inkomend) — TWEE
   NIEUWE, NIET EERDER GEMELD
   Bij het narekenen bleken twee componenten van déze module op hun
   beurt aangeroepen te worden door modules die al eerder zijn verhuisd:
   - DSMVeldLijnen wordt aangeroepen door clubhuis.jsx's QuizTekenveld
     (de "Betweterige Scheids"-quiz, SpelregelquizTab) om een mini-
     tekenveld met dezelfde spelhervattingslijnen te tonen.
   - WerkVenster wordt aangeroepen door spelers.jsx's RapportTab (2x) —
     WerkVenster zelf wordt 5x binnen WedstrijdDetail gebruikt, dus qua
     verhouding hoort hij hier, net zoals TenueStrook/VeldZoomKnoppen bij
     opstellingen bleven ook al gebruikt wedstrijden ze.
   Beide werken na deze verplaatsing gewoon door via gedeelde scope:
   clubhuis.jsx en spelers.jsx laden weliswaar vóór dit bestand, maar
   function-declaraties hoisten en de daadwerkelijke aanroep gebeurt pas
   bij het renderen, ruim ná het laden van alle scripts.

   TESTDEKKING
   Alle zeven node-testbestanden (boetepot/opheffen/opkomst/pakket/
   seizoen/sync/vulling.test.js) doorzocht op elk symbool dat hier
   naartoe is verplaatst — geen enkele treffer. Geen van de zeven raakt
   deze module; geen testaanpassing nodig bij deze stap.

   VANGNET
   "wedstrijden" (top-scherm), "wedstrijd-tactiek" en
   "wedstrijd-tactiek-tekenbord" in tools/gouden-origineel.js bewaken
   deze module rechtstreeks. Bekende resterende blinde vlek (niet door
   deze stap verholpen): de overige zes WEDSTRIJD_SECTIES binnen
   WedstrijdDetail (Voorbereiding, Spelersrollen, Spelhervattingen,
   Tegenstander, Uitslag, Speelminuten) hebben geen eigen opname — zie
   docs/p4-stappenplan.md §1, stap 8.

   Zie docs/p4-stappenplan.md §1 (stap 8) voor de volledige redenering. */

/* ── PROGRAMMA IMPORTEREN (iCal van voetbal.nl / geplakte tekst) ── */
const NL_MAANDEN = {jan:1,feb:2,mrt:3,maa:3,apr:4,mei:5,jun:6,jul:7,aug:8,sep:9,okt:10,nov:11,dec:12};

function padGetal(n){ return (n<10?"0":"")+n; }
function alsDatumString(j,m,d){ return j+"-"+padGetal(m)+"-"+padGetal(d); }

/* Gevouwen iCal-regels weer aan elkaar plakken (RFC 5545) */
function ontvouwICS(tekst) {
  var regels = String(tekst||"").replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n");
  var uit = [];
  regels.forEach(function(r){
    if (r.length && (r[0]===" " || r[0]==="\t") && uit.length) uit[uit.length-1] += r.slice(1);
    else uit.push(r);
  });
  return uit;
}

function ontleedICSDatum(waarde) {
  var m = String(waarde||"").match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return null;
  var jaar=+m[1], maand=+m[2], dag=+m[3];
  var uur=m[4]?+m[4]:null, min=m[5]?+m[5]:0;
  if (m[7] && uur!==null) {
    // UTC omzetten naar lokale tijd
    var d = new Date(Date.UTC(jaar,maand-1,dag,uur,min));
    return { datum: alsDatumString(d.getFullYear(), d.getMonth()+1, d.getDate()),
             tijd: padGetal(d.getHours())+":"+padGetal(d.getMinutes()) };
  }
  return { datum: alsDatumString(jaar,maand,dag),
           tijd: uur===null ? "" : padGetal(uur)+":"+padGetal(min) };
}

function ontleedICS(tekst) {
  var regels = ontvouwICS(tekst);
  var items = [], huidig = null;
  regels.forEach(function(r){
    if (/^BEGIN:VEVENT/i.test(r)) { huidig = {}; return; }
    if (/^END:VEVENT/i.test(r)) {
      if (huidig && huidig.titel && huidig.datum) items.push(huidig);
      huidig = null; return;
    }
    if (!huidig) return;
    var dp = r.indexOf(":");
    if (dp < 0) return;
    var sleutel = r.slice(0,dp).toUpperCase();
    var waarde = r.slice(dp+1).replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\n/gi,"\n").trim();
    if (sleutel.indexOf("SUMMARY")===0) huidig.titel = waarde;
    else if (sleutel.indexOf("LOCATION")===0) huidig.locatie = waarde;
    else if (sleutel.indexOf("DTSTART")===0) {
      var d = ontleedICSDatum(waarde);
      if (d) { huidig.datum = d.datum; huidig.tijd = d.tijd; }
    }
  });
  return items;
}

/* Losse tekst van een teampagina of e-mail ontleden */
function ontleedPlakTekst(tekst) {
  var items = [];
  String(tekst||"").split(/\n+/).forEach(function(regel){
    var r = regel.trim();
    if (!r) return;

    var datum = null, datumPatroon = null;
    var m = r.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) { datum = alsDatumString(+m[1],+m[2],+m[3]); datumPatroon = m[0]; }
    if (!datum) {
      m = r.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
      if (m) { datum = alsDatumString(+m[3],+m[2],+m[1]); datumPatroon = m[0]; }
    }
    if (!datum) {
      m = r.match(/(\d{1,2})\s+([a-zA-Z]{3})[a-zA-Z]*\.?(\s+(\d{4}))?/);
      if (m && NL_MAANDEN[m[2].toLowerCase()]) {
        var jaar = m[4] ? +m[4] : new Date().getFullYear();
        datum = alsDatumString(jaar, NL_MAANDEN[m[2].toLowerCase()], +m[1]);
        datumPatroon = m[0];
      }
    }
    if (!datum) return;

    var rest = r;
    rest = rest.replace(/^\s*(ma|di|wo|do|vr|za|zo)[a-z]*\.?\s+/i, " ");
    if (datumPatroon) rest = rest.replace(datumPatroon, " ");

    var tijd = "";
    var tm = rest.match(/(\d{1,2})[:.](\d{2})/);
    if (tm) { tijd = padGetal(+tm[1])+":"+tm[2]; rest = rest.replace(tm[0], " "); }

    rest = rest.replace(/\s+/g," ").trim();
    /* alleen splitsen op een streepje mét spaties eromheen, zodat JO19-2 heel blijft */
    var deel = rest.split(/\s+[-–—]\s+/);
    if (deel.length < 2) return;
    var links = deel[0].trim();
    var rechts = deel.slice(1).join(" - ").trim();
    if (!links || !rechts) return;
    items.push({ titel: links+" - "+rechts, datum: datum, tijd: tijd, locatie: "" });
  });
  return items;
}

/* Herken ons eigen team in de titel en bepaal thuis/uit */
/* "Beker: ", "Competitie: " e.d. vooraan weghalen */
function striplabel(s) {
  return String(s||"").replace(/^\s*[A-Za-zÀ-ÿ ]{3,20}:\s*/, "").trim();
}

function herkenWedstrijd(item, clubNaam) {
  var titel = String(item.titel||"").trim();
  var delen = titel.split(/\s+[-–—]\s+/);
  if (delen.length < 2) return null;
  var links = striplabel(delen[0]), rechts = striplabel(delen.slice(1).join(" - "));

  function normaliseer(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,""); }
  var club = normaliseer(clubNaam);
  var l = normaliseer(links), r = normaliseer(rechts);
  var linksIsOns  = club.length>2 && l.indexOf(club)>=0;
  var rechtsIsOns = club.length>2 && r.indexOf(club)>=0;

  if (!linksIsOns && !rechtsIsOns) {
    return { thuis: true, onzeker: true,
             tegenstanderTekst: striplabel(delen[1] ? delen.slice(1).join(" - ") : links) };
  }
  return {
    tegenstanderTekst: striplabel(linksIsOns ? delen.slice(1).join(" - ") : delen[0]),
    thuis: linksIsOns,
    onzeker: false
  };
}

function bouwImportWedstrijden(items, clubNaam, bestaande) {
  var uit = [];
  (items||[]).forEach(function(it){
    var h = herkenWedstrijd(it, clubNaam);
    if (!h) return;
    var dubbel = (bestaande||[]).some(function(w){
      return w.datum===it.datum &&
        String(w.tegenstander||"").toLowerCase().trim() === String(h.tegenstanderTekst||"").toLowerCase().trim();
    });
    uit.push({
      tijdelijkId: it.datum+"|"+h.tegenstanderTekst+"|"+(it.tijd||""),
      tegenstander: h.tegenstanderTekst,
      datum: it.datum,
      tijd: it.tijd||"",
      locatie: it.locatie||"",
      thuis: h.thuis,
      onzeker: h.onzeker,
      dubbel: dubbel
    });
  });
  uit.sort(function(a,b){ return a.datum===b.datum ? (a.tijd<b.tijd?-1:1) : (a.datum<b.datum?-1:1); });
  return uit;
}

/* ── INGEBOUWD PROGRAMMA (overgenomen van voetbal.nl, seizoen 2026/2027) ── */
const INGEBOUWD_PROGRAMMA = [
  {datum:"2026-09-05", tijd:"14:30", tegenstander:"LAC Frisia 1883 O19-4",     thuis:false},
  {datum:"2026-09-12", tijd:"11:00", tegenstander:"SJO DFC O19-1",             thuis:true },
  {datum:"2026-09-19", tijd:"12:30", tegenstander:"Leeuwarder Zwaluwen O19-1", thuis:false},
  {datum:"2026-09-26", tijd:"12:15", tegenstander:"ST Birdaard/VCR O19-1",     thuis:false},
  {datum:"2026-10-03", tijd:"11:00", tegenstander:"SC Berlikum O19-2",         thuis:true }
];

/* ── TEAMTAKEN (wassen, fruit, vlaggen) ── */
/* ── SPELERSROLLEN PER WEDSTRIJD ──────────────────────────
   Wie neemt wat? Los van de opstelling, want de aanvoerder kan
   ook van de bank komen en de assistent staat langs de lijn.
   De rekenfuncties errond (rollenNu, vlagTelling, volgendeVlagger,
   rolInfo, rolPersoon, rollenVanSpeler, rolTelling, laatsteRollen)
   zijn verhuisd naar src/domein/wedstrijden.js (P3 stap 2) — deze
   lijst blijft hier omdat React-componenten verderop in dit bestand
   hem rechtstreeks gebruiken. */
const WEDSTRIJD_ROLLEN = [
  {id:"aanvoerder", label:"Aanvoerder",        kort:"C",   icoon:"fa-solid fa-shield-halved",  kleur:"#d4a017",
   uitleg:"Draagt de band en spreekt namens het team"},
  {id:"hoek-links", label:"Hoekschop links",   kort:"HL",  icoon:"fa-solid fa-flag",           kleur:"#0891b2",
   uitleg:"Neemt de corners vanaf de linkerhoek"},
  {id:"hoek-rechts",label:"Hoekschop rechts",  kort:"HR",  icoon:"fa-solid fa-flag",           kleur:"#7c3aed",
   uitleg:"Neemt de corners vanaf de rechterhoek"},
  /* Hier stonden drie vrije trappen: zestien meter, ver, en kort. In de
     praktijk is het één speler die ze allemaal neemt, en drie rollen
     invullen voor dezelfde man is drie keer hetzelfde werk. Wie het per
     afstand wil verdelen, doet dat op het bord bij Spelhervattingen. */
  {id:"vrije-trap", label:"Vrije trappen",     kort:"VT",  icoon:"fa-solid fa-bullseye",       kleur:"#dc2626",
   uitleg:"Neemt de vrije trappen"},
  {id:"penalty",    label:"Strafschop",        kort:"PEN", icoon:"fa-solid fa-futbol",         kleur:"#2563eb",
   uitleg:"Eerste keuze vanaf elf meter"},
  /* extern: hier mag ook iemand staan die niet in de selectie zit. Een
     vader langs de lijn, een speler van het tweede, de assistent die de
     tegenstander meebrengt. Voor een strafschop slaat dat nergens op,
     voor de vlag is het eerder regel dan uitzondering. */
  {id:"vlag-1",     label:"Vlaggen 1e helft",  kort:"V1",  icoon:"fa-solid fa-flag-checkered", kleur:"#475569",
   uitleg:"Assistent-scheidsrechter voor rust", extern:true},
  {id:"vlag-2",     label:"Vlaggen 2e helft",  kort:"V2",  icoon:"fa-solid fa-flag-checkered", kleur:"#0f766e",
   uitleg:"Assistent-scheidsrechter na rust", extern:true}
];

/* De twee vlaghelften tellen samen, zodat het eerlijk rouleert. Blijft
   hier (i.p.v. mee te verhuizen naar src/domein/wedstrijden.js) omdat
   React-componenten verderop in dit bestand hem rechtstreeks gebruiken. */
const VLAG_ROLLEN = ["vlag-1","vlag-2"];

/* De taken zelf blijven hier (opslag, geen berekening); taakTelling en
   volgendeVoorTaak zitten sinds P3 stap 2 in src/domein/wedstrijden.js. */
const TAKEN_KEY = "fch_taken_v1";
const laadTaken = () => laadJson(TAKEN_KEY);
const STANDAARD_TAKEN = [
  {id:"t-wassen",     naam:"Kleding wassen",   icoon:"fa-solid fa-shirt"},
  {id:"t-fruit",      naam:"Fruit meenemen",   icoon:"fa-solid fa-apple-whole"},
  {id:"t-materiaal",  naam:"Materiaaldienst",  icoon:"fa-solid fa-box-open"},
  {id:"t-kleedkamer", naam:"Kleedkamerdienst", icoon:"fa-solid fa-broom"},
  {id:"t-kantine",    naam:"Kantinedienst",    icoon:"fa-solid fa-mug-hot"},
  {id:"t-ballen",     naam:"Ballen oppompen",  icoon:"fa-solid fa-futbol"}
  /* Vlaggen staat niet meer hier maar bij de spelersrollen, want dat gaat per helft */
];

/* ── TOERNOOIEN ──
   De planner zelf (maakPouleSchema, tijdPlusMinuten, planToernooi,
   toernooiStand) staat sinds P3 stap 2 in src/domein/wedstrijden.js;
   de opslag hieronder blijft hier. */
const TOERNOOIEN_KEY = "fch_toernooien_v1";
const laadToernooien = () => laadJson(TOERNOOIEN_KEY);
const LEEG_TOERNOOI = { id:null, naam:"", datum:"", locatie:"", aantalVelden:2,
  speelduur:15, pauze:5, starttijd:"09:00", teams:[], wedstrijden:[], opgezet:false };

/* ── Hoe lang duurt een wedstrijd ────────────────────────────
   Negentig minuten is een aanname, geen gegeven. De JO19 speelt twee
   keer vijfenveertig, de JO13 twee keer dertig, en een oefenpot duurt
   wat de scheidsrechter zegt.

   De totale duur blijft bewaard zoals hij was — daar rekent alles mee
   — en het aantal helften komt erbij. Daaruit volgt het enige moment
   dat je verder nog wilt weten: wanneer het rust is. Dat is namelijk
   het moment waarop de meeste wissels vallen. */
const SPEELDUREN = [
  {per: 45, helften: 2}, {per: 40, helften: 2}, {per: 35, helften: 2},
  {per: 30, helften: 2}, {per: 25, helften: 2}, {per: 20, helften: 2}
];

/* ── Wedstrijd die nog gespeeld moet worden ── */
function deelWedstrijdVooraf(w, spelers, uitgebreid) {
  var thuisUit = w.thuis ? "thuis" : "uit";
  var telling = dagenTot(w.datum);
  var kop = [
    "⚽ *"+teamNaamVol()+"*",
    DEEL_STREEP,
    "📣 *WEDSTRIJD*" + (telling ? "  ·  "+telling : ""),
    "",
    "🆚 Tegen: *"+(w.tegenstander||"nog onbekend")+"* ("+thuisUit+")",
    w.datum ? "📅 "+datumLang(w.datum) : null,
    w.tijd  ? "⏰ Aanvang: "+w.tijd+" uur" : null
  ];
  if(!uitgebreid) {
    return berichtUitRegels(kop.concat([
      w.locatie ? "📍 "+w.locatie : null,
      "",
      "Tot dan! 💪"
    ]));
  }

  var verzamel = w.tijd ? tijdVerschoven(w.tijd, w.thuis ? -45 : -75) : "";
  var regels = kop.concat([
    verzamel ? "🕔 Verzamelen: "+verzamel+" uur" : null,
    w.locatie ? "📍 "+w.locatie : null
  ]);

  /* Taken */
  var taken = laadTaken();
  var taakLijst = (taken && taken.length ? taken : STANDAARD_TAKEN);
  var taakRegels = [];
  taakLijst.forEach(function(tk){
    var sid = w.taken ? w.taken[tk.id] : null;
    if(!sid) return;
    var sp = (spelers||[]).filter(function(s){ return s.id===sid; })[0];
    if(sp) taakRegels.push("• "+tk.naam+": "+sp.naam);
  });
  if(taakRegels.length) regels = regels.concat(["", "📋 *Taken*"], taakRegels);

  /* Rijschema */
  var ritten = w.rijschema||[];
  if(ritten.length) {
    var rijRegels = ritten.map(function(r){
      var mee = (r.spelerIds||[]).map(function(id){
        var sp = (spelers||[]).filter(function(s){ return s.id===id; })[0];
        return sp ? sp.naam.split(" ")[0] : null;
      }).filter(Boolean);
      var vrij = Math.max(0, (Number(r.plekken)||0) - mee.length);
      return "• "+r.chauffeur+" ("+(mee.length?mee.join(", "):"nog niemand")+")"
        + (vrij>0 ? " – nog "+vrij+" plek"+(vrij===1?"":"ken") : "");
    });
    regels = regels.concat(["", "🚗 *Vervoer*"], rijRegels);
  }

  /* Rollen die het team vooraf moet weten */
  var rolRegels = [];
  ["aanvoerder","penalty","hoek-links","hoek-rechts","vlag-1","vlag-2"].forEach(function(rid){
    var sid = rollenNu(w.rollen)[rid];
    if (!sid) return;
    var sp = (spelers||[]).filter(function(s){ return s.id===sid; })[0];
    if (sp) rolRegels.push("• "+rolInfo(rid).label+": "+sp.naam);
  });
  if (rolRegels.length) regels = regels.concat(["", "🎽 *Rollen*"], rolRegels);

  /* Het wedstrijdplan, als de coach dat heeft ingevuld */
  var tac = w.tactiek || {};
  if (tac.plan && tac.plan.trim()) {
    regels = regels.concat(["", "♟ *Wedstrijdplan*", tac.plan.trim()]);
  }

  /* Wie heeft zich al afgemeld — geen vraag om op te geven */
  var afgemeld = (spelers||[]).filter(function(s){
    return opgaveVanSpeler(w.opgave, s.id)==="nee";
  }).map(function(s){ return s.naam; });
  if(afgemeld.length) regels = regels.concat(["", "❌ *Afgemeld:* "+afgemeld.join(", ")]);
  regels = regels.concat(["", "❗ Kun je niet? Meld je op tijd af."]);

  if(w.notities) regels = regels.concat(["", "📝 "+w.notities]);
  regels = regels.concat(["", "Tot "+(telling==="vandaag"?"zo":"dan")+"! 💪"]);
  return berichtUitRegels(regels);
}

/* ── Wedstrijd die gespeeld is ── */
function deelWedstrijdUitslag(w, spelers, wedstrijden, uitgebreid) {
  var res = resultaat(w);
  var kop = res==="winst" ? "🏆 *GEWONNEN*"
          : res==="verlies" ? "😔 *VERLOREN*"
          : "🤝 *GELIJKSPEL*";
  var links  = w.thuis ? teamNaamVol() : (w.tegenstander||"Tegenstander");
  var rechts = w.thuis ? (w.tegenstander||"Tegenstander") : teamNaamVol();
  var scoreL = w.thuis ? w.score.fch : w.score.teg;
  var scoreR = w.thuis ? w.score.teg : w.score.fch;

  var regels = [
    "⚽ *"+teamNaamVol()+"*",
    DEEL_STREEP,
    kop,
    "",
    links+"  *"+scoreL+" – "+scoreR+"*  "+rechts,
    w.datum ? "📅 "+datumLang(w.datum) : null
  ];

  if(!uitgebreid) {
    var tel = [];
    (w.scorers||[]).filter(function(s){return s.eigenTeam;}).forEach(function(s){
      var r = tel.filter(function(x){ return x.naam===s.naam; })[0];
      if(r) r.n++; else tel.push({naam:s.naam, n:1});
    });
    if(tel.length) regels = regels.concat(["", "⚽ "+tel.map(function(x){
      return x.naam + (x.n>1 ? " ("+x.n+"x)" : "");
    }).join(", ")]);
    return berichtUitRegels(regels.concat(["", "💪 "+teamNaamVol()]));
  }

  /* Doelpunten gegroepeerd per speler, met assist */
  var eigen = (w.scorers||[]).filter(function(s){ return s.eigenTeam; });
  if(eigen.length) {
    var perSpeler = [];
    eigen.forEach(function(sc){
      var rij = perSpeler.filter(function(r){ return r.naam===sc.naam; })[0];
      if(!rij){ rij = {naam:sc.naam, minuten:[], assists:[]}; perSpeler.push(rij); }
      if(sc.minuut) rij.minuten.push(sc.minuut+"'");
      if(sc.assistNaam) rij.assists.push(sc.assistNaam);
    });
    regels = regels.concat(["", "⚽ *Doelpunten*"], perSpeler.map(function(r){
      return "• "+r.naam+(r.minuten.length?"  "+r.minuten.join(", "):"")
        +(r.assists.length?"  (assist: "+r.assists.join(", ")+")":"");
    }));
  }

  /* Kaarten */
  var kaarten = (w.kaarten||[]).filter(function(k){ return k.naam; });
  if(kaarten.length) {
    regels = regels.concat(["", "*Kaarten*"], kaarten.map(function(k){
      var kleur = k.type==="rood" ? "🟥" : "🟨";
      return kleur+" "+k.naam+(k.minuut?"  "+k.minuut+"'":"");
    }));
  }

  /* Man of the match + hoogste cijfers */
  if(w.motm) {
    var m = (spelers||[]).filter(function(s){ return s.id===w.motm; })[0];
    if(m) {
      var c = w.beoordelingen ? w.beoordelingen[w.motm] : null;
      regels = regels.concat(["", "⭐ *Man of the match:* "+m.naam+(c?"  ("+c+")":"")]);
    }
  }

  /* Stand in de competitie */
  var rij = eigenStandRij(wedstrijden);
  if(rij.gespeeld>0) {
    var punten = rij.winst*3+rij.gelijk;
    regels = regels.concat(["", "📊 *Dit seizoen*",
      "• "+rij.gespeeld+" gespeeld · "+rij.winst+"W "+rij.gelijk+"G "+rij.verlies+"V",
      "• "+punten+" punt"+(punten===1?"":"en")+" · doelsaldo "
        +((rij.doelVoor-rij.doelTegen)>0?"+":"")+(rij.doelVoor-rij.doelTegen)
        +" ("+rij.doelVoor+"-"+rij.doelTegen+")"]);
  }

  if(w.notities) regels = regels.concat(["", "📝 "+w.notities]);
  return berichtUitRegels(regels.concat(["", "💪 "+teamNaamVol()]));
}

/* Kant-en-klare variantenlijsten */
function deelVariantenWedstrijd(w, spelers, wedstrijden) {
  if(w.status==="gespeeld") return [
    {id:"lang", label:"Uitgebreid", tekst: deelWedstrijdUitslag(w, spelers, wedstrijden, true)},
    {id:"kort", label:"Kort",       tekst: deelWedstrijdUitslag(w, spelers, wedstrijden, false)}
  ];
  return [
    {id:"lang", label:"Uitgebreid", tekst: deelWedstrijdVooraf(w, spelers, true)},
    {id:"kort", label:"Kort",       tekst: deelWedstrijdVooraf(w, spelers, false)}
  ];
}

/* LEEG_WEDSTRIJD hoorde oorspronkelijk bij de "nieuw seizoen beginnen"-
   sectie in app.jsx, maar wordt uitsluitend gebruikt door
   WedstrijdFormulier en WedstrijdenModule hieronder. */
const LEEG_WEDSTRIJD = { id:null,tegenstander:"",datum:"",tijd:"",locatie:"",thuis:true,status:"gepland",score:{fch:0,teg:0},scorers:[],kaarten:[],opstelling:[],wissels:[],posWissels:[],kleedkamer:{plus:[],min:[]},opgave:[],beoordelingen:{},motm:null,speelduur:90,helften:2,formatie:"4-3-3A",notities:"",rollen:{},dsm:{},gasten:[],soort:"competitie",tegen:null,scheids:"",assistent:"" };

/* TEGEN_TENUE hoorde oorspronkelijk bij de tegenstander-rekenfuncties
   (tegenAnalyse e.a., sinds P3 al in src/domein/wedstrijden.js) maar
   wordt zelf uitsluitend gebruikt door TegenstanderSectie hieronder —
   nul treffers elders, ook niet meer in de spelerskaart of het
   opstellingsveld zoals een oudere comment nog beweerde. */
const TEGEN_TENUE = {shirt:"#b3261e", tekst:"#ffffff", keeper:"#1f2937", keeperTekst:"#ffffff"};

/* ═══════════════════════════════════════════════════════════
   PDF EXPORT FUNCTIES
═══════════════════════════════════════════════════════════ */
/* Eén spelhervattingsbord op papier. Zelfde maatvoering als op het
   scherm, zodat de coach hetzelfde plaatje ziet. */
function tekenDSMBord(doc, wedstrijd, situatie, x0, y0, breed, diep) {
  var b = dsmBord(wedstrijd, situatie.id);
  var v = dsmVeldMaten();
  var omgekeerd = dsmOmgekeerd(situatie);
  var sx = breed / DSM_BREED, sy = diep / DSM_DIEP;
  function px(x) { return x0 + x * sx; }
  /* Dezelfde spiegeling als op het scherm: bij een tegen-situatie
     staat ons doel onderaan. */
  function py(y) { return y0 + (omgekeerd ? DSM_DIEP - y : y) * sy; }

  /* Gras */
  doc.setFillColor(38,110,45);
  doc.roundedRect(x0, y0, breed, diep, 1.5, 1.5, "F");
  doc.setFillColor(44,122,51);
  for (var i = 1; i < 6; i += 2) {
    doc.rect(x0, y0 + i * diep/6, breed, diep/6, "F");
  }

  /* Lijnen, uit dezelfde maten als op het scherm. Rechthoeken worden
     vanaf de bovenrand getekend, dus bij een gespiegeld veld ligt hun
     hoekpunt aan de andere kant van het vlak. */
  function rechthoek(x, y, w, hoog) {
    doc.rect(px(x), omgekeerd ? py(y + hoog) : py(y), w * sx, hoog * sy);
  }
  doc.setDrawColor(255,255,255); doc.setLineWidth(0.22);
  rechthoek(v.rand, v.rand, v.breed, v.diep);
  rechthoek(v.mid - v.zestienB/2, v.rand, v.zestienB, v.zestienD);
  rechthoek(v.mid - v.vijfB/2,    v.rand, v.vijfB,    v.vijfD);
  doc.setFillColor(255,255,255);
  doc.rect(px(v.mid - v.doelB/2), omgekeerd ? py(v.rand) : py(v.rand-1.3),
           v.doelB * sx, 1.3 * sy, "F");
  doc.circle(px(v.mid), py(v.stipY), 0.28, "F");

  /* De halve maan als reeks korte lijntjes; jsPDF kent geen boog.
     De hoek wordt vanaf de horizontale as gemeten: op de zestienlijn
     ligt de stip 5,5 m verwijderd, dus daar geldt sin(hoek)=5,5/9,15.
     De boog loopt van linksboven, via het diepste punt, naar rechts. */
  doc.setDrawColor(255,255,255); doc.setLineWidth(0.22);
  var hoekEind = Math.asin(5.5/9.15);
  var vorigeX = null, vorigeY = null;
  for (var t = 0; t <= 24; t++) {
    var hoek = (Math.PI - hoekEind) + (t/24) * (hoekEind - (Math.PI - hoekEind));
    var bx = v.mid + Math.cos(hoek) * v.rx;
    var by = v.stipY + Math.sin(hoek) * v.ry;
    if (vorigeX !== null) doc.line(px(vorigeX), py(vorigeY), px(bx), py(by));
    vorigeX = bx; vorigeY = by;
  }

  /* De lijnen, uit precies dezelfde puntenberekening als op het scherm */
  (b.lijnen||[]).forEach(function(l){
    var soort = dsmLijnSoort(l.type);
    var pnt = dsmLijnPunten(l);
    var streep = soort.streep && doc.setLineDashPattern;
    /* Als één pad tekenen en niet als losse streepjes: bij een boog of
       een golf laat elk knikje anders een hapje uit de lijn vallen,
       omdat losse lijnstukken recht afgeknipte koppen hebben. */
    var deltas = [];
    for (var i = 1; i < pnt.length; i++) {
      deltas.push([px(pnt[i][0]) - px(pnt[i-1][0]), py(pnt[i][1]) - py(pnt[i-1][1])]);
    }
    if (doc.setLineJoin) doc.setLineJoin("round");
    if (doc.setLineCap)  doc.setLineCap("round");
    /* Donkere onderlaag, net als op het scherm: wit op lichtgroen
       gras leest anders slecht. */
    doc.setDrawColor(20, 34, 20);
    doc.setLineWidth(soort.dik ? 0.85 : 0.72);
    if (doc.lines) doc.lines(deltas, px(pnt[0][0]), py(pnt[0][1]), [1,1], "S", false);
    if (streep) doc.setLineDashPattern([1.4, 0.9], 0);
    doc.setDrawColor(255,255,255);
    doc.setLineWidth(soort.dik ? 0.55 : 0.42);
    if (doc.lines) doc.lines(deltas, px(pnt[0][0]), py(pnt[0][1]), [1,1], "S", false);
    if (streep) doc.setLineDashPattern([], 0);
    if (doc.setLineCap)  doc.setLineCap("butt");
    if (doc.setLineJoin) doc.setLineJoin("miter");
    var pijl = dsmLijnPijl(pnt);
    doc.setFillColor(255,255,255);
    if (doc.triangle) {
      doc.triangle(px(pijl[0][0]), py(pijl[0][1]), px(pijl[1][0]), py(pijl[1][1]),
                   px(pijl[2][0]), py(pijl[2][1]), "F");
    }
    if (l.nummer) {
      var mid = dsmLijnMidden(pnt);
      doc.setFillColor(20,24,31);
      doc.circle(px(mid.x), py(mid.y), 1.5, "F");
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold"); doc.setFontSize(3.6);
      doc.text(String(l.nummer), px(mid.x), py(mid.y) + 0.55, {align:"center"});
    }
  });

  /* De stukken */
  (b.stukken||[]).forEach(function(st){
    var k = dsmKant(st.kant);
    var bal = st.kant === "bal";
    var r = (bal ? DSM_R_BAL : DSM_R_SPELER) * sx;
    var rgb = hexNaarRgb(k.kleur);
    doc.setFillColor(0,0,0);
    doc.circle(px(st.x), py(st.y) + 0.22, r, "F");
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.setDrawColor(bal ? 17 : 255, bal ? 17 : 255, bal ? 17 : 255);
    doc.setLineWidth(0.18);
    doc.circle(px(st.x), py(st.y), r, "FD");
    if (!bal && st.nummer) {
      var op = hexNaarRgb(k.op);
      doc.setTextColor(op[0], op[1], op[2]);
      doc.setFont("helvetica","bold"); doc.setFontSize(4);
      doc.text(String(st.nummer), px(st.x), py(st.y) + 0.6, {align:"center"});
    }
    if (st.naam) {
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold"); doc.setFontSize(3.8);
      doc.text(String(st.naam), px(st.x), py(st.y) + r + 1.9, {align:"center"});
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   WEDSTRIJDPLAN ALS PDF
   Opstelling, spelersrollen en tactiek in één document, zodat
   je het als geheel kunt uitdraaien of delen.
═══════════════════════════════════════════════════════════ */
function exporteerWedstrijdplanPDF(wedstrijd, spelers, deelIpvOpslaan, alleWedstrijden) {
  /* Voor de eerdere ontmoetingen. Wordt hij niet meegegeven, dan
     halen we ze zelf op. */
  var alleWedstrijdenVoorPlan = alleWedstrijden || (typeof laadWedstrijden === "function" ? laadWedstrijden() : []);
  if (!window.jspdf) { meldFout("PDF-bibliotheek nog niet geladen. Probeer het zo nog eens."); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({orientation:"portrait", unit:"mm", format:"a4"});
  var W = 210, H = 297, M = 15;
  var y = 0;

  function spelerVan(id) { return (spelers||[]).filter(function(s){ return s.id===id; })[0] || null; }
  function ruimte(nodig) {
    if (y + nodig > H - 20) { doc.addPage(); y = M; return true; }
    return false;
  }
  function sectiekop(tekst, kleur) {
    ruimte(16);
    doc.setFillColor.apply(doc, kleur || [0,74,173]);
    doc.rect(M, y, 2.2, 7, "F");
    doc.setFont("helvetica","bold"); doc.setFontSize(10.5);
    doc.setTextColor(20,24,31);
    doc.text(String(tekst).toUpperCase(), M + 6, y + 5.2);
    y += 11;
  }
  function tekstblok(titel, tekst, accent) {
    if (!tekst || !String(tekst).trim()) return;
    var regels = doc.splitTextToSize(String(tekst).trim(), W - 2*M - 8);
    var hoogte = regels.length * 4.5 + (titel ? 11 : 6);
    ruimte(hoogte + 4);
    doc.setFillColor(accent ? 255 : 246, accent ? 248 : 248, accent ? 236 : 251);
    doc.roundedRect(M, y, W - 2*M, hoogte, 2, 2, "F");
    doc.setFillColor.apply(doc, accent ? [253,126,20] : [0,74,173]);
    doc.rect(M, y, 1.6, hoogte, "F");
    var ty = y + 6;
    if (titel) {
      doc.setFont("helvetica","bold"); doc.setFontSize(8);
      doc.setTextColor.apply(doc, accent ? [140,70,10] : [0,58,138]);
      doc.text(String(titel).toUpperCase(), M + 6, ty);
      ty += 5.5;
    }
    doc.setFont("helvetica","normal"); doc.setFontSize(9.5);
    doc.setTextColor(35,40,50);
    doc.text(regels, M + 6, ty);
    y += hoogte + 5;
  }

  /* ── Kopbalk ── */
  doc.setFillColor(6,47,110);
  doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(56,182,255);
  doc.rect(0, 28, W, 2, "F");
  var tx = pdfWapen(doc, M, 6, 17);
  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
  doc.text("WEDSTRIJDPLAN", tx, 11);
  doc.setFontSize(15);
  var links  = wedstrijd.thuis ? teamNaamVol() : (wedstrijd.tegenstander || "Tegenstander");
  var rechts = wedstrijd.thuis ? (wedstrijd.tegenstander || "Tegenstander") : teamNaamVol();
  doc.text(links + "  –  " + rechts, tx, 19);
  doc.setFont("helvetica","normal"); doc.setFontSize(9);
  doc.setTextColor(180,212,244);
  var meta = [];
  if (wedstrijd.datum) meta.push(datumLang(wedstrijd.datum));
  if (wedstrijd.tijd) meta.push(wedstrijd.tijd + " uur");
  meta.push(wedstrijd.thuis ? "Thuis" : "Uit");
  if (wedstrijd.locatie) meta.push(wedstrijd.locatie);
  doc.text(meta.join("   ·   "), tx, 25.5);
  y = 38;

  /* ── Opstelling: veld links, lijst rechts ── */
  var posities = FORMATIES_DATA[wedstrijd.formatie] || FORMATIES_DATA["4-3-3A"];
  var opstelling = wedstrijd.opstelling || [];
  var toewijzing = {};
  posities.forEach(function(p){
    var rij = opstelling.filter(function(o){
      return o.positieId===p.id && (o.spelStatus||"basis")==="basis";
    })[0];
    var sp = rij ? spelerVan(rij.spelerId) : null;
    if (sp) toewijzing[p.id] = sp;
  });

  var veldB = 88, veldH = 0;
  try {
    var canvas = maakOpstellingCanvas("vs. " + (wedstrijd.tegenstander || "tegenstander"),
                                       wedstrijd.formatie || "4-3-3A", toewijzing,
                                       Object.assign({}, laadTenue(),
                                         {keuze: tenueVanWedstrijd(wedstrijd)}));
    veldH = veldB * canvas.height / canvas.width;
    doc.addImage(canvas.toDataURL("image/png"), "PNG", M, y, veldB, veldH);
  } catch (e) { veldH = 0; }

  /* Lijst naast het veld */
  var lx = M + veldB + 8, lb = W - lx - M, ly = y;
  doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.setTextColor(0,58,138);
  doc.text("BASIS  ·  " + wedstrijd.formatie, lx, ly + 3);
  ly += 8;
  /* Welk tenue er aan gaat: dat wil je op papier hebben staan als je
     het plan meeneemt naar de kleedkamer. */
  (function(){
    var tk = tenueVanWedstrijd(wedstrijd);
    var soort = TENUE_SOORTEN.filter(function(s){ return s.id === tk; })[0];
    var veld = tenueVoor(laadTenue(), tk, false);
    var keep = tenueVoor(laadTenue(), tk, true);
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
    doc.setTextColor(90, 98, 110);
    doc.text("TENUE", lx, ly);
    [[veld.shirt, (soort ? soort.kort : tk)], [keep.shirt, "keeper"]].forEach(function(k, i){
      var kl = String(k[0] || "#000000").replace("#", "");
      doc.setFillColor(parseInt(kl.slice(0,2),16) || 0,
                       parseInt(kl.slice(2,4),16) || 0,
                       parseInt(kl.slice(4,6),16) || 0);
      doc.setDrawColor(190, 196, 204);
      var px = lx + 17 + i * 26;
      doc.roundedRect(px, ly - 2.6, 3.6, 3.6, 0.7, 0.7, "FD");
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5);
      doc.setTextColor(70, 78, 90);
      doc.text(k[1], px + 5, ly);
    });
    ly += 7;
  })();
  doc.setFontSize(8.5);
  var aanvoerderId = rollenNu(wedstrijd.rollen).aanvoerder;
  posities.forEach(function(p){
    var sp = toewijzing[p.id];
    doc.setFillColor(235,240,246);
    doc.roundedRect(lx, ly - 3.4, 9, 5, 1, 1, "F");
    doc.setFont("helvetica","bold"); doc.setTextColor(0,74,173);
    doc.text(String(p.l || ""), lx + 4.5, ly, {align:"center"});
    doc.setFont("helvetica", sp ? "normal" : "italic");
    doc.setTextColor(sp ? 30 : 150, sp ? 34 : 155, sp ? 42 : 165);
    var naam = sp ? ((sp.rugnummer ? sp.rugnummer + "  " : "") + sp.naam) : "nog leeg";
    if (sp && aanvoerderId && sp.id===aanvoerderId) naam += "  (C)";
    if (sp && sp.gast) naam += "  (gast)";
    doc.text(doc.splitTextToSize(naam, lb - 12)[0], lx + 11.5, ly);
    ly += 6.1;
  });

  var bank = opstelling.filter(function(o){ return (o.spelStatus||"basis")==="wissel"; });
  if (bank.length) {
    ly += 3;
    doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.setTextColor(0,58,138);
    doc.text("WISSELS", lx, ly); ly += 6;
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.setTextColor(30,34,42);
    bank.forEach(function(o){
      var sp = spelerVan(o.spelerId);
      if (!sp) return;
      doc.text(doc.splitTextToSize((sp.rugnummer ? sp.rugnummer + "  " : "") + sp.naam
        + (sp.gast ? "  (gast)" : ""), lb)[0], lx, ly);
      ly += 5.4;
    });
  }
  y = Math.max(y + veldH, ly) + 8;

  /* ── Spelersrollen ── */
  var rollen = rollenNu(wedstrijd.rollen);
  var metRol = WEDSTRIJD_ROLLEN.filter(function(r){ return rollen[r.id] && spelerVan(rollen[r.id]); });
  if (metRol.length) {
    sectiekop("Spelersrollen", [124,58,237]);
    var kb = (W - 2*M - 6) / 2;
    metRol.forEach(function(rol, i){
      var kol = i % 2, rij = Math.floor(i / 2);
      if (kol === 0) ruimte(11);
      var bx = M + kol * (kb + 6), by = y;
      doc.setFillColor(246,247,251);
      doc.roundedRect(bx, by, kb, 9.5, 1.6, 1.6, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(7);
      doc.setTextColor(110,116,128);
      doc.text(rol.label.toUpperCase(), bx + 4, by + 3.9);
      doc.setFont("helvetica","bold"); doc.setFontSize(9);
      doc.setTextColor(20,24,31);
      doc.text(doc.splitTextToSize(spelerVan(rollen[rol.id]).naam, kb - 8)[0], bx + 4, by + 8);
      if (kol === 1 || i === metRol.length - 1) y += 12;
    });
    y += 3;
  }

  /* ── Teamtaken ── */
  var taken = laadTaken();
  var taakLijst = (taken && taken.length) ? taken : STANDAARD_TAKEN;
  var metTaak = taakLijst.filter(function(t){
    var id = (wedstrijd.taken||{})[t.id];
    return id && spelerVan(id);
  });
  if (metTaak.length) {
    sectiekop("Teamtaken", [101,163,13]);
    doc.setFont("helvetica","normal"); doc.setFontSize(9.5);
    doc.setTextColor(35,40,50);
    metTaak.forEach(function(t){
      ruimte(6);
      doc.text("•  " + t.naam + ":  " + spelerVan(wedstrijd.taken[t.id]).naam, M + 2, y);
      y += 5.6;
    });
    y += 4;
  }

  /* ── Tactiek ── */
  var tac = wedstrijd.tactiek || {};
  var heeftTactiek = TACTIEK_FASES.some(function(f){ return tac[f.id] && String(tac[f.id]).trim(); }) || tac.tekening;
  var instructies = wedstrijd.instructies || {};
  var metOpdracht = (spelers||[]).filter(function(s){
    var t = instructies[s.id] || {};
    return (t.aanval||"").trim() || (t.verdediging||"").trim();
  });

  if (heeftTactiek || metOpdracht.length) {
    if (y > H - 70) { doc.addPage(); y = M; }
    sectiekop("Tactiek", [220,38,38]);
    TACTIEK_FASES.forEach(function(f){
      tekstblok(f.label, tac[f.id], f.id !== "plan");
    });

    if (tac.tekening) {
      try {
        var tc = maakTekeningCanvas(tac.tekening);
        var tb = W - 2*M, th = tb * tc.height / tc.width;
        if (th > 105) { th = 105; tb = th * tc.width / tc.height; }
        ruimte(th + 8);
        doc.setFillColor(20,85,20);
        doc.roundedRect(M + (W - 2*M - tb)/2 - 1.5, y - 1.5, tb + 3, th + 3, 2, 2, "F");
        doc.addImage(tc.toDataURL("image/png"), "PNG", M + (W - 2*M - tb)/2, y, tb, th);
        y += th + 8;
      } catch (e) {}
    }

    if (metOpdracht.length) {
      sectiekop("Opdracht per speler", [253,126,20]);
      sorteerOpLinie(metOpdracht, opstelling).forEach(function(s){
        var t = instructies[s.id] || {};
        var aR = t.aanval ? doc.splitTextToSize("Aanvallend:  " + t.aanval, W - 2*M - 46) : [];
        var vR = t.verdediging ? doc.splitTextToSize("Verdedigend:  " + t.verdediging, W - 2*M - 46) : [];
        var hoogte = Math.max(9, (aR.length + vR.length) * 4.4 + 4);
        ruimte(hoogte + 3);
        doc.setFillColor(248,249,252);
        doc.roundedRect(M, y, W - 2*M, hoogte, 1.6, 1.6, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(9);
        doc.setTextColor(20,24,31);
        doc.text(doc.splitTextToSize((s.rugnummer ? s.rugnummer + "  " : "") + s.naam, 38)[0], M + 4, y + 5.6);
        var oy = y + 5.6;
        doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
        if (aR.length) {
          doc.setTextColor(15,110,86);
          doc.text(aR, M + 44, oy); oy += aR.length * 4.4;
        }
        if (vR.length) {
          doc.setTextColor(163,45,45);
          doc.text(vR, M + 44, oy);
        }
        y += hoogte + 3;
      });
    }
  }

  /* ── Tegenstander ── */
  var teg = tegenAnalyse(wedstrijd);
  if (tegenIngevuld(wedstrijd) > 0) {
    sectiekop("Tegenstander", [179,38,30]);
    var tegPlekken = FORMATIES_DATA[teg.formatie] || FORMATIES_DATA["4-3-3A"];
    var tegNamen = tegPlekken.map(function(pl){
      var s = teg.spelers[pl.id];
      if (!s) return null;
      var stuk = ((s.nummer||"").trim() ? s.nummer + "  " : "") + (s.naam||"").trim();
      return stuk.trim() ? pl.l + ": " + stuk.trim() : null;
    }).filter(Boolean);

    ruimte(12);
    doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.setTextColor(20,24,31);
    doc.text("Opstelling  " + teg.formatie, M, y);
    y += 5;
    if (tegNamen.length) {
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
      doc.setTextColor(60,66,76);
      var tegRegels = doc.splitTextToSize(tegNamen.join("     ·     "), W - 2*M);
      ruimte(tegRegels.length * 4.4 + 3);
      doc.text(tegRegels, M, y);
      y += tegRegels.length * 4.4 + 3;
    } else {
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
      doc.setTextColor(120,126,136);
      doc.text("Namen nog niet ingevuld", M, y);
      y += 6;
    }

    if ((teg.uitgelicht||[]).length) {
      ruimte(10);
      doc.setFont("helvetica","bold"); doc.setFontSize(9);
      doc.setTextColor(20,24,31);
      doc.text("Op wie letten we", M, y);
      y += 5;
      teg.uitgelicht.forEach(function(u){
        var kop = ((u.nummer||"").trim() ? u.nummer + "  " : "") + (u.naam||"").trim();
        if (!kop.trim() && !(u.waarom||"").trim()) return;
        var tekst = doc.splitTextToSize((u.waarom||"").trim(), W - 2*M - 42);
        var hoog = Math.max(8, tekst.length * 4.2 + 3.5);
        ruimte(hoog + 2);
        doc.setFillColor(253,242,242);
        doc.roundedRect(M, y, W - 2*M, hoog, 1.6, 1.6, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
        doc.setTextColor(163,45,45);
        doc.text(doc.splitTextToSize(kop.trim() || "speler", 36)[0], M + 4, y + 5.2);
        doc.setFont("helvetica","normal");
        doc.setTextColor(60,66,76);
        if (tekst.length) doc.text(tekst, M + 42, y + 5.2);
        y += hoog + 2;
      });
    }

    [["Sterk", teg.sterk], ["Zwak", teg.zwak], ["Onze afspraken", teg.afspraken]].forEach(function(paar){
      if (paar[1] && String(paar[1]).trim()) tekstblok(paar[0], paar[1]);
    });

    var tegEerder = eerdereOntmoetingen(alleWedstrijdenVoorPlan, wedstrijd.tegenstander, wedstrijd.id);
    if (tegEerder.length) {
      ruimte(10);
      doc.setFont("helvetica","bold"); doc.setFontSize(9);
      doc.setTextColor(20,24,31);
      doc.text("Eerdere ontmoetingen", M, y);
      y += 5;
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
      doc.setTextColor(60,66,76);
      tegEerder.slice(0, 6).forEach(function(w2){
        ruimte(5);
        doc.text(datumLang(w2.datum) + "   " + (w2.thuis ? "thuis" : "uit") +
                 "   " + uitslagTekst(w2), M + 2, y);
        y += 4.6;
      });
      y += 2;
    }
  }

  /* ── Dode spelmomenten: twee borden naast elkaar per rij ── */
  var dsmVol = DSM_SITUATIES.filter(function(sit){
    var b = dsmBord(wedstrijd, sit.id);
    return b.stukken.length > 0 || b.lijnen.length > 0 || b.notitie.trim();
  });
  if (dsmVol.length) {
    doc.addPage(); y = M;
    sectiekop("Spelhervattingen", [8,145,178]);
    var bordB = (W - 2*M - 8) / 2;
    var bordH = bordB * DSM_DIEP / DSM_BREED;

    /* De onderkant van de rij bijhouden, want links en rechts kunnen
       verschillend lange afspraken hebben. Zonder dit zou een korte
       rechterkolom de volgende rij over de linker heen schuiven. */
    var rijOnder = y;
    dsmVol.forEach(function(sit, i){
      var links = i % 2 === 0;
      if (links) {
        if (i > 0) y = rijOnder + 6;
        /* Past het paar nog op deze bladzijde? */
        if (y + bordH + 30 > H - 20) { doc.addPage(); y = M; }
        rijOnder = y;
      }
      var bx = M + (links ? 0 : bordB + 8);
      var by = y;

      /* Titel boven het bord */
      doc.setFont("helvetica","bold"); doc.setFontSize(9.5);
      doc.setTextColor(20,24,31);
      doc.text(sit.label, bx, by + 4);
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.setTextColor(120,126,136);
      doc.text(sit.aanvallend ? "wij vallen aan naar boven" : "ons eigen doel staat onderaan",
               bx, by + 7.6);
      var vy = by + 10;

      tekenDSMBord(doc, wedstrijd, sit, bx, vy, bordB, bordH);

      /* Afspraken eronder */
      var b = dsmBord(wedstrijd, sit.id);
      var ny = vy + bordH + 4;
      if (b.notitie.trim()) {
        doc.setFont("helvetica","normal"); doc.setFontSize(7.8);
        doc.setTextColor(60,66,76);
        var regels = doc.splitTextToSize(b.notitie.trim(), bordB);
        var tonen = regels.slice(0, 6);
        /* Liever eerlijk afkappen dan stilletjes tekst laten verdwijnen */
        if (regels.length > 6) tonen[5] = tonen[5] + " …";
        doc.text(tonen, bx, ny);
        ny += tonen.length * 3.5;
      }
      rijOnder = Math.max(rijOnder, ny);
      if (i === dsmVol.length - 1) y = rijOnder + 6;
    });
  }

  if (wedstrijd.notities && String(wedstrijd.notities).trim()) {
    sectiekop("Notities", [108,117,125]);
    tekstblok(null, wedstrijd.notities);
  }

  /* ── Voettekst op elke pagina ── */
  var pag = doc.getNumberOfPages();
  for (var p = 1; p <= pag; p++) {
    doc.setPage(p);
    pdfVoet(doc, W, H, {marge:M, pagina:p, paginas:pag});
  }

  var bestand = ("wedstrijdplan-" + (wedstrijd.tegenstander || "wedstrijd") + "-" + (wedstrijd.datum || ""))
    .replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-").toLowerCase();

  if (deelIpvOpslaan) {
    try {
      var blob = doc.output("blob");
      deelOfDownload(blob, bestand + ".pdf", teamNaamVol() + " – wedstrijdplan", function(hoe){
        meldGoed(hoe === "gedeeld" ? "Wedstrijdplan gedeeld" : "Opgeslagen als " + bestand + ".pdf in Downloads");
      });
      return;
    } catch (e) { /* valt terug op opslaan */ }
  }
  doc.save(bestand + ".pdf");
  meldGoed("Wedstrijdplan opgeslagen als " + bestand + ".pdf");
}

/* ═══════════════════════════════════════════════════════════
   SPELER SELECTIE MODAL (voor doelpunten / kaarten)
═══════════════════════════════════════════════════════════ */
function SpelerKeuzeModal({ titel, spelers, onKies, onSluiten, plekRol, bezet, rolLabels, uitleg }) {
  const [zoek, setZoek] = useState("");
  const [alleen, setAlleen] = useState(false);

  const bezetMap = bezet || {};
  const q = zoek.toLowerCase();
  let lijst = spelers.filter(function(s){ return s.naam.toLowerCase().indexOf(q) >= 0; });

  if (plekRol) {
    lijst = lijst.map(function(s){
      return {s:s, p:positiePassendheid(plekRol, s.positie), vrij: bezetMap[s.id] ? 1 : 0};
    }).sort(function(a,b){
      if (a.vrij !== b.vrij) return a.vrij - b.vrij;        // nog vrije spelers eerst
      if (a.p !== b.p) return a.p - b.p;                    // dan op passendheid
      return (Number(a.s.rugnummer)||99) - (Number(b.s.rugnummer)||99);
    }).map(function(x){ return x.s; });
    if (alleen) lijst = lijst.filter(function(s){ return positiePassendheid(plekRol, s.positie) === 0; });
  }

  const aantalPassend = plekRol ? spelers.filter(function(s){ return positiePassendheid(plekRol, s.positie)===0; }).length : 0;

  return (
    <div className="modal-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{titel}</div>
        {uitleg && (
          <p style={{textAlign:"center",fontSize:12,color:"var(--grijs-donker)",fontWeight:400,marginBottom:10}}>
            {uitleg}
          </p>
        )}
        {plekRol && (
          <p style={{textAlign:"center",fontSize:12,color:"var(--grijs-donker)",fontWeight:400,marginBottom:10}}>
            {aantalPassend>0
              ? aantalPassend+" "+plekRol.toLowerCase()+(aantalPassend===1?"":"s")+" staan bovenaan"
              : "Geen "+plekRol.toLowerCase()+"s in de selectie"}
          </p>
        )}
        <input className="zoekbalk" placeholder="Zoek speler…" value={zoek}
          onChange={function(e){ setZoek(e.target.value); }} style={{marginBottom:8}} />
        {plekRol && aantalPassend>0 && (
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            <button className="filter-chip"
              style={{borderColor:alleen?"var(--blauw)":"var(--grijs)",background:alleen?"var(--blauw)":"var(--wit)",color:alleen?"var(--op-kleur)":"var(--grijs-donker)"}}
              onClick={function(){ setAlleen(!alleen); }}>
              {"Alleen "+plekRol.toLowerCase()+"s"}
            </button>
          </div>
        )}
        {lijst.map(function(s){
          const staatOp = bezetMap[s.id];
          const past = plekRol ? positiePassendheid(plekRol, s.positie) : null;
          return (
            <div key={s.id} className="speler-keuze-rij" onClick={function(){ onKies(s); }}
              style={{opacity: staatOp ? 0.45 : 1}}>
              <div className="speler-avatar" style={{width:36,height:36,fontSize:13}}>
                {<SpelerBeeld speler={s}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial,sans-serif",fontSize:14}}>{s.naam}</div>
                <div style={{fontSize:12,color:"var(--grijs-donker)"}}>
                  {(s.positie||"Geen positie")}{s.rugnummer ? " · #"+s.rugnummer : ""}
                </div>
              </div>
              {rolLabels && rolLabels[s.id] && (
                <span className="oef-tag" style={{background:"var(--vlak-info)",color:"var(--blauw)"}}>{rolLabels[s.id]}</span>
              )}
              {past===0 && !staatOp && (
                <span className="oef-tag" style={{background:"var(--vlak-succes)",color:"var(--op-succesvlak)"}}>past</span>
              )}
              {staatOp && (
                <span className="oef-tag" style={{background:"var(--grijs)",color:"var(--grijs-donker)"}}>
                  {staatOp===true ? "opgesteld" : "staat op "+staatOp}
                </span>
              )}
            </div>
          );
        })}
        {lijst.length===0 && (
          <div style={{textAlign:"center",padding:"20px",color:"var(--grijs-donker)",fontSize:14}}>Geen spelers gevonden</div>
        )}
        <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:16}} onClick={onSluiten}>Annuleren</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HET KLEEDKAMERBRIEFJE
   ───────────────────────────────────────────────────────────
   Twee lijstjes: wat er goed ging en wat beter moet. Niet omdat een
   app dat nodig heeft, maar omdat je in de rust twee minuten hebt en
   veertien jongens die naar je kijken.

   Daarom: intikken en enter, klaar. Geen menu's, geen categorieën, en
   het staat er ook nog als de wedstrijd voorbij is — want de tweede
   helft bespreek je maandag op de training.
═══════════════════════════════════════════════════════════ */
function Kleedkamerbriefje({ waarde, opWaarde }) {
  const briefje = waarde || {plus:[], min:[]};
  const [nieuwPlus, setNieuwPlus] = useState("");
  const [nieuwMin, setNieuwMin] = useState("");

  function voegToe(vak, tekst, leegmaken) {
    const t = String(tekst || "").trim();
    if (!t) return;
    const uit = Object.assign({}, briefje);
    uit[vak] = (uit[vak] || []).concat([{id: Date.now() + Math.floor(Math.random()*1000), tekst: t, af: false}]);
    opWaarde(uit);
    leegmaken("");
  }
  function wissel(vak, id) {
    const uit = Object.assign({}, briefje);
    uit[vak] = (uit[vak] || []).map(function (r) {
      return r.id === id ? Object.assign({}, r, {af: !r.af}) : r;
    });
    opWaarde(uit);
  }
  function weg(vak, id) {
    const uit = Object.assign({}, briefje);
    uit[vak] = (uit[vak] || []).filter(function (r) { return r.id !== id; });
    opWaarde(uit);
  }

  function vakje(vak, titel, icoon, kleur, waarde, zet, hint) {
    const regels = briefje[vak] || [];
    return (
      <div className={"briefje-vak " + vak}>
        <div className="briefje-kop" style={{color:kleur}}>
          <i className={icoon}/> {titel}
          {regels.length > 0 && <span className="briefje-tel">{regels.length}</span>}
        </div>
        {regels.map(function (r) {
          return (
            <div key={r.id} className={"briefje-regel" + (r.af ? " af" : "")}>
              <button className="briefje-vink" onClick={function(){ wissel(vak, r.id); }}
                title={r.af ? "Toch nog niet besproken" : "Besproken"}>
                <i className={r.af ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}/>
              </button>
              <span>{r.tekst}</span>
              <button className="briefje-weg" onClick={function(){ weg(vak, r.id); }}>{"×"}</button>
            </div>
          );
        })}
        <div className="briefje-nieuw">
          <input value={waarde} placeholder={hint}
            onChange={function(e){ zet(e.target.value); }}
            onKeyDown={function(e){ if (e.key === "Enter") voegToe(vak, waarde, zet); }} />
          <button onClick={function(){ voegToe(vak, waarde, zet); }} title="Toevoegen">
            <i className="fa-solid fa-plus"/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="briefje">
      {vakje("plus", "Goed gedaan", "fa-solid fa-thumbs-up", "var(--succes)",
             nieuwPlus, setNieuwPlus, "Bijv. druk naar voren")}
      {vakje("min", "Beter kunnen", "fa-solid fa-arrow-trend-up", "var(--oranje)",
             nieuwMin, setNieuwMin, "Bijv. restverdediging")}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EEN DOELPUNT
   ───────────────────────────────────────────────────────────
   Drie dingen in één scherm: wanneer, wie, en van wie kreeg hij hem.

   Dat laatste ontbrak. Het veld voor de assist zat al in de gegevens
   en werd al meegeteld in de seizoenstatistieken, maar er was nergens
   een plek om hem in te vullen — dus stond er bij iedereen nul.

   Alleen wie op dat moment op het veld stond kun je kiezen. Dat scheelt
   zoeken en het voorkomt een assist van iemand die op de bank zat.
═══════════════════════════════════════════════════════════ */
function DoelpuntScherm({ spelers, opstelling, wissels, posWissels, wedstrijd,
                          onKlaar, onSluiten }) {
  const [minuut, setMinuut] = useState("");
  const [scorer, setScorer] = useState(null);
  const duur = wedstrijdDuur(wedstrijd);

  const min = String(minuut).trim();
  const minGoed = min !== "" && !isNaN(Number(min)) && Number(min) >= 0 && Number(min) <= 130;
  /* Wie stond er op dat moment op het veld? Niet wie er nu staat: je
     vult een doelpunt uit de eerste helft weleens na afloop in. */
  const veld = veldOpstelling(spelers, opstelling, wissels, posWissels)
    .filter(function (v) {
      if (!minGoed) return true;
      return veldStand(opstelling, wissels, posWissels, Number(min)).op[v.id] === true;
    });

  function rond(assist) {
    onKlaar({minuut: min, spelerId: scorer.id, naam: scorer.naam,
             assist: assist ? assist.id : null,
             assistNaam: assist ? assist.naam : ""});
  }

  return (
    <div className="modal-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet wissel-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel">{scorer ? "Wie gaf de assist?" : "Doelpunt"}</div>

        {!scorer && (
          <React.Fragment>
            <div className="wissel-minuut">
              <label className="formulier-label" style={{margin:0}}>Minuut</label>
              <GetalVeld min={0} max={130} leeg={null} placeholder="bijv. 55" waarde={minuut}
                opWaarde={function(n){ setMinuut(n === null ? "" : String(n)); }}
                style={{width:84,padding:"9px 12px",border:"2px solid var(--grijs)",borderRadius:10,
                        fontSize:16,fontWeight:800,textAlign:"center",outline:"none",
                        fontFamily:"'Helvetica Neue',Arial,sans-serif"}} />
              {/* De twee minuten die het vaakst voorkomen */}
              {duur.rust && (
                <button className="knop lijn klein"
                  onClick={function(){ setMinuut(String(duur.rust)); }}>rust</button>
              )}
              <button className="knop lijn klein"
                onClick={function(){ setMinuut(String(duur.totaal)); }}>eind</button>
            </div>

            <div className="wissel-kop"><span>Wie scoorde?</span><b>{veld.length}</b></div>
            <div className="wissel-lijst">
              {veld.map(function (v) {
                return (
                  <button key={v.id} className="wissel-speler" disabled={!minGoed}
                    onClick={function(){ setScorer(v); }}>
                    <span className="wissel-plek">{v.plek || "–"}</span>
                    <span className="wissel-nr">{v.rugnummer || ""}</span>
                    <span className="wissel-naam">{v.naam}</span>
                    <i className="fa-solid fa-futbol"/>
                  </button>
                );
              })}
              {!veld.length && <p className="wissel-leeg">Er staat niemand op het veld. Vul eerst de opstelling in.</p>}
            </div>
          </React.Fragment>
        )}

        {scorer && (
          <React.Fragment>
            <div className="doelpunt-vast">
              <i className="fa-solid fa-futbol"/>
              <b>{scorer.naam}</b>
              <span>{min}{"'"}</span>
              <button onClick={function(){ setScorer(null); }}>wijzigen</button>
            </div>
            <div className="wissel-lijst">
              <button className="wissel-in" onClick={function(){ rond(null); }}>
                <span className="wissel-nr"><i className="fa-solid fa-minus"/></span>
                <span className="wissel-naam">Geen assist</span>
              </button>
              {veld.filter(function (v) { return v.id !== scorer.id; }).map(function (v) {
                return (
                  <button key={v.id} className="wissel-in" onClick={function(){ rond(v); }}>
                    <span className="wissel-plek">{v.plek || "–"}</span>
                    <span className="wissel-nr">{v.rugnummer || ""}</span>
                    <span className="wissel-naam">{v.naam}</span>
                    <i className="fa-solid fa-circle-plus wissel-pijl-in"/>
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        )}

        <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:14}}
          onClick={onSluiten}>Annuleren</button>
      </div>
    </div>
  );
}

/* Een doelpunt van de tegenstander. Die spelers staan niet in je
   selectie, dus er valt niets te kiezen — je typt wat je van de
   speaker of van het scorebord opving. Vaak is dat alleen een nummer,
   en soms weet je helemaal niets. Dat mag: de minuut alleen is ook een
   doelpunt. */
function TegenDoelpuntModal({ tegenstander, onKlaar, onSluiten }) {
  const [minuut, setMinuut] = useState("");
  const [nummer, setNummer] = useState("");
  const [naam, setNaam] = useState("");
  function klaar() {
    onKlaar({minuut: String(minuut).trim(), nummer: String(nummer).trim(), naam: naam.trim()});
  }
  return (
    <div className="modal-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet" style={{maxWidth:420}} onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel">Doelpunt tegen</div>
        <div style={{textAlign:"center",marginBottom:14,fontSize:13,
                     color:"var(--grijs-donker)",fontWeight:400}}>
          voor {tegenstander || "de tegenstander"}
        </div>
        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Minuut</label>
            <GetalVeld className="formulier-input" min={0} max={130} leeg={null}
              placeholder="bijv. 31" waarde={minuut}
              opWaarde={function(n){ setMinuut(n === null ? "" : String(n)); }} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Rugnummer</label>
            <input className="formulier-input" value={nummer} placeholder="bijv. 9"
              onChange={function(e){ setNummer(e.target.value); }} />
          </div>
        </div>
        <label className="formulier-label">Naam (als je die hebt)</label>
        <input className="formulier-input" value={naam} autoFocus
          placeholder="Laat leeg als je hem niet weet"
          onChange={function(e){ setNaam(e.target.value); }}
          onKeyDown={function(e){ if(e.key==="Enter") klaar(); }} />
        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={klaar}>
            <i className="fa-solid fa-futbol"/> Toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WISSELEN
   ───────────────────────────────────────────────────────────
   Eén scherm, want je staat langs de lijn en niet achter een bureau.
   Bovenaan de minuut, daaronder het elftal zoals het nu staat: van
   doelman naar spits, met de afkorting, het rugnummer en de naam.

   Tik iemand aan en er klapt één blok open met de twee dingen die je
   op dat moment kunt doen: hem eruit halen voor iemand van de bank, of
   hem op een andere plek zetten zonder dat hij het veld af gaat. Dat
   laatste is geen wissel en telde vroeger nergens; nu wel.

   Wat er niet meer is: prompt(). Een browserpopup waarin je een getal
   moet typen is op een tablet in de regen geen invoerveld maar een
   struikelblok.
═══════════════════════════════════════════════════════════ */
function WisselScherm({ spelers, opstelling, wissels, posWissels, speelduur, helften, beginModus,
                        onWissel, onPositie, onVerwijderWissel, onVerwijderPositie,
                        onSluiten }) {
  const [minuut, setMinuut] = useState("");
  const [gekozen, setGekozen] = useState(null);
  /* Kwam je hier via de knop "Positiewissel", dan begin je ook op dat blok.
     Anders moet je na het kiezen van een speler alsnog omschakelen. */
  const [modus, setModus] = useState(beginModus || "uit");     /* uit | plek */

  const veld = veldOpstelling(spelers, opstelling, wissels, posWissels);
  const opties = wisselOpties(spelers, opstelling, wissels, posWissels);

  const speler = gekozen ? veld.filter(function (v) { return v.id === gekozen; })[0] : null;
  const opPlek = {};
  veld.forEach(function (v) { if (v.plek) opPlek[v.plek] = v; });
  /* Elke plek waar iemand staat, van achter naar voren. Dat is precies
     de formatie van deze wedstrijd — inclusief twee keer centraal
     achterin, ieder met zijn eigen naam. */
  const plekken = Object.keys(opPlek).sort(function (a, b) {
    var v = positieRang(a) - positieRang(b);
    return v !== 0 ? v : (a < b ? -1 : a > b ? 1 : 0);
  });

  /* De minuut is niet verplicht.

     Hij was dat wel, en dat leek logisch: zonder minuut kun je de
     speeltijd niet uitrekenen. Maar het gevolg was dat een trainer die
     zondagavond zijn wedstrijd bijwerkt en niet meer weet of Luuk in de
     20e of de 70e minuut inviel, de wissel dan maar niet invoert — of
     een getal verzint. Allebei erger dan een leeg vakje: in het eerste
     geval mis je de wissel, in het tweede staat er een leugen.

     Dus: leeg mag. De wissel wordt gewoon bewaard, en de speeltijd van
     die twee spelers krijgt een streepje in plaats van een getal. */
  const min = String(minuut).trim();
  const minGeldig = min === "" || (!isNaN(Number(min)) && Number(min) >= 0 && Number(min) <= 130);
  const zonderMinuut = min === "";

  /* De rust valt op de helft van de wedstrijdduur, niet op minuut 45.
     Bij 2 × 40 is dat 40, bij 2 × 35 is het 35. */
  const aantalHelften = Number(helften) || 2;
  const rustMinuut = aantalHelften > 1
    ? String(Math.round((Number(speelduur) || 90) / aantalHelften)) : null;

  function doeWissel(erin) {
    if (!speler || !minGeldig) return;
    onWissel({minuut: min, uitId: speler.id, uitNaam: speler.naam,
              inId: erin.id, inNaam: erin.naam, naar: speler.plek || ""});
    setGekozen(null);
  }
  function doePlek(code) {
    if (!speler || !minGeldig || code === speler.plek) return;
    var bezet = opPlek[code];
    onPositie({minuut: min, spelerId: speler.id, naam: speler.naam,
               van: speler.plek || "", naar: code},
              /* Staat daar al iemand, dan ruilen ze van plek. Dat is wat
                 een trainer bedoelt als hij twee spelers omdraait. */
              bezet && bezet.id !== speler.id
                ? {minuut: min, spelerId: bezet.id, naam: bezet.naam,
                   van: bezet.plek || "", naar: speler.plek || ""}
                : null);
    setGekozen(null);
  }

  const gebeurd = wissels.map(function (w) { return {soort:"wissel", d:w}; })
    .concat((posWissels||[]).map(function (v) { return {soort:"plek", d:v}; }))
    .sort(function (a, b) { return (Number(a.d.minuut)||0) - (Number(b.d.minuut)||0); });

  return (
    <div className="modal-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet wissel-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel">Wisselen</div>

        <div className="wissel-minuut">
          <label className="formulier-label" style={{margin:0}}>Minuut</label>
          <GetalVeld min={0} max={130} leeg={null} placeholder="optioneel" waarde={minuut}
            opWaarde={function(n){ setMinuut(n === null ? "" : String(n)); }}
            style={{width:84,padding:"9px 12px",border:"2px solid var(--grijs)",borderRadius:10,
                    fontSize:16,fontWeight:800,textAlign:"center",outline:"none",
                    fontFamily:"'Helvetica Neue',Arial,sans-serif"}} />
          {rustMinuut && (
            <button className={"knop lijn klein" + (min === rustMinuut ? " aan" : "")}
              title={"Wissel in de rust (minuut " + rustMinuut + ")"}
              onClick={function(){ setMinuut(min === rustMinuut ? "" : rustMinuut); }}>
              Rust
            </button>
          )}
          <span className="wissel-minuut-hint">
            {!minGeldig ? "Dat is geen minuut uit deze wedstrijd."
              : zonderMinuut ? "Zonder minuut geen speeltijd" : ""}
          </span>
        </div>

        <div className="wissel-kop">
          <span>Op het veld</span>
          <b>{veld.length}</b>
        </div>
        <div className="wissel-lijst">
          {veld.map(function (v) {
            const aan = gekozen === v.id;
            return (
              <React.Fragment key={v.id}>
                <button className={"wissel-speler" + (aan ? " aan" : "")}
                  disabled={!minGeldig}
                  onClick={function(){ setGekozen(aan ? null : v.id); setModus(beginModus || "uit"); }}>
                  <span className="wissel-plek">{v.plek || "–"}</span>
                  <span className="wissel-nr">{v.rugnummer || ""}</span>
                  <span className="wissel-naam">{v.naam}</span>
                  <i className={"fa-solid fa-chevron-" + (aan ? "up" : "down")}/>
                </button>

                {aan && (
                  <div className="wissel-keuze">
                    <div className="wissel-tabs">
                      <button className={modus === "uit" ? "aan" : ""}
                        onClick={function(){ setModus("uit"); }}>
                        <i className="fa-solid fa-arrows-rotate"/> Eruit
                      </button>
                      <button className={modus === "plek" ? "aan" : ""}
                        onClick={function(){ setModus("plek"); }}>
                        <i className="fa-solid fa-shuffle"/> Andere plek
                      </button>
                    </div>

                    {modus === "uit" && (
                      <React.Fragment>
                        {opties.bank.length + opties.terug.length +
                         opties.overig.length + opties.afgemeld.length === 0 && (
                          <p className="wissel-leeg">Er is niemand om in te brengen.</p>
                        )}
                        {[["bank", "Op de bank", ""],
                          ["terug", "Er eerder uit gehaald", ""],
                          ["overig", "Niet als wissel opgegeven", " flauw"],
                          ["afgemeld", "Afgemeld voor deze wedstrijd", " flauw"]].map(function (groep) {
                          var lijst = opties[groep[0]];
                          if (!lijst.length) return null;
                          return (
                            <React.Fragment key={groep[0]}>
                              {groep[0] !== "bank" && <div className="wissel-tussenkop">{groep[1]}</div>}
                              {lijst.map(function (b) {
                                return (
                                  <button key={b.id} className={"wissel-in" + groep[2]}
                                    onClick={function(){ doeWissel(b); }}>
                                    <span className="wissel-nr">{b.rugnummer || ""}</span>
                                    <span className="wissel-naam">{b.naam}</span>
                                    {b.eruitMinuut !== null && b.eruitMinuut !== undefined && (
                                      <span className="wissel-terug">
                                        {"eruit in de " + b.eruitMinuut + "e"}
                                      </span>
                                    )}
                                    <i className="fa-solid fa-arrow-up wissel-pijl-in"/>
                                  </button>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    )}

                    {modus === "plek" && (
                      <React.Fragment>
                        <p className="wissel-leeg">
                          {speler && speler.plek
                            ? speler.naam + " staat nu op " + plekNaam(speler.plek) + "."
                            : "Kies waar hij gaat staan."}
                          {" Staat er al iemand, dan ruilen ze."}
                        </p>
                        {/* ── De plekken uit déze opstelling ──
                            Hier stond de algemene lijst van veertien
                            positiecodes. Die kent "CV" maar één keer,
                            terwijl een 4-2-3-1 er twee heeft — je koos dus
                            uit twee identieke knoppen zonder te weten welke
                            je aanwees, en de helft van je formatie stond er
                            niet eens bij.

                            Nu komen de plekken uit de opstelling zelf: wie
                            er staat, staat ergens, en dat "ergens" is een
                            plek waar je naartoe kunt. Wat er niet in deze
                            formatie zit, kun je ook niet kiezen. */}
                        <div className="wissel-plekken">
                          {plekken.map(function (code) {
                            const daar = opPlek[code];
                            const zelf = speler && speler.plek === code;
                            return (
                              <button key={code} disabled={zelf}
                                className={"wissel-plekknop" + (zelf ? " zelf" : "") + (daar && !zelf ? " bezet" : "")}
                                title={plekNaam(code) +
                                       (daar && !zelf ? " \u2014 ruilen met " + daar.naam : "")}
                                onClick={function(){ doePlek(code); }}>
                                <b>{code}</b>
                                <span>{daar ? (daar.naam || "").split(" ")[0] : "vrij"}</span>
                              </button>
                            );
                          })}
                        </div>
                      </React.Fragment>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
          {veld.length === 0 && (
            <p className="wissel-leeg">Er is nog geen opstelling. Vul die eerst in.</p>
          )}
        </div>

        {gebeurd.length > 0 && (
          <React.Fragment>
            <div className="wissel-kop"><span>Wat er is gebeurd</span><b>{gebeurd.length}</b></div>
            {gebeurd.map(function (g) {
              return (
                <div key={g.soort + g.d.id} className="wissel-rij">
                  <div style={{minWidth:32,fontWeight:700,color:"var(--grijs-donker)",fontSize:12,
                               fontFamily:"'Helvetica Neue',Arial"}}>
                    {g.d.minuut ? g.d.minuut + "'" : "–"}
                  </div>
                  <div style={{flex:1}}>
                    {g.soort === "wissel" ? (
                      <React.Fragment>
                        <div><i className="fa-solid fa-arrow-down wissel-pijl-uit"/>{" " + g.d.uitNaam}</div>
                        <div><i className="fa-solid fa-arrow-up wissel-pijl-in"/>{" " + g.d.inNaam}</div>
                      </React.Fragment>
                    ) : (
                      <div><i className="fa-solid fa-shuffle" style={{color:"var(--blauw)",width:14}}/>
                        {" " + g.d.naam + " — " + (g.d.van || "?") + " → " + g.d.naar}</div>
                    )}
                  </div>
                  <button className="event-verwijder" onClick={function(){
                    if (g.soort === "wissel") onVerwijderWissel(g.d.id); else onVerwijderPositie(g.d.id);
                  }}>{"×"}</button>
                </div>
              );
            })}
          </React.Fragment>
        )}

        <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:16}}
          onClick={onSluiten}>Klaar</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   UITSLAG FORMULIER
═══════════════════════════════════════════════════════════ */
function UitslagFormulier({ wedstrijd, spelers, onOpslaan, onSluiten }) {
  const [score,setScore]=useState({fch:wedstrijd.score?.fch||0, teg:wedstrijd.score?.teg||0});
  const [scorers,setScorersList]=useState(wedstrijd.scorers||[]);
  const [kaarten,setKaarten]=useState(wedstrijd.kaarten||[]);
  const [opstelling,setOpstelling]=useState(() => {
    if(wedstrijd.opstelling?.length>0) return wedstrijd.opstelling;
    return spelers.map(s=>({spelerId:s.id,naam:s.naam,foto:s.foto,rugnummer:s.rugnummer,spelStatus:"basis",minuten:90,positie:s.positie}));
  });
  const [wissels,setWissels]=useState(wedstrijd.wissels||[]);
  /* Van plek wisselen is geen wissel: de speler blijft staan. Daarom
     een eigen lijst — anders telt hij mee in de speelminuten en klopt
     er niets meer van. */
  const [posWissels,setPosWissels]=useState(wedstrijd.posWissels||[]);
  const [kleedkamer,setKleedkamer]=useState(wedstrijd.kleedkamer||{plus:[],min:[]});
  const [beoordelingen,setBeoordelingen]=useState(wedstrijd.beoordelingen||{});
  const [motm,setMotm]=useState(wedstrijd.motm||null);
  const [speelduur,setSpeelduur]=useState(wedstrijd.speelduur||90);
  const [helften,setHelften]=useState(wedstrijd.helften||2);
  const [spelersModal,setSpelersModal]=useState(null); // "scorer"|"tegenscorer"|"geel"|"rood"|"wisselen"

  function slaOp() {
    onOpslaan({ ...wedstrijd, score, scorers, kaarten, opstelling, wissels, posWissels,
                kleedkamer, beoordelingen, motm, speelduur, helften, status:"gespeeld" });
  }

  /* De speelminuten volgen uit de wissels en de speelduur, dus die
     worden hier bijgehouden in plaats van op een knop te wachten. Een
     knop die je kunt vergeten levert een opstelling op waarin een
     invaller negentig minuten heeft gespeeld. */
  useEffect(function(){
    setOpstelling(function(rijen){
      var nieuw = berekenMinuten(rijen, wissels, speelduur);
      /* Alleen bijwerken als er echt iets verandert, anders blijft
         React zichzelf opnieuw tekenen. */
      var zelfde = nieuw.length === rijen.length && nieuw.every(function(r, i){
        return r.minuten === rijen[i].minuten;
      });
      return zelfde ? rijen : nieuw;
    });
  }, [wissels, speelduur]);

  /* Wie er op het veld staat, wordt uitgerekend door veldStand: die
     speelt de wedstrijd na op volgorde van de klok. Hier stond
     vroeger een eigen versie die alleen keek óf iemand gewisseld was
     en niet wanneer — daardoor verdween een speler die eruit ging en
     later terugkwam uit het lijstje. Zie de uitleg bij veldStand. */
  const rolLabelKaart = {};
  opstelling.forEach(function(o){
    if (o.positieLabel) rolLabelKaart[o.spelerId] = o.positieLabel;
    else if ((o.spelStatus||"basis")==="wissel") rolLabelKaart[o.spelerId] = "bank";
  });

  /* De twee handelingen die het wisselscherm terugmeldt. Ze staan hier
     en niet daar, omdat de opstelling en de speelminuten hier wonen. */
  function voegWisselToe(w) {
    var nieuw = Object.assign({id: Date.now() + Math.floor(Math.random()*1000)}, w);
    var nieuweWissels = wissels.concat([nieuw]);
    setWissels(nieuweWissels);
    setOpstelling(function(lijst){
      var metStatus = lijst.map(function(o){
        if (o.spelerId===w.inId && (o.spelStatus||"basis")==="afwezig")
          return Object.assign({},o,{spelStatus:"wissel"});
        return o;
      });
      return berekenMinuten(metStatus, nieuweWissels, speelduur);
    });
  }
  function voegPositieToe(a, b) {
    setPosWissels(function (l) {
      var uit = l.concat([Object.assign({id: Date.now() + Math.floor(Math.random()*1000)}, a)]);
      if (b) uit = uit.concat([Object.assign({id: Date.now() + Math.floor(Math.random()*1000) + 1}, b)]);
      return uit;
    });
  }
  function verwijderPositie(id) {
    setPosWissels(function (l) { return l.filter(function (v) { return v.id !== id; }); });
  }

  function verwijderWissel(id) {
    var nieuweWissels = wissels.filter(function(w){return w.id!==id;});
    setWissels(nieuweWissels);
    setOpstelling(function(lijst){ return berekenMinuten(lijst, nieuweWissels, speelduur); });
  }
  function zetCijfer(spelerId, waarde) {
    setBeoordelingen(function(b){
      var nieuw = Object.assign({}, b);
      var g = parseFloat(String(waarde).replace(",","."));
      if (!waarde || isNaN(g)) delete nieuw[spelerId];
      else nieuw[spelerId] = Math.max(1, Math.min(10, g));
      return nieuw;
    });
  }

  function voegScorerToe(d) {
    setScorersList(function (l) {
      return l.concat([{id: Date.now(), spelerId: d.spelerId, naam: d.naam,
                        minuut: d.minuut, eigenTeam: true,
                        assist: d.assist, assistNaam: d.assistNaam}]);
    });
    setScore(function (s) { return Object.assign({}, s, {fch: (s.fch || 0) + 1}); });
    setSpelersModal(null);
  }
  function verwijderScorer(id) {
    setScorersList(function (l) { return l.filter(function (x) { return x.id !== id; }); });
    setScore(function (s) { return Object.assign({}, s, {fch: Math.max(0, (s.fch || 0) - 1)}); });
  }
  /* De tegenstander staat niet in je selectie, dus hier geen spelerId
     maar wat je hebt opgevangen. De score telt vanzelf op. */
  function voegTegenScorerToe(d) {
    setScorersList(function (l) {
      return l.concat([{id: Date.now(), spelerId: null, eigenTeam: false,
                        naam: d.naam || "", nummer: d.nummer || "",
                        minuut: d.minuut || "", assist: null, assistNaam: ""}]);
    });
    setScore(function (s) { return Object.assign({}, s, {teg: (s.teg || 0) + 1}); });
    setSpelersModal(null);
  }
  function verwijderTegenScorer(id) {
    setScorersList(function (l) { return l.filter(function (x) { return x.id !== id; }); });
    setScore(function (s) { return Object.assign({}, s, {teg: Math.max(0, (s.teg || 0) - 1)}); });
  }

  function voegKaartToe(type,speler) {
    const min = prompt("Minuut van kaart? (bijv. 45)", "") || "";
    setKaarten(l=>[...l,{id:Date.now(),spelerId:speler.id,naam:speler.naam,type,minuut:min}]);
    setSpelersModal(null);
  }

  function toggleStatus(spelerId) {
    setOpstelling(l=>l.map(s=>{
      if(s.spelerId!==spelerId) return s;
      const volgorde = ["basis","wissel","afwezig"];
      const huidig = s.spelStatus||"basis";
      const volgend = volgorde[(volgorde.indexOf(huidig)+1)%3];
      const minuten = volgend==="afwezig"?0:volgend==="basis"?90:s.minuten;
      return {...s,spelStatus:volgend,minuten};
    }));
  }
  function zetMinuten(spelerId,val) {
    setOpstelling(l=>l.map(s=>s.spelerId===spelerId?{...s,minuten:Math.max(0,Math.min(120,Number(val)||0))}:s));
  }

  const startElf = opstelling.filter(s=>(s.spelStatus||"basis")==="basis");
  const wisselspelers = opstelling.filter(s=>(s.spelStatus||"basis")==="wissel");
  const afwezig = opstelling.filter(s=>(s.spelStatus||"basis")==="afwezig");

  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">Uitslag invullen</div>
        <div style={{textAlign:"center",marginBottom:4,fontSize:13,color:"var(--grijs-donker)",fontWeight:400}}>vs. {wedstrijd.tegenstander}</div>

        {/* SCORE */}
        <div className="score-invoer">
          {scoreVolgorde(wedstrijd.thuis, inst().clubNaam, wedstrijd.tegenstander)
            .map(function(vak, i){
            return (
              <React.Fragment key={vak.kant}>
                {i > 0 && <div className="score-divider">–</div>}
                <div className="score-blok">
                  <div className="score-team-label" title={vak.naam}>{teamKort(vak.naam)}</div>
                  <div className="score-teller">
                    <button onClick={function(){ setScore(function(s){
                      var n = Object.assign({}, s); n[vak.kant] = Math.max(0, s[vak.kant] - 1); return n; }); }}>−</button>
                    <span>{score[vak.kant]}</span>
                    <button onClick={function(){ setScore(function(s){
                      var n = Object.assign({}, s); n[vak.kant] = s[vak.kant] + 1; return n; }); }}>+</button>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Klopt de stand met wat er is ingevoerd? Niet iedereen voert
            elk doelpunt in, dus dit is een opmerking en geen fout. */}
        {(function () {
          var v = scoreVerschil({score: score, scorers: scorers});
          if (!v) return null;
          var stukken = [];
          if (v.mistEigen)   stukken.push(v.mistEigen + " van ons");
          if (v.mistTegen)   stukken.push(v.mistTegen + " tegen");
          var teveel = [];
          if (v.teveelEigen) teveel.push(v.teveelEigen + " van ons");
          if (v.teveelTegen) teveel.push(v.teveelTegen + " tegen");
          return (
            <div className="melding" style={{marginBottom:12}}>
              <i className="fa-solid fa-circle-info"/>
              <span>
                {stukken.length
                  ? "Bij de stand horen nog " + stukken.join(" en ") + " die je niet hebt ingevoerd."
                  : "Je hebt " + teveel.join(" en ") + " meer ingevoerd dan de stand aangeeft."}
                {" De stand hierboven blijft staan zoals je hem invult."}
              </span>
            </div>
          );
        })()}

        {/* DOELPUNTEN */}
        <div className="formulier-sectie-titel">{<span><i className="fa-solid fa-futbol"/>{" Doelpunten "+inst().clubNaam}</span>}</div>
        {scorers.filter(s=>s.eigenTeam).map(sc=>(
          <div key={sc.id} className="event-rij">
            <span className="event-icoon"><i className="fa-solid fa-futbol"/></span>
            <div className="event-info">
              <div className="event-naam">{sc.naam}</div>
              <div className="event-sub">
                {sc.minuut ? sc.minuut + "'" : ""}
                {sc.assistNaam ? (sc.minuut ? " \u00b7 " : "") + "assist " + sc.assistNaam : ""}
              </div>
            </div>
            <button className="event-verwijder" onClick={function(){ verwijderScorer(sc.id); }}>{"×"}</button>
          </div>
        ))}
        <button className="knop lijn klein" style={{marginTop:8}} onClick={()=>setSpelersModal("scorer")}>+ Doelpunt toevoegen</button>

        {/* DOELPUNTEN TEGEN */}
        <div className="formulier-sectie-titel">
          <span><i className="fa-solid fa-futbol"/>{" Doelpunten " + (wedstrijd.tegenstander || "tegenstander")}</span>
        </div>
        {scorers.filter(function(s){return !s.eigenTeam;}).map(function(sc){
          return (
            <div key={sc.id} className="event-rij tegen-rij">
              <span className="event-icoon"><i className="fa-solid fa-futbol"/></span>
              <div className="event-info">
                <div className="event-naam">
                  {sc.naam || (sc.nummer ? "Nummer " + sc.nummer : "Onbekende speler")}
                  {sc.naam && sc.nummer ? " #" + sc.nummer : ""}
                </div>
                {sc.minuut && <div className="event-sub">{sc.minuut}{"\u2032"}</div>}
              </div>
              <button className="event-verwijder"
                onClick={function(){ verwijderTegenScorer(sc.id); }}>{"×"}</button>
            </div>
          );
        })}
        <button className="knop lijn klein" style={{marginTop:8}}
          onClick={function(){ setSpelersModal("tegenscorer"); }}>+ Doelpunt tegen</button>

        {/* KAARTEN */}
        <div className="formulier-sectie-titel"><i className="fa-solid fa-square" style={{color:"#ffc107"}}/> Kaarten</div>
        {kaarten.map(k=>(
          <div key={k.id} className="event-rij">
            <span className="event-icoon"><i className="fa-solid fa-square" style={{color:k.type==="geel"?"#ffc107":"#dc3545"}}/></span>
            <div className="event-info">
              <div className="event-naam">{k.naam}</div>
              {k.minuut&&<div className="event-sub">{k.minuut}{"'"}</div>}
            </div>
            <button className="event-verwijder" onClick={()=>setKaarten(l=>l.filter(x=>x.id!==k.id))}>×</button>
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button className="knop lijn klein" onClick={()=>setSpelersModal("geel")}><i className="fa-solid fa-square" style={{color:"#ffc107"}}/> Gele kaart</button>
          <button className="knop lijn klein" style={{borderColor:"var(--gevaar)",color:"var(--gevaar)"}} onClick={()=>setSpelersModal("rood")}><i className="fa-solid fa-square" style={{color:"#dc3545"}}/> Rode kaart</button>
        </div>

        {/* WISSELS */}
        <div className="formulier-sectie-titel"><i className="fa-solid fa-arrows-rotate"/> Wissels</div>
        {wissels.length===0&&<div style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,marginBottom:8}}>Nog geen wissels vastgelegd.</div>}
        {wissels.slice().sort(function(a,b){return (Number(a.minuut)||0)-(Number(b.minuut)||0);}).map(function(w){
          return (
            <div key={w.id} className="wissel-rij">
              <div style={{minWidth:32,fontWeight:700,color:"var(--grijs-donker)",fontSize:12,fontFamily:"'Helvetica Neue',Arial"}}>{w.minuut?w.minuut+"'":"–"}</div>
              <div style={{flex:1}}>
                <div><i className="fa-solid fa-arrow-down wissel-pijl-uit"/>{" "+w.uitNaam}</div>
                <div><i className="fa-solid fa-arrow-up wissel-pijl-in"/>{" "+w.inNaam}</div>
              </div>
              <button className="event-verwijder" onClick={function(){verwijderWissel(w.id);}}>×</button>
            </div>
          );
        })}
        <button className="knop lijn klein" style={{marginTop:8}} onClick={function(){setSpelersModal("wisselen");}}>+ Wissel of positiewissel</button>

        {/* KLEEDKAMER */}
        <div className="formulier-sectie-titel"><i className="fa-solid fa-clipboard-list"/> In de kleedkamer</div>
        <Kleedkamerbriefje waarde={kleedkamer} opWaarde={setKleedkamer} />

        {/* OPSTELLING */}
        <div className="formulier-sectie-titel"><i className="fa-solid fa-table-cells-large"/> Opstelling &amp; speelminuten</div>
        <div style={{fontSize:12,color:"var(--grijs-donker)",marginBottom:10,fontWeight:400}}>Klik op de knop rechts om te wisselen tussen basisspeler, wisselspeler en afwezig.</div>
        <div className="formulier-rij" style={{marginBottom:10}}>
          <div className="formulier-groep">
            <label className="formulier-label">Speelduur</label>
            {/* Twee keer vijfenveertig is een aanname, geen gegeven. De
                JO13 speelt twee keer dertig en een oefenpot duurt wat de
                scheidsrechter zegt. */}
            <div className="duur-knoppen">
              {SPEELDUREN.map(function (d) {
                var aan = (speelduur === d.per * d.helften && helften === d.helften);
                return (
                  <button key={d.per} className={"duur-knop" + (aan ? " aan" : "")}
                    onClick={function(){ setSpeelduur(d.per * d.helften); setHelften(d.helften); }}>
                    {d.helften + "\u00d7" + d.per}
                  </button>
                );
              })}
              <GetalVeld className="duur-eigen" min={10} max={130} leeg={90} waarde={speelduur}
                title="Of vul zelf de totale speeltijd in"
                opWaarde={function(n){ setSpeelduur(n); }} />
            </div>
          </div>
          <div className="formulier-groep" style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
            <button className="knop lijn klein" style={{justifyContent:"center"}}
              onClick={function(){ setOpstelling(berekenMinuten(opstelling, wissels, speelduur)); }}
              title="De minuten volgen vanzelf uit de wissels. Deze knop is er voor als je zelf iets hebt aangepast.">
              <i className="fa-solid fa-calculator"/> Minuten opnieuw berekenen
            </button>
          </div>
        </div>

        <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
          Basis ({startElf.length}) · Wissel ({wisselspelers.length}) · Afwezig ({afwezig.length})
        </div>
        {opstelling.map(s=>{
          const status = s.spelStatus||"basis";
          const isAfwezig = status==="afwezig";
          return (
            <div key={s.spelerId} className={`opp-rij${isAfwezig?" afwezig-rij":""}`}>
              <div className="opp-avatar" style={{background:isAfwezig?"var(--gevaar)":status==="wissel"?"var(--oranje)":"var(--blauw-licht)"}}>{<SpelerBeeld speler={s}/>}</div>
              <div className="opp-naam">{s.naam}{s.rugnummer?` #${s.rugnummer}`:""}</div>
              {!isAfwezig && <>
                <GetalVeld min={0} max={120} leeg={0} waarde={s.minuten}
                  opWaarde={function(n){ zetMinuten(s.spelerId, n); }}
                  style={{width:52,padding:"4px 8px",border:"2px solid var(--grijs)",borderRadius:8,fontSize:13,fontFamily:"'Helvetica Neue',Arial,sans-serif",fontWeight:700,textAlign:"center",outline:"none"}}
                />
                <span style={{fontSize:11,color:"var(--grijs-donker)"}}>min</span>
              </>}
              {!isAfwezig && <GetalVeld className="cijfer-invoer" min={1} max={10} step="0.5"
                leeg={null} placeholder="cijfer" waarde={beoordelingen[s.spelerId] || ""}
                opWaarde={function(n){ zetCijfer(s.spelerId, n); }} />}
              {!isAfwezig && <button className={"motm-knop"+(motm===s.spelerId?" actief":"")}
                title="Man of the Match"
                onClick={function(){setMotm(motm===s.spelerId?null:s.spelerId);}}>
                <i className={motm===s.spelerId?"fa-solid fa-star":"fa-regular fa-star"}/>
              </button>}
              {isAfwezig && <span style={{fontSize:12,color:"var(--gevaar)",fontWeight:700,fontFamily:"'Helvetica Neue',Arial,sans-serif",flex:1,textAlign:"right",paddingRight:8}}>Afwezig</span>}
              <button
                className={`opp-toggle ${status==="basis"?"start":status==="wissel"?"wissel":"afwezig"}`}
                onClick={()=>toggleStatus(s.spelerId)}
                title={status==="basis"?"Basis → Wissel":status==="wissel"?"Wissel → Afwezig":"Afwezig → Basis"}
              >
                {status==="basis"?"\u25B6":status==="wissel"?"\u21C4":"\u2715"}
              </button>
            </div>
          );
        })}

        <div style={{display:"flex",gap:10,marginTop:24}}>
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop succes" style={{flex:2,justifyContent:"center"}} onClick={slaOp}><i className="fa-solid fa-check"/> Uitslag opslaan</button>
        </div>
      </div>

      {spelersModal==="scorer"&&(
        <DoelpuntScherm spelers={spelers} opstelling={opstelling} wissels={wissels}
          posWissels={posWissels} wedstrijd={{speelduur:speelduur, helften:helften}}
          onKlaar={voegScorerToe} onSluiten={function(){ setSpelersModal(null); }} />
      )}
      {spelersModal==="geel"&&<SpelerKeuzeModal titel="Gele kaart voor?" spelers={sorteerOpLinie(spelers, opstelling)} rolLabels={rolLabelKaart} onKies={s=>voegKaartToe("geel",s)} onSluiten={()=>setSpelersModal(null)} />}
      {spelersModal==="rood"&&<SpelerKeuzeModal titel="Rode kaart voor?" spelers={sorteerOpLinie(spelers, opstelling)} rolLabels={rolLabelKaart} onKies={s=>voegKaartToe("rood",s)} onSluiten={()=>setSpelersModal(null)} />}
      {spelersModal==="wisselen"&&(
        <WisselScherm spelers={spelers} opstelling={opstelling}
          wissels={wissels} posWissels={posWissels}
          speelduur={speelduur} helften={wedstrijdDuur(wedstrijd).helften}
          onWissel={voegWisselToe} onPositie={voegPositieToe}
          onVerwijderWissel={verwijderWissel} onVerwijderPositie={verwijderPositie}
          onSluiten={function(){ setSpelersModal(null); }} />
      )}
      {spelersModal==="tegenscorer"&&(
        <TegenDoelpuntModal tegenstander={wedstrijd.tegenstander}
          onKlaar={voegTegenScorerToe}
          onSluiten={function(){ setSpelersModal(null); }} />
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   TOERNOOIEN
═══════════════════════════════════════════════════════════ */
function ToernooiFormulier({ toernooi, onOpslaan, onSluiten }) {
  const [form, setForm] = useState(Object.assign({}, LEEG_TOERNOOI, toernooi||{}));
  const [nieuwTeam, setNieuwTeam] = useState("");
  const set = (k,v) => setForm(function(f){ var n=Object.assign({},f); n[k]=v; return n; });

  function voegTeamToe(naam, eigen) {
    var n = (naam||"").trim();
    if (!n) return;
    setForm(function(f){
      if (f.teams.some(function(t){ return t.naam.toLowerCase()===n.toLowerCase(); })) return f;
      return Object.assign({}, f, {teams: f.teams.concat([{id:"tm"+Date.now()+Math.random().toString(36).slice(2,6), naam:n, eigen:!!eigen}])});
    });
    setNieuwTeam("");
  }
  function verwijderTeam(id) {
    setForm(function(f){ return Object.assign({}, f, {teams: f.teams.filter(function(t){return t.id!==id;})}); });
  }
  function opslaan() {
    if (!form.naam.trim()) { meldFout("Geef het toernooi een naam."); return; }
    if (form.teams.length < 2) { meldFout("Voeg minstens twee teams toe."); return; }
    onOpslaan(Object.assign({}, form, {id: form.id||Date.now()}));
  }

  const heeftEigen = form.teams.some(function(t){return t.eigen;});
  const aantalW = form.teams.length>=2 ? form.teams.length*(form.teams.length-1)/2 : 0;

  return (
    <div className="modal-overlay" onClick={function(e){if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Toernooi bewerken":"Nieuw toernooi"}</div>

        <div className="formulier-groep">
          <label className="formulier-label">Naam *</label>
          <input className="formulier-input" value={form.naam} onChange={function(e){set("naam",e.target.value);}}
            placeholder="bijv. Zeehoek Cup" />
        </div>
        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Datum</label>
            <input className="formulier-input" type="date" value={form.datum} onChange={function(e){set("datum",e.target.value);}} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Starttijd</label>
            <input className="formulier-input" type="time" value={form.starttijd} onChange={function(e){set("starttijd",e.target.value);}} />
          </div>
        </div>
        <div className="formulier-groep">
          <label className="formulier-label">Locatie</label>
          <input className="formulier-input" value={form.locatie} onChange={function(e){set("locatie",e.target.value);}}
            placeholder="Sportpark" />
        </div>
        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Velden</label>
            <GetalVeld className="formulier-input" min={1} max={8} leeg={1} waarde={form.aantalVelden}
              opWaarde={function(n){ set("aantalVelden", n); }} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Speelduur</label>
            <GetalVeld className="formulier-input" min={5} max={60} leeg={15} waarde={form.speelduur}
              opWaarde={function(n){ set("speelduur", n); }} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Pauze</label>
            <GetalVeld className="formulier-input" min={0} max={30} leeg={0} waarde={form.pauze}
              opWaarde={function(n){ set("pauze", n); }} />
          </div>
        </div>

        <div className="formulier-sectie-titel"><i className="fa-solid fa-users-line"/> Teams ({form.teams.length})</div>
        {!heeftEigen && (
          <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginBottom:8}}
            onClick={function(){voegTeamToe(teamNaamVol(), true);}}>
            + {teamNaamVol()} toevoegen
          </button>
        )}
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input className="formulier-input" style={{flex:1,marginBottom:0}} value={nieuwTeam}
            placeholder="Naam tegenstander"
            onChange={function(e){setNieuwTeam(e.target.value);}}
            onKeyDown={function(e){ if(e.key==="Enter"){ e.preventDefault(); voegTeamToe(nieuwTeam,false); } }} />
          <button className="knop klein" onClick={function(){voegTeamToe(nieuwTeam,false);}}>+</button>
        </div>
        {form.teams.map(function(t){
          return (
            <div key={t.id} className="opgave-rij">
              <div className="opp-avatar" style={{width:28,height:28,fontSize:10,background:t.eigen?"var(--blauw)":"var(--grijs-donker)"}}>
                {initialen(t.naam)}
              </div>
              <div style={{flex:1,fontSize:13,fontWeight:600,fontFamily:"'Helvetica Neue',Arial"}}>
                {t.naam}{t.eigen&&<span className="oef-tag" style={{marginLeft:6,background:"var(--blauw)",color:"#fff"}}>ons</span>}
              </div>
              <button className="knop gevaar klein" style={{padding:"4px 8px"}} onClick={function(){verwijderTeam(t.id);}}>
                <i className="fa-solid fa-trash"/>
              </button>
            </div>
          );
        })}
        {aantalW>0 && (
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,marginTop:10,lineHeight:1.5}}>
            {"Halve competitie: "+aantalW+" wedstrijden, iedereen één keer tegen elkaar."}
          </p>
        )}

        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={opslaan}><i className="fa-solid fa-check"/> Opslaan</button>
        </div>
      </div>
    </div>
  );
}

function ToernooiDetail({ toernooi, onTerug, onBewerken, onVerwijderen, onOpslaan }) {
  const [tab, setTab] = useState("schema");
  const [bevestig, setBevestig] = useState(false);
  const [herbouw, setHerbouw] = useState(false);

  const teams = toernooi.teams || [];
  const wedstrijden = toernooi.wedstrijden || [];
  const stand = toernooiStand(teams, wedstrijden);
  const gespeeldAantal = wedstrijden.filter(function(w){return w.gespeeld;}).length;

  function teamNaam(id) {
    var t = teams.find(function(x){return x.id===id;});
    return t ? t.naam : "?";
  }
  function isEigen(id) {
    var t = teams.find(function(x){return x.id===id;});
    return t && t.eigen;
  }
  function genereer() {
    var rondes = maakPouleSchema(teams.map(function(t){return t.id;}));
    var nieuw = planToernooi(rondes, toernooi.aantalVelden, toernooi.starttijd, toernooi.speelduur, toernooi.pauze);
    onOpslaan(Object.assign({}, toernooi, {wedstrijden:nieuw, opgezet:true}));
    setHerbouw(false);
    meldGoed(nieuw.length+" wedstrijden ingepland");
  }
  function zetScore(id, kant, waarde) {
    var nieuw = wedstrijden.map(function(w){
      if (w.id!==id) return w;
      var score = Object.assign({}, w.score);
      score[kant] = Math.max(0, Number(waarde)||0);
      return Object.assign({}, w, {score:score, gespeeld:true});
    });
    onOpslaan(Object.assign({}, toernooi, {wedstrijden:nieuw}));
  }
  function wisGespeeld(id) {
    var nieuw = wedstrijden.map(function(w){
      return w.id===id ? Object.assign({}, w, {gespeeld:false, score:{thuis:0,uit:0}}) : w;
    });
    onOpslaan(Object.assign({}, toernooi, {wedstrijden:nieuw}));
  }

  const perTijd = {};
  wedstrijden.forEach(function(w){
    if (!perTijd[w.tijd]) perTijd[w.tijd] = [];
    perTijd[w.tijd].push(w);
  });
  const tijden = Object.keys(perTijd).sort();

  return (
    <div className="pagina-slide">
      <button className="back-knop" onClick={onTerug}><i className="fa-solid fa-arrow-left"/> Terug naar toernooien</button>

      <div style={{background:"linear-gradient(150deg,#062f6e 0%,var(--blauw) 55%,#0068d6 100%)",color:"#fff",borderRadius:18,padding:"22px 20px",marginBottom:14}}>
        <div style={{fontSize:10,opacity:.72,textTransform:"uppercase",letterSpacing:1.2,fontWeight:700,fontFamily:"'Helvetica Neue',Arial"}}>Toernooi</div>
        <div style={{fontSize:26,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",margin:"7px 0 6px",letterSpacing:"-0.025em",lineHeight:1.1}}>{toernooi.naam}</div>
        <div style={{fontSize:13,opacity:.87,display:"flex",flexWrap:"wrap",gap:12}}>
          {toernooi.datum&&<span><i className="fa-solid fa-calendar-days"/>{" "+formateerDatumKort(toernooi.datum)}</span>}
          {toernooi.locatie&&<span><i className="fa-solid fa-location-dot"/>{" "+toernooi.locatie}</span>}
          <span><i className="fa-solid fa-users-line"/>{" "+teams.length+" teams"}</span>
        </div>
      </div>

      {!toernooi.opgezet || wedstrijden.length===0 ? (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-wand-magic-sparkles"/> Speelschema maken</div>
          <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,marginBottom:14}}>
            {"Iedereen speelt één keer tegen elkaar: "+(teams.length*(teams.length-1)/2)+" wedstrijden van "+toernooi.speelduur+" minuten, verdeeld over "+toernooi.aantalVelden+" veld"+(toernooi.aantalVelden===1?"":"en")+"."}
          </p>
          <button className="knop" style={{width:"100%",justifyContent:"center"}} onClick={genereer}>
            <i className="fa-solid fa-wand-magic-sparkles"/> Schema genereren
          </button>
        </div>
      ) : (
        <div>
          <div className="tabs">
            <button className={"tab-knop"+(tab==="schema"?" actief":"")} onClick={function(){setTab("schema");}}>
              <i className="fa-solid fa-list-ol"/> Schema
            </button>
            <button className={"tab-knop"+(tab==="stand"?" actief":"")} onClick={function(){setTab("stand");}}>
              <i className="fa-solid fa-ranking-star"/> Stand
            </button>
          </div>

          {tab==="schema" && (
            <div>
              <div className="kaart">
                <div className="kaart-titel">
                  <i className="fa-solid fa-list-ol"/>
                  {" Speelschema · "+gespeeldAantal+" van "+wedstrijden.length+" gespeeld"}
                </div>
                {tijden.map(function(t){
                  return (
                    <div key={t} style={{marginBottom:10}}>
                      <div className="review-label" style={{margin:"8px 0 2px"}}>{t}</div>
                      {perTijd[t].map(function(w){
                        return (
                          <div key={w.id} className="tw-rij">
                            <span className="tw-veld">{"V"+w.veld}</span>
                            <span className={"tw-team rechts"+(isEigen(w.thuisId)?" eigen":"")}>{teamNaam(w.thuisId)}</span>
                            <GetalVeld className="tw-score" min={0} leeg={0} waarde={w.gespeeld?w.score.thuis:""}
                              placeholder="–" opWaarde={function(n){zetScore(w.id,"thuis",n);}} />
                            <span className="tw-streep">–</span>
                            <GetalVeld className="tw-score" min={0} leeg={0} waarde={w.gespeeld?w.score.uit:""}
                              placeholder="–" opWaarde={function(n){zetScore(w.id,"uit",n);}} />
                            <span className={"tw-team"+(isEigen(w.uitId)?" eigen":"")}>{teamNaam(w.uitId)}</span>
                            {w.gespeeld && (
                              <button className="event-verwijder" title="Uitslag wissen"
                                onClick={function(){wisGespeeld(w.id);}}>×</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <button className="knop lijn klein" style={{width:"100%",justifyContent:"center"}}
                onClick={function(){setHerbouw(true);}}>
                <i className="fa-solid fa-rotate-left"/> Schema opnieuw genereren
              </button>
            </div>
          )}

          {tab==="stand" && (
            <div className="kaart">
              <div className="kaart-titel"><i className="fa-solid fa-ranking-star"/> Tussenstand</div>
              <div style={{overflowX:"auto"}}>
                <table className="stand-tabel">
                  <thead>
                    <tr>
                      <th style={{width:26}}>#</th>
                      <th className="links">Team</th>
                      <th>G</th><th>W</th><th>G</th><th>V</th><th>DS</th><th>P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stand.map(function(r,i){
                      return (
                        <tr key={r.id} className={r.eigen?"eigen":""}>
                          <td><span className="stand-pos">{i+1}</span></td>
                          <td className="links naam">{r.naam}</td>
                          <td>{r.gespeeld}</td><td>{r.winst}</td><td>{r.gelijk}</td><td>{r.verlies}</td>
                          <td style={{color:r.saldo>0?"var(--succes)":r.saldo<0?"var(--gevaar)":"inherit"}}>{(r.saldo>0?"+":"")+r.saldo}</td>
                          <td style={{fontSize:15}}>{r.punten}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {gespeeldAantal===0 && (
                <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,textAlign:"center",marginTop:10}}>
                  Vul uitslagen in bij het schema om de stand te vullen.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{display:"flex",gap:10,marginTop:4}}>
        <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onBewerken}>
          <i className="fa-solid fa-pen"/> Bewerken
        </button>
        <button className="knop gevaar klein" onClick={function(){setBevestig(true);}}><i className="fa-solid fa-trash"/></button>
      </div>

      {herbouw && (
        <div className="bevestig-overlay" onClick={function(e){if(e.target===e.currentTarget)setHerbouw(false);}}>
          <div className="bevestig-kaart">
            <h3>Schema opnieuw maken?</h3>
            <p>Alle ingevulde uitslagen van dit toernooi gaan verloren.</p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){setHerbouw(false);}}>Annuleren</button>
              <button className="knop gevaar" onClick={genereer}>Opnieuw</button>
            </div>
          </div>
        </div>
      )}
      {bevestig && (
        <div className="bevestig-overlay"><div className="bevestig-kaart">
          <h3>Toernooi verwijderen?</h3><p>{toernooi.naam} wordt definitief verwijderd.</p>
          <div className="bevestig-knoppen">
            <button className="knop lijn" onClick={function(){setBevestig(false);}}>Annuleren</button>
            <button className="knop gevaar" onClick={onVerwijderen}>Verwijderen</button>
          </div>
        </div></div>
      )}
    </div>
  );
}

function ToernooienTab() {
  const [toernooien, setToernooien] = useState(laadToernooien);
  const [gekozen, setGekozen] = useState(null);
  const [formulier, setFormulier] = useState(null);

  useEffect(function(){ slaJson(TOERNOOIEN_KEY, toernooien); },[toernooien]);

  function slaOp(t) {
    setToernooien(function(l){
      var b = l.find(function(x){return x.id===t.id;});
      return b ? l.map(function(x){return x.id===t.id?t:x;}) : l.concat([t]);
    });
    setFormulier(null);
    if (gekozen && gekozen.id===t.id) setGekozen(t);
  }
  function verwijder() {
    var weg = gekozen;
    setToernooien(function(l){ return l.filter(function(x){return x.id!==weg.id;}); });
    setGekozen(null);
    toon("Toernooi \u201c"+weg.naam+"\u201d verwijderd", {
      actie: function(){ setToernooien(function(l){ return l.concat([weg]); }); }
    });
  }

  if (gekozen) {
    var actueel = toernooien.find(function(t){return t.id===gekozen.id;}) || gekozen;
    return (
      <>
        <ToernooiDetail toernooi={actueel}
          onTerug={function(){setGekozen(null);}}
          onBewerken={function(){setFormulier(actueel);}}
          onVerwijderen={verwijder}
          onOpslaan={slaOp} />
        {formulier && (
          <ToernooiFormulier toernooi={formulier.id?formulier:null} onOpslaan={slaOp}
            onSluiten={function(){setFormulier(null);}} />
        )}
      </>
    );
  }

  const gesorteerd = toernooien.slice().sort(function(a,b){ return new Date(b.datum)-new Date(a.datum); });

  return (
    <div>
      <div className="pagina-header">
        <div className="pagina-header-tekst">
          <div className="eyebrow">Poules &amp; schema</div>
          <h2>Toernooien</h2>
          <p>{toernooien.length===0?"Plan een toernooi met poule-indeling":toernooien.length+" toernooi"+(toernooien.length===1?"":"en")}</p>
        </div>
        <button className="knop-plus" onClick={function(){setFormulier({});}}>+</button>
      </div>

      {gesorteerd.length===0 ? (
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-trophy"/></div>
          <h3>Nog geen toernooien</h3>
          <p>Voeg teams toe en laat de app het speelschema maken: iedereen één keer tegen elkaar, verdeeld over de velden.</p>
          <button className="knop" onClick={function(){setFormulier({});}}>+ Eerste toernooi</button>
        </div>
      ) : (
        <div>
          {gesorteerd.map(function(t){
            var gespeeld = (t.wedstrijden||[]).filter(function(w){return w.gespeeld;}).length;
            var totaal = (t.wedstrijden||[]).length;
            return (
              <div key={t.id} className="toernooi-kaart" onClick={function(){setGekozen(t);}}>
                <div className="toernooi-naam">{t.naam}</div>
                <div className="toernooi-meta">
                  {t.datum&&<span><i className="fa-solid fa-calendar-days"/>{" "+formateerDatumKort(t.datum)}</span>}
                  <span><i className="fa-solid fa-users-line"/>{" "+(t.teams||[]).length+" teams"}</span>
                  {totaal>0&&<span><i className="fa-solid fa-list-ol"/>{" "+gespeeld+"/"+totaal+" gespeeld"}</span>}
                  {totaal===0&&<span style={{color:"var(--oranje)",fontWeight:700}}>Nog geen schema</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formulier && (
        <ToernooiFormulier toernooi={formulier.id?formulier:null} onOpslaan={slaOp}
          onSluiten={function(){setFormulier(null);}} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WEDSTRIJD FORMULIER
═══════════════════════════════════════════════════════════ */
/* Heb je een assistent-scheidsrechter ingevuld, dan vlagt die ook.

   Dat is geen regel maar een voorstel: het gebeurt alleen als er nog
   niemand staat. Wijs je bij de spelersrollen iemand anders aan voor de
   tweede helft, dan blijft dat staan — ook als je de wedstrijd daarna
   nog eens opent en opslaat.

   Staat de naam in je selectie, dan wordt het die speler, zodat de
   telling "wie heeft het vaakst gevlagd" blijft kloppen. Staat hij er
   niet in, dan komt de naam er als naam in. */
function vlaggenUitAssistent(w, spelers) {
  var naam = String((w && w.assistent) || "").trim();
  var rollen = Object.assign({}, (w && w.rollen) || {});
  if (!naam) return rollen;
  var s = (spelers || []).filter(function (p) {
    return String(p.naam || "").trim().toLowerCase() === naam.toLowerCase();
  })[0];
  var waarde = s ? s.id : naam;
  VLAG_ROLLEN.forEach(function (r) { if (!rollen[r]) rollen[r] = waarde; });
  return rollen;
}

function WedstrijdFormulier({ wedstrijd, spelers, onOpslaan, onSluiten }) {
  const [form,setForm]=useState(function(){
    const basis = {...LEEG_WEDSTRIJD, speelduur: inst().speelduur||90, locatie: inst().locatie||""};
    return {...basis, ...wedstrijd};
  });
  const [spelersModal,setSpelersModal]=useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const selectie = spelers || [];
  const gespeeldeWedstrijd = form.status === "gespeeld";

  function zetScore(kant, waarde) {
    setForm(function(f){
      var s = Object.assign({}, f.score||{fch:0,teg:0});
      s[kant] = Math.max(0, Number(waarde)||0);
      return Object.assign({}, f, {score:s});
    });
  }
  function voegScorerToe(speler) {
    var min = prompt("Minuut van het doelpunt?", "") || "";
    setForm(function(f){
      return Object.assign({}, f, {scorers:(f.scorers||[]).concat([{
        id:Date.now(), spelerId:speler.id, naam:speler.naam, minuut:min,
        eigenTeam:true, assist:null, assistNaam:""
      }])});
    });
    setSpelersModal(null);
  }
  function voegKaartToe(type, speler) {
    var min = prompt("Minuut van de kaart?", "") || "";
    setForm(function(f){
      return Object.assign({}, f, {kaarten:(f.kaarten||[]).concat([{
        id:Date.now(), spelerId:speler.id, naam:speler.naam, type:type, minuut:min
      }])});
    });
    setSpelersModal(null);
  }
  function verwijderUit(veld, id) {
    setForm(function(f){
      return Object.assign({}, f, {[veld]:(f[veld]||[]).filter(function(x){ return x.id!==id; })});
    });
  }

  function opslaan() {
    if(!form.tegenstander.trim()){meldFout("Vul een tegenstander in.");return;}
    if(!form.datum){meldFout("Vul een datum in.");return;}
    onOpslaan({...form, id: form.id||Date.now(),
               rollen: vlaggenUitAssistent(form, selectie)});
  }
  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Wedstrijd bewerken":"Wedstrijd toevoegen"}</div>

        <div className="formulier-groep">
          <label className="formulier-label">Tegenstander *</label>
          <input className="formulier-input" value={form.tegenstander} onChange={e=>set("tegenstander",e.target.value)} placeholder="Naam tegenstander" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Soort wedstrijd</label>
          <div className="soort-raster">
            {WEDSTRIJD_SOORTEN.map(function(s){
              var aan = wedstrijdSoort(form).id===s.id;
              return (
                <button key={s.id} type="button" className={"soort-knop"+(aan?" actief":"")}
                  style={aan?{color:s.kleur, background:"var(--vlak-info)"}:{}}
                  onClick={function(){ set("soort", s.id); }}>
                  <i className={s.telt?"fa-solid fa-trophy":"fa-solid fa-futbol"} style={{color:s.kleur}}/>
                  {s.label}
                </button>
              );
            })}
          </div>
          <p style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:400,margin:"7px 0 0",lineHeight:1.5}}>
            {wedstrijdSoort(form).uitleg}
            {wedstrijdSoort(form).id!=="competitie" ? " · niet in de competitiestand" : ""}
          </p>
        </div>
        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Datum *</label>
            <input className="formulier-input" type="date" value={form.datum} onChange={e=>set("datum",e.target.value)} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Aanvangstijd</label>
            <input className="formulier-input" type="time" value={form.tijd} onChange={e=>set("tijd",e.target.value)} />
          </div>
        </div>
        <div className="formulier-groep">
          <label className="formulier-label">Locatie / Sportpark</label>
          <input className="formulier-input" value={form.locatie} onChange={e=>set("locatie",e.target.value)} placeholder="Sportpark De Zeehoek" />
        </div>
        <div className="formulier-groep">
          <label className="formulier-label">Thuis of Uit?</label>
          <div style={{display:"flex",gap:8}}>
            {["Thuis","Uit"].map(opt=>(
              <button key={opt} onClick={()=>set("thuis",opt==="Thuis")}
                style={{flex:1,minWidth:0,minHeight:44,display:"flex",alignItems:"center",
                  justifyContent:"center",padding:"10px",borderRadius:10,border:"2px solid",
                  borderColor:((opt==="Thuis")===form.thuis)?"var(--blauw)":"var(--grijs)",
                  background:((opt==="Thuis")===form.thuis)?"var(--blauw)":"var(--wit)",
                  color:((opt==="Thuis")===form.thuis)?"var(--wit)":"var(--grijs-donker)",
                  cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
                <i className={opt==="Thuis" ? "fa-solid fa-house" : "fa-solid fa-road"}
                  style={{marginRight:8,fontSize:13}}/>
                {opt}
              </button>
            ))}
          </div>
        </div>
        {/* ── Wie fluit er? ──
            Twee namen, meer niet. Ze horen bij de wedstrijd en niet bij
            je selectie, want vaker wel dan niet staat er iemand die daar
            niet in voorkomt. */}
        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Scheidsrechter</label>
            <NaamVeld waarde={form.scheids} lijstId="lijst-scheids"
              namen={selectie.map(function(s){ return s.naam; })}
              placeholder="Naam"
              opWaarde={function(v){ set("scheids", v); }} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Assistent-scheidsrechter</label>
            <NaamVeld waarde={form.assistent} lijstId="lijst-assistent"
              namen={selectie.map(function(s){ return s.naam; })}
              placeholder="Naam"
              opWaarde={function(v){ set("assistent", v); }} />
          </div>
        </div>

        {gespeeldeWedstrijd && (
          <div>
            <div className="formulier-sectie-titel"><i className="fa-solid fa-futbol"/> Uitslag</div>
            <div className="score-invoer">
              {scoreVolgorde(form.thuis, inst().clubNaam, form.tegenstander)
                .map(function(vak, i){
                var nu = (form.score && form.score[vak.kant]) || 0;
                return (
                  <React.Fragment key={vak.kant}>
                    {i > 0 && <div className="score-divider">–</div>}
                    <div className="score-blok">
                      <div className="score-team-label" title={vak.naam}>{teamKort(vak.naam)}</div>
                      <div className="score-teller">
                        <button onClick={function(){ zetScore(vak.kant, nu - 1); }}>−</button>
                        <span>{nu}</span>
                        <button onClick={function(){ zetScore(vak.kant, nu + 1); }}>+</button>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="formulier-sectie-titel">{"⚽ Doelpunten "+(inst().clubNaam||"")}</div>
            {(form.scorers||[]).filter(function(s){return s.eigenTeam;}).map(function(sc){
              return (
                <div key={sc.id} className="event-rij">
                  <span className="event-icoon"><i className="fa-solid fa-futbol"/></span>
                  <div className="event-info">
                    <div className="event-naam">{sc.naam}</div>
                    {sc.minuut&&<div className="event-sub">{sc.minuut}{"'"}</div>}
                  </div>
                  <button className="event-verwijder" onClick={function(){verwijderUit("scorers",sc.id);}}>×</button>
                </div>
              );
            })}
            {(form.scorers||[]).filter(function(s){return s.eigenTeam;}).length===0 && (
              <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,marginBottom:8}}>Nog geen doelpuntenmakers.</p>
            )}
            <button className="knop lijn klein" style={{marginTop:4}}
              disabled={selectie.length===0}
              onClick={function(){ if(selectie.length) setSpelersModal("scorer"); }}>+ Doelpunt toevoegen</button>

            <div className="formulier-sectie-titel"><i className="fa-solid fa-square" style={{color:"#ffc107"}}/> Kaarten</div>
            {(form.kaarten||[]).map(function(k){
              return (
                <div key={k.id} className="event-rij">
                  <span className="event-icoon"><i className="fa-solid fa-square" style={{color:k.type==="geel"?"#ffc107":"#dc3545"}}/></span>
                  <div className="event-info">
                    <div className="event-naam">{k.naam}</div>
                    {k.minuut&&<div className="event-sub">{k.minuut}{"'"}</div>}
                  </div>
                  <button className="event-verwijder" onClick={function(){verwijderUit("kaarten",k.id);}}>×</button>
                </div>
              );
            })}
            {(form.kaarten||[]).length===0 && (
              <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,marginBottom:8}}>Geen kaarten.</p>
            )}
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button className="knop lijn klein" disabled={selectie.length===0}
                onClick={function(){ if(selectie.length) setSpelersModal("geel"); }}>
                <i className="fa-solid fa-square" style={{color:"#ffc107"}}/> Gele kaart
              </button>
              <button className="knop lijn klein" style={{borderColor:"var(--gevaar)",color:"var(--gevaar)"}}
                disabled={selectie.length===0}
                onClick={function(){ if(selectie.length) setSpelersModal("rood"); }}>
                <i className="fa-solid fa-square" style={{color:"#dc3545"}}/> Rode kaart
              </button>
            </div>

            <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.5,marginTop:14}}>
              Opstelling, speelminuten, wissels en cijfers pas je aan via <strong>Uitslag wijzigen</strong> op het wedstrijdscherm.
            </p>
          </div>
        )}

        <div className="formulier-groep">
          <label className="formulier-label">Notities</label>
          <textarea className="formulier-input" rows="2" value={form.notities} onChange={e=>set("notities",e.target.value)} placeholder="Extra informatie…" style={{resize:"vertical"}} />
        </div>

        <div className="modal-voet">
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={opslaan}><i className="fa-solid fa-check"/> Opslaan</button>
        </div>
      </div>

      {spelersModal==="scorer"&&<SpelerKeuzeModal titel="Wie scoorde?" spelers={sorteerOpLinie(selectie, form.opstelling)} rolLabels={{}} onKies={voegScorerToe} onSluiten={function(){setSpelersModal(null);}} />}
      {spelersModal==="geel"&&<SpelerKeuzeModal titel="Gele kaart voor?" spelers={sorteerOpLinie(selectie, form.opstelling)} onKies={function(s){voegKaartToe("geel",s);}} onSluiten={function(){setSpelersModal(null);}} />}
      {spelersModal==="rood"&&<SpelerKeuzeModal titel="Rode kaart voor?" spelers={sorteerOpLinie(selectie, form.opstelling)} onKies={function(s){voegKaartToe("rood",s);}} onSluiten={function(){setSpelersModal(null);}} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROGRAMMA IMPORTEREN
═══════════════════════════════════════════════════════════ */
function ImportSheet({ bestaande, onImporteren, onSluiten }) {
  const [bron, setBron] = useState("bestand");
  const [tekst, setTekst] = useState("");
  const [link, setLink] = useState("");
  const [bezig, setBezig] = useState(false);
  const [gevonden, setGevonden] = useState(null);
  const [gekozen, setGekozen] = useState({});
  const bestandRef = useRef(null);

  function verwerk(ruweTekst, soort) {
    var items = soort==="ics" ? ontleedICS(ruweTekst) : ontleedPlakTekst(ruweTekst);
    if (items.length===0 && soort!=="ics") items = ontleedICS(ruweTekst);
    if (items.length===0 && soort==="ics") items = ontleedPlakTekst(ruweTekst);
    var lijst = bouwImportWedstrijden(items, inst().clubNaam, bestaande);
    if (lijst.length===0) {
      meldFout("Geen wedstrijden herkend in deze inhoud.");
      setGevonden(null);
      return;
    }
    var keuze = {};
    lijst.forEach(function(w){ keuze[w.tijdelijkId] = !w.dubbel; });
    setGekozen(keuze);
    setGevonden(lijst);
  }

  function kiesBestand(e) {
    var bestand = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!bestand) return;
    var lezer = new FileReader();
    lezer.onload = function(ev){ verwerk(String(ev.target.result), "ics"); };
    lezer.onerror = function(){ meldFout("Bestand kon niet gelezen worden."); };
    lezer.readAsText(bestand);
  }

  function haalLinkOp() {
    var url = link.trim();
    if (!url) { meldFout("Plak eerst je kalenderlink."); return; }
    setBezig(true);
    fetch(url)
      .then(function(r){ if(!r.ok) throw new Error("status "+r.status); return r.text(); })
      .then(function(t){ setBezig(false); verwerk(t, "ics"); })
      .catch(function(){
        setBezig(false);
        meldFout("De link kon niet rechtstreeks opgehaald worden. Open 'm in je browser, sla het bestand op en kies het hier.");
      });
  }

  function wisselAlles(aan) {
    var keuze = {};
    (gevonden||[]).forEach(function(w){ keuze[w.tijdelijkId] = aan; });
    setGekozen(keuze);
  }

  function importeer() {
    var lijst = (gevonden||[]).filter(function(w){ return gekozen[w.tijdelijkId]; });
    if (lijst.length===0) { meldFout("Vink minstens één wedstrijd aan."); return; }
    onImporteren(lijst);
  }

  const aantalGekozen = (gevonden||[]).filter(function(w){ return gekozen[w.tijdelijkId]; }).length;

  return (
    <div className="formatie-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="formatie-sheet-header">
          <span className="formatie-sheet-titel">Programma importeren</span>
          <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
            onClick={onSluiten}>{"✕"}</button>
        </div>

        {!gevonden && (
          <div>
            <div className="kaart" style={{marginTop:6,borderColor:"var(--blauw-licht)"}}>
              <div className="kaart-titel"><i className="fa-solid fa-bolt"/> Snelste manier</div>
              <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,marginBottom:12}}>
                {"Het programma van fc Harlingen O19-2 zit al in de app: "+INGEBOUWD_PROGRAMMA.length+" wedstrijden van 5 september tot 3 oktober."}
              </p>
              <button className="knop" style={{width:"100%",justifyContent:"center"}}
                onClick={function(){
                  var items = INGEBOUWD_PROGRAMMA.map(function(w){
                    return { titel: w.thuis ? ("fc Harlingen O19-2 - "+w.tegenstander)
                                            : (w.tegenstander+" - fc Harlingen O19-2"),
                             datum: w.datum, tijd: w.tijd,
                             locatie: w.thuis ? "Sportpark De Zeehoek, Harlingen" : "" };
                  });
                  var lijst = bouwImportWedstrijden(items, "fc Harlingen", bestaande);
                  var keuze = {};
                  lijst.forEach(function(w){ keuze[w.tijdelijkId] = !w.dubbel; });
                  setGekozen(keuze);
                  setGevonden(lijst);
                }}>
                <i className="fa-solid fa-download"/> Programma laden
              </button>
            </div>

            <div className="tabs" style={{marginTop:6}}>
              <button className={"tab-knop"+(bron==="bestand"?" actief":"")} onClick={function(){setBron("bestand");}}>Bestand</button>
              <button className={"tab-knop"+(bron==="plakken"?" actief":"")} onClick={function(){setBron("plakken");}}>Plakken</button>
              <button className={"tab-knop"+(bron==="link"?" actief":"")} onClick={function(){setBron("link");}}>Link</button>
            </div>

            {bron==="bestand" && (
              <div className="kaart">
                <div className="kaart-titel"><i className="fa-solid fa-file-arrow-up"/> Agendabestand</div>
                <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,marginBottom:14}}>
                  Heb je de Voetbal.nl-kalender? Open je kalenderlink in de browser, bewaar het bestand
                  en kies het hier. Een export uit Google Agenda of Outlook werkt ook.
                </p>
                <button className="knop" style={{width:"100%",justifyContent:"center"}}
                  onClick={function(){ if(bestandRef.current) bestandRef.current.click(); }}>
                  <i className="fa-solid fa-upload"/> Bestand kiezen
                </button>
                <input ref={bestandRef} type="file" accept=".ics,.ical,.txt,text/calendar,text/plain,*/*"
                  style={{display:"none"}} onChange={kiesBestand} />
              </div>
            )}

            {bron==="plakken" && (
              <div className="kaart">
                <div className="kaart-titel"><i className="fa-solid fa-clipboard"/> Programma plakken</div>
                <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,marginBottom:10}}>
                  Kopieer het programma van voetbal.nl of de clubsite en plak het hieronder. Eén wedstrijd per regel,
                  met een datum en de twee teams gescheiden door een streepje.
                </p>
                <textarea className="formulier-input" rows="7" value={tekst}
                  onChange={function(e){setTekst(e.target.value);}} style={{resize:"vertical",fontSize:13}}
                  placeholder={"za 23 aug 2026  14:30  fc Harlingen JO19-2 - VV Bolsward JO19-1\nzo 30 aug 2026  12:00  SC Franeker JO19-1 - fc Harlingen JO19-2"} />
                <button className="knop" style={{width:"100%",justifyContent:"center",marginTop:10}}
                  onClick={function(){verwerk(tekst,"tekst");}}>
                  <i className="fa-solid fa-magnifying-glass"/> Wedstrijden zoeken
                </button>
              </div>
            )}

            {bron==="link" && (
              <div className="kaart">
                <div className="kaart-titel"><i className="fa-solid fa-link"/> Kalenderlink</div>
                <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,marginBottom:10}}>
                  Plak de link uit je Voetbal.nl-mail. Die begint met data.sportlink.com. Lukt het ophalen niet,
                  dan blokkeert Sportlink het verzoek en werkt het tabblad Bestand wel.
                </p>
                <input className="formulier-input" value={link} onChange={function(e){setLink(e.target.value);}}
                  placeholder="https://data.sportlink.com/ical-team?token=..." />
                <button className="knop" style={{width:"100%",justifyContent:"center"}}
                  disabled={bezig} onClick={haalLinkOp}>
                  <i className="fa-solid fa-cloud-arrow-down"/>{bezig?" Bezig…":" Ophalen"}
                </button>
              </div>
            )}

            <div className="kaart" style={{background:"var(--vlak-info)",borderColor:"var(--blauw-licht)"}}>
              <div style={{fontSize:12,fontWeight:400,lineHeight:1.6,color:"var(--tekst)"}}>
                <strong>Waarom niet automatisch?</strong> Voetbal.nl en Wedstrijdzaken hebben geen open koppeling;
                hun gegevens zitten achter een KNVB-login. De kalender van Voetbal.nl (eenmalig € 1,99 in hun app)
                is de enige officiële uitvoer, en die kun je hier inlezen.
              </div>
            </div>
          </div>
        )}

        {gevonden && (
          <div>
            <div className="kaart">
              <div className="kaart-titel" style={{justifyContent:"space-between"}}>
                <span><i className="fa-solid fa-list-check"/>{" "+gevonden.length+" gevonden"}</span>
                <span style={{display:"flex",gap:6}}>
                  <button className="knop lijn klein" style={{padding:"3px 9px",fontSize:11}}
                    onClick={function(){wisselAlles(true);}}>Alles</button>
                  <button className="knop lijn klein" style={{padding:"3px 9px",fontSize:11}}
                    onClick={function(){wisselAlles(false);}}>Geen</button>
                </span>
              </div>
              {gevonden.map(function(w){
                var aan = !!gekozen[w.tijdelijkId];
                return (
                  <div key={w.tijdelijkId} className="imp-rij">
                    <button className={"imp-vink"+(aan?" aan":"")}
                      onClick={function(){
                        setGekozen(function(g){ var n=Object.assign({},g); n[w.tijdelijkId]=!n[w.tijdelijkId]; return n; });
                      }}>
                      <i className="fa-solid fa-check"/>
                    </button>
                    <div className="imp-datum">{formateerDatumKort(w.datum)}{w.tijd?" "+w.tijd:""}</div>
                    <div className="imp-naam">{w.tegenstander}</div>
                    <span className="imp-tag" style={{background:w.thuis?"var(--vlak-info)":"var(--grijs-licht)",color:w.thuis?"var(--blauw)":"var(--grijs-donker)"}}>
                      {w.thuis?"Thuis":"Uit"}
                    </span>
                    {w.dubbel && <span className="imp-tag" style={{background:"var(--vlak-goud)",color:"var(--goud)"}}>Al bekend</span>}
                    {w.onzeker && <span className="imp-tag" style={{background:"var(--vlak-gevaar)",color:"var(--gevaar)"}}>Controleer</span>}
                  </div>
                );
              })}
            </div>

            {gevonden.some(function(w){return w.onzeker;}) && (
              <div className="kaart" style={{background:"var(--vlak-goud)",borderColor:"#e0c56a"}}>
                <div style={{fontSize:12,fontWeight:400,lineHeight:1.6}}>
                  Bij enkele wedstrijden kon ik <strong>{inst().clubNaam}</strong> niet in de titel vinden.
                  Controleer daarvan de tegenstander en thuis/uit na het importeren.
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:10,marginBottom:10}}>
              <button className="knop lijn" style={{flex:1,justifyContent:"center"}}
                onClick={function(){setGevonden(null);}}>Terug</button>
              <button className="knop succes" style={{flex:2,justifyContent:"center"}} onClick={importeer}>
                <i className="fa-solid fa-check"/>{" "+aantalGekozen+" toevoegen"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WEDSTRIJDOPSTELLING (matchday)
═══════════════════════════════════════════════════════════ */
function WedstrijdOpstelling({ wedstrijd, spelers, onOpslaan, onSluiten, inVenster }) {
  const [formatie, setFormatie] = useState(wedstrijd.formatie || "4-3-3A");
  const [formatieOpen, setFormatieOpen] = useState(false);
  const [speelduur, setSpeelduur] = useState(wedstrijd.speelduur || inst().speelduur || 90);
  const [kiesPositie, setKiesPositie] = useState(null);
  const [kiesWissel, setKiesWissel] = useState(false);
  const [tenueKeuze, setTenueKeuze] = useState(function(){ return tenueVanWedstrijd(wedstrijd); });
  /* De keuze hangt aan de wedstrijd en niet aan het tenue zelf: de
     ene week speel je thuis en de andere uit. */
  const tenue = Object.assign({}, laadTenue(), {keuze:tenueKeuze});

  const [toewijzing, setToewijzing] = useState(function(){
    var rijen = wedstrijd.opstelling || [];
    var o = {};
    rijen.forEach(function(r){
      if (r.positieId && (r.spelStatus||"basis")==="basis") o[r.positieId] = r.spelerId;
    });
    if (Object.keys(o).length > 0) return o;
    /* oudere opstelling zonder posities: basisspelers automatisch op het veld zetten */
    var basisIds = rijen.filter(function(r){ return (r.spelStatus||"basis")==="basis"; })
                        .map(function(r){ return r.spelerId; });
    if (basisIds.length === 0) return {};
    var basisSpelers = spelers.filter(function(s){ return basisIds.indexOf(s.id) >= 0; });
    var plekken = FORMATIES_DATA[wedstrijd.formatie || "4-3-3A"] || FORMATIES_DATA["4-3-3A"];
    return vulFormatieAutomatisch(plekken, basisSpelers);
  });
  const [wisselIds, setWisselIds] = useState(function(){
    return (wedstrijd.opstelling||[]).filter(function(r){ return (r.spelStatus||"basis")==="wissel"; })
      .map(function(r){ return r.spelerId; });
  });

  const posities = FORMATIES_DATA[formatie] || FORMATIES_DATA["4-3-3A"];
  function spelerVan(id) { return spelers.find(function(s){ return s.id===id; }) || null; }
  const opgesteldeIds = Object.keys(toewijzing).map(function(k){ return toewijzing[k]; }).filter(Boolean);
  const beschikbaar = spelers.filter(function(s){
    return opgesteldeIds.indexOf(s.id) < 0 && wisselIds.indexOf(s.id) < 0;
  });

  const bezetOverzicht = {};
  posities.forEach(function(p){
    if (toewijzing[p.id]) bezetOverzicht[toewijzing[p.id]] = p.l;
  });
  wisselIds.forEach(function(id){ bezetOverzicht[id] = "de bank"; });

  const veldToewijzing = {};
  posities.forEach(function(p){
    var sp = spelerVan(toewijzing[p.id]);
    if (sp) veldToewijzing[p.id] = sp;
  });

  function zetOpPositie(positieId, speler) {
    setToewijzing(function(o){
      var n = {};
      Object.keys(o).forEach(function(k){ if (o[k]!==speler.id) n[k] = o[k]; });
      n[positieId] = speler.id;
      return n;
    });
    setWisselIds(function(l){ return l.filter(function(x){ return x!==speler.id; }); });
    setKiesPositie(null);
  }
  function haalVanPositie(positieId) {
    setToewijzing(function(o){
      var n = Object.assign({}, o); delete n[positieId]; return n;
    });
    setKiesPositie(null);
  }
  function voegWisselToe(speler) {
    setToewijzing(function(o){
      var n = {};
      Object.keys(o).forEach(function(k){ if (o[k]!==speler.id) n[k] = o[k]; });
      return n;
    });
    setWisselIds(function(l){ return l.indexOf(speler.id)>=0 ? l : l.concat([speler.id]); });
    setKiesWissel(false);
  }

  function bewaar() {
    var rijen = [];
    var plekNamen = plekLabels(posities);
    var isGespeeld = wedstrijd.status === "gespeeld";
    function oudeRij(id) { return (wedstrijd.opstelling||[]).find(function(r){ return r.spelerId===id; }); }
    posities.forEach(function(p){
      var sp = spelerVan(toewijzing[p.id]);
      if (!sp) return;
      var oud = oudeRij(sp.id);
      /* Vastgelegde minuten laten staan, maar alleen als hij in
         dezelfde rol blijft. Zet je een basisspeler op de bank, dan
         hoort zijn negentig minuten niet mee te verhuizen. */
      var zelfdeRol = oud && (oud.spelStatus || "basis") === "basis";
      var min = (isGespeeld && zelfdeRol && Number(oud.minuten) > 0)
        ? Number(oud.minuten) : speelduur;
      rijen.push({spelerId:sp.id, naam:sp.naam, foto:sp.foto, rugnummer:sp.rugnummer,
                  positie:sp.positie, positieId:p.id,
                  positieLabel:(plekNamen[p.id] || p.l), gast:!!sp.gast,
                  spelStatus:"basis", minuten:min});
    });
    wisselIds.forEach(function(id){
      var sp = spelerVan(id);
      if (!sp) return;
      var oud = oudeRij(sp.id);
      var zelfdeRol2 = oud && (oud.spelStatus || "basis") === "wissel";
      var min = (isGespeeld && zelfdeRol2 && Number(oud.minuten) > 0)
        ? Number(oud.minuten) : 0;
      rijen.push({spelerId:sp.id, naam:sp.naam, foto:sp.foto, rugnummer:sp.rugnummer,
                  positie:sp.positie, positieId:null, positieLabel:"", gast:!!sp.gast,
                  spelStatus:"wissel", minuten:min});
    });
    spelers.forEach(function(s){
      if (rijen.some(function(r){ return r.spelerId===s.id; })) return;
      rijen.push({spelerId:s.id, naam:s.naam, foto:s.foto, rugnummer:s.rugnummer,
                  positie:s.positie, positieId:null, positieLabel:"", gast:!!s.gast,
                  spelStatus:"afwezig", minuten:0});
    });
    onOpslaan(Object.assign({}, wedstrijd, {opstelling:rijen, formatie:formatie,
                                            speelduur:speelduur, tenueKeuze:tenueKeuze}));
    meldGoed(opgesteldeIds.length+" in de basis, "+wisselIds.length+" op de bank");
  }

  const eigenNaam = inst().clubNaam || "Wij";
  const links  = wedstrijd.thuis ? eigenNaam : wedstrijd.tegenstander;
  const rechts = wedstrijd.thuis ? wedstrijd.tegenstander : eigenNaam;
  const logo = logoKopbalk(true);

  return (
    <div className={inVenster ? "" : "pagina-slide"}>
      {!inVenster && (
        <button className="back-knop" onClick={onSluiten}><i className="fa-solid fa-arrow-left"/> Terug naar wedstrijd</button>
      )}

      {!inVenster && <div className="md-kop">
        <div className="md-teams">
          <div className="md-team">
            <span className="md-badge">{wedstrijd.thuis ? <img src={logo} alt=""/> : initialen(wedstrijd.tegenstander)}</span>
            <span className="md-team-naam">{links}</span>
          </div>
          <span className="md-vs">VS</span>
          <div className="md-team rechts">
            <span className="md-team-naam">{rechts}</span>
            <span className="md-badge">{wedstrijd.thuis ? initialen(wedstrijd.tegenstander) : <img src={logo} alt=""/>}</span>
          </div>
        </div>
        <div className="md-meta">
          <span>Datum<b>{wedstrijd.datum ? formateerDatumKort(wedstrijd.datum) : "–"}</b></span>
          <span>Tijd<b>{wedstrijd.tijd || "–"}</b></span>
          <span>Waar<b>{wedstrijd.thuis ? "Thuis" : "Uit"}</b></span>
          <span>Duur<b>{speelduur+"'"}</b></span>
          {wedstrijd.locatie && <span>Veld<b>{wedstrijd.locatie}</b></span>}
        </div>
      </div>}

      <div className="kaart" style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:"1 1 150px"}}>
          <label className="formulier-label">Formatie</label>
          <button className="formatie-keuze-knop" style={{marginBottom:0}} onClick={function(){setFormatieOpen(true);}}>
            <span className="formatie-keuze-naam">{formatie}</span>
            <span className="formatie-keuze-hint">{"Wijzig ▼"}</span>
          </button>
        </div>
        <div style={{flex:"0 0 auto"}}>
          <label className="formulier-label">&nbsp;</label>
          <button className="knop lijn klein" style={{marginBottom:0,padding:"11px 13px"}}
            title="Vul de lege plekken met passende spelers"
            onClick={function(){
              var bezetIds = Object.keys(toewijzing).map(function(k){ return toewijzing[k]; }).filter(Boolean);
              var vrij = spelers.filter(function(s){
                return bezetIds.indexOf(s.id) < 0 && wisselIds.indexOf(s.id) < 0;
              });
              var lege = posities.filter(function(p){ return !toewijzing[p.id]; });
              if (lege.length === 0) { toon("Alle plekken zijn al bezet."); return; }
              var extra = vulFormatieAutomatisch(lege, vrij);
              setToewijzing(function(o){ return Object.assign({}, o, extra); });
              meldGoed(Object.keys(extra).length+" plekken ingevuld");
            }}>
            <i className="fa-solid fa-wand-magic-sparkles"/> Vul aan
          </button>
        </div>
        <div style={{width:110}}>
          <label className="formulier-label">Speelduur</label>
          <GetalVeld className="formulier-input" style={{marginBottom:0}} min={20} max={120} leeg={90}
            waarde={speelduur} opWaarde={setSpeelduur} />
        </div>
      </div>

      <div className="md-raster">
        <div>
          <TenueStrook tenue={tenue} keuze={tenueKeuze} opKeuze={setTenueKeuze}/>
          <VeldZoomKnoppen />
          <OpstellingVeld formatie={formatie} toewijzing={veldToewijzing} tenue={tenue}
            aanvoerderId={rollenNu(wedstrijd.rollen).aanvoerder}
            onKlikPositie={function(p){ setKiesPositie(p); }} />
          <p style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:400,textAlign:"center",marginTop:7}}>
            Tik op een plek om een speler te zetten
          </p>
        </div>

        <div>
          <div className="kaart" style={{marginBottom:12}}>
            <div className="kaart-titel">
              <i className="fa-solid fa-people-line"/>
              {" Basis · "+opgesteldeIds.length+" van "+posities.length}
            </div>
            {posities.map(function(p){
              var sp = spelerVan(toewijzing[p.id]);
              return (
                <div key={p.id} className="md-pos-rij" onClick={function(){ setKiesPositie(p); }}>
                  <span className="md-pos-code">{p.l}</span>
                  {sp ? (
                    <span className="md-nr-bol">{sp.rugnummer || initialen(sp.naam)}</span>
                  ) : (
                    <span className="md-nr-bol" style={{background:"var(--grijs)",color:"var(--grijs-donker)"}}>?</span>
                  )}
                  <span className={"md-pos-naam"+(sp?"":" md-pos-leeg")}>{sp ? sp.naam : "nog leeg"}</span>
                  {sp && (
                    <button className="event-verwijder"
                      onClick={function(e){ e.stopPropagation(); haalVanPositie(p.id); }}>×</button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="kaart">
            <div className="kaart-titel">
              <i className="fa-solid fa-chair"/>{" Wisselspelers · "+wisselIds.length}
            </div>
            {wisselIds.length===0 && (
              <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,marginBottom:8}}>Nog niemand op de bank.</p>
            )}
            <div>
              {wisselIds.map(function(id){
                var sp = spelerVan(id);
                if (!sp) return null;
                return (
                  <span key={id} className="md-wissel-chip">
                    <span className="md-nr-bol" style={{background:"var(--oranje)"}}>{sp.rugnummer || initialen(sp.naam)}</span>
                    {sp.naam.split(" ")[0]}
                    <button onClick={function(){ setWisselIds(function(l){ return l.filter(function(x){return x!==id;}); }); }}>×</button>
                  </span>
                );
              })}
            </div>
            <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
              disabled={beschikbaar.length===0}
              onClick={function(){ if(beschikbaar.length) setKiesWissel(true); }}>
              <i className="fa-solid fa-plus"/>{" Wisselspeler toevoegen"+(beschikbaar.length?"":" (niemand over)")}
            </button>
          </div>

          {beschikbaar.length>0 && (
            <div className="kaart">
              <div className="kaart-titel"><i className="fa-solid fa-user-slash"/>{" Niet in de selectie · "+beschikbaar.length}</div>
              <div>
                {beschikbaar.map(function(s){
                  return (
                    <span key={s.id} className="md-wissel-chip" style={{opacity:.72}}>
                      <span className="md-nr-bol" style={{background:"var(--grijs-donker)"}}>{s.rugnummer || initialen(s.naam)}</span>
                      {s.naam.split(" ")[0]}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={inVenster ? "venster-voet venster-voet-plakt" : "modal-voet"}
        style={inVenster ? {} : {position:"static",margin:"14px 0 0",padding:0,border:"none",background:"none"}}>
        <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
        <button className="knop succes" style={{flex:2,justifyContent:"center"}} onClick={bewaar}>
          <i className="fa-solid fa-check"/> Opstelling opslaan
        </button>
      </div>

      {formatieOpen && (
        <div className="formatie-overlay" onClick={function(e){if(e.target===e.currentTarget)setFormatieOpen(false);}}>
          <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="formatie-sheet-header">
              <span className="formatie-sheet-titel">Kies formatie</span>
              <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
                onClick={function(){setFormatieOpen(false);}}>{"✕"}</button>
            </div>
            {FORMATIE_GROEPEN.map(function(groep){
              return (
                <div key={groep.label}>
                  <div className="formatie-groep-label">{groep.label}</div>
                  <div className="formatie-groep-grid">
                    {groep.namen.map(function(naam){
                      return (
                        <button key={naam} className={"formatie-chip"+(formatie===naam?" actief":"")}
                          onClick={function(){
                            var huidigeIds = Object.keys(toewijzing).map(function(k){ return toewijzing[k]; }).filter(Boolean);
                            var behoud = spelers.filter(function(s){ return huidigeIds.indexOf(s.id) >= 0; });
                            var nieuwePlekken = FORMATIES_DATA[naam] || FORMATIES_DATA["4-3-3A"];
                            setFormatie(naam);
                            setToewijzing(behoud.length ? vulFormatieAutomatisch(nieuwePlekken, behoud) : {});
                            setFormatieOpen(false);
                          }}>
                          {naam}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {kiesPositie && (
        <SpelerKeuzeModal titel={"Wie op "+kiesPositie.l+"?"}
          spelers={spelers}
          plekRol={POSITIECODE_NAAR_ROL[kiesPositie.l]}
          bezet={bezetOverzicht}
          onKies={function(s){ zetOpPositie(kiesPositie.id, s); }}
          onSluiten={function(){ setKiesPositie(null); }} />
      )}
      {kiesWissel && (
        <SpelerKeuzeModal titel="Wie op de bank?"
          spelers={beschikbaar}
          onKies={voegWisselToe}
          onSluiten={function(){ setKiesWissel(false); }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WEDSTRIJD DETAIL
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   DODE SPELMOMENTEN
   Waar staat iedereen bij een corner of een vrije trap? De
   spelersrollen zeggen al wie hem neemt; hier leg je vast wat
   de rest doet. Je kijkt altijd van onder naar boven, zoals op
   een tactiekbord: bij "voor" vallen wij aan naar boven, bij
   "tegen" staat ons eigen doel onderaan.
═══════════════════════════════════════════════════════════ */
/* Acht situaties in plaats van vier. "Corner" heet hier hoekschop, want
   zo staat het in het spelreglement en zo zegt een scheidsrechter het.

   De aftrap en de inworp zijn erbij gekomen omdat dat de twee momenten
   zijn waarop je een wedstrijd begint of hervat en waar iedereen dus
   ergens moet staan — en de doelschop omdat dat het moment is waarop
   je als team het veld weer opbouwt of juist druk zet. */
const DSM_SITUATIES = [
  {id:"aftrap",         label:"Aftrap",           kort:"AF",
   icoon:"fa-solid fa-circle-play",    kleur:"#334155", aanvallend:true,
   uitleg:"Het begin, en na een doelpunt", rollen:[]},
  {id:"corner-voor",    label:"Hoekschop voor",   kort:"HV",
   icoon:"fa-solid fa-flag",           kleur:"#0891b2", aanvallend:true,
   uitleg:"Wij nemen de hoekschop",    rollen:["hoek-links","hoek-rechts"]},
  {id:"corner-tegen",   label:"Hoekschop tegen",  kort:"HT",
   icoon:"fa-solid fa-shield-halved",  kleur:"#b3261e", aanvallend:false,
   uitleg:"Zij nemen de hoekschop",    rollen:[]},
  {id:"vt-voor",        label:"Vrije trap voor",  kort:"VV",
   icoon:"fa-solid fa-bullseye",       kleur:"#0d9488", aanvallend:true,
   uitleg:"Wij nemen de vrije trap",   rollen:["vrije-trap"]},
  {id:"vt-tegen",       label:"Vrije trap tegen", kort:"VT",
   icoon:"fa-solid fa-people-line",    kleur:"#7f1d1d", aanvallend:false,
   uitleg:"Zij nemen de vrije trap",   rollen:[]},
  {id:"inworp",         label:"Inworp",           kort:"IN",
   icoon:"fa-solid fa-hands",          kleur:"#7c3aed", aanvallend:true,
   uitleg:"Wij gooien in vanaf de zijlijn", rollen:[]},
  {id:"doelschop-voor", label:"Doelschop voor",   kort:"DV",
   icoon:"fa-solid fa-futbol",         kleur:"#15803d", aanvallend:true,
   uitleg:"Wij bouwen op vanaf de doellijn", rollen:[]},
  {id:"doelschop-tegen",label:"Doelschop tegen",  kort:"DT",
   icoon:"fa-solid fa-arrows-down-to-line", kleur:"#9a3412", aanvallend:false,
   uitleg:"Zij trappen uit, wij zetten druk", rollen:[]}
];
function dsmSituatie(id) {
  return DSM_SITUATIES.filter(function(s){ return s.id===id; })[0] || DSM_SITUATIES[0];
}
/* ── LIJNEN OP HET BORD ──────────────────────────────────────
   Dezelfde notatie als de tekentool bij trainingen, zodat een
   looplijn er overal hetzelfde uitziet. De punten worden één keer
   berekend en daarna zowel op het scherm als in de PDF getekend;
   zo kunnen die twee niet uit elkaar lopen. */
const DSM_LIJN_SOORTEN = [
  {id:"looplijn",    label:"Loop",    icoon:"fa-solid fa-arrow-right-long",
   uitleg:"Loopactie zonder bal",  streep:true},
  {id:"passlijn",    label:"Pass",    icoon:"fa-solid fa-arrow-right-to-bracket",
   uitleg:"Pass of inspeelbal"},
  {id:"dribbellijn", label:"Dribbel", icoon:"fa-solid fa-wave-square",
   uitleg:"Met de bal aan de voet"},
  {id:"schietlijn",  label:"Schot",   icoon:"fa-solid fa-bolt",
   uitleg:"Doelpoging",            dik:true},
  {id:"voorzetlijn", label:"Voorzet", icoon:"fa-solid fa-arrow-trend-up",
   uitleg:"Bal door de lucht"}
];
function dsmLijnSoort(id) {
  return DSM_LIJN_SOORTEN.filter(function(s){ return s.id===id; })[0] || DSM_LIJN_SOORTEN[0];
}
const DSM_PIJL = 2.6;      /* lengte van de pijlpunt in veldeenheden */

/* De lijn zelf als reeks punten. De laatste punten wijzen de
   pijl de goede kant op, ook bij een boog of een golf. */
function dsmLijnPunten(l) {
  var dx = l.x2 - l.x1, dy = l.y2 - l.y1;
  var dist = Math.sqrt(dx*dx + dy*dy) || 1;
  var ux = dx/dist, uy = dy/dist, nx = -uy, ny = ux;
  var eind = Math.max(0.4, dist - DSM_PIJL);
  var pnt = [], i, s;

  if (l.type === "dribbellijn") {
    /* Golf die naar het eind toe uitdempt, anders staat de pijl scheef */
    var golf = 6.5, amp = 1.45;
    var n = Math.max(14, Math.round(eind/0.5));
    for (i = 0; i <= n; i++) {
      s = (i/n) * eind;
      var demp = Math.min(1, (1 - i/n) / 0.18);
      var o = Math.sin(s/golf * Math.PI * 2) * amp * demp;
      pnt.push([l.x1 + ux*s + nx*o, l.y1 + uy*s + ny*o]);
    }
  } else if (l.type === "schietlijn") {
    /* Bliksemknik: vooruit, schuin terug, en weer vooruit */
    pnt.push([l.x1, l.y1]);
    if (dist > 14) {
      var A = Math.min(3, dist*0.11);
      pnt.push([l.x1 + ux*dist*0.60 + nx*A, l.y1 + uy*dist*0.60 + ny*A]);
      pnt.push([l.x1 + ux*dist*0.40 - nx*A, l.y1 + uy*dist*0.40 - ny*A]);
    }
    pnt.push([l.x1 + ux*eind, l.y1 + uy*eind]);
  } else if (l.type === "voorzetlijn") {
    var b = (Number(l.bocht) === -1) ? -1 : 1;
    var cx = (l.x1 + l.x2)/2 - dy*0.28*b;
    var cy = (l.y1 + l.y2)/2 + dx*0.28*b;
    var m = 20, tot = eind/dist;
    for (i = 0; i <= m; i++) {
      var t = (i/m) * tot, mt = 1 - t;
      pnt.push([mt*mt*l.x1 + 2*mt*t*cx + t*t*l.x2,
                mt*mt*l.y1 + 2*mt*t*cy + t*t*l.y2]);
    }
  } else {
    pnt.push([l.x1, l.y1]);
    pnt.push([l.x1 + ux*eind, l.y1 + uy*eind]);
  }
  return pnt;
}
/* De pijlpunt als driehoek, in de richting van het laatste stukje lijn */
function dsmLijnPijl(pnt) {
  var n = pnt.length;
  var a = pnt[Math.max(0, n-2)], b = pnt[n-1];
  var dx = b[0]-a[0], dy = b[1]-a[1];
  var d = Math.sqrt(dx*dx + dy*dy) || 1;
  var ux = dx/d, uy = dy/d, nx = -uy, ny = ux;
  var br = DSM_PIJL * 0.42;
  return [[b[0] + ux*DSM_PIJL, b[1] + uy*DSM_PIJL],
          [b[0] - nx*br,       b[1] - ny*br],
          [b[0] + nx*br,       b[1] + ny*br]];
}
/* Halverwege de lijn, voor het nummertje. Niet het middelste punt
   pakken: een rechte lijn heeft er maar twee, dan zou het nummer
   onder de pijlpunt belanden. We lopen de lijn af tot de helft
   van de werkelijke lengte. */
function dsmLijnMidden(pnt) {
  if (pnt.length < 2) return {x: pnt[0][0], y: pnt[0][1]};
  var stukken = [], totaal = 0, i;
  for (i = 1; i < pnt.length; i++) {
    var d = Math.hypot(pnt[i][0]-pnt[i-1][0], pnt[i][1]-pnt[i-1][1]);
    stukken.push(d); totaal += d;
  }
  if (!totaal) return {x: pnt[0][0], y: pnt[0][1]};
  var doel = totaal/2, gelopen = 0;
  for (i = 0; i < stukken.length; i++) {
    if (gelopen + stukken[i] >= doel) {
      var t = stukken[i] ? (doel - gelopen) / stukken[i] : 0;
      return {x: pnt[i][0] + (pnt[i+1][0]-pnt[i][0]) * t,
              y: pnt[i][1] + (pnt[i+1][1]-pnt[i][1]) * t};
    }
    gelopen += stukken[i];
  }
  return {x: pnt[pnt.length-1][0], y: pnt[pnt.length-1][1]};
}
/* Hoe ver ligt een punt van de lijn af? Voor het aantikken. */
function dsmAfstandTotLijn(l, x, y) {
  var pnt = dsmLijnPunten(l), best = Infinity;
  for (var i = 1; i < pnt.length; i++) {
    var ax = pnt[i-1][0], ay = pnt[i-1][1];
    var bx = pnt[i][0],   by = pnt[i][1];
    var dx = bx-ax, dy = by-ay;
    var len = dx*dx + dy*dy;
    var t = len ? Math.max(0, Math.min(1, ((x-ax)*dx + (y-ay)*dy) / len)) : 0;
    var d = Math.hypot(x - (ax + t*dx), y - (ay + t*dy));
    if (d < best) best = d;
  }
  return best;
}
function dsmLijnen(wedstrijd, situatieId) {
  var b = dsmBord(wedstrijd, situatieId);
  return b.lijnen || [];
}

const DSM_KANTEN = [
  {id:"eigen", label:"Wij",           kleur:"#004aad", op:"#ffffff"},
  {id:"tegen", label:"Tegenstander",  kleur:"#b3261e", op:"#ffffff"},
  {id:"bal",   label:"Bal",           kleur:"#ffffff", op:"#111111"}
];
function dsmKant(id) {
  return DSM_KANTEN.filter(function(k){ return k.id===id; })[0] || DSM_KANTEN[0];
}

/* Beginopstellingen. Niemand begint graag met een leeg veld, dus
   elke situatie heeft een fatsoenlijke basis die je daarna
   versleept. Coördinaten lopen van 0 tot 100 breed en 0 tot 77
   diep, met het doel bovenaan. */
const DSM_START = {
  "corner-voor": [
    {kant:"bal",   x:3.5, y:3,    naam:"bal"},
    {kant:"eigen", x:8.5, y:8,    naam:"nemer"},
    {kant:"eigen", x:17,  y:15,   naam:"kort"},
    {kant:"eigen", x:41.5,y:12.5, naam:"1e paal"},
    {kant:"eigen", x:50,  y:16,   naam:"midden"},
    {kant:"eigen", x:58.5,y:12.5, naam:"2e paal"},
    {kant:"eigen", x:50,  y:27,   naam:"rand"},
    {kant:"eigen", x:37,  y:55,   naam:"rest"},
    {kant:"eigen", x:63,  y:55,   naam:"rest"},
    {kant:"tegen", x:50,  y:4.5,  naam:"keeper"},
    {kant:"tegen", x:45,  y:8,    naam:""},
    {kant:"tegen", x:55,  y:8,    naam:""},
    {kant:"tegen", x:36.5,y:15,   naam:""},
    {kant:"tegen", x:63.5,y:15,   naam:""},
    {kant:"tegen", x:50,  y:21.5, naam:""},
    {kant:"tegen", x:23.5,y:12,   naam:""},
    {kant:"tegen", x:50,  y:42,   naam:""}
  ],
  "corner-tegen": [
    {kant:"bal",   x:3.5, y:3,    naam:"bal"},
    {kant:"tegen", x:8.5, y:8,    naam:"nemer"},
    {kant:"tegen", x:17,  y:15,   naam:"kort"},
    {kant:"tegen", x:41.5,y:12.5, naam:""},
    {kant:"tegen", x:50,  y:16,   naam:""},
    {kant:"tegen", x:58.5,y:12.5, naam:""},
    {kant:"tegen", x:50,  y:27,   naam:""},
    {kant:"eigen", x:50,  y:4.5,  naam:"keeper"},
    {kant:"eigen", x:45,  y:8,    naam:"1e paal"},
    {kant:"eigen", x:55,  y:8,    naam:"2e paal"},
    {kant:"eigen", x:36.5,y:15,   naam:"man"},
    {kant:"eigen", x:63.5,y:15,   naam:"man"},
    {kant:"eigen", x:50,  y:21.5, naam:"man"},
    {kant:"eigen", x:23.5,y:12,   naam:"kort"},
    {kant:"eigen", x:50,  y:33,   naam:"2e bal"},
    {kant:"eigen", x:50,  y:52,   naam:"voorin"}
  ],
  "vt-voor": [
    {kant:"bal",   x:44,  y:30,   naam:"bal"},
    {kant:"eigen", x:39.5,y:34.5, naam:"nemer"},
    {kant:"eigen", x:49.5,y:33.5, naam:"aflegger"},
    {kant:"eigen", x:41,  y:9,    naam:"1e paal"},
    {kant:"eigen", x:57,  y:11,   naam:"2e paal"},
    {kant:"eigen", x:60,  y:22,   naam:""},
    {kant:"eigen", x:33,  y:27,   naam:"rebound"},
    {kant:"eigen", x:37,  y:55,   naam:"rest"},
    {kant:"eigen", x:63,  y:55,   naam:"rest"},
    {kant:"tegen", x:52,  y:4.5,  naam:"keeper"},
    {kant:"tegen", x:41.7,y:16.1, naam:"muur"},
    {kant:"tegen", x:45.0,y:16.8, naam:"muur"},
    {kant:"tegen", x:48.4,y:17.6, naam:"muur"},
    {kant:"tegen", x:51.7,y:18.3, naam:"muur"},
    {kant:"tegen", x:35,  y:13,   naam:""},
    {kant:"tegen", x:63,  y:13,   naam:""}
  ],
  "vt-tegen": [
    {kant:"bal",   x:44,  y:30,   naam:"bal"},
    {kant:"tegen", x:39.5,y:34.5, naam:"nemer"},
    {kant:"tegen", x:49.5,y:33.5, naam:""},
    {kant:"tegen", x:41,  y:9,    naam:""},
    {kant:"tegen", x:57,  y:11,   naam:""},
    {kant:"tegen", x:60,  y:22,   naam:""},
    {kant:"tegen", x:33,  y:27,   naam:""},
    {kant:"eigen", x:52,  y:4.5,  naam:"keeper"},
    {kant:"eigen", x:41.7,y:16.1, naam:"muur"},
    {kant:"eigen", x:45.0,y:16.8, naam:"muur"},
    {kant:"eigen", x:48.4,y:17.6, naam:"muur"},
    {kant:"eigen", x:51.7,y:18.3, naam:"muur"},
    {kant:"eigen", x:35,  y:13,   naam:"man"},
    {kant:"eigen", x:63,  y:13,   naam:"man"},
    {kant:"eigen", x:50,  y:24,   naam:"man"},
    {kant:"eigen", x:50,  y:52,   naam:"voorin"}
  ]
};
const DSM_BREED = 100, DSM_DIEP = 77;
const DSM_R_SPELER = 2.8, DSM_R_BAL = 2.0;

/* Alle veldmaten op één plek, in echte meters omgerekend. Scherm en
   PDF rekenen hier allebei mee, zodat ze niet uit elkaar kunnen lopen.
   Let op: breedte en diepte hebben een net iets andere schaal (1,2%
   verschil), dus de boog is strikt genomen een ellips. */
function dsmVeldMaten() {
  var rand = 1.5;
  var breed = DSM_BREED - 2*rand;          /* 97 eenheden voor 68 m   */
  var diep  = DSM_DIEP  - 2*rand;          /* 74 eenheden voor 52,5 m */
  var hx = breed/68, hy = diep/52.5;
  return {
    rand:rand, breed:breed, diep:diep, hx:hx, hy:hy,
    mid: DSM_BREED/2,
    onder: rand + diep,
    zestienB: 40.32*hx, zestienD: 16.5*hy, zestienLijn: rand + 16.5*hy,
    vijfB: 18.32*hx,    vijfD: 5.5*hy,
    doelB: 7.32*hx,
    stipY: rand + 11*hy,
    rx: 9.15*hx, ry: 9.15*hy,
    /* Waar snijdt de cirkel om de stip de zestienlijn? De stip ligt
       11 m van de lijn af, de zestien op 16,5 m: dat scheelt 5,5 m. */
    boogHalf: Math.sqrt(9.15*9.15 - 5.5*5.5) * hx,
    hoekR: 1*hx
  };
}
/* Bij een tegen-situatie staat ons eigen doel onderaan, zodat je
   altijd van onder naar boven kijkt zoals op een tactiekbord. De
   opgeslagen y blijft gewoon de afstand tot dat doel. */
function dsmOmgekeerd(situatie) { return !situatie.aanvallend; }
function dsmSchermY(situatie, y) {
  return dsmOmgekeerd(situatie) ? DSM_DIEP - y : y;
}

/* Nieuwe stukken krijgen een eigen nummer, ook als je er twee in
   dezelfde milliseconde bijzet. */
var _dsmTeller = 0;
function dsmNieuwId() { _dsmTeller++; return "d" + Date.now() + "-" + _dsmTeller; }

function dsmStartOpstelling(situatieId) {
  return (DSM_START[situatieId] || []).map(function(s){
    return {id:dsmNieuwId(), kant:s.kant, x:s.x, y:s.y, naam:s.naam, spelerId:null};
  });
}
/* Alles binnen de lijnen houden, anders sleep je een speler het
   veld af en is hij onvindbaar. */
function dsmBegrens(x, y) {
  return {x: Math.max(2.5, Math.min(DSM_BREED-2.5, x)),
          y: Math.max(2.5, Math.min(DSM_DIEP-2.5, y))};
}
function dsmSpiegel(stukken) {
  return (stukken||[]).map(function(s){
    return Object.assign({}, s, {x: +(DSM_BREED - s.x).toFixed(1)});
  });
}
function dsmBord(wedstrijd, situatieId) {
  var alles = wedstrijd && wedstrijd.dsm ? wedstrijd.dsm : {};
  var b = alles[situatieId] || {};
  return {stukken: b.stukken || [], lijnen: b.lijnen || [], notitie: b.notitie || ""};
}
/* Hoeveel situaties zijn er ingevuld? Voor het tellertje op de knop. */
function dsmIngevuld(wedstrijd) {
  return DSM_SITUATIES.filter(function(s){
    var b = dsmBord(wedstrijd, s.id);
    return b.stukken.length > 0 || b.lijnen.length > 0 || b.notitie.trim();
  }).length;
}
/* Wie neemt hem? Uit de spelersrollen, zodat je het niet twee
   keer hoeft in te vullen. */
function dsmNemers(situatie, rollen, spelers) {
  return (situatie.rollen||[]).map(function(rid){
    var rol = WEDSTRIJD_ROLLEN.filter(function(r){ return r.id===rid; })[0];
    var sp  = (spelers||[]).filter(function(s){ return s.id===(rollen||{})[rid]; })[0];
    return (rol && sp) ? {rol:rol, speler:sp} : null;
  }).filter(Boolean);
}

/* Het halve veld zelf: alleen de lijnen, in maten die kloppen.
   68 bij 52,5 meter wordt 100 bij 77 eenheden. */
function DSMVeldLijnen({ omgekeerd }) {
  const v = dsmVeldMaten();
  /* Bij een omgekeerd veld spiegelen we de hele tekening in één keer.
     Dat kan hier zonder bezwaar: er staat geen tekst tussen. */
  const draai = omgekeerd ? "translate(0,"+DSM_DIEP+") scale(1,-1)" : null;
  return (
    <g transform={draai||undefined}
       stroke="rgba(255,255,255,.55)" strokeWidth="0.45" fill="none">
      <rect x={v.rand} y={v.rand} width={v.breed} height={v.diep} rx="1"/>
      <rect x={v.mid-v.zestienB/2} y={v.rand} width={v.zestienB} height={v.zestienD}/>
      <rect x={v.mid-v.vijfB/2}    y={v.rand} width={v.vijfB}    height={v.vijfD}/>
      <rect x={v.mid-v.doelB/2} y={v.rand-1.3} width={v.doelB} height="1.3"
        fill="rgba(255,255,255,.8)" stroke="none"/>
      <circle cx={v.mid} cy={v.stipY} r="0.55" fill="rgba(255,255,255,.7)" stroke="none"/>
      {/* De halve maan: precies op de zestienlijn beginnen en eindigen */}
      <path d={"M "+(v.mid-v.boogHalf)+" "+v.zestienLijn+
               " A "+v.rx+" "+v.ry+" 0 0 0 "+(v.mid+v.boogHalf)+" "+v.zestienLijn}/>
      {/* Middencirkel, de helft die op deze speelhelft ligt */}
      <path d={"M "+(v.mid-v.rx)+" "+v.onder+
               " A "+v.rx+" "+v.ry+" 0 0 1 "+(v.mid+v.rx)+" "+v.onder}/>
      {/* Hoekbogen van één meter */}
      <path d={"M "+v.rand+" "+(v.rand+v.hoekR)+
               " A "+v.hoekR+" "+v.hoekR+" 0 0 0 "+(v.rand+v.hoekR)+" "+v.rand}/>
      <path d={"M "+(DSM_BREED-v.rand-v.hoekR)+" "+v.rand+
               " A "+v.hoekR+" "+v.hoekR+" 0 0 0 "+(DSM_BREED-v.rand)+" "+(v.rand+v.hoekR)}/>
    </g>
  );
}

/* Eén bord: sleep de poppetjes waar je ze hebben wilt. Werkt met
   de muis en met een vinger; pointer-events dekken allebei af. */
function DSMLijn({ lijn, omgekeerd, gekozen, klikbaar, onKies }) {
  const soort = dsmLijnSoort(lijn.type);
  const pnt = dsmLijnPunten(lijn);
  const dr = function(punten){
    return punten.map(function(q){
      return q[0].toFixed(2)+","+(omgekeerd ? DSM_DIEP-q[1] : q[1]).toFixed(2);
    }).join(" ");
  };
  const mid = dsmLijnMidden(pnt);
  const midY = omgekeerd ? DSM_DIEP - mid.y : mid.y;
  const kleur = gekozen ? "#ffd400" : "#ffffff";
  return (
    <g className={klikbaar ? "dsm-lijn" : ""}
      onPointerDown={klikbaar ? function(e){ e.stopPropagation(); onKies(lijn.id); } : undefined}>
      {/* Brede onzichtbare lijn eroverheen, anders is aantikken priegelen */}
      {klikbaar && <polyline points={dr(pnt)} fill="none" stroke="transparent" strokeWidth="4.5"/>}
      <polyline points={dr(pnt)} fill="none" stroke="rgba(0,0,0,.45)"
        strokeWidth={(soort.dik?1.5:1.15)+0.7} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={soort.streep ? "2.6 1.7" : undefined}/>
      <polyline points={dr(pnt)} fill="none" stroke={kleur}
        strokeWidth={soort.dik?1.5:1.15} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={soort.streep ? "2.6 1.7" : undefined}/>
      <polygon points={dr(dsmLijnPijl(pnt))} fill={kleur} stroke="rgba(0,0,0,.45)" strokeWidth="0.4"/>
      {lijn.nummer ? (
        <g style={{pointerEvents:"none"}}>
          <circle cx={mid.x} cy={midY} r="2.3" fill="rgba(0,0,0,.62)" stroke={kleur} strokeWidth="0.4"/>
          <text x={mid.x} y={midY+0.95} textAnchor="middle" fill="#ffffff"
            style={{fontSize:"2.7px",fontWeight:800}}>{lijn.nummer}</text>
        </g>
      ) : null}
    </g>
  );
}

function DSMBord({ stukken, onWijzig, onKies, gekozenId, omgekeerd,
                   lijnen, onLijnen, modus, gekozenLijnId, onKiesLijn }) {
  const svgRef = useRef(null);
  const sleep = useRef(null);
  /* Tijdens het slepen houden we de stand hier vast en niet in de
     wedstrijd. Anders zou elke muisbeweging een opslag zijn: tientallen
     schrijfacties per seconde en een knipperende bewaarmelding. Pas
     als je loslaat gaat het één keer naar de wedstrijd toe. */
  const [tijdelijk, setTijdelijk] = useState(null);
  const tonen = tijdelijk || stukken;
  /* De lijn die je op dit moment aan het trekken bent */
  const [bezig, setBezig] = useState(null);
  const tekenen = modus && modus !== "verplaats";

  /* Schermpunt naar veldcoördinaat. De viewBox schaalt mee met de
     breedte, dus we rekenen met de werkelijke afmeting. */
  function naarVeld(e) {
    const vak = svgRef.current.getBoundingClientRect();
    if (!vak.width || !vak.height) return null;
    const x = (e.clientX - vak.left) / vak.width  * DSM_BREED;
    let   y = (e.clientY - vak.top)  / vak.height * DSM_DIEP;
    /* Opgeslagen wordt altijd de afstand tot het doel van deze
       situatie, ook als het veld op zijn kop op het scherm staat. */
    if (omgekeerd) y = DSM_DIEP - y;
    return dsmBegrens(x, y);
  }

  function pak(e, stuk) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const punt = naarVeld(e);
    sleep.current = {id:stuk.id,
                     grijpX: punt ? punt.x - stuk.x : 0,
                     grijpY: punt ? punt.y - stuk.y : 0,
                     startX: punt ? punt.x : 0,
                     startY: punt ? punt.y : 0,
                     versleept:false};
  }
  function beweeg(e) {
    const s = sleep.current;
    if (!s) return;
    const punt = naarVeld(e);
    if (!punt) return;
    /* Een tik is nooit helemaal stil. Pas vanaf anderhalve eenheid
       — ruim een halve meter — noemen we het slepen; daaronder blijft
       het een tik en opent straks het bewerkvenster. */
    if (Math.abs(punt.x - s.startX) > 1.5 || Math.abs(punt.y - s.startY) > 1.5) s.versleept = true;
    if (!s.versleept) return;
    const plek = dsmBegrens(punt.x - s.grijpX, punt.y - s.grijpY);
    setTijdelijk((tijdelijk || stukken).map(function(st){
      return st.id===s.id ? Object.assign({}, st, {x:+plek.x.toFixed(1), y:+plek.y.toFixed(1)}) : st;
    }));
  }
  function los(e, stuk) {
    const s = sleep.current;
    sleep.current = null;
    /* Alleen getikt, niet gesleept? Dan wil je hem bewerken. */
    if (s && !s.versleept) { setTijdelijk(null); onKies(stuk.id); return; }
    if (tijdelijk) { onWijzig(tijdelijk); setTijdelijk(null); }
  }

  /* ── Een lijn trekken ── */
  function lijnStart(e) {
    if (!tekenen) return;
    const punt = naarVeld(e);
    if (!punt) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setBezig({type:modus, x1:punt.x, y1:punt.y, x2:punt.x, y2:punt.y});
  }
  function lijnRek(e) {
    if (!bezig) return;
    const punt = naarVeld(e);
    if (!punt) return;
    setBezig(function(b){ return Object.assign({}, b, {x2:punt.x, y2:punt.y}); });
  }
  function lijnKlaar() {
    if (!bezig) return;
    const lang = Math.hypot(bezig.x2-bezig.x1, bezig.y2-bezig.y1);
    setBezig(null);
    /* Een tik is geen lijn: onder de vier eenheden gooien we hem weg */
    if (lang < 4) return;
    onLijnen((lijnen||[]).concat([Object.assign({}, bezig, {id:dsmNieuwId(), nummer:""})]));
  }

  return (
    <div className="dsm-veld">
      <svg ref={svgRef} viewBox={"0 0 "+DSM_BREED+" "+DSM_DIEP}
        className={"dsm-svg"+(tekenen?" tekenstand":"")} style={{touchAction:"none"}}
        onPointerDown={lijnStart} onPointerMove={lijnRek}
        onPointerUp={lijnKlaar} onPointerCancel={function(){ setBezig(null); }}>
        <rect x="0" y="0" width={DSM_BREED} height={DSM_DIEP} fill="var(--veld-groen)" rx="2"/>
        {[0,1,2,3,4,5].map(function(i){
          return i%2===0 ? null : (
            <rect key={i} x="0" y={i*DSM_DIEP/6} width={DSM_BREED} height={DSM_DIEP/6}
              fill="rgba(255,255,255,.035)"/>
          );
        })}
        <DSMVeldLijnen omgekeerd={omgekeerd}/>
        {(lijnen||[]).map(function(l){
          return <DSMLijn key={l.id} lijn={l} omgekeerd={omgekeerd}
            gekozen={gekozenLijnId===l.id} klikbaar={!tekenen} onKies={onKiesLijn}/>;
        })}
        {bezig && <DSMLijn lijn={bezig} omgekeerd={omgekeerd} gekozen klikbaar={false} onKies={function(){}}/>}
        {tonen.map(function(st){
          const k = dsmKant(st.kant);
          const gekozen = gekozenId===st.id;
          const bal = st.kant==="bal";
          const r = bal ? DSM_R_BAL : DSM_R_SPELER;
          /* Het bijschrift blijft altijd ónder de bol op het scherm,
             ook als het veld gespiegeld is — anders staat het los. */
          const cx = st.x, cy = omgekeerd ? DSM_DIEP - st.y : st.y;
          return (
            <g key={st.id} className="dsm-stuk"
              style={tekenen ? {pointerEvents:"none"} : undefined}
              onPointerDown={tekenen ? undefined : function(e){ e.stopPropagation(); pak(e, st); }}
              onPointerMove={tekenen ? undefined : beweeg}
              onPointerUp={tekenen ? undefined : function(e){ los(e, st); }}
              onPointerCancel={function(){ sleep.current=null; setTijdelijk(null); }}>
              <circle cx={cx} cy={cy} r={r+0.9} fill="rgba(0,0,0,.3)"/>
              <circle cx={cx} cy={cy} r={r} fill={k.kleur}
                stroke={gekozen ? "#ffd400" : (bal ? "#111111" : "rgba(255,255,255,.85)")}
                strokeWidth={gekozen ? 1 : 0.4}/>
              {!bal && st.nummer && (
                <text x={cx} y={cy+0.95} textAnchor="middle" fill={k.op}
                  style={{fontSize:"2.7px",fontWeight:800,pointerEvents:"none"}}>
                  {st.nummer}
                </text>
              )}
              {st.naam && (
                <text x={cx} y={cy+r+2.8} textAnchor="middle" fill="#ffffff"
                  style={{fontSize:"2.5px",fontWeight:700,pointerEvents:"none",
                          paintOrder:"stroke", stroke:"rgba(0,0,0,.6)", strokeWidth:"0.55px"}}>
                  {st.naam}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DSMSectie({ wedstrijd, spelers, onOpslaan }) {
  const [situatie, setSituatie] = useState(DSM_SITUATIES[0].id);
  const [gekozenId, setGekozenId] = useState(null);
  const [modus, setModus] = useState("verplaats");
  const [gekozenLijnId, setGekozenLijnId] = useState(null);
  const s = dsmSituatie(situatie);
  const bord = dsmBord(wedstrijd, situatie);
  const gekozen = bord.stukken.filter(function(x){ return x.id===gekozenId; })[0] || null;
  const gekozenLijn = bord.lijnen.filter(function(x){ return x.id===gekozenLijnId; })[0] || null;
  const nemers = dsmNemers(s, rollenNu(wedstrijd.rollen), spelers);

  function schrijf(velden) {
    var alles = Object.assign({}, wedstrijd.dsm||{});
    alles[situatie] = Object.assign({}, bord, velden);
    onOpslaan(Object.assign({}, wedstrijd, {dsm:alles}));
  }
  function zetStukken(nieuw) { schrijf({stukken:nieuw}); }
  function zetLijnen(nieuw)  { schrijf({lijnen:nieuw}); }
  function wijzigLijn(id, velden) {
    zetLijnen(bord.lijnen.map(function(l){
      return l.id===id ? Object.assign({}, l, velden) : l;
    }));
  }
  function wisLijn(id) {
    zetLijnen(bord.lijnen.filter(function(l){ return l.id!==id; }));
    setGekozenLijnId(null);
  }
  /* Het eerstvolgende vrije nummer, zodat looplijn 1, 2, 3 vanzelf oploopt */
  function volgendNummer() {
    var gebruikt = bord.lijnen.map(function(l){ return Number(l.nummer)||0; });
    for (var i = 1; i <= 20; i++) if (gebruikt.indexOf(i) === -1) return String(i);
    return "";
  }

  function voegToe(kant) {
    var plek = kant==="bal" ? {x:50, y:38} : {x:50, y:60};
    zetStukken(bord.stukken.concat([{id:dsmNieuwId(), kant:kant,
      x:plek.x, y:plek.y, naam:"", nummer:"", spelerId:null}]));
  }
  function wijzigStuk(id, velden) {
    zetStukken(bord.stukken.map(function(st){
      return st.id===id ? Object.assign({}, st, velden) : st;
    }));
  }
  function wisStuk(id) {
    zetStukken(bord.stukken.filter(function(st){ return st.id!==id; }));
    setGekozenId(null);
  }
  function koppel(id, spelerId) {
    var sp = spelers.filter(function(x){ return x.id===spelerId; })[0];
    wijzigStuk(id, sp ? {spelerId:sp.id, naam:sp.naam.split(" ")[0], nummer:sp.rugnummer||""}
                      : {spelerId:null});
  }

  const telling = DSM_KANTEN.map(function(k){
    return {kant:k, aantal: bord.stukken.filter(function(x){ return x.kant===k.id; }).length};
  });

  return (
    <div>
      <div className="tabs dsm-tabs">
        {DSM_SITUATIES.map(function(x){
          var b = dsmBord(wedstrijd, x.id);
          var vol = b.stukken.length>0 || b.lijnen.length>0 || b.notitie.trim();
          return (
            <button key={x.id} className={"tab-knop"+(situatie===x.id?" actief":"")}
              onClick={function(){ setSituatie(x.id); setGekozenId(null); setGekozenLijnId(null); }}>
              <i className={x.icoon} style={{color:situatie===x.id?x.kleur:"inherit"}}/> {x.label}
              {vol && <i className="fa-solid fa-circle-check dsm-vink"/>}
            </button>
          );
        })}
      </div>

      <div className="dsm-kop">
        <div>
          <div className="dsm-titel" style={{color:s.kleur}}>
            <i className={s.icoon}/> {s.label}
          </div>
          <div className="dsm-uitleg">
            {s.uitleg} · {s.aanvallend
              ? "wij vallen aan naar boven, het doel bovenaan is dat van de tegenstander"
              : "zij vallen aan naar beneden, ons eigen doel staat onderaan"}
          </div>
        </div>
        <div className="dsm-kop-knoppen">
          <button className="knop lijn klein" title="Links en rechts omdraaien"
            onClick={function(){ zetStukken(dsmSpiegel(bord.stukken)); }}
            disabled={!bord.stukken.length}>
            <i className="fa-solid fa-right-left"/> Spiegelen
          </button>
          <button className="knop lijn klein"
            onClick={function(){ zetStukken(dsmStartOpstelling(situatie)); setGekozenId(null); setGekozenLijnId(null); }}>
            <i className="fa-solid fa-wand-magic-sparkles"/> {bord.stukken.length ? "Opnieuw" : "Beginopstelling"}
          </button>
        </div>
      </div>

      {nemers.length>0 && (
        <div className="dsm-nemers">
          <i className="fa-solid fa-user-tag"/>
          <span>Volgens de spelersrollen: </span>
          {nemers.map(function(n){
            return (
              <span key={n.rol.id} className="dsm-nemer" style={{background:n.rol.kleur}}>
                {n.rol.label}: {n.speler.naam}
              </span>
            );
          })}
        </div>
      )}

      <div className="dsm-gereedschap">
        <button className={"dsm-tool"+(modus==="verplaats"?" actief":"")}
          onClick={function(){ setModus("verplaats"); }} title="Poppetjes verslepen">
          <i className="fa-solid fa-up-down-left-right"/> Verplaatsen
        </button>
        <span className="dsm-tool-scheiding"/>
        {DSM_LIJN_SOORTEN.map(function(t){
          return (
            <button key={t.id} className={"dsm-tool"+(modus===t.id?" actief":"")}
              onClick={function(){ setModus(modus===t.id ? "verplaats" : t.id); setGekozenId(null); }}
              title={t.uitleg}>
              <i className={t.icoon}/> {t.label}
            </button>
          );
        })}
      </div>

      <DSMBord stukken={bord.stukken} onWijzig={zetStukken} omgekeerd={dsmOmgekeerd(s)}
        onKies={function(id){ setGekozenLijnId(null); setGekozenId(id); }} gekozenId={gekozenId}
        lijnen={bord.lijnen} onLijnen={zetLijnen} modus={modus}
        gekozenLijnId={gekozenLijnId}
        onKiesLijn={function(id){ setGekozenId(null); setGekozenLijnId(id); }} />

      <div className="dsm-toevoegrij">
        {DSM_KANTEN.map(function(k){
          var t = telling.filter(function(x){ return x.kant.id===k.id; })[0];
          return (
            <button key={k.id} className="knop lijn klein" style={{flex:1,justifyContent:"center"}}
              onClick={function(){ voegToe(k.id); }}>
              <span className="dsm-bol" style={{background:k.kleur,
                borderColor: k.id==="bal" ? "#111" : "transparent"}}/>
              {k.label}
              <span className="dsm-aantal">{t.aantal}</span>
            </button>
          );
        })}
      </div>
      <p className="dsm-hint">
        {modus==="verplaats"
          ? "Sleep een poppetje naar zijn plek. Eén tik opent de naam, het rugnummer en de prullenbak; tik een lijn aan om die te bewerken."
          : "Sleep over het veld van waar de "+dsmLijnSoort(modus).label.toLowerCase()+" begint naar waar hij eindigt."}
      </p>
      {bord.lijnen.length>0 && (
        <div className="dsm-lijnrij">
          <span className="dsm-lijnrij-kop">{bord.lijnen.length} {bord.lijnen.length===1?"lijn":"lijnen"}</span>
          {DSM_LIJN_SOORTEN.map(function(t){
            var n = bord.lijnen.filter(function(l){ return l.type===t.id; }).length;
            return n ? (
              <span key={t.id} className="dsm-lijntel"><i className={t.icoon}/> {n}</span>
            ) : null;
          })}
          <button className="knop lijn klein" style={{marginLeft:"auto"}}
            onClick={function(){ zetLijnen([]); setGekozenLijnId(null); }}>
            <i className="fa-solid fa-eraser"/> Alle lijnen weg
          </button>
        </div>
      )}

      {gekozenLijn && (
        <div className="kaart dsm-bewerk">
          <div className="kaart-titel" style={{justifyContent:"space-between"}}>
            <span><i className={dsmLijnSoort(gekozenLijn.type).icoon}/> {dsmLijnSoort(gekozenLijn.type).label}</span>
            <button className="knop gevaar klein" onClick={function(){ wisLijn(gekozenLijn.id); }}>
              <i className="fa-solid fa-trash"/> Weghalen
            </button>
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Soort</label>
            <div className="dsm-gereedschap" style={{margin:0}}>
              {DSM_LIJN_SOORTEN.map(function(t){
                return (
                  <button key={t.id} className={"dsm-tool"+(gekozenLijn.type===t.id?" actief":"")}
                    onClick={function(){ wijzigLijn(gekozenLijn.id, {type:t.id}); }}>
                    <i className={t.icoon}/> {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="formulier-rij">
            <div className="formulier-groep">
              <label className="formulier-label">Nummer (1 t/m 20)</label>
              <div style={{display:"flex",gap:6}}>
                <input className="formulier-input" value={gekozenLijn.nummer||""} maxLength={2}
                  placeholder="geen" style={{flex:1}}
                  onChange={function(e){
                    var v = e.target.value.replace(/[^0-9]/g,"");
                    if (Number(v) > 20) v = "20";
                    wijzigLijn(gekozenLijn.id, {nummer:v});
                  }} />
                <button className="knop lijn klein"
                  onClick={function(){ wijzigLijn(gekozenLijn.id, {nummer:volgendNummer()}); }}>
                  <i className="fa-solid fa-hashtag"/> Volgende
                </button>
              </div>
            </div>
            <div className="formulier-groep">
              <label className="formulier-label">Richting</label>
              <div style={{display:"flex",gap:6}}>
                <button className="knop lijn klein" style={{flex:1,justifyContent:"center"}}
                  onClick={function(){ wijzigLijn(gekozenLijn.id, {
                    x1:gekozenLijn.x2, y1:gekozenLijn.y2, x2:gekozenLijn.x1, y2:gekozenLijn.y1}); }}>
                  <i className="fa-solid fa-right-left"/> Omdraaien
                </button>
                {gekozenLijn.type==="voorzetlijn" && (
                  <button className="knop lijn klein" style={{flex:1,justifyContent:"center"}}
                    onClick={function(){ wijzigLijn(gekozenLijn.id,
                      {bocht: Number(gekozenLijn.bocht)===-1 ? 1 : -1}); }}>
                    <i className="fa-solid fa-arrows-turn-to-dots"/> Bocht
                  </button>
                )}
              </div>
            </div>
          </div>
          <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:4}}
            onClick={function(){ setGekozenLijnId(null); }}>Klaar</button>
        </div>
      )}

      {gekozen && (
        <div className="kaart dsm-bewerk">
          <div className="kaart-titel" style={{justifyContent:"space-between"}}>
            <span>
              <span className="dsm-bol" style={{background:dsmKant(gekozen.kant).kleur,
                borderColor: gekozen.kant==="bal" ? "#111" : "transparent"}}/>
              {dsmKant(gekozen.kant).label}
            </span>
            <button className="knop gevaar klein" onClick={function(){ wisStuk(gekozen.id); }}>
              <i className="fa-solid fa-trash"/> Weghalen
            </button>
          </div>
          {gekozen.kant!=="bal" && (
            <div className="formulier-rij">
              <div className="formulier-groep">
                <label className="formulier-label">Label</label>
                <input className="formulier-input" value={gekozen.naam||""} maxLength={12}
                  placeholder="1e paal, muur, man…"
                  onChange={function(e){ wijzigStuk(gekozen.id, {naam:e.target.value}); }} />
              </div>
              <div className="formulier-groep">
                <label className="formulier-label">Nummer</label>
                <input className="formulier-input" value={gekozen.nummer||""} maxLength={2}
                  onChange={function(e){ wijzigStuk(gekozen.id, {nummer:e.target.value.replace(/[^0-9]/g,"")}); }} />
              </div>
            </div>
          )}
          {gekozen.kant==="eigen" && (
            <div className="formulier-groep" style={{marginBottom:0}}>
              <label className="formulier-label">Of kies een speler uit de selectie</label>
              <select className="formulier-input" value={gekozen.spelerId||""}
                onChange={function(e){ koppel(gekozen.id, e.target.value?Number(e.target.value):null); }}>
                <option value="">Geen naam</option>
                {sorteerOpLinie(spelers.slice()).map(function(sp){
                  return <option key={sp.id} value={sp.id}>{(sp.rugnummer?"#"+sp.rugnummer+"  ":"")+sp.naam}</option>;
                })}
              </select>
            </div>
          )}
          <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:10}}
            onClick={function(){ setGekozenId(null); }}>Klaar</button>
        </div>
      )}

      <div className="formulier-groep" style={{marginTop:12}}>
        <label className="formulier-label">Afspraken bij {s.label.toLowerCase()}</label>
        <textarea className="formulier-input" rows={3} value={bord.notitie}
          placeholder={s.aanvallend
            ? "Wie loopt wanneer in, waar valt de bal, wie blijft achter voor de counter…"
            : "Wie neemt wie, wie dekt de korte variant, wie vangt de tweede bal op…"}
          onChange={function(e){ schrijf({notitie:e.target.value}); }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPELERSROLLEN — wie neemt de corners, de penalty, de band
═══════════════════════════════════════════════════════════ */
function RollenSectie({ wedstrijd, spelers, alleWedstrijden, onOpslaan }) {
  const [kiesRol, setKiesRol] = useState(null);
  const [buitenNaam, setBuitenNaam] = useState("");
  const rollen = rollenNu(wedstrijd.rollen);
  const ingevuld = WEDSTRIJD_ROLLEN.filter(function(r){ return rollen[r.id]; }).length;

  function speler(id) { return (spelers||[]).filter(function(s){ return s.id===id; })[0] || null; }

  function zet(rolId, spelerId) {
    var nieuw = Object.assign({}, rollen);
    if (spelerId) nieuw[rolId] = spelerId; else delete nieuw[rolId];
    onOpslaan(Object.assign({}, wedstrijd, {rollen: nieuw}));
    setKiesRol(null);
    setBuitenNaam("");
  }
  function zetBuiten() {
    var n = buitenNaam.trim();
    if (!n || !kiesRol) return;
    zet(kiesRol, n);
  }

  function neemOver() {
    var bron = laatsteRollen(alleWedstrijden, wedstrijd.id);
    if (!bron) { meldFout("Er is nog geen eerdere wedstrijd met rollen"); return; }
    /* Alleen spelers die nog in de selectie zitten — en namen van buiten,
       want die staan sowieso niet in de selectie en zijn juist degenen die
       je van vorige week wilt overnemen. */
    var geldig = {};
    Object.keys(bron.rollen||{}).forEach(function(k){
      var wie = rolPersoon(bron.rollen[k], spelers);
      if (!wie) return;
      if (wie.speler || !speler(bron.rollen[k])) geldig[k] = bron.rollen[k];
    });
    var vorige = rollen;
    onOpslaan(Object.assign({}, wedstrijd, {rollen: geldig}));
    toon("Rollen overgenomen van "+bron.tegenstander, {
      actieLabel:"Ongedaan",
      actie:function(){ onOpslaan(Object.assign({}, wedstrijd, {rollen: vorige})); }
    });
  }

  /* Wijst beide vlaghelften toe aan wie het minst aan de beurt is geweest */
  function verdeelVlaggen() {
    var eerste = volgendeVlagger(spelers, alleWedstrijden, []);
    if (!eerste) { meldFout("Je hebt nog geen spelers in de selectie"); return; }
    var tweede = volgendeVlagger(spelers, alleWedstrijden, [eerste.id]) || eerste;
    var vorige = rollen;
    onOpslaan(Object.assign({}, wedstrijd, {
      rollen: Object.assign({}, rollen, {"vlag-1": eerste.id, "vlag-2": tweede.id})
    }));
    toon("Vlaggen: "+eerste.naam.split(" ")[0]+" en "+tweede.naam.split(" ")[0], {
      actieLabel:"Ongedaan",
      actie:function(){ onOpslaan(Object.assign({}, wedstrijd, {rollen: vorige})); }
    });
  }

  function leegMaken() {
    var vorige = rollen;
    onOpslaan(Object.assign({}, wedstrijd, {rollen: {}}));
    toon("Alle rollen leeggemaakt", {
      actieLabel:"Ongedaan",
      actie:function(){ onOpslaan(Object.assign({}, wedstrijd, {rollen: vorige})); }
    });
  }

  const kiesInfo = kiesRol ? rolInfo(kiesRol) : null;

  return (
    <div className="kaart detail-sectie">
      <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <span><i className="fa-solid fa-user-tag"/> Spelersrollen</span>
        <span style={{display:"flex",gap:6,alignItems:"center"}}>
          <span className="rol-tel">{ingevuld+" van "+WEDSTRIJD_ROLLEN.length}</span>
          <button className="knop lijn klein" style={{padding:"4px 10px",fontSize:11}} onClick={verdeelVlaggen}
            title="Wijst beide helften toe aan wie het minst heeft gevlagd">
            <i className="fa-solid fa-flag-checkered"/> Vlaggers
          </button>
          <button className="knop lijn klein" style={{padding:"4px 10px",fontSize:11}} onClick={neemOver}>
            <i className="fa-solid fa-clock-rotate-left"/> Vorige
          </button>
          {ingevuld>0 && (
            <button className="knop lijn klein" style={{padding:"4px 9px",fontSize:11}} onClick={leegMaken}
              title="Alle rollen leegmaken">
              <i className="fa-solid fa-eraser"/>
            </button>
          )}
        </span>
      </div>

      <div className="rol-raster">
        {WEDSTRIJD_ROLLEN.map(function(rol){
          var wie = rolPersoon(rollen[rol.id], spelers);
          var sp = wie && wie.speler;
          var isVlag = VLAG_ROLLEN.indexOf(rol.id) >= 0;
          var aantal = sp ? (isVlag ? vlagTelling(sp.id, alleWedstrijden)
                                    : rolTelling(rol.id, sp.id, alleWedstrijden)) : 0;
          return (
            <button key={rol.id} className={"rol-kaart"+(sp?" gevuld":"")}
              onClick={function(){
                setKiesRol(rol.id);
                setBuitenNaam(wie && !wie.speler ? wie.naam : "");
              }}>
              <span className="rol-icoon" style={{background:rol.kleur}}>
                <i className={rol.icoon}/>
                <span className="rol-kort">{rol.kort}</span>
              </span>
              <span style={{flex:1,minWidth:0}}>
                <span className="rol-naam" style={{display:"block"}}>{rol.label}</span>
                {wie ? (
                  <span className="rol-speler">
                    {sp
                      ? <span className="rol-bol"><SpelerBeeld speler={sp}/></span>
                      : <span className="rol-bol rol-buiten"><i className="fa-solid fa-user"/></span>}
                    <span style={{fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {wie.rugnummer ? "#"+wie.rugnummer+" "+wie.naam : wie.naam}
                    </span>
                  </span>
                ) : (
                  <span className="rol-leeg">Nog niemand</span>
                )}
              </span>
              {aantal>1 && <span className="rol-tel" style={{flexShrink:0}}>{aantal+"x"}</span>}
              <i className="fa-solid fa-chevron-right" style={{fontSize:11,color:"var(--grijs-donker)",flexShrink:0}}/>
            </button>
          );
        })}
      </div>

      {kiesRol && (
        <div className="modal-overlay" style={{zIndex:430}}
          onClick={function(e){ if(e.target===e.currentTarget) setKiesRol(null); }}>
          <div className="modal-sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="modal-greep"/>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <span className="rol-icoon" style={{background:kiesInfo.kleur}}>
                <i className={kiesInfo.icoon}/>
              </span>
              <span style={{minWidth:0}}>
                <div className="modal-titel" style={{marginBottom:2}}>{kiesInfo.label}</div>
                <div style={{fontSize:12,color:"var(--grijs-donker)"}}>{kiesInfo.uitleg}</div>
              </span>
            </div>

            {kiesInfo.extern && (
              <div className="rol-buitenveld">
                <label className="formulier-label">Iemand die niet in de selectie zit</label>
                <div style={{display:"flex",gap:8}}>
                  <input className="formulier-input" style={{margin:0,flex:1}}
                    placeholder="Naam" value={buitenNaam}
                    onChange={function(e){ setBuitenNaam(e.target.value); }}
                    onKeyDown={function(e){ if(e.key==="Enter") zetBuiten(); }}/>
                  <button className="knop klein" disabled={!buitenNaam.trim()} onClick={zetBuiten}>
                    Kiezen
                  </button>
                </div>
              </div>
            )}

            <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginBottom:12}}
              onClick={function(){ zet(kiesRol, null); }}>
              <i className="fa-solid fa-xmark"/> Niemand aanwijzen
            </button>

            <div style={{display:"flex",flexDirection:"column",gap:6,paddingBottom:8}}>
              {sorteerOpLinie(spelers).map(function(s){
                var aan = rollen[kiesRol]===s.id;
                var vaker = VLAG_ROLLEN.indexOf(kiesRol) >= 0
                  ? vlagTelling(s.id, alleWedstrijden)
                  : rolTelling(kiesRol, s.id, alleWedstrijden);
                var anders = rollenVanSpeler(wedstrijd, s.id).filter(function(r){ return r.id!==kiesRol; });
                return (
                  <button key={s.id} className="rol-kaart" style={aan?{borderColor:"var(--blauw)",background:"var(--vlak-info)"}:{}}
                    onClick={function(){ zet(kiesRol, s.id); }}>
                    <span className="rol-bol" style={{width:34,height:34}}><SpelerBeeld speler={s}/></span>
                    <span style={{flex:1,minWidth:0}}>
                      <span className="rol-naam" style={{display:"block"}}>
                        {s.rugnummer ? "#"+s.rugnummer+" "+s.naam : s.naam}
                      </span>
                      <span style={{fontSize:11,color:"var(--grijs-donker)",display:"flex",gap:7,flexWrap:"wrap",marginTop:2}}>
                        <span>{s.positie||"Geen positie"}</span>
                        {vaker>0 && <span>{vaker+(VLAG_ROLLEN.indexOf(kiesRol)>=0?"x gevlagd":"x eerder")}</span>}
                        {anders.map(function(r){
                          return <span key={r.id} style={{color:r.kleur,fontWeight:700}}>
                            <i className={r.icoon}/>{" "+r.kort}
                          </span>;
                        })}
                      </span>
                    </span>
                    {aan && <i className="fa-solid fa-check" style={{color:"var(--blauw)",flexShrink:0}}/>}
                  </button>
                );
              })}
            </div>

            <div className="modal-voet">
              <button className="knop lijn" style={{flex:1,justifyContent:"center"}}
                onClick={function(){ setKiesRol(null); }}>Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TACTIEK PER WEDSTRIJD
   Teaminstructie in vier fases, plus per speler één aanvallende
   en één verdedigende opdracht. Alles vrij te typen; de suggesties
   zijn er alleen om sneller te beginnen.
═══════════════════════════════════════════════════════════ */
const TACTIEK_FASES = [
  {id:"plan",        label:"Wedstrijdplan",   icoon:"fa-solid fa-clipboard-list", kleur:"var(--blauw)",
   hint:"Bijv. de eerste 5 minuten vol druk, daarna inzakken en via de counter de aanval zoeken."},
  {id:"balbezit",    label:"In balbezit",     icoon:"fa-solid fa-futbol",        kleur:"#0d9488",
   hint:"Hoe bouwen we op, waar zoeken we de ruimte?"},
  {id:"balverlies",  label:"Bij balverlies",  icoon:"fa-solid fa-shield-halved", kleur:"#dc2626",
   hint:"Waar zetten we druk, wanneer zakken we in?"},
  {id:"omschakeling",label:"Omschakeling",    icoon:"fa-solid fa-arrows-rotate", kleur:"#ea580c",
   hint:"Wat doen we in de eerste seconden na balverlies of balverovering?"}
];

/* Voorzetjes per linie, zodat je niet vanaf nul hoeft te typen */
const TAAK_IDEEEN = {
  Keeper: {
    aanval: ["Rustig opbouwen van achteruit","Zoek de vrije man op de flank","Snel inspelen na een redding"],
    verdediging: ["Coach je verdediging hardop","Kom eruit bij ballen achter de linie","Sta hoog mee als wij druk zetten"]
  },
  Verdediger: {
    aanval: ["Opkomende vleugelverdediger, speel hoog in balbezit","Kies voor de veilige pass naar binnen","Zoek de diepe bal over de linie"],
    verdediging: ["Bij balverlies kort op je directe man","Knijp naar binnen als de bal aan de andere kant is","Houd de linie strak, geen gaten"]
  },
  Middenvelder: {
    aanval: ["Vraag de bal tussen de linies","Loop mee in de zestien bij een voorzet","Wissel het spel snel naar de andere kant"],
    verdediging: ["Sluit de ruimte voor de verdediging","Jaag de balbezitter op","Blijf achter de bal als wij aanvallen"]
  },
  Aanvaller: {
    aanval: ["Blijf op de laatste man","Zoek de diepte achter de verdediging","Kom kort en leg af"],
    verdediging: ["Zet de eerste druk op de opbouw","Stuur de tegenstander naar de zijlijn","Sluit de bal terug naar de keeper af"]
  }
};
function taakIdeeen(speler, opstelling) {
  var rol = ROL_VOLGORDE[linieVanSpeler(speler, opstelling)] || speler.positie || "Middenvelder";
  return TAAK_IDEEEN[rol] || TAAK_IDEEEN.Middenvelder;
}

function WedstrijdTactiek({ wedstrijd, spelers, onOpslaan }) {
  const [gekozen, setGekozen] = useState(null);      // speler waarvan we de taken invullen
  const [tekenOpen, setTekenOpen] = useState(false);
  const [meerFases, setMeerFases] = useState(false);
  const [aanval, setAanval] = useState("");
  const [verdediging, setVerdediging] = useState("");
  /* Tijdens het typen alleen hier bijhouden; opslaan gebeurt bij verlaten
     van het veld, anders wordt bij elke toets de hele wedstrijdlijst weggeschreven. */
  const [tekst, setTekst] = useState(function(){ return Object.assign({}, wedstrijd.tactiek||{}); });

  const tactiek = wedstrijd.tactiek || {};
  const instructies = wedstrijd.instructies || {};
  const posities = FORMATIES_DATA[wedstrijd.formatie] || FORMATIES_DATA["4-3-3A"];
  const opstelling = wedstrijd.opstelling || [];

  function spelerVan(id) { return (spelers||[]).filter(function(s){ return s.id===id; })[0] || null; }

  /* De elf op het veld, met hun opdrachten eraan geplakt */
  const veld = {};
  posities.forEach(function(p){
    var rij = opstelling.filter(function(o){ return o.positieId===p.id && (o.spelStatus||"basis")==="basis"; })[0];
    var sp = rij ? spelerVan(rij.spelerId) : null;
    if (!sp) return;
    var t = instructies[sp.id] || {};
    veld[p.id] = Object.assign({}, sp, {
      aanvalInstructie: t.aanval || "",
      verdedigingInstructie: t.verdediging || ""
    });
  });

  const basisIds = Object.keys(veld).map(function(k){ return veld[k].id; });
  const bank = (spelers||[]).filter(function(s){
    if (basisIds.indexOf(s.id) >= 0) return false;
    var rij = opstelling.filter(function(o){ return o.spelerId===s.id; })[0];
    return rij && (rij.spelStatus||"basis") !== "afwezig";
  });

  const metTaak = (spelers||[]).filter(function(s){
    var t = instructies[s.id] || {};
    return (t.aanval||"").trim() || (t.verdediging||"").trim();
  });

  function zetFase(id, waarde) {
    onOpslaan(Object.assign({}, wedstrijd, {tactiek: Object.assign({}, tactiek, {[id]: waarde})}));
  }

  function open(sp) {
    var t = instructies[sp.id] || {};
    setAanval(t.aanval || "");
    setVerdediging(t.verdediging || "");
    setGekozen(sp);
  }

  function bewaarTaken() {
    var nieuw = Object.assign({}, instructies);
    var a = aanval.trim(), v = verdediging.trim();
    if (a || v) nieuw[gekozen.id] = {aanval:a, verdediging:v};
    else delete nieuw[gekozen.id];
    onOpslaan(Object.assign({}, wedstrijd, {instructies: nieuw}));
    setGekozen(null);
  }

  function wisTaken() {
    var nieuw = Object.assign({}, instructies);
    delete nieuw[gekozen.id];
    onOpslaan(Object.assign({}, wedstrijd, {instructies: nieuw}));
    setGekozen(null);
  }

  const ideeen = gekozen ? taakIdeeen(gekozen, opstelling) : null;

  return (
    <div className="kaart detail-sectie">
      <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <span><i className="fa-solid fa-chess-board"/> Tactiek</span>
        <span className="rol-tel">{metTaak.length>0 ? metTaak.length+" spelers met een opdracht" : "nog geen opdrachten"}</span>
      </div>

      {/* ── Teaminstructie ── */}
      {TACTIEK_FASES.filter(function(f){
        return f.id==="plan" || meerFases || (tekst[f.id]||"").trim();
      }).map(function(f){
        return (
          <div key={f.id} className="tac-fase">
            <div className="tac-fase-kop">
              <span className="tac-fase-icoon" style={{background:f.kleur}}><i className={f.icoon}/></span>
              {f.label}
            </div>
            <textarea className="formulier-input" rows="2" value={tekst[f.id]||""}
              placeholder={f.hint} style={{resize:"vertical",marginBottom:0}}
              onChange={function(e){
                var w = e.target.value;
                setTekst(function(o){ var n=Object.assign({},o); n[f.id]=w; return n; });
              }}
              onBlur={function(e){ zetFase(f.id, e.target.value); }} />
          </div>
        );
      })}

      {!meerFases && TACTIEK_FASES.filter(function(f){
        return f.id!=="plan" && !(tekst[f.id]||"").trim();
      }).length>0 && (
        <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",margin:"4px 0 10px"}}
          onClick={function(){ setMeerFases(true); }}>
          <i className="fa-solid fa-plus"/> Balbezit, balverlies en omschakeling
        </button>
      )}

      {/* ── Tactische tekening ── */}
      <div className="tac-fase">
        <div className="tac-fase-kop">
          <span className="tac-fase-icoon" style={{background:"#7c3aed"}}><i className="fa-solid fa-pen-ruler"/></span>
          Tactische tekening
        </div>
        {tekenOpen ? (
          <div>
            <TrainingTekenBord
              value={tactiek.tekening}
              onChange={function(d){ zetFase("tekening", d); }}
              pdfNaam={"Tactiek "+(wedstrijd.tegenstander||"wedstrijd")}
              pdfInfo={{type:"Tactiek", beschrijving:(wedstrijd.tactiek||{}).plan||"",
                        aandachtspunten:[(wedstrijd.tactiek||{}).balbezit,(wedstrijd.tactiek||{}).balverlies,
                                         (wedstrijd.tactiek||{}).omschakeling].filter(Boolean).join("\n")}} />
            <button className="knop succes" style={{width:"100%",justifyContent:"center",marginTop:10}}
              onClick={function(){ setTekenOpen(false); }}>
              <i className="fa-solid fa-check"/> Klaar met tekenen
            </button>
          </div>
        ) : (
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="knop lijn klein" style={{flex:"1 1 180px",justifyContent:"center"}}
              onClick={function(){ setTekenOpen(true); }}>
              <i className="fa-solid fa-pen-ruler"/> {tactiek.tekening ? "Tekening aanpassen" : "Tekening maken"}
            </button>
            {tactiek.tekening && (
              <button className="knop gevaar klein" style={{padding:"7px 11px"}}
                onClick={function(){ zetFase("tekening", null); }} title="Tekening verwijderen">
                <i className="fa-solid fa-trash"/>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Opdracht per speler ── */}
      <div className="tac-fase">
        <div className="tac-fase-kop">
          <span className="tac-fase-icoon" style={{background:"var(--oranje)"}}><i className="fa-solid fa-user-pen"/></span>
          Opdracht per speler
        </div>
        {Object.keys(veld).length === 0 ? (
          <div style={{fontSize:12,color:"var(--grijs-donker)",lineHeight:1.6}}>
            Stel eerst je basisopstelling samen, dan kun je hier per speler een opdracht geven.
          </div>
        ) : (
          <div>
            <div style={{fontSize:12,color:"var(--grijs-donker)",marginBottom:9}}>
              Tik een speler aan op het veld. Een oranje stip betekent dat hij al een opdracht heeft.
            </div>
            <OpstellingVeld formatie={wedstrijd.formatie} toewijzing={veld}
              tenue={Object.assign({}, laadTenue(), {keuze:tenueVanWedstrijd(wedstrijd)})}
              aanvoerderId={rollenNu(wedstrijd.rollen).aanvoerder}
              onKlikPositie={function(pos){ if (veld[pos.id]) open(veld[pos.id]); }} />
          </div>
        )}

        {bank.length>0 && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",textTransform:"uppercase",letterSpacing:.5,marginBottom:7,fontFamily:"'Helvetica Neue',Arial"}}>
              Wissels
            </div>
            <div className="bord-knoppen">
              {bank.map(function(s){
                var t = instructies[s.id] || {};
                var heeft = (t.aanval||"").trim() || (t.verdediging||"").trim();
                return (
                  <button key={s.id} className="knop lijn klein"
                    style={{padding:"5px 9px",fontSize:11,borderColor:heeft?"var(--oranje)":"var(--grijs)"}}
                    onClick={function(){ open(s); }}>
                    {heeft && <i className="fa-solid fa-circle" style={{fontSize:6,color:"var(--oranje)"}}/>}
                    {" "+(s.rugnummer?"#"+s.rugnummer+" ":"")+s.naam.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Overzicht van de opdrachten ── */}
      {metTaak.length>0 && (
        <div className="tac-fase" style={{borderBottom:"none",paddingBottom:0}}>
          <div className="tac-fase-kop">
            <span className="tac-fase-icoon" style={{background:"var(--grijs-donker)"}}><i className="fa-solid fa-list-ul"/></span>
            Alle opdrachten
          </div>
          {sorteerOpLinie(metTaak, opstelling).map(function(s){
            var t = instructies[s.id] || {};
            return (
              <div key={s.id} className="tac-rij" onClick={function(){ open(s); }}>
                <span className="rol-bol" style={{width:30,height:30}}><SpelerBeeld speler={s}/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span className="rol-naam" style={{display:"block"}}>
                    {(s.rugnummer?"#"+s.rugnummer+" ":"")+s.naam}
                  </span>
                  {t.aanval && <span className="tac-opdracht aanval"><i className="fa-solid fa-arrow-up"/> {t.aanval}</span>}
                  {t.verdediging && <span className="tac-opdracht verdediging"><i className="fa-solid fa-shield-halved"/> {t.verdediging}</span>}
                </span>
                <i className="fa-solid fa-pen" style={{fontSize:11,color:"var(--grijs-donker)",flexShrink:0}}/>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Invulvenster ── */}
      {gekozen && (
        <div className="modal-overlay" style={{zIndex:430}}
          onClick={function(e){ if(e.target===e.currentTarget) setGekozen(null); }}>
          <div className="modal-sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="modal-greep"/>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <span className="rol-bol" style={{width:44,height:44}}><SpelerBeeld speler={gekozen}/></span>
              <span style={{minWidth:0}}>
                <div className="modal-titel" style={{marginBottom:2}}>{gekozen.naam}</div>
                <div style={{fontSize:12,color:"var(--grijs-donker)"}}>
                  {(gekozen.rugnummer?"#"+gekozen.rugnummer+" · ":"")+(gekozen.positie||"Geen positie")}
                </div>
              </span>
            </div>

            <div className="formulier-groep">
              <label className="formulier-label" style={{color:"var(--succes)"}}>
                <i className="fa-solid fa-arrow-up"/> Aanvallende opdracht
              </label>
              <textarea className="formulier-input" rows="2" value={aanval}
                placeholder="bijv. Opkomende vleugelverdediger, speel hoog in balbezit"
                style={{resize:"vertical"}} onChange={function(e){ setAanval(e.target.value); }} />
              <div className="tac-tips">
                {ideeen.aanval.map(function(tip,i){
                  return <button key={i} className="tac-tip" onClick={function(){ setAanval(tip); }}>{tip}</button>;
                })}
              </div>
            </div>

            <div className="formulier-groep">
              <label className="formulier-label" style={{color:"var(--gevaar)"}}>
                <i className="fa-solid fa-shield-halved"/> Verdedigende opdracht
              </label>
              <textarea className="formulier-input" rows="2" value={verdediging}
                placeholder="bijv. Bij balverlies kort op je directe man gaan staan"
                style={{resize:"vertical"}} onChange={function(e){ setVerdediging(e.target.value); }} />
              <div className="tac-tips">
                {ideeen.verdediging.map(function(tip,i){
                  return <button key={i} className="tac-tip" onClick={function(){ setVerdediging(tip); }}>{tip}</button>;
                })}
              </div>
            </div>

            <div className="modal-voet">
              <button className="knop gevaar klein" style={{padding:"9px 12px"}} onClick={wisTaken}
                title="Opdrachten wissen">
                <i className="fa-solid fa-trash"/>
              </button>
              <button className="knop lijn" style={{flex:1,justifyContent:"center"}}
                onClick={function(){ setGekozen(null); }}>Annuleren</button>
              <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={bewaarTaken}>
                <i className="fa-solid fa-check"/> Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Popup met een vaste kop en voet, zodat de inhoud ertussen kan scrollen. */
function WerkVenster({ titel, subtitel, breed, kopExtra, eigenVoet, onSluiten, children }) {
  useEffect(function(){
    function toets(e){ if(e.key==="Escape") onSluiten(); }
    var vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", toets);
    return function(){
      document.body.style.overflow = vorige;
      window.removeEventListener("keydown", toets);
    };
  }, []);
  return ReactDOM.createPortal(
    <div className="venster-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className={"venster"+(breed?" breed":"")} onClick={function(e){e.stopPropagation();}}>
        <div className="venster-kop">
          <div style={{flex:1,minWidth:0}}>
            <div className="venster-titel">{titel}</div>
            {subtitel && <div className="venster-sub">{subtitel}</div>}
          </div>
          {kopExtra}
          <button className="venster-sluit" onClick={onSluiten} aria-label="Sluiten" title="Sluiten (Escape)">
            <i className="fa-solid fa-xmark"/>
          </button>
        </div>
        <div className="venster-body">{children}</div>
        {!eigenVoet && (
          <div className="venster-voet">
            <button className="knop" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>
              <i className="fa-solid fa-check"/> Klaar
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* Laat kort zien dat er iets is weggeschreven.

   Hier stond permanent "Wordt vanzelf bewaard". Dat is een belofte, en
   een belofte die er altijd staat leest niemand meer — hij wordt deel
   van de achtergrond. Erger: hij neemt ruimte in de kopbalk in, op elk
   scherm, voor een mededeling die alleen op één moment iets zegt.

   Nu verschijnt er alleen iets ná een wijziging: "Opgeslagen", en dan
   weer weg. Dat is het moment waarop je het wilt weten, en het enige. */
function BewaarMelder({ teller }) {
  const [net, setNet] = useState(false);
  const eerste = useRef(true);
  useEffect(function(){
    if (eerste.current) { eerste.current = false; return; }
    setNet(true);
    var t = setTimeout(function(){ setNet(false); }, 1800);
    return function(){ clearTimeout(t); };
  }, [teller]);
  if (!net) return null;
  return (
    <span className="bewaar-melder net">
      <i className="fa-solid fa-circle-check"/>
      {" Opgeslagen"}
    </span>
  );
}

/* Gasten beheren bij één wedstrijd */
/* ══ UITGELEEND ══════════════════════════════════════════════
   De tegenhanger van gastspelers: daar komt er iemand bij, hier gaat er
   iemand weg. Ze staan naast elkaar omdat het dezelfde zaterdag is en
   dezelfde vraag: wie speelt er waar.

   Deze kaart verschijnt vanzelf zodra je bij de opgave iemand op
   uitgeleend zet. Je hoeft dus niet eerst hier te zijn geweest om te
   weten dat dit bestaat.
   ══════════════════════════════════════════════════════════ */
function UitleenSectie({ wedstrijd, spelers, alleWedstrijden, onOpslaan }) {
  const uit = uitgeleendIn(wedstrijd);
  if (!uit.length) return null;

  /* Teams waar je eerder naartoe hebt uitgeleend: dan hoef je "JO19-1"
     niet elke week opnieuw te typen. */
  const eerder = [];
  (alleWedstrijden || []).forEach(function (w) {
    Object.keys((w && w.uitleen) || {}).forEach(function (k) {
      var n = String(w.uitleen[k].naar || "").trim();
      if (n && eerder.indexOf(n) < 0) eerder.push(n);
    });
  });

  function schrijf(spelerId, veld, waarde) {
    var nu = uitleenVan(wedstrijd, spelerId) || {};
    var nieuw = Object.assign({}, nu); nieuw[veld] = waarde;
    onOpslaan(Object.assign({}, wedstrijd,
      {uitleen: zetUitleen(wedstrijd, spelerId, nieuw)}));
  }

  return (
    <div className="kaart detail-sectie">
      <div className="kaart-titel"><i className="fa-solid fa-right-left"/> Uitgeleend</div>
      {uit.map(function (id) {
        const s = (spelers || []).filter(function (x) { return String(x.id) === String(id); })[0];
        const r = uitleenVan(wedstrijd, id) || {};
        return (
          <div key={id} className="uitleen-rij">
            <div className="uitleen-naam">
              <span className="rol-bol">{s ? <SpelerBeeld speler={s}/> : <i className="fa-solid fa-user"/>}</span>
              <b>{s ? s.naam : "Speler"}</b>
            </div>
            <div className="uitleen-velden">
              <div className="formulier-groep" style={{margin:0}}>
                <label className="formulier-label">Uitgeleend aan</label>
                <NaamVeld waarde={r.naar} lijstId={"uitleen-teams-" + id}
                  namen={eerder} placeholder="Bijvoorbeeld JO19-1"
                  opWaarde={function(v){ schrijf(id, "naar", v); }} />
              </div>
              <div className="formulier-groep" style={{margin:0}}>
                <label className="formulier-label">Opmerking</label>
                <input className="formulier-input" value={r.opmerking || ""}
                  placeholder="Optioneel"
                  onChange={function(e){ schrijf(id, "opmerking", e.target.value); }} />
              </div>
            </div>
          </div>
        );
      })}
      <p className="uitleen-uitleg">
        <i className="fa-solid fa-circle-info"/>{" "}
        Telt mee als voetbalactiviteit, dus niet als afwezig. Speelminuten,
        doelpunten en assists van die wedstrijd staan bij het andere team en
        worden hier niet meegeteld — er komt geen nul te staan waar we het
        antwoord niet weten.
      </p>
    </div>
  );
}

function GastenSectie({ wedstrijd, onOpslaan }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({naam:"", rugnummer:"", positie:"", vanTeam:""});
  const gasten = gastenVan(wedstrijd);
  const set = (k,v) => setForm(function(f){ var n=Object.assign({},f); n[k]=v; return n; });

  function voegToe() {
    if (!form.naam.trim()) { meldFout("Vul de naam van de gastspeler in."); return; }
    onOpslaan(Object.assign({}, wedstrijd, {gasten: gasten.concat([maakGast(form)])}));
    setForm({naam:"", rugnummer:"", positie:"", vanTeam:""});
    setOpen(false);
    meldGoed(form.naam.trim() + " toegevoegd als gast");
  }
  function haalWeg(g) {
    if (gastInGebruik(wedstrijd, g.id)) {
      meldFout(g.naam + " staat nog in de opstelling of bij een doelpunt. Haal hem daar eerst weg.");
      return;
    }
    onOpslaan(Object.assign({}, wedstrijd, {gasten: gasten.filter(function(x){ return x.id!==g.id; })}));
    meldGoed("Gastspeler verwijderd");
  }

  return (
    <div className="kaart detail-sectie">
      <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <span><i className="fa-solid fa-user-plus"/> Gastspelers</span>
        <button className="knop lijn klein" onClick={function(){ setOpen(!open); }}>
          <i className={open?"fa-solid fa-xmark":"fa-solid fa-plus"}/> {open?"Sluiten":"Gast toevoegen"}
        </button>
      </div>
      <p style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,margin:"2px 0 0"}}>
        Iemand die alleen deze wedstrijd meedoet. Hij komt in de opstelling, de rollen en de
        spelhervattingen, maar telt niet mee in de statistieken, de opkomst of de spelersrapporten.
      </p>

      {open && (
        <div style={{marginTop:12}}>
          <div className="formulier-rij">
            <div className="formulier-groep">
              <label className="formulier-label">Naam *</label>
              <input className="formulier-input" value={form.naam} autoFocus
                onChange={function(e){ set("naam", e.target.value); }} placeholder="Voor- en achternaam" />
            </div>
            <div className="formulier-groep">
              <label className="formulier-label">Rugnummer</label>
              <input className="formulier-input" value={form.rugnummer} maxLength={2}
                onChange={function(e){ set("rugnummer", e.target.value.replace(/[^0-9]/g,"")); }} />
            </div>
          </div>
          <div className="formulier-rij">
            <div className="formulier-groep">
              <label className="formulier-label">Positie</label>
              <select className="formulier-input" value={form.positie}
                onChange={function(e){ set("positie", e.target.value); }}>
                <option value="">Niet opgegeven</option>
                {["Keeper","Verdediger","Middenvelder","Aanvaller"].map(function(x){
                  return <option key={x} value={x}>{x}</option>;
                })}
              </select>
            </div>
            <div className="formulier-groep">
              <label className="formulier-label">Uit welk elftal?</label>
              <input className="formulier-input" value={form.vanTeam}
                onChange={function(e){ set("vanTeam", e.target.value); }} placeholder="bijv. JO17-1" />
            </div>
          </div>
          <button className="knop succes" style={{width:"100%",justifyContent:"center"}} onClick={voegToe}>
            <i className="fa-solid fa-check"/> Toevoegen
          </button>
        </div>
      )}

      {gasten.length>0 && (
        <div style={{marginTop:12}}>
          {gasten.map(function(g){
            var inGebruik = gastInGebruik(wedstrijd, g.id);
            return (
              <div key={g.id} className="gast-rij">
                <span className="k-buste" style={{width:30,height:30,flexShrink:0}}>
                  <SpelerBeeld speler={g}/>
                </span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="gast-naam">
                    {(g.rugnummer ? g.rugnummer+"  " : "") + g.naam}
                    <span className="gast-merk">gast</span>
                  </div>
                  <div className="gast-sub">
                    {[g.positie, g.vanTeam].filter(Boolean).join(" · ") || "geen verdere gegevens"}
                    {inGebruik ? " · doet mee" : ""}
                  </div>
                </div>
                <button className="knop gevaar klein" title="Weghalen"
                  onClick={function(){ haalWeg(g); }}><i className="fa-solid fa-trash"/></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TegenstanderSectie({ wedstrijd, alleWedstrijden, onOpslaan }) {
  const analyse = tegenAnalyse(wedstrijd);
  const [bewerk, setBewerk] = useState(null);      /* positie die je aanklikt */
  const posities = FORMATIES_DATA[analyse.formatie] || FORMATIES_DATA["4-3-3A"];
  const toewijzing = tegenToewijzing(analyse);
  const eerder = eerdereOntmoetingen(alleWedstrijden, wedstrijd.tegenstander, wedstrijd.id);
  const naam = wedstrijd.tegenstander || "de tegenstander";

  function schrijf(velden) {
    onOpslaan(Object.assign({}, wedstrijd, {tegen: Object.assign({}, analyse, velden)}));
  }
  function zetPositie(id, velden) {
    var s = Object.assign({}, analyse.spelers);
    s[id] = Object.assign({naam:"", nummer:""}, s[id], velden);
    if (!s[id].naam.trim() && !s[id].nummer.trim()) delete s[id];
    schrijf({spelers:s});
  }
  function voegUitgelichtToe() {
    schrijf({uitgelicht: (analyse.uitgelicht||[]).concat([
      {id:"u"+Date.now(), nummer:"", naam:"", waarom:""}])});
  }
  function zetUitgelicht(id, velden) {
    schrijf({uitgelicht: (analyse.uitgelicht||[]).map(function(u){
      return u.id===id ? Object.assign({}, u, velden) : u;
    })});
  }
  function wisUitgelicht(id) {
    schrijf({uitgelicht: (analyse.uitgelicht||[]).filter(function(u){ return u.id!==id; })});
  }
  function neemOver(bron) {
    if (!bron.tegen) { meldFout("Bij die wedstrijd staat nog geen analyse."); return; }
    schrijf(Object.assign({}, bron.tegen));
    meldGoed("Analyse overgenomen van " + formateerDatumKort(bron.datum));
  }

  const ingevuldeSpelers = Object.keys(toewijzing).length;

  return (
    <div>
      <div className="kaart" style={{marginBottom:12}}>
        <div className="kaart-titel"><i className="fa-solid fa-binoculars"/> {naam}</div>
        <div className="formulier-groep" style={{marginBottom:0}}>
          <label className="formulier-label">Hoe spelen ze?</label>
          <select className="formulier-input" value={analyse.formatie}
            onChange={function(e){ schrijf({formatie:e.target.value}); }}>
            {FORMATIE_GROEPEN.map(function(g){
              return (
                <optgroup key={g.label} label={g.label}>
                  {g.namen.map(function(n){ return <option key={n} value={n}>{n}</option>; })}
                </optgroup>
              );
            })}
          </select>
          <p style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:400,margin:"7px 0 0",lineHeight:1.5}}>
            Tik op een plek in het veld om er een rugnummer en naam bij te zetten.
            {ingevuldeSpelers>0 ? " " + ingevuldeSpelers + " van de 11 ingevuld." : ""}
          </p>
        </div>
      </div>

      <OpstellingVeld formatie={analyse.formatie} toewijzing={toewijzing} zoom={false}
        tenue={TEGEN_TENUE} onKlikPositie={function(pos){ setBewerk(pos); }} />

      <div className="kaart" style={{marginTop:12}}>
        <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span><i className="fa-solid fa-triangle-exclamation"/> Op wie letten we?</span>
          <button className="knop lijn klein" onClick={voegUitgelichtToe}>
            <i className="fa-solid fa-plus"/> Speler
          </button>
        </div>
        {(analyse.uitgelicht||[]).length===0 ? (
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,margin:0}}>
            Nog niemand. Denk aan hun spits, een snelle vleugelspeler of een sterke kopper bij corners.
          </p>
        ) : (analyse.uitgelicht||[]).map(function(u){
          return (
            <div key={u.id} className="teg-speler">
              <input className="formulier-input teg-nummer" value={u.nummer} maxLength={2} placeholder="9"
                onChange={function(e){ zetUitgelicht(u.id, {nummer:e.target.value.replace(/[^0-9]/g,"")}); }} />
              <div style={{flex:1,minWidth:0}}>
                <input className="formulier-input" value={u.naam} placeholder="Naam of omschrijving"
                  style={{margin:"0 0 5px",padding:"6px 9px",fontSize:13}}
                  onChange={function(e){ zetUitgelicht(u.id, {naam:e.target.value}); }} />
                <input className="formulier-input" value={u.waarom} placeholder="Waarom? bijv. snel in de diepte"
                  style={{margin:0,padding:"6px 9px",fontSize:12}}
                  onChange={function(e){ zetUitgelicht(u.id, {waarom:e.target.value}); }} />
              </div>
              <button className="knop gevaar klein" onClick={function(){ wisUitgelicht(u.id); }}>
                <i className="fa-solid fa-trash"/>
              </button>
            </div>
          );
        })}
      </div>

      <div className="kaart" style={{marginTop:12}}>
        <div className="kaart-titel"><i className="fa-solid fa-clipboard-list"/> Wat weten we van ze?</div>
        {[{v:"sterk",    l:"Waar zijn ze goed in?", p:"Sterk in de omschakeling, gevaarlijk bij corners…"},
          {v:"zwak",     l:"Waar valt wat te halen?", p:"Traag centraal achterin, keeper twijfelt op voorzetten…"},
          {v:"afspraken",l:"Onze afspraken", p:"Hun nummer 10 kort dekken, niet meegaan in het duel…"}
         ].map(function(f){
          return (
            <div key={f.v} className="formulier-groep">
              <label className="formulier-label">{f.l}</label>
              <textarea className="formulier-input" rows={2} value={analyse[f.v]||""} placeholder={f.p}
                onChange={function(e){ schrijf(Object.fromEntries([[f.v, e.target.value]])); }} />
            </div>
          );
        })}
      </div>

      {eerder.length>0 && (
        <div className="kaart" style={{marginTop:12}}>
          <div className="kaart-titel"><i className="fa-solid fa-clock-rotate-left"/> Eerder tegen {naam}</div>
          {eerder.map(function(w){
            var r = resultaat(w);
            return (
              <div key={w.id} className="teg-eerder">
                <span className={"teg-uitslag "+r}>{uitslagTekst(w)}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="boete-naam">{formateerDatum(w.datum)}</div>
                  <div className="boete-sub">
                    {(w.thuis?"Thuis":"Uit") + " · " + wedstrijdSoort(w).label}
                    {w.tegen ? " · analyse ingevuld" : ""}
                  </div>
                </div>
                {w.tegen && (
                  <button className="knop lijn klein" onClick={function(){ neemOver(w); }}>
                    <i className="fa-solid fa-copy"/> Overnemen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {bewerk && (
        <div className="bevestig-overlay" onClick={function(e){ if(e.target===e.currentTarget) setBewerk(null); }}>
          <div className="bevestig-kaart" style={{maxWidth:340}}>
            <h3 style={{marginBottom:4}}>{bewerk.l}</h3>
            <p style={{marginBottom:14}}>Wie staat hier bij {naam}?</p>
            <div className="formulier-rij">
              <div className="formulier-groep" style={{flex:"0 0 84px"}}>
                <label className="formulier-label">Nummer</label>
                <input className="formulier-input" maxLength={2} autoFocus
                  value={(analyse.spelers[bewerk.id]||{}).nummer||""}
                  onChange={function(e){ zetPositie(bewerk.id, {nummer:e.target.value.replace(/[^0-9]/g,"")}); }} />
              </div>
              <div className="formulier-groep">
                <label className="formulier-label">Naam</label>
                <input className="formulier-input"
                  value={(analyse.spelers[bewerk.id]||{}).naam||""}
                  onChange={function(e){ zetPositie(bewerk.id, {naam:e.target.value}); }} />
              </div>
            </div>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){
                zetPositie(bewerk.id, {naam:"", nummer:""}); setBewerk(null); }}>Leeg maken</button>
              <button className="knop" onClick={function(){ setBewerk(null); }}>Klaar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Een kaart. Kort scherm: minuut, kleur, en wie hem kreeg — waarbij
   alleen wie op dat moment op het veld stond in aanmerking komt. */
function KaartScherm({ spelers, opstelling, wissels, posWissels, wedstrijd,
                       onKlaar, onSluiten }) {
  const [minuut, setMinuut] = useState("");
  const [soort, setSoort] = useState("geel");
  const duur = wedstrijdDuur(wedstrijd);
  const min = String(minuut).trim();
  const minGoed = min !== "" && !isNaN(Number(min)) && Number(min) >= 0 && Number(min) <= 130;
  const veld = veldOpstelling(spelers, opstelling, wissels, posWissels)
    .filter(function (v) {
      if (!minGoed) return true;
      return veldStand(opstelling, wissels, posWissels, Number(min)).op[v.id] === true;
    });

  return (
    <div className="modal-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet wissel-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel">Kaart</div>

        <div className="wissel-minuut">
          <label className="formulier-label" style={{margin:0}}>Minuut</label>
          <GetalVeld min={0} max={130} leeg={null} placeholder="bijv. 40" waarde={minuut}
            opWaarde={function(n){ setMinuut(n === null ? "" : String(n)); }}
            style={{width:84,padding:"9px 12px",border:"2px solid var(--grijs)",borderRadius:10,
                    fontSize:16,fontWeight:800,textAlign:"center",outline:"none",
                    fontFamily:"'Helvetica Neue',Arial,sans-serif"}} />
          {duur.rust && (
            <button className="knop lijn klein"
              onClick={function(){ setMinuut(String(duur.rust)); }}>rust</button>
          )}
          <button className="knop lijn klein"
            onClick={function(){ setMinuut(String(duur.totaal)); }}>eind</button>
        </div>

        <div className="wissel-tabs">
          <button className={soort === "geel" ? "aan" : ""} onClick={function(){ setSoort("geel"); }}>
            <i className="fa-solid fa-square" style={{color:soort==="geel"?"#fff":"#ffc107"}}/> Geel
          </button>
          <button className={soort === "rood" ? "aan" : ""} onClick={function(){ setSoort("rood"); }}>
            <i className="fa-solid fa-square" style={{color:soort==="rood"?"#fff":"#dc3545"}}/> Rood
          </button>
        </div>

        <div className="wissel-kop"><span>Voor wie?</span><b>{veld.length}</b></div>
        <div className="wissel-lijst">
          {veld.map(function (v) {
            return (
              <button key={v.id} className="wissel-speler" disabled={!minGoed}
                onClick={function(){ onKlaar(soort, v, min); }}>
                <span className="wissel-plek">{v.plek || "–"}</span>
                <span className="wissel-nr">{v.rugnummer || ""}</span>
                <span className="wissel-naam">{v.naam}</span>
                <i className="fa-solid fa-square"
                  style={{color: soort === "geel" ? "#ffc107" : "#dc3545"}}/>
              </button>
            );
          })}
          {!veld.length && <p className="wissel-leeg">Er staat niemand op het veld. Vul eerst de opstelling in.</p>}
        </div>

        <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:14}}
          onClick={onSluiten}>Annuleren</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HET WEDSTRIJDCENTRUM
   ───────────────────────────────────────────────────────────
   Eén scherm om een wedstrijd bij te houden. De stand bovenin, vijf
   knoppen eronder, en daarna wat er gebeurd is op volgorde van de klok.

   Het uitgangspunt: langs de lijn heb je twee handen, weinig tijd en
   een tablet die je vasthoudt. Alles wat je hier doet is één tik en dan
   een keuze. Er is geen formulier dat je moet invullen en er is niets
   dat je moet opslaan — dat gebeurt vanzelf.

   De tijdlijn is niet alleen een lijst maar ook de bediening: elke
   regel is te verwijderen, want er wordt langs de lijn net zo vaak iets
   verkeerd ingetikt als goed.
═══════════════════════════════════════════════════════════ */
function Wedstrijdcentrum({ wedstrijd, spelers, onOpslaan, onUitslagScherm }) {
  const [open, setOpen] = useState(null);   /* welk invoerscherm */
  const w = wedstrijd;
  const duur = wedstrijdDuur(w);
  const tijdlijn = wedstrijdTijdlijn(w);
  const verschil = scoreVerschil(w);
  const score = w.score || {fch:0, teg:0};
  const opstelling = w.opstelling || [];
  const wissels = w.wissels || [];
  const posWissels = w.posWissels || [];

  function bewaar(wijziging) { onOpslaan(Object.assign({}, w, wijziging)); }
  function zetScore(kant, delta) {
    var nieuw = Object.assign({}, score);
    nieuw[kant] = Math.max(0, (Number(nieuw[kant]) || 0) + delta);
    bewaar({score: nieuw});
  }
  function nieuwId() { return Date.now() + Math.floor(Math.random() * 1000); }

  function voegDoelpunt(d) {
    bewaar({
      scorers: (w.scorers || []).concat([{id: nieuwId(), spelerId: d.spelerId,
        naam: d.naam, minuut: d.minuut, eigenTeam: true,
        assist: d.assist, assistNaam: d.assistNaam}]),
      score: Object.assign({}, score, {fch: (Number(score.fch) || 0) + 1})
    });
    setOpen(null);
  }
  function voegTegendoelpunt(d) {
    bewaar({
      scorers: (w.scorers || []).concat([{id: nieuwId(), spelerId: null, eigenTeam: false,
        naam: d.naam || "", nummer: d.nummer || "", minuut: d.minuut || "",
        assist: null, assistNaam: ""}]),
      score: Object.assign({}, score, {teg: (Number(score.teg) || 0) + 1})
    });
    setOpen(null);
  }
  function voegKaart(type, speler, minuut) {
    bewaar({kaarten: (w.kaarten || []).concat([{id: nieuwId(), spelerId: speler.id,
      naam: speler.naam, type: type, minuut: minuut}])});
    setOpen(null);
  }
  function voegWissel(s) {
    var nieuweWissels = wissels.concat([Object.assign({id: nieuwId()}, s)]);
    /* Wie van de bank komt, hoort ook als wisselspeler te staan —
       anders telt hij straks nergens mee. */
    var nieuweOpstelling = opstelling.map(function (o) {
      if (o.spelerId === s.inId && (o.spelStatus || "basis") === "afwezig")
        return Object.assign({}, o, {spelStatus: "wissel"});
      return o;
    });
    bewaar({wissels: nieuweWissels,
            opstelling: berekenMinuten(nieuweOpstelling, nieuweWissels, duur.totaal,
                                       uitgeleendIn(w))});
  }
  function voegPositie(a, b) {
    var lijst = posWissels.concat([Object.assign({id: nieuwId()}, a)]);
    if (b) lijst = lijst.concat([Object.assign({id: nieuwId() + 1}, b)]);
    bewaar({posWissels: lijst});
  }
  function weg(g) {
    if (g.bron === "scorers") {
      var kant = g.soort === "goal" ? "fch" : "teg";
      var nieuw = Object.assign({}, score);
      nieuw[kant] = Math.max(0, (Number(nieuw[kant]) || 0) - 1);
      bewaar({scorers: (w.scorers || []).filter(function (s) { return s.id !== g.id; }),
              score: nieuw});
    } else if (g.bron === "kaarten") {
      bewaar({kaarten: (w.kaarten || []).filter(function (k) { return k.id !== g.id; })});
    } else if (g.bron === "wissels") {
      var over = wissels.filter(function (s) { return s.id !== g.id; });
      bewaar({wissels: over, opstelling: berekenMinuten(opstelling, over, duur.totaal,
                                                        uitgeleendIn(w))});
    } else {
      bewaar({posWissels: posWissels.filter(function (v) {
        return v.id !== g.id && v.id !== g.tweedeId; })});
    }
  }

  const acties = [
    {id:"goal",    label:"Doelpunt",    icoon:"fa-solid fa-futbol",         kleur:"goed"},
    {id:"tegen",   label:"Tegen",       icoon:"fa-solid fa-futbol",         kleur:"tegen"},
    {id:"wissel",  label:"Wissel",      icoon:"fa-solid fa-arrows-rotate",  kleur:""},
    {id:"kaart",   label:"Kaart",       icoon:"fa-solid fa-square",         kleur:"kaart"},
    {id:"plek",    label:"Positiewissel", icoon:"fa-solid fa-shuffle",     kleur:""},
    /* De notitie stond alleen achter "Alles invullen". Dat is drie tikken
       te ver voor het soort zin dat je in de rust wilt opschrijven:
       "doelpunt tegen kwam uit een corner", "Jinne had last van zijn
       enkel". Tegen de tijd dat je dat scherm open hebt, is de tweede
       helft begonnen en ben je het vergeten. */
    {id:"notitie", label:"Notitie",     icoon:"fa-solid fa-pen-to-square",  kleur:""}
  ];

  return (
    <div className="mc">
      {/* ── De stand ──
          Elk team zijn eigen min en plus. Eerst stond de min links en
          de plus rechts, waardoor je het ene getal alleen kon verlagen
          en het andere alleen verhogen. Dat viel pas op toen het scherm
          er echt stond. */}
      <div className="mc-stand">
        {[
          {kant: w.thuis ? "fch" : "teg", naam: w.thuis ? inst().clubNaam : w.tegenstander},
          {kant: w.thuis ? "teg" : "fch", naam: w.thuis ? w.tegenstander : inst().clubNaam}
        ].map(function (z, i) {
          return (
            <React.Fragment key={z.kant}>
              {/* Het streepje krijgt een leeg naamregeltje boven zich,
                  anders zweeft het halverwege tussen de teamnaam en de
                  cijfers in plaats van ertussen te staan. */}
              {i > 0 && (
                <div className="mc-vak mc-tussen">
                  <div className="mc-naam">{"\u00a0"}</div>
                  <div className="mc-cijfers"><span className="mc-streep">{"\u2013"}</span></div>
                </div>
              )}
              <div className="mc-vak">
                <div className="mc-naam" title={z.naam}>{z.naam || "\u2013"}</div>
                <div className="mc-cijfers">
                  <button className="mc-tel" title="Eén eraf"
                    onClick={function(){ zetScore(z.kant, -1); }}>−</button>
                  <span className="mc-getal">{Number(score[z.kant]) || 0}</span>
                  <button className="mc-tel" title="Eén erbij"
                    onClick={function(){ zetScore(z.kant, +1); }}>+</button>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div className="mc-duur">
        {duurTekst(w)}
        {duur.rust ? " · rust in de " + duur.rust + "e" : ""}
        {verschil && (
          <span className="mc-mist">
            {verschil.mistEigen || verschil.mistTegen
              ? "· nog niet alle doelpunten ingevoerd"
              : "· meer doelpunten ingevoerd dan de stand aangeeft"}
          </span>
        )}
      </div>

      {/* ── De vijf knoppen ── */}
      <div className="mc-acties">
        {acties.map(function (a) {
          return (
            <button key={a.id} className={"mc-actie " + a.kleur}
              onClick={function(){ setOpen(a.id); }}>
              <i className={a.icoon}/><span>{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── De notitie ──
          Staat er iets in, dan zie je het meteen; is het leeg, dan neemt
          het geen ruimte in. */}
      {open === "notitie" && (
        <div className="mc-notitie">
          <label className="formulier-label">Notitie bij deze wedstrijd</label>
          <textarea className="formulier-input" rows={4} autoFocus
            placeholder="Sterke eerste helft. Doelpunt tegen kwam uit een corner."
            defaultValue={w.notities || ""}
            onChange={function(e){ bewaar({notities: e.target.value}); }} />
          <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
            onClick={function(){ setOpen(null); }}>Klaar</button>
        </div>
      )}
      {open !== "notitie" && w.notities && String(w.notities).trim() && (
        <button className="mc-notitie-kort" onClick={function(){ setOpen("notitie"); }}>
          <i className="fa-solid fa-pen-to-square"/>
          <span>{w.notities}</span>
        </button>
      )}

      {/* ── Wat er gebeurd is ── */}
      <div className="mc-lijn">
        {!tijdlijn.length && (
          <p className="mc-leeg">
            <i className="fa-solid fa-stopwatch"/>
            Nog niets vastgelegd. Tik hierboven op wat er gebeurt.
          </p>
        )}
        {tijdlijn.map(function (g, i) {
          const vorige = i > 0 ? tijdlijn[i-1].minuut : -1;
          const rust = duur.rust && vorige < duur.rust && g.minuut >= duur.rust;
          return (
            <React.Fragment key={g.bron + g.id}>
              {rust && <div className="mc-rust"><span>rust</span></div>}
              <div className={"mc-regel " + g.soort}>
                <div className="mc-minuut">{g.minuut ? g.minuut + "'" : "–"}</div>
                <div className="mc-icoon"><i className={
                  g.soort === "goal" || g.soort === "tegengoal" ? "fa-solid fa-futbol"
                  : g.soort === "kaart" ? "fa-solid fa-square"
                  : g.soort === "wissel" ? "fa-solid fa-arrows-rotate"
                  : "fa-solid fa-shuffle"}
                  style={g.soort === "kaart"
                    ? {color: g.d.type === "geel" ? "#ffc107" : "#dc3545"} : undefined}/>
                </div>
                <div className="mc-tekst">
                  {g.soort === "goal" && (
                    <React.Fragment>
                      <b>{g.d.naam}</b>
                      {g.d.assistNaam && <span> assist {g.d.assistNaam}</span>}
                    </React.Fragment>
                  )}
                  {g.soort === "tegengoal" && (
                    <b>{g.d.naam || (g.d.nummer ? "Nummer " + g.d.nummer : w.tegenstander || "Tegenstander")}</b>
                  )}
                  {g.soort === "kaart" && (
                    <React.Fragment><b>{g.d.naam}</b><span> {g.d.type}e kaart</span></React.Fragment>
                  )}
                  {g.soort === "wissel" && (
                    <React.Fragment>
                      <b>{g.d.inNaam}</b>
                      <span> in voor {g.d.uitNaam}</span>
                    </React.Fragment>
                  )}
                  {g.soort === "plek" && (
                    <React.Fragment>
                      <b>{g.d.naam}</b>
                      <span> {plekNaam(g.d.van) || "?"} {"→"} {plekNaam(g.d.naar)}</span>
                    </React.Fragment>
                  )}
                  {g.soort === "ruil" && (
                    <React.Fragment>
                      <b>{g.d.naam} {"↔"} {g.d2.naam}</b>
                      <span> {(g.d.van || "?")} en {(g.d2.van || "?")} gewisseld</span>
                    </React.Fragment>
                  )}
                </div>
                <button className="mc-weg" title="Weghalen"
                  onClick={function(){ weg(g); }}>{"×"}</button>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:12}}
        onClick={onUitslagScherm}>
        <i className="fa-solid fa-list-check"/> Alles invullen: minuten, cijfers en kleedkamer
      </button>

      {open === "goal" && (
        <DoelpuntScherm spelers={spelers} opstelling={opstelling} wissels={wissels}
          posWissels={posWissels} wedstrijd={w}
          onKlaar={voegDoelpunt} onSluiten={function(){ setOpen(null); }} />
      )}
      {open === "tegen" && (
        <TegenDoelpuntModal tegenstander={w.tegenstander}
          onKlaar={voegTegendoelpunt} onSluiten={function(){ setOpen(null); }} />
      )}
      {(open === "wissel" || open === "plek") && (
        <WisselScherm spelers={spelers} opstelling={opstelling}
          wissels={wissels} posWissels={posWissels}
          speelduur={duur.totaal} helften={duur.helften}
          beginModus={open === "plek" ? "plek" : "uit"}
          onWissel={voegWissel} onPositie={voegPositie}
          onVerwijderWissel={function(id){ weg({bron:"wissels", id:id}); }}
          onVerwijderPositie={function(id){ weg({bron:"posWissels", id:id}); }}
          onSluiten={function(){ setOpen(null); }} />
      )}
      {open === "kaart" && (
        <KaartScherm spelers={spelers} opstelling={opstelling} wissels={wissels}
          posWissels={posWissels} wedstrijd={w}
          onKlaar={voegKaart} onSluiten={function(){ setOpen(null); }} />
      )}
    </div>
  );
}

/* De onderdelen van een wedstrijd, in de volgorde waarin je ze
   tegenkomt. Ze staan allemaal in één kolom naast elkaar in beeld —
   dat is het hele punt: je ziet wat er is zonder te klikken, en één
   klik brengt je erheen.

   De uitslag verschijnt pas als er gespeeld is; daarvoor valt er niets
   in te vullen. */
/* De volgorde is die van de week naar de wedstrijd toe.

   Je begint bij Voorbereiding — wie kan er spelen, wie rijdt, wie fluit.
   Pas als je weet wie er zijn, kies je hoe je speelt (Tactiek), dan wie
   wat doet (Spelersrollen), en dan wie waar staat (Opstelling). Dat is
   de volgorde waarin een trainer denkt, en dus de volgorde waarin het
   hier staat.

   Daarna komt de tegenstander, en helemaal onderaan de uitslag: dat is
   wat je zaterdagmiddag invult en de rest van de week niet nodig hebt.

   "Rondom" heette dit eerder. Dat woord zei niet waar het over ging.

   Wedstrijd heet nu Uitslag, want dat is wat je er doet. */
const WEDSTRIJD_SECTIES = [
  {id:"rondom",       label:"Voorbereiding",   icoon:"fa-solid fa-clipboard-check"},
  {id:"tactiek",      label:"Tactiek",         icoon:"fa-solid fa-chess-board"},
  {id:"rollen",       label:"Spelersrollen",   icoon:"fa-solid fa-user-tag"},
  {id:"opstelling",   label:"Opstelling",      icoon:"fa-solid fa-people-line"},
  {id:"dsm",          label:"Spelhervattingen",icoon:"fa-solid fa-flag"},
  {id:"tegenstander", label:"Tegenstander",    icoon:"fa-solid fa-binoculars"},
  {id:"wedstrijd",    label:"Uitslag",         icoon:"fa-solid fa-futbol"},
  {id:"spelers",      label:"Speelminuten",    icoon:"fa-solid fa-users",  alleenGespeeld:true}
];
function WedstrijdDetail({ wedstrijd, spelers: vasteSelectie, onTerug, onBewerken, onVerwijderen, onUitslagOpslaan }) {
  /* Vanaf hier is "spelers" de selectie plus de gasten van deze
     wedstrijd, zodat elk onderdeel — opstelling, rollen, uitslag,
     spelhervattingen — ze vanzelf kent. */
  const gasten = gastenVan(wedstrijd);
  const spelers = spelersMetGasten(vasteSelectie, wedstrijd);
  /* Welk onderdeel staat open. Bij een gespeelde wedstrijd is dat wat
     er gebeurd is; bij een wedstrijd die nog moet komen de opstelling,
     want daar begint het. */
  const [sectie,setSectie]=useState(function(){
    /* Een gespeelde wedstrijd open je om de uitslag te verwerken; een
       geplande om hem voor te bereiden. */
    return wedstrijd.status === "gespeeld" ? "wedstrijd" : "rondom";
  });
  const [uitslagOpen,setUitslagOpen]=useState(false);
  const [opstellingOpen,setOpstellingOpen]=useState(false);
  const [subScherm,setSubScherm]=useState(null);   // "rollen" | "tactiek" | "dsm" | "tegenstander"
  const [bewaarTeller,setBewaarTeller]=useState(0);
  const [resetOpen,setResetOpen]=useState(false);
  const [deelOpen,setDeelOpen]=useState(false);
  const [bevestig,setBevestig]=useState(false);
  const [opgave,setOpgaveLijst]=useState(wedstrijd.opgave||[]);
  const res = resultaat(wedstrijd);
  const gespeeld = wedstrijd.status==="gespeeld";
  const wissels = wedstrijd.wissels||[];
  const motmSpeler = wedstrijd.motm ? spelers.find(function(s){return s.id===wedstrijd.motm;}) : null;

  const taken = laadTaken();
  const takenLijst = taken.length>0 ? taken : STANDAARD_TAKEN;
  const alleWedstrijden = laadWedstrijden();
  /* Elke opslag telt op, zodat de melder weet dat er iets gebeurd is */
  function bewaarEnMeld(w) { onUitslagOpslaan(w); setBewaarTeller(function(n){ return n+1; }); }
  /* Tellertjes op de knoppen, zodat je ziet wat er al is ingevuld */
  const rollenIngevuld = WEDSTRIJD_ROLLEN.filter(function(r){ return rollenNu(wedstrijd.rollen)[r.id]; }).length;
  const tactiekIngevuld = TACTIEK_FASES.filter(function(f){
      var v = (wedstrijd.tactiek||{})[f.id]; return v && String(v).trim();
    }).length
    + Object.keys(wedstrijd.instructies||{}).length
    + ((wedstrijd.tactiek||{}).tekening ? 1 : 0);
  const dsmAantal = dsmIngevuld(wedstrijd);
  const tegenAantal = tegenIngevuld(wedstrijd);
  /* Een getalletje achter een onderdeel zegt of er al iets in staat.
     Dat scheelt klikken om te zien of je iets vergeten bent. */
  const sectieTeller = {
    rollen: rollenIngevuld,
    tactiek: tactiekIngevuld,
    dsm: dsmAantal,
    tegenstander: tegenAantal,
    wedstrijd: wedstrijdTijdlijn(wedstrijd).length,
    rondom: (wedstrijd.rijschema||[]).length + (wedstrijd.gasten||[]).length,
    opstelling: (wedstrijd.opstelling||[]).filter(function(o){
      return (o.spelStatus||"basis")==="basis"; }).length
  };

  function wijzigTaak(taakId, spelerId) {
    var nieuw = Object.assign({}, wedstrijd.taken||{});
    if (!spelerId) delete nieuw[taakId]; else nieuw[taakId] = spelerId;
    onUitslagOpslaan(Object.assign({}, wedstrijd, {taken:nieuw}));
  }
  function verdeelTakenAutomatisch() {
    var toegewezen = [];
    var nieuw = {};
    takenLijst.forEach(function(t){
      var id = volgendeVoorTaak(t.id, spelers, alleWedstrijden, toegewezen);
      if (id) { nieuw[t.id] = id; toegewezen.push(id); }
    });
    onUitslagOpslaan(Object.assign({}, wedstrijd, {taken:nieuw}));
    meldGoed("Taken eerlijk verdeeld");
  }

  function voegRitToe() {
    var naam = prompt("Wie rijdt er?", "");
    if (!naam || !naam.trim()) return;
    var plekken = Number(prompt("Hoeveel spelers kunnen er mee?", "4")) || 4;
    var ritten = (wedstrijd.rijschema||[]).concat([{id:Date.now(), chauffeur:naam.trim(), plekken:Math.max(1,plekken), spelerIds:[]}]);
    onUitslagOpslaan(Object.assign({}, wedstrijd, {rijschema:ritten}));
  }
  function verwijderRit(id) {
    var ritten = (wedstrijd.rijschema||[]).filter(function(r){return r.id!==id;});
    onUitslagOpslaan(Object.assign({}, wedstrijd, {rijschema:ritten}));
  }
  function wisselInzittende(ritId, spelerId) {
    var ritten = (wedstrijd.rijschema||[]).map(function(r){
      if (r.id!==ritId) return r;
      var zit = r.spelerIds.indexOf(spelerId)>=0;
      if (zit) return Object.assign({}, r, {spelerIds: r.spelerIds.filter(function(x){return x!==spelerId;})});
      if (r.spelerIds.length >= r.plekken) { meldFout("De auto van "+r.chauffeur+" zit vol."); return r; }
      return Object.assign({}, r, {spelerIds: r.spelerIds.concat([spelerId])});
    });
    onUitslagOpslaan(Object.assign({}, wedstrijd, {rijschema:ritten}));
  }

  function zetTerugNaarGepland() {
    var vorige = JSON.parse(JSON.stringify(wedstrijd));
    /* live-analyse events van deze wedstrijd horen bij de uitslag en gaan dus mee */
    var alleEvents = laadEvents();
    var eigenEvents = alleEvents.filter(function(e){ return e.wedstrijdId===wedstrijd.id; });
    var leeg = Object.assign({}, wedstrijd, {
      status: "gepland",
      score: {fch:0, teg:0},
      scorers: [],
      kaarten: [],
      wissels: [],
      beoordelingen: {},
      motm: null,
      liveGeanalyseerd: false,
      /* de selectie blijft staan, alleen de gespeelde minuten gaan eruit */
      opstelling: (wedstrijd.opstelling||[]).map(function(r){
        return Object.assign({}, r, {
          minuten: (r.spelStatus||"basis")==="basis" ? (wedstrijd.speelduur||90) : 0
        });
      })
    });
    if(eigenEvents.length) slaJson(EVENTS_KEY, alleEvents.filter(function(e){ return e.wedstrijdId!==wedstrijd.id; }));
    onUitslagOpslaan(leeg);
    setResetOpen(false);
    toon("Wedstrijd staat weer op gepland", {
      actieLabel: "Toch terug",
      actie: function(){
        if(eigenEvents.length) slaJson(EVENTS_KEY, laadEvents().filter(function(e){ return e.wedstrijdId!==vorige.id; }).concat(eigenEvents));
        onUitslagOpslaan(vorige);
      }
    });
  }

  function wijzigOpgave(speler, status) {
    var huidig = opgaveVanSpeler(opgave, speler.id);
    var nieuw = zetOpgave(opgave, speler, huidig===status ? "onbekend" : status);
    setOpgaveLijst(nieuw);
    onUitslagOpslaan(Object.assign({}, wedstrijd, {opgave:nieuw}));
  }

  const eigenDoelpunten = wedstrijd.scorers?.filter(s=>s.eigenTeam)||[];
  const tegenDoelpunten = wedstrijd.scorers?.filter(s=>!s.eigenTeam)||[];
  const posWissels = wedstrijd.posWissels||[];
  const briefje = wedstrijd.kleedkamer||{plus:[],min:[]};
  const kaarten = wedstrijd.kaarten||[];
  /* Aanvullen met wie er nog niet in staat, zodat een speler die later
     aan de selectie is toegevoegd niet spoorloos is. */
  const opstelling = opstellingCompleet(wedstrijd.opstelling||[], spelers);
  const startElf  = opstelling.filter(s=>(s.spelStatus||"basis")==="basis");
  /* Iemand die op de bank zat maar niet is ingevallen hoort er ook bij
     te staan. Filteren op gespeelde minuten liet hem verdwijnen, en dan
     lijkt het alsof je hem nooit hebt opgesteld. */
  const wisselaars = opstelling.filter(s=>(s.spelStatus||"basis")==="wissel");
  const afwezigen  = opstelling.filter(s=>(s.spelStatus||"basis")==="afwezig");


  return (
    <div className="pagina-slide">
      {/* ── De kopbalk ──
          Blijft staan als je scrolt: de stand en tegen wie je speelt zijn
          de twee dingen die je steeds opnieuw wilt zien. */}
      <div className={"w-kop " + res + (gespeeld ? " gespeeld" : "")}>
        <button className="w-kop-terug" onClick={onTerug} title="Terug naar wedstrijden">
          <i className="fa-solid fa-arrow-left"/>
        </button>
        <div className="w-kop-midden">
          <div className="w-kop-teams">
            <span className="w-kop-team">{wedstrijd.thuis?inst().clubNaam:wedstrijd.tegenstander}</span>
            {gespeeld
              ? <span className="w-kop-score">
                  {(wedstrijd.thuis?wedstrijd.score.fch:wedstrijd.score.teg) + " \u2013 " +
                   (wedstrijd.thuis?wedstrijd.score.teg:wedstrijd.score.fch)}
                </span>
              : <span className="w-kop-vs">vs</span>}
            <span className="w-kop-team">{wedstrijd.thuis?wedstrijd.tegenstander:inst().clubNaam}</span>
          </div>
          <div className="w-kop-meta">
            {gespeeld && <span className={"w-kop-uitslag " + res}>
              {{winst:"Gewonnen", verlies:"Verloren", gelijk:"Gelijk"}[res]}</span>}
            {wedstrijd.datum && <span>{formateerDatumKort(wedstrijd.datum)}</span>}
            {wedstrijd.tijd && <span>{wedstrijd.tijd}</span>}
            <span>{wedstrijd.thuis ? "Thuis" : "Uit"}</span>
            {wedstrijd.locatie && <span className="w-kop-weg">{wedstrijd.locatie}</span>}
            <span className="w-kop-weg">{wedstrijdSoort(wedstrijd).label}</span>
          </div>
        </div>
        <BewaarMelder teller={bewaarTeller} />
      </div>

      {/* ── Eén kolom met alles wat er bij deze wedstrijd hoort ──
          Er stonden hier elf kaarten onder elkaar en daarna vier
          tabbladen overheen. Allebei fout: het eerste maakte het lang,
          het tweede maakte het diep. Dit is één lijst waarin je ziet wat
          er is, en waar één klik je brengt waar je wilt zijn.

          Op een telefoon wordt de kolom een rij die je opzij schuift. */}
      <div className="w-lijf">
        <nav className="w-secties" role="tablist">
          {WEDSTRIJD_SECTIES.filter(function (s) {
            return !s.alleenGespeeld || gespeeld;
          }).map(function (s) {
            var tel = sectieTeller[s.id];
            return (
              <button key={s.id} role="tab" aria-selected={sectie === s.id}
                className={"w-sectie" + (sectie === s.id ? " aan" : "")}
                onClick={function(){ setSectie(s.id); }}>
                <i className={s.icoon}/>
                <span>{s.label}</span>
                {tel > 0 && <b>{tel}</b>}
              </button>
            );
          })}
        </nav>

        <div className="w-inhoud">
                {/* Acties onderaan */}
                <div style={{display:"flex",gap:10,marginTop:4}}>
                  <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onBewerken}><i className="fa-solid fa-pen"/> Bewerken</button>
                  {gespeeld&&<button className="knop lijn klein" title="Uitslag wissen, wedstrijd terug op gepland"
                    style={{borderColor:"var(--grijs-donker)",color:"var(--grijs-donker)"}}
                    onClick={function(){setResetOpen(true);}}>
                    <i className="fa-solid fa-rotate-left"/>
                  </button>}
                  {gespeeld&&<button className="knop lijn klein" style={{borderColor:"var(--oranje)",color:"var(--oranje)"}} onClick={()=>setUitslagOpen(true)}><i className="fa-solid fa-arrows-rotate"/> Uitslag wijzigen</button>}
                  <button className="knop gevaar klein" onClick={()=>setBevestig(true)}><i className="fa-solid fa-trash"/></button>
                </div>

          {sectie === "wedstrijd" && (
            <Wedstrijdcentrum wedstrijd={wedstrijd} spelers={spelers}
              onOpslaan={onUitslagOpslaan}
              onUitslagScherm={function(){ setUitslagOpen(true); }} />
          )}

          {sectie === "spelers" && (
            <div className="kaart detail-sectie">
              <div className="kaart-titel">
                <i className="fa-solid fa-users"/> Speelminuten en beoordeling
              </div>
              {/* ── Eén regel per speler ──
                  Hier stond een kaart per speler met een avatar en veel
                  lucht eromheen: achttien spelers kostten drie schermen.
                  Een tabel doet hetzelfde in één blik, en je kunt de
                  kolommen met elkaar vergelijken — dat is nu juist waar
                  je naar kijkt. */}
              <div className="sp-tabel-rol">
                <table className="sp-tabel">
                  <thead>
                    <tr>
                      <th className="l">Speler</th>
                      <th>Plek</th>
                      <th className="r">Min</th>
                      <th className="r">Cijfer</th>
                      <th className="mid weg-smal">MOTM</th>
                      <th className="l weg-smal">Waar gespeeld</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["basis", "wissel", "afwezig"].map(function (soort) {
                      var rijen = opstelling.filter(function (o) {
                        return (o.spelStatus || "basis") === soort;
                      });
                      if (!rijen.length) return null;
                      var kop = {basis: "Basis", wissel: "Wissels", afwezig: "Afwezig"}[soort];
                      return (
                        <React.Fragment key={soort}>
                          <tr className="sp-groep">
                            <td colSpan="6">{kop + " (" + rijen.length + ")"}</td>
                          </tr>
                          {rijen.map(function (o) {
                            var per = minutenPerPositie(o.spelerId, opstelling, wissels,
                                                        posWissels, wedstrijd.speelduur);
                            var plekken = Object.keys(per)
                              .filter(function (k) { return k !== "?"; })
                              .sort(function (x, y) { return per[y] - per[x]; });
                            var cijfer = wedstrijd.beoordelingen && wedstrijd.beoordelingen[o.spelerId];
                            return (
                              <tr key={o.spelerId} className={soort === "afwezig" ? "sp-weg" : ""}>
                                <td className="l">
                                  <span className="sp-nr">{o.rugnummer || ""}</span>
                                  {o.naam}
                                  {wedstrijd.motm === o.spelerId &&
                                    <i className="fa-solid fa-star sp-ster"/>}
                                </td>
                                <td>{plekken.length ? plekken[0] : (soort === "wissel" ? "bank" : "–")}</td>
                                <td className="r">
                                  {soort === "afwezig" ? "–"
                                    : o.minutenOnzeker ? "—"
                                    : (o.minuten ? o.minuten + "'" : "0'")}
                                </td>
                                <td className="r sp-cijfer">{cijfer || "–"}</td>
                                <td className="mid weg-smal">
                                  {wedstrijd.motm === o.spelerId &&
                                    <i className="fa-solid fa-star" style={{color:"#ffc107"}}/>}
                                </td>
                                <td className="l weg-smal">
                                  {plekken.length > 1
                                    ? plekken.map(function (k) {
                                        return (
                                          <span key={k} className="pos-vak"
                                            title={plekNaam(k) + " · " + per[k] + " minuten"}>
                                            <b>{k}</b>{per[k]}{"'"}
                                          </span>
                                        );
                                      })
                                    : <span className="sp-leeg">
                                        {plekken.length ? plekNaam(plekken[0]) : ""}
                                      </span>}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="sp-onder">
                Minuten en posities volgen uit de wissels. Cijfers en Man of the Match
                vul je in bij Uitslag.
              </p>
            </div>
          )}

          {sectie === "opstelling" && (
            <WedstrijdOpstelling inVenster wedstrijd={wedstrijd} spelers={spelers}
              onOpslaan={function(w){ onUitslagOpslaan(w); }}
              onSluiten={function(){ setSectie(gespeeld ? "wedstrijd" : "rondom"); }} />
          )}

          {sectie === "rollen" && (
            <RollenSectie wedstrijd={wedstrijd} spelers={spelers}
              alleWedstrijden={alleWedstrijden} onOpslaan={bewaarEnMeld} />
          )}

          {sectie === "tactiek" && (
            <WedstrijdTactiek wedstrijd={wedstrijd} spelers={spelers} onOpslaan={bewaarEnMeld} />
          )}

          {sectie === "dsm" && (
            <DSMSectie wedstrijd={wedstrijd} spelers={spelers} onOpslaan={bewaarEnMeld} />
          )}

          {sectie === "tegenstander" && (
            <TegenstanderSectie wedstrijd={wedstrijd} alleWedstrijden={alleWedstrijden}
              onOpslaan={bewaarEnMeld} />
          )}

          {/* Het wedstrijdcentrum en het overzicht van wat er gebeurd is
              stonden onder twee aparte kopjes. Dat waren twee namen voor
              hetzelfde moment: de zaterdagmiddag. Nu staat het onder één
              kopje, met het invullen boven en het overzicht eronder. */}
          {sectie === "wedstrijd" && gespeeld && (
            <div className="w-kolommen">
              <div className="w-kolom">
                      {/* Doelpunten */}
                      {gespeeld && eigenDoelpunten.length>0 && (
                        <div className="kaart detail-sectie">
                          <div className="kaart-titel">{<span><i className="fa-solid fa-futbol"/>{" Doelpunten "+inst().clubNaam}</span>}</div>
                          {eigenDoelpunten.map(sc=>(
                            <div key={sc.id} className="event-rij">
                              <span className="event-icoon"><i className="fa-solid fa-futbol"/></span>
                              <div className="event-info">
                                <div className="event-naam">{sc.naam}</div>
                                {sc.assistNaam && <div className="event-sub">assist {sc.assistNaam}</div>}
                              </div>
                              {sc.minuut&&<div className="event-minuut">{sc.minuut}{"'"}</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Doelpunten tegen */}
                      {gespeeld && tegenDoelpunten.length>0 && (
                        <div className="kaart detail-sectie">
                          <div className="kaart-titel">
                            <span><i className="fa-solid fa-futbol"/>{" Doelpunten " + (wedstrijd.tegenstander || "tegenstander")}</span>
                          </div>
                          {tegenDoelpunten.map(function(sc){
                            return (
                              <div key={sc.id} className="event-rij tegen-rij">
                                <span className="event-icoon"><i className="fa-solid fa-futbol"/></span>
                                <div className="event-info"><div className="event-naam">
                                  {sc.naam || (sc.nummer ? "Nummer " + sc.nummer : "Onbekende speler")}
                                  {sc.naam && sc.nummer ? " #" + sc.nummer : ""}
                                </div></div>
                                {sc.minuut && <div className="event-minuut">{sc.minuut}{"\u2032"}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Kaarten */}
                      {gespeeld && kaarten.length>0 && (
                        <div className="kaart detail-sectie">
                          <div className="kaart-titel"><i className="fa-solid fa-square" style={{color:"#ffc107"}}/> Kaarten</div>
                          {kaarten.map(k=>(
                            <div key={k.id} className="event-rij">
                              <span className="event-icoon"><i className="fa-solid fa-square" style={{color:k.type==="geel"?"#ffc107":"#dc3545"}}/></span>
                              <div className="event-info"><div className="event-naam">{k.naam}</div></div>
                              {k.minuut&&<div className="event-minuut">{k.minuut}{"'"}</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Hier stond een lege <div className="w-kolom">.

                          Een restje van de verbouwing van tabbladen naar
                          kolommen, en het kostte de halve breedte van je
                          scherm: het raster gaf die lege kolom gewoon de
                          rechterhelft, waarna de échte tweede kolom naar
                          de volgende rij zakte — recht ónder de eerste.
                          Op een iPad in liggende stand zag je daardoor
                          alles onder elkaar met rechts een zwart vlak.

                          JSX klopte, de app startte, geen test die het
                          zag. Alleen te zien door ernaar te kijken. */}
                      </div>
              <div className="w-kolom">
                      {/* Man of the Match */}
                      {gespeeld && motmSpeler && (
                        <div className="motm-banner">
                          <i className="fa-solid fa-star" style={{fontSize:22,color:"#ffc107"}}/>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.7,color:"var(--goud)",fontFamily:"'Helvetica Neue',Arial"}}>Man of the Match</div>
                            <div style={{fontSize:16,fontWeight:700,color:"var(--tekst)",fontFamily:"'Helvetica Neue',Arial"}}>{motmSpeler.naam}</div>
                          </div>
                        </div>
                      )}
                      <div className="deel-rij">
                        <button className="knop wa" style={{margin:0,flex:"1 1 200px"}} onClick={function(){setDeelOpen(true);}}>
                          <i className="fa-brands fa-whatsapp" style={{fontSize:18}}/> {gespeeld?"Uitslag delen":"Wedstrijd delen"}
                        </button>
                        <button className="knop pdf-knop" style={{flex:"1 1 200px",justifyContent:"center"}}
                          title="Opstelling, spelersrollen en tactiek in één document"
                          onClick={function(){ exporteerWedstrijdplanPDF(wedstrijd, spelers, false, alleWedstrijden); }}>
                          <i className="fa-solid fa-file-pdf"/> Wedstrijdplan als PDF
                        </button>
                      </div>

                      {/* Wat er in de kleedkamer is besproken */}
                      {gespeeld && ((briefje.plus||[]).length>0 || (briefje.min||[]).length>0) && (
                        <div className="kaart detail-sectie">
                          <div className="kaart-titel"><i className="fa-solid fa-clipboard-list"/> In de kleedkamer</div>
                          <div className="briefje">
                            {[["plus","Goed gedaan","fa-solid fa-thumbs-up","var(--succes)"],
                              ["min","Beter kunnen","fa-solid fa-arrow-trend-up","var(--oranje)"]].map(function(v){
                              var regels = briefje[v[0]]||[];
                              if (!regels.length) return null;
                              return (
                                <div className={"briefje-vak " + v[0]} key={v[0]}>
                                  <div className="briefje-kop" style={{color:v[3]}}><i className={v[2]}/> {v[1]}</div>
                                  {regels.map(function(r){
                                    return (
                                      <div key={r.id} className={"briefje-regel" + (r.af ? " af" : "")}>
                                        <span style={{paddingLeft:2}}>{r.tekst}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                {wedstrijd.notities && (
                  <div className="kaart detail-sectie">
                    <div className="kaart-titel"><i className="fa-solid fa-note-sticky"/> Notities</div>
                    <p style={{fontSize:14,fontWeight:400,lineHeight:1.5}}>{wedstrijd.notities}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {sectie === "rondom" && (
            <React.Fragment>
              {/* ── Het wedstrijdplan hoort op papier vóór de wedstrijd ──
                  Deze knop bestond al, maar stond alleen bij de Uitslag,
                  en dat tabblad verschijnt pas als er gespeeld is. Precies
                  andersom dus: een plan print of presenteer je vrijdags in
                  de kleedkamer, niet zaterdagavond na afloop.

                  Daarom staat hij nu óók hier, bovenaan de voorbereiding,
                  en met opzet zonder de voorwaarde "gespeeld" — dit
                  tabblad is juist van de week ervóór. Loop je er ná de
                  wedstrijd nog eens langs, dan werkt de knop gewoon;
                  exporteerWedstrijdplanPDF maakt daar geen onderscheid in.

                  De knop bij de Uitslag blijft staan waar hij stond: daar
                  dient hij om het plan er achteraf nog eens bij te pakken,
                  en dat is een ander moment dan dit. */}
              <div className="deel-rij" style={{marginTop:12,marginBottom:0}}>
                {/* Geen volle breedte (flex-grow 0): een rode balk over het
                    hele scherm leest als een waarschuwing, en dit is een
                    aanbod. Krimpen mag wél, zodat hij op een telefoon in
                    staande stand niet buiten beeld valt. */}
                <button className="knop pdf-knop" style={{flex:"0 1 260px",justifyContent:"center"}}
                  title="Opstelling, spelersrollen en tactiek in één document"
                  onClick={function(){ exporteerWedstrijdplanPDF(wedstrijd, spelers, false, alleWedstrijden); }}>
                  <i className="fa-solid fa-file-pdf"/> Wedstrijdplan als PDF
                </button>
              </div>
            <div className="w-kolommen">
              <div className="w-kolom">
                      {/* ── Wie fluit er ──
                          Staat bij de voorbereiding en niet bij de rollen,
                          want het is iets wat je opzoekt vlak voordat je
                          vertrekt, niet iets wat je verdeelt. */}
                      {(wedstrijd.scheids || wedstrijd.assistent) && (
                        <div className="kaart detail-sectie">
                          <div className="kaart-titel"><i className="fa-solid fa-user-tie"/> Leiding</div>
                          {wedstrijd.scheids && (
                            <div className="account-rij">
                              <span>Scheidsrechter</span><b>{wedstrijd.scheids}</b>
                            </div>
                          )}
                          {wedstrijd.assistent && (
                            <div className="account-rij">
                              <span>Assistent</span><b>{wedstrijd.assistent}</b>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Opgave vooraf */}
                      {!gespeeld && spelers.length>0 && (
                        <div className="kaart detail-sectie">
                          <div className="kaart-titel"><i className="fa-solid fa-clipboard-check"/> Wie kan er spelen?</div>
                          <SpelerStatusRaster
                            spelers={spelers}
                            statussen={spelers.reduce(function(o,s){ o[s.id]=opgaveVanSpeler(opgave,s.id); return o; },{})}
                            opties={OPGAVE_KEUZES}
                            standaard="onbekend"
                            onWissel={function(speler,status){
                              var nieuw = zetOpgave(opgave, speler, status);
                              setOpgaveLijst(nieuw);
                              onUitslagOpslaan(Object.assign({}, wedstrijd, {opgave:nieuw}));
                            }}
                            onAlles={function(status){
                              var nieuw = opgave;
                              spelers.forEach(function(s){ nieuw = zetOpgave(nieuw, s, status); });
                              setOpgaveLijst(nieuw);
                              onUitslagOpslaan(Object.assign({}, wedstrijd, {opgave:nieuw}));
                            }} />
                        </div>
                      )}

                      {/* Hier stond een lege <div className="w-kolom">.

                          Een restje van de verbouwing van tabbladen naar
                          kolommen, en het kostte de halve breedte van je
                          scherm: het raster gaf die lege kolom gewoon de
                          rechterhelft, waarna de échte tweede kolom naar
                          de volgende rij zakte — recht ónder de eerste.
                          Op een iPad in liggende stand zag je daardoor
                          alles onder elkaar met rechts een zwart vlak.

                          JSX klopte, de app startte, geen test die het
                          zag. Alleen te zien door ernaar te kijken. */}
                      </div>
              <div className="w-kolom">
                      {/* ── Rijschema staat rechts ──
                          Naast de opgave en niet eronder: het zijn twee
                          kanten van dezelfde vraag — wie is er, en hoe
                          komt hij er. Links de opgave, die lang is
                          met achttien spelers; rechts alles wat je daarna
                          regelt. Zo staat er op een iPad in liggende stand
                          niets meer nutteloos onder elkaar. */}
                      {/* Rijschema */}
                      {!gespeeld && !wedstrijd.thuis && spelers.length>0 && (
                        <div className="kaart detail-sectie">
                          <div className="kaart-titel"><i className="fa-solid fa-car"/> Rijschema</div>
                          {(function(){
                            var ritten = wedstrijd.rijschema||[];
                            var ingedeeld = [];
                            ritten.forEach(function(r){ ingedeeld = ingedeeld.concat(r.spelerIds||[]); });
                            var zonder = spelers.filter(function(s){ return ingedeeld.indexOf(s.id)<0; });
                            var plekkenTotaal = ritten.reduce(function(s,r){ return s+(Number(r.plekken)||0); },0);
                            return (
                              <div>
                                <div className="opgave-telling" style={{marginBottom:10}}>
                                  <div className="opgave-tel-blok">
                                    <div className="opgave-tel-getal" style={{color:"var(--blauw)"}}>{ritten.length}</div>
                                    <div className="opgave-tel-label">Auto's</div>
                                  </div>
                                  <div className="opgave-tel-blok">
                                    <div className="opgave-tel-getal" style={{color:"var(--succes)"}}>{ingedeeld.length+"/"+plekkenTotaal}</div>
                                    <div className="opgave-tel-label">Plekken</div>
                                  </div>
                                  <div className="opgave-tel-blok">
                                    <div className="opgave-tel-getal" style={{color:zonder.length>0?"var(--gevaar)":"var(--grijs-donker)"}}>{zonder.length}</div>
                                    <div className="opgave-tel-label">Nog niet mee</div>
                                  </div>
                                </div>

                                {ritten.map(function(r){
                                  var vol = (r.spelerIds||[]).length >= r.plekken;
                                  return (
                                    <div key={r.id} className="rit-kaart">
                                      <div className="rit-kop">
                                        <div className="taak-icoon" style={{width:30,height:30,fontSize:13}}><i className="fa-solid fa-car"/></div>
                                        <div className="rit-naam">{r.chauffeur}</div>
                                        <span className="rit-plek" style={{color:vol?"var(--succes)":"var(--grijs-donker)"}}>
                                          <i className="fa-solid fa-user-group"/>{" "+(r.spelerIds||[]).length+"/"+r.plekken}
                                        </span>
                                        <button className="knop gevaar klein" style={{padding:"4px 8px"}}
                                          onClick={function(){verwijderRit(r.id);}}><i className="fa-solid fa-trash"/></button>
                                      </div>
                                      <div style={{marginTop:6}}>
                                        {(r.spelerIds||[]).map(function(id){
                                          var sp = spelers.find(function(s){return s.id===id;});
                                          if (!sp) return null;
                                          return (
                                            <span key={id} className="rit-inzittende">
                                              <button onClick={function(){wisselInzittende(r.id,id);}}>×</button>
                                              {sp.naam.split(" ")[0]}
                                            </span>
                                          );
                                        })}
                                        {(r.spelerIds||[]).length===0 && (
                                          <span style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400}}>Nog niemand ingedeeld</span>
                                        )}
                                      </div>
                                      {!vol && zonder.length>0 && (
                                        <select className="formulier-input" style={{marginTop:8,marginBottom:0,fontSize:12,padding:"7px 8px"}}
                                          value="" onChange={function(e){ if(e.target.value) wisselInzittende(r.id, e.target.value); }}>
                                          <option value="">+ Speler toevoegen…</option>
                                          {zonder.map(function(s){
                                            return <option key={s.id} value={s.id}>{s.naam}</option>;
                                          })}
                                        </select>
                                      )}
                                    </div>
                                  );
                                })}

                                <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:4}}
                                  onClick={voegRitToe}>
                                  <i className="fa-solid fa-plus"/> Auto toevoegen
                                </button>

                                {zonder.length>0 && ritten.length>0 && (
                                  <p style={{fontSize:12,color:"var(--gevaar)",fontWeight:600,marginTop:10,lineHeight:1.5}}>
                                    {"Nog geen vervoer voor: "+zonder.map(function(s){return s.naam.split(" ")[0];}).join(", ")}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Teamtaken */}
                      {!gespeeld && spelers.length>0 && (
                        <div className="kaart detail-sectie">
                          <div className="kaart-titel" style={{justifyContent:"space-between"}}>
                            <span><i className="fa-solid fa-list-check"/> Teamtaken</span>
                            <button className="knop lijn klein" style={{padding:"4px 10px",fontSize:11}}
                              onClick={verdeelTakenAutomatisch}>
                              <i className="fa-solid fa-shuffle"/> Verdeel
                            </button>
                          </div>
                          {takenLijst.map(function(t){
                            var huidig = (wedstrijd.taken||{})[t.id] || "";
                            var aantal = huidig ? taakTelling(t.id, huidig, alleWedstrijden) : 0;
                            return (
                              <div key={t.id} className="taak-rij">
                                <div className="taak-icoon"><i className={t.icoon}/></div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:13,fontWeight:700,fontFamily:"'Helvetica Neue',Arial"}}>{t.naam}</div>
                                  {huidig && aantal>0 && (
                                    <div style={{fontSize:11,color:"var(--grijs-donker)",marginTop:2}}>
                                      {aantal+"e keer dit seizoen"}
                                    </div>
                                  )}
                                </div>
                                <select className="formulier-input" style={{width:135,marginBottom:0,fontSize:12,padding:"7px 8px"}}
                                  value={huidig} onChange={function(e){wijzigTaak(t.id, e.target.value);}}>
                                  <option value="">Nog niemand</option>
                                  {spelers.map(function(s){
                                    return <option key={s.id} value={s.id}>{s.naam}</option>;
                                  })}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}

                <UitleenSectie wedstrijd={wedstrijd} spelers={spelers}
                  alleWedstrijden={alleWedstrijden} onOpslaan={bewaarEnMeld} />
                <GastenSectie wedstrijd={wedstrijd} onOpslaan={bewaarEnMeld} />
              </div>
            </div>
            </React.Fragment>
          )}
        </div>
      </div>

      {opstellingOpen && (
        <WerkVenster breed eigenVoet titel="Opstelling"
          subtitel={wedstrijd.formatie+" · tik op een plek om een speler te zetten"}
          onSluiten={function(){ setOpstellingOpen(false); }}>
          <WedstrijdOpstelling inVenster wedstrijd={wedstrijd} spelers={spelers}
            onOpslaan={function(w){ onUitslagOpslaan(w); setOpstellingOpen(false); }}
            onSluiten={function(){ setOpstellingOpen(false); }} />
        </WerkVenster>
      )}

      {subScherm==="rollen" && (
        <WerkVenster titel="Spelersrollen" subtitel="Wie neemt wat deze wedstrijd"
          kopExtra={<BewaarMelder teller={bewaarTeller} />}
          onSluiten={function(){ setSubScherm(null); }}>
          <RollenSectie wedstrijd={wedstrijd} spelers={spelers}
            alleWedstrijden={alleWedstrijden} onOpslaan={bewaarEnMeld} />
        </WerkVenster>
      )}

      {subScherm==="tegenstander" && (
        <WerkVenster titel="Tegenstander" subtitel="Hoe spelen ze en waar letten we op"
          kopExtra={<BewaarMelder teller={bewaarTeller} />}
          onSluiten={function(){ setSubScherm(null); }}>
          <TegenstanderSectie wedstrijd={wedstrijd} alleWedstrijden={alleWedstrijden}
            onOpslaan={bewaarEnMeld} />
        </WerkVenster>
      )}

      {subScherm==="dsm" && (
        <WerkVenster breed titel="Spelhervattingen" subtitel="Corners en vrije trappen, voor en tegen"
          kopExtra={<BewaarMelder teller={bewaarTeller} />}
          onSluiten={function(){ setSubScherm(null); }}>
          <DSMSectie wedstrijd={wedstrijd} spelers={spelers} onOpslaan={bewaarEnMeld} />
        </WerkVenster>
      )}

      {subScherm==="tactiek" && (
        <WerkVenster breed titel="Tactiek" subtitel="Teamplan en opdracht per speler"
          kopExtra={<BewaarMelder teller={bewaarTeller} />}
          onSluiten={function(){ setSubScherm(null); }}>
          <WedstrijdTactiek wedstrijd={wedstrijd} spelers={spelers} onOpslaan={bewaarEnMeld} />
        </WerkVenster>
      )}

      {uitslagOpen&&<UitslagFormulier wedstrijd={wedstrijd} spelers={spelers} onOpslaan={w=>{onUitslagOpslaan(w);setUitslagOpen(false);}} onSluiten={()=>setUitslagOpen(false)} />}

      {deelOpen&&(
        <DeelVenster
          titel={(wedstrijd.status==="gespeeld"?"Uitslag":"Wedstrijd")+" delen"}
          pdfLabel="Wedstrijdplan"
          pdfActie={function(){ exporteerWedstrijdplanPDF(wedstrijd, spelers, true, alleWedstrijden); }}
          varianten={deelVariantenWedstrijd(wedstrijd, spelers, laadWedstrijden())}
          onSluiten={function(){setDeelOpen(false);}} />
      )}

      {resetOpen&&(
        <div className="bevestig-overlay" onClick={function(e){if(e.target===e.currentTarget)setResetOpen(false);}}>
          <div className="bevestig-kaart">
            <h3>Uitslag wissen?</h3>
            <p style={{marginBottom:10}}>
              De wedstrijd tegen {wedstrijd.tegenstander} komt weer op <strong>gepland</strong> te staan.
            </p>
            <div style={{textAlign:"left",fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.7,marginBottom:14}}>
              <div><i className="fa-solid fa-xmark" style={{color:"var(--gevaar)",width:14}}/> uitslag, doelpunten en kaarten</div>
              <div><i className="fa-solid fa-xmark" style={{color:"var(--gevaar)",width:14}}/> wissels, cijfers en man of the match</div>
              {wedstrijd.liveGeanalyseerd&&<div><i className="fa-solid fa-xmark" style={{color:"var(--gevaar)",width:14}}/> de live-analyse van deze wedstrijd</div>}
              <div><i className="fa-solid fa-check" style={{color:"var(--succes)",width:14}}/> opstelling en bank blijven staan</div>
              <div><i className="fa-solid fa-check" style={{color:"var(--succes)",width:14}}/> opgave, taken en rijschema blijven staan</div>
            </div>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){setResetOpen(false);}}>Annuleren</button>
              <button className="knop" onClick={zetTerugNaarGepland}>
                <i className="fa-solid fa-rotate-left"/> Terug naar gepland
              </button>
            </div>
          </div>
        </div>
      )}

      {bevestig&&(
        <div className="bevestig-overlay">
          <div className="bevestig-kaart">
            <h3>Wedstrijd verwijderen?</h3>
            <p>De wedstrijd vs. {wedstrijd.tegenstander} wordt definitief verwijderd.</p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={()=>setBevestig(false)}>Annuleren</button>
              <button className="knop gevaar" onClick={onVerwijderen}>Verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   WEDSTRIJDEN MODULE
═══════════════════════════════════════════════════════════ */
function WedstrijdenModule() {
  const [wedstrijden,setWedstrijden]=useState(laadWedstrijden);
  const [spelers]=useState(laadSpelers);
  const [gekozen,setGekozen]=useState(null);
  const [formulierOpen,setFormulier]=useState(false);
  const [bewerkW,setBewerkW]=useState(null);
  const [filter,setFilter]=useState("alle");
  const [zoek,setZoek]=useState("");
  const [hoofdTab,setHoofdTab]=useState("wedstrijden");
  const [alleSeizoenen,setAlleSeizoenen]=useState(false);
  const [importOpen,setImportOpen]=useState(false);

  function laadIngebouwdProgramma() {
    var bestaandeSleutels = wedstrijden.map(function(w){
      return w.datum+"|"+String(w.tegenstander||"").toLowerCase().trim();
    });
    var nieuwe = INGEBOUWD_PROGRAMMA.filter(function(w){
      return bestaandeSleutels.indexOf(w.datum+"|"+w.tegenstander.toLowerCase().trim()) < 0;
    }).map(function(w,i){
      return Object.assign({}, LEEG_WEDSTRIJD, {
        id: Date.now()+i,
        tegenstander: w.tegenstander,
        datum: w.datum,
        tijd: w.tijd,
        thuis: w.thuis,
        locatie: w.thuis ? (inst().locatie || "Sportpark De Zeehoek") : "",
        speelduur: inst().speelduur||90,
        status: "gepland"
      });
    });
    if (nieuwe.length===0) { toon("Deze wedstrijden staan er al in."); return; }
    setWedstrijden(function(l){ return l.concat(nieuwe); });
    meldGoed(nieuwe.length+" wedstrijd"+(nieuwe.length===1?"":"en")+" toegevoegd");
  }

  function importeerWedstrijden(lijst) {
    var nieuwe = lijst.map(function(w,i){
      return Object.assign({}, LEEG_WEDSTRIJD, {
        id: Date.now()+i,
        tegenstander: w.tegenstander,
        datum: w.datum,
        tijd: w.tijd,
        locatie: w.locatie || (w.thuis ? (inst().locatie||"") : ""),
        thuis: w.thuis,
        speelduur: inst().speelduur||90,
        status: "gepland"
      });
    });
    setWedstrijden(function(l){ return l.concat(nieuwe); });
    setImportOpen(false);
    meldGoed(nieuwe.length+" wedstrijd"+(nieuwe.length===1?"":"en")+" toegevoegd");
  }

  useEffect(()=>{slaJson(WEDSTRIJDEN_KEY,wedstrijden);},[wedstrijden]);

  function slaOp(w) {
    const bestond = wedstrijden.some(x=>x.id===w.id);
    setWedstrijden(l=>{ const b=l.find(x=>x.id===w.id); return b?l.map(x=>x.id===w.id?w:x):[...l,w]; });
    setFormulier(false); setBewerkW(null);
    if(gekozen?.id===w.id) setGekozen(w);
    if(!bestond) meldGoed("Wedstrijd tegen "+w.tegenstander+" toegevoegd");
  }

  function verwijder() {
    const weg = gekozen;
    setWedstrijden(l=>l.filter(x=>x.id!==weg.id));
    setGekozen(null);
    toon("Wedstrijd tegen "+weg.tegenstander+" verwijderd", {
      actie: function(){ setWedstrijden(function(l){ return l.concat([weg]); }); }
    });
  }

  /* Wat nog komt lees je van vroeg naar laat, wat geweest is juist andersom:
     de eerstvolgende wedstrijd bovenaan, en het laatste resultaat ook. */
  const opDatum = function(lijst, oplopend){
    return lijst.slice().sort(function(a,b){
      var d = new Date(a.datum) - new Date(b.datum);
      if (d !== 0) return oplopend ? d : -d;
      return (a.tijd||"") < (b.tijd||"") ? (oplopend?-1:1) : (oplopend?1:-1);
    });
  };
  const geplandLijst  = opDatum(wedstrijden.filter(function(w){ return w.status==="gepland"; }), true);
  const gespeeldLijst = opDatum(wedstrijden.filter(function(w){ return w.status==="gespeeld"; }), false);
  const opStatus = filter==="gepland" ? geplandLijst
    : filter==="gespeeld" ? gespeeldLijst
    : geplandLijst.concat(gespeeldLijst);
  const opZoek = opStatus.filter(function(w){
    const q = zoek.trim().toLowerCase();
    if (!q) return true;
    return (w.tegenstander||"").toLowerCase().indexOf(q)>=0 || (w.locatie||"").toLowerCase().indexOf(q)>=0;
  });
  /* Hier stond een filter op seizoen. Dat is overbodig geworden: wat je
     hier ziet komt uit de gegevens van één seizoen, dus er kán niets
     van vorig jaar tussen staan. Een wedstrijd waarvan de datum buiten
     het seizoen valt — een oefenpotje in juni, een toernooi dat over de
     grens loopt — hoort er gewoon bij en verdwijnt niet meer. */
  const vanEerder = [];
  const gefilterd = opZoek;

  const aankomend = wedstrijden.filter(w=>w.status==="gepland").sort((a,b)=>new Date(a.datum)-new Date(b.datum));

  if(gekozen) return (
    <>
      <WedstrijdDetail
        wedstrijd={gekozen} spelers={spelers}
        onTerug={()=>setGekozen(null)}
        onBewerken={()=>{setBewerkW(gekozen);setFormulier(true);}}
        onVerwijderen={verwijder}
        onUitslagOpslaan={w=>slaOp(w)}
      />
      {formulierOpen&&<WedstrijdFormulier wedstrijd={bewerkW} spelers={spelers} onOpslaan={slaOp} onSluiten={()=>{setFormulier(false);setBewerkW(null);}} />}
    </>
  );

  if (hoofdTab==="toernooien") return (
    <div>
      <div className="tabs">
        <button className="tab-knop" onClick={function(){setHoofdTab("wedstrijden");}}><i className="fa-solid fa-futbol"/> Wedstrijden</button>
        <button className="tab-knop actief" onClick={function(){setHoofdTab("toernooien");}}><i className="fa-solid fa-trophy"/> Toernooien</button>
      </div>
      <ToernooienTab />
    </div>
  );

  return (
    <div>
      <div className="tabs">
        <button className="tab-knop actief" onClick={function(){setHoofdTab("wedstrijden");}}><i className="fa-solid fa-futbol"/> Wedstrijden</button>
        <button className="tab-knop" onClick={function(){setHoofdTab("toernooien");}}><i className="fa-solid fa-trophy"/> Toernooien</button>
      </div>
      <div className="pagina-header">
        <div className="pagina-header-tekst"><div className="eyebrow">Programma &amp; uitslagen</div><h2>Wedstrijden</h2><p>{wedstrijden.length} wedstrijd{wedstrijden.length!==1?"en":""} gepland</p></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="knop lijn klein" style={{padding:"9px 12px"}} title="Programma van voetbal.nl laden"
            onClick={laadIngebouwdProgramma}>
            <i className="fa-solid fa-download"/>
          </button>
          <button className="knop lijn klein" style={{padding:"9px 12px"}} title="Uit bestand importeren"
            onClick={function(){setImportOpen(true);}}>
            <i className="fa-solid fa-file-import"/>
          </button>
          <button className="knop-plus" onClick={()=>{setBewerkW(null);setFormulier(true);}}>+</button>
        </div>
      </div>

      {importOpen && (
        <ImportSheet bestaande={wedstrijden} onImporteren={importeerWedstrijden}
          onSluiten={function(){setImportOpen(false);}} />
      )}

      {/* Zoeken + filter */}
      {wedstrijden.length>0&&(
        <input className="zoekbalk" placeholder="Zoek op tegenstander of locatie…" value={zoek}
          onChange={function(e){setZoek(e.target.value);}} />
      )}
      {wedstrijden.length>0&&(
        <React.Fragment>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {[{id:"gespeeld",l:"Uitslagen",n:gespeeldLijst.length},
              {id:"gepland", l:"Aankomende",n:geplandLijst.length},
              {id:"alle",    l:"Alle",      n:wedstrijden.length}].map(function(f){
              var aan = filter===f.id;
              return (
                <button key={f.id} className="filter-chip"
                  style={{borderColor:aan?"var(--blauw)":"var(--grijs)",background:aan?"var(--blauw)":"var(--wit)",color:aan?"var(--wit)":"var(--grijs-donker)"}}
                  onClick={function(){ setFilter(f.id); }}>
                  {f.l} <span style={{opacity:.75}}>{f.n}</span>
                </button>
              );
            })}
          </div>
          {vanEerder.length>0 && vanDitSeizoen.length>0 && (
            <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginBottom:14}}
              onClick={function(){ setAlleSeizoenen(!alleSeizoenen); }}>
              <i className={alleSeizoenen?"fa-solid fa-chevron-up":"fa-solid fa-clock-rotate-left"}/>
              {alleSeizoenen
                ? " Alleen " + ditSeizoen + " tonen"
                : " " + vanEerder.length + " wedstrijd" + (vanEerder.length===1?"":"en") + " van buiten " + ditSeizoen + " tonen"}
            </button>
          )}
        </React.Fragment>
      )}

      {wedstrijden.length===0&&!importOpen?(
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-futbol"/></div>
          <h3>Nog geen wedstrijden</h3>
          <p>Laad het programma van voetbal.nl in, of voeg zelf een wedstrijd toe.</p>
          <button className="knop" style={{marginBottom:8}} onClick={laadIngebouwdProgramma}>
            <i className="fa-solid fa-download"/>{" Programma laden ("+INGEBOUWD_PROGRAMMA.length+" wedstrijden)"}
          </button>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            <button className="knop lijn klein" onClick={function(){setImportOpen(true);}}>
              <i className="fa-solid fa-file-import"/> Uit bestand
            </button>
            <button className="knop lijn klein" onClick={()=>{setBewerkW(null);setFormulier(true);}}>
              + Zelf toevoegen
            </button>
          </div>
        </div>
      ):(
        <div>
          {[{id:"gepland", titel:"Nog te spelen", icoon:"fa-solid fa-calendar-days", kleur:"var(--blauw)"},
            {id:"gespeeld", titel:"Gespeeld", icoon:"fa-solid fa-clock-rotate-left", kleur:"var(--grijs-donker)"}]
            .map(function(groep){
              var inGroep = gefilterd.filter(function(w){ return w.status===groep.id; });
              if (inGroep.length===0) return null;
              return (
                <div key={groep.id} className="linie-groep">
                  <div className="linie-kop">
                    <span className="db-agenda-icoon" style={{background:groep.kleur,width:24,height:24,fontSize:10,borderRadius:7}}>
                      <i className={groep.icoon}/>
                    </span>
                    <span className="linie-naam">{groep.titel}</span>
                    <span className="linie-tel">{inGroep.length}</span>
                  </div>
                  <div className="kaart lijst-raster">
                    {inGroep.map(function(w){
                      var res = resultaat(w);
                      var teller = w.status==="gepland" ? dagenTot(w.datum) : "";
                      return (
                        <div key={w.id} className="w-item" onClick={function(){setGekozen(w);}}>
                          <div className={"w-status-dot "+res}/>
                          <div className="w-info">
                            <div className="w-tegenstander">
                vs. {w.tegenstander}
                {wedstrijdSoort(w).id!=="competitie" && (
                  <span className="w-soort" style={{background:wedstrijdSoort(w).kleur}}>
                    {wedstrijdSoort(w).kort}
                  </span>
                )}
              </div>
                            <div className="w-sub">
                              {w.datum?formateerDatumKort(w.datum):""}
                              {w.tijd?" · "+w.tijd:""}
                              {w.thuis?" · Thuis":" · Uit"}
                              {w.locatie?" · "+w.locatie:""}
                              {teller ? " · "+teller : ""}
                            </div>
                          </div>
                          <div className={"w-score-badge "+res}>
                            {w.status==="gespeeld" ? w.score.fch+" – "+w.score.teg : "Gepland"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {formulierOpen&&<WedstrijdFormulier wedstrijd={bewerkW} spelers={spelers} onOpslaan={slaOp} onSluiten={()=>{setFormulier(false);setBewerkW(null);}} />}
    </div>
  );
}
