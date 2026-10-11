-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: AI-trainer, de rem en het gebruik
--  ─────────────────────────────────────────────────────────────
--      sh tests/sql-lokaal/draai.sh tests/ai-gebruik.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql server/24-ai-gebruik.sql
--
--  WAAR HET HIER OM GAAT
--  Eén vraag tegelijk, hoogstens 20 per 10 minuten, gebruik nooit
--  dubbel geteld, en een gewone gebruiker kan niets van dit alles
--  lezen of omzeilen. In de kolom "oordeel" hoort overal ZOALS
--  VERWACHT te staan.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_ai;
create temp table tt_uitslag_ai(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  u1 uuid := 'a1a1a1a1-0000-4000-a000-000000000001';
  c1 uuid;
  v_uit text; v_id bigint; v_id2 bigint; tel int; tin bigint; tuit bigint; i int;
  r text[] := '{}'; regel text; deel text[]; afwijkingen int := 0;
begin
  begin
    insert into auth.users (id, email) values (u1, 'ai-trainer@teamtakkie.test');
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u1::text, true);
    c1 := public.nieuwe_club('AI-club', 'AI1');
    reset role;

    -- ══ 1. eerste vraag mag ══
    select uitkomst, verzoek_id into v_uit, v_id from public.ai_verzoek_start(u1, c1);
    if v_uit = 'ok' and v_id is not null then r := array_append(r, '1§eerste vraag mag§ok§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '1§eerste vraag mag§' || coalesce(v_uit,'(leeg)') || '§WIJKT AF'); end if;

    -- ══ 2. tweede tegelijk: bezig ══
    select uitkomst into v_uit from public.ai_verzoek_start(u1, c1);
    if v_uit = 'bezig' then r := array_append(r, '2§tweede vraag tegelijk wordt tegengehouden§bezig§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '2§tweede vraag tegelijk wordt tegengehouden§' || coalesce(v_uit,'(leeg)') || '§<< LEK'); end if;

    -- ══ 3. klaar: gebruik opgeteld, en niet dubbel ══
    perform public.ai_verzoek_klaar(v_id, 1200, 3400);
    perform public.ai_verzoek_klaar(v_id, 1200, 3400);
    select verzoeken, tokens_in, tokens_uit into tel, tin, tuit from public.ai_gebruik where club_id = c1;
    if tel = 1 and tin = 1200 and tuit = 3400 then r := array_append(r, '3§gebruik opgeteld, twee keer afmelden telt één keer§1 vraag, 1200/3400 tokens§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '3§gebruik opgeteld, twee keer afmelden telt één keer§' || coalesce(tel,0) || ' / ' || coalesce(tin,0) || ' / ' || coalesce(tuit,0) || '§WIJKT AF'); end if;

    -- ══ 4. na afmelden mag de volgende ══
    select uitkomst, verzoek_id into v_uit, v_id2 from public.ai_verzoek_start(u1, c1);
    perform public.ai_verzoek_klaar(v_id2, 10, 10);
    if v_uit = 'ok' then r := array_append(r, '4§na afmelden mag de volgende vraag§ok§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '4§na afmelden mag de volgende vraag§' || coalesce(v_uit,'(leeg)') || '§WIJKT AF'); end if;

    -- ══ 5. twintig in tien minuten, de 21e niet ══
    for i in 3..20 loop
      select verzoek_id into v_id2 from public.ai_verzoek_start(u1, c1);
      perform public.ai_verzoek_klaar(v_id2, 1, 1);
    end loop;
    select uitkomst into v_uit from public.ai_verzoek_start(u1, c1);
    if v_uit = 'te-veel' then r := array_append(r, '5§de 21e vraag binnen 10 minuten wordt tegengehouden§te-veel§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '5§de 21e vraag binnen 10 minuten wordt tegengehouden§' || coalesce(v_uit,'(leeg)') || '§<< LEK'); end if;

    -- ══ 6. een omgevallen vraag houdt de trainer niet voorgoed vast ══
    delete from public.ai_verzoeken where gebruiker_id = u1;
    insert into public.ai_verzoeken (gebruiker_id, club_id, begonnen) values (u1, c1, clock_timestamp() - interval '3 minutes');
    select uitkomst into v_uit from public.ai_verzoek_start(u1, c1);
    if v_uit = 'ok' then r := array_append(r, '6§een vraag die na 2 minuten niet klaar is telt niet meer als bezig§ok§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '6§een vraag die na 2 minuten niet klaar is telt niet meer als bezig§' || coalesce(v_uit,'(leeg)') || '§WIJKT AF'); end if;

    -- ══ 7. gebruiker kan de rem niet omzeilen ══
    begin
      set local role authenticated;
      perform set_config('request.jwt.claim.sub', u1::text, true);
      perform public.ai_verzoek_klaar(1, 0, 0);
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '7§gebruiker kan zijn eigen rem niet loslaten§gelukt§<< LEK');
    exception when insufficient_privilege then
      reset role; r := array_append(r, '7§gebruiker kan zijn eigen rem niet loslaten§geweigerd§ZOALS VERWACHT');
    end;

    -- ══ 8. gebruiker kan het gebruik niet lezen ══
    begin
      set local role authenticated;
      select count(*) into tel from public.ai_gebruik;
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '8§gebruiker kan het gebruik van clubs niet lezen§' || tel || ' rijen§<< LEK');
    exception when insufficient_privilege then
      reset role; r := array_append(r, '8§gebruiker kan het gebruik van clubs niet lezen§geweigerd§ZOALS VERWACHT');
    end;

    -- ══ 9. maandoverzicht: alleen beheerder ══
    --  Niet lokaal te toetsen: in deze testdatabase is session_user altijd
    --  postgres, ook na "set role authenticated", en postgres mag het
    --  overzicht zien (zo werkt het ook in de SQL Editor). Via de app is
    --  session_user "authenticator" en beslist is_beheerder(). Zelfde
    --  constructie als wissel_controle() in 22-herroepen.sql.
    select verzoeken into tel from public.ai_maandoverzicht() where vereniging = 'AI-club';
    if tel = 20 then r := array_append(r, '10§maandoverzicht voor Evan (SQL Editor)§20 vragen§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '10§maandoverzicht voor Evan (SQL Editor)§' || coalesce(tel::text,'(niets)') || '§WIJKT AF'); end if;

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
    insert into tt_uitslag_ai values (deel[1], deel[2], deel[3], deel[4]);
  end loop;
  if afwijkingen = 0 then
    insert into tt_uitslag_ai values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_ai values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/24-ai-gebruik.sql');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_ai
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
