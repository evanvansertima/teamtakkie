import { useEffect, useRef, useState } from 'react'
import type { Speler } from '../lib/api'
import type { Elem, ElemType, Frame, Lijn, LijnType, Tekening } from '../lib/tekenbord/types'
import { LEGE_TEKENING } from '../lib/tekenbord/types'
import {
  afstandTotLijn,
  draaiAfstand,
  draaibaar,
  isMateriaal,
  isZone,
  LIJN_TOOLS,
  MATERIAAL,
  notitieOpmaak,
  perspectiefInfo,
  PERSPECTIEF_STANDEN,
  projecteerPerspectief,
  schermFactor,
  tekenelement,
  tekenlijn,
  tekenVeld,
  tussenStand,
  VELD_TYPEN,
  veldTypeInfo,
  zoneKleurInfo,
  ZONE_KLEUREN,
  zoneVormInfo,
  ZONE_VORMEN,
} from '../lib/tekenbord/render'
import { bewaarBestand, deelOfDownload, deelTekeningAlsPNG, exporteerAnimatieVideo, exporteerTekeningPDF, maakStappenStrook, type TekeningPdfInfo } from '../lib/tekenbord/export'
import { createPortal } from 'react-dom'

const ELEM_NAMEN: Record<string, string> = {
  speler: 'Speler',
  'speler-rood': 'Speler',
  bal: 'Bal',
  pion: 'Pion',
  goal: 'Doel',
  cirkel: 'Zone',
  notitie: 'Coachpunt',
  'zone-cirkel': 'Zone',
  'zone-vierkant': 'Zone',
  'zone-driehoek': 'Zone',
  dummy: 'Pop',
  ladder: 'Speedladder',
  hordje: 'Hordje',
  stok: 'Slalomstok',
  hoedje: 'Hoedje',
  minidoel: 'Klein doel',
  ring: 'Ring',
  mand: 'Ballenmand',
}

const RUGNUMMERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const LIJN_KNOPPEN: { t: LijnType; l: string }[] = [
  { t: 'looplijn', l: 'Loop' },
  { t: 'passlijn', l: 'Pas' },
  { t: 'schietlijn', l: 'Schot' },
  { t: 'dribbellijn', l: 'Drib' },
  { t: 'voorzetlijn', l: 'Voorzet' },
]

type Tool = 'verplaatsen' | 'gum' | 'notitie' | ElemType | LijnType

function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement, factor: number) {
  const r = canvas.getBoundingClientRect()
  const sx = canvas.width / r.width / factor
  const sy = canvas.height / r.height / factor
  const src = 'changedTouches' in e ? e.changedTouches[0] ?? (e as React.TouchEvent).touches[0] : (e as React.MouseEvent)
  return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy }
}

function vindElemIndex(x: number, y: number, huidigeElems: Elem[], mctx: CanvasRenderingContext2D | null) {
  for (let i = huidigeElems.length - 1; i >= 0; i--) {
    const el = huidigeElems[i]
    const dx = x - el.x,
      dy = y - el.y
    if (el.type === 'notitie') {
      if (!mctx) continue
      const kk = Math.max(0.4, Math.min(3, Number(el.schaal) || 1))
      const o = notitieOpmaak(mctx, el, kk)
      if (Math.abs(dx) <= o.b / 2 && Math.abs(dy) <= o.h / 2) return i
      continue
    }
    if (isZone(el.type)) {
      if (Math.abs(dx) <= (Number(el.b) || 70) / 2 && Math.abs(dy) <= (Number(el.h) || 70) / 2) return i
      continue
    }
    const hit =
      (el.type === 'cirkel' ? 32 : el.type === 'goal' ? 22 : el.type === 'ladder' ? 32 : el.type === 'minidoel' ? 20 : el.type === 'dummy' || el.type === 'stok' ? 16 : 17) *
      (Number(el.schaal) || 1)
    if (Math.sqrt(dx * dx + dy * dy) < hit) return i
  }
  return -1
}

export function TekenBord({
  value,
  onChange,
  pdfNaam,
  pdfInfo,
  spelers,
}: {
  value: Tekening | null | undefined
  onChange: (tekening: Tekening) => void
  pdfNaam?: string
  pdfInfo?: TekeningPdfInfo
  spelers?: Speler[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doekRef = useRef<HTMLDivElement>(null)
  const vlakRef = useRef<HTMLCanvasElement | null>(null)
  const slepenRef = useRef<{ idx: number; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const draaienRef = useRef<{ id: number } | null>(null)
  const animRef = useRef<{ frame: number | null } | null>(null)
  const afbrekenRef = useRef<(() => void) | null>(null)

  const [tool, setTool] = useState<Tool>('speler')
  const [spelNr, setSpelNr] = useState<number | string>(1)
  const [bezig, setBezig] = useState<{ x1: number; y1: number } | null>(null)
  const [muis, setMuis] = useState({ x: 290, y: 195 })
  const [veldType, setVeldType] = useState<string>(() => value?.veldType || 'heel-h')

  const [stappen, setStappen] = useState<Frame[]>(() => {
    if (value?.stappen?.length) return value.stappen
    return [{ id: 1, elems: value?.elems || [], lijnen: value?.lijnen || [] }]
  })
  const [stapIdx, setStapIdx] = useState(0)
  const [speelt, setSpeelt] = useState(false)
  const [snelheid, setSnelheid] = useState(1200)
  const [animStand, setAnimStand] = useState<{ elems: Elem[]; lijnen: Lijn[] } | null>(null)
  const [opname, setOpname] = useState<{ pct: number } | null>(null)
  const [filmKlaar, setFilmKlaar] = useState<{ naam: string; hoe: string; mb: string; blob: Blob } | null>(null)
  const [gekozenElem, setGekozenElem] = useState<number | null>(null)
  const [nieuwFormaat, setNieuwFormaat] = useState(0.55)
  const [zoneKleur, setZoneKleur] = useState('blauw')
  const [bochtKant, setBochtKant] = useState<1 | -1>(1)
  const [lijnNr, setLijnNr] = useState<number | null>(null)
  const [lijnDonker, setLijnDonker] = useState(false)
  const [zoneBezig, setZoneBezig] = useState<{ type: string; x: number; y: number; b: number; h: number } | null>(null)
  const [paneel, setPaneel] = useState<'materiaal' | 'zone' | 'spelers' | null>(null)
  const [spelerTeam, setSpelerTeam] = useState<'speler' | 'speler-rood'>('speler')
  const [spelerNaamKeuze, setSpelerNaamKeuze] = useState<string | null>(null)
  const [blik, setBlik] = useState('plat')
  const [volledig, setVolledig] = useState(false)
  const [notitiePrompt, setNotitiePrompt] = useState<{ mode: 'nieuw' | 'bewerk'; x: number; y: number; tekst: string } | null>(null)
  const [melding, setMelding] = useState<{ tekst: string; soort: 'fout' | 'goed' } | null>(null)

  function meld(tekst: string, soort: 'fout' | 'goed') {
    setMelding({ tekst, soort })
    window.setTimeout(() => setMelding((m) => (m?.tekst === tekst ? null : m)), 4000)
  }

  useEffect(() => {
    if (!volledig) return
    function toets(e: KeyboardEvent) {
      if (e.key === 'Escape') setVolledig(false)
    }
    const vorige = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', toets)
    return () => {
      document.body.style.overflow = vorige
      window.removeEventListener('keydown', toets)
    }
  }, [volledig])

  const veiligeIdx = Math.min(stapIdx, stappen.length - 1)
  const huidige = stappen[veiligeIdx] || { elems: [], lijnen: [] }
  const elems = animStand ? animStand.elems : huidige.elems
  const lijnen = animStand ? animStand.lijnen : huidige.lijnen
  const veldInfo = veldTypeInfo(veldType)
  const [factor, setFactor] = useState(schermFactor)
  const isVerplaatsen = tool === 'verplaatsen'
  const meerdereStappen = stappen.length > 1

  useEffect(() => {
    const doek = doekRef.current,
      c = canvasRef.current
    if (!doek || !c) return
    function meet() {
      if (!doek || !c) return
      const dpr = window.devicePixelRatio || 1
      let breed: number
      if (volledig) {
        const bb = doek.clientWidth,
          bh = doek.clientHeight
        if (!bb || !bh) return
        const s = Math.min(bb / veldInfo.w, bh / veldInfo.h)
        breed = Math.max(160, Math.floor(veldInfo.w * s))
        c.style.width = breed + 'px'
        c.style.height = Math.floor(veldInfo.h * s) + 'px'
      } else {
        c.style.width = ''
        c.style.height = ''
        breed = c.clientWidth || doek.clientWidth || veldInfo.w
      }
      const nodig = Math.min(5, Math.max(2, Math.ceil((breed * dpr) / veldInfo.w)))
      setFactor((f) => (f === nodig ? f : nodig))
    }
    meet()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', meet)
      return () => window.removeEventListener('resize', meet)
    }
    const ro = new ResizeObserver(meet)
    ro.observe(doek)
    return () => ro.disconnect()
  }, [volledig, veldInfo.w, veldInfo.h])

  function wijzigStap(velden: Partial<Frame>) {
    setStappen((l) => l.map((s, i) => (i === veiligeIdx ? { ...s, ...velden } : s)))
  }

  const geschiedenisRef = useRef<{ idx: number; elems: Elem[]; lijnen: Lijn[] }[]>([])
  const [kanTerug, setKanTerug] = useState(false)

  function onthoud() {
    const s = stappen[veiligeIdx] || { elems: [], lijnen: [] }
    geschiedenisRef.current.push({
      idx: veiligeIdx,
      elems: s.elems.map((e) => ({ ...e })),
      lijnen: s.lijnen.map((l) => ({ ...l })),
    })
    if (geschiedenisRef.current.length > 60) geschiedenisRef.current.shift()
    setKanTerug(true)
  }

  function maakOngedaan() {
    if (speelt) return
    const vorig = geschiedenisRef.current.pop()
    setKanTerug(geschiedenisRef.current.length > 0)
    if (!vorig) {
      meld('Niets meer om ongedaan te maken', 'fout')
      return
    }
    setGekozenElem(null)
    setStappen((l) => l.map((s, i) => (i === vorig.idx ? { ...s, elems: vorig.elems, lijnen: vorig.lijnen } : s)))
  }

  function zetElems(fn: Elem[] | ((prev: Elem[]) => Elem[])) {
    setStappen((l) => l.map((s, i) => (i === veiligeIdx ? { ...s, elems: typeof fn === 'function' ? fn(s.elems) : fn } : s)))
  }
  function wijzigElem(id: number, velden: Partial<Elem>) {
    zetElems((prev) => prev.map((e) => (e.id === id ? { ...e, ...velden } : e)))
  }
  function zetLijnen(fn: Lijn[] | ((prev: Lijn[]) => Lijn[])) {
    setStappen((l) => l.map((s, i) => (i === veiligeIdx ? { ...s, lijnen: typeof fn === 'function' ? fn(s.lijnen) : fn } : s)))
  }

  function schaalGekozen(richting: number) {
    const el = elems.find((e) => e.id === gekozenElem)
    if (!el) return
    onthoud()
    if (isZone(el.type)) {
      const f = richting > 0 ? 1.15 : 1 / 1.15
      wijzigElem(el.id, {
        b: Math.max(24, Math.min(900, Math.round((Number(el.b) || 70) * f))),
        h: Math.max(24, Math.min(900, Math.round((Number(el.h) || 70) * f))),
      })
      return
    }
    const nieuw = Math.max(0.4, Math.min(3, Math.round(((Number(el.schaal) || 1) + richting * 0.15) * 100) / 100))
    wijzigElem(el.id, { schaal: nieuw })
  }
  function draaiGekozen(graden: number) {
    const el = elems.find((e) => e.id === gekozenElem)
    if (!el) return
    onthoud()
    const h = (((Number(el.hoek) || 0) + graden) % 360 + 360) % 360
    wijzigElem(el.id, { hoek: h })
  }
  function zetHoek(graden: number) {
    if (gekozenElem === null) return
    onthoud()
    wijzigElem(gekozenElem, { hoek: ((graden % 360) + 360) % 360 })
  }
  function verwijderGekozen() {
    onthoud()
    if (gekozenElem === null) return
    zetElems((prev) => prev.filter((e) => e.id !== gekozenElem))
    setGekozenElem(null)
  }
  const gekozenObject = elems.find((e) => e.id === gekozenElem) || null

  function voegStapToe() {
    stopAnimatie()
    setStappen((l) => {
      const bron = l[veiligeIdx] || { elems: [], lijnen: [] }
      const kopie: Frame = { id: Date.now(), elems: bron.elems.map((e) => ({ ...e })), lijnen: [] }
      return l.slice(0, veiligeIdx + 1).concat([kopie], l.slice(veiligeIdx + 1))
    })
    setStapIdx(veiligeIdx + 1)
    setTool('verplaatsen')
    meld('Stap toegevoegd. Sleep de spelers naar hun nieuwe plek.', 'goed')
  }

  function verwijderStap() {
    if (stappen.length <= 1) return
    stopAnimatie()
    const positie = veiligeIdx
    setStappen((l) => l.filter((_, i) => i !== positie))
    setStapIdx(Math.max(0, positie - 1))
  }

  function stopAnimatie() {
    if (animRef.current?.frame != null) cancelAnimationFrame(animRef.current.frame)
    animRef.current = null
    setSpeelt(false)
    setAnimStand(null)
  }

  function speelAf() {
    if (stappen.length < 2) return
    stopAnimatie()
    setSpeelt(true)
    const begin = performance.now()
    const perStap = snelheid
    const totaal = perStap * (stappen.length - 1)
    animRef.current = { frame: null }
    function stap(nu: number) {
      const verstreken = nu - begin
      if (verstreken >= totaal) {
        setAnimStand(null)
        setSpeelt(false)
        setStapIdx(stappen.length - 1)
        animRef.current = null
        return
      }
      const index = Math.floor(verstreken / perStap)
      const t = (verstreken % perStap) / perStap
      setAnimStand(tussenStand(stappen[index], stappen[index + 1], t))
      if (animRef.current) animRef.current.frame = requestAnimationFrame(stap)
    }
    animRef.current.frame = requestAnimationFrame(stap)
  }

  useEffect(
    () => () => {
      if (animRef.current?.frame != null) cancelAnimationFrame(animRef.current.frame)
      afbrekenRef.current?.()
    },
    [],
  )

  function maakFilm() {
    if (stappen.length < 2) {
      meld('Maak eerst minstens twee stappen.', 'fout')
      return
    }
    stopAnimatie()
    setOpname({ pct: 0 })
    afbrekenRef.current = exporteerAnimatieVideo({
      stappen,
      veldType,
      blik,
      snelheid,
      naam: pdfNaam || 'Oefening',
      voortgang: (p) => setOpname({ pct: p }),
      klaar: (fout, blob, ext) => {
        setOpname(null)
        afbrekenRef.current = null
        if (fout || !blob) {
          meld(fout || 'Opnemen mislukt.', 'fout')
          return
        }
        const bestandsnaam =
          (pdfNaam || 'oefening')
            .replace(/[^a-z0-9\-_ ]/gi, '')
            .trim()
            .replace(/\s+/g, '-')
            .toLowerCase() + '.' + ext
        const mb = (blob.size / 1048576).toFixed(1)
        deelOfDownload(blob, bestandsnaam, `FC Harlingen JO19-2 – ${pdfNaam || 'Oefening'}`).then((hoe) => {
          setFilmKlaar({ naam: bestandsnaam, hoe, mb, blob })
        })
      },
    })
  }

  async function maakStrook() {
    try {
      const canvas = maakStappenStrook(stappen, veldType, pdfNaam || 'Oefening', blik)
      await deelTekeningAlsPNG(canvas, `${pdfNaam || 'oefening'} - alle stappen`)
    } catch (err) {
      meld(err instanceof Error ? err.message : 'Delen mislukt.', 'fout')
    }
  }

  function handleDown(e: React.MouseEvent | React.TouchEvent) {
    if (speelt || blik !== 'plat') return
    const canvas = canvasRef.current
    if (!canvas) return
    const pos = getPos(e, canvas, factor)
    if (tool === 'gum') {
      const idx = vindElemIndex(pos.x, pos.y, elems, canvas.getContext('2d'))
      if (idx >= 0) {
        const weg = elems[idx]
        onthoud()
        zetElems((prev) => prev.filter((e2) => e2.id !== weg.id))
        if (gekozenElem === weg.id) setGekozenElem(null)
        return
      }
      let besteLijn = -1,
        besteAfstand = 14
      lijnen.forEach((l, i) => {
        const a = afstandTotLijn(pos.x, pos.y, l.x1, l.y1, l.x2, l.y2)
        if (a < besteAfstand) {
          besteAfstand = a
          besteLijn = i
        }
      })
      if (besteLijn >= 0) {
        onthoud()
        zetLijnen((prev) => prev.filter((_, i) => i !== besteLijn))
      }
      return
    }
    if (tool === 'verplaatsen') {
      const gk = elems.find((e2) => e2.id === gekozenElem)
      if (gk && draaibaar(gk.type)) {
        const kk = Math.max(0.4, Math.min(3, Number(gk.schaal) || 1))
        const hh = ((Number(gk.hoek) || 0) * Math.PI) / 180
        const R = draaiAfstand(gk, kk)
        const hx = gk.x + Math.sin(hh) * R,
          hy = gk.y - Math.cos(hh) * R
        if (Math.sqrt((pos.x - hx) * (pos.x - hx) + (pos.y - hy) * (pos.y - hy)) < 16) {
          draaienRef.current = { id: gk.id }
          return
        }
      }
      const idx = vindElemIndex(pos.x, pos.y, elems, canvas.getContext('2d'))
      if (idx >= 0) {
        onthoud()
        slepenRef.current = { idx, startX: pos.x, startY: pos.y, origX: elems[idx].x, origY: elems[idx].y }
        setGekozenElem(elems[idx].id)
      } else {
        setGekozenElem(null)
      }
      return
    }
    if (isZone(tool)) {
      const vi = zoneVormInfo(tool)
      setZoneBezig({ type: tool, x: pos.x, y: pos.y, b: vi.b, h: vi.h })
      return
    }
    if (tool === 'notitie') {
      setNotitiePrompt({ mode: 'nieuw', x: pos.x, y: pos.y, tekst: '' })
      return
    }
    if (LIJN_TOOLS.includes(tool as LijnType)) {
      setBezig({ x1: pos.x, y1: pos.y })
    } else {
      const metNummer = tool === 'speler' || tool === 'speler-rood'
      const el: Elem = { id: Date.now(), type: tool as ElemType, x: pos.x, y: pos.y, schaal: nieuwFormaat }
      if (metNummer) el.nr = spelNr
      if (spelerNaamKeuze && (tool === 'speler' || tool === 'speler-rood')) el.naam = spelerNaamKeuze
      onthoud()
      zetElems((prev) => prev.concat([el]))
      setGekozenElem(el.id)
    }
  }

  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    if (speelt || blik !== 'plat') return
    const canvas = canvasRef.current
    if (!canvas) return
    const pos = getPos(e, canvas, factor)
    setMuis(pos)
    if (draaienRef.current) {
      const gk = elems.find((el) => el.id === draaienRef.current!.id)
      if (gk) {
        let graden = (Math.atan2(pos.x - gk.x, -(pos.y - gk.y)) * 180) / Math.PI
        graden = Math.round(graden / 5) * 5
        graden = ((graden % 360) + 360) % 360
        wijzigElem(gk.id, { hoek: graden })
      }
      return
    }
    if (zoneBezig) {
      const b = Math.max(24, Math.abs(pos.x - zoneBezig.x) * 2)
      const h = Math.max(24, Math.abs(pos.y - zoneBezig.y) * 2)
      setZoneBezig((z) => (z ? { ...z, b, h } : z))
      return
    }
    if (slepenRef.current !== null) {
      const { idx, startX, startY, origX, origY } = slepenRef.current
      const nx = origX + (pos.x - startX)
      const ny = origY + (pos.y - startY)
      zetElems((prev) => prev.map((el, i) => (i === idx ? { ...el, x: nx, y: ny } : el)))
    }
  }

  function handleUp(e: React.MouseEvent | React.TouchEvent) {
    if (speelt || blik !== 'plat') return
    if (draaienRef.current) {
      draaienRef.current = null
      return
    }
    if (zoneBezig) {
      const nieuw: Elem = { id: Date.now(), type: zoneBezig.type as ElemType, x: zoneBezig.x, y: zoneBezig.y, b: Math.round(zoneBezig.b), h: Math.round(zoneBezig.h), kleur: zoneKleur as Elem['kleur'] }
      onthoud()
      zetElems((prev) => prev.concat([nieuw]))
      setGekozenElem(nieuw.id)
      setZoneBezig(null)
      return
    }
    if (slepenRef.current !== null) {
      slepenRef.current = null
      return
    }
    if (!bezig) return
    const canvas = canvasRef.current
    if (!canvas) {
      setBezig(null)
      return
    }
    const pos = getPos(e, canvas, factor)
    const dx = pos.x - bezig.x1,
      dy = pos.y - bezig.y1
    if (Math.sqrt(dx * dx + dy * dy) > 8) {
      const newL: Lijn = { id: Date.now(), type: tool as LijnType, x1: bezig.x1, y1: bezig.y1, x2: pos.x, y2: pos.y, bocht: bochtKant }
      if (lijnNr) {
        newL.nr = lijnNr
        newL.nrDonker = lijnDonker
      }
      onthoud()
      zetLijnen((prev) => prev.concat([newL]))
    }
    setBezig(null)
  }

  useEffect(() => {
    onChange({
      elems: stappen[0]?.elems || [],
      lijnen: stappen[0]?.lijnen || [],
      veldType,
      stappen,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stappen, veldType])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = veldInfo.w,
      H = veldInfo.h
    const S = factor
    const info = perspectiefInfo(blik)

    if (!vlakRef.current) vlakRef.current = document.createElement('canvas')
    const vlak = vlakRef.current
    if (vlak.width !== W * S || vlak.height !== H * S) {
      vlak.width = W * S
      vlak.height = H * S
    }
    const ctx = vlak.getContext('2d')!
    ctx.setTransform(S, 0, 0, S, 0, 0)
    ctx.clearRect(0, 0, W, H)

    tekenVeld(ctx, W, H, veldType)
    lijnen.forEach((l) => tekenlijn(ctx, l))
    if (!speelt && bezig && LIJN_TOOLS.includes(tool as LijnType)) {
      tekenlijn(ctx, { id: -1, type: tool as LijnType, x1: bezig.x1, y1: bezig.y1, x2: muis.x, y2: muis.y, bocht: bochtKant, nr: lijnNr ?? undefined, nrDonker: lijnDonker })
    }
    elems.forEach((el) => tekenelement(ctx, el, !speelt && el.id === gekozenElem && blik === 'plat'))
    if (zoneBezig) tekenelement(ctx, { id: -1, type: zoneBezig.type as ElemType, x: zoneBezig.x, y: zoneBezig.y, b: zoneBezig.b, h: zoneBezig.h, kleur: zoneKleur as Elem['kleur'] }, false)

    const zicht = canvas.getContext('2d')!
    zicht.setTransform(1, 0, 0, 1, 0, 0)
    zicht.clearRect(0, 0, canvas.width, canvas.height)
    projecteerPerspectief(vlak, zicht, canvas.width, canvas.height, info.k)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elems, lijnen, bezig, muis, tool, veldType, speelt, gekozenElem, zoneBezig, zoneKleur, blik, factor])

  function kiesLosNummer(t: 'speler' | 'speler-rood', nr: number | string) {
    setTool(t)
    setSpelNr(nr)
    setSpelerNaamKeuze(null)
  }

  function railKnop(o: { sleutel: string; label: string; titel: string; aan: boolean; kleur?: string; klik: () => void }) {
    return (
      <button
        key={o.sleutel}
        type="button"
        className={'tb-rail-knop' + (o.aan ? ' actief' : '')}
        style={o.aan && o.kleur ? { borderColor: o.kleur, background: o.kleur, color: '#fff' } : undefined}
        title={o.titel}
        onClick={o.klik}
      >
        {o.label}
      </button>
    )
  }

  function teamRij(team: 'speler' | 'speler-rood', kleur: string) {
    return (
      <div className="tb-knoppen">
        {(RUGNUMMERS as (number | string)[]).concat(['A', 'V']).map((nr) => {
          const aan = tool === team && spelNr === nr
          return (
            <button
              key={team + nr}
              type="button"
              className="tb-nr-knop"
              title={nr === 'A' ? 'Aanvaller' : nr === 'V' ? 'Verdediger' : undefined}
              style={{ borderColor: aan ? kleur : 'var(--border)', background: aan ? kleur : 'var(--card-bg)', color: aan ? '#fff' : 'var(--text)' }}
              onClick={() => kiesLosNummer(team, nr)}
            >
              {nr}
            </button>
          )
        })}
      </div>
    )
  }

  const railBlok = (
    <div className="tb-rail">
      <div className="tb-rail-kop">Kies</div>
      {railKnop({ sleutel: 'hand', label: '☝︎', titel: 'Verplaatsen en selecteren', aan: isVerplaatsen, klik: () => setTool('verplaatsen') })}
      {railKnop({ sleutel: 'gum', label: 'Gum', titel: 'Gum: tik om te wissen', aan: tool === 'gum', klik: () => { setTool('gum'); setGekozenElem(null) } })}

      <div className="tb-rail-scheiding" />
      <div className="tb-rail-kop">Zet neer</div>
      {railKnop({ sleutel: 'bal', label: '⚽', titel: 'Bal', aan: tool === 'bal', klik: () => setTool('bal') })}
      {railKnop({ sleutel: 'pion', label: '🔺', titel: 'Pion', aan: tool === 'pion', klik: () => setTool('pion') })}
      {railKnop({ sleutel: 'goal', label: '🥅', titel: 'Doel', aan: tool === 'goal', klik: () => setTool('goal') })}
      {railKnop({ sleutel: 'notitie', label: '💬', titel: 'Coachpunt op het veld', aan: tool === 'notitie', klik: () => { setTool('notitie'); setGekozenElem(null) } })}
      {railKnop({ sleutel: 'materiaal', label: '🧰', titel: 'Trainingsmateriaal', aan: isMateriaal(tool) || paneel === 'materiaal', klik: () => setPaneel(paneel === 'materiaal' ? null : 'materiaal') })}
      {railKnop({ sleutel: 'zone', label: '▭', titel: 'Zone of vlak', aan: isZone(tool) || paneel === 'zone', klik: () => setPaneel(paneel === 'zone' ? null : 'zone') })}
      {railKnop({ sleutel: 'spelers', label: '👥', titel: 'Speler uit je selectie', aan: paneel === 'spelers', klik: () => setPaneel(paneel === 'spelers' ? null : 'spelers') })}

      <div className="tb-rail-scheiding" />
      <div className="tb-rail-kop">Lijnen</div>
      {LIJN_KNOPPEN.map((o) => railKnop({ sleutel: o.t, label: o.l, titel: o.l, aan: tool === o.t, klik: () => setTool(o.t) }))}
      {tool === 'voorzetlijn' &&
        railKnop({ sleutel: 'bocht', label: bochtKant === 1 ? '↻' : '↺', titel: 'Andere kant op buigen', aan: false, klik: () => setBochtKant((b) => (b === 1 ? -1 : 1)) })}

      <div className="tb-rail-scheiding" />
      {railKnop({ sleutel: 'ongedaan', label: '↩', titel: kanTerug ? 'Laatste actie ongedaan maken' : 'Nog niets om ongedaan te maken', aan: false, klik: maakOngedaan })}
      {railKnop({
        sleutel: 'wis',
        label: '🗑',
        titel: 'Alles op deze stap wissen',
        aan: false,
        klik: () => {
          if (speelt) return
          onthoud()
          setGekozenElem(null)
          wijzigStap({ elems: [], lijnen: [] })
        },
      })}
    </div>
  )

  const veldBlok = (
    <div className="tb-veld-blok">
      <div className="tb-doek" ref={doekRef}>
        <canvas
          ref={canvasRef}
          width={veldInfo.w * factor}
          height={veldInfo.h * factor}
          className="tb-canvas"
          style={{
            aspectRatio: `${veldInfo.w} / ${veldInfo.h}`,
            cursor: speelt ? 'default' : draaienRef.current ? 'grabbing' : isVerplaatsen ? 'grab' : tool === 'gum' ? 'cell' : 'crosshair',
          }}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
          onTouchStart={handleDown}
          onTouchMove={handleMove}
          onTouchEnd={handleUp}
        />
        {!volledig && (
          <button type="button" className="tb-groot-knop knop lijn klein" onClick={() => setVolledig(true)} title="Groter tekenen, druk Escape om terug te gaan">
            ⤢ Groot
          </button>
        )}
      </div>
      {isZone(tool) && !speelt && <div className="tb-hint">Tik om te plaatsen, ingedrukt houden en slepen maakt hem groter.</div>}
      {blik !== 'plat' && <div className="tb-hint tb-hint-oranje">🔒 In schuine weergave kun je niet tekenen. Zet terug op Plat.</div>}
    </div>
  )

  const zijBlok = (
    <div className="tb-zij">
      {paneel === 'materiaal' && (
        <div className="tb-vak">
          <div className="tb-vak-kop">
            Materiaal
            <button type="button" className="knop lijn klein" onClick={() => setPaneel(null)}>
              Klaar
            </button>
          </div>
          <div className="tb-knoppen">
            {MATERIAAL.map((m) => {
              const aan = tool === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  className="tb-rail-knop"
                  title={m.label}
                  style={{ borderColor: aan ? 'var(--accent)' : 'var(--border)', background: aan ? 'var(--accent)' : 'var(--card-bg)', color: aan ? '#fff' : 'var(--text)' }}
                  onClick={() => { setTool(m.id as ElemType); setGekozenElem(null) }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {paneel === 'zone' && (
        <div className="tb-vak">
          <div className="tb-vak-kop">
            Zone
            <button type="button" className="knop lijn klein" onClick={() => setPaneel(null)}>
              Klaar
            </button>
          </div>
          <div className="tb-knoppen" style={{ marginBottom: 8 }}>
            {ZONE_VORMEN.map((z) => {
              const aan = tool === z.id
              return (
                <button
                  key={z.id}
                  type="button"
                  className="tb-rail-knop"
                  title={z.label}
                  style={{ borderColor: aan ? zoneKleurInfo(zoneKleur).rand : 'var(--border)', background: aan ? zoneKleurInfo(zoneKleur).rand : 'var(--card-bg)', color: aan ? '#fff' : 'var(--text)' }}
                  onClick={() => { setTool(z.id as ElemType); setGekozenElem(null) }}
                >
                  {z.label}
                </button>
              )
            })}
          </div>
          <div className="tb-knoppen">
            {ZONE_KLEUREN.map((k) => {
              const aan = zoneKleur === k.id
              return (
                <button
                  key={k.id}
                  type="button"
                  className="tb-rail-knop"
                  style={{ borderColor: aan ? k.rand : 'var(--border)', background: k.vul }}
                  onClick={() => setZoneKleur(k.id)}
                >
                  {aan ? '✓' : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {paneel === 'spelers' && (
        <div className="tb-vak">
          <div className="tb-vak-kop">
            Uit je selectie
            <button type="button" className="knop lijn klein" onClick={() => setPaneel(null)}>
              Klaar
            </button>
          </div>
          {spelerNaamKeuze && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11 }}>
              <span style={{ opacity: 0.7 }}>Naam erbij:</span>
              <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{spelerNaamKeuze}</strong>
              <button type="button" className="knop lijn klein" style={{ marginLeft: 'auto' }} onClick={() => setSpelerNaamKeuze(null)}>
                Zonder naam
              </button>
            </div>
          )}
          <div className="chip-rij" style={{ marginBottom: 8 }}>
            <button type="button" className={'chip' + (spelerTeam === 'speler' ? ' actief' : '')} onClick={() => setSpelerTeam('speler')}>
              Blauw
            </button>
            <button type="button" className={'chip' + (spelerTeam === 'speler-rood' ? ' actief' : '')} onClick={() => setSpelerTeam('speler-rood')}>
              Rood
            </button>
          </div>
          {!spelers || spelers.length === 0 ? (
            <div className="tb-hint">Je hebt nog geen spelers in je selectie staan.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 190, overflowY: 'auto' }}>
              {spelers.map((sp) => {
                const aan = spelerNaamKeuze === sp.naam
                return (
                  <button
                    key={sp.id}
                    type="button"
                    className="knop lijn klein"
                    style={{ justifyContent: 'flex-start', borderColor: aan ? 'var(--accent)' : 'var(--border)' }}
                    onClick={() => {
                      setTool(spelerTeam)
                      setSpelNr(sp.rugnummer || sp.naam.charAt(0).toUpperCase())
                      setSpelerNaamKeuze(sp.naam)
                    }}
                  >
                    <span style={{ fontWeight: 800, minWidth: 16, display: 'inline-block' }}>{sp.rugnummer || '–'}</span>
                    <span>{sp.naam}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {gekozenObject && !speelt ? (
        <div className="tb-vak" style={{ borderColor: 'var(--accent)' }}>
          <div className="tb-vak-kop" style={{ color: 'var(--accent)' }}>
            {(ELEM_NAMEN[gekozenObject.type] || 'Element') + ((gekozenObject.type === 'speler' || gekozenObject.type === 'speler-rood') && gekozenObject.nr ? ' ' + gekozenObject.nr : '')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <button type="button" className="tb-stap" title="Kleiner" onClick={() => schaalGekozen(-1)}>
              −
            </button>
            <span className="tb-maat" style={{ flex: 1 }}>
              {Math.round((Number(gekozenObject.schaal) || 1) * 100)}%
            </span>
            <button type="button" className="tb-stap" title="Groter" onClick={() => schaalGekozen(1)}>
              +
            </button>
            <button type="button" className="knop lijn klein" onClick={() => wijzigElem(gekozenObject.id, { schaal: gekozenObject.type === 'goal' ? 0.55 : 1 })}>
              {gekozenObject.type === 'goal' ? '55%' : '100%'}
            </button>
          </div>

          {draaibaar(gekozenObject.type) && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <button type="button" className="tb-stap" title="Linksom" onClick={() => draaiGekozen(-15)}>
                  ↺
                </button>
                <span className="tb-maat" style={{ flex: 1 }}>
                  {Math.round(Number(gekozenObject.hoek) || 0)}°
                </span>
                <button type="button" className="tb-stap" title="Rechtsom" onClick={() => draaiGekozen(15)}>
                  ↻
                </button>
              </div>
              <div className="tb-knoppen">
                {[
                  { g: 0, i: '↑' },
                  { g: 90, i: '→' },
                  { g: 180, i: '↓' },
                  { g: 270, i: '←' },
                ].map((o) => {
                  const aan = (Number(gekozenObject.hoek) || 0) === o.g
                  return (
                    <button
                      key={o.g}
                      type="button"
                      className="tb-stap"
                      title={`Richting ${o.g}°`}
                      style={{ borderColor: aan ? 'var(--accent)' : 'var(--border)', background: aan ? 'var(--accent)' : 'var(--card-bg)', color: aan ? '#fff' : 'var(--text)' }}
                      onClick={() => zetHoek(o.g)}
                    >
                      {o.i}
                    </button>
                  )
                })}
              </div>
              <div className="tb-hint">Of sleep aan de gele greep op het veld.</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            {gekozenObject.type === 'notitie' && (
              <button
                type="button"
                className="knop lijn klein"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setNotitiePrompt({ mode: 'bewerk', x: gekozenObject.x, y: gekozenObject.y, tekst: gekozenObject.tekst || '' })}
              >
                ✎ Tekst
              </button>
            )}
            <button type="button" className="knop gevaar klein" onClick={verwijderGekozen}>
              🗑
            </button>
            <button type="button" className="knop lijn klein" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setGekozenElem(null)}>
              Klaar
            </button>
          </div>
        </div>
      ) : (
        !speelt && (
          <div className="tb-vak">
            <div className="tb-vak-kop">Formaat nieuw</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" className="tb-stap" onClick={() => setNieuwFormaat((f) => Math.max(0.4, Math.round((f - 0.15) * 100) / 100))}>
                −
              </button>
              <span className="tb-maat" style={{ flex: 1 }}>
                {Math.round(nieuwFormaat * 100)}%
              </span>
              <button type="button" className="tb-stap" onClick={() => setNieuwFormaat((f) => Math.min(3, Math.round((f + 0.15) * 100) / 100))}>
                +
              </button>
            </div>
            <div className="tb-hint">Tik met de hand op iets op het veld om het los aan te passen.</div>
          </div>
        )
      )}

      <div className="tb-vak">
        <div className="tb-vak-kop">
          Lijnnummer
          <button type="button" className="knop lijn klein" style={{ marginLeft: 'auto' }} title={lijnDonker ? 'Nu zwarte cijfers' : 'Nu witte cijfers'} onClick={() => setLijnDonker(!lijnDonker)}>
            {lijnDonker ? 'Zwart' : 'Wit'}
          </button>
        </div>
        <div className="tb-lijnnr-raster">
          <button type="button" className={'tb-lijnnr-knop' + (lijnNr === null ? ' actief' : '')} title="Zonder nummer" onClick={() => setLijnNr(null)}>
            –
          </button>
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" className={'tb-lijnnr-knop' + (lijnNr === n ? ' actief' : '')} onClick={() => setLijnNr(lijnNr === n ? null : n)}>
              {n}
            </button>
          ))}
        </div>
        {lijnNr && (
          <div className="tb-hint" style={{ marginTop: 6 }}>
            Elke lijn die je nu trekt krijgt een <strong>{lijnNr}</strong>.
            <button type="button" className="knop lijn klein" style={{ marginLeft: 6 }} onClick={() => setLijnNr(Math.min(20, lijnNr + 1))}>
              Volgende
            </button>
          </div>
        )}
      </div>

      <div className="tb-vak">
        <div className="tb-vak-kop">
          <i className="tb-team-stip" style={{ background: '#004aad' }} /> Blauw team
        </div>
        {teamRij('speler', '#004aad')}
        <div className="tb-vak-kop" style={{ marginTop: 10 }}>
          <i className="tb-team-stip" style={{ background: '#dc3545' }} /> Rood team
        </div>
        {teamRij('speler-rood', '#dc3545')}
      </div>

      <div className="tb-vak">
        <div className="tb-vak-kop">Veld</div>
        <div className="tb-knoppen" style={{ marginBottom: 10 }}>
          {VELD_TYPEN.map((vt) => (
            <button key={vt.id} type="button" className={'chip' + (veldType === vt.id ? ' actief' : '')} onClick={() => setVeldType(vt.id)}>
              {vt.l}
            </button>
          ))}
        </div>
        <div className="tb-vak-kop">Blik</div>
        <div className="tb-knoppen">
          {PERSPECTIEF_STANDEN.map((p) => {
            const aan = blik === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={'chip' + (aan ? ' actief' : '')}
                title={p.id === 'plat' ? 'Bovenaanzicht, hier teken je' : 'Schuine weergave voor presenteren'}
                onClick={() => {
                  setBlik(p.id)
                  if (p.id !== 'plat') setGekozenElem(null)
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  const framesBlok = (
    <div className="tb-frames">
      <div className="tb-vak-kop" style={{ marginBottom: 7 }}>
        Frames
        <span style={{ marginLeft: 6, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
          {stappen.length === 1 ? 'voeg een frame toe om te laten bewegen' : `stap ${veiligeIdx + 1} van ${stappen.length}`}
        </span>
      </div>

      <div className="tb-frame-strook">
        {stappen.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={'tb-frame-vak' + (i === veiligeIdx ? ' actief' : '')}
            onClick={() => {
              stopAnimatie()
              setGekozenElem(null)
              setStapIdx(i)
            }}
          >
            <FrameMiniatuur stap={s} veldType={veldType} />
            <div className="tb-frame-label">{i + 1}</div>
          </button>
        ))}
        <button type="button" className="tb-frame-nieuw" onClick={voegStapToe} title="Frame toevoegen">
          + Frame
        </button>
      </div>

      <div className="tb-frame-balk">
        {meerdereStappen && (
          <button type="button" className={'knop klein' + (speelt ? ' gevaar' : ' succes')} onClick={() => (speelt ? stopAnimatie() : speelAf())}>
            {speelt ? '■ Stop' : '▶ Speel af'}
          </button>
        )}
        {meerdereStappen && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: 0.8, fontWeight: 600 }}>
            Tempo
            <input type="range" min="400" max="2400" step="200" value={snelheid} style={{ width: 84 }} onChange={(e) => setSnelheid(Number(e.target.value))} />
          </label>
        )}
        {meerdereStappen && (
          <button type="button" className="knop lijn klein" onClick={verwijderStap} title="Dit frame verwijderen">
            🗑
          </button>
        )}

        {pdfNaam && (
          <span style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {meerdereStappen && (
              <button type="button" className="knop klein gevaar" disabled={!!opname} onClick={maakFilm}>
                {opname ? 'Bezig…' : '🎬 Filmpje'}
              </button>
            )}
            {meerdereStappen && (
              <button type="button" className="knop lijn klein" onClick={maakStrook}>
                ▦ Alle stappen
              </button>
            )}
            <button
              type="button"
              className="knop klein"
              onClick={() => {
                try {
                  exporteerTekeningPDF(pdfNaam, canvasRef.current, pdfInfo)
                } catch (err) {
                  meld(err instanceof Error ? err.message : 'PDF maken mislukt.', 'fout')
                }
              }}
            >
              📄 PDF
            </button>
            <button
              type="button"
              className="knop klein"
              style={{ background: '#25d366', color: 'white' }}
              onClick={async () => {
                try {
                  await deelTekeningAlsPNG(canvasRef.current, pdfNaam)
                } catch (err) {
                  meld(err instanceof Error ? err.message : 'Delen mislukt.', 'fout')
                }
              }}
            >
              Delen
            </button>
          </span>
        )}
      </div>

      {melding && <div className={'tb-melding' + (melding.soort === 'fout' ? ' tb-melding-fout' : ' tb-melding-goed')}>{melding.tekst}</div>}

      {filmKlaar && (
        <div className="tb-film-klaar">
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong>{filmKlaar.hoe === 'gedeeld' ? 'Filmpje gedeeld' : 'Filmpje opgeslagen'}</strong>
            <br />
            <span style={{ fontSize: 11, opacity: 0.8 }}>
              {filmKlaar.hoe === 'gedeeld' ? 'Kies in het deelmenu waar je het naartoe stuurt.' : `Bestand ${filmKlaar.naam} (${filmKlaar.mb} MB) staat in je map Downloads.`}
            </span>
          </span>
          <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              className="knop lijn klein"
              title="Nog een keer opslaan als je hem niet kunt vinden"
              onClick={() => bewaarBestand(filmKlaar.blob, filmKlaar.naam)}
            >
              Opslaan
            </button>
            <button type="button" className="knop lijn klein" onClick={() => setFilmKlaar(null)}>
              Sluiten
            </button>
          </span>
        </div>
      )}

      {opname && (
        <div className="tb-opname-balk">
          <span className="tb-opname-stip" />
          <div style={{ fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Opnemen</div>
          <div className="tb-opname-vul">
            <span style={{ width: `${opname.pct}%` }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', minWidth: 34, textAlign: 'right' }}>{opname.pct}%</div>
        </div>
      )}
    </div>
  )

  const notitieDialoog = notitiePrompt && (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setNotitiePrompt(null)}>
      <div className="modal-sheet">
        <div className="modal-titel">{notitiePrompt.mode === 'nieuw' ? 'Coachpunt toevoegen' : 'Coachpunt aanpassen'}</div>
        <div className="form-groep">
          <label>Tekst</label>
          <textarea
            rows={3}
            autoFocus
            value={notitiePrompt.tekst}
            onChange={(e) => setNotitiePrompt((p) => (p ? { ...p, tekst: e.target.value } : p))}
            placeholder="Welk coachpunt wil je erbij zetten?"
          />
        </div>
        <div className="form-acties">
          <button type="button" className="knop lijn" onClick={() => setNotitiePrompt(null)}>
            Annuleren
          </button>
          <button
            type="button"
            className="knop"
            onClick={() => {
              const tekst = notitiePrompt.tekst.trim()
              if (notitiePrompt.mode === 'nieuw') {
                if (tekst) {
                  const nn: Elem = { id: Date.now(), type: 'notitie', x: notitiePrompt.x, y: notitiePrompt.y, tekst, schaal: nieuwFormaat }
                  onthoud()
                  zetElems((prev) => prev.concat([nn]))
                  setGekozenElem(nn.id)
                }
              } else if (gekozenElem !== null) {
                onthoud()
                wijzigElem(gekozenElem, { tekst: tekst || 'Notitie' })
              }
              setNotitiePrompt(null)
            }}
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  )

  if (volledig) {
    return createPortal(
      <div className="tb-vol">
        <div className="tb-vol-kop">
          <button type="button" className="knop lijn klein" onClick={() => setVolledig(false)}>
            ⤡ Klaar
          </button>
          <div style={{ fontWeight: 700 }}>{pdfNaam || 'Tekening'}</div>
          <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>Escape sluit ook</span>
        </div>
        <div className="tb-vol-mid">
          <div className="tb-werkvlak">
            {railBlok}
            {veldBlok}
            {zijBlok}
          </div>
          {framesBlok}
        </div>
        {notitieDialoog}
      </div>,
      document.body,
    )
  }

  return (
    <div className="tb-wrap">
      <div className="tb-werkvlak">
        {railBlok}
        {veldBlok}
        {zijBlok}
      </div>
      {framesBlok}
      {notitieDialoog}
    </div>
  )
}

function FrameMiniatuur({ stap, veldType }: { stap: Frame; veldType: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const info = veldTypeInfo(veldType)
    const breed = 74
    const hoog = Math.round((breed * info.h) / info.w)
    const f = 2
    if (c.width !== breed * f) {
      c.width = breed * f
      c.height = hoog * f
    }
    c.style.height = hoog + 'px'
    const ctx = c.getContext('2d')!
    const groot = document.createElement('canvas')
    groot.width = info.w
    groot.height = info.h
    const gctx = groot.getContext('2d')!
    tekenVeld(gctx, info.w, info.h, veldType)
    ;(stap.lijnen || []).forEach((l) => tekenlijn(gctx, l))
    ;(stap.elems || []).forEach((el) => tekenelement(gctx, el, false))
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(groot, 0, 0, c.width, c.height)
  }, [stap, veldType])
  return <canvas ref={ref} className="tb-frame-mini" />
}

export { LEGE_TEKENING }
