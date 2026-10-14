// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: vaste trainingstijden van een team
   ─────────────────────────────────────────────────────────────
   Verzoek van Evan (14 oktober 2026): "het wordt vervelend dat ik
   steeds een tijd moet invullen." Een team traint vrijwel altijd op
   dezelfde avonden op dezelfde tijd. Die vraag je dus één keer, bij
   het aanmaken van het team (en daarna in Instellingen), en een
   nieuwe training krijgt ze vanzelf mee:
     · de datum wordt de eerstvolgende trainingsdag waarop nog geen
       training staat;
     · tijd, duur en (als ingevuld) locatie komen van die dag;
     · kies je zelf een andere datum, dan volgen tijd en duur de dag —
       zolang je de tijd niet zelf hebt veranderd.

   Een moment is { dag, tijd, duur, locatie }. dag volgt Date.getDay():
   0 = zondag … 6 = zaterdag. Eén moment per dag: twee trainingen op
   één avond komt bij amateurteams niet voor, en dan weet de app bij
   een gekozen datum zonder twijfel welke tijd erbij hoort.

   Puur: geen opslag, geen scherm. Geen import/export (tools/bouw.js).
   ══════════════════════════════════════════════════════════════ */

/* In de volgorde van een trainingsweek: maandag eerst. */
const TRAININGSDAGEN = [
  { dag: 1, kort: "ma", naam: "maandag" },
  { dag: 2, kort: "di", naam: "dinsdag" },
  { dag: 3, kort: "wo", naam: "woensdag" },
  { dag: 4, kort: "do", naam: "donderdag" },
  { dag: 5, kort: "vr", naam: "vrijdag" },
  { dag: 6, kort: "za", naam: "zaterdag" },
  { dag: 0, kort: "zo", naam: "zondag" }
];
/* Wat een nieuw aangevinkte dag krijgt. Doordeweeks is 19:00 de
   gewoonste avondtraining; in het weekend traint de jeugd 's ochtends. */
const TRAINING_STANDAARD_TIJD = "19:00";
const TRAINING_STANDAARD_WEEKEND = "10:00";
const TRAINING_STANDAARD_DUUR = 90;

/** @param {any} t @returns {string} */
function _tijdNetjes(t) {
  var m = String(t == null ? "" : t).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  var u = Number(m[1]), min = Number(m[2]);
  if (u > 23 || min > 59) return "";
  return (u < 10 ? "0" : "") + u + ":" + m[2];
}

/** @param {number} dag @returns {string} */
function standaardTrainingstijd(dag) {
  return (dag === 0 || dag === 6) ? TRAINING_STANDAARD_WEEKEND : TRAINING_STANDAARD_TIJD;
}

/* Wat er ook in de opslag staat (oud, half, met de hand bewerkt):
   hier komt een nette lijst uit, maandag eerst, één per dag. */
/** @param {any} lijst @returns {{dag:number, tijd:string, duur:number, locatie:string}[]} */
function trainingsmomentenNetjes(lijst) {
  /** @type {Object<string, {dag:number, tijd:string, duur:number, locatie:string}>} */
  var per = {};
  (Array.isArray(lijst) ? lijst : []).forEach(function (m) {
    if (!m || typeof m !== "object") return;
    var dag = Number(m.dag);
    if (!(dag >= 0 && dag <= 6 && Math.floor(dag) === dag) || per[dag]) return;
    var duur = Math.round(Number(m.duur));
    per[dag] = {
      dag: dag,
      tijd: _tijdNetjes(m.tijd) || standaardTrainingstijd(dag),
      duur: duur >= 15 && duur <= 240 ? duur : TRAINING_STANDAARD_DUUR,
      locatie: String(m.locatie == null ? "" : m.locatie).trim()
    };
  });
  return TRAININGSDAGEN.filter(function (d) { return per[d.dag]; }).map(function (d) { return per[d.dag]; });
}

/* Dag aan- of uitvinken. Aan: met de standaardtijd, of met de tijd en
   duur van de dag die al aan stond, zodat wie di en do traint niet twee
   keer dezelfde tijd hoeft te typen. */
/** @param {any} lijst @param {number} dag */
function wisselTrainingsdag(lijst, dag) {
  var nu = trainingsmomentenNetjes(lijst);
  if (nu.some(function (m) { return m.dag === dag; })) {
    return nu.filter(function (m) { return m.dag !== dag; });
  }
  var voorbeeld = nu.filter(function (m) { return (m.dag === 0 || m.dag === 6) === (dag === 0 || dag === 6); })[0];
  return trainingsmomentenNetjes(nu.concat([{
    dag: dag,
    tijd: voorbeeld ? voorbeeld.tijd : standaardTrainingstijd(dag),
    duur: voorbeeld ? voorbeeld.duur : (nu[0] ? nu[0].duur : TRAINING_STANDAARD_DUUR),
    locatie: voorbeeld ? voorbeeld.locatie : ""
  }]));
}

/** @param {string} datum "jjjj-mm-dd" @returns {number} 0–6, of -1 */
function _weekdag(datum) {
  var m = String(datum || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return -1;
  /* Om 12 uur 's middags: dan verschuift zomertijd de dag nooit. */
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getDay();
}
/** @param {Date} d @returns {string} */
function _datumTekst(d) {
  var mm = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + "-" + (mm < 10 ? "0" : "") + mm + "-" + (dd < 10 ? "0" : "") + dd;
}

/** @param {any} lijst @param {string} datum */
function trainingsmomentOp(lijst, datum) {
  var dag = _weekdag(datum);
  return trainingsmomentenNetjes(lijst).filter(function (m) { return m.dag === dag; })[0] || null;
}

/* De eerstvolgende trainingsdag vanaf vandaag (vandaag telt mee) waarop
   nog geen training staat. Hoogstens acht weken vooruit: wie verder
   plant, kiest zelf. */
/**
 * @param {any} lijst
 * @param {Date} vandaag
 * @param {string[]} [bezet] datums waarop al een training staat
 * @returns {{datum:string, tijd:string, duur:number, locatie:string}|null}
 */
function trainingVoorstel(lijst, vandaag, bezet) {
  var momenten = trainingsmomentenNetjes(lijst);
  if (!momenten.length) return null;
  /** @type {Object<string, boolean>} */
  var vol = {};
  (bezet || []).forEach(function (d) { vol[String(d).slice(0, 10)] = true; });
  var d = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate(), 12);
  for (var i = 0; i < 56; i++) {
    var tekst = _datumTekst(d);
    var m = momenten.filter(function (x) { return x.dag === d.getDay(); })[0];
    if (m && !vol[tekst]) return { datum: tekst, tijd: m.tijd, duur: m.duur, locatie: m.locatie };
    d.setDate(d.getDate() + 1);
  }
  return null;
}

/* "di en do 19:00" — kort, voor een regel onder een kopje. */
/** @param {any} lijst @returns {string} */
function trainingsmomentenTekst(lijst) {
  var momenten = trainingsmomentenNetjes(lijst);
  if (!momenten.length) return "";
  /** @type {{tijd:string, dagen:number[]}[]} */
  var perTijd = [];
  momenten.forEach(function (m) {
    var groep = perTijd.filter(function (g) { return g.tijd === m.tijd; })[0];
    if (groep) groep.dagen.push(m.dag); else perTijd.push({ tijd: m.tijd, dagen: [m.dag] });
  });
  return perTijd.map(function (g) {
    var namen = g.dagen.map(function (/** @type {number} */ dag) { return TRAININGSDAGEN.filter(function (x) { return x.dag === dag; })[0].kort; });
    var lijstTekst = namen.length > 1 ? namen.slice(0, -1).join(", ") + " en " + namen[namen.length - 1] : namen[0];
    return lijstTekst + " " + g.tijd;
  }).join(" · ");
}
