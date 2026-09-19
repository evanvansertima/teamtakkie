-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: wisselen tussen Coach en Club
--                     (downgrade gratis, upgrade naar rato)
--  ─────────────────────────────────────────────────────────────
--  Draai dit lokaal, zonder Supabase aan te raken:
--
--      sh tests/sql-lokaal/draai.sh tests/abonnement-wisselen.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql \
--          server/19-mollie-subscription.sql server/20-abonnement-wisselen.sql
--
--  Zolang server/20-abonnement-wisselen.sql nog niet bestaat, laat je
--  dat laatste bestand weg. De test is dan ROOD — dat hoort zo, zie
--  "WAAROM DEZE TEST NU ROOD IS" verderop.
--
--  Het mag ook in de SQL Editor van Supabase: dit hele bestand plakken
--  en op Run klikken. De test maakt zijn eigen verenigingen,
--  nepaccounts en wisselregels aan en draait alles aan het eind terug.
--  Er blijft niets van achter.
--
--  De uitslag komt als TABEL terug. In de kolom "oordeel" hoort overal
--  ZOALS VERWACHT te staan.
--
--  ─────────────────────────────────────────────────────────────
--  WAAR HET HIER OM GAAT — HET PROBLEEM DAT EVAN VOND
--
--  Elke klik op "Overstappen" startte een gewone nieuwe betaling. En
--  een gewone betaling telt in public.verwerk_betaling() een hele
--  periode op bij geldig_tot. Twee keer klikken gaf dus twee maanden
--  extra in plaats van één wissel van pakket. Daar staat nu een noodrem
--  op (betaling-starten weigert met 409 zolang er een betaald pakket
--  loopt); deze test hoort bij het werk dat die noodrem weer opheft.
--
--  DE ZIN WAAR HET OM DRAAIT, EN DIE IN TWEE SCENARIO'S STAAT:
--
--      BIJ EEN WISSEL BLIJFT geldig_tot ONGEWIJZIGD.
--
--  Scenario 15 (downgrade) en 16 (betaalde upgrade) meten precies dat,
--  vóór en ná, op de dag nauwkeurig. Wie per ongeluk de gewone
--  verlengingslogica overneemt in verwerk_wissel_betaling(), maakt
--  scenario 16 rood. Dat is met opzet zo gebouwd en het is nagemeten
--  (zie de tabel met opzettelijke fouten in het verslag bij deze test).
--
--  ─────────────────────────────────────────────────────────────
--  DE TWEEDE ZIN: EEN WISSELBETALING DIE WIJ NIET HEBBEN AANGEVRAAGD,
--  BESTAAT NIET
--
--  verwerk_wissel_betaling() kent een pakket ALLEEN toe als er al een
--  openstaande claim in public.abonnement_wissels staat met precies dit
--  betaalnummer. Bestaat die claim niet, dan gebeurt er niets — geen
--  fout, geen pakket. De metadata van een Mollie-betaling is nooit
--  bewijs: die is door de aanvrager mee te geven. Scenario 17.
--
--  ─────────────────────────────────────────────────────────────
--  WAT HIER NIET GETEST WORDT, EN WAAROM — EERLIJK
--
--  1. De REKENSOM (verrekeningCent) staat in TypeScript, niet in SQL.
--     Die wordt getoetst in supabase/functions/_gedeeld/wissel.test.ts
--     met "deno test supabase/functions/". Hier staan alleen de datums:
--     hoeveel dagen heeft deze periode, en hoeveel zijn er nog over.
--
--  2. De BESLISSING (mag deze club wisselen, en is het gratis of
--     betaald) valt in de edge function, op grond van de feiten die
--     wissel_gegevens() teruggeeft. Deze test toetst dus of die FEITEN
--     kloppen (blok 2 en blok 24); de beslissing zelf staat in
--     wissel.test.ts.
--
--  3. Er wordt hier niet met Mollie gepraat. Dat er na een geslaagde
--     wissel een PATCH naar het nieuwe bedrag moet, en dat
--     mollie_bedrag_cent pas DAARNA wordt bijgewerkt, is gedrag van de
--     edge function.
--
--  4. HET BETAALNUMMER BIJ DE CLAIM ZETTEN. De claim wordt gemaakt
--     vóórdat de betaling bij Mollie bestaat (dat is het hele punt van
--     de claim), dus er moet daarna nog een stap zijn die het
--     betaalnummer bij de claim schrijft. In Veerles ontwerp heeft die
--     stap geen naam. Deze test zet het nummer daarom met een gewone
--     update als service_role — wat de edge function met de
--     service-sleutel ook kan. Vraag aan Bas: doe je dat zo, of komt er
--     een eigen functie wissel_betaalnummer() voor? Beide kan; dit
--     bestand hoeft er niet voor te veranderen.
--
--  ─────────────────────────────────────────────────────────────
--  DE HANDTEKENINGEN DIE DEZE TEST VERWACHT
--
--      public.wissel_gegevens(p_club uuid)
--        returns table(pakket text, termijn text, geldig_tot date,
--                      totale_dagen int, resterende_dagen int,
--                      mollie_klant_id text, mollie_subscription_id text,
--                      wissel_onderweg boolean)
--
--      public.wissel_abonnement(p_club uuid, p_van_pakket text,
--                               p_naar_pakket text, p_soort text)
--
--      public.start_wissel(p_club uuid, p_van text, p_naar text,
--                          p_termijn text, p_bedrag_cent int,
--                          p_resterende_dagen int, p_totale_dagen int)
--
--      public.verwerk_wissel_betaling(p_mollie_id text, p_club uuid,
--                          p_pakket text, p_termijn text,
--                          p_betaald_op timestamptz, p_bedrag_cent int,
--                          p_modus text default 'test',
--                          p_mollie_klant text default null,
--                          p_valuta text default 'EUR')
--        — exact dezelfde volgorde als verwerk_betaling(), met opzet:
--          de edge function kiest tussen die twee en geeft verder
--          hetzelfde setje mee. Twee volgordes zou betekenen dat één
--          verkeerde keuze een bedrag als munteenheid boekt.
--
--      public.wissel_status(p_club uuid)  — de enige voor authenticated
--
--  ─────────────────────────────────────────────────────────────
--  WAAROM DEZE TEST NU ROOD IS (19 september 2026)
--
--  Hij is geschreven vóórdat er één regel van het wisselwerk bestond.
--  Zolang public.abonnement_wissels en de vijf functies er niet zijn,
--  hoort blok 0 rood te staan en meldt elk ander scenario "niet te
--  toetsen: het wisselwerk bestaat nog niet". Dat is de bedoeling: de
--  test legt vast wat er moet komen, en wordt groen zodra Bas het
--  bouwt — niet andersom.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_wissel;
create temp table tt_uitslag_wissel(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  -- Vaste uuid's: een mislukte run laat dan herkenbare rommel achter in
  -- plaats van naamloze rijen — al hoort er niets achter te blijven.
  u_dg   uuid := 'a1551000-0000-4000-a000-000000000001';
  u_up   uuid := 'a1551000-0000-4000-a000-000000000002';
  u_cl   uuid := 'a1551000-0000-4000-a000-000000000003';
  u_zk   uuid := 'a1551000-0000-4000-a000-000000000004';
  u_tm   uuid := 'a1551000-0000-4000-a000-000000000005';
  u_bd   uuid := 'a1551000-0000-4000-a000-000000000006';
  u_vn   uuid := 'a1551000-0000-4000-a000-000000000007';
  u_st   uuid := 'a1551000-0000-4000-a000-000000000008';
  u_an   uuid := 'a1551000-0000-4000-a000-000000000009';
  u_fb   uuid := 'a1551000-0000-4000-a000-00000000000a';
  u_ob   uuid := 'a1551000-0000-4000-a000-00000000000b';
  u_vl   uuid := 'a1551000-0000-4000-a000-00000000000c';
  u_zs   uuid := 'a1551000-0000-4000-a000-00000000000d';
  u_fr   uuid := 'a1551000-0000-4000-a000-00000000000e';
  u_lid  uuid := 'a1551000-0000-4000-a000-00000000000f';
  u_beh  uuid := 'a1551000-0000-4000-a000-000000000010';
  -- De club voor de gelijktijdigheidsproef staat apart: die wordt via
  -- losse databaseverbindingen aangemaakt en moet dus ECHT bestaan
  -- (vastgelegd), niet alleen binnen deze transactie.
  c_par  uuid := 'a1551000-0000-4000-c000-00000000dead';

  c_dg uuid; c_up uuid; c_cl uuid; c_zk uuid; c_tm uuid; c_bd uuid;
  c_vn uuid; c_st uuid; c_an uuid; c_fb uuid; c_ob uuid; c_vl uuid;
  c_zs uuid; c_fr uuid;

  heeft_tabel     boolean;
  heeft_gegevens  boolean;
  heeft_wisselen  boolean;
  heeft_start     boolean;
  heeft_verwerk   boolean;
  heeft_status    boolean;
  heeft_alles     boolean;

  r            text[] := '{}';
  regel        text;
  deel         text[];
  afwijkingen  int := 0;

  vlag     boolean;
  gezien   text;
  tel      int;
  geraakt  int;
  d_was    date;
  d_nu     date;
  t_was    timestamptz;
  t_nu     timestamptz;
  v_id     uuid;
  v_cmd    text;
  v_wacht  int;
  v_busy   int;
  v_fout   text;
  g        record;

  nvt constant text := 'niet te toetsen: het wisselwerk bestaat nog niet';
begin
  -- Alles gebeurt in een deeltransactie die we aan het eind expres
  -- laten klappen. Daardoor verdwijnt elke testrij weer, terwijl de
  -- uitslagen in `r` bewaard blijven — variabelen rollen niet terug.
  begin

    -- ══ 0. BESTAAT HET WISSELWERK AL? ════════════════════════
    --  Deze controle staat vooraan omdat alle andere scenario's
    --  anders zouden stranden op "relation does not exist" en dan
    --  allemaal dezelfde nietszeggende fout zouden melden.
    select exists (select 1 from information_schema.tables
                    where table_schema = 'public' and table_name = 'abonnement_wissels')
      into heeft_tabel;
    select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'wissel_gegevens') into heeft_gegevens;
    select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'wissel_abonnement') into heeft_wisselen;
    select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'start_wissel') into heeft_start;
    select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'verwerk_wissel_betaling') into heeft_verwerk;
    select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'wissel_status') into heeft_status;
    heeft_alles := heeft_tabel and heeft_gegevens and heeft_wisselen
                   and heeft_start and heeft_verwerk and heeft_status;

    if heeft_alles then
      r := array_append(r, '0§de tabel abonnement_wissels en de vijf functies bestaan§allemaal aanwezig§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('0§de tabel abonnement_wissels en de vijf functies bestaan§tabel: '
        || case when heeft_tabel then 'ja' else 'NEE' end
        || ', wissel_gegevens: '   || case when heeft_gegevens then 'ja' else 'NEE' end
        || ', wissel_abonnement: ' || case when heeft_wisselen then 'ja' else 'NEE' end
        || ', start_wissel: '      || case when heeft_start then 'ja' else 'NEE' end
        || ', verwerk_wissel_betaling: ' || case when heeft_verwerk then 'ja' else 'NEE' end
        || ', wissel_status: '     || case when heeft_status then 'ja' else 'NEE' end
        || '§WIJKT AF — hieronder is dan weinig te meten'));
    end if;

    -- ══ OPBOUW ═══════════════════════════════════════════════
    insert into auth.users (id, email) values
      (u_dg,  'wissel-downgrade@teamtakkie.test'),
      (u_up,  'wissel-upgrade@teamtakkie.test'),
      (u_cl,  'wissel-claim@teamtakkie.test'),
      (u_zk,  'wissel-zonderclaim@teamtakkie.test'),
      (u_tm,  'wissel-testmodus@teamtakkie.test'),
      (u_bd,  'wissel-bedrag@teamtakkie.test'),
      (u_vn,  'wissel-vangnet@teamtakkie.test'),
      (u_st,  'wissel-status@teamtakkie.test'),
      (u_an,  'wissel-andereclub@teamtakkie.test'),
      (u_fb,  'wissel-februari@teamtakkie.test'),
      (u_ob,  'wissel-onbeperkt@teamtakkie.test'),
      (u_vl,  'wissel-verlopen@teamtakkie.test'),
      (u_zs,  'wissel-zondersub@teamtakkie.test'),
      (u_fr,  'wissel-free@teamtakkie.test'),
      (u_lid, 'wissel-gewoonlid@teamtakkie.test'),
      (u_beh, 'wissel-beheerder@teamtakkie.test');

    insert into public.beheerders (gebruiker_id, notitie)
      values (u_beh, 'test-beheerder (abonnement-wisselen)');

    -- Elke vereniging via nieuwe_club(): die maakt club, eigenaar én de
    -- free-abonnementsrij in één keer. Een met de hand in elkaar gezette
    -- club zou een situatie toetsen die in het echt niet bestaat.
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_dg::text, true);  c_dg := public.nieuwe_club('Wisselclub downgrade', 'Eigenaar DG');
    perform set_config('request.jwt.claim.sub', u_up::text, true);  c_up := public.nieuwe_club('Wisselclub upgrade', 'Eigenaar UP');
    perform set_config('request.jwt.claim.sub', u_cl::text, true);  c_cl := public.nieuwe_club('Wisselclub claims', 'Eigenaar CL');
    perform set_config('request.jwt.claim.sub', u_zk::text, true);  c_zk := public.nieuwe_club('Wisselclub zonder claim', 'Eigenaar ZK');
    perform set_config('request.jwt.claim.sub', u_tm::text, true);  c_tm := public.nieuwe_club('Wisselclub testmodus', 'Eigenaar TM');
    perform set_config('request.jwt.claim.sub', u_bd::text, true);  c_bd := public.nieuwe_club('Wisselclub bedragen', 'Eigenaar BD');
    perform set_config('request.jwt.claim.sub', u_vn::text, true);  c_vn := public.nieuwe_club('Wisselclub vangnet', 'Eigenaar VN');
    perform set_config('request.jwt.claim.sub', u_st::text, true);  c_st := public.nieuwe_club('Wisselclub status', 'Eigenaar ST');
    perform set_config('request.jwt.claim.sub', u_an::text, true);  c_an := public.nieuwe_club('Wisselclub andere', 'Eigenaar AN');
    perform set_config('request.jwt.claim.sub', u_fb::text, true);  c_fb := public.nieuwe_club('Wisselclub februari', 'Eigenaar FB');
    perform set_config('request.jwt.claim.sub', u_ob::text, true);  c_ob := public.nieuwe_club('Wisselclub onbeperkt', 'Eigenaar OB');
    perform set_config('request.jwt.claim.sub', u_vl::text, true);  c_vl := public.nieuwe_club('Wisselclub verlopen', 'Eigenaar VL');
    perform set_config('request.jwt.claim.sub', u_zs::text, true);  c_zs := public.nieuwe_club('Wisselclub zonder incasso', 'Eigenaar ZS');
    perform set_config('request.jwt.claim.sub', u_fr::text, true);  c_fr := public.nieuwe_club('Wisselclub free', 'Eigenaar FR');
    reset role;

    -- Een gewoon lid (trainer) bij de statusclub: die mag straks NIETS
    -- zien van de wisselpoging van zijn eigen club.
    insert into public.leden (club_id, gebruiker_id, naam, rol)
      values (c_st, u_lid, 'Gewone trainer', 'trainer');

    -- De uitgangssituatie per club. Met opzet niet overal hetzelfde
    -- bedrag en niet overal dezelfde datum: dan is te zien of het
    -- júiste getal bij de júiste club terechtkomt.
    update public.abonnementen set pakket = 'club',  geldig_tot = current_date + 20 where club_id = c_dg;
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 26 where club_id = c_up;
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 26 where club_id = c_cl;
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 15 where club_id = c_zk;
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 10 where club_id = c_tm;
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 12 where club_id = c_bd;
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 18 where club_id = c_vn;
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 22 where club_id = c_st;
    update public.abonnementen set pakket = 'coach', geldig_tot = date '2027-02-28' where club_id = c_fb;
    update public.abonnementen set pakket = 'club',  geldig_tot = null              where club_id = c_ob;
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date - 10 where club_id = c_vl;
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 9  where club_id = c_zs;
    -- c_fr blijft zoals nieuwe_club() hem achterlaat: free, geen einddatum.

    -- De periodelengte staat in een kolom die pas met het wisselwerk
    -- meekomt. Daarom via dynamische SQL en alleen als hij er is: zonder
    -- deze voorzichtigheid klapt de hele test eruit op de opbouw, en dan
    -- meldt geen enkel scenario meer waarom het misging.
    select exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'abonnementen'
                      and column_name = 'termijn') into vlag;
    if vlag then
      execute format($q$
        update public.abonnementen a set termijn = v.t
          from (values (%L::uuid,'maand'),(%L::uuid,'maand'),(%L::uuid,'maand'),
                       (%L::uuid,'maand'),(%L::uuid,'maand'),(%L::uuid,'maand'),
                       (%L::uuid,'maand'),(%L::uuid,'maand'),(%L::uuid,'maand'),
                       (%L::uuid,'jaar')) as v(c, t)
         where a.club_id = v.c $q$,
        c_dg, c_up, c_cl, c_zk, c_tm, c_bd, c_vn, c_st, c_fb, c_zs);
    end if;

    -- Een klantnummer en een incassonummer waar dat hoort; c_zs houdt
    -- met opzet géén incassonummer (randgeval 24e).
    update public.abonnementen set mollie_klant_id = 'cst_wissel1', mollie_subscription_id = 'sub_wissel1'
      where club_id in (c_dg, c_up, c_cl, c_bd, c_vn, c_st, c_fb);

    -- ══════════════════════════════════════════════════════════
    --  1. DE TABEL public.abonnement_wissels
    --  ─────────────────────────────────────────────────────────
    --  Dit is het bewijsstuk bij een geschil ("ik heb toch
    --  gewisseld?"). Hij hoeft niets te kunnen; hij moet vooral niets
    --  kunnen verliezen, door niemand te beschrijven zijn, en het slot
    --  dragen dat twee wissels tegelijk tegenhoudt.
    -- ══════════════════════════════════════════════════════════
    if not heeft_tabel then
      afwijkingen := afwijkingen + 5;
      r := array_append(r, '1a§de partiële unieke index: hoogstens één OPEN wissel per club§' || nvt || '§WIJKT AF');
      r := array_append(r, '1b§de unieke index op het betaalnummer§' || nvt || '§WIJKT AF');
      r := array_append(r, '1c§club_id overleeft het verwijderen van een club (on delete SET NULL)§' || nvt || '§WIJKT AF');
      r := array_append(r, '1d§rij-beveiliging aan, geen enkele schrijfregel§' || nvt || '§WIJKT AF');
      r := array_append(r, '1e§gedrag: een ingelogde gebruiker schrijft er zelf in§' || nvt || '§WIJKT AF');
    else
      -- ── 1a. HET SLOT ZELF ───────────────────────────────────
      --  Een unieke index op club_id ZONDER "where afgerond_op is null"
      --  zou betekenen dat een club maar één keer in zijn leven kan
      --  wisselen. Mét die where is het precies wat het moet zijn:
      --  hoogstens één wissel ONDERWEG. Deze controle kijkt daarom naar
      --  allebei: uniek én gedeeltelijk.
      select exists (
        select 1 from pg_index i
        join pg_class c on c.oid = i.indrelid
        join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
        where c.relname = 'abonnement_wissels' and i.indisunique
          and a.attname = 'club_id' and i.indnatts = 1
          and i.indpred is not null
          and pg_get_expr(i.indpred, i.indrelid) ilike '%afgerond_op is null%')
        into vlag;
      if vlag then
        r := array_append(r, '1a§de partiële unieke index: hoogstens één OPEN wissel per club§aanwezig, met "where afgerond_op is null"§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '1a§de partiële unieke index: hoogstens één OPEN wissel per club§NIET gevonden§WIJKT AF — dan kunnen twee wissels tegelijk beginnen');
      end if;

      -- ── 1b. het betaalnummer maar één keer ──────────────────
      select exists (
        select 1 from pg_index i
        join pg_class c on c.oid = i.indrelid
        join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
        where c.relname = 'abonnement_wissels' and i.indisunique
          and a.attname = 'mollie_betaling_id' and i.indnatts = 1)
        into vlag;
      if vlag then
        r := array_append(r, '1b§de unieke index op het betaalnummer§aanwezig§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '1b§de unieke index op het betaalnummer§NIET gevonden§WIJKT AF — dan kan één betaling twee wissels voeden');
      end if;

      -- ── 1c. het bewijsstuk overleeft een opgeheven club ─────
      select case confdeltype when 'n' then 'set null' when 'c' then 'cascade'
                              when 'a' then 'no action' when 'r' then 'restrict'
                              when 'd' then 'set default' else confdeltype::text end
        into gezien
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_attribute a on a.attrelid = c.oid and a.attnum = con.conkey[1]
        where c.relname = 'abonnement_wissels' and con.contype = 'f' and a.attname = 'club_id'
        limit 1;
      if gezien = 'set null' then
        r := array_append(r, '1c§club_id overleeft het verwijderen van een club (on delete SET NULL)§set null§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('1c§club_id overleeft het verwijderen van een club (on delete SET NULL)§'
          || coalesce(gezien, 'geen verwijzing naar clubs gevonden')
          || '§WIJKT AF — bij een geschil is het bewijs dan weg'));
      end if;

      -- ── 1d. RLS aan, en geen schrijfregel ───────────────────
      --  Het ontbreken van insert/update/delete-regels IS het slot,
      --  precies zoals bij public.betalingen.
      select c.relrowsecurity into vlag
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'abonnement_wissels';
      select count(*)::int into tel
        from pg_policies where schemaname = 'public' and tablename = 'abonnement_wissels'
          and cmd <> 'SELECT';
      if coalesce(vlag, false) and tel = 0 then
        r := array_append(r, '1d§rij-beveiliging aan, geen enkele schrijfregel§RLS aan, 0 schrijfregels§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('1d§rij-beveiliging aan, geen enkele schrijfregel§RLS: '
          || case when coalesce(vlag,false) then 'aan' else 'UIT' end
          || ', schrijfregels: ' || tel || '§WIJKT AF'));
      end if;

      -- ── 1e. en hetzelfde in de praktijk ─────────────────────
      --  De catalogus lezen is één ding; wat een échte ingelogde
      --  gebruiker kan is het bewijs.
      perform set_config('request.jwt.claim.sub', u_st::text, true);
      perform set_config('request.jwt.claim.role', 'authenticated', true);
      perform set_config('request.jwt.claims',
                         json_build_object('sub', u_st::text, 'role', 'authenticated')::text, true);
      set local role authenticated;
      begin
        insert into public.abonnement_wissels
          (club_id, van_pakket, naar_pakket, termijn, soort, bedrag_cent, status)
        values (c_st, 'coach', 'club', 'maand', 'upgrade_gratis', 0, 'klaar');
        reset role;
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '1e§gedrag: een ingelogde gebruiker schrijft er zelf in§GELUKT§<< LEK — dan schrijft een club zijn eigen gratis upgrade');
      exception when others then
        reset role;
        r := array_append(r, ('1e§gedrag: een ingelogde gebruiker schrijft er zelf in§GEWEIGERD: '
          || sqlstate || '§ZOALS VERWACHT'));
      end;
      reset role;
      perform set_config('request.jwt.claims', '', true);
    end if;

    -- Vanaf hier praten we als de servercode: de edge functions
    -- gebruiken de service-sleutel van Supabase en komen met deze rol
    -- in hun token binnen.
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

    -- ══════════════════════════════════════════════════════════
    --  2. wissel_gegevens() — DE DATUMS
    --  ─────────────────────────────────────────────────────────
    --  De rekensom staat in TypeScript, maar de twee getallen die
    --  erin gaan komen hiervandaan. Zitten die ernaast, dan is de
    --  verrekening ernaast — en dat is echt geld.
    -- ══════════════════════════════════════════════════════════
    if not heeft_gegevens then
      afwijkingen := afwijkingen + 5;
      r := array_append(r, '2a§wissel_gegevens geeft pakket, termijn en einddatum terug§' || nvt || '§WIJKT AF');
      r := array_append(r, '2b§(scenario 5) februari: totale_dagen is 31, niet 28§' || nvt || '§WIJKT AF');
      r := array_append(r, '2c§resterende_dagen wordt afgetopt op totale_dagen§' || nvt || '§WIJKT AF');
      r := array_append(r, '2d§een jaarabonnement telt in jaren, niet in maanden§' || nvt || '§WIJKT AF');
      r := array_append(r, '2e§"vandaag" is Nederlandse tijd, niet UTC§' || nvt || '§WIJKT AF');
    else
      -- ── 2a. de gewone gevallen ──────────────────────────────
      select * into g from public.wissel_gegevens(c_up);
      if g.pakket = 'coach' and g.termijn = 'maand' and g.geldig_tot = current_date + 26
         and g.mollie_subscription_id = 'sub_wissel1' and g.wissel_onderweg = false then
        r := array_append(r, '2a§wissel_gegevens geeft pakket, termijn en einddatum terug§coach/maand, einddatum klopt, niets onderweg§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2a§wissel_gegevens geeft pakket, termijn en einddatum terug§pakket=' || coalesce(g.pakket,'(leeg)')
          || ', termijn=' || coalesce(g.termijn,'(leeg)')
          || ', geldig_tot=' || coalesce(g.geldig_tot::text,'(leeg)')
          || ', incasso=' || coalesce(g.mollie_subscription_id,'(leeg)')
          || ', onderweg=' || coalesce(g.wissel_onderweg::text,'(leeg)') || '§WIJKT AF'));
      end if;

      -- ── 2b. FEBRUARI ────────────────────────────────────────
      --  De val waar elke naar-rato-berekening in trapt: een maand is
      --  geen 30 dagen, en de lengte van DEZE periode hangt af van de
      --  einddatum. Loopt het abonnement tot 28 februari, dan begon de
      --  periode eind januari en duurde hij 31 dagen — niet 28.
      --  Rekent iemand met 28, dan krijgt de club structureel te veel
      --  of te weinig terug.
      select * into g from public.wissel_gegevens(c_fb);
      if g.totale_dagen = 31 then
        r := array_append(r, '2b§(scenario 5) februari: totale_dagen is 31, niet 28§31§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2b§(scenario 5) februari: totale_dagen is 31, niet 28§'
          || coalesce(g.totale_dagen::text,'(leeg)') || '§WIJKT AF — een maand is geen vast getal'));
      end if;

      -- ── 2c. de aftopping ────────────────────────────────────
      --  c_fb loopt tot ver in 2027: meer dagen "over" dan de periode
      --  lang is. Zonder least(...) staat er dan een getal van 500 en
      --  rekent de verrekening een veelvoud van het prijsverschil.
      if g.resterende_dagen = 31 then
        r := array_append(r, '2c§resterende_dagen wordt afgetopt op totale_dagen§31§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2c§resterende_dagen wordt afgetopt op totale_dagen§'
          || coalesce(g.resterende_dagen::text,'(leeg)')
          || '§WIJKT AF — zonder least() rekent de verrekening te veel'));
      end if;

      -- ── 2d. een jaarabonnement ──────────────────────────────
      --  Het aantal resterende dagen mag hier 8 of 9 zijn: de test zet
      --  de einddatum op "vandaag + 9" in UTC, terwijl de functie met de
      --  Nederlandse datum rekent. Tussen 22:00 en middernacht UTC
      --  schelen die een dag. Dát verschil is juist gewenst (scenario
      --  2e); een test die hier één vast getal eist, zou 's avonds laat
      --  rood worden zonder dat er iets stuk is.
      select * into g from public.wissel_gegevens(c_zs);
      if g.totale_dagen in (365, 366) and g.resterende_dagen in (8, 9) then
        r := array_append(r, ('2d§een jaarabonnement telt in jaren, niet in maanden§totale_dagen='
          || g.totale_dagen || ', resterend=' || g.resterende_dagen || '§ZOALS VERWACHT'));
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2d§een jaarabonnement telt in jaren, niet in maanden§totale_dagen='
          || coalesce(g.totale_dagen::text,'(leeg)') || ', resterend='
          || coalesce(g.resterende_dagen::text,'(leeg)') || '§WIJKT AF'));
      end if;

      -- ── 2e. de tijdzone ─────────────────────────────────────
      --  Dit is de enige controle in dit bestand die naar de BRONTEKST
      --  kijkt en niet naar gedrag, en dat staat er eerlijk bij: het
      --  verschil tussen current_date (UTC) en de Nederlandse datum
      --  duurt elke nacht twee uur, en een test kan de klok van de
      --  server niet verzetten. Wat wél te meten is: staat de omrekening
      --  er. Zonder deze regel wisselt een club die 's nachts om half
      --  één klikt op de datum van gisteren, en dan klopt
      --  resterende_dagen een dag niet.
      select pg_get_functiondef(p.oid) into gezien
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'wissel_gegevens' limit 1;
      if gezien ilike '%Europe/Amsterdam%' then
        r := array_append(r, '2e§"vandaag" is Nederlandse tijd, niet UTC§de omrekening naar Europe/Amsterdam staat erin§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '2e§"vandaag" is Nederlandse tijd, niet UTC§geen Europe/Amsterdam in de functie§WIJKT AF — rond middernacht een dag ernaast');
      end if;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  10 t/m 14. HET SLOT TEGEN TWEE WISSELS TEGELIJK
    -- ══════════════════════════════════════════════════════════
    if not (heeft_tabel and heeft_start) then
      afwijkingen := afwijkingen + 4;
      r := array_append(r, '10§twee keer start_wissel() achter elkaar: de tweede faalt met 23505§' || nvt || '§WIJKT AF');
      r := array_append(r, '12§na klaar/mislukt/afgebroken mag er een nieuwe wissel starten§' || nvt || '§WIJKT AF');
      r := array_append(r, '13§een gratis wissel blokkeert de volgende poging niet§' || nvt || '§WIJKT AF');
      r := array_append(r, '14§opruimen: 15 minuten zonder betaalnummer weg, 3 dagen mét blijft§' || nvt || '§WIJKT AF');
    else
      -- ── 10. twee claims achter elkaar ───────────────────────
      set local role service_role;
      begin
        perform public.start_wissel(c_cl, 'coach', 'club', 'maand', 3640, 26, 30);
        begin
          perform public.start_wissel(c_cl, 'coach', 'club', 'maand', 3640, 26, 30);
          afwijkingen := afwijkingen + 1;
          r := array_append(r, '10§twee keer start_wissel() achter elkaar: de tweede faalt met 23505§ALLEBEI GELUKT§<< LEK — twee wissels onderweg, twee betalingen');
        exception when unique_violation then
          r := array_append(r, '10§twee keer start_wissel() achter elkaar: de tweede faalt met 23505§tweede geweigerd (23505)§ZOALS VERWACHT');
        when others then
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('10§twee keer start_wissel() achter elkaar: de tweede faalt met 23505§geweigerd, maar met '
            || sqlstate || ': ' || sqlerrm || '§WIJKT AF — de aanroeper vertaalt juist 23505 naar een nette 409'));
        end;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10§twee keer start_wissel() achter elkaar: de tweede faalt met 23505§de eerste claim lukte al niet: '
          || sqlerrm || '§WIJKT AF'));
      end;
      reset role;

      -- ── 12. en daarna mag het weer ──────────────────────────
      --  Drie keer dezelfde vraag, voor elk van de drie eindstanden.
      --  Alleen 'klaar' toetsen zou de deur openlaten voor een
      --  implementatie die een mislukte poging voor eeuwig laat staan —
      --  en dan kan die club nooit meer wisselen.
      vlag := true;
      gezien := '';
      set local role service_role;
      foreach regel in array array['klaar','mislukt','afgebroken'] loop
        update public.abonnement_wissels
           set status = regel, afgerond_op = now()
         where club_id = c_cl and afgerond_op is null;
        begin
          perform public.start_wissel(c_cl, 'coach', 'club', 'maand', 3640, 26, 30);
          gezien := gezien || regel || ': mag weer. ';
        exception when others then
          vlag := false;
          gezien := gezien || regel || ': GEWEIGERD (' || sqlstate || '). ';
        end;
      end loop;
      -- Opruimen voor de volgende scenario's met deze club.
      update public.abonnement_wissels set status = 'afgebroken', afgerond_op = now()
       where club_id = c_cl and afgerond_op is null;
      reset role;
      if vlag then
        r := array_append(r, ('12§na klaar/mislukt/afgebroken mag er een nieuwe wissel starten§' || gezien || '§ZOALS VERWACHT'));
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('12§na klaar/mislukt/afgebroken mag er een nieuwe wissel starten§' || gezien
          || '§WIJKT AF — die club kan nooit meer wisselen'));
      end if;

      -- ── 13. een gratis wissel blokkeert niets ───────────────
      --  Een downgrade is meteen klaar; die hoort afgerond_op ingevuld
      --  te krijgen. Blijft dat leeg, dan zit de club daarna vast: elke
      --  volgende wissel botst op het slot.
      if heeft_wisselen then
        set local role service_role;
        begin
          perform public.wissel_abonnement(c_dg, 'club', 'coach', 'downgrade');
          select count(*)::int into tel from public.abonnement_wissels
            where club_id = c_dg and afgerond_op is null;
          if tel = 0 then
            -- en dus mag er meteen weer iets nieuws beginnen
            perform public.start_wissel(c_dg, 'coach', 'club', 'maand', 3640, 20, 30);
            update public.abonnement_wissels set status = 'afgebroken', afgerond_op = now()
              where club_id = c_dg and afgerond_op is null;
            r := array_append(r, '13§een gratis wissel blokkeert de volgende poging niet§geen open claim, nieuwe wissel lukt§ZOALS VERWACHT');
          else
            afwijkingen := afwijkingen + 1;
            r := array_append(r, ('13§een gratis wissel blokkeert de volgende poging niet§'
              || tel || ' open claim(s) blijven staan§WIJKT AF — deze club zit daarna vast'));
          end if;
        exception when others then
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('13§een gratis wissel blokkeert de volgende poging niet§onverwachte fout: '
            || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
        end;
        reset role;
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '13§een gratis wissel blokkeert de volgende poging niet§' || nvt || '§WIJKT AF');
      end if;

      -- ── 14. de opruiming ────────────────────────────────────
      --  Een claim zonder betaalnummer is een browser die is
      --  weggeklikt. Die mag de club niet voor eeuwig op slot zetten.
      --  Een claim MÉT betaalnummer is een betaling die bij Mollie
      --  klaarstaat; die blijft staan tot hij afloopt (7 dagen), want
      --  hem vrijgeven zou betekenen dat er twéé betalingen open staan.
      set local role service_role;
      begin
        -- (a) oude claim zonder betaalnummer
        insert into public.abonnement_wissels
          (club_id, van_pakket, naar_pakket, termijn, soort, bedrag_cent, status, aangemaakt_op)
        values (c_cl, 'coach', 'club', 'maand', 'upgrade', 3640, 'open', now() - interval '20 minutes')
        returning id into v_id;
        perform public.start_wissel(c_cl, 'coach', 'club', 'maand', 3640, 26, 30);
        -- Precies díé oude claim moet afgebroken zijn, niet "ergens een
        -- afgebroken rij" — die staan er na blok 12 toch al.
        select count(*)::int into tel from public.abonnement_wissels
          where id = v_id and status = 'afgebroken' and afgerond_op is not null;
        select count(*)::int into geraakt from public.abonnement_wissels
          where club_id = c_cl and afgerond_op is null;
        -- opruimen voor het volgende deel
        update public.abonnement_wissels set status = 'afgebroken', afgerond_op = now()
          where club_id = c_cl and afgerond_op is null;

        -- (b) claim van 3 dagen oud MÉT betaalnummer: blijft staan
        insert into public.abonnement_wissels
          (club_id, van_pakket, naar_pakket, termijn, soort, bedrag_cent, status,
           mollie_betaling_id, aangemaakt_op)
        values (c_cl, 'coach', 'club', 'maand', 'upgrade', 3640, 'open',
                'tr_wisseloud3dagen', now() - interval '3 days');
        begin
          perform public.start_wissel(c_cl, 'coach', 'club', 'maand', 3640, 26, 30);
          vlag := false;   -- mocht niet lukken: de oude claim stond er nog
        exception when unique_violation then
          vlag := true;
        end;
        select status into gezien from public.abonnement_wissels
          where mollie_betaling_id = 'tr_wisseloud3dagen';

        if tel = 1 and geraakt = 1 and vlag and gezien = 'open' then
          r := array_append(r, '14§opruimen: 15 minuten zonder betaalnummer weg, 3 dagen mét blijft§oude claim afgebroken, nieuwe lukte; claim met betaalnummer bleef open§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('14§opruimen: 15 minuten zonder betaalnummer weg, 3 dagen mét blijft§afgebroken: '
            || tel || ', open na opruiming: ' || geraakt
            || ', nieuwe claim geweigerd bij betaling van 3 dagen: ' || vlag::text
            || ', status daarvan: ' || coalesce(gezien,'(weg)') || '§WIJKT AF'));
        end if;
        -- alles van deze club weer vrijgeven
        update public.abonnement_wissels set status = 'afgebroken', afgerond_op = now()
          where club_id = c_cl and afgerond_op is null;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('14§opruimen: 15 minuten zonder betaalnummer weg, 3 dagen mét blijft§onverwachte fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  15 t/m 20. DE FUNCTIES ZELF
    -- ══════════════════════════════════════════════════════════

    -- ── 15. DOWNGRADE: geldig_tot BLIJFT ────────────────────────
    --  Dit is het scenario dat het door Evan gevonden probleem vangt.
    if heeft_wisselen then
      set local role service_role;
      begin
        update public.abonnementen set pakket = 'club', geldig_tot = current_date + 20
          where club_id = c_dg;
        select geldig_tot into d_was from public.abonnementen where club_id = c_dg;
        perform public.wissel_abonnement(c_dg, 'club', 'coach', 'downgrade');
        select pakket, geldig_tot into gezien, d_nu from public.abonnementen where club_id = c_dg;
        if gezien = 'coach' and d_nu = d_was then
          r := array_append(r, ('15§downgrade: pakket wordt coach en geldig_tot blijft EXACT gelijk§'
            || d_was::text || ' -> ' || d_nu::text || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('15§downgrade: pakket wordt coach en geldig_tot blijft EXACT gelijk§pakket='
            || coalesce(gezien,'(leeg)') || ', ' || coalesce(d_was::text,'(leeg)') || ' -> '
            || coalesce(d_nu::text,'(leeg)') || '§WIJKT AF — dit is precies de fout die Evan vond'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('15§downgrade: pakket wordt coach en geldig_tot blijft EXACT gelijk§onverwachte fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;

      -- ── 15b. een tweede keer dezelfde downgrade ─────────────
      --  Een dubbelklik of een herhaald verzoek is geen fout: het
      --  pakket staat al goed, dus er valt niets te doen. Wat er NIET
      --  mag gebeuren is een harde fout of een open claim die de club
      --  op slot zet.
      set local role service_role;
      begin
        perform public.wissel_abonnement(c_dg, 'club', 'coach', 'downgrade');
        select count(*)::int into tel from public.abonnement_wissels
          where club_id = c_dg and afgerond_op is null;
        select pakket, geldig_tot into gezien, d_nu from public.abonnementen where club_id = c_dg;
        if gezien = 'coach' and d_nu = d_was and tel = 0 then
          r := array_append(r, '15b§dezelfde downgrade nog een keer: geen fout, niets verandert§pakket blijft coach, geen open claim§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('15b§dezelfde downgrade nog een keer: geen fout, niets verandert§pakket='
            || coalesce(gezien,'(leeg)') || ', einddatum=' || coalesce(d_nu::text,'(leeg)')
            || ', open claims=' || tel || '§WIJKT AF'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('15b§dezelfde downgrade nog een keer: geen fout, niets verandert§fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF — een dubbelklik hoort geen fout te zijn'));
      end;
      reset role;
    else
      afwijkingen := afwijkingen + 2;
      r := array_append(r, '15§downgrade: pakket wordt coach en geldig_tot blijft EXACT gelijk§' || nvt || '§WIJKT AF');
      r := array_append(r, '15b§dezelfde downgrade nog een keer: geen fout, niets verandert§' || nvt || '§WIJKT AF');
    end if;

    -- ── 16 t/m 20: verwerk_wissel_betaling() ───────────────────
    if not (heeft_tabel and heeft_start and heeft_verwerk) then
      afwijkingen := afwijkingen + 6;
      r := array_append(r, '16§betaalde upgrade: pakket wordt club en geldig_tot blijft EXACT gelijk§' || nvt || '§WIJKT AF');
      r := array_append(r, '17§een wisselbetaling zonder claim: niets gebeurt, geen fout§' || nvt || '§WIJKT AF');
      r := array_append(r, '18§dezelfde melding twee keer: maar één keer verwerkt§' || nvt || '§WIJKT AF');
      r := array_append(r, '19§testbetaling terwijl er al live is betaald: genegeerd§' || nvt || '§WIJKT AF');
      r := array_append(r, '20a§bedrag null en negatief: harde fout§' || nvt || '§WIJKT AF');
      r := array_append(r, '20b§bedrag 0: geen fout, maar ook geen pakket§' || nvt || '§WIJKT AF');
    else
      -- ── 16. DE BETAALDE UPGRADE ───────────────────────────────
      set local role service_role;
      begin
        select geldig_tot into d_was from public.abonnementen where club_id = c_up;
        perform public.start_wissel(c_up, 'coach', 'club', 'maand', 3640, 26, 30);
        -- Het betaalnummer bij de claim zetten. Zie punt 4 bovenaan dit
        -- bestand: de claim bestaat vóórdat de betaling bij Mollie
        -- bestaat, dus dit is altijd een tweede stap.
        update public.abonnement_wissels set mollie_betaling_id = 'tr_wisselupgrade1'
          where club_id = c_up and afgerond_op is null;
        perform public.verwerk_wissel_betaling('tr_wisselupgrade1', c_up, 'club', 'maand',
                  now(), 3640, 'live', 'cst_wissel1', 'EUR');
        select pakket, geldig_tot into gezien, d_nu from public.abonnementen where club_id = c_up;
        select status into regel from public.abonnement_wissels where mollie_betaling_id = 'tr_wisselupgrade1';
        if gezien = 'club' and d_nu = d_was and regel = 'klaar' then
          r := array_append(r, ('16§betaalde upgrade: pakket wordt club en geldig_tot blijft EXACT gelijk§'
            || d_was::text || ' -> ' || d_nu::text || ', claim op klaar§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('16§betaalde upgrade: pakket wordt club en geldig_tot blijft EXACT gelijk§pakket='
            || coalesce(gezien,'(leeg)') || ', ' || coalesce(d_was::text,'(leeg)') || ' -> '
            || coalesce(d_nu::text,'(leeg)') || ', claim=' || coalesce(regel,'(geen)')
            || '§WIJKT AF — een wissel mag nooit een periode opleveren'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('16§betaalde upgrade: pakket wordt club en geldig_tot blijft EXACT gelijk§onverwachte fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;

      -- ── 17. GEEN CLAIM, GEEN PAKKET ───────────────────────────
      --  HET BELANGRIJKSTE SLOT VAN DEZE HELE FUNCTIE. Iemand kan bij
      --  Mollie een betaling aanmaken met onze metadata erin; die
      --  metadata is dus geen bewijs. Alleen een claim die wij zélf
      --  hebben gezet telt. Geen fout terug (dan blijft Mollie het
      --  eindeloos opnieuw aanbieden), gewoon: niets doen.
      set local role service_role;
      begin
        select pakket, geldig_tot into gezien, d_was from public.abonnementen where club_id = c_zk;
        perform public.verwerk_wissel_betaling('tr_zonderclaim1', c_zk, 'club', 'maand',
                  now(), 3640, 'live', 'cst_wissel1', 'EUR');
        select pakket, geldig_tot into regel, d_nu from public.abonnementen where club_id = c_zk;
        select count(*)::int into tel from public.abonnement_wissels where club_id = c_zk;
        if regel = gezien and d_nu = d_was and tel = 0 then
          r := array_append(r, ('17§een wisselbetaling zonder claim: niets gebeurt, geen fout§pakket blijft '
            || gezien || ', geen wisselregel aangemaakt§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('17§een wisselbetaling zonder claim: niets gebeurt, geen fout§pakket '
            || coalesce(gezien,'(leeg)') || ' -> ' || coalesce(regel,'(leeg)')
            || ', wisselregels: ' || tel || '§<< LEK — dan koopt iemand een pakket buiten ons om'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('17§een wisselbetaling zonder claim: niets gebeurt, geen fout§er kwam een FOUT: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF — dan blijft Mollie het opnieuw aanbieden'));
      end;
      reset role;

      -- ── 18. DE DUBBELE WEBHOOK ────────────────────────────────
      --  Mollie stuurt een melding opnieuw zodra het antwoord uitblijft.
      --  Dat is normaal gedrag, geen randgeval.
      set local role service_role;
      begin
        select geldig_tot into d_was from public.abonnementen where club_id = c_up;
        select afgerond_op into t_was from public.abonnement_wissels where mollie_betaling_id = 'tr_wisselupgrade1';
        perform public.verwerk_wissel_betaling('tr_wisselupgrade1', c_up, 'club', 'maand',
                  now(), 3640, 'live', 'cst_wissel1', 'EUR');
        select geldig_tot into d_nu from public.abonnementen where club_id = c_up;
        select afgerond_op into t_nu from public.abonnement_wissels where mollie_betaling_id = 'tr_wisselupgrade1';
        select count(*)::int into tel from public.betalingen where mollie_betaling_id = 'tr_wisselupgrade1';
        select count(*)::int into geraakt from public.abonnement_wissels where mollie_betaling_id = 'tr_wisselupgrade1';
        if d_nu = d_was and t_nu = t_was and tel <= 1 and geraakt = 1 then
          r := array_append(r, ('18§dezelfde melding twee keer: maar één keer verwerkt§einddatum gelijk, claim niet opnieuw afgerond, '
            || tel || ' boekingsregel(s)§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('18§dezelfde melding twee keer: maar één keer verwerkt§einddatum '
            || coalesce(d_was::text,'(leeg)') || ' -> ' || coalesce(d_nu::text,'(leeg)')
            || ', boekingsregels: ' || tel || ', wisselregels: ' || geraakt
            || '§WIJKT AF — een herhaalde melding mag niets meer veranderen'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('18§dezelfde melding twee keer: maar één keer verwerkt§onverwachte fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;

      -- ── 19. TESTBETALING TERWIJL DE INSTALLATIE LIVE STAAT ────
      --  Dit is de tak die bij een nieuwe functie het makkelijkst wordt
      --  vergeten: verwerk_betaling() heeft hem, en
      --  verwerk_wissel_betaling() moet hem net zo goed hebben. Met de
      --  testsleutel van Mollie is een "geslaagde" betaling van € 0,- in
      --  tien seconden gemaakt; zonder deze tak is dat een gratis
      --  upgrade naar Club.
      set local role service_role;
      begin
        -- Er staat een verwerkte LIVE-betaling in de boeken (scenario 16
        -- heeft die net gemaakt). Zo niet, dan zetten we er zelf een.
        if not exists (select 1 from public.betalingen
                        where modus = 'live' and verwerkt_op is not null and status = 'betaald') then
          insert into public.betalingen (mollie_betaling_id, club_id, pakket, termijn, modus,
                                         status, betaald_op, verwerkt_op, bedrag_cent, valuta)
          values ('tr_wisselechtelive', c_up, 'club', 'maand', 'live', 'betaald', now(), now(), 4900, 'EUR');
        end if;
        select pakket, geldig_tot into gezien, d_was from public.abonnementen where club_id = c_tm;
        perform public.start_wissel(c_tm, 'coach', 'club', 'maand', 3640, 10, 30);
        update public.abonnement_wissels set mollie_betaling_id = 'tr_wisseltestmodus'
          where club_id = c_tm and afgerond_op is null;
        perform public.verwerk_wissel_betaling('tr_wisseltestmodus', c_tm, 'club', 'maand',
                  now(), 3640, 'test', 'cst_wissel1', 'EUR');
        select pakket, geldig_tot into regel, d_nu from public.abonnementen where club_id = c_tm;
        if regel = gezien and d_nu = d_was then
          r := array_append(r, ('19§testbetaling terwijl er al live is betaald: genegeerd§pakket blijft '
            || gezien || ', einddatum ongewijzigd§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('19§testbetaling terwijl er al live is betaald: genegeerd§pakket '
            || coalesce(gezien,'(leeg)') || ' -> ' || coalesce(regel,'(leeg)')
            || '§<< LEK — een gratis upgrade met de testsleutel van Mollie'));
        end if;
        update public.abonnement_wissels set status = 'mislukt', afgerond_op = now()
          where club_id = c_tm and afgerond_op is null;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('19§testbetaling terwijl er al live is betaald: genegeerd§onverwachte fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;

      -- ── 20a. GEEN BEDRAG EN EEN MINBEDRAG ─────────────────────
      --  Allebei een melding die niet deugt, en allebei een harde fout:
      --  dan probeert Mollie het opnieuw, en dat is hier gewenst — er
      --  ligt echt geld klaar. Zelfde afspraak als in verwerk_betaling().
      set local role service_role;
      begin
        perform public.start_wissel(c_bd, 'coach', 'club', 'maand', 3640, 12, 30);
        update public.abonnement_wissels set mollie_betaling_id = 'tr_wisselbedrag'
          where club_id = c_bd and afgerond_op is null;
        vlag := true; gezien := '';
        begin
          perform public.verwerk_wissel_betaling('tr_wisselbedrag', c_bd, 'club', 'maand',
                    now(), null, 'live', 'cst_wissel1', 'EUR');
          vlag := false; gezien := gezien || 'null: GEEN fout. ';
        exception when others then
          gezien := gezien || 'null: fout (' || sqlstate || '). ';
        end;
        begin
          perform public.verwerk_wissel_betaling('tr_wisselbedrag', c_bd, 'club', 'maand',
                    now(), -500, 'live', 'cst_wissel1', 'EUR');
          vlag := false; gezien := gezien || 'negatief: GEEN fout. ';
        exception when others then
          gezien := gezien || 'negatief: fout (' || sqlstate || '). ';
        end;
        if vlag then
          r := array_append(r, ('20a§bedrag null en negatief: harde fout§' || gezien || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('20a§bedrag null en negatief: harde fout§' || gezien
            || '§WIJKT AF — dan boekt de administratie een bedrag dat niet bestaat'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('20a§bedrag null en negatief: harde fout§de test zelf liep vast: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;

      -- ── 20b. EEN BEDRAG VAN NUL ───────────────────────────────
      --  Geen fout (een nul is een welgevormde melding; een fout zou
      --  Mollie eindeloos laten herhalen), maar ook geen pakket: er
      --  bestaat geen upgrade die nul euro kost.
      set local role service_role;
      begin
        select pakket, geldig_tot into gezien, d_was from public.abonnementen where club_id = c_bd;
        perform public.verwerk_wissel_betaling('tr_wisselbedrag', c_bd, 'club', 'maand',
                  now(), 0, 'live', 'cst_wissel1', 'EUR');
        select pakket, geldig_tot into regel, d_nu from public.abonnementen where club_id = c_bd;
        if regel = gezien and d_nu = d_was then
          r := array_append(r, ('20b§bedrag 0: geen fout, maar ook geen pakket§pakket blijft ' || gezien || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('20b§bedrag 0: geen fout, maar ook geen pakket§pakket '
            || coalesce(gezien,'(leeg)') || ' -> ' || coalesce(regel,'(leeg)') || '§<< LEK — een gratis upgrade'));
        end if;
        update public.abonnement_wissels set status = 'mislukt', afgerond_op = now()
          where club_id = c_bd and afgerond_op is null;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('20b§bedrag 0: geen fout, maar ook geen pakket§er kwam een FOUT: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF — nul is geen fout maar een boeking zonder pakket'));
      end;
      reset role;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  21. DE TWEE SLOTEN OP DE NIEUWE FUNCTIES
    --  ─────────────────────────────────────────────────────────
    --  Woordelijk dezelfde opzet als blok 2 van
    --  tests/betaling-verwerken.test.sql, en om dezelfde reden: 21a
    --  houdt ook stand als slot 2 niet bestaat (slot 1 slaat immers als
    --  eerste toe). 21c geeft het execute-recht daarom TIJDELIJK terug,
    --  precies zoals een verdwaalde "drop + create" dat zou doen, en
    --  meet dan of de functie zélf nog tegenhoudt. Struikelt hij dan op
    --  zijn eigen foutmelding (P0001) in plaats van op 42501, dan is
    --  bewezen dat het een echt tweede, onafhankelijk slot is.
    -- ══════════════════════════════════════════════════════════
    if not (heeft_wisselen and heeft_verwerk) then
      afwijkingen := afwijkingen + 3;
      r := array_append(r, '21a§slot 1: anon en authenticated worden geweigerd (42501)§' || nvt || '§WIJKT AF');
      r := array_append(r, '21b§slot 1 in de catalogus: alleen service_role mag het§' || nvt || '§WIJKT AF');
      r := array_append(r, '21c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen (P0001)§' || nvt || '§WIJKT AF');
    else
      -- ── 21a. in de praktijk, voor allebei de rollen ─────────
      vlag := true; gezien := '';
      foreach regel in array array['anon','authenticated'] loop
        perform set_config('request.jwt.claim.sub', u_st::text, true);
        perform set_config('request.jwt.claims', '{"role":"' || regel || '"}', true);
        execute 'set local role ' || regel;
        begin
          perform public.wissel_abonnement(c_st, 'coach', 'club', 'upgrade_gratis');
          vlag := false; gezien := gezien || regel || ' mocht wissel_abonnement! ';
        exception when insufficient_privilege then
          gezien := gezien || regel || ': 42501. ';
        when others then
          vlag := false; gezien := gezien || regel || ': ' || sqlstate || ' (niet het rechtenslot). ';
        end;
        begin
          perform public.verwerk_wissel_betaling('tr_indringer_wissel', c_st, 'club', 'maand',
                    now(), 3640, 'live', null, 'EUR');
          vlag := false; gezien := gezien || regel || ' mocht verwerk_wissel_betaling! ';
        exception when insufficient_privilege then
          gezien := gezien || regel || ': 42501. ';
        when others then
          vlag := false; gezien := gezien || regel || ': ' || sqlstate || ' (niet het rechtenslot). ';
        end;
        reset role;
      end loop;
      perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
      if vlag then
        r := array_append(r, ('21a§slot 1: anon en authenticated worden geweigerd (42501)§' || gezien || '§ZOALS VERWACHT'));
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('21a§slot 1: anon en authenticated worden geweigerd (42501)§' || gezien
          || '§<< LEK — wie de naam van de functie kent, wisselt zijn eigen pakket'));
      end if;

      -- ── 21b. en in de catalogus ─────────────────────────────
      vlag := true; gezien := '';
      foreach regel in array array['wissel_gegevens','wissel_abonnement','start_wissel','verwerk_wissel_betaling'] loop
        declare
          sig text;
        begin
          select p.oid::regprocedure::text into sig
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = regel limit 1;
          if sig is null then
            vlag := false; gezien := gezien || regel || ': bestaat niet. ';
          elsif has_function_privilege('authenticated', sig, 'execute')
             or has_function_privilege('anon', sig, 'execute')
             or has_function_privilege('public', sig, 'execute')
             or not has_function_privilege('service_role', sig, 'execute') then
            vlag := false;
            gezien := gezien || regel || ': OPEN voor meer dan service_role. ';
          else
            gezien := gezien || regel || ': ok. ';
          end if;
        end;
      end loop;
      if vlag then
        r := array_append(r, ('21b§slot 1 in de catalogus: alleen service_role mag het§' || gezien || '§ZOALS VERWACHT'));
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('21b§slot 1 in de catalogus: alleen service_role mag het§' || gezien
          || '§WIJKT AF — zonder revoke mag PUBLIC het, ook zonder account'));
      end if;

      -- ── 21c. slot 2, helemaal apart ─────────────────────────
      declare
        sig text;
      begin
        select p.oid::regprocedure::text into sig
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'verwerk_wissel_betaling' limit 1;
        execute 'grant execute on function ' || sig || ' to authenticated';
        perform set_config('request.jwt.claim.sub', u_st::text, true);
        perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
        set local role authenticated;
        begin
          perform public.verwerk_wissel_betaling('tr_indringer_wissel2', c_st, 'club', 'maand',
                    now(), 3640, 'live', null, 'EUR');
          reset role;
          afwijkingen := afwijkingen + 1;
          r := array_append(r, '21c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen (P0001)§GELUKT§<< LEK — er is maar ÉÉN slot; valt dat weg, dan ligt alles open');
        exception when insufficient_privilege then
          reset role;
          afwijkingen := afwijkingen + 1;
          r := array_append(r, '21c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen (P0001)§nog steeds 42501§WIJKT AF — de grant kwam niet aan; deze meting zegt niets');
        when raise_exception then
          reset role;
          r := array_append(r, '21c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen (P0001)§GEWEIGERD door de functie zelf (P0001)§ZOALS VERWACHT');
        when others then
          reset role;
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('21c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen (P0001)§geweigerd met '
            || sqlstate || ': ' || sqlerrm || '§WIJKT AF — verwacht een eigen foutmelding van de functie'));
        end;
        reset role;
        execute 'revoke execute on function ' || sig || ' from authenticated';
      exception when others then
        reset role;
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('21c§slot 2 APART: met execute-recht erbij houdt de functie zélf tegen (P0001)§de test zelf liep vast: '
          || sqlerrm || '§WIJKT AF'));
      end;
      perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
    end if;

    -- ══════════════════════════════════════════════════════════
    --  22. HET VANGNET IN verwerk_betaling()
    --  ─────────────────────────────────────────────────────────
    --  Verzekering tegen een toekomstige routeringsfout in
    --  betaling-melding: komt een wisselbetaling toch bij de gewone
    --  functie terecht, dan hoort die HARD te weigeren. Zou hij hem
    --  gewoon verwerken, dan telt hij een hele periode op bij
    --  geldig_tot — precies de fout die we hier aan het repareren zijn,
    --  maar dan via een omweg.
    -- ══════════════════════════════════════════════════════════
    if not (heeft_tabel and heeft_start) then
      afwijkingen := afwijkingen + 2;
      r := array_append(r, '22a§verwerk_betaling() weigert een betaalnummer dat bij een wissel hoort§' || nvt || '§WIJKT AF');
      r := array_append(r, '22b§een gewone betaling legt ook de termijn vast bij het abonnement§' || nvt || '§WIJKT AF');
    else
      set local role service_role;
      begin
        select geldig_tot into d_was from public.abonnementen where club_id = c_vn;
        perform public.start_wissel(c_vn, 'coach', 'club', 'maand', 3640, 18, 30);
        update public.abonnement_wissels set mollie_betaling_id = 'tr_wisselverdwaald'
          where club_id = c_vn and afgerond_op is null;
        begin
          perform public.verwerk_betaling('tr_wisselverdwaald', c_vn, 'club', 'maand',
                    now(), 3640, 'live', 'cst_wissel1', 'EUR');
          select geldig_tot into d_nu from public.abonnementen where club_id = c_vn;
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('22a§verwerk_betaling() weigert een betaalnummer dat bij een wissel hoort§GEEN fout, einddatum '
            || coalesce(d_was::text,'(leeg)') || ' -> ' || coalesce(d_nu::text,'(leeg)')
            || '§WIJKT AF — een routeringsfout geeft dan stilletjes een extra periode'));
        exception when others then
          select geldig_tot into d_nu from public.abonnementen where club_id = c_vn;
          if d_nu is not distinct from d_was then
            r := array_append(r, ('22a§verwerk_betaling() weigert een betaalnummer dat bij een wissel hoort§harde fout ('
              || sqlstate || '), einddatum ongewijzigd§ZOALS VERWACHT'));
          else
            afwijkingen := afwijkingen + 1;
            r := array_append(r, ('22a§verwerk_betaling() weigert een betaalnummer dat bij een wissel hoort§fout, maar de einddatum veranderde: '
              || coalesce(d_was::text,'(leeg)') || ' -> ' || coalesce(d_nu::text,'(leeg)') || '§WIJKT AF'));
          end if;
        end;
        update public.abonnement_wissels set status = 'afgebroken', afgerond_op = now()
          where club_id = c_vn and afgerond_op is null;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('22a§verwerk_betaling() weigert een betaalnummer dat bij een wissel hoort§de test zelf liep vast: '
          || sqlerrm || '§WIJKT AF'));
      end;
      reset role;

      -- ── 22b. de termijn bij het abonnement ──────────────────
      --  wissel_gegevens() kan zonder periodelengte niets uitrekenen,
      --  en de enige plek waar die vandaan kan komen is de betaling
      --  zelf. Vergeet verwerk_betaling() die kolom te vullen, dan is
      --  elke verrekening voor een jaarklant een maandberekening.
      set local role service_role;
      begin
        update public.abonnementen set termijn = null where club_id = c_zk;
        perform public.verwerk_betaling('tr_gewoontermijn1', c_zk, 'coach', 'jaar',
                  now(), 6990, 'live', 'cst_wissel1', 'EUR');
        select termijn into gezien from public.abonnementen where club_id = c_zk;
        if gezien = 'jaar' then
          r := array_append(r, '22b§een gewone betaling legt ook de termijn vast bij het abonnement§jaar§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('22b§een gewone betaling legt ook de termijn vast bij het abonnement§'
            || coalesce(gezien,'(leeg)') || '§WIJKT AF — dan rekent de verrekening met de verkeerde periode'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('22b§een gewone betaling legt ook de termijn vast bij het abonnement§onverwachte fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  23. wissel_status() — DE ENIGE DEUR VOOR DE APP ZELF
    --  ─────────────────────────────────────────────────────────
    --  De club moet kunnen zien of zijn wissel nog onderweg is. Dat is
    --  de enige leesfunctie voor authenticated, en dus de enige plek
    --  waar is_eigenaar() het werk moet doen. Een trainer of kijker van
    --  dezelfde club hoort niets te zien: wat een club betaalt is
    --  bestuurszaak.
    -- ══════════════════════════════════════════════════════════
    if not (heeft_status and heeft_start) then
      afwijkingen := afwijkingen + 3;
      r := array_append(r, '23a§de eigenaar ziet zijn eigen wisselpoging§' || nvt || '§WIJKT AF');
      r := array_append(r, '23b§een trainer van dezelfde club ziet niets§' || nvt || '§WIJKT AF');
      r := array_append(r, '23c§een eigenaar van een ANDERE club ziet niets§' || nvt || '§WIJKT AF');
    else
      set local role service_role;
      perform public.start_wissel(c_st, 'coach', 'club', 'maand', 3640, 22, 30);
      reset role;

      -- 23a — de eigenaar
      perform set_config('request.jwt.claim.sub', u_st::text, true);
      perform set_config('request.jwt.claim.role', 'authenticated', true);
      perform set_config('request.jwt.claims',
                         json_build_object('sub', u_st::text, 'role', 'authenticated')::text, true);
      set local role authenticated;
      begin
        select count(*)::int into tel from public.wissel_status(c_st);
        select naar_pakket into gezien from public.wissel_status(c_st);
        reset role;
        if tel = 1 and gezien = 'club' then
          r := array_append(r, '23a§de eigenaar ziet zijn eigen wisselpoging§1 regel, naar club§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('23a§de eigenaar ziet zijn eigen wisselpoging§' || tel || ' regel(s), naar '
            || coalesce(gezien,'(leeg)') || '§WIJKT AF — dan ziet de club nooit of zijn wissel loopt'));
        end if;
      exception when others then
        reset role;
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('23a§de eigenaar ziet zijn eigen wisselpoging§onverwachte fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;

      -- 23b — een trainer van dezelfde club
      perform set_config('request.jwt.claim.sub', u_lid::text, true);
      perform set_config('request.jwt.claims',
                         json_build_object('sub', u_lid::text, 'role', 'authenticated')::text, true);
      set local role authenticated;
      begin
        select count(*)::int into tel from public.wissel_status(c_st);
        reset role;
        if tel = 0 then
          r := array_append(r, '23b§een trainer van dezelfde club ziet niets§0 regels§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('23b§een trainer van dezelfde club ziet niets§' || tel
            || ' regel(s)§WIJKT AF — wat een club betaalt is bestuurszaak'));
        end if;
      exception when others then
        reset role;
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('23b§een trainer van dezelfde club ziet niets§onverwachte fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;

      -- 23c — de eigenaar van een andere club
      perform set_config('request.jwt.claim.sub', u_an::text, true);
      perform set_config('request.jwt.claims',
                         json_build_object('sub', u_an::text, 'role', 'authenticated')::text, true);
      set local role authenticated;
      begin
        select count(*)::int into tel from public.wissel_status(c_st);
        reset role;
        if tel = 0 then
          r := array_append(r, '23c§een eigenaar van een ANDERE club ziet niets§0 regels§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('23c§een eigenaar van een ANDERE club ziet niets§' || tel
            || ' regel(s)§<< LEK — dan leest elke club het abonnement van de buren'));
        end if;
      exception when others then
        reset role;
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('23c§een eigenaar van een ANDERE club ziet niets§onverwachte fout: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;
      reset role;
      perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
      set local role service_role;
      update public.abonnement_wissels set status = 'afgebroken', afgerond_op = now()
        where club_id = c_st and afgerond_op is null;
      reset role;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  24. DE RANDGEVALLEN UIT VEERLES TABEL — DE FEITEN
    --  ─────────────────────────────────────────────────────────
    --  De BESLISSING (mag het, en is het gratis) valt in de edge
    --  function; die wordt getoetst in wissel.test.ts. Hier staat de
    --  andere helft: geeft wissel_gegevens() de feiten terug waar die
    --  beslissing op rust? Een weigering die op verkeerde feiten rust,
    --  is net zo fout als geen weigering.
    -- ══════════════════════════════════════════════════════════
    if not heeft_gegevens then
      afwijkingen := afwijkingen + 4;
      r := array_append(r, '24a§free: pakket free, geen einddatum, geen periodelengte§' || nvt || '§WIJKT AF');
      r := array_append(r, '24b§onbeperkt (met de hand gezet): geen einddatum, geen dagen§' || nvt || '§WIJKT AF');
      r := array_append(r, '24c§verlopen abonnement: resterende_dagen is 0, niet negatief§' || nvt || '§WIJKT AF');
      r := array_append(r, '24d§geen incasso bekend: het veld komt leeg terug§' || nvt || '§WIJKT AF');
    else
      -- 24a — een free-club
      select * into g from public.wissel_gegevens(c_fr);
      if g.pakket = 'free' and g.geldig_tot is null and g.totale_dagen is null then
        r := array_append(r, '24a§free: pakket free, geen einddatum, geen periodelengte§free, alles leeg§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('24a§free: pakket free, geen einddatum, geen periodelengte§pakket='
          || coalesce(g.pakket,'(leeg)') || ', geldig_tot=' || coalesce(g.geldig_tot::text,'(leeg)')
          || ', totale_dagen=' || coalesce(g.totale_dagen::text,'(leeg)')
          || '§WIJKT AF — dan kan de edge function een free-club niet herkennen'));
      end if;

      -- 24b — onbeperkt, met de hand door Evan gezet
      --  Hier moet géén getal uitkomen. Zou totale_dagen hier 30 zijn,
      --  dan rekent de verrekening een bedrag uit voor een periode die
      --  niet bestaat — en betaalt de club voor lucht.
      select * into g from public.wissel_gegevens(c_ob);
      if g.pakket = 'club' and g.geldig_tot is null
         and g.totale_dagen is null and g.resterende_dagen is null then
        r := array_append(r, '24b§onbeperkt (met de hand gezet): geen einddatum, geen dagen§club, geen datum, geen dagen§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('24b§onbeperkt (met de hand gezet): geen einddatum, geen dagen§geldig_tot='
          || coalesce(g.geldig_tot::text,'(leeg)') || ', totale_dagen=' || coalesce(g.totale_dagen::text,'(leeg)')
          || ', resterend=' || coalesce(g.resterende_dagen::text,'(leeg)')
          || '§WIJKT AF — een verrekening over een periode die niet bestaat'));
      end if;

      -- 24c — verlopen, in de coulanceperiode
      select * into g from public.wissel_gegevens(c_vl);
      if g.resterende_dagen = 0 then
        r := array_append(r, '24c§verlopen abonnement: resterende_dagen is 0, niet negatief§0§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('24c§verlopen abonnement: resterende_dagen is 0, niet negatief§'
          || coalesce(g.resterende_dagen::text,'(leeg)')
          || '§WIJKT AF — een negatief getal maakt van een upgrade een teruggave'));
      end if;

      -- 24d — geen doorlopende incasso bekend
      select * into g from public.wissel_gegevens(c_zs);
      if g.mollie_subscription_id is null then
        r := array_append(r, '24d§geen incasso bekend: het veld komt leeg terug§leeg§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('24d§geen incasso bekend: het veld komt leeg terug§'
          || g.mollie_subscription_id || '§WIJKT AF — dan denkt de edge function dat er iets te wijzigen valt'));
      end if;
    end if;

    -- ══════════════════════════════════════════════════════════
    --  25. mollie_bedrag_cent — WAT WIJ DENKEN DAT MOLLIE AFSCHRIJFT
    --  ─────────────────────────────────────────────────────────
    --  Dit veld mag ALLEEN gevuld worden nadat Mollie een wijziging
    --  heeft bevestigd. Hier toetsen we het enige dat in SQL te toetsen
    --  is: dat de kolom bestaat, en dat verwerk_wissel_betaling() hem
    --  NIET vast alvast invult. Zou hij dat wel doen, dan staat er in
    --  de database een bedrag dat bij Mollie misschien nooit is
    --  doorgevoerd — en dan is de controle later waardeloos.
    -- ══════════════════════════════════════════════════════════
    select exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'abonnementen'
                      and column_name = 'mollie_bedrag_cent') into vlag;
    if not vlag then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '25§de kolom mollie_bedrag_cent bestaat en wordt niet vooraf gevuld§de kolom bestaat niet§WIJKT AF');
    else
      select mollie_bedrag_cent into tel from public.abonnementen where club_id = c_up;
      if tel is null then
        r := array_append(r, '25§de kolom mollie_bedrag_cent bestaat en wordt niet vooraf gevuld§leeg na een geslaagde wissel§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('25§de kolom mollie_bedrag_cent bestaat en wordt niet vooraf gevuld§'
          || tel || '§WIJKT AF — alleen invullen ná een bevestigde wijziging bij Mollie'));
      end if;
    end if;

    reset role;

    -- Hier laten we de deeltransactie expres klappen.
    raise exception 'TT_TEST_KLAAR';
  exception when others then
    reset role;
    if sqlerrm <> 'TT_TEST_KLAAR' then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('!§de test zelf liep vast§' || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
    end if;
  end;

  -- ══════════════════════════════════════════════════════════
  --  11. TWEE WISSELS OP HETZELFDE MOMENT
  --  ─────────────────────────────────────────────────────────
  --  DIT IS DE TEST DIE HET VERSCHIL BEWIJST tussen "eerst kijken of er
  --  al een wissel loopt en dan schrijven" (onveilig) en de partiële
  --  unieke index (veilig). Twee verzoeken die een paar milliseconden na
  --  elkaar binnenkomen — twee tabbladen, een dubbelklik, een trage
  --  verbinding — zitten bij de eerste vorm allebei in het gat tussen
  --  kijken en schrijven en maken allebei een claim. Dan staan er twee
  --  betalingen open voor dezelfde wissel.
  --
  --  Hij staat BUITEN de teruggedraaide deeltransactie hierboven, en
  --  dat kan niet anders: twee losse databaseverbindingen zien elkaars
  --  onafgeronde werk niet. Deze proef zet daarom zijn eigen club neer,
  --  vastgelegd en wel, en ruimt die daarna zelf op.
  --
  --  WAT DE PROEF DOET
  --    · verbinding A begint een transactie en claimt
  --    · verbinding B begint een transactie en claimt óók — maar mag
  --      dan NIET verdergaan: hij hoort te WACHTEN op het indexslot
  --    · A legt vast; B krijgt daarna 23505 en er staat één claim
  --  Dat wachten is het bewijs. Een implementatie zonder index wacht
  --  niet, en schrijft dus vrolijk een tweede claim.
  --
  --  Dit deel heeft de uitbreiding dblink nodig (om vanuit één SQL-test
  --  twee verbindingen te openen). Is die er niet — bijvoorbeeld in de
  --  SQL Editor van Supabase — dan zegt deze test dat eerlijk in plaats
  --  van stilzwijgend groen te zijn.
  -- ══════════════════════════════════════════════════════════
  if not heeft_tabel or not heeft_start then
    afwijkingen := afwijkingen + 1;
    r := array_append(r, '11§twee gelijktijdige wissels: de tweede wacht en faalt, er blijft één claim§' || nvt || '§WIJKT AF');
  else
    begin
      create extension if not exists dblink;
      perform dblink_connect('tt_opzet', 'dbname=' || current_database());
      perform dblink_connect('tt_a', 'dbname=' || current_database());
      perform dblink_connect('tt_b', 'dbname=' || current_database());

      -- Opruimen van een eerdere, mislukte run.
      perform dblink_exec('tt_opzet', format('delete from public.abonnement_wissels where club_id = %L', c_par));
      perform dblink_exec('tt_opzet', format('delete from public.abonnementen where club_id = %L', c_par));
      perform dblink_exec('tt_opzet', format('delete from public.clubs where id = %L', c_par));

      perform dblink_exec('tt_opzet', format(
        'insert into public.clubs (id, naam) values (%L, %L)', c_par, 'Wisselclub gelijktijdig'));
      perform dblink_exec('tt_opzet', format(
        'insert into public.abonnementen (club_id, pakket, geldig_tot, termijn) values (%L, ''coach'', current_date + 26, ''maand'')', c_par));

      v_cmd := format('do $x$ begin perform public.start_wissel(%L::uuid, ''coach'', ''club'', ''maand'', 3640, 26, 30); end $x$', c_par);

      perform dblink_exec('tt_a', 'begin');
      perform dblink_exec('tt_a', v_cmd);

      -- B mag niet wachten op ONS, maar op de index. Daarom eerst zijn
      -- transactie openen en dan pas de claim, asynchroon.
      perform dblink_exec('tt_b', 'begin');
      perform dblink_send_query('tt_b', v_cmd);

      -- Blijft B twee seconden lang bezig? Dan staat hij te wachten op
      -- het slot. Dat is precies wat we willen zien.
      v_wacht := 0; v_busy := 0;
      while v_wacht < 20 loop
        perform pg_sleep(0.1);
        v_busy := dblink_is_busy('tt_b');
        exit when v_busy = 0;
        v_wacht := v_wacht + 1;
      end loop;

      if v_busy = 0 then
        -- B was meteen klaar: er is dus niets dat hem tegenhield.
        vlag := false;
      else
        vlag := true;
      end if;

      -- A legt vast; nu pas kan B verder (en hoort hij te struikelen).
      perform dblink_exec('tt_a', 'commit');

      v_fout := '';
      begin
        perform * from dblink_get_result('tt_b') as t(uitkomst text);
        perform * from dblink_get_result('tt_b') as t(uitkomst text);
      exception when others then
        v_fout := sqlstate;
      end;
      begin
        perform dblink_exec('tt_b', 'rollback');
      exception when others then
        null;
      end;

      select n::int into tel
        from dblink('tt_opzet', format('select count(*) from public.abonnement_wissels where club_id = %L', c_par))
          as t(n bigint);

      if vlag and tel = 1 and v_fout = '23505' then
        r := array_append(r, '11§twee gelijktijdige wissels: de tweede wacht en faalt, er blijft één claim§de tweede stond te wachten, kreeg 23505, één claim§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('11§twee gelijktijdige wissels: de tweede wacht en faalt, er blijft één claim§wachtte de tweede: '
          || vlag::text || ', foutcode: ' || coalesce(nullif(v_fout,''),'GEEN FOUT')
          || ', claims: ' || tel
          || '§<< LEK — zonder de index staan er twee betalingen open voor één wissel'));
      end if;

      -- Zelf opruimen: dit deel rolt niet mee terug.
      perform dblink_exec('tt_opzet', format('delete from public.abonnement_wissels where club_id = %L', c_par));
      perform dblink_exec('tt_opzet', format('delete from public.abonnementen where club_id = %L', c_par));
      perform dblink_exec('tt_opzet', format('delete from public.clubs where id = %L', c_par));
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('11§twee gelijktijdige wissels: de tweede wacht en faalt, er blijft één claim§niet te toetsen hier: '
        || sqlerrm || ' (' || sqlstate || ')§WIJKT AF — draai dit deel lokaal met tests/sql-lokaal/draai.sh (dblink nodig)'));
    end;
    -- Verbindingen altijd sluiten, ook na een fout.
    begin perform dblink_disconnect('tt_a');     exception when others then null; end;
    begin perform dblink_disconnect('tt_b');     exception when others then null; end;
    begin perform dblink_disconnect('tt_opzet'); exception when others then null; end;
  end if;

  foreach regel in array r loop
    deel := string_to_array(regel, '§');
    insert into tt_uitslag_wissel values (deel[1], deel[2], deel[3], deel[4]);
  end loop;

  if afwijkingen = 0 then
    insert into tt_uitslag_wissel values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_wissel values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af',
      'ZIE het wisselontwerp van Veerle en server/20-abonnement-wisselen.sql');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_wissel
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
