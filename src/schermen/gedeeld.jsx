/* ══════════════════════════════════════════════════════════════
   GEDEELD — schermoverstijgende componenten en tenue-tekendata
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P4 stap 0
   van docs/p4-stappenplan.md — de voorwaarde vóór de acht schermmodules
   die daarna volgen). Geen import/export: tools/bouw.js plakt dit
   bestand (SCHERM_VOLGORDE) na de kern- en domeinmodules en vóór
   src/app.jsx aan elkaar, dus alles hieronder is nog altijd gewoon
   top-level function/const in dezelfde scope als src/app.jsx. Er
   verandert dus functioneel niets — dit is een verhuizing, geen
   herschrijving.

   WAAROM DEZE LAAG BESTAAT
   SlotJe/SlotKnop/ToastHouder staan op vrijwel elk scherm. TenueBeeld
   en SpelerBeeld (met hun tekencomponenten TenueLaag/TenueKader/
   SpelerPop en de tenue-tekendata TENUE_VEL/TENUE_SHIRT_PAD/
   TENUE_ROMP/TENUE_MOUW_L/TENUE_MOUW_R/TENUE_BROEK_PAD/TENUE_SOK)
   worden gebruikt door clubhuis, opstellingen, trainingen, spelers en
   wedstrijden tegelijk. Zonder deze laag zou geen van de acht
   schermmodules op zichzelf kunnen bestaan zonder een cirkelvormige
   afhankelijkheid op een andere module. TENUE_KEY/laadTenue()/
   slaTenueOp()/TENUE_SOORTEN horen hierbij: TenueStrook,
   ClubhuisModule en OpstellingenTab (die zelf pas in latere stappen
   verhuizen) gebruiken ze om te weten welk tenue een team heeft.

   NIET HIERHEEN VERPLAATST: de rest van de TENUE_*-constanten
   (TENUE_PATRONEN, TENUE_BEGIN, TENUE_GROEPEN, TENUE_VORMEN,
   TENUE_DELEN, TENUE_FONTS, TENUE_GREPEN, de zoom- en
   historiewaarden) — dat is eigen ontwerpgereedschap van de
   tenue-ontwerper (module clubhuis, latere stap) en wordt door niets
   anders gebruikt. Ook `tenueTeller` (de teller voor unieke
   SVG-id's, gebruikt door TenueBeeld) blijft in src/app.jsx staan:
   hij stond niet met naam in het stappenplan en verhuist daarom niet
   mee in deze stap. Dat is functioneel geen probleem — het is een
   top-level `let` die pas ná het laden van alle scripts gelezen
   wordt (in TenueBeeld's renderfunctie, ruim na het inladen), maar
   het betekent wel dat gedeeld.jsx voor dit ene detail leunt op iets
   dat fysiek in app.jsx blijft staan.

   Zie docs/p4-stappenplan.md §0 en §3 voor de volledige redenering,
   inclusief waarom de plakvolgorde (SCHERM_VOLGORDE vóór de rest van
   src/app.jsx) hier de enige plek is waar volgorde in theorie zou
   kunnen uitmaken (const-hoisting geeft geen bruikbare waarde, in
   tegenstelling tot function-hoisting) — en waarom dat in de praktijk
   nergens gebeurt: elk gebruik van TENUE_* hieronder zit in een
   functie-body, die pas draait als een component daadwerkelijk
   rendert. */

/* Het slotje zelf. Goud, want die kleur betekent in deze app al "dit
   onderscheidt zich" — Man of the Match, favoriete speler, "Al
   bekend". Geen nieuwe kleur dus, wel een nieuwe betekenis die
   aansluit bij de oude.

   Wat hier bewust níét gebeurt: niets wordt gedimd. Een vergrendeld
   onderdeel blijft even leesbaar als een open onderdeel. Grijs op
   grijs is in fel zonlicht op een veld onleesbaar, en een
   dichtgetimmerd icoon voelt als een uitsluiting terwijl dit een
   aanbod hoort te zijn.

   Twee vormen: los ernaast (zijmenu, tabblad, tegel) en als badge
   bovenop een icoon (de onderbalk, waar naast de tekst geen
   millimeter over is). */
function SlotJe({ badge }) {
  return <i className={"fa-solid fa-lock " + (badge ? "slot-badge" : "slotje")} aria-hidden="true"/>;
}
/* Hetzelfde slotje, maar dan als knop — voor de plekken waar het los
   in een tekst of een legenda staat en er dus geen omliggende knop is
   die het antwoord al geeft. Het stopt de tik ook: staat dit slotje
   toevallig in iets wat zelf aanklikbaar is, dan hoort de tik hier te
   eindigen en niet óók nog die achterliggende actie af te vuren. */
function SlotKnop({ naam, module }) {
  return (
    <button type="button" className="slot-knop" aria-label={slotLabel(naam, module)}
      onClick={function (e) { e.stopPropagation(); slotMelding(module); }}>
      <SlotJe />
    </button>
  );
}

function ToastHouder() {
  const [lijst, setLijst] = useState([]);
  useEffect(function(){
    function luister(t){
      setLijst(function(l){ return l.concat([t]); });
      setTimeout(function(){
        setLijst(function(l){ return l.filter(function(x){return x.id!==t.id;}); });
      }, t.duur);
    }
    _toastLuisteraars.push(luister);
    return function(){ _toastLuisteraars = _toastLuisteraars.filter(function(f){return f!==luister;}); };
  },[]);
  function sluit(id) { setLijst(function(l){ return l.filter(function(x){return x.id!==id;}); }); }
  if (lijst.length===0) return null;
  const iconen = {info:"fa-solid fa-circle-info", goed:"fa-solid fa-circle-check", fout:"fa-solid fa-triangle-exclamation"};
  const kleuren = {info:"var(--blauw-licht)", goed:"var(--succes)", fout:"var(--gevaar)"};
  return (
    <div className="toast-houder">
      {lijst.slice(-3).map(function(t){
        return (
          <div key={t.id} className="toast">
            <i className={iconen[t.soort]||iconen.info} style={{color:kleuren[t.soort]||kleuren.info}}/>
            <span className="toast-tekst">{t.bericht}</span>
            {t.actie && (
              <button className="toast-actie" onClick={function(){ t.actie(); sluit(t.id); }}>
                {t.actieLabel||"Ongedaan maken"}
              </button>
            )}
            <button className="toast-sluit" onClick={function(){sluit(t.id);}}>{"✕"}</button>
          </div>
        );
      })}
    </div>
  );
}

function DeelVenster(props) {
  const varianten = props.varianten || [];
  const [keuze, setKeuze] = useState(0);
  const [simpel, setSimpel] = useState(false);
  const [bewerken, setBewerken] = useState(false);
  /* Eigen aanpassingen per variant, zodat wisselen ze niet wegkiepert */
  const [eigen, setEigen] = useState({});
  const [gekopieerd, setGekopieerd] = useState(false);
  const veldRef = useRef(null);

  const huidig = varianten[keuze] || {id:"leeg", tekst:""};
  const basis = huidig.tekst || "";
  const isAangepast = Object.prototype.hasOwnProperty.call(eigen, huidig.id);
  const ruw = isAangepast ? eigen[huidig.id] : basis;
  const tekst = (simpel && !isAangepast) ? zonderEmoji(ruw) : ruw;
  const kanDelen = typeof navigator !== "undefined" && !!navigator.share;

  function schrijf(waarde) {
    setEigen(function(o){ var n = Object.assign({}, o); n[huidig.id] = waarde; return n; });
  }
  function herstel() {
    setEigen(function(o){ var n = Object.assign({}, o); delete n[huidig.id]; return n; });
  }
  /* Emoji-schakelaar werkt ook als je zelf al hebt getypt */
  function wisselEmoji() {
    var aan = !simpel;
    setSimpel(aan);
    if(isAangepast) schrijf(aan ? zonderEmoji(eigen[huidig.id]) : eigen[huidig.id]);
  }

  function kopieer() {
    function gelukt() { setGekopieerd(true); setTimeout(function(){ setGekopieerd(false); }, 2200); }
    function oudeManier() {
      try {
        var v = document.createElement("textarea");
        v.value = tekst; v.style.position="fixed"; v.style.opacity="0";
        document.body.appendChild(v); v.select(); document.execCommand("copy");
        document.body.removeChild(v); gelukt();
      } catch(e) { meldFout("Kopiëren lukte niet, selecteer de tekst handmatig"); }
    }
    if(navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tekst).then(gelukt).catch(oudeManier);
    } else { oudeManier(); }
  }

  /* Snel stukjes opmaak invoegen op de plek van de cursor */
  function voegIn(voor, na) {
    var el = veldRef.current;
    if(!el) return;
    var s = el.selectionStart, e = el.selectionEnd;
    var mid = tekst.slice(s,e) || "tekst";
    var nieuw = tekst.slice(0,s) + voor + mid + (na||"") + tekst.slice(e);
    schrijf(nieuw);
    setTimeout(function(){
      el.focus();
      el.setSelectionRange(s+voor.length, s+voor.length+mid.length);
    }, 0);
  }

  var nu = new Date();
  var klok = String(nu.getHours()).padStart(2,"0")+":"+String(nu.getMinutes()).padStart(2,"0");

  return (
    <div className="modal-overlay" style={{zIndex:500}} onClick={function(e){ if(e.target===e.currentTarget) props.onSluiten(); }}>
      <div className="modal-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel"><i className="fa-brands fa-whatsapp"/> {props.titel||"Bericht delen"}</div>

        {varianten.length>1 && (
          <div className="deel-keuze">
            {varianten.map(function(v,i){
              var mee = Object.prototype.hasOwnProperty.call(eigen, v.id);
              return (
                <button key={v.id} className={i===keuze?"actief":""} onClick={function(){ setKeuze(i); }}>
                  {v.label}{mee?" •":""}
                </button>
              );
            })}
          </div>
        )}

        <div className="deel-kopregel">
          <span>{bewerken ? "Je eigen tekst" : "Zo komt het aan"}</span>
          <button className="deel-schakelknop" onClick={function(){ setBewerken(!bewerken); }}>
            <i className={bewerken?"fa-solid fa-eye":"fa-solid fa-pen"}/> {bewerken?"Voorbeeld":"Bewerken"}
          </button>
        </div>

        {bewerken ? (
          <div>
            <div className="deel-opmaakbalk">
              <button onClick={function(){ voegIn("*","*"); }} title="Vet"><strong>B</strong></button>
              <button onClick={function(){ voegIn("_","_"); }} title="Cursief"><em>I</em></button>
              <button onClick={function(){ voegIn("~","~"); }} title="Doorhalen"><s>S</s></button>
              <span className="teken-sep"/>
              <button onClick={function(){ voegIn("• ",""); }} title="Opsommingsteken">•</button>
              <button onClick={function(){ voegIn("\n"+DEEL_STREEP+"\n",""); }} title="Scheidingslijn">—</button>
            </div>
            <textarea ref={veldRef} className="formulier-input deel-invoer" value={tekst}
              onChange={function(e){ schrijf(e.target.value); }}
              rows="12" spellCheck="false" />
            <div className="deel-tip">
              Tip: <code>*vet*</code> · <code>_cursief_</code> · <code>~doorgehaald~</code> — precies zoals WhatsApp het leest.
            </div>
          </div>
        ) : (
          <div className="deel-doek">
            <div className="deel-bubbel">
              <div className="deel-tekst">{waOpmaak(tekst)}</div>
              <div className="deel-tijd">{klok} <i className="fa-solid fa-check-double" style={{color:"#53bdeb"}}/></div>
            </div>
          </div>
        )}

        <div className="deel-regelbalk">
          <label className="deel-schakel" onClick={function(e){ e.preventDefault(); wisselEmoji(); }}>
            <span className={"doel-vink"+(simpel?" aan":"")}><i className="fa-solid fa-check"/></span>
            <span>Zonder emoji</span>
          </label>
          <span className="deel-teller">{tekst.length} tekens</span>
          {isAangepast && (
            <button className="deel-schakelknop" onClick={herstel}>
              <i className="fa-solid fa-rotate-left"/> Standaardtekst
            </button>
          )}
        </div>

        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
          <button className="knop lijn klein" style={{flex:"1 1 120px",justifyContent:"center"}} onClick={kopieer}>
            <i className={gekopieerd?"fa-solid fa-check":"fa-solid fa-copy"}/> {gekopieerd?"Gekopieerd":"Kopiëren"}
          </button>
          {props.pdfActie && (
            <button className="knop lijn klein" style={{flex:"1 1 120px",justifyContent:"center"}}
              onClick={function(){ props.pdfActie(); }}>
              <i className="fa-solid fa-file-pdf"/> {props.pdfLabel||"PDF"}
            </button>
          )}
          {kanDelen && (
            <button className="knop lijn klein" style={{flex:"1 1 120px",justifyContent:"center"}}
              onClick={function(){ navigator.share({text:tekst}).catch(function(){}); }}>
              <i className="fa-solid fa-share-nodes"/> Delen…
            </button>
          )}
        </div>

        {props.pdfActie && (
          <div className="deel-tip" style={{marginTop:8}}>
            <i className="fa-solid fa-circle-info"/> Stuur het bericht eerst, en hang de PDF er daarna als bijlage aan.
          </div>
        )}

        <a href={whatsappLink(tekst)} target="_blank" rel="noopener noreferrer" className="knop wa"
           onClick={function(){ setTimeout(props.onSluiten, 400); }}>
          <i className="fa-brands fa-whatsapp" style={{fontSize:18}}/> Openen in WhatsApp
        </a>

        <div className="modal-voet">
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={props.onSluiten}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

function GetalVeld({ waarde, opWaarde, leeg, min, max, ...rest }) {
  const [ruw, setRuw] = useState(null);      /* null = volg de waarde */
  const legeWaarde = (leeg === undefined) ? 0 : leeg;
  const echt = (waarde === null || waarde === undefined || waarde === "")
    ? "" : String(waarde);
  const toon = ruw !== null ? ruw : echt;
  return (
    <input {...rest} type="number" min={min} max={max} value={toon}
      onFocus={function(e){ setRuw(echt); e.target.select(); }}
      onChange={function(e){
        var g = getalTyp(e.target.value, legeWaarde);
        setRuw(g.toon);
        opWaarde(g.waarde);
      }}
      onBlur={function(e){
        setRuw(null);
        opWaarde(getalKlaar(e.target.value, legeWaarde, min, max));
      }}/>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOGO
═══════════════════════════════════════════════════════════ */
function Logo() {
  const [fout,setFout]=useState(false);
  const i = gebruikInstellingen();
  /* Het merk gaat altijd via logoKopbalk, ook hier: één deur betekent
     één regel over welke uitvoering waar hoort. Dit poppetje staat in
     de zijbalk en de kopbalk, allebei donkerblauw. */
  const bron = logoKopbalk(true);
  useEffect(function(){ setFout(false); }, [i.logo]);
  if (fout) return <div className="logo-fallback">{initialen(i.clubNaam||APP_NAAM)}</div>;
  return <img src={bron} alt={i.clubNaam||APP_NAAM} className="logo-img" onError={function(){setFout(true);}} />;
}

/* Een naamveld dat je selectie kent.

   De scheidsrechter kan van alles zijn: iemand uit je eigen staf, een
   speler van het tweede, een vader, of een naam die je alleen van het
   wedstrijdformulier kent. Een keuzelijst van je selectie zou de helft
   van die gevallen buitensluiten; een kaal tekstvak zou je elke week
   dezelfde naam laten typen.

   Dus allebei: je typt, en wie je al kent verschijnt eronder. Een
   datalist doet dat met de eigen lijst van de browser, wat op een
   tablet precies goed werkt en niets weegt. */
function NaamVeld({ waarde, opWaarde, namen, lijstId, placeholder }) {
  return (
    <React.Fragment>
      <input className="formulier-input" value={waarde || ""} list={lijstId}
        placeholder={placeholder} autoComplete="off"
        onChange={function (e) { opWaarde(e.target.value); }} />
      <datalist id={lijstId}>
        {(namen || []).map(function (n) { return <option key={n} value={n} />; })}
      </datalist>
    </React.Fragment>
  );
}

/* ── Tenue-tekendata ── */
const TENUE_KEY = "fch_tenue_v1";
function laadTenue() {
  try {
    var r = localStorage.getItem(sleutelVoor(TENUE_KEY));
    return tenueVernieuw(r ? JSON.parse(r) : null);
  } catch(e) { return tenueVernieuw(null); }
}
function slaTenueOp(t) {
  try { localStorage.setItem(sleutelVoor(TENUE_KEY), JSON.stringify(tenueVernieuw(t))); } catch(e) {}
}
const TENUE_SOORTEN = [
  {id:"thuis",   label:"Thuis",        kort:"Thuis",  keeper:false},
  {id:"uit",     label:"Uit",          kort:"Uit",    keeper:false},
  {id:"derde",   label:"Derde shirt",  kort:"Derde",  keeper:false},
  {id:"keeperT", label:"Keeper thuis", kort:"Keeper thuis", keeper:true},
  {id:"keeperU", label:"Keeper uit",   kort:"Keeper uit",   keeper:true}
];

/* ── Het tenue tekenen ──────────────────────────────────────
   De vlakken worden eerst uitgerekend en pas daarna getekend. Zo kan
   ik nalopen dat een patroon binnen het shirt blijft, zonder een
   browser te hoeven openen. Het tekenvel is 120 breed en 156 hoog. */
const TENUE_VEL = {b:120, h:156};
const TENUE_SHIRT_PAD = "M46 10 L28 15 L8 31 L19 53 L33 46 L33 88 L87 88 L87 46 L101 53 L112 31 L92 15 L74 10 C68 22 52 22 46 10 Z";
const TENUE_ROMP = {x:33, y:10, b:54, h:78};      /* het middenstuk */
const TENUE_MOUW_L = {x:8, y:12, b:25, h:42};
const TENUE_MOUW_R = {x:87, y:12, b:25, h:42};
const TENUE_BROEK_PAD = "M33 92 L87 92 L87 112 L83 132 L63 132 L60 112 L57 132 L37 132 L33 112 Z";
const TENUE_SOK = [{x:38, y:134, b:17, h:22}, {x:65, y:134, b:17, h:22}];

function SpelerPop({ naam, shirt, vlak, grootte, tenueSet: tset }) {
  const g = popGetal(naam);
  const huid  = POP_HUID[g % POP_HUID.length];
  const haar  = POP_HAAR[(g >>> 3) % POP_HAAR.length];
  const trui  = shirt || "#004aad";
  const kapsel = (g >>> 9) % POP_KAPSEL.length;
  const haarH = POP_KAPSEL[kapsel];
  const baard = ((g >>> 13) % 5) === 0 && kapsel !== 5;
  const id = "pop"+(g % 1000000)+"-"+kapsel;
  const maat = grootte || "100%";
  /* De schouders krijgen hetzelfde patroon als het shirt. Het patroon
     wordt in het tenuevel van 120 breed gerekend; hier wordt het naar
     de schouders geschaald in plaats van opnieuw uitgetekend. */
  const patroon = tset ? tenuePatroonDelen(tset) : [];
  const opgelegd = tset ? tenueKleineLagen(tset) : [];
  const SCHOUDER = "M32 41c12 0 21 9 22 24H10c1-15 10-24 22-24z";

  /* Geen achtergrond en geen ronde uitsnede: alleen hoofd en schouders,
     zodat het poppetje overal los op de ondergrond staat. */
  return (
    <svg viewBox="0 0 64 64" width={maat} height={maat} aria-hidden="true"
      style={{display:"block",overflow:"visible"}}>
      <defs>
        {patroon.length > 0 && <clipPath id={id+"-t"}><path d={SCHOUDER}/></clipPath>}
        {haarH>0 && <clipPath id={id+"-h"}><rect x="13" y="5" width="38" height={haarH+5}/></clipPath>}
        {baard && <clipPath id={id+"-b"}><rect x="16" y="28" width="32" height="18"/></clipPath>}
      </defs>
      {/* schouders en shirt, onderaan afgesneden door de rand */}
      <path d={SCHOUDER} fill={trui}/>
      {(patroon.length > 0 || opgelegd.length > 0) && (
        <g clipPath={"url(#"+id+"-t)"}>
          <g transform="translate(10,41) scale(0.3667,0.293) translate(0,-8)">
            {patroon.map(function(d, i){
              return d.vorm === "rect"
                ? <rect key={i} x={d.x} y={d.y} width={d.b} height={d.h} fill={d.kleur}/>
                : <path key={i} d={d.d} fill={d.kleur}/>;
            })}
            {opgelegd.map(function(l, i){
              return <TenueLaag key={l.id || i} laag={l} stuk="shirt"
                sleutel={id + "-p" + (l.id || i)}/>;
            })}
          </g>
        </g>
      )}
      <path d="M25.6 42.8L32 50.6l6.4-7.8-3-1.6h-6.8z" fill="#ffffff" opacity=".34"/>
      {/* hals met schaduw */}
      <rect x="27.3" y="31" width="9.4" height="11" rx="4.7" fill={popDonker(huid)}/>
      {/* oren en hoofd */}
      <circle cx="19" cy="26" r="3.1" fill={huid}/>
      <circle cx="45" cy="26" r="3.1" fill={huid}/>
      <circle cx="32" cy="24" r="13" fill={huid}/>
      {baard && <circle cx="32" cy="24" r="13.3" fill={haar} opacity=".8" clipPath={"url(#"+id+"-b)"}/>}
      {/* gezicht */}
      <circle cx="27.2" cy="23" r="1.6" fill="#2b2118"/>
      <circle cx="36.8" cy="23" r="1.6" fill="#2b2118"/>
      <path d="M28.6 30.4c2 1.7 4.8 1.7 6.8 0" stroke="#2b2118" strokeOpacity=".55"
        strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      {/* kapsel */}
      {haarH>0 && <circle cx="32" cy="24.5" r="13.6" fill={haar} clipPath={"url(#"+id+"-h)"}/>}
      {kapsel===2 && (<g fill={haar}>
        <rect x="18.4" y="19" width="4.2" height="11" rx="2.1"/>
        <rect x="41.4" y="19" width="4.2" height="11" rx="2.1"/>
      </g>)}
      {kapsel===4 && (<g fill={haar}>
        <circle cx="23.5" cy="13.5" r="4.6"/><circle cx="32" cy="10.8" r="5.1"/><circle cx="40.5" cy="13.5" r="4.6"/>
      </g>)}
    </svg>
  );
}

/* Eén laag tekenen. Een vorm, een patroon dat het kledingstuk vult,
   losse tekst of een eigen afbeelding — alle vier komen ze hier
   langs, zodat het knippen en het plaatsen maar op één plek staan. */
function TenueLaag({ laag, stuk, sleutel, nummer, naam }) {
  const l = tenueLaagVernieuw(laag);
  const plek = tenueLaagPlaats(l, stuk);
  const soort = tenueLaagSoort(l);
  const vak = tenueVak(stuk);

  if (soort === "beeld") {
    return (
      <image href={l.beeld} x={-50} y={-50} width={100} height={100}
        preserveAspectRatio="xMidYMid meet"
        transform={plek.transform + " translate(50,50)"} opacity={l.doorzicht}/>
    );
  }
  if (soort === "tekst") {
    const woord = tenueLaagTekst(l, nummer, naam);
    if (!woord) return null;
    /* Met een boog loopt de tekst over een cirkelboog in plaats van
       over een rechte lijn. Bij boog nul is er geen pad en wordt er
       gewoon recht getekend; anders zou een rechte tekst een pad met
       straal oneindig nodig hebben. */
    const stijl = tenueLetterStijl(l.font);
    if (Math.abs(l.boog) < 3) {
      return (
        <text x="50" y="72" textAnchor="middle" fill={l.kleur} opacity={l.doorzicht}
          transform={plek.transform} style={stijl}>{woord}</text>
      );
    }
    const straal = 4000 / Math.abs(l.boog);
    const op = l.boog > 0;
    const pad = "M" + (50 - straal) + " 50A" + straal + " " + straal + " 0 0 " +
                (op ? 1 : 0) + " " + (50 + straal) + " 50";
    return (
      <g transform={plek.transform} opacity={l.doorzicht}>
        <defs><path id={sleutel + "-b"} d={pad}/></defs>
        <text fill={l.kleur} style={stijl}>
          <textPath href={"#" + sleutel + "-b"} startOffset="50%" textAnchor="middle">{woord}</textPath>
        </text>
      </g>
    );
  }
  const v = tenueVorm(l.vorm);
  const delen = tenueVormDelen(l.vorm);
  if (!delen.length) return null;
  /* De lijndikte wordt tegen de schaal in teruggerekend. Zonder dat
     wordt een dunne lijn op een grote vorm ineens loeidik, en op een
     kleine vorm onzichtbaar. */
  const schaal = Math.max(0.01, (plek.breed || 100) / 100);
  const dik = l.lijnDik ? l.lijnDik / schaal : 0;
  return (
    <g transform={plek.transform} fill={l.kleur} opacity={l.doorzicht}
       stroke={dik ? l.lijn : "none"} strokeWidth={dik} strokeLinejoin="round"
       fillRule={v && v.regel === "evenodd" ? "evenodd" : "nonzero"}>
      {delen.map(function(d, i){
        return d.d
          ? <path key={i} d={d.d}/>
          : <rect key={i} x={d.x} y={d.y} width={d.b} height={d.h}/>;
      })}
    </g>
  );
}

/* Het kader om de laag die je bewerkt. Zonder dit zie je op een druk
   shirt niet welke vorm je aan het verslepen bent. */
function TenueKader({ laag, stuk, onGreep, breedOpScherm }) {
  const plek = tenueLaagPlaats(laag, stuk);
  if (!plek.kader) return null;
  const k = plek.kader;
  const mx = k.x + k.b/2, my = k.y + k.h/2;
  const maat = tenueKaderMaten(breedOpScherm, aanraakScherm());
  const knop = tenueDraaiKnop(laag, stuk, breedOpScherm);
  /* De handvatten liggen in het niet-gedraaide kader; de hele groep
     draait daarna mee. Het draaiknopje staat er los van, want dat is
     al in gedraaide wereldmaat uitgerekend. */
  const punt = function(g){
    return {x: mx + (g.sx || 0) * k.b/2, y: my + (g.sy || 0) * k.h/2};
  };
  const grijp = function(g){
    return function(e){
      if (!onGreep) return;
      e.stopPropagation();
      onGreep(g, e);
    };
  };
  return (
    <g>
      <g transform={"rotate(" + k.hoek + " " + mx + " " + my + ")"}>
        <rect x={k.x} y={k.y} width={k.b} height={k.h} fill="none"
          stroke="rgba(255,255,255,.95)" strokeWidth={maat.lijn} strokeDasharray={maat.streep}
          style={{pointerEvents:"none"}}/>
        <rect x={k.x} y={k.y} width={k.b} height={k.h} fill="none"
          stroke="rgba(0,0,0,.55)" strokeWidth={maat.dunneLijn} strokeDasharray={maat.streep}
          style={{pointerEvents:"none"}}/>
        {TENUE_GREPEN.map(function(g){
          var p = punt(g);
          return (
            <g key={g.naam} onPointerDown={grijp({soort:"maat", sx:g.sx, sy:g.sy})}
               style={{cursor:"nwse-resize", touchAction:"none"}}>
              {/* een ruime, onzichtbare rand eromheen: met een vinger
                  is een klein stipje niet te raken */}
              <circle cx={p.x} cy={p.y} r={maat.raak} fill="rgba(0,0,0,0)"/>
              <circle cx={p.x} cy={p.y} r={maat.greep} fill="rgba(255,255,255,.92)"
                stroke="rgba(0,0,0,.55)" strokeWidth={maat.dunneLijn}
                style={{pointerEvents:"none"}}/>
            </g>
          );
        })}
      </g>
      <line x1={knop.vanX} y1={knop.vanY} x2={knop.x} y2={knop.y}
        stroke="rgba(255,255,255,.9)" strokeWidth={maat.lijn} style={{pointerEvents:"none"}}/>
      <g onPointerDown={grijp({soort:"draai"})} style={{cursor:"grab", touchAction:"none"}}>
        <circle cx={knop.x} cy={knop.y} r={maat.raak} fill="rgba(0,0,0,0)"/>
        <circle cx={knop.x} cy={knop.y} r={maat.greep * 1.15} fill="var(--blauw, #004aad)"
          stroke="rgba(255,255,255,.95)" strokeWidth={maat.lijn}
          style={{pointerEvents:"none"}}/>
      </g>
    </g>
  );
}

/* ── Het tenue als tekening ─────────────────────────────────
   Voorkant met clubwapen en sponsor, achterkant met naam en nummer. */
function TenueBeeld({ set, kant, nummer, naam, breed, schaduw, kader, kaderStuk, onGreep, vel }) {
  const s = Object.assign({}, STANDAARD_SET, set || {});
  /* Elk shirt heeft zijn eigen clipPath nodig; twee tenues op één
     scherm mogen niet dezelfde naam krijgen. */
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = "tn" + (++tenueTeller);
  const id = idRef.current;
  const achter = kant === "achter";
  const delen = tenuePatroonDelen(s);
  const w = breed || 150;
  const lijn = "rgba(0,0,0,.28)";
  const shirtDeel = achter ? "shirtAchter" : "shirtVoor";
  const lagen = function(deelId, stuk){
    return tenueLagen(s, deelId).map(function(l, i){
      return <TenueLaag key={l.id || i} laag={l} stuk={stuk} nummer={nummer} naam={naam}
        sleutel={id + "-" + (l.id || i)}/>;
    });
  };
  return (
    <svg ref={vel} viewBox={"0 0 " + TENUE_VEL.b + " " + TENUE_VEL.h}
      width={w} height={w * TENUE_VEL.h / TENUE_VEL.b}
      style={{display:"block", overflow:"visible",
              filter: schaduw === false ? "none" : "drop-shadow(0 3px 6px rgba(0,0,0,.28))"}}>
      <defs>
        <clipPath id={id + "-s"}><path d={TENUE_SHIRT_PAD}/></clipPath>
        <clipPath id={id + "-p"}><path d={TENUE_BROEK_PAD}/></clipPath>
        <clipPath id={id + "-k"}>
          {TENUE_SOK.map(function(k, i){
            return <rect key={i} x={k.x} y={k.y} width={k.b} height={k.h} rx="5"/>;
          })}
        </clipPath>
      </defs>
      {/* Het shirt: hoofdkleur, snelpatroon, dan de eigen lagen */}
      <g clipPath={"url(#" + id + "-s)"}>
        <rect x="0" y="0" width={TENUE_VEL.b} height="92" fill={s.shirt}/>
        {delen.map(function(d, i){
          return d.vorm === "rect"
            ? <rect key={i} x={d.x} y={d.y} width={d.b} height={d.h} fill={d.kleur}/>
            : <path key={i} d={d.d} fill={d.kleur}/>;
        })}
        {lagen(shirtDeel, "shirt")}
      </g>
      <path d={TENUE_SHIRT_PAD} fill="none" stroke={lijn} strokeWidth="1.4"/>
      {/* De kraag ligt over de hals heen */}
      <path d="M46 10 C52 22 68 22 74 10" fill="none" stroke={s.kraag} strokeWidth="6"
        strokeLinecap="round"/>
      <path d="M46 10 C52 22 68 22 74 10" fill="none" stroke={lijn} strokeWidth="0.9"/>
      {/* De mouwboorden */}
      <path d="M8 31 L19 53" stroke={s.kraag} strokeWidth="5" strokeLinecap="round"/>
      <path d="M112 31 L101 53" stroke={s.kraag} strokeWidth="5" strokeLinecap="round"/>

      {achter ? null : (
        <g>
          {s.embleem !== false && (
            <g transform="translate(41,32)">
              <path d="M0 0 H15 V9 C15 15 7.5 18 7.5 18 C7.5 18 0 15 0 9 Z"
                fill={s.tekst} stroke={lijn} strokeWidth="0.8"/>
              <path d="M2.4 2.4 H12.6 V9 C12.6 13 7.5 15.2 7.5 15.2 C7.5 15.2 2.4 13 2.4 9 Z"
                fill={s.shirt}/>
            </g>
          )}
          {s.sponsor ? (
            <text x="60" y="70" textAnchor="middle" fill={s.tekst}
              style={{fontFamily:"'Helvetica Neue',Arial,sans-serif", fontSize:"9px",
                      fontWeight:800, letterSpacing:".5px"}}>{s.sponsor.toUpperCase()}</text>
          ) : null}
        </g>
      )}

      {/* De broek */}
      <g clipPath={"url(#" + id + "-p)"}>
        <path d={TENUE_BROEK_PAD} fill={s.broek}/>
        {lagen("broek", "broek")}
      </g>
      <path d={TENUE_BROEK_PAD} fill="none" stroke={lijn} strokeWidth="1.4"/>
      <path d="M60 92 L60 112" stroke={lijn} strokeWidth="0.9"/>
      {/* De sokken, met een boord in de tweede kleur */}
      <g clipPath={"url(#" + id + "-k)"}>
        {TENUE_SOK.map(function(k, i){
          return <rect key={i} x={k.x} y={k.y} width={k.b} height={k.h} rx="5" fill={s.sokken}/>;
        })}
        {lagen("sok", "sok")}
        {TENUE_SOK.map(function(k, i){
          return <rect key={"b" + i} x={k.x} y={k.y} width={k.b} height="5" rx="2.4" fill={s.shirt2}/>;
        })}
      </g>
      {TENUE_SOK.map(function(k, i){
        return <rect key={i} x={k.x} y={k.y} width={k.b} height={k.h} rx="5"
          fill="none" stroke={lijn} strokeWidth="1.2"/>;
      })}
      {kader && <TenueKader laag={kader} stuk={kaderStuk || "shirt"} onGreep={onGreep}
        breedOpScherm={w}/>}
    </svg>
  );
}

/* Foto als die er is, anders een getekend poppetje */
function SpelerBeeld({ speler, shirt, vlak, tenueSet: tset }) {
  if (speler && speler.foto) {
    return <img src={speler.foto} alt={speler.naam||""}
      style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%",display:"block"}}/>;
  }
  return <SpelerPop naam={(speler&&speler.naam)||"?"} shirt={shirt} vlak={vlak} tenueSet={tset} />;
}
