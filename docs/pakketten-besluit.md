# Pakketten — het besluit

**Datum:** 11 september 2026
**Genomen door:** Evan
**Status:** vastgesteld

Dit is de bron voor `pakket_grenzen` in `server/06-pakketten.sql`, voor
`PAKKETTEN` in `online/index.html` (regel 3517-3526) en voor elke tekst die
Mark schrijft. Loopt een van die drie hiermee uit de pas, dan is dit document
leidend.

---

## De drie pakketten

| Pakket | Teams | Server | Per maand | Per jaar (2 maanden korting) |
|---|---|---|---:|---:|
| **Free** | 1 | nee — alles op het eigen apparaat | gratis | gratis |
| **Coach** | 1 | ja | € 6,99 | € 69,90 |
| **Club** | onbeperkt | ja | € 49,00 | € 490,00 |

Geen Enterprise, geen maatwerk, geen prijs per team.

## Welk scherm bij welk pakket hoort

| Scherm | Free | Coach / Club |
|---|:--:|:--:|
| Dashboard | ja | ja |
| Selectie (spelers) | ja | ja |
| Wedstrijden | ja | ja |
| Agenda | ja | ja |
| Trainingen | — | ja |
| Ontwikkeling (tabblad in Selectie) | — | ja |
| Statistieken | — | ja |
| Live-analyse | — | ja |
| Clubhuis | — | ja |

Twee dingen die hiervoor moeten veranderen in `online/index.html`:

1. **Agenda hoort bij `basis`.** Nu staat `agenda:"trainingen"` in
   `PAGINA_MODULE` (regel 3529). Die regel eruit, dan valt agenda vanzelf
   terug op de basis.
2. **Het dashboard toont het trainingenblok met een slot**, niet leeg en niet
   weggelaten — wie niet weet dat trainingen bestaan, koopt er nooit voor.

**Let op bij Ontwikkeling:** dat is een *tabblad binnen* Selectie, geen eigen
scherm. Dat wordt dus een slot op een tabblad, en het gouden origineel
(`tools/gouden-origineel.js`) kijkt niet achter tabbladen — die dekking moet
apart geregeld worden.

## Is dat wel af te dwingen?

Statistieken en live-analyse zijn **niet** op de server af te dwingen:
statistieken schrijft niets weg (het is een rekensom over gegevens die de club
al legitiem heeft) en live deelt zijn opslag met het registreren van doelpunten.

Dat is hier geen probleem, en de reden is belangrijk: **Free komt helemaal niet
op de server.** Een Free-gebruiker die met de ontwikkelaarsconsole het
statistiekenscherm tevoorschijn haalt, ziet een rekensom over zijn eigen
gegevens op zijn eigen telefoon. Dat kost niets.

**De grens die je niet moet oversteken:** zou je ooit een scherm tussen Coach en
Club willen afschermen, dan werkt dit niet meer — die zitten allebei op de
server en dan valt er wél iets te halen. Zolang het enige verschil tussen de
betaalde pakketten het aantal teams is, zit je goed.

## De twee keuzes die dit besluit dragen

**1. De scheidslijn is de server, niet de functies.**

Dat is het enige dat aan de serverkant hard af te dwingen is: zonder
abonnement komt er niets binnen. Statistieken, live-analyse en spelerkaarten
zijn níét af te dwingen — ze rekenen met gegevens die de club al legitiem
heeft, of ze delen hun opslag met de basis. Ze mogen in de tekst staan als
wat de app kan, nooit als wat je bij een duurder pakket krijgt.

**2. Coach rekent per team, Club rekent niet per team.**

Dat is met opzet een andere vórm, niet alleen een ander bedrag. Zou Club ook
per team rekenen, dan is de goedkoopste altijd de slimste keuze en
registreert elke losse trainer zich als vereniging met één team. Twee
verschillende vormen sluiten die sluiproute.

Het omslagpunt ligt daardoor vanzelf op **zeven teams**:

| Teams | Als losse coaches | Club | Voordeliger |
|---:|---:|---:|---|
| 3 | € 20,97 | € 49 | los |
| 5 | € 34,95 | € 49 | los |
| 7 | € 48,93 | € 49 | gelijk |
| 10 | € 69,90 | € 49 | Club |
| 26 | € 181,74 | € 49 | Club |

Eén zin voor de prijspagina: **"Meer dan zes teams? Dan is Club voordeliger."**

## Waarom dit bij een echte vereniging past

Gemeten, niet gegokt. Nederland heeft ongeveer 2.900 amateurvoetbalclubs met
samen 1,26 miljoen leden — gemiddeld ruim 400 leden per club. Uit het aantal
gespeelde wedstrijden (499.105 jeugd, 214.077 senioren per seizoen, elk met
twee teams, ongeveer 22 wedstrijden per team per jaar) volgt een gemiddelde
van **ruim twintig teams per club**. vv De Meern bevestigt de orde van
grootte: 120 teams bij 1.600 leden.

Een gemiddelde club van 26 teams betaalt met jaarkorting € 490 — dat is
€ 1,17 per lid per jaar, of € 19 per team. Met een prijs per team van € 6,99
zou dat € 2.184 zijn geweest, en dat is voor een amateurclub geen gesprek.

**Bron:** KNVB ledencijfers en "Het amateurseizoen in cijfers: wedstrijden".

## Wat dit technisch betekent

**De teamlimiet hoeft nog maar één ding te doen:** Free en Coach op één team
houden. Club is onbeperkt (`teams = null` in `pakket_grenzen`).

Daarmee vervalt alles wat eerder is overwogen en níét gebouwd hoeft te worden:

- geen kolom `teams_max` op `abonnementen`
- geen Enterprise en geen maatwerkgrenzen per club
- geen afrekenen per team, dus een gewone vaste incasso volstaat

**Jaarlijks betalen kost geen code.** Dat is `geldig_tot` twaalf maanden
vooruit in plaats van één. De respijttermijn van veertien dagen werkt hetzelfde.

**Boven de limiet raken blokkeert niets bestaands.** De trigger weigert alleen
een *nieuw* team. Een club die terugvalt houdt zijn teams en kan er alleen geen
bij maken. Dat is met opzet zo.

**En dit is precies waarom de limiet moet werken:** zonder hem koopt één coach
voor € 6,99 een account en zet er zesentwintig teams in.

## Gebruikersaantallen: bewust niet

De app schrijft nergens in `public.leden`. Gebruikers zijn dus niet te tellen
en een gebruikerslimiet is niet af te dwingen. Zolang er geen uitnodigings-
systeem is, staat er geen aantal beheerders of gebruikers op de prijslijst.

## Wat er nu moet veranderen

De pakketnamen veranderen van `free / basic / pro / max` naar
`free / coach / club`. Dat raakt vier plekken, en die moeten in één keer mee:

1. `server/06-pakketten.sql` — de rijen in `pakket_grenzen`
2. `tests/teamlimiet.test.sql` — de scenario's gebruiken nu `basic`
3. `tests/pakket.test.js` — verwacht nu vier pakketten
4. `online/index.html` regel 3517-3526 — `PAKKETTEN`

De eerste drie kunnen nu. De vierde is werk voor Fenna, en die wacht op het
gouden origineel.
