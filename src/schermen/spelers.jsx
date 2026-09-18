/* ══════════════════════════════════════════════════════════════
   SPELERS/ONTWIKKELING — spelersbeheer, ontwikkeling, blessures,
   boetepot en het Dashboard
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P4 stap 5
   van docs/p4-stappenplan.md — "isolatie: middel, grootste van de drie
   nieuwe"). Geen import/export: tools/bouw.js plakt dit bestand
   (SCHERM_VOLGORDE) na gedeeld.jsx, onboarding.jsx, instellingen.jsx,
   statistieken.jsx en trainingen.jsx en vóór src/app.jsx aan elkaar,
   dus alles hieronder is nog altijd gewoon top-level function in
   dezelfde scope als src/app.jsx. Dit is een verhuizing, geen
   herschrijving: dezelfde tekst, dezelfde comments.

   VOETICOON KWAM VAN VER
   VoetIcoon stond fysiek in de opstellingen-zone van src/app.jsx
   (tussen de "SPELERPOPPETJE"- en "tenue als tekening"-blokken), maar
   wordt alleen door SpelerFormulier en SpelerProfiel hieronder gebruikt
   (favoriete voet) — zie docs/p4-stappenplan.md §1 stap 5 en §2. Hij is
   daarom hier mee naartoe verplaatst en staat aan het eind van dit
   bestand, net als AfwezigheidHint dat bij trainingen.jsx (P4 stap 4)
   deed.

   TWEE BEKENDE VERWEVENHEDEN (met naam genoemd in het stappenplan)
   1. SelectiePagina is zelf de tabbladhouder van Selectie: hij rendert
      niet alleen Spelers/Blessures/Boetepot (déze module) maar ook
      Opstellingen en Tactieken (OpstellingenTab/TactiekenTab, blijven
      in src/app.jsx tot stap 7). Dat werkt gewoon via gedeelde scope
      (hoisting) — geen aanpassing nodig, ook niet wanneer die twee in
      stap 7 op hun beurt verhuizen: de aanroep vanuit SelectiePagina
      (dan in dit bestand) naar src/schermen/opstellingen.jsx werkt via
      diezelfde gedeelde scope, om dezelfde reden.
   2. Dashboard is een van de acht SCHERMEN en wordt rechtstreeks
      aangeroepen vanuit renderPagina() in de schil (blijft in
      src/app.jsx): `case "dashboard": return <Dashboard navigeer=
      {gaNaar} />;`. Die aanroep blijft werken via gedeelde scope,
      precies zoals bij SelectiePagina (`case "selectie": return
      <SelectiePagina />;`) hierboven.

   BENEN/BEENINFO TOEGEVOEGD BIJ P4 STAP 7 (17 september 2026)
   BENEN (de const met "Rechts"/"Links"/"Beide") en zijn helper
   beenInfo() stonden, net als VoetIcoon hierboven, fysiek in de
   opstellingen-zone van src/app.jsx en werden — bij narekenen voor
   stap 5 al gevonden, niet met naam genoemd in het stappenplan —
   uitsluitend door componenten in déze module gebruikt (SpelerFormulier,
   SpelerProfiel, SpelersLijst). Bij stap 5 bewust niet meeverhuisd (zie
   de toelichting die daar stond: beenInfo() hoist en BENEN wordt pas in
   een renderfunctie gelezen, dus functioneel geen probleem, maar wel
   een bewuste keuze om de verplaatsing tot de met naam genoemde lijst
   te beperken). Bij het narekenen voor stap 7 bleek de opstellingen-
   module zelf ze nergens te gebruiken, dus zijn ze nu alsnog hierheen
   verplaatst — aan het eind van dit bestand, direct na VoetIcoon.

   TESTAANPASSING BIJ DEZE STAP
   Drie van de zeven testbestanden lazen componenten uit deze module
   rechtstreeks uit src/app.jsx en zijn aangepast naar een aparte, met
   naam genoemde bronlezing (src/schermen/spelers.jsx) — zelfde patroon
   als bij P4 stap 1 t/m 4: tests/pakket.test.js (de tabbalk van
   SelectiePagina, SpelerProfiel, het bestaan van OntwikkelingTab),
   tests/boetepot.test.js (de bedrading van BoetepotTab) en
   tests/opkomst.test.js (het opkomst-blokje in Dashboard).

   VANGNET
   "selectie", "dashboard", "selectie-ontwikkeling",
   "selectie-blessures" en "selectie-boetepot" in
   tools/gouden-origineel.js bewaken dit scherm rechtstreeks.
   "selectie-opstellingen" en "selectie-tactieken" bewaken hetzelfde
   Selectie-scherm maar horen bij stap 7 — die moeten door een zuivere
   verplaatsing als deze ongemoeid blijven.

   BIJGEWERKT BIJ P4 STAP 8 (18 september 2026) — TWEE VONDSTEN
   1. RapportTab hierboven roept WerkVenster aan (2x) — een generiek
      modaalvenster dat sinds stap 8 in src/schermen/wedstrijden.jsx
      staat (5x gebruikt binnen WedstrijdDetail, dus qua verhouding
      hoort hij daar). Niet eerder gemeld in het stappenplan. Werkt
      gewoon via gedeelde scope (hoisting): wedstrijden.jsx laadt ná dit
      bestand, maar de aanroep vanuit RapportTab gebeurt pas bij het
      renderen, ruim ná het laden van alle scripts.
   2. vandaagISO is bij diezelfde stap hierheen verplaatst (staat nu aan
      het eind van dit bestand, bij BENEN/beenInfo). Hij stond sinds P4
      stap 3/4 nog in src/app.jsx met het label "statistieken-
      achterstand", maar bleek bij narekenen helemaal niet door
      statistieken.jsx gebruikt te worden — zijn enige echte gebruikers
      zijn componenten in déze module (AfwezigheidFormulier,
      ReviewFormulier, Dashboard e.a.) en src/domein/opkomst.js, dat
      hem al sinds stap 4 over de bestandsgrens heen aanroept (blijft
      werken, zelfde principe: function-declaraties hoisten).

   Zie docs/p4-stappenplan.md §1 (stap 5) en §3 voor de volledige
   redenering. */

/* ═══════════════════════════════════════════════════════════
   SPELER FORMULIER
═══════════════════════════════════════════════════════════ */
function StatInvoer({ icoon, label, waarde, onChange }) {
  return (
    <div className="stat-invoer">
      <span className="stat-invoer-icoon">{icoon}</span>
      <span className="stat-invoer-label">{label}</span>
      <div className="stat-invoer-getal">
        <button onClick={()=>onChange(Math.max(0,waarde-1))}>−</button>
        <span>{waarde}</span>
        <button onClick={()=>onChange(waarde+1)}>+</button>
      </div>
    </div>
  );
}

function SpelerFormulier({ speler, onOpslaan, onSluiten }) {
  const [form,setForm]=useState({...LEEG_SPELER,...speler,stats:{...LEEG_SPELER.stats,...(speler?.stats||{})}});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setStat = (k,v) => setForm(f=>({...f,stats:{...f.stats,[k]:v}}));

  /* De foto ging hier ongewijzigd de opslag in: vijf megabyte tekst voor
     een plaatje van veertig pixels op het scherm. Twee spelers en de
     browser zat vol — en dan weigert hij stilletjes alles wat je daarna
     invoert. Nu wordt hij eerst verkleind. */
  function verwerkFoto(e) {
    var b = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!b) return;
    verkleinAfbeelding(b, {max: FOTO_MAX_PX}, function (err, uit) {
      if (err) { meldFout(err); return; }
      set("foto", uit);
    });
  }

  function opslaan() {
    if(!form.naam.trim()){meldFout("Vul een naam in.");return;}
    onOpslaan({...form,id:form.id||Date.now()});
  }

  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Speler bewerken":"Speler toevoegen"}</div>
        <div style={{display:"flex",justifyContent:"center"}}>
          <div className="foto-upload-gebied">
            {form.foto?<img src={form.foto} alt="foto"/>:<><div className="foto-upload-icoon"><i className="fa-solid fa-camera"/></div><div className="foto-upload-tekst">Foto</div></>}
            <input type="file" accept="image/*" onChange={verwerkFoto} />
          </div>
        </div>
        <div className="formulier-sectie-titel"><i className="fa-solid fa-user"/> Persoonlijke gegevens</div>
        <div className="formulier-groep"><label className="formulier-label">Volledige naam *</label><input className="formulier-input" value={form.naam} onChange={e=>set("naam",e.target.value)} placeholder="Voor- en achternaam" /></div>
        <div className="formulier-rij">
          <div className="formulier-groep"><label className="formulier-label">Rugnummer</label><GetalVeld className="formulier-input" min={1} max={99} leeg={""} waarde={form.rugnummer} opWaarde={function(n){set("rugnummer",n);}} placeholder="1–99" /></div>
          <div className="formulier-groep"><label className="formulier-label">Positie</label><select className="formulier-input" value={form.positie} onChange={e=>set("positie",e.target.value)}><option value="">Kies positie</option><option>Keeper</option><option>Verdediger</option><option>Middenvelder</option><option>Aanvaller</option></select></div>
        </div>
        <div className="formulier-rij">
          <div className="formulier-groep"><label className="formulier-label">Geboortedatum</label><input className="formulier-input" type="date" value={form.geboortedatum} onChange={e=>set("geboortedatum",e.target.value)} /></div>
          <div className="formulier-groep">
            <label className="formulier-label">Extra positie</label>
            <select className="formulier-input" value={form.positie2||""}
              onChange={function(e){ set("positie2", e.target.value); }}>
              <option value="">Geen</option>
              {ROL_VOLGORDE.filter(function(p){ return p!==form.positie; })
                .map(function(p){ return <option key={p} value={p}>{p}</option>; })}
            </select>
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Favoriet been</label>
            <div className="been-keuze">
              {BENEN.map(function(b){
                var aan = form.favorietBeen===b.id;
                return (
                  <button key={b.id} type="button" className={"been-knop"+(aan?" actief":"")}
                    onClick={function(){ set("favorietBeen", aan ? "" : b.id); }}>
                    <span className="been-voeten">
                      {b.kant==="beide"
                        ? <><VoetIcoon kant="links" grootte={17}/><VoetIcoon kant="rechts" grootte={17}/></>
                        : <VoetIcoon kant={b.kant} grootte={19}/>}
                    </span>
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="formulier-sectie-titel"><i className="fa-solid fa-address-book"/> Contactgegevens</div>
        <div className="formulier-groep"><label className="formulier-label">Telefoon</label><input className="formulier-input" type="tel" value={form.telefoon} onChange={e=>set("telefoon",e.target.value)} placeholder="+31 6 12345678" /></div>
        <div className="formulier-groep"><label className="formulier-label">E-mail</label><input className="formulier-input" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="naam@email.nl" /></div>
        <div className="formulier-groep"><label className="formulier-label">Adres</label><input className="formulier-input" value={form.adres} onChange={e=>set("adres",e.target.value)} placeholder="Straat en huisnummer" /></div>
        <div className="formulier-groep"><label className="formulier-label">Land</label><input className="formulier-input" value={form.land} onChange={e=>set("land",e.target.value)} placeholder="Nederland" /></div>
        <div className="formulier-sectie-titel"><i className="fa-solid fa-heart-pulse"/> Beschikbaarheid</div>
        <div className="besch-keuze" style={{marginBottom:10}}>
          {BESCHIKBAARHEID.map(function(b){
            var actief = (form.beschikbaar||"fit")===b.id;
            return (
              <button key={b.id} className="besch-optie"
                style={{borderColor:actief?b.kleur:"var(--grijs)",background:actief?b.kleur:"var(--wit)",color:actief?"#fff":"var(--grijs-donker)"}}
                onClick={function(){set("beschikbaar",b.id);}}>
                <i className={b.icoon} style={{fontSize:15}}/>
                <span>{b.label}</span>
              </button>
            );
          })}
        </div>
        {(form.beschikbaar&&form.beschikbaar!=="fit") && (
          <div className="formulier-groep">
            <label className="formulier-label">Toelichting</label>
            <input className="formulier-input" value={form.beschikbaarNotitie||""}
              onChange={function(e){set("beschikbaarNotitie",e.target.value);}}
              placeholder="bijv. enkelblessure, terug over 2 weken" />
          </div>
        )}
        <div className="formulier-sectie-titel"><i className="fa-solid fa-chart-simple"/> Vaardigheden</div>
        <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,marginBottom:10,lineHeight:1.45}}>
          Schaal 1 tot 99, zoals in FC. Laat staan wat je nog niet kunt beoordelen; alleen wat je
          aanraakt telt mee. Het getal rechts van een categorie is het gemiddelde daarvan.
          {form.positie==="Keeper" ? " Voor keepers zie je de keeperswaarden." : ""}
        </p>
        {fcCategorieen(form).map(function(cat){
          var catW = fcCategorieWaarde(form, cat);
          return (
            <div key={cat.id} className="fc-cat">
              <div className="fc-cat-kop">
                <span className="fc-cat-streep" style={{background:cat.kleur}}/>
                <span className="fc-cat-naam">{cat.label}</span>
                <span className="fc-cat-ovr" style={{color: catW ? ovrKleur(catW) : "var(--grijs-donker)"}}>
                  {catW || "–"}
                </span>
              </div>
              {cat.attrs.map(function(a){
                var v = fcWaarde(form, a.id);
                return (
                  <div key={a.id} className="fc-rij">
                    <span className="fc-rij-naam">{a.label}</span>
                    <input type="range" min="1" max="99" step="1" className="fc-schuif"
                      value={v===null ? 50 : v}
                      style={{accentColor: v===null ? "var(--grijs-donker)" : ovrKleur(v)}}
                      onChange={function(e){
                        var w = Number(e.target.value);
                        setForm(function(f){
                          var ns = Object.assign({}, f.skills||{});
                          ns[a.id] = w;
                          return Object.assign({}, f, {skills:ns});
                        });
                      }} />
                    <span className="fc-rij-waarde" style={{color: v===null ? "var(--grijs-donker)" : ovrKleur(v)}}>
                      {v===null ? "–" : v}
                    </span>
                    <button type="button" className="fc-wis" title={v===null?"Nog niet beoordeeld":"Wissen"}
                      disabled={v===null}
                      onClick={function(){
                        setForm(function(f){
                          var ns = Object.assign({}, f.skills||{});
                          delete ns[a.id];
                          return Object.assign({}, f, {skills:ns});
                        });
                      }}>
                      <i className="fa-solid fa-xmark"/>
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Sterbeoordelingen */}
        {FC_STERREN.map(function(s){
          var v = fcSterren(form, s.id);
          return (
            <div key={s.id} className="fc-ster-rij">
              <span className="fc-rij-naam" title={s.uitleg}>{s.label}</span>
              <span className="fc-sterren">
                {[1,2,3,4,5].map(function(n){
                  return (
                    <button key={n} type="button"
                      className={"fc-ster"+(v && n<=v ? " aan" : "")}
                      title={n+" van 5"}
                      onClick={function(){
                        setForm(function(f){
                          var nz = Object.assign({}, f.sterren||{});
                          if (nz[s.id]===n) delete nz[s.id]; else nz[s.id]=n;
                          return Object.assign({}, f, {sterren:nz});
                        });
                      }}>
                      <i className="fa-solid fa-star"/>
                    </button>
                  );
                })}
              </span>
              <span className="fc-rij-waarde">{v===null ? "–" : v}</span>
            </div>
          );
        })}

        <div className="formulier-sectie-titel"><i className="fa-solid fa-chart-bar"/> Beginstand</div>
        <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,marginBottom:10,lineHeight:1.45}}>
          Alleen invullen voor wat al gebeurd is v&oacute;&oacute;r je deze app ging gebruiken. Alles daarna wordt automatisch bij wedstrijden opgeteld.
        </p>
        <div className="stats-invoer-raster">
          <StatInvoer icoon="⚽" label="Doelpunten"  waarde={form.stats.doelpunten}   onChange={v=>setStat("doelpunten",v)} />
          <StatInvoer icoon="🎯" label="Assists"     waarde={form.stats.assists}      onChange={v=>setStat("assists",v)} />
          <StatInvoer icoon="🟨" label="Geel"        waarde={form.stats.geelKaarten}  onChange={v=>setStat("geelKaarten",v)} />
          <StatInvoer icoon="🟥" label="Rood"        waarde={form.stats.roodKaarten}  onChange={v=>setStat("roodKaarten",v)} />
          <StatInvoer icoon="⏱" label="Minuten"     waarde={form.stats.speelMinuten} onChange={v=>setStat("speelMinuten",v)} />
          <StatInvoer icoon="🏟" label="Wedstrijden" waarde={form.stats.wedstrijden}  onChange={v=>setStat("wedstrijden",v)} />
        </div>
        <div style={{display:"flex",gap:10,marginTop:24}}>
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={opslaan}><i className="fa-solid fa-check"/> Opslaan</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPELER PROFIEL
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   RAPPORTTAB — begin, tussen en eind naast elkaar
═══════════════════════════════════════════════════════════ */
function RapportTab({ speler, onOpslaan }) {
  const [seizoen, setSeizoen] = useState(function(){ return inst().seizoen || "2026/27"; });
  const [bewerk, setBewerk] = useState(null);      // {soort, tekst, bestaand}
  const [wisOpen, setWisOpen] = useState(null);

  const alle = speler.rapporten || [];
  /* Alle seizoenen waarvan al iets bestaat, plus het huidige */
  const seizoenen = alle.map(function(r){ return r.seizoen; })
    .filter(function(s,i,a){ return s && a.indexOf(s)===i; });
  if (seizoenen.indexOf(seizoen) < 0) seizoenen.push(seizoen);
  seizoenen.sort().reverse();

  const dezeSeizoen = RAPPORT_SOORTEN.map(function(rs){
    return {soort: rs, rapport: rapportVan(speler, seizoen, rs.id)};
  });
  const ingevuld = dezeSeizoen.filter(function(x){ return x.rapport; });
  const eerste = ingevuld.length ? ingevuld[0].rapport : null;
  const laatste = ingevuld.length ? ingevuld[ingevuld.length-1].rapport : null;
  const verschil = (ingevuld.length>1) ? rapportVerschil(eerste, laatste) : [];

  function bewaar() {
    var nieuw = maakRapport(speler, seizoen, bewerk.soort, bewerk.tekst);
    if (bewerk.bestaand) {
      /* Bij bijwerken de oorspronkelijke datum en id behouden */
      nieuw.id = bewerk.bestaand.id;
      nieuw.datum = bewerk.bestaand.datum;
    }
    var rest = alle.filter(function(r){
      return !(r.seizoen===seizoen && r.soort===bewerk.soort);
    });
    onOpslaan(Object.assign({}, speler, {rapporten: rest.concat([nieuw])}));
    setBewerk(null);
    meldGoed(rapportSoort(bewerk.soort).label+" vastgelegd");
  }

  function wis(r) {
    var vorige = alle;
    onOpslaan(Object.assign({}, speler, {rapporten: alle.filter(function(x){ return x.id!==r.id; })}));
    setWisOpen(null);
    toon(rapportSoort(r.soort).label+" verwijderd", {
      actieLabel:"Ongedaan",
      actie:function(){ onOpslaan(Object.assign({}, speler, {rapporten: vorige})); }
    });
  }

  const nuOvr = fcOvr(speler);

  return (
    <div>
      <div className="kaart">
        <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span><i className="fa-solid fa-file-lines"/> Rapporten</span>
          <select className="formulier-input" style={{width:130,marginBottom:0,fontSize:12,padding:"6px 8px"}}
            value={seizoen} onChange={function(e){ setSeizoen(e.target.value); }}>
            {seizoenen.map(function(s){ return <option key={s} value={s}>{s}</option>; })}
          </select>
        </div>

        {!heeftSkills(speler) && (
          <div className="rap-melding">
            <i className="fa-solid fa-circle-info"/> Beoordeel eerst zijn skills bij Bewerken.
            Een rapport legt die waarden vast zoals ze op dat moment zijn.
          </div>
        )}

        <div className="rap-raster">
          {dezeSeizoen.map(function(x){
            var r = x.rapport;
            return (
              <div key={x.soort.id} className={"rap-kaart"+(r?" gevuld":"")}>
                <div className="rap-kop">
                  <span className="rap-icoon" style={{background:x.soort.kleur}}>
                    <i className={x.soort.icoon}/>
                  </span>
                  <span style={{flex:1,minWidth:0}}>
                    <span className="rap-naam">{x.soort.label}</span>
                    <span className="rap-datum">{r ? formateerDatumKort(r.datum) : "nog niet gemaakt"}</span>
                  </span>
                  {r && <span className="rap-ovr" style={{color:ovrKleur(r.ovr)}}>{r.ovr||"–"}</span>}
                </div>

                {r ? (
                  <>
                    {r.tekst && <div className="rap-tekst">{r.tekst}</div>}
                    <div className="rap-knoppen">
                      <button className="knop lijn klein" style={{flex:1,justifyContent:"center",padding:"5px 8px",fontSize:11}}
                        onClick={function(){ setBewerk({soort:x.soort.id, tekst:r.tekst||"", bestaand:r}); }}>
                        <i className="fa-solid fa-pen"/> Bijwerken
                      </button>
                      <button className="knop gevaar klein" style={{padding:"5px 9px"}}
                        onClick={function(){ setWisOpen(r); }}>
                        <i className="fa-solid fa-trash"/>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rap-leeg">{x.soort.uitleg}</div>
                    <button className="knop lijn klein" style={{width:"100%",justifyContent:"center",padding:"6px 8px",fontSize:11}}
                      onClick={function(){ setBewerk({soort:x.soort.id, tekst:"", bestaand:null}); }}>
                      <i className="fa-solid fa-plus"/> Vastleggen{nuOvr ? " ("+nuOvr+")" : ""}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Groei tussen het eerste en het laatste rapport */}
      {verschil.length>0 && (
        <div className="kaart">
          <div className="kaart-titel">
            <i className="fa-solid fa-arrow-trend-up"/> Groei
            <span style={{marginLeft:8,fontSize:11,fontWeight:400,color:"var(--grijs-donker)",textTransform:"none",letterSpacing:0}}>
              {rapportSoort(eerste.soort).kort+" naar "+rapportSoort(laatste.soort).kort}
            </span>
          </div>
          <table className="groei-tabel">
            <thead>
              <tr>
                <th>Onderdeel</th>
                <th>{rapportSoort(eerste.soort).kort}</th>
                <th>{rapportSoort(laatste.soort).kort}</th>
                <th>Groei</th>
              </tr>
            </thead>
            <tbody>
              {verschil.map(function(v){
                return (
                  <tr key={v.cat.id}>
                    <td>
                      <span className="fc-cat-streep" style={{background:v.cat.kleur,display:"inline-block",verticalAlign:"-3px",marginRight:8}}/>
                      {v.cat.label}
                    </td>
                    <td className="g-getal" style={{color: v.van!==null?ovrKleur(v.van):"var(--grijs-donker)"}}>{v.van===null?"–":v.van}</td>
                    <td className="g-getal" style={{color: v.tot!==null?ovrKleur(v.tot):"var(--grijs-donker)"}}>{v.tot===null?"–":v.tot}</td>
                    <td className="g-groei">
                      {v.groei===null ? <span className="k-leeg">–</span>
                        : v.groei>0 ? <span style={{color:"var(--succes)"}}><i className="fa-solid fa-caret-up"/> +{v.groei}</span>
                        : v.groei<0 ? <span style={{color:"var(--gevaar)"}}><i className="fa-solid fa-caret-down"/> {v.groei}</span>
                        : <span className="k-leeg">0</span>}
                    </td>
                  </tr>
                );
              })}
              <tr className="groei-totaal">
                <td>Eindcijfer</td>
                <td className="g-getal" style={{color:ovrKleur(eerste.ovr)}}>{eerste.ovr||"–"}</td>
                <td className="g-getal" style={{color:ovrKleur(laatste.ovr)}}>{laatste.ovr||"–"}</td>
                <td className="g-groei">
                  {(eerste.ovr && laatste.ovr) ? (
                    laatste.ovr-eerste.ovr>0
                      ? <span style={{color:"var(--succes)"}}><i className="fa-solid fa-caret-up"/> +{laatste.ovr-eerste.ovr}</span>
                      : laatste.ovr-eerste.ovr<0
                        ? <span style={{color:"var(--gevaar)"}}><i className="fa-solid fa-caret-down"/> {laatste.ovr-eerste.ovr}</span>
                        : <span className="k-leeg">0</span>
                  ) : <span className="k-leeg">–</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Invulvenster */}
      {bewerk && (
        <WerkVenster titel={rapportSoort(bewerk.soort).label}
          subtitel={speler.naam+" · seizoen "+seizoen}
          eigenVoet onSluiten={function(){ setBewerk(null); }}>
          <div className="kaart">
            <div className="rap-melding">
              <i className="fa-solid fa-camera"/> De skills worden vastgelegd zoals ze nu zijn
              {nuOvr ? " (eindcijfer "+nuOvr+")" : ""}. Pas ze eerst aan bij Bewerken als dat nodig is.
            </div>
            <div className="formulier-groep">
              <label className="formulier-label">{rapportSoort(bewerk.soort).uitleg}</label>
              <textarea className="formulier-input" rows="8" value={bewerk.tekst}
                autoFocus placeholder="Wat gaat goed, wat kan beter, welke afspraken maken jullie?"
                style={{resize:"vertical"}}
                onChange={function(e){
                  var w = e.target.value;
                  setBewerk(function(b){ return Object.assign({}, b, {tekst:w}); });
                }} />
            </div>
            <div className="venster-voet venster-voet-plakt">
              <button className="knop lijn" style={{flex:1,justifyContent:"center"}}
                onClick={function(){ setBewerk(null); }}>Annuleren</button>
              <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={bewaar}>
                <i className="fa-solid fa-check"/> Rapport vastleggen
              </button>
            </div>
          </div>
        </WerkVenster>
      )}

      {wisOpen && (
        <div className="bevestig-overlay" onClick={function(e){ if(e.target===e.currentTarget) setWisOpen(null); }}>
          <div className="bevestig-kaart">
            <h3>{rapportSoort(wisOpen.soort).label} verwijderen?</h3>
            <p style={{marginBottom:14}}>De vastgelegde skills van dit moment gaan er ook uit.</p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){ setWisOpen(null); }}>Annuleren</button>
              <button className="knop gevaar" onClick={function(){ wis(wisOpen); }}>Verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpelerProfiel({ speler, onTerug, onBewerken, onVerwijderen, onOpslaanSpeler }) {
  const [bevestig,setBevestig]=useState(false);
  const [tab,setTab]=useState("profiel");
  const leeftijd=leeftijdUitDatum(speler.geboortedatum);
  const alleWedstrijden = laadWedstrijden();
  const st = berekenSpelerStats(speler.id, alleWedstrijden, speler.stats);
  const besch = beschikbaarheidInfo(speler.beschikbaar);
  const motmAantal = telMotm(speler.id, alleWedstrijden);
  const cijfer = gemiddeldCijfer(speler.id, alleWedstrijden);
  return (
    <div className="pagina-slide">
      <button className="back-knop" onClick={onTerug}><i className="fa-solid fa-arrow-left"/> Terug naar spelers</button>
      <div className="profiel-banner">
        <div className="profiel-foto">{<SpelerBeeld speler={speler}/>}</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="profiel-naam">{speler.naam}</div>
          <div className="profiel-sub">{speler.positie&&<span style={{marginRight:6}}>{speler.positie}</span>}{leeftijd&&<span>{leeftijd} jaar</span>}</div>
        </div>
        {speler.rugnummer&&<div className="profiel-nr-badge">#{speler.rugnummer}</div>}
      </div>
      {speler.beschikbaar&&speler.beschikbaar!=="fit"&&(
        <div className="kaart" style={{borderLeft:"4px solid "+besch.kleur,display:"flex",alignItems:"center",gap:11}}>
          <i className={besch.icoon} style={{fontSize:20,color:besch.kleur}}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:besch.kleur,fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>{besch.label}</div>
            {speler.beschikbaarNotitie&&<div style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,marginTop:2}}>{speler.beschikbaarNotitie}</div>}
          </div>
        </div>
      )}
      <div className="tabs">
        <button className={"tab-knop"+(tab==="profiel"?" actief":"")} onClick={function(){setTab("profiel");}}>
          <i className="fa-solid fa-id-card"/>{" Profiel"}
        </button>
        {/* Ontwikkeling is geen scherm maar een tabblad, dus magPagina
            kan er niets over zeggen — PAGINA_MODULE gaat over
            schermen. De vraag wordt hier dus rechtstreeks aan
            magModule gesteld.

            Het tabblad blijft staan, ook als het niet mag. Wie het
            nooit ziet, weet niet dat er beoordelingen, doelen en
            rapporten bestaan en gaat er dus ook nooit voor betalen.
            Free ziet zo de spelerslijst én het profiel — naam,
            rugnummer, Man of the Match, statistieken — en alleen wat
            daarachter zit zit achter het slotje. */}
        <button className={"tab-knop"+(tab==="ontwikkeling"?" actief":"")}
          aria-label={magModule("ontwikkeling")?undefined:slotLabel("Ontwikkeling", "ontwikkeling")}
          onClick={function(){
            if (!magModule("ontwikkeling")) { slotMelding("ontwikkeling"); return; }
            setTab("ontwikkeling");
          }}>
          <i className="fa-solid fa-seedling"/>{" Ontwikkeling"}
          {!magModule("ontwikkeling") && <SlotJe />}
        </button>
      </div>

      {/* Ook hier nog een keer: zou het pakket wijzigen terwijl dit
          tabblad openstaat, dan hoort de inhoud mee te verdwijnen. */}
      {tab==="ontwikkeling" && magModule("ontwikkeling") && <OntwikkelingTab speler={speler} />}

      {tab==="profiel" && (motmAantal>0||cijfer)&&(
        <div className="stat-raster" style={{marginBottom:12}}>
          <div className="stat-pill"><div className="stat-pill-getal" style={{color:"var(--goud)"}}>{motmAantal}</div><div className="stat-pill-label">Man of the Match</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{cijfer||"–"}</div><div className="stat-pill-label">Gem. cijfer</div></div>
        </div>
      )}
      {tab==="profiel" && <div className="stat-mini-raster">
        <div className="stat-mini"><div className="stat-mini-getal">{st.doelpunten}</div><div className="stat-mini-label">Doelpunten</div></div>
        <div className="stat-mini"><div className="stat-mini-getal">{st.assists}</div><div className="stat-mini-label">Assists</div></div>
        <div className="stat-mini"><div className="stat-mini-getal">{st.wedstrijden}</div><div className="stat-mini-label">Wedstrijden</div></div>
        <div className="stat-mini"><div className="stat-mini-getal">{st.geelKaarten}</div><div className="stat-mini-label">Geel</div></div>
        <div className="stat-mini"><div className="stat-mini-getal">{st.roodKaarten}</div><div className="stat-mini-label">Rood</div></div>
        <div className="stat-mini"><div className="stat-mini-getal">{st.speelMinuten}</div><div className="stat-mini-label">Minuten</div></div>
      </div>}
      {tab==="profiel" && <div className="kaart">
        <div className="kaart-titel">Persoonlijke gegevens</div>
        {speler.geboortedatum&&<div className="info-rij"><span className="info-icoon"><i className="fa-solid fa-cake-candles"/></span><div><div className="info-label">Geboortedatum</div><div className="info-waarde">{formateerDatum(speler.geboortedatum)}{leeftijd?` (${leeftijd} jaar)`:""}</div></div></div>}
        {beenInfo(speler.favorietBeen)&&(
          <div className="info-rij">
            <span className="info-icoon">
              {beenInfo(speler.favorietBeen).kant==="beide"
                ? <VoetIcoon kant="rechts" grootte={15}/>
                : <VoetIcoon kant={beenInfo(speler.favorietBeen).kant} grootte={15}/>}
            </span>
            <div><div className="info-label">Favoriet been</div><div className="info-waarde">{speler.favorietBeen}</div></div>
          </div>
        )}
        {speler.positie&&<div className="info-rij"><span className="info-icoon"><i className="fa-solid fa-location-dot"/></span><div><div className="info-label">Positie</div><div className="info-waarde">{speler.positie}</div></div></div>}
        {speler.land&&<div className="info-rij"><span className="info-icoon"><i className="fa-solid fa-globe"/></span><div><div className="info-label">Land</div><div className="info-waarde">{speler.land}</div></div></div>}
        {speler.adres&&<div className="info-rij"><span className="info-icoon"><i className="fa-solid fa-location-dot"/></span><div><div className="info-label">Adres</div><div className="info-waarde">{speler.adres}</div></div></div>}
      </div>}
      {tab==="profiel" && (speler.telefoon||speler.email)&&<div className="kaart"><div className="kaart-titel">Contact</div>
        {speler.telefoon&&<div className="info-rij"><span className="info-icoon"><i className="fa-solid fa-phone"/></span><div><div className="info-label">Telefoon</div><a href={`tel:${speler.telefoon}`}><div className="info-waarde" style={{color:"var(--blauw)"}}>{speler.telefoon}</div></a></div></div>}
        {speler.email&&<div className="info-rij"><span className="info-icoon"><i className="fa-solid fa-envelope"/></span><div><div className="info-label">E-mail</div><a href={`mailto:${speler.email}`}><div className="info-waarde" style={{color:"var(--blauw)"}}>{speler.email}</div></a></div></div>}
      </div>}
      <div style={{display:"flex",gap:10,marginTop:4}}>
        <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onBewerken}><i className="fa-solid fa-pen"/> Bewerken</button>
        <button className="knop gevaar klein" onClick={()=>setBevestig(true)}><i className="fa-solid fa-trash"/></button>
      </div>
      {bevestig&&<div className="bevestig-overlay"><div className="bevestig-kaart"><h3>Speler verwijderen?</h3><p>{speler.naam} wordt definitief verwijderd.</p><div className="bevestig-knoppen"><button className="knop lijn" onClick={()=>setBevestig(false)}>Annuleren</button><button className="knop gevaar" onClick={onVerwijderen}>Verwijderen</button></div></div></div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPELERONTWIKKELING
═══════════════════════════════════════════════════════════ */
function DoelFormulier({ doel, spelerId, onOpslaan, onSluiten }) {
  const [form, setForm] = useState(Object.assign({}, LEEG_DOEL, {spelerId:spelerId}, doel||{}));
  const set = (k,v) => setForm(function(f){ var n=Object.assign({},f); n[k]=v; return n; });
  function opslaan() {
    if (!form.titel.trim()) { meldFout("Geef het doel een korte titel."); return; }
    onOpslaan(Object.assign({}, form, {id: form.id||Date.now(), aangemaakt: form.aangemaakt||Date.now()}));
  }
  return (
    <div className="modal-overlay" style={{zIndex:400}} onClick={function(e){if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Doel bewerken":"Nieuw ontwikkeldoel"}</div>

        <div className="formulier-groep">
          <label className="formulier-label">Doel *</label>
          <input className="formulier-input" value={form.titel} onChange={function(e){set("titel",e.target.value);}}
            placeholder="bijv. Met links kunnen afronden" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Thema</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {DOEL_THEMAS.map(function(t){
              var aan = form.thema===t;
              return (
                <button key={t} onClick={function(){set("thema",t);}}
                  style={{padding:"7px 13px",borderRadius:9,border:"2px solid",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Helvetica Neue',Arial",
                    borderColor:aan?"var(--blauw)":"var(--grijs)",background:aan?"var(--blauw)":"var(--wit)",
                    color:aan?"var(--wit)":"var(--grijs-donker)"}}>{t}</button>
              );
            })}
          </div>
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Waarom dit doel?</label>
          <textarea className="formulier-input" rows="2" value={form.omschrijving}
            onChange={function(e){set("omschrijving",e.target.value);}} style={{resize:"vertical"}}
            placeholder="Wat viel op, en wat moet er beter?" />
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Waaraan zie je dat het lukt?</label>
          <textarea className="formulier-input" rows="2" value={form.meetbaar}
            onChange={function(e){set("meetbaar",e.target.value);}} style={{resize:"vertical"}}
            placeholder="bijv. 3 wedstrijden op rij een doelpunt of assist met links" />
        </div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Streefdatum</label>
            <input className="formulier-input" type="date" value={form.streefdatum}
              onChange={function(e){set("streefdatum",e.target.value);}} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">{"Voortgang: "+form.voortgang+"%"}</label>
            <input type="range" min="0" max="100" step="10" value={form.voortgang}
              style={{width:"100%",accentColor:"var(--blauw)"}}
              onChange={function(e){set("voortgang",Number(e.target.value));}} />
          </div>
        </div>

        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={opslaan}><i className="fa-solid fa-check"/> Opslaan</button>
        </div>
      </div>
    </div>
  );
}

function ReviewFormulier({ review, spelerId, wedstrijden, onOpslaan, onSluiten }) {
  const vandaag = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState(Object.assign({}, LEEG_REVIEW, {spelerId:spelerId, datum:vandaag}, review||{}));
  const set = (k,v) => setForm(function(f){ var n=Object.assign({},f); n[k]=v; return n; });
  const gespeeld = (wedstrijden||[]).filter(function(w){return w.status==="gespeeld";})
    .sort(function(a,b){ return new Date(b.datum)-new Date(a.datum); });
  function opslaan() {
    if (!form.sterk.trim() && !form.beter.trim()) { meldFout("Vul minstens één punt in."); return; }
    onOpslaan(Object.assign({}, form, {id: form.id||Date.now()}));
  }
  return (
    <div className="modal-overlay" style={{zIndex:400}} onClick={function(e){if(e.target===e.currentTarget)onSluiten();}}>
      <div className="modal-sheet">
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Review bewerken":"Nieuwe review"}</div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Datum</label>
            <input className="formulier-input" type="date" value={form.datum}
              onChange={function(e){set("datum",e.target.value);}} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Cijfer (optioneel)</label>
            <GetalVeld className="formulier-input" min={1} max={10} step="0.5" leeg={null}
              waarde={form.cijfer || ""} opWaarde={function(x){ set("cijfer", x); }} placeholder="1–10" />
          </div>
        </div>

        {gespeeld.length>0 && (
          <div className="formulier-groep">
            <label className="formulier-label">Bij welke wedstrijd? (optioneel)</label>
            <select className="formulier-input" value={form.wedstrijdId||""}
              onChange={function(e){set("wedstrijdId", e.target.value||null);}}>
              <option value="">Niet aan een wedstrijd gekoppeld</option>
              {gespeeld.slice(0,20).map(function(w){
                return <option key={w.id} value={w.id}>{formateerDatumKort(w.datum)+" – "+w.tegenstander}</option>;
              })}
            </select>
          </div>
        )}

        <div className="formulier-groep">
          <label className="formulier-label" style={{color:"var(--succes)"}}>Wat ging goed?</label>
          <textarea className="formulier-input" rows="3" value={form.sterk}
            onChange={function(e){set("sterk",e.target.value);}} style={{resize:"vertical"}}
            placeholder="Sterke punten deze periode…" />
        </div>
        <div className="formulier-groep">
          <label className="formulier-label" style={{color:"var(--oranje)"}}>Wat kan beter?</label>
          <textarea className="formulier-input" rows="3" value={form.beter}
            onChange={function(e){set("beter",e.target.value);}} style={{resize:"vertical"}}
            placeholder="Aandachtspunten…" />
        </div>
        <div className="formulier-groep">
          <label className="formulier-label" style={{color:"var(--blauw)"}}>Afspraak</label>
          <textarea className="formulier-input" rows="2" value={form.afspraak}
            onChange={function(e){set("afspraak",e.target.value);}} style={{resize:"vertical"}}
            placeholder="Waar gaan jullie samen aan werken?" />
        </div>

        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}>Annuleren</button>
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={opslaan}><i className="fa-solid fa-check"/> Opslaan</button>
        </div>
      </div>
    </div>
  );
}

function OntwikkelingTab({ speler }) {
  const [doelen, setDoelen] = useState(laadDoelen);
  const [reviews, setReviews] = useState(laadReviews);
  const [doelForm, setDoelForm] = useState(null);
  const [reviewForm, setReviewForm] = useState(null);
  const [subtab, setSubtab] = useState("profiel");

  useEffect(function(){ slaJson(DOELEN_KEY, doelen); },[doelen]);
  useEffect(function(){ slaJson(REVIEWS_KEY, reviews); },[reviews]);

  const wedstrijden = laadWedstrijden();
  const eigenDoelen = doelenVanSpeler(speler.id, doelen);
  const eigenReviews = reviewsVanSpeler(speler.id, reviews);
  const score = ontwikkelingsScore(speler.id, doelen);
  const behaald = telBehaald(speler.id, doelen);
  const trainingen = laadTrainingen();
  const afwezigheden = laadAfwezigheden();
  const inzichten = spelerInzichten(speler, wedstrijden, trainingen, doelen, reviews, afwezigheden);
  const deelname = deelnameVanSpeler(speler.id, wedstrijden);
  const cijfer = gemiddeldCijfer(speler.id, wedstrijden);
  const motmAantal = telMotm(speler.id, wedstrijden);

  function slaDoelOp(d) {
    setDoelen(function(l){
      var b = l.find(function(x){return x.id===d.id;});
      return b ? l.map(function(x){return x.id===d.id?d:x;}) : l.concat([d]);
    });
    setDoelForm(null);
    meldGoed("Doel opgeslagen");
  }
  function wisselBehaald(d) {
    setDoelen(function(l){
      return l.map(function(x){
        return x.id===d.id ? Object.assign({},x,{behaald:!x.behaald, voortgang: !x.behaald?100:x.voortgang}) : x;
      });
    });
    if (!d.behaald) meldGoed("Doel behaald: "+d.titel);
  }
  function verwijderDoel(d) {
    setDoelen(function(l){ return l.filter(function(x){return x.id!==d.id;}); });
    toon("Doel verwijderd", { actie: function(){ setDoelen(function(l){ return l.concat([d]); }); } });
  }
  function slaReviewOp(r) {
    setReviews(function(l){
      var b = l.find(function(x){return x.id===r.id;});
      return b ? l.map(function(x){return x.id===r.id?r:x;}) : l.concat([r]);
    });
    setReviewForm(null);
    meldGoed("Review opgeslagen");
  }
  function verwijderReview(r) {
    setReviews(function(l){ return l.filter(function(x){return x.id!==r.id;}); });
    toon("Review verwijderd", { actie: function(){ setReviews(function(l){ return l.concat([r]); }); } });
  }

  const cijferReeks = eigenReviews.slice().reverse().filter(function(r){return r.cijfer;});

  return (
    <div>
      <div className="stat-raster">
        <div className="stat-kaart primair">
          <div className="stat-getal">{score===null?"–":score+"%"}</div>
          <div className="stat-label">Gemiddelde voortgang</div>
        </div>
        <div className="stat-kaart accent">
          <div className="stat-getal">{behaald+"/"+eigenDoelen.length}</div>
          <div className="stat-label">Doelen behaald</div>
        </div>
      </div>

      <div className="tabs">
        <button className={"tab-knop"+(subtab==="profiel"?" actief":"")} onClick={function(){setSubtab("profiel");}}>
          <i className="fa-solid fa-chart-simple"/>{" Profiel"}
        </button>
        <button className={"tab-knop"+(subtab==="doelen"?" actief":"")} onClick={function(){setSubtab("doelen");}}>
          <i className="fa-solid fa-bullseye"/>{" Doelen"}
        </button>
        <button className={"tab-knop"+(subtab==="rapport"?" actief":"")} onClick={function(){setSubtab("rapport");}}>
          <i className="fa-solid fa-file-lines"/>{" Rapport"}
        </button>
        <button className={"tab-knop"+(subtab==="reviews"?" actief":"")} onClick={function(){setSubtab("reviews");}}>
          <i className="fa-solid fa-comments"/>{" Reviews"}
        </button>
      </div>

      {subtab==="rapport" && (
        <RapportTab speler={speler} onOpslaan={onOpslaanSpeler} />
      )}

      {subtab==="profiel" && (
        <div>
          <div className="kaart">
            <div className="kaart-titel"><i className="fa-solid fa-lightbulb"/> Wat opvalt</div>
            {inzichten.map(function(inz, i){
              var kl = inz.soort==="goed" ? "var(--succes)" : inz.soort==="aandacht" ? "var(--oranje)" : "var(--grijs-donker)";
              var vl = inz.soort==="goed" ? "var(--vlak-succes)" : inz.soort==="aandacht" ? "var(--vlak-goud)" : "var(--grijs-licht)";
              var ic = inz.soort==="goed" ? "fa-solid fa-arrow-trend-up" : inz.soort==="aandacht" ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-info";
              return (
                <div key={i} className="inz-rij">
                  <span className="inz-merk" style={{background:vl,color:kl}}><i className={ic}/></span>
                  <span className="inz-tekst">{inz.tekst}</span>
                </div>
              );
            })}
            <p style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:400,marginTop:10,lineHeight:1.5}}>
              Deze observaties komen automatisch uit je wedstrijden, trainingen, beoordelingen en doelen.
            </p>
          </div>

          <div className="stat-raster">
            <div className="stat-kaart primair">
              <div className="stat-getal">{deelname.aantal}</div>
              <div className="stat-label">Wedstrijden</div>
            </div>
            <div className="stat-kaart accent">
              <div className="stat-getal">{deelname.minuten}</div>
              <div className="stat-label">Minuten</div>
            </div>
          </div>
          <div className="stat-mini-raster" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
            <div className="stat-mini"><div className="stat-mini-getal">{deelname.basis}</div><div className="stat-mini-label">Basis</div></div>
            <div className="stat-mini"><div className="stat-mini-getal">{deelname.wissel}</div><div className="stat-mini-label">Inval</div></div>
            <div className="stat-mini"><div className="stat-mini-getal">{cijfer||"–"}</div><div className="stat-mini-label">Cijfer</div></div>
            <div className="stat-mini"><div className="stat-mini-getal" style={{color:"var(--goud)"}}>{motmAantal}</div><div className="stat-mini-label">MOTM</div></div>
          </div>

          {heeftSkills(speler) ? (
            <div>
              {/* Eindcijfer en de zes categorieën, zoals op een spelerskaart */}
              <div className="kaart">
                <div className="fc-overzicht">
                  <div className="fc-ovr-groot" style={{color:ovrKleur(fcOvr(speler))}}>
                    {fcOvr(speler)||"–"}
                    <span className="fc-ovr-pos">{speler.positie ? positieKort(speler.positie) : ""}</span>
                  </div>
                  <div className="fc-cat-raster">
                    {fcCategorieen(speler).map(function(cat){
                      var w = fcCategorieWaarde(speler, cat);
                      return (
                        <div key={cat.id} className="fc-cat-tegel">
                          <div className="fc-cat-tegel-kop" style={{color:cat.kleur}}>{cat.kort}</div>
                          <div className="fc-cat-tegel-getal" style={{color: w?ovrKleur(w):"var(--grijs-donker)"}}>{w||"–"}</div>
                          <div className="fc-cat-tegel-naam">{cat.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="fc-ster-overzicht">
                  {FC_STERREN.map(function(s){
                    var v = fcSterren(speler, s.id);
                    return (
                      <span key={s.id} className="fc-ster-blok" title={s.uitleg}>
                        <span className="fc-ster-label">{s.label}</span>
                        <span>
                          {[1,2,3,4,5].map(function(n){
                            return <i key={n} className="fa-solid fa-star"
                              style={{fontSize:12,marginRight:2,color: v&&n<=v ? "#f5c518" : "var(--grijs)"}}/>;
                          })}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="kaart grafiek-kaart">
                <div className="kaart-titel">
                  <i className="fa-solid fa-chart-pie"/> Profiel
                  {speler.positie && <span style={{marginLeft:"auto",fontWeight:400,textTransform:"none",letterSpacing:0}}>{"norm: "+speler.positie.toLowerCase()}</span>}
                </div>
                <RadarGrafiek
                  waarden={fcCategorieen(speler).map(function(c){ return (fcCategorieWaarde(speler,c)||0)/10; })}
                  normen={speler.positie ? fcCategorieen(speler).map(function(c){ return fcNorm(speler.positie,c.id)/10; }) : null}
                  labels={fcCategorieen(speler).map(function(c){ return c.kort; })} />
                <GrafiekLegenda items={[{label:"Deze speler",kleur:"var(--blauw)"},{label:"Norm positie",kleur:"var(--grijs-donker)"}]} />
              </div>

              {/* Alle losse waarden per categorie */}
              {fcCategorieen(speler).map(function(cat){
                var ingevuld = cat.attrs.filter(function(a){ return fcWaarde(speler,a.id)!==null; });
                if (!ingevuld.length) return null;
                return (
                  <div key={cat.id} className="kaart">
                    <div className="kaart-titel">
                      <span className="fc-cat-streep" style={{background:cat.kleur}}/> {cat.label}
                      <span style={{marginLeft:"auto",fontSize:18,fontWeight:800,
                        color:ovrKleur(fcCategorieWaarde(speler,cat))}}>{fcCategorieWaarde(speler,cat)}</span>
                    </div>
                    {ingevuld.map(function(a){
                      var w = fcWaarde(speler, a.id);
                      return (
                        <div key={a.id} className="fc-balk-rij">
                          <span className="fc-balk-naam">{a.label}</span>
                          <span className="fc-balk"><span style={{width:w+"%",background:ovrKleur(w)}}/></span>
                          <span className="fc-balk-waarde" style={{color:ovrKleur(w)}}>{w}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="kaart" style={{textAlign:"center",padding:"22px 16px"}}>
              <div style={{fontSize:26,color:"var(--grijs-donker)",marginBottom:9}}><i className="fa-solid fa-chart-simple"/></div>
              <div style={{fontSize:15,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",marginBottom:5}}>Nog geen vaardigheden</div>
              <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.55}}>
                Vul ze in bij Bewerken. Dan verschijnt hier zijn eindcijfer, de zes categorieën en het profiel met de norm voor zijn positie.
              </p>
            </div>
          )}
        </div>
      )}

      {subtab==="doelen" && (
        <div>
          {eigenDoelen.length===0 ? (
            <div className="leeg">
              <div className="leeg-icoon"><i className="fa-solid fa-bullseye"/></div>
              <h3>Nog geen doelen</h3>
              <p>Stel samen met {speler.naam.split(" ")[0]} vast waar hij aan wil werken.</p>
              <button className="knop" onClick={function(){setDoelForm({});}}>+ Eerste doel</button>
            </div>
          ) : (
            <div>
              {eigenDoelen.map(function(d){
                return (
                  <div key={d.id} className={"doel-kaart"+(d.behaald?" behaald":"")}>
                    <div className="doel-kop">
                      <button className={"doel-vink"+(d.behaald?" aan":"")} onClick={function(){wisselBehaald(d);}}>
                        <i className="fa-solid fa-check"/>
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <div className={"doel-titel"+(d.behaald?" behaald":"")}>{d.titel}</div>
                        <div className="doel-meta">
                          <span className="oef-tag">{d.thema}</span>
                          {d.streefdatum&&<span><i className="fa-solid fa-flag-checkered"/>{" "+formateerDatumKort(d.streefdatum)}</span>}
                          {!d.behaald&&<span>{d.voortgang+"%"}</span>}
                        </div>
                      </div>
                      <button className="knop lijn klein" style={{padding:"5px 9px"}} onClick={function(){setDoelForm(d);}}>
                        <i className="fa-solid fa-pen"/>
                      </button>
                      <button className="knop gevaar klein" style={{padding:"5px 9px"}} onClick={function(){verwijderDoel(d);}}>
                        <i className="fa-solid fa-trash"/>
                      </button>
                    </div>
                    {d.omschrijving&&<p style={{fontSize:13,fontWeight:400,color:"var(--grijs-donker)",marginTop:8,lineHeight:1.5}}>{d.omschrijving}</p>}
                    {d.meetbaar&&(
                      <p style={{fontSize:12,fontWeight:400,marginTop:6,lineHeight:1.5}}>
                        <span style={{fontWeight:700,color:"var(--blauw)"}}>Meetpunt: </span>{d.meetbaar}
                      </p>
                    )}
                    {!d.behaald&&(
                      <div className="doel-balk"><div className="doel-balk-vul" style={{width:(d.voortgang||0)+"%"}}/></div>
                    )}
                  </div>
                );
              })}
              <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:4}}
                onClick={function(){setDoelForm({});}}>+ Doel toevoegen</button>
            </div>
          )}
        </div>
      )}

      {subtab==="reviews" && (
        <div>
          {cijferReeks.length>1 && (
            <div className="kaart grafiek-kaart">
              <div className="kaart-titel"><i className="fa-solid fa-chart-line"/> Cijfers uit reviews</div>
              <LijnGrafiek
                waarden={cijferReeks.map(function(r){return Number(r.cijfer);})}
                labels={cijferReeks.map(function(r){return formateerDatumKort(r.datum).split(" ")[0];})}
                kleur="#004aad" hoogte={135} />
            </div>
          )}

          {eigenReviews.length===0 ? (
            <div className="leeg">
              <div className="leeg-icoon"><i className="fa-solid fa-comments"/></div>
              <h3>Nog geen reviews</h3>
              <p>Leg na een wedstrijd vast wat goed ging en wat beter kan.</p>
              <button className="knop" onClick={function(){setReviewForm({});}}>+ Eerste review</button>
            </div>
          ) : (
            <div>
              {eigenReviews.map(function(r){
                var w = r.wedstrijdId ? wedstrijden.find(function(x){return String(x.id)===String(r.wedstrijdId);}) : null;
                return (
                  <div key={r.id} className="review-kaart">
                    <div className="review-kop">
                      <div>
                        <div className="review-datum">{formateerDatumKort(r.datum)}</div>
                        {w&&<div style={{fontSize:12,color:"var(--grijs-donker)",marginTop:2}}>{"vs. "+w.tegenstander}</div>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {r.cijfer&&<span className="review-cijfer">{r.cijfer}</span>}
                        <button className="knop lijn klein" style={{padding:"4px 8px"}} onClick={function(){setReviewForm(r);}}>
                          <i className="fa-solid fa-pen"/>
                        </button>
                        <button className="knop gevaar klein" style={{padding:"4px 8px"}} onClick={function(){verwijderReview(r);}}>
                          <i className="fa-solid fa-trash"/>
                        </button>
                      </div>
                    </div>
                    {r.sterk&&<><div className="review-label" style={{color:"var(--succes)"}}>Ging goed</div><div className="review-tekst">{r.sterk}</div></>}
                    {r.beter&&<><div className="review-label" style={{color:"var(--oranje)"}}>Kan beter</div><div className="review-tekst">{r.beter}</div></>}
                    {r.afspraak&&<><div className="review-label" style={{color:"var(--blauw)"}}>Afspraak</div><div className="review-tekst">{r.afspraak}</div></>}
                  </div>
                );
              })}
              <button className="knop lijn" style={{width:"100%",justifyContent:"center",marginTop:4}}
                onClick={function(){setReviewForm({});}}>+ Review toevoegen</button>
            </div>
          )}
        </div>
      )}

      {doelForm && (
        <DoelFormulier doel={doelForm.id?doelForm:null} spelerId={speler.id}
          onOpslaan={slaDoelOp} onSluiten={function(){setDoelForm(null);}} />
      )}
      {reviewForm && (
        <ReviewFormulier review={reviewForm.id?reviewForm:null} spelerId={speler.id} wedstrijden={wedstrijden}
          onOpslaan={slaReviewOp} onSluiten={function(){setReviewForm(null);}} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPELERS LIJST
═══════════════════════════════════════════════════════════ */
function SpelersLijst({ spelers, onSelecteer, onNieuw }) {
  const [zoek,setZoek]=useState(""),[filterPos,setFilterPos]=useState("Alle");
  const [alleenNietFit,setAlleenNietFit]=useState(false);
  const [weergave,setWeergave]=useState("lijst");
  const alleWedstrijden = laadWedstrijden();
  /* Zonder de module trainingen komt hier een lege lijst uit, en
     verdwijnen de inzichten over trainingsopkomst vanzelf uit de
     spelerskaarten. De rest van de kaart — cijfers, doelpunten,
     beschikbaarheid — blijft staan. */
  const alleTrainingen = zichtbareTrainingen();
  const alleAfwezigheden = laadAfwezigheden();
  const alleReviews = laadReviews();
  const posities=["Alle","Keeper","Verdediger","Middenvelder","Aanvaller"];
  const gefilterd=spelers
    .filter(s=>filterPos==="Alle"||s.positie===filterPos)
    .filter(s=>!alleenNietFit||(s.beschikbaar&&s.beschikbaar!=="fit"))
    .filter(s=>s.naam.toLowerCase().includes(zoek.toLowerCase())||String(s.rugnummer).includes(zoek))
    .sort((a,b)=>(Number(a.rugnummer)||99)-(Number(b.rugnummer)||99));
  const nietFit = spelers.filter(s=>s.beschikbaar&&s.beschikbaar!=="fit");
  const alleDoelen = laadDoelen();
  return (
    <div>
      <div className="pagina-header">
        <div className="pagina-header-tekst"><div className="eyebrow">Selectie</div><h2>Spelers</h2><p>{spelers.length} speler{spelers.length!==1?"s":""} in de selectie</p></div>
        <button className="knop-plus" onClick={onNieuw}>+</button>
      </div>
      {spelers.length>0&&<>
        <input className="zoekbalk" placeholder="Zoek op naam of nummer…" value={zoek} onChange={e=>setZoek(e.target.value)} />
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
          {posities.map(p=><button key={p} className="filter-chip" style={{borderColor:filterPos===p?"var(--blauw)":"var(--grijs)",background:filterPos===p?"var(--blauw)":"var(--wit)",color:filterPos===p?"var(--wit)":"var(--grijs-donker)"}} onClick={()=>setFilterPos(p)}>{p}</button>)}
          {nietFit.length>0&&(
            <button className="filter-chip"
              style={{borderColor:alleenNietFit?"var(--gevaar)":"var(--grijs)",background:alleenNietFit?"var(--gevaar)":"var(--wit)",color:alleenNietFit?"var(--wit)":"var(--gevaar)"}}
              onClick={function(){setAlleenNietFit(!alleenNietFit);}}>
              <i className="fa-solid fa-kit-medical"/>{" Niet fit ("+nietFit.length+")"}
            </button>
          )}
        </div>
      </>}
      {spelers.length>0&&(
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {[{id:"lijst",ic:"fa-solid fa-list",l:"Lijst"},{id:"kaarten",ic:"fa-solid fa-table-cells-large",l:"Kaarten"}].map(function(o){
            var aan = weergave===o.id;
            return (
              <button key={o.id} className="filter-chip"
                style={{borderColor:aan?"var(--blauw)":"var(--grijs)",background:aan?"var(--blauw)":"var(--wit)",color:aan?"var(--op-kleur)":"var(--grijs-donker)"}}
                onClick={function(){setWeergave(o.id);}}>
                <i className={o.ic}/>{" "+o.l}
              </button>
            );
          })}
        </div>
      )}

      {spelers.length===0?(<div className="leeg"><div className="leeg-icoon"><i className="fa-solid fa-users"/></div><h3>Nog geen spelers</h3><p>Voeg je eerste speler toe aan de selectie.</p><button className="knop" onClick={onNieuw}>+ Speler toevoegen</button></div>)
      :gefilterd.length===0?(<div className="leeg"><div className="leeg-icoon"><i className="fa-solid fa-magnifying-glass"/></div><h3>Geen resultaten</h3><p>Pas je zoekopdracht of filter aan.</p></div>)
      :weergave==="kaarten"?(
        <div>
          {ROL_VOLGORDE.concat(["Overig"]).map(function(rol){
          var linie = gefilterd.filter(function(s){
            return rol==="Overig" ? !s.positie : s.positie===rol;
          }).sort(function(a,b){
            return (Number(a.rugnummer)||999) - (Number(b.rugnummer)||999);
          });
          if (linie.length===0) return null;
          var linieTitel = rol==="Overig" ? "Zonder positie"
            : rol==="Keeper" ? "Keepers" : rol+"s";
          return (
          <div key={rol} className="linie-groep">
            <div className="linie-kop">
              <span className={"positie-badge "+positieKlasse(rol)}>{rol==="Overig"?"?":rol.charAt(0)}</span>
              <span className="linie-naam">{linieTitel}</span>
              <span className="linie-tel">{linie.length}</span>
            </div>
            <div className="sp-raster-kaarten">
          {linie.map(function(s){
            var d = deelnameVanSpeler(s.id, alleWedstrijden);
            var c = gemiddeldCijfer(s.id, alleWedstrijden);
            var st = berekenSpelerStats(s.id, alleWedstrijden, s.stats);
            var ovr = fcOvr(s);
            var eigenDoelen = doelenVanSpeler(s.id, alleDoelen);
            var besch = beschikbaarheidInfo(s.beschikbaar);
            var nietFitS = s.beschikbaar && s.beschikbaar!=="fit";
            var inz = spelerInzichten(s, alleWedstrijden, alleTrainingen, alleDoelen, alleReviews, alleAfwezigheden);
            var aandacht = inz.filter(function(x){ return x.soort==="aandacht"; }).length;
            return (
              <div key={s.id} className="sp-kaart" onClick={function(){onSelecteer(s);}}>
                {/* Kop: poppetje, naam, positie en status */}
                <div className="sp-kaart-kop">
                  <div className="sp-buste"><SpelerBeeld speler={s}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="sp-kaart-naam">{s.naam}</div>
                    <div className="sp-kaart-pos">
                      {(s.rugnummer?"#"+s.rugnummer+" · ":"")+(s.positie||"Geen positie")}
                    </div>
                    <span className="sp-status" style={{color:besch.kleur,borderColor:besch.kleur}}>
                      <i className={besch.icoon}/> {besch.label}
                    </span>
                  </div>
                  {aandacht>0 && (
                    <span title={aandacht+" aandachtspunt"+(aandacht===1?"":"en")}
                      style={{color:"var(--oranje)",fontSize:13,flexShrink:0}}>
                      <i className="fa-solid fa-triangle-exclamation"/>
                    </span>
                  )}
                </div>

                {/* Beoordeling en vaardigheid */}
                <div className="sp-rating-rij">
                  <div className="sp-rating">
                    <div className="sp-kaart-label">Match rating</div>
                    <div className="sp-rating-getal" style={{color:c?cijferKleur(c):"var(--grijs-donker)"}}>
                      {c ? c.toFixed(1) : "–"}<span className="sp-rating-max">/10</span>
                    </div>
                  </div>
                  <div className="sp-rating">
                    <div className="sp-kaart-label">Eindcijfer</div>
                    <div className="sp-rating-getal" style={{color: ovr ? ovrKleur(ovr) : "var(--grijs-donker)"}}>
                      {ovr || "–"}
                      {ovr && <span className="sp-rating-max">{" "+(s.positie ? positieKort(s.positie) : "")}</span>}
                    </div>
                  </div>
                </div>

                {/* Wedstrijden, minuten, doelpunten, assists */}
                <div className="sp-kaart-cijfers">
                  <div className="sp-kaart-vak"><div className="sp-kaart-getal">{d.aantal}</div><div className="sp-kaart-label">Wed</div></div>
                  <div className="sp-kaart-vak"><div className="sp-kaart-getal">{d.minuten}</div><div className="sp-kaart-label">Min</div></div>
                  <div className="sp-kaart-vak"><div className="sp-kaart-getal">{st.doelpunten}</div><div className="sp-kaart-label">Goals</div></div>
                  <div className="sp-kaart-vak"><div className="sp-kaart-getal">{st.assists}</div><div className="sp-kaart-label">Assists</div></div>
                </div>

                {/* Doelen en kaarten */}
                <div className="sp-voet">
                  {eigenDoelen.length>0 ? (
                    <span className="sp-voet-item" title="Behaalde ontwikkeldoelen">
                      <i className="fa-solid fa-bullseye" style={{color:"var(--blauw)"}}/>
                      {eigenDoelen.filter(function(x){return x.behaald;}).length+"/"+eigenDoelen.length+" doelen"}
                    </span>
                  ) : (
                    <span className="sp-voet-item leeg" title="Nog geen ontwikkeldoelen">
                      <i className="fa-solid fa-bullseye"/> –
                    </span>
                  )}
                  <span className={"sp-voet-item"+(st.geelKaarten?"":" leeg")} title="Gele kaarten">
                    <span className="sp-kaartje geel"/>{st.geelKaarten}
                  </span>
                  <span className={"sp-voet-item"+(st.roodKaarten?"":" leeg")} title="Rode kaarten">
                    <span className="sp-kaartje rood"/>{st.roodKaarten}
                  </span>
                  {(function(){
                    var b = beenInfo(s.favorietBeen);
                    if (!b) return null;
                    return (
                      <span className="sp-voet-item" title={"Favoriet been: "+b.label}
                        style={{marginLeft:"auto",color:"var(--blauw)"}}>
                        {b.kant==="beide"
                          ? <><VoetIcoon kant="links" grootte={13}/><VoetIcoon kant="rechts" grootte={13}/></>
                          : <VoetIcoon kant={b.kant} grootte={14}/>}
                        {b.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })}
            </div>
          </div>
          );
          })}
        </div>
      ):(
        <div>
          {/* Per linie een eigen tabel, zodat je niet door elkaar heen leest */}
          {ROL_VOLGORDE.concat(["Overig"]).map(function(rol){
            var groep = gefilterd.filter(function(s){
              return rol==="Overig" ? !s.positie : s.positie===rol;
            }).sort(function(a,b){
              return (Number(a.rugnummer)||999) - (Number(b.rugnummer)||999);
            });
            if (groep.length===0) return null;
            var titel = rol==="Overig" ? "Zonder positie"
              : rol==="Keeper" ? "Keepers" : rol+"s";
            return (
              <div key={rol} className="linie-groep">
                <div className="linie-kop">
                  <span className={"positie-badge "+positieKlasse(rol)}>{rol==="Overig"?"?":rol.charAt(0)}</span>
                  <span className="linie-naam">{titel}</span>
                  <span className="linie-tel">{groep.length}</span>
                </div>
                <div className="kaart sp-tabel-kaart">
                  <table className="sp-tabel">
                    <thead>
                      <tr>
                        <th className="k-nr">#</th>
                        <th className="k-naam">Speler</th>
                        <th className="k-skill">Cijfer</th>
                        <th className="k-been">Been</th>
                        <th className="k-getal">Wed</th>
                        <th className="k-getal">Min</th>
                        <th className="k-getal">Goals</th>
                        <th className="k-getal">Ass</th>
                        <th className="k-extra">Extra positie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groep.map(function(s){
                        var d = deelnameVanSpeler(s.id, alleWedstrijden);
                        var st = berekenSpelerStats(s.id, alleWedstrijden, s.stats);
                        var ovr = fcOvr(s);
                        var b = beenInfo(s.favorietBeen);
                        var besch = beschikbaarheidInfo(s.beschikbaar);
                        var nietFit = s.beschikbaar && s.beschikbaar!=="fit";
                        return (
                          <tr key={s.id} onClick={function(){onSelecteer(s);}}>
                            <td className="k-nr">{s.rugnummer ? "#"+s.rugnummer : "–"}</td>
                            <td className="k-naam">
                              <span className="k-speler">
                                <span className="k-buste"><SpelerBeeld speler={s}/></span>
                                <span style={{minWidth:0}}>
                                  <span className="k-speler-naam">{s.naam}</span>
                                  {nietFit && (
                                    <span className="k-status" style={{color:besch.kleur}}>
                                      <i className={besch.icoon}/> {besch.label}
                                    </span>
                                  )}
                                </span>
                              </span>
                            </td>
                            <td className="k-skill">
                              <span className="k-ovr" style={{color: ovr ? ovrKleur(ovr) : "var(--grijs-donker)"}}>
                                {ovr || "–"}
                              </span>
                            </td>
                            <td className="k-been">
                              {b ? (
                                <span className="k-voet" title={"Favoriet been: "+b.label}>
                                  {b.kant==="beide"
                                    ? <><VoetIcoon kant="links" grootte={13}/><VoetIcoon kant="rechts" grootte={13}/></>
                                    : <VoetIcoon kant={b.kant} grootte={14}/>}
                                </span>
                              ) : <span className="k-leeg">–</span>}
                            </td>
                            <td className="k-getal">{d.aantal||<span className="k-leeg">0</span>}</td>
                            <td className="k-getal">{d.minuten||<span className="k-leeg">0</span>}</td>
                            <td className="k-getal">{st.doelpunten||<span className="k-leeg">0</span>}</td>
                            <td className="k-getal">{st.assists||<span className="k-leeg">0</span>}</td>
                            <td className="k-extra">
                              {s.positie2
                                ? <span className={"positie-badge "+positieKlasse(s.positie2)}>{s.positie2}</span>
                                : <span className="k-leeg">–</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SELECTIE PAGINA
═══════════════════════════════════════════════════════════ */
/* AfwezigheidHint (en zijn helper afwezigheidNaarStatus) stond hier,
   maar wordt alleen door trainingen/agenda gebruikt. Sinds P4 stap 4
   (17 september 2026) staat hij in src/schermen/trainingen.jsx — zie
   docs/p4-stappenplan.md §1 stap 4 en §2. */

/* ═══════════════════════════════════════════════════════════
   BLESSURES & AFWEZIGHEID
   Eén periode vastleggen in plaats van dertig keer een vinkje.
═══════════════════════════════════════════════════════════ */
function AfwezigheidFormulier({ record, spelers, onOpslaan, onSluiten }) {
  const [form, setForm] = useState(Object.assign({}, LEEG_AFWEZIGHEID, record||{}));
  const [open, setOpen] = useState(!(record && record.tot));
  function set(v,w){ setForm(function(f){ var n=Object.assign({},f); n[v]=w; return n; }); }
  const soort = afwezigheidSoort(form.soort);
  const standaard = soort.noemer;
  const telt = afwezigheidTeltMee(form);

  function bewaar() {
    if (!form.spelerId) { meldFout("Kies eerst een speler."); return; }
    if (!form.vanaf)    { meldFout("Vul in vanaf wanneer de speler er niet is."); return; }
    var tot = open ? "" : form.tot;
    if (tot && parseerDatum(tot) < parseerDatum(form.vanaf)) {
      meldFout("De einddatum ligt vóór de begindatum."); return;
    }
    onOpslaan(Object.assign({}, form, {
      id: form.id || Date.now(),
      tot: tot,
      reden: (form.reden||"").trim(),
      teltMee: (form.teltMee===true || form.teltMee===false) ? form.teltMee : null
    }));
  }

  return (
    <div className="modal-overlay" style={{zIndex:420}} onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel">{form.id?"Periode bewerken":"Nieuwe afwezigheid"}</div>

        <div className="formulier-groep">
          <label className="formulier-label">Wie? *</label>
          <select className="formulier-input" value={form.spelerId||""}
            onChange={function(e){ set("spelerId", e.target.value?Number(e.target.value):null); }}>
            <option value="">Kies een speler…</option>
            {sorteerOpLinie(spelers.slice()).map(function(s){
              return <option key={s.id} value={s.id}>{(s.rugnummer?"#"+s.rugnummer+"  ":"")+s.naam}</option>;
            })}
          </select>
        </div>

        <div className="formulier-groep">
          <label className="formulier-label">Waarom?</label>
          <div className="soort-raster">
            {AFWEZIGHEID_SOORTEN.map(function(s){
              var aan = form.soort===s.id;
              return (
                <button key={s.id} type="button"
                  className={"soort-knop"+(aan?" actief":"")}
                  style={aan?{color:s.kleur, background:"var(--vlak-info)"}:{}}
                  onClick={function(){ set("soort", s.id); set("teltMee", null); }}>
                  <i className={s.icoon} style={{color:s.kleur}}/> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Vanaf *</label>
            <input type="date" className="formulier-input" value={form.vanaf}
              onChange={function(e){ set("vanaf", e.target.value); }} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Tot en met</label>
            <input type="date" className="formulier-input" value={open?"":form.tot} disabled={open}
              style={open?{opacity:.45}:{}}
              onChange={function(e){ set("tot", e.target.value); }} />
          </div>
        </div>

        <label className="deel-schakel" style={{margin:"2px 0 12px"}}
          onClick={function(e){ e.preventDefault(); setOpen(!open); }}>
          <span className={"doel-vink"+(open?" aan":"")}><i className="fa-solid fa-check"/></span>
          <span>Einddatum nog niet bekend</span>
        </label>

        <div className="formulier-groep">
          <label className="formulier-label">Toelichting</label>
          <textarea className="formulier-input" rows={2} value={form.reden}
            onChange={function(e){ set("reden", e.target.value); }}
            placeholder="bijv. Kruisband gescheurd, revalidatie drie maanden" />
        </div>

        <div className="afw-telt" style={{borderColor: telt?"var(--oranje)":"var(--succes)"}}>
          <label className="deel-schakel" style={{margin:0}}
            onClick={function(e){ e.preventDefault(); set("teltMee", telt ? false : true); }}>
            <span className={"doel-vink"+(!telt?" aan":"")}><i className="fa-solid fa-check"/></span>
            <span>Telt niet mee in het opkomstpercentage</span>
          </label>
          <p className="afw-telt-uitleg">
            {telt
              ? "Deze dagen tellen als gemist. Bij vakantie of werk klopt dat, want dat is een keuze."
              : "Deze dagen vallen buiten de telling. Zo zakt een speler niet naar 20% door iets waar hij niets aan kan doen."}
            {" Standaard bij " + soort.label.toLowerCase() + ": " + (standaard ? "telt mee" : "telt niet mee") + "."}
          </p>
        </div>

        <div className="modal-knoppen">
          <button className="knop lijn" onClick={onSluiten}>Annuleren</button>
          <button className="knop succes" onClick={bewaar}>
            <i className="fa-solid fa-check"/> Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

function BlessuresTab({ spelers }) {
  const [lijst, setLijst] = useState(laadAfwezigheden);
  const [formulier, setFormulier] = useState(null);
  const [verwijder, setVerwijder] = useState(null);
  const vandaag = vandaagISO();

  useEffect(function(){ slaJson(AFWEZIGHEDEN_KEY, lijst); }, [lijst]);

  function spelerVan(id) { return spelers.filter(function(s){ return s.id===id; })[0] || null; }

  function opslaan(rec) {
    setLijst(function(l){
      var bestaat = l.filter(function(x){ return x.id===rec.id; }).length > 0;
      return bestaat ? l.map(function(x){ return x.id===rec.id ? rec : x; }) : l.concat([rec]);
    });
    setFormulier(null);
    meldGoed(formulier && formulier.id ? "Periode bijgewerkt" : "Afwezigheid vastgelegd");
  }
  function wis(id) {
    setLijst(function(l){ return l.filter(function(x){ return x.id!==id; }); });
    setVerwijder(null);
    meldGoed("Periode verwijderd");
  }

  /* Alleen periodes van spelers die nog in de selectie staan */
  const bekend = lijst.filter(function(r){ return !!spelerVan(r.spelerId); });
  const groepen = [
    {id:"nu",      kop:"Nu afwezig",     icoon:"fa-solid fa-circle-exclamation", kleur:"var(--gevaar)"},
    {id:"komt",    kop:"Staat gepland",  icoon:"fa-solid fa-calendar-plus",      kleur:"var(--oranje)"},
    {id:"voorbij", kop:"Afgerond",       icoon:"fa-solid fa-circle-check",       kleur:"var(--grijs-donker)"}
  ].map(function(g){
    var rijen = bekend.filter(function(r){ return afwezigheidFase(r, vandaag)===g.id; });
    rijen.sort(function(a,b){
      if (g.id==="voorbij") return String(b.tot||b.vanaf).localeCompare(String(a.tot||a.vanaf));
      if (g.id==="komt")    return String(a.vanaf).localeCompare(String(b.vanaf));
      /* Nu afwezig: wie het eerst terug is bovenaan; zonder einddatum onderaan */
      if (!a.tot && b.tot) return 1;
      if (a.tot && !b.tot) return -1;
      return String(a.tot||"").localeCompare(String(b.tot||""));
    });
    return Object.assign({}, g, {rijen:rijen});
  }).filter(function(g){ return g.rijen.length>0; });

  const nuAantal = bekend.filter(function(r){ return afwezigheidFase(r, vandaag)==="nu"; }).length;

  return (
    <div>
      <div className="kaart" style={{marginBottom:12}}>
        <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span><i className="fa-solid fa-briefcase-medical"/> Blessures en afwezigheid</span>
          <button className="knop klein" onClick={function(){ setFormulier({}); }}>
            <i className="fa-solid fa-plus"/> Nieuwe periode
          </button>
        </div>
        <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,margin:"2px 0 0"}}>
          Leg één keer vast dat een speler er langere tijd niet is. De presentielijst vult zichzelf,
          en blessure, ziekte en schorsing tellen niet mee in zijn opkomstpercentage —
          anders zakt een jongen met een gescheurde kruisband naar 20% en zegt dat cijfer niets meer.
        </p>
        {nuAantal>0 && (
          <div className="afw-teller">
            <i className="fa-solid fa-user-injured"/>
            {nuAantal===1 ? "Er is nu 1 speler afwezig" : "Er zijn nu "+nuAantal+" spelers afwezig"}
          </div>
        )}
      </div>

      {bekend.length===0 ? (
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-briefcase-medical"/></div>
          <h3>Iedereen beschikbaar</h3>
          <p>Zodra iemand langere tijd uit de roulatie is, leg je dat hier één keer vast in plaats van elke training opnieuw.</p>
          <button className="knop" onClick={function(){ setFormulier({}); }}>+ Eerste periode</button>
        </div>
      ) : groepen.map(function(g){
        return (
          <div key={g.id} style={{marginBottom:14}}>
            <div className="afw-groepkop" style={{color:g.kleur}}>
              <i className={g.icoon}/> {g.kop}
              <span className="afw-groepaantal">{g.rijen.length}</span>
            </div>
            {g.rijen.map(function(r){
              var sp = spelerVan(r.spelerId);
              var so = afwezigheidSoort(r.soort);
              var telt = afwezigheidTeltMee(r);
              var dagen = afwezigheidDagen(r);
              var rest = afwezigheidResterend(r, vandaag);
              return (
                <div key={r.id} className={"kaart afw-kaart"+(g.id==="voorbij"?" verlopen":"")}
                  style={{borderLeftColor:so.kleur}}>
                  <div className="afw-kop">
                    <span className="k-buste" style={{width:34,height:34,flexShrink:0}}>
                      <SpelerBeeld speler={sp}/>
                    </span>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="afw-naam">{(sp.rugnummer?sp.rugnummer+"  ":"")+sp.naam}</div>
                      <div className="afw-datums">
                        {afwezigheidPeriodeTekst(r)}
                        {dagen ? " · " + dagen + " dag" + (dagen===1?"":"en") : ""}
                      </div>
                    </div>
                    <div className="afw-acties">
                      <button className="knop lijn klein" title="Bewerken"
                        onClick={function(){ setFormulier(r); }}><i className="fa-solid fa-pen"/></button>
                      <button className="knop gevaar klein" title="Verwijderen"
                        onClick={function(){ setVerwijder(r); }}><i className="fa-solid fa-trash"/></button>
                    </div>
                  </div>
                  {r.reden && <div className="afw-reden">{r.reden}</div>}
                  <div className="afw-chips">
                    <span className="afw-chip" style={{background:so.vlak,color:so.kleur}}>
                      <i className={so.icoon}/> {so.label}
                    </span>
                    <span className={"afw-chip "+(telt?"mee":"buiten")}>
                      <i className={telt?"fa-solid fa-calculator":"fa-solid fa-ban"}/>
                      {telt ? "telt mee in de opkomst" : "buiten de opkomst"}
                    </span>
                    {g.id==="nu" && rest!==null && (
                      <span className="afw-chip terug">
                        <i className="fa-solid fa-hourglass-half"/>
                        {rest===0 ? "laatste dag" : "nog "+rest+" dag"+(rest===1?"":"en")}
                      </span>
                    )}
                    {g.id==="nu" && rest===null && (
                      <span className="afw-chip terug">
                        <i className="fa-solid fa-question"/> einddatum onbekend
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {formulier && (
        <AfwezigheidFormulier record={formulier.id?formulier:null} spelers={spelers}
          onOpslaan={opslaan} onSluiten={function(){ setFormulier(null); }} />
      )}
      {verwijder && (
        <div className="bevestig-overlay"><div className="bevestig-kaart">
          <h3>Periode verwijderen?</h3>
          <p>De afwezigheid van {(spelerVan(verwijder.spelerId)||{}).naam} wordt gewist.
            De presentielijst rekent die dagen daarna weer gewoon mee.</p>
          <div className="bevestig-knoppen">
            <button className="knop lijn" onClick={function(){ setVerwijder(null); }}>Annuleren</button>
            <button className="knop gevaar" onClick={function(){ wis(verwijder.id); }}>Verwijderen</button>
          </div>
        </div></div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BOETEPOT — het scherm
═══════════════════════════════════════════════════════════ */
function BoetepotTab({ spelers }) {
  const [boetes, setBoetes] = useState(laadBoetes);
  const [betalingen, setBetalingen] = useState(laadBetalingen);
  const [tarieven, setTarieven] = useState(laadBoeteTarieven);
  const [toon, setToon] = useState("stand");        /* stand | regels | tarieven */
  const [nieuweBoete, setNieuweBoete] = useState(null);
  const [betaling, setBetaling] = useState(null);
  const [deelOpen, setDeelOpen] = useState(false);

  useEffect(function(){ slaJson(BOETES_KEY, boetes); }, [boetes]);
  useEffect(function(){ slaJson(BETALINGEN_KEY, betalingen); }, [betalingen]);
  useEffect(function(){ bewaarBoeteTarieven(tarieven); }, [tarieven]);

  const seizoen = huidigSeizoen();
  const actief = boetepotActief(tarieven, seizoen);
  /* Let op de volle laadTrainingen() hier, en niet zichtbareTrainingen():
     de berékening gaat altijd over alles. Een boete die iemand heeft
     staan, blijft hij schuldig, ook in een pakket waarin hij de
     training er niet bij kan zien. Wat er per pakket verschilt is
     alleen wat er in de lijst hieronder komt te staan, en dat regelt
     boeteRegelsGesplitst(). */
  const regels = boeteRegels(spelers, laadWedstrijden(), laadTrainingen(),
                             laadActiviteiten(), boetes, tarieven, actief);
  const stand = boeteStand(spelers, regels, betalingen);
  const lijst = boeteRegelsGesplitst(regels);
  const spelerVan = function(id){ return spelers.filter(function(s){ return s.id===id; })[0]; };

  function zetSeizoen(aan) {
    setTarieven(function(t){
      var n = Object.assign({}, t);
      n.seizoenen = Object.assign({}, n.seizoenen);
      n.seizoenen[seizoen] = aan;
      return n;
    });
    meldGoed(aan ? "De boetepot geldt vanaf nu voor " + seizoen
                 : "De boetepot staat uit voor " + seizoen);
  }
  function zetEigen(nieuw) {
    setTarieven(function(t){ return Object.assign({}, t, {eigen: nieuw}); });
  }
  function voegEigenToe(label, bedragTekst) {
    var naam = (label||"").trim();
    if (!naam) { meldFout("Geef de boete een naam."); return false; }
    var cent = tekstNaarCenten(bedragTekst);
    if (cent <= 0) { meldFout("Vul een bedrag in."); return false; }
    zetEigen((tarieven.eigen||[]).concat([{id:"e"+Date.now(), label:naam, bedrag:cent, aan:true}]));
    meldGoed(naam + " toegevoegd voor " + centenNaarTekst(cent));
    return true;
  }

  function zetTarief(id, velden) {
    setTarieven(function(t){
      var n = Object.assign({}, t);
      n[id] = Object.assign({}, n[id], velden);
      return n;
    });
  }
  function boekBoete(velden) {
    if (!velden.spelerId) { meldFout("Kies een speler."); return; }
    var cent = tekstNaarCenten(velden.bedrag);
    if (cent <= 0) { meldFout("Vul een bedrag in."); return; }
    setBoetes(function(l){ return l.concat([{
      id: Date.now(), spelerId: velden.spelerId, reden: velden.reden || "overig", bedrag: cent,
      datum: velden.datum || vandaagISO(), omschrijving: (velden.omschrijving||"").trim()
    }]); });
    setNieuweBoete(null);
    meldGoed("Boete van " + centenNaarTekst(cent) + " geboekt");
  }
  function boekBetaling(velden) {
    var cent = tekstNaarCenten(velden.bedrag);
    if (cent <= 0) { meldFout("Vul een bedrag in."); return; }
    setBetalingen(function(l){ return l.concat([{
      id: Date.now(), spelerId: velden.spelerId, bedrag: cent,
      datum: velden.datum || vandaagISO(), notitie: (velden.notitie||"").trim()
    }]); });
    setBetaling(null);
    meldGoed(centenNaarTekst(cent) + " genoteerd als betaald");
  }
  function wisBoete(r) {
    if (r.automatisch) {
      meldFout("Deze boete komt uit de presentie of een kaart. Pas dat aan, of zet het tarief uit.");
      return;
    }
    setBoetes(function(l){ return l.filter(function(b){ return b.id!==r.bronId; }); });
    meldGoed("Boete verwijderd");
  }

  return (
    <div>
      <div className="kaart" style={{marginBottom:12}}>
        <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span><i className="fa-solid fa-piggy-bank"/> Boetepot</span>
          {actief && (
            <div style={{display:"flex",gap:6}}>
              <button className="knop lijn klein" onClick={function(){ setDeelOpen(true); }}>
                <i className="fa-brands fa-whatsapp"/> Delen
              </button>
              <button className="knop klein" onClick={function(){ setNieuweBoete({spelerId:null,bedrag:"",omschrijving:"",reden:"overig"}); }}>
                <i className="fa-solid fa-plus"/> Boete
              </button>
            </div>
          )}
        </div>
        <p style={{fontSize:11.5,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,margin:"2px 0 0"}}>
          Te laat komen, niet afmelden en kaarten worden automatisch beboet volgens de tarieven
          hieronder. Losse boetes voeg je met de hand toe. Dit is alleen een administratie —
          er gaat hier geen geld doorheen.
        </p>

        <div className={"boete-seizoen"+(actief?" aan":"")}>
          <label className="deel-schakel" style={{margin:0,flex:1}}
            onClick={function(e){ e.preventDefault(); zetSeizoen(!actief); }}>
            <span className={"doel-vink"+(actief?" aan":"")}><i className="fa-solid fa-check"/></span>
            <span>
              <strong>De boetepot geldt in {seizoen}</strong>
              <span className="boete-seizoen-sub">
                {actief
                  ? "Boetes worden bijgehouden en tellen mee."
                  : "Staat uit: er wordt niets gerekend. Je kunt de tarieven wel alvast klaarzetten."}
              </span>
            </span>
          </label>
        </div>

        {actief && (
          <div className="boete-totalen">
            <div className="boete-vak">
              <div className="boete-getal">{centenNaarTekst(stand.totaal)}</div>
              <div className="boete-label">Totaal</div>
            </div>
            <div className="boete-vak betaald">
              <div className="boete-getal">{centenNaarTekst(stand.betaald)}</div>
              <div className="boete-label">Betaald</div>
            </div>
            <div className="boete-vak open">
              <div className="boete-getal">{centenNaarTekst(stand.open)}</div>
              <div className="boete-label">Openstaand</div>
            </div>
          </div>
        )}
      </div>

      <div className="tabs">
        {[{id:"stand",l:"Stand",ic:"fa-solid fa-ranking-star"},
          {id:"regels",l:"Alle boetes",ic:"fa-solid fa-list"},
          {id:"tarieven",l:"Tarieven",ic:"fa-solid fa-sliders"}].map(function(t){
          return (
            <button key={t.id} className={"tab-knop "+(toon===t.id?"actief":"")}
              onClick={function(){ setToon(t.id); }}>
              <i className={t.ic}/> {t.l}
            </button>
          );
        })}
      </div>

      {!actief && toon!=="tarieven" && (
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-piggy-bank"/></div>
          <h3>Niet actief in {seizoen}</h3>
          <p>Zet het vinkje hierboven aan zodra jullie ermee beginnen. Tot die tijd wordt er niets
            gerekend, maar je kunt bij Tarieven wel alvast afspreken wat wat kost.</p>
          <button className="knop lijn" onClick={function(){ setToon("tarieven"); }}>
            <i className="fa-solid fa-sliders"/> Tarieven klaarzetten
          </button>
        </div>
      )}

      {actief && toon==="stand" && (stand.rijen.length===0 ? (
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-piggy-bank"/></div>
          <h3>De pot is nog leeg</h3>
          <p>Zodra iemand te laat komt, zich niet afmeldt of een kaart pakt, verschijnt hij hier vanzelf.</p>
        </div>
      ) : (
        <div className="kaart">
          {stand.rijen.map(function(p, i){
            return (
              <div key={p.speler.id} className="boete-rij">
                <span className="boete-plek">{i+1}</span>
                <span className="k-buste" style={{width:30,height:30,flexShrink:0}}>
                  <SpelerBeeld speler={p.speler}/>
                </span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="boete-naam">{p.speler.naam}</div>
                  <div className="boete-sub">
                    {p.aantal + (p.aantal===1?" boete":" boetes")}
                    {p.betaald>0 ? " · " + centenNaarTekst(p.betaald) + " betaald" : ""}
                  </div>
                </div>
                <div className="boete-bedrag" style={{color: p.open>0 ? "var(--gevaar)"
                    : p.open<0 ? "var(--blauw)" : "var(--succes)"}}>
                  {centenNaarTekst(p.open)}
                  <span className="boete-bedrag-sub">{p.open>0?"open":p.open<0?"te veel":"voldaan"}</span>
                </div>
                <button className="knop lijn klein" title="Betaling noteren"
                  onClick={function(){ setBetaling({spelerId:p.speler.id,
                    bedrag: p.open>0 ? (p.open/100).toFixed(2).replace(".",",") : "", notitie:""}); }}>
                  <i className="fa-solid fa-check"/>
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {actief && toon==="regels" && (
        <div className="kaart">
          {/* De samenvatting van wat er niet in de lijst staat, komt
              bovenaan en niet onderaan. Een uitleg die je pas vindt na
              veertig regels scrollen legt niets uit: juist wie zich
              afvraagt waarom de lijst niet optelt tot het totaal
              hierboven, moet dat antwoord meteen zien.

              Wat er wél staat: hoeveel het er zijn en voor welk bedrag
              samen. Wat er niet staat: geen datum, geen trainingsnaam,
              geen bedrag per stuk, geen speler. Het bedrag is er met
              opzet bij — zonder dat getal kun je de lijst naast het
              totaal leggen, een gat zien, en alsnog denken dat er iets
              kwijt is. */}
          {lijst.verborgen > 0 && (
            <div className="boete-regel" onClick={function(){ slotMelding("trainingen"); }}
              style={{cursor:"pointer"}}>
              <span className="boete-reden" style={{background:"var(--goud)"}}>
                <i className="fa-solid fa-lock"/>
              </span>
              <div style={{flex:1,minWidth:0}}>
                <div className="boete-naam">
                  {lijst.verborgen + (lijst.verborgen===1 ? " boete" : " boetes") + " uit trainingen"}
                </div>
                <div className="boete-sub">
                  {slotZin("trainingen") + " Tellen wel mee in het totaal."}
                </div>
              </div>
              <span className="boete-bedrag">{centenNaarTekst(lijst.verborgenBedrag)}</span>
            </div>
          )}
          {regels.length===0 ? (
            <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,margin:0}}>
              Nog geen boetes.
            </p>
          ) : lijst.zichtbaar.map(function(r){
            var sp = spelerVan(r.spelerId), red = boeteReden(r.reden);
            return (
              <div key={r.id} className="boete-regel">
                <span className="boete-reden" style={{background:red.kleur}}>
                  <i className={red.icoon}/>
                </span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="boete-naam">{sp ? sp.naam : "onbekend"}</div>
                  <div className="boete-sub">
                    {boeteRedenLabel(tarieven, r)}{r.wat ? " · " + r.wat : ""}
                    {r.datum ? " · " + formateerDatumKort(r.datum) : ""}
                    {r.automatisch ? "" : " · handmatig"}
                  </div>
                </div>
                <span className="boete-bedrag">{centenNaarTekst(r.bedrag)}</span>
                {!r.automatisch && (
                  <button className="knop gevaar klein" title="Verwijderen"
                    onClick={function(){ wisBoete(r); }}><i className="fa-solid fa-trash"/></button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toon==="tarieven" && (
        <div className="kaart">
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,marginTop:0}}>
            Wat jullie afspreken. Zet een reden uit als jullie daar niet voor beboeten;
            de bijbehorende boetes verdwijnen dan meteen uit de pot.
          </p>
          {BOETE_REDENEN.filter(function(r){ return r.bron!=="hand"; }).map(function(r){
            var t = tarieven[r.id];
            return (
              <div key={r.id} className="boete-tarief">
                <span className="boete-reden" style={{background:r.kleur}}>
                  <i className={r.icoon}/>
                </span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="boete-naam">{r.label}</div>
                  <div className="boete-sub">
                    {r.bron==="presentie" ? "uit de presentielijsten" : "uit de wedstrijdkaarten"}
                  </div>
                </div>
                <input className="formulier-input boete-invoer" value={(t.bedrag/100).toFixed(2).replace(".",",")}
                  disabled={!t.aan} style={t.aan?{}:{opacity:.45}}
                  onChange={function(e){ zetTarief(r.id, {bedrag: tekstNaarCenten(e.target.value)}); }} />
                <label className="deel-schakel" style={{margin:0}}
                  onClick={function(e){ e.preventDefault(); zetTarief(r.id, {aan: !t.aan}); }}>
                  <span className={"doel-vink"+(t.aan?" aan":"")}><i className="fa-solid fa-check"/></span>
                </label>
              </div>
            );
          })}
        </div>
      )}

      {toon==="tarieven" && (
        <div className="kaart" style={{marginTop:10}}>
          <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <span><i className="fa-solid fa-wand-magic-sparkles"/> Eigen boetes</span>
          </div>
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,marginTop:0}}>
            Bedenk zelf waar een boete op staat — een eigen doelpunt, telefoon in de kleedkamer,
            of iets anders geks. Ze staan daarna als snelkeuze klaar als je een boete boekt.
          </p>
          {(tarieven.eigen||[]).map(function(e){
            return (
              <div key={e.id} className="boete-tarief">
                <span className="boete-reden" style={{background:"#7c3aed"}}>
                  <i className="fa-solid fa-star"/>
                </span>
                <div style={{flex:1,minWidth:0}}>
                  <input className="formulier-input" value={e.label} style={{margin:0,padding:"6px 9px",fontSize:13}}
                    onChange={function(ev){
                      var w = ev.target.value;
                      zetEigen(tarieven.eigen.map(function(x){ return x.id===e.id?Object.assign({},x,{label:w}):x; }));
                    }} />
                </div>
                <input className="formulier-input boete-invoer" value={(e.bedrag/100).toFixed(2).replace(".",",")}
                  disabled={!e.aan} style={e.aan?{}:{opacity:.45}}
                  onChange={function(ev){
                    var c = tekstNaarCenten(ev.target.value);
                    zetEigen(tarieven.eigen.map(function(x){ return x.id===e.id?Object.assign({},x,{bedrag:c}):x; }));
                  }} />
                <label className="deel-schakel" style={{margin:0}}
                  onClick={function(ev){ ev.preventDefault();
                    zetEigen(tarieven.eigen.map(function(x){ return x.id===e.id?Object.assign({},x,{aan:!x.aan}):x; }));
                  }}>
                  <span className={"doel-vink"+(e.aan?" aan":"")}><i className="fa-solid fa-check"/></span>
                </label>
                <button className="knop gevaar klein" title="Weghalen"
                  onClick={function(){
                    zetEigen(tarieven.eigen.filter(function(x){ return x.id!==e.id; }));
                    meldGoed("Boete verwijderd. Al geboekte boetes blijven staan.");
                  }}><i className="fa-solid fa-trash"/></button>
              </div>
            );
          })}
          <EigenBoeteToevoegen onToevoegen={voegEigenToe} />
        </div>
      )}

      {nieuweBoete && (
        <BoeteFormulier titel="Losse boete" spelers={spelers} start={nieuweBoete}
          eigen={(tarieven.eigen||[]).filter(function(e){ return e.aan; })}
          velden="boete" onOpslaan={boekBoete} onSluiten={function(){ setNieuweBoete(null); }} />
      )}
      {betaling && (
        <BoeteFormulier titel="Betaling noteren" spelers={spelers} start={betaling}
          velden="betaling" onOpslaan={boekBetaling} onSluiten={function(){ setBetaling(null); }} />
      )}
      {deelOpen && (
        <DeelVenster titel="Boetepot delen"
          varianten={[{id:"pot", label:"Overzicht", tekst: deelBoetepot(stand)}]}
          onSluiten={function(){ setDeelOpen(false); }} />
      )}
    </div>
  );
}

function EigenBoeteToevoegen({ onToevoegen }) {
  const [label, setLabel] = useState("");
  const [bedrag, setBedrag] = useState("");
  function voeg() { if (onToevoegen(label, bedrag)) { setLabel(""); setBedrag(""); } }
  return (
    <div className="boete-tarief" style={{borderBottom:"none",paddingBottom:0}}>
      <span className="boete-reden" style={{background:"var(--grijs)"}}>
        <i className="fa-solid fa-plus"/>
      </span>
      <input className="formulier-input" value={label} placeholder="bijv. Eigen doelpunt"
        style={{flex:1,minWidth:0,margin:0,padding:"6px 9px",fontSize:13}}
        onChange={function(e){ setLabel(e.target.value); }}
        onKeyDown={function(e){ if(e.key==="Enter") voeg(); }} />
      <input className="formulier-input boete-invoer" value={bedrag} placeholder="2,50" inputMode="decimal"
        onChange={function(e){ setBedrag(e.target.value); }}
        onKeyDown={function(e){ if(e.key==="Enter") voeg(); }} />
      <button className="knop klein" onClick={voeg}><i className="fa-solid fa-plus"/></button>
    </div>
  );
}

function BoeteFormulier({ titel, spelers, start, velden, eigen, onOpslaan, onSluiten }) {
  const [form, setForm] = useState(Object.assign({datum: vandaagISO()}, start));
  const set = (k,v) => setForm(function(f){ var n=Object.assign({},f); n[k]=v; return n; });
  const isBoete = velden==="boete";
  return (
    <div className="modal-overlay" style={{zIndex:420}}
      onClick={function(e){ if(e.target===e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="modal-greep"/>
        <div className="modal-titel">{titel}</div>
        <div className="formulier-groep">
          <label className="formulier-label">Wie? *</label>
          <select className="formulier-input" value={form.spelerId||""}
            onChange={function(e){ set("spelerId", e.target.value?Number(e.target.value):null); }}>
            <option value="">Kies een speler…</option>
            {sorteerOpLinie(spelers.slice()).map(function(s){
              return <option key={s.id} value={s.id}>{(s.rugnummer?"#"+s.rugnummer+"  ":"")+s.naam}</option>;
            })}
          </select>
        </div>
        {isBoete && (eigen||[]).length>0 && (
          <div className="formulier-groep">
            <label className="formulier-label">Snelkeuze</label>
            <div className="soort-raster">
              {(eigen||[]).map(function(e){
                var aan = form.reden===e.id;
                return (
                  <button key={e.id} type="button" className={"soort-knop"+(aan?" actief":"")}
                    style={aan?{color:"#7c3aed",background:"var(--vlak-info)"}:{}}
                    onClick={function(){
                      setForm(function(f){ return Object.assign({}, f, {
                        reden: e.id,
                        bedrag: (e.bedrag/100).toFixed(2).replace(".",","),
                        omschrijving: e.label
                      }); });
                    }}>
                    <i className="fa-solid fa-star" style={{color:"#7c3aed"}}/>
                    {e.label + " · " + centenNaarTekst(e.bedrag)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="formulier-rij">
          <div className="formulier-groep">
            <label className="formulier-label">Bedrag in euro's *</label>
            <input className="formulier-input" value={form.bedrag||""} autoFocus inputMode="decimal"
              placeholder="2,50" onChange={function(e){ set("bedrag", e.target.value); }} />
          </div>
          <div className="formulier-groep">
            <label className="formulier-label">Datum</label>
            <input type="date" className="formulier-input" value={form.datum||""}
              onChange={function(e){ set("datum", e.target.value); }} />
          </div>
        </div>
        <div className="formulier-groep">
          <label className="formulier-label">{isBoete ? "Waarvoor?" : "Notitie"}</label>
          <input className="formulier-input" value={(isBoete?form.omschrijving:form.notitie)||""}
            placeholder={isBoete ? "Telefoon in de kleedkamer…" : "Contant, Tikkie…"}
            onChange={function(e){ set(isBoete?"omschrijving":"notitie", e.target.value); }} />
        </div>
        <div className="modal-knoppen">
          <button className="knop lijn" onClick={onSluiten}>Annuleren</button>
          <button className="knop succes" onClick={function(){ onOpslaan(form); }}>
            <i className="fa-solid fa-check"/> Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectiePagina() {
  const [actieveTab,setActieveTab]=useState("spelers");
  const [spelers,setSpelers]=useState(laadSpelers);
  const [gekozen,setGekozen]=useState(null);
  const [formulierOpen,setFormulier]=useState(false);
  const [bewerkSpeler,setBewerkSpeler]=useState(null);

  useEffect(()=>{slaJson(SPELERS_KEY,spelers);},[spelers]);

  function slaSpelerOp(data) {
    setSpelers(l=>{ const b=l.find(s=>s.id===data.id); return b?l.map(s=>s.id===data.id?data:s):[...l,data]; });
    setFormulier(false); setBewerkSpeler(null);
    if(gekozen?.id===data.id) setGekozen(data);
  }

  function verwijderSpeler() {
    const weg = gekozen;
    setSpelers(l=>l.filter(s=>s.id!==weg.id));
    setGekozen(null);
    toon(weg.naam+" verwijderd uit de selectie", {
      actie: function(){ setSpelers(function(l){ return l.concat([weg]); }); }
    });
  }

  return (
    <div>
      {!gekozen&&<div className="tabs">{[{id:"spelers",ic:"fa-solid fa-users",l:"Spelers"},{id:"opstellingen",ic:"fa-solid fa-table-cells-large",l:"Opstellingen"},{id:"tactieken",ic:"fa-solid fa-chess",l:"Tactieken"},{id:"blessures",ic:"fa-solid fa-briefcase-medical",l:"Blessures"},{id:"boetepot",ic:"fa-solid fa-piggy-bank",l:"Boetepot"}].map(t=><button key={t.id} className={"tab-knop "+(actieveTab===t.id?"actief":"")} onClick={()=>setActieveTab(t.id)}><i className={t.ic}/>{" "}{t.l}</button>)}</div>}
      {actieveTab==="spelers"&&!gekozen&&<SpelersLijst spelers={spelers} onSelecteer={setGekozen} onNieuw={()=>{setBewerkSpeler(null);setFormulier(true);}} />}
      {actieveTab==="spelers"&&gekozen&&<SpelerProfiel speler={gekozen} onTerug={()=>setGekozen(null)}
        onBewerken={()=>{setBewerkSpeler(gekozen);setFormulier(true);}}
        onVerwijderen={verwijderSpeler}
        onOpslaanSpeler={function(sp){ slaSpelerOp(sp); setGekozen(sp); }} />}
      {actieveTab==="opstellingen"&&<OpstellingenTab spelers={spelers} />}
      {actieveTab==="tactieken"&&<TactiekenTab />}
      {actieveTab==="blessures"&&<BlessuresTab spelers={spelers} />}
      {actieveTab==="boetepot"&&<BoetepotTab spelers={spelers} />}
      {formulierOpen&&<SpelerFormulier speler={bewerkSpeler} onOpslaan={slaSpelerOp} onSluiten={()=>{setFormulier(false);setBewerkSpeler(null);}} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function waKnopSVG() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
}

function Dashboard({ navigeer }) {
  const spelers      = laadSpelers();
  const wedstrijden  = laadWedstrijden();
  const trainingen   = zichtbareTrainingen();
  const activiteiten = laadActiviteiten();
  const afwezigheden = laadAfwezigheden();
  const [deelOpen, setDeelOpen] = useState(false);

  const gespeeld = tellendeWedstrijden(wedstrijden);
  const rij      = eigenStandRij(wedstrijden);
  const punten   = rij.winst*3 + rij.gelijk;
  const saldo    = rij.doelVoor - rij.doelTegen;

  const volgende = wedstrijden.filter(function(w){ return w.status==="gepland"; })
    .sort(function(a,b){ return new Date(a.datum)-new Date(b.datum); })[0] || null;
  const laatste = gespeeld.slice()
    .sort(function(a,b){ return new Date(b.datum)-new Date(a.datum); })[0] || null;

  const vwVarianten = volgende ? deelVariantenWedstrijd(volgende, spelers, wedstrijden) : [];

  /* ── Alles wat eraan komt, op één hoop en op datum ── */
  const vandaag = new Date(); vandaag.setHours(0,0,0,0);
  const grens = new Date(vandaag); grens.setDate(grens.getDate()+21);
  function binnenkort(datum) {
    var d = parseerDatum(datum);
    return d && d>=vandaag && d<=grens;
  }
  var komt = [];
  wedstrijden.forEach(function(w){
    if (w.status==="gepland" && binnenkort(w.datum))
      komt.push({soort:"wedstrijd", datum:w.datum, tijd:w.tijd, titel:"vs. "+w.tegenstander,
                 sub:(w.thuis?"Thuis":"Uit")+(w.locatie?" · "+w.locatie:""),
                 icoon:"fa-solid fa-futbol", kleur:"var(--blauw)", pagina:"wedstrijden"});
  });
  trainingen.forEach(function(t){
    if (binnenkort(t.datum))
      komt.push({soort:"training", datum:t.datum, tijd:t.tijd, titel:trainingTitel(t),
                 sub:[t.locatie, t.duur?t.duur+" min":"",
                      (t.onderdelen||[]).length?t.onderdelen.length+" onderdelen":""]
                     .filter(Boolean).join(" · "),
                 icoon:"fa-solid fa-person-running", kleur:"var(--blauw-licht)", pagina:"trainingen"});
  });
  activiteiten.forEach(function(a){
    /* Ook herhalende activiteiten meenemen, dag voor dag nakijken */
    for (var d=new Date(vandaag); d<=grens; d.setDate(d.getDate()+1)) {
      var sleutel = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      if (activiteitOpDatum(a, sleutel)) {
        var s = activiteitSoort(a.soort);
        komt.push({soort:"activiteit", datum:sleutel, tijd:a.heleDag?"":a.tijd, titel:a.titel,
                   sub:s.label+(a.locatie?" · "+a.locatie:""),
                   icoon:s.icoon, kleur:s.kleur, pagina:"agenda"});
      }
    }
  });
  komt.sort(function(a,b){
    if (a.datum!==b.datum) return a.datum<b.datum ? -1 : 1;
    return (a.tijd||"99")<(b.tijd||"99") ? -1 : 1;
  });
  komt = komt.slice(0,6);

  /* ── Uitblinkers ── */
  function topVan(kies) {
    var beste=null, waarde=-1;
    spelers.forEach(function(s){
      var v = kies(s);
      if (v!==null && v>waarde) { waarde=v; beste=s; }
    });
    return waarde>0 ? {speler:beste, waarde:waarde} : null;
  }
  const topScorer  = topVan(function(s){ return berekenSpelerStats(s.id, wedstrijden, s.stats).doelpunten; });
  const topAssist  = topVan(function(s){ return berekenSpelerStats(s.id, wedstrijden, s.stats).assists; });
  const topCijfer  = topVan(function(s){ return gemiddeldCijfer(s.id, wedstrijden); });

  /* ── Wie is er niet inzetbaar ── */
  const uitDeRoulatie = spelers.filter(function(s){ return s.beschikbaar && s.beschikbaar!=="fit"; });

  /* ── Opkomst op de training ──
     Rekent over `trainingen` hierboven, dus zonder de module blijft
     metOpkomst leeg, blijft opkomst null en valt het hele blokje
     hieronder weg. Een percentage is óók een trainingsgegeven: het
     vertelt hoeveel er getraind is en hoe trouw de selectie komt. */
  const metOpkomst = trainingen.filter(function(t){ return (t.aanwezigheid||[]).length; });
  var opkomst = null;
  if (metOpkomst.length) {
    var aanw=0, tot=0;
    metOpkomst.forEach(function(t){
      var o = opkomstVan(t, afwezigheden);
      if (o) { aanw += o.aanwezig; tot += o.totaal; }
    });
    opkomst = tot ? Math.round(aanw/tot*100) : null;
  }

  const vorm = gespeeld.slice().sort(function(a,b){ return new Date(a.datum)-new Date(b.datum); })
    .slice(-5).map(function(w){ return resultaat(w); });

  const teller = volgende ? dagenTot(volgende.datum) : "";

  return (
    <div>
      <div className="pagina-header">
        <div className="pagina-header-tekst">
          <div className="eyebrow">{teamNaamVol()}</div>
          <h2>Dashboard</h2>
          <p>{"Seizoen "+inst().seizoen}</p>
        </div>
      </div>

      {/* ── Volgende wedstrijd ── */}
      {volgende ? (
        <div className="volgende-wedstrijd">
          <div className="vw-boven">
            <span className="volgende-label"><i className="fa-solid fa-futbol"/> Volgende wedstrijd</span>
            {teller && <span className="vw-teller">{teller}</span>}
          </div>
          <div className="volgende-tegenstander">vs. {volgende.tegenstander}</div>
          <div className="volgende-details">
            <span><i className="fa-solid fa-calendar-days"/> {datumLang(volgende.datum)}</span>
            {volgende.tijd && <span><i className="fa-solid fa-clock"/> {volgende.tijd}</span>}
            <span><i className="fa-solid fa-location-dot"/> {volgende.thuis?"Thuis":"Uit"}{volgende.locatie?" · "+volgende.locatie:""}</span>
          </div>
          <div className="vw-knoppen">
            <button className="knop lijn klein vw-knop" onClick={function(){ navigeer("wedstrijden"); }}>
              <i className="fa-solid fa-arrow-right"/> Naar de wedstrijd
            </button>
            <button className="knop wa vw-knop" style={{marginTop:0,width:"auto"}} onClick={function(){setDeelOpen(true);}}>
              {waKnopSVG()} Delen
            </button>
          </div>
        </div>
      ) : (
        <div className="kaart" style={{textAlign:"center",padding:"26px 18px"}}>
          <div style={{fontSize:26,color:"var(--grijs-donker)",marginBottom:9}}><i className="fa-solid fa-calendar-plus"/></div>
          <div style={{fontSize:15,fontWeight:700,fontFamily:"'Helvetica Neue',Arial",marginBottom:5}}>Geen wedstrijd gepland</div>
          <button className="knop lijn klein" onClick={function(){ navigeer("wedstrijden"); }}>Wedstrijd toevoegen</button>
        </div>
      )}

      {/* ── Laatste uitslag ── */}
      {laatste && (
        <div className="kaart db-uitslag" onClick={function(){ navigeer("wedstrijden"); }}>
          <div className="kaart-titel" style={{justifyContent:"space-between"}}>
            <span><i className="fa-solid fa-clock-rotate-left"/> Laatst gespeeld</span>
            <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--grijs-donker)",fontSize:11}}>
              {datumLang(laatste.datum)}
            </span>
          </div>
          <div className="db-uitslag-rij">
            <span className="db-team">{laatste.thuis ? teamNaamVol() : laatste.tegenstander}</span>
            <span className={"db-score "+resultaat(laatste)}>
              {(laatste.thuis?laatste.score.fch:laatste.score.teg)+" – "+(laatste.thuis?laatste.score.teg:laatste.score.fch)}
            </span>
            <span className="db-team rechts">{laatste.thuis ? laatste.tegenstander : teamNaamVol()}</span>
          </div>
          {(function(){
            var eigen = (laatste.scorers||[]).filter(function(s){ return s.eigenTeam; });
            var motm = laatste.motm ? spelers.filter(function(s){ return s.id===laatste.motm; })[0] : null;
            if (!eigen.length && !motm) return null;
            return (
              <div className="db-uitslag-extra">
                {eigen.length>0 && (
                  <span><i className="fa-solid fa-futbol" style={{color:"var(--blauw)"}}/>
                    {" "+eigen.map(function(s){ return s.naam.split(" ")[0]; }).join(", ")}</span>
                )}
                {motm && (
                  <span><i className="fa-solid fa-star" style={{color:"#f5c518"}}/> {motm.naam}</span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Wat komt eraan ── */}
      <div className="kaart">
        <div className="kaart-titel" style={{justifyContent:"space-between"}}>
          <span><i className="fa-solid fa-list-check"/> Komende drie weken</span>
          <button className="knop lijn klein" style={{padding:"4px 10px",fontSize:11}}
            onClick={function(){ navigeer("agenda"); }}>Agenda</button>
        </div>
        {komt.length===0 ? (
          <div style={{fontSize:13,color:"var(--grijs-donker)",padding:"6px 0"}}>
            Niets gepland de komende drie weken.
          </div>
        ) : komt.map(function(k,i){
          return (
            <div key={i} className="db-agenda-rij" onClick={function(){ navigeer(k.pagina); }}>
              <span className="db-agenda-datum">
                <span className="db-dag">{parseerDatum(k.datum) ? parseerDatum(k.datum).getDate() : "–"}</span>
                <span className="db-mnd">{parseerDatum(k.datum) ? MAANDEN_VOL[parseerDatum(k.datum).getMonth()].slice(0,3) : ""}</span>
              </span>
              <span className="db-agenda-icoon" style={{background:k.kleur}}><i className={k.icoon}/></span>
              <span style={{flex:1,minWidth:0}}>
                <span className="db-agenda-titel">{k.titel}</span>
                <span className="db-agenda-sub">
                  {k.tijd ? k.tijd+(k.sub?" · "+k.sub:"") : (k.sub||"hele dag")}
                </span>
              </span>
              {/* Trainingen komen hier niet meer in terecht als ze niet
                  in je pakket zitten: deze lijst leest zichtbareTrainingen()
                  en die geeft er dan geen. Wedstrijden, agenda en
                  activiteiten horen bij de basis, dus in de praktijk staat
                  dit slotje er nooit. Het blijft staan als vangnet: komt er
                  ooit een rij bij die naar een afgeschermd scherm wijst,
                  dan zegt hij dat hier vanzelf, in plaats van stilletjes
                  een tik te weigeren. */}
              {!magPagina(k.pagina) && <SlotJe />}
              <span className="db-agenda-tel">{dagenTot(k.datum)}</span>
            </div>
          );
        })}
      </div>

      {/* ── Trainingen, voor wie er niet bij mag ────────────────
          Dit blok staat er juist wél als het niet in je pakket zit.
          Weglaten is rustiger om te bouwen en rustiger om te zien,
          maar het lost het probleem van de klant niet op — het
          verbergt het. Wie nooit ziet dat er trainingen met
          aanwezigheid en oefenstof bestaan, weet niet dat hij iets
          mist en gaat er dus ook nooit voor betalen. Dan hoort
          iemand het over een jaar aan de bar van een andere club, en
          dat is een slecht moment om daarachter te komen.

          Leeg laten is geen alternatief: een kaart met niets erin is
          een storing, geen aanbod. Er staat dus in één zin wat het
          is en bij welk pakket het hoort. */}
      {!magPagina("trainingen") && (
        <div className="kaart db-slot" role="button" tabIndex={0}
          aria-label={slotLabel("Trainingen", "trainingen")}
          onClick={function(){ navigeer("trainingen"); }}
          onKeyDown={function(e){ if (e.key==="Enter"||e.key===" ") { e.preventDefault(); navigeer("trainingen"); } }}>
          <div className="kaart-titel" style={{justifyContent:"space-between"}}>
            <span><i className="fa-solid fa-person-running"/> Trainingen</span>
            <SlotJe />
          </div>
          <div className="db-slot-tekst">
            Trainingen inplannen, aanwezigheid bijhouden en je oefenstof vastleggen.
            {" "+slotZin("trainingen")}
          </div>
        </div>
      )}

      {/* ── Seizoen in cijfers ── */}
      <div className="stat-raster">
        <div className="stat-kaart primair"><div className="stat-getal">{punten}</div><div className="stat-label">Punten</div></div>
        <div className="stat-kaart"><div className="stat-getal">{rij.gespeeld}</div><div className="stat-label">Gespeeld</div></div>
        <div className="stat-kaart"><div className="stat-getal" style={{color:"var(--succes)"}}>{rij.winst}</div><div className="stat-label">Gewonnen</div></div>
        <div className="stat-kaart"><div className="stat-getal" style={{color:"var(--gevaar)"}}>{rij.verlies}</div><div className="stat-label">Verloren</div></div>
        <div className="stat-kaart"><div className="stat-getal">{rij.doelVoor}</div><div className="stat-label">Doelpunten</div></div>
        <div className="stat-kaart"><div className="stat-getal">{rij.doelTegen}</div><div className="stat-label">Tegen</div></div>
        <div className="stat-kaart">
          <div className="stat-getal" style={{color: saldo>0?"var(--succes)":saldo<0?"var(--gevaar)":"inherit"}}>
            {(saldo>0?"+":"")+saldo}
          </div>
          <div className="stat-label">Saldo</div>
        </div>
        <div className="stat-kaart accent"><div className="stat-getal">{spelers.length}</div><div className="stat-label">Spelers</div></div>
      </div>

      {/* ── Vorm ── */}
      {vorm.length>0 && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-wave-square"/> Vorm</div>
          <div className="db-vorm">
            {vorm.map(function(r,i){
              return <span key={i} className={"db-vorm-bol "+r}>{r==="winst"?"W":r==="verlies"?"V":"G"}</span>;
            })}
            <span style={{fontSize:12,color:"var(--grijs-donker)",marginLeft:6}}>
              {"laatste "+vorm.length+" wedstrijd"+(vorm.length===1?"":"en")+", oudste links"}
            </span>
          </div>
        </div>
      )}

      {/* ── Uitblinkers ── */}
      {(topScorer||topAssist||topCijfer||opkomst!==null) && (
        <div className="db-uitblinkers">
          {topScorer && (
            <div className="db-blink" onClick={function(){ navigeer("selectie"); }}>
              <div className="db-blink-kop">Topscorer</div>
              <div className="db-blink-rij">
                <span className="rol-bol" style={{width:34,height:34}}><SpelerBeeld speler={topScorer.speler}/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span className="db-blink-naam">{topScorer.speler.naam}</span>
                  <span className="db-blink-sub">{topScorer.waarde+" doelpunt"+(topScorer.waarde===1?"":"en")}</span>
                </span>
                <span className="db-blink-getal" style={{color:"var(--blauw)"}}>{topScorer.waarde}</span>
              </div>
            </div>
          )}
          {topAssist && (
            <div className="db-blink" onClick={function(){ navigeer("selectie"); }}>
              <div className="db-blink-kop">Meeste assists</div>
              <div className="db-blink-rij">
                <span className="rol-bol" style={{width:34,height:34}}><SpelerBeeld speler={topAssist.speler}/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span className="db-blink-naam">{topAssist.speler.naam}</span>
                  <span className="db-blink-sub">{topAssist.waarde+" assist"+(topAssist.waarde===1?"":"s")}</span>
                </span>
                <span className="db-blink-getal" style={{color:"var(--blauw-licht)"}}>{topAssist.waarde}</span>
              </div>
            </div>
          )}
          {topCijfer && (
            <div className="db-blink" onClick={function(){ navigeer("selectie"); }}>
              <div className="db-blink-kop">Hoogste cijfer</div>
              <div className="db-blink-rij">
                <span className="rol-bol" style={{width:34,height:34}}><SpelerBeeld speler={topCijfer.speler}/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span className="db-blink-naam">{topCijfer.speler.naam}</span>
                  <span className="db-blink-sub">gemiddeld over het seizoen</span>
                </span>
                <span className="db-blink-getal" style={{color:cijferKleur(topCijfer.waarde)}}>{topCijfer.waarde.toFixed(1)}</span>
              </div>
            </div>
          )}
          {opkomst!==null && (
            <div className="db-blink" onClick={function(){ navigeer("trainingen"); }}>
              <div className="db-blink-kop">Trainingsopkomst</div>
              <div className="db-blink-rij">
                <span className="db-blink-cirkel"><i className="fa-solid fa-person-running"/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span className="db-blink-naam">{opkomst+"%"}</span>
                  <span className="db-blink-sub">{"over "+metOpkomst.length+" training"+(metOpkomst.length===1?"":"en")}</span>
                </span>
              </div>
              <div className="db-balk"><span style={{width:opkomst+"%",
                background: opkomst>=85?"var(--succes)":opkomst>=70?"var(--oranje)":"var(--gevaar)"}}/></div>
            </div>
          )}
        </div>
      )}

      {/* ── Niet inzetbaar ── */}
      {uitDeRoulatie.length>0 && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-triangle-exclamation" style={{color:"var(--oranje)"}}/> Let op</div>
          <div className="db-let-op">
            {uitDeRoulatie.map(function(s){
              var b = beschikbaarheidInfo(s.beschikbaar);
              return (
                <span key={s.id} className="db-let-op-item" onClick={function(){ navigeer("selectie"); }}>
                  <span className="rol-bol" style={{width:26,height:26}}><SpelerBeeld speler={s}/></span>
                  <span style={{fontWeight:700}}>{s.naam.split(" ")[0]}</span>
                  <span style={{color:b.kleur,fontWeight:700}}><i className={b.icoon}/> {b.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Wie is er binnenkort jarig ── */}
      {(function(){
        var jarig = komendeVerjaardagen(spelers, vandaagISO(), 3);
        if (!jarig.length) return null;
        return (
          <div className="kaart">
            <div className="kaart-titel"><i className="fa-solid fa-cake-candles"/> Binnenkort jarig</div>
            {jarig.map(function(v){
              var sp = spelers.filter(function(s){ return s.id===v.spelerId; })[0];
              var dagen = Math.round((parseerDatum(v.datum) - parseerDatum(vandaagISO())) / 86400000);
              return (
                <div key={v.id} className="jarig-rij">
                  <span className="k-buste" style={{width:30,height:30,flexShrink:0}}>
                    <SpelerBeeld speler={sp}/>
                  </span>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="boete-naam">{v.naam}</div>
                    <div className="boete-sub">{formateerDatum(v.datum) + " · wordt " + v.wordt}</div>
                  </div>
                  <span className="jarig-tel">
                    {dagen===0 ? "vandaag" : dagen===1 ? "morgen" : "over " + dagen + " dagen"}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Snelkoppelingen ── */}
      <div className="kaart">
        <div className="kaart-titel">Snelkoppelingen</div>
        <div className="snelkoppeling-raster">
          {[{icoon:"fa-solid fa-users",naam:"Selectie",p:"selectie"},
            {icoon:"fa-solid fa-futbol",naam:"Wedstrijden",p:"wedstrijden"},
            {icoon:"fa-solid fa-person-running",naam:"Training",p:"trainingen"},
            {icoon:"fa-solid fa-calendar-days",naam:"Agenda",p:"agenda"},
            {icoon:"fa-solid fa-chart-bar",naam:"Statistieken",p:"statistieken"},
            {icoon:"fa-solid fa-stopwatch",naam:"Live",p:"live",kleur:"#dc3545"},
            {icoon:"fa-solid fa-map",naam:"Clubhuis",p:"clubhuis",kleur:"#16a34a"}].map(function(s){
            /* Deze tegels wijzen naar dezelfde zeven schermen als de
               knoppen in het menu. Zonder slotje zou je hier op iets
               tikken dat zich anders gedraagt dan de knop ernaast, en
               dat is precies het soort verrassing dat niet mag. */
            const open = magPagina(s.p);
            /* role en tabIndex alleen op een vergrendelde tegel. Een
               tegel die wél mag blijft precies wat hij was — er is
               vandaag geen reden om die zeven tegels te verbouwen, en
               een verbouwing die meelift op een andere verbouwing is
               een verbouwing die niemand heeft nagekeken. Op een
               vergrendelde tegel is het er wél nodig: zonder role
               slaat een voorleeshulp het aria-label over, en dan is
               het slotje alleen een kleurtje. */
            return (
              <div key={s.p} className="snelkoppeling"
                role={open?undefined:"button"} tabIndex={open?undefined:0}
                aria-label={open?undefined:slotLabel(s.naam, PAGINA_MODULE[s.p])}
                onKeyDown={open?undefined:function(e){ if (e.key==="Enter"||e.key===" ") { e.preventDefault(); navigeer(s.p); } }}
                onClick={function(){navigeer(s.p);}}>
                <div className="snelkoppeling-icoon">
                  <i className={s.icoon} style={s.kleur?{color:s.kleur}:{}}/>
                  {!open && <SlotJe badge />}
                </div>
                <div className="snelkoppeling-naam">{s.naam}</div>
              </div>
            );
          })}
        </div>
      </div>

      {deelOpen && volgende && (
        <DeelVenster titel="Volgende wedstrijd delen" varianten={vwVarianten}
          onSluiten={function(){setDeelOpen(false);}} />
      )}
    </div>
  );
}

/* Voetje dat naar links of naar rechts wijst. De grote teen zit aan de
   binnenkant, dus voor een rechtervoet links in beeld. */
function VoetIcoon({ kant, grootte }) {
  const s = grootte || 15;
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true"
      style={{display:"block", transform: kant==="links" ? "scaleX(-1)" : "none"}}>
      <path fill="currentColor" d="M7.4 12.6c0-1.7.6-2.8 1.4-3.6 1-1 2-1.4 3.2-1.4s2.2.4 3.2 1.4c.8.8 1.4 1.9 1.4 3.6 0 1.3-.3 2.2-.6 3.1-.3.9-.4 1.6-.4 2.3 0 1.9-1.5 3-3.6 3s-3.6-1.1-3.6-3c0-.7-.1-1.4-.4-2.3-.3-.9-.6-1.8-.6-3.1z"/>
      <circle fill="currentColor" cx="8.5" cy="5.3" r="1.55"/>
      <circle fill="currentColor" cx="11.2" cy="4.3" r="1.35"/>
      <circle fill="currentColor" cx="13.6" cy="4.6" r="1.15"/>
      <circle fill="currentColor" cx="15.6" cy="5.6" r="1"/>
      <circle fill="currentColor" cx="17.1" cy="7.2" r=".85"/>
    </svg>
  );
}

const BENEN = [
  {id:"Rechts", label:"Rechts", kant:"rechts"},
  {id:"Links",  label:"Links",  kant:"links"},
  {id:"Beide",  label:"Beide",  kant:"beide"}
];
function beenInfo(v) { return BENEN.filter(function(b){ return b.id===v; })[0] || null; }

/* vandaagISO stond sinds P4 stap 3/4 nog in src/app.jsx (gemerkt als
   "statistieken-achterstand"); bij narekenen voor stap 8 bleek hij daar
   niet gebruikt te worden, wel hier en in src/domein/opkomst.js. Zie de
   bestandskop hierboven. */
function vandaagISO() {
  var d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
