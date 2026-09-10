-- ══════════════════════════════════════════════════════════════
--  S1 — TABELRECHTEN GELIJKTREKKEN MET PRODUCTIE
--  ─────────────────────────────────────────────────────────────
--  DRAAI DIT NA 01-schema.sql. ALLEEN IN STAGING.
--
--  WAAROM DIT BESTAND BESTAAT — lees dit, het is de kern van de zaak.
--
--  In je stagingproject staat "Automatically expose new tables" UIT.
--  Dat betekent dat nieuwe tabellen in het public-schema GEEN rechten
--  krijgen voor de rollen anon en authenticated. Supabase heeft dat
--  gedrag onlangs omgedraaid; nieuwe projecten staan standaard dicht.
--
--  In je PRODUCTIEproject stond die schakelaar destijds nog AAN. Je
--  hebt zelf gemeten dat anon en authenticated daar SELECT, INSERT,
--  UPDATE en DELETE hebben op clubs en leden.
--
--  Dat verschil is precies fataal voor waar staging voor bedoeld is.
--  Postgres controleert eerst het GRANT en pas daarna de RLS-policy.
--  Zonder grant krijgt anon "permission denied for table clubs" — en
--  dan lijkt risico S3 dicht terwijl er in productie niets veranderd
--  is. Je zou een groen vinkje krijgen voor een test die nooit heeft
--  plaatsgevonden.
--
--  Dit bestand zet die rechten daarom expliciet aan, zodat staging
--  dezelfde vraag stelt als productie.
--
--  BELANGRIJK: dit is met opzet NIET veiliger dan productie. Staging
--  moet gelijk zijn, niet beter. Het dichtzetten gebeurt in fase A,
--  op beide omgevingen, met dezelfde wijziging.
-- ══════════════════════════════════════════════════════════════

-- Toegang tot het schema zelf. Zonder dit ziet PostgREST niets,
-- ongeacht de tabelrechten.
grant usage on schema public to anon, authenticated, service_role;

-- De zeven tabellen, met precies de rechten die productie heeft.
-- Niet ruimer, niet krapper.
grant select, insert, update, delete on public.clubs        to anon, authenticated, service_role;
grant select, insert, update, delete on public.leden        to anon, authenticated, service_role;
grant select, insert, update, delete on public.teams        to anon, authenticated, service_role;
grant select, insert, update, delete on public.gegevens     to anon, authenticated, service_role;
grant select, insert, update, delete on public.persoonlijk  to anon, authenticated, service_role;
grant select, insert, update, delete on public.abonnementen to anon, authenticated, service_role;

-- beheerders komt pas na S2 (03-beheer). Deze regel faalt zonder die
-- tabel, dus hij staat hier bewust met een vangnet omheen.
do $$
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='beheerders') then
    execute 'grant select, insert, update, delete on public.beheerders to anon, authenticated, service_role';
  else
    raise notice 'Tabel beheerders bestaat nog niet — draai S1 nogmaals na S2.';
  end if;
end $$;

-- Het stagingmerk blijft dicht. Die hoort nergens bij te horen.
revoke all on public._staging_merk from anon, authenticated;

-- ══════════════════════════════════════════════════════════════
--  CONTROLE — vergelijk dit met wat je op productie meet
-- ══════════════════════════════════════════════════════════════
--  Draai onderstaande query hier én op productie (op productie is hij
--  read-only en verandert hij niets). De twee uitkomsten horen regel
--  voor regel gelijk te zijn.
--
--  Wijkt er iets af, ga dan NIET verder met seeden: je zou daarna in
--  staging iets testen wat in productie anders werkt.
-- ══════════════════════════════════════════════════════════════

select
  table_name                                as tabel,
  grantee                                   as rol,
  string_agg(privilege_type, ', ' order by privilege_type) as rechten
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in ('clubs','leden','teams','gegevens','persoonlijk','abonnementen','beheerders')
group by table_name, grantee
order by table_name, grantee;

-- Verwacht per tabel twee regels (anon, authenticated), elk met:
--   DELETE, INSERT, SELECT, UPDATE
