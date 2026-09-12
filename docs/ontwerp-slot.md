## Scene 3 — Het slot op een afgeschermd onderdeel

Voor: Fenna. Van: ontwerp (werkbriefje, scene 3).
Gaat over: Trainingen, Agenda, Statistieken, Live en Clubhuis, zodra die niet
meer voor elk pakket (free / basic / pro / max) toegankelijk zijn.

Dit document is bedoeld om zonder verder overleg te kunnen bouwen. Waar ik een
regelnummer noem, is dat de huidige regel in `online/index.html`; als je
onderweg regels toevoegt schuiven latere nummers uiteraard op.

---

### 1. De keuze: het blijft staan, met een slot. Het verdwijnt niet.

Dit is de kern, dus ik ben er stellig in.

Een onderdeel dat verdwijnt uit het menu is rustiger om te bouwen en te zien,
maar het lost het probleem van de klant niet op — het verbergt het. Een
trainer die nooit ziet dat er een live-wedstrijdklok of een clubhuis-module
bestaat, weet niet dat hij iets mist, en gaat er dus ook nooit voor betalen.
Voor een club die zelf de rekening betaalt is dat een gemiste kans, niet een
service: iemand moet straks aan de bar horen van een andere club dat "TEAMTAKKIE
toch echt live kan meekijken" voordat hij bedenkt dat te willen. Dat is een
slecht moment om daarachter te komen.

Er is ook een praktisch argument: onderdelen die per pakket verschijnen en
verdwijnen maken het menu instabiel. Iemand die net van Free naar Basic is
gegaan ziet zijn menu ineens groter worden; iemand die nog op Free zit legt aan
zijn assistent-trainer uit "nee, Statistieken zie jij niet, want jij hebt een
ander account" — terwijl het antwoord "dat zit nog niet in ons pakket" precies
even lang is en niets verbergt. Een menu dat er voor iedereen hetzelfde uitziet
is voorspelbaar, en voorspelbaar is precies wat je wil langs de lijn.

Dus: **alle vijf onderdelen blijven altijd op hun vaste plek staan, voor elk
pakket, in dezelfde volgorde.** Wat per pakket verschilt is niet de lijst,
maar of een tik erop je naar binnen laat of een eerlijk antwoord geeft.

Dit is precies waarom `PAGINA_MODULE`, `magModule` en `magPagina`
(`online/index.html:3527-3549`) er al liggen — ze zijn nu dode code ("Zolang er
nog geen accounts zijn staat iedereen op max", regel 3512-3513) en scene 3 is
het moment waarop ze voor het eerst iets gaan doen.

---

### 2. Hoe een geblokkeerd onderdeel eruitziet

Geen tweede stijl, geen grijze wolk over het item heen. Twee redenen: het moet
in fel zonlicht leesbaar blijven (grijs-op-grijs is buiten onzichtbaar), en een
dichtgetimmerd icoon voelt als een uitsluiting, terwijl een informatief slotje
een aanbod is. Dus:

- Icoon en label blijven **normaal leesbaar** — dezelfde kleur, hetzelfde
  gewicht als een onderdeel dat wél mag. Niets dimmen.
- Er komt één klein slotje bij, in **`var(--goud)`** (met eventueel
  `var(--vlak-goud)` als vlakje erachter) — de kleur die deze app al gebruikt
  voor "dit is bijzonder": Man of the Match, favoriete speler, "Al bekend"-tag.
  Geen nieuwe kleur, wel een nieuwe betekenis die aansluit bij de oude: goud is
  hier al "dit onderscheidt zich", en dat is precies wat een pro-onderdeel is.
  `fa-solid fa-lock` bestaat al in het bestand (regel 27847, "In schuine
  weergave kun je niet tekenen") als icoon voor "dit kan nu niet, hier waarom"
  — dezelfde betekenis, dus hetzelfde icoon.

- **Zijmenu** (tablet/laptop, regel 33466-33482, geknopt vanaf regel 33845):
  het slotje komt na het label, in de `zij-item`-knop, zoals er nu al ruimte is
  voor tekst na het icoon. Klein, ~11px, geen aparte regel.
- **Mobiele balk** (regel 33455-33464, geknopt vanaf regel 33906): hier is geen
  ruimte naast de tekst (10px, één regel, vijf knoppen die het al druk hebben).
  Het slotje komt als een klein rond badge-je rechtsboven op het icoon zelf —
  zelfde opbouw als het bestaande `.terug-teller`-badge (regel 290), maar dan
  met een slotje in plaats van een cijfer. Dat is een patroon dat al in het
  bestand bestaat voor "iets extra's op een knop", nu hergebruikt.
- **Dashboard-snelkoppelingen** (het tegel-rooster op regel 24684-24705) is een
  derde plek die naar dezelfde vijf pagina's linkt. Die krijgt exact hetzelfde
  slotje op de tegel. Dit staat niet met zoveel woorden in de opdracht, maar
  het is dezelfde `navigeer(pagina)`-aanroep naar dezelfde pagina's — als hier
  niets verandert, tik je op een tegel die zonder waarschuwing een ander
  gedrag heeft dan de knoppen ernaast, en dat is precies het soort
  verrassing die niet mag.

Volgorde en groepen blijven ongewijzigd. Geen "premium" rijtje onderaan, geen
aparte sectie — een geblokkeerd onderdeel staat waar het altijd al stond.

---

### 3. Wat er gebeurt bij een tik

Dit is de belangrijkste eis uit de opdracht: iemand die er tijdens de
wedstrijd per ongeluk op tikt, met natte handen, mag daar geen tik aan kwijt
zijn om ervan af te komen.

Een tik op een geblokkeerd onderdeel:

1. **Navigeert niet.** Je komt nooit op een kapotte of lege pagina terecht.
2. **Opent geen scherm, geen overlay, geen bevestigingsvraag.** Er is niets om
   weg te tikken.
3. Toont een **toast** — het bestaande meldingsmechanisme (`toon()`,
   regel 5771, met `ToastHouder` op regel 5787) dat de app al overal
   gebruikt voor "iets is gebeurd, hier een optionele vervolgstap". Bijvoorbeeld
   bij het verwijderen van een doel: "Doel verwijderd" met een knop "Ongedaan
   maken" die vanzelf verdwijnt als je niets doet.
   Hier hetzelfde recept: soort `"info"`, tekst die zegt wát er nodig is (niet
   wat je mist), een knop **"Bekijk pakketten"**, en verder niets. Geen kruisje
   dat je moet aantikken om door te gaan met je wedstrijd — de toast lost
   zichzelf na een paar seconden op (`duur`, standaard 7000ms bij een toast met
   een knop, precies wat er al gebeurt bij andere toasts met een actie). Een
   ongelukkige tik kost dus **nul** vervolgtikken: niets doen is genoeg.
   Wie wél wil kijken, doet dat met precies één tik op "Bekijk pakketten" —
   dezelfde prijs als elke andere sheet in de app, niets extra's.

Voorbeeldteksten (rustig, geen vaktaal, geen "Upgrade nu!"):

- Trainingen / Agenda (Free): *"Trainingen en agenda horen bij Basic."*
- Statistieken / Live (Free/Basic): *"Statistieken en live horen bij Pro."*
- Clubhuis (Free/Basic): *"Clubhuis hoort bij Pro."*

Dit is dezelfde toon als de bestaande melding bij een teamlimiet (regel
33683-33686: *"Met Free kun je 1 team beheren, en die heb je al. Kies een
groter pakket voor meer."*) — feitelijk, noemt het pakket bij naam, geen
schuldgevoel. Geen "Dit mis je!", geen rode kleur, geen uitroepteken.

---

### 4. De koppeling met Pakketten

`PakkettenSheet` (regel 32454) verandert niet van karakter — het blijft een
prijskaart, geen instellingenscherm, en de "Overstappen"-knop blijft doen wat
hij al doet. Eén toevoeging: als de sheet wordt geopend vanuit een slotje (dus
via de toast-knop, niet via "Bekijk pakketten" in Instellingen), krijgt de
kaart van het pakket dat het antwoord geeft — het goedkoopste pakket dat de
aangetikte module bevat — een gouden rand of gloed, dezelfde `--goud`-kleur als
het slotje. Geen tekst, geen badge erbij, gewoon een rand die zegt "dit is 'm".
Zo hoeft niemand vier kaarten te lezen om te snappen welke van toepassing is.
Bij de normale weg (Instellingen → Abonnement → "Bekijk pakketten") is er geen
nadruk — daar bekijkt iemand het hele overzicht, niet één antwoord.

Technisch: geef `PakkettenSheet` een optionele prop, bijvoorbeeld `nadruk`
(een pakket-id). In de `.map` over `PAKKETTEN` (regel 32465) krijgt de kaart
waarvan `p.id === nadruk` een extra klasse, bijvoorbeeld `pakket-kaart nadruk`,
met in het stijlblok bij `.pakket-kaart` (regel 1486-1488) een regel zoals
`.pakket-kaart.nadruk { border-color:var(--goud); box-shadow:0 0 0 3px var(--vlak-goud); }`.

---

### 5. Eén plek die bepaalt wat mag, overal hetzelfde antwoord

Op dit moment roepen de mobiele balk (regel 33906-33911), het zijmenu (regel
33851-33861) en het dashboard (`navigeer`, doorgegeven vanaf de plek waar
`Dashboard` gebruikt wordt) alle drie rechtstreeks `setPagina(...)` aan. Dat
moet één gezamenlijke doorgang worden, zodat er nergens een tweede plek is die
het antwoord anders kan geven dan `magPagina` zegt:

```
function gaNaar(pagina) {
  if (!magPagina(pagina)) {
    toon(lockTekst(pagina), { actieLabel:"Bekijk pakketten",
      actie:function(){ setPakkettenNadruk(pakketVoorModule(PAGINA_MODULE[pagina])); setPakkettenOpen(true); } });
    return;
  }
  setPagina(pagina);
}
```

- `lockTekst(pagina)` geeft de teksten uit sectie 3, per module.
- `pakketVoorModule(module)` is nieuw, klein, naast `PAKKETTEN`
  (rond regel 3524): loopt `PAKKETTEN` in volgorde af (free → basic → pro →
  max, zoals het array al gesorteerd is) en geeft het eerste pakket terug dat
  de module bevat. Dat is meteen "het goedkoopste antwoord".
- `gaNaar` vervangt de rechtstreekse `setPagina(item.id)`-aanroepen in de
  mobiele balk en het zijmenu, én de `navigeer`-functie die aan `Dashboard`
  wordt doorgegeven.

Daarnaast: `renderPagina()` (rond regel 33780) moet zichzelf ook aan deze regel
houden, niet alleen de knoppen. Stel dat iemand al op Statistieken staat en het
pakket wijzigt (of een keer per ongeluk toch binnenkomt via een oude link) —
dan mag er nooit een leeg of half scherm verschijnen. Vóór de `switch` een
check: als `!magPagina(pagina)`, render dan niet die module, maar stuur via
`gaNaar("dashboard")` terug en laat dezelfde toast zien. Zo is er precies één
plek (`gaNaar`) die ooit "nee" zegt, en die nee komt altijd met hetzelfde,
rustige antwoord — nooit een leeg scherm zonder uitleg.

---

### 6. Wat er niet verandert

- De **samenstelling** van de mobiele balk (5 knoppen) en de groepen in het
  zijmenu blijft voor elk pakket gelijk. Geen balk die van vorm verandert
  zodra iemand upgradet of downgradet — dat zou de plek waar je met je duim op
  vertrouwt onder je vandaan halen.
- `PakkettenSheet` blijft een prijskaart: geen aan/uit-schakelaars, geen
  instelling om te "proberen", geen tijdklok die aftelt. Dat is bewust zo
  gebouwd (zie het commentaar op regel 32441-32453) en scene 3 tast dat niet
  aan.
- Geen bevestigingsscherm, geen "weet je het zeker?" bij een geblokkeerd
  onderdeel. Dat past bij knoppen die je met opzet indrukt, niet bij een
  toevallige tik tijdens een wedstrijd.

---

### 7. Toegankelijkheid

- Kleur is nooit het enige signaal: het slotje is een los, herkenbaar icoon
  (`fa-lock`), niet alleen een andere tint.
- Elke geblokkeerde knop krijgt een `aria-label` die uitlegt wát er aan de
  hand is, bijvoorbeeld `aria-label="Statistieken — hoort bij Pro"`, in
  plaats van het `disabled`-attribuut. Een echt uitgeschakelde knop is voor een
  schermlezer onbereikbaar en onbegrijpelijk ("niet beschikbaar", zonder
  waarom); deze knop moet juist wél bereikbaar zijn en juist wél uitleggen
  waarom, precies zoals `aria-current="page"` nu al gebruikt wordt bij
  `zij-item` (regel 33854).
- De toast is met het toetsenbord te bereiken zoals elke andere toast in de
  app al is (dezelfde `ToastHouder`), dus daar hoeft niets nieuws voor
  gebouwd te worden.

---

### 8. Checklist voor "dit is klaar"

- [ ] Alle vijf onderdelen staan voor elk pakket op dezelfde plek, in dezelfde
      volgorde, in mobiele balk, zijmenu én dashboard-snelkoppelingen.
- [ ] Een geblokkeerd onderdeel is even leesbaar als een open onderdeel; het
      enige verschil is het gouden slotje.
- [ ] Een tik op een geblokkeerd onderdeel navigeert nooit, opent nooit een
      scherm vanzelf, en lost zichzelf op zonder dat er iets aangetikt hoeft
      te worden.
- [ ] Eén tik extra (op "Bekijk pakketten") toont de prijskaart, met het juiste
      pakket goud omrand.
- [ ] Er bestaat geen enkel scenario (directe link, downgrade terwijl je er al
      op staat) waarin een leeg of kapot scherm verschijnt.
- [ ] De teksten noemen het pakket bij naam, feitelijk, zonder aandringen.
