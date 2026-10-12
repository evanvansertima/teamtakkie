/* ══════════════════════════════════════════════════════════════
   SCHERMEN: presentatie van een toernooi — dia's op een groot scherm
   ─────────────────────────────────────────────────────────────
   Wens van Evan (12 oktober 2026): een mooiere tv-weergave, en zelf
   dia's maken met wedstrijden, programma, stand, laatst gespeeld,
   sponsors, grote tekst, kleedkamers, video en afbeeldingen; meerdere
   blokken op één dia; per dia een duur in seconden (standaard 8). Het
   rekenwerk staat in src/domein/presentatie.js.

   Hier:
     · PresentatieScherm — de tv-weergave. Altijd een vlak van 1920 x
       1080 dat passend wordt geschaald: zo is het voorbeeld in de app
       precies wat er op de tv staat, en past het op elk scherm.
     · LokalePresentatie — "Start presentatie op dit apparaat" (een
       laptop aan de tv): leest het toernooi elke tien seconden opnieuw.
     · MateriaalKaart en DiasKaart — het invullen in stap 6.
     · De opslag van afbeeldingen in de browser (IndexedDB).

   WAAROM AFBEELDINGEN IN INDEXEDDB EN NIET IN HET TOERNOOI
   Het toernooi staat in localStorage en gaat mee met synchroniseren.
   localStorage houdt bij ongeveer 5 MB op, en dan werkt niets meer —
   ook de rest van de app niet. Een paar foto's zijn al genoeg. In
   IndexedDB is ruimte genoeg; in het toernooi staat alleen een
   verwijzing (id, naam). Bij publiceren gaan de afbeeldingen apart
   naar de server (server/25-toernooi-media.sql), zodat de tv-link ze
   ook heeft.

   VIDEO ALLEEN VIA EEN LINK
   YouTube, Vimeo of een directe videolink (videoBron in het domein).
   Video's zelf opslaan zou opslag en dataverkeer kosten; zie de
   geheugenregel "geen kosten per gebruik".
   ══════════════════════════════════════════════════════════════ */

/* ── Afbeeldingen in de browser ─────────────────────────────── */
var _mediaDb = null;
function mediaDb() {
  if (_mediaDb) return _mediaDb;
  _mediaDb = new Promise(function (ok, nee) {
    try {
      var r = indexedDB.open("teamtakkie-media", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("media", { keyPath: "id" }); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { nee(r.error); };
    } catch (e) { nee(e); }
  });
  return _mediaDb;
}
function mediaBewaar(id, data) {
  return mediaDb().then(function (db) {
    return new Promise(function (ok, nee) {
      var tx = db.transaction("media", "readwrite");
      tx.objectStore("media").put({ id: id, data: data, op: Date.now() });
      tx.oncomplete = function () { ok(true); };
      tx.onerror = function () { nee(tx.error); };
    });
  });
}
/* Geeft {id: data} voor de ids die er zijn; ontbrekende ontbreken. */
function mediaLees(ids) {
  if (!ids.length) return Promise.resolve({});
  return mediaDb().then(function (db) {
    return new Promise(function (ok) {
      var uit = {}, tx = db.transaction("media", "readonly"), st = tx.objectStore("media");
      ids.forEach(function (id) { var r = st.get(id); r.onsuccess = function () { if (r.result) uit[id] = r.result.data; }; });
      tx.oncomplete = function () { ok(uit); };
      tx.onerror = function () { ok(uit); };
    });
  }).catch(function () { return {}; });
}
function mediaWeg(id) {
  return mediaDb().then(function (db) { db.transaction("media", "readwrite").objectStore("media").delete(id); }).catch(function () {});
}
/* Een gekozen bestand verkleinen tot een data-url. Foto's als jpeg
   (klein), logo's als png (doorzichtig blijft doorzichtig). */
function verkleinVoorDia(bestand, maxZijde, logo) {
  return new Promise(function (ok, nee) {
    if (!bestand || !/^image\//.test(bestand.type)) { nee(new Error("Kies een afbeelding (jpg of png).")); return; }
    var lezer = new FileReader();
    lezer.onerror = function () { nee(new Error("Het bestand kon niet worden gelezen.")); };
    lezer.onload = function () {
      var img = new Image();
      img.onerror = function () { nee(new Error("Dit bestand is geen afbeelding die de browser kan tonen.")); };
      img.onload = function () {
        var f = Math.min(1, maxZijde / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * f)); c.height = Math.max(1, Math.round(img.naturalHeight * f));
        var ctx = c.getContext("2d");
        if (!logo) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        ok(logo ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.82));
      };
      img.src = lezer.result;
    };
    lezer.readAsDataURL(bestand);
  });
}
/* Alle afbeeldingen die bij dit toernooi horen, uit de browser. */
function useToernooiMedia(p) {
  var ids = nodigeMedia(p);
  const [media, setMedia] = useState({});
  var sleutel = ids.join(",");
  useEffect(function () { var weg = false; mediaLees(ids).then(function (m) { if (!weg) setMedia(m); }); return function () { weg = true; }; }, [sleutel]);
  return [media, function (id, data) { setMedia(function (m) { var n = Object.assign({}, m); if (data) n[id] = data; else delete n[id]; return n; }); }];
}

/* ── De tv-weergave ─────────────────────────────────────────── */
function presentatieKleuren(p) {
  var accent = (p && p.kleur) || "#0a5bd8";
  var thema = (p && p.thema) || "nacht";
  /* kleur = de gekozen clubkleur; accent = waar dit thema mee accentueert
     (bij Clubkleur is dat wit, want de achtergrond ís al de clubkleur).
     badge en tekstVlak: altijd leesbaar, ook als accent wit is. */
  var vast = { kleur: accent, badge: thema === "club" ? "#ffffff" : accent, badgeTekst: thema === "club" ? accent : "#ffffff",
               tekstVlak: thema === "club" ? "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(0,0,0,0.28) 100%)" : "linear-gradient(135deg," + accent + " 0%," + accent + "aa 100%)" };
  if (thema === "licht") return Object.assign(vast, { accent: accent, achter: "linear-gradient(160deg,#eef3f9 0%,#dfe7f1 100%)", tekst: "#13202f", zacht: "#5b6b7d",
    kaart: "#ffffff", kaartRand: "rgba(15,35,60,0.08)", rij: "rgba(15,35,60,0.05)", kop: accent, kopTekst: "#ffffff", schaduw: "0 18px 50px rgba(20,40,70,0.12)" });
  if (thema === "club") return Object.assign(vast, { accent: "#ffffff", achter: "radial-gradient(1200px 700px at 15% 0%, " + accent + "ee 0%, " + accent + " 45%, #0a0f1a 140%)", tekst: "#ffffff", zacht: "rgba(255,255,255,0.75)",
    kaart: "rgba(0,0,0,0.22)", kaartRand: "rgba(255,255,255,0.18)", rij: "rgba(255,255,255,0.08)", kop: "rgba(0,0,0,0.25)", kopTekst: "#ffffff", schaduw: "0 18px 50px rgba(0,0,0,0.25)" });
  return Object.assign(vast, { accent: accent, achter: "radial-gradient(1400px 800px at 85% -10%, " + accent + "55 0%, transparent 60%), linear-gradient(160deg,#08111f 0%,#0e1d33 60%,#0a1424 100%)",
    tekst: "#f3f7fc", zacht: "rgba(230,240,255,0.66)", kaart: "rgba(255,255,255,0.06)", kaartRand: "rgba(255,255,255,0.10)", rij: "rgba(255,255,255,0.05)",
    kop: accent, kopTekst: "#ffffff", schaduw: "0 18px 50px rgba(0,0,0,0.35)" });
}
function nuVoorDia() {
  var d = new Date();
  return { datum: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"), min: d.getHours() * 60 + d.getMinutes() };
}

/* Schaalt een vlak van 1920 x 1080 passend in zijn ouder. */
function Podium({ children, achter }) {
  const ref = useRef(null);
  const [schaal, setSchaal] = useState(0);
  useEffect(function () {
    function meet() { var el = ref.current; if (el) setSchaal(Math.min(el.clientWidth / 1920, el.clientHeight / 1080)); }
    meet();
    var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(meet) : null;
    if (ro && ref.current) ro.observe(ref.current);
    window.addEventListener("resize", meet);
    return function () { if (ro) ro.disconnect(); window.removeEventListener("resize", meet); };
  }, []);
  return (
    <div ref={ref} style={{position:"absolute",inset:0,overflow:"hidden",background:"#05080f",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {schaal > 0 && (
        <div style={{width:1920,height:1080,flexShrink:0,transform:"scale(" + schaal + ")",transformOrigin:"center center",position:"relative",background:achter,overflow:"hidden"}}>
          {children}
        </div>
      )}
    </div>
  );
}

/* Eén dia, zonder klok of wisselen: voor het voorbeeld in de app en als
   onderdeel van de echte weergave. */
function DiaInhoud({ t, dia, media, k, voorbeeld }) {
  var p = t.presentatie || {};
  var nu = nuVoorDia();
  var blokken = (dia.blokken || []).slice(0, DIA_MAX_BLOKKEN);
  var ind = diaIndeling(blokken.length);
  return (
    <div style={{position:"absolute",left:56,right:56,top:150,bottom:96,display:"grid",gridTemplateColumns:ind.kolommen,gridTemplateRows:ind.rijen,gap:32}}>
      {blokken.length === 0 && <div style={{gridArea:"1 / 1 / 2 / 2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,color:k.zacht}}>Deze dia is nog leeg</div>}
      {blokken.map(function (b, i) {
        /* Hoe groot is dit blok? Bepaalt lettergrootte en hoeveel regels er passen. */
        var groot = blokken.length === 1 ? "heel" : (blokken.length === 2 || (blokken.length === 3 && i === 0)) ? "hoog" : "klein";
        return (
          <div key={b.id || i} style={{gridArea:ind.plekken[i],minWidth:0,minHeight:0}}>
            <DiaBlok t={t} blok={b} media={media} k={k} groot={groot} nu={nu} voorbeeld={voorbeeld} />
          </div>
        );
      })}
    </div>
  );
}

function DiaKop({ t, dia, k, klok }) {
  var p = t.presentatie || {};
  return (
    <div style={{position:"absolute",left:0,right:0,top:0,height:120,display:"flex",alignItems:"center",gap:28,padding:"0 56px",
      background:k.kop === k.accent ? "linear-gradient(90deg," + k.accent + " 0%," + k.accent + "cc 100%)" : k.kop,color:k.kopTekst,boxShadow:"0 6px 30px rgba(0,0,0,0.25)"}}>
      {p.logo && <img src={p.logo} alt="" style={{height:84,maxWidth:160,objectFit:"contain",background:"#fff",borderRadius:18,padding:8}} />}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:48,fontWeight:800,letterSpacing:"-0.02em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.1}}>{t.naam}</div>
        <div style={{fontSize:26,opacity:0.85,marginTop:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{dia ? dia.naam : ""}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14,fontSize:26,fontWeight:700,opacity:0.95}}>
        <span style={{width:16,height:16,borderRadius:8,background:"#ff4d4f",boxShadow:"0 0 0 6px rgba(255,77,79,0.25)"}}/> LIVE
      </div>
      <div style={{fontSize:60,fontWeight:800,fontVariantNumeric:"tabular-nums",minWidth:180,textAlign:"right"}}>{klok}</div>
    </div>
  );
}

/* De echte weergave: dia's achter elkaar, elk zo lang als ingesteld,
   met een voortgangsbalk. Een mededeling loopt onderin mee. */
function PresentatieScherm({ t, media, onSluiten }) {
  var p = t.presentatie || {};
  var k = presentatieKleuren(p);
  var dias = actieveDias(t);
  const [i, setI] = useState(0);
  const [klok, setKlok] = useState(function () { return new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }); });
  var huidig = dias.length ? dias[i % dias.length] : null;
  var duur = huidig ? diaDuur(huidig.duur) : 8;
  useEffect(function () {
    if (!dias.length) return;
    var h = setTimeout(function () { setI(function (x) { return (x + 1) % Math.max(1, dias.length); }); }, duur * 1000);
    return function () { clearTimeout(h); };
  }, [i, dias.length, duur]);
  useEffect(function () {
    var h = setInterval(function () { setKlok(new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })); }, 15000);
    return function () { clearInterval(h); };
  }, []);
  var rustig = false;
  try { rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  return (
    <Podium achter={k.achter}>
      <style>{"@keyframes ttDiaIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes ttBalk{from{width:0}to{width:100%}}@keyframes ttLoop{from{transform:translateX(100%)}to{transform:translateX(-100%)}}"}</style>
      <DiaKop t={t} dia={huidig} k={k} klok={klok} />
      {huidig
        ? <div key={huidig.id + ":" + i} style={{position:"absolute",inset:0,animation:rustig ? "none" : "ttDiaIn .7s ease both"}}>
            <DiaInhoud t={t} dia={huidig} media={media} k={k} />
          </div>
        : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:56,color:k.zacht}}>{"Er staan geen dia's aan"}</div>}
      <div style={{position:"absolute",left:0,right:0,bottom:0,height:72,display:"flex",alignItems:"center",gap:24,padding:"0 56px",color:k.zacht,fontSize:22}}>
        <div style={{display:"flex",gap:10}}>
          {dias.map(function (d, j) { return <span key={d.id || j} style={{width:j === i % dias.length ? 44 : 14,height:14,borderRadius:7,background:j === i % dias.length ? k.accent : k.kaartRand,transition:"width .4s"}}/>; })}
        </div>
        <div style={{flex:1,overflow:"hidden",whiteSpace:"nowrap",fontSize:28,fontWeight:700,color:k.tekst}}>
          {p.mededeling && <div style={{display:"inline-block",animation:rustig ? "none" : "ttLoop 22s linear infinite"}}>{"📣  " + p.mededeling}</div>}
        </div>
        <div style={{fontWeight:700,letterSpacing:2,fontSize:18,opacity:0.7}}>TEAMTAKKIE</div>
      </div>
      {huidig && <div key={"balk" + i} style={{position:"absolute",left:0,bottom:0,height:8,background:k.accent,animation:"ttBalk " + duur + "s linear both"}}/>}
      {onSluiten && <SluitKnop onSluiten={onSluiten} />}
    </Podium>
  );
}
/* Alleen zichtbaar als je de muis beweegt: op de tv staat er niets. */
function SluitKnop({ onSluiten }) {
  const [zichtbaar, setZichtbaar] = useState(true);
  useEffect(function () {
    var h = setTimeout(function () { setZichtbaar(false); }, 3000);
    function beweeg() { setZichtbaar(true); clearTimeout(h); h = setTimeout(function () { setZichtbaar(false); }, 3000); }
    function toets(e) { if (e.key === "Escape") onSluiten(); }
    window.addEventListener("mousemove", beweeg); window.addEventListener("touchstart", beweeg); window.addEventListener("keydown", toets);
    return function () { clearTimeout(h); window.removeEventListener("mousemove", beweeg); window.removeEventListener("touchstart", beweeg); window.removeEventListener("keydown", toets); };
  }, []);
  return (
    <button onClick={onSluiten} style={{position:"absolute",top:150,right:56,zIndex:5,opacity:zichtbaar ? 1 : 0,transition:"opacity .3s",
      background:"rgba(0,0,0,0.6)",color:"#fff",border:0,borderRadius:16,padding:"16px 26px",fontSize:26,cursor:"pointer"}}>
      <i className="fa-solid fa-xmark"/> Sluiten (Esc)</button>
  );
}

function BlokKader({ titel, k, children, geenKader }) {
  if (geenKader) return <div style={{height:"100%",position:"relative"}}>{children}</div>;
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:k.kaart,border:"1px solid " + k.kaartRand,borderRadius:28,boxShadow:k.schaduw,overflow:"hidden",color:k.tekst}}>
      {titel && <div style={{padding:"20px 30px 14px",fontSize:30,fontWeight:800,letterSpacing:"0.02em",textTransform:"uppercase",color:k.tekst,display:"flex",alignItems:"center",gap:14}}>
        <span style={{width:10,height:30,borderRadius:5,background:k.accent}}/>{titel}</div>}
      <div style={{flex:1,minHeight:0,padding:"0 30px 24px",position:"relative"}}>{children}</div>
    </div>
  );
}

function DiaBlok({ t, blok, media, k, groot, nu, voorbeeld }) {
  var g = blokGegevens(t, blok, nu);
  var f = groot === "heel" ? 1 : groot === "hoog" ? 0.82 : 0.66;
  var maxRijen = groot === "klein" ? 5 : groot === "hoog" ? 10 : 10;
  if (blok.soort === "wedstrijden" || blok.soort === "programma" || blok.soort === "uitslagen") {
    var rijen = g.rijen.slice(0, maxRijen);
    /* Weinig regels? Dan mogen ze groter: een halflege kaart leest slecht
       vanaf de andere kant van de kantine. */
    var vul = rijen.length ? Math.min(1.4, Math.max(1, (maxRijen * 0.8) / rijen.length)) : 1;
    f = f * vul;
    return (
      <BlokKader titel={g.titel} k={k}>
        {rijen.length === 0 && <div style={{fontSize:34 * f,color:k.zacht,padding:"20px 0"}}>{blok.soort === "uitslagen" ? "Nog geen uitslagen" : "Geen wedstrijden"}</div>}
        {rijen.map(function (r) {
          return (
            <div key={r.nummer} style={{display:"flex",alignItems:"center",gap:22 * f,padding:(12 * f) + "px " + (16 * f) + "px",marginBottom:8 * f,borderRadius:16 * f,
              background:r.bezig ? k.accent + "33" : k.rij,border:r.bezig ? "2px solid " + k.accent : "2px solid transparent"}}>
              <span style={{width:110 * f,fontSize:36 * f,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{r.tijd}</span>
              <span style={{flex:1,minWidth:0,fontSize:36 * f,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {r.thuis}<span style={{color:k.zacht,fontWeight:400}}>{"  –  "}</span>{r.uit}</span>
              {r.uitslag
                ? <span style={{fontSize:40 * f,fontWeight:900,fontVariantNumeric:"tabular-nums",background:k.badge,color:k.badgeTekst,borderRadius:12 * f,padding:(4 * f) + "px " + (16 * f) + "px"}}>{r.uitslag.replace("-", " – ")}</span>
                : <span style={{fontSize:26 * f,color:r.bezig ? k.tekst : k.zacht,fontWeight:r.bezig ? 800 : 500,whiteSpace:"nowrap"}}>{r.bezig ? "● BEZIG · " + r.veld : r.veld}</span>}
            </div>
          );
        })}
        {(g.meer > 0 || g.rijen.length > maxRijen) && <div style={{fontSize:24 * f,color:k.zacht,marginTop:6}}>{"… en nog " + (g.meer + Math.max(0, g.rijen.length - maxRijen))}</div>}
      </BlokKader>
    );
  }
  if (blok.soort === "stand") {
    var n = g.poules.length;
    /* Twee poules naast elkaar alleen op een volle dia: in een half blok
       is daar geen ruimte voor de teamnamen. */
    var kol = n > 1 && groot === "heel" ? 2 : 1;
    /* Lettergrootte uit de beschikbare hoogte: per poule een kopje (~70 px
       bij grootte 1) en per team een regel (~56 px). Zo vult één poule van
       vier het blok, en passen er twee onder elkaar in een half blok. */
    var zichtbaar = Math.min(n, groot === "klein" ? 1 : 4);
    var onder = Math.ceil(zichtbaar / kol);
    var regels = Math.ceil(g.poules.slice(0, zichtbaar).reduce(function (som, pl) { return som + Math.min(8, pl.rijen.length); }, 0) / kol);
    /* En uit de breedte: de cijferkolommen nemen ~380 px (bij grootte 1)
       en een teamnaam heeft ~330 px nodig om niet afgekapt te worden. */
    var hoogte = groot === "klein" ? 250 : 720;
    var breedte = ((groot === "heel" ? 1748 : 828) - (kol - 1) * 24) / kol;
    var pf = Math.max(0.5, Math.min(1.5, hoogte / (85 * onder + 64 * Math.max(1, regels)), breedte / 712));
    return (
      <BlokKader titel={g.titel} k={k}>
        {n === 0 && <div style={{fontSize:34 * f,color:k.zacht}}>Nog geen poules</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(" + kol + ",minmax(0,1fr))",gap:24 * f}}>
          {g.poules.slice(0, groot === "klein" ? 1 : 4).map(function (pl, j) {
            return (
              <div key={j}>
                {n > 1 && <div style={{fontSize:28 * pf,fontWeight:800,margin:"4px 0 8px",color:k.accent === "#ffffff" ? k.tekst : k.accent}}>{pl.naam}</div>}
                <div style={{display:"flex",fontSize:22 * pf,color:k.zacht,padding:"0 " + (12 * pf) + "px 6px",fontWeight:700}}>
                  <span style={{width:46 * pf}}>#</span><span style={{flex:1}}>Team</span>
                  {["G", "W", "GL", "V", "DS", "P"].map(function (h) { return <span key={h} style={{width:56 * pf,textAlign:"center"}}>{h}</span>; })}
                </div>
                {pl.rijen.slice(0, 8).map(function (r) {
                  var door = r.plek <= pl.doorPerPoule;
                  return (
                    <div key={r.teamId} style={{display:"flex",alignItems:"center",fontSize:30 * pf,padding:(9 * pf) + "px " + (12 * pf) + "px",marginBottom:6 * pf,borderRadius:12 * pf,background:k.rij}}>
                      <span style={{width:46 * pf}}><span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36 * pf,height:36 * pf,borderRadius:10 * pf,
                        fontWeight:800,fontSize:22 * pf,background:door ? "#1fbf75" : k.kaartRand,color:door ? "#fff" : k.tekst}}>{r.plek}</span></span>
                      <span style={{flex:1,minWidth:0,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.naam}</span>
                      {[r.gespeeld, r.winst, r.gelijk, r.verlies, (r.saldo > 0 ? "+" : "") + r.saldo].map(function (v, x) { return <span key={x} style={{width:56 * pf,textAlign:"center",color:k.zacht,fontVariantNumeric:"tabular-nums"}}>{v}</span>; })}
                      <span style={{width:56 * pf,textAlign:"center",fontWeight:900,fontVariantNumeric:"tabular-nums"}}>{r.punten}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </BlokKader>
    );
  }
  if (blok.soort === "knockout") {
    return (
      <BlokKader titel={g.titel} k={k}>
        {g.kampioen && <div style={{fontSize:44 * f,fontWeight:900,marginBottom:16 * f,display:"flex",alignItems:"center",gap:16}}>🏆 <span>{"Winnaar: " + g.kampioen}</span></div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(" + Math.max(1, g.rondes.length) + ",minmax(0,1fr))",gap:22 * f,height:g.kampioen ? "calc(100% - " + (70 * f) + "px)" : "100%"}}>
          {g.rondes.map(function (r, j) {
            return (
              <div key={j} style={{display:"flex",flexDirection:"column",justifyContent:"space-around",gap:12 * f,minWidth:0}}>
                <div style={{fontSize:24 * f,fontWeight:800,color:k.zacht,textTransform:"uppercase",letterSpacing:1}}>{r.naam}</div>
                {r.wedstrijden.map(function (w) {
                  return (
                    <div key={w.nummer} style={{background:k.rij,borderRadius:14 * f,padding:(10 * f) + "px " + (14 * f) + "px",borderLeft:"6px solid " + k.accent}}>
                      {["thuis", "uit"].map(function (kant) {
                        return (
                          <div key={kant} style={{display:"flex",gap:10,fontSize:28 * f,fontWeight:w.winnaar === kant ? 900 : 500,opacity:w.winnaar && w.winnaar !== kant ? 0.55 : 1}}>
                            <span style={{flex:1,minWidth:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w[kant]}</span>
                            <span style={{fontVariantNumeric:"tabular-nums"}}>{w.uitslag ? w.uitslag[kant] : ""}</span>
                          </div>
                        );
                      })}
                      {!w.uitslag && w.tijd && <div style={{fontSize:20 * f,color:k.zacht}}>{w.tijd}</div>}
                      {w.strafschoppen && <div style={{fontSize:20 * f,color:k.zacht}}>{"n.s. " + w.strafschoppen.thuis + "–" + w.strafschoppen.uit}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </BlokKader>
    );
  }
  if (blok.soort === "sponsors") {
    var sp = g.sponsors;
    var kolS = sp.length <= 2 ? sp.length || 1 : sp.length <= 4 ? 2 : sp.length <= 9 ? 3 : 4;
    if (groot === "klein") kolS = Math.min(kolS, 3);
    return (
      <BlokKader titel={g.titel} k={k}>
        {sp.length === 0 && <div style={{fontSize:34 * f,color:k.zacht}}>Nog geen sponsors ingevuld</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(" + kolS + ",minmax(0,1fr))",gap:24 * f,height:"100%",alignContent:"center"}}>
          {sp.map(function (s) {
            var logo = s.logoId && media && media[s.logoId];
            return (
              <div key={s.id} style={{background:"#ffffff",borderRadius:20 * f,padding:18 * f,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:140 * f,boxShadow:"0 8px 24px rgba(0,0,0,0.15)"}}>
                {logo ? <img src={logo} alt={s.naam} style={{maxWidth:"100%",maxHeight:150 * f,objectFit:"contain"}} />
                      : <div style={{fontSize:38 * f,fontWeight:900,color:"#13202f",textAlign:"center"}}>{s.naam}</div>}
                {logo && <div style={{fontSize:20 * f,color:"#5b6b7d",marginTop:8 * f,textAlign:"center"}}>{s.naam}</div>}
              </div>
            );
          })}
        </div>
      </BlokKader>
    );
  }
  if (blok.soort === "tekst") {
    var lang = g.tekst.length;
    var tf = f * (lang > 40 ? 0.55 : lang > 20 ? 0.75 : 1);
    return (
      <BlokKader k={k} geenKader>
        <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",
          background:k.tekstVlak,border:"1px solid " + k.kaartRand,borderRadius:28,boxShadow:k.schaduw,color:"#fff",padding:40 * f}}>
          <div style={{fontSize:150 * tf,fontWeight:900,lineHeight:1,letterSpacing:"-0.02em",textTransform:"uppercase",textShadow:"0 8px 30px rgba(0,0,0,0.3)",wordBreak:"break-word"}}>{g.tekst}</div>
          {g.ondertekst && <div style={{fontSize:52 * f,fontWeight:600,marginTop:24 * f,opacity:0.92}}>{g.ondertekst}</div>}
        </div>
      </BlokKader>
    );
  }
  if (blok.soort === "kleedkamers") {
    var kamers = g.kamers;
    var kolK = groot === "klein" ? 2 : kamers.length <= 4 ? 2 : kamers.length <= 9 ? 3 : 4;
    return (
      <BlokKader titel={g.titel} k={k}>
        {kamers.length === 0 && <div style={{fontSize:34 * f,color:k.zacht}}>Nog geen kleedkamers ingevuld</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(" + kolK + ",minmax(0,1fr))",gap:18 * f}}>
          {kamers.map(function (km, j) {
            return (
              <div key={j} style={{background:k.rij,borderRadius:18 * f,padding:(16 * f) + "px " + (20 * f) + "px",borderTop:"6px solid " + k.accent}}>
                <div style={{fontSize:32 * f,fontWeight:900}}>{km.naam}</div>
                {km.tijd && <div style={{fontSize:22 * f,color:k.zacht,marginBottom:6}}>{km.tijd}</div>}
                {km.teams.map(function (n, x) { return <div key={x} style={{fontSize:28 * f,fontWeight:600,lineHeight:1.35}}>{n}</div>; })}
                {km.opmerking && <div style={{fontSize:20 * f,color:k.zacht,marginTop:6}}>{km.opmerking}</div>}
              </div>
            );
          })}
        </div>
      </BlokKader>
    );
  }
  if (blok.soort === "afbeelding") {
    var data = g.media && media && media[g.media.id];
    return (
      <BlokKader k={k} geenKader>
        <div style={{height:"100%",borderRadius:28,overflow:"hidden",boxShadow:k.schaduw,background:"#000",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {data ? <img src={data} alt={g.titel} style={{width:"100%",height:"100%",objectFit:g.passend === "passen" ? "contain" : "cover"}} />
                : <div style={{fontSize:30 * f,color:"#aab",textAlign:"center",padding:30}}>{g.media ? "Afbeelding staat op een ander apparaat of is nog niet gepubliceerd" : "Kies een afbeelding"}</div>}
        </div>
      </BlokKader>
    );
  }
  if (blok.soort === "video") {
    var v = g.video;
    var bron = !v ? null : v.soort === "youtube" ? "https://www.youtube-nocookie.com/embed/" + v.id + "?autoplay=1&mute=1&controls=0&loop=1&playlist=" + v.id + "&modestbranding=1&rel=0&playsinline=1"
      : v.soort === "vimeo" ? "https://player.vimeo.com/video/" + v.id + "?autoplay=1&muted=1&loop=1&background=1" : v.url;
    return (
      <BlokKader k={k} geenKader>
        <div style={{height:"100%",borderRadius:28,overflow:"hidden",boxShadow:k.schaduw,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",color:"#ccd",fontSize:30 * f}}>
          {!v ? "Kies een video" :
           voorbeeld ? <div style={{textAlign:"center"}}><i className="fa-solid fa-film" style={{fontSize:90 * f}}/><div style={{marginTop:12}}>{g.titel}</div></div> :
           v.soort === "bestand" ? <video src={bron} autoPlay muted loop playsInline style={{width:"100%",height:"100%",objectFit:"cover"}} /> :
           <iframe src={bron} title={g.titel} allow="autoplay; fullscreen" style={{width:"100%",height:"100%",border:0}} />}
        </div>
      </BlokKader>
    );
  }
  return <BlokKader titel={g.titel} k={k}>{null}</BlokKader>;
}

/* Een stilstaand voorbeeld van één dia, in een kader van 16:9. */
function DiaVoorbeeld({ t, dia, media, breed }) {
  var k = presentatieKleuren(t.presentatie || {});
  return (
    <div style={{position:"relative",width:breed || "100%",aspectRatio:"16 / 9",borderRadius:10,overflow:"hidden",flexShrink:0}}>
      <Podium achter={k.achter}>
        <DiaKop t={t} dia={dia} k={k} klok="12:00" />
        <DiaInhoud t={t} dia={dia} media={media} k={k} voorbeeld />
      </Podium>
    </div>
  );
}

/* "Start presentatie op dit apparaat": schermvullend, met het toernooi
   zoals het nu op dit apparaat staat (elke tien seconden opnieuw
   gelezen, zodat uitslagen van een ander apparaat meekomen na het
   synchroniseren). */
function LokalePresentatie({ toernooiId, onSluiten }) {
  function lees() { return (laadJson(TOERNOOIEN2_KEY) || []).filter(function (x) { return x.id === toernooiId; })[0] || null; }
  const [t, setT] = useState(lees);
  var p = (t && t.presentatie) || {};
  const [media] = useToernooiMedia(p);
  useEffect(function () {
    var h = setInterval(function () { var n = lees(); if (n) setT(n); }, 10000);
    try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {}); } catch (e) {}
    return function () {
      clearInterval(h);
      try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); } catch (e) {}
    };
  }, []);
  if (!t) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"#000"}}>
      <PresentatieScherm t={t} media={media} onSluiten={onSluiten} />
    </div>
  );
}

/* ═══ Invullen: materiaal ═══ */
function MateriaalKaart({ t, mag, wijzig, media, zetMedia }) {
  var p = t.presentatie || {};
  const [open, setOpen] = useState(null);
  function zetP(w) { wijzig(function (x) { return Object.assign({}, x, { presentatie: Object.assign({}, x.presentatie || {}, w) }); }); }
  function zetLijst(naam, maak) { wijzig(function (x) { var pp = x.presentatie || {}; var o = {}; o[naam] = maak(pp[naam] || []); return Object.assign({}, x, { presentatie: Object.assign({}, pp, o) }); }); }
  function kiesBestand(cb) {
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = function () { if (inp.files && inp.files[0]) cb(inp.files[0]); };
    inp.click();
  }
  function nieuweAfbeelding(bestand, logo, klaar) {
    verkleinVoorDia(bestand, logo ? 500 : 1920, logo).then(function (data) {
      var id = diaId("m");
      return mediaBewaar(id, data).then(function () { zetMedia(id, data); klaar(id); });
    }).catch(function (e) { meldFout((e && e.message) || "De afbeelding kon niet worden opgeslagen."); });
  }
  var afbeeldingen = (p.media || []).filter(function (m) { return m.soort === "afbeelding"; });
  var videos = (p.media || []).filter(function (m) { return m.soort === "video"; });
  function kop(id, icoon, titel, aantal) {
    return (
      <button onClick={function () { setOpen(open === id ? null : id); }} aria-expanded={open === id}
        style={{display:"flex",width:"100%",alignItems:"center",gap:10,background:"none",border:0,borderBottom:"1px solid var(--grijs)",padding:"12px 0",cursor:"pointer",color:"inherit",textAlign:"left"}}>
        <i className={icoon} style={{width:20,color:"var(--blauw)"}}/>
        <span style={{flex:1,fontWeight:700,fontSize:14}}>{titel}</span>
        <span style={{fontSize:12,color:"var(--grijs-donker)"}}>{aantal}</span>
        <i className={"fa-solid fa-chevron-" + (open === id ? "up" : "down")} style={{color:"var(--grijs-donker)"}}/>
      </button>
    );
  }
  return (
    <div className="kaart">
      <div className="kaart-titel"><i className="fa-solid fa-box-open"/>{" Materiaal voor de dia's"}</div>
      <p style={{fontSize:12.5,color:"var(--grijs-donker)",margin:"0 0 4px",lineHeight:1.5}}>{"Vul dit eerst in. Bij de dia's kies je daarna wat je laat zien."}</p>

      {kop("sponsors", "fa-solid fa-handshake", "Sponsors", (p.sponsors || []).length)}
      {open === "sponsors" && (
        <div style={{padding:"10px 0"}}>
          {(p.sponsors || []).map(function (s) {
            var logo = s.logoId && media[s.logoId];
            return (
              <div key={s.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <button onClick={function () { if (mag) kiesBestand(function (b) { nieuweAfbeelding(b, true, function (id) { zetLijst("sponsors", function (l) { return l.map(function (y) { return y.id === s.id ? Object.assign({}, y, { logoId: id }) : y; }); }); }); }); }}
                  aria-label={"Logo van " + s.naam} style={{width:64,height:44,flexShrink:0,borderRadius:8,border:"1px dashed var(--grijs)",background:"#fff",cursor:mag ? "pointer" : "default",padding:2}}>
                  {logo ? <img src={logo} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} /> : <i className="fa-solid fa-image" style={{color:"var(--grijs-donker)"}}/>}
                </button>
                <TVeld waarde={s.naam} disabled={!mag} style={{flex:1,marginBottom:0}} aria-label="Naam van de sponsor"
                  opKlaar={function (v) { if (v.trim()) zetLijst("sponsors", function (l) { return l.map(function (y) { return y.id === s.id ? Object.assign({}, y, { naam: v.trim() }) : y; }); }); }} />
                {mag && <button className="knop lijn klein" aria-label="Sponsor weghalen" onClick={function () {
                  if (s.logoId) mediaWeg(s.logoId);
                  zetLijst("sponsors", function (l) { return l.filter(function (y) { return y.id !== s.id; }); });
                }}><i className="fa-solid fa-xmark"/></button>}
              </div>
            );
          })}
          {mag && <button className="knop lijn klein" onClick={function () { zetLijst("sponsors", function (l) { return l.concat([{ id: diaId("s"), naam: "Sponsor " + (l.length + 1), logoId: "" }]); }); }}>+ Sponsor</button>}
          <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"6px 0 0"}}>Tik op het vakje links om een logo te kiezen.</p>
        </div>
      )}

      {kop("kleedkamers", "fa-solid fa-door-open", "Kleedkamerindeling", (p.kleedkamers || []).length)}
      {open === "kleedkamers" && (
        <div style={{padding:"10px 0"}}>
          {(p.kleedkamers || []).map(function (km) {
            function zetK(w) { zetLijst("kleedkamers", function (l) { return l.map(function (y) { return y.id === km.id ? Object.assign({}, y, w) : y; }); }); }
            return (
              <div key={km.id} style={{border:"1px solid var(--grijs)",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
                <div style={{display:"flex",gap:8,marginBottom:6}}>
                  <TVeld waarde={km.naam} disabled={!mag} style={{flex:1,marginBottom:0}} aria-label="Naam van de kleedkamer" opKlaar={function (v) { if (v.trim()) zetK({ naam: v.trim() }); }} />
                  <TVeld waarde={km.tijd || ""} disabled={!mag} placeholder="Tijd, bijv. 9:00–12:00" style={{width:150,marginBottom:0}} aria-label="Tijd" opKlaar={function (v) { zetK({ tijd: v.trim() }); }} />
                  {mag && <button className="knop lijn klein" aria-label="Kleedkamer weghalen" onClick={function () { zetLijst("kleedkamers", function (l) { return l.filter(function (y) { return y.id !== km.id; }); }); }}><i className="fa-solid fa-xmark"/></button>}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {t.deelnemers.map(function (d) {
                    var aan = (km.teams || []).indexOf(d.id) >= 0;
                    return <button key={d.id} className="filter-chip" disabled={!mag} style={Object.assign({padding:"3px 10px",fontSize:12}, chipStijl(aan))}
                      onClick={function () { zetK({ teams: aan ? km.teams.filter(function (x) { return x !== d.id; }) : (km.teams || []).concat([d.id]) }); }}>{d.naam}</button>;
                  })}
                </div>
                <TVeld waarde={km.opmerking || ""} disabled={!mag} placeholder="Opmerking (optioneel), bijv. douchen na de finale" style={{marginTop:6,marginBottom:0}} aria-label="Opmerking" opKlaar={function (v) { zetK({ opmerking: v.trim() }); }} />
              </div>
            );
          })}
          {mag && <button className="knop lijn klein" onClick={function () { zetLijst("kleedkamers", function (l) { return l.concat([{ id: diaId("k"), naam: "Kleedkamer " + (l.length + 1), teams: [], tijd: "", opmerking: "" }]); }); }}>+ Kleedkamer</button>}
        </div>
      )}

      {kop("afbeeldingen", "fa-solid fa-image", "Afbeeldingen", afbeeldingen.length)}
      {open === "afbeeldingen" && (
        <div style={{padding:"10px 0"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:8}}>
            {afbeeldingen.map(function (m) {
              return (
                <div key={m.id} style={{border:"1px solid var(--grijs)",borderRadius:10,overflow:"hidden"}}>
                  <div style={{aspectRatio:"16 / 9",background:"#111",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {media[m.id] ? <img src={media[m.id]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <span style={{fontSize:11,color:"#aaa",padding:6,textAlign:"center"}}>Staat op een ander apparaat</span>}
                  </div>
                  <div style={{display:"flex",gap:4,padding:4}}>
                    <TVeld waarde={m.naam} disabled={!mag} style={{flex:1,marginBottom:0,fontSize:12,padding:"4px 6px"}} aria-label="Naam van de afbeelding"
                      opKlaar={function (v) { if (v.trim()) zetLijst("media", function (l) { return l.map(function (y) { return y.id === m.id ? Object.assign({}, y, { naam: v.trim() }) : y; }); }); }} />
                    {mag && <button className="knop lijn klein" style={{padding:"4px 8px"}} aria-label="Afbeelding weghalen" onClick={function () {
                      mediaWeg(m.id); zetMedia(m.id, null);
                      zetLijst("media", function (l) { return l.filter(function (y) { return y.id !== m.id; }); });
                    }}><i className="fa-solid fa-xmark"/></button>}
                  </div>
                </div>
              );
            })}
          </div>
          {mag && <button className="knop lijn klein" onClick={function () {
            kiesBestand(function (b) { nieuweAfbeelding(b, false, function (id) {
              zetLijst("media", function (l) { return l.concat([{ id: id, soort: "afbeelding", naam: (b.name || "Afbeelding").replace(/\.[a-z0-9]+$/i, "").slice(0, 40) }]); });
            }); });
          }}>+ Afbeelding</button>}
          <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"6px 0 0"}}>Afbeeldingen worden verkleind en staan op dit apparaat. Bij publiceren gaan ze mee naar de tv-link.</p>
        </div>
      )}

      {kop("videos", "fa-solid fa-film", "Video's", videos.length)}
      {open === "videos" && (
        <div style={{padding:"10px 0"}}>
          {videos.map(function (m) {
            var goed = !!videoBron(m.url);
            function zetV(w) { zetLijst("media", function (l) { return l.map(function (y) { return y.id === m.id ? Object.assign({}, y, w) : y; }); }); }
            return (
              <div key={m.id} style={{marginBottom:10}}>
                <div style={{display:"flex",gap:8,marginBottom:4}}>
                  <TVeld waarde={m.naam} disabled={!mag} style={{flex:1,marginBottom:0}} aria-label="Naam van de video" opKlaar={function (v) { if (v.trim()) zetV({ naam: v.trim() }); }} />
                  {mag && <button className="knop lijn klein" aria-label="Video weghalen" onClick={function () { zetLijst("media", function (l) { return l.filter(function (y) { return y.id !== m.id; }); }); }}><i className="fa-solid fa-xmark"/></button>}
                </div>
                <TVeld waarde={m.url || ""} disabled={!mag} placeholder="https://www.youtube.com/watch?v=…" style={{marginBottom:2}} aria-label="Link naar de video" opKlaar={function (v) { zetV({ url: v.trim() }); }} />
                <div style={{fontSize:11,color:goed ? "var(--succes)" : "var(--gevaar)"}}>
                  {goed ? "✓ " + ({ youtube: "YouTube", vimeo: "Vimeo", bestand: "Videobestand" })[videoBron(m.url).soort] + "-video herkend" : "Plak een YouTube-, Vimeo- of directe videolink (https://…mp4)"}
                </div>
              </div>
            );
          })}
          {mag && <button className="knop lijn klein" onClick={function () { zetLijst("media", function (l) { return l.concat([{ id: diaId("m"), soort: "video", naam: "Video " + (videos.length + 1), url: "" }]); }); }}>+ Video</button>}
          <p style={{fontSize:11,color:"var(--grijs-donker)",margin:"6px 0 0"}}>{"Video's spelen zonder geluid, in een lus, zolang de dia in beeld is."}</p>
        </div>
      )}
    </div>
  );
}

/* ═══ Invullen: de dia-lijst ═══ */
function DiasKaart({ t, mag, wijzig, media, onStart }) {
  var p = t.presentatie || {};
  const [bewerk, setBewerk] = useState(null);
  var eigen = Array.isArray(p.dias);
  var dias = eigen ? p.dias : standaardDias(t);
  var aan = actieveDias(t);
  function zetDias(maak) {
    wijzig(function (x) { var pp = x.presentatie || {}; var huidig = Array.isArray(pp.dias) ? pp.dias : standaardDias(x); return Object.assign({}, x, { presentatie: Object.assign({}, pp, { dias: maak(huidig) }) }); });
  }
  function schuif(i, r) { zetDias(function (l) { var n = l.slice(); var j = i + r; if (j < 0 || j >= n.length) return l; var x = n[i]; n[i] = n[j]; n[j] = x; return n; }); }
  var huidigeDia = bewerk && dias.filter(function (d) { return d.id === bewerk; })[0];
  return (
    <div className="kaart">
      <div className="kaart-titel"><i className="fa-solid fa-film"/>{" Dia's"}</div>
      <p style={{fontSize:12.5,color:"var(--grijs-donker)",margin:"0 0 10px",lineHeight:1.5}}>
        {(eigen ? "" : "Er draait een automatische set. Pas hem aan zoals je wilt. ") + aantalTekst(aan.length, "dia staat", "dia's staan") + " aan; één rondje duurt " + rondjeDuur(aan) + " seconden."}
      </p>
      <button className="knop" style={{width:"100%",justifyContent:"center",marginBottom:12}} onClick={onStart} disabled={!aan.length}>
        <i className="fa-solid fa-play"/> Start presentatie op dit apparaat</button>
      {dias.map(function (d, i) {
        var soorten = (d.blokken || []).map(function (b) { var s = BLOK_SOORTEN.filter(function (x) { return x.id === b.soort; })[0]; return s ? s.naam : b.soort; });
        return (
          <div key={d.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--grijs)",opacity:d.aan === false ? 0.55 : 1}}>
            <input type="checkbox" checked={d.aan !== false} disabled={!mag} aria-label={"Dia " + d.naam + " laten zien"}
              onChange={function (e) { var v = e.target.checked; zetDias(function (l) { return l.map(function (y) { return y.id === d.id ? Object.assign({}, y, { aan: v }) : y; }); }); }} />
            <div style={{width:120,flexShrink:0,cursor:"pointer"}} onClick={function () { if (mag) setBewerk(d.id); }}><DiaVoorbeeld t={t} dia={d} media={media} breed={120} /></div>
            <div style={{flex:1,minWidth:0,cursor:mag ? "pointer" : "default"}} onClick={function () { if (mag) setBewerk(d.id); }}>
              <div style={{fontWeight:700,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.naam}</div>
              <div style={{fontSize:11.5,color:"var(--grijs-donker)",lineHeight:1.4}}>{diaDuur(d.duur) + " s · " + (soorten.join(", ") || "leeg")}</div>
            </div>
            {mag && <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <button className="knop lijn klein" style={{padding:"2px 8px"}} aria-label="Omhoog" disabled={i === 0} onClick={function () { schuif(i, -1); }}><i className="fa-solid fa-chevron-up"/></button>
              <button className="knop lijn klein" style={{padding:"2px 8px"}} aria-label="Omlaag" disabled={i === dias.length - 1} onClick={function () { schuif(i, 1); }}><i className="fa-solid fa-chevron-down"/></button>
            </div>}
          </div>
        );
      })}
      {mag && (
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
          <button className="knop lijn klein" onClick={function () {
            var d = nieuweDia("Dia " + (dias.length + 1), []);
            zetDias(function (l) { return l.concat([d]); }); setBewerk(d.id);
          }}>+ Nieuwe dia</button>
          {eigen && <button className="knop lijn klein" onClick={function () {
            if (window.confirm("Alle eigen dia's vervangen door de automatische set?")) wijzig(function (x) { var pp = Object.assign({}, x.presentatie || {}); delete pp.dias; return Object.assign({}, x, { presentatie: pp }); });
          }}><i className="fa-solid fa-rotate-left"/> Terug naar de automatische set</button>}
        </div>
      )}
      {huidigeDia && <DiaBewerker t={t} dia={huidigeDia} media={media}
        opZet={function (w) { zetDias(function (l) { return l.map(function (y) { return y.id === huidigeDia.id ? Object.assign({}, y, w) : y; }); }); }}
        opWeg={function () { zetDias(function (l) { return l.filter(function (y) { return y.id !== huidigeDia.id; }); }); setBewerk(null); }}
        onSluiten={function () { setBewerk(null); }} />}
    </div>
  );
}

function DiaBewerker({ t, dia, media, opZet, opWeg, onSluiten }) {
  var p = t.presentatie || {};
  const [kiezen, setKiezen] = useState(dia.blokken.length === 0);
  function zetBlok(id, w) { opZet({ blokken: dia.blokken.map(function (b) { return b.id === id ? Object.assign({}, b, w) : b; }) }); }
  function schuifBlok(i, r) { var n = dia.blokken.slice(); var j = i + r; if (j < 0 || j >= n.length) return; var x = n[i]; n[i] = n[j]; n[j] = x; opZet({ blokken: n }); }
  var afbeeldingen = (p.media || []).filter(function (m) { return m.soort === "afbeelding"; });
  var videos = (p.media || []).filter(function (m) { return m.soort === "video"; });
  return (
    <div className="modal-overlay" style={{zIndex:500}} onClick={function (e) { if (e.target === e.currentTarget) onSluiten(); }}>
      <div className="modal-sheet" style={{maxWidth:760}}>
        <div className="modal-greep"/>
        <div className="modal-titel">Dia bewerken</div>
        <DiaVoorbeeld t={t} dia={dia} media={media} />
        <div className="formulier-rij" style={{marginTop:12}}>
          <div><label className="formulier-label">Naam (bovenin beeld)</label>
            <TVeld waarde={dia.naam} opKlaar={function (v) { if (v.trim()) opZet({ naam: v.trim() }); }} /></div>
          <div><label className="formulier-label">Hoe lang in beeld (seconden)</label>
            <GetalVeld className="formulier-input" min={DIA_MIN_DUUR} max={DIA_MAX_DUUR} leeg={DIA_STANDAARD_DUUR} waarde={dia.duur}
              opWaarde={function (n) { opZet({ duur: diaDuur(n) }); }} /></div>
        </div>
        <label className="formulier-label">{"Blokken op deze dia (" + dia.blokken.length + " van " + DIA_MAX_BLOKKEN + ")"}</label>
        {dia.blokken.map(function (b, i) {
          var soort = BLOK_SOORTEN.filter(function (x) { return x.id === b.soort; })[0] || { naam: b.soort, velden: [], icoon: "fa-solid fa-square" };
          var poules = [];
          t.stadia.forEach(function (s) { if (s.soort === "poule" && (!b.categorieId || s.categorieId === b.categorieId)) s.poules.forEach(function (pl) { poules.push({ id: pl.id, naam: (t.categorieen.length > 1 && !b.categorieId ? (t.categorieen.filter(function (c) { return c.id === s.categorieId; })[0] || {}).naam + " · " : "") + pl.naam }); }); });
          return (
            <div key={b.id} style={{border:"1px solid var(--grijs)",borderRadius:12,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:soort.velden.length ? 8 : 0}}>
                <i className={soort.icoon} style={{color:"var(--blauw)",width:18}}/>
                <span style={{flex:1,fontWeight:700}}>{soort.naam}</span>
                <button className="knop lijn klein" style={{padding:"2px 8px"}} aria-label="Blok naar voren" disabled={i === 0} onClick={function () { schuifBlok(i, -1); }}><i className="fa-solid fa-arrow-left"/></button>
                <button className="knop lijn klein" style={{padding:"2px 8px"}} aria-label="Blok naar achteren" disabled={i === dia.blokken.length - 1} onClick={function () { schuifBlok(i, 1); }}><i className="fa-solid fa-arrow-right"/></button>
                <button className="knop lijn klein" style={{padding:"2px 8px"}} aria-label="Blok weghalen" onClick={function () { opZet({ blokken: dia.blokken.filter(function (x) { return x.id !== b.id; }) }); }}><i className="fa-solid fa-xmark"/></button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
                {soort.velden.indexOf("categorie") >= 0 && t.categorieen.length > 1 && (
                  <select className="formulier-input" style={{marginBottom:0}} aria-label="Categorie" value={b.categorieId || ""} onChange={function (e) { zetBlok(b.id, { categorieId: e.target.value, pouleId: "" }); }}>
                    <option value="">Alle categorieën</option>
                    {t.categorieen.map(function (c) { return <option key={c.id} value={c.id}>{c.naam}</option>; })}
                  </select>
                )}
                {soort.velden.indexOf("dag") >= 0 && t.dagen.length > 1 && (
                  <select className="formulier-input" style={{marginBottom:0}} aria-label="Dag" value={b.dagId || ""} onChange={function (e) { zetBlok(b.id, { dagId: e.target.value }); }}>
                    <option value="">Alle dagen</option>
                    {t.dagen.map(function (d, j) { return <option key={d.id} value={d.id}>{d.datum ? formateerDatumKort(d.datum) : "Dag " + (j + 1)}</option>; })}
                  </select>
                )}
                {soort.velden.indexOf("aantal") >= 0 && (
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}>Hoeveel:
                    <GetalVeld className="formulier-input" style={{marginBottom:0,width:70}} min={1} max={20} leeg={6} waarde={b.aantal} opWaarde={function (n) { zetBlok(b.id, { aantal: n }); }} /></label>
                )}
                {soort.velden.indexOf("poule") >= 0 && poules.length > 1 && (
                  <select className="formulier-input" style={{marginBottom:0}} aria-label="Poule" value={b.pouleId || ""} onChange={function (e) { zetBlok(b.id, { pouleId: e.target.value }); }}>
                    <option value="">Alle poules</option>
                    {poules.map(function (pl) { return <option key={pl.id} value={pl.id}>{pl.naam}</option>; })}
                  </select>
                )}
                {soort.velden.indexOf("tekst") >= 0 && <TVeld waarde={b.tekst || ""} placeholder="Grote tekst, bijv. FINALE!" style={{marginBottom:0}} aria-label="Grote tekst" opKlaar={function (v) { zetBlok(b.id, { tekst: v }); }} />}
                {soort.velden.indexOf("ondertekst") >= 0 && <TVeld waarde={b.ondertekst || ""} placeholder="Kleinere tekst eronder (optioneel)" style={{marginBottom:0}} aria-label="Ondertekst" opKlaar={function (v) { zetBlok(b.id, { ondertekst: v }); }} />}
                {soort.velden.indexOf("afbeelding") >= 0 && (
                  afbeeldingen.length ? <>
                    <select className="formulier-input" style={{marginBottom:0}} aria-label="Afbeelding" value={b.mediaId || ""} onChange={function (e) { zetBlok(b.id, { mediaId: e.target.value }); }}>
                      <option value="">Kies een afbeelding</option>
                      {afbeeldingen.map(function (m) { return <option key={m.id} value={m.id}>{m.naam}</option>; })}
                    </select>
                    <select className="formulier-input" style={{marginBottom:0}} aria-label="Hoe passen" value={b.passend || "vullen"} onChange={function (e) { zetBlok(b.id, { passend: e.target.value }); }}>
                      <option value="vullen">Vlak vullen (randen vallen weg)</option>
                      <option value="passen">Helemaal tonen</option>
                    </select>
                  </> : <span style={{fontSize:12,color:"var(--oranje)"}}>Voeg eerst een afbeelding toe bij Materiaal.</span>
                )}
                {soort.velden.indexOf("video") >= 0 && (
                  videos.length ? <select className="formulier-input" style={{marginBottom:0}} aria-label="Video" value={b.mediaId || ""} onChange={function (e) { zetBlok(b.id, { mediaId: e.target.value }); }}>
                    <option value="">Kies een video</option>
                    {videos.map(function (m) { return <option key={m.id} value={m.id}>{m.naam}</option>; })}
                  </select> : <span style={{fontSize:12,color:"var(--oranje)"}}>Voeg eerst een video toe bij Materiaal.</span>
                )}
                {soort.velden.indexOf("sponsors") >= 0 && (
                  (p.sponsors || []).length ? <div style={{display:"flex",flexWrap:"wrap",gap:4,gridColumn:"1 / -1"}}>
                    <button className="filter-chip" style={Object.assign({padding:"3px 10px",fontSize:12}, chipStijl(!(b.sponsors || []).length))} onClick={function () { zetBlok(b.id, { sponsors: [] }); }}>Alle sponsors</button>
                    {p.sponsors.map(function (s) {
                      var aan = (b.sponsors || []).indexOf(s.id) >= 0;
                      return <button key={s.id} className="filter-chip" style={Object.assign({padding:"3px 10px",fontSize:12}, chipStijl(aan))}
                        onClick={function () { zetBlok(b.id, { sponsors: aan ? b.sponsors.filter(function (x) { return x !== s.id; }) : (b.sponsors || []).concat([s.id]) }); }}>{s.naam}</button>;
                    })}
                  </div> : <span style={{fontSize:12,color:"var(--oranje)"}}>Voeg eerst sponsors toe bij Materiaal.</span>
                )}
                {b.soort === "kleedkamers" && !(p.kleedkamers || []).length && <span style={{fontSize:12,color:"var(--oranje)"}}>Vul eerst de kleedkamers in bij Materiaal.</span>}
              </div>
            </div>
          );
        })}
        {dia.blokken.length < DIA_MAX_BLOKKEN && (kiezen ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:6,margin:"6px 0 10px"}}>
            {BLOK_SOORTEN.map(function (s) {
              return <button key={s.id} className="knop lijn klein" style={{justifyContent:"flex-start"}}
                onClick={function () { opZet({ blokken: dia.blokken.concat([nieuwBlok(s.id)]) }); setKiezen(false); }}><i className={s.icoon}/> {s.naam}</button>;
            })}
          </div>
        ) : <button className="knop lijn klein" style={{marginBottom:10}} onClick={function () { setKiezen(true); }}>+ Blok toevoegen</button>)}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button className="knop lijn" style={{color:"var(--gevaar)"}} onClick={function () { if (window.confirm("Deze dia weghalen?")) opWeg(); }}><i className="fa-solid fa-trash"/></button>
          <button className="knop" style={{flex:1,justifyContent:"center"}} onClick={onSluiten}><i className="fa-solid fa-check"/> Klaar</button>
        </div>
      </div>
    </div>
  );
}
