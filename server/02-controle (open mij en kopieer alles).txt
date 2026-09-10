-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — controle: staat de beveiliging echt aan?
--  ─────────────────────────────────────────────────────────────
--  Plak dit in de SQL Editor en klik op Run.
--
--  Je hoort zes regels terug te krijgen. Bij elke regel moet
--  beveiliging_aan op "true" staan en moet aantal_regels minstens
--  1 zijn.
--
--  Staat er ergens "false", dan ligt die tabel open voor iedereen
--  die het adres van je server kent — en dat adres staat straks
--  gewoon in de app. Zet er dan geen gegevens in en draai eerst
--  01-schema opnieuw.
-- ══════════════════════════════════════════════════════════════
select
  c.relname                as tabel,
  c.relrowsecurity         as beveiliging_aan,
  count(p.polname)         as aantal_regels
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relname;
