// ══════════════════════════════════════════════════════════════
//  TESTS — betaling-melding (de Mollie-webhook)
//  ─────────────────────────────────────────────────────────────
//  Draaien met:
//      deno test supabase/functions/
//
//  Dit adres staat op productie open voor iedereen (verify_jwt = false,
//  want Mollie heeft geen account bij ons). De helft van deze tests
//  gaat daarom niet over een geslaagde betaling maar over wat er NIET
//  gebeurt bij een melding die niet deugt.
// ══════════════════════════════════════════════════════════════


import { behandelMelding, type MeldingAfhankelijkheden } from "./index.ts";
import { maakMollie, MollieFout } from "../_gedeeld/mollie.ts";
import { type Aanroep, type DbAanroep, nepBetaling, nepDb, nepMollie } from "../_gedeeld/nep.ts";
import { gelijk } from "../_gedeeld/bewering.ts";

const CLUB = "11111111-2222-3333-4444-555555555555";
const BETALING = "tr_WDqYK6vllg";

interface Opstelling {
  deps: MeldingAfhankelijkheden;
  mollieAanroepen: Aanroep[];
  dbAanroepen: DbAanroep[];
  logboek: { bericht: string; velden: Record<string, unknown> }[];
}

function opstelling(o: {
  mollieAntwoorden?: Record<string, { status?: number; body: unknown }>;
  rijen?: Record<string, Record<string, unknown>[]>;
  geenSleutel?: boolean;
  faal?: (a: DbAanroep) => Error | null;
} = {}): Opstelling {
  const nepM = nepMollie(o.mollieAntwoorden ?? {
    ["GET /v2/payments/" + BETALING]: { body: nepBetaling() },
    "POST /v2/customers/cst_kEn1PlbGa/subscriptions": { body: { id: "sub_8JfGzs6v3K" } },
  });
  const db = nepDb({
    rijen: o.rijen ?? { abonnementen: [{ mollie_subscription_id: null }] },
    faal: o.faal,
  });
  const logboek: { bericht: string; velden: Record<string, unknown> }[] = [];
  return {
    mollieAanroepen: nepM.aanroepen,
    dbAanroepen: db.aanroepen,
    logboek,
    deps: {
      serviceClient: () => db.client,
      mollie: () => {
        if (o.geenSleutel) {
          throw new MollieFout("geen_sleutel", "Mollie is nog niet aangesloten");
        }
        return maakMollie("test_geheim", nepM.fetchFn);
      },
      log: (bericht, velden) => logboek.push({ bericht, velden: velden ?? {} }),
      nu: () => new Date("2026-09-19T12:00:00Z"),
    },
  };
}

/* Mollie stuurt form-encoded, niet JSON. Deze helper doet dat na —
   wie hier per ongeluk JSON van maakt, test iets anders dan wat er in
   het echt binnenkomt. */
function melding(id: string): Request {
  const body = new URLSearchParams();
  body.set("id", id);
  return new Request("https://xyz.supabase.co/functions/v1/betaling-melding", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

// ── 1. De vormcontrole, vóór alles ───────────────────────────

Deno.test("een betaalnummer met de verkeerde vorm geeft 400 en belt Mollie niet", async () => {
  for (
    const onzin of [
      "",
      "tr_",
      "tr_abc",
      "cst_kEn1PlbGa",
      "sub_8JfGzs6v3K",
      "tr_x'; drop table betalingen; --",
      "../../v2/payments",
    ]
  ) {
    const op = opstelling();
    const antwoord = await behandelMelding(melding(onzin), op.deps);
    gelijk(antwoord.status, 400, "voor: " + onzin);
    // Dit is de hele reden dat de vormcontrole vooraan staat: dit adres
    // is voor iedereen bereikbaar, en duizend onzinmeldingen mogen geen
    // duizend aanvragen bij Mollie veroorzaken.
    gelijk(op.mollieAanroepen.length, 0, "voor: " + onzin);
    gelijk(op.dbAanroepen.length, 0, "voor: " + onzin);
  }
});

Deno.test("JSON in plaats van een formulier is geen geldige melding", async () => {
  const op = opstelling();
  const verzoek = new Request("https://xyz.supabase.co/functions/v1/betaling-melding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: BETALING }),
  });
  const antwoord = await behandelMelding(verzoek, op.deps);
  gelijk(antwoord.status, 400);
  gelijk(op.mollieAanroepen.length, 0);
});

// ── 2. Zelf navragen bij Mollie ──────────────────────────────

Deno.test("Mollie kent de betaling niet (404) — 200 terug, niets in de database", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: { status: 404, body: { status: 404, title: "Not Found" } },
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  // 200 en niet 500: opnieuw proberen verandert hier niets aan.
  gelijk(antwoord.status, 200);
  gelijk(op.dbAanroepen.length, 0);
});

Deno.test("de melding zelf wordt niet geloofd: het bedrag komt van Mollie", async () => {
  // Een aanvaller stuurt alleen "id=tr_…". Alles wat daarna gebeurt,
  // komt uit ons eigen antwoord van Mollie — inclusief het bedrag.
  const op = opstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: {
        body: nepBetaling({ amount: { value: "49.00", currency: "EUR" } }),
      },
      "POST /v2/customers/cst_kEn1PlbGa/subscriptions": { body: { id: "sub_8JfGzs6v3K" } },
    },
  });
  await behandelMelding(melding(BETALING), op.deps);
  const rpc = op.dbAanroepen.find((a) => a.soort === "rpc");
  gelijk(rpc?.argumenten?.p_bedrag_cent, 4900);
});

// ── 3. Niet-betaalde statussen ───────────────────────────────

Deno.test("elke status behalve 'paid' levert 200 op en raakt de database niet", async () => {
  for (const status of ["open", "canceled", "expired", "failed", "pending", "authorized"]) {
    const op = opstelling({
      mollieAntwoorden: {
        ["GET /v2/payments/" + BETALING]: { body: nepBetaling({ status }) },
      },
    });
    const antwoord = await behandelMelding(melding(BETALING), op.deps);
    gelijk(antwoord.status, 200, "bij status " + status);
    // Mollie meldt bij élke statuswijziging. Dat is normaal en geen
    // reden om een pakket toe te kennen.
    gelijk(op.dbAanroepen.length, 0, "bij status " + status);
  }
});

// ── 4. De geslaagde betaling ─────────────────────────────────

Deno.test("een betaalde betaling roept verwerk_betaling() aan met de juiste waarden", async () => {
  const op = opstelling();
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);

  const rpc = op.dbAanroepen.find((a) => a.soort === "rpc");
  gelijk(rpc?.naam, "verwerk_betaling");
  // De namen en de volgorde komen uit server/18-betalingen.sql DEEL 3.
  // p_bedrag_cent staat daar op plek zes en is verplicht; p_valuta
  // staat helemaal achteraan. Verschuift dat, dan boekt deze keten
  // stilletjes in de munteenheid "live" — de fout die daar beschreven
  // staat.
  gelijk(Object.keys(rpc?.argumenten ?? {}), [
    "p_mollie_id",
    "p_club",
    "p_pakket",
    "p_termijn",
    "p_betaald_op",
    "p_bedrag_cent",
    "p_modus",
    "p_mollie_klant",
    "p_valuta",
  ]);
  gelijk(rpc?.argumenten, {
    p_mollie_id: BETALING,
    p_club: CLUB,
    p_pakket: "coach",
    p_termijn: "maand",
    p_betaald_op: "2026-09-19T10:32:11+00:00",
    p_bedrag_cent: 699,
    p_modus: "test",
    p_mollie_klant: "cst_kEn1PlbGa",
    p_valuta: "EUR",
  });
});

Deno.test("de modus komt van Mollie, niet van ons", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: { body: nepBetaling({ mode: "live" }) },
      "POST /v2/customers/cst_kEn1PlbGa/subscriptions": { body: { id: "sub_8JfGzs6v3K" } },
    },
  });
  await behandelMelding(melding(BETALING), op.deps);
  const rpc = op.dbAanroepen.find((a) => a.soort === "rpc");
  gelijk(rpc?.argumenten?.p_modus, "live");
});

Deno.test("een andere munteenheid gaat mee zoals gemeld, zonder omrekenen", async () => {
  // Besluit van Evan, 19 september 2026 (18-betalingen.sql, vraag a):
  // opslaan zoals gemeld. Een bedrag in de verkeerde munt is later
  // nergens meer aan te zien.
  const op = opstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: {
        body: nepBetaling({ amount: { value: "7.50", currency: "USD" } }),
      },
      "POST /v2/customers/cst_kEn1PlbGa/subscriptions": { body: { id: "sub_8JfGzs6v3K" } },
    },
  });
  await behandelMelding(melding(BETALING), op.deps);
  const rpc = op.dbAanroepen.find((a) => a.soort === "rpc");
  gelijk(rpc?.argumenten?.p_valuta, "USD");
  gelijk(rpc?.argumenten?.p_bedrag_cent, 750);
});

// ── 5. Een verlenging, zonder metadata ───────────────────────

Deno.test("een verlenging zonder metadata wordt via het klantnummer gevonden", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: {
        body: nepBetaling({ metadata: null, id: BETALING }),
      },
    },
    rijen: {
      // Zo komt de club alsnog boven water: abonnementen.mollie_klant_id.
      abonnementen: [{ club_id: CLUB, pakket: "coach", mollie_subscription_id: "sub_8JfGzs6v3K" }],
      // En de termijn uit de laatste betaalde regel van dezelfde klant.
      betalingen: [{ pakket: "coach", termijn: "jaar" }],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);

  const zoek = op.dbAanroepen.find(
    (a) => a.soort === "selecteer" && a.tabel === "abonnementen",
  );
  gelijk(zoek?.vraag?.mollie_klant_id, "eq.cst_kEn1PlbGa");

  const rpc = op.dbAanroepen.find((a) => a.soort === "rpc");
  gelijk(rpc?.argumenten?.p_club, CLUB);
  gelijk(rpc?.argumenten?.p_pakket, "coach");
  gelijk(rpc?.argumenten?.p_termijn, "jaar");
});

Deno.test("een onbekend klantnummer: 200, niets verwerkt, wel gelogd", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: { body: nepBetaling({ metadata: null }) },
    },
    rijen: { abonnementen: [], betalingen: [] },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  // 200 en geen 500: Mollie opnieuw laten proberen helpt niet, er is
  // niets om te repareren.
  gelijk(antwoord.status, 200);
  gelijk(op.dbAanroepen.filter((a) => a.soort === "rpc").length, 0);

  const regel = op.logboek.find((r) => r.bericht.includes("onbekend klantnummer"));
  gelijk(regel?.velden, {
    betaling: BETALING,
    klant: "cst_kEn1PlbGa",
    status: "paid",
  });
});

// ── 6. De doorlopende incasso ────────────────────────────────

Deno.test("na de eerste betaling komt er een subscription bij Mollie", async () => {
  const op = opstelling();
  await behandelMelding(melding(BETALING), op.deps);
  const abo = op.mollieAanroepen.find((a) => a.url.endsWith("/subscriptions"));
  gelijk(abo?.methode, "POST");
  gelijk(abo?.url, "/v2/customers/cst_kEn1PlbGa/subscriptions");
  gelijk(abo?.body?.amount, { value: "6.99", currency: "EUR" });
  gelijk(abo?.body?.interval, "1 month");
  // Zonder startDate incasseert Mollie meteen, bovenop de betaling die
  // net gedaan is. De club betaalt dan twee keer voor dezelfde maand.
  gelijk(abo?.body?.startDate, "2026-10-19");

  const bewaard = op.dbAanroepen.find(
    (a) => a.soort === "bijwerken" && a.tabel === "abonnementen",
  );
  gelijk(bewaard?.velden, { mollie_subscription_id: "sub_8JfGzs6v3K" });
});

Deno.test("een tweede melding maakt GEEN tweede subscription", async () => {
  // Mollie stuurt een webhook opnieuw als het antwoord uitblijft. Zou
  // er dan een tweede subscription ontstaan, dan incasseert Mollie elke
  // maand twee keer — en dat merk je pas bij de eerste boze club.
  const op = opstelling({
    rijen: { abonnementen: [{ mollie_subscription_id: "sub_8JfGzs6v3K" }] },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);
  gelijk(op.mollieAanroepen.filter((a) => a.url.endsWith("/subscriptions")).length, 0);
});

Deno.test("een jaarabonnement krijgt het jaarinterval", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: {
        body: nepBetaling({
          amount: { value: "490.00", currency: "EUR" },
          metadata: { club_id: CLUB, pakket: "club", termijn: "jaar" },
        }),
      },
      "POST /v2/customers/cst_kEn1PlbGa/subscriptions": { body: { id: "sub_nieuw123" } },
    },
  });
  await behandelMelding(melding(BETALING), op.deps);
  const abo = op.mollieAanroepen.find((a) => a.url.endsWith("/subscriptions"));
  gelijk(abo?.body?.interval, "12 months");
  gelijk(abo?.body?.startDate, "2027-09-19");
});

// ── 7. Wat er misgaat ────────────────────────────────────────

Deno.test("een mislukte verwerking geeft 500, zodat Mollie het opnieuw aanbiedt", async () => {
  const op = opstelling({
    faal: (a) => (a.soort === "rpc" ? new Error("database plat") : null),
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 500);
  // En er is geen subscription aangemaakt bovenop een mislukte boeking.
  gelijk(op.mollieAanroepen.filter((a) => a.url.endsWith("/subscriptions")).length, 0);
});

Deno.test("zonder Mollie-sleutel: 500, zodat geen betaling verdwijnt", async () => {
  const op = opstelling({ geenSleutel: true });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  // Met opzet 500 en geen 200: zodra de sleutel er is, biedt Mollie de
  // melding opnieuw aan en wordt de betaling alsnog verwerkt.
  gelijk(antwoord.status, 500);
  gelijk(op.dbAanroepen.length, 0);
});

// ── 8. De logboek-eis van Veerle ─────────────────────────────

Deno.test("het logboek bevat nooit naam of rekeningnummer van de betaler", async () => {
  const op = opstelling();
  await behandelMelding(melding(BETALING), op.deps);
  const alles = JSON.stringify(op.logboek);
  // Deze twee staan wél in het antwoord van Mollie (zie nepBetaling)
  // en mogen nergens in een logregel belanden.
  gelijk(alles.includes("J. de Vries"), false);
  gelijk(alles.includes("NL53INGB0654422370"), false);
  gelijk(alles.includes("consumerName"), false);
  // Wat er wél in hoort te staan.
  const regel = op.logboek.find((r) => r.bericht === "betaling verwerkt");
  gelijk(regel?.velden, {
    betaling: BETALING,
    status: "paid",
    klant: "cst_kEn1PlbGa",
    club_id: CLUB,
  });
});
