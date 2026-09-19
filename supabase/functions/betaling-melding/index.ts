// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — edge function "betaling-melding" (de Mollie-webhook)
//  ─────────────────────────────────────────────────────────────
//  WAT DIT DOET
//  Mollie belt aan: "er is iets gebeurd met betaling tr_xxx." Deze
//  functie zoekt zélf bij Mollie op wát er gebeurd is, en als dat
//  "betaald" is, zet hij dat om in een pakket via
//  public.verwerk_betaling().
//
//  DE ZIN DIE DE HELE BEVEILIGING DRAAGT
//  GELOOF NOOIT DE MELDING ZELF. Deze functie staat met opzet open
//  voor iedereen (verify_jwt = false, want Mollie heeft geen account
//  bij ons), dus letterlijk iedereen kan hier "id=tr_iets" naartoe
//  sturen. De melding is dáárom niet meer dan een tikje op de
//  schouder: het bewijs is het antwoord van Mollie op onze eigen
//  vraag, opgehaald met onze eigen geheime sleutel. Alles wat er in de
//  binnenkomende body staat behalve het betaalnummer wordt genegeerd —
//  en het betaalnummer zelf wordt alleen gebruikt om het aan Mollie te
//  vragen.
//
//  WAAROM WELKE STATUSCODE TERUG
//  Mollie probeert een melding opnieuw zolang hij geen 200 krijgt.
//  Daarom:
//    · 400 — het betaalnummer heeft niet eens de juiste vorm. Onzin,
//            nooit van Mollie afkomstig, niets om opnieuw te proberen.
//    · 200 — begrepen en klaar. Ook bij "niet van ons" en bij "nog
//            niet betaald": dat zijn geen fouten maar antwoorden.
//    · 500 — het lag aan ons (Mollie onbereikbaar, database stuk).
//            Alleen dan mag Mollie het opnieuw proberen.
//
//  DE LOGBOEK-EIS (Veerle)
//  Nooit het volledige antwoord van Mollie loggen. Daar staan de naam
//  en het rekeningnummer van de betaler in, en dat is een
//  persoonsgegeven dat in een logboek niets te zoeken heeft. Alleen
//  het betaalnummer, de status, het klantnummer en het club-id.
//
//  UITROLLEN (kan pas als de Mollie-sleutel er is):
//      supabase functions deploy betaling-melding --no-verify-jwt
//  De instelling staat ook in supabase/config.toml, zodat hij niet van
//  een vergeten vlaggetje op de opdrachtregel afhangt.
// ══════════════════════════════════════════════════════════════

import {
  bedragNaarCenten,
  BETAALNUMMER_VORM,
  centenNaarBedrag,
  type Fetcher,
  maakMollie,
  type MollieClient,
  MollieFout,
  mollieInterval,
  mollieSleutel,
  prijsCent,
  startDatumVolgendePeriode,
} from "../_gedeeld/mollie.ts";
import { type DbClient, maakDbClient } from "../_gedeeld/supabase.ts";

export interface MeldingAfhankelijkheden {
  /* Altijd de SERVICE-sleutel: verwerk_betaling() laat niets anders
     door (twee sloten, server/18-betalingen.sql DEEL 3), en
     public.abonnementen heeft met opzet geen schrijfregel. */
  serviceClient(): DbClient;
  mollie(): MollieClient;
  log(bericht: string, velden?: Record<string, unknown>): void;
  /* Alleen zodat een test een vaste tijd kan afdwingen. */
  nu(): Date;
}

function kort(tekst: string, status: number): Response {
  return new Response(tekst, { status });
}

export async function behandelMelding(
  verzoek: Request,
  deps: MeldingAfhankelijkheden,
): Promise<Response> {
  if (verzoek.method !== "POST") return kort("alleen POST", 405);

  // ── 1. VORMCONTROLE EERST ──────────────────────────────────
  //  Mollie stuurt form-encoded (id=tr_xxx), niet JSON. Wie hier
  //  req.json() gebruikt krijgt bij élke echte melding een fout, en
  //  dat valt pas op als er geld binnenkomt dat niet verwerkt wordt.
  //
  //  De vormcontrole staat vóór de vraag aan Mollie, en dat is geen
  //  volgordekwestie: dit adres staat open voor iedereen. Zonder deze
  //  zeef kan iemand met duizend onzinmeldingen duizend aanvragen bij
  //  Mollie veroorzaken, op ons account.
  let id = "";
  try {
    const formulier = await verzoek.formData();
    const waarde = formulier.get("id");
    id = typeof waarde === "string" ? waarde.trim() : "";
  } catch (_f) {
    return kort("onleesbare melding", 400);
  }
  if (!BETAALNUMMER_VORM.test(id)) {
    return kort("ongeldig betaalnummer", 400);
  }

  let mollie: MollieClient;
  try {
    mollie = deps.mollie();
  } catch (f) {
    if (f instanceof MollieFout && f.code === "geen_sleutel") {
      // Zolang de sleutel ontbreekt kunnen we niets navragen. 500,
      // zodat Mollie het opnieuw probeert zodra hij er wél is — en
      // geen betaling stilzwijgend verdwijnt.
      deps.log("melding niet verwerkt: Mollie nog niet aangesloten", { betaling: id });
      return kort("mollie nog niet aangesloten", 500);
    }
    throw f;
  }

  const db = deps.serviceClient();

  try {
    // ── 2. ZELF NAVRAGEN BIJ MOLLIE ──────────────────────────
    const betaling = await mollie.haalBetaling(id);
    if (betaling === null) {
      // Mollie kent dit nummer niet onder ons account. Dus: niet van
      // ons. 200, want opnieuw proberen verandert daar niets aan.
      deps.log("melding over een onbekende betaling", { betaling: id });
      return kort("onbekend", 200);
    }

    // ── 3. NOG NIET BETAALD? DAN NIETS DOEN ──────────────────
    //  Mollie meldt bij élke statuswijziging: open, canceled, expired,
    //  failed, paid. Alles behalve 'paid' is gewoon nieuws, geen fout.
    if (betaling.status !== "paid") {
      // ── 3b. EEN MISLUKTE WISSELBETALING GEEFT DE CLAIM VRIJ ──
      //  Bij een wissel van pakket staat er een claim klaar die deze
      //  vereniging op slot zet (één wissel tegelijk, zie
      //  server/20-abonnement-wisselen.sql). Wordt er niet betaald, dan
      //  hoort dat slot meteen open: anders kan de club pas over zeven
      //  dagen opnieuw proberen, zonder te weten waarom.
      //
      //  Alleen bij een DEFINITIEF einde. 'open' en 'pending' zijn
      //  onderweg — daar is niets aan de hand en daar blijft de claim
      //  met opzet staan.
      //
      //  WAAROM ER EERST NAAR DE METADATA WORDT GEKEKEN
      //  Bij élke niet-betaalde melding in de database gaan kijken zou
      //  betekenen dat dit adres — dat met opzet voor iedereen open
      //  staat — met onzinmeldingen tot databasewerk is te verleiden.
      //  De metadata is hier géén bewijs (dat is ze nooit); ze bepaalt
      //  alleen of het de moeite waard is om het te vrágen. Het enige
      //  wat er daarna gebeurt is dat een claim die bij een MISLUKTE
      //  betaling hoort wordt vrijgegeven, en die status komt van
      //  Mollie zelf.
      const soortMeta = (betaling.metadata ?? {}) as Record<string, unknown>;
      if (
        soortMeta.soort === "wissel" &&
        (betaling.status === "failed" || betaling.status === "canceled" ||
          betaling.status === "expired")
      ) {
        const claims = await db.selecteer("abonnement_wissels", {
          select: "id",
          mollie_betaling_id: "eq." + id,
          afgerond_op: "is.null",
          limit: "1",
        });
        if (claims.length > 0 && typeof claims[0].id === "string") {
          await db.bijwerken("abonnement_wissels", { id: "eq." + claims[0].id }, {
            status: "mislukt",
            afgerond_op: deps.nu().toISOString(),
          });
          deps.log("wisselpoging vrijgegeven", {
            betaling: id,
            status: betaling.status,
          });
        }
      }

      deps.log("melding zonder betaling", {
        betaling: id,
        status: betaling.status,
      });
      return kort("niets te doen", 200);
    }

    // ── 4. WAT ER PRECIES IS BETAALD ─────────────────────────
    const bedragCent = bedragNaarCenten(betaling.amount?.value);
    const valuta = typeof betaling.amount?.currency === "string"
      ? betaling.amount.currency
      : "EUR";
    const modus = betaling.mode === "live" ? "live" : "test";
    const klantId = typeof betaling.customerId === "string" ? betaling.customerId : null;
    const betaaldOp = typeof betaling.paidAt === "string" && betaling.paidAt
      ? betaling.paidAt
      : deps.nu().toISOString();

    if (bedragCent === null) {
      // verwerk_betaling() weigert een melding zonder bedrag met een
      // harde fout. Die fout hier zelf afvangen is netter dan hem
      // uitlokken: dan staat er precies één regel in het logboek in
      // plaats van een mislukte database-aanroep.
      deps.log("melding zonder leesbaar bedrag", { betaling: id, status: "paid" });
      return kort("geen bedrag", 500);
    }

    const meta = (betaling.metadata ?? {}) as Record<string, unknown>;
    let clubId = typeof meta.club_id === "string" ? meta.club_id : "";
    let pakket = typeof meta.pakket === "string" ? meta.pakket : "";
    let termijn = typeof meta.termijn === "string" ? meta.termijn : "";

    // ── 4a. IS DIT EEN WISSEL VAN PAKKET? ────────────────────
    //  DE WISSEL EERST, EN NIET OP DE METADATA. Een wisselbetaling ziet
    //  er bij Mollie precies zo uit als een verlenging; het enige echte
    //  onderscheid is dat wij er zélf een regel voor hebben klaargezet
    //  in public.abonnement_wissels. Die regel is dus de wissel, en de
    //  metadata is hoogstens een aanwijzing.
    //
    //  Zou deze melding bij de gewone verwerk_betaling() belanden, dan
    //  telde die er een hele periode bij op — precies de fout die dit
    //  hele wisselwerk repareert. Die functie weigert zo'n betaalnummer
    //  daarom hard; dit is de routering die ervoor zorgt dat het nooit
    //  zover komt.
    //
    //  Met opzet ZONDER "afgerond_op is null": ook een al afgeronde
    //  wissel hoort hier langs te komen. Anders zou een tweede melding
    //  (Mollie herhaalt tot hij een 200 krijgt) alsnog bij de gewone
    //  functie uitkomen, en die weigert dan hard — waarna Mollie het
    //  eeuwig blijft proberen.
    const wisselRijen = await db.selecteer("abonnement_wissels", {
      select: "id,club_id,naar_pakket,termijn,afgerond_op",
      mollie_betaling_id: "eq." + id,
      limit: "1",
    });

    if (wisselRijen.length > 0) {
      const w = wisselRijen[0];
      const wisselClub = typeof w.club_id === "string" ? w.club_id : clubId;
      const wisselPakket = typeof w.naar_pakket === "string" ? w.naar_pakket : "";
      const wisselTermijn = typeof w.termijn === "string" ? w.termijn : termijn;

      if (
        !wisselClub || !wisselPakket ||
        (wisselTermijn !== "maand" && wisselTermijn !== "jaar")
      ) {
        // Een claim zonder club, pakket of termijn kan deze keten niet
        // zelf rechtzetten. 200 (herhalen helpt niet) en een duidelijke
        // regel in het logboek.
        deps.log("wisselbetaling met een onvolledige claim — met de hand na te lopen", {
          betaling: id,
          club_id: wisselClub,
          status: "paid",
        });
        return kort("wissel onvolledig", 200);
      }

      // Pakket en termijn komen uit de CLAIM en niet uit de metadata.
      // De functie zelf controleert dat trouwens nog een keer; dit is
      // de buitenste van die twee schillen.
      await db.rpc("verwerk_wissel_betaling", {
        p_mollie_id: id,
        p_club: wisselClub,
        p_pakket: wisselPakket,
        p_termijn: wisselTermijn,
        p_betaald_op: betaaldOp,
        p_bedrag_cent: bedragCent,
        p_modus: modus,
        p_mollie_klant: klantId,
        p_valuta: valuta,
      });

      deps.log("wisselbetaling verwerkt", {
        betaling: id,
        status: "paid",
        klant: klantId,
        club_id: wisselClub,
        naar: wisselPakket,
      });

      // ── De incasso naar het nieuwe bedrag ──────────────────
      //  GEEN nieuwe subscription: die bestaat al, en een tweede zou
      //  betekenen dat Mollie elke maand twee keer incasseert. Wel het
      //  bedrag ophogen — dit is het enige moment waarop dat kan.
      //
      //  Alleen als de wissel ook echt is doorgegaan. Is de betaling
      //  genegeerd (testmodus, of een bedrag van nul), dan staat het
      //  pakket nog op het oude en hoort de incasso dat ook te doen.
      const abo = await db.selecteer("abonnementen", {
        select: "pakket,mollie_subscription_id",
        club_id: "eq." + wisselClub,
        limit: "1",
      });
      const pakketNu = abo.length > 0 && typeof abo[0].pakket === "string"
        ? abo[0].pakket as string
        : "";
      const incasso = abo.length > 0 && typeof abo[0].mollie_subscription_id === "string"
        ? abo[0].mollie_subscription_id as string
        : "";
      const nieuwBedrag = prijsCent(wisselPakket, wisselTermijn);

      if (pakketNu !== wisselPakket) {
        deps.log("wisselbetaling niet toegekend — incasso blijft ongewijzigd", {
          betaling: id,
          club_id: wisselClub,
          pakket_nu: pakketNu,
        });
      } else if (!klantId || !incasso || nieuwBedrag === null) {
        deps.log("LET OP: pakket gewisseld zonder incasso bij te werken", {
          betaling: id,
          club_id: wisselClub,
          incasso: incasso ? "bekend" : "onbekend",
        });
      } else {
        await mollie.wijzigAbonnement(klantId, incasso, {
          amount: { value: centenNaarBedrag(nieuwBedrag), currency: valuta },
          description: `TEAMTAKKIE ${wisselPakket} (per ${wisselTermijn})`,
        });
        // PAS NA de bevestiging van Mollie. Dit veld betekent "wat
        // Mollie volgens ons afschrijft"; vooruitlopend invullen maakt
        // public.wissel_controle() waardeloos.
        await db.bijwerken("abonnementen", { club_id: "eq." + wisselClub }, {
          mollie_bedrag_cent: nieuwBedrag,
        });
        deps.log("incasso bijgewerkt na wissel", {
          betaling: id,
          club_id: wisselClub,
          abonnement: incasso,
        });
      }

      return kort("verwerkt", 200);
    }

    // ── 4b. EEN VERLENGING KOMT ZONDER METADATA BINNEN ───────
    //  Incasseert Mollie zelf via een subscription, dan is er geen
    //  betaling door ons gestart en dus ook geen metadata. Het
    //  klantnummer is dan de enige draad terug naar de club.
    //
    //  Pakket en termijn moeten er óók bij: verwerk_betaling() weigert
    //  een onbekend pakket of een onbekende termijn met een harde
    //  fout. Die halen we uit de laatste betaalde regel van dezelfde
    //  klant — dat is precies waarvoor de index betalingen_klant_idx
    //  in server/18-betalingen.sql bestaat.
    if (!clubId || !pakket || !termijn) {
      if (!klantId) {
        deps.log("verlenging zonder club en zonder klantnummer", {
          betaling: id,
          status: "paid",
        });
        return kort("geen club te vinden", 200);
      }
      const abo = await db.selecteer("abonnementen", {
        select: "club_id,pakket",
        mollie_klant_id: "eq." + klantId,
        limit: "1",
      });
      if (abo.length > 0) {
        if (!clubId && typeof abo[0].club_id === "string") clubId = abo[0].club_id;
        if (!pakket && typeof abo[0].pakket === "string") pakket = abo[0].pakket as string;
      }
      if (!termijn || !pakket) {
        const eerder = await db.selecteer("betalingen", {
          select: "pakket,termijn",
          mollie_klant_id: "eq." + klantId,
          status: "eq.betaald",
          order: "verwerkt_op.desc",
          limit: "1",
        });
        if (eerder.length > 0) {
          if (!pakket && typeof eerder[0].pakket === "string") {
            pakket = eerder[0].pakket as string;
          }
          if (!termijn && typeof eerder[0].termijn === "string") {
            termijn = eerder[0].termijn as string;
          }
        }
      }
      if (!clubId) {
        // Onbekend klantnummer. Wel loggen — zonder gevoelige velden —
        // en 200 terug: opnieuw proberen levert hetzelfde op.
        deps.log("verlenging voor een onbekend klantnummer", {
          betaling: id,
          klant: klantId,
          status: "paid",
        });
        return kort("onbekende klant", 200);
      }
      if (!pakket || !termijn) {
        // Wel een club, maar niet te achterhalen wát er verlengd
        // wordt. 200 (herhalen helpt niet) en een duidelijke regel in
        // het logboek, want dit hoort Evan met de hand recht te
        // zetten met zet_pakket().
        deps.log("verlenging zonder pakket of termijn — met de hand na te lopen", {
          betaling: id,
          klant: klantId,
          club_id: clubId,
          status: "paid",
        });
        return kort("pakket onbekend", 200);
      }
    }

    // ── 4c. DE AANROEP DIE HET PAKKET TOEKENT ────────────────
    //  Parameters in exact de volgorde uit server/18-betalingen.sql.
    //  Die functie is idempotent: een tweede melding van dezelfde
    //  betaling raakt nul rijen en geeft geen tweede maand.
    await db.rpc("verwerk_betaling", {
      p_mollie_id: id,
      p_club: clubId,
      p_pakket: pakket,
      p_termijn: termijn,
      p_betaald_op: betaaldOp,
      p_bedrag_cent: bedragCent,
      p_modus: modus,
      p_mollie_klant: klantId,
      p_valuta: valuta,
    });

    deps.log("betaling verwerkt", {
      betaling: id,
      status: "paid",
      klant: klantId,
      club_id: clubId,
    });

    // ── 5. DE DOORLOPENDE INCASSO OPZETTEN ───────────────────
    //  Pas ná verwerk_betaling(), en dat is met opzet: het pakket is
    //  het enige dat de club echt heeft gekocht. Mislukt deze stap,
    //  dan komt er een 500 en probeert Mollie de hele melding opnieuw
    //  — verwerk_betaling() doet dan niets meer (dubbele melding), en
    //  de subscription krijgt een tweede kans. Andersom zou een
    //  mislukte boeking herhaald worden terwijl de subscription al
    //  staat, en dan komen er twee.
    //
    //  ALLEEN als er nog geen abonnementsnummer bekend is. Dat is de
    //  bescherming tegen twee subscriptions voor dezelfde klant bij
    //  een dubbele webhook — Mollie zou dan elke maand twee keer
    //  incasseren, en dat merk je pas bij de eerste boze club.
    if (klantId) {
      const abo = await db.selecteer("abonnementen", {
        select: "mollie_subscription_id",
        club_id: "eq." + clubId,
        limit: "1",
      });
      const alAanwezig = abo.length > 0 &&
        typeof abo[0].mollie_subscription_id === "string" &&
        (abo[0].mollie_subscription_id as string) !== "";
      const interval = mollieInterval(termijn);
      if (!alAanwezig && interval) {
        const abonnement = await mollie.maakAbonnement(klantId, {
          amount: { value: centenNaarBedrag(bedragCent), currency: valuta },
          interval,
          // Zonder startDate incasseert Mollie meteen — bovenop de
          // betaling die zojuist is gedaan. Zie de uitleg bij
          // startDatumVolgendePeriode() in _gedeeld/mollie.ts.
          startDate: startDatumVolgendePeriode(new Date(betaaldOp), termijn),
          description: `TEAMTAKKIE ${pakket} (per ${termijn})`,
        });
        await db.bijwerken("abonnementen", { club_id: "eq." + clubId }, {
          mollie_subscription_id: abonnement.id,
        });
        // En apart: wat Mollie vanaf nu afschrijft. Dat is een ander
        // feit dan "er ís een incasso" — het eerste is het bestaan
        // ervan, het tweede het bedrag — en ze worden los weggeschreven
        // zodat een mislukking van het tweede het eerste niet meeneemt.
        // Zonder deze regel is mollie_bedrag_cent vanaf dag één leeg
        // voor iedereen die gewoon een abonnement koopt, en meldt
        // public.wissel_controle() straks elke club als "onbekend".
        await db.bijwerken("abonnementen", { club_id: "eq." + clubId }, {
          mollie_bedrag_cent: bedragCent,
        });
        deps.log("doorlopende incasso aangezet", {
          betaling: id,
          klant: klantId,
          club_id: clubId,
          abonnement: abonnement.id,
        });
      }
    }

    return kort("verwerkt", 200);
  } catch (f) {
    // Mollie onbereikbaar of de database stuk: 500, zodat Mollie het
    // later opnieuw aanbiedt. Er is bij een halve mislukking niets
    // half weggeschreven — verwerk_betaling() is één opdracht, en de
    // subscription komt er pas na een geslaagde boeking.
    deps.log("melding mislukt", {
      betaling: id,
      soort: f instanceof Error ? f.name : "onbekend",
    });
    return kort("later opnieuw", 500);
  }
}

export function standaardAfhankelijkheden(
  fetchFn: Fetcher = fetch,
): MeldingAfhankelijkheden {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return {
    serviceClient: () => maakDbClient({ url, sleutel: service, fetchFn }),
    mollie: () => maakMollie(mollieSleutel(), fetchFn),
    log: (bericht, velden) => console.log(bericht, velden ?? {}),
    nu: () => new Date(),
  };
}

if (import.meta.main) {
  Deno.serve((verzoek) => behandelMelding(verzoek, standaardAfhankelijkheden()));
}
