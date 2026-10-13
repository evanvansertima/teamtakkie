# Privacybeleid teamtakkie.nl — wat ontbreekt

**Vergeleken op:** 13 oktober 2026
**Live versie:** https://teamtakkie.nl/privacybeleid ("Laatst bijgewerkt 19 september 2026")
**Vergeleken met:** [verwerkingsregister.md](verwerkingsregister.md) en de app zoals hij nu live staat
**Status:** werklijst, geen juridisch advies. De site is met ChatGPT gemaakt en
wordt daar ook bijgewerkt; onderaan staat een prompt om te plakken.

---

## Wat al goed staat

- Wie verantwoordelijk is, en dat de vereniging bepaalt wat er met
  spelersgegevens gebeurt (TEAMTAKKIE handelt in haar opdracht).
- Welke soorten gegevens er zijn, inclusief geboortedata, foto's en beschikbaarheid.
- Extra zorg bij minderjarigen en gezondheidsgegevens (blessures).
- Netlify en Supabase worden genoemd; doorgifte buiten de EER wordt genoemd.
- Rechten van betrokkenen, reactietermijn van een maand, klacht bij de AP.
- Lokale opslag in de browser wordt uitgelegd.

## Wat ontbreekt of niet meer klopt

| # | Onderwerp | Wat er nu staat | Wat er moet staan | Waarom |
|---|---|---|---|---|
| 1 | **Mollie** (betalingen) | Niets | Betalingen lopen via Mollie B.V. (Amsterdam). Mollie verwerkt naam, e-mail, IBAN en IP-adres van de betaler. Die gegevens blijven bij Mollie; TEAMTAKKIE bewaart alleen een verwijzing (klant- en machtigingsnummer), het bedrag en de status. Geen spelersgegevens naar Mollie. | Mollie is sinds het betaalde abonnement een partij die persoonsgegevens ziet. |
| 2 | **Brevo** (e-mail) | Niets | Bevestigingsmails en andere e-mails van de app worden verstuurd via Brevo (Sendinblue SAS, Frankrijk). Brevo ziet het e-mailadres van de ontvanger. | Sinds 9 oktober 2026 in gebruik voor de bevestigingsmail. |
| 3 | **Waar de gegevens staan** | "Dienstverleners kunnen gegevens buiten de EER verwerken" | De database van de app staat in Frankfurt (EU). Sommige onderaannemers van Supabase en Netlify zitten in de VS; daarvoor gelden de standaardcontractbepalingen van de EU. | Concreter en geruststellender; nagekeken in het dashboard op 13-10-2026. |
| 4 | **Lettertypen en bibliotheken in de app** | "Lettertypen en afbeeldingen worden vanaf de website zelf geladen" — dat geldt voor de marketingsite | De app (app.teamtakkie.nl) laadt een lettertype van Google Fonts en programmabibliotheken van Cloudflare (cdnjs). Daarbij gaat het IP-adres van de bezoeker naar Google en Cloudflare. | Klopt nu niet voor de app. Alternatief: die bestanden zelf meeleveren, dan kan deze zin weg (zie open vraag 5 in het register). |
| 5 | **Openbare toernooilink en tv-presentatie** | Niets | Publiceert een gebruiker een toernooi, dan is via een link voor iedereen zichtbaar: toernooinaam, locaties en adres, teamnamen en logo's, het schema, uitslagen, standen, **namen van scheidsrechters**, en afbeeldingen die voor de presentatie zijn toegevoegd. Geen spelersgegevens. De gebruiker bepaalt zelf of en wat er gepubliceerd wordt. | Nieuw sinds oktober 2026. Scheidsrechtersnamen zijn persoonsgegevens die openbaar worden. |
| 6 | **Akkoord bij registratie** | Niets | Bij het aanmaken van een account leggen we vast wanneer je akkoord ging en met welke versie van de voorwaarden en dit privacybeleid. | De app bewaart dit sinds 9 oktober 2026 (`akkoord_voorwaarden`, `voorwaarden_versie`). |
| 7 | **Versiedatum** | "Laatst bijgewerkt 19 september 2026" | De datum van de nieuwe versie | De app noemt bij registratie versie **2026-10-09**. Die datum en de datum op de pagina moeten bij elkaar passen. Na het bijwerken zet ik `VOORWAARDEN_VERSIE` in de app op de nieuwe datum. |
| 8 | **Foutmeldingen** | "Beveiliging en het oplossen van storingen" (algemeen) | Als de app vastloopt, wordt een foutmelding naar de server gestuurd met het tijdstip, de fouttekst, het soort browser en een willekeurig apparaatnummer — niet gekoppeld aan een account, geen teamgegevens. Na 30 dagen automatisch verwijderd. | Kort en eerlijk; staat in `server/16-foutrapportage.sql`. |
| 9 | **Bewaartermijnen** | Algemeen ("zolang nodig") | Betaalgegevens: 7 jaar (fiscale bewaarplicht). Account en teamgegevens: tot verwijdering van het account of de club, plus een termijn voor back-ups. | Concrete termijnen wachten op de jurist (vraag 7 in het register). Voor betalingen is 7 jaar al duidelijk. |
| 10 | **Verwerkersovereenkomst met clubs** | "De bijbehorende afspraken moeten in een verwerkersovereenkomst worden vastgelegd." | Ongewijzigd laten, maar die overeenkomst bestaat nog niet. | Eerst de jurist (vraag 1 in het register). Daarna kan er een standaard-verwerkersovereenkomst voor clubs komen. |

Punten 1 t/m 8 kunnen nu worden bijgewerkt. Punten 9 en 10 wachten op de jurist.

---

## Prompt voor ChatGPT (om te plakken)

> Werk de pagina Privacybeleid van teamtakkie.nl bij. Houd de huidige opbouw,
> toon en kopjes aan. Verander de datum "Laatst bijgewerkt" naar de datum van
> vandaag. Verzin niets dat hieronder niet staat, en zet geen telefoonnummer of
> adres op de pagina.
>
> Voeg toe in "Met wie delen we gegevens?":
> - Betalingen voor een abonnement lopen via Mollie B.V. in Amsterdam. Mollie
>   verwerkt de naam, het e-mailadres, het rekeningnummer (IBAN) en het
>   IP-adres van de betaler. Die gegevens blijven bij Mollie. TEAMTAKKIE
>   bewaart alleen een verwijzing naar de klant en de machtiging, het bedrag en
>   de status van de betaling. Er gaan geen spelersgegevens naar Mollie.
> - E-mails vanuit de app, zoals de bevestigingsmail bij het aanmaken van een
>   account, worden verstuurd via Brevo (Sendinblue SAS, Frankrijk). Brevo ziet
>   daarbij het e-mailadres van de ontvanger.
> - De database van de app staat in Frankfurt (EU). Sommige onderaannemers van
>   Supabase en Netlify zitten in de Verenigde Staten; voor die doorgifte
>   gelden de standaardcontractbepalingen van de Europese Commissie.
>
> Voeg een nieuw kopje toe: "Openbare toernooipagina". Tekst: Wie een toernooi
> organiseert, kan het publiceren. Via de link is dan voor iedereen zichtbaar:
> de naam van het toernooi, locaties met adres, teamnamen en logo's, het
> speelschema, uitslagen en standen, de namen van scheidsrechters en
> afbeeldingen die voor de presentatie op een scherm zijn toegevoegd. Er staan
> geen spelersgegevens op. De organisator bepaalt zelf of het toernooi
> openbaar wordt en kan het weer offline halen. Organisatoren informeren
> scheidsrechters dat hun naam op de openbare pagina staat.
>
> Pas aan in "Cookies en browseropslag": de zin over lettertypen geldt voor
> deze website. Voeg toe: De app (app.teamtakkie.nl) laadt een lettertype van
> Google Fonts en programmabibliotheken van Cloudflare. Daarbij ontvangen
> Google en Cloudflare het IP-adres van de bezoeker.
>
> Voeg toe in "Welke gegevens gebruiken we?", bij Account en abonnement: Bij
> het aanmaken van een account leggen we vast wanneer je akkoord ging met de
> algemene voorwaarden en dit privacybeleid, en welke versie dat was.
> Loopt de app vast, dan stuurt hij een foutmelding naar de server met het
> tijdstip, de fouttekst, het soort browser en een willekeurig apparaatnummer.
> Die melding is niet gekoppeld aan een account, bevat geen teamgegevens en
> wordt na 30 dagen automatisch verwijderd.
>
> Voeg toe in "Opslag en bewaartermijnen": Betaalgegevens en facturen bewaren
> we zeven jaar, omdat de wet dat voorschrijft.
>
> Laat me eerst het voorbeeld zien voordat je iets publiceert.

---

## Na het publiceren

1. Laat Claude de live pagina nalezen tegen deze lijst.
2. Claude zet `VOORWAARDEN_VERSIE` in `src/domein/registratie.js` op de nieuwe
   datum, zodat nieuwe accounts akkoord geven op de juiste versie.
3. Vink in [verwerkingsregister.md](verwerkingsregister.md) af: "Privacybeleid
   op teamtakkie.nl noemt alle partijen uit §2".
