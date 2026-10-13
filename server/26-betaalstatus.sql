-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — de app mag de status van de eigen betaling zien
--  ─────────────────────────────────────────────────────────────
--  WAT DIT DOET, IN GEWONE TAAL
--  Aanleiding (13 oktober 2026): Evan annuleerde een betaling bij
--  Mollie en bleef daarna in de app hangen op "Je betaling wordt
--  verwerkt…". De app wachtte op een pakket dat nooit zou komen, want
--  er was niets betaald.
--
--  Sindsdien zet betaling-melding (de webhook) de status van een
--  betaling op 'canceled', 'expired' of 'failed' als Mollie dat meldt.
--  Met deze functie kan de app die status opvragen — alleen voor de
--  eigen vereniging, alleen de laatste poging, en alleen status, pakket
--  en tijdstip. Geen bedragen, geen klantnummers.
--
--  public.betalingen zelf blijft dicht voor gewone gebruikers (alleen
--  beheerders mogen lezen, zie 18-betalingen.sql).
--
--  Draai dit ná 18-betalingen.sql. Plak het hele bestand in de SQL
--  Editor en klik op Run. Twee keer draaien kan geen kwaad.
--  Onderaan staat een TERUGDRAAIBLOK.
-- ══════════════════════════════════════════════════════════════

create or replace function public.laatste_betaalpoging(p_club uuid, p_sinds timestamptz)
returns table(status text, pakket text, aangemaakt_op timestamptz)
language sql stable security definer set search_path = public as $$
  select b.status, b.pakket, b.aangemaakt_op
    from public.betalingen b
   where b.club_id = p_club
     and b.aangemaakt_op >= p_sinds
     and exists (select 1 from public.leden l where l.club_id = p_club and l.gebruiker_id = auth.uid())
   order by b.aangemaakt_op desc
   limit 1
$$;

revoke all on function public.laatste_betaalpoging(uuid, timestamptz) from public, anon;
grant execute on function public.laatste_betaalpoging(uuid, timestamptz) to authenticated;

-- ══ CONTROLE — hier hoort overal "in orde" te staan ══
select 'functie laatste_betaalpoging' as onderdeel,
       case when to_regprocedure('public.laatste_betaalpoging(uuid, timestamptz)') is not null then 'in orde' else 'ONTBREEKT' end as uitkomst
union all
select 'bezoekers zonder account kunnen hem niet aanroepen',
       case when not has_function_privilege('anon', 'public.laatste_betaalpoging(uuid, timestamptz)', 'execute') then 'in orde' else 'OPEN — draai dit bestand opnieuw' end;

-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIBLOK
-- ══════════════════════════════════════════════════════════════
-- drop function if exists public.laatste_betaalpoging(uuid, timestamptz);
