// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — edge function "betaling-starten"
//  ─────────────────────────────────────────────────────────────
//  WAT DIT DOET
//  De app vraagt: "deze club wil pakket coach, per maand." Deze functie
//  controleert of de vrager daar überhaupt over gaat, zoekt zelf de
//  prijs op, maakt de betaling aan bij Mollie en geeft één ding terug:
//  het adres waar de club kan afrekenen.
//
//  DE ÉÉN ZIN DIE ALLES DRAAGT
//  Van de client komt ALLEEN club_id, pakket en termijn. Geen bedrag.
//  Nooit een bedrag. Zou het bedrag van de client komen, dan is een
//  clubabonnement van € 0,01 een kwestie van de ontwikkelaarsconsole
//  openen. De prijs komt uit PRIJZEN in _gedeeld/mollie.ts, en uit
//  niets anders. tests/index.test.ts bewijst dat door een verzonnen
//  bedrag mee te sturen en te laten zien dat het genegeerd wordt.
//
//  WELKE SLEUTEL WAAR — zie ook de uitleg in _gedeeld/supabase.ts
//  · "mag jij dit?"        → de sleutel van de GEBRUIKER (anon + JWT),
//                            zodat de gewone regels gelden.
//  · abonnementen lezen/schrijven en de boeking wegzetten
//                          → de SERVICE-sleutel, want die tabellen
//                            hebben met opzet geen schrijfregel.
//
//  verify_jwt blijft hier AAN (de standaard). Zonder inlog valt er niets
//  te starten; zie supabase/config.toml, waar alleen betaling-melding
//  een uitzondering krijgt.
//
//  UITROLLEN (kan pas als de Mollie-sleutel er is):
//      supabase functions deploy betaling-starten
// ══════════════════════════════════════════════════════════════

import {
  centenNaarBedrag,
  type Fetcher,
  GEEN_SLEUTEL_TEKST,
  maakMollie,
  type MollieClient,
  MollieFout,
  mollieSleutel,
  prijsCent,
} from "../_gedeeld/mollie.ts";
import { type DbClient, maakDbClient } from "../_gedeeld/supabase.ts";

/* Waar de club naartoe terugkomt nadat hij bij zijn bank is geweest, en
   waar Mollie zijn melding naartoe stuurt. Allebei te overschrijven met
   een omgevingsvariabele, zodat een proefopstelling niet naar de echte
   app wijst. */
const STANDAARD_TERUG = "https://app.teamtakkie.nl/?upgrade=terug";

/* Ontdekt op 19 september 2026, tijdens Evans eerste echte testbetaling:
   een vaste STANDAARD_TERUG stuurt iedereen die vanaf localhost test
   terug naar de live site — een ander origin, dus een andere
   localStorage en een andere ingelogde sessie. Geen bug in de betaling
   zelf (die stond gewoon goed in de database), maar wel in waar de
   browser na afloop landt.

   Oplossing: de client mag zijn eigen oorsprong meesturen, maar alleen
   uit deze vaste lijst — anders zou "terug_oorsprong" een open redirect
   worden (iemand stuurt een clubeigenaar na het betalen naar een eigen
   phishing-pagina in plaats van naar TEAMTAKKIE). Een bedrag kan de
   client nooit beïnvloeden (zie hierboven); een terugkeeradres nu ook
   niet, tenzij het er al met naam en toenaam in deze lijst staat. */
const TOEGESTANE_TERUG_OORSPRONGEN = [
  "https://app.teamtakkie.nl",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

/** @returns de terug-URL voor dit verzoek: de meegestuurde oorsprong als
 *  die op de vaste lijst staat, anders de standaard. */
function terugUrlVoor(oorsprong: unknown, standaard: string): string {
  if (typeof oorsprong === "string" && TOEGESTANE_TERUG_OORSPRONGEN.includes(oorsprong)) {
    return oorsprong + "/?upgrade=terug";
  }
  return standaard;
}

/* De vorm van een club-id. Een club_id dat hier niet doorheen komt,
   gaat nooit als filter een database-aanvraag in. */
const UUID_VORM =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface StartAfhankelijkheden {
  /* Een client die praat namens de ingelogde gebruiker: hiermee gelden
     de regels uit 01-schema.sql. */
  gebruikerClient(jwt: string): DbClient;
  /* Een client met de service-sleutel: alleen voor abonnementen en de
     boekhouding. */
  serviceClient(): DbClient;
  /* Gooit MollieFout("geen_sleutel") zolang Evan nog op goedkeuring
     wacht. */
  mollie(): MollieClient;
  webhookUrl: string;
  terugUrl: string;
  /* Meldingen voor het logboek. Als parameter, zodat een test kan zien
     wát er gelogd wordt — en vooral: dat er niets gevoeligs in staat. */
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

/* Elke fout krijgt een eigen, vaste tekst. Het antwoord van Mollie of
   van Postgres gaat NOOIT mee naar de client: daar kan de
   Authorization-header, een rekeningnummer of de naam van een rol in
   staan. Dit is Veerle's eis, en het is de reden dat deze functie
   maar zes verschillende foutteksten kent. */
function fout(tekst: string, status: number): Response {
  return antwoord({ fout: tekst }, status);
}

export async function behandelStart(
  verzoek: Request,
  deps: StartAfhankelijkheden,
): Promise<Response> {
  if (verzoek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (verzoek.method !== "POST") return fout("Alleen POST", 405);

  // ── 1. Wie klopt er aan? ───────────────────────────────────
  //  De gateway heeft het token al gecontroleerd (verify_jwt = true),
  //  maar we hebben hem hier nodig om de vraag "ben jij eigenaar?" met
  //  de rechten van deze gebruiker te kunnen stellen.
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
  const pakket = typeof body.pakket === "string" ? body.pakket : "";
  const termijn = typeof body.termijn === "string" ? body.termijn : "";
  if (!UUID_VORM.test(clubId)) return fout("Onbekende club", 400);
  const terugUrl = terugUrlVoor(body.terug_oorsprong, deps.terugUrl);

  const gebruikerDb = deps.gebruikerClient(jwt);
  const serviceDb = deps.serviceClient();

  try {
    // ── 2. Ben jij de eigenaar van deze club? ────────────────
    //  Met de rechten van de gebruiker zelf. Het filter op
    //  gebruiker_id is daarbij geen franje: leden_lezen laat je álle
    //  leden van je eigen clubs zien, dus zonder dat filter zou een
    //  kijker de rij van de éigenaar vinden en daarmee slagen.
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
      deps.log("betaling geweigerd: geen eigenaar", { club_id: clubId });
      return fout("Alleen de eigenaar van de club kan een abonnement afsluiten", 403);
    }

    // ── 2b. Noodrem, 19 september 2026 ───────────────────────
    //  Ontdekt door Evan tijdens zijn eigen eerste testbetalingen:
    //  deze functie start altijd een gloednieuwe periode (sequenceType
    //  "first") en verwerk_betaling() telt die daarna onvoorwaardelijk
    //  bij geldig_tot op. Voor wie al Coach of Club heeft en nog
    //  betaald is, stapelt elke klik dus een extra periode op — geen
    //  wissel, een tweede (derde, vierde...) abonnement. Tot
    //  abonnement-wisselen bestaat, is dit de enige rem: weiger een
    //  nieuwe aankoop zolang er al een lopend, betaald pakket is.
    const huidig = await serviceDb.selecteer("abonnementen", {
      select: "pakket,geldig_tot",
      club_id: "eq." + clubId,
      limit: "1",
    });
    const huidigPakket = huidig.length > 0 && typeof huidig[0].pakket === "string"
      ? huidig[0].pakket as string
      : "free";
    const huidigGeldigTot = huidig.length > 0 && typeof huidig[0].geldig_tot === "string"
      ? huidig[0].geldig_tot as string
      : null;
    const nogGeldig = huidigGeldigTot === null || huidigGeldigTot >= new Date().toISOString().slice(0, 10);
    if ((huidigPakket === "coach" || huidigPakket === "club") && nogGeldig) {
      deps.log("betaling geweigerd: al een lopend betaald abonnement", {
        club_id: clubId,
        huidig_pakket: huidigPakket,
      });
      return fout("Je hebt al een betaald abonnement. Wijzigen van pakket is voorlopig nog niet mogelijk — neem contact op.", 409);
    }

    // ── 3. Wat kost dit? ─────────────────────────────────────
    //  Uit de vaste lijst. Wat er verder in de body stond doet niet
    //  mee — ook niet een veld dat "bedrag" heet.
    const bedragCent = prijsCent(pakket, termijn);
    if (bedragCent === null) {
      return fout("Onbekend pakket of onbekende termijn", 400);
    }

    // ── 4. Is Mollie er al? ──────────────────────────────────
    //  Bewust hierna: een niet-eigenaar en een onbekend pakket horen
    //  hun eigen antwoord te krijgen, ook zolang Mollie nog niet is
    //  aangesloten.
    const mollie = deps.mollie();

    // ── 5. Kennen we deze club al bij Mollie? ────────────────
    //  Met de SERVICE-sleutel: public.abonnementen heeft geen
    //  schrijfregel en geen brede leesregel, en dat is het slot dat
    //  voorkomt dat een club zijn eigen pakket ophoogt. Dat slot
    //  blijft staan; deze functie gaat er met een aparte sleutel
    //  omheen, niet door het open te zetten.
    const abo = await serviceDb.selecteer("abonnementen", {
      select: "mollie_klant_id",
      club_id: "eq." + clubId,
      limit: "1",
    });
    const bestaandeRij = abo.length > 0;
    let klantId = bestaandeRij && typeof abo[0].mollie_klant_id === "string"
      ? abo[0].mollie_klant_id as string
      : "";

    const clubRijen = await serviceDb.selecteer("clubs", {
      select: "naam",
      id: "eq." + clubId,
      limit: "1",
    });
    const clubNaam = clubRijen.length > 0 && typeof clubRijen[0].naam === "string"
      ? clubRijen[0].naam as string
      : null;

    if (!klantId) {
      const klant = await mollie.maakKlant({
        naam: clubNaam ?? undefined,
        email: ik.email,
      });
      klantId = klant.id;
      // Bestaat er al een rij, dan alleen het klantnummer erbij; een
      // upsert zou hier het pakket kunnen terugzetten naar de
      // standaardwaarde 'free' en dat is een afwaardering door een
      // aankoop.
      if (bestaandeRij) {
        await serviceDb.bijwerken("abonnementen", { club_id: "eq." + clubId }, {
          mollie_klant_id: klantId,
        });
      } else {
        await serviceDb.invoegen("abonnementen", {
          club_id: clubId,
          mollie_klant_id: klantId,
        });
      }
    }

    // ── 6. De betaling zelf ──────────────────────────────────
    //  sequenceType "first" is wat de machtiging oplevert waarmee
    //  betaling-melding straks een doorlopende incasso kan opzetten.
    //  De metadata is de draad terug: zonder club_id daarin weet de
    //  melding straks niet over welke club het ging.
    const betaling = await mollie.maakBetaling({
      amount: { value: centenNaarBedrag(bedragCent), currency: "EUR" },
      description: `TEAMTAKKIE ${pakket} (per ${termijn})`,
      redirectUrl: terugUrl,
      webhookUrl: deps.webhookUrl,
      sequenceType: "first",
      customerId: klantId,
      method: "ideal",
      metadata: { club_id: clubId, pakket, termijn },
    });

    // ── 7. De voorlopige boeking ─────────────────────────────
    //  Status 'open': er is nog niets betaald. Het bedrag dat hier in
    //  de boeken komt is het bedrag dat de club op zijn scherm zag —
    //  een voornemen. Wat Mollie straks meldt wint daarvan; zie
    //  server/18-betalingen.sql DEEL 3, stap 3.
    //
    //  Mislukt deze regel, dan is er bij Mollie wél een betaling
    //  aangemaakt. Dat is niet erg: verwerk_betaling() maakt de rij
    //  desnoods zelf aan (dezelfde weg als een verlenging). Daarom is
    //  een fout hier geen reden om de club zijn betaallink te
    //  onthouden — wel om het te loggen.
    try {
      await serviceDb.invoegen("betalingen", {
        mollie_betaling_id: betaling.id,
        club_id: clubId,
        club_naam: clubNaam,
        mollie_klant_id: klantId,
        pakket,
        termijn,
        bedrag_cent: bedragCent,
        valuta: betaling.amount?.currency ?? "EUR",
        status: "open",
        modus: betaling.mode === "live" ? "live" : "test",
      });
    } catch (_f) {
      deps.log("voorlopige boeking mislukt", {
        betaling: betaling.id,
        club_id: clubId,
      });
    }

    const kassa = betaling._links?.checkout?.href;
    if (typeof kassa !== "string" || kassa === "") {
      return fout("Betaling starten is niet gelukt", 502);
    }

    deps.log("betaling gestart", {
      betaling: betaling.id,
      klant: klantId,
      club_id: clubId,
      pakket,
      termijn,
    });

    // Alleen dit. Geen betaalnummer, geen klantnummer, geen sleutel:
    // de app heeft niets anders nodig dan het adres van de kassa.
    return antwoord({ checkout_url: kassa }, 200);
  } catch (f) {
    if (f instanceof MollieFout && f.code === "geen_sleutel") {
      // 503: dit is tijdelijk en ligt niet aan de gebruiker.
      return fout(GEEN_SLEUTEL_TEKST, 503);
    }
    deps.log("betaling starten mislukt", {
      club_id: clubId,
      soort: f instanceof Error ? f.name : "onbekend",
    });
    return fout("Betaling starten is niet gelukt", 502);
  }
}

/* De echte aansluitingen. Staat apart zodat een test hem nooit
   aanroept en er dus geen omgevingsvariabelen nodig zijn om deze
   module te kunnen importeren. */
export function standaardAfhankelijkheden(
  fetchFn: Fetcher = fetch,
): StartAfhankelijkheden {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return {
    gebruikerClient: (jwt) => maakDbClient({ url, sleutel: anon, jwt, fetchFn }),
    serviceClient: () => maakDbClient({ url, sleutel: service, fetchFn }),
    mollie: () => maakMollie(mollieSleutel(), fetchFn),
    webhookUrl: Deno.env.get("MOLLIE_WEBHOOK_URL") ??
      (url ? url + "/functions/v1/betaling-melding" : ""),
    terugUrl: Deno.env.get("APP_TERUG_URL") ?? STANDAARD_TERUG,
    log: (bericht, velden) => console.log(bericht, velden ?? {}),
  };
}

if (import.meta.main) {
  Deno.serve((verzoek) => behandelStart(verzoek, standaardAfhankelijkheden()));
}
