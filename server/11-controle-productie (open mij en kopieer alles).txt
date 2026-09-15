-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — staan de drie reparaties er echt op?
--  ─────────────────────────────────────────────────────────────
--  Plak dit hele bestand in de SQL Editor van Supabase en klik op
--  Run. Het duurt minder dan een seconde.
--
--  DIT BESTAND VERANDERT NIETS. Het kijkt alleen. Er wordt niets
--  aangemaakt, niets aangepast, niets weggegooid — geen tabel, geen
--  regel, geen functie, geen enkele rij van jou. Je kunt het zo vaak
--  draaien als je wilt, ook midden op een drukke zaterdag, en er is
--  dus ook niets aan terug te draaien.
--
--  WAAROM DIT BESTAND BESTAAT
--  Er liggen drie losse reparaties in de map server:
--
--    04-leden-fix.sql        repareert de twee regels op leden die
--                            vastliepen met "infinite recursion"
--    06-pakketten.sql        zet het aanmaken van verenigingen dicht
--                            en zet de prijslijst in de database
--    10-laatste-eigenaar.sql houdt tegen dat de laatste eigenaar
--                            zichzelf uit zijn vereniging haalt
--
--  Van elk van die drie staat ergens in een commit-bericht of in een
--  notitie dát hij gedraaid is. Alleen: een commit-bericht is niet de
--  database. De enige manier om zeker te weten wat er op de echte
--  server staat, is het de database zelf vragen. Dat doet dit bestand
--  voor alle drie tegelijk, zodat je niet drie bestanden hoeft te
--  openen om één vraag te beantwoorden.
--
--  Het is geen nieuwe controle: het zijn de controleblokken die al
--  onderaan 04, 06 en 10 stonden, hier bij elkaar gezet in één
--  overzicht. Hetzelfde antwoord, op één plek.
--
--  WAT JE HOORT TE ZIEN
--  Eén tabel met vier kolommen: reparatie, controle, gevonden en
--  oordeel. In de kolom "oordeel" hoort overal "in orde" te staan en
--  nergens "LET OP".
--
--  Onderaan die tabel staan drie regels met SAMENVATTING ervoor —
--  één per reparatie. Daar lees je in één oogopslag of een reparatie
--  helemaal gedraaid is of niet.
--
--  Daarna volgt onder "Messages" nog een klein lijstje met de
--  pakketten die in de database staan. Staat pakket_grenzen er nog
--  niet, dan zegt hij dat gewoon; hij loopt er niet op stuk.
--
--  ALS ER "LET OP" STAAT
--  Dan is die reparatie op deze database nog niet (of niet helemaal)
--  gedraaid. Kijk in de kolom "reparatie" welk bestand erbij hoort,
--  draai dát bestand uit de map server alsnog, en draai dit bestand
--  daarna nog een keer. Twee keer draaien kan bij alle drie geen
--  kwaad.
--
--  Eén uitzondering om te weten: staat bij reparatie 10 "LET OP"
--  terwijl 04 en 06 in orde zijn, dan is dat precies de situatie die
--  in LEES-MIJ-VOOR-JE-IETS-DRAAIT.md beschreven staat — 10 is de
--  nieuwste van de drie en kan simpelweg nog niet gedraaid zijn.
--
--  NOG IETS OM TE WETEN BIJ REPARATIE 04
--  De reparatie uit 04-leden-fix.sql staat inmiddels ook gewoon in
--  01-schema.sql zelf. Staat reparatie 04 hier op "in orde", dan
--  betekent dat dus: de regels zijn goed — niet per se dat je ooit
--  04-leden-fix.sql hebt gedraaid. Voor de database maakt dat niets
--  uit; het gaat om wat er staat, niet om hoe het er is gekomen.
--
--  LET OP BIJ HET LEZEN
--  Dit bestand controleert of de regels en functies er stáán, niet
--  of ze zich in de praktijk gedragen. Dat laatste doen de twee
--  testbestanden, en die schrijven wél (ze ruimen zichzelf daarna
--  op):
--    tests/leden-policy.test.sql    twaalf scenario's op leden
--    tests/bewaartermijn.test.sql   twaalf scenario's op wissen
--  Dit bestand is bedoeld om te kijken zonder iets aan te raken.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  HET OVERZICHT
--  ─────────────────────────────────────────────────────────────
--  Alles hieronder leest uitsluitend in de systeemkaartenbak van
--  Postgres (pg_policy, pg_proc, pg_trigger, pg_class): de plek waar
--  de database zelf bijhoudt welke regels en functies er zijn. Er
--  wordt geen enkele tabel van jou aangeraakt.
--
--  Elke tabelnaam gaat door to_regclass(). Die geeft niets terug in
--  plaats van een foutmelding als een tabel nog niet bestaat. Dat is
--  hier het hele punt: dit bestand moet ook een antwoord kunnen geven
--  op een database waar 06 nog nooit gedraaid heeft.
-- ══════════════════════════════════════════════════════════════
with

-- De regels op leden, met hun voorwaarden als leesbare tekst.
-- polcmd 'a' is toevoegen (insert), 'd' is weghalen (delete).
regels_leden as (
  select polcmd,
         polname,
         coalesce(pg_get_expr(polqual, polrelid), '')      as using_tekst,
         coalesce(pg_get_expr(polwithcheck, polrelid), '') as check_tekst
  from pg_policy
  where polrelid = to_regclass('public.leden')::oid
),

-- De regel die het aanmaken van verenigingen toestaat. Na
-- 06-pakketten.sql hoort hier niets meer te staan: geen insert-regel
-- betekent dat de database elke rechtstreekse insert op clubs
-- weigert. Aanmaken loopt dan alleen nog via nieuwe_club().
regel_clubs_maken as (
  select polname,
         coalesce(pg_get_expr(polwithcheck, polrelid), '') as check_tekst
  from pg_policy
  where polrelid = to_regclass('public.clubs')::oid
    and polcmd = 'a'
),

-- Alle functies in het schema public, met de vraag of ze security
-- definer zijn (prosecdef) en met hun broncode (prosrc).
functies as (
  select p.proname, p.prosecdef, p.prosrc
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),

-- Alle losse feiten in één keer opgehaald. Daarna hoeft elke
-- controle hieronder alleen nog maar "ja of nee" te zeggen; de
-- vraag zelf staat dan op precies één plek.
feiten as (
  select
    -- reparatie 04 — de twee regels op leden
    (select count(*) from regels_leden where polcmd = 'a') > 0 as leden_ins_bestaat,
    (select count(*) from regels_leden where polcmd = 'd') > 0 as leden_del_bestaat,
    coalesce((select using_tekst || ' ' || check_tekst from regels_leden
              where polcmd = 'a' limit 1), '')                 as leden_ins_tekst,
    coalesce((select using_tekst || ' ' || check_tekst from regels_leden
              where polcmd = 'd' limit 1), '')                 as leden_del_tekst,

    -- reparatie 06 — clubs, prijslijst en de twee bewakers
    (select polname     from regel_clubs_maken limit 1)        as clubs_ins_naam,
    (select check_tekst from regel_clubs_maken limit 1)        as clubs_ins_tekst,
    to_regclass('public.clubs')               is not null      as tabel_clubs,
    to_regclass('public.pakket_grenzen')      is not null      as tabel_grenzen,
    to_regclass('public.pakket_instellingen') is not null      as tabel_instellingen,
    coalesce((select prosrc from functies where proname = 'nieuwe_club' limit 1), '')
                                                               as nieuwe_club_code,
    exists (select 1 from pg_trigger
            where tgrelid = to_regclass('public.teams')::oid
              and tgname  = 'teams_teamlimiet')                as bewaker_teams,
    exists (select 1 from pg_trigger
            where tgrelid = to_regclass('public.gegevens')::oid
              and tgname  = 'gegevens_grenzen')                as bewaker_gegevens,

    -- de hulpfuncties uit 04, 06 en 10
    exists (select 1 from functies where proname = 'is_eigenaar')               as fn_is_eigenaar,
    exists (select 1 from functies where proname = 'is_eigenaar' and prosecdef) as fn_is_eigenaar_sd,
    exists (select 1 from functies where proname = 'pakket_van_club')           as fn_pakket_van_club,
    exists (select 1 from functies where proname = 'teams_grens')               as fn_teams_grens,
    exists (select 1 from functies where proname = 'is_laatste_eigenaar')               as fn_laatste,
    exists (select 1 from functies where proname = 'is_laatste_eigenaar' and prosecdef) as fn_laatste_sd,
    exists (select 1 from functies where proname = 'verlaat_club')              as fn_verlaat_club
),

-- Eén regel per controle. "goed" is waar of onwaar; daar rolt de
-- kolom oordeel straks uit. Het nummer bepaalt alleen de volgorde
-- en komt zelf niet in beeld.
controles as (

  -- ── 04-leden-fix.sql ──────────────────────────────────────
  select 101 as nr, '04 — ledenregels' as reparatie,
         'er is een regel om iemand toe te voegen' as controle,
         case when f.leden_ins_bestaat then 'ja' else 'nee' end as gevonden,
         f.leden_ins_bestaat as goed
  from feiten f
  union all
  -- Dit is de kern van 04: een regel óp leden die ín leden kijkt
  -- laat Postgres vastlopen met "infinite recursion detected in
  -- policy for relation leden". De zoekterm hieronder is dezelfde
  -- als die in 04-leden-fix.sql: hij zoekt naar "from leden" of
  -- "join leden" in de voorwaarde van de regel.
  select 102, '04 — ledenregels',
         'die regel kijkt niet in leden zelf (anders: infinite recursion)',
         case when not f.leden_ins_bestaat then 'er is geen regel om te beoordelen'
              when f.leden_ins_tekst ~* '(from|join)[[:space:]]+(public\.)?leden\M'
              then 'JA, hij kijkt in leden zelf' else 'nee, hij kijkt er buitenom' end,
         f.leden_ins_bestaat
           and not (f.leden_ins_tekst ~* '(from|join)[[:space:]]+(public\.)?leden\M')
  from feiten f
  union all
  select 103, '04 — ledenregels',
         'die regel stelt de vraag via is_eigenaar()',
         case when f.leden_ins_tekst like '%is_eigenaar%' then 'ja' else 'nee' end,
         f.leden_ins_tekst like '%is_eigenaar%'
  from feiten f
  union all
  select 104, '04 — ledenregels',
         'er is een regel om iemand weg te halen',
         case when f.leden_del_bestaat then 'ja' else 'nee' end,
         f.leden_del_bestaat
  from feiten f
  union all
  select 105, '04 — ledenregels',
         'ook die regel kijkt niet in leden zelf',
         case when not f.leden_del_bestaat then 'er is geen regel om te beoordelen'
              when f.leden_del_tekst ~* '(from|join)[[:space:]]+(public\.)?leden\M'
              then 'JA, hij kijkt in leden zelf' else 'nee, hij kijkt er buitenom' end,
         f.leden_del_bestaat
           and not (f.leden_del_tekst ~* '(from|join)[[:space:]]+(public\.)?leden\M')
  from feiten f
  union all
  select 106, '04 — ledenregels',
         'de hulpfunctie is_eigenaar bestaat',
         case when f.fn_is_eigenaar then 'ja' else 'nee' end,
         f.fn_is_eigenaar
  from feiten f
  union all
  -- security definer is wat de kring verbreekt: binnen de functie
  -- gelden de regels op leden niet. Zonder dat is de recursie terug.
  select 107, '04 — ledenregels',
         'die hulpfunctie is security definer',
         case when f.fn_is_eigenaar_sd then 'ja' else 'nee' end,
         f.fn_is_eigenaar_sd
  from feiten f

  -- ── 06-pakketten.sql ──────────────────────────────────────
  union all
  -- Let op de richting: hier is "geen" het goede antwoord. Staat er
  -- nog wél een insert-regel op clubs, dan mag iedereen met de
  -- publieke sleutel uit de app onbeperkt verenigingen wegschrijven
  -- — ook een bezoeker zonder account.
  --
  -- "Geen regel" is hier alleen goed nieuws als de tabel clubs
  -- überhaupt bestaat. Zonder die extra vraag zou deze controle op
  -- een lege database "in orde" melden, en dat is precies het soort
  -- groen vinkje dat niets controleert.
  select 201, '06 — pakketten',
         'clubs: er is géén regel meer die het aanmaken openzet',
         case when not f.tabel_clubs then 'de tabel clubs bestaat hier niet — is 01-schema.sql wel gedraaid?'
              when f.clubs_ins_naam is null then 'geen insert-regel (goed)'
              else f.clubs_ins_naam || ' staat er nog: with check ' || f.clubs_ins_tekst end,
         f.tabel_clubs and f.clubs_ins_naam is null
  from feiten f
  union all
  select 202, '06 — pakketten',
         'de tabel pakket_grenzen bestaat',
         case when f.tabel_grenzen then 'ja' else 'nee' end,
         f.tabel_grenzen
  from feiten f
  union all
  select 203, '06 — pakketten',
         'de tabel pakket_instellingen bestaat',
         case when f.tabel_instellingen then 'ja' else 'nee' end,
         f.tabel_instellingen
  from feiten f
  union all
  select 204, '06 — pakketten',
         'de functie pakket_van_club bestaat',
         case when f.fn_pakket_van_club then 'ja' else 'nee' end,
         f.fn_pakket_van_club
  from feiten f
  union all
  select 205, '06 — pakketten',
         'de functie teams_grens bestaat',
         case when f.fn_teams_grens then 'ja' else 'nee' end,
         f.fn_teams_grens
  from feiten f
  union all
  -- De rem van drie verenigingen per persoon zit in de functie
  -- nieuwe_club() zelf. Staat die er niet in, dan kan iemand mét
  -- account de functie duizend keer aanroepen.
  select 206, '06 — pakketten',
         'de rem op nieuwe_club zit erin (clubs_per_gebruiker)',
         case when f.nieuwe_club_code like '%clubs_per_gebruiker%' then 'ja' else 'nee' end,
         f.nieuwe_club_code like '%clubs_per_gebruiker%'
  from feiten f
  union all
  select 207, '06 — pakketten',
         'de bewaker op teams staat aan (teams_teamlimiet)',
         case when f.bewaker_teams then 'ja' else 'nee' end,
         f.bewaker_teams
  from feiten f
  union all
  select 208, '06 — pakketten',
         'de bewaker op gegevens staat aan (gegevens_grenzen)',
         case when f.bewaker_gegevens then 'ja' else 'nee' end,
         f.bewaker_gegevens
  from feiten f

  -- ── 10-laatste-eigenaar.sql ───────────────────────────────
  union all
  select 301, '10 — laatste eigenaar',
         'de regel voor weghalen houdt de laatste eigenaar tegen',
         case when f.leden_del_tekst like '%is_laatste_eigenaar%' then 'ja' else 'nee' end,
         f.leden_del_tekst like '%is_laatste_eigenaar%'
  from feiten f
  union all
  -- Even belangrijk als de rem zelf: jezelf uit een vereniging
  -- terugtrekken moet gewoon mogelijk blijven. Zou die tak weg zijn,
  -- dan zit iedere trainer die stopt vast aan zijn club.
  select 302, '10 — laatste eigenaar',
         'jezelf terugtrekken kan nog steeds',
         case when f.leden_del_tekst like '%uid()%' then 'ja' else 'nee' end,
         f.leden_del_tekst like '%uid()%'
  from feiten f
  union all
  select 303, '10 — laatste eigenaar',
         'de hulpfunctie is_laatste_eigenaar bestaat',
         case when f.fn_laatste then 'ja' else 'nee' end,
         f.fn_laatste
  from feiten f
  union all
  select 304, '10 — laatste eigenaar',
         'die hulpfunctie is security definer',
         case when f.fn_laatste_sd then 'ja' else 'nee' end,
         f.fn_laatste_sd
  from feiten f
  union all
  -- verlaat_club() bestaat omdat een geweigerde verwijdering geen
  -- foutmelding geeft maar "0 rijen verwijderd". Zonder die functie
  -- meldt de app "gelukt" terwijl er niets is gebeurd.
  select 305, '10 — laatste eigenaar',
         'verlaat_club() staat klaar voor de app',
         case when f.fn_verlaat_club then 'ja' else 'nee' end,
         f.fn_verlaat_club
  from feiten f
)

select reparatie, controle, gevonden, oordeel
from (
  select nr, reparatie, controle, gevonden,
         case when goed then 'in orde' else 'LET OP' end as oordeel
  from controles

  union all

  -- De drie samenvattingsregels, opgeteld uit precies dezelfde
  -- controles als hierboven. Ze staan onderaan (nummer 900+).
  select 900 + min(nr),
         'SAMENVATTING',
         reparatie,
         case when count(*) filter (where not goed) = 0
              then 'alle ' || count(*) || ' controles in orde — dit bestand is gedraaid'
              else count(*) filter (where not goed) || ' van de ' || count(*)
                   || case when count(*) filter (where not goed) = 1
                           then ' controles staat open'
                           else ' controles staan open' end
                   || ' — draai dit bestand alsnog'
         end,
         case when count(*) filter (where not goed) = 0 then 'in orde' else 'LET OP' end
  from controles
  group by reparatie
) t
order by t.nr;


-- ══════════════════════════════════════════════════════════════
--  EXTRA — welke pakketten staan er in de database?
--  ─────────────────────────────────────────────────────────────
--  Dit hoort onder "Messages" te verschijnen, niet als tabel. Dat is
--  met opzet: rechtstreeks uit pakket_grenzen lezen zou een harde
--  foutmelding geven op een database waar 06 nog niet gedraaid is,
--  en dan zie je de tabel hierboven ook niet meer. Zo blijft dit
--  bestand overal leesbaar.
--
--  Je hoort drie pakketten te zien: free (1 team), coach (1 team) en
--  club (onbeperkt). Zie je nog basic, pro of max, dan is 06 maar
--  half gedraaid — die oude namen hoorden om te gaan naar coach en
--  club.
--
--  Ook dit stuk leest alleen.
-- ══════════════════════════════════════════════════════════════
do $kijk$
declare
  r record;
begin
  if to_regclass('public.pakket_grenzen') is null then
    raise notice 'pakket_grenzen bestaat nog niet — 06-pakketten.sql is hier nooit gedraaid.';
    return;
  end if;

  for r in execute
    'select pakket, coalesce(teams::text, ''onbeperkt'') as teams,
            array_to_string(modules, '' '') as modules
     from public.pakket_grenzen order by pakket'
  loop
    raise notice 'pakket % — % team(s) — onderdelen: %', r.pakket, r.teams, r.modules;
  end loop;
end
$kijk$;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Niet nodig. Dit bestand heeft niets veranderd, dus er is ook
--  niets om terug te zetten.
--
--  Wil je andersom bewijzen dát deze controle iets vangt: draai het
--  stukje "TERUGDRAAIEN" onderaan 10-laatste-eigenaar.sql en draai
--  dit bestand daarna opnieuw. De drie regels van reparatie 10
--  springen dan op "LET OP". Draai daarna 10-laatste-eigenaar.sql
--  weer helemaal, dan staat alles terug. Een controle die nooit rood
--  wordt, controleert niets.
-- ══════════════════════════════════════════════════════════════
