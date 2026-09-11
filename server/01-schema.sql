-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — het databaseschema
--  ─────────────────────────────────────────────────────────────
--  Draai dit één keer in Supabase: open je project, ga naar
--  "SQL Editor", plak dit hele bestand en klik op Run.
--
--  Wat er hier gebeurt, in gewone woorden:
--
--    club      een vereniging. FC Harlingen is er één.
--    lid       een persoon die bij een club hoort, met een rol.
--    team      een elftal binnen een club. JO19-2 is er één.
--    gegeven   alles wat de app per team bewaart: de spelers, de
--              wedstrijden, de trainingen. Eén regel per soort.
--    persoonlijk  wat van jóú is en niet van een team: je
--              oefeningenbibliotheek, je voorkeuren, het complex.
--
--  De opzet met één tabel voor alle teamgegevens lijkt lui, maar is
--  het niet. De app bewaart al jaren per soort één blok tekst, en
--  dat blok kan van vorm veranderen zonder dat de database mee hoeft
--  te verhuizen. Zou ik hier een tabel "spelers" met kolommen maken,
--  dan is elke nieuwe eigenschap van een speler een verbouwing van de
--  database én van de app tegelijk. Nu is het alleen de app.
--
--  Het belangrijkste staat onderaan: row level security. Zonder die
--  regels kan iedereen die het adres van je server kent alle
--  gegevens van alle clubs opvragen — ook de geboortedata van
--  andermans kinderen. Mét die regels bepaalt de database zelf, bij
--  elke vraag, of jij erbij mag. Dat is niet iets wat de app kan
--  omzeilen, en dat is precies de bedoeling.
-- ══════════════════════════════════════════════════════════════

-- ── Clubs ────────────────────────────────────────────────────
create table if not exists public.clubs (
  id          uuid primary key default gen_random_uuid(),
  naam        text not null,
  logo        text,                       -- data-url, mag leeg
  gemaakt_op  timestamptz not null default now()
);

-- ── Wie bij welke club hoort ─────────────────────────────────
--  De rol bepaalt wat je mag. "eigenaar" is degene die de club
--  heeft aangemaakt; die kan als enige mensen toevoegen of de club
--  opheffen. Een "trainer" beheert zijn teams. Een "kijker" mag
--  alles zien en niets veranderen — handig voor een bestuurslid.
create table if not exists public.leden (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs(id) on delete cascade,
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  naam         text,
  rol          text not null default 'trainer'
               check (rol in ('eigenaar', 'trainer', 'kijker')),
  gemaakt_op   timestamptz not null default now(),
  unique (club_id, gebruiker_id)
);
create index if not exists leden_gebruiker on public.leden(gebruiker_id);

-- ── Teams ────────────────────────────────────────────────────
--  De id is een tekst en geen uuid, want de app maakt zijn teams al
--  aan voordat hij ooit een server heeft gezien. Die nummers moeten
--  blijven kloppen als zo'n apparaat later inlogt; anders raakt
--  alles wat eronder hangt zijn plek kwijt.
create table if not exists public.teams (
  id            text primary key,
  club_id       uuid not null references public.clubs(id) on delete cascade,
  naam          text not null,
  gemaakt_op    timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  verwijderd_op timestamptz                -- leeg betekent: bestaat nog
);
create index if not exists teams_club on public.teams(club_id);

-- ── De gegevens van een team ─────────────────────────────────
--  Eén regel per team en per soort. De sleutel is dezelfde naam die
--  de app op het apparaat gebruikt, bijvoorbeeld fch_spelers_v1.
--
--  bijgewerkt_op is het hart van het synchroniseren: daaraan ziet
--  een apparaat of de server iets nieuwers heeft dan hijzelf.
--  apparaat vertelt wie het schreef, zodat de app zijn eigen
--  wijziging niet als die van een ander aanziet.
create table if not exists public.gegevens (
  team_id       text not null references public.teams(id) on delete cascade,
  sleutel       text not null,
  waarde        jsonb not null,
  bijgewerkt_op timestamptz not null default now(),
  apparaat      text,
  primary key (team_id, sleutel)
);

-- ── Wat van jou is en niet van een team ──────────────────────
create table if not exists public.persoonlijk (
  gebruiker_id  uuid not null references auth.users(id) on delete cascade,
  sleutel       text not null,
  waarde        jsonb not null,
  bijgewerkt_op timestamptz not null default now(),
  apparaat      text,
  primary key (gebruiker_id, sleutel)
);

-- ── Welk pakket een club heeft ───────────────────────────────
--  Dit staat met opzet op de server en niet in de app. In de browser
--  is elk slot te openen door wie de ontwikkelaarsconsole kent; hier
--  niet. De app vraagt het op en gehoorzaamt, maar de waarheid staat
--  hier — en niemand kan deze tabel zelf aanpassen, want er is
--  hieronder geen enkele regel die schrijven toestaat.
create table if not exists public.abonnementen (
  club_id    uuid primary key references public.clubs(id) on delete cascade,
  pakket     text not null default 'free'
             check (pakket in ('free', 'coach', 'club')),
  geldig_tot date,
  notitie    text
);

-- ══════════════════════════════════════════════════════════════
--  BIJHOUDEN WANNEER IETS IS VERANDERD
--  Niet aan de app overlaten: die kan zich vergissen in de tijd, of
--  in een andere tijdzone staan. De server weet hoe laat het is.
-- ══════════════════════════════════════════════════════════════
create or replace function public.zet_bijgewerkt()
returns trigger language plpgsql as $$
begin
  new.bijgewerkt_op := now();
  return new;
end $$;

drop trigger if exists gegevens_bijgewerkt on public.gegevens;
create trigger gegevens_bijgewerkt before insert or update on public.gegevens
  for each row execute function public.zet_bijgewerkt();

drop trigger if exists persoonlijk_bijgewerkt on public.persoonlijk;
create trigger persoonlijk_bijgewerkt before insert or update on public.persoonlijk
  for each row execute function public.zet_bijgewerkt();

drop trigger if exists teams_bijgewerkt on public.teams;
create trigger teams_bijgewerkt before insert or update on public.teams
  for each row execute function public.zet_bijgewerkt();

-- ══════════════════════════════════════════════════════════════
--  WIE MAG WAT
--  ─────────────────────────────────────────────────────────────
--  Vanaf hier bepaalt de database zelf of je iets mag zien of
--  wijzigen. De app hoeft daar niets voor te doen en kan er ook
--  niets aan veranderen: ook iemand die zijn eigen verzoeken naar de
--  server stuurt, komt niet verder dan wat hier staat.
--
--  Zonder deze regels ligt alles open. Dat is bij een app met
--  gegevens van kinderen geen kleinigheid.
-- ══════════════════════════════════════════════════════════════
alter table public.clubs        enable row level security;
alter table public.leden        enable row level security;
alter table public.teams        enable row level security;
alter table public.gegevens     enable row level security;
alter table public.persoonlijk  enable row level security;
alter table public.abonnementen enable row level security;

-- Bij welke clubs hoor ik? Als functie, zodat elke regel hieronder
-- dezelfde vraag stelt en er nooit twee antwoorden kunnen ontstaan.
-- security definer omdat de functie zelf in leden moet kijken, wat
-- anders weer door de regels op leden zou worden tegengehouden.
create or replace function public.mijn_clubs()
returns setof uuid language sql stable security definer set search_path = public as $$
  select club_id from public.leden where gebruiker_id = auth.uid()
$$;

create or replace function public.mag_schrijven(doel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leden
    where gebruiker_id = auth.uid()
      and club_id = doel
      and rol in ('eigenaar', 'trainer')
  )
$$;

-- Ben ik eigenaar van deze club? Apart van mag_schrijven omdat een
-- trainer wel gegevens mag wijzigen maar geen leden mag toevoegen:
-- wie leden mag toevoegen, mag namelijk ook rollen uitdelen.
--
-- Deze functie moet bestaan. De regels op leden hieronder mogen niet
-- zelf in leden kijken met een subquery: Postgres past dan bij het
-- controleren van de regel de regel opnieuw toe, en stopt met
-- "infinite recursion detected in policy for relation leden". Dat is
-- hier maanden onopgemerkt gebleven omdat de app nooit in deze tabel
-- schrijft. security definer verbreekt die kring: binnen de functie
-- gelden de regels op leden niet.
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

-- ── Clubs ────────────────────────────────────────────────────
drop policy if exists clubs_lezen on public.clubs;
create policy clubs_lezen on public.clubs for select
  using (id in (select public.mijn_clubs()));

-- Iedereen mag een club oprichten; je wordt daarmee vanzelf de
-- eigenaar (zie de functie nieuwe_club hieronder).
drop policy if exists clubs_maken on public.clubs;
create policy clubs_maken on public.clubs for insert
  with check (true);

drop policy if exists clubs_wijzigen on public.clubs;
create policy clubs_wijzigen on public.clubs for update
  using (public.mag_schrijven(id));

-- ── Leden ────────────────────────────────────────────────────
drop policy if exists leden_lezen on public.leden;
create policy leden_lezen on public.leden for select
  using (gebruiker_id = auth.uid() or club_id in (select public.mijn_clubs()));

-- Toevoegen mag alleen de eigenaar van diezelfde club.
--
-- Er stond hier eerder ook "of je voegt jezelf toe". Dat klinkt
-- onschuldig maar is het niet: bij een insert kiest de indiener zelf
-- zowel het club_id als de rol. Wie dat mag, kan zichzelf tot eigenaar
-- van zijn eigen club promoveren, en wie het club_id van een vreemde
-- club kent (dat staat in de browser van elk lid) kan zichzelf daar
-- naar binnen schrijven. Die tak is dus met opzet weg.
--
-- Er gaat niets verloren: bij het oprichten van een club voegt
-- nieuwe_club() je als eigenaar toe, en die functie is security
-- definer en gaat sowieso langs deze regel heen.
drop policy if exists leden_toevoegen on public.leden;
create policy leden_toevoegen on public.leden for insert
  with check (public.is_eigenaar(club_id));

-- Bij weghalen blijft de zelf-tak wél staan, en dat verschil met de
-- regel hierboven is bedoeld: jezelf uit een club terugtrekken is
-- legitiem en levert je geen enkel recht op dat je nog niet had.
-- Iemand anders eruit zetten mag alleen de eigenaar.
drop policy if exists leden_weghalen on public.leden;
create policy leden_weghalen on public.leden for delete
  using (gebruiker_id = auth.uid() or public.is_eigenaar(club_id));

-- ── Teams ────────────────────────────────────────────────────
drop policy if exists teams_lezen on public.teams;
create policy teams_lezen on public.teams for select
  using (club_id in (select public.mijn_clubs()));

drop policy if exists teams_schrijven on public.teams;
create policy teams_schrijven on public.teams for insert
  with check (public.mag_schrijven(club_id));

drop policy if exists teams_wijzigen on public.teams;
create policy teams_wijzigen on public.teams for update
  using (public.mag_schrijven(club_id));

-- ── Gegevens ─────────────────────────────────────────────────
--  Lezen mag iedereen van de club, ook een kijker. Schrijven alleen
--  een eigenaar of trainer.
drop policy if exists gegevens_lezen on public.gegevens;
create policy gegevens_lezen on public.gegevens for select
  using (exists (select 1 from public.teams t
                 where t.id = gegevens.team_id
                   and t.club_id in (select public.mijn_clubs())));

drop policy if exists gegevens_schrijven on public.gegevens;
create policy gegevens_schrijven on public.gegevens for insert
  with check (exists (select 1 from public.teams t
                      where t.id = gegevens.team_id
                        and public.mag_schrijven(t.club_id)));

drop policy if exists gegevens_wijzigen on public.gegevens;
create policy gegevens_wijzigen on public.gegevens for update
  using (exists (select 1 from public.teams t
                 where t.id = gegevens.team_id
                   and public.mag_schrijven(t.club_id)));

drop policy if exists gegevens_weghalen on public.gegevens;
create policy gegevens_weghalen on public.gegevens for delete
  using (exists (select 1 from public.teams t
                 where t.id = gegevens.team_id
                   and public.mag_schrijven(t.club_id)));

-- ── Persoonlijk ──────────────────────────────────────────────
--  Dit is van jou alleen. Geen enkele clubgenoot komt erbij.
drop policy if exists persoonlijk_alles on public.persoonlijk;
create policy persoonlijk_alles on public.persoonlijk for all
  using (gebruiker_id = auth.uid())
  with check (gebruiker_id = auth.uid());

-- ── Abonnementen ─────────────────────────────────────────────
--  Wel te lezen, niet te schrijven. Er staat hieronder met opzet
--  geen enkele regel voor insert of update: dan kan niemand zijn
--  eigen pakket ophogen, ook niet met een eigen verzoek buiten de
--  app om. Alleen jij kunt het aanpassen, in Supabase zelf.
drop policy if exists abonnementen_lezen on public.abonnementen;
create policy abonnementen_lezen on public.abonnementen for select
  using (club_id in (select public.mijn_clubs()));

-- ══════════════════════════════════════════════════════════════
--  EEN CLUB OPRICHTEN
--  Drie dingen tegelijk: de club, jij als eigenaar, en een gratis
--  abonnement. Als losse verzoeken zou een half gelukte poging een
--  club zonder eigenaar achterlaten, en daar komt niemand meer bij.
-- ══════════════════════════════════════════════════════════════
create or replace function public.nieuwe_club(club_naam text, mijn_naam text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare nieuwe uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;
  insert into public.clubs (naam) values (coalesce(nullif(trim(club_naam), ''), 'Mijn club'))
    returning id into nieuwe;
  insert into public.leden (club_id, gebruiker_id, naam, rol)
    values (nieuwe, auth.uid(), mijn_naam, 'eigenaar');
  insert into public.abonnementen (club_id, pakket) values (nieuwe, 'free');
  return nieuwe;
end $$;

grant execute on function public.nieuwe_club(text, text) to authenticated;

-- ══════════════════════════════════════════════════════════════
--  KLAAR
--  Controleer in Supabase onder "Table Editor" of je zes tabellen
--  ziet staan, elk met een gesloten hangslotje: dat betekent dat de
--  beveiliging per rij aanstaat. Staat er ergens "Unrestricted", dan
--  is er iets misgegaan en moet je dit bestand opnieuw draaien
--  voordat je er echte gegevens in zet.
-- ══════════════════════════════════════════════════════════════
