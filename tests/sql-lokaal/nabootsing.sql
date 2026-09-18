-- ══════════════════════════════════════════════════════════════
--  Minimale nabootsing van wat Supabase standaard al klaarzet
--  ─────────────────────────────────────────────────────────────
--  Dit bestand hoort NIET op productie. Het is er alleen voor de
--  wegwerpdatabase van tests/sql-lokaal/draai.sh, zodat de
--  SQL-tests in tests/ te draaien zijn zonder ooit met de echte
--  Supabase te praten.
--
--  Supabase levert drie dingen mee die in een kale Postgres niet
--  bestaan, en waar elk bestand in server/ vanuit gaat:
--
--    · de rollen anon, authenticated en service_role
--    · het schema auth met de tabel auth.users en auth.uid()
--    · het recht van anon/authenticated op alles in public —
--      bij Supabase is RLS de enige echte poort, niet de grants
--
--  Zonder dat laatste strandt elke test op "permission denied for
--  table ..." in plaats van op de policy die je wilde toetsen, en
--  dan meet je niets.
--
--  WAT DIT WEL EN NIET BEWIJST
--  Dit is een reconstructie van het schema uit server/, geen kopie
--  van productie. Een test die hier groen is, is groen tegen de
--  SQL-bestanden in deze repo. Of productie diezelfde bestanden
--  draait is een aparte vraag — zie server/11-controle-productie.sql
--  en de waarschuwing in server/LEES-MIJ-VOOR-JE-IETS-DRAAIT.md.
-- ══════════════════════════════════════════════════════════════
create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  encrypted_password text,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz default now(),
  raw_user_meta_data jsonb default '{}'::jsonb,
  deleted_at timestamptz
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user)
$$;

create or replace function auth.email() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.email', true), '')
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;

-- Supabase geeft anon/authenticated standaard alle tabelrechten in
-- public; RLS is daar de enige echte poort. Zonder dit zou elke test
-- stranden op "permission denied" in plaats van op de policy.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
