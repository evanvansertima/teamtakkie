# P4 — bijgewerkt stappenplan: negen stappen in plaats van vijf

**Datum:** 17 september 2026
**Status:** plan, niet uitgevoerd. Geen regel `src/app.jsx` is door dit document
veranderd; alle regelnummers hieronder zijn gemeten op de bron zoals hij nu is.
**Aanleiding:** een collega heeft P4 verkend (het opsplitsen van `src/app.jsx` in
schermmodules) en meldde drie dingen die het oorspronkelijke vijf-modules-plan uit
`professionaliseringsplan.md` niet voorzag. Evan heeft over alle drie beslist:

1. Er zijn ~30 componenten die in geen van de vijf geplande modules vallen. Die
   krijgen alsnog eigen modules: **spelers/ontwikkeling**, **instellingen/account**
   en **onboarding**.
2. Clubhuis en Opstellingen zijn verweven via gedeelde tekencomponenten
   (`TenueBeeld`, `SpelerBeeld`, en de tenue-tekendata). Daarom komt er eerst een
   **gedeelde laag**, vóórdat clubhuis en opstellingen zelf verplaatst worden.
3. Het gouden origineel dekte bijna geen tabblad-binnen-een-scherm. Daarvoor zijn
   op 17 september 2026 elf diepteopnames toegevoegd aan
   `tools/gouden-origineel.js` (zie de aantekening daar en de git-commit van
   vandaag) — dat vangnet ligt er nu, vóórdat dit plan wordt uitgevoerd.

Dit document vervangt de P4-paragraaf in `professionaliseringsplan.md` (die nog
"vijf schermmodules, ± 6 dagen" zegt) en de module-tabel in `codestructuur.md`
§5 (die dateert van vóór P1/P2/P3, met regelnummers uit een bestand dat sindsdien
van vorm is veranderd). Dit is de actuele versie.

---

## 0. Eerst nagerekend: blijven de vier kritieke plekken ongemoeid?

Met een verse `grep` op de huidige `src/app.jsx`:

```
56:   const PAKKETTEN = [
98:   const PAGINA_MODULE = {
112:  function pakketNu() {
129:  function magPagina(pagina) { return magModule(PAGINA_MODULE[pagina]); }
27159: const zijGroepen = [
27514:   function renderPagina() {
```

`PAKKETTEN` en `PAGINA_MODULE` staan vóór regel 203 — vóór zelfs de gedeelde laag
hieronder begint. `zijGroepen` staat ná `InstellingenSheet` (module instellingen/
account) en vóór `OnboardingSchil` (module onboarding), dus **buiten beide**
modules; `renderPagina` zit in `App()` (regel 27429+), de schil die na alle acht
stappen overblijft. Geen van de negen stappen hieronder raakt aan een van deze vier
plekken. (`magPagina()` wordt op dit moment nergens aangeroepen — dat is een apart,
al bekend probleem uit de technische beoordeling, en geen onderdeel van P4.)

---

## 1. De negen stappen: gedeeld + acht modules

Elke component hieronder is een top-level `function Naam(...)` in `src/app.jsx`,
geteld met dezelfde methode voor alle negen (dus vergelijkbaar): een verse
`grep -n "^function [A-Z]"` geeft precies **116** treffers, en de negen lijsten
hieronder tellen samen ook tot 116 op (inclusief `App`, dat als schil achterblijft).
Niets is dus dubbel geteld of vergeten.

Waarom deze regelnummers afwijken van `codestructuur.md` §5 (27/17/15/13/10/9/6):
dat document dateert van vóór P1 (bouwstap), P2 (kern eruit) en P3 (domeinlogica
eruit) — het bestand is sindsdien met duizenden regels van vorm veranderd. Dit is
de eerste keer dat de module-indeling wordt nagerekend op de huidige `src/app.jsx`.

### Stap 0 — Gedeeld · voorwaarde voor alle andere stappen

| Component | Regel |
|---|---:|
| `SlotJe` | 203 |
| `SlotKnop` | 211 |
| `ToastHouder` | 961 |
| `DeelVenster` | 2854 |
| `GetalVeld` | 4095 |
| `Logo` | 10528 |
| `NaamVeld` | 11522 |
| `SpelerPop` | 18557 |
| `TenueLaag` | 18634 |
| `TenueKader` | 18697 |
| `TenueBeeld` | 18755 |
| `SpelerBeeld` | 18884 |

Plus de tenue-tekendata: `TENUE_VEL`, `TENUE_SHIRT_PAD`, `TENUE_ROMP`,
`TENUE_MOUW_L`, `TENUE_MOUW_R`, `TENUE_BROEK_PAD`, `TENUE_SOK` (regel 1129–1135),
en — gevonden bij het narekenen, niet in Evans oorspronkelijke lijst —
**`TENUE_SOORTEN`** (1043), **`TENUE_KEY`** (998) en de functies **`laadTenue()`**
(1000) / **`slaTenueOp()`** (1006). Die vier worden door `TenueStrook`, `TenueBeeld`
zelf, `ClubhuisModule` én `OpstellingenTab` gebruikt om te weten welk tenue een
team heeft — zonder die vier kan geen van de latere modules een tenue tonen.

**Niet mee:** de rest van de `TENUE_*`-constanten rond regel 1028–1781
(`TENUE_GROEPEN`, `TENUE_VORMEN`, `TENUE_DELEN`, `TENUE_FONTS`, `TENUE_GREPEN`,
de zoom- en historiewaarden). Dat is eigen ontwerpgereedschap van de tenue-
ontwerper (module clubhuis) en wordt door niets anders gebruikt.

**Risico: laag, mits precies deze lijst.** Dit is een pure verplaatsing van
componenten die vandaag al overal worden aangeroepen — er verandert niets aan
gedrag, alleen aan waar de code staat. Het risico zit niet in wat hier gebeurt,
maar in wat er *níét* in deze lijst staat en dat wél had gemoeten: zie §2
hieronder voor zes gevallen die bij het narekenen zijn gevonden.

**Vangnet:** alle 31 opnames (23 club + 8 free) zijn hier de guard, want
`SpelerBeeld` en de slotjes/melding-componenten (`SlotJe`, `SlotKnop`, `ToastHouder`)
staan op vrijwel elk scherm. Verwachting: **volledig identiek**, DOM en
schermafdrukken. Eén rode opname waar dan ook is genoeg om deze stap terug te
draaien.

---

### Stap 1 — Onboarding · kleinste, meest geïsoleerde module

| Component | Regel |
|---|---:|
| `OnboardingSchil` | 27187 |
| `ServerScherm` | 27209 |
| `AanmeldScherm` | 27244 |
| `ClubScherm` | 27301 |
| `TeamScherm` | 27360 |

**Risico: laag qua code, maar ONGEDEKT door het gouden origineel.** Dit is de
kleinste module en heeft — voor zover nagerekend — geen componenten die een
andere module nodig heeft. Maar: `vulling.js` zet bewust een complete, ingelogde
sessie neer (`tt_sessie_v1`, `tt_club_v1`, `tt_teams_v1` staan al klaar) juist om
de opstartvertraging te vermijden — dat betekent dat **geen van de 31 opnames
ooit een van deze vijf componenten laat zien.** Deze stap heeft dus geen vangnet.
Aanbeveling: vóór deze stap een handmatige controle (leeg `localStorage`, de app
vanaf nul doorlopen) — geen golden-original-opname, want dat zou een tweede,
niet-ingelogde vulling vereisen en dat is een grotere ingreep dan dit plan
rechtvaardigt.

---

### Stap 2 — Instellingen/account · isolatie: hoog

| Component | Regel |
|---|---:|
| `TeamSheet` | 25717 |
| `NieuwSeizoenKaart` | 25923 |
| `PakkettenSheet` | 26004 |
| `TerugSheet` | 26083 |
| `SyncLampje` | 26187 |
| `NieuwsBalk` | 26216 |
| `BeheerSheet` | 26248 |
| `AccountSheet` | 26406 |
| `InstellingenSheet` | 26662 |

**Risico: laag.** Dit is het venster dat op 16 september al apart is
doorgemeten (zie de aantekening bij `instellingen`/`instellingen-opheffen` in
`tools/gouden-origineel.js`) — precies het venster waar eerder een tikfout in de
titel én een verdwenen "Vereniging opheffen"-rem allebei ongezien bleven. Geen
bekende cross-module afhankelijkheid gevonden.

**Vangnet:** `instellingen`, `instellingen-opheffen` (bestaand). Verwachting:
identiek.

---

### Stap 3 — Statistieken/grafieken · isolatie: hoog

| Component | Regel |
|---|---:|
| `TeamStatistieken` | 24271 |
| `IndividuStatistieken` | 24676 |
| `LiveAnalyse` | 24837 |
| `StandTab` | 25397 |
| `StatistiekenModule` | 25535 |
| `StaafGrafiek` | 25563 |
| `LijnGrafiek` | 25605 |
| `RadarGrafiek` | 25642 |
| `GrafiekLegenda` | 25695 |

**Risico: laag, met één bekende bijzonderheid.** Er ligt een nog niet uitgevoerd
ontwerp om de opkomstberekening in `IndividuStatistieken` (`trainPct`) samen te
voegen met `opkomstVan` uit `src/domein/opkomst.js` (zie de vier commits van
vandaag, "P4 stap 1 t/m 4", en de aantekening bij `statistieken-individu` in
`tools/gouden-origineel.js`). Dat is een géwenste gedragswijziging, geen
regressie — maar wie deze module verplaatst moet weten dat een rode
`statistieken-individu`-opname hier kan komen van die samenvoeging en niet per se
van de verplaatsing zelf. Onderscheid ze door de twee wijzigingen niet in dezelfde
commit te doen.

**Vangnet:** `statistieken`, `statistieken-individu` (bestaand). Verwachting:
identiek, met de kanttekening hierboven.
**Bekende resterende blinde vlek:** de tabbladen Team/Stand/Live binnen
Statistieken zijn niet in deze ronde toegevoegd (niet met naam genoemd door de
collega); wie die aanraakt, is voorlopig zonder vangnet, net als vóór 17 september.

---

### Stap 4 — Trainingen/agenda · isolatie: middel

| Component | Regel |
|---|---:|
| `OnderdeelFormulier` | 22073 |
| `SpelerStatusRaster` | 22391 |
| `OefeningFormulier` | 22524 |
| `OefeningDetail` | 22656 |
| `OefeningenBibliotheek` | 22716 |
| `BlokFormulier` | 22915 |
| `SeizoensPlanner` | 22986 |
| `TrainingFormulier` | 23171 |
| `TrainingDetail` | 23359 |
| `TrainingenModule` | 23613 |
| `ActiviteitFormulier` | 23760 |
| `AgendaModule` | 23928 |
| `AfwezigheidHint` | 17206 *(fysiek in de spelers-zone, alleen gebruikt door trainingen/agenda — zie §2)* |

**Risico: middel.** Twee gevallen van verwevenheid, allebei gevonden bij het
narekenen en niet eerder genoemd:

- `SpelerStatusRaster` (22391) wordt niet alleen door deze module gebruikt, maar
  ook ééns door `WedstrijdDetail` (regel 15384, module wedstrijden). Verplaats je
  deze module vóór wedstrijden, dan moet die ene aanroep in `WedstrijdDetail`
  blijven werken — technisch geen probleem (zie §3 over hoisting), maar wel een
  plek om na de verplaatsing expliciet te controleren.
- Deze module *importeert* op zijn beurt `TrainingTekenBord` uit wat straks module
  7 (opstellingen/tekenbord) wordt (vijf aanroepen, zie §2). Zolang beide modules
  nog in hetzelfde bestand staan is dat geen probleem; zodra ze gescheiden
  bestanden worden, moet gecontroleerd worden dat de bouwvolgorde in
  `tools/bouw.js` beide alsnog in één script samenvoegt (zie §5).

**Vangnet:** `trainingen`, `agenda`, `trainingen-oefeningen` (laatste nieuw op 17
september). **Bekende resterende blinde vlek:** het tabblad Seizoen
(`SeizoensPlanner`) binnen Trainingen is niet gedekt.

---

### Stap 5 — Spelers/ontwikkeling · isolatie: middel, grootste van de drie nieuwe

| Component | Regel |
|---|---:|
| `StatInvoer` | 15914 |
| `SpelerFormulier` | 15928 |
| `RapportTab` | 16137 |
| `SpelerProfiel` | 16350 |
| `DoelFormulier` | 16456 |
| `ReviewFormulier` | 16527 |
| `OntwikkelingTab` | 16597 |
| `SpelersLijst` | 16932 |
| `AfwezigheidFormulier` | 17260 |
| `BlessuresTab` | 17369 |
| `BoetepotTab` | 17527 |
| `EigenBoeteToevoegen` | 17889 |
| `BoeteFormulier` | 17910 |
| `SelectiePagina` | 17984 |
| `Dashboard` | 18032 |
| `VoetIcoon` | 18536 *(fysiek in de opstellingen-zone, alleen gebruikt door deze module — zie §2)* |

**Risico: middel-hoog, om twee redenen die niet in de oorspronkelijke melding
stonden:**

1. **`SelectiePagina` (17984) is zelf verweven, niet alleen zijn buren.** Het is
   de tabbladhouder van Selectie en rendert zowel de tabs van déze module
   (Spelers, Blessures, Boetepot) als de tabs van module 7 hierna (Opstellingen,
   Tactieken — regel 18016/18017 roepen `OpstellingenTab` en `TactiekenTab` aan).
   `SelectiePagina` kan dus niet zuiver in één van de twee modules wonen; hij
   moet óf in de schil blijven en beide modules aanroepen, óf in één module wonen
   met een aanroep terug naar de andere. Dit is dezelfde soort verwevenheid als
   Evan al kende bij clubhuis/opstellingen, nu tussen spelers/ontwikkeling en
   opstellingen/tekenbord — een vraag voor Fenna vóór de uitvoering, niet iets om
   in dit plan alvast in te vullen.
2. **`Dashboard` (18032) is een van de acht `SCHERMEN`**, bereikbaar via de
   navigatie zelf (`renderPagina()`, `case "dashboard"`), niet via een tabblad
   binnen deze module. Hij hoort hier fysiek bij (StatInvoer t/m Dashboard is
   inderdaad één aaneengesloten codeblok, regel 15914–18463, en toont onder meer
   topscorer/topassist met `SpelerBeeld`), maar het is de enige component in deze
   hele stap die ook los aanroepbaar moet blijven vanuit `renderPagina()` in de
   schil. Eén regel om na de verplaatsing te controleren, geen reden om hem apart
   te houden.

**Vangnet:** `selectie` (top-scherm, dekt de standaard Spelers-tab), `dashboard`,
`selectie-ontwikkeling` (bestaand), `selectie-blessures`, `selectie-boetepot`
(beide nieuw op 17 september). Verwachting: identiek. **Let op:**
`selectie-opstellingen` en `selectie-tactieken` (ook nieuw) bewaken weliswaar
hetzelfde scherm, maar horen bij stap 7 — een fout die alleen dáár zichtbaar wordt,
zegt iets over stap 7, niet over deze stap.

---

### Stap 6 — Clubhuis/sportpark/tenue · eerste van de twee verweven stappen

| Component | Regel |
|---|---:|
| `ParkVorm` | 6272 |
| `Spelerkaart` | 6306 |
| `HTKBewerken` | 6410 |
| `SpelerkaartTab` | 6482 |
| `QuizTekenveld` | 6587 |
| `SpelregelquizTab` | 6656 |
| `TenueVormKnop` | 6881 |
| `TenueOntwerperTab` | 6902 |
| `ClubhuisModule` | 7650 |
| `SportparkDrieD` | 7947 |
| `EigenVeldVenster` | 8595 |
| `ParkBewaarPopup` | 8656 |
| `SportparkTab` | 8681 |

**Risico: middel.** Dit is precies de module die volgens de collega verweven is
met opstellingen — maar met de gedeelde laag (stap 0) al eruit, is die
verwevenheid opgelost vóórdat deze stap begint: `TenueOntwerperTab` roept
`TenueBeeld` drie keer aan (regel 7321, 7448, 7476) en die functie staat na stap 0
niet meer fysiek in de opstellingen-zone maar in `gedeeld`. Geen nieuwe
afhankelijkheid gevonden op wedstrijden, trainingen of spelers.

**Vangnet:** `clubhuis` (top-scherm), `clubhuis-sportpark`, `clubhuis-tenue`,
`clubhuis-quiz` (alle drie nieuw op 17 september — de drie kaarten heten in de
app "De Bouwput", "De Kleedkamer" en "Betweterige Scheids"). Verwachting:
identiek.

---

### Stap 7 — Opstellingen/tekenbord · tweede van de twee verweven stappen

| Component | Regel |
|---|---:|
| `VeldAchtergrond` | 18464 |
| `TenueStrook` | 18853 |
| `SpelerCircle` | 18892 |
| `VeldZoomKnoppen` | 18967 |
| `OpstellingVeld` | 18986 |
| `OpstellingenTab` | 19015 |
| `TactiekTekenBord` | 19346 |
| `TactiekenTab` | 19358 |
| `VeldIcoon` | 19526 |
| `FrameMiniatuur` | 20924 |
| `TrainingTekenBord` | 20951 |

**Risico: hoog — dit is de module met de meeste uitgaande afhankelijkheden van
alle acht.** Drie gevallen, gevonden bij het narekenen:

1. `TenueStrook` (18853) wordt alleen gebruikt door `WedstrijdOpstelling` (regel
   12594, module wedstrijden) — niet door iets in deze module zelf.
2. `VeldZoomKnoppen` (18967) wordt zowel hier (`OpstellingenTab`, 19135) als door
   `WedstrijdOpstelling` (12595, module wedstrijden) gebruikt.
3. **`TrainingTekenBord` (20951) — de daadwerkelijke tekentool — wordt door drie
   andere modules gebruikt, niet twee.** Wedstrijden (`WedstrijdTactiek`, regel
   13932), déze module zelf (via `TactiekTekenBord`, regel 19350) en drievoudig
   door trainingen/agenda (`OnderdeelFormulier` 22166/22541, `OefeningDetail`
   22674, `TrainingDetail` 23479). Dat is een tweede geval van verwevenheid naast
   TenueBeeld — dit keer tussen opstellingen en trainingen, niet clubhuis. Het
   stond niet in de oorspronkelijke melding van de collega.

Dit betekent niet dat `TrainingTekenBord` per se naar de gedeelde laag moet: in dit
bouwsysteem (zie §3) maakt de bestandsindeling geen technisch verschil voor of een
functie een andere kan aanroepen. Het is wel een reden om deze module **niet als
eerste of geïsoleerd** te behandelen, en om na de verplaatsing expliciet te
controleren dat wedstrijden en trainingen nog steeds tekenen.

**Vangnet:** `selectie-opstellingen`, `selectie-tactieken`,
`selectie-tactieken-tekenbord` (alle drie nieuw) dekken deze module rechtstreeks.
`wedstrijd-tactiek`, `wedstrijd-tactiek-tekenbord` en `trainingen-oefeningen`
(ook nieuw) bewaken weliswaar andere modules, maar oefenen wél de export van déze
module uit (`TrainingTekenBord` via `WedstrijdTactiek` resp. de
oefeningenbibliotheek) — een fout die alléén in wedstrijden of trainingen rood
wordt na een wijziging in déze module, wijst naar precies dit soort gedeelde
component. Verwachting: alle genoemde opnames identiek.

---

### Stap 8 — Wedstrijden · grootste en laatste

| Component | Regel |
|---|---:|
| `SpelerKeuzeModal` | 10543 |
| `Kleedkamerbriefje` | 10641 |
| `DoelpuntScherm` | 10721 |
| `TegenDoelpuntModal` | 10824 |
| `WisselScherm` | 10885 |
| `UitslagFormulier` | 11134 |
| `ToernooiFormulier` | 11538 |
| `ToernooiDetail` | 11652 |
| `ToernooienTab` | 11844 |
| `WedstrijdFormulier` | 11958 |
| `ImportSheet` | 12188 |
| `WedstrijdOpstelling` | 12409 |
| `DSMVeldLijnen` | 13072 |
| `DSMLijn` | 13103 |
| `DSMBord` | 13137 |
| `DSMSectie` | 13280 |
| `RollenSectie` | 13570 |
| `WedstrijdTactiek` | 13816 |
| `WerkVenster` | 14094 |
| `BewaarMelder` | 14141 |
| `UitleenSectie` | 14169 |
| `GastenSectie` | 14230 |
| `TegenstanderSectie` | 14332 |
| `KaartScherm` | 14502 |
| `Wedstrijdcentrum` | 14584 |
| `WedstrijdDetail` | 14887 |
| `WedstrijdenModule` | 15653 |

**Risico: hoog, maar vooral qua omvang (27 componenten, verreweg de grootste
module) en niet qua nieuwe verwevenheid** — de afhankelijkheden die deze module
heeft (`TenueStrook`, `VeldZoomKnoppen`, `TrainingTekenBord` uit opstellingen;
`SpelerStatusRaster` uit trainingen) zijn hierboven bij die modules al genoemd en
zijn dan al bekend en getest. Laatste stap, precies omdat elke andere module die
`WedstrijdDetail` nodig heeft dan al af is.

**Vangnet:** `wedstrijden` (top-scherm), `wedstrijd-tactiek`,
`wedstrijd-tactiek-tekenbord` (beide nieuw). **Bekende resterende blinde vlek:**
de overige zes `WEDSTRIJD_SECTIES` binnen `WedstrijdDetail` (Voorbereiding,
Spelersrollen, Spelhervattingen, Tegenstander, Uitslag, Speelminuten) zijn niet
toegevoegd — alleen Tactiek, omdat dat de sectie was die de collega noemde en die
toevallig ook de tekentool bevat. Wie een van de andere zes secties verplaatst,
doet dat voorlopig zonder vangnet.

---

## 2. Verwevenheid die verder gaat dan gemeld — een overzicht

De collega meldde één geval van verwevenheid (TenueBeeld/tenue-data tussen
clubhuis en opstellingen). Bij het narekenen van alle 116 componenten zijn er zes
soortgelijke gevallen bijgekomen, geen daarvan groot genoeg om het plan te
wijzigen, maar allemaal het waard om te weten vóórdat Fenna erin snijdt:

| Component | Staat fysiek in | Wordt (ook) gebruikt door |
|---|---|---|
| `TenueBeeld`, `SpelerBeeld`, `SpelerPop`, `TenueLaag`, `TenueKader` | opstellingen-zone | vrijwel alle modules — **opgelost door stap 0** |
| `VoetIcoon` | opstellingen-zone | alleen spelers/ontwikkeling — in dit plan al verplaatst (stap 5) |
| `AfwezigheidHint` | spelers-zone | alleen trainingen/agenda — in dit plan al verplaatst (stap 4) |
| `TenueStrook`, `VeldZoomKnoppen` | opstellingen-zone | ook wedstrijden |
| `TrainingTekenBord`, `VeldIcoon`, `FrameMiniatuur` | opstellingen-zone | ook wedstrijden én trainingen |
| `SpelerStatusRaster` | trainingen-zone | ook wedstrijden (één plek, `WedstrijdDetail` r15384) |
| `SelectiePagina` | spelers-zone | rendert zelf ook de opstellingen/tekenbord-tabs |

De eerste twee rijen zijn al verwerkt in de module-indeling hierboven (§1). De
laatste vier zijn *niet* verplaatst naar de gedeelde laag — dat zou een grotere
ingreep zijn dan Evan heeft goedgekeurd — maar staan bij de betreffende stappen in
§1 als expliciet risico, met de regel erbij waar het om gaat.

---

## 3. Waarom volgorde hier een risicokeuze is, geen technische noodzaak

Belangrijk verschil met een gewone module-architectuur: `tools/bouw.js` gebruikt
geen `import`/`export`. Alle bestanden worden achter elkaar geplakt tot één
script met gedeelde scope (zie `KERN_VOLGORDE`/`DOMEIN_VOLGORDE` in
`tools/bouw.js`, en de uitleg daar). Een `function Naam(){}`-declaratie wordt door
de browser gehesen ("hoisting"): het maakt voor de *werking* niet uit of
`TrainingTekenBord` vóór of ná `WedstrijdTactiek` in het uiteindelijke bestand
staat, zolang ze samen in hetzelfde script terechtkomen — en dat gebeuren ze
sowieso, want er is maar één `<script>`.

Waarom de volgorde in §4 dan toch is zoals hij is: niet omdat het moet, maar
omdat het risicovoller is om een grote, sterk verweven module als eerste te doen.
Een kleine, geïsoleerde module (onboarding, vijf componenten, geen gevonden
afhankelijkheden) is in een uur te verplaatsen en te verifiëren; wedstrijden (27
componenten, vier bekende uitgaande afhankelijkheden) verdient die oefening pas
als het gouden origineel en het proces al zeven keer bewezen hebben te werken.

Eén echte uitzondering: `const`-declaraties (zoals de tenue-tekendata in stap 0)
worden **niet** gehesen met een bruikbare waarde — een module die zo'n constante
op het topniveau van zijn eigen bestand (buiten een functie) direct gebruikt, vóór
gedeeld geladen is, zou breken. Voor zover nagerekend gebeurt dat nergens: elk
gebruik van `TENUE_*` in de acht modules zit binnen een functie-body, die pas
draait als de component gerenderd wordt — ruim na het laden van alle scripts.

---

## 4. Uitvoeringsvolgorde

```
0. Gedeeld                       — voorwaarde voor alles hierna
1. Onboarding                    — kleinste, geen gevonden afhankelijkheden
2. Instellingen/account          — geïsoleerd, al apart doorgemeten
3. Statistieken/grafieken        — geïsoleerd
4. Trainingen/agenda             — één uitgaande, één inkomende afhankelijkheid
5. Spelers/ontwikkeling          — SelectiePagina-shell gedeeld met stap 7
6. Clubhuis/sportpark/tenue      — verweven met stap 7, ná stap 0 opgelost
7. Opstellingen/tekenbord        — idem, en zelf drie uitgaande afhankelijkheden
8. Wedstrijden                   — grootste, hangt af van 4, 6 en 7
```

Klein/geïsoleerd naar groot/verweven, met clubhuis (6) en opstellingen (7) als
opeenvolgende stappen zodra de gedeelde laag (0) er al uit is — precies de
volgorde die Evan heeft gevraagd. Wedstrijden staat laatste omdat het de meeste
andere modules als afhankelijkheid heeft; na stap 7 zijn dat er nul meer.

---

## 5. `tools/bouw.js`: is een `SCHERM_VOLGORDE` nodig?

Bevestiging van wat de collega al concludeerde: **ja.** Het patroon bestaat al
tweemaal (`KERN_VOLGORDE`, `DOMEIN_VOLGORDE`, beide in `tools/bouw.js`) en P4
volgt hetzelfde recept: een vaste array met bestandsnamen, in vaste volgorde
geconcateneerd vóór de rest van `src/app.jsx` (die na alle acht stappen alleen nog
de schil is: `App`, `renderPagina`, `zijGroepen`, `PAKKETTEN`, `PAGINA_MODULE`).

Voorgestelde volgorde in die array: `gedeeld.jsx` eerst (bevat de enige
`const`-declaraties waar §3 een echte, geen theoretische, uitzondering op
hoisting noemt), dan de acht schermmodules — volgorde onderling vrij, want
`function`-declaraties hoisten zoals hierboven uitgelegd, maar voor de
leesbaarheid van het uiteindelijke bestand ligt dezelfde volgorde als §4 voor de
hand — en pas dáárna het restant van `src/app.jsx`. Dit is dezelfde conclusie als
de collega eerder trok; hier bevestigd met de reden erbij (`const`-hoisting), niet
alleen met de constatering.

---

## 6. Wat dit plan niet doet

Geen app-code aangeraakt, geen modules aangemaakt — dat is voor Fenna, in een
volgende stap. Dit document legt vast: welke componenten waar naartoe gaan, in
welke volgorde, met welk risico, en welke bestaande of nieuwe gouden-origineel-
opname dat bewijst. De twee ongedekte plekken (onboarding, en de zes overige
`WEDSTRIJD_SECTIES`) zijn met opzet niet stilgehouden: ze staan in §1 bij de
stappen waar ze horen, zodat niemand denkt dat er méér vangnet ligt dan er is.
