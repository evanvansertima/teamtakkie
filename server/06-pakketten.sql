-- ══════════════════════════════════════════════════════════════
--  TEAMTAKKIE — pakketten afdwingen op de server
--  ─────────────────────────────────────────────────────────────
--  Draai dit ná 01-schema.sql (en ná 04-leden-fix.sql). Plak alles
--  in de SQL Editor van Supabase en klik op Run. Het duurt een
--  seconde. Er worden geen gegevens aangepast of weggegooid.
--
--  WAAROM
--  Tot nu toe staat in de browser hoeveel teams een pakket mag. Wie
--  de ontwikkelaarsconsole opent, zet zichzelf daar in tien tellen
--  op Max. Vanaf nu geeft de database het antwoord, en daar komt
--  niemand langs — ook niet met een zelfgemaakt verzoek.
--
--  WAT DIT BESTAND DOET, IN DRIE STUKKEN
--
--  1. Het zet het aanmaken van verenigingen dicht. Nu kan iederéén
--     die het adres van de server kent er verenigingen in schrijven,
--     ook zonder account. Geen datalek — lezen mag hij nog steeds
--     niets — maar wel een volle database en een volle rekening.
--     Na dit bestand kan een vereniging alleen nog ontstaan via de
--     functie nieuwe_club(), dus alleen door iemand die is ingelogd,
--     en hoogstens drie keer per persoon.
--
--  2. Het zet een tabel neer waarin staat wat een pakket mag:
--     hoeveel teams en welke onderdelen. Dat is met opzet een
--     TABEL en geen stuk programmatuur: je verandert de prijslijst
--     straks met één update-regel, zonder dat er iets herschreven
--     hoeft te worden.
--
--  3. Het zet een bewaker op de teams-tabel die het aantal teams
--     per vereniging afdwingt. Die bewaker vuurt bij élke manier van
--     schrijven, ook als de app zijn hele teamlijst in één keer
--     opnieuw omhoog duwt.
--
--  WAT ER BEWUST NIET IN ZIT
--  Een slot op de onderdelen (trainingen, analyse, clubhuis). Dat
--  hangt af van hoe de prijzen eruit gaan zien, en het is maar half
--  af te dwingen zolang alle gegevens van een team in één blok
--  tekst zitten. De kolom "modules" staat er al wel in, zodat de
--  getallen straks niet nóg een keer hoeven te verhuizen.
--
--  WAT JE DAARNA HOORT TE ZIEN
--  Onderaan staat een controle. Die geeft een tabel terug met
--  ongeveer tien regels. In de kolom "oordeel" hoort overal
--  "in orde" te staan, en nergens "LET OP".
--
--  TERUGDRAAIEN
--  Helemaal onderaan staat de oude situatie klaar, uitgecommen-
--  tarieerd. Haal daar de twee streepjes weg en draai alleen dat
--  stuk, dan is alles weer zoals het was.
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
--  DEEL 1 — HET AANMAKEN VAN VERENIGINGEN DICHTZETTEN
-- ══════════════════════════════════════════════════════════════

-- De regel clubs_maken stond op "with check (true)": iedereen mag
-- schrijven, en "iedereen" is bij Supabase ook de bezoeker zónder
-- account, want de publieke sleutel staat gewoon in de app.
--
-- Hem weghalen is genoeg. Staat er geen enkele regel voor insert,
-- dan weigert de database elke rechtstreekse insert op clubs. De
-- functie nieuwe_club() hieronder heeft er geen last van: die is
-- "security definer" en werkt namens de database zelf.
--
-- Nagekeken: de app schrijft nergens rechtstreeks in clubs. Hij
-- roept nieuwe_club aan, leest de club en past hem aan met PATCH —
-- en voor dat aanpassen bestaat clubs_wijzigen, die blijft staan.
drop policy if exists clubs_maken on public.clubs;

-- En een rem op de functie zelf. Zonder rem kan iemand mét account
-- nieuwe_club duizend keer aanroepen. Drie verenigingen per persoon,
-- want iemand kan echt bij twee verenigingen in het bestuur zitten;
-- bij drie houdt het op.
--
-- Dat getal staat in de tabel pakket_instellingen hieronder, niet
-- hier. Wil je het veranderen, dan is dat één update-regel.
--
-- Verder is deze functie letterlijk gelijk aan die in 01-schema.sql.
create or replace function public.nieuwe_club(club_naam text, mijn_naam text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  nieuwe uuid;
  grens  int;
  bezet  int;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  select i.getal into grens
  from public.pakket_instellingen i
  where i.sleutel = 'clubs_per_gebruiker';

  if grens is not null then
    select count(*) into bezet
    from public.leden
    where gebruiker_id = auth.uid() and rol = 'eigenaar';

    if bezet >= grens then
      raise exception
        'Je kunt hoogstens % verenigingen oprichten; je hebt er al %. Neem contact op als je er meer nodig hebt.',
        grens, bezet;
    end if;
  end if;

  insert into public.clubs (naam) values (coalesce(nullif(trim(club_naam), ''), 'Mijn club'))
    returning id into nieuwe;
  insert into public.leden (club_id, gebruiker_id, naam, rol)
    values (nieuwe, auth.uid(), mijn_naam, 'eigenaar');
  insert into public.abonnementen (club_id, pakket) values (nieuwe, 'free');
  return nieuwe;
end $$;

grant execute on function public.nieuwe_club(text, text) to authenticated;


-- ══════════════════════════════════════════════════════════════
--  DEEL 2 — DE PRIJSLIJST ALS TABEL
-- ══════════════════════════════════════════════════════════════

-- ── Losse getallen die nergens anders thuishoren ─────────────
--  Eén plek, zodat een getal nooit op twee plaatsen staat en die
--  twee het oneens kunnen worden.
create table if not exists public.pakket_instellingen (
  sleutel text primary key,
  getal   int not null,
  uitleg  text
);

insert into public.pakket_instellingen (sleutel, getal, uitleg) values
  ('respijt_dagen', 14,
   'Zoveel dagen na de einddatum blijft een pakket nog gelden. Daarna valt de vereniging terug op free.'),
  ('clubs_per_gebruiker', 3,
   'Hoeveel verenigingen één persoon zelf mag oprichten.')
on conflict (sleutel) do nothing;

-- ── Wat een pakket mag ───────────────────────────────────────
--  teams   = null betekent onbeperkt.
--  modules is nog nergens voor in gebruik; hij staat er alvast in.
--
--  LET OP: deze regels gaan naar verwachting nog veranderen. De
--  prijsstelling ligt niet vast — het kunnen pakketten blijven, maar
--  het kan ook één prijs per gebruiker of één prijs per team worden.
--  In alle drie de gevallen blijft deze tabel kloppen en veranderen
--  alleen de regels erin. Voorbeeld:
--
--      update public.pakket_grenzen set teams = 5 where pakket = 'basic';
--
--  Verder hoeft er dan niets gedraaid te worden: de bewaker op teams
--  leest deze tabel bij elke schrijfpoging opnieuw.
--
--  Zet je er een pakket bij, voeg het dan ook toe aan de check op
--  public.abonnementen in 01-schema.sql, anders kan niemand het
--  krijgen.
create table if not exists public.pakket_grenzen (
  pakket  text primary key,
  teams   int,
  modules text[] not null default '{}'
);

insert into public.pakket_grenzen (pakket, teams, modules) values
  ('free',  1,    array['basis']),
  ('basic', 3,    array['basis','trainingen','ontwikkeling']),
  ('pro',   15,   array['basis','trainingen','ontwikkeling','analyse','clubhuis']),
  ('max',   null, array['basis','trainingen','ontwikkeling','analyse','clubhuis'])
on conflict (pakket) do nothing;

-- Beide tabellen mogen gelezen worden door wie is ingelogd — het is
-- een prijslijst, daar is niets geheims aan. Schrijven mag niemand;
-- er staat met opzet geen enkele regel voor insert of update, net als
-- bij abonnementen. Aanpassen doe je zelf, hier in Supabase.
alter table public.pakket_grenzen      enable row level security;
alter table public.pakket_instellingen enable row level security;

drop policy if exists pakket_grenzen_lezen on public.pakket_grenzen;
create policy pakket_grenzen_lezen on public.pakket_grenzen for select
  to authenticated using (true);

drop policy if exists pakket_instellingen_lezen on public.pakket_instellingen;
create policy pakket_instellingen_lezen on public.pakket_instellingen for select
  to authenticated using (true);

-- ── Welk pakket heeft deze vereniging écht? ──────────────────
--  Eén functie, zodat overal hetzelfde antwoord komt — net als
--  mijn_clubs() en mag_schrijven() in 01-schema.sql.
--
--  De regels:
--    geen abonnement        -> free
--    geen einddatum         -> het pakket geldt onbeperkt
--    einddatum in de toekomst -> het pakket geldt
--    einddatum net voorbij  -> het pakket geldt nog tijdens de
--                              respijtperiode (nu 14 dagen)
--    daarna                 -> free
--
--  Die respijt is er omdat een mislukte incasso of een vergeten
--  overschrijving geen reden is om iemand halverwege het seizoen
--  zijn teams af te nemen. Het getal staat in pakket_instellingen.
--
--  security definer is nodig: zonder dat loopt de functie vast op de
--  leesregel van abonnementen zodra iemand hem voor een andere
--  vereniging aanroept dan zijn eigen.
create or replace function public.pakket_van_club(doel uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case
              when a.geldig_tot is null then a.pakket
              when current_date <= a.geldig_tot
                   + coalesce((select i.getal from public.pakket_instellingen i
                               where i.sleutel = 'respijt_dagen'), 0)
                then a.pakket
              else 'free'
            end
     from public.abonnementen a
     where a.club_id = doel),
    'free')
$$;

grant execute on function public.pakket_van_club(uuid) to authenticated;

-- Handig voor de app: hoeveel teams mag ík bij deze vereniging?
-- Geeft null terug bij onbeperkt.
create or replace function public.teams_grens(doel uuid)
returns int language sql stable security definer set search_path = public as $$
  select g.teams from public.pakket_grenzen g
  where g.pakket = public.pakket_van_club(doel)
$$;

grant execute on function public.teams_grens(uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════
--  DEEL 3 — DE BEWAKER OP HET AANTAL TEAMS
-- ══════════════════════════════════════════════════════════════

-- Waarom een trigger en geen beveiligingsregel:
--
--   · Een regel die weigert geeft de app een kale 403 zonder tekst.
--     Daar kan de app geen fatsoenlijke melding van maken. Een
--     trigger geeft een zin terug die je gewoon kunt laten zien.
--   · Een trigger vuurt óók als er via een "security definer"-functie
--     wordt geschreven. Beveiligingsregels doen dat niet.
--
-- Twee valkuilen zitten hier verwerkt:
--
--   1. De app duwt bij élke synchronisatie zijn hele teamlijst
--      opnieuw omhoog ("resolution=merge-duplicates"). Dat wordt in
--      de database een insert, óók voor teams die al lang bestaan.
--      Een domme telling zou dan bij de tweede synchronisatie een
--      team weigeren dat er al jaren staat. Daarom: bestaat de regel
--      al, dan is het geen nieuw team en laten we hem door.
--   2. Een team wordt nooit echt verwijderd, het krijgt een datum in
--      verwijderd_op. Zonder een controle bij het wijzigen zou
--      iemand aan zijn limiet een oud team kunnen "terughalen" door
--      die datum weer leeg te maken. Vandaar ook "or update".
--
-- En omgekeerd: een vereniging die zakt van pro naar free — door een
-- verlopen abonnement bijvoorbeeld — houdt gewoon al zijn bestaande
-- teams en kan blijven synchroniseren. Alleen een nieuw team erbij
-- lukt niet meer. Zou dat niet zo zijn, dan zou zo'n vereniging van
-- de ene dag op de andere helemaal niets meer kunnen opslaan.
create or replace function public.teamlimiet_bewaken()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pk    text;
  grens int;
  bezet int;
begin
  -- Weggooien mag altijd.
  if new.verwijderd_op is not null then
    return new;
  end if;

  -- Bestond deze regel al en was hij al in gebruik? Dan is dit geen
  -- nieuw team maar een hersynchronisatie of een naamswijziging.
  if tg_op = 'INSERT' then
    if exists (select 1 from public.teams t
               where t.id = new.id and t.verwijderd_op is null) then
      return new;
    end if;
  else
    -- Bij wijzigen alleen controleren als het team uit de prullenbak
    -- komt of naar een andere vereniging verhuist.
    if old.verwijderd_op is null and old.club_id = new.club_id then
      return new;
    end if;
  end if;

  pk := public.pakket_van_club(new.club_id);

  select g.teams into grens from public.pakket_grenzen g where g.pakket = pk;
  if not found then
    -- Onbekend pakket: dan maar de zuinigste variant, niet de ruimste.
    select g.teams into grens from public.pakket_grenzen g where g.pakket = 'free';
  end if;

  -- null betekent onbeperkt.
  if grens is null then
    return new;
  end if;

  -- De regel die we nu behandelen telt niet mee.
  bezet := (select count(*) from public.teams
            where club_id = new.club_id
              and verwijderd_op is null
              and id <> new.id);

  if bezet >= grens then
    raise exception
      'Met het pakket % kun je % team(s) beheren, en die zijn allemaal in gebruik. Verwijder eerst een team of kies een groter pakket.',
      pk, grens;
  end if;

  return new;
end $$;

drop trigger if exists teams_teamlimiet on public.teams;
create trigger teams_teamlimiet before insert or update on public.teams
  for each row execute function public.teamlimiet_bewaken();


-- ══════════════════════════════════════════════════════════════
--  GRENZEN OP DE GEGEVENS ZELF
--  ─────────────────────────────────────────────────────────────
--  Twee remmen die niets met pakketten te maken hebben, maar met
--  misbruik. Ze gelden voor iedereen, ook voor Max.
--
--  1. Hoogstens 50 spelers in een team.
--  2. Hoogstens 10 MB in één rij.
--
--  Waarom deze twee: iemand met slechte bedoelingen hoeft geen
--  10.000 spelers aan te maken om je Supabase-rekening op te
--  blazen -- één speler met een notitieveld van 40 MB doet
--  hetzelfde. De eerste rem vangt het ene geval, de tweede het
--  andere.
--
--  De getallen zijn gemeten, niet gegokt. De grootste rij in de
--  back-up van 10 september is fch_tenue_v1 met 3,86 MB, en een
--  echte selectie telt 18 spelers. 50 en 10 MB laten dus alles
--  door wat vandaag legitiem is, met ruimte voor spelersfoto's
--  (die zitten IN de spelerslijst, in het veld "foto").
--
--  Zet je dit hoger of lager: het zijn twee getallen, hieronder,
--  en verder niets.
-- ══════════════════════════════════════════════════════════════

-- Een sleutel heet op de server bijvoorbeeld "2026-2027::fch_spelers_v1".
-- Deze functie gooit alles vóór de eerste "::" weg en houdt de kale
-- naam over. Gelijk aan basisUitSleutel() in de app. Geen regex met
-- .* gebruiken: die is hebberig en pakt bij een dubbel voorvoegsel de
-- verkeerde helft.
create or replace function public.basis_van_sleutel(s text)
returns text language sql immutable as $$
  select case when position('::' in s) = 0
              then s
              else substr(s, position('::' in s) + 2)
         end
$$;
grant execute on function public.basis_van_sleutel(text) to authenticated;

create or replace function public.gegevens_grenzen_bewaken()
returns trigger language plpgsql as $$
declare
  MAX_SPELERS constant int := 50;
  MAX_BYTES   constant int := 10 * 1024 * 1024;   -- 10 MB
  omvang int;
begin
  -- Rem 1: het aantal spelers.
  -- jsonb_typeof erbij, want een kapotte of lege rij is geen lijst en
  -- jsonb_array_length zou daarop een harde fout geven -- dan blokkeer
  -- je het opslaan om de verkeerde reden.
  if public.basis_van_sleutel(new.sleutel) = 'fch_spelers_v1'
     and jsonb_typeof(new.waarde) = 'array'
     and jsonb_array_length(new.waarde) > MAX_SPELERS then
    raise exception
      'Een team kan hoogstens % spelers hebben; deze lijst heeft er %. Splits de selectie over twee teams.',
      MAX_SPELERS, jsonb_array_length(new.waarde);
  end if;

  -- Rem 2: de omvang van de rij.
  -- octet_length op de tekstvorm en niet pg_column_size, want die
  -- laatste meet ná compressie en zegt dus niets over wat iemand
  -- werkelijk opstuurt.
  omvang := octet_length(new.waarde::text);
  if omvang > MAX_BYTES then
    raise exception
      'Deze gegevens zijn % MB en dat is meer dan de % MB per onderdeel. Verklein de foto''s of splits het op.',
      round(omvang / 1048576.0, 1), MAX_BYTES / 1048576;
  end if;

  return new;
end $$;

drop trigger if exists gegevens_grenzen on public.gegevens;
create trigger gegevens_grenzen before insert or update on public.gegevens
  for each row execute function public.gegevens_grenzen_bewaken();


-- ══════════════════════════════════════════════════════════════
--  CONTROLE — is alles goed terechtgekomen?
--  ─────────────────────────────────────────────────────────────
--  Hieronder komt een tabel terug. In de kolom "oordeel" hoort
--  overal "in orde" te staan. Staat er ergens "LET OP", draai dit
--  bestand dan nog een keer; er kan niets stukgaan van twee keer
--  draaien.
-- ══════════════════════════════════════════════════════════════
select 'clubs: geen insert-regel meer' as controle,
       coalesce((select string_agg(polname, ', ') from pg_policy
                 where polrelid = 'public.clubs'::regclass and polcmd = 'a'),
                'geen') as gevonden,
       case when not exists (select 1 from pg_policy
                             where polrelid = 'public.clubs'::regclass and polcmd = 'a')
            then 'in orde' else 'LET OP' end as oordeel
union all
select 'de bewaker op teams staat aan',
       coalesce((select tgname from pg_trigger
                 where tgrelid = 'public.teams'::regclass and tgname = 'teams_teamlimiet'),
                'ontbreekt'),
       case when exists (select 1 from pg_trigger
                         where tgrelid = 'public.teams'::regclass and tgname = 'teams_teamlimiet')
            then 'in orde' else 'LET OP' end
union all
select 'de functie pakket_van_club bestaat',
       coalesce((select 'ja' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'pakket_van_club' limit 1), 'nee'),
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and p.proname = 'pakket_van_club')
            then 'in orde' else 'LET OP' end
union all
select 'de rem op nieuwe_club zit erin',
       case when (select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'nieuwe_club' limit 1)
                 like '%clubs_per_gebruiker%' then 'ja' else 'nee' end,
       case when (select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'nieuwe_club' limit 1)
                 like '%clubs_per_gebruiker%' then 'in orde' else 'LET OP' end
union all
select 'instelling: ' || sleutel, getal::text, 'in orde' from public.pakket_instellingen
union all
select 'pakket ' || pakket,
       coalesce(teams::text, 'onbeperkt') || ' team(s), onderdelen: ' || array_to_string(modules, ' '),
       'in orde'
from public.pakket_grenzen
order by 1;


-- ══════════════════════════════════════════════════════════════
--  TERUGDRAAIEN
--  ─────────────────────────────────────────────────────────────
--  Haal bij de regels hieronder de twee streepjes vooraan weg en
--  draai alleen dat stuk. Daarmee is alles weer zoals vóór dit
--  bestand: iedereen mag weer verenigingen aanmaken, ook zonder
--  account, en het aantal teams wordt niet meer afgedwongen.
-- ══════════════════════════════════════════════════════════════

-- -- 1. De bewaker op teams weg
-- drop trigger if exists teams_teamlimiet on public.teams;
-- drop function if exists public.teamlimiet_bewaken();
--
-- -- 2. De prijslijst weg
-- drop function if exists public.teams_grens(uuid);
-- drop function if exists public.pakket_van_club(uuid);
-- drop table if exists public.pakket_grenzen;
-- drop table if exists public.pakket_instellingen;
--
-- -- 3. De oude nieuwe_club terug, zonder rem
-- --    (let op: dit moet ná stap 2, want de rem leest die tabel)
-- create or replace function public.nieuwe_club(club_naam text, mijn_naam text default null)
-- returns uuid language plpgsql security definer set search_path = public as $$
-- declare nieuwe uuid;
-- begin
--   if auth.uid() is null then
--     raise exception 'Niet ingelogd';
--   end if;
--   insert into public.clubs (naam) values (coalesce(nullif(trim(club_naam), ''), 'Mijn club'))
--     returning id into nieuwe;
--   insert into public.leden (club_id, gebruiker_id, naam, rol)
--     values (nieuwe, auth.uid(), mijn_naam, 'eigenaar');
--   insert into public.abonnementen (club_id, pakket) values (nieuwe, 'free');
--   return nieuwe;
-- end $$;
--
-- -- 4. De oude, wagenwijd open regel op clubs terug
-- drop trigger if exists gegevens_grenzen on public.gegevens;
-- drop function if exists public.gegevens_grenzen_bewaken();
-- drop function if exists public.basis_van_sleutel(text);
-- drop policy if exists clubs_maken on public.clubs;
-- create policy clubs_maken on public.clubs for insert
--   with check (true);
