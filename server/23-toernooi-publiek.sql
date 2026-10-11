-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — een toernooi openbaar maken (presentatie)
--  ─────────────────────────────────────────────────────────────
--  WAT DIT DOET, IN GEWONE TAAL
--  Een organisator kan een toernooi "publiceren". Er komt dan een
--  link (app.teamtakkie.nl/?toernooi=<code>) die iedereen kan openen
--  zonder account: ouders langs de lijn, of een tv in de kantine.
--
--  Wat er openbaar komt is een MOMENTOPNAME die de app zelf opstelt:
--  schema, uitslagen, standen. Geen e-mailadressen, geen
--  telefoonnummers — de app laat ze weg, en deze database weigert een
--  momentopname waar toch een veld "email" of "telefoon" in staat.
--
--    · tabel public.toernooi_publiek — één regel per gepubliceerd
--      toernooi. Niemand kan de tabel rechtstreeks lezen of schrijven;
--      alles gaat via de vier functies hieronder.
--    · toernooi_publiceren(team, toernooi, inhoud) — alleen een
--      trainer of eigenaar van een vereniging met Coach of Club
--      (dezelfde grens als voor alle andere servergegevens:
--      mag_serverdata_schrijven uit 18-betalingen.sql). Geeft de code
--      van de link terug; opnieuw publiceren houdt dezelfde code.
--    · toernooi_intrekken(team, toernooi) — link werkt daarna niet
--      meer. Mag elke trainer of eigenaar, ook na het opzeggen: je
--      moet iets altijd offline kunnen halen.
--    · toernooi_publiek_lezen(code) en toernooi_publiek_versie(code)
--      — voor iedereen, ook zonder account. Alleen wie de code kent
--      vindt het toernooi; de code is 20 willekeurige tekens.
--
--  Draai dit ná 18-betalingen.sql. Plak het hele bestand in de SQL
--  Editor en klik op Run. Twee keer draaien kan geen kwaad.
--
--  Helemaal onderaan staat een TERUGDRAAIBLOK.
-- ══════════════════════════════════════════════════════════════


-- ══ DEEL 1 — DE TABEL ══
create table if not exists public.toernooi_publiek (
  slug          text primary key check (slug ~ '^[a-z0-9]{20}$'),
  team_id       text not null references public.teams(id) on delete cascade,
  toernooi_id   text not null,
  inhoud        jsonb not null,
  bijgewerkt_op timestamptz not null default now(),
  unique (team_id, toernooi_id)
);

comment on table public.toernooi_publiek is
  'Gepubliceerde momentopnames van toernooien (release 3 van docs/updateplan-competitie-toernooi-ai.md, 5g). Alleen via de functies toernooi_publiceren / toernooi_intrekken / toernooi_publiek_lezen / toernooi_publiek_versie.';

-- Aan, en zonder één enkele regel: rechtstreeks lezen of schrijven kan
-- dan niemand (behalve de functies hieronder, die security definer zijn).
alter table public.toernooi_publiek enable row level security;
revoke all on public.toernooi_publiek from anon, authenticated;


-- ══ DEEL 2 — PUBLICEREN EN INTREKKEN ══
create or replace function public.toernooi_publiceren(p_team text, p_toernooi text, p_inhoud jsonb)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_club uuid;
  v_slug text;
begin
  select t.club_id into v_club from public.teams t where t.id = p_team and t.verwijderd_op is null;
  if v_club is null or not public.mag_serverdata_schrijven(v_club) then
    raise exception 'Publiceren mag alleen een trainer of eigenaar van dit team, met Coach of Club.';
  end if;
  if p_inhoud is null or jsonb_typeof(p_inhoud) <> 'object' then
    raise exception 'Lege of ongeldige inhoud.';
  end if;
  -- Tweede slot op de deur: de app laat contactgegevens al weg.
  if jsonb_path_exists(p_inhoud, 'strict $.**.email') or jsonb_path_exists(p_inhoud, 'strict $.**.telefoon') then
    raise exception 'Contactgegevens horen niet in een openbaar toernooi.';
  end if;
  if octet_length(p_inhoud::text) > 2000000 then
    raise exception 'Dit toernooi is te groot om te publiceren (meer dan 2 MB).';
  end if;

  select slug into v_slug from public.toernooi_publiek where team_id = p_team and toernooi_id = p_toernooi;
  if v_slug is null then
    v_slug := substr(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1, 20);
    insert into public.toernooi_publiek (slug, team_id, toernooi_id, inhoud) values (v_slug, p_team, p_toernooi, p_inhoud);
  else
    -- clock_timestamp en niet now(): now() is het begin van de transactie,
    -- en de presentatiepagina ververst alleen als dit tijdstip verandert.
    update public.toernooi_publiek set inhoud = p_inhoud, bijgewerkt_op = clock_timestamp() where slug = v_slug;
  end if;
  return v_slug;
end $$;

create or replace function public.toernooi_intrekken(p_team text, p_toernooi text)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare v_club uuid;
begin
  select t.club_id into v_club from public.teams t where t.id = p_team;
  if v_club is null or not public.mag_schrijven(v_club) then
    raise exception 'Intrekken mag alleen een trainer of eigenaar van dit team.';
  end if;
  delete from public.toernooi_publiek where team_id = p_team and toernooi_id = p_toernooi;
  return found;
end $$;


-- ══ DEEL 3 — LEZEN, VOOR IEDEREEN ══
create or replace function public.toernooi_publiek_lezen(p_slug text)
returns table(inhoud jsonb, bijgewerkt_op timestamptz)
language sql stable security definer set search_path = public as $$
  select p.inhoud, p.bijgewerkt_op from public.toernooi_publiek p where p.slug = p_slug
$$;

-- Alleen het tijdstip: de presentatiepagina vraagt dit elke 20
-- seconden, en haalt de hele inhoud pas op als er iets veranderd is.
create or replace function public.toernooi_publiek_versie(p_slug text)
returns timestamptz
language sql stable security definer set search_path = public as $$
  select p.bijgewerkt_op from public.toernooi_publiek p where p.slug = p_slug
$$;

revoke all on function public.toernooi_publiceren(text, text, jsonb) from public, anon;
revoke all on function public.toernooi_intrekken(text, text) from public, anon;
grant execute on function public.toernooi_publiceren(text, text, jsonb) to authenticated;
grant execute on function public.toernooi_intrekken(text, text) to authenticated;
grant execute on function public.toernooi_publiek_lezen(text) to anon, authenticated;
grant execute on function public.toernooi_publiek_versie(text) to anon, authenticated;


-- ══ CONTROLE — hier hoort overal "in orde" te staan ══
select 'tabel toernooi_publiek' as onderdeel,
       case when to_regclass('public.toernooi_publiek') is not null then 'in orde' else 'ONTBREEKT' end as uitkomst
union all
select 'rechtstreeks lezen dicht voor bezoekers',
       case when not has_table_privilege('anon', 'public.toernooi_publiek', 'select') then 'in orde' else 'OPEN — draai dit bestand opnieuw' end
union all
select 'bezoekers mogen lezen via de functie',
       case when has_function_privilege('anon', 'public.toernooi_publiek_lezen(text)', 'execute') then 'in orde' else 'ONTBREEKT' end
union all
select 'bezoekers mogen NIET publiceren',
       case when not has_function_privilege('anon', 'public.toernooi_publiceren(text, text, jsonb)', 'execute') then 'in orde' else 'OPEN — draai dit bestand opnieuw' end
union all
select 'pakketgrens (18-betalingen.sql) aanwezig',
       case when to_regprocedure('public.mag_serverdata_schrijven(uuid)') is not null then 'in orde' else 'ONTBREEKT — draai eerst 18-betalingen.sql' end;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIBLOK — alleen gebruiken als je dit alles weg wilt.
--  Haal de streepjes weg voor de regels hieronder en draai ze.
--  Alle openbare links werken daarna niet meer.
-- ══════════════════════════════════════════════════════════════
-- drop function if exists public.toernooi_publiek_versie(text);
-- drop function if exists public.toernooi_publiek_lezen(text);
-- drop function if exists public.toernooi_intrekken(text, text);
-- drop function if exists public.toernooi_publiceren(text, text, jsonb);
-- drop table if exists public.toernooi_publiek;
