-- ══════════════════════════════════════════════════════════════
--  FASE A — A9: alles terugdraaien
--  ─────────────────────────────────────────────────────────────
--  Zet de drie policies exact terug zoals ze in
--  server/01-schema.sql staan, vastgelegd onder git-tag
--  productie-v34-checkpoint.
--
--  Er wordt geen rij aangeraakt. Policies zijn metadata: dit duurt
--  seconden en er wordt niets herbouwd.
--
--  LET OP — wat je hiermee terugkrijgt:
--    · anon kan weer ongelimiteerd clubs aanmaken (S3 staat open);
--    · insert en delete op leden geven weer "infinite recursion",
--      dus een eigenaar kan geen tweede beheerder toevoegen.
--
--  Dat is het gedrag van vóór fase A, exact. Getest: na deze
--  rollback keerden beide oude gedragingen terug zoals verwacht.
--
--  Gebruik dit alleen als A8 iets laat zien wat je niet verwachtte.
-- ══════════════════════════════════════════════════════════════


-- ── Terug: clubs_maken ───────────────────────────────────────
drop policy if exists clubs_maken on public.clubs;
create policy clubs_maken on public.clubs for insert
  with check (true);


-- ── Terug: leden_toevoegen ───────────────────────────────────
drop policy if exists leden_toevoegen on public.leden;
create policy leden_toevoegen on public.leden for insert
  with check (
    gebruiker_id = auth.uid()
    or exists (select 1 from public.leden l
               where l.club_id = leden.club_id
                 and l.gebruiker_id = auth.uid()
                 and l.rol = 'eigenaar')
  );


-- ── Terug: leden_weghalen ────────────────────────────────────
drop policy if exists leden_weghalen on public.leden;
create policy leden_weghalen on public.leden for delete
  using (
    gebruiker_id = auth.uid()
    or exists (select 1 from public.leden l
               where l.club_id = leden.club_id
                 and l.gebruiker_id = auth.uid()
                 and l.rol = 'eigenaar')
  );


-- ── De twee hulpfuncties ─────────────────────────────────────
--  Die laten we met opzet STAAN. Ze doen niets zolang geen enkele
--  policy ze aanroept, en ze weggooien zou een tweede poging alleen
--  maar omslachtiger maken. Wil je ze toch weg, haal dan het
--  commentaar hieronder weg — maar pas ná de drie policies
--  hierboven, anders verwijst er nog iets naar.
--
-- drop function if exists public.ben_eigenaar(uuid);
-- drop function if exists public.is_laatste_eigenaar(uuid, uuid);


-- ══════════════════════════════════════════════════════════════
--  CONTROLE
-- ══════════════════════════════════════════════════════════════
select tablename, policyname, cmd,
       coalesce(qual, '-')       as using_voorwaarde,
       coalesce(with_check, '-') as with_check_voorwaarde
from pg_policies
where schemaname = 'public'
  and policyname in ('clubs_maken','leden_toevoegen','leden_weghalen')
order by tablename, cmd;

--  Verwacht:
--    clubs  clubs_maken      INSERT  with_check = true
--    leden  leden_weghalen   DELETE  using     = (gebruiker_id = auth.uid()) OR (EXISTS ...)
--    leden  leden_toevoegen  INSERT  with_check = (gebruiker_id = auth.uid()) OR (EXISTS ...)

select 'clubs' as tabel, count(*) as aantal from public.clubs
union all select 'leden', count(*) from public.leden
order by tabel;
--  Verwacht op productie: 4 en 4 — ongewijzigd.
