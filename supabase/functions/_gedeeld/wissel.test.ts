// ══════════════════════════════════════════════════════════════
//  TESTS — wisselen tussen Coach en Club: de rekensom en het oordeel
//  ─────────────────────────────────────────────────────────────
//  Draaien met:
//      deno test supabase/functions/
//
//  Geen framework en geen internet, net als mollie.test.ts hiernaast.
//
//  ─────────────────────────────────────────────────────────────
//  WAAROM DIT BESTAND ER EERDER IS DAN DE CODE
//
//  Deze test is geschreven vóórdat er één regel van het wisselwerk
//  bestond. Zolang verrekeningCent(), WISSEL_DREMPEL_CENT en
//  beoordeelWissel() nog niet in _gedeeld/mollie.ts staan, is elke
//  test hieronder ROOD met de melding "bestaat nog niet". Dat is de
//  bedoeling: de test legt vast wat er moet komen.
//
//  De import gaat met opzet via een dynamische import en niet met een
//  gewone `import { verrekeningCent } from "./mollie.ts"`. Bij die
//  laatste vorm struikelt de typecontrole van Deno over de ontbrekende
//  export en draait het hele bestand niet — ook de rest van
//  `deno test supabase/functions/` niet. Nu faalt netjes elke test
//  apart, met een leesbare reden.
//
//  ─────────────────────────────────────────────────────────────
//  WAT DE TWEE FUNCTIES DOEN, EN WAAROM ZE GESCHEIDEN ZIJN
//
//  verrekeningCent() REKENT: hoeveel moet deze club bijbetalen om de
//  rest van de lopende periode op het duurdere pakket te zitten.
//  Verder niets — hij weet niet of het mag, hij kent de club niet en
//  hij praat met niemand. Daardoor is hij op een half A4 te bewijzen.
//
//  beoordeelWissel() BESLIST: mag deze club wisselen, en is het gratis
//  of betaald. Dat is de plek waar Veerles randgevallentabel terecht
//  komt (free, onbeperkt, verlopen, geen incasso, dubbelklik). Ook
//  deze functie is puur: alle feiten gaan erin, er komt een oordeel
//  uit. Wie hem in de edge function zelf zou bouwen, kan de
//  randgevallen alleen nog testen door echte verzoeken na te bootsen —
//  en dan wordt zo'n tabel nooit uitgetest.
//
//  ─────────────────────────────────────────────────────────────
//  DE HANDTEKENINGEN DIE DEZE TEST VERWACHT
//
//      export const WISSEL_DREMPEL_CENT = 250;
//
//      export function verrekeningCent(
//        vanPakket: string, naarPakket: string, termijn: string,
//        resterendeDagen: number, totaleDagen: number,
//      ): number | null
//
//      export function beoordeelWissel(
//        feiten: WisselFeiten, naarPakket: string,
//      ): WisselOordeel
//
//      interface WisselFeiten {          // komt uit wissel_gegevens()
//        pakket: string;                 // het huidige pakket
//        termijn: string | null;
//        geldigTot: string | null;       // "JJJJ-MM-DD" of null
//        totaleDagen: number | null;
//        resterendeDagen: number | null;
//        mollieSubscriptionId: string | null;
//        wisselOnderweg: boolean;
//      }
//      interface WisselOordeel {
//        mag: boolean;
//        soort: "niets" | "downgrade" | "upgrade_gratis" | "upgrade";
//        bedragCent: number;
//        reden: string;                  // gevuld zodra mag = false
//      }
//
//  Over `reden` doet deze test met opzet één uitspraak: hij is niet
//  leeg als iets geweigerd wordt. De tekst of code zelf is vrij —
//  daar een vaste tekst van maken zou de test rood maken bij elke
//  herformulering, en dat is precies het soort test dat mensen gaan
//  negeren.
//
//  ─────────────────────────────────────────────────────────────
//  EEN VERSCHIL DAT IS BLIJVEN STAAN — LEES DIT (Tess, 19 sep 2026)
//
//  In de opdracht staat bij het jaargeval: 300 van de 365 dagen geeft
//  34529 cent. Dat klopt niet met de rekenregel uit datzelfde ontwerp:
//
//      (49000 - 6990) x 300 / 365 = 34528,767…
//
//  en die wordt naar BENEDEN afgerond (Math.floor), dus 34528. 34529
//  is wat je krijgt als je normaal afrondt. Normaal afronden kan het
//  niet zijn, want dan klopt het eerste geval niet meer: 3640,87 zou
//  dan 3641 worden en de opdracht noemt daar uitdrukkelijk 3640.
//
//  Het gaat om één cent, altijd in het voordeel van de club. Deze test
//  houdt 34528 aan (naar beneden, zoals de rekenregel zegt). Wil Evan
//  het anders, dan is dat één regel — maar dan moeten de andere
//  verwachtingen mee veranderen.
// ══════════════════════════════════════════════════════════════

import { gelijk } from "./bewering.ts";

const bron = await import("./mollie.ts") as unknown as Record<string, unknown>;

/* Haalt een functie of waarde uit mollie.ts op, met een leesbare fout
   als hij er nog niet is. Zonder dit zou elke test dezelfde
   nietszeggende "is not a function" geven. */
function haal<T>(naam: string): T {
  const waarde = bron[naam];
  if (waarde === undefined) {
    throw new Error(
      `${naam} bestaat nog niet in supabase/functions/_gedeeld/mollie.ts — ` +
        "zie de handtekeningen bovenaan dit bestand",
    );
  }
  return waarde as T;
}

type Verrekening = (
  van: string,
  naar: string,
  termijn: string,
  resterendeDagen: number,
  totaleDagen: number,
) => number | null;

interface Feiten {
  pakket: string;
  termijn: string | null;
  geldigTot: string | null;
  totaleDagen: number | null;
  resterendeDagen: number | null;
  mollieSubscriptionId: string | null;
  wisselOnderweg: boolean;
}

interface Oordeel {
  mag: boolean;
  soort: string;
  bedragCent: number;
  reden: string;
}

type Beoordelen = (feiten: Feiten, naarPakket: string) => Oordeel;

/* Een club die alles goed heeft staan: Coach per maand, nog 26 van de
   30 dagen te gaan, incasso bekend, niets onderweg. Elke test hieronder
   verandert er precies één ding aan — dan is bij een rode test meteen
   te zien wélk ding het was. */
function gezondeClub(): Feiten {
  return {
    pakket: "coach",
    termijn: "maand",
    geldigTot: "2026-10-15",
    totaleDagen: 30,
    resterendeDagen: 26,
    mollieSubscriptionId: "sub_test1",
    wisselOnderweg: false,
  };
}

// ══ DE REKENSOM ══════════════════════════════════════════════

Deno.test("1. Coach naar Club, per maand, 26 van de 30 dagen over", () => {
  const verrekeningCent = haal<Verrekening>("verrekeningCent");
  // (4900 - 699) = 4201 cent verschil, daarvan 26/30e = 3640,866…
  gelijk(verrekeningCent("coach", "club", "maand", 26, 30), 3640);
});

Deno.test("2. de hele periode nog over: het volle prijsverschil", () => {
  const verrekeningCent = haal<Verrekening>("verrekeningCent");
  gelijk(verrekeningCent("coach", "club", "maand", 30, 30), 4201);
});

Deno.test("3. nul dagen over: niets te verrekenen", () => {
  const verrekeningCent = haal<Verrekening>("verrekeningCent");
  gelijk(verrekeningCent("coach", "club", "maand", 0, 30), 0);
});

Deno.test("4. één dag over: 140 cent", () => {
  const verrekeningCent = haal<Verrekening>("verrekeningCent");
  // 4201 / 30 = 140,03…
  //
  // LET OP: 140 cent is MINDER dan de drempel van € 2,50. In het echt
  // wordt dit dus een GRATIS upgrade. Dat is de beslissing van
  // beoordeelWissel() en niet van deze functie: verrekeningCent()
  // rekent alleen. Zou hij hier zelf al 0 teruggeven, dan was in de
  // boekhouding nooit meer te zien wat de wissel eigenlijk waard was.
  gelijk(verrekeningCent("coach", "club", "maand", 1, 30), 140);
});

Deno.test("6. per jaar, 300 van de 365 dagen over", () => {
  const verrekeningCent = haal<Verrekening>("verrekeningCent");
  // (49000 - 6990) = 42010 cent verschil, daarvan 300/365e = 34528,767…
  // Naar beneden: 34528. Zie het blok "EEN VERSCHIL DAT IS BLIJVEN
  // STAAN" bovenaan dit bestand.
  gelijk(verrekeningCent("coach", "club", "jaar", 300, 365), 34528);
});

Deno.test("7. de andere kant op is altijd 0, nooit een minbedrag", () => {
  const verrekeningCent = haal<Verrekening>("verrekeningCent");
  // Een downgrade levert nooit geld op. Zou hier een negatief getal
  // uitkomen, dan zou dat verderop een terugbetaling worden — en dat
  // is niet wat Evan heeft afgesproken: een downgrade is gratis en
  // gaat per direct in, zonder verrekening.
  gelijk(verrekeningCent("club", "coach", "maand", 26, 30), 0);
  gelijk(verrekeningCent("club", "coach", "maand", 30, 30), 0);
  gelijk(verrekeningCent("club", "coach", "jaar", 300, 365), 0);
  // En hetzelfde pakket naar hetzelfde pakket: ook 0, geen minbedrag.
  gelijk(verrekeningCent("coach", "coach", "maand", 26, 30), 0);
});

Deno.test("8. onbekend pakket of onbekende termijn geeft null, geen 0", () => {
  const verrekeningCent = haal<Verrekening>("verrekeningCent");
  // Het verschil tussen "gratis" en "weet ik niet" moet zichtbaar
  // blijven. Zou hier 0 uitkomen, dan wordt een tikfout in het pakket
  // stilletjes een gratis upgrade.
  gelijk(verrekeningCent("coach", "PRO", "maand", 26, 30), null);
  gelijk(verrekeningCent("gratis", "club", "maand", 26, 30), null);
  gelijk(verrekeningCent("free", "club", "maand", 26, 30), null);
  gelijk(verrekeningCent("coach", "club", "week", 26, 30), null);
  gelijk(verrekeningCent("coach", "club", "", 26, 30), null);
  // Een periode van nul dagen is geen periode: delen door nul.
  gelijk(verrekeningCent("coach", "club", "maand", 0, 0), null);
  gelijk(verrekeningCent("coach", "club", "maand", 5, -30), null);
});

Deno.test("9. een deling die op ,99 uitkomt gaat naar beneden", () => {
  const verrekeningCent = haal<Verrekening>("verrekeningCent");
  // 4201 x 99 / 100 = 4158,99 exact. Bij Math.round zou hier 4159
  // staan. De dagen (99 van 100) zijn met opzet geen echte
  // periodelengte: ze zijn gekozen omdat ze precies op de grens
  // uitkomen waar naar boven en naar beneden verschillen.
  gelijk(verrekeningCent("coach", "club", "maand", 99, 100), 4158);
});

// ══ DE DREMPEL ═══════════════════════════════════════════════

Deno.test("de drempel staat op € 2,50 — door Evan bevestigd", () => {
  const drempel = haal<number>("WISSEL_DREMPEL_CENT");
  // 250 cent, niet 100. Dit getal is een besluit van Evan
  // (19 september 2026), geen technische keuze: onder € 2,50 kost een
  // incasso meer gedoe dan hij opbrengt, dus dan is de wissel gratis.
  gelijk(drempel, 250);
});

Deno.test("onder de drempel is de upgrade gratis, erboven wordt hij betaald", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");

  // 140 cent (nog één dag te gaan): ONDER de drempel, dus gratis en
  // meteen klaar. Dit scenario is er speciaal om de drempelwaarde te
  // bewaken: zou hij per ongeluk op 100 staan, dan wordt dit een
  // betaling van € 1,40 — een iDEAL-scherm voor niets, en een
  // wisselclaim die op een betaling gaat staan wachten.
  const bijna = { ...gezondeClub(), resterendeDagen: 1 };
  const gratis = beoordeelWissel(bijna, "club");
  gelijk(gratis.mag, true);
  gelijk(gratis.soort, "upgrade_gratis");
  gelijk(gratis.bedragCent, 0);

  // 26 dagen te gaan: ruim boven de drempel, dus betalen.
  const betaald = beoordeelWissel(gezondeClub(), "club");
  gelijk(betaald.mag, true);
  gelijk(betaald.soort, "upgrade");
  gelijk(betaald.bedragCent, 3640);
});

Deno.test("de grens zelf: 249 gratis, 250 en 251 betaald", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");
  // "De ondergrens voor een gratis wissel is € 2,50" lezen we als:
  // ALLES ONDER 250 cent is gratis, 250 cent zelf wordt geïncasseerd.
  // Dat is een keuze van één cent; staat hij andersom in de code, dan
  // hoort deze test aangepast te worden en niet stilzwijgend te
  // verdwijnen.
  //
  // De dagen zijn zo gekozen dat het bedrag precies rond de grens
  // uitkomt: 4201 x d / 1000 geeft 247,8 bij 59 dagen, 252,0 bij 60.
  const onder = beoordeelWissel(
    { ...gezondeClub(), totaleDagen: 1000, resterendeDagen: 59 },
    "club",
  );
  gelijk(onder.soort, "upgrade_gratis", "4201 x 59 / 1000 = 247 cent");
  gelijk(onder.bedragCent, 0);

  const precies = beoordeelWissel(
    { ...gezondeClub(), totaleDagen: 4201, resterendeDagen: 250 },
    "club",
  );
  gelijk(precies.soort, "upgrade", "4201 x 250 / 4201 = precies 250 cent");
  gelijk(precies.bedragCent, 250);

  const boven = beoordeelWissel(
    { ...gezondeClub(), totaleDagen: 1000, resterendeDagen: 60 },
    "club",
  );
  gelijk(boven.soort, "upgrade", "4201 x 60 / 1000 = 252 cent");
  gelijk(boven.bedragCent, 252);
});

// ══ HET OORDEEL — VEERLES RANDGEVALLEN ═══════════════════════

Deno.test("randgeval: naar het pakket dat je al hebt — een dubbelklik is geen fout", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");
  // Allebei de richtingen, want dit is precies wat er gebeurt als
  // iemand twee keer op Overstappen tikt of het scherm ververst.
  const zelfdeUp = beoordeelWissel(gezondeClub(), "coach");
  gelijk(zelfdeUp.soort, "niets");
  gelijk(zelfdeUp.bedragCent, 0);
  gelijk(zelfdeUp.mag, true, "een dubbelklik hoort geen foutmelding te geven");

  const clubclub = beoordeelWissel({ ...gezondeClub(), pakket: "club" }, "club");
  gelijk(clubclub.soort, "niets");
  gelijk(clubclub.mag, true);
});

Deno.test("randgeval: een free-club hoort hier niet te upgraden", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");
  // Van gratis naar betaald is een gewone eerste betaling (iDEAL +
  // machtiging) via betaling-starten, geen verrekening. Kwam dat hier
  // toch langs, dan zou er een wisselbedrag worden uitgerekend over
  // een periode die niet bestaat.
  const free: Feiten = {
    pakket: "free",
    termijn: null,
    geldigTot: null,
    totaleDagen: null,
    resterendeDagen: null,
    mollieSubscriptionId: null,
    wisselOnderweg: false,
  };
  const oordeel = beoordeelWissel(free, "club");
  gelijk(oordeel.mag, false);
  gelijk(oordeel.reden === "", false, "een weigering hoort een reden te hebben");
});

Deno.test("randgeval: onbeperkt (met de hand gezet) — downgrade mag, upgrade niet", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");
  // Een club die van Evan onbeperkt toegang heeft, heeft geen
  // einddatum en dus geen periode om over te verrekenen. Upgraden kan
  // hier alleen met de hand; downgraden mag gewoon en de club houdt
  // zijn onbeperkte toegang op het lagere pakket.
  const onbeperkt: Feiten = {
    pakket: "club",
    termijn: null,
    geldigTot: null,
    totaleDagen: null,
    resterendeDagen: null,
    mollieSubscriptionId: null,
    wisselOnderweg: false,
  };
  const omlaag = beoordeelWissel(onbeperkt, "coach");
  gelijk(omlaag.mag, true);
  gelijk(omlaag.soort, "downgrade");
  gelijk(omlaag.bedragCent, 0);

  const omhoog = beoordeelWissel({ ...onbeperkt, pakket: "coach" }, "club");
  gelijk(omhoog.mag, false);
  gelijk(omhoog.reden === "", false, "een weigering hoort een reden te hebben");
});

Deno.test("randgeval: verlopen abonnement — downgrade mag, upgrade niet", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");
  // In de coulanceperiode (60 dagen, server/18-betalingen.sql DEEL 4)
  // is er niets meer om naar rato over te verrekenen: er zijn nul
  // dagen over. Opnieuw betalen gaat dan via de gewone weg.
  const verlopen: Feiten = {
    ...gezondeClub(),
    geldigTot: "2026-09-01",
    resterendeDagen: 0,
  };
  const omlaag = beoordeelWissel({ ...verlopen, pakket: "club" }, "coach");
  gelijk(omlaag.mag, true);
  gelijk(omlaag.soort, "downgrade");

  const omhoog = beoordeelWissel(verlopen, "club");
  gelijk(omhoog.mag, false);
  gelijk(omhoog.reden === "", false, "een weigering hoort een reden te hebben");
});

Deno.test("randgeval: geen doorlopende incasso bekend — downgrade mag, upgrade niet", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");
  // Zonder subscription bij Mollie valt er na de wissel niets te
  // wijzigen: de club zou blijven hangen op het oude bedrag, of op
  // niets. Downgraden mag wel — daar is geen incasso voor nodig, en
  // een club tegenhouden die minder wil betalen is het slechtste
  // antwoord dat er is.
  const zonder = { ...gezondeClub(), mollieSubscriptionId: null };
  const omlaag = beoordeelWissel({ ...zonder, pakket: "club" }, "coach");
  gelijk(omlaag.mag, true);
  gelijk(omlaag.soort, "downgrade");

  const omhoog = beoordeelWissel(zonder, "club");
  gelijk(omhoog.mag, false);
  gelijk(omhoog.reden === "", false, "een weigering hoort een reden te hebben");
});

Deno.test("randgeval: er loopt al een wissel — nog een upgrade beginnen mag niet", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");
  // Het slot in de database (de partiële unieke index) houdt dit ook
  // tegen, maar dan pas nádat er bij Mollie een betaling is
  // klaargezet. Hier weigeren scheelt de club een tweede iDEAL-scherm.
  const bezig = { ...gezondeClub(), wisselOnderweg: true };
  const oordeel = beoordeelWissel(bezig, "club");
  gelijk(oordeel.mag, false);
  gelijk(oordeel.reden === "", false, "een weigering hoort een reden te hebben");
});

Deno.test("randgeval: onbekende termijn — geen bedrag, dus geen wissel", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");
  // verrekeningCent() geeft hier null ("weet ik niet"). Dat mag nooit
  // als 0 ("gratis") worden gelezen — dan gaat een upgrade voor niets
  // door.
  const raar = { ...gezondeClub(), termijn: "week" };
  const oordeel = beoordeelWissel(raar, "club");
  gelijk(oordeel.mag, false);
  gelijk(oordeel.reden === "", false, "een weigering hoort een reden te hebben");
});

Deno.test("de downgrade zelf: gratis, en altijd toegestaan", () => {
  const beoordeelWissel = haal<Beoordelen>("beoordeelWissel");
  // De gewone downgrade, ter controle dat niet ALLES geweigerd wordt.
  // Zonder dit scenario zou een functie die altijd "nee" zegt alle
  // randgevallen hierboven halen.
  const oordeel = beoordeelWissel({ ...gezondeClub(), pakket: "club" }, "coach");
  gelijk(oordeel.mag, true);
  gelijk(oordeel.soort, "downgrade");
  gelijk(oordeel.bedragCent, 0);
});
