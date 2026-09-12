# De marketingsite

`index.html` is op 12 september 2026 opgehaald van de live site
`https://teamtakkie.nl` met `curl`. Dat was nodig omdat **de bron nergens
bestond waar Evan bij kon**: niet in deze repo, niet op zijn schijf, alleen
live bij Netlify en in een ChatGPT-gesprek.

Dat is hetzelfde patroon als de 28 testbestanden uit de V34-notities: iets
bestaat, werkt, en is door niemand anders terug te halen. Vandaar dat het nu
hier staat.

**Let op:** dit is de opgehaalde versie, niet per se hoe hij is ontstaan.
Rol hem niet terug naar Netlify zonder te controleren of er niets verloren
is gegaan (denk aan formulieren, scripts van derden, `_redirects`).

## Wat er niet klopt met wat de software doet

Peildatum 12 september 2026. Zie `docs/pakketten-besluit.md` voor wat er wél is.

| Op de site | Werkelijkheid |
|---|---|
| Free — 1 beheerder, 1 team | 1 team klopt; "beheerder" is niet te tellen |
| Trainer — € 9,99, 3 teams | bestaat niet; wordt Coach, € 6,99, 1 team |
| Team — € 9,99, 3 beheerders, 1 team | **bestaat technisch niet** — de app schrijft nergens in `public.leden`, dus er is geen uitnodigingssysteem en geen tweede beheerder |
| Club — € 39,99, 10 beheerders, 10 teams | wordt € 49,00 met **onbeperkt** teams; beheerders vervallen |
| Enterprise — op aanvraag | afgeschaft |
| "Spelers onbeperkt" (bij alle vijf) | sinds 11 september geldt een grens van 50 spelers per team als rem tegen misbruik |
| Live-analyse, beoordelingen, kaarten als verkoopargument | die bestaan, maar zijn **niet server-side af te dwingen** — noem ze als wat de app kan, niet als wat je bij een duurder pakket krijgt |

## Wat de nieuwe site moet zeggen

| Pakket | Teams | Server | Per maand | Per jaar |
|---|---|---|---:|---:|
| Free | 1 | nee | gratis | gratis |
| Coach | 1 | ja | € 6,99 | € 69,90 |
| Club | onbeperkt | ja | € 49,00 | € 490,00 |

Eén zin die het omslagpunt uitlegt: **"Meer dan zes teams? Dan is Club voordeliger."**

Geen aantallen beheerders of gebruikers, zolang er geen uitnodigingssysteem is.
Geen "spelers onbeperkt". Geen Enterprise.
