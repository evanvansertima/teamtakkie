// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: leeftijdscategorie en spelvorm van een team
   ─────────────────────────────────────────────────────────────
   Aanleiding (15 oktober 2026): een tester met een O10 speelt 6 tegen
   6, maar de opstelling kende alleen formaties voor 11 tegen 11.

   Een team krijgt een categorie (O6 t/m Senioren). Daaruit volgt de
   spelvorm van de KNVB (seizoen 2026/'27):
     O6 → 2 tegen 2, O7 → 4 tegen 4, O8–O10 → 6 tegen 6,
     O11–O12 → 8 tegen 8, O13 t/m senioren → 11 tegen 11.
   7 tegen 7 is te kiezen maar hoort bij geen categorie vanzelf.
   De spelvorm bepaalt welke formaties je bij een wedstrijd ziet.

   Speelduur: alleen waar de KNVB-infographics hem noemen. Voor O6, O7,
   O13 en O14 staat er geen in, dus daar laten we de speelduur staan.

   Heeft een team (nog) geen categorie, dan lezen we hem uit de naam:
   "JO10-1" is een O10. Lukt dat niet, dan is het 11 tegen 11 — zoals
   de app tot nu toe altijd deed.

   Puur: geen opslag, geen scherm. Geen import/export (tools/bouw.js).
   ══════════════════════════════════════════════════════════════ */

/** @typedef {{label:string, spelers:number, keeper:boolean, formaties:string[]|null, standaard:string, kenmerken:string[]}} SpelvormInfo */
/** @type {Object<string,SpelvormInfo>} */
const SPELVORM_INFO = {
  "2x2":   { label: "2 tegen 2", spelers: 2, keeper: false, formaties: ["1-1", "2"], standaard: "1-1",
             kenmerken: ["Geen keeper", "Veel aan de bal, veel scoren"] },
  "4x4":   { label: "4 tegen 4", spelers: 4, keeper: false, formaties: ["1-2-1", "2-2"], standaard: "1-2-1",
             kenmerken: ["Geen keeper", "Spelenderwijs ontdekken"] },
  "6x6":   { label: "6 tegen 6", spelers: 6, keeper: true, formaties: ["2-1-2", "2-2-1", "1-3-1", "3-1-1"], standaard: "2-1-2",
             kenmerken: ["Veld 42,5 × 30 m", "Pupillendoel 5 × 2 m", "Bal maat 4", "Strafschop 7 m", "Geen buitenspel", "Geen ranglijst", "Spelbegeleider"] },
  "7x7":   { label: "7 tegen 7", spelers: 7, keeper: true, formaties: ["2-3-1", "3-2-1", "3-1-2", "2-2-2"], standaard: "2-3-1",
             kenmerken: [] },
  "8x8":   { label: "8 tegen 8", spelers: 8, keeper: true, formaties: ["3-3-1", "2-3-2", "3-2-2", "2-4-1"], standaard: "3-3-1",
             kenmerken: ["Veld 64 × 42,5 m", "Pupillendoel 5 × 2 m", "Bal maat 5", "Strafschop 9 m", "Geen buitenspel", "Wel ranglijst", "Pupillenscheidsrechter"] },
  "11x11": { label: "11 tegen 11", spelers: 11, keeper: true, formaties: null, standaard: "4-3-3A",
             kenmerken: ["Volledig veld", "Groot doel 7,32 × 2,44 m", "Bal maat 5", "Strafschop 11 m", "Buitenspel", "Ranglijst", "Max. 7 wissels"] }
};
const SPELVORM_VOLGORDE = ["2x2", "4x4", "6x6", "7x7", "8x8", "11x11"];

/* duur = totale speeltijd in minuten volgens de KNVB, of null als de
   infographics er niets over zeggen. */
/** @type {{id:string, spelvorm:string, duur:number|null, getal:number}[]} */
const TEAM_CATEGORIEEN = [
  { id: "O6",  spelvorm: "2x2",   duur: null, getal: 6 },
  { id: "O7",  spelvorm: "4x4",   duur: null, getal: 7 },
  { id: "O8",  spelvorm: "6x6",   duur: 40,   getal: 8 },
  { id: "O9",  spelvorm: "6x6",   duur: 40,   getal: 9 },
  { id: "O10", spelvorm: "6x6",   duur: 50,   getal: 10 },
  { id: "O11", spelvorm: "8x8",   duur: 60,   getal: 11 },
  { id: "O12", spelvorm: "8x8",   duur: 60,   getal: 12 },
  { id: "O13", spelvorm: "11x11", duur: null, getal: 13 },
  { id: "O14", spelvorm: "11x11", duur: null, getal: 14 },
  { id: "O15", spelvorm: "11x11", duur: 70,   getal: 15 },
  { id: "O16", spelvorm: "11x11", duur: 80,   getal: 16 },
  { id: "O17", spelvorm: "11x11", duur: 80,   getal: 17 },
  { id: "O19", spelvorm: "11x11", duur: 90,   getal: 19 },
  { id: "O21", spelvorm: "11x11", duur: 90,   getal: 21 },
  { id: "O23", spelvorm: "11x11", duur: 90,   getal: 23 },
  { id: "Senioren", spelvorm: "11x11", duur: 90, getal: 99 }
];

/** @param {any} id */
function teamCategorie(id) {
  return TEAM_CATEGORIEEN.filter(function (c) { return c.id === id; })[0] || null;
}
/**
 * "JO10-1", "MO11", "O12-3", "Onder 9" → de categorie. "JO18" wordt O19
 * (de eerstvolgende die bestaat). Senioren, heren en dames → Senioren.
 * @param {any} naam
 * @returns {string|null}
 */
function categorieUitTeamnaam(naam) {
  var s = String(naam || "");
  var m = s.match(/(?:^|[^A-Za-z0-9])(?:J?M?O|Onder)\s?(\d{1,2})(?!\d)/i);
  if (m) {
    var n = Number(m[1]);
    if (n < 6) return "O6";
    var c = TEAM_CATEGORIEEN.filter(function (k) { return k.getal >= n && k.getal < 99; })[0];
    return c ? c.id : null;
  }
  if (/senior|heren|dames|vrouwen|mannen|veteranen|35\+|45\+/i.test(s)) return "Senioren";
  return null;
}
/**
 * De spelvorm van het team: wat er gekozen is, anders wat de categorie
 * zegt, anders wat de naam zegt, anders 11 tegen 11.
 * @param {{spelvorm?:string, categorie?:string, teamNaam?:string}} i
 * @returns {string}
 */
function teamSpelvorm(i) {
  var w = i || {};
  if (w.spelvorm && SPELVORM_INFO[w.spelvorm]) return w.spelvorm;
  var c = teamCategorie(w.categorie) || teamCategorie(categorieUitTeamnaam(w.teamNaam));
  return c ? c.spelvorm : "11x11";
}
/**
 * Welke groepen formaties de kiezer laat zien.
 * @param {string} spelvorm
 * @param {{label:string, namen:string[]}[]} groepen11  de bestaande groepen voor 11 tegen 11
 * @returns {{label:string, namen:string[]}[]}
 */
function formatieGroepenVoor(spelvorm, groepen11) {
  var info = SPELVORM_INFO[spelvorm];
  if (!info || !info.formaties) return groepen11;
  return [{ label: info.label, namen: info.formaties.slice() }];
}
/**
 * Bij welke spelvorm hoort deze formatie? Geteld uit de plekken.
 * @param {string} formatie
 * @param {Object<string,{l:string}[]>} data  FORMATIES_DATA
 * @returns {string|null}
 */
function spelvormVanFormatie(formatie, data) {
  var plekken = data && data[formatie];
  if (!plekken) return null;
  var keeper = plekken.some(function (p) { return p.l === "DM"; });
  var sv = SPELVORM_VOLGORDE.filter(function (k) {
    return SPELVORM_INFO[k].spelers === plekken.length && SPELVORM_INFO[k].keeper === keeper;
  })[0];
  return sv || null;
}
/**
 * De formatie waarmee een opstelling begint. Een bestaande opstelling
 * blijft altijd staan zoals hij is; alleen een lege opstelling met een
 * formatie van een andere spelvorm (het oude "4-3-3A" bij een O10)
 * springt naar de standaard van het team.
 * @param {string|undefined} formatie
 * @param {string} spelvorm
 * @param {Object<string,{l:string}[]>} data
 * @param {boolean} [heeftOpstelling]
 * @returns {string}
 */
function passendeFormatie(formatie, spelvorm, data, heeftOpstelling) {
  var info = SPELVORM_INFO[spelvorm] || SPELVORM_INFO["11x11"];
  if (formatie && data && data[formatie] && (heeftOpstelling || spelvormVanFormatie(formatie, data) === spelvorm)) return formatie;
  return info.standaard;
}
