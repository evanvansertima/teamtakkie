// ══════════════════════════════════════════════════════════════
//  TESTS — betaling-starten
//  ─────────────────────────────────────────────────────────────
//  Draaien met:
//      deno test supabase/functions/
//
//  Er is geen Mollie-sleutel (Evan wacht op goedkeuring), dus Mollie
//  is hier nagemaakt — maar wel op het niveau van de HTTP-aanroep.
//  Daardoor bewijzen deze tests niet alleen dat onze code het juiste
//  doet, maar ook wát er precies naar Mollie zou zijn verstuurd.
//
//  DE BELANGRIJKSTE TEST STAAT ONDERAAN: een verzoek dat zelf een
//  bedrag meestuurt wordt genegeerd. Zonder die test is er geen bewijs
//  dat een abonnement van € 0,01 onmogelijk is.
// ══════════════════════════════════════════════════════════════


import { behandelStart, type StartAfhankelijkheden } from "./index.ts";
import { maakMollie, MollieFout } from "../_gedeeld/mollie.ts";
import { type Aanroep, type DbAanroep, nepDb, nepMollie } from "../_gedeeld/nep.ts";
import { gelijk } from "../_gedeeld/bewering.ts";

const CLUB = "11111111-2222-3333-4444-555555555555";
const IK = { id: "99999999-8888-7777-6666-555555555555", email: "evan@example.nl" };

/* De standaardantwoorden van Mollie voor een geslaagde start. */
const MOLLIE_OK = {
  "POST /v2/customers": { body: { id: "cst_nieuw12345" } },
  "POST /v2/payments": {
    body: {
      id: "tr_WDqYK6vllg",
      mode: "test",
      status: "open",
      amount: { value: "6.99", currency: "EUR" },
      _links: { checkout: { href: "https://www.mollie.com/checkout/select-issuer/ideal/7UhSN1" } },
    },
  },
};

interface Opstelling {
  deps: StartAfhankelijkheden;
  mollieAanroepen: Aanroep[];
  gebruikerAanroepen: DbAanroep[];
  serviceAanroepen: DbAanroep[];
  logboek: { bericht: string; velden: Record<string, unknown> }[];
}

function opstelling(o: {
  rol?: "eigenaar" | "trainer" | "kijker" | "geen";
  klantId?: string | null;
  abonnementBestaat?: boolean;
  mollieAntwoorden?: Record<string, { status?: number; body: unknown }>;
  geenSleutel?: boolean;
} = {}): Opstelling {
  const rol = o.rol ?? "eigenaar";
  const nepM = nepMollie(o.mollieAntwoorden ?? MOLLIE_OK);

  const gebruiker = nepDb({
    gebruiker: IK,
    // leden_lezen laat álle leden van je eigen clubs zien; de functie
    // filtert daarom zelf op gebruiker_id én rol. Hier doen we alsof
    // dat filter zijn werk deed: alleen een eigenaar krijgt een rij.
    rijen: { leden: rol === "eigenaar" ? [{ rol: "eigenaar" }] : [] },
  });

  const abonnementen = o.abonnementBestaat === false
    ? []
    : [{ mollie_klant_id: o.klantId ?? null }];
  const service = nepDb({
    rijen: {
      abonnementen,
      clubs: [{ naam: "FC Harlingen" }],
    },
  });

  const logboek: { bericht: string; velden: Record<string, unknown> }[] = [];

  return {
    mollieAanroepen: nepM.aanroepen,
    gebruikerAanroepen: gebruiker.aanroepen,
    serviceAanroepen: service.aanroepen,
    logboek,
    deps: {
      gebruikerClient: () => gebruiker.client,
      serviceClient: () => service.client,
      mollie: () => {
        if (o.geenSleutel) {
          throw new MollieFout("geen_sleutel", "Mollie is nog niet aangesloten");
        }
        return maakMollie("test_geheim", nepM.fetchFn);
      },
      webhookUrl: "https://xyz.supabase.co/functions/v1/betaling-melding",
      terugUrl: "https://app.teamtakkie.nl/?upgrade=terug",
      log: (bericht, velden) => logboek.push({ bericht, velden: velden ?? {} }),
    },
  };
}

function verzoek(body: unknown, kop = "Bearer nep.jwt.token"): Request {
  return new Request("https://xyz.supabase.co/functions/v1/betaling-starten", {
    method: "POST",
    headers: { "Authorization": kop, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── 1. Wie er niet over gaat, komt er niet in ────────────────

Deno.test("een trainer mag geen betaling voor de club starten", async () => {
  const op = opstelling({ rol: "trainer" });
  const antwoord = await behandelStart(
    verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }),
    op.deps,
  );
  gelijk(antwoord.status, 403);
  const inhoud = await antwoord.json();
  gelijk(inhoud.fout, "Alleen de eigenaar van de club kan een abonnement afsluiten");
  // En het belangrijkste: er is geen enkele aanroep naar Mollie gedaan.
  gelijk(op.mollieAanroepen.length, 0);
});

Deno.test("een kijker van een andere club ook niet", async () => {
  const op = opstelling({ rol: "geen" });
  const antwoord = await behandelStart(
    verzoek({ club_id: CLUB, pakket: "club", termijn: "jaar" }),
    op.deps,
  );
  gelijk(antwoord.status, 403);
  gelijk(op.mollieAanroepen.length, 0);
});

Deno.test("de eigenaarscontrole vraagt naar de eigen gebruiker én naar de rol", async () => {
  const op = opstelling({ rol: "eigenaar", klantId: "cst_kEn1PlbGa" });
  await behandelStart(verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }), op.deps);
  const vraag = op.gebruikerAanroepen.find((a) => a.tabel === "leden")?.vraag ?? {};
  // Zonder het filter op gebruiker_id zou een kijker de rij van de
  // eigenaar vinden en dus slagen. Dat filter is de test waard.
  gelijk(vraag.gebruiker_id, "eq." + IK.id);
  gelijk(vraag.rol, "eq.eigenaar");
  gelijk(vraag.club_id, "eq." + CLUB);
});

Deno.test("zonder inlogtoken gebeurt er niets", async () => {
  const op = opstelling();
  const antwoord = await behandelStart(
    verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }, ""),
    op.deps,
  );
  gelijk(antwoord.status, 401);
  gelijk(op.mollieAanroepen.length, 0);
  gelijk(op.gebruikerAanroepen.length, 0);
});

// ── 2. Onbekend pakket of termijn ────────────────────────────

Deno.test("een onbekend pakket geeft een nette fout, zonder Mollie te bellen", async () => {
  for (const poging of [
    { pakket: "max", termijn: "maand" },
    { pakket: "free", termijn: "maand" },
    { pakket: "coach", termijn: "week" },
    { pakket: "coach", termijn: "" },
    { pakket: "", termijn: "jaar" },
  ]) {
    const op = opstelling();
    const antwoord = await behandelStart(
      verzoek({ club_id: CLUB, ...poging }),
      op.deps,
    );
    gelijk(antwoord.status, 400);
    const inhoud = await antwoord.json();
    gelijk(inhoud.fout, "Onbekend pakket of onbekende termijn");
    gelijk(op.mollieAanroepen.length, 0);
  }
});

Deno.test("een club_id dat geen uuid is gaat nooit de database in", async () => {
  const op = opstelling();
  const antwoord = await behandelStart(
    verzoek({ club_id: "eq.*", pakket: "coach", termijn: "maand" }),
    op.deps,
  );
  gelijk(antwoord.status, 400);
  gelijk(op.gebruikerAanroepen.length, 0);
  gelijk(op.mollieAanroepen.length, 0);
});

// ── 3. Het bedrag komt van de server, nooit van de client ────

Deno.test("het bedrag komt uit PRIJZEN — coach per maand is € 6,99", async () => {
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  const antwoord = await behandelStart(
    verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }),
    op.deps,
  );
  gelijk(antwoord.status, 200);
  const betaling = op.mollieAanroepen.find((a) => a.url === "/v2/payments");
  gelijk(betaling?.body?.amount, { value: "6.99", currency: "EUR" });
});

Deno.test("en club per jaar is € 490,00", async () => {
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  await behandelStart(verzoek({ club_id: CLUB, pakket: "club", termijn: "jaar" }), op.deps);
  const betaling = op.mollieAanroepen.find((a) => a.url === "/v2/payments");
  gelijk(betaling?.body?.amount, { value: "490.00", currency: "EUR" });
});

Deno.test("EEN BEDRAG UIT DE BODY WORDT GENEGEERD", async () => {
  // Dit is het verzoek dat iemand met de ontwikkelaarsconsole zou
  // versturen: een clubabonnement voor één cent. Er staan hier vier
  // verschillende namen in, want wie dit probeert, probeert ze alle
  // vier.
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  const antwoord = await behandelStart(
    verzoek({
      club_id: CLUB,
      pakket: "club",
      termijn: "jaar",
      bedrag_cent: 1,
      bedrag: 1,
      amount: { value: "0.01", currency: "EUR" },
      prijs: "0.01",
    }),
    op.deps,
  );
  gelijk(antwoord.status, 200);
  const betaling = op.mollieAanroepen.find((a) => a.url === "/v2/payments");
  // Naar Mollie gaat de prijs uit de vaste lijst, niet die ene cent.
  gelijk(betaling?.body?.amount, { value: "490.00", currency: "EUR" });
  // En in de boekhouding komt hetzelfde bedrag te staan.
  const boeking = op.serviceAanroepen.find(
    (a) => a.soort === "invoegen" && a.tabel === "betalingen",
  );
  gelijk(boeking?.velden?.bedrag_cent, 49000);
});

// ── 4. De rest van de aanvraag bij Mollie ────────────────────

Deno.test("de aanvraag bij Mollie bevat alles wat de melding straks nodig heeft", async () => {
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  await behandelStart(verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }), op.deps);
  const body = op.mollieAanroepen.find((a) => a.url === "/v2/payments")?.body ?? {};
  gelijk(body.sequenceType, "first");
  gelijk(body.customerId, "cst_kEn1PlbGa");
  gelijk(body.method, "ideal");
  gelijk(body.webhookUrl, "https://xyz.supabase.co/functions/v1/betaling-melding");
  gelijk(body.redirectUrl, "https://app.teamtakkie.nl/?upgrade=terug");
  // Zonder deze metadata weet betaling-melding straks niet over welke
  // club het ging.
  gelijk(body.metadata, { club_id: CLUB, pakket: "coach", termijn: "maand" });
});

// ── Terug-oorsprong: ontdekt bij Evans eerste echte testbetaling ──
// (19 september 2026) toen een vaste terugkeer-URL hem vanaf
// localhost naar de live site stuurde, een ander origin met een
// andere sessie. Zie het commentaar bij TOEGESTANE_TERUG_OORSPRONGEN.

Deno.test("een toegestane terug_oorsprong wordt gebruikt in plaats van de standaard", async () => {
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  await behandelStart(
    verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand", terug_oorsprong: "http://localhost:8000" }),
    op.deps,
  );
  const body = op.mollieAanroepen.find((a) => a.url === "/v2/payments")?.body ?? {};
  gelijk(body.redirectUrl, "http://localhost:8000/?upgrade=terug");
});

Deno.test("een onbekende terug_oorsprong wordt genegeerd — geen open redirect", async () => {
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  await behandelStart(
    verzoek({
      club_id: CLUB,
      pakket: "coach",
      termijn: "maand",
      terug_oorsprong: "https://phishing-teamtakkie.evil.example",
    }),
    op.deps,
  );
  const body = op.mollieAanroepen.find((a) => a.url === "/v2/payments")?.body ?? {};
  // De standaard uit deps.terugUrl, niet het verzonnen adres.
  gelijk(body.redirectUrl, "https://app.teamtakkie.nl/?upgrade=terug");
});

Deno.test("zonder terug_oorsprong blijft de standaard gewoon gelden", async () => {
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  await behandelStart(verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }), op.deps);
  const body = op.mollieAanroepen.find((a) => a.url === "/v2/payments")?.body ?? {};
  gelijk(body.redirectUrl, "https://app.teamtakkie.nl/?upgrade=terug");
});

Deno.test("een club zonder klantnummer krijgt er één, en die wordt bewaard", async () => {
  const op = opstelling({ klantId: null });
  const antwoord = await behandelStart(
    verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }),
    op.deps,
  );
  gelijk(antwoord.status, 200);
  const klant = op.mollieAanroepen.find((a) => a.url === "/v2/customers");
  gelijk(klant?.methode, "POST");
  gelijk(klant?.body, { name: "FC Harlingen", email: IK.email });
  // En het nummer gaat terug de database in — met de service-sleutel,
  // want abonnementen heeft met opzet geen schrijfregel.
  const bewaard = op.serviceAanroepen.find(
    (a) => a.soort === "bijwerken" && a.tabel === "abonnementen",
  );
  gelijk(bewaard?.velden, { mollie_klant_id: "cst_nieuw12345" });
});

Deno.test("bestaat er nog geen abonnementsrij, dan wordt die aangemaakt", async () => {
  const op = opstelling({ abonnementBestaat: false });
  await behandelStart(verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }), op.deps);
  const nieuw = op.serviceAanroepen.find(
    (a) => a.soort === "invoegen" && a.tabel === "abonnementen",
  );
  // Met opzet alleen deze twee velden: een upsert met 'pakket' erin
  // zou een bestaand abonnement kunnen terugzetten naar free.
  gelijk(nieuw?.velden, { club_id: CLUB, mollie_klant_id: "cst_nieuw12345" });
});

Deno.test("een bestaand klantnummer levert geen tweede klant bij Mollie op", async () => {
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  await behandelStart(verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }), op.deps);
  gelijk(op.mollieAanroepen.filter((a) => a.url === "/v2/customers").length, 0);
});

// ── 5. De voorlopige boeking ─────────────────────────────────

Deno.test("de voorlopige boeking staat op 'open' en heeft de modus van Mollie", async () => {
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  await behandelStart(verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }), op.deps);
  const boeking = op.serviceAanroepen.find(
    (a) => a.soort === "invoegen" && a.tabel === "betalingen",
  );
  gelijk(boeking?.velden, {
    mollie_betaling_id: "tr_WDqYK6vllg",
    club_id: CLUB,
    club_naam: "FC Harlingen",
    mollie_klant_id: "cst_kEn1PlbGa",
    pakket: "coach",
    termijn: "maand",
    bedrag_cent: 699,
    valuta: "EUR",
    status: "open",
    // 'test' komt uit het antwoord van Mollie, niet uit iets wat wij
    // meesturen — zie 18-betalingen.sql DEEL 3, punt 2.
    modus: "test",
  });
});

// ── 6. Wat er teruggaat naar de browser ──────────────────────

Deno.test("terug komt alleen het adres van de kassa", async () => {
  const op = opstelling({ klantId: "cst_kEn1PlbGa" });
  const antwoord = await behandelStart(
    verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }),
    op.deps,
  );
  const inhoud = await antwoord.json();
  gelijk(Object.keys(inhoud), ["checkout_url"]);
  gelijk(inhoud.checkout_url, "https://www.mollie.com/checkout/select-issuer/ideal/7UhSN1");
});

Deno.test("een storing bij Mollie lekt niets naar de browser", async () => {
  const op = opstelling({
    klantId: "cst_kEn1PlbGa",
    mollieAntwoorden: {
      "POST /v2/payments": {
        status: 401,
        body: { detail: "sleutel live_abc123 ongeldig", account: "NL53INGB0654422370" },
      },
    },
  });
  const antwoord = await behandelStart(
    verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }),
    op.deps,
  );
  gelijk(antwoord.status, 502);
  const tekst = await antwoord.text();
  gelijk(tekst, JSON.stringify({ fout: "Betaling starten is niet gelukt" }));
  gelijk(tekst.includes("live_abc123"), false);
  gelijk(tekst.includes("NL53INGB"), false);
  // Ook in het logboek geen sleutel en geen rekeningnummer.
  const alleVelden = JSON.stringify(op.logboek);
  gelijk(alleVelden.includes("live_abc123"), false);
  gelijk(alleVelden.includes("NL53INGB"), false);
});

// ── 7. Zolang Mollie nog niet is aangesloten ─────────────────

Deno.test("zonder Mollie-sleutel een eigen melding, geen kale crash", async () => {
  const op = opstelling({ geenSleutel: true });
  const antwoord = await behandelStart(
    verzoek({ club_id: CLUB, pakket: "coach", termijn: "maand" }),
    op.deps,
  );
  gelijk(antwoord.status, 503);
  const inhoud = await antwoord.json();
  gelijk(inhoud.fout, "Mollie is nog niet aangesloten");
});
