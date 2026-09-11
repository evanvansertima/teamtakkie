-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: houdt de server het aantal teams tegen?
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná server/06-pakketten.sql. Plak dit hele bestand in
--  de SQL Editor van Supabase en klik op Run. De uitslag komt als
--  TABEL terug, gewoon in het resultaatvenster. Je hoeft nergens
--  anders te kijken.
--
--  Je hoort acht regels te zien plus een slotregel, en in de kolom
--  "oordeel" hoort overal ZOALS VERWACHT te staan.
--
--  De helft van deze scenario's MOET mislukken. Dat is de test:
--  een slot dat niets tegenhoudt is geen slot. Bij die scenario's
--  staat de weigering van de server erbij, zodat je meteen ziet
--  welke tekst een gebruiker te lezen krijgt.
--
--  Waarom een tabel en geen meldingen: de Supabase-editor toont
--  `raise notice` niet. Een test waarvan je de uitslag niet kunt
--  lezen, is geen test — dan zie je "Success, no rows returned"
--  en weet je nog niets.
--
--  De test maakt zijn eigen verenigingen, teams en een nepaccount,
--  en draait die aan het eind allemaal terug. Er blijft niets van
--  achter. Je kunt dit zo vaak draaien als je wilt, ook op
--  productie.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag;
create temp table tt_uitslag(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  baas    uuid := '7ea11000-0000-4000-a000-000000000001';
  club    uuid;
  geraakt int;
  afwijkingen int := 0;
  r text[] := '{}';                      -- verzamelde uitslagen
  regel text;
  deel  text[];
  tid   text;                            -- een bestaand team, voor 9 t/m 13
begin
  -- Alles hieronder gebeurt in een deeltransactie die we aan het
  -- eind expres laten klappen. Daardoor verdwijnt elke testrij weer,
  -- terwijl de uitslagen in `r` bewaard blijven — variabelen rollen
  -- namelijk niet terug.
  begin
    insert into auth.users (id, email) values
      (baas, 'test-teamlimiet@teamtakkie.test');

    perform set_config('request.jwt.claim.sub', baas::text, true);
    set local role authenticated;

    club := public.nieuwe_club('Testclub teamlimiet', 'Test-eigenaar');
    -- Een nieuwe vereniging staat op free: één team.

    -- ── 1. Free, eerste team — moet lukken ────────────────────
    begin
      insert into public.teams (id, club_id, naam)
        values ('tt-test-1', club, 'Testteam 1');
      r := array_append(r, '1§free: eerste team aanmaken§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('1§free: eerste team aanmaken§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 2. Free, tweede team — moet MISLUKKEN ─────────────────
    begin
      insert into public.teams (id, club_id, naam)
        values ('tt-test-2', club, 'Testteam 2');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '2§free: tweede team aanmaken§GELUKT§<< LEK — dit hoort te mislukken');
    exception when raise_exception then
      r := array_append(r, ('2§free: tweede team aanmaken§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('2§free: tweede team aanmaken§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- Over naar coach. Dat kan alleen buiten de rol authenticated om:
    -- op abonnementen staat met opzet geen enkele schrijfregel.
    --
    -- Coach heeft echt maar één team. Om de rekenkant van de trigger te
    -- toetsen -- telt hij goed, en telt hij de rij die hij nu behandelt
    -- niet mee -- zetten we de grens hier tijdelijk op drie. Dat rolt
    -- met de rest van de test weer terug. Zonder deze stap zou de
    -- trigger alleen ooit bij één getal getest worden, en dan weet je
    -- niet of hij telt of gewoon alles boven de eerste weigert.
    reset role;
    update public.abonnementen set pakket = 'coach', geldig_tot = null where club_id = club;
    update public.pakket_grenzen set teams = 3 where pakket = 'coach';
    set local role authenticated;

    -- ── 3. Grens van drie: drie erin, een vierde erbij ────────
    begin
      insert into public.teams (id, club_id, naam) values
        ('tt-test-2', club, 'Testteam 2'),
        ('tt-test-3', club, 'Testteam 3');
      r := array_append(r, '3a§grens 3: drie teams aanmaken§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('3a§grens 3: drie teams aanmaken§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    begin
      insert into public.teams (id, club_id, naam)
        values ('tt-test-4', club, 'Testteam 4');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '3b§grens 3: vierde team aanmaken§GELUKT§<< LEK — dit hoort te mislukken');
    exception when raise_exception then
      r := array_append(r, ('3b§grens 3: vierde team aanmaken§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('3b§grens 3: vierde team aanmaken§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 4. Dezelfde drie teams nóg eens duwen ─────────────────
    -- Dit is wat de app bij élke synchronisatie doet: de hele
    -- teamlijst opnieuw omhoog, met "resolution=merge-duplicates".
    -- In de database wordt dat precies de opdracht hieronder. Een
    -- domme telling zou hier weigeren, want het zijn drie inserts
    -- terwijl er al drie teams staan.
    begin
      insert into public.teams (id, club_id, naam) values
        ('tt-test-1', club, 'Testteam 1'),
        ('tt-test-2', club, 'Testteam 2'),
        ('tt-test-3', club, 'Testteam 3')
      on conflict (id) do update set naam = excluded.naam;
      r := array_append(r, '4§de app synchroniseert opnieuw (drie bestaande teams)§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4§de app synchroniseert opnieuw (drie bestaande teams)§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 5. Team weggooien terwijl je aan de limiet zit ────────
    -- Er staan nu drie teams bij een pakket dat er drie toestaat.
    -- Weggooien moet dan gewoon kunnen. Een team verdwijnt niet
    -- echt; het krijgt een datum in verwijderd_op.
    begin
      update public.teams set verwijderd_op = now() where id = 'tt-test-3';
      get diagnostics geraakt = row_count;
      if geraakt = 1 then
        r := array_append(r, '5§team weggooien terwijl je aan de limiet zit§GELUKT§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('5§team weggooien terwijl je aan de limiet zit§' || geraakt || ' rijen geraakt§WIJKT AF — dit hoort 1 te zijn'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5§team weggooien terwijl je aan de limiet zit§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- De vrijgekomen plek meteen weer vullen, anders zit de
    -- vereniging in scenario 6 niet aan zijn limiet en slaagt die
    -- test om de verkeerde reden.
    insert into public.teams (id, club_id, naam)
      values ('tt-test-4', club, 'Testteam 4');

    -- ── 6. Datzelfde team terughalen — moet MISLUKKEN ─────────
    -- Zonder controle bij het wijzigen zou dit het gat in de muur
    -- zijn: niet een nieuw team aanmaken, maar een oud team uit de
    -- prullenbak terughalen door de datum weg te halen.
    begin
      update public.teams set verwijderd_op = null where id = 'tt-test-3';
      get diagnostics geraakt = row_count;
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('6§weggegooid team terughalen aan de limiet§GELUKT (' || geraakt || ' rijen)§<< LEK — dit hoort te mislukken'));
    exception when raise_exception then
      r := array_append(r, ('6§weggegooid team terughalen aan de limiet§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('6§weggegooid team terughalen aan de limiet§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 6b. Club is onbeperkt ─────────────────────────────────
    -- Het hele verschil tussen Coach en Club is het aantal teams. Als
    -- Club ergens toch een grens blijkt te hebben, is dat precies het
    -- soort fout dat je pas ontdekt bij een vereniging met dertig teams.
    reset role;
    update public.abonnementen set pakket = 'club', geldig_tot = null where club_id = club;
    set local role authenticated;
    begin
      insert into public.teams (id, club_id, naam)
      select 'tt-ruim-' || g, club, 'Ruim team ' || g from generate_series(1, 30) g;
      r := array_append(r, '6b§club: dertig teams erbij§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('6b§club: dertig teams erbij§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 7. Bezoeker zonder account maakt een vereniging ───────
    -- Dit lukte tot nu toe wél. De publieke sleutel staat gewoon in
    -- de app, dus iedereen kon de database volschrijven.
    set local role anon;
    begin
      insert into public.clubs (naam) values ('Testclub van een vreemde');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '7§niet-ingelogde bezoeker maakt een vereniging§GELUKT§<< LEK — dit hoort te mislukken');
    exception when insufficient_privilege then
      r := array_append(r, '7§niet-ingelogde bezoeker maakt een vereniging§GEWEIGERD door de beveiliging§ZOALS VERWACHT');
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('7§niet-ingelogde bezoeker maakt een vereniging§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;
    set local role authenticated;

    -- ── 8. Een vierde vereniging oprichten — moet MISLUKKEN ───
    -- Wie wél een account heeft kan nieuwe_club() nog steeds
    -- aanroepen. Drie is genoeg: iemand kan echt twee verenigingen
    -- besturen, maar geen dertig.
    perform public.nieuwe_club('Testclub twee', 'Test-eigenaar');
    perform public.nieuwe_club('Testclub drie', 'Test-eigenaar');
    begin
      perform public.nieuwe_club('Testclub vier', 'Test-eigenaar');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '8§vierde vereniging oprichten§GELUKT§<< LEK — dit hoort te mislukken');
    exception when raise_exception then
      r := array_append(r, ('8§vierde vereniging oprichten§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('8§vierde vereniging oprichten§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ De twee remmen tegen misbruik ══════════════════════════
    select id into tid from public.teams
      where club_id = club and verwijderd_op is null limit 1;

    -- ── 9. Een selectie van 50 spelers — moet LUKKEN ──────────
    begin
      insert into public.gegevens (team_id, sleutel, waarde) values
        (tid, '2026-2027::fch_spelers_v1',
         (select jsonb_agg(jsonb_build_object('id', g, 'naam', 'Speler ' || g))
          from generate_series(1, 50) g));
      r := array_append(r, '9§selectie van 50 spelers§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('9§selectie van 50 spelers§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 10. Een selectie van 51 spelers — moet MISLUKKEN ──────
    begin
      insert into public.gegevens (team_id, sleutel, waarde) values
        (tid, '2026-2027::fch_spelers_v1',
         (select jsonb_agg(jsonb_build_object('id', g)) from generate_series(1, 51) g))
        on conflict (team_id, sleutel) do update set waarde = excluded.waarde;
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '10§selectie van 51 spelers§GELUKT§<< LEK — dit hoort te mislukken');
    exception when others then
      r := array_append(r, '10§selectie van 51 spelers§GEWEIGERD§ZOALS VERWACHT');
    end;

    -- ── 11. Het voorvoegsel mag niet uitmaken ─────────────────
    begin
      insert into public.gegevens (team_id, sleutel, waarde) values
        (tid, 'fch_spelers_v1',
         (select jsonb_agg(jsonb_build_object('id', g)) from generate_series(1, 51) g));
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '11§51 spelers onder een blote sleutel§GELUKT§<< LEK — het voorvoegsel mag niet uitmaken');
    exception when others then
      r := array_append(r, '11§51 spelers onder een blote sleutel§GEWEIGERD§ZOALS VERWACHT');
    end;

    -- ── 12. Een rij van 12 MB — moet MISLUKKEN ────────────────
    begin
      insert into public.gegevens (team_id, sleutel, waarde) values
        (tid, '2026-2027::fch_rommel_v1',
         jsonb_build_object('plaatje', repeat('x', 12 * 1024 * 1024)));
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '12§een rij van 12 MB§GELUKT§<< LEK — dit hoort te mislukken');
    exception when others then
      r := array_append(r, '12§een rij van 12 MB§GEWEIGERD§ZOALS VERWACHT');
    end;

    -- ── 13. Een echte rij van 4 MB — moet LUKKEN ──────────────
    -- Je grootste bestaande rij, fch_tenue_v1, is 3,86 MB. Die mag
    -- hier niet op stuklopen; anders breekt de rem je eigen app.
    begin
      insert into public.gegevens (team_id, sleutel, waarde) values
        (tid, '2026-2027::fch_tenue_v1',
         jsonb_build_object('plaatje', repeat('x', 4 * 1024 * 1024)));
      r := array_append(r, '13§een echte rij van 4 MB§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('13§een echte rij van 4 MB§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    reset role;

    -- Hier laten we de deeltransactie expres klappen. Alles wat
    -- hierboven is aangemaakt verdwijnt; `r` blijft staan.
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
    insert into tt_uitslag values (deel[1], deel[2], deel[3], deel[4]);
  end loop;

  if afwijkingen = 0 then
    insert into tt_uitslag values ('', '── SLOTSOM ──', 'alle veertien scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/06-pakketten.sql');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag;
