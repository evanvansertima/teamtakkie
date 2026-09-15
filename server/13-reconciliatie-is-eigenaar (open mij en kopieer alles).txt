-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — is_eigenaar() erbij zetten, verder niets
--  ─────────────────────────────────────────────────────────────
--  Plak dit hele bestand in de SQL Editor van Supabase en klik op
--  Run. Het duurt minder dan een seconde.
--
--  DRAAI EERST 12-CONTROLE-OPHEFFEN.SQL. Dat bestand kijkt alleen
--  en vertelt je of dit bestand nodig is. Staat daar "MEEVALLER",
--  dan hoef je dit niet te draaien.
--
--  WAT DIT DOET, IN ÉÉN ZIN
--  Het zet één nieuwe functie in de database, is_eigenaar(), die
--  precies hetzelfde antwoord geeft als de functie ben_eigenaar()
--  die er al staat. Verder verandert er niets.
--
--  WAT DIT NIET DOET — lees dit, want dat is het punt:
--   · het raakt géén enkele beveiligingsregel aan (geen policy
--     wordt aangemaakt, gewijzigd of weggegooid)
--   · het raakt ben_eigenaar() niet aan
--   · het raakt geen enkele rij van jou aan: geen club, geen lid,
--     geen team, geen speler
--   · het geeft niemand een recht dat hij nu niet al heeft
--
--  Zolang je verder niets draait, merkt de app hier dus niets van.
--  Dit bestand maakt alleen mogelijk dat je 08-bewaartermijn.sql
--  daarna wél kunt draaien.
--
--
--  WAAROM DIT NODIG IS
--
--  Er zijn ooit twee oplossingen gemaakt voor dezelfde fout (de
--  "infinite recursion" op de tabel leden). Ze doen inhoudelijk
--  hetzelfde, maar ze noemen hun hulpfunctie anders:
--
--    server/fase-a/A2-fix-leden.sql   →  ben_eigenaar()
--    server/04-leden-fix.sql          →  is_eigenaar()
--
--  Op 15 september is met 11-controle-productie.sql aan de echte
--  database gevraagd welke van de twee er staat. Het antwoord was:
--  ben_eigenaar() — de fase-a-variant. is_eigenaar() bestaat daar
--  niet. De beveiliging is daarmee in orde; de twee functies zijn
--  woord voor woord hetzelfde, alleen de naam verschilt.
--
--  Maar er zijn twee latere bestanden die om is_eigenaar() vragen:
--
--    08-bewaartermijn.sql    de regel die een vereniging laat
--                            opheffen, en wis_speler()
--    10-laatste-eigenaar.sql de rem op de laatste eigenaar
--
--  Postgres weigert een regel aan te maken die naar een functie
--  verwijst die niet bestaat. Die twee bestanden stoppen dus met
--  een foutmelding zodra je ze draait, en de Supabase-editor draait
--  een geplakt blok als één geheel: gaat er iets mis, dan wordt
--  álles van dat bestand weer teruggedraaid. Zo is 08 nooit
--  aangekomen — en daardoor kun je vandaag geen vereniging
--  opheffen (de app meldt "gelukt" en er gebeurt niets).
--
--  DIT BESTAND IS NIET DE HELE OPLOSSING. Het haalt één blokkade
--  weg. Er is er nog een: 08 gebruikt ook basis_van_sleutel(), en
--  die komt uit 06-pakketten.sql — een bestand dat op de echte
--  database ook nog niet staat. Of je dát gaat draaien is een
--  aparte afweging (er zitten teamlimieten en een prijslijst in).
--  12-controle-opheffen.sql zegt je of die tweede blokkade er nog
--  is. Draai 08 pas als beide weg zijn.
--
--
--  WAAROM DIT DE VEILIGSTE REPARATIE IS
--
--  De voor de hand liggende andere weg is: de regels op leden
--  omschrijven zodat ze is_eigenaar() gebruiken in plaats van
--  ben_eigenaar(). Dat is precies wat je NIET wilt doen. Die twee
--  regels werken op dit moment — ze zijn de reparatie van de bug
--  die maandenlang elke insert en delete op leden onmogelijk
--  maakte. Aan een werkende beveiligingsregel schuiven om een
--  naamsverschil op te lossen is het risico niet waard.
--
--  Een functie erbij zetten kan daarentegen niets breken: er is
--  vandaag niets dat is_eigenaar() aanroept, dus er is niets dat
--  zich anders kan gaan gedragen. Het enige wat verandert is dat
--  het aanroepen ervan vanaf nu lúkt.
--
--  En er is een reden dat hij ben_eigenaar() aanroept in plaats van
--  de vraag zelf nóg een keer op te schrijven: dan kunnen de twee
--  nooit uit elkaar gaan lopen. Eén vraag, één antwoord — dezelfde
--  gewoonte als mijn_clubs() en mag_schrijven() in 01-schema.sql.
--
--
--  WAT JE DAARNA HOORT TE ZIEN
--  Eén tabel onderin het scherm, in het vak "Results". De eerste
--  vijf regels zijn de controles: in de kolom "oordeel" hoort
--  overal "in orde" te staan en nergens "LET OP".
--
--  SCROLL IN DIE TABEL NAAR BENEDEN. Onder die vijf regels staat,
--  na een regel met "─── WAT NU ───" erin, in gewone taal wat de
--  volgende stap is. Elke zin staat op zijn eigen regel in de
--  eerste kolom.
--
--  Je hoeft nergens anders te kijken: alles staat in die ene tabel.
--  (Eerder stond hier dat dat stuk onder een tabblad "Messages" zou
--  staan. Die is in de Supabase-editor niet te vinden, en daarom
--  staat het nu gewoon in de tabel zelf.)
--
--  TERUGDRAAIEN staat helemaal onderaan, met streepjes ervoor zodat
--  het niet vanzelf meedraait.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  EERST KIJKEN: staat ben_eigenaar() er wel?
--  ─────────────────────────────────────────────────────────────
--  Zonder die functie heeft dit bestand geen fundament om op te
--  bouwen, en dan stoppen we liever meteen met een duidelijke
--  melding dan dat we een functie achterlaten die bij elke aanroep
--  klapt. Dit blok verandert niets; het kijkt en het stopt zo
--  nodig.
-- ══════════════════════════════════════════════════════════════
do $poort$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'ben_eigenaar'
  ) then
    raise exception
      'ben_eigenaar() bestaat niet op deze database. Dit bestand hoort alleen op een database waar fase-a/A2-fix-leden.sql is gedraaid. Draai eerst 11-controle-productie.sql en 12-controle-opheffen.sql, en meld de uitkomst. Er is niets veranderd.';
  end if;
end
$poort$;


-- ══════════════════════════════════════════════════════════════
--  DE FUNCTIE
-- ══════════════════════════════════════════════════════════════

-- ── Ben ik eigenaar van deze club? ───────────────────────────
--  Dezelfde vraag als ben_eigenaar(), onder de naam die
--  08-bewaartermijn.sql en 10-laatste-eigenaar.sql gebruiken.
--
--  Waarom een doorgeefluik en geen tweede kopie van de tekst: twee
--  losse kopieën kunnen na een latere wijziging verschillende
--  antwoorden gaan geven, en dan hangt het van de naam in een
--  policy af wie er wat mag. Eén bron, twee namen.
--
--  security definer om dezelfde reden als mijn_clubs(): de vraag
--  moet in de tabel leden kijken, en de regels op leden zouden dat
--  van binnenuit een policy tegenhouden. set search_path = public
--  hoort daarbij: zonder dat zou iemand met een eigen zoekpad
--  kunnen bepalen welke ben_eigenaar er wordt aangeroepen.
create or replace function public.is_eigenaar(doel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.ben_eigenaar(doel)
$$;

grant execute on function public.is_eigenaar(uuid) to authenticated;

comment on function public.is_eigenaar(uuid) is
  'Doorgeefluik naar ben_eigenaar(). Bestaat omdat 08-bewaartermijn.sql en 10-laatste-eigenaar.sql deze naam gebruiken, terwijl op productie de fase-a-variant ben_eigenaar() staat. Eén bron van waarheid, twee namen. Toegevoegd 15 september 2026.';


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is alles goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  Hieronder komt een tabel terug. In de kolom "oordeel" hoort
--  overal "in orde" te staan. Staat er ergens "LET OP", draai dit
--  bestand dan nog een keer; twee keer draaien kan geen kwaad.
--
--  Let vooral op de laatste twee regels. Die controleren niet of de
--  functie bestaat, maar of hij op elke club hetzelfde antwoord
--  geeft als ben_eigenaar() — voor jou, nu, op je eigen
--  verenigingen. Een functie die bestaat maar iets anders zegt dan
--  ben_eigenaar() zou het hele punt van dit bestand onderuithalen.
--
--  Onder die vijf regels hangt in dezelfde tabel het stuk "WAT NU":
--  daar staat in gewone zinnen wat de volgende stap is. Dat staat
--  bewust in de tabel en niet in een blok met "raise notice" — dat
--  schrijft naar een logboek dat de Supabase-editor niet toont, en
--  een conclusie die je niet ziet is geen conclusie.
-- ══════════════════════════════════════════════════════════════
with functies as (
  select p.proname, p.prosecdef, p.proconfig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
-- Beide functies op elke club die er is, naast elkaar. Draait een
-- beheerder dit in de SQL Editor, dan is auth.uid() leeg en zeggen
-- ze allebei "onwaar" — dat is nog steeds hetzelfde antwoord, en
-- dat is precies wat hier vergeleken wordt.
vergelijk as (
  select count(*) as clubs,
         count(*) filter (
           where public.is_eigenaar(c.id) is distinct from public.ben_eigenaar(c.id)
         ) as verschillen
  from public.clubs c
),
controles as (
  select 1 as nr, 'de functie is_eigenaar() bestaat nu' as controle,
         case when exists (select 1 from functies where proname = 'is_eigenaar')
              then 'ja' else 'nee' end as gevonden,
         exists (select 1 from functies where proname = 'is_eigenaar') as goed
  union all
  select 2, 'is_eigenaar() is security definer',
         case when exists (select 1 from functies where proname = 'is_eigenaar' and prosecdef)
              then 'ja' else 'nee' end,
         exists (select 1 from functies where proname = 'is_eigenaar' and prosecdef)
  union all
  select 3, 'is_eigenaar() heeft een vast zoekpad (search_path)',
         case when exists (select 1 from functies
                           where proname = 'is_eigenaar'
                             and array_to_string(coalesce(proconfig, '{}'), ' ') like '%search_path%')
              then 'ja' else 'nee' end,
         exists (select 1 from functies
                 where proname = 'is_eigenaar'
                   and array_to_string(coalesce(proconfig, '{}'), ' ') like '%search_path%')
  union all
  -- Hier staat met opzet geen policy-controle bij: dit bestand
  -- verandert geen enkele regel, dus er valt op dat punt ook niets
  -- te bevestigen.
  select 4, 'ben_eigenaar() staat er nog ongewijzigd naast',
         case when exists (select 1 from functies where proname = 'ben_eigenaar')
              then 'ja' else 'nee' end,
         exists (select 1 from functies where proname = 'ben_eigenaar')
  union all
  select 5, 'beide functies geven op elke vereniging hetzelfde antwoord',
         (select case when clubs = 0 then 'er zijn geen verenigingen om te vergelijken'
                      when verschillen = 0 and clubs = 1 then 'ja, op de enige vereniging gelijk'
                      when verschillen = 0 then 'ja, op alle ' || clubs || ' verenigingen gelijk'
                      else 'NEE — verschilt op ' || verschillen || ' van de ' || clubs || ' verenigingen' end
          from vergelijk),
         (select verschillen = 0 from vergelijk)
),

-- ── WAT NU ───────────────────────────────────────────────────
--  Elke zin één regel; ze worden hieronder één voor één een rij
--  onderaan dezelfde tabel. De middelste alinea verschijnt alleen
--  als basis_van_sleutel() hier niet staat — want dan is er nog een
--  tweede blokkade voor 08-bewaartermijn.sql.
volgende as (
  select
    array[
      ' ',
      '─── WAT NU ────────────────────────────────────────',
      'is_eigenaar() staat er. Er is verder NIETS veranderd:',
      'geen regel, geen rij, geen recht. De app gedraagt zich',
      'precies zoals een minuut geleden.',
      ' ',
      'Volgende stap, als je het opheffen van een vereniging',
      'wilt laten werken: 08-bewaartermijn.sql draaien, en',
      'daarna 12-controle-opheffen.sql opnieuw — daar hoort',
      'dan "MEEVALLER" te staan.',
      ' '
    ]
    || case when not exists (select 1 from functies where proname = 'basis_van_sleutel')
         then array[
           'Maar doe dat NOG NIET. 08 gebruikt ook basis_van_sleutel(),',
           'en die komt uit 06-pakketten.sql. Die functie staat hier',
           'niet, dus 08 loopt alsnog vast en draait zichzelf terug.',
           '06 is geen kleine stap — overleg dat eerst.',
           ' '
         ] else array[]::text[] end
    || array[
      'Draai 10-laatste-eigenaar.sql NIET zonder overleg. Die',
      'schrijft de regel leden_weghalen opnieuw, en die werkt',
      'hier al (via ben_eigenaar). Wat 10 toevoegt heb je op',
      'is_laatste_eigenaar na al.',
      '───────────────────────────────────────────────────'
    ] as regels
)

select controle, gevonden, oordeel
from (
  select nr, controle, gevonden,
         case when goed then 'in orde' else 'LET OP' end as oordeel
  from controles

  union all

  -- De uitleg onderaan dezelfde tabel (nummer 1000+), in de eerste
  -- kolom. De twee andere kolommen blijven leeg: zo zie je meteen
  -- dat dit geen controle meer is maar de volgende stap.
  select 1000 + u.volgnr, u.regel, '', ''
  from volgende v, unnest(v.regels) with ordinality as u(regel, volgnr)
) t
order by t.nr;




-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Haal de streepjes weg voor de regel hieronder en draai alleen
--  dat stuk. Daarna is de database weer precies zoals vóór dit
--  bestand.
--
--  LET OP DE VOLGORDE. Heb je hierna 08-bewaartermijn.sql gedraaid,
--  dan gebruikt de regel clubs_weghalen deze functie. Postgres laat
--  hem dan niet weghalen en zegt dat ook: "cannot drop function
--  is_eigenaar(uuid) because other objects depend on it". Dat is
--  geen storing maar een beveiliging — hij voorkomt dat je een
--  regel achterlaat die naar niets verwijst. Wil je dan écht terug,
--  draai dan eerst het terugdraaiblok van 08.
--
--  Gebruik NOOIT "drop ... cascade" hier. Dat zou de regel
--  clubs_weghalen stilzwijgend meenemen, en dan ben je terug bij
--  een knop die "gelukt" zegt en niets doet.
--
--    -- drop function if exists public.is_eigenaar(uuid);
--
--  Controleer daarna met:
--
--    -- select count(*) as moet_nul_zijn
--    -- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    -- where n.nspname = 'public' and p.proname = 'is_eigenaar';
-- ══════════════════════════════════════════════════════════════
