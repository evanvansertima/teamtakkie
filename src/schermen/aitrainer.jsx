/* ══════════════════════════════════════════════════════════════
   SCHERMEN: AI-trainer — release 4 van docs/updateplan-competitie-
   toernooi-ai.md (hoofdstuk 3d en 5h)
   ─────────────────────────────────────────────────────────────
   Een chatpaneel in Trainingen. Bovenin de context (leeftijd, aantal
   spelers, duur, ruimte, materiaal), ingevuld uit het team en aan te
   passen. Een antwoord verschijnt als kaarten met de tekening; per
   kaart Opslaan in bibliotheek, Makkelijker, Moeilijker, Vervangen.
   Onderaan Training opslaan, met een datum.

   Het voorstel komt van de edge function ai-trainer (Claude), die het
   al heeft gecontroleerd. De app controleert het hier nog eens met
   dezelfde regels (controleerTraining in src/domein/aitrainer.js),
   want wat de trainer opslaat moet kloppen met wat hij ziet. Met
   meldingen kan het alleen via "Toch opslaan", en dan met een
   markering.

   Er gaan nooit namen van spelers, club of team naar de AI: alleen
   veiligeContext(). De trainer krijgt erbij te lezen dat hij in zijn
   vraag geen namen moet typen.
   ══════════════════════════════════════════════════════════════ */

/* Een redelijke beginstand uit het team: leeftijd uit de teamnaam
   (JO11, MO13, O19 …), spelers en keepers uit de selectie. Alles is
   daarna aan te passen. */
function aiBeginContext() {
  var naam = String((inst() || {}).teamNaam || "");
  var m = naam.match(/(?:^|[^A-Za-z])M?J?O\s?(\d{1,2})/i);
  var lft = m ? Number(m[1]) : null;
  var leeftijd = !lft ? "Senioren" : lft <= 11 ? "O9-O11" : lft <= 14 ? "O12-O14" : lft <= 17 ? "O15-O17" : lft <= 19 ? "O18-O19" : "Senioren";
  var spelers = [];
  try { spelers = laadSpelers() || []; } catch (e) {}
  var keepers = spelers.filter(function (s) { return s.positie === "Keeper"; }).length;
  var veld = spelers.length - keepers;
  return { leeftijd: leeftijd, niveau: "gemiddeld", spelers: veld > 0 ? Math.min(veld, 30) : 12, keepers: Math.min(keepers, 2),
           duur: 60, ruimte: "half-b", doel: "Positiespel", materiaal: { pionnen: 20, ballen: 10, doelen: 2, hesjes: true } };
}

/* De vraag aan de server. Zelfde weg als opzeggen en wisselen
   (_metAanmelding en _edgeVraag in src/schermen/instellingen.jsx):
   met je eigen aanmelding, één keer opnieuw na een verlopen token. */
function vraagAiTrainer(lichaam) {
  return _metAanmelding(function (token, clubId) {
    return _edgeVraag("ai-trainer", token, Object.assign({ club_id: clubId }, lichaam)).then(function (r) {
      if (!r.ok && r.status === 404) return { ok: false, status: 404, tekst: "De AI-trainer staat nog niet op de server." };
      return r;
    });
  });
}

/* Een tekening als stilstaand plaatje (maakTekeningCanvas in
   src/schermen/opstellingen.jsx), zodat een kaart niet het hele
   tekenbord hoeft te laden. */
function AiTekening({ tekening }) {
  const [src, setSrc] = useState(null);
  useEffect(function () {
    try { setSrc(maakTekeningCanvas(naarTekening(tekening)).toDataURL("image/png")); } catch (e) { setSrc(null); }
  }, [JSON.stringify(tekening)]);
  if (!src) return null;
  return <img src={src} alt="Tekening van de oefening" style={{width:"100%",borderRadius:10,display:"block",background:"#2e7d32"}} />;
}

const AI_VOORBEELDEN = [
  "Een training van 60 minuten met nadruk op positiespel",
  "Eén oefening voor afwerken na een kaatsbal",
  "Warming-up met bal voor een koude avond",
  "Training over omschakelen na balverlies"
];

function AiTrainer({ onSluiten, onTrainingOpslaan }) {
  const [context, setContext] = useState(aiBeginContext);
  const [contextOpen, setContextOpen] = useState(false);
  const [gesprek, setGesprek] = useState([]);
  const [vraag, setVraag] = useState("");
  const [bezig, setBezig] = useState(false);
  const [opslaan, setOpslaan] = useState(null);   // { training, ongecontroleerd }
  const onderRef = useRef(null);
  useEffect(function () { if (onderRef.current && onderRef.current.scrollIntoView) onderRef.current.scrollIntoView({ behavior: "smooth", block: "end" }); }, [gesprek.length, bezig]);

  function stuur(lichaam, tekstVoorTrainer) {
    if (bezig) return;
    setBezig(true);
    setGesprek(function (g) { return g.concat([{ rol: "trainer", tekst: tekstVoorTrainer }]); });
    vraagAiTrainer(Object.assign({ context: veiligeContext(context) }, lichaam)).then(function (r) {
      setBezig(false);
      if (!r.ok) { setGesprek(function (g) { return g.concat([{ rol: "fout", tekst: r.tekst || "Het lukte niet." }]); }); return; }
      var training = r.gegevens.training;
      /* Opnieuw controleren aan deze kant: de context kan intussen zijn aangepast. */
      var fouten = controleerTraining(training, context);
      setGesprek(function (g) { return g.concat([{ rol: "ai", training: training, fouten: fouten, context: veiligeContext(context) }]); });
    });
  }
  function vraagStellen(tekst) {
    var t = String(tekst || vraag).trim();
    if (!t) return;
    setVraag("");
    stuur({ vraag: t }, t);
  }
  function actie(training, soort, nr) {
    var labels = { makkelijker: "Maak onderdeel " + nr + " makkelijker", moeilijker: "Maak onderdeel " + nr + " moeilijker", vervangen: "Vervang onderdeel " + nr };
    stuur({ basis: training, actie: soort, onderdeel: nr, vraag: "" }, labels[soort]);
  }
  function bewaarOefening(o, ctx, ongecontroleerd) {
    var lijst = laadOefeningen() || [];
    slaJson(OEFENINGEN_KEY, lijst.concat([naarOefening(o, ctx, { ongecontroleerd: ongecontroleerd })]));
    meldGoed("“" + o.naam + "” staat in je bibliotheek");
  }

  var laatsteAi = null;
  gesprek.forEach(function (b, i) { if (b.rol === "ai") laatsteAi = i; });

  return (
    <div className="formatie-overlay" style={{zIndex:400}} onClick={function (e) { if (e.target === e.currentTarget && !bezig) onSluiten(); }}>
      <div className="formatie-sheet" style={{maxWidth:720,width:"100%",height:"min(100dvh, 920px)",maxHeight:"100dvh",display:"flex",flexDirection:"column",padding:0}}
        onClick={function (e) { e.stopPropagation(); }}>
        <div className="formatie-sheet-header" style={{padding:"12px 16px",margin:0,borderBottom:"1px solid var(--grijs)"}}>
          <span className="formatie-sheet-titel"><i className="fa-solid fa-wand-magic-sparkles"/> AI-trainer</span>
          <button aria-label="Sluiten" style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--grijs-donker)",padding:"0 4px"}}
            onClick={onSluiten}>{"✕"}</button>
        </div>

        {/* De context: wat de AI over deze training weet. */}
        <div style={{padding:"8px 16px",borderBottom:"1px solid var(--grijs)",background:"var(--grijs-licht)"}}>
          <button onClick={function () { setContextOpen(!contextOpen); }} aria-expanded={contextOpen}
            style={{display:"flex",width:"100%",alignItems:"center",gap:8,background:"none",border:0,padding:"4px 0",cursor:"pointer",color:"inherit",textAlign:"left",fontSize:13}}>
            <i className="fa-solid fa-sliders" style={{color:"var(--blauw)"}}/>
            <span style={{flex:1,fontWeight:700}}>{contextRegel(context)}</span>
            <span style={{fontSize:12,color:"var(--blauw)"}}>{contextOpen ? "Klaar" : "Aanpassen"}</span>
          </button>
          {contextOpen && <AiContextFormulier context={context} opContext={setContext} />}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
          {gesprek.length === 0 && (
            <div>
              <p style={{fontSize:14,lineHeight:1.6,margin:"4px 0 12px"}}>
                Vraag om een complete training of om één oefening. Je krijgt een voorstel met tekening, afgestemd op het aantal
                spelers, de tijd en het materiaal hierboven.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {AI_VOORBEELDEN.map(function (v) {
                  return <button key={v} className="knop lijn klein" style={{justifyContent:"flex-start",textAlign:"left"}} disabled={bezig}
                    onClick={function () { vraagStellen(v); }}><i className="fa-regular fa-comment"/> {v}</button>;
                })}
              </div>
            </div>
          )}
          {gesprek.map(function (b, i) {
            if (b.rol === "trainer") return (
              <div key={i} style={{display:"flex",justifyContent:"flex-end",margin:"10px 0"}}>
                <div style={{background:"var(--blauw)",color:"var(--op-kleur)",borderRadius:"14px 14px 4px 14px",padding:"8px 12px",maxWidth:"85%",fontSize:14,whiteSpace:"pre-wrap"}}>{b.tekst}</div>
              </div>
            );
            if (b.rol === "fout") return (
              <div key={i} className="melding" style={{background:"var(--vlak-gevaar, #fdecec)"}}><i className="fa-solid fa-triangle-exclamation" style={{color:"var(--gevaar)"}}/> {b.tekst}</div>
            );
            return <AiAntwoord key={i} b={b} actief={i === laatsteAi && !bezig}
              opActie={function (soort, nr) { actie(b.training, soort, nr); }}
              opOefening={function (o) { bewaarOefening(o, b.context, b.fouten.some(function (f) { return f.onderdeel === 0 || f.onderdeel === b.training.onderdelen.indexOf(o) + 1; })); }}
              opTraining={function (ongecontroleerd) { setOpslaan({ training: b.training, context: b.context, ongecontroleerd: ongecontroleerd }); }} />;
          })}
          {bezig && (
            <div style={{display:"flex",alignItems:"center",gap:10,margin:"12px 0",color:"var(--grijs-donker)",fontSize:14}}>
              <i className="fa-solid fa-spinner fa-spin"/> De AI-trainer stelt een voorstel samen en controleert het… (10 à 30 seconden)
            </div>
          )}
          <div ref={onderRef} />
        </div>

        <div style={{borderTop:"1px solid var(--grijs)",padding:"10px 16px calc(10px + env(safe-area-inset-bottom))"}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <textarea className="formulier-input" rows={2} value={vraag} disabled={bezig} maxLength={1500}
              placeholder="Bijv. training over druk zetten, met veel balcontacten" aria-label="Je vraag aan de AI-trainer"
              style={{flex:1,marginBottom:0,resize:"none",fontSize:14}}
              onChange={function (e) { setVraag(e.target.value); }}
              onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); vraagStellen(); } }} />
            <button className="knop" style={{minHeight:48}} disabled={bezig || !vraag.trim()} aria-label="Versturen" onClick={function () { vraagStellen(); }}>
              <i className="fa-solid fa-paper-plane"/></button>
          </div>
          <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"6px 0 0",lineHeight:1.45}}>
            <i className="fa-solid fa-user-shield"/> Typ geen namen van spelers. De AI-trainer is een hulpmiddel, geen gediplomeerde trainer:
            kijk elke oefening zelf na voordat je hem gebruikt.
          </p>
        </div>
      </div>

      {opslaan && <AiOpslaanVenster opslaan={opslaan} onSluiten={function () { setOpslaan(null); }}
        onOpslaan={function (datum, tijd) {
          var t = naarTraining(opslaan.training, opslaan.context, { datum: datum, tijd: tijd, ongecontroleerd: opslaan.ongecontroleerd });
          t.id = Date.now();
          onTrainingOpslaan(t);
          setOpslaan(null);   // de melding "Training toegevoegd" komt van slaOp in TrainingenModule
        }} />}
    </div>
  );
}

function AiContextFormulier({ context, opContext }) {
  function zet(w) { opContext(Object.assign({}, context, w)); }
  function zetMat(w) { opContext(Object.assign({}, context, { materiaal: Object.assign({}, context.materiaal, w) })); }
  function getal(label, waarde, opWaarde, min, max) {
    return (
      <div><label className="formulier-label">{label}</label>
        <GetalVeld className="formulier-input" style={{marginBottom:0}} min={min} max={max} leeg={min} waarde={waarde} opWaarde={opWaarde} /></div>
    );
  }
  return (
    <div style={{padding:"8px 0 4px"}}>
      <div className="formulier-rij" style={{marginBottom:8}}>
        <div><label className="formulier-label">Leeftijd</label>
          <select className="formulier-input" style={{marginBottom:0}} value={context.leeftijd} onChange={function (e) { zet({ leeftijd: e.target.value }); }}>
            {AI_LEEFTIJDEN.map(function (l) { return <option key={l} value={l}>{l}</option>; })}
          </select></div>
        <div><label className="formulier-label">Niveau</label>
          <select className="formulier-input" style={{marginBottom:0}} value={context.niveau} onChange={function (e) { zet({ niveau: e.target.value }); }}>
            {AI_NIVEAUS.map(function (l) { return <option key={l} value={l}>{l}</option>; })}
          </select></div>
      </div>
      <div className="formulier-rij" style={{marginBottom:8}}>
        {getal("Veldspelers", context.spelers, function (n) { zet({ spelers: n }); }, 1, 40)}
        {getal("Keepers", context.keepers, function (n) { zet({ keepers: n }); }, 0, 4)}
      </div>
      <div className="formulier-rij" style={{marginBottom:8}}>
        <div><label className="formulier-label">Duur</label>
          <select className="formulier-input" style={{marginBottom:0}} value={context.duur} onChange={function (e) { zet({ duur: Number(e.target.value) }); }}>
            {[30, 45, 60, 75, 90, 105, 120].map(function (m) { return <option key={m} value={m}>{m + " minuten"}</option>; })}
          </select></div>
        <div><label className="formulier-label">Ruimte</label>
          <select className="formulier-input" style={{marginBottom:0}} value={context.ruimte} onChange={function (e) { zet({ ruimte: e.target.value }); }}>
            {AI_VELDTYPEN.map(function (v) { return <option key={v.id} value={v.id}>{v.uitleg}</option>; })}
          </select></div>
      </div>
      <label className="formulier-label">Hoofddoel</label>
      <select className="formulier-input" value={context.doel} onChange={function (e) { zet({ doel: e.target.value }); }}>
        {AI_DOELEN.map(function (d) { return <option key={d} value={d}>{d}</option>; })}
      </select>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginBottom:8}}>
        {getal("Pionnen", context.materiaal.pionnen, function (n) { zetMat({ pionnen: n }); }, 0, 200)}
        {getal("Ballen", context.materiaal.ballen, function (n) { zetMat({ ballen: n }); }, 0, 60)}
        {getal("Doelen", context.materiaal.doelen, function (n) { zetMat({ doelen: n }); }, 0, 12)}
      </div>
      <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13}}>
        <input type="checkbox" checked={context.materiaal.hesjes !== false} onChange={function (e) { zetMat({ hesjes: e.target.checked }); }} /> Hesjes aanwezig
      </label>
    </div>
  );
}

function AiAntwoord({ b, actief, opActie, opOefening, opTraining }) {
  var tr = b.training || {};
  var onderdelen = Array.isArray(tr.onderdelen) ? tr.onderdelen : [];
  var totaal = onderdelen.reduce(function (s, o) { return s + (Number(o.duur) || 0); }, 0);
  return (
    <div style={{margin:"12px 0"}}>
      <div style={{fontWeight:700,fontSize:16}}>{tr.titel || "Voorstel"}</div>
      <div style={{fontSize:12,color:"var(--grijs-donker)",marginBottom:6}}>
        {aantalTekst(onderdelen.length, "onderdeel", "onderdelen") + " · " + totaal + " min oefenen" + (onderdelen.length > 1 ? " + " + (onderdelen.length - 1) * 2 + " min wisselen" : "")}
      </div>
      {tr.toelichting && <p style={{fontSize:13,lineHeight:1.5,margin:"0 0 8px"}}>{tr.toelichting}</p>}
      {b.fouten.length === 0
        ? <div style={{fontSize:12,color:"var(--succes)",marginBottom:8}}><i className="fa-solid fa-circle-check"/> Gecontroleerd: past in de tijd, bij het aantal spelers en het materiaal.</div>
        : <div className="melding" style={{background:"var(--vlak-gevaar, #fdecec)"}}><i className="fa-solid fa-triangle-exclamation" style={{color:"var(--gevaar)"}}/>
            <div>{"Let op, dit klopt nog niet helemaal:"}{b.fouten.map(function (f, k) { return <div key={k} style={{fontWeight:400}}>{"• " + f.tekst}</div>; })}</div>
          </div>}
      {onderdelen.map(function (o, k) {
        var nr = k + 1;
        var eigen = b.fouten.filter(function (f) { return f.onderdeel === nr; });
        return (
          <div key={k} className="kaart" style={{padding:"12px 14px",borderLeft:eigen.length ? "4px solid var(--gevaar)" : undefined}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:6}}>
              <span style={{fontWeight:700,fontSize:15,flex:1,minWidth:0}}>{nr + ". " + o.naam}</span>
              <span style={{fontSize:12,color:"var(--grijs-donker)",whiteSpace:"nowrap"}}>{o.duur + " min"}</span>
            </div>
            <div style={{fontSize:12,color:"var(--grijs-donker)",marginBottom:8}}>
              {[o.type, o.doel, o.aantalSpelers + " spelers", o.veldGrootte, "intensiteit " + o.intensiteit].filter(Boolean).join(" · ")}
            </div>
            {o.tekening && <AiTekening tekening={o.tekening} />}
            <p style={{fontSize:13.5,lineHeight:1.55,whiteSpace:"pre-wrap",margin:"8px 0"}}>{o.beschrijving}</p>
            {Array.isArray(o.aandachtspunten) && o.aandachtspunten.length > 0 && (
              <ul style={{fontSize:13,lineHeight:1.5,margin:"0 0 8px",paddingLeft:18}}>
                {o.aandachtspunten.map(function (a, j) { return <li key={j}>{a}</li>; })}
              </ul>
            )}
            {o.materialen && <div style={{fontSize:12,color:"var(--grijs-donker)",marginBottom:8}}><i className="fa-solid fa-basket-shopping"/> {o.materialen}</div>}
            {eigen.map(function (f, j) { return <div key={j} style={{fontSize:12,color:"var(--gevaar)",marginBottom:4}}><i className="fa-solid fa-triangle-exclamation"/> {f.tekst.replace(/^Onderdeel \d+: /, "")}</div>; })}
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              <button className="knop lijn klein" onClick={function () { opOefening(o); }}><i className="fa-solid fa-book-open"/> In bibliotheek</button>
              {actief && <>
                <button className="knop lijn klein" onClick={function () { opActie("makkelijker", nr); }}><i className="fa-solid fa-arrow-down"/> Makkelijker</button>
                <button className="knop lijn klein" onClick={function () { opActie("moeilijker", nr); }}><i className="fa-solid fa-arrow-up"/> Moeilijker</button>
                <button className="knop lijn klein" onClick={function () { opActie("vervangen", nr); }}><i className="fa-solid fa-rotate"/> Vervangen</button>
              </>}
            </div>
          </div>
        );
      })}
      {onderdelen.length > 0 && (
        b.fouten.length === 0
          ? <button className="knop" style={{width:"100%",justifyContent:"center"}} onClick={function () { opTraining(false); }}><i className="fa-solid fa-calendar-plus"/> Training opslaan</button>
          : <button className="knop lijn" style={{width:"100%",justifyContent:"center"}} onClick={function () { opTraining(true); }}><i className="fa-solid fa-calendar-plus"/> Toch opslaan (met markering)</button>
      )}
    </div>
  );
}

function AiOpslaanVenster({ opslaan, onSluiten, onOpslaan }) {
  const [datum, setDatum] = useState(vandaagISO());
  const [tijd, setTijd] = useState("19:00");
  return (
    <div className="bevestig-overlay" style={{zIndex:450}} onClick={function (e) { if (e.target === e.currentTarget) onSluiten(); }}>
      <div className="bevestig-kaart" style={{textAlign:"left"}}>
        <h3>Training opslaan</h3>
        <p>{(opslaan.training.titel || "De training") + " komt bij je trainingen, met alle onderdelen en tekeningen. Je kunt hem daarna nog aanpassen."}</p>
        {opslaan.ongecontroleerd && <div className="melding"><i className="fa-solid fa-triangle-exclamation" style={{color:"var(--oranje)"}}/> Er waren nog meldingen. De training krijgt een markering, zodat je weet dat je hem zelf moet nakijken.</div>}
        <div className="formulier-rij">
          <div><label className="formulier-label">Datum</label>
            <input className="formulier-input" type="date" value={datum} onChange={function (e) { setDatum(e.target.value); }} /></div>
          <div><label className="formulier-label">Tijd</label>
            <input className="formulier-input" type="time" value={tijd} onChange={function (e) { setTijd(e.target.value); }} /></div>
        </div>
        <div className="bevestig-knoppen">
          <button className="knop lijn" onClick={onSluiten}>Annuleren</button>
          <button className="knop" onClick={function () { onOpslaan(datum, tijd); }}>Opslaan</button>
        </div>
      </div>
    </div>
  );
}
