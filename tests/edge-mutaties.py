#!/usr/bin/env python3
# ══════════════════════════════════════════════════════════════
#  TEAMTAKKIE — vangen de tests van de betaalketen wel iets?
#  ─────────────────────────────────────────────────────────────
#  GEBRUIK
#      python3 tests/edge-mutaties.py
#
#  Je hebt er Deno voor nodig (dezelfde taal waarin Supabase edge
#  functions draaien). Installeren:  brew install deno
#  Staat Deno ergens anders, geef dan het pad mee:
#      DENO=/pad/naar/deno python3 tests/edge-mutaties.py
#
#  WAT DIT DOET, IN GEWONE TAAL
#  Het maakt een KOPIE van de map supabase/ en zet daar één voor één
#  een fout in. Na elke fout draait het alle tests. Een fout die geen
#  enkele test rood maakt, is een fout die op productie ook niemand zou
#  opvallen.
#
#  De map supabase/ in de repo wordt NIET aangeraakt. Alles gebeurt in
#  een tijdelijke kopie.
#
#  WAT JE ZOU MOETEN ZIEN
#  Eerst "BASIS (zonder mutatie): groen", en daarna bij elke regel het
#  woord "gevangen". Onderaan: "Alle mutaties gevangen."
#
#  WAAROM DIT BESTAAT
#  CLAUDE.md, harde regel 5: controleer je werk met opzettelijke
#  fouten. Een groene test die niets vangt is erger dan geen test, want
#  hij geeft rust die er niet is. Bij de betaalketen is dat geen
#  theorie: de tests hieronder zijn de enige controle op de twee
#  functies die met echt geld omgaan.
#
#  LET OP BIJ HET TOEVOEGEN VAN EEN MUTATIE
#  Een mutatie mag de code niet zó breken dat TypeScript hem al weigert
#  te vertalen. Dan is de test namelijk niet wat de fout vangt, maar de
#  vertaler — en dat is geen bewijs dat de test deugt. Twee van de
#  mutaties hieronder zijn om die reden herschreven (zie M6a/M6b).
# ══════════════════════════════════════════════════════════════
import os
import shutil
import subprocess
import sys
import tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
BRON = os.path.join(REPO, "supabase")
DENO = os.environ.get("DENO", "deno")

# (naam, bestand, wat er vervangen wordt, waardoor)
MUTATIES = [
    ("M1  het bedrag mag uit de body komen",
     "functions/betaling-starten/index.ts",
     '    const bedragCent = prijsCent(pakket, termijn);',
     '    const bedragCent = typeof body.bedrag_cent === "number" ? body.bedrag_cent : prijsCent(pakket, termijn);'),

    ("M2  de eigenaarscontrole laat iedereen door",
     "functions/betaling-starten/index.ts",
     '    if (rijen.length === 0) {',
     '    if (false) {'),

    ("M3  het filter op gebruiker_id verdwijnt uit de leden-vraag",
     "functions/betaling-starten/index.ts",
     '      gebruiker_id: "eq." + ik.id,',
     ''),

    ("M4  de foutmelding van Mollie gaat mee naar de browser",
     "functions/betaling-starten/index.ts",
     '    return fout("Betaling starten is niet gelukt", 502);\n  }\n}',
     '    return fout(String(f), 502);\n  }\n}'),

    ("M5  de vormcontrole op het betaalnummer verdwijnt",
     "functions/betaling-melding/index.ts",
     '  if (!BETAALNUMMER_VORM.test(id)) {',
     '  if (false) {'),

    ("M6a een 404 van Mollie geeft 500 in plaats van 200",
     "functions/betaling-melding/index.ts",
     '      return kort("onbekend", 200);',
     '      return kort("onbekend", 500);'),

    ("M6b bij een 404 wordt de database tóch geraadpleegd",
     "functions/betaling-melding/index.ts",
     '    const betaling = await mollie.haalBetaling(id);',
     '    const betaling = await mollie.haalBetaling(id);\n    await db.selecteer("betalingen", { select: "id" });'),

    ("M7  elke status telt als betaald",
     "functions/betaling-melding/index.ts",
     '    if (betaling.status !== "paid") {',
     '    if (betaling.status === "deze-status-bestaat-niet") {'),

    ("M8  een tweede melding maakt tóch een tweede subscription",
     "functions/betaling-melding/index.ts",
     '      if (!alAanwezig && interval) {',
     '      if (interval) {'),

    ("M9  de subscription begint meteen (startDate weg)",
     "functions/betaling-melding/index.ts",
     '          startDate: startDatumVolgendePeriode(new Date(betaaldOp), termijn),',
     ''),

    ("M10 p_valuta schuift vóór p_modus (de fout uit 18-betalingen.sql)",
     "functions/betaling-melding/index.ts",
     '      p_modus: modus,\n      p_mollie_klant: klantId,\n      p_valuta: valuta,',
     '      p_valuta: valuta,\n      p_modus: modus,\n      p_mollie_klant: klantId,'),

    ("M11 het bedrag wordt zonder afronding omgerekend",
     "functions/_gedeeld/mollie.ts",
     '  return Math.round(getal * 100);',
     '  return getal * 100;'),

    ("M12 zonder sleutel gewoon doorgaan met een lege sleutel",
     "functions/_gedeeld/mollie.ts",
     '    throw new MollieFout("geen_sleutel", GEEN_SLEUTEL_TEKST);',
     '    return "";'),
]


def draai(werk):
    try:
        r = subprocess.run([DENO, "test", "--quiet", werk],
                           capture_output=True, text=True)
    except FileNotFoundError:
        print("Deno niet gevonden (%s). Installeer het met: brew install deno" % DENO)
        print("Of geef het pad mee:  DENO=/pad/naar/deno python3 tests/edge-mutaties.py")
        sys.exit(2)
    return r.returncode, (r.stdout + r.stderr)


def uitslagregel(uit):
    for regel in uit.splitlines():
        if "passed" in regel and "failed" in regel:
            return regel.strip()
    for regel in uit.splitlines():
        if "error" in regel.lower():
            return regel.strip()[:110]
    return "(geen uitslagregel)"


def main():
    tijdelijk = tempfile.mkdtemp(prefix="tt-edge-mutaties-")
    werk = os.path.join(tijdelijk, "supabase")
    shutil.copytree(BRON, werk)
    try:
        code, uit = draai(werk)
        print("BASIS (zonder mutatie): %s -> %s"
              % ("groen" if code == 0 else "ROOD", uitslagregel(uit)))
        if code != 0:
            print(uit[-3000:])
            print("\nDe tests zijn al rood zónder mutatie. Repareer dat eerst;")
            print("hieronder valt anders niets te bewijzen.")
            return 1

        doorgeglipt = 0
        for naam, pad, oud, nieuw in MUTATIES:
            vol = os.path.join(werk, pad)
            origineel = open(vol).read()
            if oud not in origineel:
                print("  %-62s MUTATIE PAST NIET MEER (de code is veranderd)" % naam)
                doorgeglipt += 1
                continue
            open(vol, "w").write(origineel.replace(oud, nieuw, 1))
            code, uit = draai(werk)
            open(vol, "w").write(origineel)
            if code == 0:
                doorgeglipt += 1
            print("  %-62s %-14s %s"
                  % (naam, "gevangen" if code else "NIET GEVANGEN", uitslagregel(uit)))

        print()
        if doorgeglipt == 0:
            print("Alle mutaties gevangen.")
            return 0
        print("LET OP: %d mutatie(s) glipten door. Er ontbreekt een test."
              % doorgeglipt)
        return 1
    finally:
        shutil.rmtree(tijdelijk, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
