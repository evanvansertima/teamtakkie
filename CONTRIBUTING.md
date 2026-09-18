# Bijdragen aan TEAMTAKKIE

Lees eerst [`CLAUDE.md`](CLAUDE.md) — dat zijn de harde regels, deze
tekst is de praktische uitwerking ervan. Lees ook
[`docs/architectuur.md`](docs/architectuur.md) als je nog niet weet hoe
de bouwstap, het datamodel of de verificatie in elkaar zitten.

## De vier regels die nooit een uitzondering krijgen

1. **`online/index.html` is een bouwproduct.** Bewerk `src/`, nooit
   `online/index.html` rechtstreeks — je wijziging verdwijnt bij de
   volgende `node tools/bouw.js` en er staat geen commentaar in het
   gebouwde bestand dat je had kunnen raadplegen.
2. **Elke wijziging houdt de app uitrolbaar.** Er komt nooit een halve
   verbouwing naast een werkende versie te staan. Zie hieronder voor de
   volgorde die dat garandeert.
3. **Commentaar legt het *waarom* uit, niet het *wat*.** Dat is de
   gewoonte die dit project leesbaar houdt. Een variabele die duidelijk
   `spelersLijst` heet, heeft geen commentaar nodig dat zegt "lijst met
   spelers" — wél als er een niet-voor-de-hand-liggende reden is waarom
   hij zo is opgebouwd.
4. **Een wijziging aan een test of controlescript wordt bewezen met een
   opzettelijke fout.** Breek het ding dat je net hebt gebouwd of
   aangepast expres, bevestig dat het rood wordt, herstel het, bevestig
   dat het weer groen is. Een controle die nooit rood is geweest, is
   geen bewezen controle — dit heeft dit project al twee keer averij
   opgeleverd toen het werd overgeslagen (zie `docs/technische-
   beoordeling.md`).

## Vóór je iets samenvoegt: de volgorde

```
node tools/bouw.js                               # 1. bouwen
python3 tools/check.py                           # 2. syntax + is de build actueel
node tools/typen-check.js                        # 3. typen (src/kern/, src/domein/)
for f in tests/*.test.js; do node "$f"; done      # 4. alle tests, 298 op dit moment
node tools/gouden-origineel.js --vergelijk        # 5. UI-regressie, ~10-15 minuten
```

Stap 5 raak je alleen als je een schermmodule (`src/schermen/*.jsx`) of
`src/app.jsx` hebt aangepast — bij een pure `src/kern/`/`src/domein/`-
wijziging is hij ook zinvol (hij toetst het eindresultaat), maar minder
snel de plek waar iets misgaat. Sla hem nooit over bij twijfel: hij is
tot nu toe de enige controle die React-componenten daadwerkelijk test.

**Verandert het gouden origineel iets dat je niet had voorzien?** Stop.
Zoek uit waarom vóór je de baseline opnieuw opneemt
(`node tools/gouden-origineel.js`, zonder `--vergelijk`). Een nieuwe
baseline die een echte regressie stilzwijgend "goedkeurt" is erger dan
geen test.

**Verandert het gouden origineel bewust iets** (je repareert opzettelijk
een stuk gedrag)? Voorspel vooraf welke opname(s) gaan veranderen en
welk verschil je verwacht, draai dan pas de vergelijking, en neem alleen
een nieuwe baseline op als het resultaat precies bij je voorspelling
past. Zo is de vorige opkomstberekening in de app samengevoegd (zie
`docs/professionaliseringsplan.md`, P3) — dat is het patroon om te
volgen bij elke volgende bewuste gedragswijziging.

## Branches en commits

- Eén branch per wijziging. Dit project heeft (nog) geen CI die dit
  afdwingt — de discipline zit in het hierboven staande rijtje, niet in
  automatica.
- Commitberichten leggen de reden uit, niet alleen de handeling
  ("Los het scherm-crash op bij een lege presentielijst, niet: "Fix
  bug"). Kijk naar `git log` voor de toon die dit project aanhoudt.
- Voeg geen bestanden toe aan `backend/`, `frontend/`, `caddy/` of
  `docker-compose.yml` — dat is een afgebroken eerdere poging (zie
  `README.md`) en wordt niet voortgezet tenzij Evan er expliciet om
  vraagt.

## Nieuwe tests

- Horen in `tests/` in de repo. Niet in `/tmp`, niet in een losse
  werkmap — een test die verdwijnt zodra een sessie sluit, is geen
  bewijs. Dit is al twee keer misgegaan in dit project.
- Kaal `node`, geen testframework — kijk naar `tests/sync.test.js` voor
  de knip-en-eval-stijl die de rest van dit project gebruikt: een
  functie als tekst uit de bron knippen en tegen een nagemaakte
  omgeving draaien, zodat de test breekt zodra de échte, uitgerolde
  functie verandert.
- Voor React-componenten bestaat geen knip-en-eval-equivalent — het
  gouden origineel is daar het vangnet. Ontbreekt een scherm of
  tabblad daarin, overweeg een nieuwe opname toe te voegen vóór je
  eraan gaat bouwen (zie de "OP ... IS ER ÉÉN BIJ GEKOMEN"-aantekeningen
  in `tools/gouden-origineel.js` voor het patroon).

## Bij het uitrollen

1. `node tools/bouw.js` — bouw de laatste versie van `src/`.
2. Draai de volledige verificatie hierboven.
3. Als gebruikers de wijziging echt moeten zien (niet elke kleine
   tekstwijziging, maar wel iets waar iemand op zou kunnen wachten):
   verhoog `VERSIE` in `online/sw.js`. Zonder die verhoging kan een
   browser de oude, gecachte versie blijven tonen.
4. Sleep de map `online/` naar Netlify. (Zie
   [`docs/uitrol.md`](docs/uitrol.md) voor het — nog niet uitgevoerde —
   plan om dit via git te laten lopen in plaats van handmatig.)

## Persoonsgegevens

Er staan namen en geboortedata van minderjarigen in de Supabase-
database (zie [`docs/avg-inventaris.md`](docs/avg-inventaris.md) voor de
volledige inventaris). Daarom:

- **Productiedata gaat nooit naar een testomgeving en nooit in een
  commit.** Test en ontwikkel met de synthetische testvulling in
  `tools/gouden-origineel/vulling.js`, of met een eigen, verzonnen
  team — niet met een export van een echte club.
- Een SQL-bestand dat tegen productie draait, wordt eerst gelezen en
  begrepen (niet alleen gekopieerd) — zie de bestaande
  `(open mij en kopieer alles).txt`-bestanden in `server/` voor de
  toon die dit project daarbij aanhoudt: uitleggen wat er gebeurt, niet
  alleen wat te typen.
- Overweeg bij twijfel of iets een persoonsgegeven raakt, Veerle erbij
  te halen (zie `CLAUDE.md` voor de rolverdeling) vóór je iets
  oplevert dat met echte spelersgegevens omgaat.
