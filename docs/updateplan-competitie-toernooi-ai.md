# Updateplan: competitiebeheer, toernooimodule en AI-trainer

**Datum:** 9 oktober 2026
**Status:** plan ter review, bijgewerkt na de besluiten van Evan (9 oktober
2026, zie hoofdstuk 0). Er is nog niets van gebouwd en er zijn geen gegevens
aangepast.
**Voor:** Evan, en iedereen (mens of agent) die dit straks bouwt.

---

## 0. Besluiten van Evan (9 oktober 2026) en wat ze veranderen

| # | Vraag | Besluit | Gevolg voor het plan |
|---|---|---|---|
| 1 | AI-trainer: pakketten en limiet | **Coach en Club, onbeperkt** | Geen maandlimiet in het product. Wel een technische rem tegen misbruik of een vastgelopen script (max. 1 verzoek tegelijk en 20 per 10 minuten per gebruiker) en een kostenoverzicht per maand in `ai_gebruik`, zodat onverwachte kosten zichtbaar zijn. Zie 5h. |
| 2 | Toernooimodule: pakketten | **Coach en Club** | Beheren én publiceren/presentatie in beide pakketten. Free ziet een slotje. |
| 3 | Spelers over teams heen koppelen | **Ja, in release 1** | Spelers krijgen een clubbrede `persoonId`; een koppelscherm "dit is dezelfde speler"; statistieken kunnen over teams van dezelfde club heen. Zie 4c, 5d. Release 1 wordt ± 3 dagen groter. |
| 4 | Standaardvolgorde bij gelijke punten | **Punten → doelsaldo → doelpunten voor → onderling** | Ongewijzigd; per fase aan te passen. |
| 5 | Gedeelde competitie tussen TeamTakkie-teams | **Nee** (eerst "ja", op 9 oktober teruggedraaid) | Elk team houdt zijn eigen competitie bij, in de bestaande opslag per team en seizoen (`fch_competities_v1`). Geen nieuwe servertabellen voor competities. |

## 1. Samenvatting van het eindbeeld

TeamTakkie krijgt drie nieuwe onderdelen, in deze volgorde:

1. **Competitie** (vervangt het tabblad *Statistieken › Stand*). Per seizoen een
   of meer competities, per competitie zoveel **fases** als nodig, per fase
   **speelrondes** met **wedstrijden tussen alle teams** — ook tussen twee
   tegenstanders. De stand wordt per fase **berekend uit uitslagen**, nooit meer
   met de hand bijgehouden. Een nieuwe fase begint op nul; eerdere fases blijven
   staan en raadpleegbaar.
2. **Toernooien** (vervangt het huidige tabblad *Wedstrijden › Toernooien*). Zes
   stappen — Instellingen, Deelnemers, Indeling, Schema, Resultaten, Presentatie —
   met meerdere dagen, locaties en categorieën, poules en knock-out, een planner
   die conflicten toont in plaats van verbergt, en een openbaar presentatiescherm.
3. **AI-trainer** (binnen *Trainingen*). Een chat die oefeningen en complete
   trainingen maakt in het bestaande oefenformaat, inclusief een tekening in het
   bestaande tekenbord, gecontroleerd vóór opslaan.

Alles blijft binnen de huidige opzet: dezelfde app (`src/` → `online/index.html`),
dezelfde opslag (per team en per seizoen, gesynchroniseerd via
`public.gegevens`), dezelfde rollen. Geen herbouw. Nieuw aan de serverkant zijn
alleen: één tabel voor openbaar gepubliceerde toernooien (release 3) en één
edge function plus gebruikstabel voor de AI (release 4).

---

## 2. Bevindingen uit de codebase

### 2a. Vastgesteld (in de code nagekeken)

| Onderwerp | Wat er nu is | Waar |
|---|---|---|
| **Competitiestand** | De eigen rij wordt berekend uit eigen wedstrijden met `soort: "competitie"` en `status: "gespeeld"`. **Alle andere teams zijn met de hand ingetypte totalen** (G/W/GL/V/DV/DT) in `fch_stand_v1`. | `src/schermen/statistieken.jsx` `StandTab`, `src/domein/statistieken.js` `eigenStandRij`, `standMetPunten` |
| Gevolg | Een uitslag tussen twee andere teams bestaat niet als gegeven. Een tegenstander "heeft" alleen wat je zelf intypt. Dit verklaart de onvolledige stand. | idem |
| **Fases** | Bestaan niet. De eigen rij telt álle competitiewedstrijden van het seizoen — daarom lopen punten uit eerdere fases door. | idem |
| **Puntentelling** | Vast 3-1-0, rangschikking punten → doelsaldo → doelpunten voor. Geen onderling resultaat, niet instelbaar. | `standMetPunten` |
| **Seizoenen** | Bestaan al, als deel van de opslagsleutel: `tt_<team>__<seizoen>::<soort>`. Elk seizoen begint sportief op nul doordat de gegevens gescheiden zijn. | `src/kern/sleutels.js` `sleutelVoor` |
| **Wedstrijdmodel** | Eén `Wedstrijd` per eigen duel: `tegenstander` (tekst), `thuis` (ja/nee), `score:{fch,teg}`, `status` (`gepland`/`gespeeld`), `soort` (`competitie`/`beker`/`oefen`/`toernooi`), plus opstelling, wissels, doelpunten, kaarten, beoordelingen. | `LEEG_WEDSTRIJD` in `src/schermen/wedstrijden.jsx` |
| **Lege uitslag** | Een nieuwe wedstrijd krijgt `score:{fch:0,teg:0}`. Alleen de status `gespeeld` maakt het verschil tussen "nog geen uitslag" en "0–0". Status `uitgesteld`/`afgelast` bestaat niet. | idem |
| **Wedstrijdsoorten** | `competitie` en `beker` tellen mee in de seizoenscijfers, `oefen` en `toernooi` niet. | `WEDSTRIJD_SOORTEN` in `src/domein/wedstrijden.js` |
| **Import** | Agendabestand (ICS), plakken, of een Sportlink-iCal-link. Alleen voor **eigen** wedstrijden. Wedstrijdzaken/voetbal.nl hebben geen open koppeling (staat zo in de app). | `ImportSheet` in `src/schermen/wedstrijden.jsx` |
| **Toernooien nu** | Eén datum, één locatie, X velden, één poule; halve competitie via de cirkelmethode, tijdsloten over velden verdeeld, stand. Opslag `fch_toernooien_v1`. | `ToernooienTab`, `maakPouleSchema`, `planToernooi`, `toernooiStand` |
| **Herbruikbaar** | `maakPouleSchema` (cirkelmethode, vrije ronde bij oneven aantal) en `toernooiStand` (stand uit team-tegen-team-wedstrijden) zijn generiek en getypt. | `src/domein/wedstrijden.js` |
| **Oefeningen** | Bibliotheek `fch_oefeningen_v1` (persoonlijk, gedeelde sleutel): naam, type, categorie, doel, leeftijd, duur, aantalSpelers, veldGrootte, materialen, beschrijving, aandachtspunten, **tekening**. | `LEEG_OEFENING`, `BASIS_OEFENINGEN` in `src/app.jsx` |
| **Tekeningen** | Gestructureerde data: `{veldType, stappen:[{elems, lijnen}]}`. Veldtypes (`heel-h`, `half-b`, vakken…), objecten (speler, keeper/rood, pion, hoedje, bal, ladder, stok, doelen), lijnen `looplijn`, `passlijn`, `schietlijn`, `dribbellijn`, `voorzetlijn`. Canvas, met PDF/PNG-export. | `TrainingTekenBord`, `VELD_TYPEN`, `LIJN_TOOLS` in `src/schermen/opstellingen.jsx` |
| **Opslag en rechten** | Alle teamgegevens als JSON per (team, sleutel) in `public.gegevens`; RLS per team. Rollen eigenaar/trainer/kijker (`magRol`). Kijker mag niets wijzigen. | `server/01-schema.sql`, `src/kern/rollen.js` |
| **Spelers over seizoenen** | Bij een nieuw seizoen worden spelers gekopieerd (`SEIZOEN_MEE`); de speler-id blijft daardoor gelijk binnen hetzelfde team. | `src/app.jsx` |
| **AI** | Nergens in de code. | — |
| **Tests** | Kale `node`-tests in `tests/`, SQL-tests via Docker, Deno-tests voor edge functions, mutatietesten, gouden origineel (32 schermopnames). | `tests/`, `tools/` |

### 2b. Aannames — later te controleren

- **A1.** Bij het kopiëren van spelers naar een nieuw seizoen blijft de `id`
  ongewijzigd. *Controleren in de code van `NieuwSeizoenKaart` vóór release 1,
  stap 5 (statistieken over meerdere seizoenen).*
- **A2.** Een speler die naar een **ander team** binnen de club gaat, krijgt
  daar een nieuwe record met een andere id. Daarom komt er `persoonId` met een
  koppelscherm (besluit 3, zie 4c).
- **A3.** De datahoeveelheden blijven klein (honderden wedstrijden per seizoen,
  enkele toernooien met < 200 wedstrijden). Plannen en standen berekenen in de
  browser is daarom snel genoeg; geen serverrekenwerk nodig.
- **A4.** Eén competitie wordt door **één TeamTakkie-team** bijgehouden. Als twee
  TeamTakkie-teams in dezelfde poule zitten, voert ieder zijn eigen administratie
  (besluit 5).

---

## 3. Gebruikersroutes en schermen

Alle schermen zijn **mobiel eerst**: één kolom, vaste actieknop onderin,
invoervelden van minimaal 44 px hoog, geen horizontaal scrollen behalve de
standentabel (die krijgt een vaste eerste kolom). Uitstraling: bestaande
kaarten, kleuren (`--blauw`, `--grijs`), knoppen en `tab-knop`.

### 3a. Competitie (release 1)

Plek: nieuw hoofdtabblad **Competitie** binnen *Wedstrijden* (naast
Wedstrijden en Toernooien). *Statistieken › Stand* verwijst daarheen.

```
Competitie
├─ Kop:  [Seizoen 2026/2027 ▾]  ›  [Competitie ▾]  ›  [Fase 2 ▾ · actief]
│        knoppen: "Nieuwe fase", "⋯" (instellingen, fase afsluiten)
├─ Tab Stand        (standaard)
├─ Tab Programma    (speelrondes met wedstrijden, per ronde inklapbaar)
├─ Tab Uitslagen    (compacte invoer per speelronde)
└─ Tab Deelnemers   (teams van deze fase)
```

**Route "Eerste keer":** lege staat → "Competitie aanmaken" → naam (voorstel
"Competitie"), vorm (halve / hele / handmatig) → teams toevoegen in één lijst
(type naam, Enter, volgende; eigen team staat er al en is gemarkeerd) → bij
halve of hele competitie de vraag "Schema nu maken?" → klaar, Stand-tab.

**Route "Nieuwe fase":** knop → naam (voorstel "Fase 3") → "Deelnemers
overnemen uit Fase 2" (aan; lijst met vinkjes om te verwijderen, veld om toe te
voegen) → "Instellingen overnemen" (aan) → vorm → aanmaken. Nieuwe fase wordt
actief; de vorige blijft staan met status *open* totdat je hem afsluit.

**Route "Uitslagen van een speelronde":** Uitslagen-tab → ronde kiezen
(standaard: eerste ronde met ontbrekende uitslagen) → per wedstrijd één regel:
`Thuis [  ] – [  ] Uit` met numeriek toetsenbord, Tab/Enter springt naar het
volgende vak, status-chip (gespeeld / uitgesteld / afgelast), notitie-icoon
(gevuld als er een notitie is). "Opslaan" bewaart alle regels van die ronde
tegelijk. Lege vakken blijven leeg: geen uitslag ≠ 0–0.

**Eigen wedstrijden:** blijven waar ze zijn (Wedstrijden). In het programma
staan ze als regel met een link "Open wedstrijd". De uitslag van een eigen
wedstrijd voer je op één plek in — in de eigen wedstrijd — en de competitie
leest hem daaruit (één registratie, zie 4d).

**Fasekiezer:** toont `Seizoen › Competitie › Fase` met per fase een label
*actief*, *afgesloten* of niets. Wat je bekijkt is een weergavekeuze per
apparaat; welke fase actief is, is een gegeven van de competitie.

### 3b. Statistieken met filters (release 1)

In *Statistieken › Team* en *Individu* komt bovenaan een filterbalk:
`[Bereik: Deze fase ▾]  [Soorten: Competitie, Beker ▾]`.
Bereik: *één fase*, *meerdere fases* (meerkeuze), *heel seizoen*, *meerdere
seizoenen* (meerkeuze). Soorten: competitie, beker, oefen, toernooi — standaard
zoals nu (competitie + beker). Onder de filter één regel uitleg, bijvoorbeeld
"12 wedstrijden · 2 zonder speelminuten".

### 3c. Toernooien (release 2 en 3)

Eén toernooi = één scherm met een **stappenbalk** (op mobiel een kiezer
"Stap 3 van 6 · Indeling ▾"): Instellingen · Deelnemers · Indeling · Schema ·
Resultaten · Presentatie. Elke stap bewaart direct; je kunt vrij heen en weer.
Een wijziging die een al gemaakte indeling of planning raakt, toont vóór het
opslaan wat er gebeurt ("3 geplande wedstrijden vervallen, 2 blijven staan
omdat ze zijn vastgezet").

### 3d. AI-trainer (release 4)

In *Trainingen*: knop **"Vraag de AI-trainer"** opent een chatpaneel (op mobiel
schermvullend). Bovenin een contextregel die je kunt aanpassen, al ingevuld uit
het team: *JO11 · 10 spelers + 1 keeper · 60 min · half veld*. Een antwoord
verschijnt als kaarten (training met onderdelen, of één oefening) met de
tekening; per kaart: *Opslaan in bibliotheek*, *Vervangen*, *Makkelijker*,
*Moeilijker*. Onderaan: *Training opslaan* → datum kiezen.

---

## 4. Datamodel

### 4a. Waar het staat

Alles wat team- en seizoensgebonden is, komt onder **nieuwe sleutels** via
`sleutelVoor()` en synchroniseert dus zonder serverwijziging:

| Sleutel | Bereik | Inhoud |
|---|---|---|
| `fch_competities_v1` | team + seizoen | competities, fases, rondes, wedstrijden, teams, logboek |
| `fch_toernooien_v2` | team + seizoen | toernooien (nieuw model) |
| `fch_ai_gesprekken_v1` | persoonlijk (gedeeld) | laatste gesprekken, alleen lokaal |

Oude sleutels (`fch_stand_v1`, `fch_toernooien_v1`) blijven **ongewijzigd
bestaan**; dat is de terugvalroute.

### 4b. Competitie

```
Competitie  { id, naam, actieveFaseId, teams: CompTeam[], fases: Fase[], logboek: LogRegel[] }

CompTeam    { id, naam, logo?, eigen: boolean, aliassen: string[] }
            – precies één team met eigen=true; dat is het TeamTakkie-team zelf
            – naam verplicht, uniek binnen de competitie na normalisatie (4f)

Fase        { id, naam, van?, tot?, status: "open"|"afgesloten",
              vorm: "half"|"heel"|"handmatig",
              regels: { winst:3, gelijk:1, verlies:0,
                        volgorde: ["punten","saldo","voor","onderling"] },
              deelnemers: CompTeam.id[],
              rondes: Ronde[], wedstrijden: CompWedstrijd[] }

Ronde       { id, nummer, naam, datum?, vrijTeamId? }

CompWedstrijd { id, rondeId, thuisId, uitId, datum?, tijd?, locatie?,
                status: "gepland"|"gespeeld"|"uitgesteld"|"afgelast",
                uitslag: { thuis:int, uit:int } | null,
                notitie: string,
                wedstrijdId?: Wedstrijd.id      // alleen bij een eigen duel
              }

LogRegel    { tijd, door (gebruikers-id of naam), wat, faseId, voor, na }
```

**Validatieregels (afgedwongen in de domeinfuncties, getest):**
- `thuisId ≠ uitId` (geen wedstrijd tegen zichzelf).
- Beide teams zijn deelnemer van díe fase.
- Bij vorm *half*: per fase hoogstens één wedstrijd per ongeordend paar.
  Bij *heel*: hoogstens één per geordend paar (thuis-uit). Bij *handmatig*:
  een tweede wedstrijd tussen hetzelfde paar mag, maar alleen na bevestiging.
- `uitslag` mag alleen gevuld zijn bij status `gespeeld`; status `gespeeld`
  vereist een uitslag. Scores zijn gehele getallen ≥ 0.
- Een wedstrijd hoort bij een fase door **waar hij staat**, niet door zijn
  datum. Een uitgestelde wedstrijd uit Fase 1 met een nieuwe datum in de
  periode van Fase 2 blijft dus in Fase 1.
- Een team verwijderen uit een fase kan alleen als het daar geen wedstrijden
  met uitslag heeft; anders eerst bevestigen, en dan worden die wedstrijden niet
  verwijderd maar blijft het team als "uit de fase" zichtbaar.

### 4c. Wijzigingen aan de bestaande `Wedstrijd`

Drie velden erbij, niets eraf:

```
Wedstrijd.status   + "uitgesteld" | "afgelast"   (naast gepland/gespeeld)
Wedstrijd.competitie?  { competitieId, faseId, compWedstrijdId }
Wedstrijd.uitslagBekend (afgeleid, geen veld): status === "gespeeld"
```

Bestaande code blijft werken: overal waar nu `status==="gespeeld"` wordt
gecontroleerd, betekent dat nog steeds "definitieve uitslag".

**Speler (besluit 3):** één veld erbij, `persoonId` (uuid). Bij aanmaken gelijk
aan een nieuwe uuid; bij kopiëren naar een nieuw seizoen blijft hij gelijk. Een
koppelscherm ("Deze spelers zijn dezelfde persoon") in *Selectie* zet bij
spelers in verschillende teams van dezelfde club dezelfde `persoonId`.
Statistieken over teams heen tellen per `persoonId`. Ontkoppelen kan altijd.

### 4d. Eén registratie per eigen wedstrijd

Een eigen competitieduel bestaat **één keer**, als `Wedstrijd` (met opstelling,
doelpunten, minuten). De bijbehorende `CompWedstrijd` heeft `wedstrijdId` en
**geen eigen uitslag**: de competitie leest de uitslag uit de `Wedstrijd`
(`thuis` + `score.fch/teg` vertaald naar thuis/uit). Zo kunnen stand en
spelerstatistieken nooit uit twee verschillende registraties ontstaan.

### 4e. Toernooi (release 2)

```
Toernooi { id, naam, dagen: Dag[], locaties: Locatie[], categorieen: Categorie[],
           deelnemers: Deelnemer[], scheidsrechters: Scheids[], stadia: Stadium[],
           wedstrijden: TWedstrijd[], evenementen: Evenement[],
           presentatie: Presentatie, publiek?: { slug, gepubliceerdOp },
           logboek: LogRegel[] }

Dag        { id, datum, start, eind }
Locatie    { id, naam, adres?, velden: Veld[], reistijdNaar?: {locatieId: minuten} }
Veld       { id, naam, beschikbaar: [{ dagId, van, tot }] }
Categorie  { id, naam, spelvorm: "11x11"|"9x9"|"8x8"|"6x6"|"4x4"|"2x2"|"1x1",
             geslacht: "heren"|"dames"|"jongens"|"meisjes", leeftijd, niveau,
             wedstrijdduur, wisseltijd, minRust,
             regels: { winst, gelijk, verlies, volgorde[] },
             knockoutGelijk: "strafschoppen"|"verlenging+strafschoppen"|"loting",
             bonus: { aan:false, regels: BonusRegel[] }, spelerStats:false }
Deelnemer  { id, categorieId, soort: "team"|"speler", naam, logo?, spelers?[],
             coach?, email?, telefoon?, sterkte?: 1..n }
Scheids    { id, naam, email?, telefoon?, beschikbaar: [{dagId, van, tot}],
             voorkeurCategorieen?: id[], nietCategorieen?: id[] }
Stadium    { id, categorieId, soort: "poule"|"knockout"|"los", naam,
             poules?: [{ id, naam, deelnemers: id[] }],
             doorgaan?: { perPoule:int, besteNummers?: { plek:int, aantal:int } },
             bracket?: { grootte, koppelingen: Bron[][], troostfinale:bool, plaatsing:bool } }
TWedstrijd { id, nummer, categorieId, stadiumId, pouleId?, rondeNaam,
             thuis: Bron, uit: Bron,            // Bron = {deelnemerId} | {poulePlek} | {winnaarVan} | {verliezerVan}
             thuisVast?: deelnemerId, uitVast?: deelnemerId,  // ingevuld bij "Start volgende fase"
             dagId?, veldId?, start?, scheidsId?, vastgezet:false,
             status, uitslag: {thuis,uit}|null, strafschoppen: {thuis,uit}|null,
             spelerStats?: [...] }
Evenement  { id, naam, dagId, start, duur, locatieId? }
```

**Belangrijke regels:** een wedstrijd verbindt alleen deelnemers uit **dezelfde
categorie** (daardoor nooit 11x11 tegen 6x6); categorie `1x1` heeft
deelnemers van soort `speler`; contactgegevens (`email`, `telefoon`) worden
**nooit** meegenomen in `publiek`, presentatie of downloads voor deelnemers.

**Naamgeving:** in de competitie heet het altijd *Fase* ("Fase 2"); in een
toernooi *Groepsfase*, *Kwartfinale*, *Halve finale*, *Finale*, *Troostfinale*.
Het woord "fase" wordt in toernooien alleen in "groepsfase" gebruikt.

### 4f. Dubbele teams en wedstrijden voorkomen

- **Normaliseren van teamnamen:** kleine letters, accenten weg, meervoudige
  spaties en leestekens weg, "v.v."/"vv" en "s.v."/"sv" gelijkgetrokken.
  `"V.V. Bolsward JO19-1"` en `"vv bolsward jo19-1"` zijn hetzelfde team.
- Bij toevoegen: is de genormaliseerde naam al een team of alias → geen nieuw
  team, maar de keuze "dat team gebruiken" (standaard) of "toch apart".
- Bij een eigen `Wedstrijd` uit import (ICS/plakken) met `soort: competitie`:
  zoek het team via `tegenstander`; is er precies één treffer en staat er in de
  actieve fase een geplande `CompWedstrijd` tussen die twee teams zonder
  `wedstrijdId`, koppel dan na bevestiging in plaats van een tweede aan te maken.
- Een schema genereren in een fase die al wedstrijden heeft, voegt alleen
  ontbrekende paren toe en noemt hoeveel er al stonden.

### 4g. Rechten

| Handeling | Eigenaar | Trainer | Kijker | Openbaar |
|---|---|---|---|---|
| Competitie/fase/teams beheren | ✓ | ✓ | – | – |
| Uitslagen invoeren of corrigeren | ✓ | ✓ | – | – |
| Afgesloten fase wijzigen | ✓ (met bevestiging, gelogd) | – | – | – |
| Stand en statistieken bekijken | ✓ | ✓ | ✓ | – |
| Toernooi beheren | ✓ | ✓ | – | – |
| Toernooi publiceren / presentatie | ✓ | ✓ | – | alleen-lezen via link |

Dit volgt de bestaande `magRol`-indeling; de server (RLS op `public.gegevens`)
blijft de echte grens. Het openbare toernooi is een **aparte, bewust
gepubliceerde momentopname** zonder contactgegevens (zie 5f).

**Gelijktijdig bewerken:** de bestaande synchronisatie werkt per sleutel met
"laatste schrijver wint" en een botsingsmelding. Omdat een hele competitie in
één sleutel staat, botsen twee trainers sneller. Maatregel: wijzigingen worden
als **kleine, idempotente bewerkingen** (`{op:"uitslag", wedstrijdId, uitslag,
tijd, door}`) in het logboek gezet en bij een botsing opnieuw toegepast op de
nieuwste versie; een dubbel toegepaste bewerking verandert niets (dezelfde
uitslag twee keer zetten = één keer).

---

## 5. Logica

Alle logica komt als **pure functies** in nieuwe domeinbestanden
(`src/domein/competitie.js`, `src/domein/toernooi.js`,
`src/domein/aitrainer.js`), los van schermen, met eigen node-tests — zoals
`src/domein/wedstrijden.js` nu.

### 5a. Stand per fase

1. Neem de wedstrijden **van de geselecteerde fase**, met status `gespeeld` en
   een uitslag (voor eigen duels: uit de gekoppelde `Wedstrijd`).
2. Per deelnemer: G, W, GL, V, DV, DT, DS, punten volgens `fase.regels`.
3. Sorteer volgens `fase.regels.volgorde`. Standaard:
   **punten → doelsaldo → doelpunten voor → onderling resultaat**.
4. Alleen wedstrijden met uitslag tellen. Een geplande of uitgestelde wedstrijd
   telt niet als gespeeld. Er worden nooit resultaten verzonnen om aantallen
   gelijk te trekken.
5. **Onvolledig:** een wedstrijd is *achterstallig* als hij een datum in het
   verleden heeft en geen uitslag, of als de ronde een datum in het verleden
   heeft. Boven de stand: "Stand onvolledig: 3 uitslagen ontbreken (ronde 4 en
   5)" met een knop naar de invoer. In de tabel krijgt een team met een
   achterstallige wedstrijd een klein uitroepteken bij G.
6. Een correctie is gewoon een nieuwe uitslag: de stand wordt altijd opnieuw
   berekend, er is geen opgeslagen stand die kan achterlopen.

**Onderling resultaat bij twee of meer gelijke teams** (wordt alleen gebruikt
op de plek waar het in de volgorde staat):

1. Bepaal de groep teams die op alle eerdere criteria gelijk staat.
2. Maak een **minicompetitie** van alleen de onderlinge wedstrijden binnen die
   groep (met uitslag, binnen de fase).
3. Rangschik binnen de groep op: punten in de minicompetitie → doelsaldo in de
   minicompetitie → doelpunten voor in de minicompetitie.
4. Valt de groep daardoor uiteen maar blijven er nog **deelgroepen** gelijk,
   pas stap 2–3 opnieuw toe **op alleen die deelgroep** (dus met minder teams).
5. Verandert er niets meer, dan staan die teams **gedeeld** op dezelfde plek
   (weergave "4–5") en volgt de alfabetische volgorde alleen voor het tonen.

Een team met nul onderlinge wedstrijden heeft in de minicompetitie nul punten;
de stand meldt dan "Onderling resultaat onvolledig" in plaats van stilzwijgend
te beslissen.

### 5b. Schema genereren

- **Halve competitie:** de bestaande `maakPouleSchema` (cirkelmethode). Bij n
  teams: n·(n−1)/2 wedstrijden in n−1 rondes (n even) of n rondes (n oneven).
  Bij een oneven aantal krijgt elke ronde precies één **vrij team**
  (`Ronde.vrijTeamId`), en ieder team is precies één keer vrij.
- **Hele competitie:** eerst de halve, dan dezelfde rondes nog een keer met
  thuis en uit omgedraaid → n·(n−1) wedstrijden. Zes teams: 15 en 30.
- Thuis/uit worden in de eerste helft zo verdeeld dat geen team meer dan twee
  keer achter elkaar thuis of uit speelt (bestaande afwisseling per ronde,
  uitgebreid met een controle en wissel waar nodig).
- **Handmatig:** geen generator; rondes en wedstrijden toevoegen met dezelfde
  validaties.

### 5c. Fases

- Precies één fase per competitie is **actief** (`actieveFaseId`). Nieuwe
  wedstrijden, het dashboard en "volgende wedstrijd" gebruiken de actieve fase.
- **Bekijken** is een weergavekeuze (per apparaat onthouden), los van actief.
- **Afsluiten** zet status `afgesloten`: de fase is alleen-lezen voor trainers;
  de eigenaar kan wijzigen na een bevestiging, en elke wijziging komt in het
  logboek met oude en nieuwe waarde.
- **Nieuwe fase** kopieert op verzoek deelnemers (team-id's, dus dezelfde teams)
  en regels; **nooit** wedstrijden, uitslagen of punten.

### 5d. Spelerstatistieken over fases en seizoenen

- Het bereik bepaalt welke **wedstrijden** meedoen; daarna rekent de bestaande
  `berekenSpelerStats` zoals nu.
- *Fase(s):* eigen `Wedstrijd`-records met `competitie.faseId` in de selectie.
  Beker-, oefen- en toernooiwedstrijden hebben geen fase en vallen bij een
  fasefilter weg; de uitleg onder de filter zegt dat.
- *Seizoen(en):* de wedstrijden uit elk gekozen seizoen worden gelezen via de
  seizoenssleutel van het team. Spelers worden op `persoonId` samengevoegd.
- *Teams (besluit 3):* extra keuze "Alle teams van de club" (alleen als je lid
  bent van die teams). Wedstrijden van andere teams van je club worden gelezen
  uit hun eigen opslag (dezelfde synchronisatie als bij teamwissel); de RLS op
  `public.gegevens` bepaalt wat je mag zien. Een speler die van JO17-1 naar
  JO19-2 ging, telt over beide teams heen als één persoon.
- **Nooit dubbel tellen:** de selectie is een verzameling op `Wedstrijd.id`
  (en seizoen), dus een wedstrijd die in twee gekozen fases zou vallen —
  kan niet, want hij hoort bij één fase — of die via twee filters binnenkomt,
  telt één keer.
- **Ontbrekend is geen nul:** waar een gegeven niet is geregistreerd (geen
  opstelling, onbekende minuten — `minutenOnzeker` bestaat al), staat "—" met
  het aantal wedstrijden zonder registratie, niet 0.
- Een totaal over meerdere seizoenen heet *"Statistieken 2025/2026 + 2026/2027"*,
  nooit "stand".

### 5e. Toernooi: indeling, ongelijke poules, knock-out, doorstroming

- **Automatisch verdelen:** deelnemers met `sterkte` worden als "potten"
  verdeeld (slangvorm: A1, B1, C1, C2, B2, A2…), de rest willekeurig met een
  zichtbare zaadwaarde zodat "opnieuw verdelen" voorspelbaar te herhalen is.
- **Ongelijke poules vergelijken** (voor "beste nummers drie"): standaard op
  **gemiddelden per wedstrijd** (punten, dan doelsaldo, dan doelpunten voor).
  Optie: "resultaat tegen de laatste van de grotere poule telt niet mee".
- **Knock-out met vrijstellingen:** bracketgrootte = eerstvolgende macht van 2;
  het aantal vrijstellingen = grootte − deelnemers, toegekend aan de hoogst
  geplaatsten. Een vrijstelling is zichtbaar als "vrij" en levert geen
  wedstrijd op.
- **Doorstroming:** vervolgwedstrijden verwijzen naar een **bron**
  ("1e poule A", "winnaar wedstrijd 14"). Pas als de organisator bij een
  complete groepsfase op **"Start knock-out"** klikt, worden de bronnen
  ingevuld en vastgezet (`thuisVast`/`uitVast`).
- **Late correctie:** verandert een groepsuitslag daarna de plaatsing, dan:
  - is de betreffende vervolgwedstrijd **nog niet gespeeld** → melding met
    knop "Plaatsing bijwerken" (verandert pas na klikken);
  - is hij **al gespeeld** → er verandert niets; een rode melding "Plaatsing
    wijkt af van de stand na correctie in poule B" blijft staan tot de
    organisator kiest wat er moet gebeuren. Nooit ongemerkt.
- **Strafschoppen** staan apart (`strafschoppen`), tellen niet in doelsaldo of
  doelpunten, bepalen alleen de winnaar van een knock-outwedstrijd.

### 5f. Toernooi: planner (release 3)

**Tijdsloten:** per veld per dag van `van` tot `tot` in stappen van
`wedstrijdduur + wisseltijd` van de categorie; evenementen blokkeren hun tijd
(op hun locatie, of overal).

**Algoritme:** gretig, deterministisch, controleerbaar:
1. Vastgezette wedstrijden eerst op hun plek.
2. Overige wedstrijden in volgorde van stadium (groepsfase vóór knock-out),
   ronde, wedstrijdnummer.
3. Per wedstrijd het vroegste slot dat aan **alle** harde regels voldoet:
   veld vrij; geen overlap voor beide teams; minRust na de vorige wedstrijd
   van beide teams (+ reistijd bij een andere locatie); afhankelijke
   wedstrijden (bv. "winnaar wedstrijd 14") pas na afloop + minRust van die
   wedstrijden; velden geschikt voor de spelvorm (een veld kan per dag een
   spelvorm hebben).
4. Scheidsrechter: vrije, beschikbare scheidsrechter met de minste inzet die
   niet in een overlappende wedstrijd staat en niet uitgesloten is voor de
   categorie; anders leeg + melding.
5. Past een wedstrijd nergens, dan blijft hij **ongepland** met de reden
   ("geen veld vrij tussen 9:00 en 17:00 met 20 minuten rust voor VV A") en
   een voorstel ("rusttijd verlagen naar 10 minuten", "veld 3 ook op zondag",
   "wedstrijdduur 12 minuten").

**Controles na elk handmatig verplaatsen** (dezelfde functie): dubbele
veldbezetting, team- of scheidsrechteroverlap, te weinig rust, buiten
beschikbaarheid, afhankelijkheid. Conflicten worden rood getoond, niet
geblokkeerd — de organisator beslist, maar ziet het altijd.

**Mobiel verplaatsen zonder slepen:** wedstrijd openen → "Verplaatsen" → lijst
met vrije slots (dag · veld · tijd), elk met een groen vinkje of de reden
waarom het conflicteert.

**Weergaven:** tijdlijn per veld (kolommen = velden, regels = tijd) en een
overzicht per team (lijst met tijden, velden en rust ertussen).

### 5g. Presentatie (release 3)

- **Publiceren** maakt een momentopname zonder contactgegevens en zet die in
  een nieuwe tabel `public.toernooi_publiek (slug, team_id, inhoud jsonb,
  bijgewerkt_op)`. Lezen kan anoniem via de slug (een functie met
  `security definer` die alleen `inhoud` teruggeeft); schrijven alleen de
  eigenaar/trainer van dat team.
- **Presentatie-URL:** `app.teamtakkie.nl/?toernooi=<slug>` toont een
  alleen-lezenpagina; `&scherm=groot` geeft de grootschermmodus met grote
  letters, wisselende panelen (aankomend, uitslagen, standen, bracket) en de
  intro van een aankondiging. Knop "Volledig scherm" (Fullscreen API).
- **Live:** de pagina vraagt elke 20 seconden of `bijgewerkt_op` is veranderd
  en ververst dan alleen de inhoud. (Supabase Realtime kan later; niet nodig.)
- **Op een tv:** direct haalbaar = een laptop of mini-pc aan de tv met de
  presentatie-URL op volledig scherm, of **tabblad casten** vanuit Chrome naar
  een Chromecast, of **scherm synchroniseren** (AirPlay) vanaf een Mac of iPad.
  *Niet* in release 3: een eigen Chromecast-ontvanger-app of native AirPlay —
  dat vraagt een geregistreerde Cast-app en eigen ontvangercode, en voegt voor
  een sporthal weinig toe.
- Geluid standaard uit; animaties respecteren "verminderde beweging".

### 5h. AI-trainer (release 4)

**Server-side:** nieuwe edge function `ai-trainer` (zelfde opzet als
`abonnement-opzeggen`): eigenaarscontrole niet nodig, wel ingelogd en lid van
het team; de API-sleutel staat alleen als Supabase-geheim. De app praat nooit
rechtstreeks met de AI-dienst.

**Uitvoer:** de AI moet antwoorden in een **vast JSON-schema** (via de
gestructureerde-uitvoermogelijkheid van de API): `Training{ titel, duur,
onderdelen: Oefening[] }`, waarbij `Oefening` precies de velden van
`LEEG_OEFENING` heeft plus `tekening` in het bestaande formaat
(`{veldType, stappen:[{elems, lijnen}]}`) en `labels` per element.

**Controle vóór tonen én vóór opslaan** (`src/domein/aitrainer.js`, ook op de
server gebruikt):
1. Schema klopt (velden, typen, veldType bestaat, lijntype ∈ `LIJN_TOOLS`).
2. **Tijd:** som van onderdelen + 2 minuten per overgang (uitleg/wissel) ≤
   gevraagde duur; bij 60 minuten dus bijvoorbeeld 4 onderdelen van samen
   ≤ 54 minuten.
3. **Spelers:** aantal speler-elementen in de tekening = genoemd aantal
   spelers in die oefening; ≤ beschikbare spelers; keepers alleen als er
   keepers zijn.
4. **Materiaal:** getelde pionnen, ballen, doelen in de tekening ≤ opgegeven
   materiaal.
5. **Veld:** alle coördinaten binnen het gekozen veldtype; elk label in de
   tekst bestaat in de tekening en andersom.
6. **Belasting:** voor onder-12 geen onderdelen "hoge intensiteit" langer dan
   8 minuten aaneen (regel in een tabel per leeftijd, aan te passen).

Faalt een controle, dan vraagt de server de AI **één keer** om een correctie met
de lijst fouten. Faalt het daarna nog, dan krijgt de trainer het voorstel met de
meldingen, en kan het pas opslaan na aanpassen of expliciet "toch opslaan" (dan
met een markering).

**Persoonsgegevens:** er gaan alleen leeftijdscategorie, niveau, aantallen,
duur, doel, ruimte, materiaal en de chattekst naar de AI. **Nooit** namen van
spelers, club of team, e-mail of gezondheidsgegevens; de server filtert de
contextregel daarop. De chattekst van de trainer gaat wel mee — de app zegt dat
erbij ("Typ geen namen van spelers"). Avg-inventaris aanvullen met de
AI-leverancier als verwerker.

**Kosten en limieten:** tabel `public.ai_gebruik (club_id, maand, verzoeken,
tokens_in, tokens_uit)`, opgehoogd door de edge function met de service-sleutel;
geen maandlimiet (besluit 1: onbeperkt in Coach en Club; Free krijgt een
slotje). Wel een technische rem tegen misbruik: één verzoek tegelijk en
hoogstens 20 per 10 minuten per gebruiker, en een vaste maximale
antwoordlengte. Evan krijgt een maandoverzicht van verzoeken en tokens per club
(een SQL-overzicht zoals `wissel_controle()`), zodat onverwachte kosten
zichtbaar zijn.

**Uitval:** opgeslagen oefeningen en trainingen zijn gewone records in de
bestaande opslag. Werkt de AI niet, dan is alleen de chat weg ("De AI-trainer is
nu niet bereikbaar; je opgeslagen trainingen staan gewoon in de bibliotheek").

**Toon:** de AI spreekt als ervaren jeugdtrainer, maar presenteert zich nergens
als gediplomeerde persoon; vaste zin in de systeeminstructie en onder de chat.

---

## 6. Migratieplan bestaande gegevens

**Uitgangspunt:** niets wordt verwijderd of overschreven. De oude sleutels
blijven staan; de nieuwe module leest ze alleen.

**Stap M1 — Competitie aanmaken (eenmalig per team en seizoen, bij eerste
openen van het tabblad Competitie):**
1. Maak competitie "Competitie" met **Fase 1** (zonder datums, status open,
   actief, vorm *handmatig*).
2. Teams: het eigen team + alle namen uit `fch_stand_v1` + alle unieke
   `tegenstander`-waarden van eigen wedstrijden met soort competitie,
   samengevoegd via de naamnormalisatie (4f).
3. **Voorstel, geen besluit:** een scherm "Bestaande wedstrijden indelen" toont
   alle eigen competitiewedstrijden van dit seizoen met als voorstel *Fase 1*.
   De gebruiker kan per wedstrijd (of per selectie op datum: "alles vóór
   1 december → Fase 1, daarna → Fase 2") een fase kiezen of nieuwe fases
   aanmaken. Pas na "Indeling bevestigen" worden `CompWedstrijd`-regels
   aangemaakt en gekoppeld (`wedstrijdId`). Tot die tijd toont de stand de
   melding "Wedstrijden nog niet ingedeeld".
4. **De oude handmatige stand** blijft raadpleegbaar onder "Oude stand
   (handmatig ingevuld)", alleen-lezen. Hij wordt **niet** in de nieuwe stand
   opgeteld — handmatige totalen zijn geen wedstrijden en zouden dubbel tellen.

**Stap M2 — Toernooien:** elk toernooi uit `fch_toernooien_v1` wordt omgezet
naar het nieuwe model: één dag (datum), één locatie (naam), velden 1..n, één
categorie, één poule-stadium met de teams en wedstrijden (inclusief uitslagen).
De oude lijst blijft staan.

**Controle:**
- Na M1: per team-seizoen telt een controlefunctie dat het aantal eigen
  competitiewedstrijden met uitslag vóór = het aantal gekoppelde
  `CompWedstrijd`-regels ná, en dat de eigen rij in de nieuwe stand (alle fases
  samen) dezelfde W/GL/V/DV/DT heeft als `eigenStandRij` vóór de migratie.
- Na M2: aantal toernooien, teams, wedstrijden en de stand per toernooi gelijk.
- Een node-test draait beide migraties op de vaste vulling van het gouden
  origineel.

**Stap M3 — Spelers:** elke bestaande speler krijgt een `persoonId`. Binnen
één team over seizoenen heen: dezelfde `persoonId` als de `id` gelijk is.
Over teams heen: **geen** automatische koppeling op naam (twee keer "Daan"
is niet per se dezelfde Daan) — wel een voorstellijst bij gelijke naam én
geboortedatum, die de gebruiker bevestigt.

**Terugval:** de nieuwe sleutel weghalen (één knop in Instellingen voor de
beheerder, of de sleutel in `public.gegevens` verwijderen) zet alles terug naar
de oude weergave, omdat de oude sleutels nooit zijn aangeraakt. De nieuwe
velden op `Wedstrijd` (`competitie`, statussen) worden door de oude code
genegeerd; `uitgesteld`/`afgelast` zou de oude code als "niet gespeeld" lezen —
wat klopt.

---

## 7. Roadmap

| Release | Inhoud | Afhankelijk van | Omvang (bouw + tests) |
|---|---|---|---|
| **1** | Competitie: teams, seizoen/fases, rondes, uitslagen, correcte stand, migratie, statistiekfilters over fases, seizoenen én teams (`persoonId`) | — | **L** · ± 15–18 werkdagen |
| **2** | Toernooi: instellingen, deelnemers, indeling, handmatig schema, resultaten, doorstroming, basisdownloads, migratie v1 | gedeelde standfunctie uit R1 | **L** · ± 12–15 werkdagen |
| **3** | Automatische planner, scheidsrechtersindeling, publiceren, presentatie/grootscherm | R2 | **M/L** · ± 10 werkdagen |
| **4** | AI-trainer met tekeningen, controle, opslag, limieten | — (los van R1–3) | **M** · ± 8–10 werkdagen + proefperiode |

R4 heeft geen technische afhankelijkheid van R1–R3 en kan naar voren als dat
commercieel beter uitkomt; R1 blijft de hoogste prioriteit.

---

## 8. Backlog per release

### Release 1 — Competitie

1. `src/domein/competitie.js`: `normaliseerTeamNaam`, `genereerSchema(half|heel)`,
   `standVanFase(fase, eigenWedstrijden, regels)` met onderling resultaat,
   `achterstallig(fase, vandaag)`, validaties (4b), `pasBewerkingToe(op)`.
2. Opslag `fch_competities_v1` + laad/bewaarfuncties via `sleutelVoor`.
3. `Wedstrijd`: statussen uitgesteld/afgelast in formulier en lijst;
   `competitie`-koppeling; uitslag niet meer standaard 0–0 tonen bij gepland
   (veld leeg tot gespeeld).
4. Scherm Competitie: kop met fasekiezer, tabs Stand / Programma / Uitslagen /
   Deelnemers; lege staat; "Nieuwe fase"; fase afsluiten; logboek-weergave.
5. Snelle uitslageninvoer per ronde, notitie-icoon, statuskeuze.
6. Migratie M1 met het indeelscherm en de controlefunctie.
7. Statistiekfilters (bereik, soorten, teams) in Team en Individu; "—" voor
   ontbrekende gegevens; `persoonId` en koppelscherm in Selectie.
8. *Statistieken › Stand* verwijst naar Competitie; oude stand alleen-lezen.
9. Dashboard: "positie in de stand" komt uit de actieve fase.
10. Tests (zie 9), gouden origineel bijwerken, mobiele schermafdrukken.

### Release 2 — Toernooi

1. `src/domein/toernooi.js`: indeling (handmatig/automatisch/sterkte), poules,
   bracket met vrijstellingen, bronnen en "Start knock-out", vergelijking
   ongelijke poules, stand per poule (gedeeld met R1), strafschoppen.
2. Opslag `fch_toernooien_v2` + migratie M2.
3. Schermen stappen 1–5 (zonder automatische planner): handmatig dag/veld/tijd
   toewijzen met de conflictcontrole uit 5f (de controle is in R2 al nodig).
4. Resultateninvoer per categorie/poule/veld/tijdvak; doorgaan-overzicht.
5. Downloads (jsPDF, bestaat al): schema totaal/per team/categorie/veld,
   poules en standen, einduitslag, wedstrijdbriefjes; CSV-export van het schema.
6. Tests.

### Release 3 — Planner en presentatie

1. Planner (5f) met reden-en-voorstel bij ongeplande wedstrijden, vastzetten.
2. Scheidsrechters: beschikbaarheid, automatisch en handmatig toewijzen,
   schema per scheidsrechter, briefjes met naam.
3. Tijdlijn per veld, overzicht per team, mobiel "Verplaatsen".
4. `server/23-toernooi-publiek.sql` (tabel, RLS, leesfunctie) + test.
5. Presentatiepagina, grootschermmodus, intro's, verversen, eigen logo/kleuren.
6. Tests en een laadproef met 200 wedstrijden / 4 dagen / 12 velden.

### Release 4 — AI-trainer

1. `src/domein/aitrainer.js`: schema, validaties (5h), tijd- en
   belastingregels per leeftijd.
2. Edge function `ai-trainer` met sleutel als geheim, één correctieronde,
   logboek zonder persoonsgegevens; `server/24-ai-gebruik.sql`.
3. Chatpaneel in Trainingen, kaarten met tekening (bestaand tekenbord,
   alleen-lezen weergave), acties makkelijker/moeilijker/vervangen.
4. Opslaan als oefening, als training met datum; afdrukken/PDF (bestaat).
5. AVG-inventaris en privacybeleid aanvullen.
6. Tests met nagemaakte AI-antwoorden (geldig, ongeldig, half geldig) en een
   proef met echte trainers.

---

## 9. Acceptatiecriteria en tests

Elke regel hieronder wordt een geautomatiseerde test (node, Deno of SQL) en
wordt gecontroleerd met een opzettelijke fout die hem rood moet maken.

| # | Scenario | Hoe getest |
|---|---|---|
| 1 | Team heeft 5 gespeelde wedstrijden in Fase 1. Na "Nieuwe fase" staat het in Fase 2 op G 0, P 0; Fase 1 toont nog G 5 met dezelfde punten. | node: `standVanFase` op beide fases na `nieuweFase()` |
| 2 | Uitslag VV A – VV B 2–1 (eigen team speelt niet): A +3 punten, B +0, beide G +1, doelpunten kloppen. | node |
| 3 | Lege uitslag telt niet (G blijft gelijk); definitieve 0–0 telt (G +1, beide +1 punt). | node |
| 4 | 6 teams: halve competitie = 15 wedstrijden in 5 rondes, hele = 30 in 10; elk paar precies 1× resp. 2× (thuis en uit). | node |
| 5 | 5 teams, halve competitie: 5 rondes, 10 wedstrijden, elke ronde precies één vrij team, elk team precies één keer vrij. | node |
| 6 | Wedstrijd in Fase 1 uitgesteld naar een datum in de periode van Fase 2 en daar gespeeld: telt in de stand van Fase 1, niet van Fase 2. | node |
| 7 | Statistiekfilter "Fase 1 + Fase 2 + heel seizoen": elke wedstrijd één keer in de telling. | node: telling op unieke id's |
| 8 | Drie teams gelijk op punten, saldo en voor; onderling resultaat beslist, en bij een blijvende tweestrijd wordt de minicompetitie opnieuw op die twee toegepast. | node, met een uitgerekend voorbeeld |
| 9 | Correctie van een uitslag wijzigt de stand direct; het logboek bevat oud en nieuw. | node |
| 10 | Migratie M1: eigen W/GL/V/DV/DT vóór = som over fases ná; oude stand onveranderd. | node op de gouden vulling |
| 11 | Toernooi met 3 categorieën, 2 dagen, 2 locaties; geen wedstrijd tussen categorieën. | node |
| 12 | Planner: geen dubbele veld-, team- of scheidsrechterbezetting; onoplosbare set (te weinig tijd) levert ongeplande wedstrijden met reden en voorstel. | node, ook een eigenschapstest met willekeurige toernooien |
| 13 | Groepsuitslag gecorrigeerd na een gespeelde kwartfinale: deelnemers van die kwartfinale ongewijzigd, melding zichtbaar. | node |
| 14 | AI-training van 60 minuten: som onderdelen + overgangen ≤ 60. | node op `aitrainer.js` + Deno met nagemaakt antwoord |
| 15 | AI-tekening: aantal spelers en materiaal in de tekening komen overeen met de tekst; ongeldige tekening wordt niet opgeslagen zonder bevestiging. | node + Deno |
| 16 | Kijker kan geen uitslag invoeren; openbare toernooipagina bevat geen e-mail of telefoonnummer. | node (rollen) + SQL-test (publiek) |
| 17 | Dezelfde uitslagbewerking twee keer toepassen verandert niets. | node |
| 20 | Een speler gekoppeld over JO17-1 en JO19-2: zijn doelpunten tellen in "alle teams" één keer per wedstrijd. | node |

Daarnaast per release: gouden origineel bijgewerkt (alleen bedoelde
verschillen), schermafdrukken op 390 px breed, en een handmatige ronde op een
telefoon.

---

## 10. Productvragen — beantwoord

Alle vijf beantwoord op 9 oktober 2026; zie hoofdstuk 0. Nieuwe keuzes die
daaruit volgen, met een standaard (geen vraag, wel bij review te wijzigen):

- **Competitie per team:** elk TeamTakkie-team houdt zijn eigen competitie bij
  (besluit 5). Een later te bouwen "gedeelde competitie" zou eigen
  servertabellen vragen; dat staat niet op de roadmap.
- **Spelers koppelen over teams:** nooit automatisch, alleen na bevestiging.
- **AI zonder maandlimiet:** wel een technische rem (1 tegelijk, 20 per 10
  minuten per gebruiker) en een maandelijks kostenoverzicht voor Evan.

**Gekozen standaarden (geen vraag):** puntentelling 3-1-0; knock-out bij gelijk
= strafschoppen; bonuspunten uit; spelerstatistieken in toernooien uit; geluid
in presentatie uit; scheidsrechtercontact nooit openbaar; een afgesloten fase
alleen door de eigenaar te wijzigen; vergelijking ongelijke
poules op gemiddelden.

## 11. Eerste implementatiepakket (release 1)

**Doel:** de stand klopt per fase, uit echte uitslagen, zonder iets van de
bestaande gegevens te verliezen. Elke stap houdt `online/index.html` uitrolbaar
(regel 2 in CLAUDE.md); stappen 1–3 veranderen nog niets zichtbaars.

| Stap | Wat | Bewijs dat het werkt |
|---|---|---|
| 1 | **Tests eerst:** `tests/competitie.test.js` met scenario 1–9, 17 en 20, rood. | Tests draaien en falen om de juiste reden. |
| 2 | `src/domein/competitie.js`: normaliseren, schema (hergebruik `maakPouleSchema`), stand met onderling resultaat, achterstallig, validaties, bewerkingen. | Stap-1-tests groen; per functie een opzettelijke fout die rood wordt (vastgelegd in een mutatielijst zoals `tests/edge-mutaties.py`). |
| 3 | Opslag `fch_competities_v1` en migraties M1 en M3 als pure functies + controlefunctie. | `tests/competitie-migratie.test.js` op de gouden vulling: scenario 10 groen; oude sleutels byte-gelijk. |
| 4 | `Wedstrijd`: statussen uitgesteld/afgelast, koppeling, lege uitslag bij gepland; speler `persoonId`. | Bestaande tests groen; gouden origineel: alleen bedoelde verschillen, gecontroleerd en opnieuw opgenomen. |
| 5 | Scherm Competitie (Stand + Deelnemers + fasekiezer + Nieuwe fase), achter een instelling "Nieuwe competitie (proef)" voor jouw eigen team. | Schermafdrukken op 390 px; jij test met je eigen JO19-2 en het indeelscherm. |
| 6 | Programma + uitslageninvoer per ronde, notities, statussen. | Scenario 2–6 handmatig nagelopen op een telefoon; tests groen. |
| 7 | Statistiekfilters (fases, seizoenen, teams) en koppelscherm spelers. | Scenario 7 en 20; "heel seizoen, dit team" = huidige cijfers. |
| 8 | Proefinstelling weg, Competitie voor iedereen, oude Stand alleen-lezen, dashboard op actieve fase. | Volledige testset, gouden origineel, uitrol, controle met de vier testers. |

Na stap 8: release 1 is af als de competitie-scenario's (1–10, 17 en 20) als
geautomatiseerde test groen zijn, elke test een opzettelijke fout vangt, en jij
met je eigen team een nieuwe fase hebt aangemaakt waarin het team op nul begint
terwijl de vorige fase intact is.
