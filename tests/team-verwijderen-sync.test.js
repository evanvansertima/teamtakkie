/* ══════════════════════════════════════════════════════════════
   Tests voor duwTeamsWeg() in src/kern/sync.js
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/team-verwijderen-sync.test.js

   Geen testframework, geen npm install, geen bouwstap. De functies
   worden als tekst uit src/kern/sync.js en src/kern/sleutels.js
   geknipt en tegen een nagebootste localStorage en serverVraag()
   gedraaid — zie tests/sync.test.js voor de uitleg van die techniek,
   en tests/seizoen-verwijderen.test.js voor dezelfde opzet bij het
   verwijderen van een seizoen.

   ───────────────────────────────────────────────────────────────
   WAAR HET HIER OM GAAT

   Dit is dezelfde val die tests/opheffen.test.js al dichtzet voor
   hefClubOp(), maar dan één tabel verderop.

   Een team weggooien gebeurt in twee stappen. Lokaal blijft er een
   "grafsteen" achter (een regeltje in localStorage: dit team is hier
   weggegooid, op dit moment). Bij de volgende synchronisatie duwt
   duwTeamsWeg() die grafsteen naar de server: een PATCH die
   verwijderd_op zet, gevolgd door een DELETE van alle gegevens van
   dat team. Pas als dat gelukt is mag de grafsteen weg — de server
   onthoudt het vanaf dat moment zelf.

   Het probleem: PostgREST antwoordt op een door RLS tegengehouden
   PATCH niet met een fout. Hij raakt nul rijen en meldt 2xx —
   "gelukt, niets te melden". Voor een trainer die geen eigenaar is,
   of bij een policy die (nog) niet bestaat, is dat precies wat er
   gebeurt. De huidige code kijkt alleen naar r.ok, dus:

     · de gegevens-DELETE gaat evengoed door
     · de grafsteen wordt vergeten
     · het team staat vanaf dat moment nog gewoon op de server,
       terwijl dit apparaat denkt dat het weg is — en er is niets
       meer dat het ooit nog eens probeert

   Het enige antwoord is hetzelfde als bij hefClubOp(): vraag de
   geraakte rij terug (Prefer: return=representation) en behandel nul
   teruggekomen rijen als MISLUKT.

   Anders dan bij duwSeizoenenWeg() is nul rijen hier ondubbelzinnig
   een weigering. Bij een seizoen kan "nul rijen" betekenen dat er nooit
   iets van dat seizoen op de server heeft gestaan (zie de uitleg boven
   duwSeizoenenWeg() in src/kern/sync.js). Een team dat op de server
   bestaat is de voorwaarde om het daar te kunnen markeren: staat de rij
   er niet, dan is er ook nooit iets gesynchroniseerd en had er ook geen
   grafsteen naar de server gehoeven. Nul rijen is hier dus altijd
   "iemand hield dit tegen".

   ───────────────────────────────────────────────────────────────
   DEZE TEST HOORT NU ROOD TE ZIJN

   Geschreven op 18 september 2026 vóór de reparatie, met opzet. De
   scenario's onder ══ 1 ══ en ══ 2 ══ falen tegen de code van vandaag.
   Dat is het bewijs dat ze het gat echt vangen en niet alleen maar
   groen meekleuren. Na de reparatie hoort alles groen te zijn, en
   hoort het weer rood te worden zodra iemand return=representation of
   de lengtecontrole weghaalt.

   AANTONEN DAT DEZE TEST IETS VANGT
   Zet de controle in src/kern/sync.js om en draai opnieuw. Dat kan
   zonder de echte bron aan te raken, op een kopie:

       cp src/kern/sync.js /tmp/kapot.js
       # verander duwTeamsWeg in /tmp/kapot.js
       TT_SYNC=/tmp/kapot.js node tests/team-verwijderen-sync.test.js

   Daarvoor, en alleen daarvoor, staat TT_SYNC hieronder — net als
   TT_APP in tests/opheffen.test.js.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const SYNC = process.env.TT_SYNC || path.join(__dirname, "..", "src", "kern", "sync.js");
const regelsSync = fs.readFileSync(SYNC, "utf8").split("\n");
const SLEUTELS = path.join(__dirname, "..", "src", "kern", "sleutels.js");
const regelsSleutels = fs.readFileSync(SLEUTELS, "utf8").split("\n");

/* Zelfde knipper als in tests/sync.test.js: één functie, van zijn kop
   tot de eerste } op kolom 1, uit de opgegeven regelset. Knippen uit de
   bron en niet uit een kopie, zodat deze test omvalt zodra iemand
   duwTeamsWeg hernoemt of verplaatst. */
function knipUit(bronRegels, bronNaam, naam) {
  const kop = new RegExp("^function " + naam + "\\(");
  let a = -1;
  for (let i = 0; i < bronRegels.length; i++) if (kop.test(bronRegels[i])) { a = i; break; }
  if (a < 0) throw new Error(naam + " niet gevonden in " + bronNaam);
  let e = a; while (e < bronRegels.length && !/^\}/.test(bronRegels[e])) e++;
  return bronRegels.slice(a, e + 1).join("\n");
}
function knipSync(naam) { return knipUit(regelsSync, "src/kern/sync.js", naam); }
function knipSleutels(naam) { return knipUit(regelsSleutels, "src/kern/sleutels.js", naam); }

/* ── nagebootste browseropslag ─────────────────────────────── */
const kast = {};
global.localStorage = {
  get length() { return Object.keys(kast).length; },
  key: (i) => Object.keys(kast)[i] ?? null,
  getItem: (k) => (k in kast ? kast[k] : null),
  setItem: (k, v) => { kast[k] = String(v); },
  removeItem: (k) => { delete kast[k]; },
};

/* TEAMSWEG_KEY is een top-level const in sleutels.js, buiten het bereik
   van knipUit (die knipt op functies). Hardcoded overnemen, zoals
   tests/seizoen-verwijderen.test.js dat ook doet. */
const TEAMSWEG_KEY = "tt_teams_weg_v1";

/* De grafsteenfuncties komen echt uit sleutels.js — niet nagebootst.
   Of de grafsteen blijft staan is hier de hoofdvraag, en die vraag
   beantwoorden tegen een zelfgebouwd nepgrafsteentje zou niets waard
   zijn. */
eval([ "teamsWeg", "teamIsWeg", "noteerTeamWeg", "vergeetTeamWeg" ]
     .map(knipSleutels).join("\n"));

/* ── nagebootste server ────────────────────────────────────────
   Per verzoek een antwoord uit `antwoorden`, op volgorde. Zo is een
   geslaagde PATCH te combineren met een mislukte DELETE, en andersom.
   Raakt de lijst op, dan geldt `standaard`. */
let vragen = [];
let antwoorden = [];
let standaard = { ok: true, gegevens: [] };
function serverVraag(pad, opties) {
  vragen.push({ pad: pad, opties: opties || null });
  const a = antwoorden.length ? antwoorden.shift() : standaard;
  return Promise.resolve(a);
}

eval([ "opEenRij", "duwTeamsWeg" ].map(knipSync).join("\n"));

/* ── minimale testhulp ─────────────────────────────────────── */
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const leeg = () => {
  for (const k of Object.keys(kast)) delete kast[k];
  vragen = []; antwoorden = []; standaard = { ok: true, gegevens: [] };
};
const groep = (t) => console.log("\n" + t);
/* Welke verzoeken zijn er uitgegaan, kort opgeschreven. Handig om in
   één regel te zien of de gegevens-DELETE wel of niet is gedaan. */
const methodes = () => vragen.map((v) => (v.opties && v.opties.methode) || "GET");

/* Eén rij zoals PostgREST hem teruggeeft bij een geslaagde PATCH met
   Prefer: return=representation. */
const geraakteRij = (id) => ({ id: id, naam: "JO19-2", verwijderd_op: "2026-09-18T10:00:00.000Z" });

async function draai() {

/* ══ 1. het verzoek zelf ══ */
groep("het PATCH-verzoek aan de server");
leeg();
noteerTeamWeg("team-1");
antwoorden = [ { ok: true, gegevens: [geraakteRij("team-1")] },
               { ok: true, gegevens: [] } ];
await duwTeamsWeg();
ok("er gaan twee verzoeken uit: eerst de PATCH, dan de DELETE",
   methodes(), ["PATCH", "DELETE"]);
ok("de PATCH gaat naar de tabel teams, op dit ene team",
   vragen[0].pad, "/rest/v1/teams?id=eq.team-1");
ok("en hij vraagt de geraakte rij terug",
   vragen[0].opties.koppen && vragen[0].opties.koppen["Prefer"], "return=representation");
console.log("   ↑ dit is de kern. Met return=minimal antwoordt PostgREST met");
console.log("     204 en een lege body, en is 'gemarkeerd' niet te onderscheiden");
console.log("     van 'door RLS tegengehouden'. Zelfde val als bij hefClubOp().");
ok("er wordt wél een verwijderd_op meegestuurd",
   typeof (vragen[0].opties.lichaam || {}).verwijderd_op, "string");

leeg();
noteerTeamWeg("a+b/c");
antwoorden = [ { ok: true, gegevens: [geraakteRij("a+b/c")] },
               { ok: true, gegevens: [] } ];
await duwTeamsWeg();
ok("een team-id met rare tekens wordt gecodeerd in de PATCH",
   vragen[0].pad, "/rest/v1/teams?id=eq.a%2Bb%2Fc");
ok("en ook in de gegevens-DELETE",
   vragen[1].pad, "/rest/v1/gegevens?team_id=eq.a%2Bb%2Fc");

/* ══ 2. de kern: 2xx met nul rijen is MISLUKT ══ */
groep("de RLS-val — status 2xx, maar nul rijen geraakt");
console.log("   dit is wat een trainer die geen eigenaar is terugkrijgt:");
console.log("   de policy houdt de PATCH tegen, de status is 2xx, de lijst leeg");
leeg();
noteerTeamWeg("team-1");
antwoorden = [ { ok: true, gegevens: [] } ];   /* de geweigerde PATCH */
await duwTeamsWeg();
ok("de gegevens worden NIET verwijderd — er staat op de server nog een team bij",
   methodes(), ["PATCH"]);
ok("en de grafsteen blijft staan, voor een volgende poging",
   teamIsWeg("team-1"), true);
console.log("   die tweede is de belangrijkste: zonder grafsteen is er niets");
console.log("   meer dat het ooit nog eens probeert. Het team blijft dan stil");
console.log("   op de server staan terwijl de app denkt dat het weg is.");

leeg();
noteerTeamWeg("team-1");
antwoorden = [ { ok: true, gegevens: null } ];   /* een kale 204: geen body */
await duwTeamsWeg();
ok("een 204 zonder body telt net zo goed als mislukt", methodes(), ["PATCH"]);
ok("ook dan blijft de grafsteen staan", teamIsWeg("team-1"), true);

leeg();
noteerTeamWeg("team-1");
antwoorden = [ { ok: true, gegevens: "" } ];     /* body die geen lijst is */
await duwTeamsWeg();
ok("een antwoord dat geen lijst is telt ook als mislukt", methodes(), ["PATCH"]);
ok("en ook dan blijft de grafsteen staan", teamIsWeg("team-1"), true);

/* ══ 3. wél gelukt ══ */
groep("wél gelukt — de gemarkeerde rij komt terug");
leeg();
noteerTeamWeg("team-1");
antwoorden = [ { ok: true, gegevens: [geraakteRij("team-1")] },
               { ok: true, gegevens: [] } ];
const r = await duwTeamsWeg();
ok("nu pas worden de gegevens van het team weggegooid",
   methodes(), ["PATCH", "DELETE"]);
ok("en nu pas mag de grafsteen weg", teamIsWeg("team-1"), false);
ok("de functie meldt zich klaar", r, { ok: true });

/* ══ 4. een echte fout van de server ══ */
groep("een echte fout laat alles staan");
leeg();
noteerTeamWeg("team-1");
antwoorden = [ { ok: false, fout: { soort: "netwerk", tekst: "Geen verbinding." } } ];
await duwTeamsWeg();
ok("geen gegevens-DELETE na een netwerkfout", methodes(), ["PATCH"]);
ok("de grafsteen blijft staan", teamIsWeg("team-1"), true);

/* ══ 5. de gegevens-DELETE die zelf mislukt ══
   Zelfde familie als ══ 2 ══, en nu nog niet gedekt: de .then() achter
   de DELETE kijkt helemaal niet naar het antwoord. Mislukt die DELETE,
   dan verdwijnt de grafsteen evengoed en blijven de gegevens van het
   team voorgoed op de server staan — zonder dat er ooit nog iets is
   dat het opruimt. Dit is een aparte bevinding, gemeld aan Bas/Fenna
   naast de twee uit de opdracht. */
groep("de gegevens-DELETE mislukt — extra bevinding, zelfde familie");
leeg();
noteerTeamWeg("team-1");
antwoorden = [ { ok: true, gegevens: [geraakteRij("team-1")] },
               { ok: false, fout: { soort: "netwerk", tekst: "Geen verbinding." } } ];
await duwTeamsWeg();
ok("de grafsteen blijft staan zolang de gegevens er nog staan",
   teamIsWeg("team-1"), true);
console.log("   anders blijven de gegevens van een weggegooid team voorgoed");
console.log("   op de server staan, zonder dat iemand ze daar nog kan zien");

/* ══ 6. meerdere grafstenen ══ */
groep("meerdere weggegooide teams — één geweigerd, één gelukt");
leeg();
noteerTeamWeg("team-1");
noteerTeamWeg("team-2");
antwoorden = [ { ok: true, gegevens: [] },                       /* team-1: geweigerd */
               { ok: true, gegevens: [geraakteRij("team-2")] },  /* team-2: gelukt    */
               { ok: true, gegevens: [] } ];                     /* team-2: DELETE    */
await duwTeamsWeg();
ok("het geweigerde team houdt zijn grafsteen", teamIsWeg("team-1"), true);
ok("het gelukte team raakt hem kwijt", teamIsWeg("team-2"), false);
ok("er is precies één gegevens-DELETE gedaan",
   methodes().filter((m) => m === "DELETE").length, 1);

/* ══ 7. niets weg te duwen ══ */
groep("zonder grafstenen gebeurt er niets");
leeg();
const zonder = await duwTeamsWeg();
ok("geen enkel verzoek", vragen.length, 0);
ok("meldt zich toch keurig klaar", zonder, { ok: true });

}

/* ── uitslag ──────────────────────────────────────────────── */
draai().then(() => {
  console.log(`\n${goed} geslaagd, ${fout} gefaald`);
  process.exit(fout ? 1 : 0);
}, (e) => {
  console.log("\nDe test zelf liep vast: " + (e && e.stack || e));
  console.log(`\n${goed} geslaagd, ${fout + 1} gefaald`);
  process.exit(1);
});
