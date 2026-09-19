// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — nagemaakte antwoorden van Mollie en van de database
//  ─────────────────────────────────────────────────────────────
//  WAAROM DIT BESTAAT
//  Evans Mollie-account is aangevraagd en nog niet goedgekeurd (19
//  september 2026). Er is dus geen sleutel om tegenaan te testen, ook
//  geen testsleutel. Zonder dit bestand zou er van de hele betaalketen
//  geen enkele regel te bewijzen zijn tot het moment dat er echt geld
//  langskomt — en dat is precies het verkeerde moment om erachter te
//  komen dat het bedrag verkeerd is.
//
//  WAT DIT WEL EN NIET BEWIJST — EERLIJK
//  WEL: dat ónze code het juiste bedrag verstuurt, de juiste vragen
//  stelt, de juiste statuscodes teruggeeft en niets lekt.
//  NIET: dat Mollie het ook zo terugstuurt als hier staat. De vorm van
//  de antwoorden hieronder is overgenomen uit Mollie's documentatie;
//  of die klopt, blijkt pas bij de eerste echte proef met de
//  testsleutel. Dat staat als openstaand punt in het verslag bij deze
//  opdracht.
//
//  Dit bestand wordt alleen door de tests gebruikt. Het gaat wel mee
//  bij een uitrol (het staat in _gedeeld), maar niets in de twee
//  functies importeert het, dus het draait nooit op productie.
// ══════════════════════════════════════════════════════════════

import type { DbClient, Gebruiker } from "./supabase.ts";

/* Één opgenomen aanroep naar Mollie: genoeg om te kunnen nakijken
   wélk adres is aangeroepen en wát er in de body stond. */
export interface Aanroep {
  methode: string;
  url: string;
  body: Record<string, unknown> | null;
  /* De Authorization-header, zodat een test kan controleren dat de
     sleutel echt wordt meegestuurd — en dat het de juiste is. */
  authorization: string;
}

export interface NepMollie {
  fetchFn: typeof fetch;
  aanroepen: Aanroep[];
}

/* Maakt een fetch die niet het internet op gaat, maar de antwoorden
   geeft die je meegeeft — per pad. De sleutel van het antwoordenboek
   is "METHODE pad", bijvoorbeeld "POST /v2/payments". */
export function nepMollie(
  antwoorden: Record<string, { status?: number; body: unknown }>,
): NepMollie {
  const aanroepen: Aanroep[] = [];
  const fetchFn = ((invoer: string | URL | Request, opties?: RequestInit) => {
    const url = typeof invoer === "string" ? invoer : invoer.toString();
    const pad = url.replace("https://api.mollie.com", "");
    const methode = (opties?.method ?? "GET").toUpperCase();
    let body: Record<string, unknown> | null = null;
    if (typeof opties?.body === "string") {
      try {
        body = JSON.parse(opties.body);
      } catch (_f) {
        body = null;
      }
    }
    const kop = (opties?.headers ?? {}) as Record<string, string>;
    aanroepen.push({
      methode,
      url: pad,
      body,
      authorization: kop["Authorization"] ?? "",
    });
    const sleutel = methode + " " + pad;
    const antwoord = antwoorden[sleutel];
    if (!antwoord) {
      // Een pad waar de test niet op gerekend had. Met opzet een harde
      // 500 en geen stilzwijgend leeg antwoord: anders slaagt een test
      // die per ongeluk een heel ander adres aanroept gewoon.
      return Promise.resolve(
        new Response(JSON.stringify({ fout: "geen nagemaakt antwoord voor " + sleutel }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(antwoord.body), {
        status: antwoord.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as typeof fetch;
  return { fetchFn, aanroepen };
}

// ── De database, nagemaakt ───────────────────────────────────

export interface DbAanroep {
  soort: "gebruiker" | "selecteer" | "invoegen" | "bijwerken" | "rpc";
  tabel?: string;
  vraag?: Record<string, string>;
  velden?: Record<string, unknown>;
  naam?: string;
  argumenten?: Record<string, unknown>;
}

export interface NepDbOpties {
  gebruiker?: Gebruiker | null;
  /* Wat selecteer() teruggeeft, per tabel. */
  rijen?: Record<string, Record<string, unknown>[]>;
  /* Laat een bepaalde stap mislukken, om te toetsen wat er dan gebeurt. */
  faal?: (aanroep: DbAanroep) => Error | null;
}

export interface NepDb {
  client: DbClient;
  aanroepen: DbAanroep[];
}

export function nepDb(opties: NepDbOpties = {}): NepDb {
  const aanroepen: DbAanroep[] = [];
  function let_op(aanroep: DbAanroep): void {
    aanroepen.push(aanroep);
    const fout = opties.faal?.(aanroep);
    if (fout) throw fout;
  }
  const client: DbClient = {
    // deno-lint-ignore require-await
    async gebruiker() {
      let_op({ soort: "gebruiker" });
      return opties.gebruiker ?? null;
    },
    // deno-lint-ignore require-await
    async selecteer(tabel, vraag) {
      let_op({ soort: "selecteer", tabel, vraag });
      return opties.rijen?.[tabel] ?? [];
    },
    // deno-lint-ignore require-await
    async invoegen(tabel, rij) {
      let_op({ soort: "invoegen", tabel, velden: rij });
    },
    // deno-lint-ignore require-await
    async bijwerken(tabel, vraag, velden) {
      let_op({ soort: "bijwerken", tabel, vraag, velden });
    },
    // deno-lint-ignore require-await
    async rpc(naam, argumenten) {
      let_op({ soort: "rpc", naam, argumenten });
      return null;
    },
  };
  return { client, aanroepen };
}

// ── Kant-en-klare antwoorden van Mollie ──────────────────────
//  De vorm komt uit de documentatie van Mollie. Alleen de velden die
//  wij lezen staan erin, plus een paar die er in het echt ook in zitten
//  zodat zichtbaar is dat we ze NIET gebruiken.

export function nepBetaling(
  overschrijf: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "tr_WDqYK6vllg",
    mode: "test",
    status: "paid",
    amount: { value: "6.99", currency: "EUR" },
    description: "TEAMTAKKIE coach (per maand)",
    customerId: "cst_kEn1PlbGa",
    paidAt: "2026-09-19T10:32:11+00:00",
    metadata: { club_id: "11111111-2222-3333-4444-555555555555", pakket: "coach", termijn: "maand" },
    // Deze twee staan er in het echt ook in en worden met opzet nergens
    // gelezen of gelogd: het zijn persoonsgegevens.
    details: { consumerName: "J. de Vries", consumerAccount: "NL53INGB0654422370" },
    _links: { checkout: { href: "https://www.mollie.com/checkout/issuer/select/ideal/7UhSN1zuXS" } },
    ...overschrijf,
  };
}
