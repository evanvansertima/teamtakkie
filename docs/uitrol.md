# Uitrollen vanaf git — plan (nog niet uitgevoerd)

**Wat dit is:** een genummerd stappenplan voor Evan om zélf in Netlify te
klikken. Er is hier niets aangeraakt op Netlify, GitHub of Supabase — dit
document beschrijft alleen wat je moet doen en wat je daarna moet zien.

**Waarom dit de moeite waard is:** nu sleep je een map naar Netlify. Er is
dan geen verband tussen wat er live staat en welke commit dat is — als er
iets misgaat, kun je alleen terug door een oudere map op je eigen schijf
te zoeken. Als Netlify in plaats daarvan bouwt vanaf de GitHub-repo, hoort
elke live versie bij een commit. Terugdraaien wordt dan: in Netlify een
oudere uitrol aanwijzen en op "Publish" klikken. Geen map zoeken meer.

**Twee dingen die bij dit project horen en die de standaard Netlify-uitleg
niet vertelt:**

1. **Er is geen bouwstap.** `online/index.html` ís de app; Babel vertaalt
   de JSX in de browser van elke bezoeker, er wordt niets vooraf
   "gebouwd". Netlify hoeft dus nooit een bouwcommando uit te voeren — je
   laat het bouwcommando-veld helemaal leeg en wijst alleen de map
   `online` aan als wat gepubliceerd moet worden.
2. **`online/sw.js` is een service worker** — een stukje code dat de app
   en de zes bibliotheken (React, Babel, jsPDF, Three.js, Font Awesome,
   Google Fonts) bewaart op het apparaat van de gebruiker, zodat de app
   ook op een veld zonder bereik werkt. Zie hieronder ("Over de service
   worker") wat dat betekent voor een uitrol.

---

## Open vraag die ik niet voor je invul

De repo heeft twee branches: `main` en `seizoenfix`. Fenna werkt op dit
moment op `seizoenfix`. Ik weet niet of de map die nu op Netlify staat
overeenkomt met `main`, met `seizoenfix`, of met geen van beide (dat kan,
want tot nu toe ging elke uitrol los van git).

**Voordat je begint: welke branch moet "live" worden?** Gebruikelijk is
dat `main` de branch is die altijd live mag staan, en dat `seizoenfix`
pas naar `main` gaat als een verbouwing af is en getest is. Dat is ook
wat ik hieronder aanhoud. Wil je dat `seizoenfix` voorlopig live staat
(bijvoorbeeld omdat `main` verouderd is), zeg dat dan — dan verandert
alleen stap 4 hieronder (welke branch je kiest), de rest blijft gelijk.

---

## Stap 0 — Zorg voor een vangnet vóórdat je iets verandert

Dit raakt je live app. Zorg dat je terug kunt naar precies wat er nu
staat, los van Netlify.

1. Zoek de map die je de laatste keer naar Netlify hebt gesleept (op je
   eigen schijf, of in `Back-ups/`).
   **Wat je moet zien:** een map met daarin `index.html` en `sw.js`.
2. Heb je die map niet meer, download dan de huidige uitrol via Netlify
   zelf: log in, open je site, ga naar het tabblad **Deploys**, klik op
   de bovenste (huidige, "Published") uitrol, en zoek de knop om de
   bestanden te downloaden.
   **Wat je moet zien:** een zip-bestand met dezelfde twee bestanden.

**Als dit misgaat:** niets is nog veranderd, je hebt alleen gezocht. Ga
pas naar stap 1 als je met zekerheid een kopie van de huidige live map
hebt liggen.

---

## Stap 1 — Bekijk wat er nu op Netlify is ingesteld

1. Log in op netlify.com en open de TEAMTAKKIE-site.
2. Ga naar **Site configuration → Build & deploy**.
   **Wat je moet zien:** een melding dat deze site niet gekoppeld is aan
   een Git-repository, en/of een tabblad **Deploys** waar eerdere
   uitrollen staan als "Deploy manually" of vergelijkbaar.

**Als dit misgaat:** je hebt alleen gekeken, er is niets aangeklikt dat
iets verandert. Sluit het tabblad en probeer het later opnieuw.

---

## Stap 2 — Koppel de site aan de GitHub-repo

1. Ga naar **Site configuration → Build & deploy → Continuous
   deployment**.
2. Zoek de knop om een Git-repository te koppelen (heet meestal "Link
   repository" of "Link site to Git", soms bij "Continuous deployment").
3. Kies **GitHub** en geef Netlify toestemming als daarom gevraagd wordt.
   **Wat je moet zien:** een lijst met je GitHub-repositories.
4. Kies `evanvansertima/fc-harlingen`.
   **Wat je moet zien:** een scherm met instellingen voor deze
   koppeling: welke branch, een bouwcommando en een publicatiemap.

**Als dit misgaat:** klik dit scherm weg zonder op "Deploy site" of
"Save" te klikken. De site blijft dan zoals in stap 1: niet gekoppeld,
nog steeds met de map van het slepen erop.

---

## Stap 3 — De instellingen die hier eigen aan dit project zijn

Vul op het instellingenscherm uit stap 2 het volgende in:

- **Branch to deploy:** `main` (zie "Open vraag" hierboven — kies
  `seizoenfix` alleen als je dat bewust anders wilt).
- **Base directory:** laat leeg.
- **Build command:** **laat leeg.** Er is geen bouwstap — als Netlify
  hier zelf iets invult (bijvoorbeeld `npm run build`), verwijder dat.
  Een bouwcommando dat hier niets vindt om te bouwen levert een
  mislukte uitrol op, niet een lege maar werkende site.
- **Publish directory:** `online`

**Wat je moet zien:** een samenvatting met daarin `online` als
publicatiemap en een leeg bouwcommando.

**Als dit misgaat:** dit scherm slaat pas iets op als je op de knop
onderaan klikt (meestal "Deploy site"). Zolang je die niet hebt
aangeklikt, kun je alles aanpassen of het scherm sluiten zonder gevolgen.

---

## Stap 4 — De eerste uitrol vanaf git

1. Klik op **Deploy site** (of "Save & Deploy").
   **Wat je moet zien:** een nieuwe regel in het tabblad **Deploys**,
   met een status die van "Building" naar "Published" gaat. Omdat er
   geen bouwstap is, gaat dit in seconden, niet in minuten.
2. Open je live webadres in een **nieuw, incognito-venster** (belangrijk
   — zie "Over de service worker" hieronder over waarom niet je gewone
   venster).
   **Wat je moet zien:** de app zoals je hem kent. Vergelijk dit met de
   map uit Stap 0: ziet de app er anders uit, dan komt de commit op
   `main` niet overeen met wat je gewend was — dat is het moment om
   verder te zoeken vóór je verdergaat, niet om door te klikken.

**Als dit misgaat (de site bouwt niet, of ziet er verkeerd uit):**
1. Ga naar **Site configuration → Build & deploy → Continuous
   deployment**.
2. Klik op de optie om de Git-koppeling te verwijderen (heet meestal
   "Unlink repository" of "Disconnect").
   **Wat je moet zien:** de site staat weer op "niet gekoppeld", precies
   als in stap 1.
3. Sleep de kopie uit Stap 0 opnieuw naar de Deploys-pagina, zoals je
   altijd deed.
   **Wat je moet zien:** de site zoals hij was vóór dit hele plan.

Dit is de reden dat Stap 0 niet oversla-baar is: zolang je die kopie
hebt, is elke stap hierboven met één klik terug te draaien.

---

## Vanaf nu: hoe een uitrol er in het vervolg uitziet

Zodra dit werkt, hoeft niemand nog een map te slepen. Een uitrol wordt:
iemand (Fenna, ik, of jijzelf) commit een wijziging naar `main` op
GitHub, en binnen enkele seconden staat die live. Wil je een wijziging
eerst zien voordat hij iedereen bereikt, laat dat dan weten voordat er
naar `main` gepusht wordt — dat is een afspraak tussen mensen, geen
Netlify-instelling.

**Terugdraaien van een slechte uitrol** wordt vanaf nu ook makkelijker:
ga naar **Deploys**, zoek de laatste uitrol die wél goed was, en klik op
de knoppen ("..." of "Options") en dan **"Publish deploy"**. De site
springt dan terug naar die versie, zonder dat er iets in git hoeft te
veranderen. Dat is precies het voordeel dat slepen niet had: elke uitrol
is een aanwijsbaar punt waar je naar terug kunt.

---

## Over de service worker (`online/sw.js`)

Dit stukje regelt dat TEAMTAKKIE ook zonder internetverbinding werkt
(handig langs de lijn). Het bewaart de app en de zes bibliotheken op het
apparaat van de gebruiker.

**Goed nieuws:** voor de app zelf (`index.html`) probeert de service
worker bij elke opening eerst het internet, en valt hij pas terug op de
bewaarde versie als dat niet lukt. Een gewone herlaadbeurt met
internetverbinding haalt dus normaal gezien de nieuwe versie op — dat
verandert niet doordat je nu via git uitrolt in plaats van door te
slepen.

**Wat wél hetzelfde risico blijft, uitrol of geen uitrol:** als iemand
op het moment van een uitrol geen bereik heeft (bijvoorbeeld op een
sportpark), krijgt hij de bewaarde, oudere versie totdat hij weer online
is én de app opnieuw opent. Dat is al zo sinds V34 en die regel staat al
in `online/LEES-MIJ.txt`:

> Sluit de app helemaal af op je laptop én op je tablet, en open hem dan
> opnieuw. [...] Verhoog VERSIE in sw.js en upload opnieuw [...] Dan
> gooit elke browser zijn voorraad weg en haalt alles vers op.

**Wat dat voor jou betekent na een git-uitrol:** na elke uitrol die
gebruikers echt moeten zien (niet elke kleine tekstwijziging, maar wel
iets dat mensen mogen missen als het niet doorkomt): laat betrokkenen
de app volledig afsluiten en opnieuw openen. Blijft de oude versie
hangen, dan is de oplossing dezelfde als voorheen — het regeltje
`const VERSIE = "takkie-v34";` bovenin `sw.js` ophogen — alleen gaat dat
voortaan via een commit-en-push in plaats van opnieuw slepen.

Dit document verandert `sw.js` niet en stelt ook geen nieuwe waarde voor
`VERSIE` voor: dat is een keuze die hoort bij een echte inhoudelijke
uitrol, niet bij het overzetten van het uitrolproces zelf.

**Wat ik niet zeker weet, en dus niet als vaststaand feit opschrijf:**
of Netlify's eigen cachegedrag voor `index.html` (los van de service
worker) een gewone browser meteen de nieuwste versie geeft, of dat daar
een korte vertraging in kan zitten. Ik heb daarvoor geen eigen meting
kunnen doen zonder op Netlify in te loggen. Controleer dit bij de eerste
git-uitrol gewoon empirisch: doe een kleine, onschuldige tekstwijziging,
duw hem naar `main`, en kijk of hij binnen een minuut in een gewoon
(niet-incognito) venster verschijnt na een herlaadbeurt. Zie je hem niet
meteen, dan is dat iets om verder uit te zoeken vóór je dit voor een
belangrijke wijziging vertrouwt.

---

## Wat dit plan niet doet

- Het richt geen Netlify, GitHub of Supabase-instelling daadwerkelijk in
  — dat doet Evan zelf, met dit document ernaast.
- Het verandert `online/index.html` niet (Fenna werkt daar nu in) en
  `online/sw.js` niet.
- Het regelt geen betaald Supabase-plan, geen bewaking en geen
  foutrapportage — dat zijn losse, latere stappen uit het
  professionaliseringsplan.
