-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: komt een Free-vereniging écht niet op de server?
--  ─────────────────────────────────────────────────────────────
--  Draai dit lokaal, zonder Supabase aan te raken:
--
--      sh tests/sql-lokaal/draai.sh tests/free-server-afscherming.test.sql
--
--  Of, mét een kandidaat-reparatie erbij, om te zien of de rode
--  scenario's ook echt groen wórden:
--
--      sh tests/sql-lokaal/draai.sh tests/free-server-afscherming.test.sql /pad/naar/kandidaat.sql
--
--  Het mag ook in de SQL Editor van Supabase. De test maakt zijn
--  eigen verenigingen, teams en nepaccounts aan en draait alles aan
--  het eind terug. Er blijft niets van achter en er wordt geen
--  bestaande vereniging aangeraakt.
--
--  De uitslag komt als TABEL terug. In de kolom "oordeel" hoort
--  overal ZOALS VERWACHT te staan.
--
--  ─────────────────────────────────────────────────────────────
--  LET OP — dit bestand is op 18 september 2026 met opzet ROOD
--  geschreven, vóór de reparatie. Zolang die er niet is, horen deze
--  scenario's af te wijken:
--
--      1   Free schrijft toch naar de server (insert)
--      2   Free schrijft toch naar de server (update)
--      9a  de kolom abonnementen.ooit_betaald bestaat nog niet
--      9b  zet_pakket() zet ooit_betaald niet op true
--      9c  ooit_betaald blijft niet staan na terugzetten naar free
--
--  Scenario 10 meldt zolang "overgeslagen": die kan pas iets zeggen
--  als de kolom bestaat.
--
--  Scenario 11 (bijgekomen op 18 september 2026) hoort óók nog rood te
--  zijn: die hoort bij de coulance-regeling, en daarvan bestaat op dit
--  moment alleen het ontwerp. Zie tests/coulance-60-dagen.test.sql.
--
--  Alle andere scenario's horen NU AL groen te zijn en moeten dat
--  ná de reparatie blijven. Dat tweede deel is het belangrijkste
--  van dit bestand: het gaat over public.gegevens, de tabel waar
--  letterlijk alles van de app in staat. Eén te strenge policy en
--  elke betalende club kan niets meer opslaan.
--
--  ─────────────────────────────────────────────────────────────
--  WAAR HET HIER OM GAAT
--
--  docs/pakketten-besluit.md (11 september 2026) zegt het in vijf
--  woorden: "Free komt helemaal niet op de server." Dat is niet
--  alleen een verkoopgrens maar de dráágbalk onder het hele besluit —
--  statistieken en live-analyse zijn bewust NIET afgeschermd, met als
--  argument dat een Free-gebruiker toch alleen zijn eigen gegevens op
--  zijn eigen telefoon ziet.
--
--  Op de server staat die grens nergens. De regels gegevens_schrijven
--  en gegevens_wijzigen (server/01-schema.sql regel 263-273) kijken
--  alleen naar mag_schrijven() — dus naar lidmaatschap en rol, niet
--  naar pakket. Wie een gratis account maakt en buiten de app om een
--  verzoek naar Supabase stuurt, schrijft gewoon. De app vraagt netjes
--  om toestemming; de database vraagt niets.
--
--  ─────────────────────────────────────────────────────────────
--  DE VALKUIL — en de reden dat dit bestand zo lang is
--
--  "Weiger iedereen die op free staat" is de voor de hand liggende
--  reparatie, en die is fout. pakket_van_club() geeft namelijk óók
--  'free' terug voor een vereniging die WEL heeft betaald maar wiens
--  abonnement is verlopen — een mislukte incasso, een vergeten
--  overschrijving. Dat is met opzet zo, en er hangt al beleid aan:
--  teamlimiet_bewaken() (server/06-pakketten.sql regel 294-299) laat
--  zo'n vereniging uitdrukkelijk doorwerken met wat hij al had.
--
--  Zou de nieuwe regel alleen naar pakket_van_club() kijken, dan
--  verliest een échte klant bij de eerste mislukte incasso de toegang
--  tot al zijn gegevens. Dat is geen dichtgezet lek maar een
--  afgesloten betalende klant.
--
--  Daarom toetst dit bestand twee dingen tegelijk:
--    · scenario 1-2  — wie NOOIT betaalde, komt er niet in
--    · scenario 5    — wie ÓÓIT betaalde, blijft erin, MAAR NIET
--                      EEUWIG (zie hieronder)
--
--  ─────────────────────────────────────────────────────────────
--  WAT ER OP 18 SEPTEMBER 2026 AAN SCENARIO 5 IS VERANDERD
--
--  Tot die dag beloofde scenario 5 iets dat te ruim was: "ooit betaald
--  = voor altijd mogen schrijven". De verlopen abonnementen in de
--  opbouw stonden op 1 januari 2020 — ruim zes jaar terug — en de test
--  eiste dat die verenigingen nog gewoon konden opslaan.
--
--  Bij de betaalmuur hoort een besluit dat dat inperkt. Evan, 18
--  september 2026: een vereniging waarvan het abonnement afloopt mag
--  nog ZESTIG DAGEN IN TOTAAL naar de server schrijven (de bestaande
--  veertien dagen respijt plus zesenveertig dagen coulance). Daarna
--  stopt het schrijven. Lezen, exporteren en verwijderen blijven voor
--  altijd werken — zie docs/avg-inventaris.md 8.8.
--
--  Daarom staan de verlopen abonnementen in scenario 5 nu op dertig
--  dagen geleden in plaats van op 2020: ruim binnen de coulance, zodat
--  scenario 5 nog steeds bewaakt waarvoor het bedoeld is (een mislukte
--  incasso mag een klant niet meteen buitensluiten) zonder een belofte
--  te doen die niet meer geldt.
--
--  Scenario 11 is de andere kant van diezelfde grens: na eenenzestig
--  dagen houdt het op. Zonder die toevoeging zou dit bestand een
--  groene test op een verouderde afspraak zijn geworden — en dat is
--  het ergste soort test, want niemand gaat er nog naar kijken.
--
--  Het rekenwerk zelf (welke dag precies, en wat er gebeurt met een
--  vereniging die van Evan onbeperkt toegang heeft) staat in een eigen
--  bestand: tests/coulance-60-dagen.test.sql.
--
--  Scenario 5 bestaat in twee smaken, en dat is met opzet:
--    5a/5b  het pakket is ooit via zet_pakket() op coach gezet
--    5c/5d  het pakket is ooit MET DE HAND in Supabase op coach gezet
--  Die tweede is geen bedenksel. server/01-schema.sql regel 288-292 en
--  server/06-pakketten.sql regel 207-210 zeggen allebei letterlijk dat
--  abonnementen met de hand in Supabase wordt bijgehouden; er staat
--  bewust geen schrijfregel op die tabel. Een reparatie die "ooit
--  betaald" alleen in zet_pakket() bijhoudt, mist dus precies de weg
--  die vandaag het meest gebruikt wordt.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag_free;
create temp table tt_uitslag_free(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  -- De spelers in dit stuk. Vaste uuid's, zodat een mislukte run
  -- herkenbare rommel achterlaat in plaats van naamloze rijen — al
  -- hoort er niets achter te blijven.
  u_nooit      uuid := '7ea1f7ee-0000-4000-a000-000000000001';
  u_kijker     uuid := '7ea1f7ee-0000-4000-a000-000000000002';
  u_coach      uuid := '7ea1f7ee-0000-4000-a000-000000000003';
  u_club       uuid := '7ea1f7ee-0000-4000-a000-000000000004';
  u_zakte      uuid := '7ea1f7ee-0000-4000-a000-000000000005';
  u_hand       uuid := '7ea1f7ee-0000-4000-a000-000000000006';
  u_vreemde    uuid := '7ea1f7ee-0000-4000-a000-000000000007';
  u_negen      uuid := '7ea1f7ee-0000-4000-a000-000000000008';
  u_beheerder  uuid := '7ea1f7ee-0000-4000-a000-000000000009';
  u_kijkbetaal uuid := '7ea1f7ee-0000-4000-a000-00000000000a';
  u_overzakte  uuid := '7ea1f7ee-0000-4000-a000-00000000000b';
  u_overhand   uuid := '7ea1f7ee-0000-4000-a000-00000000000c';

  c_nooit uuid; c_coach uuid; c_club uuid; c_zakte uuid; c_hand uuid; c_negen uuid;
  c_overzakte uuid; c_overhand uuid;

  t_nooit constant text := 'tt-free-team-nooit';
  t_coach constant text := 'tt-free-team-coach';
  t_club  constant text := 'tt-free-team-club';
  t_zakte constant text := 'tt-free-team-zakte';
  t_hand  constant text := 'tt-free-team-hand';
  t_overzakte constant text := 'tt-free-team-over-zakte';
  t_overhand  constant text := 'tt-free-team-over-hand';

  geraakt  int;
  kolom_er boolean;
  coulance_er boolean;
  vlag     boolean;
  pk       text;
  afwijkingen int := 0;
  r text[] := '{}';
  regel text;
  deel  text[];
begin
  -- Alles gebeurt in een deeltransactie die we aan het eind expres
  -- laten klappen. Daardoor verdwijnt elke testrij weer, terwijl de
  -- uitslagen in `r` bewaard blijven — variabelen rollen niet terug.
  begin

    -- ══ OPBOUW ═══════════════════════════════════════════════
    insert into auth.users (id, email) values
      (u_nooit,     'test-free-nooit@teamtakkie.test'),
      (u_kijker,    'test-free-kijker@teamtakkie.test'),
      (u_coach,     'test-free-coach@teamtakkie.test'),
      (u_club,      'test-free-club@teamtakkie.test'),
      (u_zakte,     'test-free-zakte@teamtakkie.test'),
      (u_hand,      'test-free-hand@teamtakkie.test'),
      (u_vreemde,   'test-free-vreemde@teamtakkie.test'),
      (u_negen,     'test-free-negen@teamtakkie.test'),
      (u_beheerder, 'test-free-beheerder@teamtakkie.test'),
      (u_kijkbetaal,'test-free-kijker-betaald@teamtakkie.test'),
      (u_overzakte, 'test-free-over-zakte@teamtakkie.test'),
      (u_overhand,  'test-free-over-hand@teamtakkie.test');

    insert into public.beheerders (gebruiker_id, notitie)
      values (u_beheerder, 'test-beheerder (free-server-afscherming)');

    -- Elke vereniging via nieuwe_club(), want dat is de enige echte
    -- weg: die functie maakt club, eigenaar én de free-abonnementsrij
    -- in één keer. Een met de hand in elkaar gezette club zou een
    -- situatie toetsen die in het echt niet bestaat.
    set local role authenticated;

    perform set_config('request.jwt.claim.sub', u_nooit::text, true);
    c_nooit := public.nieuwe_club('Testclub nooit betaald', 'Eigenaar nooit');
    insert into public.teams (id, club_id, naam) values (t_nooit, c_nooit, 'Team nooit');

    perform set_config('request.jwt.claim.sub', u_coach::text, true);
    c_coach := public.nieuwe_club('Testclub coach', 'Eigenaar coach');
    insert into public.teams (id, club_id, naam) values (t_coach, c_coach, 'Team coach');

    perform set_config('request.jwt.claim.sub', u_club::text, true);
    c_club := public.nieuwe_club('Testclub club', 'Eigenaar club');
    insert into public.teams (id, club_id, naam) values (t_club, c_club, 'Team club');

    perform set_config('request.jwt.claim.sub', u_zakte::text, true);
    c_zakte := public.nieuwe_club('Testclub afgezakt via zet_pakket', 'Eigenaar afgezakt');
    insert into public.teams (id, club_id, naam) values (t_zakte, c_zakte, 'Team afgezakt');

    perform set_config('request.jwt.claim.sub', u_hand::text, true);
    c_hand := public.nieuwe_club('Testclub afgezakt met de hand', 'Eigenaar handmatig');
    insert into public.teams (id, club_id, naam) values (t_hand, c_hand, 'Team handmatig');

    perform set_config('request.jwt.claim.sub', u_negen::text, true);
    c_negen := public.nieuwe_club('Testclub voor scenario 9', 'Eigenaar negen');

    -- De twee verenigingen van scenario 11: precies dezelfde twee wegen
    -- als bij scenario 5, alleen langer geleden verlopen.
    perform set_config('request.jwt.claim.sub', u_overzakte::text, true);
    c_overzakte := public.nieuwe_club('Testclub 61 dagen verlopen (zet_pakket)', 'Eigenaar over 1');
    insert into public.teams (id, club_id, naam) values (t_overzakte, c_overzakte, 'Team over 1');

    perform set_config('request.jwt.claim.sub', u_overhand::text, true);
    c_overhand := public.nieuwe_club('Testclub 61 dagen verlopen (met de hand)', 'Eigenaar over 2');
    insert into public.teams (id, club_id, naam) values (t_overhand, c_overhand, 'Team over 2');

    reset role;

    -- De kijker bij de free-vereniging. Met de hand, want leden_toevoegen
    -- laat alleen de eigenaar toe en die weg is hier niet het onderwerp.
    insert into public.leden (club_id, gebruiker_id, naam, rol)
      values (c_nooit, u_kijker, 'Kijker nooit', 'kijker');

    -- En een kijker bij de BETALENDE vereniging. Die is er voor scenario
    -- 8b/8c en dat is geen overbodige luxe: zie de uitleg daar.
    insert into public.leden (club_id, gebruiker_id, naam, rol)
      values (c_club, u_kijkbetaal, 'Kijker betaald', 'kijker');

    -- Pakketten zetten. Voor coach en club gaat dat met de hand, net
    -- zoals Evan het doet: op abonnementen staat geen schrijfregel.
    update public.abonnementen set pakket = 'coach', geldig_tot = null where club_id = c_coach;
    update public.abonnementen set pakket = 'club',  geldig_tot = null where club_id = c_club;

    -- c_hand: ooit met de hand op coach gezet, en die einddatum ligt
    -- dertig dagen achter ons — voorbij de respijtperiode van veertien
    -- dagen uit pakket_instellingen, maar binnen de zestig dagen
    -- coulance. pakket_van_club() geeft hier dus 'free' terug, terwijl
    -- deze club wel degelijk klant was én nog mag schrijven.
    --
    -- Dit stond tot 18 september 2026 op 1 januari 2020. Die datum kan
    -- niet blijven staan: met de coulance-regeling is zes jaar geleden
    -- niet meer "mag nog schrijven" maar "mag niet meer". Zie de uitleg
    -- bovenaan dit bestand en scenario 11 hieronder.
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date - 30
      where club_id = c_hand;

    -- c_zakte: zelfde situatie, maar netjes via zet_pakket() gezet —
    -- de weg die het beheerscherm gebruikt.
    perform set_config('request.jwt.claim.sub', u_beheerder::text, true);
    set local role authenticated;
    perform public.zet_pakket(c_zakte, 'coach', current_date - 30);
    reset role;

    -- En dezelfde twee, maar eenenzestig dagen geleden verlopen: één
    -- dag voorbij de coulance. Scenario 11 kijkt naar deze twee.
    update public.abonnementen set pakket = 'coach', geldig_tot = current_date - 61
      where club_id = c_overhand;

    perform set_config('request.jwt.claim.sub', u_beheerder::text, true);
    set local role authenticated;
    perform public.zet_pakket(c_overzakte, 'coach', current_date - 61);
    reset role;

    -- Bestaande gegevensrijen om op te wijzigen, te verwijderen en te
    -- lezen. Met de hand neergezet, want scenario 1 (de insert door de
    -- free-eigenaar zelf) hoort straks juist te MISLUKKEN — dan zou er
    -- zonder deze opbouw niets zijn om 2, 6 en 7 op los te laten.
    insert into public.gegevens (team_id, sleutel, waarde) values
      (t_nooit, 'fch_spelers_v1',   '[]'::jsonb),
      (t_nooit, 'tt_weg_v1',        '[]'::jsonb),
      (t_nooit, 'tt_lezen_v1',      '[]'::jsonb),
      (t_coach, 'fch_spelers_v1',   '[]'::jsonb),
      (t_club,  'fch_spelers_v1',   '[]'::jsonb),
      (t_zakte, 'fch_spelers_v1',   '[]'::jsonb),
      (t_hand,  'fch_spelers_v1',   '[]'::jsonb),
      (t_overzakte, 'fch_spelers_v1', '[]'::jsonb),
      (t_overhand,  'fch_spelers_v1', '[]'::jsonb);

    -- Controle op de opbouw zelf. Klopt dit niet, dan meet de rest
    -- van de test iets anders dan hij denkt te meten.
    pk := public.pakket_van_club(c_zakte) || '/' || public.pakket_van_club(c_hand)
          || '/' || public.pakket_van_club(c_nooit) || '/' || public.pakket_van_club(c_coach);
    if pk = 'free/free/free/coach' then
      r := array_append(r, '0§opbouw: de twee afgezakte clubs komen op free uit§'
        || 'pakket_van_club: afgezakt=free, handmatig=free, nooit=free, coach=coach§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('0§opbouw: de twee afgezakte clubs komen op free uit§gezien: ' || pk
        || '§WIJKT AF — de test meet dan niet wat hij denkt'));
    end if;

    -- ══ 1. NOOIT BETAALD — SCHRIJVEN (insert) ════════════════
    --  De kern van dit bestand. Een vereniging die altijd gratis is
    --  geweest, hoort niets op de server te kunnen zetten.
    perform set_config('request.jwt.claim.sub', u_nooit::text, true);
    set local role authenticated;
    begin
      insert into public.gegevens (team_id, sleutel, waarde)
        values (t_nooit, 'tt_nieuw_v1', '[{"naam":"Free-speler"}]'::jsonb);
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '1§free (nooit betaald): nieuwe gegevens op de server zetten§GELUKT§<< LEK — dit hoort te mislukken');
    exception when insufficient_privilege then
      r := array_append(r, '1§free (nooit betaald): nieuwe gegevens op de server zetten§GEWEIGERD door de beveiligingsregel§ZOALS VERWACHT');
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('1§free (nooit betaald): nieuwe gegevens op de server zetten§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ 2. NOOIT BETAALD — WIJZIGEN (update) ═════════════════
    --  Let op het verschil met scenario 1: een update die door de
    --  beveiligingsregel wordt tegengehouden geeft GEEN foutmelding.
    --  Hij raakt gewoon nul rijen. Wie hier op een exception wacht,
    --  wacht eeuwig en schrijft een test die altijd groen is.
    begin
      update public.gegevens set waarde = '[{"naam":"Stiekem"}]'::jsonb
        where team_id = t_nooit and sleutel = 'fch_spelers_v1';
      get diagnostics geraakt = row_count;
      if geraakt = 0 then
        r := array_append(r, '2§free (nooit betaald): bestaande gegevens wijzigen§GEWEIGERD (0 rijen geraakt)§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('2§free (nooit betaald): bestaande gegevens wijzigen§GELUKT (' || geraakt || ' rij)§<< LEK — dit hoort te mislukken'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('2§free (nooit betaald): bestaande gegevens wijzigen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ 3. COACH — moet gewoon werken ════════════════════════
    perform set_config('request.jwt.claim.sub', u_coach::text, true);
    begin
      insert into public.gegevens (team_id, sleutel, waarde)
        values (t_coach, 'tt_nieuw_v1', '[{"naam":"Coach-speler"}]'::jsonb);
      r := array_append(r, '3a§coach: nieuwe gegevens op de server zetten§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('3a§coach: nieuwe gegevens op de server zetten§MISLUKT: ' || sqlerrm || '§WIJKT AF — een betalende klant kan niets opslaan'));
    end;

    begin
      update public.gegevens set waarde = '[{"naam":"Coach-speler 2"}]'::jsonb
        where team_id = t_coach and sleutel = 'fch_spelers_v1';
      get diagnostics geraakt = row_count;
      if geraakt = 1 then
        r := array_append(r, '3b§coach: bestaande gegevens wijzigen§GELUKT (1 rij)§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('3b§coach: bestaande gegevens wijzigen§' || geraakt || ' rijen geraakt§WIJKT AF — een betalende klant kan niets bijwerken'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('3b§coach: bestaande gegevens wijzigen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ 4. CLUB — moet gewoon werken ═════════════════════════
    perform set_config('request.jwt.claim.sub', u_club::text, true);
    begin
      insert into public.gegevens (team_id, sleutel, waarde)
        values (t_club, 'tt_nieuw_v1', '[{"naam":"Club-speler"}]'::jsonb);
      r := array_append(r, '4a§club: nieuwe gegevens op de server zetten§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4a§club: nieuwe gegevens op de server zetten§MISLUKT: ' || sqlerrm || '§WIJKT AF — een betalende klant kan niets opslaan'));
    end;

    begin
      update public.gegevens set waarde = '[{"naam":"Club-speler 2"}]'::jsonb
        where team_id = t_club and sleutel = 'fch_spelers_v1';
      get diagnostics geraakt = row_count;
      if geraakt = 1 then
        r := array_append(r, '4b§club: bestaande gegevens wijzigen§GELUKT (1 rij)§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('4b§club: bestaande gegevens wijzigen§' || geraakt || ' rijen geraakt§WIJKT AF — een betalende klant kan niets bijwerken'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4b§club: bestaande gegevens wijzigen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ 5. ÓÓIT BETAALD, NET VERLOPEN — moet blijven werken ══
    --  Dit is het scenario waar een te haastige reparatie op stukloopt.
    --  Deze twee verenigingen staan volgens pakket_van_club() op 'free',
    --  precies zoals de vereniging in scenario 1 — en toch horen ze
    --  wél te mogen schrijven. Het verschil is niet in pakket_van_club()
    --  te zien; daar is een apart merkteken voor nodig.
    --
    --  LET OP: "net verlopen" is sinds 18 september 2026 een wezenlijk
    --  deel van dit scenario. Beide verenigingen zijn dertig dagen over
    --  de einddatum: voorbij de veertien dagen respijt, ruim binnen de
    --  zestig dagen coulance. Scenario 11 doet hetzelfde met
    --  eenenzestig dagen en verwacht dan het tegenovergestelde.
    --
    --  5a/5b: het pakket is via zet_pakket() gezet (het beheerscherm).
    perform set_config('request.jwt.claim.sub', u_zakte::text, true);
    begin
      insert into public.gegevens (team_id, sleutel, waarde)
        values (t_zakte, 'tt_nieuw_v1', '[{"naam":"Afgezakt"}]'::jsonb);
      r := array_append(r, '5a§ooit coach via zet_pakket(), 30 dagen verlopen: nieuwe gegevens§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5a§ooit coach via zet_pakket(), 30 dagen verlopen: nieuwe gegevens§MISLUKT: ' || sqlerrm || '§WIJKT AF — mislukte incasso sluit een echte klant buiten'));
    end;

    begin
      update public.gegevens set waarde = '[{"naam":"Afgezakt 2"}]'::jsonb
        where team_id = t_zakte and sleutel = 'fch_spelers_v1';
      get diagnostics geraakt = row_count;
      if geraakt = 1 then
        r := array_append(r, '5b§ooit coach via zet_pakket(), 30 dagen verlopen: wijzigen§GELUKT (1 rij)§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('5b§ooit coach via zet_pakket(), 30 dagen verlopen: wijzigen§' || geraakt || ' rijen geraakt§WIJKT AF — mislukte incasso sluit een echte klant buiten'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5b§ooit coach via zet_pakket(), 30 dagen verlopen: wijzigen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
    end;

    --  5c/5d: het pakket is MET DE HAND in Supabase gezet. Dat is
    --  vandaag de gewone gang van zaken (zie de kop van dit bestand),
    --  dus een merkteken dat alleen in zet_pakket() wordt gezet, mist
    --  deze club — en sluit hem buiten zodra zijn jaar om is.
    perform set_config('request.jwt.claim.sub', u_hand::text, true);
    begin
      insert into public.gegevens (team_id, sleutel, waarde)
        values (t_hand, 'tt_nieuw_v1', '[{"naam":"Handmatig"}]'::jsonb);
      r := array_append(r, '5c§ooit coach met de hand gezet, 30 dagen verlopen: nieuwe gegevens§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5c§ooit coach met de hand gezet, 30 dagen verlopen: nieuwe gegevens§MISLUKT: ' || sqlerrm || '§WIJKT AF — abonnementen wordt met de hand bijgehouden, die weg telt dus ook'));
    end;

    begin
      update public.gegevens set waarde = '[{"naam":"Handmatig 2"}]'::jsonb
        where team_id = t_hand and sleutel = 'fch_spelers_v1';
      get diagnostics geraakt = row_count;
      if geraakt = 1 then
        r := array_append(r, '5d§ooit coach met de hand gezet, 30 dagen verlopen: wijzigen§GELUKT (1 rij)§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('5d§ooit coach met de hand gezet, 30 dagen verlopen: wijzigen§' || geraakt || ' rijen geraakt§WIJKT AF — abonnementen wordt met de hand bijgehouden, die weg telt dus ook'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5d§ooit coach met de hand gezet, 30 dagen verlopen: wijzigen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ 6. VERWIJDEREN BLIJFT VOOR IEDEREEN ══════════════════
    --  Buiten de reparatie houden, met opzet. Iemand die zijn gegevens
    --  van de server wil halen, moet dat altijd kunnen — dat is ook een
    --  AVG-kant: een verlopen abonnement mag geen reden zijn waarom je
    --  je eigen spelersgegevens niet meer kunt wissen.
    perform set_config('request.jwt.claim.sub', u_nooit::text, true);
    begin
      delete from public.gegevens where team_id = t_nooit and sleutel = 'tt_weg_v1';
      get diagnostics geraakt = row_count;
      if geraakt = 1 then
        r := array_append(r, '6§free (nooit betaald): eigen gegevens VERWIJDEREN§GELUKT (1 rij)§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('6§free (nooit betaald): eigen gegevens VERWIJDEREN§' || geraakt || ' rijen geraakt§WIJKT AF — verwijderen hoort buiten de reparatie te blijven'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('6§free (nooit betaald): eigen gegevens VERWIJDEREN§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ 7. LEZEN BLIJFT ONGEWIJZIGD ══════════════════════════
    --  Een kijker bij een gratis vereniging. Lezen staat los van
    --  betalen: wat er al op de server staat, blijft zichtbaar.
    perform set_config('request.jwt.claim.sub', u_kijker::text, true);
    begin
      select count(*) into geraakt from public.gegevens
        where team_id = t_nooit and sleutel = 'tt_lezen_v1';
      if geraakt = 1 then
        r := array_append(r, '7§free (nooit betaald): kijker LEEST de gegevens§GELUKT (1 rij zichtbaar)§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('7§free (nooit betaald): kijker LEEST de gegevens§' || geraakt || ' rijen zichtbaar§WIJKT AF — lezen hoort buiten de reparatie te blijven'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('7§free (nooit betaald): kijker LEEST de gegevens§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ 8. HET BESTAANDE SLOT OP LIDMAATSCHAP EN ROL ═════════
    --  Hoort nu al te werken en moet dat blijven doen: een reparatie die
    --  de regel herschrijft kan mag_schrijven() per ongeluk meeslepen.
    --  Er wordt hier geschreven naar het team van de CLUB-vereniging,
    --  zodat een weigering niet per ongeluk van de pakketkant komt.
    --
    --  8a. Een volslagen vreemde.
    perform set_config('request.jwt.claim.sub', u_vreemde::text, true);
    begin
      insert into public.gegevens (team_id, sleutel, waarde)
        values (t_club, 'tt_vreemde_v1', '[{"naam":"Indringer"}]'::jsonb);
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '8a§geen lid van de club: schrijven naar andermans team§GELUKT§<< LEK — dit hoort te mislukken');
    exception when insufficient_privilege then
      r := array_append(r, '8a§geen lid van de club: schrijven naar andermans team§GEWEIGERD door de beveiligingsregel§ZOALS VERWACHT');
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('8a§geen lid van de club: schrijven naar andermans team§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    --  8b/8c. Een KIJKER bij diezelfde betalende vereniging.
    --
    --  Waarom dit erbij moet, en dat is met een opzettelijke fout
    --  aangetoond: scenario 8a houdt óók stand als mag_schrijven()
    --  helemaal uit de nieuwe regel wegvalt. De regel kijkt namelijk
    --  in public.teams, en op die tabel geldt teams_lezen — een vreemde
    --  ziet dat team gewoon niet staan, dus de "exists" is al onwaar
    --  vóórdat er ooit naar rol of pakket gekeken wordt. 8a bewijst dus
    --  minder dan het lijkt.
    --
    --  Een kijker ziet het team wél. Bij hem hangt alles op de rol, en
    --  dus precies op het stuk dat een herschrijving kan verliezen.
    perform set_config('request.jwt.claim.sub', u_kijkbetaal::text, true);
    begin
      insert into public.gegevens (team_id, sleutel, waarde)
        values (t_club, 'tt_kijker_v1', '[{"naam":"Kijker schrijft"}]'::jsonb);
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '8b§kijker bij een BETALENDE club: nieuwe gegevens zetten§GELUKT§<< LEK — een kijker mag niets schrijven');
    exception when insufficient_privilege then
      r := array_append(r, '8b§kijker bij een BETALENDE club: nieuwe gegevens zetten§GEWEIGERD door de beveiligingsregel§ZOALS VERWACHT');
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('8b§kijker bij een BETALENDE club: nieuwe gegevens zetten§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    begin
      update public.gegevens set waarde = '[{"naam":"Kijker wijzigt"}]'::jsonb
        where team_id = t_club and sleutel = 'fch_spelers_v1';
      get diagnostics geraakt = row_count;
      if geraakt = 0 then
        r := array_append(r, '8c§kijker bij een BETALENDE club: bestaande gegevens wijzigen§GEWEIGERD (0 rijen geraakt)§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('8c§kijker bij een BETALENDE club: bestaande gegevens wijzigen§GELUKT (' || geraakt || ' rij)§<< LEK — een kijker mag niets wijzigen'));
      end if;
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('8c§kijker bij een BETALENDE club: bestaande gegevens wijzigen§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ══ 9. HET MERKTEKEN "OOIT BETAALD" ══════════════════════
    --  Dit deel toetst niet public.gegevens maar de boekhouding
    --  eronder. Zonder een merkteken dat blijft staan, is scenario 5
    --  niet te halen zonder scenario 1 open te zetten.
    --
    --  Waarom "nooit meer terug naar false": een beheerder die per
    --  ongeluk op free klikt, of een geautomatiseerde afwaardering bij
    --  het einde van een seizoen, mag geen klant buitensluiten die al
    --  jaren gegevens op de server heeft staan. Het merkteken zegt
    --  "deze club is ooit klant geweest" en dat wordt nooit onwaar.
    reset role;
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'abonnementen'
                     and column_name = 'ooit_betaald') into kolom_er;

    if not kolom_er then
      afwijkingen := afwijkingen + 3;
      r := array_append(r, '9a§de kolom abonnementen.ooit_betaald bestaat§NEE§WIJKT AF — zonder dit merkteken is scenario 5 niet te halen');
      r := array_append(r, '9b§zet_pakket(club, ''coach'') zet ooit_betaald op true§niet te toetsen: de kolom bestaat niet§WIJKT AF');
      r := array_append(r, '9c§daarna zet_pakket(club, ''free''): ooit_betaald blijft true§niet te toetsen: de kolom bestaat niet§WIJKT AF');
    else
      r := array_append(r, '9a§de kolom abonnementen.ooit_betaald bestaat§JA§ZOALS VERWACHT');

      -- Dynamisch, want bij een kale database bestaat de kolom niet en
      -- zou een gewone verwijzing dit hele blok laten stranden vóór 9a
      -- ooit iets kan melden.
      perform set_config('request.jwt.claim.sub', u_beheerder::text, true);
      set local role authenticated;
      begin
        perform public.zet_pakket(c_negen, 'coach', date '2027-07-01');
        reset role;
        execute 'select ooit_betaald from public.abonnementen where club_id = $1'
          into vlag using c_negen;
        if vlag then
          r := array_append(r, '9b§zet_pakket(club, ''coach'') zet ooit_betaald op true§true§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('9b§zet_pakket(club, ''coach'') zet ooit_betaald op true§' || coalesce(vlag::text, 'niets') || '§WIJKT AF'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('9b§zet_pakket(club, ''coach'') zet ooit_betaald op true§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;

      perform set_config('request.jwt.claim.sub', u_beheerder::text, true);
      set local role authenticated;
      begin
        perform public.zet_pakket(c_negen, 'free');
        reset role;
        execute 'select ooit_betaald from public.abonnementen where club_id = $1'
          into vlag using c_negen;
        if vlag then
          r := array_append(r, '9c§daarna zet_pakket(club, ''free''): ooit_betaald blijft true§true§ZOALS VERWACHT');
        else
          afwijkingen := afwijkingen + 1;
          r := array_append(r, ('9c§daarna zet_pakket(club, ''free''): ooit_betaald blijft true§' || coalesce(vlag::text, 'niets') || '§WIJKT AF — een klant die ooit betaalde raakt zo alsnog zijn gegevens kwijt'));
        end if;
      exception when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('9c§daarna zet_pakket(club, ''free''): ooit_betaald blijft true§onverwachte fout: ' || sqlerrm || '§WIJKT AF'));
      end;
    end if;

    -- ══ 10. GEEN BESTAANDE KLANT VERGETEN ════════════════════
    --  Eerlijk over wat dit wel en niet bewijst.
    --
    --  De migratie die het merkteken invoert MOET de bestaande rijen
    --  meenemen — wie vandaag 'coach' of 'club' in de tabel heeft staan,
    --  is klant, ook al is dat merkteken pas later bedacht. Vergeet Bas
    --  die ene update-regel, dan merkt niemand dat, totdat de eerste
    --  jaarabonnementen verlopen en er klanten buiten komen te staan.
    --
    --  Dat is met een opzettelijke fout geprobeerd en NIET gevangen: de
    --  scenario's hierboven maken hun eigen abonnementsrijen aan, ná de
    --  migratie, dus die zijn per definitie in orde. Deze controle kijkt
    --  daarom naar de tabel zelf. In de wegwerpdatabase staat niets ouds
    --  en is hij dus altijd groen; draai je dit bestand in de SQL Editor
    --  van Supabase, dán zegt hij iets.
    if kolom_er then
      reset role;
      execute 'select count(*) from public.abonnementen '
           || 'where pakket in (''coach'',''club'') and ooit_betaald = false'
        into geraakt;
      if geraakt = 0 then
        r := array_append(r, '10§bestaande betaalde abonnementen hebben het merkteken (zegt alleen iets op productie)§'
          || '0 rijen met coach/club zonder merkteken§ZOALS VERWACHT');
      else
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('10§bestaande betaalde abonnementen hebben het merkteken (zegt alleen iets op productie)§'
          || geraakt || ' betalende verenigingen zonder merkteken§WIJKT AF — die raken hun toegang kwijt zodra hun abonnement verloopt'));
      end if;
    else
      r := array_append(r, '10§bestaande betaalde abonnementen hebben het merkteken (zegt alleen iets op productie)§'
        || 'niet te toetsen: de kolom bestaat niet§overgeslagen');
    end if;

    -- ══ 11. MAAR NIET EEUWIG — NA ZESTIG DAGEN STOPT HET ═════
    --  De tegenhanger van scenario 5, en de reden dat scenario 5 op
    --  18 september 2026 moest veranderen. Zie de uitleg bovenaan dit
    --  bestand.
    --
    --  Dit zijn dezelfde twee wegen als bij scenario 5 — via
    --  zet_pakket() en met de hand in de tabel — maar met een einddatum
    --  van eenenzestig dagen terug: precies één dag voorbij de veertien
    --  dagen respijt plus zesenveertig dagen coulance.
    --
    --  Waarom allebei die wegen ook hier: de coulance-grens rekent met
    --  abonnementen.betaald_tot, en die kolom moet langs élke weg naar
    --  binnen gevuld worden — net als ooit_betaald. Een uitbreiding die
    --  alleen in zet_pakket() bijhoudt tot wanneer er betaald is, mist
    --  precies de weg die vandaag het meest gebruikt wordt, en dan
    --  slaagt 11a wel en 11b niet.
    --
    --  Het fijnere rekenwerk — de grens van precies zestig dagen, en de
    --  vereniging die van Evan onbeperkt toegang heeft — staat in
    --  tests/coulance-60-dagen.test.sql. Hier staat alleen de kant die
    --  scenario 5 anders te ruim zou maken.
    reset role;
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'abonnementen'
                     and column_name = 'betaald_tot')
           and exists (select 1 from public.pakket_instellingen
                       where sleutel = 'coulance_dagen')
      into coulance_er;

    if not coulance_er then
      afwijkingen := afwijkingen + 2;
      r := array_append(r, '11a§61 dagen verlopen (via zet_pakket()): schrijven hoort te stoppen§'
        || 'niet te toetsen: de coulance-regeling bestaat nog niet§WIJKT AF — zie tests/coulance-60-dagen.test.sql');
      r := array_append(r, '11b§61 dagen verlopen (met de hand gezet): schrijven hoort te stoppen§'
        || 'niet te toetsen: de coulance-regeling bestaat nog niet§WIJKT AF — zie tests/coulance-60-dagen.test.sql');
    else
      perform set_config('request.jwt.claim.sub', u_overzakte::text, true);
      set local role authenticated;
      begin
        insert into public.gegevens (team_id, sleutel, waarde)
          values (t_overzakte, 'tt_nieuw_v1', '[{"naam":"Te laat"}]'::jsonb);
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '11a§61 dagen verlopen (via zet_pakket()): schrijven hoort te stoppen§GELUKT§<< dit hoort te mislukken — de zestig dagen zijn om');
      exception when insufficient_privilege then
        r := array_append(r, '11a§61 dagen verlopen (via zet_pakket()): schrijven hoort te stoppen§GEWEIGERD door de beveiligingsregel§ZOALS VERWACHT');
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('11a§61 dagen verlopen (via zet_pakket()): schrijven hoort te stoppen§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
      end;

      perform set_config('request.jwt.claim.sub', u_overhand::text, true);
      begin
        insert into public.gegevens (team_id, sleutel, waarde)
          values (t_overhand, 'tt_nieuw_v1', '[{"naam":"Te laat 2"}]'::jsonb);
        afwijkingen := afwijkingen + 1;
        r := array_append(r, '11b§61 dagen verlopen (met de hand gezet): schrijven hoort te stoppen§GELUKT§<< dit hoort te mislukken — de zestig dagen zijn om');
      exception when insufficient_privilege then
        r := array_append(r, '11b§61 dagen verlopen (met de hand gezet): schrijven hoort te stoppen§GEWEIGERD door de beveiligingsregel§ZOALS VERWACHT');
      when others then
        afwijkingen := afwijkingen + 1;
        r := array_append(r, ('11b§61 dagen verlopen (met de hand gezet): schrijven hoort te stoppen§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
      end;
      reset role;
    end if;

    reset role;

    -- Hier laten we de deeltransactie expres klappen.
    raise exception 'TT_TEST_KLAAR';
  exception when others then
    reset role;
    if sqlerrm <> 'TT_TEST_KLAAR' then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('!§de test zelf liep vast§' || sqlerrm || '§WIJKT AF'));
    end if;
  end;

  foreach regel in array r loop
    deel := string_to_array(regel, '§');
    insert into tt_uitslag_free values (deel[1], deel[2], deel[3], deel[4]);
  end loop;

  if afwijkingen = 0 then
    insert into tt_uitslag_free values ('', '── SLOTSOM ──', 'alle scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag_free values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af',
      'ZIE server/01-schema.sql regel 263-273 en docs/pakketten-besluit.md');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag_free
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
