-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: herroepen en de maandelijkse incasso (databasekant)
--  ─────────────────────────────────────────────────────────────
--      sh tests/sql-lokaal/draai.sh tests/herroepen.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql \
--          server/19-mollie-subscription.sql server/20-abonnement-wisselen.sql \
--          server/21-opzeggen.sql server/22-herroepen.sql
--
--  WAAR HET HIER OM GAAT
--  1. Sinds 9 oktober 2026 loopt de incasso ook na een jaaraankoop per
--     maand. wissel_controle() hoort een jaarclub met het MAANDbedrag
--     bij Mollie dus níét te melden, en het jaarbedrag juist wél: dat
--     zou betekenen dat Mollie elke maand een jaar afschrijft.
--  2. Een herroepen club staat op free en verschijnt nergens meer.
--  In de kolom "oordeel" hoort overal ZOALS VERWACHT te staan.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_herroepen;
create temp table tt_uitslag_herroepen(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  u_jm uuid := 'a1553000-0000-4000-a000-000000000001';  -- jaar, maandbedrag (goed)
  u_jj uuid := 'a1553000-0000-4000-a000-000000000002';  -- jaar, jaarbedrag (fout)
  u_hr uuid := 'a1553000-0000-4000-a000-000000000003';  -- herroepen
  c_jm uuid; c_jj uuid; c_hr uuid;
  r text[] := '{}'; regel text; deel text[]; afwijkingen int := 0;
  vlag boolean; tel int; pk text;
begin
  begin
    select exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'abonnementen'
                      and column_name = 'herroepen_op') into vlag;
    if vlag then
      r := array_append(r, '1§de kolom abonnementen.herroepen_op bestaat§aanwezig§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '1§de kolom abonnementen.herroepen_op bestaat§ONTBREEKT§WIJKT AF — draai server/22-herroepen.sql');
      raise exception 'TT_TEST_KLAAR';
    end if;

    insert into auth.users (id, email) values
      (u_jm, 'herroep-jaarmaand@teamtakkie.test'),
      (u_jj, 'herroep-jaarjaar@teamtakkie.test'),
      (u_hr, 'herroep-herroepen@teamtakkie.test');
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_jm::text, true); c_jm := public.nieuwe_club('Herroepclub jaar-maand', 'E1');
    perform set_config('request.jwt.claim.sub', u_jj::text, true); c_jj := public.nieuwe_club('Herroepclub jaar-jaar', 'E2');
    perform set_config('request.jwt.claim.sub', u_hr::text, true); c_hr := public.nieuwe_club('Herroepclub herroepen', 'E3');
    reset role;

    update public.abonnementen set pakket = 'club', termijn = 'jaar', geldig_tot = current_date + 200,
           mollie_subscription_id = 'sub_jm', mollie_bedrag_cent = 4900 where club_id = c_jm;
    update public.abonnementen set pakket = 'club', termijn = 'jaar', geldig_tot = current_date + 200,
           mollie_subscription_id = 'sub_jj', mollie_bedrag_cent = 49000 where club_id = c_jj;
    -- Zo laat abonnement-herroepen een club achter:
    update public.abonnementen set pakket = 'free', termijn = null, geldig_tot = null,
           mollie_subscription_id = null, mollie_bedrag_cent = null, opgezegd_op = null,
           herroepen_op = now() where club_id = c_hr;

    -- ══ 2. jaarclub met het maandbedrag: in orde ══
    select count(*) into tel from public.wissel_controle() w where w.club_id = c_jm;
    if tel = 0 then
      r := array_append(r, '2§jaarclub, Mollie schrijft het maandbedrag af: geen melding§0 meldingen§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '2§jaarclub, Mollie schrijft het maandbedrag af: geen melding§' || tel || ' melding(en)§WIJKT AF — sinds 9 oktober is de incasso altijd maandelijks');
    end if;

    -- ══ 3. jaarclub met het jaarbedrag: melden ══
    select count(*) into tel from public.wissel_controle() w where w.club_id = c_jj;
    if tel = 1 then
      r := array_append(r, '3§jaarclub, Mollie schrijft € 490 per maand af: wel melden§1 melding§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '3§jaarclub, Mollie schrijft € 490 per maand af: wel melden§' || tel || ' melding(en)§<< LEK — dan wordt elke maand een jaar afgeschreven');
    end if;

    -- ══ 4. herroepen: free, en nergens gemeld ══
    pk := public.pakket_van_club(c_hr);
    select count(*) into tel from public.wissel_controle() w where w.club_id = c_hr;
    if pk = 'free' and tel = 0 then
      r := array_append(r, '4§een herroepen club is free en wordt niet gemeld§free, 0 meldingen§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4§een herroepen club is free en wordt niet gemeld§' || coalesce(pk,'(leeg)') || ', ' || tel || ' melding(en)§WIJKT AF'));
    end if;

    raise exception 'TT_TEST_KLAAR';
  exception when others then
    reset role;
    if sqlerrm <> 'TT_TEST_KLAAR' then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('!§de test zelf liep vast§' || sqlerrm || ' (' || sqlstate || ')§WIJKT AF'));
    end if;
  end;

  foreach regel in array r loop
    deel := string_to_array(regel, '§');
    insert into tt_uitslag_herroepen values (deel[1], deel[2], deel[3], deel[4]);
  end loop;
  if afwijkingen = 0 then
    insert into tt_uitslag_herroepen values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_herroepen values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/22-herroepen.sql');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_herroepen
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
