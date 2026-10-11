#!/usr/bin/env python3
# ══════════════════════════════════════════════════════════════
#  Opzettelijke fouten in src/domein/bibliotheek.js
#  Draaien:  python3 tests/bibliotheek-mutaties.py
#  Regel 5 uit CLAUDE.md: elke fout hieronder moet
#  tests/bibliotheek.test.js rood maken.
# ══════════════════════════════════════════════════════════════
import os, subprocess, tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
BRON = os.path.join(os.path.dirname(HIER), "src", "domein", "bibliotheek.js")
TEST = os.path.join(HIER, "bibliotheek.test.js")

MUTATIES = [
    ("B1 leeftijdfilter genegeerd",
     "if (f.leeftijd && f.leeftijd !== \"Alle\" && leeftijdenVan(o).indexOf(f.leeftijd) < 0) return false;", ""),
    ("B2 eigen aanpassing van een oude oefening overschreven",
     "if (!oud || !velden.every(function (v) { return String(o[v] == null ? \"\" : o[v]) === String(oud[v] == null ? \"\" : oud[v]); })) return o;",
     "if (!oud) return o;"),
    ("B3 'Alle' bij een oude oefening telt als één leeftijd",
     "if (!o || !o.leeftijd || o.leeftijd === \"Alle\") return BIB_LEEFTIJDEN.slice(0);",
     "if (!o || !o.leeftijd) return BIB_LEEFTIJDEN.slice(0);"),
    ("B4 coördinaten buiten het veld niet geweigerd",
     "if (!isFinite(n) || n < 0 || n > 100) throw", "if (false) throw"),
    ("B5 overgangstijd tussen onderdelen vergeten",
     ") + BIB_OVERGANG * (th.onderdelen.length - 1);", ");"),
    ("B6 geplande training deelt de tekening met de bibliotheek",
     "tekening: JSON.parse(JSON.stringify(x.tekening)), uitBibliotheek", "tekening: x.tekening, uitBibliotheek"),
    ("B7 kopie deelt de tekening met de bibliotheek",
     "var k = JSON.parse(JSON.stringify(o));", "var k = Object.assign({}, o);"),
    ("B8 JO8 bij de verkeerde leeftijd",
     "return n <= 8 ? \"O7-O8\"", "return n <= 7 ? \"O7-O8\""),
    ("B9 vakken bovenop de spelers",
     "elems.sort(function (x, y) {", "if (false) elems.sort(function (x, y) {"),
]

def draai(module):
    r = subprocess.run(["node", TEST], capture_output=True, text=True, env=dict(os.environ, TT_BIB=module))
    regels = [l for l in r.stdout.splitlines() if "geslaagd" in l]
    return r.returncode, regels[-1].strip() if regels else "vastgelopen"

code, uit = draai(BRON)
print("BASIS: %s -> %s" % ("groen" if code == 0 else "ROOD", uit))
if code: raise SystemExit("De basis is al rood.")
bron = open(BRON).read()
gemist = 0
for naam, oud, nieuw in MUTATIES:
    if bron.count(oud) != 1:
        print("  %-58s TEKST NIET GEVONDEN" % naam); gemist += 1; continue
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(bron.replace(oud, nieuw)); pad = f.name
    code, uit = draai(pad); os.unlink(pad)
    if not code: gemist += 1
    print("  %-58s %-14s %s" % (naam, "gevangen" if code else "NIET GEVANGEN", uit))
print("\nAlle mutaties gevangen." if not gemist else "\nLET OP: %d mutatie(s) glipten door." % gemist)
raise SystemExit(1 if gemist else 0)
