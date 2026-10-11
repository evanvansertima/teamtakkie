#!/usr/bin/env python3
# ══════════════════════════════════════════════════════════════
#  Opzettelijke fouten in src/domein/aitrainer.js
#  ─────────────────────────────────────────────────────────────
#  Draaien:  python3 tests/aitrainer-mutaties.py
#  Regel 5 uit CLAUDE.md: elke fout hieronder moet tests/aitrainer.test.js
#  rood maken. Elke fout is er een waardoor een trainer een training
#  krijgt die op het veld niet kan (te lang, te veel spelers, te veel
#  materiaal) of waardoor er iets naar de AI gaat dat er niet heen hoort.
# ══════════════════════════════════════════════════════════════
import os, subprocess, tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
BRON = os.path.join(os.path.dirname(HIER), "src", "domein", "aitrainer.js")
TEST = os.path.join(HIER, "aitrainer.test.js")

MUTATIES = [
    ("A1  overgangstijd vergeten",
     "  var totaal = som + AI_OVERGANG_MIN * (tr.onderdelen.length - 1);",
     "  var totaal = som;"),
    ("A2  tijd: < in plaats van >",
     "  if (totaal > c.duur) f(",
     "  if (totaal >= c.duur) f("),
    ("A3  aantal spelers tekst/tekening niet vergeleken",
     "    if (Number.isInteger(o.aantalSpelers) && maxSpelers !== o.aantalSpelers) {",
     "    if (false) {"),
    ("A4  keepers niet meegeteld bij beschikbaar",
     "    if (o.aantalSpelers > c.spelers + c.keepers) f(",
     "    if (o.aantalSpelers > c.spelers + c.keepers + 5) f("),
    ("A5  keeper zonder keeper toegestaan",
     "    if (keeper && !c.keepers) f(",
     "    if (false) f("),
    ("A6  hoedjes tellen niet als pion",
     "        if (e.soort === \"pion\" || e.soort === \"hoedje\") pion++;",
     "        if (e.soort === \"pion\") pion++;"),
    ("A7  kleine doelen tellen niet mee",
     "        if (e.soort === \"goal\" || e.soort === \"minidoel\") doel++;",
     "        if (e.soort === \"goal\") doel++;"),
    ("A8  coördinaten niet gecontroleerd",
     "function binnen(v) { return typeof v === \"number\" && isFinite(v) && v >= 0 && v <= 100; }",
     "function binnen(v) { return true; }"),
    ("A9  belasting: aaneengesloten tijd niet opgeteld",
     "    if (o.intensiteit === \"hoog\") hoogAaneen += Number(o.duur) || 0; else hoogAaneen = 0;",
     "    hoogAaneen = o.intensiteit === \"hoog\" ? Number(o.duur) || 0 : 0;"),
    ("A10 labels uit de tekst niet nagekeken",
     "      if (!labels[lab]) f(\"labels\"",
     "      if (false) f(\"labels\""),
    ("A11 teamnaam gaat mee naar de AI",
     "  return {\n    leeftijd: uit(c.leeftijd, AI_LEEFTIJDEN, \"O12-O14\"),",
     "  return {\n    teamNaam: c.teamNaam,\n    leeftijd: uit(c.leeftijd, AI_LEEFTIJDEN, \"O12-O14\"),"),
    ("A12 aantal spelers niet begrensd",
     "    spelers: getal(c.spelers, 1, 40, 12),",
     "    spelers: Number(c.spelers) || 12,"),
    ("A13 procenten niet omgerekend",
     "  function om(p, max) { return Math.round(Math.max(0, Math.min(100, Number(p) || 0)) / 100 * max); }",
     "  function om(p, max) { return Math.round(Number(p) || 0); }"),
    ("A14 lijnsoort niet gecontroleerd",
     "        if (!l || AI_LIJNSOORTEN.indexOf(l.soort) < 0) {",
     "        if (!l) {"),
]

def draai(module):
    r = subprocess.run(["node", TEST], capture_output=True, text=True, env=dict(os.environ, TT_AI=module))
    regels = [l for l in r.stdout.splitlines() if "geslaagd" in l]
    return r.returncode, regels[-1].strip() if regels else "vastgelopen"

def main():
    code, uit = draai(BRON)
    print("BASIS: %s -> %s" % ("groen" if code == 0 else "ROOD", uit))
    if code: raise SystemExit("De basis is al rood; eerst repareren.")
    bron = open(BRON).read()
    gemist = 0
    for naam, oud, nieuw in MUTATIES:
        if bron.count(oud) != 1:
            print("  %-55s TEKST NIET GEVONDEN" % naam); gemist += 1; continue
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
            f.write(bron.replace(oud, nieuw)); pad = f.name
        code, uit = draai(pad); os.unlink(pad)
        status = "gevangen" if code else "NIET GEVANGEN"
        if not code: gemist += 1
        print("  %-55s %-14s %s" % (naam, status, uit))
    print("\nAlle mutaties gevangen." if not gemist else "\nLET OP: %d mutatie(s) glipten door." % gemist)
    raise SystemExit(1 if gemist else 0)

main()
