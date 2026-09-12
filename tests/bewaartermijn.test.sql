-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: verdwijnt een speler écht, en kan een
--                     vereniging worden opgeheven?
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná server/08-bewaartermijn.sql. Plak dit hele bestand
--  in de SQL Editor van Supabase en klik op Run. De uitslag komt als
--  TABEL terug, gewoon in het resultaatvenster. Je hoeft nergens
--  anders te kijken.
--
--  Je hoort twaalf regels te zien plus een slotregel, en in de kolom
--  "oordeel" hoort overal ZOALS VERWACHT te staan.
--
--  Een deel van deze scenario's MOET mislukken. Dat is de test: een
--  slot dat niets tegenhoudt is geen slot, en een wisknop die
--  vrolijk "gelukt" zegt terwijl hij niets raakte is erger dan geen
--  wisknop. Bij die scenario's staat de weigering van de server
--  erbij, zodat je meteen ziet welke tekst een gebruiker krijgt.
--
--  Waarom een tabel en geen meldingen: de Supabase-editor toont
--  `raise notice` niet. Een test waarvan je de uitslag niet kunt
--  lezen, is geen test — dan zie je "Success, no rows returned" en
--  weet je nog niets.
--
--  De test bouwt zijn eigen verenigingen, teams, spelers en een paar
--  nepaccounts na — vier seizoenslagen met dezelfde twee spelers,
--  precies zoals het in de echte back-up staat — en draait alles aan
--  het eind terug. Er blijft niets van achter. Je kunt dit zo vaak
--  draaien als je wilt, ook op productie.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag;
create temp table tt_uitslag(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  baas     uuid := '7ea11000-0000-4000-a000-000000000011';
  hulp     uuid := '7ea11000-0000-4000-a000-000000000012';
  vreemde  uuid := '7ea11000-0000-4000-a000-000000000013';
  club_a   uuid;                         -- vereniging met een team en spelers
  club_b   uuid;                         -- lege vereniging
  club_c   uuid;                         -- vereniging mét gegevens
  res      jsonb;
  geraakt  int;
  aantal   int;
  afwijkingen int := 0;
  r text[] := '{}';                      -- verzamelde uitslagen
  regel text;
  deel  text[];
begin
  -- Alles hieronder gebeurt in een deeltransactie die we aan het
  -- eind expres laten klappen. Daardoor verdwijnt elke testrij weer,
  -- terwijl de uitslagen in `r` bewaard blijven — variabelen rollen
  -- namelijk niet terug.
  begin
    insert into auth.users (id, email) values
      (baas,    'test-bewaartermijn-baas@teamtakkie.test'),
      (hulp,    'test-bewaartermijn-hulp@teamtakkie.test'),
      (vreemde, 'test-bewaartermijn-vreemde@teamtakkie.test');

    perform set_config('request.jwt.claim.sub', baas::text, true);
    set local role authenticated;

    club_a := public.nieuwe_club('Testclub bewaartermijn', 'Test-eigenaar');
    insert into public.teams (id, club_id, naam)
      values ('tt-bw-team', club_a, 'Testteam');

    -- Een tweede trainer erbij: die mag straks wél spelers wissen,
    -- maar niet de hele vereniging opheffen.
    insert into public.leden (club_id, gebruiker_id, naam, rol)
      values (club_a, hulp, 'Test-trainer', 'trainer');

    -- ── De spelerslijst, vier seizoenslagen diep ──────────────
    -- Dit is de echte situatie uit de back-up van 10 september:
    -- dezelfde personen staan onder een blote sleutel én onder een
    -- sleutel per seizoen. De app wist er één van.
    insert into public.gegevens (team_id, sleutel, waarde)
    select 'tt-bw-team', s, $j$[
      {"id":101,"naam":"Jesse Jansen","geboortedatum":"2011-04-02",
       "telefoon":"0612345678","beschikbaarNotitie":"Enkelblessure, 6 weken"},
      {"id":102,"naam":"Milan de Vries","geboortedatum":"2011-09-30",
       "telefoon":"0687654321","beschikbaarNotitie":""}
    ]$j$::jsonb
    from unnest(array['fch_spelers_v1',
                      '2024-2025::fch_spelers_v1',
                      '2025-2026::fch_spelers_v1',
                      '2026-2027::fch_spelers_v1']) s;

    -- ── De wedstrijdanalyse, met de naam als losse kopie ──────
    -- De derde gebeurtenis heeft wél een naam maar geen id; die komt
    -- voor bij handmatige invoer en is de makkelijkste om te missen.
    insert into public.gegevens (team_id, sleutel, waarde)
    select 'tt-bw-team', s, $j$[
      {"id":1,"wedstrijdId":9,"minuut":63,"type":"goal","team":"fch",
       "spelerId":101,"spelerNaam":"Jesse Jansen"},
      {"id":2,"wedstrijdId":9,"minuut":70,"type":"assist","team":"fch",
       "spelerId":102,"spelerNaam":"Milan de Vries"},
      {"id":3,"wedstrijdId":9,"minuut":80,"type":"geel","team":"fch",
       "spelerId":null,"spelerNaam":"Jesse Jansen"}
    ]$j$::jsonb
    from unnest(array['fch_events_v1', '2025-2026::fch_events_v1']) s;

    -- En de wedstrijd zelf, die de naam nóg een keer bewaart. Deze
    -- ruimt wis_speler met opzet niet op; hij hoort hem wél te melden.
    insert into public.gegevens (team_id, sleutel, waarde) values
      ('tt-bw-team', '2025-2026::fch_wedstrijden_v1', $j$[
        {"id":9,"tegenstander":"SC Test","score":{"fch":1,"teg":0},
         "scorers":[{"spelerId":101,"naam":"Jesse Jansen","minuut":"63"}]}
      ]$j$::jsonb);

    -- ══ Deel 1 — een speler wissen ════════════════════════════

    -- ── 1. Iemand zonder schrijfrecht wist een speler — MISLUKT ─
    -- Eerst dit, want daarna is de speler weg en meet je niets meer.
    perform set_config('request.jwt.claim.sub', vreemde::text, true);
    begin
      perform public.wis_speler('tt-bw-team', '101');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '1§buitenstaander wist een speler§GELUKT§<< LEK — dit hoort te mislukken');
    exception when raise_exception then
      r := array_append(r, ('1§buitenstaander wist een speler§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('1§buitenstaander wist een speler§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;
    perform set_config('request.jwt.claim.sub', baas::text, true);

    -- ── 2. Een speler die niet bestaat — moet MISLUKKEN ───────
    -- Een wisopdracht die nul rijen raakt en tóch "gelukt" zegt, is
    -- precies hoe dit probleem maanden onzichtbaar bleef.
    begin
      perform public.wis_speler('tt-bw-team', '999');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '2§onbekende speler wissen§GELUKT§<< LEK — dit hoort te mislukken');
    exception when raise_exception then
      r := array_append(r, ('2§onbekende speler wissen§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('2§onbekende speler wissen§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 3. De speler echt wissen ──────────────────────────────
    begin
      res := public.wis_speler('tt-bw-team', '101');
      if (res->>'lagen_opgeschoond')::int = 4 then
        r := array_append(r, '3§wis_speler raakt alle vier de seizoenslagen§4 lagen§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('3§wis_speler raakt alle vier de seizoenslagen§' ||
              (res->>'lagen_opgeschoond') || ' lagen§WIJKT AF — dit horen er 4 te zijn'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('3§wis_speler raakt alle vier de seizoenslagen§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 4. Staat hij echt in geen enkele laag meer? ───────────
    select count(*) into aantal
    from public.gegevens g, lateral jsonb_array_elements(g.waarde) e
    where g.team_id = 'tt-bw-team'
      and public.basis_van_sleutel(g.sleutel) = 'fch_spelers_v1'
      and e->>'id' = '101';
    if aantal = 0 then
      r := array_append(r, '4§speler staat in geen enkele spelerslijst meer§0 keer gevonden§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4§speler staat in geen enkele spelerslijst meer§nog ' || aantal || ' keer gevonden§WIJKT AF'));
    end if;

    -- ── 5. En zijn gegevens (geboortedatum, telefoon, blessure)? ─
    -- Niet op de id zoeken maar op de letters van de naam en het
    -- telefoonnummer: een speler kan ook half blijven staan.
    select count(*) into aantal
    from public.gegevens g
    where g.team_id = 'tt-bw-team'
      and public.basis_van_sleutel(g.sleutel) = 'fch_spelers_v1'
      and (position('Jesse' in g.waarde::text) > 0
        or position('0612345678' in g.waarde::text) > 0
        or position('Enkelblessure' in g.waarde::text) > 0);
    if aantal = 0 then
      r := array_append(r, '5§naam, telefoon en blessurenotitie zijn weg§nergens meer te vinden§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5§naam, telefoon en blessurenotitie zijn weg§staan nog in ' || aantal || ' spelerslijst(en)§WIJKT AF'));
    end if;

    -- ── 6. De andere speler is niet aangeraakt ────────────────
    select count(*) into aantal
    from public.gegevens g, lateral jsonb_array_elements(g.waarde) e
    where g.team_id = 'tt-bw-team'
      and public.basis_van_sleutel(g.sleutel) = 'fch_spelers_v1'
      and e->>'id' = '102' and e->>'naam' = 'Milan de Vries'
      and e->>'telefoon' = '0687654321';
    if aantal = 4 then
      r := array_append(r, '6§de andere speler blijft ongemoeid§in alle 4 de lagen compleet§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('6§de andere speler blijft ongemoeid§nog in ' || aantal || ' van de 4 lagen§WIJKT AF — dit horen er 4 te zijn'));
    end if;

    -- ── 7. De naamkopie in de wedstrijdanalyse is weg ─────────
    select count(*) into aantal
    from public.gegevens g
    where g.team_id = 'tt-bw-team'
      and public.basis_van_sleutel(g.sleutel) = 'fch_events_v1'
      and position('Jesse' in g.waarde::text) > 0;
    if aantal = 0 then
      r := array_append(r, '7§naamkopie in de wedstrijdanalyse is weg§in geen van beide lagen§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('7§naamkopie in de wedstrijdanalyse is weg§staat nog in ' || aantal || ' laag/lagen§WIJKT AF'));
    end if;

    -- ── 8. Maar het doelpunt zelf staat er nog ────────────────
    -- Dit is de afweging uit 08-bewaartermijn.sql, hier gemeten: de
    -- gebeurtenis blijft, de persoon verdwijnt. Zou dit doelpunt
    -- verdwijnen, dan klopt de uitslag 1-0 niet meer.
    select count(*) into aantal
    from public.gegevens g, lateral jsonb_array_elements(g.waarde) e
    where g.team_id = 'tt-bw-team'
      and public.basis_van_sleutel(g.sleutel) = 'fch_events_v1'
      and e->>'type' = 'goal' and e->>'minuut' = '63'
      and not (e ? 'spelerNaam') and not (e ? 'spelerId');
    if aantal = 2 then
      r := array_append(r, '8§het doelpunt in de 63e minuut blijft staan§in beide lagen, zonder naam§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('8§het doelpunt in de 63e minuut blijft staan§' || aantal || ' van de 2 gevonden§WIJKT AF'));
    end if;

    -- ── 9. Meldt de functie eerlijk wat er nog staat? ─────────
    -- De naam staat ook in fch_wedstrijden_v1, en dat blok kan
    -- wis_speler niet betrouwbaar opschonen. Hij hoort dat dan ook
    -- niet te verzwijgen.
    if res->'naam_nog_zichtbaar_in' ? '2025-2026::fch_wedstrijden_v1'
       and jsonb_array_length(res->'naam_nog_zichtbaar_in') = 1 then
      r := array_append(r, '9§functie meldt waar de naam nog staat§fch_wedstrijden_v1§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('9§functie meldt waar de naam nog staat§' ||
            coalesce(res->>'naam_nog_zichtbaar_in', 'niets') || '§WIJKT AF'));
    end if;

    -- ══ Deel 2 — een vereniging opheffen ══════════════════════

    club_b := public.nieuwe_club('Testclub leeg', 'Test-eigenaar');
    club_c := public.nieuwe_club('Testclub met gegevens', 'Test-eigenaar');
    insert into public.teams (id, club_id, naam) values ('tt-bw-team-c', club_c, 'Team C');
    insert into public.gegevens (team_id, sleutel, waarde) values
      ('tt-bw-team-c', '2026-2027::fch_spelers_v1', '[{"id":301,"naam":"Speler C"}]'::jsonb);

    -- ── 10. Een trainer heft de vereniging op — MISLUKT ───────
    -- Let op hoe dit mislukt: niet met een foutmelding, maar met nul
    -- verwijderde rijen. Precies daarom kon dit zolang onopgemerkt
    -- blijven — PostgREST maakt daar een keurige "gelukt" van.
    perform set_config('request.jwt.claim.sub', hulp::text, true);
    delete from public.clubs where id = club_a;
    get diagnostics geraakt = row_count;
    perform set_config('request.jwt.claim.sub', baas::text, true);
    if geraakt = 0 then
      r := array_append(r, '10§trainer (geen eigenaar) heft de vereniging op§0 rijen verwijderd§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('10§trainer (geen eigenaar) heft de vereniging op§' || geraakt || ' rijen verwijderd§<< LEK — dit hoort te mislukken'));
    end if;

    -- ── 11. De eigenaar heft een lege vereniging op — LUKT ────
    delete from public.clubs where id = club_b;
    get diagnostics geraakt = row_count;
    if geraakt = 1 then
      r := array_append(r, '11§eigenaar heft een lege vereniging op§1 rij verwijderd§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('11§eigenaar heft een lege vereniging op§' || geraakt || ' rijen verwijderd§WIJKT AF — dit hoort er 1 te zijn'));
    end if;

    -- ── 12. Een vereniging mét teams neemt alles mee ──────────
    -- Dit is de onomkeerbare kant. Teams hangen met "on delete
    -- cascade" aan clubs en gegevens hangen zo aan teams, dus er
    -- hoort na afloop nergens meer iets van dit team te staan.
    delete from public.clubs where id = club_c;
    get diagnostics geraakt = row_count;
    reset role;
    select (select count(*) from public.teams    where club_id = club_c)
         + (select count(*) from public.gegevens where team_id = 'tt-bw-team-c')
         + (select count(*) from public.leden    where club_id = club_c)
         + (select count(*) from public.abonnementen where club_id = club_c)
      into aantal;
    set local role authenticated;
    if geraakt = 1 and aantal = 0 then
      r := array_append(r, '12§vereniging met teams opheffen§club, teams, gegevens, leden en abonnement weg§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('12§vereniging met teams opheffen§' || geraakt || ' club weg, maar nog ' || aantal || ' rij(en) blijven staan§WIJKT AF'));
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
    insert into tt_uitslag values ('', '── SLOTSOM ──', 'alle twaalf scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/08-bewaartermijn.sql');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag;
