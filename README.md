# TEAMTAKKIE

Teammanagement-app voor amateurvoetbalclubs. Gebouwd vanuit FC Harlingen
JO19-2, draait volledig in de browser.

**Lees eerst [`CLAUDE.md`](CLAUDE.md)** — dat bestand bevat de harde regels
voor dit project (niet herschrijven, tests horen in de repo, commentaar
legt het waarom uit) en een overzicht van wie waarvoor te porren is.

## Waar de app staat

| Pad | Wat het is | Draait dit? |
|---|---|---|
| `online/index.html` | Het bouwproduct. Dit is wat live staat op Netlify. | **Ja** |
| `online/sw.js` | Service worker — offline gebruik, cache-versiebeheer | **Ja** |
| `src/` | De bron. Hier bewerk je de app. | wordt gebouwd tot `online/` |
| `server/` | Het Supabase-schema: tabellen, RLS-policies, beheerfuncties | **Ja** |
| `tests/` | Tests die met kale `node` draaien, geen framework | **Ja** |
| `tools/` | Bouwscript, syntaxcontrole, typecontrole, het gouden origineel | **Ja** |
| `docs/` | Beoordelingen, plannen, architectuur — lees dit voor je iets groots voorstelt | documentatie |
| `legacy/` | Het allereerste prototype, één bestand. Alleen ter referentie. | nee |
| `backend/`, `frontend/`, `caddy/`, `docker-compose.yml` | Een afgebroken poging tot een AdonisJS + React-versie (augustus 2026) | **Nee — niet aankomen** |

De repo heet nog naar het eerste team (`fc-harlingen`); de app zelf heet
TEAMTAKKIE.

## Hoe het in elkaar zit

Eén HTML-bestand (`online/index.html`), React 18 vanaf een CDN, verder
Three.js (het 3D-sportpark) en jsPDF (exports). Er is geen server-side
render en geen router — navigatie is één stuk state in `App()`.

Sinds september 2026 is er een bouwstap. De bron in `src/` is opgesplitst:

```
src/app.jsx            de schil: App, de navigatie, wat overal gedeeld wordt
src/kern/*.js           sleutels, server, rollen, opslag, synchronisatie
src/domein/*.js         boetepot, wedstrijdlogica, statistieken, opkomst
src/schermen/*.jsx      negen schermmodules (wedstrijden, clubhuis, ...)
```

`node tools/bouw.js` plakt dit met `esbuild` (alleen vertalen, niet
bundelen — geen `import`/`export` in de bron, alles deelt één scope) tot
`online/index.html`. Zie [`docs/architectuur.md`](docs/architectuur.md)
voor het volledige verhaal, inclusief waarom `localStorage` de bron van
waarheid is en Supabase niet.

Data staat in Supabase (Postgres), met Row Level Security als enige
toegangscontrole (`server/*.sql`).

## Aan de slag

```
node tools/bouw.js                    # bouwt src/ naar online/index.html
python3 tools/check.py                # syntaxcontrole op de bron
node tools/typen-check.js             # typecontrole (src/kern/, src/domein/)
node tests/<naam>.test.js             # één testbestand, kaal node
node tools/gouden-origineel.js --vergelijk   # de volledige UI-regressietest (~10-15 min)
```

Zie [`CONTRIBUTING.md`](CONTRIBUTING.md) voor de volgorde waarin je dit
draait vóór je iets samenvoegt of uitrolt, en voor hoe een uitrol er in de
praktijk uitziet (map naar Netlify slepen, `sw.js`'s `VERSIE` ophogen).

## Documentatie

- [`docs/architectuur.md`](docs/architectuur.md) — hoe de app in elkaar
  zit: de bouwstap, het datamodel, synchronisatie, de mappenstructuur.
- [`docs/professionaliseringsplan.md`](docs/professionaliseringsplan.md) +
  [`docs/p4-stappenplan.md`](docs/p4-stappenplan.md) — hoe we van één
  bestand van 34.000 regels naar de huidige structuur zijn gekomen, en
  waarom in die volgorde.
- [`docs/avg-inventaris.md`](docs/avg-inventaris.md) — welke
  persoonsgegevens waar staan (er staan namen en geboortedata van
  minderjarigen in de database).
- [`docs/uitrol.md`](docs/uitrol.md) — het plan om van handmatig slepen
  naar een git-gekoppelde Netlify-uitrol te gaan (nog niet uitgevoerd).
- [`docs/codestructuur.md`](docs/codestructuur.md) — een momentopname van
  vóór de bouwstap (10 september 2026). Historisch: de regelnummers en de
  beschrijving "één bestand, geen modules" kloppen niet meer.
  `docs/architectuur.md` is de actuele versie.
