-- ══════════════════════════════════════════════════════════════
--  S3 — BASISSEED: STAGING DEZELFDE VORM GEVEN ALS PRODUCTIE
--  ─────────────────────────────────────────────────────────────
--  DRAAI DIT NA S2. ALLEEN IN STAGING.
--
--  Dit maakt staging even groot en even ingewikkeld als productie:
--
--      4 clubs        4 leden        3 teams
--      42 gegevens-rijen
--      abonnementen: free x3, max x1
--
--  WAT DIT BEWUST NIET DOET: echte gegevens overnemen.
--
--  In je productiedatabase staan namen en geboortedata van
--  minderjarigen. Die naar een tweede database kopiëren verdubbelt
--  precies datgene waar je RLS-opzet voor bedoeld is. Een tweede
--  project betekent een tweede sleutel, een tweede back-up en een
--  tweede plek waar het mis kan gaan — voor gegevens die je bij het
--  testen van een policy helemaal niet nodig hebt.
--
--  Wat we wél nodig hebben is de VORM: evenveel rijen, dezelfde
--  verbanden, dezelfde rollen, dezelfde pakketten. Dat is wat een
--  RLS-policy ziet. De inhoud van een jsonb-blob is voor een policy
--  volstrekt onzichtbaar.
--
--  Draaien mag zo vaak je wilt: alles staat on conflict do nothing.
-- ══════════════════════════════════════════════════════════════

select public._eis_staging();   -- rem: weigert buiten staging

-- ══════════════════════════════════════════════════════════════
--  VUL HIER DE VIER STAGINGACCOUNTS IN
--  ─────────────────────────────────────────────────────────────
--  Exact dezelfde adressen als in stap 4 (Authentication > Users).
--  Het eerste adres is tevens je beheerder uit S2.
--
--  Bestaat een van deze accounts niet, dan slaat het script die club
--  over ZONDER foutmelding — en dan klopt de controle onderaan niet
--  meer. Dat is met opzet: liever een getal dat niet klopt dan een
--  half gevulde database die er goed uitziet.
-- ══════════════════════════════════════════════════════════════

create temporary table _seed_clubs (
  volgorde  int,
  clubnaam  text,
  email     text,
  pakket    text,
  teams     int
);

insert into _seed_clubs (volgorde, clubnaam, email, pakket, teams) values
  (1, 'fc Harlingen', 'VUL-IN-eigenaar-harlingen@voorbeeld.nl', 'max',  1),
  (2, 'SV Seagulls',  'VUL-IN-eigenaar-seagulls@voorbeeld.nl',  'free', 1),
  (3, 'Mijn club',    'VUL-IN-eigenaar-mijnclub-a@voorbeeld.nl','free', 1),
  (4, 'Mijn club',    'VUL-IN-eigenaar-mijnclub-b@voorbeeld.nl','free', 0);

--  ↑ De teamverdeling (1/1/1/0) is een AANNAME. Ik kan je productie
--    niet uitlezen. Wil je het exact gelijk hebben, draai dan eerst
--    de query onderaan LEES-MIJ-STAGING.md op productie — die geeft
--    alleen teamnamen en aantallen terug, geen persoonsgegevens — en
--    pas de kolom `teams` hierboven aan. Het totaal moet 3 blijven.

-- ── 1. Clubs ─────────────────────────────────────────────────
--  Vaste id's, zodat dit script herhaalbaar is en je in de Table
--  Editor meteen ziet welke rij welke is.
insert into public.clubs (id, naam)
select ('00000000-0000-4000-8000-00000000000' || c.volgorde)::uuid, c.clubnaam
from _seed_clubs c
where exists (select 1 from auth.users u where u.email = c.email)
on conflict (id) do nothing;

-- ── 2. Leden ─────────────────────────────────────────────────
--  Elke club krijgt één eigenaar, net als in productie.
insert into public.leden (club_id, gebruiker_id, naam, rol)
select ('00000000-0000-4000-8000-00000000000' || c.volgorde)::uuid,
       u.id,
       'Eigenaar ' || c.clubnaam,
       'eigenaar'
from _seed_clubs c
join auth.users u on u.email = c.email
on conflict (club_id, gebruiker_id) do nothing;

-- ── 3. Abonnementen ──────────────────────────────────────────
--  free x3, max x1 — exact de verdeling van productie.
--  max is GEEN commercieel pakket; het is de legacywaarde die
--  fc Harlingen zijn volledige toegang geeft. Zie de audit, M1.
insert into public.abonnementen (club_id, pakket)
select ('00000000-0000-4000-8000-00000000000' || c.volgorde)::uuid, c.pakket
from _seed_clubs c
where exists (select 1 from auth.users u where u.email = c.email)
on conflict (club_id) do nothing;

-- ── 4. Teams ─────────────────────────────────────────────────
--  De id is tekst en door de app verzonnen, niet door de database.
--  Die vorm houden we aan: "st-" plus een nummer, zodat je in één
--  oogopslag ziet dat het staging is.
insert into public.teams (id, club_id, naam)
select 'st-team-' || c.volgorde || '-' || g.n,
       ('00000000-0000-4000-8000-00000000000' || c.volgorde)::uuid,
       case c.volgorde when 1 then 'JO19-2' when 2 then 'JO15-1' else 'Team A' end
from _seed_clubs c
cross join lateral generate_series(1, c.teams) as g(n)
where exists (select 1 from auth.users u where u.email = c.email)
on conflict (id) do nothing;

-- ── 5. Gegevens ──────────────────────────────────────────────
--  Veertien sleutels per team, drie teams: 42 rijen. Dat is precies
--  wat productie heeft.
--
--  De sleutelvorm klopt met wat de app wegschrijft: het seizoen zit
--  in de sleutel, niet in de data. Zie sleutelVoor() in index.html.
--
--  De waarden zijn leeg. Een RLS-policy kijkt nooit in een blob, dus
--  voor wat we hier testen maakt de inhoud niets uit.
insert into public.gegevens (team_id, sleutel, waarde, apparaat)
select t.id, s.sleutel, s.waarde, 'staging-seed'
from public.teams t
cross join (values
  ('2026-2027::fch_spelers_v1',          '[]'::jsonb),
  ('2026-2027::fch_wedstrijden_v1',      '[]'::jsonb),
  ('2026-2027::fch_trainingen_v1',       '[]'::jsonb),
  ('2026-2027::fch_activiteiten_v1',     '[]'::jsonb),
  ('2026-2027::fch_teaminstellingen_v1', '{}'::jsonb),
  ('2026-2027::fch_opstellingen_v1',     '[]'::jsonb),
  ('2026-2027::fch_afwezigheden_v1',     '[]'::jsonb),
  ('2026-2027::fch_doelen_v1',           '[]'::jsonb),
  ('2026-2027::fch_beoordelingen_v1',    '[]'::jsonb),
  ('2026-2027::fch_tactieken_v1',        '[]'::jsonb),
  ('2026-2027::fch_tenues_v1',           '{}'::jsonb),
  ('2026-2027::fch_notities_v1',         '[]'::jsonb),
  ('2026-2027::fch_boetes_v1',           '[]'::jsonb),
  ('2026-2027::fch_seizoen_v1',          '{}'::jsonb)
) as s(sleutel, waarde)
where t.id like 'st-team-%'
on conflict (team_id, sleutel) do nothing;

drop table _seed_clubs;

-- ══════════════════════════════════════════════════════════════
--  CONTROLE
--  Alle vier de getallen moeten kloppen. Klopt er één niet, dan
--  ontbreekt er waarschijnlijk een account in Authentication > Users.
-- ══════════════════════════════════════════════════════════════

select 'clubs'        as tabel, count(*) as gevonden, 4  as verwacht from public.clubs
union all select 'leden',       count(*), 4  from public.leden
union all select 'teams',       count(*), 3  from public.teams
union all select 'gegevens',    count(*), 42 from public.gegevens
order by tabel;

--  Let op: er zijn twee clubs die allebei "Mijn club" heten. Daarom
--  groepeert deze query op id en niet op naam — anders vallen ze
--  samen tot één regel en lijkt er een club te ontbreken.
select right(c.id::text, 1) as nr, c.naam as club, a.pakket,
       count(t.id) as teams
from public.clubs c
left join public.abonnementen a on a.club_id = c.id
left join public.teams t on t.club_id = c.id
group by c.id, c.naam, a.pakket
order by c.id;
-- Verwacht VIER regels: fc Harlingen -> max met 1 team,
-- SV Seagulls -> free met 1, Mijn club -> free met 1,
-- Mijn club -> free met 0.
