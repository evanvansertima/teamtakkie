# TEAMTAKKIE — codestructuur (historisch, 10 september 2026)

> **Dit document is achterhaald.** Het beschrijft `online/index.html` van
> vóór de bouwstap: één bestand, geen modules, geen tests. Sinds P1-P5
> (16-18 september 2026) is de bron opgesplitst in `src/kern/`,
> `src/domein/` en `src/schermen/`, gebouwd met `node tools/bouw.js`, en
> voorzien van 298 tests plus een gouden origineel. **Lees
> [`docs/architectuur.md`](architectuur.md) voor de actuele situatie.**
> Dit bestand blijft staan als momentopname van de analyse die tot dat
> hele traject heeft geleid — de redenering erin (waarom babel-standalone
> traag is, waarom `magPagina()` een probleem was) is nog steeds juist,
> alleen de regelnummers en de bestandsindeling niet meer.

**Datum:** 10 september 2026 · versie V34
**Afgeleid uit:** `online/index.html` (33.781 regels), de repo op commit `14c2538`
**Alle regelnummers zijn gemeten, niet geschat.**

---

## 1. De repo: vier mappen doen iets, vier niet

| Map | Regels/omvang | Draait dit? |
|---|---|---|
| **`online/`** | `index.html` 33.781 regels, `sw.js` 200 | **Ja** — dit ís app.teamtakkie.nl |
| **`server/`** | 3 SQL-bestanden + 3 mappen met voorbereide migraties | **Ja** — dit is het Supabase-schema |
| **`docs/`** | ERD | documentatie |
| **`logo/`** | 4 PNG's | merkbestanden |
| `backend/` | AdonisJS + SQLite, 90+ TypeScript-bestanden | **Nee** |
| `frontend/` | Vite + React + TypeScript, 40+ bestanden | **Nee** |
| `caddy/`, `docker-compose.yml` | reverse proxy voor die opzet | **Nee** |
| `legacy/` | het oorspronkelijke prototype | referentie |

De onderste vier zijn een eerdere, verlaten poging: een klassieke API-backend met
een relationele database en een aparte frontend. Er staat serieus werk in — 30
Lucid-modellen, 45 migraties, 20 controllers — maar er draait niets van, en de
`README.md` in de root beschrijft nog steeds die architectuur. Wie de repo voor het
eerst opent, leest dus een beschrijving van software die niet in productie staat.

Je hebt besloten ze voorlopig te laten staan. Prima, maar zet dan één regel boven
aan de README dat `online/` de echte app is — anders kost dat elke nieuwe
ontwikkelaar een halve dag.

---

## 2. Eén bestand, geen bouwstap

`online/index.html` is de complete applicatie: HTML, CSS, JavaScript, React-code en
alle iconen in één bestand van 1,9 MB. Je sleept de map naar Netlify en het staat
online. Geen npm, geen bundler, geen pipeline.

```
regel     1 – 76      head: meta, CDN-scripts, thema vóór de eerste paint
regel    77 – 2884    <style> — 2.808 regels CSS
regel  2911 – 33781   <script type="text/babel"> — 30.870 regels
```

Vijf externe afhankelijkheden, alle van cdnjs:

| | |
|---|---|
| React 18.2.0 + ReactDOM (UMD) | de UI |
| **babel-standalone 7.23.2** | vertaalt de JSX **in de browser van de gebruiker** |
| jsPDF 2.5.1 | trainingsplannen en verslagen als PDF |
| three.js r128 | de 3D-weergave van het sportpark |
| Font Awesome 6.5.1 | iconen |

Die derde is de opvallende. Alle 30.870 regels JSX worden bij **elk koud bezoek**
opnieuw vertaald in de browser. Babel's eigen documentatie raadt dit voor productie
af. Op een telefoon langs de lijn met 4G is dat merkbaar — en het is de enige plek
in het hele systeem waar je met één ingreep (vooraf vertalen bij het uitrollen) een
grote winst kunt boeken zonder aan de code te komen.

---

## 3. De zeventien zones

Het bestand heeft geen modules, maar wel een duidelijke volgorde. Van boven naar
beneden: eerst het fundament, dan de domeinlogica, dan de schermen.

| Regels | Aantal | Wat |
|---:|---:|---|
| 1 – 76 | 76 | head, CDN-scripts, thema vóór de eerste paint |
| 77 – 2884 | 2.808 | CSS |
| 2948 – 3428 | 481 | **teams en seizoenen** — `sleutelVoor()`, de kern |
| 3429 – 3859 | 431 | **Supabase-laag** — `serverVraag()`, aanmelden, sessie |
| 3860 – 4339 | 480 | **synchroniseren** — `syncEen()`, `voegSamen()`, het vangnet |
| 4340 – 4470 | 131 | rollen en beheerderstatus |
| 4471 – 5469 | 999 | opslag, back-up, terugzetten |
| 5470 – 11013 | 5.544 | **domeinlogica** — alle berekeningen, statistieken, statussen |
| 11014 – 16766 | 5.753 | clubhuis, sportpark, tenueontwerper, spelregelquiz |
| 16767 – 22152 | 5.386 | **wedstrijdmodule** |
| 22153 – 24578 | 2.426 | spelers, ontwikkeling, blessures, boetes, dashboard |
| 24579 – 27635 | 3.057 | opstellingen, tenuebeeld, tekenbord |
| 27636 – 30602 | 2.967 | trainingen en agenda |
| 30603 – 32032 | 1.430 | statistieken, live-analyse, grafieken |
| 32033 – 33344 | 1.312 | instellingen, account, de achterkant, pakketten |
| 33345 – 33781 | 437 | onboarding en `App` |

**Verhouding:** ongeveer 6.000 regels fundament en domeinlogica, 21.000 regels
schermen, 2.800 regels CSS. De vijf grootste blokken zijn allemaal schermen.

---

## 4. Vier lagen, van onder naar boven

```
  localStorage                    tt_<team>__<seizoen>::<basissleutel>
        │
        │  laadJson() / slaJson()        ← altijd via sleutelVoor()
        ▼
  domeinlogica                    berekeningen, statussen, geen opslag
        │
        ▼
  114 React-componenten           schermen
        │
        ▼
  App (r33598)                    switch op 8 pagina's

        ╎  synchroniseer()  ⇄  Supabase        ← optioneel, niet de bron
```

Belangrijk om te begrijpen: **localStorage is de bron van waarheid, niet de
server.** De app werkt volledig zonder account. Synchroniseren is een laag die er
overheen ligt en die bepaalt wat er moet gebeuren als er op twee plekken tegelijk
iets is veranderd. Dat verklaart de merge-logica in `voegSamen()` en het vangnet
`tt_terug_v1` — allebei zouden ze niet bestaan bij een gewone client-server-app.

### De vier functies waar alles doorheen gaat

| Functie | Regel | Rol |
|---|---:|---|
| `sleutelVoor(basis)` | 3008 | plakt team en seizoen voor elke opslagsleutel |
| `laadJson(key)` / `slaJson(key,d)` | 4857 / 4932 | de enige lees- en schrijfroutes |
| `serverVraag(pad, opties)` | 3631 | elke aanroep naar Supabase |
| `syncEen(...)` | ~4560 | beslist per sleutel: duwen, halen, samenvoegen of niets |

Wie deze vier begrijpt, begrijpt het datamodel. De overige 589 hulpfuncties zijn
domeinlogica.

---

## 5. De 114 componenten, per module

| Module | Componenten | Grootste |
|---|---:|---|
| Wedstrijden | 27 | `Wedstrijdcentrum` r20823, `WedstrijdDetail` r21126 |
| Clubhuis / sportpark / tenue | 17 | `SportparkDrieD` r14108, `TenueOntwerperTab` r13063 |
| Opstellingen en tekenbord | 15 | `OpstellingVeld` r25101, `TactiekTekenBord` r25461 |
| Trainingen en agenda | 13 | `TrainingDetail` r29716, `AgendaModule` r30285 |
| Spelers en ontwikkeling | 12 | `SpelerProfiel` r22589, `OntwikkelingTab` r22817 |
| Statistieken en grafieken | 10 | `TeamStatistieken` r30603, `LiveAnalyse` r31157 |
| Instellingen en account | 9 | `InstellingenSheet` r32950, `BeheerSheet` r32536 |
| Onboarding | 6 | `App` r33598 |
| Overig | 5 | `SpelerStatusRaster` r28616 |

`SpelerStatusRaster` (r28616) is de moeite van het onthouden waard: dat is de
compacte presentielijst met snelknop en popup-per-uitzondering. Hij wordt nu alleen
door trainingen en activiteiten gebruikt. Bij het uniforme aanwezigheidssysteem
(fase I) is dit de component die je hergebruikt voor wedstrijden — niet iets nieuws
bouwen.

---

## 6. Navigatie: acht pagina's, één switch

```js
function App() {                                    // r33598
  const [pagina, setPagina] = useState("dashboard");
  ...
  function renderPagina() {
    switch (pagina) {
      case "dashboard":    return <Dashboard navigeer={setPagina} />;
      case "selectie":     return <SelectiePagina />;
      case "wedstrijden":  return <WedstrijdenModule />;
      case "trainingen":   return <TrainingenModule />;
      case "agenda":       return <AgendaModule navigeer={setPagina} />;
      case "statistieken": return <StatistiekenModule />;
      case "live":         return <StatistiekenModule defaultTab="live" />;
      case "clubhuis":     return <ClubhuisModule />;
    }
  }
```

Geen router, geen URL's. Navigeren is één `useState`.

**Twee dingen die hier opvallen en die er later toe doen.**

Ten eerste: `PAGINA_MODULE` (r3403) koppelt precies deze acht namen aan de modules
van een pakket, en `magPagina()` (r3425) beantwoordt of je erbij mag. **Die functie
wordt nergens aangeroepen.** Deze switch is de plek waar hij hoort — dat is de hele
fase D uit het implementatieplan, en het is één `if` op deze regel.

Ten tweede: `teamStand` (r33612) is een teller die bij het wisselen van team omhoog
gaat en waarmee React de hele boom opnieuw opbouwt. Slim en simpel: geen enkel
scherm hoeft te weten dat het team is gewisseld, ze halen gewoon opnieuw op. Het
betekent wel dat teamwisselen een volledige hermontage is — merkbaar op een oud
apparaat, en iets om te onthouden als de teamselector uit fase D drukker gebruikt
gaat worden.

---

## 7. Waar moet je zijn als je X wilt veranderen

| Ik wil… | Regel |
|---|---:|
| iets aan de opslagsleutels | `sleutelVoor` 3008 |
| iets aan seizoenen | 3017 – 3428 |
| iets aan de synchronisatie | `syncEen` ~4560, `syncTeamGegevens` ~4768 |
| pakketten en limieten | `PAKKETTEN` 3391, `pakketNu` 3408, `magPagina` 3425 |
| rollen en rechten in de UI | `ROLLEN` 4359, `magRol` 4391 |
| aanwezigheidsstatussen | `AANWEZIG_KEUZES` 28736, `OPGAVE_KEUZES` 28716 |
| opkomstberekening | `opkomstVan` 28768 — en 7345, 24286, 31024 die het anders doen |
| de presentielijst-UI | `SpelerStatusRaster` 28616 |
| wedstrijdpresentie toevoegen | `WedstrijdDetail` 21126, `presentieUitOpstelling` 28331 |
| de teamselector | `TeamSheet` 32037 |
| de achterkant (beheer) | `BeheerSheet` 32536 |
| account, inloggen, server instellen | `AccountSheet` 32694, `ServerScherm` 33378 |
| de eerste keer / onboarding | 33345 – 33597 |
| een nieuw seizoen beginnen | `SEIZOEN_MEE` 8981, `startSeizoen` 9000 |
| back-up en terugzetten | `maakBackup` 5070, `zetBackupTerug` 5249 |

---

## 8. Wat een nieuwe ontwikkelaar moet weten

**De naamgeving is Nederlands, consequent en doordacht.** `sleutelVoor`,
`magSchrijven`, `voegSamen`, `teltAlsAanwezig`. Dat leest prettig als je Nederlands
spreekt en is een drempel als je dat niet doet. De database gaat naar het Engels
(zie `server/rename-en/`); de app blijft Nederlands, en dat is een bewuste keuze —
854 keer `naam` omzetten levert niets op.

**Het commentaar is uitzonderlijk goed.** Niet "wat" maar "waarom", vaak met de
afweging erbij. Voorbeeld bij `SEIZOEN_MEE` (r8963): waarom de selectie wél meegaat
naar een nieuw seizoen en de wedstrijden niet. Dat soort commentaar is zeldzaam en
het maakt het bestand leesbaar ondanks zijn omvang. Behoud die gewoonte.

**Er is geen enkele test.** Geen typechecking, geen lint op dit bestand, geen
CI. Bij één ontwikkelaar die het hele bestand in zijn hoofd heeft, werkt dat. Bij
twee niet, en bij betalende klanten ook niet.

**Eén bestand betekent één merge-conflict.** Elke wijziging raakt `index.html`.
Zolang jij alleen werkt is dat geen probleem; zodra er iemand bij komt is opsplitsen
in modules (met een echte bouwstap) de eerste investering die zich terugbetaalt.

**De vijf grootste schermblokken zijn samen 22.000 regels.** Als je ooit gaat
opsplitsen, is dat de natuurlijke breuklijn: `online/index.html` als schil, en
wedstrijden, trainingen, clubhuis, opstellingen en statistieken als vijf modules.
Het fundament (regel 2948 – 5469, zo'n 2.500 regels) blijft dan als gedeelde kern.

---

## 9. In cijfers

| | |
|---:|---|
| 33.781 | regels in `index.html` |
| 30.870 | regels JavaScript en JSX |
| 2.808 | regels CSS |
| 114 | React-componenten |
| 593 | hulpfuncties |
| 224 | constanten in hoofdletters |
| 8 | pagina's |
| 5 | externe bibliotheken |
| 19 | plekken waar de app met de database praat |
| 0 | tests |
| 0 | bouwstappen |
