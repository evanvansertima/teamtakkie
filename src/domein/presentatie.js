// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: presentatie van een toernooi — dia's op een groot scherm
   ─────────────────────────────────────────────────────────────
   Wens van Evan (12 oktober 2026): bij Presentatie zelf dia's maken.
   Per dia één tot vier blokken (wedstrijden, programma, stand, laatst
   gespeeld, knock-out, sponsors, grote tekst, kleedkamers, afbeelding,
   video), een duur in seconden (standaard 8) en een vinkje of hij
   meedoet. Sponsors, kleedkamers, afbeeldingen en video's worden eerst
   als "materiaal" ingevuld; een dia kiest daar dan uit.

   Waar het staat (in het toernooi, t.presentatie):
     kleur, mededeling, metLogo, thema ("nacht" | "licht" | "club")
     dias:        [{ id, naam, aan, duur, blokken: [{ id, soort, ...instellingen }] }]
     sponsors:    [{ id, naam, logoId }]
     kleedkamers: [{ id, naam, teams: [deelnemerId], tijd, opmerking }]
     media:       [{ id, soort: "afbeelding" | "video", naam, url? }]
   Een afbeelding zelf (de pixels) staat NIET in het toernooi maar in de
   browser van het apparaat (IndexedDB, src/schermen/presentatie.jsx):
   anders loopt de opslag van de browser vol en gaat elke synchronisatie
   een paar megabyte heen en weer. Bij publiceren gaan de afbeeldingen
   apart naar de server (server/25-toernooi-media.sql).

   Puur: geen opslag, geen scherm. Geen import/export (tools/bouw.js).
   ══════════════════════════════════════════════════════════════ */

const DIA_STANDAARD_DUUR = 8;
const DIA_MIN_DUUR = 3;
const DIA_MAX_DUUR = 300;
const DIA_MAX_BLOKKEN = 4;
const PRESENTATIE_THEMAS = [
  { id: "nacht", naam: "Avond (donker)" },
  { id: "licht", naam: "Daglicht (licht)" },
  { id: "club", naam: "Clubkleur" }
];

/* De soorten blokken, met hun instellingen en beginwaarden. "velden"
   bepaalt welke keuzes het scherm laat zien. */
const BLOK_SOORTEN = [
  { id: "wedstrijden", naam: "Alle wedstrijden", icoon: "fa-solid fa-list-ol", velden: ["categorie", "dag", "aantal"], standaard: { aantal: 10 } },
  { id: "programma", naam: "Programma (volgende)", icoon: "fa-solid fa-clock", velden: ["categorie", "aantal"], standaard: { aantal: 6 } },
  { id: "stand", naam: "Stand", icoon: "fa-solid fa-ranking-star", velden: ["categorie", "poule"], standaard: {} },
  { id: "uitslagen", naam: "Laatst gespeeld", icoon: "fa-solid fa-flag-checkered", velden: ["categorie", "aantal"], standaard: { aantal: 6 } },
  { id: "knockout", naam: "Knock-out", icoon: "fa-solid fa-sitemap", velden: ["categorie"], standaard: {} },
  { id: "sponsors", naam: "Sponsors", icoon: "fa-solid fa-handshake", velden: ["sponsors"], standaard: {} },
  { id: "tekst", naam: "Grote tekst", icoon: "fa-solid fa-font", velden: ["tekst", "ondertekst"], standaard: { tekst: "WELKOM", ondertekst: "" } },
  { id: "kleedkamers", naam: "Kleedkamerindeling", icoon: "fa-solid fa-door-open", velden: [], standaard: {} },
  { id: "afbeelding", naam: "Afbeelding", icoon: "fa-solid fa-image", velden: ["afbeelding"], standaard: {} },
  { id: "video", naam: "Video", icoon: "fa-solid fa-film", velden: ["video"], standaard: {} }
];

var _diaVolg = 0;
/** @param {string} voor @returns {string} */
function diaId(voor) { _diaVolg++; return voor + Date.now().toString(36) + _diaVolg; }

/** @param {string} soort @returns {any} */
function nieuwBlok(soort) {
  var s = BLOK_SOORTEN.filter(function (x) { return x.id === soort; })[0];
  if (!s) throw new Error("Onbekend blok: " + soort);
  return Object.assign({ id: diaId("b"), soort: soort, categorieId: "", dagId: "", pouleId: "" }, JSON.parse(JSON.stringify(s.standaard)));
}
/** @param {string} naam @param {string[]} soorten @returns {any} */
function nieuweDia(naam, soorten) {
  return { id: diaId("d"), naam: naam || "Nieuwe dia", aan: true, duur: DIA_STANDAARD_DUUR, blokken: (soorten || []).map(nieuwBlok) };
}

/** @param {any} v @returns {number} */
function diaDuur(v) {
  var n = Math.round(Number(v));
  if (!isFinite(n) || n <= 0) return DIA_STANDAARD_DUUR;
  return Math.max(DIA_MIN_DUUR, Math.min(DIA_MAX_DUUR, n));
}

/* Een beginset die bij dít toernooi past: alleen dia's waar iets op
   staat (geen knock-out-dia als er geen knock-out is). */
/** @param {any} t @returns {any[]} */
function standaardDias(t) {
  var p = t.presentatie || {};
  /** @type {any[]} */ var uit = [];
  var welkom = nieuweDia("Welkom", ["tekst"]);
  welkom.blokken[0].tekst = t.naam || "Welkom";
  welkom.blokken[0].ondertekst = p.mededeling || "Veel plezier en succes!";
  uit.push(welkom);
  uit.push(nieuweDia("Programma en uitslagen", ["programma", "uitslagen"]));
  var poules = t.stadia.filter(function (/** @type {any} */ s) { return s.soort === "poule"; });
  poules.forEach(function (/** @type {any} */ s) {
    var cat = t.categorieen.filter(function (/** @type {any} */ c) { return c.id === s.categorieId; })[0];
    var d = nieuweDia("Stand" + (t.categorieen.length > 1 && cat ? " " + cat.naam : ""), ["stand"]);
    d.blokken[0].categorieId = s.categorieId;
    uit.push(d);
  });
  t.stadia.filter(function (/** @type {any} */ s) { return s.soort === "knockout"; }).forEach(function (/** @type {any} */ s) {
    var cat = t.categorieen.filter(function (/** @type {any} */ c) { return c.id === s.categorieId; })[0];
    var d = nieuweDia("Knock-out" + (t.categorieen.length > 1 && cat ? " " + cat.naam : ""), ["knockout"]);
    d.blokken[0].categorieId = s.categorieId;
    uit.push(d);
  });
  if ((p.kleedkamers || []).length) uit.push(nieuweDia("Kleedkamers", ["kleedkamers"]));
  if ((p.sponsors || []).length) uit.push(nieuweDia("Sponsors", ["sponsors"]));
  return uit;
}

/* De dia's die nu meedoen: aangevinkt en met minstens één blok. Nog
   nooit dia's gemaakt? Dan de beginset, zodat de tv nooit leeg is. */
/** @param {any} t @returns {any[]} */
function actieveDias(t) {
  var p = t.presentatie || {};
  if (!Array.isArray(p.dias)) return standaardDias(t);
  return p.dias.filter(function (/** @type {any} */ d) { return d && d.aan !== false && (d.blokken || []).length; })
    .map(function (/** @type {any} */ d) { return Object.assign({}, d, { duur: diaDuur(d.duur), blokken: d.blokken.slice(0, DIA_MAX_BLOKKEN) }); });
}
/** @param {any[]} dias @returns {number} seconden voor één rondje */
function rondjeDuur(dias) { return dias.reduce(function (s, d) { return s + diaDuur(d.duur); }, 0); }

/* Hoe de blokken op een dia staan. 3 blokken: één groot links, twee
   gestapeld rechts. */
/** @param {number} n @returns {{kolommen:string, rijen:string, plekken:string[]}} */
function diaIndeling(n) {
  if (n <= 1) return { kolommen: "1fr", rijen: "1fr", plekken: ["1 / 1 / 2 / 2"] };
  if (n === 2) return { kolommen: "1fr 1fr", rijen: "1fr", plekken: ["1 / 1 / 2 / 2", "1 / 2 / 2 / 3"] };
  if (n === 3) return { kolommen: "1.25fr 1fr", rijen: "1fr 1fr", plekken: ["1 / 1 / 3 / 2", "1 / 2 / 2 / 3", "2 / 2 / 3 / 3"] };
  return { kolommen: "1fr 1fr", rijen: "1fr 1fr", plekken: ["1 / 1 / 2 / 2", "1 / 2 / 2 / 3", "2 / 1 / 3 / 2", "2 / 2 / 3 / 3"] };
}

/* ── Wat er op een blok staat ─────────────────────────────────
   Dezelfde rekenfuncties als de rest van het toernooi (schemaRegels,
   pouleStand, deelnemersVan, winnaarVan in src/domein/toernooi.js).
   nu = {datum:"JJJJ-MM-DD", min: minuten sinds middernacht}. */
/** @param {any} t @param {string} catId @returns {any} */
function metCategorie(t, catId) {
  if (!catId) return t;
  return Object.assign({}, t, {
    stadia: t.stadia.filter(function (/** @type {any} */ s) { return s.categorieId === catId; }),
    wedstrijden: t.wedstrijden.filter(function (/** @type {any} */ w) { return w.categorieId === catId; })
  });
}
/** @param {any} t @param {any} blok @param {{datum:string, min:number}} nu @returns {any} */
function blokGegevens(t, blok, nu) {
  var p = t.presentatie || {};
  var tt = metCategorie(t, blok.categorieId);
  var cat = blok.categorieId ? t.categorieen.filter(function (/** @type {any} */ c) { return c.id === blok.categorieId; })[0] : null;
  var achter = cat && t.categorieen.length > 1 ? " · " + cat.naam : "";
  /** @type {Object<string, any>} */ var opNummer = {};
  t.wedstrijden.forEach(function (/** @type {any} */ w) { opNummer[w.nummer] = w; });
  /** @type {Object<string, string>} */ var dagDatum = {};
  t.dagen.forEach(function (/** @type {any} */ d) { dagDatum[d.id] = d.datum; });
  var aantal = Math.max(1, Math.min(20, Number(blok.aantal) || 6));
  /** @param {any} r */
  function rij(r) {
    var w = opNummer[r.nummer];
    var c = t.categorieen.filter(function (/** @type {any} */ x) { return x.id === w.categorieId; })[0] || {};
    var bezig = !!(w.start && !w.uitslag && dagDatum[w.dagId] === nu.datum && nu.min >= minVan(w.start) && nu.min < minVan(w.start) + (c.wedstrijdduur || 0));
    return { nummer: r.nummer, tijd: r.tijd, veld: r.veld, thuis: r.thuis, uit: r.uit, uitslag: r.uitslag, categorie: t.categorieen.length > 1 ? r.categorie : "",
             ronde: r.ronde, bezig: bezig };
  }
  if (blok.soort === "wedstrijden") {
    var alle = schemaRegels(tt).filter(function (r) { var w = opNummer[r.nummer]; return w.start && (!blok.dagId || w.dagId === blok.dagId); });
    return { titel: "Wedstrijden" + achter, rijen: alle.slice(0, aantal).map(rij), meer: Math.max(0, alle.length - aantal) };
  }
  if (blok.soort === "programma") {
    /* Wat nog moet komen: niet gespeeld, en vandaag niet al lang voorbij. */
    var komend = schemaRegels(tt).filter(function (r) {
      var w = opNummer[r.nummer];
      if (w.uitslag || !w.start) return false;
      var d = dagDatum[w.dagId] || "";
      return !d || d > nu.datum || (d === nu.datum && minVan(w.start) + 30 >= nu.min) || d < nu.datum;
    });
    return { titel: "Programma" + achter, rijen: komend.slice(0, aantal).map(rij), meer: Math.max(0, komend.length - aantal) };
  }
  if (blok.soort === "uitslagen") {
    var gespeeld = schemaRegels(tt).filter(function (r) { return opNummer[r.nummer].uitslag; }).reverse();
    return { titel: "Laatst gespeeld" + achter, rijen: gespeeld.slice(0, aantal).map(rij), meer: 0 };
  }
  if (blok.soort === "stand") {
    /** @type {any[]} */ var poules = [];
    tt.stadia.forEach(function (/** @type {any} */ s) {
      if (s.soort !== "poule") return;
      var c = t.categorieen.filter(function (/** @type {any} */ x) { return x.id === s.categorieId; })[0] || {};
      s.poules.forEach(function (/** @type {any} */ pl) {
        if (blok.pouleId && pl.id !== blok.pouleId) return;
        poules.push({ naam: (t.categorieen.length > 1 && !cat ? c.naam + " · " : "") + (s.poules.length > 1 ? pl.naam : s.naam),
                      doorPerPoule: s.doorgaan.perPoule || 0, rijen: pouleStand(t, s.id, pl.id) });
      });
    });
    return { titel: "Stand" + achter, poules: poules };
  }
  if (blok.soort === "knockout") {
    /** @type {any[]} */ var rondes = [];
    tt.stadia.forEach(function (/** @type {any} */ s) {
      if (s.soort !== "knockout") return;
      var ws = t.wedstrijden.filter(function (/** @type {any} */ w) { return w.stadiumId === s.id; }).sort(function (/** @type {any} */ a, /** @type {any} */ b) { return a.nummer - b.nummer; });
      ws.forEach(function (/** @type {any} */ w) {
        var r = rondes.filter(function (x) { return x.naam === w.rondeNaam && x.stadium === s.id; })[0];
        if (!r) { r = { naam: w.rondeNaam, stadium: s.id, wedstrijden: [] }; rondes.push(r); }
        var d = deelnemersVan(t, w), win = w.uitslag ? winnaarVan(t, w) : null;
        r.wedstrijden.push({ nummer: w.nummer, thuis: kantNaamDia(t, w, "thuis"), uit: kantNaamDia(t, w, "uit"), uitslag: w.uitslag, strafschoppen: w.strafschoppen,
                             winnaar: win ? (win === d.thuis ? "thuis" : "uit") : null, tijd: w.start || "" });
      });
    });
    var finale = tt.wedstrijden.filter(function (/** @type {any} */ w) { return w.rondeNaam === "Finale"; })[0];
    var kampioen = finale ? winnaarVan(t, finale) : null;
    var kd = kampioen && t.deelnemers.filter(function (/** @type {any} */ d) { return d.id === kampioen; })[0];
    return { titel: "Knock-out" + achter, rondes: rondes, kampioen: kd ? kd.naam : "" };
  }
  if (blok.soort === "sponsors") {
    var alleS = p.sponsors || [];
    var gekozen = Array.isArray(blok.sponsors) && blok.sponsors.length ? alleS.filter(function (/** @type {any} */ s) { return blok.sponsors.indexOf(s.id) >= 0; }) : alleS;
    return { titel: "Sponsors", sponsors: gekozen };
  }
  if (blok.soort === "tekst") return { titel: "", tekst: String(blok.tekst || ""), ondertekst: String(blok.ondertekst || "") };
  if (blok.soort === "kleedkamers") {
    return { titel: "Kleedkamers", kamers: (p.kleedkamers || []).map(function (/** @type {any} */ k) {
      return { naam: k.naam, tijd: k.tijd || "", opmerking: k.opmerking || "",
               teams: (k.teams || []).map(function (/** @type {string} */ id) { var d = t.deelnemers.filter(function (/** @type {any} */ x) { return x.id === id; })[0]; return d ? d.naam : ""; }).filter(Boolean) };
    }) };
  }
  if (blok.soort === "afbeelding" || blok.soort === "video") {
    var m = (p.media || []).filter(function (/** @type {any} */ x) { return x.id === blok.mediaId && x.soort === blok.soort; })[0] || null;
    return { titel: m ? m.naam : "", media: m, video: m && blok.soort === "video" ? videoBron(m.url) : null, passend: blok.passend || "vullen" };
  }
  return { titel: "" };
}
/** @param {any} t @param {any} w @param {string} kant @returns {string} */
function kantNaamDia(t, w, kant) {
  var id = deelnemersVan(t, w)[/** @type {"thuis"|"uit"} */ (kant)];
  var d = id && t.deelnemers.filter(function (/** @type {any} */ x) { return x.id === id; })[0];
  return d ? d.naam : bronTekst(t, w[kant]);
}

/* Een videolink herkennen. Alleen YouTube, Vimeo en een directe
   videolink (.mp4/.webm): zo gaat er nooit een willekeurige pagina in
   een frame op de tv. */
/** @param {any} url @returns {{soort:string, id?:string, url?:string}|null} */
function videoBron(url) {
  var u = String(url || "").trim();
  var m = u.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return { soort: "youtube", id: m[1] };
  m = u.match(/^https:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{5,12})/);
  if (m) return { soort: "vimeo", id: m[1] };
  if (/^https:\/\/[^\s\x22\x27\x3c\x3e]+\.(mp4|webm)(\?[^\s\x22\x27\x3c\x3e]*)?$/i.test(u)) return { soort: "bestand", url: u };
  return null;
}

/* Wat er van de presentatie openbaar gaat (in de momentopname van
   publiekeMomentopname). Teams in een kleedkamer staan er als id in;
   de namen staan al in de deelnemers. Geen e-mail of telefoon: die
   zitten nergens in de presentatie. */
/** @param {any} p @returns {any} */
function publiekePresentatie(p) {
  p = p || {};
  /** @param {any} o @param {string[]} velden */
  function alleen(o, velden) { var u = /** @type {any} */ ({}); velden.forEach(function (v) { if (o && o[v] !== undefined) u[v] = /** @type {any} */ (o)[v]; }); return u; }
  return {
    kleur: p.kleur || "", mededeling: p.mededeling || "", thema: p.thema || "nacht",
    dias: Array.isArray(p.dias) ? p.dias.map(function (/** @type {any} */ d) {
      return { id: d.id, naam: String(d.naam || ""), aan: d.aan !== false, duur: diaDuur(d.duur),
               blokken: (d.blokken || []).slice(0, DIA_MAX_BLOKKEN).map(function (/** @type {any} */ b) {
                 return alleen(b, ["id", "soort", "categorieId", "dagId", "pouleId", "aantal", "tekst", "ondertekst", "sponsors", "mediaId", "passend"]);
               }) };
    }) : null,
    sponsors: (p.sponsors || []).map(function (/** @type {any} */ s) { return alleen(s, ["id", "naam", "logoId"]); }),
    kleedkamers: (p.kleedkamers || []).map(function (/** @type {any} */ k) { return alleen(k, ["id", "naam", "teams", "tijd", "opmerking"]); }),
    media: (p.media || []).map(function (/** @type {any} */ m) { return alleen(m, ["id", "soort", "naam", "url"]); })
  };
}
/* Welke afbeeldingen (pixels) zijn er nodig voor de dia's die aan staan,
   plus de sponsorlogo's? Alleen die gaan naar de server. */
/** @param {any} p @returns {string[]} */
function nodigeMedia(p) {
  p = p || {};
  /** @type {string[]} */ var ids = [];
  (p.sponsors || []).forEach(function (/** @type {any} */ s) { if (s.logoId && ids.indexOf(s.logoId) < 0) ids.push(s.logoId); });
  (p.media || []).forEach(function (/** @type {any} */ m) { if (m.soort === "afbeelding" && ids.indexOf(m.id) < 0) ids.push(m.id); });
  return ids;
}
