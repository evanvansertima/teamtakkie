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
