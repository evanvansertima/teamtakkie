-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: verwerkt de betaalketen een melding van Mollie
--                     precies één keer, en alleen als het mag?
--  ─────────────────────────────────────────────────────────────
--  Draai dit lokaal, zonder Supabase aan te raken:
--
--      sh tests/sql-lokaal/draai.sh tests/betaling-verwerken.test.sql
--
--  Zo draait hij tegen de SQL die er vandaag staat, en dan hoort hij
--  ROOD te zijn: er bestaat nog geen tabel betalingen en geen functie
--  verwerk_betaling(). Dat is met opzet — zie "DEZE TEST HOORT NU ROOD
--  TE ZIJN" verderop.
--
--  Mét een kandidaat-implementatie erbij, om te zien of hij ook echt
--  groen wórdt:
--
--      sh tests/sql-lokaal/draai.sh tests/betaling-verwerken.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql
--
--  Het mag ook in de SQL Editor van Supabase. De test maakt zijn eigen
--  verenigingen, nepaccounts en betaalrijen aan en draait alles aan het
--  eind terug. Er blijft niets van achter en er wordt geen bestaande
--  vereniging of betaling aangeraakt.
--
--  De uitslag komt als TABEL terug. In de kolom "oordeel" hoort overal
--  ZOALS VERWACHT te staan.
--
--  ─────────────────────────────────────────────────────────────
--  WAAR HET HIER OM GAAT
--
--  Clubs gaan straks zelf afrekenen: iDEAL voor de eerste betaling, een
--  SEPA-machtiging voor de maanden daarna, en Mollie Subscriptions die
--  de verlengingen zelf incasseert. Van dat hele verhaal is er precies
--  één stuk dat, als het misgaat, geld of toegang kost:
--
--      public.verwerk_betaling()
--
--  Dat is de functie die een melding van Mollie omzet in een pakket. De
--  drie manieren waarop zoiets stukgaat, staan hieronder, en elk ervan
--  heeft hier een eigen blok scenario's.
--
--  1. IEMAND ANDERS ROEPT HEM AAN
--     Een functie die een pakket kan toekennen is een gratis
--     abonnement voor wie hem kan aanroepen. Daarom zitten er twee
--     sloten op, en die worden hier APART getoetst — zie het lange
--     stuk boven blok 2, want dat is de subtielste test in dit bestand.
--
--  2. DEZELFDE MELDING KOMT TWEE KEER BINNEN
--     Dat is geen randgeval maar het normale gedrag van Mollie: een
--     webhook wordt opnieuw gestuurd als het antwoord uitblijft of
--     traag is. Verwerkt de functie hem twee keer, dan krijgt de club
--     twee maanden voor één betaling. Blok 4.
--
--  3. EEN TESTBETALING TELT ALS ECHTE BETALING
--     Mollie levert twee sleutels: test en live. Met de testsleutel is
--     een geslaagde betaling van € 0,- in tien seconden gemaakt. Komt
--     die binnen terwijl de live-sleutel in gebruik is, dan is dat een
--     gratis abonnement. Blok 3.
--
--  ─────────────────────────────────────────────────────────────
--  MOLLIE SUBSCRIPTIONS — WAAROM BLOK 5 BESTAAT
--
--  Bij de eerste betaling maakt de app de rij in public.betalingen zelf
--  aan (via de edge function betaling-starten) en komt de melding van
--  Mollie daarna binnen op een nummer dat al bekend is.
--
--  Bij een verlenging gebeurt dat niet. Mollie incasseert zelf, op zijn
--  eigen kalender, en stuurt dan dezelfde soort melding — maar met een
--  betaalnummer dat hier nog nooit is langsgekomen. Er is geen rij om
--  bij te werken. De enige draad terug naar de club is het
--  Mollie-klantnummer (cst_…) dat bij het abonnement is opgeslagen.
--
--  Een implementatie die alleen bestaande rijen bijwerkt, verwerkt dus
--  wél de eerste maand en géén enkele verlenging. Dat merk je pas een
--  maand na de eerste klant. Blok 5 legt dat vast.
--
--  ─────────────────────────────────────────────────────────────
--  DEZE TEST HOORT NU ROOD TE ZIJN
--
--  Geschreven op 18 september 2026, vóórdat er ook maar één regel van
--  de betaalketen bestond. Tegen de SQL van vandaag horen ALLE
--  scenario's "niet te toetsen" te melden, met scenario 0 als reden.
--  Dat is het bewijs dat ze het gat echt vangen en niet alleen groen
--  meekleuren met wat er toevallig al staat.
--
--  ─────────────────────────────────────────────────────────────
--  WAT DEZE TEST NIET BEWIJST — eerlijk opgeschreven
--
--  · Écht twee meldingen tegelijk. Blok 4 stuurt ze na elkaar. Twee
--    gelijktijdige verbindingen zijn vanuit één SQL-bestand niet na te
--    bootsen. Scenario 7a vangt dat deels op door naar de VORM van de
--    update te kijken ("and verwerkt_op is null" in de where) — dat is
--    het stuk dat de gelijktijdigheid afvangt, want Postgres laat de
--    tweede update wachten op het rijslot en hertoetst daarna de where.
--    Wie dat stukje weghaalt, valt over 7a én over 4b.
--  · Of Mollie stuurt wat hier wordt aangenomen. De melding van Mollie
--    wordt hier niet nagebootst; dit bestand begint bij de functie.
--  · De edge functions zelf (betaling-starten, betaling-melding). Die
--    draaien in Deno, niet in Postgres, en horen bij een andere test.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_betaling;
create temp table tt_uitslag_betaling(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  -- Vaste uuid's, zodat een mislukte run herkenbare rommel achterlaat
  -- in plaats van naamloze rijen — al hoort er niets achter te blijven.
  u_eig_t    uuid := 'be7a1100-0000-4000-a000-000000000001';
  u_eig_l    uuid := 'be7a1100-0000-4000-a000-000000000002';
  u_eig_t2   uuid := 'be7a1100-0000-4000-a000-000000000003';
  u_eig_d    uuid := 'be7a1100-0000-4000-a000-000000000004';
  u_eig_v    uuid := 'be7a1100-0000-4000-a000-000000000005';
  u_eig_g    uuid := 'be7a1100-0000-4000-a000-000000000006';
  u_eig_o    uuid := 'be7a1100-0000-4000-a000-000000000007';
  u_eig_w    uuid := 'be7a1100-0000-4000-a000-000000000008';
  u_gewoon   uuid := 'be7a1100-0000-4000-a000-000000000009';
  u_beheer   uuid := 'be7a1100-0000-4000-a000-00000000000a';

  c_t uuid; c_l uuid; c_t2 uuid; c_d uuid; c_v uuid; c_g uuid; c_o uuid; c_w uuid;

  heeft_tabel  boolean;
  heeft_functie boolean;
  bron      text;
  gezien    text;
  tel       int;
  vlag      boolean;
  d_was     date;
  d_nu      date;
  afwijkingen int := 0;
  r text[] := '{}';
  regel text;
  deel  text[];

  -- Wat een niet-toetsbaar scenario meldt, zodat die tekst maar op één
  -- plek staat.
  nvt constant text := 'niet te toetsen: de betaalketen bestaat nog niet';
begin
  -- Alles gebeurt in een deeltransactie die we aan het eind expres
  -- laten klappen. Daardoor verdwijnt elke testrij weer, terwijl de
  -- uitslagen in `r` bewaard blijven — variabelen rollen niet terug.
  -- Zelfde opzet als tests/free-server-afscherming.test.sql.
  begin

    -- ══ 0. BESTAAT DE BETAALKETEN AL? ════════════════════════
    --  Deze controle staat vooraan omdat alle andere scenario's
    --  anders zouden stranden op "relation does not exist" en dan
    --  allemaal dezelfde nietszeggende fout zouden melden.
    select exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = 'betalingen')
      into heeft_tabel;
    select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = 'verwerk_betaling')
      into heeft_functie;

    if heeft_tabel and heeft_functie then
      r := array_append(r, '0§de tabel public.betalingen en de functie verwerk_betaling() bestaan§allebei aanwezig§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('0§de tabel public.betalingen en de functie verwerk_betaling() bestaan§tabel: '
        || case when heeft_tabel then 'ja' else 'NEE' end || ', functie: '
        || case when heeft_functie then 'ja' else 'NEE' end
        || '§WIJKT AF — hieronder is dan niets te meten'));
    end if;

    -- ══ OPBOUW ═══════════════════════════════════════════════
    insert into auth.users (id, email) values
      (u_eig_t,  'test-bet-testmodus@teamtakkie.test'),
      (u_eig_l,  'test-bet-live@teamtakkie.test'),
      (u_eig_t2, 'test-bet-testmodus-later@teamtakkie.test'),
      (u_eig_d,  'test-bet-dubbel@teamtakkie.test'),
      (u_eig_v,  'test-bet-verlenging@teamtakkie.test'),
      (u_eig_g,  'test-bet-geldigtot@teamtakkie.test'),
      (u_eig_o,  'test-bet-onbeperkt@teamtakkie.test'),
      (u_eig_w,  'test-bet-weg@teamtakkie.test'),
      (u_gewoon, 'test-bet-gewoon@teamtakkie.test'),
      (u_beheer, 'test-bet-beheerder@teamtakkie.test');

    insert into public.beheerders (gebruiker_id, notitie)
      values (u_beheer, 'test-beheerder (betaling-verwerken)');

    -- Elke vereniging via nieuwe_club(), want dat is de enige echte
    -- weg: die functie maakt club, eigenaar én de free-abonnementsrij
    -- in één keer. Een met de hand in elkaar gezette club zou een
    -- situatie toetsen die in het echt niet bestaat.
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_eig_t::text, true);
    c_t := public.nieuwe_club('Testclub testbetaling vroeg', 'Eigenaar T');
    perform set_config('request.jwt.claim.sub', u_eig_l::text, true);
    c_l := public.nieuwe_club('Testclub live', 'Eigenaar L');
    perform set_config('request.jwt.claim.sub', u_eig_t2::text, true);
    c_t2 := public.nieuwe_club('Testclub testbetaling laat', 'Eigenaar T2');
    perform set_config('request.jwt.claim.sub', u_eig_d::text, true);
    c_d := public.nieuwe_club('Testclub dubbele melding', 'Eigenaar D');
    perform set_config('request.jwt.claim.sub', u_eig_v::text, true);
    c_v := public.nieuwe_club('Testclub verlenging', 'Eigenaar V');
    perform set_config('request.jwt.claim.sub', u_eig_g::text, true);
    c_g := public.nieuwe_club('Testclub einddatum', 'Eigenaar G');
    perform set_config('request.jwt.claim.sub', u_eig_o::text, true);
    c_o := public.nieuwe_club('Testclub onbeperkt', 'Eigenaar O');
    perform set_config('request.jwt.claim.sub', u_eig_w::text, true);
    c_w := public.nieuwe_club('Testclub die wordt opgeheven', 'Eigenaar W');
    reset role;

    -- ══════════════════════════════════════════════════════════
    --  1. DE TABEL public.betalingen
    --  ─────────────────────────────────────────────────────────
    --  Dit is de boekhouding. Hij hoeft niets te kunnen; hij moet
    --  vooral niets kúnnen verliezen en door niemand te lezen zijn.
    -- ══════════════════════════════════════════════════════════
    if not heeft_tabel then
      afwijkingen := afwijkingen + 7;
      r := array_append(r, '1a§mollie_betaling_id is uniek (het slot tegen dubbel boeken)§' || nvt || '§WIJKT AF');
      r := array_append(r, '1b§club_id overleeft het verwijderen van een club (on delete SET NULL)§' || nvt || '§WIJKT AF');
      r := array_append(r, '1c§de clubnaam-op-moment-van-betalen staat er apart bij§' || nvt || '§WIJKT AF');
      r := array_append(r, '1d§rij-beveiliging (RLS) staat aan op betalingen§' || nvt || '§WIJKT AF');
      r := array_append(r, '1e§geen enkele schrijfregel voor gewone rollen§' || nvt || '§WIJKT AF');
      r := array_append(r, '1f§lezen mag alleen de beheerder (is_beheerder())§' || nvt || '§WIJKT AF');
      r := array_append(r, '1g§gedrag: ingelogde gebruiker schrijft er zelf in§' || nvt || '§WIJKT AF');
    else
      -- ── 1a. uniek betaalnummer ────────────────────────────────
      --  Dit is niet zomaar netheid: de hele bescherming tegen dubbel
      --  verwerken hangt eraan. Zonder unieke index kan dezelfde
      --  melding gewoon twee rijen maken en werkt blok 4 niet meer.
      select exists (
        select 1 from pg_index i
        join pg_class c on c.oid = i.indrelid
        join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
        where c.relname = 'betalingen' and i.indisunique
          and a.attname = 'mollie_betaling_id'
          and i.indnatts = 1)
        into vlag;
      if vlag then
        r := array_append(r, '1a§mollie_betaling_id is uniek (het slot tegen dubbel boeken)§ja§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '1a§mollie_betaling_id is uniek (het slot tegen dubbel boeken)§GEEN unieke index§WIJKT AF — dan kan dezelfde melding twee rijen maken');
      end if;

      -- ── 1b. de boekhouding overleeft een verwijderde club ─────
      --  abonnementen hangt met "on delete cascade" aan clubs
      --  (01-schema.sql regel 106). Datzelfde hier zou betekenen dat
      --  de boekhouding verdwijnt op precies het moment dat je hem
      --  nodig hebt: een club die opzegt en weg wil. Zie
      --  docs/avg-inventaris.md 8.4.
      select case confdeltype when 'n' then 'set null'
                              when 'c' then 'cascade'
                              when 'a' then 'no action'
                              when 'r' then 'restrict'
                              when 'd' then 'set default'
                              else confdeltype::text end
        into gezien
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_attribute a on a.attrelid = c.oid and a.attnum = con.conkey[1]
        where c.relname = 'betalingen' and con.contype = 'f' and a.attname = 'club_id'
        limit 1;
      if gezien = 'set null' then
        r := array_append(r, '1b§club_id overleeft het verwijderen van een club (on delete SET NULL)§set null§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('1b§club_id overleeft het verwijderen van een club (on delete SET NULL)§'
          || coalesce(gezien, 'geen verwijzing naar clubs gevonden')
          || '§WIJKT AF — de boekhouding verdwijnt dan met de club mee'));
      end if;

      -- ── 1c. de clubnaam apart ────────────────────────────────
      --  Zonder deze kolom is een betaling van een verwijderde club
      --  een bedrag zonder afzender. Een clubnaam is geen
      --  persoonsgegeven, dus hij mag blijven staan.
      select exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'betalingen'
                       and column_name in ('club_naam', 'clubnaam', 'club_naam_toen'))
        into vlag;
      if vlag then
        r := array_append(r, '1c§de clubnaam-op-moment-van-betalen staat er apart bij§ja§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '1c§de clubnaam-op-moment-van-betalen staat er apart bij§NEE§WIJKT AF — een verwijderde club laat dan een naamloos bedrag achter');
      end if;

      -- ── 1d. RLS aan ──────────────────────────────────────────
      select relrowsecurity into vlag from pg_class
        where oid = 'public.betalingen'::regclass;
      if vlag then
        r := array_append(r, '1d§rij-beveiliging (RLS) staat aan op betalingen§ja§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '1d§rij-beveiliging (RLS) staat aan op betalingen§NEE§WIJKT AF — dan ligt de hele betaallog open');
      end if;

      -- ── 1e. geen schrijfregels ───────────────────────────────
      --  Net als public.abonnementen en public.foutmeldingen: er is
      --  met opzet geen enkele regel voor insert, update of delete.
      --  Alleen security-definer-functies komen erin.
      select count(*) into tel from pg_policy
        where polrelid = 'public.betalingen'::regclass
          and polcmd in ('a', 'w', 'd', '*');
      if tel = 0 then
        r := array_append(r, '1e§geen enkele schrijfregel voor gewone rollen§0 regels voor insert/update/delete§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('1e§geen enkele schrijfregel voor gewone rollen§' || tel
          || ' regel(s) gevonden§WIJKT AF — dan kan iemand zijn eigen betaling verzinnen'));
      end if;

      -- ── 1f. lezen alleen voor de beheerder ───────────────────
      select string_agg(coalesce(pg_get_expr(polqual, polrelid), '(leeg)'), ' | ')
        into gezien
        from pg_policy where polrelid = 'public.betalingen'::regclass and polcmd = 'r';
      if gezien is not null and gezien like '%is_beheerder%' then
        r := array_append(r, '1f§lezen mag alleen de beheerder (is_beheerder())§' || gezien || '§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('1f§lezen mag alleen de beheerder (is_beheerder())§'
          || coalesce(gezien, 'geen leesregel') || '§WIJKT AF'));
      end if;

      -- ── 1g. en hetzelfde als gedrag, niet als vorm ───────────
      --  1e kijkt naar wat er in de catalogus staat; dit kijkt of het
      --  ook echt zo uitpakt. Een vergeten "grant" of een tweede regel
      --  ergens anders is alleen zo te zien.
      perform set_config('request.jwt.claim.sub', u_gewoon::text, true);
      set local role authenticated;
      begin
        insert into public.betalingen (mollie_betaling_id, club_id, pakket, termijn, modus, status)
          values ('tr_verzonnen_door_gebruiker', c_l, 'club', 'jaar', 'live', 'betaald');
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '1g§gedrag: ingelogde gebruiker schrijft er zelf in§GELUKT§<< LEK — iedereen kan zich dan een pakket toeschrijven');
      exception when insufficient_privilege then
        r := array_append(r, '1g§gedrag: ingelogde gebruiker schrijft er zelf in§GEWEIGERD door de beveiligingsregel§ZOALS VERWACHT');
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('1g§gedrag: ingelogde gebruiker schrijft er zelf in§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
      end;
      reset role;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  2. DE TWEE SLOTEN OP verwerk_betaling()
    --  ─────────────────────────────────────────────────────────
    --  Er zitten met opzet twee onafhankelijke sloten op deze functie,
    --  en dit blok toetst ze APART. Dat is geen overdaad, en het is de
    --  moeite waard om uit te leggen waarom.
    --
    --  SLOT 1 is het rechtenslot van Postgres zelf:
    --      revoke execute ... from public, anon, authenticated;
    --      grant  execute ... to service_role;
    --  Wie het niet mag, struikelt daarover vóórdat er ook maar één
    --  regel van de functie draait. Scenario 2a en 2b.
    --
    --  SLOT 2 zit ín de functie: hij kijkt zelf of de aanroeper de
    --  service_role is. Dat lijkt dubbelop — totdat je bedenkt hoe
    --  slot 1 verdwijnt. Niet door kwade opzet, maar hierdoor:
    --
    --      drop function public.verwerk_betaling(...);
    --      create function public.verwerk_betaling(...);
    --
    --  Een nieuw aangemaakte functie krijgt in Postgres standaard
    --  execute-recht voor PUBLIC. Wie dus ooit "drop + create" schrijft
    --  in plaats van "create or replace" — en dat is nodig zodra er een
    --  parameter bij komt — zet slot 1 open zonder dat er iets
    --  misgaat, zonder foutmelding, zonder dat iemand het ziet.
    --
    --  HET LASTIGE: 2a HOUDT OOK STAND ALS SLOT 2 NIET BESTAAT.
    --  Slot 1 slaat immers als eerste toe. Een test die alleen 2a doet,
    --  meet dus slot 1 twee keer en slot 2 nooit — precies de val die
    --  bij scenario 8a in tests/free-server-afscherming.test.sql al een
    --  keer is opgetreden.
    --
    --  Daarom doet 2c iets ongebruikelijks: hij geeft het execute-recht
    --  TIJDELIJK terug aan authenticated, precies zoals een verdwaalde
    --  "drop + create" dat zou doen, en kijkt dan wat er gebeurt. Gaat
    --  de aanroep nu gewoon door, dan bestaat slot 2 niet. Struikelt
    --  hij op de eigen foutmelding van de functie (en niet meer op
    --  42501 van Postgres), dan is bewezen dat het een echt tweede,
    --  onafhankelijk slot is. De grant wordt meteen weer teruggedraaid,
    --  en rolt sowieso mee terug met de hele test.
    -- ══════════════════════════════════════════════════════════
    if not heeft_functie then
      afwijkingen := afwijkingen + 4;
      r := array_append(r, '2a§slot 1: een ingelogde gebruiker roept verwerk_betaling() aan§' || nvt || '§WIJKT AF');
      r := array_append(r, '2b§slot 1 in de catalogus: wie mag deze functie aanroepen§' || nvt || '§WIJKT AF');
      r := array_append(r, '2c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen§' || nvt || '§WIJKT AF');
      r := array_append(r, '2d§de echte weg: service_role mag het wél§' || nvt || '§WIJKT AF');
    else
      -- ── 2a. slot 1 in de praktijk ────────────────────────────
      perform set_config('request.jwt.claim.sub', u_gewoon::text, true);
      perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
      set local role authenticated;
      begin
        perform public.verwerk_betaling('tr_indringer_1', c_l, 'club', 'jaar', now(), 'live', null);
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '2a§slot 1: een ingelogde gebruiker roept verwerk_betaling() aan§GELUKT§<< LEK — gratis abonnement voor wie de naam van de functie kent');
      exception when insufficient_privilege then
        r := array_append(r, '2a§slot 1: een ingelogde gebruiker roept verwerk_betaling() aan§GEWEIGERD door Postgres zelf (42501)§ZOALS VERWACHT');
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2a§slot 1: een ingelogde gebruiker roept verwerk_betaling() aan§GEWEIGERD, maar niet door het rechtenslot: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF — slot 1 ontbreekt; alleen slot 2 hield het tegen'));
      end;
      reset role;

      -- ── 2b. slot 1 in de catalogus ───────────────────────────
      --  Vier vragen tegelijk, want "authenticated mag het niet" is
      --  niet genoeg: anon en PUBLIC moeten het óók niet mogen, en
      --  service_role moet het juist wél.
      --  De handtekening uit de catalogus halen in plaats van hem hier
      --  over te typen: komt er ooit een parameter bij, dan blijft deze
      --  controle vanzelf kloppen in plaats van stilletjes niets meer
      --  te meten. ::regprocedure geeft precies de vorm die
      --  has_function_privilege() verwacht (typen zonder namen).
      select p.oid::regprocedure::text into bron
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1;
      declare
        sig text := bron;
        mag_auth boolean; mag_anon boolean; mag_pub boolean; mag_srv boolean;
      begin
        mag_auth := has_function_privilege('authenticated', sig, 'execute');
        mag_anon := has_function_privilege('anon',          sig, 'execute');
        mag_pub  := has_function_privilege('public',        sig, 'execute');
        mag_srv  := has_function_privilege('service_role',  sig, 'execute');
        if not mag_auth and not mag_anon and not mag_pub and mag_srv then
          r := array_append(r, '2b§slot 1 in de catalogus: wie mag deze functie aanroepen§alleen service_role§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('2b§slot 1 in de catalogus: wie mag deze functie aanroepen§'
            || 'authenticated=' || mag_auth || ', anon=' || mag_anon
            || ', public=' || mag_pub || ', service_role=' || mag_srv
            || '§WIJKT AF — alleen service_role hoort dit te mogen'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2b§slot 1 in de catalogus: wie mag deze functie aanroepen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 2c. slot 2, helemaal apart ───────────────────────────
      declare
        sig text;
      begin
        select p.oid::regprocedure::text into sig
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1;

        -- Precies wat een verdwaalde "drop + create" zou achterlaten.
        execute 'grant execute on function ' || sig || ' to authenticated';

        perform set_config('request.jwt.claim.sub', u_gewoon::text, true);
        perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
        set local role authenticated;
        begin
          perform public.verwerk_betaling('tr_indringer_2', c_l, 'club', 'jaar', now(), 'live', null);
          reset role;
          afwijkingen := afwijkingen + 1;
          r := array_append(r, '2c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen§GELUKT§<< LEK — er is maar ÉÉN slot; valt dat weg, dan ligt alles open');
        exception when insufficient_privilege then
          reset role;
          afwijkingen := afwijkingen + 1;
          r := array_append(r, '2c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen§nog steeds 42501§WIJKT AF — de grant kwam niet aan; deze meting zegt niets');
        when others then
          reset role;
          r := array_append(r, ('2c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen§GEWEIGERD door de functie zelf: '
            || sqlerrm || '§ZOALS VERWACHT'));
        end;
        reset role;
        execute 'revoke execute on function ' || sig || ' from authenticated';
      exception when others then
        reset role;
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen§de test zelf liep vast: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 2d. en de echte weg doet het wel ─────────────────────
      --  Zonder deze omgekeerde controle zou een functie die ALTIJD
      --  weigert alle scenario's hierboven halen.
      perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
      set local role service_role;
      begin
        perform public.verwerk_betaling('tr_onbekend_stil', null, 'coach', 'maand', now(), 'live', null);
        reset role;
        r := array_append(r, '2d§de echte weg: service_role mag het wél§GELUKT§ZOALS VERWACHT');
      exception when others then
        reset role;
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2d§de echte weg: service_role mag het wél§MISLUKT: ' || sqlerrm
          || '§WIJKT AF — dan kan de betaalketen zelf niets meer verwerken'));
      end;
      reset role;
    end if;

    -- Vanaf hier praten we als de servercode: de edge function
    -- betaling-melding gebruikt de service-sleutel van Supabase, en die
    -- komt binnen met deze rol in zijn token.
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

    -- ══════════════════════════════════════════════════════════
    --  3. TEST- EN ECHTE BETALINGEN DOOR ELKAAR
    --  ─────────────────────────────────────────────────────────
    --  Mollie geeft twee sleutelparen. Met de testsleutel maak je een
    --  geslaagde betaling van € 0,- in tien seconden, zonder bank. Dat
    --  is precies de bedoeling — zolang zo'n betaling niet als echte
    --  betaling wordt geboekt.
    --
    --  DE REGEL DIE HIER WORDT VASTGELEGD, EN WAAROM DEZE
    --  Een testbetaling kent geen pakket toe zodra er ÉRGENS in de
    --  tabel een verwerkte live-betaling staat. Dus niet "voor deze
    --  club", maar voor de hele installatie.
    --
    --  Er waren twee kandidaten:
    --    · per club  — een testbetaling telt niet als déze club al ooit
    --                  echt betaald heeft;
    --    · voor alles — een testbetaling telt niet meer zodra er waar
    --                  dan ook echt geld is binnengekomen.
    --
    --  De tweede is eenvoudiger (één vraag, geen club nodig) en
    --  strenger op precies de plek waar het misgaat: bij de per-club-
    --  regel blijft een gloednieuwe club onbeperkt open voor
    --  testbetalingen, en dat is nou juist de club die een aanvaller
    --  zou aanmaken. "Er is ooit echt geld binnengekomen" is bovendien
    --  een eerlijke omschrijving van "deze installatie staat live".
    --
    --  Wat het kost, eerlijk: Evan kan na de eerste echte betaling niet
    --  meer met de testsleutel een pakket toekennen op productie. Dat
    --  hoort ook niet — daar is zet_pakket() voor, en daar is de
    --  testomgeving voor.
    --
    --  LET OP: dit is een keuze, geen gegeven. Wil Evan de per-club-
    --  regel, dan verandert scenario 3c en verder niets.
    -- ══════════════════════════════════════════════════════════
    if not (heeft_tabel and heeft_functie) then
      afwijkingen := afwijkingen + 4;
      r := array_append(r, '3a§testbetaling terwijl er nog nooit echt geld binnenkwam: pakket toekennen§' || nvt || '§WIJKT AF');
      r := array_append(r, '3b§de eerste echte (live) betaling§' || nvt || '§WIJKT AF');
      r := array_append(r, '3c§testbetaling NA de eerste echte betaling: geen pakket§' || nvt || '§WIJKT AF');
      r := array_append(r, '3d§die geweigerde testbetaling is wél in de boeken gezet§' || nvt || '§WIJKT AF');
    else
      -- ── 3a. testbetaling vóór er ooit live geld binnenkwam ───
      --  Deze moet WEL werken: anders kan Evan de hele keten nooit een
      --  keer helemaal doorlopen voordat hij live gaat.
      begin
        perform public.verwerk_betaling('tr_test_vroeg', c_t, 'coach', 'maand', now(), 'test', null);
        select pakket into gezien from public.abonnementen where club_id = c_t;
        if gezien = 'coach' then
          r := array_append(r, '3a§testbetaling terwijl er nog nooit echt geld binnenkwam: pakket toekennen§coach§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('3a§testbetaling terwijl er nog nooit echt geld binnenkwam: pakket toekennen§'
            || coalesce(gezien, 'niets') || '§WIJKT AF — dan is de keten vóór livegang niet te proberen'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('3a§testbetaling terwijl er nog nooit echt geld binnenkwam: pakket toekennen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 3b. de eerste echte betaling ─────────────────────────
      begin
        perform public.verwerk_betaling('tr_live_eerste', c_l, 'club', 'jaar', now(), 'live', null);
        select pakket into gezien from public.abonnementen where club_id = c_l;
        if gezien = 'club' then
          r := array_append(r, '3b§de eerste echte (live) betaling§club§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('3b§de eerste echte (live) betaling§' || coalesce(gezien, 'niets') || '§WIJKT AF'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('3b§de eerste echte (live) betaling§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 3c. en nu telt een testbetaling niet meer ────────────
      begin
        perform public.verwerk_betaling('tr_test_laat', c_t2, 'club', 'jaar', now(), 'test', null);
        select pakket into gezien from public.abonnementen where club_id = c_t2;
        if gezien = 'free' then
          r := array_append(r, '3c§testbetaling NA de eerste echte betaling: geen pakket§blijft free§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('3c§testbetaling NA de eerste echte betaling: geen pakket§'
            || coalesce(gezien, 'niets')
            || '§<< LEK — een gratis abonnement met de testsleutel van Mollie'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('3c§testbetaling NA de eerste echte betaling: geen pakket§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 3d. maar hij verdwijnt niet uit de boeken ────────────
      --  Stil weggooien zou het onmogelijk maken om later te zien wat
      --  er gebeurd is. De rij hoort er te staan, herkenbaar als
      --  afgehandeld.
      begin
        select status into gezien from public.betalingen where mollie_betaling_id = 'tr_test_laat';
        select (verwerkt_op is not null) into vlag from public.betalingen where mollie_betaling_id = 'tr_test_laat';
        if gezien is not null and coalesce(vlag, false) and gezien <> 'betaald' then
          r := array_append(r, ('3d§die geweigerde testbetaling is wél in de boeken gezet§status ' || gezien || ', verwerkt§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('3d§die geweigerde testbetaling is wél in de boeken gezet§status '
            || coalesce(gezien, 'GEEN RIJ') || ', verwerkt=' || coalesce(vlag::text, '-')
            || '§WIJKT AF — of hij is niet geboekt, of hij staat er als gewone betaling in'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('3d§die geweigerde testbetaling is wél in de boeken gezet§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  4. DEZELFDE MELDING TWEE KEER
    --  ─────────────────────────────────────────────────────────
    --  Mollie stuurt een webhook opnieuw als het antwoord uitblijft.
    --  Dat is normaal gedrag, geen storing. Het patroon dat daartegen
    --  beschermt is één opdracht die tegelijk claimt en bijwerkt:
    --
    --      update public.betalingen
    --         set status='betaald', verwerkt_op=now()
    --       where mollie_betaling_id = ... and verwerkt_op is null
    --      returning ...;
    --
    --  Raakt die nul rijen, dan doet de functie verder niets — geen
    --  fout, gewoon stil klaar. Twee tegelijk binnenkomende meldingen
    --  worden door Postgres achter elkaar gezet op het rijslot, en de
    --  tweede ziet dan verwerkt_op al staan.
    -- ══════════════════════════════════════════════════════════
    if not (heeft_tabel and heeft_functie) then
      afwijkingen := afwijkingen + 3;
      r := array_append(r, '4a§eerste melding: pakket erop, einddatum een maand verder§' || nvt || '§WIJKT AF');
      r := array_append(r, '4b§diezelfde melding nog een keer: einddatum blijft staan§' || nvt || '§WIJKT AF');
      r := array_append(r, '4c§en er is geen tweede rij in de boeken bij gekomen§' || nvt || '§WIJKT AF');
    else
      -- De rij zoals betaling-starten hem neerzet: aangemaakt, nog niet
      -- verwerkt. Dit is de gewone weg bij een eerste betaling.
      insert into public.betalingen (mollie_betaling_id, club_id, club_naam, pakket, termijn, modus, status)
        values ('tr_dubbel', c_d, 'Testclub dubbele melding', 'coach', 'maand', 'live', 'open');

      begin
        perform public.verwerk_betaling('tr_dubbel', c_d, 'coach', 'maand', now(), 'live', null);
        select geldig_tot into d_was from public.abonnementen where club_id = c_d;
        select pakket into gezien from public.abonnementen where club_id = c_d;
        if gezien = 'coach' and d_was = (current_date + interval '1 month')::date then
          r := array_append(r, ('4a§eerste melding: pakket erop, einddatum een maand verder§coach tot ' || d_was || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('4a§eerste melding: pakket erop, einddatum een maand verder§'
            || coalesce(gezien, 'niets') || ' tot ' || coalesce(d_was::text, 'niets') || '§WIJKT AF'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4a§eerste melding: pakket erop, einddatum een maand verder§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      begin
        perform public.verwerk_betaling('tr_dubbel', c_d, 'coach', 'maand', now(), 'live', null);
        select geldig_tot into d_nu from public.abonnementen where club_id = c_d;
        if d_nu is not distinct from d_was then
          r := array_append(r, ('4b§diezelfde melding nog een keer: einddatum blijft staan§nog steeds ' || coalesce(d_nu::text, 'niets') || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('4b§diezelfde melding nog een keer: einddatum blijft staan§van '
            || coalesce(d_was::text, 'niets') || ' naar ' || coalesce(d_nu::text, 'niets')
            || '§<< LEK — twee maanden voor één betaling'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4b§diezelfde melding nog een keer: einddatum blijft staan§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      begin
        select count(*) into tel from public.betalingen where mollie_betaling_id = 'tr_dubbel';
        if tel = 1 then
          r := array_append(r, '4c§en er is geen tweede rij in de boeken bij gekomen§1 rij§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('4c§en er is geen tweede rij in de boeken bij gekomen§' || tel || ' rijen§WIJKT AF'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4c§en er is geen tweede rij in de boeken bij gekomen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  5. EEN VERLENGING DIE UIT HET NIETS BINNENKOMT
    --  ─────────────────────────────────────────────────────────
    --  Zie de uitleg bovenaan dit bestand. Mollie Subscriptions
    --  incasseert zelf en meldt een betaalnummer dat hier nog nooit is
    --  langsgekomen. De draad terug naar de club is het Mollie-
    --  klantnummer (cst_…) dat bij het abonnement staat.
    --
    --  Dit blok is bewust de enige plek waar p_club NULL is: zo is
    --  meteen bewezen dat de functie de club echt zelf opzoekt en niet
    --  stiekem op de meegegeven club leunt.
    -- ══════════════════════════════════════════════════════════
    if not (heeft_tabel and heeft_functie) then
      afwijkingen := afwijkingen + 4;
      r := array_append(r, '5a§verlenging op een onbekend betaalnummer, herkend aan het Mollie-klantnummer§' || nvt || '§WIJKT AF');
      r := array_append(r, '5b§de functie heeft de boekingsregel zelf aangemaakt§' || nvt || '§WIJKT AF');
      r := array_append(r, '5c§een verlenging is óók maar één keer goed§' || nvt || '§WIJKT AF');
      r := array_append(r, '5d§melding met een onbekend klantnummer: stil klaar, geen pakket§' || nvt || '§WIJKT AF');
    else
      -- De uitgangssituatie: een club die vorige maand via iDEAL is
      -- begonnen. Klantnummer bekend, abonnement loopt nog tien dagen.
      update public.abonnementen
         set pakket = 'coach', geldig_tot = current_date + 10, mollie_klant_id = 'cst_testklant_v'
       where club_id = c_v;

      begin
        perform public.verwerk_betaling('tr_verlenging_1', null, 'coach', 'maand', now(), 'live', 'cst_testklant_v');
        select geldig_tot into d_nu from public.abonnementen where club_id = c_v;
        if d_nu = (current_date + 10 + interval '1 month')::date then
          r := array_append(r, ('5a§verlenging op een onbekend betaalnummer, herkend aan het Mollie-klantnummer§tot ' || d_nu || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('5a§verlenging op een onbekend betaalnummer, herkend aan het Mollie-klantnummer§geldig_tot = '
            || coalesce(d_nu::text, 'niets') || ', verwacht ' || (current_date + 10 + interval '1 month')::date
            || '§WIJKT AF — dan wordt er wél een eerste maand verwerkt en geen enkele verlenging'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('5a§verlenging op een onbekend betaalnummer, herkend aan het Mollie-klantnummer§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      begin
        select count(*) into tel from public.betalingen
          where mollie_betaling_id = 'tr_verlenging_1' and verwerkt_op is not null and club_id = c_v;
        if tel = 1 then
          r := array_append(r, '5b§de functie heeft de boekingsregel zelf aangemaakt§1 verwerkte rij, aan de juiste club§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('5b§de functie heeft de boekingsregel zelf aangemaakt§' || tel
            || ' passende rijen§WIJKT AF — de boekhouding mist dan elke verlenging'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('5b§de functie heeft de boekingsregel zelf aangemaakt§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 5c. ook een verlenging maar één keer ─────────────────
      --  Het slot uit blok 4 moet ook langs deze ingang werken. Doet
      --  het dat niet, dan is een dubbele webhook op een verlenging
      --  gratis een maand extra.
      begin
        d_was := d_nu;
        perform public.verwerk_betaling('tr_verlenging_1', null, 'coach', 'maand', now(), 'live', 'cst_testklant_v');
        select geldig_tot into d_nu from public.abonnementen where club_id = c_v;
        select count(*) into tel from public.betalingen where mollie_betaling_id = 'tr_verlenging_1';
        if d_nu is not distinct from d_was and tel = 1 then
          r := array_append(r, ('5c§een verlenging is óók maar één keer goed§nog steeds tot ' || coalesce(d_nu::text, 'niets') || ', 1 rij§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('5c§een verlenging is óók maar één keer goed§van ' || coalesce(d_was::text, 'niets')
            || ' naar ' || coalesce(d_nu::text, 'niets') || ', ' || tel || ' rij(en)§<< LEK'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('5c§een verlenging is óók maar één keer goed§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 5d. een klantnummer dat hier niet hoort ──────────────
      --  Geen fout, gewoon niets doen. Een fout zou Mollie aan het
      --  opnieuw proberen zetten, en er is niets om opnieuw te proberen.
      begin
        select count(*) into tel from public.betalingen;
        perform public.verwerk_betaling('tr_onbekende_klant', null, 'club', 'jaar', now(), 'live', 'cst_bestaat_niet');
        select count(*) - tel into tel from public.betalingen;
        if tel = 0 then
          r := array_append(r, '5d§melding met een onbekend klantnummer: stil klaar, geen pakket§geen fout, geen nieuwe rij§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('5d§melding met een onbekend klantnummer: stil klaar, geen pakket§' || tel
            || ' rij(en) erbij§WIJKT AF — een boeking zonder club'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('5d§melding met een onbekend klantnummer: stil klaar, geen pakket§gaf een FOUT: ' || sqlerrm
          || '§WIJKT AF — Mollie blijft dan opnieuw proberen'));
      end;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  6. WAAR DE NIEUWE EINDDATUM VANDAAN KOMT
    --  ─────────────────────────────────────────────────────────
    --  Twee gevallen, en het verschil kost een klant een dag:
    --    · loopt het abonnement nog  -> tel op bij de einddatum
    --    · is het al verlopen        -> tel op bij vandaag
    --  Wie een dag te vroeg verlengt, hoort geen dag kwijt te raken.
    --
    --  En één geval dat makkelijk over het hoofd wordt gezien: een
    --  vereniging die van Evan onbeperkt toegang heeft gekregen
    --  (pakket coach of club, geen einddatum). Rekent de functie daar
    --  "vandaag + een maand" van, dan wordt onbeperkt ineens één maand.
    --  Dat is een afwaardering door een betaling.
    -- ══════════════════════════════════════════════════════════
    if not (heeft_tabel and heeft_functie) then
      afwijkingen := afwijkingen + 4;
      r := array_append(r, '6a§abonnement loopt nog: optellen bij de einddatum§' || nvt || '§WIJKT AF');
      r := array_append(r, '6b§abonnement al verlopen: optellen bij vandaag§' || nvt || '§WIJKT AF');
      r := array_append(r, '6c§jaarbetaling schuift een jaar op§' || nvt || '§WIJKT AF');
      r := array_append(r, '6d§onbeperkt blijft onbeperkt§' || nvt || '§WIJKT AF');
      r := array_append(r, '6e§een termijn die niet bestaat§' || nvt || '§WIJKT AF');
    else
      -- ── 6a. nog geldig ───────────────────────────────────────
      update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 40 where club_id = c_g;
      begin
        perform public.verwerk_betaling('tr_datum_1', c_g, 'coach', 'maand', now(), 'live', null);
        select geldig_tot into d_nu from public.abonnementen where club_id = c_g;
        if d_nu = (current_date + 40 + interval '1 month')::date then
          r := array_append(r, ('6a§abonnement loopt nog: optellen bij de einddatum§tot ' || d_nu || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('6a§abonnement loopt nog: optellen bij de einddatum§' || coalesce(d_nu::text, 'niets')
            || ', verwacht ' || (current_date + 40 + interval '1 month')::date
            || '§WIJKT AF — de klant raakt zo de dagen kwijt die hij al had betaald'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('6a§abonnement loopt nog: optellen bij de einddatum§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 6b. al verlopen ──────────────────────────────────────
      update public.abonnementen set pakket = 'coach', geldig_tot = current_date - 200 where club_id = c_g;
      begin
        perform public.verwerk_betaling('tr_datum_2', c_g, 'coach', 'maand', now(), 'live', null);
        select geldig_tot into d_nu from public.abonnementen where club_id = c_g;
        if d_nu = (current_date + interval '1 month')::date then
          r := array_append(r, ('6b§abonnement al verlopen: optellen bij vandaag§tot ' || d_nu || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('6b§abonnement al verlopen: optellen bij vandaag§' || coalesce(d_nu::text, 'niets')
            || ', verwacht ' || (current_date + interval '1 month')::date
            || '§WIJKT AF — een oude einddatum mag niet blijven doortellen'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('6b§abonnement al verlopen: optellen bij vandaag§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 6c. jaarbetaling ─────────────────────────────────────
      update public.abonnementen set pakket = 'free', geldig_tot = null where club_id = c_g;
      begin
        perform public.verwerk_betaling('tr_datum_3', c_g, 'club', 'jaar', now(), 'live', null);
        select geldig_tot into d_nu from public.abonnementen where club_id = c_g;
        select pakket into gezien from public.abonnementen where club_id = c_g;
        if d_nu = (current_date + interval '1 year')::date and gezien = 'club' then
          r := array_append(r, ('6c§jaarbetaling schuift een jaar op§club tot ' || d_nu || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('6c§jaarbetaling schuift een jaar op§' || coalesce(gezien, 'niets') || ' tot '
            || coalesce(d_nu::text, 'niets') || ', verwacht club tot ' || (current_date + interval '1 year')::date || '§WIJKT AF'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('6c§jaarbetaling schuift een jaar op§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 6d. onbeperkt blijft onbeperkt ───────────────────────
      update public.abonnementen set pakket = 'club', geldig_tot = null where club_id = c_o;
      begin
        perform public.verwerk_betaling('tr_datum_4', c_o, 'club', 'jaar', now(), 'live', null);
        select geldig_tot into d_nu from public.abonnementen where club_id = c_o;
        if d_nu is null then
          r := array_append(r, '6d§onbeperkt blijft onbeperkt§geldig_tot blijft leeg§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('6d§onbeperkt blijft onbeperkt§geldig_tot werd ' || d_nu
            || '§WIJKT AF — een betaling waardeert deze club dan juist AF'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('6d§onbeperkt blijft onbeperkt§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 6e. een termijn die niet bestaat ─────────────────────
      --  Hier hoort de functie wél te klagen. Een onbekende termijn is
      --  geen situatie om stil voorbij te laten gaan: dan staat er een
      --  betaling in de boeken waar niemand een einddatum bij kan
      --  bedenken.
      begin
        perform public.verwerk_betaling('tr_datum_5', c_g, 'club', 'kwartaal', now(), 'live', null);
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '6e§een termijn die niet bestaat§GELUKT§<< dit hoort te mislukken — welke einddatum zou dat moeten zijn?');
      exception when raise_exception then
        r := array_append(r, ('6e§een termijn die niet bestaat§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('6e§een termijn die niet bestaat§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
      end;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  7. DE VORM VAN HET SLOT, NIET ALLEEN HET GEDRAG
    --  ─────────────────────────────────────────────────────────
    --  Blok 4 stuurt twee meldingen achter elkaar. Dat is niet
    --  hetzelfde als twee meldingen tegelijk, en twee gelijktijdige
    --  verbindingen zijn vanuit één SQL-bestand niet na te bootsen.
    --
    --  Wat wél te toetsen is, is het enige stukje SQL dat het verschil
    --  maakt: de "and verwerkt_op is null" in de where van de update.
    --  Dát is wat de tweede, wachtende melding tegenhoudt nadat
    --  Postgres het rijslot heeft vrijgegeven. Een implementatie die
    --  eerst leest en daarna schrijft ("select ... if verwerkt_op is
    --  null then update ...") haalt blok 4 gewoon, en gaat bij twee
    --  gelijktijdige meldingen alsnog twee keer boeken.
    -- ══════════════════════════════════════════════════════════
    if not heeft_functie then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '7a§het claimen en bijwerken gebeurt in één opdracht§' || nvt || '§WIJKT AF');
    else
      select pg_get_functiondef(p.oid) into bron
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1;
      if bron is not null
         and bron ~* 'update\s+(public\.)?betalingen(.|\n)*?where(.|\n)*?verwerkt_op\s+is\s+null' then
        r := array_append(r, '7a§het claimen en bijwerken gebeurt in één opdracht§de update heeft "verwerkt_op is null" in zijn where§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '7a§het claimen en bijwerken gebeurt in één opdracht§NIET gevonden§WIJKT AF — twee meldingen tegelijk worden dan allebei geboekt');
      end if;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  8. DE BOEKHOUDING OVERLEEFT EEN OPGEHEVEN CLUB
    --  ─────────────────────────────────────────────────────────
    --  1b kijkt of het zo in de tabel staat; dit doet het echt. Een
    --  club verwijderen is precies het moment waarop je de boekhouding
    --  nodig hebt — bij een geschil over wat er betaald is, of bij de
    --  belastingaangifte over dat jaar.
    -- ══════════════════════════════════════════════════════════
    if not (heeft_tabel and heeft_functie) then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '8a§club verwijderd: de betaling blijft staan, met de naam erbij§' || nvt || '§WIJKT AF');
    else
      begin
        perform public.verwerk_betaling('tr_wordt_wees', c_w, 'coach', 'jaar', now(), 'live', null);
        delete from public.clubs where id = c_w;
        select count(*) into tel from public.betalingen where mollie_betaling_id = 'tr_wordt_wees';
        select club_naam into gezien from public.betalingen where mollie_betaling_id = 'tr_wordt_wees';
        select (club_id is null) into vlag from public.betalingen where mollie_betaling_id = 'tr_wordt_wees';
        if tel = 1 and coalesce(vlag, false) and coalesce(gezien, '') <> '' then
          r := array_append(r, ('8a§club verwijderd: de betaling blijft staan, met de naam erbij§rij blijft, club_id leeg, naam "' || gezien || '"§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('8a§club verwijderd: de betaling blijft staan, met de naam erbij§' || tel
            || ' rij(en), club_id leeg=' || coalesce(vlag::text, '-') || ', naam="' || coalesce(gezien, '') || '"'
            || '§WIJKT AF — de boekhouding verdwijnt met de club mee'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('8a§club verwijderd: de betaling blijft staan, met de naam erbij§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  9. ALLEEN DE BEHEERDER LEEST DE BOEKEN
    -- ══════════════════════════════════════════════════════════
    if not heeft_tabel then
      afwijkingen := afwijkingen + 2;
      r := array_append(r, '9a§gewone ingelogde gebruiker leest de betaallog§' || nvt || '§WIJKT AF');
      r := array_append(r, '9b§de beheerder leest de betaallog wél§' || nvt || '§WIJKT AF');
    else
      perform set_config('request.jwt.claims', '', true);
      perform set_config('request.jwt.claim.sub', u_eig_l::text, true);
      set local role authenticated;
      begin
        select count(*) into tel from public.betalingen;
        reset role;
        if tel = 0 then
          r := array_append(r, '9a§gewone ingelogde gebruiker leest de betaallog§0 rijen zichtbaar§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('9a§gewone ingelogde gebruiker leest de betaallog§' || tel
            || ' rijen zichtbaar§<< LEK — de betaalgeschiedenis van andere clubs'));
        end if;
      exception when others then
        reset role;
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('9a§gewone ingelogde gebruiker leest de betaallog§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      perform set_config('request.jwt.claim.sub', u_beheer::text, true);
      set local role authenticated;
      begin
        select count(*) into tel from public.betalingen;
        reset role;
        if tel > 0 then
          r := array_append(r, ('9b§de beheerder leest de betaallog wél§' || tel || ' rijen zichtbaar§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, '9b§de beheerder leest de betaallog wél§0 rijen zichtbaar§WIJKT AF — dan is de boekhouding voor niemand te zien');
        end if;
      exception when others then
        reset role;
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('9b§de beheerder leest de betaallog wél§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;
    end if;

    reset role;

    -- Hier laten we de deeltransactie expres klappen.
    raise exception 'TT_TEST_KLAAR';
  exception when others then
    reset role;
    if sqlerrm <> 'TT_TEST_KLAAR' then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('!§de test zelf liep vast§' || sqlerrm || '§WIJKT AF'));
    end if;
  end;

  foreach regel in array r loop
    deel := string_to_array(regel, '§');
    insert into tt_uitslag_betaling values (deel[1], deel[2], deel[3], deel[4]);
  end loop;

  if afwijkingen = 0 then
    insert into tt_uitslag_betaling values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_betaling values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af',
      'ZIE docs/avg-inventaris.md 8.4 en het ontwerp van de betaalketen');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_betaling
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
