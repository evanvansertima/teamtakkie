-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — welke accounts staan er eigenlijk?
--  ─────────────────────────────────────────────────────────────
--  Dit bestand kijkt alleen. Het verandert niets, het verwijdert
--  niets, en je kunt het zo vaak draaien als je wilt.
--
--  Het hoort bij 15-opruimen-nepaccounts.sql. Dáár wordt er echt
--  iets weggegooid. Draai dit bestand eerst, en helemaal.
--
--  WAAROM DIT BESTAAT
--  Tijdens het testen zijn er verenigingen en accounts aangemaakt
--  met e-mailadressen die niet bestaan. Die mogen weg. Maar "weg"
--  is bij een database definitief: er is geen prullenbak en geen
--  ongedaan-maken. Daarom eerst dit: één tabel waarin je met je
--  eigen ogen ziet wélk account welke verenigingen, teams en
--  gegevens onder zich heeft. Jij beslist daarna wat weg mag.
--
--  Dit bestand beslist dus niets. Het raadt niet welk e-mailadres
--  er "nep uitziet" — dat is precies het soort gok waar je met een
--  onomkeerbare verwijdering niet aan moet beginnen.
--
--  HET BESTAAT UIT TWEE BLOKKEN
--    BLOK 0  staat het gereedschap er wel? (verwijder_account,
--            de beheerderstabel, en jij als beheerder daarin)
--    BLOK 1  het overzicht zelf
--
--  Draai ze één voor één: selecteer een blok met de muis en klik
--  op Run. De Supabase-editor laat namelijk alleen het resultaat
--  van het láátste commando zien; plak je alles in één keer, dan
--  mis je de uitkomst van blok 0.
-- ══════════════════════════════════════════════════════════════



-- ══════════════════════════════════════════════════════════════
--  BLOK 0 — staat het gereedschap er?
--  ─────────────────────────────────────────────────────────────
--  Selecteer alles tussen de twee stippellijnen hieronder en klik
--  op Run.
--
--  WAT JE HOORT TE ZIEN
--  Een tabel met elf regels plus een samenvatting. In de kolom
--  "oordeel" hoort overal "in orde" te staan en nergens "LET OP".
--  Onderaan staat in gewone taal wat je moet doen.
--
--  WAAROM DIT BLOK NODIG IS
--  Op 15 september bleek twee keer dat aannames over wat er op de
--  echte database staat niet klopten. Een bestand dat begint met
--  "ik neem aan dat 03-beheer.sql gedraaid is" is daarom geen
--  optie. Dit blok vráágt het gewoon.
--
--  De laatste vier controles gaan over iets anders, en dat is het
--  belangrijkste van dit hele blok. verwijder_account() verwijdert
--  zelf alleen de leden-regels, de vereniging en het account. Hij
--  noemt teams, gegevens en abonnementen met geen woord. Die
--  verdwijnen door "on delete cascade": een afspraak in de database
--  zelf dat een regel meegaat als datgene waar hij bij hoort weg
--  is. Staat die afspraak er niet, dan blijven er wéésregels
--  achter — spelers van een team dat niet meer bestaat. Dat is de
--  reden dat we het hier vragen in plaats van het in het schema na
--  te lezen: het schema-bestand is niet de database.
-- ══════════════════════════════════════════════════════════════
-- ─────────────────────────── knip ───────────────────────────
with
feiten as (
  select
    to_regclass('public.beheerders')                 is not null as t_beheerders,
    to_regclass('public.admins')                     is not null as t_admins,
    to_regprocedure('public.is_beheerder()')         is not null as f_isbeheerder,
    to_regprocedure('public.verwijder_account(uuid)') is not null as f_verwijder,
    to_regprocedure('public.delete_account(uuid)')    is not null as f_delete_en,
    to_regclass('public.leden')                      is not null as t_leden,
    to_regclass('public.gegevens')                   is not null as t_gegevens,
    (select count(*) from auth.users
      where email = 'evan.vansertima001@gmail.com')              as n_evan
),

-- De vier afspraken die ervoor zorgen dat er niets blijft slingeren
-- als een vereniging verdwijnt. confdeltype = 'c' is hoe Postgres
-- "on delete cascade" opschrijft.
cascades as (
  select cl.relname::text  as vantabel,
         ref.relname::text as naartabel,
         con.confdeltype = 'c' as cascadeert
  from pg_constraint con
  join pg_class cl    on cl.oid  = con.conrelid
  join pg_class ref   on ref.oid = con.confrelid
  join pg_namespace n on n.oid   = cl.relnamespace
  where con.contype = 'f' and n.nspname = 'public'
    and (cl.relname, ref.relname) in
        (('leden','clubs'), ('teams','clubs'), ('abonnementen','clubs'), ('gegevens','teams'))
),

beheerder_rij as (
  select case when (select t_beheerders from feiten)
              then (select count(*) from public.beheerders b
                    join auth.users u on u.id = b.gebruiker_id
                    where u.email = 'evan.vansertima001@gmail.com')
              else 0 end as n
),

controles as (
  select 1 as nr, 'bestaat het account evan.vansertima001@gmail.com?' as controle,
         case when f.n_evan > 0 then 'ja' else 'NEE' end as gevonden,
         (f.n_evan > 0) as goed
  from feiten f
  union all
  select 2, 'bestaat de tabel beheerders?',
         case when f.t_beheerders then 'ja'
              when f.t_admins     then 'nee, wel admins (Engelse hernoeming)'
              else 'NEE' end,
         f.t_beheerders from feiten f
  union all
  select 3, 'bestaat de functie is_beheerder()?',
         case when f.f_isbeheerder then 'ja' else 'NEE' end,
         f.f_isbeheerder from feiten f
  union all
  select 4, 'bestaat de functie verwijder_account(uuid)?',
         case when f.f_verwijder  then 'ja'
              when f.f_delete_en  then 'nee, wel delete_account (Engelse hernoeming)'
              else 'NEE' end,
         f.f_verwijder from feiten f
  union all
  select 5, 'sta jij als beheerder geregistreerd?',
         case when b.n > 0 then 'ja' else 'NEE' end, (b.n > 0)
  from beheerder_rij b
  union all
  select 6, 'heten de tabellen nog leden en gegevens (Nederlands)?',
         case when f.t_leden and f.t_gegevens then 'ja' else 'NEE' end,
         (f.t_leden and f.t_gegevens) from feiten f
  union all
  select 6 + row_number() over (order by c.vantabel),
         'gaat ' || c.vantabel || ' mee als een '
           || case c.naartabel when 'clubs' then 'vereniging' else 'team' end
           || ' verdwijnt?',
         case when c.cascadeert then 'ja (on delete cascade)'
              else 'NEE — er blijven weesregels achter' end,
         c.cascadeert
  from cascades c
  union all
  select 20, 'zijn alle vier die afspraken gevonden?',
         (select count(*) from cascades) || ' van de 4',
         (select count(*) from cascades) = 4
),

conclusie as (
  select case when (select count(*) from controles where not goed) = 0 then array[
      '───────────────────────────────────────────────────',
      'ALLES STAAT KLAAR.',
      '',
      'Ga naar BLOK 1, verderop in dit bestand, en draai dat.',
      'Daar zie je welke accounts er zijn. Er verandert nog',
      'steeds niets.',
      '───────────────────────────────────────────────────'
    ] else array[
      '───────────────────────────────────────────────────',
      'NOG NIETS VERWIJDEREN. Er staat hierboven ergens LET OP.',
      '',
      'Staat het bij controle 2, 3, 4 of 5:',
      '  server/03-beheer.sql is nog niet op deze database',
      '  gedraaid, of niet helemaal. Open dat bestand, plak het',
      '  in de SQL Editor, klik Run en draai dit blok opnieuw.',
      '  Staat controle 1 op NEE, dan bestaat jouw account hier',
      '  nog niet: log eerst één keer in de app in.',
      '  Staat alleen controle 5 op NEE, dan is de laatste regel',
      '  van 03-beheer.sql niet aangekomen; die regel alleen',
      '  opnieuw draaien is genoeg.',
      '',
      'Staat het bij controle 6:',
      '  deze database draait de Engelse namen (members, admins,',
      '  delete_account). De rest van dit bestand praat Nederlands',
      '  en werkt daar niet. Stop en vraag het na.',
      '',
      'Staat het bij een van de cascade-controles (7 t/m 20):',
      '  stop helemaal. Verwijder je dan een vereniging, dan',
      '  blijven haar teams, spelers en abonnement als losse',
      '  regels achter zonder dat iemand er nog bij kan. Dat moet',
      '  eerst opgelost, en niet door hier door te drukken.',
      '───────────────────────────────────────────────────'
    ] end as tekst
)

select controle, gevonden, oordeel
from (
  select nr, controle, gevonden,
         case when goed then 'in orde' else 'LET OP' end as oordeel
  from controles
  union all
  select 900, 'SAMENVATTING',
         case when (select count(*) from controles where not goed) = 0
              then 'alle ' || (select count(*) from controles) || ' controles in orde'
              else (select count(*) from controles where not goed) || ' van de '
                   || (select count(*) from controles) || ' staan open' end,
         case when (select count(*) from controles where not goed) = 0
              then 'in orde' else 'LET OP' end
  union all
  -- De conclusie onderaan dezelfde tabel. Alleen de eerste kolom is
  -- gevuld, want die is het breedst; zo zie je meteen dat dit geen
  -- controle meer is maar uitleg.
  select 1000 + u.volgnr, u.regel, '', ''
  from conclusie c, unnest(c.tekst) with ordinality as u(regel, volgnr)
) t
order by t.nr;
-- ─────────────────────────── knip ───────────────────────────



-- ══════════════════════════════════════════════════════════════
--  BLOK 1 — het overzicht
--  ─────────────────────────────────────────────────────────────
--  Selecteer alles tussen de twee stippellijnen hieronder en klik
--  op Run. Ook dit blok kijkt alleen.
--
--  WAT JE HOORT TE ZIEN
--  Eén tabel met zeven kolommen:
--
--    soort            de bovenste regel is jouw eigen account, met
--                     ">>> DIT ACCOUNT BLIJFT STAAN <<<". Daaronder,
--                     na een streepjesregel, elk ander account met
--                     "kandidaat — jij beslist".
--    email            het e-mailadres waarmee is ingelogd.
--    gebruiker_id     het lange nummer. Dit is wat je in blok 3 van
--                     15-opruimen-nepaccounts.sql moet plakken.
--                     Klik op de cel en kopieer hem; niet overtypen.
--    verenigingen     de namen van zijn verenigingen, met zijn rol.
--    teams            hoeveel teams daaronder hangen.
--    laatst_ingelogd  "nooit ingelogd" is een sterke aanwijzing dat
--                     je met een testaccount te maken hebt — maar
--                     het is een aanwijzing, geen bewijs. Jij kijkt.
--    let_op           wat er bij dít account bijzonder is.
--
--  Onder de accounts staat, als er zijn, een tweede soort regel:
--  "VERENIGING ZONDER LEDEN". Dat zijn verenigingen waar niemand
--  meer in zit. Die verdwijnen NIET door een account te verwijderen
--  — er is immers geen account meer dat ze vasthoudt. Daar is blok
--  5 van het volgende bestand voor. Ze zijn waarschijnlijk ontstaan
--  door de fout waardoor iedereen zomaar een vereniging kon
--  aanmaken, of door een half afgebroken test.
--
--  Onderaan de tabel staat een korte uitleg en de telling.
--
--  TWEE DINGEN OM OP TE LETTEN IN DE KOLOM let_op
--
--  1. "LET OP: <naam> blijft staan (heeft ook andere leden)"
--     Verwijder je dát account, dan verdwijnt hij wel, maar zijn
--     vereniging niet: er zit nog iemand anders in (waarschijnlijk
--     jij). verwijder_account() ruimt namelijk alleen verenigingen
--     op waar het account het énige lid van was. Dat is bewust —
--     een vereniging met nog levende leden mag niet onder hen
--     vandaan verdwijnen. Wil je die vereniging ook weg, dan doe je
--     dat daarna zelf in de app, bij Instellingen.
--
--  2. "geen vereniging"
--     Dan is er alleen een inlog en verder niets. Die verdwijnt in
--     zijn geheel.
-- ══════════════════════════════════════════════════════════════
-- ─────────────────────────── knip ───────────────────────────
with
mijn_email as (select 'evan.vansertima001@gmail.com'::text as e),

per_account as (
  select
    u.id,
    u.email::text as email,
    u.created_at,
    u.last_sign_in_at,
    (u.email = (select e from mijn_email)) as is_van_mij,
    coalesce((select count(*) from public.leden l
              where l.gebruiker_id = u.id), 0) as n_clubs,
    coalesce((
      select string_agg(c.naam || ' (' || l.rol || ')', ', ' order by c.naam)
      from public.leden l join public.clubs c on c.id = l.club_id
      where l.gebruiker_id = u.id
    ), '— geen vereniging —') as clubs,
    coalesce((
      select count(*) from public.teams t
      where t.club_id in (select l.club_id from public.leden l where l.gebruiker_id = u.id)
        and t.verwijderd_op is null
    ), 0) as n_teams,
    coalesce((
      select count(*) from public.gegevens g
      where g.team_id in (
        select t.id from public.teams t
        where t.club_id in (select l.club_id from public.leden l where l.gebruiker_id = u.id))
    ), 0) as n_gegevens,
    -- De verenigingen van dit account waar óók iemand anders in
    -- zit. Precies die blijven staan bij het verwijderen.
    (
      select string_agg(c.naam, ', ' order by c.naam)
      from public.leden l join public.clubs c on c.id = l.club_id
      where l.gebruiker_id = u.id
        and exists (select 1 from public.leden a
                    where a.club_id = l.club_id and a.gebruiker_id <> u.id)
    ) as gedeelde_clubs
  from auth.users u
),

weesclubs as (
  select c.id, c.naam,
         (select count(*) from public.teams t where t.club_id = c.id) as n_teams
  from public.clubs c
  where not exists (select 1 from public.leden l where l.club_id = c.id)
),

regels as (
  select 100 as nr,
         '>>> DIT ACCOUNT BLIJFT STAAN <<<' as soort,
         a.email                            as email,
         a.id::text                         as gebruiker_id,
         a.clubs                            as verenigingen,
         a.n_teams::text                    as teams,
         coalesce(to_char(a.last_sign_in_at,'DD-MM-YYYY'),'nooit ingelogd') as laatst_ingelogd,
         coalesce('je deelt ' || a.gedeelde_clubs || ' met iemand anders', '') as let_op
  from per_account a where a.is_van_mij

  union all
  select 150, '───────────────','───────────────','───────────────',
         '───────────────','───','──────────','───────────────'

  union all
  select 200 + row_number() over (order by a.created_at),
         'kandidaat — jij beslist',
         a.email, a.id::text, a.clubs, a.n_teams::text,
         coalesce(to_char(a.last_sign_in_at,'DD-MM-YYYY'),'nooit ingelogd'),
         case
           when a.n_clubs = 0
             then 'geen vereniging: alleen de inlog verdwijnt'
           when a.gedeelde_clubs is not null
             then 'LET OP: ' || a.gedeelde_clubs || ' blijft staan (heeft ook andere leden)'
           else a.n_gegevens
                || case when a.n_gegevens = 1 then ' blok teamgegevens gaat'
                        else ' blokken teamgegevens gaan' end
                || ' mee weg'
         end
  from per_account a where not a.is_van_mij

  union all
  select 500, '───────────────','───────────────','───────────────',
         '───────────────','───','──────────','───────────────'

  union all
  select 600 + row_number() over (order by w.naam),
         'VERENIGING ZONDER LEDEN', '(geen account)', w.id::text, w.naam,
         w.n_teams::text, '',
         'verdwijnt NIET vanzelf — zie blok 5 van 15-opruimen-nepaccounts.sql'
  from weesclubs w
),

conclusie as (
  select array[
    '───────────────────────────────────────────────────',
    'Wat je hier ziet:',
    '  · de bovenste regel is jouw eigen account. Die blijft.',
    '  · daaronder elk ander account, met zijn verenigingen erbij.',
    '  · kopieer van de accounts die weg mogen de kolom gebruiker_id.',
    '',
    'Accounts naast dat van jou: '
      || (select count(*) from per_account where not is_van_mij),
    'Verenigingen zonder ook maar één lid: '
      || (select count(*) from weesclubs),
    '',
    'Herken je een e-mailadres niet, verwijder het dan NIET. Laat',
    'het staan en zoek het uit. Een account te veel is hersteld met',
    'een vraag; een account te weinig is voorgoed weg.',
    '',
    'Weet je het zeker: ga naar 15-opruimen-nepaccounts.sql.',
    '───────────────────────────────────────────────────'
  ] as tekst
)

select soort, email, gebruiker_id, verenigingen, teams, laatst_ingelogd, let_op
from (
  select nr, soort, email, gebruiker_id, verenigingen, teams, laatst_ingelogd, let_op
  from regels
  union all
  select 1000 + u.volgnr, u.regel, '', '', '', '', '', ''
  from conclusie c, unnest(c.tekst) with ordinality as u(regel, volgnr)
) t
order by t.nr;
-- ─────────────────────────── knip ───────────────────────────



-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Niet nodig. Dit bestand heeft niets veranderd.
--
--  Dat dit klopt is nagedaan op een wegwerp-database met één echt
--  account en drie nepaccounts: zie tests/opruimen-accounts.test.sh.
--  Daar is ook aangetoond dat blok 0 rood wordt als je het
--  gereedschap weghaalt — een controle die nooit rood wordt,
--  controleert niets.
-- ══════════════════════════════════════════════════════════════
