-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — een speler écht wissen, en een vereniging opheffen
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná 01-schema.sql, 04-leden-fix.sql en 06-pakketten.sql.
--  Plak dit hele bestand in de SQL Editor van Supabase en klik op
--  Run. Het duurt een seconde en er worden geen gegevens gewist:
--  dit bestand zet alleen twee dingen klaar.
--
--  WAAROM DIT ER MOET ZIJN
--
--  1. "Verwijder mijn zoon uit de app." Dat is de vraag die een
--     ouder een keer stelt, en het antwoord is vandaag "eigenlijk
--     niet". De spelerslijst staat namelijk meerdere keren in de
--     database, één keer per seizoen. In de back-up van 10 september
--     staan dezelfde achttien personen vier keer: als
--     fch_spelers_v1, als 2025-2026::fch_spelers_v1 en als
--     2026-2027::fch_spelers_v1. De knop in de app haalt er precies
--     één weg. In de andere drie blijft alles staan — naam,
--     geboortedatum, telefoonnummer, en bij sommigen een
--     blessurenotitie. Vijftien van die achttien zijn minderjarig.
--     Bovendien bewaart de wedstrijdanalyse (fch_events_v1) de naam
--     nóg een keer, los van de spelerslijst.
--
--  2. Een vereniging kon niet worden opgeheven. Er stond geen enkele
--     regel voor "delete" op clubs, en dan gooit de database er nul
--     weg — terwijl de app een keurig "gelukt" terugkrijgt. Daardoor
--     staan er nu twee lege verenigingen in je beheerscherm, allebei
--     "Mijn club" met 0 teams, aangemaakt door de verbindingstest.
--     Dat is nu vervelend geworden, want sinds 06-pakketten.sql mag
--     één persoon hoogstens drie verenigingen hebben en jij zit met
--     die twee lege al aan die grens.
--
--  WAT JE DAARNA HOORT TE ZIEN
--  Een tabel met zes regels. In de kolom "oordeel" hoort overal
--  "in orde" te staan en nergens "LET OP". Daaronder komt nog een
--  tweede tabel: het lijstje lege verenigingen. Dat lijstje kijkt
--  alleen, het gooit niets weg.
--
--  HET OPRUIMEN ZELF staat helemaal onderaan, met streepjes ervoor
--  zodat het niet vanzelf meedraait. Eerst kijken, dan pas weggooien.
--
--  TERUGDRAAIEN
--  Onderaan, ook met streepjes ervoor. Haal die weg en draai alleen
--  dat stuk, dan is alles weer als vóór dit bestand.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 1 — EEN SPELER UIT ALLE SEIZOENSLAGEN WISSEN
-- ══════════════════════════════════════════════════════════════

-- Aanroepen doe je zo (ook vanuit de app, als rpc):
--
--     select public.wis_speler('team-abc', '1717171717171');
--
-- Het tweede getal is de id van de speler zoals die in de
-- spelerslijst staat. De functie geeft een klein overzichtje terug
-- van wat er is gebeurd.
--
--
-- WAT ER WEGGAAT, EN WAT NIET — de afweging, want die is niet
-- vanzelfsprekend:
--
--   · Alles wat over de PERSOON gaat, gaat weg. Dus de hele regel
--     van die speler uit élke spelerslijst van dit team: naam,
--     geboortedatum, adres, telefoon, e-mail, foto en de notitie
--     over zijn blessure. Niet alleen uit het huidige seizoen maar
--     uit alle lagen, ook uit de oude van vorig seizoen.
--
--   · Alles wat over de WEDSTRIJD gaat, blijft staan, maar zonder
--     naam. Een doelpunt in de 63e minuut blijft een doelpunt in de
--     63e minuut; alleen staat er niet meer bij wie het maakte.
--
--     De verleiding is om die doelpunten ook maar weg te gooien,
--     dat is één regel minder. Maar dan klopt de uitslag 3-1 niet
--     meer met de drie doelpunten eronder, en dan is de clubhistorie
--     vervalst om een reden die niets met die historie te maken
--     heeft. Andersom de naam laten staan is geen optie: dan is er
--     niets gewist. Dus: de gebeurtenis blijft, de persoon
--     verdwijnt. In de app staat er voortaan "Onbekend" bij — dat
--     woord kende de app al, er hoeft dus niets aangepast te worden.
--
--     Er wordt bewust ook geen nummertje achtergelaten ("speler
--     zeven"). Zodra twee gewiste spelers uit elkaar te houden zijn,
--     is het geen wissen meer maar verhullen, en dat is iets anders.
--
--   · Wat deze functie NIET opruimt: de naam staat óók in de
--     wedstrijden zelf (fch_wedstrijden_v1 bewaart de opstelling,
--     de scorers en de kaarten mét naam), in de aanwezigheid bij
--     trainingen, en mogelijk in de boetepot. Dat kan deze functie
--     niet netjes doen zolang die gegevens als één blok tekst in de
--     database zitten: er is geen enkel verband tussen een speler en
--     zijn doelpunten dat de database kent.
--
--     Daarom liegt de functie daar niet over, maar telt hij het:
--     in het antwoord staat onder "naam_nog_zichtbaar_in" een
--     lijstje van de onderdelen waar de naam nog letterlijk in staat.
--     Is dat lijstje leeg, dan is de speler echt weg. Is het niet
--     leeg, dan weet je precies hoeveel werk er nog ligt. Dat is de
--     eerlijke tussenstand tot de gegevens genormaliseerd zijn.
--
-- EN DAARNA?
-- De gewijzigde onderdelen krijgen automatisch een nieuwe datum in
-- bijgewerkt_op. Elk apparaat dat daarna synchroniseert ziet dus dat
-- de server nieuwer is en haalt de opgeschoonde lijst op. Let wel:
-- op een telefoon die daarna nooit meer inlogt blijft de oude lijst
-- in de browser staan. Daar kan geen enkele server iets aan doen.
--
-- WAAROM security definer
-- Zonder dat zou de functie de leesregels op gegevens moeten
-- doorlopen en zou een geblokkeerde laag stilletjes blijven staan —
-- precies het probleem dat we oplossen. Nu kijkt de functie zelf
-- eerst of je mag schrijven bij deze vereniging, met dezelfde
-- functie mag_schrijven() die alle beveiligingsregels gebruiken, en
-- weigert hij hardop als dat niet zo is.
create or replace function public.wis_speler(p_team_id text, p_speler_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club    uuid;
  v_naam    text;
  v_gevond  int;
  v_lagen   int := 0;
  v_events  int := 0;
  v_erijen  int := 0;
  v_sporen  text[] := '{}';
begin
  select t.club_id into v_club from public.teams t where t.id = p_team_id;
  if v_club is null then
    raise exception 'Onbekend team: %', p_team_id;
  end if;

  if not public.mag_schrijven(v_club) then
    raise exception 'Je mag niets wijzigen bij dit team.';
  end if;

  -- Eerst opzoeken hoe de speler heet. Dat moet vóór het wissen,
  -- want daarna is die naam nergens meer te vinden — en we hebben
  -- hem nodig om dezelfde naam ook uit de wedstrijdanalyse te halen
  -- en om achteraf te kunnen tellen waar hij nog staat.
  select count(*), max(e->>'naam')
    into v_gevond, v_naam
  from public.gegevens g,
       lateral jsonb_array_elements(g.waarde) e
  where g.team_id = p_team_id
    and public.basis_van_sleutel(g.sleutel) = 'fch_spelers_v1'
    and jsonb_typeof(g.waarde) = 'array'
    and e->>'id' = p_speler_id;

  -- Niets gevonden is een fout en geen stilte. Een functie die
  -- "gelukt" zegt terwijl hij nul rijen raakte, is precies hoe dit
  -- probleem maanden onzichtbaar kon blijven.
  if v_gevond = 0 then
    raise exception
      'Speler % staat niet in de spelerslijst van team % (verkeerde id, of al gewist).',
      p_speler_id, p_team_id;
  end if;

  -- ── De speler uit élke seizoenslaag halen ──────────────────
  -- basis_van_sleutel() gooit het voorvoegsel "2025-2026::" weg, dus
  -- deze ene opdracht raakt fch_spelers_v1 én alle seizoensvarianten.
  update public.gegevens g
  set waarde = (
        select coalesce(jsonb_agg(e order by ord), '[]'::jsonb)
        from jsonb_array_elements(g.waarde) with ordinality t(e, ord)
        where e->>'id' is distinct from p_speler_id)
  where g.team_id = p_team_id
    and public.basis_van_sleutel(g.sleutel) = 'fch_spelers_v1'
    and jsonb_typeof(g.waarde) = 'array'
    and exists (select 1 from jsonb_array_elements(g.waarde) e
                where e->>'id' = p_speler_id);
  get diagnostics v_lagen = row_count;

  -- ── De naam uit de wedstrijdanalyse halen ──────────────────
  -- Zowel op id als op naam zoeken: er staan gebeurtenissen in die
  -- wél een naam hebben maar geen id (bij een handmatige invoer),
  -- en die zou een zoektocht op id alleen laten staan.
  select count(*) into v_events
  from public.gegevens g,
       lateral jsonb_array_elements(g.waarde) e
  where g.team_id = p_team_id
    and public.basis_van_sleutel(g.sleutel) = 'fch_events_v1'
    and jsonb_typeof(g.waarde) = 'array'
    and (e->>'spelerId' = p_speler_id
         or (v_naam is not null and e->>'spelerNaam' = v_naam));

  update public.gegevens g
  set waarde = (
        select coalesce(jsonb_agg(
                 case when e->>'spelerId' = p_speler_id
                        or (v_naam is not null and e->>'spelerNaam' = v_naam)
                      then e - 'spelerNaam' - 'spelerId'
                      else e end
                 order by ord), '[]'::jsonb)
        from jsonb_array_elements(g.waarde) with ordinality t(e, ord))
  where g.team_id = p_team_id
    and public.basis_van_sleutel(g.sleutel) = 'fch_events_v1'
    and jsonb_typeof(g.waarde) = 'array'
    and exists (select 1 from jsonb_array_elements(g.waarde) e
                where e->>'spelerId' = p_speler_id
                   or (v_naam is not null and e->>'spelerNaam' = v_naam));
  get diagnostics v_erijen = row_count;

  -- ── De eerlijke tussenstand: waar staat de naam nog? ───────
  -- Gewoon zoeken naar de letters van de naam in de tekst van elk
  -- onderdeel van dit team. Grof, maar het liegt niet. Namen korter
  -- dan drie letters slaan we over, die geven vals alarm.
  if v_naam is not null and length(trim(v_naam)) >= 3 then
    select coalesce(array_agg(g.sleutel order by g.sleutel), '{}')
      into v_sporen
    from public.gegevens g
    where g.team_id = p_team_id
      and position(v_naam in g.waarde::text) > 0;
  end if;

  -- De naam zelf staat met opzet NIET in het antwoord. Anders zet je
  -- de naam die je zojuist hebt gewist alsnog in de logboeken van de
  -- server.
  return jsonb_build_object(
    'team_id',                p_team_id,
    'speler_id',              p_speler_id,
    'lagen_opgeschoond',      v_lagen,
    'gebeurtenissen_ontdaan', v_events,
    'analyse_rijen_geraakt',  v_erijen,
    'naam_nog_zichtbaar_in',  to_jsonb(v_sporen));
end $$;

grant execute on function public.wis_speler(text, text) to authenticated;

comment on function public.wis_speler(text, text) is
  'Haalt een speler uit alle seizoenslagen van fch_spelers_v1 en maakt zijn naam in fch_events_v1 onherkenbaar. Wedstrijdgebeurtenissen blijven staan, zonder naam.';


-- ══════════════════════════════════════════════════════════════
--  DEEL 2 — EEN VERENIGING KUNNEN OPHEFFEN
-- ══════════════════════════════════════════════════════════════

-- Er stond geen enkele regel voor "delete" op clubs. Staat die er
-- niet, dan weigert de database niet met een foutmelding maar gooit
-- hij er domweg nul weg, en geeft PostgREST daar een 204 ("gelukt,
-- niets terug te melden") op terug. De app denkt dus dat het gelukt
-- is. Dat is de vervelendste soort fout: eentje die zich voordoet
-- als succes.
--
-- Alleen de eigenaar mag het, via dezelfde is_eigenaar() die de
-- regels op leden ook gebruiken. Een trainer mag gegevens wijzigen,
-- maar niet de hele vereniging opheffen.
--
-- DIT IS ONOMKEERBAAR, EN HET NEEMT MEER MEE DAN JE DENKT. Bij het
-- verwijderen van één club verdwijnt in één keer:
--
--   · de club zelf (naam, logo)
--   · alle leden van die club — dus ook de andere trainers; hun
--     account blijft bestaan, alleen hun plek in deze club niet
--   · alle teams van die club, ook de teams die al in de prullenbak
--     stonden
--   · ALLE gegevens van al die teams: spelers, wedstrijden,
--     trainingen, opstellingen, tactieken, boetes, het sportpark —
--     alles wat onder die teams hangt
--   · het abonnement van die club
--
-- Dat komt door "on delete cascade" bij de tabellen die naar clubs
-- verwijzen: de database ruimt die rijen zelf mee op, en gaat daarbij
-- niet nog eens langs de beveiligingsregels. Er is geen prullenbak
-- en geen ongedaan maken. De enige weg terug is een back-up.
drop policy if exists clubs_weghalen on public.clubs;
create policy clubs_weghalen on public.clubs for delete
  using (public.is_eigenaar(id));


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is alles goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  Hieronder komt een tabel terug. In de kolom "oordeel" hoort
--  overal "in orde" te staan. Staat er ergens "LET OP", draai dit
--  bestand dan nog een keer; twee keer draaien kan geen kwaad.
-- ══════════════════════════════════════════════════════════════
select 'clubs: er is nu een regel voor weggooien' as controle,
       coalesce((select string_agg(polname, ', ') from pg_policy
                 where polrelid = 'public.clubs'::regclass and polcmd = 'd'),
                'geen') as gevonden,
       case when exists (select 1 from pg_policy
                         where polrelid = 'public.clubs'::regclass and polcmd = 'd')
            then 'in orde' else 'LET OP' end as oordeel
union all
select 'die regel vraagt het aan is_eigenaar()',
       case when (select pg_get_expr(polqual, polrelid) from pg_policy
                  where polrelid = 'public.clubs'::regclass and polcmd = 'd' limit 1)
                 like '%is_eigenaar%' then 'ja' else 'nee' end,
       case when (select pg_get_expr(polqual, polrelid) from pg_policy
                  where polrelid = 'public.clubs'::regclass and polcmd = 'd' limit 1)
                 like '%is_eigenaar%' then 'in orde' else 'LET OP' end
union all
select 'clubs: nog steeds geen regel voor aanmaken',
       coalesce((select string_agg(polname, ', ') from pg_policy
                 where polrelid = 'public.clubs'::regclass and polcmd = 'a'),
                'geen'),
       case when not exists (select 1 from pg_policy
                             where polrelid = 'public.clubs'::regclass and polcmd = 'a')
            then 'in orde' else 'LET OP' end
union all
select 'de functie wis_speler bestaat',
       coalesce((select 'ja' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'wis_speler' limit 1), 'nee'),
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and p.proname = 'wis_speler')
            then 'in orde' else 'LET OP' end
union all
select 'wis_speler pakt alle seizoenslagen',
       case when (select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'wis_speler' limit 1)
                 like '%basis_van_sleutel%' then 'ja' else 'nee' end,
       case when (select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'wis_speler' limit 1)
                 like '%basis_van_sleutel%' then 'in orde' else 'LET OP' end
union all
select 'hoeveel spelerslagen staan er nu in de database',
       (select count(*)::text from public.gegevens
        where public.basis_van_sleutel(sleutel) = 'fch_spelers_v1'),
       'in orde'
order by 1;


-- ══════════════════════════════════════════════════════════════
--  KIJKEN — welke verenigingen zijn leeg?
--  ─────────────────────────────────────────────────────────────
--  Dit gooit NIETS weg. Je krijgt een lijstje met verenigingen
--  zonder ook maar één team (en dus zonder gegevens, want gegevens
--  hangen aan teams). Dat zijn de weesclubs die de verbindingstest
--  heeft achtergelaten.
--
--  Kijk bij elke regel naar de kolom "eigenaar": weggooien doe je
--  alleen bij je eigen verenigingen. Staat er iemand anders bij, laat
--  hem dan staan — die persoon is misschien net begonnen.
-- ══════════════════════════════════════════════════════════════
select c.id,
       c.naam,
       to_char(c.gemaakt_op, 'DD-MM-YYYY HH24:MI') as aangemaakt,
       coalesce((select string_agg(u.email, ', ')
                 from public.leden l join auth.users u on u.id = l.gebruiker_id
                 where l.club_id = c.id and l.rol = 'eigenaar'), '(geen eigenaar)') as eigenaar,
       (select count(*) from public.teams t where t.club_id = c.id)     as teams,
       (select count(*) from public.gegevens g
        join public.teams t on t.id = g.team_id where t.club_id = c.id) as onderdelen
from public.clubs c
where not exists (select 1 from public.teams t where t.club_id = c.id)
order by c.gemaakt_op;


-- ══════════════════════════════════════════════════════════════
--  WEGGOOIEN — apart draaien, pas nadat je hierboven gekeken hebt
--  ─────────────────────────────────────────────────────────────
--  Haal bij de twee regels hieronder de streepjes weg, selecteer
--  alleen die twee regels met je muis en klik op Run. Supabase draait
--  dan alleen wat je hebt geselecteerd.
--
--  Er hoort te komen te staan hoeveel rijen zijn verwijderd. Dat
--  getal hoort gelijk te zijn aan het aantal regels dat je hierboven
--  zag staan. Daarna kun je de lijst hierboven nog eens draaien; die
--  hoort dan leeg te zijn.
--
--  Veiliger variant: vervang de where-regel door de id's die je
--  hierboven zag, bijvoorbeeld
--      where id in ('11111111-....', '22222222-....');
--  Dan gooi je gegarandeerd alleen die twee weg en kan er niets
--  tussendoor glippen dat net door iemand anders is aangemaakt.
-- ══════════════════════════════════════════════════════════════

-- delete from public.clubs c
-- where not exists (select 1 from public.teams t where t.club_id = c.id);


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Haal de streepjes weg en draai alleen dit stuk. Daarna is het
--  weer als vóór dit bestand: een vereniging is niet op te heffen
--  (de app krijgt dan weer een "gelukt" te zien terwijl er niets
--  gebeurt) en een speler wissen raakt alleen de laag waar de app
--  toevallig in kijkt. Al gewiste spelers komen hier niet van terug.
-- ══════════════════════════════════════════════════════════════

-- drop policy if exists clubs_weghalen on public.clubs;
-- drop function if exists public.wis_speler(text, text);
