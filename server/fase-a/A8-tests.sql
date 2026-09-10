-- ══════════════════════════════════════════════════════════════
--  FASE A — A8: de tests
--  ─────────────────────────────────────────────────────────────
--  ELKE TEST DRAAIT IN EEN TRANSACTIE DIE ALTIJD TERUGROLT.
--
--  Dat is het hele punt van dit bestand. Een aanvalstest moet iets
--  PROBEREN — een club aanmaken, jezelf ergens invoegen — en dat
--  wil je niet in een echte database laten staan als het lukt.
--  Elk blok hieronder eindigt op `rollback`, dus of de aanval nu
--  slaagt of niet: er blijft niets achter.
--
--  Draai dit op STAGING, na S5-seed-testrollen.sql. Daarna, als
--  alles klopt, mag het ook op productie — dankzij de rollback is
--  dat veilig. Doe het dan wel bewust en lees de uitkomst na.
--
--  ══════════════════════════════════════════════════════════════
--  EERST INVULLEN: drie gebruikers-id's
--  ══════════════════════════════════════════════════════════════
--  Haal ze op met deze query en zet ze hieronder in de \set-regels.
--
--      select u.id, u.email, c.naam as club, l.rol
--      from auth.users u
--      left join public.leden l on l.gebruiker_id = u.id
--      left join public.clubs c on c.id = l.club_id
--      order by c.naam, l.rol;
--
--  Je hebt nodig:
--    EIGENAAR  de eigenaar van fc Harlingen
--    KIJKER    het kijker-account uit S5 (zit in fc Harlingen)
--    VREEMDE   een account dat NIET bij fc Harlingen hoort
--              (bijvoorbeeld de eigenaar van SV Seagulls)
--    CLUB      het id van fc Harlingen
-- ══════════════════════════════════════════════════════════════

\set EIGENAAR '00000000-0000-0000-0000-000000000000'
\set KIJKER   '00000000-0000-0000-0000-000000000000'
\set VREEMDE  '00000000-0000-0000-0000-000000000000'
\set CLUB     '00000000-0000-0000-0000-000000000000'

--  Werk je in de Supabase SQL Editor? Die kent \set niet. Vervang
--  dan overal :'EIGENAAR' door het id tussen aanhalingstekens, of
--  plak de blokken één voor één met de id's er handmatig in.


-- ══════════════════════════════════════════════════════════════
--  TEST 0 — WERKT HET TESTHARNAS ÜBERHAUPT?
--  ─────────────────────────────────────────────────────────────
--  Sla deze test NOOIT over.
--
--  De SQL Editor draait standaard als `postgres`, en die rol negeert
--  RLS volledig. Zonder `set local role` test je dus niets: elke
--  aanval zou slagen. En andersom: als de claims niet aankomen, is
--  auth.uid() leeg, mislukt elke aanval om de verkeerde reden, en
--  krijg je vier groene vinkjes die niets betekenen.
--
--  Deze test moet TWEE KEER true teruggeven. Doet hij dat niet, dan
--  zijn alle uitkomsten hieronder waardeloos.
-- ══════════════════════════════════════════════════════════════
begin;
  select set_config('request.jwt.claims',
         json_build_object('sub', :'KIJKER', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select auth.uid() = :'KIJKER'::uuid          as a_uid_klopt,
         current_user = 'authenticated'        as b_rol_klopt;
rollback;


-- ══════════════════════════════════════════════════════════════
--  DE AANVALLEN — alle vier moeten MISLUKKEN
-- ══════════════════════════════════════════════════════════════

-- ── TEST 1 (S3) — anonieme bezoeker maakt een club aan ───────
--  Verwacht NA de fix: "new row violates row-level security policy".
--  Krijg je een regel met een club-id terug, dan is A1 niet gedraaid
--  of niet geslaagd.
begin;
  set local role anon;
  insert into public.clubs (naam) values ('AANVALSTEST — hoort te mislukken')
  returning id, naam;
rollback;


-- ── TEST 2 (S1) — vreemde voegt zich bij andermans club ──────
--  Verwacht NA de fix: "new row violates row-level security policy".
--  VOOR de fix: "infinite recursion detected in policy for relation
--  leden" — ook een weigering, maar om de verkeerde reden. Zie de
--  toelichting boven in A2-fix-leden.sql.
begin;
  select set_config('request.jwt.claims',
         json_build_object('sub', :'VREEMDE', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.leden (club_id, gebruiker_id, rol)
  values (:'CLUB'::uuid, :'VREEMDE'::uuid, 'eigenaar')
  returning club_id, rol;
rollback;


-- ── TEST 3 (S10) — kijker promoveert zichzelf tot eigenaar ───
--  De twee stappen die samen het gat vormen: eerst je eigen rij
--  weggooien, dan hem terugzetten met een hogere rol. In één
--  transactie, precies zoals een aanvaller het zou doen.
--
--  Verwacht NA de fix: de delete haalt 0 rijen weg (de kijker mag
--  zichzelf wél verwijderen, dus dit lukt: 1 rij) en de insert
--  daarna wordt geweigerd. Kijk naar de LAATSTE regel: staat daar
--  "eigenaar", dan is het gat open.
begin;
  select set_config('request.jwt.claims',
         json_build_object('sub', :'KIJKER', 'role', 'authenticated')::text, true);
  set local role authenticated;

  delete from public.leden where gebruiker_id = :'KIJKER'::uuid;

  insert into public.leden (club_id, gebruiker_id, rol)
  values (:'CLUB'::uuid, :'KIJKER'::uuid, 'eigenaar')
  returning club_id, rol;
rollback;


-- ── TEST 4 — laatste eigenaar strandt zijn eigen club ────────
--  Geen beveiligingsgat maar een valkuil die A2 introduceert als
--  is_laatste_eigenaar() ontbreekt: vertrekt de laatste eigenaar,
--  dan kan niemand er ooit nog bij.
--
--  Verwacht NA de fix: DELETE 0.
begin;
  select set_config('request.jwt.claims',
         json_build_object('sub', :'EIGENAAR', 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.leden
   where gebruiker_id = :'EIGENAAR'::uuid and club_id = :'CLUB'::uuid;
  select count(*) as eigenaren_over
    from public.leden where club_id = :'CLUB'::uuid and rol = 'eigenaar';
rollback;


-- ══════════════════════════════════════════════════════════════
--  HET NORMALE GEBRUIK — alles hieronder moet WEL werken
--  Dit is het belangrijkste deel. Een dichtgetimmerde database die
--  niemand meer kan gebruiken is geen vooruitgang.
-- ══════════════════════════════════════════════════════════════

-- ── TEST 5 — een nieuwe gebruiker kan een club oprichten ─────
--  Dit is de test die bewijst dat A1 veilig was. nieuwe_club() is
--  `security definer` en heeft de weggehaalde policy niet nodig.
--  Verwacht: een uuid terug.
begin;
  select set_config('request.jwt.claims',
         json_build_object('sub', :'VREEMDE', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.nieuwe_club('Testclub A8', 'Tester') as nieuwe_club_id;
rollback;


-- ── TEST 6 — een eigenaar kan een lid toevoegen ──────────────
--  Dit werkte VOOR de fix niet (recursie). Na de fix wel. Dit is de
--  functionele winst van A2, en de voorwaarde voor fase F, G en H.
--  Verwacht: een regel met rol = trainer.
begin;
  select set_config('request.jwt.claims',
         json_build_object('sub', :'EIGENAAR', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.leden (club_id, gebruiker_id, naam, rol)
  values (:'CLUB'::uuid, :'VREEMDE'::uuid, 'Toegevoegd door A8', 'trainer')
  returning club_id, rol, naam;
rollback;


-- ── TEST 7 — een eigenaar kan een lid weer verwijderen ───────
--  Verwacht: DELETE 1.
begin;
  select set_config('request.jwt.claims',
         json_build_object('sub', :'EIGENAAR', 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.leden
   where gebruiker_id = :'KIJKER'::uuid and club_id = :'CLUB'::uuid;
rollback;


-- ── TEST 8 — de bestaande eigenaar houdt zijn toegang ────────
--  De belangrijkste regressietest. fc Harlingen moet tijdens het
--  hele traject volledige toegang houden.
--  Verwacht: zijn club, zijn teams, zijn gegevens, en pakket = max.
begin;
  select set_config('request.jwt.claims',
         json_build_object('sub', :'EIGENAAR', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select (select count(*) from public.clubs)        as clubs_zichtbaar,
         (select count(*) from public.teams)        as teams_zichtbaar,
         (select count(*) from public.gegevens)     as gegevens_zichtbaar,
         (select pakket from public.abonnementen limit 1) as pakket;
rollback;


-- ── TEST 9 — een vreemde ziet nog steeds niets van fc Harlingen ──
--  Teamisolatie. Dit werkte al en moet blijven werken.
--  Verwacht: alleen zijn eigen club, 0 teams van een ander.
begin;
  select set_config('request.jwt.claims',
         json_build_object('sub', :'VREEMDE', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select (select count(*) from public.teams    where club_id = :'CLUB'::uuid) as teams_van_harlingen,
         (select count(*) from public.gegevens
            where team_id in (select id from public.teams where club_id = :'CLUB'::uuid)) as gegevens_van_harlingen;
rollback;
-- Verwacht: 0 en 0.


-- ══════════════════════════════════════════════════════════════
--  TOT SLOT — er hoort niets veranderd te zijn
--  Deze query staat bewust BUITEN een transactie.
-- ══════════════════════════════════════════════════════════════
select 'clubs'    as tabel, count(*) as aantal from public.clubs
union all select 'leden',    count(*) from public.leden
union all select 'teams',    count(*) from public.teams
union all select 'gegevens', count(*) from public.gegevens
order by tabel;
--  Op productie verwacht: 4 / 4 / 3 / 42 — precies als vóór de tests.
--  Op staging na S5: 4 / 6 / 3 / 42.
