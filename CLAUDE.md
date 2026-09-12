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
| `online/index.html` | **De echte app.** 33.919 regels. Dit is wat live staat. |
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

Eén HTML-bestand. React 18 en Babel worden vanaf een CDN geladen; **Babel
vertaalt alle JSX in de browser van elke bezoeker**, er is geen bouwstap.
Verder Three.js (3D-sportpark) en jsPDF (exports). Data staat in Supabase
(Postgres), met Row Level Security als enige toegangscontrole.

Uitrollen gaat met de hand: map naar Netlify slepen.

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

## De twee dingen die nu het meest kosten

Uit `docs/technische-beoordeling.md` (10 september 2026):

1. **Het abonnement schermt niets af.** `magPagina()` staat in het bestand,
   maar wordt nergens aangeroepen. `pakketNu()` begint met `var id = "max"`.
   Iedereen krijgt vandaag alles. Zolang dit zo is kun je er geen geld voor vragen.
2. **Van geen enkele versie is aan te tonen dat hij werkt.** De 28 testbestanden
   uit de V34-notities zijn nergens te vinden. `legacy/controle/check.py` wijst
   naar het verkeerde bestand en meldt daarom altijd dat alles in orde is.

Daaronder: het datamodel zet alles als JSON-blob in één kolom (niets is
afdwingbaar), en er is geen foutrapportage of bewaking.

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
