-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: wie mag leden toevoegen en weghalen?
--  ─────────────────────────────────────────────────────────────
--  Plak dit hele bestand in de SQL Editor van Supabase en klik op
--  Run. De uitslag komt als TABEL terug, gewoon in het resultaat-
--  venster. Je hoeft nergens anders te kijken.
--
--  Je hoort zes regels te zien plus een slotregel, en in de kolom
--  "oordeel" hoort overal ZOALS VERWACHT te staan.
--
--  Waarom een tabel en geen meldingen: de Supabase-editor toont
--  `raise notice` niet. Een test waarvan je de uitslag niet kunt
--  lezen, is geen test -- dan zie je "Success, no rows returned"
--  en weet je nog niets.
--
--  De test maakt zijn eigen club en drie nepaccounts en draait die
--  aan het eind allemaal terug. Er blijft niets van achter. Je kunt
--  dit zo vaak draaien als je wilt, ook op productie.
--
--  Uitleg per scenario staat in tests/leden-policy.test.md.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag;
create temp table tt_uitslag(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  eigenaar uuid := '0e1d0000-0000-4000-a000-000000000001';
  trainer  uuid := '0e1d0000-0000-4000-a000-000000000002';
  kijker   uuid := '0e1d0000-0000-4000-a000-000000000003';
  club     uuid;
  geraakt  int;
  afwijkingen int := 0;
  r text[] := '{}';                      -- verzamelde uitslagen
  regel text;
  deel  text[];
begin
  -- Alles hieronder gebeurt in een deeltransactie die we aan het
  -- eind expres laten klappen. Daardoor verdwijnt elke testrij weer,
  -- terwijl de uitslagen in `r` bewaard blijven -- variabelen rollen
  -- namelijk niet terug.
  begin
    insert into auth.users (id, email) values
      (eigenaar, 'test-eigenaar@teamtakkie.test'),
      (trainer,  'test-trainer@teamtakkie.test'),
      (kijker,   'test-kijker@teamtakkie.test');

    -- ── 1. Club oprichten via nieuwe_club() — moet lukken ─────
    perform set_config('request.jwt.claim.sub', eigenaar::text, true);
    set local role authenticated;
    begin
      club := public.nieuwe_club('Testclub', 'Test-eigenaar');
      r := array_append(r, '1§eigenaar richt een club op§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('1§eigenaar richt een club op§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 2. Eigenaar nodigt een trainer uit — moet lukken ──────
    begin
      insert into public.leden (club_id, gebruiker_id, naam, rol)
        values (club, trainer, 'Test-trainer', 'trainer');
      r := array_append(r, '2§eigenaar nodigt trainer uit§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('2§eigenaar nodigt trainer uit§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 3. Eigenaar nodigt een kijker uit — moet lukken ───────
    begin
      insert into public.leden (club_id, gebruiker_id, naam, rol)
        values (club, kijker, 'Test-kijker', 'kijker');
      r := array_append(r, '3§eigenaar nodigt kijker uit§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('3§eigenaar nodigt kijker uit§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 4. Kijker promoveert zichzelf — moet MISLUKKEN ────────
    -- Eerst stapt hij uit de club. Dat mag, en dat hoort te mogen.
    -- Zonder die stap zou de database hem afwijzen op een dubbel
    -- lid, en dan slaagt de test om de verkeerde reden.
    perform set_config('request.jwt.claim.sub', kijker::text, true);
    delete from public.leden where club_id = club and gebruiker_id = kijker;
    begin
      insert into public.leden (club_id, gebruiker_id, naam, rol)
        values (club, kijker, 'Test-kijker', 'eigenaar');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '4§kijker maakt zichzelf eigenaar§GELUKT§<< LEK -- dit hoort te mislukken');
    exception when insufficient_privilege then
      r := array_append(r, '4§kijker maakt zichzelf eigenaar§GEWEIGERD door de policy§ZOALS VERWACHT');
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4§kijker maakt zichzelf eigenaar§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- Zet hem terug als kijker, zodat scenario 5 een echt clublid is.
    perform set_config('request.jwt.claim.sub', eigenaar::text, true);
    delete from public.leden where club_id = club and gebruiker_id = kijker;
    insert into public.leden (club_id, gebruiker_id, naam, rol)
      values (club, kijker, 'Test-kijker', 'kijker');

    -- ── 5. Kijker gooit de eigenaar eruit — moet 0 rijen raken ─
    perform set_config('request.jwt.claim.sub', kijker::text, true);
    delete from public.leden where club_id = club and gebruiker_id = eigenaar;
    get diagnostics geraakt = row_count;
    if geraakt = 0 then
      r := array_append(r, '5§kijker zet de eigenaar eruit§0 rijen geraakt§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5§kijker zet de eigenaar eruit§' || geraakt || ' rijen geraakt§<< LEK -- dit hoort 0 te zijn'));
    end if;

    -- ── 6. Trainer verlaat zelf de club — moet lukken ─────────
    perform set_config('request.jwt.claim.sub', trainer::text, true);
    delete from public.leden where club_id = club and gebruiker_id = trainer;
    get diagnostics geraakt = row_count;
    if geraakt = 1 then
      r := array_append(r, '6§trainer verlaat zelf de club§1 rij verwijderd§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('6§trainer verlaat zelf de club§' || geraakt || ' rijen§WIJKT AF -- dit hoort 1 te zijn'));
    end if;

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
    insert into tt_uitslag values ('', '── SLOTSOM ──', 'alle zes scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE tests/leden-policy.test.md');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag;
