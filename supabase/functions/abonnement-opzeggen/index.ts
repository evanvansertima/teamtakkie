// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — edge function "abonnement-opzeggen"
//  ─────────────────────────────────────────────────────────────
//  WAT DIT DOET
//  Twee dingen, met dezelfde voordeur:
//
//    · OPZEGGEN: de doorlopende incasso bij Mollie stoppen, en daarna
//      in de database vastleggen dat de vereniging heeft opgezegd. Het
//      pakket blijft tot en met de einddatum; daarna valt de club terug
//      naar Free (pakket_van_club, server/21-opzeggen.sql). Er komt
//      geen geld terug.
//    · INTREKKEN: zolang die einddatum nog niet voorbij is, kan de
//      eigenaar zich bedenken. Dan start er een nieuwe incasso op het
//      bestaande mandaat, die pas ingaat op de einddatum — er wordt
//      dus niets dubbel betaald en er hoeft niet opnieuw via iDEAL.
//
//  DE ZIN DIE ALLES DRAAGT: EERST MOLLIE, DAN DE DATABASE
//  De database zegt pas "opgezegd" als Mollie heeft bevestigd dat er
//  niet meer wordt afgeschreven. Andersom zou de app "opgezegd" tonen
//  terwijl er volgende maand gewoon weer geld van de rekening gaat — het
//  ergste wat deze knop kan doen. Zelfde regel als bij wisselen.
//
//  WAAROM HET ABONNEMENTSNUMMER NA OPZEGGEN LEEG WORDT
//  Het nummer betekent "hier loopt een incasso". Na opzeggen loopt er
//  geen meer. Laten staan zou betaling-melding laten denken dat er nog
//  een is, en dan maakt die bij een nieuwe aankoop ná de einddatum geen
//  nieuwe incasso aan. De geschiedenis staat in public.betalingen en in
//  het logboek hieronder.
//
//  DE BEVESTIGING PER E-MAIL
//  Besluit van Evan (29 september 2026): er komt een e-mail. Welke
//  maildienst is nog niet gekozen. Tot die tijd logt bevestig() alleen,
//  en zegt het antwoord eerlijk mail: false — de app belooft dan ook
//  geen mail. De tekst van de mail staat al klaar
//  (bevestigingsTekst), zodat het aansluiten straks alleen nog over
//  het versturen gaat.
//
//  verify_jwt blijft AAN (zie supabase/config.toml).
//
//  UITROLLEN (kan pas als server/21-opzeggen.sql gedraaid is):
//      supabase functions deploy abonnement-opzeggen
// ══════════════════════════════════════════════════════════════

import {
  beoordeelOpzegging,
  centenNaarBedrag,
  doorlopendeIncasso,
  type Fetcher,
  GEEN_SLEUTEL_TEKST,
  maakMollie,
  type MollieClient,
  MollieFout,
  mollieInterval,
  mollieSleutel,
  prijsCent,
  type WisselFeiten,
} from "../_gedeeld/mollie.ts";
import { type DbClient, maakDbClient } from "../_gedeeld/supabase.ts";

const UUID_VORM =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/* Wat er in de bevestigingsmail moet. Alleen feiten die de club zelf
   al kent; geen bedragen van Mollie, geen rekeningnummer. */
export interface Bevestiging {
  soort: "opzeggen" | "intrekken";
  naar: string;
  pakket: string;
  termijn: string | null;
  geldigTot: string;
}

export interface OpzegAfhankelijkheden {
  gebruikerClient(jwt: string): DbClient;
  serviceClient(): DbClient;
  mollie(): MollieClient;
  /* Verstuurt de bevestiging. true = verstuurd. Mag nooit gooien: een
     mislukte mail maakt een gelukte opzegging niet ongedaan. */
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

/* Elke fout krijgt een eigen, geschreven tekst — nooit het antwoord van
   Mollie of Postgres. Zie dezelfde regel in abonnement-wisselen. */
function fout(tekst: string, status: number): Response {
  return antwoord({ fout: tekst }, status);
}

function tekstOfNull(waarde: unknown): string | null {
  return typeof waarde === "string" && waarde !== "" ? waarde : null;
}
function getalOfNull(waarde: unknown): number | null {
  return typeof waarde === "number" && isFinite(waarde) ? waarde : null;
}

/* "JJJJ-MM-DD" in Nederlandse tijd. Om 00:30 's nachts is het in UTC
   nog gisteren; op de laatste dag van een abonnement zou intrekken dan
   een dag te vroeg geweigerd of toegestaan worden. */
export function vandaagInNederland(nu: Date): string {
  return nu.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

/* De tekst van de bevestigingsmail. Puur, zodat hij te toetsen is
   zonder iets te versturen. "19 december 2026", niet "2026-12-19":
   dit leest een penningmeester, geen database. */
const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni", "juli",
  "augustus", "september", "oktober", "november", "december",
];
export function bevestigingsTekst(b: Bevestiging): { onderwerp: string; tekst: string } {
  const [j, m, d] = b.geldigTot.split("-").map((x) => parseInt(x, 10));
  const datum = `${d} ${MAANDEN[m - 1] ?? ""} ${j}`;
  const naam = b.pakket === "club" ? "Club" : b.pakket === "coach" ? "Coach" : b.pakket;
  if (b.soort === "opzeggen") {
    return {
      onderwerp: "Je opzegging van TEAMTAKKIE " + naam,
      tekst: [
        "Hallo,",
        "",
        `We hebben je opzegging van TEAMTAKKIE ${naam} ontvangen.`,
        "",
        `Je houdt ${naam} tot en met ${datum}. Er wordt niets meer afgeschreven.`,
        "Daarna gaat je vereniging terug naar Free: één team en de basis.",
        "Je gegevens blijven staan, en je kunt ze altijd inzien en exporteren.",
        "",
        `Bedacht? Tot en met ${datum} kun je de opzegging intrekken in de app,`,
        "bij Instellingen › Abonnement.",
        "",
        "Groet,",
        "TEAMTAKKIE",
      ].join("\n"),
    };
  }
  return {
    onderwerp: "Je opzegging van TEAMTAKKIE " + naam + " is ingetrokken",
    tekst: [
      "Hallo,",
      "",
      `Je hebt je opzegging van TEAMTAKKIE ${naam} ingetrokken. Je abonnement loopt gewoon door.`,
      "",
      `De volgende afschrijving is op ${datum}, via dezelfde machtiging als eerst.`,
      "",
      "Groet,",
      "TEAMTAKKIE",
    ].join("\n"),
  };
}

export async function behandelOpzegging(
  verzoek: Request,
  deps: OpzegAfhankelijkheden,
): Promise<Response> {
  if (verzoek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (verzoek.method !== "POST") return fout("Alleen POST", 405);

  // ── 1. Wie klopt er aan? ───────────────────────────────────
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
  if (actie !== "opzeggen" && actie !== "intrekken") return fout("Onbekende actie", 400);

  const gebruikerDb = deps.gebruikerClient(jwt);
  const serviceDb = deps.serviceClient();

  try {
    // ── 2. Ben jij de eigenaar van deze club? ────────────────
    //  Letterlijk hetzelfde blok als in betaling-starten en
    //  abonnement-wisselen, met het filter op gebruiker_id: zonder dat
    //  filter zou een kijker de rij van de éigenaar vinden.
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
      deps.log("opzeggen geweigerd: geen eigenaar", { club_id: clubId, actie });
      return fout("Alleen de eigenaar van de club kan het abonnement opzeggen", 403);
    }

    // ── 3. De feiten ─────────────────────────────────────────
    //  Dezelfde functie als bij wisselen (server/21-opzeggen.sql DEEL 3):
    //  één plek die zegt hoe het abonnement ervoor staat.
    const feitenRijen = await serviceDb.rpc("wissel_gegevens", { p_club: clubId }) as
      | Record<string, unknown>[]
      | null;
    if (!Array.isArray(feitenRijen) || feitenRijen.length === 0) {
      return fout("Deze vereniging heeft geen abonnement", 400);
    }
    const rij = feitenRijen[0];
    const feiten: WisselFeiten = {
      pakket: typeof rij.pakket === "string" ? rij.pakket : "free",
      termijn: tekstOfNull(rij.termijn),
      geldigTot: tekstOfNull(rij.geldig_tot),
      totaleDagen: getalOfNull(rij.totale_dagen),
      resterendeDagen: getalOfNull(rij.resterende_dagen),
      mollieSubscriptionId: tekstOfNull(rij.mollie_subscription_id),
      wisselOnderweg: rij.wissel_onderweg === true,
      opgezegd: rij.opgezegd === true,
    };
    const klantId = tekstOfNull(rij.mollie_klant_id);

    // ── 4. Het oordeel ───────────────────────────────────────
    const oordeel = beoordeelOpzegging(feiten, actie, vandaagInNederland(deps.nu()));
    if (!oordeel.mag) {
      deps.log("opzeggen geweigerd", { club_id: clubId, actie, pakket: feiten.pakket });
      return fout(oordeel.reden, feiten.wisselOnderweg ? 409 : 400);
    }
    // Een dubbelklik: het staat al zoals gevraagd.
    if (oordeel.soort === "niets") {
      return antwoord({
        status: "ongewijzigd",
        opgezegd: feiten.opgezegd === true,
        geldig_tot: feiten.geldigTot,
      }, 200);
    }

    const geldigTot = feiten.geldigTot as string; // het oordeel eist hem in beide gevallen

    if (oordeel.soort === "opzeggen") {
      // ── 5. OPZEGGEN — eerst Mollie ────────────────────────
      if (feiten.mollieSubscriptionId && klantId) {
        try {
          await deps.mollie().stopAbonnement(klantId, feiten.mollieSubscriptionId);
        } catch (f) {
          if (f instanceof MollieFout && f.code === "geen_sleutel") {
            return fout(GEEN_SLEUTEL_TEKST, 503);
          }
          deps.log("opzeggen bij Mollie mislukt — niets veranderd", {
            club_id: clubId,
            soort: f instanceof Error ? f.name : "onbekend",
          });
          return fout("Opzeggen is nu niet gelukt. Er is niets veranderd; probeer het later opnieuw.", 502);
        }
        deps.log("incasso gestopt", {
          club_id: clubId,
          klant: klantId,
          abonnement: feiten.mollieSubscriptionId,
        });
      } else {
        // Een betaald pakket zonder incasso: er valt bij Mollie niets te
        // stoppen. Wel vastleggen, en het hoort in het logboek te staan,
        // want zo'n club zou eigenlijk niet bestaan.
        deps.log("LET OP: opgezegd zonder lopende incasso", {
          club_id: clubId,
          incasso: feiten.mollieSubscriptionId ? "bekend" : "onbekend",
          klant: klantId ? "bekend" : "onbekend",
        });
      }

      // ── 6. Dan pas de database ────────────────────────────
      //  Mislukt dit, dan is de incasso al gestopt maar staat de club
      //  nog als lopend. Een tweede poging herstelt dat vanzelf:
      //  stopAbonnement() telt een al gestopte incasso als gelukt.
      try {
        await serviceDb.bijwerken("abonnementen", { club_id: "eq." + clubId }, {
          opgezegd_op: deps.nu().toISOString(),
          mollie_subscription_id: null,
          mollie_bedrag_cent: null,
        });
      } catch (_f) {
        deps.log("LET OP: incasso gestopt, opzegging niet vastgelegd", { club_id: clubId });
        return fout(
          "De incasso is gestopt, maar het vastleggen lukte niet. Probeer het nog een keer.",
          502,
        );
      }

      const mail = ik.email
        ? await veiligBevestigen(deps, {
          soort: "opzeggen",
          naar: ik.email,
          pakket: feiten.pakket,
          termijn: feiten.termijn,
          geldigTot,
        })
        : false;
      deps.log("opgezegd", { club_id: clubId, geldig_tot: geldigTot, mail });
      return antwoord({ status: "opgezegd", geldig_tot: geldigTot, pakket: feiten.pakket, mail }, 200);
    }

    // ── 7. INTREKKEN — eerst een nieuwe incasso bij Mollie ────
    if (!klantId) {
      return fout("We kunnen deze vereniging niet bij de betaaldienst vinden. Neem contact op.", 400);
    }
    const termijn = feiten.termijn as string;
    // Maandelijks, ook na een jaaraankoop (doorlopendeIncasso). Het
    // oordeel heeft al gecontroleerd dat pakket en termijn bekend zijn.
    const incasso = doorlopendeIncasso(feiten.pakket) as { bedragCent: number; interval: string };
    const bedragCent = incasso.bedragCent;
    const mollie = deps.mollie();
    let nieuwId = "";
    try {
      const abo = await mollie.maakAbonnement(klantId, {
        amount: { value: centenNaarBedrag(bedragCent), currency: "EUR" },
        interval: incasso.interval,
        // De einddatum is betaald. De eerste nieuwe afschrijving hoort
        // dáár, niet vandaag — anders betaalt de club een periode dubbel.
        startDate: geldigTot,
        description: `TEAMTAKKIE ${feiten.pakket} (per maand)`,
      });
      nieuwId = abo.id;
    } catch (f) {
      if (f instanceof MollieFout && f.code === "geen_sleutel") {
        return fout(GEEN_SLEUTEL_TEKST, 503);
      }
      // Meestal: de machtiging is niet meer geldig. Dan kan alleen een
      // nieuwe betaling via iDEAL een nieuwe machtiging geven, en dat is
      // na de einddatum een gewone nieuwe aankoop.
      deps.log("intrekken bij Mollie mislukt — opzegging blijft staan", {
        club_id: clubId,
        soort: f instanceof Error ? f.name : "onbekend",
      });
      return fout(
        "Intrekken is niet gelukt; je opzegging staat nog. Probeer het later opnieuw of neem contact op.",
        502,
      );
    }

    try {
      await serviceDb.bijwerken("abonnementen", { club_id: "eq." + clubId }, {
        opgezegd_op: null,
        mollie_subscription_id: nieuwId,
        mollie_bedrag_cent: bedragCent,
      });
    } catch (_f) {
      // Hier mag het NIET blijven staan zoals het is: bij Mollie loopt
      // nu een incasso waar de database niets van weet, en een tweede
      // poging zou er een tweede bij maken. Dus de nieuwe meteen weer
      // stoppen, zodat alles terug is bij "opgezegd".
      deps.log("LET OP: nieuwe incasso niet vastgelegd — wordt weer gestopt", {
        club_id: clubId,
        abonnement: nieuwId,
      });
      try {
        await mollie.stopAbonnement(klantId, nieuwId);
      } catch (_g) {
        deps.log("LET OP: losse incasso bij Mollie — met de hand stoppen", {
          club_id: clubId,
          klant: klantId,
          abonnement: nieuwId,
        });
      }
      return fout("Intrekken is niet gelukt; je opzegging staat nog. Probeer het nog een keer.", 502);
    }

    const mail = ik.email
      ? await veiligBevestigen(deps, {
        soort: "intrekken",
        naar: ik.email,
        pakket: feiten.pakket,
        termijn,
        geldigTot,
      })
      : false;
    deps.log("opzegging ingetrokken", { club_id: clubId, abonnement: nieuwId, mail });
    return antwoord({ status: "ingetrokken", geldig_tot: geldigTot, pakket: feiten.pakket, mail }, 200);
  } catch (f) {
    if (f instanceof MollieFout && f.code === "geen_sleutel") {
      return fout(GEEN_SLEUTEL_TEKST, 503);
    }
    deps.log("opzeggen mislukt", {
      club_id: clubId,
      actie,
      soort: f instanceof Error ? f.name : "onbekend",
    });
    return fout("Het is nu niet gelukt. Probeer het later opnieuw.", 502);
  }
}

/* bevestig() hoort niet te gooien, maar een fout in een maildienst
   mag hoe dan ook nooit een gelukte opzegging als mislukt melden. */
async function veiligBevestigen(deps: OpzegAfhankelijkheden, b: Bevestiging): Promise<boolean> {
  try {
    return await deps.bevestig(b);
  } catch (_f) {
    deps.log("bevestigingsmail mislukt", { soort: b.soort });
    return false;
  }
}

export function standaardAfhankelijkheden(fetchFn: Fetcher = fetch): OpzegAfhankelijkheden {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const log = (bericht: string, velden?: Record<string, unknown>) =>
    console.log(bericht, velden ?? {});
  return {
    gebruikerClient: (jwt) => maakDbClient({ url, sleutel: anon, jwt, fetchFn }),
    serviceClient: () => maakDbClient({ url, sleutel: service, fetchFn }),
    mollie: () => maakMollie(mollieSleutel(), fetchFn),
    // Nog geen maildienst gekozen (zie bovenaan). Het onderwerp wordt
    // gelogd zodat te zien is dát er een mail had moeten gaan; het
    // e-mailadres met opzet niet.
    bevestig: (b) => {
      log("bevestigingsmail nog niet aangesloten", { onderwerp: bevestigingsTekst(b).onderwerp });
      return Promise.resolve(false);
    },
    log,
    nu: () => new Date(),
  };
}

if (import.meta.main) {
  Deno.serve((verzoek) => behandelOpzegging(verzoek, standaardAfhankelijkheden()));
}
