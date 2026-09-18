# AVG-inventaris TEAMTAKKIE

**Opgesteld:** 11 september 2026
**Voor:** Evan van Sertima — sinds 11 september 2026 ingeschreven bij de KvK
**Status:** inventarisatie, geen juridisch advies
**Meeneemdocument voor:** een gesprek met een jurist of met de sportbond

---

## Hoe je dit document gebruikt

Dit is een lijst van wat er feitelijk is, niet van wat er zou moeten zijn. Alles
wat hier staat is nagekeken in de code of in de back-upbestanden; bij elk punt
staat waar je het zelf kunt terugvinden. Waar ik iets niet heb kunnen
vaststellen, staat dat er als **openstaande vraag** bij. Dat is geen slordigheid
maar bedoeld: een jurist heeft meer aan "dit weet ik niet" dan aan een gok die
als feit is opgeschreven.

De volgorde is die van wat er werkelijk kan gebeuren. Niet van wat het engst
klinkt.

### Woordenlijst

Deze woorden komen hieronder steeds terug.

| Woord | Wat het betekent |
|---|---|
| **Persoonsgegeven** | Elk gegeven waarmee je een levend mens kunt herkennen. Een naam, maar ook een rugnummer plus geboortedatum, of een foto. |
| **Bijzonder persoonsgegeven** | Een zwaardere categorie, waar de wet extra streng over is. Gezondheid hoort daarbij. Blessures dus ook. |
| **Verwerkingsverantwoordelijke** | Degene die bepaalt *waarom* en *hoe* gegevens worden gebruikt. Die is aanspreekbaar als het misgaat. |
| **Verwerker** | Een partij die gegevens verwerkt in opdracht van de verantwoordelijke, en die niets voor zichzelf met die gegevens mag doen. Supabase is dat bijvoorbeeld voor jou. |
| **Verwerkersovereenkomst (DPA)** | Het contract tussen verantwoordelijke en verwerker. "DPA" is de Engelse afkorting die je in dashboards tegenkomt. |
| **Subverwerker** | Een partij die je verwerker zélf inschakelt. Supabase draait op Amazon-servers; Amazon is dan subverwerker. |
| **Betrokkene** | De mens over wie de gegevens gaan. Hier: de speler, de trainer, de chauffeur. |
| **RLS (Row Level Security)** | De regels in de database die bepalen wie welke rij mag zien. Dit is in TEAMTAKKIE het enige echte slot op de gegevens. |
| **localStorage** | Een opslagplekje in de browser, op het apparaat zelf. Blijft staan als je de app sluit. Wordt niet automatisch opgeruimd. |
| **JSON-blob** | Eén tekstveld waar een hele lijst met gegevens in gepropt zit. De database ziet er één brok tekst; alleen de app weet wat erin staat. |

---

## 0. Waar dit document op gebaseerd is

| Bron | Wat ik ermee heb gedaan |
|---|---|
| `/Users/eserti/Documents/App/online/index.html` (33.919 regels) | De app zelf. Hieruit komt welke velden er bestaan en wat er bij verwijderen gebeurt. |
| `/Users/eserti/Documents/App/server/01-schema.sql` | Het databaseschema en de RLS-regels. |
| `/Users/eserti/Documents/App/server/03-beheer.sql` | De beheerfuncties, waaronder `verwijder_account`. |
| `/Users/eserti/Documents/App/Back-ups/gegevens_rows.csv` (4,2 MB, 10-09-2026) | Hieruit komen de **gemeten** aantallen: hoeveel spelers, hoeveel minderjarigen, welke velden echt gevuld zijn. |
| supabase.com/legal/dpa en supabase.com/docs/guides/security/gdpr-compliance | Voor de vraag over de verwerkersovereenkomst. Zie punt 3.1. |

Wat ik **niet** heb kunnen nakijken, omdat ik geen toegang heb tot de accounts:
het Supabase-dashboard, het Netlify-dashboard, en de daadwerkelijke instellingen
van het live project. Alles daarover staat als openstaande vraag.

---

## 1. Welke persoonsgegevens staan waar

Er zijn zeven plekken. Ze staan hier op volgorde van hoeveel er staat en hoe
gevoelig het is.

---

### 1.1 `public.gegevens` bij Supabase — dit is de zwaarste plek

Dit is één tabel met vier kolommen: `team_id`, `sleutel`, `waarde`,
`bijgewerkt_op`. Alle teamgegevens zitten in de kolom `waarde` als één brok
tekst (JSON-blob). De database weet dus niet dát er geboortedata in zitten —
alleen de app weet dat.

**De spelerslijst** staat onder de sleutel `fch_spelers_v1`. Wat er per speler
in kan staan, is te lezen in `online/index.html` regel 9327:

```js
const LEEG_SPELER = { id:null,naam:"",rugnummer:"",positie:"",geboortedatum:"",
  positie2:"",favorietBeen:"",skills:{},sterren:{},rapporten:[],adres:"",
  land:"Nederland",telefoon:"",email:"",foto:null, beschikbaar:"fit",
  beschikbaarNotitie:"", vaardigheden:{}, stats:{...} };
```

In gewone taal, per speler: **naam, rugnummer, positie, geboortedatum,
huisadres, land, telefoonnummer, e-mailadres, pasfoto, beschikbaarheid
(waaronder blessure) met een vrij tekstveld, beoordelingen, rapporten en
statistieken.**

**Wat er op 10 september 2026 werkelijk in stond** — gemeten in de back-up, niet
geschat:

| Gegeven | Ingevuld |
|---|---|
| Aantal spelers in de selectie | 18 |
| Geboortedatum | 18 van 18 |
| Telefoonnummer | 18 van 18 |
| Beschikbaarheid (fit / blessure / ziek / geschorst / vakantie) | 18 van 18 |
| Vrije toelichting bij niet-fit (bijv. "enkelblessure") | 1 van 18 |
| Adres | 0 van 18 |
| E-mailadres | 0 van 18 |
| Foto | 0 van 18 |

**Van wie:** één team, JO19-2. Uit de geboortedata blijkt dat de spelers 15 tot
18 jaar oud zijn. **Vijftien van de achttien waren op 11 september 2026
minderjarig.** Dat is geen risicoinschatting maar een telling.

De velden adres, e-mail en foto zijn dus vandaag leeg — maar ze bestaan wel in
het formulier en worden aan elke gebruiker aangeboden
(`online/index.html` regel 22341–22382, kopjes "Persoonlijke gegevens" en
"Contactgegevens"). Bij de tweede club staan ze er waarschijnlijk wel in. Voor
de inventaris tellen ze dus mee.

**Andere sleutels in dezelfde tabel, met persoonsgegevens erin:**

| Sleutel | Wat erin zit | Over wie |
|---|---|---|
| `fch_wedstrijden_v1` | Opstelling per speler, wissels, doelpunten, gele en rode kaarten, individuele beoordelingen, "man of the match", kleedkamerpunten (vrije tekst), opgave (wie heeft zich afgemeld) | Spelers, dus minderjarigen |
| `fch_wedstrijden_v1` → `rijschema` | **Namen van chauffeurs.** In de back-up staat een echte voor- en achternaam van een chauffeur, met het aantal plekken en welke spelers meerijden | Ouders en vrijwilligers — volwassenen die de app zelf nooit hebben gebruikt |
| `fch_trainingen_v1` | Aanwezigheid per training per speler | Minderjarigen |
| `fch_afwezigheden_v1` | Soort afwezigheid (blessure, ziekte, schorsing), begin- en einddatum, en een vrij tekstveld `reden` | Minderjarigen — **dit is gezondheidsinformatie, zie punt 2** |
| `fch_events_v1` | Wedstrijdmomenten met `spelerId` **én `spelerNaam`** — de naam staat hier los opgeslagen, buiten de spelerslijst om | Minderjarigen |
| `fch_reviews_v1` | Beoordelingen per speler: cijfer, datum, vrije tekst | Minderjarigen |
| `fch_doelen_v1` | Ontwikkeldoelen per speler, met omschrijving | Minderjarigen |
| `fch_boetes_v1`, `fch_betalingen_v1` | Wie hoeveel boete open heeft staan en wat er betaald is | Minderjarigen — dit is een financiële schuld op naam |
| `fch_activiteiten_v1`, `fch_toernooien_v1` | Aanwezigheid bij activiteiten | Minderjarigen |
| `fch_teaminstellingen_v1` | Teamnaam, thuislocatie | Geen persoonsgegevens |

**Openstaande vraag:** in welke regio staat dit project? In
`server/LEES-MIJ-EERST.txt` regel 29 staat de instructie "Region kies Frankfurt
(eu-central-1)". Dat is wat er *opgeschreven* is; of het live project daar ook
echt staat, is alleen in het Supabase-dashboard te zien. Kijk dat na en noteer
het — een jurist vraagt hier binnen twee minuten naar.

---

### 1.2 `localStorage` op het apparaat van elke gebruiker

**Dit is de plek die het makkelijkst wordt vergeten, en er staat precies
hetzelfde in als op de server.**

De app is gebouwd om eerst lokaal te werken en dan pas te synchroniseren. Alles
uit 1.1 staat dus óók volledig in de browser van elke trainer, kijker en
bestuurslid die is ingelogd — op hun telefoon, hun tablet en hun laptop. Als een
trainer de app op drie apparaten gebruikt, staan de geboortedata en
telefoonnummers van vijftien minderjarigen op drie apparaten.

Daar bovenop staat er lokaal nog:

| Sleutel | Wat het is |
|---|---|
| `tt_sessie_v1` | **Je inlogtoken en je verversToken, plus je e-mailadres en je gebruiker-id.** Het verversToken is het gevoeligste: daarmee kan iemand een nieuw inlogtoken halen zonder wachtwoord. Zie `online/index.html` regel 3566 en 3638–3660. |
| `tt_apparaat_v1` | Een willekeurig nummer per apparaat. Wordt bij elke wijziging meegestuurd naar de server, zodat de app zijn eigen wijzigingen herkent. Op zichzelf geen persoonsgegeven, maar het staat wél in de database naast de gegevens. |
| `tt_teams_v1`, `tt_club_v1`, `tt_rol_v1` | Bij welke club en welke teams je hoort, en met welke rol. |
| `tt_terug_v1` | Het "vangnet": een kopie van gegevens die bij een synchronisatie zijn overschreven. Dit kan dus een oudere versie van de complete spelerslijst bevatten. |

Er zit één opruimfunctie in de app, `wisAllesLokaal()` (`online/index.html`
regel 3275), die alles wist behalve het serveradres en het apparaatnummer.

**Openstaande vraag:** waar in de app kan een gebruiker die functie bereiken, en
staat er duidelijk bij wat hij doet? Als iemand zijn telefoon verkoopt of zijn
trainerschap neerlegt, is dit het enige middel dat er is.

---

### 1.3 De back-ups die met de hand worden gedownload

In `/Users/eserti/Documents/App/Back-ups/` staan acht bestanden van 10 september
2026, samen ruim 8 MB:

| Bestand | Inhoud |
|---|---|
| `gegevens_rows.csv` (4,2 MB) | De complete inhoud van 1.1. Alle 18 spelers, hun geboortedata en telefoonnummers, in **drie** versies (zie punt 5). |
| `teamtakkie-backup-2026-09-10.json` (4,3 MB) | Dezelfde gegevens nog een keer, geëxporteerd uit de app zelf. |
| `leden_rows.csv` | De drie leden met hun club, rol en gebruiker-id. |
| `clubs_rows.csv` | Clubnamen en clublogo's. |
| `persoonlijk_rows.csv` | Oefeningenbibliotheek, sportparken, voorkeuren. |
| `abonnementen_rows.csv`, `beheerders_rows.csv`, `teams_rows.csv` | Geen of nauwelijks persoonsgegevens. |

Deze bestanden zijn niet versleuteld en staan in platte tekst.

**En er is iets dat je waarschijnlijk niet wist.** De map `/Users/eserti/Documents`
op deze Mac is gekoppeld aan iCloud Drive — de map is ook te vinden onder
`/Users/eserti/Library/Mobile Documents/com~apple~CloudDocs/Documents/App/Back-ups/`,
met dezelfde bestanden erin. Dat betekent dat die 8 MB met geboortedata en
telefoonnummers van vijftien minderjarigen **gesynchroniseerd is naar de servers
van Apple**, onder je persoonlijke Apple-account.

Dat is niet per se verboden, maar het is wel een verwerker die nergens is
vastgelegd, die niet in een register staat, en waar geen afspraak mee is. Het is
ook de plek waar je het snelst iets aan kunt doen: die map uit de iCloud-synchronisatie
halen kost vijf minuten.

> Voor de duidelijkheid: `.gitignore` sluit `Back-ups/` uit van git, dus deze
> bestanden staan **niet** in de GitHub-repository. Dat is goed geregeld.

---

### 1.4 `auth.users` bij Supabase

De ingebouwde gebruikerstabel van Supabase. Hier staat per account:
e-mailadres, een versleuteld wachtwoord, aanmaakdatum, laatste inlogmoment, en
of het e-mailadres bevestigd is. Dit blijkt uit `server/03-beheer.sql` regel
86–104, waar de functie `alle_gebruikers()` die velden ophaalt.

**Van wie:** trainers, eigenaren en kijkers — volwassenen, drie op dit moment.
Geen spelers: een speler heeft geen account.

Deze tabel is voor gewone gebruikers niet leesbaar. Alleen wie in
`public.beheerders` staat komt erbij, en dat is één persoon (jij). Dat is netjes
afgeschermd.

---

### 1.5 `public.leden` bij Supabase

| Kolom | Wat erin staat |
|---|---|
| `naam` | De naam van de trainer/eigenaar/kijker |
| `gebruiker_id` | Verwijzing naar `auth.users` |
| `club_id` | Bij welke club |
| `rol` | `eigenaar`, `trainer` of `kijker` |

Volwassenen, drie regels. Beperkte gevoeligheid.

**Wél belangrijk om te weten:** de leesregel op de gegevens (`gegevens_lezen`,
`server/01-schema.sql` regel 257–261) kijkt alleen of je bij de club hoort —
**niet welke rol je hebt.** Een "kijker" die is toegevoegd als bestuurslid kan
dus de geboortedata en telefoonnummers van álle spelers van álle teams van die
club lezen. Dat is misschien precies de bedoeling, maar het is een keuze die
nergens is opgeschreven en die een ouder redelijk kan bevragen.

---

### 1.6 `public.persoonlijk` bij Supabase

Wat van één gebruiker is en niet van een team. Deze tabel heeft geen `club_id`;
er staat één regel per gebruiker per soort. Gemeten in de back-up staan er deze
sleutels in:

`fch_instellingen_v1` (voorkeuren, clubnaam, clublogo), `fch_oefeningen_v1`
(oefeningenbibliotheek), `fch_quiz_v1` (jouw uitslag op de spelregelquiz),
`fch_sportpark_v1` / `fch_sportparken_v1` / `fch_parksfeer_v1` (het 3D-complex),
`tt_seizoenactief_v1`, `tt_teams_weg_v1`.

**Geen gegevens van spelers, geen minderjarigen.** Wel gegevens over de
gebruiker zelf: `fch_quiz_v1` is een kennistoets-uitslag van een trainer, en dat
is een gegeven over die persoon.

De regel `persoonlijk_alles` (`server/01-schema.sql` regel 283–286) laat alleen
de eigenaar erbij. Ook dit is netjes afgeschermd. En deze tabel hangt met
`on delete cascade` aan `auth.users`: verdwijnt het account, dan verdwijnt dit
mee. Dat is de enige plek in het hele systeem waar het opruimen vanzelf goed
gaat.

---

### 1.7 Partijen die de app onderweg tegenkomt

Deze staan er niet bij als "opslag", maar ze zien wel gegevens.

| Partij | Wat zij zien | Waar dit vandaan komt |
|---|---|---|
| **Netlify** | De app wordt gehost bij Netlify. Elk bezoek levert een serverlog op met het IP-adres van de bezoeker. | `CLAUDE.md` regel 35: "Uitrollen gaat met de hand: map naar Netlify slepen." |
| **Supabase** | Alles uit 1.1, 1.4, 1.5 en 1.6, plus logs van elk verzoek. | `online/index.html` regel 3591 |
| **Amazon (AWS)** | Supabase draait op AWS. Amazon is dus subverwerker. | Supabase-documentatie |
| **Cloudflare** | De app laadt React, Babel, Three.js, jsPDF en Font Awesome van `cdnjs.cloudflare.com`. Het IP-adres van elke bezoeker gaat daarheen. | `online/index.html` regel 72–76 en `online/sw.js` regel 20–30 |
| **Google** | Het lettertype komt van `fonts.googleapis.com` en `fonts.gstatic.com`. Ook daar gaat het IP-adres van elke bezoeker heen. | `online/index.html` regel 13–15 |
| **Apple (iCloud)** | De back-ups, zie 1.3. | Gemeten op deze Mac |
| **Sportlink / Voetbal.nl** | Alleen als een gebruiker zelf een kalenderlink plakt. Dan gaat er een verzoek naar `data.sportlink.com` mét de persoonlijke token uit die link. Er gaan geen spelersgegevens naartoe; het is alleen ophalen. | `online/index.html` regel 18705–18709 |

De service worker (`online/sw.js`) bewaart de bestanden van Cloudflare en Google
lokaal, dus na het eerste bezoek zijn er minder van die verzoeken. Het eerste
bezoek en elke versie-update leveren ze wel op.

**Openstaande vragen bij dit blok:**
- Welke logs houdt Netlify bij, hoe lang, en is daar een verwerkersovereenkomst
  voor? Netlify Inc. is een Amerikaans bedrijf.
- Hoe lang bewaart Supabase zijn logs op het gratis plan?
- Is het gebruik van Cloudflare en Google Fonts hier een probleem? Over Google
  Fonts en IP-adressen is in Europa het een en ander te doen geweest. Dit is
  precies een vraag voor de jurist, en het is technisch oplosbaar door die
  bestanden mee te leveren in plaats van ze op te halen. Dat is werk voor Fenna,
  geen groot werk, maar niet iets voor een middag.

---

## 2. Wat hiervan bijzondere persoonsgegevens zijn

De AVG kent een categorie waar extra strenge regels voor gelden. Eén ervan is
**gegevens over gezondheid**. Die zitten hier in.

### 2.1 Waar het precies staat

**Het veld `beschikbaar`** op elke speler, plus het bijbehorende vrije tekstveld
`beschikbaarNotitie` (`online/index.html` regel 9327). De mogelijke waarden
staan op regel 7571–7578:

```js
const BESCHIKBAARHEID = [
  {id:"fit",         label:"Beschikbaar", ...},
  {id:"twijfel",     label:"Twijfel",     ...},
  {id:"geblesseerd", label:"Blessure",    ...},
  {id:"geschorst",   label:"Geschorst",   ...},
  {id:"vakantie",    label:"Vakantie",    ...}
];
```

`geblesseerd` is een gezondheidsgegeven. `twijfel` waarschijnlijk ook, omdat het
in de praktijk "nog niet hersteld" betekent. En het tekstveld eronder heeft in
het formulier als voorbeeldtekst staan: **"bijv. enkelblessure, terug over 2
weken"** (regel 22402). De app nodigt dus letterlijk uit om een medische
omschrijving in te typen.

**De tabel `fch_afwezigheden_v1`.** Per regel: `spelerId`, `soort`, `vanaf`,
`tot`, `reden`, `teltMee`. De soorten staan op regel 28884–28936 en zijn onder
meer `ziek`, `langdurig ziek`, `blessure` en `geschorst`. Het veld `reden` is
vrije tekst.

**Het scherm waarin dit wordt bijgehouden** heet in de app letterlijk
"Blessures en afwezigheid" (`BlessuresTab`, regel 23722; het label staat op
regel 4361).

### 2.2 Wat dat praktisch betekent

Ik geef geen juridisch advies, maar wel wat dit in het gesprek gaat opleveren,
zodat je erop voorbereid bent:

1. **De lat ligt hoger dan voor een naam.** Voor gewone persoonsgegevens is
   "we hebben hier een gerechtvaardigd belang bij" vaak een bruikbaar verhaal.
   Voor gezondheidsgegevens is dat niet genoeg; daar is in de regel expliciete
   toestemming voor nodig, of een andere specifieke grond. Bij minderjarigen
   onder de zestien moet die toestemming van de ouder komen.

2. **Het gaat om vijftien minderjarigen tegelijk.** In de gemeten selectie is
   één speler niet-fit met een toelichting. Eén. Maar het veld is voor alle
   achttien gevuld met een status, en de functionaliteit staat aan.

3. **Het combineert.** De blessurestatus staat in dezelfde JSON-blob als de
   geboortedatum, het telefoonnummer en de naam. Wie één regel van
   `public.gegevens` te pakken krijgt, heeft alles van dat team in één keer.

4. **Dit is waarschijnlijk het punt waarop de jurist zegt: hier moet een
   afweging op papier.** Vraag daar zelf naar. De term die je gaat horen is
   "DPIA" of "gegevensbeschermingseffectbeoordeling". Of die hier verplicht is,
   is niet aan mij, maar de combinatie "gezondheidsgegevens + minderjarigen +
   systematisch bijgehouden" is precies de combinatie waarbij die vraag opkomt.

### 2.3 Wat hier géén bijzonder gegeven is

Voor de volledigheid, zodat je niet meer verdediging opbouwt dan nodig:
`geschorst` en `vakantie` zijn geen gezondheidsgegevens. De boetes zijn dat ook
niet. De foto's zouden het kunnen worden als er biometrische herkenning op zou
draaien — dat is hier niet zo, het is gewoon een pasfoto.

---

## 3. Wat er moet liggen vóór de eerste factuur

De eerste factuur is het moment waarop dit van hobby naar dienstverlening gaat.
Hieronder staat per punt wát er moet zijn, wie het regelt en waar het vandaan
komt. Op volgorde van hoe hard het nodig is.

---

### 3.1 Een verwerkersovereenkomst met Supabase

**Wat er moet zijn:** een contract waarin staat dat Supabase jouw gegevens
alleen voor jou verwerkt.

**Wat ik heb uitgezocht:** Supabase heeft één DPA, gepubliceerd op
**https://supabase.com/legal/dpa** (versie 1, 1 augustus 2026). De eerste zin
daarvan luidt:

> "This Data Processing Addendum (the "DPA") supplements and **forms part of the
> Supabase Terms of Service** available at https://supabase.com/terms (…). This
> DPA is effective as of the Effective Date of the Agreement."

En over de doorgifte naar landen buiten de EU staat er in clausule 12.2:

> "The Parties agree that **acceptance of the Agreement shall have the same
> effect as signing** the SCCs."

Supabase' eigen documentatiepagina over de AVG
(**https://supabase.com/docs/guides/security/gdpr-compliance**, sectie "Data
processing agreement (DPA)") verwijst voor "Request or view the DPA"
naar diezelfde pagina `/legal/dpa`. Er is geen aparte aanvraagknop, geen
formulier, en geen apart ondertekeningsscherm in het dashboard.

**Wat dat betekent:** de DPA hoort automatisch bij de gebruiksvoorwaarden. Je
hebt hem dus al, ook op het gratis plan, doordat je akkoord bent gegaan met de
voorwaarden bij het aanmaken van je account. Er staat **nergens op die pagina's
een beperking naar betaald plan.**

**Waar het in het dashboard staat:** nergens als aparte knop, voor zover ik van
buitenaf kan zien. De weg is: Supabase-dashboard → onderin de footer of via
supabase.com → **Legal Hub** (supabase.com/legal) → **Customer Legal Resources**
→ **Data Processing Addendum**. Op diezelfde Legal Hub staat ook de
**Subprocessor List** (bijgewerkt 1 juni 2026) — die heb je nodig voor je
register, want daar staan Supabase' eigen onderaannemers in.

**Wie regelt dit:** Evan. Kost: een half uur, namelijk de DPA en de
subverwerkerslijst downloaden en met een datum opbergen.

**Openstaande vragen — leg deze twee aan de jurist voor:**
- Is een DPA die automatisch onderdeel is van de voorwaarden voldoende, of wil
  je een exemplaar met een handtekening? Ik heb geen manier gevonden om er een
  getekend exemplaar van te krijgen. Als de jurist of de bond daarop staat, moet
  Supabase daarvoor benaderd worden (privacy@supabase.io, genoemd in de DPA).
- De versie is van 1 augustus 2026. Jouw account bestaat al langer. Welke versie
  gold er toen? Dat is geen theoretische vraag als er ooit gedoe komt.

---

### 3.2 Een verwerkersovereenkomst met Netlify

**Wat er moet zijn:** hetzelfde, voor de partij die de app host.

**Wat ik heb uitgezocht:** niets — dit valt buiten wat ik van buitenaf kan
nakijken. Dat Netlify de hosting doet staat in `CLAUDE.md` regel 35 en in
`online/LEES-MIJ.txt` regel 4.

**Wie regelt dit:** Evan. Zoek de legal-pagina van Netlify op en kijk of daar
hetzelfde geldt als bij Supabase: DPA automatisch onderdeel van de voorwaarden,
of een aparte handeling nodig.

**Openstaande vraag:** door Netlify gaat het IP-adres van elke bezoeker, maar
geen spelersgegevens — die gaan rechtstreeks van de browser naar Supabase. Dat
maakt Netlify een lichtere verwerker dan Supabase. Of dat verschil ertoe doet,
is een vraag voor de jurist.

---

### 3.3 Het uit iCloud halen van de back-upmap

**Wat er moet zijn:** geen 8 MB met geboortedata en telefoonnummers van vijftien
minderjarigen in een persoonlijke iCloud-map.

**Wie regelt dit:** Evan, en dit is het enige punt in deze lijst dat je vandaag
nog af kunt hebben. Verplaats `Back-ups/` naar een map buiten `~/Documents`, of
zet Desktop & Documents-synchronisatie uit voor deze map. Zet er daarna een
afspraak op: hoe vaak maak je een back-up, waar staat hij, hoe lang bewaar je
hem, en versleutel je hem.

**Waarom dit hoog staat:** het is verifieerbaar, het is nu waar, en het is in
vijf minuten opgelost. Alles daaronder kost een gesprek of een verbouwing.

---

### 3.4 Een privacyverklaring in de app

**Wat er moet zijn:** een tekst die vertelt welke gegevens je verwerkt, waarom,
hoe lang, met wie je ze deelt, en hoe iemand zijn rechten uitoefent.

**Wat er nu is:** niets. Ik heb de hele app doorzocht op "privacy",
"privacyverklaring", "verwerkersovereenkomst", "toestemming", "AVG" en "cookie".
**Geen enkele treffer.** Er is geen privacyverklaring, geen toestemmingsscherm en
geen enkele tekst over gegevensverwerking in de app.

**Wie regelt dit:** de tekst komt van de jurist of van een model van de
sportbond; het inbouwen is werk voor Fenna. Vraag in het gesprek expliciet of de
bond een model heeft — amateurvoetbalclubs hebben allemaal met dit
probleem te maken en de kans is groot dat er iets ligt dat je mag hergebruiken.

---

### 3.5 Toestemming van ouders, en van wie die toestemming vraagt

**Wat er moet zijn:** een antwoord op de vraag wie aan de ouder van een
vijftienjarige uitlegt dat zijn geboortedatum, telefoonnummer en blessurestatus
in een app van een derde partij komen te staan, en wie die toestemming vastlegt.

**Wat er nu is:** niets, in de app noch daarbuiten. De trainer typt de gegevens
in en er gebeurt verder niets.

**Wie regelt dit:** dit hangt volledig af van het antwoord op punt 4 hieronder.
Als de vereniging verwerkingsverantwoordelijke is, is het hun taak en moet jij
alleen zorgen dat het kán. Als jij het bent, is het jouw taak en is het een veel
groter probleem, want jij hebt geen relatie met die ouders.

**Dit is het punt waar het gesprek met de jurist over moet gaan.**

---

### 3.6 Bewaartermijnen

**Wat er moet zijn:** een antwoord op "hoe lang bewaren we de gegevens van een
speler die vertrokken is?", en een manier om die termijn ook echt uit te voeren.

**Wat er nu is:** geen termijn en geen manier. Zie punt 5 — daar staat wat er in
de code gebeurt.

**Wie regelt dit:** de termijn komt van de jurist of de bond; het uitvoeren is
werk voor Bas (database) en Fenna (scherm).

---

### 3.7 Een verwijderprocedure

**Wat er moet zijn:** een manier waarop een ouder kan zeggen "haal de gegevens
van mijn kind weg", en waarop dat ook echt gebeurt — op de server, op de
apparaten van de trainers, en in de back-ups.

**Wat er nu is:** één functie, `verwijder_account` (`server/03-beheer.sql` regel
132–157), en die kan alleen jij aanroepen, en hij verwijdert een *account* —
dus een trainer, geen speler. Voor een speler bestaat er niets. Zie punt 5.

**Wie regelt dit:** Bas, en het is echt werk. Zie punt 5 voor waarom.

---

### 3.8 Algemene voorwaarden, btw en een register

Dit noem ik alleen als lijstje; het invullen ervan is niet aan mij.

- **Algemene voorwaarden** voor de dienst zelf: wat lever je, wat als het
  uitvalt, wat als een klant opzegt, wat gebeurt er dan met de gegevens.
- **Btw**: nu je een KvK-nummer hebt is de vraag of en hoe je btw rekent over
  € 9,99 per maand. Vraag dit aan een boekhouder, niet aan de privacyjurist.
- **Verwerkingsregister**: een lijst van wat je verwerkt, waarom, van wie, hoe
  lang en met wie je het deelt. Dit document is daar het ruwe materiaal voor,
  maar het is niet hetzelfde ding. Vraag de jurist of je er één moet hebben en
  in welke vorm.
- **Datalekprocedure**: wat doe je als het misgaat, en binnen hoeveel tijd.
  Let op: er is op dit moment geen enkele foutrapportage of bewaking
  (`docs/technische-beoordeling.md`). Je zou een datalek niet merken. Dat is
  een technisch punt met een juridische staart.

---

## 4. De vraag die ik stel maar niet beantwoord

**Als voetbalvereniging De Granaet € 9,99 per maand betaalt voor TEAMTAKKIE —
wie is dan verwerkingsverantwoordelijke voor de gegevens van hun spelers: de
vereniging, of Van Sertima Studios?**

Ik beantwoord deze vraag niet. Dat is geen bescheidenheid; het is het enige
punt in dit document waar een verkeerd antwoord duur is, en het hangt af van
feiten die buiten de code liggen.

### Waarom het uitmaakt

De verwerkingsverantwoordelijke is degene die bepaalt *waarom* en *hoe* er
gegevens worden verwerkt. Die persoon of organisatie is aanspreekbaar: die krijgt
het verzoek van de ouder, die doet de melding bij de Autoriteit
Persoonsgegevens, en die krijgt de boete.

**Als de vereniging verantwoordelijke is en jij verwerker:**
- Jij tekent een verwerkersovereenkomst **met elke vereniging**. Niet één keer,
  maar bij elke nieuwe klant.
- De vereniging regelt de toestemming van de ouders en de privacyverklaring naar
  hun leden. Jij moet zorgen dat je dat technisch mogelijk maakt.
- Komt er een verzoek van een ouder, dan gaat dat naar de vereniging, en jouw
  plicht is om de vereniging te helpen het uit te voeren. Daar heb je dus een
  knop voor nodig die er nu niet is.
- Jij mag niets met die gegevens doen wat de vereniging niet heeft opgedragen.
  Geen statistieken over alle clubs heen, geen "kijken hoe de app gebruikt
  wordt", tenzij het in het contract staat.

**Als jij verantwoordelijke bent:**
- Dan is er geen verwerkersovereenkomst met de vereniging nodig, maar heb jij
  rechtstreeks een verhouding met vijftien minderjarigen die je nog nooit hebt
  gesproken en met wie je geen enkel contact hebt.
- Dan moet jij de privacyverklaring maken, de toestemming regelen, de verzoeken
  afhandelen en de melding doen. Zonder dat je de ouders kent.
- Dat is een veel zwaardere positie, en het is de positie waar je in terechtkomt
  als er niets is geregeld.

### Waarom het niet simpel is

Je zou zeggen: de vereniging beslist wie er in de app komt, dus de vereniging is
verantwoordelijke. Dat is de gebruikelijke lijn bij dit soort software. Maar er
zijn hier drie dingen die het troebel maken, en die moet je zelf noemen in het
gesprek:

1. **Jij hebt de velden bepaald.** Dat er een geboortedatum, een adres, een
   pasfoto en een blessurenotitie in de app zit, heeft de vereniging niet
   bedacht. Dat staat in `LEEG_SPELER`, en dat heb jij geschreven. Wie de
   categorieën gegevens kiest, zit dichter bij "verantwoordelijke" dan bij
   "verwerker".

2. **De gegevens staan in jouw Supabase-project, niet in dat van de club.** Er
   is één database voor alle clubs. De app biedt weliswaar de mogelijkheid dat
   een club zijn eigen serveradres invult (`online/index.html` regel 3565–3590:
   "draait hij op zijn eigen server en komt zijn ledenlijst nooit hier terecht"),
   maar in de praktijk gebruikt iedereen jouw project.

3. **Een individuele trainer kan zich ook zonder vereniging aanmelden.** De
   functie `nieuwe_club()` laat iedereen die is ingelogd een club aanmaken. Als
   een trainer op eigen houtje TEAMTAKKIE gebruikt voor zijn JO13, is er
   helemaal geen vereniging die verantwoordelijk kan zijn — dan is het die
   trainer, of jij.

**Dit is een juristenvraag.** Neem hem als eerste punt mee. Het antwoord bepaalt
welke contracten je moet laten maken en welke knoppen er in de app moeten komen,
en het is zonde om die te bouwen voordat je het weet.

---

## 5. Een bewaartermijn-probleem dat je in de code kunt zien

Dit is het punt waarvan ik denk dat het je het eerst gaat raken, want het is de
vraag die een ouder daadwerkelijk gaat stellen: *"Mijn zoon speelt daar niet
meer. Zijn zijn gegevens weg?"*

Het antwoord is: **nee, en er is op dit moment geen manier om ze weg te
krijgen.** Hieronder staat precies waarom, in vier stappen.

### 5.1 Een speler die uit het team gaat

De trainer haalt de speler weg via het spelersprofiel. Wat er dan gebeurt staat
in `online/index.html` regel 24316–24323:

```js
function verwijderSpeler() {
  const weg = gekozen;
  setSpelers(l=>l.filter(s=>s.id!==weg.id));
  setGekozen(null);
  toon(weg.naam+" verwijderd uit de selectie", { actie: ... });
}
```

De speler wordt uit de lijst gefilterd. Die lijst wordt opgeslagen en bij de
volgende synchronisatie naar de server geduwd. Tot zover klopt het: naam,
geboortedatum, telefoon, adres, foto en blessurestatus zijn weg uit
`fch_spelers_v1`.

**Maar zijn id staat nog overal.** De spelerslijst is de enige plek waar hij
werd verwijderd. Zijn `spelerId` blijft staan in:

- `fch_wedstrijden_v1` — in `opstelling`, `scorers`, `kaarten`, `opgave`,
  `beoordelingen`, `motm`, `rollen` en `rijschema`
- `fch_trainingen_v1` — in `aanwezigheid`
- `fch_afwezigheden_v1` — inclusief de blessureregels met datum en vrije tekst
- `fch_boetes_v1` en `fch_betalingen_v1` — inclusief wat hij nog schuldig was
- `fch_doelen_v1` en `fch_reviews_v1` — inclusief de vrije tekst over hem
- `fch_events_v1` — **en daar staat ook `spelerNaam`**, zijn naam dus, als losse
  kopie buiten de spelerslijst om

Dat laatste is het scherpste punt. Zijn naam blijft in de database staan,
gekoppeld aan wedstrijdmomenten, ook nadat hij "verwijderd" is.

De app is hier netjes over: de boetefunctie slaat regels van onbekende spelers
over (`if (!bekend[spelerId]) return;`, regel 9224). Maar "niet meer tonen" is
iets anders dan "weg".

### 5.2 De seizoenswisseling verdrievoudigt het probleem

Sinds de invoering van seizoenen krijgt elke sleutel het seizoen erin:
`tt_<team>__<seizoen>::<soort>`. Bij het starten van een nieuw seizoen worden
de spelers **gekopieerd** naar het nieuwe seizoen (`startSeizoen`, regel
9140–9172). De oude blijft staan; het commentaar op regel 9115 zegt het zelf:
"er wordt niets weggegooid en niets verplaatst."

Dat is voor de sportieve administratie de juiste keuze. Voor de AVG betekent het
dat dezelfde geboortedatum en hetzelfde telefoonnummer in elke seizoenslaag
opnieuw staan.

**En er is nog een derde laag.** De sleutels van vóór de seizoensverbouwing
staan er ook nog, zonder `::` ervoor. Die worden bewust met rust gelaten
(`syncTeamGegevens`, regel 4783–4792):

> "Hier houdt die kringloop op. Er wordt niets weggegooid: de rij blijft gewoon
> op de server staan. Hij wordt alleen niet meer opgehaald en niet meer geduwd."

Dat is technisch een goede beslissing — het lost een echte bug op. Maar het
betekent wel dat er rijen met persoonsgegevens op de server staan die de app
nooit meer aanraakt, die nooit meer worden bijgewerkt, en die door geen enkele
handeling in de app nog te bereiken zijn.

**Dit is geen theorie. Dit staat in de back-up van 10 september 2026:**

```
fch_spelers_v1                18 spelers, 18× geboortedatum, 18× telefoon
2025-2026::fch_spelers_v1     18 spelers, 18× geboortedatum, 18× telefoon
2026-2027::fch_spelers_v1     18 spelers, 18× geboortedatum, 18× telefoon
```

Drie keer dezelfde achttien kinderen. Als de trainer nu één speler uit het
huidige seizoen haalt, verandert er precies één van die drie rijen. De andere
twee blijven ongewijzigd staan, inclusief zijn naam, geboortedatum en
telefoonnummer.

### 5.3 Een team dat `verwijderd_op` krijgt

Hier gaat het opmerkelijk genoeg beter. In `duwTeamsWeg()`
(`online/index.html` regel 4602–4618) gebeurt er dit:

1. Het team krijgt een datum in `verwijderd_op` — de rij blijft bestaan. Dat is
   nodig, anders zou een tweede apparaat het team morgen opnieuw aanmaken.
2. Daarna wordt **wel** `DELETE /rest/v1/gegevens?team_id=eq.<id>` uitgevoerd.
   Alle gegevensrijen van dat team gaan echt weg, inclusief alle
   seizoenslagen en de oude sleutels zonder `::`.

Dat is goed gedaan, en het commentaar erboven zegt het ook: "De gegevens gaan
wél echt weg. Daar zit het gewicht."

**Wat er blijft staan:** de rij in `public.teams` met de teamnaam en de datum.
Voor altijd. Een teamnaam als "JO19-2" is geen persoonsgegeven, dus dat is geen
probleem. Maar er is nergens een opruiming van die grafstenen.

**Waar het wel misgaat:** deze verwijdering gebeurt alleen als het apparaat dat
het team weggooide de server ook bereikt. Lukt dat niet, dan blijft de
grafsteen lokaal staan en wordt het bij de volgende ronde geprobeerd. Zolang dat
apparaat niet meer wordt gebruikt — een trainer die stopt en zijn telefoon
opbergt — blijven de gegevens op de server staan.

**Openstaande vraag:** wat gebeurt er als trainer A een team weggooit terwijl
trainer B van dezelfde club dat team nog heeft? Dat kan ik uit de code niet met
zekerheid afleiden, en het is een test die Tess zou moeten schrijven.

### 5.4 Een club die stopt

Hier zit het grootste gat.

**Er is geen deleteregel op `public.clubs`.** In `server/01-schema.sql` staan
voor clubs de regels `clubs_lezen`, `clubs_maken` en `clubs_wijzigen` — en geen
enkele regel voor `delete`. Zonder zo'n regel weigert Postgres elke poging.

Dat betekent: **een vereniging kan haar eigen gegevens niet verwijderen.** Niet
via de app, niet via een eigen verzoek aan de server. Ook de eigenaar van de
club niet.

De enige manier is `verwijder_account` (`server/03-beheer.sql` regel 132–157),
en die:
- kan alleen worden aangeroepen door iemand die in `public.beheerders` staat,
  en dat is één persoon: jij;
- verwijdert een *gebruikersaccount*, geen club;
- verwijdert de club alleen als die persoon **het laatste lid** was. Staat er
  nog één kijker in, dan blijft de club met alle spelersgegevens staan, zonder
  eigenaar.

**Praktisch:** als een club opzegt, kun jij dat alleen oplossen door zelf in het
Supabase-dashboard rijen te verwijderen. Dat is handwerk, er is geen procedure
voor, geen logboek van wat je hebt gedaan, en geen manier om aan de club te
bewijzen dat het gebeurd is.

### 5.5 En de back-ups blijven hoe dan ook

Wat je ook op de server verwijdert — de CSV van 10 september 2026 in
`Back-ups/` bevat alle achttien spelers in drievoud, en die staat ook op de
servers van Apple. Een verwijdering op de server raakt die back-ups niet.

### 5.6 Wat dit samen betekent

Als een ouder morgen belt:

| Vraag | Antwoord vandaag |
|---|---|
| "Staan de gegevens van mijn kind er nog?" | Ja, waarschijnlijk in drie seizoenslagen. |
| "Kunt u ze verwijderen?" | Alleen met de hand in het Supabase-dashboard, en dan nog moet je weten in welke JSON-blob je moet zoeken en welke rijen erbij horen. |
| "Kunt u aantonen dat ze weg zijn?" | Nee. Er is geen logboek en geen controle. |
| "Staan ze ook nog ergens anders?" | Ja: in de browser van elke trainer die is ingelogd, in de back-ups op de Mac, en in iCloud. |
| "Hoe lang zouden ze er gestaan hebben als ik niet had gebeld?" | Onbeperkt. Er is geen termijn en geen opruiming. |

**Dit is geen ramp, want er zit vandaag één club met achttien spelers in.** Maar
het is precies het soort probleem dat niet meeschaalt: bij tien clubs is het niet
tien keer zo veel werk, het is onhoudbaar. En het is werk dat je liever doet
vóórdat je het aan een klant moet uitleggen dan erna.

---

## 6. Alle openstaande vragen bij elkaar

Neem deze lijst mee. Het zijn de dingen waar ik geen antwoord op heb kunnen
vinden.

**Voor jezelf, na te kijken in een dashboard (kost samen een uur):**
1. In welke regio staat het Supabase-project werkelijk? Instructie zegt
   Frankfurt (`server/LEES-MIJ-EERST.txt` regel 29), maar niet geverifieerd.
2. Hoe lang bewaart Supabase zijn logs op het gratis plan?
3. Welke logs houdt Netlify bij, en hoe lang?
4. Heeft Netlify een DPA die automatisch bij de voorwaarden hoort, zoals
   Supabase?
5. Welke versie van de Supabase-DPA gold er toen je account werd aangemaakt?
6. Waar in de app kan een gebruiker `wisAllesLokaal()` bereiken, en staat er
   uitgelegd wat het doet?

**Voor de jurist of de bond:**
7. **Wie is verwerkingsverantwoordelijke als een vereniging betaalt?** (punt 4 —
   begin hiermee)
8. Is een DPA die automatisch onderdeel is van de voorwaarden voldoende, of moet
   er een getekend exemplaar komen?
9. Is er voor deze combinatie — gezondheidsgegevens van minderjarigen,
   systematisch bijgehouden — een DPIA nodig?
10. Welke bewaartermijn hoort hierbij? Één seizoen na vertrek? Twee?
11. Is het ophalen van lettertypen bij Google en bibliotheken bij Cloudflare,
    waarbij het IP-adres van elke bezoeker meegaat, hier een probleem?
12. Heeft de bond een model-privacyverklaring en een model-toestemmingsformulier
    voor ouders dat je mag gebruiken?
13. Wie vraagt de toestemming aan de ouders — de vereniging of jij?
14. Mag een "kijker" (bestuurslid) de geboortedata en telefoonnummers van alle
    spelers van alle teams inzien, zoals nu het geval is?

**Voor Tess (tests):**
15. Wat gebeurt er als trainer A een team weggooit terwijl trainer B van
    dezelfde club het nog heeft?

---

## 7. Wat ik in deze inventaris níét heb behandeld

Zodat je weet wat er nog ligt en dit document niet meer belooft dan het is:

- **Het abonnement schermt niets af.** `magPagina()` wordt nergens aangeroepen
  en `pakketNu()` begint met `var id = "max"`. Dat is een commercieel probleem,
  geen privacyprobleem, en het staat al beschreven in
  `docs/technische-beoordeling.md`.
- **De kapotte policy op `public.leden`** (`infinite recursion detected in policy
  for relation "leden"`) en de openstaande `clubs_maken with check (true)`. De
  reparaties staan klaar in `server/04-leden-fix.sql` en
  `server/06-pakketten.sql`. Of ze op de live database zijn gedraaid, weet ik
  niet — dat is een openstaande vraag voor Bas, geen AVG-vraag.
- **Of de tenantisolatie werkt.** Die is elders aantoonbaar in orde: een club
  ziet alleen zijn eigen gegevens. Dit document zegt daar niets negatiefs over
  en dat is met opzet.

---

## 8. Aanvulling 18 september 2026 — de betaalketen (Mollie)

**Status:** ontwerp. Op het moment van schrijven is er nog geen betaalroute
gebouwd en is er nog geen Mollie-account. Dit blok beschrijft wat er aan
persoonsgegevens *bij komt* zodra clubs in de app zelf kunnen upgraden naar
Coach of Club en betalen met iDEAL plus een SEPA-machtiging.

Het staat hier als aanvulling en niet verwerkt in de punten 1 tot en met 7,
omdat die punten een gemeten momentopname van 10-11 september 2026 zijn. Waar
dit blok een eerder punt uitbreidt, staat dat erbij.

---

### 8.1 Wat er technisch bij komt

Drie nieuwe onderdelen, elk met een eigen gevolg voor deze inventaris:

| Onderdeel | Wat het is | Gevolg |
|---|---|---|
| **Mollie B.V.** | De betaaldienstverlener. Amsterdam, Nederlands bedrijf. | Nieuwe partij die persoonsgegevens ziet — hoort in 1.7 thuis. |
| **Twee Supabase Edge Functions** (`betaling-starten`, `betaling-melding`) | Servercode die de betaling aanmaakt en de melding van Mollie verwerkt. | Nieuwe logbestanden bij Supabase. |
| **`public.betalingen`** | Een nieuwe tabel: welke club heeft wanneer hoeveel betaald. | Nieuwe plek met gegevens — hoort bij 1.1 tot en met 1.6 thuis. |

De betaalgegevens zelf — rekeningnummer, naam op de rekening, de machtiging —
komen **niet** in de eigen database. Die worden ingevuld op de betaalpagina van
Mollie en blijven daar. Dat is geen toeval maar een ontwerpkeuze, zie 8.3.

---

### 8.2 Welke nieuwe persoonsgegevens er zijn, en van wie

Tot nu toe ging dit document bijna helemaal over spelers, en dat zijn voor het
grootste deel minderjarigen. **Deze aanvulling gaat over een andere groep:** de
volwassene die de club beheert en betaalt. Eén persoon per betalende club, geen
minderjarigen, geen gezondheidsgegevens.

| Gegeven | Waar het terechtkomt | Van wie |
|---|---|---|
| Naam en e-mailadres van de betaler | Bij Mollie (voor de betaling en de machtiging) | De eigenaar van de club |
| IBAN en naam op de rekening | **Alleen bij Mollie** | De eigenaar van de club |
| De SEPA-machtiging zelf (met datum en kenmerk) | **Alleen bij Mollie** | De eigenaar van de club |
| IP-adres tijdens het afrekenen | Bij Mollie, en bij de bank in het iDEAL-scherm | De eigenaar van de club |
| Betaalgeschiedenis: bedrag, datum, pakket, geslaagd of niet | In `public.betalingen`, bij ons | Gekoppeld aan de *club*, niet rechtstreeks aan een persoon |
| Het Mollie-klantnummer (`cst_…`) en het machtigingskenmerk (`mdt_…`) | Bij ons, als verwijzing | Indirect herleidbaar tot de betaler |

Dat laatste is belangrijk om eerlijk op te schrijven: een Mollie-klantnummer is
op zichzelf een betekenisloze reeks tekens, maar met dat nummer kan wie de
Mollie-sleutel heeft de naam en het rekeningnummer opvragen. Het is dus wél een
persoonsgegeven, net zoals `gebruiker_id` in `public.leden` dat is.

---

### 8.3 Wat er met opzet níét wordt opgeslagen

Dit is de aanbeveling die in het ontwerp is vastgelegd, en het is de goedkoopste
privacymaatregel in dit hele document: **de eigen database slaat geen enkel
rekeningnummer, geen naam van een betaler en geen e-mailadres van een betaler
op.** Ook niet de laatste vier cijfers van een IBAN.

De reden is praktisch. Alles wat er niet staat:

- kan niet uitlekken;
- hoeft niet in een bewaartermijn;
- hoeft niet verwijderd te worden als iemand daarom vraagt;
- hoeft niet in een back-up mee (zie 1.3 — de back-ups worden met de hand
  gedownload en stonden tot voor kort in iCloud).

Wil de app ooit tonen "SEPA-machtiging op rekening •••• 1234", dan is dat op te
halen bij Mollie op het moment dat het scherm wordt getoond, in plaats van het
hier te bewaren. **Openstaande vraag 20 hieronder gaat daarover** — dit is een
keuze die nog niet definitief is.

---

### 8.4 De betaallog: wat erin staat en hoe lang

De nieuwe tabel `public.betalingen` krijgt naar verwachting deze kolommen:
het Mollie-betaalnummer, `club_id`, het bedrag, de munteenheid, het pakket
(`coach`/`club`), de termijn (maand of jaar), de status, of het een test- of een
echte betaling was, en drie tijdstippen (aangemaakt, betaald, verwerkt).

**Bewaartermijn: zeven jaar.** Niet omdat de AVG dat wil, maar omdat de
Belastingdienst dat wil: een administratie moet zeven jaar bewaard blijven. Dat
is dus een langere termijn dan alles wat elders in dit document staat, en dat is
verdedigbaar zolang er in die rijen géén naam, e-mailadres of rekeningnummer
staat (zie 8.3). De enige persoonlijke aanwijzing is dan het clubnummer.

**Eén valkuil die in het ontwerp is opgelost.** Zou `betalingen.club_id` met
`on delete cascade` aan `public.clubs` hangen — zoals `abonnementen` dat doet
(`server/01-schema.sql` regel 106) — dan verdwijnt de hele boekhouding op het
moment dat een club wordt verwijderd. Dat is precies het geval waarin je hem
nodig hebt. De aanbeveling is daarom `on delete set null`, plus een losse
tekstkolom met de clubnaam zoals die op het moment van betalen was. Een
clubnaam is geen persoonsgegeven; de boekhouding overleeft daarmee een
verwijderverzoek zonder dat er iets persoonlijks blijft staan.

**Lezen:** alleen de beheerder (jij), via `is_beheerder()` zoals bij
`public.foutmeldingen` in `server/16-foutrapportage.sql`. Als een clubeigenaar
later zijn eigen betaalgeschiedenis in de app moet kunnen zien, gebeurt dat via
een aparte functie die alleen de veilige kolommen teruggeeft — niet door de
tabel open te zetten.

---

### 8.5 Mollie als partij — en of daar een overeenkomst mee nodig is

Dit is de tegenhanger van 3.1 (Supabase) en 3.2 (Netlify), en het is
ingewikkelder dan die twee.

**Wat vaststaat:** Mollie B.V. is een Nederlands bedrijf, gevestigd in
Amsterdam, en staat onder toezicht van De Nederlandsche Bank. Er gaan geen
spelersgegevens naar Mollie — geen namen van minderjarigen, geen geboortedata,
geen blessures. Alleen de gegevens van de volwassene die betaalt. Dat maakt dit
een aanzienlijk lichtere partij dan Supabase.

**Wat een openstaande vraag is:** of Mollie hier *verwerker* is (dan hoort er
een verwerkersovereenkomst te liggen) of **zelf verwerkingsverantwoordelijke**.
Voor betaaldienstverleners geldt in de regel het tweede voor een deel van wat ze
doen: een betaalinstelling moet op grond van de Wwft en het bankentoezicht zelf
klantonderzoek doen en gegevens bewaren, en dat doet zij niet in jouw opdracht
maar op eigen wettelijke titel. In de praktijk publiceert Mollie een
verwerkersovereenkomst als onderdeel van de gebruikersovereenkomst, net zoals
Supabase dat doet (3.1).

**Wat Evan moet doen, en wanneer:** op het moment van de accountaanvraag, in
hetzelfde half uur waarin je toch de voorwaarden doorneemt — de
verwerkersovereenkomst en de subverwerkerslijst downloaden en met een datum
opbergen, precies zoals bij Supabase. Dit is geen reden om het bouwen uit te
stellen.

**Dit verandert punt 4 niet.** De vraag wie verwerkingsverantwoordelijke is voor
de *spelersgegevens* staat hier helemaal los van. Sterker: de eerste factuur is
het moment waarop die vraag beantwoord moet zijn, en die eerste factuur komt met
deze betaalroute dichterbij.

---

### 8.6 Twee nieuwe plekken waar gegevens langskomen

**Aanvulling op 1.7 (partijen die de app onderweg tegenkomt):**

| Partij | Wat zij zien |
|---|---|
| **Mollie B.V.** | Naam, e-mailadres, IBAN, IP-adres van de betaler. Geen spelersgegevens. |
| **De bank van de betaler** | Het iDEAL-scherm draait bij zijn eigen bank. |
| **Supabase Edge Functions** | Een nieuw logbestand per aanroep van `betaling-starten` en `betaling-melding`. |

Dat laatste verdient een regel apart. Edge Functions loggen standaard mee wat er
in- en uitgaat als de code dat opschrijft. **De eis in het ontwerp is dat er
nooit een volledige verzoek- of antwoordtekst in het log terechtkomt**, want in
het antwoord van Mollie staan wél de naam en het rekeningnummer van de betaler.
Alleen het betaalnummer, de status en het clubnummer mogen in het log. Dezelfde
terughoudendheid als bij `browser_info` in `public.foutmeldingen`
(`server/16-foutrapportage.sql`), waar met opzet niet de volledige
user-agent-tekst wordt bewaard.

---

### 8.7 Wat er bij de privacyverklaring en de voorwaarden bij komt

Punt 3.4 (privacyverklaring) en 3.8 (algemene voorwaarden) worden hierdoor
concreter. Er moet nu in elk geval in staan:

- dat er voor het afrekenen een betaaldienstverlener wordt ingeschakeld, met
  naam: Mollie B.V.;
- welke gegevens daarheen gaan en dat ze daar blijven;
- dat de betaalgeschiedenis zeven jaar bewaard wordt voor de belastingdienst;
- hoe je opzegt, en wat er daarna met de gegevens gebeurt (zie 8.8);
- dat er geen proefperiode is en dat er bij tussentijds opzeggen geen geld
  terugkomt — dat hoort in de voorwaarden, niet in de privacyverklaring, maar
  het komt uit dezelfde tekstronde.

---

### 8.8 Opzeggen, en het recht op je eigen gegevens

Bij de betaalmuur hoort een besluit dat rechtstreeks aan dit document raakt:
**wat gebeurt er met de gegevens van een club die stopt met betalen?**

Het besluit van 18 september 2026 is: nadat een abonnement is verlopen mag de
club nog **zestig dagen in totaal** (de bestaande veertien dagen respijt plus
zesenveertig dagen coulance) gewoon doorwerken en opslaan. Daarna stopt het
*schrijven* naar de server. **Lezen, exporteren en verwijderen blijven
werken — voor altijd.**

Dat laatste is voor deze inventaris het punt dat telt. Een club die stopt met
betalen raakt zijn gegevens niet kwijt en komt er ook niet buiten te staan; hij
kan ze blijven inzien en er een volledige export van maken. Dat is precies wat
je bij een verzoek van een ouder nodig hebt, en het voorkomt de situatie waarin
gegevens van vijftien minderjarigen onbereikbaar op een server achterblijven bij
een club die er niet meer bij kan.

**Wat dit niet oplost:** punt 5 blijft onverminderd staan. Er is nog steeds geen
manier om de gegevens van één vertrokken speler echt weg te krijgen, en nog
steeds geen manier voor een club om zichzelf op te heffen. De betaalmuur maakt
dat urgenter, niet minder urgent: met betalende klanten komt de vraag "wij
stoppen, wis alles" gegarandeerd een keer.

---

### 8.9 Nieuwe openstaande vragen

Genummerd verder op de lijst in punt 6.

**Voor jezelf, bij de Mollie-aanvraag (samen een half uur):**
16. Heeft Mollie een verwerkersovereenkomst die automatisch bij de voorwaarden
    hoort, zoals Supabase, of moet daar iets voor getekend worden? Download hem
    en berg hem op met een datum.
17. Staat er een subverwerkerslijst bij Mollie? Die heb je nodig voor hetzelfde
    register als waar de lijst van Supabase in komt.
18. In welk land staan de servers van Mollie, en gaan er gegevens buiten de EU?

**Voor de jurist of de boekhouder:**
19. Is Mollie hier verwerker, verwerkingsverantwoordelijke, of allebei voor
    verschillende delen? (Vraag dit in hetzelfde gesprek als vraag 7 — het
    antwoord op de een helpt bij het begrijpen van de ander.)
20. Mogen de laatste vier cijfers van een IBAN in de eigen database worden
    bewaard om in de app te tonen welke rekening gemachtigd is, of is het beter
    dat gegeven bij Mollie te laten staan en op te halen wanneer nodig?
21. Is zeven jaar de juiste bewaartermijn voor `public.betalingen`, en mag die
    tabel dan inderdaad blijven staan als een club vraagt om verwijdering van
    al haar gegevens? (Dit is de klassieke botsing tussen de fiscale
    bewaarplicht en het recht op vergetelheid; het antwoord is doorgaans dat de
    financiële administratie voorgaat, maar dat moet iemand bevestigen die daar
    verstand van heeft.)

---

*Dit document is een inventarisatie op basis van de code en de back-upbestanden
van 10 september 2026. Het is geen juridisch advies en geen volledige
risicoanalyse. Elke conclusie over wat er moet gebeuren, hoort van een jurist te
komen.*
