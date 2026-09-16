# TEAMTAKKIE

Teammanagement-app voor amateurvoetbalclubs. Draait in de browser.

Gebouwd vanuit FC Harlingen JO19-2. In de code staat geen enkele verwijzing
naar een andere sport — `grep -i korfbal online/index.html` geeft nul
treffers. Wil je weten of iets ook voor korfbal of handbal werkt: dat is
een openstaande vraag aan Evan, geen vaststaand gegeven.
Gebouwd en onderhouden door Evan van Sertima (geen programmeur van beroep).

**Schrijf en antwoord in het Nederlands.** Evan is geen ontwikkelaar. Leg
vaktermen uit in gewone taal, de eerste keer dat je ze gebruikt. Zeg nooit
"gewoon even" over iets dat een uur kost.

---

## Waar de app staat

| Pad | Wat het is |
|---|---|
| `src/app.jsx` | **De bron van de app.** De JSX die je bewerkt. Commentaar staat alleen hier. |
| `src/index.html` | Sjabloon: kop, stijl, de twee scriptjes vóór de app |
| `tools/bouw.js` | Vertaalt `src/` naar `online/index.html`. Draai dit vóór elke uitrol — `python3 tools/check.py` waarschuwt hard als je dat vergeet. |
| `online/index.html` | **Het bouwproduct. Dit is wat live staat**, en dus ook wat je naar Netlify sleept. Niet meer rechtstreeks bewerken sinds de bouwstap (16 september 2026) — wijzigingen gaan via `src/app.jsx`. |
| `online/sw.js` | Service worker (offline gebruik) |
| `server/*.sql` | Het Supabase-schema: tabellen, RLS-policies, beheerfuncties |
| `tests/` | Tests die met kale `node` draaien, geen framework |
| `docs/` | Beoordelingen en plannen — **lees deze voordat je iets groots voorstelt** |
| `legacy/` | Het oude prototype van één bestand. Alleen ter referentie. |
| `backend/`, `frontend/`, `caddy/`, `docker-compose.yml` | Een afgebroken poging tot een AdonisJS + React-versie (augustus 2026). **Niet in gebruik.** Raak dit niet aan tenzij Evan er expliciet om vraagt. |
| `Claude outputs/`, `Back-ups/` | Niet in git (zie `.gitignore`) |

Git: `github.com/evanvansertima/fc-harlingen` — de repo heet nog naar het
eerste team, de app heet TEAMTAKKIE.

## Hoe het technisch in elkaar zit

React 18 vanaf een CDN. Sinds 16 september 2026 vertaalt `esbuild` de JSX
vooraf (`node tools/bouw.js`, van `src/app.jsx` naar `online/index.html`) —
niet meer Babel in de browser van elke bezoeker; dat scheelde 2,2 seconden
laadtijd en 2,8 MB download. Verder Three.js (3D-sportpark) en jsPDF
(exports). Data staat in Supabase (Postgres), met Row Level Security als
enige toegangscontrole.

Uitrollen gaat met de hand: `node tools/bouw.js` draaien, dan de map
`online/` naar Netlify slepen.

## Harde regels

1. **Niet herschrijven.** De verleiding om opnieuw te beginnen in Next.js is
   voorspelbaar en is de bekendste manier om een werkend product te verliezen.
   Het domeinbegrip in dit bestand is niet in een sprint na te bouwen.
2. **Elke wijziging houdt `online/index.html` uitrolbaar.** Er komt nooit een
   halve verbouwing naast een draaiende app te staan.
3. **Tests horen in `tests/` in de repo.** Niet in `/tmp`, niet in je
   werkomgeving. Een test die verdwijnt als de sessie sluit is geen bewijs.
   Dit is al twee keer misgegaan.
4. **Commentaar legt het *waarom* uit, niet het *wat*.** Dat is de gewoonte
   die dit bestand leesbaar houdt ondanks 33.000 regels, en het is op dit
   moment de enige overdrachtsdocumentatie. Doorbreek die gewoonte niet.
5. **Controleer je werk met opzettelijke fouten.** Zet een fout terug en kijk
   of de test rood wordt. Een groene test die niets vangt is erger dan geen test.
6. **Klopt de marketingsite nog?** Verkoop nooit een functie of limiet die de
   software niet afdwingt.
7. **Vraag het liever dan het in te vullen.** Als Evan iets niet heeft gezegd,
   verzin het dan niet — stel de vraag. Dit is al twee keer misgegaan op één
   dag: "ook voor korfbalclubs" stond nergens op, en "Free krijgt de volledige
   app" was een aanname die het hele verkoopmodel onderuit haalde. Een gat
   invullen kost hem meer dan een vraag beantwoorden.

## Wat er stond, en wat er nu staat

`docs/technische-beoordeling.md` (10 september 2026) noemde twee dingen die
het meest kostten. Beide zijn intussen opgelost (16 september 2026):

1. ~~Het abonnement schermt niets af.~~ `magPagina()` wordt nu op negen
   plekken echt aangeroepen (menu, tabbladen, snelkoppelingen). `pakketNu()`
   begint bij het goedkoopste pakket, niet meer bij "max", en het pakket komt
   via `syncPakket()` rechtstreeks van de server (tabel `abonnementen`) — de
   database is de enige bron van waarheid, een geopende slot in de browser
   verandert niets aan wat `06-pakketten.sql` op de server toestaat.
2. ~~Van geen enkele versie is aan te tonen dat hij werkt.~~ Er zijn nu 269
   tests in `tests/` (kaal `node`, geen framework), `tools/check.py` (nu
   gericht op de echte bron) en een gouden origineel met 19 vaste opnames
   (`tools/gouden-origineel.js`) die elke wijziging pixel voor pixel toetsen.

Wat nog wél openstaat: het datamodel zet alles als JSON-blob in één kolom
(niets is afdwingbaar op databaseniveau), en er is geen foutrapportage of
bewaking van de live app.

Sinds 16 september 2026 is er ook een bouwstap (`node tools/bouw.js`,
zie `docs/professionaliseringsplan.md` P1): `src/app.jsx` is de bron,
`online/index.html` is het bouwproduct. Zie [het team](#het-team) hieronder
voor wie welk stuk hiervan onderhoudt.

## Het team

In `.claude/agents/` staan tien gespecialiseerde agents, elk met een naam.
Roep ze op door hun naam te typen ("Tess, kijk hier eens naar") of laat Claude
zelf kiezen.

| Naam | Rol |
|---|---|
| **Pien** | producent — bepaalt wie wat doet. Bel haar als je niet weet wie je moet hebben |
| **Tess** | tester — het vangnet: tests, controles, mutatietesten |
| **Veerle** | beveiliging, privacy/AVG, het afdwingen van abonnementen |
| **Fenna** | frontend — de schermen in `online/index.html` |
| **Bas** | backend — Supabase, policies, SQL om te plakken |
| **Iris** | ontwerp — indeling, kleur, bruikbaarheid langs de lijn |
| **Mark** | marketing — prijzen, verkoopteksten, positionering |
| **Sanne** | social media — posts en contentplanning |
| **Ruben** | uitrol — live zetten, back-ups, foutrapportage |
| **Lex** | uitlegger — vertaalt alles naar gewone taal, verandert niets |

Voor werk dat de live app raakt: **eerst Tess, dan pas de bouwers.**

Geef een agent altijd een compleet briefje mee. Elke agent begint koud en weet
niets van dit gesprek; wat je niet meegeeft, moet die zelf opzoeken en dat kost
tijd en tokens.
