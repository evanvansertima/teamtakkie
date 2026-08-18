new_func = r"""// ── LIVE ANALYSE ───────────────────────────────────────────
function LiveAnalyse() {
  const wedstrijden = laadWedstrijden();
  const spelers = laadSpelers();
  const [fase, setFase] = useState("selecteer");
  const [wedstrijd, setWedstrijd] = useState(null);
  const [events, setEvents] = useState([]);
  const [loopt, setLoopt] = useState(false);
  const [seconden, setSeconden] = useState(0);
  const [modus, setModus] = useState("stopwatch");
  const [halveTijd, setHalveTijd] = useState(40);
  const [scoreFCH, setScoreFCH] = useState(0);
  const [scoreTeg, setScoreTeg] = useState(0);
  const [subTab, setSubTab] = useState("acties");
  const [gekozenCat, setGekozenCat] = useState("aanval");
  const [gekozenActie, setGekozenActie] = useState(null);
  const [gekozenZone, setGekozenZone] = useState(null);
  const [gekozenSpeler, setGekozenSpeler] = useState(null);
  const [flash, setFlash] = useState(null);
  const timerRef = useRef(null);
  const modusRef = useRef("stopwatch");

  useEffect(function(){modusRef.current=modus;},[modus]);

  useEffect(function(){
    if (!wedstrijd) return;
    var alle = laadEvents();
    setEvents(alle.filter(function(e){return e.wedstrijdId===wedstrijd.id;}));
    setScoreFCH(wedstrijd.score ? wedstrijd.score.fch||0 : 0);
    setScoreTeg(wedstrijd.score ? wedstrijd.score.teg||0 : 0);
  },[wedstrijd && wedstrijd.id]);

  useEffect(function(){
    if (loopt) {
      timerRef.current = setInterval(function(){
        setSeconden(function(s){
          if (modusRef.current==="aftellen"){if(s<=0){setLoopt(false);return 0;}return s-1;}
          return s+1;
        });
      },1000);
    } else {
      clearInterval(timerRef.current);
    }
    return function(){clearInterval(timerRef.current);};
  },[loopt]);

  function formatTijd(sec) {
    var m=Math.floor(sec/60),s=sec%60;
    return (m<10?"0":"")+m+":"+(s<10?"0":"")+s;
  }
  function huidigMinuut() {
    if (modus==="aftellen") return Math.max(0,Math.ceil((halveTijd*60-seconden)/60));
    return Math.floor(seconden/60)+1;
  }
  function startTimer() {
    if (modus==="aftellen"&&seconden===0) setSeconden(halveTijd*60);
    setLoopt(true);
  }
  function resetTimer() {
    setLoopt(false);
    setSeconden(modus==="aftellen"?halveTijd*60:0);
  }
  function wisselModus(m) {
    setModus(m);modusRef.current=m;setLoopt(false);
    setSeconden(m==="aftellen"?halveTijd*60:0);
  }

  function logEvent() {
    if (!gekozenActie) return;
    var info = getActieInfo(gekozenActie);
    var minuut = huidigMinuut();
    var spNaam = "";
    if (gekozenSpeler) {
      var sp = spelers.find(function(s){return s.id===gekozenSpeler;});
      spNaam = sp ? sp.naam : "";
    }
    var nieuw = {id:Date.now(),wedstrijdId:wedstrijd.id,minuut:minuut,type:gekozenActie,team:info.team||"fch",zone:gekozenZone,spelerId:gekozenSpeler,spelerNaam:spNaam};
    var updated = [nieuw].concat(events);
    setEvents(updated);
    var rest = laadEvents().filter(function(e){return e.wedstrijdId!==wedstrijd.id;});
    slaJson(EVENTS_KEY,rest.concat(updated));
    if (gekozenActie==="goal") setScoreFCH(function(s){return s+1;});
    if (gekozenActie==="goal-teg") setScoreTeg(function(s){return s+1;});
    var zoneInfo = gekozenZone ? VELD_ZONES.find(function(z){return z.id===gekozenZone;}) : null;
    var spLabl = spNaam ? " – "+spNaam : "";
    var zLabl = zoneInfo ? " · "+zoneInfo.sub : "";
    setFlash(info.icoon+" "+info.label+spLabl+zLabl+" ("+minuut+"')");
    setTimeout(function(){setFlash(null);},2500);
    setGekozenActie(null);setGekozenZone(null);setGekozenSpeler(null);
  }

  function verwijderEvent(id) {
    var ev = events.find(function(e){return e.id===id;});
    if (ev) {
      if (ev.type==="goal") setScoreFCH(function(s){return Math.max(0,s-1);});
      if (ev.type==="goal-teg") setScoreTeg(function(s){return Math.max(0,s-1);});
    }
    var updated = events.filter(function(e){return e.id!==id;});
    setEvents(updated);
    var rest = laadEvents().filter(function(e){return e.wedstrijdId!==wedstrijd.id;});
    slaJson(EVENTS_KEY,rest.concat(updated));
  }

  if (fase==="selecteer") {
    return (
      <div>
        <div className="pagina-header" style={{marginBottom:14}}>
          <div className="pagina-header-tekst">
            <h2 style={{fontSize:20,color:"var(--blauw)"}}>&#128308; Live Analyse</h2>
            <p style={{fontSize:12,color:"var(--grijs-donker)"}}>Kies een wedstrijd</p>
          </div>
        </div>
        {wedstrijden.length===0 ? (
          <div className="leeg">
            <div className="leeg-icoon">&#128197;</div>
            <h3>Geen wedstrijden</h3>
            <p>Maak eerst een wedstrijd aan in Wedstrijden.</p>
          </div>
        ) : wedstrijden.map(function(w){
          var kl=w.status==="gespeeld"?(w.score.fch>w.score.teg?"winst":w.score.fch<w.score.teg?"verlies":"gelijk"):"gepland";
          var evCount = laadEvents().filter(function(e){return e.wedstrijdId===w.id;}).length;
          return (
            <div key={w.id} className="live-wedstrijd-keuze" onClick={function(){setWedstrijd(w);setFase("actief");setGekozenActie(null);setGekozenZone(null);setGekozenSpeler(null);setSubTab("acties");setLoopt(false);}}>
              <div className={"w-status-dot "+kl}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,fontFamily:"'Helvetica Neue',Arial"}}>{(w.thuis?"Thuis vs. ":"Uit bij ")+w.tegenstander}</div>
                <div style={{fontSize:12,color:"var(--grijs-donker)"}}>{formateerDatumKort(w.datum)}{w.tijd?" · "+w.tijd:""}{evCount>0?" · "+evCount+" events":""}</div>
              </div>
              <div className={"w-score-badge "+kl}>{w.status==="gespeeld"?w.score.fch+"-"+w.score.teg:"▶"}</div>
            </div>
          );
        })}
      </div>
    );
  }

  var huidigeCat = ACTIE_CATEGORIEEN.find(function(c){return c.id===gekozenCat;}) || ACTIE_CATEGORIEEN[0];
  var actieInfo = gekozenActie ? getActieInfo(gekozenActie) : null;
  var fchSchoten=events.filter(function(e){return e.type==="goal"||e.type==="schot-doel"||e.type==="schot-naast";}).length;
  var tegSchoten=events.filter(function(e){return e.type==="goal-teg"||e.type==="schot-doel-teg"||e.type==="schot-naast-teg";}).length;
  var fchOpDoel=events.filter(function(e){return e.type==="goal"||e.type==="schot-doel";}).length;
  var tegOpDoel=events.filter(function(e){return e.type==="goal-teg"||e.type==="schot-doel-teg";}).length;
  var fchCorners=events.filter(function(e){return e.type==="corner-fch";}).length;
  var tegCorners=events.filter(function(e){return e.type==="corner-teg";}).length;
  var fchGeel=events.filter(function(e){return e.type==="geel";}).length;
  var tegGeel=events.filter(function(e){return e.type==="geel-teg";}).length;
  var fchTackles=events.filter(function(e){return e.type==="tackle";}).length;
  var fchReddingen=events.filter(function(e){return e.type==="redding";}).length;
  var alleMins=events.filter(function(e){return e.minuut;}).map(function(e){return e.minuut;});
  var maxMin=Math.max(halveTijd*2,alleMins.length>0?Math.max.apply(null,alleMins)+5:halveTijd);
  var blokAantal=Math.ceil(maxMin/15);
  var BLOKKEN=[];
  for (var bi=0;bi<blokAantal;bi++) {
    var bS=bi*15,bE=(bi+1)*15;
    var bF=events.filter(function(e){return e.team==="fch"&&e.minuut>=bS&&e.minuut<bE;}).length;
    var bT=events.filter(function(e){return e.team==="teg"&&e.minuut>=bS&&e.minuut<bE;}).length;
    BLOKKEN.push({label:bS+"'-"+bE+"'",fch:bF,teg:bT});
  }
  var heeftZone=events.filter(function(e){return e.zone;}).length>0;

  return (
    <div>
      <button className="back-knop" onClick={function(){setFase("selecteer");setLoopt(false);setGekozenActie(null);}}>&#8592; Wedstrijden</button>

      <div className="live-scoreboard">
        <div style={{textAlign:"center",fontSize:10,opacity:.6,textTransform:"uppercase",letterSpacing:".8px",fontFamily:"'Helvetica Neue',Arial",fontWeight:700}}>
          {(wedstrijd.thuis?"THUIS":"UIT")+" · "+wedstrijd.tegenstander+" · "+formateerDatumKort(wedstrijd.datum)}
        </div>
        <div className="live-scoreboard-score">
          <div>
            <div className="live-scoreboard-team">FC Harlingen</div>
            <div className="live-scoreboard-getal">{scoreFCH}</div>
          </div>
          <div className="live-scoreboard-divider">{"–"}</div>
          <div>
            <div className="live-scoreboard-team">{wedstrijd.tegenstander}</div>
            <div className="live-scoreboard-getal">{scoreTeg}</div>
          </div>
        </div>
        <div className="live-timer-inline">
          <button style={{background:"none",border:"none",color:loopt?"#7dffb3":"rgba(255,255,255,.6)",fontSize:22,cursor:"pointer",padding:"0 4px"}} onClick={loopt?function(){setLoopt(false);}:startTimer}>{loopt?"⏸":"▶"}</button>
          <div className="live-timer-inline-getal" style={{color:loopt?"#7dffb3":"white"}}>{formatTijd(seconden)}</div>
          <div className="live-timer-inline-min">{huidigMinuut()+"' "+(modus==="aftellen"?"⏲":"⏱")}</div>
          <button style={{background:"none",border:"1px solid rgba(255,255,255,.3)",color:"rgba(255,255,255,.7)",fontSize:10,cursor:"pointer",padding:"3px 7px",borderRadius:6,fontFamily:"'Helvetica Neue',Arial",fontWeight:700}} onClick={resetTimer}>{"↺"}</button>
        </div>
        <div className="live-subtabs">
          <button className={"live-subtab"+(subTab==="acties"?" actief":"")} onClick={function(){setSubTab("acties");}}>&#127919; Acties</button>
          <button className={"live-subtab"+(subTab==="timeline"?" actief":"")} onClick={function(){setSubTab("timeline");}}>&#128197; Timeline</button>
          <button className={"live-subtab"+(subTab==="stats"?" actief":"")} onClick={function(){setSubTab("stats");}}>&#128202; Stats</button>
          <button className={"live-subtab"+(subTab==="timer"?" actief":"")} onClick={function(){setSubTab("timer");}}>&#9201; Timer</button>
        </div>
      </div>

      {flash && <div className="live-flash">&#10003; {flash}</div>}

      {subTab==="acties" && (
        <div>
          <div className="actie-cat-tabs">
            {ACTIE_CATEGORIEEN.map(function(cat){
              var actief=gekozenCat===cat.id;
              return (
                <button key={cat.id} className="actie-cat-tab"
                  style={{borderColor:actief?cat.kleur:"var(--grijs)",background:actief?cat.kleur:"var(--wit)",color:actief?"white":"var(--grijs-donker)"}}
                  onClick={function(){setGekozenCat(cat.id);setGekozenActie(null);setGekozenZone(null);setGekozenSpeler(null);}}>
                  {cat.label}
                </button>
              );
            })}
          </div>
          <div className="actie-grid-2">
            {huidigeCat.acties.map(function(a){
              var ges=gekozenActie===a.type;
              return (
                <button key={a.type} className="actie-knop-v2"
                  style={{background:ges?"var(--blauw)":huidigeCat.kleur,border:ges?"3px solid #7dd8ff":"3px solid transparent",opacity:gekozenActie&&!ges?0.6:1}}
                  onClick={function(){if(ges){setGekozenActie(null);setGekozenZone(null);setGekozenSpeler(null);}else{setGekozenActie(a.type);setGekozenZone(null);setGekozenSpeler(null);}}}>
                  <span className="actie-icoon-v2">{a.icoon}</span>
                  <span className="actie-label-v2">{a.label}</span>
                </button>
              );
            })}
          </div>

          {gekozenActie && (
            <div className="kaart" style={{marginTop:4,padding:12,borderLeft:"4px solid var(--blauw)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:14}}>
                  {actieInfo.icoon+" "+actieInfo.label+" · "+huidigMinuut()+"'"}
                </div>
                <button className="knop succes klein" onClick={logEvent}>&#10003; Log</button>
              </div>

              <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",marginBottom:6}}>&#128205; Veldzone (optioneel)</div>
              <div className="zone-veld">
                <div style={{background:"#0d1b2a",textAlign:"center",fontSize:10,color:"rgba(255,255,255,.55)",padding:"3px 0",fontWeight:700,letterSpacing:".5px"}}>&#9650; DOEL TEGENSTANDER</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                  {VELD_ZONES.map(function(z){
                    var gesZ=gekozenZone===z.id;
                    return (
                      <button key={z.id} className="zone-knop"
                        style={{background:gesZ?"#004aad":z.bg,color:gesZ?"white":z.tc,outline:gesZ?"3px solid #38b6ff":"none",outlineOffset:"-3px",padding:"13px 4px"}}
                        onClick={function(){setGekozenZone(gesZ?null:z.id);}}>
                        <div style={{fontSize:10,fontWeight:700}}>{z.label}</div>
                        <div style={{fontSize:9,opacity:.75}}>{z.sub}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{background:"#004aad",textAlign:"center",fontSize:10,color:"rgba(255,255,255,.65)",padding:"3px 0",fontWeight:700,letterSpacing:".5px"}}>&#9660; EIGEN DOEL</div>
              </div>

              {spelers.length>0 && (
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",margin:"10px 0 6px"}}>&#128100; Speler (optioneel)</div>
                  <div className="speler-keuze-grid">
                    {spelers.map(function(sp){
                      var gesP=gekozenSpeler===sp.id;
                      return (
                        <button key={sp.id} className="speler-keuze-knop" style={{borderColor:gesP?"var(--blauw)":"var(--grijs)",background:gesP?"#e8effc":"var(--wit)"}}
                          onClick={function(){setGekozenSpeler(gesP?null:sp.id);}}>
                          <div className="sk-nr">{sp.rugnummer||"?"}</div>
                          <div className="sk-naam">{sp.naam.split(" ")[0]}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button className="knop succes" style={{width:"100%",justifyContent:"center",marginTop:12}} onClick={logEvent}>
                {"&#10003; Log – "+actieInfo.icoon+" "+actieInfo.label+(gekozenSpeler&&spelers.find(function(s){return s.id===gekozenSpeler;})?" – "+spelers.find(function(s){return s.id===gekozenSpeler;}).naam.split(" ")[0]:"")+(gekozenZone&&VELD_ZONES.find(function(z){return z.id===gekozenZone;})?" · "+VELD_ZONES.find(function(z){return z.id===gekozenZone;}).sub:"")}
              </button>
            </div>
          )}
        </div>
      )}

      {subTab==="timeline" && (
        <div className="kaart">
          <div className="kaart-titel">{"&#128197; Tijdlijn ("+events.length+" events)"}</div>
          <div style={{position:"relative",height:56,margin:"10px 0 16px"}}>
            <div style={{position:"absolute",top:"50%",left:0,right:0,height:4,background:"var(--grijs)",borderRadius:2,transform:"translateY(-50%)"}}/>
            <div style={{position:"absolute",top:0,bottom:0,left:((halveTijd/maxMin)*100)+"%",width:2,background:"var(--grijs-donker)",opacity:.4}}/>
            {events.map(function(e){
              var info=getActieInfo(e.type);
              var pct=Math.min(97,((e.minuut||0)/maxMin)*100);
              return (
                <div key={e.id} style={{position:"absolute",left:pct+"%",top:"50%",transform:"translate(-50%,-50%)",fontSize:16,lineHeight:1,cursor:"default"}} title={info.label+" "+e.minuut+"'"}>
                  {info.icoon}
                </div>
              );
            })}
            <div style={{position:"absolute",bottom:0,left:0,fontSize:9,color:"var(--grijs-donker)"}}>{"0'"}</div>
            <div style={{position:"absolute",bottom:0,left:((halveTijd/maxMin)*100)+"%",fontSize:9,color:"var(--grijs-donker)",transform:"translateX(-50%)"}}>{"HT"}</div>
            <div style={{position:"absolute",bottom:0,right:0,fontSize:9,color:"var(--grijs-donker)"}}>{maxMin+"'"}</div>
          </div>
          <div className="live-event-feed">
            {events.length===0 ? (
              <div style={{fontSize:13,color:"var(--grijs-donker)",textAlign:"center",padding:"16px 0"}}>Nog geen events</div>
            ) : events.map(function(e){
              var info=getActieInfo(e.type);
              var zone=e.zone?VELD_ZONES.find(function(z){return z.id===e.zone;}):null;
              return (
                <div key={e.id} className="live-event-item">
                  <div className="live-event-minuut">{e.minuut+"'"}</div>
                  <div className="live-event-icoon">{info.icoon}</div>
                  <div className="live-event-tekst">
                    <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:13}}>{e.spelerNaam||info.label}</div>
                    <div style={{fontSize:11,color:"var(--grijs-donker)"}}>{info.label+(zone?" · "+zone.sub+" "+zone.label:"")}</div>
                  </div>
                  <button className="live-event-verwijder" onClick={function(){verwijderEvent(e.id);}}>&#10005;</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab==="stats" && (
        <div>
          <div className="kaart">
            <div className="kaart-titel">&#128202; Live statistieken</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <td style={{textAlign:"right",fontWeight:700,fontSize:11,color:"var(--blauw)",paddingBottom:8,fontFamily:"'Helvetica Neue',Arial"}}>FC Harlingen</td>
                  <td style={{textAlign:"center",width:120}}></td>
                  <td style={{textAlign:"left",fontWeight:700,fontSize:11,color:"var(--gevaar)",paddingBottom:8,fontFamily:"'Helvetica Neue',Arial"}}>{wedstrijd.tegenstander}</td>
                </tr>
              </thead>
              <tbody>
                {[
                  {label:"&#9917; Doelpunten",   fch:scoreFCH,     teg:scoreTeg},
                  {label:"&#127919; Schoten",     fch:fchSchoten,   teg:tegSchoten},
                  {label:"&#127919; Op doel",     fch:fchOpDoel,    teg:tegOpDoel},
                  {label:"&#9971; Corners",       fch:fchCorners,   teg:tegCorners},
                  {label:"&#129000; Gele kaarten",fch:fchGeel,      teg:tegGeel},
                  {label:"&#128170; Tackles",     fch:fchTackles,   teg:0},
                  {label:"&#129380; Reddingen",   fch:fchReddingen, teg:0},
                ].map(function(row,i){
                  var tot=row.fch+row.teg||1;
                  var pF=Math.round(row.fch/tot*100);
                  return (
                    <tr key={i}>
                      <td style={{textAlign:"right",paddingRight:8,paddingBottom:10}}>
                        <div style={{fontWeight:700,fontSize:18,fontFamily:"'Helvetica Neue',Arial",color:"var(--blauw)"}}>{row.fch}</div>
                      </td>
                      <td style={{textAlign:"center",paddingBottom:10}}>
                        <div style={{fontSize:11,color:"var(--grijs-donker)",marginBottom:3}}>{row.label}</div>
                        <div style={{height:6,borderRadius:3,overflow:"hidden",display:"flex"}}>
                          <div style={{width:pF+"%",background:"var(--blauw)"}}/>
                          <div style={{flex:1,background:"var(--gevaar)"}}/>
                        </div>
                      </td>
                      <td style={{textAlign:"left",paddingLeft:8,paddingBottom:10}}>
                        <div style={{fontWeight:700,fontSize:18,fontFamily:"'Helvetica Neue',Arial",color:"var(--gevaar)"}}>{row.teg}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {BLOKKEN.length>0 && (
            <div className="kaart">
              <div className="kaart-titel">&#128200; Momentum per 15 min</div>
              {BLOKKEN.map(function(blok,i){
                var tot=blok.fch+blok.teg||1;
                var pF=Math.round(blok.fch/tot*100);
                return (
                  <div key={i} className="momentum-blok">
                    <div className="momentum-label">{blok.label}</div>
                    <div className="momentum-balk-wrap">
                      <div className="momentum-fch" style={{width:pF+"%"}}/>
                      <div className="momentum-teg" style={{width:(100-pF)+"%"}}/>
                    </div>
                    <div style={{fontSize:10,color:"var(--grijs-donker)",minWidth:36,textAlign:"right",fontFamily:"'Helvetica Neue',Arial",fontWeight:700}}>{blok.fch+"–"+blok.teg}</div>
                  </div>
                );
              })}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                <div style={{fontSize:10,color:"var(--blauw)",fontWeight:700}}>&#9632; FCH</div>
                <div style={{fontSize:10,color:"var(--gevaar)",fontWeight:700}}>{"&#9632; "+wedstrijd.tegenstander}</div>
              </div>
            </div>
          )}

          {heeftZone && (
            <div className="kaart">
              <div className="kaart-titel">&#128205; Veldzone heatmap (FCH)</div>
              <div style={{background:"#1a8f40",borderRadius:10,padding:4}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:3}}>
                  {VELD_ZONES.map(function(z){
                    var cnt=events.filter(function(e){return e.zone===z.id&&e.team==="fch";}).length;
                    var maxCnt=Math.max.apply(null,VELD_ZONES.map(function(zz){return events.filter(function(e){return e.zone===zz.id&&e.team==="fch";}).length;}))||1;
                    var inten=cnt/maxCnt;
                    var bg=cnt===0?"rgba(0,0,0,.2)":"rgba(255,220,0,"+Math.max(.2,inten)+")";
                    return (
                      <div key={z.id} style={{background:bg,borderRadius:6,padding:"10px 4px",textAlign:"center",minHeight:44}}>
                        <div style={{fontSize:16,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",color:"white"}}>{cnt>0?cnt:""}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>{z.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab==="timer" && (
        <div className="kaart">
          <div className="kaart-titel">&#9201; Timer instellingen</div>
          <div style={{display:"flex",gap:8,marginBottom:16,justifyContent:"center"}}>
            <button className="filter-chip" style={{borderColor:modus==="stopwatch"?"var(--blauw)":"var(--grijs)",color:modus==="stopwatch"?"var(--blauw)":"var(--grijs-donker)"}} onClick={function(){wisselModus("stopwatch");}}>&#9201; Stopwatch</button>
            <button className="filter-chip" style={{borderColor:modus==="aftellen"?"var(--blauw)":"var(--grijs)",color:modus==="aftellen"?"var(--blauw)":"var(--grijs-donker)"}} onClick={function(){wisselModus("aftellen");}}>&#9202; Aftellen</button>
          </div>
          {modus==="aftellen" && (
            <div className="formulier-groep">
              <label className="formulier-label">Speelduur per helft</label>
              <select className="formulier-input" value={halveTijd} onChange={function(e){var v=Number(e.target.value);setHalveTijd(v);setLoopt(false);setSeconden(v*60);}}>
                <option value={35}>35 minuten</option>
                <option value={40}>40 minuten</option>
                <option value={45}>45 minuten</option>
              </select>
            </div>
          )}
          <div className="live-timer-display">
            <div className="live-timer-getal" style={{color:loopt?"var(--succes)":"var(--blauw)"}}>{formatTijd(seconden)}</div>
            <div className="live-timer-label">{loopt?"&#11044; Loopt":"&#9711; Gestopt"} &#183; Minuut {huidigMinuut()}</div>
          </div>
          <div className="live-timer-knoppen">
            {!loopt ? (
              <button className="knop succes" onClick={startTimer}>&#9654; Start</button>
            ) : (
              <button className="knop lijn" onClick={function(){setLoopt(false);}}>&#9208; Pauze</button>
            )}
            <button className="knop lijn klein" onClick={resetTimer}>&#8635; Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}"""

print("New function length:", len(new_func))
