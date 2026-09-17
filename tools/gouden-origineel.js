#!/usr/bin/env node
/* ══ HET GOUDEN ORIGINEEL ═════════════════════════════════════
   Legt vast hoe TEAMTAKKIE er nú uitziet, zodat je na een verbouwing
   kunt bewijzen dat er niets veranderd is wat niet mocht veranderen.

       node tools/gouden-origineel.js --opnemen
       node tools/gouden-origineel.js --vergelijk
       node tools/gouden-origineel.js --vergelijk --set=free

   --opnemen   opent online/index.html in een echte browser, met een
               vaste localStorage-vulling, en schrijft van elk scherm
               de DOM en een schermafdruk weg — plus van elke plek die
               alleen achter een klik zit.
   --vergelijk doet precies hetzelfde en legt het naast de opname.
               Is er ook maar één regel DOM anders, dan eindigt het
               script met code 1 en staat in tools/gouden-origineel/
               verschil/<set>/ per scherm wat er anders is, met de
               schermafdruk van vóór en ná naast elkaar.
   --set=      één set in plaats van alle. Zonder deze vlag worden ze
               allemaal gedaan.

   ── TWEE SETS, WANT ER ZIJN TWEE BELEVINGEN ──────────────────
   Sinds 11 september schermt het pakket echt iets af. Daarmee is er
   niet één app meer om vast te leggen maar twee:

     referentie/club/   8 schermen + 4 achter een klik = 12 opnames
                        Alles open, geen enkel slotje. Dit bewijst dat
                        de betaalde beleving onveranderd is. De drie
                        achter een klik zijn het tabblad Ontwikkeling,
                        het instellingenvenster en het bevestigings-
                        scherm van "Vereniging opheffen".
     referentie/free/   4 schermen + 4 achter een klik   = 8 opnames
                        Trainingen, Statistieken, Live en Clubhuis
                        zitten op slot. Dit bewijst hoe een slot eruit-
                        ziet: de slotjes in het zijmenu en de onder-
                        balk, de vergrendelde Trainingen-kaart op het
                        dashboard, de tegels met badge, het slot op het
                        tabblad Ontwikkeling, de melding na een tik en
                        de prijskaart erachter.

   Waarom dat tweede er moet zijn: álles wat er op 11 september is
   bijgebouwd staat achter !magPagina(...) of !magModule(...). In een
   opname met pakket club is daar per definitie niets van te zien. De
   set club kan dus groen blijven terwijl de hele Free-beleving
   omvalt — dat is precies wat er die dag gebeurde.

   Het verschil tussen de twee sets is één regel in localStorage:
   tt_licentie_v1. Verder zijn de gegevens, de klok en het venster
   identiek, zodat een verschil tussen de sets nooit aan iets anders
   kan liggen dan aan het pakket.

   ── WAAROM DIT DE ENIGE UITZONDERING IS ──────────────────────
   Voor alles in tests/ geldt: geen framework, geen npm install, geen
   bouwstap. Evan moet `node tests/seizoen.test.js` kunnen typen en een
   uitslag krijgen, zonder iets te installeren. Die regel staat er niet
   voor niets: elke installatiestap is een reden om een test niet te
   draaien.

   Hier kan dat niet. Dit script moet een echte browser aansturen —
   React laten renderen, Babel 30.870 regels JSX laten vertalen, de
   uitkomst fotograferen. Kale node heeft geen browser. Daarom, en
   alleen daarom, staat hier een package.json.

   De scheiding is streng:
     tools/package.json en tools/node_modules  →  alleen voor dít script
     tests/*.test.js                           →  raakt er niets van
   `node tests/seizoen.test.js` blijft werken op een verse clone zonder
   dat er iets geïnstalleerd is. Controleer dat ook zo als je hier iets
   verandert.

   Eenmalig installeren:
       npm install --prefix tools
   Er wordt met opzet `playwright-core` gebruikt in plaats van
   `playwright`: dat scheelt het downloaden van ~150 MB aan browsers.
   Dit script gebruikt de Google Chrome die al op de Mac staat.

   ── WAT ER TEGEN JE WERKT, EN WAT ERAAN GEDAAN IS ────────────
   1. Traag opstarten. babel-standalone vertaalt de hele app in de
      browser van de bezoeker. Een vaste wachttijd zou of te kort zijn
      (halve opname) of onnodig lang. Daarom wacht dit script op echte
      signalen: de app-schil staat er, het synclampje is uitgeraasd, de
      lettertypen zijn geladen, en de DOM verandert twee metingen lang
      niet meer. Zie wachtTotRustig().
   2. Alles wat per dag verschilt. De klok staat vast op 15 oktober
      2026, 12:00 Amsterdam (zie vulling.js). Zonder dat zou elke
      leeftijd, elke "volgende wedstrijd" en elke agendamaand de
      vergelijking morgen rood maken. Wat de vaste klok niet afdekt,
      wordt uit de DOM gefilterd — de volledige lijst staat bij
      SCHOONMAAK hieronder, met per regel waarom.
   3. De service worker (online/sw.js). Die bewaart de app en de vijf
      bibliotheken en kan tussen twee metingen gaan cachen, waardoor je
      de vorige versie meet in plaats van de huidige. Het script zet
      hem uit met serviceWorkers:"block".
   4. Echte Supabase. Er gaat geen enkel verzoek het netwerk op naar de
      server: alles naar *.supabase.co wordt afgebroken. De app komt
      daardoor in de stand "Geen verbinding" terecht, en dat is precies
      de toestand die we vastleggen — reproduceerbaar, en zonder dat er
      ooit een testopname bij echte gegevens in de buurt komt.
      Ook elk ánder buitenadres dan de vijf bekende CDN's wordt
      afgebroken én genoteerd in referentie/<set>/netwerk.txt. Zet iemand er
      een nieuwe externe dienst in, dan wordt dat bestand rood. Dat is
      met opzet: een nieuw buitenadres is een privacyvraag.
   5. De CDN's zelf (React, Babel, jsPDF, Three.js, Font Awesome,
      Google Fonts) moeten wél laden. Die worden één keer opgehaald en
      daarna uit tools/gouden-origineel/cdn-cache/ geserveerd. Daarmee
      is de tweede opname niet meer van internet afhankelijk en kan hij
      niet stilletjes veranderen. Die map gaat niet mee in git (te
      groot, en het is andermans code): zie het .gitignore erin.

   ── WAT ER WEL EN NIET WORDT VASTGELEGD ──────────────────────
   Vastgelegd wordt, per scherm:
     • de volledige DOM onder <div id="root">, dus inclusief zijbalk,
       kopbalk en onderbalk. Dat is met opzet: Fenna gaat de router en
       béide menu's aanpassen, en dan moet elk scherm dat merken.
     • en hetzelfde van elke diepteopname (DIEPTES_CLUB /
       DIEPTES_FREE): een plek die alleen te bereiken is door ergens
       op te klikken.
     • één schermafdruk van 1280×900 (het zichtbare deel), geen
       volledige pagina.

   Waarom niet de volledige pagina: acht volledige schermafdrukken van
   een scrollende pagina zijn samen al gauw 6 MB in een repo waarin ze
   bij elke opname opnieuw worden geschreven. De DOM is de rechter —
   die vangt ook wat buiten beeld staat, tot op het attribuut. De
   schermafdruk is er voor het oog: om te zien wát er anders is als de
   DOM rood wordt. Daarom 1280×900 op schaal 1, PNG, samen ongeveer
   1 MB.

   De schermafdrukken tellen wél mee, maar met een marge. Twee opnames
   van dezelfde app zijn nooit byte-voor-byte gelijk (antialiasing), en
   een test die daarop rood staat gelooft niemand meer. Er wordt dus
   geteld hoeveel beeldpunten écht afwijken; zie KLEUR_MARGE en
   PIXEL_DREMPEL hieronder, met de meting die die getallen rechtvaardigt.
   Dat is nodig, want een kleur, een lijndikte of een lettertype staat
   nergens in de DOM: alleen de schermafdruk ziet dat.

   ── WAT DIT NIET DEKT (gemeten, niet gegokt) ─────────────────
   Op 11 september 2026 zijn er negen opzettelijke fouten in
   online/index.html teruggezet om te kijken wat het vangnet vangt.
   Zeven werden gevangen. Wat er níét uit komt:

   1. Alles achter een venster, een tab of een knop. Zo'n plek staat bij
      geen enkele schermopname open, dus verandert er iets, dan blijft
      alles groen. Dat geldt voor het tabblad Stand binnen Statistieken
      en voor de subtabs Aanval/Discipline/Betrokkenheid binnen Individu
      (het tabblad Individu zelf, de openingsstand met de standaard-
      speler, is sinds 17 september gedekt — zie DIEPTES_CLUB), voor de
      vier onderdelen van het Clubhuis, en voor elk formulier.
      → Wie daar iets verandert, heeft hier géén vangnet. Dat is de
        belangrijkste bekende beperking van dit gereedschap.

      OP 11 EN 12 SEPTEMBER ZIJN DAAR VIJF GATEN VAN GEDICHT, alle
      vijf op een plek waar het pakket iets afschermt: het tabblad
      Ontwikkeling (open in club, op slot in free), de melding na een
      tik op een vergrendeld menu-item, de prijskaart die daarachter
      opengaat, en de melding na een tik op het vergrendelde tabblad.

      OP 16 SEPTEMBER ZIJN ER TWEE BIJ GEKOMEN: het instellingenvenster
      en het bevestigingsscherm van "Vereniging opheffen". Dat venster
      wás het schoolvoorbeeld in deze alinea — een tikfout in de titel
      ("Instelingen") gaf groen — en het werd dringend toen de knop die
      een hele vereniging weggooit erin kwam te staan. De meting die dat
      besluit droeg staat bij DIEPTES_CLUB hieronder.

      OP 17 SEPTEMBER IS ER ÉÉN BIJ GEKOMEN: het tabblad Individu binnen
      Statistieken (de openingsstand, met de standaard-speler). Niet
      omdat daar iets stuk was, maar omdat er een gedragswijziging aan
      trainPct in de planning staat (het samenvoegen van vijf uiteen-
      lopende opkomstberekeningen, zie src/domein/opkomst.js) die dit
      scherm zichtbaar raakt. Zonder deze opname zou die wijziging
      zonder vangnet blijven. Zie de uitleg bij "statistieken-individu"
      in DIEPTES_CLUB hieronder.

      Alle ándere tabs, vensters en formulieren staan nog steeds
      nergens op: dat zijn er, geteld in online/index.html, nog
      tientallen.
   2. Het tweede team en andere seizoenen. De opname staat op één team
      in één seizoen; van team wisselen gebeurt niet.
   3. Smalle schermen. Er wordt één venster van 1280×900 vastgelegd. De
      onderbalk met vijf knoppen (navItems) is op die breedte verborgen
      — hij staat wél in de DOM en wordt dus wel gecontroleerd, maar
      hoe de app op een telefoon oogt niet.
   4. Wat er in een <canvas> getekend wordt — de grafieken, het
      tekenbord, het 3D-sportpark. Zie de SCHOONMAAK-uitleg bij
      leesDom() verderop.

   5. Coach. Er zijn drie pakketten en twee sets. Coach en Club
      hebben exact dezelfde modules (ze verschillen alleen in het
      aantal teams), dus de set club dekt de schermen van Coach mee.
      Wat níét gedekt is, is alles wat aan het aantal teams hangt: de
      melding bij de teamlimiet en de teamkiezer met twee teams.

   Wat er wél uitkomt en makkelijk onderschat wordt: attributen die je
   niet ziet. Het weghalen van aria-current uit het zijmenu — puur een
   toegankelijkheidsregressie, geen enkel beeldpunt anders — maakte
   alle acht schermen rood. En in de set free wordt élk aria-label van
   een slotje meegeschreven, dus ook een slot dat er alleen voor het
   oog is en niet voor een voorleeshulp valt op.

   ══════════════════════════════════════════════════════════ */

"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
/* Vriendelijk omvallen als er nog niets geïnstalleerd is. Een
   stacktrace over een ontbrekende module helpt niemand verder. */
let chromium;
try { chromium = require("playwright-core").chromium; }
catch (e) {
  console.error("Playwright staat nog niet geïnstalleerd. Eén keer, in de projectmap:\n" +
                "\n    npm install --prefix tools\n\n" +
                "Dat raakt tests/ niet: die blijven met kale node draaien.");
  process.exit(2);
}

const WORTEL = path.resolve(__dirname, "..");
const APP_MAP = path.join(WORTEL, "online");
const HIER = path.join(__dirname, "gouden-origineel");
/* Er is niet één opname maar één per set (zie SETS hieronder), en ze
   staan in hun eigen map. Anders zouden twee opnames van hetzelfde
   scherm elkaar overschrijven en zou --vergelijk niet kunnen zeggen
   wélke beleving er veranderd is. */
const REFERENTIE_BASIS = path.join(HIER, "referentie");
const VERSCHIL_BASIS = path.join(HIER, "verschil");
function refMap(set) { return path.join(REFERENTIE_BASIS, set.id); }
function verschilMap(set) { return path.join(VERSCHIL_BASIS, set.id); }
const CDN_CACHE = path.join(HIER, "cdn-cache");

const vulling = require(path.join(HIER, "vulling.js"));

/* De acht schermen. Deze lijst is met de hand gelijkgehouden aan twee
   plekken in online/index.html, en het script controleert dat ook:
     • de switch in renderPagina()   (de router)
     • zijGroepen                    (het zijmenu op laptop en tablet)
   Staat er in de app een scherm bij of af, dan valt het script om met
   een duidelijke melding in plaats van stilletjes zeven schermen te
   meten. Zie controleerSchermen(). */
const SCHERMEN = [
  {id: "dashboard",    label: "Dashboard"},
  {id: "wedstrijden",  label: "Wedstrijden"},
  {id: "trainingen",   label: "Trainingen"},
  {id: "selectie",     label: "Selectie"},
  {id: "agenda",       label: "Agenda"},
  {id: "statistieken", label: "Statistieken"},
  {id: "live",         label: "Live"},
  {id: "clubhuis",     label: "Clubhuis"}
];

/* De vijf bibliotheken plus de lettertypen. Alles wat hier niet in
   staat gaat níét het netwerk op. */
const CDN_HOSTS = [
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

/* ── Wat er achter een tabblad, een knop of een melding zit ──
   De belangrijkste bekende beperking van dit gereedschap staat hier
   bovenaan: alles achter een venster, een tab of een knop staat bij
   geen enkele schermopname op het scherm. Voor een paar plekken is
   dat wél geregeld, en niet zomaar een paar: het zijn precies de
   plekken waar het pakket iets afschermt.

   Een diepteopname is een lijstje klikken vanaf een scherm, met aan
   het eind een "bewijs": een element dat er móét staan. Zonder dat
   bewijs zou een opname van het verkeerde scherm net zo goed groen
   staan, en dat is erger dan geen opname.

   Waarom dit niet broos is, hoewel het op tekst klikt:
     • De spelernaam komt uit vulling.js. Dat is ons eigen verzinsel,
       geen gegeven uit de app — die naam verandert alleen als wij hem
       veranderen, en dan moet de opname toch opnieuw.
     • De tabtekst komt wél uit de app. Verandert die, dan valt het
       script om met een melding die precies zegt wat er mis is, in
       plaats van stilletjes een leeg scherm vast te leggen.
     • De diepteopnames gaan ná de schermen, zodat een klik hier nooit
       een scherm kan beïnvloeden.

   Wil je er een bij (de tabs binnen Statistieken, de vier onderdelen
   van het Clubhuis, de formulieren), dan is dat een regel in een van
   deze lijsten plus één keer --opnemen. */

/* Met Club is er niets op slot. Wat hier staat is er dus niet om een
   slotje vast te leggen, maar om drie plekken te dekken die op geen
   enkel scherm te zien zijn.

   De eerste is het tabblad Ontwikkeling, en die staat er om te bewijzen
   dat er voor een betalende club níéts veranderd is. Het besluit noemt
   Ontwikkeling "een tabblad in Selectie"; in de code zit het één laag
   dieper: Selectie → een speler aanklikken → het tabblad. Twee klikken
   dus, en die staan hier uitgeschreven in plaats van verstopt in het
   script.

   De twee erna gaan over het instellingenvenster, en die zijn er sinds
   16 september 2026. Waarom juist die twee, met de meting erbij, staat
   hieronder bij de opnames zelf. */
const DIEPTES_CLUB = [
  {
    id: "selectie-ontwikkeling",
    label: "Selectie › speler › Ontwikkeling",
    begin: "selectie",
    stappen: [
      {wat: 'de speler "Joep Bramsloot" in de spelerslijst',
       kies: 'table.sp-tabel tr:has-text("Joep Bramsloot")'},
      {wat: 'het tabblad "Ontwikkeling" in het spelerprofiel',
       kies: '.tabs .tab-knop:has-text("Ontwikkeling")'}
    ],
    bewijs: '.stat-label:has-text("Gemiddelde voortgang")'
  },
  /* ── Individu-statistieken: trainPct vóór de opkomst-samenvoeging ──
     Dit scherm stond nergens in dit vangnet: de tabs binnen Statistieken
     vielen tot nu toe onder de belangrijkste bekende beperking hierboven
     ("alles achter een tab staat nergens open"). Dat werd op 17 september
     2026 een probleem in plaats van een blinde vlek: er ligt een ontwerp
     (nog niet uitgevoerd) om de vijf uiteenlopende manieren waarop de app
     opkomst berekent tot één samen te voegen — zie de uitleg bovenaan
     src/domein/opkomst.js. trainPct in IndividuStatistieken (src/app.jsx)
     is één van de vijf, en niet de kleinste: hij telt élke training mee
     in de noemer (trainingen.length), óók een training zonder ingevulde
     presentielijst. In vulling.js heeft tr4 ("Standaardsituaties") zo'n
     lege presentielijst, en die drukt daardoor vandaag het percentage
     van praktisch elke speler — inclusief Joep hieronder.

     Deze opname legt dat vast vóórdat de samenvoeging gebeurt: de
     "vóór"-staat. Verandert trainPct straks om (zoals opkomstVan al
     doet) zo'n lege training uit te sluiten, dan hoort dít scherm rood
     te worden — en nergens anders in dit vangnet zou dat zichtbaar zijn
     geweest.

     Geen klik nodig om een speler te kiezen: IndividuStatistieken opent
     altijd met spelers[0] (useState(spelers.length>0 ? spelers[0].id :
     null)), en dat is met deze vulling Joep Bramsloot — dezelfde speler
     als bij "selectie-ontwikkeling" hierboven, nu op een ander scherm.
     Een andere speler kiezen kan hier niet: dat gaat via een <select>,
     en de stappen in dit bestand kunnen alleen klikken (zie de lus
     verderop die stap.kies aanklikt), niet selectOption() aanroepen op
     een native dropdown.

     Het cijfer zelf, nagerekend op de huidige (ongewijzigde) app: Joep
     staat in vulling.js op positie 0, en dat is op zijn positie in elk
     van de drie ingevulde trainingen "a" (aanwezig) — tr1, tr2 én tr3.
     trainAanw wordt dus 3, maar trainingen.length telt ook de lege tr4
     mee: trainPct = round(3/4*100) = 75%. Zodra tr4 straks buiten de
     noemer valt, wordt dat 100% — een duidelijk, van-nul-verschillend
     verschil op precies dit scherm. */
  {
    id: "statistieken-individu",
    label: "Statistieken › Individu",
    begin: "statistieken",
    stappen: [
      {wat: 'het tabblad "Individu" binnen Statistieken',
       kies: '.tabs .tab-knop:has-text("Individu")'}
    ],
    /* De naam bewijst zowel het juiste scherm als de juiste (standaard)
       speler; de tegels met trainPct zelf ("Aanwezig", "Trainingsopk.")
       horen door de DOM-vergelijking beoordeeld te worden, niet door
       dit bewijs. */
    bewijs: '.profiel-naam:has-text("Joep Bramsloot")'
  },
  /* ── Het instellingenvenster ──
     Dit venster stond sinds het begin bovenaan de bekende beperkingen
     van dit gereedschap: het was hét voorbeeld van "alles achter een
     venster staat nergens op". Op 16 september 2026 is dat gemeten in
     plaats van vermoed, op een kopie van de app, met drie opzettelijke
     fouten in InstellingenSheet:

       • de titel "Instellingen" → "Instelingen"              groen
       • de overtyprem van het opheffen weg (één klik genoeg)  groen
       • de hele opheffen-sectie onzichtbaar ({false && …})    groen

     Alle drie onopgemerkt, en geen enkele test in tests/ vangt ze:
     opheffen.test.js knipt alleen hefClubOp() uit het bestand, de
     dataregel dus, niet de deur ernaartoe. De knop die als enige in de
     app iets weggooit dat niet terug te halen is, kon daarmee spoorloos
     verdwijnen zonder dat er ergens iets rood werd.

     Twee opnames en niet één, want de rem zit niet in het venster maar
     in het bevestigingsscherm daarachter. Alleen het venster vastleggen
     zou de tweede fout hierboven nog steeds hebben gemist.

     Er hoefde niets aan vulling.js bij: serverAan() (vaste URL in het
     bestand), ingelogd() (tt_sessie_v1), clubIdNu() (tt_club_v1) en
     magRol("club") (rolNu() valt zonder tt_rol_v1 terug op "eigenaar")
     zijn met deze vulling alle vier waar, dus de sectie staat er.

     LET OP bij het toevoegen van nog een diepteopname aan deze lijst:
     "instellingen-opheffen" hoort de laatste te blijven. sluitVensters()
     ruimt vóór elke volgende opname een openstaand venster op met het
     kruisje rechtsboven, en dat kruisje zit onder de bevestig-overlay —
     die vangt de klik af. Zolang deze opname de laatste is, komt er geen
     volgende die erover hoeft. */
  {
    id: "instellingen",
    label: "Instellingen",
    begin: "dashboard",
    stappen: [
      /* Het tandwiel onderaan het zijmenu, en niet dat in de kopbalk.
         Dat laatste is de eerste poging geweest en die liep vast: op
         1280 breed is de kopbalk verborgen (hij is er voor smalle
         schermen), dus die knop stáát wel in de DOM maar is niet aan te
         klikken. Zie ook punt 3 bij "wat dit niet dekt" hierboven.

         Bewust zonder :has-text("Instellingen"): er is maar één
         .zij-item in de voet — het lampje ernaast is een .sync-lampje —
         en door de tekst hier níét vast te pinnen wordt een hernoemd
         menu-item een leesbaar DOM-verschil in plaats van een
         omgevallen script. */
      {wat: 'het tandwiel onderaan het zijmenu',
       kies: '.zijbalk-voet .zij-item'}
    ],
    /* Niet de titel van het venster, met opzet. De titel hoort door de
       DOM-vergelijking beoordeeld te worden (die meldt een tikfout als
       een verschil) en niet door dit bewijs (dat zou omvallen met een
       melding over het gereedschap in plaats van over de app).
       .inst-groep bestaat alleen in InstellingenSheet en bewijst dus
       dat dit venster openstaat en geen ander. */
    bewijs: '.formatie-overlay .inst-groep'
  },
  {
    id: "instellingen-opheffen",
    label: "Instellingen › Vereniging opheffen › bevestigen",
    begin: "dashboard",
    stappen: [
      {wat: 'het tandwiel onderaan het zijmenu',
       kies: '.zijbalk-voet .zij-item'},
      /* De knop, niet de kaarttitel erboven: beide dragen de tekst
         "Vereniging opheffen". .knop.gevaar staat in dit venster maar
         op één plek buiten de overlays, en dat is deze. */
      {wat: 'de knop "Vereniging opheffen" onderaan Instellingen',
       kies: '.formatie-sheet .knop.gevaar:has-text("Vereniging opheffen")'}
    ],
    /* Alleen dát het bevestigingsscherm openstaat. Wat erin staat — het
       overtypveld, de uitgeschakelde knop, de opsomming van wat er
       weggaat — is werk voor de DOM-vergelijking. Haalt iemand het
       overtypveld weg, dan hoort dat een leesbaar verschil te geven en
       geen omgevallen script. */
    bewijs: '.bevestig-overlay .bevestig-kaart'
  }
];

/* Met Free is bijna alles wat Fenna heeft gebouwd alleen te zien ná
   een klik. Wat er zónder klik al te zien is — de slotjes in het
   zijmenu en de onderbalk, de vergrendelde Trainingen-kaart op het
   dashboard, de tegels met een badge — staat gewoon in de DOM van de
   vier schermen die Free wél mag zien, want zijbalk en onderbalk
   worden bij elk scherm meegeschreven. Hieronder staat alleen wat
   dáár niet in komt.

   Twee van deze vier opnames leggen een melding vast, en een melding
   gaat na 7 seconden vanzelf weg (zie toon() in online/index.html:
   duur 7000 zodra er een actieknop bij zit). Eén opname kost op deze
   Mac ruim een seconde, dus dat past ruim — maar het is de reden dat
   er tussen de klik en de opname niets onnodigs gebeurt, en de reden
   dat er vóór elke diepteopname gewacht wordt tot er géén melding
   meer op het scherm staat. Zie wachtTotMeldingenWeg(). Staat de
   melding er bij de opname niet meer, dan valt het script om op zijn
   bewijs in plaats van stilletjes een scherm zonder melding vast te
   leggen. */
const DIEPTES_FREE = [
  {
    id: "slot-melding",
    label: "Zijmenu › Trainingen op slot › de melding",
    begin: "dashboard",
    stappen: [
      {wat: 'de vergrendelde knop "Trainingen" in het zijmenu',
       kies: '.zijbalk-nav .zij-item:has-text("Trainingen")'}
    ],
    /* Niet de hele zin, alleen dat het een slotmelding is: de zin
       zelf hoort door de DOM-vergelijking beoordeeld te worden (die
       meldt een verschil) en niet door dit bewijs (dat valt om). */
    bewijs: '.toast .toast-actie:has-text("Bekijk pakketten")'
  },
  {
    id: "slot-prijskaart",
    label: "Zijmenu › Trainingen op slot › melding › Bekijk pakketten",
    begin: "dashboard",
    stappen: [
      {wat: 'de vergrendelde knop "Trainingen" in het zijmenu',
       kies: '.zijbalk-nav .zij-item:has-text("Trainingen")'},
      {wat: 'de knop "Bekijk pakketten" in de melding',
       kies: '.toast .toast-actie:has-text("Bekijk pakketten")'}
    ],
    /* Niet alleen dát de prijskaart openstaat, maar ook dat het
       pakket dat het antwoord geeft goud omrand is. Dat is de hele
       reden dat de prijskaart vanuit een slotje anders opengaat dan
       vanuit Instellingen. */
    bewijs: '.pakket-kaart.nadruk'
  },
  {
    id: "slot-ontwikkeling",
    label: "Selectie › speler › tabblad Ontwikkeling op slot",
    begin: "selectie",
    stappen: [
      {wat: 'de speler "Joep Bramsloot" in de spelerslijst',
       kies: 'table.sp-tabel tr:has-text("Joep Bramsloot")'}
    ],
    bewijs: '.tabs .tab-knop:has-text("Ontwikkeling") .slotje'
  },
  {
    id: "slot-ontwikkeling-melding",
    label: "Selectie › speler › tik op het vergrendelde tabblad",
    begin: "selectie",
    stappen: [
      {wat: 'de speler "Joep Bramsloot" in de spelerslijst',
       kies: 'table.sp-tabel tr:has-text("Joep Bramsloot")'},
      {wat: 'het vergrendelde tabblad "Ontwikkeling"',
       kies: '.tabs .tab-knop:has-text("Ontwikkeling")'}
    ],
    bewijs: '.toast .toast-actie:has-text("Bekijk pakketten")'
  }
];

/* ── De twee opnamesets ──────────────────────────────────────
   Dezelfde app, dezelfde gegevens, dezelfde klok — alleen een ander
   pakket in localStorage. Dat ene verschil bepaalt of de helft van
   het scherm bestaat.

   Waarom dit er twee moeten zijn, en niet één: alles wat Fenna op
   11 september heeft gebouwd staat achter !magPagina(...) of
   !magModule(...). In een opname met Club is daar niets van te zien.
   De set "club" bewijst dus dat de betaalde beleving onveranderd is;
   alleen de set "free" bewijst iets over de slotjes zelf.

   Waarom "free" vier schermen mist en dat geen gat is: met Free zijn
   Trainingen, Statistieken, Live en Clubhuis geen schermen meer maar
   knoppen met een slotje. Er valt daar niets vast te leggen, want de
   router geeft null terug. Wat er in plaats daarvan gebeurt — de
   melding en de prijskaart — staat in DIEPTES_FREE hierboven.

   Deze verdeling wordt niet geloofd maar nagerekend: controleerSlot()
   leest PAKKETTEN en PAGINA_MODULE uit online/index.html zelf en valt
   om zodra de app er anders over denkt dan deze lijst. Zet iemand
   Trainingen in Free, of haalt iemand Statistieken uit Coach, dan is
   dat hier meteen een harde fout in plaats van een opname die stil
   iets anders is gaan meten. */
const SETS = [
  {id: "club", pakket: "club",
   label: "Club — alles open, geen enkel slotje",
   schermen: ["dashboard", "wedstrijden", "trainingen", "selectie",
              "agenda", "statistieken", "live", "clubhuis"],
   dieptes: DIEPTES_CLUB},
  {id: "free", pakket: "free",
   label: "Free — vier schermen op slot",
   schermen: ["dashboard", "wedstrijden", "selectie", "agenda"],
   dieptes: DIEPTES_FREE}
];

function setMetId(id) {
  const gevonden = SETS.filter(function (s) { return s.id === id; })[0];
  if (!gevonden) throw new Error("Onbekende set: " + id + ". Bekend zijn: " +
    SETS.map(function (s) { return s.id; }).join(", "));
  return gevonden;
}
/* De schermen van een set, in de volgorde van SCHERMEN hierboven. */
function schermenVan(set) {
  return SCHERMEN.filter(function (s) { return set.schermen.indexOf(s.id) >= 0; });
}

const BEELD = {breedte: 1280, hoogte: 900};

/* ── Hoe streng mag een schermafdruk zijn? ───────────────────
   Twee opnames van exact dezelfde app zijn niet byte-voor-byte
   gelijk. Gemeten op 11 september 2026, twee opnames achter elkaar op
   dezelfde Mac: van de 1.152.000 beeldpunten verschilde er precies
   één, en die één verschilde met 1 op 255. Dat is antialiasing, geen
   regressie — zou het script daarop falen, dan gelooft niemand het
   meer.

   Daarom wordt er geteld in plaats van vergeleken:
     • een beeldpunt telt pas mee als een van de kleurwaarden meer dan
       KLEUR_MARGE verschilt (8 van de 255 — kleiner dan dat ziet
       niemand);
     • en pas boven PIXEL_DREMPEL beeldpunten is het een fout.
   Ter ijking: het verzetten van één accentkleur in de app gaf bij
   dezelfde meting honderdduizenden afwijkende beeldpunten. De ruimte
   tussen 1 en honderdduizend is groot genoeg om niet over de exacte
   grens te hoeven twisten. */
const KLEUR_MARGE = 8;
const PIXEL_DREMPEL = 500;

/* ── 1. Een eigen webserver ──────────────────────────────────
   De app moet van http:// komen en niet van file://. Twee redenen:
   localStorage werkt op file:// niet betrouwbaar in Chrome, en de app
   gedraagt zich daar anders (de service worker wordt overgeslagen).
   127.0.0.1 met een vrije poort, alleen de map online/. */
function startServer() {
  const server = http.createServer(function (verzoek, antwoord) {
    let naam = decodeURIComponent(verzoek.url.split("?")[0]);
    if (naam === "/") naam = "/index.html";
    const bestand = path.join(APP_MAP, path.normalize(naam).replace(/^(\.\.[/\\])+/, ""));
    if (!bestand.startsWith(APP_MAP)) { antwoord.writeHead(403); antwoord.end(); return; }
    fs.readFile(bestand, function (fout, inhoud) {
      if (fout) { antwoord.writeHead(404); antwoord.end("niet gevonden"); return; }
      const soort = {".html": "text/html; charset=utf-8",
                     ".js": "text/javascript; charset=utf-8",
                     ".json": "application/json",
                     ".png": "image/png", ".svg": "image/svg+xml"}[path.extname(bestand)]
                    || "application/octet-stream";
      /* Niets cachen: anders meet je bij de tweede opname de vorige app. */
      antwoord.writeHead(200, {"Content-Type": soort, "Cache-Control": "no-store"});
      antwoord.end(inhoud);
    });
  });
  return new Promise(function (klaar) {
    server.listen(0, "127.0.0.1", function () {
      klaar({server: server, adres: "http://127.0.0.1:" + server.address().port});
    });
  });
}

/* ── 2. Het netwerk ──────────────────────────────────────────*/
function cachePad(url) {
  const sleutel = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
  return path.join(CDN_CACHE, sleutel);
}
async function uitCacheOfHaal(url) {
  const pad = cachePad(url);
  if (fs.existsSync(pad + ".kop") && fs.existsSync(pad + ".body")) {
    return {kop: JSON.parse(fs.readFileSync(pad + ".kop", "utf8")),
            body: fs.readFileSync(pad + ".body")};
  }
  const r = await fetch(url);
  const body = Buffer.from(await r.arrayBuffer());
  const kop = {status: r.status, type: r.headers.get("content-type") || "application/octet-stream"};
  fs.mkdirSync(CDN_CACHE, {recursive: true});
  fs.writeFileSync(pad + ".kop", JSON.stringify(kop));
  fs.writeFileSync(pad + ".body", body);
  fs.writeFileSync(path.join(CDN_CACHE, "INHOUD.txt"),
    (fs.existsSync(path.join(CDN_CACHE, "INHOUD.txt"))
      ? fs.readFileSync(path.join(CDN_CACHE, "INHOUD.txt"), "utf8") : "") +
    path.basename(pad) + "  " + url + "\n");
  return {kop: kop, body: body};
}

async function zetNetwerkKlem(context, buitenAdressen, eigenAdres) {
  await context.route("**/*", async function (route) {
    const url = route.request().url();
    if (url.startsWith(eigenAdres) || url.startsWith("data:") || url.startsWith("blob:")) {
      return route.continue();
    }
    let host = "";
    try { host = new URL(url).host; } catch (e) {}

    if (CDN_HOSTS.indexOf(host) >= 0) {
      buitenAdressen.add(host + "  (toegestaan, uit cdn-cache)");
      try {
        const g = await uitCacheOfHaal(url);
        return route.fulfill({status: g.kop.status, contentType: g.kop.type, body: g.body});
      } catch (e) {
        return route.abort("failed");
      }
    }
    /* Alles wat hier komt is een buitenadres dat we niet kennen. Voor
       Supabase is dat verwacht en gewenst; voor iets anders is het een
       bevinding, en daarom wordt het genoteerd. */
    buitenAdressen.add(host + (/supabase\.co$/.test(host)
      ? "  (geblokkeerd, verwacht: de server)"
      : "  (geblokkeerd, ONVERWACHT)"));
    return route.abort("failed");
  });
}

/* Beeldpunten tellen die echt verschillen. Gebeurt in de browser die
   toch al openstaat: die heeft een PNG-decoder aan boord, en zo hoeft
   er geen extra npm-pakket bij. */
async function telBeeldVerschil(page, oud, nieuw) {
  return page.evaluate(async function (p) {
    async function lees(b64) {
      const i = new Image();
      i.src = "data:image/png;base64," + b64;
      await i.decode();
      const c = document.createElement("canvas");
      c.width = i.width; c.height = i.height;
      const x = c.getContext("2d");
      x.drawImage(i, 0, 0);
      return {d: x.getImageData(0, 0, i.width, i.height).data, w: i.width, h: i.height};
    }
    const a = await lees(p.oud), b = await lees(p.nieuw);
    if (a.w !== b.w || a.h !== b.h) return {maatAnders: true, anders: a.w * a.h, totaal: a.w * a.h};
    let anders = 0;
    for (let i = 0; i < a.d.length; i += 4) {
      let d = 0;
      for (let k = 0; k < 4; k++) { const v = Math.abs(a.d[i + k] - b.d[i + k]); if (v > d) d = v; }
      if (d > p.marge) anders++;
    }
    return {maatAnders: false, anders: anders, totaal: a.w * a.h};
  }, {oud: oud.toString("base64"), nieuw: nieuw.toString("base64"), marge: KLEUR_MARGE});
}

/* ── 3. De begintoestand ─────────────────────────────────────*/
function beginScript() {
  return function (gegevens) {
    try {
      localStorage.clear();
      Object.keys(gegevens.opslag).forEach(function (k) {
        localStorage.setItem(k, gegevens.opslag[k]);
      });
    } catch (e) {}
    /* Math.random voorspelbaar maken. De app maakt id's met
       Math.random().toString(36) — in de vaste vulling bestaan alle
       id's al, maar een scherm dat er tóch een aanmaakt (of een
       animatie die op toeval leunt) zou de vergelijking anders elke
       keer rood maken. Een simpele lineaire generator is genoeg; dit
       is geen beveiliging, alleen herhaalbaarheid. */
    var zaad = 20261015;
    Math.random = function () {
      zaad = (zaad * 1103515245 + 12345) % 2147483648;
      return zaad / 2147483648;
    };
  };
}

/* ── 4. De DOM uitlezen ──────────────────────────────────────
   Draait ín de browser. Geeft een ingesprongen tekstweergave terug in
   plaats van ruwe HTML: één regel per element, attributen op alfabet.
   Dat maakt een diff leesbaar — bij ruwe outerHTML is de hele pagina
   één regel en zegt het verschil je niets.

   SCHOONMAAK — wat er met opzet NIET in de opname komt, en waarom:

   a) data:-URI's (logo's, clubwapen) worden vervangen door
      "data:<soort>#<lengte>-<vingerafdruk>". Een ingebouwd logo is
      10.000+ tekens base64; dat maakt een diff onleesbaar. De lengte
      en de vingerafdruk veranderen wél zodra het plaatje verandert,
      dus er wordt niets weggemoffeld.
   b) Het eigen adres (http://127.0.0.1:<poort>/) wordt «lokaal». De
      poort is elke keer een andere.
   c) Blob-URL's worden «blob». Die krijgen bij elke run een nieuw
      willekeurig nummer van de browser.
   d) Witruimte in tekst wordt samengetrokken: React zet afhankelijk
      van de JSX-opmaak soms een extra spatie of regeleinde neer, en
      dat zegt niets over wat de gebruiker ziet.
   e) Commentaarknopen worden overgeslagen (React zet lege markers).

   Er wordt met opzet NIETS gefilterd op "x minuten geleden" en andere
   tijdsaanduidingen. Dat hoeft niet: de klok staat vast, dus die tekst
   is bij elke opname dezelfde. Zou er ooit een teller bijkomen die
   écht per seconde doorloopt, dan komt het scherm niet tot rust en
   valt wachtTotRustig() om met een duidelijke melding — en dat is beter
   dan een filter dat stilletjes ook echte veranderingen wegpoetst.

   Wat er NIET wordt gefilterd, en waarom niet:
   • class-namen en inline style blijven staan, ook als ze op
     berekende breedtes staan (voortgangsbalken). Die zijn bij een
     vaste vulling en een vast venster deterministisch, en juist daar
     zie je een rekenfout aan.
   • <canvas> wordt als element vastgelegd (tag, breedte, hoogte), maar
     de tekening erin staat niet in de DOM. Grafieken, het tekenbord en
     het 3D-sportpark worden dus alleen op afmeting gecontroleerd. Dat
     is een erkend gat; de schermafdruk is daar het enige bewijs. */
function leesDom() {
  const NEGEER_TAG = {SCRIPT: 1, NOSCRIPT: 1};
  const uit = [];

  function vingerafdruk(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function schoonWaarde(w) {
    w = String(w);
    if (w.indexOf("data:") === 0) {
      const soort = (w.slice(5).split(";")[0].split(",")[0]) || "?";
      return "data:" + soort + "#" + w.length + "-" + vingerafdruk(w);
    }
    if (w.indexOf("blob:") === 0) return "«blob»";
    w = w.split(location.origin).join("«lokaal»");
    return w.replace(/\s+/g, " ").trim();
  }
  function schoonTekst(t) {
    return t.replace(/\s+/g, " ").trim();
  }
  function loop(knoop, diepte) {
    if (knoop.nodeType === 3) {
      const t = schoonTekst(knoop.nodeValue || "");
      if (t) uit.push("  ".repeat(diepte) + '"' + t + '"');
      return;
    }
    if (knoop.nodeType !== 1) return;                 /* (e) */
    const tag = knoop.tagName;
    if (NEGEER_TAG[tag]) return;
    const namen = [];
    for (let i = 0; i < knoop.attributes.length; i++) namen.push(knoop.attributes[i].name);
    namen.sort();
    let regel = "<" + tag.toLowerCase();
    namen.forEach(function (n) {
      regel += " " + n + '="' + schoonWaarde(knoop.getAttribute(n)) + '"';
    });
    regel += ">";
    uit.push("  ".repeat(diepte) + regel);
    const kinderen = knoop.childNodes;
    for (let i = 0; i < kinderen.length; i++) loop(kinderen[i], diepte + 1);
  }

  const html = document.documentElement;
  const kop = ["<html lang=\"" + (html.getAttribute("lang") || "") +
               "\" data-thema=\"" + (html.getAttribute("data-thema") || "") + "\">"];
  const wortel = document.getElementById("root");
  if (!wortel) return kop.concat(["(geen #root gevonden)"]).join("\n");
  for (let i = 0; i < wortel.childNodes.length; i++) loop(wortel.childNodes[i], 1);
  return kop.concat(uit).join("\n") + "\n";
}

/* ── 5. Wachten op een écht signaal ──────────────────────────*/
async function wachtTotRustig(page, watDoen) {
  /* a) De app-schil staat er. Dit is het bewijs dat Babel klaar is met
        vertalen én dat de poort (server → aanmelden → club → team)
        helemaal is doorlopen. */
  await page.waitForSelector(".app-schil", {timeout: 120000});

  /* b) Het synclampje is uitgeraasd. De app probeert 2,5 seconde na
        het starten te synchroniseren; dat mislukt hier altijd, want
        het netwerk naar de server is dicht. Zonder dit wachten legt
        het ene scherm "Alles opgeslagen" vast en het volgende "Geen
        verbinding", puur afhankelijk van hoe snel de machine is.
        Daarna probeert de app het elke 30 seconden opnieuw — vandaar
        dat hier vóór élke opname op gewacht wordt en niet één keer. */
  await page.waitForSelector(".sync-lampje.mislukt", {timeout: 120000});

  /* c) Lettertypen. Font Awesome bepaalt de breedte van iconen en
        daarmee de plaatsing van de rest. */
  await page.evaluate(function () { return document.fonts ? document.fonts.ready : null; });

  /* d) En dan het algemene vangnet: de DOM mag twee metingen achter
        elkaar niet meer veranderen. Dat dekt alles af waar hierboven
        geen naam voor is — grafieken die na het monteren hun maat
        bijstellen, een animatie die uitloopt, een lijst die in twee
        stappen binnenkomt. */
  let vorige = null, gelijk = 0;
  const tot = Date.now() + 30000;
  while (Date.now() < tot) {
    const nu = await page.evaluate(leesDom);
    if (nu === vorige) { gelijk++; if (gelijk >= 2) return nu; }
    else { gelijk = 0; vorige = nu; }
    await page.waitForTimeout(350);
  }
  throw new Error("Het scherm " + watDoen + " kwam binnen 30 seconden niet tot rust. " +
                  "Er beweegt iets wat elke opname anders maakt; zoek dat eerst uit.");
}

/* ── 6. Controle: kent het script nog alle schermen? ─────────
   Het gouden origineel is waardeloos als er stilletjes een scherm
   bijkomt dat niemand meet. Daarom wordt de lijst SCHERMEN hierboven
   uit de app zelf gecontroleerd — uit de router én uit het zijmenu —
   en niet uit een kopie.

   Let op het onderscheid met de rest van dit script: de ópnames draaien
   op het gebouwde online/index.html, want dat is wat de bezoeker krijgt.
   Déze controle leest src/app.jsx, want het is een vraag over wat er
   geschreven staat. Dat is sinds de bouwstap (P1) geen haarkloverij
   meer maar noodzaak: esbuild schrijft {id:"dashboard"} als
   { id: "dashboard" }, en dan vindt de regex hieronder niets — waarna
   dit script meldt dat het zijmenu leeg is terwijl er niets aan de hand
   is. Een controle die afgaat op opmaak hoort naar de bron te kijken. */
function controleerSchermen() {
  const bron = fs.readFileSync(path.join(APP_MAP, "..", "src", "app.jsx"), "utf8");

  const router = bron.match(/function renderPagina\(\)\s*\{[\s\S]*?\n  \}/);
  if (!router) throw new Error("renderPagina() niet gevonden in src/app.jsx. " +
    "Is de router hernoemd of verplaatst? Pas dit script aan.");
  const uitRouter = [];
  const re = /case\s+"([a-z]+)"\s*:/g;
  let m;
  while ((m = re.exec(router[0]))) uitRouter.push(m[1]);

  const menu = bron.match(/const zijGroepen = \[[\s\S]*?\n\];/);
  if (!menu) throw new Error("zijGroepen niet gevonden in src/app.jsx.");
  const uitMenu = [];
  const re2 = /\{id:"([a-z]+)"/g;
  while ((m = re2.exec(menu[0]))) uitMenu.push(m[1]);

  const bekend = SCHERMEN.map(function (s) { return s.id; }).sort().join(",");
  const gevondenRouter = uitRouter.slice().sort().join(",");
  const gevondenMenu = uitMenu.slice().sort().join(",");
  if (gevondenRouter !== bekend)
    throw new Error("De router kent andere schermen dan dit script:\n" +
      "  router:  " + gevondenRouter + "\n  script:  " + bekend +
      "\nVul SCHERMEN aan in tools/gouden-origineel.js en neem opnieuw op.");
  if (gevondenMenu !== bekend)
    throw new Error("Het zijmenu kent andere schermen dan dit script:\n" +
      "  zijmenu: " + gevondenMenu + "\n  script:  " + bekend);
  return uitMenu;   /* de volgorde in het menu, die doet er ook toe */
}

/* ── 6b. Controle: denkt de app hetzelfde over het slot? ─────
   SETS hierboven zegt welke schermen een pakket mag zien. Dat is een
   bewering, en een bewering in een testgereedschap is precies het
   soort ding dat stilletjes achterloopt. Daarom wordt hij nagerekend
   tegen de app zelf — niet tegen een kopie, niet tegen docs/, en niet
   tegen server/06-pakketten.sql (dat is een andere vraag, en die stelt
   tests/pakket.test.js).

   Loopt het uit de pas, dan is dat een harde fout. Een opnameset die
   stil van vier naar vijf schermen gaat is geen vangnet meer: je
   vergelijkt dan appels met peren en ziet alleen dat er "iets"
   veranderd is.

   Net als bij controleerSchermen() hierboven wordt src/app.jsx gelezen
   en niet het gebouwde bestand: de regex hieronder is afgestemd op hoe
   een mens die lijst opschrijft ({id:"free", naam:...}), en esbuild
   zet daar spaties in ({ id: "free", naam: ... }). Dan leest hij nul
   pakketten en meldt dit script dat de opmaak veranderd is, terwijl er
   niets veranderd is behalve de opmaak van het bouwproduct. */
function leesPakkettenUitApp() {
  const bron = fs.readFileSync(path.join(APP_MAP, "..", "src", "app.jsx"), "utf8");

  const blok = bron.match(/const PAKKETTEN = \[[\s\S]*?\n\];/);
  if (!blok) throw new Error("PAKKETTEN niet gevonden in src/app.jsx. " +
    "Is de pakkettenlijst hernoemd of verplaatst? Pas dit script aan.");
  const pakketten = {};
  const re = /\{id:"([a-z]+)",\s+naam:"([^"]*)",\s+teams:([^,]+),\s+modules:\[([^\]]*)\]\}/g;
  let m;
  while ((m = re.exec(blok[0]))) {
    pakketten[m[1]] = {
      id: m[1], naam: m[2],
      modules: m[4].split(",").map(function (x) { return x.trim().replace(/"/g, ""); })
                   .filter(function (x) { return x; })
    };
  }
  if (!Object.keys(pakketten).length)
    throw new Error("PAKKETTEN staat er wel, maar er is geen enkel pakket uit te lezen.\n" +
      "De opmaak van de lijst is veranderd. Pas leesPakkettenUitApp() aan — en\n" +
      "kijk meteen of SETS nog klopt, want dat is waarom deze controle bestaat.");

  const pmBlok = bron.match(/const PAGINA_MODULE = \{[\s\S]*?\n\};/);
  if (!pmBlok) throw new Error("PAGINA_MODULE niet gevonden in src/app.jsx.");
  const paginaModule = {};
  const re2 = /([a-z]+)\s*:\s*"([a-z]+)"/g;
  while ((m = re2.exec(pmBlok[0]))) paginaModule[m[1]] = m[2];

  return {pakketten: pakketten, paginaModule: paginaModule};
}

function controleerSlot(set) {
  const app = leesPakkettenUitApp();
  const p = app.pakketten[set.pakket];
  if (!p) throw new Error("Het pakket \"" + set.pakket + "\" van set \"" + set.id +
    "\" bestaat niet in PAKKETTEN in online/index.html.\n" +
    "Bekend zijn: " + Object.keys(app.pakketten).join(", ") + ".\n" +
    "Let op: pakketNu() valt bij een onbekend pakket terug op het eerste (free),\n" +
    "dus de opname zou er wel komen — maar van iets anders dan de bedoeling.");

  const open = SCHERMEN.filter(function (sc) {
    const mod = app.paginaModule[sc.id];
    return !mod || p.modules.indexOf(mod) >= 0;
  }).map(function (sc) { return sc.id; });

  const verwacht = schermenVan(set).map(function (sc) { return sc.id; });
  if (open.sort().join(",") !== verwacht.slice().sort().join(","))
    throw new Error("De app denkt anders over pakket \"" + set.pakket + "\" dan set \"" +
      set.id + "\":\n" +
      "  de app laat zien: " + open.join(", ") + "\n" +
      "  de set verwacht:  " + verwacht.join(", ") + "\n" +
      "Werk SETS bij in tools/gouden-origineel.js en neem die set opnieuw op.\n" +
      "Dit is met opzet een harde fout: stilletjes een scherm meer of minder\n" +
      "meten maakt de vergelijking waardeloos.");
  return p;
}

/* ── 7. De opname zelf ───────────────────────────────────────
   Eén set per aanroep: één browser, één begintoestand, één pakket.
   Twee sets in één browser zou sneller zijn, maar dan zou het pakket
   halverwege moeten wisselen en meet je de tweede set in een app die
   al iets meegemaakt heeft. Elke set begint dus schoon. */
async function neemOp(set, vergelijkBeelden) {
  const menuVolgorde = controleerSchermen();
  const pakket = controleerSlot(set);
  const schermen = schermenVan(set);
  const buitenAdressen = new Set();
  const {server, adres} = await startServer();
  const browser = await chromium.launch({channel: "chrome", headless: true});

  const context = await browser.newContext({
    viewport: {width: BEELD.breedte, height: BEELD.hoogte},
    deviceScaleFactor: 1,
    locale: vulling.TAAL,
    timezoneId: vulling.TIJDZONE,
    colorScheme: "light",
    reducedMotion: "reduce",
    /* De service worker (online/sw.js) bewaart de app en de vijf
       bibliotheken. Tussen twee metingen zou hij de vórige versie
       kunnen serveren. Uit dus. */
    serviceWorkers: "block"
  });

  /* De vaste klok. Moet vóór het laden gezet worden, anders heeft de
     app zijn eerste datums al berekend. setFixedTime laat de timers
     gewoon lopen (nodig: React en de app zelf leunen op setTimeout) en
     bevriest alleen Date en Date.now. */
  await context.clock.setFixedTime(new Date(vulling.VASTE_TIJD));

  await zetNetwerkKlem(context, buitenAdressen, adres);
  await context.addInitScript(beginScript(), {opslag: vulling.opslag(set.pakket)});

  const page = await context.newPage();
  const consoleFouten = [];
  page.on("pageerror", function (e) { consoleFouten.push(String(e.message || e)); });

  await page.goto(adres + "/index.html", {waitUntil: "domcontentloaded"});
  await wachtTotRustig(page, "dashboard (opstarten)");

  /* Alleen het zichtbare deel: zie de uitleg bovenaan. Canvassen
     worden afgedekt — het 3D-sportpark en de grafieken tekenen niet
     altijd precies dezelfde pixels, en een schermafdruk die elke keer
     anders is, kijkt niemand meer naar. */
  async function fotografeer() {
    return page.screenshot({
      mask: await page.locator("canvas").all(),
      maskColor: "#ff00ff",
      animations: "disabled"
    });
  }

  const opnames = [];
  for (const scherm of schermen) {
    await naarScherm(page, scherm.id, menuVolgorde);
    const dom = await wachtTotRustig(page, scherm.id);
    opnames.push({id: scherm.id, dom: dom, beeld: await fotografeer()});
    proces(scherm.label + " vastgelegd (" + dom.split("\n").length + " regels DOM)");
  }

  /* En dan wat er achter een tabblad of een tik zit. Bewust ná de
     schermen: een klik hier kan er dan geen een meer beïnvloeden. */
  for (const diepte of set.dieptes) {
    /* Een melding van de vorige diepteopname staat er nog 7 seconden.
       Die zou in de volgende opname meekomen en de hele set laten
       afhangen van hoe snel de machine is. Dus eerst leeg. */
    await sluitVensters(page, diepte.id);
    await wachtTotMeldingenWeg(page, diepte.id);
    let dom = await naarBeginpunt(page, set, diepte, menuVolgorde);
    for (const stap of diepte.stappen) {
      const hoeveel = await page.locator(stap.kies).count();
      if (hoeveel === 0)
        throw new Error("Diepteopname \"" + diepte.id + "\" (set " + set.id + ") liep vast.\n" +
          "  Niet gevonden: " + stap.wat + "\n" +
          "  Gezocht met:   " + stap.kies + "\n" +
          "Er is iets hernoemd of verplaatst in online/index.html. Pas DIEPTES_" +
          set.id.toUpperCase() + "\n" +
          "aan in tools/gouden-origineel.js en neem opnieuw op. Dit is met opzet\n" +
          "een harde fout: een lege opname die groen staat is erger dan geen.");
      await page.locator(stap.kies).first().click();
      dom = await wachtTotRustig(page, diepte.id + " — na het aanklikken van " + stap.wat);
    }
    /* Het bewijs wordt gevraagd ná het tot rust komen en vóór de
       schermafdruk. De DOM van hierboven wordt hergebruikt in plaats
       van opnieuw gemeten: hij stond al twee metingen stil, en bij een
       opname met een melding erin telt elke seconde — die melding gaat
       na 7 seconden vanzelf weg. */
    if (await page.locator(diepte.bewijs).count() === 0)
      throw new Error("Diepteopname \"" + diepte.id + "\" (set " + set.id +
        ") kwam ergens anders uit.\n" +
        "  Alle klikken lukten, maar het bewijs ontbreekt: " + diepte.bewijs + "\n" +
        "Er wordt dus een ander scherm vastgelegd dan de bedoeling was.\n" +
        "Gaat het om een melding: die verdwijnt na 7 seconden vanzelf. Duurt een\n" +
        "opname op deze machine langer dan dat, dan is dít de plek waar je dat merkt.");
    opnames.push({id: diepte.id, dom: dom, beeld: await fotografeer()});
    proces(diepte.label + " vastgelegd (" + dom.split("\n").length + " regels DOM)");
  }

  /* Nog vóór het sluiten van de browser: de schermafdrukken tellen.
     Dat kan alleen hier — buiten de browser is er geen PNG-decoder. */
  const beeldVerschil = [];
  if (vergelijkBeelden) {
    const teller = await context.newPage();
    await teller.goto("about:blank");
    for (const o of opnames) {
      const ref = vergelijkBeelden[o.id];
      if (!ref) continue;
      const r = await telBeeldVerschil(teller, ref, o.beeld);
      if (r.anders > 0) beeldVerschil.push(Object.assign({id: o.id}, r));
    }
  }

  await browser.close();
  server.close();
  return {set: set, pakketNaam: pakket.naam,
          opnames: opnames, buiten: Array.from(buitenAdressen).sort(),
          fouten: consoleFouten, beeldVerschil: beeldVerschil};
}

/* Een venster dat de vorige diepteopname heeft opengelaten — de
   prijskaart bijvoorbeeld — ligt over de hele app heen en vangt elke
   volgende klik af. Eerst dicht dus, met dezelfde knop als een
   gebruiker gebruikt: het kruisje rechtsboven. */
async function sluitVensters(page, watDoen) {
  const tot = Date.now() + 20000;
  while (Date.now() < tot) {
    if (await page.locator(".formatie-overlay").count() === 0) return;
    const kruisje = page.locator(".formatie-overlay .formatie-sheet-header button").first();
    if (await kruisje.count() === 0)
      throw new Error("Er staat een venster open vóór \"" + watDoen + "\" en er zit geen\n" +
        "kruisje in om het mee te sluiten. Dat is op zichzelf een bevinding:\n" +
        "een venster zonder sluitknop is voor een gebruiker een doodlopende weg.");
    await kruisje.click();
    await page.waitForTimeout(250);
  }
  throw new Error("Een venster ging niet dicht vóór \"" + watDoen + "\".");
}

/* Naar het beginpunt van een diepteopname, via een ander scherm.
   Waarom die omweg: klikken op het scherm waar je al staat doet
   niets — setPagina krijgt dezelfde waarde en React bouwt niets
   opnieuw op. Een spelerprofiel dat de vorige diepteopname heeft
   opengelaten blijft dan gewoon staan, en de volgende opname begint
   ergens anders dan je denkt. Via een tussenstop wisselt de sleutel
   van <main> wél en begint het scherm schoon, precies zoals bij een
   verse start. */
async function naarBeginpunt(page, set, diepte, menuVolgorde) {
  const tussen = set.schermen.filter(function (id) { return id !== diepte.begin; })[0];
  if (!tussen)
    throw new Error("Set \"" + set.id + "\" heeft maar één scherm; er is geen tussenstop " +
      "om via te gaan.");
  await naarScherm(page, tussen, menuVolgorde);
  await wachtTotRustig(page, tussen + " (tussenstop voor " + diepte.id + ")");
  await naarScherm(page, diepte.begin, menuVolgorde);
  return wachtTotRustig(page, diepte.begin + " (beginpunt van " + diepte.id + ")");
}

/* Wachten tot er geen melding meer op het scherm staat. Een melding
   met een actieknop blijft 7 seconden hangen (toon() in
   online/index.html). Zou die in de volgende opname meekomen, dan
   hing het van de snelheid van de machine af of een opname groen is,
   en dat is precies het soort test dat niemand meer gelooft. */
async function wachtTotMeldingenWeg(page, watDoen) {
  const tot = Date.now() + 20000;
  while (Date.now() < tot) {
    if (await page.locator(".toast").count() === 0) return;
    await page.waitForTimeout(250);
  }
  throw new Error("Er bleef een melding op het scherm staan vóór \"" + watDoen + "\".\n" +
    "Meldingen horen na hun duur vanzelf te verdwijnen; doet er een dat niet,\n" +
    "dan is dat een echte bevinding en geen opnameprobleem.");
}

/* Navigeren zoals een gebruiker dat doet: op de knop in het zijmenu
   drukken. Dat controleert meteen dat die knop er is en dat de router
   hem kent — een route die alleen via de URL te bereiken is, is voor
   een trainer onbereikbaar. */
async function naarScherm(page, id, menuVolgorde) {
  await page.click('.zijbalk-nav .zij-item:has-text("' + knopTekst(id) + '")')
    .catch(async function () {
      /* Terugval op volgorde in het menu, voor het geval het label
         verandert. Gebeurt dat, dan moet knopTekst() bijgewerkt. */
      const i = menuVolgorde.indexOf(id);
      await page.locator(".zijbalk-nav .zij-item").nth(i).click();
    });
}

/* De tekst op de knop in het zijmenu. Komt uit de vertaling in de app;
   hier staat hij dubbel, en dat is precies de bedoeling: verandert een
   label, dan valt het script terug op de volgorde én merk je het. */
function knopTekst(id) {
  return {dashboard: "Dashboard", wedstrijden: "Wedstrijden", trainingen: "Trainingen",
          selectie: "Selectie", agenda: "Agenda", statistieken: "Statistieken",
          live: "Live", clubhuis: "Clubhuis"}[id] || id;
}

function proces(tekst) { if (!process.env.STIL) console.log("  " + tekst); }

/* ── 8. Opslaan en vergelijken ───────────────────────────────*/
function schrijfReferentie(set, uitslag) {
  const map = refMap(set);
  fs.rmSync(map, {recursive: true, force: true});
  fs.mkdirSync(map, {recursive: true});
  uitslag.opnames.forEach(function (o) {
    fs.writeFileSync(path.join(map, o.id + ".dom.txt"), o.dom);
    fs.writeFileSync(path.join(map, o.id + ".png"), o.beeld);
  });
  fs.writeFileSync(path.join(map, "netwerk.txt"),
    "Welke buitenadressen de app aanraakt tijdens het opstarten en het\n" +
    "doorlopen van deze opnameset (" + set.id + "). Komt hier iets bij, dan is\n" +
    "dat een privacyvraag en geen detail.\n\n" + uitslag.buiten.join("\n") + "\n");
  fs.writeFileSync(path.join(map, "meta.json"), JSON.stringify({
    opgenomenMet: "tools/gouden-origineel.js",
    set: set.id,
    /* Het pakket bepaalt de helft van wat er op het scherm staat. Het
       hoort dus in de meta, want zonder dat getal weet je over een
       half jaar niet meer welke beleving je voor je hebt. */
    pakket: set.pakket,
    pakketNaam: uitslag.pakketNaam,
    vasteTijd: vulling.VASTE_TIJD,
    tijdzone: vulling.TIJDZONE,
    venster: BEELD,
    appBytes: fs.statSync(path.join(APP_MAP, "index.html")).size,
    appRegels: fs.readFileSync(path.join(APP_MAP, "index.html"), "utf8").split("\n").length,
    schermen: schermenVan(set).map(function (s) { return s.id; }),
    /* Welke schermen dit pakket niet mag zien. Staat hier iets in,
       dan is dat geen gat maar een vastgelegd feit: die schermen zijn
       met dit pakket knoppen met een slotje. */
    schermenOpSlot: SCHERMEN.map(function (s) { return s.id; })
      .filter(function (id) { return set.schermen.indexOf(id) < 0; }),
    /* Wat er achter een tabblad, een knop of een melding vandaan is
       gehaald. Staat hier niets, dan heeft niets achter een tab of
       knop een vangnet. */
    dieptes: set.dieptes.map(function (d) { return d.id; }),
    /* Met opzet geen opnamedatum: die zou elke opname een verschil
       geven in git zonder dat er iets veranderd is. */
    paginaFouten: uitslag.fouten
  }, null, 2) + "\n");
}

/* Een leesbaar verschil tussen twee stukken tekst. Geen npm-pakket:
   een eenvoudige regel-voor-regel vergelijking met wat context is
   genoeg om te zien wát er anders is, en scheelt een afhankelijkheid. */
function toonVerschil(oud, nieuw) {
  const a = oud.split("\n"), b = nieuw.split("\n");
  const uit = [];
  let i = 0, j = 0, getoond = 0;
  while ((i < a.length || j < b.length) && getoond < 60) {
    if (a[i] === b[j]) { i++; j++; continue; }
    /* Zoek de eerstvolgende regel die weer gelijkloopt */
    let herstel = null;
    for (let k = 1; k < 40 && !herstel; k++) {
      if (a[i + k] !== undefined && a[i + k] === b[j]) herstel = {da: k, db: 0};
      else if (b[j + k] !== undefined && b[j + k] === a[i]) herstel = {da: 0, db: k};
    }
    const da = herstel ? herstel.da : 1, db = herstel ? herstel.db : 1;
    for (let k = 0; k < da; k++) { uit.push("  - regel " + (i + k + 1) + ": " + a[i + k]); getoond++; }
    for (let k = 0; k < db; k++) { uit.push("  + regel " + (j + k + 1) + ": " + b[j + k]); getoond++; }
    i += da; j += db;
  }
  if (getoond >= 60) uit.push("  … (meer verschillen, ingekort)");
  return uit.join("\n");
}

/* Eén set nakijken. Geeft terug of er iets mis is en wat er precies
   anders was, zodat de aanroeper het per set kan melden. */
async function vergelijkSet(set) {
  const map = refMap(set);
  const eerste = schermenVan(set)[0];
  if (!fs.existsSync(path.join(map, eerste.id + ".dom.txt")))
    throw new Error("Er is nog geen gouden origineel voor set \"" + set.id + "\". Draai eerst:\n" +
                    "  node tools/gouden-origineel.js --opnemen --set=" + set.id);

  /* De schermafdrukken van het origineel meegeven, zodat ze binnen de
     browser geteld kunnen worden vóór hij dichtgaat. */
  const refBeelden = {};
  schermenVan(set).concat(set.dieptes).forEach(function (sc) {
    const p2 = path.join(map, sc.id + ".png");
    if (fs.existsSync(p2)) refBeelden[sc.id] = fs.readFileSync(p2);
  });

  const uitslag = await neemOp(set, refBeelden);
  const vmap = verschilMap(set);
  fs.rmSync(vmap, {recursive: true, force: true});

  let domRood = 0;
  const melding = [];

  function bewaarVerschil(id, beeld) {
    fs.mkdirSync(vmap, {recursive: true});
    fs.writeFileSync(path.join(vmap, id + ".nu.png"), beeld);
    const ref = path.join(map, id + ".png");
    if (fs.existsSync(ref)) fs.copyFileSync(ref, path.join(vmap, id + ".origineel.png"));
  }

  uitslag.opnames.forEach(function (o) {
    const domPad = path.join(map, o.id + ".dom.txt");
    const oud = fs.readFileSync(domPad, "utf8");
    if (oud === o.dom) return;
    domRood++;
    fs.mkdirSync(vmap, {recursive: true});
    fs.writeFileSync(path.join(vmap, o.id + ".nu.dom.txt"), o.dom);
    fs.copyFileSync(domPad, path.join(vmap, o.id + ".origineel.dom.txt"));
    bewaarVerschil(o.id, o.beeld);
    const tekst = toonVerschil(oud, o.dom);
    fs.writeFileSync(path.join(vmap, o.id + ".verschil.txt"), tekst + "\n");
    melding.push("\nSCHERM: " + o.id + "\n" + tekst);
  });

  /* Schermafdrukken. Alles onder de drempel is ruis en wordt alleen
     gemeld; daarboven is het een fout, ook als de DOM gelijk is — een
     kleur, een lettertype of een lijndikte staat nergens in de DOM. */
  const beeldErnstig = [];
  uitslag.beeldVerschil.forEach(function (b) {
    bewaarVerschil(b.id, uitslag.opnames.filter(function (o) { return o.id === b.id; })[0].beeld);
    if (b.anders > PIXEL_DREMPEL || b.maatAnders) beeldErnstig.push(b);
  });

  /* Buitenadressen: een nieuw adres is een bevinding op zich. */
  const netwerkOud = (fs.readFileSync(path.join(map, "netwerk.txt"), "utf8")
    .split("\n\n")[1] || "").trim();
  const netwerkNu = uitslag.buiten.join("\n").trim();
  const netwerkAnders = netwerkOud !== netwerkNu;

  console.log("");
  if (domRood) {
    console.log("  ROOD — DOM: " + domRood + " van de " + uitslag.opnames.length +
                " opnames verschillen.");
    console.log(melding.join("\n"));
  } else {
    console.log("  DOM: alle " + uitslag.opnames.length + " opnames gelijk aan het origineel.");
  }

  if (uitslag.beeldVerschil.length) {
    console.log("\n  Schermafdrukken (drempel: meer dan " + PIXEL_DREMPEL +
                " beeldpunten met een kleurverschil groter dan " + KLEUR_MARGE + "):");
    uitslag.beeldVerschil.forEach(function (b) {
      const pct = (b.anders / b.totaal * 100).toFixed(3);
      console.log("    " + (b.anders > PIXEL_DREMPEL ? "ROOD " : "ruis ") + b.id + ": " +
                  b.anders + " van de " + b.totaal + " beeldpunten (" + pct + "%)");
    });
  } else {
    console.log("  Schermafdrukken: geen enkel beeldpunt buiten de marge.");
  }

  if (netwerkAnders) {
    console.log("\n  ROOD — de app raakt andere buitenadressen aan dan bij de opname.");
    console.log("    was:\n" + netwerkOud.split("\n").map(function (r) { return "      " + r; }).join("\n"));
    console.log("    nu:\n" + netwerkNu.split("\n").map(function (r) { return "      " + r; }).join("\n"));
  }

  if (uitslag.fouten.length) {
    console.log("\n  Fouten in de pagina tijdens de opname (" + uitslag.fouten.length + "):");
    uitslag.fouten.slice(0, 5).forEach(function (f) { console.log("    " + f); });
  }

  const mislukt = domRood > 0 || beeldErnstig.length > 0 || netwerkAnders;
  if (fs.existsSync(vmap)) console.log("\n  Voor en ná naast elkaar:\n    " + vmap);
  console.log(mislukt
    ? "\n  ROOD (" + set.id + "): er is iets veranderd. Zie hierboven."
    : "\n  GROEN (" + set.id + "): " + uitslag.opnames.length +
      " opnames gelijk aan het gouden origineel (" + schermenVan(set).length +
      " schermen + " + set.dieptes.length + " achter een klik).");
  return {set: set, mislukt: mislukt, aantal: uitslag.opnames.length, domRood: domRood};
}

/* Alle gevraagde sets nakijken. Ze worden allemaal gedraaid, ook als
   de eerste al rood is: bij een verbouwing wil je in één keer weten
   wát er in béide belevingen veranderd is, niet één set per keer. */
async function vergelijk(sets) {
  const uitslagen = [];
  for (const set of sets) {
    console.log("\n── SET " + set.id + " — " + set.label + " ──");
    uitslagen.push(await vergelijkSet(set));
  }

  console.log("\n════ SAMEN ════");
  uitslagen.forEach(function (u) {
    console.log("  " + (u.mislukt ? "ROOD " : "GROEN") + "  " + u.set.id +
                "  (" + u.aantal + " opnames, pakket " + u.set.pakket + ")");
  });
  const stuk = uitslagen.filter(function (u) { return u.mislukt; });
  console.log("");
  console.log(stuk.length
    ? "ROOD: " + stuk.length + " van de " + uitslagen.length + " sets is veranderd (" +
      stuk.map(function (u) { return u.set.id; }).join(", ") + "). Zie hierboven."
    : "GROEN: alle " + uitslagen.length + " sets gelijk aan het gouden origineel (" +
      uitslagen.reduce(function (n, u) { return n + u.aantal; }, 0) + " opnames in totaal).");
  process.exit(stuk.length ? 1 : 0);
}

/* ── 9. Start ────────────────────────────────────────────────*/
async function hoofd() {
  const arg = process.argv.slice(2);

  /* --set=free of --set=club. Zonder die vlag worden beide sets
     gedaan, want dat is wat je wilt vóór en ná een verbouwing. Eén
     set kiezen is er voor als je middenin iets zit en niet twee keer
     wilt wachten. */
  const gekozen = arg.filter(function (a) { return a.indexOf("--set=") === 0; })
                     .map(function (a) { return a.slice(6); });
  const sets = gekozen.length ? gekozen.map(setMetId) : SETS;

  if (arg.indexOf("--opnemen") >= 0) {
    for (const set of sets) {
      console.log("\n── SET " + set.id + " — " + set.label + " ──");
      console.log("  Opnemen met pakket \"" + set.pakket + "\" …");
      const uitslag = await neemOp(set);
      schrijfReferentie(set, uitslag);
      console.log("  Opgenomen: " + uitslag.opnames.length + " opnames (" +
                  schermenVan(set).length + " schermen + " + set.dieptes.length +
                  " achter een klik) in\n    " + refMap(set));
      if (uitslag.fouten.length)
        console.log("  Let op: " + uitslag.fouten.length + " fout(en) in de pagina, " +
                    "vastgelegd in meta.json.");
    }
    return;
  }
  if (arg.indexOf("--vergelijk") >= 0) {
    console.log("Gouden origineel vergelijken (" +
                sets.map(function (s) { return s.id; }).join(" + ") + ") …");
    return vergelijk(sets);
  }
  console.log("Gebruik:\n" +
    "  node tools/gouden-origineel.js --opnemen     leg de huidige toestand vast\n" +
    "  node tools/gouden-origineel.js --vergelijk   faal als er iets veranderd is\n" +
    "\n" +
    "  --set=club   alleen de betaalde beleving (alle acht schermen open)\n" +
    "  --set=free   alleen de gratis beleving (vier schermen op slot)\n" +
    "  zonder --set: beide sets\n\n" +
    "Eenmalig vooraf: npm install --prefix tools");
  process.exit(2);
}

hoofd().catch(function (e) {
  console.error("\nMislukt: " + (e && e.message ? e.message : e));
  process.exit(1);
});
