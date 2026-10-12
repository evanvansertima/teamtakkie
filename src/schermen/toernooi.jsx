/* ══════════════════════════════════════════════════════════════
   SCHERMEN: toernooi — release 2 van docs/updateplan-competitie-
   toernooi-ai.md (hoofdstuk 3c, 4e, 5e)
   ─────────────────────────────────────────────────────────────
   Eén toernooi = één scherm met vijf stappen: Instellingen ·
   Deelnemers · Indeling · Schema · Resultaten. Elke stap bewaart
   meteen; je kunt vrij heen en weer. Al het rekenwerk staat in
   src/domein/toernooi.js — hier staat alleen wat je ziet en aanraakt.

   Vervangt ToernooienTab (de oude versie met één poule). De oude
   gegevens (fch_toernooien_v1) worden bij de eerste keer openen
   omgezet naar fch_toernooien_v2 en zelf nooit aangeraakt: dat is de
   terugvalroute, net als de oude stand bij de competitie.

   Contactgegevens (e-mail, telefoon) van teams en scheidsrechters
   staan alleen in dit beheerscherm. Ze komen nooit in een download.

   Hoort bij Coach en Club (besluit 2 van Evan, 9 oktober 2026). Free
   ziet een slotje.
   ══════════════════════════════════════════════════════════════ */

const TOERNOOIEN2_KEY = "fch_toernooien_v2";

/* Eerste keer openen: v1 omzetten. Alleen als er nog géén v2-sleutel
   is — ook een lege lijst telt als "er is al een v2". Anders zou iemand
   die al zijn toernooien heeft weggegooid ze bij elke start terugkrijgen.
   Er wordt alleen geschreven als er echt iets om te zetten valt
   (5 september 2026: een scherm dat bij openen schrijft, wint botsingen
   die het niet hoort te winnen). */
function laadToernooienV2() {
  var bestaat = false;
  try { bestaat = localStorage.getItem(sleutelVoor(TOERNOOIEN2_KEY)) !== null; } catch (e) {}
  if (bestaat) return laadJson(TOERNOOIEN2_KEY);
  var oud = laadToernooien();
  if (!oud.length) return [];
  var nieuw = [];
  oud.forEach(function (o) { try { nieuw.push(migreerToernooiV1(o)); } catch (e) {} });
  slaJson(TOERNOOIEN2_KEY, nieuw);
  return nieuw;
}

const TOERNOOI_STAPPEN = [
  { id: "instellingen", label: "Instellingen", icoon: "fa-solid fa-sliders" },
  { id: "deelnemers",   label: "Deelnemers",   icoon: "fa-solid fa-users" },
  { id: "indeling",     label: "Indeling",     icoon: "fa-solid fa-diagram-project" },
  { id: "schema",       label: "Schema",       icoon: "fa-solid fa-clock" },
  { id: "resultaten",   label: "Resultaten",   icoon: "fa-solid fa-ranking-star" },
  { id: "presentatie",  label: "Presentatie",  icoon: "fa-solid fa-tv" }   // src/schermen/toernooi-publiek.jsx
];
const KNOCKOUT_GELIJK_LABEL = {
  "strafschoppen": "Direct strafschoppen",
  "verlenging+strafschoppen": "Verlenging, dan strafschoppen"
};

/* Een tekstvak dat pas bewaart als je het verlaat (of op Enter drukt).
   Bewaren bij elke toetsaanslag zou bij elke letter een wijziging naar
   de server sturen. */
function TVeld({ waarde, opKlaar, className, ...rest }) {
  const [ruw, setRuw] = useState(null);
  var echt = waarde === null || waarde === undefined ? "" : String(waarde);
  return (
    <input {...rest} className={className || "formulier-input"} value={ruw !== null ? ruw : echt}
      onFocus={function () { setRuw(echt); }}
      onChange={function (e) { setRuw(e.target.value); }}
      onBlur={function () { var v = ruw; setRuw(null); if (v !== null && v !== echt) opKlaar(v); }}
      onKeyDown={function (e) { if (e.key === "Enter") e.target.blur(); }} />
  );
}

function tNaam(t, id) {
  var d = id && t.deelnemers.filter(function (x) { return x.id === id; })[0];
  return d ? d.naam : null;
}
/* Wie speelt (naam), of waar die vandaan komt ("Winnaar wedstrijd 9"). */
function kantNaam(t, w, kant) {
  var d = deelnemersVan(t, w);
  return tNaam(t, d[kant]) || bronTekst(t, w[kant]);
}
function aantalTekst(n, een, meer) { return n + " " + (n === 1 ? een : meer); }
function deelnemerWoord(cat, meer) { return cat.spelvorm === "1x1" ? (meer ? "spelers" : "speler") : (meer ? "teams" : "team"); }

/* Wedstrijden losmaken van een dag of veld dat verdwijnt. */
function losVanPlek(t, past) {
  return Object.assign({}, t, { wedstrijden: t.wedstrijden.map(function (w) {
    return past(w) ? Object.assign({}, w, { dagId: null, veldId: null, start: null }) : w;
  }) });
}

function Bevestig({ titel, tekst, knop, gevaar, onJa, onNee }) {
  return (
    <div className="bevestig-overlay" onClick={function (e) { if (e.target === e.currentTarget) onNee(); }}>
      <div className="bevestig-kaart">
        <h3>{titel}</h3><p>{tekst}</p>
        <div className="bevestig-knoppen">
          <button className="knop lijn" onClick={onNee}>Annuleren</button>
          <button className={"knop" + (gevaar ? " gevaar" : "")} onClick={onJa}>{knop}</button>
        </div>
      </div>
    </div>
  );
}

function CategorieKiezer({ t, catId, opKies }) {
  if (t.categorieen.length < 2) return null;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
      {t.categorieen.map(function (c) {
        return <button key={c.id} className="filter-chip" style={chipStijl(c.id === catId)}
          onClick={function () { opKies(c.id); }}>{c.naam}</button>;
      })}
    </div>
  );
}
/* De gekozen categorie, en terugvallen op de eerste als die er niet meer is. */
function useCategorie(t) {
  const [catId, setCatId] = useState(t.categorieen[0] ? t.categorieen[0].id : null);
  var echt = t.categorieen.some(function (c) { return c.id === catId; }) ? catId : (t.categorieen[0] || {}).id;
  return [echt, setCatId];
}

/* ═══ De lijst met toernooien ═══ */
function ToernooiModule() {
  const [lijst, setLijst] = useState(laadToernooienV2);
  const ref = useRef(lijst);
  const [openId, setOpenId] = useState(null);
  const [nieuw, setNieuw] = useState(null);
  const mag = magRol("wedstrijd");

  if (!magModule("toernooi")) {
    var p = pakketVoorModule("toernooi");
    return (
      <div className="leeg">
        <div className="leeg-icoon"><i className="fa-solid fa-lock"/></div>
        <h3>Toernooien</h3>
        <p>{slotZin("toernooi")} Organiseer een toernooi met categorieën, poules, knock-out, een speelschema
          en wedstrijdbriefjes om te printen.</p>
        <button className="knop" onClick={function () { if (_pakkettenOpener) _pakkettenOpener(p ? p.id : null); }}>Bekijk pakketten</button>
      </div>
    );
  }

  /* Altijd op de nieuwste versie: twee uitslagen snel achter elkaar
     mogen elkaar niet overschrijven. Geeft terug of het gelukt is, zodat
     een venster alleen sluit als de wijziging er echt in staat. */
  function wijzig(id, maak) {
    var oud = ref.current;
    var t = oud.filter(function (x) { return x.id === id; })[0];
    if (!t) return false;
    var nt;
    try { nt = maak(t); } catch (e) { meldFout((e && e.message) || "Dat lukte niet."); return false; }
    var l = oud.map(function (x) { return x.id === id ? nt : x; });
    ref.current = l; setLijst(l); slaJson(TOERNOOIEN2_KEY, l);
    publiceerLater(nt);   // alleen als het toernooi openbaar is en automatisch bijwerken aan staat
    return true;
  }
  function zetLijst(l) { ref.current = l; setLijst(l); slaJson(TOERNOOIEN2_KEY, l); }

  var open = openId && lijst.filter(function (x) { return x.id === openId; })[0];
  if (open) {
    return <ToernooiScherm t={open} mag={mag}
      wijzig={function (maak) { return wijzig(open.id, maak); }}
      onTerug={function () { setOpenId(null); }}
      onWeg={function () {
        var weg = open;
        zetLijst(ref.current.filter(function (x) { return x.id !== weg.id; }));
        setOpenId(null);
        toon("Toernooi “" + weg.naam + "” verwijderd", { actie: function () { zetLijst(ref.current.concat([weg])); } });
      }} />;
  }

  var gesorteerd = lijst.slice().sort(function (a, b) { return String(b.dagen[0] && b.dagen[0].datum).localeCompare(String(a.dagen[0] && a.dagen[0].datum)); });
  return (
    <div>
      <div className="pagina-header">
        <div className="pagina-header-tekst">
          <div className="eyebrow">Poules, knock-out &amp; schema</div>
          <h2>Toernooien</h2>
          <p>{lijst.length === 0 ? "Organiseer een toernooi" : aantalTekst(lijst.length, "toernooi", "toernooien")}</p>
        </div>
        {mag && <button className="knop-plus" aria-label="Nieuw toernooi" onClick={function () { setNieuw({ naam: "", datum: "" }); }}>+</button>}
      </div>

      {gesorteerd.length === 0 ? (
        <div className="leeg">
          <div className="leeg-icoon"><i className="fa-solid fa-trophy"/></div>
          <h3>Nog geen toernooien</h3>
          <p>Maak categorieën (bijvoorbeeld JO11 6x6 en JO13 8x8), voeg teams toe, deel ze in poules in en
            plan de wedstrijden op velden en tijden. Uitslagen, standen en de knock-out volgen vanzelf.</p>
          {mag && <button className="knop" onClick={function () { setNieuw({ naam: "", datum: "" }); }}>+ Eerste toernooi</button>}
        </div>
      ) : gesorteerd.map(function (t) {
        var gespeeld = t.wedstrijden.filter(function (w) { return w.status === "gespeeld"; }).length;
        var dag = t.dagen[0] && t.dagen[0].datum;
        return (
          <div key={t.id} className="toernooi-kaart" onClick={function () { setOpenId(t.id); }}>
            <div className="toernooi-naam">{t.naam}</div>
            <div className="toernooi-meta">
              {dag && <span><i className="fa-solid fa-calendar-days"/>{" " + formateerDatumKort(dag) + (t.dagen.length > 1 ? " +" + (t.dagen.length - 1) : "")}</span>}
              <span><i className="fa-solid fa-users-line"/>{" " + aantalTekst(t.deelnemers.length, "deelnemer", "deelnemers")}</span>
              {t.categorieen.length > 1 && <span><i className="fa-solid fa-layer-group"/>{" " + t.categorieen.length + " categorieën"}</span>}
              {t.wedstrijden.length > 0
                ? <span><i className="fa-solid fa-list-ol"/>{" " + gespeeld + "/" + t.wedstrijden.length + " gespeeld"}</span>
                : <span style={{color:"var(--oranje)",fontWeight:700}}>Nog geen indeling</span>}
            </div>
          </div>
        );
      })}

      {nieuw && (
        <div className="bevestig-overlay" onClick={function (e) { if (e.target === e.currentTarget) setNieuw(null); }}>
          <div className="bevestig-kaart" style={{textAlign:"left"}}>
            <h3>Nieuw toernooi</h3>
            <label className="formulier-label">Naam</label>
            <input className="formulier-input" autoFocus value={nieuw.naam} placeholder="Bijv. Paastoernooi 2027"
              onChange={function (e) { setNieuw(Object.assign({}, nieuw, { naam: e.target.value })); }} />
            <label className="formulier-label">Datum</label>
            <input className="formulier-input" type="date" value={nieuw.datum}
              onChange={function (e) { setNieuw(Object.assign({}, nieuw, { datum: e.target.value })); }} />
            <div className="bevestig-knoppen">
              <button className="knop lijn" onClick={function () { setNieuw(null); }}>Annuleren</button>
              <button className="knop" disabled={!nieuw.naam.trim()} onClick={function () {
                var t = maakToernooi({ naam: nieuw.naam.trim(), datum: nieuw.datum });
                zetLijst(ref.current.concat([t]));
                setNieuw(null); setOpenId(t.id);
                meldGoed("Toernooi aangemaakt");
              }}>Aanmaken</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Eén toernooi ═══ */
function ToernooiScherm({ t, mag, wijzig, onTerug, onWeg }) {
  const [stap, setStap] = useState(t.wedstrijden.length ? "resultaten" : "instellingen");
  var i = TOERNOOI_STAPPEN.map(function (s) { return s.id; }).indexOf(stap);
  var gespeeld = t.wedstrijden.filter(function (w) { return w.status === "gespeeld"; }).length;
  var props = { t: t, mag: mag, wijzig: wijzig };
  return (
    <div className="pagina-slide">
      <button className="back-knop" onClick={onTerug}><i className="fa-solid fa-arrow-left"/> Terug naar toernooien</button>

      <div style={{background:"linear-gradient(150deg,#062f6e 0%,var(--blauw) 55%,#0068d6 100%)",color:"#fff",borderRadius:18,padding:"20px 18px",marginBottom:12}}>
        <div style={{fontSize:10,opacity:.72,textTransform:"uppercase",letterSpacing:1.2,fontWeight:700}}>Toernooi</div>
        <div style={{fontSize:24,fontWeight:700,margin:"6px 0",letterSpacing:"-0.02em",lineHeight:1.15,overflowWrap:"anywhere"}}>{t.naam}</div>
        <div style={{fontSize:13,opacity:.87,display:"flex",flexWrap:"wrap",gap:12}}>
          {t.dagen[0] && t.dagen[0].datum && <span><i className="fa-solid fa-calendar-days"/>{" " + t.dagen.map(function (d) { return formateerDatumKort(d.datum); }).join(", ")}</span>}
          <span><i className="fa-solid fa-users-line"/>{" " + aantalTekst(t.deelnemers.length, "deelnemer", "deelnemers")}</span>
          {t.wedstrijden.length > 0 && <span><i className="fa-solid fa-list-ol"/>{" " + gespeeld + "/" + t.wedstrijden.length + " gespeeld"}</span>}
        </div>
      </div>

      {/* Stappenkiezer: een keuzelijst past op elke telefoon, vijf tabbladen niet. */}
      <div className="kaart" style={{padding:"10px 12px",display:"flex",gap:8,alignItems:"center"}}>
        <button className="knop lijn klein" style={{minHeight:44,minWidth:44}} disabled={i <= 0} aria-label="Vorige stap"
          onClick={function () { setStap(TOERNOOI_STAPPEN[i - 1].id); }}><i className="fa-solid fa-chevron-left"/></button>
        <select className="formulier-input" style={{flex:1,marginBottom:0,minHeight:44,fontWeight:700}} value={stap}
          aria-label="Stap" onChange={function (e) { setStap(e.target.value); }}>
          {TOERNOOI_STAPPEN.map(function (s, k) { return <option key={s.id} value={s.id}>{"Stap " + (k + 1) + " van " + TOERNOOI_STAPPEN.length + " · " + s.label}</option>; })}
        </select>
        <button className="knop lijn klein" style={{minHeight:44,minWidth:44}} disabled={i >= TOERNOOI_STAPPEN.length - 1} aria-label="Volgende stap"
          onClick={function () { setStap(TOERNOOI_STAPPEN[i + 1].id); }}><i className="fa-solid fa-chevron-right"/></button>
      </div>

      {!mag && (
        <div className="melding"><i className="fa-solid fa-eye"/> Je kijkt mee. Een trainer of eigenaar kan het toernooi aanpassen.</div>
      )}

      {stap === "instellingen" && <StapInstellingen {...props} onWeg={onWeg} />}
      {stap === "deelnemers" && <StapDeelnemers {...props} />}
      {stap === "indeling" && <StapIndeling {...props} />}
      {stap === "schema" && <StapSchema {...props} />}
      {stap === "resultaten" && <StapResultaten {...props} />}
      {stap === "presentatie" && <StapPresentatie {...props} />}
    </div>
  );
}

/* ═══ Stap 1: Instellingen ═══ */
function StapInstellingen({ t, mag, wijzig, onWeg }) {
  var spelvormen = SPELVORMEN.filter(function (sv) { return t.categorieen.some(function (c) { return c.spelvorm === sv; }); });
  const [vraag, setVraag] = useState(null);   // { titel, tekst, knop, doe }
  function zet(veld, waarde) { wijzig(function (x) { var o = {}; o[veld] = waarde; return Object.assign({}, x, o); }); }
  function zetIn(lijstNaam, id, wijzigingen) {
    wijzig(function (x) {
      var o = {};
      o[lijstNaam] = x[lijstNaam].map(function (y) { return y.id === id ? Object.assign({}, y, wijzigingen) : y; });
      return Object.assign({}, x, o);
    });
  }
  function geplandOp(past) { return t.wedstrijden.filter(function (w) { return w.dagId && past(w); }).length; }
  /* Iets weghalen waar geplande wedstrijden aan hangen: eerst zeggen wat er gebeurt. */
  function weghalen(titel, aantal, doe) {
    if (!aantal) { wijzig(doe); return; }
    setVraag({ titel: titel, tekst: aantalTekst(aantal, "geplande wedstrijd wordt", "geplande wedstrijden worden") + " losgemaakt van dag, veld en tijd. De wedstrijden zelf en hun uitslagen blijven.",
               knop: "Weghalen", doe: doe });
  }

  return (
    <div>
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-trophy"/> Toernooi</div>
        <label className="formulier-label">Naam</label>
        <TVeld waarde={t.naam} disabled={!mag} opKlaar={function (v) { if (v.trim()) zet("naam", v.trim()); }} />
      </div>

      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-calendar-days"/> Dagen</div>
        {t.dagen.map(function (d, k) {
          return (
            <div key={d.id} style={{borderBottom:"1px solid var(--grijs)",paddingBottom:8,marginBottom:8}}>
              <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                <div style={{flex:1,minWidth:0}}>
                  <label className="formulier-label">{t.dagen.length > 1 ? "Dag " + (k + 1) : "Datum"}</label>
                  <input className="formulier-input" type="date" value={d.datum || ""} disabled={!mag} style={{marginBottom:0}}
                    onChange={function (e) { zetIn("dagen", d.id, { datum: e.target.value }); }} />
                </div>
                {mag && t.dagen.length > 1 && (
                  <button className="knop lijn klein" style={{minHeight:44}} aria-label="Dag weghalen" onClick={function () {
                    weghalen("Dag weghalen?", geplandOp(function (w) { return w.dagId === d.id; }), function (x) {
                      x = losVanPlek(x, function (w) { return w.dagId === d.id; });
                      /* Evenementen en beschikbaarheid op die dag gaan mee weg. */
                      return Object.assign({}, x, { dagen: x.dagen.filter(function (y) { return y.id !== d.id; }),
                        evenementen: (x.evenementen || []).filter(function (e) { return e.dagId !== d.id; }),
                        scheidsrechters: x.scheidsrechters.map(function (sr) {
                          if (!(sr.beschikbaar || []).length) return sr;
                          return Object.assign({}, sr, { beschikbaar: sr.beschikbaar.filter(function (b) { return b.dagId !== d.id; }) });
                        }) });
                    });
                  }}><i className="fa-solid fa-trash"/></button>
                )}
              </div>
              <div className="formulier-rij" style={{marginTop:8}}>
                <div><label className="formulier-label">Begint</label>
                  <input className="formulier-input" type="time" value={d.start} disabled={!mag} style={{marginBottom:0}}
                    onChange={function (e) { if (e.target.value) zetIn("dagen", d.id, { start: e.target.value }); }} /></div>
                <div><label className="formulier-label">Eindigt</label>
                  <input className="formulier-input" type="time" value={d.eind} disabled={!mag} style={{marginBottom:0}}
                    onChange={function (e) { if (e.target.value) zetIn("dagen", d.id, { eind: e.target.value }); }} /></div>
              </div>
            </div>
          );
        })}
        {mag && <button className="knop lijn klein" onClick={function () {
          wijzig(function (x) {
            var laatste = x.dagen[x.dagen.length - 1];
            return Object.assign({}, x, { dagen: x.dagen.concat([{ id: tId("d"), datum: "", start: laatste.start, eind: laatste.eind }]) });
          });
        }}>+ Dag toevoegen</button>}
      </div>

      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-location-dot"/> Locaties en velden</div>
        {t.locaties.map(function (l) {
          return (
            <div key={l.id} style={{borderBottom:"1px solid var(--grijs)",paddingBottom:10,marginBottom:10}}>
              <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                <div style={{flex:1,minWidth:0}}>
                  <label className="formulier-label">Locatie</label>
                  <TVeld waarde={l.naam} disabled={!mag} style={{marginBottom:0}} opKlaar={function (v) { if (v.trim()) zetIn("locaties", l.id, { naam: v.trim() }); }} />
                </div>
                {mag && t.locaties.length > 1 && (
                  <button className="knop lijn klein" style={{minHeight:44}} aria-label="Locatie weghalen" onClick={function () {
                    var ids = l.velden.map(function (v) { return v.id; });
                    weghalen("Locatie weghalen?", geplandOp(function (w) { return ids.indexOf(w.veldId) >= 0; }), function (x) {
                      x = losVanPlek(x, function (w) { return ids.indexOf(w.veldId) >= 0; });
                      return Object.assign({}, x, { locaties: x.locaties.filter(function (y) { return y.id !== l.id; }) });
                    });
                  }}><i className="fa-solid fa-trash"/></button>
                )}
              </div>
              <label className="formulier-label" style={{marginTop:8}}>Adres (optioneel)</label>
              <TVeld waarde={l.adres} disabled={!mag} style={{marginBottom:6}} opKlaar={function (v) { zetIn("locaties", l.id, { adres: v.trim() }); }} />
              <label className="formulier-label">Velden</label>
              {l.velden.map(function (v) {
                function zetVeld(w) { zetIn("locaties", l.id, { velden: l.velden.map(function (y) { return y.id === v.id ? Object.assign({}, y, w) : y; }) }); }
                var gekozen = v.spelvormen || [];
                return (
                  <div key={v.id} style={{marginBottom:8}}>
                  <div style={{display:"flex",gap:8,marginBottom:4}}>
                    <TVeld waarde={v.naam} disabled={!mag} style={{flex:1,marginBottom:0}} aria-label="Naam van het veld"
                      opKlaar={function (n) {
                        if (!n.trim()) return;
                        zetIn("locaties", l.id, { velden: l.velden.map(function (y) { return y.id === v.id ? Object.assign({}, y, { naam: n.trim() }) : y; }) });
                      }} />
                    {mag && l.velden.length > 1 && (
                      <button className="knop lijn klein" aria-label={"Veld " + v.naam + " weghalen"} onClick={function () {
                        weghalen("Veld weghalen?", geplandOp(function (w) { return w.veldId === v.id; }), function (x) {
                          x = losVanPlek(x, function (w) { return w.veldId === v.id; });
                          return Object.assign({}, x, { locaties: x.locaties.map(function (y) {
                            return y.id === l.id ? Object.assign({}, y, { velden: y.velden.filter(function (z) { return z.id !== v.id; }) }) : y;
                          }) });
                        });
                      }}><i className="fa-solid fa-xmark"/></button>
                    )}
                  </div>
                  {/* Alleen zinvol als er meer dan één spelvorm meedoet. Niets
                      gekozen = geschikt voor alles (veldGeschikt in src/domein/toernooi.js). */}
                  {spelvormen.length > 1 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                      <span style={{fontSize:11,color:"var(--grijs-donker)",marginRight:2}}>Geschikt voor:</span>
                      <button className="filter-chip" style={Object.assign({padding:"2px 9px",fontSize:11}, chipStijl(!gekozen.length))} disabled={!mag}
                        onClick={function () { zetVeld({ spelvormen: [] }); }}>alles</button>
                      {spelvormen.map(function (sv) {
                        var aan = gekozen.indexOf(sv) >= 0;
                        return <button key={sv} className="filter-chip" style={Object.assign({padding:"2px 9px",fontSize:11}, chipStijl(aan))} disabled={!mag}
                          onClick={function () { zetVeld({ spelvormen: aan ? gekozen.filter(function (x) { return x !== sv; }) : gekozen.concat([sv]) }); }}>{sv}</button>;
                      })}
                    </div>
                  )}
                  </div>
                );
              })}
              {mag && <button className="knop lijn klein" onClick={function () {
                var nr = t.locaties.reduce(function (n, y) { return n + y.velden.length; }, 0) + 1;
                zetIn("locaties", l.id, { velden: l.velden.concat([{ id: tId("v"), naam: "Veld " + nr }]) });
              }}>+ Veld</button>}
              {/* Reistijd naar de locaties die verderop in de lijst staan: zo
                  wordt elk paar maar één keer gevraagd (reistijdTussen kijkt
                  in beide richtingen). */}
              {t.locaties.slice(t.locaties.indexOf(l) + 1).map(function (ander) {
                var waarde = (l.reistijdNaar || {})[ander.id];
                if (waarde == null) waarde = (ander.reistijdNaar || {})[l.id];
                return (
                  <div key={ander.id} style={{display:"flex",gap:8,alignItems:"center",marginTop:8,fontSize:13}}>
                    <span style={{flex:1,minWidth:0}}><i className="fa-solid fa-bicycle"/>{" Reistijd naar " + ander.naam}</span>
                    <TVeld type="number" inputMode="numeric" min={0} waarde={waarde == null ? "" : waarde} disabled={!mag}
                      style={{width:70,marginBottom:0}} aria-label={"Reistijd naar " + ander.naam + " in minuten"} placeholder="0"
                      opKlaar={function (v) {
                        var n = Math.max(0, Math.floor(Number(v)) || 0);
                        /* Eén waarde per paar: een oude waarde aan de andere kant gaat weg. */
                        wijzig(function (x) { return Object.assign({}, x, { locaties: x.locaties.map(function (y) {
                          var r = Object.assign({}, y.reistijdNaar || {});
                          if (y.id === l.id) r[ander.id] = n; else if (y.id === ander.id) delete r[l.id]; else return y;
                          return Object.assign({}, y, { reistijdNaar: r });
                        }) }); });
                      }} />
                    <span>min</span>
                  </div>
                );
              })}
            </div>
          );
        })}
        {mag && <button className="knop lijn klein" onClick={function () {
          wijzig(function (x) {
            var nr = x.locaties.reduce(function (n, y) { return n + y.velden.length; }, 0) + 1;
            return Object.assign({}, x, { locaties: x.locaties.concat([{ id: tId("l"), naam: "Locatie " + (x.locaties.length + 1), adres: "", velden: [{ id: tId("v"), naam: "Veld " + nr }] }]) });
          });
        }}>+ Locatie toevoegen</button>}
      </div>

      <EvenementenKaart t={t} mag={mag} wijzig={wijzig} />

      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-layer-group"/> Categorieën</div>
        <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"0 0 10px",lineHeight:1.5}}>
          Teams spelen alleen tegen teams uit dezelfde categorie. Zo speelt een 11x11-team nooit tegen een 6x6-team.
        </p>
        {t.categorieen.map(function (c) {
          var dn = t.deelnemers.filter(function (d) { return d.categorieId === c.id; }).length;
          var ws = t.wedstrijden.filter(function (w) { return w.categorieId === c.id; });
          return <CategorieInstellingen key={c.id} c={c} mag={mag} aantalDeelnemers={dn}
            opZet={function (w) {
              wijzig(function (x) {
                var nt = Object.assign({}, x, { categorieen: x.categorieen.map(function (y) { return y.id === c.id ? Object.assign({}, y, w) : y; }) });
                /* 1x1 betekent: de deelnemers zijn spelers, geen teams. */
                if (w.spelvorm) nt.deelnemers = nt.deelnemers.map(function (d) {
                  return d.categorieId === c.id ? Object.assign({}, d, { soort: w.spelvorm === "1x1" ? "speler" : "team" }) : d;
                });
                return nt;
              });
            }}
            opWeg={t.categorieen.length > 1 ? function () {
              var uitslagen = ws.filter(function (w) { return w.uitslag; }).length;
              setVraag({ titel: "Categorie " + c.naam + " weghalen?",
                tekst: "Daarmee verdwijnen ook " + aantalTekst(dn, "deelnemer", "deelnemers") + " en " + aantalTekst(ws.length, "wedstrijd", "wedstrijden") +
                       (uitslagen ? " (waarvan " + uitslagen + " met uitslag)" : "") + ". Dit kun je niet terugdraaien.",
                knop: "Weghalen", doe: function (x) {
                  return Object.assign({}, x, {
                    categorieen: x.categorieen.filter(function (y) { return y.id !== c.id; }),
                    deelnemers: x.deelnemers.filter(function (y) { return y.categorieId !== c.id; }),
                    stadia: x.stadia.filter(function (y) { return y.categorieId !== c.id; }),
                    wedstrijden: x.wedstrijden.filter(function (y) { return y.categorieId !== c.id; })
                  });
                } });
            } : null} />;
        })}
        {mag && <button className="knop lijn klein" onClick={function () {
          wijzig(function (x) {
            var c = nieuweCategorie();
            c.naam = "Categorie " + (x.categorieen.length + 1);
            return Object.assign({}, x, { categorieen: x.categorieen.concat([c]) });
          });
        }}>+ Categorie toevoegen</button>}
      </div>

      {mag && (
        <button className="knop gevaar klein" style={{width:"100%",justifyContent:"center"}}
          onClick={function () { setVraag({ titel: "Toernooi verwijderen?", tekst: t.naam + " wordt verwijderd, met alle wedstrijden en uitslagen.", knop: "Verwijderen", weg: true }); }}>
          <i className="fa-solid fa-trash"/> Toernooi verwijderen
        </button>
      )}

      {vraag && <Bevestig titel={vraag.titel} tekst={vraag.tekst} knop={vraag.knop} gevaar
        onNee={function () { setVraag(null); }}
        onJa={function () { var v = vraag; setVraag(null); if (v.weg) onWeg(); else wijzig(v.doe); }} />}
    </div>
  );
}

/* Evenementen: een opening, lunchpauze of prijsuitreiking. Tijdens een
   evenement plant de planner geen wedstrijden — op één locatie of overal. */
function EvenementenKaart({ t, mag, wijzig }) {
  var evs = t.evenementen || [];
  function zetEv(id, w) { wijzig(function (x) { return Object.assign({}, x, { evenementen: (x.evenementen || []).map(function (e) { return e.id === id ? Object.assign({}, e, w) : e; }) }); }); }
  return (
    <div className="kaart">
      <div className="kaart-titel"><i className="fa-solid fa-bullhorn"/> Evenementen</div>
      <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"0 0 10px",lineHeight:1.5}}>Opening, pauze of prijsuitreiking. Automatisch plannen zet daar geen wedstrijden.</p>
      {evs.map(function (e) {
        return (
          <div key={e.id} style={{borderBottom:"1px solid var(--grijs)",paddingBottom:8,marginBottom:8}}>
            <div style={{display:"flex",gap:8}}>
              <TVeld waarde={e.naam} disabled={!mag} style={{flex:1,marginBottom:6}} aria-label="Naam van het evenement" opKlaar={function (v) { if (v.trim()) zetEv(e.id, { naam: v.trim() }); }} />
              {mag && <button className="knop lijn klein" aria-label="Evenement weghalen" style={{marginBottom:6}} onClick={function () {
                wijzig(function (x) { return Object.assign({}, x, { evenementen: (x.evenementen || []).filter(function (y) { return y.id !== e.id; }) }); });
              }}><i className="fa-solid fa-xmark"/></button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8}}>
              {t.dagen.length > 1 && (
                <select className="formulier-input" aria-label="Dag" style={{marginBottom:0}} value={e.dagId} disabled={!mag} onChange={function (ev) { zetEv(e.id, { dagId: ev.target.value }); }}>
                  {t.dagen.map(function (d, k) { return <option key={d.id} value={d.id}>{d.datum ? formateerDatumKort(d.datum) : "Dag " + (k + 1)}</option>; })}
                </select>
              )}
              <input className="formulier-input" type="time" aria-label="Begint" style={{marginBottom:0}} value={e.start} disabled={!mag}
                onChange={function (ev) { if (ev.target.value) zetEv(e.id, { start: ev.target.value }); }} />
              <select className="formulier-input" aria-label="Duur" style={{marginBottom:0}} value={e.duur} disabled={!mag} onChange={function (ev) { zetEv(e.id, { duur: Number(ev.target.value) }); }}>
                {[10, 15, 20, 30, 45, 60, 90, 120].map(function (m) { return <option key={m} value={m}>{m + " min"}</option>; })}
              </select>
              {t.locaties.length > 1 && (
                <select className="formulier-input" aria-label="Locatie" style={{marginBottom:0}} value={e.locatieId || ""} disabled={!mag} onChange={function (ev) { zetEv(e.id, { locatieId: ev.target.value || null }); }}>
                  <option value="">Alle locaties</option>
                  {t.locaties.map(function (l) { return <option key={l.id} value={l.id}>{l.naam}</option>; })}
                </select>
              )}
            </div>
          </div>
        );
      })}
      {mag && <button className="knop lijn klein" onClick={function () {
        wijzig(function (x) { return Object.assign({}, x, { evenementen: (x.evenementen || []).concat([{ id: tId("e"), naam: "Prijsuitreiking", dagId: x.dagen[0].id, start: "16:30", duur: 30, locatieId: null }]) }); });
      }}>+ Evenement</button>}
    </div>
  );
}

function CategorieInstellingen({ c, mag, aantalDeelnemers, opZet, opWeg }) {
  const [open, setOpen] = useState(false);
  function getal(veld, label, min) {
    return (
      <div><label className="formulier-label">{label}</label>
        <TVeld type="number" inputMode="numeric" min={min} waarde={c[veld]} disabled={!mag} style={{marginBottom:0}}
          opKlaar={function (v) { var n = Math.floor(Number(v)); if (isFinite(n) && n >= min) { var o = {}; o[veld] = n; opZet(o); } }} /></div>
    );
  }
  function punten(veld, label) {
    return (
      <div><label className="formulier-label">{label}</label>
        <TVeld type="number" inputMode="numeric" waarde={c.regels[veld]} disabled={!mag} style={{marginBottom:0}}
          opKlaar={function (v) { var n = Math.floor(Number(v)); if (isFinite(n)) { var r = Object.assign({}, c.regels); r[veld] = n; opZet({ regels: r }); } }} /></div>
    );
  }
  return (
    <div style={{border:"1px solid var(--grijs)",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
      <button onClick={function () { setOpen(!open); }} aria-expanded={open}
        style={{display:"flex",width:"100%",alignItems:"center",gap:8,background:"none",border:0,padding:0,cursor:"pointer",color:"inherit",textAlign:"left"}}>
        <span style={{flex:1,minWidth:0}}>
          <span style={{display:"block",fontWeight:700,fontSize:14}}>{c.naam}</span>
          <span style={{display:"block",fontSize:12,color:"var(--grijs-donker)"}}>
            {[c.spelvorm, c.geslacht, c.leeftijd, c.wedstrijdduur + " min", aantalTekst(aantalDeelnemers, deelnemerWoord(c, false), deelnemerWoord(c, true))].filter(Boolean).join(" · ")}
          </span>
        </span>
        <i className={"fa-solid fa-chevron-" + (open ? "up" : "down")}/>
      </button>
      {open && (
        <div style={{marginTop:10}}>
          <label className="formulier-label">Naam</label>
          <TVeld waarde={c.naam} disabled={!mag} opKlaar={function (v) { if (v.trim()) opZet({ naam: v.trim() }); }} />
          <div className="formulier-rij">
            <div><label className="formulier-label">Spelvorm</label>
              <select className="formulier-input" value={c.spelvorm} disabled={!mag} onChange={function (e) { opZet({ spelvorm: e.target.value }); }}>
                {SPELVORMEN.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
              </select></div>
            <div><label className="formulier-label">Geslacht</label>
              <select className="formulier-input" value={c.geslacht} disabled={!mag} onChange={function (e) { opZet({ geslacht: e.target.value }); }}>
                {GESLACHTEN.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
              </select></div>
          </div>
          <div className="formulier-rij">
            <div><label className="formulier-label">Leeftijd</label>
              <TVeld waarde={c.leeftijd} placeholder="Bijv. JO11" disabled={!mag} opKlaar={function (v) { opZet({ leeftijd: v.trim() }); }} /></div>
            <div><label className="formulier-label">Niveau</label>
              <TVeld waarde={c.niveau} placeholder="Optioneel" disabled={!mag} opKlaar={function (v) { opZet({ niveau: v.trim() }); }} /></div>
          </div>
          <div className="formulier-rij" style={{marginBottom:10}}>
            {getal("wedstrijdduur", "Wedstrijd (min)", 1)}
            {getal("wisseltijd", "Wisseltijd (min)", 0)}
          </div>
          <div className="formulier-rij" style={{marginBottom:10}}>
            {getal("minRust", "Minimale rust (min)", 0)}
            <div><label className="formulier-label">Gelijk in knock-out</label>
              <select className="formulier-input" style={{marginBottom:0}} value={c.knockoutGelijk === "loting" ? "strafschoppen" : c.knockoutGelijk} disabled={!mag}
                onChange={function (e) { opZet({ knockoutGelijk: e.target.value }); }}>
                {Object.keys(KNOCKOUT_GELIJK_LABEL).map(function (k) { return <option key={k} value={k}>{KNOCKOUT_GELIJK_LABEL[k]}</option>; })}
              </select></div>
          </div>
          <label className="formulier-label">Punten in de poule</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginBottom:10}}>
            {punten("winst", "Winst")}{punten("gelijk", "Gelijk")}{punten("verlies", "Verlies")}
          </div>
          <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"0 0 10px",lineHeight:1.5}}>
            Bij gelijke punten: doelsaldo, doelpunten voor, onderling resultaat.
          </p>
          {mag && opWeg && <button className="knop lijn klein" style={{color:"var(--gevaar)"}} onClick={opWeg}><i className="fa-solid fa-trash"/> Categorie weghalen</button>}
        </div>
      )}
    </div>
  );
}

/* ═══ Stap 2: Deelnemers (teams en scheidsrechters) ═══ */
function StapDeelnemers({ t, mag, wijzig }) {
  const [catId, setCatId] = useCategorie(t);
  const [naam, setNaam] = useState("");
  const [scheidsNaam, setScheidsNaam] = useState("");
  const [open, setOpen] = useState(null);
  var cat = t.categorieen.filter(function (c) { return c.id === catId; })[0];
  if (!cat) return null;
  var lijst = t.deelnemers.filter(function (d) { return d.categorieId === cat.id; });
  var ingedeeld = {};
  t.stadia.forEach(function (s) { (s.poules || []).forEach(function (p) { p.deelnemers.forEach(function (id) { ingedeeld[id] = true; }); }); });
  t.wedstrijden.forEach(function (w) { [w.thuis.deelnemerId, w.uit.deelnemerId, w.thuisVast, w.uitVast].forEach(function (id) { if (id) ingedeeld[id] = true; }); });
  var heeftIndeling = t.stadia.some(function (s) { return s.categorieId === cat.id; });

  function voegToe() {
    if (!naam.trim()) return;
    var r = null;
    var gelukt = wijzig(function (x) { r = voegDeelnemerToe(x, { categorieId: cat.id, naam: naam }); return r.toernooi; });
    if (!gelukt) return;
    if (r && !r.nieuw) meldFout(naam.trim() + " staat al in deze categorie.");
    setNaam("");
  }
  function voegScheidsToe() {
    var n = scheidsNaam.trim();
    if (!n) return;
    wijzig(function (x) { return Object.assign({}, x, { scheidsrechters: x.scheidsrechters.concat([{ id: tId("sr"), naam: n, email: "", telefoon: "", beschikbaar: [] }]) }); });
    setScheidsNaam("");
  }
  function zetDeelnemer(id, w) {
    wijzig(function (x) { return Object.assign({}, x, { deelnemers: x.deelnemers.map(function (d) { return d.id === id ? Object.assign({}, d, w) : d; }) }); });
  }
  function hernoem(d, v) {
    var n = normaliseerTeamNaam(v);
    if (!n) return;
    if (t.deelnemers.some(function (y) { return y.id !== d.id && y.categorieId === d.categorieId && normaliseerTeamNaam(y.naam) === n; })) {
      meldFout(v.trim() + " staat al in deze categorie."); return;
    }
    zetDeelnemer(d.id, { naam: v.trim() });
  }

  return (
    <div>
      <CategorieKiezer t={t} catId={cat.id} opKies={setCatId} />
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-users"/> {(cat.spelvorm === "1x1" ? "Spelers" : "Teams") + (t.categorieen.length > 1 ? " · " + cat.naam : "")}</div>
        {mag && (
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input className="formulier-input" style={{flex:1,marginBottom:0}} value={naam}
              placeholder={cat.spelvorm === "1x1" ? "Naam van de speler" : "Naam van het team"}
              onChange={function (e) { setNaam(e.target.value); }}
              onKeyDown={function (e) { if (e.key === "Enter") voegToe(); }} />
            <button className="knop klein" style={{minHeight:44}} disabled={!naam.trim()} onClick={voegToe}>Toevoegen</button>
          </div>
        )}
        {heeftIndeling && lijst.some(function (d) { return !ingedeeld[d.id]; }) && (
          <div className="melding"><i className="fa-solid fa-circle-info"/> Niet iedereen staat in de indeling. Maak de indeling opnieuw bij stap 3 om ze mee te laten doen.</div>
        )}
        {lijst.length === 0 ? (
          <p style={{fontSize:13,color:"var(--grijs-donker)"}}>{"Nog geen " + deelnemerWoord(cat, true) + " in deze categorie."}</p>
        ) : lijst.map(function (d) {
          var isOpen = open === d.id;
          return (
            <div key={d.id} style={{borderBottom:"1px solid var(--grijs)",padding:"8px 0"}}>
              <button onClick={function () { setOpen(isOpen ? null : d.id); }} aria-expanded={isOpen}
                style={{display:"flex",width:"100%",alignItems:"center",gap:8,background:"none",border:0,padding:0,cursor:"pointer",color:"inherit",textAlign:"left",minHeight:36}}>
                <span style={{flex:1,minWidth:0,fontSize:14,fontWeight:d.eigen ? 700 : 500}}>{d.naam}</span>
                {d.sterkte ? <span className="filter-chip" style={Object.assign(chipStijl(false), {cursor:"inherit"})} title="Plaatsing">{"#" + d.sterkte}</span> : null}
                {!ingedeeld[d.id] && heeftIndeling && <span style={{fontSize:11,color:"var(--oranje)",fontWeight:700}}>niet ingedeeld</span>}
                <i className={"fa-solid fa-chevron-" + (isOpen ? "up" : "down")} style={{color:"var(--grijs-donker)"}}/>
              </button>
              {isOpen && (
                <div style={{marginTop:8}}>
                  <label className="formulier-label">Naam</label>
                  <TVeld waarde={d.naam} disabled={!mag} opKlaar={function (v) { hernoem(d, v); }} />
                  <label className="formulier-label">Plaatsing (1 = sterkst, leeg = niet geplaatst)</label>
                  <TVeld type="number" inputMode="numeric" min={1} waarde={d.sterkte || ""} disabled={!mag}
                    opKlaar={function (v) { var n = Math.floor(Number(v)); zetDeelnemer(d.id, { sterkte: v.trim() && n >= 1 ? n : null }); }} />
                  {cat.spelvorm !== "1x1" && <>
                    <label className="formulier-label">Contactpersoon</label>
                    <TVeld waarde={d.coach} disabled={!mag} opKlaar={function (v) { zetDeelnemer(d.id, { coach: v.trim() }); }} />
                  </>}
                  <div className="formulier-rij">
                    <div><label className="formulier-label">E-mail</label>
                      <TVeld type="email" waarde={d.email} disabled={!mag} opKlaar={function (v) { zetDeelnemer(d.id, { email: v.trim() }); }} /></div>
                    <div><label className="formulier-label">Telefoon</label>
                      <TVeld type="tel" waarde={d.telefoon} disabled={!mag} opKlaar={function (v) { zetDeelnemer(d.id, { telefoon: v.trim() }); }} /></div>
                  </div>
                  <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"0 0 8px"}}><i className="fa-solid fa-lock"/> Contactgegevens zie je alleen hier. Ze komen nooit in een download.</p>
                  <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,marginBottom:8}}>
                    <input type="checkbox" checked={!!d.eigen} disabled={!mag} onChange={function (e) { zetDeelnemer(d.id, { eigen: e.target.checked }); }} />
                    Eigen team (vet in de lijsten)
                  </label>
                  {mag && (
                    <button className="knop lijn klein" style={{color:"var(--gevaar)"}} onClick={function () {
                      if (ingedeeld[d.id]) { meldFout(d.naam + " staat al in de indeling. Maak eerst de indeling opnieuw zonder dit team."); return; }
                      wijzig(function (x) { return Object.assign({}, x, { deelnemers: x.deelnemers.filter(function (y) { return y.id !== d.id; }) }); });
                      setOpen(null);
                    }}><i className="fa-solid fa-trash"/> Weghalen</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-flag"/> Scheidsrechters</div>
        {mag && (
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input className="formulier-input" style={{flex:1,marginBottom:0}} value={scheidsNaam} placeholder="Naam"
              onChange={function (e) { setScheidsNaam(e.target.value); }}
              onKeyDown={function (e) { if (e.key === "Enter") voegScheidsToe(); }} />
            <button className="knop klein" style={{minHeight:44}} disabled={!scheidsNaam.trim()} onClick={voegScheidsToe}>Toevoegen</button>
          </div>
        )}
        {t.scheidsrechters.length === 0 ? (
          <p style={{fontSize:13,color:"var(--grijs-donker)"}}>Nog geen scheidsrechters. Je wijst ze per wedstrijd toe bij Schema.</p>
        ) : t.scheidsrechters.map(function (s) {
          var isOpen = open === s.id;
          var aantal = t.wedstrijden.filter(function (w) { return w.scheidsId === s.id; }).length;
          return (
            <div key={s.id} style={{borderBottom:"1px solid var(--grijs)",padding:"8px 0"}}>
              <button onClick={function () { setOpen(isOpen ? null : s.id); }} aria-expanded={isOpen}
                style={{display:"flex",width:"100%",alignItems:"center",gap:8,background:"none",border:0,padding:0,cursor:"pointer",color:"inherit",textAlign:"left",minHeight:36}}>
                <span style={{flex:1,minWidth:0,fontSize:14}}>{s.naam}</span>
                <span style={{fontSize:12,color:"var(--grijs-donker)"}}>{aantalTekst(aantal, "wedstrijd", "wedstrijden")}</span>
                <i className={"fa-solid fa-chevron-" + (isOpen ? "up" : "down")} style={{color:"var(--grijs-donker)"}}/>
              </button>
              {isOpen && (
                <div style={{marginTop:8}}>
                  <label className="formulier-label">Naam</label>
                  <TVeld waarde={s.naam} disabled={!mag} opKlaar={function (v) {
                    if (!v.trim()) return;
                    wijzig(function (x) { return Object.assign({}, x, { scheidsrechters: x.scheidsrechters.map(function (y) { return y.id === s.id ? Object.assign({}, y, { naam: v.trim() }) : y; }) }); });
                  }} />
                  <div className="formulier-rij">
                    <div><label className="formulier-label">E-mail</label>
                      <TVeld type="email" waarde={s.email} disabled={!mag} opKlaar={function (v) {
                        wijzig(function (x) { return Object.assign({}, x, { scheidsrechters: x.scheidsrechters.map(function (y) { return y.id === s.id ? Object.assign({}, y, { email: v.trim() }) : y; }) }); });
                      }} /></div>
                    <div><label className="formulier-label">Telefoon</label>
                      <TVeld type="tel" waarde={s.telefoon} disabled={!mag} opKlaar={function (v) {
                        wijzig(function (x) { return Object.assign({}, x, { scheidsrechters: x.scheidsrechters.map(function (y) { return y.id === s.id ? Object.assign({}, y, { telefoon: v.trim() }) : y; }) }); });
                      }} /></div>
                  </div>
                  <ScheidsBeschikbaar t={t} s={s} mag={mag} wijzig={wijzig} />
                  {mag && (
                    <button className="knop lijn klein" style={{color:"var(--gevaar)"}} onClick={function () {
                      wijzig(function (x) {
                        return Object.assign({}, x, {
                          scheidsrechters: x.scheidsrechters.filter(function (y) { return y.id !== s.id; }),
                          wedstrijden: x.wedstrijden.map(function (w) { return w.scheidsId === s.id ? Object.assign({}, w, { scheidsId: null }) : w; })
                        });
                      });
                      setOpen(null);
                    }}><i className="fa-solid fa-trash"/>{" Weghalen" + (aantal ? " (en losmaken van " + aantalTekst(aantal, "wedstrijd", "wedstrijden") + ")" : "")}</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Beschikbaarheid en voorkeur van één scheidsrechter. Leeg = het hele
   toernooi beschikbaar, voor elke categorie. */
function ScheidsBeschikbaar({ t, s, mag, wijzig }) {
  function zet(w) {
    wijzig(function (x) { return Object.assign({}, x, { scheidsrechters: x.scheidsrechters.map(function (y) { return y.id === s.id ? Object.assign({}, y, w) : y; }) }); });
  }
  var besch = s.beschikbaar || [];
  var voorkeur = s.voorkeurCategorieen || [], niet = s.nietCategorieen || [];
  return (
    <div style={{marginBottom:10}}>
      <label className="formulier-label">Beschikbaar</label>
      <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,marginBottom:6}}>
        <input type="checkbox" checked={!besch.length} disabled={!mag} onChange={function (e) {
          zet({ beschikbaar: e.target.checked ? [] : t.dagen.map(function (d) { return { dagId: d.id, van: d.start, tot: d.eind }; }) });
        }} /> Het hele toernooi
      </label>
      {besch.length > 0 && t.dagen.map(function (d, k) {
        var b = besch.filter(function (x) { return x.dagId === d.id; })[0];
        function zetDag(nieuw) {
          var rest = besch.filter(function (x) { return x.dagId !== d.id; });
          zet({ beschikbaar: nieuw ? rest.concat([nieuw]) : rest });
        }
        return (
          <div key={d.id} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
            <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,minWidth:90}}>
              <input type="checkbox" checked={!!b} disabled={!mag} onChange={function (e) { zetDag(e.target.checked ? { dagId: d.id, van: d.start, tot: d.eind } : null); }} />
              {d.datum ? formateerDatumKort(d.datum) : "Dag " + (k + 1)}
            </label>
            {b && <>
              <input className="formulier-input" type="time" aria-label="Vanaf" value={b.van} disabled={!mag} style={{width:"auto",marginBottom:0,padding:"4px 6px"}}
                onChange={function (e) { if (e.target.value) zetDag(Object.assign({}, b, { van: e.target.value })); }} />
              <span>–</span>
              <input className="formulier-input" type="time" aria-label="Tot" value={b.tot} disabled={!mag} style={{width:"auto",marginBottom:0,padding:"4px 6px"}}
                onChange={function (e) { if (e.target.value) zetDag(Object.assign({}, b, { tot: e.target.value })); }} />
            </>}
          </div>
        );
      })}
      {t.categorieen.length > 1 && <>
        <label className="formulier-label" style={{marginTop:6}}>Categorieën (tik: voorkeur → niet → maakt niet uit)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {t.categorieen.map(function (c) {
            var stand = voorkeur.indexOf(c.id) >= 0 ? "voorkeur" : niet.indexOf(c.id) >= 0 ? "niet" : "";
            var stijl = stand === "voorkeur" ? chipStijl(true) : stand === "niet" ? { borderColor: "var(--gevaar)", background: "var(--wit)", color: "var(--gevaar)", textDecoration: "line-through" } : chipStijl(false);
            return <button key={c.id} className="filter-chip" style={stijl} disabled={!mag} onClick={function () {
              var v = voorkeur.filter(function (x) { return x !== c.id; }), n = niet.filter(function (x) { return x !== c.id; });
              if (stand === "") v = v.concat([c.id]); else if (stand === "voorkeur") n = n.concat([c.id]);
              zet({ voorkeurCategorieen: v, nietCategorieen: n });
            }}>{(stand === "voorkeur" ? "★ " : "") + c.naam}</button>;
          })}
        </div>
      </>}
    </div>
  );
}

/* ═══ Stap 3: Indeling ═══ */
function StapIndeling({ t, mag, wijzig }) {
  const [catId, setCatId] = useCategorie(t);
  const [bewerk, setBewerk] = useState(false);
  var cat = t.categorieen.filter(function (c) { return c.id === catId; })[0];
  if (!cat) return null;
  var stadia = t.stadia.filter(function (s) { return s.categorieId === cat.id; });
  var deelnemers = t.deelnemers.filter(function (d) { return d.categorieId === cat.id; });
  return (
    <div>
      <CategorieKiezer t={t} catId={cat.id} opKies={function (id) { setCatId(id); setBewerk(false); }} />
      {deelnemers.length < 2 ? (
        <div className="kaart"><p style={{fontSize:13,color:"var(--grijs-donker)",margin:0}}>
          {"Voeg eerst minstens twee " + deelnemerWoord(cat, true) + " toe bij stap 2."}</p></div>
      ) : (stadia.length && !bewerk) ? (
        <IndelingOverzicht t={t} cat={cat} stadia={stadia} mag={mag} onOpnieuw={function () { setBewerk(true); }} />
      ) : (
        <IndelingMaken key={cat.id} t={t} cat={cat} deelnemers={deelnemers} mag={mag} wijzig={wijzig}
          bestaand={stadia.length > 0} onKlaar={function () { setBewerk(false); }} />
      )}
    </div>
  );
}

function IndelingOverzicht({ t, cat, stadia, mag, onOpnieuw }) {
  return (
    <div>
      {stadia.map(function (s) {
        if (s.soort === "poule") {
          return (
            <div key={s.id} className="kaart">
              <div className="kaart-titel"><i className="fa-solid fa-diagram-project"/> {s.naam}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
                {s.poules.map(function (p) {
                  return (
                    <div key={p.id} style={{border:"1px solid var(--grijs)",borderRadius:10,padding:"8px 10px"}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{p.naam}</div>
                      {p.deelnemers.map(function (id) { return <div key={id} style={{fontSize:13,lineHeight:1.6}}>{tNaam(t, id)}</div>; })}
                    </div>
                  );
                })}
              </div>
              {(s.doorgaan.perPoule > 0 || s.doorgaan.besteNummers) && (
                <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"10px 0 0"}}>
                  {"Door naar de knock-out: " + (s.doorgaan.perPoule > 0 ? "de nummers 1" + (s.doorgaan.perPoule > 1 ? " t/m " + s.doorgaan.perPoule : "") + " van elke poule" : "") +
                   (s.doorgaan.besteNummers ? (s.doorgaan.perPoule > 0 ? ", plus " : "") + "de " + s.doorgaan.besteNummers.aantal + " beste nummers " + s.doorgaan.besteNummers.plek : "") + "."}
                </p>
              )}
            </div>
          );
        }
        var ws = t.wedstrijden.filter(function (w) { return w.stadiumId === s.id; });
        var vrij = vrijgesteld(t, cat.id);
        return (
          <div key={s.id} className="kaart">
            <div className="kaart-titel"><i className="fa-solid fa-sitemap"/> {s.naam}</div>
            <p style={{fontSize:13,margin:"0 0 6px"}}>
              {aantalTekst(ws.length, "wedstrijd", "wedstrijden") + (s.bracket.troostfinale ? ", met troostfinale" : "") + "."}
            </p>
            {vrij.length > 0 && <p style={{fontSize:12,color:"var(--grijs-donker)",margin:0}}>{"Vrij in de eerste ronde: " + vrij.map(function (id) { return tNaam(t, id); }).join(", ")}</p>}
          </div>
        );
      })}
      {mag && <button className="knop lijn" style={{width:"100%",justifyContent:"center"}} onClick={onOpnieuw}>
        <i className="fa-solid fa-rotate"/> Indeling opnieuw maken</button>}
    </div>
  );
}

function standaardPoules(n) { return n <= 6 ? 1 : Math.max(2, Math.round(n / 4)); }

function IndelingMaken({ t, cat, deelnemers, mag, wijzig, bestaand, onKlaar }) {
  var n = deelnemers.length;
  const [vorm, setVorm] = useState(n <= 6 ? "poules" : "poules-ko");
  const [aantal, setAantal] = useState(standaardPoules(n));
  const [perPoule, setPerPoule] = useState(2);
  const [beste, setBeste] = useState(false);
  const [besteAantal, setBesteAantal] = useState(2);
  const [troost, setTroost] = useState(false);
  const [zaad, setZaad] = useState(1);
  const [poules, setPoules] = useState(null);
  const [vraag, setVraag] = useState(null);

  var ids = deelnemers.map(function (d) { return d.id; });
  var sterkte = {};
  deelnemers.forEach(function (d) { if (d.sterkte) sterkte[d.id] = d.sterkte; });
  var maxPoules = Math.max(1, Math.floor(n / 2));
  var echtAantal = Math.min(Math.max(1, aantal), maxPoules);
  /* De voorgestelde verdeling, tenzij je zelf iemand hebt verplaatst. */
  var eigen = poules && poules.length === echtAantal && [].concat.apply([], poules).sort().join() === ids.slice().sort().join();
  var indeling = eigen ? poules : verdeelPoules(ids, echtAantal, sterkte, zaad);
  var kleinste = indeling.reduce(function (m, p) { return Math.min(m, p.length); }, 99);
  var doorTotaal = vorm === "poules-ko" ? Math.min(perPoule, kleinste) * indeling.length + (beste ? besteAantal : 0) : n;

  function verplaats(id, naar) {
    var nieuw = indeling.map(function (p) { return p.filter(function (x) { return x !== id; }); });
    nieuw[naar].push(id);
    setPoules(nieuw);
  }

  function legVast() {
    if (indeling.some(function (p) { return p.length < 2; })) { meldFout("Elke poule heeft minstens twee " + deelnemerWoord(cat, true) + " nodig."); return; }
    if (vorm === "poules-ko" && doorTotaal < 2) { meldFout("Er moeten minstens twee " + deelnemerWoord(cat, true) + " door naar de knock-out."); return; }
    var gelukt = wijzig(function (x) {
      if (vorm === "ko") {
        var volgorde = deelnemers.slice().sort(function (a, b) { return (a.sterkte || 999) - (b.sterkte || 999); })
          .map(function (d) { return { deelnemerId: d.id }; });
        return maakKnockout(zonderStadia(x, cat.id, null), cat.id, volgorde, { troostfinale: troost });
      }
      var pp = vorm === "poules-ko" ? Math.min(perPoule, kleinste) : 0;
      var nt = maakGroepsfase(x, cat.id, { poules: indeling, perPoule: pp,
        besteNummers: vorm === "poules-ko" && beste ? { plek: pp + 1, aantal: besteAantal } : null });
      if (vorm !== "poules-ko") return nt;
      var gf = nt.stadia.filter(function (s) { return s.categorieId === cat.id && s.soort === "poule"; })[0];
      return maakKnockoutNaGroepsfase(nt, cat.id, gf.id, { troostfinale: troost });
    });
    if (gelukt) { meldGoed("Indeling vastgelegd"); onKlaar(); }
  }
  function vraagEerst() {
    var ws = t.wedstrijden.filter(function (w) { return w.categorieId === cat.id; });
    if (!ws.length) { legVast(); return; }
    var metUitslag = ws.filter(function (w) { return w.uitslag; }).length;
    var gepland = ws.filter(function (w) { return w.dagId; }).length;
    setVraag("De " + aantalTekst(ws.length, "wedstrijd", "wedstrijden") + " van " + cat.naam + " vervallen" +
      (metUitslag ? ", waarvan " + metUitslag + " met uitslag" : "") + (gepland ? " en " + gepland + " al ingepland" : "") +
      ". Daarvoor in de plaats komt het nieuwe schema.");
  }

  var vormKnop = function (id, label, uitleg) {
    return (
      <button key={id} className="filter-chip" style={Object.assign(chipStijl(vorm === id), {textAlign:"left",padding:"8px 12px"})}
        disabled={!mag} onClick={function () { setVorm(id); }} title={uitleg}>{label}</button>
    );
  };
  var grootte = 2; while (grootte < (vorm === "ko" ? n : doorTotaal)) grootte *= 2;
  var vrijstellingen = grootte - (vorm === "ko" ? n : doorTotaal);

  return (
    <div>
      <div className="kaart">
        <div className="kaart-titel"><i className="fa-solid fa-diagram-project"/> {"Indeling" + (t.categorieen.length > 1 ? " · " + cat.naam : "")}</div>
        <label className="formulier-label">Speelwijze</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
          {vormKnop("poules", "Alleen poules", "Iedereen in de poule speelt één keer tegen elkaar")}
          {vormKnop("poules-ko", "Poules + knock-out", "Eerst poules, daarna kwartfinale/halve finale/finale")}
          {vormKnop("ko", "Alleen knock-out", "Wie verliest, ligt eruit")}
        </div>

        {vorm !== "ko" && (
          <div className="formulier-rij" style={{marginBottom:10}}>
            <div><label className="formulier-label">Aantal poules</label>
              <select className="formulier-input" style={{marginBottom:0}} value={echtAantal} disabled={!mag}
                onChange={function (e) { setAantal(Number(e.target.value)); setPoules(null); }}>
                {Array.from({ length: maxPoules }, function (_, k) { return k + 1; }).map(function (k) {
                  return <option key={k} value={k}>{k + " à " + Math.floor(n / k) + (n % k ? "–" + Math.ceil(n / k) : "")}</option>;
                })}
              </select></div>
            {vorm === "poules-ko" && (
              <div><label className="formulier-label">Door per poule</label>
                <select className="formulier-input" style={{marginBottom:0}} value={perPoule} disabled={!mag}
                  onChange={function (e) { setPerPoule(Number(e.target.value)); }}>
                  {[1, 2, 3, 4].map(function (k) { return <option key={k} value={k}>{k === 1 ? "Alleen nr. 1" : "Nr. 1 t/m " + k}</option>; })}
                </select></div>
            )}
          </div>
        )}
        {vorm === "poules-ko" && indeling.length > 1 && (
          <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,marginBottom:10,flexWrap:"wrap"}}>
            <input type="checkbox" checked={beste} disabled={!mag} onChange={function (e) { setBeste(e.target.checked); }} />
            {"Plus de beste nummers " + (Math.min(perPoule, kleinste) + 1) + ":"}
            <select className="formulier-input" style={{width:"auto",marginBottom:0,padding:"4px 8px"}} value={besteAantal} disabled={!mag || !beste}
              onChange={function (e) { setBesteAantal(Number(e.target.value)); }}>
              {Array.from({ length: Math.max(1, indeling.length - 1) }, function (_, k) { return k + 1; }).map(function (k) { return <option key={k} value={k}>{k}</option>; })}
            </select>
          </label>
        )}
        {vorm !== "poules" && (
          <>
            <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,marginBottom:10}}>
              <input type="checkbox" checked={troost} disabled={!mag} onChange={function (e) { setTroost(e.target.checked); }} />
              Troostfinale (om de 3e plek)
            </label>
            <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"0 0 10px",lineHeight:1.5}}>
              {(vorm === "ko" ? n : doorTotaal) + " in de knock-out" + (vrijstellingen > 0 ? ": " + aantalTekst(vrijstellingen, "vrijstelling", "vrijstellingen") + " in de eerste ronde voor de hoogst geplaatsten" : "") + "." +
               (beste && indeling.some(function (p) { return p.length !== indeling[0].length; }) ? " Ongelijke poules: de beste nummers worden vergeleken op gemiddelde per wedstrijd." : "")}
            </p>
          </>
        )}
      </div>

      {vorm !== "ko" ? (
        <div className="kaart">
          <div className="kaart-titel" style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{flex:1}}><i className="fa-solid fa-shuffle"/> Verdeling</span>
            {mag && <button className="knop lijn klein" onClick={function () { setZaad(zaad + 1); setPoules(null); }}>Opnieuw verdelen</button>}
          </div>
          <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"0 0 10px",lineHeight:1.5}}>
            {"Geplaatste " + deelnemerWoord(cat, true) + " (stap 2) worden eerst over de poules verdeeld, de rest door elkaar. Verdeling nr. " + zaad +
             " — dezelfde nummer geeft altijd dezelfde verdeling. Kies per " + deelnemerWoord(cat, false) + " een andere poule om zelf te schuiven."}
          </p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
            {indeling.map(function (p, k) {
              return (
                <div key={k} style={{border:"1px solid var(--grijs)",borderRadius:10,padding:"8px 10px"}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>{pouleNaam(k) + " · " + p.length}</div>
                  {p.map(function (id) {
                    var d = deelnemers.filter(function (x) { return x.id === id; })[0];
                    return (
                      <div key={id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                        <span style={{flex:1,minWidth:0,fontSize:13,overflowWrap:"anywhere"}}>{d.naam}{d.sterkte ? " (#" + d.sterkte + ")" : ""}</span>
                        {indeling.length > 1 && mag && (
                          <select aria-label={"Poule voor " + d.naam} value={k} className="formulier-input"
                            style={{width:"auto",marginBottom:0,padding:"2px 4px",fontSize:12,minHeight:32}}
                            onChange={function (e) { verplaats(id, Number(e.target.value)); }}>
                            {indeling.map(function (_, j) { return <option key={j} value={j}>{String.fromCharCode(65 + j)}</option>; })}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="kaart">
          <div className="kaart-titel"><i className="fa-solid fa-sitemap"/> Plaatsing</div>
          <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"0 0 8px",lineHeight:1.5}}>
            {"Op plaatsing (stap 2): nummer 1 en 2 komen elkaar pas in de finale tegen. Zonder plaatsing in de volgorde van toevoegen."}
          </p>
          {deelnemers.slice().sort(function (a, b) { return (a.sterkte || 999) - (b.sterkte || 999); }).map(function (d, k) {
            return <div key={d.id} style={{fontSize:13,lineHeight:1.7}}>{(k + 1) + ". " + d.naam}</div>;
          })}
        </div>
      )}

      {mag && (
        <div style={{display:"flex",gap:8}}>
          {bestaand && <button className="knop lijn" style={{flex:1,justifyContent:"center"}} onClick={onKlaar}>Annuleren</button>}
          <button className="knop" style={{flex:2,justifyContent:"center"}} onClick={vraagEerst}>
            <i className="fa-solid fa-check"/> Indeling vastleggen</button>
        </div>
      )}
      {vraag && <Bevestig titel="Indeling vervangen?" tekst={vraag} knop="Vervangen" gevaar
        onNee={function () { setVraag(null); }} onJa={function () { setVraag(null); legVast(); }} />}
    </div>
  );
}

/* ═══ Stap 4: Schema ═══
   Automatisch plannen (planAutomatisch, release 3) of per wedstrijd met
   de hand: dag, veld, tijd en scheidsrechter, of "Verplaatsen" naar een
   vrij tijdvak. Geen slepen — dat werkt niet op een telefoon langs de
   lijn. Conflicten worden getoond, niet tegengehouden: de organisator
   beslist. */
function StapSchema({ t, mag, wijzig }) {
  const [weergave, setWeergave] = useState("lijst");
  const [filter, setFilter] = useState("alles");
  const [catFilter, setCatFilter] = useState("");
  const [open, setOpen] = useState(null);
  const [planner, setPlanner] = useState(false);
  var lijst = conflicten(t);
  var perWedstrijd = {};
  lijst.forEach(function (c) { c.wedstrijden.forEach(function (id) { (perWedstrijd[id] = perWedstrijd[id] || []).push(c.tekst); }); });
  var regels = schemaRegels(t);
  var opNummer = {};
  t.wedstrijden.forEach(function (w) { opNummer[w.nummer] = w; });
  var gepland = t.wedstrijden.filter(function (w) { return w.dagId && w.veldId && w.start; }).length;
  var zichtbaar = regels.filter(function (r) {
    var w = opNummer[r.nummer];
    if (catFilter && w.categorieId !== catFilter) return false;
    if (filter === "ongepland") return !w.start;
    if (filter === "conflicten") return !!perWedstrijd[w.id];
    return true;
  });

  if (!t.wedstrijden.length) {
    return <div className="kaart"><p style={{fontSize:13,color:"var(--grijs-donker)",margin:0}}>Er zijn nog geen wedstrijden. Maak eerst de indeling bij stap 3.</p></div>;
  }
  var weergaven = [["lijst", "Lijst"], ["veld", "Per veld"], ["team", "Per team"]];
  if (t.scheidsrechters.length) weergaven.push(["scheids", "Per scheidsrechter"]);
  /* Eén wedstrijd in een lijst; tik = plannen/verplaatsen. */
  function rij(r, extra) {
    var w = opNummer[r.nummer];
    var fout = perWedstrijd[w.id];
    return (
      <div key={w.id}>
        {extra}
        <button onClick={function () { setOpen(open === w.id ? null : w.id); }} aria-expanded={open === w.id}
          style={{display:"flex",width:"100%",gap:10,alignItems:"center",background:"none",border:0,borderBottom:"1px solid var(--grijs)",padding:"8px 0",cursor:"pointer",color:"inherit",textAlign:"left"}}>
          <span style={{width:48,flexShrink:0,fontWeight:700,fontSize:14,color:w.start ? "inherit" : "var(--grijs-donker)"}}>
            {w.start || "—"}{w.vastgezet && <i className="fa-solid fa-thumbtack" style={{fontSize:10,marginLeft:3,color:"var(--grijs-donker)"}} title="Vastgezet"/>}
          </span>
          <span style={{flex:1,minWidth:0}}>
            <span style={{display:"block",fontSize:14,lineHeight:1.35}}>{r.thuis}</span>
            <span style={{display:"block",fontSize:14,lineHeight:1.35}}>{r.uit}</span>
            <span style={{display:"block",fontSize:11,color:"var(--grijs-donker)",marginTop:2}}>
              {["#" + r.nummer, r.veld && (t.locaties.length > 1 ? r.locatie + " · " : "") + r.veld, t.categorieen.length > 1 && r.categorie, r.ronde, r.scheids && "Scheids: " + r.scheids].filter(Boolean).join(" · ")}
            </span>
          </span>
          {fout && <i className="fa-solid fa-triangle-exclamation" style={{color:"var(--gevaar)"}} title={fout.join("\n")} aria-label="Conflict"/>}
          {w.uitslag && <span style={{fontWeight:700,fontSize:13}}>{w.uitslag.thuis + "–" + w.uitslag.uit}</span>}
        </button>
        {open === w.id && <PlanVenster t={t} w={w} mag={mag} fouten={fout || []} wijzig={wijzig} onKlaar={function () { setOpen(null); }} />}
      </div>
    );
  }
  var dagKop = null;
  return (
    <div>
      <div className="kaart" style={{padding:"12px 14px"}}>
        <div style={{fontSize:14,fontWeight:700}}>{gepland + " van " + aantalTekst(t.wedstrijden.length, "wedstrijd", "wedstrijden") + " ingepland"}</div>
        {lijst.length > 0 ? (
          <div className="melding" style={{margin:"10px 0 0",background:"var(--vlak-gevaar, #fdecec)"}}>
            <i className="fa-solid fa-triangle-exclamation" style={{color:"var(--gevaar)"}}/>
            <div>
              <div>{aantalTekst(lijst.length, "conflict", "conflicten") + " in het schema:"}</div>
              {lijst.slice(0, 6).map(function (c, k) { return <div key={k} style={{fontWeight:400}}>{"• " + c.tekst}</div>; })}
              {lijst.length > 6 && <div style={{fontWeight:400}}>{"… en nog " + (lijst.length - 6)}</div>}
            </div>
          </div>
        ) : gepland > 0 && <p style={{fontSize:12,color:"var(--succes)",margin:"6px 0 0"}}><i className="fa-solid fa-check"/> Geen conflicten.</p>}
        {mag && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
            <button className="knop klein" onClick={function () { setPlanner(true); }}><i className="fa-solid fa-wand-magic-sparkles"/> Automatisch plannen</button>
            {t.scheidsrechters.length > 0 && gepland > 0 && <ScheidsKnop t={t} wijzig={wijzig} />}
          </div>
        )}
      </div>

      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
        {weergaven.map(function (f) {
          return <button key={f[0]} className="filter-chip" style={chipStijl(weergave === f[0])} onClick={function () { setWeergave(f[0]); setOpen(null); }}>{f[1]}</button>;
        })}
      </div>

      {weergave === "lijst" && <>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10,alignItems:"center"}}>
          <span style={{fontSize:12,color:"var(--grijs-donker)"}}>Toon:</span>
          {[["alles", "Alles"], ["ongepland", "Nog in te plannen"], ["conflicten", "Conflicten"]].map(function (f) {
            return <button key={f[0]} className="filter-chip" style={chipStijl(filter === f[0])} onClick={function () { setFilter(f[0]); }}>{f[1]}</button>;
          })}
          {t.categorieen.length > 1 && (
            <select className="formulier-input" style={{width:"auto",marginBottom:0,padding:"4px 8px",fontSize:12}} value={catFilter}
              aria-label="Categorie" onChange={function (e) { setCatFilter(e.target.value); }}>
              <option value="">Alle categorieën</option>
              {t.categorieen.map(function (c) { return <option key={c.id} value={c.id}>{c.naam}</option>; })}
            </select>
          )}
        </div>
        <div className="kaart" style={{padding:"6px 14px"}}>
          {zichtbaar.length === 0 && <p style={{fontSize:13,color:"var(--grijs-donker)"}}>Niets te zien met dit filter.</p>}
          {zichtbaar.map(function (r) {
            var w = opNummer[r.nummer];
            var kop = !w.dagId ? "Nog niet ingepland" : (r.dag ? formateerDatumKort(r.dag) : "Dag " + (t.dagen.map(function (d) { return d.id; }).indexOf(w.dagId) + 1));
            /* Een kopje alleen als er iets te onderscheiden valt. */
            var toonKop = (t.dagen.length > 1 || regels.some(function (x) { return !opNummer[x.nummer].dagId; })) && kop !== dagKop;
            dagKop = kop;
            return rij(r, toonKop ? <div className="review-label" style={{margin:"10px 0 4px"}}>{kop}</div> : null);
          })}
        </div>
      </>}
      {weergave === "veld" && <TijdlijnPerVeld t={t} perWedstrijd={perWedstrijd} opKies={function (id) { setOpen(id); setWeergave("lijst"); setFilter("alles"); setCatFilter(""); }} />}
      {weergave === "team" && <OverzichtPer t={t} soort="team" regels={regels} opNummer={opNummer} rij={rij} />}
      {weergave === "scheids" && <OverzichtPer t={t} soort="scheids" regels={regels} opNummer={opNummer} rij={rij} />}

      <ToernooiDownloads t={t} />
      {planner && <PlannerVenster t={t} wijzig={wijzig} onSluiten={function () { setPlanner(false); }} />}
    </div>
  );
}

/* Automatisch plannen: eerst laten zien wat er gebeurt, dan pas toepassen. */
function PlannerVenster({ t, wijzig, onSluiten }) {
  const [alleenNieuw, setAlleenNieuw] = useState(t.wedstrijden.some(function (w) { return w.start; }));
  var r = planAutomatisch(t, { alleenOngepland: alleenNieuw });
  var blijft = t.wedstrijden.filter(function (w) { return w.start && (w.vastgezet || w.status === "gespeeld" || alleenNieuw); }).length;
  var verschuift = t.wedstrijden.filter(function (w) {
    var n = r.toernooi.wedstrijden.filter(function (x) { return x.id === w.id; })[0];
    return w.start && (n.start !== w.start || n.veldId !== w.veldId || n.dagId !== w.dagId);
  }).length;
  return (
    <div className="bevestig-overlay" onClick={function (e) { if (e.target === e.currentTarget) onSluiten(); }}>
      <div className="bevestig-kaart" style={{textAlign:"left",maxHeight:"85vh",overflowY:"auto"}}>
        <h3>Automatisch plannen</h3>
        <p style={{fontSize:13}}>Elke wedstrijd krijgt het vroegste veld en tijdstip waarop beide teams genoeg rust hebben en het veld vrij is.
          Een vervolgronde komt pas na de ronde waar hij op wacht.</p>
        <label style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13,margin:"8px 0"}}>
          <input type="radio" checked={alleenNieuw} onChange={function () { setAlleenNieuw(true); }} />
          <span><b>Alleen wat nog geen plek heeft</b><br/>Wat al gepland is, blijft staan.</span>
        </label>
        <label style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13,margin:"8px 0 12px"}}>
          <input type="radio" checked={!alleenNieuw} onChange={function () { setAlleenNieuw(false); }} />
          <span><b>Alles opnieuw</b><br/>Alleen vastgezette <i className="fa-solid fa-thumbtack"/> en gespeelde wedstrijden blijven staan.</span>
        </label>
        <div className="melding"><i className="fa-solid fa-circle-info"/>
          <div>
            {aantalTekst(r.gepland, "wedstrijd krijgt", "wedstrijden krijgen") + " een plek" + (blijft ? ", " + blijft + " blijven staan" : "") +
             (verschuift ? ", " + verschuift + " schuiven naar een andere plek" : "") + "."}
            {r.ongepland.length > 0 && <div style={{color:"var(--gevaar)"}}>{aantalTekst(r.ongepland.length, "wedstrijd past", "wedstrijden passen") + " nergens."}</div>}
          </div>
        </div>
        {r.ongepland.slice(0, 8).map(function (o) {
          return (
            <div key={o.wedstrijdId} style={{fontSize:12,borderTop:"1px solid var(--grijs)",padding:"6px 0"}}>
              <b>{"Wedstrijd " + o.nummer + ": "}</b>{o.reden}
              <div style={{color:"var(--blauw)"}}><i className="fa-solid fa-lightbulb"/> {o.voorstel}</div>
            </div>
          );
        })}
        {r.ongepland.length > 8 && <p style={{fontSize:12}}>{"… en nog " + (r.ongepland.length - 8)}</p>}
        <div className="bevestig-knoppen">
          <button className="knop lijn" onClick={onSluiten}>Annuleren</button>
          <button className="knop" disabled={!r.gepland && !verschuift} onClick={function () {
            if (wijzig(function (x) { return planAutomatisch(x, { alleenOngepland: alleenNieuw }).toernooi; })) {
              meldGoed(aantalTekst(r.gepland, "wedstrijd", "wedstrijden") + " ingepland");
              onSluiten();
            }
          }}>Toepassen</button>
        </div>
      </div>
    </div>
  );
}

function ScheidsKnop({ t, wijzig }) {
  const [vraag, setVraag] = useState(false);
  var zonder = t.wedstrijden.filter(function (w) { return w.start && !w.scheidsId; }).length;
  function doe(opnieuw) {
    var r = deelScheidsrechtersIn(t, { opnieuw: opnieuw });
    if (wijzig(function (x) { return deelScheidsrechtersIn(x, { opnieuw: opnieuw }).toernooi; })) {
      if (r.zonder.length) meldFout(aantalTekst(r.toegewezen, "wedstrijd", "wedstrijden") + " ingedeeld; voor " + r.zonder.length + " was niemand vrij.");
      else meldGoed(aantalTekst(r.toegewezen, "wedstrijd", "wedstrijden") + " ingedeeld");
    }
    setVraag(false);
  }
  return (
    <>
      <button className="knop lijn klein" onClick={function () { setVraag(true); }}><i className="fa-solid fa-flag"/> Scheidsrechters indelen</button>
      {vraag && (
        <div className="bevestig-overlay" onClick={function (e) { if (e.target === e.currentTarget) setVraag(false); }}>
          <div className="bevestig-kaart">
            <h3>Scheidsrechters indelen</h3>
            <p>{"Per wedstrijd een scheidsrechter die dan vrij en beschikbaar is; wie de minste wedstrijden heeft gaat voor. " +
                (zonder ? zonder + " geplande wedstrijden hebben nog niemand." : "Alle geplande wedstrijden hebben al iemand.")}</p>
            <div className="bevestig-knoppen" style={{flexWrap:"wrap"}}>
              <button className="knop lijn" onClick={function () { setVraag(false); }}>Annuleren</button>
              <button className="knop lijn" onClick={function () { doe(true); }}>Alles opnieuw</button>
              <button className="knop" disabled={!zonder} onClick={function () { doe(false); }}>Alleen lege</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Tijdlijn per veld: kolommen = velden, van boven naar beneden de tijd.
   Schuift binnen de kaart horizontaal als er meer velden zijn dan er op
   het scherm passen; de pagina zelf schuift nooit opzij. */
function TijdlijnPerVeld({ t, perWedstrijd, opKies }) {
  const [dagId, setDagId] = useState(t.dagen[0].id);
  var dag = t.dagen.filter(function (d) { return d.id === dagId; })[0] || t.dagen[0];
  var velden = [];
  t.locaties.forEach(function (l) { l.velden.forEach(function (v) { velden.push({ id: v.id, naam: v.naam, loc: l.naam }); }); });
  var ws = t.wedstrijden.filter(function (w) { return w.dagId === dag.id && w.start; });
  var begin = minVan(dag.start), eind = minVan(dag.eind);
  ws.forEach(function (w) { var c = categorieVan(t, w.categorieId); begin = Math.min(begin, minVan(w.start)); eind = Math.max(eind, minVan(w.start) + c.wedstrijdduur); });
  var pxMin = 2.2;
  var hoogte = Math.max(60, (eind - begin) * pxMin);
  var uren = [];
  for (var u = Math.ceil(begin / 60) * 60; u <= eind; u += 60) uren.push(u);
  var evs = (t.evenementen || []).filter(function (e) { return e.dagId === dag.id; });
  return (
    <div className="kaart" style={{padding:"10px 12px"}}>
      {t.dagen.length > 1 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
          {t.dagen.map(function (d, k) { return <button key={d.id} className="filter-chip" style={chipStijl(d.id === dag.id)} onClick={function () { setDagId(d.id); }}>{d.datum ? formateerDatumKort(d.datum) : "Dag " + (k + 1)}</button>; })}
        </div>
      )}
      <div style={{overflowX:"auto"}}>
        <div style={{display:"flex",minWidth:44 + velden.length * 120}}>
          <div style={{width:44,flexShrink:0,position:"relative",height:hoogte + 24}}>
            {uren.map(function (m) { return <div key={m} style={{position:"absolute",top:24 + (m - begin) * pxMin - 6,fontSize:10,color:"var(--grijs-donker)"}}>{tijdVanMin(m)}</div>; })}
          </div>
          {velden.map(function (v) {
            return (
              <div key={v.id} style={{flex:1,minWidth:120,position:"relative",height:hoogte + 24,borderLeft:"1px solid var(--grijs)"}}>
                <div style={{height:24,fontSize:11,fontWeight:700,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",padding:"0 4px"}}
                  title={v.loc + " · " + v.naam}>{v.naam}</div>
                {evs.filter(function (e) { return !e.locatieId || velden.some(function (x) { return x.id === v.id; }) && t.locaties.some(function (l) { return l.id === e.locatieId && l.velden.some(function (x) { return x.id === v.id; }); }); }).map(function (e) {
                  return <div key={e.id} style={{position:"absolute",left:2,right:2,top:24 + (minVan(e.start) - begin) * pxMin,height:Math.max(14, e.duur * pxMin),
                    background:"repeating-linear-gradient(45deg,var(--grijs-licht),var(--grijs-licht) 4px,var(--grijs) 4px,var(--grijs) 8px)",borderRadius:6,fontSize:10,padding:"2px 4px",overflow:"hidden"}}>{e.naam}</div>;
                })}
                {ws.filter(function (w) { return w.veldId === v.id; }).map(function (w) {
                  var c = categorieVan(t, w.categorieId);
                  var fout = perWedstrijd[w.id];
                  return (
                    <button key={w.id} onClick={function () { opKies(w.id); }} title={kantNaam(t, w, "thuis") + " – " + kantNaam(t, w, "uit")}
                      style={{position:"absolute",left:3,right:3,top:24 + (minVan(w.start) - begin) * pxMin,height:Math.max(18, c.wedstrijdduur * pxMin - 2),
                        background:fout ? "var(--vlak-gevaar, #fdecec)" : "var(--vlak-info)",border:"1px solid " + (fout ? "var(--gevaar)" : "var(--blauw)"),
                        borderRadius:6,fontSize:10,lineHeight:1.25,padding:"2px 4px",textAlign:"left",overflow:"hidden",cursor:"pointer",color:"inherit"}}>
                      <b>{w.start + " #" + w.nummer}</b>
                      <div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{kantNaam(t, w, "thuis")}</div>
                      <div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{kantNaam(t, w, "uit")}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"8px 0 0"}}>Tik op een wedstrijd om hem te verplaatsen.</p>
    </div>
  );
}

/* Overzicht voor één team of één scheidsrechter: de wedstrijden op
   volgorde, met de rust ertussen. */
function OverzichtPer({ t, soort, regels, opNummer, rij }) {
  var keuzes = soort === "team"
    ? t.deelnemers.map(function (d) { return { id: d.id, naam: d.naam + (t.categorieen.length > 1 ? " (" + categorieVan(t, d.categorieId).naam + ")" : "") }; })
    : t.scheidsrechters.map(function (s) { return { id: s.id, naam: s.naam }; });
  const [id, setId] = useState(keuzes[0] ? keuzes[0].id : "");
  var eigen = regels.filter(function (r) {
    var w = opNummer[r.nummer];
    if (soort === "scheids") return w.scheidsId === id;
    var d = deelnemersVan(t, w);
    return d.thuis === id || d.uit === id;
  });
  var vorige = null;
  return (
    <div className="kaart" style={{padding:"10px 14px"}}>
      <select className="formulier-input" value={id} aria-label={soort === "team" ? "Team" : "Scheidsrechter"} onChange={function (e) { setId(e.target.value); }}>
        {keuzes.map(function (k) { return <option key={k.id} value={k.id}>{k.naam}</option>; })}
      </select>
      {eigen.length === 0 && <p style={{fontSize:13,color:"var(--grijs-donker)"}}>{soort === "team" ? "Nog geen wedstrijden bekend voor dit team (een knock-out volgt pas na de groepsfase)." : "Nog geen wedstrijden voor deze scheidsrechter."}</p>}
      {eigen.map(function (r) {
        var w = opNummer[r.nummer];
        var rust = null;
        if (vorige && w.start && vorige.start && vorige.dagId === w.dagId) {
          rust = minVan(w.start) - minVan(vorige.start) - categorieVan(t, vorige.categorieId).wedstrijdduur;
        }
        vorige = w;
        return rij(r, rust !== null ? <div style={{fontSize:11,color:rust < categorieVan(t, w.categorieId).minRust ? "var(--gevaar)" : "var(--grijs-donker)",padding:"4px 0 0 58px"}}>
          <i className="fa-solid fa-mug-hot"/>{" " + rust + " min rust"}</div> : null);
      })}
    </div>
  );
}

/* Eerste vrije tijd op een veld: na de laatste wedstrijd die daar al
   staat (plus wisseltijd), anders de begintijd van de dag. Alleen een
   voorstel: je kunt hem gewoon veranderen. */
function eersteVrijeTijd(t, w, dagId, veldId) {
  var dag = t.dagen.filter(function (d) { return d.id === dagId; })[0];
  var eind = dag ? minVan(dag.start) : 540;
  t.wedstrijden.forEach(function (x) {
    if (x.id === w.id || x.dagId !== dagId || x.veldId !== veldId || !x.start) return;
    var c = categorieVan(t, x.categorieId);
    eind = Math.max(eind, minVan(x.start) + (c.wedstrijdduur || 0) + (c.wisseltijd || 0));
  });
  return String(Math.floor(eind / 60)).padStart(2, "0") + ":" + String(eind % 60).padStart(2, "0");
}

function PlanVenster({ t, w, mag, fouten, wijzig, onKlaar }) {
  var velden = [];
  t.locaties.forEach(function (l) { l.velden.forEach(function (v) { velden.push({ id: v.id, naam: (t.locaties.length > 1 ? l.naam + " · " : "") + v.naam }); }); });
  var startDag = w.dagId || t.dagen[0].id;
  /* Nog niet ingepland: het veld dat het eerst vrij is (bij gelijk het eerste). */
  var startVeld = w.veldId || velden.reduce(function (best, v) {
    return minVan(eersteVrijeTijd(t, w, startDag, v.id)) < minVan(eersteVrijeTijd(t, w, startDag, best.id)) ? v : best;
  }, velden[0]).id;
  const [dagId, setDagId] = useState(startDag);
  const [veldId, setVeldId] = useState(startVeld);
  const [start, setStart] = useState(w.start || eersteVrijeTijd(t, w, startDag, startVeld));
  const [scheids, setScheids] = useState(w.scheidsId || "");
  const [slots, setSlots] = useState(false);
  function kiesPlek(d, v) {
    setDagId(d); setVeldId(v);
    if (!w.start) setStart(eersteVrijeTijd(t, w, d, v));
  }
  function bewaar(plek) {
    var ok = wijzig(function (x) {
      var nt = planWedstrijd(x, w.id, plek);
      return Object.assign({}, nt, { wedstrijden: nt.wedstrijden.map(function (y) { return y.id === w.id ? Object.assign({}, y, { scheidsId: scheids || null }) : y; }) });
    });
    if (ok) onKlaar();
  }
  return (
    <div style={{background:"var(--grijs-licht)",borderRadius:12,padding:"10px 12px",margin:"6px 0 10px"}}>
      {fouten.map(function (f, k) { return <div key={k} style={{fontSize:12,color:"var(--gevaar)",marginBottom:4}}><i className="fa-solid fa-triangle-exclamation"/> {f}</div>; })}
      <div className="formulier-rij">
        {t.dagen.length > 1 && (
          <div><label className="formulier-label">Dag</label>
            <select className="formulier-input" value={dagId} disabled={!mag} onChange={function (e) { kiesPlek(e.target.value, veldId); }}>
              {t.dagen.map(function (d, k) { return <option key={d.id} value={d.id}>{d.datum ? formateerDatumKort(d.datum) : "Dag " + (k + 1)}</option>; })}
            </select></div>
        )}
        <div><label className="formulier-label">Veld</label>
          <select className="formulier-input" value={veldId} disabled={!mag} onChange={function (e) { kiesPlek(dagId, e.target.value); }}>
            {velden.map(function (v) { return <option key={v.id} value={v.id}>{v.naam}</option>; })}
          </select></div>
        <div><label className="formulier-label">Tijd</label>
          <input className="formulier-input" type="time" value={start} disabled={!mag} onChange={function (e) { setStart(e.target.value); }} /></div>
        <div><label className="formulier-label">Scheidsrechter</label>
          <select className="formulier-input" value={scheids} disabled={!mag} onChange={function (e) { setScheids(e.target.value); }}>
            <option value="">—</option>
            {t.scheidsrechters.map(function (s) { return <option key={s.id} value={s.id}>{s.naam}</option>; })}
          </select></div>
      </div>
      {mag && (
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,marginBottom:10}}>
          <input type="checkbox" checked={!!w.vastgezet} onChange={function (e) {
            var aan = e.target.checked;
            wijzig(function (x) { return Object.assign({}, x, { wedstrijden: x.wedstrijden.map(function (y) { return y.id === w.id ? Object.assign({}, y, { vastgezet: aan }) : y; }) }); });
          }} />
          <span><i className="fa-solid fa-thumbtack"/> Vastzetten — automatisch plannen laat deze wedstrijd staan</span>
        </label>
      )}
      {mag && (
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="knop klein" onClick={function () { bewaar({ dagId: dagId, veldId: veldId, start: start }); }}><i className="fa-solid fa-check"/> Opslaan</button>
          <button className="knop lijn klein" onClick={function () { setSlots(!slots); }}><i className="fa-solid fa-arrows-up-down-left-right"/> Verplaatsen</button>
          {w.start && <button className="knop lijn klein" onClick={function () { bewaar(null); }}>Losmaken</button>}
          <button className="knop lijn klein" onClick={onKlaar}>Sluiten</button>
        </div>
      )}
      {mag && slots && <VrijeSlots t={t} w={w} opKies={function (s) { bewaar({ dagId: s.dagId, veldId: s.veldId, start: s.start }); }} />}
    </div>
  );
}

/* Verplaatsen zonder slepen: een lijst tijdvakken, elk met een groen
   vinkje of de reden waarom het botst. */
function VrijeSlots({ t, w, opKies }) {
  const [alles, setAlles] = useState(false);
  var lijst = vrijeSlots(t, w.id);
  var vrij = lijst.filter(function (s) { return !s.problemen.length; });
  var toon = (alles ? lijst : vrij).slice(0, alles ? 60 : 24);
  /** @param {string} id */
  function veldNaam(id) { var n = ""; t.locaties.forEach(function (l) { l.velden.forEach(function (v) { if (v.id === id) n = (t.locaties.length > 1 ? l.naam + " · " : "") + v.naam; }); }); return n; }
  function dagNaam(id) { var k = t.dagen.map(function (d) { return d.id; }).indexOf(id); var d = t.dagen[k]; return d && d.datum ? formateerDatumKort(d.datum) : "Dag " + (k + 1); }
  return (
    <div style={{marginTop:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{flex:1,fontSize:12,fontWeight:700}}>{aantalTekst(vrij.length, "vrij tijdvak", "vrije tijdvakken")}</span>
        <label style={{fontSize:12,display:"flex",gap:4,alignItems:"center"}}>
          <input type="checkbox" checked={alles} onChange={function (e) { setAlles(e.target.checked); }} /> ook bezette
        </label>
      </div>
      {toon.map(function (s, k) {
        var goed = !s.problemen.length;
        return (
          <button key={k} onClick={function () { opKies(s); }}
            style={{display:"flex",width:"100%",gap:8,alignItems:"flex-start",textAlign:"left",background:"var(--wit)",border:"1px solid var(--grijs)",borderRadius:8,padding:"7px 9px",marginBottom:4,cursor:"pointer",color:"inherit",fontSize:13}}>
            <i className={goed ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"} style={{color:goed ? "var(--succes)" : "var(--gevaar)",marginTop:2}}/>
            <span style={{flex:1,minWidth:0}}>
              <b>{(t.dagen.length > 1 ? dagNaam(s.dagId) + " · " : "") + s.start}</b>{" · " + veldNaam(s.veldId)}
              {!goed && <span style={{display:"block",fontSize:11,color:"var(--grijs-donker)"}}>{s.problemen.join("; ")}</span>}
            </span>
          </button>
        );
      })}
      {vrij.length === 0 && !alles && <p style={{fontSize:12,color:"var(--grijs-donker)"}}>Geen enkel tijdvak is helemaal vrij. Zet "ook bezette" aan om te zien wat er botst.</p>}
    </div>
  );
}

/* ═══ Stap 5: Resultaten ═══ */
function StapResultaten({ t, mag, wijzig }) {
  const [catId, setCatId] = useCategorie(t);
  var cat = t.categorieen.filter(function (c) { return c.id === catId; })[0];
  if (!cat) return null;
  var stadia = t.stadia.filter(function (s) { return s.categorieId === cat.id; });
  if (!stadia.length) {
    return (
      <div>
        <CategorieKiezer t={t} catId={cat.id} opKies={setCatId} />
        <div className="kaart"><p style={{fontSize:13,color:"var(--grijs-donker)",margin:0}}>Nog geen indeling voor deze categorie. Maak die bij stap 3.</p></div>
        {t.wedstrijden.length > 0 && <ToernooiDownloads t={t} />}
      </div>
    );
  }
  var afwijkingen = plaatsingAfwijkingen(t).filter(function (a) {
    var w = t.wedstrijden.filter(function (x) { return x.id === a.wedstrijdId; })[0];
    return w && w.categorieId === cat.id;
  });
  return (
    <div>
      <CategorieKiezer t={t} catId={cat.id} opKies={setCatId} />
      {afwijkingen.map(function (a, k) {
        var w = t.wedstrijden.filter(function (x) { return x.id === a.wedstrijdId; })[0];
        return (
          <div key={k} className="melding" style={a.gespeeld ? {background:"var(--vlak-gevaar, #fdecec)"} : null}>
            <i className="fa-solid fa-triangle-exclamation" style={{color:a.gespeeld ? "var(--gevaar)" : "var(--oranje)"}}/>
            <div style={{flex:1}}>
              {"Plaatsing wijkt af van de stand na een correctie: in wedstrijd " + w.nummer + " (" + w.rondeNaam + ") staat " + (tNaam(t, a.was) || "?") +
               ", volgens de stand nu " + (tNaam(t, a.nu) || "nog niet bekend") + "."}
              {a.gespeeld
                ? <div style={{fontWeight:400}}>Die wedstrijd is al gespeeld. Er is niets veranderd; beslis zelf wat er moet gebeuren.</div>
                : mag && <div><button className="knop lijn klein" style={{marginTop:6}} onClick={function () {
                    if (wijzig(function (x) { return bijwerkPlaatsing(x, w.id); })) meldGoed("Plaatsing bijgewerkt");
                  }}>Plaatsing bijwerken</button></div>}
            </div>
          </div>
        );
      })}
      {stadia.map(function (s) {
        return s.soort === "poule"
          ? <PouleResultaten key={s.id} t={t} s={s} cat={cat} mag={mag} wijzig={wijzig} />
          : <KnockoutResultaten key={s.id} t={t} s={s} cat={cat} mag={mag} wijzig={wijzig} />;
      })}
      <ToernooiDownloads t={t} />
    </div>
  );
}

function PouleResultaten({ t, s, cat, mag, wijzig }) {
  return (
    <div>
      {s.poules.map(function (p) {
        var stand = pouleStand(t, s.id, p.id);
        var ws = t.wedstrijden.filter(function (w) { return w.pouleId === p.id; }).sort(function (a, b) { return a.nummer - b.nummer; });
        var open = ws.filter(function (w) { return !w.uitslag; }).length;
        return (
          <div key={p.id} className="kaart">
            <div className="kaart-titel"><i className="fa-solid fa-ranking-star"/> {(s.poules.length > 1 ? p.naam : s.naam) + (open ? " · nog " + open + " te spelen" : " · klaar")}</div>
            <div style={{overflowX:"auto"}}>
              <table className="stand-tabel">
                <thead><tr><th style={{width:30}}>#</th><th className="links">{cat.spelvorm === "1x1" ? "Speler" : "Team"}</th>
                  <th>G</th><th>W</th><th>GL</th><th>V</th><th>DS</th><th>P</th></tr></thead>
                <tbody>
                  {stand.map(function (r) {
                    var d = t.deelnemers.filter(function (x) { return x.id === r.teamId; })[0];
                    var door = r.plek <= (s.doorgaan.perPoule || 0);
                    return (
                      <tr key={r.teamId} className={d && d.eigen ? "eigen" : ""}>
                        <td><span className="stand-pos" style={door ? {background:"var(--succes)",color:"#fff"} : null}
                          title={door ? "Gaat door" : (r.gedeeld ? "Gedeelde plek" : "")}>{r.plek}{r.gedeeld ? "=" : ""}</span></td>
                        <td className="links naam">{r.naam}</td>
                        <td>{r.gespeeld}</td><td>{r.winst}</td><td>{r.gelijk}</td><td>{r.verlies}</td>
                        <td style={{color:r.saldo>0?"var(--succes)":r.saldo<0?"var(--gevaar)":"inherit"}}>{(r.saldo>0?"+":"")+r.saldo}</td>
                        <td style={{fontSize:15}}>{r.punten}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:8}}>
              {ws.map(function (w) { return <TUitslag key={w.id + (w.uitslag ? JSON.stringify(w.uitslag) : "")} t={t} w={w} cat={cat} ko={false} mag={mag} wijzig={wijzig} />; })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KnockoutResultaten({ t, s, cat, mag, wijzig }) {
  var ws = t.wedstrijden.filter(function (w) { return w.stadiumId === s.id; }).sort(function (a, b) { return a.nummer - b.nummer; });
  /* Komt de knock-out uit een groepsfase en is die nog niet gestart? */
  var bronStadium = null, nogNietGestart = false;
  ws.forEach(function (w) {
    [["thuis", "thuisVast"], ["uit", "uitVast"]].forEach(function (k) {
      var b = w[k[0]];
      var id = (b.poulePlek && b.poulePlek.stadiumId) || (b.besteNummer && b.besteNummer.stadiumId);
      if (id) { bronStadium = id; if (!w[k[1]]) nogNietGestart = true; }
    });
  });
  var rondes = [];
  ws.forEach(function (w) { if (rondes.indexOf(w.rondeNaam) < 0) rondes.push(w.rondeNaam); });
  var finale = ws.filter(function (w) { return w.rondeNaam === "Finale"; })[0];
  var kampioen = finale && winnaarVan(t, finale);
  var vrij = vrijgesteld(t, cat.id);
  var compleet = bronStadium ? groepsfaseCompleet(t, bronStadium) : true;
  var nogTeGaan = bronStadium ? t.wedstrijden.filter(function (w) { return w.stadiumId === bronStadium && !w.uitslag; }).length : 0;
  return (
    <div className="kaart">
      <div className="kaart-titel"><i className="fa-solid fa-sitemap"/> {s.naam}</div>
      {kampioen && (
        <div style={{background:"var(--vlak-info)",borderRadius:12,padding:"12px 14px",marginBottom:10,fontWeight:700,fontSize:15}}>
          <i className="fa-solid fa-trophy" style={{color:"var(--oranje)"}}/>{" Winnaar: " + tNaam(t, kampioen)}
        </div>
      )}
      {nogNietGestart && (
        <div className="melding">
          <i className="fa-solid fa-circle-info"/>
          <div style={{flex:1}}>
            {compleet
              ? "De groepsfase is klaar. Met Start knock-out worden de teams op hun plek gezet; latere correcties in de groepsfase veranderen daarna niets meer zonder dat je het ziet."
              : "De knock-out begint als alle uitslagen van de groepsfase zijn ingevuld (nog " + nogTeGaan + " te gaan)."}
            {compleet && mag && <div><button className="knop klein" style={{marginTop:8}} onClick={function () {
              if (wijzig(function (x) { return startKnockout(x, s.id); })) meldGoed("Knock-out gestart");
            }}><i className="fa-solid fa-play"/> Start knock-out</button></div>}
          </div>
        </div>
      )}
      {vrij.length > 0 && <p style={{fontSize:12,color:"var(--grijs-donker)",margin:"0 0 8px"}}>{"Vrij in de eerste ronde: " + vrij.map(function (id) { return tNaam(t, id); }).join(", ")}</p>}
      {rondes.map(function (r) {
        return (
          <div key={r}>
            <div className="review-label" style={{margin:"10px 0 2px"}}>{r}</div>
            {ws.filter(function (w) { return w.rondeNaam === r; }).map(function (w) {
              return <TUitslag key={w.id + JSON.stringify([w.uitslag, w.strafschoppen, w.thuisVast, w.uitVast])} t={t} w={w} cat={cat} ko={true} mag={mag} wijzig={wijzig} />;
            })}
          </div>
        );
      })}
    </div>
  );
}

/* Eén uitslag. Thuis en uit onder elkaar (zoals bij de competitie): op
   een telefoon past de hele teamnaam dan wel. Bij een gelijke stand in
   de knock-out verschijnen de vakjes voor strafschoppen; pas als die
   ook zijn ingevuld wordt er bewaard, anders volgt er een foutmelding
   terwijl je nog aan het typen bent. */
function TUitslag({ t, w, cat, ko, mag, wijzig }) {
  const [a, setA] = useState(w.uitslag ? String(w.uitslag.thuis) : "");
  const [b, setB] = useState(w.uitslag ? String(w.uitslag.uit) : "");
  const [sa, setSa] = useState(w.strafschoppen ? String(w.strafschoppen.thuis) : "");
  const [sb, setSb] = useState(w.strafschoppen ? String(w.strafschoppen.uit) : "");
  var d = deelnemersVan(t, w);
  var bekend = !!(d.thuis && d.uit);
  var kan = mag && (bekend || !ko);
  var gelijk = ko && a !== "" && a === b;
  function klaar(na, nb, nsa, nsb) {
    var r = leesUitslagInvoer(na, nb);
    if (r.soort === "half") return;
    if (r.soort === "fout") { meldFout("Een score is een heel getal vanaf 0."); return; }
    var uitslag = r.soort === "uitslag" ? r.uitslag : null;
    var straf = null;
    if (uitslag && ko && uitslag.thuis === uitslag.uit) {
      var s = leesUitslagInvoer(nsa, nsb);
      if (s.soort !== "uitslag") return;   // nog niet klaar met invullen
      straf = s.uitslag;
    }
    if (JSON.stringify(uitslag) === JSON.stringify(w.uitslag || null) &&
        JSON.stringify(straf) === JSON.stringify(w.strafschoppen || null)) return;
    wijzig(function (x) { return zetUitslag(x, w.id, uitslag, straf); });
  }
  var vak = {width:48,textAlign:"center",marginBottom:0,padding:"8px 4px",fontSize:17,fontWeight:700};
  var klein = {width:40,textAlign:"center",marginBottom:0,padding:"4px",fontSize:14};
  function regel(kant, waarde, zet, strafWaarde, zetStraf) {
    var id = d[kant];
    var dn = id && t.deelnemers.filter(function (x) { return x.id === id; })[0];
    var naam = dn ? dn.naam : bronTekst(t, w[kant]);
    var wint = w.status === "gespeeld" && ko && winnaarVan(t, w) === id;
    return (
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0"}}>
        <span style={{flex:1,minWidth:0,fontSize:14,lineHeight:1.3,fontWeight:(dn && dn.eigen) || wint ? 700 : 500,
          color:dn ? "inherit" : "var(--grijs-donker)",fontStyle:dn ? "normal" : "italic"}}>{naam}</span>
        {gelijk && (
          <input className="formulier-input" style={klein} inputMode="numeric" value={strafWaarde} disabled={!kan}
            aria-label={"Strafschoppen " + naam} placeholder="s"
            onChange={function (e) { zetStraf(e.target.value); }}
            onBlur={function () { klaar(a, b, sa, sb); }}
            onKeyDown={function (e) { if (e.key === "Enter") klaar(a, b, sa, sb); }} />
        )}
        <input className="formulier-input" style={vak} inputMode="numeric" value={waarde} disabled={!kan}
          aria-label={"Doelpunten " + naam}
          onChange={function (e) { zet(e.target.value); }}
          onBlur={function () { klaar(a, b, sa, sb); }}
          onKeyDown={function (e) { if (e.key === "Enter") klaar(a, b, sa, sb); }} />
      </div>
    );
  }
  var info = ["#" + w.nummer, w.start, w.start && (function () {
    var v = null; t.locaties.forEach(function (l) { l.velden.forEach(function (x) { if (x.id === w.veldId) v = x.naam; }); }); return v;
  })(), !ko && w.rondeNaam.replace("Groepsfase · ", "")].filter(Boolean).join(" · ");
  return (
    <div style={{padding:"8px 0",borderBottom:"1px solid var(--grijs)"}}>
      <div style={{fontSize:11,color:"var(--grijs-donker)",marginBottom:2}}>{info}</div>
      {regel("thuis", a, setA, sa, setSa)}
      {regel("uit", b, setB, sb, setSb)}
      {gelijk && !w.strafschoppen && <div style={{fontSize:11,color:"var(--grijs-donker)",marginTop:2}}>Gelijk: vul de strafschoppen in (het kleine vakje). Die tellen niet als doelpunt.</div>}
      {w.strafschoppen && !gelijk && <div style={{fontSize:11,color:"var(--grijs-donker)"}}>{"Na strafschoppen " + w.strafschoppen.thuis + "–" + w.strafschoppen.uit}</div>}
    </div>
  );
}

/* ═══ Downloads ═══
   PDF (jsPDF, staat al in de app) en CSV. Alleen namen, tijden, velden
   en uitslagen: contactgegevens komen er nooit in (schemaRegels geeft
   ze niet eens terug). */
function ToernooiDownloads({ t }) {
  const [catId, setCatId] = useState("");
  function bestandsnaam(soort, ext) {
    return "toernooi-" + (t.naam.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "schema") + "-" + soort + "." + ext;
  }
  function pdf(maak, soort) {
    if (!window.jspdf) { meldFout("De PDF-maker is nog niet geladen. Probeer het zo nog eens."); return; }
    try {
      var doc = maak(t, catId);
      deelOfDownload(doc.output("blob"), bestandsnaam(soort, "pdf"), t.naam);
    } catch (e) { if (window.console) console.error(e); meldFout("De PDF maken lukte niet."); }
  }
  var regelsAantal = schemaRegels(catId ? filterCategorie(t, catId) : t).length;
  return (
    <div className="kaart">
      <div className="kaart-titel"><i className="fa-solid fa-download"/> Downloads</div>
      {t.categorieen.length > 1 && (
        <select className="formulier-input" value={catId} aria-label="Categorie voor de download" onChange={function (e) { setCatId(e.target.value); }}>
          <option value="">Alle categorieën</option>
          {t.categorieen.map(function (c) { return <option key={c.id} value={c.id}>{c.naam}</option>; })}
        </select>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
        <button className="knop lijn klein" disabled={!regelsAantal} onClick={function () { pdf(toernooiSchemaPdf, "schema"); }}><i className="fa-solid fa-file-pdf"/> Speelschema</button>
        <button className="knop lijn klein" disabled={!t.stadia.length} onClick={function () { pdf(toernooiStandenPdf, "standen"); }}><i className="fa-solid fa-file-pdf"/> Poules en standen</button>
        <button className="knop lijn klein" disabled={!regelsAantal} onClick={function () { pdf(toernooiBriefjesPdf, "wedstrijdbriefjes"); }}><i className="fa-solid fa-file-pdf"/> Wedstrijdbriefjes</button>
        <button className="knop lijn klein" disabled={!regelsAantal} onClick={function () {
          var blob = new Blob(["﻿" + schemaCsv(catId ? filterCategorie(t, catId) : t)], { type: "text/csv;charset=utf-8" });
          deelOfDownload(blob, bestandsnaam("schema", "csv"), t.naam);
        }}><i className="fa-solid fa-file-csv"/> Schema (CSV)</button>
      </div>
      <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"8px 0 0"}}>Het CSV-bestand opent in Excel of Numbers. Contactgegevens staan in geen enkele download.</p>
    </div>
  );
}

/* Hetzelfde toernooi, met alleen de wedstrijden en stadia van één categorie. */
function filterCategorie(t, catId) {
  if (!catId) return t;
  return Object.assign({}, t, {
    stadia: t.stadia.filter(function (s) { return s.categorieId === catId; }),
    wedstrijden: t.wedstrijden.filter(function (w) { return w.categorieId === catId; })
  });
}

/* Tekst inkorten tot hij in een kolom past. */
function pdfKort(doc, tekst, breedte) {
  var s = String(tekst || "");
  if (doc.getTextWidth(s) <= breedte) return s;
  while (s.length > 1 && doc.getTextWidth(s + "…") > breedte) s = s.slice(0, -1);
  return s + "…";
}
function pdfToernooiKop(doc, t, titel, W, M) {
  doc.setTextColor(0, 40, 115);
  doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  doc.text(pdfKort(doc, t.naam, W - 2 * M), M, 20);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90, 98, 110);
  var datums = t.dagen.filter(function (d) { return d.datum; }).map(function (d) { return new Date(d.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }); });
  doc.text(titel + (datums.length ? "  ·  " + datums.join(", ") : ""), M, 27);
  return 36;
}
function pdfVoeten(doc, W, H) {
  var n = doc.getNumberOfPages();
  for (var p = 1; p <= n; p++) { doc.setPage(p); pdfVoet(doc, W, H, { pagina: p, paginas: n }); }
}

function toernooiSchemaPdf(t, catId) {
  var doc = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  var W = 210, H = 297, M = 14;
  var tt = filterCategorie(t, catId);
  var titel = "Speelschema" + (catId ? " · " + categorieVan(t, catId).naam : "");
  var y = pdfToernooiKop(doc, t, titel, W, M);
  var regels = schemaRegels(tt);
  var metScheids = regels.some(function (r) { return r.scheids; });
  var metCat = !catId && t.categorieen.length > 1;
  /* Kolommen: [kop, breedte, veld] — samen W - 2M = 182 mm. */
  var kol = [["Nr", 10, "nummer"], ["Tijd", 13, "tijd"], ["Veld", 20, "veld"]];
  if (metCat) kol.push(["Categorie", 24, "categorie"]);
  var rest = 182 - kol.reduce(function (s, k) { return s + k[1]; }, 0) - 26 - (metScheids ? 26 : 0);
  kol.push(["Thuis", rest / 2, "thuis"], ["Uit", rest / 2, "uit"]);
  if (metScheids) kol.push(["Scheids", 26, "scheids"]);
  kol.push(["Uitslag", 26, "uitslag"]);
  function kopRij() {
    doc.setFillColor(0, 40, 115); doc.rect(M, y - 4.5, W - 2 * M, 7, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    var x = M + 1.5;
    kol.forEach(function (k) { doc.text(k[0], x, y); x += k[1]; });
    y += 7;
  }
  var dag = null;
  regels.forEach(function (r, i) {
    var nieuweDag = (r.dag || "—") !== dag;
    if (y > H - 30 || (nieuweDag && y > H - 42)) { doc.addPage(); y = 20; dag = null; nieuweDag = true; }
    if (nieuweDag) {
      dag = r.dag || "—";
      doc.setTextColor(0, 40, 115); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(r.dag ? new Date(r.dag).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }) : (r.tijd ? "Datum onbekend" : "Nog niet ingepland"), M, y + 2);
      y += 8; kopRij();
    }
    if (i % 2 === 0) { doc.setFillColor(244, 246, 249); doc.rect(M, y - 4.3, W - 2 * M, 6.4, "F"); }
    doc.setTextColor(30, 34, 40); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    var x = M + 1.5;
    kol.forEach(function (k) {
      var v = String(r[k[2]] == null ? "" : r[k[2]]);
      if (k[2] === "uitslag") doc.setFont("helvetica", "bold");
      doc.text(pdfKort(doc, v, k[1] - 2), x, y);
      doc.setFont("helvetica", "normal");
      x += k[1];
    });
    y += 6.4;
  });
  pdfVoeten(doc, W, H);
  return doc;
}

function toernooiStandenPdf(t, catId) {
  var doc = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  var W = 210, H = 297, M = 14;
  var y = pdfToernooiKop(doc, t, "Poules en standen", W, M);
  var kol = [["#", 9], ["Team", 87], ["G", 11], ["W", 11], ["GL", 11], ["V", 11], ["DV", 11], ["DT", 11], ["DS", 11], ["P", 9]];
  function ruimte(nodig) { if (y + nodig > H - 22) { doc.addPage(); y = 20; } }
  t.categorieen.filter(function (c) { return !catId || c.id === catId; }).forEach(function (cat) {
    var stadia = t.stadia.filter(function (s) { return s.categorieId === cat.id; });
    if (!stadia.length) return;
    ruimte(20);
    doc.setTextColor(0, 40, 115); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(cat.naam, M, y); y += 7;
    stadia.forEach(function (s) {
      if (s.soort === "poule") {
        s.poules.forEach(function (p) {
          var stand = pouleStand(t, s.id, p.id);
          ruimte(14 + stand.length * 6);
          doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 34, 40);
          doc.text(s.poules.length > 1 ? p.naam : s.naam, M, y); y += 5;
          doc.setFillColor(0, 40, 115); doc.rect(M, y - 4.3, W - 2 * M, 6.4, "F");
          doc.setTextColor(255, 255, 255); doc.setFontSize(8.5);
          var x = M + 1.5;
          kol.forEach(function (k) { doc.text(k[0], x, y); x += k[1]; });
          y += 6.4;
          doc.setTextColor(30, 34, 40); doc.setFont("helvetica", "normal");
          stand.forEach(function (r, i) {
            if (i % 2 === 0) { doc.setFillColor(244, 246, 249); doc.rect(M, y - 4.3, W - 2 * M, 6.4, "F"); }
            var waarden = [r.plek + (r.gedeeld ? "=" : ""), r.naam, r.gespeeld, r.winst, r.gelijk, r.verlies, r.voor, r.tegen, (r.saldo > 0 ? "+" : "") + r.saldo, r.punten];
            x = M + 1.5;
            waarden.forEach(function (v, k) { doc.text(pdfKort(doc, String(v), kol[k][1] - 2), x, y); x += kol[k][1]; });
            y += 6.4;
          });
          y += 5;
        });
      } else {
        var ws = t.wedstrijden.filter(function (w) { return w.stadiumId === s.id; }).sort(function (a, b) { return a.nummer - b.nummer; });
        ruimte(12);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 34, 40);
        doc.text(s.naam, M, y); y += 6;
        var ronde = null;
        ws.forEach(function (w) {
          ruimte(8);
          if (w.rondeNaam !== ronde) {
            ronde = w.rondeNaam;
            doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(0, 40, 115);
            doc.text(ronde, M, y); y += 5;
          }
          doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 34, 40);
          var u = w.uitslag ? w.uitslag.thuis + " – " + w.uitslag.uit + (w.strafschoppen ? "  (" + w.strafschoppen.thuis + "–" + w.strafschoppen.uit + " n.s.)" : "") : "–";
          doc.text(pdfKort(doc, kantNaam(t, w, "thuis"), 70), M + 4, y);
          doc.text(pdfKort(doc, kantNaam(t, w, "uit"), 70), M + 80, y);
          doc.text(u, W - M, y, { align: "right" });
          y += 5.5;
        });
        var finale = ws.filter(function (w) { return w.rondeNaam === "Finale"; })[0];
        var win = finale && winnaarVan(t, finale);
        if (win) { y += 2; doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Winnaar: " + tNaam(t, win), M, y); y += 7; }
        y += 4;
      }
    });
    y += 4;
  });
  pdfVoeten(doc, W, H);
  return doc;
}

/* Drie briefjes per A4, om te knippen. De scheidsrechter vult de
   uitslag in en levert het briefje in bij de wedstrijdtafel. */
function toernooiBriefjesPdf(t, catId) {
  var doc = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  var W = 210, M = 12, hoog = 93;
  var regels = schemaRegels(filterCategorie(t, catId));
  regels.forEach(function (r, i) {
    if (i > 0 && i % 3 === 0) doc.addPage();
    var top = 6 + (i % 3) * (hoog + 3);
    doc.setDrawColor(150, 158, 170); doc.setLineWidth(0.3);
    doc.setLineDashPattern([2, 1.5], 0);
    if (i % 3 < 2) doc.line(4, top + hoog + 1.5, W - 4, top + hoog + 1.5);
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(0, 40, 115); doc.setLineWidth(0.5);
    doc.roundedRect(M, top, W - 2 * M, hoog, 3, 3);
    var x = M + 6, y = top + 9;
    doc.setTextColor(0, 40, 115); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(pdfKort(doc, t.naam, 120), x, y);
    doc.setFontSize(14); doc.text("Wedstrijd " + r.nummer, W - M - 6, y, { align: "right" });
    y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(60, 66, 76);
    doc.text(pdfKort(doc, [r.categorie, r.ronde].filter(Boolean).join("  ·  "), W - 2 * M - 12), x, y);
    y += 5;
    var wanneer = [r.dag ? new Date(r.dag).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) : "", r.tijd, [r.locatie, r.veld].filter(Boolean).join(" · ")].filter(Boolean).join("  ·  ");
    doc.text(wanneer || "Dag, tijd en veld: ____________________", x, y);
    y += 5;
    doc.text("Scheidsrechter: " + (r.scheids || "______________________________"), x, y);
    /* De teams met vakjes voor de uitslag en de strafschoppen. */
    y += 9;
    doc.setFontSize(8); doc.setTextColor(120, 128, 140);
    doc.text("Doelpunten", W - M - 46, y - 3.5, { align: "center" });
    doc.text("Strafsch.", W - M - 20, y - 3.5, { align: "center" });
    [r.thuis, r.uit].forEach(function (naam) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(30, 34, 40);
      doc.text(pdfKort(doc, naam, W - 2 * M - 70), x, y + 5);
      doc.setDrawColor(60, 66, 76); doc.setLineWidth(0.4);
      doc.rect(W - M - 54, y, 16, 8);
      doc.rect(W - M - 26, y, 12, 8);
      y += 11;
    });
    y += 2;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 66, 76);
    doc.text("Opmerkingen:", x, y);
    doc.setDrawColor(200, 205, 212); doc.setLineWidth(0.3);
    doc.line(x + 24, y + 0.5, W - M - 6, y + 0.5);
    doc.line(x, y + 7, W - M - 6, y + 7);
    y += 15;
    doc.text("Handtekening scheidsrechter:", x, y);
    doc.line(x + 50, y + 0.5, W - M - 6, y + 0.5);
  });
  return doc;
}
