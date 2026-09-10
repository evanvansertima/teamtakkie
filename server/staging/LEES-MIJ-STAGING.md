# TEAMTAKKIE-staging opzetten

**Doel:** een tweede Supabase-project dat zich exact zo gedraagt als productie, zodat
fase A daar getest kan worden zonder één rij in je echte database aan te raken.

**Duur:** ongeveer 20 minuten.
**Kosten:** € 0 — je gebruikt je tweede gratis project.
**Aan productie verandert niets.** Alles hieronder gebeurt in TEAMTAKKIE-staging,
op twee read-only query's na die uitdrukkelijk als zodanig zijn gemarkeerd.

> **Getest, niet alleen opgeschreven.** Ik heb een lege PostgreSQL 16 opgezet met
> nagebootste Supabase-rollen (`anon`, `authenticated`, `service_role`) en een
> `auth.users`-tabel, en daarop de hele reeks gedraaid: `S0` → `01-schema.sql` →
> `03-beheer.sql` → `S1` → `S2` → `S3` → `S4` → `S5` → `S9`. Uitkomst: 4 clubs,
> 4 leden, 3 teams, 42 gegevens-rijen, tweemaal draaien geeft hetzelfde resultaat,
> en de rem uit stap 1 weigert zoals bedoeld. Eén fout in mijn eigen controlequery
> kwam daarbij aan het licht en is hersteld: de twee clubs die allebei "Mijn club"
> heten werden tot één regel samengevoegd.
>
> Wat die test níét dekt: Supabase's eigen laag — PostgREST, de manier waarop het
> dashboard accounts aanmaakt, en hoe `auth.uid()` zich in een echt verzoek gedraagt.
> Daarvoor is stap 7 er.

---

## Lees dit eerst: één instelling maakt of breekt deze hele opzet

Je hebt bij het aanmaken **"Automatically expose new tables" op UIT** gezet. Dat is
op zichzelf de veiligere keuze, en Supabase doet dat bij nieuwe projecten inmiddels
standaard. Maar het maakt staging op één punt ongelijk aan productie, en net dat punt
is wat we willen testen.

Postgres controleert bij elk verzoek **eerst** of je rol überhaupt rechten heeft op
de tabel, en **pas daarna** of de RLS-policy je die rij gunt. Staat de eerste deur
dicht, dan komt de tweede nooit in beeld.

- **Productie:** `anon` en `authenticated` hebben SELECT/INSERT/UPDATE/DELETE op
  `clubs` en `leden`. Je hebt dat zelf gemeten.
- **Staging met deze schakelaar uit:** die rechten ontbreken.

Zou je zo testen, dan krijg je bij de S3-test (*"kan een anonieme bezoeker een club
aanmaken?"*) netjes `permission denied for table clubs` terug, en zou je concluderen
dat het gat dicht zit. Terwijl er in productie helemaal niets veranderd is. Een groen
vinkje voor een test die nooit heeft plaatsgevonden is erger dan geen test.

`S1-grants.sql` zet die rechten daarom expliciet aan. Laat de schakelaar staan waar
hij staat — we regelen het in SQL, want dan staat het zwart op wit in git in plaats
van in een menu dat niemand meer terugvindt.

> **Onthouden voor later:** zodra we in fase F de tabel `team_leden` toevoegen, krijgt
> die in productie automatisch rechten en in staging niet. Dan moet `S1-grants.sql`
> opnieuw, met de nieuwe tabel erbij. Dit is de valkuil die staging stilletjes uit de
> pas laat lopen.

---

## Waarom er geen echte gegevens naar staging gaan

In je productiedatabase staan namen en geboortedata van minderjarigen. Die
kopiëren naar een tweede project betekent een tweede sleutel, een tweede back-up en
een tweede plek waar het mis kan gaan — voor gegevens die je bij het testen van een
policy helemaal niet nodig hebt.

Een RLS-policy kijkt nooit in een jsonb-blob. Hij kijkt naar wie je bent, bij welke
club je hoort en welke rol je hebt. Dus dát bootsen we na, tot op de rij nauwkeurig:
4 clubs, 4 leden, 3 teams, 42 gegevens-rijen, `free`×3 en `max`×1. De inhoud van de
blobs is leeg, en dat verandert niets aan wat we meten.

---

## De volgorde

Je hebt zeven stappen. Doe ze op volgorde; elke stap gaat ervan uit dat de vorige is
gelukt.

| Stap | Wat | Waar |
|---|---|---|
| 1 | `S0-marker.sql` | SQL Editor, staging |
| 2 | `server/01-schema.sql` | SQL Editor, staging |
| 3 | `server/03-beheer.sql` | SQL Editor, staging |
| 4 | `S1-grants.sql` | SQL Editor, staging |
| 5 | Vier testaccounts aanmaken | Authentication, staging |
| 6 | `S2-beheerder-staging.sql` en `S3-seed-basis.sql` | SQL Editor, staging |
| 7 | `S4-controle.sql` in **beide** projecten en vergelijken | SQL Editor, beide |

---

### Stap 1 — De rem installeren

Open in staging de **SQL Editor** → **New query**, plak `S0-marker.sql`, klik **Run**.

Dit maakt één tabel, `_staging_merk`, die verder niets doet dan bewijzen dat je in
staging zit. Elk script hierna dat gegevens weggooit begint met een controle op die
tabel en weigert zonder.

De SQL Editor ziet er in elk project identiek uit. Eén keer het verkeerde tabblad
voor is genoeg, en dan is er geen ongedaan maken. Dit is de goedkoopste verzekering
die er is.

> **Draai `S0-marker.sql` nooit op productie.** Doe je het per ongeluk toch, dan is
> er niets stuk — er staat dan een tabel te veel — maar je bent je rem kwijt.
> Verwijder hem dan meteen met `drop table public._staging_merk;`.

**Controle:** je ziet één regel met `staging` en `rem staat aan`.

---

### Stap 2 — Het schema

Open `server/01-schema.sql` uit je repo — **ongewijzigd**, precies zoals hij onder tag
`productie-v34-checkpoint` staat. Selecteer alles, plak in een nieuwe query, **Run**.

Onderaan hoort `Success. No rows returned` te staan.

**Controle:** ga naar **Table Editor**. Je ziet nu zes tabellen — `clubs`, `leden`,
`teams`, `gegevens`, `persoonlijk`, `abonnementen` — plus `_staging_merk`. Bij elke
tabel hoort een gesloten hangslotje: RLS staat aan.

Staat er ergens **Unrestricted**, stop dan en draai `01-schema.sql` opnieuw. Ga niet
verder met een tabel die openligt, ook niet in staging.

---

### Stap 3 — Het beheerdersdeel

Open `server/03-beheer.sql` en draai hem **ook ongewijzigd**.

De laatste regels zoeken jouw productie-e-mailadres op in `auth.users` en maken die
persoon beheerder. In staging bestaat dat account niet, dus die insert vindt nul
rijen en doet niets. Dat is geen fout — en het scheelt je twee versies van hetzelfde
bestand die na een half jaar uit elkaar zijn gaan lopen. De stagingbeheerder wijzen we
in stap 6 aan.

**Controle:** de tabel `beheerders` bestaat en is leeg.

---

### Stap 4 — De rechten gelijktrekken

Draai `S1-grants.sql`. Dit is het bestand uit de waarschuwing bovenaan.

**Controle — en doe deze echt.** Onderaan `S1-grants.sql` staat een query die de
tabelrechten toont. Draai diezelfde query ook **op productie** (hij is read-only en
verandert daar niets):

```sql
select table_name as tabel, grantee as rol,
       string_agg(privilege_type, ', ' order by privilege_type) as rechten
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated')
  and table_name in ('clubs','leden','teams','gegevens','persoonlijk','abonnementen','beheerders')
group by table_name, grantee
order by table_name, grantee;
```

De twee uitkomsten horen regel voor regel gelijk te zijn. Wijkt er iets af, ga dan
**niet** verder — je zou vanaf hier iets testen wat in productie anders werkt. Stuur
me het verschil, dan pas ik `S1-grants.sql` aan.

---

### Stap 5 — Vier testaccounts

**Authentication** → **Users** → **Add user** → **Create new user**.

Maak vier accounts. Vink bij elk **"Auto Confirm User"** aan, anders wacht je op een
bevestigingsmail die je niet nodig hebt.

Gebruik **niet** je productieadres — dan kun je bij het inloggen de twee omgevingen
niet meer uit elkaar houden. Plusadressering werkt en komt gewoon in je eigen mailbox:

| Rol in de seed | Voorstel voor het adres |
|---|---|
| Eigenaar fc Harlingen (tevens beheerder) | `jouwnaam+st-harlingen@…` |
| Eigenaar SV Seagulls | `jouwnaam+st-seagulls@…` |
| Eigenaar Mijn club (A) | `jouwnaam+st-mijnclub-a@…` |
| Eigenaar Mijn club (B) | `jouwnaam+st-mijnclub-b@…` |

Kies wachtwoorden die je zelf verzint en bewaar ze in je wachtwoordbeheerder.
**Deel ze niet in dit gesprek** — ik heb ze niet nodig en vraag er nooit om.

**Controle:** vier gebruikers in de lijst, alle vier bevestigd.

---

### Stap 6 — De seed

Twee bestanden, op volgorde. **In allebei moet je eerst de e-mailadressen invullen**
— de plekken staan gemarkeerd met `VUL-IN`.

1. **`S2-beheerder-staging.sql`** — vul het adres van je eerste account in. Dit maakt
   dat account beheerder van staging.
   *Controle:* één regel terug met dat adres. Nul regels betekent dat het account nog
   niet bestaat.

2. **`S3-seed-basis.sql`** — vul alle vier de adressen in in de tabel bovenaan.
   *Controle:* de laatste twee query's geven `clubs 4, leden 4, teams 3, gegevens 42`
   en de pakketverdeling `fc Harlingen → max`, drie clubs op `free`.

Klopt een getal niet, dan ontbreekt er vrijwel zeker een account. Het script slaat een
club zonder bijbehorend account bewust stil over: liever een getal dat niet klopt dan
een half gevulde database die er goed uitziet.

Het script mag je zo vaak draaien als je wilt; alles staat op `on conflict do nothing`.

#### Eén aanname die je kunt aanscherpen

Ik heb de teams verdeeld als **1 / 1 / 1 / 0** over de vier clubs. Dat is een gok — ik
kan je productie niet uitlezen. Wil je het exact gelijk hebben, draai dan deze
read-only query **op productie**:

```sql
select c.naam as club, t.id as team_id, t.naam as team,
       t.verwijderd_op,
       (select count(*) from public.gegevens g where g.team_id = t.id) as datarijen
from public.teams t
join public.clubs c on c.id = t.club_id
order by c.naam, t.naam;
```

Er komen alleen clubnamen, teamnamen en aantallen uit — geen spelers, geen
geboortedata, niets persoonlijks. Pas daarna de kolom `teams` in `S3-seed-basis.sql`
aan; het totaal moet 3 blijven.

Wil je ook de sleutelnamen exact gelijk hebben, dan geeft deze query ze zonder ook maar
één blob mee te sturen:

```sql
select team_id, sleutel, pg_column_size(waarde) as bytes
from public.gegevens
order by team_id, sleutel;
```

Nodig is het niet: voor een RLS-test doet de sleutelnaam niet mee.

---

### Stap 7 — Bewijzen dat staging gelijk is

Draai `S4-controle.sql` in **beide** projecten en leg de uitkomsten naast elkaar.

Dit is het belangrijkste bestand van de hele opzet. Een staging die niet gelijk is aan
productie is erger dan geen staging: hij geeft je vertrouwen dat nergens op slaat.

| Query | Moet gelijk zijn? |
|---|---|
| 1 — RLS aan, aantal policies | ja, regel voor regel |
| 2 — de policies woord voor woord | **ja, teken voor teken** |
| 3 — tabelrechten | ja, regel voor regel |
| 4 — functies en triggers | ja |
| 5 — aantallen | de eerste vier getallen gelijk; `persoonlijk` en `beheerders` mogen afwijken |

Query 2 is de scherpste. Als daar één `with_check` anders staat, test je iets anders
dan er in productie gebeurt.

Stuur me de uitkomst van query 2 en 3 uit beide projecten, dan controleer ik ze naast
elkaar voordat we fase A aanraken.

---

## Wat er níét bij deze opzet hoort

**`S5-seed-testrollen.sql` — nog niet draaien.** Dat hoort bij fase A. Na stap 6 heeft
staging vier clubs met elk één eigenaar, precies als productie — en juist daarom kun
je er twee van de drie fase A-tests niet op doen: er is geen kijker en geen trainer om
mee aan te vallen. `S5` voegt die toe, en doorbreekt daarmee bewust de gelijkheid.
Vanaf dat moment zijn het 6 leden in plaats van 4. Draai het pas als S4 groen is.

**`S9-reset-staging.sql` — alleen als het misgaat.** Gooit de seed leeg zodat je
opnieuw kunt beginnen. Begint met de rem uit stap 1.

---

## De app tegen staging draaien — pas op

Je zou de app op staging kunnen richten via *Instellingen → Account instellen*. Dat
kan nuttig zijn, maar niet zomaar:

> **Doe dit nooit in de browser waar je echte team in zit.**
>
> TEAMTAKKIE bewaart alles lokaal en synchroniseert dat bij het inloggen. Het
> samenvoegen werkt zo: veranderde er aan beide kanten iets, dan wordt alles
> samengevoegd. Log je in je gewone browser in op staging, dan kan je echte
> ploeg omhoog gaan naar staging, of kunnen lege staginglijsten zich vermengen
> met je echte seizoen.

Wil je dit toch, gebruik dan een **apart browserprofiel** of een ander apparaat waar
TEAMTAKKIE nog nooit heeft gedraaid. En maak eerst je back-ups uit fase 0.

Voor fase A is het niet nodig: die tests gaan rechtstreeks naar de API en hebben de
app niet nodig.

---

## Terugdraaien

| Wat | Hoe | Duur |
|---|---|---|
| Seed opnieuw | `S9-reset-staging.sql`, daarna `S3` | seconden |
| Helemaal opnieuw | verwijder het stagingproject in Supabase en begin bij stap 1 | ~10 min |
| Productie | **onaangeroerd** — er is niets om terug te draaien | — |

Losse tabellen droppen om overnieuw te beginnen raad ik af: dat laat makkelijk resten
achter (functies, triggers, grants) die je later niet terugvindt, en dan is staging
stiekem tóch niet meer gelijk aan productie. Een nieuw project is schoner.

---

## Wanneer je klaar bent

Je bent klaar met de stagingopzet als:

- [ ] `S4-controle.sql` query 1 t/m 4 identiek is in beide projecten
- [ ] staging 4 clubs, 4 leden, 3 teams en 42 gegevens-rijen heeft
- [ ] `fc Harlingen` in staging op `max` staat en de andere drie op `free`
- [ ] je met minstens één testaccount kunt inloggen op staging
- [ ] je fase 0-back-ups van productie klaar hebt staan

Stuur me dan de uitkomst van query 2 en 3, dan schrijf ik fase A — en pas daarna,
na jouw expliciete goedkeuring, gaat er iets naar productie.
