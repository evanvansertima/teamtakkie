-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — één kolom erbij: het abonnementsnummer van Mollie
--  ─────────────────────────────────────────────────────────────
--  WAT DIT DOET, IN GEWONE TAAL
--  Er komt één kolom bij in public.abonnementen. Daarin komt het
--  nummer te staan van de doorlopende incasso die Mollie voor een
--  vereniging bijhoudt (zo'n nummer begint met "sub_").
--
--  WAT JE HIERNA ZOU MOETEN ZIEN
--  Onderaan staat een controleblok. Daar hoort in de kolom "oordeel"
--  overal "in orde" te staan. Verder verandert er voor niemand iets:
--  de kolom is leeg tot de eerste echte betaling binnenkomt.
--
--  Twee keer draaien kan geen kwaad (add column if not exists).
--
--  ─────────────────────────────────────────────────────────────
--  DRAAI DIT VÓÓRDAT DE EDGE FUNCTIONS LIVE GAAN
--
--  supabase/functions/betaling-melding/index.ts leest en schrijft deze
--  kolom. Bestaat hij niet, dan geeft de database een fout, geeft de
--  webhook een 500, en blijft Mollie dezelfde melding aanbieden. Het
--  pakket wordt dan wél toegekend (dat gebeurt eerder in de functie),
--  maar de doorlopende incasso komt er nooit. Vandaar: eerst dit
--  bestand, dan pas `supabase functions deploy`.
--
--  ─────────────────────────────────────────────────────────────
--  WAAROM DIT EEN APART BESTAND IS EN NIET IN 18-betalingen.sql
--
--  Dat bestand is af, getest met 89 scenario's en gecommit. Een
--  bestand van 1228 regels opnieuw door de SQL Editor halen voor één
--  kolom is meer risico dan het waard is — en de bestanden in server/
--  zijn met opzet een geschiedenis en geen momentopname
--  (18-betalingen.sql zegt dat zelf, bij DEEL 4). Dit blok is klein
--  genoeg om in één oogopslag na te kijken.
--
--  ─────────────────────────────────────────────────────────────
--  WAAROM ER ÜBERHAUPT EEN NUMMER BEWAARD MOET WORDEN
--
--  Mollie stuurt een webhook opnieuw zolang hij geen 200 terugkrijgt.
--  Dat is normaal gedrag, geen storing. Zou betaling-melding bij elke
--  melding een nieuwe subscription aanmaken, dan staan er na twee
--  meldingen twee doorlopende incasso's voor dezelfde club — en
--  incasseert Mollie elke maand twee keer. Dat merk je pas bij de
--  eerste boze penningmeester.
--
--  Deze kolom is het antwoord op de vraag "hebben we er al een?".
--  Dezelfde gedachte als mollie_betaling_id in public.betalingen: één
--  plek waar het nummer staat, en daarmee één plek om te kijken.
--
--  WAAROM IN abonnementen EN NIET IN EEN EIGEN TABEL
--  Een vereniging heeft precies één lopend abonnement — dat is het
--  besluit uit docs/pakketten-besluit.md (geen maatwerk, geen prijs
--  per team). Een aparte tabel zou een tweede antwoord mogelijk maken
--  op een vraag die maar één antwoord mag hebben.
--
--  GEEN LEESREGEL, GEEN SCHRIJFREGEL — DAT IS MET OPZET
--  public.abonnementen heeft geen enkele schrijfregel (01-schema.sql
--  regel 288-295), en dat blijft zo. Alleen de servercode komt bij
--  deze kolom, met de service-sleutel. Een vereniging die zijn eigen
--  abonnementsnummer kan wijzigen, kan zijn incasso laten stoppen.
-- ══════════════════════════════════════════════════════════════

alter table public.abonnementen
  add column if not exists mollie_subscription_id text;

comment on column public.abonnementen.mollie_subscription_id is
  'Het nummer van de doorlopende incasso bij Mollie (sub_…). Leeg = er loopt nog geen automatische verlenging. Bestaat deze waarde al, dan maakt betaling-melding er géén tweede aan — dat is de bescherming tegen een dubbele webhook die tot een dubbele incasso zou leiden.';

-- Zoeken op dit nummer gebeurt zelden (alleen als Evan iets naloopt in
-- het Mollie-dashboard), maar een vereniging zoeken bij een
-- abonnementsnummer zonder index betekent de hele tabel doorlopen.
-- Bij een paar honderd clubs kost die index niets.
create index if not exists abonnementen_mollie_subscription_idx
  on public.abonnementen (mollie_subscription_id);


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is het goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  Hieronder komt een tabel terug. In de kolom "oordeel" hoort overal
--  "in orde" te staan. Wil je dit later nog eens los nakijken,
--  selecteer dan alleen het stuk van "select" tot en met de puntkomma
--  en klik op Run. Het verandert niets.
--
--  Getest met een opzettelijke fout: de regel "add column" hierboven
--  eruit gehaald en alleen het controleblok gedraaid — toen stond er
--  "LET OP" op precies die twee regels.
-- ══════════════════════════════════════════════════════════════
select 'de kolom abonnementen.mollie_subscription_id bestaat' as controle,
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'mollie_subscription_id')
            then 'ja' else 'nee' end as gevonden,
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'mollie_subscription_id')
            then 'in orde' else 'LET OP' end as oordeel
union all
select 'er is een index op die kolom',
       case when exists (select 1 from pg_indexes
                          where schemaname = 'public' and tablename = 'abonnementen'
                            and indexname = 'abonnementen_mollie_subscription_idx')
            then 'ja' else 'nee' end,
       case when exists (select 1 from pg_indexes
                          where schemaname = 'public' and tablename = 'abonnementen'
                            and indexname = 'abonnementen_mollie_subscription_idx')
            then 'in orde' else 'LET OP' end
union all
-- Deze twee horen bij 18-betalingen.sql en staan hier alleen om te
-- laten zien dat dit bestand ná dat bestand hoort te draaien.
select 'de kolom abonnementen.mollie_klant_id bestaat (uit 18)',
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'mollie_klant_id')
            then 'ja' else 'nee, draai eerst 18-betalingen.sql' end,
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'abonnementen'
                            and column_name = 'mollie_klant_id')
            then 'in orde' else 'LET OP' end
union all
select 'niemand anders dan de servercode mag in abonnementen schrijven',
       (select count(*)::text || ' schrijfregel(s)' from pg_policy
         where polrelid = 'public.abonnementen'::regclass and polcmd in ('a','w','d')),
       case when (select count(*) from pg_policy
                   where polrelid = 'public.abonnementen'::regclass
                     and polcmd in ('a','w','d')) = 0
            then 'in orde' else 'LET OP' end
order by 1;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Haal bij de twee regels hieronder de streepjes vooraan weg,
--  selecteer alleen dat stuk en klik op Run. Daarmee is alles weer
--  zoals vóór dit bestand.
--
--  LET OP: de nummers van lopende incasso's zijn daarna weg uit deze
--  database. Ze staan nog wél in het dashboard van Mollie, dus ze zijn
--  terug te vinden — maar betaling-melding zou tot die tijd bij elke
--  eerste betaling een tweede subscription kunnen aanmaken. Draai dit
--  dus alleen terug als de edge functions óók van de lucht zijn.
-- ══════════════════════════════════════════════════════════════

-- drop index if exists public.abonnementen_mollie_subscription_idx;
-- alter table public.abonnementen drop column if exists mollie_subscription_id;
