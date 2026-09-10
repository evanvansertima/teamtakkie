-- ══════════════════════════════════════════════════════════════
--  FASE A — A1: clubs_maken sluiten   (risico S3)
--  ─────────────────────────────────────────────────────────────
--  EERST OP STAGING. Pas na een groene A8 op productie.
--
--  WAT ER NU MIS IS
--
--    create policy clubs_maken on public.clubs for insert
--      with check (true);
--
--  `with check (true)` stelt geen enkele eis. Niet dat je ingelogd
--  bent, niet dat je iets met die club te maken hebt. En omdat anon
--  en authenticated tabelrechten op clubs hebben, betekent dat: wie
--  de publieke sleutel uit index.html haalt — en die staat daar
--  bewust in — kan in een lus rijen in public.clubs schrijven.
--
--  Getest, niet aangenomen: op een nagebouwde kopie van dit schema
--  heeft een anonieme rol met succes een club aangemaakt.
--
--  WAT ER VOOR IN DE PLAATS KOMT: niets.
--
--  Dat klinkt roekeloos en is het niet. Het aanmaken van een club
--  loopt in de app uitsluitend via nieuwe_club(), en die functie is
--  `security definer`. Hij draait dus met de rechten van zijn
--  eigenaar (postgres) en heeft aan RLS helemaal geen boodschap.
--  Een insert-policy op clubs is voor de app nooit nodig geweest.
--
--  Geen enkele bestaande rij wordt aangeraakt.
-- ══════════════════════════════════════════════════════════════

drop policy if exists clubs_maken on public.clubs;

-- ══════════════════════════════════════════════════════════════
--  CONTROLE
-- ══════════════════════════════════════════════════════════════

-- 1. Er hoort GEEN insert-regel meer op clubs te staan.
select coalesce(string_agg(policyname || ' (' || cmd || ')', ', '), 'GEEN — dit is goed')
       as insert_regels_op_clubs
from pg_policies
where schemaname = 'public' and tablename = 'clubs' and cmd = 'INSERT';

-- 2. De andere regels op clubs staan er nog wél.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'clubs'
order by cmd, policyname;
-- Verwacht: clubs_beheer (SELECT), clubs_lezen (SELECT), clubs_wijzigen (UPDATE)

-- 3. Er is niets weggegooid.
select count(*) as clubs from public.clubs;
-- Verwacht op productie: 4

-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN: zie A9-rollback.sql
-- ══════════════════════════════════════════════════════════════
