/* ══════════════════════════════════════════════════════════════
   TRAININGEN/AGENDA — oefeningenbibliotheek, seizoensplanner,
   trainingen, agenda en de opgave/aanwezigheid-raster eronder
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P4 stap 4
   van docs/p4-stappenplan.md — "isolatie: middel"). Geen import/export:
   tools/bouw.js plakt dit bestand (SCHERM_VOLGORDE) na gedeeld.jsx,
   onboarding.jsx, instellingen.jsx en statistieken.jsx en vóór
   src/app.jsx aan elkaar, dus alles hieronder is nog altijd gewoon
   top-level function in dezelfde scope als src/app.jsx. Dit is een
   verhuizing, geen herschrijving: dezelfde tekst, dezelfde comments.

   AFWEZIGHEIDHINT KWAM VAN VER
   AfwezigheidHint stond fysiek in de spelers-zone van src/app.jsx
   (tussen de "SELECTIE PAGINA"- en "BLESSURES & AFWEZIGHEID"-koppen),
   maar wordt alleen door TrainingFormulier en ActiviteitFormulier
   hieronder gebruikt — zie docs/p4-stappenplan.md §1 stap 4 en §2. Hij
   is daarom hier mee naartoe verplaatst, met zijn eigen kleine helper
   afwezigheidNaarStatus() (die nergens anders wordt aangeroepen).

   TWEE BEKENDE VERWEVENHEDEN (met naam genoemd in het stappenplan)
   1. SpelerStatusRaster (hieronder) wordt ook ééns gebruikt door
      WedstrijdDetail (blijft in src/app.jsx, module wedstrijden, stap
      8) — inclusief de OPGAVE_KEUZES-lijst hieronder, die WedstrijdDetail
      als opties-prop doorgeeft aan diezelfde SpelerStatusRaster-aanroep.
      Werkt gewoon via gedeelde scope (hoisting): geen aanpassing nodig.
   2. Deze module roept op zijn beurt TrainingTekenBord aan (blijft in
      src/app.jsx, module opstellingen, stap 7). Ook dat werkt via
      gedeelde scope. Zie §3 van het stappenplan voor de uitleg waarom
      bestandsvolgorde hier geen technisch verschil maakt.

   WAT HIER BEWUST NIET IS MEEGEKOMEN
   Drie interne hulpfuncties/-constanten stonden fysiek tussen de te
   verplaatsen componenten in, maar zijn gebruikt (ook) buiten deze
   module en blijven daarom in src/app.jsx staan — dit is niet met naam
   genoemd in het stappenplan, gevonden bij het uitvoeren:
   - vandaagISO() — heeft al een eigen toelichting in src/app.jsx
     ("blijft hier staan": gebruikt door agenda, verjaardagen/Dashboard
     én door src/domein/opkomst.js over de bestandsgrens heen).
   - exporteerPresentiePDF() en zijn hulpje hexNaarRgb() — geen van
     beide wordt op dit moment ergens aangeroepen (ook niet vanuit deze
     module); hexNaarRgb() wordt wel nog gebruikt door clubhuis-code
     (module 6, nog niet verplaatst). Beide ongemoeid gelaten.
   Zelfde soort afweging als MODULE_LABEL in instellingen.jsx (P4 stap
   2): alleen meeverhuizen wat uitsluitend door de verhuisde module
   wordt gebruikt.

   TESTAANPASSING BIJ DEZE STAP
   Zie de aantekening in tests/ — bepaald bij het narekenen van alle
   zeven testbestanden op functienamen/regelnummers uit deze module.

   VANGNET
   "trainingen", "agenda" en "trainingen-oefeningen" (nieuw op 17
   september) in tools/gouden-origineel.js bewaken dit scherm.
   Verwachting van deze verplaatsing: volledig identiek. Bekende blinde
   vlek (niet door deze stap verholpen): het tabblad Seizoen
   (SeizoensPlanner) binnen Trainingen is niet gedekt — zie
   docs/p4-stappenplan.md §1 stap 4.

   Zie docs/p4-stappenplan.md §1 (stap 4) en §3 voor de volledige
   redenering. */

/* ═══════════════════════════════════════════════════════════
   ONDERDEEL FORMULIER (modal in modal)
═══════════════════════════════════════════════════════════ */
function OnderdeelFormulier({ onderdeel, onOpslaan, onSluiten }) {
  const [form, setForm] = useState({...LEEG_ONDERDEEL, ...(onderdeel||{})});
  const [bewaarInBieb, setBewaarInBieb] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function opslaan() {
    if (!form.naam.trim()) { meldFout("Vul een naam in voor dit onderdeel."); return; }
    if (bewaarInBieb) {
      var bieb = laadOefeningen();
      var nieuweOef = Object.assign({}, LEEG_OEFENING, {
        id: Date.now(),
        naam: form.naam, type: form.type, doel: form.doel || LEEG_OEFENING.doel,
        duur: form.duur, aantalSpelers: form.aantalSpelers,
        veldGrootte: form.veldGrootte || "", materialen: form.materialen || "",
        beschrijving: form.beschrijving, aandachtspunten: form.aandachtspunten || "",
        tekening: form.tekening
      });
      slaJson(OEFENINGEN_KEY, bieb.concat([nieuweOef]));
      meldGoed("Ook bewaard in je oefeningenbibliotheek");
    }
    onOpslaan({...form, id:form.id||Date.now()});
  }
  const typeKleur = {Oefening:"var(--blauw-licht)","Warming-up":"var(--oranje)",Positiespel:"var(--succes)",Wedstrijdvorm:"var(--blauw)",Conditie:"var(--gevaar)",Afkoelen:"var(--grijs-donker)"};
  return (
    <div className="modal-overlay" style={{zIndex:400}} onClick={e=>{if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Onderdeel bewerken":"Onderdeel toevoegen"}</div>

        <div className="formulier-groep">
          <label className="formulier-label">Naam onderdeel *</label>
          <input className="formulier-input" value={form.naam} onChange={e=>set("naam",e.target.value)} placeholder="bijv. Rondjes passen, 4v4 wedstrijdvorm…" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Type</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {TRAINING_TYPES.map(t => (
              <button key={t} onClick={()=>set("type",t)}
                style={{padding:"7px 12px",borderRadius:8,border:"2px solid",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Helvetica Neue',Arial",
                  borderColor:form.type===t?typeKleur[t]||"var(--blauw)":"var(--grijs)",
                  background:form.type===t?typeKleur[t]||"var(--blauw)":"var(--wit)",
                  color:form.type===t?"var(--wit)":"var(--grijs-donker)"}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Duur (minuten)</label>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button style={{width:32,height:32,borderRadius:"50%",border:"none",background:"var(--blauw)",color:"var(--op-kleur)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>set("duur",Math.max(1,form.duur-5))}>−</button>
              <span style={{fontSize:18,fontWeight:700,minWidth:36,textAlign:"center",fontFamily:"'Helvetica Neue',Arial"}}>{form.duur}{"'"}</span>
              <button style={{width:32,height:32,borderRadius:"50%",border:"none",background:"var(--blauw)",color:"var(--op-kleur)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>set("duur",form.duur+5)}>+</button>
            </div>
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Aantal spelers</label>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button style={{width:32,height:32,borderRadius:"50%",border:"none",background:"var(--blauw)",color:"var(--op-kleur)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>set("aantalSpelers",Math.max(1,form.aantalSpelers-1))}>−</button>
              <span style={{fontSize:18,fontWeight:700,minWidth:28,textAlign:"center",fontFamily:"'Helvetica Neue',Arial"}}>{form.aantalSpelers}</span>
              <button style={{width:32,height:32,borderRadius:"50%",border:"none",background:"var(--blauw)",color:"var(--op-kleur)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>set("aantalSpelers",form.aantalSpelers+1)}>+</button>
            </div>
          </div>
        </div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Veldgrootte</label>
            <input className="formulier-input" value={form.veldGrootte||""} onChange={e=>set("veldGrootte",e.target.value)} placeholder="bijv. 25 x 25 meter" />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Materialen</label>
            <input className="formulier-input" value={form.materialen||""} onChange={e=>set("materialen",e.target.value)} placeholder="pionnen, hesjes, 4 ballen" />
          </div>
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Beschrijving / uitleg</label>
          <textarea className="formulier-input" rows="4" value={form.beschrijving} onChange={e=>set("beschrijving",e.target.value)} placeholder="Uitleg van de oefening, posities, regels…" style={{resize:"vertical"}} />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Coachpunten</label>
          <textarea className="formulier-input" rows="3" value={form.aandachtspunten||""} onChange={e=>set("aandachtspunten",e.target.value)}
            placeholder={"Eén per regel, bijvoorbeeld:\nKijk over je schouder voor je de bal krijgt\nVaste pass op de lange bal"} style={{resize:"vertical"}} />
        </div>

        <div className="formulier-sectie-titel"><i className="fa-solid fa-pen-ruler"/> Tekening</div>
        {form.tekening ? (
          <div>
            <TrainingTekenBord value={form.tekening} onChange={function(d){set("tekening",d);}}
              pdfNaam={form.naam||"Onderdeel"} pdfInfo={form} />
            <button className="knop gevaar klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
              onClick={function(){ set("tekening", null); }}>
              <i className="fa-solid fa-trash"/> Tekening verwijderen
            </button>
          </div>
        ) : (
          <button className="knop lijn" style={{width:"100%",justifyContent:"center"}}
            onClick={function(){ set("tekening", {elems:[],lijnen:[],veldType:"heel-h",stappen:[{id:1,elems:[],lijnen:[]}]}); }}>
            <i className="fa-solid fa-pen-ruler"/> Tekening maken
          </button>
        )}

        <label style={{display:"flex",alignItems:"center",gap:10,marginTop:14,cursor:"pointer"}}>
          <span className={"doel-vink"+(bewaarInBieb?" aan":"")} onClick={function(e){e.preventDefault();setBewaarInBieb(!bewaarInBieb);}}>
            <i className="fa-solid fa-check"/>
          </span>
          <span style={{fontSize:13,fontWeight:600,fontFamily:"'Helvetica Neue',Arial"}}>
            Ook bewaren in mijn oefeningenbibliotheek
          </span>
        </label>

        <div className="modal-voet">
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={opslaan}><i className="fa-solid fa-check"/> Onderdeel opslaan</button>
        </div>
      </div>
    </div>
  );
}

/* SpelerStatusRaster + OPGAVE_KEUZES stonden oorspronkelijk onder de
   koptekst "COMPACTE SPELERSTATUS (opgave & aanwezigheid)" in
   src/app.jsx, samen met exporteerPresentiePDF/hexNaarRgb (die daar
   zijn gebleven, zie bestandskop hierboven). */
function SpelerStatusRaster({ spelers, statussen, opties, standaard, onWissel, onAlles }) {
  /* Bij meer dan vier keuzes is doorklikken te omslachtig; dan kiezen we
     uit een lijstje. De standaardwaarde geven we expliciet mee, want de
     laatste optie is niet altijd de neutrale. */
  const standaardId = standaard || opties[opties.length-1].id;
  const kiezen = opties.length > 4;
  const [open, setOpen] = useState(null);   // speler waarvoor de keuzelijst openstaat

  function infoVan(id) {
    return opties.filter(function(o){ return o.id===id; })[0] || opties[0];
  }
  function volgende(huidig) {
    var i = opties.findIndex(function(o){ return o.id===huidig; });
    return opties[(i+1) % opties.length].id;
  }
  function klik(s, st) {
    if (kiezen) setOpen(s); else onWissel(s, volgende(st));
  }

  return (
    <div>
      <div className="sp-samenvatting">
        {opties.map(function(o){
          var aantal = spelers.filter(function(s){ return (statussen[s.id]||standaardId)===o.id; }).length;
          return (
            <div key={o.id} className="sp-sam-blok" title={o.label}>
              <div className="sp-sam-getal" style={{color:o.kleur||"var(--grijs-donker)"}}>{aantal}</div>
              <div className="sp-sam-label">{o.kort||o.label}</div>
            </div>
          );
        })}
      </div>
      {onAlles && (
        <div className="sp-snelrij">
          {opties.filter(function(o){ return o.snel; }).map(function(o){
            return (
              <button key={o.id} className="knop lijn klein" style={{flex:1,justifyContent:"center",borderColor:o.kleur,color:o.kleur}}
                onClick={function(){ onAlles(o.id); }}>
                {"Iedereen "+o.label.toLowerCase()}
              </button>
            );
          })}
        </div>
      )}
      <div className="sp-raster">
        {spelers.map(function(s){
          var st = statussen[s.id] || standaardId;
          var info = infoVan(st);
          var aan = !!info.kleur;
          return (
            <button key={s.id} className="sp-chip"
              style={{borderColor: aan?info.kleur:"var(--grijs)", background: aan?info.vlak:"var(--wit)"}}
              onClick={function(){ klik(s, st); }}>
              <span className="sp-chip-avatar" style={{background: aan?info.kleur:"var(--blauw-licht)"}}>
                <SpelerBeeld speler={s}/>
              </span>
              <span className="sp-chip-naam">{s.naam.split(" ")[0]}</span>
              {info.letter
                ? <span className="opk-letter" style={{background:info.kleur,color:info.op,minWidth:20,height:18,fontSize:10}}>{info.letter}</span>
                : <span className="sp-chip-merk" style={{color: aan?info.kleur:"var(--grijs-donker)"}}>
                    <i className={info.icoon}/>
                  </span>}
            </button>
          );
        })}
      </div>
      <p style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:400,marginTop:9,textAlign:"center"}}>
        {kiezen ? "Tik op een naam om een status te kiezen" : "Tik op een naam om de status te wisselen"}
      </p>

      {open && (
        <div className="bevestig-overlay" onClick={function(e){ if(e.target===e.currentTarget) setOpen(null); }}>
          <div className="bevestig-kaart" style={{maxWidth:340}}>
            <h3 style={{marginBottom:4}}>{open.naam}</h3>
            <p style={{marginBottom:14}}>Wat was zijn status?</p>
            <div className="status-keuze">
              {opties.map(function(o){
                var aan = (statussen[open.id]||standaardId)===o.id;
                return (
                  <button key={o.id} className={"status-optie"+(aan?" actief":"")}
                    style={{borderColor:o.kleur, background: aan ? o.kleur : "var(--wit)",
                            color: aan ? o.op : "var(--tekst)"}}
                    onClick={function(){ onWissel(open, o.id); setOpen(null); }}>
                    <span className="opk-letter" style={{background:aan?"rgba(255,255,255,.25)":o.kleur,
                            color:aan?o.op:o.op, minWidth:24, height:20}}>{o.letter||"?"}</span>
                    <span style={{flex:1,textAlign:"left"}}>{o.label}</span>
                    <i className={o.icoon}/>
                  </button>
                );
              })}
            </div>
            <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:12}}
              onClick={function(){ setOpen(null); }}>Annuleren</button>
          </div>
        </div>
      )}
    </div>
  );
}

const OPGAVE_KEUZES = [
  {id:"ja",        label:"Ja",        kort:"Ja",        kleur:"var(--succes)", vlak:"var(--vlak-succes)", icoon:"fa-solid fa-check", snel:true},
  {id:"misschien", label:"Misschien", kort:"Mis",       kleur:"var(--oranje)", vlak:"var(--vlak-goud)",   icoon:"fa-solid fa-question"},
  {id:"nee",       label:"Nee",       kort:"Nee",       kleur:"var(--gevaar)", vlak:"var(--vlak-gevaar)", icoon:"fa-solid fa-xmark"},
  /* Uitgeleend is geen soort "nee".

     Tommy speelt zaterdag met de JO19-1. Hij is er dus niet bij ons —
     maar hij is wél aan het voetballen voor de club, en dat is precies
     het omgekeerde van wat "afwezig" betekent. Wie dit als afwezig
     wegschrijft, straft een speler voor iets waar hij om gevraagd is.

     Het is ook geen "ja": hij staat niet in onze opstelling en maakt bij
     ons geen minuten. Daarom een eigen status. */
  {id:"uitgeleend",label:"Uitgeleend",kort:"Uitgel.",   kleur:"#7c3aed",       vlak:"#f3e8ff",            icoon:"fa-solid fa-right-left"},
  {id:"onbekend",  label:"Onbekend",  kort:"Geen",      kleur:null,            vlak:null,                 icoon:"fa-regular fa-circle"}
];

/* ═══════════════════════════════════════════════════════════
   OEFENINGENBIBLIOTHEEK
═══════════════════════════════════════════════════════════ */
function OefeningFormulier({ oefening, onOpslaan, onSluiten }) {
  const [form, setForm] = useState(Object.assign({}, LEEG_OEFENING, oefening||{}));
  const [tekenOpen, setTekenOpen] = useState(false);
  const set = (k,v) => setForm(function(f){ var n=Object.assign({},f); n[k]=v; return n; });
  const typeKleur = {Oefening:"var(--blauw-licht)","Warming-up":"var(--oranje)",Positiespel:"var(--succes)",Wedstrijdvorm:"var(--blauw)",Conditie:"var(--gevaar)",Afkoelen:"var(--grijs-donker)"};

  function opslaan() {
    if (!form.naam.trim()) { meldFout("Vul een naam in voor deze oefening."); return; }
    onOpslaan(Object.assign({}, form, {id: form.id||Date.now()}));
  }

  if (tekenOpen) {
    return (
      <div className="modal-overlay" style={{zIndex:420}} onClick={function(e){if(e.target===e.currentTarget)setTekenOpen(false);}}>
        <div className="modal-sheet">
          <div className="modal-greep"/>
          <div className="modal-titel">Tekening bij {form.naam||"oefening"}</div>
          <TrainingTekenBord value={form.tekening} onChange={function(d){set("tekening",d);}}
            pdfNaam={form.naam||"Oefening"} pdfInfo={form} />
          <button className="knop succes" style={{width:"100%",justifyContent:"center",marginTop:12}}
            onClick={function(){setTekenOpen(false);}}>
            <i className="fa-solid fa-check"/> Klaar met tekenen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" style={{zIndex:400}} onClick={function(e){if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Oefening bewerken":"Oefening toevoegen"}</div>

        <div className="formulier-groep">
          <label className="formulier-label">Naam oefening *</label>
          <input className="formulier-input" value={form.naam} onChange={function(e){set("naam",e.target.value);}}
            placeholder="bijv. Rondo 5 tegen 2" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Type</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {TRAINING_TYPES.map(function(t){
              var aan = form.type===t;
              return (
                <button key={t} onClick={function(){set("type",t);}}
                  style={{padding:"7px 12px",borderRadius:8,border:"2px solid",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Helvetica Neue',Arial",
                    borderColor:aan?(typeKleur[t]||"var(--blauw)"):"var(--grijs)",
                    background:aan?(typeKleur[t]||"var(--blauw)"):"var(--wit)",
                    color:aan?"var(--wit)":"var(--grijs-donker)"}}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Categorie</label>
            <select className="formulier-input" value={form.categorie||"Overig"} onChange={function(e){set("categorie",e.target.value);}}>
              {OEFENING_CATEGORIEEN.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
            </select>
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Leerdoel</label>
            <select className="formulier-input" value={form.doel} onChange={function(e){set("doel",e.target.value);}}>
              {OEFENING_DOELEN.map(function(d){ return <option key={d} value={d}>{d}</option>; })}
            </select>
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Leeftijd</label>
            <select className="formulier-input" value={form.leeftijd} onChange={function(e){set("leeftijd",e.target.value);}}>
              {OEFENING_LEEFTIJDEN.map(function(l){ return <option key={l} value={l}>{l}</option>; })}
            </select>
          </div>
        </div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Duur (minuten)</label>
            <GetalVeld className="formulier-input" min={1} max={120} leeg={0} waarde={form.duur}
              opWaarde={function(n){ set("duur", n); }} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Aantal spelers</label>
            <GetalVeld className="formulier-input" min={1} max={30} leeg={0} waarde={form.aantalSpelers}
              opWaarde={function(n){ set("aantalSpelers", n); }} />
          </div>
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Veldgrootte</label>
          <input className="formulier-input" value={form.veldGrootte} onChange={function(e){set("veldGrootte",e.target.value);}}
            placeholder="bijv. 20 x 30 meter" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Materialen</label>
          <input className="formulier-input" value={form.materialen} onChange={function(e){set("materialen",e.target.value);}}
            placeholder="ballen, pionnen, hesjes, doeltjes…" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Uitleg</label>
          <textarea className="formulier-input" rows="4" value={form.beschrijving}
            onChange={function(e){set("beschrijving",e.target.value);}} style={{resize:"vertical"}}
            placeholder="Organisatie, spelregels, verloop van de oefening…" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Aandachtspunten voor de coach</label>
          <textarea className="formulier-input" rows="2" value={form.aandachtspunten}
            onChange={function(e){set("aandachtspunten",e.target.value);}} style={{resize:"vertical"}}
            placeholder="Waar let je op? Wat coach je?" />
        </div>

        <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginBottom:8}}
          onClick={function(){setTekenOpen(true);}}>
          <i className="fa-solid fa-pen-ruler"/>{form.tekening?" Tekening bewerken":" Tekening toevoegen"}
        </button>

        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={opslaan}><i className="fa-solid fa-check"/> Opslaan</button>
        </div>
      </div>
    </div>
  );
}

function OefeningDetail({ oefening, onTerug, onBewerken, onVerwijderen }) {
  const [bevestig, setBevestig] = useState(false);
  return (
    <div className="pagina-slide">
      <button className="back-knop" onClick={onTerug}><i className="fa-solid fa-arrow-left"/> Terug naar bibliotheek</button>
      <div style={{background:"linear-gradient(135deg,var(--blauw) 0%,#0063cc 100%)",color:"var(--op-kleur)",borderRadius:16,padding:"18px 16px",marginBottom:12}}>
        <div style={{fontSize:11,opacity:.75,textTransform:"uppercase",letterSpacing:.7,fontWeight:700,fontFamily:"'Helvetica Neue',Arial"}}>{oefening.type}</div>
        <div style={{fontSize:21,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",margin:"6px 0 6px",lineHeight:1.25}}>{oefening.naam}</div>
        <div style={{fontSize:12,opacity:.87,display:"flex",flexWrap:"wrap",gap:12}}>
          <span><i className="fa-solid fa-bullseye"/>{" "+oefening.doel}</span>
          <span><i className="fa-solid fa-clock"/>{" "+oefening.duur+" min"}</span>
          <span><i className="fa-solid fa-users"/>{" "+oefening.aantalSpelers+" spelers"}</span>
        </div>
      </div>

      {oefening.tekening && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-pen-ruler"/> Tekening</div>
          <TrainingTekenBord value={oefening.tekening} onChange={function(){}}
            pdfNaam={oefening.naam} pdfInfo={oefening} />
        </div>
      )}

      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-circle-info"/> Gegevens</div>
        <div className="info-rij"><span className="info-icoon"><i className="fa-solid fa-child-reaching"/></span><div><div className="info-label">Leeftijd</div><div className="info-waarde">{oefening.leeftijd}</div></div></div>
        {oefening.veldGrootte&&<div className="info-rij"><span className="info-icoon"><i className="fa-solid fa-ruler-combined"/></span><div><div className="info-label">Veldgrootte</div><div className="info-waarde">{oefening.veldGrootte}</div></div></div>}
        {oefening.materialen&&<div className="info-rij"><span className="info-icoon"><i className="fa-solid fa-basket-shopping"/></span><div><div className="info-label">Materialen</div><div className="info-waarde">{oefening.materialen}</div></div></div>}
      </div>

      {oefening.beschrijving && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-list-ul"/> Uitleg</div>
          <p style={{fontSize:14,fontWeight:400,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{oefening.beschrijving}</p>
        </div>
      )}
      {oefening.aandachtspunten && (
        <div className="kaart" style={{borderLeft:"4px solid var(--oranje)"}}>
          <div className="kaart-titel"><i className="fa-solid fa-lightbulb"/> Aandachtspunten</div>
          <p style={{fontSize:14,fontWeight:400,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{oefening.aandachtspunten}</p>
        </div>
      )}

      <div style={{display:"flex",gap:10,marginTop:4}}>
        <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onBewerken}><i className="fa-solid fa-pen"/> Bewerken</button>
        <button className="knop gevaar klein" onClick={function(){setBevestig(true);}}><i className="fa-solid fa-trash"/></button>
      </div>
      {bevestig&&(
        <div className="bevestig-overlay"><div className="bevestig-kaart">
          <h3>Oefening verwijderen?</h3><p>{oefening.naam} wordt definitief verwijderd uit je bibliotheek.</p>
          <div className="bevestig-knoppen">
            <button className="knop lijn" onClick={function(){setBevestig(false);}}>Annuleren</button>
            <button className="knop gevaar" onClick={onVerwijderen}>Verwijderen</button>
          </div>
        </div></div>
      )}
    </div>
  );
}

function OefeningenBibliotheek({ kiesModus, onKies }) {
  const [oefeningen, setOefeningen] = useState(laadOefeningen);
  const [gekozen, setGekozen] = useState(null);
  const [formulier, setFormulier] = useState(false);
  const [bewerk, setBewerk] = useState(null);
  const [zoek, setZoek] = useState("");
  const [filterDoel, setFilterDoel] = useState("Alle");
  const [filterCat, setFilterCat] = useState("Alle");
  const [alleenFavoriet, setAlleenFavoriet] = useState(false);

  useEffect(function(){ slaJson(OEFENINGEN_KEY, oefeningen); },[oefeningen]);

  function slaOp(o) {
    setOefeningen(function(l){
      var b = l.find(function(x){return x.id===o.id;});
      return b ? l.map(function(x){return x.id===o.id?o:x;}) : l.concat([o]);
    });
    setFormulier(false); setBewerk(null);
    if (gekozen && gekozen.id===o.id) setGekozen(o);
    meldGoed("Oefening \u201c"+o.naam+"\u201d opgeslagen");
  }
  function verwijder() {
    const weg = gekozen;
    setOefeningen(function(l){ return l.filter(function(x){return x.id!==weg.id;}); });
    setGekozen(null);
    toon("Oefening \u201c"+weg.naam+"\u201d verwijderd", {
      actie: function(){ setOefeningen(function(l){ return l.concat([weg]); }); }
    });
  }
  function laadBasisSet() {
    var bestaandeNamen = oefeningen.map(function(o){ return String(o.naam||"").toLowerCase().trim(); });
    var nieuwe = BASIS_OEFENINGEN.filter(function(o){
      return bestaandeNamen.indexOf(o.naam.toLowerCase().trim()) < 0;
    }).map(function(o, i){
      return Object.assign({}, LEEG_OEFENING, o, {id: Date.now() + i});
    });
    if (nieuwe.length === 0) { toon("Deze oefeningen staan er al in."); return; }
    setOefeningen(function(l){ return l.concat(nieuwe); });
    meldGoed(nieuwe.length + " oefeningen toegevoegd");
  }

  function wisselFavoriet(e, o) {
    e.stopPropagation();
    setOefeningen(function(l){
      return l.map(function(x){ return x.id===o.id ? Object.assign({},x,{favoriet:!x.favoriet}) : x; });
    });
  }

  const gefilterd = oefeningen
    .filter(function(o){ return filterCat==="Alle" || (o.categorie||"Overig")===filterCat; })
    .filter(function(o){ return filterDoel==="Alle" || o.doel===filterDoel; })
    .filter(function(o){ return !alleenFavoriet || o.favoriet; })
    .filter(function(o){
      var q = zoek.toLowerCase();
      return !q || (o.naam||"").toLowerCase().indexOf(q)>=0 || (o.beschrijving||"").toLowerCase().indexOf(q)>=0;
    })
    .sort(function(a,b){ return (b.favoriet?1:0)-(a.favoriet?1:0) || (a.naam||"").localeCompare(b.naam||""); });

  const doelen = ["Alle"].concat(OEFENING_DOELEN);
  const typeKleur = {Oefening:"var(--blauw-licht)","Warming-up":"var(--oranje)",Positiespel:"var(--succes)",Wedstrijdvorm:"var(--blauw)",Conditie:"var(--gevaar)",Afkoelen:"var(--grijs-donker)"};

  if (gekozen && !kiesModus) return (
    <>
      <OefeningDetail oefening={gekozen} onTerug={function(){setGekozen(null);}}
        onBewerken={function(){setBewerk(gekozen);setFormulier(true);}} onVerwijderen={verwijder} />
      {formulier && (
        <OefeningFormulier oefening={bewerk} onOpslaan={slaOp}
          onSluiten={function(){setFormulier(false);setBewerk(null);}} />
      )}
    </>
  );

  return (
    <div>
      {!kiesModus && (
        <div className="pagina-header">
          <div className="pagina-header-tekst">
            <div className="eyebrow">Bibliotheek</div>
            <h2>Oefeningen</h2>
            <p>{oefeningen.length} oefening{oefeningen.length!==1?"en":""} in je bibliotheek</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="knop lijn klein" style={{padding:"9px 12px"}}
              title={BASIS_OEFENINGEN.length+" kant-en-klare oefeningen laden"}
              onClick={laadBasisSet}>
              <i className="fa-solid fa-download"/>
            </button>
            <button className="knop-plus" onClick={function(){setBewerk(null);setFormulier(true);}}>+</button>
          </div>
        </div>
      )}

      {oefeningen.length>0 && (
        <div>
          <input className="zoekbalk" placeholder="Zoek op naam of uitleg…" value={zoek}
            onChange={function(e){setZoek(e.target.value);}} />
          <div className="oef-filterbalk">
            {["Alle"].concat(OEFENING_CATEGORIEEN).map(function(c){
              var aan = filterCat===c;
              var aantal = c==="Alle" ? oefeningen.length
                : oefeningen.filter(function(o){ return (o.categorie||"Overig")===c; }).length;
              if (aantal===0 && c!=="Alle") return null;
              return (
                <button key={"c"+c} className="filter-chip" style={{flexShrink:0,fontWeight:700,
                  borderColor:aan?"var(--blauw)":"var(--grijs)",
                  background:aan?"var(--blauw)":"var(--wit)",
                  color:aan?"var(--op-kleur)":"var(--grijs-donker)"}}
                  onClick={function(){setFilterCat(c);}}>{c+" "+aantal}</button>
              );
            })}
          </div>
          <div className="oef-filterbalk">
            {doelen.map(function(d){
              var aan = filterDoel===d;
              return (
                <button key={d} className="filter-chip" style={{flexShrink:0,
                  borderColor:aan?"var(--blauw)":"var(--grijs)",
                  background:aan?"var(--blauw)":"var(--wit)",
                  color:aan?"var(--wit)":"var(--grijs-donker)"}}
                  onClick={function(){setFilterDoel(d);}}>{d}</button>
              );
            })}
            <button className="filter-chip" style={{flexShrink:0,
              borderColor:alleenFavoriet?"#ffc107":"var(--grijs)",
              background:alleenFavoriet?"var(--vlak-goud)":"var(--wit)",
              color:alleenFavoriet?"var(--goud)":"var(--grijs-donker)"}}
              onClick={function(){setAlleenFavoriet(!alleenFavoriet);}}>
              <i className="fa-solid fa-star"/> Favoriet
            </button>
          </div>
        </div>
      )}

      {oefeningen.length===0 ? (
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-book-open"/></div>
          <h3>Nog geen oefeningen</h3>
          <p>Begin met {BASIS_OEFENINGEN.length} kant-en-klare oefeningen, of maak er zelf een.</p>
          {!kiesModus && (
            <div>
              <button className="knop" style={{marginBottom:8}} onClick={laadBasisSet}>
                <i className="fa-solid fa-download"/>{" "+BASIS_OEFENINGEN.length+" oefeningen laden"}
              </button>
              <div>
                <button className="knop lijn klein" onClick={function(){setBewerk(null);setFormulier(true);}}>+ Zelf toevoegen</button>
              </div>
            </div>
          )}
        </div>
      ) : gefilterd.length===0 ? (
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-magnifying-glass"/></div>
          <h3>Geen resultaten</h3><p>Pas je zoekopdracht of filter aan.</p>
        </div>
      ) : (
        <div className="oef-raster">
          {gefilterd.map(function(o){
            return (
              <div key={o.id} className="oef-kaart"
                style={{borderLeftColor: typeKleur[o.type]||"var(--blauw-licht)"}}
                onClick={function(){ if(kiesModus&&onKies) onKies(o); else setGekozen(o); }}>
                <div className="oef-kop">
                  <div style={{flex:1,minWidth:0}}>
                    <div className="oef-naam">{o.naam}</div>
                    <div className="oef-meta">
                      {o.categorie && o.categorie!=="Overig" && (
                        <span className="oef-tag" style={{background:"var(--vlak-info)",color:"var(--blauw)"}}>{o.categorie}</span>
                      )}
                      <span className="oef-tag">{o.type}</span>
                      <span className="oef-tag">{o.doel}</span>
                      <span><i className="fa-solid fa-clock"/>{" "+o.duur+"'"}</span>
                      <span><i className="fa-solid fa-users"/>{" "+o.aantalSpelers}</span>
                      {o.tekening&&<span><i className="fa-solid fa-pen-ruler"/></span>}
                    </div>
                  </div>
                  {kiesModus
                    ? <i className="fa-solid fa-circle-plus" style={{color:"var(--succes)",fontSize:19}}/>
                    : <button className="oef-ster" onClick={function(e){wisselFavoriet(e,o);}}>
                        <i className={o.favoriet?"fa-solid fa-star":"fa-regular fa-star"} style={{color:o.favoriet?"#ffc107":"var(--grijs-donker)"}}/>
                      </button>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formulier && (
        <OefeningFormulier oefening={bewerk} onOpslaan={slaOp}
          onSluiten={function(){setFormulier(false);setBewerk(null);}} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SEIZOENSPLANNER
═══════════════════════════════════════════════════════════ */
function BlokFormulier({ blok, onOpslaan, onSluiten }) {
  const [form, setForm] = useState(Object.assign({}, LEEG_BLOK, blok||{}));
  const set = (k,v) => setForm(function(f){ var n=Object.assign({},f); n[k]=v; return n; });
  function opslaan() {
    if (!form.naam.trim()) { meldFout("Geef het blok een naam."); return; }
    if (!form.vanaf || !form.tot) { meldFout("Vul een begin- en einddatum in."); return; }
    if (parseerDatum(form.tot) < parseerDatum(form.vanaf)) { meldFout("De einddatum ligt vóór de begindatum."); return; }
    onOpslaan(Object.assign({}, form, {id: form.id||Date.now()}));
  }
  const weken = form.vanaf && form.tot ? aantalWeken(form.vanaf, form.tot) : 0;
  return (
    <div className="modal-overlay" style={{zIndex:400}} onClick={function(e){if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Blok bewerken":"Nieuw seizoensblok"}</div>

        <div className="formulier-groep">
          <label className="formulier-label">Naam *</label>
          <input className="formulier-input" value={form.naam} onChange={function(e){set("naam",e.target.value);}}
            placeholder="bijv. Opbouw najaar" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Fase</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {BLOK_THEMAS.map(function(t){
              var aan = form.thema===t.id;
              return (
                <button key={t.id} onClick={function(){set("thema",t.id);}}
                  style={{padding:"7px 13px",borderRadius:9,border:"2px solid",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Helvetica Neue',Arial",
                    borderColor:aan?t.kleur:"var(--grijs)",background:aan?t.kleur:"var(--wit)",
                    color:aan?"#fff":"var(--grijs-donker)"}}>{t.label}</button>
              );
            })}
          </div>
        </div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Van *</label>
            <input className="formulier-input" type="date" value={form.vanaf}
              onChange={function(e){set("vanaf",e.target.value);}} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Tot en met *</label>
            <input className="formulier-input" type="date" value={form.tot}
              onChange={function(e){set("tot",e.target.value);}} />
          </div>
        </div>
        {weken>0 && (
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,marginBottom:12,marginTop:-4}}>
            {"Dit blok beslaat ongeveer "+weken+" week"+(weken===1?"":"weken")+"."}
          </p>
        )}

        <div className="formulier-groep">
          <label className="formulier-label">Waar ligt de focus?</label>
          <textarea className="formulier-input" rows="3" value={form.focus}
            onChange={function(e){set("focus",e.target.value);}} style={{resize:"vertical"}}
            placeholder="bijv. Druk zetten vanaf voren, restverdediging, standaardsituaties" />
        </div>

        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={opslaan}><i className="fa-solid fa-check"/> Opslaan</button>
        </div>
      </div>
    </div>
  );
}

function SeizoensPlanner() {
  const [blokken, setBlokken] = useState(laadBlokken);
  const [formulier, setFormulier] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(function(){ slaJson(SEIZOEN_KEY, blokken); },[blokken]);

  const trainingen = laadTrainingen();
  const wedstrijden = laadWedstrijden();
  const gesorteerd = blokken.slice().sort(function(a,b){
    return (parseerDatum(a.vanaf)||0) - (parseerDatum(b.vanaf)||0);
  });
  const totaalDagen = gesorteerd.reduce(function(s,b){ return s + blokDagen(b.vanaf,b.tot); },0);

  function slaOp(b) {
    setBlokken(function(l){
      var bestaat = l.find(function(x){return x.id===b.id;});
      return bestaat ? l.map(function(x){return x.id===b.id?b:x;}) : l.concat([b]);
    });
    setFormulier(null);
    meldGoed("Blok opgeslagen");
  }
  function verwijder(b) {
    setBlokken(function(l){ return l.filter(function(x){return x.id!==b.id;}); });
    if (open===b.id) setOpen(null);
    toon("Blok \u201c"+b.naam+"\u201d verwijderd", {
      actie: function(){ setBlokken(function(l){ return l.concat([b]); }); }
    });
  }
  function trainingenIn(b) {
    return trainingen.filter(function(t){ return inPeriode(t.datum, b.vanaf, b.tot); })
      .sort(function(x,y){ return (parseerDatum(x.datum)||0)-(parseerDatum(y.datum)||0); });
  }
  function wedstrijdenIn(b) {
    return wedstrijden.filter(function(w){ return inPeriode(w.datum, b.vanaf, b.tot); })
      .sort(function(x,y){ return (parseerDatum(x.datum)||0)-(parseerDatum(y.datum)||0); });
  }

  return (
    <div>
      <div className="pagina-header">
        <div className="pagina-header-tekst">
          <div className="eyebrow">Periodisering</div>
          <h2>Seizoen</h2>
          <p>{blokken.length===0 ? "Deel je seizoen op in blokken met een eigen focus" : gesorteerd.length+" blokken · seizoen "+inst().seizoen}</p>
        </div>
        <button className="knop-plus" onClick={function(){setFormulier({});}}>+</button>
      </div>

      {gesorteerd.length>1 && totaalDagen>0 && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-timeline"/> Seizoensoverzicht</div>
          <div className="seizoen-tijdlijn">
            {gesorteerd.map(function(b){
              var breedte = blokDagen(b.vanaf,b.tot)/totaalDagen*100;
              var th = blokThema(b.thema);
              return (
                <div key={b.id} className="seizoen-segment"
                  style={{width:breedte+"%",background:th.kleur,opacity:isNuBezig(b.vanaf,b.tot)?1:0.72}}
                  title={b.naam}
                  onClick={function(){ setOpen(open===b.id?null:b.id); }}>
                  {breedte>11 ? b.naam.split(" ")[0] : ""}
                </div>
              );
            })}
          </div>
          <div style={{fontSize:11,color:"var(--grijs-donker)",textAlign:"center",marginTop:4}}>
            Breedte is naar rato van de duur · tik op een blok
          </div>
        </div>
      )}

      {gesorteerd.length===0 ? (
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-calendar-week"/></div>
          <h3>Nog geen seizoensblokken</h3>
          <p>Verdeel het seizoen in periodes zoals voorbereiding, opbouw en competitie, elk met een eigen focus. Trainingen en wedstrijden worden automatisch aan het juiste blok gekoppeld.</p>
          <button className="knop" onClick={function(){setFormulier({});}}>+ Eerste blok</button>
        </div>
      ) : (
        <div>
          {gesorteerd.map(function(b){
            var th = blokThema(b.thema);
            var tr = trainingenIn(b);
            var wd = wedstrijdenIn(b);
            var isOpen = open===b.id;
            return (
              <div key={b.id} className="blok-kaart">
                <div className="blok-streep" style={{background:th.kleur}}/>
                <div className="blok-body">
                  <div className="blok-kop">
                    <div style={{flex:1,minWidth:0}}>
                      <div className="blok-naam">
                        {b.naam}
                        {isNuBezig(b.vanaf,b.tot) && <span className="blok-nu">Nu</span>}
                      </div>
                      <div className="blok-periode">
                        <span className="oef-tag" style={{background:th.kleur,color:"#fff",marginRight:7}}>{th.label}</span>
                        {formateerDatumKort(b.vanaf)+" – "+formateerDatumKort(b.tot)+" · "+aantalWeken(b.vanaf,b.tot)+" wk"}
                      </div>
                    </div>
                    <button className="knop lijn klein" style={{padding:"5px 9px"}} onClick={function(){setFormulier(b);}}>
                      <i className="fa-solid fa-pen"/>
                    </button>
                    <button className="knop gevaar klein" style={{padding:"5px 9px"}} onClick={function(){verwijder(b);}}>
                      <i className="fa-solid fa-trash"/>
                    </button>
                  </div>

                  {b.focus && <p style={{fontSize:13,fontWeight:400,lineHeight:1.55,marginTop:10,whiteSpace:"pre-wrap"}}>{b.focus}</p>}

                  <div className="blok-tellers">
                    <div className="blok-teller">
                      <div className="blok-teller-getal" style={{color:"var(--blauw)"}}>{tr.length}</div>
                      <div className="blok-teller-label">Trainingen</div>
                    </div>
                    <div className="blok-teller">
                      <div className="blok-teller-getal" style={{color:"var(--succes)"}}>{wd.length}</div>
                      <div className="blok-teller-label">Wedstrijden</div>
                    </div>
                    <div className="blok-teller">
                      <div className="blok-teller-getal">{aantalWeken(b.vanaf,b.tot)}</div>
                      <div className="blok-teller-label">Weken</div>
                    </div>
                  </div>

                  {(tr.length>0 || wd.length>0) && (
                    <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:10}}
                      onClick={function(){ setOpen(isOpen?null:b.id); }}>
                      <i className={isOpen?"fa-solid fa-chevron-up":"fa-solid fa-chevron-down"}/>
                      {isOpen?" Verberg planning":" Toon planning"}
                    </button>
                  )}

                  {isOpen && (
                    <div style={{marginTop:12}}>
                      {wd.length>0 && <>
                        <div className="review-label">Wedstrijden</div>
                        {wd.map(function(w){
                          return (
                            <div key={w.id} className="event-rij">
                              <span className="event-icoon"><i className="fa-solid fa-futbol" style={{color:"var(--succes)"}}/></span>
                              <div className="event-info">
                                <div className="event-naam">{w.tegenstander}</div>
                                <div className="event-sub">{formateerDatumKort(w.datum)+" · "+(w.thuis?"Thuis":"Uit")}</div>
                              </div>
                              {w.status==="gespeeld" && <div className="event-minuut">{w.score.fch+"-"+w.score.teg}</div>}
                            </div>
                          );
                        })}
                      </>}
                      {tr.length>0 && <>
                        <div className="review-label">Trainingen</div>
                        {tr.map(function(t){
                          return (
                            <div key={t.id} className="event-rij">
                              <span className="event-icoon"><i className="fa-solid fa-person-running" style={{color:"var(--blauw)"}}/></span>
                              <div className="event-info">
                                <div className="event-naam">{formateerDatumKort(t.datum)+(t.tijd?" · "+t.tijd:"")}</div>
                                <div className="event-sub">{(t.onderdelen||[]).length+" onderdelen"+(t.locatie?" · "+t.locatie:"")}</div>
                              </div>
                            </div>
                          );
                        })}
                      </>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formulier && (
        <BlokFormulier blok={formulier.id?formulier:null} onOpslaan={slaOp}
          onSluiten={function(){setFormulier(null);}} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRAINING FORMULIER
═══════════════════════════════════════════════════════════ */
function TrainingFormulier({ training, onOpslaan, onSluiten }) {
  const [bibliotheekOpen, setBibliotheekOpen] = useState(false);
  const spelers = laadSpelers();
  const [form, setForm] = useState(() => {
    const base = {id:null,datum:"",tijd:"",locatie:"",duur:90,doelstellingen:"",voorbereidingen:"",materialen:"",onderdelen:[],notities:""};
    if (!training) {
      return {...base, aanwezigheid: spelers.map(s=>({spelerId:s.id,naam:s.naam,foto:s.foto,status:"aanwezig"}))};
    }
    return {...base,...training};
  });
  const [onderdeelFormulier, setOnderdeelFormulier] = useState(null);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function toggleAanwezigheid(spelerId, status) {
    setForm(f=>({...f, aanwezigheid: f.aanwezigheid.map(a=>a.spelerId===spelerId?{...a,status}:a)}));
  }

  function voegUitBibliotheekToe(oef) {
    setForm(function(f){
      var nieuw = {
        id: Date.now(),
        naam: oef.naam,
        type: oef.type,
        doel: oef.doel || "",
        duur: oef.duur,
        aantalSpelers: oef.aantalSpelers,
        veldGrootte: oef.veldGrootte || "",
        materialen: oef.materialen || "",
        beschrijving: oef.beschrijving || "",
        aandachtspunten: oef.aandachtspunten || "",
        tekening: oef.tekening || null,
        uitBibliotheek: oef.id
      };
      return Object.assign({}, f, {onderdelen: f.onderdelen.concat([nieuw])});
    });
    setBibliotheekOpen(false);
  }

  function slaOnderdeelOp(od) {
    setForm(f=>{
      const bestaat = f.onderdelen.find(x=>x.id===od.id);
      return {...f, onderdelen: bestaat ? f.onderdelen.map(x=>x.id===od.id?od:x) : [...f.onderdelen,od]};
    });
    setOnderdeelFormulier(null);
  }

  function verwijderOnderdeel(id) {
    setForm(f=>({...f, onderdelen:f.onderdelen.filter(x=>x.id!==id)}));
  }

  function opslaan() {
    if (!form.datum) { meldFout("Vul een datum in."); return; }
    onOpslaan({...form, id:form.id||Date.now()});
  }

  const typeKleur = {Oefening:"var(--blauw-licht)","Warming-up":"var(--oranje)",Positiespel:"var(--succes)",Wedstrijdvorm:"var(--blauw)",Conditie:"var(--gevaar)",Afkoelen:"var(--grijs-donker)"};

  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Training bewerken":"Training toevoegen"}</div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Datum *</label>
            <input className="formulier-input" type="date" value={form.datum} onChange={e=>set("datum",e.target.value)} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Aanvangstijd</label>
            <input className="formulier-input" type="time" value={form.tijd} onChange={e=>set("tijd",e.target.value)} />
          </div>
        </div>
        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Locatie</label>
            <input className="formulier-input" value={form.locatie} onChange={e=>set("locatie",e.target.value)} placeholder="Sportpark De Zeehoek" />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Duur (min)</label>
            <GetalVeld className="formulier-input" min={30} max={180} step="5" leeg={90} waarde={form.duur} opWaarde={function(n){ set("duur", n); }} />
          </div>
        </div>

        <div className="formulier-sectie-titel"><i className="fa-solid fa-bullseye"/> Doelstellingen</div>
        <div className="formulier-groep">
          <textarea className="formulier-input" rows="2" value={form.doelstellingen} onChange={e=>set("doelstellingen",e.target.value)} placeholder="Wat wil je bereiken met deze training?" style={{resize:"vertical"}} />
        </div>

        <div className="formulier-sectie-titel"><i className="fa-solid fa-clipboard"/> Voorbereiding &amp; Materialen</div>
        <div className="formulier-groep">
          <label className="formulier-label">Voorbereiding</label>
          <textarea className="formulier-input" rows="2" value={form.voorbereidingen} onChange={e=>set("voorbereidingen",e.target.value)} placeholder="Wat moet je voorbereiden? Veldopstelling, hesjes…" style={{resize:"vertical"}} />
        </div>
        <div className="formulier-groep">
          <label className="formulier-label">Materialen (meenemen)</label>
          <input className="formulier-input" value={form.materialen} onChange={e=>set("materialen",e.target.value)} placeholder="ballen, hesjes, pionnen, doeltjes…" />
        </div>

        <div className="formulier-sectie-titel"><i className="fa-solid fa-person-running"/> Onderdelen ({form.onderdelen.length})</div>
        {form.onderdelen.map((od,i) => (
          <div key={od.id} style={{display:"flex",alignItems:"center",gap:8,background:"var(--grijs-licht)",borderRadius:10,padding:"8px 12px",marginBottom:8,borderLeft:"4px solid "+(typeKleur[od.type]||"var(--blauw-licht)")}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:13}}>{i+1}. {od.naam}</div>
              <div style={{fontSize:11,color:"var(--grijs-donker)",marginTop:2}}>{od.type} · {od.duur}{"'"} · {od.aantalSpelers} spelers</div>
            </div>
            <button className="knop lijn klein" style={{padding:"4px 8px"}} onClick={()=>setOnderdeelFormulier(od)}><i className="fa-solid fa-pen"/></button>
            <button className="knop gevaar klein" style={{padding:"4px 8px"}} onClick={()=>verwijderOnderdeel(od.id)}><i className="fa-solid fa-trash"/></button>
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button className="knop lijn klein" style={{flex:1,justifyContent:"center"}} onClick={()=>setOnderdeelFormulier({})}>
            + Nieuw onderdeel
          </button>
          <button className="knop klein" style={{flex:1,justifyContent:"center"}} onClick={function(){setBibliotheekOpen(true);}}>
            <i className="fa-solid fa-book-open"/> Uit bibliotheek
          </button>
        </div>

        <div className="formulier-sectie-titel"><i className="fa-solid fa-users"/> Aanwezigheid</div>
        {form.aanwezigheid.length===0 ? (
          <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,marginBottom:8}}>Voeg eerst spelers toe via Selectie.</p>
        ) : (
          <React.Fragment>
          <AfwezigheidHint datum={form.datum} lijst={form.aanwezigheid}
            onOvernemen={function(wijzigingen){
              setForm(function(f){
                return Object.assign({}, f, {aanwezigheid: f.aanwezigheid.map(function(a){
                  var w = wijzigingen.filter(function(x){ return x.spelerId===a.spelerId; })[0];
                  return w ? Object.assign({}, a, {status:w.status}) : a;
                })});
              });
              meldGoed(wijzigingen.length+" status"+(wijzigingen.length===1?"":"sen")+" overgenomen");
            }} />
          <SpelerStatusRaster
            spelers={form.aanwezigheid.map(function(a){ return {id:a.spelerId, naam:a.naam, foto:a.foto}; })}
            statussen={form.aanwezigheid.reduce(function(o,a){ o[a.spelerId]=a.status||"aanwezig"; return o; },{})}
            opties={AANWEZIG_KEUZES}
            standaard="aanwezig"
            onWissel={function(speler,status){ toggleAanwezigheid(speler.id, status); }}
            onAlles={function(status){
              setForm(function(f){
                return Object.assign({}, f, {aanwezigheid: f.aanwezigheid.map(function(a){
                  return Object.assign({}, a, {status:status});
                })});
              });
            }} />
          </React.Fragment>
        )}

        <div className="modal-voet">
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={opslaan}>
            <i className="fa-solid fa-check"/> Training opslaan
          </button>
        </div>

        {onderdeelFormulier!==null && (
          <OnderdeelFormulier
            onderdeel={onderdeelFormulier.id?onderdeelFormulier:null}
            onOpslaan={slaOnderdeelOp}
            onSluiten={()=>setOnderdeelFormulier(null)}
          />
        )}

        {bibliotheekOpen && (
          <div className="modal-overlay" style={{zIndex:400}} onClick={function(e){if(e.target===e.currentTarget)setBibliotheekOpen(false);}}>
            <div className="modal-sheet">
              <div className="modal-greep"/>
              <div className="modal-titel">Kies een oefening</div>
              <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,textAlign:"center",marginBottom:12}}>
                Tik op een oefening om die aan deze training toe te voegen.
              </p>
              <OefeningenBibliotheek kiesModus={true} onKies={voegUitBibliotheekToe} />
              <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:14}}
                onClick={function(){setBibliotheekOpen(false);}}>Sluiten</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRAINING DETAIL
═══════════════════════════════════════════════════════════ */
function TrainingDetail({ training, spelers, onTerug, onBewerken, onVerwijderen, onOpslaan }) {
  const [openOnderdeel, setOpenOnderdeel] = useState(null);
  const [tekenData, setTekenData] = useState({});
  const [bevestig, setBevestig] = useState(false);

  /* Schrijft de tekening van dit onderdeel terug naar de training */
  function bewaarTekening(onderdeelId) {
    var d = tekenData[onderdeelId];
    if (!d) return;
    var nieuw = (training.onderdelen||[]).map(function(o){
      return o.id===onderdeelId ? Object.assign({}, o, {tekening:d}) : o;
    });
    onOpslaan(Object.assign({}, training, {onderdelen:nieuw}));
    setTekenData(function(p){ var n=Object.assign({},p); delete n[onderdeelId]; return n; });
    meldGoed("Tekening opgeslagen");
  }

  /* Waarschuwen als je weggaat met onbewaarde tekeningen */
  function terugMetControle() {
    if (Object.keys(tekenData).length > 0) {
      if (!window.confirm("Je hebt tekeningen die nog niet zijn opgeslagen. Toch teruggaan?")) return;
    }
    onTerug();
  }
  const [deelOpen, setDeelOpen] = useState(false);
  const [opgave, setOpgaveLijst] = useState(training.opgave||[]);

  const selectie = spelers || [];
  const trainingDatum = parseerDatum(training.datum);
  const vandaag = new Date(); vandaag.setHours(0,0,0,0);
  const isToekomst = trainingDatum ? trainingDatum >= vandaag : false;

  function wijzigOpgave(speler, status) {
    var huidig = opgaveVanSpeler(opgave, speler.id);
    var nieuw = zetOpgave(opgave, speler, huidig===status ? "onbekend" : status);
    setOpgaveLijst(nieuw);
    if (onOpslaan) onOpslaan(Object.assign({}, training, {opgave:nieuw}));
  }

  const typeKleurClass = {Oefening:"","Warming-up":"type-warmup",Positiespel:"type-positie",Wedstrijdvorm:"type-wedstrijd",Conditie:"type-conditie",Afkoelen:"type-afkoelen"};

  /* Per status gegroepeerd, zodat elke categorie zijn eigen lijstje krijgt */
  const perAanwStatus = AANWEZIG_KEUZES.map(function(k){
    return {keuze:k, spelers:(training.aanwezigheid||[]).filter(function(a){ return a.status===k.id; })};
  }).filter(function(g){ return g.spelers.length>0; });
  const totaalDuur  = (training.onderdelen||[]).reduce((s,o)=>s+o.duur,0);

  function toggleOnderdeel(id) {
    setOpenOnderdeel(prev => prev===id ? null : id);
  }

  return (
    <div className="pagina-slide">
      <button className="back-knop" onClick={terugMetControle}><i className="fa-solid fa-arrow-left"/> Terug naar trainingen</button>

      {/* Banner */}
      <div style={{background:"linear-gradient(135deg,var(--blauw) 0%,#0063cc 100%)",color:"var(--op-kleur)",borderRadius:16,padding:"18px 16px",marginBottom:12}}>
        <div style={{fontSize:11,opacity:.75,textTransform:"uppercase",letterSpacing:.7,fontFamily:"'Helvetica Neue',Arial",fontWeight:700}}><i className="fa-solid fa-person-running"/> {trainingTitel(training)}</div>
        <div style={{fontSize:22,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",margin:"6px 0 4px"}}>{training.datum?formateerDatum(training.datum):"Geen datum"}</div>
        <div style={{fontSize:13,opacity:.87}}>
          {training.tijd&&<span style={{marginRight:12}}>⏰ {training.tijd}</span>}
          {training.locatie&&<span style={{marginRight:12}}>📍 {training.locatie}</span>}
          {training.duur&&<span>⏱ {training.duur} min</span>}
        </div>
        {totaalDuur>0&&<div style={{fontSize:12,opacity:.75,marginTop:4}}><i className="fa-solid fa-list-ul"/> {training.onderdelen.length} onderdelen · {totaalDuur}{"'"} gepland</div>}
      </div>

      {/* WhatsApp */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <button className="knop" style={{flex:"1 1 190px",justifyContent:"center"}}
          onClick={function(){ exporteerTrainingPDF(training); }}>
          <i className="fa-solid fa-file-pdf"/> Trainingsplan als PDF
        </button>
      </div>
      <button className="knop wa" style={{marginBottom:12,marginTop:0}} onClick={function(){setDeelOpen(true);}}>
        <i className="fa-brands fa-whatsapp" style={{fontSize:18}}/> Training delen
      </button>
      {deelOpen && <DeelVenster titel="Training delen" varianten={deelVariantenTraining(training)}
        pdfLabel="Trainingsplan" pdfActie={function(){ exporteerTrainingPDF(training, true); }}
        onSluiten={function(){setDeelOpen(false);}} />}

      {/* Doelstellingen */}
      {training.doelstellingen&&(
        <div className="kaart detail-sectie">
          <div className="kaart-titel"><i className="fa-solid fa-bullseye"/> Doelstellingen</div>
          <p style={{fontSize:14,fontWeight:400,lineHeight:1.6}}>{training.doelstellingen}</p>
        </div>
      )}

      {/* Voorbereiding & materialen */}
      {(training.voorbereidingen||training.materialen)&&(
        <div className="kaart detail-sectie">
          {training.voorbereidingen&&<><div className="kaart-titel"><i className="fa-solid fa-clipboard"/> Voorbereiding</div><p style={{fontSize:14,fontWeight:400,lineHeight:1.6,marginBottom:training.materialen?12:0}}>{training.voorbereidingen}</p></>}
          {training.materialen&&<><div className="kaart-titel" style={{marginTop:training.voorbereidingen?8:0}}><i className="fa-solid fa-basket-shopping"/> Materialen</div><p style={{fontSize:14,fontWeight:400,lineHeight:1.6}}>{training.materialen}</p></>}
        </div>
      )}

      {/* Onderdelen */}
      {training.onderdelen&&training.onderdelen.length>0&&(
        <div className="kaart detail-sectie">
          <div className="kaart-titel"><i className="fa-solid fa-person-running"/> Trainingsonderdelen</div>
          {training.onderdelen.map((od,i) => {
            const isOpen = openOnderdeel===od.id;
            const klasse = typeKleurClass[od.type]||"";
            return (
              <div key={od.id} className={"onderdeel-kaart "+klasse} style={{marginBottom:i<training.onderdelen.length-1?10:0}}>
                <div className="onderdeel-header" onClick={()=>toggleOnderdeel(od.id)}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                    <div style={{width:22,height:22,borderRadius:6,background:"var(--blauw)",color:"var(--op-kleur)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}>
                      <div className="onderdeel-naam-tekst">{od.naam}</div>
                      <div className="onderdeel-meta">{od.type} · ⏱ {od.duur}{"'"} · 👥 {od.aantalSpelers} spelers</div>
                    </div>
                  </div>
                  <span className={"onderdeel-chevron"+(isOpen?" open":"")}>▾</span>
                </div>
                {isOpen&&(
                  <div style={{marginTop:12}}>
                    {od.beschrijving&&<p style={{fontSize:13,fontWeight:400,lineHeight:1.6,marginBottom:12,color:"var(--tekst)"}}>{od.beschrijving}</p>}
                    <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8,fontFamily:"'Helvetica Neue',Arial"}}>🖊 Tekentool</div>
                    <TrainingTekenBord
                      value={tekenData[od.id]||od.tekening}
                      onChange={function(d){ setTekenData(function(p){ var n=Object.assign({},p); n[od.id]=d; return n; }); }}
                      pdfNaam={od.naam||"Training tekening"}
                      pdfInfo={od}
                    />
                    {/* Zonder deze knop bleef de tekening in het scherm hangen
                        en was hij weg zodra je de training verliet. */}
                    <div className="teken-bewaar">
                      <span className={"teken-bewaar-tekst"+(tekenData[od.id]?" wacht":"")}>
                        {tekenData[od.id]
                          ? <><i className="fa-solid fa-circle-exclamation"/> Je hebt wijzigingen die nog niet zijn bewaard.</>
                          : <><i className="fa-solid fa-circle-check"/> Alles is bewaard.</>}
                      </span>
                      <button className="knop succes klein" disabled={!tekenData[od.id]}
                        style={{opacity: tekenData[od.id] ? 1 : .45}}
                        onClick={function(){ bewaarTekening(od.id); }}>
                        <i className="fa-solid fa-floppy-disk"/> Tekening opslaan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Opgave vooraf */}
      {isToekomst && selectie.length>0 && (
        <div className="kaart detail-sectie">
          <div className="kaart-titel"><i className="fa-solid fa-clipboard-check"/> Wie komt er trainen?</div>
          <SpelerStatusRaster
            spelers={selectie}
            statussen={selectie.reduce(function(o,s){ o[s.id]=opgaveVanSpeler(opgave,s.id); return o; },{})}
            opties={OPGAVE_KEUZES}
            standaard="onbekend"
            onWissel={function(speler,status){
              var nieuw = zetOpgave(opgave, speler, status);
              setOpgaveLijst(nieuw);
              if (onOpslaan) onOpslaan(Object.assign({}, training, {opgave:nieuw}));
            }}
            onAlles={function(status){
              var nieuw = opgave;
              selectie.forEach(function(s){ nieuw = zetOpgave(nieuw, s, status); });
              setOpgaveLijst(nieuw);
              if (onOpslaan) onOpslaan(Object.assign({}, training, {opgave:nieuw}));
            }} />
        </div>
      )}

      {/* Aanwezigheid */}
      {!isToekomst && training.aanwezigheid && training.aanwezigheid.length>0 && (
        <div className="kaart detail-sectie">
          {(function(){
            var o = opkomstVan(training, laadAfwezigheden());
            return (
              <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <span><i className="fa-solid fa-users"/> Aanwezigheid</span>
                <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:12,color:"var(--grijs-donker)"}}>
                  {o ? o.aanwezig+" van "+o.totaal+" · "+o.pct+"%" : ""}
                </span>
              </div>
            );
          })()}

          {/* Balk met de verdeling over alle statussen */}
          <div className="opk-balk">
            {perAanwStatus.map(function(g){
              return (
                <span key={g.keuze.id} title={g.keuze.label+": "+g.spelers.length}
                  style={{flex:g.spelers.length, background:g.keuze.kleur}}/>
              );
            })}
          </div>
          <div className="opk-legenda">
            {perAanwStatus.map(function(g){
              return (
                <span key={g.keuze.id} className="opk-legenda-item">
                  <span className="opk-stip" style={{background:g.keuze.kleur}}/>
                  {g.keuze.label+" "+g.spelers.length}
                </span>
              );
            })}
          </div>

          {perAanwStatus.map(function(g){
            return (
              <div key={g.keuze.id}>
                <div className="opk-kop" style={{color:g.keuze.kleur}}>
                  <span className="opk-letter" style={{background:g.keuze.kleur,color:g.keuze.op}}>{g.keuze.letter}</span>
                  <i className={g.keuze.icoon}/> {g.keuze.label} ({g.spelers.length})
                </div>
                {g.spelers.map(function(a){
                  return (
                    <div key={a.spelerId} className="opp-rij" style={{opacity: g.keuze.telt ? 1 : .72}}>
                      <div className="opp-avatar" style={{width:32,height:32,fontSize:11}}><SpelerBeeld speler={a}/></div>
                      <div className="opp-naam" style={{fontSize:13}}>{a.naam}</div>
                      <span style={{fontSize:15,color:g.keuze.kleur}}><i className={g.keuze.icoon}/></span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {training.notities&&<div className="kaart"><div className="kaart-titel"><i className="fa-solid fa-note-sticky"/> Notities</div><p style={{fontSize:14,fontWeight:400,lineHeight:1.5}}>{training.notities}</p></div>}

      <div style={{display:"flex",gap:10,marginTop:4}}>
        <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onBewerken}><i className="fa-solid fa-pen"/> Bewerken</button>
        <button className="knop gevaar klein" onClick={()=>setBevestig(true)}><i className="fa-solid fa-trash"/></button>
      </div>

      {bevestig&&(
        <div className="bevestig-overlay">
          <div className="bevestig-kaart">
            <h3>Training verwijderen?</h3>
            <p>De training van {formateerDatumKort(training.datum)} wordt definitief verwijderd.</p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={()=>setBevestig(false)}>Annuleren</button>
              <button className="knop gevaar" onClick={onVerwijderen}>Verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRAININGEN MODULE
═══════════════════════════════════════════════════════════ */
function TrainingenModule() {
  const [tab, setTab] = useState("trainingen");
  const [trainingen, setTrainingen] = useState(laadTrainingen);
  const [gekozen, setGekozen] = useState(null);
  const [formulierOpen, setFormulier] = useState(false);
  const [bewerkT, setBewerkT] = useState(null);
  const [zoekT, setZoekT] = useState("");

  useEffect(() => { slaJson(TRAININGEN_KEY, trainingen); }, [trainingen]);

  function slaOp(t) {
    const bestond = trainingen.some(x=>x.id===t.id);
    setTrainingen(l => { const b=l.find(x=>x.id===t.id); return b?l.map(x=>x.id===t.id?t:x):[...l,t]; });
    setFormulier(false); setBewerkT(null);
    if (gekozen?.id===t.id) setGekozen(t);
    if (!bestond) meldGoed("Training toegevoegd");
  }

  function verwijder() {
    const weg = gekozen;
    setTrainingen(l => l.filter(x=>x.id!==weg.id));
    setGekozen(null);
    toon("Training van "+formateerDatumKort(weg.datum)+" verwijderd", {
      actie: function(){ setTrainingen(function(l){ return l.concat([weg]); }); }
    });
  }

  const gesorteerd = [...trainingen].sort((a,b)=>new Date(b.datum)-new Date(a.datum))
    .filter(function(t){
      const q = zoekT.trim().toLowerCase();
      if (!q) return true;
      if ((t.locatie||"").toLowerCase().indexOf(q)>=0) return true;
      if ((t.notities||"").toLowerCase().indexOf(q)>=0) return true;
      return (t.onderdelen||[]).some(function(o){ return (o.naam||"").toLowerCase().indexOf(q)>=0; });
    });

  if (gekozen) return (
    <>
      <TrainingDetail
        training={gekozen}
        spelers={laadSpelers()}
        onTerug={()=>setGekozen(null)}
        onBewerken={()=>{setBewerkT(gekozen);setFormulier(true);}}
        onVerwijderen={verwijder}
        onOpslaan={slaOp}
      />
      {formulierOpen&&<TrainingFormulier training={bewerkT} onOpslaan={slaOp} onSluiten={()=>{setFormulier(false);setBewerkT(null);}} />}
    </>
  );

  function tabBalk() {
    return (
      <div className="tabs">
        <button className={"tab-knop"+(tab==="trainingen"?" actief":"")} onClick={function(){setTab("trainingen");}}>
          <i className="fa-solid fa-person-running"/> Trainingen
        </button>
        <button className={"tab-knop"+(tab==="oefeningen"?" actief":"")} onClick={function(){setTab("oefeningen");}}>
          <i className="fa-solid fa-book-open"/> Oefeningen
        </button>
        <button className={"tab-knop"+(tab==="seizoen"?" actief":"")} onClick={function(){setTab("seizoen");}}>
          <i className="fa-solid fa-timeline"/> Seizoen
        </button>
      </div>
    );
  }

  if (tab==="oefeningen") return (<div>{tabBalk()}<OefeningenBibliotheek /></div>);
  if (tab==="seizoen")    return (<div>{tabBalk()}<SeizoensPlanner /></div>);

  return (
    <div>
      {tabBalk()}
      <div className="pagina-header">
        <div className="pagina-header-tekst"><div className="eyebrow">Weekplanning</div><h2>Trainingen</h2><p>{trainingen.length} training{trainingen.length!==1?"en":""}</p></div>
        <button className="knop-plus" onClick={()=>{setBewerkT(null);setFormulier(true);}}>+</button>
      </div>
      {trainingen.length>0&&(
        <input className="zoekbalk" placeholder="Zoek op locatie, oefening of notitie…" value={zoekT}
          onChange={function(e){setZoekT(e.target.value);}} />
      )}

      {trainingen.length===0?(
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-person-running"/></div>
          <h3>Nog geen trainingen</h3>
          <p>Voeg je eerste training toe en plan oefeningen, doelstellingen en aanwezigheid.</p>
          <button className="knop" onClick={()=>{setBewerkT(null);setFormulier(true);}}>+ Training toevoegen</button>
        </div>
      ):(
        <div>
          {groepeerPerWeek(gesorteerd).map(function(groep){
          const nu = isoWeek(new Date());
          const isDezeWeek = groep.week && groep.week.nr===nu.nr && groep.week.jaar===nu.jaar;
          const minuten = groep.items.reduce(function(s,x){ return s + (Number(x.duur)||0); }, 0);
          return (
          <div key={groep.sleutel} className="week-groep">
            <div className={"week-kop"+(isDezeWeek?" nu":"")}>
              <span className="week-nr">{groep.week ? "Week "+groep.week.nr : "Zonder datum"}</span>
              {groep.maandag && <span className="week-bereik">{weekBereik(groep.maandag)}</span>}
              {isDezeWeek && <span className="week-nu">deze week</span>}
              <span className="week-tel">
                {groep.items.length+(groep.items.length===1?" training":" trainingen")}
                {minuten>0 && " · "+minuten+" min"}
              </span>
            </div>
            <div className="kaart week-rij">
          {groep.items.map(t => {
            const d = parseerDatum(t.datum);
            const dag = d ? d.getDate() : "--";
            const mnd = d ? d.toLocaleDateString("nl-NL",{month:"short"}).toUpperCase() : "";
            const aanwezig = (t.aanwezigheid||[]).filter(a=>teltAlsAanwezig(a.status)).length;
            const totaal = (t.aanwezigheid||[]).length;
            return (
              <div key={t.id} className="tr-item" onClick={()=>setGekozen(t)}>
                <div className="tr-datum-blok">
                  <div className="tr-datum-dag">{dag}</div>
                  <div className="tr-datum-mnd">{mnd}</div>
                </div>
                <div className="tr-info">
                  <div className="tr-naam">{trainingTitel(t)}</div>
                  <div className="tr-sub">
                    {t.locatie&&<span style={{marginRight:8}}><i className="fa-solid fa-location-dot"/> {t.locatie}</span>}
                    {t.tijd&&<span style={{marginRight:8}}>⏰ {t.tijd}</span>}
                    {t.duur&&<span style={{marginRight:8}}>⏱ {t.duur}{"'"}</span>}
                    {t.onderdelen&&t.onderdelen.length>0&&<span style={{marginRight:8}}><i className="fa-solid fa-list-ul"/> {t.onderdelen.length} onderdelen</span>}
                    {totaal>0&&<span>👥 {aanwezig}/{totaal}</span>}
                  </div>
                </div>
                <div className="tr-badge">{t.onderdelen&&t.onderdelen.length>0?t.onderdelen[0].type:"Training"}</div>
              </div>
            );
          })}
            </div>
          </div>
          );
          })}
        </div>
      )}

      {formulierOpen&&<TrainingFormulier training={bewerkT} onOpslaan={slaOp} onSluiten={()=>{setFormulier(false);setBewerkT(null);}} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENDA MODULE
═══════════════════════════════════════════════════════════ */
function ActiviteitFormulier({ activiteit, onOpslaan, onSluiten }) {
  const [form, setForm] = useState(Object.assign({}, LEEG_ACTIVITEIT, activiteit||{}));
  function set(v,w){ setForm(function(f){ var n=Object.assign({},f); n[v]=w; return n; }); }

  function bewaar() {
    if(!form.titel.trim()) { meldFout("Geef de activiteit een naam"); return; }
    if(!form.datum) { meldFout("Kies een datum"); return; }
    onOpslaan(Object.assign({}, form, {id: form.id || Date.now(), titel: form.titel.trim()}));
  }

  return (
    <div className="modal-overlay" style={{zIndex:420}} onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Activiteit bewerken":"Activiteit toevoegen"}</div>

        <div className="formulier-groep">
          <label className="formulier-label">Wat is het? *</label>
          <input className="formulier-input" value={form.titel} autoFocus
            onChange={function(e){ set("titel", e.target.value); }}
            placeholder="bijv. Teamavond, ouderavond, kleding inleveren…" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Soort</label>
          <div className="soort-raster">
            {ACTIVITEIT_SOORTEN.map(function(s){
              var aan = form.soort===s.id;
              return (
                <button key={s.id} type="button"
                  className={"soort-knop"+(aan?" actief":"")}
                  style={aan?{color:s.kleur, background:"var(--vlak-info)"}:{}}
                  onClick={function(){ set("soort", s.id); }}>
                  <i className={s.icoon} style={{color:s.kleur}}/> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Datum *</label>
            <input type="date" className="formulier-input" value={form.datum}
              onChange={function(e){ set("datum", e.target.value); }} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Locatie</label>
            <input className="formulier-input" value={form.locatie}
              onChange={function(e){ set("locatie", e.target.value); }} placeholder="Kantine, sportpark…" />
          </div>
        </div>

        <label className="deel-schakel" style={{margin:"2px 0 12px"}}
          onClick={function(e){ e.preventDefault(); set("heleDag", !form.heleDag); }}>
          <span className={"doel-vink"+(form.heleDag?" aan":"")}><i className="fa-solid fa-check"/></span>
          <span>Hele dag, geen vaste tijd</span>
        </label>

        {!form.heleDag && (
          <div className="formulier-rij">
            <div className="formulier-groep">
              <label className="formulier-label">Van</label>
              <input type="time" className="formulier-input" value={form.tijd}
                onChange={function(e){ set("tijd", e.target.value); }} />
            </div>
            <div className="formulier-groep">
              <label className="formulier-label">Tot</label>
              <input type="time" className="formulier-input" value={form.eindtijd}
                onChange={function(e){ set("eindtijd", e.target.value); }} />
            </div>
          </div>
        )}

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Herhalen</label>
            <select className="formulier-input" value={form.herhaal}
              onChange={function(e){ set("herhaal", e.target.value); }}>
              <option value="nee">Eenmalig</option>
              <option value="wekelijks">Elke week</option>
              <option value="tweewekelijks">Om de week</option>
              <option value="maandelijks">Elke maand</option>
            </select>
          </div>
          {form.herhaal!=="nee" && (
            <div className="formulier-groep">
              <label className="formulier-label">Tot en met</label>
              <input type="date" className="formulier-input" value={form.herhaalTot}
                onChange={function(e){ set("herhaalTot", e.target.value); }} />
            </div>
          )}
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Notitie</label>
          <textarea className="formulier-input" rows="2" value={form.notitie}
            onChange={function(e){ set("notitie", e.target.value); }}
            placeholder="Extra uitleg voor jezelf of het team…" style={{resize:"vertical"}} />
        </div>

        <div className="formulier-sectie-titel"><i className="fa-solid fa-users"/> Presentielijst</div>
        {(form.aanwezigheid||[]).length===0 ? (
          <div>
            <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,marginBottom:10,lineHeight:1.6}}>
              Wil je bijhouden wie er meedeed? Zet de selectie erbij, dan telt deze activiteit
              mee in het presentieoverzicht.
            </p>
            <button className="knop lijn" style={{width:"100%",justifyContent:"center"}}
              onClick={function(){
                var sel = laadSpelers();
                if (!sel.length) { meldFout("Voeg eerst spelers toe via Selectie."); return; }
                set("aanwezigheid", sel.map(function(s){
                  return {spelerId:s.id, naam:s.naam, foto:s.foto, status:"aanwezig"};
                }));
              }}>
              <i className="fa-solid fa-list-check"/> Presentielijst toevoegen
            </button>
          </div>
        ) : (
          <div>
            <AfwezigheidHint datum={form.datum} lijst={form.aanwezigheid}
              onOvernemen={function(wijzigingen){
                setForm(function(f){
                  return Object.assign({}, f, {aanwezigheid: f.aanwezigheid.map(function(a){
                    var w = wijzigingen.filter(function(x){ return x.spelerId===a.spelerId; })[0];
                    return w ? Object.assign({}, a, {status:w.status}) : a;
                  })});
                });
                meldGoed(wijzigingen.length+" status"+(wijzigingen.length===1?"":"sen")+" overgenomen");
              }} />
            <SpelerStatusRaster
              spelers={form.aanwezigheid.map(function(a){ return {id:a.spelerId, naam:a.naam, foto:a.foto}; })}
              statussen={form.aanwezigheid.reduce(function(o,a){ o[a.spelerId]=a.status||"aanwezig"; return o; },{})}
              opties={AANWEZIG_KEUZES}
              standaard="aanwezig"
              onWissel={function(speler,status){
                setForm(function(f){
                  return Object.assign({}, f, {aanwezigheid: f.aanwezigheid.map(function(a){
                    return a.spelerId===speler.id ? Object.assign({}, a, {status:status}) : a;
                  })});
                });
              }}
              onAlles={function(status){
                setForm(function(f){
                  return Object.assign({}, f, {aanwezigheid: f.aanwezigheid.map(function(a){
                    return Object.assign({}, a, {status:status});
                  })});
                });
              }} />
            <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
              onClick={function(){ set("aanwezigheid", []); }}>
              <i className="fa-solid fa-xmark"/> Presentielijst weghalen
            </button>
          </div>
        )}

        <div className="modal-voet">
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={bewaar}>
            <i className="fa-solid fa-check"/> Activiteit opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

function AgendaModule({ navigeer }) {
  const vandaag = new Date();
  const [jaar, setJaar] = useState(vandaag.getFullYear());
  const [maand, setMaand] = useState(vandaag.getMonth());
  const [gekozenDag, setGekozenDag] = useState(vandaag.getDate());
  const [activiteiten, setActiviteiten] = useState(laadActiviteiten);
  const [formulier, setFormulier] = useState(null);   // null | {} | activiteit
  const [wisOpen, setWisOpen] = useState(null);

  const wedstrijden = laadWedstrijden();
  /* De agenda hoort bij de basis en staat dus voor iedereen open,
     maar de trainingen erin horen bij een pakket. Zonder dat pakket
     blijft de kalender gewoon werken met wedstrijden, activiteiten en
     verjaardagen — er staan alleen geen trainingen meer in. */
  const trainingen  = zichtbareTrainingen();
  const spelers     = laadSpelers();

  const MAANDEN = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
  const DAGEN   = ["Ma","Di","Wo","Do","Vr","Za","Zo"];

  function bewaarAlle(lijst) { setActiviteiten(lijst); slaJson(ACTIVITEITEN_KEY, lijst); }

  function slaActiviteitOp(a) {
    var bestaat = activiteiten.some(function(x){ return x.id===a.id; });
    bewaarAlle(bestaat ? activiteiten.map(function(x){ return x.id===a.id ? a : x; })
                       : activiteiten.concat([a]));
    setFormulier(null);
    meldGoed(bestaat ? "Activiteit bijgewerkt" : "Activiteit toegevoegd");
  }

  function wisActiviteit(a) {
    var vorige = activiteiten;
    bewaarAlle(activiteiten.filter(function(x){ return x.id!==a.id; }));
    setWisOpen(null);
    toon(a.titel+" verwijderd", { actieLabel:"Ongedaan", actie:function(){ bewaarAlle(vorige); } });
  }

  function datumSleutel(d) {
    return jaar+"-"+(maand+1<10?"0":"")+(maand+1)+"-"+(d<10?"0":"")+d;
  }

  function eventsOpDatum(d) {
    if (!d) return [];
    const dStr = datumSleutel(d);
    const res = [];
    wedstrijden.forEach(function(w){ if(w.datum===dStr) res.push({type:"wedstrijd",label:"vs. "+w.tegenstander,item:w}); });
    trainingen.forEach(function(t){ if(t.datum===dStr) res.push({type:"training",label:"Training",item:t}); });
    activiteiten.forEach(function(a){ if(activiteitOpDatum(a,dStr)) res.push({type:"activiteit",label:a.titel,item:a}); });
    /* Verjaardagen komen uit de geboortedatum, dus die hoef je niet
       zelf in te voeren. Ze zijn er de hele dag, dus vooraan. */
    verjaardagenOp(spelers, dStr).forEach(function(v){
      res.push({type:"verjaardag", label:v.titel, item:{tijd:"00", verjaardag:v}});
    });
    return res.sort(function(x,y){ return (x.item.tijd||"99")<(y.item.tijd||"99") ? -1 : 1; });
  }

  function vorigeM() { if(maand===0){setMaand(11);setJaar(function(j){return j-1;});}else setMaand(function(m){return m-1;}); setGekozenDag(null); }
  function volgendeM() { if(maand===11){setMaand(0);setJaar(function(j){return j+1;});}else setMaand(function(m){return m+1;}); setGekozenDag(null); }
  function naarVandaag() { setJaar(vandaag.getFullYear()); setMaand(vandaag.getMonth()); setGekozenDag(vandaag.getDate()); }

  // Kalenderraster, week begint op maandag
  const eersteVanMaand = new Date(jaar, maand, 1);
  let startDag = eersteVanMaand.getDay();
  startDag = startDag===0 ? 6 : startDag-1;
  const dagenInMaand = new Date(jaar, maand+1, 0).getDate();
  const dagenVorig = new Date(jaar, maand, 0).getDate();

  const cellen = [];
  for (let i=startDag-1; i>=0; i--) cellen.push({dag:dagenVorig-i, huidig:false});
  for (let i=1; i<=dagenInMaand; i++) cellen.push({dag:i, huidig:true});
  while (cellen.length%7!==0) cellen.push({dag:cellen.length-dagenInMaand-startDag+1, huidig:false});

  const gekozenEvents = gekozenDag ? eventsOpDatum(gekozenDag) : [];
  const isDezeMaand = maand===vandaag.getMonth() && jaar===vandaag.getFullYear();

  return (
    <div>
      <div className="pagina-header">
        {/* De ondertitel blijft ook zonder de module trainingen precies
            zo staan: dit is de plek waar iemand voor het eerst leest
            dát er trainingen in de agenda kunnen staan. Een ondertitel
            die stilletjes "Wedstrijden & activiteiten" wordt verkoopt
            niets en verbergt alleen dat er meer is.

            Het slotje staat achter het wóórd trainingen en niet achter
            de hele zin. Achteraan zou het over alle drie de woorden
            gaan en dus suggereren dat ook wedstrijden en activiteiten
            op slot zitten — terwijl die bij de basis horen en gewoon
            in deze kalender staan. */}
        <div className="pagina-header-tekst"><h2>Agenda</h2>
          <p>{magModule("trainingen")
            ? "Wedstrijden, trainingen & activiteiten"
            : <>Wedstrijden, trainingen<SlotKnop naam="Trainingen" module="trainingen"/> &amp; activiteiten</>}</p></div>
        <button className="knop klein" onClick={function(){
          setFormulier({datum: gekozenDag ? datumSleutel(gekozenDag) : ""});
        }}>
          <i className="fa-solid fa-plus"/> Activiteit
        </button>
      </div>

      <div className="kaart">
        <div className="agenda-nav">
          <button onClick={vorigeM} aria-label="Vorige maand">‹</button>
          <span className="agenda-maand-titel">{MAANDEN[maand]} {jaar}</span>
          <button onClick={volgendeM} aria-label="Volgende maand">›</button>
        </div>

        <div className="agenda-grid">
          {DAGEN.map(function(d){ return <div key={d} className="agenda-dag-naam">{d}</div>; })}
          {cellen.map(function(c,i){
            const events = c.huidig ? eventsOpDatum(c.dag) : [];
            const isVandaag = c.huidig && c.dag===vandaag.getDate() && isDezeMaand;
            const isGekozen = c.huidig && c.dag===gekozenDag;
            return (
              <div key={i}
                className={"agenda-dag"+(isVandaag?" vandaag-dag":"")+(isGekozen?" gekozen-dag":"")}
                onClick={function(){ if(c.huidig) setGekozenDag(c.dag===gekozenDag?null:c.dag); }}>
                <div className={"agenda-dag-nr"+(isVandaag?" vandaag-nr":"")+(c.huidig?"":" grijs-nr")}>{c.dag}</div>
                <div className="agenda-events">
                  {events.slice(0,3).map(function(ev,j){
                    var stijl = ev.type==="activiteit" ? {background:activiteitSoort(ev.item.soort).kleur} : {};
                    return (
                      <div key={j} className={"agenda-event type-"+ev.type} style={stijl}>
                        {ev.item.tijd && <span className="agenda-event-tijd">{ev.item.tijd}</span>}
                        {ev.label}
                      </div>
                    );
                  })}
                  {events.length>3 && <div className="agenda-meer">{"+"+(events.length-3)+" meer"}</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="agenda-legenda">
          <span><i className="agenda-stip" style={{background:"var(--blauw)"}}/> Wedstrijd</span>
          {/* Het bolletje Training blijft staan, ook als er dit pakket
              geen enkele training in de kalender komt. Een legenda met
              een gat erin roept geen vraag op — je ziet niet wat er
              niet staat. Een bolletje met een slotje wel: dat is het
              verschil tussen "deze app doet geen trainingen" en "deze
              trainingen horen bij een ander pakket". */}
          <span><i className="agenda-stip" style={{background:"var(--blauw-licht)"}}/> Training
            {!magModule("trainingen") && <SlotKnop naam="Trainingen" module="trainingen"/>}</span>
          <span><i className="agenda-stip" style={{background:"#8b5cf6"}}/> Activiteit</span>
          {!isDezeMaand && (
            <button className="deel-schakelknop" style={{marginLeft:"auto"}} onClick={naarVandaag}>
              <i className="fa-solid fa-calendar-day"/> Naar vandaag
            </button>
          )}
        </div>
      </div>

      {gekozenDag && (
        <div style={{marginTop:4}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8,fontFamily:"'Helvetica Neue',Arial"}}>
            {gekozenDag} {MAANDEN[maand]}
          </div>

          {gekozenEvents.length===0 ? (
            <div className="kaart" style={{textAlign:"center",padding:"22px 18px"}}>
              <div style={{fontSize:13,color:"var(--grijs-donker)",marginBottom:12}}>
                Nog niets gepland op deze dag.
              </div>
              <button className="knop lijn klein" onClick={function(){ setFormulier({datum: datumSleutel(gekozenDag)}); }}>
                <i className="fa-solid fa-plus"/> Activiteit toevoegen
              </button>
            </div>
          ) : gekozenEvents.map(function(ev,i){
            if(ev.type==="activiteit") {
              var s = activiteitSoort(ev.item.soort);
              return (
                <div key={"a"+i} className="agenda-event-item" style={{borderLeftColor:s.kleur}}>
                  <div className="act-icoon" style={{background:s.kleur}}><i className={s.icoon}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:14}}>{ev.item.titel}</div>
                    <div style={{fontSize:12,color:"var(--grijs-donker)",marginTop:2}}>
                      <span style={{marginRight:9}}>{s.label}</span>
                      {!ev.item.heleDag && ev.item.tijd && (
                        <span style={{marginRight:9}}>
                          <i className="fa-solid fa-clock"/> {ev.item.tijd}{ev.item.eindtijd?" – "+ev.item.eindtijd:""}
                        </span>
                      )}
                      {ev.item.locatie && <span style={{marginRight:9}}><i className="fa-solid fa-location-dot"/> {ev.item.locatie}</span>}
                      {ev.item.herhaal && ev.item.herhaal!=="nee" && <span><i className="fa-solid fa-repeat"/> herhaalt</span>}
                    </div>
                    {ev.item.notitie && (
                      <div style={{fontSize:12,color:"var(--grijs-donker)",marginTop:4,lineHeight:1.5}}>{ev.item.notitie}</div>
                    )}
                  </div>
                  <button className="knop lijn klein" style={{padding:"5px 9px"}}
                    onClick={function(){ setFormulier(ev.item); }} aria-label="Bewerken">
                    <i className="fa-solid fa-pen"/>
                  </button>
                  <button className="knop lijn klein" style={{padding:"5px 9px"}}
                    onClick={function(){ deelICS({
                      id: ev.item.id, titel: ev.item.titel, datum: ev.item.datum,
                      tijd: ev.item.heleDag ? "" : ev.item.tijd,
                      duur: 120, locatie: ev.item.locatie,
                      uitleg: ev.item.notitie || "", heleDag: !!ev.item.heleDag
                    }); }} title="In mijn agenda zetten">
                    <i className="fa-solid fa-calendar-plus"/>
                  </button>
                  <button className="knop gevaar klein" style={{padding:"5px 9px"}}
                    onClick={function(){ setWisOpen(ev.item); }} aria-label="Verwijderen">
                    <i className="fa-solid fa-trash"/>
                  </button>
                </div>
              );
            }
            if (ev.type === "verjaardag") {
              return (
                <div key={i} className="agenda-event-item type-verjaardag">
                  <div className="act-icoon" style={{background:"#db2777",color:"#fff"}}>
                    <i className="fa-solid fa-cake-candles"/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:14}}>{ev.label}</div>
                    <div style={{fontSize:12,color:"var(--grijs-donker)",marginTop:2}}>
                      Uit de geboortedatum, dus die komt elk jaar terug
                    </div>
                  </div>
                </div>
              );
            }
            var alsAfspraak = {
              id: ev.item.id,
              titel: ev.type==="wedstrijd" ? teamNaamVol() + "  " + ev.label : ev.label,
              datum: ev.item.datum, tijd: ev.item.tijd,
              duur: ev.type==="wedstrijd" ? (Number(ev.item.speelduur)||90) + 15 : (Number(ev.item.duur)||90),
              locatie: ev.item.locatie,
              uitleg: ev.type==="wedstrijd" ? (ev.item.thuis ? "Thuiswedstrijd" : "Uitwedstrijd") : ""
            };
            return (
              <div key={i} className={"agenda-event-item type-"+ev.type}>
                <div className="act-icoon" style={{background: ev.type==="wedstrijd"?"var(--blauw)":"var(--blauw-licht)",
                  color: ev.type==="wedstrijd"?"#fff":"var(--op-blauwlicht)"}}
                  onClick={function(){ navigeer(ev.type==="wedstrijd"?"wedstrijden":"trainingen"); }}>
                  <i className={ev.type==="wedstrijd"?"fa-solid fa-futbol":"fa-solid fa-person-running"}/>
                </div>
                <div style={{flex:1,minWidth:0,cursor:"pointer"}}
                  onClick={function(){ navigeer(ev.type==="wedstrijd"?"wedstrijden":"trainingen"); }}>
                  <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:14}}>{ev.label}</div>
                  <div style={{fontSize:12,color:"var(--grijs-donker)",marginTop:2}}>
                    {ev.item.tijd&&<span style={{marginRight:9}}><i className="fa-solid fa-clock"/> {ev.item.tijd}</span>}
                    {ev.item.locatie&&<span><i className="fa-solid fa-location-dot"/> {ev.item.locatie}</span>}
                  </div>
                </div>
                <button className="knop lijn klein" title="In mijn agenda zetten"
                  style={{padding:"5px 9px"}}
                  onClick={function(e){ e.stopPropagation(); deelICS(alsAfspraak); }}>
                  <i className="fa-solid fa-calendar-plus"/>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {formulier && (
        <ActiviteitFormulier key={formulier.id||"nieuw"} activiteit={formulier} onOpslaan={slaActiviteitOp}
          onSluiten={function(){ setFormulier(null); }} />
      )}

      {wisOpen && (
        <div className="bevestig-overlay" onClick={function(e){ if(e.target===e.currentTarget) setWisOpen(null); }}>
          <div className="bevestig-kaart">
            <h3>Activiteit verwijderen?</h3>
            <p style={{marginBottom:14}}>{wisOpen.titel}</p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){ setWisOpen(null); }}>Annuleren</button>
              <button className="knop gevaar" onClick={function(){ wisActiviteit(wisOpen); }}>Verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Wie zit er op deze datum in een vastgelegde periode? De statussen
   worden niet stiekem overschreven: je krijgt een melding met één knop,
   zodat jij baas blijft over wat er in de lijst staat. */
function AfwezigheidHint({ datum, lijst, onOvernemen }) {
  const afwezigheden = laadAfwezigheden();
  if (!datum || !(lijst||[]).length) return null;
  const raak = lijst.map(function(a){
    var per = afwezigheidOp(afwezigheden, a.spelerId, datum);
    return per ? {rij:a, per:per, soort:afwezigheidSoort(per.soort)} : null;
  }).filter(Boolean);
  if (!raak.length) return null;
  /* Al goed ingevuld? Dan hoeft er niets gemeld te worden. */
  const afwijkend = raak.filter(function(r){
    return teltAlsAanwezig(r.rij.status||"aanwezig");
  });
  if (!afwijkend.length) return null;

  return (
    <div className="afw-hint">
      <div className="afw-hint-kop">
        <i className="fa-solid fa-briefcase-medical"/>
        {afwijkend.length===1
          ? "1 speler staat op deze datum als afwezig genoteerd"
          : afwijkend.length+" spelers staan op deze datum als afwezig genoteerd"}
      </div>
      <div className="afw-hint-namen">
        {afwijkend.map(function(r){
          return (
            <span key={r.rij.spelerId} className="afw-chip"
              style={{background:r.soort.vlak, color:r.soort.kleur}}>
              <i className={r.soort.icoon}/> {r.rij.naam.split(" ")[0]}
            </span>
          );
        })}
      </div>
      <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",marginTop:8}}
        onClick={function(){ onOvernemen(afwijkend.map(function(r){
          return {spelerId:r.rij.spelerId, status:afwezigheidNaarStatus(r.soort)};
        })); }}>
        <i className="fa-solid fa-wand-magic-sparkles"/> Overnemen in de lijst
      </button>
    </div>
  );
}
/* De periodesoorten die geen eigen knop hebben in het raster
   vallen terug op de dichtstbijzijnde handmatige status. */
function afwezigheidNaarStatus(soort) {
  if (soort.id==="blessure")  return "geblesseerd";
  if (soort.id==="ziekte")    return "ziek";
  if (soort.id==="werk")      return "werk";
  return "afwezig";
}


/* ══════════════════════════════════════════════════════════════
   ACHTERSTAND VAN STAP 4, INGELOPEN BIJ STAP 8
   ─────────────────────────────────────────────────────────────
   deelTraining, deelVariantenTraining en het hele ICS-agendabestand-
   gereedschap (icsOntsnap, icsVouw, icsStempel, icsPlus, maakICS,
   deelICS — oorspronkelijke sectiekop "IN MIJN AGENDA") stonden ná P4
   stap 4 (17 september 2026) nog in src/app.jsx, verweven tussen de
   wedstrijden-eigen deelfuncties (deelWedstrijdVooraf/-Uitslag) die pas
   bij stap 8 aan de beurt waren. Bij het narekenen van stap 8 bleek deze
   cluster uitsluitend door dit bestand te worden gebruikt (deelTraining/
   deelVariantenTraining via de deelknop, deelICS via de agendaknop) —
   nul treffers in de wedstrijdenmodule of elders. whatsappLink, waOpmaak,
   zonderEmoji, berichtUitRegels en DEEL_STREEP blijven in src/app.jsx:
   die zijn ook nodig voor DeelVenster in gedeeld.jsx en voor
   wedstrijden.jsx's eigen deelfuncties. Puur een verhuizing, geen
   herschrijving: dezelfde tekst, dezelfde comments (inclusief de
   oorspronkelijke sectiekop bij het ICS-gereedschap hieronder). */

/* ── Training ── */
function deelTraining(t, uitgebreid) {
  var telling = dagenTot(t.datum);
  var eind = t.tijd && t.duur ? tijdVerschoven(t.tijd, Number(t.duur)||0) : "";
  var regels = [
    "🏃 *"+teamNaamVol()+"*",
    DEEL_STREEP,
    "📣 *TRAINING*" + (telling ? "  ·  "+telling : ""),
    "",
    t.datum ? "📅 "+datumLang(t.datum) : null,
    t.tijd ? "⏰ "+t.tijd+(eind?" – "+eind:"")+" uur"+(t.duur?"  ("+t.duur+" min)":"") : null,
    t.locatie ? "📍 "+t.locatie : null
  ];

  if(!uitgebreid) {
    return berichtUitRegels(regels.concat([
      t.materialen ? "🎒 Meenemen: "+t.materialen : null,
      "", "Tot dan! 💪"
    ]));
  }

  if(t.doelstellingen) regels = regels.concat(["", "🎯 *Waar werken we aan*", t.doelstellingen.trim()]);

  var od = t.onderdelen||[];
  if(od.length) {
    regels = regels.concat(["", "📋 *Programma*"], od.map(function(o,i){
      return (i+1)+". "+o.naam+(o.duur?"  ("+o.duur+"')":"");
    }));
  }

  if(t.materialen) regels = regels.concat(["", "🎒 Meenemen: "+t.materialen]);

  /* Per status de namen erbij, zodat het team ziet wie er niet is en waarom.
     Stond eerder op "blessure" terwijl de status "geblesseerd" heet: dat vond nooit iets. */
  var perStatus = {};
  (t.aanwezigheid||[]).forEach(function(a){
    if (teltAlsAanwezig(a.status) || !a.naam) return;
    (perStatus[a.status] = perStatus[a.status] || []).push(a.naam);
  });
  var tekens = {afwezig:"❌", geenbericht:"⛔", ziek:"🤒", geblesseerd:"🩹", werk:"💼"};
  AANWEZIG_KEUZES.forEach(function(k){
    var namen = perStatus[k.id];
    if (!namen || !namen.length) return;
    regels = regels.concat(["", (tekens[k.id]||"•")+" *"+k.label+":* "+namen.join(", ")]);
  });
  regels = regels.concat(["", "❗ Kun je niet? Meld je op tijd af."]);

  if(t.notities) regels = regels.concat(["", "📝 "+t.notities]);
  return berichtUitRegels(regels.concat(["", "Tot "+(telling==="vandaag"?"zo":"dan")+"! 💪"]));
}

function deelVariantenTraining(t) {
  return [
    {id:"lang", label:"Uitgebreid", tekst: deelTraining(t, true)},
    {id:"kort", label:"Kort",       tekst: deelTraining(t, false)}
  ];
}

/* ═══════════════════════════════════════════════════════════
   IN MIJN AGENDA
   Een agendabestand van één gebeurtenis, zodat spelers en ouders
   hem in hun eigen agenda kunnen zetten. Het formaat is streng:
   regels langer dan 75 tekens moeten gevouwen worden en komma's,
   puntkomma's en backslashes moeten ontsnapt.
═══════════════════════════════════════════════════════════ */
function icsOntsnap(t) {
  return String(t == null ? "" : t)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}
/* Regels van maximaal 75 tekens; het vervolg begint met een spatie */
function icsVouw(regel) {
  if (regel.length <= 75) return regel;
  var uit = [regel.slice(0, 75)], rest = regel.slice(75);
  while (rest.length > 74) { uit.push(" " + rest.slice(0, 74)); rest = rest.slice(74); }
  if (rest.length) uit.push(" " + rest);
  return uit.join("\r\n");
}
/* Datum en tijd als lokale tijd, zonder tijdzone: dan neemt de agenda
   van de ontvanger gewoon de tijd over die er staat. */
function icsStempel(datum, tijd) {
  var d = parseerDatum(datum);
  if (!d) return null;
  var uur = 12, min = 0;
  if (tijd && /^\d{1,2}:\d{2}$/.test(tijd)) {
    var delen = tijd.split(":");
    uur = Number(delen[0]); min = Number(delen[1]);
  }
  function tw(n){ return (n<10?"0":"")+n; }
  return d.getFullYear() + tw(d.getMonth()+1) + tw(d.getDate()) +
         "T" + tw(uur) + tw(min) + "00";
}
/* Zoveel minuten optellen bij een stempel */
function icsPlus(stempel, minuten) {
  if (!stempel) return null;
  var d = new Date(
    Number(stempel.slice(0,4)), Number(stempel.slice(4,6))-1, Number(stempel.slice(6,8)),
    Number(stempel.slice(9,11)), Number(stempel.slice(11,13)));
  d.setMinutes(d.getMinutes() + minuten);
  function tw(n){ return (n<10?"0":"")+n; }
  return d.getFullYear() + tw(d.getMonth()+1) + tw(d.getDate()) +
         "T" + tw(d.getHours()) + tw(d.getMinutes()) + "00";
}
/* g = {titel, datum, tijd, duur (minuten), locatie, uitleg, id} */
function maakICS(g) {
  var begin = icsStempel(g.datum, g.tijd);
  if (!begin) return null;
  var eind = icsPlus(begin, Number(g.duur) || 90);
  var nu = new Date();
  function tw(n){ return (n<10?"0":"")+n; }
  var gemaakt = nu.getUTCFullYear() + tw(nu.getUTCMonth()+1) + tw(nu.getUTCDate()) +
                "T" + tw(nu.getUTCHours()) + tw(nu.getUTCMinutes()) + tw(nu.getUTCSeconds()) + "Z";
  var regels = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//" + ONTWERPER.studio + "//" + teamNaamVol() + "//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + (g.id || Date.now()) + "@fc-harlingen",
    "DTSTAMP:" + gemaakt,
    "DTSTART:" + begin,
    "DTEND:" + eind,
    "SUMMARY:" + icsOntsnap(g.titel)
  ];
  if (g.locatie)  regels.push("LOCATION:" + icsOntsnap(g.locatie));
  if (g.uitleg)   regels.push("DESCRIPTION:" + icsOntsnap(g.uitleg));
  if (g.heleDag !== true) {
    /* Een uur van tevoren een seintje */
    regels.push("BEGIN:VALARM", "TRIGGER:-PT60M", "ACTION:DISPLAY",
                "DESCRIPTION:" + icsOntsnap(g.titel), "END:VALARM");
  }
  regels.push("END:VEVENT", "END:VCALENDAR");
  return regels.map(icsVouw).join("\r\n") + "\r\n";
}
function deelICS(g) {
  var tekst = maakICS(g);
  if (!tekst) { meldFout("Deze gebeurtenis heeft nog geen datum."); return; }
  var naam = String(g.titel || "afspraak").replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() + ".ics";
  var blob = new Blob([tekst], {type:"text/calendar;charset=utf-8"});
  deelOfDownload(blob, naam, g.titel, function(hoe){
    meldGoed(hoe === "gedeeld" ? "Afspraak gedeeld" : "Opgeslagen als " + naam + " in Downloads");
  });
}
