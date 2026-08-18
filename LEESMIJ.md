# FC Harlingen JO19-2 · Teammanager

## Wat staat hier

**`fc-harlingen-app.html`** — de app zelf. Eén bestand, dubbelklikken opent hem in je browser.
Alles wat je invoert blijft in die browser bewaard (localStorage), er gaat niets naar internet.

**`fc-harlingen-datamodel.html`** — overzicht van hoe de gegevens in elkaar zitten:
twee diagrammen en een tabel met alle opslagsleutels.

**`fc-harlingen-o19-2-programma.ics`** — het competitieprogramma als agendabestand,
te openen in Agenda, Google Agenda of Outlook.

**`voorbeelden/`** — afbeeldingen die onderweg zijn gemaakt om onderdelen te controleren:
de tekentool, het perspectief, de bal, de doelen, het app-icoon.

**`controle/check.py`** — controleert de app op fouten voordat je hem gebruikt.
Draaien vanuit deze map: `python3 controle/check.py`
Hij kijkt naar haakjesbalans, JSX-nesting, niet-gesloten strings, dubbele verklaringen,
kapotte CSS-blokken en losse coderesten.

## Belangrijk om te weten

- **Maak regelmatig een back-up.** Instellingen → Back-up downloaden. Wis je je
  browsergegevens, dan is alles weg. De back-up bevat alle zestien opslagsoorten.
- **Bewaar een kopie van dit bestand** voordat je aan een nieuwe versie begint.
- De app heeft bij het opstarten internet nodig voor vijf onderdelen (React, Babel,
  Font Awesome, jsPDF). Daarna werkt hij zonder.

---
EVS DESIGN | Evan van Sertima
