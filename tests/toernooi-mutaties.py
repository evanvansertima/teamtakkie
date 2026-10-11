#!/usr/bin/env python3
# ══════════════════════════════════════════════════════════════
#  Opzettelijke fouten in src/domein/toernooi.js
#  ─────────────────────────────────────────────────────────────
#  Draaien:  python3 tests/toernooi-mutaties.py
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
BRON = os.path.join(WORTEL, "src", "domein", "toernooi.js")
TESTS = [os.path.join(HIER, "toernooi.test.js"), os.path.join(HIER, "toernooi-planner.test.js")]

MUTATIES = [
    ("K1  een gelijke knock-out zonder strafschoppen mag",
     "      if (cat.knockoutGelijk !== \"loting\" && (!straf || straf.thuis === straf.uit)) {",
     "      if (false) {"),
    ("K2  strafschoppen tellen als doelpunten",
     "    n = Object.assign({}, w, { status: \"gespeeld\", uitslag: { thuis: uitslag.thuis, uit: uitslag.uit },",
     "    n = Object.assign({}, w, { status: \"gespeeld\", uitslag: straf ? { thuis: uitslag.thuis + straf.thuis, uit: uitslag.uit + straf.uit } : { thuis: uitslag.thuis, uit: uitslag.uit },"),
    ("K3  een gespeelde vervolgwedstrijd wordt bij bijwerken veranderd",
     "  if (w.status === \"gespeeld\") return t;\n  var n = Object.assign({}, w);",
     "  var n = Object.assign({}, w);"),
    ("K4  plaatsing past zich stil aan de stand aan (geen vastzetten)",
     "  return { thuis: w.thuisVast || bronDeelnemer(t, w.thuis), uit: w.uitVast || bronDeelnemer(t, w.uit) };",
     "  return { thuis: (w.thuis.poulePlek ? huidigePlaatsing(t, w.thuis) : w.thuisVast) || bronDeelnemer(t, w.thuis), uit: (w.uit.poulePlek ? huidigePlaatsing(t, w.uit) : w.uitVast) || bronDeelnemer(t, w.uit) };"),
    ("K5  starten kan met een onvolledige groepsfase",
     "    if (!groepsfaseCompleet(t, id)) throw new Error(",
     "    if (false) throw new Error("),
    ("K6  beste nummers op totaal in plaats van gemiddelde",
     "  function gem(r, veld) { return r.gespeeld ? r[veld] / r.gespeeld : 0; }",
     "  function gem(r, veld) { return r[veld]; }"),
    ("K7  geen vrijstellingen: bracket niet naar macht van 2",
     "  while (grootte < bronnen.length) grootte *= 2;",
     "  grootte = bronnen.length + (bronnen.length % 2);"),
    ("K8  veldconflict zonder wisseltijd",
     "    if (a.w.veldId === b.w.veldId && a.b < b.bezet && b.b < a.bezet) {",
     "    if (a.w.veldId === b.w.veldId && a.b < b.e && b.b < a.e) {"),
    ("K9  rustregel ontbreekt",
     "      if (rust < Math.max(eerst.rust, later.rust)) {",
     "      if (false) {"),
    ("K10 deelnemer uit een andere categorie in een poule",
     "      if (!d || d.categorieId !== catId) throw new Error(",
     "      if (!d) throw new Error("),
    ("K11 dezelfde naam twee keer in een categorie",
     "  if (bestaand) return { toernooi: t, id: bestaand.id, nieuw: false };",
     ""),
    ("K12 slangvorm vergeten bij plaatsing",
     "    poules[ronde % 2 === 0 ? pos : n - 1 - pos].push(id);",
     "    poules[pos].push(id);"),
    ("K13 tijd buiten de dag niet gemeld",
     "    if (dag && (x.b < minVan(dag.start) || x.e > minVan(dag.eind))) {",
     "    if (false) {"),
    # ── Planner en scheidsrechters (release 3) ──
    ("P1  planner negeert het bezette veld",
     "    if (x.veldId === veldId && s < x.bezet && x.b < me.bezet) uit.push(",
     "    if (false) uit.push("),
    ("P2  planner negeert de rust",
     "    else if ((s >= x.e && s - x.e < r) || (x.b >= me.e && x.b - me.e < r)) uit.push(",
     "    else if (false) uit.push("),
    ("P3  vervolgwedstrijd hoeft niet te wachten",
     "    if (dx > dy || (dx === dy && s < x.e + rust)) uit.push(",
     "    if (false) uit.push("),
    ("P4  vastgezette wedstrijd wordt verplaatst",
     "        (w.vastgezet || w.status === \"gespeeld\" || o.alleenOngepland)) {",
     "        (w.status === \"gespeeld\" || o.alleenOngepland)) {"),
    ("P5  evenement blokkeert niets",
     "    if (s < ee && eb < me.e) uit.push(ev.naam || \"evenement\");",
     ""),
    ("P6  planner kijkt niet naar het einde van de dag",
     "  if (s < minVan(dag.start) || me.e > minVan(dag.eind) + (o.eindPlus || 0)) uit.push(",
     "  if (s < minVan(dag.start)) uit.push("),
    ("P7  groepsfase-plek wacht niet op de groepsfase",
     "    if (st) t.wedstrijden.forEach(",
     "    if (false) t.wedstrijden.forEach("),
    ("P8  scheidsrechter tegelijk bij twee wedstrijden",
     "      return !bezet[s.id].some(function (y) { return y.dagId === x.dagId && x.b < y.e && y.b < x.e; });",
     "      return true;"),
    ("P9  scheidsrechter buiten beschikbaarheid",
     "      if (besch.length && !besch.some(",
     "      if (false && !besch.some("),
    ("P10 scheidsrechter niet eerlijk verdeeld",
     "      return va - vb || bezet[a.id].length - bezet[b.id].length;",
     "      return va - vb;"),
    ("P11 dubbel ingedeelde scheidsrechter niet gemeld",
     "    if (a.w.scheidsId && a.w.scheidsId === b.w.scheidsId && a.b < b.e && b.b < a.e) {",
     "    if (false) {"),
    ("P12 uitgesloten categorie toch toegewezen",
     "      if ((s.nietCategorieen || []).indexOf(w.categorieId) >= 0) return false;",
     ""),
    ("P13 kandidaat-tijden missen de rust na een eigen wedstrijd",
     "        if (x.teams.some(function (/** @type {string} */ id) { return me0.teams.indexOf(id) >= 0; })) kand.push(",
     "        if (false) kand.push("),
]


def draai(module):
    """Beide testbestanden tegen deze module; rood als een van de twee rood is."""
    env = dict(os.environ, TT_TOERNOOI=module)
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
            kopie = os.path.join(tijdelijk, "toernooi.js")
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
