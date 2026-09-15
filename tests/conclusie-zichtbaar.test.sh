#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  TEAMTAKKIE — staat de conclusie in de TABEL, en niet alleen in
#               het logboek?
#  ─────────────────────────────────────────────────────────────
#  Draai:   bash tests/conclusie-zichtbaar.test.sh
#  Nodig:   Docker (de test start zelf een wegwerp-Postgres en
#           ruimt hem daarna op). Raakt NOOIT een echte database.
#
#  WAAROM DEZE TEST BESTAAT
#  De controlebestanden in server/ schreven hun conclusie met
#  "raise notice". Dat schrijft naar het logboek van de verbinding.
#  In pgAdmin staat dat logboek onder een tabblad "Messages" — maar
#  in de SQL-editor van Supabase is dat tabblad niet te vinden.
#  Evan draaide 13-reconciliatie-is-eigenaar.sql en kon de conclusie
#  daardoor nergens lezen. Een conclusie die niemand ziet, is geen
#  conclusie: precies dezelfde fout als een groene test die niets
#  vangt, maar dan aan de leeskant.
#
#  HOE DEZE TEST DAT METT
#  Hij draait elk bestand met het logboek uitgezet
#  (client_min_messages = warning). Alles wat alleen via raise
#  notice naar buiten kwam, is dan weg. Wat overblijft is wat Evan
#  in het vak "Results" ziet. Daarin moet de conclusie staan.
#
#  Stap 7 bewijst dat deze meetmethode ook echt iets vangt: hij
#  draait met opzet een blokje dat zijn tekst alléén via raise
#  notice meldt, en controleert dat die tekst dan NIET gevonden
#  wordt. Zou dat wel zo zijn, dan meet deze test niets.
# ══════════════════════════════════════════════════════════════
set -uo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$(dirname "$HIER")/server"
BAK="tt-test-conclusie-$$"
GOED=0
FOUT=0

# Gewoon draaien (logboek aan) — alleen nodig om de testdatabase
# klaar te zetten.
op() { docker exec -i "$BAK" psql -U postgres -q -v ON_ERROR_STOP=0 "$@" 2>&1; }

# Draaien zoals Evan het ziet: zonder logboek. Alleen tabellen.
blind() {
  docker exec -i -e PGOPTIONS='-c client_min_messages=warning' "$BAK" \
    psql -U postgres -q -v ON_ERROR_STOP=0 "$@" 2>&1
}

zeg() {
  # zeg <omschrijving> <wel|niet> <zoektekst> <uitvoer>
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
#  Dezelfde opzet als in tests/reconciliatie-is-eigenaar.test.sh:
#  de fase-a-lijn (ben_eigenaar), geen is_eigenaar, geen delete-regel
#  op clubs. Bewust hier herhaald in plaats van gedeeld, zodat deze
#  test op zichzelf te lezen en te draaien is.
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
create table public.clubs (id uuid primary key default gen_random_uuid(), naam text not null);
create table public.leden (id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade, naam text,
  rol text not null default 'trainer' check (rol in ('eigenaar','trainer','kijker')),
  unique (club_id, gebruiker_id));
create table public.teams (id text primary key,
  club_id uuid not null references public.clubs(id) on delete cascade, naam text);
create table public.gegevens (id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  sleutel text not null, waarde jsonb, unique (team_id, sleutel));
alter table public.clubs    enable row level security;
alter table public.leden    enable row level security;
alter table public.teams    enable row level security;
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
create policy clubs_lezen on public.clubs for select using (id in (select public.mijn_clubs()));
create policy leden_lezen on public.leden for select
  using (gebruiker_id = auth.uid() or club_id in (select public.mijn_clubs()));
create policy leden_toevoegen on public.leden for insert with check (public.ben_eigenaar(leden.club_id));
create policy leden_weghalen on public.leden for delete
  using (gebruiker_id = auth.uid() or public.ben_eigenaar(leden.club_id));
create policy teams_lezen on public.teams for select using (club_id in (select public.mijn_clubs()));
create policy gegevens_lezen on public.gegevens for select
  using (team_id in (select id from public.teams where club_id in (select public.mijn_clubs())));
insert into auth.users values
  ('11111111-1111-1111-1111-111111111111','eigenaar@test.nl');
insert into public.clubs (id, naam) values ('aaaaaaaa-0000-0000-0000-000000000001','FC Harlingen');
insert into public.leden (club_id, gebruiker_id, rol) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','eigenaar');
create or replace function public.basis_van_sleutel(s text) returns text language sql immutable as $$
  select case when position('::' in s) > 0 then split_part(s, '::', 2) else s end $$;
SQL
}


echo
echo "1. 12-controle-opheffen.sql — conclusie zonder logboek"
mock
UIT="$(blind < "$SERVER/12-controle-opheffen.sql")"
zeg "de tabel komt door"                      wel "SAMENVATTING"                             "$UIT"
zeg "er staat een kopje CONCLUSIE in"         wel "─── CONCLUSIE"                            "$UIT"
zeg "de conclusie zelf staat erin"            wel "HET OPHEFFEN VAN EEN VERENIGING WERKT NIET." "$UIT"
zeg "en wat Evan dan moet doen"               wel "WAT JE DOET: draai eerst 13-reconciliatie" "$UIT"
zeg "de samenvatting wijst naar de tabel"     wel "onderaan deze tabel"                      "$UIT"
zeg "de samenvatting wijst NIET naar Messages" niet "onder Messages"                         "$UIT"

echo
echo "2. 13-reconciliatie-is-eigenaar.sql — WAT NU zonder logboek"
UIT="$(blind < "$SERVER/13-reconciliatie-is-eigenaar.sql")"
zeg "de controletabel komt door"              wel "de functie is_eigenaar() bestaat nu"      "$UIT"
zeg "er staat een kopje WAT NU in"            wel "─── WAT NU"                               "$UIT"
zeg "de volgende stap staat erin"             wel "08-bewaartermijn.sql draaien"             "$UIT"
zeg "de waarschuwing over 10 staat erin"      wel "Draai 10-laatste-eigenaar.sql NIET"       "$UIT"

echo
echo "3. 13 opnieuw, nu met basis_van_sleutel weg (de tweede blokkade)"
op -c "drop function if exists public.basis_van_sleutel(text)" >/dev/null
UIT="$(blind < "$SERVER/13-reconciliatie-is-eigenaar.sql")"
zeg "de tweede blokkade wordt genoemd"        wel "Maar doe dat NOG NIET"                    "$UIT"
zeg "en er staat bij waar die vandaan komt"   wel "06-pakketten.sql"                         "$UIT"

echo
echo "4. 11-controle-productie.sql — het pakketlijstje zonder logboek"
mock
UIT="$(blind < "$SERVER/11-controle-productie.sql")"
zeg "de tabel komt door"                      wel "SAMENVATTING"                             "$UIT"
zeg "het kopje van het lijstje staat erin"    wel "welke pakketten staan er in de database"  "$UIT"
zeg "en het meldt dat 06 nooit gedraaid is"   wel "pakket_grenzen bestaat nog niet"          "$UIT"
op <<'SQL' >/dev/null
create table public.pakket_grenzen (pakket text primary key, teams int, modules text[]);
insert into public.pakket_grenzen values
  ('free', 1, '{basis}'), ('coach', 1, '{basis,statistieken}'),
  ('club', null, '{basis,statistieken,boetepot}');
SQL
UIT="$(blind < "$SERVER/11-controle-productie.sql")"
zeg "met tabel: free staat erin"              wel "pakket free"                              "$UIT"
zeg "met tabel: club is onbeperkt"            wel "onbeperkt team(s)"                        "$UIT"
zeg "met tabel: de onderdelen staan erbij"    wel "onderdelen: basis statistieken"           "$UIT"
# Een tabel die er anders uitziet mag geen rode foutmelding geven.
op -c "alter table public.pakket_grenzen drop column modules" >/dev/null
UIT="$(blind < "$SERVER/11-controle-productie.sql")"
zeg "vreemde tabel: geen foutmelding"         niet "ERROR"                                   "$UIT"
zeg "vreemde tabel: wel een uitleg"           wel "ziet er anders uit dan verwacht"          "$UIT"

echo
echo "5. 04-leden-fix.sql — eindoverzicht zonder logboek"
mock
UIT="$(blind < "$SERVER/04-leden-fix.sql")"
zeg "controle 1 staat in de tabel"            wel "CONTROLE 1 — geen enkele regel kijkt"     "$UIT"
zeg "controle 2 staat in de tabel"            wel "CONTROLE 2 — leden accepteert"            "$UIT"
zeg "de proef is geslaagd"                    wel "OK: leden accepteert insert en delete"    "$UIT"

echo
echo "6. 02-controle.sql — eindoverzicht zonder logboek"
mock
UIT="$(blind < "$SERVER/02-controle.sql")"
zeg "alle vier de controles staan erin"       wel "CONTROLE 4 — een eigenaar kan zijn"       "$UIT"
zeg "de proef op leden staat erin"            wel "OK: leden accepteert insert en delete"    "$UIT"
zeg "het ontbreken van de opheffregel ook"    wel "er is geen regel voor weggooien op clubs" "$UIT"

echo
echo "7. Meet deze test wel iets? (opzettelijke fout)"
# Een blokje dat zijn tekst ALLEEN via raise notice meldt — precies
# wat de bestanden hierboven vroeger deden. Met het logboek uit hoort
# die tekst nergens te vinden te zijn. Wordt hij toch gevonden, dan
# kijkt deze test naar het logboek in plaats van naar de tabel en
# bewijst hij niets.
UIT="$(blind <<'SQL'
do $proef$
begin
  raise notice 'DEZE TEKST STAAT ALLEEN IN HET LOGBOEK';
end
$proef$;
SQL
)"
zeg "tekst uit alleen het logboek wordt NIET gezien" niet "DEZE TEKST STAAT ALLEEN IN HET LOGBOEK" "$UIT"
# En andersom: met het logboek aan ziet dezelfde meting hem wel.
UIT="$(op <<'SQL'
do $proef$
begin
  raise notice 'DEZE TEKST STAAT ALLEEN IN HET LOGBOEK';
end
$proef$;
SQL
)"
zeg "met logboek aan wordt hij wel gezien (de meting werkt)" wel "DEZE TEKST STAAT ALLEEN IN HET LOGBOEK" "$UIT"

echo
echo "─────────────────────────────────────────────"
echo "  $GOED goed, $FOUT fout"
[ "$FOUT" -eq 0 ] && { echo "  GESLAAGD"; exit 0; }
echo "  MISLUKT"; exit 1
