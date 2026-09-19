// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — praten met de eigen database, vanuit een edge function
//  ─────────────────────────────────────────────────────────────
//  WAAROM HIER GEEN @supabase/supabase-js STAAT
//
//  De gewone weg is `import { createClient } from "https://esm.sh/
//  @supabase/supabase-js@2"`. Dat is hier met opzet niet gedaan, om
//  drie redenen:
//
//    1. Een test zou dan bij het opstarten die hele bibliotheek van
//       internet halen. Precies wat je niet wilt bij een project waar
//       `node tests/…` het uitgangspunt is: een test hoort te draaien
//       op een laptop zonder verbinding.
//    2. Alles wat we nodig hebben zijn vijf HTTP-aanroepen. De
//       bibliotheek voegt daar niets aan toe behalve een versie die
//       kan verschuiven onder een functie die met geld omgaat.
//    3. Zo werkt Mollie hier ook al (zie _gedeeld/mollie.ts): fetch
//       als parameter, dus met een nagemaakte fetch volledig te
//       testen. Twee verschillende manieren van doen in één keten is
//       twee keer nadenken bij elke wijziging.
//
//  WIE PRAAT ER MET WELKE SLEUTEL — DIT IS HET BELANGRIJKSTE
//
//  · De sleutel van de GEBRUIKER (anon-sleutel + de Authorization-
//    header uit het inkomende verzoek). Daarmee gelden alle
//    rij-beveiligingsregels uit server/01-schema.sql gewoon. Dit is de
//    enige juiste manier om te vragen "mag jij dit?" — de vraag wordt
//    dan beantwoord door precies dezelfde regels als in de app.
//
//  · De SERVICE-sleutel. Die gaat overal langs. Alleen voor de twee
//    dingen die de gebruiker met opzet niet zelf mag: in
//    public.abonnementen kijken en schrijven (er is geen schrijfregel,
//    dat is het slot), en public.verwerk_betaling() aanroepen (twee
//    sloten, zie server/18-betalingen.sql DEEL 3).
//
//  De verleiding om overal de service-sleutel te gebruiken is groot
//  omdat hij altijd werkt. Dat is precies waarom hij gevaarlijk is:
//  wie de eigenaarscontrole daarmee doet, controleert niets meer.
// ══════════════════════════════════════════════════════════════

import type { Fetcher } from "./mollie.ts";

export class DatabaseFout extends Error {
  status: number;
  constructor(status: number, boodschap: string) {
    super(boodschap);
    this.name = "DatabaseFout";
    this.status = status;
  }
}

export interface Gebruiker {
  id: string;
  email?: string;
  naam?: string;
}

/* Wat een edge function van de database nodig heeft, en niets meer.
   De twee index.ts-bestanden werken tegen deze vorm, zodat een test er
   een nagemaakte versie voor in de plaats kan zetten zonder ook nog
   PostgREST-adressen te moeten nabootsen. */
export interface DbClient {
  /* Wie is de ingelogde gebruiker? Alleen zinvol op een client die met
     het token van die gebruiker is gemaakt. */
  gebruiker(): Promise<Gebruiker | null>;
  selecteer(tabel: string, vraag: Record<string, string>): Promise<Record<string, unknown>[]>;
  invoegen(tabel: string, rij: Record<string, unknown>): Promise<void>;
  bijwerken(
    tabel: string,
    vraag: Record<string, string>,
    velden: Record<string, unknown>,
  ): Promise<void>;
  rpc(naam: string, argumenten: Record<string, unknown>): Promise<unknown>;
}

export interface ClientOpties {
  url: string;
  sleutel: string;
  /* Het token van de ingelogde gebruiker, zoals het binnenkwam in de
     Authorization-header. Leeg laten = praten als de sleutel zelf. */
  jwt?: string;
  fetchFn?: Fetcher;
}

export function maakDbClient(opties: ClientOpties): DbClient {
  const basis = opties.url.replace(/\/+$/, "");
  const fetchFn = opties.fetchFn ?? fetch;

  function headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      "apikey": opties.sleutel,
      "Authorization": "Bearer " + (opties.jwt ?? opties.sleutel),
      "Content-Type": "application/json",
      ...extra,
    };
  }

  function queryTekst(vraag: Record<string, string>): string {
    const p = new URLSearchParams();
    for (const [naam, waarde] of Object.entries(vraag)) p.append(naam, waarde);
    const t = p.toString();
    return t ? "?" + t : "";
  }

  async function verstuur(
    methode: string,
    pad: string,
    body: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<{ status: number; data: unknown }> {
    let antwoord: Response;
    try {
      antwoord = await fetchFn(basis + pad, {
        method: methode,
        headers: headers(extraHeaders),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (_fout) {
      // Net als bij Mollie: de oorspronkelijke fout blijft hier, want
      // daar zit de aanvraag met de sleutel in.
      throw new DatabaseFout(503, "De database is niet bereikbaar");
    }
    let data: unknown = null;
    const tekst = await antwoord.text();
    if (tekst) {
      try {
        data = JSON.parse(tekst);
      } catch (_fout) {
        data = null;
      }
    }
    return { status: antwoord.status, data };
  }

  return {
    async gebruiker() {
      const { status, data } = await verstuur("GET", "/auth/v1/user", undefined);
      if (status === 401 || status === 403) return null;
      if (status < 200 || status >= 300) {
        throw new DatabaseFout(status, "Kon de ingelogde gebruiker niet ophalen");
      }
      const u = data as Record<string, unknown> | null;
      if (!u || typeof u.id !== "string") return null;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      return {
        id: u.id,
        email: typeof u.email === "string" ? u.email : undefined,
        naam: typeof meta.naam === "string"
          ? meta.naam
          : (typeof meta.full_name === "string" ? meta.full_name : undefined),
      };
    },

    async selecteer(tabel, vraag) {
      const { status, data } = await verstuur(
        "GET",
        "/rest/v1/" + tabel + queryTekst(vraag),
        undefined,
      );
      if (status < 200 || status >= 300) {
        throw new DatabaseFout(status, `Lezen uit ${tabel} lukte niet`);
      }
      return Array.isArray(data) ? data as Record<string, unknown>[] : [];
    },

    async invoegen(tabel, rij) {
      const { status } = await verstuur("POST", "/rest/v1/" + tabel, rij, {
        "Prefer": "return=minimal",
      });
      if (status < 200 || status >= 300) {
        throw new DatabaseFout(status, `Schrijven in ${tabel} lukte niet`);
      }
    },

    async bijwerken(tabel, vraag, velden) {
      const { status } = await verstuur(
        "PATCH",
        "/rest/v1/" + tabel + queryTekst(vraag),
        velden,
        { "Prefer": "return=minimal" },
      );
      if (status < 200 || status >= 300) {
        throw new DatabaseFout(status, `Bijwerken van ${tabel} lukte niet`);
      }
    },

    async rpc(naam, argumenten) {
      const { status, data } = await verstuur(
        "POST",
        "/rest/v1/rpc/" + naam,
        argumenten,
      );
      if (status < 200 || status >= 300) {
        // De boodschap van Postgres gaat met opzet NIET mee: daar staat
        // bij een fout in verwerk_betaling() bijvoorbeeld de rol van de
        // aanroeper in, en dat hoort niet in een antwoord aan buiten.
        throw new DatabaseFout(status, `De aanroep van ${naam} is mislukt`);
      }
      return data;
    },
  };
}
