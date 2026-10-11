-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: een toernooi openbaar maken (databasekant)
--  ─────────────────────────────────────────────────────────────
--      sh tests/sql-lokaal/draai.sh tests/toernooi-publiek.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql \
--          server/23-toernooi-publiek.sql
--
--  WAAR HET HIER OM GAAT
--  Een openbare link mag iedereen LEZEN, maar alleen een trainer of
--  eigenaar van dat team (met Coach of Club) mag hem MAKEN. En er komt
--  nooit een e-mailadres of telefoonnummer in.
--  In de kolom "oordeel" hoort overal ZOALS VERWACHT te staan.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_publiek;
create temp table tt_uitslag_publiek(nr text, scenario text, uitkomst text, oordeel text);
grant all on tt_uitslag_publiek to anon, authenticated;

do $test$
declare
  u_tr uuid := 'b0b00000-0000-4000-a000-000000000001';  -- trainer, Coach
  u_kk uuid := 'b0b00000-0000-4000-a000-000000000002';  -- kijker, zelfde club
  u_vr uuid := 'b0b00000-0000-4000-a000-000000000003';  -- trainer andere club (Coach)
  u_fr uuid := 'b0b00000-0000-4000-a000-000000000004';  -- trainer, Free
  c_tr uuid; c_vr uuid; c_fr uuid;
  slug1 text; slug2 text; tekst text; tel int; ts1 timestamptz; ts2 timestamptz;
  r text[] := '{}'; regel text; deel text[]; afwijkingen int := 0;

begin
  begin
    insert into auth.users (id, email) values
      (u_tr, 'pub-trainer@teamtakkie.test'), (u_kk, 'pub-kijker@teamtakkie.test'),
      (u_vr, 'pub-vreemd@teamtakkie.test'),  (u_fr, 'pub-free@teamtakkie.test');
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_tr::text, true); c_tr := public.nieuwe_club('Publiekclub', 'P1');
    perform set_config('request.jwt.claim.sub', u_vr::text, true); c_vr := public.nieuwe_club('Vreemde club', 'P2');
    perform set_config('request.jwt.claim.sub', u_fr::text, true); c_fr := public.nieuwe_club('Gratis club', 'P3');
    reset role;
    insert into public.leden (club_id, gebruiker_id, rol) values (c_tr, u_kk, 'kijker');
    insert into public.teams (id, club_id, naam) values ('pubteam1', c_tr, 'JO11-1'), ('pubteam3', c_fr, 'JO9-1');
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 30 where club_id in (c_tr, c_vr);

    -- ══ 1. trainer met Coach publiceert ══
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_tr::text, true);
    slug1 := public.toernooi_publiceren('pubteam1', 't1', '{"naam":"Paastoernooi","wedstrijden":[]}'::jsonb);
    reset role;
    if slug1 ~ '^[a-z0-9]{20}$' then
      r := array_append(r, '1§trainer met Coach publiceert§code van 20 tekens§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1; r := array_append(r, '1§trainer met Coach publiceert§' || coalesce(slug1, '(leeg)') || '§WIJKT AF');
    end if;

    -- ══ 2. opnieuw publiceren: zelfde code, nieuwe inhoud ══
    select bijgewerkt_op into ts1 from public.toernooi_publiek where slug = slug1;
    perform pg_sleep(0.01);
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_tr::text, true);
    slug2 := public.toernooi_publiceren('pubteam1', 't1', '{"naam":"Paastoernooi 2","wedstrijden":[]}'::jsonb);
    reset role;
    select inhoud->>'naam', bijgewerkt_op into tekst, ts2 from public.toernooi_publiek where slug = slug1;
    if slug2 = slug1 and tekst = 'Paastoernooi 2' and ts2 > ts1 then
      r := array_append(r, '2§opnieuw publiceren houdt dezelfde link§zelfde code, nieuwe inhoud§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1; r := array_append(r, '2§opnieuw publiceren houdt dezelfde link§' || coalesce(slug2,'') || ' / ' || coalesce(tekst,'') || '§WIJKT AF');
    end if;

    -- ══ 3. bezoeker zonder account leest via de functie ══
    set local role anon;
    perform set_config('request.jwt.claim.sub', '', true);
    select inhoud->>'naam' into tekst from public.toernooi_publiek_lezen(slug1);
    reset role;
    if tekst = 'Paastoernooi 2' then
      r := array_append(r, '3§bezoeker zonder account leest de link§gelukt§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1; r := array_append(r, '3§bezoeker zonder account leest de link§' || coalesce(tekst, '(niets)') || '§WIJKT AF');
    end if;

    -- ══ 4. bezoeker kan de tabel niet rechtstreeks doorzoeken ══
    begin
      set local role anon;
      select count(*) into tel from public.toernooi_publiek;
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '4§bezoeker kan niet alle toernooien opvragen§' || tel || ' rijen zichtbaar§<< LEK');
    exception when insufficient_privilege then
      reset role;
      r := array_append(r, '4§bezoeker kan niet alle toernooien opvragen§geweigerd§ZOALS VERWACHT');
    end;

    -- ══ 5. bezoeker kan niet publiceren ══
    begin
      set local role anon;
      perform public.toernooi_publiceren('pubteam1', 't9', '{"naam":"nep"}'::jsonb);
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '5§bezoeker kan niet publiceren§gelukt§<< LEK');
    exception when others then
      reset role;
      r := array_append(r, '5§bezoeker kan niet publiceren§geweigerd§ZOALS VERWACHT');
    end;

    -- ══ 6–8. kijker, andere club, Free: geweigerd ══
    foreach regel in array array['6§kijker van dezelfde club§' || u_kk::text || '§pubteam1',
                                 '7§trainer van een andere club§' || u_vr::text || '§pubteam1',
                                 '8§trainer van een Free-club§' || u_fr::text || '§pubteam3'] loop
      deel := string_to_array(regel, '§');
      begin
        set local role authenticated;
        perform set_config('request.jwt.claim.sub', deel[3], true);
        perform public.toernooi_publiceren(deel[4], 'tx', '{"naam":"poging"}'::jsonb);
        reset role;
        afwijkingen := afwijkingen + 1; r := array_append(r, deel[1] || '§' || deel[2] || ' kan niet publiceren§gelukt§<< LEK');
      exception when others then
        reset role;
        r := array_append(r, deel[1] || '§' || deel[2] || ' kan niet publiceren§geweigerd§ZOALS VERWACHT');
      end;
    end loop;

    -- ══ 9. contactgegevens worden geweigerd, ook diep weggestopt ══
    begin
      set local role authenticated;
      perform set_config('request.jwt.claim.sub', u_tr::text, true);
      perform public.toernooi_publiceren('pubteam1', 't2', '{"deelnemers":[{"naam":"VV A","contact":{"email":"a@b.nl"}}]}'::jsonb);
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '9§e-mailadres in de inhoud wordt geweigerd§gepubliceerd§<< LEK');
    exception when others then
      reset role;
      r := array_append(r, '9§e-mailadres in de inhoud wordt geweigerd§geweigerd§ZOALS VERWACHT');
    end;

    -- ══ 10. versie voor het verversen ══
    set local role anon;
    ts1 := public.toernooi_publiek_versie(slug1);
    reset role;
    if ts1 = ts2 then
      r := array_append(r, '10§versie-tijdstip voor verversen§klopt§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1; r := array_append(r, '10§versie-tijdstip voor verversen§' || coalesce(ts1::text, '(leeg)') || '§WIJKT AF');
    end if;

    -- ══ 11. kijker kan niet intrekken, trainer wel ══
    begin
      set local role authenticated;
      perform set_config('request.jwt.claim.sub', u_kk::text, true);
      perform public.toernooi_intrekken('pubteam1', 't1');
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '11§kijker kan niet intrekken§gelukt§<< WIJKT AF');
    exception when others then
      reset role;
      r := array_append(r, '11§kijker kan niet intrekken§geweigerd§ZOALS VERWACHT');
    end;
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_tr::text, true);
    perform public.toernooi_intrekken('pubteam1', 't1');
    set local role anon;
    select count(*) into tel from public.toernooi_publiek_lezen(slug1);
    reset role;
    if tel = 0 then
      r := array_append(r, '12§na intrekken werkt de link niet meer§niets gevonden§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1; r := array_append(r, '12§na intrekken werkt de link niet meer§nog leesbaar§<< LEK');
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
    insert into tt_uitslag_publiek values (deel[1], deel[2], deel[3], deel[4]);
  end loop;
  if afwijkingen = 0 then
    insert into tt_uitslag_publiek values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_publiek values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/23-toernooi-publiek.sql');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_publiek
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
