-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — opzeggen (de databasekant)
--  ─────────────────────────────────────────────────────────────
--  WAT DIT DOET, IN GEWONE TAAL
--  Een vereniging die betaalt kan nu zelf opzeggen, en die opzegging
--  ook weer intrekken zolang het betaalde pakket nog loopt. Het
--  opzeggen zelf (de incasso bij Mollie stoppen) doet de edge function
--  abonnement-opzeggen; dit bestand legt vast wát er dan in de
--  database staat en wat dat betekent:
--
--    · abonnementen.opgezegd_op — wanneer er is opgezegd. Leeg = niet.
--    · Een opgezegde vereniging houdt haar pakket tot en met de
--      einddatum, en daarna NIET nog veertien dagen respijt (besluit
--      van Evan, 29 september 2026). Die respijt is bedoeld voor een
--      incasso die te laat binnenkomt; wie zelf stopt, wacht nergens
--      op. De zestig dagen waarin de club daarna nog naar de server mag
--      schrijven (schrijfrecht_tot, 18-betalingen.sql) blijven
--      ongemoeid: dat gaat over iemands gegevens, niet over het pakket.
--    · Een opgezegde vereniging kan niet wisselen van pakket. Er is
--      geen incasso meer om bij te werken.
--
--  Draai dit ná 06-pakketten.sql, 18-betalingen.sql,
--  19-mollie-subscription.sql en 20-abonnement-wisselen.sql.
--
--  Plak het hele bestand in de SQL Editor van Supabase en klik op Run.
--  De SQL Editor toont alleen de uitslag van het LAATSTE stuk, en dat
--  is hier het controleblok: daar hoort overal "in orde" te staan.
--  Twee keer draaien kan geen kwaad: alles hier is herhaalbaar.
--
--  Helemaal onderaan staat een TERUGDRAAIBLOK.
--
--  ─────────────────────────────────────────────────────────────
--  WAAROM ER HIER GEEN EIGEN SCHRIJFFUNCTIE STAAT
--  Bij wisselen wel (wissel_abonnement, start_wissel). Hier niet: de
--  edge function schrijft opgezegd_op rechtstreeks met de
--  service-sleutel, net zoals hij mollie_bedrag_cent schrijft. Dat
--  kan veilig omdat public.abonnementen met opzet géén schrijfregel
--  heeft voor de app (06-pakketten.sql): dat ontbreken ÍS het slot.
--  Een extra functie zou alleen een tweede deur zijn om te bewaken.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 1 — DE KOLOM
-- ══════════════════════════════════════════════════════════════
alter table public.abonnementen add column if not exists opgezegd_op timestamptz;

comment on column public.abonnementen.opgezegd_op is
  'Wanneer de vereniging heeft opgezegd. Leeg = niet opgezegd. Alleen te vullen NA een door Mollie bevestigde stopzetting van de doorlopende incasso — nooit vooraf; zie supabase/functions/abonnement-opzeggen.';


-- ══════════════════════════════════════════════════════════════
--  DEEL 2 — pakket_van_club(): GEEN RESPIJT NA OPZEGGEN
--  ─────────────────────────────────────────────────────────────
--  Dezelfde functie als in 06-pakketten.sql, met één verschil: de
--  respijtdagen tellen alleen voor wie NIET heeft opgezegd. Zelfde
--  naam en zelfde handtekening, dus alles wat hem al aanroept (de
--  teamgrens, mag_serverdata_schrijven) krijgt dit vanzelf mee.
-- ══════════════════════════════════════════════════════════════
create or replace function public.pakket_van_club(doel uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case
              when a.geldig_tot is null then a.pakket
              when current_date <= a.geldig_tot
                   + case when a.opgezegd_op is not null then 0
                          else coalesce((select i.getal from public.pakket_instellingen i
                                         where i.sleutel = 'respijt_dagen'), 0)
                     end
                then a.pakket
              else 'free'
            end
     from public.abonnementen a
     where a.club_id = doel),
    'free')
$$;

grant execute on function public.pakket_van_club(uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════
--  DEEL 3 — wissel_gegevens(): WEET NU OF ER IS OPGEZEGD
--  ─────────────────────────────────────────────────────────────
--  Eén kolom erbij: opgezegd. abonnement-wisselen weigert daarop met
--  een eigen zin, en abonnement-opzeggen gebruikt deze zelfde functie
--  voor zijn eigen feiten — één plek die zegt hoe het abonnement ervoor
--  staat, en niet twee die uit de pas kunnen lopen.
--
--  Een nieuwe kolom in het antwoord verandert het type van de functie,
--  en dat kan "create or replace" niet. Vandaar eerst weghalen. Tussen
--  die twee regels in bestaat de functie heel even niet; de SQL Editor
--  draait dit hele bestand in één keer, dus dat moment is niet te zien.
-- ══════════════════════════════════════════════════════════════
drop function if exists public.wissel_gegevens(uuid);

create or replace function public.wissel_gegevens(p_club uuid)
returns table(
  pakket                 text,
  termijn                text,
  geldig_tot             date,
  totale_dagen           int,
  resterende_dagen       int,
  mollie_klant_id        text,
  mollie_subscription_id text,
  wissel_onderweg        boolean,
  opgezegd               boolean
) language plpgsql security definer set search_path = public as $$
declare
  v_claims text := coalesce(current_setting('request.jwt.claims', true), '');
  v_rol    text;

  v_abo     record;
  v_vandaag date;
  v_stap    interval;
  v_start   date;
  v_over    int;
begin
  -- ── SLOT 2 — alleen de servercode ──────────────────────────
  if v_claims <> '' then
    begin
      v_rol := (v_claims::jsonb ->> 'role');
    exception when others then
      v_rol := null;
    end;
    if v_rol is distinct from 'service_role' then
      raise exception 'wissel_gegevens(): alleen de servercode mag dit aanroepen (rol: %)', coalesce(v_rol, 'onbekend');
    end if;
  elsif session_user not in ('postgres', 'supabase_admin') then
    raise exception 'wissel_gegevens(): alleen de servercode mag dit aanroepen (geen webverzoek, sessie: %)', session_user;
  end if;

  select a.pakket, a.termijn, a.geldig_tot, a.mollie_klant_id, a.mollie_subscription_id,
         a.opgezegd_op
    into v_abo
    from public.abonnementen a
   where a.club_id = p_club;

  -- Geen abonnementsrij: dan zijn er geen feiten. Geen rij terug is
  -- hier het eerlijke antwoord; de servercode leest dat als "deze club
  -- kan hier niets wisselen".
  if not found then
    return;
  end if;

  -- De Nederlandse datum. NIET current_date: zie punt 2 hierboven.
  v_vandaag := (now() at time zone 'Europe/Amsterdam')::date;

  pakket                 := v_abo.pakket;
  termijn                := v_abo.termijn;
  geldig_tot             := v_abo.geldig_tot;
  mollie_klant_id        := v_abo.mollie_klant_id;
  mollie_subscription_id := v_abo.mollie_subscription_id;

  opgezegd := v_abo.opgezegd_op is not null;

  wissel_onderweg := exists (select 1 from public.abonnement_wissels w
                              where w.club_id = p_club and w.afgerond_op is null);

  if v_abo.geldig_tot is null then
    -- Onbeperkt (of gratis): geen periode, dus geen getallen.
    totale_dagen     := null;
    resterende_dagen := null;
  else
    v_stap := case v_abo.termijn
                when 'maand' then interval '1 month'
                when 'jaar'  then interval '1 year'
                else null
              end;

    v_over := v_abo.geldig_tot - v_vandaag;

    if v_stap is null then
      -- Wel een einddatum, maar geen bekende termijn. Dan is de lengte
      -- van de periode onbekend — en dat blijft leeg, want raden wordt
      -- hier geld. Het aantal resterende dagen is wél te zeggen.
      totale_dagen := null;
    else
      v_start      := (v_abo.geldig_tot - v_stap)::date;
      totale_dagen := v_abo.geldig_tot - v_start;
    end if;

    -- Nooit negatief (een verlopen abonnement zou van een upgrade een
    -- teruggave maken) en nooit meer dan de periode lang is.
    resterende_dagen := greatest(least(v_over, coalesce(totale_dagen, v_over)), 0);
  end if;

  return next;
end $$;

comment on function public.wissel_gegevens(uuid) is
  'Geeft de feiten waarop de servercode een wissel beoordeelt: huidig pakket, termijn, einddatum, de lengte van de lopende periode en hoeveel dagen daarvan over zijn (Nederlandse tijd), plus of er al een wissel onderweg is en of de vereniging heeft opgezegd. Rekent zelf niets uit en wijzigt niets.';

revoke execute on function public.wissel_gegevens(uuid) from public, anon, authenticated;
grant  execute on function public.wissel_gegevens(uuid) to service_role;

-- ══════════════════════════════════════════════════════════════
--  DEEL 4 — wissel_controle(): EEN OPGEZEGDE CLUB IS GEEN AFWIJKING
--  ─────────────────────────────────────────────────────────────
--  Na opzeggen schrijft Mollie niets meer af, en staat
--  mollie_bedrag_cent dus met opzet leeg. Zonder deze regel meldt de
--  controle elke opgezegde vereniging als "ONBEKEND", en een controle
--  die altijd iets meldt leert iedereen om hem te negeren.
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
    with prijs(p_pakket, p_termijn, cent) as (
      values ('coach', 'maand',   699),
             ('coach', 'jaar',   6990),
             ('club',  'maand',  4900),
             ('club',  'jaar',  49000)
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
               then 'GEEN PRIJS BEKEND — pakket of termijn klopt niet'
             else 'WIJKT AF — Mollie incasseert een ander bedrag dan het pakket kost'
           end
      from public.abonnementen a
      join public.clubs c on c.id = a.club_id
      left join prijs pr on pr.p_pakket = a.pakket and pr.p_termijn = a.termijn
     where a.pakket in ('coach', 'club')
       and a.geldig_tot is not null
       and a.opgezegd_op is null
       and (a.mollie_bedrag_cent is null
            or pr.cent is null
            or a.mollie_bedrag_cent <> pr.cent)
     order by c.naam;
end $$;

comment on function public.wissel_controle() is
  'Laat de verenigingen zien waarvan het bedrag dat Mollie volgens ons afschrijft niet klopt met het pakket, of onbekend is. Opgezegde verenigingen tellen niet mee: daar schrijft Mollie met opzet niets meer af. Geen rijen terug = alles in orde. Alleen voor een beheerder (en voor de SQL Editor).';

grant execute on function public.wissel_controle() to authenticated;


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is alles goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  In de kolom "oordeel" hoort overal "in orde" te staan. Dit blok
--  verandert niets.
-- ══════════════════════════════════════════════════════════════
select 1 as nr, 'de kolom abonnementen.opgezegd_op bestaat' as controle,
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'opgezegd_op')
            then 'in orde' else 'LET OP' end as oordeel
union all
select 2, 'pakket_van_club() kent opgezegd_op (geen respijt na opzeggen)',
       case when pg_get_functiondef('public.pakket_van_club(uuid)'::regprocedure) like '%opgezegd_op%'
            then 'in orde' else 'LET OP' end
union all
select 3, 'wissel_gegevens() geeft de kolom opgezegd terug',
       case when exists (select 1 from pg_proc p
                          where p.oid = 'public.wissel_gegevens(uuid)'::regprocedure
                            and 'opgezegd' = any(p.proargnames))
            then 'in orde' else 'LET OP' end
union all
select 4, 'wissel_gegevens() blijft dicht voor de app',
       case when not has_function_privilege('authenticated', 'public.wissel_gegevens(uuid)', 'execute')
             and not has_function_privilege('anon', 'public.wissel_gegevens(uuid)', 'execute')
             and has_function_privilege('service_role', 'public.wissel_gegevens(uuid)', 'execute')
            then 'in orde' else 'LET OP' end
union all
select 5, 'wissel_controle() slaat opgezegde verenigingen over',
       case when pg_get_functiondef('public.wissel_controle()'::regprocedure) like '%opgezegd_op is null%'
            then 'in orde' else 'LET OP' end
union all
select 6, 'de app kan nog steeds niet zelf in abonnementen schrijven',
       case when not exists (select 1 from pg_policies
                              where schemaname = 'public' and tablename = 'abonnementen'
                                and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL'))
            then 'in orde' else 'LET OP' end
order by 1;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Haal bij de regels hieronder de twee streepjes vooraan weg,
--  selecteer alleen dat stuk en klik op Run.
--
--  LET OP, IN DEZE VOLGORDE:
--    1. Eerst de edge function abonnement-opzeggen weghalen
--       (supabase functions delete abonnement-opzeggen), anders kan
--       er tussendoor nog iemand opzeggen.
--    2. Draai daarna 06-pakketten.sql DEEL pakket_van_club en
--       20-abonnement-wisselen.sql opnieuw: die zetten de oude
--       pakket_van_club(), wissel_gegevens() en wissel_controle()
--       terug. wissel_gegevens() moet daarvoor eerst weg:
-- drop function if exists public.wissel_gegevens(uuid);
--    3. Pas dan de kolom. Wie op dat moment had opgezegd, staat daarna
--       weer als gewoon lopend abonnement — maar zonder incasso bij
--       Mollie. Kijk dus eerst wie dat zijn:
-- select club_id, opgezegd_op from public.abonnementen where opgezegd_op is not null;
-- alter table public.abonnementen drop column if exists opgezegd_op;
