-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — herroepen binnen 14 dagen (de databasekant)
--  ─────────────────────────────────────────────────────────────
--  WAT DIT DOET, IN GEWONE TAAL
--  Sinds 19 juni 2026 moet een consument een online gesloten
--  abonnement binnen 14 dagen met één knop kunnen herroepen
--  (EU-richtlijn 2023/2673). Besluit van Evan (9 oktober 2026): wie
--  herroept krijgt ALLES terug, en het pakket stopt meteen.
--
--  Het herroepen zelf (de incasso stoppen, het geld terugstorten) doet
--  de edge function abonnement-herroepen. Dit bestand legt vast wat er
--  daarna in de database staat:
--
--    · abonnementen.herroepen_op — wanneer er is herroepen. De club
--      staat dan op 'free', zonder einddatum en zonder incasso.
--    · public.betalingen krijgt bij de teruggestorte betalingen de
--      status 'terugbetaald' (vrije tekst, zie 18-betalingen.sql).
--
--  En één reparatie die met het jaarbesluit van dezelfde dag te maken
--  heeft: wissel_controle() vergelijkt voortaan met het MAANDbedrag.
--
--  Draai dit ná 21-opzeggen.sql. Plak het hele bestand in de SQL
--  Editor en klik op Run; onderaan hoort overal "in orde" te staan.
--  Twee keer draaien kan geen kwaad.
--
--  Helemaal onderaan staat een TERUGDRAAIBLOK.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 1 — DE KOLOM
-- ══════════════════════════════════════════════════════════════
alter table public.abonnementen add column if not exists herroepen_op timestamptz;

comment on column public.abonnementen.herroepen_op is
  'Wanneer de vereniging binnen de bedenktijd heeft herroepen. Alleen te vullen NA een door Mollie bevestigde terugbetaling; zie supabase/functions/abonnement-herroepen. Wordt weer leeg bij een nieuwe aankoop.';


-- ══════════════════════════════════════════════════════════════
--  DEEL 2 — wissel_controle(): HET MAANDBEDRAG
-- ══════════════════════════════════════════════════════════════
create or replace function public.wissel_controle()
returns table(
  club_id         uuid,
  vereniging      text,
  pakket          text,
  termijn         text,
  verwacht_cent   int,
  bij_mollie_cent int,
  oordeel         text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_beheerder() or session_user in ('postgres', 'supabase_admin')) then
    raise exception 'Alleen voor beheerders';
  end if;

  return query
    -- Alleen maandbedragen: sinds 9 oktober 2026 loopt de incasso ook
    -- na een jaaraankoop per maand (doorlopendeIncasso in
    -- supabase/functions/_gedeeld/mollie.ts). Een club met termijn
    -- 'jaar' hoort dus het MAANDbedrag bij Mollie te hebben staan.
    with prijs(p_pakket, cent) as (
      values ('coach',  699),
             ('club',  4900)
    )
    select a.club_id,
           c.naam,
           a.pakket,
           a.termijn,
           pr.cent,
           a.mollie_bedrag_cent,
           case
             when a.mollie_bedrag_cent is null
               then 'ONBEKEND — nooit door Mollie bevestigd'
             when pr.cent is null
               then 'GEEN PRIJS BEKEND — pakket klopt niet'
             else 'WIJKT AF — Mollie incasseert een ander bedrag dan het pakket kost'
           end
      from public.abonnementen a
      join public.clubs c on c.id = a.club_id
      left join prijs pr on pr.p_pakket = a.pakket
     where a.pakket in ('coach', 'club')
       and a.geldig_tot is not null
       and a.opgezegd_op is null
       and (a.mollie_bedrag_cent is null
            or pr.cent is null
            or a.mollie_bedrag_cent <> pr.cent)
     order by c.naam;
end $$;

comment on function public.wissel_controle() is
  'Laat de verenigingen zien waarvan het bedrag dat Mollie volgens ons afschrijft niet klopt met het pakket, of onbekend is. Vergelijkt met het MAANDbedrag, ook bij een jaarabonnement (de incasso loopt per maand). Opgezegde verenigingen tellen niet mee: daar schrijft Mollie met opzet niets meer af. Geen rijen terug = alles in orde. Alleen voor een beheerder (en voor de SQL Editor).';

grant execute on function public.wissel_controle() to authenticated;


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — in de kolom "oordeel" hoort overal "in orde" te staan.
-- ══════════════════════════════════════════════════════════════
select 1 as nr, 'de kolom abonnementen.herroepen_op bestaat' as controle,
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'herroepen_op')
            then 'in orde' else 'LET OP' end as oordeel
union all
select 2, 'wissel_controle() vergelijkt met het maandbedrag',
       case when pg_get_functiondef('public.wissel_controle()'::regprocedure) not like '%p_termijn%'
             and pg_get_functiondef('public.wissel_controle()'::regprocedure) like '%opgezegd_op is null%'
            then 'in orde' else 'LET OP' end
union all
select 3, 'de app kan nog steeds niet zelf in abonnementen schrijven',
       case when not exists (select 1 from pg_policies
                              where schemaname = 'public' and tablename = 'abonnementen'
                                and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL'))
            then 'in orde' else 'LET OP' end
order by 1;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  1. Eerst de edge function weghalen:
--       supabase functions delete abonnement-herroepen
--  2. Dan wissel_controle() terug: draai DEEL 4 van 21-opzeggen.sql
--     opnieuw.
--  3. Pas dan de kolom (de terugbetalingen zelf blijven bij Mollie en in
--     public.betalingen staan):
-- alter table public.abonnementen drop column if exists herroepen_op;
