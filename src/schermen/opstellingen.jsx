/* ══════════════════════════════════════════════════════════════
   OPSTELLINGEN/TEKENBORD — opstellingenveld, tactiekbord en het
   tekenbord dat ook trainingen en wedstrijden gebruiken
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P4 stap 7
   van docs/p4-stappenplan.md — "risico: hoog, de meeste uitgaande
   afhankelijkheden van alle acht"). Geen import/export: tools/bouw.js
   plakt dit bestand (SCHERM_VOLGORDE) na gedeeld.jsx, onboarding.jsx,
   instellingen.jsx, statistieken.jsx, trainingen.jsx, spelers.jsx en
   clubhuis.jsx, en vóór src/app.jsx aan elkaar, dus alles hieronder is
   nog altijd gewoon top-level function/const in dezelfde scope als
   src/app.jsx. Dit is een verhuizing, geen herschrijving: dezelfde
   tekst, dezelfde comments.

   DE 11 MET NAAM GENOEMDE COMPONENTEN
   VeldAchtergrond, TenueStrook, SpelerCircle, VeldZoomKnoppen,
   OpstellingVeld, OpstellingenTab, TactiekTekenBord, TactiekenTab,
   VeldIcoon, FrameMiniatuur, TrainingTekenBord.

   VIER UITGAANDE AFHANKELIJKHEDEN (drie met naam genoemd, één
   gevonden bij het narekenen)
   1. TenueStrook wordt alleen gebruikt door WedstrijdOpstelling
      (blijft in src/app.jsx, module wedstrijden, stap 8).
   2. VeldZoomKnoppen wordt zowel hier (OpstellingenTab) als door
      WedstrijdOpstelling gebruikt.
   3. TrainingTekenBord — de daadwerkelijke tekentool — wordt door
      drie andere plekken gebruikt: WedstrijdTactiek (blijft in
      src/app.jsx), TactiekTekenBord hieronder, en driemaal door
      src/schermen/trainingen.jsx (OnderdeelFormulier, OefeningDetail,
      TrainingDetail — vier JSX-aanroepen daar).
   4. Nieuw gevonden bij het narekenen, niet met naam genoemd in het
      stappenplan: OpstellingVeld wordt naast het gebruik hier (in
      OpstellingenTab) ook rechtstreeks aangeroepen door drie
      wedstrijden-componenten: WedstrijdOpstelling, WedstrijdTactiek
      en TegenstanderSectie (alle drie blijven in src/app.jsx).
   Alle vier werken via gedeelde scope (hoisting) — geen aanpassing
   nodig, zie §3 van het stappenplan voor de uitleg waarom
   bestandsvolgorde hier geen technisch verschil maakt.

   SELECTIEPAGINA ROEPT DIT BESTAND AAN (de tegenhanger van stap 5)
   SelectiePagina (sinds stap 5 in src/schermen/spelers.jsx) rendert
   zelf de tabs Opstellingen/Tactieken via OpstellingenTab/TactiekenTab
   hieronder. Werkt via gedeelde scope: spelers.jsx laadt vóór dit
   bestand, maar function-declaraties hoisten, dus de aanroep vanuit
   een eerder geladen bestand naar een later geladen bestand is hier
   geen probleem — precies zoals spelers.jsx's eigen bestandskop al
   aankondigde.

   VEEL MEER MEEVERHUISD DAN DIE 11 NAMEN
   Tussen en rond die 11 componenten stond ~2.750 regels exclusief-door-
   opstellingen-gebruikte hulpcode, niet met naam genoemd in het
   stappenplan (zelfde patroon als bij eerdere stappen — zie §2 van het
   stappenplan): het poppetje-gereedschap is hier NIET meegekomen (zie
   hieronder), maar wel: de zoom-instellingen voor het veld
   (VELD_ZOOM_MIN/MAX/STAP, veldZoomNu, zetVeldZoom); het hele
   tekenbord-tekengereedschap (LIJN_TOOLS, schermFactor, EXPORT_FACTOR,
   scherpCanvas, VELD_TYPEN, VAK_RASTER, tekenVeld, pijl, tekenlijn,
   notitieOpmaak, draaibaar, draaiAfstand, tekenelement, BORD_SOORTEN,
   MATERIAAL, isMateriaal, materiaalInfo, ZONE_KLEUREN, ZONE_VORMEN,
   zoneVormInfo, zoneKleurInfo, isZone, afstandTotLijn,
   PERSPECTIEF_STANDEN, perspectiefInfo, projecteerPerspectief,
   tussenStand); en het hele export-gereedschap van het tekenbord
   (kiesVideoFormaat, bewaarBestand, deelOfDownload, tekenVideoKop,
   exporteerAnimatieVideo, maakStappenStrook, TYPE_PDF_KLEUR,
   exporteerTrainingPDF, maakTekeningCanvas). Alles hierboven
   geverifieerd met grep: nul treffers in de zes al-verplaatste
   schermmodules, op drie genoemde uitzonderingen na:
   - deelOfDownload wordt ook gebruikt door clubhuis.jsx (al verplaatst
     stap 6) en door de wedstrijden-zone in src/app.jsx — een generieke
     "deel of download"-helper, niet eerder met naam genoemd.
   - exporteerTrainingPDF wordt uitsluitend van buitenaf aangeroepen,
     door trainingen.jsx (al verplaatst stap 4). Blijft toch hier: hij
     leunt zwaar op de tekenbord-interne hulpfuncties hierboven
     (TYPE_PDF_KLEUR, maakTekeningCanvas, VELD_TYPEN, tekenVeld/
     tekenlijn/tekenelement) — zelfde soort situatie als
     TrainingTekenBord zelf.
   - maakTekeningCanvas wordt ook gebruikt door de wedstrijden-zone in
     src/app.jsx, naast intern gebruik hier.

   WAT HIER BEWUST NIET IS MEEGEKOMEN
   Drie stukken stonden fysiek middenin dit bereik, maar worden
   uitsluitend door een al eerder verplaatste module gebruikt (gevonden
   bij het narekenen, elk had al een eigen "blijft hier staan tot een
   latere stap"-comment van de stap die ze achterliet):
   1. POP_HUID, POP_HAAR, POP_VLAK, POP_KAPSEL, popGetal(), popDonker()
      — het poppetje-tekengereedschap, uitsluitend gebruikt door
      SpelerPop in src/schermen/gedeeld.jsx (stap 0). Nu daarheen
      verplaatst, vlak vóór SpelerPop zelf.
   2. tenueTeller — de teller voor unieke SVG-id's, uitsluitend
      gebruikt door TenueBeeld in src/schermen/gedeeld.jsx (stap 0).
      Nu daarheen verplaatst, vlak vóór TenueBeeld zelf.
   3. BENEN en beenInfo() — uitsluitend gebruikt door SpelerFormulier/
      SpelerProfiel/SpelersLijst in src/schermen/spelers.jsx (stap 5).
      Nu daarheen verplaatst, aan het eind van dat bestand naast
      VoetIcoon (dat om dezelfde reden bij stap 5 al verhuisde).
   Ook nagerekend en NIET verplaatst, hoort hier niet bij: tenueVoor(),
   tenueVulling() en tenueVanWedstrijd() staan fysiek vóór dit bereik in
   src/app.jsx en worden zowel hier (TenueStrook, SpelerCircle,
   OpstellingenTab) als door nog-niet-verplaatste wedstrijden-code
   gebruikt — al gedocumenteerd bij clubhuis.jsx als een latere stap;
   blijven onaangeroerd in src/app.jsx.
   Direct ná TrainingTekenBord (vanaf de kop "COMPACTE SPELERSTATUS" in
   src/app.jsx) begint een ander, niet bij opstellingen horend blok
   (exporteerPresentiePDF, hexNaarRgb, vandaagISO, ACTIE_CATEGORIEEN,
   ALLE_ACTIES, getActieInfo, VELD_ZONES) dat exclusief door
   statistieken.jsx (LiveAnalyse, al verplaatst stap 3) wordt gebruikt
   en daar bij stap 3 gemist is — dit is een achterstand van stap 3,
   geen onderdeel van stap 7, en blijft daarom bewust onaangeroerd in
   src/app.jsx voor een latere opruimronde.

   TESTAANPASSING BIJ DEZE STAP
   Zie de aantekening in tests/ — bepaald bij het narekenen van alle
   zeven testbestanden op functienamen/regelnummers uit deze module.

   VANGNET
   "selectie-opstellingen", "selectie-tactieken" en
   "selectie-tactieken-tekenbord" (alle drie nieuw op 17 september) in
   tools/gouden-origineel.js bewaken deze module rechtstreeks.
   "wedstrijd-tactiek", "wedstrijd-tactiek-tekenbord" en
   "trainingen-oefeningen" bewaken andere modules maar oefenen wél de
   export van déze module uit (TrainingTekenBord via WedstrijdTactiek
   resp. de oefeningenbibliotheek) — een fout die daar rood wordt na
   een wijziging hier, wijst naar precies dit soort gedeelde component.
   Verwachting van deze verplaatsing: alle 31 opnames identiek.

   Zie docs/p4-stappenplan.md §1 (stap 7) en §3 voor de volledige
   redenering. */

/* ═══════════════════════════════════════════════════════════
   VELD ACHTERGROND (SVG)
═══════════════════════════════════════════════════════════ */
function VeldAchtergrond() {
  return (
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}
      viewBox="0 0 200 300" preserveAspectRatio="xMidYMid meet">
      {/* Buitenrand */}
      <rect x="10" y="8" width="180" height="284" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8"/>
      {(function(){
        /* Zelfde maten als de PDF en de WhatsApp-afbeelding */
        var v = veldMaten(10, 8, 180, 284);
        var lijn = "rgba(255,255,255,0.45)";
        var pnt = function(p){ return p.map(function(q){ return q[0].toFixed(2)+","+q[1].toFixed(2); }).join(" "); };
        return (
          <g fill="none" stroke={lijn} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1={v.L} y1={v.midY} x2={v.R} y2={v.midY} stroke="rgba(255,255,255,0.5)" strokeWidth="1.8"/>
            <ellipse cx={v.mid} cy={v.midY} rx={v.cirkelRx} ry={v.cirkelRy}
              stroke="rgba(255,255,255,0.5)" strokeWidth="1.8"/>
            <circle cx={v.mid} cy={v.midY} r="2.5" fill="rgba(255,255,255,0.6)" stroke="none"/>
            <rect x={v.mid-v.zestienB/2} y={v.T} width={v.zestienB} height={v.zestienD}/>
            <rect x={v.mid-v.vijfB/2}    y={v.T} width={v.vijfB}    height={v.vijfD}/>
            <rect x={v.mid-v.zestienB/2} y={v.O-v.zestienD} width={v.zestienB} height={v.zestienD}/>
            <rect x={v.mid-v.vijfB/2}    y={v.O-v.vijfD}    width={v.vijfB}    height={v.vijfD}/>
            <rect x={v.mid-v.doelB/2} y={v.T-7} width={v.doelB} height="7"
              stroke="rgba(255,255,255,0.7)" strokeWidth="2.2"/>
            <rect x={v.mid-v.doelB/2} y={v.O}   width={v.doelB} height="7"
              stroke="rgba(255,255,255,0.7)" strokeWidth="2.2"/>
            <circle cx={v.mid} cy={v.T+v.stipD} r="2.5" fill="rgba(255,255,255,0.55)" stroke="none"/>
            <circle cx={v.mid} cy={v.O-v.stipD} r="2.5" fill="rgba(255,255,255,0.55)" stroke="none"/>
            <polyline points={pnt(veldBoogPunten(v, false))}/>
            <polyline points={pnt(veldBoogPunten(v, true))}/>
            <g strokeWidth="1.5" stroke="rgba(255,255,255,0.4)">
              <polyline points={pnt(veldHoekPunten(v, false, false))}/>
              <polyline points={pnt(veldHoekPunten(v, true,  false))}/>
              <polyline points={pnt(veldHoekPunten(v, false, true))}/>
              <polyline points={pnt(veldHoekPunten(v, true,  true))}/>
            </g>
          </g>
        );
      })()}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPELER CIRCLE OP HET VELD
═══════════════════════════════════════════════════════════ */
/* Het tenue dat je deze wedstrijd aanhebt, klein naast het veld. Zo
   zie je in één oogopslag of je in het blauw of in het wit staat. */
function TenueStrook({ tenue, keuze, opKeuze, breed }) {
  const t = tenue || STANDAARD_TENUE;
  return (
    <div className="tenue-strook">
      <div className="tenue-strook-beelden">
        <div>
          <TenueBeeld set={tenueVoor(t, keuze, false)} kant="voor" breed={breed || 54}
            schaduw={false}/>
          <div className="tenue-strook-label">Veld</div>
        </div>
        <div>
          <TenueBeeld set={tenueVoor(t, keuze, true)} kant="voor" breed={breed || 54}
            schaduw={false}/>
          <div className="tenue-strook-label">Keeper</div>
        </div>
      </div>
      {opKeuze && (
        <div className="tenue-strook-keuze">
          {TENUE_SOORTEN.filter(function(s){ return !s.keeper; }).map(function(s){
            return (
              <button key={s.id} className={"tenue-knopje" + (keuze === s.id ? " aan" : "")}
                onClick={function(){ opKeuze(s.id); }}>{s.kort}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}


function SpelerCircle({ positie, speler, onClick, tenue, aanvoerder }) {
  const heeftSpeler = speler && speler.naam;
  const isKeeper = positie.id==="GK";
  const shirt = tenue || STANDAARD_TENUE;
  /* Welk tenue er aan hangt is één keuze voor het hele team; de keeper
     krijgt daar automatisch het bijbehorende keeperstenue bij. */
  const set = tenueVoor(shirt, shirt.keuze || "thuis", isKeeper);
  const vulling = heeftSpeler ? tenueVulling(set) : "rgba(255,255,255,0.22)";
  const heeftInstructies = heeftSpeler && (speler.aanvalInstructie || speler.verdedigingInstructie);
  /* Het rugnummer staat nu als schildje op de bol, dus hier alleen de naam */
  const weergaveNaam = heeftSpeler ? speler.naam.split(" ")[0] : positie.l;
  return (
    <div
      onClick={onClick}
      style={{position:"absolute",left:positie.x+"%",top:positie.y+"%",transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",zIndex:2,WebkitTapHighlightColor:"transparent"}}>
      <div style={{position:"relative"}}>
        <div style={{
          width:44,height:44,borderRadius:"50%",
          background:vulling,
          border:"2.5px solid "+(heeftSpeler?"rgba(255,255,255,0.92)":"rgba(255,255,255,0.5)"),
          display:"flex",alignItems:"center",justifyContent:"center",
          overflow:"hidden",
          boxShadow:"0 2px 9px rgba(0,0,0,0.45)",
          fontFamily:"'Helvetica Neue',Arial,sans-serif",
        }}>
          {heeftSpeler
            ? <SpelerBeeld speler={speler} shirt={set.shirt} tenueSet={set} />
            : <span style={{fontSize:10,fontWeight:700,color:"white",opacity:.85,fontFamily:"'Helvetica Neue',Arial"}}>{positie.l}</span>
          }
        </div>
        {/* Een gast is geleend voor deze wedstrijd; dat moet je zien */}
        {heeftSpeler && speler.gast && (
          <div className="sc-gast" title={"Gastspeler"+(speler.vanTeam?" uit "+speler.vanTeam:"")}>G</div>
        )}
        {/* Rugnummer als klein schildje, want het poppetje neemt de bol nu in beslag */}
        {heeftSpeler && speler.rugnummer && (
          <div style={{position:"absolute",bottom:-2,left:-3,minWidth:16,height:16,padding:"0 3px",
            borderRadius:8,background:set.shirt,
            border:"1.5px solid rgba(255,255,255,.92)",color:set.tekst,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:9,fontWeight:800,lineHeight:1,fontFamily:"'Helvetica Neue',Arial",
            boxShadow:"0 1px 3px rgba(0,0,0,.4)"}}>{speler.rugnummer}</div>
        )}
        {aanvoerder && <span className="band-c" title="Aanvoerder">C</span>}
        {heeftInstructies&&(
          <div style={{position:"absolute",top:-3,right:-3,width:13,height:13,borderRadius:"50%",background:"var(--oranje)",border:"1.5px solid white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"white",fontWeight:900,lineHeight:1}}>!</div>
        )}
      </div>
      <div style={{
        fontSize:8,fontWeight:700,color:"white",marginTop:2,
        textShadow:"0 1px 3px rgba(0,0,0,0.9)",
        fontFamily:"'Helvetica Neue',Arial",
        background:"rgba(0,0,0,0.42)",borderRadius:3,
        padding:"1px 4px",lineHeight:1.4,
        maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"
      }}>
        {weergaveNaam}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OPSTELLING VELD
═══════════════════════════════════════════════════════════ */
const VELD_ZOOM_MIN = 60, VELD_ZOOM_MAX = 150, VELD_ZOOM_STAP = 10;
function veldZoomNu() {
  var z = Number(inst().veldZoom);
  return isNaN(z) ? 100 : Math.max(VELD_ZOOM_MIN, Math.min(VELD_ZOOM_MAX, z));
}
function zetVeldZoom(z) {
  zetInstellingen({veldZoom: Math.max(VELD_ZOOM_MIN, Math.min(VELD_ZOOM_MAX, Math.round(z)))});
}
/* Knoppen om het veld groter en kleiner te maken. De keuze zit in de
   instellingen, dus hij blijft staan — ook als je de app sluit. */
function VeldZoomKnoppen() {
  const i = gebruikInstellingen();
  const z = veldZoomNu();
  return (
    <div className="veld-zoom">
      <button className="veld-zoomknop" title="Kleiner" disabled={z<=VELD_ZOOM_MIN}
        onClick={function(){ zetVeldZoom(z - VELD_ZOOM_STAP); }}>
        <i className="fa-solid fa-magnifying-glass-minus"/>
      </button>
      <button className="veld-zoomgetal" title="Terug naar honderd procent"
        onClick={function(){ zetVeldZoom(100); }}>{z}%</button>
      <button className="veld-zoomknop" title="Groter" disabled={z>=VELD_ZOOM_MAX}
        onClick={function(){ zetVeldZoom(z + VELD_ZOOM_STAP); }}>
        <i className="fa-solid fa-magnifying-glass-plus"/>
      </button>
    </div>
  );
}

function OpstellingVeld({ formatie, toewijzing, onKlikPositie, tenue, aanvoerderId, zoom }) {
  const posities = FORMATIES_DATA[formatie] || FORMATIES_DATA["4-3-3A"];
  const i = gebruikInstellingen();
  const factor = (zoom === false) ? 100 : veldZoomNu();
  return (
    <div className="opstel-veld" style={factor===100 ? undefined : {"--veld-zoom": factor/100}}>
      <div style={{position:"absolute",inset:0,borderRadius:14,overflow:"hidden",pointerEvents:"none"}}>
        {[0,1,2,3,4,5].map(i=>(
          <div key={i} style={{position:"absolute",left:0,right:0,top:i*(100/6)+"%",height:(100/6)+"%",background:i%2===0?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.02)"}}/>
        ))}
      </div>
      <VeldAchtergrond />
      {posities.map(pos => (
        <SpelerCircle
          key={pos.id}
          positie={pos}
          speler={toewijzing[pos.id]}
          tenue={tenue}
          aanvoerder={!!aanvoerderId && toewijzing[pos.id] && toewijzing[pos.id].id===aanvoerderId}
          onClick={() => onKlikPositie && onKlikPositie(pos)}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OPSTELLINGEN TAB
═══════════════════════════════════════════════════════════ */
function OpstellingenTab({ spelers }) {
  const [actief, setActief] = useState("4-3-3A");
  const [toewijzing, setToewijzing] = useState({});
  const [kiesPositie, setKiesPositie] = useState(null);
  const [detailPositie, setDetailPositie] = useState(null);
  const [instrAanval, setInstrAanval] = useState("");
  const [instrVerdediging, setInstrVerdediging] = useState("");
  const [opgeslagen, setOpgeslagen] = useState(() => laadJson(FORMATIES_KEY));
  const [bewaarOpen, setBewaarOpen] = useState(false);
  const [bewaarNaam, setBewaarNaam] = useState("");
  const [formatieMenuOpen, setFormatieMenuOpen] = useState(false);
  const [tenue, setTenue] = useState(laadTenue);
  const [tenueOpen, setTenueOpen] = useState(false);

  useEffect(() => { slaJson(FORMATIES_KEY, opgeslagen); }, [opgeslagen]);
  useEffect(() => { slaTenueOp(tenue); }, [tenue]);

  /* Alles wat het tenue verandert gaat door tenueVernieuw, zodat de
     losse velden nooit uit de pas gaan lopen met de vijf sets. */
  function zetTenue(k,v) {
    setTenue(function(t){ var n=Object.assign({},t); n[k]=v; return tenueVernieuw(n); });
  }

  function handlePositieKlik(pos) {
    const sp = toewijzing[pos.id];
    if (sp && sp.naam) {
      setDetailPositie(pos);
      setInstrAanval(sp.aanvalInstructie || "");
      setInstrVerdediging(sp.verdedigingInstructie || "");
    } else {
      setKiesPositie(pos);
    }
  }

  function slaInstructiesOp() {
    setToewijzing(prev => ({
      ...prev,
      [detailPositie.id]: {
        ...prev[detailPositie.id],
        aanvalInstructie: instrAanval,
        verdedigingInstructie: instrVerdediging
      }
    }));
    setDetailPositie(null);
  }

  function wijsSpelerToe(speler) {
    setToewijzing(prev => ({...prev, [kiesPositie.id]: {...speler, spelerId: speler.id}}));
    setKiesPositie(null);
  }

  function verwijderVanPositie(positieId) {
    setToewijzing(prev => { const n={...prev}; delete n[positieId]; return n; });
    setKiesPositie(null);
    setDetailPositie(null);
  }

  function bewaarFormatie() {
    const nm = bewaarNaam.trim() || (actief + " Opstelling");
    const nieuw = {id:Date.now(), naam:nm, formatie:actief, toewijzing};
    setOpgeslagen(prev => [...prev, nieuw]);
    setBewaarOpen(false);
    setBewaarNaam("");
  }

  function laadFormatie(f) {
    setActief(f.formatie);
    setToewijzing(f.toewijzing||{});
  }

  function verwijderFormatie(id) {
    const weg = opgeslagen.find(function(f){return f.id===id;});
    if (weg) toon("Opstelling \u201c"+(weg.naam||weg.formatie)+"\u201d verwijderd", {
      actie: function(){ setOpgeslagen(function(l){ return l.concat([weg]); }); }
    });
    setOpgeslagen(prev => prev.filter(f=>f.id!==id));
  }

  const toegewezenIds = Object.values(toewijzing).filter(Boolean).map(s => s.id||s.spelerId);
  const aantalIngesteld = Object.values(toewijzing).filter(Boolean).length;

  return (
    <div>
      <button className="formatie-keuze-knop" onClick={function(){setFormatieMenuOpen(true);}}>
        <span className="formatie-keuze-naam">{"⚽ "+actief}</span>
        <span className="formatie-keuze-hint">{"Wijzig ▼"}</span>
      </button>

      {formatieMenuOpen && (
        <div className="formatie-overlay" onClick={function(){setFormatieMenuOpen(false);}}>
          <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="formatie-sheet-header">
              <span className="formatie-sheet-titel">Kies formatie</span>
              <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}} onClick={function(){setFormatieMenuOpen(false);}}>{"✕"}</button>
            </div>
            {FORMATIE_GROEPEN.map(function(groep){
              return (
                <div key={groep.label}>
                  <div className="formatie-groep-label">{groep.label}</div>
                  <div className="formatie-groep-grid">
                    {groep.namen.map(function(naam){
                      return (
                        <button key={naam} className={"formatie-chip"+(actief===naam?" actief":"")}
                          onClick={function(){setActief(naam);setToewijzing({});setFormatieMenuOpen(false);}}>
                          {naam}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{marginBottom:8,fontSize:13,color:"var(--grijs-donker)",fontWeight:400,textAlign:"center"}}>
        Tik op een positie om een speler toe te wijzen · {aantalIngesteld}/11 ingevuld
      </div>

      <VeldZoomKnoppen />
      <OpstellingVeld formatie={actief} toewijzing={toewijzing} onKlikPositie={handlePositieKlik} tenue={tenue} />

      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
        <button className="knop lijn klein" style={{flex:1,justifyContent:"center"}} onClick={() => setToewijzing({})}>
          <i className="fa-solid fa-rotate-left"/> Leegmaken
        </button>
        <button className="knop klein" style={{flex:2,justifyContent:"center"}} onClick={() => setBewaarOpen(true)}>
          <i className="fa-solid fa-floppy-disk"/> Opslaan
        </button>
        <button className="knop klein pdf-knop" style={{flex:1,justifyContent:"center"}}
          onClick={() => exporteerOpstellingPDF(bewaarNaam||actief, actief, toewijzing)}>
          <i className="fa-solid fa-file-pdf"/> PDF
        </button>
        <button className="knop klein" style={{flex:1,justifyContent:"center",background:"#25d366",color:"white"}}
          onClick={() => deelOpstellingWhatsApp(bewaarNaam||actief, actief, toewijzing)}>
          <i className="fa-brands fa-whatsapp"/> WhatsApp
        </button>
      </div>

      <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
        <button className="knop klein" style={{flex:2,justifyContent:"center",background:"var(--blauw-licht)"}}
          onClick={function(){ deelTekeningAlsPNG(maakOpstellingCanvas(bewaarNaam||actief, actief, toewijzing, tenue), (bewaarNaam||actief)+" opstelling"); }}>
          <i className="fa-solid fa-image"/> Deel als afbeelding
        </button>
        <button className="knop lijn klein" style={{flex:1,justifyContent:"center"}}
          onClick={function(){setTenueOpen(true);}}>
          <i className="fa-solid fa-shirt"/> Tenue
        </button>
      </div>

      {tenueOpen && (
        <div className="formatie-overlay" onClick={function(e){if(e.target===e.currentTarget)setTenueOpen(false);}}>
          <div className="formatie-sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="formatie-sheet-header">
              <span className="formatie-sheet-titel">Tenue</span>
              <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
                onClick={function(){setTenueOpen(false);}}>{"✕"}</button>
            </div>

            <div className="kaart" style={{marginTop:4}}>
              <div className="kaart-titel"><i className="fa-solid fa-shirt"/> Wat trekken we aan?</div>
              <div className="tenue-podium">
                {TENUE_SOORTEN.filter(function(s){ return !s.keeper; }).map(function(s){
                  var aan = (tenue.keuze || "thuis") === s.id;
                  return (
                    <div key={s.id} onClick={function(){ zetTenue("keuze", s.id); }}
                      style={{cursor:"pointer", opacity:aan?1:0.45,
                              transform:aan?"scale(1.06)":"none", transition:"all .18s"}}>
                      <TenueBeeld set={tenueSet(tenue, s.id)} kant="voor" breed={80}/>
                      <div className="tenue-kant" style={{color:aan?"var(--blauw)":"#5a6472"}}>{s.kort}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:12,
                           paddingTop:12,borderTop:"1px solid var(--grijs)"}}>
                <div style={{textAlign:"center"}}>
                  <TenueBeeld set={tenueVoor(tenue, tenue.keuze || "thuis", true)} kant="voor" breed={62}/>
                  <div className="tenue-kant">De keeper hierbij</div>
                </div>
              </div>
            </div>

            <div style={{textAlign:"center",fontSize:11,color:"var(--grijs-donker)",padding:"4px 12px 12px",lineHeight:1.6}}>
              De kleuren zelf ontwerp je in het Clubhuis, bij de tenue-ontwerper.
              Wat je hier kiest zie je op het veld en in de gedeelde afbeelding.
            </div>
          </div>
        </div>
      )}

      {opgeslagen.length>0&&(
        <div className="kaart" style={{marginTop:14}}>
          <div className="kaart-titel"><i className="fa-solid fa-floppy-disk"/> Opgeslagen opstellingen ({opgeslagen.length})</div>
          {opgeslagen.map(f => {
            const aantalSpelers = Object.values(f.toewijzing||{}).filter(Boolean).length;
            return (
              <div key={f.id} className="opgeslagen-formatie">
                <div style={{width:38,height:38,borderRadius:8,background:"var(--blauw)",color:"var(--op-kleur)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",flexShrink:0}}>{f.formatie}</div>
                <div style={{flex:1}} onClick={() => laadFormatie(f)}>
                  <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:14}}>{f.naam}</div>
                  <div style={{fontSize:11,color:"var(--grijs-donker)"}}>
                    {f.formatie} · {aantalSpelers} spelers ingesteld
                  </div>
                </div>
                <button className="knop lijn klein" style={{padding:"5px 8px"}} onClick={() => laadFormatie(f)}>Laden</button>
                <button className="knop gevaar klein" style={{padding:"5px 8px"}} onClick={() => verwijderFormatie(f.id)}><i className="fa-solid fa-trash"/></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Speler kiezen modal */}
      {kiesPositie&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setKiesPositie(null);}}>
          <div className="modal-sheet">
            <div className="modal-greep"/>
            <div className="modal-titel">Speler voor {kiesPositie.l}</div>
            {toewijzing[kiesPositie.id]&&(
              <button className="knop gevaar klein" style={{width:"100%",justifyContent:"center",marginBottom:12}}
                onClick={() => verwijderVanPositie(kiesPositie.id)}>
                <i className="fa-solid fa-xmark"/> Speler van positie halen
              </button>
            )}
            {spelers.length===0&&<p style={{fontSize:13,color:"var(--grijs-donker)",textAlign:"center",padding:"20px 0"}}>Voeg eerst spelers toe via Spelers.</p>}
            {spelers.map(s => {
              const isGeselecteerd = toewijzing[kiesPositie.id]&&(toewijzing[kiesPositie.id].id===s.id||toewijzing[kiesPositie.id].spelerId===s.id);
              const isElders = !isGeselecteerd && toegewezenIds.includes(s.id);
              return (
                <div key={s.id} className={"speler-keuze-rij"+(isGeselecteerd?" geselecteerd":"")} onClick={() => wijsSpelerToe(s)}>
                  <div className="speler-avatar" style={{width:36,height:36,fontSize:13}}>
                    {<SpelerBeeld speler={s}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:14}}>{s.naam}</div>
                    <div style={{fontSize:12,color:"var(--grijs-donker)"}}>{s.positie}{s.rugnummer?" · #"+s.rugnummer:""}</div>
                  </div>
                  {isGeselecteerd&&<span style={{fontSize:12,color:"var(--succes)",fontWeight:700}}><i className="fa-solid fa-check"/> Op veld</span>}
                  {isElders&&<span style={{fontSize:11,color:"var(--grijs-donker)"}}>Elders</span>}
                </div>
              );
            })}
            <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:16}} onClick={() => setKiesPositie(null)}>Sluiten</button>
          </div>
        </div>
      )}

      {/* Positie detail / instructies modal */}
      {detailPositie&&toewijzing[detailPositie.id]&&(()=>{
        const sp = toewijzing[detailPositie.id];
        return (
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setDetailPositie(null);}}>
            <div className="modal-sheet">
              <div className="modal-greep"/>
              {/* Speler banner */}
              <div style={{display:"flex",alignItems:"center",gap:12,background:"linear-gradient(135deg,var(--blauw),#0063cc)",borderRadius:12,padding:"14px 14px",marginBottom:16,color:"white"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.2)",border:"2px solid rgba(255,255,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",overflow:"hidden",flexShrink:0}}>
                  {<SpelerBeeld speler={sp}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:16,lineHeight:1.2}}>{sp.naam}</div>
                  <div style={{fontSize:12,opacity:.8,marginTop:2}}>
                    {sp.rugnummer?"#"+sp.rugnummer+" · ":""}Positie: {detailPositie.l}
                  </div>
                </div>
              </div>
              {/* Instructies */}
              <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,fontFamily:"'Helvetica Neue',Arial"}}>
                Spelerinstructies
              </div>
              <div className="formulier-groep">
                <label className="formulier-label" style={{color:"var(--succes)"}}><i className="fa-solid fa-bolt"/> A — Aanval</label>
                <textarea className="formulier-input" rows="2" value={instrAanval}
                  onChange={e=>setInstrAanval(e.target.value)}
                  placeholder="bijv. Als schaduw spits gaan spelen, hoog druk zetten…"
                  style={{resize:"vertical"}}/>
              </div>
              <div className="formulier-groep">
                <label className="formulier-label" style={{color:"var(--blauw)"}}><i className="fa-solid fa-shield"/> V — Verdediging</label>
                <textarea className="formulier-input" rows="2" value={instrVerdediging}
                  onChange={e=>setInstrVerdediging(e.target.value)}
                  placeholder="bijv. Kort dekken op de man, ruimte afdekken…"
                  style={{resize:"vertical"}}/>
              </div>
              {/* Acties */}
              <button className="knop succes" style={{width:"100%",justifyContent:"center",marginBottom:8}} onClick={slaInstructiesOp}>
                <i className="fa-solid fa-floppy-disk"/> Instructies opslaan
              </button>
              <div style={{display:"flex",gap:8}}>
                <button className="knop lijn klein" style={{flex:1,justifyContent:"center"}}
                  onClick={() => { setKiesPositie(detailPositie); setDetailPositie(null); }}>
                  <i className="fa-solid fa-rotate-left"/> Andere speler
                </button>
                <button className="knop gevaar klein" style={{flex:1,justifyContent:"center"}}
                  onClick={() => verwijderVanPositie(detailPositie.id)}>
                  <i className="fa-solid fa-xmark"/> Verwijderen
                </button>
              </div>
              <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:8}} onClick={()=>setDetailPositie(null)}>Sluiten</button>
            </div>
          </div>
        );
      })()}

      {/* Opslaan modal */}
      {bewaarOpen&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setBewaarOpen(false);}}>
          <div className="modal-sheet">
            <div className="modal-greep"/>
            <div className="modal-titel">Opstelling opslaan</div>
            <div className="formulier-groep">
              <label className="formulier-label">Naam opstelling</label>
              <input className="formulier-input" value={bewaarNaam} onChange={e=>setBewaarNaam(e.target.value)}
                placeholder={"bijv. Thuis "+actief+", Sterk elftal…"} />
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={() => setBewaarOpen(false)}>Annuleren</button>
              <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={bewaarFormatie}><i className="fa-solid fa-floppy-disk"/> Opslaan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TACTIEKEN TAB
═══════════════════════════════════════════════════════════ */
function TactiekTekenBord({ value, onOpslaan, naam }) {
  const [tekenData, setTekenData] = useState(value||{elems:[],lijnen:[]});
  return (
    <div>
      <TrainingTekenBord value={tekenData} onChange={setTekenData} pdfNaam={naam||"Tactiek"} />
      <button className="knop succes" style={{width:"100%",justifyContent:"center",marginTop:12}} onClick={() => onOpslaan(tekenData)}>
        <i className="fa-solid fa-floppy-disk"/> Tactiek opslaan
      </button>
    </div>
  );
}

function TactiekenTab() {
  const [tactieken, setTactieken] = useState(() => laadJson(TACTIEKEN_KEY));
  const [huidig, setHuidig] = useState(null);
  const [tekenOpen, setTekenOpen] = useState(false);
  const [naam, setNaam] = useState("");
  const [bevestig, setBevestig] = useState(null);

  useEffect(() => { slaJson(TACTIEKEN_KEY, tactieken); }, [tactieken]);

  function slaOp(tekening) {
    const nm = naam.trim() || ("Tactiek " + (tactieken.length+1));
    if (huidig && huidig.id) {
      setTactieken(prev => prev.map(t => t.id===huidig.id ? {...t, naam:nm, tekening} : t));
    } else {
      setTactieken(prev => [...prev, {id:Date.now(), naam:nm, tekening}]);
    }
    setTekenOpen(false);
    setHuidig(null);
    setNaam("");
  }

  function bewerkTactiek(t) {
    setHuidig(t);
    setNaam(t.naam);
    setTekenOpen(true);
  }

  if (tekenOpen) {
    return (
      <div className="pagina-slide">
        <button className="back-knop" onClick={() => { setTekenOpen(false); setHuidig(null); }}>
          <i className="fa-solid fa-arrow-left"/> Terug naar tactieken
        </button>
        <div className="formulier-groep" style={{marginBottom:12}}>
          <label className="formulier-label">Naam tactiek</label>
          <input className="formulier-input" value={naam} onChange={e=>setNaam(e.target.value)}
            placeholder="bijv. Standaard aanval, Pressing, Counter…" />
        </div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8,fontFamily:"'Helvetica Neue',Arial"}}>
          Tekentool
        </div>
        <TactiekTekenBord value={huidig?huidig.tekening:null} onOpslaan={slaOp} naam={naam||"Tactiek"} />
      </div>
    );
  }

  return (
    <div>
      <div className="pagina-header" style={{marginBottom:14}}>
        <div className="pagina-header-tekst">
          <h2 style={{fontSize:20,color:"var(--blauw)"}}>Tactieken</h2>
          <p style={{fontSize:12,color:"var(--grijs-donker)"}}>Teken en bewaar tactische plannen</p>
        </div>
        <button className="knop-plus" onClick={() => { setHuidig(null); setNaam(""); setTekenOpen(true); }}>+</button>
      </div>

      {tactieken.length===0&&(
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-chess"/></div>
          <h3>Nog geen tactieken</h3>
          <p>Teken een aanval, standaardsituatie of press-schema en sla het op.</p>
          <button className="knop" onClick={() => { setHuidig(null); setNaam(""); setTekenOpen(true); }}>+ Nieuwe tactiek</button>
        </div>
      )}

      {tactieken.map(t => {
        const aantalElems = (t.tekening?.elems||[]).length;
        const aantalLijnen = (t.tekening?.lijnen||[]).length;
        return (
          <div key={t.id} className="tactiek-kaart">
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:15,color:"var(--blauw)"}}>{t.naam}</div>
                <div style={{fontSize:12,color:"var(--grijs-donker)",marginTop:2}}>
                  {aantalElems>0||aantalLijnen>0
                    ? aantalElems+" elementen, "+aantalLijnen+" lijnen"
                    : "Lege tekening"}
                </div>
              </div>
              <button className="knop lijn klein" onClick={() => bewerkTactiek(t)}><i className="fa-solid fa-pen"/> Bewerken</button>
              <button className="knop klein pdf-knop" style={{padding:"6px 8px"}} onClick={() => exporteerTekeningPDF(t.naam, maakTekeningCanvas(t.tekening), t)}><i className="fa-solid fa-file-pdf"/> PDF</button>
              <button className="knop klein" style={{background:"#25d366",color:"white",padding:"6px 8px"}} onClick={() => deelTekeningAlsPNG(maakTekeningCanvas(t.tekening), t.naam)}><i className="fa-brands fa-whatsapp"/></button>
              <button className="knop gevaar klein" style={{padding:"6px 8px"}} onClick={() => setBevestig(t.id)}><i className="fa-solid fa-trash"/></button>
            </div>
          </div>
        );
      })}

      {bevestig&&(
        <div className="bevestig-overlay">
          <div className="bevestig-kaart">
            <h3>Tactiek verwijderen?</h3>
            <p>Deze tactiek wordt definitief verwijderd.</p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={() => setBevestig(null)}>Annuleren</button>
              <button className="knop gevaar" onClick={() => { setTactieken(prev=>prev.filter(t=>t.id!==bevestig)); setBevestig(null); }}>Verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRAINING TEKENBORD
═══════════════════════════════════════════════════════════ */
const LIJN_TOOLS = ["looplijn","passlijn","schietlijn","dribbellijn","voorzetlijn"];

/* ── SCHERPTE ──────────────────────────────────────────────
   Het veld wordt in "logische" eenheden getekend (580x370).
   Op het scherm wordt dat uitgerekt naar ~850 CSS-pixels en op een
   retina- of 4K-scherm nog eens maal 2 of 3. Tekenden we op ware
   grootte, dan zou je die vergroting als blokjes terugzien.
   Daarom tekenen we intern een veelvoud groter en verkleinen we
   pas bij het tonen. Ook PDF's, PNG's en filmpjes worden hier scherp van.
─────────────────────────────────────────────────────────── */
function schermFactor() {
  var dpr = (typeof window!=="undefined" && window.devicePixelRatio) || 1;
  return Math.min(4, Math.max(2, Math.ceil(dpr) + 1));
}
/* Vaste, hoge factor voor bestanden die je deelt of afdrukt */
const EXPORT_FACTOR = 4;

/* Maakt een canvas op ware grootte maal factor, met de tekenpen al
   omgerekend zodat alle tekencode gewoon in logische eenheden werkt. */
function scherpCanvas(breedte, hoogte, factor) {
  var f = factor || 1;
  var c = document.createElement("canvas");
  c.width = Math.round(breedte*f); c.height = Math.round(hoogte*f);
  var ctx = c.getContext("2d");
  ctx.setTransform(f,0,0,f,0,0);
  return {canvas:c, ctx:ctx, factor:f};
}

/* De naam staat er alleen nog als tooltip. Op de knop staat een
   tekeningetje van het veld zelf — zie VeldIcoon hieronder. */
const VELD_TYPEN = [
  {id:"heel-h",  l:"Heel veld, liggend",          w:580,h:370},
  {id:"heel-v",  l:"Heel veld, staand",           w:370,h:540},
  {id:"half-b",  l:"Speelhelft, doel bovenaan",   w:430,h:320},
  {id:"half-o",  l:"Speelhelft, doel onderaan",   w:430,h:320},
  {id:"stippel", l:"Vak met stippellijn",         w:580,h:370},
  {id:"leeg",    l:"Heel vak",                    w:580,h:370},
  {id:"vak-2",   l:"Twee vakken naast elkaar",    w:580,h:370},
  {id:"vak-3",   l:"Drie vakken naast elkaar",    w:580,h:370},
  {id:"vak-4",   l:"Vier vakken",                 w:580,h:370},
  /* Staan niet meer in het menu, maar tekeningen van voor deze versie
     gebruiken ze nog. Ze blijven dus gewoon tekenen. */
  {id:"half-l",  l:"Speelhelft, doel links",      w:320,h:430, verborgen:true},
  {id:"half-r",  l:"Speelhelft, doel rechts",     w:320,h:430, verborgen:true},
];

/* Hoe een kaal vak verdeeld wordt: kolommen bij rijen. */
const VAK_RASTER = {"vak-2":[2,1], "vak-3":[3,1], "vak-4":[2,2]};

/* ══ HET VELD ALS PICTOGRAM ══════════════════════════════════
   Op de knoppen stond tekst met pijltjes erin, van het soort dat je
   eerst moet lezen en dan nog moet ontcijferen — en zelfs dan wist je
   niet zeker welke kant je kreeg. Een trainer kent een veld aan zijn
   vorm: de middenstip, de zestien, de middellijn. Dus laat het veld
   zien in plaats van het te omschrijven.

   Getekend in de échte maten van dat veldtype, zodat een liggend veld
   ook liggend oogt en een halve helft ook half. Alleen de lijnen die
   het onderscheid maken: een kader, de middellijn, de cirkel en de
   zestienmetergebieden. Meer is op zestien pixels toch niet te zien.
   ══════════════════════════════════════════════════════════ */
function VeldIcoon({ type, maat }) {
  const info = VELD_TYPEN.filter(function (v) { return v.id === type; })[0] || VELD_TYPEN[0];
  const W = info.w, H = info.h;
  const m = maat || 26;
  const s = m / Math.max(W, H);
  const lijn = Math.max(0.9, 1.6 / s);      /* op het scherm even dik */
  const kort = Math.min(W, H);
  const d = [];
  const k = {fill:"none", stroke:"currentColor", strokeWidth:lijn};

  /* ── Kale vakken ──
     Een vak is een kader, eventueel met scheidingslijnen erin. Geen
     doel, geen cirkel: precies wat je op het veld met pionnen uitzet. */
  const vak = VAK_RASTER[type];
  if (type === "leeg" || type === "stippel" || vak) {
    const kol = vak ? vak[0] : 1, rij = vak ? vak[1] : 1;
    const kader = type === "stippel"
      ? Object.assign({}, k, {strokeDasharray: (kort*0.06) + " " + (kort*0.045)})
      : k;
    for (var ci = 1; ci < kol; ci++)
      d.push(<line key={"v"+ci} x1={W*ci/kol} y1={0} x2={W*ci/kol} y2={H} {...k}/>);
    for (var ri = 1; ri < rij; ri++)
      d.push(<line key={"h"+ri} x1={0} y1={H*ri/rij} x2={W} y2={H*ri/rij} {...k}/>);
    return (
      <svg viewBox={"0 0 " + W + " " + H} width={Math.round(W*s)} height={Math.round(H*s)}
        className="veld-icoon" aria-hidden="true">
        <rect x={lijn/2} y={lijn/2} width={W-lijn} height={H-lijn} rx={kort*0.04} {...kader}/>
        {d}
      </svg>
    );
  }

  /* Het zestienmetergebied aan een kant */
  function zestien(kant) {
    const dp = kort * 0.20;                 /* diepte */
    const br = kort * 0.52;                 /* breedte */
    if (kant === "links")  return <rect key="z-l" x={0}    y={(H-br)/2} width={dp} height={br} {...k}/>;
    if (kant === "rechts") return <rect key="z-r" x={W-dp} y={(H-br)/2} width={dp} height={br} {...k}/>;
    if (kant === "boven")  return <rect key="z-b" x={(W-br)/2} y={0}    width={br} height={dp} {...k}/>;
    return <rect key="z-o" x={(W-br)/2} y={H-dp} width={br} height={dp} {...k}/>;
  }

  if (type === "heel-h") {
    d.push(<line key="m" x1={W/2} y1={0} x2={W/2} y2={H} {...k}/>);
    d.push(<circle key="c" cx={W/2} cy={H/2} r={kort*0.17} {...k}/>);
    d.push(zestien("links"), zestien("rechts"));
  } else if (type === "heel-v") {
    d.push(<line key="m" x1={0} y1={H/2} x2={W} y2={H/2} {...k}/>);
    d.push(<circle key="c" cx={W/2} cy={H/2} r={kort*0.17} {...k}/>);
    d.push(zestien("boven"), zestien("onder"));
  } else {
    /* ── Een speelhelft ──
       Drie dingen maken duidelijk welke helft je krijgt: het doeltje
       buiten de lijn aan de kant waar gescoord wordt, de middellijn die
       een stuk naar binnen ligt in plaats van op de rand, en de halve
       middencirkel die er tegenaan bolt. Dat laatste is wat je op het
       plaatje meteen ziet: je kijkt net over de middellijn heen. */
    const kant = {"half-o":"onder", "half-b":"boven", "half-l":"links", "half-r":"rechts"}[type];
    if (!kant) return (
      <svg viewBox={"0 0 " + W + " " + H} width={Math.round(W*s)} height={Math.round(H*s)}
        className="veld-icoon" aria-hidden="true">
        <rect x={lijn/2} y={lijn/2} width={W-lijn} height={H-lijn} rx={kort*0.04} {...k}/>
      </svg>
    );
    d.push(zestien(kant));

    const dg = kort * 0.055;                 /* diepte van het doeltje */
    const bg = kort * 0.24;                  /* breedte van het doeltje */
    const dik = Object.assign({}, k, {strokeWidth: lijn * 1.4});
    if (kant === "onder")  d.push(<rect key="d" x={(W-bg)/2} y={H} width={bg} height={dg} {...dik}/>);
    if (kant === "boven")  d.push(<rect key="d" x={(W-bg)/2} y={-dg} width={bg} height={dg} {...dik}/>);
    if (kant === "links")  d.push(<rect key="d" x={-dg} y={(H-bg)/2} width={dg} height={bg} {...dik}/>);
    if (kant === "rechts") d.push(<rect key="d" x={W} y={(H-bg)/2} width={dg} height={bg} {...dik}/>);

    /* De middellijn, een stuk voorbij het midden, met de middencirkel
       die door de rand wordt afgesneden — niet netjes afgemaakt. */
    const in_ = (kant === "onder" || kant === "boven" ? H : W) * 0.14;
    const r = kort * 0.20;
    var mx, my;
    if (kant === "onder") { my = in_;     mx = W/2; d.push(<line key="m" x1={0} y1={my} x2={W} y2={my} {...k}/>); }
    if (kant === "boven") { my = H - in_; mx = W/2; d.push(<line key="m" x1={0} y1={my} x2={W} y2={my} {...k}/>); }
    if (kant === "links") { mx = W - in_; my = H/2; d.push(<line key="m" x1={mx} y1={0} x2={mx} y2={H} {...k}/>); }
    if (kant === "rechts"){ mx = in_;     my = H/2; d.push(<line key="m" x1={mx} y1={0} x2={mx} y2={H} {...k}/>); }
    const knip = "veldknip-" + type;
    d.push(
      <g key="c" clipPath={"url(#" + knip + ")"}>
        <circle cx={mx} cy={my} r={r} {...k}/>
      </g>
    );
    d.push(<circle key="s" cx={mx} cy={my} r={kort*0.028} fill="currentColor" stroke="none"/>);

    /* De omtrek is open aan de doorloopkant: drie lijnen, geen kader. */
    const hk = lijn/2, hb = W - lijn/2, ho = H - lijn/2, hl = lijn/2;
    const omtrek = {
      onder:  "M " + hl + " " + hk + " L " + hl + " " + ho + " L " + hb + " " + ho + " L " + hb + " " + hk,
      boven:  "M " + hl + " " + ho + " L " + hl + " " + hk + " L " + hb + " " + hk + " L " + hb + " " + ho,
      links:  "M " + hb + " " + hk + " L " + hl + " " + hk + " L " + hl + " " + ho + " L " + hb + " " + ho,
      rechts: "M " + hl + " " + hk + " L " + hb + " " + hk + " L " + hb + " " + ho + " L " + hl + " " + ho
    }[kant];

    /* Het doeltje steekt buiten het veld, dus het kijkvenster is ruimer. */
    const randH = kort * 0.07;
    return (
      <svg viewBox={(-randH) + " " + (-randH) + " " + (W + randH*2) + " " + (H + randH*2)}
        width={Math.round((W + randH*2)*s)} height={Math.round((H + randH*2)*s)}
        className="veld-icoon" aria-hidden="true">
        <defs><clipPath id={knip}><rect x={0} y={0} width={W} height={H}/></clipPath></defs>
        <path d={omtrek} {...k}/>
        {d}
      </svg>
    );
  }

  const rand = kort * 0.07;
  return (
    <svg viewBox={(-rand) + " " + (-rand) + " " + (W + rand*2) + " " + (H + rand*2)}
      width={Math.round((W + rand*2)*s)} height={Math.round((H + rand*2)*s)}
      className="veld-icoon" aria-hidden="true">
      <rect x={lijn/2} y={lijn/2} width={W-lijn} height={H-lijn} rx={kort*0.04} {...k}/>
      {d}
    </svg>
  );
}

function tekenVeld(ctx, W, H, vt) {
  var toR=function(d){return d*Math.PI/180;};
  ctx.fillStyle="#2e8b2e"; ctx.fillRect(0,0,W,H);
  for(var gi=0;gi<7;gi++){
    ctx.fillStyle=gi%2===0?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.03)";
    ctx.fillRect(0,gi*(H/7),W,H/7);
  }
  var FX=14,FY=10,FW=W-28,FH=H-20;
  ctx.strokeStyle="rgba(255,255,255,0.55)"; ctx.lineWidth=1.5; ctx.setLineDash([]);
  /* Een kaal vak: alleen een kader, eventueel opgedeeld. Bij "stippel"
     is het kader gestreept, zoals je met hoedjes een zone aangeeft. */
  if(vt==="stippel"){
    ctx.lineWidth=2.5;ctx.setLineDash([12,8]);ctx.strokeRect(FX,FY,FW,FH);ctx.setLineDash([]);return;
  }
  if(vt==="leeg"||VAK_RASTER[vt]){
    var vk=VAK_RASTER[vt]||[1,1];
    ctx.lineWidth=2.5;ctx.strokeRect(FX,FY,FW,FH);
    ctx.lineWidth=1.5;
    for(var vci=1;vci<vk[0];vci++){
      var vcx=FX+FW*vci/vk[0];
      ctx.beginPath();ctx.moveTo(vcx,FY);ctx.lineTo(vcx,FY+FH);ctx.stroke();
    }
    for(var vri=1;vri<vk[1];vri++){
      var vry=FY+FH*vri/vk[1];
      ctx.beginPath();ctx.moveTo(FX,vry);ctx.lineTo(FX+FW,vry);ctx.stroke();
    }
    return;
  }
  if(vt==="heel-h"){
    ctx.strokeRect(FX,FY,FW,FH);
    var mx=FX+FW/2;
    ctx.beginPath();ctx.moveTo(mx,FY);ctx.lineTo(mx,FY+FH);ctx.stroke();
    ctx.beginPath();ctx.arc(mx,FY+FH/2,Math.min(44,FW*0.078),0,2*Math.PI);ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.6)";ctx.beginPath();ctx.arc(mx,FY+FH/2,3,0,2*Math.PI);ctx.fill();
    var pw=FW*0.135,ph=FH*0.56,gw=FW*0.055,gh=FH*0.25,goH=FH*0.18,goD=10;
    ctx.strokeStyle="rgba(255,255,255,0.55)";ctx.lineWidth=1.5;
    ctx.strokeRect(FX,FY+(FH-ph)/2,pw,ph);
    ctx.strokeRect(FX,FY+(FH-gh)/2,gw,gh);
    ctx.strokeStyle="rgba(255,255,255,0.85)";ctx.lineWidth=2.5;
    ctx.strokeRect(FX-goD,FY+(FH-goH)/2,goD,goH);
    ctx.strokeStyle="rgba(255,255,255,0.55)";ctx.lineWidth=1.5;
    ctx.strokeRect(FX+FW-pw,FY+(FH-ph)/2,pw,ph);
    ctx.strokeRect(FX+FW-gw,FY+(FH-gh)/2,gw,gh);
    ctx.strokeStyle="rgba(255,255,255,0.85)";ctx.lineWidth=2.5;
    ctx.strokeRect(FX+FW,FY+(FH-goH)/2,goD,goH);
    ctx.fillStyle="rgba(255,255,255,0.6)";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(FX+pw*0.65,FY+FH/2,3,0,2*Math.PI);ctx.fill();
    ctx.beginPath();ctx.arc(FX+FW-pw*0.65,FY+FH/2,3,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.45)";ctx.lineWidth=1.5;
    var dRxH=pw*0.555,dRyH=ph*0.227;
    ctx.beginPath();ctx.ellipse(FX+pw*0.65,FY+FH/2,dRxH,dRyH,0,toR(-51),toR(51),false);ctx.stroke();
    ctx.beginPath();ctx.ellipse(FX+FW-pw*0.65,FY+FH/2,dRxH,dRyH,0,toR(129),toR(231),false);ctx.stroke();
    ctx.beginPath();ctx.ellipse(FX,FY,7,5,0,0,toR(90),false);ctx.stroke();
    ctx.beginPath();ctx.ellipse(FX+FW,FY,7,5,0,toR(90),toR(180),false);ctx.stroke();
    ctx.beginPath();ctx.ellipse(FX,FY+FH,7,5,0,toR(270),toR(360),false);ctx.stroke();
    ctx.beginPath();ctx.ellipse(FX+FW,FY+FH,7,5,0,toR(180),toR(270),false);ctx.stroke();
    return;
  }
  if(vt==="heel-v"){
    ctx.strokeRect(FX,FY,FW,FH);
    var my=FY+FH/2;
    ctx.beginPath();ctx.moveTo(FX,my);ctx.lineTo(FX+FW,my);ctx.stroke();
    ctx.beginPath();ctx.arc(FX+FW/2,my,Math.min(42,FH*0.078),0,2*Math.PI);ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.6)";ctx.beginPath();ctx.arc(FX+FW/2,my,3,0,2*Math.PI);ctx.fill();
    var vpw=FW*0.60,vph=FH*0.165,vgw=FW*0.32,vgh=FH*0.055,vGW=FW*0.22,vGH=12;
    ctx.strokeStyle="rgba(255,255,255,0.55)";ctx.lineWidth=1.5;
    ctx.strokeRect(FX+(FW-vpw)/2,FY,vpw,vph);ctx.strokeRect(FX+(FW-vgw)/2,FY,vgw,vgh);
    ctx.strokeStyle="rgba(255,255,255,0.85)";ctx.lineWidth=2.5;
    ctx.strokeRect(FX+(FW-vGW)/2,FY-vGH,vGW,vGH);
    ctx.fillStyle="rgba(255,255,255,0.6)";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(FX+FW/2,FY+vph*0.65,3,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.45)";ctx.lineWidth=1.5;
    var vdRx=vpw*0.227,vdRy=vph*0.555;
    ctx.beginPath();ctx.ellipse(FX+FW/2,FY+vph*0.65,vdRx,vdRy,0,toR(39),toR(141),false);ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,0.55)";ctx.lineWidth=1.5;
    ctx.strokeRect(FX+(FW-vpw)/2,FY+FH-vph,vpw,vph);ctx.strokeRect(FX+(FW-vgw)/2,FY+FH-vgh,vgw,vgh);
    ctx.strokeStyle="rgba(255,255,255,0.85)";ctx.lineWidth=2.5;
    ctx.strokeRect(FX+(FW-vGW)/2,FY+FH,vGW,vGH);
    ctx.fillStyle="rgba(255,255,255,0.6)";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(FX+FW/2,FY+FH-vph*0.65,3,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.45)";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(FX+FW/2,FY+FH-vph*0.65,vdRx,vdRy,0,toR(219),toR(321),false);ctx.stroke();
    ctx.beginPath();ctx.ellipse(FX,FY,5,7,0,0,toR(90),false);ctx.stroke();
    ctx.beginPath();ctx.ellipse(FX+FW,FY,5,7,0,toR(90),toR(180),false);ctx.stroke();
    ctx.beginPath();ctx.ellipse(FX,FY+FH,5,7,0,toR(270),toR(360),false);ctx.stroke();
    ctx.beginPath();ctx.ellipse(FX+FW,FY+FH,5,7,0,toR(180),toR(270),false);ctx.stroke();
    return;
  }
  // Half fields
  var goalB=vt==="half-o",goalT=vt==="half-b",goalL=vt==="half-l",goalR=vt==="half-r";
  if(!(goalB||goalT||goalL||goalR)){ctx.lineWidth=2.5;ctx.strokeRect(FX,FY,FW,FH);return;}
  var vert=goalB||goalT;
  /* ── De omtrek is OPEN aan de kant waar het veld doorloopt ──
     Er stond een dichte rechthoek met vier hoekboogjes: een heel veld
     met een streep erin, geen speelhelft. Aan de doorloopkant wordt
     niet gescoord en is geen hoekschop, dus daar hoort geen achterlijn
     en horen geen hoekboogjes. Drie lijnen dus. */
  ctx.setLineDash([]);ctx.strokeStyle="rgba(255,255,255,0.55)";ctx.lineWidth=1.5;
  ctx.beginPath();
  if(goalB){ctx.moveTo(FX,FY);ctx.lineTo(FX,FY+FH);ctx.lineTo(FX+FW,FY+FH);ctx.lineTo(FX+FW,FY);}
  if(goalT){ctx.moveTo(FX,FY+FH);ctx.lineTo(FX,FY);ctx.lineTo(FX+FW,FY);ctx.lineTo(FX+FW,FY+FH);}
  if(goalL){ctx.moveTo(FX+FW,FY);ctx.lineTo(FX,FY);ctx.lineTo(FX,FY+FH);ctx.lineTo(FX+FW,FY+FH);}
  if(goalR){ctx.moveTo(FX,FY);ctx.lineTo(FX+FW,FY);ctx.lineTo(FX+FW,FY+FH);ctx.lineTo(FX,FY+FH);}
  ctx.stroke();
  /* De middellijn ligt een stuk voorbij het midden van het doek, zodat
     je net over de middellijn heen kijkt. */
  var mIn=(vert?FH:FW)*0.14, mR=Math.min(FW,FH)*0.20, mX, mY;
  if(goalB){mX=FX+FW/2;mY=FY+mIn;}
  if(goalT){mX=FX+FW/2;mY=FY+FH-mIn;}
  if(goalL){mX=FX+FW-mIn;mY=FY+FH/2;}
  if(goalR){mX=FX+mIn;mY=FY+FH/2;}
  ctx.beginPath();
  if(vert){ctx.moveTo(FX,mY);ctx.lineTo(FX+FW,mY);}
  else     {ctx.moveTo(mX,FY);ctx.lineTo(mX,FY+FH);}
  ctx.stroke();
  /* De middencirkel is een HELE cirkel die door de rand wordt
     afgesneden. Een nette halve maan die precies op de middellijn
     eindigt bestaat niet: op het echte veld loopt hij door. */
  ctx.save();
  ctx.beginPath();ctx.rect(FX,FY,FW,FH);ctx.clip();
  ctx.beginPath();ctx.arc(mX,mY,mR,0,2*Math.PI);ctx.stroke();
  ctx.restore();
  ctx.fillStyle="rgba(255,255,255,0.6)";
  ctx.beginPath();ctx.arc(mX,mY,3,0,2*Math.PI);ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.55)";ctx.lineWidth=1.5;
  // PA dimensions
  var hPAm=vert?FH*0.36:FW*0.36, hPAc=vert?FW*0.60:FH*0.60;
  var hGAm=vert?FH*0.09:FW*0.09, hGAc=vert?FW*0.32:FH*0.32;
  var hGW=vert?FW*0.22:FH*0.22, hGD=14;
  var penD=hPAm*0.65;
  var paX,paY,paW,paH,gaX,gaY,gaW,gaH,glX,glY,glW,glH,penX,penY;
  if(goalB){
    paX=FX+(FW-hPAc)/2;paY=FY+FH-hPAm;paW=hPAc;paH=hPAm;
    gaX=FX+(FW-hGAc)/2;gaY=FY+FH-hGAm;gaW=hGAc;gaH=hGAm;
    glX=FX+(FW-hGW)/2;glY=FY+FH;glW=hGW;glH=hGD;
    penX=FX+FW/2;penY=FY+FH-penD;
  } else if(goalT){
    paX=FX+(FW-hPAc)/2;paY=FY;paW=hPAc;paH=hPAm;
    gaX=FX+(FW-hGAc)/2;gaY=FY;gaW=hGAc;gaH=hGAm;
    glX=FX+(FW-hGW)/2;glY=FY-hGD;glW=hGW;glH=hGD;
    penX=FX+FW/2;penY=FY+penD;
  } else if(goalL){
    paX=FX;paY=FY+(FH-hPAc)/2;paW=hPAm;paH=hPAc;
    gaX=FX;gaY=FY+(FH-hGAc)/2;gaW=hGAm;gaH=hGAc;
    glX=FX-hGD;glY=FY+(FH-hGW)/2;glW=hGD;glH=hGW;
    penX=FX+penD;penY=FY+FH/2;
  } else {
    paX=FX+FW-hPAm;paY=FY+(FH-hPAc)/2;paW=hPAm;paH=hPAc;
    gaX=FX+FW-hGAm;gaY=FY+(FH-hGAc)/2;gaW=hGAm;gaH=hGAc;
    glX=FX+FW;glY=FY+(FH-hGW)/2;glW=hGD;glH=hGW;
    penX=FX+FW-penD;penY=FY+FH/2;
  }
  ctx.strokeRect(paX,paY,paW,paH);ctx.strokeRect(gaX,gaY,gaW,gaH);
  ctx.strokeStyle="rgba(255,255,255,0.85)";ctx.lineWidth=2.5;
  ctx.strokeRect(glX,glY,glW,glH);
  ctx.fillStyle="rgba(255,255,255,0.6)";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(penX,penY,3,0,2*Math.PI);ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.45)";ctx.lineWidth=1.5;
  var hdRx=vert?hPAc*0.227:hPAm*0.555, hdRy=vert?hPAm*0.555:hPAc*0.227;
  if(goalB){ctx.beginPath();ctx.ellipse(penX,penY,hdRx,hdRy,0,toR(219),toR(321),false);ctx.stroke();}
  if(goalT){ctx.beginPath();ctx.ellipse(penX,penY,hdRx,hdRy,0,toR(39),toR(141),false);ctx.stroke();}
  if(goalL){ctx.beginPath();ctx.ellipse(penX,penY,hdRx,hdRy,0,toR(-51),toR(51),false);ctx.stroke();}
  if(goalR){ctx.beginPath();ctx.ellipse(penX,penY,hdRx,hdRy,0,toR(129),toR(231),false);ctx.stroke();}
  /* Alleen bij de achterlijn die er wél is staan hoekboogjes. */
  ctx.strokeStyle="rgba(255,255,255,0.4)";
  function hoek(x,y,a,b){ctx.beginPath();ctx.ellipse(x,y,6,6,0,toR(a),toR(b),false);ctx.stroke();}
  if(goalT||goalL) hoek(FX,FY,0,90);
  if(goalT||goalR) hoek(FX+FW,FY,90,180);
  if(goalB||goalL) hoek(FX,FY+FH,270,360);
  if(goalB||goalR) hoek(FX+FW,FY+FH,180,270);
}

function pijl(ctx, x1, y1, x2, y2, kleur) {
  const angle = Math.atan2(y2-y1, x2-x1);
  const s = 11;
  ctx.save();
  ctx.fillStyle = kleur || "white";
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - s*Math.cos(angle-0.42), y2 - s*Math.sin(angle-0.42));
  ctx.lineTo(x2 - s*Math.cos(angle+0.42), y2 - s*Math.sin(angle+0.42));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function tekenlijn(ctx, l) {
  ctx.save();
  ctx.lineCap="round"; ctx.lineJoin="round";
  const W = "#ffffff";

  if (l.type==="looplijn") {
    ctx.strokeStyle=W; ctx.lineWidth=2.6; ctx.setLineDash([9,5]);
    ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.stroke();
    pijl(ctx,l.x1,l.y1,l.x2,l.y2,W);

  } else if (l.type==="passlijn") {
    ctx.strokeStyle=W; ctx.lineWidth=2.6; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.stroke();
    pijl(ctx,l.x1,l.y1,l.x2,l.y2,W);

  } else if (l.type==="schietlijn") {
    /* één doorlopende lijn met een bliksemknik: recht vooruit, schuin terug, recht vooruit */
    const dx=l.x2-l.x1, dy=l.y2-l.y1;
    const dist=Math.sqrt(dx*dx+dy*dy)||1;
    const ux=dx/dist, uy=dy/dist, nx=-uy, ny=ux;
    ctx.strokeStyle=W; ctx.lineWidth=3.2; ctx.setLineDash([]);
    ctx.lineJoin="miter"; ctx.miterLimit=6; ctx.lineCap="butt";
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    if (dist > 46) {
      const A = Math.min(11, dist*0.11);       // hoe ver de knik uitwijkt
      const t1 = 0.60, t2 = 0.40;              // vooruit tot t1, dan terug naar t2
      ctx.lineTo(l.x1 + ux*dist*t1 + nx*A, l.y1 + uy*dist*t1 + ny*A);
      ctx.lineTo(l.x1 + ux*dist*t2 - nx*A, l.y1 + uy*dist*t2 - ny*A);
    }
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.lineJoin="round"; ctx.lineCap="round";
    pijl(ctx,l.x1,l.y1,l.x2,l.y2,W);

  } else if (l.type==="dribbellijn") {
    const dx=l.x2-l.x1, dy=l.y2-l.y1;
    const dist=Math.sqrt(dx*dx+dy*dy)||1;
    const ux=dx/dist, uy=dy/dist;
    const nx=-uy, ny=ux;
    const pijlLengte=10;
    const eind=Math.max(2, dist-pijlLengte);
    const golf=22, amp=5.2;
    const n=Math.max(16, Math.round(eind/1.2));
    const pnt=[];
    for (let i=0;i<=n;i++) {
      const s=(i/n)*eind;
      const demp=Math.min(1,(1-i/n)/0.16);
      const o=Math.sin(s/golf*Math.PI*2)*amp*demp;
      pnt.push([l.x1+ux*s+nx*o, l.y1+uy*s+ny*o]);
    }
    ctx.strokeStyle=W; ctx.lineWidth=2.6; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(pnt[0][0],pnt[0][1]);
    for (let i=1;i<pnt.length-1;i++) {
      const mx=(pnt[i][0]+pnt[i+1][0])/2, my=(pnt[i][1]+pnt[i+1][1])/2;
      ctx.quadraticCurveTo(pnt[i][0],pnt[i][1],mx,my);
    }
    ctx.lineTo(pnt[n][0],pnt[n][1]);
    ctx.stroke();
    pijl(ctx,l.x1,l.y1,l.x2,l.y2,W);

  } else if (l.type==="voorzetlijn") {
    const b = (Number(l.bocht)===-1) ? -1 : 1;      // kant waarheen de boog buigt
    const cx2=(l.x1+l.x2)/2 - (l.y2-l.y1)*0.28*b;
    const cy2=(l.y1+l.y2)/2 + (l.x2-l.x1)*0.28*b;
    ctx.strokeStyle=W; ctx.lineWidth=2.6; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(l.x1,l.y1);
    ctx.quadraticCurveTo(cx2,cy2,l.x2,l.y2); ctx.stroke();
    pijl(ctx,cx2,cy2,l.x2,l.y2,W);
  }

  /* Volgnummer bij de lijn: dikgedrukt, met een rand eromheen zodat het
     zowel op gras als op een lichte ondergrond leesbaar blijft. */
  if (l.nr) {
    var lx = l.x1 + (l.x2 - l.x1) * 0.22;
    var ly = l.y1 + (l.y2 - l.y1) * 0.22;
    var rx = l.x2 - l.x1, ry = l.y2 - l.y1;
    var len = Math.sqrt(rx*rx + ry*ry) || 1;
    /* een stukje naast de lijn, haaks erop */
    lx += (-ry/len) * 13;
    ly += ( rx/len) * 13;
    ctx.setLineDash([]);
    ctx.font = "800 15px 'Helvetica Neue',Arial,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3.5; ctx.lineJoin = "round";
    ctx.strokeStyle = l.nrDonker ? "rgba(255,255,255,0.95)" : "rgba(14,18,24,0.9)";
    ctx.strokeText(String(l.nr), lx, ly);
    ctx.fillStyle = l.nrDonker ? "#0e1218" : "#ffffff";
    ctx.fillText(String(l.nr), lx, ly);
  }
  ctx.restore();
}


/* Regelafbreking en afmetingen van een notitie — gebruikt bij tekenen én bij aanklikken */
function notitieOpmaak(ctx, el, k) {
  var tekst = String(el.tekst||"Notitie");
  var fs = Math.max(9, 11.5*k);
  var maxB = 160*k;
  ctx.font = "600 " + fs.toFixed(1) + "px 'Helvetica Neue',Arial,sans-serif";
  var regels = [];
  tekst.split("\n").forEach(function(stuk){
    var huidig = "";
    stuk.split(/\s+/).filter(Boolean).forEach(function(w){
      /* woord dat op zichzelf al te breed is: op tekens afbreken */
      while (ctx.measureText(w).width > maxB && w.length > 1) {
        var knip = w.length;
        while (knip > 1 && ctx.measureText(w.slice(0,knip)).width > maxB) knip--;
        if (huidig) { regels.push(huidig); huidig = ""; }
        regels.push(w.slice(0,knip));
        w = w.slice(knip);
      }
      var proef = huidig ? huidig + " " + w : w;
      if (ctx.measureText(proef).width > maxB && huidig) { regels.push(huidig); huidig = w; }
      else huidig = proef;
    });
    regels.push(huidig);
  });
  if (regels.length === 0) regels = [""];
  var breedste = 0;
  regels.forEach(function(r){ breedste = Math.max(breedste, ctx.measureText(r).width); });
  var pad = fs*0.75;
  return {
    regels: regels, fs: fs, regelH: fs*1.32, pad: pad,
    b: breedste + pad*2,
    h: regels.length*(fs*1.32) + pad*1.6
  };
}

function draaibaar(type) {
  if (type==="goal" || isZone(type)) return true;
  var m = materiaalInfo(type);
  return !!(m && m.draai);
}
function draaiAfstand(el, k) {
  if (isZone(el.type)) return Math.max(34, (Number(el.h)||90)/2 + 26);
  return Math.max(34, 30*k + 22);
}

function tekenelement(ctx, el, gekozen) {
  ctx.save();
  const x = el.x, y = el.y;
  const k = Math.max(0.4, Math.min(3, Number(el.schaal) || 1));   // schaalfactor
  ctx.setLineDash([]);

  if (el.type==="speler" || el.type==="speler-rood") {
    const r = 15*k;
    ctx.fillStyle = el.type==="speler-rood" ? "#dc3545" : "#004aad";
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="white"; ctx.lineWidth=2*Math.sqrt(k); ctx.stroke();
    ctx.fillStyle="white";
    ctx.font="bold "+(11*k).toFixed(1)+"px 'Helvetica Neue',Arial,sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(String(el.nr||""),x,y);
    if (el.naam) {
      const voornaam = String(el.naam).split(" ")[0];
      const fs = Math.max(8, 9.5*k);
      ctx.font="bold "+fs.toFixed(1)+"px 'Helvetica Neue',Arial,sans-serif";
      const bw = ctx.measureText(voornaam).width + 8;
      ctx.fillStyle="rgba(0,0,0,0.55)";
      const by = y + r + 3;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x-bw/2, by, bw, fs+5, 4); ctx.fill(); }
      else ctx.fillRect(x-bw/2, by, bw, fs+5);
      ctx.fillStyle="#ffffff"; ctx.textBaseline="top";
      ctx.fillText(voornaam, x, by+2.5);
      ctx.textBaseline="middle";
    }

  } else if (el.type==="bal") {
    /* De bal werd eerder als emoji getekend. Dat hangt af van het
       lettertype van het toestel: valt die terug op een zwart-wit
       teken, dan krijgt hij de laatst gebruikte vulkleur en verdwijnt
       hij tegen het gras. Nu tekenen we hem zelf, dan klopt hij altijd. */
    const r = 9.5*k;
    /* schaduw op het gras */
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.ellipse(x, y + r*0.92, r*0.95, r*0.34, 0, 0, Math.PI*2); ctx.fill();
    /* witte bol met een lichte bolling */
    const bol = ctx.createRadialGradient(x - r*0.34, y - r*0.4, r*0.15, x, y, r);
    bol.addColorStop(0, "#ffffff");
    bol.addColorStop(0.72, "#f4f6f8");
    bol.addColorStop(1, "#d3d8de");
    ctx.fillStyle = bol;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    /* zwarte vlakken: één in het midden, vijf eromheen */
    ctx.fillStyle = "#15181d";
    function vlak(cx, cy, straal, draai) {
      ctx.beginPath();
      for (var i = 0; i < 5; i++) {
        var hoek = draai + i * Math.PI * 2 / 5;
        var px = cx + Math.cos(hoek) * straal, py = cy + Math.sin(hoek) * straal;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    vlak(x, y, r*0.36, -Math.PI/2);
    for (var v = 0; v < 5; v++) {
      var hk = -Math.PI/2 + v * Math.PI*2/5 + Math.PI/5;
      vlak(x + Math.cos(hk)*r*0.72, y + Math.sin(hk)*r*0.72, r*0.24, hk + Math.PI/2);
    }
    /* rand eromheen zodat hij ook op wit zichtbaar blijft */
    ctx.strokeStyle = "rgba(20,24,30,0.75)";
    ctx.lineWidth = Math.max(0.8, 1.1*Math.sqrt(k));
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
  } else if (el.type==="pion") {
    const h = 15*k, b = 9.5*k, g = 13*k;
    ctx.fillStyle="#d95f00";
    ctx.beginPath(); ctx.ellipse(x, y+10*k, g, 4.2*k, 0, 0, Math.PI*2); ctx.fill();
    const kegel = ctx.createLinearGradient(x-b, y, x+b, y);
    kegel.addColorStop(0,"#ff8c1a"); kegel.addColorStop(0.42,"#ff6a00"); kegel.addColorStop(1,"#cc5200");
    ctx.fillStyle = kegel;
    ctx.beginPath();
    ctx.moveTo(x, y-h);
    ctx.quadraticCurveTo(x+4.5*k, y-4*k, x+b, y+9*k);
    ctx.lineTo(x-b, y+9*k);
    ctx.quadraticCurveTo(x-4.5*k, y-4*k, x, y-h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.82)";
    ctx.beginPath();
    ctx.moveTo(x-4.4*k, y-1.5*k); ctx.lineTo(x+4.4*k, y-1.5*k);
    ctx.lineTo(x+5.9*k, y+3.2*k); ctx.lineTo(x-5.9*k, y+3.2*k);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.35)"; ctx.lineWidth=1*Math.sqrt(k);
    ctx.beginPath();
    ctx.moveTo(x, y-h);
    ctx.quadraticCurveTo(x+4.5*k, y-4*k, x+b, y+9*k);
    ctx.lineTo(x-b, y+9*k);
    ctx.quadraticCurveTo(x-4.5*k, y-4*k, x, y-h);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y+10*k, g, 4.2*k, 0, 0, Math.PI*2); ctx.stroke();

  } else if (el.type==="dummy") {
    /* trainingspop met voet */
    const b = 9*k, h = 26*k;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(x, y+h*0.42, b*1.15, b*0.4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#3b4250";
    ctx.beginPath(); ctx.ellipse(x, y+h*0.40, b*0.95, b*0.33, 0, 0, Math.PI*2); ctx.fill();
    const lijf = ctx.createLinearGradient(x-b, y, x+b, y);
    lijf.addColorStop(0,"#e8404f"); lijf.addColorStop(0.45,"#cc2233"); lijf.addColorStop(1,"#9e1a28");
    ctx.fillStyle = lijf;
    ctx.beginPath();
    ctx.moveTo(x-b*0.34, y-h*0.22);
    ctx.quadraticCurveTo(x-b*0.95, y+h*0.10, x-b*0.62, y+h*0.38);
    ctx.lineTo(x+b*0.62, y+h*0.38);
    ctx.quadraticCurveTo(x+b*0.95, y+h*0.10, x+b*0.34, y-h*0.22);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y-h*0.32, b*0.42, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(20,24,31,0.4)"; ctx.lineWidth = Math.max(0.8, 1*k);
    ctx.stroke();

  } else if (el.type==="ladder") {
    const hk = (Number(el.hoek)||0) * Math.PI/180;
    ctx.save(); ctx.translate(x,y); ctx.rotate(hk);
    const b = 22*k, h = 62*k, vakken = 6;
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(-b/2+1.5, -h/2+2, b, h);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(-b/2, -h/2, b, h);
    ctx.strokeStyle = "#ffd400"; ctx.lineWidth = Math.max(1.4, 2*k);
    ctx.setLineDash([]);
    ctx.strokeRect(-b/2, -h/2, b, h);
    for (let i=1;i<vakken;i++) {
      const yy = -h/2 + (h/vakken)*i;
      ctx.beginPath(); ctx.moveTo(-b/2, yy); ctx.lineTo(b/2, yy); ctx.stroke();
    }
    ctx.restore();

  } else if (el.type==="hordje") {
    const hk2 = (Number(el.hoek)||0) * Math.PI/180;
    ctx.save(); ctx.translate(x,y); ctx.rotate(hk2);
    const b = 20*k, h = 12*k;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(0, h*0.55, b*0.55, b*0.16, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#ffa000"; ctx.lineWidth = Math.max(1.6, 2.4*k);
    ctx.lineCap = "round"; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(-b/2, h/2); ctx.lineTo(-b/2, -h/2);
    ctx.lineTo(b/2, -h/2); ctx.lineTo(b/2, h/2);
    ctx.stroke();
    ctx.restore();

  } else if (el.type==="stok") {
    const b3 = 3*k, h3 = 30*k;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(x, y+h3*0.46, 7*k, 2.6*k, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#2f3a4a";
    ctx.beginPath(); ctx.ellipse(x, y+h3*0.44, 6*k, 2.2*k, 0, 0, Math.PI*2); ctx.fill();
    for (let i=0;i<4;i++) {
      ctx.fillStyle = i%2===0 ? "#f5f7fa" : "#e03a3a";
      ctx.fillRect(x-b3/2, y-h3*0.46 + (h3*0.9/4)*i, b3, h3*0.9/4);
    }
    ctx.strokeStyle = "rgba(20,24,31,0.45)"; ctx.lineWidth = Math.max(0.7, 0.9*k);
    ctx.strokeRect(x-b3/2, y-h3*0.46, b3, h3*0.9);

  } else if (el.type==="hoedje") {
    const r4 = 9*k;
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath(); ctx.ellipse(x, y+r4*0.30, r4, r4*0.36, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#ffb020";
    ctx.beginPath(); ctx.ellipse(x, y+r4*0.16, r4, r4*0.36, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#ff8c00";
    ctx.beginPath(); ctx.ellipse(x, y, r4*0.62, r4*0.24, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(20,24,31,0.35)"; ctx.lineWidth = Math.max(0.7, 0.9*k);
    ctx.beginPath(); ctx.ellipse(x, y+r4*0.16, r4, r4*0.36, 0, 0, Math.PI*2); ctx.stroke();

  } else if (el.type==="minidoel") {
    const hk5 = (Number(el.hoek)||0) * Math.PI/180;
    ctx.save(); ctx.translate(x,y); ctx.rotate(hk5);
    const b5 = 30*k, h5 = 13*k;
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath(); ctx.ellipse(0, h5*0.55, b5*0.5, b5*0.13, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(-b5/2, -h5/2, b5, h5);
    ctx.strokeStyle = "rgba(255,255,255,0.42)"; ctx.lineWidth = Math.max(0.5, 0.7*k);
    for (let i=1;i<5;i++) {
      const xx = -b5/2 + (b5/5)*i;
      ctx.beginPath(); ctx.moveTo(xx, -h5/2); ctx.lineTo(xx, h5/2); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(20,24,31,0.5)"; ctx.lineWidth = Math.max(2, 2.8*k)+1.4;
    ctx.beginPath(); ctx.moveTo(-b5/2, h5/2); ctx.lineTo(-b5/2, -h5/2);
    ctx.lineTo(b5/2, -h5/2); ctx.lineTo(b5/2, h5/2); ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(2, 2.8*k);
    ctx.beginPath(); ctx.moveTo(-b5/2, h5/2); ctx.lineTo(-b5/2, -h5/2);
    ctx.lineTo(b5/2, -h5/2); ctx.lineTo(b5/2, h5/2); ctx.stroke();
    ctx.restore();

  } else if (el.type==="ring") {
    const r6 = 11*k;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(x, y+r6*0.22, r6, r6*0.40, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#ffd400"; ctx.lineWidth = Math.max(2.2, 3.2*k);
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.ellipse(x, y, r6, r6*0.40, 0, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = "rgba(20,24,31,0.35)"; ctx.lineWidth = Math.max(0.6, 0.8*k);
    ctx.beginPath(); ctx.ellipse(x, y, r6, r6*0.40, 0, 0, Math.PI*2); ctx.stroke();

  } else if (el.type==="mand") {
    const b7 = 16*k, h7 = 13*k;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(x, y+h7*0.62, b7*0.55, b7*0.17, 0, 0, Math.PI*2); ctx.fill();
    /* ballen erin */
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#14181f"; ctx.lineWidth = Math.max(0.6, 0.8*k);
    [[-0.26,-0.30],[0.24,-0.34],[0,-0.14]].forEach(function(p){
      ctx.beginPath(); ctx.arc(x+p[0]*b7, y+p[1]*h7, b7*0.20, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    });
    /* mand */
    ctx.fillStyle = "#2f6fb5";
    ctx.beginPath();
    ctx.moveTo(x-b7/2, y-h7*0.10);
    ctx.lineTo(x+b7/2, y-h7*0.10);
    ctx.lineTo(x+b7*0.38, y+h7*0.55);
    ctx.lineTo(x-b7*0.38, y+h7*0.55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = Math.max(0.6, 0.9*k);
    for (let i=1;i<4;i++) {
      const t7 = i/4;
      ctx.beginPath();
      ctx.moveTo(x-b7/2+(b7*0.12)*t7, y-h7*0.10+(h7*0.65)*t7);
      ctx.lineTo(x+b7/2-(b7*0.12)*t7, y-h7*0.10+(h7*0.65)*t7);
      ctx.stroke();
    }

  } else if (el.type==="goal") {
    const hoek = (Number(el.hoek)||0) * Math.PI/180;
    const w = 46*k, hp = 17*k, dep = 14*k, kr = 0.82;
    /* schaduw ligt plat op het gras, maar volgt wel het gedraaide grondvlak */
    const co = Math.cos(hoek), si = Math.sin(hoek);
    const grond = [[-w/2,0],[w/2,0],[w*kr/2,-dep],[-w*kr/2,-dep]].map(function(p){
      return [p[0]*co - p[1]*si, p[0]*si + p[1]*co];
    });
    let gx0=1e9, gx1=-1e9, gy0=1e9, gy1=-1e9;
    grond.forEach(function(p){
      gx0=Math.min(gx0,p[0]); gx1=Math.max(gx1,p[0]);
      gy0=Math.min(gy0,p[1]); gy1=Math.max(gy1,p[1]);
    });
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath();
    ctx.ellipse(x + (gx0+gx1)/2, y + (gy0+gy1)/2,
                Math.max(6,(gx1-gx0)/2*0.92), Math.max(4,(gy1-gy0)/2*0.92),
                0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hoek);

    /* voorkant (mond) en achterkant (in perspectief kleiner en naar achter) */
    const f = [[-w/2, 0], [w/2, 0], [w/2, -hp], [-w/2, -hp]];   // LB RB RT LT
    const b = f.map(function(p){ return [p[0]*kr, p[1]*kr - dep]; });

    function vlak(pts, vulling) {
      ctx.beginPath();
      pts.forEach(function(p,i){ if(i===0) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); });
      ctx.closePath(); ctx.fillStyle = vulling; ctx.fill();
    }
    function maas(p1, p2, p3, p4, n1, n2) {
      /* raster over een vierhoek p1-p2-p3-p4 */
      ctx.strokeStyle = "rgba(255,255,255,0.42)"; ctx.lineWidth = Math.max(0.5, 0.7*k);
      for (let i=1;i<n1;i++) {
        const t=i/n1;
        ctx.beginPath();
        ctx.moveTo(p1[0]+(p2[0]-p1[0])*t, p1[1]+(p2[1]-p1[1])*t);
        ctx.lineTo(p4[0]+(p3[0]-p4[0])*t, p4[1]+(p3[1]-p4[1])*t);
        ctx.stroke();
      }
      for (let j=1;j<n2;j++) {
        const t=j/n2;
        ctx.beginPath();
        ctx.moveTo(p1[0]+(p4[0]-p1[0])*t, p1[1]+(p4[1]-p1[1])*t);
        ctx.lineTo(p2[0]+(p3[0]-p2[0])*t, p2[1]+(p3[1]-p2[1])*t);
        ctx.stroke();
      }
    }

    /* netvlakken: achter, boven, links, rechts */
    vlak(b, "rgba(255,255,255,0.20)");
    vlak([f[3],f[2],b[2],b[3]], "rgba(255,255,255,0.13)");
    vlak([f[0],f[3],b[3],b[0]], "rgba(255,255,255,0.10)");
    vlak([f[1],f[2],b[2],b[1]], "rgba(255,255,255,0.10)");

    /* net */
    ctx.setLineDash([]);
    maas(b[0],b[1],b[2],b[3], 6, 4);
    maas(f[3],f[2],b[2],b[3], 6, 3);
    maas(f[0],f[3],b[3],b[0], 3, 3);
    maas(f[1],f[2],b[2],b[1], 3, 3);

    /* verbinding voor naar achter */
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = Math.max(0.8, 1.1*k);
    [[f[2],b[2]],[f[3],b[3]],[f[0],b[0]],[f[1],b[1]]].forEach(function(pr){
      ctx.beginPath(); ctx.moveTo(pr[0][0],pr[0][1]); ctx.lineTo(pr[1][0],pr[1][1]); ctx.stroke();
    });

    /* achterframe */
    ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = Math.max(1, 1.4*k);
    ctx.beginPath();
    ctx.moveTo(b[3][0],b[3][1]); ctx.lineTo(b[2][0],b[2][1]);
    ctx.lineTo(b[1][0],b[1][1]); ctx.moveTo(b[3][0],b[3][1]); ctx.lineTo(b[0][0],b[0][1]);
    ctx.stroke();

    /* palen en lat vooraan, met donkere rand voor contrast */
    const dik = Math.max(2, 3.1*k);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(20,24,31,0.5)"; ctx.lineWidth = dik + Math.max(1.2, 1.6*k);
    ctx.beginPath();
    ctx.moveTo(f[0][0],f[0][1]); ctx.lineTo(f[3][0],f[3][1]);
    ctx.lineTo(f[2][0],f[2][1]); ctx.lineTo(f[1][0],f[1][1]);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = dik;
    ctx.beginPath();
    ctx.moveTo(f[0][0],f[0][1]); ctx.lineTo(f[3][0],f[3][1]);
    ctx.lineTo(f[2][0],f[2][1]); ctx.lineTo(f[1][0],f[1][1]);
    ctx.stroke();

    ctx.restore();
  } else if (el.type==="cirkel") {
    ctx.strokeStyle="rgba(255,255,150,0.75)"; ctx.lineWidth=2*Math.sqrt(k);
    ctx.setLineDash([5*k,4*k]);
    ctx.beginPath(); ctx.arc(x,y,30*k,0,Math.PI*2); ctx.stroke();

  } else if (el.type==="notitie") {
    const o = notitieOpmaak(ctx, el, k);
    const x0 = x - o.b/2, y0 = y - o.h/2;
    const r0 = Math.min(9*k, o.h/3);
    ctx.setLineDash([]);
    /* schaduw */
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x0+1.5, y0+2.5, o.b, o.h, r0); ctx.fill(); }
    else ctx.fillRect(x0+1.5, y0+2.5, o.b, o.h);
    /* vlak */
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.strokeStyle = "rgba(20,24,31,0.35)";
    ctx.lineWidth = Math.max(1, 1.2*k);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0, y0, o.b, o.h, r0);
    else ctx.rect(x0, y0, o.b, o.h);
    ctx.fill(); ctx.stroke();
    /* accentstreep links */
    ctx.fillStyle = "#004aad";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0, y0, Math.max(3, 3.5*k), o.h, [r0,0,0,r0]);
    else ctx.rect(x0, y0, Math.max(3, 3.5*k), o.h);
    ctx.fill();
    /* tekst */
    ctx.fillStyle = "#14181f";
    ctx.font = "600 " + o.fs.toFixed(1) + "px 'Helvetica Neue',Arial,sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    o.regels.forEach(function(r, i){
      ctx.fillText(r, x0 + o.pad + Math.max(3,3.5*k)*0.6, y0 + o.pad*0.8 + i*o.regelH);
    });
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

  } else if (isZone(el.type)) {
    ctx.save();
    const zh = (Number(el.hoek)||0) * Math.PI/180;
    if (zh) { ctx.translate(x,y); ctx.rotate(zh); ctx.translate(-x,-y); }
    const kl = zoneKleurInfo(el.kleur);
    const b = Math.max(14, Number(el.b)||70);
    const h = Math.max(14, Number(el.h)||70);
    ctx.setLineDash([]);
    ctx.fillStyle = kl.vul;
    ctx.strokeStyle = kl.rand;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    if (el.type==="zone-cirkel") {
      ctx.beginPath(); ctx.ellipse(x, y, b/2, h/2, 0, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    } else if (el.type==="zone-driehoek") {
      ctx.beginPath();
      ctx.moveTo(x, y-h/2);
      ctx.lineTo(x+b/2, y+h/2);
      ctx.lineTo(x-b/2, y+h/2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else {
      const r = Math.min(10, b/6, h/6);
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(x-b/2, y-h/2, b, h, r); }
      else {
        ctx.moveTo(x-b/2+r, y-h/2);
        ctx.lineTo(x+b/2-r, y-h/2); ctx.quadraticCurveTo(x+b/2, y-h/2, x+b/2, y-h/2+r);
        ctx.lineTo(x+b/2, y+h/2-r); ctx.quadraticCurveTo(x+b/2, y+h/2, x+b/2-r, y+h/2);
        ctx.lineTo(x-b/2+r, y+h/2); ctx.quadraticCurveTo(x-b/2, y+h/2, x-b/2, y+h/2-r);
        ctx.lineTo(x-b/2, y-h/2+r); ctx.quadraticCurveTo(x-b/2, y-h/2, x-b/2+r, y-h/2);
        ctx.closePath();
      }
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  /* draaigreep */
  if (gekozen && draaibaar(el.type)) {
    const h2 = (Number(el.hoek)||0) * Math.PI/180;
    const R = draaiAfstand(el, k);
    const hx = x + Math.sin(h2)*R, hy = y - Math.cos(h2)*R;
    ctx.save();
    ctx.setLineDash([3,3]);
    ctx.strokeStyle="rgba(255,212,0,0.7)"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(hx,hy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(hx,hy,8,0,Math.PI*2);
    ctx.fillStyle="#ffd400"; ctx.fill();
    ctx.strokeStyle="rgba(20,24,31,0.75)"; ctx.lineWidth=1.6; ctx.stroke();
    ctx.strokeStyle="#14181f"; ctx.lineWidth=1.6; ctx.lineCap="round";
    ctx.beginPath(); ctx.arc(hx,hy,3.6,0.6,5.0); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx+2.0,hy-3.4); ctx.lineTo(hx+3.9,hy-1.6); ctx.lineTo(hx+1.2,hy-1.0);
    ctx.closePath(); ctx.fillStyle="#14181f"; ctx.fill();
    ctx.restore();
  }

  /* selectiering */
  if (gekozen) {
    ctx.setLineDash([4,3]);
    ctx.strokeStyle="#ffd400"; ctx.lineWidth=2;
    if (el.type==="notitie") {
      const o2 = notitieOpmaak(ctx, el, k);
      ctx.strokeRect(x-o2.b/2-5, y-o2.h/2-5, o2.b+10, o2.h+10);
    } else if (isZone(el.type)) {
      const b=(Number(el.b)||70)/2+6, h=(Number(el.h)||70)/2+6;
      ctx.strokeRect(x-b, y-h, b*2, h*2);
    } else {
      const straal = (el.type==="cirkel" ? 30 : el.type==="goal" ? 22 : 17) * k + 6;
      ctx.beginPath(); ctx.arc(x,y,straal,0,Math.PI*2); ctx.stroke();
    }
  }
  ctx.restore();
}


/* Kortste afstand van een punt tot een lijnstuk */
/* Trainingsmateriaal dat je op het veld kunt zetten */
/* De zes soorten gereedschap, in de volgorde waarin je een oefening
   opbouwt: eerst het veld, dan wie erop staat, dan wat erop ligt, en
   pas daarna wat ze doen. */
const BORD_SOORTEN = [
  {id:"veld",      label:"Veld en aanzicht",       icoon:"fa-solid fa-border-all"},
  {id:"spelers",   label:"Spelers en teams",       icoon:"fa-solid fa-users"},
  {id:"objecten",  label:"Bal, pion, doel, notitie", icoon:"fa-solid fa-futbol"},
  {id:"materiaal", label:"Trainingsmateriaal",     icoon:"fa-solid fa-toolbox"},
  {id:"lijnen",    label:"Lijnen en pijlen",       icoon:"fa-solid fa-pen-nib"},
  {id:"zone",      label:"Zones en vlakken",       icoon:"fa-solid fa-vector-square"}
];

const MATERIAAL = [
  {id:"dummy",     label:"Pop",         icoon:"fa-solid fa-person",          draai:false},
  {id:"ladder",    label:"Speedladder", icoon:"fa-solid fa-table-cells",     draai:true},
  {id:"hordje",    label:"Hordje",      icoon:"fa-solid fa-archway",         draai:true},
  {id:"stok",      label:"Slalomstok",  icoon:"fa-solid fa-grip-lines-vertical", draai:false},
  {id:"hoedje",    label:"Hoedje",      icoon:"fa-regular fa-circle",        draai:false},
  {id:"minidoel",  label:"Klein doel",  icoon:"fa-solid fa-goal-net",        draai:true},
  {id:"ring",      label:"Ring",        icoon:"fa-regular fa-circle-dot",    draai:false},
  {id:"mand",      label:"Ballenmand",  icoon:"fa-solid fa-basket-shopping", draai:false}
];
function isMateriaal(type) {
  return MATERIAAL.some(function(m){ return m.id===type; });
}
function materiaalInfo(type) {
  return MATERIAAL.find(function(m){ return m.id===type; }) || null;
}

const ZONE_KLEUREN = [
  {id:"blauw", vul:"rgba(56,150,255,0.30)",  rand:"#5cc4ff", label:"Blauw"},
  {id:"rood",  vul:"rgba(230,60,75,0.28)",   rand:"#ff7b88", label:"Rood"},
  {id:"grijs", vul:"rgba(235,240,246,0.26)", rand:"#ffffff", label:"Grijs"}
];
const ZONE_VORMEN = [
  {id:"zone-cirkel",   icoon:"fa-regular fa-circle", label:"Cirkel",   b:90,  h:90},
  {id:"zone-vierkant", icoon:"fa-regular fa-square", label:"Vierkant", b:90,  h:90},
  {id:"zone-driehoek", icoon:"fa-solid fa-play",     label:"Driehoek", b:110, h:95}
];
function zoneVormInfo(id) {
  return ZONE_VORMEN.find(function(v){ return v.id===id; }) || ZONE_VORMEN[0];
}
function zoneKleurInfo(id) {
  return ZONE_KLEUREN.find(function(z){ return z.id===id; }) || ZONE_KLEUREN[0];
}
function isZone(type) { return String(type||"").indexOf("zone-")===0; }

function afstandTotLijn(px, py, x1, y1, x2, y2) {
  var dx = x2-x1, dy = y2-y1;
  var len2 = dx*dx + dy*dy;
  var t = len2===0 ? 0 : Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / len2));
  var qx = x1 + t*dx, qy = y1 + t*dy;
  return Math.sqrt((px-qx)*(px-qx) + (py-qy)*(py-qy));
}

/* ── PERSPECTIEF: een plat veld schuin projecteren (stadionblik) ── */
const PERSPECTIEF_STANDEN = [
  {id:"plat",  label:"Plat",  k:1,    icoon:"fa-solid fa-square"},
  {id:"licht", label:"Schuin",k:0.68, icoon:"fa-solid fa-panorama"},
  {id:"sterk", label:"Laag",  k:0.46, icoon:"fa-solid fa-mountain-sun"}
];
function perspectiefInfo(id) {
  return PERSPECTIEF_STANDEN.find(function(p){ return p.id===id; }) || PERSPECTIEF_STANDEN[0];
}

/* Projecteert bronCanvas rij voor rij op ctx. k = breedte aan de horizon (1 = plat) */
function projecteerPerspectief(bron, ctx, B, H, k, achtergrond) {
  if (!k || k >= 0.999) { ctx.drawImage(bron, 0, 0, B, H); return; }
  ctx.save();
  ctx.fillStyle = achtergrond || "#0f1a10";
  ctx.fillRect(0, 0, B, H);
  var bh = bron.height, bb = bron.width;
  ctx.imageSmoothingEnabled = true;
  for (var y = 0; y < H; y++) {
    var yy = H === 1 ? 1 : y/(H-1);
    var s = k + (1-k)*yy;                // breedte loopt lineair -> rechte zijkanten
    if (s <= 0.0001) continue;
    var v = yy/s;                        // bronrij loopt niet-lineair -> juiste diepte
    var sy = Math.min(bh-1, Math.max(0, v*(bh-1)));
    var db = B*s, dx = (B-db)/2;
    ctx.drawImage(bron, 0, sy, bb, 1, dx, y, db, 1.4);
  }
  ctx.restore();
}

/* ── ANIMATIE: tussenbeeld tussen twee stappen ── */
function tussenStand(a, b, t) {
  var soepel = t<0.5 ? 2*t*t : -1+(4-2*t)*t; // ease-in-out
  var elemsUit = ((b&&b.elems)||[]).map(function(doel){
    var van = ((a&&a.elems)||[]).find(function(e){ return e.id===doel.id; });
    if (!van) return doel;
    return Object.assign({}, doel, {
      x: van.x + (doel.x-van.x)*soepel,
      y: van.y + (doel.y-van.y)*soepel
    });
  });
  return { elems: elemsUit, lijnen: t>0.75 ? ((b&&b.lijnen)||[]) : ((a&&a.lijnen)||[]) };
}

/* ── Beste video-formaat dat de browser aankan ── */
function kiesVideoFormaat() {
  if (typeof MediaRecorder === "undefined") return null;
  var kandidaten = [
    {mime:"video/mp4;codecs=avc1.42E01E", ext:"mp4"},
    {mime:"video/mp4", ext:"mp4"},
    {mime:"video/webm;codecs=vp9", ext:"webm"},
    {mime:"video/webm;codecs=vp8", ext:"webm"},
    {mime:"video/webm", ext:"webm"}
  ];
  for (var i=0;i<kandidaten.length;i++) {
    try { if (MediaRecorder.isTypeSupported(kandidaten[i].mime)) return kandidaten[i]; } catch(e) {}
  }
  return null;
}

/* ── Bestand delen of downloaden ── */
/* Bewaart het bestand, of biedt het deelmenu aan op een telefoon.
   Op een computer downloaden we altijd: daar opent het deelmenu vaak
   niets zichtbaars en verdwijnt het bestand dan spoorloos.
   De uitkomst komt via de callback terug, want delen gaat asynchroon. */
function bewaarBestand(blob, bestandsnaam) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = bestandsnaam;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
}
function deelOfDownload(blob, bestandsnaam, titel, klaar) {
  function opslaan() { bewaarBestand(blob, bestandsnaam); if (klaar) klaar("gedownload"); }

  var raakscherm = false;
  try { raakscherm = window.matchMedia && window.matchMedia("(pointer: coarse)").matches; } catch(e) {}
  if (!raakscherm) { opslaan(); return; }

  var bestand = null;
  try { bestand = new File([blob], bestandsnaam, {type: blob.type}); } catch(e) {}
  if (!bestand || !navigator.canShare || !navigator.canShare({files:[bestand]}) || !navigator.share) {
    opslaan(); return;
  }
  navigator.share({title: titel, files:[bestand]})
    .then(function(){ if (klaar) klaar("gedeeld"); })
    .catch(function(){ opslaan(); });   // afgebroken of geweigerd: dan toch maar opslaan
}

/* ── Kopregel op een animatieframe ── */
function tekenVideoKop(ctx, W, naam, stapTekst) {
  ctx.save();
  ctx.fillStyle = "rgba(6,26,58,0.82)";
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px 'Helvetica Neue',Arial,sans-serif";
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(String(naam||"Oefening").slice(0,40), 12, 18);
  ctx.textAlign = "right";
  ctx.fillStyle = "#7fd0ff";
  ctx.font = "bold 13px 'Helvetica Neue',Arial,sans-serif";
  ctx.fillText(stapTekst, W-12, 18);
  ctx.restore();
}

/* ── Animatie opnemen als video ── */
function exporteerAnimatieVideo(opties) {
  var stappen = opties.stappen || [];
  var naam = opties.naam || "Oefening";
  var perStap = opties.snelheid || 1200;
  var voortgang = opties.voortgang || function(){};
  var klaar = opties.klaar || function(){};

  if (stappen.length < 2) { klaar("Maak eerst minstens twee stappen."); return null; }
  var formaat = kiesVideoFormaat();
  if (!formaat) { klaar("Deze browser kan geen video opnemen. Gebruik 'Alle stappen' als afbeelding."); return null; }

  var info = VELD_TYPEN.find(function(v){return v.id===opties.veldType;}) || VELD_TYPEN[0];
  /* Even hoog opnemen als een gewone video: een veld van 580 breed
     maal 3 is 1740 pixels, ruim boven Full HD. */
  var vel = scherpCanvas(info.w, info.h, 3);
  var canvas = vel.canvas, ctx = vel.ctx;

  var stream, recorder;
  try {
    stream = canvas.captureStream(30);
    recorder = new MediaRecorder(stream, {mimeType: formaat.mime, videoBitsPerSecond: 3000000});
  } catch(e) { klaar("Opnemen lukte niet: "+e.message); return null; }

  var brokken = [];
  recorder.ondataavailable = function(e){ if (e.data && e.data.size) brokken.push(e.data); };
  recorder.onstop = function(){
    var blob = new Blob(brokken, {type: formaat.mime});
    klaar(null, blob, formaat.ext);
  };

  var aanhoudStart = 600;   // eerste beeld even stil
  var aanhoudEind  = 900;   // laatste beeld even stil
  var beweging = perStap * (stappen.length-1);
  var totaal = aanhoudStart + beweging + aanhoudEind;
  var gestopt = false;
  var begin = null;

  var plat = scherpCanvas(info.w, info.h, vel.factor);
  var vlakCanvas = plat.canvas, vctx = plat.ctx;
  var kBlik = perspectiefInfo(opties.blik||"plat").k;

  function teken(scene, stapTekst) {
    tekenVeld(vctx, info.w, info.h, opties.veldType);
    (scene.lijnen||[]).forEach(function(l){ tekenlijn(vctx, l); });
    (scene.elems||[]).forEach(function(el){ tekenelement(vctx, el); });
    /* Het samenvoegen gebeurt op echte pixels, dus even zonder vergroting */
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    projecteerPerspectief(vlakCanvas, ctx, canvas.width, canvas.height, kBlik);
    ctx.restore();
    tekenVideoKop(ctx, info.w, naam, stapTekst);
  }

  function frame(nu) {
    if (gestopt) return;
    if (begin===null) begin = nu;
    var t = nu - begin;
    var scene, label;
    if (t < aanhoudStart) {
      scene = stappen[0]; label = "Stap 1 / "+stappen.length;
    } else if (t < aanhoudStart + beweging) {
      var v = t - aanhoudStart;
      var i = Math.min(stappen.length-2, Math.floor(v/perStap));
      scene = tussenStand(stappen[i], stappen[i+1], (v - i*perStap)/perStap);
      label = "Stap "+(i+1)+" \u2192 "+(i+2);
    } else {
      scene = stappen[stappen.length-1];
      label = "Stap "+stappen.length+" / "+stappen.length;
    }
    teken(scene, label);
    voortgang(Math.min(100, Math.round(t/totaal*100)));
    if (t >= totaal) {
      gestopt = true;
      try { recorder.stop(); } catch(e) {}
      return;
    }
    requestAnimationFrame(frame);
  }

  teken(stappen[0], "Stap 1 / "+stappen.length);
  try { recorder.start(); } catch(e) { klaar("Opnemen lukte niet: "+e.message); return null; }
  requestAnimationFrame(frame);

  return function afbreken() {
    gestopt = true;
    try { recorder.stop(); } catch(e) {}
  };
}

/* ── Alle stappen naast elkaar als één afbeelding ── */
function maakStappenStrook(stappen, veldType, naam, blik) {
  var info = VELD_TYPEN.find(function(v){return v.id===veldType;}) || VELD_TYPEN[0];
  var n = stappen.length;
  var kolommen = n<=1 ? 1 : (n<=4 ? 2 : 3);
  var rijen = Math.ceil(n/kolommen);
  var marge = 16, kopH = 54, labelH = 26;
  var cel = {w: info.w, h: info.h};
  var W = marge + kolommen*(cel.w+marge);
  var H = kopH + marge + rijen*(labelH+cel.h+marge);

  var vel = scherpCanvas(W, H, EXPORT_FACTOR);
  var canvas = vel.canvas, ctx = vel.ctx;

  ctx.fillStyle = "#f4f6f9"; ctx.fillRect(0,0,W,H);
  var grad = ctx.createLinearGradient(0,0,W,kopH);
  grad.addColorStop(0,"#062f6e"); grad.addColorStop(1,"#004aad");
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,kopH);
  var slogo = logoAfbeelding();
  var sx = marge;
  if (slogo) {
    var sh = 38, sb = Math.round(slogo.naturalWidth/slogo.naturalHeight*sh);
    if (sb > 60) { sb = 60; sh = Math.round(slogo.naturalHeight/slogo.naturalWidth*sb); }
    try { ctx.drawImage(slogo, marge, (kopH-sh)/2, sb, sh); sx = marge + sb + 12; } catch(e) {}
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Helvetica Neue',Arial,sans-serif";
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(String(naam||"Oefening").slice(0,48), sx, kopH/2 - 4);
  ctx.font = "12px 'Helvetica Neue',Arial,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.fillText(teamNaamVol()+"  ·  "+n+" stappen", sx, kopH/2 + 16);

  stappen.forEach(function(s, i){
    var k = i % kolommen, r = Math.floor(i/kolommen);
    var x = marge + k*(cel.w+marge);
    var y = kopH + marge + r*(labelH+cel.h+marge);
    ctx.fillStyle = "#004aad";
    ctx.font = "bold 14px 'Helvetica Neue',Arial,sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("Stap "+(i+1), x, y + labelH/2);

    var tv = scherpCanvas(cel.w, cel.h, EXPORT_FACTOR);
    var tijdelijk = tv.canvas, tctx = tv.ctx;
    tekenVeld(tctx, cel.w, cel.h, veldType);
    (s.lijnen||[]).forEach(function(l){ tekenlijn(tctx, l); });
    (s.elems||[]).forEach(function(el){ tekenelement(tctx, el); });
    var kb = perspectiefInfo(blik||"plat").k;
    if (kb < 0.999) {
      var proj = document.createElement("canvas");
      proj.width = tijdelijk.width; proj.height = tijdelijk.height;
      projecteerPerspectief(tijdelijk, proj.getContext("2d"), proj.width, proj.height, kb);
      ctx.drawImage(proj, x, y + labelH, cel.w, cel.h);
    } else {
      ctx.drawImage(tijdelijk, x, y + labelH, cel.w, cel.h);
    }
  });

  return canvas;
}

/* ── TRAININGSPLAN ALS PDF ── */
const TYPE_PDF_KLEUR = {
  "Warming-up":  [253,126,20],
  "Oefening":    [56,150,255],
  "Positiespel": [40,167,69],
  "Wedstrijdvorm":[0,74,173],
  "Conditie":    [220,53,69],
  "Afkoelen":    [108,117,125]
};

function exporteerTrainingPDF(training, deelIpvOpslaan) {
  if (!window.jspdf) { meldFout("PDF-bibliotheek nog niet geladen. Probeer het zo nog eens."); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({orientation:"portrait", unit:"mm", format:"a4"});
  var W = 210, H = 297, M = 16;
  var onderdelen = training.onderdelen || [];
  var logo = logoAfbeelding();

  function voettekst(pag, totaal) {
    pdfVoet(doc, W, H, {marge:M, pagina:pag, paginas:totaal});
  }

  function kopbalk(titel, rechts, kleur) {
    doc.setTextColor(20,24,31);
    doc.setFont("helvetica","bold");
    var maxT = W - M*2 - 42;
    var tekst = String(titel||"");
    /* lettergrootte verkleinen tot de titel op één regel past */
    var grootte = 17;
    doc.setFontSize(grootte);
    while (grootte > 11 && doc.splitTextToSize(tekst, maxT).length > 1) {
      grootte -= 1;
      doc.setFontSize(grootte);
    }
    var regels = doc.splitTextToSize(tekst, maxT);
    if (regels.length > 1) {
      /* nog steeds te lang: netjes afbreken met puntjes */
      tekst = regels[0].replace(/\s+\S*$/, "") + "…";
    }
    doc.text(tekst, M, 26);
    if (rechts) {
      doc.setFontSize(10.5);
      doc.setTextColor(kleur[0], kleur[1], kleur[2]);
      doc.text(String(rechts).toUpperCase(), W-M, 26, {align:"right"});
    }
    doc.setDrawColor(210,215,222); doc.setLineWidth(0.5);
    doc.line(M, 30, W-M, 30);
  }

  /* een blok met kopje en tekst; geeft de nieuwe y terug */
  function blok(kop, tekst, y, opsomming) {
    if (!tekst || !String(tekst).trim()) return y;
    doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.setTextColor(20,24,31);
    doc.text(String(kop).toUpperCase(), M, y);
    y += 5;
    doc.setFont("helvetica","normal"); doc.setFontSize(9.5);
    doc.setTextColor(60,66,76);
    if (opsomming) {
      String(tekst).split(/\n+/).filter(function(r){return r.trim();}).forEach(function(r){
        var regels = doc.splitTextToSize(r.trim(), W-M*2-5);
        doc.circle(M+1.4, y-1.2, 0.7, "F");
        regels.forEach(function(rr, i){
          doc.text(rr, M+5, y);
          y += 4.6;
        });
        y += 0.8;
      });
    } else {
      var regels = doc.splitTextToSize(String(tekst), W-M*2);
      regels.forEach(function(r){ doc.text(r, M, y); y += 4.6; });
    }
    return y + 4;
  }

  var totaalPag = 1 + onderdelen.length;
  var totaalDuur = onderdelen.reduce(function(s,o){ return s + (Number(o.duur)||0); }, 0);

  /* ── voorblad ── */
  doc.setFillColor(6,47,110); doc.rect(0, 0, W, 46, "F");
  var tx = M;
  if (logo) {
    try {
      var lh = 22, lb = logo.naturalWidth/logo.naturalHeight*lh;
      if (lb > 26) { lb = 26; lh = logo.naturalHeight/logo.naturalWidth*lb; }
      doc.addImage(logo, "PNG", M, (46-lh)/2, lb, lh);
      tx = M + lb + 7;
    } catch(e) {}
  }
  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("TRAININGSPLAN", tx, 18);
  doc.setFontSize(18);
  doc.text(training.datum ? formateerDatum(training.datum) : "Training", tx, 28);
  doc.setFont("helvetica","normal"); doc.setFontSize(9.5);
  doc.setTextColor(200,214,235);
  var meta = [];
  if (training.tijd) meta.push(training.tijd);
  if (training.locatie) meta.push(training.locatie);
  if (training.duur) meta.push(training.duur+" min");
  meta.push(teamNaamVol());
  doc.text(meta.join("   ·   "), tx, 36);

  var y = 60;
  y = blok("Doelstellingen", training.doelstellingen, y);
  y = blok("Voorbereiding", training.voorbereidingen, y);
  y = blok("Materialen", training.materialen, y);

  if (onderdelen.length) {
    doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.setTextColor(20,24,31);
    doc.text("PROGRAMMA", M, y); y += 6;
    doc.setFontSize(9);
    onderdelen.forEach(function(o, i){
      var kleur = TYPE_PDF_KLEUR[o.type] || [56,150,255];
      doc.setFillColor(kleur[0], kleur[1], kleur[2]);
      doc.rect(M, y-3.4, 1.8, 5, "F");
      doc.setFont("helvetica","bold"); doc.setTextColor(20,24,31);
      doc.text((i+1)+".  "+String(o.naam||"Onderdeel"), M+5, y);
      doc.setFont("helvetica","normal"); doc.setTextColor(120,128,140);
      doc.text((o.duur||0)+" min", W-M, y, {align:"right"});
      doc.text(String(o.type||""), W-M-22, y, {align:"right"});
      y += 6.4;
    });
    y += 2;
    doc.setDrawColor(225,229,234); doc.line(M, y, W-M, y); y += 6;
    doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(20,24,31);
    doc.text("Totaal "+totaalDuur+" minuten over "+onderdelen.length+" onderdelen", M, y);
  }
  voettekst(1, totaalPag);

  /* ── één pagina per onderdeel ── */
  onderdelen.forEach(function(o, i){
    doc.addPage();
    var kleur = TYPE_PDF_KLEUR[o.type] || [56,150,255];
    kopbalk(o.naam || ("Onderdeel "+(i+1)), o.type, kleur);

    var y2 = 38;
    /* kerngegevens op één regel */
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.setTextColor(120,128,140);
    var regel = [];
    regel.push((o.duur||0)+" min");
    regel.push((o.aantalSpelers||0)+" spelers");
    if (o.veldGrootte) regel.push(o.veldGrootte);
    if (o.doel) regel.push(o.doel);
    doc.text(regel.join("   ·   "), M, y2);
    y2 += 7;

    /* tekening */
    if (o.tekening) {
      try {
        var cvs = maakTekeningCanvas(o.tekening);
        var beeldB = W - M*2;
        var beeldH = cvs.height / cvs.width * beeldB;
        var maxH = 105;
        if (beeldH > maxH) { beeldH = maxH; beeldB = cvs.width / cvs.height * beeldH; }
        doc.addImage(cvs.toDataURL("image/png"), "PNG", (W-beeldB)/2, y2, beeldB, beeldH);
        y2 += beeldH + 8;
      } catch(e) {}
    }

    y2 = blok("Overzicht", o.beschrijving, y2);
    if (o.materialen) y2 = blok("Materialen", o.materialen, y2);
    if (o.aandachtspunten) {
      if (y2 > H - 50) { voettekst(i+2, totaalPag); doc.addPage(); y2 = 26; }
      y2 = blok("Coachpunten", o.aandachtspunten, y2, true);
    }
    voettekst(i+2, totaalPag);
  });

  var naam = "training-" + (training.datum || "plan");
  if (deelIpvOpslaan) {
    try {
      var blob = doc.output("blob");
      var bestand = new File([blob], naam+".pdf", {type:"application/pdf"});
      if (navigator.canShare && navigator.canShare({files:[bestand]})) {
        navigator.share({title:teamNaamVol()+" – trainingsplan", files:[bestand]}).catch(function(){});
        return;
      }
    } catch(e) { /* valt terug op downloaden */ }
  }
  doc.save(naam + ".pdf");
}

function maakTekeningCanvas(tekening) {
  var vt = (tekening && tekening.veldType) || "leeg";
  var info = VELD_TYPEN.find(function(v){return v.id===vt;}) || VELD_TYPEN[0];
  var vel = scherpCanvas(info.w, info.h, EXPORT_FACTOR);
  var canvas = vel.canvas, ctx = vel.ctx;
  tekenVeld(ctx, info.w, info.h, vt);
  var lijnen = (tekening && tekening.lijnen) || [];
  var elems = (tekening && tekening.elems) || [];
  lijnen.forEach(function(l){ tekenlijn(ctx, l); });
  elems.forEach(function(el){ tekenelement(ctx, el); });
  return canvas;
}

/* Klein voorbeeldje van één frame in de strook onderin */
function FrameMiniatuur({ stap, veldType }) {
  const ref = useRef(null);
  useEffect(function(){
    const c = ref.current;
    if(!c) return;
    const info = VELD_TYPEN.find(function(v){return v.id===veldType;}) || VELD_TYPEN[0];
    const breed = 74;
    const hoog = Math.round(breed * info.h / info.w);
    const f = 2;                                  // miniaturen ook scherp
    if(c.width !== breed*f) { c.width = breed*f; c.height = hoog*f; }
    c.style.height = hoog + "px";
    const ctx = c.getContext("2d");
    /* We tekenen het veld op ware grootte en verkleinen dat in één keer,
       dat geeft een veel nettere miniatuur dan direct klein tekenen. */
    const groot = scherpCanvas(info.w, info.h, 1);
    tekenVeld(groot.ctx, info.w, info.h, veldType);
    ((stap&&stap.lijnen)||[]).forEach(function(l){ tekenlijn(groot.ctx, l); });
    ((stap&&stap.elems)||[]).forEach(function(el){ tekenelement(groot.ctx, el, false); });
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,c.width,c.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(groot.canvas, 0, 0, c.width, c.height);
  }, [stap, veldType]);
  return <canvas ref={ref} className="frame-mini" />;
}

function TrainingTekenBord({ value, onChange, pdfNaam, pdfInfo }) {
  const canvasRef = useRef(null);
  const slepenRef = useRef(null);
  const animRef = useRef(null);
  const [tool, setTool] = useState("speler");
  const [spelNr, setSpelNr] = useState(1);
  const [bezig, setBezig] = useState(null);
  const [muis, setMuis] = useState({x:290,y:195});
  const [veldType, setVeldType] = useState(() => value && value.veldType ? value.veldType : "heel-h");

  // Stappen = keyframes. Oude tekeningen (zonder stappen) worden omgezet naar één stap.
  const [stappen, setStappen] = useState(function(){
    if (value && value.stappen && value.stappen.length) return value.stappen;
    return [{ id:1, elems: (value&&value.elems)||[], lijnen: (value&&value.lijnen)||[] }];
  });
  const [stapIdx, setStapIdx] = useState(0);
  const [speelt, setSpeelt] = useState(false);
  const [snelheid, setSnelheid] = useState(1200);
  const [animStand, setAnimStand] = useState(null); // {elems,lijnen} tijdens afspelen
  const [opname, setOpname] = useState(null); // {pct} tijdens filmen
  const [filmKlaar, setFilmKlaar] = useState(null); // waar het filmpje terechtkwam
  const [gekozenElem, setGekozenElem] = useState(null); // id van geselecteerd element
  const [nieuwFormaat, setNieuwFormaat] = useState(0.55);
  const [zoneKleur, setZoneKleur] = useState("blauw");
  const [bochtKant, setBochtKant] = useState(1);
  const [lijnNr, setLijnNr] = useState(null);      // 1 t/m 20, of niets
  const [lijnDonker, setLijnDonker] = useState(false);
  const [zoneBezig, setZoneBezig] = useState(null); // {type,x,y,b,h} tijdens slepen
  /* Welke soort gereedschap openstaat in de tweede kolom. Begint op de
     dingen die je neerzet, want dat is waar een oefening mee begint. */
  const [paneel, setPaneel] = useState("objecten");
  const [spelerTeam, setSpelerTeam] = useState("speler");
  const [spelerNaamKeuze, setSpelerNaamKeuze] = useState(null);
  const selectie = laadSpelers();
  const afbrekenRef = useRef(null);
  const draaienRef = useRef(null);
  const vlakRef = useRef(null);
  const [blik, setBlik] = useState("plat");
  const [volledig, setVolledig] = useState(false);

  /* Escape sluit het volledige scherm, en de pagina eronder mag niet meescrollen */
  useEffect(function(){
    if(!volledig) return;
    function toets(e){ if(e.key==="Escape") setVolledig(false); }
    var vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", toets);
    return function(){
      document.body.style.overflow = vorige;
      window.removeEventListener("keydown", toets);
    };
  },[volledig]);

  const veiligeIdx = Math.min(stapIdx, stappen.length-1);
  const huidige = stappen[veiligeIdx] || {elems:[], lijnen:[]};
  const elems = animStand ? animStand.elems : huidige.elems;
  const lijnen = animStand ? animStand.lijnen : huidige.lijnen;
  const veldInfo = VELD_TYPEN.find(function(v){return v.id===veldType;})||VELD_TYPEN[0];
  /* Eén keer bepalen hoeveel echte pixels we per logische eenheid tekenen */
  const [factor, setFactor] = useState(schermFactor);
  const doekRef = useRef(null);

  /* Het veld past zich aan de beschikbare ruimte aan, en de interne
     resolutie schaalt mee. Wordt het veld twee keer zo groot getoond,
     dan tekenen we ook twee keer zoveel pixels — anders zou juist in
     volledig scherm de scherpte weer weglopen. */
  useEffect(function(){
    const doek = doekRef.current, c = canvasRef.current;
    if(!doek || !c) return;

    /* Het veld wordt in de vaste tekenruimte gepast, gecentreerd, en
       nooit groter dan die ruimte. Vroeger gold dit alleen in volledig
       scherm en liet ik het er ingebed door de CSS op de verhouding van
       het veld doen — precies waardoor alles verschoof bij een andere
       veldkeuze. Nu is het overal hetzelfde. */
    function meet() {
      const dpr = (window.devicePixelRatio) || 1;
      const bb = doek.clientWidth, bh = doek.clientHeight;
      if (!bb || !bh) { setTimeout(meet, 60); return; }   /* nog niet opgemaakt */
      const s = Math.min(bb/veldInfo.w, bh/veldInfo.h);
      const breed = Math.max(160, Math.floor(veldInfo.w*s));
      c.style.width  = breed + "px";
      c.style.height = Math.floor(veldInfo.h*s) + "px";
      const nodig = Math.min(5, Math.max(2, Math.ceil(breed*dpr/veldInfo.w)));
      setFactor(function(f){ return f===nodig ? f : nodig; });
    }

    meet();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", meet);
      return function(){ window.removeEventListener("resize", meet); };
    }
    const ro = new ResizeObserver(meet);
    ro.observe(doek);
    return function(){ ro.disconnect(); };
  }, [volledig, veldInfo.w, veldInfo.h]);
  const isVerplaatsen = tool === "verplaatsen";
  const meerdereStappen = stappen.length > 1;

  function wijzigStap(velden) {
    setStappen(function(l){
      return l.map(function(s,i){ return i===veiligeIdx ? Object.assign({},s,velden) : s; });
    });
  }
  /* Ongedaan maken keek eerst alleen naar de elementen: zolang er nog
     één poppetje op het veld stond kwam je nooit bij je lijnen. Nu
     bewaren we een echte geschiedenis van momentopnames. */
  const geschiedenisRef = useRef([]);
  const [kanTerug, setKanTerug] = useState(false);

  function onthoud() {
    var s = stappen[veiligeIdx] || {elems:[], lijnen:[]};
    geschiedenisRef.current.push({
      idx: veiligeIdx,
      elems: (s.elems||[]).map(function(e){ return Object.assign({}, e); }),
      lijnen: (s.lijnen||[]).map(function(l){ return Object.assign({}, l); })
    });
    if (geschiedenisRef.current.length > 60) geschiedenisRef.current.shift();
    setKanTerug(true);
  }

  function maakOngedaan() {
    if (speelt) return;
    var vorig = geschiedenisRef.current.pop();
    setKanTerug(geschiedenisRef.current.length > 0);
    if (!vorig) { toon("Niets meer om ongedaan te maken"); return; }
    setGekozenElem(null);
    setStappen(function(l){
      return l.map(function(s,i){
        return i===vorig.idx ? Object.assign({}, s, {elems:vorig.elems, lijnen:vorig.lijnen}) : s;
      });
    });
  }

  function zetElems(fn) {
    setStappen(function(l){
      return l.map(function(s,i){
        return i===veiligeIdx ? Object.assign({},s,{elems: typeof fn==="function" ? fn(s.elems) : fn}) : s;
      });
    });
  }
  function wijzigElem(id, velden) {
    zetElems(function(prev){
      return prev.map(function(e){ return e.id===id ? Object.assign({},e,velden) : e; });
    });
  }
  function schaalGekozen(richting) {
    var el = elems.find(function(e){ return e.id===gekozenElem; });
    if (!el) return;
    onthoud();
    if (isZone(el.type)) {
      var f = richting>0 ? 1.15 : 1/1.15;
      wijzigElem(el.id, {
        b: Math.max(24, Math.min(900, Math.round((Number(el.b)||70)*f))),
        h: Math.max(24, Math.min(900, Math.round((Number(el.h)||70)*f)))
      });
      return;
    }
    var nieuw = Math.max(0.4, Math.min(3, Math.round(((Number(el.schaal)||1) + richting*0.15)*100)/100));
    wijzigElem(el.id, {schaal:nieuw});
  }
  function draaiGekozen(graden) {
    var el = elems.find(function(e){ return e.id===gekozenElem; });
    if (!el) return;
    onthoud();
    var h = (((Number(el.hoek)||0) + graden) % 360 + 360) % 360;
    wijzigElem(el.id, {hoek:h});
  }
  function zetHoek(graden) {
    if (gekozenElem===null) return;
    onthoud();
    wijzigElem(gekozenElem, {hoek:((graden%360)+360)%360});
  }

  function verwijderGekozen() {
    onthoud();
    if (gekozenElem===null) return;
    zetElems(function(prev){ return prev.filter(function(e){ return e.id!==gekozenElem; }); });
    setGekozenElem(null);
  }
  const gekozenObject = elems.find(function(e){ return e.id===gekozenElem; }) || null;
  const ELEM_NAMEN = {speler:"Speler", "speler-rood":"Speler", bal:"Bal", pion:"Pion", goal:"Doel",
                      cirkel:"Zone", notitie:"Coachpunt", "zone-cirkel":"Zone", "zone-vierkant":"Zone",
                      "zone-driehoek":"Zone", "zone-vak":"Zone",
                      dummy:"Pop", ladder:"Speedladder", hordje:"Hordje", stok:"Slalomstok",
                      hoedje:"Hoedje", minidoel:"Klein doel", ring:"Ring", mand:"Ballenmand"};

  function zetLijnen(fn) {
    setStappen(function(l){
      return l.map(function(s,i){
        return i===veiligeIdx ? Object.assign({},s,{lijnen: typeof fn==="function" ? fn(s.lijnen) : fn}) : s;
      });
    });
  }

  function voegStapToe() {
    stopAnimatie();
    setStappen(function(l){
      var bron = l[veiligeIdx] || {elems:[],lijnen:[]};
      var kopie = {
        id: Date.now(),
        elems: bron.elems.map(function(e){ return Object.assign({},e); }),
        lijnen: []
      };
      var nieuw = l.slice(0, veiligeIdx+1).concat([kopie], l.slice(veiligeIdx+1));
      return nieuw;
    });
    setStapIdx(veiligeIdx+1);
    setTool("verplaatsen");
    toon("Stap toegevoegd. Sleep de spelers naar hun nieuwe plek.");
  }

  function verwijderStap() {
    if (stappen.length<=1) return;
    stopAnimatie();
    var weg = stappen[veiligeIdx];
    var positie = veiligeIdx;
    setStappen(function(l){ return l.filter(function(s,i){ return i!==positie; }); });
    setStapIdx(Math.max(0, positie-1));
    toon("Stap "+(positie+1)+" verwijderd", {
      actie: function(){
        setStappen(function(l){ return l.slice(0,positie).concat([weg], l.slice(positie)); });
        setStapIdx(positie);
      }
    });
  }

  function stopAnimatie() {
    if (animRef.current) { cancelAnimationFrame(animRef.current.frame); animRef.current = null; }
    setSpeelt(false);
    setAnimStand(null);
  }

  function speelAf() {
    if (stappen.length<2) return;
    stopAnimatie();
    setSpeelt(true);
    var begin = performance.now();
    var perStap = snelheid;
    var totaal = perStap * (stappen.length-1);
    animRef.current = {frame:null};
    function stap(nu) {
      var verstreken = nu - begin;
      if (verstreken >= totaal) {
        setAnimStand(null);
        setSpeelt(false);
        setStapIdx(stappen.length-1);
        animRef.current = null;
        return;
      }
      var index = Math.floor(verstreken / perStap);
      var t = (verstreken % perStap) / perStap;
      setAnimStand(tussenStand(stappen[index], stappen[index+1], t));
      animRef.current.frame = requestAnimationFrame(stap);
    }
    animRef.current.frame = requestAnimationFrame(stap);
  }

  useEffect(function(){ return function(){
    if (animRef.current) cancelAnimationFrame(animRef.current.frame);
    if (afbrekenRef.current) afbrekenRef.current();
  }; },[]);

  function maakFilm() {
    if (stappen.length<2) { meldFout("Maak eerst minstens twee stappen."); return; }
    stopAnimatie();
    setOpname({pct:0});
    afbrekenRef.current = exporteerAnimatieVideo({
      stappen: stappen,
      veldType: veldType,
      blik: blik,
      snelheid: snelheid,
      naam: pdfNaam || "Oefening",
      voortgang: function(p){ setOpname({pct:p}); },
      klaar: function(fout, blob, ext){
        setOpname(null);
        afbrekenRef.current = null;
        if (fout) { meldFout(fout); return; }
        var bestandsnaam = (pdfNaam||"oefening").replace(/[^a-z0-9\-_ ]/gi,"").trim().replace(/\s+/g,"-").toLowerCase() + "." + ext;
        var mb = (blob.size/1048576).toFixed(1);
        /* De blob bewaren, zodat je hem opnieuw kunt opslaan als het misging */
        deelOfDownload(blob, bestandsnaam, teamNaamVol()+" – "+(pdfNaam||"Oefening"), function(hoe){
          setFilmKlaar({naam: bestandsnaam, hoe: hoe, mb: mb, blob: blob});
        });
      }
    });
  }

  function maakStrook() {
    var canvas = maakStappenStrook(stappen, veldType, pdfNaam || "Oefening", blik);
    deelTekeningAlsPNG(canvas, (pdfNaam||"oefening")+" - alle stappen");
  }

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    /* Van schermpixels terug naar logische veldeenheden */
    const sx = canvas.width  / r.width  / factor;
    const sy = canvas.height / r.height / factor;
    const src = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function vindElemIndex(x, y, huidigeElems) {
    const cvs = canvasRef.current;
    const mctx = cvs ? cvs.getContext("2d") : null;
    for (let i = huidigeElems.length - 1; i >= 0; i--) {
      const el = huidigeElems[i];
      const dx = x - el.x, dy = y - el.y;
      if (el.type === "notitie") {
        if (!mctx) continue;
        const kk = Math.max(0.4, Math.min(3, Number(el.schaal)||1));
        const o = notitieOpmaak(mctx, el, kk);
        if (Math.abs(dx) <= o.b/2 && Math.abs(dy) <= o.h/2) return i;
        continue;
      }
      if (isZone(el.type)) {
        if (Math.abs(dx) <= (Number(el.b)||70)/2 && Math.abs(dy) <= (Number(el.h)||70)/2) return i;
        continue;
      }
      const hit = (el.type === "cirkel" ? 32 : el.type === "goal" ? 22
                  : el.type === "ladder" ? 32 : el.type === "minidoel" ? 20
                  : el.type === "dummy" || el.type === "stok" ? 16 : 17) * (Number(el.schaal)||1);
      if (Math.sqrt(dx*dx + dy*dy) < hit) return i;
    }
    return -1;
  }

  function handleDown(e) {
    if (speelt || blik!=="plat") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    if (tool === "gum") {
      const idx = vindElemIndex(pos.x, pos.y, elems);
      if (idx >= 0) {
        const weg = elems[idx];
        onthoud();
        zetElems(function(prev){ return prev.filter(function(e){ return e.id!==weg.id; }); });
        if (gekozenElem===weg.id) setGekozenElem(null);
        return;
      }
      let besteLijn = -1, besteAfstand = 14;
      lijnen.forEach(function(l, i){
        const a = afstandTotLijn(pos.x, pos.y, l.x1, l.y1, l.x2, l.y2);
        if (a < besteAfstand) { besteAfstand = a; besteLijn = i; }
      });
      if (besteLijn >= 0) {
        onthoud();
        zetLijnen(function(prev){ return prev.filter(function(l,i){ return i!==besteLijn; }); });
      }
      return;
    }
    if (tool === "verplaatsen") {
      /* eerst kijken of de draaigreep is geraakt */
      const gk = elems.find(function(e){ return e.id===gekozenElem; });
      if (gk && draaibaar(gk.type)) {
        const kk = Math.max(0.4, Math.min(3, Number(gk.schaal)||1));
        const hh = (Number(gk.hoek)||0) * Math.PI/180;
        const R = draaiAfstand(gk, kk);
        const hx = gk.x + Math.sin(hh)*R, hy = gk.y - Math.cos(hh)*R;
        if (Math.sqrt((pos.x-hx)*(pos.x-hx) + (pos.y-hy)*(pos.y-hy)) < 16) {
          draaienRef.current = {id: gk.id};
          return;
        }
      }
      const idx = vindElemIndex(pos.x, pos.y, elems);
      if (idx >= 0) {
        onthoud();   // één momentopname per sleepbeweging, niet per muisbeweging
        slepenRef.current = {idx, startX:pos.x, startY:pos.y, origX:elems[idx].x, origY:elems[idx].y};
        setGekozenElem(elems[idx].id);
      } else {
        setGekozenElem(null);
      }
      return;
    }
    if (isZone(tool)) {
      const vi = zoneVormInfo(tool);
      setZoneBezig({type:tool, x:pos.x, y:pos.y, b:vi.b, h:vi.h});
      return;
    }
    if (tool === "notitie") {
      const tekst = prompt("Welk coachpunt wil je erbij zetten?", "");
      if (tekst && tekst.trim()) {
        const nn = {id:Date.now(), type:"notitie", x:pos.x, y:pos.y, tekst:tekst.trim(), schaal:nieuwFormaat};
        onthoud();
        zetElems(function(prev){ return prev.concat([nn]); });
        setGekozenElem(nn.id);
      }
      return;
    }
    if (LIJN_TOOLS.indexOf(tool) >= 0) {
      setBezig({x1:pos.x, y1:pos.y});
    } else {
      var metNummer = (tool==="speler" || tool==="speler-rood");
      const el = {id:Date.now(), type:tool, x:pos.x, y:pos.y, schaal:nieuwFormaat};
      if (metNummer) el.nr = spelNr;
      if (spelerNaamKeuze && (tool==="speler"||tool==="speler-rood")) el.naam = spelerNaamKeuze;
      onthoud();
      zetElems(function(prev){ return prev.concat([el]); });
      setGekozenElem(el.id);
    }
  }

  function handleMove(e) {
    if (speelt || blik!=="plat") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    setMuis(pos);
    if (draaienRef.current) {
      const gk = elems.find(function(el){ return el.id===draaienRef.current.id; });
      if (gk) {
        let graden = Math.atan2(pos.x - gk.x, -(pos.y - gk.y)) * 180/Math.PI;
        graden = Math.round(graden/5)*5;              // vastklikken op 5 graden
        graden = ((graden % 360) + 360) % 360;
        wijzigElem(gk.id, {hoek: graden});
      }
      return;
    }
    if (zoneBezig) {
      const b = Math.max(24, Math.abs(pos.x - zoneBezig.x)*2);
      const h = Math.max(24, Math.abs(pos.y - zoneBezig.y)*2);
      setZoneBezig(function(z){ return z ? Object.assign({},z,{b:b,h:h}) : z; });
      return;
    }
    if (slepenRef.current !== null) {
      const { idx, startX, startY, origX, origY } = slepenRef.current;
      const nx = origX + (pos.x - startX);
      const ny = origY + (pos.y - startY);
      zetElems(function(prev){ return prev.map(function(el,i){ return i===idx ? Object.assign({},el,{x:nx,y:ny}) : el; }); });
    }
  }

  function handleUp(e) {
    if (speelt || blik!=="plat") return;
    if (draaienRef.current) { draaienRef.current = null; return; }
    if (zoneBezig) {
      const nieuw = {id:Date.now(), type:zoneBezig.type, x:zoneBezig.x, y:zoneBezig.y,
                     b:Math.round(zoneBezig.b), h:Math.round(zoneBezig.h), kleur:zoneKleur};
      onthoud();
      zetElems(function(prev){ return prev.concat([nieuw]); });
      setGekozenElem(nieuw.id);
      setZoneBezig(null);
      return;
    }
    if (slepenRef.current !== null) { slepenRef.current = null; return; }
    if (!bezig) return;
    const canvas = canvasRef.current;
    if (!canvas) { setBezig(null); return; }
    const pos = getPos(e, canvas);
    const dx = pos.x - bezig.x1, dy = pos.y - bezig.y1;
    if (Math.sqrt(dx*dx+dy*dy) > 8) {
      const newL = {id:Date.now(), type:tool, x1:bezig.x1, y1:bezig.y1, x2:pos.x, y2:pos.y, bocht:bochtKant};
      if (lijnNr) { newL.nr = lijnNr; newL.nrDonker = lijnDonker; }
      onthoud();
      zetLijnen(function(prev){ return prev.concat([newL]); });
    }
    setBezig(null);
  }

  useEffect(() => {
    if (onChange) onChange({
      elems: stappen[0] ? stappen[0].elems : [],
      lijnen: stappen[0] ? stappen[0].lijnen : [],
      veldType: veldType,
      stappen: stappen
    });
  }, [stappen, veldType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = veldInfo.w, H = veldInfo.h;          // logische maat
    const S = factor;                               // hoeveel pixels per eenheid
    const info = perspectiefInfo(blik);

    if (!vlakRef.current) vlakRef.current = document.createElement("canvas");
    const vlak = vlakRef.current;
    if (vlak.width !== W*S || vlak.height !== H*S) { vlak.width = W*S; vlak.height = H*S; }
    const ctx = vlak.getContext("2d");
    ctx.setTransform(S,0,0,S,0,0);
    ctx.clearRect(0,0,W,H);

    tekenVeld(ctx, W, H, veldType);
    lijnen.forEach(l => tekenlijn(ctx, l));
    if (!speelt && bezig && LIJN_TOOLS.indexOf(tool)>=0) {
      tekenlijn(ctx, {type:tool, x1:bezig.x1, y1:bezig.y1, x2:muis.x, y2:muis.y,
                      bocht:bochtKant, nr:lijnNr, nrDonker:lijnDonker});
    }
    elems.forEach(el => tekenelement(ctx, el, !speelt && el.id===gekozenElem && blik==="plat"));
    if (zoneBezig) tekenelement(ctx, Object.assign({}, zoneBezig, {kleur:zoneKleur}), false);

    /* Samenvoegen op echte pixels, dus zonder vergrotingsmatrix */
    const zicht = canvas.getContext("2d");
    zicht.setTransform(1,0,0,1,0,0);
    zicht.clearRect(0,0,canvas.width,canvas.height);
    projecteerPerspectief(vlak, zicht, canvas.width, canvas.height, info.k);
  }, [elems, lijnen, bezig, muis, tool, veldType, speelt, gekozenElem, zoneBezig, zoneKleur, blik, factor]);

  function kiesLosNummer(t, nr) { setTool(t); setSpelNr(nr); setSpelerNaamKeuze(null); }

  const RUGNUMMERS = [1,2,3,4,5,6,7,8,9,10,11];
  const LIJN_KNOPPEN = [
    {t:"looplijn",    l:"Loop",    i:"fa-solid fa-arrow-right-long"},
    {t:"passlijn",    l:"Pas",     i:"fa-solid fa-arrow-right-to-bracket"},
    {t:"schietlijn",  l:"Schot",   i:"fa-solid fa-bolt"},
    {t:"dribbellijn", l:"Drib",    i:"fa-solid fa-wave-square"},
    {t:"voorzetlijn", l:"Voorzet", i:"fa-solid fa-arrow-turn-up"}
  ];

  const OBJECTEN = [
    {t:"bal",     l:"Bal",       tekst:"\u26bd"},
    {t:"pion",    l:"Pion",      tekst:"\ud83d\udd3a"},
    {t:"goal",    l:"Doel",      tekst:"\ud83e\udd45"},
    {t:"notitie", l:"Coachpunt", icoon:"fa-solid fa-comment-dots"}
  ];

  /* Een soort kiezen opent de tweede kolom, en zet meteen een
     gereedschap klaar dat bij die soort hoort — anders kies je "lijnen"
     en tekent je volgende tik nog steeds een pion.

     Nog een keer op dezelfde soort tikken klapt de kolom weer dicht. Op
     een tablet langs de lijn is dat het verschil tussen een veld van
     zeshonderd pixels breed en een van achthonderd. */
  function kiesSoort(id) {
    if (paneel === id) { setPaneel(null); return; }
    setPaneel(id);
    setGekozenElem(null);
    if (id === "objecten" && OBJECTEN.every(function(o){ return tool !== o.t; }))
      setTool("bal");
    if (id === "materiaal" && !isMateriaal(tool)) setTool(MATERIAAL[0].id);
    if (id === "zone" && !isZone(tool)) setTool(ZONE_VORMEN[0].id);
    if (id === "lijnen" && !LIJN_KNOPPEN.some(function(o){ return o.t === tool; }))
      setTool(LIJN_KNOPPEN[0].t);
  }

  function railKnop(o) {
    var aan = o.aan;
    return (
      <button key={o.sleutel} className={"rail-knop"+(aan?" actief":"")} title={o.titel}
        style={aan&&o.kleur?{borderColor:o.kleur,background:o.kleur,color:"var(--op-kleur)"}:{}}
        onClick={o.klik}>
        {o.tekst ? <span className="rail-tekst">{o.tekst}</span> : <i className={o.icoon}/>}
      </button>
    );
  }

  /* Eén rij nummerknoppen voor een team */
  function teamRij(team, kleur) {
    return (
      <div className="bord-knoppen">
        {RUGNUMMERS.concat(["A","V"]).map(function(nr){
          var aan = tool===team && spelNr===nr;
          var letter = typeof nr === "string";
          return (
            <button key={team+nr} className="nr-knop"
              title={nr==="A"?"Aanvaller":nr==="V"?"Verdediger":undefined}
              style={{fontWeight:letter?800:700,
                borderColor:aan?kleur:"var(--grijs)",
                background:aan?kleur:"var(--wit)",
                color:aan?"var(--op-kleur)":"var(--grijs-donker)"}}
              onClick={function(){ kiesLosNummer(team, nr); }}>
              {nr}
            </button>
          );
        })}
      </div>
    );
  }

  /* ══ DE GEREEDSCHAPSKOLOM ══════════════════════════════════
     Eén smalle kolom met soorten, en daarnaast een kolom met wat er
     binnen die soort te kiezen valt.

     Hiervoor stond alles in één rail: twee handelingen, vier objecten,
     zes lijnsoorten en drie knoppen die een paneel openklapten — bij
     elkaar meer dan twintig vakjes van 38 bij 34, in twee kolommen naast
     een veld dat daardoor de helft van zijn ruimte kwijt was.

     Nu is de vraag eerst "waarmee?" en pas daarna "welke?". Zeven
     soorten passen in één kolom van 56 pixels, de tweede kolom laat
     alleen zien wat bij je keuze hoort, en het veld krijgt de rest.

     Verplaatsen, gum, ongedaan en wissen staan buiten de soorten: dat
     zijn handelingen die je bij elk gereedschap nodig hebt, en die hoor
     je niet te moeten opzoeken.
     ══════════════════════════════════════════════════════════ */
  const railBlok = (
        <div className="bord-rail">
          {railKnop({sleutel:"hand", icoon:"fa-solid fa-hand-pointer", titel:"Verplaatsen en selecteren",
            aan:isVerplaatsen, kleur:"var(--oranje)", klik:function(){ setTool("verplaatsen"); }})}
          {railKnop({sleutel:"gum", icoon:"fa-solid fa-eraser", titel:"Gum: tik om te wissen",
            aan:tool==="gum", kleur:"var(--gevaar)", klik:function(){ setTool("gum"); setGekozenElem(null); }})}

          <div className="rail-scheiding"/>
          {BORD_SOORTEN.map(function (s) {
            return railKnop({sleutel:s.id, icoon:s.icoon, titel:s.label,
              aan: paneel === s.id,
              kleur: (s.id==="zone" && isZone(tool)) ? zoneKleurInfo(zoneKleur).rand : null,
              klik:function(){ kiesSoort(s.id); }});
          })}

          <div className="rail-scheiding"/>
          {railKnop({sleutel:"ongedaan", icoon:"fa-solid fa-rotate-left",
            titel: kanTerug ? "Laatste actie ongedaan maken" : "Nog niets om ongedaan te maken",
            aan:false, klik:maakOngedaan})}
          {railKnop({sleutel:"wis", icoon:"fa-solid fa-trash", titel:"Alles op deze stap wissen", aan:false,
            klik:function(){ if(speelt) return; onthoud(); setGekozenElem(null); wijzigStap({elems:[], lijnen:[]}); }})}
        </div>
  );

  const veldBlok = (
        <div className="bord-veld">
          <div className="bord-doek" ref={doekRef}>
          <canvas
            ref={canvasRef}
            width={veldInfo.w*factor} height={veldInfo.h*factor}
            className="teken-veld"
            style={{aspectRatio: veldInfo.w+" / "+veldInfo.h,
              cursor: speelt ? "default" : (draaienRef.current ? "grabbing" : (isVerplaatsen ? "grab" : (tool==="gum" ? "cell" : "crosshair")))}}
            onMouseDown={handleDown}
            onMouseMove={handleMove}
            onMouseUp={handleUp}
            onMouseLeave={handleUp}
            onTouchStart={handleDown}
            onTouchMove={handleMove}
            onTouchEnd={handleUp}
          />
          {!volledig && (
            <button className="bord-groot" onClick={function(){ setVolledig(true); }}
              title="Groter tekenen, druk Escape om terug te gaan">
              <i className="fa-solid fa-up-right-and-down-left-from-center"/> Groot
            </button>
          )}
          </div>
          {isZone(tool) && !speelt && (
            <div style={{fontSize:11,color:"var(--grijs-donker)",marginTop:5}}>
              <i className="fa-solid fa-circle-info"/> Tik om te plaatsen, ingedrukt houden en slepen maakt hem groter.
            </div>
          )}
          {blik!=="plat" && (
            <div style={{fontSize:11,color:"var(--oranje)",fontWeight:700,marginTop:5}}>
              <i className="fa-solid fa-lock"/> In schuine weergave kun je niet tekenen. Zet terug op Plat.
            </div>
          )}
        </div>
  );

  /* Staat er niets open en is er niets geselecteerd, dan is er ook geen
     tweede kolom — en krijgt het veld die ruimte erbij. */
  const zijLeeg = !paneel && !(gekozenObject && !speelt);
  const zijBlok = zijLeeg ? null : (
        <div className={"bord-zij"+(paneel==="veld"?" smal":"")}>

          {/* ── Bal, pion, doel, coachpunt ──
              Vier dingen die je neerzet met één tik. Ze stonden los in
              de rail; daar hoorden ze niet, want ze zijn niet vaker
              nodig dan een hordje of een zone. */}
          {paneel==="objecten" && (
            <div className="bord-vak">
              <div className="bord-vak-kop">Zet neer</div>
              <div className="bord-knoppen">
                {OBJECTEN.map(function(o){
                  var aan = tool===o.t;
                  return (
                    <button key={o.t} className="rail-knop" title={o.l}
                      style={{borderColor:aan?"var(--blauw)":"var(--grijs)",
                              background:aan?"var(--blauw)":"var(--wit)",
                              color:aan?"var(--op-kleur)":"var(--grijs-donker)"}}
                      onClick={function(){ setTool(o.t); setGekozenElem(null); }}>
                      {o.icoon ? <i className={o.icoon}/> : <span style={{fontSize:15}}>{o.tekst}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Lijnen en pijlen ── */}
          {paneel==="lijnen" && (
            <div className="bord-vak">
              <div className="bord-vak-kop">Soort lijn</div>
              <div className="bord-knoppen">
                {LIJN_KNOPPEN.map(function(o){
                  var aan = tool===o.t;
                  return (
                    <button key={o.t} className="rail-knop" title={o.l}
                      style={{borderColor:aan?"var(--blauw)":"var(--grijs)",
                              background:aan?"var(--blauw)":"var(--wit)",
                              color:aan?"var(--op-kleur)":"var(--grijs-donker)"}}
                      onClick={function(){ setTool(o.t); setGekozenElem(null); }}>
                      <i className={o.i}/>
                    </button>
                  );
                })}
              </div>
              {tool==="voorzetlijn" && (
                <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
                  onClick={function(){ setBochtKant(function(b){ return b===1?-1:1; }); }}>
                  <i className={bochtKant===1?"fa-solid fa-arrow-rotate-right":"fa-solid fa-arrow-rotate-left"}/>
                  {" Andere kant op buigen"}
                </button>
              )}
            </div>
          )}

          {paneel==="materiaal" && (
            <div className="bord-vak">
              <div className="bord-vak-kop">Materiaal
                <button className="knop lijn klein" style={{padding:"3px 8px",fontSize:10}}
                  onClick={function(){setPaneel(null);}} title="Kolom dichtklappen">
                  <i className="fa-solid fa-chevron-left"/>
                </button>
              </div>
              <div className="bord-knoppen">
                {MATERIAAL.map(function(m){
                  var aan = tool===m.id;
                  return (
                    <button key={m.id} className="rail-knop" title={m.label}
                      style={{borderColor:aan?"var(--blauw)":"var(--grijs)",
                              background:aan?"var(--blauw)":"var(--wit)",
                              color:aan?"var(--op-kleur)":"var(--grijs-donker)"}}
                      onClick={function(){ setTool(m.id); setGekozenElem(null); }}>
                      <i className={m.icoon}/>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {paneel==="zone" && (
            <div className="bord-vak">
              <div className="bord-vak-kop">Zone
                <button className="knop lijn klein" style={{padding:"3px 8px",fontSize:10}}
                  onClick={function(){setPaneel(null);}} title="Kolom dichtklappen">
                  <i className="fa-solid fa-chevron-left"/>
                </button>
              </div>
              <div className="bord-knoppen" style={{marginBottom:8}}>
                {ZONE_VORMEN.map(function(z){
                  var aan = tool===z.id;
                  return (
                    <button key={z.id} className="rail-knop" title={z.label}
                      style={{borderColor:aan?zoneKleurInfo(zoneKleur).rand:"var(--grijs)",
                              background:aan?zoneKleurInfo(zoneKleur).rand:"var(--wit)",
                              color:aan?"#fff":"var(--grijs-donker)"}}
                      onClick={function(){ setTool(z.id); setGekozenElem(null); }}>
                      <i className={z.icoon}/>
                    </button>
                  );
                })}
              </div>
              <div className="bord-knoppen">
                {ZONE_KLEUREN.map(function(k){
                  var aan = zoneKleur===k.id;
                  return (
                    <button key={k.id} className="rail-knop" title={k.label}
                      style={{borderColor:aan?k.rand:"var(--grijs)",background:k.vul}}
                      onClick={function(){ setZoneKleur(k.id); }}>
                      {aan && <i className="fa-solid fa-check" style={{color:k.rand}}/>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {paneel==="spelers" && (
            <div className="bord-vak">
              <div className="bord-vak-kop">Uit je selectie
                <button className="knop lijn klein" style={{padding:"3px 8px",fontSize:10}}
                  onClick={function(){setPaneel(null);}} title="Kolom dichtklappen">
                  <i className="fa-solid fa-chevron-left"/>
                </button>
              </div>
              {spelerNaamKeuze && (
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,fontSize:11}}>
                  <span style={{color:"var(--grijs-donker)"}}>Naam erbij:</span>
                  <strong style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{spelerNaamKeuze}</strong>
                  <button className="knop lijn klein" style={{marginLeft:"auto",padding:"3px 7px",fontSize:10}}
                    onClick={function(){ setSpelerNaamKeuze(null); }}>Zonder naam</button>
                </div>
              )}
              <div className="bord-knoppen" style={{marginBottom:8}}>
                {[{id:"speler",label:"Blauw",kleur:"var(--blauw)"},{id:"speler-rood",label:"Rood",kleur:"var(--gevaar)"}].map(function(t){
                  var aan = spelerTeam===t.id;
                  return (
                    <button key={t.id} className="knop lijn klein" style={{flex:1,justifyContent:"center",padding:"5px 8px",fontSize:11,
                        borderColor:aan?t.kleur:"var(--grijs)",color:aan?t.kleur:"var(--grijs-donker)"}}
                      onClick={function(){ setSpelerTeam(t.id); }}>{t.label}</button>
                  );
                })}
              </div>
              {selectie.length===0 ? (
                <div style={{fontSize:11,color:"var(--grijs-donker)",lineHeight:1.5}}>
                  Je hebt nog geen spelers in je selectie staan.
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:190,overflowY:"auto"}}>
                  {selectie.map(function(sp){
                    var aan = spelerNaamKeuze===sp.naam;
                    return (
                      <button key={sp.id} className="knop lijn klein"
                        style={{justifyContent:"flex-start",padding:"5px 8px",fontSize:11,
                          borderColor:aan?"var(--blauw)":"var(--grijs)",
                          background:aan?"var(--vlak-info)":"var(--wit)"}}
                        onClick={function(){
                          setTool(spelerTeam);
                          setSpelNr(sp.rugnummer||sp.naam.charAt(0).toUpperCase());
                          setSpelerNaamKeuze(sp.naam);
                        }}>
                        <span style={{fontWeight:800,minWidth:16}}>{sp.rugnummer||"–"}</span>
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sp.naam}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Geselecteerd element */}
          {gekozenObject && !speelt ? (
            <div className="bord-vak" style={{borderColor:"var(--blauw)"}}>
              <div className="bord-vak-kop" style={{color:"var(--blauw)"}}>
                <i className="fa-solid fa-arrows-up-down-left-right"/>
                {(ELEM_NAMEN[gekozenObject.type]||"Element")
                  + ((gekozenObject.type==="speler"||gekozenObject.type==="speler-rood") && gekozenObject.nr
                      ? " "+gekozenObject.nr : "")}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <button className="elem-stap" title="Kleiner" onClick={function(){schaalGekozen(-1);}}>−</button>
                <span className="elem-maat" style={{flex:1,textAlign:"center"}}>{Math.round((Number(gekozenObject.schaal)||1)*100)+"%"}</span>
                <button className="elem-stap" title="Groter" onClick={function(){schaalGekozen(1);}}>+</button>
                <button className="knop lijn klein" style={{padding:"4px 8px",fontSize:10}}
                  onClick={function(){ wijzigElem(gekozenObject.id,{schaal: gekozenObject.type==="goal"?0.55:1}); }}>
                  {gekozenObject.type==="goal"?"55%":"100%"}
                </button>
              </div>

              {draaibaar(gekozenObject.type) && (
                <div style={{borderTop:"1px solid var(--grijs)",paddingTop:8,marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    <button className="elem-stap" title="Linksom" onClick={function(){ draaiGekozen(-15); }}><i className="fa-solid fa-rotate-left"/></button>
                    <span className="elem-maat" style={{flex:1,textAlign:"center"}}>{Math.round(Number(gekozenObject.hoek)||0)+"°"}</span>
                    <button className="elem-stap" title="Rechtsom" onClick={function(){ draaiGekozen(15); }}><i className="fa-solid fa-rotate-right"/></button>
                  </div>
                  <div className="bord-knoppen">
                    {[{g:0,i:"fa-solid fa-arrow-up"},{g:90,i:"fa-solid fa-arrow-right"},
                      {g:180,i:"fa-solid fa-arrow-down"},{g:270,i:"fa-solid fa-arrow-left"}].map(function(o){
                      var aan = (Number(gekozenObject.hoek)||0)===o.g;
                      return (
                        <button key={o.g} className="elem-stap" title={"Richting "+o.g+"°"}
                          style={{width:30,height:28,fontSize:11,borderColor:aan?"var(--blauw)":"var(--grijs)",
                                  background:aan?"var(--blauw)":"var(--wit)",color:aan?"#fff":"var(--grijs-donker)"}}
                          onClick={function(){ zetHoek(o.g); }}>
                          <i className={o.i}/>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{fontSize:10,color:"var(--grijs-donker)",marginTop:6,lineHeight:1.45}}>
                    Of sleep aan de gele greep op het veld.
                  </div>
                </div>
              )}

              <div style={{display:"flex",gap:6}}>
                {gekozenObject.type==="notitie" && (
                  <button className="knop lijn klein" style={{flex:1,justifyContent:"center",padding:"5px 8px",fontSize:11}}
                    onClick={function(){
                      var nieuw = prompt("Coachpunt aanpassen:", gekozenObject.tekst||"");
                      if (nieuw !== null) wijzigElem(gekozenObject.id, {tekst: nieuw.trim() || "Notitie"});
                    }}>
                    <i className="fa-solid fa-pen"/> Tekst
                  </button>
                )}
                <button className="knop gevaar klein" style={{padding:"5px 9px"}} onClick={verwijderGekozen}>
                  <i className="fa-solid fa-trash"/>
                </button>
                <button className="knop lijn klein" style={{flex:1,justifyContent:"center",padding:"5px 8px",fontSize:11}}
                  onClick={function(){setGekozenElem(null);}}>Klaar</button>
              </div>
            </div>
          ) : !speelt && (
            <div className="bord-vak">
              <div className="bord-vak-kop">Formaat nieuw</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button className="elem-stap" onClick={function(){setNieuwFormaat(function(f){return Math.max(0.4, Math.round((f-0.15)*100)/100);});}}>−</button>
                <span className="elem-maat" style={{flex:1,textAlign:"center"}}>{Math.round(nieuwFormaat*100)+"%"}</span>
                <button className="elem-stap" onClick={function(){setNieuwFormaat(function(f){return Math.min(3, Math.round((f+0.15)*100)/100);});}}>+</button>
              </div>
              <div style={{fontSize:10,color:"var(--grijs-donker)",marginTop:6,lineHeight:1.45}}>
                Tik met de hand op iets op het veld om het los aan te passen.
              </div>
            </div>
          )}

          {/* Volgorde van de lijnen — hoort bij de categorie Lijnen */}
          {paneel==="lijnen" && (
          <div className="bord-vak">
            <div className="bord-vak-kop">
              Lijnnummer
              <button className="knop lijn klein" style={{marginLeft:"auto",padding:"3px 8px",fontSize:10}}
                title={lijnDonker ? "Nu zwarte cijfers" : "Nu witte cijfers"}
                onClick={function(){ setLijnDonker(!lijnDonker); }}>
                {lijnDonker ? "Zwart" : "Wit"}
              </button>
            </div>
            <div className="lijnnr-raster">
              <button className={"lijnnr-knop geen"+(lijnNr===null?" actief":"")}
                title="Zonder nummer" onClick={function(){ setLijnNr(null); }}>–</button>
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(function(n){
                return (
                  <button key={n} className={"lijnnr-knop"+(lijnNr===n?" actief":"")}
                    onClick={function(){ setLijnNr(lijnNr===n ? null : n); }}>{n}</button>
                );
              })}
            </div>
            {lijnNr && (
              <div className="lijnnr-hint">
                Elke lijn die je nu trekt krijgt een <strong>{lijnNr}</strong>.
                <button className="knop lijn klein" style={{padding:"3px 8px",fontSize:10,marginLeft:6}}
                  onClick={function(){ setLijnNr(Math.min(20, lijnNr+1)); }}>Volgende</button>
              </div>
            )}
          </div>
          )}

          {/* Teams — hoort bij de categorie Spelers */}
          {paneel==="spelers" && (
          <div className="bord-vak">
            <div className="bord-vak-kop"><i className="team-stip" style={{background:"var(--blauw)"}}/> Blauw team</div>
            {teamRij("speler","var(--blauw)")}
            <div className="bord-vak-kop" style={{marginTop:10}}><i className="team-stip" style={{background:"var(--gevaar)"}}/> Rood team</div>
            {teamRij("speler-rood","var(--gevaar)")}
          </div>
          )}

          {/* Veld en blik — hoort bij de categorie Veld */}
          {paneel==="veld" && (
          <div className="bord-vak">
            <div className="bord-vak-kop">Veld</div>
            <div className="veld-raster" style={{marginBottom:10}}>
              {VELD_TYPEN.filter(function(vt){ return !vt.verborgen; }).map(function(vt){
                return (
                  <button key={vt.id} className={"veld-knop"+(veldType===vt.id?" actief":"")}
                    title={vt.l} aria-label={vt.l} onClick={function(){ setVeldType(vt.id); }}>
                    <VeldIcoon type={vt.id} maat={32}/>
                  </button>
                );
              })}
            </div>
            <div className="bord-vak-kop">Blik</div>
            <div className="bord-knoppen">
              {PERSPECTIEF_STANDEN.map(function(p){
                var aan = blik===p.id;
                return (
                  <button key={p.id} className={"teken-tool-knop"+(aan?" actief":"")}
                    title={p.id==="plat"?"Bovenaanzicht, hier teken je":"Schuine weergave voor presenteren"}
                    style={{fontSize:10}}
                    onClick={function(){ setBlik(p.id); if(p.id!=="plat") setGekozenElem(null); }}>
                    <i className={p.icoon}/><span className="knop-woord">{" "+p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </div>
  );

  const framesBlok = (
      <div className="bord-frames">
        <div className="bord-vak-kop" style={{marginBottom:7}}>
          <i className="fa-solid fa-film"/> Frames
          <span style={{marginLeft:6,fontWeight:600,letterSpacing:0,textTransform:"none"}}>
            {stappen.length===1 ? "voeg een frame toe om te laten bewegen"
                                : "stap "+(veiligeIdx+1)+" van "+stappen.length}
          </span>
        </div>

        <div className="frame-strook">
          {stappen.map(function(s,i){
            return (
              <button key={s.id} className={"frame-vak"+(i===veiligeIdx?" actief":"")}
                onClick={function(){ stopAnimatie(); setGekozenElem(null); setStapIdx(i); }}>
                <FrameMiniatuur stap={s} veldType={veldType} />
                <div className="frame-label">{i+1}</div>
              </button>
            );
          })}
          <button className="frame-nieuw" onClick={voegStapToe} title="Frame toevoegen">
            <i className="fa-solid fa-plus"/><span>Frame</span>
          </button>
        </div>

        <div className="frame-balk">
          {meerdereStappen && (
            <button className={"knop klein"+(speelt?" gevaar":" succes")} style={{padding:"6px 12px"}}
              onClick={function(){ if(speelt) stopAnimatie(); else speelAf(); }}>
              <i className={speelt?"fa-solid fa-stop":"fa-solid fa-play"}/>{speelt?" Stop":" Speel af"}
            </button>
          )}
          {meerdereStappen && (
            <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"var(--grijs-donker)",fontWeight:600}}>
              Tempo
              <input type="range" min="400" max="2400" step="200" value={snelheid}
                style={{width:84,accentColor:"var(--blauw)"}}
                onChange={function(e){setSnelheid(Number(e.target.value));}} />
            </label>
          )}
          {meerdereStappen && (
            <button className="knop lijn klein" style={{padding:"6px 9px"}} onClick={verwijderStap}
              title="Dit frame verwijderen">
              <i className="fa-solid fa-trash"/>
            </button>
          )}

          {pdfNaam && (
            <span style={{display:"flex",gap:6,marginLeft:"auto",flexWrap:"wrap"}}>
              {meerdereStappen && (
                <button className="knop klein" style={{background:"var(--gevaar)"}} disabled={!!opname} onClick={maakFilm}>
                  <i className="fa-solid fa-video"/>{opname?" Bezig…":" Filmpje"}
                </button>
              )}
              {meerdereStappen && (
                <button className="knop lijn klein" onClick={maakStrook}>
                  <i className="fa-solid fa-table-cells"/> Alle stappen
                </button>
              )}
              <button className="knop klein pdf-knop"
                onClick={function(){ exporteerTekeningPDF(pdfNaam, canvasRef.current, pdfInfo); }}>
                <i className="fa-solid fa-file-pdf"/> PDF
              </button>
              <button className="knop klein" style={{background:"#25d366",color:"white"}}
                onClick={function(){ deelTekeningAlsPNG(canvasRef.current, pdfNaam); }}>
                <i className="fa-brands fa-whatsapp"/>
              </button>
            </span>
          )}
        </div>

        {filmKlaar && (
          <div className="film-klaar">
            <span className="film-icoon"><i className="fa-solid fa-circle-check"/></span>
            <span style={{flex:1,minWidth:0}}>
              <span className="film-titel">
                {filmKlaar.hoe==="gedeeld" ? "Filmpje gedeeld" : "Filmpje opgeslagen"}
              </span>
              <span className="film-sub">
                {filmKlaar.hoe==="gedeeld"
                  ? "Kies in het deelmenu waar je het naartoe stuurt."
                  : <>Bestand <strong>{filmKlaar.naam}</strong> ({filmKlaar.mb} MB) staat in je map <strong>Downloads</strong>.</>}
              </span>
            </span>
            <span style={{display:"flex",gap:6,flexShrink:0}}>
              <button className="knop lijn klein" style={{padding:"4px 9px",fontSize:11}}
                title="Nog een keer opslaan als je hem niet kunt vinden"
                onClick={function(){ bewaarBestand(filmKlaar.blob, filmKlaar.naam); }}>
                <i className="fa-solid fa-download"/> Opslaan
              </button>
              <button className="knop lijn klein" style={{padding:"4px 9px",fontSize:11}}
                onClick={function(){ setFilmKlaar(null); }}>Sluiten</button>
            </span>
          </div>
        )}

        {opname && (
          <div className="opname-balk">
            <span className="opname-stip"/>
            <div style={{fontSize:12,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",flexShrink:0}}>Opnemen</div>
            <div className="opname-balk-vul"><span style={{width:opname.pct+"%"}}/></div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--blauw)",minWidth:34,textAlign:"right",fontFamily:"'Helvetica Neue',Arial"}}>{opname.pct+"%"}</div>
          </div>
        )}
      </div>
  );

  if (volledig) {
    /* Rechtstreeks aan de pagina hangen: een modal eromheen zou anders
       kunnen bepalen waar "vast op het scherm" begint. */
    return ReactDOM.createPortal(
      <div className="bord-vol">
        <div className="bordv-kop">
          <button className="knop lijn klein" onClick={function(){ setVolledig(false); }}>
            <i className="fa-solid fa-down-left-and-up-right-to-center"/> Klaar
          </button>
          <div className="bordv-titel">{pdfNaam || "Tekening"}</div>
          <span style={{marginLeft:"auto",fontSize:11,color:"var(--grijs-donker)",whiteSpace:"nowrap"}}>
            Escape sluit ook
          </span>
        </div>
        <div className="bordv-mid">
          <div className="bordv-rij">
            {railBlok}
            {zijBlok}
            {veldBlok}
          </div>
          {framesBlok}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="bord">
      <div className="bord-werkvlak">
        {railBlok}
        {zijBlok}
        {veldBlok}
      </div>
      {framesBlok}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   ACHTERSTAND VAN STAP 7, INGELOPEN BIJ STAP 8
   ─────────────────────────────────────────────────────────────
   veldMaten, veldBoogPunten, veldHoekPunten, veldCirkelPunten,
   exporteerOpstellingPDF, deelOpstellingWhatsApp, exporteerTekeningPDF,
   deelTekeningAlsPNG en maakOpstellingCanvas stonden ná P4 stap 7 (17
   september 2026) nog in src/app.jsx, pal vóór waar het wedstrijden-
   bereik toen begon (SpelerKeuzeModal) — dus net buiten wat die stap
   behandelde. Bij het narekenen van stap 8 (wedstrijden) bleek deze
   hele cluster (met de oorspronkelijke sectiekop "MATEN VAN EEN HEEL
   VELD") uitsluitend door OpstellingenTab en TactiekenTab hierboven te
   worden gebruikt — nul treffers in de wedstrijdenmodule of elders.
   Puur een verhuizing, geen herschrijving: dezelfde tekst, dezelfde
   comments (inclusief de oorspronkelijke sectiekop hieronder). */

/* ═══════════════════════════════════════════════════════════
   MATEN VAN EEN HEEL VELD
   Een wedstrijdveld is 105 bij 68 meter. Alles wat erop staat
   wordt daaruit afgeleid, zodat de boog van het strafschopgebied
   per definitie op de zestienlijn uitkomt. Het scherm, de PDF en
   de WhatsApp-afbeelding rekenen alle drie hiermee.
═══════════════════════════════════════════════════════════ */
function veldMaten(L, T, B, D) {
  var hx = B/68, hy = D/105;
  return {
    L:L, T:T, B:B, D:D, R:L+B, O:T+D,
    mid: L + B/2, midY: T + D/2, hx:hx, hy:hy,
    zestienB: 40.32*hx, zestienD: 16.5*hy,
    vijfB:    18.32*hx, vijfD:     5.5*hy,
    doelB:     7.32*hx,
    stipD:       11*hy,
    cirkelRx:  9.15*hx, cirkelRy: 9.15*hy,
    /* Waar de cirkel om de penaltystip de zestienlijn snijdt:
       de stip ligt 11 m van de doellijn, de lijn op 16,5 m. */
    boogHalf: Math.sqrt(9.15*9.15 - 5.5*5.5) * hx,
    hoekRx: 1*hx, hoekRy: 1*hy
  };
}
/* De halve maan bij één van beide doelen, als reeks punten. */
function veldBoogPunten(v, onder, stappen) {
  var a = Math.asin(5.5/9.15), n = stappen || 24, pnt = [];
  var cy = onder ? v.O - v.stipD : v.T + v.stipD;
  var kant = onder ? -1 : 1;
  for (var i = 0; i <= n; i++) {
    var th = (Math.PI - a) + (i/n) * (a - (Math.PI - a));
    pnt.push([v.mid + Math.cos(th)*v.cirkelRx, cy + kant*Math.sin(th)*v.cirkelRy]);
  }
  return pnt;
}
/* Hoekboog van één meter. */
function veldHoekPunten(v, rechts, onder, stappen) {
  var n = stappen || 8, pnt = [];
  var cx = rechts ? v.R : v.L, cy = onder ? v.O : v.T;
  var kx = rechts ? -1 : 1,    ky = onder ? -1 : 1;
  for (var i = 0; i <= n; i++) {
    var th = (i/n) * Math.PI/2;
    pnt.push([cx + kx*Math.cos(th)*v.hoekRx, cy + ky*Math.sin(th)*v.hoekRy]);
  }
  return pnt;
}
/* De middencirkel als punten, want hij is licht ovaal wanneer het
   veld niet precies op schaal getekend wordt. */
function veldCirkelPunten(v, stappen) {
  var n = stappen || 48, pnt = [];
  for (var i = 0; i <= n; i++) {
    var th = (i/n) * Math.PI * 2;
    pnt.push([v.mid + Math.cos(th)*v.cirkelRx, v.midY + Math.sin(th)*v.cirkelRy]);
  }
  return pnt;
}

function exporteerOpstellingPDF(opstellingNaam, formatie, toewijzing) {
  if (!window.jspdf) { meldFout("PDF-bibliotheek nog niet geladen. Probeer het zo nog eens."); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W=210, H=297;
  const pdfLogo = logoAfbeelding();
  // Gras achtergrond met strepen
  for (let i=0;i<12;i++) {
    if (i%2===0) { doc.setFillColor(24,108,24); } else { doc.setFillColor(20,95,20); }
    doc.rect(0, i*(H/12), W, H/12, "F");
  }
  // Header
  doc.setFillColor(0,74,173);
  doc.rect(0,0,W,28,"F");
  doc.setFillColor(56,182,255);
  doc.rect(0,25,W,3,"F");
  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold");
  doc.setFontSize(16);
  var kopX = W/2, kopUitlijn = "center";
  if (pdfLogo) {
    try {
      var ph = 17, pb = pdfLogo.naturalWidth/pdfLogo.naturalHeight*ph;
      if (pb > 26) { pb = 26; ph = pdfLogo.naturalHeight/pdfLogo.naturalWidth*pb; }
      doc.addImage(pdfLogo, "PNG", 10, (25-ph)/2, pb, ph);
      kopX = 10 + pb + 8; kopUitlijn = "left";
    } catch(e) {}
  }
  doc.text(teamNaamVol().toUpperCase(), kopX, 12, {align:kopUitlijn});
  doc.setFontSize(10);
  doc.text("Opstelling: " + opstellingNaam + "  ·  " + formatie, kopX, 21, {align:kopUitlijn});
  // Veld kader
  var FL=30, FT=35, FW=150, FH=198;
  var FR=FL+FW, FCX=FL+FW/2, FCY=FT+FH/2;
  var v = veldMaten(FL, FT, FW, FH);
  function pad(pnt) {
    for (var i = 1; i < pnt.length; i++) {
      doc.line(pnt[i-1][0], pnt[i-1][1], pnt[i][0], pnt[i][1]);
    }
  }
  doc.setDrawColor(255,255,255);
  doc.setLineWidth(0.8);
  doc.rect(FL, FT, FW, FH, "S");
  // Middenlijn en middenstip
  doc.line(FL, v.midY, v.R, v.midY);
  doc.setFillColor(255,255,255);
  doc.circle(v.mid, v.midY, 1.8, "F");
  // Middencirkel van 9,15 meter
  pad(veldCirkelPunten(v));
  // Strafschopgebied en doelgebied, boven en onder
  doc.rect(v.mid - v.zestienB/2, FT, v.zestienB, v.zestienD, "S");
  doc.rect(v.mid - v.vijfB/2,    FT, v.vijfB,    v.vijfD,    "S");
  doc.rect(v.mid - v.zestienB/2, v.O - v.zestienD, v.zestienB, v.zestienD, "S");
  doc.rect(v.mid - v.vijfB/2,    v.O - v.vijfD,    v.vijfB,    v.vijfD,    "S");
  // De doelen
  doc.setLineWidth(1.6);
  doc.rect(v.mid - v.doelB/2, FT - 5, v.doelB, 5, "S");
  doc.rect(v.mid - v.doelB/2, v.O,    v.doelB, 5, "S");
  // Strafschopstippen op elf meter
  doc.setLineWidth(0.8);
  doc.setFillColor(255,255,255);
  doc.circle(v.mid, FT + v.stipD, 1.2, "F");
  doc.circle(v.mid, v.O - v.stipD, 1.2, "F");
  // De halve manen en de hoekbogen
  doc.setLineWidth(0.6);
  pad(veldBoogPunten(v, false));
  pad(veldBoogPunten(v, true));
  pad(veldHoekPunten(v, false, false));
  pad(veldHoekPunten(v, true,  false));
  pad(veldHoekPunten(v, false, true));
  pad(veldHoekPunten(v, true,  true));
  // Spelers
  var posities = FORMATIES_DATA[formatie]||FORMATIES_DATA["4-3-3A"];
  posities.forEach(function(pos) {
    var px = FL + (pos.x/100)*FW;
    var py = FT + (pos.y/100)*FH;
    var sp = toewijzing[pos.id];
    var heeft = sp && sp.naam;
    if (heeft) { doc.setFillColor(0,74,173); } else { doc.setFillColor(38,110,38); }
    doc.setDrawColor(255,255,255);
    doc.setLineWidth(0.9);
    doc.circle(px, py, 7, "FD");
    doc.setTextColor(255,255,255);
    doc.setFont("helvetica","bold");
    doc.setFontSize(5.5);
    doc.text(pos.l, px, py+1.3, {align:"center"});
    if (heeft) {
      doc.setFont("helvetica","bold");
      doc.setFontSize(6.5);
      doc.setTextColor(240,248,240);
      var vollNaam = (sp.rugnummer ? "#"+sp.rugnummer+" " : "") + sp.naam;
      var naamRegels = doc.splitTextToSize(vollNaam, 28);
      if (naamRegels.length > 2) { naamRegels = naamRegels.slice(0,2); }
      naamRegels.forEach(function(regel, ri) {
        doc.text(regel, px, py+10.5+(ri*3.8), {align:"center"});
      });
      var instrY = py + 10.5 + (naamRegels.length * 3.8) + 1.5;
      if (sp.aanvalInstructie || sp.verdedigingInstructie) {
        doc.setFont("helvetica","normal");
        doc.setFontSize(5);
        doc.setTextColor(200,235,200);
        if (sp.aanvalInstructie) {
          var aR = doc.splitTextToSize("A: "+sp.aanvalInstructie, 30);
          aR.slice(0,2).forEach(function(r,ri){ doc.text(r, px, instrY+(ri*3.2), {align:"center"}); });
          instrY += Math.min(aR.length,2)*3.2 + 0.5;
        }
        if (sp.verdedigingInstructie) {
          var vR = doc.splitTextToSize("V: "+sp.verdedigingInstructie, 30);
          vR.slice(0,2).forEach(function(r,ri){ doc.text(r, px, instrY+(ri*3.2), {align:"center"}); });
        }
      }
    }
  });
  pdfVoet(doc, W, H, {donker:true, seizoen:true, marge:14});
  doc.save("fc-harlingen-opstelling.pdf");
}

function deelOpstellingWhatsApp(opstellingNaam, formatie, toewijzing) {
  var CW=800, CH=1120;
  var canvas = document.createElement("canvas");
  canvas.width=CW; canvas.height=CH;
  var ctx = canvas.getContext("2d");
  // Gras
  for(var gi=0;gi<12;gi++){
    ctx.fillStyle=gi%2===0?"#186c18":"#145f14";
    ctx.fillRect(0,gi*(CH/12),CW,CH/12);
  }
  // Header
  ctx.fillStyle="#004aad"; ctx.fillRect(0,0,CW,120);
  ctx.fillStyle="#38b6ff"; ctx.fillRect(0,114,CW,12);
  ctx.fillStyle="white"; ctx.textAlign="center";
  ctx.font="bold 40px 'Helvetica Neue',Arial";
  ctx.fillText("FC HARLINGEN JO19-2",CW/2,62);
  ctx.font="bold 22px 'Helvetica Neue',Arial";
  ctx.fillText("Opstelling: "+opstellingNaam+"  ·  "+formatie,CW/2,96);
  // Veld
  var FL=80,FT=145,FW=640,FH=840;
  var FR=FL+FW, FCX=FL+FW/2, FCY=FT+FH/2;
  var v = veldMaten(FL, FT, FW, FH);
  function pad(pnt) {
    ctx.beginPath();
    ctx.moveTo(pnt[0][0], pnt[0][1]);
    for (var i = 1; i < pnt.length; i++) ctx.lineTo(pnt[i][0], pnt[i][1]);
    ctx.stroke();
  }
  ctx.strokeStyle="rgba(255,255,255,0.55)"; ctx.lineWidth=3;
  ctx.lineJoin="round"; ctx.lineCap="round";
  ctx.strokeRect(FL,FT,FW,FH);
  ctx.beginPath(); ctx.moveTo(FL,v.midY); ctx.lineTo(v.R,v.midY); ctx.stroke();
  pad(veldCirkelPunten(v));
  ctx.fillStyle="rgba(255,255,255,0.65)";
  ctx.beginPath(); ctx.arc(v.mid,v.midY,7,0,2*Math.PI); ctx.fill();
  ctx.strokeRect(v.mid-v.zestienB/2, FT, v.zestienB, v.zestienD);
  ctx.strokeRect(v.mid-v.vijfB/2,    FT, v.vijfB,    v.vijfD);
  ctx.strokeRect(v.mid-v.zestienB/2, v.O-v.zestienD, v.zestienB, v.zestienD);
  ctx.strokeRect(v.mid-v.vijfB/2,    v.O-v.vijfD,    v.vijfB,    v.vijfD);
  ctx.lineWidth=5;
  ctx.strokeRect(v.mid-v.doelB/2, FT-24, v.doelB, 24);
  ctx.strokeRect(v.mid-v.doelB/2, v.O,   v.doelB, 24);
  ctx.lineWidth=3;
  ctx.fillStyle="rgba(255,255,255,0.65)";
  ctx.beginPath(); ctx.arc(v.mid, FT+v.stipD, 5, 0, 2*Math.PI); ctx.fill();
  ctx.beginPath(); ctx.arc(v.mid, v.O-v.stipD, 5, 0, 2*Math.PI); ctx.fill();
  // De halve manen en de hoekbogen
  ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=2;
  pad(veldBoogPunten(v, false));
  pad(veldBoogPunten(v, true));
  pad(veldHoekPunten(v, false, false));
  pad(veldHoekPunten(v, true,  false));
  pad(veldHoekPunten(v, false, true));
  pad(veldHoekPunten(v, true,  true));
  // Spelers
  var posities=FORMATIES_DATA[formatie]||FORMATIES_DATA["4-3-3A"];
  posities.forEach(function(pos){
    var px=FL+(pos.x/100)*FW, py=FT+(pos.y/100)*FH;
    var sp=toewijzing[pos.id], heeft=sp&&sp.naam;
    ctx.beginPath(); ctx.arc(px,py,28,0,2*Math.PI);
    ctx.fillStyle=heeft?"#004aad":"#266e26"; ctx.fill();
    ctx.strokeStyle="white"; ctx.lineWidth=3; ctx.stroke();
    ctx.fillStyle="white"; ctx.textAlign="center";
    ctx.font="bold 18px 'Helvetica Neue',Arial";
    ctx.fillText(pos.l,px,py+6);
    if(heeft){
      ctx.fillStyle="rgba(240,248,240,0.95)";
      ctx.font="bold 16px 'Helvetica Neue',Arial";
      var vollNaam=(sp.rugnummer?"#"+sp.rugnummer+" ":"")+sp.naam;
      var nW=vollNaam.split(" ");
      var nR1=nW.slice(0,Math.ceil(nW.length/2)).join(" ");
      var nR2=nW.slice(Math.ceil(nW.length/2)).join(" ");
      if(nR2){ ctx.fillText(nR1,px,py+44); ctx.fillText(nR2,px,py+60); }
      else { ctx.fillText(nR1,px,py+52); }
      var iY=py+(nR2?76:68);
      if(sp.aanvalInstructie||sp.verdedigingInstructie){
        ctx.font="12px 'Helvetica Neue',Arial"; ctx.fillStyle="rgba(200,235,200,0.9)";
        if(sp.aanvalInstructie){
          var aTxt=sp.aanvalInstructie.length>34?sp.aanvalInstructie.slice(0,34)+"...":sp.aanvalInstructie;
          ctx.fillText("A: "+aTxt,px,iY); iY+=16;
        }
        if(sp.verdedigingInstructie){
          var vTxt=sp.verdedigingInstructie.length>34?sp.verdedigingInstructie.slice(0,34)+"...":sp.verdedigingInstructie;
          ctx.fillText("V: "+vTxt,px,iY);
        }
      }
    }
  });
  // Footer
  ctx.fillStyle="#002873"; ctx.fillRect(0,CH-60,CW,60);
  ctx.fillStyle="rgba(170,205,255,0.9)"; ctx.textAlign="center";
  ctx.font="16px 'Helvetica Neue',Arial";
  var datum=new Date().toLocaleDateString("nl-NL");
  ctx.fillText(teamNaamVol()+"  ·  Seizoen "+inst().seizoen+"  ·  "+datum,CW/2,CH-20);
  // Delen als PNG
  canvas.toBlob(function(blob){
    var bestand=new File([blob],"fc-harlingen-opstelling.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[bestand]})){
      navigator.share({title:teamNaamVol()+" – opstelling",text:"Opstelling: "+opstellingNaam,files:[bestand]}).catch(function(){});
    } else {
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.href=url; a.download="fc-harlingen-opstelling.png"; a.click();
      URL.revokeObjectURL(url);
    }
  },"image/png");
}

function exporteerTekeningPDF(naam, canvasEl, info) {
  if (!window.jspdf) { meldFout("PDF-bibliotheek nog niet geladen. Probeer het zo nog eens."); return; }
  if (!canvasEl) { meldFout("Tekening kon niet gemaakt worden."); return; }
  const { jsPDF } = window.jspdf;
  /* Staand papier: de tekening bovenaan, de uitleg eronder */
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, H = 297, M = 16;
  const gegevens = info || {};

  /* ── Kop ── */
  doc.setFillColor(6,47,110);
  doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(56,182,255);
  doc.rect(0, 28, W, 2, "F");
  var tekstX = pdfWapen(doc, M, 6, 16);
  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold"); doc.setFontSize(14);
  doc.text(String(naam || "Oefening"), tekstX, 13);
  doc.setFont("helvetica","normal"); doc.setFontSize(9);
  doc.setTextColor(170,205,255);
  var kopRegels = [];
  if (gegevens.type) kopRegels.push(String(gegevens.type));
  if (gegevens.doel) kopRegels.push(String(gegevens.doel));
  if (gegevens.duur) kopRegels.push(gegevens.duur + " min");
  if (gegevens.aantalSpelers) kopRegels.push(gegevens.aantalSpelers + " spelers");
  if (gegevens.leeftijd) kopRegels.push(String(gegevens.leeftijd));
  doc.text(kopRegels.join("   ·   ") || teamNaamVol(), tekstX, 21);

  /* ── Tekening ── */
  var y = 38;
  try {
    var imgData = canvasEl.toDataURL("image/png");
    var aspect = canvasEl.width / canvasEl.height;
    var beschB = W - 2*M;
    var beschH = 108;                       // ruimte reserveren voor de tekst eronder
    var imgB = beschB, imgH = beschB / aspect;
    if (imgH > beschH) { imgH = beschH; imgB = imgH * aspect; }
    doc.setFillColor(20,85,20);
    doc.roundedRect((W-imgB)/2 - 2, y - 2, imgB + 4, imgH + 4, 2, 2, "F");
    doc.addImage(imgData, "PNG", (W-imgB)/2, y, imgB, imgH);
    y += imgH + 10;
  } catch(err) {
    doc.setTextColor(120,120,120); doc.setFontSize(10);
    doc.text("De tekening kon niet worden meegenomen.", M, y);
    y += 10;
  }

  /* ── Blokken met tekst ── */
  function blok(titel, tekst, accent) {
    if (!tekst || !String(tekst).trim()) return;
    var regels = doc.splitTextToSize(String(tekst).trim(), W - 2*M - 6);
    var hoogte = regels.length * 4.6 + 12;
    if (y + hoogte > H - 22) { doc.addPage(); y = M; }
    doc.setFillColor(accent ? 255 : 246, accent ? 247 : 248, accent ? 234 : 251);
    doc.roundedRect(M, y, W - 2*M, hoogte, 2, 2, "F");
    doc.setFillColor.apply(doc, accent ? [253,126,20] : [0,74,173]);
    doc.rect(M, y, 1.6, hoogte, "F");
    doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
    doc.setTextColor.apply(doc, accent ? [140,70,10] : [0,58,138]);
    doc.text(titel.toUpperCase(), M + 6, y + 6);
    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    doc.setTextColor(35,40,50);
    doc.text(regels, M + 6, y + 12);
    y += hoogte + 5;
  }

  /* Praktische gegevens als één regel */
  var praktisch = [];
  if (gegevens.veldGrootte) praktisch.push("Veld: " + gegevens.veldGrootte);
  if (gegevens.materialen)  praktisch.push("Materialen: " + gegevens.materialen);
  if (gegevens.aantalSpelers) praktisch.push("Spelers: " + gegevens.aantalSpelers);
  if (praktisch.length) blok("Benodigdheden", praktisch.join("\n"));

  blok("Uitleg", gegevens.beschrijving);
  blok("Aandachtspunten", gegevens.aandachtspunten, true);
  blok("Notities", gegevens.notities);

  if (!praktisch.length && !gegevens.beschrijving && !gegevens.aandachtspunten) {
    doc.setFont("helvetica","normal"); doc.setFontSize(9);
    doc.setTextColor(140,148,160);
    doc.text("Bij deze oefening staat nog geen uitleg of materiaal ingevuld.", M, y + 4);
  }

  /* ── Voet ── */
  var pag = doc.getNumberOfPages();
  for (var p = 1; p <= pag; p++) {
    doc.setPage(p);
    doc.setDrawColor(225,229,234); doc.setLineWidth(0.3);
    doc.line(M, H-14, W-M, H-14);
    pdfVoet(doc, W, H, {marge:M, pagina:p, paginas:pag});
  }

  var bestand = String(naam || "oefening").replace(/[^a-z0-9\-_ ]/gi,"").trim().replace(/\s+/g,"-").toLowerCase();
  doc.save((bestand || "oefening") + ".pdf");
  meldGoed("PDF opgeslagen als " + (bestand || "oefening") + ".pdf");
}

function deelTekeningAlsPNG(canvasEl, naam) {
  if (!canvasEl) { meldFout("Tekening kon niet gemaakt worden."); return; }
  var bestandsnaam = String(naam||"tekening").replace(/[^a-z0-9\-_ ]/gi,"").trim().replace(/\s+/g,"-").toLowerCase() + ".png";
  canvasEl.toBlob(function(blob) {
    deelOfDownload(blob, bestandsnaam, teamNaamVol()+" – "+(naam||"Tekening"), function(hoe){
      meldGoed(hoe==="gedeeld" ? "Afbeelding gedeeld" : "Opgeslagen als "+bestandsnaam+" in Downloads");
    });
  }, "image/png");
}

function maakOpstellingCanvas(naam, formatie, toewijzing, tenue) {
  var posities = FORMATIES_DATA[formatie] || FORMATIES_DATA["4-3-3A"];
  var t = tenue || STANDAARD_TENUE;
  var B = 700, kop = 96, voet = 46, veldH = 1050;
  var c = document.createElement("canvas");
  c.width = B; c.height = kop + veldH + voet;
  var x = c.getContext("2d");

  x.fillStyle = "#f4f6f9"; x.fillRect(0,0,c.width,c.height);
  var grad = x.createLinearGradient(0,0,B,kop);
  grad.addColorStop(0,"#004aad"); grad.addColorStop(1,"#0063cc");
  x.fillStyle = grad; x.fillRect(0,0,B,kop);
  var logo = logoAfbeelding();
  var tekstX = 26;
  if (logo) {
    var lh = 60, lb = Math.round(logo.naturalWidth/logo.naturalHeight*lh);
    if (lb > 90) { lb = 90; lh = Math.round(logo.naturalHeight/logo.naturalWidth*lb); }
    try { x.drawImage(logo, 24, (kop-lh)/2, lb, lh); tekstX = 24 + lb + 16; } catch(e) {}
  }
  x.fillStyle = "#ffffff";
  x.font = "bold 30px 'Helvetica Neue',Arial,sans-serif"; x.textBaseline = "middle";
  x.fillText(naam||"Opstelling", tekstX, 38);
  x.font = "16px 'Helvetica Neue',Arial,sans-serif";
  x.fillStyle = "rgba(255,255,255,.8)";
  x.fillText(teamNaamVol(), tekstX, 68);
  x.textAlign = "right";
  x.font = "bold 34px 'Helvetica Neue',Arial,sans-serif";
  x.fillStyle = "#38b6ff"; x.fillText(formatie, B-26, 50);
  x.textAlign = "left";

  var s = B/200, oy = kop;
  x.fillStyle = "#2e8b2e"; x.fillRect(0,oy,B,veldH);
  for (var i=0;i<6;i++) {
    x.fillStyle = i%2===0 ? "rgba(0,0,0,0.045)" : "rgba(255,255,255,0.022)";
    x.fillRect(0, oy+i*(veldH/6), B, veldH/6);
  }
  function lijn(a){ x.strokeStyle="rgba(255,255,255,"+a+")"; }
  x.lineWidth = 2.2*s/1.6;
  lijn(0.5);
  x.strokeRect(10*s, oy+8*s, 180*s, 284*s);
  x.beginPath(); x.moveTo(10*s, oy+150*s); x.lineTo(190*s, oy+150*s); x.stroke();
  x.beginPath(); x.arc(100*s, oy+150*s, 28*s, 0, Math.PI*2); x.stroke();
  x.fillStyle="rgba(255,255,255,.6)";
  x.beginPath(); x.arc(100*s, oy+150*s, 2.5*s, 0, Math.PI*2); x.fill();
  lijn(0.45);
  x.strokeRect(47*s, oy+8*s, 106*s, 52*s);
  x.strokeRect(72*s, oy+8*s, 56*s, 20*s);
  x.strokeRect(47*s, oy+240*s, 106*s, 52*s);
  x.strokeRect(72*s, oy+272*s, 56*s, 20*s);
  lijn(0.7);
  x.strokeRect(83*s, oy+1*s, 34*s, 7*s);
  x.strokeRect(83*s, oy+292*s, 34*s, 7*s);
  x.fillStyle="rgba(255,255,255,.55)";
  x.beginPath(); x.arc(100*s, oy+42*s, 2.5*s, 0, Math.PI*2); x.fill();
  x.beginPath(); x.arc(100*s, oy+258*s, 2.5*s, 0, Math.PI*2); x.fill();
  lijn(0.45);
  x.beginPath(); x.arc(100*s, oy+42*s, 28*s, 0.32*Math.PI, 0.68*Math.PI); x.stroke();
  x.beginPath(); x.arc(100*s, oy+258*s, 28*s, 1.32*Math.PI, 1.68*Math.PI); x.stroke();

  posities.forEach(function(p){
    var cx = (p.x/100)*B, cy = oy + (p.y/100)*veldH;
    var r = 30, isK = p.id==="GK";
    var sp = toewijzing[p.id];
    x.save();
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.closePath();
    var set = tenueVoor(t, t.keuze || "thuis", isK);
    if (!sp || !sp.naam) { x.fillStyle = "rgba(255,255,255,0.22)"; x.fill(); }
    else {
      /* Hetzelfde patroon als in de ontwerper, geschaald naar de bol.
         Het wordt hier niet opnieuw uitgetekend: dan zou een nieuw
         patroon op twee plekken moeten worden bijgehouden en zou de
         gedeelde afbeelding stilletjes achterlopen. */
      x.clip();
      x.fillStyle = set.shirt; x.fillRect(cx-r, cy-r, 2*r, 2*r);
      var sx = 2*r/108, sy = 2*r/82;
      /* Het vel van de ontwerper op de bol leggen: één omrekening,
         waarna zowel het snelpatroon als de opgelegde lagen in hun
         eigen coördinaten kunnen worden getekend. */
      var opVel = function(doe){
        x.save();
        x.translate(cx - r, cy - r); x.scale(sx, sy); x.translate(-6, -8);
        doe();
        x.restore();
      };
      tenuePatroonDelen(set).forEach(function(d){
        x.fillStyle = d.kleur;
        if (d.vorm === "rect") {
          x.fillRect(cx - r + (d.x-6)*sx, cy - r + (d.y-8)*sy, d.b*sx, d.h*sy);
        } else if (typeof Path2D === "function") {
          opVel(function(){ x.fill(new Path2D(d.d)); });
        }
      });
      if (typeof Path2D === "function") tenueKleineLagen(set).forEach(function(l){
        var plek = tenueLaagPlaats(l, "shirt"), vak = tenueVak("shirt");
        var v = tenueVorm(l.vorm), regel = (v && v.regel === "evenodd") ? "evenodd" : "nonzero";
        opVel(function(){
          if (plek.vullend) { x.translate(vak.x, vak.y); x.scale(vak.b/100, vak.h/100); }
          else {
            x.translate(plek.cx, plek.cy);
            x.rotate(l.hoek * Math.PI / 180);
            x.scale(plek.breed / 100 * (l.spiegel ? -1 : 1),
                    plek.hoog / 100 * (l.spiegelV ? -1 : 1));
            x.translate(-50, -50);
          }
          x.globalAlpha = l.doorzicht;
          x.fillStyle = l.kleur;
          tenueVormDelen(l.vorm).forEach(function(d){
            if (d.d) x.fill(new Path2D(d.d), regel);
            else x.fillRect(d.x, d.y, d.b, d.h);
          });
          x.globalAlpha = 1;
        });
      });
    }
    x.restore();
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2);
    x.strokeStyle = "rgba(255,255,255,0.92)"; x.lineWidth = 3; x.stroke();

    x.textAlign = "center"; x.textBaseline = "middle";
    if (sp && sp.naam) {
      x.fillStyle = set.tekst || "#ffffff";
      x.font = "bold 20px 'Helvetica Neue',Arial,sans-serif";
      x.fillText(String(sp.rugnummer||p.l), cx, cy+1);
    } else {
      x.fillStyle = "rgba(255,255,255,.85)";
      x.font = "bold 15px 'Helvetica Neue',Arial,sans-serif";
      x.fillText(p.l, cx, cy+1);
    }

    var label = sp && sp.naam ? sp.naam.split(" ")[0] : p.l;
    x.font = "bold 15px 'Helvetica Neue',Arial,sans-serif";
    var bw = x.measureText(label).width + 14;
    x.fillStyle = "rgba(0,0,0,0.5)";
    x.fillRect(cx-bw/2, cy+r+5, bw, 22);
    x.fillStyle = "#ffffff";
    x.fillText(label, cx, cy+r+17);
    x.textAlign = "left"; x.textBaseline = "alphabetic";
  });

  x.fillStyle = "#6c757d";
  x.font = "14px 'Helvetica Neue',Arial,sans-serif";
  x.fillText(new Date().toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"}), 26, kop+veldH+29);
  x.textAlign = "right";
  x.fillText(teamNaamVol(), B-26, kop+veldH+29);
  x.textAlign = "left";
  return c;
}
