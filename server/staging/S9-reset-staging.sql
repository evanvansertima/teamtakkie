-- ══════════════════════════════════════════════════════════════
--  S9 — STAGING LEEGGOOIEN EN OPNIEUW BEGINNEN
--  ─────────────────────────────────────────────────────────────
--  ⚠️  DIT GOOIT GEGEVENS WEG. ALLEEN VOOR STAGING.
--
--  Gebruik dit als een seed half is gelukt, of als je na een
--  fase A-test met een schone lei wilt beginnen.
--
--  De eerste regel is de rem: dit script weigert te draaien in een
--  project waar S0-marker.sql niet is gedraaid. Dat is je bescherming
--  tegen het verkeerde tabblad. Hij is niet onfeilbaar — hij werkt
--  alleen zolang je S0 nooit op productie draait.
--
--  CONTROLEER VOOR DE ZEKERHEID HANDMATIG:
--  kijk linksboven in Supabase of er TEAMTAKKIE-staging staat.
--  Doe dat elke keer. Het kost een seconde.
-- ══════════════════════════════════════════════════════════════

select public._eis_staging();   -- rem: weigert buiten staging

-- Volgorde volgt de sleutelverbanden. clubs staat achteraan omdat
-- teams, leden en abonnementen er met on delete cascade aan hangen —
-- die tweede keer weghalen is dus overbodig, maar expliciet is hier
-- beter dan slim.
delete from public.gegevens     where team_id like 'st-team-%';
delete from public.teams        where id      like 'st-team-%';
delete from public.abonnementen where club_id in (select id from public.clubs);
delete from public.leden        where club_id in (select id from public.clubs);
delete from public.clubs;

-- beheerders blijft staan: dat is je eigen toegang tot De achterkant
-- en die wil je niet elke keer opnieuw instellen. Wil je hem toch
-- leeg, haal dan het commentaar van de volgende regel:
-- delete from public.beheerders;

-- persoonlijk hangt aan auth.users en niet aan een club; die blijft
-- dus ook staan tenzij je hem expliciet weghaalt:
-- delete from public.persoonlijk;

-- ── Controle ─────────────────────────────────────────────────
select 'clubs'     as tabel, count(*) as aantal from public.clubs
union all select 'leden',        count(*) from public.leden
union all select 'teams',        count(*) from public.teams
union all select 'gegevens',     count(*) from public.gegevens
union all select 'abonnementen', count(*) from public.abonnementen
union all select 'beheerders',   count(*) from public.beheerders
order by tabel;

--  Verwacht: alles 0, behalve beheerders (1).
--  Daarna kun je S3 opnieuw draaien.

-- ══════════════════════════════════════════════════════════════
--  HELEMAAL OPNIEUW?
--  Wil je ook het schema weg en van nul af aan beginnen, dan is het
--  eenvoudiger en veiliger om in Supabase het hele stagingproject te
--  verwijderen en een nieuw aan te maken. Tabellen los droppen laat
--  makkelijk resten achter (functies, triggers, grants) die je later
--  niet meer terugvindt — en dan is staging stiekem tóch niet meer
--  gelijk aan productie.
-- ══════════════════════════════════════════════════════════════
