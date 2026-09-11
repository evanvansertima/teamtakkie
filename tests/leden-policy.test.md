# Test: wie mag leden toevoegen en weghalen?

Deze test hoort bij de reparatie in `server/04-leden-fix.sql`.

Hij staat niet in JavaScript zoals de andere tests in deze map, en dat is met
opzet: wat hier getest wordt zit niet in de app maar in de database. De regels
die bepalen wie een lid mag toevoegen gelden ook voor iemand die de app links
laat liggen en zelf verzoeken naar de server stuurt. Een test in de browser zou
dus precies het verkeerde meten.

## Hoe je hem draait

1. Draai eerst eenmalig `server/04-leden-fix (open mij en kopieer alles).txt`.
2. Open in Supabase de **SQL Editor**.
3. Plak het hele blok onderaan deze pagina (of het bestand
   `tests/leden-policy.test.sql`, dat is hetzelfde) en klik op **Run**.
4. Lees de uitkomst bij **Messages**, onderin het resultaatvenster.

De test maakt zijn eigen testclub en drie testaccounts aan en draait alles
daarna weer terug. **Er blijft niets van achter** en er wordt niets aan je
echte clubs veranderd. Je kunt hem zo vaak draaien als je wilt, ook op de
live-database.

## Wat je hoort te zien

```
1. eigenaar richt club op                  -> GELUKT   (verwacht: GELUKT)
2. eigenaar nodigt trainer uit             -> GELUKT   (verwacht: GELUKT)
3. eigenaar nodigt kijker uit              -> GELUKT   (verwacht: GELUKT)
4. kijker maakt zichzelf eigenaar          -> MISLUKT  (verwacht: MISLUKT)
5. kijker zet de eigenaar eruit            -> 0 rijen  (verwacht: 0 rijen)
6. trainer verlaat zelf de club            -> 1 rij    (verwacht: 1 rij)
ALLE ZES SCENARIO'S ZOALS VERWACHT.
```

Staat er onderaan `LET OP: ... scenario(s) wijken af`, kijk dan welke regel niet
klopt. Regels met `<< LEK` erachter zijn de ernstige: daar kan iemand iets wat
hij niet mag.

## De zes scenario's

| # | Scenario | Verwacht | Waarom dit ertoe doet |
|---|---|---|---|
| 1 | Club oprichten via `nieuwe_club()` | lukt | Dit is de enige manier waarop een club ontstaat. Gaat dit stuk, dan kan niemand meer beginnen. |
| 2 | Eigenaar nodigt een trainer uit | lukt | Dit was maandenlang kapot (zie hieronder). Het uitnodigingssysteem hangt hieraan. |
| 3 | Eigenaar nodigt een kijker uit | lukt | Zelfde als 2, maar met de rol die niets mag wijzigen. |
| 4 | Kijker promoveert zichzelf tot eigenaar | mislukt, met `new row violates row-level security policy` | Dit is de aanval waar de reparatie om draait. Lukt dit, dan is elke rol in de app betekenisloos. |
| 5 | Kijker gooit de eigenaar eruit | 0 rijen geraakt | Wie de eigenaar kan verwijderen, neemt de club over. Let op: hier hoort géén foutmelding te komen, gewoon nul rijen. Zo werkt de beveiliging bij verwijderen: rijen die je niet mag aanraken bestaan voor jou simpelweg niet. |
| 6 | Trainer verlaat zelf de club | lukt | Jezelf terugtrekken moet blijven kunnen. Dit is precies het verschil tussen de regel voor toevoegen en die voor weghalen. |

### Waarom scenario 4 eerst uit de club stapt

In het script stapt de kijker eerst uit de club voordat hij zichzelf als
eigenaar probeert toe te voegen. Dat lijkt omslachtig, maar zonder die stap
heeft hij al een regel in die club en wijst de database hem af omdat hij er
dubbel in zou staan — niet omdat hij het niet mág. De test zou dan slagen om de
verkeerde reden, en dat is hetzelfde als geen test.

## De opzettelijke fouten

Harde regel 5 uit `CLAUDE.md`: een test die niets vangt is erger dan geen test.
Hieronder staan twee kapotte versies. Zet er één terug, draai de test opnieuw,
en controleer dat de bijbehorende regel omslaat. Draai daarna
`server/04-leden-fix.sql` opnieuw om alles te herstellen.

**Fout A — de zelf-toevoegtak terugzetten. Scenario 4 moet dan slagen.**

```sql
drop policy if exists leden_toevoegen on public.leden;
create policy leden_toevoegen on public.leden for insert
  with check (gebruiker_id = auth.uid() or public.is_eigenaar(club_id));
```

Je hoort dan te zien:
`4. kijker maakt zichzelf eigenaar -> GELUKT (verwacht: MISLUKT)  << LEK`

Dit is exact de tak die vóór de reparatie in het schema stond. Hij was
onbereikbaar doordat de regel er eerder op vastliep, en zou bij het wegnemen van
die fout vanzelf zijn gaan werken. Daarom is hij bij toevoegen geschrapt.

**Fout B — de regel voor weghalen oprekken tot "elk clublid". Scenario 5 moet dan slagen.**

```sql
drop policy if exists leden_weghalen on public.leden;
create policy leden_weghalen on public.leden for delete
  using (club_id in (select public.mijn_clubs()));
```

Je hoort dan te zien:
`5. kijker zet de eigenaar eruit -> 1 rijen (verwacht: 0 rijen)  << LEK`

Dit is geen fout die er ooit stond, maar wel de meest voor de hand liggende
verschrijving bij een volgende verbouwing: "leden mogen leden beheren" klinkt
redelijk en geeft een kijker de macht om de eigenaar te verwijderen.

**Slaat de regel niet om, dan meet de test niets** en moet je hem repareren
voordat je hem vertrouwt.

## Wat er kapot was

In `server/01-schema.sql` keken de regels `leden_toevoegen` en `leden_weghalen`
allebei zelf in de tabel `leden`. Postgres gaat daar in een kring rond en stopt
met `infinite recursion detected in policy for relation "leden"`. Elke poging
om iemand aan een club toe te voegen of eruit te halen mislukte dus. Dat is
nooit opgevallen omdat de app zelf nooit in die tabel schrijft — alleen
`nieuwe_club()` doet dat, en die gaat langs de regels heen.

De reparatie zet er de hulpfunctie `public.is_eigenaar()` naast, die de vraag
"ben ik eigenaar van deze club?" buiten de regels om stelt. Daarmee is de kring
verbroken. Dezelfde aanpak als `mijn_clubs()` en `mag_schrijven()`, zodat er
één plek is waar die vraag beantwoord wordt.

`server/02-controle.sql` bevat sindsdien twee controles die dit soort fouten
opsporen zonder dat je de tabel hoeft te gebruiken.

## Het script

```sql
-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — test: wie mag leden toevoegen en weghalen?
--  ─────────────────────────────────────────────────────────────
--  Plak dit hele bestand in de SQL Editor van Supabase en klik op
--  Run. Kijk daarna bij "Messages" (of onderin het resultaat-
--  venster) naar de regels die eruit rollen.
--
--  Alles gebeurt binnen één transactie die eindigt met "rollback".
--  Er blijft dus niets van achter: geen testclub, geen test-
--  accounts, geen testleden. Je kunt dit zo vaak draaien als je wilt.
--
--  De volledige uitleg per scenario staat in
--  tests/leden-policy.test.md. Lees die als een regel afwijkt.
-- ══════════════════════════════════════════════════════════════
begin;

do $test$
declare
  eigenaar uuid := '0e1d0000-0000-4000-a000-000000000001';
  trainer  uuid := '0e1d0000-0000-4000-a000-000000000002';
  kijker   uuid := '0e1d0000-0000-4000-a000-000000000003';
  club     uuid;
  geraakt  int;
  afwijkingen int := 0;
begin
  -- ── Opzet ──────────────────────────────────────────────────
  -- Drie nepaccounts. Ze verdwijnen weer bij de rollback onderaan.
  insert into auth.users (id, email) values
    (eigenaar, 'test-eigenaar@teamtakkie.test'),
    (trainer,  'test-trainer@teamtakkie.test'),
    (kijker,   'test-kijker@teamtakkie.test');

  raise notice '─────────────────────────────────────────────';

  -- ── 1. Club oprichten via nieuwe_club() — moet lukken ──────
  perform set_config('request.jwt.claim.sub', eigenaar::text, true);
  set local role authenticated;
  begin
    club := public.nieuwe_club('Testclub', 'Test-eigenaar');
    raise notice '1. eigenaar richt club op                  -> GELUKT   (verwacht: GELUKT)';
  exception when others then
    club := null;
    afwijkingen := afwijkingen + 1;
    raise notice '1. eigenaar richt club op                  -> MISLUKT  (verwacht: GELUKT) %', sqlerrm;
  end;

  if club is null then
    raise notice 'Gestopt: zonder club valt de rest niet te meten.';
    reset role;
    return;
  end if;

  -- ── 2. Eigenaar nodigt een trainer uit — moet lukken ───────
  begin
    insert into public.leden (club_id, gebruiker_id, naam, rol)
      values (club, trainer, 'Test-trainer', 'trainer');
    raise notice '2. eigenaar nodigt trainer uit             -> GELUKT   (verwacht: GELUKT)';
  exception when others then
    afwijkingen := afwijkingen + 1;
    raise notice '2. eigenaar nodigt trainer uit             -> MISLUKT  (verwacht: GELUKT) %', sqlerrm;
  end;

  -- ── 3. Eigenaar nodigt een kijker uit — moet lukken ────────
  begin
    insert into public.leden (club_id, gebruiker_id, naam, rol)
      values (club, kijker, 'Test-kijker', 'kijker');
    raise notice '3. eigenaar nodigt kijker uit              -> GELUKT   (verwacht: GELUKT)';
  exception when others then
    afwijkingen := afwijkingen + 1;
    raise notice '3. eigenaar nodigt kijker uit              -> MISLUKT  (verwacht: GELUKT) %', sqlerrm;
  end;

  -- ── 4. Kijker promoveert zichzelf — moet MISLUKKEN ─────────
  -- Eerst stapt hij uit de club. Dat mag, en dat hoort te mogen.
  -- Daarna probeert hij als eigenaar terug te komen. Die stap uit
  -- de club is nodig omdat hij anders al een regel in deze club
  -- heeft en de database hem op dát dubbele lid zou afwijzen — dan
  -- zou deze test slagen om de verkeerde reden.
  perform set_config('request.jwt.claim.sub', kijker::text, true);
  delete from public.leden where club_id = club and gebruiker_id = kijker;

  begin
    insert into public.leden (club_id, gebruiker_id, naam, rol)
      values (club, kijker, 'Test-kijker', 'eigenaar');
    afwijkingen := afwijkingen + 1;
    raise notice '4. kijker maakt zichzelf eigenaar          -> GELUKT   (verwacht: MISLUKT)  << LEK';
  exception when insufficient_privilege then
    raise notice '4. kijker maakt zichzelf eigenaar          -> MISLUKT  (verwacht: MISLUKT)';
  when others then
    afwijkingen := afwijkingen + 1;
    raise notice '4. kijker maakt zichzelf eigenaar          -> MISLUKT om de verkeerde reden: %', sqlerrm;
  end;

  -- Zet hem terug als kijker, zodat scenario 5 een echt clublid is.
  -- Eerst weghalen: is scenario 4 wél gelukt, dan staat hij er nu als
  -- eigenaar in en zou deze regel op een dubbel lid stuklopen -- en dan
  -- zie je de uitslag van 5 en 6 helemaal niet meer.
  perform set_config('request.jwt.claim.sub', eigenaar::text, true);
  delete from public.leden where club_id = club and gebruiker_id = kijker;
  insert into public.leden (club_id, gebruiker_id, naam, rol)
    values (club, kijker, 'Test-kijker', 'kijker');

  -- ── 5. Kijker gooit de eigenaar eruit — moet 0 rijen raken ─
  perform set_config('request.jwt.claim.sub', kijker::text, true);
  delete from public.leden where club_id = club and gebruiker_id = eigenaar;
  get diagnostics geraakt = row_count;
  if geraakt = 0 then
    raise notice '5. kijker zet de eigenaar eruit            -> 0 rijen  (verwacht: 0 rijen)';
  else
    afwijkingen := afwijkingen + 1;
    raise notice '5. kijker zet de eigenaar eruit            -> % rijen  (verwacht: 0 rijen)  << LEK', geraakt;
  end if;

  -- ── 6. Trainer verlaat zelf de club — moet lukken ──────────
  perform set_config('request.jwt.claim.sub', trainer::text, true);
  delete from public.leden where club_id = club and gebruiker_id = trainer;
  get diagnostics geraakt = row_count;
  if geraakt = 1 then
    raise notice '6. trainer verlaat zelf de club            -> 1 rij    (verwacht: 1 rij)';
  else
    afwijkingen := afwijkingen + 1;
    raise notice '6. trainer verlaat zelf de club            -> % rijen  (verwacht: 1 rij)', geraakt;
  end if;

  reset role;

  raise notice '─────────────────────────────────────────────';
  if afwijkingen = 0 then
    raise notice 'ALLE ZES SCENARIO''S ZOALS VERWACHT.';
  else
    raise notice 'LET OP: % scenario(s) wijken af. Zie tests/leden-policy.test.md.', afwijkingen;
  end if;
  raise notice '─────────────────────────────────────────────';
end
$test$;

-- Alles terugdraaien. Er blijft niets van deze test achter.
rollback;
```
