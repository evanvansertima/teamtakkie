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
   tenue-ontwerper en is bij P4 stap 6 (17 september 2026) naar
   src/schermen/clubhuis.jsx verplaatst. CORRECTIE: "wordt door niets
   anders gebruikt" bleek niet te kloppen voor TENUE_GREPEN, die wordt
   hieronder door TenueKader zelf gebruikt — werkt gewoon via gedeelde
   scope (clubhuis.jsx laadt ná dit bestand), zie de toelichting onderin
   dit bestand bij "TOEGEVOEGD BIJ P4 STAP 6" voor de volledige uitleg,
   inclusief een aantal tenue-hulpfuncties die toen óók hier hadden
   moeten staan en nu alsnog zijn toegevoegd.

   TOEGEVOEGD BIJ P4 STAP 7 (17 september 2026)
   Twee stukken stonden sinds stap 0 nog fysiek in de opstellingen-zone
   van src/app.jsx, met opzet niet meeverhuisd omdat ze niet met naam
   in het stappenplan stonden — bij het narekenen voor stap 7 bleken ze
   uitsluitend hier gebruikt te worden, en zijn nu alsnog verplaatst:
   - `tenueTeller` (de teller voor unieke SVG-id's), vlak vóór
     TenueBeeld hieronder — precies waar de toelichting hierboven al
     op wees.
   - POP_HUID, POP_HAAR, POP_VLAK, POP_KAPSEL en de functies
     popGetal()/popDonker(), vlak vóór SpelerPop hieronder — het
     tekengereedschap voor het willekeurige spelerpoppetje, dat al
     sinds stap 0 alleen door SpelerPop hier wordt gebruikt.
   Beide waren al die tijd functioneel geen probleem (function-
   declaraties hoisten, en `let`/`const` op topniveau worden pas
   gelezen ná het laden van alle scripts, in een renderfunctie) — dit
   is dus een opruiming, geen gedragswijziging.

   Zie docs/p4-stappenplan.md §0, §1 (stap 7) en §3 voor de volledige
   redenering,
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
   VASTE TRAININGSTIJDEN — dagen aanvinken, per dag tijd en duur
   ─────────────────────────────────────────────────────────────
   Op twee plekken: bij het aanmaken van een team en in Instellingen.
   Daarom één onderdeel, zodat ze er op beide plekken hetzelfde uitzien
   en zich hetzelfde gedragen. De rekenregels (welke tijd een nieuwe
   dag krijgt) staan in src/domein/trainingstijden.js. */
function TrainingsmomentenKiezer({ waarde, opWaarde }) {
  var momenten = trainingsmomentenNetjes(waarde);
  function zet(dag, wijziging) {
    opWaarde(trainingsmomentenNetjes(momenten.map(function (m) {
      return m.dag === dag ? Object.assign({}, m, wijziging) : m;
    })));
  }
  return (
    <div className="trmom">
      <div className="trmom-dagen" role="group" aria-label="Trainingsdagen">
        {TRAININGSDAGEN.map(function (d) {
          var aan = momenten.some(function (m) { return m.dag === d.dag; });
          return (
            <button key={d.dag} type="button" aria-pressed={aan} title={d.naam}
              className={"trmom-dag" + (aan ? " aan" : "")}
              onClick={function () { opWaarde(wisselTrainingsdag(momenten, d.dag)); }}>
              {d.kort}
            </button>
          );
        })}
      </div>
      {momenten.map(function (m) {
        var d = TRAININGSDAGEN.filter(function (x) { return x.dag === m.dag; })[0];
        return (
          <div key={m.dag} className="trmom-rij">
            <span className="trmom-naam">{d.naam}</span>
            <input className="formulier-input trmom-tijd" type="time" value={m.tijd} aria-label={"Tijd op " + d.naam}
              onChange={function (e) { if (e.target.value) zet(m.dag, { tijd: e.target.value }); }} />
            <span className="trmom-duur">
              <GetalVeld className="formulier-input" min={15} max={240} leeg={TRAINING_STANDAARD_DUUR} waarde={m.duur}
                aria-label={"Duur op " + d.naam + " in minuten"}
                opWaarde={function (n) { zet(m.dag, { duur: n }); }} />
              <span>min</span>
            </span>
          </div>
        );
      })}
      {!momenten.length && <div className="trmom-leeg">Tik de dagen aan waarop jullie trainen.</div>}
    </div>
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

/* ═══════════════════════════════════════════════════════════
   SPELERPOPPETJE
   Heeft een speler geen foto, dan tekenen we er een. Alles komt
   uit de naam zelf, dus dezelfde speler krijgt altijd hetzelfde
   poppetje — en er is geen internet of plaatjesbestand voor nodig.
═══════════════════════════════════════════════════════════ */
const POP_HUID = ["#f7d9c0","#efc9a6","#e0aa80","#c98a5e","#a56a42","#7d4a2b"];
const POP_HAAR = ["#241a12","#3d2a1a","#6b4423","#96612c","#c9a227","#d6d1cb","#101010","#5a3a2e"];
const POP_VLAK = ["#dbeafe","#dcfce7","#fef3c7","#fae8ff","#ffe4e6","#e0e7ff","#ccfbf1","#ffedd5"];
/* Hoe ver het haar over het hoofd valt, per kapsel. 0 = kaal. */
const POP_KAPSEL = [12, 15, 15, 9, 14, 0];

function popGetal(tekst) {
  var s = String(tekst || "?"), x = 2166136261;
  for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
/* Iets donkerder maken, voor de schaduw in de hals */
function popDonker(hex) {
  var c = String(hex).replace("#","");
  var r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  function d(v){ return Math.max(0, Math.round(v*0.82)).toString(16).padStart(2,"0"); }
  return "#"+d(r)+d(g)+d(b);
}

/* Hoe het poppetje van een naam eruitziet zonder eigen keuze. Los
   gezet (14 oktober 2026) zodat de avatarmaker met precies dit poppetje
   kan beginnen: wie zijn avatar gaat aanpassen, ziet eerst wat er al was. */
function popAvatarVan(naam) {
  const g = popGetal(naam);
  const kapsel = (g >>> 9) % POP_KAPSEL.length;
  return { huid: g % POP_HUID.length, haar: (g >>> 3) % POP_HAAR.length, kapsel: kapsel,
           baard: ((g >>> 13) % 5) === 0 && kapsel !== 5 };
}
function popKeuze(lijst, i, terug) {
  var n = Number(i);
  return (Number.isInteger(n) && n >= 0 && n < lijst.length) ? n : terug;
}

function SpelerPop({ naam, shirt, vlak, grootte, tenueSet: tset, avatar, uitsnede }) {
  const g = popGetal(naam);
  /* Zelfgemaakt (sinds 14 oktober 2026): een volledige avatar met
     geslacht, kapsel en gezicht, getekend door PopHoofd hieronder. */
  const v2 = avatar ? avatarNetjes(avatar, naam) : null;
  /* Een zelfgemaakte avatar wint; wat er niet in staat komt uit de naam. */
  const auto = popAvatarVan(naam);
  const eigen = avatar || {};
  const huid  = POP_HUID[popKeuze(POP_HUID, eigen.huid, auto.huid)];
  const haar  = POP_HAAR[popKeuze(POP_HAAR, eigen.haar, auto.haar)];
  const trui  = shirt || "#004aad";
  const kapsel = popKeuze(POP_KAPSEL, eigen.kapsel, auto.kapsel);
  const haarH = POP_KAPSEL[kapsel];
  const baard = (typeof eigen.baard === "boolean" ? eigen.baard : auto.baard) && kapsel !== 5;
  /* Zelfgemaakt krijgt een eigen id (anders delen twee varianten in de
     kapselkiezer hun uitsnede); het automatische poppetje houdt het oude. */
  const id = v2 ? "pa"+(avatarGetal(JSON.stringify(v2)+naam) % 10000000) : "pop"+(g % 1000000)+"-"+kapsel;
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
    <svg viewBox={uitsnede || "0 0 64 64"} width={maat} height={maat} aria-hidden="true"
      style={{display:"block",overflow:"visible"}}>
      <defs>
        {patroon.length > 0 && <clipPath id={id+"-t"}><path d={SCHOUDER}/></clipPath>}
        {!v2 && haarH>0 && <clipPath id={id+"-h"}><rect x="13" y="5" width="38" height={haarH+5}/></clipPath>}
        {!v2 && baard && <clipPath id={id+"-b"}><rect x="16" y="28" width="32" height="18"/></clipPath>}
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
      {v2 ? <PopHoofd a={v2} id={id}/> : (<React.Fragment>
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
      </React.Fragment>)}
    </svg>
  );
}

/* ══ PopHoofd — de zelfgemaakte avatar ══════════════════════════
   Alles in hetzelfde vel van 64 bij 64 als SpelerPop: hoofd rond
   (32,24) met straal 13, ogen op hoogte 23. Volgorde van tekenen:
   haar achter het hoofd (lang, afro, staart), hals, oren, hoofd,
   baard, gezicht, en dan het haar op het hoofd. De keuzes zelf staan
   in src/domein/avatar.js. */
const POP_HOOFD = {
  rond:  "M19 24A13 13 0 1 1 45 24A13 13 0 1 1 19 24Z",
  ovaal: "M19.8 24.6A12.2 13.6 0 1 1 44.2 24.6A12.2 13.6 0 1 1 19.8 24.6Z",
  smal:  "M19 24A13 13 0 0 1 45 24C45 32.5 38.8 38.3 32 38.6C25.2 38.3 19 32.5 19 24Z",
  breed: "M19 24A13 13 0 0 1 45 24V29.5Q45 37.2 36.5 37.4H27.5Q19 37.2 19 29.5Z"
};
function PopHoofd({ a, id }) {
  const huid = POP_HUID[a.huid], haar = POP_HAAR[a.haar], donker = popDonker(huid);
  const oog = "#2b2118", vrouw = a.geslacht === "v";
  const hoofd = POP_HOOFD[a.kin] || POP_HOOFD.rond;
  const smalHoofd = a.kin === "ovaal" || a.kin === "smal";
  /* De haarkap: een cirkel over het hoofd, tot een bepaalde hoogte. */
  function kap(hoogte, extra) {
    return <circle cx="32" cy="24.5" r="13.6" fill={haar} clipPath={"url(#"+id+"-k"+hoogte+")"} {...(extra||{})}/>;
  }
  const kapHoogte = {buzz:9, kort:10, stekels:9, scheiding:12, kuif:10, krullen:11, afro:9, bob:11,
                     lang:12, staart:12, knot:12, vlechten:12}[a.kapsel] || 0;
  const achter = {
    afro:     <circle cx="32" cy="19" r="17.5" fill={haar}/>,
    bob:      <path d="M17.2 22C17.2 13 23.5 8.6 32 8.6S46.8 13 46.8 22V35.5Q46.8 38 44 38H20Q17.2 38 17.2 35.5Z" fill={haar}/>,
    lang:     <path d="M17 22C17 12.5 23.5 8.4 32 8.4S47 12.5 47 22L48.2 45.5Q32 49 15.8 45.5Z" fill={haar}/>,
    staart:   <path d="M42.5 17Q53.5 21 50.8 36Q49.8 41.5 46.4 39.6Q49.2 31 43.2 24Z" fill={haar}/>,
    knot:     <circle cx="32" cy="8.6" r="5.2" fill={haar}/>,
    vlechten: (<g fill={haar}>
                <rect x="15.4" y="20" width="4.6" height="24" rx="2.3"/><rect x="44" y="20" width="4.6" height="24" rx="2.3"/>
                <circle cx="17.7" cy="45" r="1.8" fill={donker}/><circle cx="46.3" cy="45" r="1.8" fill={donker}/>
              </g>)
  }[a.kapsel];
  const voor = {
    buzz:      kap(9, {opacity:.55}),
    kort:      kap(10),
    stekels:   <g>{kap(9)}<path d="M19.5 18.5L21 11.5L24.5 15L26.5 8.5L29.8 13L32 7L34.2 13L37.5 8.5L39.5 15L43 11.5L44.5 18.5Z" fill={haar}/></g>,
    scheiding: <g>{kap(12)}<path d="M19.2 22C19.6 13.5 26 10.4 33 10.6C40.5 10.8 45 15 44.9 21.5C41 15.5 33.5 13.6 27 15.2C23 16.2 20.5 18.5 19.2 22Z" fill={haar}/></g>,
    kuif:      <g>{kap(10)}<ellipse cx="30" cy="11.6" rx="9.5" ry="4.6" fill={haar}/><ellipse cx="36.5" cy="10.6" rx="5" ry="3.6" fill={haar}/></g>,
    krullen:   (<g>{kap(11)}<g fill={haar}>
                  <circle cx="23.5" cy="13.5" r="4.6"/><circle cx="32" cy="10.8" r="5.1"/><circle cx="40.5" cy="13.5" r="4.6"/>
                  <circle cx="19.8" cy="18.5" r="3.4"/><circle cx="44.2" cy="18.5" r="3.4"/></g></g>),
    afro:      kap(9),
    bob:       kap(11),
    lang:      <g>{kap(12)}<g fill={haar}><rect x="18.2" y="18" width="4.4" height="14" rx="2.2"/><rect x="41.4" y="18" width="4.4" height="14" rx="2.2"/></g></g>,
    staart:    kap(12),
    knot:      kap(12),
    vlechten:  kap(12)
  }[a.kapsel];

  function paar(f) { return <g>{f(27.2)}{f(36.8)}</g>; }
  const ogen = {
    rond:    paar(function(x){ return <circle cx={x} cy="23" r="1.6" fill={oog}/>; }),
    groot:   paar(function(x){ return <g><circle cx={x} cy="23" r="2.5" fill="#ffffff"/><circle cx={x} cy="23.3" r="1.5" fill={oog}/><circle cx={x+0.5} cy="22.6" r=".5" fill="#ffffff"/></g>; }),
    ovaal:   paar(function(x){ return <ellipse cx={x} cy="23" rx="1.25" ry="2" fill={oog}/>; }),
    smal:    paar(function(x){ return <ellipse cx={x} cy="23.2" rx="2" ry=".9" fill={oog}/>; }),
    lachend: paar(function(x){ return <path d={"M"+(x-1.9)+" 23.6q1.9-2.2 3.8 0"} stroke={oog} strokeWidth="1.3" strokeLinecap="round" fill="none"/>; })
  }[a.ogen];
  /* Wimpers aan de buitenkant van elk oog */
  const wimpers = vrouw && a.ogen !== "lachend" && (
    <g stroke={oog} strokeWidth=".9" strokeLinecap="round">
      <path d="M25.3 22.2l-1.1-.9"/><path d="M38.7 22.2l1.1-.9"/>
    </g>);
  const neus = {
    klein: <path d="M30.9 27.3q1.1 .9 2.2 0" stroke={donker} strokeWidth="1.1" strokeLinecap="round" fill="none"/>,
    rond:  <circle cx="32" cy="27" r="1.4" fill={donker} opacity=".6"/>,
    spits: <path d="M32.4 23.6L30.9 27.6H32.9" stroke={donker} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    breed: <g><path d="M29.6 27.2q2.4 1.6 4.8 0" stroke={donker} strokeWidth="1.1" strokeLinecap="round" fill="none"/><circle cx="30.6" cy="27" r=".5" fill={oog}/><circle cx="33.4" cy="27" r=".5" fill={oog}/></g>,
    geen:  null
  }[a.neus];
  const lip = vrouw ? "#b4505a" : oog, lipD = vrouw ? 1 : .55;
  const mond = {
    glimlach: <path d="M28.6 30.4c2 1.7 4.8 1.7 6.8 0" stroke={lip} strokeOpacity={lipD} strokeWidth="1.4" strokeLinecap="round" fill="none"/>,
    lach:     <g><path d="M28.3 29.4Q32 34.6 35.7 29.4Z" fill="#5b1f1f"/><path d="M28.9 29.6H35.1Q34.8 30.6 32 30.6Q29.2 30.6 28.9 29.6Z" fill="#ffffff"/></g>,
    grijns:   <path d="M28.6 30.6Q32.4 32.6 35.6 29.4" stroke={lip} strokeOpacity={lipD} strokeWidth="1.4" strokeLinecap="round" fill="none"/>,
    neutraal: <path d="M29.2 30.8H34.8" stroke={lip} strokeOpacity={lipD} strokeWidth="1.4" strokeLinecap="round"/>,
    verbaasd: <ellipse cx="32" cy="30.9" rx="1.4" ry="1.8" fill="#5b1f1f"/>
  }[a.mond];
  const hoogtes = [9, 10, 11, 12];
  return (
    <g>
      <defs>
        {hoogtes.map(function(h){ return <clipPath key={h} id={id+"-k"+h}><rect x="13" y="5" width="38" height={h+5}/></clipPath>; })}
        <clipPath id={id+"-b"}><path d={hoofd}/></clipPath>
      </defs>
      {achter}
      <rect x="27.3" y="31" width="9.4" height="11" rx="4.7" fill={donker}/>
      <circle cx={smalHoofd ? 19.8 : 19} cy="26" r="3.1" fill={huid}/>
      <circle cx={smalHoofd ? 44.2 : 45} cy="26" r="3.1" fill={huid}/>
      <path d={hoofd} fill={huid}/>
      {a.baard && <rect x="16" y="28" width="32" height="18" fill={haar} opacity=".8" clipPath={"url(#"+id+"-b)"}/>}
      {ogen}{wimpers}{neus}{mond}
      {kapHoogte > 0 && voor}
    </g>
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
let tenueTeller = 0;

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
/* Drie soorten beeld (besluit van Evan, 14 oktober 2026): een foto, een
   zelfgemaakte avatar, of een neutraal silhouet. Spelers van daarvoor
   hebben geen beeldSoort; die houden wat ze hadden — hun foto, of het
   poppetje dat uit hun naam volgt. */
function SpelerBeeld({ speler, shirt, vlak, tenueSet: tset }) {
  const soort = speler && speler.beeldSoort;
  if (speler && speler.foto && (!soort || soort === "foto")) {
    return <img src={speler.foto} alt={speler.naam||""}
      style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%",display:"block"}}/>;
  }
  if (soort === "silhouet") return <SpelerSilhouet shirt={shirt}/>;
  return <SpelerPop naam={(speler&&speler.naam)||"?"} shirt={shirt} vlak={vlak} tenueSet={tset}
    avatar={soort === "avatar" ? speler.avatar : null} />;
}
/* Het standaardsilhouet (voorbeeld van Evan, 14 oktober 2026): een
   donkere cirkel met een lichte figuur die tot de onderrand doorloopt. */
function SpelerSilhouet({ grootte }) {
  const maat = grootte || "100%";
  return (
    <svg viewBox="0 0 64 64" width={maat} height={maat} aria-hidden="true" style={{display:"block"}}>
      <defs><clipPath id="tt-silhouet-rand"><circle cx="32" cy="32" r="32"/></clipPath></defs>
      <circle cx="32" cy="32" r="32" fill="#1f2630"/>
      <path clipPath="url(#tt-silhouet-rand)" fill="#f4f6f8"
        d="M32 12.5c-6 0-9.4 3.7-9.4 9.6v4.2c-.9.2-1.2 1-1 2.1.3 1.6 1 2.8 2.1 3.1.6 2.4 1.7 4.4 3 5.7v3.2c0 .9-.5 1.6-1.4 2l-9.6 3.4c-3 1-4.6 3-5.2 6.3L9 64h46l-1.5-11.9c-.6-3.3-2.2-5.3-5.2-6.3l-9.6-3.4c-.9-.4-1.4-1.1-1.4-2v-3.2c1.3-1.3 2.4-3.3 3-5.7 1.1-.3 1.8-1.5 2.1-3.1.2-1.1-.1-1.9-1-2.1v-4.2c0-5.9-3.4-9.6-9.4-9.6z"/>
    </svg>
  );
}

/* ── De avatarmaker ── man of vrouw, huid, haarkleur, kapsel (kort,
   normaal, lang), ogen, neus, mond, kin en baard. Elke keuze laat
   zichzelf zien in een tegeltje, met het resultaat groot erboven. */
const AVATAR_GEZICHT = "18 15 28 28";   // uitsnede rond het gezicht, voor de tegeltjes
const AVATAR_HOOFD = "9 3 46 46";       // uitsnede met het haar erbij, voor de kapsels
/* Het automatische poppetje van een naam, als zelfgemaakte avatar: zo
   begint de maker met wat de speler al had, en niet met een vreemde. */
function avatarUitAuto(naam) {
  return avatarNetjes(Object.assign({}, popAvatarVan(naam || "?"),
    {ogen:"rond", neus:"geen", mond:"glimlach", kin:"rond"}), naam || "?");
}
function AvatarMaker({ naam, waarde, opWaarde }) {
  const a = waarde ? avatarNetjes(waarde, naam || "?") : avatarUitAuto(naam);
  function zet(k, v) { var n = Object.assign({}, a); n[k] = v; opWaarde(avatarNetjes(n, naam || "?")); }
  function kleuren(label, lijst, sleutel) {
    return (
      <div className="avatar-rij">
        <span className="avatar-rij-label">{label}</span>
        <div className="avatar-stalen">
          {lijst.map(function(kleur, i){
            return <button key={i} type="button" aria-label={label+" "+(i+1)}
              className={"avatar-staal"+(a[sleutel]===i?" actief":"")} style={{background:kleur}}
              onClick={function(){ zet(sleutel, i); }}/>;
          })}
        </div>
      </div>
    );
  }
  function tegels(label, lijst, sleutel, uitsnede) {
    return (
      <div className="avatar-rij">
        <span className="avatar-rij-label">{label}</span>
        <div className="avatar-stalen">
          {lijst.map(function(o){
            var v = Object.assign({}, a); v[sleutel] = o.id;
            return (
              <button key={o.id} type="button" title={o.label} aria-label={label+": "+o.label}
                className={"avatar-tegel"+(a[sleutel]===o.id?" actief":"")}
                onClick={function(){ zet(sleutel, o.id); }}>
                <SpelerPop naam={naam || "?"} avatar={v} uitsnede={uitsnede}/>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="avatar-maker">
      <div className="avatar-voorbeeld"><SpelerPop naam={naam || "?"} avatar={a}/></div>
      <div className="avatar-rij">
        <span className="avatar-rij-label">Geslacht</span>
        <div className="avatar-stalen">
          {[{id:"m",label:"Mannelijk"},{id:"v",label:"Vrouwelijk"}].map(function(g){
            return <button key={g.id} type="button" className="filter-chip" style={chipStijl(a.geslacht===g.id)}
              onClick={function(){ opWaarde(avatarMetGeslacht(a, g.id, naam || "?")); }}>{g.label}</button>;
          })}
          <button type="button" className="filter-chip" style={{marginLeft:"auto"}}
            onClick={function(){ opWaarde(avatarWillekeurig(a.geslacht)); }}><i className="fa-solid fa-shuffle"/> Verras me</button>
        </div>
      </div>
      {kleuren("Huid", POP_HUID, "huid")}
      {kleuren("Haarkleur", POP_HAAR, "haar")}
      {AVATAR_LENGTES.map(function(l){
        return <React.Fragment key={l.id}>{tegels(l.label, AVATAR_KAPSELS.filter(function(k){ return k.lengte===l.id; }), "kapsel", AVATAR_HOOFD)}</React.Fragment>;
      })}
      {tegels("Ogen", AVATAR_OGEN, "ogen", AVATAR_GEZICHT)}
      {tegels("Neus", AVATAR_NEUZEN, "neus", AVATAR_GEZICHT)}
      {tegels("Mond", AVATAR_MONDEN, "mond", AVATAR_GEZICHT)}
      {tegels("Kin", AVATAR_KINNEN, "kin", AVATAR_GEZICHT)}
      {a.geslacht==="m" && a.kapsel!=="kaal" && (
        <div className="avatar-rij">
          <span className="avatar-rij-label">Baard</span>
          <div className="avatar-stalen">
            <button type="button" className="filter-chip" style={chipStijl(!a.baard)} onClick={function(){ zet("baard", false); }}>Nee</button>
            <button type="button" className="filter-chip" style={chipStijl(!!a.baard)} onClick={function(){ zet("baard", true); }}>Ja</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOEGEVOEGD BIJ P4 STAP 6 (17 september 2026) — een gat uit stap 0
   ─────────────────────────────────────────────────────────────
   Bij het verplaatsen van clubhuis (docs/p4-stappenplan.md stap 6)
   bleek dat TenueBeeld/TenueKader hierboven (stap 0) al veel meer
   tenue-hulpfuncties nodig hadden dan toen meeverhuisd is. Ze werkten
   tot nu toe alleen omdat elk gebruik binnen een renderfunctie zit
   die pas draait ná het laden van alle scripts (zie de uitleg in de
   bestandskop hierboven en docs/p4-stappenplan.md §3) — met clubhuis
   als nieuw bestand ná gedeeld.jsx in SCHERM_VOLGORDE was dat langer
   houdbaar geweest, maar dan zou gedeeld.jsx voor zijn eigen tekenwerk
   blijven leunen op een later ladend, domeinspecifiek bestand. Vandaar
   deze correctie: alles hieronder staat er nu waar het al die tijd
   hoorde te staan. Zelfde categorie fout als getalKlem()/getalTyp()/
   getalKlaar()/aanraakScherm() (ook hieronder, apart blok): allemaal
   functies die TenueKader/GetalVeld hierboven aanroepen maar die
   fysiek in src/app.jsx waren blijven staan.

   CORRECTIE OP DE "NIET HIERHEEN VERPLAATST"-CLAIM HIERBOVEN
   TENUE_GREPEN bleek, anders dan de bestandskop hierboven claimde,
   wél door iets anders gebruikt te worden: TenueKader (verderop in
   dit bestand) gebruikt hem rechtstreeks. TENUE_GREPEN zelf is bij
   stap 6 toch naar clubhuis.jsx verplaatst (samen met zijn naamgenoten
   TENUE_PATRONEN/TENUE_BEGIN/TENUE_GROEPEN/TENUE_VORMEN/TENUE_DELEN/
   TENUE_FONTS/TENUE_ZOOMS/TENUE_HISTORIE_MAX/TENUE_GROEP_MS) — dat
   werkt gewoon via gedeelde scope, clubhuis.jsx laadt vóór src/app.jsx
   en ná dit bestand, en TenueKader leest TENUE_GREPEN pas in zijn
   renderfunctie. Zie de bestandskop hierboven voor de rest van die
   lijst; de claim "wordt door niets anders gebruikt" gold dus niet
   voor TENUE_GREPEN, en is hiermee rechtgezet.
═══════════════════════════════════════════════════════════ */

/* ── TENUE ── */
const STANDAARD_TENUE = { shirt:"#004aad", shirt2:"#ffffff", tekst:"#ffffff", patroon:"effen", keeper:"#28a745", keuze:"thuis" };
/* ── De tenue-ontwerper ─────────────────────────────────────
   Vijf tenues, elk met een shirt, een broek en sokken. De losse
   velden shirt/shirt2/tekst/patroon/keeper blijven bestaan omdat het
   opstellingsscherm en de spelerskaart die gebruiken; ze worden
   afgeleid uit het thuistenue, zodat er één waarheid is. */
const STANDAARD_SET = {
  shirt:"#004aad", shirt2:"#ffffff", mouw:"", kraag:"#ffffff",
  broek:"#ffffff", sokken:"#004aad", tekst:"#ffffff",
  patroon:"effen", embleem:false, sponsor:"", lagen:[]
};
function tenueSet(tenue, id) {
  var s = ((tenue || {}).sets || {})[id];
  var uit = Object.assign({}, STANDAARD_SET, TENUE_BEGIN[id] || {}, s || {});
  /* De lagen worden hier losgetrokken en nagelopen. Zonder die eigen
     kopie zouden twee tenues dezelfde lijst delen, en dan verandert
     het uitshirt mee zodra je iets op het thuisshirt legt. */
  uit.lagen = (Array.isArray(uit.lagen) ? uit.lagen : []).map(tenueLaagVernieuw);
  return uit;
}
/* Een tenue van vóór de ontwerper heeft alleen losse velden. Die
   worden het thuistenue en het keeperstenue; de rest begint blanco.
   Andersom: de losse velden volgen daarna altijd uit de sets, zodat
   er geen twee versies van dezelfde kleur kunnen ontstaan. */
function tenueVernieuw(t) {
  var n = Object.assign({}, STANDAARD_TENUE, t || {});
  n.sets = Object.assign({}, n.sets);
  if (!n.sets.thuis) n.sets.thuis = Object.assign({}, TENUE_BEGIN.thuis,
    {shirt:n.shirt, shirt2:n.shirt2, tekst:n.tekst, patroon:n.patroon, sokken:n.shirt});
  if (!n.sets.keeperT) n.sets.keeperT = Object.assign({}, TENUE_BEGIN.keeperT,
    {shirt:n.keeper, shirt2:n.keeper, sokken:n.keeper, patroon:"effen"});
  /* Alleen een veldtenue kun je aantrekken; de keeper krijgt daar
     vanzelf het bijbehorende keeperstenue bij. */
  if (["thuis","uit","derde"].indexOf(n.keuze) < 0) n.keuze = "thuis";
  var thuis = tenueSet(n, "thuis"), kt = tenueSet(n, "keeperT");
  n.shirt = thuis.shirt; n.shirt2 = thuis.shirt2; n.tekst = thuis.tekst;
  n.patroon = thuis.patroon; n.keeper = kt.shirt;
  return n;
}
function tenueVorm(id) {
  for (var i = 0; i < TENUE_VORMEN.length; i++)
    if (TENUE_VORMEN[i].id === id) return TENUE_VORMEN[i];
  return null;
}
/* Waar een vorm uit bestaat: één pad, of de losse vlakken van een
   patroon. Beide komen er in dezelfde vorm uit, zodat de tekening en
   de test maar één soort ding hoeven te kennen. */
function tenueVormDelen(id) {
  var v = tenueVorm(id);
  if (!v) return [];
  if (v.maak) return v.maak();
  return v.d ? [{d:v.d}] : [];
}
/* Wat er bovenop het shirt komt te liggen. Alles blijft binnen het
   vel: het shirt zelf knipt de randen weg, maar een patroon dat
   helemaal naast het shirt valt is gewoon een fout. */
function tenuePatroonDelen(set) {
  var s = Object.assign({}, STANDAARD_SET, set || {});
  var k = s.shirt2, uit = [], i;
  if (s.patroon === "strepen") {
    for (i = 6; i < 112; i += 18) uit.push({vorm:"rect", x:i, y:8, b:9, h:82, kleur:k});
  } else if (s.patroon === "banden") {
    for (i = 16; i < 88; i += 17) uit.push({vorm:"rect", x:6, y:i, b:108, h:8, kleur:k});
  } else if (s.patroon === "halven") {
    uit.push({vorm:"rect", x:60, y:8, b:54, h:82, kleur:k});
  } else if (s.patroon === "diagonaal") {
    uit.push({vorm:"pad", d:"M6 90 L114 8 L114 90 Z", kleur:k});
  } else if (s.patroon === "keper") {
    uit.push({vorm:"pad", d:"M6 90 L84 8 L106 8 L28 90 Z", kleur:k});
  } else if (s.patroon === "mouwen") {
    uit.push({vorm:"rect", x:6, y:8, b:27, h:52, kleur:k});
    uit.push({vorm:"rect", x:87, y:8, b:27, h:52, kleur:k});
  }
  /* Een eigen mouwkleur gaat er altijd overheen, ook bij een patroon */
  if (s.mouw) {
    uit.push({vorm:"rect", x:6,  y:8, b:27, h:52, kleur:s.mouw});
    uit.push({vorm:"rect", x:87, y:8, b:27, h:52, kleur:s.mouw});
  }
  return uit;
}
/* Het vak waarin de lagen van een kledingstuk vallen, in het
   tenuevel. Eén plek, zodat de tekening en de bediening niet uit
   elkaar kunnen lopen. */
function tenueVak(stuk) {
  if (stuk === "broek") return {x:33, y:92,  b:54,  h:40};
  if (stuk === "sok")   return {x:38, y:134, b:44,  h:22};
  return {x:6, y:8, b:108, h:82};
}
/* De opmaak van een tekstlaag op één plek, zodat de tekening en de
   test naar hetzelfde kijken. Stond dit in de tekening zelf, dan kon
   een vergeten letterafstand ongemerkt wegvallen. */
function tenueLetterStijl(fontId, groot) {
  var f = TENUE_FONTS.filter(function(x){ return x.id === fontId; })[0] || TENUE_FONTS[0];
  return {fontFamily: f.css, fontWeight: f.vet,
          fontSize: (groot || 64) + "px",
          letterSpacing: (f.spatie || 0) + "px"};
}
function tenueLaagTekst(laag, nummer, naam) {
  var l = laag || {};
  if (l.bron === "nummer") return String(nummer == null ? 10 : nummer);
  if (l.bron === "naam")   return String(naam == null ? "Speler" : naam).toUpperCase();
  return l.tekst || "";
}
/* Een laag netjes maken. Alles wat er raar in staat wordt hier
   rechtgetrokken, zodat de rest van de app nooit hoeft te twijfelen. */
function tenueLaagVernieuw(laag) {
  var l = Object.assign({}, STANDAARD_LAAG, laag || {});
  if (!tenueDeelBestaat(l.deel)) l.deel = "shirtVoor";
  var soort = tenueLaagSoort(l);
  if (soort === "vorm" && !tenueVorm(l.vorm)) l.vorm = "cirkel";
  l.x = tenueGetal(l.x, -20, 120, 50);
  l.y = tenueGetal(l.y, -20, 120, 50);
  /* Breedte en hoogte staan los van elkaar, zodat je een vorm ook
     kunt uitrekken. Een laag van vóór die splitsing heeft alleen een
     maat; die wordt dan allebei. */
  if (l.maat !== undefined && (laag || {}).breed === undefined) {
    l.breed = l.maat; l.hoog = l.maat;
  }
  l.breed = tenueGetal(l.breed, 4, 200, 40);
  l.hoog  = tenueGetal(l.hoog,  4, 200, 40);
  delete l.maat;
  l.lijnDik = tenueGetal(l.lijnDik, 0, 7, 0);
  if (!/^#[0-9a-fA-F]{6}$/.test(String(l.lijn))) l.lijn = "#000000";
  l.hoek = ((tenueGetal(l.hoek, -3600, 3600, 0) % 360) + 360) % 360;
  l.doorzicht = tenueGetal(l.doorzicht, 0.1, 1, 1);
  l.boog = tenueGetal(l.boog, -100, 100, 0);
  l.spiegel = !!l.spiegel; l.spiegelV = !!l.spiegelV;
  l.tekst = String(l.tekst == null ? "" : l.tekst).slice(0, 14);
  if (!TENUE_FONTS.some(function(f){ return f.id === l.font; })) l.font = "blok";
  if (!TENUE_BRONNEN.some(function(b){ return b.id === l.bron; })) l.bron = "";
  if (!l.id) l.id = "l" + Math.random().toString(36).slice(2, 9);
  return l;
}
/* Wat voor laag is dit: een vorm uit de bibliotheek, losse tekst, of
   een eigen afbeelding. */
function tenueLaagSoort(laag) {
  if (laag && laag.beeld) return "beeld";
  if (laag && (laag.vorm === "tekst" || laag.vorm === "cijfer")) return "tekst";
  return "vorm";
}
function tenueLagen(set, deelId) {
  var alles = ((set || {}).lagen || []).map(tenueLaagVernieuw);
  return alles.filter(function(l){ return l.deel === deelId; });
}
/* Waar een laag terechtkomt op het tenuevel. Een patroon vult het
   hele kledingstuk; al het andere staat als losse vorm op zijn plek. */
function tenueLaagPlaats(laag, stuk) {
  var l = tenueLaagVernieuw(laag);
  var vak = tenueVak(stuk);
  var v = tenueVorm(l.vorm);
  if (v && v.vul) {
    return {vullend:true,
            transform:"translate(" + vak.x + "," + vak.y + ") scale(" +
                      (vak.b / 100) + "," + (vak.h / 100) + ")"};
  }
  var cx = vak.x + l.x / 100 * vak.b;
  var cy = vak.y + l.y / 100 * vak.h;
  /* De kleinste kant van het vak is de maatstaf voor allebei: anders
     zou dezelfde vorm op de sok breder uitpakken dan op het shirt. */
  var eenheid = Math.min(vak.b, vak.h);
  var bb = l.breed / 100 * eenheid, hh = l.hoog / 100 * eenheid;
  var fx = bb / 100, fy = hh / 100;
  return {vullend:false, cx:cx, cy:cy, breed:bb, hoog:hh,
          kader:{x:cx - bb/2, y:cy - hh/2, b:bb, h:hh, hoek:l.hoek},
          transform:"translate(" + cx + "," + cy + ") rotate(" + l.hoek + ") scale(" +
                    (fx * (l.spiegel ? -1 : 1)) + "," + (fy * (l.spiegelV ? -1 : 1)) +
                    ") translate(-50,-50)"};
}
/* Het middelpunt en de halve maten van een laag op het tenuevel */
function tenueLaagMaat(laag, stuk) {
  var l = tenueLaagVernieuw(laag), vak = tenueVak(stuk);
  var eenheid = Math.min(vak.b, vak.h);
  return {vak:vak, eenheid:eenheid,
          cx: vak.x + l.x / 100 * vak.b,
          cy: vak.y + l.y / 100 * vak.h,
          hw: l.breed / 100 * eenheid / 2,
          hh: l.hoog  / 100 * eenheid / 2,
          hoek: l.hoek};
}
/* Hoe groot het kader en de handvatten op het tenuevel moeten zijn om
   op het scherm altijd even groot te blijven. Zonder deze omrekening
   groeien de bolletjes mee met de zoom, en dekken ze bij vierhonderd
   procent precies af waar je aan het werk bent.
   breedOpScherm is hoe breed de tekening in beeldpunten staat. */
const TENUE_GREEP_PX = 4.5;      /* straal van een zichtbaar bolletje */
const TENUE_RAAK_PX = 11;        /* onzichtbare rand eromheen, voor de muis */
const TENUE_KNOP_PX = 14;        /* hoe ver het draaiknopje boven de vorm hangt */
/* Een vingertop dekt ongeveer vierenveertig beeldpunten en een
   muispunt één. Op een aanraakscherm wordt de onzichtbare rand om een
   handvat daarom ruim twee keer zo breed, en het bolletje zelf iets
   groter zodat je ziet waar je moet zijn. Het bolletje groeit minder
   hard dan de rand: het mag je vorm niet gaan afdekken. */
const TENUE_RAAK_VINGER_PX = 21;
const TENUE_GREEP_VINGER_PX = 6.5;
function tenueKaderMaten(breedOpScherm, vinger) {
  var b = Number(breedOpScherm);
  var perPunt = (isFinite(b) && b > 0) ? TENUE_VEL.b / b : 1;
  return {perPunt: perPunt,
          greep: (vinger ? TENUE_GREEP_VINGER_PX : TENUE_GREEP_PX) * perPunt,
          raak: (vinger ? TENUE_RAAK_VINGER_PX : TENUE_RAAK_PX) * perPunt,
          knop: TENUE_KNOP_PX * perPunt,
          lijn: 1.6 * perPunt,
          dunneLijn: 0.7 * perPunt,
          streep: (4 * perPunt) + " " + (3 * perPunt)};
}
/* Waar het draaiknopje hangt: recht boven de vorm, meegedraaid. De
   afstand is in beeldpunten, zodat het knopje bij inzoomen niet
   wegvliegt. */
function tenueDraaiKnop(laag, stuk, breedOpScherm) {
  var m = tenueLaagMaat(laag, stuk);
  var afstand = m.hh + tenueKaderMaten(breedOpScherm).knop;
  var r = m.hoek * Math.PI / 180;
  return {x: m.cx + Math.sin(r) * afstand, y: m.cy - Math.cos(r) * afstand,
          vanX: m.cx + Math.sin(r) * m.hh,  vanY: m.cy - Math.cos(r) * m.hh};
}
/* Welke lagen meegaan naar een klein beeld, zoals de bol op het
   opstellingsveld of de poppetjes. Daar is een letter niet meer te
   lezen en wordt een eigen logo een vlek, dus daar blijven alleen de
   vlakken over. Eén lijst, zodat het veld en de gedeelde afbeelding
   niet elk iets anders laten zien. */
function tenueKleineLagen(set) {
  return tenueLagen(set, "shirtVoor").filter(function(l){
    return tenueLaagSoort(l) === "vorm";
  });
}

/* Ligt er een aanraakscherm onder? Dan moeten de handvatten groter:
   een muispunt is een punt, een vingertop dekt er ongeveer vierenveertig.
   Alleen gebruiken waar de maat in het rekenwerk zit; wat in CSS staat
   gaat via (pointer: coarse), want dat blijft ook kloppen als je een
   muis aansluit. */
function aanraakScherm() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
  return (typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 0);
}
/* ── Getalvelden die je leeg kunt maken ─────────────────────
   Een gewoon getalveld met value={getal} en Number(e.target.value)
   laat zich niet leegmaken: zodra je de laatste cijfer weghaalt is de
   waarde nul, en zet de app er meteen weer een 0 in. Met backspace
   gebeurt er dan schijnbaar niets.

   Dit veld houdt daarom vast wát je typt, ook als dat even niets is,
   en geeft pas een getal door zodra er iets staat. Bij het verlaten
   van het veld wordt er opgeruimd en teruggevallen op de echte
   waarde. */
function getalKlem(n, min, max) {
  var g = Number(n);
  if (!isFinite(g)) return null;
  if (min !== undefined && min !== null && g < Number(min)) g = Number(min);
  if (max !== undefined && max !== null && g > Number(max)) g = Number(max);
  return g;
}
/* Wat er moet gebeuren als iemand iets typt. Geeft terug wat er in
   het veld hoort te staan en welke waarde de app moet onthouden.
   Tijdens het typen wordt er niet geklemd: bij een minimum van tien
   zou "1" op weg naar "15" anders meteen naar 10 springen. */
function getalTyp(tekst, leeg) {
  var t = String(tekst === null || tekst === undefined ? "" : tekst);
  if (t === "" || t === "-") return {toon:t, waarde:leeg, leeg:true};
  var n = Number(t);
  if (!isFinite(n)) return {toon:t, waarde:leeg, leeg:true};
  return {toon:t, waarde:n, leeg:false};
}
/* En wat er gebeurt als je het veld verlaat: nu pas klemmen. */
function getalKlaar(tekst, leeg, min, max) {
  var g = getalTyp(tekst, leeg);
  if (g.leeg) return leeg;
  var k = getalKlem(g.waarde, min, max);
  return k === null ? leeg : k;
}
