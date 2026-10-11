-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — AI-trainer: gebruik bijhouden en een rem
--  ─────────────────────────────────────────────────────────────
--  WAT DIT DOET, IN GEWONE TAAL
--  De AI-trainer (edge function ai-trainer) kost per vraag een paar
--  cent bij Anthropic. Besluit 1 van Evan (9 oktober 2026): onbeperkt
--  in Coach en Club, géén maandlimiet. Wel twee dingen:
--
--    · Een REM tegen misbruik of een vastgelopen script: per gebruiker
--      één vraag tegelijk, en hoogstens 20 per 10 minuten. Een trainer
--      die een training samenstelt komt daar nooit aan.
--    · Een OVERZICHT voor Evan: per club per maand het aantal vragen en
--      tokens (de eenheid waarin Anthropic rekent), met een schatting
--      van de kosten. Zo zie je het meteen als er iets geks gebeurt.
--
--  Er wordt NIETS van de inhoud bewaard: geen vragen, geen antwoorden.
--  Alleen wie, wanneer en hoeveel.
--
--  Alleen de edge function (met de service-sleutel) mag hier schrijven.
--  Een gewone gebruiker kan de tabellen niet lezen en de functies niet
--  aanroepen — anders kon iemand zijn eigen rem resetten.
--
--  Draai dit ná 03-beheer.sql. Plak het hele bestand in de SQL Editor
--  en klik op Run. Twee keer draaien kan geen kwaad.
--  Helemaal onderaan staat een TERUGDRAAIBLOK.
-- ══════════════════════════════════════════════════════════════


-- ══ DEEL 1 — DE TABELLEN ══
create table if not exists public.ai_gebruik (
  club_id     uuid not null references public.clubs(id) on delete cascade,
  maand       text not null check (maand ~ '^\d{4}-\d{2}$'),
  verzoeken   int not null default 0,
  tokens_in   bigint not null default 0,
  tokens_uit  bigint not null default 0,
  primary key (club_id, maand)
);
comment on table public.ai_gebruik is
  'AI-trainer: aantal vragen en tokens per club per maand. Geen inhoud. Alleen te schrijven via ai_verzoek_klaar() (service-sleutel).';

create table if not exists public.ai_verzoeken (
  id            bigserial primary key,
  gebruiker_id  uuid not null,
  club_id       uuid not null,
  begonnen      timestamptz not null default clock_timestamp(),
  klaar         timestamptz
);
create index if not exists ai_verzoeken_gebruiker on public.ai_verzoeken(gebruiker_id, begonnen desc);
comment on table public.ai_verzoeken is
  'AI-trainer: de rem (één tegelijk, 20 per 10 minuten). Regels ouder dan een dag worden vanzelf opgeruimd.';

alter table public.ai_gebruik   enable row level security;
alter table public.ai_verzoeken enable row level security;
revoke all on public.ai_gebruik, public.ai_verzoeken from anon, authenticated;


-- ══ DEEL 2 — DE REM ══
--  Uitkomst 'ok' met een verzoek-id, of 'bezig' (er loopt al een vraag
--  van deze gebruiker) of 'te-veel' (20 in de laatste 10 minuten).
--  Een vraag die na 2 minuten nog niet klaar is telt niet meer als
--  "bezig": dan is de functie onderweg omgevallen, en anders zat de
--  trainer voorgoed vast.
create or replace function public.ai_verzoek_start(p_gebruiker uuid, p_club uuid)
returns table(uitkomst text, verzoek_id bigint)
language plpgsql volatile security definer set search_path = public as $$
declare v_id bigint; v_tel int;
begin
  -- Twee tabbladen tegelijk: de tweede wacht hier tot de eerste klaar is
  -- met tellen, zodat ze niet allebei "nog niets bezig" zien.
  perform pg_advisory_xact_lock(hashtext('ai:' || p_gebruiker::text));
  delete from public.ai_verzoeken where begonnen < clock_timestamp() - interval '1 day';
  if exists (select 1 from public.ai_verzoeken
              where gebruiker_id = p_gebruiker and klaar is null
                and begonnen > clock_timestamp() - interval '2 minutes') then
    return query select 'bezig'::text, null::bigint; return;
  end if;
  select count(*) into v_tel from public.ai_verzoeken
   where gebruiker_id = p_gebruiker and begonnen > clock_timestamp() - interval '10 minutes';
  if v_tel >= 20 then
    return query select 'te-veel'::text, null::bigint; return;
  end if;
  insert into public.ai_verzoeken (gebruiker_id, club_id) values (p_gebruiker, p_club) returning id into v_id;
  return query select 'ok'::text, v_id;
end $$;

--  Klaar (gelukt of niet): de rem loslaten en het gebruik optellen.
create or replace function public.ai_verzoek_klaar(p_id bigint, p_tokens_in int, p_tokens_uit int)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_club uuid; v_maand text := to_char(clock_timestamp() at time zone 'Europe/Amsterdam', 'YYYY-MM');
begin
  update public.ai_verzoeken set klaar = clock_timestamp() where id = p_id and klaar is null returning club_id into v_club;
  if v_club is null then return; end if;   -- al afgemeld of onbekend: niet dubbel tellen
  insert into public.ai_gebruik as g (club_id, maand, verzoeken, tokens_in, tokens_uit)
       values (v_club, v_maand, 1, greatest(coalesce(p_tokens_in, 0), 0), greatest(coalesce(p_tokens_uit, 0), 0))
  on conflict (club_id, maand) do update
     set verzoeken  = g.verzoeken + 1,
         tokens_in  = g.tokens_in  + excluded.tokens_in,
         tokens_uit = g.tokens_uit + excluded.tokens_uit;
end $$;

revoke all on function public.ai_verzoek_start(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ai_verzoek_klaar(bigint, int, int) from public, anon, authenticated;
grant execute on function public.ai_verzoek_start(uuid, uuid) to service_role;
grant execute on function public.ai_verzoek_klaar(bigint, int, int) to service_role;


-- ══ DEEL 3 — HET MAANDOVERZICHT VOOR EVAN ══
--  select * from public.ai_maandoverzicht();            -- deze maand
--  select * from public.ai_maandoverzicht('2026-10');   -- een andere maand
--  De kosten zijn een SCHATTING in dollars op basis van de prijzen van
--  het model claude-sonnet-5-5 (3 dollar per miljoen tokens erin, 15
--  per miljoen eruit). De echte rekening staat op console.anthropic.com.
create or replace function public.ai_maandoverzicht(p_maand text default null)
returns table(vereniging text, pakket text, verzoeken int, tokens_in bigint, tokens_uit bigint, geschat_dollar numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_beheerder() or session_user in ('postgres', 'supabase_admin')) then
    raise exception 'Alleen voor beheerders';
  end if;
  return query
    select c.naam, public.pakket_van_club(g.club_id), g.verzoeken, g.tokens_in, g.tokens_uit,
           round((g.tokens_in * 3.0 + g.tokens_uit * 15.0) / 1000000, 2)
      from public.ai_gebruik g join public.clubs c on c.id = g.club_id
     where g.maand = coalesce(p_maand, to_char(now() at time zone 'Europe/Amsterdam', 'YYYY-MM'))
     order by 6 desc;
end $$;
revoke all on function public.ai_maandoverzicht(text) from public, anon;
grant execute on function public.ai_maandoverzicht(text) to authenticated;


-- ══ CONTROLE — hier hoort overal "in orde" te staan ══
select 'tabellen ai_gebruik en ai_verzoeken' as onderdeel,
       case when to_regclass('public.ai_gebruik') is not null and to_regclass('public.ai_verzoeken') is not null then 'in orde' else 'ONTBREEKT' end as uitkomst
union all
select 'gebruikers kunnen het gebruik niet lezen',
       case when not has_table_privilege('authenticated', 'public.ai_gebruik', 'select') then 'in orde' else 'OPEN — draai dit bestand opnieuw' end
union all
select 'gebruikers kunnen de rem niet omzeilen',
       case when not has_function_privilege('authenticated', 'public.ai_verzoek_start(uuid, uuid)', 'execute')
             and not has_function_privilege('authenticated', 'public.ai_verzoek_klaar(bigint, int, int)', 'execute') then 'in orde' else 'OPEN — draai dit bestand opnieuw' end
union all
select 'pakketgrens (18-betalingen.sql) aanwezig',
       case when to_regprocedure('public.mag_serverdata_schrijven(uuid)') is not null then 'in orde' else 'ONTBREEKT — draai eerst 18-betalingen.sql' end;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIBLOK — haal de streepjes weg en draai alleen dit deel.
--  De AI-trainer werkt daarna niet meer (de functie weigert dan).
-- ══════════════════════════════════════════════════════════════
-- drop function if exists public.ai_maandoverzicht(text);
-- drop function if exists public.ai_verzoek_klaar(bigint, int, int);
-- drop function if exists public.ai_verzoek_start(uuid, uuid);
-- drop table if exists public.ai_verzoeken;
-- drop table if exists public.ai_gebruik;
