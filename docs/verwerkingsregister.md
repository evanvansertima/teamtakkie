# Verwerkingsregister TEAMTAKKIE

**Bijgewerkt:** 13 oktober 2026
**Van:** Evan van Sertima (TEAMTAKKIE, KvK-ingeschreven sinds 11 september 2026)
**Status:** werkoverzicht, geen juridisch advies
**Hoort bij:** [avg-inventaris.md](avg-inventaris.md) — daar staat de uitgebreide
uitleg. Dit register is het korte lijstje om bij te houden en mee te nemen naar
de jurist.

---

## 1. Wat dit is

Een overzicht van elke partij die persoonsgegevens uit TEAMTAKKIE ziet, wat die
partij ziet, en of de afspraak met die partij geregeld en opgeborgen is.

- **Verwerker** = doet iets met gegevens in jouw opdracht → er hoort een
  verwerkersovereenkomst (DPA) te zijn.
- **Zelfstandig verantwoordelijk** = gebruikt de gegevens op eigen wettelijke
  titel → geen verwerkersovereenkomst, wel noemen in de privacyverklaring.

Alle DPA-documenten staan in de map **Privacy** (buiten deze repository), met de
datum van downloaden in de bestandsnaam.

---

## 2. De partijen

| Partij | Rol | Wat zij zien | Waar | Afspraak | Opgeborgen |
|---|---|---|---|---|---|
| **Supabase** (Supabase Pte. Ltd.) | Verwerker | Alle app-gegevens: spelers (veelal minderjarig), wedstrijden, aanwezigheid, afwezigheid/blessures, accounts (e-mail), betaalverwijzingen | Database in **Frankfurt, eu-central-1** (gecontroleerd in dashboard, 13-10-2026). Pro-plan. | DPA versie 1 (1 augustus 2026) is onderdeel van de Terms of Service; SCC's voor doorgifte buiten de EU (art. 12) | ✅ 13-10-2026: DPA (PDF) + subverwerkerslijst "As of October 12, 2026" (PDF) |
| **Netlify** (Netlify, Inc., VS) | Verwerker | IP-adressen van bezoekers van app.teamtakkie.nl (serverlogs). Geen spelersgegevens. | VS / wereldwijd CDN | DPA is via de Self-Serve Subscription Agreement automatisch van toepassing | ✅ 13-10-2026: DPA (PDF) |
| **Brevo** (Sendinblue SAS, Frankrijk) | Verwerker | E-mailadressen van wie een account aanmaakt of een mail krijgt (bevestigingsmail via SMTP) | EU | DPA (art. 28 AVG) is onderdeel van de General Conditions of Use — vermeld in Brevo → Settings → Profile → Legal Documents | ✅ 13-10-2026: "Legal Documents"-pagina + General Conditions of Use (PDF) |
| **Mollie** (Mollie B.V., Amsterdam) | Waarschijnlijk **zelfstandig verantwoordelijk** voor betaalgegevens (betaalinstelling onder toezicht DNB, Wwft) | Naam, e-mail, IBAN, IP-adres van de betaler (clubeigenaar). Geen spelersgegevens. | NL / EU | Voorwaarden en privacyverklaring nagekeken; rol nog te bevestigen door jurist (vraag 4) | ✅ 13-10-2026: voorwaarden (PDF) |
| **Cloudflare** (cdnjs) | Ontvanger van IP-adres | IP-adres van elke bezoeker bij het laden van bibliotheken | VS / CDN | Geen afspraak — zie open vraag 5 | — |
| **Google** (Fonts) | Ontvanger van IP-adres | IP-adres van elke bezoeker bij het laden van het lettertype | VS | Geen afspraak — zie open vraag 5 | — |
| **Apple** (iCloud Drive) | Onbedoelde opslag | Handmatige back-ups met spelersgegevens, omdat de map Documenten met iCloud synchroniseert | VS / EU | Geen afspraak | ✅ 13-10-2026: back-ups verplaatst naar `~/TeamTakkie-backups/` (buiten iCloud) |
| **Sportlink / Voetbal.nl** | Alleen ophalen | Alleen als een gebruiker zelf een kalenderlink plakt; er gaan geen spelersgegevens heen | NL | Niet nodig | — |

Subverwerkers van Supabase (o.a. Amazon Web Services, Cloudflare, Google,
Sentry, Postmark) staan in de opgeborgen lijst van 12 oktober 2026. Supabase
meldt wijzigingen in die lijst; kijk hem eens per jaar opnieuw na.

---

## 3. Afvinklijst

- [x] Supabase: DPA gedownload (13-10-2026)
- [x] Supabase: subverwerkerslijst gedownload (13-10-2026)
- [x] Supabase: regio gecontroleerd — Frankfurt, eu-central-1 (13-10-2026)
- [x] Netlify: DPA-PDF gedownload (13-10-2026)
- [x] Brevo: "Legal Documents"-pagina en voorwaarden als PDF opgeslagen (13-10-2026)
- [x] Mollie: voorwaarden nagekeken en opgeslagen (13-10-2026) — rol laten bevestigen door jurist
- [x] Back-upmap uit iCloud gehaald — nu `~/TeamTakkie-backups/` (13-10-2026)
- [ ] Privacybeleid op teamtakkie.nl noemt alle partijen uit §2
- [ ] Jaarlijks: subverwerkerslijsten opnieuw nakijken (eerstvolgende: oktober 2027)

---

## 4. Andere privacypunten die nog openstaan

Uit [avg-inventaris.md](avg-inventaris.md), hoofdstuk 3 en 5:

1. **Back-ups in iCloud** (§1.3, §3.3) — de map `Documents` op deze Mac
   synchroniseert met iCloud, dus ook `Back-ups/` met spelersgegevens. Verplaats
   die map naar een plek die niet synchroniseert (of een versleutelde schijf).
   De DPA-PDF's in de map Privacy zijn niet gevoelig; die mogen wel in iCloud.
2. **Privacyverklaring** (§3.4, §8.7) — de app verwijst bij registratie naar
   teamtakkie.nl/privacybeleid. Die tekst moet kloppen met dit register.
3. **Toestemming van ouders** (§3.5) — wie vraagt die, en hoe?
4. **Bewaartermijnen** (§3.6, §5) — hoe lang blijven gegevens staan na vertrek
   van een speler of het stoppen van een club? Betaalgeschiedenis: 7 jaar
   (fiscaal).
5. **Verwijderprocedure** (§3.7) — wat doe je als een ouder vraagt de gegevens
   van een speler te wissen?

---

## 5. Vragen voor de jurist

1. **Wie is verwerkingsverantwoordelijke voor de spelersgegevens: de vereniging
   of TEAMTAKKIE?** Als het de vereniging is, is TEAMTAKKIE hún verwerker en
   hoort er een verwerkersovereenkomst tussen TEAMTAKKIE en elke club te komen.
   Begin met deze vraag; veel andere antwoorden hangen ervan af.
2. Is een DPA die automatisch in de voorwaarden zit (Supabase, Netlify, Brevo)
   voldoende, of is een ondertekend exemplaar nodig? (Supabase: privacy@supabase.io)
3. Zijn de doorgiftes naar de VS (Supabase-subverwerkers, Netlify) met de SCC's
   in die DPA's voldoende afgedekt?
4. Klopt het dat Mollie voor betaalgegevens zelfstandig verantwoordelijk is, en
   niet onze verwerker?
5. Is het laden van lettertypen (Google) en bibliotheken (Cloudflare), waarbij
   het IP-adres meegaat, een probleem? Technisch op te lossen door die bestanden
   zelf mee te leveren.
6. Is er een DPIA nodig voor gezondheidsgegevens (blessures, afwezigheid) van
   minderjarigen?
7. Welke bewaartermijn past bij spelersgegevens na vertrek?

---

## 6. Bijhouden

Komt er een nieuwe partij bij (bijvoorbeeld een AI-dienst, een analyticsdienst
of een andere mailprovider), dan eerst een regel in §2 en de DPA opbergen
vóórdat de dienst live gaat.
