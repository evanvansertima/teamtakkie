-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: het abonnementsnummer van Mollie
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná server/01-schema.sql, 03-beheer.sql, 06-pakketten.sql,
--  17-free-serverdata.sql, 18-betalingen.sql en
--  19-mollie-subscription.sql.
--
--  Lokaal, zonder Supabase aan te raken:
--
--      sh tests/sql-lokaal/draai.sh tests/mollie-subscription.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql \
--          server/19-mollie-subscription.sql
--
--  In de SQL Editor van Supabase: dit hele bestand plakken en op Run
--  klikken. De uitslag komt als TABEL terug. Je hoort zes regels te
--  zien plus een slotregel, en in de kolom "oordeel" hoort overal
--  ZOALS VERWACHT te staan.
--
--  ─────────────────────────────────────────────────────────────
--  WAAR HET HIER OM GAAT
--
--  supabase/functions/betaling-melding/index.ts zet na de eerste
--  geslaagde betaling een doorlopende incasso klaar bij Mollie, en
--  bewaart het nummer daarvan in abonnementen.mollie_subscription_id.
--  Dat nummer is de enige bescherming tegen een tweede subscription
--  bij een herhaalde webhook — en twee subscriptions betekent twee
--  incasso's per maand.
--
--  Deze test gaat dus over twee dingen:
--    1. staat de kolom er, met een index;
--    2. is hij onbereikbaar voor een gewone gebruiker. Want wie zijn
--       eigen abonnementsnummer kan wissen, kan zijn incasso laten
--       stoppen terwijl het pakket blijft staan.
--
--  Scenario 4 is de belangrijkste: daar probeert een échte ingelogde
--  gebruiker — eigenaar van zijn eigen club — de kolom te wijzigen.
--  Dat hoort nul rijen te raken, niet door een foutmelding maar
--  doordat public.abonnementen met opzet geen enkele schrijfregel
--  heeft (01-schema.sql regel 288-295).
--
--  De test maakt zijn eigen club en nepgebruiker aan en draait alles
--  aan het eind terug. Er blijft niets van achter.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_sub;
create temp table tt_uitslag_sub(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  eigenaar  uuid := '7ea11f00-0000-4000-a000-0000000000e1';
  testclub  uuid := '7ea11f00-0000-4000-a000-0000000000d1';
  r           text[] := '{}';
  regel       text;
  deel        text[];
  afwijkingen int := 0;
  gevonden    text;
  geraakt     int;
begin
  begin
    -- ── Scenario 1: bestaat de kolom? ─────────────────────────
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'abonnementen'
                  and column_name = 'mollie_subscription_id') then
      r := array_append(r, '1§de kolom abonnementen.mollie_subscription_id bestaat§ja§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '1§de kolom abonnementen.mollie_subscription_id bestaat§nee§WIJKT AF — draai server/19-mollie-subscription.sql');
    end if;

    -- ── Scenario 2: is het een tekstkolom zonder verplichting? ─
    --  Verplicht mag hij niet zijn: bij een club die nog nooit betaald
    --  heeft is er geen incasso, en een lege waarde is dan het juiste
    --  antwoord. Zou de kolom "not null" zijn, dan kan er geen enkele
    --  abonnementsrij meer bij.
    select data_type || ', ' || case when is_nullable = 'YES' then 'mag leeg zijn' else 'VERPLICHT' end
      into gevonden
      from information_schema.columns
     where table_schema = 'public' and table_name = 'abonnementen'
       and column_name = 'mollie_subscription_id';
    if gevonden = 'text, mag leeg zijn' then
      r := array_append(r, ('2§de kolom is tekst en mag leeg blijven§' || gevonden || '§ZOALS VERWACHT'));
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('2§de kolom is tekst en mag leeg blijven§' || coalesce(gevonden, 'de kolom bestaat niet') || '§WIJKT AF'));
    end if;

    -- ── Scenario 3: de index ──────────────────────────────────
    if exists (select 1 from pg_indexes
                where schemaname = 'public' and tablename = 'abonnementen'
                  and indexname = 'abonnementen_mollie_subscription_idx') then
      r := array_append(r, '3§er is een index op de kolom§ja§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '3§er is een index op de kolom§nee§WIJKT AF');
    end if;

    -- ── De testclub klaarzetten ───────────────────────────────
    insert into auth.users (id, email) values (eigenaar, 'sub-test@voorbeeld.nl')
      on conflict (id) do nothing;
    insert into public.clubs (id, naam) values (testclub, 'Testclub abonnementsnummer')
      on conflict (id) do nothing;
    insert into public.leden (club_id, gebruiker_id, naam, rol)
      values (testclub, eigenaar, 'Testeigenaar', 'eigenaar')
      on conflict (club_id, gebruiker_id) do nothing;
    insert into public.abonnementen (club_id, pakket, mollie_subscription_id)
      values (testclub, 'coach', 'sub_HETECHTE1')
      on conflict (club_id) do update set mollie_subscription_id = 'sub_HETECHTE1';

    -- ── Scenario 4: een gewone gebruiker mag er niet bij ──────
    --  DIT IS DE KERN. De eigenaar van deze club probeert zijn eigen
    --  abonnementsnummer weg te halen. Dat hoort nul rijen te raken.
    --  Twee instellingen, met opzet allebei. De echte Supabase leest
    --  auth.uid() uit request.jwt.claims (één JSON-tekst); de lokale
    --  wegwerpdatabase (tests/sql-lokaal/nabootsing.sql) leest
    --  request.jwt.claim.sub. Zet je er maar één, dan is auth.uid() op
    --  de andere plek leeg — en dan raakt de update hieronder nul rijen
    --  omdat de gebruiker niet bestaat, niet omdat de regels hem
    --  tegenhouden. Dat is precies het soort groene test dat niets
    --  vangt.
    perform set_config('request.jwt.claim.sub', eigenaar::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config('request.jwt.claims',
                       json_build_object('sub', eigenaar::text, 'role', 'authenticated')::text,
                       true);
    set local role authenticated;

    -- ── Scenario 4a: is deze nepgebruiker wel écht ingelogd? ──
    --  Het vangnet onder scenario 4. Zou auth.uid() leeg zijn, dan
    --  raakt de update hieronder óók nul rijen en zou scenario 4 groen
    --  blijven terwijl er niets is getoetst. Deze regel bewijst dat de
    --  gebruiker zijn eigen abonnementsrij wél kan zien — dus dat hij
    --  bestaat en dat de leesregel hem herkent.
    select count(*)::int into geraakt
      from public.abonnementen where club_id = testclub;
    if geraakt = 1 then
      r := array_append(r, '4a§de nepgebruiker is echt ingelogd (ziet zijn eigen abonnement)§1 rij zichtbaar§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4a§de nepgebruiker is echt ingelogd (ziet zijn eigen abonnement)§'
        || geraakt || ' rij(en) zichtbaar§WIJKT AF — scenario 4 zegt dan niets'));
    end if;

    update public.abonnementen
       set mollie_subscription_id = null
     where club_id = testclub;
    get diagnostics geraakt = row_count;

    reset role;
    perform set_config('request.jwt.claims', '', true);

    if geraakt = 0 then
      r := array_append(r, '4§de eigenaar wist zijn eigen abonnementsnummer§0 rijen geraakt§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4§de eigenaar wist zijn eigen abonnementsnummer§' || geraakt
        || ' rij(en) geraakt§WIJKT AF — er is een schrijfregel op abonnementen bij gekomen'));
    end if;

    -- ── Scenario 5: en het nummer staat er dus nog ────────────
    select coalesce(mollie_subscription_id, '(leeg)') into gevonden
      from public.abonnementen where club_id = testclub;
    if gevonden = 'sub_HETECHTE1' then
      r := array_append(r, '5§het nummer staat er na die poging nog steeds§sub_HETECHTE1§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5§het nummer staat er na die poging nog steeds§' || gevonden || '§WIJKT AF'));
    end if;

    -- Hier laten we de deeltransactie expres klappen, zodat de
    -- testclub en de nepgebruiker weer verdwijnen.
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
    insert into tt_uitslag_sub values (deel[1], deel[2], deel[3], deel[4]);
  end loop;

  if afwijkingen = 0 then
    insert into tt_uitslag_sub values ('', '── SLOTSOM ──', 'alle zes de scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_sub values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/19-mollie-subscription.sql');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_sub
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
