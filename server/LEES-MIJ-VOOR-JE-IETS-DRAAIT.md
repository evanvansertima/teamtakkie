# Waarschuwing: er staan twee oplossingen voor hetzelfde probleem in deze map

**Datum:** 12 september 2026
**Gecorrigeerd:** 15 september 2026 — zie "Correctie" hieronder
**Geldt voor:** `server/fase-a/` en `server/rename-en/`

Bij het samenvoegen van `seizoenfix` naar `main` zijn twee trajecten bij elkaar
gekomen die onafhankelijk van elkaar aan dezelfde tabellen werken. Git zag geen
conflict — alle bestanden zijn nieuw — maar **inhoudelijk spreken ze elkaar
tegen.** Draai ze niet zonder dit te lezen.

De technische beoordeling van 10 september waarschuwde hier al voor:

> *"Er liggen nu vier trajecten klaar: seizoenfix, fase A, de Engelse
> hernoeming en het professionaliseringsplan. Twee daarvan raken dezelfde
> functie. Volgorde is hier belangrijker dan snelheid."*

---

## Correctie van 15 september: dit document had het mis

De eerste versie van dit bestand zei dat de **Nederlandstalige lijn**
(`04-leden-fix.sql`, `is_eigenaar()`) op productie draaide, en dat je
`fase-a/A2-fix-leden.sql` daarom niet moest draaien.

Op 15 september is `server/11-controle-productie.sql` op de échte database
gedraaid — het bestand dat alleen kijkt en niets verandert. De uitkomst was het
omgekeerde van wat hier stond:

| Gevraagd aan de database | Antwoord |
|---|---|
| bestaat `is_eigenaar()`? | **nee** |
| bestaat `ben_eigenaar()`? | ja |
| noemen de regels op `leden` de naam `is_eigenaar`? | nee |
| bestaat `is_laatste_eigenaar()`? | ja |
| is er nog een insert-regel op `clubs`? | nee, die is dicht |
| bestaat `pakket_grenzen` (uit 06)? | nee |

**Productie draait dus de fase-a-lijn, niet de Nederlandstalige lijn.** Wat er
leeft komt uit `fase-a/A1-fix-clubs-maken.sql` en `fase-a/A2-fix-leden.sql`.

Dat verklaart meteen twee dingen die eerder niet klopten:

* `10-laatste-eigenaar.sql` leek grotendeels "in orde" zonder ooit gedraaid te
  zijn. Dat komt doordat `A2-fix-leden.sql` `is_laatste_eigenaar()` al meebrengt
  én de rem al in `leden_weghalen` zet. Het enige dat 10 daarnaast neerzet en
  A2 niet heeft, is `verlaat_club()`; of die er staat leest `11` regel voor
  regel voor — kijk daar, neem het hier niet aan.
* `clubs_maken` is dicht, maar niet door `06-pakketten.sql` — door
  `A1-fix-clubs-maken.sql`, die op dat punt precies hetzelfde doet.

**Waarom dit document het mis had:** het baseerde zich op een commit-bericht en
een notitie van 11 september, niet op een vraag aan de database. Dat is precies
de fout waar `11-controle-productie.sql` voor gemaakt is. Vertrouw vanaf nu de
uitkomst van dat bestand, niet een zin in een markdown-bestand — ook niet deze.

### Is dat erg voor de beveiliging?

Nee. `ben_eigenaar()` en `is_eigenaar()` zijn woord voor woord dezelfde functie;
alleen de naam verschilt. De ledenregels op productie zijn in orde en de
"infinite recursion" is daar echt weg.

### Wat het wél kapotmaakt

Twee latere bestanden vragen om de naam `is_eigenaar()`:

* `08-bewaartermijn.sql` — `wis_speler()` en de regel `clubs_weghalen`
* `10-laatste-eigenaar.sql` — de rem op de laatste eigenaar

Postgres laat een beveiligingsregel niet aanmaken die verwijst naar een functie
die niet bestaat. Die twee bestanden stoppen dus met een foutmelding zodra je ze
draait, en de SQL-editor van Supabase draait een geplakt blok als één geheel:
gaat er iets mis, dan wordt alles van dat bestand teruggedraaid.

**Gevolg dat je vandaag kunt merken:** een vereniging opheffen doet niets.
Er staat geen enkele delete-regel op `clubs`, dus de database gooit er nul weg
en meldt geen fout — de app krijgt een "gelukt" terug. Geen lek, geen
gegevensverlies; een knop die liegt.

### Wat je daaraan doet

1. `server/12-controle-opheffen.sql` — kijkt alleen, verandert niets. Zegt in
   gewone taal of het opheffen werkt en waarom niet.
2. `server/13-reconciliatie-is-eigenaar.sql` — zet `is_eigenaar()` erbij als
   doorgeefluik naar `ben_eigenaar()`. Raakt géén enkele beveiligingsregel aan
   en geeft niemand een nieuw recht. Bewust: aan de werkende ledenregels
   schuiven om een naamsverschil op te lossen is het risico niet waard.
3. Er is nog een tweede blokkade voor 08: het gebruikt ook
   `basis_van_sleutel()`, en die komt uit `06-pakketten.sql` — dat bestand staat
   ook niet op productie. **Of 06 gedraaid moet worden is een aparte
   beslissing**, want er zitten teamlimieten en een prijslijst in.

Getest in een wegwerp-database met de productiestaat nagebouwd:
`tests/reconciliatie-is-eigenaar.test.sh`.

---

## Wat er al op productie staat

Gemeten op 15 september met `server/11-controle-productie.sql` en
`server/12-controle-opheffen.sql`:

| Onderdeel | Staat het erop? |
|---|---|
| `01-schema.sql` (tabellen, RLS) | ja |
| `fase-a/A1-fix-clubs-maken.sql` | ja — `clubs_maken` is dicht |
| `fase-a/A2-fix-leden.sql` | ja — `ben_eigenaar()`, `is_laatste_eigenaar()` |
| `04-leden-fix.sql` (`is_eigenaar()`) | **nee** |
| `06-pakketten.sql` | **nee** |
| `08-bewaartermijn.sql` | **nee** (loopt vast op de twee ontbrekende functies) |
| `10-laatste-eigenaar.sql` | niet als bestand; het deel dat A2 al meebracht is er wel. Voor `verlaat_club()`: lees de regel in `11` |

Wil je het zelf nagaan in plaats van dit lijstje te geloven: draai
`server/11-controle-productie.sql` en `server/12-controle-opheffen.sql`. Allebei
kijken ze alleen en veranderen ze niets.

## Wat je NIET moet draaien

### `server/04-leden-fix.sql`

Lost hetzelfde op als `fase-a/A2-fix-leden.sql`, dat al op productie staat, maar
met de naam `is_eigenaar()`. Draai je hem, dan schrijft hij de twee wérkende
regels op `leden` opnieuw, en verliest `leden_weghalen` de rem op de laatste
eigenaar die er nu wél in zit. Dat is een stap achteruit.

Wil je de naam `is_eigenaar()` hebben — en dat wil je, voor 08 — gebruik dan
`13-reconciliatie-is-eigenaar.sql`. Die zet alleen de functie neer.

### `server/10-laatste-eigenaar.sql`

Schrijft `leden_weghalen` opnieuw, met `is_eigenaar()`. Die regel werkt op
productie al, via `ben_eigenaar()`, mét de rem op de laatste eigenaar. Het enige
dat 10 nog toevoegt is `verlaat_club()`, en dat kan los. Niet tussendoor
draaien.

### `server/rename-en/E1-rename-to-english.sql`

Hernoemt het hele schema naar het Engels. **Dit zou alles van 11 en 12 september
breken:** `06-pakketten.sql`, `08-bewaartermijn.sql`, beide testbestanden, en
elke verwijzing in `online/index.html`.

Of dat een goed idee is, is een aparte beslissing — maar het is géén stap die je
tussendoor doet. Bespreek het eerst.

---

## Wat de twee lijnen onafhankelijk van elkaar concludeerden

Allebei de analyses kwamen tot dezelfde conclusie: dat de tak
`gebruiker_id = auth.uid()` bij *toevoegen* weg moet, en dat de vraag "ben ik
eigenaar" via een `security definer`-functie gesteld moet worden. Dat is een
sterk teken dat die conclusie klopt — en het is de reden dat het verschil tussen
de twee lijnen uiteindelijk alleen een naam is.
