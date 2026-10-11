// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — edge function "ai-trainer"
//  ─────────────────────────────────────────────────────────────
//  WAT DIT DOET
//  Een trainer vraagt in de app om een training ("60 minuten
//  positiespel voor JO11"). Deze functie vraagt Claude (Anthropic,
//  besluit van Evan op 11 oktober 2026) om een voorstel in een vast
//  formaat, controleert dat voorstel met precies dezelfde regels als de
//  app (_gedeeld/aitrainer.js, een kopie van src/domein/aitrainer.js),
//  vraagt bij fouten ÉÉN keer om een correctie, en geeft het resultaat
//  terug, met de meldingen die er dan nog zijn.
//
//  WAAROM VIA DE SERVER EN NIET RECHTSTREEKS VANUIT DE APP
//  De sleutel van Anthropic kost geld per gebruik. In de app zou
//  iedereen hem kunnen uitlezen. Hier staat hij als Supabase-geheim
//  (ANTHROPIC_API_KEY) en ziet niemand hem.
//
//  WIE MAG
//  Een trainer of eigenaar van een vereniging met Coach of Club
//  (mag_serverdata_schrijven, server/18-betalingen.sql) — gevraagd met
//  het token van de gebruiker zelf, dus door dezelfde regels als in de
//  app. Daarna de rem uit server/24-ai-gebruik.sql: één vraag tegelijk,
//  20 per 10 minuten.
//
//  WAT ER NAAR ANTHROPIC GAAT — EN WAT NIET
//  Alleen veiligeContext(): leeftijd, niveau, aantallen, duur, doel,
//  ruimte, materiaal. Plus de vraag van de trainer, waaruit e-mail-
//  adressen en telefoonnummers worden weggehaald; de app vraagt erbij
//  geen namen van spelers te typen. Nooit club-, team- of spelersnamen.
//  In het logboek staan alleen aantallen en tijden, nooit de inhoud.
//
//  verify_jwt blijft AAN (zie supabase/config.toml).
//
//  UITROLLEN (kan pas als server/24-ai-gebruik.sql gedraaid is én het
//  geheim ANTHROPIC_API_KEY in Supabase staat):
//      supabase functions deploy ai-trainer
// ══════════════════════════════════════════════════════════════

import {
  AI_TRAINING_SCHEMA,
  aiSysteemInstructie,
  controleerTraining,
  correctieVraag,
  veiligeContext,
} from "../_gedeeld/aitrainer.js";
import { type DbClient, maakDbClient } from "../_gedeeld/supabase.ts";

type Fetcher = typeof fetch;

const UUID_VORM =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const STANDAARD_MODEL = "claude-sonnet-5-5";
const MAX_VRAAG = 1500;
const MAX_ANTWOORD_TOKENS = 8000;
const TIJDSLIMIET_MS = 90_000;

export const NIET_BEREIKBAAR =
  "De AI-trainer is nu niet bereikbaar. Je opgeslagen trainingen staan gewoon in de bibliotheek.";

export interface AiAfhankelijkheden {
  gebruikerClient(jwt: string): DbClient;
  serviceClient(): DbClient;
  anthropicSleutel(): string;
  model(): string;
  fetchFn: Fetcher;
  log(bericht: string, velden?: Record<string, unknown>): void;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function antwoord(inhoud: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(inhoud), { status, headers: { "Content-Type": "application/json", ...CORS } });
}
function fout(tekst: string, status: number): Response {
  return antwoord({ fout: tekst }, status);
}

/* E-mailadressen en telefoonnummers uit de vraag halen. Namen kunnen
   we niet herkennen; daarom zegt de app erbij dat je ze niet typt, en
   zegt de instructie aan Claude dat hij ze niet gebruikt. */
export function schoonVraag(vraag: unknown): string {
  return String(vraag ?? "")
    .slice(0, MAX_VRAAG)
    .replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, "[e-mail weggelaten]")
    .replace(/(\+31|0031|0)[\s-]?6([\s-]?\d){8}/g, "[telefoon weggelaten]")
    .replace(/\b0\d{1,3}[\s-]?\d{6,7}\b/g, "[telefoon weggelaten]")
    .trim();
}

const ACTIES: Record<string, string> = {
  makkelijker: "Maak onderdeel {n} makkelijker (minder druk, meer ruimte of minder regels). Laat de andere onderdelen zoals ze zijn.",
  moeilijker: "Maak onderdeel {n} moeilijker (meer druk, minder ruimte of een extra regel). Laat de andere onderdelen zoals ze zijn.",
  vervangen: "Vervang onderdeel {n} door een andere oefening met hetzelfde doel en dezelfde duur. Laat de andere onderdelen zoals ze zijn.",
};

/* Wat er als gebruikersbericht naar Claude gaat. */
export function bouwVraag(vraag: string, basis: unknown, actie: string, onderdeel: number): string {
  const delen: string[] = [];
  if (basis && typeof basis === "object") {
    delen.push("De huidige training (JSON):\n" + JSON.stringify(basis));
    if (ACTIES[actie]) delen.push(ACTIES[actie].replace("{n}", String(onderdeel)));
  }
  if (vraag) delen.push("Vraag van de trainer: " + vraag);
  if (!delen.length) delen.push("Stel een complete training samen.");
  return delen.join("\n\n");
}

interface ClaudeAntwoord {
  invoer: unknown;
  toolId: string;
  inhoud: unknown[];
  tokensIn: number;
  tokensUit: number;
}

async function vraagClaude(
  deps: AiAfhankelijkheden,
  systeem: string,
  berichten: unknown[],
): Promise<ClaudeAntwoord> {
  const stop = new AbortController();
  const klok = setTimeout(() => stop.abort(), TIJDSLIMIET_MS);
  try {
    const r = await deps.fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: stop.signal,
      headers: {
        "x-api-key": deps.anthropicSleutel(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: deps.model(),
        max_tokens: MAX_ANTWOORD_TOKENS,
        system: systeem,
        tools: [{ name: "training", description: "Lever de training aan in het vaste formaat.", input_schema: AI_TRAINING_SCHEMA }],
        tool_choice: { type: "tool", name: "training" },
        messages: berichten,
      }),
    });
    const data = await r.json().catch(() => null) as Record<string, unknown> | null;
    if (!r.ok || !data) throw new Error("anthropic " + r.status);
    const inhoud = Array.isArray(data.content) ? data.content as Record<string, unknown>[] : [];
    const blok = inhoud.find((b) => b.type === "tool_use" && b.name === "training");
    const gebruik = (data.usage ?? {}) as Record<string, number>;
    return {
      invoer: blok ? blok.input : null,
      toolId: blok ? String(blok.id) : "",
      inhoud,
      tokensIn: Number(gebruik.input_tokens) || 0,
      tokensUit: Number(gebruik.output_tokens) || 0,
    };
  } finally {
    clearTimeout(klok);
  }
}

export async function behandelAiVraag(verzoek: Request, deps: AiAfhankelijkheden): Promise<Response> {
  if (verzoek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (verzoek.method !== "POST") return fout("Alleen POST", 405);

  // ── 1. Wie vraagt er wat? ──────────────────────────────────
  const kop = verzoek.headers.get("Authorization") ?? "";
  if (!kop.toLowerCase().startsWith("bearer ")) return fout("Niet ingelogd", 401);
  const jwt = kop.slice(7).trim();
  let body: Record<string, unknown>;
  try {
    body = await verzoek.json() as Record<string, unknown>;
  } catch (_f) {
    return fout("Onleesbaar verzoek", 400);
  }
  const clubId = typeof body.club_id === "string" ? body.club_id : "";
  if (!UUID_VORM.test(clubId)) return fout("Onbekende club", 400);
  const context = veiligeContext(body.context);
  const vraag = schoonVraag(body.vraag);
  const actie = typeof body.actie === "string" ? body.actie : "";
  const onderdeel = Math.max(1, Math.floor(Number(body.onderdeel) || 1));
  const basis = body.basis && typeof body.basis === "object" ? body.basis : null;
  if (!vraag && !basis) return fout("Stel eerst een vraag.", 400);
  if (!deps.anthropicSleutel()) return fout("De AI-trainer is nog niet ingesteld.", 503);

  const gebruikerDb = deps.gebruikerClient(jwt);
  const serviceDb = deps.serviceClient();
  let verzoekId: number | null = null;
  let tokensIn = 0, tokensUit = 0;
  const begin = Date.now();

  try {
    // ── 2. Mag jij dit? ──────────────────────────────────────
    const ik = await gebruikerDb.gebruiker();
    if (!ik) return fout("Niet ingelogd", 401);
    const mag = await gebruikerDb.rpc("mag_serverdata_schrijven", { doel: clubId });
    if (mag !== true) {
      deps.log("ai geweigerd: geen recht", { club_id: clubId });
      return fout("De AI-trainer hoort bij Coach en Club, voor trainers en eigenaars.", 403);
    }

    // ── 3. De rem ────────────────────────────────────────────
    const rem = await serviceDb.rpc("ai_verzoek_start", { p_gebruiker: ik.id, p_club: clubId }) as
      | Record<string, unknown>[]
      | null;
    const uitkomst = Array.isArray(rem) && rem[0] ? String(rem[0].uitkomst) : "";
    if (uitkomst === "bezig") return fout("Even geduld: je vorige vraag is nog bezig.", 429);
    if (uitkomst === "te-veel") return fout("Je hebt veel vragen achter elkaar gesteld. Probeer het over een paar minuten opnieuw.", 429);
    if (uitkomst !== "ok") throw new Error("rem gaf geen uitkomst");
    verzoekId = Number(rem![0].verzoek_id);

    // ── 4. Claude, en zo nodig één correctie ─────────────────
    const systeem = aiSysteemInstructie(context);
    const berichten: unknown[] = [{ role: "user", content: bouwVraag(vraag, basis, actie, onderdeel) }];
    let a = await vraagClaude(deps, systeem, berichten);
    tokensIn += a.tokensIn; tokensUit += a.tokensUit;
    let fouten = controleerTraining(a.invoer, context);
    let gecorrigeerd = false;
    if (fouten.length && a.toolId) {
      berichten.push({ role: "assistant", content: a.inhoud });
      berichten.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: a.toolId, is_error: true, content: correctieVraag(fouten) }],
      });
      const b = await vraagClaude(deps, systeem, berichten);
      tokensIn += b.tokensIn; tokensUit += b.tokensUit;
      if (b.invoer) {
        a = b;
        fouten = controleerTraining(b.invoer, context);
        gecorrigeerd = true;
      }
    }
    if (!a.invoer) return fout(NIET_BEREIKBAAR, 502);
    deps.log("ai klaar", {
      club_id: clubId, meldingen: fouten.length, gecorrigeerd, tokens_in: tokensIn, tokens_uit: tokensUit, ms: Date.now() - begin,
    });
    return antwoord({ training: a.invoer, fouten, gecorrigeerd }, 200);
  } catch (f) {
    deps.log("ai mislukt", { club_id: clubId, soort: f instanceof Error ? f.message.slice(0, 40) : "onbekend", ms: Date.now() - begin });
    return fout(NIET_BEREIKBAAR, 502);
  } finally {
    // De rem loslaten en het gebruik optellen — ook als het misging.
    if (verzoekId !== null) {
      try {
        await serviceDb.rpc("ai_verzoek_klaar", { p_id: verzoekId, p_tokens_in: tokensIn, p_tokens_uit: tokensUit });
      } catch (_f) {
        deps.log("ai: afmelden bij de rem mislukt", { club_id: clubId });
      }
    }
  }
}

export function standaardAfhankelijkheden(fetchFn: Fetcher = fetch): AiAfhankelijkheden {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return {
    gebruikerClient: (jwt) => maakDbClient({ url, sleutel: anon, jwt, fetchFn }),
    serviceClient: () => maakDbClient({ url, sleutel: service, fetchFn }),
    anthropicSleutel: () => Deno.env.get("ANTHROPIC_API_KEY") ?? "",
    model: () => Deno.env.get("AI_MODEL") || STANDAARD_MODEL,
    fetchFn,
    log: (bericht, velden) => console.log(bericht, velden ?? {}),
  };
}

if (import.meta.main) {
  Deno.serve((verzoek) => behandelAiVraag(verzoek, standaardAfhankelijkheden()));
}
