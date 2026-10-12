-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — afbeeldingen bij een openbaar toernooi (dia's)
--  ─────────────────────────────────────────────────────────────
--  WAT DIT DOET, IN GEWONE TAAL
--  Sinds 12 oktober 2026 maak je bij een toernooi zelf dia's voor de
--  tv, met sponsorlogo's en afbeeldingen. Die afbeeldingen gaan apart
--  naar de server, NIET in de gewone momentopname:
--    · de momentopname wordt bij elke uitslag opnieuw opgehaald door
--      elke tv en elke telefoon met de link; afbeeldingen veranderen
--      bijna nooit en zijn veel groter;
--    · zo haalt een tv de plaatjes alleen op als ze echt veranderd zijn.
--
--  Erbij komt, in de bestaande tabel public.toernooi_publiek:
--    · kolom media                — {id: "data:image/…"} per afbeelding
--    · kolom media_bijgewerkt_op  — wanneer de afbeeldingen veranderden
--  En drie functies:
--    · toernooi_media_publiceren(team, toernooi, media) — zelfde recht
--      als publiceren (trainer of eigenaar, Coach of Club); het toernooi
--      moet al gepubliceerd zijn; alleen afbeeldingen, samen hoogstens
--      8 MB.
--    · toernooi_publiek_media(code)    — voor iedereen met de code
--    · toernooi_publiek_versies(code)  — twee tijdstippen, voor het
--      verversen (alleen ophalen wat veranderd is)
--
--  Draai dit ná 23-toernooi-publiek.sql. Plak het hele bestand in de SQL
--  Editor en klik op Run. Twee keer draaien kan geen kwaad.
--  Helemaal onderaan staat een TERUGDRAAIBLOK.
-- ══════════════════════════════════════════════════════════════

alter table public.toernooi_publiek add column if not exists media jsonb not null default '{}'::jsonb;
alter table public.toernooi_publiek add column if not exists media_bijgewerkt_op timestamptz;

create or replace function public.toernooi_media_publiceren(p_team text, p_toernooi text, p_media jsonb)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare
  v_club uuid;
  v_fout int;
begin
  select t.club_id into v_club from public.teams t where t.id = p_team and t.verwijderd_op is null;
  if v_club is null or not public.mag_serverdata_schrijven(v_club) then
    raise exception 'Publiceren mag alleen een trainer of eigenaar van dit team, met Coach of Club.';
  end if;
  if p_media is null or jsonb_typeof(p_media) <> 'object' then
    raise exception 'Ongeldige afbeeldingen.';
  end if;
  -- Alleen afbeeldingen als data-url: geen links naar buiten, geen scripts.
  select count(*) into v_fout from jsonb_each(p_media) e
   where jsonb_typeof(e.value) <> 'string' or (e.value #>> '{}') !~ '^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$';
  if v_fout > 0 then
    raise exception 'Alleen afbeeldingen (png, jpeg, webp of gif) zijn toegestaan.';
  end if;
  if octet_length(p_media::text) > 8000000 then
    raise exception 'De afbeeldingen zijn samen te groot (meer dan 8 MB).';
  end if;
  update public.toernooi_publiek set media = p_media, media_bijgewerkt_op = clock_timestamp()
   where team_id = p_team and toernooi_id = p_toernooi;
  if not found then
    raise exception 'Publiceer eerst het toernooi.';
  end if;
  return true;
end $$;

create or replace function public.toernooi_publiek_media(p_slug text)
returns table(media jsonb, media_bijgewerkt_op timestamptz)
language sql stable security definer set search_path = public as $$
  select p.media, p.media_bijgewerkt_op from public.toernooi_publiek p where p.slug = p_slug
$$;

create or replace function public.toernooi_publiek_versies(p_slug text)
returns table(inhoud timestamptz, media timestamptz)
language sql stable security definer set search_path = public as $$
  select p.bijgewerkt_op, p.media_bijgewerkt_op from public.toernooi_publiek p where p.slug = p_slug
$$;

revoke all on function public.toernooi_media_publiceren(text, text, jsonb) from public, anon;
grant execute on function public.toernooi_media_publiceren(text, text, jsonb) to authenticated;
grant execute on function public.toernooi_publiek_media(text) to anon, authenticated;
grant execute on function public.toernooi_publiek_versies(text) to anon, authenticated;


-- ══ CONTROLE — hier hoort overal "in orde" te staan ══
select 'kolom media' as onderdeel,
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'toernooi_publiek' and column_name = 'media')
            then 'in orde' else 'ONTBREEKT — draai eerst 23-toernooi-publiek.sql' end as uitkomst
union all
select 'bezoekers mogen afbeeldingen lezen via de functie',
       case when has_function_privilege('anon', 'public.toernooi_publiek_media(text)', 'execute') then 'in orde' else 'ONTBREEKT' end
union all
select 'bezoekers mogen GEEN afbeeldingen publiceren',
       case when not has_function_privilege('anon', 'public.toernooi_media_publiceren(text, text, jsonb)', 'execute') then 'in orde' else 'OPEN — draai dit bestand opnieuw' end;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIBLOK — haal de streepjes weg en draai alleen dit deel.
-- ══════════════════════════════════════════════════════════════
-- drop function if exists public.toernooi_publiek_versies(text);
-- drop function if exists public.toernooi_publiek_media(text);
-- drop function if exists public.toernooi_media_publiceren(text, text, jsonb);
-- alter table public.toernooi_publiek drop column if exists media_bijgewerkt_op;
-- alter table public.toernooi_publiek drop column if exists media;
