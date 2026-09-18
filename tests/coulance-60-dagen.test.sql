-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: stopt het schrijven na zestig dagen, en geen
--                     dag eerder?
--  ─────────────────────────────────────────────────────────────
--  Draai dit lokaal, zonder Supabase aan te raken:
--
--      sh tests/sql-lokaal/draai.sh tests/coulance-60-dagen.test.sql \
--          server/17-free-serverdata.sql
--
--  Zo draait hij tegen de SQL die er vandaag staat, en dan hoort hij
--  ROOD te zijn — zie "DEZE TEST HOORT NU ROOD TE ZIJN" hieronder.
--
--  Mét de kandidaat-uitbreiding erbij:
--
--      sh tests/sql-lokaal/draai.sh tests/coulance-60-dagen.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql
--
--  Het mag ook in de SQL Editor van Supabase. De test maakt zijn eigen
--  verenigingen, teams en nepaccounts aan en draait alles aan het eind
--  terug. Er blijft niets van achter.
--
--  De uitslag komt als TABEL terug. In de kolom "oordeel" hoort overal
--  ZOALS VERWACHT te staan.
--
--  ─────────────────────────────────────────────────────────────
--  WAAROM DIT EEN APART BESTAND IS
--
--  tests/free-server-afscherming.test.sql gaat over één vraag: komt een
--  vereniging die nooit betaald heeft op de server? Dat bestand is al
--  ruim zeshonderd regels en heeft zijn eigen verhaal.
--
--  Dit bestand gaat over de vraag die dáárna komt: hoe lang mag een
--  vereniging die wél betaald heeft nog doorwerken nadat het geld
--  ophoudt? Dat is rekenwerk met datums, en dat rekenwerk verdient een
--  plek waar het per dag na te lopen is.
--
--  In free-server-afscherming.test.sql is alleen het hoogstnodige
--  veranderd: scenario 5 beloofde daar "ooit betaald = altijd mogen
--  schrijven", en die belofte is per 18 september 2026 niet meer waar.
--  Was dat blijven staan, dan was het een groene test op een verouderde
--  afspraak geweest — en dat is het ergste soort test.
--
--  ─────────────────────────────────────────────────────────────
--  WAAR HET HIER OM GAAT
--
--  Besluit van Evan, 18 september 2026: een vereniging waarvan het
--  abonnement afloopt mag nog ZESTIG DAGEN IN TOTAAL naar de server
--  blijven schrijven. Die zestig dagen zijn niet nieuw bovenop de
--  bestaande respijt, ze zijn inclusief:
--
--      respijt_dagen  14   (bestond al, pakket_instellingen)
--    + coulance_dagen 46   (nieuw)
--    ─────────────────────
--                     60
--
--  Daarom staat er 46 in de instelling en niet 60. Wie daar 60 neerzet,
--  geeft in werkelijkheid 74 dagen weg. Scenario 1b rekent dat na, zodat
--  dat verschil niet van een gesprek afhangt maar van de database.
--
--  Let op: dit wijkt af van docs/avg-inventaris.md 8.8, waar staat
--  "nog zestig dagen bovenop de bestaande veertien dagen respijt".
--  Evan heeft op 18 september bevestigd dat zestig het TOTAAL is. Die
--  ene zin in de inventaris moet nog mee veranderen.
--
--  ─────────────────────────────────────────────────────────────
--  DE VALKUIL IN DE FORMULE — scenario 5, en dat is de belangrijkste
--
--  De voor de hand liggende uitbreiding van mag_serverdata_schrijven()
--  is om de nieuwe voorwaarde er met een "and" naast te hangen:
--
--      mag_schrijven(doel)
--      and (pakket_van_club(doel) <> 'free' or ooit_betaald)
--      and current_date <= coalesce(schrijfrecht_tot(doel), current_date)
--
--  Dat is fout, en op een manier die pas maanden later opvalt.
--
--  betaald_tot gaat namelijk nooit achteruit, maar hij loopt ook niet
--  vanzelf mee met een abonnement zonder einddatum. Een vereniging die
--  van Evan onbeperkt toegang heeft gekregen (pakket coach of club,
--  geen geldig_tot) houdt de betaald_tot van de laatste keer dat er wél
--  een einddatum stond. Staat die datum meer dan zestig dagen terug,
--  dan sluit de formule hierboven een vereniging buiten die volgens
--  pakket_van_club() gewoon 'club' is en volgens Evan gewoon klant.
--
--  De coulance-grens hoort dus BINNEN de ooit-betaald-tak te zitten:
--  hij gaat alleen over verenigingen die op dit moment op free staan.
--  Scenario 5a legt dat verschil vast; zonder dat scenario is de fout
--  niet te zien, want alle andere scenario's staan op free.
--
--  ─────────────────────────────────────────────────────────────
--  DEZE TEST HOORT NU ROOD TE ZIJN
--
--  Geschreven op 18 september 2026, vóórdat betaald_tot, coulance_dagen
--  of schrijfrecht_tot() bestonden. Tegen de SQL van vandaag hoort
--  alles "niet te toetsen" te melden. Dat is het bewijs dat deze
--  scenario's het gat echt vangen.
--
--  ─────────────────────────────────────────────────────────────
--  WAT DEZE TEST NIET BEWIJST
--
--  · Dat er op de dag zelf iets gebeurt. Er draait geen taak die om
--    middernacht iets afsluit; de grens wordt bij elke schrijfpoging
--    opnieuw berekend. Dat is met opzet — een gemiste taak kan hier
--    niets stukmaken.
--  · Dat de gebruiker het merkt. Een geweigerde update geeft in
--    Postgres geen foutmelding, hij raakt nul rijen. Scenario 4d legt
--    dat vast als gedrág van de database; of de app dat ook als
--    mislukking behandelt, staat hier niet. Dat is werk aan de
--    voorkant, in de stijl van tests/team-verwijderen-sync.test.js.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_coulance;
create temp table tt_uitslag_coulance(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  u_30    uuid := 'c0111a11-0000-4000-a000-000000000001';
  u_60    uuid := 'c0111a11-0000-4000-a000-000000000002';
  u_61    uuid := 'c0111a11-0000-4000-a000-000000000003';
  u_oud   uuid := 'c0111a11-0000-4000-a000-000000000004';
  u_onbep uuid := 'c0111a11-0000-4000-a000-000000000005';
  u_nooit uuid := 'c0111a11-0000-4000-a000-000000000006';
  u_hand  uuid := 'c0111a11-0000-4000-a000-000000000007';
  u_beheer uuid := 'c0111a11-0000-4000-a000-000000000008';

  c_30 uuid; c_60 uuid; c_61 uuid; c_oud uuid; c_onbep uuid; c_nooit uuid; c_hand uuid;

  t_30    constant text := 'tt-coul-team-30';
  t_60    constant text := 'tt-coul-team-60';
  t_61    constant text := 'tt-coul-team-61';
  t_oud   constant text := 'tt-coul-team-oud';
  t_onbep constant text := 'tt-coul-team-onbep';
  t_nooit constant text := 'tt-coul-team-nooit';

  heeft_kolom  boolean;
  heeft_functie boolean;
  heeft_getal  boolean;
  alles_er     boolean;
  respijt int; coulance int;
  geraakt int;
  gezien  text;
  d       date;
  afwijkingen int := 0;
  r text[] := '{}';
  regel text;
  deel  text[];
  nvt constant text := 'niet te toetsen: de coulance-regeling bestaat nog niet';
begin
  -- Alles in een deeltransactie die we aan het eind expres laten
  -- klappen; de uitslagen in `r` overleven dat, want variabelen rollen
  -- niet terug. Zelfde opzet als de andere SQL-tests in deze map.
  begin

    -- ══ 1. STAAT ALLES ER, EN KLOPPEN DE GETALLEN? ═══════════
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'abonnementen'
                     and column_name = 'betaald_tot') into heeft_kolom;
    select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = 'schrijfrecht_tot') into heeft_functie;
    select exists (select 1 from public.pakket_instellingen
                   where sleutel = 'coulance_dagen') into heeft_getal;
    alles_er := heeft_kolom and heeft_functie and heeft_getal;

    if heeft_getal then
      select getal into coulance from public.pakket_instellingen where sleutel = 'coulance_dagen';
      if coulance = 46 then
        r := array_append(r, '1a§de instelling coulance_dagen staat op 46§46§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('1a§de instelling coulance_dagen staat op 46§' || coulance
          || '§WIJKT AF — 60 is het TOTAAL, dus 60 min de 14 dagen respijt die er al waren'));
      end if;
    else
      afwijkingen := afwijkingen + 1;
      coulance := null;
      r := array_append(r, '1a§de instelling coulance_dagen staat op 46§' || nvt || '§WIJKT AF');
    end if;

    select getal into respijt from public.pakket_instellingen where sleutel = 'respijt_dagen';
    if respijt is not null and coulance is not null and respijt + coulance = 60 then
      r := array_append(r, ('1b§respijt + coulance is samen 60 dagen§' || respijt || ' + ' || coulance || ' = 60§ZOALS VERWACHT'));
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('1b§respijt + coulance is samen 60 dagen§' || coalesce(respijt::text, '?')
        || ' + ' || coalesce(coulance::text, '?') || ' = ' || coalesce((respijt + coulance)::text, '?')
        || '§WIJKT AF — het besluit van Evan is zestig dagen in totaal'));
    end if;

    if heeft_kolom then
      r := array_append(r, '1c§de kolom abonnementen.betaald_tot bestaat§ja§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '1c§de kolom abonnementen.betaald_tot bestaat§NEE§WIJKT AF');
    end if;

    -- schrijfrecht_tot() moet met verhoogde rechten draaien, om
    -- dezelfde reden als pakket_van_club() en mag_serverdata_schrijven():
    -- zonder dat loopt hij vast op de leesregel van abonnementen zodra
    -- hij voor een andere vereniging dan je eigen wordt aangeroepen, en
    -- is het antwoord onterecht "geen recht".
    select case when prosecdef then 'security definer' else 'security invoker' end into gezien
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'schrijfrecht_tot' limit 1;
    if gezien = 'security definer' then
      r := array_append(r, '1d§schrijfrecht_tot() bestaat en draait met verhoogde rechten§security definer§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('1d§schrijfrecht_tot() bestaat en draait met verhoogde rechten§'
        || coalesce(gezien, 'de functie bestaat niet') || '§WIJKT AF'));
    end if;

    -- ══ OPBOUW ═══════════════════════════════════════════════
    insert into auth.users (id, email) values
      (u_30,     'test-coul-30@teamtakkie.test'),
      (u_60,     'test-coul-60@teamtakkie.test'),
      (u_61,     'test-coul-61@teamtakkie.test'),
      (u_oud,    'test-coul-oud@teamtakkie.test'),
      (u_onbep,  'test-coul-onbeperkt@teamtakkie.test'),
      (u_nooit,  'test-coul-nooit@teamtakkie.test'),
      (u_hand,   'test-coul-handmatig@teamtakkie.test'),
      (u_beheer, 'test-coul-beheerder@teamtakkie.test');

    insert into public.beheerders (gebruiker_id, notitie)
      values (u_beheer, 'test-beheerder (coulance-60-dagen)');

    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_30::text, true);
    c_30 := public.nieuwe_club('Testclub 30 dagen verlopen', 'Eigenaar 30');
    perform set_config('request.jwt.claim.sub', u_60::text, true);
    c_60 := public.nieuwe_club('Testclub precies 60 dagen', 'Eigenaar 60');
    perform set_config('request.jwt.claim.sub', u_61::text, true);
    c_61 := public.nieuwe_club('Testclub 61 dagen verlopen', 'Eigenaar 61');
    perform set_config('request.jwt.claim.sub', u_oud::text, true);
    c_oud := public.nieuwe_club('Testclub oude klant zonder betaald_tot', 'Eigenaar oud');
    perform set_config('request.jwt.claim.sub', u_onbep::text, true);
    c_onbep := public.nieuwe_club('Testclub onbeperkt van Evan', 'Eigenaar onbeperkt');
    perform set_config('request.jwt.claim.sub', u_nooit::text, true);
    c_nooit := public.nieuwe_club('Testclub nooit betaald', 'Eigenaar nooit');
    perform set_config('request.jwt.claim.sub', u_hand::text, true);
    c_hand := public.nieuwe_club('Testclub voor de trigger', 'Eigenaar trigger');
    reset role;

    insert into public.teams (id, club_id, naam) values
      (t_30,    c_30,    'Team 30'),
      (t_60,    c_60,    'Team 60'),
      (t_61,    c_61,    'Team 61'),
      (t_oud,   c_oud,   'Team oud'),
      (t_onbep, c_onbep, 'Team onbeperkt'),
      (t_nooit, c_nooit, 'Team nooit');

    -- Iets om op te wijzigen, te lezen en te verwijderen. Met de hand
    -- neergezet, want de inserts door de gebruikers zelf zijn juist
    -- wat er getoetst wordt.
    insert into public.gegevens (team_id, sleutel, waarde) values
      (t_30,    'fch_spelers_v1', '[]'::jsonb),
      (t_60,    'fch_spelers_v1', '[]'::jsonb),
      (t_61,    'fch_spelers_v1', '[]'::jsonb),
      (t_61,    'tt_weg_v1',      '[]'::jsonb),
      (t_61,    'tt_lezen_v1',    '[]'::jsonb),
      (t_oud,   'fch_spelers_v1', '[]'::jsonb),
      (t_onbep, 'fch_spelers_v1', '[]'::jsonb),
      (t_nooit, 'fch_spelers_v1', '[]'::jsonb);

    if not alles_er then
      afwijkingen := afwijkingen + 15;
      r := array_append(r, '2a§betaalde periode: betaald_tot gaat mee met geldig_tot§' || nvt || '§WIJKT AF');
      r := array_append(r, '2b§terug naar free: betaald_tot blijft staan§' || nvt || '§WIJKT AF');
      r := array_append(r, '2c§een EERDERE einddatum zet betaald_tot niet terug§' || nvt || '§WIJKT AF');
      r := array_append(r, '2d§een LATERE einddatum schuift betaald_tot wel vooruit§' || nvt || '§WIJKT AF');
      r := array_append(r, '2e§betaald_tot met de hand terugzetten lukt niet§' || nvt || '§WIJKT AF');
      r := array_append(r, '2f§idem, maar op een vereniging die al op free staat§' || nvt || '§WIJKT AF');
      r := array_append(r, '3a§schrijfrecht_tot() = betaald_tot + 60 dagen§' || nvt || '§WIJKT AF');
      r := array_append(r, '3b§geen betaald_tot bekend: schrijfrecht_tot() geeft niets§' || nvt || '§WIJKT AF');
      r := array_append(r, '4a§30 dagen verlopen: mag nog schrijven§' || nvt || '§WIJKT AF');
      r := array_append(r, '4b§precies 60 dagen verlopen: mag nog net§' || nvt || '§WIJKT AF');
      r := array_append(r, '4c§61 dagen verlopen: nieuwe gegevens worden geweigerd§' || nvt || '§WIJKT AF');
      r := array_append(r, '4d§61 dagen verlopen: wijzigen raakt nul rijen§' || nvt || '§WIJKT AF');
      r := array_append(r, '4e§61 dagen verlopen: lezen en verwijderen blijven werken§' || nvt || '§WIJKT AF');
      r := array_append(r, '4f§oude klant zonder betaald_tot: mag nog schrijven§' || nvt || '§WIJKT AF');
      r := array_append(r, '5a§onbeperkt klant met een oude betaald_tot: mag gewoon schrijven§' || nvt || '§WIJKT AF');
      r := array_append(r, '6a§nooit betaald: nog steeds geweigerd§' || nvt || '§WIJKT AF');
      r := array_append(r, '7a§bestaande klanten hebben een betaald_tot (zegt alleen iets op productie)§' || nvt || '§overgeslagen');
    else

      -- ══ 2. DE TRIGGER HOUDT betaald_tot VAST ═══════════════
      --  Dezelfde afweging als bij ooit_betaald zelf (zie
      --  server/17-free-serverdata.sql): dit hoort in een trigger en
      --  niet in zet_pakket(), want abonnementen wordt ook gewoon met
      --  de hand in de tabeleditor van Supabase bijgewerkt. Daarom
      --  gebruikt dit blok met opzet losse update-opdrachten en niet
      --  zet_pakket() — dat is de weg die vandaag het meest gebruikt
      --  wordt en die een reparatie in de functie zou missen.
      update public.abonnementen set pakket = 'coach', geldig_tot = date '2026-06-30'
        where club_id = c_hand;
      select betaald_tot into d from public.abonnementen where club_id = c_hand;
      if d = date '2026-06-30' then
        r := array_append(r, '2a§betaalde periode: betaald_tot gaat mee met geldig_tot§2026-06-30§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2a§betaalde periode: betaald_tot gaat mee met geldig_tot§'
          || coalesce(d::text, 'niets') || '§WIJKT AF'));
      end if;

      update public.abonnementen set pakket = 'free', geldig_tot = null where club_id = c_hand;
      select betaald_tot into d from public.abonnementen where club_id = c_hand;
      if d = date '2026-06-30' then
        r := array_append(r, '2b§terug naar free: betaald_tot blijft staan§2026-06-30§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2b§terug naar free: betaald_tot blijft staan§' || coalesce(d::text, 'weg')
          || '§WIJKT AF — dan raakt een klant zijn coulance kwijt zodra iemand op free klikt'));
      end if;

      -- Een eerdere einddatum kan er echt komen: een beheerder die zich
      -- vertypt, of een tweede, kortere betaling die na een lange
      -- binnenkomt. Dat mag de teller niet terugdraaien.
      update public.abonnementen set pakket = 'coach', geldig_tot = date '2025-01-01'
        where club_id = c_hand;
      select betaald_tot into d from public.abonnementen where club_id = c_hand;
      if d = date '2026-06-30' then
        r := array_append(r, '2c§een EERDERE einddatum zet betaald_tot niet terug§blijft 2026-06-30§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2c§een EERDERE einddatum zet betaald_tot niet terug§werd ' || coalesce(d::text, 'niets') || '§WIJKT AF'));
      end if;

      update public.abonnementen set pakket = 'club', geldig_tot = date '2027-08-01'
        where club_id = c_hand;
      select betaald_tot into d from public.abonnementen where club_id = c_hand;
      if d = date '2027-08-01' then
        r := array_append(r, '2d§een LATERE einddatum schuift betaald_tot wel vooruit§2027-08-01§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2d§een LATERE einddatum schuift betaald_tot wel vooruit§' || coalesce(d::text, 'niets')
          || '§WIJKT AF — dan loopt de coulance niet mee met een verlenging'));
      end if;

      -- En rechtstreeks: iemand die betaald_tot zelf terugzet in de
      -- tabeleditor. Dat is precies de weg waarlangs een klant per
      -- ongeluk zijn schrijfrecht kwijtraakt.
      update public.abonnementen set betaald_tot = date '2019-01-01' where club_id = c_hand;
      select betaald_tot into d from public.abonnementen where club_id = c_hand;
      if d = date '2027-08-01' then
        r := array_append(r, '2e§betaald_tot met de hand terugzetten lukt niet§blijft 2027-08-01§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2e§betaald_tot met de hand terugzetten lukt niet§werd ' || coalesce(d::text, 'niets')
          || '§WIJKT AF — betaald_tot hoort nooit achteruit te gaan'));
      end if;

      -- ── 2f. hetzelfde, maar dan op een vereniging die op FREE staat
      --  Dit scenario is er bij gekomen doordat een opzettelijke fout
      --  door de mazen glipte, en het is het waard om uit te leggen.
      --
      --  Er zijn twee plekken in de trigger die betaald_tot beschermen:
      --    1. bij coach/club wordt hij op de nieuwe einddatum gezet,
      --       maar nooit lager dan hij al was;
      --    2. bij ELKE wijziging blijft hij minstens staan waar hij
      --       stond.
      --  Scenario 2b tot en met 2e worden alle vier al door de eerste
      --  regel gered — het pakket is daar steeds coach of club. Haalde
      --  je de tweede regel weg, dan bleven ze alle vier gewoon groen.
      --
      --  Het gat zit bij een vereniging die op free staat: dan doet
      --  regel 1 niets, en is regel 2 het enige dat betaald_tot
      --  overeind houdt. En dat is nou net de vereniging waar het om
      --  gaat, want alleen bij free wordt de coulance-grens gebruikt.
      update public.abonnementen set pakket = 'free', geldig_tot = null where club_id = c_hand;
      update public.abonnementen set betaald_tot = date '2019-01-01' where club_id = c_hand;
      select betaald_tot into d from public.abonnementen where club_id = c_hand;
      if d = date '2027-08-01' then
        r := array_append(r, '2f§idem, maar op een vereniging die al op free staat§blijft 2027-08-01§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2f§idem, maar op een vereniging die al op free staat§werd ' || coalesce(d::text, 'niets')
          || '§WIJKT AF — juist bij free is dit het enige dat betaald_tot vasthoudt'));
      end if;

      -- ══ 3. DE REKENSOM ═════════════════════════════════════
      update public.abonnementen set pakket = 'coach', geldig_tot = current_date where club_id = c_30;
      select public.schrijfrecht_tot(c_30) into d;
      if d = current_date + 60 then
        r := array_append(r, ('3a§schrijfrecht_tot() = betaald_tot + 60 dagen§' || d || ' (vandaag + 60)§ZOALS VERWACHT'));
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('3a§schrijfrecht_tot() = betaald_tot + 60 dagen§' || coalesce(d::text, 'niets')
          || ', verwacht ' || (current_date + 60) || '§WIJKT AF'));
      end if;

      -- Een vereniging die klant was vóórdat betaald_tot bestond, heeft
      -- die kolom leeg. Die hoort niet buitengesloten te worden: niets
      -- weten is geen reden om een deur dicht te doen.
      update public.abonnementen set pakket = 'coach', geldig_tot = null where club_id = c_oud;
      update public.abonnementen set pakket = 'free' where club_id = c_oud;
      select public.schrijfrecht_tot(c_oud) into d;
      if d is null then
        r := array_append(r, '3b§geen betaald_tot bekend: schrijfrecht_tot() geeft niets§niets§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('3b§geen betaald_tot bekend: schrijfrecht_tot() geeft niets§' || d || '§WIJKT AF'));
      end if;

      -- ══ 4. DE GRENS IN DE PRAKTIJK ═════════════════════════
      --  Nu de echte tabel: public.gegevens. Drie verenigingen die
      --  allemaal op free staan volgens pakket_van_club() en allemaal
      --  ooit betaald hebben — alleen het aantal dagen verschilt.
      update public.abonnementen set pakket = 'coach', geldig_tot = current_date - 30 where club_id = c_30;
      update public.abonnementen set pakket = 'coach', geldig_tot = current_date - 60 where club_id = c_60;
      update public.abonnementen set pakket = 'coach', geldig_tot = current_date - 61 where club_id = c_61;
      update public.abonnementen set pakket = 'free' where club_id in (c_30, c_60, c_61);

      -- Controle op de opbouw zelf: staan ze alle drie echt op free?
      -- Zo niet, dan meet blok 4 iets anders dan het denkt te meten.
      gezien := public.pakket_van_club(c_30) || '/' || public.pakket_van_club(c_60)
                || '/' || public.pakket_van_club(c_61);
      if gezien <> 'free/free/free' then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4!§opbouw: alle drie staan op free§' || gezien || '§WIJKT AF — blok 4 meet dan iets anders'));
      end if;

      -- 4a — dertig dagen verlopen: ruim binnen de coulance.
      perform set_config('request.jwt.claim.sub', u_30::text, true);
      set local role authenticated;
      begin
        insert into public.gegevens (team_id, sleutel, waarde)
          values (t_30, 'tt_nieuw_v1', '[]'::jsonb);
        r := array_append(r, '4a§30 dagen verlopen: mag nog schrijven§GELUKT§ZOALS VERWACHT');
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4a§30 dagen verlopen: mag nog schrijven§MISLUKT: ' || sqlerrm
          || '§WIJKT AF — binnen de zestig dagen hoort er niets te veranderen'));
      end;

      -- 4b — precies zestig dagen: de laatste dag telt nog mee.
      --  Dit is de enige plek waar het verschil tussen "tot" en "tot en
      --  met" zichtbaar wordt. Wie hier per ongeluk "<" schrijft in
      --  plaats van "<=", pakt elke klant één dag af.
      perform set_config('request.jwt.claim.sub', u_60::text, true);
      begin
        insert into public.gegevens (team_id, sleutel, waarde)
          values (t_60, 'tt_nieuw_v1', '[]'::jsonb);
        r := array_append(r, '4b§precies 60 dagen verlopen: mag nog net§GELUKT§ZOALS VERWACHT');
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4b§precies 60 dagen verlopen: mag nog net§MISLUKT: ' || sqlerrm
          || '§WIJKT AF — de zestigste dag hoort er nog bij'));
      end;

      -- 4c — eenenzestig dagen: hier houdt het op.
      perform set_config('request.jwt.claim.sub', u_61::text, true);
      begin
        insert into public.gegevens (team_id, sleutel, waarde)
          values (t_61, 'tt_nieuw_v1', '[]'::jsonb);
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '4c§61 dagen verlopen: nieuwe gegevens worden geweigerd§GELUKT§<< dit hoort te mislukken — de coulance is voorbij');
      exception when insufficient_privilege then
        r := array_append(r, '4c§61 dagen verlopen: nieuwe gegevens worden geweigerd§GEWEIGERD door de beveiligingsregel§ZOALS VERWACHT');
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4c§61 dagen verlopen: nieuwe gegevens worden geweigerd§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- 4d — en wijzigen dus ook niet. Let op het verschil met 4c: een
      -- geweigerde update geeft GEEN foutmelding maar raakt nul rijen.
      begin
        update public.gegevens set waarde = '[{"naam":"Stiekem"}]'::jsonb
          where team_id = t_61 and sleutel = 'fch_spelers_v1';
        get diagnostics geraakt = row_count;
        if geraakt = 0 then
          r := array_append(r, '4d§61 dagen verlopen: wijzigen raakt nul rijen§GEWEIGERD (0 rijen geraakt)§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('4d§61 dagen verlopen: wijzigen raakt nul rijen§GELUKT (' || geraakt || ' rij)§<< dit hoort te mislukken'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4d§61 dagen verlopen: wijzigen raakt nul rijen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- 4e — lezen en verwijderen blijven. Dat is geen bijzaak: het is
      -- de belofte uit docs/avg-inventaris.md 8.8 dat een club die
      -- stopt zijn gegevens nooit kwijtraakt en er altijd bij kan.
      declare
        kon_lezen  int := -1;
        kon_wissen int := -1;
      begin
        select count(*) into kon_lezen from public.gegevens
          where team_id = t_61 and sleutel = 'tt_lezen_v1';
        delete from public.gegevens where team_id = t_61 and sleutel = 'tt_weg_v1';
        get diagnostics kon_wissen = row_count;
        if kon_lezen = 1 and kon_wissen = 1 then
          r := array_append(r, '4e§61 dagen verlopen: lezen en verwijderen blijven werken§lezen 1 rij, verwijderen 1 rij§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('4e§61 dagen verlopen: lezen en verwijderen blijven werken§lezen ' || kon_lezen
            || ', verwijderen ' || kon_wissen || '§WIJKT AF — dit hoort buiten de coulance-grens te blijven'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4e§61 dagen verlopen: lezen en verwijderen blijven werken§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      -- 4f — de klant van vóór deze kolom.
      perform set_config('request.jwt.claim.sub', u_oud::text, true);
      begin
        insert into public.gegevens (team_id, sleutel, waarde)
          values (t_oud, 'tt_nieuw_v1', '[]'::jsonb);
        r := array_append(r, '4f§oude klant zonder betaald_tot: mag nog schrijven§GELUKT§ZOALS VERWACHT');
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4f§oude klant zonder betaald_tot: mag nog schrijven§MISLUKT: ' || sqlerrm
          || '§WIJKT AF — een lege kolom is geen bewijs dat iemand niet betaald heeft'));
      end;
      reset role;

      -- ══ 5. DE VALKUIL IN DE FORMULE ════════════════════════
      --  Zie de uitleg bovenaan. Deze vereniging staat op 'club' zonder
      --  einddatum — onbeperkt, door Evan zelf gezet — maar zijn
      --  betaald_tot komt uit een periode van ver vóór vandaag. Wie de
      --  coulance-grens met een losse "and" naast de ooit-betaald-vraag
      --  hangt, sluit deze vereniging buiten terwijl hij gewoon klant is.
      update public.abonnementen set pakket = 'club', geldig_tot = current_date - 200
        where club_id = c_onbep;
      update public.abonnementen set pakket = 'club', geldig_tot = null
        where club_id = c_onbep;
      perform set_config('request.jwt.claim.sub', u_onbep::text, true);
      set local role authenticated;
      begin
        insert into public.gegevens (team_id, sleutel, waarde)
          values (t_onbep, 'tt_nieuw_v1', '[]'::jsonb);
        r := array_append(r, '5a§onbeperkt klant met een oude betaald_tot: mag gewoon schrijven§GELUKT§ZOALS VERWACHT');
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('5a§onbeperkt klant met een oude betaald_tot: mag gewoon schrijven§MISLUKT: ' || sqlerrm
          || '§WIJKT AF — de coulance-grens hoort alleen te gelden voor wie NU op free staat'));
      end;

      -- ══ 6. EN HET OUDE SLOT STAAT ER NOG ═══════════════════
      --  Zonder dit scenario zou een uitbreiding die de hele pakketvraag
      --  vervangt door alleen een datumvraag alles hierboven halen — en
      --  het lek uit docs/pakketten-besluit.md weer openzetten.
      perform set_config('request.jwt.claim.sub', u_nooit::text, true);
      begin
        insert into public.gegevens (team_id, sleutel, waarde)
          values (t_nooit, 'tt_nieuw_v1', '[]'::jsonb);
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '6a§nooit betaald: nog steeds geweigerd§GELUKT§<< LEK — free hoort helemaal niet op de server te komen');
      exception when insufficient_privilege then
        r := array_append(r, '6a§nooit betaald: nog steeds geweigerd§GEWEIGERD door de beveiligingsregel§ZOALS VERWACHT');
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('6a§nooit betaald: nog steeds geweigerd§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
      end;
      reset role;

      -- ══ 7. GEEN BESTAANDE KLANT VERGETEN ═══════════════════
      --  Eerlijk over wat dit wel en niet bewijst — dezelfde
      --  constructie en dezelfde beperking als scenario 10 in
      --  tests/free-server-afscherming.test.sql.
      --
      --  De migratie die betaald_tot invoert MOET de bestaande rijen
      --  meenemen: wie vandaag een einddatum in de tabel heeft staan en
      --  ooit klant was, heeft tot díé datum betaald, ook al is de
      --  kolom pas later bedacht. Vergeet Bas die ene update-regel, dan
      --  merkt niemand iets — tot het moment dat de coulance-grens gaat
      --  gelden en er klanten buiten komen te staan die niets verkeerd
      --  hebben gedaan.
      --
      --  Dat is met een opzettelijke fout geprobeerd en NIET gevangen:
      --  elk scenario hierboven maakt zijn eigen abonnementsrij aan, ná
      --  de migratie, dus die zijn per definitie in orde. Deze controle
      --  kijkt daarom naar de tabel zelf. In de wegwerpdatabase staat
      --  niets ouds en is hij dus altijd groen; draai je dit bestand in
      --  de SQL Editor van Supabase, dán zegt hij iets.
      select count(*) into geraakt from public.abonnementen
        where ooit_betaald and geldig_tot is not null and betaald_tot is null;
      if geraakt = 0 then
        r := array_append(r, '7a§bestaande klanten hebben een betaald_tot (zegt alleen iets op productie)§'
          || '0 rijen met een einddatum maar zonder betaald_tot§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('7a§bestaande klanten hebben een betaald_tot (zegt alleen iets op productie)§'
          || geraakt || ' klant(en) zonder betaald_tot§WIJKT AF — die vallen na zestig dagen buiten de boot'));
      end if;
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
    insert into tt_uitslag_coulance values (deel[1], deel[2], deel[3], deel[4]);
  end loop;

  if afwijkingen = 0 then
    insert into tt_uitslag_coulance values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_coulance values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af',
      'ZIE server/17-free-serverdata.sql en docs/avg-inventaris.md 8.8');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_coulance
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
