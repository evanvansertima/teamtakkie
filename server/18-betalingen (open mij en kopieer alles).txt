-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — de databasekant van de betaalketen (Mollie)
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná 01-schema.sql, 03-beheer.sql, 06-pakketten.sql en
--  17-free-serverdata.sql. Dit bestand leunt op is_beheerder() (03),
--  op pakket_van_club() en pakket_instellingen (06) en op
--  ooit_betaald / mag_serverdata_schrijven() (17).
--
--  Plak het hele bestand in de SQL Editor van Supabase en klik op
--  Run. Onderaan staat een controleblok; daar hoort overal "in orde"
--  te staan. Twee keer draaien kan geen kwaad: alles hier is
--  herhaalbaar (create or replace, add column if not exists,
--  on conflict do nothing).
--
--  De SQL Editor toont maar één uitslag tegelijk (de laatste). Wil je
--  het controleblok apart zien, selecteer dan alleen dat ene blok —
--  van "select" tot en met de puntkomma — en klik op Run. Het
--  verandert niets.
--
--  ─────────────────────────────────────────────────────────────
--  WAT DIT WEL IS EN WAT NIET
--
--  WEL: de tabel waarin elke betaling van Mollie wordt geboekt, de
--  ene functie die zo'n betaling omzet in een pakket, en de
--  zestig-dagen-coulance voor een club waarvan het abonnement afloopt.
--
--  NIET: de twee Supabase Edge Functions (betaling-starten en
--  betaling-melding) die met Mollie praten en deze functie aanroepen.
--  Die draaien in Deno, niet in Postgres, en zijn een aparte klus.
--  Zolang die er niet zijn, verandert dit bestand niets aan wat een
--  gebruiker van de app merkt — behalve de coulance-regeling in
--  DEEL 4, en die geeft alleen méér ruimte dan er vandaag is.
--
--  ─────────────────────────────────────────────────────────────
--  WAAROM DIT ER MOET ZIJN
--
--  docs/pakketten-besluit.md (11 september 2026) legt vast dat een
--  vereniging voor coach of club betaalt. Vandaag zet Evan zo'n
--  pakket met de hand (zet_pakket(), of rechtstreeks in de
--  tabeleditor). Zodra clubs zelf gaan afrekenen, moet er een weg van
--  "Mollie meldt: er is betaald" naar "deze club staat op coach tot
--  die datum" komen, en dat is precies de gevaarlijkste functie in de
--  hele database: wie hem kan aanroepen, geeft zichzelf een
--  abonnement.
--
--  Het ontwerp eromheen komt van Veerle (beveiliging) en is
--  vastgelegd in drie testbestanden van Tess, samen 75 scenario's:
--    · tests/betaling-verwerken.test.sql   (32)
--    · tests/coulance-60-dagen.test.sql    (20)
--    · tests/free-server-afscherming.test.sql (23, scenario 5 en 11)
--  Zie ook docs/avg-inventaris.md §8 over wat er van een betaling
--  bewaard wordt en waarom.
--
--  Die tests zijn lokaal te draaien, zonder Supabase aan te raken:
--
--      sh tests/sql-lokaal/draai.sh tests/betaling-verwerken.test.sql \
--          server/17-free-serverdata.sql server/18-betalingen.sql
--
--  ─────────────────────────────────────────────────────────────
--  DE VIER DINGEN DIE HIER MIS KUNNEN GAAN
--
--  1. IEMAND ANDERS ROEPT verwerk_betaling() AAN.
--     Daar zitten twee onafhankelijke sloten op — zie DEEL 3. Eén
--     slot is te weinig, en waarom dat zo is staat daar uitgelegd.
--
--  2. DEZELFDE MELDING KOMT TWEE KEER BINNEN.
--     Dat is geen storing maar normaal gedrag van Mollie: een webhook
--     wordt opnieuw gestuurd als het antwoord uitblijft. Twee keer
--     verwerken is twee maanden voor één betaling.
--
--  3. EEN TESTBETALING TELT ALS ECHTE BETALING.
--     Mollie heeft een testsleutel waarmee een geslaagde betaling van
--     € 0,- in tien seconden gemaakt is. Die mag geen pakket opleveren
--     zodra de installatie echt live staat.
--
--  4. DE BOEKHOUDING VERDWIJNT MET EEN OPGEHEVEN CLUB.
--     Precies op het moment dat je hem nodig hebt (een geschil, of de
--     aangifte over dat jaar). Vandaar "on delete set null" en een
--     losse kolom met de clubnaam.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 1 — DE BOEKHOUDING
--  ─────────────────────────────────────────────────────────────
--  Eén rij per betaling van Mollie. De rij wordt aangemaakt door de
--  edge function betaling-starten (status 'open') en later bijgewerkt
--  door verwerk_betaling() zodra Mollie meldt dat er betaald is.
--
--  Bij een verlenging via Mollie Subscriptions bestaat die rij nog
--  niet — Mollie incasseert dan zelf en meldt een betaalnummer dat
--  hier nog nooit is langsgekomen. verwerk_betaling() maakt de rij in
--  dat geval zelf aan; zie DEEL 3.
-- ══════════════════════════════════════════════════════════════

create table if not exists public.betalingen (
  id                 uuid primary key default gen_random_uuid(),

  -- Het betaalnummer van Mollie (tr_…). Dit is HET slot tegen dubbel
  -- boeken: zonder deze unieke index kan dezelfde melding twee rijen
  -- maken en werkt de bescherming in DEEL 3 niet meer.
  mollie_betaling_id text not null unique,

  -- Met opzet GEEN "on delete cascade", anders dan bij
  -- public.abonnementen (01-schema.sql regel 106). Wordt een club
  -- verwijderd, dan blijft de betaling staan met een leeg club_id.
  club_id            uuid references public.clubs(id) on delete set null,

  -- De clubnaam zoals die was op het moment van betalen. Een naam is
  -- geen persoonsgegeven, dus die mag blijven staan als de club weg
  -- is — en zonder deze kolom is zo'n betaling een bedrag zonder
  -- afzender. Een foreign key kan dit niet: die wordt juist leeg.
  club_naam          text,

  -- Het klantnummer van Mollie (cst_…). De enige draad terug naar de
  -- club bij een verlenging die uit het niets binnenkomt.
  mollie_klant_id    text,

  pakket             text,           -- 'coach' of 'club'
  termijn            text,           -- 'maand' of 'jaar'

  -- Vrije tekst, met opzet zonder check: hier komt straks ook de
  -- status van Mollie zelf in te staan (open, paid, failed, expired,
  -- canceled). Wat deze database zelf schrijft is 'betaald' of
  -- 'genegeerd_testmodus'.
  status             text not null default 'open',

  -- 'test' of 'live', uit het antwoord van Mollie — niet uit iets wat
  -- de app zelf meestuurt. Zie DEEL 3, punt 2.
  modus              text not null default 'test'
                     check (modus in ('test','live')),

  betaald_op         timestamptz,
  -- Leeg = nog niet verwerkt. Dit veld is het claimvinkje uit DEEL 3.
  verwerkt_op        timestamptz,
  aangemaakt_op      timestamptz not null default now()
);

comment on table public.betalingen is
  'Boekhouding van de betaalketen: één rij per betaling van Mollie. Alleen te beschrijven via public.verwerk_betaling(); alleen te lezen door een beheerder.';
comment on column public.betalingen.verwerkt_op is
  'Leeg zolang deze melding nog geen pakket heeft opgeleverd. Wordt in dezelfde opdracht gezet als de verwerking zelf — dat is de bescherming tegen een dubbele webhook van Mollie.';

-- Zoeken op club (de betaalgeschiedenis van één vereniging) en op
-- klantnummer (de verlenging uit DEEL 3).
create index if not exists betalingen_club_idx  on public.betalingen (club_id);
create index if not exists betalingen_klant_idx on public.betalingen (mollie_klant_id);

-- ── Het klantnummer bij het abonnement ───────────────────────
--  Mollie Subscriptions incasseert op eigen kalender en meldt alleen
--  een betaalnummer en een klantnummer. Zonder deze kolom is er bij
--  zo'n verlenging geen enkele manier om te weten welke club er
--  betaald heeft.
alter table public.abonnementen
  add column if not exists mollie_klant_id text;

comment on column public.abonnementen.mollie_klant_id is
  'Het klantnummer van Mollie (cst_…) waaronder deze vereniging afrekent. De draad terug naar de club bij een verlenging via Mollie Subscriptions.';

create index if not exists abonnementen_mollie_klant_idx
  on public.abonnementen (mollie_klant_id);


-- ══════════════════════════════════════════════════════════════
--  DEEL 2 — WIE MAG ER IN DE BOEKHOUDING KIJKEN
--  ─────────────────────────────────────────────────────────────
--  Precies zoals public.abonnementen (01-schema.sql regel 288-295) en
--  public.foutmeldingen (16-foutrapportage.sql): rij-beveiliging aan,
--  en met opzet GEEN ENKELE regel voor insert, update of delete.
--
--  Dat is geen slordigheid maar het slot zelf. Staat er geen
--  schrijfregel, dan komt er langs de gewone weg niets binnen — ook
--  niet met een zelfgebouwd verzoek aan de API met de publieke
--  sleutel uit index.html. De enige weg naar binnen is
--  verwerk_betaling(), en die draait met verhoogde rechten
--  (security definer) en heeft zijn eigen twee sloten.
--
--  Lezen mag alleen een beheerder. Niet de club zelf: een club die
--  zijn eigen betaalregels kan lezen, is een club die ook kan zien
--  welke betaling nog niet verwerkt is. Wil Evan later een
--  betaaloverzicht in de app, dan hoort daar een aparte functie bij
--  die alleen de eigen club teruggeeft — geen leesregel hier.
-- ══════════════════════════════════════════════════════════════

alter table public.betalingen enable row level security;

drop policy if exists betalingen_lezen on public.betalingen;
create policy betalingen_lezen on public.betalingen for select
  using (public.is_beheerder());


-- ══════════════════════════════════════════════════════════════
--  DEEL 3 — DE FUNCTIE DIE EEN BETALING OMZET IN EEN PAKKET
--  ─────────────────────────────────────────────────────────────
--  DE TWEE SLOTEN, EN WAAROM ÉÉN TE WEINIG IS
--
--  SLOT 1 is het rechtenslot van Postgres, onderaan dit deel:
--      revoke execute ... from public, anon, authenticated;
--      grant  execute ... to service_role;
--  Dat is niet optioneel en het is geen extraatje. Postgres geeft bij
--  "create function" standaard EXECUTE aan PUBLIC — dus aan iedereen,
--  ook aan een bezoeker zonder account. Zonder die revoke-regel mag
--  letterlijk elke bezoeker deze functie aanroepen zonder dat er ooit
--  een grant voor geschreven is. (Dit is de eerste revoke in deze hele
--  database: "grep -rn revoke server/*.sql" gaf tot vandaag nul
--  treffers.)
--
--  SLOT 2 zit ín de functie zelf: hij kijkt of de aanroeper met de
--  service-sleutel binnenkomt. Dat lijkt dubbelop, totdat je bedenkt
--  hoe slot 1 verdwijnt. Niet door kwade opzet, maar hierdoor:
--
--      drop function public.verwerk_betaling(...);
--      create function public.verwerk_betaling(...);
--
--  Die twee regels zijn nodig zodra er ooit een parameter bij komt —
--  "create or replace" kan de handtekening niet wijzigen. En een nieuw
--  aangemaakte functie krijgt weer het standaardrecht voor PUBLIC.
--  Slot 1 staat dan open, zonder foutmelding, zonder dat iemand het
--  ziet. Slot 2 houdt het dan alsnog tegen.
--
--  Slot 2 gebruikt met opzet een gewone "raise exception" (foutcode
--  P0001) en niet 42501. Anders is in een test niet te onderscheiden
--  of slot 1 of slot 2 het tegenhield — Postgres zelf weigert immers
--  met 42501 — en dan is niet te bewijzen dat er echt twee sloten
--  zijn. Scenario 2c in tests/betaling-verwerken.test.sql meet precies
--  dat verschil.
--
--  WAAROM DE VORM MET request.jwt.claims
--  Supabase stopt de rol uit het token in de instelling
--  request.jwt.claims. Komt de aanroep binnen via de API (PostgREST),
--  dan staat daar de rol in. Komt hij van een los SQL-commando (de
--  SQL Editor, psql), dan is die instelling leeg en kijken we naar
--  session_user: alleen postgres en supabase_admin — dat is Evan zelf
--  in de SQL Editor — mogen het dan. Deze vorm is door Tess getoetst
--  en doet hetzelfde in de lokale wegwerpdatabase als op productie.
-- ══════════════════════════════════════════════════════════════

create or replace function public.verwerk_betaling(
  p_mollie_id    text,
  p_club         uuid,
  p_pakket       text,
  p_termijn      text,
  p_betaald_op   timestamptz,
  p_modus        text default 'test',
  p_mollie_klant text default null
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

  -- ── Wat er niet te verwerken valt ──────────────────────────
  --  Hier hoort de functie wél te klagen. Een onbekende termijn of een
  --  onbekend pakket is geen situatie om stil voorbij te laten gaan:
  --  dan staat er een betaling in de boeken waar niemand een einddatum
  --  of een pakket bij kan bedenken. Mollie probeert het dan opnieuw,
  --  en dat is hier het gewenste gedrag — er ligt echt geld klaar.
  if coalesce(p_mollie_id, '') = '' then
    raise exception 'verwerk_betaling(): geen betaalnummer meegegeven';
  end if;
  if p_termijn is null or p_termijn not in ('maand', 'jaar') then
    raise exception 'verwerk_betaling(): onbekende termijn: %', coalesce(p_termijn, 'niets');
  end if;
  if p_pakket is null or p_pakket not in ('coach', 'club') then
    raise exception 'verwerk_betaling(): onbekend pakket: %', coalesce(p_pakket, 'niets');
  end if;

  -- ── 2. TESTBETALING TERWIJL DE INSTALLATIE LIVE STAAT ──────
  --  Zodra er ÉRGENS in de tabel een verwerkte live-betaling staat,
  --  levert een testbetaling geen pakket meer op. Systeembreed, niet
  --  per club — dat is een bewuste keuze van Tess: een regel per club
  --  laat een gloednieuwe club onbeperkt open voor testbetalingen, en
  --  dat is nou juist de club die iemand met kwade bedoelingen zou
  --  aanmaken.
  --
  --  Wat het kost, eerlijk: Evan kan na de eerste echte betaling niet
  --  meer met de testsleutel een pakket toekennen op productie. Daar
  --  is zet_pakket() voor.
  --
  --  Stil weggooien zou het onmogelijk maken om later te zien wat er
  --  gebeurd is, dus de rij komt er wél, herkenbaar als afgehandeld en
  --  herkenbaar als NIET betaald.
  if p_modus = 'test'
     and exists (select 1 from public.betalingen b
                  where b.modus = 'live' and b.verwerkt_op is not null
                    and b.status = 'betaald') then
    insert into public.betalingen (mollie_betaling_id, club_id, club_naam,
                                   mollie_klant_id, pakket, termijn, modus,
                                   status, betaald_op, verwerkt_op)
    values (p_mollie_id, p_club,
            (select c.naam from public.clubs c where c.id = p_club),
            p_mollie_klant, p_pakket, p_termijn, p_modus,
            'genegeerd_testmodus', p_betaald_op, now())
    on conflict (mollie_betaling_id) do update
      set status      = 'genegeerd_testmodus',
          verwerkt_op = coalesce(betalingen.verwerkt_op, now());
    return;
  end if;

  -- ── 3. CLAIMEN EN VERWERKEN IN ÉÉN OPDRACHT ────────────────
  --  Dit is het patroon tegen een dubbele webhook, en het werkt ook
  --  als er twee meldingen tegelijk binnenkomen. Postgres zet de
  --  tweede update op het rijslot in de wachtstand en toetst daarna de
  --  where opnieuw; die ziet dan verwerkt_op al staan en raakt nul
  --  rijen. Een implementatie die eerst leest en dan schrijft haalt
  --  dezelfde test maar boekt bij twee gelijktijdige meldingen wél
  --  twee keer. Het stukje dat het verschil maakt is
  --  "and verwerkt_op is null" in de where hieronder — haal dat niet
  --  weg.
  update public.betalingen
     set status      = 'betaald',
         verwerkt_op = now(),
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
    -- Staat de rij er al MET verwerkt_op gevuld? Dan is dit een
    -- tweede melding van dezelfde betaling: stil klaar, en vooral
    -- geen tweede maand weggeven.
    if exists (select 1 from public.betalingen b
                where b.mollie_betaling_id = p_mollie_id) then
      return;
    end if;

    -- Bestaat de rij helemaal niet, dan is dit een verlenging via
    -- Mollie Subscriptions: Mollie heeft zelf geïncasseerd en er is
    -- nooit een betaling gestart die een rij klaarzette. De club is
    -- dan alleen nog te vinden via het klantnummer.
    v_club := coalesce(
      p_club,
      (select a.club_id from public.abonnementen a
        where p_mollie_klant is not null
          and a.mollie_klant_id = p_mollie_klant
        limit 1));

    -- Onbekend klantnummer: stil klaar. Geen fout — een fout zou
    -- Mollie aan het opnieuw proberen zetten, en er is niets om
    -- opnieuw te proberen. Ook geen boeking, want een boeking zonder
    -- club is een bedrag dat nergens bij hoort.
    if v_club is null then
      return;
    end if;

    insert into public.betalingen (mollie_betaling_id, club_id, club_naam,
                                   mollie_klant_id, pakket, termijn, modus,
                                   status, betaald_op, verwerkt_op)
    values (p_mollie_id, v_club,
            (select c.naam from public.clubs c where c.id = v_club),
            p_mollie_klant, p_pakket, p_termijn, p_modus,
            'betaald', p_betaald_op, now())
    on conflict (mollie_betaling_id) do nothing;

    -- Kwam er tóch niets bij, dan was een gelijktijdige melding net
    -- eerder. Die heeft het werk dan al gedaan.
    get diagnostics v_geraakt = row_count;
    if v_geraakt = 0 then
      return;
    end if;
    v_modus := p_modus;
  end if;

  -- De rij bestond al, maar zonder club en zonder klantnummer erbij:
  -- laatste poging via het klantnummer uit deze melding.
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

  -- De betaling staat nu in de boeken. Is er geen club bij te vinden,
  -- dan houdt het hier op: er valt geen pakket toe te kennen.
  if v_club is null then
    return;
  end if;

  -- ── 4. WAAR DE NIEUWE EINDDATUM VANDAAN KOMT ───────────────
  --    · loopt het abonnement nog -> optellen bij de einddatum
  --    · is het al verlopen       -> optellen bij vandaag
  --  Wie een dag te vroeg verlengt, hoort geen dag kwijt te raken; en
  --  een einddatum van vorig jaar mag niet blijven doortellen.
  --
  --  En het geval dat makkelijk over het hoofd wordt gezien: een
  --  vereniging die van Evan onbeperkt toegang heeft (pakket coach of
  --  club, géén einddatum). Daar "vandaag + een maand" van maken is
  --  een afwaardering dóór een betaling. Die blijft dus onbeperkt.
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
  --  Met opzet NIET via zet_pakket(): die functie is en blijft van
  --  Evans handmatige beheer (hij eist is_beheerder(), en die vraag
  --  heeft hier geen antwoord — er zit geen mens achter deze aanroep).
  --  Dit is een eigen pad naar dezelfde tabel.
  --
  --  De trigger abonnementen_ooit_betaald (17-free-serverdata.sql,
  --  hieronder uitgebreid) zet vanzelf ooit_betaald en betaald_tot.
  insert into public.abonnementen (club_id, pakket, geldig_tot, mollie_klant_id)
  values (v_club, p_pakket, v_nieuw_tot, p_mollie_klant)
  on conflict (club_id) do update
    set pakket          = excluded.pakket,
        geldig_tot      = excluded.geldig_tot,
        mollie_klant_id = coalesce(excluded.mollie_klant_id,
                                   abonnementen.mollie_klant_id);
end $$;

comment on function public.verwerk_betaling(text, uuid, text, text, timestamptz, text, text) is
  'Zet een geslaagde betaling van Mollie om in een pakket. Alleen aan te roepen met de service-sleutel (twee sloten). Verwerkt elke melding hoogstens één keer.';

-- ── SLOT 1 — het aanroeprecht ────────────────────────────────
--  Zie de uitleg bovenaan dit deel. Deze twee regels zijn geen
--  franje: zonder de revoke mag PUBLIC (dus iedereen, ook zonder
--  account) deze functie aanroepen.
revoke execute on function public.verwerk_betaling(text, uuid, text, text, timestamptz, text, text)
  from public, anon, authenticated;
grant  execute on function public.verwerk_betaling(text, uuid, text, text, timestamptz, text, text)
  to service_role;


-- ══════════════════════════════════════════════════════════════
--  DEEL 4 — ZESTIG DAGEN COULANCE
--  ─────────────────────────────────────────────────────────────
--  Besluit van Evan (18 september 2026): een vereniging waarvan het
--  abonnement afloopt mag nog ZESTIG DAGEN IN TOTAAL naar de server
--  blijven schrijven. Inclusief de respijt die er al was:
--
--      respijt_dagen  14   (bestond al, 06-pakketten.sql)
--    + coulance_dagen 46   (nieuw)
--    ─────────────────────
--                     60
--
--  Daarom staat er 46 in de instelling en niet 60. Wie daar 60
--  neerzet, geeft in werkelijkheid 74 dagen weg.
--
--  LET OP: docs/avg-inventaris.md §8.8 zegt nu nog "zestig dagen
--  bovenop de bestaande veertien dagen respijt". Evan heeft bevestigd
--  dat zestig het TOTAAL is; die ene zin moet nog mee veranderen.
--
--  Waarom dit nodig is: 17-free-serverdata.sql gaf een vereniging die
--  ooit betaald had voor altijd schrijfrecht. Dat was te ruim — dan
--  is één maand betalen genoeg om er jaren op te blijven staan. Maar
--  meteen dichtgooien is te streng: een mislukte incasso is geen
--  reden om iemand halverwege het seizoen buiten te sluiten.
-- ══════════════════════════════════════════════════════════════

insert into public.pakket_instellingen (sleutel, getal, uitleg) values
  ('coulance_dagen', 46,
   'Samen met respijt_dagen (14) precies 60 dagen na het verlopen van een betaald abonnement waarin een club nog naar de server mag schrijven.')
on conflict (sleutel) do nothing;

-- ── Tot wanneer is er betaald? ───────────────────────────────
--  geldig_tot kan omlaag (een beheerder zet iets terug, een kortere
--  betaling komt na een langere binnen). De coulance mag daar niet
--  mee omlaag, anders raakt een klant zijn schrijfrecht kwijt door een
--  typefout. Vandaar een aparte kolom die alleen vooruit gaat.
alter table public.abonnementen
  add column if not exists betaald_tot date;

comment on column public.abonnementen.betaald_tot is
  'De verste datum waartoe deze vereniging ooit betaald heeft. Gaat nooit achteruit. Samen met respijt_dagen en coulance_dagen bepaalt dit hoe lang een verlopen klant nog naar de server mag schrijven — zie public.schrijfrecht_tot().';

-- ── De bestaande trigger, UITGEBREID ─────────────────────────
--  Dit is dezelfde functie als in 17-free-serverdata.sql, met
--  betaald_tot erbij. Uitgebreid en niet vervangen: alles wat hij al
--  deed voor ooit_betaald blijft woordelijk staan.
--
--  Waarom een trigger en niet een regel in zet_pakket() of in
--  verwerk_betaling(): public.abonnementen wordt óók gewoon met de
--  hand in de tabeleditor van Supabase bijgewerkt (01-schema.sql
--  regel 288-292 zegt dat letterlijk). Een trigger vuurt langs élke
--  weg naar binnen. Scenario 11a/11b in
--  tests/free-server-afscherming.test.sql toetst precies die twee
--  wegen apart.
--
--  DRIE DINGEN DOET HIJ, EN DE DERDE IS DE SUBTIELSTE:
--    1. wordt het pakket coach of club, dan gaat ooit_betaald aan;
--    2. stond ooit_betaald al aan, dan blijft het aan;
--    3. betaald_tot gaat mee vooruit met de einddatum, en gaat bij
--       ELKE wijziging nooit achteruit — ook niet bij een wijziging
--       die naar free gaat. Dat laatste is een apart gat: bij een
--       vereniging die al op free staat doet regel 1 niets, en is dit
--       het enige dat betaald_tot overeind houdt. En dat is nou juist
--       de vereniging waar de coulance-grens voor bedoeld is
--       (scenario 2f in tests/coulance-60-dagen.test.sql).
--
--  greatest() laat lege waarden vanzelf vallen: greatest(null, X) is
--  X, en greatest(null, null) is null. Daarom krijgt een abonnement
--  zónder einddatum (onbeperkt, met de hand door Evan gezet) géén
--  betaald_tot opgedrongen — hij houdt gewoon wat er stond. Dat is
--  precies wat er moet gebeuren: bij zo'n vereniging komt de
--  coulance-grens helemaal niet aan bod, want pakket_van_club() geeft
--  daar geen 'free' terug.
create or replace function public.ooit_betaald_vasthouden()
returns trigger language plpgsql as $$
declare
  v_oud_tot   date    := null;
  v_oud_ooit  boolean := false;
begin
  -- OLD bestaat niet bij een insert; eerst veilig uitlezen.
  if tg_op = 'UPDATE' then
    v_oud_tot  := old.betaald_tot;
    v_oud_ooit := old.ooit_betaald;
  end if;

  if new.pakket in ('coach','club') then
    new.ooit_betaald := true;
    -- Betaalde periode: betaald_tot loopt mee met de einddatum, maar
    -- nooit naar beneden.
    new.betaald_tot := greatest(new.geldig_tot, new.betaald_tot, v_oud_tot);
  end if;

  if v_oud_ooit then
    new.ooit_betaald := true;   -- nooit terug naar false
  end if;

  -- Bij élke wijziging: betaald_tot mag nooit achteruit. Dit is de
  -- enige bescherming voor een vereniging die al op free staat.
  new.betaald_tot := greatest(new.betaald_tot, v_oud_tot);

  return new;
end $$;

comment on function public.ooit_betaald_vasthouden() is
  'Zet abonnementen.ooit_betaald op true zodra het pakket coach of club wordt en laat het daarna nooit meer op false komen. Houdt abonnementen.betaald_tot gelijk aan de verste betaalde einddatum; die gaat nooit achteruit.';

-- De trigger zelf staat al in 17-free-serverdata.sql. Hij wordt hier
-- opnieuw gezet zodat dit bestand ook klopt als 01-schema.sql of
-- 17 in de tussentijd opnieuw is gedraaid.
drop trigger if exists abonnementen_ooit_betaald on public.abonnementen;
create trigger abonnementen_ooit_betaald
  before insert or update on public.abonnementen
  for each row execute function public.ooit_betaald_vasthouden();

-- ── Tot wanneer mag er nog geschreven worden? ────────────────
--  Eén functie, zodat overal hetzelfde antwoord komt — net als
--  mijn_clubs(), mag_schrijven() en pakket_van_club().
--
--  Geeft niets (null) terug als er geen betaald_tot bekend is. Dat is
--  met opzet: een vereniging die klant was vóórdat deze kolom bestond
--  heeft hem leeg, en niets weten is geen reden om een deur dicht te
--  doen. mag_serverdata_schrijven() hieronder vangt dat af met een
--  coalesce.
--
--  security definer om dezelfde reden als bij pakket_van_club():
--  zonder verhoogde rechten loopt de functie vast op de leesregel van
--  abonnementen zodra hij voor een andere vereniging dan je eigen
--  wordt aangeroepen, en is het antwoord onterecht "geen recht".
create or replace function public.schrijfrecht_tot(doel uuid)
returns date language sql stable security definer set search_path = public as $$
  select a.betaald_tot
       + coalesce((select i.getal from public.pakket_instellingen i where i.sleutel = 'respijt_dagen'), 0)
       + coalesce((select i.getal from public.pakket_instellingen i where i.sleutel = 'coulance_dagen'), 0)
    from public.abonnementen a
   where a.club_id = doel
$$;

grant execute on function public.schrijfrecht_tot(uuid) to authenticated;

comment on function public.schrijfrecht_tot(uuid) is
  'Tot en met welke dag mag deze vereniging nog naar de server schrijven nadat het betaalde abonnement is verlopen? betaald_tot plus respijt_dagen plus coulance_dagen (samen 60). Leeg = geen grens bekend.';

-- ── De grens erin, op de juiste plek ─────────────────────────
--  Dit is dezelfde functie als in 17-free-serverdata.sql, met de
--  coulance-grens erbij. Hij wordt hier overschreven en niet in 17
--  aangepast: de bestanden in server/ zijn een geschiedenis, geen
--  momentopname.
--
--  DE HAAKJES ZIJN HET HELE PUNT. De coulance-grens hoort BINNEN de
--  ooit-betaald-tak, niet ernaast. Zo zou het fout zijn:
--
--      and (pakket <> 'free' or ooit_betaald)
--      and current_date <= coalesce(schrijfrecht_tot(doel), current_date)
--
--  betaald_tot loopt namelijk niet mee met een abonnement zónder
--  einddatum. Een vereniging die van Evan onbeperkt toegang heeft
--  gekregen houdt de betaald_tot van de laatste keer dat er wél een
--  einddatum stond. Ligt die meer dan zestig dagen terug, dan sluit de
--  formule hierboven een vereniging buiten die volgens
--  pakket_van_club() gewoon 'club' is. Scenario 5a in
--  tests/coulance-60-dagen.test.sql legt dat verschil vast.
create or replace function public.mag_serverdata_schrijven(doel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.mag_schrijven(doel)
     and (public.pakket_van_club(doel) <> 'free'
          or (coalesce((select a.ooit_betaald from public.abonnementen a
                        where a.club_id = doel), false)
              and current_date <= coalesce(public.schrijfrecht_tot(doel), current_date)))
$$;

grant execute on function public.mag_serverdata_schrijven(uuid) to authenticated;

comment on function public.mag_serverdata_schrijven(uuid) is
  'Mag deze gebruiker nieuwe gegevens van deze vereniging op de server zetten? mag_schrijven() plus de pakketgrens uit docs/pakketten-besluit.md: Free komt niet op de server, tenzij de vereniging ooit klant is geweest én de zestig dagen coulance nog niet voorbij zijn.';

-- ── Terugwerkend: geen bestaande klant vergeten ──────────────
--  betaald_tot is pas vandaag bedacht, maar de klanten bestonden al.
--  Zonder deze twee regels merkt niemand iets — tot het moment dat de
--  coulance-grens gaat gelden en er klanten buiten komen te staan die
--  niets verkeerd hebben gedaan. In de lokale wegwerpdatabase is dit
--  niet te zien (die is leeg); op productie is het het enige dat
--  telt.
--
--  Allebei veilig om nog eens te draaien: ze raken alleen rijen waar
--  betaald_tot nog leeg is.
update public.abonnementen
   set betaald_tot = geldig_tot
 where ooit_betaald and betaald_tot is null and geldig_tot is not null;

-- En wie klant was zonder einddatum (onbeperkt): die krijgt vandaag
-- als ijkpunt. Zou hij leeg blijven, dan is er bij een latere
-- afwaardering naar free geen enkele datum om vanaf te rekenen.
update public.abonnementen
   set betaald_tot = current_date
 where ooit_betaald and betaald_tot is null;


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is alles goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  Hieronder komt een tabel terug. In de kolom "oordeel" hoort overal
--  "in orde" te staan. Staat er ergens "LET OP", draai dit bestand
--  dan nog een keer; twee keer draaien kan geen kwaad.
--
--  EERLIJK OVER WAT DIT BLOK WEL EN NIET VANGT
--  Draai je het hele bestand, dan staat alles hierboven net opnieuw
--  neergezet en is dit blok bijna per definitie groen. Waar het écht
--  voor is: later los draaien. Selecteer dan alleen dit ene
--  "select ... order by 1;" en klik op Run. Dan zie je of er sindsdien
--  iets is verschoven — bijvoorbeeld doordat iemand 01-schema.sql of
--  17-free-serverdata.sql opnieuw heeft gedraaid, want die zetten de
--  oude versies zonder waarschuwing terug.
--
--  Dit blok kijkt of de onderdelen er stáán. Of ze ook doen wat ze
--  moeten doen, tonen de drie testbestanden aan (zie bovenaan). Die
--  mogen ook gewoon in deze SQL Editor: ze maken hun eigen
--  verenigingen aan en draaien zichzelf aan het eind terug.
--
--  Getest met opzettelijke fouten: de twee revoke-regels weggehaald,
--  en de uitbreiding van de trigger teruggedraaid — dit blok werd
--  allebei de keren "LET OP" op precies die regel.
--
--  ÉÉN UITZONDERING: heb je het terugdraaiblok onderaan gedraaid én
--  daar ook de kolom betaald_tot weggegooid, dan geeft dit blok een
--  foutmelding ("column betaald_tot does not exist") in plaats van een
--  tabel. Dat is geen storing maar het antwoord: DEEL 4 staat er dan
--  niet meer.
-- ══════════════════════════════════════════════════════════════
select 'de tabel public.betalingen bestaat' as controle,
       case when to_regclass('public.betalingen') is not null then 'ja' else 'nee' end as gevonden,
       case when to_regclass('public.betalingen') is not null then 'in orde' else 'LET OP' end as oordeel
union all
select 'mollie_betaling_id is uniek (het slot tegen dubbel boeken)',
       case when exists (select 1 from pg_index i
                         join pg_class c on c.oid = i.indrelid
                         join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
                         where c.relname = 'betalingen' and i.indisunique
                           and a.attname = 'mollie_betaling_id' and i.indnatts = 1)
            then 'ja' else 'nee' end,
       case when exists (select 1 from pg_index i
                         join pg_class c on c.oid = i.indrelid
                         join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
                         where c.relname = 'betalingen' and i.indisunique
                           and a.attname = 'mollie_betaling_id' and i.indnatts = 1)
            then 'in orde' else 'LET OP' end
union all
select 'de boekhouding overleeft een verwijderde club (on delete set null)',
       coalesce((select case con.confdeltype when 'n' then 'set null'
                                             when 'c' then 'cascade'
                                             else con.confdeltype::text end
                 from pg_constraint con
                 join pg_class c on c.oid = con.conrelid
                 join pg_attribute a on a.attrelid = c.oid and a.attnum = con.conkey[1]
                 where c.relname = 'betalingen' and con.contype = 'f' and a.attname = 'club_id'
                 limit 1), 'geen verwijzing gevonden'),
       case when (select con.confdeltype from pg_constraint con
                  join pg_class c on c.oid = con.conrelid
                  join pg_attribute a on a.attrelid = c.oid and a.attnum = con.conkey[1]
                  where c.relname = 'betalingen' and con.contype = 'f' and a.attname = 'club_id'
                  limit 1) = 'n' then 'in orde' else 'LET OP' end
union all
select 'rij-beveiliging staat aan op betalingen',
       case when (select relrowsecurity from pg_class where oid = to_regclass('public.betalingen'))
            then 'ja' else 'nee' end,
       case when (select relrowsecurity from pg_class where oid = to_regclass('public.betalingen'))
            then 'in orde' else 'LET OP' end
union all
select 'geen enkele schrijfregel op betalingen (alleen via de functie)',
       (select count(*)::text || ' regel(s) voor insert/update/delete' from pg_policy
         where polrelid = to_regclass('public.betalingen') and polcmd in ('a','w','d','*')),
       case when (select count(*) from pg_policy
                   where polrelid = to_regclass('public.betalingen')
                     and polcmd in ('a','w','d','*')) = 0
            then 'in orde' else 'LET OP' end
union all
select 'lezen mag alleen een beheerder',
       coalesce((select pg_get_expr(polqual, polrelid) from pg_policy
                 where polrelid = to_regclass('public.betalingen') and polcmd = 'r' limit 1),
                'geen leesregel'),
       case when coalesce((select pg_get_expr(polqual, polrelid) from pg_policy
                           where polrelid = to_regclass('public.betalingen') and polcmd = 'r' limit 1), '')
                 like '%is_beheerder%' then 'in orde' else 'LET OP' end
union all
select 'verwerk_betaling() bestaat en draait met verhoogde rechten',
       coalesce((select case when prosecdef then 'security definer' else 'security invoker' end
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1),
                'de functie bestaat niet'),
       case when coalesce((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1), false)
            then 'in orde' else 'LET OP' end
union all
select 'SLOT 1: alleen de service-sleutel mag verwerk_betaling() aanroepen',
       coalesce((select 'authenticated=' || has_function_privilege('authenticated', p.oid, 'execute')
                     || ', anon='         || has_function_privilege('anon',          p.oid, 'execute')
                     || ', public='       || has_function_privilege('public',        p.oid, 'execute')
                     || ', service_role=' || has_function_privilege('service_role',  p.oid, 'execute')
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1),
                'de functie bestaat niet'),
       coalesce((select case when not has_function_privilege('authenticated', p.oid, 'execute')
                              and not has_function_privilege('anon',          p.oid, 'execute')
                              and not has_function_privilege('public',        p.oid, 'execute')
                              and     has_function_privilege('service_role',  p.oid, 'execute')
                             then 'in orde' else 'LET OP' end
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1), 'LET OP')
union all
select 'SLOT 2: de functie controleert de rol óók zelf',
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1), '')
                 like '%request.jwt.claims%' then 'ja' else 'nee' end,
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1), '')
                 like '%request.jwt.claims%' then 'in orde' else 'LET OP' end
union all
select 'claimen en verwerken gebeurt in één opdracht (de dubbele webhook)',
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1), '')
                 ~* 'update\s+(public\.)?betalingen(.|\n)*?where(.|\n)*?verwerkt_op\s+is\s+null'
            then 'ja' else 'nee' end,
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'verwerk_betaling' limit 1), '')
                 ~* 'update\s+(public\.)?betalingen(.|\n)*?where(.|\n)*?verwerkt_op\s+is\s+null'
            then 'in orde' else 'LET OP' end
union all
select 'de instelling coulance_dagen staat op 46',
       coalesce((select getal::text from public.pakket_instellingen where sleutel = 'coulance_dagen'), 'ontbreekt'),
       case when (select getal from public.pakket_instellingen where sleutel = 'coulance_dagen') = 46
            then 'in orde' else 'LET OP' end
union all
select 'respijt + coulance is samen 60 dagen',
       coalesce((select sum(getal)::text from public.pakket_instellingen
                  where sleutel in ('respijt_dagen','coulance_dagen')), 'ontbreekt'),
       case when (select sum(getal) from public.pakket_instellingen
                   where sleutel in ('respijt_dagen','coulance_dagen')) = 60
            then 'in orde' else 'LET OP' end
union all
select 'de kolom abonnementen.betaald_tot bestaat',
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'abonnementen'
                           and column_name = 'betaald_tot') then 'ja' else 'nee' end,
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'abonnementen'
                           and column_name = 'betaald_tot') then 'in orde' else 'LET OP' end
union all
select 'de kolom abonnementen.mollie_klant_id bestaat (voor verlengingen)',
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'abonnementen'
                           and column_name = 'mollie_klant_id') then 'ja' else 'nee' end,
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'abonnementen'
                           and column_name = 'mollie_klant_id') then 'in orde' else 'LET OP' end
union all
select 'de trigger op abonnementen houdt betaald_tot bij',
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'ooit_betaald_vasthouden' limit 1), '')
                 like '%betaald_tot%' then 'ja' else 'nee, nog de oude versie uit 17' end,
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'ooit_betaald_vasthouden' limit 1), '')
                 like '%betaald_tot%' then 'in orde' else 'LET OP' end
union all
select 'de trigger vuurt bij insert én update',
       coalesce((select case when (tgtype & 4) > 0 and (tgtype & 16) > 0
                             then 'insert en update' else 'niet allebei' end
                 from pg_trigger where tgname = 'abonnementen_ooit_betaald'
                   and tgrelid = 'public.abonnementen'::regclass limit 1), 'geen trigger'),
       case when exists (select 1 from pg_trigger where tgname = 'abonnementen_ooit_betaald'
                           and tgrelid = 'public.abonnementen'::regclass
                           and (tgtype & 4) > 0 and (tgtype & 16) > 0)
            then 'in orde' else 'LET OP' end
union all
select 'schrijfrecht_tot() bestaat en draait met verhoogde rechten',
       coalesce((select case when prosecdef then 'security definer' else 'security invoker' end
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'schrijfrecht_tot' limit 1),
                'de functie bestaat niet'),
       case when coalesce((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'schrijfrecht_tot' limit 1), false)
            then 'in orde' else 'LET OP' end
union all
select 'mag_serverdata_schrijven() kent de coulance-grens',
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'mag_serverdata_schrijven' limit 1), '')
                 like '%schrijfrecht_tot%' then 'ja' else 'nee, nog de oude versie uit 17' end,
       case when coalesce((select pg_get_functiondef(p.oid) from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname = 'mag_serverdata_schrijven' limit 1), '')
                 like '%schrijfrecht_tot%' then 'in orde' else 'LET OP' end
union all
-- Deze twee zeggen alleen iets op productie: in een lege database is
-- er niets om terugwerkend te vullen.
select 'terugwerkend gevuld: geen klant zonder betaald_tot',
       (select count(*)::text || ' klant(en) zonder betaald_tot' from public.abonnementen
         where ooit_betaald and betaald_tot is null),
       case when (select count(*) from public.abonnementen
                   where ooit_betaald and betaald_tot is null) = 0
            then 'in orde' else 'LET OP' end
union all
select 'public.gegevens gebruikt nog steeds mag_serverdata_schrijven()',
       coalesce((select pg_get_expr(polwithcheck, polrelid) from pg_policy
                 where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_schrijven' limit 1),
                'geen regel'),
       case when coalesce((select pg_get_expr(polwithcheck, polrelid) from pg_policy
                           where polrelid = 'public.gegevens'::regclass
                             and polname = 'gegevens_schrijven' limit 1), '')
                 like '%mag_serverdata_schrijven%' then 'in orde' else 'LET OP' end
order by 1;


-- ══════════════════════════════════════════════════════════════
--  WIE RAAKT DIT? — een overzicht, dat niets verandert
--  ─────────────────────────────────────────────────────────────
--  Draai dit gerust los. Het schrijft niets weg; het laat alleen zien
--  wat de coulance-regeling per vereniging betekent.
--
--  In de kolom "gevolg" staat:
--    · "mag schrijven"      — betaalt nu (of heeft onbeperkt)
--    · "coulance loopt nog" — verlopen, maar binnen de zestig dagen
--    · "GEEN SERVER"        — gratis, of de zestig dagen zijn om
-- ══════════════════════════════════════════════════════════════
select c.naam                        as vereniging,
       a.pakket                      as pakket_in_de_tabel,
       public.pakket_van_club(c.id)  as pakket_nu_geldig,
       a.geldig_tot,
       a.betaald_tot,
       public.schrijfrecht_tot(c.id) as schrijven_mag_tot_en_met,
       case when public.pakket_van_club(c.id) <> 'free' then 'mag schrijven'
            when coalesce(a.ooit_betaald, false)
                 and current_date <= coalesce(public.schrijfrecht_tot(c.id), current_date)
                 then 'coulance loopt nog'
            else 'GEEN SERVER' end   as gevolg
from public.clubs c
left join public.abonnementen a on a.club_id = c.id
order by 7, 1;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Haal bij de regels hieronder de twee streepjes vooraan weg,
--  selecteer alleen dat stuk en klik op Run. Daarmee is alles weer
--  zoals vóór dit bestand: geen betaalketen, en de coulance-grens
--  weg (wie ooit betaald heeft, mag dan weer altijd schrijven —
--  precies zoals 17-free-serverdata.sql het liet).
--
--  Er staan twee stappen los onderaan, met een extra streepje ervoor:
--  de tabel betalingen en de kolom betaald_tot weggooien. Die zijn
--  NIET terug te draaien. De boekhouding weggooien betekent dat je
--  niet meer kunt zien wat er betaald is; dat wil je bijna nooit.
-- ══════════════════════════════════════════════════════════════

-- -- 1. De oude versie van mag_serverdata_schrijven() terug, precies
-- --    zoals 17-free-serverdata.sql hem neerzet: ooit betaald is
-- --    genoeg, zonder tijdgrens.
-- create or replace function public.mag_serverdata_schrijven(doel uuid)
-- returns boolean language sql stable security definer set search_path = public as $$
--   select public.mag_schrijven(doel)
--      and (public.pakket_van_club(doel) <> 'free'
--           or coalesce((select a.ooit_betaald from public.abonnementen a
--                        where a.club_id = doel), false))
-- $$;
--
-- -- 2. De oude trigger terug: alleen ooit_betaald, geen betaald_tot.
-- create or replace function public.ooit_betaald_vasthouden()
-- returns trigger language plpgsql as $$
-- begin
--   if new.pakket in ('coach','club') then
--     new.ooit_betaald := true;
--   end if;
--   if tg_op = 'UPDATE' and old.ooit_betaald then
--     new.ooit_betaald := true;
--   end if;
--   return new;
-- end $$;
--
-- -- 3. schrijfrecht_tot() weg. Moet ná stap 1: zolang
-- --    mag_serverdata_schrijven() hem nog aanroept, weigert Postgres
-- --    hem te laten vallen.
-- drop function if exists public.schrijfrecht_tot(uuid);
--
-- -- 4. De instelling weg (het getal 46).
-- delete from public.pakket_instellingen where sleutel = 'coulance_dagen';
--
-- -- 5. De verwerkfunctie weg. De boekhouding blijft staan.
-- drop function if exists public.verwerk_betaling(text, uuid, text, text, timestamptz, text, text);
--
-- -- 6. ALLEEN als je de boekhouding écht kwijt wil — lees eerst de
-- --    uitleg hierboven. Dit is niet terug te draaien.
-- -- drop table if exists public.betalingen;
-- -- alter table public.abonnementen drop column if exists betaald_tot;
-- -- alter table public.abonnementen drop column if exists mollie_klant_id;
