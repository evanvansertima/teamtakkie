# Toegang overdragen aan een tweede ontwikkelaar

**Wat dit is:** een checklist voor het moment dat er een tweede persoon
aan TEAMTAKKIE gaat werken. Er is nu nog niemand aangewezen — dit
document ligt klaar voor als die dag komt, zodat je niet ter plekke
hoeft uit te zoeken waar je moet klikken.

**Het uitgangspunt bij elke stap hieronder:** geef de nieuwe persoon
genoeg toegang om te kunnen werken, niet meer dan dat. Bij twijfel geef
je de kleinere rol en breid je die later uit — dat is makkelijker dan
achteraf iets terugdraaien. Jij blijft in alle vier de gevallen de
eigenaar; de nieuwe persoon wordt toegevoegd, niet in jouw plaats gezet.

---

## 1. GitHub — de code

De repo staat op `github.com/evanvansertima/teamtakkie`, onder jouw
persoonlijke account.

1. Ga naar de repo → **Settings → Collaborators and teams**.
2. Klik **Add people**, zoek de nieuwe persoon op zijn GitHub-
   gebruikersnaam of e-mailadres.
3. Kies de rol **Write** (kan code pushen en pull requests maken/
   samenvoegen) — niet **Admin** (kan ook instellingen wijzigen,
   mensen toevoegen/verwijderen, de repo verwijderen). Geef Admin
   pas als je iemand echt mede-verantwoordelijk maakt voor het beheer
   van de repo zelf, niet alleen voor het schrijven van code.
   **Wat je moet zien:** een uitnodiging die de ander per e-mail
   ontvangt en moet accepteren.

**Als dit misgaat:** een uitnodiging die niet geaccepteerd wordt,
verloopt vanzelf. Er verandert niets totdat de ander hem accepteert.

---

## 2. Supabase — de database

1. Log in op supabase.com, open het TEAMTAKKIE-project.
2. Ga naar **Project Settings → Team** (let op: dit is een teaminstelling
   op *organisatieniveau* in Supabase, niet per se per project — als je
   project onder een persoonlijke organisatie staat, kijk dan bij die
   organisatie-instellingen).
3. Nodig uit met de rol **Developer** — kan de database bekijken,
   query's draaien, SQL uitvoeren via de SQL Editor (nodig om
   `server/*.sql`-bestanden te kunnen plakken en draaien). Niet
   **Owner** — dat kan facturering wijzigen, het project verwijderen,
   en andere mensen toevoegen/verwijderen, inclusief jou.
   **Wat je moet zien:** een uitnodigings-e-mail naar de ander.

**Let op — dit raakt persoonsgegevens.** Er staan namen en
geboortedata van minderjarigen in deze database (zie
[`docs/avg-inventaris.md`](avg-inventaris.md)). Voordat je iemand hier
toegang toe geeft: zorg dat die persoon weet dat productiedata nooit
naar een testomgeving of in een commit gaat (zie
[`CONTRIBUTING.md`](../CONTRIBUTING.md), sectie Persoonsgegevens), en
overweeg of er een aparte afspraak nodig is over wat een tweede
ontwikkelaar wel en niet mag inzien of exporteren.

**Als dit misgaat:** een niet-geaccepteerde uitnodiging kun je intrekken
via dezelfde teampagina.

---

## 3. Netlify — de uitrol

1. Log in op app.netlify.com, open de TEAMTAKKIE-site (of het team
   waaronder die site valt).
2. Ga naar **Site configuration → General → Site members** (of, als de
   site onder een Netlify-team staat, **Team settings → Members** voor
   toegang tot het hele team in plaats van alleen deze ene site).
3. Nodig uit met een rol die uitrollen mogelijk maakt maar geen
   facturerings- of accountinstellingen (Netlify noemt dit meestal
   **Collaborator** op siteniveau, of **Member** op teamniveau — de
   exacte naamgeving verschilt per Netlify-versie, kies de laagste rol
   die "kan uitrollen" toestaat).
   **Wat je moet zien:** een uitnodigings-e-mail naar de ander.

**Sluit hier `docs/uitrol.md` op aan** als je ondertussen van handmatig
slepen naar een git-gekoppelde uitrol bent overgestapt: dan hoeft een
tweede ontwikkelaar niet eens Netlify-toegang te hebben om een wijziging
live te krijgen — een samengevoegde pull request op `main` volstaat, en
Netlify-toegang is dan alleen nog nodig om instellingen te wijzigen of
een probleemuitrol terug te draaien.

---

## 4. De domeinnaam

**Dit blok kan ik niet invullen — ik weet niet bij welke registrar
(de partij waar je het domein hebt geregistreerd, bijvoorbeeld
TransIP, Vimexx, Namecheap) de domeinnaam van TEAMTAKKIE staat.** Vul
dit zelf aan, of vertel het me en ik werk het verder uit.

Wat in elk geval geldt, ongeacht de registrar:

- **Domeineigendom overdragen is iets anders dan DNS-toegang geven.**
  Voor een tweede ontwikkelaar is DNS-toegang meestal genoeg (kunnen
  instellen waar het domein naar wijst, bijvoorbeeld naar Netlify) —
  het eigendom van het domein zelf (en daarmee de macht om het te
  verkopen of over te dragen) hoeft niet mee te gaan. De meeste
  registrars hebben hiervoor een aparte "gebruiker toevoegen" of
  "subaccount"-optie, los van een volledige eigendomsoverdracht.
- **Bewaar het overdrachts-/verificatiewachtwoord van het domein apart
  en veilig** (een wachtwoordmanager, niet in deze repo) — dat is nodig
  bij een eventuele latere overdracht naar een andere registrar, en
  gaat niet automatisch mee met het toevoegen van een gebruiker.

---

## Volgorde die de minste kans op gedoe geeft

Als het zover is: begin met **GitHub** (kan de code zien en meedenken),
dan **Supabase** (kan met de database werken, na het gesprek over
persoonsgegevens), dan pas **Netlify** en de **domeinnaam** — dat zijn
de twee die pas nodig zijn zodra iemand ook daadwerkelijk gaat uitrollen,
wat meestal later komt dan het eerste meelezen en meebouwen.
