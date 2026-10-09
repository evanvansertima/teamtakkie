// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — edge function "abonnement-herroepen"
//  ─────────────────────────────────────────────────────────────
//  WAT DIT DOET
//  De herroepingsknop. Sinds 19 juni 2026 moet een consument een online
//  gesloten overeenkomst binnen 14 dagen met één knop kunnen herroepen,
//  in dezelfde online omgeving (EU-richtlijn 2023/2673). Twee acties:
//
//    · "bekijken": mag deze club nog herroepen, tot wanneer, en hoeveel
//      komt er terug? Verandert niets. Daarmee kan het scherm de knop
//      alleen tonen als hij ook werkt.
//    · "herroepen": de incasso stoppen, ALLES terugstorten (besluit van
//      Evan, 9 oktober 2026), de club meteen op Free, en een bevestiging
//      per e-mail — die laatste is bij herroepen wettelijk verplicht.
//
//  WAAR DE FEITEN VANDAAN KOMEN
//  Welke betaling een eerste aankoop was en wat er al is teruggestort,
//  vragen we aan Mollie, niet aan onze eigen boekhouding. public.betalingen
//  weet niet of een betaling via de kassa ging of via een machtiging;
//  Mollie wel (sequenceType). Onze tabel levert alleen de lijst met
//  betaalnummers om naar te vragen.
//
//  DE VOLGORDE: EERST DE INCASSO STOPPEN, DAN TERUGSTORTEN, DAN DE DATABASE
//  Stoppen eerst, zodat er tijdens het terugstorten niet nog een
//  afschrijving bij komt. De database pas als het geld onderweg is: de
//  app zegt "herroepen" alleen als dat ook waar is. Elke stap kan
//  veilig opnieuw: een gestopte incasso telt als gestopt, en wat al is
//  teruggestort wordt niet nog eens teruggestort (amountRefunded).
//
//  verify_jwt blijft AAN (zie supabase/config.toml).
//
//  UITROLLEN (kan pas als server/22-herroepen.sql gedraaid is):
//      supabase functions deploy abonnement-herroepen
// ══════════════════════════════════════════════════════════════

import {
  beoordeelHerroepen,
  bedragNaarCenten,
  type Fetcher,
  GEEN_SLEUTEL_TEKST,
  type HerroepBetaling,
  maakMollie,
  type MollieClient,
  MollieFout,
  mollieSleutel,
} from "../_gedeeld/mollie.ts";
import { type DbClient, maakDbClient } from "../_gedeeld/supabase.ts";
import { type Bevestiging, bevestigingsTekst } from "../_gedeeld/bevestiging.ts";

const UUID_VORM =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/* Hoe ver terug we in public.betalingen kijken. Iets ruimer dan de 14
   dagen, zodat een betaling van vlak voor middernacht niet tussen
   twee tijdzones in valt; het oordeel zelf rekent precies. */
const ZOEKVENSTER_DAGEN = 20;

export interface HerroepAfhankelijkheden {
  gebruikerClient(jwt: string): DbClient;
  serviceClient(): DbClient;
  mollie(): MollieClient;
  bevestig(b: Bevestiging): Promise<boolean>;
  log(bericht: string, velden?: Record<string, unknown>): void;
  nu(): Date;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function antwoord(inhoud: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(inhoud), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
function fout(tekst: string, status: number): Response {
  return antwoord({ fout: tekst }, status);
}

export async function behandelHerroepen(
  verzoek: Request,
  deps: HerroepAfhankelijkheden,
): Promise<Response> {
  if (verzoek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (verzoek.method !== "POST") return fout("Alleen POST", 405);

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
  const actie = typeof body.actie === "string" ? body.actie : "";
  if (!UUID_VORM.test(clubId)) return fout("Onbekende club", 400);
  if (actie !== "bekijken" && actie !== "herroepen") return fout("Onbekende actie", 400);

  const gebruikerDb = deps.gebruikerClient(jwt);
  const serviceDb = deps.serviceClient();

  try {
    // ── 1. Ben jij de eigenaar? Zelfde blok als bij opzeggen. ──
    const ik = await gebruikerDb.gebruiker();
    if (!ik) return fout("Niet ingelogd", 401);
    const rijen = await gebruikerDb.selecteer("leden", {
      select: "rol",
      club_id: "eq." + clubId,
      gebruiker_id: "eq." + ik.id,
      rol: "eq.eigenaar",
      limit: "1",
    });
    if (rijen.length === 0) {
      deps.log("herroepen geweigerd: geen eigenaar", { club_id: clubId, actie });
      return fout("Alleen de eigenaar van de club kan herroepen", 403);
    }

    // ── 2. Welke betalingen komen in aanmerking? ─────────────
    const vanaf = new Date(deps.nu().getTime() - ZOEKVENSTER_DAGEN * 86400000).toISOString();
    const boekingen = await serviceDb.selecteer("betalingen", {
      select: "mollie_betaling_id,betaald_op",
      club_id: "eq." + clubId,
      betaald_op: "gte." + vanaf,
      order: "betaald_op.asc",
      limit: "20",
    });

    // ── 3. Mollie vertelt wat ze zijn ────────────────────────
    //  De sleutel pas hier: zonder Mollie valt er niets te herroepen,
    //  maar ook niets te bekijken — en dat zeggen we dan ook.
    const mollie = deps.mollie();
    const betalingen: HerroepBetaling[] = [];
    for (const b of boekingen) {
      const id = typeof b.mollie_betaling_id === "string" ? b.mollie_betaling_id : "";
      if (!id) continue;
      const m = await mollie.haalBetaling(id);
      if (!m || m.status !== "paid" || !m.paidAt) continue;
      betalingen.push({
        id,
        betaaldOp: m.paidAt,
        bedragCent: bedragNaarCenten(m.amount?.value) ?? 0,
        alTerugCent: bedragNaarCenten(m.amountRefunded?.value) ?? 0,
        eerste: m.sequenceType === "first",
      });
    }

    const oordeel = beoordeelHerroepen(betalingen, deps.nu());

    // Een betaalde overstap die nog onderweg is, kan ná het herroepen
    // alsnog binnenkomen — en zet de club dan weer op het hogere pakket,
    // zonder incasso. Zelfde regel als bij opzeggen: eerst afwachten.
    const onderweg = await serviceDb.selecteer("abonnement_wissels", {
      select: "id",
      club_id: "eq." + clubId,
      afgerond_op: "is.null",
      limit: "1",
    });
    const wisselOnderweg = onderweg.length > 0;

    if (actie === "bekijken") {
      return antwoord({
        mag: oordeel.mag && oordeel.soort === "herroepen" && !wisselOnderweg,
        reden: wisselOnderweg
          ? "Er loopt nog een overstap van pakket. Wacht tot die klaar is."
          : oordeel.reden,
        tot: oordeel.tot,
        bedrag_cent: oordeel.bedragCent,
      }, 200);
    }

    if (wisselOnderweg) {
      return fout("Er loopt nog een overstap van pakket. Wacht tot die klaar is en herroep daarna.", 409);
    }
    if (!oordeel.mag) {
      deps.log("herroepen geweigerd", { club_id: clubId, tot: oordeel.tot });
      return fout(oordeel.reden, 400);
    }
    if (oordeel.soort === "niets") {
      // Alles is al teruggestort: een tweede tik, of een herhaling na
      // een half gelukte eerste poging waarvan alleen de database nog
      // moest. Die laatste stap doen we dan alsnog, hieronder.
      deps.log("herroepen: niets meer terug te storten", { club_id: clubId });
    }

    // ── 4. Eerst de incasso stoppen ──────────────────────────
    const abo = await serviceDb.selecteer("abonnementen", {
      select: "pakket,termijn,mollie_klant_id,mollie_subscription_id",
      club_id: "eq." + clubId,
      limit: "1",
    });
    const pakket = abo.length > 0 && typeof abo[0].pakket === "string" ? abo[0].pakket : "free";
    const termijn = abo.length > 0 && typeof abo[0].termijn === "string" ? abo[0].termijn : null;
    const klantId = abo.length > 0 && typeof abo[0].mollie_klant_id === "string" ? abo[0].mollie_klant_id : "";
    const incasso = abo.length > 0 && typeof abo[0].mollie_subscription_id === "string"
      ? abo[0].mollie_subscription_id
      : "";
    if (klantId && incasso) {
      try {
        await mollie.stopAbonnement(klantId, incasso);
      } catch (_f) {
        deps.log("herroepen: incasso stoppen mislukt — niets veranderd", { club_id: clubId });
        return fout("Herroepen is nu niet gelukt. Er is niets veranderd; probeer het later opnieuw.", 502);
      }
    }

    // ── 5. Dan terugstorten ──────────────────────────────────
    for (const t of oordeel.terug) {
      try {
        await mollie.terugbetalen(t.id, t.bedragCent, "TEAMTAKKIE herroepen");
      } catch (_f) {
        // Wat al terug is, gaat bij een nieuwe poging niet nog eens
        // terug (amountRefunded). De incasso is wel al gestopt.
        deps.log("LET OP: terugstorten mislukt", { club_id: clubId, betaling: t.id });
        return fout(
          "Een deel van het terugstorten is niet gelukt. Probeer het opnieuw — wat al is teruggestort, gebeurt niet nog een keer.",
          502,
        );
      }
    }

    // ── 6. Pas dan de database ───────────────────────────────
    const nu = deps.nu().toISOString();
    try {
      await serviceDb.bijwerken("abonnementen", { club_id: "eq." + clubId }, {
        pakket: "free",
        termijn: null,
        geldig_tot: null,
        mollie_subscription_id: null,
        mollie_bedrag_cent: null,
        opgezegd_op: null,
        herroepen_op: nu,
      });
      for (const t of oordeel.terug) {
        await serviceDb.bijwerken("betalingen", { mollie_betaling_id: "eq." + t.id }, {
          status: "terugbetaald",
        });
      }
    } catch (_f) {
      deps.log("LET OP: teruggestort, maar herroepen niet vastgelegd", { club_id: clubId });
      return fout("Het geld is teruggestort, maar het vastleggen lukte niet. Probeer het nog een keer.", 502);
    }

    // ── 7. De bevestiging — verplicht ────────────────────────
    let mail = false;
    if (ik.email) {
      try {
        mail = await deps.bevestig({
          soort: "herroepen",
          naar: ik.email,
          pakket,
          termijn,
          geldigTot: nu.slice(0, 10),
          bedragCent: oordeel.bedragCent,
        });
      } catch (_f) {
        mail = false;
      }
    }
    if (!mail) {
      // Bij herroepen is een bevestiging op een duurzame drager
      // verplicht. Lukt de mail niet, dan hoort Evan dat te weten.
      deps.log("LET OP: herroepen zonder verstuurde bevestiging", { club_id: clubId });
    }
    deps.log("herroepen", { club_id: clubId, bedrag_cent: oordeel.bedragCent, mail });
    return antwoord({ status: "herroepen", bedrag_cent: oordeel.bedragCent, mail }, 200);
  } catch (f) {
    if (f instanceof MollieFout && f.code === "geen_sleutel") {
      return fout(GEEN_SLEUTEL_TEKST, 503);
    }
    deps.log("herroepen mislukt", {
      club_id: clubId,
      actie,
      soort: f instanceof Error ? f.name : "onbekend",
    });
    return fout("Het is nu niet gelukt. Probeer het later opnieuw.", 502);
  }
}

export function standaardAfhankelijkheden(fetchFn: Fetcher = fetch): HerroepAfhankelijkheden {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const log = (bericht: string, velden?: Record<string, unknown>) =>
    console.log(bericht, velden ?? {});
  return {
    gebruikerClient: (jwt) => maakDbClient({ url, sleutel: anon, jwt, fetchFn }),
    serviceClient: () => maakDbClient({ url, sleutel: service, fetchFn }),
    mollie: () => maakMollie(mollieSleutel(), fetchFn),
    // Nog geen maildienst aangesloten (Brevo volgt). Zie
    // abonnement-opzeggen: het onderwerp wordt gelogd, het adres niet.
    bevestig: (b) => {
      log("bevestigingsmail nog niet aangesloten", { onderwerp: bevestigingsTekst(b).onderwerp });
      return Promise.resolve(false);
    },
    log,
    nu: () => new Date(),
  };
}

if (import.meta.main) {
  Deno.serve((verzoek) => behandelHerroepen(verzoek, standaardAfhankelijkheden()));
}
