#!/usr/bin/env node
/* ══ HET GOUDEN ORIGINEEL ═════════════════════════════════════
   Legt vast hoe TEAMTAKKIE er nú uitziet, zodat je na een verbouwing
   kunt bewijzen dat er niets veranderd is wat niet mocht veranderen.

       node tools/gouden-origineel.js --opnemen
       node tools/gouden-origineel.js --vergelijk

   --opnemen   opent online/index.html in een echte browser, met een
               vaste localStorage-vulling, en schrijft van elk van de
               acht schermen de DOM en een schermafdruk weg.
   --vergelijk doet precies hetzelfde en legt het naast de opname.
               Is er ook maar één regel DOM anders, dan eindigt het
               script met code 1 en staat in tools/gouden-origineel/
               verschil/ per scherm wat er anders is, met de
               schermafdruk van vóór en ná naast elkaar.

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
      afgebroken én genoteerd in referentie/netwerk.txt. Zet iemand er
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

   1. Alles achter een venster, een tab of een knop. Een tikfout in de
      titel van het instellingenvenster ("Instelingen") gaf groen: dat
      venster staat bij geen van de acht opnames open. Hetzelfde geldt
      voor de tabs Individu/Stand binnen Statistieken, voor de vier
      onderdelen van het Clubhuis, en voor elk formulier.
      → Wie daar iets verandert, heeft hier géén vangnet. Dat is de
        belangrijkste bekende beperking van dit gereedschap.
   2. Het tweede team en andere seizoenen. De opname staat op één team
      in één seizoen; van team wisselen gebeurt niet.
   3. Smalle schermen. Er wordt één venster van 1280×900 vastgelegd. De
      onderbalk met vijf knoppen (navItems) is op die breedte verborgen
      — hij staat wél in de DOM en wordt dus wel gecontroleerd, maar
      hoe de app op een telefoon oogt niet.
   4. Wat er in een <canvas> getekend wordt — de grafieken, het
      tekenbord, het 3D-sportpark. Zie de SCHOONMAAK-uitleg bij
      leesDom() verderop.

   Wat er wél uitkomt en makkelijk onderschat wordt: attributen die je
   niet ziet. Het weghalen van aria-current uit het zijmenu — puur een
   toegankelijkheidsregressie, geen enkel beeldpunt anders — maakte
   alle acht schermen rood.

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
const REFERENTIE = path.join(HIER, "referentie");
const VERSCHIL = path.join(HIER, "verschil");
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
   uit online/index.html zelf gecontroleerd — uit de router én uit het
   zijmenu — en niet uit een kopie. */
function controleerSchermen() {
  const bron = fs.readFileSync(path.join(APP_MAP, "index.html"), "utf8");

  const router = bron.match(/function renderPagina\(\)\s*\{[\s\S]*?\n  \}/);
  if (!router) throw new Error("renderPagina() niet gevonden in online/index.html. " +
    "Is de router hernoemd of verplaatst? Pas dit script aan.");
  const uitRouter = [];
  const re = /case\s+"([a-z]+)"\s*:/g;
  let m;
  while ((m = re.exec(router[0]))) uitRouter.push(m[1]);

  const menu = bron.match(/const zijGroepen = \[[\s\S]*?\n\];/);
  if (!menu) throw new Error("zijGroepen niet gevonden in online/index.html.");
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

/* ── 7. De opname zelf ───────────────────────────────────────*/
async function neemOp(vergelijkBeelden) {
  const menuVolgorde = controleerSchermen();
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
  await context.addInitScript(beginScript(), {opslag: vulling.opslag()});

  const page = await context.newPage();
  const consoleFouten = [];
  page.on("pageerror", function (e) { consoleFouten.push(String(e.message || e)); });

  await page.goto(adres + "/index.html", {waitUntil: "domcontentloaded"});
  await wachtTotRustig(page, "dashboard (opstarten)");

  const opnames = [];
  for (const scherm of SCHERMEN) {
    /* Navigeren zoals een gebruiker dat doet: op de knop in het
       zijmenu drukken. Dat controleert meteen dat die knop er is en
       dat de router hem kent — een route die alleen via de URL te
       bereiken is, is voor een trainer onbereikbaar. */
    await page.click('.zijbalk-nav .zij-item:has-text("' + knopTekst(scherm.id) + '")')
      .catch(async function () {
        /* Terugval op volgorde in het menu, voor het geval het label
           verandert. Gebeurt dat, dan moet knopTekst() bijgewerkt. */
        const i = menuVolgorde.indexOf(scherm.id);
        await page.locator(".zijbalk-nav .zij-item").nth(i).click();
      });
    const dom = await wachtTotRustig(page, scherm.id);
    const beeld = await page.screenshot({
      /* Alleen het zichtbare deel: zie de uitleg bovenaan. Canvassen
         worden afgedekt — het 3D-sportpark en de grafieken tekenen niet
         altijd precies dezelfde pixels, en een schermafdruk die elke
         keer anders is, kijkt niemand meer naar. */
      mask: await page.locator("canvas").all(),
      maskColor: "#ff00ff",
      animations: "disabled"
    });
    opnames.push({id: scherm.id, dom: dom, beeld: beeld});
    proces(scherm.label + " vastgelegd (" + dom.split("\n").length + " regels DOM)");
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
  return {opnames: opnames, buiten: Array.from(buitenAdressen).sort(),
          fouten: consoleFouten, beeldVerschil: beeldVerschil};
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
function schrijfReferentie(uitslag) {
  fs.rmSync(REFERENTIE, {recursive: true, force: true});
  fs.mkdirSync(REFERENTIE, {recursive: true});
  uitslag.opnames.forEach(function (o) {
    fs.writeFileSync(path.join(REFERENTIE, o.id + ".dom.txt"), o.dom);
    fs.writeFileSync(path.join(REFERENTIE, o.id + ".png"), o.beeld);
  });
  fs.writeFileSync(path.join(REFERENTIE, "netwerk.txt"),
    "Welke buitenadressen de app aanraakt tijdens het opstarten en het\n" +
    "doorlopen van alle acht schermen. Komt hier iets bij, dan is dat een\n" +
    "privacyvraag en geen detail.\n\n" + uitslag.buiten.join("\n") + "\n");
  fs.writeFileSync(path.join(REFERENTIE, "meta.json"), JSON.stringify({
    opgenomenMet: "tools/gouden-origineel.js",
    vasteTijd: vulling.VASTE_TIJD,
    tijdzone: vulling.TIJDZONE,
    venster: BEELD,
    appBytes: fs.statSync(path.join(APP_MAP, "index.html")).size,
    appRegels: fs.readFileSync(path.join(APP_MAP, "index.html"), "utf8").split("\n").length,
    schermen: SCHERMEN.map(function (s) { return s.id; }),
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

async function vergelijk() {
  if (!fs.existsSync(path.join(REFERENTIE, "dashboard.dom.txt")))
    throw new Error("Er is nog geen gouden origineel. Draai eerst:\n" +
                    "  node tools/gouden-origineel.js --opnemen");

  /* De schermafdrukken van het origineel meegeven, zodat ze binnen de
     browser geteld kunnen worden vóór hij dichtgaat. */
  const refBeelden = {};
  SCHERMEN.forEach(function (sc) {
    const p2 = path.join(REFERENTIE, sc.id + ".png");
    if (fs.existsSync(p2)) refBeelden[sc.id] = fs.readFileSync(p2);
  });

  const uitslag = await neemOp(refBeelden);
  fs.rmSync(VERSCHIL, {recursive: true, force: true});

  let domRood = 0;
  const melding = [];

  function bewaarVerschil(id, beeld) {
    fs.mkdirSync(VERSCHIL, {recursive: true});
    fs.writeFileSync(path.join(VERSCHIL, id + ".nu.png"), beeld);
    const ref = path.join(REFERENTIE, id + ".png");
    if (fs.existsSync(ref)) fs.copyFileSync(ref, path.join(VERSCHIL, id + ".origineel.png"));
  }

  uitslag.opnames.forEach(function (o) {
    const domPad = path.join(REFERENTIE, o.id + ".dom.txt");
    const oud = fs.readFileSync(domPad, "utf8");
    if (oud === o.dom) return;
    domRood++;
    fs.mkdirSync(VERSCHIL, {recursive: true});
    fs.writeFileSync(path.join(VERSCHIL, o.id + ".nu.dom.txt"), o.dom);
    fs.copyFileSync(domPad, path.join(VERSCHIL, o.id + ".origineel.dom.txt"));
    bewaarVerschil(o.id, o.beeld);
    const tekst = toonVerschil(oud, o.dom);
    fs.writeFileSync(path.join(VERSCHIL, o.id + ".verschil.txt"), tekst + "\n");
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
  const netwerkOud = (fs.readFileSync(path.join(REFERENTIE, "netwerk.txt"), "utf8")
    .split("\n\n")[1] || "").trim();
  const netwerkNu = uitslag.buiten.join("\n").trim();
  const netwerkAnders = netwerkOud !== netwerkNu;

  console.log("");
  if (domRood) {
    console.log("ROOD — DOM: " + domRood + " van de " + uitslag.opnames.length +
                " schermen verschillen.");
    console.log(melding.join("\n"));
  } else {
    console.log("DOM: alle " + uitslag.opnames.length + " schermen gelijk aan het origineel.");
  }

  if (uitslag.beeldVerschil.length) {
    console.log("\nSchermafdrukken (drempel: meer dan " + PIXEL_DREMPEL +
                " beeldpunten met een kleurverschil groter dan " + KLEUR_MARGE + "):");
    uitslag.beeldVerschil.forEach(function (b) {
      const pct = (b.anders / b.totaal * 100).toFixed(3);
      console.log("  " + (b.anders > PIXEL_DREMPEL ? "ROOD " : "ruis ") + b.id + ": " +
                  b.anders + " van de " + b.totaal + " beeldpunten (" + pct + "%)");
    });
  } else {
    console.log("Schermafdrukken: geen enkel beeldpunt buiten de marge.");
  }

  if (netwerkAnders) {
    console.log("\nROOD — de app raakt andere buitenadressen aan dan bij de opname.");
    console.log("  was:\n" + netwerkOud.split("\n").map(function (r) { return "    " + r; }).join("\n"));
    console.log("  nu:\n" + netwerkNu.split("\n").map(function (r) { return "    " + r; }).join("\n"));
  }

  if (uitslag.fouten.length) {
    console.log("\nFouten in de pagina tijdens de opname (" + uitslag.fouten.length + "):");
    uitslag.fouten.slice(0, 5).forEach(function (f) { console.log("  " + f); });
  }

  const mislukt = domRood > 0 || beeldErnstig.length > 0 || netwerkAnders;
  if (fs.existsSync(VERSCHIL))
    console.log("\nVoor en ná naast elkaar:\n  " + VERSCHIL);
  console.log("");
  console.log(mislukt
    ? "ROOD: er is iets veranderd. Zie hierboven."
    : "GROEN: " + uitslag.opnames.length + " schermen gelijk aan het gouden origineel.");
  process.exit(mislukt ? 1 : 0);
}

/* ── 9. Start ────────────────────────────────────────────────*/
async function hoofd() {
  const arg = process.argv.slice(2);
  if (arg.indexOf("--opnemen") >= 0) {
    console.log("Gouden origineel opnemen …");
    const uitslag = await neemOp();
    schrijfReferentie(uitslag);
    console.log("\nOpgenomen: " + uitslag.opnames.length + " schermen in\n  " + REFERENTIE);
    if (uitslag.fouten.length)
      console.log("\nLet op: " + uitslag.fouten.length + " fout(en) in de pagina, " +
                  "vastgelegd in meta.json.");
    return;
  }
  if (arg.indexOf("--vergelijk") >= 0) {
    console.log("Gouden origineel vergelijken …");
    return vergelijk();
  }
  console.log("Gebruik:\n" +
    "  node tools/gouden-origineel.js --opnemen     leg de huidige toestand vast\n" +
    "  node tools/gouden-origineel.js --vergelijk   faal als er iets veranderd is\n\n" +
    "Eenmalig vooraf: npm install --prefix tools");
  process.exit(2);
}

hoofd().catch(function (e) {
  console.error("\nMislukt: " + (e && e.message ? e.message : e));
  process.exit(1);
});
