-- ══════════════════════════════════════════════════════════════
--  S4 — IS STAGING ECHT GELIJK AAN PRODUCTIE?
--  ─────────────────────────────────────────────────────────────
--  Deze vier query's zijn READ-ONLY en veranderen niets. Draai ze in
--  BEIDE projecten en leg de uitkomsten naast elkaar.
--
--  Dit is het belangrijkste bestand van de hele stagingopzet. Een
--  staging die niet gelijk is aan productie is erger dan geen
--  staging: hij geeft je vertrouwen dat nergens op slaat.
--
--  Query 1 t/m 3 horen REGEL VOOR REGEL identiek te zijn.
--  Query 4 verschilt met opzet — daar staan de aantallen, en die
--  horen gelijk te zijn in getal maar niet in inhoud.
-- ══════════════════════════════════════════════════════════════


-- ── 1. RLS staat aan, en er zijn policies ────────────────────
--  Dit is 02-controle.sql, uitgebreid. Elke regel moet
--  beveiliging_aan = true hebben.
select
  c.relname                as tabel,
  c.relrowsecurity         as beveiliging_aan,
  count(p.polname)         as aantal_regels
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('clubs','leden','teams','gegevens','persoonlijk','abonnementen','beheerders')
group by c.relname, c.relrowsecurity
order by c.relname;


-- ── 2. De policies zelf, woord voor woord ────────────────────
--  Dit is de scherpste controle die er is. Wijkt hier één teken af,
--  dan test je in staging iets anders dan er in productie gebeurt.
select
  tablename   as tabel,
  policyname  as regel,
  cmd         as soort,
  coalesce(qual, '-')       as using_voorwaarde,
  coalesce(with_check, '-') as with_check_voorwaarde
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

--  Verwacht in beide omgevingen, vóór fase A:
--    clubs        SELECT clubs_lezen, clubs_beheer
--    clubs        INSERT clubs_maken        with_check = true      <- het gat (S3)
--    clubs        UPDATE clubs_wijzigen
--    leden        SELECT leden_lezen, leden_beheer
--    leden        INSERT leden_toevoegen    <- het gat (S1 en S10)
--    leden        DELETE leden_weghalen     <- tweede helft van S10
--    teams        SELECT/INSERT/UPDATE
--    gegevens     SELECT/INSERT/UPDATE/DELETE
--    persoonlijk  ALL
--    abonnementen SELECT (en NIETS anders — geen insert, geen update)
--    beheerders   SELECT (en NIETS anders)


-- ── 3. Tabelrechten ──────────────────────────────────────────
--  Wat mag anon en authenticated, los van RLS? Postgres kijkt hier
--  eerst naar. Staat hier niets, dan komt een verzoek nooit tot aan
--  de policy — en lijkt een gat dicht dat het niet is.
select
  table_name as tabel,
  grantee    as rol,
  string_agg(privilege_type, ', ' order by privilege_type) as rechten
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated')
  and table_name in ('clubs','leden','teams','gegevens','persoonlijk','abonnementen','beheerders')
group by table_name, grantee
order by table_name, grantee;


-- ── 4. Functies en triggers ──────────────────────────────────
select p.proname                                   as functie,
       case when p.prosecdef then 'security definer' else 'security invoker' end as soort
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('zet_bijgewerkt','mijn_clubs','mag_schrijven','nieuwe_club',
                    'is_beheerder','alle_gebruikers','zet_pakket','verwijder_account')
order by p.proname;

--  Verwacht acht functies. mijn_clubs, mag_schrijven, nieuwe_club,
--  is_beheerder, alle_gebruikers, zet_pakket en verwijder_account
--  horen ALLEMAAL 'security definer' te zijn. Staat er ergens
--  'security invoker', dan werkt de beveiliging niet zoals bedoeld.

select t.tgname as trigger, c.relname as op_tabel
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
order by c.relname, t.tgname;

--  Verwacht drie: gegevens_bijgewerkt, persoonlijk_bijgewerkt,
--  teams_bijgewerkt.


-- ── 5. Aantallen ─────────────────────────────────────────────
select 'clubs'     as tabel, count(*) as aantal from public.clubs
union all select 'leden',       count(*) from public.leden
union all select 'teams',       count(*) from public.teams
union all select 'gegevens',    count(*) from public.gegevens
union all select 'persoonlijk', count(*) from public.persoonlijk
union all select 'abonnementen',count(*) from public.abonnementen
union all select 'beheerders',  count(*) from public.beheerders
order by tabel;

--  Verwacht in staging na S3: clubs 4, leden 4, teams 3,
--  gegevens 42, abonnementen 4, beheerders 1, persoonlijk 0.
--
--  Productie heeft dezelfde eerste vier getallen. persoonlijk en
--  beheerders mogen afwijken; die doen voor fase A niet mee.
