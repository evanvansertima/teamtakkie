// ══════════════════════════════════════════════════════════════
//  De bevestigingsmail — één tekst voor opzeggen, intrekken en herroepen
//  ─────────────────────────────────────────────────────────────
//  Puur: hier wordt niets verstuurd. Het versturen doet de maildienst
//  (besluit van Evan: Brevo), die de functies als afhankelijkheid
//  meekrijgen. Bij herroepen is deze bevestiging wettelijk verplicht:
//  "op een duurzame drager", en een e-mail telt (EU-richtlijn
//  2023/2673, zie docs/opzeggen-plan.md).
// ══════════════════════════════════════════════════════════════

/* Wat er in de bevestigingsmail moet. Alleen feiten die de club zelf
   al kent; geen bedragen van Mollie, geen rekeningnummer. */
export interface Bevestiging {
  soort: "opzeggen" | "intrekken" | "herroepen";
  naar: string;
  pakket: string;
  termijn: string | null;
  /* Bij herroepen: de dag waarop is herroepen (het pakket stopt meteen). */
  geldigTot: string;
  /* Alleen bij herroepen: wat er wordt teruggestort, in centen. */
  bedragCent?: number;
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
  if (b.soort === "herroepen") {
    const euro = "€ " + ((b.bedragCent ?? 0) / 100).toFixed(2).replace(".", ",");
    return {
      onderwerp: "Bevestiging: je hebt TEAMTAKKIE " + naam + " herroepen",
      tekst: [
        "Hallo,",
        "",
        `We hebben op ${datum} ontvangen dat je je overeenkomst voor TEAMTAKKIE ${naam} herroept.`,
        "",
        `Je krijgt het volledige bedrag terug: ${euro}. Dat staat binnen een paar werkdagen`,
        "weer op de rekening waarmee je hebt betaald. Er wordt niets meer afgeschreven.",
        "",
        "Je vereniging staat vanaf nu op Free: één team en de basis. Je gegevens blijven",
        "staan, en je kunt ze altijd inzien en exporteren.",
        "",
        "Groet,",
        "TEAMTAKKIE",
      ].join("\n"),
    };
  }
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

