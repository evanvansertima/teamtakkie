-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — nepaccounts en hun testverenigingen opruimen
--  ─────────────────────────────────────────────────────────────
--  DIT BESTAND GOOIT ECHT IETS WEG. Er is geen prullenbak, geen
--  ongedaan-maken en — anders dan bij 11, 12 en 13 — geen blok
--  "terugdraaien" onderaan. Wat hier verdwijnt is verdwenen.
--
--  Lees dus eerst de hele kop, en draai eerst
--  server/14-overzicht-accounts.sql. Dat bestand kijkt alleen en
--  vertelt je twee dingen: of het gereedschap er staat, en welk
--  account welke verenigingen, teams en gegevens onder zich heeft.
--
--  DE VOLGORDE
--    (14) BLOK 0  staat het gereedschap er?          alleen kijken
--    (14) BLOK 1  welke accounts zijn er?            alleen kijken
--    (15) BLOK 2  back-up maken                      alleen kijken
--    (15) BLOK 3  één account verwijderen            GOOIT WEG
--    (15) BLOK 4  controleren wat er gebeurd is      alleen kijken
--         → blok 3 en 4 herhalen voor het volgende account
--    (15) BLOK 5  verenigingen zonder leden          GOOIT WEG
--
--  Draai de blokken één voor één: selecteer een blok met de muis
--  en klik op Run. Dat is niet alleen omdat de Supabase-editor
--  alleen het laatste resultaat toont — het is vooral omdat je na
--  élke verwijdering wilt kunnen kijken of er is gebeurd wat je
--  dacht.
--
--
--  ÉÉN ACCOUNT PER KEER. NIET IN ÉÉN KEER ALLES.
--  Er staat hier met opzet geen lus die "alle accounts behalve die
--  van jou" wegveegt. Zo'n lus is één typefout verwijderd van het
--  wissen van je eigen vereniging, en bij een onomkeerbare
--  bewerking is de snelste weg de verkeerde. Eén uuid per keer
--  plakken kost je twee minuten en beperkt elke vergissing tot
--  één account.
--
--
--  WAT verwijder_account() PRECIES DOET
--  De functie staat in server/03-beheer.sql. In gewone woorden:
--
--    1. hij weigert als jij geen beheerder bent
--    2. hij weigert als je jouw eigen account opgeeft
--    3. hij zoekt de verenigingen waar dit account het ENIGE lid
--       van was
--    4. hij haalt de lidmaatschappen van dit account weg
--    5. hij haalt die verenigingen weg
--    6. hij haalt het account zelf weg uit auth.users
--
--  Stap 2 is je vangnet: ook als je per ongeluk jouw eigen nummer
--  plakt, gebeurt er niets. Je krijgt dan de melding "Je kunt je
--  eigen account hier niet verwijderen" en de hele bewerking wordt
--  teruggedraaid.
--
--
--  EN DE SPELERS, WEDSTRIJDEN EN ABONNEMENTEN DAN?
--  Die worden in de functie nergens genoemd, en toch gaan ze mee.
--  Dat komt door "on delete cascade": een afspraak in de database
--  zelf dat een regel meegaat als datgene waar hij bij hoort
--  verdwijnt. In server/01-schema.sql staan er vier die hier
--  gelden:
--
--    leden.club_id        → clubs(id)   on delete cascade
--    teams.club_id        → clubs(id)   on delete cascade
--    abonnementen.club_id → clubs(id)   on delete cascade
--    gegevens.team_id     → teams(id)   on delete cascade
--
--  Verdwijnt een vereniging, dan verdwijnen dus haar leden, haar
--  teams en haar abonnement. En omdat haar teams verdwijnen,
--  verdwijnen ook alle gegevens van die teams: de spelers, de
--  wedstrijden, de trainingen, de aanwezigheid. Er blijft niets
--  zwevends achter.
--
--  Datzelfde geldt voor het account: leden.gebruiker_id,
--  persoonlijk.gebruiker_id en beheerders.gebruiker_id wijzen
--  allemaal met cascade naar auth.users(id). Zijn persoonlijke
--  oefeningenbibliotheek en voorkeuren gaan dus mee.
--
--  Dit is niet uit het schemabestand overgeschreven maar nagedaan:
--  in tests/opruimen-accounts.test.sh is een nepaccount met een
--  vereniging, twee teams en hun gegevens verwijderd, en daarna
--  geteld dat er nul regels over waren — terwijl het echte account
--  en JO19-2 onaangeroerd bleven. In dezelfde test is de cascade
--  op gegevens opzettelijk weggehaald; toen bleven de spelersregels
--  wél achter. Zo weet je dat de controle iets vangt.
--
--  BLOK 0 van bestand 14 vraagt deze vier afspraken op aan de
--  échte database. Staat daar ergens "LET OP", draai dan niets van
--  dit bestand.
--
--
--  WAT NIET MEEGAAT — lees dit, het is de enige verrassing
--  Een vereniging waar behalve het te verwijderen account óók
--  iemand anders in zit, blijft staan. Dat is bewust: anders zou
--  een vereniging onder haar overgebleven leden vandaan kunnen
--  verdwijnen. Sta jij zelf als lid in zo'n testvereniging, dan
--  blijft die dus in jouw app staan nadat het nepaccount weg is.
--  Bestand 14 zet dat in de kolom let_op, met "LET OP: <naam>
--  blijft staan (heeft ook andere leden)". Zo'n vereniging hef je
--  daarna zelf op in de app, bij Instellingen.
-- ══════════════════════════════════════════════════════════════



-- ══════════════════════════════════════════════════════════════
--  BLOK 2 — eerst een back-up
--  ─────────────────────────────────────────────────────────────
--  Dit blok kijkt alleen. Selecteer het tussen de stippellijnen en
--  klik op Run.
--
--  WAT JE HOORT TE ZIEN
--  Eén cel met een groot blok tekst erin (JSON). Klik op die cel,
--  kopieer de inhoud, en plak hem in een leeg tekstbestand op je
--  eigen computer. Noem het bijvoorbeeld:
--
--      Back-ups/database-voor-opruimen-2026-09-15.txt
--
--  Dit is geen echte database-back-up waarmee je met één druk op
--  de knop terug bent. Het is een leesbaar afschrift van alles wat
--  er nu staat. Blijkt over een week dat er iets weg is dat had
--  moeten blijven, dan staat het hierin en is het met de hand
--  terug te zetten. Zonder dit afschrift is het weg.
--
--  DOE ER OOK HET VOLGENDE BIJ, het kost een halve minuut:
--  Supabase maakt zelf dagelijks een back-up. Ga in het menu links
--  naar Database → Backups en kijk of er een back-up van vandaag
--  of gisteren staat. Noteer de datum. Gaat het echt mis, dan is
--  dát je redding — maar een terugzetting daarvan zet álles terug,
--  ook het werk dat je sinds die back-up in de app hebt gedaan.
--
--  IS DE UITKOMST HEEL GROOT?
--  Dan zit er waarschijnlijk een clublogo in (dat wordt als een
--  lange reeks tekens bewaard). Kopiëren lukt dan nog steeds; laat
--  het plakken even doorlopen.
-- ══════════════════════════════════════════════════════════════
-- ─────────────────────────── knip ───────────────────────────
select jsonb_pretty(jsonb_build_object(
  'afschrift_van', now(),
  'accounts',     (select coalesce(jsonb_agg(to_jsonb(u)),'[]'::jsonb)
                   from (select id, email, created_at, last_sign_in_at from auth.users) u),
  'clubs',        (select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from public.clubs c),
  'leden',        (select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from public.leden l),
  'teams',        (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.teams t),
  'abonnementen', (select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from public.abonnementen a),
  'gegevens',     (select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) from public.gegevens g),
  'persoonlijk',  (select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from public.persoonlijk p)
)) as kopieer_dit_naar_een_tekstbestand;
-- ─────────────────────────── knip ───────────────────────────



-- ══════════════════════════════════════════════════════════════
--  BLOK 3 — één account verwijderen
--  ─────────────────────────────────────────────────────────────
--  DIT GOOIT WEG. Doe eerst blok 2.
--
--  WAT JE MOET AANPASSEN
--  Precies één ding: het lange nummer op de regel met
--  verwijder_account. Kopieer dat uit de kolom gebruiker_id van
--  blok 1 (bestand 14) — kopiëren, niet overtypen. De aanhalings-
--  tekens eromheen moeten blijven staan.
--
--  Selecteer daarna het hele blok tussen de stippellijnen, van
--  "begin;" tot en met "commit;", en klik op Run.
--
--  WAT JE HOORT TE ZIEN
--  Drie regeltjes na elkaar, en onderaan één tabel met daarin het
--  e-mailadres van het account dat je zojuist hebt verwijderd, met
--  "is nu weg" erachter. Zie je dat, dan is het gelukt.
--
--  MOGELIJKE MELDINGEN, EN WAT ZE BETEKENEN
--    "Je kunt je eigen account hier niet verwijderen"
--        Je hebt jouw eigen nummer geplakt. Er is niets gebeurd.
--        Pak het juiste nummer en probeer opnieuw.
--    "Alleen voor beheerders"
--        De regel met set_config is niet meegegaan in je selectie,
--        of jouw e-mailadres staat niet in de beheerderstabel.
--        Draai blok 0 van bestand 14 en kijk naar controle 5.
--    "invalid input syntax for type uuid"
--        Er is iets misgegaan bij het plakken van het nummer — een
--        spatie te veel, of een half nummer. Er is niets gebeurd.
--
--  In alle drie de gevallen is er niets verwijderd: de
--  Supabase-editor draait een geselecteerd blok als één geheel,
--  dus gaat er iets mis, dan wordt álles teruggedraaid.
--
--    iets met "violates foreign key constraint" en een naam die
--    met auth. begint
--        Dit is het enige dat vooraf niet na te bootsen was. De
--        laatste stap van de functie haalt de inlog weg uit
--        auth.users, en dat is een tabel van Supabase zelf met zijn
--        eigen aanhangsels (sessies, wachtwoordherstel). Normaal
--        gaan die vanzelf mee. Weigert hij toch, dan is er niets
--        verwijderd en doe je het zo:
--          · ga in het menu links naar Authentication → Users
--          · zoek het e-mailadres op, klik op de drie puntjes
--            rechts en kies Delete user
--        Zijn lidmaatschappen gaan dan vanzelf mee. Zijn vereniging
--        blijft dan wél achter, zonder leden — die ruim je op met
--        blok 5 hieronder. Draai daarna blok 4 om te kijken.
--
--
--  WAAROM ER EEN REGEL MET set_config BOVEN STAAT
--  Dit is de enige echt technische hobbel in dit bestand, en je
--  moet hem kennen, want zonder die regel werkt het niet.
--
--  verwijder_account() begint met de vraag "ben jij een
--  beheerder?". Om die te beantwoorden kijkt de database wie er
--  belt, met auth.uid(). In de app weet hij dat: je bent ingelogd.
--  Maar in de SQL Editor ben je niet ingelogd als gebruiker — je
--  praat rechtstreeks met de database. auth.uid() geeft daar niets
--  terug, en dus luidt het antwoord op "ben jij een beheerder?"
--  automatisch nee. De functie stopt dan met "Alleen voor
--  beheerders", ook al ben je het wel.
--
--  De regel met set_config vertelt de database voor de duur van
--  dit ene blok wie je bent. Hij zoekt jouw e-mailadres op en zet
--  dat nummer klaar. Daarna weet auth.uid() het weer.
--
--  De "true" achteraan betekent: alleen binnen dit blok. Zodra het
--  blok klaar is, vergeet de database het weer. Dat is belangrijk,
--  want die verbinding wordt hergebruikt; je wilt niet dat een
--  volgend commando denkt dat het namens jou draait.
--
--  En omdat hij jouw e-mailadres opzoekt in plaats van jouw nummer
--  over te nemen, blijft de rem uit de functie werken: geef je
--  jouw eigen nummer op als doel, dan zijn beide hetzelfde en
--  weigert hij.
-- ══════════════════════════════════════════════════════════════
-- ─────────────────────────── knip ───────────────────────────
begin;

-- Vertel de database voor dit ene blok wie er belt (zie de uitleg
-- hierboven). Niets aanpassen aan deze regel.
select set_config(
  'request.jwt.claims',
  json_build_object('sub',
    (select id from auth.users where email = 'evan.vansertima001@gmail.com'))::text,
  true
) is not null as ik_ben_nu_herkend;

-- Onthoud het e-mailadres, zodat we straks kunnen laten zien wát
-- er weg is. Na de verwijdering is het namelijk niet meer op te
-- vragen.
create temporary table zojuist_verwijderd on commit drop as
select email::text from auth.users
where id = '00000000-0000-0000-0000-000000000000';   -- ← ZELFDE NUMMER ALS HIERONDER

-- ↓↓↓ HIER HET NUMMER UIT BLOK 1 PLAKKEN ↓↓↓
select public.verwijder_account('00000000-0000-0000-0000-000000000000');
-- ↑↑↑ HIER HET NUMMER UIT BLOK 1 PLAKKEN ↑↑↑

select coalesce((select email from zojuist_verwijderd),
                'GEEN ACCOUNT MET DIT NUMMER GEVONDEN') as account,
       'is nu weg' as stand;

commit;
-- ─────────────────────────── knip ───────────────────────────



-- ══════════════════════════════════════════════════════════════
--  BLOK 4 — controleren, na elk verwijderd account
--  ─────────────────────────────────────────────────────────────
--  Dit blok kijkt alleen. Draai het na élke keer dat je blok 3
--  hebt gedraaid, niet pas aan het eind.
--
--  WAT JE HOORT TE ZIEN
--  Vier regels, alle vier met "in orde":
--    · jouw account staat er nog
--    · FC Harlingen staat er nog
--    · JO19-2 staat er nog, met zijn gegevens
--    · er is één account minder dan voor je begon
--
--  Staat er ergens "LET OP", stop dan meteen en verwijder niets
--  meer. Je hebt in blok 2 een afschrift gemaakt; dat heb je dan
--  nodig.
--
--  Daarna staat er een teller: hoeveel accounts er nog naast dat
--  van jou over zijn. Is die nul en zijn er geen verenigingen
--  zonder leden meer, dan ben je klaar. Anders: terug naar blok 1
--  van bestand 14 voor het volgende nummer.
-- ══════════════════════════════════════════════════════════════
-- ─────────────────────────── knip ───────────────────────────
with
mijn as (select id from auth.users where email = 'evan.vansertima001@gmail.com'),
controles as (
  select 1 as nr, 'staat jouw account er nog?' as controle,
         case when exists (select 1 from mijn) then 'ja' else 'NEE' end as gevonden,
         exists (select 1 from mijn) as goed
  union all
  select 2, 'ben je nog lid van minstens één vereniging?',
         coalesce((select count(*)::text from public.leden l
                   where l.gebruiker_id = (select id from mijn)), '0') || ' vereniging(en)',
         coalesce((select count(*) from public.leden l
                   where l.gebruiker_id = (select id from mijn)), 0) > 0
  union all
  select 3, 'hoeveel teams hangen er onder jouw verenigingen?',
         coalesce((select count(*)::text from public.teams t
                   where t.club_id in (select l.club_id from public.leden l
                                       where l.gebruiker_id = (select id from mijn))
                     and t.verwijderd_op is null), '0') || ' team(s)',
         coalesce((select count(*) from public.teams t
                   where t.club_id in (select l.club_id from public.leden l
                                       where l.gebruiker_id = (select id from mijn))
                     and t.verwijderd_op is null), 0) > 0
  union all
  select 4, 'staan de gegevens van die teams er nog?',
         coalesce((select count(*)::text from public.gegevens g
                   where g.team_id in (
                     select t.id from public.teams t
                     where t.club_id in (select l.club_id from public.leden l
                                         where l.gebruiker_id = (select id from mijn)))), '0')
         || ' blok(ken)',
         coalesce((select count(*) from public.gegevens g
                   where g.team_id in (
                     select t.id from public.teams t
                     where t.club_id in (select l.club_id from public.leden l
                                         where l.gebruiker_id = (select id from mijn)))), 0) > 0
)
select controle, gevonden, oordeel from (
  select nr, controle, gevonden,
         case when goed then 'in orde' else 'LET OP' end as oordeel
  from controles
  union all
  select 10, '───────────────────────────────────────────────────','',''
  union all
  select 11, 'accounts over naast dat van jou',
         (select count(*)::text from auth.users
           where email <> 'evan.vansertima001@gmail.com'), ''
  union all
  select 12, 'verenigingen zonder ook maar één lid',
         (select count(*)::text from public.clubs c
           where not exists (select 1 from public.leden l where l.club_id = c.id)), ''
  union all
  select 13, 'Staan beide tellers op 0? Dan ben je klaar.','',''
  union all
  select 14, 'Staat er nog een account? Terug naar blok 1 van 14.','',''
  union all
  select 15, 'Staat er nog een vereniging zonder leden? Naar blok 5.','',''
) t order by t.nr;
-- ─────────────────────────── knip ───────────────────────────



-- ══════════════════════════════════════════════════════════════
--  BLOK 5 — verenigingen waar niemand meer in zit
--  ─────────────────────────────────────────────────────────────
--  DIT GOOIT WEG. Doe dit als láátste, pas als je alle accounts
--  hebt opgeruimd die weg mochten.
--
--  WAAROM DIT APART MOET
--  verwijder_account() ruimt alleen verenigingen op die aan een
--  account hingen. Een vereniging waar helemáál niemand meer in
--  zit, hangt nergens aan — daar komt ook niemand meer bij, ook jij
--  niet, want de leesregels laten alleen verenigingen zien waar je
--  lid van bent. Zulke verenigingen zijn waarschijnlijk ontstaan
--  door de fout waardoor iedereen een vereniging kon aanmaken
--  zonder in te loggen, of door een test die halverwege stopte.
--  Ze zijn onzichtbaar, ze doen niets, en ze tellen wel mee.
--
--  HET GAAT IN TWEE STAPPEN. DOE ZE ALLEBEI.
--
--  5a KIJKEN. Selecteer het eerste blok tussen de stippellijnen en
--     klik op Run. Je ziet welke verenigingen het zijn en hoeveel
--     teams eraan hangen. Staat er iets bij dat je herkent als een
--     échte vereniging, ga dan NIET verder — dan is er iets anders
--     aan de hand en moet je dat eerst uitzoeken. Zie je hier niets
--     (nul regels), dan is er niets te doen en sla je 5b over.
--
--  5b WEGHALEN. Alleen als 5a je niets liet schrikken. Je ziet
--     daarna een lijstje met de namen die zijn verdwenen, en
--     daaronder "DELETE" met een aantal.
--
--  De voorwaarde in 5b is woord voor woord dezelfde als die in 5a.
--  Dat is met opzet: wat je in 5a ziet, is precies wat in 5b weg
--  gaat. Geen enkele vereniging waar jij lid van bent kan hierdoor
--  geraakt worden, want dan is er per definitie een lid.
-- ══════════════════════════════════════════════════════════════

-- ── 5a. KIJKEN ──────────────────────────────────────────────
-- ─────────────────────────── knip ───────────────────────────
select c.naam           as vereniging,
       c.id             as nummer,
       to_char(c.gemaakt_op,'DD-MM-YYYY') as aangemaakt,
       (select count(*) from public.teams t where t.club_id = c.id) as teams,
       (select count(*) from public.gegevens g
         join public.teams t on t.id = g.team_id
        where t.club_id = c.id) as blokken_gegevens
from public.clubs c
where not exists (select 1 from public.leden l where l.club_id = c.id)
order by c.gemaakt_op;
-- ─────────────────────────── knip ───────────────────────────

-- ── 5b. WEGHALEN ────────────────────────────────────────────
-- ─────────────────────────── knip ───────────────────────────
delete from public.clubs c
where not exists (select 1 from public.leden l where l.club_id = c.id)
returning c.naam as deze_vereniging_is_verwijderd;
-- ─────────────────────────── knip ───────────────────────────



-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  DAT KAN HIER NIET. Dit is het enige bestand in deze map zonder
--  terugdraaiblok, en dat is geen vergetelheid: een verwijdering
--  uit een database is definitief. 11, 12 en 13 konden terug omdat
--  ze niets weggooiden.
--
--  Wat je wél hebt:
--    · het afschrift uit blok 2, als je dat hebt bewaard. Daar
--      staat elke regel in die er voor het opruimen was.
--    · de dagelijkse back-up van Supabase (Database → Backups).
--      Die zet álles terug naar dat moment, dus ook het werk dat
--      je daarna in de app hebt gedaan. Dat is een noodgreep, geen
--      ongedaan-maken.
--
--  Daarom de volgorde die hierboven staat: eerst kijken, dan een
--  afschrift, dan één account, dan weer kijken. Niet omdat het
--  zorgvuldig staat, maar omdat dit het enige moment is waarop je
--  een vergissing nog klein kunt houden.
--
--
--  IS DIT GETEST?
--  Ja, op een wegwerp-database: tests/opruimen-accounts.test.sh.
--  Die bootst dit schema na met één echt account (FC Harlingen,
--  JO19-2) en drie nepaccounts, en toont aan dat:
--    · het overzicht uit blok 1 het juiste laat zien
--    · verwijder_account een nepaccount, zijn vereniging, zijn
--      teams, zijn gegevens en zijn abonnement weghaalt
--    · het echte account en JO19-2 daarbij niet geraakt worden
--    · de functie weigert als je jouw eigen nummer opgeeft
--    · de functie weigert zonder de set_config-regel
--    · een gedeelde vereniging blijft staan
--    · blok 5 een vereniging zonder leden opruimt, mét haar teams
--      en gegevens
--  En met opzettelijk teruggezette fouten: haal de cascade weg,
--  dan blijven de gegevens wél als wees achter en wordt blok 0
--  rood. Een controle die nooit rood wordt, controleert niets.
-- ══════════════════════════════════════════════════════════════
