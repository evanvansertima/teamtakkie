// ══════════════════════════════════════════════════════════════
//  TESTS — abonnement-opzeggen
//  ─────────────────────────────────────────────────────────────
//  Draaien met:
//      deno test supabase/functions/
//
//  WAAR HET HIER OM GAAT
//  1. Eerst Mollie, dan de database. Bij opzeggen én bij intrekken.
//     Gaat Mollie mis, dan verandert er in de database niets.
//  2. Intrekken start de nieuwe incasso OP DE EINDDATUM, niet vandaag.
//     Anders betaalt de club een periode dubbel.
//  3. Een half gelukte intrekking ruimt zichzelf op: een incasso bij
//     Mollie waar de database niets van weet, mag niet blijven bestaan.
//  4. De mail is een bijzaak. Een mislukte mail maakt een gelukte
//     opzegging niet ongedaan, en het antwoord zegt eerlijk of hij weg is.
// ══════════════════════════════════════════════════════════════

import {
  behandelOpzegging,
  type Bevestiging,
  bevestigingsTekst,
  type OpzegAfhankelijkheden,
  vandaagInNederland,
} from "./index.ts";
import { beoordeelOpzegging, beoordeelWissel, maakMollie, type WisselFeiten } from "../_gedeeld/mollie.ts";
import { type Aanroep, type DbAanroep, nepDb, nepMollie } from "../_gedeeld/nep.ts";
import { gelijk } from "../_gedeeld/bewering.ts";

const CLUB = "11111111-2222-3333-4444-555555555555";
const KLANT = "cst_kEn1PlbGa";
const SUB = "sub_8JfGzs6v3K";
const SUB_PAD = `/v2/customers/${KLANT}/subscriptions/${SUB}`;

// ── Het pure oordeel ─────────────────────────────────────────

function feiten(over: Partial<WisselFeiten> = {}): WisselFeiten {
  return {
    pakket: "coach",
    termijn: "maand",
    geldigTot: "2026-10-19",
    totaleDagen: 30,
    resterendeDagen: 11,
    mollieSubscriptionId: SUB,
    wisselOnderweg: false,
    opgezegd: false,
    ...over,
  };
}
const VANDAAG = "2026-10-08";

Deno.test("oordeel: een lopend betaald abonnement mag opzeggen", () => {
  gelijk(beoordeelOpzegging(feiten(), "opzeggen", VANDAAG).soort, "opzeggen");
});
Deno.test("oordeel: al opgezegd is een dubbelklik, geen fout", () => {
  const o = beoordeelOpzegging(feiten({ opgezegd: true }), "opzeggen", VANDAAG);
  gelijk([o.mag, o.soort], [true, "niets"]);
});
Deno.test("oordeel: free heeft niets om op te zeggen", () => {
  gelijk(beoordeelOpzegging(feiten({ pakket: "free" }), "opzeggen", VANDAAG).mag, false);
});
Deno.test("oordeel: onbeperkt (met de hand gezet) gaat via Evan", () => {
  gelijk(beoordeelOpzegging(feiten({ geldigTot: null }), "opzeggen", VANDAAG).mag, false);
});
Deno.test("oordeel: niet opzeggen midden in een overstap", () => {
  gelijk(beoordeelOpzegging(feiten({ wisselOnderweg: true }), "opzeggen", VANDAAG).mag, false);
});
Deno.test("oordeel: intrekken zonder opzegging is een dubbelklik", () => {
  gelijk(beoordeelOpzegging(feiten(), "intrekken", VANDAAG).soort, "niets");
});
Deno.test("oordeel: intrekken kan tot en met de einddatum, niet daarna", () => {
  const op = feiten({ opgezegd: true, geldigTot: VANDAAG });
  gelijk(beoordeelOpzegging(op, "intrekken", VANDAAG).soort, "intrekken", "op de einddatum zelf");
  gelijk(beoordeelOpzegging(op, "intrekken", "2026-10-09").mag, false, "de dag erna");
});
Deno.test("oordeel: intrekken met een onbekende termijn weigert in plaats van te raden", () => {
  const o = beoordeelOpzegging(feiten({ opgezegd: true, termijn: null }), "intrekken", VANDAAG);
  gelijk(o.mag, false);
});
Deno.test("wisselen na opzeggen kan niet, met een zin die zegt wat wel kan", () => {
  const o = beoordeelWissel(feiten({ opgezegd: true }), "club");
  gelijk(o.mag, false);
  gelijk(o.reden.includes("intrekken") || o.reden.includes("Trek"), true);
});

Deno.test("vandaag is de Nederlandse dag, niet de UTC-dag", () => {
  // 22:30 UTC op 7 oktober is in Nederland al 8 oktober (zomertijd).
  gelijk(vandaagInNederland(new Date("2026-10-07T22:30:00Z")), "2026-10-08");
});

Deno.test("de bevestigingsmail noemt de einddatum leesbaar en verder niets gevoeligs", () => {
  const m = bevestigingsTekst({
    soort: "opzeggen", naar: "e@x.nl", pakket: "coach", termijn: "maand", geldigTot: "2026-12-19",
  });
  gelijk(m.tekst.includes("tot en met 19 december 2026"), true);
  gelijk(m.tekst.includes("NL"), false, "geen rekeningnummer");
  gelijk(m.tekst.includes("e@x.nl"), false, "het adres hoort in de aanhef van de mail, niet in de tekst");
});

// ── De edge function ─────────────────────────────────────────

interface Opstelling {
  deps: OpzegAfhankelijkheden;
  mollieAanroepen: Aanroep[];
  dbAanroepen: DbAanroep[];
  tijdlijn: string[];
  mails: Bevestiging[];
  logboek: { bericht: string; velden: Record<string, unknown> }[];
}

function opstelling(o: {
  rij?: Record<string, unknown>;
  eigenaar?: boolean;
  mollieAntwoorden?: Record<string, { status?: number; body: unknown }>;
  faalBijwerken?: boolean;
  mailGooit?: boolean;
} = {}): Opstelling {
  const tijdlijn: string[] = [];
  const nepM = nepMollie(o.mollieAntwoorden ?? {
    ["DELETE " + SUB_PAD]: { body: { id: SUB, status: "canceled" } },
    [`POST /v2/customers/${KLANT}/subscriptions`]: { body: { id: "sub_nieuw999" } },
  });
  const fetchFn = ((invoer: string | URL | Request, opties?: RequestInit) => {
    tijdlijn.push("mollie " + (opties?.method ?? "GET").toUpperCase());
    return nepM.fetchFn(invoer, opties);
  }) as typeof fetch;

  const db = nepDb({
    gebruiker: { id: "u1", email: "penningmeester@club.test" },
    rijen: { leden: o.eigenaar === false ? [] : [{ rol: "eigenaar" }] },
    faal: (a) => (o.faalBijwerken && a.soort === "bijwerken" ? new Error("database plat") : null),
  });
  const rij = {
    pakket: "coach",
    termijn: "maand",
    geldig_tot: "2026-10-19",
    totale_dagen: 30,
    resterende_dagen: 11,
    mollie_klant_id: KLANT,
    mollie_subscription_id: SUB,
    wissel_onderweg: false,
    opgezegd: false,
    ...o.rij,
  };
  db.client.rpc = (naam, argumenten) => {
    db.aanroepen.push({ soort: "rpc", naam, argumenten });
    return Promise.resolve(naam === "wissel_gegevens" ? [rij] : null);
  };
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
      bevestig: (b) => {
        if (o.mailGooit) throw new Error("maildienst plat");
        mails.push(b);
        return Promise.resolve(true);
      },
      log: (bericht, velden) => logboek.push({ bericht, velden: velden ?? {} }),
      nu: () => new Date("2026-10-08T10:00:00Z"),
    },
  };
}

function verzoek(actie: string, extra: Record<string, unknown> = {}): Request {
  return new Request("https://x.test/functions/v1/abonnement-opzeggen", {
    method: "POST",
    headers: { "Authorization": "Bearer jwt-test", "Content-Type": "application/json" },
    body: JSON.stringify({ club_id: CLUB, actie, ...extra }),
  });
}

function bijwerkingen(op: Opstelling) {
  return op.dbAanroepen.filter((a) => a.soort === "bijwerken" && a.tabel === "abonnementen");
}

Deno.test("alleen de eigenaar mag opzeggen", async () => {
  const op = opstelling({ eigenaar: false });
  const a = await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(a.status, 403);
  gelijk(op.mollieAanroepen.length, 0);
  gelijk(bijwerkingen(op).length, 0);
});

Deno.test("opzeggen: eerst de incasso stoppen bij Mollie, dan pas de database", async () => {
  const op = opstelling();
  const a = await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(a.status, 200);
  const j = await a.json();
  gelijk([j.status, j.geldig_tot, j.mail], ["opgezegd", "2026-10-19", true]);

  gelijk(op.mollieAanroepen[0]?.methode, "DELETE");
  gelijk(op.mollieAanroepen[0]?.url, SUB_PAD);
  gelijk(op.tijdlijn, ["mollie DELETE", "db bijwerken abonnementen"]);

  // Leeg betekent: hier loopt geen incasso meer. Zie de uitleg bovenaan
  // index.ts — laten staan zou een latere nieuwe aankoop zonder
  // incasso achterlaten.
  gelijk(bijwerkingen(op)[0]?.velden, {
    opgezegd_op: "2026-10-08T10:00:00.000Z",
    mollie_subscription_id: null,
    mollie_bedrag_cent: null,
  });
});

Deno.test("opzeggen: lukt het bij Mollie niet, dan verandert er NIETS", async () => {
  const op = opstelling({
    mollieAntwoorden: {
      ["DELETE " + SUB_PAD]: { status: 500, body: {} },
      ["GET " + SUB_PAD]: { body: { id: SUB, status: "active" } },
    },
  });
  const a = await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(a.status, 502);
  gelijk(bijwerkingen(op).length, 0, "de app mag niet 'opgezegd' tonen terwijl er wordt afgeschreven");
  gelijk(op.mails.length, 0);
});

Deno.test("opzeggen: een incasso die bij Mollie al gestopt was telt als gelukt", async () => {
  // Bijvoorbeeld een tweede poging nadat de database de eerste keer
  // niet bereikbaar was.
  const op = opstelling({
    mollieAntwoorden: {
      ["DELETE " + SUB_PAD]: { status: 422, body: {} },
      ["GET " + SUB_PAD]: { body: { id: SUB, status: "canceled" } },
    },
  });
  const a = await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(a.status, 200);
  gelijk(bijwerkingen(op).length, 1);
});

Deno.test("opzeggen: een incasso die Mollie niet meer kent telt ook als gelukt", async () => {
  const op = opstelling({ mollieAntwoorden: { ["DELETE " + SUB_PAD]: { status: 404, body: {} } } });
  const a = await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(a.status, 200);
});

Deno.test("opzeggen: database plat na Mollie — eerlijke melding, geen 'gelukt'", async () => {
  const op = opstelling({ faalBijwerken: true });
  const a = await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(a.status, 502);
  gelijk((await a.json()).fout.includes("Probeer het nog een keer"), true);
  gelijk(op.mails.length, 0, "geen bevestiging van iets wat niet is vastgelegd");
});

Deno.test("opzeggen: twee keer tikken doet de tweede keer niets", async () => {
  const op = opstelling({ rij: { opgezegd: true, mollie_subscription_id: null } });
  const a = await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(a.status, 200);
  gelijk((await a.json()).status, "ongewijzigd");
  gelijk(op.mollieAanroepen.length, 0);
  gelijk(bijwerkingen(op).length, 0);
});

Deno.test("opzeggen: niet tijdens een lopende overstap (409)", async () => {
  const op = opstelling({ rij: { wissel_onderweg: true } });
  const a = await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(a.status, 409);
  gelijk(op.mollieAanroepen.length, 0);
});

Deno.test("opzeggen: de bevestiging gaat naar het adres van de eigenaar", async () => {
  const op = opstelling();
  await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(op.mails, [{
    soort: "opzeggen",
    naar: "penningmeester@club.test",
    pakket: "coach",
    termijn: "maand",
    geldigTot: "2026-10-19",
  }]);
});

Deno.test("opzeggen: een kapotte maildienst maakt de opzegging niet ongedaan", async () => {
  const op = opstelling({ mailGooit: true });
  const a = await behandelOpzegging(verzoek("opzeggen"), op.deps);
  gelijk(a.status, 200);
  const j = await a.json();
  gelijk([j.status, j.mail], ["opgezegd", false]);
});

Deno.test("intrekken: nieuwe incasso die OP DE EINDDATUM ingaat, dan pas de database", async () => {
  const op = opstelling({ rij: { opgezegd: true, mollie_subscription_id: null } });
  const a = await behandelOpzegging(verzoek("intrekken"), op.deps);
  gelijk(a.status, 200);
  gelijk((await a.json()).status, "ingetrokken");

  const nieuw = op.mollieAanroepen[0];
  gelijk(nieuw?.methode, "POST");
  gelijk(nieuw?.url, `/v2/customers/${KLANT}/subscriptions`);
  gelijk(nieuw?.body?.startDate, "2026-10-19", "niet vandaag: de periode tot de einddatum is al betaald");
  gelijk(nieuw?.body?.amount, { value: "6.99", currency: "EUR" });
  gelijk(nieuw?.body?.interval, "1 month");

  gelijk(op.tijdlijn, ["mollie POST", "db bijwerken abonnementen"]);
  gelijk(bijwerkingen(op)[0]?.velden, {
    opgezegd_op: null,
    mollie_subscription_id: "sub_nieuw999",
    mollie_bedrag_cent: 699,
  });
});

Deno.test("intrekken: het bedrag komt uit PRIJZEN, ook als de body iets anders zegt", async () => {
  const op = opstelling({ rij: { opgezegd: true, mollie_subscription_id: null, pakket: "club", termijn: "jaar" } });
  await behandelOpzegging(verzoek("intrekken", { bedrag_cent: 1 }), op.deps);
  gelijk(op.mollieAanroepen[0]?.body?.amount, { value: "490.00", currency: "EUR" });
  gelijk(op.mollieAanroepen[0]?.body?.interval, "12 months");
});

Deno.test("intrekken: lukt het bij Mollie niet, dan blijft de opzegging gewoon staan", async () => {
  const op = opstelling({
    rij: { opgezegd: true, mollie_subscription_id: null },
    mollieAntwoorden: { [`POST /v2/customers/${KLANT}/subscriptions`]: { status: 422, body: {} } },
  });
  const a = await behandelOpzegging(verzoek("intrekken"), op.deps);
  gelijk(a.status, 502);
  gelijk(bijwerkingen(op).length, 0);
});

Deno.test("intrekken: database plat na Mollie — de nieuwe incasso wordt meteen weer gestopt", async () => {
  const op = opstelling({
    rij: { opgezegd: true, mollie_subscription_id: null },
    faalBijwerken: true,
    mollieAntwoorden: {
      [`POST /v2/customers/${KLANT}/subscriptions`]: { body: { id: "sub_nieuw999" } },
      [`DELETE /v2/customers/${KLANT}/subscriptions/sub_nieuw999`]: { body: { status: "canceled" } },
    },
  });
  const a = await behandelOpzegging(verzoek("intrekken"), op.deps);
  gelijk(a.status, 502);
  gelijk(op.tijdlijn, ["mollie POST", "db bijwerken abonnementen", "mollie DELETE"]);
  gelijk(op.mollieAanroepen[1]?.url, `/v2/customers/${KLANT}/subscriptions/sub_nieuw999`);
});

Deno.test("intrekken na de einddatum: nee, en Mollie wordt niet gebeld", async () => {
  const op = opstelling({ rij: { opgezegd: true, mollie_subscription_id: null, geldig_tot: "2026-10-01" } });
  const a = await behandelOpzegging(verzoek("intrekken"), op.deps);
  gelijk(a.status, 400);
  gelijk(op.mollieAanroepen.length, 0);
});

Deno.test("een onbekende actie of club komt niet verder dan de voordeur", async () => {
  const op = opstelling();
  gelijk((await behandelOpzegging(verzoek("weggooien"), op.deps)).status, 400);
  const raar = new Request("https://x.test", {
    method: "POST",
    headers: { "Authorization": "Bearer jwt-test" },
    body: JSON.stringify({ club_id: "'; drop table", actie: "opzeggen" }),
  });
  gelijk((await behandelOpzegging(raar, op.deps)).status, 400);
  gelijk(op.dbAanroepen.length, 0);
});
