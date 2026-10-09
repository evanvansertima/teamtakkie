// ══════════════════════════════════════════════════════════════
//  TESTS — abonnement-herroepen (de herroepingsknop)
//  ─────────────────────────────────────────────────────────────
//  Draaien met:
//      deno test supabase/functions/
//
//  WAAR HET HIER OM GAAT
//  1. De 14 dagen, op de dag nauwkeurig, in Nederlandse tijd.
//  2. ALLES terug (besluit 9 oktober 2026), ook een overstap die binnen
//     die 14 dagen is betaald — en niets van een eerdere overeenkomst.
//  3. De volgorde: incasso stoppen → terugstorten → database. Gaat een
//     stap mis, dan staat er niets in de database wat niet waar is.
//  4. Wat al is teruggestort, gaat nooit nog een keer terug.
// ══════════════════════════════════════════════════════════════

import { behandelHerroepen, type HerroepAfhankelijkheden } from "./index.ts";
import { type Bevestiging } from "../_gedeeld/bevestiging.ts";
import { beoordeelHerroepen, type HerroepBetaling, maakMollie } from "../_gedeeld/mollie.ts";
import { type Aanroep, type DbAanroep, nepDb, nepMollie } from "../_gedeeld/nep.ts";
import { gelijk } from "../_gedeeld/bewering.ts";

const CLUB = "11111111-2222-3333-4444-555555555555";
const KLANT = "cst_kEn1PlbGa";
const SUB = "sub_8JfGzs6v3K";
const NU = new Date("2026-10-09T10:00:00Z");

// ── Het pure oordeel ─────────────────────────────────────────

function b(o: Partial<HerroepBetaling>): HerroepBetaling {
  return { id: "tr_a", betaaldOp: "2026-10-04T10:00:00Z", bedragCent: 699, alTerugCent: 0, eerste: true, ...o };
}

Deno.test("oordeel: binnen 14 dagen na de eerste aankoop mag het, en alles gaat terug", () => {
  const o = beoordeelHerroepen([b({})], NU);
  gelijk([o.mag, o.soort, o.bedragCent, o.tot], [true, "herroepen", 699, "2026-10-18"]);
});

Deno.test("oordeel: de 14e dag zelf telt nog mee, de 15e niet", () => {
  const koop = b({ betaaldOp: "2026-09-25T10:00:00Z" }); // + 14 = 9 oktober
  gelijk(beoordeelHerroepen([koop], NU).mag, true, "9 oktober is de laatste dag");
  gelijk(beoordeelHerroepen([koop], new Date("2026-10-09T22:30:00Z")).mag, false,
    "om half één 's nachts (Nederlandse tijd) is het 10 oktober");
});

Deno.test("oordeel: een overstap binnen de 14 dagen gaat ook terug, een oude overeenkomst niet", () => {
  const o = beoordeelHerroepen([
    b({ id: "tr_oud", betaaldOp: "2026-01-04T10:00:00Z", bedragCent: 699 }), // vorige overeenkomst
    b({ id: "tr_nieuw", betaaldOp: "2026-10-04T10:00:00Z", bedragCent: 699 }),
    b({ id: "tr_wissel", betaaldOp: "2026-10-06T10:00:00Z", bedragCent: 3500, eerste: false }),
  ], NU);
  gelijk(o.terug, [{ id: "tr_nieuw", bedragCent: 699 }, { id: "tr_wissel", bedragCent: 3500 }]);
  gelijk(o.bedragCent, 4199);
});

Deno.test("oordeel: wat al is teruggestort gaat niet nog eens terug", () => {
  const o = beoordeelHerroepen([b({ alTerugCent: 200 })], NU);
  gelijk(o.terug, [{ id: "tr_a", bedragCent: 499 }]);
  const alles = beoordeelHerroepen([b({ alTerugCent: 699 })], NU);
  gelijk([alles.mag, alles.soort], [true, "niets"]);
});

Deno.test("oordeel: zonder eerste aankoop (alleen verlengingen) valt er niets te herroepen", () => {
  gelijk(beoordeelHerroepen([b({ eerste: false })], NU).mag, false);
});

// ── De edge function ─────────────────────────────────────────

interface Opstelling {
  deps: HerroepAfhankelijkheden;
  mollieAanroepen: Aanroep[];
  dbAanroepen: DbAanroep[];
  tijdlijn: string[];
  mails: Bevestiging[];
  logboek: { bericht: string; velden: Record<string, unknown> }[];
}

function molliebetaling(id: string, o: Record<string, unknown> = {}) {
  return {
    id,
    status: "paid",
    mode: "test",
    paidAt: "2026-10-04T10:00:00+00:00",
    amount: { value: "6.99", currency: "EUR" },
    amountRefunded: { value: "0.00", currency: "EUR" },
    sequenceType: "first",
    ...o,
  };
}

function opstelling(o: {
  eigenaar?: boolean;
  mollieAntwoorden?: Record<string, { status?: number; body: unknown }>;
  betalingen?: Record<string, unknown>[];
  wisselOnderweg?: boolean;
  faalBijwerken?: boolean;
  mailLukt?: boolean;
} = {}): Opstelling {
  const tijdlijn: string[] = [];
  const nepM = nepMollie(o.mollieAntwoorden ?? {
    "GET /v2/payments/tr_a": { body: molliebetaling("tr_a") },
    "POST /v2/payments/tr_a/refunds": { body: { id: "re_1" } },
    [`DELETE /v2/customers/${KLANT}/subscriptions/${SUB}`]: { body: { status: "canceled" } },
  });
  const fetchFn = ((invoer: string | URL | Request, opties?: RequestInit) => {
    const url = typeof invoer === "string" ? invoer : invoer.toString();
    tijdlijn.push("mollie " + (opties?.method ?? "GET").toUpperCase() + " " + url.replace("https://api.mollie.com", ""));
    return nepM.fetchFn(invoer, opties);
  }) as typeof fetch;

  const db = nepDb({
    gebruiker: { id: "u1", email: "penningmeester@club.test" },
    rijen: {
      leden: o.eigenaar === false ? [] : [{ rol: "eigenaar" }],
      betalingen: o.betalingen ?? [{ mollie_betaling_id: "tr_a", betaald_op: "2026-10-04T10:00:00Z" }],
      abonnement_wissels: o.wisselOnderweg ? [{ id: "w1" }] : [],
      abonnementen: [{ pakket: "coach", termijn: "maand", mollie_klant_id: KLANT, mollie_subscription_id: SUB }],
    },
    faal: (a) => (o.faalBijwerken && a.soort === "bijwerken" ? new Error("database plat") : null),
  });
  const echtBijwerken = db.client.bijwerken.bind(db.client);
  db.client.bijwerken = async (tabel, vraag, velden) => {
    tijdlijn.push("db bijwerken " + tabel);
    await echtBijwerken(tabel, vraag, velden);
  };

  const mails: Bevestiging[] = [];
  const logboek: { bericht: string; velden: Record<string, unknown> }[] = [];
  return {
    mollieAanroepen: nepM.aanroepen,
    dbAanroepen: db.aanroepen,
    tijdlijn,
    mails,
    logboek,
    deps: {
      gebruikerClient: () => db.client,
      serviceClient: () => db.client,
      mollie: () => maakMollie("test_geheim", fetchFn),
      bevestig: (m) => {
        mails.push(m);
        return Promise.resolve(o.mailLukt !== false);
      },
      log: (bericht, velden) => logboek.push({ bericht, velden: velden ?? {} }),
      nu: () => NU,
    },
  };
}

function verzoek(actie: string, extra: Record<string, unknown> = {}): Request {
  return new Request("https://x.test/functions/v1/abonnement-herroepen", {
    method: "POST",
    headers: { "Authorization": "Bearer jwt-test", "Content-Type": "application/json" },
    body: JSON.stringify({ club_id: CLUB, actie, ...extra }),
  });
}
const schrijfacties = (op: Opstelling) => op.dbAanroepen.filter((a) => a.soort === "bijwerken");
const terugstortingen = (op: Opstelling) => op.mollieAanroepen.filter((a) => a.url.endsWith("/refunds"));

Deno.test("alleen de eigenaar mag herroepen", async () => {
  const op = opstelling({ eigenaar: false });
  gelijk((await behandelHerroepen(verzoek("herroepen"), op.deps)).status, 403);
  gelijk(op.mollieAanroepen.length, 0);
});

Deno.test("bekijken: zegt tot wanneer en hoeveel, en verandert niets", async () => {
  const op = opstelling();
  const a = await behandelHerroepen(verzoek("bekijken"), op.deps);
  gelijk(await a.json(), { mag: true, reden: "", tot: "2026-10-18", bedrag_cent: 699 });
  gelijk(schrijfacties(op).length, 0);
  gelijk(terugstortingen(op).length, 0);
  gelijk(op.mollieAanroepen.filter((x) => x.methode === "DELETE").length, 0);
});

Deno.test("herroepen: incasso stoppen, dan terugstorten, dan pas de database", async () => {
  const op = opstelling();
  const a = await behandelHerroepen(verzoek("herroepen"), op.deps);
  gelijk(a.status, 200);
  gelijk(await a.json(), { status: "herroepen", bedrag_cent: 699, mail: true });
  gelijk(op.tijdlijn, [
    "mollie GET /v2/payments/tr_a",
    `mollie DELETE /v2/customers/${KLANT}/subscriptions/${SUB}`,
    "mollie POST /v2/payments/tr_a/refunds",
    "db bijwerken abonnementen",
    "db bijwerken betalingen",
  ]);
  gelijk(terugstortingen(op)[0]?.body?.amount, { value: "6.99", currency: "EUR" }, "alles terug");
  gelijk(schrijfacties(op)[0]?.velden, {
    pakket: "free",
    termijn: null,
    geldig_tot: null,
    mollie_subscription_id: null,
    mollie_bedrag_cent: null,
    opgezegd_op: null,
    herroepen_op: "2026-10-09T10:00:00.000Z",
  });
  gelijk(schrijfacties(op)[1]?.velden, { status: "terugbetaald" });
});

Deno.test("herroepen: het bedrag komt van Mollie, niet uit de body", async () => {
  const op = opstelling();
  await behandelHerroepen(verzoek("herroepen", { bedrag_cent: 999999 }), op.deps);
  gelijk(terugstortingen(op)[0]?.body?.amount, { value: "6.99", currency: "EUR" });
});

Deno.test("herroepen: de verplichte bevestiging gaat naar de eigenaar, met het bedrag", async () => {
  const op = opstelling();
  await behandelHerroepen(verzoek("herroepen"), op.deps);
  gelijk(op.mails[0]?.soort, "herroepen");
  gelijk(op.mails[0]?.naar, "penningmeester@club.test");
  gelijk(op.mails[0]?.bedragCent, 699);
});

Deno.test("herroepen: lukt de mail niet, dan wel herroepen, maar luid in het logboek", async () => {
  const op = opstelling({ mailLukt: false });
  const a = await behandelHerroepen(verzoek("herroepen"), op.deps);
  gelijk((await a.json()).mail, false);
  gelijk(op.logboek.some((r) => r.bericht.includes("zonder verstuurde bevestiging")), true);
});

Deno.test("herroepen: lukt het stoppen niet, dan geen terugstorting en geen database", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      "GET /v2/payments/tr_a": { body: molliebetaling("tr_a") },
      [`DELETE /v2/customers/${KLANT}/subscriptions/${SUB}`]: { status: 500, body: {} },
      [`GET /v2/customers/${KLANT}/subscriptions/${SUB}`]: { body: { status: "active" } },
    },
  });
  gelijk((await behandelHerroepen(verzoek("herroepen"), op.deps)).status, 502);
  gelijk(terugstortingen(op).length, 0);
  gelijk(schrijfacties(op).length, 0);
});

Deno.test("herroepen: lukt het terugstorten niet, dan staat er niets in de database", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      "GET /v2/payments/tr_a": { body: molliebetaling("tr_a") },
      "POST /v2/payments/tr_a/refunds": { status: 422, body: {} },
      [`DELETE /v2/customers/${KLANT}/subscriptions/${SUB}`]: { body: { status: "canceled" } },
    },
  });
  gelijk((await behandelHerroepen(verzoek("herroepen"), op.deps)).status, 502);
  gelijk(schrijfacties(op).length, 0, "de app mag niet 'herroepen' tonen voor geld dat niet terug is");
  gelijk(op.mails.length, 0);
});

Deno.test("herroepen: al teruggestort (tweede poging) — niet nog eens, wel alsnog vastleggen", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      "GET /v2/payments/tr_a": {
        body: molliebetaling("tr_a", { amountRefunded: { value: "6.99", currency: "EUR" } }),
      },
      [`DELETE /v2/customers/${KLANT}/subscriptions/${SUB}`]: { status: 404, body: {} },
    },
  });
  const a = await behandelHerroepen(verzoek("herroepen"), op.deps);
  gelijk(a.status, 200);
  gelijk(terugstortingen(op).length, 0);
  gelijk(schrijfacties(op)[0]?.velden?.pakket, "free");
});

Deno.test("herroepen: niet tijdens een lopende overstap (409), en er gebeurt niets", async () => {
  const op = opstelling({ wisselOnderweg: true });
  gelijk((await behandelHerroepen(verzoek("herroepen"), op.deps)).status, 409);
  gelijk(terugstortingen(op).length, 0);
  gelijk(schrijfacties(op).length, 0);
});

Deno.test("herroepen na 14 dagen: nee, en Mollie stort niets terug", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      "GET /v2/payments/tr_a": { body: molliebetaling("tr_a", { paidAt: "2026-09-20T10:00:00+00:00" }) },
    },
  });
  const a = await behandelHerroepen(verzoek("herroepen"), op.deps);
  gelijk(a.status, 400);
  gelijk((await a.json()).fout.includes("14 dagen"), true);
  gelijk(terugstortingen(op).length, 0);
});

Deno.test("een onbekende actie komt niet verder dan de voordeur", async () => {
  const op = opstelling();
  gelijk((await behandelHerroepen(verzoek("weggooien"), op.deps)).status, 400);
  gelijk(op.dbAanroepen.length, 0);
});
