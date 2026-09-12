-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: wie mag leden toevoegen en weghalen?
--  ─────────────────────────────────────────────────────────────
--  Plak dit hele bestand in de SQL Editor van Supabase en klik op
--  Run. De uitslag komt als TABEL terug, gewoon in het resultaat-
--  venster. Je hoeft nergens anders te kijken.
--
--  Je hoort twaalf regels te zien plus een slotregel, en in de
--  kolom "oordeel" hoort overal ZOALS VERWACHT te staan.
--
--  Vijf van die twaalf zijn pogingen die MOETEN mislukken (4, 5, 7,
--  10 en 11). Staat daar "LEK", dan mag iemand iets wat hij niet
--  mag; dat is het enige wat je hoeft te zien.
--
--  Waarom een tabel en geen meldingen: de Supabase-editor toont
--  `raise notice` niet. Een test waarvan je de uitslag niet kunt
--  lezen, is geen test -- dan zie je "Success, no rows returned"
--  en weet je nog niets.
--
--  De test maakt zijn eigen club en vier nepaccounts en draait die
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
  eigenaar2 uuid := '0e1d0000-0000-4000-a000-000000000004';
  club     uuid;
  geraakt  int;
  melding  text;
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
      (kijker,   'test-kijker@teamtakkie.test'),
      (eigenaar2, 'test-eigenaar2@teamtakkie.test');

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

    -- ── 7. De laatste eigenaar haalt zichzelf weg — 0 rijen ───
    -- Hier draait het om. Lukt dit wél, dan blijft er een
    -- vereniging zonder eigenaar achter. Niemand kan die daarna nog
    -- opheffen, want de regel clubs_weghalen eist een eigenaar. De
    -- teams, de spelers en de gegevens zitten er dan voorgoed in
    -- vast, en de club telt mee voor de grens van drie verenigingen
    -- per persoon.
    perform set_config('request.jwt.claim.sub', eigenaar::text, true);
    delete from public.leden where club_id = club and gebruiker_id = eigenaar;
    get diagnostics geraakt = row_count;
    if geraakt = 0 then
      r := array_append(r, '7§laatste eigenaar verwijdert zichzelf§0 rijen geraakt§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('7§laatste eigenaar verwijdert zichzelf§' || geraakt || ' rijen geraakt§<< LEK -- de club blijft zonder eigenaar achter'));
      -- Zet hem terug. Zonder dat vallen 8 tot en met 12 óók om, als
      -- gevolg van dit ene lek, en dan wijst de uitslag je niet meer
      -- aan waar het echt misgaat.
      reset role;
      insert into public.leden (club_id, gebruiker_id, naam, rol)
        values (club, eigenaar, 'Test-eigenaar', 'eigenaar');
      set local role authenticated;
    end if;

    -- ── 8. Eigenaar maakt een tweede eigenaar — moet lukken ───
    -- Dit is de uitweg die scenario 7 openlaat: eerst iemand anders
    -- eigenaar maken, dan pas zelf vertrekken.
    begin
      insert into public.leden (club_id, gebruiker_id, naam, rol)
        values (club, eigenaar2, 'Test-eigenaar-2', 'eigenaar');
      r := array_append(r, '8§eigenaar maakt een tweede eigenaar§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('8§eigenaar maakt een tweede eigenaar§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 9. Eigenaar vertrekt náást een tweede eigenaar — lukt ──
    -- De rem mag niet doorslaan: zodra er een tweede eigenaar is,
    -- moet de eerste er gewoon uit kunnen.
    delete from public.leden where club_id = club and gebruiker_id = eigenaar;
    get diagnostics geraakt = row_count;
    if geraakt = 1 then
      r := array_append(r, '9§eigenaar vertrekt naast een tweede eigenaar§1 rij verwijderd§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('9§eigenaar vertrekt naast een tweede eigenaar§' || geraakt || ' rijen§WIJKT AF -- dit hoort 1 te zijn'));
    end if;

    -- ── 10. Nu is de tweede de laatste — 0 rijen ──────────────
    -- Bewijst dat de rem aan de rol hangt en niet aan de persoon:
    -- wie er ook overblijft, die kan er niet in zijn eentje uit.
    perform set_config('request.jwt.claim.sub', eigenaar2::text, true);
    delete from public.leden where club_id = club and gebruiker_id = eigenaar2;
    get diagnostics geraakt = row_count;
    if geraakt = 0 then
      r := array_append(r, '10§de overgebleven eigenaar verwijdert zichzelf§0 rijen geraakt§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('10§de overgebleven eigenaar verwijdert zichzelf§' || geraakt || ' rijen geraakt§<< LEK -- de club blijft zonder eigenaar achter'));
      -- Ook hier terugzetten, zodat 11 en 12 zelfstandig blijven.
      reset role;
      insert into public.leden (club_id, gebruiker_id, naam, rol)
        values (club, eigenaar2, 'Test-eigenaar-2', 'eigenaar');
      set local role authenticated;
    end if;

    -- ── 11. verlaat_club() weigert, en legt uit waarom ────────
    -- Een geweigerde verwijdering geeft geen foutmelding maar "0
    -- rijen". De app zou dus "gelukt" tonen terwijl er niets
    -- gebeurde. Daarom moet verlaat_club() klappen MÉT een zin die
    -- vertelt wat je dan wél kunt doen. Deze test kijkt dus niet
    -- alleen of het mislukt, maar ook of de melding bruikbaar is.
    begin
      select public.verlaat_club(club) into melding;
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('11§verlaat_club() bij de laatste eigenaar§GELUKT: ' || coalesce(melding, '') || '§<< LEK -- dit hoort te mislukken'));
    exception when others then
      if sqlerrm like '%laatste eigenaar%' and sqlerrm like '%eerst%' then
        r := array_append(r, '11§verlaat_club() bij de laatste eigenaar§GEWEIGERD, met uitleg wat hij wel kan doen§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('11§verlaat_club() bij de laatste eigenaar§geweigerd zonder bruikbare uitleg: ' || sqlerrm || '§WIJKT AF'));
      end if;
    end;

    -- ── 12. verlaat_club() bij een gewoon lid — moet lukken ───
    -- De kijker is geen eigenaar en mag dus gewoon weg.
    perform set_config('request.jwt.claim.sub', kijker::text, true);
    begin
      select public.verlaat_club(club) into melding;
      if exists (select 1 from public.leden where club_id = club and gebruiker_id = kijker) then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '12§kijker verlaat de club via verlaat_club()§meldde gelukt maar staat er nog in§WIJKT AF');
      else
        r := array_append(r, ('12§kijker verlaat de club via verlaat_club()§' || coalesce(melding, '(geen melding)') || '§ZOALS VERWACHT'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('12§kijker verlaat de club via verlaat_club()§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
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
    insert into tt_uitslag values ('', '── SLOTSOM ──', 'alle twaalf scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE tests/leden-policy.test.md');
  end if;
end
$test$;

-- Op nummer sorteren, want 10 hoort onder 9 en niet onder 1. De
-- slotsom (leeg) en een vastgelopen test ('!') zijn geen getal en
-- gaan daarom onderaan.
select nr, scenario, uitkomst, oordeel
from tt_uitslag
order by case when nr ~ '^[0-9]+$' then nr::int else 99 end, nr;
