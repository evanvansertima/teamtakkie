# TEAMTAKKIE — architectuur

**Datum:** 18 september 2026. Beschrijft de staat ná P1 t/m P5 van
[`docs/professionaliseringsplan.md`](professionaliseringsplan.md). Dit is
het document waar een tweede ontwikkelaar mee zou moeten kunnen beginnen;
`docs/codestructuur.md` is de historische analyse die tot dit traject
leidde.

---

## 1. Wat dit is

Een teammanagement-app voor amateurvoetbalclubs: spelers, wedstrijden,
trainingen, statistieken, een 3D-sportpark, een tenue-ontwerper. Eén
pagina, geen router — navigeren is state in `App()`. Werkt volledig
zonder account (alles lokaal in de browser); een account met Supabase
erbij geeft synchronisatie tussen apparaten en tussen mensen in dezelfde
club.

Gebouwd vanuit FC Harlingen JO19-2. De repo heet nog naar dat team
(`fc-harlingen`); de app heet TEAMTAKKIE.

## 2. De bouwstap

Tot 16 september 2026 was `online/index.html` zelf de bron: 34.000 regels
JSX, vertaald door `babel-standalone` in de browser van elke bezoeker. Dat
kostte op een telefoon merkbare tijd voor niets — de uitkomst van die
vertaling is voor iedereen identiek.

Sinds P1 is de bron `src/`, en `online/index.html` is een bouwproduct:

```
src/index.html          sjabloon: <head>, CDN-scripts, CSS, twee inline
                         scriptjes die vóór de app moeten draaien
src/app.jsx              de schil: App, renderPagina, het navigatiemenu,
                         PAKKETTEN/PAGINA_MODULE, en alles wat door
                         meerdere delen gedeeld wordt maar nergens anders
                         goed past
src/kern/*.js            sleutels.js, server.js, rollen.js, opslag.js,
                         sync.js — pure functies, geen JSX
src/domein/*.js          boetepot.js, wedstrijden.js, statistieken.js,
                         opkomst.js — pure berekeningen, geen JSX
src/schermen/*.jsx       negen React-schermmodules (zie §5)
```

`node tools/bouw.js` plakt dit tot één bestand en vertaalt het in één
keer, vooraf, met `esbuild.transform()`:

```
src/index.html (zonder de babel-standalone-regel)
  + src/kern/*.js       (KERN_VOLGORDE, vaste volgorde)
  + src/domein/*.js     (DOMEIN_VOLGORDE)
  + src/schermen/*.jsx  (SCHERM_VOLGORDE, gedeeld.jsx eerst)
  + src/app.jsx
  ────────────────────────────────────────
  = online/index.html
```

**Waarom `transform()` en niet `bundle()`:** er staat nergens een
`import`/`export`-regel in de bron — elk bestand is gewoon top-level
`function`/`const`, en alle bestanden delen na het plakken één script-
scope, precies zoals vóór de bouwstap. `bundle()` zou alles in een IIFE
wikkelen en elke regel laten inspringen; dan staat geen enkele functie
meer op kolom 0, en de tests in `tests/` (die functies als tekst uit de
bron knippen, zie §6) zouden ze niet meer terugvinden. Dit is een bewuste
keuze, gedocumenteerd in `tools/bouw.js` zelf.

**Waarom de volgorde ertoe doet (bijna nooit, met één uitzondering):**
`function`-declaraties hoisten binnen hun scope — het maakt voor de
werking niet uit of `sleutelVoor()` boven of onder de plek staat die hem
aanroept, zolang ze in hetzelfde script terechtkomen. Dat is waarom een
schermmodule probleemloos een functie uit `src/domein/` kan aanroepen
zonder import, en waarom kruisverwijzingen tussen schermmodules (bv.
`SelectiePagina` in `spelers.jsx` die `OpstellingenTab` uit
`opstellingen.jsx` rendert) gewoon werken. **De uitzondering is
top-level `const`/`var` die bij het LADEN van het script direct wordt
uitgerekend** (niet pas bij een render): die volgt wél de plakvolgorde.
Dit heeft één keer een echte fout veroorzaakt (P4 stap 8: een
verplaatste `const ACTIE_CATEGORIEEN` riep `inst()` aan vóórdat
`src/app.jsx` — dat pas als laatste wordt geplakt — `_instellingen` had
gezet) en staat sindsdien uitgelegd op de plek waar het misging.

**Wat de bouwstap bewust niet doet:** minificeren, namen inkorten, regels
samenvoegen. De uitvoer moet leesbaar blijven voor als er ooit iets
misgaat in productie. Bijvangst: `esbuild` kan commentaar niet behouden
in deze modus, dus **alle commentaar staat sindsdien alleen in `src/`**,
niet in `online/index.html`. Dat is de reden dat je nooit rechtstreeks in
`online/index.html` moet bewerken — je wijziging verdwijnt bij de
volgende build, en je mist de uitleg die er in de bron wél staat.

`python3 tools/check.py` controleert na elke build of `online/index.html`
nog actueel is ten opzichte van de bron (`node tools/bouw.js
--controleer`) — vergeet je te bouwen vóór het uitrollen, dan meldt dit
zich hard in plaats van dat er stilletjes een oude versie live gaat.

## 3. Het datamodel: localStorage is de bron van waarheid

Dit is het punt dat de synchronisatiecode verklaart, en zonder deze
uitleg onnodig ingewikkeld oogt.

**De app werkt volledig zonder server.** Alle spelersgegevens,
wedstrijden, trainingen — alles staat in `localStorage`, per team en
seizoen apart:

```
sleutelVoor(basis)   →  "tt_<team>__<seizoen>::<basis>"
laadJson(sleutel)    →  leest en parseert
slaJson(sleutel, d)  →  schrijft
```

Dit zijn de **enige** lees- en schrijfroutes (`src/kern/opslag.js`) — er
wordt nergens rechtstreeks met `localStorage.getItem` gewerkt buiten deze
twee functies.

Een account met Supabase erbij verandert dit fundament niet:
synchronisatie is een laag die er *overheen* ligt, geen vervanging.
`syncEen()` (`src/kern/sync.js`) beslist per sleutel: lokaal pushen,
server ophalen, samenvoegen (`voegSamen()`), of niets doen. Dat er een
apart vangnet bestaat (`tt_terug_v1`, "het vangnet" in `sync.js`) dat een
lokale back-up bewaart vóór een sync-actie, is precies om deze reden: als
de server iets teruggeeft dat niet klopt, moet je terug kunnen naar wat
er lokaal al stond, want dát was de waarheid.

**Consequentie voor wie hieraan bouwt:** een functie die data leest of
schrijft, doet dat via `laadJson`/`slaJson` (of via een specifieke
`laadXxx()`-wrapper daarboven), nooit rechtstreeks. Een nieuw
gegevenstype krijgt een eigen `_KEY`-constante en een eigen
`laadXxx()`/`slaXxx()`-paar, naar het bestaande patroon.

## 4. Supabase: alleen toegangscontrole, geen bron van waarheid

`server/*.sql` is het schema. Er is geen ORM en geen migratieraamwerk —
elk genummerd SQL-bestand is een stap, met een bijbehorend
`(open mij en kopieer alles).txt`-bestand dat Evan letterlijk in de
Supabase SQL Editor plakt. `server/LEES-MIJ-VOOR-JE-IETS-DRAAIT.md`
beschrijft wat er daadwerkelijk op productie staat (dat is niet exact
gelijk aan de opeenvolgende bestandsnummers — zie dat bestand voor de
precieze status).

**Row Level Security is de enige toegangscontrole.** Er is geen aparte
API-laag; de browser praat rechtstreeks met PostgREST via `serverVraag()`
(`src/kern/server.js`), en policies op elke tabel bepalen wie wat mag
zien of wijzigen. `security definer`-functies (`is_eigenaar()`,
`ben_eigenaar()`, `mijn_clubs()`) bestaan specifiek om recursieve
RLS-policies te vermijden (een policy die zichzelf zou moeten bevragen om
te bepalen of hij van toepassing is).

**Pakketgrenzen worden op twee plekken afgedwongen, en dat is bewust
dubbel:** `server/06-pakketten.sql` zet de harde grens (aantal teams,
aantal spelers) met een Postgres-trigger — dát is waar het niet omheen
kan, ongeacht wat de browser doet. `magPagina()`/`magModule()`
(`src/app.jsx`, pakket-blok) zorgen dat de UI dezelfde grens al toont
vóór iemand tegen de servergrens aanloopt. Het pakket zelf komt via
`syncPakket()` rechtstreeks van de tabel `abonnementen` — nooit uit een
lokale instelling die de gebruiker zelf zou kunnen aanpassen.

**Let op één PostgREST-eigenaardigheid:** een `DELETE` die door RLS wordt
geblokkeerd, geeft HTTP 2xx terug met nul geraakte rijen — geen foutcode.
Elke plek die iets verwijdert via `serverVraag()` moet `Prefer:
return=representation` meesturen en de lengte van de teruggegeven array
controleren om een geslaagde van een stilzwijgend geweigerde verwijdering
te onderscheiden (zie `hefClubOp()` in `src/app.jsx` als voorbeeld).

## 5. De negen schermmodules

| Bestand | Wat |
|---|---|
| `gedeeld.jsx` | generieke bouwstenen die vrijwel elk scherm gebruikt: `SlotJe`/`SlotKnop` (pakketslot), `ToastHouder`, `DeelVenster`, `GetalVeld`, `Logo`, `NaamVeld`, `SpelerBeeld`/`TenueBeeld` en de tenue-tekendata |
| `onboarding.jsx` | server instellen, aanmelden, club/team aanmaken — de allereerste keer |
| `instellingen.jsx` | teams, seizoen, pakketten, back-up, account, beheer, vereniging opheffen |
| `statistieken.jsx` | teamstatistieken, individuele statistieken, live-analyse, grafieken |
| `trainingen.jsx` | trainingen, oefeningenbibliotheek, agenda |
| `spelers.jsx` | spelerprofiel, ontwikkeling, blessures, boetepot, de Selectie-pagina, Dashboard |
| `clubhuis.jsx` | het 3D-sportpark, de tenue-ontwerper, de spelregelquiz |
| `opstellingen.jsx` | het opstellingenveld, het tactiekbord/tekenbord |
| `wedstrijden.jsx` | de wedstrijdmodule zelf — verreweg de grootste (27 componenten) |

Een aantal componenten staat fysiek in één module maar wordt ook door een
andere gebruikt (bv. `TrainingTekenBord`, gedefinieerd in
`opstellingen.jsx`, gebruikt door zowel wedstrijden als trainingen). Dat
is geen fout — zie §2 over hoisting. Waar zulke kruisverwijzingen bestaan,
staat dat als commentaar bij de betreffende functie.

## 6. Verificatie — vier lagen, elk met een ander doel

Geen van deze vier vervangt een andere; ze vangen elk iets anders.

1. **`python3 tools/check.py`** — syntax op de bron: haakjes/accolades in
   balans, JSX-nesting klopt, geen dubbele `const`/`let`/`function` in
   hetzelfde blok, en (zie §2) of `online/index.html` nog actueel is.
   Draait over elk `.js`/`.jsx`-bestand direct onder `src/`.

2. **`node tools/typen-check.js`** — typecontrole via `tsc`
   (`--allowJs --noEmit`, geen compilatie, puur analyse). Controleert
   alleen bestanden met `// @ts-check` als eerste regel — dat zijn op dit
   moment alle bestanden in `src/kern/` en `src/domein/` (P5). Alle negen
   bestanden worden in ÉÉN `tsc`-aanroep meegegeven zodat kruisverwijzingen
   tussen kern-bestanden elkaar herkennen; los controleren geeft valse
   "Cannot find name"-ruis. Resterende meldingen zijn op dit moment
   uitsluitend verwijzingen naar `src/app.jsx`/`src/schermen/` (nog niet
   getypeerd) plus twee bewust gedocumenteerde, niet-opgeloste
   datamodel-bijzonderheden (zoek `@type` en de bijbehorende commentaren
   in `src/kern/sleutels.js` en `src/kern/opslag.js`).

3. **`node tests/<naam>.test.js`** (298 tests, 7 bestanden, kaal `node`,
   geen framework) — knipt functies als tekst rechtstreeks uit de bron
   (`src/kern/*.js`, `src/domein/*.js`, of `online/index.html` voor
   `opheffen.test.js`) en `eval()`t ze tegen een nagemaakte omgeving. Dat
   betekent: een test faalt zodra iemand de geknipte functie hernoemt of
   het gedrag verandert — hij test de écht uitgerolde code, geen kopie.
   Zie `tests/sync.test.js` voor het duidelijkste voorbeeld van de
   knip-techniek.

4. **`node tools/gouden-origineel.js --vergelijk`** (~10-15 minuten,
   Playwright + een echte Chrome) — 31 vaste opnames (23 in pakket
   "club", 8 in "free") tegen een vaste testvulling
   (`tools/gouden-origineel/vulling.js`). Legt DOM en een schermafdruk
   vast en vergelijkt op de letter en (met een kleine kleurtolerantie)
   het beeldpunt. Dit is het enige vangnet voor React-componenten (JSX
   heeft geen knip-en-eval-equivalent) — voor elke schermmodule is dit
   dus de belangrijkste, soms de enige, controle. **Bekende blinde
   vlekken** (met opzet niet stilgehouden): het onboarding-scherm (de
   testvulling logt je al in, dus dat scherm komt nooit in beeld) en een
   aantal tabbladen-binnen-een-scherm die nog geen eigen opname hebben —
   zoek `Bekende resterende blinde vlek` in `docs/p4-stappenplan.md` voor
   de volledige lijst.

**De discipline hierachter (CLAUDE.md-regel 5):** een wijziging aan een
van deze vier controles wordt altijd bewezen met een opzettelijke fout —
iets kapotmaken, bevestigen dat de controle rood wordt, herstellen,
bevestigen dat hij weer groen is. Een controle die nooit rood is geweest,
is geen bewezen controle.

## 7. Uitrollen

Nog steeds handmatig: `node tools/bouw.js`, dan de map `online/` naar
Netlify slepen. Zie [`CONTRIBUTING.md`](../CONTRIBUTING.md) voor de
volledige volgorde en [`docs/uitrol.md`](uitrol.md) voor het (nog niet
uitgevoerde) plan om dit via git te laten lopen.

`online/sw.js` is een service worker die de app en zijn CDN-bibliotheken
bewaart voor offline gebruik. Elke uitrol die gebruikers echt moeten
zien, hoort een hogere `VERSIE`-string in `sw.js` te krijgen — anders
kan een browser de oude, gecachte versie blijven tonen.

## 8. Wat hier nog niet is opgelost

- `src/app.jsx` en `src/schermen/*.jsx` hebben nog geen `// @ts-check`
  (P5 dekte alleen `src/kern/` en `src/domein/`, zoals het plan vroeg).
- Het datamodel zet objecten als JSON-blob in kolommen op Supabase —
  niets is op databaseniveau afdwingbaar buiten wat RLS/triggers apart
  regelen.
- Er is nog geen foutrapportage in productie en geen git-gekoppelde
  uitrol. Beide staan als open punten in P6 van
  `docs/professionaliseringsplan.md`.
