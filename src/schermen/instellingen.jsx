/* ══════════════════════════════════════════════════════════════
   INSTELLINGEN/ACCOUNT — teamwissel, seizoenen, pakketten, terughalen,
   account/synchroniseren en de achterkant (beheer van alle accounts)
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P4 stap 2
   van docs/p4-stappenplan.md — "isolatie: hoog", geen bekende
   cross-module afhankelijkheid). Geen import/export: tools/bouw.js
   plakt dit bestand (SCHERM_VOLGORDE) na gedeeld.jsx en onboarding.jsx
   en vóór src/app.jsx aan elkaar, dus alles hieronder is nog altijd
   gewoon top-level function in dezelfde scope als src/app.jsx. Dit is
   een verhuizing, geen herschrijving: dezelfde tekst, dezelfde
   comments, ook waar die een bekende tekortkoming beschrijven (zoals
   de tikfout in de titel en de ontbrekende rem bij "Vereniging
   opheffen" die op 16 september bij het doormeten van dit venster aan
   het licht kwamen — zie tools/gouden-origineel.js, opnames
   "instellingen" en "instellingen-opheffen"). Repareren is hier met
   opzet niet gebeurd: dat hoort in een aparte stap, apart te bewijzen.

   VANGNET
   "instellingen" en "instellingen-opheffen" in tools/gouden-
   origineel.js bewaken dit scherm al specifiek, plus alle overige
   opnames die het sync-lampje of de instellingenknop in de kopbalk
   raken. Verwachting van deze verplaatsing: volledig identiek — geen
   gedragswijziging, alleen een andere plek voor dezelfde tekst.

   TeamSheet riep hier, en roept hier nog steeds, magNieuwTeam op twee
   plekken aan (de knop "Team toevoegen" en de tekst die uitlegt waarom
   dat niet mag). tests/pakket.test.js kende deze twee aanroepen tot nu
   toe aan src/app.jsx toe; die test is bij deze verplaatsing aangepast
   met een derde, met naam genoemde bronlezing
   (src/schermen/instellingen.jsx) — zelfde patroon als bij P4 stap 1
   voor TeamScherm/onboarding.jsx.

   Zie docs/p4-stappenplan.md §1 (stap 2) en §3 voor de volledige
   redenering. */

/* ═══════════════════════════════════════════════════════════
   INSTELLINGEN & BACK-UP
═══════════════════════════════════════════════════════════ */
/* ══ TEAMS ═══════════════════════════════════════════════════
   Wisselen, aanmaken, hernoemen en weggooien. Bewust één scherm:
   je komt hier om van team te wisselen, en de rest is iets wat je
   dan meteen even doet. ═══════════════════════════════════════ */
function TeamSheet({ onSluiten, onGewisseld }) {
  const [lijst, setLijst] = useState(function(){ return teams(); });
  const [nu, setNu] = useState(function(){ return teamId(); });
  const [nieuw, setNieuw] = useState("");
  const [hernoemt, setHernoemt] = useState(null);
  const [naam, setNaam] = useState("");
  const [weg, setWeg] = useState(null);
  const [wegSeizoen, setWegSeizoen] = useState(null);
  const [seizoenen, setSeizoenen] = useState(function(){ return seizoenenVan(teamId()); });
  const [seizoenNuId, setSeizoenNuId] = useState(function(){ return seizoenNu(); });
  const [nieuwSeizoen, setNieuwSeizoen] = useState(null);
  const p = pakketNu();
  const ruimte = maxTeams();

  function ververs() {
    setLijst(teams().slice());
    setNu(teamId());
    setSeizoenen(seizoenenVan(teamId()));
    setSeizoenNuId(seizoenNu());
  }

  function naarSeizoen(id) {
    if (id === seizoenNu()) { onSluiten(); return; }
    kiesSeizoen(id);
    herlaadInstellingen();
    ververs();
    onGewisseld();
    onSluiten();
  }

  function wissel(id) {
    if (id === teamId()) { onSluiten(); return; }
    kiesTeam(id);
    ververs();
    onGewisseld();
    onSluiten();
  }
  function voegToe() {
    var n = nieuw.trim();
    if (!n) return;
    if (!magNieuwTeam()) return;
    var team = maakTeam(n, inst().clubNaam);
    setNieuw("");
    kiesTeam(team.id);
    ververs();
    onGewisseld();
    onSluiten();
    meldGoed(n + " aangemaakt");
  }
  function bewaarNaam() {
    if (!hernoemt) return;
    hernoemTeam(hernoemt, naam);
    setHernoemt(null);
    ververs();
    onGewisseld();
  }
  function gooiWeg() {
    var id = weg.id;
    setWeg(null);
    wisTeam(id);
    ververs();
    onGewisseld();
    meldGoed("Team verwijderd");
  }
  /* Alleen een niet-geopend seizoen mag hier weg — de knop hieronder
     staat om die reden niet bij het geopende seizoen (zie de lijst
     verderop), en wisSeizoen() zelf weigert het nog eens als dat ooit
     toch zou gebeuren (de dubbele bodem uit src/kern/sleutels.js). */
  function gooiSeizoenWeg() {
    var s = wegSeizoen;
    setWegSeizoen(null);
    wisSeizoen(nu, s);
    ververs();
    onGewisseld();
    meldGoed("Seizoen " + seizoenLabel(s) + " verwijderd");
  }

  return (
    <div className="formatie-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="formatie-sheet-header">
          <span className="formatie-sheet-titel">Mijn teams</span>
          <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
            onClick={onSluiten}>{"\u2715"}</button>
        </div>

        <div className="team-lijst">
          {lijst.map(function(team){
            const actief = team.id === nu;
            if (hernoemt === team.id) return (
              <div className="team-rij" key={team.id}>
                <input autoFocus value={naam} style={{margin:0,flex:1}}
                  onChange={function(e){ setNaam(e.target.value); }}
                  onKeyDown={function(e){ if(e.key==="Enter") bewaarNaam();
                                          if(e.key==="Escape") setHernoemt(null); }}/>
                <button className="knop klein" onClick={bewaarNaam}>Bewaren</button>
                <button className="knop lijn klein" onClick={function(){ setHernoemt(null); }}>
                  {"\u2715"}
                </button>
              </div>
            );
            return (
              <div className={"team-rij"+(actief?" actief":"")} key={team.id}>
                <button className="team-kies" onClick={function(){ wissel(team.id); }}>
                  <span className="team-wapen">{teamKort(team.naam)}</span>
                  <span className="team-namen">
                    <b>{team.naam}</b>
                    <em>{actief ? "Nu geopend" : (team.club || inst().clubNaam || "")}</em>
                  </span>
                  {actief && <i className="fa-solid fa-check"/>}
                </button>
                {magRol("team") && (
                  <React.Fragment>
                    <button className="team-knop" title="Naam wijzigen"
                      onClick={function(){ setHernoemt(team.id); setNaam(team.naam); }}>
                      <i className="fa-solid fa-pen"/>
                    </button>
                    <button className="team-knop weg" title="Team verwijderen"
                      disabled={lijst.length <= 1}
                      onClick={function(){ setWeg(team); }}>
                      <i className="fa-solid fa-trash"/>
                    </button>
                  </React.Fragment>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Seizoenen van het team dat openstaat ──
            Hier staat de geschiedenis. Elk seizoen heeft zijn eigen
            spelers, wedstrijden en cijfers, en die blijven staan zolang
            het team bestaat. */}
        <div className="kaart" style={{marginTop:12}}>
          <div className="kaart-titel"><i className="fa-solid fa-calendar-days"/> Seizoenen</div>
          <div className="seizoen-lijst">
            {(seizoenen.indexOf(seizoenNuId) < 0 ? [seizoenNuId].concat(seizoenen) : seizoenen)
              .map(function(s){
              const open = s === seizoenNuId;
              return (
                <div key={s} className={"seizoen-rij"+(open?" actief":"")}>
                  <button className="seizoen-kies" onClick={function(){ naarSeizoen(s); }}>
                    <span className="seizoen-naam">{seizoenLabel(s)}</span>
                    <span className="seizoen-bij">{open ? "Nu geopend" : "Bekijken"}</span>
                    {open && <i className="fa-solid fa-check"/>}
                  </button>
                  {/* Alleen een niet-geopend seizoen mag weg: voor het
                      geopende seizoen bestaat deze knop hier niet eens —
                      dat is de eerste bodem. De tweede zit in wisSeizoen()
                      zelf (src/kern/sleutels.js), voor het geval dit ooit
                      per ongeluk toch aanklikbaar zou zijn. */}
                  {!open && magRol("team") && (
                    <button className="team-knop weg" title="Seizoen verwijderen"
                      onClick={function(){ setWegSeizoen(s); }}>
                      <i className="fa-solid fa-trash"/>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {magRol("team") && (
            <button className="knop lijn klein" style={{marginTop:10,width:"100%"}}
              onClick={function(){ setNieuwSeizoen(seizoenVolgend(seizoenNuId)); }}>
              <i className="fa-solid fa-forward"/> Nieuw seizoen starten
            </button>
          )}
        </div>

        {magRol("team") && (
        <div className="kaart" style={{marginTop:12}}>
          <div className="kaart-titel"><i className="fa-solid fa-plus"/> Nieuw team</div>
          {magNieuwTeam() ? (
            <div style={{display:"flex",gap:8}}>
              <input value={nieuw} placeholder="Bijvoorbeeld JO13-1" style={{margin:0,flex:1}}
                onChange={function(e){ setNieuw(e.target.value); }}
                onKeyDown={function(e){ if(e.key==="Enter") voegToe(); }}/>
              <button className="knop klein" disabled={!nieuw.trim()} onClick={voegToe}>
                Aanmaken
              </button>
            </div>
          ) : (
            <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,margin:0,lineHeight:1.6}}>
              Met {p.naam} kun je {ruimte === Infinity ? "onbeperkt" : ruimte}{" "}
              {ruimte === 1 ? "team" : "teams"} beheren, en die {ruimte === 1 ? "heb" : "heb"} je al.
              Met een groter pakket kun je er meer aanmaken.
            </p>
          )}
          <p style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:400,margin:"9px 0 0",lineHeight:1.6}}>
            Elk team heeft zijn eigen spelers, wedstrijden, trainingen en tenues.
            Je clublogo, je taal en je oefeningen deel je over al je teams heen.
          </p>
        </div>
        )}

        {nieuwSeizoen && (
          <NieuwSeizoenKaart
            van={seizoenNuId} naar={nieuwSeizoen}
            onNaar={setNieuwSeizoen}
            onAnnuleer={function(){ setNieuwSeizoen(null); }}
            onKlaar={function(){
              setNieuwSeizoen(null);
              ververs();
              onGewisseld();
              onSluiten();
            }}/>
        )}

        {weg && (
          <div className="bevestig-overlay"><div className="bevestig-kaart">
            <h3>&ldquo;{weg.naam}&rdquo; verwijderen?</h3>
            <p>
              Alles van dit team gaat weg: spelers, wedstrijden, trainingen,
              beoordelingen en tenues. Dit kan niet ongedaan gemaakt worden.
              Maak eerst een back-up als je het nog wilt kunnen terughalen.
            </p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){ setWeg(null); }}>Annuleren</button>
              <button className="knop gevaar" onClick={gooiWeg}>Verwijderen</button>
            </div>
          </div></div>
        )}

        {wegSeizoen && (
          <div className="bevestig-overlay"><div className="bevestig-kaart">
            <h3>&ldquo;{seizoenLabel(wegSeizoen)}&rdquo; verwijderen?</h3>
            <p>
              Alles van seizoen {seizoenLabel(wegSeizoen)} gaat weg: spelers,
              wedstrijden, trainingen, boetes en meer. Dit kan niet ongedaan
              gemaakt worden. Maak eerst een back-up als je het nog wilt
              kunnen terughalen.
            </p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){ setWegSeizoen(null); }}>Annuleren</button>
              <button className="knop gevaar" onClick={gooiSeizoenWeg}>Verwijderen</button>
            </div>
          </div></div>
        )}
      </div>
    </div>
  );
}

/* Een nieuw seizoen beginnen. Eén kaartje, geen stappenplan: je kiest
   welk seizoen en wat er meegaat, en dat is alles. Wat er níét meegaat
   staat er met zoveel woorden bij, want dat is de vraag die je stelt
   als je hier staat — ben ik straks mijn wedstrijden kwijt? */
function NieuwSeizoenKaart({ van, naar, onNaar, onAnnuleer, onKlaar }) {
  const [mee, setMee] = useState(function () {
    return SEIZOEN_MEE.map(function (m) { return m.id; });
  });
  function wissel(id) {
    setMee(mee.indexOf(id) >= 0
      ? mee.filter(function (x) { return x !== id; })
      : mee.concat([id]));
  }
  function begin() {
    const r = startSeizoen(naar, mee);
    if (r) meldGoed("Seizoen " + seizoenLabel(naar) + " gestart");
    onKlaar();
  }
  return (
    <div className="bevestig-overlay"><div className="bevestig-kaart breed">
      <h3>Nieuw seizoen starten</h3>
      <div className="seizoen-pijl">
        <span className="seizoen-vak">{seizoenLabel(van)}</span>
        <i className="fa-solid fa-arrow-right"/>
        <span className="seizoen-vak nieuw">{seizoenLabel(naar)}</span>
        <button className="knop lijn klein" title="Een jaar verder"
          onClick={function(){ onNaar(seizoenVolgend(naar)); }}>
          <i className="fa-solid fa-plus"/>
        </button>
      </div>

      <p className="seizoen-uitleg">
        Wat gaat er mee naar het nieuwe seizoen?
      </p>
      <div className="seizoen-mee">
        {SEIZOEN_MEE.map(function (m) {
          const aan = mee.indexOf(m.id) >= 0;
          return (
            <button key={m.id} className={"seizoen-optie"+(aan?" aan":"")}
              onClick={function(){ wissel(m.id); }}>
              <i className={aan ? "fa-solid fa-square-check" : "fa-regular fa-square"}/>
              <span>
                <b>{m.label}</b>
                <em>{m.uitleg}</em>
              </span>
            </button>
          );
        })}
      </div>

      <p className="seizoen-blijft">
        <i className="fa-solid fa-box-archive"/>{" "}
        Wedstrijden, trainingen, aanwezigheid, doelpunten, kaarten en de stand
        blijven staan onder {seizoenLabel(van)}. Je kunt ze altijd terugkijken,
        maar ze tellen niet mee in {seizoenLabel(naar)}.
      </p>

      <div className="bevestig-knoppen">
        <button className="knop lijn" onClick={onAnnuleer}>Annuleren</button>
        <button className="knop" onClick={begin}>Seizoen starten</button>
      </div>
    </div></div>
  );
}

/* ══ OVERSTAPPEN (de betaling) ════════════════════════════════
   Wat hier staat is de hele klantkant van één zin: "ik wil Coach, per
   maand." De app stuurt dat naar de edge function betaling-starten,
   krijgt één adres terug — de kassa van Mollie — en stuurt de
   gebruiker daarheen. Meer weet de app niet en meer hoeft de app niet
   te weten.

   WAT HIER MET OPZET NIET STAAT: een bedrag. De prijs die op de
   prijskaart staat is er om naar te kijken; wat er werkelijk wordt
   afgeschreven bepaalt PRIJZEN in de edge function. Zou het bedrag
   van hier komen, dan is een clubabonnement van één cent een kwestie
   van de ontwikkelaarsconsole openen. Dat de twee lijstjes hetzelfde
   zeggen is een afspraak tussen mensen (docs/pakketten-besluit.md),
   geen mechanisme — en dat is precies goed: wie ze uit elkaar laat
   lopen, ziet een ander bedrag bij de bank dan op de kaart, en betaalt
   nog steeds wat de server zegt.

   WAAROM GEEN FORMULIER DAT NAAR MOLLIE POST: online/_headers zet
   form-action op 'self'. Vandaag staat die regel er nog als
   Report-Only — hij meldt dus alleen en houdt nog niets tegen — maar
   dat is nadrukkelijk de bedoeling voor later, en dan zou een <form>
   naar mollie.com stilzwijgend blijven hangen. "Er gebeurt niets" is
   de ergste storing die er is, en zeker op de knop waar geld achter
   zit. window.location.assign() valt niet onder form-action en blijft
   werken, ook als die kop ooit scherp wordt gezet.
   ═════════════════════════════════════════════════════════════ */

/* Het briefje dat we achterlaten vlak voordat we iemand naar de bank
   sturen. Mollie komt terug op één vast adres (APP_TERUG_URL in de
   edge function, standaard https://app.teamtakkie.nl/?upgrade=terug)
   en geeft daarbij géén betaalnummer mee. De app weet bij terugkomst
   dus alleen dát er iemand terugkomt — niet waarvan. Dit briefje is
   het antwoord op "waarvan": welk pakket, welke termijn, en vanaf welk
   pakket. Zonder dat zou het wachtscherm niet kunnen zien of er iets
   veranderd is. */
const UPGRADE_KEY = "tt_upgrade_onderweg_v1";
/* De parameter waaraan we een terugkeer herkennen. Deze naam is niet
   vrij te kiezen: hij staat aan de serverkant in STANDAARD_TERUG
   (supabase/functions/betaling-starten/index.ts). Wijzigt die, dan
   hoort deze regel mee te wijzigen — en andersom. */
const UPGRADE_PARAM = "upgrade";
/* Een briefje van gisteren gaat over een betaling die nooit is
   afgemaakt. Dat mag geen "bezig met verwerken" blijven tonen tot het
   einde der tijden: na een dag is het geen lopende zaak meer maar een
   afgebroken poging, en die hoort stil op te ruimen. */
const UPGRADE_BRIEFJE_MAX_MS = 24 * 60 * 60 * 1000;
/* Hoe lang het wachtscherm blijft draaien voor het iets geruststellends
   zegt. Mollie's melding is er meestal binnen een paar seconden, maar
   een bank kan er langer over doen — en dan hoort er geen molentje te
   blijven draaien waar niemand iets aan heeft. */
const UPGRADE_GEDULD_MS = 30000;
const UPGRADE_POLL_MS = 3000;

/** @returns {{pakket:string, termijn:string, vanaf:string, op:number}|null} */
function upgradeBriefje() {
  try {
    var r = localStorage.getItem(UPGRADE_KEY);
    if (!r) return null;
    var o = JSON.parse(r);
    if (!o || !o.pakket) return null;
    if (!o.op || (Date.now() - o.op) > UPGRADE_BRIEFJE_MAX_MS) { wisUpgradeBriefje(); return null; }
    return o;
  } catch(e) { return null; }
}
function zetUpgradeBriefje(o) {
  try { localStorage.setItem(UPGRADE_KEY, JSON.stringify(o)); } catch(e) {}
  return o;
}
function wisUpgradeBriefje() {
  try { localStorage.removeItem(UPGRADE_KEY); } catch(e) {}
}
/** @returns {boolean} komt de gebruiker net terug van de kassa? */
function upgradeTerugInUrl() {
  try { return new URLSearchParams(window.location.search).get(UPGRADE_PARAM) === "terug"; }
  catch(e) { return false; }
}
/* De parameter uit de adresbalk halen zodra het wachtscherm klaar is.
   Anders begint dezelfde vertoning opnieuw bij elke verversing van de
   pagina — en bij een app die je op je beginscherm hebt staan is dat
   geen theorie. Het is nadrukkelijk replaceState en geen nieuwe
   navigatie: de terugknop hoort hier niets van te merken. */
function upgradeUrlOpruimen() {
  try {
    if (!window.history || !window.history.replaceState) return;
    var u = new URL(window.location.href);
    u.searchParams.delete(UPGRADE_PARAM);
    window.history.replaceState(null, "", u.pathname + (u.search || "") + (u.hash || ""));
  } catch(e) {}
}

/* Het token voor dit ene verzoek. serverVraag() doet dit al voor alles
   wat naar /rest/v1 gaat, en dat is ook de reden dat de vernieuwing
   hier niet nog eens wordt uitgeschreven: tokenVerlopen() en
   verversAanmelding() uit src/kern/server.js doen het werk, dit is
   alleen de volgorde.

   Waarom dit verzoek dan tóch niet via serverVraag() loopt: dat is een
   bewuste, kleine weeffout. serverVraag() gooit bij een fout het
   antwoord van de server weg en houdt alleen serverBoodschap() over,
   en die kent de vorm van PostgREST ({message}/{hint}) — niet die van
   een edge function, die {fout:"..."} teruggeeft. Langs serverVraag()
   zou "Alleen de eigenaar van de club kan een abonnement afsluiten"
   veranderen in "De server gaf een fout (403)", en dan staat iemand
   met precies de verkeerde vraag ("is de app stuk?") bij een antwoord
   dat hij in tien seconden zelf had kunnen oplossen. Zodra
   serverBoodschap() ook {fout} leest, mag dit verzoek alsnog door die
   ene deur. */
function _overstapToken() {
  var s = sessieNu();
  if (!s) return Promise.resolve(null);
  if (!tokenVerlopen(s)) return Promise.resolve(s.token);
  return verversAanmelding().then(function (r) {
    var n = sessieNu();
    return (r.ok && n) ? n.token : null;
  });
}
/* Wat de server terugzegt als het misgaat. De eigen tekst van de edge
   function wint altijd: die is in het Nederlands geschreven en zegt
   wat er te doen valt. Alleen als die er niet is valt dit terug op de
   status — en ook dan met een zin waar iemand iets mee kan. */
function _overstapFoutTekst(status, gegevens) {
  var eigen = gegevens && typeof gegevens === "object"
    ? (gegevens.fout || gegevens.error || gegevens.message)
    : (typeof gegevens === "string" && gegevens.length < 200 ? gegevens : null);
  if (eigen) return String(eigen);
  if (status === 401) return "Je aanmelding is verlopen. Log opnieuw in en probeer het nog eens.";
  if (status === 404) return "De betaling is nog niet aangesloten op deze server.";
  return "Overstappen lukte nu niet (fout " + status + "). Probeer het zo nog eens.";
}
function _overstapVraag(token, clubId, pakket, termijn) {
  return fetch(serverAdres("/functions/v1/betaling-starten"), {
    method: "POST",
    headers: serverKoppen(token),
    body: JSON.stringify({club_id: clubId, pakket: pakket, termijn: termijn})
  }).then(function (antwoord) {
    return antwoord.text().then(function (tekst) {
      var gegevens = null;
      if (tekst) { try { gegevens = JSON.parse(tekst); } catch(e) { gegevens = tekst; } }
      if (antwoord.ok && gegevens && gegevens.checkout_url) {
        return {ok:true, status: antwoord.status, kassa: String(gegevens.checkout_url)};
      }
      /* Een 200 zonder adres is net zo goed mislukt. Doorlopen alsof
         het gelukt is zou hier een lege pagina opleveren. */
      return {ok:false, status: antwoord.status,
              tekst: antwoord.ok ? "De server gaf geen betaaladres terug."
                                 : _overstapFoutTekst(antwoord.status, gegevens)};
    });
  });
}
/**
 * Een betaling starten. Geeft {ok:true, kassa} of {ok:false, tekst}.
 * Werpt niets op: wie langs de lijn staat met halve dekking hoort een
 * melding te krijgen, geen stilstaande knop.
 */
function startOverstap(pakket, termijn) {
  if (!serverAan())  return Promise.resolve({ok:false, tekst:"Er is nog geen server ingesteld."});
  if (!ingelogd())   return Promise.resolve({ok:false, tekst:"Log eerst in; een abonnement hoort bij een account."});
  var clubId = clubIdNu();
  if (!clubId)       return Promise.resolve({ok:false, tekst:"Je hoort nog niet bij een vereniging."});
  return _overstapToken().then(function (token) {
    if (!token) return {ok:false, tekst:"Je aanmelding is verlopen. Log opnieuw in."};
    return _overstapVraag(token, clubId, pakket, termijn).then(function (r) {
      if (r.status !== 401) return r;
      /* Eén keer opnieuw na verversen, net als serverVraag(). Eén keer
         en niet eindeloos: anders blijft een app met een ongeldig token
         in een kringetje draaien. */
      return verversAanmelding().then(function (v) {
        var n = sessieNu();
        if (!v.ok || !n) return {ok:false, tekst:"Je aanmelding is verlopen. Log opnieuw in."};
        return _overstapVraag(n.token, clubId, pakket, termijn);
      });
    });
  }).catch(function (e) {
    return {ok:false, tekst:"De server was niet te bereiken (" +
      ((e && (e.message || e.name)) || "onbekend") + "). Controleer je internetverbinding."};
  });
}

/* ── Terug van de kassa ──────────────────────────────────────
   Mollie stuurt de gebruiker terug naar de app op het moment dat híj
   klaar is, niet op het moment dat de betaling rond is. Die twee
   kunnen seconden uit elkaar liggen: het pakket komt pas op de server
   te staan als betaling-melding (de webhook) langs is geweest. Daarom
   staat hier geen "gelukt!" maar een scherm dat wacht tot de server
   het zelf zegt.

   Het kijkt dus niet naar wat Mollie de gebruiker vertelde — daar
   valt in de adresbalk mee te knoeien — maar naar syncPakket(), dat
   het pakket ophaalt bij de enige partij die erover gaat.

   Na dertig seconden houdt het op met draaien. Niet omdat het dan
   mis is, maar omdat iemand die dertig seconden naar een molentje
   heeft gekeken recht heeft op een zin in plaats van nog een molentje.
   Het briefje blijft dan staan, zodat het abonnementsblok bij
   Instellingen kan blijven zeggen dat er iets loopt. */
function UpgradeTerugScherm() {
  /* Eén keer lezen, bij het opstarten. Daarna is dit scherm er of is
     het er niet; het hoort niet halverwege een wedstrijd alsnog over
     iemands beeld te springen omdat er ergens een briefje opdook. */
  const [briefje, setBriefje] = useState(function () {
    return upgradeTerugInUrl() ? upgradeBriefje() : null;
  });
  const [geduld, setGeduld] = useState(false);

  useEffect(function () {
    if (!briefje) return;
    var gestopt = false;
    function stop() { gestopt = true; clearInterval(tik); clearTimeout(wacht); }
    function klaar() {
      stop();
      wisUpgradeBriefje();
      upgradeUrlOpruimen();
      var naam = pakketNu().naam;
      setBriefje(null);
      /* Kort en warm, en verder niets. Wat er nu opengegaan is, ziet
         iemand vanzelf bij de eerstvolgende tik op het menu:
         magPagina() vraagt het pakket op het moment van klikken. */
      meldGoed("Welkom bij " + naam + "!");
    }
    function kijk() {
      var clubId = clubIdNu();
      if (!clubId) return;
      syncPakket(clubId).then(function (r) {
        if (gestopt || !r || !r.ok) return;
        /* Precies het pakket waarvoor betaald is, en niet "iets anders
           dan eerst". Een club die op hetzelfde moment door Evan op
           een ander pakket wordt gezet, is geen bevestiging van déze
           betaling. */
        if (pakketNu().id === briefje.pakket) klaar();
      });
    }
    var tik = setInterval(kijk, UPGRADE_POLL_MS);
    var wacht = setTimeout(function () { setGeduld(true); }, UPGRADE_GEDULD_MS);
    kijk();
    return stop;
  }, [briefje]);

  if (!briefje) return null;
  var pakket = PAKKETTEN.filter(function (p) { return p.id === briefje.pakket; })[0];
  /* .onboard is het opstartscherm: een volle pagina met één kaart in
     het midden. Hier ligt het over de app heen in plaats van ervoor,
     want de app draait al — vandaar de regels over positie die er in
     het stijlblad niet bij staan. Geen nieuwe klasse: een stijlregel
     voor één scherm hoort niet in een stijlblad dat iedereen bij elk
     bezoek binnenhaalt.

     De achtergrondkleur staat er om een reden die de moeite van het
     opschrijven waard is: .onboard zegt zelf background:var(--achtergrond),
     en die variabele bestáát niet (hij staat nergens in het stijlblad).
     Bij de opstartschermen valt dat niet op, want dan is er niets
     achter en zie je gewoon de achtergrond van body — var(--grijs-licht).
     Hier zou je dwars door dit scherm heen het dashboard zien, met een
     kaart die in de lucht hangt. Dezelfde kleur als body dus, met de
     hand. De echte oplossing is die variabele alsnog benoemen in
     src/index.html; dat is een aparte wijziging aan een bestand dat
     elk scherm raakt, en die hoort apart beoordeeld en doorgemeten te
     worden.

     500 als hoogte in de stapel: boven het zijmenu (210), de onderbalk
     (200) en de vensters (400/440), en onder de meldingen (600). Dit
     scherm hoort het enige te zijn wat je ziet — maar een melding die
     eroverheen komt hoort leesbaar te blijven. */
  return (
    <div className="onboard"
      style={{position:"fixed",inset:0,zIndex:500,background:"var(--grijs-licht)"}}>
      <div className="onboard-kaart onboard-wacht">
        {geduld ? (
          <React.Fragment>
            <i className="fa-solid fa-clock"/>
            <p>
              Dit kan nog even duren — je kunt gewoon verdergaan, we laten
              het weten zodra {pakket ? pakket.naam : "je pakket"} klaarstaat.
            </p>
            <button className="knop lijn onboard-knop"
              onClick={function(){ upgradeUrlOpruimen(); setBriefje(null); }}>
              Verder in de app
            </button>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <i className="fa-solid fa-circle-notch fa-spin"/>
            <p>Je betaling wordt verwerkt…</p>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

/* ══ PAKKETTEN ═══════════════════════════════════════════════
   Wat elk pakket kan, naast elkaar. Dit is een prijskaart én, sinds
   19 september 2026, de plek waar je overstapt: op elke kaart die je
   nog niet hebt staat een keuze tussen per maand en per jaar, en
   daaronder de knop die de betaling start. Welk pakket je hebt komt
   nog steeds van de server en van nergens anders.
   ══════════════════════════════════════════════════════════ */
/* De agenda staat sinds 11 september bij de basis en niet meer bij
   trainingen. Deze twee regels moesten daarin mee: een prijskaart die
   de agenda bij een betaald pakket noemt verkoopt iets wat de app
   weggeeft, en dat is precies het soort verschil waarvan je een half
   jaar later niet meer weet hoe het is ontstaan. */
const MODULE_LABEL = {
  basis:"Team, spelers, wedstrijden en agenda", trainingen:"Trainingen en aanwezigheid",
  ontwikkeling:"Beoordelingen en ontwikkeling", analyse:"Statistieken en live-analyse",
  clubhuis:"Clubhuis, sportpark en tenues"
};
/* nadruk is optioneel: het id van het pakket dat het antwoord geeft
   op een slotje waar net op getikt is. Via Instellingen komt er niets
   mee en is er dus geen nadruk — daar bekijkt iemand het hele
   overzicht, niet één antwoord. */
/* De twee termijnen, in de volgorde waarin ze op de kaart staan. Per
   maand eerst: dat is wat iemand als eerste wil weten en wat er ook nu
   al groot op de kaart stond. De id's zijn geen vrije keuze — ze gaan
   zo naar de edge function, die ze opzoekt in PRIJZEN
   (supabase/functions/_gedeeld/mollie.ts: maand/jaar). */
const TERMIJNEN = [
  {id:"maand", label:"Per maand"},
  {id:"jaar",  label:"Per jaar"}
];
function PakkettenSheet({ onSluiten, nadruk }) {
  const nu = pakketNu();
  /* De termijn per kaart en niet één voor het hele scherm. Iemand die
     bij Coach op "per jaar" tikt, vraagt zich iets af over Coach — dat
     hoort niet het bedrag bij Club te laten verspringen terwijl hij
     ernaar kijkt. */
  const [termijnen, setTermijnen] = useState({});
  const [bezig, setBezig] = useState(null);
  function termijnVan(id) { return termijnen[id] || TERMIJNEN[0].id; }
  function kiesTermijn(id, t) {
    setTermijnen(function (v) { var n = Object.assign({}, v); n[id] = t; return n; });
  }

  /* Van hier gaat het weg. Het briefje wordt pas geschreven als er
     echt een kassa is: een briefje achterlaten voor een betaling die
     nooit begonnen is, laat het abonnementsblok straks zeggen dat er
     iets loopt terwijl er niets loopt. */
  function overstap(p) {
    if (bezig) return;
    var t = termijnVan(p.id);
    setBezig(p.id);
    startOverstap(p.id, t).then(function (r) {
      if (!r || !r.ok) {
        setBezig(null);
        meldFout((r && r.tekst) || "Overstappen lukte nu niet.");
        return;
      }
      zetUpgradeBriefje({pakket: p.id, termijn: t, vanaf: nu.id, op: Date.now()});
      /* Geen setBezig(null): vanaf hier verlaat de browser deze
         pagina. De knop hoort tot dat moment op slot te blijven — twee
         keer tikken is twee betalingen bij Mollie. */
      window.location.assign(r.kassa);
    });
  }

  return (
    <div className="formatie-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="formatie-sheet-header">
          <span className="formatie-sheet-titel">Pakketten</span>
          <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
            onClick={onSluiten}>{"\u2715"}</button>
        </div>
        <div className="pakket-raster">
          {PAKKETTEN.map(function (p) {
            const dit = p.id === nu.id;
            /* Een onbekend pakket-id hoort een kaart zonder bedrag op te
               leveren, geen lege regel met een euroteken. */
            const prijs = PAKKET_PRIJS[p.id] || {};
            /* Betaalt de club al? Dan is dit geen prijskaart meer maar
               een wisselknop — andere tekst, en Free hoort er niet meer
               tussen te staan als knop. Terug naar Free doe je door op
               te zeggen (bij Instellingen › Abonnement), en niet door
               op een kaart te tikken die eruitziet als een aankoop:
               dan zet je met één tik je trainingen en statistieken uit
               zonder dat er ook maar iets over stoppen op je scherm
               heeft gestaan. */
            const betaaldNu = nu.id !== "free";
            const kanKiezen = !dit && !(betaaldNu && p.id === "free");
            const jaar = kanKiezen && !!prijs.jaar && termijnVan(p.id) === "jaar";
            return (
              <div key={p.id} className={"pakket-kaart"+(dit?" nu":"")+(p.id===nadruk?" nadruk":"")}>
                {dit && <span className="pakket-vlag">Jouw pakket</span>}
                <div className="pakket-kop">
                  <span className="pakket-merk">TEAMTAKKIE</span>
                  <span className="pakket-naam">{p.naam}</span>
                </div>
                {/* De keuze tussen per maand en per jaar staat bovenop de
                    kaart, en niet in een tussenstapje ná de knop. Wie op
                    "Overstappen" tikt hoort al te weten wat er wordt
                    afgeschreven; een scherm dat dáárna nog een vraag stelt
                    voelt als een verkooptruc. Het bedrag eronder verspringt
                    meteen mee — dat is de hele bedoeling van deze twee
                    knoppen. Ze staan alleen op een kaart waar ook een knop
                    onder staat: een keuze die nergens toe leidt is geen
                    keuze maar een raadsel.

                    De gekozen prijs is het getal waar mensen naar kijken, dus
                    die staat groot en zwart — geen grijs op grijs, want dat
                    is buiten in de zon niet te lezen. Het andere bedrag staat
                    eronder als tweede regel: wie het zoekt vindt het, wie
                    het niet zoekt wordt er niet mee opgehouden. Bij Free
                    staat er alleen "Gratis" en verder niets; "per maand"
                    bij een bedrag van nul is een grap die niemand snapt.

                    "Twee maanden korting" staat alleen bij de maandstand:
                    wie al naar het jaarbedrag kijkt hééft die korting, en
                    hem er dan nog bij zetten leest als een aanbieding die
                    je misloopt terwijl je hem hebt. */}
                {kanKiezen && prijs.jaar && (
                  <div className="thema-rij" role="group"
                    aria-label={"Betaaltermijn voor " + p.naam}>
                    {TERMIJNEN.map(function (tm) {
                      const aan = termijnVan(p.id) === tm.id;
                      return (
                        <button key={tm.id} className="thema-optie" aria-pressed={aan}
                          style={{borderColor:aan?"var(--blauw)":"var(--grijs)",background:aan?"var(--blauw)":"var(--wit)",color:aan?"#fff":"var(--grijs-donker)"}}
                          onClick={function(){ kiesTermijn(p.id, tm.id); }}>
                          <span>{tm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {prijs.maand && (
                  <div className="pakket-prijs">
                    <div className="pakket-prijs-rij">
                      <span className="pakket-prijs-bedrag">{jaar ? prijs.jaar : prijs.maand}</span>
                      {prijs.jaar && <span className="pakket-prijs-per">{jaar ? "per jaar" : "per maand"}</span>}
                    </div>
                    {prijs.jaar && (
                      <div className="pakket-prijs-jaar">
                        {jaar ? ("of " + prijs.maand + " per maand")
                              : ("of " + prijs.jaar + " per jaar \u2014 twee maanden korting")}
                      </div>
                    )}
                  </div>
                )}
                <div className="pakket-teams">
                  {p.teams === Infinity ? "Onbeperkt teams"
                    : p.teams + (p.teams === 1 ? " team" : " teams")}
                </div>
                <ul className="pakket-lijst">
                  {MODULES.map(function (m) {
                    const aan = p.modules.indexOf(m) >= 0;
                    return (
                      <li key={m} className={aan ? "aan" : "uit"}>
                        <i className={aan ? "fa-solid fa-check" : "fa-solid fa-minus"}/>
                        {MODULE_LABEL[m] || m}
                      </li>
                    );
                  })}
                </ul>
                {/* Wie al betaalt "stapt niet over" maar "wijzigt": dat is
                    wat er gebeurt, en het is ook het woord waarmee iemand
                    het zelf zou opschrijven. De regel erboven is er omdat
                    er nog geen verrekening bestaat — noch bij Mollie, noch
                    in server/18-betalingen.sql. Dat mag je dan gewoon
                    zeggen vóórdat iemand tikt, in plaats van erachter te
                    laten komen op zijn afschrift. */}
                {kanKiezen && betaaldNu && (
                  <p style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:400,margin:0,lineHeight:1.6}}>
                    Wat je voor {nu.naam} al hebt betaald, wordt nog niet
                    automatisch verrekend.
                  </p>
                )}
                {kanKiezen && (
                  <button className="knop lijn klein" disabled={!!bezig}
                    style={{width:"100%",justifyContent:"center"}}
                    onClick={function(){ overstap(p); }}>
                    {bezig === p.id
                      ? <React.Fragment><i className="fa-solid fa-circle-notch fa-spin"/> Bezig…</React.Fragment>
                      : (betaaldNu ? "Wijzigen naar " + p.naam : "Overstappen")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══ TERUGHALEN ══════════════════════════════════════════════
   Het scherm bij het vangnet. Hopelijk komt niemand hier ooit, maar
   als het zover is dan is dit het scherm waar iemand zijn zaterdag
   terugkrijgt. Dus: geen jargon, wél de datum, wél hoeveel erin zat,
   en één knop.
   ══════════════════════════════════════════════════════════ */
function TerugSheet({ onSluiten, onGewisseld }) {
  const [lijst, setLijst] = useState(function () { return terugLijst(); });
  const [bezig, setBezig] = useState(null);
  const [melding, setMelding] = useState(null);
  const [kijk, setKijk] = useState(null);

  function haalTerug(r) {
    setBezig(r.id);
    var gelukt = zetTerug(r.id);
    setLijst(terugLijst());
    setBezig(null);
    setKijk(null);
    setMelding(gelukt
      ? terugNaam(r.sleutel) + " is teruggezet. Het gaat vanzelf naar de server."
      : "Dat lukte niet.");
    if (gelukt && onGewisseld) onGewisseld();
  }
  function wanneer(t) {
    const d = new Date(t);
    return d.toLocaleString("nl-NL", {weekday:"short", day:"numeric", month:"short",
                                      hour:"2-digit", minute:"2-digit"});
  }

  return (
    <div className="formatie-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="formatie-sheet-header">
          <span className="formatie-sheet-titel">Terughalen</span>
          <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
            onClick={onSluiten}>{"\u2715"}</button>
        </div>

        {melding && <div className="melding"><i className="fa-solid fa-circle-info"/> {melding}</div>}

        <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,margin:"0 0 14px",lineHeight:1.65}}>
          Als het uitwisselen iets van dit apparaat vervangt, wordt bewaard wat
          er stond. Hier zie je dat terug. De laatste {TERUG_MAX} keer, tot {TERUG_DAGEN} dagen oud.
        </p>

        {!lijst.length && (
          <p className="beheer-leeg">
            <i className="fa-solid fa-shield-halved"/> Er is nog nooit iets vervangen.
          </p>
        )}

        {lijst.map(function (r) {
          const n = terugOmvang(r.waarde);
          const team = terugTeam(r.sleutel);
          return (
            <div className="kaart terug-rij" key={r.id}>
              <div className="terug-kop">
                <div>
                  <b>{terugNaam(r.sleutel)}</b>
                  {team && <span className="terug-team">{team}</span>}
                  {/* Uit welk seizoen dit kwam. Zonder dat zou je in
                      augustus zomaar de spelers van vorig jaar terugzetten
                      over je nieuwe selectie heen. */}
                  {terugSeizoen(r.sleutel) &&
                    <span className="terug-team">{terugSeizoen(r.sleutel)}</span>}
                  <div className="terug-onder">
                    {wanneer(r.tijd)} &middot; {r.reden}
                    {n !== null && (n === 1 ? " \u00b7 1 regel" : " \u00b7 " + n + " regels")}
                  </div>
                </div>
                <button className="knop lijn klein" disabled={bezig === r.id}
                  onClick={function(){ setKijk(kijk === r.id ? null : r.id); }}>
                  {kijk === r.id ? "Sluiten" : "Bekijken"}
                </button>
              </div>
              {kijk === r.id && (
                <React.Fragment>
                  <pre className="terug-kijk">{JSON.stringify(r.waarde, null, 1).slice(0, 1400)}</pre>
                  <button className="knop" style={{width:"100%",justifyContent:"center",marginTop:8}}
                    onClick={function(){ haalTerug(r); }}>
                    <i className="fa-solid fa-rotate-left"/> Dit terugzetten
                  </button>
                </React.Fragment>
              )}
            </div>
          );
        })}

        {lijst.length > 0 && (
          <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:10}}
            onClick={function(){ wisTerug(); setLijst([]); setMelding("Lijst leeggemaakt."); }}>
            Lijst leegmaken
          </button>
        )}
      </div>
    </div>
  );
}

/* ══ HET LAMPJE ══════════════════════════════════════════════
   Eén regeltje onderin dat zegt of alles veilig staat. Niet omdat het
   mooi is, maar omdat je het wilt kunnen zien voordat je je tablet in
   de tas doet en op je laptop verdergaat.

   Vier standen, en ze zijn alle vier waar:
     rustig   alles staat op de server
     open     er is iets veranderd dat nog verstuurd moet worden
     bezig    het gaat op dit moment
     mislukt  geen bereik gehad; hij probeert het vanzelf opnieuw
   ══════════════════════════════════════════════════════════ */
function SyncLampje({ opKlik }) {
  const [stand, setStand] = useState(function () { return syncStand(); });
  useEffect(function () {
    setStand(syncStand());
    return volgSyncStand(function (s) { setStand(s); });
  }, []);
  if (!kanSynchroniseren()) return null;

  const wat = {
    rustig:  {icoon:"fa-solid fa-circle-check",        tekst:"Alles opgeslagen"},
    open:    {icoon:"fa-solid fa-cloud-arrow-up",      tekst:"Nog niet verstuurd"},
    bezig:   {icoon:"fa-solid fa-rotate fa-spin",      tekst:"Bezig\u2026"},
    mislukt: {icoon:"fa-solid fa-triangle-exclamation", tekst:"Geen verbinding"}
  }[stand] || {icoon:"fa-solid fa-cloud", tekst:""};

  return (
    <button className={"sync-lampje " + stand} onClick={opKlik}
      title={stand === "mislukt"
        ? "Er staat iets klaar dat nog niet verstuurd is. Zodra er weer bereik is gaat het vanzelf."
        : wat.tekst}>
      <i className={wat.icoon}/>
      <span>{wat.tekst}</span>
    </button>
  );
}

/* Er is iets van een ander apparaat binnengekomen. Het scherm springt
   daar niet vanzelf op — wie een uitslag zit in te vullen, wil niet dat
   de app onder zijn vingers verandert. Dus een balkje, en hij drukt. */
function NieuwsBalk({ opVerversen }) {
  const [tel, setTel] = useState(function () { return syncBinnenTeller(); });
  const [gezien, setGezien] = useState(function () { return syncBinnenTeller(); });
  useEffect(function () {
    return volgSyncStand(function () { setTel(syncBinnenTeller()); });
  }, []);
  if (tel === gezien) return null;
  return (
    <div className="nieuws-balk">
      <i className="fa-solid fa-arrow-down-long"/>
      <span>Er zijn wijzigingen van een ander apparaat binnengekomen.</span>
      <button onClick={function () { setGezien(tel); opVerversen(); }}>Bijwerken</button>
      <button className="weg" onClick={function () { setGezien(tel); }}
        title="Verbergen">{"\u2715"}</button>
    </div>
  );
}

/* ══ DE ACHTERKANT ═══════════════════════════════════════════
   Elk account op de server, met zijn vereniging en zijn pakket.

   Dit scherm bestaat voor één iemand, en gaat daarom over andermans
   gegevens. Twee dingen daarom, bewust:

   Er staat geen zoekveld dat naar de server gaat maar één dat in de
   al opgehaalde lijst zoekt. Wordt de lijst ooit te lang, dan is dat
   het moment om er paginering bij te bouwen — niet nu alvast.

   En verwijderen vraagt om de naam. Niet omdat een tikfout onmogelijk
   is, maar omdat je bij het overtypen van een e-mailadres nog één keer
   leest wiens account je weggooit.
   ══════════════════════════════════════════════════════════ */
function BeheerSheet({ onSluiten }) {
  const [lijst, setLijst] = useState(null);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState(null);
  const [zoek, setZoek] = useState("");
  const [weg, setWeg] = useState(null);
  const [bevestiging, setBevestiging] = useState("");
  const [melding, setMelding] = useState(null);

  function ophalen() {
    setBezig(true); setFout(null);
    alleGebruikers().then(function (r) {
      setBezig(false);
      if (!r.ok) { setFout(r.fout ? r.fout.tekst : "Er ging iets mis."); return; }
      setLijst(r.gegevens);
    });
  }
  useEffect(ophalen, []);

  function wijzigPakket(rij, pakket) {
    setMelding(null); setFout(null);
    zetPakketVan(rij.club_id, pakket).then(function (r) {
      if (!r.ok) { setFout(r.fout ? r.fout.tekst : "Het pakket kon niet worden gewijzigd."); return; }
      /* Meteen in beeld bijwerken in plaats van de hele lijst opnieuw
         ophalen: dat scheelt wachten, en bij een fout hierboven is er
         niets veranderd. Iedereen van dezelfde club schuift mee, want
         het pakket hangt aan de vereniging en niet aan de persoon. */
      setLijst(function (oud) {
        return (oud || []).map(function (g) {
          return g.club_id === rij.club_id ? Object.assign({}, g, {pakket: pakket}) : g;
        });
      });
      setMelding("Pakket van " + (rij.club_naam || "deze vereniging") + " staat nu op " + pakket + ".");
    });
  }
  function gooiWeg() {
    var doel = weg;
    setWeg(null); setBevestiging(""); setMelding(null); setFout(null);
    verwijderAccount(doel.gebruiker_id).then(function (r) {
      if (!r.ok) { setFout(r.fout ? r.fout.tekst : "Het account kon niet worden verwijderd."); return; }
      setLijst(function (oud) {
        return (oud || []).filter(function (g) { return g.gebruiker_id !== doel.gebruiker_id; });
      });
      setMelding(doel.email + " is verwijderd.");
    });
  }

  const zoekterm = zoek.trim().toLowerCase();
  const zichtbaar = (lijst || []).filter(function (g) {
    if (!zoekterm) return true;
    return ((g.email || "") + " " + (g.club_naam || "")).toLowerCase().indexOf(zoekterm) >= 0;
  });
  function datum(d) {
    if (!d) return "–";
    return new Date(d).toLocaleDateString("nl-NL", {day:"numeric", month:"short", year:"numeric"});
  }

  return (
    <div className="formatie-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="formatie-sheet-header">
          <span className="formatie-sheet-titel">De achterkant</span>
          <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
            onClick={onSluiten}>{"\u2715"}</button>
        </div>

        {fout && <div className="melding fout"><i className="fa-solid fa-triangle-exclamation"/> {fout}</div>}
        {melding && <div className="melding"><i className="fa-solid fa-circle-info"/> {melding}</div>}

        <div className="beheer-balk">
          <input type="search" placeholder="Zoek op e-mailadres of vereniging"
            value={zoek} onChange={function(e){ setZoek(e.target.value); }} />
          <button className="knop lijn klein" onClick={ophalen} disabled={bezig}>
            <i className={bezig ? "fa-solid fa-hourglass-half" : "fa-solid fa-rotate"}/> Verversen
          </button>
        </div>

        {bezig && !lijst && (
          <p className="beheer-leeg"><i className="fa-solid fa-circle-notch fa-spin"/> Even ophalen…</p>
        )}
        {lijst && !zichtbaar.length && (
          <p className="beheer-leeg">
            {zoekterm ? "Niemand gevonden die daarop lijkt." : "Er zijn nog geen accounts."}
          </p>
        )}

        {zichtbaar.map(function (g) {
          return (
            <div className="kaart beheer-rij" key={g.gebruiker_id}>
              <div className="beheer-kop">
                <div>
                  <b>{g.email}</b>
                  {!g.bevestigd && <span className="beheer-vlag">nog niet bevestigd</span>}
                  <div className="beheer-onder">
                    {g.club_naam
                      ? g.club_naam + " · " + (g.rol || "lid") + " · " + g.teams + (g.teams === 1 ? " team" : " teams")
                      : "hoort nog bij geen vereniging"}
                  </div>
                </div>
                <button className="knop gevaar klein" onClick={function(){ setWeg(g); setBevestiging(""); }}>
                  <i className="fa-solid fa-trash"/>
                </button>
              </div>
              <div className="beheer-feiten">
                <span>Aangemeld {datum(g.aangemaakt)}</span>
                <span>Laatst gezien {datum(g.laatst_gezien)}</span>
                {g.geldig_tot && <span>Loopt af {datum(g.geldig_tot)}</span>}
              </div>
              <div className="beheer-pakketten">
                {PAKKETTEN.map(function (pk) {
                  var aan = (g.pakket || "free") === pk.id;
                  return (
                    <button key={pk.id}
                      className={"knop klein" + (aan ? "" : " lijn")}
                      disabled={!g.club_id}
                      title={g.club_id ? "" : "Dit account hoort nog bij geen vereniging"}
                      onClick={function(){ if (!aan) wijzigPakket(g, pk.id); }}>
                      {pk.naam}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {weg && (
          <div className="bevestig-overlay"><div className="bevestig-kaart">
            <h3>Account verwijderen?</h3>
            <p>
              Alles van <b>{weg.email}</b> gaat definitief weg. Was hij de enige
              van {weg.club_naam ? "“" + weg.club_naam + "”" : "zijn vereniging"},
              dan verdwijnt die vereniging met alle teams en gegevens erbij.
              Dit kan niet ongedaan worden gemaakt.
            </p>
            <p style={{fontSize:12.5,fontWeight:600,margin:"0 0 6px"}}>
              Typ het e-mailadres over om te bevestigen:
            </p>
            <input type="text" autoComplete="off" value={bevestiging} autoFocus
              onChange={function(e){ setBevestiging(e.target.value); }} />
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){ setWeg(null); setBevestiging(""); }}>Annuleren</button>
              <button className="knop gevaar" disabled={bevestiging.trim() !== weg.email} onClick={gooiWeg}>
                Verwijderen
              </button>
            </div>
          </div></div>
        )}
      </div>
    </div>
  );
}

/* ══ ACCOUNT EN SYNCHRONISEREN ═══════════════════════════════
   Drie toestanden, in deze volgorde: er is nog geen server, er is
   een server maar je bent niet ingelogd, en je bent ingelogd. Elke
   toestand toont alleen wat er in die toestand te doen valt.
   ══════════════════════════════════════════════════════════ */
function AccountSheet({ onSluiten, onGewisseld }) {
  const s = gebruikSessie();
  const [adres, setAdres] = useState(function(){ return serverInst().url; });
  const [sleutel, setSleutel] = useState(function(){ return serverInst().sleutel; });
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [nieuw, setNieuw] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const [melding, setMelding] = useState(null);
  const [uitslag, setUitslag] = useState(null);
  const [laatst, setLaatst] = useState(function(){ return laatstGesynct(); });
  const [test, setTest] = useState(null);
  /* Of je de achterkant mag zien staat op de server, niet hier. Wat
     hier staat is alleen het antwoord van de vorige keer, zodat de
     knop niet elke keer even weg is. Wie hem zonder recht te pakken
     krijgt, krijgt van de server een weigering. */
  const [beheerder, setBeheerder] = useState(function(){ return beheerderNu(); });
  const [beheerOpen, setBeheerOpen] = useState(false);
  useEffect(function () {
    if (!s) { setBeheerder(false); return; }
    haalBeheerder().then(setBeheerder);
  }, [s && s.token]);

  function bewaarServer() {
    zetServerInst({url: adres, sleutel: sleutel});
    setFout(null);
    setMelding(serverAan() ? "Server ingesteld. Je kunt nu inloggen."
                           : "Vul allebei de velden in.");
  }
  function meldFoutUit(r) {
    setBezig(false);
    setMelding(null);
    setFout(r.fout ? r.fout.tekst : "Er ging iets mis.");
  }
  function aanmelden() {
    setBezig(true); setFout(null); setMelding(null);
    var doe = nieuw ? serverRegistreren : serverAanmelden;
    doe(email, wachtwoord).then(function (r) {
      setWachtwoord("");
      if (!r.ok) return meldFoutUit(r);
      setBezig(false);
      if (r.bevestigen) {
        setMelding("Bijna klaar: open de e-mail die we hebben gestuurd en klik op de link. Log daarna hier in.");
        return;
      }
      setMelding("Ingelogd. Even geduld, ik haal je gegevens op\u2026");
      nuSynchroniseren();
    });
  }
  function nuSynchroniseren() {
    setBezig(true); setFout(null); setUitslag(null);
    synchroniseer().then(function (r) {
      setBezig(false);
      if (!r.ok) return meldFoutUit(r);
      setUitslag(r.gegevens);
      setLaatst(laatstGesynct());
      setMelding(null);
      if (onGewisseld) onGewisseld();
    });
  }
  function doeTest() {
    setBezig(true); setTest(null); setFout(null); setMelding(null);
    serverTest().then(function (r) { setBezig(false); setTest(r); });
  }
  function afmelden() {
    serverAfmelden().then(function () {
      setMelding("Uitgelogd. Je gegevens staan nog gewoon op dit apparaat.");
      setUitslag(null);
      setBeheerder(false);
      setBeheerOpen(false);
      if (onGewisseld) onGewisseld();
    });
  }

  const wanneer = laatst
    ? new Date(laatst).toLocaleString("nl-NL", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"})
    : null;

  return (
    <div className="formatie-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="formatie-sheet-header">
          <span className="formatie-sheet-titel">Account</span>
          <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
            onClick={onSluiten}>{"\u2715"}</button>
        </div>

        {fout && <div className="melding fout"><i className="fa-solid fa-triangle-exclamation"/> {fout}</div>}
        {melding && <div className="melding"><i className="fa-solid fa-circle-info"/> {melding}</div>}

        {!serverAan() && (
          <div className="kaart">
            <div className="kaart-titel"><i className="fa-solid fa-server"/> Server instellen</div>
            <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,margin:"0 0 10px",lineHeight:1.65}}>
              Zonder server werkt de app gewoon, maar staan je gegevens alleen op dit
              apparaat. Met een server blijven ze bewaard en staan ze op al je
              apparaten. Je vindt deze twee gegevens in je Supabase-project onder
              Project Settings, API.
            </p>
            <label className="formulier-label">Adres van het project</label>
            <input value={adres} placeholder="https://xxxx.supabase.co"
              onChange={function(e){ setAdres(e.target.value); }}/>
            <label className="formulier-label">Publieke sleutel (anon key)</label>
            <input value={sleutel} placeholder="eyJhbGciOi…"
              onChange={function(e){ setSleutel(e.target.value); }}/>
            <button className="knop" style={{width:"100%",justifyContent:"center",marginTop:8}}
              onClick={bewaarServer}>
              <i className="fa-solid fa-check"/> Bewaren
            </button>
          </div>
        )}

        {serverAan() && !s && (
          <div className="kaart">
            <div className="kaart-titel">
              <i className="fa-solid fa-right-to-bracket"/> {nieuw ? "Account aanmaken" : "Inloggen"}
            </div>
            <label className="formulier-label">E-mailadres</label>
            <input type="email" autoComplete="email" value={email}
              onChange={function(e){ setEmail(e.target.value); }}/>
            <label className="formulier-label">Wachtwoord</label>
            <input type="password" value={wachtwoord}
              autoComplete={nieuw ? "new-password" : "current-password"}
              onChange={function(e){ setWachtwoord(e.target.value); }}
              onKeyDown={function(e){ if(e.key==="Enter") aanmelden(); }}/>
            <button className="knop" disabled={bezig || !email || !wachtwoord}
              style={{width:"100%",justifyContent:"center",marginTop:8}} onClick={aanmelden}>
              <i className={bezig ? "fa-solid fa-hourglass-half" : "fa-solid fa-right-to-bracket"}/>
              {nieuw ? " Account aanmaken" : " Inloggen"}
            </button>
            <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
              onClick={function(){ setNieuw(!nieuw); setFout(null); }}>
              {nieuw ? "Ik heb al een account" : "Nog geen account? Maak er een aan"}
            </button>
          </div>
        )}

        {serverAan() && s && (
          <React.Fragment>
            <div className="kaart">
              <div className="kaart-titel"><i className="fa-solid fa-cloud"/> Ingelogd</div>
              <div className="account-rij">
                <span>E-mailadres</span><b>{s.email || "\u2013"}</b>
              </div>
              <div className="account-rij">
                <span>Pakket</span><b>{pakketNu().naam}</b>
              </div>
              {/* De knop "Nu synchroniseren" stond hier. Weg.

                  Hij bestond omdat de app het uitwisselen ooit niet uit
                  zichzelf deed. Sinds dat wél zo is, is deze knop een
                  vraag aan de gebruiker die hij niet kan beantwoorden:
                  moet ik nu drukken, en wat gebeurt er als ik het niet
                  doe? Erger nog, hij suggereert dat het níét gebeurt als
                  je er niet op drukt — en precies die gedachte kostte op
                  5 september een hele wedstrijd.

                  Voor een beheerder blijft hij bestaan, hieronder, want
                  bij het zoeken naar een storing wil je hem wel. */}
              <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:10}}
                onClick={afmelden}>
                <i className="fa-solid fa-right-from-bracket"/> Uitloggen
              </button>
              {beheerder && (
                <React.Fragment>
                  <div className="account-rij" style={{marginTop:10}}>
                    <span>Laatst uitgewisseld</span><b>{wanneer || "nog niet"}</b>
                  </div>
                  <button className="knop lijn klein" disabled={bezig}
                    style={{width:"100%",justifyContent:"center",marginTop:8}}
                    onClick={nuSynchroniseren}>
                    <i className={bezig ? "fa-solid fa-hourglass-half" : "fa-solid fa-rotate"}/>
                    {bezig ? " Bezig\u2026" : " Nu synchroniseren"}
                  </button>
                  <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
                    onClick={function(){ setBeheerOpen(true); }}>
                    <i className="fa-solid fa-user-shield"/> De achterkant
                  </button>
                </React.Fragment>
              )}
            </div>

            {uitslag && (
              <div className="kaart">
                <div className="kaart-titel"><i className="fa-solid fa-list-check"/> Wat er is uitgewisseld</div>
                <div className="account-rij"><span>Omhoog gestuurd</span><b>{uitslag.geduwd}</b></div>
                <div className="account-rij"><span>Opgehaald</span><b>{uitslag.gehaald}</b></div>
                <div className="account-rij"><span>Samengevoegd</span><b>{uitslag.samengevoegd}</b></div>
                {uitslag.botsingen.length > 0 && (
                  <div style={{marginTop:10}}>
                    <p style={{fontSize:12.5,fontWeight:700,margin:"0 0 6px"}}>
                      Aan beide kanten was er iets veranderd:
                    </p>
                    {uitslag.botsingen.map(function (b, i) {
                      return (
                        <p key={i} style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,margin:"0 0 4px",lineHeight:1.6}}>
                          <b>{b.sleutel.replace(/^fch_|_v1$/g, "").replace(/_/g, " ")}</b>{" "}
                          {b.samengevoegd
                            ? "— samengevoegd" + (b.erbij ? ", er kwamen er " + b.erbij + " bij van het andere apparaat." : ", er ging niets verloren.")
                            : "— hier kon niets samengevoegd worden, dus deze versie is gehouden."}
                        </p>
                      );
                    })}
                    <p style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:400,margin:"8px 0 0",lineHeight:1.65}}>
                      Bij het samenvoegen gaat er niets verloren. Wel kan iets wat je
                      op het ene apparaat hebt weggehaald terugkomen als je het op het
                      andere tegelijk bewerkte. Kijk het even na.
                    </p>
                  </div>
                )}
                {uitslag.fouten.length > 0 && (
                  <p style={{fontSize:12,color:"var(--gevaar)",fontWeight:600,margin:"8px 0 0"}}>
                    Niet gelukt: {uitslag.fouten.join(", ")}. Probeer het straks nog eens.
                  </p>
                )}
              </div>
            )}
          </React.Fragment>
        )}

        {test && (
          <div className="kaart">
            <div className="kaart-titel"><i className="fa-solid fa-stethoscope"/> Verbinding doorgelicht</div>
            {test.map(function (r, i) {
              return (
                <div key={i} className={"test-rij"+(r.goed?" goed":" mis")}>
                  <i className={r.goed ? "fa-solid fa-check" : "fa-solid fa-xmark"}/>
                  <span><b>{r.wat}</b>{r.tekst ? " \u2014 " + r.tekst : ""}</span>
                </div>
              );
            })}
          </div>
        )}

        {serverAan() && beheerder && (
          <button className="knop lijn" disabled={bezig}
            style={{width:"100%",justifyContent:"center",marginTop:4}}
            onClick={doeTest}>
            <i className="fa-solid fa-stethoscope"/> Verbinding testen
          </button>
        )}

        {serverAan() && beheerder && (
          <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
            onClick={function(){ zetServerInst({url:"", sleutel:""}); setAdres(""); setSleutel(""); setTest(null); }}>
            Serverinstellingen wissen
          </button>
        )}

        {beheerOpen && <BeheerSheet onSluiten={function(){ setBeheerOpen(false); }} />}
      </div>
    </div>
  );
}

function InstellingenSheet({ onSluiten, onGewisseld, onTeams }) {
  const i = gebruikInstellingen();
  const [accountOpen, setAccountOpen] = useState(false);
  const [pakkettenOpen, setPakkettenOpen] = useState(false);
  const [terugOpen, setTerugOpen] = useState(false);
  const [melding, setMelding] = useState(null);
  const [fout, setFout] = useState(null);
  const [bevestigImport, setBevestigImport] = useState(null);
  const [opheffenOpen, setOpheffenOpen] = useState(false);
  const [opheffenTekst, setOpheffenTekst] = useState("");
  const [opheffenBezig, setOpheffenBezig] = useState(false);
  const [opzeggenOpen, setOpzeggenOpen] = useState(false);
  /* Free is geen abonnement maar de afwezigheid ervan: geen einddatum,
     niets om op te zeggen. Vandaar dat de twee stukken hieronder aan
     deze ene vraag hangen. */
  const betaaldPakket = pakketNu().id !== "free";
  /* Eén keer lezen bij het openen van dit venster. Niet bij elke
     hertekening: dan zou dit vakje bij elke toetsaanslag in een van de
     velden hierboven opnieuw uit localStorage komen, terwijl het
     antwoord alleen verandert door iets wat buiten dit scherm gebeurt. */
  const [onderweg] = useState(function(){ return upgradeBriefje(); });
  const bestandRef = useRef(null);
  const logoRef = useRef(null);

  function kiesLogo(e) {
    var bestand = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!bestand) return;
    verwerkLogoBestand(bestand, function(err, dataUrl){
      if (err) { meldFout(err); return; }
      bewaarClubGegeven({logo: dataUrl});
      meldGoed("Logo ingesteld");
    });
  }

  const aantalSpelers = laadSpelers().length;
  const aantalWedstrijden = laadWedstrijden().length;
  const aantalTrainingen = laadTrainingen().length;

  function exporteer() {
    exporteerAlleData();
    setFout(null);
    setMelding("Back-up gedownload. Bewaar dit bestand op een veilige plek.");
    setTimeout(function(){setMelding(null);},5000);
  }

  function kiesBestand(e) {
    var bestand = e.target.files && e.target.files[0];
    if (bestand) setBevestigImport(bestand);
    e.target.value = "";
  }

  /* Wat je moet overtypen om te bevestigen: de naam van je vereniging.
     Staat die er nog niet, dan is er niets te typen en zou een leeg veld
     meteen genoeg zijn — vandaar het woord OPHEFFEN als terugval. Het
     hele punt van overtypen is dat je even moet nadenken; dat mag niet
     wegvallen omdat een veld toevallig leeg is. */
  const opheffenNaam = (i.clubNaam || "").trim() || "OPHEFFEN";

  function voerOpheffenUit() {
    setOpheffenBezig(true);
    setFout(null); setMelding(null);
    hefClubOp().then(function (r) {
      setOpheffenBezig(false);
      setOpheffenOpen(false);
      setOpheffenTekst("");
      if (!r.ok) {
        /* Ook "de server zei ja maar er ging niets weg" komt hier
           binnen als een fout, en dat hoort ook zo: de vereniging staat
           er dan nog gewoon. */
        setFout((r.fout && r.fout.tekst) || "De vereniging kon niet worden opgeheven.");
        return;
      }
      setMelding("De vereniging is opgeheven. De app wordt opnieuw geladen…");
      /* Opnieuw laden en niet alleen het scherm bijwerken: na het
         opheffen klopt er op dit apparaat niets meer — geen club, geen
         teams, geen instellingen. De poort in App bepaalt dan vanzelf
         dat je in "Je vereniging" terechtkomt. */
      setTimeout(function(){ window.location.reload(); }, 1400);
    });
  }

  function voerImportUit() {
    var bestand = bevestigImport;
    setBevestigImport(null);
    importeerAlleData(bestand, function(err, aantal){
      if (err) { setMelding(null); setFout(err); return; }
      setFout(null);
      setMelding(aantal+" items hersteld. De app wordt opnieuw geladen…");
      setTimeout(function(){ window.location.reload(); },1400);
    });
  }

  return (
    <div className="formatie-overlay" onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
        {terugOpen && <TerugSheet onSluiten={function(){ setTerugOpen(false); }}
          onGewisseld={onGewisseld} />}
        {accountOpen && <AccountSheet onSluiten={function(){ setAccountOpen(false); }}
          onGewisseld={onGewisseld} />}
        {pakkettenOpen && <PakkettenSheet onSluiten={function(){ setPakkettenOpen(false); }} />}
        <div className="formatie-sheet-header">
          <span className="formatie-sheet-titel">Instellingen</span>
          <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
            onClick={onSluiten}>{"✕"}</button>
        </div>

        {/* ── Wat je mag ──
            Eén regel bovenaan in plaats van vijftien knoppen die niets
            doen. Wie meekijkt hoort te weten dát hij meekijkt, en waarom
            er dan niets te wijzigen valt. */}
        {ingelogd() && rolInfoVan(rolNu()) && (
          <div className={"rol-balk" + (alleenKijken() ? " kijker" : "")}>
            <i className={rolInfoVan(rolNu()).icoon}/>
            <span>
              <b>{rolInfoVan(rolNu()).label}</b>
              <em>{rolInfoVan(rolNu()).uitleg}</em>
            </span>
          </div>
        )}

        <div className="inst-groep">Account</div>
        {/* ── Account ──
            Wie ben je, en hoe log je uit. Meer hoeft hier niet te staan:
            het uitwisselen gaat vanzelf, dus daar hoort geen knop bij. */}
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-user"/> Account</div>
          {ingelogd() ? (
            <React.Fragment>
              <div className="account-rij">
                <span>E-mailadres</span><b>{(gebruikerNu()||{}).email || "\u2013"}</b>
              </div>
              <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:10}}
                onClick={function(){ setAccountOpen(true); }}>
                <i className="fa-solid fa-gear"/> Accountinstellingen
              </button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,margin:"0 0 10px",lineHeight:1.65}}>
                Met een account staan je gegevens ook op je andere apparaten.
              </p>
              <button className="knop" style={{width:"100%",justifyContent:"center"}}
                onClick={function(){ setAccountOpen(true); }}>
                <i className="fa-solid fa-right-to-bracket"/> Inloggen
              </button>
            </React.Fragment>
          )}
        </div>

        {/* ── Abonnement ──
            Dit blok stond er al als prijskaart-met-knop; sinds
            19 september 2026 staat hier ook wat je hebt lopen en hoe je
            ervan af komt. Met opzet op deze kaart en niet op een eigen
            scherm: "wat heb ik, tot wanneer, en hoe zeg ik op" zijn drie
            vragen die iemand in één adem stelt, en die horen dan ook
            binnen één oogopslag beantwoord te worden. Een aparte
            "Abonnement"-pagina zou er alleen maar een klik tussen zetten
            — en dat is precies waar mensen boos van worden bij het
            opzeggen van dingen. */}
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-crown"/> Abonnement</div>
          <div className="pakket-nu">
            <span className="pakket-merk">TEAMTAKKIE</span>
            <span className="pakket-naam">{pakketNu().naam}</span>
          </div>
          <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,margin:"10px 0",lineHeight:1.65}}>
            {maxTeams() === Infinity
              ? "Onbeperkt teams, alle onderdelen."
              : maxTeams() + (maxTeams() === 1 ? " team" : " teams") + ", " +
                pakketNu().modules.length + " van de " + MODULES.length + " onderdelen."}
          </p>
          {/* "Loopt tot" en niet "per maand, loopt tot": public.abonnementen
              houdt alleen pakket en geldig_tot bij, er is geen kolom waarin
              staat of er per maand of per jaar wordt afgeschreven (zie
              server/01-schema.sql). Die termijn staat wél bij elke betaling
              in public.betalingen, maar dat is de boekhouding en niet wat
              er nú loopt. Er stond even "per maand" als gok in — dat is
              eruit gehaald: een verkeerde termijn op je scherm is erger
              dan geen termijn.

              Staat er geen datum (nog nooit gesynchroniseerd, of de server
              vulde hem niet in), dan valt deze regel weg. Een lege datum
              tonen is een vraag oproepen zonder hem te beantwoorden. */}
          {betaaldPakket && abonnementTot() && (
            <div className="account-rij">
              <span>Loopt tot</span><b>{formateerDatum(abonnementTot())}</b>
            </div>
          )}
          {/* Een betaling die onderweg is en nog niet is teruggekomen. Dit
              is de tweede helft van het wachtscherm: wie daar op "Verder in
              de app" tikte, of de app tussendoor afsloot, hoort hier terug
              te vinden wat er aan de hand is — en niet te hoeven raden of
              zijn geld ergens is blijven hangen. */}
          {onderweg && (
            <div className="melding" style={{margin:"0 0 10px"}}>
              <i className="fa-solid fa-hourglass-half"/>{" "}
              Bezig met verwerken: je overstap naar{" "}
              {(PAKKETTEN.filter(function (pk) { return pk.id === onderweg.pakket; })[0] || {}).naam || onderweg.pakket}
              . Dit kan een paar minuten duren — of probeer het opnieuw.
            </div>
          )}
          <button className="knop lijn" style={{width:"100%",justifyContent:"center"}}
            onClick={function(){ setPakkettenOpen(true); }}>
            <i className="fa-solid fa-layer-group"/> Bekijk pakketten
          </button>
          {/* Opzeggen hoort hier te staan, bij wat je hebt, en niet
              weggestopt achter een mailadres. Dat het nog niet werkt,
              verandert daar niets aan: de knop en de vraag staan er al,
              zodat de plek klopt zodra de serverkant er is. Wat hij nú
              doet staat hieronder bij de bevestiging. */}
          {betaaldPakket && (
            <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:8}}
              onClick={function(){ setOpzeggenOpen(true); }}>
              <i className="fa-solid fa-circle-xmark"/> Opzeggen
            </button>
          )}
        </div>

        {magRol("club") && <div className="inst-groep">Team</div>}
        {/* Clublogo én teamgegevens horen bij de vereniging, dus ze staan
            of vallen samen. Twee kaarten achter één voorwaarde: dat is één
            element te weinig voor JSX, vandaar het omhulsel. */}
        {magRol("club") && (
        <React.Fragment>
        <div className="kaart" style={{marginTop:4}}>
          <div className="kaart-titel"><i className="fa-solid fa-image"/> Clublogo</div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:66,height:66,borderRadius:16,background:"var(--grijs-licht)",border:"1px solid var(--grijs)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
              <img src={logoKopbalk(false)} alt="logo" style={{width:"100%",height:"100%",objectFit:"contain",padding:4}}/>
            </div>
            <div style={{flex:1}}>
              <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginBottom:6}}
                onClick={function(){ if(logoRef.current) logoRef.current.click(); }}>
                <i className="fa-solid fa-upload"/>{i.logo?" Logo vervangen":" Logo kiezen"}
              </button>
              {i.logo && (
                <button className="knop lijn klein" style={{width:"100%",justifyContent:"center"}}
                  onClick={function(){ bewaarClubGegeven({logo:null}); meldGoed("Terug naar het ingebouwde wapen"); }}>
                  <i className="fa-solid fa-rotate-left"/> Terug naar clublogo
                </button>
              )}
            </div>
          </div>
          <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={kiesLogo} />
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.5,marginTop:10}}>
            Er zit een wapen ingebouwd. Kies je eigen afbeelding voor jouw club. Verschijnt bovenaan, op je gedeelde opstelling en in de PDF&rsquo;s.
          </p>
        </div>

        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-shield-halved"/> Team</div>
          <div className="formulier-rij">
            <div className="formulier-groep">
              <label className="formulier-label">Club</label>
              {/* Bij elke letter een verzoek naar de server sturen is
                  onzin; als je klaar bent met typen is precies genoeg. */}
              <input className="formulier-input" value={i.clubNaam}
                onChange={function(e){zetInstellingen({clubNaam:e.target.value});}}
                onBlur={function(e){bewaarClubGegeven({clubNaam:e.target.value});}}
                placeholder="Bijvoorbeeld SV Voorbeeld" />
            </div>
            <div className="formulier-groep">
              <label className="formulier-label">Team</label>
              <input className="formulier-input" value={i.teamNaam}
                onChange={function(e){zetInstellingen({teamNaam:e.target.value});}} placeholder="JO19-2" />
            </div>
          </div>
          <div className="formulier-rij">
            {/* Hier stond een tekstveld waar je zelf "2025/2026" moest
                intikken. Dat was een tweede waarheid: het veld kon
                "2025/2026" zeggen terwijl je naar de wedstrijden van dit
                jaar keek, en niets merkte dat op. Het seizoen is nu de
                laag waar je gegevens onder staan, dus valt er niets te
                typen — alleen te wisselen. */}
            <div className="formulier-groep">
              <label className="formulier-label">Seizoen</label>
              <button className="knop lijn" style={{width:"100%",justifyContent:"space-between",height:42}}
                onClick={function(){ if (onTeams) onTeams(); }}>
                <span>{huidigSeizoen()}</span>
                <i className="fa-solid fa-chevron-right" style={{fontSize:11,opacity:.6}}/>
              </button>
            </div>
            <div className="formulier-groep">
              <label className="formulier-label">Speelduur (min)</label>
              <GetalVeld className="formulier-input" min={20} max={120} leeg={90} waarde={i.speelduur}
                opWaarde={function(n){ zetInstellingen({speelduur:n}); }} />
            </div>
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Vaste thuislocatie</label>
            <input className="formulier-input" value={i.locatie}
              onChange={function(e){zetInstellingen({locatie:e.target.value});}} placeholder="Sportpark De Zeehoek" />
          </div>
        </div>
        </React.Fragment>
        )}

        <div className="inst-groep">App</div>
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-circle-half-stroke"/> Weergave</div>
          <div className="thema-rij">
            {[{id:"licht",label:"Licht",ic:"fa-solid fa-sun"},
              {id:"donker",label:"Donker",ic:"fa-solid fa-moon"},
              {id:"systeem",label:"Systeem",ic:"fa-solid fa-circle-half-stroke"}].map(function(t){
              var aan = (i.thema||"systeem")===t.id;
              return (
                <button key={t.id} className="thema-optie"
                  style={{borderColor:aan?"var(--blauw)":"var(--grijs)",background:aan?"var(--blauw)":"var(--wit)",color:aan?"#fff":"var(--grijs-donker)"}}
                  onClick={function(){zetInstellingen({thema:t.id});}}>
                  <i className={t.ic} style={{fontSize:15}}/>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.5,marginTop:9}}>
            Systeem volgt de instelling van je telefoon. Donker is prettiger bij avondwedstrijden.
          </p>

          <div className="kaart-titel" style={{marginTop:16}}><i className="fa-solid fa-palette"/> Accentkleur</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {ACCENTEN.map(function(a){
              var aan = (i.accent||"club")===a.id;
              return (
                <button key={a.id} title={a.label}
                  style={{flex:"1 1 60px",minWidth:60,border:"2px solid",borderRadius:12,padding:"9px 6px",
                          cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,
                          borderColor:aan?a.l[0]:"var(--grijs)",background:aan?"var(--grijs-licht)":"var(--wit)",
                          fontFamily:"'Helvetica Neue',Arial,sans-serif",fontSize:10,fontWeight:700,
                          color:aan?a.l[0]:"var(--grijs-donker)"}}
                  onClick={function(){ zetInstellingen({accent:a.id}); }}>
                  <span style={{width:26,height:26,borderRadius:"50%",
                                background:"linear-gradient(135deg,"+a.l[0]+","+a.l[1]+")",
                                border:aan?"2px solid var(--wit)":"none",
                                boxShadow:aan?"0 0 0 2px "+a.l[0]:"none"}}/>
                  <span>{a.label}</span>
                </button>
              );
            })}
          </div>
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.5,marginTop:9}}>
            De accentkleur kleurt knoppen, tabbladen en grafieken. Het clublogo en de tenuekleuren blijven ongemoeid.
          </p>
        </div>

        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-language"/> {t("taal.titel")}</div>
          <p style={{fontSize:12,color:"var(--grijs-donker)",lineHeight:1.55,margin:"0 0 10px"}}>
            {t("taal.onder")}
          </p>
          <div className="tenue-patroon-rij">
            {TALEN.map(function(taal){
              var aan = (i.taal || "") === taal.id;
              var dekking = Math.round(taalDekking(taal.id) * 100);
              return (
                <button key={taal.id} className="tenue-patroon"
                  style={{borderColor:aan?"var(--blauw)":"var(--grijs)",
                          background:aan?"rgba(0,74,173,.07)":"var(--wit)",
                          color:aan?"var(--blauw)":"var(--grijs-donker)"}}
                  onClick={function(){ zetInstellingen({taal:taal.id}); }}>
                  <span style={{fontSize:15,fontWeight:800}}>{taal.kort}</span>
                  <span>{taal.label}</span>
                  {dekking < 100 && (
                    <span style={{fontSize:9,opacity:.7}}>{dekking + "%"}</span>
                  )}
                </button>
              );
            })}
          </div>
          <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
            onClick={function(){ zetInstellingen({taal:""}); }}>
            <i className="fa-solid fa-mobile-screen"/> {t("taal.apparaat")}
          </button>
        </div>

        {beheerderNu() && <div className="inst-groep">Beheer</div>}
        {beheerderNu() && (
          <div className="kaart">
            <div className="kaart-titel"><i className="fa-solid fa-database"/> Jouw gegevens</div>
            <div className="stat-raster-3">
              <div className="stat-pill"><div className="stat-pill-getal">{aantalSpelers}</div><div className="stat-pill-label">Spelers</div></div>
              <div className="stat-pill"><div className="stat-pill-getal">{aantalWedstrijden}</div><div className="stat-pill-label">Wedstrijden</div></div>
              <div className="stat-pill"><div className="stat-pill-getal">{aantalTrainingen}</div><div className="stat-pill-label">Trainingen</div></div>
            </div>
            <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.5,marginTop:4}}>
              Wat er in dit seizoen van dit team staat.
            </p>
          </div>
        )}
        {/* ── Alleen voor beheerders ──
            Een back-up downloaden en terugzetten is gereedschap, geen
            functie. Wie de app gebruikt hoort niet te hoeven weten dat
            zijn gegevens een bestand kunnen zijn — dat gaat vanzelf naar
            de server. Wie hier wél moet kunnen komen, staat in een tabel
            op de server en niet in dit bestand. */}
        {beheerderNu() && (
          <div className="kaart">
            <div className="kaart-titel"><i className="fa-solid fa-screwdriver-wrench"/> Beheer</div>
            <button className="knop" style={{width:"100%",justifyContent:"center",marginBottom:8}} onClick={exporteer}>
              <i className="fa-solid fa-download"/> Back-up downloaden
            </button>
            <button className="knop lijn" style={{width:"100%",justifyContent:"center"}}
              onClick={function(){ if(bestandRef.current) bestandRef.current.click(); }}>
              <i className="fa-solid fa-upload"/> Back-up terugzetten
            </button>
            <input ref={bestandRef} type="file" accept="application/json,.json" style={{display:"none"}} onChange={kiesBestand} />
            {ingelogd() && (
              <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:8}}
                onClick={function(){ setTerugOpen(true); }}>
                <i className="fa-solid fa-rotate-left"/> Terughalen wat het uitwisselen verving
                {terugLijst().length > 0 && <span className="terug-teller">{terugLijst().length}</span>}
              </button>
            )}
          </div>
        )}

        {/* ── De vereniging opheffen ──
            Helemaal onderaan, want dit is geen instelling maar een
            einde. Wie hier komt is aan het scrollen langs alles wat hij
            kwijtraakt, en dat is geen toeval.

            WIE DIT ZIET. Alleen wie het recht "club" heeft, dus de
            eigenaar. Die rol komt van de server (zorgVoorClub haalt hem
            uit de tabel leden) en niet uit dit bestand, dus hij is niet
            in de browser om te draaien naar iets anders. Maar hij is ook
            niet het slot: dat zit in de policy clubs_weghalen, die
            is_eigenaar() vraagt. Een trainer die deze knop met de
            ontwikkelaarsconsole tevoorschijn tovert krijgt van de server
            nul verwijderde rijen terug en dus een eerlijke weigering.

            En zonder server valt er niets op te heffen: dan staat je
            vereniging alleen op dit apparaat en is er geen rij om weg te
            halen. Vandaar serverAan() en ingelogd() ervoor. */}
        {serverAan() && ingelogd() && clubIdNu() && magRol("club") && (
          <React.Fragment>
            <div className="inst-groep">Vereniging</div>
            <div className="kaart">
              <div className="kaart-titel"><i className="fa-solid fa-triangle-exclamation"/> Vereniging opheffen</div>
              <p style={{fontSize:12.5,color:"var(--grijs-donker)",fontWeight:400,margin:"0 0 10px",lineHeight:1.65}}>
                Hiermee verdwijnt {i.clubNaam ? "“" + i.clubNaam + "”" : "je vereniging"} met
                alles wat eronder hangt: alle teams, alle spelers, wedstrijden, trainingen,
                opstellingen, tactieken, boetes en het sportpark. Er is geen prullenbak en
                geen ongedaan maken.
              </p>
              <button className="knop gevaar" style={{width:"100%",justifyContent:"center"}}
                onClick={function(){ setOpheffenTekst(""); setOpheffenOpen(true); }}>
                <i className="fa-solid fa-trash"/> Vereniging opheffen
              </button>
            </div>
          </React.Fragment>
        )}

        {melding && (
          <div className="kaart" style={{background:"var(--vlak-succes)",borderLeft:"4px solid var(--succes)",color:"var(--op-succesvlak)"}}>
            <div style={{fontSize:13,fontWeight:600,lineHeight:1.5}}>
              <i className="fa-solid fa-circle-check"/>{" "+melding}
            </div>
          </div>
        )}
        {fout && (
          <div className="kaart" style={{background:"var(--vlak-gevaar)",borderLeft:"4px solid var(--gevaar)",color:"var(--op-gevaarvlak)"}}>
            <div style={{fontSize:13,fontWeight:600,lineHeight:1.5}}>
              <i className="fa-solid fa-triangle-exclamation"/>{" "+fout}
            </div>
          </div>
        )}

        <div className="kaart over-kaart">
          <div className="over-logo"><Logo /></div>
          <div className="over-titel">{teamNaamVol()}</div>
          <div className="over-sub">Teammanager</div>
          <div className="over-lijn"/>
          <div className="over-studio">{ONTWERPER.studio}</div>
          <div className="over-naam">Ontwerp en bouw · {ONTWERPER.naam}</div>
        </div>

        {bevestigImport && (
          <div className="bevestig-overlay" onClick={function(e){if(e.target===e.currentTarget)setBevestigImport(null);}}>
            <div className="bevestig-kaart">
              <h3>Back-up terugzetten?</h3>
              <p>Alle huidige spelers, wedstrijden, trainingen en tactieken worden vervangen door de inhoud van het back-upbestand. Dit kan niet ongedaan gemaakt worden.</p>
              <div className="bevestig-knoppen">
                <button className="knop lijn" onClick={function(){setBevestigImport(null);}}>Annuleren</button>
                <button className="knop gevaar" onClick={voerImportUit}>Terugzetten</button>
              </div>
            </div>
          </div>
        )}

        {/* Opzeggen krijgt de lichte bevestiging van het verwijderen van
            een team, en níét het overtypen van "Vereniging opheffen"
            hieronder. Dat verschil is opzet: bij opheffen gaat alles
            onherroepelijk weg, bij opzeggen houd je je gegevens en kun je
            morgen weer overstappen. Een rem die zwaarder is dan wat er
            gebeurt, leert mensen alleen maar om door rode schermen heen
            te klikken.

            WAT DEZE KNOP VANDAAG DOET: een melding, meer niet. Er bestaat
            aan de serverkant nog geen manier om "opgezegd maar loopt nog
            door" vast te leggen, en ook niet om de doorlopende incasso bij
            Mollie te stoppen (server/19-mollie-subscription.sql legt het
            nummer wél vast, maar er is geen functie die hem opzegt). Doen
            alsof het gelukt is terwijl er volgende maand gewoon weer wordt
            afgeschreven, is het ergste wat deze knop kan doen — dus zegt
            hij precies wat er is: nog niet klaar. Zelfde keuze als bij
            "Overstappen" tot 19 september 2026. */}
        {opzeggenOpen && (
          <div className="bevestig-overlay"><div className="bevestig-kaart">
            <h3>{pakketNu().naam} opzeggen?</h3>
            <p>
              Je houdt {pakketNu().naam}{" "}
              {abonnementTot()
                ? "tot " + formateerDatum(abonnementTot())
                : "tot het einde van de periode die je al hebt betaald"}.
              Daarna gaat je vereniging terug naar Free: één team en alleen
              de basis. Je gegevens blijven staan.
            </p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){ setOpzeggenOpen(false); }}>Toch niet</button>
              <button className="knop gevaar" onClick={function(){
                setOpzeggenOpen(false);
                meldGoed("Opzeggen kan zodra dat onderdeel klaar is.");
              }}>Opzeggen</button>
            </div>
          </div></div>
        )}

        {/* Hetzelfde bevestigingsscherm als bij "Account verwijderen?" in
            de achterkant: overtypen wat je kwijtraakt. Een vraag met Ja
            en Nee klik je per ongeluk weg; een naam typ je niet per
            ongeluk over.

            Er zit met opzet geen wegklikken op de achtergrond onder:
            daarvoor staat er te veel op het spel om het per ongeluk goed
            te laten gaan. Annuleren is een knop. */}
        {opheffenOpen && (
          <div className="bevestig-overlay"><div className="bevestig-kaart">
            <h3>Vereniging opheffen?</h3>
            <p>
              Alles van {i.clubNaam ? "“" + i.clubNaam + "”" : "je vereniging"} gaat
              definitief weg: de vereniging zelf met naam en logo, alle leden, en alle teams —
              ook de teams die al in de prullenbak stonden. Met die teams verdwijnen hun
              spelers, wedstrijden, trainingen, opstellingen, tactieken, boetes en het
              sportpark, en ook het abonnement van de vereniging.
            </p>
            <p>
              De accounts van de andere leden blijven gewoon bestaan; alleen hun plek in
              déze vereniging niet. Dit kan niet ongedaan worden gemaakt.
            </p>
            <p style={{fontSize:12.5,fontWeight:600,margin:"0 0 6px"}}>
              Typ {"“" + opheffenNaam + "”"} over om te bevestigen:
            </p>
            <input type="text" autoComplete="off" value={opheffenTekst} autoFocus
              onChange={function(e){ setOpheffenTekst(e.target.value); }} />
            <div className="bevestig-knoppen">
              <button className="knop lijn" disabled={opheffenBezig}
                onClick={function(){ setOpheffenOpen(false); setOpheffenTekst(""); }}>Annuleren</button>
              {/* Er is in het hele bestand geen stijl voor een knop die
                  uitstaat (.knop:disabled bestaat niet). Deze knop stáát
                  het grootste deel van de tijd uit — dat is het hele idee
                  van overtypen — en dan mag hij er niet uitzien alsof je
                  erop kunt drukken. Vandaar dit hier, op deze ene knop, en
                  niet als algemene regel in de opmaak: dat zou het uiterlijk
                  van elke uitgeschakelde knop in de app veranderen en dat is
                  een andere beslissing dan deze. In het beheerscherm staat
                  hetzelfde gat nog open. */}
              <button className="knop gevaar"
                disabled={opheffenBezig || opheffenTekst.trim() !== opheffenNaam}
                style={(opheffenBezig || opheffenTekst.trim() !== opheffenNaam)
                       ? {opacity:.45, cursor:"default"} : null}
                onClick={voerOpheffenUit}>
                {opheffenBezig ? "Bezig…" : "Opheffen"}
              </button>
            </div>
          </div></div>
        )}
      </div>
    </div>
  );
}
