-- ══════════════════════════════════════════════════════════════
--  S0 — STAGINGMERK
--  ─────────────────────────────────────────────────────────────
--  DRAAI DIT ALS ALLEREERSTE, EN ALLEEN IN TEAMTAKKIE-STAGING.
--
--  Dit bestand maakt één tabel die verder niets doet: hij bewijst
--  dat je in staging zit. Elk script hierna dat iets weggooit,
--  weigert te draaien als deze tabel er niet is.
--
--  Waarom dit bestaat: de SQL Editor van Supabase ziet er in elk
--  project precies hetzelfde uit. Eén keer het verkeerde tabblad
--  voor is genoeg. Dit is de rem daarop.
--
--  Draai dit NOOIT op productie. Doe je het per ongeluk toch, dan
--  is er niets kapot — er staat dan alleen een tabel te veel — maar
--  je bent wel je rem kwijt. Verwijder hem dan meteen met:
--      drop table public._staging_merk;
-- ══════════════════════════════════════════════════════════════

create table if not exists public._staging_merk (
  id          boolean primary key default true,
  omgeving    text not null default 'staging',
  aangemaakt  timestamptz not null default now(),
  constraint  eenrij check (id)
);

insert into public._staging_merk (id, omgeving)
values (true, 'staging')
on conflict (id) do nothing;

-- Niet blootstellen aan de API. Geen grants, RLS aan, geen policies:
-- daarmee is hij voor anon en authenticated onzichtbaar én onleesbaar.
alter table public._staging_merk enable row level security;
revoke all on public._staging_merk from anon, authenticated;

-- De rem zelf. Elk script dat data weggooit roept deze functie aan.
create or replace function public._eis_staging()
returns void language plpgsql as $$
begin
  if not exists (select 1 from public._staging_merk where omgeving = 'staging') then
    raise exception
      'GEWEIGERD: dit is geen stagingomgeving. Draai S0-marker.sql eerst, of controleer of je in het juiste project zit.';
  end if;
end $$;

-- ── Controle ─────────────────────────────────────────────────
select omgeving, aangemaakt, 'rem staat aan' as status
from public._staging_merk;
