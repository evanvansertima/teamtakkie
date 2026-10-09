// ══════════════════════════════════════════════════════════════
//  TESTS — de bevestigingsmail via Brevo (_gedeeld/mail.ts)
//  Draaien met:  deno test supabase/functions/
//
//  WAAR HET HIER OM GAAT
//  1. Wat er naar Brevo gaat: de juiste sleutel in de juiste kop, de
//     juiste afzender en ontvanger, en de tekst uit bevestiging.ts.
//  2. Wat er NOOIT in een logboek komt: de sleutel, het adres van de
//     ontvanger, en het antwoord van Brevo.
//  3. Niet aangesloten of Brevo plat: false, en nooit een fout die een
//     gelukte opzegging laat mislukken.
// ══════════════════════════════════════════════════════════════

import { leesMailInstellingen, maakBevestiger } from "./mail.ts";
import { type Bevestiging } from "./bevestiging.ts";
import { gelijk } from "./bewering.ts";

const SLEUTEL = "xkeysib-geheim-123";
const B: Bevestiging = {
  soort: "opzeggen", naar: "penningmeester@club.test", pakket: "coach",
  termijn: "maand", geldigTot: "2026-10-19",
};
const INST = { sleutel: SLEUTEL, afzenderEmail: "headcoach@teamtakkie.nl", afzenderNaam: "TEAMTAKKIE" };

function opstelling(status = 201, gooit = false) {
  const verzoeken: { url: string; kop: Record<string, string>; body: Record<string, unknown> }[] = [];
  const logboek: string[] = [];
  const fetchFn = ((url: string, opties: RequestInit) => {
    if (gooit) return Promise.reject(new Error("netwerk weg " + SLEUTEL));
    verzoeken.push({
      url,
      kop: opties.headers as Record<string, string>,
      body: JSON.parse(opties.body as string),
    });
    return Promise.resolve(new Response(JSON.stringify({ message: "fout voor penningmeester@club.test" }), { status }));
  }) as unknown as typeof fetch;
  const log = (bericht: string, velden?: Record<string, unknown>) =>
    logboek.push(bericht + " " + JSON.stringify(velden ?? {}));
  return { verzoeken, logboek, fetchFn, log };
}

Deno.test("mail: naar Brevo, met de sleutel in de api-key-kop", async () => {
  const op = opstelling();
  const ok = await maakBevestiger(INST, op.log, op.fetchFn)(B);
  gelijk(ok, true);
  gelijk(op.verzoeken[0].url, "https://api.brevo.com/v3/smtp/email");
  gelijk(op.verzoeken[0].kop["api-key"], SLEUTEL);
  gelijk(op.verzoeken[0].body.sender, { name: "TEAMTAKKIE", email: "headcoach@teamtakkie.nl" });
  gelijk(op.verzoeken[0].body.to, [{ email: "penningmeester@club.test" }]);
  gelijk(String(op.verzoeken[0].body.subject).includes("opzegging"), true);
  gelijk(String(op.verzoeken[0].body.textContent).includes("tot en met 19 oktober 2026"), true);
});

Deno.test("mail: 202 (ingepland) telt ook als verstuurd", async () => {
  const op = opstelling(202);
  gelijk(await maakBevestiger(INST, op.log, op.fetchFn)(B), true);
});

Deno.test("mail: een weigering van Brevo geeft false, met alleen de statuscode in het logboek", async () => {
  const op = opstelling(401);
  gelijk(await maakBevestiger(INST, op.log, op.fetchFn)(B), false);
  const alles = op.logboek.join("\n");
  gelijk(alles.includes("401"), true);
  gelijk(alles.includes(SLEUTEL), false, "de sleutel");
  gelijk(alles.includes("penningmeester@club.test"), false, "het adres, ook niet via het antwoord van Brevo");
});

Deno.test("mail: Brevo onbereikbaar geeft false en geen fout, en lekt niets", async () => {
  const op = opstelling(201, true);
  gelijk(await maakBevestiger(INST, op.log, op.fetchFn)(B), false);
  gelijk(op.logboek.join("\n").includes(SLEUTEL), false);
});

Deno.test("mail: niet aangesloten — niets versturen, false", async () => {
  const op = opstelling();
  gelijk(await maakBevestiger(null, op.log, op.fetchFn)(B), false);
  gelijk(op.verzoeken.length, 0);
});

Deno.test("mail: zonder sleutel of zonder afzender is het niet aangesloten", () => {
  const env = (m: Record<string, string>) => ({ get: (n: string) => m[n] });
  gelijk(leesMailInstellingen(env({ BREVO_API_KEY: SLEUTEL })), null);
  gelijk(leesMailInstellingen(env({ MAIL_AFZENDER_EMAIL: "a@b.nl" })), null);
  gelijk(leesMailInstellingen(env({ BREVO_API_KEY: SLEUTEL, MAIL_AFZENDER_EMAIL: "a@b.nl" }))?.afzenderNaam, "TEAMTAKKIE");
});
