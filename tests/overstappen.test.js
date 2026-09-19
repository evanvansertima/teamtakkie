/* ══════════════════════════════════════════════════════════════
   Tests voor startOverstap() en het "onderweg"-briefje
   ─────────────────────────────────────────────────────────────
   Draaien:  node tests/overstappen.test.js

   Deze test knipt de betaalknop uit de app zelf (online/index.html,
   gebouwd uit src/schermen/instellingen.jsx) en draait hem tegen een
   nagebootste fetch. Geen bouwstap, geen testframework — node en
   verder niets.

   WAAR HET HIER OM GAAT

   1. WAT ER DE DEUR UIT GAAT. Naar betaling-starten mag precies drie
      dingen: club_id, pakket en termijn. Géén bedrag. Zou het bedrag
      van de app komen, dan is een clubabonnement van één cent een
      kwestie van de ontwikkelaarsconsole openen. De edge function
      zoekt de prijs zelf op (PRIJZEN in _gedeeld/mollie.ts) en heeft
      daar een eigen test voor; deze test bewaakt de kant die daarvóór
      komt — dat de app het bedrag niet eens noemt.

   2. WELK TOKEN ERMEE GAAT. Dit ene verzoek loopt niet door
      serverVraag() heen (zie de uitleg daarover in instellingen.jsx:
      serverVraag gooit bij een fout het antwoord van de server weg, en
      dan verandert "Alleen de eigenaar van de club kan een abonnement
      afsluiten" in "De server gaf een fout (403)"). Daarmee is het
      verversen van een verlopen token hier opnieuw opgeschreven, en
      dus ook opnieuw stuk te maken. Vandaar dat het hier nagemeten
      wordt: bijna verlopen token → eerst verversen, 401 → precies één
      nieuwe poging, en geen enkele poging als de aanmelding voorbij is.

   3. DAT DE FOUT VAN DE SERVER OVERKOMT. Een trainer die geen eigenaar
      is hoort te lezen dát hij geen eigenaar is, en niet "fout 403".
      Dat is het hele argument om buiten serverVraag() om te gaan; als
      die tekst hier sneuvelt, is de uitzondering nergens meer voor.

   4. HET BRIEFJE. Mollie komt terug op een vast adres zonder
      betaalnummer. Het briefje in localStorage is het enige wat de app
      daarna nog weet over wat er gekocht is. Een briefje van gisteren
      hoort stil op te ruimen: anders blijft het abonnementsblok "bezig
      met verwerken" tonen voor een betaling die nooit is afgemaakt.

   AANTONEN DAT DEZE TEST IETS VANGT
   Maak een kopie van de app kapot en draai hem daartegen — de echte
   app blijft dan ongemoeid:

       cp online/index.html /tmp/kapot.html
       # zet in /tmp/kapot.html bijv. bedrag_cent in de body van
       # _overstapVraag, of haal in _overstapFoutTekst de regel
       # "gegevens.fout" weg, of maak van de 401-herkansing er twee
       TT_APP=/tmp/kapot.html node tests/overstappen.test.js

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
/* En één const-regel. Die worden meegeknipt en niet hier overgetypt:
   zo zijn de naam van de opslagsleutel (tt_upgrade_onderweg_v1) en de
   houdbaarheid van het briefje dezelfde waarden als in de app, en niet
   een kopie die stilletjes uit de pas kan lopen.

   Het woord const wordt daarbij var: een const uit een eval() blijft
   binnen die eval hangen en is buiten onzichtbaar, waardoor de
   geknipte functies hem niet zouden zien. Dat kostte hier een half
   uur, want het valt niet op — zetUpgradeBriefje() vangt zijn eigen
   fouten af (localStorage kan vol zijn), dus het mislukte geruisloos.
   Alleen het sleutelwoord verandert; de naam en de waarde komen
   ongewijzigd uit de app. */
function knipConst(naam) {
  const kop = new RegExp("^const " + naam + " = ");
  for (let i = 0; i < regels.length; i++)
    if (kop.test(regels[i])) return regels[i].replace(/^const /, "var ");
  throw new Error("const " + naam + " niet gevonden in " + APP);
}

/* ── nagebootste omgeving ─────────────────────────────────────
   Alles wat de app om zich heen heeft, vervangen door iets dat
   opschrijft dát het is aangeroepen. */
const opslag = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(opslag, k) ? opslag[k] : null; },
  setItem: function (k, v) { opslag[k] = String(v); },
  removeItem: function (k) { delete opslag[k]; }
};

let serverIngesteld = true;
let aangemeld = true;
let clubId = "11111111-2222-3333-4444-555555555555";
let sessie = { token: "TOKEN-1", verlooptOp: Date.now() + 3600000 };
let verversLukt = true;
let verversAanroepen = 0;
let verzoeken = [];
/* De antwoorden die de nagebootste fetch achter elkaar teruggeeft. Een
   lijst, want de 401-herkansing heeft er twee nodig. */
let antwoorden = [];

function serverAan() { return serverIngesteld; }
function ingelogd() { return aangemeld; }
function clubIdNu() { return clubId; }
function sessieNu() { return sessie; }
function tokenVerlopen(s) { return !s || !s.verlooptOp || s.verlooptOp <= Date.now() + 60000; }
function verversAanmelding() {
  verversAanroepen++;
  if (!verversLukt) { sessie = null; return Promise.resolve({ ok: false }); }
  sessie = { token: "TOKEN-NIEUW", verlooptOp: Date.now() + 3600000 };
  return Promise.resolve({ ok: true });
}
function serverAdres(pad) { return "https://server.test" + pad; }
function serverKoppen(token) {
  return { "apikey": "sb_publishable_TEST", "Content-Type": "application/json",
           "Authorization": "Bearer " + token };
}
global.fetch = function (url, opties) {
  verzoeken.push({ url: url, opties: opties });
  const a = antwoorden.shift();
  if (!a) throw new Error("geen antwoord klaargezet voor verzoek " + verzoeken.length);
  if (a.netwerkfout) return Promise.reject(new Error(a.netwerkfout));
  return Promise.resolve({
    ok: a.status >= 200 && a.status < 300,
    status: a.status,
    text: function () { return Promise.resolve(a.lichaam === undefined ? "" : a.lichaam); }
  });
};

eval(knipConst("UPGRADE_KEY"));
eval(knipConst("UPGRADE_BRIEFJE_MAX_MS"));
eval(knip("upgradeBriefje"));
eval(knip("zetUpgradeBriefje"));
eval(knip("wisUpgradeBriefje"));
eval(knip("_overstapToken"));
eval(knip("_overstapFoutTekst"));
eval(knip("_overstapVraag"));
eval(knip("startOverstap"));

/* ── minimale testhulp ─────────────────────────────────────── */
let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` +
    (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};
const groep = (t) => console.log("\n" + t);
const leeg = () => {
  serverIngesteld = true; aangemeld = true;
  clubId = "11111111-2222-3333-4444-555555555555";
  sessie = { token: "TOKEN-1", verlooptOp: Date.now() + 3600000 };
  verversLukt = true; verversAanroepen = 0;
  verzoeken = []; antwoorden = [];
  Object.keys(opslag).forEach(function (k) { delete opslag[k]; });
};
const lichaamVan = (n) => JSON.parse(verzoeken[n].opties.body);
const kassa = "https://www.mollie.com/checkout/select-issuer/ideal/7UhSN1";
const gelukt = { status: 200, lichaam: JSON.stringify({ checkout_url: kassa }) };

async function draai() {

/* ══ 1. wat er de deur uit gaat ══ */
groep("het verzoek aan betaling-starten");
leeg();
antwoorden = [gelukt];
let r = await startOverstap("coach", "jaar");
ok("er gaat precies één verzoek uit", verzoeken.length, 1);
ok("naar de edge function betaling-starten",
   verzoeken[0].url, "https://server.test/functions/v1/betaling-starten");
ok("als POST", verzoeken[0].opties.method, "POST");
ok("de body bevat precies vier velden, en geen bedrag",
   Object.keys(lichaamVan(0)).sort(), ["club_id", "pakket", "termijn", "terug_oorsprong"]);
ok("met de club waar dit apparaat bij hoort",
   lichaamVan(0).club_id, "11111111-2222-3333-4444-555555555555");
ok("het gekozen pakket", lichaamVan(0).pakket, "coach");
ok("en de gekozen termijn", lichaamVan(0).termijn, "jaar");
console.log("   de prijs komt van de server (PRIJZEN in _gedeeld/mollie.ts);");
console.log("   wat hier ook in de body zou staan, doet daar niet mee");
console.log("   terug_oorsprong is alleen een voorstel: de server laat");
console.log("   alleen een vast lijstje adressen toe (zie betaling-starten),");
console.log("   dus dit veld kan nooit een omweg naar een vreemde site worden");
ok("de publieke sleutel gaat mee als apikey",
   !!verzoeken[0].opties.headers["apikey"], true);
ok("en het token van deze gebruiker als Authorization",
   verzoeken[0].opties.headers["Authorization"], "Bearer TOKEN-1");
ok("het adres van de kassa komt terug", r.kassa, kassa);
ok("als geslaagd", r.ok, true);

/* ══ 2. het token ══ */
groep("het token, en het verversen daarvan");
leeg();
antwoorden = [gelukt];
await startOverstap("club", "maand");
ok("een geldig token wordt niet onnodig ververst", verversAanroepen, 0);

leeg();
sessie = { token: "TOKEN-OUD", verlooptOp: Date.now() + 5000 };  /* binnen de marge */
antwoorden = [gelukt];
await startOverstap("club", "maand");
ok("een bijna verlopen token wordt eerst ververst", verversAanroepen, 1);
ok("en het níeuwe token gaat mee, niet het oude",
   verzoeken[0].opties.headers["Authorization"], "Bearer TOKEN-NIEUW");

leeg();
sessie = { token: "TOKEN-OUD", verlooptOp: Date.now() - 1000 };
verversLukt = false;
r = await startOverstap("club", "maand");
ok("lukt het verversen niet, dan gaat er niets naar de server", verzoeken.length, 0);
ok("en staat er een melding die zegt wat je moet doen",
   /opnieuw in/i.test(r.tekst), true);

leeg();
antwoorden = [{ status: 401, lichaam: JSON.stringify({ fout: "Niet ingelogd" }) }, gelukt];
r = await startOverstap("coach", "maand");
ok("een 401 onderweg levert precies één nieuwe poging op", verzoeken.length, 2);
ok("met het verse token",
   verzoeken[1].opties.headers["Authorization"], "Bearer TOKEN-NIEUW");
ok("en die poging telt gewoon", r.ok, true);
console.log("   één keer en niet eindeloos: anders blijft een app met een");
console.log("   ongeldig token in een kringetje draaien");

/* ══ 3. de fout van de server komt over ══ */
groep("wat er misging, in de woorden van de server zelf");
leeg();
antwoorden = [{ status: 403, lichaam: JSON.stringify(
  { fout: "Alleen de eigenaar van de club kan een abonnement afsluiten" }) }];
r = await startOverstap("coach", "maand");
ok("een 403 is geen geslaagde overstap", r.ok, false);
ok("en de tekst van de edge function komt er onverkort uit",
   r.tekst, "Alleen de eigenaar van de club kan een abonnement afsluiten");
console.log("   dít is de reden dat dit verzoek buiten serverVraag() om gaat:");
console.log("   daar zou hier \"De server gaf een fout (403)\" van overblijven");

leeg();
antwoorden = [{ status: 503, lichaam: JSON.stringify(
  { fout: "Betalen kan nog niet; we wachten op goedkeuring van Mollie." }) }];
r = await startOverstap("club", "jaar");
ok("ook het antwoord \"Mollie is er nog niet\" komt door",
   /Mollie/.test(r.tekst), true);

leeg();
antwoorden = [{ status: 500, lichaam: "" }];
r = await startOverstap("club", "jaar");
ok("zonder tekst van de server blijft het foutnummer over",
   /500/.test(r.tekst), true);
ok("maar nooit een lege melding", r.tekst.length > 20, true);

leeg();
antwoorden = [{ status: 200, lichaam: JSON.stringify({}) }];
r = await startOverstap("coach", "maand");
ok("een 200 zonder betaaladres telt als mislukt", r.ok, false);
console.log("   doorlopen alsof het gelukt is, levert hier een lege pagina op");

leeg();
antwoorden = [{ netwerkfout: "Failed to fetch" }];
r = await startOverstap("coach", "maand");
ok("een weggevallen verbinding wordt een melding, geen crash", r.ok, false);
ok("met de oorzaak erbij", /verbinding/i.test(r.tekst), true);

/* ══ 4. weigeren vóór er iets de deur uit gaat ══ */
groep("wanneer er niet eens een verzoek hoort te vertrekken");
leeg(); serverIngesteld = false;
r = await startOverstap("coach", "maand");
ok("zonder server: nette weigering", r.ok, false);
ok("en geen verzoek", verzoeken.length, 0);

leeg(); aangemeld = false;
r = await startOverstap("coach", "maand");
ok("zonder account: nette weigering", r.ok, false);
ok("en geen verzoek", verzoeken.length, 0);

leeg(); clubId = null;
r = await startOverstap("coach", "maand");
ok("zonder vereniging: nette weigering", r.ok, false);
ok("en geen verzoek", verzoeken.length, 0);
console.log("   de server zou deze drie ook weigeren; dit scheelt de gebruiker");
console.log("   alleen het wachten op dat antwoord");

/* ══ 5. het briefje ══ */
groep("het onderweg-briefje");
leeg();
ok("zonder briefje is er niets te melden", upgradeBriefje(), null);

zetUpgradeBriefje({ pakket: "coach", termijn: "jaar", vanaf: "free", op: Date.now() });
ok("het briefje staat onder de afgesproken sleutel",
   !!opslag["tt_upgrade_onderweg_v1"], true);
let b = upgradeBriefje();
ok("en komt er onveranderd uit", [b.pakket, b.termijn, b.vanaf], ["coach", "jaar", "free"]);

leeg();
zetUpgradeBriefje({ pakket: "club", termijn: "maand", vanaf: "coach",
                    op: Date.now() - (25 * 60 * 60 * 1000) });
ok("een briefje van gisteren telt niet meer", upgradeBriefje(), null);
ok("en wordt meteen opgeruimd", opslag["tt_upgrade_onderweg_v1"], undefined);
console.log("   anders blijft het abonnementsblok \"bezig met verwerken\" tonen");
console.log("   voor een betaling die nooit is afgemaakt");

leeg();
opslag["tt_upgrade_onderweg_v1"] = "{dit is geen json";
ok("een onleesbaar briefje levert niets op in plaats van een crash",
   upgradeBriefje(), null);

leeg();
zetUpgradeBriefje({ pakket: "coach", termijn: "maand", vanaf: "free", op: Date.now() });
wisUpgradeBriefje();
ok("en opruimen ruimt echt op", upgradeBriefje(), null);

/* ── uitslag ─────────────────────────────────────────────── */
console.log(`\n${goed} geslaagd, ${fout} gefaald`);
if (fout) process.exitCode = 1;

}

draai().catch((e) => { console.error(e); process.exitCode = 1; });
