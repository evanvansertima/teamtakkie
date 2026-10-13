/* ══════════════════════════════════════════════════════════════
   ONBOARDING — de eerste keer dat iemand de app opent
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P4 stap 1
   van docs/p4-stappenplan.md — de kleinste en meest geïsoleerde van de
   acht schermmodules). Geen import/export: tools/bouw.js plakt dit
   bestand (SCHERM_VOLGORDE) na gedeeld.jsx en vóór src/app.jsx aan
   elkaar, dus alles hieronder is nog altijd gewoon top-level function
   in dezelfde scope als src/app.jsx. Dit is een verhuizing, geen
   herschrijving: dezelfde tekst, dezelfde comments.

   GEEN VANGNET UIT HET GOUDEN ORIGINEEL
   tools/gouden-origineel/vulling.js zet bewust een complete, ingelogde
   sessie neer (tt_sessie_v1, tt_club_v1, tt_teams_v1) om opstart-
   vertraging te vermijden. Geen van de 31 bestaande opnames toont dus
   ooit een van de vijf componenten hieronder — dat is een bekend,
   geaccepteerd gat (zie docs/p4-stappenplan.md §1, stap 1), geen fout
   van deze verplaatsing. In plaats daarvan is deze stap handmatig
   gecontroleerd: de gebouwde online/index.html geopend met een lege
   localStorage, vóór en ná de verplaatsing, en de DOM (inclusief het
   opgeschoonde ingebouwde logo) en een schermafdruk vergeleken. Beide
   keren identiek: het Inloggen-scherm binnen OnboardingSchil.

   Zie docs/p4-stappenplan.md §1 en §3 voor de volledige redenering. */

/* ══ DE EERSTE KEER ══════════════════════════════════════════
   Drie schermen die je één keer doorloopt: aanmelden, je vereniging
   aanmaken, en je eerste team. Daarna zie je ze nooit meer.

   Waarom in deze volgorde: zonder account is er niemand om iets aan
   toe te schrijven, zonder vereniging is er niets om een team onder te
   hangen, en zonder team is er niets om spelers in te zetten. Elke
   stap heeft de vorige nodig.

   Alle velden zijn leeg. Er zit geen club ingebakken. ══════════ */

function OnboardingSchil({ titel, onder, kinderen }) {
  return (
    <div className="onboard">
      <div className="onboard-kaart">
        <div className="onboard-merk">
          <img src={logoKopbalk(true)} alt="" />
          <div>
            <h1>{APP_NAAM}</h1>
            <p>{t("app.slogan")}</p>
          </div>
        </div>
        <h2 className="onboard-titel">{titel}</h2>
        {kinderen}
        {onder && <div className="onboard-onder">{onder}</div>}
      </div>
    </div>
  );
}

/* ── 1. Server instellen ─────────────────────────────────────
   Alleen zichtbaar zolang er geen adres is ingebouwd. Voor jouw
   gebruikers verdwijnt dit scherm zodra het adres in de app staat. */
function ServerScherm({ opKlaar }) {
  const [adres, setAdres] = useState("");
  const [sleutel, setSleutel] = useState("");
  const [fout, setFout] = useState(null);
  function bewaar() {
    if (!adres.trim() || !sleutel.trim()) { setFout("Vul allebei de velden in."); return; }
    zetServerInst({url: adres, sleutel: sleutel});
    if (!serverAan()) { setFout("Dat adres of die sleutel klopt niet."); return; }
    opKlaar();
  }
  return (
    <OnboardingSchil titel="Server instellen"
      kinderen={
        <React.Fragment>
          <p className="onboard-uitleg">
            Deze app bewaart je gegevens op je eigen server. Vul het adres en de
            publieke sleutel van je Supabase-project in. Je vindt ze onder
            Project Settings, API Keys.
          </p>
          {fout && <div className="melding fout"><i className="fa-solid fa-triangle-exclamation"/> {fout}</div>}
          <label className="formulier-label">Adres van het project</label>
          <input value={adres} placeholder="https://xxxx.supabase.co"
            onChange={function(e){ setAdres(e.target.value); }}/>
          <label className="formulier-label">Publieke sleutel</label>
          <input value={sleutel} placeholder="sb_publishable_…"
            onChange={function(e){ setSleutel(e.target.value); }}/>
          <button className="knop onboard-knop" onClick={bewaar}>
            <i className="fa-solid fa-check"/> Bewaren
          </button>
        </React.Fragment>
      }/>
  );
}

/* ── 2. Inloggen of een account aanmaken ─────────────────────── */
/* Sinds 13 oktober 2026 (besluit van Evan): een geldig e-mailadres, een
   sterk wachtwoord en verplicht akkoord op de voorwaarden — de regels
   staan in src/domein/registratie.js. Daarna een bevestigingsmail;
   wie op de link klikt, komt hier terug en is meteen ingelogd
   (serverBevestigingUitLink in src/kern/server.js).

   ?account=nieuw in de adresbalk opent meteen "Account aanmaken": daar
   linkt de knop op teamtakkie.nl naartoe. */
function AanmeldScherm({ opKlaar }) {
  const [nieuw, setNieuw] = useState(function () {
    try { return new URLSearchParams(window.location.search).get("account") === "nieuw"; } catch (e) { return false; }
  });
  const [linkFout, setLinkFout] = useState(null);
  useEffect(function () {
    /* De parameter uit de adresbalk: na registreren hoort hij er niet te blijven staan. */
    try {
      var u = new URL(window.location.href);
      if (u.searchParams.has("account")) { u.searchParams.delete("account"); window.history.replaceState(null, "", u.pathname + (u.search || "") + (u.hash || "")); }
    } catch (e) {}
    /* Terug van de bevestigingslink? */
    serverBevestigingUitLink().then(function (r) {
      if (r.soort === "ingelogd") { meldGoed("Je e-mailadres is bevestigd. Welkom!"); opKlaar(); }
      else if (r.soort === "fout") { setLinkFout(r.tekst); setNieuw(false); }
    });
  }, []);
  return (
    <OnboardingSchil titel={nieuw ? "Account aanmaken" : "Inloggen"}
      onder={
        <button className="onboard-wissel" onClick={function(){ setNieuw(!nieuw); }}>
          {nieuw ? "Ik heb al een account \u2014 inloggen"
                 : "Nog geen account? Maak er een aan"}
        </button>
      }
      kinderen={<AanmeldFormulier nieuw={nieuw} setNieuw={setNieuw} opKlaar={opKlaar} beginFout={linkFout} />}/>
  );
}

/* Het formulier zelf: hier in de onboarding, en in het Account-venster
   bij Instellingen (src/schermen/instellingen.jsx). Op één plek, zodat
   de controles nooit op de ene plek strenger zijn dan op de andere. */
function AanmeldFormulier({ nieuw, setNieuw, opKlaar, beginFout }) {
  const [email, setEmail] = useState("");
  const [emailGezien, setEmailGezien] = useState(false);
  const [wachtwoord, setWachtwoord] = useState("");
  const [toon, setToon] = useState(false);
  const [akkoord, setAkkoord] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const [melding, setMelding] = useState(null);
  const [opnieuwKan, setOpnieuwKan] = useState(false);   // knop "stuur de mail opnieuw" tonen
  const [wacht, setWacht] = useState(0);                  // seconden tot opnieuw sturen weer mag

  useEffect(function () { if (beginFout) { setFout(beginFout); setOpnieuwKan(true); } }, [beginFout]);
  /* Wie zelf wisselt tussen inloggen en aanmaken, krijgt een schoon
     formulier. Maar na registreren schakelt het formulier zelf naar
     inloggen, en dan moet "kijk in je mail" juist blijven staan. */
  const zelfGewisseld = useRef(false);
  useEffect(function () {
    if (zelfGewisseld.current) { zelfGewisseld.current = false; return; }
    setFout(null); setMelding(null);
  }, [nieuw]);
  useEffect(function () {
    if (wacht <= 0) return;
    var h = setTimeout(function () { setWacht(wacht - 1); }, 1000);
    return function () { clearTimeout(h); };
  }, [wacht]);

  var controle = registratieControle({ email: email, wachtwoord: wachtwoord, akkoord: akkoord });
  var eisen = wachtwoordEisen(wachtwoord);
  var sterkte = wachtwoordSterkte(wachtwoord);

  function doe() {
    setFout(null); setMelding(null);
    if (nieuw) {
      if (!controle.mag) { setEmailGezien(true); setFout(controle.reden); return; }
    } else if (!email.trim() || !wachtwoord) { setFout("Vul je e-mailadres en wachtwoord in."); return; }
    setBezig(true);
    var adres = emailNetjes(email);
    (nieuw ? serverRegistreren(adres, wachtwoord, akkoordGegevens()) : serverAanmelden(adres, wachtwoord)).then(function (r) {
      setBezig(false);
      if (!r.ok) {
        var tekst = r.fout ? r.fout.tekst : "Er ging iets mis.";
        setFout(tekst);
        /* Nog niet bevestigd: dan meteen de knop voor een nieuwe mail. */
        if (/nog niet bevestigd/i.test(tekst)) setOpnieuwKan(true);
        return;
      }
      setWachtwoord("");
      if (r.bevestigen) {
        setMelding("Bijna klaar! We hebben een mail gestuurd naar " + adres + ". Klik op de link in die mail; daarna ben je meteen ingelogd. "
          + "Geen mail gezien? Kijk ook in de map ongewenst.");
        zelfGewisseld.current = true; setNieuw(false); setOpnieuwKan(true); setWacht(60);
        return;
      }
      opKlaar();
    });
  }
  function opnieuw() {
    if (!emailGeldig(email)) { setFout("Vul eerst je e-mailadres in."); return; }
    setBezig(true);
    serverBevestigingOpnieuw(emailNetjes(email)).then(function (r) {
      setBezig(false);
      if (!r.ok) { setFout(r.fout ? r.fout.tekst : "Versturen lukte niet."); return; }
      setFout(null);
      setMelding("We hebben een nieuwe bevestigingsmail gestuurd naar " + emailNetjes(email) + ".");
      setWacht(60);
    });
  }

  var emailFout = nieuw && emailGezien && email && !emailGeldig(email);
  var balkKleur = ["var(--grijs)", "var(--gevaar)", "var(--oranje)", "var(--succes)", "var(--succes)"][sterkte];
  var balkTekst = ["", "Zwak", "Kan beter", "Goed", "Sterk"][sterkte];

  return (
        <React.Fragment>
          {fout && <div className="melding fout"><i className="fa-solid fa-triangle-exclamation"/> {fout}</div>}
          {melding && <div className="melding"><i className="fa-solid fa-envelope-circle-check"/> {melding}</div>}
          {opnieuwKan && (
            <button className="knop lijn klein" style={{marginBottom:12}} disabled={bezig || wacht > 0} onClick={opnieuw}>
              <i className="fa-solid fa-paper-plane"/>{wacht > 0 ? " Opnieuw sturen kan over " + wacht + " s" : " Stuur de bevestigingsmail opnieuw"}
            </button>
          )}
          <label className="formulier-label">E-mailadres</label>
          <input type="email" autoComplete="email" value={email} inputMode="email"
            aria-invalid={emailFout ? "true" : "false"}
            style={emailFout ? {borderColor:"var(--gevaar)"} : undefined}
            onChange={function(e){ setEmail(e.target.value); }}
            onBlur={function(){ setEmailGezien(true); }}/>
          {emailFout && <div style={{fontSize:12,color:"var(--gevaar)",margin:"6px 0 12px",lineHeight:1.4}}>Dit is geen geldig e-mailadres. Voorbeeld: naam@voorbeeld.nl</div>}
          <label className="formulier-label">Wachtwoord</label>
          <div style={{position:"relative"}}>
            <input type={toon ? "text" : "password"} value={wachtwoord} style={{paddingRight:44}}
              autoComplete={nieuw ? "new-password" : "current-password"}
              onChange={function(e){ setWachtwoord(e.target.value); }}
              onKeyDown={function(e){ if(e.key==="Enter") doe(); }}/>
            <button type="button" aria-label={toon ? "Wachtwoord verbergen" : "Wachtwoord tonen"} onClick={function(){ setToon(!toon); }}
              style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",marginTop:-6,background:"none",border:0,padding:8,cursor:"pointer",color:"var(--grijs-donker)"}}>
              <i className={toon ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}/>
            </button>
          </div>
          {nieuw && (
            <div style={{margin:"8px 0 12px"}}>
              <div style={{display:"flex",gap:4,margin:"0 0 6px"}} aria-hidden="true">
                {[1, 2, 3, 4].map(function (n) { return <span key={n} style={{flex:1,height:5,borderRadius:3,background:n <= sterkte ? balkKleur : "var(--grijs)"}}/>; })}
              </div>
              {balkTekst && <div style={{fontSize:12,fontWeight:700,color:balkKleur,marginBottom:4}}>{balkTekst}</div>}
              <ul style={{listStyle:"none",padding:0,margin:0,fontSize:12.5,lineHeight:1.7}}>
                {eisen.map(function (e) {
                  return <li key={e.id} style={{color:e.ok ? "var(--succes)" : "var(--grijs-donker)"}}>
                    <i className={e.ok ? "fa-solid fa-circle-check" : "fa-regular fa-circle"} style={{width:18}}/>{" " + e.tekst}</li>;
                })}
              </ul>
            </div>
          )}
          {nieuw && (
            <label style={{display:"flex",gap:10,alignItems:"flex-start",fontSize:13,lineHeight:1.5,margin:"4px 0 14px",textAlign:"left"}}>
              <input type="checkbox" checked={akkoord} onChange={function(e){ setAkkoord(e.target.checked); }} style={{marginTop:3,width:18,height:18,flexShrink:0}}/>
              <span>Ik ga akkoord met de <a href={VOORWAARDEN_URL} target="_blank" rel="noopener">algemene voorwaarden</a> en
                het <a href={PRIVACY_URL} target="_blank" rel="noopener">privacybeleid</a>.</span>
            </label>
          )}
          <button className="knop onboard-knop" disabled={bezig || (nieuw && !controle.mag)} onClick={doe}
            style={bezig || (nieuw && !controle.mag) ? {opacity:0.45,cursor:"not-allowed"} : undefined}>
            <i className={bezig ? "fa-solid fa-hourglass-half" : "fa-solid fa-right-to-bracket"}/>
            {bezig ? " Bezig\u2026" : (nieuw ? " Account aanmaken" : " Inloggen")}
          </button>
          {nieuw && !controle.mag && (email || wachtwoord) && <div style={{fontSize:12,color:"var(--grijs-donker)",marginTop:8}}>{controle.reden}</div>}
        </React.Fragment>
  );
}

/* ── 3. Je vereniging ────────────────────────────────────────── */
function ClubScherm({ opKlaar }) {
  const [naam, setNaam] = useState("");
  const [logo, setLogo] = useState(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const bestand = useRef(null);

  function kiesLogo(e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    verwerkLogoBestand(f, function (err, dataUrl) {
      if (err) { setFout(err); return; }
      setLogo(dataUrl);
    });
  }
  function maak() {
    if (!naam.trim()) { setFout("Vul de naam van je vereniging in."); return; }
    setBezig(true); setFout(null);
    maakClub(naam, logo).then(function (r) {
      setBezig(false);
      if (!r.ok) { setFout(r.fout ? r.fout.tekst : "Er ging iets mis."); return; }
      zetInstellingen({clubNaam: naam.trim(), logo: logo || null});
      opKlaar();
    });
  }

  return (
    <OnboardingSchil titel="Je vereniging"
      kinderen={
        <React.Fragment>
          <p className="onboard-uitleg">
            Onder welke vereniging vallen je teams? Je kunt dit later aanpassen.
          </p>
          {fout && <div className="melding fout"><i className="fa-solid fa-triangle-exclamation"/> {fout}</div>}
          <label className="formulier-label">Naam van de vereniging</label>
          <input value={naam} autoFocus placeholder="Bijvoorbeeld SV Voorbeeld"
            onChange={function(e){ setNaam(e.target.value); }}
            onKeyDown={function(e){ if(e.key==="Enter") maak(); }}/>
          <label className="formulier-label">Clubwapen (mag later)</label>
          <div className="onboard-logo">
            <span className="onboard-logo-vak">
              {logo ? <img src={logo} alt=""/> : <i className="fa-solid fa-shield-halved"/>}
            </span>
            <button className="knop lijn klein" onClick={function(){ if(bestand.current) bestand.current.click(); }}>
              <i className="fa-solid fa-upload"/> {logo ? "Vervangen" : "Afbeelding kiezen"}
            </button>
            <input ref={bestand} type="file" accept="image/*" style={{display:"none"}} onChange={kiesLogo}/>
          </div>
          <button className="knop onboard-knop" disabled={bezig || !naam.trim()} onClick={maak}>
            <i className={bezig ? "fa-solid fa-hourglass-half" : "fa-solid fa-arrow-right"}/>
            {bezig ? " Bezig\u2026" : " Verder"}
          </button>
        </React.Fragment>
      }/>
  );
}

/* ── 4. Je eerste team ───────────────────────────────────────── */
function TeamScherm({ opKlaar, eerste }) {
  const [naam, setNaam] = useState("");
  const [seizoen, setSeizoen] = useState(function(){
    var j = new Date().getFullYear(), m = new Date().getMonth();
    /* Een seizoen begint in de zomer: in het voorjaar loopt het vorige nog. */
    var start = (m >= 6) ? j : j - 1;
    return start + "/" + (start + 1);
  });
  const [duur, setDuur] = useState("90");
  const [locatie, setLocatie] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);

  function maak() {
    if (!naam.trim()) { setFout("Vul de naam van je team in."); return; }
    if (!eerste && !magNieuwTeam()) {
      setFout("Met " + pakketNu().naam + " kun je " + maxTeams() +
              (maxTeams() === 1 ? " team" : " teams") + " beheren. Kies een groter pakket voor meer.");
      return;
    }
    setBezig(true); setFout(null);
    var team = eerste ? maakEersteTeam(naam) : maakTeam(naam, inst().clubNaam);
    kiesTeam(team.id);
    zetInstellingen({teamNaam: naam.trim(), seizoen: seizoen,
                     speelduur: Number(duur) || 90, locatie: locatie.trim()});
    synchroniseer().then(function (r) {
      setBezig(false);
      if (!r.ok) { setFout(r.fout ? r.fout.tekst : "Het team is aangemaakt, maar het uitwisselen lukte niet."); }
      opKlaar();
    });
  }

  return (
    <OnboardingSchil titel={eerste ? "Je eerste team" : "Nieuw team"}
      kinderen={
        <React.Fragment>
          <p className="onboard-uitleg">
            {eerste
              ? "Nog één ding en je kunt aan de slag. Alles wat je invult kun je later aanpassen."
              : "Elk team heeft zijn eigen spelers, wedstrijden en trainingen."}
          </p>
          {fout && <div className="melding fout"><i className="fa-solid fa-triangle-exclamation"/> {fout}</div>}
          <label className="formulier-label">Naam van het team</label>
          <input value={naam} autoFocus placeholder="Bijvoorbeeld JO19-2"
            onChange={function(e){ setNaam(e.target.value); }}
            onKeyDown={function(e){ if(e.key==="Enter") maak(); }}/>
          <div className="onboard-twee">
            <span>
              <label className="formulier-label">Seizoen</label>
              <input value={seizoen} onChange={function(e){ setSeizoen(e.target.value); }}/>
            </span>
            <span>
              <label className="formulier-label">Speelduur (min)</label>
              <GetalVeld min={20} max={120} waarde={Number(duur)||90}
                opWaarde={function(n){ setDuur(String(n)); }}/>
            </span>
          </div>
          <label className="formulier-label">Vaste thuislocatie</label>
          <input value={locatie} placeholder="Bijvoorbeeld Sportpark De Toekomst"
            onChange={function(e){ setLocatie(e.target.value); }}/>
          <button className="knop onboard-knop" disabled={bezig || !naam.trim()} onClick={maak}>
            <i className={bezig ? "fa-solid fa-hourglass-half" : "fa-solid fa-check"}/>
            {bezig ? " Bezig\u2026" : " Aanmaken"}
          </button>
        </React.Fragment>
      }/>
  );
}
