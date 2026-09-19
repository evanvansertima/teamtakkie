// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — de Mollie-kant, gedeeld door beide edge functions
//  ─────────────────────────────────────────────────────────────
//  Hier staat alles wat zowel betaling-starten als betaling-melding
//  nodig heeft: de prijzen, het omrekenen van centen naar het formaat
//  dat Mollie wil, en de vier aanroepen naar Mollie zelf.
//
//  WAAROM ÉÉN BESTAND EN NIET TWEE KEER HETZELFDE
//  De twee functies moeten het over exact hetzelfde bedrag hebben. Zou
//  betaling-starten € 6,99 naar Mollie sturen en betaling-melding het
//  bedrag ergens anders vandaan halen, dan is een verschil tussen die
//  twee pas te zien als er echt geld is gemoeid. Eén bron dus.
//
//  WAAROM fetch EEN PARAMETER IS
//  Elke aanroep naar Mollie loopt via een meegegeven fetch-functie, met
//  de echte fetch als standaardwaarde. Dat is het enige wat deze code
//  testbaar maakt zonder een werkende Mollie-sleutel: een test geeft
//  een nagemaakte fetch mee en kan dan zien wat er precies naar Mollie
//  zou zijn gegaan. Zonder die parameter is er geen enkele manier om te
//  bewijzen dat het juiste bedrag wordt verstuurd — behalve door het te
//  proberen met echt geld.
// ══════════════════════════════════════════════════════════════

export type Fetcher = typeof fetch;

/* Wat een pakket kost, in CENTEN. Overgenomen uit
   docs/pakketten-besluit.md (het besluit van 11 september); dat
   document is leidend. Wijkt dit daarvan af, dan is dit fout.

   Dezelfde afweging als bij PAKKET_PRIJS in src/app.jsx: de prijs
   staat in het bestand en niet in een tabel op de server. Het nadeel
   daarvan is bewust genomen — een prijswijziging is een uitrol
   (`supabase functions deploy`), geen knop op de server. Wat het
   oplevert is belangrijker: er is geen tabel die iemand kan wijzigen
   om zichzelf een korting te geven, en er is geen moment waarop de
   prijs op het scherm en de prijs bij de incasso uit elkaar kunnen
   lopen.

   De jaarprijs staat voluit en wordt NIET uitgerekend uit de
   maandprijs: twee maanden korting is een besluit, geen som.

   Free staat hier met opzet niet in. Voor gratis wordt niet betaald,
   dus een aanvraag voor 'free' hoort een nette fout op te leveren en
   geen betaling van € 0,-. */
export const PRIJZEN: Record<string, Record<string, number>> = {
  coach: { maand: 699, jaar: 6990 },   // € 6,99  /  € 69,90
  club: { maand: 4900, jaar: 49000 },  // € 49,00 /  € 490,00
};

/* De vorm van een Mollie-betaalnummer. Deze staat hier en niet in
   betaling-melding zelf, omdat hij de eerste zeef is: alles wat hier
   niet doorheen komt, gaat nooit richting Mollie. Dat scheelt bij een
   stortvloed aan onzinmeldingen een even grote stortvloed aan
   aanvragen bij Mollie — en die zou Mollie op óns conto schrijven. */
export const BETAALNUMMER_VORM = /^tr_[A-Za-z0-9]{5,64}$/;

/* De tekst die de gebruiker ziet zolang Evan nog op goedkeuring van
   Mollie wacht. Met opzet een eigen zin en geen technische fout: een
   kale crash levert een 500 zonder uitleg op, en dan staat er in de
   app "er ging iets mis" terwijl er niets mis is behalve dat het
   aansluiten nog moet gebeuren. */
export const GEEN_SLEUTEL_TEKST = "Mollie is nog niet aangesloten";

/* Eén foutsoort voor alles wat er bij Mollie mis kan gaan, met een
   korte code erbij zodat de aanroeper kan beslissen wat hij ermee
   doet (een ontbrekende sleutel is iets anders dan een storing).

   De boodschap in deze fout is ALTIJD zelfgeschreven en bevat nooit
   het antwoord van Mollie. Dat is geen netheid maar een eis: in zo'n
   antwoord kunnen een rekeningnummer, een naam of de sleutel zelf
   staan, en een foutmelding komt uiteindelijk ergens in een logboek
   of op een scherm terecht. */
export class MollieFout extends Error {
  code: string;
  constructor(code: string, boodschap: string) {
    super(boodschap);
    this.name = "MollieFout";
    this.code = code;
  }
}

/* Haalt de geheime sleutel uit de omgeving. Ontbreekt hij, dan een
   nette fout in plaats van een crash — want vandaag (19 september
   2026) ontbreekt hij écht: het Mollie-account is aangevraagd en nog
   niet goedgekeurd.

   env is een parameter zodat een test dit kan nabootsen zonder
   Deno.env aan te raken (en dus zonder --allow-env). */
export function mollieSleutel(
  env: { get(naam: string): string | undefined } = Deno.env,
): string {
  const sleutel = env.get("MOLLIE_API_KEY");
  if (!sleutel || sleutel.trim() === "") {
    throw new MollieFout("geen_sleutel", GEEN_SLEUTEL_TEKST);
  }
  return sleutel.trim();
}

/* Welke prijs hoort bij dit pakket en deze termijn? Geeft null bij
   alles wat we niet kennen.

   Dit is de enige plek waar een bedrag vandaan mag komen. De browser
   stuurt nooit een bedrag mee, en als hij het wél doet wordt het hier
   niet gebruikt — zie de test "een bedrag uit de body wordt genegeerd". */
export function prijsCent(pakket: unknown, termijn: unknown): number | null {
  if (typeof pakket !== "string" || typeof termijn !== "string") return null;
  const rij = PRIJZEN[pakket];
  if (!rij) return null;
  const bedrag = rij[termijn];
  return typeof bedrag === "number" ? bedrag : null;
}

/* 699 wordt "6.99". Mollie wil het bedrag als tekst met precies twee
   decimalen en een punt, niet als getal — een getal zou onderweg een
   kommagetal worden en dat is de bekendste rekenfout met geld. */
export function centenNaarBedrag(cent: number): string {
  return (cent / 100).toFixed(2);
}

/* En terug: "6.99" wordt 699. Math.round is hier niet overdreven
   voorzichtig maar nodig: 6.99 * 100 is in elke programmeertaal met
   kommagetallen 698.9999999999999, en dan zou de boekhouding er een
   cent naast zitten. */
export function bedragNaarCenten(waarde: unknown): number | null {
  if (typeof waarde !== "string" && typeof waarde !== "number") return null;
  const getal = typeof waarde === "number" ? waarde : parseFloat(waarde);
  if (!isFinite(getal)) return null;
  return Math.round(getal * 100);
}

/* Het interval zoals Mollie Subscriptions het wil. */
export function mollieInterval(termijn: string): string | null {
  if (termijn === "maand") return "1 month";
  if (termijn === "jaar") return "12 months";
  return null;
}

/* Vanaf wanneer mag de automatische incasso lopen?

   DIT IS GEEN DETAIL. Maak je een subscription zonder startDate, dan
   incasseert Mollie meteen — bovenop de betaling die net is gedaan.
   De club betaalt dan twee keer voor dezelfde eerste maand. De eerste
   incasso hoort dus precies één periode ná de eerste betaling te
   liggen.

   De datum komt terug als "JJJJ-MM-DD", het formaat dat Mollie wil.
   Een maand erbij op 31 januari geeft in JavaScript 3 maart; setDate(1)
   vooraf voorkomt dat, waarna we de dag terugzetten op de laatst
   mogelijke dag van die maand. */
export function startDatumVolgendePeriode(
  betaaldOp: Date,
  termijn: string,
): string {
  const d = new Date(Date.UTC(
    betaaldOp.getUTCFullYear(),
    betaaldOp.getUTCMonth(),
    betaaldOp.getUTCDate(),
  ));
  const dag = d.getUTCDate();
  d.setUTCDate(1);
  if (termijn === "jaar") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  // Hoeveel dagen heeft de maand waar we nu in staan?
  const laatsteDag = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
    .getUTCDate();
  d.setUTCDate(Math.min(dag, laatsteDag));
  return d.toISOString().slice(0, 10);
}

// ── Wat Mollie terugstuurt ───────────────────────────────────
//  Alleen de velden die wij gebruiken. Met opzet niet compleet: wat
//  hier niet staat, lezen we ook niet, en wat we niet lezen kan ook
//  niet per ongeluk in een logboek belanden.

export interface MollieKlant {
  id: string;
}

export interface MollieBetaling {
  id: string;
  status: string;
  mode: "test" | "live";
  amount: { value: string; currency: string };
  customerId?: string | null;
  paidAt?: string | null;
  metadata?: Record<string, string> | null;
  _links?: { checkout?: { href: string } | null } | null;
}

export interface MollieAbonnement {
  id: string;
}

export interface MollieClient {
  maakKlant(gegevens: { naam?: string; email?: string }): Promise<MollieKlant>;
  maakBetaling(gegevens: Record<string, unknown>): Promise<MollieBetaling>;
  /* null betekent: Mollie kent dit betaalnummer niet (404). Dat is
     geen storing maar een antwoord — zie betaling-melding stap 2. */
  haalBetaling(id: string): Promise<MollieBetaling | null>;
  maakAbonnement(
    klantId: string,
    gegevens: Record<string, unknown>,
  ): Promise<MollieAbonnement>;
}

const MOLLIE_BASIS = "https://api.mollie.com/v2";

/* Maakt het setje aanroepen naar Mollie, met de sleutel en de
   fetch-functie erin opgesloten. Alle vier de methodes gebruiken
   dezelfde headers en dezelfde foutafhandeling; dat is precies wat je
   wilt, want een lek ontstaat in de uitzondering. */
export function maakMollie(sleutel: string, fetchFn: Fetcher = fetch): MollieClient {
  async function vraag(
    methode: string,
    pad: string,
    body?: unknown,
  ): Promise<{ status: number; data: unknown }> {
    let antwoord: Response;
    try {
      antwoord = await fetchFn(MOLLIE_BASIS + pad, {
        method: methode,
        headers: {
          "Authorization": "Bearer " + sleutel,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (_fout) {
      // De oorspronkelijke fout gaat met opzet NIET mee naar boven:
      // daar kan de volledige aanvraag in staan, inclusief de
      // Authorization-header met de geheime sleutel.
      throw new MollieFout("onbereikbaar", "Mollie is niet bereikbaar");
    }
    let data: unknown = null;
    try {
      data = await antwoord.json();
    } catch (_fout) {
      data = null;
    }
    return { status: antwoord.status, data };
  }

  function eisGelukt(status: number, pad: string): void {
    if (status >= 200 && status < 300) return;
    // Alleen de statuscode en het pad, nooit het antwoord zelf.
    throw new MollieFout(
      "mollie_fout",
      `Mollie antwoordde met status ${status} op ${pad}`,
    );
  }

  return {
    async maakKlant(gegevens) {
      // Mollie accepteert een klant zonder naam en zonder e-mail. Wij
      // sturen alleen mee wat we hebben: lege velden meesturen levert
      // bij Mollie een lege naam op die er daarna in het dashboard
      // staat, en dat is verwarrender dan niets.
      const body: Record<string, unknown> = {};
      if (gegevens.naam) body.name = gegevens.naam;
      if (gegevens.email) body.email = gegevens.email;
      const { status, data } = await vraag("POST", "/customers", body);
      eisGelukt(status, "/customers");
      const klant = data as MollieKlant;
      if (!klant || typeof klant.id !== "string") {
        throw new MollieFout("onverwacht", "Mollie gaf geen klantnummer terug");
      }
      return klant;
    },

    async maakBetaling(gegevens) {
      const { status, data } = await vraag("POST", "/payments", gegevens);
      eisGelukt(status, "/payments");
      const betaling = data as MollieBetaling;
      if (!betaling || typeof betaling.id !== "string") {
        throw new MollieFout("onverwacht", "Mollie gaf geen betaalnummer terug");
      }
      return betaling;
    },

    async haalBetaling(id) {
      const { status, data } = await vraag("GET", "/payments/" + id);
      // 404: dit betaalnummer bestaat niet bij ons account. Geen fout —
      // het antwoord op de vraag "is dit van ons?" is dan gewoon nee.
      if (status === 404) return null;
      eisGelukt(status, "/payments/{id}");
      return data as MollieBetaling;
    },

    async maakAbonnement(klantId, gegevens) {
      const pad = `/customers/${klantId}/subscriptions`;
      const { status, data } = await vraag("POST", pad, gegevens);
      eisGelukt(status, "/customers/{id}/subscriptions");
      const abo = data as MollieAbonnement;
      if (!abo || typeof abo.id !== "string") {
        throw new MollieFout("onverwacht", "Mollie gaf geen abonnementsnummer terug");
      }
      return abo;
    },
  };
}
