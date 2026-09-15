-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — reparatie: leden toevoegen en weghalen
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná 01-schema.sql. Plak alles in de SQL Editor van
--  Supabase en klik op Run. Het duurt een seconde.
--
--  WAT ER MIS WAS
--  De twee regels die bepalen wie een lid mag toevoegen of weghalen
--  keken zelf in de tabel leden. Postgres gaat dan in een kring
--  rond en stopt met de melding "infinite recursion detected in
--  policy for relation leden". Gevolg: élke poging om iemand aan
--  een club toe te voegen of eruit te halen mislukte. Dat is nooit
--  opgevallen omdat de app nu nog niet in die tabel schrijft — maar
--  uitnodigingen kunnen zo nooit werken.
--
--  WAT DIT BESTAND DOET
--  1. Het zet er een hulpfunctie is_eigenaar() naast, die de vraag
--     "ben ik eigenaar van deze club?" buiten de regels om stelt.
--     Daarmee is de kring verbroken.
--  2. Het vervangt beide regels door een versie die die functie
--     gebruikt.
--
--  ÉÉN DING VERANDERT ER BEWUST AAN DE RECHTEN
--  In de oude regel stond ook "of je voegt jezelf toe". Die tak was
--  onbereikbaar doordat de recursie er eerder in klapte. Zou je hem
--  laten staan, dan werd hij nu ineens actief — en dan kan iemand
--  zichzelf tot eigenaar promoveren, of zichzelf bij een vreemde
--  club naar binnen schrijven als hij het clubnummer kent. Die tak
--  gaat er daarom bij toevoegen uit.
--
--  Bij weghalen blijft hij wél staan: jezelf uit een club terug-
--  trekken mag, en dat geeft je geen rechten die je nog niet had.
--
--  Er gaat niets verloren. Een club oprichten loopt via de functie
--  nieuwe_club(), en die zet jou als eigenaar neer langs deze regels
--  heen. Dat blijft werken.
--
--  WAT JE DAARNA HOORT TE ZIEN
--  Onderaan dit bestand staan twee controles, en daarna een klein
--  eindoverzicht dat hun uitkomst samenvat. Dat eindoverzicht is de
--  tabel die je onderin het scherm in "Results" krijgt te zien, en
--  daar hoort te staan:
--
--    CONTROLE 1 — geen enkele regel kijkt in zijn eigen tabel
--                 klopt, geen enkele                      in orde
--    CONTROLE 2 — leden accepteert een insert en een delete
--                 OK: leden accepteert insert en delete   in orde
--
--  (Eerder stond hier dat die tweede melding onder een tabblad
--  "Messages" zou staan. Dat tabblad is in de Supabase-editor niet
--  te vinden; daarom staat de uitkomst nu in de tabel zelf.)
--
--  Controle 1 geeft daarvóór ook nog zijn eigen, uitgebreide tabel
--  terug met álle regels erin. Die is handig om in te zoeken als het
--  eindoverzicht "STUK" zegt. Sommige editors tonen alleen de
--  laatste tabel; zie je hem niet, dan is dat geen storing.
--
--  Zie je in plaats daarvan "STUK", dan is er iets misgegaan en
--  verandert er verder niets aan je gegevens: je kunt het gerust
--  nog een keer draaien.
--
--  Er worden geen gegevens aangepast, toegevoegd of verwijderd.
--  Alleen de regels zelf gaan op de schop.
--
--  TERUGDRAAIEN
--  Helemaal onderaan staat de oude situatie klaar, uitgecommen-
--  tarieerd. Let op: daarmee zet je ook de recursie weer terug en
--  is leden weer stuk. Dat is alleen bedoeld om te kunnen bewijzen
--  dat deze reparatie echt iets doet.
-- ══════════════════════════════════════════════════════════════

-- ── 1. De hulpfunctie ────────────────────────────────────────
--  security definer betekent: binnen deze functie gelden de regels
--  op leden niet. Dat is precies wat de kring verbreekt. De functie
--  geeft alleen true of false terug en lekt dus geen gegevens.
create or replace function public.is_eigenaar(doel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leden
    where gebruiker_id = auth.uid()
      and club_id = doel
      and rol = 'eigenaar'
  )
$$;

grant execute on function public.is_eigenaar(uuid) to authenticated;

-- ── 2. De twee regels vervangen ──────────────────────────────
drop policy if exists leden_toevoegen on public.leden;
create policy leden_toevoegen on public.leden for insert
  with check (public.is_eigenaar(club_id));

drop policy if exists leden_weghalen on public.leden;
create policy leden_weghalen on public.leden for delete
  using (gebruiker_id = auth.uid() or public.is_eigenaar(club_id));

-- ══════════════════════════════════════════════════════════════
--  CONTROLE 1 — staat er nergens meer een regel die in zijn
--  eigen tabel kijkt?
--
--  Je hoort in de kolom oordeel overal "in orde" te zien. De vier
--  regels op gegevens kijken in de tabel teams; dat is een andere
--  tabel en dus gezond.
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
--  CONTROLE 2 — doet leden het nu echt?
--
--  Dit doet alsof het een bestaande eigenaar is en laat Postgres
--  een insert en een delete volledig uitwerken, zonder ze uit te
--  voeren (dat is wat "explain" doet). Er verandert dus niets aan
--  je gegevens.
--
--  Je hoort in het eindoverzicht hieronder te lezen:
--      OK: leden accepteert insert en delete
-- ══════════════════════════════════════════════════════════════
do $ctrl$
declare
  eigenaar_id  uuid;
  club         uuid;
  proefpersoon uuid := gen_random_uuid();
  melding      text;
begin
  -- Eerst leegmaken: zo kan een uitkomst van een vorige keer nooit
  -- blijven staan en voor de uitkomst van nu worden aangezien.
  perform set_config('teamtakkie.controle_leden', '', false);

  select gebruiker_id, club_id into eigenaar_id, club
  from public.leden where rol = 'eigenaar' limit 1;

  if eigenaar_id is null then
    melding := 'OVERGESLAGEN: er is nog geen enkele eigenaar in leden.';
  else
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

  -- De uitkomst gaat ook in een sessievariabele, zodat het
  -- eindoverzicht hieronder hem in een gewone tabel kan tonen. Een
  -- blok als dit kan zelf geen tabel teruggeven, en een melding die
  -- alleen in het logboek staat leest niemand. Dit is dezelfde soort
  -- variabele als request.jwt.claim.sub hierboven: hij hoort bij je
  -- verbinding, niet bij de database, en verdwijnt vanzelf zodra je
  -- het venster sluit.
  perform set_config('teamtakkie.controle_leden', melding, false);
  raise notice '%', melding;
end
$ctrl$;


-- ══════════════════════════════════════════════════════════════
--  HET EINDOVERZICHT — dit is wat je leest
--  ─────────────────────────────────────────────────────────────
--  De uitkomst van beide controles in één tabel. Hij staat hier,
--  vóór het terugdraai-stuk, omdat de SQL-editor het resultaat van
--  de laatste vraag laat zien: zo is dit gegarandeerd de tabel die
--  je in beeld krijgt.
--
--  In de kolom "oordeel" hoort twee keer "in orde" te staan. Dit
--  stuk leest alleen; het verandert niets.
-- ══════════════════════════════════════════════════════════════
with
-- Dezelfde vraag als controle 1, maar geteld in plaats van per
-- regel: hoeveel regels kijken in hun eigen tabel?
recursie as (
  select count(*) filter (
           where coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')
                 ~* ('(from|join)[[:space:]]+(public\.)?' || p.tablename || '\M')
         ) as kapot
  from pg_policies p
  where p.schemaname = 'public'
),

-- De melding die controle 2 hierboven heeft achtergelaten.
-- current_setting(..., true) geeft leeg terug in plaats van een
-- foutmelding als de variabele er niet is — dat gebeurt alleen als
-- je dit stuk los draait zonder de rest van het bestand.
proef as (
  select coalesce(nullif(current_setting('teamtakkie.controle_leden', true), ''),
                  'niet gedraaid — draai dit hele bestand in één keer') as leden
),

regels as (
  select 1 as nr,
         'CONTROLE 1 — geen enkele regel kijkt in zijn eigen tabel' as controle,
         case when r.kapot = 0 then 'klopt, geen enkele'
              else 'NEE — ' || r.kapot
                   || case when r.kapot = 1 then ' regel doet' else ' regels doen' end
                   || ' dat wel (infinite recursion)' end as uitkomst,
         case when r.kapot = 0 then 'in orde' else 'STUK' end as oordeel
  from recursie r
  union all
  select 2, 'CONTROLE 2 — leden accepteert een insert en een delete',
         p.leden,
         case when p.leden like 'OK%' then 'in orde'
              when p.leden like 'STUK%' then 'STUK'
              else 'niet te meten' end
  from proef p
)
select controle, uitkomst, oordeel from regels order by nr;

-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Wil je terug naar hoe het was: haal bij de regels hieronder de
--  twee streepjes vooraan weg en draai alleen dat stuk.
--
--  Nogmaals: hiermee is leden weer kapot (infinite recursion) én
--  staat de zelf-toevoegtak er weer in. Doe dit alleen om te
--  controleren dat de reparatie werkt, en draai daarna dit hele
--  bestand opnieuw.
-- ══════════════════════════════════════════════════════════════

-- drop policy if exists leden_toevoegen on public.leden;
-- create policy leden_toevoegen on public.leden for insert
--   with check (
--     gebruiker_id = auth.uid()
--     or exists (select 1 from public.leden l
--                where l.club_id = leden.club_id
--                  and l.gebruiker_id = auth.uid()
--                  and l.rol = 'eigenaar')
--   );
--
-- drop policy if exists leden_weghalen on public.leden;
-- create policy leden_weghalen on public.leden for delete
--   using (
--     gebruiker_id = auth.uid()
--     or exists (select 1 from public.leden l
--                where l.club_id = leden.club_id
--                  and l.gebruiker_id = auth.uid()
--                  and l.rol = 'eigenaar')
--   );
--
-- De hulpfunctie mag blijven staan, die doet uit zichzelf niets.
-- Wil je hem toch weg:
-- drop function if exists public.is_eigenaar(uuid);
