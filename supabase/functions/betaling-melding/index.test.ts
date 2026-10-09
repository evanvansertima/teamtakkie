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
  // De termijn volgt uit het afgeschreven bedrag (€ 6,99 = een maand),
  // niet uit de vorige betaling (die was "jaar"). Anders levert de eerste
  // maandafschrijving na een jaaraankoop een heel jaar op.
  gelijk(rpc?.argumenten?.p_termijn, "maand");
});

Deno.test("een oude jaarincasso (van vóór 9 oktober) telt nog als een jaar", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: {
        body: nepBetaling({ metadata: null, amount: { value: "69.90", currency: "EUR" } }),
      },
    },
    rijen: {
      abonnementen: [{ club_id: CLUB, pakket: "coach", mollie_subscription_id: "sub_8JfGzs6v3K" }],
      betalingen: [{ pakket: "coach", termijn: "maand" }],
    },
  });
  await behandelMelding(melding(BETALING), op.deps);
  const rpc = op.dbAanroepen.find((a) => a.soort === "rpc");
  gelijk(rpc?.argumenten?.p_termijn, "jaar");
});

Deno.test("een verlenging NA opzeggen maakt GEEN nieuwe incasso", async () => {
  // Na opzeggen is het abonnementsnummer leeg. Een SEPA-incasso die al
  // onderweg was kan dagen later toch nog binnenkomen. Die wordt gewoon
  // geboekt (er ís betaald), maar mag de opzegging niet ongedaan maken
  // door een nieuwe doorlopende incasso te starten.
  const op = opstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: { body: nepBetaling({ metadata: null }) },
      "POST /v2/customers/cst_kEn1PlbGa/subscriptions": { body: { id: "sub_ONGEWENST" } },
    },
    rijen: {
      abonnementen: [{ club_id: CLUB, pakket: "coach", mollie_subscription_id: null }],
      betalingen: [{ pakket: "coach", termijn: "maand" }],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);
  gelijk(op.dbAanroepen.filter((a) => a.soort === "rpc").length, 1, "de betaling zelf wordt wel geboekt");
  gelijk(op.mollieAanroepen.filter((a) => a.url.endsWith("/subscriptions")).length, 0);
  gelijk(
    op.dbAanroepen.filter((a) => a.soort === "bijwerken" && a.tabel === "abonnementen").length,
    0,
    "opgezegd_op blijft staan",
  );
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
  // opgezegd_op gaat in dezelfde schrijfactie leeg: een nieuwe incasso
  // ÍS het einde van een eerdere opzegging.
  gelijk(bewaard?.velden, { mollie_subscription_id: "sub_8JfGzs6v3K", opgezegd_op: null });
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

Deno.test("na een jaaraankoop begint de incasso over een jaar, en dan PER MAAND", async () => {
  // Besluit 9 oktober 2026 (Wet Van Dam, CBb 11 september 2026): na het
  // eerste jaar maandelijks opzegbaar, dus maandelijks afschrijven.
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
  gelijk(abo?.body?.interval, "1 month");
  gelijk(abo?.body?.amount, { value: "49.00", currency: "EUR" }, "het maandbedrag, niet € 490");
  gelijk(abo?.body?.startDate, "2027-09-19", "pas na het betaalde jaar");
  const bedrag = op.dbAanroepen.filter((a) => a.soort === "bijwerken" && a.tabel === "abonnementen")[1];
  gelijk(bedrag?.velden, { mollie_bedrag_cent: 4900 });
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

// ══════════════════════════════════════════════════════════════
//  9. DE ROUTERING BIJ EEN WISSEL VAN PAKKET
//  ─────────────────────────────────────────────────────────────
//  Een wisselbetaling ziet er bij Mollie precies zo uit als een
//  verlenging. Het enige echte onderscheid is de regel die wij zélf in
//  public.abonnement_wissels hebben klaargezet. Belandt zo'n melding
//  bij de gewone verwerk_betaling(), dan telt die er een hele periode
//  bij op — precies het stapelprobleem dat dit hele wisselwerk
//  repareert. Deze tests gaan over die kruising.
// ══════════════════════════════════════════════════════════════

/* Met opzet een ANDER club-id dan wat er in de metadata van de melding
   staat. Zo is aan de uitkomst te zien wélke van de twee de code echt
   gebruikt heeft — de claim (goed) of de melding (fout). */
const CLUB_CLAIM = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const WISSEL_ID = "99999999-8888-7777-6666-555555555555";
const PATCH_PAD = "/v2/customers/cst_kEn1PlbGa/subscriptions/sub_8JfGzs6v3K";

/* Zoals de metadata er bij een wissel uitziet (abonnement-wisselen
   stap 8). Pakket en termijn wijken hier bewust af van de claim in de
   tests hieronder: de metadata is nooit het bewijs. */
function wisselBetaling(over: Record<string, unknown> = {}): Record<string, unknown> {
  return nepBetaling({
    metadata: {
      club_id: CLUB,
      pakket: "coach",
      termijn: "maand",
      soort: "wissel",
      wissel_id: WISSEL_ID,
    },
    ...over,
  });
}

/* nepDb geeft altijd álle rijen van een tabel terug, ongeacht de
   vraag. Voor deze tests is dat te grof: of er wél of geen
   "afgerond_op is null" in de zoekopdracht staat is hier juist het
   punt. Deze schil doet daarom na wat PostgREST doet — eq. en is.null
   — zodat een verkeerd filter ook echt andere rijen oplevert en de
   test omvalt. */
function pastBijVraag(
  rij: Record<string, unknown>,
  vraag: Record<string, string>,
): boolean {
  return Object.entries(vraag ?? {}).every(([naam, waarde]) => {
    if (naam === "select" || naam === "limit" || naam === "order") return true;
    if (waarde === "is.null") return rij[naam] === null || rij[naam] === undefined;
    if (waarde.startsWith("eq.")) return String(rij[naam]) === waarde.slice(3);
    return true;
  });
}

interface WisselOpstelling extends Opstelling {
  /* Mollie-aanroepen en database-aanroepen door elkaar, op volgorde.
     Nodig omdat "eerst de incasso bij Mollie, dan pas het bedrag in de
     database" een volgorde is tussen twee verschillende buitenwerelden
     — met twee losse lijstjes is die volgorde niet te bewijzen. */
  tijdlijn: string[];
}

function wisselOpstelling(o: {
  mollieAntwoorden?: Record<string, { status?: number; body: unknown }>;
  rijen?: Record<string, Record<string, unknown>[]>;
  betaling?: Record<string, unknown>;
} = {}): WisselOpstelling {
  const tijdlijn: string[] = [];
  const nepM = nepMollie(o.mollieAntwoorden ?? {
    ["GET /v2/payments/" + BETALING]: { body: o.betaling ?? wisselBetaling() },
    ["PATCH " + PATCH_PAD]: { body: { id: "sub_8JfGzs6v3K" } },
  });
  const fetchFn = ((invoer: string | URL | Request, opties?: RequestInit) => {
    tijdlijn.push("mollie " + (opties?.method ?? "GET").toUpperCase());
    return nepM.fetchFn(invoer, opties);
  }) as typeof fetch;

  const db = nepDb({ rijen: o.rijen ?? {} });
  const echteSelecteer = db.client.selecteer.bind(db.client);
  db.client.selecteer = async (tabel, vraag) => {
    tijdlijn.push("db selecteer " + tabel);
    const rijen = await echteSelecteer(tabel, vraag);
    return rijen.filter((r) => pastBijVraag(r, vraag));
  };
  const echteBijwerken = db.client.bijwerken.bind(db.client);
  db.client.bijwerken = async (tabel, vraag, velden) => {
    tijdlijn.push("db bijwerken " + tabel + " " + Object.keys(velden).join(","));
    await echteBijwerken(tabel, vraag, velden);
  };
  const echteRpc = db.client.rpc.bind(db.client);
  db.client.rpc = async (naam, argumenten) => {
    tijdlijn.push("db rpc " + naam);
    return await echteRpc(naam, argumenten);
  };

  const logboek: { bericht: string; velden: Record<string, unknown> }[] = [];
  return {
    mollieAanroepen: nepM.aanroepen,
    dbAanroepen: db.aanroepen,
    logboek,
    tijdlijn,
    deps: {
      serviceClient: () => db.client,
      mollie: () => maakMollie("test_geheim", fetchFn),
      log: (bericht, velden) => logboek.push({ bericht, velden: velden ?? {} }),
      nu: () => new Date("2026-09-19T12:00:00Z"),
    },
  };
}

/* Een open claim (nog niet afgerond) die naar 'club' wijst. De termijn
   staat hier op 'maand' zodat het nieuwe incassobedrag € 49,00 is. */
function openClaim(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: WISSEL_ID,
    club_id: CLUB_CLAIM,
    naar_pakket: "club",
    termijn: "maand",
    afgerond_op: null,
    mollie_betaling_id: BETALING,
    ...over,
  };
}

/* De abonnementsrij van de vereniging UIT DE CLAIM. Het club_id hoort
   erbij: de code zoekt er met club_id=eq.… op, en zonder dat veld zou
   deze rij niet gevonden worden. */
function aboRij(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    club_id: CLUB_CLAIM,
    pakket: "club",
    mollie_subscription_id: "sub_8JfGzs6v3K",
    ...over,
  };
}

// ── 9a. De claim is de waarheid, de metadata niet ────────────

Deno.test("een wisselbetaling gaat naar verwerk_wissel_betaling(), met de waarden UIT DE CLAIM", async () => {
  const op = wisselOpstelling({
    rijen: {
      // Claim: club_id CLUB_CLAIM, naar 'club', per jaar.
      // Metadata van de melding: CLUB, 'coach', per maand.
      // Wat er in de aanroep terechtkomt, verraadt welke van de twee
      // de code gelooft.
      abonnement_wissels: [openClaim({ naar_pakket: "club", termijn: "jaar" })],
      abonnementen: [aboRij()],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);

  const rpc = op.dbAanroepen.find((a) => a.soort === "rpc");
  gelijk(rpc?.naam, "verwerk_wissel_betaling");
  gelijk(rpc?.argumenten?.p_club, CLUB_CLAIM, "club moet uit de claim komen");
  gelijk(rpc?.argumenten?.p_pakket, "club", "pakket moet uit de claim komen");
  gelijk(rpc?.argumenten?.p_termijn, "jaar", "termijn moet uit de claim komen");
  // En dit komt wél uit het antwoord van Mollie, want dat is het bewijs
  // van wat er betaald is.
  gelijk(rpc?.argumenten?.p_mollie_id, BETALING);
  gelijk(rpc?.argumenten?.p_bedrag_cent, 699);
  gelijk(rpc?.argumenten?.p_modus, "test");
  gelijk(rpc?.argumenten?.p_mollie_klant, "cst_kEn1PlbGa");

  // De gewone route mag hier nooit langskomen: die telt er een hele
  // periode bij op.
  gelijk(
    op.dbAanroepen.filter((a) => a.soort === "rpc" && a.naam === "verwerk_betaling").length,
    0,
  );
});

// ── 9b. Een herhaalde melding op een AFGERONDE claim ─────────

Deno.test("een tweede melding op een al afgeronde wissel blijft de wisselroute volgen", async () => {
  // Mollie herhaalt een melding tot hij een 200 krijgt. Zou de
  // zoekopdracht "afgerond_op is null" bevatten, dan vindt hij de claim
  // de tweede keer niet, belandt de melding bij verwerk_betaling() — en
  // die weigert een wissel-betaalnummer hard. Gevolg: Mollie blijft het
  // eeuwig proberen.
  const op = wisselOpstelling({
    rijen: {
      abonnement_wissels: [openClaim({ afgerond_op: "2026-09-19T11:00:00+00:00" })],
      abonnementen: [aboRij()],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);

  const rpc = op.dbAanroepen.find((a) => a.soort === "rpc");
  gelijk(rpc?.naam, "verwerk_wissel_betaling");
  gelijk(
    op.dbAanroepen.filter((a) => a.soort === "rpc" && a.naam === "verwerk_betaling").length,
    0,
    "een afgeronde wissel mag NOOIT bij de gewone verwerking uitkomen",
  );

  // En de reden waarom het werkt, apart vastgelegd: er staat met opzet
  // géén afgerond_op in de zoekopdracht.
  const zoek = op.dbAanroepen.find(
    (a) => a.soort === "selecteer" && a.tabel === "abonnement_wissels",
  );
  gelijk(zoek?.vraag?.mollie_betaling_id, "eq." + BETALING);
  gelijk(
    zoek?.vraag?.afgerond_op,
    undefined,
    "de wisselzoekopdracht mag niet op afgerond_op filteren",
  );
});

// ── 9c. Geen claim: gewoon de bestaande weg ──────────────────

Deno.test("een betaling zonder wisselclaim gaat gewoon naar verwerk_betaling()", async () => {
  const op = wisselOpstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: { body: nepBetaling() },
      "POST /v2/customers/cst_kEn1PlbGa/subscriptions": { body: { id: "sub_8JfGzs6v3K" } },
    },
    rijen: {
      abonnement_wissels: [],
      abonnementen: [{ club_id: CLUB, mollie_subscription_id: null }],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);
  const rpc = op.dbAanroepen.find((a) => a.soort === "rpc");
  gelijk(rpc?.naam, "verwerk_betaling");
  gelijk(rpc?.argumenten?.p_club, CLUB);
  gelijk(
    op.dbAanroepen.filter((a) => a.soort === "rpc" && a.naam === "verwerk_wissel_betaling")
      .length,
    0,
  );
});

// ── 9d. De incasso na een geslaagde wissel ───────────────────

Deno.test("na een doorgevoerde wissel wordt de LOPENDE incasso gewijzigd, niet een tweede aangemaakt", async () => {
  const op = wisselOpstelling({
    rijen: {
      abonnement_wissels: [openClaim()],
      // Het pakket staat er echt op 'club': de wissel is doorgevoerd.
      abonnementen: [aboRij()],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);

  const patch = op.mollieAanroepen.find((a) => a.methode === "PATCH");
  gelijk(patch?.url, PATCH_PAD);
  // € 49,00: de maandprijs van club uit PRIJZEN, niet het betaalde
  // verrekenbedrag van € 6,99.
  gelijk(patch?.body?.amount, { value: "49.00", currency: "EUR" });
  gelijk(patch?.body?.description, "TEAMTAKKIE club (per maand)");

  // Een tweede subscription zou betekenen dat Mollie elke maand twee
  // keer incasseert.
  gelijk(
    op.mollieAanroepen.filter((a) => a.methode === "POST").length,
    0,
    "er mag geen nieuwe subscription bijkomen",
  );

  const bedrag = op.dbAanroepen.find(
    (a) => a.soort === "bijwerken" && a.tabel === "abonnementen",
  );
  gelijk(bedrag?.velden, { mollie_bedrag_cent: 4900 });
  gelijk(bedrag?.vraag, { club_id: "eq." + CLUB_CLAIM });
});

Deno.test("een jaarwissel zet de incasso op het MAANDbedrag (de incasso loopt per maand)", async () => {
  // Besluit 9 oktober 2026: na een jaaraankoop loopt de incasso per
  // maand (doorlopendeIncasso). € 490 op een maandelijkse incasso zou
  // elke maand een jaarbedrag afschrijven.
  const op = wisselOpstelling({
    rijen: {
      abonnement_wissels: [openClaim({ termijn: "jaar" })],
      abonnementen: [aboRij()],
    },
  });
  await behandelMelding(melding(BETALING), op.deps);
  const patch = op.mollieAanroepen.find((a) => a.methode === "PATCH");
  gelijk(patch?.body?.amount, { value: "49.00", currency: "EUR" });
  const bedrag = op.dbAanroepen.find(
    (a) => a.soort === "bijwerken" && a.tabel === "abonnementen",
  );
  gelijk(bedrag?.velden, { mollie_bedrag_cent: 4900 });
});

// ── 9e. De wissel is NIET doorgevoerd ────────────────────────

Deno.test("is het pakket niet gewisseld (testmodus), dan blijft de incasso ongemoeid", async () => {
  const op = wisselOpstelling({
    rijen: {
      abonnement_wissels: [openClaim()],
      // Het pakket staat nog op het oude: verwerk_wissel_betaling()
      // heeft de betaling genegeerd (testmodus, of bedrag nul).
      abonnementen: [aboRij({ pakket: "coach" })],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);

  gelijk(
    op.mollieAanroepen.filter((a) => a.methode === "PATCH").length,
    0,
    "geen incassowijziging bij een niet-doorgevoerde wissel",
  );
  gelijk(
    op.dbAanroepen.filter((a) => a.soort === "bijwerken").length,
    0,
    "mollie_bedrag_cent blijft ongemoeid",
  );
  const regel = op.logboek.find((r) => r.bericht.includes("niet toegekend"));
  gelijk(regel?.velden, {
    betaling: BETALING,
    club_id: CLUB_CLAIM,
    pakket_nu: "coach",
  });
});

// ── 9f. De volgorde: eerst Mollie, dan pas het bedrag ────────

Deno.test("mollie_bedrag_cent wordt pas NA de bevestiging van Mollie weggeschreven", async () => {
  const op = wisselOpstelling({
    rijen: {
      abonnement_wissels: [openClaim()],
      abonnementen: [aboRij()],
    },
  });
  await behandelMelding(melding(BETALING), op.deps);
  const patch = op.tijdlijn.indexOf("mollie PATCH");
  const schrijf = op.tijdlijn.indexOf("db bijwerken abonnementen mollie_bedrag_cent");
  gelijk(patch >= 0, true, "er hoort een PATCH te zijn");
  gelijk(schrijf >= 0, true, "het bedrag hoort te worden weggeschreven");
  // Dit veld betekent "wat Mollie volgens ons afschrijft". Vooruitlopend
  // invullen maakt public.wissel_controle() waardeloos.
  gelijk(patch < schrijf, true, "de PATCH hoort vóór het wegschrijven te komen");
});

Deno.test("gaat de PATCH bij Mollie mis, dan wordt mollie_bedrag_cent NIET bijgewerkt", async () => {
  const op = wisselOpstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: { body: wisselBetaling() },
      ["PATCH " + PATCH_PAD]: { status: 503, body: { status: 503, title: "Service Unavailable" } },
    },
    rijen: {
      abonnement_wissels: [openClaim()],
      abonnementen: [aboRij()],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  // 500: Mollie biedt de melding opnieuw aan. De wissel zelf is al
  // geboekt en verwerk_wissel_betaling() doet de tweede keer niets meer.
  gelijk(antwoord.status, 500);
  gelijk(
    op.dbAanroepen.filter(
      (a) => a.soort === "bijwerken" && a.velden?.mollie_bedrag_cent !== undefined,
    ).length,
    0,
    "een storing bij de PATCH mag mollie_bedrag_cent niet raken",
  );
});

// ── 9g. Geen incassogegevens: melden, niet crashen ───────────

Deno.test("een geslaagde wissel zonder abonnementsnummer geeft een LET OP-regel, geen crash", async () => {
  const op = wisselOpstelling({
    rijen: {
      abonnement_wissels: [openClaim()],
      abonnementen: [aboRij({ mollie_subscription_id: null })],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);
  gelijk(op.mollieAanroepen.filter((a) => a.methode === "PATCH").length, 0);
  const regel = op.logboek.find((r) => r.bericht.startsWith("LET OP"));
  gelijk(regel?.velden, {
    betaling: BETALING,
    club_id: CLUB_CLAIM,
    incasso: "onbekend",
  });
});

Deno.test("een geslaagde wissel zonder klantnummer geeft een LET OP-regel, geen crash", async () => {
  const op = wisselOpstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: { body: wisselBetaling({ customerId: null }) },
      ["PATCH " + PATCH_PAD]: { body: { id: "sub_8JfGzs6v3K" } },
    },
    rijen: {
      abonnement_wissels: [openClaim()],
      abonnementen: [aboRij()],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);
  gelijk(op.mollieAanroepen.filter((a) => a.methode === "PATCH").length, 0);
  const regel = op.logboek.find((r) => r.bericht.startsWith("LET OP"));
  gelijk(regel?.velden?.incasso, "bekend");
  gelijk(
    op.dbAanroepen.filter((a) => a.soort === "bijwerken").length,
    0,
  );
});

// ── 9h. Een onvolledige claim ────────────────────────────────

Deno.test("een claim zonder pakket, termijn of club: 200 'wissel onvolledig', niets verwerkt", async () => {
  const gevallen: { naam: string; claim: Record<string, unknown>; betaling?: Record<string, unknown> }[] = [
    { naam: "geen naar_pakket", claim: openClaim({ naar_pakket: null }) },
    { naam: "onbekende termijn", claim: openClaim({ termijn: "kwartaal" }) },
    // abonnement_wissels.termijn is vrije tekst (server/20, DEEL 2):
    // bij een vereniging met onbeperkte toegang staat er 'onbekend'.
    // Daar valt niets over te verrekenen, en dat hoort hier te stoppen.
    { naam: "termijn 'onbekend'", claim: openClaim({ termijn: "onbekend" }) },
    {
      naam: "geen club, ook niet in de metadata",
      claim: openClaim({ club_id: null }),
      betaling: wisselBetaling({
        metadata: { pakket: "coach", termijn: "maand", soort: "wissel" },
      }),
    },
  ];
  for (const geval of gevallen) {
    const op = wisselOpstelling({
      betaling: geval.betaling,
      rijen: {
        abonnement_wissels: [geval.claim],
        abonnementen: [aboRij()],
      },
    });
    const antwoord = await behandelMelding(melding(BETALING), op.deps);
    gelijk(antwoord.status, 200, geval.naam);
    gelijk(await antwoord.text(), "wissel onvolledig", geval.naam);
    // Geen enkele aanroep die toch zou vastlopen — ook niet de gewone.
    gelijk(op.dbAanroepen.filter((a) => a.soort === "rpc").length, 0, geval.naam);
    gelijk(op.mollieAanroepen.filter((a) => a.methode === "PATCH").length, 0, geval.naam);
    const regel = op.logboek.find((r) => r.bericht.includes("onvolledige claim"));
    gelijk(regel !== undefined, true, geval.naam);
  }
});

// ── 9i. Een mislukte wisselbetaling geeft de claim vrij ──────

Deno.test("failed/canceled/expired MET wisselmetadata zet de claim op 'mislukt'", async () => {
  for (const status of ["failed", "canceled", "expired"]) {
    const op = wisselOpstelling({
      mollieAntwoorden: {
        ["GET /v2/payments/" + BETALING]: { body: wisselBetaling({ status }) },
      },
      rijen: { abonnement_wissels: [openClaim()] },
    });
    const antwoord = await behandelMelding(melding(BETALING), op.deps);
    gelijk(antwoord.status, 200, "bij status " + status);

    const zet = op.dbAanroepen.find(
      (a) => a.soort === "bijwerken" && a.tabel === "abonnement_wissels",
    );
    gelijk(zet?.vraag, { id: "eq." + WISSEL_ID }, "bij status " + status);
    gelijk(
      zet?.velden,
      { status: "mislukt", afgerond_op: "2026-09-19T12:00:00.000Z" },
      "bij status " + status,
    );
    // De claim vrijgeven is het enige dat hier mag gebeuren: geen
    // pakket, geen boeking, geen Mollie.
    gelijk(op.dbAanroepen.filter((a) => a.soort === "rpc").length, 0, "bij status " + status);
  }
});

Deno.test("een AL afgeronde claim wordt door een mislukte melding niet nog eens aangeraakt", async () => {
  // Hier telt "afgerond_op is null" juist wél: een wissel die al
  // geslaagd is mag niet achteraf op 'mislukt' komen te staan.
  const op = wisselOpstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: { body: wisselBetaling({ status: "failed" }) },
    },
    rijen: {
      abonnement_wissels: [openClaim({ afgerond_op: "2026-09-19T11:00:00+00:00" })],
    },
  });
  const antwoord = await behandelMelding(melding(BETALING), op.deps);
  gelijk(antwoord.status, 200);
  gelijk(op.dbAanroepen.filter((a) => a.soort === "bijwerken").length, 0);
});

Deno.test("'open' en 'pending' laten de claim met opzet staan", async () => {
  for (const status of ["open", "pending", "authorized"]) {
    const op = wisselOpstelling({
      mollieAntwoorden: {
        ["GET /v2/payments/" + BETALING]: { body: wisselBetaling({ status }) },
      },
      rijen: { abonnement_wissels: [openClaim()] },
    });
    const antwoord = await behandelMelding(melding(BETALING), op.deps);
    gelijk(antwoord.status, 200, "bij status " + status);
    // Onderweg is geen mislukking. Zou de claim hier vrijkomen, dan kon
    // dezelfde club een tweede wissel starten terwijl de eerste nog
    // loopt.
    gelijk(op.dbAanroepen.length, 0, "bij status " + status);
  }
});

// ── 9j. De strengere garantie voor het gewone geval ──────────

Deno.test("zonder wisselmetadata raakt een mislukte melding de database niet", async () => {
  // Dit adres staat open voor de hele wereld. Zonder deze voorfilter
  // kan iedereen met onzinmeldingen databasewerk uitlokken. De metadata
  // is hier géén bewijs — ze bepaalt alleen of het de moeite waard is
  // om het te vrágen.
  for (const status of ["failed", "canceled", "expired"]) {
    for (
      const meta of [
        null,
        { club_id: CLUB, pakket: "coach", termijn: "maand" },
        { soort: "gewoon" },
        { soort: "WISSEL" },
      ]
    ) {
      const op = wisselOpstelling({
        mollieAntwoorden: {
          ["GET /v2/payments/" + BETALING]: { body: nepBetaling({ status, metadata: meta }) },
        },
        rijen: { abonnement_wissels: [openClaim()] },
      });
      const antwoord = await behandelMelding(melding(BETALING), op.deps);
      const waar = status + " met metadata " + JSON.stringify(meta);
      gelijk(antwoord.status, 200, waar);
      gelijk(op.dbAanroepen.length, 0, waar);
    }
  }
});

// ── 9k. Het gewone pad: ook het incassobedrag komt erin ──────

Deno.test("na een eerste aankoop komen mollie_subscription_id en mollie_bedrag_cent apart binnen", async () => {
  const op = wisselOpstelling({
    mollieAntwoorden: {
      ["GET /v2/payments/" + BETALING]: { body: nepBetaling() },
      "POST /v2/customers/cst_kEn1PlbGa/subscriptions": { body: { id: "sub_8JfGzs6v3K" } },
    },
    rijen: {
      abonnement_wissels: [],
      abonnementen: [{ club_id: CLUB, mollie_subscription_id: null }],
    },
  });
  await behandelMelding(melding(BETALING), op.deps);

  const bijwerken = op.dbAanroepen.filter(
    (a) => a.soort === "bijwerken" && a.tabel === "abonnementen",
  );
  gelijk(bijwerken.length, 2, "twee losse stappen, geen samengevoegde aanroep");
  // De eerste blijft exact zoals de bestaande test hem kent: het
  // bestaan van de incasso is een ander feit dan het bedrag ervan, en
  // een mislukking van het tweede mag het eerste niet meenemen.
  gelijk(bijwerken[0]?.velden, { mollie_subscription_id: "sub_8JfGzs6v3K", opgezegd_op: null });
  gelijk(bijwerken[1]?.velden, { mollie_bedrag_cent: 699 });
  // Zonder deze tweede regel meldt public.wissel_controle() straks elke
  // gewone klant als "bedrag onbekend".
  const maak = op.tijdlijn.indexOf("mollie POST");
  const schrijf = op.tijdlijn.indexOf("db bijwerken abonnementen mollie_bedrag_cent");
  gelijk(maak >= 0 && maak < schrijf, true, "eerst bij Mollie, dan pas in de database");
});
