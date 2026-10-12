-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: afbeeldingen bij een openbaar toernooi
--      sh tests/sql-lokaal/draai.sh tests/toernooi-media.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql \
--          server/23-toernooi-publiek.sql server/25-toernooi-media.sql
--  In de kolom "oordeel" hoort overal ZOALS VERWACHT te staan.
-- ══════════════════════════════════════════════════════════════
drop table if exists tt_uitslag_media;
create temp table tt_uitslag_media(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  u_tr uuid := 'c0c00000-0000-4000-a000-000000000001';
  u_kk uuid := 'c0c00000-0000-4000-a000-000000000002';
  c_tr uuid; slug1 text; tel int; v1 timestamptz; v2 timestamptz; m jsonb;
  r text[] := '{}'; regel text; deel text[]; afwijkingen int := 0;
  plaatje text := 'data:image/png;base64,iVBORw0KGgo=';
begin
  begin
    insert into auth.users (id, email) values (u_tr, 'media-trainer@teamtakkie.test'), (u_kk, 'media-kijker@teamtakkie.test');
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u_tr::text, true); c_tr := public.nieuwe_club('Mediaclub', 'M1');
    reset role;
    insert into public.leden (club_id, gebruiker_id, rol) values (c_tr, u_kk, 'kijker');
    insert into public.teams (id, club_id, naam) values ('mediateam', c_tr, 'JO11-1');
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date + 30 where club_id = c_tr;

    -- 1. vóór publiceren: geweigerd
    begin
      set local role authenticated; perform set_config('request.jwt.claim.sub', u_tr::text, true);
      perform public.toernooi_media_publiceren('mediateam', 't1', jsonb_build_object('m1', plaatje));
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '1§afbeeldingen vóór het toernooi zelf§gelukt§WIJKT AF');
    exception when others then reset role; r := array_append(r, '1§afbeeldingen vóór het toernooi zelf§geweigerd§ZOALS VERWACHT'); end;

    set local role authenticated; perform set_config('request.jwt.claim.sub', u_tr::text, true);
    slug1 := public.toernooi_publiceren('mediateam', 't1', '{"naam":"Cup"}'::jsonb);
    select inhoud, media into v1, v2 from public.toernooi_publiek_versies(slug1);
    perform public.toernooi_media_publiceren('mediateam', 't1', jsonb_build_object('m1', plaatje));
    reset role;

    -- 2. lezen zonder account
    set local role anon;
    select p.media into m from public.toernooi_publiek_media(slug1) p;
    reset role;
    if m ->> 'm1' = plaatje then r := array_append(r, '2§bezoeker leest de afbeeldingen met de code§gelukt§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '2§bezoeker leest de afbeeldingen met de code§' || coalesce(m::text,'(niets)') || '§WIJKT AF'); end if;

    -- 3. versies: alleen het media-tijdstip veranderde
    set local role anon;
    select inhoud, media into tel, v2 from (select 1 as inhoud, x.media from public.toernooi_publiek_versies(slug1) x) q;
    reset role;
    if v2 is not null then r := array_append(r, '3§media heeft een eigen versie-tijdstip§gezet§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '3§media heeft een eigen versie-tijdstip§leeg§WIJKT AF'); end if;

    -- 4. geen afbeelding (een link of script) geweigerd
    foreach regel in array array['4§een link in plaats van een afbeelding§https://evil.example/x.png',
                                 '5§een svg (kan script bevatten)§data:image/svg+xml;base64,PHN2Zz4=',
                                 '6§tekst achter de afbeelding§data:image/png;base64,AAAA"><script>'] loop
      deel := string_to_array(regel, '§');
      begin
        set local role authenticated; perform set_config('request.jwt.claim.sub', u_tr::text, true);
        perform public.toernooi_media_publiceren('mediateam', 't1', jsonb_build_object('m9', deel[3]));
        reset role;
        afwijkingen := afwijkingen + 1; r := array_append(r, deel[1] || '§' || deel[2] || '§geaccepteerd§<< LEK');
      exception when others then reset role; r := array_append(r, deel[1] || '§' || deel[2] || '§geweigerd§ZOALS VERWACHT'); end;
    end loop;

    -- 7. kijker en bezoeker mogen niet
    begin
      set local role authenticated; perform set_config('request.jwt.claim.sub', u_kk::text, true);
      perform public.toernooi_media_publiceren('mediateam', 't1', jsonb_build_object('m1', plaatje));
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '7§kijker kan geen afbeeldingen publiceren§gelukt§<< LEK');
    exception when others then reset role; r := array_append(r, '7§kijker kan geen afbeeldingen publiceren§geweigerd§ZOALS VERWACHT'); end;
    begin
      set local role anon;
      perform public.toernooi_media_publiceren('mediateam', 't1', jsonb_build_object('m1', plaatje));
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '8§bezoeker kan geen afbeeldingen publiceren§gelukt§<< LEK');
    exception when others then reset role; r := array_append(r, '8§bezoeker kan geen afbeeldingen publiceren§geweigerd§ZOALS VERWACHT'); end;

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
    insert into tt_uitslag_media values (deel[1], deel[2], deel[3], deel[4]);
  end loop;
  if afwijkingen = 0 then insert into tt_uitslag_media values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else insert into tt_uitslag_media values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/25-toernooi-media.sql'); end if;
end
$test$;
select nr, scenario, uitkomst, oordeel from tt_uitslag_media order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
