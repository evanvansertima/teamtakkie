#!/bin/sh
# ══════════════════════════════════════════════════════════════
#  Een SQL-test draaien zonder Supabase aan te raken
#  ─────────────────────────────────────────────────────────────
#  Gebruik:
#      sh tests/sql-lokaal/draai.sh tests/foutmeldingen.test.sql
#      sh tests/sql-lokaal/draai.sh tests/zet-pakket.test.sql
#
#  Met een kandidaat-reparatie erbij, om te zien of een test ook
#  echt groen wórdt (en niet alleen rood is):
#      sh tests/sql-lokaal/draai.sh tests/zet-pakket.test.sql /tmp/fix.sql
#
#  WAT DIT DOET
#  Het start een wegwerp-Postgres in Docker, zet daar de nabootsing
#  van Supabase in (tests/sql-lokaal/nabootsing.sql), laadt de
#  server-bestanden uit deze repo, en draait dan jouw testbestand.
#  De container heet tt-test-pg en wordt bij elke start opnieuw
#  weggegooid en opgebouwd — er blijft niets van staan en er gaat
#  nooit iets naar productie.
#
#  WAT JE ERVOOR NODIG HEBT
#  Docker, en verder niets. Geen psql op je eigen Mac, geen
#  wachtwoord van Supabase.
#
#  WAAROM DIT BESTAAT
#  De SQL-tests in tests/ waren tot nu toe alleen te draaien door ze
#  in de SQL Editor van Supabase te plakken — dus alleen tegen de
#  echte database, en alleen door Evan. Daardoor kon niemand anders
#  aantonen dát een test rood werd. Dit script maakt dat bewijs voor
#  iedereen herhaalbaar.
#
#  WAT HET NIET IS
#  Geen kopie van productie. Het bouwt het schema op uit de
#  bestanden in server/. Groen hier betekent "groen tegen de SQL in
#  deze repo", niet "groen op de echte server" — die twee liepen in
#  september 2026 aantoonbaar uit de pas, zie
#  server/LEES-MIJ-VOOR-JE-IETS-DRAAIT.md.
# ══════════════════════════════════════════════════════════════

HIER=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HIER/../.." && pwd)
BAK=tt-test-pg

TEST="$1"
if [ -z "$TEST" ]; then
  echo "Geef een testbestand mee, bijvoorbeeld:"
  echo "  sh tests/sql-lokaal/draai.sh tests/foutmeldingen.test.sql"
  exit 2
fi
shift
[ -f "$TEST" ] || { echo "Bestand niet gevonden: $TEST"; exit 2; }

docker info >/dev/null 2>&1 || { echo "Docker draait niet. Start Docker Desktop en probeer opnieuw."; exit 2; }

echo "── wegwerpdatabase opbouwen ────────────────────────────────"
docker rm -f "$BAK" >/dev/null 2>&1
docker run -d --name "$BAK" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null || exit 2

# Postgres start twee keer op: eerst een tijdelijke server voor de
# init, dan de echte. Wachten op "ready" alleen is dus niet genoeg —
# dan praat je tegen de server die zo meteen weer afsluit.
n=0
while [ $n -lt 60 ]; do
  if docker logs "$BAK" 2>&1 | grep -q "PostgreSQL init process complete"; then
    docker logs "$BAK" 2>&1 | grep -q "database system is ready to accept connections" && break
  fi
  docker exec "$BAK" sleep 1 >/dev/null 2>&1
  n=$((n + 1))
done
docker exec "$BAK" sleep 1 >/dev/null 2>&1

laad() {
  docker cp "$1" "$BAK:/tmp/laden.sql" >/dev/null || return 1
  docker exec "$BAK" psql -U postgres -v ON_ERROR_STOP=1 -q -f /tmp/laden.sql >/dev/null 2>&1
}

laad "$HIER/nabootsing.sql" || { echo "!! nabootsing.sql mislukt"; exit 1; }
echo "   nabootsing van Supabase: geladen"

# Alleen de bestanden waar de tests in tests/ op leunen. 04, 08, 10 en
# de mappen fase-a/ en rename-en/ zitten hier bewust niet bij: die
# spreken elkaar tegen (zie server/LEES-MIJ-VOOR-JE-IETS-DRAAIT.md) en
# zouden hier een schema neerzetten dat nergens echt bestaat.
for f in 01-schema 03-beheer 06-pakketten 16-foutrapportage; do
  if laad "$REPO/server/$f.sql"; then
    echo "   server/$f.sql: geladen"
  else
    echo "!! server/$f.sql MISLUKT — de test hieronder zegt dan weinig"
  fi
done

# Kandidaat-reparaties, als die zijn meegegeven. Zo is te zien of een
# rode test ook echt groen wórdt, in plaats van alleen maar rood te zijn.
for fix in "$@"; do
  if laad "$fix"; then echo "   $fix: geladen (kandidaat-reparatie)"
  else echo "!! $fix MISLUKT"; fi
done

echo
echo "── $TEST ──────────────────────────────"
docker cp "$TEST" "$BAK:/tmp/test.sql" >/dev/null
docker exec "$BAK" psql -U postgres -q -f /tmp/test.sql 2>&1 | grep -v "NOTICE"

echo
echo "── klaar. Opruimen: docker rm -f $BAK ──────────────────────"
