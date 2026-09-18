-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: houdt foutmeldingen zich aan zijn eigen regels?
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná server/03-beheer.sql en server/16-foutrapportage.sql.
--  Plak dit hele bestand in de SQL Editor van Supabase en klik op
--  Run. De uitslag komt als TABEL terug, gewoon in het
--  resultaatvenster. Je hoeft nergens anders te kijken.
--
--  Je hoort negentien regels te zien plus een slotregel, en in de
--  kolom "oordeel" hoort overal ZOALS VERWACHT te staan.
--
--  LET OP — scenario 17 en 18 zijn op 18 september 2026 met opzet
--  ROOD toegevoegd, vóór de reparatie. Zolang die reparatie er niet
--  is, hoort de slotsom "2 scenario(s) wijken af" te melden. Zie de
--  uitleg boven scenario 17.
--
--  Een deel van deze scenario's MOET mislukken. Dat is de test: een
--  snelheidsgrens die niets tegenhoudt is geen snelheidsgrens, en een
--  leesregel die "geen toegang" belooft maar toch iets teruggeeft is
--  een lek. Bij die scenario's staat de weigering van de server
--  erbij, zodat je meteen ziet welke tekst een gebruiker te lezen
--  krijgt.
--
--  Waarom dit ertoe doet: bij het bouwen van 16-foutrapportage.sql
--  bleek de snelheidsgrens in de eerste versie NIETS tegen te
--  houden — niet omdat de teller fout was, maar omdat die teller
--  zelf ook gewoon een lezing van de tabel is, en de leesregel laat
--  alleen een beheerder iets zien. Voor "anon" leverde de teller dus
--  altijd 0 op, ongeacht hoeveel rijen er al stonden. Scenario 1 en 2
--  hieronder zijn precies de twee die dat destijds hadden moeten
--  vangen, en pas rood werden nadat dat gerepareerd was met een
--  aparte, "security definer" telfunctie.
--
--  De test maakt zijn eigen testrijen en een nepbeheerder aan, en
--  draait die aan het eind allemaal terug. Er blijft niets van
--  achter. Je kunt dit zo vaak draaien als je wilt, ook op productie
--  — al is dat voor déze tabel extra onschuldig, want er wordt nooit
--  een club, team of lid bij betrokken.
-- ══════════════════════════════════════════════════════════════

drop table if exists tt_uitslag;
create temp table tt_uitslag(nr text, scenario text, uitkomst text, oordeel text);

do $test$
declare
  gewone_gebruiker uuid := '7ea11f00-0000-4000-a000-000000000021';
  beheerder        uuid := '7ea11f00-0000-4000-a000-000000000022';
  apparaat_1       uuid := '7ea11f00-0000-4000-a000-0000000000a1';
  apparaat_2       uuid := '7ea11f00-0000-4000-a000-0000000000a2';
  apparaat_3       uuid := '7ea11f00-0000-4000-a000-0000000000a3';
  apparaat_4       uuid := '7ea11f00-0000-4000-a000-0000000000a4';
  apparaat_5       uuid := '7ea11f00-0000-4000-a000-0000000000a5';
  bulk        json;
  gezien_21   boolean;
  i           int;
  geraakt     int;
  aantal      int;
  gezien_tijd timestamptz;
  afwijkingen int := 0;
  r text[] := '{}';                      -- verzamelde uitslagen
  regel text;
  deel  text[];
begin
  -- Alles hieronder gebeurt in een deeltransactie die we aan het
  -- eind expres laten klappen. Daardoor verdwijnt elke testrij weer,
  -- terwijl de uitslagen in `r` bewaard blijven — variabelen rollen
  -- namelijk niet terug.
  begin
    insert into auth.users (id, email) values
      (gewone_gebruiker, 'test-foutmeldingen-gewoon@teamtakkie.test'),
      (beheerder,        'test-foutmeldingen-beheerder@teamtakkie.test');
    insert into public.beheerders (gebruiker_id, notitie)
      values (beheerder, 'test-beheerder (foutmeldingen)');

    -- ══ Deel 1 — de snelheidsgrens: 20 per apparaat_id per uur ═

    -- ── 1. Twintig meldingen van hetzelfde apparaat — moet LUKKEN ─
    set local role anon;
    begin
      for i in 1..20 loop
        insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
        values ('testmelding ' || i, apparaat_1, 'render-fout');
      end loop;
      r := array_append(r, '1§twintig meldingen van hetzelfde apparaat§alle 20 gelukt§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('1§twintig meldingen van hetzelfde apparaat§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 2. De 21e melding van datzelfde apparaat — moet MISLUKKEN ─
    begin
      insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
      values ('testmelding 21', apparaat_1, 'render-fout');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '2§eenentwintigste melding, zelfde apparaat, binnen het uur§GELUKT§<< LEK — dit hoort te mislukken');
    exception when insufficient_privilege then
      r := array_append(r, ('2§eenentwintigste melding, zelfde apparaat, binnen het uur§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('2§eenentwintigste melding, zelfde apparaat, binnen het uur§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 3. Een ANDER apparaat heeft zijn eigen, volle budget ────
    -- De grens hoort per apparaat_id te gelden, niet voor de hele
    -- tabel. Zou dit ook mislukken, dan is de grens per ongeluk
    -- globaal geworden en zou één kapot apparaat alle andere
    -- gebruikers blokkeren.
    begin
      insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
      values ('testmelding ander apparaat', apparaat_2, 'render-fout');
      r := array_append(r, '3§een ander apparaat_id heeft nog gewoon budget§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('3§een ander apparaat_id heeft nog gewoon budget§MISLUKT: ' || sqlerrm || '§WIJKT AF — de grens lijkt globaal te zijn geworden'));
    end;
    set local role authenticated;

    -- ══ Deel 2 — de lengtegrenzen ══════════════════════════════

    -- ── 4. Een bericht van 400 tekens — moet MISLUKKEN ─────────
    set local role anon;
    begin
      insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
      values (repeat('x', 400), gen_random_uuid(), 'render-fout');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '4§bericht van 400 tekens§GELUKT§<< LEK — dit hoort te mislukken');
    exception when check_violation then
      r := array_append(r, ('4§bericht van 400 tekens§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('4§bericht van 400 tekens§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 5. Een bericht van precies 300 tekens — moet LUKKEN ────
    -- Zonder deze regel zou een test op de bovengrens onopgemerkt
    -- de grens één teken te streng kunnen laten staan (400 in plaats
    -- van 300, of "< " in plaats van "<=").
    begin
      insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
      values (repeat('y', 300), gen_random_uuid(), 'render-fout');
      r := array_append(r, '5§bericht van precies 300 tekens (de grens zelf)§GELUKT§ZOALS VERWACHT');
    exception when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('5§bericht van precies 300 tekens (de grens zelf)§MISLUKT: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 6. Een stack van 2001 tekens — moet MISLUKKEN ──────────
    begin
      insert into public.foutmeldingen (bericht, stack, apparaat_id, fouttype)
      values ('met te lange stack', repeat('s', 2001), gen_random_uuid(), 'render-fout');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '6§stack trace van 2001 tekens§GELUKT§<< LEK — dit hoort te mislukken');
    exception when check_violation then
      r := array_append(r, ('6§stack trace van 2001 tekens§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('6§stack trace van 2001 tekens§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 7. Een schermnaam van 51 tekens — moet MISLUKKEN ───────
    begin
      insert into public.foutmeldingen (bericht, scherm, apparaat_id, fouttype)
      values ('met te lange schermnaam', repeat('a', 51), gen_random_uuid(), 'render-fout');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '7§schermnaam van 51 tekens§GELUKT§<< LEK — dit hoort te mislukken');
    exception when check_violation then
      r := array_append(r, ('7§schermnaam van 51 tekens§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('7§schermnaam van 51 tekens§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 8. Geen apparaat_id meegeven — moet MISLUKKEN ──────────
    -- Zonder apparaat_id werkt de snelheidsgrens niet meer (twee
    -- NULL's zijn in SQL nooit aan elkaar gelijk), dus dit moet
    -- dichtstaan op kolomniveau, niet via de policy.
    begin
      insert into public.foutmeldingen (bericht, fouttype)
      values ('zonder apparaat_id', 'render-fout');
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '8§geen apparaat_id meegeven§GELUKT§<< LEK — dit hoort te mislukken');
    exception when not_null_violation then
      r := array_append(r, ('8§geen apparaat_id meegeven§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('8§geen apparaat_id meegeven§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 9. Zelf een oud tijdstip meesturen — de server negeert dat ─
    -- Zonder de trigger zou dit de snelheidsgrens laten omzeilen:
    -- alles "gisteren" verzonnen laat de teller van het afgelopen
    -- uur altijd op nul staan.
    --
    -- Deze insert gebruikt bewust GEEN "returning" (zie scenario 12:
    -- dat mislukt op zichzelf al, los van wat je terugvraagt, omdat
    -- authenticated de net geschreven rij niet mag terugzien). Het
    -- werkelijk bewaarde tijdstip wordt daarom apart nagekeken, als
    -- de sessie-eigenaar (postgres), die als tabeleigenaar niet
    -- tegen de leesregel aanloopt — precies zoals Evan het in de
    -- Table Editor van Supabase zou zien.
    insert into public.foutmeldingen (bericht, apparaat_id, fouttype, aangemaakt_op)
    values ('vervalst-tijdstip-marker', gen_random_uuid(), 'render-fout', now() - interval '100 days');
    reset role;
    select aangemaakt_op into gezien_tijd
      from public.foutmeldingen where bericht = 'vervalst-tijdstip-marker';
    set local role authenticated;
    if gezien_tijd is not null and gezien_tijd > now() - interval '1 minute' then
      r := array_append(r, '9§client stuurt een tijdstip van 100 dagen geleden mee§de server zette het vast op nu§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('9§client stuurt een tijdstip van 100 dagen geleden mee§bewaard tijdstip: ' || coalesce(gezien_tijd::text, 'onbekend') || '§WIJKT AF — de client kon het tijdstip zelf bepalen'));
    end if;

    -- ══ Deel 3 — lezen mag alleen de beheerder ═════════════════

    -- ── 10. Een gewone, ingelogde gebruiker leest niets ────────
    perform set_config('request.jwt.claim.sub', gewone_gebruiker::text, true);
    select count(*) into aantal from public.foutmeldingen;
    if aantal = 0 then
      r := array_append(r, '10§gewone ingelogde gebruiker leest de tabel§0 rijen zichtbaar§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('10§gewone ingelogde gebruiker leest de tabel§' || aantal || ' rijen zichtbaar§<< LEK — dit hoort 0 te zijn'));
    end if;

    -- ── 11. De beheerder ziet de rijen wél ──────────────────────
    perform set_config('request.jwt.claim.sub', beheerder::text, true);
    select count(*) into aantal from public.foutmeldingen;
    if aantal > 0 then
      r := array_append(r, ('11§beheerder leest de tabel§' || aantal || ' rijen zichtbaar§ZOALS VERWACHT'));
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '11§beheerder leest de tabel§0 rijen zichtbaar§WIJKT AF — de beheerder hoort juist wél te zien');
    end if;

    -- ── 12. Insert met "returning" faalt zelfs bij geldige gegevens ─
    -- Dit is geen wens maar een vaststaand gegeven van hoe Postgres
    -- RLS werkt: een teruggegeven rij wordt ook langs de select-
    -- regel gelegd. Vastgelegd zodat niemand dit later per ongeluk
    -- "repareert" in de app door ".select()" achter de insert te
    -- zetten — dat zou alle foutmeldingen laten mislukken.
    perform set_config('request.jwt.claim.sub', '', true);
    set local role anon;
    begin
      insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
      values ('met returning', gen_random_uuid(), 'render-fout')
      returning id into aantal;
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '12§insert mét "returning" als anon§GELUKT§WIJKT AF — dit hoort te mislukken, zie de uitleg in 16-foutrapportage.sql');
    exception when insufficient_privilege then
      r := array_append(r, ('12§insert mét "returning" als anon§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT — dit is precies de valkuil voor de client-code'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('12§insert mét "returning" als anon§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;
    set local role authenticated;

    -- ══ Deel 4 — wijzigen en weggooien kan niemand, behalve de
    --            opschoonfunctie ══════════════════════════════

    -- ── 13. Een ingelogde gebruiker probeert te wijzigen ───────
    perform set_config('request.jwt.claim.sub', gewone_gebruiker::text, true);
    update public.foutmeldingen set bericht = 'gewijzigd';
    get diagnostics geraakt = row_count;
    if geraakt = 0 then
      r := array_append(r, '13§ingelogde gebruiker probeert te wijzigen§0 rijen geraakt§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('13§ingelogde gebruiker probeert te wijzigen§' || geraakt || ' rijen geraakt§<< LEK — dit hoort te mislukken'));
    end if;

    -- ── 14. Een ingelogde gebruiker probeert te verwijderen ────
    delete from public.foutmeldingen;
    get diagnostics geraakt = row_count;
    if geraakt = 0 then
      r := array_append(r, '14§ingelogde gebruiker probeert te verwijderen§0 rijen geraakt§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('14§ingelogde gebruiker probeert te verwijderen§' || geraakt || ' rijen geraakt§<< LEK — dit hoort te mislukken'));
    end if;

    -- ══ Deel 5 — de opschoonfunctie ════════════════════════════

    -- ── 15. Een niet-beheerder mag niet opschonen ──────────────
    begin
      perform public.ruim_foutmeldingen_op();
      afwijkingen := afwijkingen + 1;
      r := array_append(r, '15§niet-beheerder roept ruim_foutmeldingen_op() aan§GELUKT§<< LEK — dit hoort te mislukken');
    exception when raise_exception then
      r := array_append(r, ('15§niet-beheerder roept ruim_foutmeldingen_op() aan§GEWEIGERD: ' || sqlerrm || '§ZOALS VERWACHT'));
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('15§niet-beheerder roept ruim_foutmeldingen_op() aan§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;

    -- ── 16. De beheerder ruimt op: alleen de oude rij verdwijnt ─
    reset role;
    insert into public.foutmeldingen (id, bericht, apparaat_id, fouttype) values
      (gen_random_uuid(), 'oud genoeg om weg te gaan',  apparaat_1, 'render-fout'),
      (gen_random_uuid(), 'te vers om weg te gaan',     apparaat_2, 'render-fout');
    -- De trigger zet aangemaakt_op bij het invoegen altijd op nu; dit
    -- UPDATE (geen insert, dus de "before insert"-trigger raakt het
    -- niet) simuleert een rij van 40 dagen oud voor de test.
    update public.foutmeldingen set aangemaakt_op = now() - interval '40 days'
      where bericht = 'oud genoeg om weg te gaan';
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', beheerder::text, true);
    perform public.ruim_foutmeldingen_op();
    reset role;
    select count(*) into aantal from public.foutmeldingen where bericht = 'oud genoeg om weg te gaan';
    select count(*) into geraakt from public.foutmeldingen where bericht = 'te vers om weg te gaan';
    if aantal = 0 and geraakt = 1 then
      r := array_append(r, '16§beheerder ruimt op: 40 dagen oud weg, vers blijft§oude rij weg, verse rij blijft§ZOALS VERWACHT');
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('16§beheerder ruimt op: 40 dagen oud weg, vers blijft§oud nog ' || aantal || 'x, vers nog ' || geraakt || 'x§WIJKT AF'));
    end if;

    -- ══ Deel 6 — de snelheidsgrens bij een BULK-insert ════════
    --
    --  Scenario 1 en 2 hierboven sturen twintig losse inserts: twintig
    --  aparte SQL-opdrachten. Tussen twee opdrachten door ziet
    --  foutmeldingen_recent_aantal() netjes wat de vorige heeft
    --  geschreven, en de grens werkt.
    --
    --  Een aanvaller stuurt geen twintig losse verzoeken. Hij stuurt
    --  één POST naar /rest/v1/foutmeldingen met een JSON-array van
    --  duizend objecten. PostgREST maakt daar ÉÉN insert-opdracht van.
    --  De "with check" wordt dan wel per rij uitgerekend, maar de
    --  telling binnenin kijkt naar de tabel zoals die er bij het BEGIN
    --  van die ene opdracht uitzag — de rijen die de opdracht zelf op
    --  dat moment aan het schrijven is, ziet hij niet (dat is het
    --  snapshot-gedrag van Postgres, MVCC). Elke rij in de batch krijgt
    --  dus hetzelfde, te lage getal te zien en komt erdoor.
    --
    --  RECHTGEZET NA REPARATIE (18 september 2026): hier stond eerst dat
    --  "stable" → "volatile" dit NIET zou oplossen. Dat was onjuist, en
    --  is inmiddels twee keer onafhankelijk gemeten (door wie deze
    --  reparatie bouwde, en daarna nogmaals los gecontroleerd): een
    --  volatile functie krijgt bij elke aanroep niet alleen een vers
    --  antwoord, maar ook een vers snapshot — en dát snapshot telt de
    --  rijen die de lopende opdracht zelf al heeft weggeschreven wél
    --  mee. Zie server/16-foutrapportage.sql, waar de functie nu
    --  "volatile" is; scenario 17-19 hieronder bewijzen het verschil.
    --
    --  Deze twee scenario's zijn met opzet toegevoegd terwijl ze rood
    --  waren, zodat bewezen is dat ze het gat vangen.
    --
    --  WAT HIER BEWUST NIET WORDT GETOETST, EN WAAROM JE HET TOCH MOET
    --  WETEN: dezelfde bulk-insert met een VERS apparaat_id per rij
    --  gaat er hoe dan ook doorheen, en geen enkele reparatie van de
    --  telling verandert daar iets aan — de grens telt nu eenmaal per
    --  apparaat_id, en dat nummer verzint de client zelf. Gemeten op
    --  een kopie van dit schema: 5000 rijen met 5000 eigen uuid's,
    --  binnen 28 ms weggeschreven. Dat is geen fout in dit bestand
    --  maar de keerzijde van een bewust aanvaard risico (zie de kop
    --  van server/16-foutrapportage.sql), en het hoort hier niet als
    --  rood scenario thuis. Het hoort wel in de afweging: wie dit
    --  repareert alsof daarmee de tabel beschermd is, houdt een open
    --  deur over. Een echte bovengrens vraagt om iets dat niet op een
    --  door de client verzonnen nummer leunt.

    -- ── 17. Eén insert met 25 rijen, zelfde apparaat_id ────────
    --  Precies de vorm die PostgREST van een JSON-array maakt: één
    --  opdracht die zijn rijen uit een JSON-verzameling haalt.
    reset role;
    select json_agg(json_build_object('bericht', 'bulkmelding ' || g))
      into bulk from generate_series(1, 25) g;
    set local role anon;
    begin
      insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
      select x.bericht, apparaat_3, 'render-fout'
      from json_to_recordset(bulk) as x(bericht text);
    exception when insufficient_privilege then
      null;   -- geweigerd worden is hier de gewenste uitkomst
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('17§bulk van 25 rijen in één opdracht, zelfde apparaat§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;
    reset role;
    select count(*) into aantal from public.foutmeldingen where apparaat_id = apparaat_3;
    if aantal <= 20 then
      r := array_append(r, ('17§bulk van 25 rijen in één opdracht, zelfde apparaat§' || aantal || ' rijen weggeschreven§ZOALS VERWACHT — de grens hield stand'));
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('17§bulk van 25 rijen in één opdracht, zelfde apparaat§' || aantal || ' rijen weggeschreven§<< LEK — dit hoort er hoogstens 20 te zijn'));
    end if;

    -- ── 18. Eén insert met 1000 rijen ──────────────────────────
    --  Niet om nóg eens hetzelfde te bewijzen, maar om te laten zien
    --  hoe groot het gat is. Het is geen overschrijding van vijf:
    --  één verzoek zet weg wat de aanvaller maar wil.
    select json_agg(json_build_object('bericht', 'bulkmelding ' || g))
      into bulk from generate_series(1, 1000) g;
    set local role anon;
    begin
      insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
      select x.bericht, apparaat_4, 'render-fout'
      from json_to_recordset(bulk) as x(bericht text);
    exception when insufficient_privilege then
      null;
    when others then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('18§bulk van 1000 rijen in één opdracht§mislukt om de VERKEERDE reden: ' || sqlerrm || '§WIJKT AF'));
    end;
    reset role;
    select count(*) into aantal from public.foutmeldingen where apparaat_id = apparaat_4;
    if aantal <= 20 then
      r := array_append(r, ('18§bulk van 1000 rijen in één opdracht§' || aantal || ' rijen weggeschreven§ZOALS VERWACHT — de grens hield stand'));
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('18§bulk van 1000 rijen in één opdracht§' || aantal || ' rijen weggeschreven§<< LEK — dit hoort er hoogstens 20 te zijn'));
    end if;

    -- ── 19. Een bulk die er precies in past, en dan één te veel ─
    --  Dit scenario hoort NU al te slagen, en moet dat blijven doen.
    --  Het pint twee dingen tegelijk vast:
    --
    --    · een batch van precies 20 is gewoon toegestaan — een
    --      reparatie mag niet zo grof zijn dat hij eerlijke meldingen
    --      tegenhoudt of bulk in het geheel verbiedt
    --    · de 21e, in een aparte opdracht, wordt wél geweigerd
    --
    --  Blijft dit groen terwijl 17 en 18 rood zijn, dan weet degene
    --  die dit repareert precies waar hij moet zoeken: de grens is
    --  niet kapot, hij is blind bínnen één opdracht.
    --
    --  Let op: dit scenario gebruikt bewust een eigen apparaat_id en
    --  hangt niet af van wat 17 en 18 wel of niet hebben geschreven.
    --  Een reparatie kan die batches namelijk óf gedeeltelijk óf
    --  helemaal tegenhouden, en dit scenario moet in beide gevallen
    --  hetzelfde meten.
    --  Twee aparte begin/exception-blokken, en dat is geen opmaak: een
    --  plpgsql-blok mét exception-tak is een deeltransactie. Zou de
    --  eenentwintigste in hetzelfde blok staan als de bulk, dan zou
    --  diens weigering óók de zojuist geslaagde bulk terugdraaien en
    --  zou de telling eronder altijd nul geven.
    reset role;
    select json_agg(json_build_object('bericht', 'randmelding ' || g))
      into bulk from generate_series(1, 20) g;
    set local role anon;
    begin
      insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
      select x.bericht, apparaat_5, 'render-fout'
      from json_to_recordset(bulk) as x(bericht text);
    exception when others then null;
    end;
    begin
      insert into public.foutmeldingen (bericht, apparaat_id, fouttype)
      values ('de eenentwintigste, los', apparaat_5, 'render-fout');
      gezien_21 := true;
    exception when others then
      gezien_21 := false;
    end;
    reset role;
    select count(*) into aantal from public.foutmeldingen where apparaat_id = apparaat_5;
    if aantal = 20 and not gezien_21 then
      r := array_append(r, '19§bulk van precies 20, dan nog één los§de 20 kwamen erin, de 21e stuitte§ZOALS VERWACHT — de grens werkt tússen opdrachten');
    elsif gezien_21 then
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('19§bulk van precies 20, dan nog één los§de 21e kwam er ook nog doorheen (' || aantal || ' rijen)§<< LEK — die hoort te stuiten'));
    else
      afwijkingen := afwijkingen + 1;
      r := array_append(r, ('19§bulk van precies 20, dan nog één los§de bulk van 20 kwam er niet doorheen (' || aantal || ' rijen)§WIJKT AF — de reparatie is te grof: eerlijke meldingen sneuvelen'));
    end if;

    reset role;

    -- Hier laten we de deeltransactie expres klappen. Alles wat
    -- hierboven is aangemaakt verdwijnt; `r` blijft staan.
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
    insert into tt_uitslag values (deel[1], deel[2], deel[3], deel[4]);
  end loop;

  if afwijkingen = 0 then
    insert into tt_uitslag values ('', '── SLOTSOM ──', 'alle negentien scenario''s zoals verwacht', 'GESLAAGD');
  else
    insert into tt_uitslag values ('', '── SLOTSOM ──', afwijkingen || ' scenario(s) wijken af', 'ZIE server/16-foutrapportage.sql');
  end if;
end
$test$;

select nr, scenario, uitkomst, oordeel from tt_uitslag
order by nullif(regexp_replace(nr, '[^0-9]', '', 'g'), '')::int nulls last, nr;
