// ══════════════════════════════════════════════════════════════
//  TEAMTAKKIE — het enige testgereedschap dat deze functies gebruiken
//  ─────────────────────────────────────────────────────────────
//  WAAROM DIT ER IS IN PLAATS VAN EEN BIBLIOTHEEK
//
//  De gebruikelijke weg is `import { assertEquals } from
//  "jsr:@std/assert"`. Dat werkt, maar het haalt bij de eerste keer
//  draaien een pakket van internet. Dat is hier niet gewenst:
//
//    · de tests in tests/ draaien met kale node en hebben nergens een
//      verbinding voor nodig — dat is de gewoonte in dit project;
//    · een test die alleen met internet draait, draait vroeg of laat
//      niet meer (een versie die verdwijnt, een laptop langs de lijn);
//    · en dit hele bestand is dertig regels. De bibliotheek voegt daar
//      voor dit doel niets aan toe.
//
//  `deno test supabase/functions/` draait hierdoor zonder vlaggen en
//  zonder verbinding.
// ══════════════════════════════════════════════════════════════

/* Vergelijkt twee waarden die uit JSON kunnen komen.

   Objecten worden vergeleken ZONDER op de volgorde van de velden te
   letten — die volgorde zegt in JSON niets. Waar de volgorde wél
   uitmaakt (de parameters van verwerk_betaling(), zie
   server/18-betalingen.sql) wordt hij apart getoetst met
   Object.keys(); dat hoort een aparte, zichtbare bewering te zijn en
   geen bijwerking van de vergelijking. */
function zelfde(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((waarde, i) => zelfde(waarde, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const an = Object.keys(ao).sort();
  const bn = Object.keys(bo).sort();
  if (an.length !== bn.length) return false;
  if (!an.every((naam, i) => naam === bn[i])) return false;
  return an.every((naam) => zelfde(ao[naam], bo[naam]));
}

function toon(waarde: unknown): string {
  if (waarde === undefined) return "undefined";
  try {
    return JSON.stringify(waarde);
  } catch (_f) {
    return String(waarde);
  }
}

/* De enige bewering die deze tests nodig hebben. De uitleg is geen
   franje: bij een test die in een lus draait is "false is niet true"
   onbruikbaar, en dan gaat er een half uur op aan zoeken welk van de
   zes gevallen het was. */
export function gelijk(gevonden: unknown, verwacht: unknown, uitleg = ""): void {
  if (zelfde(gevonden, verwacht)) return;
  throw new Error(
    (uitleg ? uitleg + "\n" : "") +
      "  gevonden: " + toon(gevonden) + "\n" +
      "  verwacht: " + toon(verwacht),
  );
}

/* Voor het geval dat een aanroep juist WEL hoort te klappen. Geeft de
   fout terug, zodat de test er nog iets over kan beweren. */
export function klapt(doe: () => unknown, uitleg = ""): Error {
  try {
    doe();
  } catch (f) {
    return f instanceof Error ? f : new Error(String(f));
  }
  throw new Error((uitleg ? uitleg + "\n" : "") + "  er ging niets mis, en dat hoorde wel");
}
