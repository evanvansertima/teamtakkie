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
