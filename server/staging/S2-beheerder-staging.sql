-- ══════════════════════════════════════════════════════════════
--  S2 — DE STAGINGBEHEERDER AANWIJZEN
--  ─────────────────────────────────────────────────────────────
--  DRAAI DIT NA server/03-beheer.sql. ALLEEN IN STAGING.
--
--  Je draait 03-beheer.sql op staging gewoon ONGEWIJZIGD. De laatste
--  regels daarvan zoeken jouw productie-e-mailadres op in auth.users
--  en maken die persoon beheerder. In staging bestaat dat account
--  niet, dus die insert vindt nul rijen en doet niets. Dat is geen
--  fout en je hoeft het bestand er niet voor aan te passen — schelen
--  twee versies van hetzelfde bestand die uit elkaar kunnen gaan lopen.
--
--  Dit bestand wijst in plaats daarvan het stagingaccount aan.
--
--  VOORAF: maak het account eerst aan in het dashboard, anders vindt
--  ook dit script niets. Zie stap 4 in LEES-MIJ-STAGING.md.
-- ══════════════════════════════════════════════════════════════

select public._eis_staging();   -- rem: weigert buiten staging

-- ── VUL HIER HET E-MAILADRES IN ──────────────────────────────
--  Hetzelfde adres als waarmee je in stap 4 het beheerdersaccount
--  hebt aangemaakt. Gebruik NIET je productieadres: dan kun je de
--  twee omgevingen bij het inloggen niet meer uit elkaar houden.
--
--  Tip: plusadressering werkt en komt gewoon in je eigen mailbox,
--  bijvoorbeeld  jouwnaam+staging-admin@voorbeeld.nl
-- ─────────────────────────────────────────────────────────────

insert into public.beheerders (gebruiker_id, notitie)
select id, 'staging-beheerder'
from auth.users
where email = 'VUL-HIER-JE-STAGING-BEHEERDERSADRES-IN'
on conflict (gebruiker_id) do nothing;

-- ── Controle ─────────────────────────────────────────────────
--  Je hoort hieronder precies één regel te zien.
--  Zie je er nul, dan bestaat dat account nog niet: maak het eerst
--  aan in Authentication > Users en draai dit bestand opnieuw.
select u.email, b.notitie, b.gemaakt_op
from public.beheerders b
join auth.users u on u.id = b.gebruiker_id;
