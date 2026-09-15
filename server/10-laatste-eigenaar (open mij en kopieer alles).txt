-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — de laatste eigenaar kan de club niet meer stranden
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná 01-schema.sql, 04-leden-fix.sql, 06-pakketten.sql
--  en 08-bewaartermijn.sql. Plak dit hele bestand in de SQL Editor
--  van Supabase en klik op Run. Het duurt een seconde.
--
--  Er worden GEEN gegevens aangepast, toegevoegd of verwijderd.
--  Alleen een regel en twee functies gaan op de schop.
--
--  WAT ER MIS IS
--  De regel die bepaalt wie een lid mag weghalen luidt nu:
--
--      gebruiker_id = auth.uid() or public.is_eigenaar(club_id)
--
--  De eerste helft betekent: je mag jezelf uit een vereniging
--  halen. Dat hoort ook zo — een trainer die stopt moet weg kunnen.
--
--  Maar er zit geen rem op de láátste eigenaar. Haalt die zichzelf
--  weg, dan staat er een vereniging zonder eigenaar. En omdat het
--  opheffen van een vereniging (uit 08-bewaartermijn.sql) juist een
--  eigenaar eist, kan niemand hem daarna nog opruimen: niet de
--  trainers die er nog in zitten, niet jij vanuit de app. De club
--  blijft staan met al zijn teams, spelers en gegevens erin, en
--  telt bovendien mee voor de grens van drie verenigingen per
--  persoon. Een weesclub die vastzit.
--
--  Dit is geen theorie: de verenigingen in productie hebben op dit
--  moment allemaal precies één eigenaar. Eén verkeerde klik is
--  genoeg.
--
--  WAT DIT BESTAND DOET
--  1. Het zet er een hulpfunctie is_laatste_eigenaar() naast, in
--     dezelfde stijl als is_eigenaar(): hij stelt de vraag buiten
--     de regels om, zodat de regel op leden niet in zijn eigen
--     tabel hoeft te kijken. (Dat laatste is wat in september de
--     melding "infinite recursion" opleverde; zie 04-leden-fix.sql.)
--  2. Het vervangt de regel leden_weghalen door een versie die de
--     laatste eigenaar tegenhoudt.
--  3. Het zet een functie verlaat_club() klaar. Die is er om één
--     reden: een geweigerde verwijdering levert vanuit de database
--     géén foutmelding op, maar "0 rijen verwijderd". De app zou
--     dus "gelukt" melden terwijl er niets gebeurde — precies de
--     val waar het opheffen van een vereniging eerder in liep.
--     verlaat_club() zegt in gewone taal wát er aan de hand is en
--     wat je eraan kunt doen.
--
--  WAT ER VOOR JOU VERANDERT
--  Ben je de laatste eigenaar van een vereniging en wil je eruit,
--  dan kan dat niet meer rechtstreeks. Dat is de bedoeling: er zijn
--  twee wegen, en allebei zijn ze beter dan een vastgelopen club.
--    · Maak eerst iemand anders eigenaar en stap daarna zelf uit.
--    · Of hef de hele vereniging op (Instellingen; dat gooit teams
--      en gegevens mee weg en is niet terug te draaien).
--  Een beheerder houdt zijn eigen weg: verwijder_account() uit
--  03-beheer.sql gaat langs de regels heen en ruimt de vereniging
--  van een laatste eigenaar netjes mee op. Dat blijft werken.
--
--  WAT JE DAARNA HOORT TE ZIEN
--  Twee tabellen.
--    · De eerste heeft zes regels. In de kolom "oordeel" hoort
--      overal "in orde" te staan en nergens "LET OP".
--    · De tweede is een lijstje van je verenigingen met het aantal
--      eigenaren erbij. Dat lijstje kijkt alleen; er verandert
--      niets. Staat er bij een vereniging "1", dan kan die ene
--      persoon er vanaf nu niet meer in zijn eentje uitstappen.
--
--  Wil je zeker weten dat het klopt: plak daarna ook
--  tests/leden-policy.test.sql. Die probeert nu twaalf dingen uit
--  (waarvan er vijf móéten mislukken) en ruimt zichzelf weer op.
--
--  TERUGDRAAIEN
--  Helemaal onderaan staat de oude situatie klaar, met streepjes
--  ervoor. Haal die weg en draai alleen dat stuk; dan is alles weer
--  als vóór dit bestand — inclusief het gat.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 1 — DE HULPFUNCTIE
-- ══════════════════════════════════════════════════════════════

-- Is deze persoon de énige eigenaar van deze vereniging?
--
-- Twee vragen in één, en de volgorde is niet willekeurig: eerst of
-- hij überhaupt eigenaar is, dan pas of er nog een tweede eigenaar
-- naast hem staat. Is hij trainer of kijker, dan is het antwoord
-- meteen onwaar en verandert er voor hem dus niets.
--
-- Waarom een aparte functie en geen subquery in de regel zelf: een
-- regel óp leden die ín leden kijkt laat Postgres vastlopen met
-- "infinite recursion detected in policy for relation leden". Dat
-- heeft hier maanden ongemerkt gestaan. security definer verbreekt
-- die kring — binnen de functie gelden de regels op leden niet.
-- Dezelfde reden, dezelfde vorm als mijn_clubs(), mag_schrijven()
-- en is_eigenaar(). Eén manier om deze vraag te stellen, zodat er
-- nooit twee antwoorden kunnen ontstaan.
--
-- De functie geeft alleen waar of onwaar terug en toont dus geen
-- gegevens van een vereniging waar je niet bij hoort.
create or replace function public.is_laatste_eigenaar(doel_club uuid, doel_gebruiker uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
      select 1 from public.leden
      where club_id = doel_club
        and gebruiker_id = doel_gebruiker
        and rol = 'eigenaar'
    )
    and not exists (
      select 1 from public.leden
      where club_id = doel_club
        and rol = 'eigenaar'
        and gebruiker_id <> doel_gebruiker
    )
$$;

grant execute on function public.is_laatste_eigenaar(uuid, uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════
--  DEEL 2 — DE REGEL VERVANGEN
-- ══════════════════════════════════════════════════════════════

-- Wie mag een lid weghalen: jijzelf (je mag een vereniging
-- verlaten) of de eigenaar van die vereniging. Maar nooit de
-- laatste eigenaar, door wie dan ook — ook niet door hemzelf.
--
-- Let op de haakjes. De rem staat buiten het "of", zodat hij voor
-- beide takken geldt. Zou hij alleen achter de tweede tak staan,
-- dan kon de laatste eigenaar zichzelf nog steeds weghalen en was
-- er niets opgelost.
drop policy if exists leden_weghalen on public.leden;
create policy leden_weghalen on public.leden for delete
  using (
    (gebruiker_id = auth.uid() or public.is_eigenaar(club_id))
    and not public.is_laatste_eigenaar(club_id, gebruiker_id)
  );


-- ══════════════════════════════════════════════════════════════
--  DEEL 3 — EEN VERENIGING VERLATEN, MÉT UITLEG ALS HET NIET KAN
-- ══════════════════════════════════════════════════════════════

-- Aanroepen doe je zo (ook vanuit de app, als rpc):
--
--     select public.verlaat_club('11111111-1111-1111-1111-111111111111');
--
-- Waarom deze functie bestaat: een regel die een verwijdering
-- tegenhoudt geeft geen foutmelding. De database meldt doodleuk
-- "0 rijen verwijderd" en de app denkt dat het gelukt is. Dat is
-- precies de val waar het opheffen van een vereniging in liep
-- voordat 08-bewaartermijn.sql er was. Deze functie kijkt daarom
-- eerst zelf, en zegt hardop wat er aan de hand is.
--
-- Deze functie is met opzet GEEN security definer. Hij mag dus
-- niets meer dan jij zelf mag: de verwijdering gaat gewoon langs de
-- regel hierboven. De functie is er alleen voor de uitleg, niet
-- voor extra rechten. Een tweede slot dat per ongeluk openstaat is
-- gevaarlijker dan geen tweede slot.
create or replace function public.verlaat_club(doel_club uuid)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_naam   text;
  v_geraakt int;
begin
  if auth.uid() is null then
    raise exception 'Je bent niet ingelogd.';
  end if;

  select c.naam into v_naam from public.clubs c where c.id = doel_club;
  v_naam := coalesce(v_naam, 'deze vereniging');

  if not exists (select 1 from public.leden l
                 where l.club_id = doel_club and l.gebruiker_id = auth.uid()) then
    raise exception 'Je bent geen lid van deze vereniging.';
  end if;

  if public.is_laatste_eigenaar(doel_club, auth.uid()) then
    raise exception 'Je bent de laatste eigenaar van %. Een vereniging zonder eigenaar kan niemand meer beheren of opheffen, ook jij niet. Maak daarom eerst iemand anders eigenaar, of hef de vereniging helemaal op. Daarna kun je hier weg.', v_naam;
  end if;

  delete from public.leden
   where club_id = doel_club and gebruiker_id = auth.uid();
  get diagnostics v_geraakt = row_count;

  -- Vangnet: komen we hier toch met 0 rijen, dan houdt een regel de
  -- verwijdering tegen om een reden die deze functie niet kent. Dan
  -- liever een eerlijke fout dan een stil "gelukt".
  if v_geraakt = 0 then
    raise exception 'Het verlaten van % is door de database geweigerd.', v_naam;
  end if;

  return 'Je bent geen lid meer van ' || v_naam || '.';
end $$;

grant execute on function public.verlaat_club(uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is alles goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  Hieronder komt een tabel met zes regels terug. In de kolom
--  "oordeel" hoort overal "in orde" te staan. Staat er ergens
--  "LET OP", draai dit bestand dan nog een keer; twee keer draaien
--  kan geen kwaad.
-- ══════════════════════════════════════════════════════════════
with regel as (
  select pg_get_expr(polqual, polrelid) as tekst
  from pg_policy
  where polrelid = 'public.leden'::regclass and polcmd = 'd'
  limit 1
),
fn as (
  select p.proname, p.prosecdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select 'leden: er is een regel voor weghalen' as controle,
       coalesce((select 'ja' from regel), 'nee') as gevonden,
       case when exists (select 1 from regel) then 'in orde' else 'LET OP' end as oordeel
union all
select 'die regel houdt de laatste eigenaar tegen',
       case when (select tekst from regel) like '%is_laatste_eigenaar%' then 'ja' else 'nee' end,
       case when (select tekst from regel) like '%is_laatste_eigenaar%' then 'in orde' else 'LET OP' end
union all
select 'jezelf terugtrekken kan nog steeds',
       case when (select tekst from regel) like '%uid()%' then 'ja' else 'nee' end,
       case when (select tekst from regel) like '%uid()%' then 'in orde' else 'LET OP' end
union all
select 'de hulpfunctie is_laatste_eigenaar bestaat',
       case when exists (select 1 from fn where proname = 'is_laatste_eigenaar') then 'ja' else 'nee' end,
       case when exists (select 1 from fn where proname = 'is_laatste_eigenaar') then 'in orde' else 'LET OP' end
union all
select 'die hulpfunctie is security definer',
       case when exists (select 1 from fn where proname = 'is_laatste_eigenaar' and prosecdef) then 'ja' else 'nee' end,
       case when exists (select 1 from fn where proname = 'is_laatste_eigenaar' and prosecdef) then 'in orde' else 'LET OP' end
union all
select 'verlaat_club() staat klaar voor de app',
       case when exists (select 1 from fn where proname = 'verlaat_club') then 'ja' else 'nee' end,
       case when exists (select 1 from fn where proname = 'verlaat_club') then 'in orde' else 'LET OP' end
order by 1;


-- ══════════════════════════════════════════════════════════════
--  KIJKEN — hoeveel eigenaren heeft elke vereniging?
--  ─────────────────────────────────────────────────────────────
--  Dit verandert niets. Het laat alleen zien wie er vanaf nu
--  vastzit aan zijn vereniging zolang hij de enige eigenaar is.
--
--  Staat er ergens 0 in de kolom "eigenaren", dan is dat een
--  weesclub uit de oude situatie. Die kun je met het onderste stuk
--  van 08-bewaartermijn.sql opruimen (in de SQL Editor; via de app
--  lukt het niet, want daar is een eigenaar voor nodig).
-- ══════════════════════════════════════════════════════════════
select c.naam                                            as vereniging,
       to_char(c.gemaakt_op, 'DD-MM-YYYY') as aangemaakt,
       (select count(*) from public.leden l
        where l.club_id = c.id and l.rol = 'eigenaar')   as eigenaren,
       (select count(*) from public.leden l
        where l.club_id = c.id)                          as leden_totaal,
       case (select count(*) from public.leden l
             where l.club_id = c.id and l.rol = 'eigenaar')
         when 0 then 'weesclub: niemand kan hier nog bij'
         when 1 then 'die ene eigenaar kan er niet alleen uitstappen'
         else 'in orde'
       end                                               as opmerking
from public.clubs c
order by 3, c.naam;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Haal bij de regels hieronder de twee streepjes vooraan weg,
--  selecteer alleen dat stuk met je muis en klik op Run. Supabase
--  draait dan alleen wat je hebt geselecteerd.
--
--  Daarna is het weer als vóór dit bestand: de laatste eigenaar kan
--  zichzelf weghalen en laat dan een vereniging achter waar niemand
--  meer bij kan. Doe dit dus alleen om te kunnen bewijzen dat deze
--  reparatie echt iets doet — zet hem daarna meteen terug door dit
--  hele bestand opnieuw te draaien.
--
--  Al ontstane weesclubs komen hier niet van terug.
-- ══════════════════════════════════════════════════════════════

-- drop policy if exists leden_weghalen on public.leden;
-- create policy leden_weghalen on public.leden for delete
--   using (gebruiker_id = auth.uid() or public.is_eigenaar(club_id));
--
-- drop function if exists public.verlaat_club(uuid);
--
-- De hulpfunctie mag blijven staan, die doet uit zichzelf niets.
-- Wil je hem toch weg (dit lukt pas als de regel hierboven al
-- vervangen is, want zolang de regel hem gebruikt weigert Postgres):
-- drop function if exists public.is_laatste_eigenaar(uuid, uuid);
