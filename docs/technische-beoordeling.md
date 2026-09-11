# TEAMTAKKIE — technische beoordeling

**Opdracht:** professionele beoordeling van de bestaande codebase
**Peildatum:** 10 september 2026, versie V34, commit `5044b75`
**Basis:** `online/index.html` (33.781 regels), het Supabase-schema, de
productiedatabase en de productieback-up van vandaag. Alles hieronder is gemeten,
niet ingeschat.

---

## Het oordeel in één alinea

Dit is een **sterk product met een zwak fundament**. De functionaliteit is breder en
beter doordacht dan bij de meeste startende SaaS-producten die wij zien, en het
domeinbegrip is uitzonderlijk — dit is duidelijk gebouwd door iemand die zelf langs de
lijn staat. Maar het is nog geen commercieel softwareproduct. Twee dingen staan
daaraan in de weg, en ze zijn allebei fundamenteel: **je verkoopt abonnementen voor
functionaliteit die de software niet afschermt, en je kunt van geen enkele versie
aantonen dat hij werkt.** Alles daaronder — één bestand van 33.000 regels, geen
bouwstap, geen typen — is vervelend maar oplosbaar. Die twee zijn dat op dit moment
niet.

Als deze codebase bij ons langs due diligence zou komen voor een overname of een
investering, zou het advies zijn: **niet afwijzen, wel eerst zes weken herstellen.**

---

## Scorekaart

| Onderdeel | Score | Kort |
|---|:--:|---|
| Domeinbegrip | ●●●●● | uitzonderlijk; het beste aan dit project |
| Functionaliteit | ●●●●○ | breed, af, en werkt |
| Beveiliging (opzet) | ●●●●○ | RLS is goed doordacht |
| Beveiliging (uitvoering) | ●●○○○ | één gat open, één policy stuk |
| Documentatie in de code | ●●●●○ | zeldzaam goed commentaar |
| Datamodel | ●●○○○ | alles in JSON; niets afdwingbaar |
| Architectuur | ●●○○○ | één bestand, geen bouwstap |
| Onderhoudbaarheid | ●●○○○ | draagbaar door het commentaar, niet door de structuur |
| Operatie en uitrol | ●●○○○ | handmatig, geen foutrapportage |
| **Betrouwbaarheid** | **●○○○○** | **geen reproduceerbare verificatie** |
| **Commerciële gereedheid** | **●○○○○** | **het abonnement schermt niets af** |
| Privacy en AVG | ●●○○○ | goede regiokeuze, verder niets geregeld |

---

## Wat we als sterk beoordelen

Dit is geen beleefdheid vooraf. Deze punten zijn zeldzaam en ze zijn geld waard.

### Het domeinbegrip is het beste aan dit project

De aanwezigheidsstatussen zijn het duidelijkste voorbeeld. Er is een aparte status
`uitgeleend`, met in het commentaar:

> *"Tommy speelt zaterdag met de JO19-1. Hij is er dus niet bij ons — maar hij is wél
> aan het voetballen voor de club, en dat is precies het omgekeerde van wat 'afwezig'
> betekent. Wie dit als afwezig wegschrijft, straft een speler voor iets waar hij om
> gevraagd is."*

En bij langdurige blessures vallen spelers uit teller én noemer, zodat een
revalidant het opkomstcijfer van de hele avond niet drukt. Dat soort onderscheid
bedenkt geen ontwikkelaar achter een bureau. Dit is de moeilijkste laag om in te
halen en die heb je al.

### Het beveiligingsontwerp klopt conceptueel

De opzet met `mijn_clubs()` en `mag_schrijven()` als `security definer` functies,
zodat elke policy dezelfde vraag stelt en er nooit twee antwoorden kunnen ontstaan,
is precies zoals het hoort. `abonnementen` heeft bewust géén schrijfregel, zodat
niemand zijn eigen pakket kan ophogen — ook niet met een handgemaakte API-aanroep.
Dat is een bewuste, juiste keuze die veel teams pas na een incident maken.

En het werkt: de tenantisolatie tussen clubs is echt. Wij hebben het getest.

### Het commentaar is beter dan bij de meeste betaalde teams

Niet "wat" maar "waarom", met de afweging erbij. Bij het datamodel staat waarom er
één blob-tabel is in plaats van een tabel per entiteit. Bij een nieuw seizoen staat
waarom de selectie wél meegaat en de wedstrijden niet. Dat commentaar overleeft elke
refactor en is de reden dat dit bestand ondanks 33.000 regels leesbaar is.

**Behoud die gewoonte.** Het is op dit moment je enige overdrachtsdocumentatie, en
het is verrassend goede.

---

## Wat een go-live blokkeert

### 1. Het abonnement schermt niets af — dit is het duurste probleem

`magPagina()` bepaalt of een gebruiker bij een module mag. Die functie komt in het
hele bestand van 33.781 regels **precies één keer voor: op de regel waar hij
gedefinieerd wordt.** Hij wordt nergens aangeroepen. Trainingen, agenda,
statistieken, live-analyse en clubhuis staan voor iedereen open, ongeacht pakket.

Daarbovenop begint `pakketNu()` met `var id = "max"`. Zonder licentiegegevens in de
browser is elke gebruiker Max.

Commercieel betekent dit: **Free-gebruikers krijgen vandaag alles.** Je marketingsite
verkoopt Trainer voor € 9,99 met drie teams, en Team voor € 9,99 met drie
beheerders — beide functies bestaan technisch niet, en het enige wat wél begrensd
is (het aantal teams) wordt in de browser gecontroleerd en is met de
ontwikkelaarsconsole in tien seconden te omzeilen.

Je kunt hier vandaag geen geld voor vragen. Niet omdat het onethisch zou zijn, maar
omdat je eerste klant die het doorheeft gelijk heeft.

### 2. Je kunt van geen enkele versie aantonen dat hij werkt

De release notes van V34 melden *"118 controles op de veldvormen, 13 opzettelijke
fouten teruggezet, alle 13 gevangen. Alle 28 testbestanden groen."* Die 28
testbestanden staan niet in de repo, niet in de projectmap, nergens. Het
controlescript dat er wél is (`legacy/controle/check.py`) wijst naar
`fc-harlingen-app.html` — het oude prototype van 922 KB, niet naar de app die je
uitrolt. Draai je hem vandaag, dan controleert hij het verkeerde bestand en meldt hij
dat alles in orde is.

Voor een buitenstaander leest dat als documentatie die verificatie claimt die niemand
kan herhalen. Dat is het soort bevinding dat bij due diligence een streep zet, niet
omdat er gelogen is maar omdat het niet controleerbaar is.

**Het gevolg was vandaag zichtbaar.** Wij vonden een fout waardoor dezelfde
trainingen in twee seizoenen tegelijk stonden — vijf van de zes met exact dezelfde
id's — die zichzelf bij elke synchronisatie herhaalde en elk nieuw seizoen opnieuw
zou vullen. Die stond weken in productie zonder dat iets alarm sloeg.

### 3. Twee beveiligingsbevindingen, waarvan één open

`clubs_maken` heeft `with check (true)`. Een anonieme bezoeker met de publieke sleutel
uit `index.html` kan onbeperkt rijen in `public.clubs` schrijven. Wij hebben dat op
een kopie van je schema uitgevoerd en het lukte. Geen datalek — de leesregels houden
stand — maar wel een gevulde database en een gevulde rekening.

Ernstiger als patroon: `leden_toevoegen` en `leden_weghalen` bevatten allebei een
subquery op hun eigen tabel, waardoor Postgres met
`infinite recursion detected in policy for relation "leden"` weigert. **Elke insert en
delete op `leden` is dus kapot** — de aanval én het normale gebruik. Niemand heeft dat
gemerkt omdat de app nooit in die tabel schrijft. Het uitnodigingssysteem dat je in
fase H wilt bouwen zou hier onherroepelijk op stuklopen.

Dat is de aard van de bevinding: niet dat er een gat is, maar dat er maanden een
kapotte policy in productie stond die niemand kon zien.

### 4. Het datamodel maakt handhaving onmogelijk

Zeven tabellen, en alle domeingegevens — spelers, wedstrijden, trainingen,
aanwezigheid — zitten als JSON-blob in één kolom. De database weet niet wat een
speler is. Dat heeft twee harde gevolgen:

- **Wat je in een blob stopt, kun je niet afdwingen.** Een limiet op het aantal
  spelers, op opslag, op exports of op statistieken kan alleen in de browser worden
  gecontroleerd, en dat is geen controle. Verkoop geen limiet die je niet kunt
  handhaven.
- **Er is geen referentiële integriteit op je domein.** Gooi een speler weg en zijn
  doelpunten, wissels en aanwezigheidsregels blijven staan. Geen enkele
  `foreign key` bewaakt dat.

Verdedigbaar voor een app die uit een localStorage-prototype komt. Niet houdbaar voor
een product met betalende klanten en meerdere beheerders.

### 5. In-browser vertaling van 30.870 regels

`babel-standalone` vertaalt alle JSX in de browser van élke bezoeker, bij elk koud
bezoek. Babel raadt dat voor productie zelf af. Op een telefoon langs de lijn met 4G
is het merkbaar, en het is de enige plek waar één ingreep — vooraf vertalen bij het
uitrollen — grote winst oplevert zonder één regel code te veranderen.

### 6. Operatie: er is geen

Handmatig een map naar Netlify slepen. Geen foutrapportage: je hoort het niet als een
gebruiker een witte pagina ziet. Geen bewaking. Supabase op het gratis plan, dat een
project na een week inactiviteit pauzeert. Back-ups zijn handwerk en de laatste staat
als losse CSV's in je projectmap.

Bij vier clubs merk je alles zelf. Bij vijftig niet.

---

## Wat dit commercieel betekent

| Risico | Kans | Gevolg |
|---|---|---|
| Klant ontdekt dat Free alles kan | hoog | omzet die er nooit komt; terugbetaling |
| Klant koopt Trainer voor 3 teams, krijgt er 1 | hoog | terugbetaling en reputatie |
| Datacorruptie zoals de seizoenbug bij een klant | middel | verlies van een heel seizoen; onherstelbaar vertrouwen |
| Klacht over gegevens van minderjarigen | laag | AVG; je hebt geen verwerkersovereenkomst en geen bewaartermijn |
| `clubs` volgeschreven door een geintje | laag | rekening en handmatig opruimen |

De eerste twee zijn geen risico maar zekerheid zodra je de eerste betalende klant
hebt. Dat is de reden dat wij de entitlement-laag vóór alles zouden zetten.

---

## Wat wij zouden doen, in deze volgorde

Zes weken, uitgaande van één ontwikkelaar met ondersteuning.

**Week 1 — Vangnet.** Tests in de repo, het controlescript op het juiste bestand,
een gouden origineel met schermafdrukken van alle acht pagina's, en CI die rood
wordt. Zonder dit is elke stap daarna gokken. Dit is niet het leukste werk en het is
het werk dat het meeste oplevert.

**Week 1 — Fase A en de seizoenfix uitrollen.** Beide liggen klaar en getest. De
seizoenbug staat nu in productie.

**Week 2 — De bouwstap.** Babel eruit, uitrol blijft hetzelfde, gedrag identiek en
bewijsbaar via het gouden origineel. Meteen meetbare winst voor de gebruiker.

**Week 3 en 4 — De entitlement-laag.** Centrale plancatalogus, `magPagina()`
daadwerkelijk aanroepen, en wat server-side afdwingbaar is ook server-side
afdwingen: aantal teams via een trigger, modules via een policy op `gegevens.sleutel`
— want de sleutel ís een kolom, ook al is de inhoud dat niet. En de marketingsite
gelijktrekken met wat er werkelijk is.

**Week 5 — Multi-beheerder.** `team_leden`, rollen, uitnodigingen. Dit is wat je
site al verkoopt.

**Week 6 — Operatie.** Foutrapportage, een uitrolprocedure die geen slepen is,
automatische back-ups, en een betaald Supabase-plan.

**Daarna pas** het opsplitsen in modules. Dat is onderhoud, geen bedrijfsrisico, en
het kan tussen de functionele fasen door.

---

## Wat wij níét zouden doen

**Niet herschrijven.** De verleiding om 33.000 regels opnieuw te beginnen in Next.js
is voorspelbaar en het is de bekendste manier om een werkend product te verliezen.
Het domeinbegrip in dit bestand is niet in een sprint na te bouwen.

**Het datamodel niet nu normaliseren.** Het is de juiste einddoelstelling, maar het
raakt elke rij en elke regel berekening. Doe eerst de entitlements, de tests en de
operatie. Normaliseer als je weet welke tabellen je echt nodig hebt — waarschijnlijk
pas als aanwezigheid en statistieken herbouwd worden.

**Niet alles tegelijk.** Er liggen nu vier trajecten klaar: seizoenfix, fase A, de
Engelse hernoeming en het professionaliseringsplan. Twee daarvan raken dezelfde
functie. Volgorde is hier belangrijker dan snelheid.

---

## Waar wij eerlijk over zijn

**Dit is voor één persoon een indrukwekkende prestatie.** 33.000 regels, een
werkende synchronisatie met conflictafhandeling, een tekenbord, een 3D-sportpark en
een live-analysemodule. De meeste eenmansprojecten die wij zien komen niet half zo
ver.

**En precies dat is het risico.** Alles hangt aan één persoon: de kennis, de
verificatie, de accounts, de uitrol. Er is geen test die iemand anders kan draaien,
geen document dat de architectuur uitlegt zonder jou erbij, en geen tweede paar ogen
dat de recursiefout in `leden_toevoegen` had kunnen vangen.

De vraag is niet of de code goed genoeg is. De vraag is of het bedrijf verder kan als
jij twee weken ziek bent. Vandaag is het antwoord nee, en dat is met zes weken werk
te veranderen.

---

## Samengevat

| | |
|---|---|
| **Als prototype** | ruim boven gemiddeld |
| **Als product voor gebruikers** | werkt, met één datacorruptiefout die nu opgelost moet |
| **Als commercieel product** | nog niet — het abonnement schermt niets af |
| **Als overdraagbare codebase** | nog niet — geen reproduceerbare verificatie |
| **Als investering waard om door te zetten** | ja, zonder aarzeling |

Het fundament onder dit product is het domeinbegrip, en dat is het deel dat je niet
kunt kopen. De rest is techniek, en techniek is planbaar.
