-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — wisselen tussen Coach en Club (de databasekant)
--  ─────────────────────────────────────────────────────────────
--  WAT DIT DOET, IN GEWONE TAAL
--  Een vereniging die al betaalt kan hiermee overstappen naar het
--  andere pakket:
--
--    · OMLAAG (Club → Coach) is gratis en gaat meteen in. De einddatum
--      blijft staan; de club heeft die periode immers al betaald.
--    · OMHOOG (Coach → Club) kost het prijsverschil over de dagen die
--      nog over zijn — naar rato dus. Is dat minder dan € 2,50, dan is
--      het gratis (dan kost incasseren meer gedoe dan het opbrengt).
--
--  Draai dit ná 01-schema.sql, 03-beheer.sql, 06-pakketten.sql,
--  17-free-serverdata.sql, 18-betalingen.sql en 19-mollie-subscription.sql.
--
--  Plak het hele bestand in de SQL Editor van Supabase en klik op Run.
--  Onderaan staat een controleblok; daar hoort overal "in orde" te
--  staan. Twee keer draaien kan geen kwaad: alles hier is herhaalbaar
--  (create or replace, add column if not exists, create table if not
--  exists).
--
--  De SQL Editor toont maar één uitslag tegelijk (de laatste). Wil je
--  het controleblok apart zien, selecteer dan alleen dat ene blok — van
--  "select" tot en met de puntkomma — en klik op Run. Het verandert
--  niets.
--
--  Helemaal onderaan staat een TERUGDRAAIBLOK.
--
--  ─────────────────────────────────────────────────────────────
--  DE FOUT DIE DIT REPAREERT (gevonden door Evan, 19 september 2026)
--
--  Elke klik op "Overstappen" startte tot nu toe een gewone nieuwe
--  betaling. En een gewone betaling telt in public.verwerk_betaling()
--  een hele periode op bij geldig_tot. Twee keer klikken gaf dus twee
--  maanden extra in plaats van één wissel van pakket — een stapeling,
--  geen overstap. Er staat sinds die dag een noodrem op: de edge
--  function betaling-starten weigert met 409 zodra een club al een
--  lopend betaald pakket heeft. Dit bestand is het echte werk dat die
--  noodrem overbodig maakt.
--
--  DE ZIN WAAR ALLES OM DRAAIT, EN DIE IN TWEE SCENARIO'S GEMETEN WORDT:
--
--      BIJ EEN WISSEL BLIJFT geldig_tot ONGEWIJZIGD.
--
--  Geen enkele functie in dit bestand raakt geldig_tot aan. Niet bij een
--  downgrade, niet bij een gratis upgrade, en ook niet na een geslaagde
--  betaling voor een upgrade. Wie hier ooit "voor de netheid" de
--  verlengingslogica uit verwerk_betaling() overneemt, bouwt precies de
--  fout terug die Evan vond.
--
--  DE TWEEDE ZIN: EEN WISSELBETALING DIE WIJ NIET ZELF HEBBEN
--  AANGEVRAAGD, BESTAAT NIET
--
--  verwerk_wissel_betaling() kent een pakket ALLEEN toe als er al een
--  openstaande claim in public.abonnement_wissels staat met precies dit
--  betaalnummer. Bestaat die claim niet, dan gebeurt er niets — geen
--  fout, geen pakket. De metadata van een Mollie-betaling is nooit
--  bewijs: die kan de aanvrager zelf meegeven.
--
--  ─────────────────────────────────────────────────────────────
--  WAT HIER WEL EN NIET IN ZIT
--
--  WEL: de twee nieuwe kolommen bij het abonnement, de tabel met
--  wisselpogingen (het bewijsstuk bij een geschil), de datums voor de
--  verrekening, en de vier functies die de servercode aanroept.
--
--  NIET: de rekensom zelf. Hoeveel een upgrade kost, wordt uitgerekend
--  in supabase/functions/_gedeeld/mollie.ts (verrekeningCent) en daar
--  ook getoetst. Dat is met opzet één plek: de prijzen staan al in dat
--  bestand, en een tweede prijslijst in de database zou vroeg of laat
--  een ander bedrag opleveren dan wat de club op zijn scherm zag.
--
--  NIET: praten met Mollie. Dat er na een wissel een PATCH naar het
--  nieuwe incassobedrag moet, en dat abonnementen.mollie_bedrag_cent
--  pas DAARNA mag worden bijgewerkt, is werk van de edge functions.
--
--  ─────────────────────────────────────────────────────────────
--  DE TESTS DIE HIERBIJ HOREN
--
--      sh tests/sql-lokaal/draai.sh tests/abonnement-wisselen.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql \
--          server/19-mollie-subscription.sql server/20-abonnement-wisselen.sql
--
--  37 scenario's, geschreven door Tess vóórdat er één regel van dit
--  bestand bestond. In de kolom "oordeel" hoort overal ZOALS VERWACHT
--  te staan. De rekensom en het oordeel (mag deze club wisselen, en is
--  het gratis) staan in Deno:
--
--      deno test supabase/functions/
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 1 — TWEE KOLOMMEN BIJ HET ABONNEMENT
--  ─────────────────────────────────────────────────────────────
--  termijn — ZONDER DEZE KOLOM IS ER GEEN VERREKENING MOGELIJK
--
--  Naar rato rekenen betekent: hoeveel dagen van deze periode zijn er
--  nog over, van de hoeveel? Dat tweede getal hangt af van de vraag of
--  de club per maand of per jaar betaalt, en dat stond tot nu toe
--  nergens bij het abonnement — alleen bij de losse betalingen. Een
--  jaarklant zou dan als maandklant worden verrekend, en dat scheelt
--  een factor twaalf.
--
--  De kolom mag leeg blijven: een vereniging die van Evan met de hand
--  onbeperkt toegang heeft gekregen betaalt niets en heeft dus geen
--  termijn. Leeg betekent hier eerlijk "niet bekend" en nooit "maand" —
--  zie wissel_gegevens(), die dan géén periodelengte teruggeeft en de
--  upgrade daarmee tegenhoudt in plaats van er een slag naar te slaan.
--
--  mollie_bedrag_cent — WAT WIJ DENKEN DAT MOLLIE VOLGENDE KEER
--  AFSCHRIJFT
--
--  Na een wissel moet bij Mollie het bedrag van de doorlopende incasso
--  worden aangepast. Lukt die aanpassing niet, dan staat er hier één
--  pakket in de database en incasseert Mollie het andere bedrag. Dat is
--  het soort verschil dat maandenlang niemand ziet: bij een te laag
--  bedrag klaagt niemand, en bij een te hoog bedrag klaagt precies één
--  club — als hij het merkt.
--
--  Deze kolom is de enige plek waar dat verschil ooit zichtbaar wordt.
--  Daarom geldt er één harde regel: hij wordt ALLEEN gevuld nádat
--  Mollie een wijziging heeft BEVESTIGD, nooit vooruitlopend. Een
--  bedrag dat we "van plan waren" is hier erger dan een leeg veld,
--  want dan meldt wissel_controle() hieronder "in orde" terwijl er
--  niets is doorgevoerd.
-- ══════════════════════════════════════════════════════════════

alter table public.abonnementen add column if not exists termijn text
  check (termijn is null or termijn in ('maand','jaar'));

alter table public.abonnementen add column if not exists mollie_bedrag_cent int;

comment on column public.abonnementen.termijn is
  'Betaalt deze vereniging per maand of per jaar? Leeg = niet bekend (bijvoorbeeld bij onbeperkte toegang die met de hand is gezet). Nodig om bij een wissel de periodelengte te kennen; zonder termijn geeft wissel_gegevens() geen periodelengte terug en weigert de servercode de upgrade.';

comment on column public.abonnementen.mollie_bedrag_cent is
  'Het bedrag in CENTEN dat Mollie volgens ons de volgende keer afschrijft. Alleen te vullen NA een door Mollie bevestigde wijziging van de doorlopende incasso — nooit vooraf. public.wissel_controle() vergelijkt dit met de prijs van het pakket; dat is het enige punt in de hele keten waar een stille onderfacturering zichtbaar wordt.';

-- ── De termijn van bestaande klanten terugzoeken ─────────────
--  Voor iedereen die al betaalt staat de termijn wél in de
--  boekhouding: elke geslaagde betaling heeft hem. We nemen de LAATSTE
--  betaalde regel per vereniging — wie ooit per maand begon en nu per
--  jaar betaalt, hoort op 'jaar' te staan.
--
--  Alleen waar de kolom nog leeg is. Deze regel mag dus opnieuw
--  gedraaid worden zonder een later met de hand gezette waarde te
--  overschrijven.
update public.abonnementen a
   set termijn = b.termijn
  from (select distinct on (bt.club_id)
               bt.club_id, bt.termijn
          from public.betalingen bt
         where bt.status = 'betaald'
           and bt.termijn in ('maand','jaar')
           and bt.club_id is not null
         order by bt.club_id,
                  coalesce(bt.verwerkt_op, bt.betaald_op, bt.aangemaakt_op) desc) b
 where b.club_id = a.club_id
   and a.termijn is null;


-- ══════════════════════════════════════════════════════════════
--  DEEL 2 — DE TABEL MET WISSELPOGINGEN
--  ─────────────────────────────────────────────────────────────
--  Deze tabel doet twee dingen tegelijk, en het tweede is het
--  belangrijkste.
--
--  1. HET BEWIJSSTUK. "Ik heb toch gewisseld?" is een vraag die pas
--     komt als er iets misging. Dan wil je kunnen laten zien: op deze
--     dag, van dit pakket naar dat pakket, voor dit bedrag, over zoveel
--     van zoveel dagen, en dit is er daarna mee gebeurd. Net als bij
--     public.betalingen blijft de rij staan als de club wordt
--     opgeheven (on delete set null) — juist dan heb je hem nodig.
--
--  2. HET SLOT TEGEN TWEE WISSELS TEGELIJK. Dat is de partiële unieke
--     index hieronder: hoogstens één rij per club zonder afgerond_op.
--     Twee tabbladen, een dubbelklik of een trage verbinding leveren
--     anders twee claims en dus twee openstaande betalingen op voor één
--     wissel. Een controle in de functie zelf ("kijk eerst even of er al
--     een wissel loopt") vángt dat niet: twee verzoeken die een paar
--     milliseconden na elkaar binnenkomen zitten allebei in het gat
--     tussen kijken en schrijven. De index kent dat gat niet — de
--     tweede schrijver staat te wachten en krijgt daarna een fout.
--     Scenario 11 van Tess bewijst dat met twee échte, gelijktijdige
--     databaseverbindingen.
--
--  WAAROM "afgerond_op is null" EN NIET status = 'open'
--  Allebei zou kunnen, maar een datumveld kan niet per ongeluk een
--  vierde waarde krijgen. En de index is zo ook meteen leesbaar: staat
--  er een einde bij, dan is de wissel klaar — hoe hij ook is afgelopen.
--
--  GEEN ENKELE SCHRIJFREGEL — DAT ONTBREKEN IS HET SLOT
--  Precies zoals public.betalingen en public.abonnementen. Er staat
--  hieronder alleen een leesregel voor een beheerder. Zonder
--  schrijfregel komt er langs de gewone weg niets binnen, ook niet met
--  een zelfgebouwd verzoek aan de API met de publieke sleutel uit
--  index.html. De enige weg naar binnen zijn de functies hieronder, en
--  die draaien met verhoogde rechten en hebben elk twee sloten.
-- ══════════════════════════════════════════════════════════════

create table if not exists public.abonnement_wissels (
  id                 uuid primary key default gen_random_uuid(),

  -- Net als bij public.betalingen met opzet GEEN "on delete cascade":
  -- het bewijsstuk mag niet verdwijnen met de club.
  club_id            uuid references public.clubs(id) on delete set null,
  -- De naam zoals hij was op het moment van wisselen. Een clubnaam is
  -- geen persoonsgegeven, dus die mag blijven staan als de club weg is
  -- — en zonder deze kolom is zo'n rij een wissel zonder afzender.
  club_naam          text,

  van_pakket         text not null,
  naar_pakket        text not null,
  -- Vrije tekst en met opzet niet 'maand'/'jaar' afgedwongen: bij een
  -- vereniging met onbeperkte toegang is de termijn niet bekend, en
  -- 'onbekend' opschrijven is eerlijker dan een gok vastleggen.
  termijn            text not null,

  soort              text not null check (soort in ('downgrade','upgrade','upgrade_gratis')),

  -- In CENTEN, net als overal in de betaalketen. Bij een downgrade en
  -- bij een gratis upgrade staat hier 0; bij een betaalde upgrade het
  -- bedrag dat we bij Mollie in rekening hebben gebracht.
  bedrag_cent        int  not null default 0,

  -- De twee getallen waar de verrekening op rust, bewaard zoals ze
  -- waren. Zonder die twee is achteraf niet na te rekenen waarom het
  -- bedrag was wat het was.
  resterende_dagen   int,
  totale_dagen       int,

  mollie_betaling_id text,

  status             text not null default 'open'
                     check (status in ('open','klaar','mislukt','afgebroken')),

  aangemaakt_op      timestamptz not null default now(),
  -- Leeg = deze wissel is nog onderweg. Dit veld draagt het slot.
  afgerond_op        timestamptz
);

comment on table public.abonnement_wissels is
  'Eén rij per poging tot wisselen van pakket. Alleen te beschrijven via de wisselfuncties in dit bestand; alleen te lezen door een beheerder. De partiële unieke index op club_id is het slot tegen twee gelijktijdige wissels.';
comment on column public.abonnement_wissels.afgerond_op is
  'Leeg zolang de wissel onderweg is. Dit veld draagt het slot: er kan per vereniging maar één rij tegelijk leeg zijn.';
comment on column public.abonnement_wissels.mollie_betaling_id is
  'Het betaalnummer (tr_…) van de bijbehorende Mollie-betaling, pas ingevuld nádat die betaling bestaat. verwerk_wissel_betaling() kent alleen een pakket toe als hier precies dit nummer staat — een betaling die wij niet zelf als wissel hebben aangevraagd, telt niet als wissel.';

-- ── HET SLOT: hoogstens één wissel ONDERWEG per vereniging ───
--  Let op het woord "onderweg". Een unieke index op club_id zónder de
--  where-clause zou betekenen dat een club maar één keer in zijn leven
--  kan wisselen.
create unique index if not exists abonnement_wissels_een_open_per_club
  on public.abonnement_wissels (club_id) where afgerond_op is null;

-- Eén betaling kan nooit twee wissels voeden.
create unique index if not exists abonnement_wissels_betaling_idx
  on public.abonnement_wissels (mollie_betaling_id) where mollie_betaling_id is not null;

alter table public.abonnement_wissels enable row level security;

-- Met opzet ALLEEN een leesregel, en alleen voor een beheerder. Geen
-- insert, geen update, geen delete — zie de uitleg hierboven.
drop policy if exists abonnement_wissels_lezen on public.abonnement_wissels;
create policy abonnement_wissels_lezen on public.abonnement_wissels for select
  using (public.is_beheerder());

-- De servercode werkt met de service-sleutel en gaat daarmee langs de
-- rij-beveiliging heen. Deze regel staat er expliciet zodat dat niet
-- afhangt van hoe Supabase zijn standaardrechten heeft staan. Voor
-- anon en authenticated verandert hij niets: die worden hoe dan ook
-- door de rij-beveiliging tegengehouden.
grant select, insert, update on public.abonnement_wissels to service_role;


-- ══════════════════════════════════════════════════════════════
--  HET SLOTBLOK DAT ONDER ELKE FUNCTIE HIERONDER ZIT
--  ─────────────────────────────────────────────────────────────
--  Woordelijk overgenomen uit verwerk_betaling() (18-betalingen.sql
--  DEEL 3). Dat is geen luiheid maar het punt zelf: vier functies die
--  dezelfde vraag op vier manieren stellen, geven vroeg of laat vier
--  antwoorden.
--
--  SLOT 1 is het rechtenslot van Postgres, onder elke functie:
--      revoke execute ... from public, anon, authenticated;
--      grant  execute ... to service_role;
--  Postgres geeft bij "create function" standaard EXECUTE aan PUBLIC —
--  dus aan iedere bezoeker, ook zonder account. Zonder die revoke mag
--  letterlijk iedereen deze functies aanroepen. En wie
--  wissel_abonnement() mag aanroepen, zet zijn eigen pakket op club.
--
--  SLOT 2 zit ín de functie: hij kijkt of de aanroeper met de
--  service-sleutel binnenkomt. Dat lijkt dubbelop tot je bedenkt hoe
--  slot 1 verdwijnt: bij een latere "drop function" + "create function"
--  (nodig zodra er ooit een parameter bij komt) krijgt de nieuwe
--  functie weer het standaardrecht voor PUBLIC. Slot 1 staat dan open,
--  zonder foutmelding en zonder dat iemand het ziet.
--
--  Slot 2 gebruikt met opzet een gewone "raise exception" (foutcode
--  P0001) en niet 42501: anders is in een test niet te onderscheiden
--  of slot 1 of slot 2 het tegenhield, en is niet te bewijzen dat er
--  écht twee sloten zijn. Scenario 21c meet precies dat verschil.
--
--  De uitzondering is wissel_status() helemaal onderaan: dat is een
--  LEESfunctie voor de app zelf, en die hoort juist wél door
--  authenticated aangeroepen te worden. Daar doet is_eigenaar() het
--  werk.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 3 — wissel_gegevens(): DE DATUMS
--  ─────────────────────────────────────────────────────────────
--  De rekensom staat in TypeScript, maar de getallen die erin gaan
--  komen hiervandaan. Zitten die ernaast, dan zit het bedrag ernaast —
--  en dat is echt geld.
--
--  DRIE DINGEN DIE HIER MAKKELIJK MISGAAN
--
--  1. EEN MAAND IS GEEN 30 DAGEN. De lengte van DEZE periode hangt af
--     van de einddatum: loopt het abonnement tot 28 februari, dan begon
--     de periode op 28 januari en duurde hij 31 dagen. Daarom rekenen
--     we terug vanaf geldig_tot met een echt interval, en niet met een
--     vast getal.
--
--  2. "VANDAAG" IS NIET current_date. Die geeft de datum in UTC, en
--     Nederland loopt daar één of twee uur op voor. Een club die om
--     half één 's nachts klikt, zou anders op de datum van gisteren
--     wisselen — en dan klopt het aantal resterende dagen niet.
--
--  3. MEER DAGEN OVER DAN DE PERIODE LANG IS. Dat kan echt: een
--     einddatum die met de hand ver vooruit is gezet. Zonder least()
--     rekent de verrekening dan een veelvoud van het prijsverschil.
--
--  GEEN EINDDATUM = GEEN PERIODE. Bij onbeperkte toegang komt er géén
--  getal terug maar leeg. Een 30 verzinnen zou betekenen dat de club
--  betaalt voor een periode die niet bestaat.
-- ══════════════════════════════════════════════════════════════

create or replace function public.wissel_gegevens(p_club uuid)
returns table(
  pakket                 text,
  termijn                text,
  geldig_tot             date,
  totale_dagen           int,
  resterende_dagen       int,
  mollie_klant_id        text,
  mollie_subscription_id text,
  wissel_onderweg        boolean
) language plpgsql security definer set search_path = public as $$
declare
  v_claims text := coalesce(current_setting('request.jwt.claims', true), '');
  v_rol    text;

  v_abo     record;
  v_vandaag date;
  v_stap    interval;
  v_start   date;
  v_over    int;
begin
  -- ── SLOT 2 — alleen de servercode ──────────────────────────
  if v_claims <> '' then
    begin
      v_rol := (v_claims::jsonb ->> 'role');
    exception when others then
      v_rol := null;
    end;
    if v_rol is distinct from 'service_role' then
      raise exception 'wissel_gegevens(): alleen de servercode mag dit aanroepen (rol: %)', coalesce(v_rol, 'onbekend');
    end if;
  elsif session_user not in ('postgres', 'supabase_admin') then
    raise exception 'wissel_gegevens(): alleen de servercode mag dit aanroepen (geen webverzoek, sessie: %)', session_user;
  end if;

  select a.pakket, a.termijn, a.geldig_tot, a.mollie_klant_id, a.mollie_subscription_id
    into v_abo
    from public.abonnementen a
   where a.club_id = p_club;

  -- Geen abonnementsrij: dan zijn er geen feiten. Geen rij terug is
  -- hier het eerlijke antwoord; de servercode leest dat als "deze club
  -- kan hier niets wisselen".
  if not found then
    return;
  end if;

  -- De Nederlandse datum. NIET current_date: zie punt 2 hierboven.
  v_vandaag := (now() at time zone 'Europe/Amsterdam')::date;

  pakket                 := v_abo.pakket;
  termijn                := v_abo.termijn;
  geldig_tot             := v_abo.geldig_tot;
  mollie_klant_id        := v_abo.mollie_klant_id;
  mollie_subscription_id := v_abo.mollie_subscription_id;

  wissel_onderweg := exists (select 1 from public.abonnement_wissels w
                              where w.club_id = p_club and w.afgerond_op is null);

  if v_abo.geldig_tot is null then
    -- Onbeperkt (of gratis): geen periode, dus geen getallen.
    totale_dagen     := null;
    resterende_dagen := null;
  else
    v_stap := case v_abo.termijn
                when 'maand' then interval '1 month'
                when 'jaar'  then interval '1 year'
                else null
              end;

    v_over := v_abo.geldig_tot - v_vandaag;

    if v_stap is null then
      -- Wel een einddatum, maar geen bekende termijn. Dan is de lengte
      -- van de periode onbekend — en dat blijft leeg, want raden wordt
      -- hier geld. Het aantal resterende dagen is wél te zeggen.
      totale_dagen := null;
    else
      v_start      := (v_abo.geldig_tot - v_stap)::date;
      totale_dagen := v_abo.geldig_tot - v_start;
    end if;

    -- Nooit negatief (een verlopen abonnement zou van een upgrade een
    -- teruggave maken) en nooit meer dan de periode lang is.
    resterende_dagen := greatest(least(v_over, coalesce(totale_dagen, v_over)), 0);
  end if;

  return next;
end $$;

comment on function public.wissel_gegevens(uuid) is
  'Geeft de feiten waarop de servercode een wissel beoordeelt: huidig pakket, termijn, einddatum, de lengte van de lopende periode en hoeveel dagen daarvan over zijn (Nederlandse tijd), plus of er al een wissel onderweg is. Rekent zelf niets uit en wijzigt niets.';

revoke execute on function public.wissel_gegevens(uuid) from public, anon, authenticated;
grant  execute on function public.wissel_gegevens(uuid) to service_role;


-- ══════════════════════════════════════════════════════════════
--  DEEL 4 — wissel_abonnement(): DE GRATIS WISSEL
--  ─────────────────────────────────────────────────────────────
--  Voor een downgrade (altijd gratis) en voor een upgrade die onder de
--  drempel van € 2,50 uitkomt. Er komt geen betaling aan te pas, dus de
--  wissel is meteen klaar.
--
--  DE CLAIMENDE UPDATE
--      update ... set pakket = p_naar_pakket
--       where club_id = p_club and pakket = p_van_pakket
--
--  Die where-clause met het OUDE pakket erin is het hele idempotentie-
--  verhaal in één regel: raakt hij nul rijen, dan stond het pakket al
--  goed (een dubbelklik, een herhaald verzoek) of staat er iets heel
--  anders. In allebei de gevallen: stil klaar, geen fout. Een
--  foutmelding bij een dubbelklik is een foutmelding voor iets dat
--  gelukt is.
--
--  EN GELDIG_TOT BLIJFT STAAN. De club heeft deze periode al betaald.
--  Wie omlaag gaat krijgt geen geld terug (dat is de afspraak: gratis
--  en per direct), maar verliest ook geen dag.
-- ══════════════════════════════════════════════════════════════

create or replace function public.wissel_abonnement(
  p_club        uuid,
  p_van_pakket  text,
  p_naar_pakket text,
  p_soort       text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_claims text := coalesce(current_setting('request.jwt.claims', true), '');
  v_rol    text;

  v_geraakt int;
  v_termijn text;
begin
  -- ── SLOT 2 — alleen de servercode ──────────────────────────
  if v_claims <> '' then
    begin
      v_rol := (v_claims::jsonb ->> 'role');
    exception when others then
      v_rol := null;
    end;
    if v_rol is distinct from 'service_role' then
      raise exception 'wissel_abonnement(): alleen de servercode mag dit aanroepen (rol: %)', coalesce(v_rol, 'onbekend');
    end if;
  elsif session_user not in ('postgres', 'supabase_admin') then
    raise exception 'wissel_abonnement(): alleen de servercode mag dit aanroepen (geen webverzoek, sessie: %)', session_user;
  end if;

  -- ── Wat er niet te wisselen valt ───────────────────────────
  --  Hier hoort de functie wél te klagen: dit zijn aanroepen die niet
  --  van onze eigen servercode kunnen komen.
  if p_club is null then
    raise exception 'wissel_abonnement(): geen vereniging meegegeven';
  end if;
  if p_soort is null or p_soort not in ('downgrade', 'upgrade_gratis') then
    raise exception 'wissel_abonnement(): deze soort hoort hier niet: % (een betaalde upgrade loopt via start_wissel)', coalesce(p_soort, 'niets');
  end if;
  if p_van_pakket is null or p_van_pakket not in ('coach', 'club') then
    raise exception 'wissel_abonnement(): onbekend pakket om vanaf te wisselen: %', coalesce(p_van_pakket, 'niets');
  end if;
  if p_naar_pakket is null or p_naar_pakket not in ('coach', 'club') then
    raise exception 'wissel_abonnement(): onbekend pakket om naartoe te wisselen: %', coalesce(p_naar_pakket, 'niets');
  end if;

  -- ── De wissel zelf ─────────────────────────────────────────
  --  geldig_tot wordt hier NIET aangeraakt, en mollie_bedrag_cent ook
  --  niet: dat laatste mag pas na een bevestigde wijziging bij Mollie,
  --  en dat gebeurt in de edge function.
  update public.abonnementen
     set pakket = p_naar_pakket
   where club_id = p_club
     and pakket  = p_van_pakket;

  get diagnostics v_geraakt = row_count;

  if v_geraakt = 0 then
    -- Al gewisseld, of het pakket is iets anders dan verwacht. Stil
    -- klaar: geen fout, en vooral geen rij in het bewijsstuk die
    -- suggereert dat er nu iets veranderd is.
    return;
  end if;

  select a.termijn into v_termijn from public.abonnementen a where a.club_id = p_club;

  -- Meteen afgerond: er is niets om op te wachten. afgerond_op invullen
  -- is geen administratie maar noodzaak — zolang dat veld leeg is,
  -- houdt de index elke volgende wissel van deze club tegen.
  insert into public.abonnement_wissels
    (club_id, club_naam, van_pakket, naar_pakket, termijn, soort,
     bedrag_cent, status, afgerond_op)
  values
    (p_club,
     (select c.naam from public.clubs c where c.id = p_club),
     p_van_pakket, p_naar_pakket, coalesce(v_termijn, 'onbekend'), p_soort,
     0, 'klaar', now());
end $$;

comment on function public.wissel_abonnement(uuid, text, text, text) is
  'Voert een gratis wissel uit (downgrade of upgrade onder de drempel) en legt hem vast in public.abonnement_wissels. Raakt geldig_tot NIET aan. Stond het pakket al goed, dan gebeurt er niets en komt er geen fout. Alleen aan te roepen met de service-sleutel (twee sloten).';

revoke execute on function public.wissel_abonnement(uuid, text, text, text) from public, anon, authenticated;
grant  execute on function public.wissel_abonnement(uuid, text, text, text) to service_role;


-- ══════════════════════════════════════════════════════════════
--  DEEL 5 — start_wissel(): DE CLAIM VOOR EEN BETAALDE UPGRADE
--  ─────────────────────────────────────────────────────────────
--  Deze functie zet de claim neer VOORDAT er bij Mollie een betaling
--  bestaat. Dat is de volgorde die alles draagt: eerst het slot, dan
--  pas geld. Andersom zou een tweede klik een tweede betaling
--  opleveren, en pas daarna ontdekken dat het er één te veel was.
--
--  Het betaalnummer komt er dus altijd in een tweede stap bij, met de
--  service-sleutel, zodra Mollie het heeft teruggegeven. De functie
--  geeft daarvoor het id van de claim terug.
--
--  HET OPRUIMEN VOORAF — TWEE TERMIJNEN, TWEE REDENEN
--
--  · Een open claim ZONDER betaalnummer, ouder dan 15 minuten, is een
--    browser die is weggeklikt vlak voor het betaalscherm. Er is bij
--    Mollie niets klaargezet. Die mag de club niet voor eeuwig op slot
--    zetten: afgebroken.
--
--  · Een open claim MÉT betaalnummer is een betaling die bij Mollie
--    klaarstaat. Die geven we NIET na een kwartier vrij — dan zouden er
--    twee betalingen open staan voor één wissel, en kan de club per
--    ongeluk twee keer betalen. Mollie laat een betaling na een dag of
--    wat verlopen en meldt dat; komt die melding nooit, dan ruimen wij
--    hem na zeven dagen zelf op als 'mislukt'.
--
--  WAAROM HIER GEEN "KIJK EERST OF ER AL EEN WISSEL LOOPT" STAAT
--  Omdat dat niet werkt bij twee gelijktijdige verzoeken. De unieke
--  index doet het werk: de tweede insert wacht op de eerste en krijgt
--  daarna foutcode 23505. Die fout laten we met opzet doorbubbelen —
--  de edge function vertaalt hem naar een nette 409 ("er loopt al een
--  wissel"). Zou deze functie hem zelf afvangen, dan was het verschil
--  tussen "al bezig" en "echt misgegaan" verdwenen.
-- ══════════════════════════════════════════════════════════════

create or replace function public.start_wissel(
  p_club             uuid,
  p_van              text,
  p_naar             text,
  p_termijn          text,
  p_bedrag_cent      int,
  p_resterende_dagen int,
  p_totale_dagen     int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_claims text := coalesce(current_setting('request.jwt.claims', true), '');
  v_rol    text;

  v_id uuid;
begin
  -- ── SLOT 2 — alleen de servercode ──────────────────────────
  if v_claims <> '' then
    begin
      v_rol := (v_claims::jsonb ->> 'role');
    exception when others then
      v_rol := null;
    end;
    if v_rol is distinct from 'service_role' then
      raise exception 'start_wissel(): alleen de servercode mag dit aanroepen (rol: %)', coalesce(v_rol, 'onbekend');
    end if;
  elsif session_user not in ('postgres', 'supabase_admin') then
    raise exception 'start_wissel(): alleen de servercode mag dit aanroepen (geen webverzoek, sessie: %)', session_user;
  end if;

  if p_club is null then
    raise exception 'start_wissel(): geen vereniging meegegeven';
  end if;
  if p_van is null or p_van not in ('coach', 'club') then
    raise exception 'start_wissel(): onbekend pakket om vanaf te wisselen: %', coalesce(p_van, 'niets');
  end if;
  if p_naar is null or p_naar not in ('coach', 'club') then
    raise exception 'start_wissel(): onbekend pakket om naartoe te wisselen: %', coalesce(p_naar, 'niets');
  end if;
  if p_termijn is null or p_termijn not in ('maand', 'jaar') then
    raise exception 'start_wissel(): onbekende termijn: %', coalesce(p_termijn, 'niets');
  end if;
  -- Geen bedrag is hier een fout en geen nul: een claim zonder bedrag
  -- zou een betaling zonder bedrag worden.
  if p_bedrag_cent is null then
    raise exception 'start_wissel(): geen bedrag meegegeven';
  end if;
  if p_bedrag_cent < 0 then
    raise exception 'start_wissel(): negatief bedrag: % cent', p_bedrag_cent;
  end if;

  -- ── Opruimen wat hier niet meer hoort ──────────────────────
  update public.abonnement_wissels
     set status = 'afgebroken', afgerond_op = now()
   where club_id = p_club
     and afgerond_op is null
     and mollie_betaling_id is null
     and aangemaakt_op < now() - interval '15 minutes';

  update public.abonnement_wissels
     set status = 'mislukt', afgerond_op = now()
   where club_id = p_club
     and afgerond_op is null
     and mollie_betaling_id is not null
     and aangemaakt_op < now() - interval '7 days';

  -- ── De claim ───────────────────────────────────────────────
  --  Botst hij met een claim die nog loopt, dan komt hier 23505 uit en
  --  die gaat ongemoeid naar boven. Zie de uitleg hierboven.
  insert into public.abonnement_wissels
    (club_id, club_naam, van_pakket, naar_pakket, termijn, soort,
     bedrag_cent, resterende_dagen, totale_dagen, status)
  values
    (p_club,
     (select c.naam from public.clubs c where c.id = p_club),
     p_van, p_naar, p_termijn, 'upgrade',
     p_bedrag_cent, p_resterende_dagen, p_totale_dagen, 'open')
  returning id into v_id;

  return v_id;
end $$;

comment on function public.start_wissel(uuid, text, text, text, int, int, int) is
  'Zet de claim voor een betaalde upgrade neer en geeft het id ervan terug. Ruimt eerst verlopen claims van dezelfde vereniging op (15 minuten zonder betaalnummer, 7 dagen met). Botst met een lopende wissel via de unieke index: foutcode 23505, die met opzet doorbubbelt. Alleen aan te roepen met de service-sleutel (twee sloten).';

revoke execute on function public.start_wissel(uuid, text, text, text, int, int, int) from public, anon, authenticated;
grant  execute on function public.start_wissel(uuid, text, text, text, int, int, int) to service_role;


-- ══════════════════════════════════════════════════════════════
--  DEEL 6 — verwerk_wissel_betaling(): DE BETAALDE UPGRADE
--  ─────────────────────────────────────────────────────────────
--  Dezelfde parameterlijst als verwerk_betaling(), in exact dezelfde
--  volgorde. Dat is geen toeval: de edge function kiest tussen die twee
--  en geeft verder hetzelfde setje mee. Twee volgordes zou betekenen
--  dat één verkeerde keuze een bedrag als munteenheid boekt — en
--  Postgres geeft daar geen fout over.
--
--  HET BELANGRIJKSTE SLOT VAN DEZE FUNCTIE
--  De claim moet al bestaan, met precies dit betaalnummer en nog niet
--  afgerond. Bestaat hij niet: stil klaar, niets toekennen, geen fout.
--  Iemand kan bij Mollie een betaling aanmaken met onze metadata erin;
--  die metadata is dus geen bewijs. Alleen een claim die wij zélf
--  hebben gezet telt. En geen fout terug, want dan blijft Mollie de
--  melding eindeloos opnieuw aanbieden voor iets wat nooit gaat lukken.
--
--  DE TAKKEN DIE UIT verwerk_betaling() ZIJN OVERGENOMEN
--  Ongewijzigd, en dat is met opzet: dit is precies de plek waar bij
--  een nieuwe functie een tak wordt vergeten.
--    · testbetaling terwijl er al live is betaald -> geen pakket
--    · geen bedrag / negatief bedrag              -> harde fout
--    · bedrag nul                                 -> geen fout, geen pakket
--
--  EN DAN HET VERSCHIL MET verwerk_betaling(), IN ÉÉN ZIN:
--  geldig_tot BLIJFT ONGEWIJZIGD. Er wordt niets opgeteld. De club
--  heeft deze periode al betaald en betaalt hier alleen het verschil.
-- ══════════════════════════════════════════════════════════════

create or replace function public.verwerk_wissel_betaling(
  p_mollie_id    text,
  p_club         uuid,
  p_pakket       text,
  p_termijn      text,
  p_betaald_op   timestamptz,
  p_bedrag_cent  int,                     -- verplicht: geen default
  p_modus        text default 'test',
  p_mollie_klant text default null,
  p_valuta       text default 'EUR'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_claims text := coalesce(current_setting('request.jwt.claims', true), '');
  v_rol    text;

  v_claim   record;
  v_club    uuid;
  v_naar    text;
  v_geraakt int;
begin
  -- ── SLOT 2 — alleen de servercode ──────────────────────────
  if v_claims <> '' then
    begin
      v_rol := (v_claims::jsonb ->> 'role');
    exception when others then
      v_rol := null;
    end;
    if v_rol is distinct from 'service_role' then
      raise exception 'verwerk_wissel_betaling(): alleen de servercode mag dit aanroepen (rol: %)', coalesce(v_rol, 'onbekend');
    end if;
  elsif session_user not in ('postgres', 'supabase_admin') then
    raise exception 'verwerk_wissel_betaling(): alleen de servercode mag dit aanroepen (geen webverzoek, sessie: %)', session_user;
  end if;

  -- ── 1. Wat er niet te verwerken valt ───────────────────────
  --  Woordelijk dezelfde afspraken als in verwerk_betaling(): er ligt
  --  echt geld klaar, dus een melding die niet deugt hoort op te vallen
  --  in plaats van weg te zakken.
  if coalesce(p_mollie_id, '') = '' then
    raise exception 'verwerk_wissel_betaling(): geen betaalnummer meegegeven';
  end if;
  if p_termijn is null or p_termijn not in ('maand', 'jaar') then
    raise exception 'verwerk_wissel_betaling(): onbekende termijn: %', coalesce(p_termijn, 'niets');
  end if;
  if p_pakket is null or p_pakket not in ('coach', 'club') then
    raise exception 'verwerk_wissel_betaling(): onbekend pakket: %', coalesce(p_pakket, 'niets');
  end if;
  if p_bedrag_cent is null then
    raise exception 'verwerk_wissel_betaling(): geen bedrag meegegeven';
  end if;
  if p_bedrag_cent < 0 then
    raise exception 'verwerk_wissel_betaling(): negatief bedrag: % cent', p_bedrag_cent;
  end if;

  -- ── 2. IS DIT EEN BETALING DIE WIJ ZELF HEBBEN AANGEVRAAGD? ─
  --  Zie de uitleg bovenaan dit deel. Dit is het slot.
  select w.id, w.club_id, w.naar_pakket, w.van_pakket
    into v_claim
    from public.abonnement_wissels w
   where w.mollie_betaling_id = p_mollie_id
     and w.afgerond_op is null
   limit 1;

  if not found then
    -- Geen claim (of al afgerond: een herhaalde melding van Mollie).
    -- Stil klaar. Niets toekennen, niets boeken, geen fout.
    return;
  end if;

  v_club := coalesce(v_claim.club_id, p_club);
  v_naar := v_claim.naar_pakket;

  -- ── 3. TESTBETALING TERWIJL DE INSTALLATIE LIVE STAAT ──────
  --  Overgenomen uit verwerk_betaling(): zodra er ÉRGENS in de tabel
  --  een verwerkte live-betaling staat, levert een testbetaling geen
  --  pakket meer op. Met de testsleutel van Mollie is een "geslaagde"
  --  betaling van € 0,- in tien seconden gemaakt; zonder deze tak is
  --  dat een gratis upgrade naar Club.
  --
  --  De poging komt wél in de boeken — een geweigerde poging wil je
  --  later kunnen navertellen — maar de claim blijft open staan, zodat
  --  er niets "klaar" heet wat niet is doorgegaan.
  if p_modus = 'test'
     and exists (select 1 from public.betalingen b
                  where b.modus = 'live' and b.verwerkt_op is not null
                    and b.status = 'betaald') then
    insert into public.betalingen (mollie_betaling_id, club_id, club_naam,
                                   mollie_klant_id, pakket, termijn, modus,
                                   status, betaald_op, verwerkt_op,
                                   bedrag_cent, valuta)
    values (p_mollie_id, v_club,
            (select c.naam from public.clubs c where c.id = v_club),
            p_mollie_klant, v_naar, p_termijn, p_modus,
            'genegeerd_testmodus', p_betaald_op, now(),
            p_bedrag_cent, coalesce(p_valuta, 'EUR'))
    on conflict (mollie_betaling_id) do update
      set status      = 'genegeerd_testmodus',
          verwerkt_op = coalesce(betalingen.verwerkt_op, now()),
          bedrag_cent = case when betalingen.verwerkt_op is null
                             then excluded.bedrag_cent else betalingen.bedrag_cent end,
          valuta      = case when betalingen.verwerkt_op is null
                             then excluded.valuta      else betalingen.valuta      end;
    return;
  end if;

  -- ── 4. EEN BETALING VAN NUL ────────────────────────────────
  --  Geen fout (nul is een welgevormde melding; een fout zou Mollie
  --  eindeloos opnieuw laten proberen), maar ook geen pakket: er
  --  bestaat geen upgrade die nul euro kost.
  if p_bedrag_cent = 0 then
    insert into public.betalingen (mollie_betaling_id, club_id, club_naam,
                                   mollie_klant_id, pakket, termijn, modus,
                                   status, betaald_op, verwerkt_op,
                                   bedrag_cent, valuta)
    values (p_mollie_id, v_club,
            (select c.naam from public.clubs c where c.id = v_club),
            p_mollie_klant, v_naar, p_termijn, p_modus,
            'genegeerd_geen_bedrag', p_betaald_op, now(),
            0, coalesce(p_valuta, 'EUR'))
    on conflict (mollie_betaling_id) do update
      set status      = 'genegeerd_geen_bedrag',
          verwerkt_op = coalesce(betalingen.verwerkt_op, now()),
          bedrag_cent = case when betalingen.verwerkt_op is null
                             then excluded.bedrag_cent else betalingen.bedrag_cent end,
          valuta      = case when betalingen.verwerkt_op is null
                             then excluded.valuta      else betalingen.valuta      end;
    return;
  end if;

  -- ── 5. DE CLAIM AFRONDEN IN ÉÉN OPDRACHT ───────────────────
  --  Hetzelfde patroon als in verwerk_betaling(): claimen en verwerken
  --  in dezelfde opdracht. Komen er twee meldingen tegelijk binnen, dan
  --  zet Postgres de tweede update op het rijslot in de wachtstand en
  --  toetst daarna de where opnieuw; die ziet afgerond_op dan al staan
  --  en raakt nul rijen. "and afgerond_op is null" is het stukje dat
  --  dat doet — haal dat niet weg.
  --
  --  bedrag_cent van de claim blijft staan zoals hij is aangevraagd.
  --  Wat er werkelijk is afgeschreven komt hieronder in de boekhouding
  --  terecht; twee getallen die uit elkaar lopen wil je kunnen zien.
  update public.abonnement_wissels
     set status      = 'klaar',
         afgerond_op = now()
   where id = v_claim.id
     and afgerond_op is null;

  get diagnostics v_geraakt = row_count;
  if v_geraakt = 0 then
    -- Een gelijktijdige melding was net eerder. Die heeft het werk
    -- gedaan.
    return;
  end if;

  -- ── 6. DE BOEKING ──────────────────────────────────────────
  --  betaling-starten zet voor een wissel ook een rij klaar met status
  --  'open'; die wordt hier bijgewerkt. Bestaat hij niet, dan maakt
  --  deze opdracht hem zelf aan. De "where verwerkt_op is null" op de
  --  do update zorgt dat een al afgehandelde rij niet alsnog wordt
  --  overschreven.
  insert into public.betalingen (mollie_betaling_id, club_id, club_naam,
                                 mollie_klant_id, pakket, termijn, modus,
                                 status, betaald_op, verwerkt_op,
                                 bedrag_cent, valuta)
  values (p_mollie_id, v_club,
          (select c.naam from public.clubs c where c.id = v_club),
          p_mollie_klant, v_naar, p_termijn, p_modus,
          'betaald', p_betaald_op, now(),
          p_bedrag_cent, coalesce(p_valuta, 'EUR'))
  on conflict (mollie_betaling_id) do update
    set status          = 'betaald',
        verwerkt_op     = now(),
        bedrag_cent     = excluded.bedrag_cent,
        valuta          = excluded.valuta,
        pakket          = excluded.pakket,
        betaald_op      = coalesce(betalingen.betaald_op, excluded.betaald_op),
        club_id         = coalesce(betalingen.club_id, excluded.club_id),
        mollie_klant_id = coalesce(betalingen.mollie_klant_id, excluded.mollie_klant_id),
        club_naam       = coalesce(betalingen.club_naam, excluded.club_naam)
    where betalingen.verwerkt_op is null;

  -- ── 7. HET PAKKET ──────────────────────────────────────────
  --  Het nieuwe pakket komt uit de CLAIM en niet uit p_pakket: wat er
  --  in de metadata van een betaling staat is geen bewijs.
  --
  --  En hier staat met opzet GEEN geldig_tot. Geen optelling, geen
  --  nieuwe einddatum, niets. mollie_bedrag_cent blijft hier ook leeg:
  --  die wordt pas gevuld als Mollie de gewijzigde incasso heeft
  --  bevestigd, en dat gebeurt in de edge function.
  if v_club is null then
    return;
  end if;

  update public.abonnementen
     set pakket          = v_naar,
         termijn         = coalesce(p_termijn, abonnementen.termijn),
         mollie_klant_id = coalesce(abonnementen.mollie_klant_id, p_mollie_klant)
   where club_id = v_club;
end $$;

comment on function public.verwerk_wissel_betaling(text, uuid, text, text, timestamptz, int, text, text, text) is
  'Zet een geslaagde betaling voor een UPGRADE om in het nieuwe pakket. Doet alleen iets als er een openstaande claim in public.abonnement_wissels staat met precies dit betaalnummer. Raakt geldig_tot NIET aan. Alleen aan te roepen met de service-sleutel (twee sloten).';

revoke execute on function public.verwerk_wissel_betaling(text, uuid, text, text, timestamptz, int, text, text, text)
  from public, anon, authenticated;
grant  execute on function public.verwerk_wissel_betaling(text, uuid, text, text, timestamptz, int, text, text, text)
  to service_role;


-- ══════════════════════════════════════════════════════════════
--  DEEL 7 — HET VANGNET IN verwerk_betaling()
--  ─────────────────────────────────────────────────────────────
--  Wat hieronder staat is de functie uit 18-betalingen.sql DEEL 3, met
--  TWEE toevoegingen. De rest is woordelijk hetzelfde.
--
--  1. VOORAAN: een betaalnummer dat bij een wissel hoort, wordt HARD
--     geweigerd. Dit is een verzekering tegen een toekomstige
--     routeringsfout in betaling-melding: komt een wisselbetaling toch
--     bij de gewone functie terecht, dan zou die er een hele periode
--     bij optellen — precies de fout die dit bestand repareert, maar
--     dan via een omweg. Een harde fout betekent dat Mollie het opnieuw
--     aanbiedt en dat het opvalt, in plaats van dat een club stilletjes
--     een maand cadeau krijgt.
--
--  2. IN DE UPSERT: termijn = p_termijn. Zonder die ene regel blijft de
--     nieuwe kolom uit DEEL 1 leeg voor iedereen die vanaf nu betaalt,
--     en is er bij de eerstvolgende wissel geen periodelengte bekend.
--
--  WAAROM "create or replace" EN GEEN "drop function"
--  De parameterlijst blijft exact gelijk, dus replace kan. Dat is hier
--  geen gemak maar veiligheid: een drop + create zou het uitvoerrecht
--  stil teruggeven aan PUBLIC (zie het slotblok hierboven). De revoke
--  en grant staan er voor de zekerheid alsnog onder — ze doen niets als
--  alles al goed stond.
-- ══════════════════════════════════════════════════════════════

create or replace function public.verwerk_betaling(
  p_mollie_id    text,
  p_club         uuid,
  p_pakket       text,
  p_termijn      text,
  p_betaald_op   timestamptz,
  p_bedrag_cent  int,                     -- verplicht: geen default
  p_modus        text default 'test',
  p_mollie_klant text default null,
  p_valuta       text default 'EUR'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_claims text := coalesce(current_setting('request.jwt.claims', true), '');
  v_rol    text;

  v_club     uuid;
  v_modus    text;
  v_geraakt  int;
  v_pakket   text;
  v_oud_tot  date;
  v_basis    date;
  v_nieuw_tot date;
  v_stap     interval;
begin
  -- ── SLOT 2 — alleen de servercode ──────────────────────────
  if v_claims <> '' then
    begin
      v_rol := (v_claims::jsonb ->> 'role');
    exception when others then
      v_rol := null;
    end;
    if v_rol is distinct from 'service_role' then
      raise exception 'verwerk_betaling(): alleen de servercode mag dit aanroepen (rol: %)', coalesce(v_rol, 'onbekend');
    end if;
  elsif session_user not in ('postgres', 'supabase_admin') then
    raise exception 'verwerk_betaling(): alleen de servercode mag dit aanroepen (geen webverzoek, sessie: %)', session_user;
  end if;

  -- ── HET VANGNET (20-abonnement-wisselen.sql) ───────────────
  --  Hoort dit betaalnummer bij een wissel, dan is deze functie de
  --  verkeerde: verwerk_wissel_betaling() moet hem hebben. Hard
  --  weigeren, en vóór álles — er mag hier geen halve boeking blijven
  --  staan.
  if exists (select 1 from public.abonnement_wissels w
              where w.mollie_betaling_id = p_mollie_id) then
    raise exception 'verwerk_betaling(): dit betaalnummer hoort bij een wissel van pakket (%), die gaat via verwerk_wissel_betaling()', p_mollie_id;
  end if;

  -- ── Wat er niet te verwerken valt ──────────────────────────
  if coalesce(p_mollie_id, '') = '' then
    raise exception 'verwerk_betaling(): geen betaalnummer meegegeven';
  end if;
  if p_termijn is null or p_termijn not in ('maand', 'jaar') then
    raise exception 'verwerk_betaling(): onbekende termijn: %', coalesce(p_termijn, 'niets');
  end if;
  if p_pakket is null or p_pakket not in ('coach', 'club') then
    raise exception 'verwerk_betaling(): onbekend pakket: %', coalesce(p_pakket, 'niets');
  end if;

  if p_bedrag_cent is null then
    raise exception 'verwerk_betaling(): geen bedrag meegegeven';
  end if;
  if p_bedrag_cent < 0 then
    raise exception 'verwerk_betaling(): negatief bedrag: % cent', p_bedrag_cent;
  end if;

  -- ── 2. TESTBETALING TERWIJL DE INSTALLATIE LIVE STAAT ──────
  if p_modus = 'test'
     and exists (select 1 from public.betalingen b
                  where b.modus = 'live' and b.verwerkt_op is not null
                    and b.status = 'betaald') then
    insert into public.betalingen (mollie_betaling_id, club_id, club_naam,
                                   mollie_klant_id, pakket, termijn, modus,
                                   status, betaald_op, verwerkt_op,
                                   bedrag_cent, valuta)
    values (p_mollie_id, p_club,
            (select c.naam from public.clubs c where c.id = p_club),
            p_mollie_klant, p_pakket, p_termijn, p_modus,
            'genegeerd_testmodus', p_betaald_op, now(),
            p_bedrag_cent, coalesce(p_valuta, 'EUR'))
    on conflict (mollie_betaling_id) do update
      set status      = 'genegeerd_testmodus',
          verwerkt_op = coalesce(betalingen.verwerkt_op, now()),
          bedrag_cent = case when betalingen.verwerkt_op is null
                             then excluded.bedrag_cent else betalingen.bedrag_cent end,
          valuta      = case when betalingen.verwerkt_op is null
                             then excluded.valuta      else betalingen.valuta      end;
    return;
  end if;

  -- ── 2b. EEN BETALING VAN NUL ───────────────────────────────
  if p_bedrag_cent = 0 then
    insert into public.betalingen (mollie_betaling_id, club_id, club_naam,
                                   mollie_klant_id, pakket, termijn, modus,
                                   status, betaald_op, verwerkt_op,
                                   bedrag_cent, valuta)
    values (p_mollie_id, p_club,
            (select c.naam from public.clubs c where c.id = p_club),
            p_mollie_klant, p_pakket, p_termijn, p_modus,
            'genegeerd_geen_bedrag', p_betaald_op, now(),
            0, coalesce(p_valuta, 'EUR'))
    on conflict (mollie_betaling_id) do update
      set status      = 'genegeerd_geen_bedrag',
          verwerkt_op = coalesce(betalingen.verwerkt_op, now()),
          bedrag_cent = case when betalingen.verwerkt_op is null
                             then excluded.bedrag_cent else betalingen.bedrag_cent end,
          valuta      = case when betalingen.verwerkt_op is null
                             then excluded.valuta      else betalingen.valuta      end;
    return;
  end if;

  -- ── 3. CLAIMEN EN VERWERKEN IN ÉÉN OPDRACHT ────────────────
  update public.betalingen
     set status      = 'betaald',
         verwerkt_op = now(),
         bedrag_cent = p_bedrag_cent,
         valuta      = coalesce(p_valuta, 'EUR'),
         betaald_op  = coalesce(betalingen.betaald_op, p_betaald_op),
         club_id     = coalesce(betalingen.club_id, p_club),
         mollie_klant_id = coalesce(betalingen.mollie_klant_id, p_mollie_klant),
         club_naam   = coalesce(betalingen.club_naam,
                                (select c.naam from public.clubs c
                                  where c.id = coalesce(betalingen.club_id, p_club)))
   where mollie_betaling_id = p_mollie_id
     and verwerkt_op is null
  returning club_id, modus into v_club, v_modus;

  get diagnostics v_geraakt = row_count;

  if v_geraakt = 0 then
    if exists (select 1 from public.betalingen b
                where b.mollie_betaling_id = p_mollie_id) then
      return;
    end if;

    v_club := coalesce(
      p_club,
      (select a.club_id from public.abonnementen a
        where p_mollie_klant is not null
          and a.mollie_klant_id = p_mollie_klant
        limit 1));

    if v_club is null then
      return;
    end if;

    insert into public.betalingen (mollie_betaling_id, club_id, club_naam,
                                   mollie_klant_id, pakket, termijn, modus,
                                   status, betaald_op, verwerkt_op,
                                   bedrag_cent, valuta)
    values (p_mollie_id, v_club,
            (select c.naam from public.clubs c where c.id = v_club),
            p_mollie_klant, p_pakket, p_termijn, p_modus,
            'betaald', p_betaald_op, now(),
            p_bedrag_cent, coalesce(p_valuta, 'EUR'))
    on conflict (mollie_betaling_id) do nothing;

    get diagnostics v_geraakt = row_count;
    if v_geraakt = 0 then
      return;
    end if;
    v_modus := p_modus;
  end if;

  if v_club is null then
    v_club := (select a.club_id from public.abonnementen a
                where p_mollie_klant is not null
                  and a.mollie_klant_id = p_mollie_klant
                limit 1);
    if v_club is not null then
      update public.betalingen
         set club_id   = v_club,
             club_naam = coalesce(betalingen.club_naam,
                                  (select c.naam from public.clubs c where c.id = v_club))
       where mollie_betaling_id = p_mollie_id;
    end if;
  end if;

  if v_club is null then
    return;
  end if;

  -- ── 4. WAAR DE NIEUWE EINDDATUM VANDAAN KOMT ───────────────
  select a.pakket, a.geldig_tot into v_pakket, v_oud_tot
    from public.abonnementen a where a.club_id = v_club;

  v_stap := case p_termijn when 'maand' then interval '1 month'
                           else interval '1 year' end;

  if v_pakket in ('coach', 'club') and v_oud_tot is null then
    v_nieuw_tot := null;                       -- onbeperkt blijft onbeperkt
  else
    v_basis     := greatest(coalesce(v_oud_tot, current_date), current_date);
    v_nieuw_tot := (v_basis + v_stap)::date;
  end if;

  -- ── 5. HET PAKKET ERBIJ ────────────────────────────────────
  --  Met "termijn" erbij sinds 20-abonnement-wisselen.sql: zonder die
  --  kolom kan wissel_gegevens() de lengte van de periode niet bepalen
  --  en is elke verrekening voor een jaarklant een maandberekening.
  insert into public.abonnementen (club_id, pakket, geldig_tot, termijn, mollie_klant_id)
  values (v_club, p_pakket, v_nieuw_tot, p_termijn, p_mollie_klant)
  on conflict (club_id) do update
    set pakket          = excluded.pakket,
        geldig_tot      = excluded.geldig_tot,
        termijn         = excluded.termijn,
        mollie_klant_id = coalesce(excluded.mollie_klant_id,
                                   abonnementen.mollie_klant_id);
end $$;

comment on function public.verwerk_betaling(text, uuid, text, text, timestamptz, int, text, text, text) is
  'Zet een geslaagde betaling van Mollie om in een pakket en legt bedrag, munteenheid en termijn vast. Weigert hard zodra het betaalnummer bij een wissel hoort — die gaat via verwerk_wissel_betaling(). Alleen aan te roepen met de service-sleutel (twee sloten). Verwerkt elke melding hoogstens één keer.';

-- Niet strikt nodig na een "create or replace" (de rechten blijven dan
-- staan), maar wel goedkoop en het scheelt een stil open slot als dit
-- bestand ooit op een database wordt gedraaid waar 18 anders is
-- gelopen.
revoke execute on function public.verwerk_betaling(text, uuid, text, text, timestamptz, int, text, text, text)
  from public, anon, authenticated;
grant  execute on function public.verwerk_betaling(text, uuid, text, text, timestamptz, int, text, text, text)
  to service_role;


-- ══════════════════════════════════════════════════════════════
--  DEEL 8 — wissel_status(): DE ENIGE DEUR VOOR DE APP ZELF
--  ─────────────────────────────────────────────────────────────
--  De club moet kunnen zien of zijn wissel nog onderweg is — anders
--  staat er na het betalen "in behandeling" zonder dat er ooit iets
--  verandert op het scherm.
--
--  Dit is de enige functie in dit bestand die authenticated mag
--  aanroepen, en dus de enige waar is_eigenaar() het werk doet. Een
--  trainer of kijker van dezelfde club hoort niets te zien: wat een
--  vereniging betaalt is bestuurszaak. Dat staat in de WHERE en niet in
--  een "if ... raise" — zo krijgt iemand die er niet bij mag geen
--  foutmelding maar gewoon geen regels, en verraadt het antwoord ook
--  niet of er iets te zien wás.
-- ══════════════════════════════════════════════════════════════

create or replace function public.wissel_status(p_club uuid)
returns table(
  id            uuid,
  van_pakket    text,
  naar_pakket   text,
  termijn       text,
  soort         text,
  bedrag_cent   int,
  status        text,
  onderweg      boolean,
  aangemaakt_op timestamptz,
  afgerond_op   timestamptz
) language sql stable security definer set search_path = public as $$
  select w.id, w.van_pakket, w.naar_pakket, w.termijn, w.soort,
         w.bedrag_cent, w.status, (w.afgerond_op is null),
         w.aangemaakt_op, w.afgerond_op
    from public.abonnement_wissels w
   where w.club_id = p_club
     and public.is_eigenaar(p_club)
   order by w.aangemaakt_op desc
   limit 1
$$;

comment on function public.wissel_status(uuid) is
  'De laatste wisselpoging van deze vereniging, alleen voor de eigenaar. Geeft geen regels terug aan wie geen eigenaar is — geen foutmelding, want ook dát zou iets verraden.';

revoke execute on function public.wissel_status(uuid) from public, anon;
grant  execute on function public.wissel_status(uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════
--  DEEL 9 — wissel_controle(): DE ENIGE PLEK WAAR EEN STILLE
--           ONDERFACTURERING ZICHTBAAR WORDT
--  ─────────────────────────────────────────────────────────────
--  Na een wissel moet bij Mollie het bedrag van de doorlopende incasso
--  worden aangepast. Die aanpassing kan mislukken terwijl de wissel
--  zelf gewoon is doorgegaan: het pakket staat dan goed in de database
--  en Mollie schrijft nog het oude bedrag af.
--
--  Bij een te LAAG bedrag klaagt niemand ooit. Dat is precies waarom
--  deze controle bestaat: er is geen enkel ander moment in de hele
--  keten waarop dat verschil boven water komt.
--
--  Draai dit af en toe (bijvoorbeeld als er betalingen zijn geweest).
--  Komt er niets terug, dan klopt alles.
--
--  DE PRIJZEN STAAN HIER OOK — EN DAT IS EEN COMPROMIS
--  De echte prijslijst staat in supabase/functions/_gedeeld/mollie.ts;
--  dat blijft de enige plek waar een bedrag vandaan komt dat écht in
--  rekening wordt gebracht. Deze lijst wordt NOOIT gebruikt om te
--  incasseren — hij vergelijkt alleen. Wijzigen de prijzen, dan hoort
--  deze lijst mee te veranderen; doet iemand dat niet, dan meldt deze
--  functie een verschil dat er niet is. Dat is de goede kant om fout te
--  gaan: te veel melden, nooit te weinig.
--
--  WIE MAG DIT ZIEN
--  Een beheerder, en Evan zelf in de SQL Editor (daar is er geen
--  ingelogde gebruiker, dus is_beheerder() zegt daar nee — vandaar de
--  tweede tak, dezelfde als in slot 2 hierboven).
-- ══════════════════════════════════════════════════════════════

create or replace function public.wissel_controle()
returns table(
  club_id         uuid,
  vereniging      text,
  pakket          text,
  termijn         text,
  verwacht_cent   int,
  bij_mollie_cent int,
  oordeel         text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_beheerder() or session_user in ('postgres', 'supabase_admin')) then
    raise exception 'Alleen voor beheerders';
  end if;

  return query
    with prijs(p_pakket, p_termijn, cent) as (
      values ('coach', 'maand',   699),
             ('coach', 'jaar',   6990),
             ('club',  'maand',  4900),
             ('club',  'jaar',  49000)
    )
    select a.club_id,
           c.naam,
           a.pakket,
           a.termijn,
           pr.cent,
           a.mollie_bedrag_cent,
           case
             when a.mollie_bedrag_cent is null
               then 'ONBEKEND — nooit door Mollie bevestigd'
             when pr.cent is null
               then 'GEEN PRIJS BEKEND — pakket of termijn klopt niet'
             else 'WIJKT AF — Mollie incasseert een ander bedrag dan het pakket kost'
           end
      from public.abonnementen a
      join public.clubs c on c.id = a.club_id
      left join prijs pr on pr.p_pakket = a.pakket and pr.p_termijn = a.termijn
     where a.pakket in ('coach', 'club')
       -- Onbeperkte toegang (met de hand gezet) heeft geen einddatum en
       -- geen incasso; daar valt niets te vergelijken.
       and a.geldig_tot is not null
       and (a.mollie_bedrag_cent is null
            or pr.cent is null
            or a.mollie_bedrag_cent <> pr.cent)
     order by c.naam;
end $$;

comment on function public.wissel_controle() is
  'Laat de verenigingen zien waarvan het bedrag dat Mollie volgens ons afschrijft niet klopt met het pakket, of onbekend is. Geen rijen terug = alles in orde. Alleen voor een beheerder (en voor de SQL Editor).';

grant execute on function public.wissel_controle() to authenticated;


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is alles goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  Hieronder komt een tabel terug. In de kolom "oordeel" hoort overal
--  "in orde" te staan. Dit blok verandert niets; je kunt het los
--  draaien door alleen het stuk van "select" tot en met de puntkomma te
--  selecteren.
--
--  Getest met opzettelijke fouten (19 september 2026): de where-clause
--  van de partiële index weggehaald -> regel 3 sloeg om naar LET OP; de
--  revoke onder start_wissel() weggehaald -> regel 9 sloeg om; de regel
--  "termijn = excluded.termijn" uit verwerk_betaling() gehaald ->
--  regel 12 sloeg om.
-- ══════════════════════════════════════════════════════════════
select 1 as nr, 'de kolom abonnementen.termijn bestaat' as controle,
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'termijn')
            then 'ja' else 'nee' end as gevonden,
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'termijn')
            then 'in orde' else 'LET OP' end as oordeel
union all
select 2, 'de kolom abonnementen.mollie_bedrag_cent bestaat',
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'mollie_bedrag_cent')
            then 'ja' else 'nee' end,
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'mollie_bedrag_cent')
            then 'in orde' else 'LET OP' end
union all
select 3, 'het slot: hoogstens één wissel ONDERWEG per vereniging',
       coalesce((select case when i.indisunique and i.indpred is not null
                             then 'unieke index, alleen op onafgeronde wissels'
                             else 'index gevonden, maar niet uniek of niet gedeeltelijk' end
                   from pg_index i join pg_class c on c.oid = i.indexrelid
                  where c.relname = 'abonnement_wissels_een_open_per_club'),
                'de index bestaat niet'),
       case when exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                          where c.relname = 'abonnement_wissels_een_open_per_club'
                            and i.indisunique and i.indpred is not null)
            then 'in orde' else 'LET OP' end
union all
select 4, 'één betaling kan maar één wissel voeden',
       case when exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                          where c.relname = 'abonnement_wissels_betaling_idx' and i.indisunique)
            then 'unieke index aanwezig' else 'niet gevonden' end,
       case when exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                          where c.relname = 'abonnement_wissels_betaling_idx' and i.indisunique)
            then 'in orde' else 'LET OP' end
union all
select 5, 'het bewijsstuk overleeft een opgeheven vereniging',
       coalesce((select case con.confdeltype when 'n' then 'set null'
                                             when 'c' then 'cascade'
                                             else con.confdeltype::text end
                   from pg_constraint con
                   join pg_class c on c.oid = con.conrelid
                  where c.relname = 'abonnement_wissels' and con.contype = 'f' limit 1),
                'geen verwijzing naar clubs'),
       case when coalesce((select con.confdeltype from pg_constraint con
                            join pg_class c on c.oid = con.conrelid
                           where c.relname = 'abonnement_wissels' and con.contype = 'f' limit 1),
                          'x') = 'n'
            then 'in orde' else 'LET OP' end
union all
select 6, 'rij-beveiliging aan op abonnement_wissels',
       case when coalesce((select c.relrowsecurity from pg_class c
                            join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = 'abonnement_wissels'), false)
            then 'aan' else 'UIT' end,
       case when coalesce((select c.relrowsecurity from pg_class c
                            join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = 'abonnement_wissels'), false)
            then 'in orde' else 'LET OP' end
union all
select 7, 'geen enkele schrijfregel op abonnement_wissels',
       (select count(*)::text || ' schrijfregel(s)' from pg_policies
         where schemaname = 'public' and tablename = 'abonnement_wissels' and cmd <> 'SELECT'),
       case when (select count(*) from pg_policies
                   where schemaname = 'public' and tablename = 'abonnement_wissels'
                     and cmd <> 'SELECT') = 0
            then 'in orde' else 'LET OP' end
union all
select 8, 'de vijf functies bestaan',
       (select string_agg(p.proname, ', ' order by p.proname)
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname in ('wissel_gegevens','wissel_abonnement','start_wissel',
                             'verwerk_wissel_betaling','wissel_status')),
       case when (select count(distinct p.proname) from pg_proc p
                   join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public'
                    and p.proname in ('wissel_gegevens','wissel_abonnement','start_wissel',
                                      'verwerk_wissel_betaling','wissel_status')) = 5
            then 'in orde' else 'LET OP' end
union all
select 9, 'slot 1: de vier servercode-functies zijn dicht voor de app',
       (select coalesce(string_agg(p.proname || ': OPEN', ', '), 'geen enkele staat open')
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname in ('wissel_gegevens','wissel_abonnement','start_wissel','verwerk_wissel_betaling')
           and (has_function_privilege('authenticated', p.oid, 'execute')
                or has_function_privilege('anon', p.oid, 'execute'))),
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public'
                                and p.proname in ('wissel_gegevens','wissel_abonnement','start_wissel','verwerk_wissel_betaling')
                                and (has_function_privilege('authenticated', p.oid, 'execute')
                                     or has_function_privilege('anon', p.oid, 'execute')))
            then 'in orde' else 'LET OP' end
union all
select 10, 'slot 1: service_role mag ze alle vier wél',
       (select count(*)::text || ' van 4' from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname in ('wissel_gegevens','wissel_abonnement','start_wissel','verwerk_wissel_betaling')
           and has_function_privilege('service_role', p.oid, 'execute')),
       case when (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public'
                     and p.proname in ('wissel_gegevens','wissel_abonnement','start_wissel','verwerk_wissel_betaling')
                     and has_function_privilege('service_role', p.oid, 'execute')) = 4
            then 'in orde' else 'LET OP' end
union all
select 11, 'wissel_status() mag juist WEL door de app (authenticated)',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = 'wissel_status'
                            and has_function_privilege('authenticated', p.oid, 'execute'))
            then 'ja' else 'nee' end,
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = 'wissel_status'
                            and has_function_privilege('authenticated', p.oid, 'execute'))
            then 'in orde' else 'LET OP' end
union all
select 12, 'verwerk_betaling() legt de termijn vast en kent het vangnet',
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                            join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1), '')
                 like '%abonnement_wissels%' then 'vangnet aanwezig' else 'nog de oude versie uit 18' end,
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                            join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1), '')
                 like '%abonnement_wissels%'
            and coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                            join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1), '')
                 like '%termijn%'
            then 'in orde' else 'LET OP' end
union all
select 13, 'wissel_gegevens() rekent met Nederlandse tijd',
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                            join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'wissel_gegevens' limit 1), '')
                 like '%Europe/Amsterdam%' then 'ja' else 'nee, nog UTC' end,
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                            join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'wissel_gegevens' limit 1), '')
                 like '%Europe/Amsterdam%' then 'in orde' else 'LET OP' end
union all
select 14, 'geen wissel die eeuwig onderweg is (ouder dan een dag)',
       (select count(*)::text || ' vastgelopen wissel(s)' from public.abonnement_wissels
         where afgerond_op is null and aangemaakt_op < now() - interval '1 day'),
       case when (select count(*) from public.abonnement_wissels
                   where afgerond_op is null and aangemaakt_op < now() - interval '1 day') = 0
            then 'in orde' else 'LET OP' end
order by 1;


-- ══════════════════════════════════════════════════════════════
--  WIE RAAKT DIT? — een overzicht, dat niets verandert
--  ─────────────────────────────────────────────────────────────
--  Draai dit gerust los. Het laat per betalende vereniging zien wat er
--  bij een wissel zou gebeuren: hoeveel dagen van de lopende periode er
--  nog over zijn, en of de termijn bekend is. Staat er bij "termijn"
--  niets, dan kan die vereniging vandaag niet upgraden — dan is de
--  periodelengte onbekend.
-- ══════════════════════════════════════════════════════════════
select c.naam                                as vereniging,
       a.pakket,
       coalesce(a.termijn, '(niet bekend)')  as termijn,
       a.geldig_tot,
       case when a.geldig_tot is null then null
            else greatest(a.geldig_tot - (now() at time zone 'Europe/Amsterdam')::date, 0)
       end                                   as dagen_over,
       a.mollie_subscription_id              as incasso_bij_mollie,
       a.mollie_bedrag_cent                  as bedrag_bij_mollie_cent
from public.clubs c
join public.abonnementen a on a.club_id = c.id
where a.pakket in ('coach', 'club')
order by 1;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Haal bij de regels hieronder de twee streepjes vooraan weg,
--  selecteer alleen dat stuk en klik op Run. Daarmee is alles weer
--  zoals vóór dit bestand.
--
--  LET OP, IN DEZE VOLGORDE:
--    1. Eerst de functies weg — verwerk_betaling() moet terug naar de
--       versie zonder vangnet, anders verwijst hij naar een tabel die
--       er niet meer is en werkt de hele betaalketen niet meer.
--    2. Dan pas de tabel.
--
--  Stap 1 hieronder haalt de vijf wisselfuncties weg. Voor
--  verwerk_betaling() is de eenvoudigste weg: draai
--  server/18-betalingen.sql opnieuw (dat bestand is herhaalbaar). Dan
--  staat de versie zonder vangnet er weer, inclusief zijn eigen revoke
--  en grant.
--
--  De laatste twee stappen staan met een extra streepje: die gooien het
--  bewijsmateriaal weg en zijn NIET terug te draaien.
-- ══════════════════════════════════════════════════════════════

-- -- 1. De wisselfuncties weg.
-- drop function if exists public.wissel_status(uuid);
-- drop function if exists public.wissel_controle();
-- drop function if exists public.verwerk_wissel_betaling(text, uuid, text, text, timestamptz, int, text, text, text);
-- drop function if exists public.start_wissel(uuid, text, text, text, int, int, int);
-- drop function if exists public.wissel_abonnement(uuid, text, text, text);
-- drop function if exists public.wissel_gegevens(uuid);
--
-- -- 2. verwerk_betaling() terug naar de versie zonder vangnet:
-- --    draai server/18-betalingen.sql opnieuw. Pas DAARNA stap 3.
--
-- -- 3. ALLEEN als je de wisselgeschiedenis écht kwijt wil. Niet terug
-- --    te draaien: bij een geschil is het bewijs daarna weg.
-- -- drop table if exists public.abonnement_wissels;
--
-- -- 4. En de twee kolommen. Ook niet terug te draaien; de termijn is
-- --    daarna alleen nog uit de boekhouding te herleiden.
-- -- alter table public.abonnementen drop column if exists mollie_bedrag_cent;
-- -- alter table public.abonnementen drop column if exists termijn;
