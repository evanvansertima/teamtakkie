-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — controle: staat de beveiliging echt aan?
--  ─────────────────────────────────────────────────────────────
--  Plak dit in de SQL Editor en klik op Run. Er staan vier
--  controles in dit bestand, onder elkaar.
--
--  WAAR JE KIJKT
--  Onderin het scherm zit het vak "Results". Daar verschijnt de
--  tabel van de LAATSTE vraag die dit bestand stelt — en dat is met
--  opzet het eindoverzicht helemaal onderaan dit bestand, waarin de
--  uitkomst van alle vier de controles in gewone taal onder elkaar
--  staat. Eén tabel, vier regels: dat is wat je moet lezen.
--
--  (Eerder stond hier dat de laatste twee controles zich melden
--  onder een tabblad "Messages". Dat tabblad is in de
--  Supabase-editor niet te vinden, en daarom staat hun uitkomst nu
--  ook gewoon in dat eindoverzicht.)
--
--  De eerste twee controles hieronder geven elk ook nog hun eigen
--  tabel terug, met alle details. Die zijn nuttig als het
--  eindoverzicht ergens "STUK" zegt: dan zoek je daarin op welke
--  tabel of welke regel het misgaat. Sommige editors tonen alleen de
--  laatste tabel; zie je ze niet, dan is dat geen storing.
--
--  In de eerste tabel hoort bij elke regel beveiliging_aan op "true"
--  te staan en aantal_regels minstens 1 te zijn.
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
--  Wat je hoort te zien, in het eindoverzicht onderaan dit bestand,
--  op de regel "CONTROLE 3":
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
  melding     text;
begin
  -- Eerst leegmaken: zo kan een uitkomst van een vorige keer nooit
  -- blijven staan en voor de uitkomst van nu worden aangezien.
  perform set_config('teamtakkie.controle_leden', '', false);

  select gebruiker_id, club_id into eigenaar_id, club
  from public.leden where rol = 'eigenaar' limit 1;

  if eigenaar_id is null then
    melding := 'OVERGESLAGEN: er is nog geen enkele eigenaar in leden.';
  else
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

      melding := 'OK: leden accepteert insert en delete';
    exception when others then
      melding := 'STUK: ' || sqlerrm;
    end;

    reset role;
  end if;

  -- De uitkomst wordt hier ook in een sessievariabele gezet, zodat
  -- het eindoverzicht onderaan dit bestand hem in een gewone tabel
  -- kan laten zien. Een blok als dit kan zelf geen tabel teruggeven,
  -- en een melding die alleen in het logboek staat leest niemand.
  -- Dit is dezelfde soort variabele als request.jwt.claim.sub
  -- hierboven: hij hoort bij je verbinding, niet bij de database, en
  -- verdwijnt vanzelf zodra je het venster sluit.
  perform set_config('teamtakkie.controle_leden', melding, false);
  raise notice '%', melding;
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
--  Wat je hoort te zien, in het eindoverzicht onderaan dit bestand,
--  op de regel "CONTROLE 4":
--
--      OK: clubs heeft een regel voor weggooien en die vraagt het
--      aan is_eigenaar
-- ══════════════════════════════════════════════════════════════
do $ctrl4$
declare
  eigenaar_id uuid;
  club        uuid;
  voorwaarde  text;
  melding     text;
begin
  -- Zelfde reden als bij controle 3: eerst leegmaken.
  perform set_config('teamtakkie.controle_clubs', '', false);

  select pg_get_expr(polqual, polrelid) into voorwaarde
  from pg_policy where polrelid = 'public.clubs'::regclass and polcmd = 'd' limit 1;

  if voorwaarde is null then
    melding := 'STUK: er is geen regel voor weggooien op clubs. Een vereniging opheffen doet niets, maar meldt wel "gelukt". Draai server/08-bewaartermijn.sql.';
  else
    if voorwaarde not like '%is_eigenaar%' then
      -- Geen eindoordeel, maar wel iets om te weten: de proef
      -- hieronder gaat gewoon door.
      raise notice 'LET OP: de regel op clubs gebruikt niet is_eigenaar() maar: %', voorwaarde;
    end if;

    select gebruiker_id, club_id into eigenaar_id, club
    from public.leden where rol = 'eigenaar' limit 1;

    if eigenaar_id is null then
      melding := 'HALF: de regel staat er (' || voorwaarde || '), maar er is nog geen eigenaar om het mee te proberen.';
    else
      perform set_config('request.jwt.claim.sub', eigenaar_id::text, true);
      set local role authenticated;
      begin
        execute format('explain delete from public.clubs where id = %L', club);
        melding := 'OK: clubs heeft een regel voor weggooien en die vraagt het aan is_eigenaar';
      exception when others then
        melding := 'STUK: ' || sqlerrm;
      end;
      reset role;
    end if;
  end if;

  -- Zelfde reden als bij controle 3: de uitkomst moet in een tabel
  -- terechtkomen, want het logboek leest niemand.
  perform set_config('teamtakkie.controle_clubs', melding, false);
  raise notice '%', melding;
end
$ctrl4$;


-- ══════════════════════════════════════════════════════════════
--  HET EINDOVERZICHT — dit is wat je leest
--  ─────────────────────────────────────────────────────────────
--  Eén tabel met de uitkomst van alle vier de controles onder
--  elkaar. Hij staat helemaal onderaan omdat de SQL-editor het
--  resultaat van de laatste vraag laat zien: zo is dit gegarandeerd
--  de tabel die je in beeld krijgt.
--
--  In de kolom "oordeel" hoort overal "in orde" te staan. Staat er
--  "STUK", lees dan de kolom "uitkomst" — daar staat wat er mis is.
--  Staat er "niet te meten", dan is er nog te weinig in de database
--  om de proef te doen (meestal: nog geen enkele vereniging
--  aangemaakt). Dat is geen fout, maar ook geen groen licht.
--
--  Dit stuk leest alleen; het verandert niets.
-- ══════════════════════════════════════════════════════════════
with
-- Dezelfde vraag als controle 1, maar opgeteld in plaats van per
-- tabel: bij hoeveel tabellen staat de beveiliging uit, en hoeveel
-- tabellen hebben geen enkele regel?
tabellen as (
  select count(*) as totaal,
         count(*) filter (where not c.relrowsecurity) as zonder_rls,
         count(*) filter (where (select count(*) from pg_policy p
                                 where p.polrelid = c.oid) = 0) as zonder_regels
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),

-- Dezelfde vraag als controle 2, maar geteld: hoeveel regels kijken
-- in hun eigen tabel? Elke regel die dat doet, loopt vast met
-- "infinite recursion" zodra iemand die tabel gebruikt.
recursie as (
  select count(*) filter (
           where coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')
                 ~* ('(from|join)[[:space:]]+(public\.)?' || p.tablename || '\M')
         ) as kapot
  from pg_policies p
  where p.schemaname = 'public'
),

-- De twee meldingen die de blokken hierboven hebben achtergelaten.
-- current_setting(..., true) geeft leeg terug in plaats van een
-- foutmelding als de variabele er niet is — dat gebeurt alleen als
-- je dit stuk los draait zonder de rest van het bestand.
proeven as (
  select coalesce(nullif(current_setting('teamtakkie.controle_leden', true), ''),
                  'niet gedraaid — draai dit hele bestand in één keer') as leden,
         coalesce(nullif(current_setting('teamtakkie.controle_clubs', true), ''),
                  'niet gedraaid — draai dit hele bestand in één keer') as clubs
),

regels as (
  select 1 as nr,
         'CONTROLE 1 — de beveiliging (RLS) staat aan bij elke tabel' as controle,
         case when t.zonder_rls = 0 then 'ja, bij alle ' || t.totaal || ' tabellen'
              else 'NEE — bij ' || t.zonder_rls || ' van de ' || t.totaal
                   || ' tabellen staat hij uit' end as uitkomst,
         case when t.zonder_rls = 0 then 'in orde' else 'STUK' end as oordeel
  from tabellen t
  union all
  select 2, 'CONTROLE 1 — elke tabel heeft minstens één regel',
         case when t.zonder_regels = 0 then 'ja, bij alle ' || t.totaal || ' tabellen'
              else 'NEE — ' || t.zonder_regels || ' tabellen hebben er geen enkele' end,
         case when t.zonder_regels = 0 then 'in orde' else 'STUK' end
  from tabellen t
  union all
  select 3, 'CONTROLE 2 — geen enkele regel kijkt in zijn eigen tabel',
         case when r.kapot = 0 then 'klopt, geen enkele'
              else 'NEE — ' || r.kapot
                   || case when r.kapot = 1 then ' regel doet' else ' regels doen' end
                   || ' dat wel (infinite recursion)' end,
         case when r.kapot = 0 then 'in orde' else 'STUK' end
  from recursie r
  union all
  select 4, 'CONTROLE 3 — leden accepteert een insert en een delete',
         p.leden,
         case when p.leden like 'OK%' then 'in orde'
              when p.leden like 'STUK%' then 'STUK'
              else 'niet te meten' end
  from proeven p
  union all
  select 5, 'CONTROLE 4 — een eigenaar kan zijn vereniging opheffen',
         p.clubs,
         case when p.clubs like 'OK%' then 'in orde'
              when p.clubs like 'STUK%' then 'STUK'
              else 'niet te meten' end
  from proeven p
)
select controle, uitkomst, oordeel from regels order by nr;
