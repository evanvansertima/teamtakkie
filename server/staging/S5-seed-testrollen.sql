-- ══════════════════════════════════════════════════════════════
--  S5 — EXTRA TESTROLLEN (PAS NODIG BIJ FASE A)
--  ─────────────────────────────────────────────────────────────
--  DRAAI DIT NOG NIET. Het hoort bij fase A, niet bij het opzetten
--  van staging. Het staat hier alleen zodat je het compleet hebt.
--
--  WAAROM DIT APART STAAT
--
--  Na S3 is staging exact even groot als productie: vier clubs met
--  elk één eigenaar. Precies daarom kun je er twee van de drie
--  fase A-tests NIET op doen:
--
--    · "een gewoon lid kan zichzelf niet bij een andere club voegen"
--      vraagt om een lid dat geen eigenaar is;
--    · "een gewoon lid kan zijn rol niet promoveren via delete en
--      opnieuw invoegen" (S10) vraagt om een kijker of trainer.
--
--  Productie heeft die niet. Staging moet ze wel krijgen, anders
--  test je een gat dat je niet kunt bereiken en concludeer je dat
--  het dicht zit.
--
--  Dit script doorbreekt dus bewust de gelijkheid met productie.
--  Draai het pas NADAT S4 groen is, en noteer erbij dat je
--  aantallen vanaf dat moment 6 leden zijn in plaats van 4.
--
--  VOORAF: maak deze twee accounts aan in Authentication > Users,
--  net als in stap 4.
-- ══════════════════════════════════════════════════════════════

select public._eis_staging();   -- rem: weigert buiten staging

-- ── VUL HIER DE TWEE EXTRA ACCOUNTS IN ───────────────────────

create temporary table _seed_rollen (clubnaam text, email text, rol text);

insert into _seed_rollen (clubnaam, email, rol) values
  -- Een kijker bij fc Harlingen: hoort alles te zien en niets te mogen.
  -- Dit is het account waarmee je S10 test.
  ('fc Harlingen', 'VUL-IN-kijker@voorbeeld.nl',  'kijker'),
  -- Een trainer bij fc Harlingen: hoort te mogen schrijven in de teams
  -- van zijn club, maar niet het abonnement of het lidmaatschap te raken.
  ('fc Harlingen', 'VUL-IN-trainer@voorbeeld.nl', 'trainer');

insert into public.leden (club_id, gebruiker_id, naam, rol)
select c.id, u.id, initcap(r.rol) || ' (staging)', r.rol
from _seed_rollen r
join public.clubs c on c.naam = r.clubnaam
join auth.users u   on u.email = r.email
on conflict (club_id, gebruiker_id) do nothing;

drop table _seed_rollen;

-- ── Controle ─────────────────────────────────────────────────
select c.naam as club, l.rol, l.naam, u.email
from public.leden l
join public.clubs c on c.id = l.club_id
join auth.users u   on u.id = l.gebruiker_id
order by c.naam, l.rol;

--  Verwacht: fc Harlingen met drie leden (eigenaar, trainer, kijker),
--  de andere drie clubs met één eigenaar. Totaal 6 leden.

-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  Wil je staging weer exact productiegelijk maken, haal dan alleen
--  deze twee lidmaatschappen weg:
--
--    select public._eis_staging();
--    delete from public.leden
--    where rol in ('kijker','trainer')
--      and naam like '%(staging)';
--
--  De accounts zelf blijven bestaan in Authentication; die mag je
--  laten staan.
-- ══════════════════════════════════════════════════════════════
