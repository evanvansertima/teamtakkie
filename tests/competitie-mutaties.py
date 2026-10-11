#!/usr/bin/env python3
# ══════════════════════════════════════════════════════════════
#  Opzettelijke fouten in src/domein/competitie.js
#  ─────────────────────────────────────────────────────────────
#  Draaien:  python3 tests/competitie-mutaties.py
#
#  Regel 5 uit CLAUDE.md: een groene test die niets vangt is erger dan
#  geen test. Dit script zet telkens één fout in een KOPIE van de
#  module (de echte blijft ongemoeid), draait tests/competitie.test.js
#  daartegen, en verwacht dat die rood wordt.
#
#  Elke fout is er een die in het echt stilletjes kan ontstaan en de
#  stand of de statistieken laat liegen zonder dat iemand het ziet.
# ══════════════════════════════════════════════════════════════

import os, shutil, subprocess, sys, tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
WORTEL = os.path.dirname(HIER)
BRON = os.path.join(WORTEL, "src", "domein", "competitie.js")
TESTS = [os.path.join(HIER, "competitie.test.js"), os.path.join(HIER, "competitie-migratie.test.js")]

MUTATIES = [
    ("C1  onderling wordt niet opnieuw toegepast op de deelgroep",
     "      rangschik(groep, criteria, totaal, gespeeld, regels).forEach",
     "      rangschik(groep, rest, totaal, gespeeld, regels).forEach"),

    ("C2  een lege uitslag telt als 0–0",
     "  if (w.status !== \"gespeeld\" || !w.uitslag) return null;",
     "  if (!w.uitslag) return { thuis: 0, uit: 0 };"),

    ("C3  bij een eigen uitwedstrijd worden thuis en uit omgedraaid",
     "    return e.thuis ? { thuis: fch, uit: teg } : { thuis: teg, uit: fch };",
     "    return { thuis: fch, uit: teg };"),

    ("C4  een nieuwe fase neemt de wedstrijden mee",
     "    rondes: [], wedstrijden: []\n  };",
     "    rondes: [], wedstrijden: vorige ? vorige.wedstrijden.slice() : []\n  };"),

    ("C5  de tweede helft van een hele competitie draait thuis/uit niet om",
     "return /** @type {[string,string]} */ ([p[1], p[0]]);",
     "return /** @type {[string,string]} */ ([p[0], p[1]]);"),

    ("C6  het vrije team wordt niet bepaald",
     "    return vrij.length === 1 ? vrij[0] : null;",
     "    return null;"),

    ("C7  dezelfde wedstrijd via twee selecties telt dubbel",
     "      if (gezien[sleutel]) return;\n",
     ""),

    ("C8  wedstrijd-id's van verschillende teams worden samengevoegd",
     "      var sleutel = sel.bron.teamId + \"|\" + sel.bron.seizoen + \"|\" + w.id;",
     "      var sleutel = String(w.id);"),

    ("C9  dezelfde bewerking twee keer levert twee logregels op",
     "  if (oud.status === nieuw.status && JSON.stringify(oud.uitslag) === JSON.stringify(nieuw.uitslag)) return c;\n",
     ""),

    ("C10 bij een halve competitie mag het omgedraaide paar nog eens",
     "    return fase.vorm === \"half\" && x.thuisId === w.uitId && x.uitId === w.thuisId;",
     "    return false;"),

    ("C11 een wedstrijd in de toekomst telt als achterstallig",
     "    return w.status === \"gepland\" && !!w.datum && w.datum < vandaag && !uitslagVan(w, eigenWedstrijden);",
     "    return w.status === \"gepland\" && !!w.datum && !uitslagVan(w, eigenWedstrijden);"),

    ("C12 doelpunten van de tegenstander tellen bij een speler",
     "      if (!s.eigenTeam || s.spelerId === null || s.spelerId === undefined) return;",
     "      if (s.spelerId === null || s.spelerId === undefined) return;"),

    ("C13 een echt gelijke stand wordt niet als gedeeld gemarkeerd",
     "plek: plek, gedeeld: groep.length > 1 }",
     "plek: plek, gedeeld: false }"),

    ("C14 een negatieve score wordt geaccepteerd",
     "      return typeof n !== \"number\" || !isFinite(n) || n < 0 || Math.floor(n) !== n;",
     "      return typeof n !== \"number\" || !isFinite(n) || Math.floor(n) !== n;"),

    ("C15 punten uit alle fases lopen door in de stand (het oude probleem)",
     "  (f.wedstrijden || []).forEach(function (w) {\n    var u = uitslagVan(w, eigenWedstrijden);",
     "  [].concat.apply([], c.fases.map(function (x) { return x.wedstrijden; })).forEach(function (w) {\n    var u = uitslagVan(w, eigenWedstrijden);"),

    # ── omzetten van bestaande gegevens (stap 3) ──────────────
    ("M1  dezelfde club anders geschreven wordt een tweede team",
     "    if (bestaand) {\n      if (!bestaand.eigen",
     "    if (false) {\n      if (!bestaand.eigen"),

    ("M2  opnieuw bevestigen maakt een tweede set wedstrijden",
     "    if (!w || !isEigenCompetitie(w) || alGekoppeld(w.id)) return;",
     "    if (!w || !isEigenCompetitie(w)) return;"),

    ("M3  bij het omzetten is elk eigen duel een thuiswedstrijd",
     "      id: cwId, rondeId: \"\", thuisId: w.thuis ? eigen.id : tegen.id, uitId: w.thuis ? tegen.id : eigen.id,",
     "      id: cwId, rondeId: \"\", thuisId: eigen.id, uitId: tegen.id,"),

    ("M4  de controle ziet een ontbrekende wedstrijd niet",
     "    if (keer === 0) meldingen.push(",
     "    if (false) meldingen.push("),

    ("M5  de controle ziet een veranderde uitslag niet",
     "    if (!n || n.status !== w.status || JSON.stringify(n.score) !== JSON.stringify(w.score)) {",
     "    if (!n) {"),

    ("M6  elk seizoen krijgt een nieuwe persoonId",
     "      if (!perId[k]) perId[k] = nieuwId();",
     "      perId[k] = nieuwId();"),

    ("M7  koppelvoorstel op alleen de naam",
     "      if (sb.geboortedatum === sa.geboortedatum && normaliseerTeamNaam(sb.naam) === normaliseerTeamNaam(sa.naam)) {",
     "      if (normaliseerTeamNaam(sb.naam) === normaliseerTeamNaam(sa.naam)) {"),

    ("M8  een oefenwedstrijd komt in het voorstel",
     "  return (wedstrijden || []).filter(isEigenCompetitie).map(function (w) {\n    var al",
     "  return (wedstrijden || []).map(function (w) {\n    var al"),

    ("M9  bevestigen past de competitie van vóór het bevestigen aan",
     "  var nieuw = JSON.parse(JSON.stringify(c));\n  var eigen",
     "  var nieuw = c;\n  var eigen"),
]


def draai(module):
    """Beide testbestanden tegen deze module; rood als een van de twee rood is."""
    env = dict(os.environ, TT_COMPETITIE=module)
    code, samen = 0, []
    for test in TESTS:
        r = subprocess.run(["node", test], capture_output=True, text=True, env=env)
        regels = [l for l in r.stdout.splitlines() if "geslaagd" in l]
        samen.append(regels[-1].strip() if regels else "vastgelopen")
        code = code or r.returncode
    return code, " | ".join(samen)


def main():
    code, uit = draai(BRON)
    print("BASIS (zonder mutatie): %s -> %s" % ("groen" if code == 0 else "ROOD", uit))
    if code != 0:
        print("De tests zijn al rood zónder mutatie. Repareer dat eerst.")
        return 1
    origineel = open(BRON).read()
    tijdelijk = tempfile.mkdtemp()
    try:
        doorgeglipt = 0
        for naam, oud, nieuw in MUTATIES:
            if oud not in origineel:
                print("  %-66s MUTATIE PAST NIET MEER" % naam)
                doorgeglipt += 1
                continue
            kopie = os.path.join(tijdelijk, "competitie.js")
            open(kopie, "w").write(origineel.replace(oud, nieuw, 1))
            code, uit = draai(kopie)
            if code == 0:
                doorgeglipt += 1
            print("  %-66s %-14s %s" % (naam, "gevangen" if code else "NIET GEVANGEN", uit))
        print()
        if doorgeglipt == 0:
            print("Alle mutaties gevangen.")
            return 0
        print("LET OP: %d mutatie(s) glipten door. Er ontbreekt een test." % doorgeglipt)
        return 1
    finally:
        shutil.rmtree(tijdelijk, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
