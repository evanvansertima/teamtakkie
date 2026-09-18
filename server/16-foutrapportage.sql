-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — foutrapportage uit productie
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná 03-beheer.sql (dit bestand gebruikt is_beheerder(),
--  die daar wordt aangemaakt). Plak dit hele bestand in de SQL
--  Editor van Supabase en klik op Run. Onderaan staat een
--  controleblok; daar hoort overal "in orde" te staan.
--
--  WAAROM DIT ER MOET ZIJN
--  Er is vandaag geen enkele manier om te weten dat iemand een
--  witte pagina of een crash zag. De app draait in de browser van
--  een trainer langs de lijn; als React vastloopt, ziet niemand dat
--  behalve die ene trainer, en die stuurt geen foutrapport — die
--  sluit de tab en belt niet.
--
--  Dit bestand zet daarvoor één tabel neer: foutmeldingen. De app
--  zelf (het scherm dat een fout vangt en hierheen stuurt) is geen
--  onderdeel van dit bestand — dat is latere, aparte kliek werk voor
--  Fenna in online/index.html.
--
--  WAAROM EEN EIGEN TABEL EN GEEN EXTERNE DIENST
--  Evan heeft bewust gekozen tegen een dienst als Sentry: daar gaan
--  foutmeldingen (inclusief stukjes van wat er op het scherm stond
--  toen het misging) naar een server van een derde partij, en in
--  deze app staan namen en geboortedata van minderjarigen. Zelf
--  bouwen naar de eigen Supabase houdt die gegevens op één plek.
--
--  TWEE KEUZES DIE AL GEMAAKT ZIJN (niet opnieuw ter discussie)
--    · Bewaartermijn: 30 dagen. Zie DEEL 3 hieronder.
--    · Deze tabel mag beschreven worden door een bezoeker die niet
--      is ingelogd (rol "anon"). Een crash kan namelijk vóórdat
--      iemand inlogt gebeuren — bijvoorbeeld een witte pagina op het
--      inlogscherm zelf. Dit is de EERSTE plek in dit hele project
--      met een insert-regel voor anon; zie DEEL 2 voor waarom dat
--      hier veilig is.
--
--  WAAROM DEZE TABEL BEWUST GEEN CLUB_ID / TEAM_ID / GEBRUIKER_ID
--  HEEFT
--  Een foutmelding kan vóór het inloggen ontstaan, dus is er vaak
--  nog geen gebruiker om aan te koppelen. Belangrijker: een tabel
--  zonder koppeling aan een account is een tabel die nooit "de
--  gegevens van club X" kan bevatten, en dat is precies waarom een
--  bezoeker zonder account hem mag beschrijven zonder dat dit een
--  nieuw lek in de ledengegevens opent. In plaats daarvan krijgt de
--  browser zelf een willekeurige, betekenisloze apparaat_id (een
--  losse uuid, door de app zelf verzonnen, nergens anders aan
--  gekoppeld) — genoeg om te zien "dit ene apparaat crasht steeds
--  opnieuw", niet genoeg om te zien wie dat is.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 1 — DE TABEL
--  ─────────────────────────────────────────────────────────────
--  Elke tekstkolom heeft een harde lengtegrens. Dat is geen
--  smaakkeuze: het is de eerste verdedigingslinie tegen misbruik
--  van een tabel die zonder inlog te beschrijven is (zie DEEL 2).
--  Er is met opzet GEEN los "extra"-veld (bijvoorbeeld jsonb) waar
--  alsnog vrije, ongelimiteerde data in zou kunnen — elke kolom die
--  hier staat is alles wat een client ooit kan opslaan.
-- ══════════════════════════════════════════════════════════════
create table if not exists public.foutmeldingen (
  id           uuid primary key default gen_random_uuid(),

  -- De foutmelding zelf, bijvoorbeeld "Cannot read properties of
  -- undefined (reading 'map')". Verplicht: zonder tekst heeft een
  -- rij geen enkele waarde.
  bericht      text not null
               check (char_length(bericht) > 0 and char_length(bericht) <= 300),

  -- De stack trace, als de browser er een meegeeft. Niet elke fout
  -- heeft er een (een afgewezen netwerkverzoek bijvoorbeeld niet),
  -- vandaar dat dit veld wél mag ontbreken.
  stack        text
               check (stack is null or char_length(stack) <= 2000),

  -- Een vaste, korte schermnaam uit de navigatie van de app (denk
  -- aan "wedstrijden" of "opkomst"), GEEN vrije tekst. Kan leeg zijn
  -- bij een opstartfout: dan is er nog geen scherm gekozen.
  scherm       text
               check (scherm is null or char_length(scherm) <= 50),

  -- Een losse, betekenisloze uuid die de browser zelf verzint (bv.
  -- crypto.randomUUID(), eenmalig bewaard in localStorage). GEEN
  -- koppeling aan een account, team of club — vandaar dat die
  -- kolommen hier bewust ontbreken. Verplicht, want zonder dit werkt
  -- de snelheidsgrens in DEEL 2 niet.
  apparaat_id  uuid not null,

  -- Het versienummer van de app zoals die in de browser draaide,
  -- bijvoorbeeld "34.2". Handig om te zien of een fout al is
  -- opgelost in een nieuwere versie.
  app_versie   text
               check (app_versie is null or char_length(app_versie) <= 30),

  -- Browsernaam + besturingssysteemfamilie, bijvoorbeeld
  -- "Safari / iOS". Nadrukkelijk NIET de volledige user-agent-
  -- string: die bevat vaak genoeg bijzonderheden (schermresolutie,
  -- exacte OS-build) om samen met een IP-adres iemand persoonlijk
  -- te kunnen herkennen, en dat is meer dan hiervoor nodig is.
  browser_info text
               check (browser_info is null or char_length(browser_info) <= 100),

  -- Een vaste categorie, bijvoorbeeld "render-fout", "netwerkfout",
  -- "opstartfout" of "onafgehandelde-promise". Met opzet geen
  -- gesloten lijst (geen "check ... in (...)"): welke categorieën
  -- er zijn, bepaalt Fenna's kant in online/index.html, en die kan
  -- zonder een wijziging hier een nieuwe categorie gaan sturen.
  fouttype     text not null
               check (char_length(fouttype) <= 30),

  -- Wanneer de rij is aangemaakt. Standaard now(), en de trigger
  -- hieronder overschrijft elke waarde die een client zelf meestuurt
  -- — de server bepaalt het tijdstip, nooit de client. Dat voorkomt
  -- dat iemand de snelheidsgrens omzeilt door foutmeldingen met een
  -- verzonnen, oud tijdstip te versturen.
  aangemaakt_op timestamptz not null default now()
);

comment on table public.foutmeldingen is
  'Crashmeldingen uit de browser, zonder koppeling aan een account. Bewaartermijn 30 dagen, zie public.ruim_foutmeldingen_op().';

-- Voor de snelheidsgrens in DEEL 2 (tellen per apparaat_id, laatste
-- uur) en voor het opschonen in DEEL 3 (alles ouder dan 30 dagen).
-- Zonder deze index doorzoekt elke insert en elke opschoonbeurt de
-- hele tabel.
create index if not exists foutmeldingen_apparaat_tijd
  on public.foutmeldingen (apparaat_id, aangemaakt_op);
create index if not exists foutmeldingen_tijd
  on public.foutmeldingen (aangemaakt_op);

alter table public.foutmeldingen enable row level security;

-- ── De server bepaalt het tijdstip, niet de client ────────────
--  "default now()" is genoeg zolang de client het veld gewoon
--  weglaat. Maar niets houdt een client tegen om zelf een
--  aangemaakt_op mee te sturen — en met een verzonnen tijdstip in
--  het verleden zou de telling in DEEL 2 (die kijkt naar het
--  afgelopen uur) hem nooit zien. Deze trigger zet het veld daarom
--  hard op now(), wat de client ook meestuurt.
create or replace function public.foutmelding_tijd_vastzetten()
returns trigger language plpgsql as $$
begin
  new.aangemaakt_op := now();
  return new;
end $$;

drop trigger if exists foutmeldingen_tijd_vast on public.foutmeldingen;
create trigger foutmeldingen_tijd_vast
  before insert on public.foutmeldingen
  for each row execute function public.foutmelding_tijd_vastzetten();


-- ══════════════════════════════════════════════════════════════
--  DEEL 2 — WIE MAG WAT
-- ══════════════════════════════════════════════════════════════

-- ── Aanmaken: iedereen, ook zonder inlog ──────────────────────
--  Dit is de eerste "to anon"-insert-regel in dit hele project.
--  Dat verdient uitleg over waarom het hier wél kan, terwijl overal
--  elders (clubs, leden, teams, gegevens) een bezoeker zonder
--  account precies nul mag.
--
--  Overal elders zou een open insert-regel een bezoeker een club,
--  een team of andermans gegevens laten aanmaken — dingen die geld
--  kosten (een pakketlimiet) of iemands eigendom zijn. Hier niet:
--
--    1. Er valt niets te lezen. Er komt zo meteen wél een
--       select-regel bij, maar die staat alleen open voor
--       is_beheerder(). Een bezoeker die hier schrijft, kan zijn
--       eigen rij (of die van iemand anders) nooit terugzien.
--    2. Er is geen koppeling naar een club, team of gebruiker om te
--       misbruiken — zie de uitleg bovenaan dit bestand.
--    3. Elke kolom heeft een harde lengtegrens (DEEL 1). Iemand kan
--       deze tabel dus niet gebruiken om willekeurig grote stukken
--       tekst op te slaan.
--    4. De snelheidsgrens hieronder zet een harde bovengrens op hoe
--       vaak één apparaat_id mag schrijven.
--
--  Wat dit NIET tegenhoudt: iemand die met opzet duizend
--  verschillende apparaat_id's verzint, krijgt duizend keer zijn
--  eigen budget van twintig. Dat is een netwerkniveau-vraagstuk
--  (bijvoorbeeld een grens per IP-adres bij Supabase/Cloudflare),
--  geen databaseregel — een tabel kan geen IP-adres zien. Wat deze
--  regel wél tegenhoudt, en waar hij voor gebouwd is: één kapotte
--  app die in een oneindige lus foutmeldingen blijft versturen.
--
--  BELANGRIJK VOOR WIE DE CLIENT BOUWT (Fenna, later, apart werk):
--  de app mag de zojuist geschreven rij NIET terugvragen. Een
--  Supabase-insert die met ".select()" is aangeroepen doet intern
--  een "insert ... returning", en Postgres toetst een teruggegeven
--  rij ook aan de select-regel hieronder — die alleen is_beheerder()
--  toelaat. Voor anon en voor een gewone gebruiker faalt zo'n
--  insert dus ALTIJD, met dezelfde foutmelding als een geweigerde
--  snelheidsgrens ("new row violates row-level security policy"),
--  ook al is er verder niets mis. Getest en bevestigd in
--  tests/foutmeldingen.test.sql, scenario 12. De client roept dus
--  gewoon ".insert(...)" aan, zonder ".select()" erachteraan.
--
--  RLS kan het tellen van bestaande rijen niet in een simpele
--  "using"-clausule doen (die geldt namelijk per rij, niet "hoeveel
--  rijen bestaan er al"). Daarom staat de telling hier als subquery
--  in de "with check": die wordt per nieuwe rij uitgerekend, ná de
--  trigger hierboven (dus met het echte, server-bepaalde tijdstip).
--
--  Die telling kan NIET rechtstreeks "select count(*) from
--  foutmeldingen ..." in de with check zijn. Dat lijkt vanzelf-
--  sprekend, maar loopt hier vast op iets dat pas bij het testen
--  zichtbaar werd: zo'n subquery is zelf ook gewoon een lezing van
--  deze tabel, en valt dus onder de select-regel hieronder — die
--  alleen is_beheerder() toelaat. Voor de rol anon (en voor een
--  gewone ingelogde gebruiker) zou die subquery dan altijd 0
--  opleveren, ongeacht hoeveel rijen er al staan, en de grens zou
--  in de praktijk niets tegenhouden. Vandaar dit hulpfunctietje:
--  net als is_beheerder() en mag_schrijven() elders in dit project
--  is hij "security definer", zodat hij dwars door de select-regel
--  heen mag tellen, terwijl de tabel zelf voor anon nog steeds
--  potdicht blijft voor gewoon lezen.
create or replace function public.foutmeldingen_recent_aantal(p_apparaat_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.foutmeldingen
  where apparaat_id = p_apparaat_id
    and aangemaakt_op > now() - interval '1 hour'
$$;
grant execute on function public.foutmeldingen_recent_aantal(uuid) to anon, authenticated;

drop policy if exists foutmeldingen_aanmaken on public.foutmeldingen;
create policy foutmeldingen_aanmaken
  on public.foutmeldingen
  for insert
  to anon, authenticated
  with check (
    public.foutmeldingen_recent_aantal(foutmeldingen.apparaat_id) < 20
  );

-- ── Lezen: alleen de beheerder ─────────────────────────────────
--  Geen enkele club, trainer of lid krijgt hier ooit leesrecht —
--  dit is geen scherm in de app, het is Evans eigen foutenlog.
--  is_beheerder() komt uit 03-beheer.sql; hergebruikt, niet
--  opnieuw geschreven.
drop policy if exists foutmeldingen_lezen on public.foutmeldingen;
create policy foutmeldingen_lezen
  on public.foutmeldingen
  for select
  using (public.is_beheerder());

-- ── Wijzigen en weggooien: voor niemand, via de gewone rollen ──
--  Er staat bewust geen "for update" en geen "for delete" policy.
--  Zonder een regel voor een handeling weigert Postgres die
--  handeling voor iedereen behalve de tabel-eigenaar — precies
--  zoals clubs vóór 08-bewaartermijn.sql geen enkele delete-regel
--  had. Een foutmelding die eenmaal is geschreven, blijft dus
--  onveranderd staan totdat de opschoonfunctie in DEEL 3 hem
--  verwijdert; die draait met verhoogde rechten (security definer)
--  en gaat om die reden niet via deze policies.


-- ══════════════════════════════════════════════════════════════
--  DEEL 3 — DE BEWAARTERMIJN: 30 DAGEN
--  ─────────────────────────────────────────────────────────────
--  WAAROM 30 DAGEN EN NIET "VOOR ALTIJD"
--  Deze tabel is bedoeld om te zien of een gebruiker vándaag of
--  deze week een witte pagina zag, niet om een jarenlang archief
--  van crashes op te bouwen. Hoe langer meldingen blijven staan,
--  hoe meer er zich kan opstapelen van dingen die — hoewel er geen
--  club_id/team_id/gebruiker_id in deze tabel staat — soms tóch een
--  glimp van iets persoonlijks kunnen bevatten: een stack trace kan
--  in theorie een stukje van wat er op het scherm stond citeren.
--  Dertig dagen is ruim genoeg om een terugkerend probleem te
--  herkennen en veel korter dan "voor altijd bewaren, voor het
--  geval dat".
--
--  WAAROM DIT NU HANDMATIG IS EN NIET AUTOMATISCH
--  De functie hieronder ruimt op zodra jij hem aanroept — in de SQL
--  Editor, net als elk ander bestand in server/. Een automatische
--  planning (bijvoorbeeld met de Postgres-extensie pg_cron) is een
--  aparte, latere afweging: dat is nu niet gevraagd, en het voegt
--  een nieuw ding toe dat kan mislukken zonder dat iemand het merkt
--  — precies het probleem dat dit hele bestand juist oplost. Tot die
--  afweging gemaakt is, run jij dit blok af en toe zelf, bijvoorbeeld
--  telkens als je toch in de SQL Editor bent.
--
--  WAAROM SECURITY DEFINER
--  Zonder verhoogde rechten zou deze functie tegen de "geen update/
--  delete"-regels uit DEEL 2 aanlopen — precies de regels die hier
--  ook horen te gelden voor iedere gewone rol. De functie controleert
--  daarom eerst zelf of jij beheerder bent, en weigert hardop als dat
--  niet zo is; ook een ingelogde, niet-beheerder gebruiker kan hem
--  dus niet gebruiken om het hele foutenlog leeg te vegen.
create or replace function public.ruim_foutmeldingen_op()
returns table (verwijderd bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  aantal bigint;
begin
  if not public.is_beheerder() then
    raise exception 'Alleen voor beheerders';
  end if;

  delete from public.foutmeldingen
  where aangemaakt_op < now() - interval '30 days';
  get diagnostics aantal = row_count;

  return query select aantal;
end $$;

grant execute on function public.ruim_foutmeldingen_op() to authenticated;

comment on function public.ruim_foutmeldingen_op() is
  'Verwijdert foutmeldingen ouder dan 30 dagen. Handmatig draaien in de SQL Editor; alleen voor beheerders.';


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is alles goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  Hieronder komt een tabel terug. In de kolom "oordeel" hoort
--  overal "in orde" te staan. Staat er ergens "LET OP", draai dit
--  bestand dan nog een keer; twee keer draaien kan geen kwaad.
-- ══════════════════════════════════════════════════════════════
select 'de tabel foutmeldingen bestaat' as controle,
       case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                         where n.nspname = 'public' and c.relname = 'foutmeldingen')
            then 'ja' else 'nee' end as gevonden,
       case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                         where n.nspname = 'public' and c.relname = 'foutmeldingen')
            then 'in orde' else 'LET OP' end as oordeel
union all
select 'row level security staat aan',
       case when (select relrowsecurity from pg_class where oid = 'public.foutmeldingen'::regclass)
            then 'aan' else 'uit' end,
       case when (select relrowsecurity from pg_class where oid = 'public.foutmeldingen'::regclass)
            then 'in orde' else 'LET OP' end
union all
select 'insert mag door anon én authenticated',
       coalesce((select string_agg(distinct pg_roles.rolname, ', ')
                 from pg_policy, unnest(polroles) r join pg_roles on pg_roles.oid = r
                 where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'a'), 'geen'),
       case when exists (select 1 from pg_policy
                         where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'a'
                           and 'anon'::regrole = any(polroles)
                           and 'authenticated'::regrole = any(polroles))
            then 'in orde' else 'LET OP' end
union all
select 'insert-regel bevat de snelheidsgrens (< 20)',
       case when (select pg_get_expr(polwithcheck, polrelid) from pg_policy
                  where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'a' limit 1)
                 like '%< 20%' then 'ja' else 'nee' end,
       case when (select pg_get_expr(polwithcheck, polrelid) from pg_policy
                  where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'a' limit 1)
                 like '%< 20%' then 'in orde' else 'LET OP' end
union all
select 'select is alleen voor is_beheerder()',
       coalesce((select pg_get_expr(polqual, polrelid) from pg_policy
                 where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'r' limit 1), 'geen regel'),
       case when (select pg_get_expr(polqual, polrelid) from pg_policy
                  where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'r' limit 1)
                 like '%is_beheerder%' then 'in orde' else 'LET OP' end
union all
select 'geen update-regel aanwezig',
       coalesce((select string_agg(polname, ', ') from pg_policy
                 where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'w'), 'geen'),
       case when not exists (select 1 from pg_policy
                             where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'w')
            then 'in orde' else 'LET OP' end
union all
select 'geen delete-regel aanwezig (alleen de functie mag verwijderen)',
       coalesce((select string_agg(polname, ', ') from pg_policy
                 where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'd'), 'geen'),
       case when not exists (select 1 from pg_policy
                             where polrelid = 'public.foutmeldingen'::regclass and polcmd = 'd')
            then 'in orde' else 'LET OP' end
union all
select 'de opschoonfunctie bestaat en draait met verhoogde rechten',
       case when (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'ruim_foutmeldingen_op')
            then 'security definer' else 'security invoker' end,
       case when (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'ruim_foutmeldingen_op')
            then 'in orde' else 'LET OP' end
union all
select 'de trigger zet aangemaakt_op vast op de server',
       coalesce((select 'ja' from pg_trigger where tgname = 'foutmeldingen_tijd_vast' limit 1), 'nee'),
       case when exists (select 1 from pg_trigger where tgname = 'foutmeldingen_tijd_vast')
            then 'in orde' else 'LET OP' end
order by 1;


-- ══════════════════════════════════════════════════════════════
--  HET OPSCHONEN ZELF — apart draaien, wanneer jij dat wilt
--  ─────────────────────────────────────────────────────────────
--  Eerst kijken hoeveel rijen ouder zijn dan 30 dagen (dit gooit
--  niets weg), dan pas de functie aanroepen, dan nog eens kijken.
--  Dat laatste getal hoort na afloop 0 te zijn (of gelijk aan wat
--  het al was min wat er hierboven bij "verwijderd" stond).
-- ══════════════════════════════════════════════════════════════

-- ── VÓÓR het opschonen ─────────────────────────────────────────
select count(*) as ouder_dan_30_dagen_voor_opschonen
from public.foutmeldingen
where aangemaakt_op < now() - interval '30 days';

-- ── HET OPSCHONEN — haal de streepjes weg, selecteer alleen deze
--    ene regel en klik op Run ─────────────────────────────────
-- select * from public.ruim_foutmeldingen_op();

-- ── NÁ het opschonen ───────────────────────────────────────────
select count(*) as ouder_dan_30_dagen_na_opschonen
from public.foutmeldingen
where aangemaakt_op < now() - interval '30 days';
