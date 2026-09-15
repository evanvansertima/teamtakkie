# Waarschuwing: er staan twee oplossingen voor hetzelfde probleem in deze map

**Datum:** 12 september 2026
**Geldt voor:** `server/fase-a/` en `server/rename-en/`

Bij het samenvoegen van `seizoenfix` naar `main` zijn twee trajecten bij elkaar
gekomen die onafhankelijk van elkaar aan dezelfde tabellen werken. Git zag geen
conflict — alle bestanden zijn nieuw — maar **inhoudelijk spreken ze elkaar
tegen.** Draai ze niet zonder dit te lezen.

De technische beoordeling van 10 september waarschuwde hier al voor:

> *"Er liggen nu vier trajecten klaar: seizoenfix, fase A, de Engelse
> hernoeming en het professionaliseringsplan. Twee daarvan raken dezelfde
> functie. Volgorde is hier belangrijker dan snelheid."*

---

## Wat er al op productie staat

Evan heeft op 11 september op de échte database gedraaid, met bewijs:

| Bestand | Uitkomst |
|---|---|
| `server/04-leden-fix.sql` | zes scenario's, alle zes zoals verwacht |
| `tests/leden-policy.test.sql` | GESLAAGD op productie |

Dat is de **Nederlandstalige** lijn: `is_eigenaar()`, `pakket_grenzen`,
`06-pakketten.sql`, `08-bewaartermijn.sql`.

Wil je niet op een commit-bericht hoeven vertrouwen: draai
`server/11-controle-productie.sql` in de SQL Editor. Dat bestand kijkt alleen
(het verandert niets) en zegt per reparatie — 04, 06 en 10 — of hij op die
database staat.

## Wat je NIET moet draaien

### `server/fase-a/A2-fix-leden.sql`

Lost hetzelfde op als `04-leden-fix.sql`, maar met een andere hulpfunctie:
`ben_eigenaar()` in plaats van `is_eigenaar()`. Draai je hem, dan staan er
twee functies die hetzelfde doen en is niet meer te zien welke een policy
gebruikt.

**Allebei de analyses kwamen onafhankelijk tot dezelfde conclusie** — dat de
tak `gebruiker_id = auth.uid()` bij *toevoegen* weg moet. Dat is een sterk
teken dat die conclusie klopt.

### `server/fase-a/A1-fix-clubs-maken.sql`

`clubs_maken` wordt al dichtgezet in `06-pakketten.sql`, samen met een rem van
drie verenigingen per persoon.

### `server/rename-en/E1-rename-to-english.sql`

Hernoemt het hele schema naar het Engels. **Dit zou alles van 11 en 12
september breken:** `06-pakketten.sql`, `08-bewaartermijn.sql`, beide
testbestanden, en elke verwijzing in `online/index.html`.

Of dat een goed idee is, is een aparte beslissing — maar het is géén stap die
je tussendoor doet. Bespreek het eerst.

---

## Wat fase A wél heeft en de huidige lijn mist

Eén ding, en het is echt:

```sql
and not public.is_laatste_eigenaar(leden.club_id, leden.gebruiker_id)
```

De policy `leden_weghalen` die nu op productie staat luidt:

```sql
using (gebruiker_id = auth.uid() or public.is_eigenaar(club_id))
```

**De laatste eigenaar van een club kan zichzelf dus verwijderen.** Dan staat er
een vereniging zonder eigenaar, en omdat `clubs_weghalen` een eigenaar eist,
kan niemand die daarna nog opruimen. Een weesclub die vastzit.

Scenario 6 in `tests/leden-policy.test.sql` dekt dit niet: dat verwijdert een
tráíner, niet de laatste eigenaar.

**Dit hoort opgelost te worden**, in de Nederlandstalige lijn, met een test die
het aantoont. Niet door A2 te draaien.
