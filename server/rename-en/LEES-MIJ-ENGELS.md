# De database naar het Engels

**Klaar om te draaien. Nog niet gedraaid — niet op productie, niet op staging.**
Getest op een kopie van je schema: heen én terug, met behoud van alle rijen.

---

## Wat er verandert, en wat niet

| | |
|---|---|
| **Wel** | tabelnamen, kolomnamen, functienamen en hun parameters, indexen, triggers, policynamen |
| **Niet** | één enkele rij. `role` blijft `eigenaar/trainer/kijker`, `plan` blijft `free/basic/pro/max`, en de sleutels in `team_data` blijven `2026-2027::fch_trainingen_v1` |

Dat laatste was jouw keuze en het is de juiste. Waardes omzetten raakt elke rij én
elke localStorage-sleutel op elk apparaat — precies het soort operatie waar de
seizoenbug uit voortkwam.

### De namen

| Nu | Straks |
|---|---|
| `leden` | `members` |
| `gegevens` | `team_data` |
| `persoonlijk` | `user_data` |
| `abonnementen` | `subscriptions` |
| `beheerders` | `admins` |
| `clubs`, `teams` | ongewijzigd — heten al Engels |

| Nu | Straks |
|---|---|
| `naam` | `name` |
| `gebruiker_id` | `user_id` |
| `rol` | `role` |
| `sleutel` | `key` |
| `waarde` | `value` |
| `gemaakt_op` | `created_at` |
| `bijgewerkt_op` | `updated_at` |
| `verwijderd_op` | `deleted_at` |
| `apparaat` | `device` |
| `pakket` | `plan` |
| `geldig_tot` | `valid_until` |
| `notitie` | `note` |

| Nu | Straks |
|---|---|
| `zet_bijgewerkt()` | `set_updated_at()` |
| `mijn_clubs()` | `my_clubs()` |
| `mag_schrijven(doel)` | `can_write(target)` |
| `nieuwe_club(club_naam, mijn_naam)` | `create_club(club_name, my_name)` |
| `is_beheerder()` | `is_admin()` |
| `alle_gebruikers()` | `all_users()` |
| `zet_pakket(doel, nieuw, tot)` | `set_plan(target, new_plan, until)` |
| `verwijder_account(doel)` | `delete_account(target)` |

---

## Wat ik heb nagemeten, want het bepaalt de vorm van de migratie

Ik heb dit niet beredeneerd maar gedraaid, op een kopie van je schema.

**1. Policies gaan vanzelf mee.** Postgres bewaart een policy als een ontlede boom,
niet als tekst. Na `alter table gegevens rename to team_data` staat er in
`pg_policies` vanzelf `team_data.team_id`. Geen enkele policy hoeft opnieuw
geschreven te worden.

**2. Functiebodies gaan níét mee.** Die staan wel als tekst opgeslagen. Na het
hernoemen zegt `mijn_clubs()` nog steeds `select club_id from public.leden` — een
tabel die dan niet meer bestaat.

Dat is geen schoonheidsfoutje maar totale uitval: élke leespolicy roept
`my_clubs()` aan. Breekt die functie, dan ziet niemand nog iets. **Daarom staat de
hele migratie in één transactie.** Halverwege stoppen bestaat niet.

**3. Eén functie kon niet zomaar mee.** `mag_schrijven(doel uuid)` wordt door zes
policies gebruikt. `CREATE OR REPLACE` weigert een parameternaam te wijzigen
(`cannot change name of input parameter`), en `DROP` kan niet zolang die policies
eraan hangen. Oplossing: `can_write(target)` ernaast zetten, de zes policies opnieuw
aanleggen zodat ze de nieuwe aanroepen, en de oude daarna pas opruimen. Dat staat zo
in het script.

---

## De bestanden

| Bestand | Wat |
|---|---|
| `E1-rename-to-english.sql` | De migratie. Eén transactie. Raakt geen enkele rij. |
| `E9-rollback-to-dutch.sql` | Volledig terug. Ook één transactie, ook geen rijen. |

### Wat de test opleverde

Op een kopie van je schema, met een club, twee leden, een team en teamdata:

| | |
|---|---|
| E1 draaien | geslaagd, 7 tabellen Engels, rijaantallen gelijk |
| eigenaar leest clubs, teamdata, abonnement | werkt |
| eigenaar schrijft teamdata (`can_write` via policy) | werkt |
| `updated_at`-trigger vult zichzelf | werkt |
| nieuwe gebruiker richt club op (`create_club`) | werkt |
| beheerder draait `all_users()` en `set_plan()` | werkt |
| kijker mag níét schrijven | geweigerd |
| kijker mag níét `set_plan` | geweigerd |
| anonieme bezoeker ziet geen clubs | leeg |
| functies die nog een oude tabel bevragen | 0 |
| E9 draaien | geslaagd, alles terug in het Nederlands, rijen intact |

---

## De app moet gelijktijdig mee

Dit is het enige echt lastige aan de hele operatie: **de database en de app moeten in
hetzelfde venster om.** Een app die `/rest/v1/gegevens` opvraagt terwijl de tabel
`team_data` heet, krijgt een 404 en synchroniseert niets meer.

Het goede nieuws is dat het klein is. `index.html` telt 33.780 regels, maar het
raakvlak met de database is negentien plekken:

| Regel | Wat er staat | Wat het wordt |
|---|---|---|
| 3927, 4401 | `/rest/v1/leden` | `/rest/v1/members` |
| 3948, 4418 | `rpc/nieuwe_club` | `rpc/create_club` |
| 3949, 4420 | `lichaam:{club_naam:…, mijn_naam:…}` | `{club_name:…, my_name:…}` |
| 3954, 4435, 4448 | `/rest/v1/clubs` | ongewijzigd, maar veld `naam` → `name` |
| 4540 | `/rest/v1/beheerders` | `/rest/v1/admins` |
| 4549 | `rpc/alle_gebruikers` | `rpc/all_users` |
| 4560, 4562 | `rpc/zet_pakket`, `{doel, nieuw, tot}` | `rpc/set_plan`, `{target, new_plan, until}` |
| 4567, 4568 | `rpc/verwijder_account`, `{doel}` | `rpc/delete_account`, `{target}` |
| 4606, 4608 | `/rest/v1/teams`, `{verwijderd_op:…}` | `{deleted_at:…}` |
| 4614, 4775 | `/rest/v1/gegevens` | `/rest/v1/team_data` |
| 4672, 4691 | `/rest/v1/teams` + `select=…` | veldnamen in de select |
| 4798 | `syncEen("gegevens", {team_id:…})` | `syncEen("team_data", …)` |
| 4807, 4815 | `/rest/v1/persoonlijk`, `{gebruiker_id:…}` | `/rest/v1/user_data`, `{user_id:…}` |
| 4824 | `/rest/v1/abonnementen?select=pakket,…` | `/rest/v1/subscriptions?select=plan,…` |

Let op wat hier **niet** in staat. De app gebruikt intern honderden keren `naam`,
`sleutel`, `waarde`, `rol` en `pakket` — 854 keer alleen al `naam`. Dat is de eigen
woordenschat van de app voor zijn eigen objecten en die hoeft niet mee. Alleen waar
de app tegen PostgREST praat, moeten de namen kloppen.

---

## Volgorde — en waarom die deze keer echt uitmaakt

`seizoenfix` en deze hernoeming raken **dezelfde functie**: `syncTeamGegevens()`.
De seizoenfix verandert er de sleutelfiltering in, de hernoeming de tabelnaam. Doe je
ze in de verkeerde volgorde of los van elkaar, dan krijg je een conflict in precies
die regels.

Mijn voorstel:

```
1  seizoenfix afronden     — staat klaar en getest, wacht op jouw akkoord
2  fase A                  — de policywijzigingen, ook klaar
3  E1 + de app-aanpassing  — in één uitrolvenster
4  fase C en verder        — bouwt dan meteen in het Engels verder
```

Waarom fase A vóór E1: fase A voegt `ben_eigenaar()` en `is_laatste_eigenaar()` toe.
Die krijgen dan meteen hun Engelse naam (`is_club_owner()`, `is_last_owner()`) in
plaats van dat ze een dag later alsnog om moeten.

---

## Het uitrolvenster

Omdat database en app samen om moeten, is dit de enige stap in het hele traject met
een echt moment van downtime. Bij vier clubs en één actieve gebruiker is dat een paar
minuten op een rustig moment.

1. Back-up maken (Table Editor → Export, alle zeven tabellen)
2. `E1-rename-to-english.sql` draaien
3. De controlequery's onderaan E1 nalopen — vooral controle 2 en 3 moeten leeg zijn
4. De nieuwe `index.html` naar Netlify slepen, met `VERSIE` in `sw.js` verhoogd
5. Inloggen, synchroniseren, en kijken of je teams en spelers er nog staan
6. Gaat er iets mis: `E9-rollback-to-dutch.sql` **en** de oude `index.html` terug
   (`git checkout productie-v34-checkpoint -- online/`). Allebei, anders praat de
   app tegen de verkeerde namen.

---

## STOP

Ik heb niets uitgevoerd. Geen SQL op productie, geen SQL op staging, geen
app-wijziging, niets gedeployed. Alleen op een wegwerpdatabase in deze sessie.

Wat ik van je nodig heb:

1. **Akkoord op de naamgeving** hierboven — vooral `team_data` en `user_data`.
   Alternatieven zijn `data`/`personal_data` of `entries`/`user_entries`; ik vind
   `team_data`/`user_data` het duidelijkst omdat het precies zegt wiens data het is.
2. **Akkoord op de volgorde**: seizoenfix → fase A → E1. Of wil je E1 eerst?
3. Zodra dat staat maak ik de app-aanpassing en laat ik je de diff zien, net als bij
   de seizoenfix.
