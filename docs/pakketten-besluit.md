# Pakketten — het besluit

**Datum:** 11 september 2026
**Genomen door:** Evan
**Status:** vastgesteld; twee punten nog open (onderaan)

Dit is de bron voor `pakket_grenzen` in `server/06-pakketten.sql`, voor
`PAKKETTEN` in `online/index.html` (regel 3517-3526) en voor elke tekst die
Mark schrijft. Loopt een van die drie hiermee uit de pas, dan is dit document
leidend.

---

## De vier pakketten

| Pakket | Teams | Server | Voor wie |
|---|---|---|---|
| **Free** | 1 | nee — alles op het eigen apparaat | uitproberen, of één team zonder gedoe |
| **Coach** | 1 | ja | de losse trainer |
| **Club** | tot 10 | ja | een vereniging |
| **Enterprise** | 11 en meer | ja | grote verenigingen, op maat |

**Enterprise:** het Club-tarief plus **€ 2,50 per team per maand**.
**Jaarlijks betalen:** twee maanden korting (betaal 10, krijg 12).

## De scheidslijn, en waarom hij daar ligt

Niet de functies, maar **de server**. Dat is de enige grens die aan de
serverkant hard af te dwingen is: zonder abonnement komt er niets binnen.

Statistieken, live-analyse en spelerkaarten zijn **niet** af te dwingen —
ze rekenen met gegevens die de club al legitiem heeft, of ze delen hun
opslag met de basis. Ze mogen in de tekst staan als wat de app kan, maar
nooit als wat je bij een duurder pakket krijgt.

**Gebruikersaantallen staan er bewust niet in.** De app schrijft nergens in
`public.leden`, dus gebruikers zijn niet te tellen en een gebruikerslimiet is
niet af te dwingen. Zolang er geen uitnodigingssysteem is, verkoop je dat niet.

## Wat dit technisch betekent

**`pakket_grenzen` krijgt een rij erbij.** Dat is één `insert` — geen code.
Dat was precies de reden om de getallen als gegevens te bouwen.

**Enterprise vraagt wél iets nieuws: een grens per club.** `pakket_grenzen`
heeft één getal per pakketnaam, maar "op maat" betekent dat clubs met
Enterprise verschillende aantallen hebben. De kleinste oplossing: een
nullable kolom `teams_max` op `abonnementen`, die `pakket_grenzen.teams`
overschrijft zodra hij gevuld is. `teamlimiet_bewaken()` leest dan eerst
die kolom.

**Jaarlijks betalen kost geen code.** Dat is `geldig_tot` twaalf maanden
vooruit in plaats van één. De respijttermijn van veertien dagen werkt
hetzelfde.

**Afrekenen per team is wél meer werk dan een vast bedrag.** Het bedrag
verandert zodra een club een team toevoegt. Mollie en Stripe kunnen dat,
maar het is geen vaste incasso meer.

**Boven de limiet raken blokkeert niets bestaands.** De trigger weigert
alleen een *nieuw* team. Een club die terugvalt houdt zijn teams en kan er
alleen geen bij maken. Dat is met opzet zo.

## Wat de rekensom oplevert

Bovenop het Club-tarief, per maand:

| Teams | Extra boven 10 | Erbij per maand | Per jaar (met 2 maanden korting) |
|---:|---:|---:|---:|
| 11 | 1 | € 2,50 | € 25,00 |
| 15 | 5 | € 12,50 | € 125,00 |
| 25 | 15 | € 37,50 | € 375,00 |
| 30 | 20 | € 50,00 | € 500,00 |

## Nog open

1. **Wat kosten Coach en Club?** Zonder die twee bedragen kan Mark geen
   prijspagina schrijven.
2. **Is de € 2,50 per team bóven de tien, of per team in totaal?** De tabel
   hierboven gaat uit van "boven de tien". Bij 25 teams scheelt dat
   € 37,50 tegen € 62,50 per maand.
