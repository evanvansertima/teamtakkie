-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: kan een beheerder nog een pakket wijzigen?
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná server/01-schema.sql, server/03-beheer.sql en
--  server/06-pakketten.sql. Plak dit hele bestand in de SQL Editor
--  van Supabase en klik op Run. De uitslag komt als TABEL terug,
--  gewoon in het resultaatvenster.
--
--  Je hoort acht regels te zien plus een slotregel, en in de kolom
--  "oordeel" hoort overal ZOALS VERWACHT te staan.
--
--  LET OP — dit bestand is op 18 september 2026 met opzet ROOD
--  geschreven, vóór de reparatie. Zolang die reparatie er niet is,
--  hoort de slotsom "5 scenario(s) wijken af" te melden: scenario
--  1, 2, 4, 5 en 8.
--
--  ─────────────────────────────────────────────────────────────
--  WAAR HET HIER OM GAAT
--
--  De pakketten heetten ooit free / basic / pro / max. Op 11
--  september 2026 zijn dat er drie geworden: free / coach / club.
--  Die nieuwe namen staan inmiddels op drie plekken vast:
--
--    · server/01-schema.sql regel 108  — de check op abonnementen
--    · server/06-pakketten.sql :194    — dezelfde check, opnieuw gezet
--    · src/kern/rollen.js, zetPakketVan() — wat de app verstuurt
--
--  Eén plek is meeverhuisd noch bijgewerkt: zet_pakket() in
--  server/03-beheer.sql regel 109-116 kent nog steeds alleen
--  'free','basic','pro','max'. Die functie is precies de weg die de
--  app gebruikt om een pakket te wijzigen.
--
--  Het gevolg is geen lek maar een kapotte knop, en wel de vervelende
--  soort: alle drie de namen die de app kan sturen lopen mis.
--  'coach' en 'club' worden door de functie zelf geweigerd
--  ("Onbekend pakket"), 'free' komt er nog doorheen. Een beheerder
--  kan dus nog wel iemand naar free zetten, maar niemand meer
--  omhoog — het beheerscherm kan alleen nog afwaarderen.
--
--  En andersom: 'basic', 'pro' en 'max' komen langs de functie wél
--  door en stranden daarna pas op de check-constraint van de tabel.
--  De beheerder krijgt dan geen nette "Onbekend pakket", maar de
--  rauwe databasefout over een constraint. Scenario 5 legt dat vast,
--  zodat de reparatie beide kanten meeneemt en niet alleen de lijst
--  in de functie verruimt.
--
--  De test maakt zijn eigen testclub en nepbeheerder aan en draait
--  die aan het eind allemaal terug. Er blijft niets van achter. Hij
--  raakt geen enkele bestaande club of gebruiker aan: de club die hij
--  aanmaakt is nieuw en heeft geen leden.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_pakket;
create temp table tt_uitslag_pakket(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  gewone_gebruiker uuid := '7ea11f00-0000-4000-a000-000000000031';
  beheerder        uuid := '7ea11f00-0000-4000-a000-000000000032';
  testclub         uuid := '7ea11f00-0000-4000-a000-0000000000c1';
  gezien      text;
  bron        text;
  afwijkingen int := 0;
  r text[] := '{}';
  regel text;
  deel  text[];
begin
  -- Zelfde opzet als tests/foutmeldingen.test.sql: alles gebeurt in
  -- een deeltransactie die we aan het eind expres laten klappen.
  -- Daardoor verdwijnt elke testrij weer, terwijl de uitslagen in `r`
  -- bewaard blijven — variabelen rollen namelijk niet terug.
  begin
    insert into auth.users (id, email) values
      (gewone_gebruiker, 'test-pakket-gewoon@teamtakkie.test'),
      (beheerder,        'test-pakket-beheerder@teamtakkie.test');
    insert into public.beheerders (gebruiker_id, notitie)
      values (beheerder, 'test-beheerder (zet_pakket)');
    insert into public.clubs (id, naam) values (testclub, 'Testclub zet_pakket');

    set local role authenticated;
    perform set_config('request.jwt.claim.sub', beheerder::text, true);

    -- ══ Deel 1 — de namen die de app echt verstuurt ════════════
    --  src/kern/rollen.js stuurt 'free', 'coach' of 'club'. Alle drie
    --  horen te werken. Twee ervan doen dat vandaag niet.

    -- ── 1. 'coach' ─────────────────────────────────────────────
    begin
      perform public.zet_pakket(testclub, 'coach');
      reset role;
      select pakket into gezien from public.abonnementen where club_id = testclub;
      set local role authenticated;
      if gezien = 'coach' then
        r := array_append(r, '1§beheerder zet het pakket op ''coach''§bewaard als coach§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('1§beheerder zet het pakket op ''coach''§bewaard als ' || coalesce(gezien, 'niets') || '§WIJKT AF'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('1§beheerder zet het pakket op ''coach''§MISLUKT: ' || sqlerrm || '§WIJKT AF — dit is de naam die de app verstuurt'));
    end;

    -- ── 2. 'club' ──────────────────────────────────────────────
    --  Ook meteen de controle of "on conflict do update" werkt: er
    --  staat na scenario 1 al een rij voor deze club (of niet, als 1
    --  faalde), en in beide gevallen hoort dit 'club' op te leveren.
    begin
      perform public.zet_pakket(testclub, 'club', date '2027-07-01');
      reset role;
      select pakket into gezien from public.abonnementen where club_id = testclub;
      set local role authenticated;
      if gezien = 'club' then
        r := array_append(r, '2§beheerder zet het pakket op ''club'' (met geldig_tot)§bewaard als club§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2§beheerder zet het pakket op ''club'' (met geldig_tot)§bewaard als ' || coalesce(gezien, 'niets') || '§WIJKT AF'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('2§beheerder zet het pakket op ''club'' (met geldig_tot)§MISLUKT: ' || sqlerrm || '§WIJKT AF — dit is de naam die de app verstuurt'));
    end;

    -- ── 3. 'free' ──────────────────────────────────────────────
    --  Deze hoort NU al te slagen. Hij staat er om de diagnose vast te
    --  pinnen: de functie is niet stuk, zijn lijst met namen is oud.
    --  Blijft dit groen terwijl 1 en 2 rood zijn, dan weet degene die
    --  dit repareert precies waar hij moet zijn.
    begin
      perform public.zet_pakket(testclub, 'free');
      reset role;
      select pakket into gezien from public.abonnementen where club_id = testclub;
      set local role authenticated;
      if gezien = 'free' then
        r := array_append(r, '3§beheerder zet het pakket terug op ''free''§bewaard als free§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('3§beheerder zet het pakket terug op ''free''§bewaard als ' || coalesce(gezien, 'niets') || '§WIJKT AF'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('3§beheerder zet het pakket terug op ''free''§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 4. geldig_tot komt ook echt mee ────────────────────────
    begin
      perform public.zet_pakket(testclub, 'coach', date '2027-07-01');
      reset role;
      select geldig_tot::text into gezien from public.abonnementen where club_id = testclub;
      set local role authenticated;
      if gezien = '2027-07-01' then
        r := array_append(r, '4§de einddatum gaat mee naar de tabel§geldig_tot = 2027-07-01§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4§de einddatum gaat mee naar de tabel§geldig_tot = ' || coalesce(gezien, 'niets') || '§WIJKT AF'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4§de einddatum gaat mee naar de tabel§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ Deel 2 — de namen die NIET meer mogen ═════════════════

    -- ── 5. 'basic' — een oude naam ─────────────────────────────
    --  Dit hoort geweigerd te worden mét de nette melding van de
    --  functie zelf ("Onbekend pakket"). Vandaag glipt de naam langs
    --  de functie en strandt hij pas op de check-constraint van de
    --  tabel — een weigering, maar met een foutmelding die een
    --  beheerder niets zegt. De uitkomstkolom laat zien wélke.
    begin
      perform public.zet_pakket(testclub, 'basic');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '5§beheerder probeert de oude naam ''basic''§GELUKT§<< dit hoort te mislukken — die naam bestaat niet meer');
    exception when raise_exception then
      r := array_append(r, ('5§beheerder probeert de oude naam ''basic''§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5§beheerder probeert de oude naam ''basic''§geweigerd door de TABEL, niet door de functie: ' || sqlerrm || '§WIJKT AF — de beheerder hoort ''Onbekend pakket: basic'' te lezen'));
    end;

    -- ── 6. een verzonnen naam ──────────────────────────────────
    --  Hoort NU al te slagen. Staat er zodat een reparatie die de
    --  namenlijst helemaal weggooit (en alles doorlaat naar de tabel)
    --  meteen opvalt.
    begin
      perform public.zet_pakket(testclub, 'goud-deluxe');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '6§beheerder probeert een verzonnen naam§GELUKT§<< dit hoort te mislukken');
    exception when raise_exception then
      r := array_append(r, ('6§beheerder probeert een verzonnen naam§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('6§beheerder probeert een verzonnen naam§geweigerd door de TABEL, niet door de functie: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ Deel 3 — alleen een beheerder ═════════════════════════

    -- ── 7. een gewone gebruiker mag niets ──────────────────────
    --  Hoort NU al te slagen, en moet dat blijven doen: dit is het
    --  enige slot op deze functie. Een reparatie die hier iets aan
    --  verandert, maakt van een kapotte knop een lek.
    perform set_config('request.jwt.claim.sub', gewone_gebruiker::text, true);
    begin
      perform public.zet_pakket(testclub, 'free');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '7§gewone gebruiker roept zet_pakket() aan§GELUKT§<< LEK — dit hoort te mislukken');
    exception when raise_exception then
      r := array_append(r, ('7§gewone gebruiker roept zet_pakket() aan§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('7§gewone gebruiker roept zet_pakket() aan§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;
    perform set_config('request.jwt.claim.sub', beheerder::text, true);

    -- ══ Deel 4 — de twee lijsten naast elkaar ═════════════════

    -- ── 8. staan dezelfde namen in de functie als in de tabel? ─
    --  Scenario 1 t/m 6 toetsen het gedrag. Dit toetst de oorzaak:
    --  twee lijsten met pakketnamen die uit elkaar zijn gelopen. Deze
    --  controle vangt de volgende hernoeming al vóórdat iemand er
    --  tegenaan loopt in het beheerscherm.
    reset role;
    select pg_get_functiondef(p.oid) into bron
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'zet_pakket'
      limit 1;
    set local role authenticated;
    if bron is null then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '8§de namenlijst in zet_pakket() naast die van de tabel§zet_pakket() bestaat niet§WIJKT AF');
    elsif bron like '%''coach''%' and bron like '%''club''%'
          and bron not like '%''basic''%' and bron not like '%''pro''%' and bron not like '%''max''%' then
      r := array_append(r, '8§de namenlijst in zet_pakket() naast die van de tabel§beide kennen free/coach/club§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('8§de namenlijst in zet_pakket() naast die van de tabel§de functie noemt nog: '
        || trim(both ' ' from
             (case when bron like '%''basic''%' then 'basic ' else '' end) ||
             (case when bron like '%''pro''%'   then 'pro '   else '' end) ||
             (case when bron like '%''max''%'   then 'max '   else '' end) ||
             (case when bron not like '%''coach''%' then '(coach ontbreekt) ' else '' end) ||
             (case when bron not like '%''club''%'  then '(club ontbreekt) '  else '' end))
        || '§WIJKT AF — de tabel staat alleen free/coach/club toe'));
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
    insert into tt_uitslag_pakket values (deel[1], deel[2], deel[3], deel[4]);
  end loop;

  if afwijkingen = 0 then
    insert into tt_uitslag_pakket values ('', '── SLOTSOM ──', 'alle acht scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_pakket values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/03-beheer.sql regel 109-116');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_pakket
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
