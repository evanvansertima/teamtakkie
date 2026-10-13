-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: de status van de eigen laatste betaling
--      sh tests/sql-lokaal/draai.sh tests/betaalstatus.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql server/26-betaalstatus.sql
--  In de kolom "oordeel" hoort overal ZOALS VERWACHT te staan.
-- ══════════════════════════════════════════════════════════════
drop table if exists tt_uitslag_bs;
create temp table tt_uitslag_bs(nr text, scenario text, uitkomst text, oordeel text);
do $test$
declare
  u1 uuid := 'd0d00000-0000-4000-a000-000000000001';
  u2 uuid := 'd0d00000-0000-4000-a000-000000000002';
  c1 uuid; c2 uuid; st text; tel int;
  r text[] := '{}'; regel text; deel text[]; afwijkingen int := 0;
begin
  begin
    insert into auth.users (id, email) values (u1, 'bs1@teamtakkie.test'), (u2, 'bs2@teamtakkie.test');
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u1::text, true); c1 := public.nieuwe_club('Betaalclub', 'B1');
    perform set_config('request.jwt.claim.sub', u2::text, true); c2 := public.nieuwe_club('Andere club', 'B2');
    reset role;
    insert into public.betalingen (mollie_betaling_id, club_id, pakket, termijn, status, aangemaakt_op) values
      ('tr_oud', c1, 'coach', 'maand', 'betaald', now() - interval '2 days'),
      ('tr_nieuw', c1, 'club', 'maand', 'canceled', now() - interval '1 minute');

    set local role authenticated; perform set_config('request.jwt.claim.sub', u1::text, true);
    select b.status into st from public.laatste_betaalpoging(c1, now() - interval '10 minutes') b;
    reset role;
    if st = 'canceled' then r := array_append(r, '1§eigen club ziet de laatste poging: geannuleerd§canceled§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '1§eigen club ziet de laatste poging: geannuleerd§' || coalesce(st,'(niets)') || '§WIJKT AF'); end if;

    set local role authenticated; perform set_config('request.jwt.claim.sub', u1::text, true);
    select count(*) into tel from public.laatste_betaalpoging(c1, now());
    reset role;
    if tel = 0 then r := array_append(r, '2§alleen pogingen van ná het vertrek naar de bank§niets ouder§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '2§alleen pogingen van ná het vertrek naar de bank§' || tel || ' rij(en)§WIJKT AF'); end if;

    set local role authenticated; perform set_config('request.jwt.claim.sub', u2::text, true);
    select count(*) into tel from public.laatste_betaalpoging(c1, now() - interval '10 days');
    reset role;
    if tel = 0 then r := array_append(r, '3§een andere vereniging ziet niets§niets§ZOALS VERWACHT');
    else afwijkingen := afwijkingen + 1; r := array_append(r, '3§een andere vereniging ziet niets§' || tel || ' rij(en)§<< LEK'); end if;

    begin
      set local role anon;
      perform * from public.laatste_betaalpoging(c1, now() - interval '10 days');
      reset role;
      afwijkingen := afwijkingen + 1; r := array_append(r, '4§zonder account: geweigerd§gelukt§<< LEK');
    exception when insufficient_privilege then reset role; r := array_append(r, '4§zonder account: geweigerd§geweigerd§ZOALS VERWACHT'); end;

    raise exception 'TT_TEST_KLAAR';
  exception when others then
    reset role;
    if sqlerrm <> 'TT_TEST_KLAAR' then afwijkingen := afwijkingen + 1; r := array_append(r, ('!§de test zelf liep vast§' || sqlerrm || '§WIJKT AF')); end if;
  end;
  foreach regel in array r loop deel := string_to_array(regel, '§'); insert into tt_uitslag_bs values (deel[1], deel[2], deel[3], deel[4]); end loop;
  if afwijkingen = 0 then insert into tt_uitslag_bs values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else insert into tt_uitslag_bs values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/26-betaalstatus.sql'); end if;
end
$test$;
select nr, scenario, uitkomst, oordeel from tt_uitslag_bs order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
