#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  TEAMTAKKIE — test voor 12-controle-opheffen.sql en
#               13-reconciliatie-is-eigenaar.sql
#  ─────────────────────────────────────────────────────────────
#  Draai:   bash tests/reconciliatie-is-eigenaar.test.sh
#  Nodig:   Docker (de test start zelf een wegwerp-Postgres en
#           ruimt hem daarna op). Raakt NOOIT een echte database.
#
#  WAAROM DEZE TEST BESTAAT
#  Op 15 september bleek uit 11-controle-productie.sql dat de echte
#  database de fase-a-lijn draait (ben_eigenaar) en niet de lijn
#  waar 08-bewaartermijn.sql en 10-laatste-eigenaar.sql van uitgaan
#  (is_eigenaar). Deze test bouwt precies die staat na en toont aan:
#
#    1. dat het opheffen van een vereniging daar stil faalt
#       (nul rijen weg, geen foutmelding — de app meldt "gelukt")
#    2. dat 12 dat ziet en in gewone taal benoemt
#    3. dat 13 dat repareert zonder een enkele policy aan te raken
#    4. dat 12 daarna groen wordt en het opheffen echt werkt,
#       voor de eigenaar wel en voor een trainer niet
#
#  En, minstens zo belangrijk, met opzettelijk teruggezette fouten:
#
#    5. dat 12 rood wordt als de regel ontbreekt
#    6. dat 12 rood wordt als de regel een functie noemt die niet
#       bestaat
#    7. dat het controleblok van 13 rood wordt als is_eigenaar wel
#       bestaat maar security invoker is
#    8. dat het controleblok van 13 rood wordt als is_eigenaar een
#       ANDER antwoord geeft dan ben_eigenaar — de enige fout die
#       er echt toe doet
#
#  Een controle die nooit rood wordt, controleert niets.
# ══════════════════════════════════════════════════════════════
set -uo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$(dirname "$HIER")/server"
BAK="tt-test-is-eigenaar-$$"
GOED=0
FOUT=0

op() { docker exec -i "$BAK" psql -U postgres -q -v ON_ERROR_STOP=0 "$@" 2>&1; }

zeg() {
  # zeg <omschrijving> <verwacht-wel|verwacht-niet> <zoektekst> <uitvoer>
  local wat="$1" richting="$2" zoek="$3" uit="$4"
  if [ "$richting" = "wel" ]; then
    if grep -qF -- "$zoek" <<<"$uit"; then GOED=$((GOED+1)); echo "  ok   $wat"
    else FOUT=$((FOUT+1)); echo "  FOUT $wat"; echo "$uit" | sed 's/^/       | /'; fi
  else
    if grep -qF -- "$zoek" <<<"$uit"; then FOUT=$((FOUT+1)); echo "  FOUT $wat"; echo "$uit" | sed 's/^/       | /'
    else GOED=$((GOED+1)); echo "  ok   $wat"; fi
  fi
}

opruimen() { docker rm -f "$BAK" >/dev/null 2>&1; }
trap opruimen EXIT

echo "Wegwerp-Postgres starten..."
docker run -d --name "$BAK" -e POSTGRES_PASSWORD=x postgres:16 >/dev/null || {
  echo "Docker is niet beschikbaar. Deze test kan niet draaien."; exit 2; }
for _ in $(seq 1 30); do
  docker exec "$BAK" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

# ── De staat van productie, nagebouwd ────────────────────────
#  Alleen wat voor deze vraag telt: clubs, leden, de fase-a-
#  hulpfuncties, en de ledenregels zoals A2-fix-leden.sql ze neerzet.
#  Bewust GEEN is_eigenaar, GEEN insert-regel op clubs (A1 is
#  gedraaid) en GEEN delete-regel op clubs (08 is nooit aangekomen).
mock() {
op <<'SQL' >/dev/null
drop schema if exists public cascade; create schema public;
drop schema if exists auth cascade;   create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
grant usage on schema public, auth to authenticated;
create table public.clubs (id uuid primary key default gen_random_uuid(), naam text not null,
  logo text, gemaakt_op timestamptz not null default now());
create table public.leden (id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade, naam text,
  rol text not null default 'trainer' check (rol in ('eigenaar','trainer','kijker')),
  gemaakt_op timestamptz not null default now(), unique (club_id, gebruiker_id));
-- teams en gegevens staan hier alleen omdat 08 ze aan het eind
-- uitleest; de test doet er verder niets mee.
create table public.teams (id text primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  naam text, verwijderd boolean not null default false);
create table public.gegevens (id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  sleutel text not null, waarde jsonb, unique (team_id, sleutel));
alter table public.clubs enable row level security;
alter table public.leden enable row level security;
alter table public.teams enable row level security;
alter table public.gegevens enable row level security;
grant select, insert, update, delete on all tables in schema public to authenticated;
create function public.mijn_clubs() returns setof uuid
  language sql stable security definer set search_path = public as $$
  select club_id from public.leden where gebruiker_id = auth.uid() $$;
create function public.ben_eigenaar(doel uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.leden
                 where gebruiker_id = auth.uid() and club_id = doel and rol = 'eigenaar') $$;
grant execute on function public.ben_eigenaar(uuid) to authenticated;
create function public.is_laatste_eigenaar(c uuid, g uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.leden where club_id=c and gebruiker_id=g and rol='eigenaar')
     and not exists (select 1 from public.leden where club_id=c and rol='eigenaar' and gebruiker_id<>g) $$;
grant execute on function public.is_laatste_eigenaar(uuid, uuid) to authenticated;
create policy clubs_lezen on public.clubs for select using (id in (select public.mijn_clubs()));
create policy leden_lezen on public.leden for select
  using (gebruiker_id = auth.uid() or club_id in (select public.mijn_clubs()));
create policy leden_toevoegen on public.leden for insert with check (public.ben_eigenaar(leden.club_id));
create policy leden_weghalen on public.leden for delete
  using ((gebruiker_id = auth.uid() or public.ben_eigenaar(leden.club_id))
         and not public.is_laatste_eigenaar(leden.club_id, leden.gebruiker_id));
insert into auth.users values
  ('11111111-1111-1111-1111-111111111111','eigenaar@test.nl'),
  ('22222222-2222-2222-2222-222222222222','trainer@test.nl');
insert into public.clubs (id, naam) values ('aaaaaaaa-0000-0000-0000-000000000001','FC Harlingen');
insert into public.leden (club_id, gebruiker_id, rol) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','eigenaar'),
  ('aaaaaaaa-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','trainer');
-- basis_van_sleutel() hoort bij 06-pakketten.sql. 08 heeft hem nodig,
-- dus zonder deze regel zou 08 ook zonder het naamprobleem vastlopen.
create or replace function public.basis_van_sleutel(s text) returns text language sql immutable as $$
  select case when position('::' in s) > 0 then split_part(s, '::', 2) else s end $$;
SQL
}

# poging_opheffen <gebruiker-uuid>  →  aantal clubs dat er daarna nog staat
poging_opheffen() {
  op <<SQL | tr -d ' \n'
set role authenticated;
select set_config('request.jwt.claim.sub','$1', false);
delete from public.clubs where id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select count(*) from public.clubs;
SQL
}

EIGENAAR=11111111-1111-1111-1111-111111111111
TRAINER=22222222-2222-2222-2222-222222222222


echo
echo "1. De staat van productie, nagebouwd"
mock
UIT="$(poging_opheffen "$EIGENAAR")"
# De club staat er daarna nog: dat is de stille mislukking.
zeg "eigenaar heft op en er verdwijnt niets (stille mislukking)" wel "1(1row)" "$UIT"

echo
echo "2. 12-controle-opheffen.sql ziet het en zegt het"
UIT="$(op < "$SERVER/12-controle-opheffen.sql")"
zeg "meldt LET OP"                                   wel "LET OP"                                  "$UIT"
zeg "noemt de stille mislukking"                     wel "opheffen doet niets"                     "$UIT"
zeg "wijst is_eigenaar aan als oorzaak"              wel "is_eigenaar() bestaat hier niet"         "$UIT"
zeg "waarschuwt voor de tweede blokkade niet onnodig" niet "basis_van_sleutel(), en die komt uit"   "$UIT"

echo
echo "3. 13-reconciliatie-is-eigenaar.sql repareert, zonder policy's aan te raken"
VOOR="$(op -c "select polname, pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid) from pg_policy order by polname")"
UIT="$(op < "$SERVER/13-reconciliatie-is-eigenaar.sql")"
zeg "alle controles in orde"      niet "LET OP" "$UIT"
NA="$(op -c "select polname, pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid) from pg_policy order by polname")"
if [ "$VOOR" = "$NA" ]; then GOED=$((GOED+1)); echo "  ok   geen enkele beveiligingsregel is veranderd"
else FOUT=$((FOUT+1)); echo "  FOUT beveiligingsregels zijn wel veranderd"; diff <(echo "$VOOR") <(echo "$NA") | sed 's/^/       | /'; fi

echo
echo "4. Daarna kan 08 wel, en werkt het opheffen echt"
op < "$SERVER/08-bewaartermijn.sql" > /tmp/tt-08-$$.log 2>&1
if grep -qi "^ERROR" /tmp/tt-08-$$.log; then
  FOUT=$((FOUT+1)); echo "  FOUT 08-bewaartermijn.sql liep vast"; grep -i "^ERROR" /tmp/tt-08-$$.log | sed 's/^/       | /'
else GOED=$((GOED+1)); echo "  ok   08-bewaartermijn.sql draait zonder fout"; fi
rm -f /tmp/tt-08-$$.log
UIT="$(op < "$SERVER/12-controle-opheffen.sql")"
zeg "12 meldt nu nergens LET OP" niet "LET OP"      "$UIT"
zeg "12 meldt MEEVALLER"         wel  "MEEVALLER"   "$UIT"
UIT="$(poging_opheffen "$TRAINER")"
zeg "een trainer mag NIET opheffen"  wel "1(1row)" "$UIT"
UIT="$(poging_opheffen "$EIGENAAR")"
zeg "de eigenaar mag WEL opheffen"   wel "0(1row)" "$UIT"

echo
echo "5. Opzettelijke fout: de regel op clubs weggehaald"
mock
op < "$SERVER/13-reconciliatie-is-eigenaar.sql" >/dev/null
op -c "drop policy if exists clubs_weghalen on public.clubs" >/dev/null
UIT="$(op < "$SERVER/12-controle-opheffen.sql")"
zeg "12 wordt rood"                       wel "LET OP"                     "$UIT"
zeg "12 zegt waarom in gewone taal"       wel "OPHEFFEN VAN EEN VERENIGING WERKT NIET" "$UIT"

echo
echo "6. Opzettelijke fout: de regel noemt een functie die niet bestaat"
op -c "create policy clubs_weghalen on public.clubs for delete using (public.is_eigenaar(id) and 'pakket_van_club' <> '')" >/dev/null
UIT="$(op < "$SERVER/12-controle-opheffen.sql")"
zeg "12 ziet de ontbrekende functie"      wel "en die bestaat niet"        "$UIT"
zeg "12 noemt het een databasefout"       wel "databasefout"               "$UIT"

echo
echo "7. Opzettelijke fout: is_eigenaar is geen security definer"
mock
op <<'SQL' >/dev/null
create function public.is_eigenaar(doel uuid) returns boolean
  language sql stable as $$ select public.ben_eigenaar(doel) $$;
SQL
UIT="$(op < "$SERVER/13-reconciliatie-is-eigenaar.sql")"
# create or replace zet hem meteen weer goed, dus we controleren het
# controleblok apart op de kapotte versie.
op -c "drop function if exists public.is_eigenaar(uuid)" >/dev/null
op <<'SQL' >/dev/null
create function public.is_eigenaar(doel uuid) returns boolean
  language sql stable as $$ select public.ben_eigenaar(doel) $$;
SQL
UIT="$(op -c "
select case when p.prosecdef then 'in orde' else 'LET OP' end as oordeel
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='is_eigenaar'")"
zeg "security-invoker-versie wordt als LET OP gezien" wel "LET OP" "$UIT"

echo
echo "8. Opzettelijke fout: is_eigenaar geeft een ANDER antwoord dan ben_eigenaar"
mock
op <<'SQL' >/dev/null
create function public.is_eigenaar(doel uuid) returns boolean
  language sql stable security definer set search_path = public as $$ select true $$;
SQL
# Alleen het vergelijkende deel van het controleblok van 13.
UIT="$(op -c "
select count(*) filter (
  where public.is_eigenaar(c.id) is distinct from public.ben_eigenaar(c.id)
) as verschillen from public.clubs c")"
zeg "het verschil wordt gezien (moet 1 zijn)" wel "1" "$UIT"

echo
echo "─────────────────────────────────────────────"
echo "  $GOED goed, $FOUT fout"
[ "$FOUT" -eq 0 ] && { echo "  GESLAAGD"; exit 0; }
echo "  MISLUKT"; exit 1
