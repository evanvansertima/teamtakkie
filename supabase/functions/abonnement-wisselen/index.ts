// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — edge function "abonnement-wisselen"
//  ─────────────────────────────────────────────────────────────
//  WAT DIT DOET
//  Een vereniging die al betaalt wil naar het andere pakket. Deze
//  functie kijkt of dat mag, rekent uit wat het kost, en doet dan één
//  van drie dingen:
//
//    · OMLAAG (Club → Coach): meteen doorvoeren, gratis. Daarna bij
//      Mollie het bedrag van de doorlopende incasso verlagen.
//    · OMHOOG, onder € 2,50: hetzelfde, ook gratis.
//    · OMHOOG, boven € 2,50: een claim neerzetten, bij Mollie het
//      verschil incasseren via het bestaande mandaat, en pas wisselen
//      als de webhook meldt dat het geld er is.
//
//  DE ZIN DIE ALLES DRAAGT
//  Deze functie zet NOOIT zelf een nieuwe periode. Er wordt niets bij
//  geldig_tot opgeteld, door niemand, nergens. Dat is precies de fout
//  die Evan op 19 september 2026 vond: elke klik op "Overstappen"
//  startte een gewone nieuwe betaling, en die telde een hele maand op.
//  Twee keer klikken gaf twee maanden. Zie de uitleg bovenaan
//  server/20-abonnement-wisselen.sql.
//
//  DE TWEEDE ZIN: EERST HET SLOT, DAN PAS GELD
//  Bij een betaalde upgrade komt start_wissel() vóór de aanroep naar
//  Mollie. Andersom zou een dubbelklik twee betalingen opleveren en
//  zouden we dat pas daarna ontdekken. Het slot zit in de database (een
//  unieke index), niet hier: twee verzoeken die milliseconden na elkaar
//  binnenkomen, zitten allebei in het gat tussen kijken en schrijven.
//
//  WELKE SLEUTEL WAAR — net als in betaling-starten
//  · "mag jij dit?"  → de sleutel van de GEBRUIKER (anon + JWT), zodat
//                      de gewone regels uit 01-schema.sql gelden.
//  · alles daarna    → de SERVICE-sleutel: public.abonnementen en
//                      public.abonnement_wissels hebben met opzet geen
//                      schrijfregel, en dat ontbreken IS het slot.
//
//  verify_jwt blijft AAN (zie supabase/config.toml).
//
//  UITROLLEN (kan pas als server/20-abonnement-wisselen.sql gedraaid is):
//      supabase functions deploy abonnement-wisselen
// ══════════════════════════════════════════════════════════════

import {
  beoordeelWissel,
  centenNaarBedrag,
  type Fetcher,
  GEEN_SLEUTEL_TEKST,
  maakMollie,
  type MollieClient,
  MollieFout,
  mollieSleutel,
  prijsCent,
  type WisselFeiten,
} from "../_gedeeld/mollie.ts";
import { DatabaseFout, type DbClient, maakDbClient } from "../_gedeeld/supabase.ts";

/* De vorm van een club-id. Een club_id dat hier niet doorheen komt,
   gaat nooit als filter een database-aanvraag in. */
const UUID_VORM =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface WisselAfhankelijkheden {
  gebruikerClient(jwt: string): DbClient;
  serviceClient(): DbClient;
  mollie(): MollieClient;
  webhookUrl: string;
  log(bericht: string, velden?: Record<string, unknown>): void;
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

/* Elke fout krijgt een eigen, geschreven tekst — nooit "fout 400" en
   nooit het antwoord van Mollie of Postgres. Daar kunnen een
   rekeningnummer, een naam of de sleutel zelf in staan, en een
   foutmelding komt uiteindelijk ergens op een scherm terecht. */
function fout(tekst: string, status: number): Response {
  return antwoord({ fout: tekst }, status);
}

/* De rij die public.wissel_gegevens() teruggeeft. */
interface WisselRij {
  pakket?: unknown;
  termijn?: unknown;
  geldig_tot?: unknown;
  totale_dagen?: unknown;
  resterende_dagen?: unknown;
  mollie_klant_id?: unknown;
  mollie_subscription_id?: unknown;
  wissel_onderweg?: unknown;
}

function tekstOfNull(waarde: unknown): string | null {
  return typeof waarde === "string" && waarde !== "" ? waarde : null;
}

function getalOfNull(waarde: unknown): number | null {
  return typeof waarde === "number" && isFinite(waarde) ? waarde : null;
}

/* Zet de rij uit de database om in de feiten waar beoordeelWissel()
   mee werkt. Apart, zodat de omzetting één plek heeft en niet half in
   de beslissing terechtkomt. */
function feitenUit(rij: WisselRij): WisselFeiten {
  return {
    pakket: typeof rij.pakket === "string" ? rij.pakket : "free",
    termijn: tekstOfNull(rij.termijn),
    geldigTot: tekstOfNull(rij.geldig_tot),
    totaleDagen: getalOfNull(rij.totale_dagen),
    resterendeDagen: getalOfNull(rij.resterende_dagen),
    mollieSubscriptionId: tekstOfNull(rij.mollie_subscription_id),
    wisselOnderweg: rij.wissel_onderweg === true,
  };
}

export async function behandelWissel(
  verzoek: Request,
  deps: WisselAfhankelijkheden,
): Promise<Response> {
  if (verzoek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (verzoek.method !== "POST") return fout("Alleen POST", 405);

  // ── 1. Wie klopt er aan? ───────────────────────────────────
  const kop = verzoek.headers.get("Authorization") ?? "";
  if (!kop.toLowerCase().startsWith("bearer ")) {
    return fout("Niet ingelogd", 401);
  }
  const jwt = kop.slice(7).trim();

  let body: Record<string, unknown>;
  try {
    body = await verzoek.json() as Record<string, unknown>;
  } catch (_f) {
    return fout("Onleesbaar verzoek", 400);
  }

  const clubId = typeof body.club_id === "string" ? body.club_id : "";
  const naarPakket = typeof body.naar_pakket === "string" ? body.naar_pakket : "";
  const alleenBerekenen = body.alleen_berekenen === true;
  if (!UUID_VORM.test(clubId)) return fout("Onbekende club", 400);
  if (naarPakket === "") return fout("Geen pakket meegegeven", 400);

  const gebruikerDb = deps.gebruikerClient(jwt);
  const serviceDb = deps.serviceClient();

  try {
    // ── 2. Ben jij de eigenaar van deze club? ────────────────
    //  Met de rechten van de gebruiker zelf, letterlijk hetzelfde blok
    //  als in betaling-starten. Het filter op gebruiker_id is daarbij
    //  geen franje: leden_lezen laat je álle leden van je eigen clubs
    //  zien, dus zonder dat filter zou een kijker de rij van de
    //  éigenaar vinden en daarmee slagen.
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
      deps.log("wissel geweigerd: geen eigenaar", { club_id: clubId });
      return fout("Alleen de eigenaar van de club kan het pakket wijzigen", 403);
    }

    // ── 3. De feiten ophalen ─────────────────────────────────
    //  Met de SERVICE-sleutel: wissel_gegevens() laat niets anders
    //  door (twee sloten, server/20-abonnement-wisselen.sql DEEL 3).
    const feitenRijen = await serviceDb.rpc("wissel_gegevens", { p_club: clubId }) as
      | WisselRij[]
      | null;
    if (!Array.isArray(feitenRijen) || feitenRijen.length === 0) {
      return fout("Deze vereniging heeft nog geen abonnement", 400);
    }
    const rij = feitenRijen[0];
    const feiten = feitenUit(rij);
    const klantId = tekstOfNull(rij.mollie_klant_id);

    // ── 4. Het oordeel ───────────────────────────────────────
    //  Alle randgevallen zitten in beoordeelWissel(): free, onbeperkt,
    //  verlopen, geen incasso, onbekende termijn, dubbelklik en "er
    //  loopt er al een". Die functie is puur en apart getest
    //  (_gedeeld/wissel.test.ts); hier staat alleen wat we met het
    //  oordeel doen.
    const oordeel = beoordeelWissel(feiten, naarPakket);

    // ── 4b. Alleen rekenen, niets claimen ────────────────────
    //  Hiermee kan het scherm het bedrag tonen vóórdat iemand klikt.
    //  Er wordt niets vastgelegd en niets bij Mollie aangevraagd.
    if (alleenBerekenen) {
      return antwoord({
        mag: oordeel.mag,
        soort: oordeel.soort,
        bedrag_cent: oordeel.bedragCent,
        reden: oordeel.reden,
        van_pakket: feiten.pakket,
        naar_pakket: naarPakket,
        termijn: feiten.termijn,
        geldig_tot: feiten.geldigTot,
        resterende_dagen: feiten.resterendeDagen,
        totale_dagen: feiten.totaleDagen,
      }, 200);
    }

    if (!oordeel.mag) {
      deps.log("wissel geweigerd", {
        club_id: clubId,
        van: feiten.pakket,
        naar: naarPakket,
        onderweg: feiten.wisselOnderweg,
      });
      // 409 alleen als er al een wissel loopt: dat is een botsing en
      // geen verkeerde vraag. Alle andere weigeringen zijn 400 mét een
      // tekst die zegt wat er aan de hand is.
      return fout(oordeel.reden, feiten.wisselOnderweg ? 409 : 400);
    }

    // ── 5. Een dubbelklik ────────────────────────────────────
    //  Het pakket staat al zoals gevraagd. Geen foutstatus: er is
    //  niets mis, er valt alleen niets te doen.
    if (oordeel.soort === "niets") {
      return antwoord({ status: "ongewijzigd", naar_pakket: naarPakket }, 200);
    }

    // ── 6. GRATIS: meteen doorvoeren ─────────────────────────
    if (oordeel.soort === "downgrade" || oordeel.soort === "upgrade_gratis") {
      await serviceDb.rpc("wissel_abonnement", {
        p_club: clubId,
        p_van_pakket: feiten.pakket,
        p_naar_pakket: naarPakket,
        p_soort: oordeel.soort,
      });
      deps.log("pakket gewisseld", {
        club_id: clubId,
        van: feiten.pakket,
        naar: naarPakket,
        soort: oordeel.soort,
      });

      // ── 6b. En dan de incasso bij Mollie ───────────────────
      //  Het pakket staat nu goed. Wat Mollie afschrijft nog niet.
      const nieuwBedrag = prijsCent(naarPakket, feiten.termijn ?? "");
      if (!feiten.mollieSubscriptionId || !klantId || nieuwBedrag === null) {
        // Een downgrade mag ook zonder doorlopende incasso doorgaan —
        // maar dan hoort dat hier hard in het logboek te staan, want
        // niemand merkt het verder. Zie Veerles ontwerp §11.
        deps.log("LET OP: pakket gewisseld zonder incasso bij te werken", {
          club_id: clubId,
          naar: naarPakket,
          incasso: feiten.mollieSubscriptionId ? "bekend" : "onbekend",
          termijn: feiten.termijn ?? "onbekend",
        });
        return antwoord({
          status: "gewijzigd",
          naar_pakket: naarPakket,
          bedrag_cent: 0,
        }, 200);
      }

      try {
        // De Mollie-sleutel wordt PAS hier opgehaald, en dat is geen
        // detail: zolang Mollie nog niet is aangesloten (vandaag het
        // geval) zou een eerdere aanroep een club tegenhouden die
        // alleen maar minder wil gaan betalen.
        const mollie = deps.mollie();
        await mollie.wijzigAbonnement(klantId, feiten.mollieSubscriptionId, {
          amount: { value: centenNaarBedrag(nieuwBedrag), currency: "EUR" },
          description: `TEAMTAKKIE ${naarPakket} (per ${feiten.termijn})`,
        });
      } catch (f) {
        // Het pakket staat al goed en dat draaien we niet terug — dat
        // zou de club iets afnemen waar hij niets aan kan doen. Wel
        // luid loggen: mollie_bedrag_cent blijft nu op het OUDE bedrag
        // staan en wissel_controle() meldt dat.
        deps.log("LET OP: incasso bij Mollie NIET bijgewerkt na wissel", {
          club_id: clubId,
          naar: naarPakket,
          incasso: feiten.mollieSubscriptionId,
          soort: f instanceof Error ? f.name : "onbekend",
        });
        return fout(
          "De wijziging is doorgevoerd, de automatische incasso nog niet. We kijken ernaar.",
          502,
        );
      }

      // PAS NU. Dit veld betekent "wat Mollie volgens ons afschrijft";
      // invullen vóór de bevestiging zou er een voornemen van maken, en
      // dan is wissel_controle() waardeloos.
      await serviceDb.bijwerken("abonnementen", { club_id: "eq." + clubId }, {
        mollie_bedrag_cent: nieuwBedrag,
      });

      return antwoord({
        status: "gewijzigd",
        naar_pakket: naarPakket,
        bedrag_cent: 0,
      }, 200);
    }

    // ── 7. BETAALD: eerst de claim ───────────────────────────
    //  Zonder klantnummer valt er niets te incasseren. Dit kan
    //  eigenlijk niet (er is een subscription, dus ook een klant), maar
    //  een claim neerzetten die nooit betaald kan worden is erger dan
    //  hier stoppen.
    if (!klantId) {
      deps.log("wissel geweigerd: geen klantnummer bij Mollie", { club_id: clubId });
      return fout(
        "We kunnen deze vereniging niet bij de betaaldienst vinden. Neem contact op.",
        400,
      );
    }

    // De sleutel vóór de claim ophalen. Is Mollie er niet, dan komt er
    // een nette 503 uit de buitenste catch en staat er GEEN claim die
    // deze vereniging een kwartier lang op slot zet.
    const mollie = deps.mollie();

    let wisselId: string;
    try {
      const uitkomst = await serviceDb.rpc("start_wissel", {
        p_club: clubId,
        p_van: feiten.pakket,
        p_naar: naarPakket,
        p_termijn: feiten.termijn,
        p_bedrag_cent: oordeel.bedragCent,
        p_resterende_dagen: feiten.resterendeDagen,
        p_totale_dagen: feiten.totaleDagen,
      });
      wisselId = typeof uitkomst === "string" ? uitkomst : "";
    } catch (f) {
      // De unieke index heeft toegeslagen: er was al een wissel
      // onderweg. PostgREST vertaalt 23505 naar 409; wij geven er een
      // tekst bij die iets zegt.
      if (f instanceof DatabaseFout && f.status === 409) {
        deps.log("wissel geweigerd: er liep er al een", { club_id: clubId });
        return fout(
          "Er loopt al een wijziging voor deze vereniging. Wacht tot die klaar is.",
          409,
        );
      }
      throw f;
    }

    // ── 8. De betaling bij Mollie ────────────────────────────
    //  sequenceType "recurring": dit loopt via het mandaat dat er al
    //  is. GEEN method en GEEN redirectUrl — er komt geen kassa aan te
    //  pas, de club hoeft nergens heen. Het bedrag komt uit het
    //  oordeel, dat uit verrekeningCent() komt, dat uit PRIJZEN komt.
    //  Nooit uit de body van het verzoek.
    let betalingId = "";
    let modus: "test" | "live" = "test";
    let valuta = "EUR";
    try {
      const betaling = await mollie.maakBetaling({
        amount: { value: centenNaarBedrag(oordeel.bedragCent), currency: "EUR" },
        description: `TEAMTAKKIE wissel naar ${naarPakket}`,
        webhookUrl: deps.webhookUrl,
        sequenceType: "recurring",
        customerId: klantId,
        metadata: {
          club_id: clubId,
          pakket: naarPakket,
          termijn: feiten.termijn ?? "",
          soort: "wissel",
          wissel_id: wisselId,
        },
      });
      betalingId = betaling.id;
      modus = betaling.mode === "live" ? "live" : "test";
      valuta = betaling.amount?.currency ?? "EUR";
    } catch (f) {
      // Nooit een claim laten hangen die nooit afloopt: die zou deze
      // vereniging een kwartier lang op slot zetten (start_wissel ruimt
      // hem daarna zelf op, maar een kwartier wachten zonder uitleg is
      // geen antwoord).
      await breekClaimAf(serviceDb, wisselId, deps);
      if (f instanceof MollieFout && f.code === "geen_sleutel") {
        return fout(GEEN_SLEUTEL_TEKST, 503);
      }
      deps.log("wisselbetaling starten mislukt", {
        club_id: clubId,
        wissel: wisselId,
        soort: f instanceof Error ? f.name : "onbekend",
      });
      return fout("Het wijzigen is niet gelukt. Probeer het later opnieuw.", 502);
    }

    // ── 9. Het betaalnummer bij de claim ─────────────────────
    //  DIT IS DE DRAAD TERUG. De webhook kent alleen het betaalnummer;
    //  staat dat niet bij de claim, dan doet verwerk_wissel_betaling()
    //  met opzet helemaal niets — en heeft de club betaald zonder te
    //  wisselen. Lukt deze stap niet, dan zeggen we dat eerlijk.
    try {
      await serviceDb.bijwerken("abonnement_wissels", { id: "eq." + wisselId }, {
        mollie_betaling_id: betalingId,
      });
    } catch (_f) {
      deps.log("LET OP: betaalnummer niet aan de wissel gekoppeld", {
        club_id: clubId,
        wissel: wisselId,
        betaling: betalingId,
      });
      await breekClaimAf(serviceDb, wisselId, deps);
      return fout(
        "Er is iets misgegaan bij het vastleggen van de wijziging. Neem contact op voordat je het opnieuw probeert.",
        502,
      );
    }

    // ── 10. De voorlopige boeking ────────────────────────────
    //  Zelfde patroon als betaling-starten: status 'open', er is nog
    //  niets betaald. Mislukt dit, dan is dat geen reden om de wissel
    //  af te breken — verwerk_wissel_betaling() maakt de rij desnoods
    //  zelf aan.
    try {
      await serviceDb.invoegen("betalingen", {
        mollie_betaling_id: betalingId,
        club_id: clubId,
        mollie_klant_id: klantId,
        pakket: naarPakket,
        termijn: feiten.termijn,
        bedrag_cent: oordeel.bedragCent,
        valuta,
        status: "open",
        modus,
      });
    } catch (_f) {
      deps.log("voorlopige boeking van de wissel mislukt", {
        betaling: betalingId,
        club_id: clubId,
      });
    }

    deps.log("wisselbetaling gestart", {
      betaling: betalingId,
      klant: klantId,
      club_id: clubId,
      wissel: wisselId,
      naar: naarPakket,
      bedrag_cent: oordeel.bedragCent,
    });

    // Nooit "gelukt". Het pakket wisselt pas als de webhook bevestigt
    // dat het geld er is; alles daarvoor is een voornemen.
    return antwoord({
      status: "in_behandeling",
      bedrag_cent: oordeel.bedragCent,
      naar_pakket: naarPakket,
    }, 200);
  } catch (f) {
    if (f instanceof MollieFout && f.code === "geen_sleutel") {
      return fout(GEEN_SLEUTEL_TEKST, 503);
    }
    deps.log("wisselen mislukt", {
      club_id: clubId,
      soort: f instanceof Error ? f.name : "onbekend",
    });
    return fout("Het wijzigen is niet gelukt. Probeer het later opnieuw.", 502);
  }
}

/* Een claim vrijgeven die nergens meer op wacht. Met opzet zonder
   throw: dit gebeurt altijd terwijl er al iets anders misging, en dan
   is een tweede fout alleen maar ruis. */
async function breekClaimAf(
  db: DbClient,
  wisselId: string,
  deps: WisselAfhankelijkheden,
): Promise<void> {
  if (!wisselId) return;
  try {
    await db.bijwerken("abonnement_wissels", { id: "eq." + wisselId }, {
      status: "afgebroken",
      afgerond_op: new Date().toISOString(),
    });
  } catch (_f) {
    deps.log("LET OP: claim niet kunnen afbreken", { wissel: wisselId });
  }
}

/* De echte aansluitingen. Staat apart zodat een test hem nooit
   aanroept en er dus geen omgevingsvariabelen nodig zijn om deze
   module te kunnen importeren. */
export function standaardAfhankelijkheden(
  fetchFn: Fetcher = fetch,
): WisselAfhankelijkheden {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return {
    gebruikerClient: (jwt) => maakDbClient({ url, sleutel: anon, jwt, fetchFn }),
    serviceClient: () => maakDbClient({ url, sleutel: service, fetchFn }),
    mollie: () => maakMollie(mollieSleutel(), fetchFn),
    webhookUrl: Deno.env.get("MOLLIE_WEBHOOK_URL") ??
      (url ? url + "/functions/v1/betaling-melding" : ""),
    log: (bericht, velden) => console.log(bericht, velden ?? {}),
  };
}

if (import.meta.main) {
  Deno.serve((verzoek) => behandelWissel(verzoek, standaardAfhankelijkheden()));
}
