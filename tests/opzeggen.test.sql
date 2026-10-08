-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: opzeggen (de databasekant)
--  ─────────────────────────────────────────────────────────────
--  Draai dit lokaal, zonder Supabase aan te raken:
--
--      sh tests/sql-lokaal/draai.sh tests/opzeggen.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql \
--          server/19-mollie-subscription.sql server/20-abonnement-wisselen.sql \
--          server/21-opzeggen.sql
--
--  Het mag ook in de SQL Editor van Supabase. De test maakt zijn eigen
--  verenigingen en nepaccounts aan en draait alles aan het eind terug.
--  In de kolom "oordeel" hoort overal ZOALS VERWACHT te staan.
--
--  WAAR HET HIER OM GAAT
--
--  1. GEEN RESPIJT NA OPZEGGEN, MAAR WEL TOT EN MET DE EINDDATUM.
--     Besluit van Evan, 29 september 2026. De grens zit precies op de
--     einddatum: die dag zelf hoort er nog bij (de club heeft ervoor
--     betaald), de dag erna niet meer. Scenario 3 en 4 meten die ene
--     dag, en scenario 2 laat zien dat een club die NIET opzegde de
--     respijt gewoon nog krijgt — anders zou een te strenge regel
--     onopgemerkt elke late incasso straffen.
--
--  2. DE ZESTIG DAGEN VOOR GEGEVENS BLIJVEN. Opzeggen gaat over het
--     pakket, niet over iemands gegevens. schrijfrecht_tot() mag er
--     dus niets van merken (scenario 7).
--
--  3. DE APP KAN "OPGEZEGD" NIET ZELF ZETTEN OF WEGHALEN. Dat doet
--     alleen de edge function, na Mollie. Anders kan iemand met de
--     ontwikkelaarsconsole een opzegging intrekken zonder dat er ooit
--     weer een incasso komt (scenario 8).
--
--  WAT HIER NIET GETEST WORDT
--  Het praten met Mollie, en de volgorde "eerst Mollie, dan de
--  database". Dat is gedrag van de edge function en staat in
--  supabase/functions/abonnement-opzeggen/index.test.ts.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_opzeggen;
create temp table tt_uitslag_opzeggen(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  u_lp  uuid := 'a1552000-0000-4000-a000-000000000001';  -- niet opgezegd, net verlopen
  u_op  uuid := 'a1552000-0000-4000-a000-000000000002';  -- opgezegd, net verlopen
  u_ld  uuid := 'a1552000-0000-4000-a000-000000000003';  -- opgezegd, vandaag laatste dag
  u_nl  uuid := 'a1552000-0000-4000-a000-000000000004';  -- opgezegd, loopt nog
  u_beh uuid := 'a1552000-0000-4000-a000-000000000005';

  c_lp uuid; c_op uuid; c_ld uuid; c_nl uuid;

  r           text[] := '{}';
  regel       text;
  deel        text[];
  afwijkingen int := 0;

  pk      text;
  vlag    boolean;
  d_was   date;
  d_nu    date;
  g       record;
  v_fout  text;
  tel     int;
begin
  begin
    -- ══ 1. DE KOLOM ══════════════════════════════════════════
    select exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'abonnementen'
                      and column_name = 'opgezegd_op') into vlag;
    if vlag then
      r := array_append(r, '1§de kolom abonnementen.opgezegd_op bestaat§aanwezig§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '1§de kolom abonnementen.opgezegd_op bestaat§ONTBREEKT§WIJKT AF — draai server/21-opzeggen.sql');
      raise exception 'TT_TEST_KLAAR';
    end if;

    -- ══ OPBOUW ═══════════════════════════════════════════════
    insert into auth.users (id, email) values
      (u_lp,  'opzeg-laatbetaler@teamtakkie.test'),
      (u_op,  'opzeg-verlopen@teamtakkie.test'),
      (u_ld,  'opzeg-laatstedag@teamtakkie.test'),
      (u_nl,  'opzeg-looptnog@teamtakkie.test'),
      (u_beh, 'opzeg-beheerder@teamtakkie.test');
    insert into public.beheerders (gebruiker_id, notitie)
      values (u_beh, 'test-beheerder (opzeggen)');

    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_lp::text, true); c_lp := public.nieuwe_club('Opzegclub laat', 'Eigenaar LP');
    perform set_config('request.jwt.claim.sub', u_op::text, true); c_op := public.nieuwe_club('Opzegclub verlopen', 'Eigenaar OP');
    perform set_config('request.jwt.claim.sub', u_ld::text, true); c_ld := public.nieuwe_club('Opzegclub laatste dag', 'Eigenaar LD');
    perform set_config('request.jwt.claim.sub', u_nl::text, true); c_nl := public.nieuwe_club('Opzegclub loopt nog', 'Eigenaar NL');
    reset role;

    update public.abonnementen set pakket = 'coach', termijn = 'maand', geldig_tot = current_date - 5,
           mollie_subscription_id = 'sub_laat', mollie_bedrag_cent = 699
     where club_id = c_lp;
    update public.abonnementen set pakket = 'coach', termijn = 'maand', geldig_tot = current_date - 5,
           opgezegd_op = now() - interval '20 days'
     where club_id = c_op;
    update public.abonnementen set pakket = 'club', termijn = 'maand', geldig_tot = current_date,
           opgezegd_op = now() - interval '10 days'
     where club_id = c_ld;
    update public.abonnementen set pakket = 'coach', termijn = 'jaar', geldig_tot = current_date + 100,
           opgezegd_op = now()
     where club_id = c_nl;

    -- ══ 2. NIET OPGEZEGD: DE RESPIJT BLIJFT ═════════════════
    pk := public.pakket_van_club(c_lp);
    if pk = 'coach' then
      r := array_append(r, '2§niet opgezegd, 5 dagen verlopen: respijt geldt nog§coach§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('2§niet opgezegd, 5 dagen verlopen: respijt geldt nog§' || coalesce(pk,'(leeg)')
        || '§WIJKT AF — een late incasso hoort niet meteen het pakket te kosten'));
    end if;

    -- ══ 3. OPGEZEGD EN VERLOPEN: METEEN FREE ═════════════════
    pk := public.pakket_van_club(c_op);
    if pk = 'free' then
      r := array_append(r, '3§opgezegd, 5 dagen verlopen: geen respijt, free§free§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('3§opgezegd, 5 dagen verlopen: geen respijt, free§' || coalesce(pk,'(leeg)')
        || '§WIJKT AF — besluit 29 september: opzeggen stopt op de einddatum'));
    end if;

    -- ══ 4. OPGEZEGD, VANDAAG DE LAATSTE DAG: NOG BETAALD ═════
    pk := public.pakket_van_club(c_ld);
    if pk = 'club' then
      r := array_append(r, '4§opgezegd, vandaag is de einddatum: het pakket geldt nog§club§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4§opgezegd, vandaag is de einddatum: het pakket geldt nog§' || coalesce(pk,'(leeg)')
        || '§WIJKT AF — de einddatum zelf is betaald'));
    end if;

    -- ══ 5. OPGEZEGD, LOOPT NOG: PAKKET GEWOON GELDIG ═════════
    pk := public.pakket_van_club(c_nl);
    if pk = 'coach' then
      r := array_append(r, '5§opgezegd, nog 100 dagen: pakket geldt gewoon§coach§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5§opgezegd, nog 100 dagen: pakket geldt gewoon§' || coalesce(pk,'(leeg)') || '§WIJKT AF'));
    end if;

    -- ══ 6. wissel_gegevens() WEET HET ════════════════════════
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
    select * into g from public.wissel_gegevens(c_nl);
    vlag := g.opgezegd;
    select * into g from public.wissel_gegevens(c_lp);
    if vlag is true and g.opgezegd is false then
      r := array_append(r, '6§wissel_gegevens() zegt of er is opgezegd§opgezegd: ja; niet opgezegd: nee§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('6§wissel_gegevens() zegt of er is opgezegd§opgezegd gaf ' || coalesce(vlag::text,'(leeg)')
        || ', niet opgezegd gaf ' || coalesce(g.opgezegd::text,'(leeg)') || '§WIJKT AF'));
    end if;
    perform set_config('request.jwt.claims', '', true);

    -- ══ 7. DE ZESTIG DAGEN VOOR GEGEVENS BLIJVEN ═════════════
    --  schrijfrecht_tot() rekent vanaf betaald_tot. Zelfde club, met en
    --  zonder opzegging: hetzelfde antwoord.
    update public.abonnementen set betaald_tot = current_date - 5 where club_id = c_op;
    d_was := public.schrijfrecht_tot(c_op);
    update public.abonnementen set opgezegd_op = null where club_id = c_op;
    d_nu := public.schrijfrecht_tot(c_op);
    update public.abonnementen set opgezegd_op = now() - interval '20 days' where club_id = c_op;
    if d_was is not null and d_was = d_nu then
      r := array_append(r, ('7§opzeggen raakt de 60 dagen voor gegevens niet§schrijfrecht tot ' || d_was || ', met en zonder opzegging§ZOALS VERWACHT'));
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('7§opzeggen raakt de 60 dagen voor gegevens niet§opgezegd: ' || coalesce(d_was::text,'(leeg)')
        || ', niet: ' || coalesce(d_nu::text,'(leeg)') || '§WIJKT AF — gegevens horen niet aan het pakket te hangen'));
    end if;

    -- ══ 8. DE APP KAN EEN OPZEGGING NIET ZELF INTREKKEN ══════
    v_fout := '';
    begin
      set local role authenticated;
      perform set_config('request.jwt.claim.sub', u_nl::text, true);
      update public.abonnementen set opgezegd_op = null where club_id = c_nl;
      get diagnostics tel = row_count;
      reset role;
    exception when others then
      v_fout := sqlstate;
      reset role;
    end;
    select (opgezegd_op is not null) into vlag from public.abonnementen where club_id = c_nl;
    if vlag then
      r := array_append(r, ('8§de eigenaar kan opgezegd_op niet zelf leegmaken§'
        || case when v_fout <> '' then 'GEWEIGERD: ' || v_fout else '0 rijen geraakt' end || '§ZOALS VERWACHT'));
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '8§de eigenaar kan opgezegd_op niet zelf leegmaken§de opzegging is WEG§<< LEK — intrekken zonder nieuwe incasso');
    end if;

    -- ══ 9. wissel_controle() NEGEERT OPGEZEGDE CLUBS ═════════
    --  c_nl is opgezegd en heeft (terecht) geen bedrag bij Mollie.
    --  c_lp is niet opgezegd en klopt. Geen van beide hoort te verschijnen.
    select count(*) into tel from public.wissel_controle() w where w.club_id in (c_nl, c_lp);
    if tel = 0 then
      r := array_append(r, '9§wissel_controle() meldt een opgezegde club niet als afwijking§0 meldingen§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('9§wissel_controle() meldt een opgezegde club niet als afwijking§' || tel || ' melding(en)§WIJKT AF'));
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
    insert into tt_uitslag_opzeggen values (deel[1], deel[2], deel[3], deel[4]);
  end loop;

  if afwijkingen = 0 then
    insert into tt_uitslag_opzeggen values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_opzeggen values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af',
      'ZIE docs/opzeggen-plan.md en server/21-opzeggen.sql');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_opzeggen
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
