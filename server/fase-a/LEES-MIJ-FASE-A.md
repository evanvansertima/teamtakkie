# FASE A — beveiligingsgaten dichten

**Klaar om te draaien. Nog niet gedraaid — niet op productie, niet op staging.**

Twee policy-wijzigingen. Geen enkele rij wordt aangeraakt, geen kolom toegevoegd,
geen data omgezet. Terugdraaien duurt seconden.

---

## Lees dit eerst: de audit klopte niet helemaal

Bij het natesten van fase A op een nagebouwde kopie van jouw schema bleek dat twee
van de drie risico's uit de audit **niet uitvoerbaar zijn**. Ik zet dat hier
vooraan, want het verandert wat fase A eigenlijk is.

| Risico | Audit v1.1 | Na natesten |
|---|---|---|
| **S3** — anon maakt onbeperkt clubs aan | Hoog, bevestigd | **Klopt.** Een anonieme rol maakte in de test met succes een club aan. |
| **S1** — jezelf bij andermans club voegen | Kritiek | **Niet uitvoerbaar.** Loopt vast op een fout. |
| **S10** — jezelf tot eigenaar promoveren | Kritiek | **Niet uitvoerbaar.** Zelfde fout. |

De fout is deze:

```
ERROR:  infinite recursion detected in policy for relation "leden"
```

`leden_toevoegen` en `leden_weghalen` bevatten allebei `select 1 from public.leden l …`
— een policy óp `leden` die ín `leden` kijkt. Om die subquery te beantwoorden past
Postgres opnieuw de regels op `leden` toe, en dat weigert hij. Postgres kort de `OR`
daarbij niet af: ook als de eerste tak waar is, wordt de tweede geëvalueerd. **Elke
insert en elke delete op `leden` loopt dus vast** — de aanval én het normale gebruik.

Ik had dit in de audit moeten vinden. Ik heb de policies gelezen en geredeneerd wat
ze zouden doen, in plaats van ze te draaien. Vandaar dat S1 en S10 als kritiek in het
rapport staan terwijl ze dat niet zijn.

### Wat er dan wél aan de hand is

Drie dingen, en ze zijn niet minder belangrijk geworden — alleen anders.

**1. Er is iets kapot dat je binnenkort nodig hebt.** Een eigenaar kan via de API
geen tweede beheerder toevoegen. Dat is precies wat fase F, G en H doen. Het
uitnodigingssysteem zou hier onherroepelijk op stuklopen, en dan zou je in
onbekend gebied gaan zoeken naar een fout die er al maanden zit.

**2. Niemand heeft het gemerkt, en dat is verklaarbaar.** De app schrijft nooit in
`leden`. Hij leest alleen (`zorgVoorClub`), en lezen werkt wél — die regel gebruikt
`mijn_clubs()`, een `security definer` functie, en die veroorzaakt geen recursie.
Aanmaken van een club gaat via `nieuwe_club()`, ook `security definer`. De enige twee
routes die de kapotte policies zouden raken, gebruikt de app niet.

**3. Het gat is er wel degelijk — het zit achter een fout.** Wie de recursie later
naïef repareert, bijvoorbeeld door alleen de subquery te vervangen en
`gebruiker_id = auth.uid()` te laten staan, zet S1 en S10 alsnog open. Dat is een
heel plausibele reparatie voor iemand die de geschiedenis niet kent.

**Daarom repareert `A2` de recursie en sluit hij het gat in één keer.** Niet omdat er
vandaag brand is, maar omdat de reparatie die er sowieso moet komen, meteen de goede
moet zijn.

### Wat dit betekent voor de urgentie

Fase A is minder urgent dan de audit suggereerde, en nog steeds de juiste eerste
stap. S3 is echt en staat open. De rest is voorwerk voor fase F dat nu twee kleine
bestanden kost en later een dag debuggen.

Ik werk de audit bij zodra jij zegt dat fase A erop staat — dan corrigeer ik S1, S10
en de risicotabel met wat er echt gebeurde.

---

## De bestanden

| Bestand | Wat | Raakt rijen? |
|---|---|---|
| `A1-fix-clubs-maken.sql` | Haalt `clubs_maken` weg. Sluit S3. | nee |
| `A2-fix-leden.sql` | Twee `security definer` hulpfuncties + `leden_toevoegen` en `leden_weghalen` opnieuw. Repareert de recursie, sluit S1 en S10. | nee |
| `A8-tests.sql` | Vier aanvallen en zes regressietests. **Elke test rolt terug.** | nee |
| `A9-rollback.sql` | Zet de drie policies exact terug zoals in `01-schema.sql`. | nee |

---

## Volgorde

### Op staging

1. `S5-seed-testrollen.sql` uit `server/staging/` — je hebt een kijker nodig om
   test 3 mee te doen. Zonder die rol test je een gat dat je niet kunt bereiken.
2. `A8-tests.sql` — **vóór** de fix. Zo zie je met eigen ogen wat er nu gebeurt:
   test 1 slaagt (dat is S3), test 2 en 3 geven `infinite recursion`, test 6 faalt.
3. `A1-fix-clubs-maken.sql`
4. `A2-fix-leden.sql`
5. `A8-tests.sql` — **ná** de fix. Nu moeten alle vier de aanvallen netjes worden
   geweigerd met `new row violates row-level security policy`, en moeten alle zes
   de regressietests slagen.

Stuur me de uitkomst van stap 2 en stap 5. Die leg ik naast elkaar voordat er iets
naar productie gaat.

### Op productie — pas na jouw expliciete goedkeuring

6. `A8-tests.sql` — mag hier veilig, want alles rolt terug.
7. `A1-fix-clubs-maken.sql`
8. `A2-fix-leden.sql`
9. `A8-tests.sql` opnieuw
10. De teltest onderaan `A8`: **4 clubs, 4 leden, 3 teams, 42 gegevens** en
    `fc Harlingen → max`. Wijkt er iets af: `A9-rollback.sql`.

---

## Test 0 is niet optioneel

`A8-tests.sql` begint met een controle op het testharnas zelf, en die moet je echt
lezen.

De SQL Editor draait standaard als `postgres`, en **die rol negeert RLS volledig**.
Zonder `set local role authenticated` test je niets: elke aanval zou slagen en je zou
denken dat er niets dicht zit. Andersom net zo hard: komen de JWT-claims niet aan,
dan is `auth.uid()` leeg, mislukt elke aanval om de verkeerde reden, en krijg je vier
groene vinkjes die niets betekenen.

Test 0 geeft twee keer `true` terug als het harnas werkt. Doet hij dat niet, dan zijn
alle uitkomsten daaronder waardeloos — stop dan en zeg het me.

---

## Waarom je deze tests ook op productie kunt draaien

Elke test zit in `begin … rollback`. Ook als een aanval slaagt, verdwijnt het
resultaat weer. Dat haalt het bezwaar weg dat ik in het fase 0-rapport noemde: er
blijft geen testrij achter, zelfs niet als er iets openstaat.

Staging blijft toch de eerste plek. Niet vanwege het risico, maar omdat je daar
rustig kunt kijken wat er gebeurt zonder dat het over echte gegevens gaat.

---

## Eén ding dat A2 toevoegt en dat je moet weten

`A2` bevat naast de twee reparaties een derde regel die niet in jouw lijstje stond:
**de laatste eigenaar van een club kan zichzelf niet meer verwijderen.**

Dat is geen extraatje, het is noodzaak. Nu kan een eigenaar zijn eigen lidmaatschap
weggooien en zichzelf daarna opnieuw invoeren — dat is precies het gat uit S10. Na
`A2` kan dat tweede deel niet meer. Zonder extra maatregel zou een club waarvan de
laatste eigenaar vertrekt daarmee **voorgoed onbereikbaar** worden, mét alle teams en
gegevens erin: niemand kan er dan nog een lid aan toevoegen, ook een beheerder niet.

Alle vier je clubs hebben op dit moment precies één lid. Dat is dus geen theorie.

De functie `is_laatste_eigenaar()` regelt dit. Getest: met twee eigenaren mag de
eerste wél vertrekken, met één niet.

Wil je `A2` liever zonder die regel, zeg het dan — dan haal ik hem eruit. Ik raad het
af.

---

## Wat ik heb getest, en wat niet

Op een lege PostgreSQL 16 met nagebootste Supabase-rollen (`anon`, `authenticated`,
`service_role`), een `auth.users`-tabel en een `auth.uid()` die net als bij Supabase
uit de JWT-claims leest. Daarop `01-schema.sql` en `03-beheer.sql` geladen, een club
aangemaakt via `nieuwe_club()`, en toen:

| Scenario | Vóór de fix | Na de fix |
|---|---|---|
| anon maakt club aan | **gelukt** | geweigerd |
| vreemde voegt zich bij andermans club | recursiefout | geweigerd |
| kijker promoveert zichzelf | recursiefout | geweigerd |
| laatste eigenaar verwijdert zichzelf | gelukt | geweigerd (0 rijen) |
| eigenaar voegt lid toe | **recursiefout** | gelukt |
| eigenaar verwijdert lid | recursiefout | gelukt |
| lid verlaat club zelf | recursiefout | gelukt |
| met 2 eigenaren mag de eerste weg | — | gelukt |
| nieuwe gebruiker richt club op | gelukt | gelukt |
| vreemde ziet teams van fc Harlingen | 0 | 0 |
| `A9-rollback.sql` | — | oud gedrag exact terug |

**Wat die test niet dekt:** Supabase's eigen laag. PostgREST, de manier waarop een
echt HTTP-verzoek claims doorgeeft, en of jouw live database precies gelijk is aan
`01-schema.sql`. Daarvoor is staging er, en daarvoor is test 0 er.

---

## Terugdraaien

| Situatie | Wat | Duur |
|---|---|---|
| A8 laat iets onverwachts zien | `A9-rollback.sql` | seconden |
| Twijfel over de policytekst | `git show productie-v34-checkpoint:server/01-schema.sql` | — |
| Data kwijt | kan niet — er wordt geen rij aangeraakt | — |

---

## STOP

Ik heb niets uitgevoerd. Geen SQL op productie, geen SQL op staging — alleen op een
wegwerpdatabase in deze sessie, die inmiddels weg is.

Zeg het als je wilt dat ik de audit nu al bijwerk met de S1/S10-correctie, of laten
we dat tot na fase A.
