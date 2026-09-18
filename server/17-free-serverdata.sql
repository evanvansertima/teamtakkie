-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — Free komt niet meer op de server
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná 01-schema.sql, 03-beheer.sql en 06-pakketten.sql.
--  Dit bestand leunt op mag_schrijven() (01), op pakket_van_club()
--  (06) en op de tabel abonnementen (01). Plak het hele bestand in
--  de SQL Editor van Supabase en klik op Run. Onderaan staat een
--  controleblok; daar hoort overal "in orde" te staan. Twee keer
--  draaien kan geen kwaad.
--
--  Onderaan staan twee losse uitslagen: het controleblok en daarna
--  een overzicht van welke vereniging hier iets van merkt. De SQL
--  Editor toont er maar één tegelijk (de laatste). Wil je de andere
--  zien, selecteer dan alleen dat ene blok — van "select" tot en met
--  de puntkomma — en klik op Run. Beide blokken veranderen niets en
--  mogen zo vaak gedraaid worden als je wilt.
--
--  WAAROM DIT ER MOET ZIJN
--  docs/pakketten-besluit.md (11 september 2026, besluit van Evan)
--  zegt het in vijf woorden: "Free komt helemaal niet op de server."
--  Dat is niet zomaar een verkoopgrens — het is de dráágbalk onder
--  het hele besluit. In datzelfde document staat namelijk dat
--  statistieken en live-analyse bewust NIET zijn afgeschermd, met
--  als argument: een Free-gebruiker ziet toch alleen zijn eigen
--  gegevens op zijn eigen telefoon, en dat kost niets.
--
--  Op de server stond die grens nergens. De regels gegevens_schrijven
--  en gegevens_wijzigen (01-schema.sql regel 263-273) kijken alleen
--  naar mag_schrijven(): ben je lid van de vereniging, en ben je
--  eigenaar of trainer? Naar het pakket kijken ze niet. Wie een
--  gratis account maakte en buiten de app om een verzoek naar
--  Supabase stuurde, schreef dus gewoon weg alsof hij betaalde. De
--  app vroeg netjes om toestemming; de database vroeg niets.
--
--  Dit bestand raakt ALLEEN public.gegevens. Dat is de tabel waar
--  letterlijk alle domeingegevens in staan (spelers, wedstrijden,
--  trainingen, aanwezigheid — allemaal als JSON in de kolom waarde).
--  Twee tabellen blijven met opzet ongemoeid:
--    · teams        — al beperkt tot één rij voor Free door de
--                     bestaande teamlimiet in 06-pakketten.sql, en
--                     er staat geen speler- of wedstrijddata in.
--    · persoonlijk  — die hangt aan de gebruiker, niet aan een
--                     vereniging. Iemand kan bij meerdere clubs met
--                     verschillende pakketten horen, dus "welk pakket
--                     geldt hier" heeft daar geen eenduidig antwoord.
--
--  WAT ER NIET VERANDERT: LEZEN EN VERWIJDEREN
--  gegevens_lezen en gegevens_weghalen worden hier niet aangeraakt.
--  Wat al op de server staat, blijft zichtbaar, en wie zijn gegevens
--  van de server wil halen moet dat altijd kunnen — dat laatste is
--  ook een AVG-kant: een verlopen abonnement mag nooit de reden zijn
--  waarom je je eigen spelersgegevens niet meer kunt wissen. Alleen
--  NIEUWE data op de server zetten wordt hier geraakt.
--
--  DE VALKUIL: "OOIT BETAALD" IS IETS ANDERS DAN "BETAALT NU"
--  De voor de hand liggende reparatie — weiger iedereen die volgens
--  pakket_van_club() op 'free' staat — is fout, en dat is geen
--  theoretisch bezwaar.
--
--  pakket_van_club() geeft namelijk óók 'free' terug voor een
--  vereniging die WEL heeft betaald maar wiens abonnement is
--  verlopen: een mislukte incasso, een vergeten overschrijving, een
--  bankpas die is vervangen. Na de respijtperiode van veertien dagen
--  (pakket_instellingen) staat zo'n echte klant er precies zo bij als
--  iemand die nooit een cent heeft betaald.
--
--  Dat er dan niet meteen een deur dichtslaat, is al eerder bewust
--  besloten: teamlimiet_bewaken() in server/06-pakketten.sql (regel
--  294-299) laat zo'n vereniging uitdrukkelijk doorwerken met wat hij
--  al had — alleen een nieuw team erbij lukt niet meer. Zou de nieuwe
--  regel hier alleen naar pakket_van_club() kijken, dan zou dezelfde
--  vereniging bij de eerste mislukte incasso ineens niets meer kunnen
--  opslaan. Dat is geen dichtgezet lek maar een buitengesloten
--  betalende klant, en dat is het duurdere van de twee.
--
--  Daarom komt er een merkteken bij: abonnementen.ooit_betaald. Dat
--  zegt niet "deze club betaalt nu" maar "deze club is ooit klant
--  geweest", en dat wordt nooit meer onwaar. De regel wordt dus:
--
--      schrijven mag als je mag_schrijven() hebt
--      ÉN (het pakket is nu niet free  OF  de club heeft ooit betaald)
--
--  Vastgelegd in tests/free-server-afscherming.test.sql (20
--  scenario's). Scenario 1 en 2 bewaken het lek, scenario 5 bewaakt
--  de valkuil hierboven, en scenario 3, 4, 7 en 8 bewaken dat er
--  verder niets kapot is gegaan.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 1 — HET MERKTEKEN "OOIT BETAALD"
-- ══════════════════════════════════════════════════════════════

alter table public.abonnementen
  add column if not exists ooit_betaald boolean not null default false;

comment on column public.abonnementen.ooit_betaald is
  'Is deze vereniging ooit klant geweest (coach of club)? Wordt nooit meer false. Bepaalt samen met pakket_van_club() of er naar public.gegevens geschreven mag worden — zie public.mag_serverdata_schrijven().';

-- ── Terugwerkend: geen bestaande klant vergeten ───────────────
--  Het merkteken is pas op 18 september 2026 bedacht, maar de
--  klanten bestonden al. Wie vandaag 'coach' of 'club' in de tabel
--  heeft staan, ís klant — die krijgt het merkteken alsnog. Zonder
--  deze ene regel merkt niemand iets, tótdat het eerste
--  jaarabonnement verloopt en er een betalende vereniging buiten
--  komt te staan die nooit iets verkeerd heeft gedaan.
--
--  Deze update is veilig om nog eens te draaien: hij raakt alleen
--  rijen die het merkteken nog niet hebben.
update public.abonnementen set ooit_betaald = true
  where pakket in ('coach','club') and not ooit_betaald;

-- ── Het merkteken vasthouden: een TRIGGER, geen regel in code ─
--  De verleiding is om dit in zet_pakket() (03-beheer.sql) te
--  regelen: daar wordt het pakket immers gewijzigd. Dat zou een
--  lek opleveren, en wel het lek dat vandaag het meest gebruikt
--  wordt.
--
--  De tabel abonnementen wordt namelijk óók gewoon met de hand in
--  de tabeleditor van Supabase bijgewerkt. Dat is geen aanname:
--  01-schema.sql regel 288-292 en 06-pakketten.sql regel 207-210
--  zeggen allebei letterlijk dat er met opzet geen schrijfregel op
--  die tabel staat en dat Evan het zelf in Supabase aanpast. Zet je
--  een vereniging zo op 'coach', dan komt zet_pakket() er niet aan
--  te pas en zou het merkteken nooit gezet worden — met als gevolg
--  dat die klant precies één jaar later buitengesloten wordt.
--
--  Een trigger vuurt langs elke weg naar binnen: via zet_pakket(),
--  via de tabeleditor, via een los SQL-commando. Dezelfde afweging
--  als bij teamlimiet_bewaken() in 06-pakketten.sql.
--
--  Twee dingen doet hij, en de tweede is de belangrijkste:
--    1. wordt het pakket coach of club, dan gaat het merkteken aan;
--    2. stond het merkteken al aan, dan blijft het aan — wat er ook
--       binnenkomt. Een beheerder die per ongeluk op free klikt, of
--       een latere automatische afwaardering aan het einde van een
--       seizoen, mag geen vereniging buitensluiten die al jaren
--       gegevens op de server heeft staan.
create or replace function public.ooit_betaald_vasthouden()
returns trigger language plpgsql as $$
begin
  if new.pakket in ('coach','club') then
    new.ooit_betaald := true;
  end if;
  if tg_op = 'UPDATE' and old.ooit_betaald then
    new.ooit_betaald := true;   -- nooit terug naar false
  end if;
  return new;
end $$;

comment on function public.ooit_betaald_vasthouden() is
  'Zet abonnementen.ooit_betaald op true zodra het pakket coach of club wordt, en laat het daarna nooit meer op false komen.';

drop trigger if exists abonnementen_ooit_betaald on public.abonnementen;
create trigger abonnementen_ooit_betaald
  before insert or update on public.abonnementen
  for each row execute function public.ooit_betaald_vasthouden();


-- ══════════════════════════════════════════════════════════════
--  DEEL 2 — ÉÉN FUNCTIE DIE DE VRAAG STELT
--  ─────────────────────────────────────────────────────────────
--  Net als mijn_clubs(), mag_schrijven() en pakket_van_club():
--  één functie, zodat elke beveiligingsregel dezelfde vraag stelt
--  en er nooit twee antwoorden kunnen ontstaan. De regels in DEEL 3
--  krijgen daarom geen eigen subquery op abonnementen — ze roepen
--  deze functie aan.
--
--  Let op de volgorde in de "and": mag_schrijven() staat vooraan.
--  Het bestaande slot op lidmaatschap en rol blijft dus volledig
--  overeind; de pakketvraag komt er alleen bovenop. Een kijker bij
--  een betalende vereniging mag nog steeds niets (scenario 8b/8c in
--  de test bewaakt precies dat).
--
--  WAAROM SECURITY DEFINER
--  Zonder verhoogde rechten loopt de functie vast op de leesregel
--  van abonnementen (abonnementen_lezen, 01-schema.sql regel
--  293-295) zodra hij wordt aangeroepen voor een andere vereniging
--  dan je eigen: de subquery zou dan niets vinden en het antwoord
--  zou onterecht "nooit betaald" zijn. Exact dezelfde reden als bij
--  pakket_van_club(), zie 06-pakketten.sql regel 238-240.
--
--  "stable" en niet "volatile": binnen één opdracht verandert het
--  pakket van een vereniging niet, dus Postgres mag het antwoord
--  hergebruiken. (Bij foutmeldingen_recent_aantal() in
--  16-foutrapportage.sql lag dat anders — die telt rijen die
--  diezelfde opdracht net zelf heeft weggeschreven.)
create or replace function public.mag_serverdata_schrijven(doel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.mag_schrijven(doel)
     and (public.pakket_van_club(doel) <> 'free'
          or coalesce((select a.ooit_betaald from public.abonnementen a
                       where a.club_id = doel), false))
$$;

grant execute on function public.mag_serverdata_schrijven(uuid) to authenticated;

comment on function public.mag_serverdata_schrijven(uuid) is
  'Mag deze gebruiker nieuwe gegevens van deze vereniging op de server zetten? mag_schrijven() plus de pakketgrens uit docs/pakketten-besluit.md: Free komt niet op de server, tenzij de vereniging ooit klant is geweest.';


-- ══════════════════════════════════════════════════════════════
--  DEEL 3 — DE TWEE REGELS OP public.gegevens
--  ─────────────────────────────────────────────────────────────
--  Dit zijn dezelfde twee regels als in 01-schema.sql regel 263-273,
--  met één woord verschil: mag_schrijven() wordt
--  mag_serverdata_schrijven(). De vorm eromheen (de "exists" op
--  public.teams om van team_id naar club_id te komen) blijft precies
--  zoals hij was.
--
--  Waarom hier en niet in 01-schema.sql zelf: de bestanden in deze
--  map zijn een geschiedenis, geen momentopname. 01 blijft staan
--  zoals hij was, dit bestand zet er iets overheen, en het
--  terugdraaiblok onderaan kan het weer wegnemen. Wie wil weten wat
--  er nú op de server staat, kijkt niet in 01 maar in het
--  controleblok hieronder.
--
--  LET OP, EEN VALSTRIK VOOR LATER: draai je 01-schema.sql ooit nog
--  eens opnieuw, dan zet díé de oude, pakketloze regels zonder enige
--  waarschuwing terug en staat het gat weer open. Draai dan altijd
--  dit bestand er nog een keer achteraan. Het controleblok onderaan
--  is er om dat te kunnen zién.
-- ══════════════════════════════════════════════════════════════

drop policy if exists gegevens_schrijven on public.gegevens;
create policy gegevens_schrijven on public.gegevens for insert
  with check (exists (select 1 from public.teams t
                      where t.id = gegevens.team_id
                        and public.mag_serverdata_schrijven(t.club_id)));

drop policy if exists gegevens_wijzigen on public.gegevens;
create policy gegevens_wijzigen on public.gegevens for update
  using (exists (select 1 from public.teams t
                 where t.id = gegevens.team_id
                   and public.mag_serverdata_schrijven(t.club_id)));

-- gegevens_lezen en gegevens_weghalen blijven met opzet ONGEMOEID.
-- Ze staan hier bewust niet opnieuw: er is geen "drop policy" en geen
-- "create policy" voor die twee, zodat ze precies blijven zoals
-- 01-schema.sql ze heeft neergezet. Lezen en verwijderen mogen voor
-- iedereen met mag_schrijven(), ongeacht pakket — zie de uitleg
-- bovenaan dit bestand.

-- ── WAT DE GEBRUIKER HIERVAN MERKT ────────────────────────────
--  Een geweigerde insert geeft een harde foutmelding ("new row
--  violates row-level security policy"), een geweigerde update geeft
--  GEEN fout: die raakt gewoon nul rijen en meldt succes. Dat is hoe
--  RLS in Postgres werkt en het is hier niet te veranderen.
--
--  ÉÉN DING MOET NOG AAN DE KANT VAN DE APP, VÓÓR DIT LIVE GAAT.
--  De app duwt vandaag voor iedereen omhoog: src/kern/sync.js regel
--  914 roept syncEen("gegevens", ...) aan zonder ooit naar het pakket
--  te kijken. Die duw is een upsert, en die wordt door de regel
--  hierboven hard geweigerd. De app vangt dat netjes op — de lokale
--  gegevens blijven gewoon staan, er gaat niets verloren — maar hij
--  zet de sleutel wel in uitslag.fouten, en dat is voor een
--  Free-gebruiker een rood lampje bij iets dat hij niet fout doet.
--
--  De oplossing staat al in datzelfde bestand, tien regels hoger:
--  syncEen() slaat het duwen al over voor wie alleen meekijkt, met in
--  het commentaar precies dit argument ("De database zou het toch
--  tegenhouden — daar staat het echte slot — maar dan zou de app het
--  elke keer opnieuw proberen"). Voor Free is dezelfde ingreep nodig.
--  Dat is werk aan de voorkant (Fenna), apart van dit bestand, en het
--  is geen reden om deze regels niet te zetten: dit is het vangnet
--  voor iedereen die om de app heen gaat, en dat vangnet ontbrak.


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is alles goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  Hieronder komt een tabel terug. In de kolom "oordeel" hoort
--  overal "in orde" te staan. Staat er ergens "LET OP", draai dit
--  bestand dan nog een keer; twee keer draaien kan geen kwaad.
--
--  Dit controleblok kijkt of de onderdelen er stáán. Of ze ook doen
--  wat ze moeten doen, toont tests/free-server-afscherming.test.sql
--  aan — die maakt echte verenigingen aan, probeert er echt in te
--  schrijven en draait zichzelf aan het eind terug. Die test mag ook
--  gewoon in deze SQL Editor.
--
--  EERLIJK OVER WAT DIT BLOK WEL EN NIET VANGT
--  Draai je het hele bestand, dan staat alles hierboven net opnieuw
--  neergezet en is dit blok bijna per definitie groen — het kan dan
--  alleen nog iets zeggen over de terugwerkende update (regel 2).
--  Waar het écht voor bedoeld is: later los draaien. Selecteer dan
--  alleen dit ene "select ... order by 1;" en klik op Run. Dan zie je
--  of er sindsdien iets is verschoven — bijvoorbeeld doordat iemand
--  01-schema.sql opnieuw heeft gedraaid, want dát zet de oude,
--  pakketloze regels zonder waarschuwing terug. Getest met
--  opzettelijke fouten: trigger weggehaald en de oude insert-regel
--  teruggezet, en dit blok werd op drie regels "LET OP".
-- ══════════════════════════════════════════════════════════════
select 'de kolom abonnementen.ooit_betaald bestaat' as controle,
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'abonnementen'
                           and column_name = 'ooit_betaald')
            then 'ja' else 'nee' end as gevonden,
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'abonnementen'
                           and column_name = 'ooit_betaald')
            then 'in orde' else 'LET OP' end as oordeel
union all
select 'geen betalende vereniging zonder merkteken (de terugwerkende update)',
       (select count(*)::text || ' vereniging(en) met coach/club zonder merkteken'
        from public.abonnementen where pakket in ('coach','club') and not ooit_betaald),
       case when (select count(*) from public.abonnementen
                  where pakket in ('coach','club') and not ooit_betaald) = 0
            then 'in orde' else 'LET OP' end
union all
select 'de trigger op abonnementen staat er',
       coalesce((select 'ja' from pg_trigger where tgname = 'abonnementen_ooit_betaald'
                   and tgrelid = 'public.abonnementen'::regclass limit 1), 'nee'),
       case when exists (select 1 from pg_trigger where tgname = 'abonnementen_ooit_betaald'
                           and tgrelid = 'public.abonnementen'::regclass)
            then 'in orde' else 'LET OP' end
union all
select 'de trigger vuurt bij insert én update',
       coalesce((select case when (tgtype & 4) > 0 and (tgtype & 16) > 0
                             then 'insert en update' else 'niet allebei' end
                 from pg_trigger where tgname = 'abonnementen_ooit_betaald'
                   and tgrelid = 'public.abonnementen'::regclass limit 1), 'geen trigger'),
       case when exists (select 1 from pg_trigger where tgname = 'abonnementen_ooit_betaald'
                           and tgrelid = 'public.abonnementen'::regclass
                           and (tgtype & 4) > 0 and (tgtype & 16) > 0)
            then 'in orde' else 'LET OP' end
union all
select 'mag_serverdata_schrijven() bestaat en draait met verhoogde rechten',
       coalesce((select case when prosecdef then 'security definer' else 'security invoker' end
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'mag_serverdata_schrijven' limit 1),
                'de functie bestaat niet'),
       case when (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'mag_serverdata_schrijven' limit 1)
            then 'in orde' else 'LET OP' end
union all
select 'ingelogde gebruikers mogen die functie aanroepen',
       case when has_function_privilege('authenticated',
                    'public.mag_serverdata_schrijven(uuid)', 'execute')
            then 'ja' else 'nee' end,
       case when has_function_privilege('authenticated',
                    'public.mag_serverdata_schrijven(uuid)', 'execute')
            then 'in orde' else 'LET OP' end
union all
select 'gegevens_schrijven (insert) toetst het pakket',
       coalesce((select pg_get_expr(polwithcheck, polrelid) from pg_policy
                 where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_schrijven' limit 1),
                'geen regel'),
       case when (select pg_get_expr(polwithcheck, polrelid) from pg_policy
                  where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_schrijven' limit 1)
                 like '%mag_serverdata_schrijven%' then 'in orde' else 'LET OP' end
union all
select 'gegevens_wijzigen (update) toetst het pakket',
       coalesce((select pg_get_expr(polqual, polrelid) from pg_policy
                 where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_wijzigen' limit 1),
                'geen regel'),
       case when (select pg_get_expr(polqual, polrelid) from pg_policy
                  where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_wijzigen' limit 1)
                 like '%mag_serverdata_schrijven%' then 'in orde' else 'LET OP' end
union all
select 'gegevens_lezen (select) is NIET aangeraakt',
       coalesce((select pg_get_expr(polqual, polrelid) from pg_policy
                 where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_lezen' limit 1),
                'geen regel'),
       -- Twee eisen, want "bevat mag_serverdata_schrijven niet" alleen
       -- zou ook "in orde" zeggen als de regel helemaal verdwenen was.
       case when (select pg_get_expr(polqual, polrelid) from pg_policy
                  where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_lezen' limit 1)
                 like '%mijn_clubs%' and
                 (select pg_get_expr(polqual, polrelid) from pg_policy
                  where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_lezen' limit 1)
                 not like '%mag_serverdata_schrijven%' then 'in orde' else 'LET OP' end
union all
select 'gegevens_weghalen (delete) is NIET aangeraakt',
       coalesce((select pg_get_expr(polqual, polrelid) from pg_policy
                 where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_weghalen' limit 1),
                'geen regel'),
       case when (select pg_get_expr(polqual, polrelid) from pg_policy
                  where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_weghalen' limit 1)
                 like '%mag_schrijven%' and
                 (select pg_get_expr(polqual, polrelid) from pg_policy
                  where polrelid = 'public.gegevens'::regclass and polname = 'gegevens_weghalen' limit 1)
                 not like '%mag_serverdata_schrijven%' then 'in orde' else 'LET OP' end
union all
select 'public.teams is niet aangeraakt (blijft op mag_schrijven)',
       coalesce((select pg_get_expr(polwithcheck, polrelid) from pg_policy
                 where polrelid = 'public.teams'::regclass and polname = 'teams_schrijven' limit 1),
                'geen regel'),
       case when (select pg_get_expr(polwithcheck, polrelid) from pg_policy
                  where polrelid = 'public.teams'::regclass and polname = 'teams_schrijven' limit 1)
                 like '%mag_schrijven%' and
                 (select pg_get_expr(polwithcheck, polrelid) from pg_policy
                  where polrelid = 'public.teams'::regclass and polname = 'teams_schrijven' limit 1)
                 not like '%mag_serverdata_schrijven%' then 'in orde' else 'LET OP' end
order by 1;


-- ══════════════════════════════════════════════════════════════
--  WIE RAAKT DIT? — een overzicht, dat niets verandert
--  ─────────────────────────────────────────────────────────────
--  Draai dit gerust nog eens los. Het schrijft niets weg; het laat
--  alleen zien wat de nieuwe regel per vereniging betekent.
--
--  In de kolom "gevolg" staat:
--    · "mag schrijven"  — betaalt nu, of heeft ooit betaald
--    · "GEEN SERVER"    — gratis en nooit klant geweest; die kan
--                         vanaf nu niets nieuws meer opslaan
--
--  Zie je hier een vereniging staan bij "GEEN SERVER" waarvan je
--  weet dat het een klant is, zet die dan eerst goed in abonnementen
--  (het merkteken gaat er dan vanzelf bij, door de trigger) vóórdat
--  je dit bestand op productie laat staan.
-- ══════════════════════════════════════════════════════════════
select c.naam as vereniging,
       a.pakket                    as pakket_in_de_tabel,
       public.pakket_van_club(c.id) as pakket_nu_geldig,
       a.geldig_tot,
       a.ooit_betaald,
       case when public.pakket_van_club(c.id) <> 'free'
                 or coalesce(a.ooit_betaald, false)
            then 'mag schrijven' else 'GEEN SERVER' end as gevolg
from public.clubs c
left join public.abonnementen a on a.club_id = c.id
order by 6, 1;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Haal bij de regels hieronder de twee streepjes vooraan weg,
--  selecteer alleen dat stuk en klik op Run. Daarmee is alles weer
--  zoals vóór dit bestand: public.gegevens staat weer open voor
--  iedereen met mag_schrijven(), ongeacht pakket.
--
--  De kolom ooit_betaald blijft met opzet staan. Die is onschadelijk
--  zolang niemand hem gebruikt, en weggooien zou de enige plek
--  vernietigen waar staat wie er ooit klant is geweest — informatie
--  die je bij een tweede poging weer nodig hebt en die daarna niet
--  meer te achterhalen is voor verenigingen die inmiddels op free
--  staan. Wil je hem tóch weg, dan staat die regel er als laatste
--  bij, met een extra streepje ervoor.
-- ══════════════════════════════════════════════════════════════

-- -- 1. De twee oude regels terug, exact zoals 01-schema.sql regel
-- --    263-273 ze neerzet: alleen mag_schrijven(), geen pakket.
-- drop policy if exists gegevens_schrijven on public.gegevens;
-- create policy gegevens_schrijven on public.gegevens for insert
--   with check (exists (select 1 from public.teams t
--                       where t.id = gegevens.team_id
--                         and public.mag_schrijven(t.club_id)));
--
-- drop policy if exists gegevens_wijzigen on public.gegevens;
-- create policy gegevens_wijzigen on public.gegevens for update
--   using (exists (select 1 from public.teams t
--                  where t.id = gegevens.team_id
--                    and public.mag_schrijven(t.club_id)));
--
-- -- 2. De functie weg. Moet ná stap 1: zolang de regels hierboven
-- --    hem nog aanroepen, weigert Postgres hem te laten vallen.
-- drop function if exists public.mag_serverdata_schrijven(uuid);
--
-- -- 3. De trigger en zijn functie weg. Vanaf nu wordt ooit_betaald
-- --    niet meer bijgehouden.
-- drop trigger if exists abonnementen_ooit_betaald on public.abonnementen;
-- drop function if exists public.ooit_betaald_vasthouden();
--
-- -- 4. ALLEEN als je de kolom écht kwijt wil — lees eerst de uitleg
-- --    hierboven. Dit is niet terug te draaien.
-- -- alter table public.abonnementen drop column if exists ooit_betaald;
