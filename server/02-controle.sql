-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — controle: staat de beveiliging echt aan?
--  ─────────────────────────────────────────────────────────────
--  Plak dit in de SQL Editor en klik op Run. Er staan vier
--  controles in dit bestand, onder elkaar. Je krijgt dus vier
--  uitkomsten terug; loop ze alle vier na. De laatste twee melden
--  zich onder het tabblad "Messages", onderin het scherm.
--
--  Je hoort zes regels terug te krijgen. Bij elke regel moet
--  beveiliging_aan op "true" staan en moet aantal_regels minstens
--  1 zijn.
--
--  Staat er ergens "false", dan ligt die tabel open voor iedereen
--  die het adres van je server kent — en dat adres staat straks
--  gewoon in de app. Zet er dan geen gegevens in en draai eerst
--  01-schema opnieuw.
-- ══════════════════════════════════════════════════════════════
select
  c.relname                as tabel,
  c.relrowsecurity         as beveiliging_aan,
  count(p.polname)         as aantal_regels
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relname;

-- ══════════════════════════════════════════════════════════════
--  CONTROLE 2 — kijkt een regel in zijn eigen tabel?
--  ─────────────────────────────────────────────────────────────
--  Een regel die zelf in de tabel kijkt die hij bewaakt, laat
--  Postgres vastlopen op "infinite recursion". Dat gebeurt pas als
--  iemand die tabel echt gebruikt — zo'n regel kan dus maanden
--  kapot in productie staan zonder dat iemand het merkt. Precies
--  dat is hier gebeurd met leden_toevoegen en leden_weghalen.
--
--  Deze controle leest de regels zoals ze in de database staan en
--  vindt het patroon dus ook in regels die nooit gebruikt worden.
--
--  Wat je hoort te zien: bij elke regel "in orde". Staat er ergens
--  "STUK", dan is die bewerking op die tabel onbruikbaar.
--
--  Let op: er wordt alleen gezocht naar "from <eigen tabel>" of
--  "join <eigen tabel>". De vier regels op gegevens kijken in
--  public.teams — een andere tabel, dat is gezond en hoort geen
--  alarm te geven.
-- ══════════════════════════════════════════════════════════════
select
  p.tablename  as tabel,
  p.policyname as regel,
  p.cmd        as bewerking,
  case
    when coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')
         ~* ('(from|join)[[:space:]]+(public\.)?' || p.tablename || '\M')
    then 'STUK: kijkt in zijn eigen tabel -> infinite recursion'
    else 'in orde'
  end as oordeel
from pg_policies p
where p.schemaname = 'public'
order by oordeel desc, tabel, regel;

-- ══════════════════════════════════════════════════════════════
--  CONTROLE 3 — accepteert leden echt een insert en een delete?
--  ─────────────────────────────────────────────────────────────
--  Controle 2 leest de tekst van de regels. Deze doet de proef op
--  de som: hij doet alsof hij een bestaande eigenaar is en laat
--  Postgres een insert en een delete op leden helemaal uitwerken.
--
--  Er wordt niets toegevoegd en niets verwijderd. Dat komt door het
--  woordje "explain": Postgres maakt dan wel het volledige plan —
--  inclusief alle beveiligingsregels, en dus inclusief de recursie
--  als die er is — maar voert het niet uit.
--
--  Wat je hoort te zien, onder het tabblad "Messages" of onderin
--  het resultaatvenster:
--
--      OK: leden accepteert insert en delete
--
--  Staat er "STUK: ..." met daarachter een foutmelding, dan is de
--  reparatie uit 04-leden-fix niet (goed) gedraaid.
--  Staat er "OVERGESLAGEN", dan bestaat er nog geen enkele club en
--  valt er niets te meten: maak eerst een club aan in de app.
-- ══════════════════════════════════════════════════════════════
do $ctrl$
declare
  eigenaar_id uuid;
  club        uuid;
  proefpersoon uuid := gen_random_uuid();
begin
  select gebruiker_id, club_id into eigenaar_id, club
  from public.leden where rol = 'eigenaar' limit 1;

  if eigenaar_id is null then
    raise notice 'OVERGESLAGEN: er is nog geen enkele eigenaar in leden.';
    return;
  end if;

  -- Doen alsof we die eigenaar zijn. Beide regels zijn nodig:
  -- de eerste bepaalt wat auth.uid() teruggeeft, de tweede zorgt
  -- dat de beveiliging überhaupt van toepassing is (de eigenaar van
  -- de database mag standaard langs alle regels heen).
  perform set_config('request.jwt.claim.sub', eigenaar_id::text, true);
  set local role authenticated;

  begin
    execute format(
      'explain insert into public.leden (club_id, gebruiker_id, naam, rol)
       values (%L, %L, %L, %L)',
      club, proefpersoon, 'Controle', 'kijker');

    execute format(
      'explain delete from public.leden where club_id = %L and gebruiker_id = %L',
      club, proefpersoon);

    raise notice 'OK: leden accepteert insert en delete';
  exception when others then
    raise notice 'STUK: %', sqlerrm;
  end;

  reset role;
end
$ctrl$;

-- ══════════════════════════════════════════════════════════════
--  CONTROLE 4 — kan een eigenaar zijn vereniging opheffen?
--  ─────────────────────────────────────────────────────────────
--  Hoort bij server/08-bewaartermijn.sql. Draai je die nog niet,
--  dan hoort hier "STUK" te staan; dat is dan geen verrassing.
--
--  Deze controle is nodig omdat een ontbrekende regel voor "delete"
--  zich niet als fout gedraagt: de database gooit er dan nul weg en
--  PostgREST maakt daar een keurige 204 ("gelukt") van. De app merkt
--  dus niets. Wat je hier meet is niet of het lukt, maar of de
--  database überhaupt iets van plan is.
--
--  Er wordt niets verwijderd: door "explain" maakt Postgres wel het
--  volledige plan — inclusief alle beveiligingsregels — maar voert
--  hij het niet uit.
--
--  Wat je hoort te zien, onderin het resultaatvenster of onder
--  "Messages":
--
--      OK: clubs heeft een regel voor weggooien en die vraagt het
--      aan is_eigenaar
-- ══════════════════════════════════════════════════════════════
do $ctrl4$
declare
  eigenaar_id uuid;
  club        uuid;
  voorwaarde  text;
begin
  select pg_get_expr(polqual, polrelid) into voorwaarde
  from pg_policy where polrelid = 'public.clubs'::regclass and polcmd = 'd' limit 1;

  if voorwaarde is null then
    raise notice 'STUK: er is geen regel voor weggooien op clubs. Een vereniging opheffen doet niets, maar meldt wel "gelukt". Draai server/08-bewaartermijn.sql.';
    return;
  end if;

  if voorwaarde not like '%is_eigenaar%' then
    raise notice 'LET OP: de regel op clubs gebruikt niet is_eigenaar() maar: %', voorwaarde;
  end if;

  select gebruiker_id, club_id into eigenaar_id, club
  from public.leden where rol = 'eigenaar' limit 1;

  if eigenaar_id is null then
    raise notice 'HALF: de regel staat er (%), maar er is nog geen eigenaar om het mee te proberen.', voorwaarde;
    return;
  end if;

  perform set_config('request.jwt.claim.sub', eigenaar_id::text, true);
  set local role authenticated;
  begin
    execute format('explain delete from public.clubs where id = %L', club);
    raise notice 'OK: clubs heeft een regel voor weggooien en die vraagt het aan is_eigenaar';
  exception when others then
    raise notice 'STUK: %', sqlerrm;
  end;
  reset role;
end
$ctrl4$;
