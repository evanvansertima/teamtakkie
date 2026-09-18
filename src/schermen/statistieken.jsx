/* ══════════════════════════════════════════════════════════════
   STATISTIEKEN/GRAFIEKEN — team- en individuele cijfers, live
   wedstrijdanalyse, stand, en de vier grafiekbouwstenen eronder
   ─────────────────────────────────────────────────────────────
   Verplaatst uit src/app.jsx naar hier op 17 september 2026 (P4 stap 3
   van docs/p4-stappenplan.md — "isolatie: hoog"). Geen import/export:
   tools/bouw.js plakt dit bestand (SCHERM_VOLGORDE) na gedeeld.jsx,
   onboarding.jsx en instellingen.jsx en vóór src/app.jsx aan elkaar,
   dus alles hieronder is nog altijd gewoon top-level function in
   dezelfde scope als src/app.jsx. Dit is een verhuizing, geen
   herschrijving: dezelfde tekst, dezelfde comments.

   DE OPKOMST-SAMENVOEGING IS AL EERDER GEDAAN, NIET HIER
   IndividuStatistieken rekent trainPct via opkomstVan() uit
   src/domein/opkomst.js (samenvoeging van eerder op 17 september,
   "P4 stap 1 t/m 4" — zie tests/opkomst.test.js, groep (d)/(h)). Die
   aanroep blijft werken: DOMEIN_VOLGORDE plakt src/domein/opkomst.js
   vóór de schermmodules in tools/bouw.js, dus opkomstVan bestaat al in
   dezelfde scope tegen de tijd dat IndividuStatistieken hem aanroept.
   Deze verplaatsing verandert daar niets aan.

   TESTAANPASSING BIJ DEZE STAP
   tests/opkomst.test.js knipte de trainPct- en aanwPct-rekenblokken
   (in IndividuStatistieken resp. TeamStatistieken) rechtstreeks uit
   src/app.jsx. Beide blokken verhuizen hier mee, dus is een derde,
   met naam genoemde bronlezing toegevoegd (src/schermen/
   statistieken.jsx) naast de bestaande voor app.jsx — zelfde patroon
   als bij P4 stap 1 en 2 met magNieuwTeam(). Het Dashboard-
   opkomstblokje (vijfde variant, ook in die test) bleef ongemoeid: het
   staat in Dashboard, dat geen onderdeel is van deze stap.

   VANGNET
   "statistieken" en "statistieken-individu" in tools/gouden-
   origineel.js bewaken dit scherm al specifiek. Verwachting van deze
   verplaatsing: volledig identiek — geen gedragswijziging, alleen een
   andere plek voor dezelfde tekst. Bekende blinde vlek (niet door deze
   stap verholpen): de tabbladen Team/Stand/Live binnen Statistieken
   zelf zijn niet met een eigen opname gedekt — zie docs/p4-stappenplan.md
   §1, stap 3.

   Zie docs/p4-stappenplan.md §1 (stap 3) en §3 voor de volledige
   redenering. */

// ── TEAM STATISTIEKEN ──────────────────────────────────────
function TeamStatistieken() {
  const wedstrijden = laadWedstrijden();
  const spelers = laadSpelers();
  const trainingen = laadTrainingen();
  const activiteiten = laadActiviteiten();
  const afwezigheden = laadAfwezigheden();
  const [presFilter, setPresFilter] = useState("alles");
  const [alleKolommen, setAlleKolommen] = useState(false);
  const gespeeld = tellendeWedstrijden(wedstrijden);
  const nietGeteld = wedstrijden.filter(function(w){
    return w.status==="gespeeld" && !wedstrijdTelt(w);
  }).length;
  const gewonnen = gespeeld.filter(function(w){return w.score.fch>w.score.teg;}).length;
  const gelijk   = gespeeld.filter(function(w){return w.score.fch===w.score.teg;}).length;
  const verloren  = gespeeld.filter(function(w){return w.score.fch<w.score.teg;}).length;
  const punten    = gewonnen*3+gelijk;
  const doelVoor  = gespeeld.reduce(function(s,w){return s+(w.score.fch||0);},0);
  const doelTegen = gespeeld.reduce(function(s,w){return s+(w.score.teg||0);},0);
  const cleanSheets = gespeeld.filter(function(w){return w.score.teg===0;}).length;
  const geelKaarten = gespeeld.reduce(function(s,w){return s+(w.kaarten||[]).filter(function(k){return k.type==="geel";}).length;},0);
  const roodKaarten = gespeeld.reduce(function(s,w){return s+(w.kaarten||[]).filter(function(k){return k.type==="rood";}).length;},0);
  const ppW = gespeeld.length>0 ? (punten/gespeeld.length).toFixed(1) : "-";
  const gemVoor = gespeeld.length>0 ? (doelVoor/gespeeld.length).toFixed(1) : "-";
  const gemTegen = gespeeld.length>0 ? (doelTegen/gespeeld.length).toFixed(1) : "-";
  const doelSaldo = doelVoor - doelTegen;
  const metGeboortedatum = spelers.filter(function(p){return p.geboortedatum;});
  const gemLeeftijd = metGeboortedatum.length>0
    ? (metGeboortedatum.reduce(function(s,p){return s+(leeftijdUitDatum(p.geboortedatum)||0);},0)/metGeboortedatum.length).toFixed(1)
    : "-";
  const chronologisch = gespeeld.slice().sort(function(a,b){ return new Date(a.datum)-new Date(b.datum); });
  const laatste10 = chronologisch.slice(-10);
  const vormLabels = laatste10.map(function(w){ return formateerDatumKort(w.datum).split(" ")[0]; });
  const doelVoorReeks  = laatste10.map(function(w){ return Number(w.score.fch)||0; });
  const doelTegenReeks = laatste10.map(function(w){ return Number(w.score.teg)||0; });
  let loopPunten = 0;
  const puntenVerloop = chronologisch.map(function(w){
    loopPunten += w.score.fch>w.score.teg ? 3 : w.score.fch===w.score.teg ? 1 : 0;
    return loopPunten;
  });
  const puntenLabels = chronologisch.map(function(w,i){ return String(i+1); });
  const vormReeks = chronologisch.slice(-8).map(function(w){
    return w.score.fch>w.score.teg ? "W" : w.score.fch===w.score.teg ? "G" : "V";
  });
  const trainingenChrono = trainingen.slice().filter(function(t){
    return t.aanwezigheid && t.aanwezigheid.length>0;
  }).sort(function(a,b){ return new Date(a.datum)-new Date(b.datum); }).slice(-10);
  const opkomstReeks = trainingenChrono.map(function(t){
    var o = opkomstVan(t, afwezigheden); return o ? o.pct : 0;
  });
  const opkomstLabels = trainingenChrono.map(function(t){ return formateerDatumKort(t.datum).split(" ")[0]; });

  /* Presentie over trainingen, wedstrijden en activiteiten samen */
  const alleGebeurtenissen = presentieGebeurtenissen(wedstrijden, trainingen, activiteiten);
  const gefilterdeGeb = alleGebeurtenissen.filter(function(g){
    return presFilter==="alles" || g.soort===presFilter;
  });
  /* Standaard de laatste twaalf, want breder past niet op een scherm */
  const presGeb = alleKolommen ? gefilterdeGeb : gefilterdeGeb.slice(-12);
  const presTabel = presentieTabel(spelers, presGeb, afwezigheden);
  const presFilterLabel = PRESENTIE_SOORTEN.filter(function(s){ return s.id===presFilter; })[0].label;
  const aantalPerSoort = PRESENTIE_SOORTEN.reduce(function(o,s){
    o[s.id] = s.id==="alles" ? alleGebeurtenissen.length
      : alleGebeurtenissen.filter(function(g){ return g.soort===s.id; }).length;
    return o;
  }, {});

  /* Gewogen, niet het gemiddelde van percentages (besluit Evan,
     17 sep. 2026): alle meetellende aanwezig/totaal over alle
     trainingen eerst bij elkaar optellen, dan pas delen. Een training
     met een volle groep weegt zo zwaarder dan een avond met drie man.
     opkomstVan regelt zelf al dat een lege presentielijst en een
     niet-meetellende afwezigheidsperiode buiten teller én noemer
     vallen — hier alleen nog optellen. */
  let totAanwT = 0, totTotT = 0;
  trainingen.forEach(function(t){
    var o = opkomstVan(t, afwezigheden);
    if (o) { totAanwT += o.aanwezig; totTotT += o.totaal; }
  });
  const aanwPct = totTotT ? Math.round(totAanwT/totTotT*100) : 0;
  return (
    <div>
      {/* Resultaten */}
      {(function(){
        var mots = motsRanglijst(spelers, wedstrijden);
        if (!mots.length) return null;
        return (
          <div className="kaart" style={{marginBottom:14}}>
            <div className="kaart-titel"><i className="fa-solid fa-star"/> Man of the Season</div>
            <p style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.5,margin:"0 0 10px"}}>
              Drie punten per keer man of the match, plus een punt voor elk wedstrijdcijfer
              van een acht of hoger. Oefenwedstrijden tellen niet mee.
            </p>
            {mots.slice(0, 8).map(function(r){
              return (
                <div key={r.speler.id} className="mots-rij">
                  <span className={"mots-plek"+(r.plek===1?" goud":r.plek===2?" zilver":r.plek===3?" brons":"")}>
                    {r.plek}
                  </span>
                  <span className="k-buste" style={{width:30,height:30,flexShrink:0}}>
                    <SpelerBeeld speler={r.speler}/>
                  </span>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="boete-naam">{r.speler.naam}</div>
                    <div className="boete-sub">
                      {r.motm + (r.motm===1?"× man of the match":"× man of the match")}
                      {r.hoog ? " · " + r.hoog + "× een acht of hoger" : ""}
                      {r.gemiddelde !== null ? " · gemiddeld " + r.gemiddelde.toFixed(1) : ""}
                    </div>
                  </div>
                  <span className="mots-punten">{r.punten}<span>ptn</span></span>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-trophy"/> Resultaten</div>
        {nietGeteld>0 && (
          <p style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.5,margin:"0 0 10px"}}>
            <i className="fa-solid fa-circle-info"/>{" "}
            {nietGeteld===1
              ? "1 oefenwedstrijd of toernooi telt hier niet in mee."
              : nietGeteld+" oefenwedstrijden en toernooien tellen hier niet in mee."}
          </p>
        )}
        <div className="seizoen-balk" style={{marginBottom:14}}>
          <div className="seizoen-item"><div className="seizoen-getal" style={{color:"var(--succes)"}}>{gewonnen}</div><div className="seizoen-label">Gewonnen</div></div>
          <div className="seizoen-divider"/>
          <div className="seizoen-item"><div className="seizoen-getal" style={{color:"var(--grijs-donker)"}}>{gelijk}</div><div className="seizoen-label">Gelijk</div></div>
          <div className="seizoen-divider"/>
          <div className="seizoen-item"><div className="seizoen-getal" style={{color:"var(--gevaar)"}}>{verloren}</div><div className="seizoen-label">Verloren</div></div>
          <div className="seizoen-divider"/>
          <div className="seizoen-item"><div className="seizoen-getal">{gespeeld.length}</div><div className="seizoen-label">Gespeeld</div></div>
        </div>
        <div className="stat-raster">
          <div className="stat-kaart primair"><div className="stat-getal">{punten}</div><div className="stat-label">Punten</div></div>
          <div className="stat-kaart accent"><div className="stat-getal">{ppW}</div><div className="stat-label">Punten / wedstrijd</div></div>
        </div>
        <div className="stat-raster-3">
          <div className="stat-pill"><div className="stat-pill-getal" style={{color:doelSaldo>=0?"var(--succes)":"var(--gevaar)"}}>{doelSaldo>0?"+":""}{doelSaldo}</div><div className="stat-pill-label">Doelsaldo</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{doelVoor}</div><div className="stat-pill-label">Doelp. voor</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{doelTegen}</div><div className="stat-pill-label">Doelp. tegen</div></div>
        </div>
      </div>
      {/* Vorm */}
      {vormReeks.length>0 && (
        <div className="kaart grafiek-kaart">
          <div className="kaart-titel"><i className="fa-solid fa-wave-square"/> Vorm (laatste {vormReeks.length})</div>
          <div className="vorm-rij">
            {vormReeks.map(function(r,i){
              const kleur = r==="W" ? "var(--succes)" : r==="G" ? "var(--grijs-donker)" : "var(--gevaar)";
              return <div key={i} className="vorm-bol" style={{background:kleur}}>{r}</div>;
            })}
          </div>
          <div style={{textAlign:"center",fontSize:11,color:"var(--grijs-donker)",marginTop:6}}>
            oudste links · nieuwste rechts
          </div>
        </div>
      )}

      {/* Puntenverloop */}
      {puntenVerloop.length>1 && (
        <div className="kaart grafiek-kaart">
          <div className="kaart-titel"><i className="fa-solid fa-chart-line"/> Puntenverloop</div>
          <LijnGrafiek waarden={puntenVerloop} labels={puntenLabels} kleur="#004aad" hoogte={140} />
          <div style={{textAlign:"center",fontSize:11,color:"var(--grijs-donker)",marginTop:2}}>
            cumulatieve punten per gespeelde wedstrijd
          </div>
        </div>
      )}

      {/* Doelpunten per wedstrijd */}
      {laatste10.length>0 && (
        <div className="kaart grafiek-kaart">
          <div className="kaart-titel"><i className="fa-solid fa-chart-column"/> Doelpunten per wedstrijd</div>
          <StaafGrafiek
            reeksen={[doelVoorReeks, doelTegenReeks]}
            labels={vormLabels}
            kleuren={["#004aad","#dc3545"]}
            hoogte={155} />
          <GrafiekLegenda items={[{label:"Voor",kleur:"#004aad"},{label:"Tegen",kleur:"#dc3545"}]} />
        </div>
      )}

      {/* Aanvallend */}
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-bolt"/> Aanvallend</div>
        <div className="stat-raster">
          <div className="stat-pill"><div className="stat-pill-getal">{doelVoor}</div><div className="stat-pill-label">Doelpunten</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{gemVoor}</div><div className="stat-pill-label">Gem. per wedstrijd</div></div>
        </div>
        <div style={{fontSize:12,color:"var(--grijs-donker)",textAlign:"center",padding:"6px 0",fontStyle:"italic"}}>Schoten en assists bijhouden via Live Analyse →</div>
      </div>
      {/* Verdedigend */}
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-shield"/> Verdedigend</div>
        <div className="stat-raster">
          <div className="stat-pill"><div className="stat-pill-getal">{doelTegen}</div><div className="stat-pill-label">Tegendoelpunten</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{gemTegen}</div><div className="stat-pill-label">Gem. per wedstrijd</div></div>
        </div>
        <div className="stat-raster">
          <div className="stat-kaart" style={{borderTop:"3px solid var(--succes)"}}><div className="stat-getal" style={{fontSize:26}}>{cleanSheets}</div><div className="stat-label">Clean sheets</div></div>
          <div className="stat-kaart" style={{borderTop:"3px solid var(--grijs-donker)"}}><div className="stat-getal" style={{fontSize:26}}>{gespeeld.length>0?Math.round(cleanSheets/gespeeld.length*100):0}%</div><div className="stat-label">Clean sheet %</div></div>
        </div>
      </div>
      {/* Discipline */}
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-scale-balanced"/> Discipline</div>
        <div className="stat-raster">
          <div className="stat-kaart" style={{borderTop:"3px solid #ffc107"}}>
            <div className="stat-getal" style={{fontSize:26,color:"var(--goud)"}}>{geelKaarten}</div>
            <div className="stat-label">Gele kaarten</div>
          </div>
          <div className="stat-kaart" style={{borderTop:"3px solid var(--gevaar)"}}>
            <div className="stat-getal" style={{fontSize:26,color:"var(--gevaar)"}}>{roodKaarten}</div>
            <div className="stat-label">Rode kaarten</div>
          </div>
        </div>
      </div>
      {/* Trainingsopkomst */}
      {opkomstReeks.length>1 && (
        <div className="kaart grafiek-kaart">
          <div className="kaart-titel"><i className="fa-solid fa-chart-line"/> Trainingsopkomst</div>
          <LijnGrafiek waarden={opkomstReeks} labels={opkomstLabels} kleur="#28a745" hoogte={140} eenheid="%" />
        </div>
      )}

      {/* Presentieoverzicht */}
      <div className="kaart">
        <div className="kaart-titel" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span><i className="fa-solid fa-table-list"/> Presentieoverzicht</span>
          <button className="knop klein pdf-knop"
            style={{padding:"5px 11px",fontSize:11,opacity:presGeb.length===0?.45:1}}
            disabled={presGeb.length===0}
            onClick={function(){ exporteerPresentiePDF(presGeb, presTabel, presFilterLabel); }}>
            <i className="fa-solid fa-file-pdf"/> PDF
          </button>
        </div>

        {/* Filter op soort */}
        <div className="pres-filter">
          {PRESENTIE_SOORTEN.map(function(s){
            var aan = presFilter===s.id;
            return (
              <button key={s.id} className={"pres-filter-knop"+(aan?" actief":"")}
                onClick={function(){ setPresFilter(s.id); }}>
                <i className={s.icoon}/> {s.label}
                <span className="pres-teller">{aantalPerSoort[s.id]}</span>
              </button>
            );
          })}
        </div>

        {presGeb.length===0 ? (
          <div style={{fontSize:13,color:"var(--grijs-donker)",padding:"10px 0",lineHeight:1.6}}>
            {presFilter==="activiteit"
              ? "Nog geen activiteiten met een presentielijst. Voeg er een toe bij het bewerken van een activiteit in de agenda."
              : presFilter==="wedstrijd"
                ? "Nog geen gespeelde wedstrijden met een opstelling."
                : "Nog niets om te tonen."}
          </div>
        ) : (
          <div>
            <div className="opk-legenda" style={{marginBottom:12}}>
              {AANWEZIG_KEUZES.map(function(k){
                return (
                  <span key={k.id} className="opk-legenda-item" title={k.label}>
                    <span className="opk-letter" style={{background:k.kleur,color:k.op,minWidth:20,height:18,fontSize:10}}>{k.letter}</span>
                    {k.label}
                  </span>
                );
              })}
            </div>

            <div className="opk-tabel-wrap">
              <table className="opk-tabel">
                <thead>
                  <tr>
                    <th className="opk-naam-kol">Speler</th>
                    {presGeb.map(function(g){
                      var d = parseerDatum(g.datum);
                      var soort = PRESENTIE_SOORTEN.filter(function(s){ return s.id===g.soort; })[0];
                      return (
                        <th key={g.id} title={g.titel+(g.sub?" · "+g.sub:"")+(g.afgeleid?" · afgeleid uit de opstelling":"")}>
                          <span className="pres-soort-streep" style={{background:soort.kleur}}/>
                          <span className="opk-dag">{d ? d.getDate() : "–"}</span>
                          <span className="opk-mnd">{d ? MAANDEN_VOL[d.getMonth()].slice(0,3) : ""}</span>
                        </th>
                      );
                    })}
                    <th className="opk-pct-kol">Opkomst</th>
                  </tr>
                </thead>
                <tbody>
                  {presTabel.rijen.map(function(r){
                    return (
                      <tr key={r.speler.id} className={r.weinigBasis?"pres-weinig":""}
                        title={r.weinigBasis?"Te weinig meegedaan om eerlijk te vergelijken":""}>
                        <td className="opk-naam-kol">
                          <span className="opk-speler">
                            <span className="k-buste" style={{width:26,height:26}}><SpelerBeeld speler={r.speler}/></span>
                            <span className="opk-speler-naam">
                              {(r.speler.rugnummer ? r.speler.rugnummer+"  " : "")+r.speler.naam}
                            </span>
                          </span>
                        </td>
                        {r.cellen.map(function(c,i){
                          /* Loopt dezelfde periode door in de buurcel, dan
                             plakken de vakjes aan elkaar tot één balk. */
                          var pid  = c && c.periode ? c.periode.id : null;
                          var vorig = r.cellen[i-1], volgend = r.cellen[i+1];
                          var kl = "opk-cel"
                            + (pid && vorig   && vorig.periode   && vorig.periode.id===pid   ? " door-links"  : "")
                            + (pid && volgend && volgend.periode && volgend.periode.id===pid ? " door-rechts" : "")
                            + (c && c.meetelt===false ? " buiten-telling" : "");
                          var tip = !c ? "Niet in de selectie"
                            : c.periode
                              ? c.label + " · " + afwezigheidPeriodeTekst(c.periode)
                                + (c.periode.reden ? " · " + c.periode.reden : "")
                                + (c.meetelt ? "" : " · telt niet mee")
                              : c.label;
                          return (
                            <td key={i}>
                              {c
                                ? <span className={kl} style={{background:c.kleur,color:c.op}} title={tip}>
                                    {c.id==="geblesseerd" || c.id==="blessure"
                                      ? <i className="fa-solid fa-hospital-symbol"/> : c.letter}
                                  </span>
                                : <span className="opk-cel leeg" title="Niet in de selectie">·</span>}
                            </td>
                          );
                        })}
                        <td className="opk-pct-kol">
                          <span className="opk-pct" style={{color: r.pct===null ? "var(--grijs-donker)"
                            : r.pct>=85?"var(--succes)":r.pct>=70?"var(--oranje)":"var(--gevaar)"}}>
                            {r.pct===null ? "–" : r.pct+"%"}
                          </span>
                          <span className="opk-pct-sub">
                            {r.pct===null ? "buiten de telling" : r.aanw+"/"+r.meegedaan}
                            {r.pct!==null && r.buiten>0 ? " (+"+r.buiten+")" : ""}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="pres-totaal">
                    <td className="opk-naam-kol">Opkomst</td>
                    {presTabel.perKolom.map(function(k,i){
                      return (
                        <td key={i}>
                          <span className="pres-kolom-pct"
                            style={{color: k.pct===null ? "var(--grijs-donker)"
                              : k.pct>=85?"var(--succes)":k.pct>=70?"var(--oranje)":"var(--gevaar)"}}>
                            {k.pct===null ? "–" : k.pct+"%"}
                          </span>
                        </td>
                      );
                    })}
                    <td className="opk-pct-kol">
                      <span className="opk-pct" style={{color:"var(--blauw)"}}>
                        {presTabel.gemiddelde===null ? "–" : presTabel.gemiddelde+"%"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:10}}>
              <p style={{fontSize:11,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,flex:1,minWidth:200,margin:0}}>
                Te laat komen telt mee als aanwezig. Een punt betekent dat de speler er toen niet bij hoorde.
                Bij wedstrijden komt de presentie uit de opstelling.
                {presTabel.buiten>0 && " Een doorlopende balk is een vastgelegde periode; blessure, ziekte en schorsing tellen niet mee in het percentage."}
              </p>
              {gefilterdeGeb.length>12 && (
                <button className="knop lijn klein" style={{padding:"5px 11px",fontSize:11}}
                  onClick={function(){ setAlleKolommen(!alleKolommen); }}>
                  {alleKolommen ? "Laatste 12 tonen" : "Alle "+gefilterdeGeb.length+" tonen"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Teamontwikkeling */}
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-arrow-trend-up"/> Teamontwikkeling</div>
        <div className="stat-raster-3">
          <div className="stat-pill"><div className="stat-pill-getal">{aanwPct}%</div><div className="stat-pill-label">Trainings­opkomst</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{spelers.length}</div><div className="stat-pill-label">Selectie­grootte</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{gemLeeftijd}</div><div className="stat-pill-label">Gem. leeftijd</div></div>
        </div>
        <div className="stat-raster">
          <div className="stat-pill"><div className="stat-pill-getal">{trainingen.length}</div><div className="stat-pill-label">Trainingen dit seizoen</div></div>
          <div className="stat-pill"><div className="stat-pill-getal">{wedstrijden.length}</div><div className="stat-pill-label">Wedstrijden gepland</div></div>
        </div>
      </div>
    </div>
  );
}

// ── INDIVIDU STATISTIEKEN ──────────────────────────────────
function IndividuStatistieken() {
  const spelers = laadSpelers();
  const wedstrijden = laadWedstrijden();
  const trainingen = laadTrainingen();
  const afwezigheden = laadAfwezigheden();
  const [gekozen, setGekozen] = useState(spelers.length>0 ? spelers[0].id : null);
  const [subtab, setSubtab] = useState("overzicht");
  if (spelers.length===0) return (
    <div className="leeg">
      <div className="leeg-icoon"><i className="fa-solid fa-user"/></div>
      <h3>Geen spelers</h3>
      <p>Voeg spelers toe in Selectie om statistieken te bekijken.</p>
    </div>
  );
  const sp = spelers.find(function(s){return s.id===gekozen;}) || spelers[0];
  const gespeeld = wedstrijden.filter(function(w){return w.status==="gespeeld";});
  const st = berekenSpelerStats(sp.id, wedstrijden, sp.stats);
  const goals = st.doelpunten;
  const geel  = st.geelKaarten;
  const rood  = st.roodKaarten;
  const inOps = st.wedstrijden;
  const assists = st.assists;
  const minuten = st.speelMinuten;
  const opkomstPerTrainingSp = trainingen.map(function(t){
    return opkomstVan({datum: t.datum, aanwezigheid:
      (t.aanwezigheid||[]).filter(function(a){ return a.spelerId===sp.id; })}, afwezigheden);
  }).filter(function(o){ return o !== null; });
  const trainAanw = opkomstPerTrainingSp.reduce(function(s,o){ return s+o.aanwezig; }, 0);
  const trainMee  = opkomstPerTrainingSp.length;
  const trainPct  = trainMee>0 ? Math.round(trainAanw/trainMee*100) : 0;
  const motmAantal = telMotm(sp.id, wedstrijden);
  const cijfer = gemiddeldCijfer(sp.id, wedstrijden);
  const chrono = gespeeld.slice().sort(function(a,b){ return new Date(a.datum)-new Date(b.datum); }).slice(-10);
  const spLabels = chrono.map(function(w){ return formateerDatumKort(w.datum).split(" ")[0]; });
  const spGoals = chrono.map(function(w){
    return (w.scorers||[]).filter(function(s){return s.eigenTeam&&s.spelerId===sp.id;}).length;
  });
  const spAssists = chrono.map(function(w){
    return (w.scorers||[]).filter(function(s){return s.assist===sp.id;}).length;
  });
  const spCijfers = chrono.map(function(w){
    var c = w.beoordelingen ? Number(w.beoordelingen[sp.id]) : NaN;
    return isNaN(c) ? 0 : c;
  });
  const heeftCijfers = spCijfers.some(function(c){return c>0;});
  const heeftBijdragen = spGoals.concat(spAssists).some(function(v){return v>0;});
  return (
    <div>
      <div className="kaart" style={{marginBottom:10}}>
        <div className="kaart-titel">Kies speler</div>
        <select className="formulier-input" value={sp.id} onChange={function(e){setGekozen(e.target.value);setSubtab("overzicht");}}>
          {spelers.map(function(s){
            return <option key={s.id} value={s.id}>{(s.rugnummer?"#"+s.rugnummer+" ":"")+s.naam+" – "+(s.positie||"Onbekend")}</option>;
          })}
        </select>
      </div>
      <div className="profiel-banner" style={{marginBottom:10}}>
        <div className="profiel-foto">
          <SpelerBeeld speler={sp}/>
        </div>
        <div style={{flex:1}}>
          <div className="profiel-naam">{sp.naam}</div>
          <div className="profiel-sub">{sp.positie||"Positie onbekend"}</div>
          {sp.geboortedatum && <div className="profiel-sub">{leeftijdUitDatum(sp.geboortedatum)} jaar</div>}
        </div>
        {sp.rugnummer && <div className="profiel-nr-badge">{"#"+sp.rugnummer}</div>}
      </div>
      <div className="stat-mini-raster" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:12}}>
        <div className="stat-mini"><div className="stat-mini-getal">{goals}</div><div className="stat-mini-label">Goals</div></div>
        <div className="stat-mini"><div className="stat-mini-getal">{assists}</div><div className="stat-mini-label">Assists</div></div>
        <div className="stat-mini"><div className="stat-mini-getal">{trainPct}%</div><div className="stat-mini-label">Aanwezig</div></div>
        <div className="stat-mini"><div className="stat-mini-getal" style={{color:"var(--goud)"}}>{geel}</div><div className="stat-mini-label">Geel</div></div>
      </div>
      <div className="stat-raster" style={{marginBottom:12}}>
        <div className="stat-pill">
          <div className="stat-pill-getal" style={{color:"var(--goud)"}}>
            <i className="fa-solid fa-star" style={{fontSize:14,marginRight:3}}/>{motmAantal}
          </div>
          <div className="stat-pill-label">Man of the Match</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-getal">{cijfer||"–"}</div>
          <div className="stat-pill-label">Gemiddeld cijfer</div>
        </div>
      </div>
      <div className="tabs" style={{fontSize:11}}>
        {[["overzicht","Overzicht"],["aanvallend","Aanval"],["discipline","Discip."],["betrokkenheid","Betrok."]].map(function(p){
          return <button key={p[0]} className={"tab-knop"+(subtab===p[0]?" actief":"")} style={{fontSize:11}} onClick={function(){setSubtab(p[0]);}}>{p[1]}</button>;
        })}
      </div>
      {subtab==="overzicht" && heeftBijdragen && (
        <div className="kaart grafiek-kaart">
          <div className="kaart-titel"><i className="fa-solid fa-chart-column"/> Doelpunten & assists</div>
          <StaafGrafiek reeksen={[spGoals,spAssists]} labels={spLabels} kleuren={["#004aad","#38b6ff"]} hoogte={145} />
          <GrafiekLegenda items={[{label:"Doelpunten",kleur:"#004aad"},{label:"Assists",kleur:"#38b6ff"}]} />
        </div>
      )}
      {subtab==="overzicht" && heeftCijfers && (
        <div className="kaart grafiek-kaart">
          <div className="kaart-titel"><i className="fa-solid fa-chart-line"/> Cijferverloop</div>
          <LijnGrafiek waarden={spCijfers} labels={spLabels} kleur="#fd7e14" hoogte={135} />
        </div>
      )}
      {subtab==="overzicht" && (
        <div className="kaart">
          <div className="kaart-titel">Seizoensoverzicht</div>
          <div className="stat-raster-3">
            <div className="stat-pill"><div className="stat-pill-getal">{goals}</div><div className="stat-pill-label">Doelpunten</div></div>
            <div className="stat-pill"><div className="stat-pill-getal">{assists}</div><div className="stat-pill-label">Assists</div></div>
            <div className="stat-pill"><div className="stat-pill-getal">{goals+assists}</div><div className="stat-pill-label">Bijdragen</div></div>
          </div>
          <div className="stat-raster-3">
            <div className="stat-pill"><div className="stat-pill-getal">{inOps}</div><div className="stat-pill-label">Wedstr. gespeeld</div></div>
            <div className="stat-pill"><div className="stat-pill-getal">{minuten}{"'"}</div><div className="stat-pill-label">Minuten</div></div>
            <div className="stat-pill"><div className="stat-pill-getal">{trainPct}%</div><div className="stat-pill-label">Trainings­opk.</div></div>
          </div>
        </div>
      )}
      {subtab==="aanvallend" && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-bolt"/> Aanvallend</div>
          <div className="stat-raster">
            <div className="stat-pill"><div className="stat-pill-getal">{goals}</div><div className="stat-pill-label">Doelpunten</div></div>
            <div className="stat-pill"><div className="stat-pill-getal">{assists}</div><div className="stat-pill-label">Assists</div></div>
          </div>
          <div style={{fontSize:12,color:"var(--grijs-donker)",textAlign:"center",padding:"8px 0",fontStyle:"italic"}}>Schoten, sleutelpasses en kansen bijhouden via Live Analyse →</div>
        </div>
      )}
      {subtab==="discipline" && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-scale-balanced"/> Discipline</div>
          <div className="stat-raster">
            <div className="stat-kaart" style={{borderTop:"3px solid #ffc107"}}>
              <div className="stat-getal" style={{fontSize:26,color:"var(--goud)"}}>{geel}</div>
              <div className="stat-label">Gele kaarten</div>
            </div>
            <div className="stat-kaart" style={{borderTop:"3px solid var(--gevaar)"}}>
              <div className="stat-getal" style={{fontSize:26,color:"var(--gevaar)"}}>{rood}</div>
              <div className="stat-label">Rode kaarten</div>
            </div>
          </div>
        </div>
      )}
      {subtab==="betrokkenheid" && (
        <div className="kaart">
          <div className="kaart-titel">❤️ Betrokkenheid</div>
          <div className="stat-raster">
            <div className="stat-pill"><div className="stat-pill-getal">{trainAanw+"/"+trainMee}</div><div className="stat-pill-label">Trainingen aanwezig</div></div>
            <div className="stat-pill"><div className="stat-pill-getal">{trainPct}%</div><div className="stat-pill-label">Opkomst %</div></div>
          </div>
          <div className="stat-raster">
            <div className="stat-pill"><div className="stat-pill-getal">{inOps}</div><div className="stat-pill-label">In opstelling</div></div>
            <div className="stat-pill"><div className="stat-pill-getal">{minuten}{"'"}</div><div className="stat-pill-label">Speelminuten</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LIVE ANALYSE ───────────────────────────────────────────
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
  const [afrondOpen, setAfrondOpen] = useState(false);
  const [afrondMelding, setAfrondMelding] = useState(null);
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

  function afrondOverzicht() {
    return {
      doelpunten: events.filter(function(e){return e.type==="goal";}).length,
      tegendoelpunten: events.filter(function(e){return e.type==="goal-teg";}).length,
      geel: events.filter(function(e){return e.type==="geel";}).length,
      rood: events.filter(function(e){return e.type==="rood";}).length,
      totaal: events.length
    };
  }

  function rondWedstrijdAf() {
    var eigenDoel = events.filter(function(e){return e.type==="goal";});
    var tegenDoel = events.filter(function(e){return e.type==="goal-teg";});
    var assistEvents = events.filter(function(e){return e.type==="assist";});

    var nieuweScorers = eigenDoel.map(function(e){
      var assist = assistEvents.find(function(a){
        return a.spelerId && a.spelerId!==e.spelerId && Math.abs(Number(a.minuut)-Number(e.minuut))<=1;
      });
      return {
        id: e.id, spelerId: e.spelerId||null, naam: e.spelerNaam||"Onbekend",
        minuut: String(e.minuut), eigenTeam: true,
        assist: assist ? assist.spelerId : null,
        assistNaam: assist ? assist.spelerNaam : ""
      };
    }).sort(function(a,b){return Number(a.minuut)-Number(b.minuut);});

    var nieuweKaarten = events.filter(function(e){
      return e.type==="geel"||e.type==="rood";
    }).map(function(e){
      return { id:e.id, spelerId:e.spelerId||null, naam:e.spelerNaam||"Onbekend",
               type:(e.type==="geel"?"geel":"rood"), minuut:String(e.minuut) };
    }).sort(function(a,b){return Number(a.minuut)-Number(b.minuut);});

    var bestaand = laadWedstrijden().find(function(w){return w.id===wedstrijd.id;}) || wedstrijd;
    var opstelling = bestaand.opstelling && bestaand.opstelling.length>0
      ? bestaand.opstelling
      : spelers.map(function(s){
          return {spelerId:s.id,naam:s.naam,foto:s.foto,rugnummer:s.rugnummer,
                  spelStatus:"basis",minuten:halveTijd*2,positie:s.positie};
        });

    var bijgewerkt = laadWedstrijden().map(function(w){
      if (w.id!==wedstrijd.id) return w;
      return Object.assign({}, w, {
        score: {fch: eigenDoel.length, teg: tegenDoel.length},
        scorers: nieuweScorers,
        kaarten: nieuweKaarten,
        opstelling: opstelling,
        status: "gespeeld",
        liveGeanalyseerd: true
      });
    });
    slaJson(WEDSTRIJDEN_KEY, bijgewerkt);
    setWedstrijd(bijgewerkt.find(function(w){return w.id===wedstrijd.id;}));
    setLoopt(false);
    setAfrondOpen(false);
    setAfrondMelding("Wedstrijd afgerond en opgeslagen. De uitslag staat nu bij Wedstrijden en telt mee in de statistieken.");
    setTimeout(function(){setAfrondMelding(null);},6000);
  }

  if (fase==="selecteer") {
    return (
      <div>
        <div className="pagina-header" style={{marginBottom:14}}>
          <div className="pagina-header-tekst">
            <h2 style={{fontSize:20,color:"var(--blauw)"}}>🔴 Live Analyse</h2>
            <p style={{fontSize:12,color:"var(--grijs-donker)"}}>Kies een wedstrijd</p>
          </div>
        </div>
        {wedstrijden.length===0 ? (
          <div className="leeg">
            <div className="leeg-icoon"><i className="fa-solid fa-calendar-days"/></div>
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
      <button className="back-knop" onClick={function(){setFase("selecteer");setLoopt(false);setGekozenActie(null);}}>← Wedstrijden</button>

      <div className="live-scoreboard">
        <div style={{textAlign:"center",fontSize:10,opacity:.6,textTransform:"uppercase",letterSpacing:".8px",fontFamily:"'Helvetica Neue',Arial",fontWeight:700}}>
          {(wedstrijd.thuis?"THUIS":"UIT")+" · "+wedstrijd.tegenstander+" · "+formateerDatumKort(wedstrijd.datum)}
        </div>
        <div className="live-scoreboard-score">
          <div>
            <div className="live-scoreboard-team">{inst().clubNaam}</div>
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
          <button className={"live-subtab"+(subTab==="acties"?" actief":"")} onClick={function(){setSubTab("acties");}}><i className="fa-solid fa-futbol"/> Acties</button>
          <button className={"live-subtab"+(subTab==="timeline"?" actief":"")} onClick={function(){setSubTab("timeline");}}><i className="fa-solid fa-clock-rotate-left"/> Timeline</button>
          <button className={"live-subtab"+(subTab==="stats"?" actief":"")} onClick={function(){setSubTab("stats");}}>Stats</button>
          <button className={"live-subtab"+(subTab==="timer"?" actief":"")} onClick={function(){setSubTab("timer");}}><i className="fa-solid fa-stopwatch"/> Timer</button>
        </div>
      </div>

      {flash && <div className="live-flash">{"✓ "+flash}</div>}

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
                  <span className="actie-icoon-v2"><i className={a.icoon} style={a.kleur?{color:a.kleur}:{}}/></span>
                  <span className="actie-label-v2">{a.label}</span>
                </button>
              );
            })}
          </div>

          {gekozenActie && (
            <div className="kaart" style={{marginTop:4,padding:12,borderLeft:"4px solid var(--blauw)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:14}}>
                  {actieInfo.label+" · "+huidigMinuut()+"'"}
                </div>
                <button className="knop succes klein" onClick={logEvent}><i className="fa-solid fa-check"/> Log</button>
              </div>

              <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",marginBottom:6}}>📍 Veldzone (optioneel)</div>
              <div className="zone-veld">
                <div style={{background:"#0d1b2a",textAlign:"center",fontSize:10,color:"rgba(255,255,255,.55)",padding:"3px 0",fontWeight:700,letterSpacing:".5px"}}>{"▲ DOEL TEGENSTANDER"}</div>
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
                <div style={{background:"#004aad",textAlign:"center",fontSize:10,color:"rgba(255,255,255,.65)",padding:"3px 0",fontWeight:700,letterSpacing:".5px"}}>{"▼ EIGEN DOEL"}</div>
              </div>

              {spelers.length>0 && (
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--grijs-donker)",margin:"10px 0 6px"}}>👤 Speler (optioneel)</div>
                  <div className="speler-keuze-grid">
                    {spelers.map(function(sp){
                      var gesP=gekozenSpeler===sp.id;
                      return (
                        <button key={sp.id} className="speler-keuze-knop" style={{borderColor:gesP?"var(--blauw)":"var(--grijs)",background:gesP?"var(--vlak-info)":"var(--wit)"}}
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
                {"✓ Log – "+actieInfo.label+(gekozenSpeler&&spelers.find(function(s){return s.id===gekozenSpeler;})?" – "+spelers.find(function(s){return s.id===gekozenSpeler;}).naam.split(" ")[0]:"")+(gekozenZone&&VELD_ZONES.find(function(z){return z.id===gekozenZone;})?" · "+VELD_ZONES.find(function(z){return z.id===gekozenZone;}).sub:"")}
              </button>
            </div>
          )}
        </div>
      )}

      {subTab==="timeline" && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-clock-rotate-left"/>{" Tijdlijn ("+events.length+" events)"}</div>
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
                  <div className="live-event-icoon"><i className={info.icoon} style={info.kleur?{color:info.kleur}:{}}/></div>
                  <div className="live-event-tekst">
                    <div style={{fontWeight:700,fontFamily:"'Helvetica Neue',Arial",fontSize:13}}>{e.spelerNaam||info.label}</div>
                    <div style={{fontSize:11,color:"var(--grijs-donker)"}}>{info.label+(zone?" · "+zone.sub+" "+zone.label:"")}</div>
                  </div>
                  <button className="live-event-verwijder" onClick={function(){verwijderEvent(e.id);}}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab==="stats" && (
        <div>
          <div className="kaart">
            <div className="kaart-titel"><i className="fa-solid fa-chart-simple"/> Live statistieken</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <td style={{textAlign:"right",fontWeight:700,fontSize:11,color:"var(--blauw)",paddingBottom:8,fontFamily:"'Helvetica Neue',Arial"}}>{inst().clubNaam}</td>
                  <td style={{textAlign:"center",width:120}}></td>
                  <td style={{textAlign:"left",fontWeight:700,fontSize:11,color:"var(--gevaar)",paddingBottom:8,fontFamily:"'Helvetica Neue',Arial"}}>{wedstrijd.tegenstander}</td>
                </tr>
              </thead>
              <tbody>
                {[
                  {label:"⚽ Doelpunten",   fch:scoreFCH,     teg:scoreTeg},
                  {label:"🎯 Schoten",     fch:fchSchoten,   teg:tegSchoten},
                  {label:"🎯 Op doel",     fch:fchOpDoel,    teg:tegOpDoel},
                  {label:"⛳ Corners",       fch:fchCorners,   teg:tegCorners},
                  {label:"🟨 Gele krt",    fch:fchGeel,      teg:tegGeel},
                  {label:"💪 Tackles",     fch:fchTackles,   teg:0},
                  {label:"🥅 Reddingen",   fch:fchReddingen, teg:0},
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
              <div className="kaart-titel">📈 Momentum per 15 min</div>
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
                <div style={{fontSize:10,color:"var(--blauw)",fontWeight:700}}>{"■ " + teamKort(inst().clubNaam)}</div>
                <div style={{fontSize:10,color:"var(--gevaar)",fontWeight:700}}>{"■ "+wedstrijd.tegenstander}</div>
              </div>
            </div>
          )}

          {heeftZone && (
            <div className="kaart">
              <div className="kaart-titel"><i className="fa-solid fa-fire"/> Veldzone heatmap</div>
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
          <div className="kaart-titel"><i className="fa-solid fa-stopwatch"/> Timer instellingen</div>
          <div style={{display:"flex",gap:8,marginBottom:16,justifyContent:"center"}}>
            <button className="filter-chip" style={{borderColor:modus==="stopwatch"?"var(--blauw)":"var(--grijs)",color:modus==="stopwatch"?"var(--blauw)":"var(--grijs-donker)"}} onClick={function(){wisselModus("stopwatch");}}>⏱ Stopwatch</button>
            <button className="filter-chip" style={{borderColor:modus==="aftellen"?"var(--blauw)":"var(--grijs)",color:modus==="aftellen"?"var(--blauw)":"var(--grijs-donker)"}} onClick={function(){wisselModus("aftellen");}}>⏲ Aftellen</button>
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
            <div className="live-timer-label">{loopt?"⏏ Loopt":"◉ Gestopt"} · Minuut {huidigMinuut()}</div>
          </div>
          <div className="live-timer-knoppen">
            {!loopt ? (
              <button className="knop succes" onClick={startTimer}>{"▶ Start"}</button>
            ) : (
              <button className="knop lijn" onClick={function(){setLoopt(false);}}>{"⏸ Pauze"}</button>
            )}
            <button className="knop lijn klein" onClick={resetTimer}>{"↺ Reset"}</button>
          </div>
        </div>
      )}

      {subTab==="timer" && (
        <div className="kaart" style={{borderTop:"3px solid var(--succes)"}}>
          <div className="kaart-titel"><i className="fa-solid fa-flag-checkered"/> Wedstrijd afronden</div>
          <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.5,marginBottom:12}}>
            Zet alles wat je hebt gelogd om in de uitslag. Doelpunten, kaarten en assists komen dan bij
            Wedstrijden te staan en tellen mee in de team- en spelersstatistieken.
          </p>
          <div className="stat-raster-3" style={{marginBottom:12}}>
            <div className="stat-pill"><div className="stat-pill-getal">{afrondOverzicht().doelpunten+" – "+afrondOverzicht().tegendoelpunten}</div><div className="stat-pill-label">Uitslag</div></div>
            <div className="stat-pill"><div className="stat-pill-getal">{afrondOverzicht().geel+afrondOverzicht().rood}</div><div className="stat-pill-label">Kaarten</div></div>
            <div className="stat-pill"><div className="stat-pill-getal">{afrondOverzicht().totaal}</div><div className="stat-pill-label">Events</div></div>
          </div>
          <button className="knop succes"
            disabled={events.length===0}
            style={{width:"100%",justifyContent:"center",opacity:events.length===0?.5:1}}
            onClick={function(){ if(events.length>0) setAfrondOpen(true); }}>
            <i className="fa-solid fa-flag-checkered"/> Wedstrijd afronden
          </button>
          {events.length===0 && (
            <p style={{fontSize:12,color:"var(--grijs-donker)",textAlign:"center",marginTop:8,fontWeight:400}}>
              Log eerst acties bij het tabblad Acties.
            </p>
          )}
        </div>
      )}

      {afrondMelding && (
        <div className="kaart" style={{background:"var(--vlak-succes)",borderLeft:"4px solid var(--succes)",color:"var(--op-succesvlak)"}}>
          <div style={{fontSize:13,fontWeight:600,lineHeight:1.5}}>
            <i className="fa-solid fa-circle-check"/>{" "+afrondMelding}
          </div>
        </div>
      )}

      {afrondOpen && (
        <div className="bevestig-overlay" onClick={function(e){if(e.target===e.currentTarget)setAfrondOpen(false);}}>
          <div className="bevestig-kaart">
            <h3>Wedstrijd afronden?</h3>
            <p>
              {"De uitslag wordt "+afrondOverzicht().doelpunten+" – "+afrondOverzicht().tegendoelpunten+
               ", met "+afrondOverzicht().geel+"× geel en "+afrondOverzicht().rood+"× rood. "+
               "Een eerder handmatig ingevulde uitslag van deze wedstrijd wordt overschreven."}
            </p>
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function(){setAfrondOpen(false);}}>Annuleren</button>
              <button className="knop succes" onClick={rondWedstrijdAf}>Afronden</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ── STATISTIEKEN MODULE ────────────────────────────────────
function StandTab() {
  const [teams, setTeams] = useState(laadStand);
  const [bewerken, setBewerken] = useState(false);
  const [nieuwNaam, setNieuwNaam] = useState("");

  useEffect(function(){ slaJson(STAND_KEY, teams); },[teams]);

  const wedstrijden = laadWedstrijden();
  const eigen = eigenStandRij(wedstrijden);
  const stand = standMetPunten([eigen].concat(teams));
  const eigenPositie = stand.findIndex(function(r){return r.eigen;}) + 1;

  function voegToe() {
    const naam = nieuwNaam.trim();
    if (!naam) return;
    setTeams(function(l){
      return l.concat([{id:Date.now(),naam:naam,gespeeld:0,winst:0,gelijk:0,verlies:0,doelVoor:0,doelTegen:0}]);
    });
    setNieuwNaam("");
  }
  function wijzig(id, veld, waarde) {
    setTeams(function(l){
      return l.map(function(t){
        return t.id===id ? Object.assign({},t,{[veld]: veld==="naam" ? waarde : Math.max(0,Number(waarde)||0)}) : t;
      });
    });
  }
  function verwijder(id) { setTeams(function(l){ return l.filter(function(t){return t.id!==id;}); }); }

  return (
    <div>
      {teams.length>0 && (
        <div className="kaart">
          <div className="stat-raster" style={{marginBottom:0}}>
            <div className="stat-kaart primair">
              <div className="stat-getal">{eigenPositie}<span style={{fontSize:15}}>e</span></div>
              <div className="stat-label">Onze positie</div>
            </div>
            <div className="stat-kaart accent">
              <div className="stat-getal">{eigen.winst*3+eigen.gelijk}</div>
              <div className="stat-label">Punten uit {eigen.gespeeld} duels</div>
            </div>
          </div>
        </div>
      )}

      <div className="kaart">
        <div className="kaart-titel" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span><i className="fa-solid fa-ranking-star"/> Competitiestand</span>
          <button className="knop lijn klein" style={{padding:"4px 10px",fontSize:11}}
            onClick={function(){setBewerken(!bewerken);}}>
            {bewerken ? "Klaar" : "Bewerken"}
          </button>
        </div>

        {teams.length===0 && !bewerken && (
          <div style={{textAlign:"center",padding:"18px 8px"}}>
            <p style={{fontSize:13,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.6,marginBottom:14}}>
              Voeg de andere teams uit je poule toe om de stand bij te houden.
              Onze eigen rij wordt automatisch berekend uit de gespeelde wedstrijden.
            </p>
            <button className="knop" onClick={function(){setBewerken(true);}}>+ Teams toevoegen</button>
          </div>
        )}

        {(teams.length>0) && (
          <div style={{overflowX:"auto"}}>
            <table className="stand-tabel">
              <thead>
                <tr>
                  <th style={{width:26}}>#</th>
                  <th className="links">Team</th>
                  <th>G</th><th>W</th><th>G</th><th>V</th><th>DS</th><th>P</th>
                </tr>
              </thead>
              <tbody>
                {stand.map(function(r,i){
                  return (
                    <tr key={r.id} className={r.eigen?"eigen":""}>
                      <td><span className="stand-pos">{i+1}</span></td>
                      <td className="links naam">{r.naam}</td>
                      <td>{r.gespeeld}</td>
                      <td>{r.winst}</td>
                      <td>{r.gelijk}</td>
                      <td>{r.verlies}</td>
                      <td style={{color:r.saldo>0?"var(--succes)":r.saldo<0?"var(--gevaar)":"inherit"}}>{(r.saldo>0?"+":"")+r.saldo}</td>
                      <td style={{fontSize:15}}>{r.punten}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {bewerken && (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-pen"/> Teams beheren</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input className="formulier-input" style={{flex:1}} value={nieuwNaam}
              placeholder="Naam tegenstander"
              onChange={function(e){setNieuwNaam(e.target.value);}}
              onKeyDown={function(e){ if(e.key==="Enter") voegToe(); }} />
            <button className="knop klein" onClick={voegToe}>+ Toevoegen</button>
          </div>
          <p style={{fontSize:12,color:"var(--grijs-donker)",fontWeight:400,lineHeight:1.5,marginBottom:10}}>
            Vul per team in: gespeeld, winst, gelijk, verlies, doelpunten voor en tegen.
          </p>
          {teams.map(function(t){
            return (
              <div key={t.id} style={{borderBottom:"1px solid var(--grijs)",paddingBottom:10,marginBottom:10}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:7}}>
                  <input className="formulier-input" style={{flex:1,marginBottom:0}} value={t.naam}
                    onChange={function(e){wijzig(t.id,"naam",e.target.value);}} />
                  <button className="knop gevaar klein" style={{padding:"6px 9px"}}
                    onClick={function(){verwijder(t.id);}}><i className="fa-solid fa-trash"/></button>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[["gespeeld","G"],["winst","W"],["gelijk","GL"],["verlies","V"],["doelVoor","DV"],["doelTegen","DT"]].map(function(v){
                    return (
                      <div key={v[0]} style={{textAlign:"center"}}>
                        <div style={{fontSize:9,color:"var(--grijs-donker)",fontWeight:700,marginBottom:2}}>{v[1]}</div>
                        <GetalVeld className="stand-mini-invoer" min={0} leeg={0} waarde={t[v[0]]}
                          opWaarde={function(n){wijzig(t.id,v[0],n);}} />
                      </div>
                    );
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

function StatistiekenModule({defaultTab}) {
  const [tab, setTab] = useState(defaultTab||"team");
  return (
    <div>
      <div className="pagina-header" style={{marginBottom:14}}>
        <div className="pagina-header-tekst">
          <div className="eyebrow">Seizoensdata</div>
          <h2>Statistieken</h2>
          <p style={{fontSize:12,color:"var(--grijs-donker)"}}>{"Seizoen "+inst().seizoen}</p>
        </div>
      </div>
      <div className="tabs">
        <button className={"tab-knop"+(tab==="team"?" actief":"")} onClick={function(){setTab("team");}}><i className="fa-solid fa-users"/> Team</button>
        <button className={"tab-knop"+(tab==="individu"?" actief":"")} onClick={function(){setTab("individu");}}><i className="fa-solid fa-user"/> Individu</button>
        <button className={"tab-knop"+(tab==="stand"?" actief":"")} onClick={function(){setTab("stand");}}><i className="fa-solid fa-ranking-star"/> Stand</button>
        <button className={"tab-knop"+(tab==="live"?" actief":"")} onClick={function(){setTab("live");}}><i className="fa-solid fa-circle" style={{color:tab==="live"?"var(--gevaar)":"inherit",fontSize:9}}/> Live</button>
      </div>
      {tab==="team" && <TeamStatistieken />}
      {tab==="individu" && <IndividuStatistieken />}
      {tab==="stand" && <StandTab />}
      {tab==="live" && <LiveAnalyse />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GRAFIEKEN (inline SVG, geen externe bibliotheek)
═══════════════════════════════════════════════════════════ */
function StaafGrafiek({ reeksen, labels, kleuren, hoogte }) {
  const H = hoogte || 150;
  const B = 320;
  const marge = {boven:10, onder:22, links:26, rechts:6};
  const grafiekB = B - marge.links - marge.rechts;
  const grafiekH = H - marge.boven - marge.onder;
  const aantal = labels.length;
  if (aantal===0) return null;
  const maxWaarde = Math.max(1, Math.max.apply(null, reeksen.map(function(r){
    return Math.max.apply(null, r.concat([0]));
  })));
  const groepB = grafiekB / aantal;
  const staafB = Math.max(3, (groepB*0.68) / reeksen.length);
  const ticks = [0, Math.ceil(maxWaarde/2), maxWaarde].filter(function(v,i,a){return a.indexOf(v)===i;});
  return (
    <svg viewBox={"0 0 "+B+" "+H} style={{width:"100%",height:"auto",display:"block"}}>
      {ticks.map(function(t){
        const y = marge.boven + grafiekH - (t/maxWaarde)*grafiekH;
        return (
          <g key={t}>
            <line x1={marge.links} y1={y} x2={B-marge.rechts} y2={y} stroke="#e2e6ea" strokeWidth="1"/>
            <text x={marge.links-5} y={y+3} textAnchor="end" fontSize="8" fill="#6c757d" fontFamily="Helvetica Neue,Arial">{t}</text>
          </g>
        );
      })}
      {labels.map(function(lab,i){
        return reeksen.map(function(reeks,r){
          const waarde = reeks[i]||0;
          const h = (waarde/maxWaarde)*grafiekH;
          const x = marge.links + i*groepB + (groepB - staafB*reeksen.length)/2 + r*staafB;
          return <rect key={i+"-"+r} x={x} y={marge.boven+grafiekH-h} width={staafB-1} height={Math.max(h,waarde>0?1.5:0)} fill={kleuren[r]} rx="1.5"/>;
        });
      })}
      {labels.map(function(lab,i){
        if (aantal>12 && i%2===1) return null;
        return <text key={"l"+i} x={marge.links+i*groepB+groepB/2} y={H-7} textAnchor="middle" fontSize="8" fill="#6c757d" fontFamily="Helvetica Neue,Arial">{lab}</text>;
      })}
      <line x1={marge.links} y1={marge.boven+grafiekH} x2={B-marge.rechts} y2={marge.boven+grafiekH} stroke="#adb5bd" strokeWidth="1"/>
    </svg>
  );
}

function LijnGrafiek({ waarden, labels, kleur, hoogte, eenheid }) {
  const H = hoogte || 140;
  const B = 320;
  const marge = {boven:10, onder:22, links:28, rechts:8};
  const grafiekB = B - marge.links - marge.rechts;
  const grafiekH = H - marge.boven - marge.onder;
  if (!waarden || waarden.length===0) return null;
  const maxWaarde = Math.max(1, Math.max.apply(null, waarden));
  const stap = waarden.length>1 ? grafiekB/(waarden.length-1) : 0;
  const punten = waarden.map(function(v,i){
    return {x: marge.links + i*stap, y: marge.boven + grafiekH - (v/maxWaarde)*grafiekH};
  });
  const pad = punten.map(function(p,i){ return (i===0?"M":"L")+p.x.toFixed(1)+" "+p.y.toFixed(1); }).join(" ");
  const vulPad = pad+" L"+punten[punten.length-1].x.toFixed(1)+" "+(marge.boven+grafiekH)+" L"+punten[0].x.toFixed(1)+" "+(marge.boven+grafiekH)+" Z";
  const ticks = [0, Math.round(maxWaarde/2), maxWaarde].filter(function(v,i,a){return a.indexOf(v)===i;});
  return (
    <svg viewBox={"0 0 "+B+" "+H} style={{width:"100%",height:"auto",display:"block"}}>
      {ticks.map(function(t){
        const y = marge.boven + grafiekH - (t/maxWaarde)*grafiekH;
        return (
          <g key={t}>
            <line x1={marge.links} y1={y} x2={B-marge.rechts} y2={y} stroke="#e2e6ea" strokeWidth="1"/>
            <text x={marge.links-5} y={y+3} textAnchor="end" fontSize="8" fill="#6c757d" fontFamily="Helvetica Neue,Arial">{t+(eenheid||"")}</text>
          </g>
        );
      })}
      {punten.length>1 && <path d={vulPad} fill={kleur} opacity="0.13"/>}
      {punten.length>1 && <path d={pad} fill="none" stroke={kleur} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>}
      {punten.map(function(p,i){ return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke={kleur} strokeWidth="2"/>; })}
      {labels.map(function(lab,i){
        if (labels.length>10 && i%2===1) return null;
        return <text key={"l"+i} x={punten[i].x} y={H-7} textAnchor="middle" fontSize="8" fill="#6c757d" fontFamily="Helvetica Neue,Arial">{lab}</text>;
      })}
    </svg>
  );
}

function RadarGrafiek({ waarden, normen, labels, hoogte }) {
  const H = hoogte || 230;
  const B = 300;
  const cx = B/2, cy = H/2 + 4;
  const R = Math.min(B, H)/2 - 34;
  const n = labels.length;
  if (n < 3) return null;

  function punt(i, w) {
    const hoek = -Math.PI/2 + i*2*Math.PI/n;
    const r = R * Math.max(0, Math.min(10, w)) / 10;
    return [cx + Math.cos(hoek)*r, cy + Math.sin(hoek)*r];
  }
  function pad(reeks) {
    return reeks.map(function(w,i){
      const p = punt(i, w===null||w===undefined ? 0 : w);
      return (i===0?"M":"L") + p[0].toFixed(1) + " " + p[1].toFixed(1);
    }).join(" ") + " Z";
  }

  return (
    <svg viewBox={"0 0 "+B+" "+H} style={{width:"100%",height:"auto",display:"block"}}>
      {[2,4,6,8,10].map(function(ring){
        const d = labels.map(function(_,i){
          const p = punt(i, ring);
          return (i===0?"M":"L") + p[0].toFixed(1) + " " + p[1].toFixed(1);
        }).join(" ") + " Z";
        return <path key={ring} d={d} fill="none" stroke="var(--grijs)" strokeWidth="1"/>;
      })}
      {labels.map(function(_,i){
        const p = punt(i, 10);
        return <line key={"as"+i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--grijs)" strokeWidth="1"/>;
      })}
      {normen && <path d={pad(normen)} fill="none" stroke="var(--grijs-donker)" strokeWidth="1.6" strokeDasharray="4 3"/>}
      <path d={pad(waarden)} fill="var(--blauw)" fillOpacity="0.22" stroke="var(--blauw)" strokeWidth="2.2" strokeLinejoin="round"/>
      {waarden.map(function(w,i){
        if (w===null||w===undefined) return null;
        const p = punt(i, w);
        return <circle key={"p"+i} cx={p[0]} cy={p[1]} r="3.2" fill="var(--wit)" stroke="var(--blauw)" strokeWidth="2"/>;
      })}
      {labels.map(function(lab,i){
        const p = punt(i, 12.1);
        const uitlijn = Math.abs(p[0]-cx) < 6 ? "middle" : (p[0] > cx ? "start" : "end");
        return (
          <text key={"l"+i} x={p[0]} y={p[1]+3} textAnchor={uitlijn}
            fontSize="10" fontWeight="700" fill="var(--grijs-donker)"
            fontFamily="Helvetica Neue,Arial">{lab}</text>
        );
      })}
    </svg>
  );
}

function GrafiekLegenda({ items }) {
  return (
    <div className="grafiek-legenda">
      {items.map(function(it){
        return (
          <div key={it.label} className="grafiek-legenda-item">
            <span className="grafiek-legenda-blok" style={{background:it.kleur}}/>
            <span>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   ACHTERSTAND VAN STAP 3, INGELOPEN BIJ STAP 8
   ─────────────────────────────────────────────────────────────
   exporteerPresentiePDF, hexNaarRgb, ACTIE_CATEGORIEEN, ALLE_ACTIES,
   getActieInfo en VELD_ZONES stonden ná P4 stap 3 (17 september 2026)
   nog in src/app.jsx — ze vielen destijds buiten het toen behandelde
   regelbereik en zijn blijven liggen (opstellingen.jsx, stap 7,
   documenteerde deze achterstand al bij het narekenen van dát bereik,
   zonder hem zelf op te lossen: dat hoorde niet bij die stap). exporteer-
   PresentiePDF wordt gebruikt vanuit TeamStatistieken's presentietab
   hierboven; hexNaarRgb is zijn interne kleurhulpje (ook gebruikt door
   tekenDSMBord in src/schermen/wedstrijden.jsx — werkt via gedeelde
   scope, geen probleem). ACTIE_CATEGORIEEN, ALLE_ACTIES, getActieInfo
   en VELD_ZONES worden gebruikt door LiveAnalyse hierboven.

   vandaagISO — het zevende, oorspronkelijk ook als "statistieken-
   achterstand" genoemde symbool — is NIET hierheen verplaatst: bij
   narekenen bleek dat LiveAnalyse/TeamStatistieken hem helemaal niet
   aanroepen. Zijn enige echte gebruikers zijn spelers.jsx en
   src/domein/opkomst.js — hij is daarom naar src/schermen/spelers.jsx
   verplaatst, niet naar hier. Zie de bestandskop daar. */

/* ═══════════════════════════════════════════════════════════
   COMPACTE SPELERSTATUS (opgave & aanwezigheid)
═══════════════════════════════════════════════════════════ */
/* PRESENTIE_SOORTEN, presentieUitOpstelling, presentieGebeurtenissen en
   presentieTabel staan sinds stap 4 (17 september 2026) in
   src/domein/opkomst.js. */

/* ── Presentieoverzicht als PDF, liggend zodat de kolommen passen ── */
function exporteerPresentiePDF(gebeurtenissen, tabel, filterLabel) {
  if (!window.jspdf) { meldFout("PDF-bibliotheek nog niet geladen. Probeer het zo nog eens."); return; }
  if (!gebeurtenissen.length) { meldFout("Er is nog niets om te tonen."); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({orientation:"landscape", unit:"mm", format:"a4"});
  var W = 297, H = 210, M = 12;

  /* Hoeveel kolommen passen er? De rest gaat naar een volgende pagina. */
  var naamB = 52, pctB = 22;
  var ruimte = W - 2*M - naamB - pctB;
  var kolB = Math.max(8, Math.min(13, ruimte / Math.max(1, gebeurtenissen.length)));
  var perPagina = Math.floor(ruimte / kolB);
  var blokken = [];
  for (var i = 0; i < gebeurtenissen.length; i += perPagina) {
    blokken.push({van:i, tot:Math.min(i+perPagina, gebeurtenissen.length)});
  }

  blokken.forEach(function(blok, bi){
    if (bi > 0) doc.addPage();
    var y = M;

    /* Kop */
    doc.setFillColor(6,47,110);
    doc.rect(0, 0, W, 24, "F");
    doc.setFillColor(56,182,255);
    doc.rect(0, 22, W, 2, "F");
    var tx = pdfWapen(doc, M, 4.5, 14);
    doc.setTextColor(255,255,255);
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("PRESENTIEOVERZICHT", tx, 9);
    doc.setFontSize(13);
    doc.text(teamNaamVol(), tx, 16.5);
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.setTextColor(180,212,244);
    var kopMeta = [filterLabel, gebeurtenissen.length + " gebeurtenissen"];
    if (tabel.gemiddelde !== null) kopMeta.push("gemiddelde opkomst " + tabel.gemiddelde + "%");
    if (blokken.length > 1) kopMeta.push("deel " + (bi+1) + " van " + blokken.length);
    doc.text(kopMeta.join("   ·   "), tx, 21);
    y = 32;

    /* Kolomkoppen: datum verticaal opgedeeld in dag en maand */
    doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
    doc.setTextColor(110,116,128);
    doc.text("SPELER", M, y - 2);
    for (var k = blok.van; k < blok.tot; k++) {
      var g = gebeurtenissen[k];
      var d = parseerDatum(g.datum);
      var cx = M + naamB + (k - blok.van) * kolB + kolB/2;
      doc.setTextColor(110,116,128);
      doc.text(d ? String(d.getDate()) : "?", cx, y - 5.5, {align:"center"});
      doc.setFontSize(5.5);
      doc.text(d ? MAANDEN_VOL[d.getMonth()].slice(0,3) : "", cx, y - 2, {align:"center"});
      doc.setFontSize(6.5);
      /* streepje in de kleur van de soort */
      var kleur = g.soort==="wedstrijd" ? [0,74,173] : g.soort==="training" ? [56,182,255] : [139,92,246];
      doc.setFillColor(kleur[0], kleur[1], kleur[2]);
      doc.rect(cx - kolB/2 + 1, y - 1, kolB - 2, 1, "F");
    }
    doc.setTextColor(110,116,128); doc.setFontSize(6.5);
    doc.text("OPKOMST", W - M, y - 2, {align:"right"});
    y += 3;

    /* Rijen */
    doc.setFontSize(7.5);
    tabel.rijen.forEach(function(r, ri){
      if (y > H - 22) {
        doc.addPage(); y = M + 8;
        doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
        doc.setTextColor(110,116,128);
        doc.text("SPELER  (vervolg)", M, y - 2);
        y += 3;
        doc.setFontSize(7.5);
      }
      if (ri % 2 === 0) {
        doc.setFillColor(248,249,251);
        doc.rect(M - 2, y - 3.6, W - 2*M + 4, 5.6, "F");
      }
      doc.setFont("helvetica","normal"); doc.setTextColor(25,30,38);
      var naam = (r.speler.rugnummer ? r.speler.rugnummer + "  " : "") + r.speler.naam;
      doc.text(doc.splitTextToSize(naam, naamB - 3)[0], M, y);

      for (var k2 = blok.van; k2 < blok.tot; k2++) {
        var c = r.cellen[k2];
        var cx2 = M + naamB + (k2 - blok.van) * kolB + kolB/2;
        if (!c) {
          doc.setTextColor(190,194,200);
          doc.text("·", cx2, y, {align:"center"});
          continue;
        }
        var rgb = hexNaarRgb(c.kleur);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        /* Loopt dezelfde periode door naar links of rechts, dan wordt
           het vakje tot aan de buur doorgetrokken: één balk in plaats
           van losse blokjes. */
        var pid2 = c.periode ? c.periode.id : null;
        var vor  = r.cellen[k2-1], vol = r.cellen[k2+1];
        var uitL = (pid2 && k2 > blok.van && vor && vor.periode && vor.periode.id===pid2) ? 1.2 : 0;
        var uitR = (pid2 && k2 < blok.tot-1 && vol && vol.periode && vol.periode.id===pid2) ? 1.2 : 0;
        doc.roundedRect(cx2 - kolB/2 + 1.2 - uitL, y - 3.2,
                        kolB - 2.4 + uitL + uitR, 4.6,
                        (uitL||uitR) ? 0 : 0.8, (uitL||uitR) ? 0 : 0.8, "F");
        var op = hexNaarRgb(c.op);
        doc.setTextColor(op[0], op[1], op[2]);
        doc.setFont("helvetica","bold"); doc.setFontSize(5.8);
        doc.text(c.letter, cx2, y - 0.2, {align:"center"});
        doc.setFont("helvetica","normal"); doc.setFontSize(7.5);
      }

      doc.setFont("helvetica","bold");
      var pk = r.pct === null ? [130,136,146]
             : r.pct >= 85 ? [15,110,86] : r.pct >= 70 ? [186,117,23] : [163,45,45];
      doc.setTextColor(pk[0], pk[1], pk[2]);
      doc.text(r.pct === null ? "–" : r.pct + "%", W - M, y, {align:"right"});
      doc.setFont("helvetica","normal");
      y += 5.6;
    });

    /* Opkomst per gebeurtenis onderaan */
    y += 2;
    doc.setDrawColor(210,214,220); doc.setLineWidth(0.3);
    doc.line(M, y - 3, W - M, y - 3);
    doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
    doc.setTextColor(110,116,128);
    doc.text("OPKOMST", M, y + 0.5);
    doc.setFontSize(6);
    for (var k3 = blok.van; k3 < blok.tot; k3++) {
      var pk3 = tabel.perKolom[k3];
      var cx3 = M + naamB + (k3 - blok.van) * kolB + kolB/2;
      doc.setTextColor(60,66,76);
      doc.text(pk3.pct === null ? "–" : pk3.pct + "%", cx3, y + 0.5, {align:"center"});
    }
    if (tabel.gemiddelde !== null) {
      doc.setFontSize(7.5);
      doc.setTextColor(0,74,173);
      doc.text(tabel.gemiddelde + "%", W - M, y + 0.5, {align:"right"});
    }
    y += 8;

    /* Legenda */
    doc.setFont("helvetica","normal"); doc.setFontSize(6);
    var lx = M;
    /* Alleen de periodesoorten die echt in deze tabel staan, anders
       vult de legenda de halve regel met dingen die er niet zijn. */
    var gebruikt = {};
    tabel.rijen.forEach(function(rr){
      rr.cellen.forEach(function(cc){ if (cc && cc.periode) gebruikt[cc.periode.soort] = true; });
    });
    var legenda = AANWEZIG_KEUZES.concat(
      AFWEZIGHEID_SOORTEN.filter(function(s){ return gebruikt[s.id]; })
        .map(function(s){ return Object.assign({}, s, {label:s.label+" (periode)"}); })
    );
    legenda.forEach(function(kz){
      /* Past het niet meer op deze regel, dan begint de legenda
         een nieuwe in plaats van van het blad af te lopen. */
      var breedte = 8 + doc.getTextWidth(kz.label) + 6;
      if (lx + breedte > W - M) { lx = M; y += 5; }
      var rgb2 = hexNaarRgb(kz.kleur);
      doc.setFillColor(rgb2[0], rgb2[1], rgb2[2]);
      doc.roundedRect(lx, y - 2.6, 6, 3.6, 0.6, 0.6, "F");
      var op2 = hexNaarRgb(kz.op);
      doc.setTextColor(op2[0], op2[1], op2[2]);
      doc.setFont("helvetica","bold");
      doc.text(kz.letter, lx + 3, y, {align:"center"});
      doc.setFont("helvetica","normal");
      doc.setTextColor(90,96,106);
      doc.text(kz.label, lx + 7.5, y);
      lx += breedte;
    });

    pdfVoet(doc, W, H, {marge:M});
  });

  var bestand = "presentie-" + filterLabel.toLowerCase().replace(/[^a-z0-9]+/g,"-") + "-" +
                new Date().toISOString().slice(0,10);
  doc.save(bestand + ".pdf");
  meldGoed("Presentieoverzicht opgeslagen als " + bestand + ".pdf");
}

/* Kleurcode naar losse waarden voor jsPDF */
function hexNaarRgb(hex) {
  var c = String(hex || "#000000").replace("#","");
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  return [parseInt(c.slice(0,2),16) || 0, parseInt(c.slice(2,4),16) || 0, parseInt(c.slice(4,6),16) || 0];
}
