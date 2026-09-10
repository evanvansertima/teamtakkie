/* Service worker voor TEAMTAKKIE.
   ────────────────────────────────────────────────────────
   Dit bestandje zorgt dat de app blijft werken zonder internet.
   Bij het eerste bezoek bewaart het de app zelf plus de bibliotheken
   die van een externe server komen. Daarna wordt alles uit die
   voorraad geserveerd, en start de app dus ook op een veld zonder
   bereik.

   Let op: dit werkt alleen op een echt webadres (https). Vanaf een
   bestand op je bureaublad doet een browser dit niet, om veiligheids-
   redenen. Daarom moet de app online staan.

   Verhoog VERSIE als je een nieuwe versie van de app uploadt. Dan
   gooit de browser de oude voorraad weg en haalt hij alles opnieuw. */

const VERSIE = "takkie-v34";

/* Wat er sowieso bewaard moet worden. De app zelf staat hier ook in,
   want zonder de app heb je aan de bibliotheken niets. */
const VOORRAAD = [
  "./",
  "./index.html",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap"
];

/* ── Hoe je iets van een andere server ophaalt ────────────────
   Er zijn twee manieren, en het verschil is niet klein.

   Met mode "cors" vraag je netjes toestemming. Krijg je die, dan
   heb je een antwoord dat je mag lezen: je weet of het gelukt is,
   je ziet de inhoud, en je mag hem doorgeven aan de pagina.

   Met mode "no-cors" krijg je een dichtgeplakt pakketje terug: geen
   statuscode (0), geen inhoud, alleen "hier heb je iets". Voor een
   JavaScript-bestand is dat genoeg, want de browser mag zo'n pakketje
   wel uitvoeren. Maar een stylesheet weigert hij eruit te lezen, en
   een lettertype ook. Die worden dan stilletjes overgeslagen.

   Precies dat ging hier mis: alle icoontjes en het lettertype van de
   hele app kwamen uit twee stylesheets die als zo'n pakketje in de
   voorraad stonden. Ze werden keurig geserveerd en meteen genegeerd,
   zonder één foutmelding.

   Daarom vragen we het nu eerst netjes. Zowel cdnjs als Google Fonts
   geven die toestemming. Lukt het niet, dan valt hij terug op het
   dichtgeplakte pakketje: voor de scripts is dat nog altijd beter dan
   niets. ────────────────────────────────────────────────────── */
function extern(adres) {
  return adres.indexOf("http") === 0 && adres.indexOf(self.location.origin) !== 0;
}

/* ── Waar deze service worker over gaat, en waar niet ─────────
   Dit is belangrijker dan het lijkt.

   Een service worker die zich met álle verzoeken bemoeit, bemoeit
   zich ook met de database en met het inloggen. En dat gaat mis:
   hieronder wordt een verzoek naar een andere server opnieuw
   opgebouwd uit alleen het adres, waardoor de sleutel en de
   aanmelding eraf vallen. De server weigert dat, wij vallen terug op
   een dichtgeplakt antwoord, en de pagina krijgt dat niet eens
   doorgegeven — die ziet alleen "Failed to fetch" en heeft geen idee
   waarom.

   Bovendien hoort een antwoord van de database sowieso niet in een
   voorraadkast: dan kijk je morgen naar de spelers van gisteren.

   Dus: alleen onze eigen bestanden en de vaste bibliotheken. Al het
   andere laten we volledig met rust. */
const EIGEN_BRONNEN = [
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];
function vanOns(adres) {
  if (adres.indexOf(self.location.origin) === 0) return true;
  for (var i = 0; i < EIGEN_BRONNEN.length; i++) {
    if (adres.indexOf("https://" + EIGEN_BRONNEN[i] + "/") === 0) return true;
  }
  return false;
}
function haal(verzoek) {
  var adres = (typeof verzoek === "string") ? verzoek : verzoek.url;
  if (!extern(adres)) return fetch(verzoek);
  return fetch(new Request(adres, {mode: "cors", credentials: "omit"}))
    .then(function (antwoord) {
      if (antwoord && antwoord.ok) return antwoord;
      return fetch(new Request(adres, {mode: "no-cors"}));
    })
    .catch(function () { return fetch(new Request(adres, {mode: "no-cors"})); });
}

/* Welke adressen een stylesheet zijn, weet je bij het installeren niet
   uit het verzoek: daar heb je alleen een adres. En op de naam afgaan
   helpt niet, want dat van Google Fonts heet css2 met een vraagteken
   erachter. Dus houden we de lijst hier bij, afgeleid van de voorraad
   zelf, zodat hij niet uit de pas kan lopen. */
const STIJLEN = VOORRAAD.filter(function (adres) {
  return /\.css($|\?)/.test(adres) || adres.indexOf("fonts.googleapis.com") >= 0;
});
function stijlOfLettertype(verzoek) {
  var adres = (typeof verzoek === "string") ? verzoek : verzoek.url;
  var soort = (typeof verzoek === "string") ? "" : (verzoek.destination || "");
  return soort === "style" || soort === "font" ||
         STIJLEN.indexOf(adres) >= 0 ||
         /\.css($|\?)/.test(adres) || /\.(woff2?|ttf|otf|eot)($|\?)/.test(adres);
}
/* Een bewaard antwoord dat je niet mag lezen is voor een stylesheet of
   een lettertype waardeloos: de browser slaat het over. Bewaren is
   dan erger dan niet bewaren, want dan zit je er ook aan vast zodra de
   server wél toestemming geeft. */
function onleesbaar(verzoek, antwoord) {
  return !!antwoord && antwoord.type === "opaque" && stijlOfLettertype(verzoek);
}

/* Bij het installeren alles ophalen en wegleggen. Eén mislukt bestand
   mag de hele installatie niet laten klappen, dus ze gaan stuk voor
   stuk en een mislukking wordt overgeslagen. */
self.addEventListener("install", function (gebeurtenis) {
  gebeurtenis.waitUntil(
    caches.open(VERSIE).then(function (voorraad) {
      return Promise.all(VOORRAAD.map(function (adres) {
        return haal(adres)
          .then(function (antwoord) {
            /* Een onleesbare stylesheet niet wegleggen: die zou de
               browser toch overslaan, en dan blijven de icoontjes weg
               zonder dat er ergens een fout te zien is. */
            if (onleesbaar(adres, antwoord)) return;
            return voorraad.put(adres, antwoord);
          })
          .catch(function () { /* niet gelukt: dan later bij gebruik */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

/* Bij het activeren de voorraad van een vorige versie opruimen, zodat
   je na een update niet de oude app blijft zien. */
self.addEventListener("activate", function (gebeurtenis) {
  gebeurtenis.waitUntil(
    caches.keys().then(function (namen) {
      return Promise.all(namen.map(function (naam) {
        return naam === VERSIE ? null : caches.delete(naam);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Wat er gebeurt bij elk verzoek.

   Voor de app zelf: eerst het internet proberen, en anders de
   voorraad. Zo krijg je een nieuwe versie zodra je online bent, maar
   start hij ook zonder bereik.

   Voor al het andere: eerst de voorraad, want die verandert niet en
   dat scheelt wachten. Wat er nog niet in zit wordt onderweg
   toegevoegd, zoals de lettertypebestanden van de icoontjes. */
self.addEventListener("fetch", function (gebeurtenis) {
  var verzoek = gebeurtenis.request;
  if (verzoek.method !== "GET") return;
  /* Niet van ons? Dan blijven we eraf. Zie de uitleg bij vanOns. */
  if (!vanOns(verzoek.url)) return;

  if (verzoek.mode === "navigate") {
    gebeurtenis.respondWith(
      fetch(verzoek).then(function (antwoord) {
        var kopie = antwoord.clone();
        caches.open(VERSIE).then(function (v) { v.put("./index.html", kopie); });
        return antwoord;
      }).catch(function () {
        return caches.match("./index.html").then(function (uitVoorraad) {
          return uitVoorraad || caches.match("./");
        });
      })
    );
    return;
  }

  gebeurtenis.respondWith(
    caches.match(verzoek).then(function (uitVoorraad) {
      if (uitVoorraad && !onleesbaar(verzoek, uitVoorraad)) return uitVoorraad;
      return haal(verzoek).then(function (antwoord) {
        /* Alleen bewaren wat de moeite is. Een foutpagina bewaren zou
           betekenen dat je die fout blijft houden, en een dichtgeplakt
           pakketje voor een stylesheet net zo goed. */
        if (antwoord && (antwoord.ok || antwoord.type === "opaque") &&
            !onleesbaar(verzoek, antwoord)) {
          var kopie = antwoord.clone();
          caches.open(VERSIE).then(function (v) { v.put(verzoek, kopie); });
        }
        return antwoord;
      });
    })
  );
});
