-- ══════════════════════════════════════════════════════════════
--  E9 — TERUG NAAR HET NEDERLANDS
--  ─────────────────────────────────────────────────────────────
--  Draait E1 volledig terug. Eén transactie, geen enkele rij wordt
--  aangeraakt. Duurt seconden.
--
--  Gebruik dit alleen als er ná E1 iets misgaat wat je niet
--  verwachtte. Let op: als de app al is uitgerold met de Engelse
--  namen, moet je die óók terugzetten — anders praat de app tegen
--  tabellen die weer Nederlands heten. Zie E-LEESMIJ, stap 6.
-- ══════════════════════════════════════════════════════════════

begin;

-- Policies die E1 opnieuw aanlegde, weer in hun oude vorm
drop policy if exists clubs_update      on public.clubs;
drop policy if exists teams_insert      on public.teams;
drop policy if exists teams_update      on public.teams;
drop policy if exists team_data_insert  on public.team_data;
drop policy if exists team_data_update  on public.team_data;
drop policy if exists team_data_delete  on public.team_data;

create or replace function public.mag_schrijven(doel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and club_id = doel and role in ('eigenaar','trainer')
  )
$$;

create policy clubs_wijzigen on public.clubs for update
  using (public.mag_schrijven(id));
create policy teams_schrijven on public.teams for insert
  with check (public.mag_schrijven(club_id));
create policy teams_wijzigen on public.teams for update
  using (public.mag_schrijven(club_id));
create policy gegevens_schrijven on public.team_data for insert
  with check (exists (select 1 from public.teams t
                      where t.id = team_data.team_id and public.mag_schrijven(t.club_id)));
create policy gegevens_wijzigen on public.team_data for update
  using (exists (select 1 from public.teams t
                 where t.id = team_data.team_id and public.mag_schrijven(t.club_id)));
create policy gegevens_weghalen on public.team_data for delete
  using (exists (select 1 from public.teams t
                 where t.id = team_data.team_id and public.mag_schrijven(t.club_id)));
drop function if exists public.can_write(uuid);

-- Overige policynamen terug
alter policy clubs_select            on public.clubs         rename to clubs_lezen;
alter policy clubs_insert            on public.clubs         rename to clubs_maken;
alter policy clubs_admin_select      on public.clubs         rename to clubs_beheer;
alter policy members_select          on public.members       rename to leden_lezen;
alter policy members_insert          on public.members       rename to leden_toevoegen;
alter policy members_delete          on public.members       rename to leden_weghalen;
alter policy members_admin_select    on public.members       rename to leden_beheer;
alter policy teams_select            on public.teams         rename to teams_lezen;
alter policy teams_admin_select      on public.teams         rename to teams_beheer;
alter policy team_data_select        on public.team_data     rename to gegevens_lezen;
alter policy user_data_all           on public.user_data     rename to persoonlijk_alles;
alter policy subscriptions_select    on public.subscriptions rename to abonnementen_lezen;
alter policy subscriptions_admin_select on public.subscriptions rename to abonnementen_beheer;
alter policy admins_select           on public.admins        rename to beheerders_lezen;

-- Triggers terug
alter trigger team_data_updated on public.team_data rename to gegevens_bijgewerkt;
alter trigger user_data_updated on public.user_data rename to persoonlijk_bijgewerkt;
alter trigger teams_updated     on public.teams     rename to teams_bijgewerkt;

-- Functies terug
alter function public.set_updated_at() rename to zet_bijgewerkt;
alter function public.my_clubs()       rename to mijn_clubs;
alter function public.is_admin()       rename to is_beheerder;
drop function if exists public.create_club(text, text);
drop function if exists public.set_plan(uuid, text, date);
drop function if exists public.delete_account(uuid);
drop function if exists public.all_users();

-- Kolommen terug
alter table public.clubs         rename column name        to naam;
alter table public.clubs         rename column created_at  to gemaakt_op;
alter table public.members       rename column user_id     to gebruiker_id;
alter table public.members       rename column name        to naam;
alter table public.members       rename column role        to rol;
alter table public.members       rename column created_at  to gemaakt_op;
alter table public.teams         rename column name        to naam;
alter table public.teams         rename column created_at  to gemaakt_op;
alter table public.teams         rename column updated_at  to bijgewerkt_op;
alter table public.teams         rename column deleted_at  to verwijderd_op;
alter table public.team_data     rename column key         to sleutel;
alter table public.team_data     rename column value       to waarde;
alter table public.team_data     rename column updated_at  to bijgewerkt_op;
alter table public.team_data     rename column device      to apparaat;
alter table public.user_data     rename column user_id     to gebruiker_id;
alter table public.user_data     rename column key         to sleutel;
alter table public.user_data     rename column value       to waarde;
alter table public.user_data     rename column updated_at  to bijgewerkt_op;
alter table public.user_data     rename column device      to apparaat;
alter table public.subscriptions rename column plan        to pakket;
alter table public.subscriptions rename column valid_until to geldig_tot;
alter table public.subscriptions rename column note        to notitie;
alter table public.admins        rename column user_id     to gebruiker_id;
alter table public.admins        rename column note        to notitie;
alter table public.admins        rename column created_at  to gemaakt_op;

-- Tabellen terug
alter table public.members       rename to leden;
alter table public.team_data     rename to gegevens;
alter table public.user_data     rename to persoonlijk;
alter table public.subscriptions rename to abonnementen;
alter table public.admins        rename to beheerders;
alter index if exists public.members_user rename to leden_gebruiker;

-- De bodies weer Nederlands
create or replace function public.zet_bijgewerkt()
returns trigger language plpgsql as $$
begin new.bijgewerkt_op := now(); return new; end $$;

create or replace function public.mijn_clubs()
returns setof uuid language sql stable security definer set search_path = public as $$
  select club_id from public.leden where gebruiker_id = auth.uid()
$$;

create or replace function public.is_beheerder()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.beheerders where gebruiker_id = auth.uid())
$$;

create or replace function public.mag_schrijven(doel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.leden
                 where gebruiker_id = auth.uid() and club_id = doel
                   and rol in ('eigenaar','trainer'))
$$;

notify pgrst, 'reload schema';
commit;

-- Controle: zeven Nederlandse tabellen, evenveel rijen als altijd.
select table_name from information_schema.tables
where table_schema='public' order by 1;
