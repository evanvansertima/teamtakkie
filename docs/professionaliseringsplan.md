# TEAMTAKKIE — plan om de code te professionaliseren

**Datum:** 10 september 2026
**Doel:** klaar voor een tweede ontwikkelaar
**Architectuurkeuze:** volledig naar modules met een echte bouwstap

---

## Wat er al goed is, en waarom dat het uitgangspunt is

Voordat ik opschrijf wat er moet veranderen: er staat meer dan je zou verwachten.

**Het commentaar is uitzonderlijk.** Niet "wat" maar "waarom", vaak met de afweging
erbij. Bij `SEIZOEN_MEE` staat waarom de selectie wél meegaat naar een nieuw seizoen
en de wedstrijden niet. Bij `abonnementen` staat waarom er geen schrijfregel op zit.
Dat soort commentaar overleeft een refactor en is precies wat een tweede
ontwikkelaar nodig heeft. Het is het beste dat je hebt.

**Je hebt een verificatiegewoonte.** `legacy/controle/check.py` is een zelfgeschreven
controle op haakjes, JSX-nesting en niet-gesloten strings — 8,9 KB, vóór elke
oplevering gedraaid. En je V34-notities melden *"118 controles op de veldvormen, 13
opzettelijke fouten teruggezet, alle 13 gevangen"*. Dat is mutatietesten. Dat doen de
meeste professionele teams niet.

**En daar zit meteen het probleem.**

---

## Het kernprobleem is niet de bestandsgrootte

33.781 regels in één bestand is onhandig, maar het is niet wat een tweede
ontwikkelaar tegenhoudt. Dit wel:

> Je weet niet meer waar die 28 testbestanden zijn. Niemand kan vandaag
> reproduceren dat V34 groen was.

Ik heb gezocht: ze staan niet in de repo, niet in de projectmap, nergens. De
controle is gedraaid, de uitkomst staat in de release notes, en het bewijs is weg.
En `check.py` wijst nog naar `fc-harlingen-app.html` — het oude prototype van 922 KB,
niet naar de app die je uitrolt. Draai je hem vandaag, dan controleert hij het
verkeerde bestand en zegt hij dat alles in orde is.

**Ik deed vanochtend precies hetzelfde.** De 32 tests waarmee ik de seizoenfix heb
gecontroleerd stonden in `/tmp` in mijn eigen werkomgeving. Die waren bij het
afsluiten van deze sessie verdwenen, net als jouw 28. Ik heb ze daarom net als eerste
in de repo gezet — zie hieronder.

Dat is de kern van professionaliseren voor een tweede ontwikkelaar: **niet betere
code, maar overdraagbare zekerheid.** Kennis die in één hoofd zit en controles die
niemand kan herhalen — dat is wat een tweede persoon blokkeert.

---

## Al gedaan: `tests/seizoen.test.js`

Ik heb de seizoentests omgebouwd tot een bestand dat in de repo hoort, op branch
`seizoenfix`.

```
node tests/seizoen.test.js       →  34 geslaagd, 0 gefaald
```

Geen testframework, geen `npm install`, geen bouwstap — alleen node. En het knipt de
functies uit `online/index.html` zélf in plaats van uit een kopie, zodat de test
faalt zodra iemand ze hernoemt.

**Daarna heb ik jouw methode toegepast:** zes opzettelijke fouten teruggezet.

| Opzettelijke fout | Gevangen? |
|---|---|
| seizoensgrens een maand verschoven | ja |
| de eenmalig-vlag uitgeschakeld | ja |
| datums tellen niet mee bij het verdelen | ja |
| elke prefix telt weer als seizoen | ja |
| een botsing overschrijft nu wél | ja — pas ná het toevoegen van een test |
| blote sleutels weer meenemen in de sync | **nee** |

Vijf van de zes. Die zesde is een echt gat: `syncTeamGegevens()` is de functie die de
kringloop verbreekt, en er is geen enkele test op. Hij staat in een ander deel van
het bestand en heeft een nagebootste `serverVraag()` nodig. Dat is punt één van
fase P0.

Dit is meteen het bewijs dat de methode werkt: zonder die mutatietest had ik gedacht
dat het gedekt was.

---

## De volgorde in het groot

Zes fasen. De regel die over alle zes heen ligt: **de app blijft elke week
uitrolbaar.** Er komt geen moment waarop er een halve verbouwing naast een draaiende
applicatie staat. Elke fase eindigt met een `online/index.html` die je naar Netlify
kunt slepen.

```
P0  vangnet            tests, controles, CI          ── vóór alles
P1  bouwstap           gedrag ongewijzigd, Babel eruit
P2  de kern eruit      opslag, sleutels, sync
P3  domeinlogica eruit berekeningen en statussen
P4  vijf schermmodules
P5  typen
P6  tweede ontwikkelaar kan beginnen
```

---

### P0 — Vangnet · ± 2 dagen · geen gedragswijziging

Zonder dit is alles daarna gokken.

1. **`tests/` in de repo.** `seizoen.test.js` staat er (34 tests). Erbij:
   `sync.test.js` (het gat hierboven), `opkomst.test.js` (de vier verschillende
   opkomstberekeningen uit de audit), `sleutels.test.js`.
2. **`check.py` repareren en verplaatsen** naar `tools/check.py`, wijzend naar
   `online/index.html`. Nu controleert hij het verkeerde bestand.
3. **Gouden origineel.** Een Playwright-script dat de app opent met een vaste
   localStorage-vulling en van alle acht pagina's de DOM en een schermafdruk
   vastlegt. Dat is je referentie voor álles wat daarna komt: elke module die je
   eruit trekt moet exact hetzelfde beeld opleveren.
   Dit is de belangrijkste stap van het hele plan. Zonder gouden origineel is een
   opsplitsing van 33.000 regels niet verantwoord.
4. **`mutatie.js`** — het script dat ik hierboven gebruikte, als vast onderdeel.
   Een test die geen fout vangt, is geen test.
5. **GitHub Actions**: bij elke push de syntaxcontrole, de tests en het gouden
   origineel. Rood is rood.

**Klaar als:** een tweede ontwikkelaar `git clone` doet, `node tests/` draait en
groen ziet zonder jou iets te vragen.

---

### P1 — Bouwstap · ± 2 dagen · gedrag exact ongewijzigd

Eén doel: JSX niet meer in de browser van de gebruiker vertalen.

- `esbuild` erin. Invoer `src/`, uitvoer `online/index.html` — één bestand, precies
  zoals nu. **De uitrol verandert niet:** je sleept dezelfde map naar Netlify.
- `babel-standalone` verdwijnt uit de `<script>`-lijst. Dat is 30.870 regels JSX die
  bij elk koud bezoek niet meer vertaald hoeven te worden.
- React en ReactDOM blijven voorlopig van cdnjs; dat scheelt discussie.

**Verificatie:** het gouden origineel uit P0 moet identiek zijn. Geen enkel
pixelverschil, geen enkele DOM-afwijking.

**Waarom dit vóór het opsplitsen:** je wilt de bouwstap bewezen hebben op code die
je nog niet hebt aangeraakt. Doe je het andersom, dan weet je bij een verschil niet
of het aan de bouwstap of aan de verplaatsing ligt.

**Meetbaar:** tijd tot interactief op een telefoon, vóór en na. Dat getal is het
argument om door te gaan.

---

### P2 — De kern eruit · ± 3 dagen

Regel 2948 – 5469, ongeveer 2.500 regels. Het minst met de UI verweven en het meest
waard om te testen.

```
src/kern/sleutels.js      sleutelVoor, seizoenen, teams
src/kern/opslag.js        laadJson, slaJson, back-up, terugzetten
src/kern/server.js        serverVraag, aanmelden, sessie
src/kern/sync.js          syncEen, voegSamen, het vangnet
src/kern/rollen.js        rollen, beheerderstatus
```

Per module: eruit trekken, test erop, gouden origineel draaien, commit. Vijf kleine
stappen, elk los terug te draaien.

Hier komt ook het gat uit de mutatietest te vervallen: `sync.js` wordt testbaar
zodra `serverVraag` een parameter is in plaats van een globale functie.

---

### P3 — Domeinlogica eruit · ± 4 dagen

Regel 5470 – 11013, ongeveer 5.500 regels. Berekeningen, statussen, statistieken.
Grotendeels pure functies: invoer erin, uitkomst eruit, geen opslag, geen DOM.

**Dat maakt het de makkelijkste code om te testen en de meest waardevolle om te
dekken** — hier zitten de opkomstpercentages, de topscorers en de speelminuten waar
je klanten hun beslissingen op baseren.

Meteen meenemen: de vier verschillende opkomstberekeningen uit de audit worden er
één. Dat is een bugfix die zich vanzelf aandient zodra je ze naast elkaar in één
module zet.

---

### P4 — Vijf schermmodules · ± 6 dagen

De natuurlijke breuklijnen, uit de codestructuur:

| Module | Regels nu | Componenten |
|---|---:|---:|
| wedstrijden | 5.386 | 27 |
| clubhuis, sportpark, tenue | 5.753 | 17 |
| opstellingen en tekenbord | 3.057 | 15 |
| trainingen en agenda | 2.967 | 13 |
| statistieken en grafieken | 1.430 | 10 |

Eén per week, gouden origineel na elke. Wat overblijft is een schil van een paar
honderd regels: `App`, de navigatie en de onboarding.

---

### P5 — Typen · ± 2 dagen

**Geen herschrijving naar TypeScript.** Wel `// @ts-check` met JSDoc-annotaties op
de kern en de domeinlogica, en `checkJs` in de bouwstap. Dat vangt het gros van de
fouten die een tweede ontwikkelaar maakt (verkeerde vorm van een object, vergeten
`null`-controle) zonder dat er 30.000 regels om moeten.

Begin bij `src/kern/` — daar levert het het meeste op en is het het minste werk.

---

### P6 — Een tweede ontwikkelaar kan beginnen · ± 2 dagen

Dit is waar het hele plan om begonnen is.

- **`README.md` herschrijven.** Hij beschrijft nu `backend/` en `frontend/` — een
  applicatie die niet draait. Dat kost iedere nieuwkomer een halve dag.
- **`docs/architectuur.md`** — de codestructuur en de ERD die er al liggen, plus:
  waarom localStorage de bron van waarheid is en de server niet. Zonder die uitleg
  lijkt de synchronisatiecode onnodig ingewikkeld.
- **`CONTRIBUTING.md`** — branch per wijziging, tests groen vóór samenvoegen,
  gouden origineel bij UI-wijzigingen, `VERSIE` in `sw.js` verhogen bij elke uitrol.
- **Foutrapportage in productie.** Er is nu geen enkele manier om te weten dat een
  gebruiker een witte pagina zag. Bij één gebruiker merk je dat zelf; bij vijftig
  niet.
- **Toegang regelen.** Supabase, Netlify, GitHub, de domeinnaam. Nu hangt alles aan
  jouw accounts.
- **Eén afspraak over persoonsgegevens.** Er staan namen en geboortedata van
  minderjarigen in die database. Een tweede ontwikkelaar hoort te weten dat
  productiedata niet naar een testomgeving gaat en niet in een repo terechtkomt —
  precies zoals we het bij staging hebben gedaan met een synthetische seed.

---

## Wat ik níét zou doen

**Niet herschrijven.** De verleiding om 33.000 regels opnieuw te beginnen in Next.js
is groot en het is de bekendste manier om een werkend product te verliezen. Elke stap
hierboven houdt de app draaiend.

**Niet naar een componentbibliotheek.** De CSS is 2.808 regels en past bij het
product. Materiaal of Tailwind erin trekken kost weken en levert de gebruiker niets.

**Geen 100% dekking najagen.** Dek de kern, de domeinlogica en de betaalde
functionaliteit. De tekenbordcode heeft weinig baat bij unit tests; daar is het
gouden origineel genoeg.

**Niet alles tegelijk met de functionele achterstand.** Zie hieronder.

---

## Hoe dit samenloopt met wat er al klaarstaat

Er ligt al werk te wachten: `seizoenfix`, fase A, de Engelse hernoeming en fase C
tot L uit de audit. Die kunnen niet allemaal tegelijk.

```
nu        P0 vangnet              ← eerst, beschermt al het andere
daarna    seizoenfix uitrollen    ← ligt klaar en getest
          fase A                  ← ligt klaar en getest
          P1 bouwstap
          E1 Engelse hernoeming   ← samen met de app-aanpassing
          P2 kern eruit
          fase C entitlements     ← bouwt dan al in modules
          P3 domeinlogica
          fase F team_leden
          P4 schermmodules
          P5 typen
          P6 overdracht
```

**Waarom P0 vóór alles:** je staat op het punt drie ingrijpende wijzigingen uit te
rollen — een seizoenfix, twee RLS-policies en een volledige schemahernoeming. Op dit
moment is de enige verificatie dat je zelf even kijkt of het nog werkt. Twee dagen
vangnet nu, en elke stap daarna is controleerbaar.

**Waarom P1 vóór E1:** de Engelse hernoeming raakt negentien plekken in
`index.html`. Met een bouwstap en tests eromheen is dat een middag; zonder is het
handwerk met een uitrolvenster eraan vast.

---

## Wat het bij elkaar is

| Fase | Doorlooptijd | Gedragswijziging | Risico |
|---|---|---|---|
| P0 vangnet | 2 dagen | geen | geen |
| P1 bouwstap | 2 dagen | sneller laden | laag |
| P2 kern | 3 dagen | geen | laag |
| P3 domeinlogica | 4 dagen | één bugfix | middel |
| P4 schermen | 6 dagen | geen | middel |
| P5 typen | 2 dagen | geen | geen |
| P6 overdracht | 2 dagen | geen | geen |

**Ongeveer 21 werkdagen**, gespreid over de functionele achterstand heen. Dat is
geen aaneengesloten blok en hoort dat ook niet te zijn: P0 en P1 leveren meteen iets
op, de rest kan tussen de functionele fasen door.

---

## Waar ik jouw beslissing voor nodig heb

**B1 — Blijft de code Nederlands?** De database gaat naar het Engels, dat staat
vast. Voor de app heb je gekozen die te laten. Voor jou alleen is dat prima. Voor een
tweede ontwikkelaar is het een vraag: `sleutelVoor`, `magSchrijven`, `voegSamen` —
spreekt hij Nederlands? Zo niet, dan wordt P2 het natuurlijke moment, want dan
verplaats je die code toch al. Later wordt het duurder.

**B2 — Beginnen we met P0, of eerst seizoenfix en fase A uitrollen?** Mijn advies is
P0 eerst, precies omdat die twee uitrollen eraan komen. Maar ze liggen klaar en er
zit een echte bug in productie, dus ik snap de andere keuze ook.

**B3 — Waar mag ik het gouden origineel op baseren?** Het werkt het beste met echte
gegevens, maar dat zijn namen en geboortedata van minderjarigen. Ik stel voor: een
synthetische vulling met dezelfde vorm, net als bij `S3-seed-basis.sql` op staging.
Dan kan het bestand gewoon in de repo.

**B4 — Wil je dat ik P0 nu uitwerk?** Dan lever ik de drie ontbrekende testbestanden,
de gerepareerde `check.py`, het gouden-origineelscript en de GitHub Actions-workflow
— allemaal als diff, zoals bij de seizoenfix, en zonder iets uit te rollen.
