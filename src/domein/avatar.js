// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: de zelfgemaakte avatar
   ─────────────────────────────────────────────────────────────
   Verzoek van Evan (14 oktober 2026): bij een speler zelf een avatar
   maken, met meer keuze — man of vrouw, kort, normaal of lang haar,
   ogen, neus, mond en kin. De tekening zelf staat in
   src/schermen/gedeeld.jsx (PopHoofd); hier staat alleen wat er te
   kiezen valt en hoe een opgeslagen keuze netjes wordt gemaakt.

   Een avatar is { versie:2, geslacht, huid, haar, kapsel, ogen, neus,
   mond, kin, baard }. huid en haar zijn een plek in de kleurenlijst
   (POP_HUID/POP_HAAR in gedeeld.jsx: 6 en 8 kleuren), de rest zijn
   namen uit de lijsten hieronder.

   Versie 1 bestond een paar uur (kapsel als getal 0–5, alleen huid,
   haar en baard); avatarNetjes zet die om, zodat niets verloren gaat.

   Puur: geen opslag, geen scherm. Geen import/export (tools/bouw.js).
   ══════════════════════════════════════════════════════════════ */

const AVATAR_HUID_AANTAL = 6;
const AVATAR_HAAR_AANTAL = 8;
/* Per lengte, in de volgorde waarin de kiezer ze laat zien. */
const AVATAR_KAPSELS = [
  { id: "kaal",      label: "Kaal",          lengte: "kort" },
  { id: "buzz",      label: "Opgeschoren",   lengte: "kort" },
  { id: "kort",      label: "Kort",          lengte: "kort" },
  { id: "stekels",   label: "Stekels",       lengte: "kort" },
  { id: "scheiding", label: "Scheiding",     lengte: "normaal" },
  { id: "kuif",      label: "Kuif",          lengte: "normaal" },
  { id: "krullen",   label: "Krullen",       lengte: "normaal" },
  { id: "afro",      label: "Afro",          lengte: "normaal" },
  { id: "bob",       label: "Bob",           lengte: "normaal" },
  { id: "lang",      label: "Lang los",      lengte: "lang" },
  { id: "staart",    label: "Paardenstaart", lengte: "lang" },
  { id: "knot",      label: "Knot",          lengte: "lang" },
  { id: "vlechten",  label: "Vlechten",      lengte: "lang" }
];
const AVATAR_LENGTES = [
  { id: "kort", label: "Kort haar" }, { id: "normaal", label: "Normaal haar" }, { id: "lang", label: "Lang haar" }
];
const AVATAR_OGEN  = [{ id: "rond", label: "Rond" }, { id: "groot", label: "Groot" }, { id: "ovaal", label: "Ovaal" },
                      { id: "smal", label: "Smal" }, { id: "lachend", label: "Lachend" }];
const AVATAR_NEUZEN = [{ id: "klein", label: "Klein" }, { id: "rond", label: "Rond" }, { id: "spits", label: "Spits" },
                       { id: "breed", label: "Breed" }, { id: "geen", label: "Geen" }];
const AVATAR_MONDEN = [{ id: "glimlach", label: "Glimlach" }, { id: "lach", label: "Lach" }, { id: "grijns", label: "Grijns" },
                       { id: "neutraal", label: "Neutraal" }, { id: "verbaasd", label: "Verbaasd" }];
const AVATAR_KINNEN = [{ id: "rond", label: "Rond" }, { id: "ovaal", label: "Ovaal" }, { id: "smal", label: "Smal" },
                       { id: "breed", label: "Breed" }];
/* Versie 1 had zes kapsels, als getal. Zo zagen ze eruit. */
const AVATAR_OUDE_KAPSELS = ["kort", "scheiding", "lang", "buzz", "krullen", "kaal"];

/** @typedef {Object} Avatar
 * @property {number} versie
 * @property {"m"|"v"} geslacht
 * @property {number} huid
 * @property {number} haar
 * @property {string} kapsel
 * @property {string} ogen
 * @property {string} neus
 * @property {string} mond
 * @property {string} kin
 * @property {boolean} baard
 */

/* Een vast getal uit een naam, zodat "Verras me" niet nodig is om een
   eerste avatar te hebben die bij de speler blijft. */
/** @param {any} tekst @returns {number} */
function avatarGetal(tekst) {
  var s = String(tekst || "?"), x = 2166136261;
  for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
/** @param {{id:string}[]} lijst @param {any} id @param {string} terug @returns {string} */
function avatarUit(lijst, id, terug) {
  return lijst.some(function (o) { return o.id === id; }) ? id : terug;
}
/** @param {any} n @param {number} aantal @param {number} terug @returns {number} */
function avatarIndex(n, aantal, terug) {
  var g = Number(n);
  return (Number.isInteger(g) && g >= 0 && g < aantal) ? g : terug;
}
/**
 * Een beginavatar bij een naam: elke keer dezelfde.
 * @param {string} naam
 * @param {"m"|"v"} [geslacht]
 * @returns {Avatar}
 */
function avatarVanNaam(naam, geslacht) {
  var g = avatarGetal(naam);
  /** @type {"m"|"v"} */
  var gs = geslacht === "v" ? "v" : "m";
  var kapsels = AVATAR_KAPSELS.filter(function (k) {
    return gs === "v" ? k.lengte !== "kort" : k.lengte !== "lang";
  });
  return {
    versie: 2, geslacht: gs,
    huid: g % AVATAR_HUID_AANTAL, haar: (g >>> 3) % AVATAR_HAAR_AANTAL,
    kapsel: kapsels[(g >>> 6) % kapsels.length].id,
    ogen: AVATAR_OGEN[(g >>> 10) % AVATAR_OGEN.length].id,
    neus: AVATAR_NEUZEN[(g >>> 13) % (AVATAR_NEUZEN.length - 1)].id,
    mond: AVATAR_MONDEN[(g >>> 16) % 3].id,
    kin: AVATAR_KINNEN[(g >>> 19) % AVATAR_KINNEN.length].id,
    baard: gs === "m" && ((g >>> 22) % 5) === 0
  };
}
/**
 * Maakt van wat er is opgeslagen een volledige, geldige avatar. Wat
 * ontbreekt of niet bestaat, komt uit de naam. Een vrouw heeft geen
 * baard; een kaal hoofd ook niet (dat zag er bij versie 1 al raar uit).
 * @param {any} a       opgeslagen avatar, of niets
 * @param {string} naam
 * @returns {Avatar}
 */
function avatarNetjes(a, naam) {
  var w = (a && typeof a === "object") ? a : {};
  /** @type {"m"|"v"} */
  var gs = w.geslacht === "v" ? "v" : "m";
  var basis = avatarVanNaam(naam, gs);
  var kapsel = w.kapsel;
  if (typeof kapsel === "number") kapsel = AVATAR_OUDE_KAPSELS[kapsel];
  var k = avatarUit(AVATAR_KAPSELS, kapsel, basis.kapsel);
  return {
    versie: 2, geslacht: gs,
    huid: avatarIndex(w.huid, AVATAR_HUID_AANTAL, basis.huid),
    haar: avatarIndex(w.haar, AVATAR_HAAR_AANTAL, basis.haar),
    kapsel: k,
    ogen: avatarUit(AVATAR_OGEN, w.ogen, basis.ogen),
    neus: avatarUit(AVATAR_NEUZEN, w.neus, basis.neus),
    mond: avatarUit(AVATAR_MONDEN, w.mond, basis.mond),
    kin: avatarUit(AVATAR_KINNEN, w.kin, basis.kin),
    baard: gs === "m" && k !== "kaal" && (typeof w.baard === "boolean" ? w.baard : basis.baard)
  };
}
/**
 * Wisselen van man naar vrouw (of andersom): het gezicht blijft, alleen
 * het kapsel springt naar een passende lengte als het nu niet past, en
 * de baard gaat eraf.
 * @param {Avatar} a
 * @param {"m"|"v"} geslacht
 * @param {string} naam
 * @returns {Avatar}
 */
function avatarMetGeslacht(a, geslacht, naam) {
  var n = Object.assign({}, a, { geslacht: geslacht });
  var lengte = (AVATAR_KAPSELS.filter(function (k) { return k.id === a.kapsel; })[0] || {}).lengte;
  if (geslacht === "v" && lengte === "kort") n.kapsel = "lang";
  if (geslacht === "m" && lengte === "lang") n.kapsel = "kort";
  return avatarNetjes(n, naam);
}
/**
 * "Verras me": alles willekeurig, behalve het geslacht.
 * @param {"m"|"v"} geslacht
 * @param {() => number} [kans]  alleen voor de test; standaard Math.random
 * @returns {Avatar}
 */
function avatarWillekeurig(geslacht, kans) {
  var r = kans || Math.random;
  /** @param {any[]} l */
  function een(l) { return l[Math.floor(r() * l.length) % l.length]; }
  var kapsels = AVATAR_KAPSELS.filter(function (k) { return geslacht === "v" ? k.lengte !== "kort" : true; });
  return avatarNetjes({
    geslacht: geslacht, huid: Math.floor(r() * AVATAR_HUID_AANTAL) % AVATAR_HUID_AANTAL,
    haar: Math.floor(r() * AVATAR_HAAR_AANTAL) % AVATAR_HAAR_AANTAL,
    kapsel: een(kapsels).id, ogen: een(AVATAR_OGEN).id, neus: een(AVATAR_NEUZEN).id,
    mond: een(AVATAR_MONDEN).id, kin: een(AVATAR_KINNEN).id, baard: r() < 0.25
  }, "");
}
