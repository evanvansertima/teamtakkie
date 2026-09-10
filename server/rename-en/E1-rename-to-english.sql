-- ══════════════════════════════════════════════════════════════
--  E1 — DE DATABASE NAAR HET ENGELS
--  ─────────────────────────────────────────────────────────────
--  EERST OP STAGING. Pas op productie na jouw expliciete akkoord.
--
--  WAT DIT WEL DOET: tabellen, kolommen, functies, indexen,
--  triggers en policies krijgen Engelse namen.
--
--  WAT DIT NIET DOET: geen enkele rij verandert. Geen waarde wordt
--  omgezet. `rol` blijft eigenaar/trainer/kijker, `pakket` blijft
--  free/basic/pro/max, en de sleutels in team_data blijven
--  2026-2027::fch_trainingen_v1. Dat was jouw keuze en het is de
--  juiste: waarden omzetten raakt elke rij én elk apparaat.
--
--  ──────────────────────────────────────────────────────────────
--  TWEE DINGEN DIE IK HEB NAGEMETEN, WANT ZE BEPALEN DE VOLGORDE
--
--  1. POLICIES GAAN VANZELF MEE. Postgres bewaart een policy als
--     een ontlede boom, niet als tekst. Na
--         alter table gegevens rename to team_data;
--     staat er in pg_policies vanzelf `team_data.team_id`. Je hoeft
--     geen enkele policy opnieuw te schrijven. Nagemeten op een
--     kopie van dit schema.
--
--  2. FUNCTIEBODIES GAAN NIET MEE. Die staan wél als tekst
--     opgeslagen. Na het hernoemen zegt mijn_clubs() nog steeds
--         select club_id from public.leden ...
--     en die tabel bestaat dan niet meer.
--
--     Dat is niet een klein foutje maar een totale uitval: elke
--     leespolicy gebruikt mijn_clubs(). Zodra die functie breekt,
--     kan niemand meer iets zien. Daarom staat alles hieronder in
--     ÉÉN transactie — halverwege stoppen bestaat niet.
--
--     ALTER FUNCTION ... RENAME behoudt het OID, en policies
--     verwijzen naar het OID. De policies blijven dus wijzen naar
--     dezelfde functie, ook onder zijn nieuwe naam. Daarna maakt
--     CREATE OR REPLACE de body kloppend.
--  ══════════════════════════════════════════════════════════════

begin;

-- ── 1. Tabellen ──────────────────────────────────────────────
--  clubs en teams heten al Engels en blijven zoals ze zijn.
alter table public.leden        rename to members;
alter table public.gegevens     rename to team_data;
alter table public.persoonlijk  rename to user_data;
alter table public.abonnementen rename to subscriptions;
alter table public.beheerders   rename to admins;

-- ── 2. Kolommen ──────────────────────────────────────────────
alter table public.clubs        rename column naam           to name;
alter table public.clubs        rename column gemaakt_op     to created_at;

alter table public.members      rename column gebruiker_id   to user_id;
alter table public.members      rename column naam           to name;
alter table public.members      rename column rol            to role;
alter table public.members      rename column gemaakt_op     to created_at;

alter table public.teams        rename column naam           to name;
alter table public.teams        rename column gemaakt_op     to created_at;
alter table public.teams        rename column bijgewerkt_op  to updated_at;
alter table public.teams        rename column verwijderd_op  to deleted_at;

alter table public.team_data    rename column sleutel        to key;
alter table public.team_data    rename column waarde         to value;
alter table public.team_data    rename column bijgewerkt_op  to updated_at;
alter table public.team_data    rename column apparaat       to device;

alter table public.user_data    rename column gebruiker_id   to user_id;
alter table public.user_data    rename column sleutel        to key;
alter table public.user_data    rename column waarde         to value;
alter table public.user_data    rename column bijgewerkt_op  to updated_at;
alter table public.user_data    rename column apparaat       to device;

alter table public.subscriptions rename column pakket        to plan;
alter table public.subscriptions rename column geldig_tot    to valid_until;
alter table public.subscriptions rename column notitie       to note;

alter table public.admins       rename column gebruiker_id   to user_id;
alter table public.admins       rename column notitie        to note;
alter table public.admins       rename column gemaakt_op     to created_at;

-- ── 3. Indexen ───────────────────────────────────────────────
alter index if exists public.leden_gebruiker rename to members_user;
-- teams_club heet al goed.

-- ── 4. Functies: eerst de naam (OID blijft, policies blijven
--       wijzen), dan de body kloppend maken ────────────────────
--  Drie soorten, en het verschil is belangrijk.
--
--  (a) Zonder parameters, gebruikt door policies of triggers.
--      ALTER ... RENAME behoudt het OID, dus policies en triggers
--      blijven vanzelf naar dezelfde functie wijzen. Daarna maakt
--      CREATE OR REPLACE de body kloppend.
alter function public.zet_bijgewerkt() rename to set_updated_at;
alter function public.mijn_clubs()     rename to my_clubs;
alter function public.is_beheerder()   rename to is_admin;

--  (b) MET parameters en gebruikt door policies: mag_schrijven(doel).
--      Hier loopt het vast. CREATE OR REPLACE weigert een
--      parameternaam te wijzigen ("cannot change name of input
--      parameter"), en DROP kan niet zolang er policies aan hangen.
--      Daarom: nieuwe functie ernaast zetten, de zes policies die
--      hem gebruiken opnieuw aanleggen (sectie 6), en de oude pas
--      dáárna weghalen (sectie 8).

--  (c) Alleen door de app aangeroepen, niet door policies. Die mogen
--      weg en opnieuw. Hun parameternamen staan in de JSON die de
--      app verstuurt, dus die moeten wél Engels worden.
drop function if exists public.nieuwe_club(text, text);
drop function if exists public.zet_pakket(uuid, text, date);
drop function if exists public.verwijder_account(uuid);
drop function if exists public.alle_gebruikers();

--  De triggerfunctie. Zonder deze aanpassing schrijft hij naar een
--  kolom die niet meer bestaat en faalt élke insert en update op
--  team_data, user_data en teams.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.my_clubs()
returns setof uuid language sql stable security definer set search_path = public as $$
  select club_id from public.members where user_id = auth.uid()
$$;

--  De nieuwe versie van mag_schrijven. Staat even naast de oude;
--  sectie 6 laat de policies naar deze wijzen, sectie 8 ruimt de oude op.
create or replace function public.can_write(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid()
      and club_id = target
      and role in ('eigenaar', 'trainer')
  )
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

create or replace function public.create_club(club_name text, my_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare fresh uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;
  insert into public.clubs (name) values (coalesce(nullif(trim(club_name), ''), 'Mijn club'))
    returning id into fresh;
  insert into public.members (club_id, user_id, name, role)
    values (fresh, auth.uid(), my_name, 'eigenaar');
  insert into public.subscriptions (club_id, plan) values (fresh, 'free');
  return fresh;
end $$;

create or replace function public.all_users()
returns table (
  user_id       uuid,
  email         text,
  created_at    timestamptz,
  last_seen     timestamptz,
  confirmed     boolean,
  club_id       uuid,
  club_name     text,
  role          text,
  plan          text,
  valid_until   date,
  teams         bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Alleen voor beheerders';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
           (u.email_confirmed_at is not null),
           m.club_id, c.name, m.role, s.plan, s.valid_until,
           (select count(*) from public.teams t
             where t.club_id = m.club_id and t.deleted_at is null)
    from auth.users u
    left join public.members       m on m.user_id = u.id
    left join public.clubs         c on c.id = m.club_id
    left join public.subscriptions s on s.club_id = m.club_id
    order by u.created_at desc;
end $$;

create or replace function public.set_plan(target uuid, new_plan text, until date default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Alleen voor beheerders';
  end if;
  if new_plan not in ('free','basic','pro','max') then
    raise exception 'Onbekend pakket: %', new_plan;
  end if;
  insert into public.subscriptions (club_id, plan, valid_until)
    values (target, new_plan, until)
  on conflict (club_id) do update
    set plan = excluded.plan, valid_until = excluded.valid_until;
end $$;

create or replace function public.delete_account(target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare his_clubs uuid[];
begin
  if not public.is_admin() then
    raise exception 'Alleen voor beheerders';
  end if;
  if target = auth.uid() then
    raise exception 'Je kunt je eigen account hier niet verwijderen';
  end if;

  select array_agg(m.club_id) into his_clubs
  from public.members m
  where m.user_id = target
    and not exists (select 1 from public.members o
                    where o.club_id = m.club_id and o.user_id <> target);

  delete from public.members where user_id = target;
  if his_clubs is not null then
    delete from public.clubs where id = any(his_clubs);
  end if;
  delete from auth.users where id = target;
end $$;

grant execute on function public.can_write(uuid)                to authenticated;
grant execute on function public.my_clubs()                      to authenticated;
grant execute on function public.create_club(text, text)        to authenticated;
grant execute on function public.is_admin()                     to authenticated;
grant execute on function public.all_users()                    to authenticated;
grant execute on function public.set_plan(uuid, text, date)     to authenticated;
grant execute on function public.delete_account(uuid)           to authenticated;

-- ── 5. Triggers ──────────────────────────────────────────────
alter trigger gegevens_bijgewerkt    on public.team_data rename to team_data_updated;
alter trigger persoonlijk_bijgewerkt on public.user_data rename to user_data_updated;
alter trigger teams_bijgewerkt       on public.teams     rename to teams_updated;

-- ── 6. Policies ──────────────────────────────────────────────
--  Alleen de namen. De voorwaarden erin zijn al door Postgres
--  bijgewerkt toen de tabellen en kolommen werden hernoemd.
alter policy clubs_lezen        on public.clubs         rename to clubs_select;
alter policy clubs_maken        on public.clubs         rename to clubs_insert;
--  clubs_wijzigen, teams_schrijven, teams_wijzigen en de drie op
--  team_data gebruiken mag_schrijven(). Die kunnen niet hernoemd
--  worden maar moeten opnieuw, zodat ze can_write() aanroepen.
drop policy if exists clubs_wijzigen on public.clubs;
create policy clubs_update on public.clubs for update
  using (public.can_write(id));

drop policy if exists teams_schrijven on public.teams;
create policy teams_insert on public.teams for insert
  with check (public.can_write(club_id));

drop policy if exists teams_wijzigen on public.teams;
create policy teams_update on public.teams for update
  using (public.can_write(club_id));

drop policy if exists gegevens_schrijven on public.team_data;
create policy team_data_insert on public.team_data for insert
  with check (exists (select 1 from public.teams t
                      where t.id = team_data.team_id
                        and public.can_write(t.club_id)));

drop policy if exists gegevens_wijzigen on public.team_data;
create policy team_data_update on public.team_data for update
  using (exists (select 1 from public.teams t
                 where t.id = team_data.team_id
                   and public.can_write(t.club_id)));

drop policy if exists gegevens_weghalen on public.team_data;
create policy team_data_delete on public.team_data for delete
  using (exists (select 1 from public.teams t
                 where t.id = team_data.team_id
                   and public.can_write(t.club_id)));

alter policy clubs_beheer       on public.clubs         rename to clubs_admin_select;

alter policy leden_lezen        on public.members       rename to members_select;
alter policy leden_toevoegen    on public.members       rename to members_insert;
alter policy leden_weghalen     on public.members       rename to members_delete;
alter policy leden_beheer       on public.members       rename to members_admin_select;

alter policy teams_lezen        on public.teams         rename to teams_select;
alter policy teams_beheer       on public.teams         rename to teams_admin_select;

alter policy gegevens_lezen     on public.team_data     rename to team_data_select;

alter policy persoonlijk_alles  on public.user_data     rename to user_data_all;

alter policy abonnementen_lezen on public.subscriptions rename to subscriptions_select;
alter policy abonnementen_beheer on public.subscriptions rename to subscriptions_admin_select;

alter policy beheerders_lezen   on public.admins        rename to admins_select;

-- ── 7. De oude mag_schrijven opruimen ────────────────────────
--  Kan nu pas: er hangt geen enkele policy meer aan.
drop function if exists public.mag_schrijven(uuid);

-- ── 8. PostgREST zijn schema opnieuw laten inlezen ───────────
notify pgrst, 'reload schema';

commit;

-- ══════════════════════════════════════════════════════════════
--  CONTROLE — draai dit ná de commit
-- ══════════════════════════════════════════════════════════════

-- 1. Staan de zeven tabellen er onder hun nieuwe naam, met evenveel rijen?
select 'clubs' as tabel, count(*) from public.clubs
union all select 'members',       count(*) from public.members
union all select 'teams',         count(*) from public.teams
union all select 'team_data',     count(*) from public.team_data
union all select 'user_data',     count(*) from public.user_data
union all select 'subscriptions', count(*) from public.subscriptions
union all select 'admins',        count(*) from public.admins
order by 1;
-- Verwacht: clubs 4, members 4, teams 3, team_data 42, user_data 13,
--           subscriptions 4, admins 1 — precies als vóór de migratie.

-- 2. Bevraagt er nog een functie een oude tabel?
--    Dit is de belangrijkste controle van allemaal. Er hoort NIETS terug
--    te komen.
--
--    Let op de vorm van de zoekopdracht: alleen na from, join, into of
--    update. Een eerdere versie zocht simpelweg naar het wóórd, en sloeg
--    toen alarm op de foutmelding 'Alleen voor beheerders' in drie
--    functies — een Nederlandse zin voor de gebruiker, geen tabelnaam.
--    Een controle die vals alarm geeft, leer je negeren.
select p.proname, 'bevraagt nog een oude tabel' as probleem
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosrc ~* '(from|join|into|update)\s+(public\.)?(leden|gegevens|persoonlijk|abonnementen|beheerders)\M';

-- 3. Gebruikt er nog een functie een oude kolomnaam?
select p.proname, 'gebruikt nog een oude kolomnaam' as probleem
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosrc ~* '\m(gebruiker_id|sleutel|waarde|bijgewerkt_op|verwijderd_op|apparaat|geldig_tot)\M'
  and p.prosrc !~* '''[^'']*\m(pakket|beheerders)\M[^'']*''';

-- 4. Zijn alle policies meegegaan?
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' order by tablename, cmd;

-- 5. Werkt de belangrijkste functie nog echt? (moet 0 of meer teruggeven,
--    geen fout)
select count(*) as clubs_van_niemand from public.my_clubs();

-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  Zie E9-rollback-to-dutch.sql. Ook dat is één transactie en raakt
--  geen enkele rij.
-- ══════════════════════════════════════════════════════════════
