# Opzeggen — plan

**Datum:** 29 september 2026
**Status (8 oktober 2026):** gebouwd en getest, nog niet live. Wat er nog
ontbreekt: de maildienst (besluit 3) en de juridische check (vraag 4 en 5).

**Gebouwd:**
- `server/21-opzeggen.sql` met de test `tests/opzeggen.test.sql` (9 scenario's,
  lokaal groen; twee opzettelijke fouten gevangen).
- `supabase/functions/abonnement-opzeggen/` (opzeggen én intrekken) met
  tests; `stopAbonnement()` en `beoordeelOpzegging()` in `_gedeeld/mollie.ts`.
- `betaling-melding`: een verlenging die na het opzeggen nog binnenkomt,
  start **geen** nieuwe incasso meer. Gevonden tijdens het bouwen; zonder
  deze regel zou zo'n late SEPA-incasso de opzegging stilletjes ongedaan
  maken.
- `abonnement-wisselen` weigert na opzeggen ("trek de opzegging eerst in").
- De app: Opzeggen en "Opzegging intrekken" in Instellingen › Abonnement.
- Zes nieuwe opzettelijke fouten in `tests/edge-mutaties.py` (O1–O6), alle
  gevangen.

**Uitrollen, in deze volgorde:**
1. `server/21-opzeggen (open mij en kopieer alles).txt` in de SQL Editor.
   Onderaan 6× "in orde".
2. `npx supabase functions deploy betaling-melding --project-ref escibxugiyjclrwmivkn`
3. `npx supabase functions deploy abonnement-wisselen --project-ref escibxugiyjclrwmivkn`
4. `npx supabase functions deploy abonnement-opzeggen --project-ref escibxugiyjclrwmivkn`
5. De map `online/` naar Netlify.

**Nog te doen:**
- Maildienst kiezen en aansluiten. Tot dan stuurt de server geen mail en
  belooft de app er ook geen (`mail: false`).
- Algemene voorwaarden artikel 5 aanpassen: opzeggen kan nu in de app.
- Gevonden, los van opzeggen: een abonnement dat **zonder** opzegging
  verloopt (bijvoorbeeld een mislukte incasso), staat in de app nog als
  het oude pakket, terwijl de server na de 14 respijtdagen al Free
  afdwingt. Het scherm kijkt naar de kolom `pakket`, niet naar
  `pakket_van_club()`.

**Besluiten van Evan (29 september 2026):**
1. Opzeggen stopt het pakket op de einddatum, **zonder** de 14 respijtdagen.
2. "Toch niet opzeggen" wordt gebouwd.
3. Er komt een **bevestiging per e-mail**. Welke maildienst: nog open.
4. en 5. Juridisch: zie "Juridisch, voorlopig" onderaan. Dat is nog niet
   online nagekeken.

---

## Waarom dit nu moet

De knop "Opzeggen" in Instellingen › Abonnement doet vandaag niets: hij toont
"Opzeggen kan zodra dat onderdeel klaar is". Zolang er alleen testclubs zijn is
dat eerlijk. Vanaf de eerste betalende club niet meer: wie wil stoppen, moet
kunnen stoppen, en de incasso bij Mollie moet dan ook echt ophouden.

## Wat er al is (en dus niet gebouwd hoeft te worden)

- **Terug naar Free na de einddatum.** `pakket_van_club()` in
  `server/06-pakketten.sql` geeft `free` terug zodra `geldig_tot` (plus de
  respijtdagen) voorbij is. Een opgezegde club valt dus vanzelf terug, zonder
  dat er iets hoeft te draaien.
- **De 60 dagen daarna.** Het besluit van 18 september 2026
  (`docs/avg-inventaris.md` 8.8): na afloop nog zestig dagen schrijven, en
  lezen, exporteren en verwijderen blijven altijd werken. Dat staat al in
  `server/18-betalingen.sql` en `17-free-serverdata.sql`.
- **Het nummer van de incasso.** `abonnementen.mollie_subscription_id` en
  `mollie_klant_id` staan er al; die zijn nodig om bij Mollie op te zeggen.

## Wat opzeggen moet doen, in één alinea

De eigenaar tikt op Opzeggen en bevestigt. De server stopt de doorlopende
incasso bij Mollie, en pas als Mollie dat bevestigt, schrijft hij in de
database dat de club heeft opgezegd. De club houdt zijn pakket tot de
einddatum waarvoor al betaald is. Er komt geen geld terug. Na de einddatum
valt de club terug naar Free, zoals nu ook al gebeurt bij een verlopen
abonnement.

## De onderdelen

### 1. Database — `server/21-opzeggen.sql`

- Nieuwe kolom `abonnementen.opgezegd_op` (tijdstip, leeg = niet opgezegd).
- Functie `markeer_opgezegd(club)`, alleen voor de service-sleutel, net als de
  wisselfuncties. Zo kan de app zelf nooit "opgezegd" zetten of weghalen.
- `beoordeelWissel()` weigert een wissel voor een opgezegde club, met een
  eigen tekst ("Je hebt opgezegd…"). Anders kan iemand na opzeggen nog
  opwaarderen via een incasso die niet meer bestaat.
- Een controleblok (overal "in orde") en een terugdraaiblok, zoals in 19 en 20.
- Test: `tests/opzeggen.test.sql`.

### 2. Mollie — `_gedeeld/mollie.ts`

- Eén nieuwe aanroep: `stopAbonnement(klant, abonnement)`. Bij Mollie is
  dat een DELETE op de subscription.
- Is hij bij Mollie al gestopt (404 of status `canceled`), dan telt dat als
  gelukt. Dan kan een tweede poging na een storing nooit vastlopen.

### 3. Edge function — `supabase/functions/abonnement-opzeggen/`

Opgebouwd zoals `abonnement-wisselen`:

1. Ben jij de eigenaar? Anders 403.
2. Is er al opgezegd? Dan 200 "al opgezegd", en er gebeurt niets.
3. Loopt er een overstap? Dan 409 "wacht tot je overstap klaar is".
   Opzeggen midden in een betaalde upgrade laat anders een betaling
   achter voor een pakket dat nooit ingaat.
4. Geen incasso bekend (bijvoorbeeld FC Harlingen, met de hand gezet)? Dan
   400 "neem contact op".
5. **Eerst Mollie, dan de database.** Zelfde regel als bij het wisselen: de
   database zegt pas "opgezegd" als Mollie bevestigt dat er niet meer wordt
   afgeschreven. Andersom zou de app "opgezegd" tonen terwijl er volgende
   maand gewoon weer wordt afgeschreven: het ergste wat deze knop kan doen.

Tests met nagemaakte Mollie-antwoorden (Deno), plus opzettelijke fouten in
`tests/edge-mutaties.py`.

### 4. De app — `src/schermen/instellingen.jsx`

- De bevestiging bij Opzeggen roept de edge function echt aan.
- Daarna toont het abonnementsblok: **"Opgezegd — je houdt Coach tot
  19 oktober. Daarna ga je terug naar Free."** De knop Opzeggen verdwijnt.
- `syncPakket()` haalt `opgezegd_op` mee op, zodat dit ook op een ander
  apparaat klopt.
- Test in de stijl van `tests/overstappen.test.js`, plus het gouden origineel.

### 5. Teksten die mee moeten (regel 6: verkoop niets wat de software niet doet)

- **Algemene voorwaarden, artikel 5**, zegt nu: "Voor opzegging kun je
  contact opnemen via headcoach@teamtakkie.nl. We bevestigen de ontvangst en
  de einddatum." Met een knop in de app klopt de eerste zin niet meer, en
  de tweede alleen als er een bevestiging komt (zie vraag 3).

## Volgorde van uitrollen

Dezelfde volgorde als bij het wisselen:

1. `21-opzeggen.sql` in de SQL Editor (Evan, 5 minuten)
2. `abonnement-opzeggen` uitrollen, en `abonnement-wisselen` opnieuw, want die
   moet de opzegging kennen (Evan, 5 minuten)
3. De app naar Netlify (Evan, 2 minuten)
4. Uitproberen met SV Voorbeeld: opzeggen, en dan in Mollie kijken of de
   incasso op "geannuleerd" staat.

Het bouwen en testen is ongeveer een dag werk aan mijn kant.

## Wat dit plan niet doet

- **Geld terugbetalen.** Ook niet bij de wettelijke bedenktijd van veertien
  dagen (artikel 5). Dat blijft handwerk: een terugbetaling in het
  Mollie-dashboard. Het komt weinig voor, en een knop die geld teruggeeft
  verdient een eigen ontwerp.
- **Gegevens wissen.** Dat is "Vereniging opheffen", een ander onderwerp.

---

## Vijf vragen voor Evan

1. **Respijt na opzeggen.** Een verlopen abonnement houdt nu nog **14 dagen**
   zijn pakket (`respijt_dagen`). Dat is bedoeld voor een betaling die te laat
   binnenkomt. Moet een club die zelf heeft opgezegd die 14 dagen ook
   krijgen? *Mijn voorstel: nee, het pakket stopt op de einddatum. De 60
   dagen om gegevens op te slaan en te exporteren blijven wel gelden.*

2. **"Toch niet opzeggen."** Kan een club de opzegging intrekken vóór de
   einddatum? Zonder die knop kan zo'n club pas na de einddatum een nieuw
   abonnement nemen, want de noodrem in `betaling-starten` blokkeert een
   aankoop zolang het oude nog loopt. *Mijn voorstel: wel bouwen. Het is een
   nieuwe incasso met dezelfde machtiging, die ingaat op de einddatum, dus
   er hoeft niet opnieuw via iDEAL betaald te worden. Dat is ongeveer een
   halve dag extra.*

3. **Bevestiging.** De voorwaarden beloven een bevestiging van ontvangst en
   einddatum. De app kan nu geen e-mail versturen. Is een melding in de app
   genoeg (dan passen we de voorwaarden aan), of moet er een e-mail komen?
   Een e-mail is een apart stuk werk: een dienst om mail mee te versturen
   kiezen en aansluiten.

4. **Jaarabonnementen.** Werkt precies hetzelfde: je houdt het pakket tot
   het einde van het betaalde jaar, zonder geld terug. Klopt dat met wat je
   klanten wilt beloven?

5. **Voor de jurist of boekhouder.** Moet een abonnement dat online is
   afgesloten ook online op te zeggen zijn, en zijn er regels voor hoe de
   bevestiging eruit moet zien? Het antwoord op vraag 3 hangt hiervan af.
   Zet het bij de vragen die al voor die persoon klaarliggen
   (`docs/avg-inventaris.md` 8.9).

---

## Juridisch — nagekeken op 9 oktober 2026

Nagekeken tegen openbare bronnen (onderaan). Dit is nog steeds geen
juridisch advies; de vragen voor de jurist staan onderaan.

**Consument of niet?** Het consumentenrecht geldt alleen voor natuurlijke
personen die niet voor hun beroep handelen. Een vereniging is geen
consument; een trainer die Coach zelf betaalt waarschijnlijk wel. We bouwen
alsof iedere klant consument is.

**1. Online opzeggen — bevestigd, en gebouwd.** De ACM: "je moet een
abonnement altijd kunnen opzeggen zoals je het afsloot. Sloot je je
abonnement online af? Dan moet je het ook online kunnen opzeggen." De
opzegtermijn is wettelijk maximaal één maand. Artikel 5 van de voorwaarden
("opzeggen via e-mail") voldoet daar niet aan; de knop in de app wel.

**2. Herroepingsknop — bevestigd, en NOG NIET gebouwd.** Sinds 19 juni 2026
(EU-richtlijn 2023/2673) moet een online gesloten overeenkomst met een
consument binnen de bedenktijd van 14 dagen met een duidelijke knop te
herroepen zijn, in dezelfde online omgeving. Een e-mailadres of formulier
is niet meer genoeg. Het bedrijf moet de ontvangst **direct bevestigen op
een duurzame drager, zoals een e-mail.** Dit is iets anders dan opzeggen:
herroepen maakt de overeenkomst ongedaan, en dan hoort het geld terug
(op het deel dat al gebruikt is na, als de dienst op verzoek al begon).

**3. Jaarabonnement — bevestigd.** Na de eerste periode mag een
consumentenabonnement alleen automatisch doorlopen als het daarna
maandelijks opzegbaar is (Wet Van Dam, 2011). Het CBb bevestigde op
11 september 2026: na automatische verlenging mag een klant niet opnieuw
een heel jaar vastzitten. Onze Mollie-incasso voor `jaar` verlengt nu
telkens met een jaar. **Dat moet anders vóór een consument een
jaarabonnement neemt.** Uitwegen a, b en c hieronder staan nog open; of het
vooruitbetaalde deel terug moet bij uitweg c, zeggen de bronnen niet.

Uitwegen voor het jaarabonnement:
- a. na het eerste jaar overstappen op maandbetaling;
- b. na het eerste jaar niet automatisch verlengen, maar de klant vragen;
- c. wel een jaar vooruit innen, en bij opzeggen in dat tweede jaar de
     ongebruikte maanden terugbetalen.

**4. Bevestiging per e-mail.** Bij opzeggen raadt de ACM consumenten aan
om een bevestiging te vragen; bij herroepen is die verplicht (punt 2).
Besluit 3 (e-mail) is daarmee niet alleen netjes maar nodig.

**Vragen voor de jurist** (bij `docs/avg-inventaris.md` 8.9):
- Hoe moet de herroepingsknop er voor deze dienst uitzien, en hoeveel geld
  gaat er terug als iemand binnen 14 dagen herroept?
- Welke uitweg voor het jaarabonnement (a, b of c)?
- Is voor een vereniging (geen consument) iets anders nodig?

**Bronnen** (geraadpleegd 9 oktober 2026):
- ACM ConsuWijzer, Abonnement opzeggen —
  https://consument.acm.nl/kan-ik-van-de-overeenkomst-af/opzeggen-stoppen-annuleren/abonnement-opzeggen
- NRTO, Vanaf 19 juni is een Herroepingsknop verplicht —
  https://www.nrto.nl/nieuws/let-op-vanaf-19-juni-is-een-herroepingsknop-verplicht-indien-u-zakendoet-met-consumenten
- DDMA, De herroepingsknop komt eraan —
  https://ddma.nl/kennisbank/de-herroepingsknop-komt-eraan-wat-verandert-er-voor-jouw-website/
- Actueel365 over de uitspraak van het CBb van 11 september 2026 —
  https://actueel365.nl/rechter-consument-mag-na-verlenging-niet-opnieuw-jaar-vastzitten
