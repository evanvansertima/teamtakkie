/* ══════════════════════════════════════════════════════════════
   SCHERMEN: toernooi openbaar — release 3 van docs/updateplan-
   competitie-toernooi-ai.md (hoofdstuk 5g)
   ─────────────────────────────────────────────────────────────
   Twee kanten:
   1. StapPresentatie — de zesde stap in het toernooischerm: publiceren,
      bijwerken, intrekken, de link delen, kleur en mededeling.
   2. PubliekToernooi — de pagina achter app.teamtakkie.nl/?toernooi=…
      Voor iedereen, zonder account. Met &scherm=groot de tv-stand:
      grote letters en wisselende panelen.

   Wat openbaar gaat stelt publiekeMomentopname (src/domein/toernooi.js)
   samen: een lijst met toegestane velden, dus nooit contactgegevens.
   De server (server/23-toernooi-publiek.sql) weigert ze ook nog eens.
   ══════════════════════════════════════════════════════════════ */

/* De link van een gepubliceerd toernooi. Zelfde adres als de app, dus
   werkt op app.teamtakkie.nl en op een testadres. */
function publiekeLink(slug, groot) {
  var basis = location.origin + location.pathname;
  return basis + "?toernooi=" + encodeURIComponent(slug) + (groot ? "&scherm=groot" : "");
}

/* Publiceren of bijwerken. Geeft {ok, slug} of {ok:false, tekst}. */
function publiceerToernooi(t) {
  if (!serverAan() || !ingelogd()) return Promise.resolve({ ok: false, tekst: "Log in om een toernooi openbaar te maken." });
  if (!_actiefTeam) return Promise.resolve({ ok: false, tekst: "Geen team gekozen." });
  var p = t.presentatie || {};
  var inhoud = publiekeMomentopname(t, { logo: p.metLogo ? (inst().logo || "") : "" });
  return serverVraag("/rest/v1/rpc/toernooi_publiceren", { methode: "POST", lichaam: { p_team: _actiefTeam, p_toernooi: t.id, p_inhoud: inhoud } })
    .then(function (r) {
      if (r.ok && typeof r.gegevens === "string") return { ok: true, slug: r.gegevens };
      var tekst = (r.fout && r.fout.tekst) || "Publiceren lukte niet.";
      if (/function .* does not exist|Could not find the function|PGRST202/i.test(tekst)) tekst = "De server kent publiceren nog niet. Draai eerst server/23-toernooi-publiek.sql in Supabase.";
      return { ok: false, tekst: tekst };
    })
    .catch(function () { return { ok: false, tekst: "Geen verbinding met de server." }; });
}
function trekToernooiIn(t) {
  if (!serverAan() || !ingelogd()) return Promise.resolve({ ok: false, tekst: "Log in om de link in te trekken." });
  return serverVraag("/rest/v1/rpc/toernooi_intrekken", { methode: "POST", lichaam: { p_team: _actiefTeam, p_toernooi: t.id } })
    .then(function (r) { return r.ok ? { ok: true } : { ok: false, tekst: (r.fout && r.fout.tekst) || "Intrekken lukte niet." }; })
    .catch(function () { return { ok: false, tekst: "Geen verbinding met de server." }; });
}

/* Automatisch bijwerken: na een wijziging even wachten, zodat tien
   uitslagen achter elkaar één keer publiceren opleveren en niet tien. */
var _publiceerWacht = {};
function publiceerLater(t) {
  if (!t.publiek || !t.publiek.slug || !t.publiek.automatisch) return;
  clearTimeout(_publiceerWacht[t.id]);
  _publiceerWacht[t.id] = setTimeout(function () {
    var nieuwste = (laadJson(TOERNOOIEN2_KEY) || []).filter(function (x) { return x.id === t.id; })[0];
    if (nieuwste && nieuwste.publiek && nieuwste.publiek.automatisch) publiceerToernooi(nieuwste);
  }, 5000);
}

/* ═══ Stap 6: Presentatie ═══ */
function StapPresentatie({ t, mag, wijzig }) {
  const [bezig, setBezig] = useState(false);
  var pub = t.publiek || null;
  var p = t.presentatie || {};
  function zetPresentatie(w) { wijzig(function (x) { return Object.assign({}, x, { presentatie: Object.assign({}, x.presentatie || {}, w) }); }); }
  function publiceer() {
    setBezig(true);
    publiceerToernooi(t).then(function (r) {
      setBezig(false);
      if (!r.ok) { meldFout(r.tekst); return; }
      wijzig(function (x) {
        return Object.assign({}, x, { publiek: { slug: r.slug, gepubliceerdOp: new Date().toISOString(), automatisch: x.publiek ? x.publiek.automatisch !== false : true } });
      });
      meldGoed(pub ? "Bijgewerkt" : "Het toernooi is openbaar");
    });
  }
  function kopieer(tekst) {
    try { navigator.clipboard.writeText(tekst).then(function () { meldGoed("Link gekopieerd"); }, function () { meldFout("Kopiëren lukte niet. Houd de link ingedrukt om hem te kopiëren."); }); }
    catch (e) { meldFout("Kopiëren lukte niet."); }
  }
  function deel(tekst) {
    if (navigator.share) navigator.share({ title: t.naam, text: t.naam + " — schema, uitslagen en standen", url: tekst }).catch(function () {});
    else kopieer(tekst);
  }
  var heeftLogo = !!(inst().logo);
  return (
    <div>
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-tv"/> Openbaar maken</div>
        <p style={{fontSize:13,color:"var(--grijs-donker)",lineHeight:1.6,margin:"0 0 10px"}}>
          Met een openbare link kan iedereen het schema, de uitslagen en de standen volgen — ook zonder account.
          Handig voor ouders langs de lijn en voor een tv in de kantine. Contactgegevens, notities en spelerslijsten
          komen er nooit in.
        </p>
        {!pub ? (
          mag && <button className="knop" disabled={bezig} onClick={publiceer}><i className="fa-solid fa-globe"/> {bezig ? "Bezig…" : "Publiceren"}</button>
        ) : (
          <div>
            <div className="melding"><i className="fa-solid fa-circle-check" style={{color:"var(--succes)"}}/>
              <div>{"Openbaar sinds " + new Date(pub.gepubliceerdOp).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + "."}</div>
            </div>
            <LinkRegel label="Voor telefoons" link={publiekeLink(pub.slug, false)} opKopieer={kopieer} opDeel={deel} />
            <LinkRegel label="Voor een tv of groot scherm" link={publiekeLink(pub.slug, true)} opKopieer={kopieer} opDeel={deel} />
            {mag && (
              <>
                <label style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13,margin:"10px 0"}}>
                  <input type="checkbox" checked={pub.automatisch !== false} onChange={function (e) {
                    var aan = e.target.checked;
                    wijzig(function (x) { return Object.assign({}, x, { publiek: Object.assign({}, x.publiek, { automatisch: aan }) }); });
                  }} />
                  <span>Automatisch bijwerken — elke uitslag of wijziging staat binnen een halve minuut op de openbare pagina.</span>
                </label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button className="knop klein" disabled={bezig} onClick={publiceer}><i className="fa-solid fa-rotate"/> {bezig ? "Bezig…" : "Nu bijwerken"}</button>
                  <button className="knop lijn klein" style={{color:"var(--gevaar)"}} disabled={bezig} onClick={function () {
                    setBezig(true);
                    trekToernooiIn(t).then(function (r) {
                      setBezig(false);
                      if (!r.ok) { meldFout(r.tekst); return; }
                      wijzig(function (x) { var n = Object.assign({}, x); delete n.publiek; return n; });
                      meldGoed("De link werkt niet meer");
                    });
                  }}><i className="fa-solid fa-ban"/> Intrekken</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-palette"/> Uiterlijk</div>
        <label className="formulier-label">Kleur</label>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
          <input type="color" aria-label="Kleur van de openbare pagina" value={p.kleur || "#004aad"} disabled={!mag}
            style={{width:48,height:40,border:"none",background:"none",padding:0}}
            onChange={function (e) { zetPresentatie({ kleur: e.target.value }); }} />
          {p.kleur && mag && <button className="knop lijn klein" onClick={function () { zetPresentatie({ kleur: "" }); }}>Standaard</button>}
        </div>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,marginBottom:12,opacity:heeftLogo ? 1 : .55}}>
          <input type="checkbox" checked={!!p.metLogo && heeftLogo} disabled={!mag || !heeftLogo} onChange={function (e) { zetPresentatie({ metLogo: e.target.checked }); }} />
          {heeftLogo ? "Clublogo tonen" : "Clublogo tonen (stel eerst een logo in bij Instellingen)"}
        </label>
        <label className="formulier-label">Mededeling</label>
        <TVeld waarde={p.mededeling || ""} disabled={!mag} placeholder="Bijv. Prijsuitreiking om 16:30 bij het clubhuis"
          opKlaar={function (v) { zetPresentatie({ mededeling: v.trim().slice(0, 200) }); }} />
        <p style={{fontSize:11,color:"var(--grijs-donker)",margin:0}}>Bovenaan de openbare pagina, en op een groot scherm als eigen paneel.
          {pub && " Kleur, logo en mededeling verschijnen na het bijwerken."}</p>
      </div>

      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-circle-question"/> Op een tv in de kantine</div>
        <ul style={{fontSize:13,lineHeight:1.7,margin:0,paddingLeft:18}}>
          <li>Een laptop aan de tv: open de tv-link en klik op <b>Volledig scherm</b>.</li>
          <li>Chromecast: open de tv-link in Chrome op een laptop, kies ⋮ → <b>Casten</b> → <b>Tabblad casten</b>.</li>
          <li>Apple TV: open de tv-link op een Mac of iPad en kies <b>Scherm synchroniseren</b>.</li>
        </ul>
        <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"8px 0 0"}}>De pagina ververst zichzelf; je hoeft er niets meer aan te doen.</p>
      </div>
    </div>
  );
}

function LinkRegel({ label, link, opKopieer, opDeel }) {
  return (
    <div style={{marginBottom:10}}>
      <label className="formulier-label">{label}</label>
      <div style={{display:"flex",gap:6}}>
        <input className="formulier-input" readOnly value={link} style={{flex:1,marginBottom:0,fontSize:12,minWidth:0}}
          onFocus={function (e) { e.target.select(); }} aria-label={label} />
        <button className="knop lijn klein" aria-label="Kopiëren" onClick={function () { opKopieer(link); }}><i className="fa-solid fa-copy"/></button>
        <button className="knop lijn klein" aria-label="Delen" onClick={function () { opDeel(link); }}><i className="fa-solid fa-share-nodes"/></button>
        <a className="knop lijn klein" aria-label="Openen" href={link} target="_blank" rel="noopener"><i className="fa-solid fa-up-right-from-square"/></a>
      </div>
    </div>
  );
}

/* ═══ De openbare pagina ═══ */

/* Zonder aanmelding: alleen de publieke sleutel, net als de officiële
   Supabase-bibliotheek doet. De leesfunctie geeft alleen dit ene
   toernooi terug, en alleen als je de code kent. */
function haalPubliek(slug, alleenVersie) {
  if (!serverAan()) return Promise.resolve({ ok: false, soort: "server" });
  var fn = alleenVersie ? "toernooi_publiek_versie" : "toernooi_publiek_lezen";
  return _haalOp("/rest/v1/rpc/" + fn, { methode: "POST", lichaam: { p_slug: slug } })
    .then(function (r) {
      if (!r.ok) return { ok: false, soort: "server" };
      if (alleenVersie) return { ok: true, versie: r.gegevens };
      var rij = Array.isArray(r.gegevens) ? r.gegevens[0] : null;
      return rij ? { ok: true, t: rij.inhoud, versie: rij.bijgewerkt_op } : { ok: false, soort: "weg" };
    })
    .catch(function () { return { ok: false, soort: "verbinding" }; });
}

function vandaagIso() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function nuMinuten() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
/* Is deze wedstrijd nu bezig (vandaag, tussen begin en einde)? */
function nuBezig(t, w) {
  if (!w.start || w.uitslag) return false;
  var dag = t.dagen.filter(function (d) { return d.id === w.dagId; })[0];
  if (!dag || dag.datum !== vandaagIso()) return false;
  var c = t.categorieen.filter(function (x) { return x.id === w.categorieId; })[0] || {};
  var b = minVan(w.start), n = nuMinuten();
  return n >= b && n < b + (c.wedstrijdduur || 0);
}

function PubliekToernooi({ slug, groot }) {
  const [stand, setStand] = useState({ laden: true });
  const versieRef = useRef(null);
  useEffect(function () {
    var weg = false;
    function laad() {
      haalPubliek(slug, false).then(function (r) {
        if (weg) return;
        if (r.ok) { versieRef.current = r.versie; setStand({ t: r.t, versie: r.versie }); }
        else setStand(function (oud) { return oud.t && r.soort === "verbinding" ? oud : { fout: r.soort }; });
      });
    }
    laad();
    /* Elke 20 seconden alleen het tijdstip vragen; de hele inhoud pas
       als er iets veranderd is. */
    var klok = setInterval(function () {
      haalPubliek(slug, true).then(function (r) {
        if (weg || !r.ok) return;
        if (!r.versie) { setStand({ fout: "weg" }); return; }
        if (r.versie !== versieRef.current) laad();
      });
    }, 20000);
    return function () { weg = true; clearInterval(klok); };
  }, [slug]);
  useEffect(function () { document.title = stand.t ? stand.t.naam + " · TEAMTAKKIE" : "Toernooi · TEAMTAKKIE"; }, [stand.t && stand.t.naam]);

  if (stand.laden) return <PubliekKader><p style={{textAlign:"center",padding:40}}>Laden…</p></PubliekKader>;
  if (stand.fout) {
    return (
      <PubliekKader>
        <div className="leeg" style={{marginTop:40}}>
          <div className="leeg-icoon"><i className="fa-solid fa-trophy"/></div>
          <h3>{stand.fout === "weg" ? "Dit toernooi is niet (meer) openbaar" : "Het toernooi kon niet worden geladen"}</h3>
          <p>{stand.fout === "weg" ? "Misschien is de link ingetrokken, of is hij niet helemaal goed overgenomen." : "Controleer je internetverbinding en probeer het opnieuw."}</p>
          <button className="knop" onClick={function () { location.reload(); }}>Opnieuw proberen</button>
        </div>
      </PubliekKader>
    );
  }
  return groot ? <GrootScherm t={stand.t} /> : <PubliekPagina t={stand.t} />;
}

function PubliekKader({ children, kleur }) {
  return <div style={{minHeight:"100vh",background:"var(--achtergrond, #f4f6f9)",color:"var(--tekst)"}}>
    <div style={{maxWidth:760,margin:"0 auto",padding:"0 16px 40px"}}>{children}</div>
  </div>;
}

function PubliekKop({ t, klein }) {
  var p = t.presentatie || {};
  var kleur = p.kleur || "#004aad";
  return (
    <div style={{background:"linear-gradient(150deg," + kleur + " 0%," + kleur + "cc 100%)",color:"#fff",borderRadius:"0 0 18px 18px",padding:klein ? "14px 16px" : "20px 18px",margin:"0 -16px 12px"}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        {p.logo && <img src={p.logo} alt="" style={{width:44,height:44,objectFit:"contain",background:"#fff",borderRadius:10,padding:3}} />}
        <div style={{minWidth:0}}>
          <div style={{fontSize:10,opacity:.8,textTransform:"uppercase",letterSpacing:1.2,fontWeight:700}}>Toernooi</div>
          <div style={{fontSize:22,fontWeight:700,lineHeight:1.15,overflowWrap:"anywhere"}}>{t.naam}</div>
          <div style={{fontSize:12,opacity:.85,marginTop:3}}>
            {t.dagen.filter(function (d) { return d.datum; }).map(function (d) { return formateerDatumKort(d.datum); }).join(", ")}
            {t.locaties.length === 1 ? " · " + t.locaties[0].naam : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function PubliekPagina({ t }) {
  const [tab, setTab] = useState("programma");
  const [catId, setCatId] = useState("");
  const [volg, setVolg] = useState(function () { try { return localStorage.getItem("tt_volg_" + t.id) || ""; } catch (e) { return ""; } });
  function zetVolg(id) { setVolg(id); try { localStorage.setItem("tt_volg_" + t.id, id); } catch (e) {} }
  var p = t.presentatie || {};
  var heeftKo = t.stadia.some(function (s) { return s.soort === "knockout" && (!catId || s.categorieId === catId); });
  var tabs = [["programma", "Programma"], ["standen", "Standen"]];
  if (heeftKo) tabs.push(["knockout", "Knock-out"]);
  var tt = catId ? filterCategorie(t, catId) : t;
  var regels = schemaRegels(tt);
  var opNummer = {};
  t.wedstrijden.forEach(function (w) { opNummer[w.nummer] = w; });
  if (volg) regels = regels.filter(function (r) { var d = deelnemersVan(t, opNummer[r.nummer]); return d.thuis === volg || d.uit === volg; });
  var volgNaam = tNaam(t, volg);
  var dagKop = null;
  return (
    <PubliekKader>
      <PubliekKop t={t} />
      {p.mededeling && <div className="melding"><i className="fa-solid fa-bullhorn"/> {p.mededeling}</div>}
      <div className="tabs">
        {tabs.map(function (x) { return <button key={x[0]} className={"tab-knop" + (tab === x[0] ? " actief" : "")} onClick={function () { setTab(x[0]); }}>{x[1]}</button>; })}
      </div>
      {t.categorieen.length > 1 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
          <button className="filter-chip" style={chipStijl(!catId)} onClick={function () { setCatId(""); }}>Alle</button>
          {t.categorieen.map(function (c) { return <button key={c.id} className="filter-chip" style={chipStijl(catId === c.id)} onClick={function () { setCatId(c.id); zetVolg(""); }}>{c.naam}</button>; })}
        </div>
      )}

      {tab === "programma" && (
        <div>
          <select className="formulier-input" value={volg} aria-label="Volg een team" onChange={function (e) { zetVolg(e.target.value); }}>
            <option value="">Alle wedstrijden</option>
            {tt.deelnemers.filter(function (d) { return !catId || d.categorieId === catId; }).map(function (d) { return <option key={d.id} value={d.id}>{"Volg " + d.naam}</option>; })}
          </select>
          <div className="kaart" style={{padding:"6px 14px"}}>
            {regels.length === 0 && <p style={{fontSize:13,color:"var(--grijs-donker)"}}>{volg ? "Nog geen wedstrijden bekend voor " + volgNaam + "." : "Nog geen wedstrijden."}</p>}
            {regels.map(function (r) {
              var w = opNummer[r.nummer];
              var kop = !w.dagId ? "Tijd nog niet bekend" : (r.dag ? new Date(r.dag).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }) : "");
              kop = kop.charAt(0).toUpperCase() + kop.slice(1);   // "Zondag 11 oktober" — maanden met een kleine letter
              var toonKop = kop && kop !== dagKop; dagKop = kop;
              var bezig = nuBezig(t, w);
              var d = deelnemersVan(t, w);
              var wint = w.uitslag ? winnaarVan(t, w) : null;
              return (
                <div key={w.id}>
                  {toonKop && <div className="review-label" style={{margin:"10px 0 4px",textTransform:"none"}}>{kop}</div>}
                  <div style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--grijs)",background:bezig ? "var(--vlak-info)" : "transparent"}}>
                    <span style={{width:48,flexShrink:0,fontWeight:700,fontSize:14}}>{w.start || "—"}</span>
                    <span style={{flex:1,minWidth:0}}>
                      <span style={{display:"block",fontSize:14,lineHeight:1.35,fontWeight:d.thuis === volg || (wint && wint === d.thuis) ? 700 : 400}}>{r.thuis}</span>
                      <span style={{display:"block",fontSize:14,lineHeight:1.35,fontWeight:d.uit === volg || (wint && wint === d.uit) ? 700 : 400}}>{r.uit}</span>
                      <span style={{display:"block",fontSize:11,color:"var(--grijs-donker)",marginTop:2}}>
                        {[r.veld && (t.locaties.length > 1 ? r.locatie + " · " : "") + r.veld, t.categorieen.length > 1 && !catId && r.categorie, r.ronde].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {bezig && <span style={{fontSize:11,fontWeight:700,color:"var(--succes)"}}>BEZIG</span>}
                    {w.uitslag && <span style={{textAlign:"right"}}>
                      <span style={{display:"block",fontWeight:700,fontSize:15}}>{w.uitslag.thuis}</span>
                      <span style={{display:"block",fontWeight:700,fontSize:15}}>{w.uitslag.uit}</span>
                    </span>}
                  </div>
                  {w.strafschoppen && <div style={{fontSize:11,color:"var(--grijs-donker)",textAlign:"right"}}>{"na strafschoppen " + w.strafschoppen.thuis + "–" + w.strafschoppen.uit}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === "standen" && <PubliekStanden t={t} catId={catId} volg={volg} />}
      {tab === "knockout" && <PubliekKnockout t={t} catId={catId} />}
      <p style={{fontSize:11,color:"var(--grijs-donker)",textAlign:"center",marginTop:16}}>Ververst vanzelf · gemaakt met TEAMTAKKIE</p>
    </PubliekKader>
  );
}

function PubliekStanden({ t, catId, volg, groot }) {
  var stadia = t.stadia.filter(function (s) { return s.soort === "poule" && (!catId || s.categorieId === catId); });
  if (!stadia.length) return <div className="kaart"><p style={{fontSize:13,color:"var(--grijs-donker)",margin:0}}>Nog geen poules.</p></div>;
  return (
    <div>
      {stadia.map(function (s) {
        var cat = categorieVan(t, s.categorieId);
        return s.poules.map(function (p) {
          return (
            <div key={p.id} className="kaart">
              <div className="kaart-titel">{(t.categorieen.length > 1 ? cat.naam + " · " : "") + (s.poules.length > 1 ? p.naam : s.naam)}</div>
              <PouleTabel t={t} s={s} p={p} volg={volg} />
            </div>
          );
        });
      })}
    </div>
  );
}

function PouleTabel({ t, s, p, volg, groot }) {
  var stand = pouleStand(t, s.id, p.id);
  var f = groot ? 1.6 : 1;
  return (
    <div style={{overflowX:"auto"}}>
      <table className="stand-tabel" style={groot ? {fontSize:22} : null}>
        <thead><tr><th style={{width:30 * f}}>#</th><th className="links">Team</th><th>G</th><th>W</th><th>GL</th><th>V</th><th>DS</th><th>P</th></tr></thead>
        <tbody>
          {stand.map(function (r) {
            var door = r.plek <= (s.doorgaan.perPoule || 0);
            return (
              <tr key={r.teamId} className={r.teamId === volg ? "eigen" : ""}>
                <td><span className="stand-pos" style={door ? {background:"var(--succes)",color:"#fff"} : null}>{r.plek}{r.gedeeld ? "=" : ""}</span></td>
                <td className="links naam">{r.naam}</td>
                <td>{r.gespeeld}</td><td>{r.winst}</td><td>{r.gelijk}</td><td>{r.verlies}</td>
                <td>{(r.saldo > 0 ? "+" : "") + r.saldo}</td><td style={{fontWeight:700}}>{r.punten}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PubliekKnockout({ t, catId, groot }) {
  var stadia = t.stadia.filter(function (s) { return s.soort === "knockout" && (!catId || s.categorieId === catId); });
  return (
    <div>
      {stadia.map(function (s) {
        var cat = categorieVan(t, s.categorieId);
        var ws = t.wedstrijden.filter(function (w) { return w.stadiumId === s.id; }).sort(function (a, b) { return a.nummer - b.nummer; });
        var rondes = [];
        ws.forEach(function (w) { if (rondes.indexOf(w.rondeNaam) < 0) rondes.push(w.rondeNaam); });
        var finale = ws.filter(function (w) { return w.rondeNaam === "Finale"; })[0];
        var kampioen = finale && winnaarVan(t, finale);
        return (
          <div key={s.id} className="kaart">
            <div className="kaart-titel">{(t.categorieen.length > 1 ? cat.naam + " · " : "") + "Knock-out"}</div>
            {kampioen && <div style={{fontWeight:700,fontSize:groot ? 30 : 16,marginBottom:10}}><i className="fa-solid fa-trophy" style={{color:"var(--oranje)"}}/>{" Winnaar: " + tNaam(t, kampioen)}</div>}
            {rondes.map(function (r) {
              return (
                <div key={r} style={{marginBottom:8}}>
                  <div className="review-label" style={{margin:"6px 0 2px"}}>{r}</div>
                  {ws.filter(function (w) { return w.rondeNaam === r; }).map(function (w) {
                    var win = winnaarVan(t, w), d = deelnemersVan(t, w);
                    return (
                      <div key={w.id} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:"1px solid var(--grijs)",fontSize:groot ? 24 : 14}}>
                        <span style={{flex:1,minWidth:0}}>
                          <span style={{display:"block",fontWeight:win && win === d.thuis ? 700 : 400,color:d.thuis ? "inherit" : "var(--grijs-donker)"}}>{kantNaam(t, w, "thuis")}</span>
                          <span style={{display:"block",fontWeight:win && win === d.uit ? 700 : 400,color:d.uit ? "inherit" : "var(--grijs-donker)"}}>{kantNaam(t, w, "uit")}</span>
                        </span>
                        {w.uitslag ? <span style={{fontWeight:700,textAlign:"right"}}>{w.uitslag.thuis + "–" + w.uitslag.uit}{w.strafschoppen && <span style={{display:"block",fontSize:"0.7em",fontWeight:400}}>{"(" + w.strafschoppen.thuis + "–" + w.strafschoppen.uit + " n.s.)"}</span>}</span>
                          : <span style={{color:"var(--grijs-donker)"}}>{w.start || ""}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* De tv-stand: grote letters, wisselende panelen. Geen geluid; wie
   "minder beweging" heeft ingesteld krijgt geen overgangen. */
function GrootScherm({ t }) {
  const [i, setI] = useState(0);
  const [, setTik] = useState(0);
  const [vol, setVol] = useState(false);
  var p = t.presentatie || {};
  var kleur = p.kleur || "#004aad";
  var opNummer = {};
  t.wedstrijden.forEach(function (w) { opNummer[w.nummer] = w; });
  var regels = schemaRegels(t);
  var vandaag = vandaagIso(), nu = nuMinuten();
  var dagVan = {};
  t.dagen.forEach(function (d) { dagVan[d.id] = d.datum; });
  /* Aankomend: nog niet gespeeld, vanaf nu (vandaag) of de eerstvolgende. */
  var aankomend = regels.filter(function (r) {
    var w = opNummer[r.nummer];
    if (w.uitslag || !w.start) return false;
    var dd = dagVan[w.dagId] || "";
    return dd > vandaag || (dd === vandaag && minVan(w.start) + 30 >= nu) || !dd || dd < vandaag;
  }).slice(0, 8);
  var uitslagen = regels.filter(function (r) { return opNummer[r.nummer].uitslag; }).slice(-8).reverse();
  var panelen = [];
  if (p.mededeling) panelen.push({ id: "mededeling", titel: "Mededeling" });
  if (aankomend.length) panelen.push({ id: "aankomend", titel: "Volgende wedstrijden" });
  if (uitslagen.length) panelen.push({ id: "uitslagen", titel: "Laatste uitslagen" });
  t.stadia.forEach(function (s) {
    var cat = categorieVan(t, s.categorieId);
    if (s.soort === "poule") s.poules.forEach(function (pl) { panelen.push({ id: "poule-" + pl.id, titel: "Stand " + (t.categorieen.length > 1 ? cat.naam + " · " : "") + (s.poules.length > 1 ? pl.naam : s.naam), s: s, p: pl }); });
    else panelen.push({ id: "ko-" + s.id, titel: (t.categorieen.length > 1 ? cat.naam + " · " : "") + "Knock-out", ko: s });
  });
  if (!panelen.length) panelen.push({ id: "leeg", titel: t.naam });
  var paneel = panelen[i % panelen.length];
  useEffect(function () {
    var a = setInterval(function () { setI(function (x) { return x + 1; }); }, 12000);
    var b = setInterval(function () { setTik(function (x) { return x + 1; }); }, 30000);
    function fs() { setVol(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", fs);
    return function () { clearInterval(a); clearInterval(b); document.removeEventListener("fullscreenchange", fs); };
  }, []);
  var rustig = false;
  try { rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  function lijst(rs, metUitslag) {
    return rs.map(function (r) {
      var w = opNummer[r.nummer];
      var bezig = nuBezig(t, w);
      return (
        <div key={w.id} style={{display:"flex",gap:24,alignItems:"center",padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,.15)",fontSize:"2.4vw"}}>
          <span style={{width:"9vw",fontWeight:700}}>{w.start}</span>
          <span style={{flex:1,minWidth:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.thuis + "  –  " + r.uit}</span>
          {metUitslag ? <span style={{fontWeight:800}}>{w.uitslag.thuis + " – " + w.uitslag.uit}</span>
            : <span style={{opacity:.75,fontSize:"1.8vw"}}>{bezig ? "● bezig · " : ""}{r.veld}</span>}
        </div>
      );
    });
  }
  return (
    <div style={{minHeight:"100vh",background:"#0b1424",color:"#fff",display:"flex",flexDirection:"column",fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
      <div style={{background:kleur,padding:"1.6vw 3vw",display:"flex",alignItems:"center",gap:"2vw"}}>
        {p.logo && <img src={p.logo} alt="" style={{height:"5vw",background:"#fff",borderRadius:12,padding:6}} />}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"3vw",fontWeight:800,lineHeight:1.1}}>{t.naam}</div>
          <div style={{fontSize:"1.6vw",opacity:.85}}>{paneel.titel}</div>
        </div>
        <div style={{fontSize:"3vw",fontWeight:700}}>{new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</div>
        {!vol && document.fullscreenEnabled && (
          <button onClick={function () { document.documentElement.requestFullscreen().catch(function () {}); }}
            style={{background:"rgba(255,255,255,.2)",color:"#fff",border:0,borderRadius:10,padding:"10px 16px",fontSize:16,cursor:"pointer"}}>
            <i className="fa-solid fa-expand"/> Volledig scherm</button>
        )}
      </div>
      <div key={paneel.id + (i % panelen.length)} style={{flex:1,padding:"2vw 3vw",animation:rustig ? "none" : "ttFade .6s ease"}}>
        {paneel.id === "mededeling" && <div style={{fontSize:"5vw",fontWeight:800,lineHeight:1.2,marginTop:"8vh",textAlign:"center"}}><i className="fa-solid fa-bullhorn"/><div>{p.mededeling}</div></div>}
        {paneel.id === "aankomend" && lijst(aankomend, false)}
        {paneel.id === "uitslagen" && lijst(uitslagen, true)}
        {paneel.s && <div style={{background:"#fff",color:"#111",borderRadius:16,padding:"1vw 2vw",fontSize:"2vw"}}><PouleTabel t={t} s={paneel.s} p={paneel.p} groot /></div>}
        {paneel.ko && <div style={{background:"#fff",color:"#111",borderRadius:16,padding:"1vw 2vw"}}><PubliekKnockout t={t} catId={paneel.ko.categorieId} groot /></div>}
        {paneel.id === "leeg" && <div style={{fontSize:"3vw",textAlign:"center",marginTop:"10vh"}}>Het schema volgt.</div>}
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:8,padding:"1vw"}}>
        {panelen.map(function (x, k) { return <span key={x.id} style={{width:10,height:10,borderRadius:5,background:k === i % panelen.length ? "#fff" : "rgba(255,255,255,.3)"}}/>; })}
      </div>
      <style>{"@keyframes ttFade{from{opacity:0}to{opacity:1}}"}</style>
    </div>
  );
}
