-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: verwerkt de betaalketen een melding van Mollie
--                     precies één keer, en alleen als het mag?
--  ─────────────────────────────────────────────────────────────
--  Draai dit lokaal, zonder Supabase aan te raken:
--
--      sh tests/sql-lokaal/draai.sh tests/betaling-verwerken.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql
--
--  Zo draait hij tegen de SQL die er vandaag staat. Dat hoort ROOD te
--  zijn zolang het bedrag nog niet is ingebouwd — zie "WAAROM DEZE TEST
--  NU ROOD IS" verderop.
--
--  Mét een kandidaat-uitbreiding erbij, om te zien of hij ook echt
--  groen wórdt:
--
--      sh tests/sql-lokaal/draai.sh tests/betaling-verwerken.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql /tmp/kandidaat.sql
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
--  4. ER WORDT NIET VASTGELEGD HOEVEEL ER BETAALD IS
--     Toegevoegd op 18 september 2026. De boekhouding kende wél het
--     pakket en de termijn, maar niet het bedrag. Dan is een betaling
--     een regel zonder getal: bij een geschil ("wij hebben € 49 betaald,
--     niet € 6,99"), bij een terugboeking en bij de aangifte is er niets
--     om naar te wijzen. docs/avg-inventaris.md 8.4 gaat er al van uit
--     dat het bedrag en de munteenheid erin staan. Blok 10, en de
--     bedragcontroles die aan blok 3, 4 en 5 zijn toegevoegd.
--
--  ─────────────────────────────────────────────────────────────
--  HET BEDRAG IN CENTEN, NIET IN EURO'S
--
--  bedrag_cent is een heel getal: 699 voor € 6,99, 4900 voor € 49,-.
--  Geld als kommagetal (float) opslaan levert vroeg of laat een bedrag
--  van € 6,989999999 op; dat is de bekendste rekenfout met geld in een
--  database. Mollie doet het zelf ook zo niet — die stuurt
--  amount: {value: "6.99", currency: "EUR"} als tekst, en de servercode
--  rekent dat om naar centen vóórdat verwerk_betaling() wordt
--  aangeroepen. Deze functie krijgt dus altijd een heel getal binnen.
--
--  De bedragen in deze test komen uit docs/pakketten-besluit.md:
--
--      coach per maand      699        (€ 6,99)
--      coach per jaar      6990        (€ 69,90)
--      club  per maand     4900        (€ 49,00)
--      club  per jaar     49000        (€ 490,00)
--
--  Ze staan er met opzet niet allemaal hetzelfde in: zou overal 699
--  staan, dan is niet te zien of het júiste bedrag bij de júiste
--  betaling terechtkomt. 99999 komt een paar keer voor en betekent
--  altijd hetzelfde: een tweede melding met een ander bedrag, die
--  genegeerd hoort te worden.
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
--  DE HANDTEKENING DIE DEZE TEST VERWACHT
--
--      public.verwerk_betaling(
--        p_mollie_id    text,
--        p_club         uuid,
--        p_pakket       text,
--        p_termijn      text,
--        p_betaald_op   timestamptz,
--        p_bedrag_cent  int,                    -- NIEUW, verplicht
--        p_modus        text default 'test',
--        p_mollie_klant text default null,
--        p_valuta       text default 'EUR')     -- NIEUW
--
--  WAAROM p_bedrag_cent OP PLEK ZES STAAT
--  Hij is verplicht — een betaling zonder bedrag is geen betaling — en
--  in PostgreSQL moeten alle parameters mét standaardwaarde achteraan
--  staan. Plek zes is dus de enige plek waar hij kán staan zonder
--  p_modus of p_mollie_klant hun standaardwaarde af te nemen. Hij komt
--  bovendien inhoudelijk vlak achter p_betaald_op: wanneer, hoeveel.
--
--  WAAROM p_valuta HELEMAAL ACHTERAAN STAAT, EN NIET NAAST HET BEDRAG
--  Dat is de gevaarlijke plek. Zou p_valuta vóór p_modus komen, dan
--  betekent de zevende parameter van vandaag ('live') morgen ineens de
--  munteenheid — en 'live' is een geldige tekst, dus Postgres zou daar
--  geen fout over geven. Een bestaande aanroep zou dan stilletjes een
--  live-betaling als munteenheid boeken. Achteraan kan dat niet: elke
--  bestaande aanroep houdt dezelfde betekenis, en wie het bedrag vergeet
--  krijgt een harde fout ("function does not exist") omdat een tekst
--  niet vanzelf een int wordt. Scenario 10i toetst precies dat.
--
--  ─────────────────────────────────────────────────────────────
--  WAAROM DEZE TEST NU ROOD IS
--
--  De eerste versie (18 september 2026) is geschreven vóórdat er ook
--  maar één regel van de betaalketen bestond, en was toen helemaal
--  rood. Sinds server/18-betalingen.sql bestaat, is hij groen — behalve
--  de bedragen. Die zijn dezelfde dag toegevoegd en horen NU rood te
--  zijn: server/18-betalingen.sql kent nog geen bedrag_cent, geen
--  valuta en geen p_bedrag_cent.
--
--  Wat je dan hoort te zien: blok 10 helemaal rood, plus elk scenario
--  dat de functie aanroept met "onverwachte fout: function ... does not
--  exist" — want de aanroepen hieronder gebruiken de nieuwe
--  handtekening. Dat laatste is geen slordigheid maar het bewijs dat
--  het bedrag echt verplicht is: een functie die het bedrag niet kent,
--  is met deze test niet meer aan te roepen.
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
--  · Het omrekenen van euro's naar centen. Mollie stuurt "6.99" als
--    tekst; dat wordt in de edge function omgezet, niet hier. Een
--    fout van een factor honderd (699 wordt 69900) komt met deze test
--    niet boven water — die hoort bij de test van betaling-melding.
--  · Of het bedrag bij het pakket hoort. 10a boekt 49000 voor club/jaar
--    en dat klopt met docs/pakketten-besluit.md, maar de functie
--    controleert dat niet en deze test eist dat ook niet. Zie de
--    uitleg boven blok 10: die regel zou een prijswijziging of een
--    kortingsactie in Mollie de hele betaalketen laten stilzetten, en
--    dat is een besluit van Evan, niet van een test.
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
  -- Drie verenigingen erbij voor blok 10 (het bedrag).
  u_eig_b    uuid := 'be7a1100-0000-4000-a000-00000000000b';
  u_eig_b2   uuid := 'be7a1100-0000-4000-a000-00000000000c';
  u_eig_n    uuid := 'be7a1100-0000-4000-a000-00000000000d';

  c_t uuid; c_l uuid; c_t2 uuid; c_d uuid; c_v uuid; c_g uuid; c_o uuid; c_w uuid;
  c_b uuid; c_b2 uuid; c_n uuid;

  heeft_tabel  boolean;
  heeft_functie boolean;
  -- Bestaat de bedragkolom al? Zonder die kolom is blok 10 niet te
  -- meten en zou elk scenario daar dezelfde nietszeggende fout melden.
  heeft_bedrag boolean;
  bron      text;
  gezien    text;
  tel       int;
  bedrag    int;
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
  nvt_b constant text := 'niet te toetsen: de kolom bedrag_cent bestaat nog niet';
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

    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'betalingen'
                     and column_name = 'bedrag_cent')
      into heeft_bedrag;

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
      (u_beheer, 'test-bet-beheerder@teamtakkie.test'),
      (u_eig_b,  'test-bet-bedrag@teamtakkie.test'),
      (u_eig_b2, 'test-bet-valuta@teamtakkie.test'),
      (u_eig_n,  'test-bet-geenbedrag@teamtakkie.test');

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
    perform set_config('request.jwt.claim.sub', u_eig_b::text, true);
    c_b := public.nieuwe_club('Testclub bedrag', 'Eigenaar B');
    perform set_config('request.jwt.claim.sub', u_eig_b2::text, true);
    c_b2 := public.nieuwe_club('Testclub valuta', 'Eigenaar B2');
    perform set_config('request.jwt.claim.sub', u_eig_n::text, true);
    c_n := public.nieuwe_club('Testclub zonder bedrag', 'Eigenaar N');
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
        perform public.verwerk_betaling('tr_indringer_1', c_l, 'club', 'jaar', now(), 49000, 'live', null);
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
          perform public.verwerk_betaling('tr_indringer_2', c_l, 'club', 'jaar', now(), 49000, 'live', null);
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
        perform public.verwerk_betaling('tr_onbekend_stil', null, 'coach', 'maand', now(), 699, 'live', null);
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
      r := array_append(r, '3e§en mét het bedrag erbij (49000 cent)§' || nvt || '§WIJKT AF');
    else
      -- ── 3a. testbetaling vóór er ooit live geld binnenkwam ───
      --  Deze moet WEL werken: anders kan Evan de hele keten nooit een
      --  keer helemaal doorlopen voordat hij live gaat.
      begin
        perform public.verwerk_betaling('tr_test_vroeg', c_t, 'coach', 'maand', now(), 699, 'test', null);
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
        perform public.verwerk_betaling('tr_live_eerste', c_l, 'club', 'jaar', now(), 49000, 'live', null);
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
        perform public.verwerk_betaling('tr_test_laat', c_t2, 'club', 'jaar', now(), 49000, 'test', null);
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

      -- ── 3e. mét het bedrag erbij ─────────────────────────────
      --  Een genegeerde testbetaling is precies het geval dat je later
      --  wilt kunnen navertellen: "hier is iets geprobeerd, voor dit
      --  bedrag, en het is niet doorgegaan". Zonder bedrag is die regel
      --  in de boeken de helft van het verhaal.
      if not heeft_bedrag then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '3e§en mét het bedrag erbij (49000 cent)§' || nvt_b || '§WIJKT AF');
      else
        begin
          select bedrag_cent, valuta into bedrag, gezien
            from public.betalingen where mollie_betaling_id = 'tr_test_laat';
          if bedrag = 49000 and gezien = 'EUR' then
            r := array_append(r, '3e§en mét het bedrag erbij (49000 cent)§49000 EUR§ZOALS VERWACHT');
          else
            afwijkingen := afwijkingen + 1;
            r := array_append(r, ('3e§en mét het bedrag erbij (49000 cent)§'
              || coalesce(bedrag::text, 'geen bedrag') || ' ' || coalesce(gezien, 'geen valuta')
              || '§WIJKT AF — een geweigerde poging zonder bedrag is later niet na te vertellen'));
          end if;
        exception when others then
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('3e§en mét het bedrag erbij (49000 cent)§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
        end;
      end if;
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
      r := array_append(r, '4d§het bedrag blijft dat van de eerste melding§' || nvt || '§WIJKT AF');
    else
      -- De rij zoals betaling-starten hem neerzet: aangemaakt, nog niet
      -- verwerkt. Dit is de gewone weg bij een eerste betaling.
      insert into public.betalingen (mollie_betaling_id, club_id, club_naam, pakket, termijn, modus, status)
        values ('tr_dubbel', c_d, 'Testclub dubbele melding', 'coach', 'maand', 'live', 'open');

      begin
        perform public.verwerk_betaling('tr_dubbel', c_d, 'coach', 'maand', now(), 699, 'live', null);
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

      -- De tweede melding komt met een ANDER bedrag binnen (99999 cent).
      -- Dat is met opzet: zo meet 4d niet alleen of er iets staat, maar
      -- of de genegeerde tweede poging de boekhouding met rust laat. Zou
      -- hier weer 699 staan, dan zou een implementatie die het bedrag
      -- klakkeloos overschrijft er gewoon doorheen komen.
      begin
        perform public.verwerk_betaling('tr_dubbel', c_d, 'coach', 'maand', now(), 99999, 'live', null);
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

      -- ── 4d. en het bedrag is niet meeveranderd ───────────────
      --  De tweede melding meldde 99999 cent. Er is één keer € 6,99
      --  betaald, dus dat hoort er te staan. Staat er 99999, dan
      --  overschrijft de functie een al afgehandelde betaling — en dan
      --  is de boekhouding te sturen met een herhaalde webhook.
      if not heeft_bedrag then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '4d§het bedrag blijft dat van de eerste melding§' || nvt_b || '§WIJKT AF');
      else
        begin
          select bedrag_cent into bedrag from public.betalingen where mollie_betaling_id = 'tr_dubbel';
          if bedrag = 699 then
            r := array_append(r, '4d§het bedrag blijft dat van de eerste melding§699 cent§ZOALS VERWACHT');
          else
            afwijkingen := afwijkingen + 1;
            r := array_append(r, ('4d§het bedrag blijft dat van de eerste melding§'
              || coalesce(bedrag::text, 'geen bedrag') || ' cent, verwacht 699'
              || '§WIJKT AF — een herhaalde melding kan de boekhouding dan wijzigen'));
          end if;
        exception when others then
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('4d§het bedrag blijft dat van de eerste melding§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
        end;
      end if;
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
      r := array_append(r, '5e§die zelfgemaakte rij heeft het bedrag en de valuta erbij§' || nvt || '§WIJKT AF');
      r := array_append(r, '5f§en een herhaalde verlenging verandert dat bedrag niet§' || nvt || '§WIJKT AF');
    else
      -- De uitgangssituatie: een club die vorige maand via iDEAL is
      -- begonnen. Klantnummer bekend, abonnement loopt nog tien dagen.
      update public.abonnementen
         set pakket = 'coach', geldig_tot = current_date + 10, mollie_klant_id = 'cst_testklant_v'
       where club_id = c_v;

      begin
        perform public.verwerk_betaling('tr_verlenging_1', null, 'coach', 'maand', now(), 699, 'live', 'cst_testklant_v');
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

      -- ── 5e. en die rij heeft ook een bedrag ──────────────────
      --  Dit is het geval waar de boekhouding het snelst een gat
      --  oploopt: de rij wordt door de functie zélf aangemaakt, niet
      --  door betaling-starten. Wie het bedrag alleen in de update
      --  meeneemt en niet in de insert, mist vanaf maand twee élk
      --  bedrag — en merkt dat pas een jaar later.
      if not heeft_bedrag then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '5e§die zelfgemaakte rij heeft het bedrag en de valuta erbij§' || nvt_b || '§WIJKT AF');
      else
        begin
          select bedrag_cent, valuta into bedrag, gezien
            from public.betalingen where mollie_betaling_id = 'tr_verlenging_1';
          if bedrag = 699 and gezien = 'EUR' then
            r := array_append(r, '5e§die zelfgemaakte rij heeft het bedrag en de valuta erbij§699 EUR§ZOALS VERWACHT');
          else
            afwijkingen := afwijkingen + 1;
            r := array_append(r, ('5e§die zelfgemaakte rij heeft het bedrag en de valuta erbij§'
              || coalesce(bedrag::text, 'geen bedrag') || ' ' || coalesce(gezien, 'geen valuta')
              || ', verwacht 699 EUR§WIJKT AF — elke verlenging staat dan zonder bedrag in de boeken'));
          end if;
        exception when others then
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('5e§die zelfgemaakte rij heeft het bedrag en de valuta erbij§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
        end;
      end if;

      -- ── 5c. ook een verlenging maar één keer ─────────────────
      --  Het slot uit blok 4 moet ook langs deze ingang werken. Doet
      --  het dat niet, dan is een dubbele webhook op een verlenging
      --  gratis een maand extra.
      begin
        d_was := d_nu;
        -- Ook hier een ander bedrag bij de tweede melding — zie 5f.
        perform public.verwerk_betaling('tr_verlenging_1', null, 'coach', 'maand', now(), 99999, 'live', 'cst_testklant_v');
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

      -- ── 5f. hetzelfde als 4d, maar langs de andere ingang ────
      --  Blok 4 gaat door de update-tak, dit door de insert-tak. Een
      --  implementatie kan de ene wél en de andere niet dichthouden.
      if not heeft_bedrag then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '5f§en een herhaalde verlenging verandert dat bedrag niet§' || nvt_b || '§WIJKT AF');
      else
        begin
          select bedrag_cent into bedrag from public.betalingen where mollie_betaling_id = 'tr_verlenging_1';
          if bedrag = 699 then
            r := array_append(r, '5f§en een herhaalde verlenging verandert dat bedrag niet§nog steeds 699 cent§ZOALS VERWACHT');
          else
            afwijkingen := afwijkingen + 1;
            r := array_append(r, ('5f§en een herhaalde verlenging verandert dat bedrag niet§'
              || coalesce(bedrag::text, 'geen bedrag') || ' cent, verwacht 699§WIJKT AF'));
          end if;
        exception when others then
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('5f§en een herhaalde verlenging verandert dat bedrag niet§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
        end;
      end if;

      -- ── 5d. een klantnummer dat hier niet hoort ──────────────
      --  Geen fout, gewoon niets doen. Een fout zou Mollie aan het
      --  opnieuw proberen zetten, en er is niets om opnieuw te proberen.
      begin
        select count(*) into tel from public.betalingen;
        perform public.verwerk_betaling('tr_onbekende_klant', null, 'club', 'jaar', now(), 49000, 'live', 'cst_bestaat_niet');
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
        perform public.verwerk_betaling('tr_datum_1', c_g, 'coach', 'maand', now(), 699, 'live', null);
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
        perform public.verwerk_betaling('tr_datum_2', c_g, 'coach', 'maand', now(), 699, 'live', null);
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
        perform public.verwerk_betaling('tr_datum_3', c_g, 'club', 'jaar', now(), 49000, 'live', null);
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
        perform public.verwerk_betaling('tr_datum_4', c_o, 'club', 'jaar', now(), 49000, 'live', null);
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
        perform public.verwerk_betaling('tr_datum_5', c_g, 'club', 'kwartaal', now(), 49000, 'live', null);
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
        perform public.verwerk_betaling('tr_wordt_wees', c_w, 'coach', 'jaar', now(), 6990, 'live', null);
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

    -- ══════════════════════════════════════════════════════════
    --  10. HOEVEEL IS ER BETAALD?
    --  ─────────────────────────────────────────────────────────
    --  Toegevoegd op 18 september 2026. Tot dan kende de boekhouding
    --  het pakket en de termijn, maar niet het bedrag. Dat is precies
    --  de kolom die je nodig hebt op het moment dat er iets misgaat:
    --  een club die zegt € 49 te hebben betaald en niet € 6,99, een
    --  terugboeking bij de bank, of de aangifte over dat jaar.
    --
    --  DE REGELS DIE HIER WORDEN VASTGELEGD
    --
    --  1. bedrag_cent is een heel getal in centen. 699 = € 6,99.
    --  2. valuta is tekst en staat standaard op 'EUR'.
    --  3. p_bedrag_cent is VERPLICHT: geen standaardwaarde. Een
    --     betaling zonder bedrag is geen betaling, en een functie die
    --     hem ook zonder bedrag accepteert laat stilletjes lege
    --     bedragen in de boeken lopen (10i).
    --  4. Een LEEG bedrag (null) wordt geweigerd met een duidelijke
    --     foutmelding, net als een onbekende termijn (6e). Dat is hier
    --     het gewenste gedrag: de melding zelf deugt niet, er ligt echt
    --     geld klaar, en Mollie hoort het opnieuw te proberen zodat de
    --     fout opvalt in plaats van weg te zakken. (10e)
    --  5. Een NEGATIEF bedrag wordt om dezelfde reden geweigerd. Een
    --     terugboeking is geen betaling en hoort nooit langs deze weg
    --     een maand op te leveren. (10f)
    --  6. Een bedrag van NUL wordt NIET geweigerd, maar levert ook GEEN
    --     pakket op. Waarom het verschil met null: nul is een
    --     welgevormde melding, geen fout. Zou de functie daar een fout
    --     op geven, dan blijft Mollie het eindeloos opnieuw sturen
    --     terwijl er niets te repareren valt. Maar er bestaat geen
    --     pakket dat nul euro kost (docs/pakketten-besluit.md: 6,99 of
    --     49,00), dus een maand weggeven mag hier nooit. De rij komt wél
    --     in de boeken — herkenbaar als afgehandeld en herkenbaar als
    --     níet betaald, precies zoals bij de geweigerde testbetaling in
    --     3d. (10g)
    --  7. Het bedrag uit de MELDING wint van het bedrag dat
    --     betaling-starten alvast had neergezet. Die eerste is een
    --     voornemen, de tweede is wat er werkelijk is afgerekend. (10h)
    --
    --  WAT HIER MET OPZET NIET WORDT AFGEDWONGEN — EEN VRAAG AAN EVAN
    --  Er wordt níet getoetst of het bedrag bij het pakket past (699 bij
    --  coach/maand, 49000 bij club/jaar). Verleidelijk, maar het zou
    --  betekenen dat een prijswijziging of een kortingsactie in Mollie
    --  de hele betaalketen stilzet. Zolang Evan niet heeft gezegd dat
    --  de prijzen vastliggen, hoort die regel hier niet.
    --  Hetzelfde geldt voor een andere munteenheid dan EUR: 10d legt
    --  alleen vast dat hij wordt opgeslagen zoals gemeld en niet stil
    --  wordt omgezet. Of een betaling in dollars geweigerd moet worden,
    --  is een vraag aan Evan en geen aanname van deze test.
    -- ══════════════════════════════════════════════════════════
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

    if not (heeft_tabel and heeft_functie and heeft_bedrag) then
      afwijkingen := afwijkingen + 10;
      r := array_append(r, '10a§een gewone betaling legt het bedrag en de valuta vast§' || nvt_b || '§WIJKT AF');
      r := array_append(r, '10b§de kolommen bedrag_cent (heel getal) en valuta (tekst) bestaan§' || nvt_b || '§WIJKT AF');
      r := array_append(r, '10c§valuta staat standaard op EUR§' || nvt_b || '§WIJKT AF');
      r := array_append(r, '10d§een andere munteenheid wordt opgeslagen zoals gemeld§' || nvt_b || '§WIJKT AF');
      r := array_append(r, '10e§een LEEG bedrag wordt geweigerd§' || nvt_b || '§WIJKT AF');
      r := array_append(r, '10f§een NEGATIEF bedrag wordt geweigerd§' || nvt_b || '§WIJKT AF');
      r := array_append(r, '10g§een bedrag van NUL: geen fout, geen pakket, wél in de boeken§' || nvt_b || '§WIJKT AF');
      r := array_append(r, '10h§het bedrag uit de melding wint van het bedrag dat al klaarstond§' || nvt_b || '§WIJKT AF');
      r := array_append(r, '10i§het bedrag is verplicht: de oude aanroep zonder bedrag bestaat niet meer§' || nvt_b || '§WIJKT AF');
      r := array_append(r, '10j§de handtekening staat vast: zes verplichte parameters, bedrag op plek zes§' || nvt_b || '§WIJKT AF');
    else
      -- ── 10a. een gewone betaling ─────────────────────────────
      --  club per jaar = € 490,- = 49000 cent. Met opzet een ander
      --  bedrag dan overal elders in dit bestand: zo is te zien dat het
      --  bedrag uit DEZE aanroep in DEZE rij terechtkomt.
      begin
        perform public.verwerk_betaling('tr_bedrag_gewoon', c_b, 'club', 'jaar', now(), 49000, 'live', null);
        select bedrag_cent, valuta into bedrag, gezien
          from public.betalingen where mollie_betaling_id = 'tr_bedrag_gewoon';
        if bedrag = 49000 and gezien = 'EUR' then
          r := array_append(r, '10a§een gewone betaling legt het bedrag en de valuta vast§49000 cent, EUR§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('10a§een gewone betaling legt het bedrag en de valuta vast§'
            || coalesce(bedrag::text, 'geen bedrag') || ' ' || coalesce(gezien, 'geen valuta')
            || ', verwacht 49000 EUR§WIJKT AF — dan staat er een betaling in de boeken zonder getal'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10a§een gewone betaling legt het bedrag en de valuta vast§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 10b. het type van de kolommen ────────────────────────
      --  Geld als kommagetal is de bekendste rekenfout met geld in een
      --  database: € 6,99 wordt dan vroeg of laat 6,989999999. Daarom
      --  moet dit een heel getal zijn, en niet numeric of real.
      begin
        select data_type into gezien from information_schema.columns
          where table_schema = 'public' and table_name = 'betalingen' and column_name = 'bedrag_cent';
        select data_type into bron from information_schema.columns
          where table_schema = 'public' and table_name = 'betalingen' and column_name = 'valuta';
        if gezien = 'integer' and bron = 'text' then
          r := array_append(r, '10b§de kolommen bedrag_cent (heel getal) en valuta (tekst) bestaan§integer en text§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('10b§de kolommen bedrag_cent (heel getal) en valuta (tekst) bestaan§bedrag_cent='
            || coalesce(gezien, 'ontbreekt') || ', valuta=' || coalesce(bron, 'ontbreekt')
            || '§WIJKT AF — verwacht integer en text'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10b§de kolommen bedrag_cent (heel getal) en valuta (tekst) bestaan§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 10c. de standaardwaarde EUR ──────────────────────────
      --  10a laat zien dat een aanroep zónder munteenheid EUR oplevert;
      --  dit laat zien dat dat uit de kolom zelf komt en niet uit een
      --  toevallige regel in de functie. Ook een rij die ooit langs een
      --  andere weg wordt bijgeschreven heeft dan een munteenheid.
      begin
        select column_default into gezien from information_schema.columns
          where table_schema = 'public' and table_name = 'betalingen' and column_name = 'valuta';
        if coalesce(gezien, '') like '%EUR%' then
          r := array_append(r, ('10c§valuta staat standaard op EUR§' || gezien || '§ZOALS VERWACHT'));
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('10c§valuta staat standaard op EUR§' || coalesce(gezien, 'geen standaardwaarde') || '§WIJKT AF'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10c§valuta staat standaard op EUR§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 10d. een andere munteenheid ──────────────────────────
      --  Zie de opmerking bovenaan dit blok: dit legt ALLEEN vast dat
      --  er niets stils gebeurt. Een melding in dollars die als EUR in
      --  de boeken komt, is een verkeerd bedrag dat nergens meer aan te
      --  zien is.
      begin
        perform public.verwerk_betaling('tr_bedrag_usd', c_b2, 'club', 'jaar', now(), 52000, 'live', null, 'USD');
        select valuta into gezien from public.betalingen where mollie_betaling_id = 'tr_bedrag_usd';
        if gezien = 'USD' then
          r := array_append(r, '10d§een andere munteenheid wordt opgeslagen zoals gemeld§USD§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('10d§een andere munteenheid wordt opgeslagen zoals gemeld§' || coalesce(gezien, 'geen valuta')
            || ', gemeld was USD§WIJKT AF — een bedrag in de verkeerde munt is later niet meer te herkennen'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10d§een andere munteenheid wordt opgeslagen zoals gemeld§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 10e. een leeg bedrag ─────────────────────────────────
      begin
        perform public.verwerk_betaling('tr_bedrag_leeg', c_n, 'coach', 'maand', now(), null::int, 'live', null);
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '10e§een LEEG bedrag wordt geweigerd§GELUKT§<< dit hoort te mislukken — een betaling zonder bedrag is geen betaling');
      exception when raise_exception then
        r := array_append(r, ('10e§een LEEG bedrag wordt geweigerd§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10e§een LEEG bedrag wordt geweigerd§mislukt om de VERKEERDE reden: ' || sqlerrm
          || ' (' || sqlstate || ')§WIJKT AF — verwacht een eigen foutmelding van de functie'));
      end;

      -- ── 10f. een negatief bedrag ─────────────────────────────
      --  Mollie stuurt terugboekingen (chargebacks) als een apart
      --  bericht, niet als een betaling met een minbedrag. Komt er hier
      --  tóch een minbedrag binnen, dan klopt er iets niet aan de
      --  servercode — en dan is stil doorgaan het slechtste antwoord.
      begin
        perform public.verwerk_betaling('tr_bedrag_min', c_n, 'coach', 'maand', now(), -699, 'live', null);
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '10f§een NEGATIEF bedrag wordt geweigerd§GELUKT§<< dit hoort te mislukken — een terugboeking levert geen maand op');
      exception when raise_exception then
        r := array_append(r, ('10f§een NEGATIEF bedrag wordt geweigerd§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10f§een NEGATIEF bedrag wordt geweigerd§mislukt om de VERKEERDE reden: ' || sqlerrm
          || ' (' || sqlstate || ')§WIJKT AF'));
      end;

      -- ── 10g. een bedrag van nul ──────────────────────────────
      --  Drie dingen tegelijk, en alle drie horen erbij: geen fout,
      --  geen pakket, wél een rij in de boeken.
      begin
        perform public.verwerk_betaling('tr_bedrag_nul', c_n, 'coach', 'maand', now(), 0, 'live', null);
        select pakket into gezien from public.abonnementen where club_id = c_n;
        select count(*) into tel from public.betalingen
          where mollie_betaling_id = 'tr_bedrag_nul' and verwerkt_op is not null and status <> 'betaald';
        if gezien = 'free' and tel = 1 then
          r := array_append(r, '10g§een bedrag van NUL: geen fout, geen pakket, wél in de boeken§blijft free, 1 afgehandelde rij§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('10g§een bedrag van NUL: geen fout, geen pakket, wél in de boeken§pakket '
            || coalesce(gezien, 'niets') || ', ' || tel || ' passende rij(en)'
            || '§WIJKT AF — of er is een gratis maand weggegeven, of de poging staat nergens'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10g§een bedrag van NUL: geen fout, geen pakket, wél in de boeken§gaf een FOUT: ' || sqlerrm
          || '§WIJKT AF — Mollie blijft dan opnieuw proberen terwijl er niets te repareren valt'));
      end;

      -- ── 10h. de melding wint van wat er klaarstond ───────────
      --  betaling-starten zet de rij neer met het bedrag dat de club op
      --  zijn scherm zag. Wat Mollie daarna méldt is wat er werkelijk
      --  is afgeschreven. Verschillen die twee, dan is de melding de
      --  waarheid — een implementatie met coalesce(oud, nieuw) houdt
      --  hier het verkeerde getal vast.
      begin
        insert into public.betalingen (mollie_betaling_id, club_id, club_naam, pakket, termijn,
                                       modus, status, bedrag_cent, valuta)
          values ('tr_bedrag_vooraf', c_b, 'Testclub bedrag', 'coach', 'maand', 'live', 'open', 100, 'EUR');
        perform public.verwerk_betaling('tr_bedrag_vooraf', c_b, 'coach', 'maand', now(), 699, 'live', null);
        select bedrag_cent into bedrag from public.betalingen where mollie_betaling_id = 'tr_bedrag_vooraf';
        if bedrag = 699 then
          r := array_append(r, '10h§het bedrag uit de melding wint van het bedrag dat al klaarstond§699 cent§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('10h§het bedrag uit de melding wint van het bedrag dat al klaarstond§'
            || coalesce(bedrag::text, 'geen bedrag') || ' cent, verwacht 699'
            || '§WIJKT AF — dan blijft het voorgenomen bedrag staan in plaats van het betaalde'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10h§het bedrag uit de melding wint van het bedrag dat al klaarstond§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- ── 10i. het bedrag is écht verplicht ────────────────────
      --  De oude handtekening had zeven parameters, met de modus op plek
      --  zes. Bestaat die vorm nog, dan kan de edge function gewoon
      --  blijven doen wat hij deed en komen er bedragloze rijen in de
      --  boeken — zonder dat iemand iets merkt. Deze aanroep hoort
      --  daarom te STRUIKELEN.
      --
      --  v_modus is met opzet een variabele van het type text en geen
      --  losse 'live' tussen aanhalingstekens: Postgres mag zo'n los
      --  stukje tekst namelijk alsnog als getal proberen te lezen, en
      --  dan meet dit scenario de verkeerde fout.
      declare
        v_modus text := 'live';
      begin
        perform public.verwerk_betaling('tr_oude_vorm', c_b2, 'club', 'jaar', now(), v_modus, null);
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '10i§het bedrag is verplicht: de oude aanroep zonder bedrag bestaat niet meer§GELUKT§<< de oude vorm bestaat nog — er kunnen bedragloze betalingen in de boeken komen');
      exception when undefined_function then
        r := array_append(r, '10i§het bedrag is verplicht: de oude aanroep zonder bedrag bestaat niet meer§GEWEIGERD: die functie bestaat niet meer§ZOALS VERWACHT');
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10i§het bedrag is verplicht: de oude aanroep zonder bedrag bestaat niet meer§mislukt om de VERKEERDE reden: '
          || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
      end;

      -- ── 10j. de handtekening zelf ────────────────────────────
      --  10i vangt de óude vorm. Dit vangt iets wat 10i niet ziet: een
      --  p_bedrag_cent die wél op plek zes staat maar een
      --  standaardwaarde heeft gekregen ("int default null"). Dan is
      --  het bedrag in naam verplicht en in de praktijk niet, en kan de
      --  servercode hem gewoon weglaten.
      --
      --  Deze controle legt ook de VOLGORDE vast, en dat is met opzet.
      --  Zie het stuk bovenaan dit bestand: p_valuta hoort achter
      --  p_mollie_klant, want op elke eerdere plek verandert hij
      --  stilzwijgend de betekenis van een bestaande aanroep. Wil Bas
      --  een andere volgorde, dan hoort dit scenario het gesprek
      --  daarover te openen — niet een edge function die maanden later
      --  de verkeerde waarde blijkt door te geven.
      begin
        select array_to_string(p.proargnames, ', ') into gezien
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1;
        select p.pronargs - p.pronargdefaults into tel
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1;
        if gezien = 'p_mollie_id, p_club, p_pakket, p_termijn, p_betaald_op, p_bedrag_cent, p_modus, p_mollie_klant, p_valuta'
           and tel = 6 then
          r := array_append(r, '10j§de handtekening staat vast: zes verplichte parameters, bedrag op plek zes§6 verplicht, p_bedrag_cent op plek 6, p_valuta achteraan§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('10j§de handtekening staat vast: zes verplichte parameters, bedrag op plek zes§'
            || coalesce(tel::text, '?') || ' verplicht: ' || coalesce(gezien, 'geen parameternamen')
            || '§WIJKT AF — met een standaardwaarde op het bedrag is "verplicht" alleen een woord'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10j§de handtekening staat vast: zes verplichte parameters, bedrag op plek zes§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
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
