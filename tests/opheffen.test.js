/* ══════════════════════════════════════════════════════════════
   Tests voor hefClubOp() in online/index.html
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/opheffen.test.js

   Deze test knipt hefClubOp uit de app zelf en draait hem tegen een
   nagebootste serverVraag(). Geen bouwstap, geen testframework —
   node en verder niets.

   WAAR HET HIER OM GAAT, EN WAAROM DEZE TEST BESTAAT

   Tot 15 september 2026 stond er op de tabel clubs geen enkele regel
   voor verwijderen. Een database die niet mág verwijderen weigert dat
   niet met een foutmelding: hij gooit er nul weg en PostgREST
   antwoordt met 204 — "gelukt, niets te melden". De app kreeg dus een
   keurig "gelukt" terug terwijl er niets gebeurde.

   Die val is niet weg nu de regel er wél is. Hij slaat precies zo toe
   bij een trainer die geen eigenaar is, want dan houdt de policy
   is_eigenaar() de verwijdering tegen en is het antwoord weer
   "geslaagd, nul rijen". Een simpele controle op "was de status 2xx?"
   is daarom niet genoeg en zal dat nooit worden.

   Het enige antwoord is: vraag de verwijderde rij terug (de kop
   Prefer: return=representation) en kijk of er echt iets in zit.
   Dat is wat deze test bewaakt:

     1. dat die kop daadwerkelijk meegaat
     2. dat nul teruggekomen rijen als MISLUKT geldt, ook bij 2xx
     3. dat er in dat geval niets lokaal wordt weggegooid — want de
        vereniging staat er dan gewoon nog

   AANTONEN DAT DEZE TEST IETS VANGT
   Zet de controle in online/index.html om (bijvoorbeeld door
   `if (!weg.length)` weg te halen of om te draaien) en draai deze test
   opnieuw: hij hoort rood te worden. Dat kan ook zonder de echte app
   aan te raken, op een kopie:

       cp online/index.html /tmp/kapot.html
       # haal in /tmp/kapot.html de regel `if (!weg.length) return ...` weg
       TT_APP=/tmp/kapot.html node tests/opheffen.test.js

   Daarvoor, en alleen daarvoor, staat TT_APP hieronder.
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const APP = process.env.TT_APP || path.join(__dirname, "..", "online", "index.html");
const regels = fs.readFileSync(APP, "utf8").split("\n");

/* Eén functie uit de app, van zijn kop tot de eerste } op kolom 1 */
function knip(naam) {
  const kop = new RegExp("^function " + naam + "\\(");
  let a = -1;
  for (let i = 0; i < regels.length; i++) if (kop.test(regels[i])) { a = i; break; }
  if (a < 0) throw new Error(naam + " niet gevonden in " + APP);
  let e = a; while (e < regels.length && !/^\}/.test(regels[e])) e++;
  return regels.slice(a, e + 1).join("\n");
}

/* ── nagebootste omgeving ──────────────────────────────────────
   Alles wat hefClubOp aanroept, vervangen door iets dat opschrijft
   dát het is aangeroepen. Zo is niet alleen te zien wat de functie
   teruggeeft, maar ook wat hij onderweg heeft aangeraakt — en dat is
   hier het halve verhaal: bij een geweigerde verwijdering hoort er
   lokaal niets te gebeuren. */
let clubId = "club-123";
let vragen = [];
let antwoord = { ok: true, gegevens: [] };
let gedaan = [];

function clubIdNu() { return clubId; }
function serverVraag(pad, opties) {
  vragen.push({ pad: pad, opties: opties || null });
  return Promise.resolve(antwoord);
}
function serverFout(soort, tekst) { return { ok: false, fout: { soort: soort, tekst: tekst } }; }
/* serverAfmelden() is de echte afmeldfunctie (src/kern/server.js): die
   ruimt zelf al lokaal op en verwijdert de sessie, zowel lokaal als bij
   Supabase. hefClubOp roept hem sinds 18 september 2026 aan in plaats
   van de sessie terug te zetten (zie ══ 3 ══ hieronder) -- vandaar dat
   deze test hem als geheel mockt, niet zijn losse onderdelen. */
function serverAfmelden() { gedaan.push("serverAfmelden"); return Promise.resolve({ok:true}); }

eval(knip("hefClubOp"));

/* ── minimale testhulp ─────────────────────────────────────── */
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const leeg = () => {
  clubId = "club-123"; vragen = []; gedaan = [];
  antwoord = { ok: true, gegevens: [] };
};
const groep = (t) => console.log("\n" + t);
/* Uitlezen zonder te struikelen. Draai je de controle in de app bewust
   om — en dat hoort iemand te doen, om te zien of deze test iets vangt —
   dan is er geen fout meer om te lezen. Een test die dán zelf omvalt
   meldt één probleem en verzwijgt de rest. */
const foutTekst = (r) => (r && r.fout && r.fout.tekst) || "";
const foutSoort = (r) => (r && r.fout && r.fout.soort) || "geen fout";

async function draai() {

/* ══ 1. het verzoek zelf ══ */
groep("het verzoek aan de server");
leeg();
antwoord = { ok: true, gegevens: [{ id: "club-123", naam: "FC Harlingen" }] };
await hefClubOp();
ok("er gaat precies één verzoek uit", vragen.length, 1);
ok("het is een DELETE", vragen[0].opties.methode, "DELETE");
ok("naar de tabel clubs, op deze ene club",
   vragen[0].pad, "/rest/v1/clubs?id=eq.club-123");
ok("en hij vraagt de verwijderde rij terug",
   vragen[0].opties.koppen && vragen[0].opties.koppen["Prefer"], "return=representation");
console.log("   zonder die kop antwoordt PostgREST met 204 en een lege body,");
console.log("   en is 'gelukt' niet van 'tegengehouden' te onderscheiden");

leeg();
clubId = "a+b/c";
antwoord = { ok: true, gegevens: [{ id: "a+b/c" }] };
await hefClubOp();
ok("een club-id met rare tekens wordt gecodeerd",
   vragen[0].pad, "/rest/v1/clubs?id=eq.a%2Bb%2Fc");

/* ══ 2. de kern: 2xx met nul rijen is MISLUKT ══ */
groep("de val van 15 september — geslaagd, maar nul rijen weg");
console.log("   dit is wat een niet-eigenaar terugkrijgt: de policy houdt");
console.log("   de verwijdering tegen, de status is 2xx, de lijst is leeg");
leeg();
antwoord = { ok: true, gegevens: [] };
let r = await hefClubOp();
ok("dat geldt als mislukt, niet als gelukt", r.ok, false);
ok("met een melding die zegt waar het waarschijnlijk aan ligt",
   /eigenaar/i.test(foutTekst(r)), true);
ok("en er wordt lokaal niets weggegooid", gedaan, []);
console.log("   die laatste is de belangrijkste: de vereniging staat er nog,");
console.log("   dus hoort dit apparaat er ook nog gewoon bij te staan");

leeg();
antwoord = { ok: true, gegevens: null };   /* een kale 204: geen body */
r = await hefClubOp();
ok("een 204 zonder body telt net zo goed als mislukt", r.ok, false);
ok("ook dan blijft alles lokaal staan", gedaan, []);

leeg();
antwoord = { ok: true, gegevens: "" };     /* body die geen lijst is */
r = await hefClubOp();
ok("een antwoord dat geen lijst is telt ook als mislukt", r.ok, false);

/* ══ 3. echt gelukt ══ */
groep("wél gelukt — de rij komt terug");
leeg();
antwoord = { ok: true, gegevens: [{ id: "club-123", naam: "FC Harlingen" }] };
r = await hefClubOp();
ok("dit geldt als gelukt", r.ok, true);
ok("en de verwijderde vereniging komt mee terug",
   (r.gegevens && r.gegevens.naam) || null, "FC Harlingen");
ok("nu pas wordt dit apparaat afgemeld",
   gedaan, ["serverAfmelden"]);
console.log("   een echte afmelding: Evan gaf aan dat teruggaan naar het");
console.log("   scherm 'Je vereniging' voelt als meteen een nieuwe moeten");
console.log("   beginnen — nu landt hij op het inlogscherm");

/* ══ 4. een echte fout van de server ══ */
groep("een echte fout blijft een echte fout");
leeg();
antwoord = { ok: false, fout: { soort: "server", tekst: "Er ging iets mis op de server." } };
r = await hefClubOp();
ok("die wordt doorgegeven zoals hij is", r.ok, false);
ok("en ook dan blijft alles lokaal staan", gedaan, []);

/* ══ 5. niets om op te heffen ══ */
groep("zonder vereniging valt er niets op te heffen");
leeg();
clubId = null;
r = await hefClubOp();
ok("het antwoord is een nette weigering", r.ok, false);
ok("met de reden erbij", foutSoort(r), "geen-club");
ok("en er gaat geen verzoek naar de server", vragen.length, 0);

/* ── uitslag ─────────────────────────────────────────────── */
console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;

}

draai().catch((e) => { console.error(e); process.exitCode = 1; });
