/* ══════════════════════════════════════════════════════════════
   SCHERM: Competitie (release 1, stap 5)
   ─────────────────────────────────────────────────────────────
   Zie docs/updateplan-competitie-toernooi-ai.md, hoofdstuk 3a. Alle
   rekenwerk staat in src/domein/competitie.js; dit bestand tekent en
   bewaart alleen.

   Voorlopig alleen zichtbaar met de proefschakelaar (proefCompetitie()
   hieronder, aan te zetten door een beheerder in Instellingen). Zo kan
   Evan het met zijn eigen team uitproberen voordat testers het zien.

   Wat er in deze stap staat: de stand per fase, de deelnemers, de
   fasekiezer, "Nieuwe fase", fase afsluiten, en het indelen van
   bestaande wedstrijden. Programma en snelle uitslageninvoer komen in
   stap 6.

   Dezelfde regel als elders: geen import/export; tools/bouw.js plakt dit
   bestand in de gedeelde scope (SCHERM_VOLGORDE), vóór wedstrijden.jsx,
   dat CompetitieTab gebruikt.
   ══════════════════════════════════════════════════════════════ */

/* ── De proefschakelaar ──
   Per apparaat, met opzet: het is een proef, geen instelling van het
   team. Weg zodra stap 8 de competitie voor iedereen aanzet. */
const PROEF_COMPETITIE_KEY = "tt_proef_competitie_v1";
function proefCompetitie() {
  try { return localStorage.getItem(PROEF_COMPETITIE_KEY) === "aan"; } catch (e) { return false; }
}
function zetProefCompetitie(aan) {
  try { if (aan) localStorage.setItem(PROEF_COMPETITIE_KEY, "aan"); else localStorage.removeItem(PROEF_COMPETITIE_KEY); } catch (e) {}
}

const VORM_LABEL = { half: "Halve competitie", heel: "Hele competitie", handmatig: "Handmatig schema" };
const VORM_UITLEG = {
  half: "Iedereen speelt één keer tegen ieder ander team.",
  heel: "Iedereen speelt twee keer tegen ieder ander team, thuis en uit.",
  handmatig: "Je bepaalt zelf welke wedstrijden er zijn."
};

function wieNu() {
  var s = typeof sessieNu === "function" ? sessieNu() : null;
  return { tijd: new Date().toISOString(), door: (s && (s.email || s.gebruikerId)) || "dit apparaat" };
}

/* ── Het scherm ──────────────────────────────────────────────
   wedstrijden/opWedstrijden: de eigen wedstrijden van WedstrijdenModule.
   Na het indelen krijgen die een verwijzing naar hun fase; die gaat via
   opWedstrijden terug, zodat er één lijst blijft en één plek waar hij
   wordt bewaard. */
function CompetitieTab({ wedstrijden, opWedstrijden }) {
  const [lijst, setLijst] = useState(laadCompetities);
  const [bekijk, setBekijk] = useState(null);
  const [tab, setTab] = useState("stand");
  const [indelen, setIndelen] = useState(false);
  const [nieuweFaseOpen, setNieuweFaseOpen] = useState(false);
  const [nieuwTeam, setNieuwTeam] = useState("");
  const mag = magRol("wedstrijd");

  const c = lijst[0] || null;
  function bewaar(nieuw) {
    var l = [nieuw].concat(lijst.slice(1));
    setLijst(l);
    slaJson(COMPETITIES_KEY, l);
  }

  /* ── Nog geen competitie ── */
  if (!c) {
    var oud = laadStand();
    var eigenComp = (wedstrijden || []).filter(function (w) { return (w.soort || "competitie") === "competitie"; });
    return (
      <div className="kaart" style={{textAlign:"center",padding:"26px 18px"}}>
        <div className="leeg-icoon"><i className="fa-solid fa-ranking-star"/></div>
        <h3 style={{margin:"10px 0 6px"}}>Nog geen competitie</h3>
        <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,marginBottom:16}}>
          Maak een competitie met alle teams uit je poule. De stand rekent zich dan uit
          met de uitslagen van álle wedstrijden, ook die tussen twee andere teams.
          {eigenComp.length > 0 && " Je " + eigenComp.length + " bestaande competitiewedstrijden deel je daarna in."}
          {oud.length > 0 && " De teams uit je oude stand worden overgenomen; die stand zelf blijft bewaard."}
        </p>
        {mag ? (
          <button className="knop" onClick={function () {
            var nieuw = migreerNaarCompetitie({ eigenNaam: teamNaamVol() || "Eigen team", oudeStand: oud, wedstrijden: wedstrijden });
            bewaar(nieuw);
            if (eigenComp.length > 0) setIndelen(true);
            meldGoed("Competitie aangemaakt");
          }}>+ Competitie aanmaken</button>
        ) : <p style={{fontSize:12,color:"var(--grijs-donker)"}}>Een trainer of eigenaar kan de competitie aanmaken.</p>}
      </div>
    );
  }

  const faseId = (bekijk && c.fases.some(function (f) { return f.id === bekijk; })) ? bekijk : c.actieveFaseId;
  const fase = c.fases.filter(function (f) { return f.id === faseId; })[0];
  const open = nietIngedeeld(c, wedstrijden);
  const dicht = fase.status === "afgesloten";
  const magHier = mag && (!dicht || magRol("club"));

  if (indelen) {
    return <IndeelScherm c={c} wedstrijden={wedstrijden}
      onKlaar={function (r) { bewaar(r.competitie); opWedstrijden(r.wedstrijden); setIndelen(false); }}
      onSluiten={function () { setIndelen(false); }} />;
  }

  const stand = standVanFase(c, faseId, wedstrijden);
  const achter = achterstallig(c, faseId, wedstrijden, vandaagISO());
  const oudeStand = laadStand();

  return (
    <div>
      {/* ── Fasekiezer ── */}
      <div className="kaart" style={{padding:"12px 14px"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",color:"var(--grijs-donker)",textTransform:"uppercase",marginBottom:6}}>
          {"Seizoen " + inst().seizoen + " › " + c.naam}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select className="formulier-input" style={{flex:1,marginBottom:0,minHeight:44}} value={faseId}
            onChange={function (e) { setBekijk(e.target.value); }}>
            {c.fases.map(function (f) {
              var label = f.naam + (f.id === c.actieveFaseId ? " · actief" : "") + (f.status === "afgesloten" ? " · afgesloten" : "");
              return <option key={f.id} value={f.id}>{label}</option>;
            })}
          </select>
          {mag && (
            <button className="knop klein" style={{minHeight:44,whiteSpace:"nowrap"}} onClick={function () { setNieuweFaseOpen(true); }}>
              + Nieuwe fase
            </button>
          )}
        </div>
        {fase.id !== c.actieveFaseId && (
          <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"8px 0 0"}}>
            Je bekijkt {fase.naam}. Nieuwe wedstrijden horen bij de actieve fase.
          </p>
        )}
      </div>

      {open.length > 0 && (
        <div className="melding" style={{margin:"0 0 12px"}}>
          <i className="fa-solid fa-circle-info"/>{" "}
          {open.length === 1 ? "1 competitiewedstrijd is" : open.length + " competitiewedstrijden zijn"} nog niet ingedeeld
          in een fase. Tot dan telt {open.length === 1 ? "hij" : "tellen ze"} niet mee in de stand.
          {mag && <button className="knop lijn klein" style={{marginLeft:8}} onClick={function () { setIndelen(true); }}>Indelen</button>}
        </div>
      )}

      <div className="tabs">
        <button className={"tab-knop" + (tab === "stand" ? " actief" : "")} onClick={function () { setTab("stand"); }}>
          <i className="fa-solid fa-ranking-star"/> Stand</button>
        <button className={"tab-knop" + (tab === "wedstrijden" ? " actief" : "")} onClick={function () { setTab("wedstrijden"); }}>
          <i className="fa-solid fa-futbol"/> Wedstrijden</button>
        <button className={"tab-knop" + (tab === "deelnemers" ? " actief" : "")} onClick={function () { setTab("deelnemers"); }}>
          <i className="fa-solid fa-users"/> Deelnemers</button>
      </div>

      {tab === "stand" && (
        <div className="kaart">
          {achter.length > 0 && (
            <div className="melding" style={{margin:"0 0 10px"}}>
              <i className="fa-solid fa-triangle-exclamation"/>{" "}
              Stand onvolledig: {achter.length === 1 ? "1 uitslag ontbreekt" : achter.length + " uitslagen ontbreken"}.
            </div>
          )}
          {stand.length === 0 ? (
            <p style={{fontSize:13,color:"var(--grijs-donker)"}}>Nog geen deelnemers in deze fase. Voeg ze toe bij Deelnemers.</p>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table className="stand-tabel">
                <thead><tr>
                  <th style={{width:30}}>#</th><th className="links">Team</th>
                  <th>G</th><th>W</th><th>GL</th><th>V</th><th>DV</th><th>DT</th><th>DS</th><th>P</th>
                </tr></thead>
                <tbody>
                  {stand.map(function (r) {
                    var achterTeam = achter.some(function (id) {
                      var w = fase.wedstrijden.filter(function (x) { return x.id === id; })[0];
                      return w && (w.thuisId === r.teamId || w.uitId === r.teamId);
                    });
                    return (
                      <tr key={r.teamId} className={r.eigen ? "eigen" : ""}>
                        <td><span className="stand-pos" title={r.gedeeld ? "Gedeelde plek" : ""}>{r.plek}{r.gedeeld ? "=" : ""}</span></td>
                        <td className="links naam">{r.naam}</td>
                        <td>{r.gespeeld}{achterTeam && <span title="Er ontbreekt een uitslag" style={{color:"var(--gevaar)"}}>!</span>}</td>
                        <td>{r.winst}</td><td>{r.gelijk}</td><td>{r.verlies}</td>
                        <td>{r.voor}</td><td>{r.tegen}</td>
                        <td style={{color:r.saldo>0?"var(--succes)":r.saldo<0?"var(--gevaar)":"inherit"}}>{(r.saldo>0?"+":"")+r.saldo}</td>
                        <td style={{fontSize:15}}>{r.punten}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"10px 0 0",lineHeight:1.5}}>
            {"Winst " + fase.regels.winst + ", gelijk " + fase.regels.gelijk + ", verlies " + fase.regels.verlies +
             " punten. Bij gelijke punten: doelsaldo, doelpunten voor, onderling resultaat. = is een gedeelde plek."}
          </p>
        </div>
      )}

      {tab === "wedstrijden" && (
        <CompWedstrijden c={c} faseId={faseId} wedstrijden={wedstrijden} opWedstrijden={opWedstrijden}
          bewaar={bewaar} magHier={magHier} />
      )}

      {tab === "deelnemers" && (
        <div className="kaart">
          {magHier && (
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input className="formulier-input" style={{flex:1,marginBottom:0}} value={nieuwTeam}
                placeholder="Teamnaam, bijv. SV Voorbeeld JO19-1"
                onChange={function (e) { setNieuwTeam(e.target.value); }}
                onKeyDown={function (e) { if (e.key === "Enter") document.getElementById("comp-team-toevoegen").click(); }} />
              <button id="comp-team-toevoegen" className="knop klein" onClick={function () {
                try {
                  var r = voegTeamToe(c, faseId, nieuwTeam);
                  bewaar(r.competitie); setNieuwTeam("");
                  if (!r.nieuw) meldGoed("Dat team stond er al; het doet nu mee in " + fase.naam);
                } catch (e) { meldFout(e.message); }
              }}>+ Toevoegen</button>
            </div>
          )}
          {fase.deelnemers.map(function (id) {
            var t = c.teams.filter(function (x) { return x.id === id; })[0] || { naam: id };
            return (
              <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:"1px solid var(--grijs)"}}>
                <span style={{flex:1,fontWeight:t.eigen ? 700 : 400}}>{t.naam}{t.eigen ? " (eigen team)" : ""}</span>
                {magHier && !t.eigen && (
                  <button className="knop lijn klein" aria-label={"Haal " + t.naam + " uit " + fase.naam} onClick={function () {
                    try { bewaar(verwijderDeelnemer(c, faseId, id)); } catch (e) { meldFout(e.message); }
                  }}><i className="fa-solid fa-xmark"/></button>
                )}
              </div>
            );
          })}
          <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"10px 0 0"}}>
            Teams toevoegen of weghalen geldt alleen voor {fase.naam}. Andere fases veranderen niet.
          </p>
        </div>
      )}

      {magRol("club") && (
        <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginBottom:12}} onClick={function () {
          bewaar(zetFaseStatus(c, faseId, dicht ? "open" : "afgesloten", wieNu()));
          meldGoed(fase.naam + (dicht ? " is weer open" : " is afgesloten"));
        }}>
          <i className={dicht ? "fa-solid fa-lock-open" : "fa-solid fa-lock"}/> {dicht ? fase.naam + " heropenen" : fase.naam + " afsluiten"}
        </button>
      )}

      {oudeStand.length > 0 && (
        <details className="kaart" style={{fontSize:13}}>
          <summary style={{cursor:"pointer",fontWeight:700}}>Oude stand (met de hand ingevuld)</summary>
          <p style={{fontSize:12,color:"var(--grijs-donker)"}}>Bewaard zoals hij was. Telt niet mee in de nieuwe stand.</p>
          {oudeStand.map(function (t) {
            return <div key={t.id} style={{padding:"4px 0"}}>{t.naam}: {t.gespeeld} gespeeld, {(t.winst || 0) * 3 + (t.gelijk || 0)} punten</div>;
          })}
        </details>
      )}

      {nieuweFaseOpen && (
        <NieuweFaseVenster c={c} onSluiten={function () { setNieuweFaseOpen(false); }}
          onMaak={function (opties) {
            var nieuw = nieuweFase(c, opties);
            bewaar(nieuw); setBekijk(nieuw.actieveFaseId); setNieuweFaseOpen(false);
            meldGoed(opties.naam + " aangemaakt en actief");
          }} />
      )}
    </div>
  );
}

function NieuweFaseVenster({ c, onSluiten, onMaak }) {
  const [naam, setNaam] = useState("Fase " + (c.fases.length + 1));
  const [deelnemers, setDeelnemers] = useState(true);
  const [regels, setRegels] = useState(true);
  const [vorm, setVorm] = useState("half");
  return (
    <div className="bevestig-overlay"><div className="bevestig-kaart">
      <h3>Nieuwe fase</h3>
      <label className="formulier-label">Naam</label>
      <input className="formulier-input" value={naam} onChange={function (e) { setNaam(e.target.value); }} />
      <label style={{display:"flex",gap:8,alignItems:"center",margin:"6px 0",fontSize:14}}>
        <input type="checkbox" checked={deelnemers} onChange={function (e) { setDeelnemers(e.target.checked); }} />
        Deelnemers overnemen (daarna aan te passen)
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",margin:"6px 0 12px",fontSize:14}}>
        <input type="checkbox" checked={regels} onChange={function (e) { setRegels(e.target.checked); }} />
        Puntentelling overnemen
      </label>
      <label className="formulier-label">Vorm</label>
      <select className="formulier-input" value={vorm} onChange={function (e) { setVorm(e.target.value); }}>
        {Object.keys(VORM_LABEL).map(function (k) { return <option key={k} value={k}>{VORM_LABEL[k]}</option>; })}
      </select>
      <p style={{fontSize:12,color:"var(--grijs-donker)",lineHeight:1.5,margin:"-4px 0 8px"}}>{VORM_UITLEG[vorm]}</p>
      <p style={{fontSize:12,color:"var(--grijs-donker)",lineHeight:1.5}}>
        De nieuwe fase begint op nul: geen wedstrijden, uitslagen of punten. De huidige fase blijft zoals hij is.
      </p>
      <div className="bevestig-knoppen">
        <button className="knop lijn" onClick={onSluiten}>Annuleren</button>
        <button className="knop" onClick={function () {
          if (!naam.trim()) { meldFout("Geef de fase een naam."); return; }
          onMaak({ naam: naam.trim(), kopieerDeelnemers: deelnemers, kopieerRegels: regels, vorm: vorm });
        }}>Aanmaken</button>
      </div>
    </div></div>
  );
}

/* ── Bestaande wedstrijden indelen ───────────────────────────
   Hoofdstuk 6 van het plan: een voorstel, geen besluit. Per wedstrijd
   een fase kiezen, of in één keer "alles vóór datum X naar fase Y".
   Pas bij "Indeling bevestigen" wordt er iets bewaard, en alleen als de
   controle zegt dat het klopt. */
function IndeelScherm({ c, wedstrijden, onKlaar, onSluiten }) {
  const [keuze, setKeuze] = useState(function () {
    var k = {};
    voorstelIndeling(c, nietIngedeeld(c, wedstrijden)).forEach(function (v) { k[v.wedstrijdId] = v.faseId; });
    return k;
  });
  const [grens, setGrens] = useState("");
  const [grensFase, setGrensFase] = useState(c.fases[0].id);
  const [fouten, setFouten] = useState([]);
  const rijen = voorstelIndeling(c, nietIngedeeld(c, wedstrijden))
    .sort(function (a, b) { return a.datum < b.datum ? -1 : 1; });

  return (
    <div>
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-list-check"/> Wedstrijden indelen</div>
        <p style={{fontSize:13,color:"var(--grijs-donker)",lineHeight:1.6}}>
          Kies per wedstrijd in welke fase hij hoort. Er wordt pas iets bewaard als je bevestigt;
          je wedstrijden en uitslagen zelf veranderen niet.
        </p>
        {c.fases.length > 1 && (
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:10,fontSize:13}}>
            Alles vóór
            <input type="date" className="formulier-input" style={{width:"auto",marginBottom:0}} value={grens}
              onChange={function (e) { setGrens(e.target.value); }} />
            naar
            <select className="formulier-input" style={{width:"auto",marginBottom:0}} value={grensFase}
              onChange={function (e) { setGrensFase(e.target.value); }}>
              {c.fases.map(function (f) { return <option key={f.id} value={f.id}>{f.naam}</option>; })}
            </select>
            <button className="knop lijn klein" disabled={!grens} onClick={function () {
              var k = Object.assign({}, keuze);
              rijen.forEach(function (r) { if (r.datum && r.datum < grens) k[r.wedstrijdId] = grensFase; });
              setKeuze(k);
            }}>Toepassen</button>
          </div>
        )}
        {rijen.map(function (r) {
          return (
            <div key={r.wedstrijdId} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--grijs)"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14}}>vs. {r.tegenstander}</div>
                <div style={{fontSize:12,color:"var(--grijs-donker)"}}>{r.datum ? formateerDatumKort(r.datum) : "geen datum"} · {r.status}</div>
              </div>
              <select className="formulier-input" style={{width:"auto",marginBottom:0}} value={keuze[r.wedstrijdId]}
                onChange={function (e) { var k = Object.assign({}, keuze); k[r.wedstrijdId] = e.target.value; setKeuze(k); }}>
                {c.fases.map(function (f) { return <option key={f.id} value={f.id}>{f.naam}</option>; })}
              </select>
            </div>
          );
        })}
        {fouten.length > 0 && (
          <div className="melding" style={{marginTop:10}}>
            <i className="fa-solid fa-triangle-exclamation"/> Niet bewaard — de controle klopte niet:
            <ul style={{margin:"6px 0 0 16px"}}>{fouten.map(function (f, i) { return <li key={i}>{f}</li>; })}</ul>
          </div>
        )}
      </div>
      <div className="bevestig-knoppen" style={{marginBottom:12}}>
        <button className="knop lijn" onClick={onSluiten}>Later</button>
        <button className="knop" onClick={function () {
          var indeling = rijen.map(function (r) { return { wedstrijdId: r.wedstrijdId, faseId: keuze[r.wedstrijdId] }; });
          var r = bevestigIndeling(c, wedstrijden, indeling);
          var controle = controleMigratie(wedstrijden, r.competitie, r.wedstrijden);
          if (!controle.ok) { setFouten(controle.meldingen); return; }
          onKlaar(r);
          meldGoed(rijen.length + (rijen.length === 1 ? " wedstrijd ingedeeld" : " wedstrijden ingedeeld"));
        }}>Indeling bevestigen</button>
      </div>
    </div>
  );
}

/* ── Tabblad Wedstrijden: speelrondes, wie tegen wie, uitslagen ──
   Op verzoek van Evan (11 oktober 2026): speelrondes met de hand
   aanmaken, per ronde zelf kiezen welke teams tegen elkaar spelen, en
   daar meteen de uitslag invullen.

   Een wedstrijd van het eigen team hoort bij een eigen Wedstrijd (met
   opstelling en doelpunten). Bestaat die al zonder koppeling, dan wordt
   hij gekoppeld; anders komt hij erbij in de wedstrijdlijst. De uitslag
   die je hier invult, komt in díe Wedstrijd — één registratie, dus stand
   en spelerscijfers kunnen niet uit elkaar lopen. */
/* Een eigen Wedstrijd voor een competitiewedstrijd van het eigen team:
   een bestaande, nog niet gekoppelde wedstrijd tegen die tegenstander,
   of anders een nieuwe in de wedstrijdlijst. "gebruikt" voorkomt dat
   één bestaande wedstrijd aan twee competitiewedstrijden hangt. */
function koppelOfMaakEigen(lijst, tegen, eigenThuis, koppeling, gebruikt) {
  var namen = [tegen.naam].concat(tegen.aliassen || []).map(normaliseerTeamNaam);
  var kandidaten = lijst.filter(function (w) {
    return (w.soort || "competitie") === "competitie" && !w.competitie && w.status !== "gespeeld" &&
           gebruikt.indexOf(w.id) < 0 && namen.indexOf(normaliseerTeamNaam(w.tegenstander)) >= 0;
  });
  var bestaand = kandidaten.filter(function (w) { return !!w.thuis === eigenThuis; })[0] || kandidaten[0];
  if (bestaand) {
    gebruikt.push(bestaand.id);
    return { wedstrijdId: bestaand.id, lijst: lijst.map(function (w) {
      return w.id === bestaand.id ? Object.assign({}, w, { thuis: eigenThuis, competitie: koppeling }) : w; }) };
  }
  var id = Date.now() + lijst.length + Math.floor(Math.random() * 1000);
  return { wedstrijdId: id, lijst: lijst.concat([Object.assign({}, LEEG_WEDSTRIJD, {
    id: id, tegenstander: tegen.naam, thuis: eigenThuis, status: "gepland",
    soort: "competitie", speelduur: inst().speelduur || 90, competitie: koppeling })]) };
}

function CompWedstrijden({ c, faseId, wedstrijden, opWedstrijden, bewaar, magHier }) {
  const [schemaOpen, setSchemaOpen] = useState(false);
  const fase = c.fases.filter(function (f) { return f.id === faseId; })[0];
  const eigen = c.teams.filter(function (t) { return t.eigen; })[0];
  const rondes = (fase.rondes || []).slice().sort(function (a, b) { return a.nummer - b.nummer; });
  const losse = fase.wedstrijden.filter(function (w) { return !rondes.some(function (r) { return r.id === w.rondeId; }); });
  /** @param {string} id */
  function naam(id) { var t = c.teams.filter(function (x) { return x.id === id; })[0]; return t ? t.naam : id; }

  function nieuweRonde() {
    var r = voegRondeToe(c, faseId);
    bewaar(r.competitie);
  }

  /* Uitslag bewaren. Voor een eigen wedstrijd in de Wedstrijd zelf. */
  function bewaarUitslag(cw, uitslag) {
    if (cw.wedstrijdId !== undefined && cw.wedstrijdId !== null) {
      var e = eigenScoreUit(cw, eigen.id, uitslag);
      opWedstrijden((wedstrijden || []).map(function (w) {
        return w.id === cw.wedstrijdId ? Object.assign({}, w, { status: e.status, score: e.score, thuis: e.thuis }) : w;
      }));
      return;
    }
    try {
      bewaar(pasBewerkingToe(c, { soort: "uitslag", faseId: faseId, wedstrijdId: cw.id,
        status: uitslag ? "gespeeld" : "gepland", uitslag: uitslag, tijd: wieNu().tijd, door: wieNu().door }));
    } catch (e2) { meldFout(e2.message); }
  }

  function voegToe(rondeId, thuisId, uitId) {
    if (!thuisId || !uitId) { meldFout("Kies twee teams."); return; }
    var cwId = "cw-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var eigenDoetMee = thuisId === eigen.id || uitId === eigen.id;
    var nieuweLijst = null, wedstrijdId = null;
    if (eigenDoetMee) {
      var tegen = c.teams.filter(function (t) { return t.id === (thuisId === eigen.id ? uitId : thuisId); })[0];
      var k = koppelOfMaakEigen(wedstrijden || [], tegen, thuisId === eigen.id,
        { competitieId: c.id, faseId: faseId, compWedstrijdId: cwId }, []);
      nieuweLijst = k.lijst; wedstrijdId = k.wedstrijdId;
    }
    try {
      var r = voegWedstrijdToe(c, faseId, { id: cwId, rondeId: rondeId, thuisId: thuisId, uitId: uitId, wedstrijdId: wedstrijdId });
      bewaar(r.competitie);
      if (nieuweLijst) opWedstrijden(nieuweLijst);
    } catch (e) { meldFout(e.message); }
  }

  function maakHetSchema(vorm) {
    var lijst = (wedstrijden || []).slice(), gebruikt = [];
    try {
      var r = maakSchema(c, faseId, vorm, function (cwId, tegenId, eigenThuis) {
        var tegen = c.teams.filter(function (t) { return t.id === tegenId; })[0];
        var k = koppelOfMaakEigen(lijst, tegen, eigenThuis, { competitieId: c.id, faseId: faseId, compWedstrijdId: cwId }, gebruikt);
        lijst = k.lijst; return k.wedstrijdId;
      });
      bewaar(r.competitie);
      opWedstrijden(lijst);
      setSchemaOpen(false);
      meldGoed(r.nieuw === 0 && r.ingepland === 0 ? "Alle wedstrijden stonden er al" :
        r.nieuw + " wedstrijden in " + r.rondes + (r.rondes === 1 ? " speelronde" : " speelrondes") + " gemaakt");
    } catch (e) { meldFout(e.message); }
  }

  function bewaarNotitie(cw, tekst) {
    try { bewaar(zetNotitie(c, faseId, cw.id, tekst)); } catch (e) { meldFout(e.message); }
  }

  function haalWeg(cw) {
    try {
      bewaar(verwijderWedstrijd(c, faseId, cw.id, wedstrijden));
      if (cw.wedstrijdId !== undefined && cw.wedstrijdId !== null) {
        opWedstrijden(wedstrijden.map(function (w) {
          if (w.id !== cw.wedstrijdId) return w;
          var kaal = Object.assign({}, w); delete kaal.competitie; return kaal;
        }));
      }
    } catch (e) { meldFout(e.message); }
  }

  return (
    <div>
      {rondes.length === 0 && losse.length === 0 && (
        <div className="kaart" style={{textAlign:"center"}}>
          <p style={{fontSize:13,color:"var(--grijs-donker)",lineHeight:1.6}}>
            Nog geen speelrondes in {fase.naam}. Maak een speelronde en kies welke teams tegen elkaar spelen.
          </p>
        </div>
      )}
      {rondes.map(function (r) {
        var inRonde = fase.wedstrijden.filter(function (w) { return w.rondeId === r.id; });
        return (
          <div key={r.id} className="kaart">
            <div className="kaart-titel" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span><i className="fa-solid fa-flag-checkered"/> {r.naam}</span>
              {magHier && inRonde.length === 0 && (
                <button className="knop lijn klein" aria-label={r.naam + " weghalen"}
                  onClick={function () { try { bewaar(verwijderRonde(c, faseId, r.id)); } catch (e) { meldFout(e.message); } }}>
                  <i className="fa-solid fa-trash"/></button>
              )}
            </div>
            {inRonde.map(function (cw) {
              return <UitslagRegel key={cw.id + "|" + JSON.stringify(uitslagVan(cw, wedstrijden))} cw={cw}
                thuis={naam(cw.thuisId)} uit={naam(cw.uitId)} eigenId={eigen.id}
                uitslag={uitslagVan(cw, wedstrijden)} mag={magHier}
                onUitslag={function (u) { bewaarUitslag(cw, u); }} onWeg={function () { haalWeg(cw); }}
                  onNotitie={function (t) { bewaarNotitie(cw, t); }} />;
            })}
            {magHier && (
              <NieuweWedstrijdRegel fase={fase} rondeId={r.id} naam={naam}
                onToevoegen={function (t, u) { voegToe(r.id, t, u); }} />
            )}
          </div>
        );
      })}
      {losse.length > 0 && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-inbox"/> Zonder speelronde</div>
          <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"0 0 8px"}}>Kies bij elke wedstrijd in welke speelronde hij hoort.</p>
          {losse.map(function (cw) {
            return (
              <div key={cw.id}>
                <UitslagRegel key={cw.id + "|" + JSON.stringify(uitslagVan(cw, wedstrijden))} cw={cw}
                  thuis={naam(cw.thuisId)} uit={naam(cw.uitId)} eigenId={eigen.id}
                  uitslag={uitslagVan(cw, wedstrijden)} mag={magHier}
                  onUitslag={function (u) { bewaarUitslag(cw, u); }} onWeg={function () { haalWeg(cw); }}
                  onNotitie={function (t) { bewaarNotitie(cw, t); }} />
                {magHier && rondes.length > 0 && (
                  <select className="formulier-input" style={{marginTop:-4}} value=""
                    onChange={function (e) { try { bewaar(zetWedstrijdInRonde(c, faseId, cw.id, e.target.value)); } catch (er) { meldFout(er.message); } }}>
                    <option value="">Zet in speelronde…</option>
                    {rondes.map(function (r) { return <option key={r.id} value={r.id}>{r.naam}</option>; })}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
      {magHier && (
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button className="knop" style={{flex:1,justifyContent:"center"}} onClick={nieuweRonde}>+ Speelronde</button>
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={function () { setSchemaOpen(true); }}>
            <i className="fa-solid fa-wand-magic-sparkles"/> Schema maken</button>
        </div>
      )}
      {schemaOpen && <SchemaVenster c={c} faseId={faseId} onSluiten={function () { setSchemaOpen(false); }} onMaak={maakHetSchema} />}
    </div>
  );
}

/* Halve of hele competitie, met vooraf hoeveel er bijkomt. De
   voorvertoning rekent op een kopie: er wordt pas iets bewaard bij
   "Maken". */
function SchemaVenster({ c, faseId, onSluiten, onMaak }) {
  const [vorm, setVorm] = useState("half");
  var voorbeeld = null, fout = null;
  try { voorbeeld = maakSchema(c, faseId, vorm, function () { return "voorbeeld"; }); } catch (e) { fout = e.message; }
  return (
    <div className="bevestig-overlay"><div className="bevestig-kaart">
      <h3>Schema maken</h3>
      <label className="formulier-label">Vorm</label>
      <select className="formulier-input" value={vorm} onChange={function (e) { setVorm(e.target.value); }}>
        <option value="half">Halve competitie</option>
        <option value="heel">Hele competitie</option>
      </select>
      <p style={{fontSize:12,color:"var(--grijs-donker)",lineHeight:1.5,margin:"-4px 0 8px"}}>{VORM_UITLEG[vorm]}</p>
      {fout ? <p style={{fontSize:13,color:"var(--gevaar)"}}>{fout}</p> : (
        <p style={{fontSize:13,lineHeight:1.6}}>
          {voorbeeld.nieuw === 0 && voorbeeld.ingepland === 0 ? "Alle wedstrijden staan er al; er komt niets bij." :
            voorbeeld.nieuw + " wedstrijden in " + voorbeeld.rondes + (voorbeeld.rondes === 1 ? " nieuwe speelronde" : " nieuwe speelrondes") + "."}
          {voorbeeld.alAanwezig > 0 && " " + voorbeeld.alAanwezig + " stonden er al en blijven zoals ze zijn" +
            (voorbeeld.ingepland > 0 ? "; " + voorbeeld.ingepland + " daarvan krijgen een speelronde." : ".")}
          {" Wedstrijden van je eigen team komen ook in je wedstrijdlijst. Datums kun je daarna per wedstrijd invullen."}
        </p>
      )}
      <div className="bevestig-knoppen">
        <button className="knop lijn" onClick={onSluiten}>Annuleren</button>
        <button className="knop" disabled={!!fout || !voorbeeld || (voorbeeld.nieuw === 0 && voorbeeld.ingepland === 0)} onClick={function () { onMaak(vorm); }}>Maken</button>
      </div>
    </div></div>
  );
}

/* Eén wedstrijd met twee invulvakjes. Bewaart zodra beide vakjes iets
   geldigs hebben of allebei leeg zijn (dan geen uitslag, nooit 0–0). */
function UitslagRegel({ cw, thuis, uit, eigenId, uitslag, mag, onUitslag, onWeg, onNotitie }) {
  const [notitieOpen, setNotitieOpen] = useState(false);
  const [notitie, setNotitie] = useState(cw.notitie || "");
  const [a, setA] = useState(uitslag ? String(uitslag.thuis) : "");
  const [b, setB] = useState(uitslag ? String(uitslag.uit) : "");
  function klaar(na, nb) {
    var r = leesUitslagInvoer(na, nb);
    if (r.soort === "half") return;
    if (r.soort === "fout") { meldFout("Een score is een heel getal vanaf 0."); return; }
    var nieuw = r.soort === "uitslag" ? r.uitslag : null;
    if (JSON.stringify(nieuw) === JSON.stringify(uitslag || null)) return;
    onUitslag(nieuw);
  }
  var eigenWed = cw.thuisId === eigenId || cw.uitId === eigenId;
  /* Thuis en uit onder elkaar, elk met een eigen vakje: op een telefoon
     past een volledige teamnaam dan wel, en je ziet in één oogopslag wie
     wat scoorde. Naast elkaar werden namen tot "VV Stuifz…" afgekapt. */
  var vak = {width:52,textAlign:"center",marginBottom:0,padding:"8px 4px",fontSize:17,fontWeight:700};
  /** @param {string} teamNaam @param {boolean} vet @param {string} waarde @param {function(string):void} zet @param {"a"|"b"} kant */
  function regel(teamNaam, vet, waarde, zet, kant) {
    return (
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0"}}>
        <span style={{flex:1,minWidth:0,fontSize:14,fontWeight:vet?700:500,lineHeight:1.3}}>{teamNaam}</span>
        <input className="formulier-input" style={vak} inputMode="numeric" value={waarde} disabled={!mag}
          aria-label={"Doelpunten " + teamNaam}
          onChange={function (e) { zet(e.target.value); }}
          onBlur={function () { klaar(a, b); }}
          onKeyDown={function (e) { if (e.key === "Enter") klaar(a, b); }} />
      </div>
    );
  }
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid var(--grijs)"}}>
      <div style={{flex:1,minWidth:0}}>
        {regel(thuis, cw.thuisId === eigenId, a, setA, "a")}
        {regel(uit, cw.uitId === eigenId, b, setB, "b")}
        {eigenWed && (
          <div style={{fontSize:11,color:"var(--grijs-donker)",marginTop:2}}>
            <i className="fa-solid fa-link"/> Eigen wedstrijd — de uitslag staat ook in je wedstrijdlijst
          </div>
        )}
        {notitieOpen ? (
          <textarea className="formulier-input" rows="3" autoFocus value={notitie} disabled={!mag}
            placeholder="Opmerking of kort verslag" style={{marginTop:6,marginBottom:0,fontSize:13}}
            onChange={function (e) { setNotitie(e.target.value); }}
            onBlur={function () { if (mag) onNotitie(notitie); setNotitieOpen(false); }} />
        ) : (cw.notitie ? (
          <div style={{fontSize:12,color:"var(--grijs-donker)",marginTop:4,whiteSpace:"pre-wrap",cursor:"pointer"}}
            onClick={function () { setNotitieOpen(true); }}><i className="fa-solid fa-note-sticky"/> {cw.notitie}</div>
        ) : null)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignSelf:"center"}}>
        {(mag || cw.notitie) && (
          <button className="knop lijn klein" style={{padding:"6px 9px"}}
            aria-label={cw.notitie ? "Notitie bekijken of wijzigen" : "Notitie toevoegen"}
            title={cw.notitie ? "Er is een notitie" : "Notitie toevoegen"}
            onClick={function () { setNotitieOpen(!notitieOpen); }}>
            <i className={cw.notitie ? "fa-solid fa-note-sticky" : "fa-regular fa-note-sticky"}/></button>
        )}
        {mag && (
          <button className="knop lijn klein" style={{padding:"6px 9px"}} aria-label="Wedstrijd weghalen" onClick={onWeg}>
            <i className="fa-solid fa-xmark"/></button>
        )}
      </div>
    </div>
  );
}

/* Twee keuzelijsten: wie speelt thuis, wie uit. Teams die in deze ronde
   al spelen, staan er niet tussen. */
function NieuweWedstrijdRegel({ fase, rondeId, naam, onToevoegen }) {
  const [t, setT] = useState("");
  const [u, setU] = useState("");
  const bezet = teamsInRonde(fase, rondeId);
  const vrij = fase.deelnemers.filter(function (id) { return bezet.indexOf(id) < 0; })
    .sort(function (x, y) { return naam(x).localeCompare(naam(y), "nl"); });
  if (vrij.length < 2) {
    return <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"8px 0 0"}}>
      {fase.deelnemers.length < 2 ? "Voeg eerst teams toe bij Deelnemers." : "Alle teams spelen al in deze ronde."}</p>;
  }
  return (
    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:10,flexWrap:"wrap"}}>
      <select className="formulier-input" style={{flex:"1 1 120px",marginBottom:0}} value={t} onChange={function (e) { setT(e.target.value); }} aria-label="Thuisteam">
        <option value="">Thuis…</option>
        {vrij.filter(function (id) { return id !== u; }).map(function (id) { return <option key={id} value={id}>{naam(id)}</option>; })}
      </select>
      <span style={{color:"var(--grijs-donker)"}}>tegen</span>
      <select className="formulier-input" style={{flex:"1 1 120px",marginBottom:0}} value={u} onChange={function (e) { setU(e.target.value); }} aria-label="Uitteam">
        <option value="">Uit…</option>
        {vrij.filter(function (id) { return id !== t; }).map(function (id) { return <option key={id} value={id}>{naam(id)}</option>; })}
      </select>
      <button className="knop klein" disabled={!t || !u} onClick={function () { onToevoegen(t, u); setT(""); setU(""); }}>+ Toevoegen</button>
    </div>
  );
}

/* ══ STATISTIEKEN FILTEREN (release 1, stap 7) ══════════════════
   Bovenaan Statistieken › Team en › Individu. Met de standaardkeuze
   (dit seizoen, dit team, competitie + beker) verandert er niets: dan
   staan de bestaande schermen er gewoon. Kies je iets anders, dan komt
   er een gefilterd overzicht, uitgerekend met verzamelWedstrijden (nooit
   dubbel), teamTotalen en spelerTotalen (niet bijgehouden is "—").

   Andere seizoenen en teams staan al op dit apparaat: de synchronisatie
   haalt alle teams van je club binnen. Ze worden hier rechtstreeks uit
   de opslag gelezen; er verandert niets aan wat er staat. */

const STAT_SOORTEN = [
  { id: "competitie", label: "Competitie" }, { id: "beker", label: "Beker" },
  { id: "oefen", label: "Oefen" }, { id: "toernooi", label: "Toernooi" }
];
const STANDAARD_STATFILTER = { bereik: "seizoen", fases: [], seizoenen: [], alleTeams: false, soorten: ["competitie", "beker"] };

/* Zelfde knopjes als het filter bij Wedstrijden (Uitslagen/Aankomende/Alle). */
function chipStijl(aan) {
  return { borderColor: aan ? "var(--blauw)" : "var(--grijs)", background: aan ? "var(--blauw)" : "var(--wit)",
           color: aan ? "var(--wit)" : "var(--grijs-donker)" };
}
function statFilterStandaard(f) {
  return f.bereik === "seizoen" && !f.alleTeams && f.soorten.slice().sort().join() === "beker,competitie";
}
function leesVolle(team, seizoen, basis) {
  try { var r = localStorage.getItem("tt_" + team + "__" + seizoen + "::" + basis); return r ? JSON.parse(r) : []; }
  catch (e) { return []; }
}
/* Schrijven onder de sleutel van een ánder team of seizoen, met
   dezelfde stappen als slaJson (stempels voor het samenvoegen, en
   melden dat er iets is veranderd zodat het wordt uitgewisseld). */
function schrijfVolle(volle, data) {
  var oud = null;
  try { var t = localStorage.getItem(volle); oud = t ? JSON.parse(t) : null; } catch (e) {}
  var eruit = Array.isArray(data) ? stempelLijst(data, oud) : data;
  try { localStorage.setItem(volle, JSON.stringify(eruit)); } catch (e) { meldFout("Opslaan lukte niet."); return; }
  if (typeof meldWijziging === "function") meldWijziging(volle);
}
function teamNaamOpId(id) {
  var t = teams().filter(function (x) { return x.id === id; })[0];
  return t ? t.naam : id;
}

function StatFilterBalk({ filter, opFilter }) {
  const [open, setOpen] = useState(false);
  const comp = (laadCompetities() || [])[0] || null;
  const seizoenen = seizoenenVan(teamId());
  const meerTeams = teams().length > 1;
  function zet(wijz) { opFilter(Object.assign({}, filter, wijz)); }
  function wissel(lijst, id) { return lijst.indexOf(id) >= 0 ? lijst.filter(function (x) { return x !== id; }) : lijst.concat([id]); }
  var samenvatting = (filter.bereik === "fases" ? (filter.fases.length + (filter.fases.length === 1 ? " fase" : " fases")) :
    filter.bereik === "seizoenen" ? filter.seizoenen.map(seizoenLabel).join(" + ") || "geen seizoen" : "Dit seizoen") +
    (filter.alleTeams ? " · alle teams" : "") + " · " +
    STAT_SOORTEN.filter(function (s) { return filter.soorten.indexOf(s.id) >= 0; }).map(function (s) { return s.label; }).join(", ");
  return (
    <div className="kaart" style={{padding:"10px 14px"}}>
      <button className="knop lijn klein" style={{width:"100%",justifyContent:"space-between"}} onClick={function () { setOpen(!open); }}>
        <span><i className="fa-solid fa-filter"/> {samenvatting}</span>
        <i className={open ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"}/>
      </button>
      {open && (
        <div style={{marginTop:10,fontSize:13}}>
          <label className="formulier-label">Bereik</label>
          <select className="formulier-input" value={filter.bereik} onChange={function (e) {
            var b = e.target.value;
            zet({ bereik: b, alleTeams: b === "fases" ? false : filter.alleTeams,
                  fases: b === "fases" && !filter.fases.length && comp ? [comp.actieveFaseId] : filter.fases,
                  seizoenen: b === "seizoenen" && !filter.seizoenen.length ? seizoenen.slice(0, 2) : filter.seizoenen });
          }}>
            <option value="seizoen">Dit seizoen</option>
            {comp && <option value="fases">Competitiefase(s)</option>}
            {seizoenen.length > 1 && <option value="seizoenen">Meerdere seizoenen</option>}
          </select>
          {filter.bereik === "fases" && comp && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"-4px 0 10px"}}>
              {comp.fases.map(function (f) {
                var aan = filter.fases.indexOf(f.id) >= 0;
                return <button key={f.id} className="filter-chip" style={chipStijl(aan)} onClick={function () { zet({ fases: wissel(filter.fases, f.id) }); }}>{f.naam}</button>;
              })}
            </div>
          )}
          {filter.bereik === "seizoenen" && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"-4px 0 10px"}}>
              {seizoenen.map(function (s) {
                var aan = filter.seizoenen.indexOf(s) >= 0;
                return <button key={s} className="filter-chip" style={chipStijl(aan)} onClick={function () { zet({ seizoenen: wissel(filter.seizoenen, s) }); }}>{seizoenLabel(s)}</button>;
              })}
            </div>
          )}
          {meerTeams && filter.bereik !== "fases" && (
            <label style={{display:"flex",gap:8,alignItems:"center",margin:"0 0 10px"}}>
              <input type="checkbox" checked={filter.alleTeams} onChange={function (e) { zet({ alleTeams: e.target.checked }); }} />
              Alle teams van de club (gekoppelde spelers tellen als één persoon)
            </label>
          )}
          <label className="formulier-label">Wedstrijdsoorten</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {STAT_SOORTEN.map(function (s) {
              var aan = filter.soorten.indexOf(s.id) >= 0;
              return <button key={s.id} className="filter-chip" style={chipStijl(aan)} onClick={function () { zet({ soorten: wissel(filter.soorten, s.id) }); }}>{s.label}</button>;
            })}
          </div>
          {!statFilterStandaard(filter) && (
            <button className="knop lijn klein" style={{marginTop:10}} onClick={function () { opFilter(STANDAARD_STATFILTER); }}>Terug naar dit seizoen</button>
          )}
        </div>
      )}
    </div>
  );
}

/* De bronnen bij een filter: per team en seizoen de wedstrijden, plus
   per team de spelers (uit het nieuwste gekozen seizoen, voor de naam
   en de koppeling). */
function statBronnen(filter) {
  var tids = filter.alleTeams ? teams().map(function (t) { return t.id; }) : [teamId()];
  var selecties = [], spelersPerTeam = {};
  tids.forEach(function (tid) {
    var ss = filter.bereik === "seizoenen" ? filter.seizoenen.filter(function (s) { return seizoenenVan(tid).indexOf(s) >= 0; })
                                           : [seizoenNu(tid)];
    ss.forEach(function (s) {
      selecties.push({ bron: { teamId: tid, seizoen: s, wedstrijden: leesVolle(tid, s, WEDSTRIJDEN_KEY) },
                       fases: filter.bereik === "fases" ? filter.fases : null });
    });
    var nieuwste = ss.slice().sort().reverse()[0];
    spelersPerTeam[tid] = nieuwste ? leesVolle(tid, nieuwste, SPELERS_KEY) : [];
  });
  return { selecties: selecties, spelersPerTeam: spelersPerTeam };
}

function GefilterdOverzicht({ filter }) {
  const [koppelOpen, setKoppelOpen] = useState(false);
  const b = statBronnen(filter);
  const verz = verzamelWedstrijden(b.selecties, filter.soorten);
  const t = teamTotalen(verz);
  const rijen = spelerTotalen(verz, b.spelersPerTeam);
  const zonder = verz.filter(function (i) { return !(i.wedstrijd.opstelling || []).length; }).length;
  const streep = function (r, waarde) { return r.wedstrijden === 0 && r.zonderOpstelling > 0 ? "—" : waarde; };
  if (koppelOpen) return <KoppelScherm onSluiten={function () { setKoppelOpen(false); }} />;
  return (
    <div>
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-chart-simple"/> Statistieken (gefilterd)</div>
        <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"0 0 10px"}}>
          {verz.length + (verz.length === 1 ? " wedstrijd" : " wedstrijden")}
          {zonder > 0 && " · " + zonder + " zonder opstelling (speelminuten onbekend)"}
          {filter.bereik === "seizoenen" || filter.alleTeams ? " · dit is een statistiekoverzicht, geen competitiestand" : ""}
        </p>
        <div className="stat-raster-3">
          <div className="stat-pill"><div className="stat-pill-getal">{t.winst}-{t.gelijk}-{t.verlies}</div><div className="stat-pill-label">W-G-V</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{t.voor}–{t.tegen}</div><div className="stat-pill-label">Doelpunten</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{t.gespeeld}</div><div className="stat-pill-label">Gespeeld</div></div>
        </div>
      </div>
      <div className="kaart">
        <div className="kaart-titel" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span><i className="fa-solid fa-user"/> Spelers</span>
          {filter.alleTeams && magRol("selectie") && (
            <button className="knop lijn klein" onClick={function () { setKoppelOpen(true); }}><i className="fa-solid fa-link"/> Spelers koppelen</button>
          )}
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="stand-tabel">
            <thead><tr><th className="links">Speler</th><th>W</th><th>Min</th><th>G</th><th>A</th><th>Geel</th><th>Rood</th></tr></thead>
            <tbody>
              {rijen.map(function (r) {
                return (
                  <tr key={r.persoonId}>
                    <td className="links naam">{r.naam}
                      {filter.alleTeams && <div style={{fontSize:10,color:"var(--grijs-donker)",fontWeight:400}}>{r.teams.map(teamNaamOpId).join(" + ")}</div>}
                    </td>
                    <td>{streep(r, r.wedstrijden)}</td>
                    <td>{r.minuten === 0 && r.minutenOnbekend > 0 ? "—" : streep(r, r.minuten) + (r.minutenOnbekend > 0 ? "+" : "")}</td>
                    <td>{r.doelpunten}</td><td>{r.assists}</td><td>{r.geel}</td><td>{r.rood}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"8px 0 0"}}>W = wedstrijden, G = doelpunten, A = assists. — = niet bijgehouden. Een + achter de minuten: in sommige wedstrijden zijn de minuten onbekend.</p>
      </div>
    </div>
  );
}

/* ── Spelers koppelen over teams ──
   Nooit automatisch: voorstellen alleen bij gelijke naam én
   geboortedatum, en de gebruiker bevestigt. Daarnaast met de hand: een
   speler uit het ene en een uit het andere team kiezen. De koppeling
   (persoonId) komt bij die spelers in álle seizoenen van hun team. */
function KoppelScherm({ onSluiten }) {
  const [, ververs] = useState(0);
  const alle = teams();
  const perTeam = {};
  alle.forEach(function (t) { var s = seizoenNu(t.id); perTeam[t.id] = s ? leesVolle(t.id, s, SPELERS_KEY) : []; });
  const [a, setA] = useState(""), [b, setB] = useState("");
  function opties() {
    var uit = [];
    alle.forEach(function (t) { perTeam[t.id].forEach(function (sp) { uit.push({ waarde: t.id + "|" + sp.id, label: sp.naam + " — " + t.naam, teamId: t.id, sp: sp }); }); });
    return uit;
  }
  /* persoonId zetten in elk seizoen van dit team waar deze speler staat */
  function schrijf(teamIdX, spelerId, persoonId) {
    seizoenenVan(teamIdX).forEach(function (s) {
      var lijst = leesVolle(teamIdX, s, SPELERS_KEY);
      if (!lijst.some(function (x) { return x.id === spelerId; })) return;
      schrijfVolle("tt_" + teamIdX + "__" + s + "::" + SPELERS_KEY, lijst.map(function (x) {
        if (x.id !== spelerId) return x;
        var y = Object.assign({}, x);
        if (persoonId) y.persoonId = persoonId; else delete y.persoonId;
        return y;
      }));
    });
  }
  function koppel(ta, ida, tb, idb) {
    var spA = perTeam[ta].filter(function (x) { return x.id === ida; })[0];
    var p = persoonVan(spA, ta);
    schrijf(ta, ida, p); schrijf(tb, idb, p);
    meldGoed("Gekoppeld"); ververs(function (n) { return n + 1; });
  }
  var voorstellen = [];
  for (var i = 0; i < alle.length; i++) for (var j = i + 1; j < alle.length; j++) {
    koppelVoorstellen({ teamId: alle[i].id, spelers: perTeam[alle[i].id] }, { teamId: alle[j].id, spelers: perTeam[alle[j].id] })
      .forEach(function (v) {
        var sa = perTeam[alle[i].id].filter(function (x) { return x.id === v.a; })[0];
        var sb = perTeam[alle[j].id].filter(function (x) { return x.id === v.b; })[0];
        if (persoonVan(sa, alle[i].id) !== persoonVan(sb, alle[j].id)) voorstellen.push({ ta: alle[i].id, sa: sa, tb: alle[j].id, sb: sb });
      });
  }
  var gekoppeld = [];
  var groepen = {};
  alle.forEach(function (t) { perTeam[t.id].forEach(function (sp) { if (sp.persoonId) { (groepen[sp.persoonId] = groepen[sp.persoonId] || []).push({ t: t, sp: sp }); } }); });
  Object.keys(groepen).forEach(function (k) { if (groepen[k].length > 1) gekoppeld.push(groepen[k]); });
  var lijst = opties();
  return (
    <div>
      <div className="kaart">
        <div className="kaart-titel" style={{display:"flex",justifyContent:"space-between"}}>
          <span><i className="fa-solid fa-link"/> Spelers koppelen</span>
          <button className="knop lijn klein" onClick={onSluiten}>Klaar</button>
        </div>
        <p style={{fontSize:12,color:"var(--grijs-donker)",lineHeight:1.5}}>
          Speelt iemand nu in een ander team van de club dan eerder? Koppel de twee, dan tellen zijn cijfers als één persoon.
          Er wordt nooit iets automatisch gekoppeld.
        </p>
        {voorstellen.length > 0 && <div className="formulier-label" style={{marginTop:6}}>Voorstellen (zelfde naam en geboortedatum)</div>}
        {voorstellen.map(function (v, n) {
          return (
            <div key={n} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:"1px solid var(--grijs)"}}>
              <span style={{flex:1,fontSize:13}}>{v.sa.naam}: {teamNaamOpId(v.ta)} + {teamNaamOpId(v.tb)}</span>
              <button className="knop klein" onClick={function () { koppel(v.ta, v.sa.id, v.tb, v.sb.id); }}>Koppelen</button>
            </div>
          );
        })}
        <div className="formulier-label" style={{marginTop:10}}>Met de hand</div>
        <select className="formulier-input" value={a} onChange={function (e) { setA(e.target.value); }}>
          <option value="">Speler…</option>
          {lijst.map(function (o) { return <option key={o.waarde} value={o.waarde}>{o.label}</option>; })}
        </select>
        <select className="formulier-input" value={b} onChange={function (e) { setB(e.target.value); }}>
          <option value="">is dezelfde persoon als…</option>
          {lijst.filter(function (o) { return a && o.teamId !== a.split("|")[0]; }).map(function (o) { return <option key={o.waarde} value={o.waarde}>{o.label}</option>; })}
        </select>
        <button className="knop" disabled={!a || !b} onClick={function () {
          var A = lijst.filter(function (o) { return o.waarde === a; })[0], B = lijst.filter(function (o) { return o.waarde === b; })[0];
          koppel(A.teamId, A.sp.id, B.teamId, B.sp.id); setA(""); setB("");
        }}>Koppelen</button>
      </div>
      {gekoppeld.length > 0 && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-people-arrows"/> Gekoppeld</div>
          {gekoppeld.map(function (g, n) {
            return (
              <div key={n} style={{padding:"6px 0",borderBottom:"1px solid var(--grijs)",fontSize:13}}>
                {g.map(function (x) { return x.sp.naam + " (" + x.t.naam + ")"; }).join(" = ")}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                  {g.map(function (x) {
                    return <button key={x.t.id} className="knop lijn klein" onClick={function () {
                      schrijf(x.t.id, x.sp.id, null); meldGoed("Ontkoppeld"); ververs(function (k) { return k + 1; });
                    }}>Ontkoppel {x.t.naam}</button>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
