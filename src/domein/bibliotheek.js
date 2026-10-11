// @ts-check
/* ══════════════════════════════════════════════════════════════
   DOMEIN: de oefeningenbibliotheek van TEAMTAKKIE
   ─────────────────────────────────────────────────────────────
   Aanleiding (11 oktober 2026): een tester vroeg of je oefeningen kunt
   kiezen voor spelers onder de 10–11 jaar, en of er schematische
   tekeningen bij zitten. Het antwoord was nee: de 50 kant-en-klare
   oefeningen (BASIS_OEFENINGEN in src/app.jsx) stonden allemaal op
   O18-O19 en hadden geen tekening.

   Dit bestand maakt daar een echte bibliotheek van:
     · elke oefening heeft een TEKENING;
     · elke oefening heeft een lijst LEEFTIJDEN waarvoor hij geschikt is
       (een rondo werkt van O9 tot senioren, een buitenspelval niet);
     · elke oefening heeft een THEMA: Fun, Techniek of Tactiek;
     · er zijn complete THEMATRAININGEN per leeftijd en thema.

   De bibliotheek is ingebouwd en alleen-lezen: hij staat niet in de
   opslag van de gebruiker en gaat dus ook niet mee met synchroniseren.
   Wie een oefening wil aanpassen kopieert hem naar "Mijn oefeningen".

   TEKENINGEN IN EEN KORTE NOTATIE
   Een tekening uitschrijven in het formaat van het tekenbord kost per
   oefening veertig regels. Hier staat hij in één regel tekst, in
   procenten van het veld (0–100, x van links, y van boven); tekening()
   rekent om naar logische eenheden. Per stuk, gescheiden door ";":
     a3 20 40       blauwe speler met nummer 3   (a zonder nummer: zonder)
     v2 60 40       rode speler met nummer 2
     k 50 5 / kr    keeper (blauw / rood), met een K
     b p h          bal, pion, hoedje
     g m x y [hoek] groot doel, klein doel (hoek 0 = net naar boven,
                    90 = naar rechts, 180 = naar beneden, 270 = links)
     st du ri hd la slalomstok, pop, ring, hordje, ladder
     vak x y b h [kleur]   afgebakend vak (midden + breedte/hoogte in %)
     pas loop drib schot voorzet x1 y1 x2 y2   lijnen
   Meerdere stappen (zoals in een animatie) gescheiden door "|".

   Geen import/export: tools/bouw.js plakt dit vóór src/app.jsx.
   ══════════════════════════════════════════════════════════════ */

/* Kopie van de maten in VELD_TYPEN (src/schermen/opstellingen.jsx);
   tests/bibliotheek.test.js bewaakt dat ze gelijk blijven. */
const BIB_VELDEN = { "heel-h": [580, 370], "heel-v": [370, 540], "half-b": [430, 320], "half-o": [430, 320], "stippel": [580, 370],
                     "leeg": [580, 370], "vak-2": [580, 370], "vak-3": [580, 370], "vak-4": [580, 370] };
const BIB_LEEFTIJDEN = ["O7-O8", "O9-O11", "O12-O14", "O15-O17", "O18-O19", "Senioren"];
const BIB_THEMAS = ["Fun", "Techniek", "Tactiek"];
const BIB_DINGEN = { b: "bal", p: "pion", h: "hoedje", g: "goal", m: "minidoel", st: "stok", du: "dummy", ri: "ring", hd: "hordje", la: "ladder" };
const BIB_LIJNEN = { pas: "passlijn", loop: "looplijn", drib: "dribbellijn", schot: "schietlijn", voorzet: "voorzetlijn" };
/* Groter dan de standaard van het tekenbord (0,55): de tekeningen worden
   ook als klein plaatje in de lijst getoond, en dan moet je een speler
   nog als speler herkennen. */
const BIB_SCHAAL = { speler: 0.9, "speler-rood": 0.9, bal: 0.8, pion: 0.7, hoedje: 0.75, goal: 1, minidoel: 0.8, stok: 0.8, dummy: 0.8, ring: 0.8, hordje: 0.8, ladder: 0.8 };

/* De korte notatie omzetten naar het formaat van het tekenbord. */
/**
 * @param {string} veldType
 * @param {string[]} stappenTekst
 * @param {number} basisId  begin van de element-ids (vast, zodat een tekening altijd dezelfde ids heeft)
 * @returns {any}
 */
function tekening(veldType, stappenTekst, basisId) {
  var maat = BIB_VELDEN[/** @type {keyof typeof BIB_VELDEN} */ (veldType)];
  if (!maat) throw new Error("Onbekend veld " + veldType);
  var W = maat[0], H = maat[1], volg = basisId || 1;
  /** @param {string} v @param {number} max */
  function om(v, max) { var n = Number(v); if (!isFinite(n) || n < 0 || n > 100) throw new Error("Coördinaat buiten 0–100: " + v); return Math.round(n / 100 * max); }
  var stappen = stappenTekst.map(function (tekst, si) {
    /** @type {any[]} */ var elems = [];
    /** @type {any[]} */ var lijnen = [];
    tekst.split(";").map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (stuk) {
      var d = stuk.split(/\s+/);
      var m = d[0].match(/^([a-z]+)(\d*)$/);
      if (!m) throw new Error("Onleesbaar: " + stuk);
      var code = m[1], nr = m[2];
      /** @type {any} */ var el;
      if (code === "a" || code === "v") {
        el = { type: code === "a" ? "speler" : "speler-rood", x: om(d[1], W), y: om(d[2], H) };
        if (nr) el.nr = Number(nr);
      } else if (code === "k" || code === "kr") {
        el = { type: code === "k" ? "speler" : "speler-rood", x: om(d[1], W), y: om(d[2], H), nr: "K" };
      } else if (BIB_DINGEN[/** @type {keyof typeof BIB_DINGEN} */ (code)]) {
        el = { type: BIB_DINGEN[/** @type {keyof typeof BIB_DINGEN} */ (code)], x: om(d[1], W), y: om(d[2], H) };
        if (d[3]) el.hoek = Number(d[3]);
      } else if (code === "vak" || code === "cirkel") {
        el = { type: code === "vak" ? "zone-vierkant" : "zone-cirkel", x: om(d[1], W), y: om(d[2], H),
               b: om(d[3], W), h: om(d[4], H), kleur: d[5] || "grijs" };
      } else if (BIB_LIJNEN[/** @type {keyof typeof BIB_LIJNEN} */ (code)]) {
        lijnen.push({ id: volg++, type: BIB_LIJNEN[/** @type {keyof typeof BIB_LIJNEN} */ (code)],
                      x1: om(d[1], W), y1: om(d[2], H), x2: om(d[3], W), y2: om(d[4], H), bocht: 1 });
        return;
      } else throw new Error("Onbekend onderdeel: " + stuk);
      el.id = volg++;
      if (BIB_SCHAAL[/** @type {keyof typeof BIB_SCHAAL} */ (el.type)]) el.schaal = BIB_SCHAAL[/** @type {keyof typeof BIB_SCHAAL} */ (el.type)];
      elems.push(el);
    });
    /* Vakken onderop, zodat spelers en pionnen er bovenop liggen. */
    elems.sort(function (x, y) { return (String(y.type).indexOf("zone") === 0 ? 1 : 0) - (String(x.type).indexOf("zone") === 0 ? 1 : 0); });
    return { id: si + 1, elems: elems, lijnen: lijnen };
  });
  return { veldType: veldType, elems: stappen[0].elems, lijnen: stappen[0].lijnen, stappen: stappen };
}

const BIB_O7 = ["O7-O8", "O9-O11"];
const BIB_O7P = BIB_LEEFTIJDEN.slice(0);
const BIB_O9P = BIB_LEEFTIJDEN.slice(1);
const BIB_O12P = BIB_LEEFTIJDEN.slice(2);
const BIB_O15P = BIB_LEEFTIJDEN.slice(3);

/* ── De 50 bestaande oefeningen: leeftijden, thema en tekening ──
   De teksten zelf staan ongewijzigd in BASIS_OEFENINGEN (src/app.jsx). */
const BIB_AANVULLING = {
  "Rondo 5 tegen 2": [BIB_O9P, "Tactiek", "leeg", ["vak 50 50 44 70; a1 30 22; a2 70 22; a3 76 62; a4 50 84; a5 24 62; v1 45 48; v2 58 55; b 32 26; p 28 15; p 72 15; p 28 85; p 72 85; pas 30 22 70 22; pas 70 22 76 62"]],
  "Opbouwen van achteruit 7 tegen 5": [BIB_O12P, "Tactiek", "half-o", ["k 50 92; a2 18 74; a3 38 82; a4 62 82; a5 82 74; a6 38 52; a7 62 52; v1 30 66; v2 50 70; v3 70 66; v4 42 38; v5 60 38; m 2 30 270; m 98 30 90; g 50 98 180; b 49 88; pas 50 92 38 82; pas 38 82 38 52; drib 38 52 40 12"]],
  "Derde man vrijspelen": [BIB_O12P, "Tactiek", "leeg", ["vak 50 50 56 84; a1 24 12; a2 26 16; a3 76 12; a4 78 16; a5 24 88; a6 26 84; a7 76 88; a8 78 84; a9 74 86; p 22 8; p 78 8; p 22 92; p 78 92; b 25 20; pas 24 12 76 12; pas 76 12 26 16; pas 26 16 76 88"]],
  "Y-passvorm met doorlopen": [BIB_O12P, "Techniek", "leeg", ["p 50 90; p 50 55; p 28 15; p 72 15; a1 50 94; a2 50 60; a3 26 10; a4 74 10; a5 52 96; a6 30 12; b 50 89; pas 50 94 50 60; pas 50 60 50 88; pas 50 88 28 15; loop 50 60 34 22"]],
  "Buitenspelers diep sturen": [BIB_O12P, "Tactiek", "heel-h", ["vak 50 8 70 14 blauw; vak 50 92 70 14 blauw; g 2 50 270; g 98 50 90; k 4 50; kr 96 50; a2 30 40; a3 30 62; a4 55 30; a5 60 8; a6 70 55; v1 40 50; v2 50 70; v3 62 45; v4 75 35; v5 80 62; b 55 32; pas 55 30 60 8; drib 60 8 80 8; voorzet 80 8 90 45"]],
  "Voorzetten en afronden": [BIB_O12P, "Techniek", "half-b", ["g 50 2; k 50 6; a1 10 30; a2 90 34; a3 40 40; a4 58 42; a5 50 62; b 10 28; drib 10 30 10 14; voorzet 10 14 44 14; loop 40 40 42 18; loop 58 42 60 14; loop 50 62 50 36; p 8 40; p 92 40"]],
  "Vier tegen twee in het blok": [BIB_O12P, "Tactiek", "leeg", ["vak 50 50 50 80; a1 30 16; a2 70 18; a3 72 82; a4 28 80; v1 44 46; v2 56 56; p 25 10; p 75 10; p 25 90; p 75 90; b 32 20; pas 30 16 70 18; pas 70 18 72 82"]],
  "Kruisen en doorlopen": [BIB_O12P, "Techniek", "half-b", ["g 50 2; k 50 6; a1 38 70; a2 62 72; a3 50 92; v1 50 40; b 50 88; pas 50 92 38 70; drib 38 70 52 58; loop 62 72 46 56; drib 46 56 42 22"]],
  "Afwerken na wandpass": [BIB_O9P, "Techniek", "half-b", ["g 50 2; k 50 6; a1 50 34; a2 50 70; a3 46 78; a4 54 78; b 50 66; pas 50 70 50 36; loop 50 70 60 34; pas 50 34 60 26; schot 60 26 52 6"]],
  "Een tegen een op de flank": [BIB_O9P, "Techniek", "leeg", ["vak 50 50 60 80; a1 25 80; v1 50 50; a2 18 88; v2 82 20; m 80 10 0; m 80 90 180; b 27 76; drib 25 80 30 20; drib 25 80 70 60"]],
  "Positiespel 6 tegen 4 met kantelen": [BIB_O12P, "Tactiek", "vak-2", ["a1 8 20; a2 42 20; a3 44 80; a4 8 80; a5 25 50; a6 30 30; v1 18 40; v2 30 62; v3 20 70; v4 38 46; v5 70 40; v6 80 62; b 9 24; pas 8 20 42 20; pas 42 20 25 50; pas 44 80 75 60"]],
  "Diepte zoeken via de spits": [BIB_O12P, "Tactiek", "heel-h", ["vak 10 50 18 70 blauw; vak 90 50 18 70 rood; g 2 50 270; g 98 50 90; a1 88 50; v1 12 50; a2 40 30; a3 45 70; a4 60 50; a5 30 55; v2 55 30; v3 65 65; v4 50 55; v5 70 45; b 60 46; pas 60 50 88 50; pas 88 50 70 40; loop 45 70 72 58"]],
  "Vier goals partij": [BIB_O9P, "Tactiek", "heel-h", ["m 2 20 270; m 2 80 270; m 98 20 90; m 98 80 90; a1 30 30; a2 35 70; a3 50 45; a4 62 20; a5 65 80; a6 75 50; v1 40 50; v2 55 30; v3 58 65; v4 70 35; v5 25 60; v6 80 70; b 62 24; pas 62 20 65 80; drib 65 80 92 80"]],
  "Combineren in het laatste dertig": [BIB_O12P, "Tactiek", "half-b", ["g 50 2; k 50 6; a1 20 50; a2 40 55; a3 60 55; a4 80 50; a5 35 32; a6 65 32; a7 50 22; v1 30 26; v2 45 18; v3 55 18; v4 70 26; v5 50 40; b 40 52; pas 40 55 35 32; pas 35 32 50 22; schot 50 22 50 5"]],
  "Aanvallende overtal drie tegen twee": [BIB_O9P, "Tactiek", "half-b", ["g 50 2; k 50 6; a1 25 85; a2 50 88; a3 75 85; v1 40 45; v2 60 45; b 50 84; drib 50 88 50 60; loop 25 85 22 30; loop 75 85 78 30; pas 50 60 78 30"]],
  "Schotoefening met draai": [BIB_O12P, "Techniek", "half-b", ["g 50 2; k 50 6; a1 50 34; v1 50 26; a2 50 80; b 50 76; pas 50 80 50 36; drib 50 34 64 30; schot 64 30 56 6"]],
  "Insnijden en afronden": [BIB_O12P, "Techniek", "half-b", ["g 50 2; k 50 6; a1 10 50; p 30 36; a2 8 60; b 12 48; drib 10 50 30 30; drib 30 30 40 26; schot 40 26 54 6"]],
  "Wisselen van speelhelft": [BIB_O12P, "Tactiek", "vak-3", ["a1 6 20; a2 6 80; a3 20 50; a4 28 22; a5 28 78; a6 80 30; a7 88 70; v1 16 34; v2 22 68; v3 45 40; v4 55 60; v5 75 50; v6 90 20; v7 84 50; b 8 24; pas 6 20 28 22; pas 28 78 80 30"]],
  "Corner aanvallend": [BIB_O12P, "Tactiek", "half-b", ["g 50 2; k 50 6; a1 2 2; b 3 4; a2 30 30; a3 45 34; a4 60 32; a5 55 46; a6 40 70; a7 65 70; v1 42 12; v2 50 16; v3 58 14; v4 46 26; voorzet 2 2 42 12; loop 30 30 40 14; loop 45 34 52 16; loop 60 32 64 20; loop 55 46 50 34"]],
  "Vrije trap rond de zestien": [BIB_O12P, "Techniek", "half-b", ["g 50 2; k 50 6; a1 40 42; a2 52 44; b 46 42; v1 44 28; v2 48 28; v3 52 28; schot 46 42 58 6; pas 46 42 60 44"]],
  "Een tegen een verdedigen": [BIB_O9P, "Techniek", "leeg", ["vak 50 50 60 80; m 50 90 180; m 50 10 0; a1 50 82; v1 50 38; a2 60 92; v2 40 8; b 50 78; drib 50 82 34 40; loop 50 38 42 52"]],
  "Druk zetten vanaf voren": [BIB_O15P, "Tactiek", "heel-h", ["g 2 50 270; g 98 50 90; kr 4 50; v2 16 25; v3 14 50; v4 16 75; v5 32 35; v6 32 65; v7 45 50; a1 26 30; a2 24 55; a3 28 75; a4 42 35; a5 42 65; a6 55 50; a7 70 40; b 6 50; loop 26 30 18 28; loop 24 55 16 48; loop 28 75 18 74"]],
  "Compact blok verdedigen": [BIB_O15P, "Tactiek", "heel-h", ["vak 32 50 42 90 rood; g 2 50 270; g 98 50 90; kr 4 50; v1 20 25; v2 18 45; v3 18 60; v4 20 78; v5 35 35; v6 35 65; v7 48 50; a1 60 20; a2 62 50; a3 60 80; a4 75 35; a5 75 65; a6 50 30; a7 50 72; k 96 50; b 62 46"]],
  "Knijpen en kantelen achterin": [BIB_O15P, "Tactiek", "leeg", ["v1 20 70; v2 40 75; v3 60 75; v4 80 70; a1 15 30; a2 38 30; a3 62 30; a4 85 30; b 16 34; loop 20 70 18 50; loop 40 75 32 62; loop 80 70 66 72; pas 15 30 38 30"]],
  "Verdedigen in ondertal": [BIB_O12P, "Tactiek", "half-b", ["g 50 2; kr 50 6; a1 30 60; a2 50 64; a3 70 60; v1 42 34; v2 58 34; v3 50 92; b 50 60; drib 50 64 50 46; loop 42 34 46 42; loop 50 92 52 60"]],
  "Duel om de tweede bal": [BIB_O12P, "Tactiek", "leeg", ["vak 50 50 56 84; a1 48 46; v1 52 46; a2 32 30; a3 66 70; v2 34 66; v3 68 32; b 50 40; loop 32 30 44 40; loop 68 32 56 42"]],
  "Verdedigen van de voorzet": [BIB_O12P, "Tactiek", "half-b", ["g 50 2; kr 50 6; v1 38 14; v2 48 18; v3 58 16; v4 66 24; a1 42 26; a2 56 28; a3 62 38; a4 6 14; b 7 16; voorzet 6 14 50 14; loop 48 18 48 12"]],
  "Buitenspelval": [BIB_O15P, "Tactiek", "half-b", ["g 50 2; kr 50 6; v1 20 40; v2 40 42; v3 60 42; v4 80 40; a1 35 36; a2 65 36; a3 50 70; b 50 66; loop 20 40 20 52; loop 40 42 40 54; loop 60 42 60 54; loop 80 40 80 52; loop 35 36 30 20"]],
  "Pressing in het rondo": [BIB_O12P, "Tactiek", "leeg", ["vak 50 50 44 70; a1 32 26; a2 68 26; a3 70 72; a4 30 74; v1 45 40; v2 58 60; v3 40 62; v4 60 38; a5 50 12; a6 50 88; b 33 30; loop 45 40 34 30; loop 40 62 32 40"]],
  "Terugzakken bij balverlies": [BIB_O15P, "Tactiek", "heel-h", ["g 2 50 270; g 98 50 90; k 4 50; kr 96 50; a1 60 30; a2 62 55; a3 70 75; a4 75 40; v1 66 45; v2 72 62; v3 80 35; b 66 48; loop 60 30 42 30; loop 62 55 44 55; loop 70 75 46 72; loop 75 40 48 42"]],
  "Dekken en rugdekking": [BIB_O12P, "Tactiek", "leeg", ["vak 50 50 56 84; m 35 90 180; m 65 90 180; a1 40 30; a2 64 34; v1 42 46; v2 56 58; b 40 34; loop 42 46 41 38; loop 56 58 50 52"]],
  "Doelpogingen blokken": [BIB_O12P, "Tactiek", "half-b", ["g 50 2; k 50 6; a1 40 50; a2 62 52; v1 46 36; v2 58 38; b 40 46; schot 40 50 48 6; loop 46 36 42 44"]],
  "Spits in de rug dekken": [BIB_O12P, "Tactiek", "half-b", ["g 50 2; kr 50 6; a1 50 30; v1 50 22; a2 50 80; b 50 76; loop 50 30 50 50; pas 50 80 50 52; loop 50 22 50 44"]],
  "Jagen op de bal in zones": [BIB_O15P, "Tactiek", "vak-3", ["a1 8 30; a2 12 70; a3 25 50; a4 45 30; a5 55 70; a6 80 40; a7 88 70; v1 18 38; v2 22 62; v3 14 52; v4 50 50; v5 62 40; v6 82 30; v7 78 62; b 10 34; loop 18 38 12 34; loop 22 62 14 66"]],
  "Corner verdedigen": [BIB_O12P, "Tactiek", "half-b", ["g 50 2; kr 50 6; v1 42 4; v2 58 4; v3 44 16; v4 54 18; v5 10 6; v6 50 36; a1 46 20; a2 56 22; a3 62 30; a4 2 2; b 3 4; voorzet 2 2 50 16"]],
  "Muur bij vrije trap": [BIB_O12P, "Tactiek", "half-b", ["g 50 2; kr 50 6; v1 40 28; v2 44 28; v3 48 28; v4 52 28; a1 42 44; a2 54 46; b 46 42; schot 46 42 58 6"]],
  "Verdedigen met een man minder": [BIB_O15P, "Tactiek", "heel-h", ["vak 30 50 36 80 rood; g 2 50 270; g 98 50 90; kr 4 50; v1 18 30; v2 18 50; v3 18 70; v4 32 38; v5 32 62; v6 42 50; a1 45 25; a2 48 50; a3 45 75; a4 60 35; a5 60 65; a6 70 50; a7 30 18; k 96 50; b 48 46"]],
  "Eerste druk op de bal": [BIB_O12P, "Tactiek", "leeg", ["vak 50 50 56 84; a1 50 40; v1 50 62; a2 50 90; m 50 10 0; b 50 86; pas 50 90 50 44; loop 50 62 50 48"]],
  "Zonedekking op het middenveld": [BIB_O15P, "Tactiek", "vak-3", ["a1 8 25; a2 8 75; a3 22 50; a4 80 25; a5 90 50; a6 80 75; v1 40 30; v2 40 70; v3 60 30; v4 60 70; b 10 28; pas 8 25 80 25"]],
  "Herstellen na de tegenaanval": [BIB_O12P, "Tactiek", "heel-h", ["g 2 50 270; g 98 50 90; kr 96 50; a1 50 40; a2 50 60; a3 40 50; v1 44 34; v2 44 66; b 40 46; drib 40 50 80 50; loop 44 34 86 40; loop 44 66 86 60"]],
  "Direct terugjagen na balverlies": [BIB_O12P, "Tactiek", "heel-h", ["m 2 25 270; m 2 75 270; m 98 25 90; m 98 75 90; a1 40 30; a2 45 60; a3 55 45; v1 50 35; v2 52 62; v3 62 50; b 52 38; loop 40 30 48 34; loop 55 45 52 40"]],
  "Restverdediging bij eigen aanval": [BIB_O15P, "Tactiek", "heel-h", ["vak 58 50 30 90 blauw; g 2 50 270; g 98 50 90; kr 4 50; a1 25 30; a2 22 50; a3 25 70; a4 55 35; a5 55 65; a6 70 50; v1 30 50; v2 75 35; v3 75 65; b 70 54"]],
  "Omschakelspel vier tegen vier plus drie": [BIB_O12P, "Tactiek", "leeg", ["vak 50 50 64 84; a1 30 25; a2 70 25; a3 70 75; a4 30 75; v1 42 40; v2 58 40; v3 58 60; v4 42 60; h 50 12; h 50 88; h 18 50; b 31 29"]],
  "Terugsprint na eigen kans": [BIB_O12P, "Tactiek", "heel-h", ["g 2 50 270; g 98 50 90; kr 96 50; k 4 50; a1 82 35; a2 85 55; a3 80 70; v1 50 40; v2 50 60; schot 85 55 96 50; pas 96 50 50 40; loop 82 35 56 36; loop 80 70 56 62"]],
  "Van aanvallen naar blok in tien seconden": [BIB_O15P, "Tactiek", "heel-h", ["vak 25 50 46 90 blauw; g 2 50 270; g 98 50 90; k 4 50; a1 60 25; a2 62 50; a3 60 75; a4 72 40; a5 72 62; v1 80 50; b 72 44; loop 60 25 30 25; loop 62 50 32 50; loop 60 75 30 75; loop 72 40 42 40"]],
  "Counter na balverovering": [BIB_O12P, "Tactiek", "heel-h", ["g 2 50 270; g 98 50 90; kr 96 50; a1 40 50; a2 55 25; a3 55 75; v1 36 44; v2 70 50; b 40 46; pas 40 50 55 25; drib 55 25 82 35; loop 55 75 86 60"]],
  "Snel omschakelen via de flank": [BIB_O12P, "Tactiek", "heel-h", ["g 2 50 270; g 98 50 90; kr 96 50; k 4 50; a1 20 50; a2 40 8; a3 50 45; a4 55 60; b 20 46; pas 20 50 40 8; drib 40 8 82 10; voorzet 82 10 90 45; loop 50 45 88 44; loop 55 60 88 58"]],
  "Uitverdedigen naar de spits": [BIB_O12P, "Tactiek", "heel-h", ["g 2 50 270; g 98 50 90; kr 96 50; k 4 50; a1 15 50; a2 60 50; a3 40 40; v1 64 54; b 15 46; pas 15 50 60 50; pas 60 50 46 40; loop 40 40 50 40"]],
  "Omschakelspel met twee doelen": [BIB_O12P, "Tactiek", "heel-h", ["m 2 25 270; m 2 75 270; m 98 25 90; m 98 75 90; a1 35 30; a2 40 70; a3 55 50; v1 45 40; v2 60 30; v3 62 70; b 46 44; loop 45 40 50 42; drib 46 44 92 72"]],
  "Eerste pass vooruit": [BIB_O12P, "Tactiek", "leeg", ["vak 50 50 70 84; a1 30 70; a2 60 30; a3 70 70; v1 34 62; v2 50 50; v3 50 25; b 34 66; pas 34 66 60 30"]]
};

/* ── Nieuwe oefeningen (11 oktober 2026) ──────────────────────
   Vooral voor de jongere jeugd (O7–O11): fun en techniek, zoals de
   KNVB het voor die leeftijd aanraadt — veel balcontacten, spelvormen,
   weinig uitleg. Velden: naam, type, doel, thema, leeftijden, duur,
   spelers, veldgrootte, materialen, beschrijving, aandachtspunten,
   [veld, stappen]. */
const BIB_NIEUW = [
  // ── Fun ──
  ["Tikkertje met bal", "Warming-up", "Dribbelen", "Fun", BIB_O7, 10, 12, "20 x 20 meter", "4 pionnen, een bal per speler, 2 hesjes",
   "Iedereen dribbelt met een bal in het vak. Twee tikkers met een hesje hebben geen bal en proberen spelers te tikken. Wie getikt is, houdt de bal boven zijn hoofd en staat stil met de benen wijd. Een medespeler bevrijdt hem door zijn bal tussen die benen door te spelen. Na twee minuten nieuwe tikkers.",
   "Bal dicht bij de voet\nKijk op: waar zijn de tikkers?\nGebruik het hele vak",
   ["leeg", ["vak 50 50 60 84; v1 40 40; v2 62 66; a1 28 22; a2 70 20; a3 30 72; a4 74 46; a5 52 26; a6 50 80; b 30 25; b 72 23; b 32 75; b 76 49; b 54 29; b 52 83; drib 28 22 40 18; drib 74 46 76 30; loop 40 40 32 26"]]],
  ["Piratenvoetbal", "Oefening", "Dribbelen", "Fun", BIB_O7, 10, 10, "20 x 20 meter", "4 pionnen, een bal per speler",
   "Alle spelers dribbelen met een bal in het vak: zij zijn de schepen. Twee piraten zonder bal proberen ballen te veroveren en het vak uit te schieten. Wie zijn bal kwijt is, wordt ook piraat. Welk schip blijft het langst varen?",
   "Bescherm de bal met je lichaam\nDraai weg van de piraat\nPiraten: werk samen",
   ["leeg", ["vak 50 50 60 84; v1 45 45; v2 58 60; a1 26 24; a2 72 22; a3 32 74; a4 72 72; a5 50 18; b 29 27; b 75 25; b 35 77; b 75 75; b 53 21; loop 45 45 32 30; drib 26 24 22 46"]]],
  ["Stoplicht", "Warming-up", "Dribbelen", "Fun", ["O7-O8"], 8, 10, "15 x 15 meter", "4 pionnen, een bal per speler",
   "Iedereen dribbelt vrij door het vak. De trainer roept een kleur. Groen: dribbelen. Oranje: bal stilleggen met de zool. Rood: op de bal gaan zitten. Wie het laatst is, doet vijf tikjes met de zool. Maak het moeilijker met extra kleuren: blauw is van richting wisselen, paars is de bal oppakken en weer neerleggen.",
   "Kleine tikjes tegen de bal\nOgen omhoog, luister naar de kleur\nStoppen met de zool",
   ["leeg", ["vak 50 50 56 80; a1 30 30; a2 66 28; a3 34 68; a4 68 70; a5 50 50; b 33 33; b 69 31; b 37 71; b 71 73; b 53 53; drib 30 30 44 36; drib 68 70 60 58"]]],
  ["Kegelbal", "Oefening", "Passen & trappen", "Fun", BIB_O7, 12, 8, "20 x 15 meter", "10 pionnen, 6 ballen",
   "Twee teams staan tegenover elkaar, elk achter een lijn met vijf pionnen. Met de binnenkant van de voet proberen ze de pionnen van de ander om te schieten. Ballen mogen worden tegengehouden. Wie het eerst alle pionnen om heeft, wint.",
   "Binnenkant van de voet\nStandbeen naast de bal\nRaak de bal in het midden",
   ["leeg", ["p 20 12; p 35 12; p 50 12; p 65 12; p 80 12; p 20 88; p 35 88; p 50 88; p 65 88; p 80 88; a1 25 78; a2 50 76; a3 75 78; v1 30 22; v2 55 24; v3 72 22; b 50 70; b 30 30; schot 50 76 50 16; schot 30 22 22 84"]]],
  ["Hoedjes omdraaien", "Warming-up", "Dribbelen", "Fun", BIB_O7, 8, 10, "20 x 20 meter", "20 hoedjes, een bal per speler, hesjes",
   "Verspreid twintig hoedjes over het vak, de helft met de bolle kant omhoog. Team blauw draait hoedjes om naar boven, team rood naar beneden — met de bal aan de voet, zonder de bal te verliezen. Na één minuut wordt geteld.",
   "Bal mee naar elk hoedje\nKijk waar de meeste hoedjes liggen\nSnel weer weg",
   ["leeg", ["vak 50 50 64 84; h 26 22; h 44 30; h 62 18; h 74 40; h 30 50; h 52 54; h 70 66; h 36 78; h 58 80; h 78 82; a1 30 30; a2 66 50; v1 48 40; v2 40 70; b 33 33; b 69 53; b 51 43; b 43 73; drib 30 30 42 28; drib 48 40 52 52"]]],
  ["Leeuwenjacht", "Oefening", "Dribbelen", "Fun", BIB_O7, 12, 12, "25 x 20 meter", "6 pionnen, een bal per speler",
   "De spelers zijn zebra's en staan met een bal aan één kant van de savanne. Op het teken dribbelen ze naar de overkant. In het middenvak wachten twee leeuwen zonder bal die proberen ballen te veroveren. Wie zijn bal verliest, wordt ook leeuw. Wie komt er het langst heelhuids over?",
   "Kies het moment: wacht of ga\nSnel langs de leeuw\nBal kort aan de voet",
   ["leeg", ["vak 50 50 30 84 rood; v1 46 40; v2 54 64; a1 10 20; a2 10 40; a3 10 60; a4 10 80; b 14 22; b 14 42; b 14 62; b 14 82; p 35 8; p 65 8; p 35 92; p 65 92; drib 10 40 88 36; drib 10 60 88 66"]]],
  ["Voetbalgolf", "Oefening", "Passen & trappen", "Fun", BIB_O9P, 15, 8, "half veld", "10 pionnen (5 poortjes), een bal per tweetal",
   "Zet vijf poortjes van pionnen verspreid over het veld: de holes. Tweetallen spelen de bal om de beurt door de poortjes in de goede volgorde. Wie heeft de minste trappen nodig voor de hele baan?",
   "Rustig richten, binnenkant\nDenk na over de lengte van de pass\nTel eerlijk",
   ["heel-h", ["p 20 20; p 20 30; p 45 70; p 45 80; p 60 15; p 60 25; p 80 60; p 80 70; p 90 20; p 90 30; a1 8 50; a2 10 56; b 10 50; pas 10 50 20 25; pas 20 25 45 75"]]],
  ["Koning van de cirkel", "Oefening", "Dribbelen", "Fun", BIB_O9P, 10, 10, "cirkel van 15 meter", "8 hoedjes, een bal per speler",
   "Iedereen dribbelt met een bal in de cirkel. Bescherm je eigen bal en probeer intussen die van anderen uit de cirkel te spelen. Wie zijn bal kwijt is, doet buiten de cirkel tien keer hooghouden en mag dan terug. Wie is na twee minuten nog nooit zijn bal kwijtgeraakt?",
   "Lichaam tussen bal en tegenstander\nOgen omhoog\nDurf de bal af te pakken",
   ["leeg", ["cirkel 50 50 50 78; a1 40 30; a2 62 34; a3 34 58; a4 58 66; a5 50 48; b 43 33; b 65 37; b 37 61; b 61 69; b 53 51; drib 50 48 60 40; drib 62 34 54 38"]]],
  ["Estafette slalom", "Warming-up", "Dribbelen", "Fun", BIB_O7, 10, 12, "20 x 15 meter", "16 pionnen, 3 ballen",
   "Drie teams staan in een rij. De eerste speler dribbelt slalom door de pionnen, rond de laatste pion en recht terug, en tikt de volgende aan. Welk team is het eerst klaar? Daarna: alleen links, alleen rechts, of met de zool.",
   "Kleine tikjes, dicht langs de pion\nBinnen- en buitenkant\nAanmoedigen mag",
   ["leeg", ["a1 10 25; a2 6 25; a3 10 50; a4 6 50; a5 10 75; a6 6 75; p 25 25; p 40 25; p 55 25; p 70 25; p 25 50; p 40 50; p 55 50; p 70 50; p 25 75; p 40 75; p 55 75; p 70 75; b 13 25; b 13 50; b 13 75; drib 13 25 32 20; drib 32 20 47 30; drib 47 30 62 20"]]],
  ["Doeltjesvoetbal 2 tegen 2", "Wedstrijdvorm", "Aanvallen", "Fun", ["O7-O8", "O9-O11", "O12-O14"], 15, 8, "20 x 15 meter per veldje", "4 kleine doeltjes, 6 ballen, hesjes",
   "Twee tegen twee op een klein veld met aan elke kant twee doeltjes. Wedstrijdjes van twee minuten; de winnaar schuift een veldje op. Zo heeft iedereen voortdurend de bal en moet je kiezen: zelf gaan of afspelen.",
   "Kijk welk doeltje vrij is\nSamen aanvallen, samen verdedigen\nScoren mag met een pass in het doel",
   ["leeg", ["vak 50 50 80 84; m 10 25 270; m 10 75 270; m 90 25 90; m 90 75 90; a1 40 35; a2 45 70; v1 58 40; v2 60 68; b 42 39; pas 40 35 45 70; drib 45 70 84 74"]]],
  ["Panna-kooi 1 tegen 1", "Wedstrijdvorm", "Dribbelen", "Fun", BIB_O9P, 12, 6, "8 x 8 meter", "8 pionnen, 2 kleine doeltjes, 4 ballen",
   "Eén tegen één in een klein vak met aan beide kanten een doeltje. Wedstrijdjes van één minuut. Een doelpunt is één punt, een panna (de bal door de benen van de tegenstander) is meteen twee punten. Daarna wisselen.",
   "Durf de actie te maken\nSnel na de actie wegversnellen\nBlijf op je benen",
   ["leeg", ["vak 50 50 44 70; m 28 50 270; m 72 50 90; a1 44 48; v1 56 52; a2 18 80; v2 82 20; b 46 50; drib 44 48 58 62; drib 58 62 68 50"]]],
  ["Lummelen 3 tegen 1", "Positiespel", "Passen & trappen", "Fun", ["O7-O8", "O9-O11", "O12-O14"], 10, 8, "10 x 10 meter per groepje", "4 pionnen per groepje, 1 bal",
   "Drie spelers staan in een driehoek rond een vak en houden de bal rond. Eén speler in het midden probeert de bal te onderscheppen. Wie de bal verliest, gaat de lummel worden. Tel hardop hoeveel passes het lukt.",
   "Sta zo dat je de bal kunt krijgen\nPass naar de vrije speler\nKijk eerst, dan passen",
   ["leeg", ["vak 50 50 40 64; a1 30 22; a2 70 22; a3 50 82; v1 50 46; b 33 25; pas 30 22 70 22; pas 70 22 50 82; p 30 18; p 70 18; p 30 82; p 70 82"]]],
  ["Schatgraven", "Oefening", "Dribbelen", "Fun", ["O7-O8"], 10, 12, "20 x 20 meter", "4 pionnen, 4 hoedjes, 15 ballen",
   "In het midden ligt de schat: een stapel ballen. Vier teams hebben elk een hoek. Om de beurt rent één speler naar het midden en dribbelt een bal naar de eigen hoek. Is de schat op, dan mag je ballen uit andere hoeken halen. Na twee minuten telt elk team zijn schat.",
   "Bal mee aan de voet, niet oppakken\nSnel heen, beheerst terug\nWacht netjes op je beurt",
   ["leeg", ["vak 50 50 70 84; h 18 14; h 82 14; h 18 86; h 82 86; b 48 46; b 52 48; b 50 52; b 46 52; b 54 44; a1 20 18; a2 80 18; v1 20 82; v2 80 82; drib 48 46 22 22; loop 80 18 54 44"]]],
  ["Nummertjesspel", "Warming-up", "Conditie", "Fun", BIB_O9P, 10, 10, "25 x 20 meter", "2 kleine doeltjes, 1 bal",
   "Twee teams staan in een rij naast elkaar aan de zijkant, iedereen heeft een nummer. De trainer roept een nummer en speelt een bal het veld in. De twee spelers met dat nummer sprinten naar de bal en spelen één tegen één op de doeltjes. Roep later twee of drie nummers tegelijk.",
   "Snel reageren\nEerst bij de bal: wat doe je?\nNa een doelpunt snel terug",
   ["leeg", ["m 10 50 270; m 90 50 90; a1 30 10; a2 40 10; a3 50 10; a4 60 10; v1 30 90; v2 40 90; v3 50 90; v4 60 90; b 50 50; loop 40 10 48 44; loop 40 90 52 56"]]],
  ["Brug en tunnel", "Warming-up", "Dribbelen", "Fun", ["O7-O8"], 8, 10, "15 x 15 meter", "4 pionnen, een bal per speler",
   "Iedereen dribbelt door het vak. Roept de trainer 'tunnel', dan zoekt elke speler een maatje en speelt de bal door diens benen. Bij 'brug' gaat de speler op handen en voeten zitten en speelt het maatje de bal onder hem door. Bij 'thuis' terug naar de eigen bal.",
   "Zacht spelen, precies richten\nSamen afspreken wie eerst\nBlijf bewegen",
   ["leeg", ["vak 50 50 56 80; a1 36 40; a2 50 44; a3 64 60; a4 40 72; b 30 38; b 66 64; b 44 76; pas 30 38 50 44; drib 64 60 60 40"]]],
  // ── Techniek ──
  ["Dribbelparcours met afronding", "Oefening", "Dribbelen", "Techniek", ["O7-O8", "O9-O11", "O12-O14"], 12, 8, "25 x 15 meter", "6 pionnen, 4 hoedjes, 1 klein doel, 8 ballen",
   "Een parcours: slalom door vier pionnen, een hoedjesrij waarbij je om elk hoedje heen draait, en tot slot een schot op een klein doel. Daarna sluit je achter aan. Wie het parcours drie keer foutloos doet, mag het met de andere voet.",
   "Bal steeds in de buurt van je voet\nIn de bocht kleine tikjes\nAan het eind: kijk voor je schiet",
   ["leeg", ["a1 6 50; a2 3 56; b 9 50; p 20 50; p 30 50; p 40 50; p 50 50; h 62 35; h 70 60; h 78 35; m 95 50 90; drib 9 50 24 44; drib 24 44 34 56; drib 34 56 54 46; drib 54 46 62 30; drib 62 30 76 40; schot 80 45 93 50"]]],
  ["Binnenkant, buitenkant in het vak", "Warming-up", "Dribbelen", "Techniek", BIB_O7, 8, 12, "15 x 15 meter", "4 pionnen, een bal per speler",
   "Iedereen dribbelt vrij door het vak, de trainer roept steeds een opdracht: alleen binnenkant, alleen buitenkant, alleen links, alleen de zool, of draaien bij het fluitje. Elke halve minuut een nieuwe opdracht.",
   "Veel balcontacten\nGebruik beide voeten\nKijk op om botsen te voorkomen",
   ["leeg", ["vak 50 50 56 80; a1 30 30; a2 66 30; a3 36 70; a4 64 68; a5 50 50; b 33 33; b 69 33; b 39 73; b 67 71; b 53 53; drib 30 30 42 40; drib 66 30 58 44; drib 36 70 48 62"]]],
  ["Passen door poortjes", "Oefening", "Passen & trappen", "Techniek", ["O7-O8", "O9-O11", "O12-O14"], 12, 8, "25 x 20 meter", "16 pionnen (8 poortjes), een bal per tweetal",
   "Verspreid acht poortjes van twee pionnen over het veld. Tweetallen passen de bal door een poortje naar elkaar en zoeken dan samen een ander poortje. Hoeveel poortjes halen jullie in één minuut? Daarna: alleen links, of de bal eerst aannemen met de verste voet.",
   "Binnenkant, standbeen naast de bal\nAannemen en meteen verder\nPraat met elkaar",
   ["leeg", ["p 20 20; p 20 32; p 45 60; p 45 72; p 70 20; p 70 32; p 80 70; p 80 82; a1 12 26; a2 28 26; a3 38 66; a4 52 66; b 14 26; pas 12 26 28 26; pas 38 66 52 66; loop 28 26 62 26"]]],
  ["Passen en aannemen in tweetallen", "Warming-up", "Passen & trappen", "Techniek", BIB_O9P, 10, 12, "10 meter tussen elk tweetal", "een bal per tweetal, 4 hoedjes",
   "Tweetallen staan op tien meter van elkaar. Passen met de binnenkant, aannemen met de verste voet en de bal meteen een stap opzij meenemen. Bouw op: één keer raken, aannemen met de buitenkant, of na de pass een stukje achteruit lopen voor meer afstand.",
   "Open staan bij het aannemen\nPass stevig over de grond\nKijk naar je maatje voor je speelt",
   ["leeg", ["a1 25 25; a2 75 25; a3 25 50; a4 75 50; a5 25 75; a6 75 75; b 28 25; b 72 50; b 28 75; pas 25 25 75 25; pas 75 50 25 50; pas 25 75 75 75"]]],
  ["Kaatsen in de driehoek", "Oefening", "Passen & trappen", "Techniek", BIB_O12P, 12, 9, "15 x 15 meter", "3 pionnen per groepje, 1 bal",
   "Drie spelers in een driehoek. A speelt op B, B kaatst terug op A, A speelt diep op C. Daarna draait de richting. Wissel na tien passes van rol. Tempo opbouwen tot alles in één keer gaat.",
   "Kaats met de binnenkant, zacht en precies\nLos komen vlak voor de pass\nAanspelen op de goede voet",
   ["leeg", ["p 30 75; p 70 75; p 50 20; a1 30 80; a2 70 80; a3 50 15; b 33 78; pas 30 80 70 80; pas 70 80 34 74; pas 34 74 50 18"]]],
  ["Schijnbewegingen-circuit", "Oefening", "Dribbelen", "Techniek", ["O9-O11", "O12-O14", "O15-O17"], 12, 8, "25 x 15 meter", "4 poppen of pionnen, 1 klein doel, 8 ballen",
   "Vier 'verdedigers' (poppen of pionnen) achter elkaar. Bij elke pop maakt de speler een andere beweging: schaar, Cruijff-draai, stepover en de Zidane-draai, en daarna een schot op het doeltje. Begin langzaam, voer het tempo op.",
   "Maak de beweging groot\nNa de beweging versnellen\nOefen naar links én rechts",
   ["leeg", ["a1 6 50; b 9 50; du 25 50; du 45 50; du 65 50; du 80 50; m 95 50 90; drib 9 50 20 40; drib 20 40 30 60; drib 30 60 50 40; drib 50 40 70 60; schot 84 55 93 50"]]],
  ["1 tegen 1 met poortjes", "Oefening", "Dribbelen", "Techniek", ["O9-O11", "O12-O14", "O15-O17"], 12, 8, "15 x 12 meter", "8 pionnen, 6 ballen",
   "De aanvaller probeert met de bal door één van twee poortjes aan de overkant te dribbelen; de verdediger verdedigt beide. Na een poging wisselen. Verdediger wint de bal: hij mag scoren door één van twee poortjes aan de andere kant.",
   "Zet de verdediger op het verkeerde been\nVersnel na je actie\nVerdediger: niet springen, blijf staan",
   ["leeg", ["p 20 10; p 35 10; p 65 10; p 80 10; p 20 90; p 35 90; p 65 90; p 80 90; a1 50 80; v1 50 40; b 50 76; drib 50 80 40 50; drib 40 50 70 14; loop 50 40 58 32"]]],
  ["Afwerken na aanname", "Oefening", "Afwerken", "Techniek", BIB_O9P, 15, 8, "rond de zestien", "groot doel, 6 pionnen, 12 ballen",
   "Een speler aan de rand van de zestien speelt in op de aanvaller. Die neemt de bal in één keer richting doel aan, langs een pion, en schiet. Daarna wordt de aanvaller aangever. Variëren: aanname over links of rechts, schieten met wreef of binnenkant.",
   "Aanname weg van de pion\nKijk naar de keeper\nLaag en hard in de hoek",
   ["half-b", ["g 50 2; k 50 6; p 50 36; a1 50 44; a2 80 46; a3 84 50; b 78 44; pas 80 46 50 44; drib 50 44 40 30; schot 40 30 54 6"]]],
  ["Kopbal in tweetallen", "Oefening", "Afwerken", "Techniek", BIB_O12P, 10, 8, "5 meter tussen elk tweetal", "een zachte bal per tweetal",
   "Eén speler gooit de bal onderhands, de ander kopt terug in de handen. Eerst vanuit stand, dan met een stapje, dan met een sprongetje. Pas na de basis: koppen naar links of rechts. Advies van de KNVB: met jongere jeugd (onder 12) niet bewust koppen trainen, en ook bij de oudere jeugd beperkt.",
   "Ogen open, kijk naar de bal\nKop met je voorhoofd\nNek stevig, beweeg vanuit je romp",
   ["leeg", ["a1 30 30; a2 50 30; a3 30 70; a4 50 70; b 40 26; b 40 66; pas 30 30 48 30; pas 30 70 48 70"]]],
  ["Aannemen uit de lucht", "Oefening", "Passen & trappen", "Techniek", BIB_O12P, 10, 8, "10 meter tussen elk tweetal", "een bal per tweetal",
   "De ene speler gooit de bal met een boogje toe, de ander neemt aan met wreef, dij of borst en speelt over de grond terug. Na tien keer wisselen. Uitbreiding: de aanname meteen een kant op meenemen.",
   "Zacht maken: geef mee met de bal\nOnder de bal komen\nTweede raak op de grond",
   ["leeg", ["a1 25 30; a2 70 30; a3 25 70; a4 70 70; b 28 30; b 67 70; pas 25 30 68 30; pas 70 70 27 70"]]],
  ["Hooghouden-uitdaging", "Warming-up", "Dribbelen", "Techniek", ["O9-O11", "O12-O14"], 8, 12, "vrije ruimte", "een bal per speler",
   "Iedereen houdt hoog. Ronde 1: zo vaak mogelijk met een tussenstuit. Ronde 2: zonder stuit. Ronde 3: links-rechts om en om. Ronde 4: in tweetallen naar elkaar. Schrijf je record op en probeer het volgende training te verbeteren.",
   "Raak de bal met de veters\nEnkel strak\nKleine tikjes, niet te hoog",
   ["leeg", ["a1 25 35; a2 50 30; a3 75 35; a4 35 70; a5 65 70; b 25 25; b 50 20; b 75 25; b 35 60; b 65 60"]]],
  ["Lange bal en controle", "Oefening", "Passen & trappen", "Techniek", BIB_O15P, 12, 8, "30 tot 40 meter", "een bal per tweetal",
   "Tweetallen op dertig tot veertig meter. Lange bal met de wreef, de ander neemt de bal in één keer goed aan en speelt terug. Verleng de afstand stap voor stap. Later: de aannemer start met de rug naar de passer en draait open bij de roep.",
   "Standbeen naast de bal, lichaam erover\nRaak de bal onder het midden\nAanname weg van de denkbeeldige tegenstander",
   ["heel-h", ["a1 15 30; a2 75 30; a3 15 70; a4 75 70; b 18 30; b 72 70; voorzet 15 30 75 30; voorzet 75 70 15 70"]]],
  ["1 tegen de keeper", "Wedstrijdvorm", "Afwerken", "Techniek", ["O9-O11", "O12-O14", "O15-O17"], 15, 8, "halve speelhelft", "groot doel, 6 ballen, 4 pionnen",
   "De aanvaller start met de bal bij de middenlijn en gaat alleen op de keeper af. Een verdediger start twee meter achter hem en mag meesprinten. De aanvaller moet kiezen: schieten of de keeper uitspelen. Wissel na elke poging.",
   "Tempo houden, niet afremmen\nKijk naar de keeper: staat hij ver uit?\nKies op tijd",
   ["half-b", ["g 50 2; k 50 8; a1 50 80; v1 50 92; b 50 76; drib 50 80 48 30; schot 48 30 58 6; loop 50 92 50 40"]]],
  ["Keepersduel", "Wedstrijdvorm", "Keeper", "Techniek", ["O9-O11", "O12-O14"], 12, 4, "15 x 10 meter", "2 doelen of 4 pionnen, 6 ballen",
   "Twee doeltjes op vijftien meter. Twee spelers (of keepers) proberen om de beurt vanaf hun eigen doellijn bij de ander te scoren, gooien of trappen. Elke speler is keeper van zijn eigen doel. Wie het eerst vijf doelpunten heeft, wint.",
   "Klein maken, laag staan\nVangen en meteen terug\nRichten op de hoeken",
   ["leeg", ["g 50 6; g 50 94 180; k 50 12; kr 50 88; b 50 84; schot 50 88 44 8"]]],
  ["Draaien met de bal", "Oefening", "Dribbelen", "Techniek", ["O9-O11", "O12-O14"], 10, 8, "15 x 10 meter", "4 pionnen, 4 ballen",
   "De speler dribbelt naar een pion, draait daar weg met een vooraf gekozen draai (binnenkant, buitenkant, zool of Cruijff) en dribbelt terug. Na vijf keer een nieuwe draai. Wedstrijdje: wie haalt de meeste draaien in een halve minuut?",
   "Laag door de knieën bij de draai\nBal mee in de draai\nNa de draai versnellen",
   ["leeg", ["p 75 30; p 75 70; a1 20 30; a2 20 70; b 23 30; b 23 70; drib 23 30 70 30; drib 70 30 30 34; drib 23 70 70 70"]]],
  // ── Tactiek voor jongere jeugd ──
  ["2 tegen 1 naar het doel", "Wedstrijdvorm", "Aanvallen", "Tactiek", ["O9-O11", "O12-O14", "O15-O17"], 15, 9, "20 x 25 meter", "groot of klein doel, 8 ballen, hesjes",
   "Twee aanvallers tegen één verdediger en een keeper. De aanvaller met de bal kiest: zelf gaan als de verdediger blijft staan, of afspelen als de verdediger op hem af komt. Na elke aanval schuiven de rollen door.",
   "Lok de verdediger naar je toe\nMedespeler: blijf breed\nSpeel af op het goede moment",
   ["half-b", ["g 50 2; k 50 6; a1 40 70; a2 64 66; v1 50 40; b 40 66; drib 40 70 44 46; pas 44 46 66 38; schot 66 38 56 6"]]],
  ["3 tegen 3 met lijndoel", "Wedstrijdvorm", "Aanvallen", "Tactiek", ["O9-O11", "O12-O14"], 15, 6, "25 x 20 meter", "8 pionnen, 6 ballen, hesjes",
   "Drie tegen drie. Je scoort door met de bal over de lijn van de tegenstander te dribbelen. Daardoor moet je het veld breed en diep maken: staat iemand op de goede plek, dan is er altijd een gat.",
   "Maak het veld groot\nZoek de vrije ruimte\nVerdedigers: dicht bij elkaar",
   ["leeg", ["vak 50 50 80 84; p 10 8; p 10 92; p 90 8; p 90 92; a1 30 50; a2 45 20; a3 45 80; v1 55 40; v2 58 62; v3 72 50; b 33 50; pas 30 50 45 20; drib 45 20 88 18"]]],
  ["4 tegen 4 op vier doeltjes", "Wedstrijdvorm", "Aanvallen", "Tactiek", ["O9-O11", "O12-O14", "O15-O17"], 15, 8, "30 x 25 meter", "4 kleine doeltjes, 6 ballen, hesjes",
   "Vier tegen vier, iedere ploeg verdedigt twee doeltjes en valt aan op twee. Wordt één doeltje goed verdedigd, dan is het andere vrij: snel van kant wisselen loont.",
   "Kijk welk doeltje vrij is\nSnel de bal verplaatsen\nVerdedig het doeltje aan de balkant",
   ["leeg", ["vak 50 50 84 84; m 10 25 270; m 10 75 270; m 90 25 90; m 90 75 90; a1 30 30; a2 35 70; a3 50 50; a4 65 25; v1 45 35; v2 60 50; v3 70 72; v4 78 30; b 53 50; pas 50 50 35 70; drib 35 70 85 74"]]],
  ["6 tegen 6 partijspel", "Wedstrijdvorm", "Positiespel", "Tactiek", ["O9-O11"], 20, 12, "kwart veld (42 x 30 meter)", "2 doelen (5 x 2 m), hesjes, 6 ballen",
   "De wedstrijdvorm voor JO9 tot en met JO11 (6 tegen 6, één keeper en vijf veldspelers). Speel partijtjes van vijf minuten met één aandachtspunt per keer: breed staan bij balbezit, of bij balverlies snel terug.",
   "Breed en diep bij balbezit\nKeeper doet mee in de opbouw\nIedereen terug bij balverlies",
   ["heel-h", ["g 2 50 270; g 98 50 90; k 5 50; kr 95 50; a2 22 20; a3 22 80; a4 40 50; a5 55 25; a6 55 75; v2 78 20; v3 78 80; v4 62 50; v5 45 30; v6 45 70; b 40 46; pas 5 50 22 20; pas 22 20 55 25"]]],
  ["Samen verdedigen 2 tegen 2", "Wedstrijdvorm", "Verdedigen", "Tactiek", ["O9-O11", "O12-O14"], 12, 8, "20 x 15 meter", "2 kleine doeltjes, 6 ballen, hesjes",
   "Twee tegen twee op twee kleine doeltjes. De verdediger bij de bal zet druk, zijn maatje staat schuin erachter. Wint de verdediging de bal, dan mag zij scoren. Na twee minuten wisselen de rollen.",
   "Eén druk, één erachter\nPraat: 'ik ga', 'ik dek'\nNiet allebei naar de bal",
   ["leeg", ["vak 50 50 70 84; m 50 90 180; m 50 10 0; a1 40 30; a2 64 34; v1 42 44; v2 56 56; b 40 34; loop 42 44 41 36; loop 56 56 50 50"]]],
  // ── Warming-up en afkoelen voor alle leeftijden ──
  ["Warming-up met bal en loopscholing", "Warming-up", "Passen & trappen", "Techniek", BIB_O12P, 12, 12, "30 x 20 meter", "4 pionnen, een bal per tweetal",
   "Tweetallen passen al lopend naar elkaar over de lengte van het veld. Terug zonder bal: knieheffen, hakken-billen, zijwaarts, achteruit en twee keer een korte sprint. Tot slot twee minuten passen in één keer.",
   "Rustig opbouwen\nPass voor je maatje uit\nLoopscholing: hoog en actief",
   ["leeg", ["p 10 20; p 90 20; p 10 80; p 90 80; a1 15 40; a2 15 60; a3 50 40; a4 50 60; b 18 42; pas 15 40 30 58; loop 50 40 70 40; loop 50 60 70 60"]]],
  ["Uitlopen en rekken", "Afkoelen", "Conditie", "Fun", BIB_O7P, 5, 12, "rondje om het veld", "geen",
   "Twee rustige rondjes uitlopen, daarna in een kring de belangrijkste spieren rekken: kuiten, bovenbenen voor en achter, liezen. Bij de jongste jeugd een spelletje van maken: de trainer doet een dier voor, iedereen doet na.",
   "Rustig tempo, praten kan\nRekken zonder te veren\nEven terugblikken: wat ging goed?",
   ["leeg", ["cirkel 50 50 60 80; a1 50 12; a2 78 30; a3 78 70; a4 50 88; a5 22 70; a6 22 30; loop 50 12 74 22; loop 78 70 58 86"]]],
  ["Snelheid: ladder, hordjes en afronden", "Warming-up", "Conditie", "Techniek", BIB_O12P, 10, 10, "30 x 15 meter", "1 speedladder, 4 hordjes, klein doel, ballen",
   "Voetenwerk door de ladder, over vier lage hordjes, dan een sprint naar een bal en een schot op het doeltje. Rustig terug wandelen: korte inspanning, volledige rust.",
   "Op de voorvoet\nArmen meenemen\nKwaliteit voor snelheid",
   ["leeg", ["a1 6 50; a2 3 56; la 22 50 90; hd 40 50 90; hd 47 50 90; hd 54 50 90; hd 61 50 90; b 78 50; m 95 50 90; loop 6 50 14 50; loop 66 50 76 50; schot 80 50 93 50"]]]
];

/* De complete oefeningenlijst: de 50 met aanvulling en de nieuwe. */
/** @type {any[]|null} */
var _bibCache = null;
/* BASIS_OEFENINGEN staat in src/app.jsx (dezelfde scope na het bouwen). */
/** @returns {any[]} */
function oudeBasis() {
  // @ts-ignore — gedefinieerd in src/app.jsx
  return typeof BASIS_OEFENINGEN !== "undefined" ? BASIS_OEFENINGEN : [];
}
/** @returns {any[]} */
function bibliotheekOefeningen() {
  if (_bibCache) return _bibCache;
  /** @type {any[]} */ var uit = [];
  var basis = oudeBasis();
  basis.forEach(function (/** @type {any} */ o, /** @type {number} */ i) {
    /** @type {any} */ var a = BIB_AANVULLING[/** @type {keyof typeof BIB_AANVULLING} */ (o.naam)];
    uit.push(Object.assign({}, o, {
      id: "bib-" + (i + 1), bron: "teamtakkie", leeftijden: a ? a[0] : BIB_O12P, leeftijd: (a ? a[0] : BIB_O12P)[0],
      thema: a ? a[1] : "Tactiek", tekening: a ? tekening(a[2], a[3], (i + 1) * 1000) : null, favoriet: false
    }));
  });
  BIB_NIEUW.forEach(function (/** @type {any[]} */ r, /** @type {number} */ i) {
    var nr = 100 + i + 1;
    uit.push({
      id: "bib-" + nr, bron: "teamtakkie", naam: r[0], type: r[1], doel: r[2], thema: r[3], leeftijden: r[4], leeftijd: r[4][0],
      categorie: bibCategorie(r[2]), duur: r[5], aantalSpelers: r[6], veldGrootte: r[7], materialen: r[8],
      beschrijving: r[9], aandachtspunten: r[10], tekening: tekening(r[11][0], r[11][1], nr * 1000), favoriet: false
    });
  });
  _bibCache = uit;
  return uit;
}
/** @param {string} doel @returns {string} */
function bibCategorie(doel) {
  if (doel === "Aanvallen" || doel === "Afwerken" || doel === "Positiespel" || doel === "Dribbelen" || doel === "Passen & trappen") return "Aanvallend";
  if (doel === "Verdedigen") return "Verdedigend";
  if (doel === "Omschakeling A-V" || doel === "Omschakeling V-A") return doel;
  return "Overig";
}

/* Voor welke leeftijden is een oefening geschikt? Oude oefeningen
   (van de gebruiker zelf) hebben één leeftijd, of "Alle". */
/** @param {any} o @returns {string[]} */
function leeftijdenVan(o) {
  if (o && Array.isArray(o.leeftijden) && o.leeftijden.length) return o.leeftijden;
  if (!o || !o.leeftijd || o.leeftijd === "Alle") return BIB_LEEFTIJDEN.slice(0);
  return [o.leeftijd];
}

/* Filteren. Een filter op "Alle" of leeg laat alles door. */
/**
 * @param {any[]} lijst
 * @param {{leeftijd?:string, thema?:string, doel?:string, zoek?:string, metTekening?:boolean}} f
 * @returns {any[]}
 */
function filterOefeningen(lijst, f) {
  var q = String(f.zoek || "").trim().toLowerCase();
  return lijst.filter(function (o) {
    if (f.leeftijd && f.leeftijd !== "Alle" && leeftijdenVan(o).indexOf(f.leeftijd) < 0) return false;
    if (f.thema && f.thema !== "Alle" && o.thema !== f.thema) return false;
    if (f.doel && f.doel !== "Alle" && o.doel !== f.doel) return false;
    if (f.metTekening && !o.tekening) return false;
    if (q && String(o.naam || "").toLowerCase().indexOf(q) < 0 && String(o.beschrijving || "").toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}

/* Welke leeftijdsgroep hoort bij een teamnaam (JO11-2, MO13, O19 …)? */
/** @param {string} naam @returns {string|null} */
function leeftijdUitTeamnaam(naam) {
  var m = String(naam || "").match(/(?:^|[^A-Za-z])M?J?O\s?(\d{1,2})(?!\d)/i);
  if (!m) return null;
  var n = Number(m[1]);
  return n <= 8 ? "O7-O8" : n <= 11 ? "O9-O11" : n <= 14 ? "O12-O14" : n <= 17 ? "O15-O17" : n <= 19 ? "O18-O19" : null;
}

/* Een eigen kopie (om aan te passen): nieuwe id, geen bron. */
/** @param {any} o @param {number} id @returns {any} */
function kopieVanBibliotheek(o, id) {
  var k = JSON.parse(JSON.stringify(o));
  k.id = id; delete k.bron; k.uitBibliotheek = o.id; k.favoriet = false;
  return k;
}

/* Wie de oude 50 ooit heeft ingeladen ("kant-en-klare oefeningen
   laden"), heeft ze in zijn eigen opslag staan — zonder tekening en op
   O18-O19. Een kopie die nog precies zo is als toen, krijgt de nieuwe
   versie (met tekening, leeftijden en thema). Zelf aangepast? Dan
   blijft hij zoals hij is: we overschrijven nooit iemands eigen werk.
   Geeft de lijst terug, en hoeveel er zijn bijgewerkt. */
/** @param {any[]} eigen @returns {{lijst:any[], bijgewerkt:number}} */
function werkOudeBasisBij(eigen) {
  var basis = oudeBasis();
  var bib = bibliotheekOefeningen();
  var velden = ["naam", "type", "categorie", "doel", "leeftijd", "duur", "aantalSpelers", "veldGrootte", "materialen", "beschrijving", "aandachtspunten"];
  var bijgewerkt = 0;
  var lijst = (eigen || []).map(function (o) {
    if (!o || o.tekening || o.leeftijden) return o;
    var oud = basis.filter(function (/** @type {any} */ b) { return b.naam === o.naam; })[0];
    if (!oud || !velden.every(function (v) { return String(o[v] == null ? "" : o[v]) === String(oud[v] == null ? "" : oud[v]); })) return o;
    var nieuw = bib.filter(function (b) { return b.naam === o.naam; })[0];
    if (!nieuw) return o;
    bijgewerkt++;
    return Object.assign({}, o, { leeftijden: nieuw.leeftijden, leeftijd: nieuw.leeftijd, thema: nieuw.thema, tekening: nieuw.tekening });
  });
  return { lijst: lijst, bijgewerkt: bijgewerkt };
}

/* ── Thematrainingen ──────────────────────────────────────────
   Complete trainingen per leeftijd en thema, opgebouwd uit oefeningen
   uit de bibliotheek. Per onderdeel de naam van de oefening en de duur
   die hij in déze training krijgt. Tussen twee onderdelen rekenen we
   twee minuten voor uitleg en wisselen. */
const BIB_OVERGANG = 2;
const BIB_THEMATRAININGEN = [
  { naam: "Piratenfeest", thema: "Fun", leeftijden: ["O7-O8"], duur: 50,
    doel: "Plezier en veel balcontacten voor de mini's: dribbelen, kijken en durven.",
    onderdelen: [["Stoplicht", 8], ["Piratenvoetbal", 10], ["Schatgraven", 10], ["Doeltjesvoetbal 2 tegen 2", 12], ["Uitlopen en rekken", 2]] },
  { naam: "Dribbelen en durven", thema: "Techniek", leeftijden: ["O7-O8", "O9-O11"], duur: 60,
    doel: "De bal dicht aan de voet houden en durven een tegenstander uit te spelen.",
    onderdelen: [["Binnenkant, buitenkant in het vak", 8], ["Dribbelparcours met afronding", 12], ["Leeuwenjacht", 10], ["Estafette slalom", 10], ["Doeltjesvoetbal 2 tegen 2", 10]] },
  { naam: "Doeltjesfestival", thema: "Fun", leeftijden: ["O9-O11"], duur: 60,
    doel: "Een speelse training met veel doelpunten, waarin vanzelf goed gepast en gedribbeld wordt.",
    onderdelen: [["Tikkertje met bal", 8], ["Kegelbal", 10], ["Nummertjesspel", 10], ["4 tegen 4 op vier doeltjes", 14], ["Koning van de cirkel", 8]] },
  { naam: "Passen en aannemen", thema: "Techniek", leeftijden: ["O9-O11", "O12-O14"], duur: 60,
    doel: "Goed passen over de grond en de bal in één keer de goede kant op aannemen.",
    onderdelen: [["Passen en aannemen in tweetallen", 8], ["Passen door poortjes", 10], ["Lummelen 3 tegen 1", 10], ["Voetbalgolf", 10], ["3 tegen 3 met lijndoel", 12]] },
  { naam: "Samen aanvallen", thema: "Tactiek", leeftijden: ["O9-O11"], duur: 60,
    doel: "Kiezen tussen zelf gaan en afspelen, en het veld breed maken.",
    onderdelen: [["Tikkertje met bal", 6], ["2 tegen 1 naar het doel", 12], ["3 tegen 3 met lijndoel", 12], ["6 tegen 6 partijspel", 20]] },
  { naam: "Afwerken voor de jeugd", thema: "Techniek", leeftijden: ["O9-O11", "O12-O14"], duur: 60,
    doel: "Scoren: aanname richting doel, kiezen en raak schieten.",
    onderdelen: [["Passen en aannemen in tweetallen", 6], ["Afwerken na aanname", 14], ["1 tegen de keeper", 12], ["Afwerken na wandpass", 10], ["Doeltjesvoetbal 2 tegen 2", 10]] },
  { naam: "Breed en diep spelen", thema: "Tactiek", leeftijden: ["O12-O14", "O15-O17"], duur: 75,
    doel: "In balbezit het veld groot maken en via de vrije man de andere kant opzoeken.",
    onderdelen: [["Warming-up met bal en loopscholing", 12], ["Rondo 5 tegen 2", 12], ["Derde man vrijspelen", 12], ["Vier goals partij", 18], ["Uitlopen en rekken", 5]] },
  { naam: "Vrijdagavond-fun", thema: "Fun", leeftijden: ["O12-O14", "O15-O17", "O18-O19", "Senioren"], duur: 60,
    doel: "Even geen tactiek: spelvormen met strijd, techniek en lachen.",
    onderdelen: [["Nummertjesspel", 10], ["Panna-kooi 1 tegen 1", 10], ["Voetbalgolf", 12], ["Koning van de cirkel", 8], ["Vier goals partij", 12]] },
  { naam: "Techniek onder druk", thema: "Techniek", leeftijden: ["O12-O14", "O15-O17"], duur: 75,
    doel: "Aannemen, draaien en kaatsen terwijl er een tegenstander dichtbij staat.",
    onderdelen: [["Warming-up met bal en loopscholing", 10], ["Kaatsen in de driehoek", 10], ["Schijnbewegingen-circuit", 12], ["Schotoefening met draai", 12], ["Een tegen een op de flank", 12], ["Uitlopen en rekken", 5]] },
  { naam: "Druk zetten als team", thema: "Tactiek", leeftijden: ["O15-O17", "O18-O19", "Senioren"], duur: 90,
    doel: "Samen jagen: wie zet druk, wie dekt de passlijnen, en wanneer gaan we.",
    onderdelen: [["Warming-up met bal en loopscholing", 12], ["Pressing in het rondo", 12], ["Eerste druk op de bal", 12], ["Druk zetten vanaf voren", 20], ["Jagen op de bal in zones", 16], ["Uitlopen en rekken", 5]] },
  { naam: "Omschakelen na balverlies", thema: "Tactiek", leeftijden: ["O12-O14", "O15-O17", "O18-O19", "Senioren"], duur: 90,
    doel: "Na balverlies direct terugjagen of snel terug in de organisatie.",
    onderdelen: [["Warming-up met bal en loopscholing", 12], ["Omschakelspel vier tegen vier plus drie", 15], ["Direct terugjagen na balverlies", 18], ["Terugsprint na eigen kans", 15], ["Counter na balverovering", 15], ["Uitlopen en rekken", 5]] },
  { naam: "Afwerken en voorzetten", thema: "Techniek", leeftijden: ["O15-O17", "O18-O19", "Senioren"], duur: 90,
    doel: "Scoren uit verschillende situaties: na een kaats, na een voorzet en na het insnijden.",
    onderdelen: [["Snelheid: ladder, hordjes en afronden", 10], ["Afwerken na wandpass", 15], ["Insnijden en afronden", 15], ["Voorzetten en afronden", 18], ["Combineren in het laatste dertig", 18], ["Uitlopen en rekken", 4]] },
  { naam: "Opbouwen van achteruit", thema: "Tactiek", leeftijden: ["O15-O17", "O18-O19", "Senioren"], duur: 90,
    doel: "Rustig en beheerst opbouwen vanaf de keeper, ook als de tegenstander druk zet.",
    onderdelen: [["Warming-up met bal en loopscholing", 12], ["Vier tegen twee in het blok", 12], ["Y-passvorm met doorlopen", 14], ["Opbouwen van achteruit 7 tegen 5", 20], ["Eerste pass vooruit", 16], ["Uitlopen en rekken", 4]] }
];

/* Een thematraining met de echte oefeningen erbij. */
/** @param {any} th @returns {any[]} */
function onderdelenVanThema(th) {
  var bib = bibliotheekOefeningen();
  return th.onderdelen.map(function (/** @type {any[]} */ r) {
    var o = bib.filter(function (x) { return x.naam === r[0]; })[0];
    if (!o) throw new Error("Thematraining " + th.naam + ": oefening '" + r[0] + "' bestaat niet");
    return { oefening: o, duur: r[1] };
  });
}
/** @param {any} th @returns {number} minuten oefenen plus overgangen */
function themaTotaal(th) {
  return th.onderdelen.reduce(function (/** @type {number} */ s, /** @type {any[]} */ r) { return s + r[1]; }, 0) + BIB_OVERGANG * (th.onderdelen.length - 1);
}
/* Een thematraining als training in de agenda (zelfde vorm als
   voegUitBibliotheekToe in src/schermen/trainingen.jsx). */
/** @param {any} th @param {{datum?:string, tijd?:string, id:number}} o @returns {any} */
function trainingUitThema(th, o) {
  return {
    id: o.id, datum: o.datum || "", tijd: o.tijd || "", locatie: "", duur: th.duur,
    doelstellingen: th.naam + "\n" + th.doel, voorbereidingen: "", materialen: "",
    onderdelen: onderdelenVanThema(th).map(function (r, i) {
      var x = r.oefening;
      return { id: o.id + i + 1, naam: x.naam, type: x.type, doel: x.doel, duur: r.duur, aantalSpelers: x.aantalSpelers,
               veldGrootte: x.veldGrootte, materialen: x.materialen, beschrijving: x.beschrijving, aandachtspunten: x.aandachtspunten,
               tekening: JSON.parse(JSON.stringify(x.tekening)), uitBibliotheek: x.id };
    }),
    notities: "Thematraining uit de TEAMTAKKIE-bibliotheek (" + th.thema + ")."
  };
}
