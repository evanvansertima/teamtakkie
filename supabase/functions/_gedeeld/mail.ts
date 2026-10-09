// ══════════════════════════════════════════════════════════════
//  De bevestigingsmail versturen — via Brevo
//  ─────────────────────────────────────────────────────────────
//  Besluit van Evan (29 september en 9 oktober 2026): de bevestigingen
//  gaan per e-mail, via Brevo (Frans, dus binnen de EU). Bij herroepen is
//  zo'n bevestiging wettelijk verplicht; zie docs/opzeggen-plan.md.
//
//  WAT ER NODIG IS (als geheimen bij Supabase, nooit in de code):
//      BREVO_API_KEY         de sleutel uit Brevo › SMTP & API › API Keys
//      MAIL_AFZENDER_EMAIL   het adres waarvandaan de mail komt — moet in
//                            Brevo als afzender zijn geverifieerd
//      MAIL_AFZENDER_NAAM    optioneel, standaard "TEAMTAKKIE"
//  Ontbreekt een van de eerste twee, dan wordt er niets verstuurd en
//  zegt de functie dat eerlijk (false) — de app belooft dan ook geen mail.
//
//  WAT ER NOOIT IN EEN LOGBOEK KOMT: de sleutel, het e-mailadres van de
//  ontvanger, en het antwoord van Brevo (daar kan het adres in staan).
//  Alleen de statuscode.
// ══════════════════════════════════════════════════════════════

import { type Bevestiging, bevestigingsTekst } from "./bevestiging.ts";

type Fetcher = typeof fetch;
type Logger = (bericht: string, velden?: Record<string, unknown>) => void;

const BREVO_ADRES = "https://api.brevo.com/v3/smtp/email";

export interface MailInstellingen {
  sleutel: string;
  afzenderEmail: string;
  afzenderNaam: string;
}

/* Leest de instellingen uit de omgeving. null = niet (volledig)
   aangesloten. */
export function leesMailInstellingen(
  env: { get(naam: string): string | undefined },
): MailInstellingen | null {
  const sleutel = (env.get("BREVO_API_KEY") ?? "").trim();
  const afzenderEmail = (env.get("MAIL_AFZENDER_EMAIL") ?? "").trim();
  if (!sleutel || !afzenderEmail) return null;
  return {
    sleutel,
    afzenderEmail,
    afzenderNaam: (env.get("MAIL_AFZENDER_NAAM") ?? "").trim() || "TEAMTAKKIE",
  };
}

/* Maakt de functie die een bevestiging verstuurt. Geeft true als Brevo
   de mail heeft aangenomen (201, of 202 voor ingepland), anders false.
   Werpt nooit: een mislukte mail maakt een gelukte opzegging niet
   ongedaan — de functies loggen dan zelf een LET OP. */
export function maakBevestiger(
  instellingen: MailInstellingen | null,
  log: Logger,
  fetchFn: Fetcher = fetch,
): (b: Bevestiging) => Promise<boolean> {
  if (!instellingen) {
    return (b) => {
      log("bevestigingsmail nog niet aangesloten", { onderwerp: bevestigingsTekst(b).onderwerp });
      return Promise.resolve(false);
    };
  }
  return async (b) => {
    const { onderwerp, tekst } = bevestigingsTekst(b);
    let status = 0;
    try {
      const antwoord = await fetchFn(BREVO_ADRES, {
        method: "POST",
        headers: {
          "api-key": instellingen.sleutel,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: { name: instellingen.afzenderNaam, email: instellingen.afzenderEmail },
          to: [{ email: b.naar }],
          // Wie antwoordt, komt bij de afzender uit en niet in een
          // onbewaakte bus.
          replyTo: { email: instellingen.afzenderEmail, name: instellingen.afzenderNaam },
          subject: onderwerp,
          textContent: tekst,
        }),
      });
      status = antwoord.status;
      // Het antwoord leegmaken zonder het te lezen of te loggen.
      await antwoord.body?.cancel();
    } catch (_f) {
      log("bevestigingsmail: Brevo niet bereikbaar", { soort: b.soort });
      return false;
    }
    if (status === 201 || status === 202) {
      log("bevestigingsmail verstuurd", { soort: b.soort });
      return true;
    }
    log("bevestigingsmail geweigerd door Brevo", { soort: b.soort, status });
    return false;
  };
}
