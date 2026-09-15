#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  TEAMTAKKIE — test voor 14-overzicht-accounts.sql en
#               15-opruimen-nepaccounts.sql
#  ─────────────────────────────────────────────────────────────
#  Draai:   bash tests/opruimen-accounts.test.sh
#  Nodig:   Docker (de test start zelf een wegwerp-Postgres en
#           ruimt hem daarna op). Raakt NOOIT een echte database.
#
#  WAAROM DEZE TEST BESTAAT
#  15-opruimen-nepaccounts.sql gooit dingen weg die niet terug te
#  halen zijn. Dan is "het zal wel kloppen" geen antwoord. Deze
#  test bouwt de situatie na — één echt account met FC Harlingen
#  en JO19-2, drie nepaccounts met hun eigen testverenigingen, en
#  één vereniging waar niemand meer in zit — en toont aan:
#
#     1. dat blok 0 groen is als het gereedschap er staat
#     2. dat het overzicht van blok 1 het juiste laat zien: jouw
#        account bovenaan, de rest eronder met hun nummer
#     3. dat verwijder_account() in de SQL Editor NIET werkt zonder
#        de set_config-regel (auth.uid() is daar leeg)
#     4. dat hij mét die regel wél werkt
#     5. dat een nepaccount, zijn vereniging, zijn teams, zijn
#        gegevens en zijn abonnement allemaal verdwijnen
#     6. dat het echte account, FC Harlingen en JO19-2 daarbij
#        onaangeroerd blijven
#     7. dat hij weigert als je je eigen nummer opgeeft
#     8. dat een gedeelde vereniging blijft staan
#     9. dat blok 5 een vereniging zonder leden opruimt, mét haar
#        teams en gegevens
#
#  En, minstens zo belangrijk, met opzettelijk teruggezette fouten:
#
#    10. dat blok 0 rood wordt als verwijder_account() ontbreekt
#    11. dat blok 0 rood wordt als jij niet in beheerders staat
#    12. dat blok 0 rood wordt als een cascade ontbreekt
#    13. dat er zónder die cascade echt weesregels achterblijven —
#        de bewering in de kop van bestand 15 is dus niet uit het
#        schema overgeschreven maar nagedaan
#
#  Een controle die nooit rood wordt, controleert niets.
# ══════════════════════════════════════════════════════════════
set -uo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$(dirname "$HIER")/server"
BAK="tt-test-opruimen-$$"
GOED=0
FOUT=0

op() { docker exec -i "$BAK" psql -U postgres -q -v ON_ERROR_STOP=0 "$@" 2>&1; }

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
for _ in $(seq 1 40); do
  docker exec "$BAK" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

# ══════════════════════════════════════════════════════════════
#  Het schema, nagebouwd
#  Alleen wat voor deze vraag telt. De foreign keys staan er
#  woord voor woord in zoals in server/01-schema.sql, want dáár
#  gaat de helft van deze test over. verwijder_account() is
#  letterlijk overgenomen uit server/03-beheer.sql.
# ══════════════════════════════════════════════════════════════
schema() {
op <<'SQL' >/dev/null
create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz default now()
);

-- auth.uid() zoals Supabase hem vandaag definieert: hij leest wie
-- er belt uit de instellingen van de verbinding. In de SQL Editor
-- staat daar niets, en dan geeft hij null terug. Dat is precies
-- het gedrag waar controle 3 van deze test over gaat.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  logo text,
  gemaakt_op timestamptz not null default now()
);

create table public.leden (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  naam text,
  rol text not null default 'trainer' check (rol in ('eigenaar','trainer','kijker')),
  gemaakt_op timestamptz not null default now(),
  unique (club_id, gebruiker_id)
);

create table public.teams (
  id text primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  naam text not null,
  gemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  verwijderd_op timestamptz
);

create table public.gegevens (
  team_id text not null references public.teams(id) on delete cascade,
  sleutel text not null,
  waarde jsonb not null,
  bijgewerkt_op timestamptz not null default now(),
  apparaat text,
  primary key (team_id, sleutel)
);

create table public.persoonlijk (
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  sleutel text not null,
  waarde jsonb not null,
  bijgewerkt_op timestamptz not null default now(),
  apparaat text,
  primary key (gebruiker_id, sleutel)
);

create table public.abonnementen (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  pakket text not null default 'free' check (pakket in ('free','coach','club')),
  geldig_tot date,
  notitie text
);

create table public.beheerders (
  gebruiker_id uuid primary key references auth.users(id) on delete cascade,
  notitie text,
  gemaakt_op timestamptz not null default now()
);

create or replace function public.is_beheerder()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.beheerders where gebruiker_id = auth.uid())
$$;

-- letterlijk uit server/03-beheer.sql
create or replace function public.verwijder_account(doel uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  clubs_van_hem uuid[];
begin
  if not public.is_beheerder() then
    raise exception 'Alleen voor beheerders';
  end if;
  if doel = auth.uid() then
    raise exception 'Je kunt je eigen account hier niet verwijderen';
  end if;

  select array_agg(l.club_id) into clubs_van_hem
  from public.leden l
  where l.gebruiker_id = doel
    and not exists (select 1 from public.leden a
                    where a.club_id = l.club_id and a.gebruiker_id <> doel);

  delete from public.leden where gebruiker_id = doel;
  if clubs_van_hem is not null then
    delete from public.clubs where id = any(clubs_van_hem);
  end if;
  delete from auth.users where id = doel;
end $$;
SQL
}

vulling() {
op <<'SQL' >/dev/null
insert into auth.users (id, email, last_sign_in_at) values
 ('11111111-1111-1111-1111-111111111111','evan.vansertima001@gmail.com', now()),
 ('22222222-2222-2222-2222-222222222222','test@test.nl', null),
 ('33333333-3333-3333-3333-333333333333','aap@noot.mies', null),
 ('44444444-4444-4444-4444-444444444444','proef123@voorbeeld.xx', null);

insert into public.beheerders (gebruiker_id, notitie)
 values ('11111111-1111-1111-1111-111111111111','eigenaar');

insert into public.clubs (id, naam) values
 ('aaaaaaaa-0000-0000-0000-000000000001','FC Harlingen'),
 ('aaaaaaaa-0000-0000-0000-000000000002','Testclub'),
 ('aaaaaaaa-0000-0000-0000-000000000003','Nepvereniging'),
 ('aaaaaaaa-0000-0000-0000-000000000004','Gedeelde club'),
 ('aaaaaaaa-0000-0000-0000-000000000005','Weesclub zonder leden');

insert into public.leden (club_id, gebruiker_id, naam, rol) values
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Evan','eigenaar'),
 ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Test','eigenaar'),
 ('aaaaaaaa-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','Aap','eigenaar'),
 ('aaaaaaaa-0000-0000-0000-000000000004','44444444-4444-4444-4444-444444444444','Proef','eigenaar'),
 ('aaaaaaaa-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Evan','trainer');

insert into public.teams (id, club_id, naam) values
 ('t-jo19-2','aaaaaaaa-0000-0000-0000-000000000001','JO19-2'),
 ('t-test-1','aaaaaaaa-0000-0000-0000-000000000002','Testteam'),
 ('t-nep-1','aaaaaaaa-0000-0000-0000-000000000003','Nepteam A'),
 ('t-nep-2','aaaaaaaa-0000-0000-0000-000000000003','Nepteam B'),
 ('t-gedeeld','aaaaaaaa-0000-0000-0000-000000000004','Gedeeld team'),
 ('t-wees','aaaaaaaa-0000-0000-0000-000000000005','Weesteam');

insert into public.gegevens (team_id, sleutel, waarde) values
 ('t-jo19-2','fch_spelers_v1','[{"naam":"echte speler"}]'),
 ('t-jo19-2','fch_wedstrijden_v1','[]'),
 ('t-test-1','fch_spelers_v1','[{"naam":"nep"}]'),
 ('t-nep-1','fch_spelers_v1','[]'),
 ('t-nep-2','fch_spelers_v1','[]'),
 ('t-gedeeld','fch_spelers_v1','[]'),
 ('t-wees','fch_spelers_v1','[]');

insert into public.abonnementen (club_id, pakket) values
 ('aaaaaaaa-0000-0000-0000-000000000001','club'),
 ('aaaaaaaa-0000-0000-0000-000000000002','free'),
 ('aaaaaaaa-0000-0000-0000-000000000003','free'),
 ('aaaaaaaa-0000-0000-0000-000000000004','free'),
 ('aaaaaaaa-0000-0000-0000-000000000005','free');

insert into public.persoonlijk (gebruiker_id, sleutel, waarde) values
 ('11111111-1111-1111-1111-111111111111','fch_oefeningen_v1','[]'),
 ('22222222-2222-2222-2222-222222222222','fch_oefeningen_v1','[]');
SQL
}

# Haal één blok uit een van de twee bestanden. De blokken staan
# daar tussen regels met "knip"; zo test dit script de SQL die
# Evan echt plakt, en niet een kopie die kan gaan afwijken.
blok() {
  # blok <bestand> <hoeveelste knip-paar>
  awk -v n="$2" '
    /─ knip ─/ { k++; next }
    k == 2*n-1 { print }
  ' "$1"
}

schema
vulling

B14="$SERVER/14-overzicht-accounts.sql"
B15="$SERVER/15-opruimen-nepaccounts.sql"

echo
echo "── 1. Blok 0: staat het gereedschap er? ─────────────────"
UIT="$(blok "$B14" 1 | op)"
zeg "alle controles in orde"                  wel  "alle 11 controles in orde" "$UIT"
zeg "geen enkele LET OP"                      niet "LET OP"                    "$UIT"
zeg "vier cascades gevonden"                  wel  "4 van de 4"                "$UIT"
zeg "conclusie zegt dat het klaarstaat"       wel  "ALLES STAAT KLAAR"         "$UIT"

echo
echo "── 2. Blok 1: het overzicht ─────────────────────────────"
UIT="$(blok "$B14" 2 | op)"
zeg "jouw account staat als blijver bovenaan" wel  "DIT ACCOUNT BLIJFT STAAN"  "$UIT"
zeg "jouw e-mailadres staat erbij"            wel  "evan.vansertima001@gmail.com" "$UIT"
zeg "FC Harlingen staat bij jouw account"     wel  "FC Harlingen (eigenaar)"   "$UIT"
zeg "de drie nepaccounts staan eronder"       wel  "test@test.nl"              "$UIT"
zeg "elk nepaccount is een kandidaat"         wel  "kandidaat"                 "$UIT"
zeg "het nummer om te kopiëren staat erin"    wel  "22222222-2222-2222-2222-222222222222" "$UIT"
zeg "de gedeelde vereniging wordt gemeld"     wel  "Gedeelde club blijft staan" "$UIT"
zeg "de vereniging zonder leden wordt gemeld" wel  "VERENIGING ZONDER LEDEN"   "$UIT"
zeg "de telling klopt (3 accounts)"           wel  "Accounts naast dat van jou: 3" "$UIT"
zeg "de telling klopt (1 weesvereniging)"     wel  "Verenigingen zonder ook maar één lid: 1" "$UIT"

echo
echo "── 2b. Blok 2: het afschrift (back-up) ──────────────────"
UIT="$(blok "$B15" 1 | op)"
zeg "het afschrift draait zonder fout"        niet "ERROR"                     "$UIT"
zeg "de accounts staan erin"                  wel  "test@test.nl"              "$UIT"
zeg "de verenigingen staan erin"              wel  "FC Harlingen"              "$UIT"
zeg "de teamgegevens staan erin"              wel  "echte speler"              "$UIT"

echo
echo "── 3. Zonder set_config werkt het niet ──────────────────"
UIT="$(op <<'SQL'
select public.verwijder_account('22222222-2222-2222-2222-222222222222');
SQL
)"
zeg "hij weigert zonder ingestelde identiteit" wel "Alleen voor beheerders"    "$UIT"
UIT="$(op -c "select count(*) as n from auth.users where email='test@test.nl';")"
zeg "en er is dus niets verwijderd"            wel "1"                         "$UIT"

echo
echo "── 4. Blok 3: het echte verwijderen ─────────────────────"
# Zoals Evan het doet: het nummer in blok 3 vervangen.
UIT="$(blok "$B15" 2 \
  | sed "s/00000000-0000-0000-0000-000000000000/22222222-2222-2222-2222-222222222222/g" \
  | op)"
zeg "hij herkent je als beheerder"            wel  "ik_ben_nu_herkend"         "$UIT"
zeg "hij meldt welk account weg is"           wel  "test@test.nl"              "$UIT"
zeg "hij meldt 'is nu weg'"                   wel  "is nu weg"                 "$UIT"
zeg "geen foutmelding"                        niet "ERROR"                     "$UIT"

UIT="$(op <<'SQL'
select 'account: '      || count(*) from auth.users where email='test@test.nl';
select 'vereniging: '   || count(*) from public.clubs where naam='Testclub';
select 'lidmaatschap: ' || count(*) from public.leden where gebruiker_id='22222222-2222-2222-2222-222222222222';
select 'team: '         || count(*) from public.teams where id='t-test-1';
select 'gegevens: '     || count(*) from public.gegevens where team_id='t-test-1';
select 'abonnement: '   || count(*) from public.abonnementen where club_id='aaaaaaaa-0000-0000-0000-000000000002';
select 'persoonlijk: '  || count(*) from public.persoonlijk where gebruiker_id='22222222-2222-2222-2222-222222222222';
SQL
)"
for wat in account vereniging lidmaatschap team gegevens abonnement persoonlijk; do
  zeg "$wat van het nepaccount is weg (geen weesregel)" wel "$wat: 0" "$UIT"
done

UIT="$(op <<'SQL'
select 'jij: '        || count(*) from auth.users where email='evan.vansertima001@gmail.com';
select 'harlingen: '  || count(*) from public.clubs where naam='FC Harlingen';
select 'jo19: '       || count(*) from public.teams where id='t-jo19-2';
select 'spelers: '    || count(*) from public.gegevens where team_id='t-jo19-2';
select 'abonnement: ' || count(*) from public.abonnementen where club_id='aaaaaaaa-0000-0000-0000-000000000001';
SQL
)"
zeg "jouw account is onaangeroerd"            wel  "jij: 1"                    "$UIT"
zeg "FC Harlingen is onaangeroerd"            wel  "harlingen: 1"              "$UIT"
zeg "JO19-2 is onaangeroerd"                  wel  "jo19: 1"                   "$UIT"
zeg "de gegevens van JO19-2 staan er nog"     wel  "spelers: 2"                "$UIT"
zeg "het abonnement van FC Harlingen ook"     wel  "abonnement: 1"             "$UIT"

echo
echo "── 5. Blok 4: de na-controle ────────────────────────────"
UIT="$(blok "$B15" 3 | op)"
zeg "na-controle staat overal op in orde"     niet "LET OP"                    "$UIT"
zeg "na-controle telt nog twee accounts"      wel  "accounts over naast dat van jou"  "$UIT"

echo
echo "── 6. Je eigen account kun je niet verwijderen ──────────"
UIT="$(blok "$B15" 2 \
  | sed "s/00000000-0000-0000-0000-000000000000/11111111-1111-1111-1111-111111111111/g" \
  | op)"
zeg "hij weigert je eigen nummer"             wel  "Je kunt je eigen account hier niet verwijderen" "$UIT"
UIT="$(op -c "select 'jij: ' || count(*) from auth.users where email='evan.vansertima001@gmail.com';")"
zeg "en je account staat er gewoon nog"       wel  "jij: 1"                    "$UIT"

echo
echo "── 7. Een gedeelde vereniging blijft staan ──────────────"
UIT="$(blok "$B15" 2 \
  | sed "s/00000000-0000-0000-0000-000000000000/44444444-4444-4444-4444-444444444444/g" \
  | op)"
zeg "het gedeelde account is verwijderd"      wel  "proef123@voorbeeld.xx"     "$UIT"
UIT="$(op <<'SQL'
select 'club: '  || count(*) from public.clubs where naam='Gedeelde club';
select 'team: '  || count(*) from public.teams where id='t-gedeeld';
select 'leden: ' || count(*) from public.leden where club_id='aaaaaaaa-0000-0000-0000-000000000004';
SQL
)"
zeg "de gedeelde vereniging blijft bestaan"   wel  "club: 1"                   "$UIT"
zeg "haar team blijft bestaan"                wel  "team: 1"                   "$UIT"
zeg "jij bent er nog het enige lid van"       wel  "leden: 1"                  "$UIT"

echo
echo "── 8. Blok 5: verenigingen zonder leden ─────────────────"
UIT="$(blok "$B15" 4 | op)"
zeg "5a toont de vereniging zonder leden"     wel  "Weesclub zonder leden"     "$UIT"
zeg "5a toont FC Harlingen NIET"              niet "FC Harlingen"              "$UIT"
zeg "5a toont de gedeelde vereniging NIET"    niet "Gedeelde club"             "$UIT"

UIT="$(blok "$B15" 5 | op)"
zeg "5b verwijdert hem"                       wel  "Weesclub zonder leden"     "$UIT"
UIT="$(op <<'SQL'
select 'club: '      || count(*) from public.clubs where naam='Weesclub zonder leden';
select 'team: '      || count(*) from public.teams where id='t-wees';
select 'gegevens: '  || count(*) from public.gegevens where team_id='t-wees';
select 'abonnement: '|| count(*) from public.abonnementen where club_id='aaaaaaaa-0000-0000-0000-000000000005';
select 'harlingen: ' || count(*) from public.clubs where naam='FC Harlingen';
SQL
)"
zeg "de weesvereniging is weg"                wel  "club: 0"                   "$UIT"
zeg "haar team is mee weg"                    wel  "team: 0"                   "$UIT"
zeg "haar gegevens zijn mee weg"              wel  "gegevens: 0"               "$UIT"
zeg "haar abonnement is mee weg"              wel  "abonnement: 0"             "$UIT"
zeg "FC Harlingen is nog altijd onaangeroerd" wel  "harlingen: 1"              "$UIT"

# ══════════════════════════════════════════════════════════════
#  OPZETTELIJKE FOUTEN
#  Vanaf hier zetten we het kapot en kijken of de controle het
#  ziet. Zonder dit deel weet je alleen dat de test groen is, niet
#  dat groen iets betekent.
# ══════════════════════════════════════════════════════════════
echo
echo "── 9. Opzettelijke fout: verwijder_account weggehaald ───"
op -c "drop function public.verwijder_account(uuid);" >/dev/null
UIT="$(blok "$B14" 1 | op)"
zeg "blok 0 wordt rood"                       wel  "LET OP"                    "$UIT"
zeg "en wijst naar 03-beheer.sql"             wel  "03-beheer.sql"             "$UIT"

echo
echo "── 10. Opzettelijke fout: jij niet meer beheerder ───────"
op -c "delete from public.beheerders;" >/dev/null
UIT="$(blok "$B14" 1 | op)"
zeg "blok 0 meldt dat je geen beheerder bent" wel  "sta jij als beheerder geregistreerd?" "$UIT"
zeg "twee controles staan nu open"            wel  "2 van de 11 staan open"    "$UIT"

echo
echo "── 11. Opzettelijke fout: de cascade weggehaald ─────────"
op -c "alter table public.gegevens drop constraint gegevens_team_id_fkey;" >/dev/null
UIT="$(blok "$B14" 1 | op)"
zeg "blok 0 ziet dat er een cascade mist"     wel  "3 van de 4"                "$UIT"
zeg "en waarschuwt in gewone taal"            wel  "stop helemaal"             "$UIT"

echo
echo "── 12. En zonder cascade blijven er echt weesregels ─────"
# Dit is de bewering uit de kop van bestand 15, nagedaan in plaats
# van overgeschreven: haal de afspraak weg en de spelers van een
# verdwenen team blijven staan.
UIT="$(op <<'SQL'
select 'voor: ' || count(*) from public.gegevens where team_id='t-nep-1';
delete from public.clubs where naam='Nepvereniging';
select 'na: '   || count(*) from public.gegevens where team_id='t-nep-1';
select 'team: ' || count(*) from public.teams where id='t-nep-1';
SQL
)"
zeg "voor het verwijderen stond er een regel" wel  "voor: 1"                   "$UIT"
zeg "het team is weg"                         wel  "team: 0"                   "$UIT"
zeg "maar de spelers blijven als wees achter" wel  "na: 1"                     "$UIT"

echo
echo "══════════════════════════════════════════════════════════"
echo "  $GOED goed, $FOUT fout"
if [ "$FOUT" -eq 0 ]; then
  echo "  Alles in orde."
  echo "══════════════════════════════════════════════════════════"
  exit 0
else
  echo "  Er is iets mis. Draai 15-opruimen-nepaccounts.sql niet."
  echo "══════════════════════════════════════════════════════════"
  exit 1
fi
