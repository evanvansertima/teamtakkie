// ══════════════════════════════════════════════════════════════
//  TESTS — de gedeelde Mollie-hulpfuncties
//  ─────────────────────────────────────────────────────────────
//  Draaien met:
//      deno test supabase/functions/
//
//  Geen framework, net als in tests/*.test.js met kale node: Deno heeft
//  een testrunner ingebouwd en daar is niets bij nodig.
// ══════════════════════════════════════════════════════════════


import {
  bedragNaarCenten,
  BETAALNUMMER_VORM,
  centenNaarBedrag,
  GEEN_SLEUTEL_TEKST,
  maakMollie,
  mollieInterval,
  MollieFout,
  mollieSleutel,
  PRIJZEN,
  prijsCent,
  startDatumVolgendePeriode,
} from "./mollie.ts";
import { nepMollie } from "./nep.ts";
import { gelijk, klapt } from "./bewering.ts";

Deno.test("de prijzen komen letterlijk uit docs/pakketten-besluit.md", () => {
  gelijk(PRIJZEN.coach.maand, 699); // € 6,99
  gelijk(PRIJZEN.coach.jaar, 6990); // € 69,90
  gelijk(PRIJZEN.club.maand, 4900); // € 49,00
  gelijk(PRIJZEN.club.jaar, 49000); // € 490,00
  // Free staat er met opzet niet in: voor gratis wordt niet betaald.
  gelijk(PRIJZEN.free, undefined);
});

Deno.test("prijsCent kent alleen de vier bestaande combinaties", () => {
  gelijk(prijsCent("coach", "maand"), 699);
  gelijk(prijsCent("club", "jaar"), 49000);
  gelijk(prijsCent("free", "maand"), null);
  gelijk(prijsCent("coach", "week"), null);
  gelijk(prijsCent("PRO", "maand"), null);
  gelijk(prijsCent(null, "maand"), null);
  gelijk(prijsCent("coach", 1), null);
});

Deno.test("centen worden het tekstformaat dat Mollie wil", () => {
  gelijk(centenNaarBedrag(699), "6.99");
  gelijk(centenNaarBedrag(6990), "69.90");
  gelijk(centenNaarBedrag(4900), "49.00");
  gelijk(centenNaarBedrag(49000), "490.00");
});

Deno.test("en terug, zonder de bekende rekenfout met geld", () => {
  // Zonder Math.round zou de boekhouding er soms een fractie naast
  // zitten. Dat is niet bij elk bedrag te zien, en dat is precies het
  // verraderlijke: 6.99 * 100 is exact 699, maar 69.90 * 100 is
  // 6990.000000000001 en 0.29 * 100 is 28.999999999999996. Een test
  // met alleen de maandprijs van Coach zou deze fout dus nooit vangen;
  // daarom staan de andere drie erbij.
  gelijk(bedragNaarCenten("6.99"), 699);
  gelijk(bedragNaarCenten("69.90"), 6990);
  gelijk(bedragNaarCenten("0.29"), 29);
  gelijk(bedragNaarCenten("490.00"), 49000);
  gelijk(bedragNaarCenten("0.00"), 0);
  gelijk(bedragNaarCenten("onzin"), null);
  gelijk(bedragNaarCenten(null), null);
});

Deno.test("de vorm van een betaalnummer laat alleen tr_… door", () => {
  gelijk(BETAALNUMMER_VORM.test("tr_WDqYK6vllg"), true);
  gelijk(BETAALNUMMER_VORM.test("tr_abc"), false);        // te kort
  gelijk(BETAALNUMMER_VORM.test("cst_kEn1PlbGa"), false); // klant, geen betaling
  gelijk(BETAALNUMMER_VORM.test("tr_abc'; drop table"), false);
  gelijk(BETAALNUMMER_VORM.test(" tr_WDqYK6vllg"), false);
});

Deno.test("het interval voor Mollie Subscriptions", () => {
  gelijk(mollieInterval("maand"), "1 month");
  gelijk(mollieInterval("jaar"), "12 months");
  gelijk(mollieInterval("kwartaal"), null);
});

Deno.test("de incasso begint pas ná de periode die net betaald is", () => {
  // Zou startDate ontbreken of op vandaag staan, dan betaalt de club
  // twee keer voor dezelfde eerste maand.
  gelijk(startDatumVolgendePeriode(new Date("2026-09-19T10:00:00Z"), "maand"), "2026-10-19");
  gelijk(startDatumVolgendePeriode(new Date("2026-09-19T10:00:00Z"), "jaar"), "2027-09-19");
  // 31 januari + 1 maand bestaat niet; dat mag geen 3 maart worden.
  gelijk(startDatumVolgendePeriode(new Date("2026-01-31T10:00:00Z"), "maand"), "2026-02-28");
  gelijk(startDatumVolgendePeriode(new Date("2026-12-31T10:00:00Z"), "maand"), "2027-01-31");
});

Deno.test("zonder sleutel een eigen melding, geen kale crash", () => {
  const leeg = { get: (_n: string) => undefined };
  const fout = klapt(() => mollieSleutel(leeg));
  gelijk(fout instanceof MollieFout, true);
  gelijk((fout as MollieFout).code, "geen_sleutel");
  gelijk(fout.message, GEEN_SLEUTEL_TEKST);
  // Ook een lege of witruimte-sleutel telt niet als aangesloten.
  gelijk(klapt(() => mollieSleutel({ get: () => "   " })) instanceof MollieFout, true);
  gelijk(mollieSleutel({ get: () => "live_geheim" }), "live_geheim");
});

Deno.test("een betaling opvragen stuurt de sleutel mee naar het juiste adres", async () => {
  const nep = nepMollie({
    "GET /v2/payments/tr_WDqYK6vllg": { body: { id: "tr_WDqYK6vllg", status: "paid" } },
  });
  const mollie = maakMollie("test_geheim", nep.fetchFn);
  const betaling = await mollie.haalBetaling("tr_WDqYK6vllg");
  gelijk(betaling?.status, "paid");
  gelijk(nep.aanroepen.length, 1);
  gelijk(nep.aanroepen[0].methode, "GET");
  gelijk(nep.aanroepen[0].url, "/v2/payments/tr_WDqYK6vllg");
  gelijk(nep.aanroepen[0].authorization, "Bearer test_geheim");
});

Deno.test("404 van Mollie is geen fout maar een antwoord: niet van ons", async () => {
  const nep = nepMollie({
    "GET /v2/payments/tr_onbekend1": { status: 404, body: { status: 404, title: "Not Found" } },
  });
  const mollie = maakMollie("test_geheim", nep.fetchFn);
  gelijk(await mollie.haalBetaling("tr_onbekend1"), null);
});

Deno.test("een storing bij Mollie lekt niets naar boven", async () => {
  const nep = nepMollie({
    "GET /v2/payments/tr_WDqYK6vllg": {
      status: 500,
      // Stel dat Mollie in een foutmelding iets gevoeligs teruggeeft.
      body: { title: "Fout", detail: "sleutel live_geheim ongeldig voor NL53INGB0654422370" },
    },
  });
  const mollie = maakMollie("live_geheim", nep.fetchFn);
  let boodschap = "";
  try {
    await mollie.haalBetaling("tr_WDqYK6vllg");
  } catch (f) {
    boodschap = (f as Error).message;
  }
  gelijk(boodschap, "Mollie antwoordde met status 500 op /payments/{id}");
  gelijk(boodschap.includes("live_geheim"), false);
  gelijk(boodschap.includes("NL53INGB"), false);
});

Deno.test("een klant zonder naam en e-mail stuurt geen lege velden mee", async () => {
  const nep = nepMollie({ "POST /v2/customers": { body: { id: "cst_nieuw12345" } } });
  const mollie = maakMollie("test_geheim", nep.fetchFn);
  const klant = await mollie.maakKlant({});
  gelijk(klant.id, "cst_nieuw12345");
  gelijk(nep.aanroepen[0].body, {});
});
