-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — het beheerdersdeel
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná 01-schema.sql. Het voegt toe:
--
--    beheerders        wie de achterkant mag zien. Dat ben jij.
--    alle_gebruikers   één overzicht van alle accounts, met hun
--                      vereniging, hun rol en hun pakket.
--    zet_pakket        het pakket van een vereniging wijzigen.
--    verwijder_account een account en alles eraan definitief weg.
--
--  Waarom dit een apart bestand is: de gewone beveiliging zegt dat
--  je alleen je eigen club ziet. Dat is precies goed, en die regel
--  mag niet worden opgerekt voor iedereen. Hier komt er één uitzon-
--  dering bij, voor een handjevol mensen dat expliciet in een tabel
--  staat. Wie daar niet in staat, merkt van dit hele bestand niets.
--
--  ONDERAAN moet je één regel aanpassen: je eigen e-mailadres.
-- ══════════════════════════════════════════════════════════════

-- ── Wie mag de achterkant zien ───────────────────────────────
create table if not exists public.beheerders (
  gebruiker_id uuid primary key references auth.users(id) on delete cascade,
  notitie      text,
  gemaakt_op   timestamptz not null default now()
);
alter table public.beheerders enable row level security;

-- Deze functie is het hart van alles hieronder. security definer
-- omdat hij in beheerders moet kijken, wat de regels op die tabel
-- anders zouden tegenhouden.
create or replace function public.is_beheerder()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.beheerders where gebruiker_id = auth.uid())
$$;
grant execute on function public.is_beheerder() to authenticated;

-- Een beheerder mag zien dát hij beheerder is. Toevoegen of weghalen
-- kan alleen hier in de SQL Editor: er staat met opzet geen regel voor
-- insert of update, dus niemand kan zichzelf tot beheerder promoveren.
drop policy if exists beheerders_lezen on public.beheerders;
create policy beheerders_lezen on public.beheerders for select
  using (gebruiker_id = auth.uid());

-- ── Een beheerder ziet alles ─────────────────────────────────
--  Deze regels komen bovenop de bestaande. In Postgres geldt: als
--  één regel toegang geeft, mag het. De gewone gebruiker merkt er
--  dus niets van; voor hem verandert er niets.
drop policy if exists clubs_beheer on public.clubs;
create policy clubs_beheer on public.clubs for select using (public.is_beheerder());

drop policy if exists leden_beheer on public.leden;
create policy leden_beheer on public.leden for select using (public.is_beheerder());

drop policy if exists teams_beheer on public.teams;
create policy teams_beheer on public.teams for select using (public.is_beheerder());

drop policy if exists abonnementen_beheer on public.abonnementen;
create policy abonnementen_beheer on public.abonnementen for select using (public.is_beheerder());

-- ══════════════════════════════════════════════════════════════
--  HET OVERZICHT
--  E-mailadressen staan in auth.users, en daar mag een gewone
--  gebruiker niet in. Deze functie draait daarom met verhoogde
--  rechten — maar hij begint met een controle, en geeft zonder die
--  controle niets terug.
-- ══════════════════════════════════════════════════════════════
create or replace function public.alle_gebruikers()
returns table (
  gebruiker_id  uuid,
  email         text,
  aangemaakt    timestamptz,
  laatst_gezien timestamptz,
  bevestigd     boolean,
  club_id       uuid,
  club_naam     text,
  rol           text,
  pakket        text,
  geldig_tot    date,
  teams         bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_beheerder() then
    raise exception 'Alleen voor beheerders';
  end if;
  return query
    select
      u.id,
      u.email::text,
      u.created_at,
      u.last_sign_in_at,
      (u.email_confirmed_at is not null),
      l.club_id,
      c.naam,
      l.rol,
      a.pakket,
      a.geldig_tot,
      (select count(*) from public.teams t
        where t.club_id = l.club_id and t.verwijderd_op is null)
    from auth.users u
    left join public.leden l        on l.gebruiker_id = u.id
    left join public.clubs c        on c.id = l.club_id
    left join public.abonnementen a on a.club_id = l.club_id
    order by u.created_at desc;
end $$;
grant execute on function public.alle_gebruikers() to authenticated;

-- ── Een pakket wijzigen ──────────────────────────────────────
create or replace function public.zet_pakket(doel uuid, nieuw text, tot date default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_beheerder() then
    raise exception 'Alleen voor beheerders';
  end if;
  -- Dezelfde drie namen als de check op abonnementen (01-schema.sql
  -- regel 108, opnieuw gezet in 06-pakketten.sql) en als wat de app
  -- verstuurt (src/kern/rollen.js, zetPakketVan()). Stonden hier tot
  -- 18 september 2026 nog als free/basic/pro/max: de hernoeming van
  -- 11 september was langs deze functie heen gegaan, waardoor een
  -- beheerder niemand meer kon opwaarderen. Loopt dit lijstje ooit
  -- weer uit de pas, dan valt tests/zet-pakket.test.sql (scenario 8)
  -- daar meteen over.
  if nieuw not in ('free','coach','club') then
    raise exception 'Onbekend pakket: %', nieuw;
  end if;
  insert into public.abonnementen (club_id, pakket, geldig_tot)
    values (doel, nieuw, tot)
  on conflict (club_id) do update
    set pakket = excluded.pakket, geldig_tot = excluded.geldig_tot;
end $$;
grant execute on function public.zet_pakket(uuid, text, date) to authenticated;

-- ── Een account verwijderen ──────────────────────────────────
--  Dit is definitief. Alles wat aan het account hangt gaat mee: het
--  lidmaatschap, en als hij de laatste van zijn club was ook de club
--  met al zijn teams en gegevens.
--
--  Een beheerder kan zichzelf niet verwijderen. Dat lijkt streng maar
--  voorkomt de situatie waarin er niemand meer bij de achterkant kan.
create or replace function public.verwijder_account(doel uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  clubs_van_hem uuid[];
begin
  if not public.is_beheerder() then
    raise exception 'Alleen voor beheerders';
  end if;
  if doel = auth.uid() then
    raise exception 'Je kunt je eigen account hier niet verwijderen';
  end if;

  -- De clubs waar hij de enige van was: die hebben zonder hem geen
  -- eigenaar meer en zouden onbereikbaar achterblijven.
  select array_agg(l.club_id) into clubs_van_hem
  from public.leden l
  where l.gebruiker_id = doel
    and not exists (select 1 from public.leden a
                    where a.club_id = l.club_id and a.gebruiker_id <> doel);

  delete from public.leden where gebruiker_id = doel;
  if clubs_van_hem is not null then
    delete from public.clubs where id = any(clubs_van_hem);
  end if;
  delete from auth.users where id = doel;
end $$;
grant execute on function public.verwijder_account(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════
--  MAAK JEZELF BEHEERDER
--  Vervang het e-mailadres hieronder door dat van jou, en draai
--  alleen deze regel opnieuw als je later iemand toevoegt.
-- ══════════════════════════════════════════════════════════════
insert into public.beheerders (gebruiker_id, notitie)
select id, 'eigenaar'
from auth.users
where email = 'evan.vansertima001@gmail.com'
on conflict (gebruiker_id) do nothing;

-- ── Controle ─────────────────────────────────────────────────
--  Hierna hoor je één regel te zien met jouw e-mailadres. Zie je
--  niets, dan bestaat dat account nog niet: log eerst één keer in
--  de app in en draai daarna dit stukje opnieuw.
select u.email, b.notitie, b.gemaakt_op
from public.beheerders b
join auth.users u on u.id = b.gebruiker_id;
