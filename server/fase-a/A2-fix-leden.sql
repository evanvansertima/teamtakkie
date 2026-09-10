-- ══════════════════════════════════════════════════════════════
--  FASE A — A2: leden_toevoegen en leden_weghalen  (S1 en S10)
--  ─────────────────────────────────────────────────────────────
--  EERST OP STAGING. Pas na een groene A8 op productie.
--
--  LEES DIT EERST — DE AUDIT KLOPTE HIER NIET HELEMAAL
--
--  In de audit stonden S1 ("iedereen kan zich bij elke club voegen
--  waarvan hij het UUID kent") en S10 ("elk clublid promoveert
--  zichzelf tot eigenaar") als kritiek en uitvoerbaar. Bij het
--  natesten op een nagebouwde kopie van dit schema bleken beide
--  aanvallen NIET te lukken — maar niet omdat ze worden tegenge-
--  houden. Ze lopen stuk op een fout:
--
--      ERROR: infinite recursion detected in policy for relation "leden"
--
--  De oorzaak staat in de policy zelf. Beide regels bevatten
--  `select 1 from public.leden l ...`, dus een policy OP leden die
--  IN leden kijkt. Om die subquery te beantwoorden past Postgres
--  opnieuw de regels op leden toe, en dat weigert hij.
--
--  Postgres kort de OR daarbij niet af: ook als de eerste tak waar
--  is, wordt de tweede geëvalueerd. Elke insert en elke delete op
--  leden loopt dus vast — de aanval én het normale gebruik.
--
--  WAT DIT BETEKENT
--
--   · S1 en S10 zijn vandaag NIET uitvoerbaar. Ze staan in de audit
--     als kritiek en dat was te zwaar aangezet. Mijn excuses.
--   · Er is wél iets kapot: een eigenaar kan via de API geen tweede
--     beheerder toevoegen. Dat is precies wat fase F, G en H nodig
--     hebben. Het uitnodigingssysteem zou hier onherroepelijk op
--     stuklopen.
--   · Niemand heeft het gemerkt omdat de app nooit in leden schrijft.
--     Hij leest alleen (zorgVoorClub), en lezen werkt wél: die regel
--     gebruikt mijn_clubs(), een `security definer` functie, en die
--     veroorzaakt geen recursie.
--   · En het belangrijkste: wie de recursie later naïef repareert —
--     door de subquery te vervangen maar `gebruiker_id = auth.uid()`
--     te laten staan — zet S1 en S10 alsnog open. Het gat is er dus
--     wel degelijk; het zit nu achter een fout.
--
--  Dit bestand repareert de recursie en sluit het gat in één keer,
--  zodat dat nooit kan gebeuren.
--
--  DE OPLOSSING: dezelfde aanpak als de rest van het schema
--
--  01-schema.sql lost dit probleem al twee keer netjes op, met
--  mijn_clubs() en mag_schrijven(): `security definer` functies die
--  de vraag buiten de policy om beantwoorden. ben_eigenaar() is
--  daar de derde van, in exact dezelfde stijl.
--
--  Geen enkele bestaande rij wordt aangeraakt.
-- ══════════════════════════════════════════════════════════════


-- ── Ben ik eigenaar van deze club? ───────────────────────────
--  security definer om dezelfde reden als mijn_clubs(): de functie
--  moet in leden kijken, en dat zouden de regels op leden anders
--  tegenhouden.
create or replace function public.ben_eigenaar(doel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leden
    where gebruiker_id = auth.uid()
      and club_id = doel
      and rol = 'eigenaar'
  )
$$;
grant execute on function public.ben_eigenaar(uuid) to authenticated;


-- ── Is dit de laatste eigenaar van de club? ──────────────────
--  Zonder deze controle introduceert de nieuwe leden_toevoegen een
--  nieuw probleem. Nu kan een eigenaar zijn eigen lidmaatschap
--  weggooien en zichzelf daarna opnieuw invoeren. Straks kan dat
--  tweede deel niet meer — en dan is een club waarvan de laatste
--  eigenaar vertrekt voorgoed onbereikbaar, mét alle teams en
--  gegevens erin. Niemand kan er dan nog een lid aan toevoegen,
--  ook een beheerder niet, want ben_eigenaar() is voor iedereen
--  onwaar.
--
--  Alle vier de clubs in productie hebben op dit moment precies één
--  lid. Deze functie is dus geen theorie.
create or replace function public.is_laatste_eigenaar(doel_club uuid, doel_gebruiker uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
      select 1 from public.leden
      where club_id = doel_club and gebruiker_id = doel_gebruiker and rol = 'eigenaar'
    )
    and not exists (
      select 1 from public.leden
      where club_id = doel_club and rol = 'eigenaar' and gebruiker_id <> doel_gebruiker
    )
$$;
grant execute on function public.is_laatste_eigenaar(uuid, uuid) to authenticated;


-- ── Wie mag een lid toevoegen ────────────────────────────────
--  Alleen een eigenaar van díé club. De tak `gebruiker_id =
--  auth.uid()` verdwijnt: die was bedoeld voor het oprichten van een
--  club, maar dat gaat al via nieuwe_club() — `security definer`,
--  dus zonder policy.
drop policy if exists leden_toevoegen on public.leden;
create policy leden_toevoegen on public.leden for insert
  with check (public.ben_eigenaar(leden.club_id));


-- ── Wie mag een lid weghalen ─────────────────────────────────
--  Jezelf (je mag een club verlaten) of de eigenaar van die club.
--  Maar nooit de laatste eigenaar: die zou de club stranden.
drop policy if exists leden_weghalen on public.leden;
create policy leden_weghalen on public.leden for delete
  using (
    (
      gebruiker_id = auth.uid()
      or public.ben_eigenaar(leden.club_id)
    )
    and not public.is_laatste_eigenaar(leden.club_id, leden.gebruiker_id)
  );


-- ══════════════════════════════════════════════════════════════
--  CONTROLE
-- ══════════════════════════════════════════════════════════════

-- 1. De twee regels staan er in hun nieuwe vorm.
select policyname, cmd,
       coalesce(qual, '-')       as using_voorwaarde,
       coalesce(with_check, '-') as with_check_voorwaarde
from pg_policies
where schemaname = 'public' and tablename = 'leden'
order by cmd, policyname;
--  Verwacht:
--    leden_beheer     SELECT  is_beheerder()
--    leden_lezen      SELECT  (gebruiker_id = auth.uid()) OR (club_id IN ...)
--    leden_toevoegen  INSERT  with_check = ben_eigenaar(club_id)
--    leden_weghalen   DELETE  using = (... ) AND (NOT is_laatste_eigenaar(...))
--
--  Er hoort NERGENS meer `select 1 from leden` in te staan. Staat het
--  er nog, dan is de recursie niet weg.

-- 2. De twee nieuwe functies bestaan en zijn security definer.
select p.proname as functie,
       case when p.prosecdef then 'security definer' else 'SECURITY INVOKER — FOUT' end as soort
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('ben_eigenaar','is_laatste_eigenaar')
order by p.proname;

-- 3. Er is niets weggegooid.
select count(*) as leden from public.leden;
-- Verwacht op productie: 4

-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN: zie A9-rollback.sql
-- ══════════════════════════════════════════════════════════════
