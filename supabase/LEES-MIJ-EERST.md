# De betaalketen — wat hier staat en wat er nog moet gebeuren

**Datum:** 19 september 2026
**Status:** gebouwd en getest met nagemaakte Mollie-antwoorden. **Nog niet
uitgerold, en dat kan ook nog niet** — er is geen Mollie-sleutel.

---

## Waar dit over gaat, in één alinea

Een club klikt in de app op "upgraden naar Coach". Dan moet er ergens een
betaling ontstaan bij Mollie, en als die gelukt is moet het pakket in de
database omhoog. Die twee stappen zijn twee kleine programmaatjes die bij
Supabase draaien — "edge functions" heten die. Ze staan in deze map.

| Wat | Waar |
|---|---|
| De betaling starten | `functions/betaling-starten/index.ts` |
| De melding van Mollie verwerken | `functions/betaling-melding/index.ts` |
| Gedeelde stukken (prijzen, Mollie, database) | `functions/_gedeeld/` |
| Instellingen per functie | `config.toml` |
| De databasekant | `server/18-betalingen.sql` en `server/19-mollie-subscription.sql` |

---

## De twee dingen die de hele veiligheid dragen

**1. Het bedrag komt nooit van de browser.** De app stuurt alleen "welke club,
welk pakket, welke termijn". De prijs wordt op de server opgezocht in
`functions/_gedeeld/mollie.ts`. Zou de prijs van de browser komen, dan is een
clubabonnement van één cent een kwestie van de ontwikkelaarsconsole openen.
Er is een test die precies dat probeert en laat zien dat het genegeerd wordt.

**2. De melding van Mollie wordt niet geloofd.** Het adres waar Mollie zijn
melding naartoe stuurt staat open voor iedereen — dat kan niet anders, want
Mollie heeft geen account bij ons. Daarom doet die functie niets met wat er
binnenkomt behalve het betaalnummer eruit halen, en vraagt daarna zélf aan
Mollie wat er is gebeurd, met onze eigen geheime sleutel. Dat antwoord is het
bewijs; de melding is niet meer dan een tikje op de schouder.

---

## De tests draaien

Je hebt Deno nodig (de taal waarin deze functies draaien):

```
brew install deno
```

Daarna, vanuit de hoofdmap van het project:

```
deno test supabase/functions/
```

Je hoort te zien: **45 passed | 0 failed**. Er is geen internet voor nodig en
geen Mollie-sleutel.

En de controle of die tests wel écht iets vangen (er worden dertien
opzettelijke fouten ingebouwd, in een kopie — de map hier wordt niet
aangeraakt):

```
python3 tests/edge-mutaties.py
```

Je hoort te zien: bij elke regel het woord **gevangen**, en onderaan **Alle
mutaties gevangen.**

En de databasekant:

```
sh tests/sql-lokaal/draai.sh tests/mollie-subscription.test.sql \
    server/17-free-serverdata.sql server/18-betalingen.sql \
    server/19-mollie-subscription.sql
```

---

## Wat er moet gebeuren zodra de Mollie-sleutel er is

In deze volgorde. Stap 1 en 2 zijn onmisbaar: zonder die twee werkt stap 3
niet, en dat merk je pas als er geld is betaald.

**1. De SQL erbij zetten.** Open
`server/19-mollie-subscription (open mij en kopieer alles).txt`, kopieer alles,
plak het in de SQL Editor van Supabase en klik op Run. Er komt een tabel terug
waarin overal "in orde" hoort te staan. Zonder deze ene kolom kan de webhook
de doorlopende incasso niet onthouden en blijft Mollie het opnieuw proberen.

**2. De sleutel bij Supabase zetten.** Op de opdrachtregel:

```
supabase secrets set MOLLIE_API_KEY=test_xxxxxxxxxxxx
```

Begin met de **testsleutel** (die begint met `test_`), niet met de live-sleutel.
Zolang er nog nooit een echte betaling is verwerkt, telt een testbetaling
gewoon mee en kun je de hele keten veilig uitproberen. Vanaf de eerste échte
betaling weigert de database elke testbetaling nog een pakket te geven — dat is
met opzet zo gebouwd en staat uitgelegd in `server/18-betalingen.sql`, DEEL 3.

Deze sleutel komt nergens in een logboek, nergens in een foutmelding en nooit
terug naar de browser. Dat is getest.

**3. Uitrollen.**

```
supabase functions deploy betaling-starten
supabase functions deploy betaling-melding
```

`config.toml` regelt dat de tweede functie geen inlogtoken eist. Rol je hem
ooit met de hand uit zonder dat bestand, gebruik dan `--no-verify-jwt`.

**4. Eén keer echt proberen.** Dit is de stap die de nagemaakte antwoorden
níét kunnen vervangen. Wat je test:

- een betaling starten vanuit de app, en kijken of je bij de kassa van Mollie
  uitkomt;
- die testbetaling op "betaald" zetten in het Mollie-dashboard;
- kijken of `public.betalingen` een regel heeft met status `betaald` en het
  juiste bedrag in centen;
- kijken of `public.abonnementen` het pakket en de einddatum heeft gekregen;
- kijken of er in Mollie precies **één** doorlopende incasso staat, met een
  startdatum van één maand (of één jaar) later — niet vandaag.

**5. Pas daarna de live-sleutel.** En dan nog één keer alles nalopen, want
vanaf dat moment is elke fout een fout met andermans geld.

---

## Wat deze tests niet bewijzen — eerlijk

De antwoorden van Mollie zijn nagemaakt uit hun documentatie. Of Mollie ze
ook echt zo terugstuurt, blijkt pas bij stap 4 hierboven. Wat wél bewezen is:
dat onze kant het juiste bedrag verstuurt, de juiste vragen stelt, de juiste
antwoorden teruggeeft en niets lekt.

---

## Terugdraaien

De twee functies weghalen:

```
supabase functions delete betaling-starten
supabase functions delete betaling-melding
```

Daarmee kan niemand meer een betaling starten en wordt er niets meer verwerkt.
De database blijft precies zoals hij is; de boekhouding in `public.betalingen`
blijft staan. Onderaan `server/19-mollie-subscription.sql` staat hoe je ook de
kolom weghaalt, maar dat hoeft niet en het is meestal niet verstandig.
