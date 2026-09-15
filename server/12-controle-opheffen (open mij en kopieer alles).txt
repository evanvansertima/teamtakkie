-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — kan een vereniging opgeheven worden?
--  ─────────────────────────────────────────────────────────────
--  Plak dit hele bestand in de SQL Editor van Supabase en klik op
--  Run. Het duurt minder dan een seconde.
--
--  DIT BESTAND VERANDERT NIETS. Het kijkt alleen, net als
--  11-controle-productie.sql. Er wordt niets aangemaakt, niets
--  aangepast, niets weggegooid — geen tabel, geen regel, geen
--  functie, geen enkele rij van jou. Je kunt het zo vaak draaien
--  als je wilt, ook midden op een drukke zaterdag, en er is dus ook
--  niets aan terug te draaien.
--
--  WAAROM DIT BESTAND BESTAAT
--  11-controle-productie.sql keek naar drie reparaties: 04, 06 en
--  10. Er is een vierde die daar niet in stond: 08-bewaartermijn.sql.
--  Dat bestand zet twee dingen klaar die je pas mist op het moment
--  dat je ze nodig hebt:
--
--    wis_speler()      haalt een speler uit ALLE seizoenslijsten
--                      waar hij in staat, niet uit één
--    clubs_weghalen    de regel die een eigenaar toestaat zijn
--                      vereniging echt op te heffen
--
--  Zonder die tweede regel gebeurt er iets vervelends: de database
--  weigert het opheffen niet met een foutmelding, hij gooit er
--  gewoon nul weg. De app krijgt daar een keurig "gelukt" op terug
--  en zegt dat tegen jou. Dat is de naarste soort fout — eentje die
--  zich voordoet als succes.
--
--  Er is nog een tweede reden. Op 15 september bleek uit
--  11-controle-productie.sql dat de hulpfunctie is_eigenaar() NIET
--  op de echte database staat. En juist die functie heeft
--  08-bewaartermijn.sql nodig. Dit bestand kijkt daarom ook of die
--  twee bij elkaar passen.
--
--  WAT JE HOORT TE ZIEN
--  Eén tabel met drie kolommen: controle, gevonden en oordeel.
--  Daaronder, onder het tabblad "Messages", staat de conclusie in
--  gewone taal — één alinea die zegt wat er aan de hand is en wat
--  je eraan zou doen. Begin met die alinea; de tabel is de
--  onderbouwing.
--
--  Het kan zijn dat er "LET OP" staat. Dat is hier geen ramp en
--  geen haast: het betekent dat het opheffen van een vereniging nu
--  niet werkt terwijl de app zegt van wel. Niemand kan er gegevens
--  door zien die hij niet mag zien.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DE FEITEN
--  ─────────────────────────────────────────────────────────────
--  Alles hieronder leest uitsluitend in de systeemkaartenbak van
--  Postgres (pg_policy, pg_proc): de plek waar de database zelf
--  bijhoudt welke regels en functies er zijn. Er wordt geen enkele
--  tabel van jou aangeraakt.
--
--  Net als in 11 gaat elke tabelnaam door to_regclass(). Die geeft
--  niets terug in plaats van een foutmelding als een tabel niet
--  bestaat, zodat dit bestand ook op een halflege database nog een
--  antwoord geeft in plaats van een rode melding.
-- ══════════════════════════════════════════════════════════════
with

-- De regel voor "delete" op clubs — als hij er is. polcmd 'd' is
-- weghalen. pg_get_expr() zet de opgeslagen voorwaarde om in de
-- tekst zoals jij hem zou schrijven.
regel_clubs_weg as (
  select polname,
         coalesce(pg_get_expr(polqual, polrelid), '') as using_tekst
  from pg_policy
  where polrelid = to_regclass('public.clubs')::oid
    and polcmd = 'd'
),

functies as (
  select p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),

-- De hulpfuncties die in dit schema een beveiligingsvraag stellen.
-- Alleen deze namen worden nagekeken, en dat is met opzet: zou je
-- élk woord met haakjes erachter nakijken, dan zou de controle over
-- gewone Postgres-woorden struikelen (exists, coalesce) en rood
-- worden zonder dat er iets aan de hand is. Een controle die om
-- niets alarm slaat, leert je hem te negeren.
hulpfuncties(naam) as (
  values ('is_eigenaar'), ('ben_eigenaar'), ('is_laatste_eigenaar'),
         ('mijn_clubs'),  ('mag_schrijven'), ('is_beheerder'),
         ('pakket_van_club')
),

-- Welke van die hulpfuncties noemt de voorwaarde van de regel?
-- \m en \M zijn woordgrenzen, zodat "is_eigenaar" niet meeliftt op
-- "ben_is_eigenaar_test" of andersom. De naam wordt hier gezocht
-- met én zonder "public." ervoor, want Postgres laat dat voorvoegsel
-- weg als public in het zoekpad staat — en dat is op Supabase zo.
genoemde_functies as (
  select h.naam
  from hulpfuncties h, regel_clubs_weg r
  where r.using_tekst ~* ('\m' || h.naam || '\M')
),

feiten as (
  select
    to_regclass('public.clubs') is not null                       as tabel_clubs,
    (select polname     from regel_clubs_weg limit 1)             as weg_naam,
    (select using_tekst from regel_clubs_weg limit 1)             as weg_tekst,
    exists (select 1 from regel_clubs_weg)                        as weg_bestaat,
    exists (select 1 from functies where proname = 'is_eigenaar')  as fn_is_eigenaar,
    exists (select 1 from functies where proname = 'ben_eigenaar') as fn_ben_eigenaar,
    exists (select 1 from functies where proname = 'wis_speler')   as fn_wis_speler,
    exists (select 1 from functies where proname = 'basis_van_sleutel') as fn_basis,
    coalesce((select string_agg(g.naam, ', ' order by g.naam)
              from genoemde_functies g
              where not exists (select 1 from functies f where f.proname = g.naam)), '')
                                                                  as ontbrekend
),

controles as (

  select 1 as nr,
         'de tabel clubs bestaat' as controle,
         case when f.tabel_clubs then 'ja' else 'nee — is 01-schema.sql wel gedraaid?' end as gevonden,
         f.tabel_clubs as goed
  from feiten f
  union all

  -- Dit is de kernvraag. Geen regel betekent niet "streng", het
  -- betekent "gooit nul weg en meldt gelukt".
  select 2, 'clubs: er is een regel om een vereniging op te heffen',
         case when not f.tabel_clubs then 'er is geen tabel om naar te kijken'
              when f.weg_bestaat then f.weg_naam || ' — using ' || f.weg_tekst
              else 'geen — opheffen doet niets en meldt toch "gelukt"' end,
         f.tabel_clubs and f.weg_bestaat
  from feiten f
  union all

  -- Als de regel er is, mag hij naar niets verwijzen dat ontbreekt.
  -- In de praktijk kán dat in Postgres niet (hij laat zo'n regel
  -- niet eens aanmaken, en laat de functie er ook niet onder
  -- vandaan halen), maar dat is precies het soort zekerheid dat je
  -- wilt zién in plaats van aannemen.
  select 3, 'die regel verwijst alleen naar functies die bestaan',
         case when not f.weg_bestaat then 'er is geen regel om te beoordelen'
              when f.ontbrekend = '' then 'ja, alles wat hij noemt bestaat'
              else 'NEE — hij noemt ' || f.ontbrekend || ', en die bestaat niet' end,
         f.weg_bestaat and f.ontbrekend = ''
  from feiten f
  union all

  select 4, 'de functie wis_speler bestaat (het andere deel van 08)',
         case when f.fn_wis_speler then 'ja' else 'nee — 08-bewaartermijn.sql is hier niet gedraaid' end,
         f.fn_wis_speler
  from feiten f
  union all

  -- basis_van_sleutel() haalt het voorvoegsel "2025-2026::" van een
  -- sleutel af. Hij komt uit 06-pakketten.sql, en 08 heeft hem nodig
  -- — zowel in wis_speler() zelf als in het controlestuk onderaan
  -- 08. Ontbreekt hij, dan stopt 08 met een foutmelding en wordt
  -- alles wat 08 zou doen weer teruggedraaid. Dat is een tweede,
  -- losse reden waarom 08 hier nooit aangekomen kan zijn.
  select 5, 'de functie basis_van_sleutel bestaat (08 heeft hem nodig, komt uit 06)',
         case when f.fn_basis then 'ja' else 'nee — dan loopt 08-bewaartermijn.sql ook hierop stuk' end,
         f.fn_basis
  from feiten f
  union all

  -- De twee hulpfuncties. Hier is "nee" bij is_eigenaar geen fout
  -- op zichzelf — het is de verklaring waarom 08 nooit is
  -- aangekomen. Daarom staat het oordeel op de vraag of er
  -- überháúpt een van de twee is.
  select 6, 'hulpfunctie is_eigenaar() bestaat (nodig voor 08 en 10)',
         case when f.fn_is_eigenaar then 'ja' else 'nee' end,
         f.fn_is_eigenaar
  from feiten f
  union all
  select 7, 'hulpfunctie ben_eigenaar() bestaat (de fase-a-variant)',
         case when f.fn_ben_eigenaar then 'ja' else 'nee' end,
         f.fn_ben_eigenaar
  from feiten f
)

select controle, gevonden, oordeel
from (
  select nr, controle, gevonden,
         case when goed then 'in orde' else 'LET OP' end as oordeel
  from controles
  union all
  select 900 + min(nr), 'SAMENVATTING',
         case when count(*) filter (where not goed) = 0
              then 'alle ' || count(*) || ' controles in orde — opheffen werkt'
              else count(*) filter (where not goed) || ' van de ' || count(*)
                   || case when count(*) filter (where not goed) = 1
                           then ' controles staat open' else ' controles staan open' end
                   || ' — lees de conclusie onder Messages'
         end,
         case when count(*) filter (where not goed) = 0 then 'in orde' else 'LET OP' end
  from controles
) t
order by t.nr;


-- ══════════════════════════════════════════════════════════════
--  DE CONCLUSIE IN GEWONE TAAL
--  ─────────────────────────────────────────────────────────────
--  Dit verschijnt onder "Messages", niet als tabel. Ook dit stuk
--  leest alleen: er staat geen enkele insert, update of delete in.
--  raise notice schrijft naar het logboek van je sessie en raakt
--  geen enkele tabel aan.
-- ══════════════════════════════════════════════════════════════
do $kijk$
declare
  heeft_regel   boolean;
  regel_naam    text;
  regel_tekst   text;
  heeft_iseig   boolean;
  heeft_beneig  boolean;
  heeft_wisser  boolean;
  heeft_basis   boolean;
  ontbrekend    text;
begin
  if to_regclass('public.clubs') is null then
    raise notice 'De tabel clubs bestaat hier niet. Draai eerst 01-schema.sql.';
    return;
  end if;

  select polname, coalesce(pg_get_expr(polqual, polrelid), '')
    into regel_naam, regel_tekst
  from pg_policy
  where polrelid = to_regclass('public.clubs')::oid and polcmd = 'd'
  limit 1;

  heeft_regel := regel_naam is not null;

  select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'is_eigenaar'),
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'ben_eigenaar'),
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'wis_speler'),
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'basis_van_sleutel')
    into heeft_iseig, heeft_beneig, heeft_wisser, heeft_basis;

  -- Zelfde lijst en zelfde vraag als in de tabel hierboven: noemt de
  -- regel een hulpfunctie die hier niet bestaat?
  ontbrekend := '';
  if heeft_regel then
    select coalesce(string_agg(h.naam, ', ' order by h.naam), '')
      into ontbrekend
    from (values ('is_eigenaar'), ('ben_eigenaar'), ('is_laatste_eigenaar'),
                 ('mijn_clubs'),  ('mag_schrijven'), ('is_beheerder'),
                 ('pakket_van_club')) as h(naam)
    where regel_tekst ~* ('\m' || h.naam || '\M')
      and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public' and p.proname = h.naam);
  end if;

  raise notice ' ';
  raise notice '─── CONCLUSIE ─────────────────────────────────────';

  if heeft_regel and ontbrekend = '' then
    raise notice 'MEEVALLER. Er is een regel (%) en alles waar hij naar', regel_naam;
    raise notice 'verwijst bestaat. Een eigenaar kan zijn vereniging echt';
    raise notice 'opheffen en een trainer niet. Hier hoeft niets te gebeuren.';
    if not heeft_wisser then
      raise notice ' ';
      raise notice 'Wel nog dit: wis_speler() ontbreekt. Dat is de andere';
      raise notice 'helft van 08-bewaartermijn.sql — een speler verwijderen';
      raise notice 'haalt hem nu uit één seizoenslijst en laat hem in de';
      raise notice 'andere staan. Dat is een privacy-punt, geen storing.';
    end if;

  elsif heeft_regel and ontbrekend <> '' then
    raise notice 'DIT MOET GEREPAREERD. De regel % verwijst naar %(),', regel_naam, ontbrekend;
    raise notice 'en die functie bestaat hier niet. Het opheffen van een';
    raise notice 'vereniging geeft dan een databasefout in plaats van een';
    raise notice 'nette weigering. Dit is zeldzaam — Postgres hoort dit';
    raise notice 'tegen te houden — dus meld het voordat je iets draait.';

  else
    raise notice 'HET OPHEFFEN VAN EEN VERENIGING WERKT NIET.';
    raise notice 'Er is geen enkele regel voor weggooien op clubs. De';
    raise notice 'database gooit er dan nul weg en meldt geen fout, dus de';
    raise notice 'app krijgt een "gelukt" terug en zegt dat tegen jou. Je';
    raise notice 'vereniging staat er daarna gewoon nog.';
    raise notice ' ';
    raise notice 'Het is GEEN lek: niemand ziet hierdoor iets wat hij niet';
    raise notice 'mag zien, en er gaat niets verloren. Het is een knop die';
    raise notice 'liegt.';
    raise notice ' ';
    if not heeft_iseig and heeft_beneig then
      raise notice 'De oorzaak is te zien: is_eigenaar() bestaat hier niet,';
      raise notice 'ben_eigenaar() wel. 08-bewaartermijn.sql vraagt om';
      raise notice 'is_eigenaar() en stopt dus met een foutmelding zodra je';
      raise notice 'hem draait — daarom is hij nooit aangekomen, en daarom';
      raise notice 'ontbreekt ook wis_speler().';
      raise notice ' ';
      raise notice 'WAT JE DOET: draai eerst 13-reconciliatie-is-eigenaar.sql';
      raise notice '(die zet is_eigenaar() ernaast en verandert verder niets),';
      raise notice 'daarna 08-bewaartermijn.sql, daarna dit bestand opnieuw.';
      if not heeft_basis then
        raise notice ' ';
        raise notice 'MAAR LET OP — er is nog een tweede blokkade. 08 gebruikt';
        raise notice 'ook basis_van_sleutel(), en die komt uit 06-pakketten.sql.';
        raise notice 'Die staat hier niet. 08 stopt dan alsnog met een fout en';
        raise notice 'draait zichzelf helemaal terug. 06 draaien is geen kleine';
        raise notice 'stap (het zet ook teamlimieten en een prijslijst neer):';
        raise notice 'overleg dat eerst, draai het niet zomaar tussendoor.';
      end if;
    elsif not heeft_iseig and not heeft_beneig then
      raise notice 'Let op: geen van beide hulpfuncties bestaat hier';
      raise notice '(is_eigenaar noch ben_eigenaar). Deze database is verder';
      raise notice 'achter dan verwacht. Draai eerst 11-controle-productie.sql';
      raise notice 'en meld de uitkomst voordat je iets draait.';
    else
      raise notice 'is_eigenaar() bestaat hier wel. Draai dan gewoon';
      raise notice '08-bewaartermijn.sql en daarna dit bestand opnieuw.';
    end if;
  end if;
  raise notice '───────────────────────────────────────────────────';
end
$kijk$;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Niet nodig. Dit bestand heeft niets veranderd, dus er is ook
--  niets om terug te zetten.
--
--  Wil je andersom bewijzen dát deze controle iets vangt: dat is
--  hier nagedaan op een wegwerp-database. Met de regel erop en
--  is_eigenaar() aanwezig staat alles op "in orde"; haal je de
--  regel weg, dan springt controle 2 op "LET OP" en verandert de
--  conclusie meteen mee. Een controle die nooit rood wordt,
--  controleert niets.
-- ══════════════════════════════════════════════════════════════
