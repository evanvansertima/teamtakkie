// Canvas rendering for the tactics/training board.
// Ported near-verbatim from legacy/fc-harlingen-app.html (tekenVeld, pijl,
// tekenlijn, tekenelement, notitieOpmaak, and the field/material/zone
// constants) — this is pure canvas 2D drawing code with no React or
// storage dependencies, so the port is mechanical.

import type { Elem, Frame, Lijn, LijnType } from './types'

export const LIJN_TOOLS: LijnType[] = ['looplijn', 'passlijn', 'schietlijn', 'dribbellijn', 'voorzetlijn']

/* ── SCHERPTE ──────────────────────────────────────────────
   The field is drawn in "logical" units (580x370) and stretched onto
   however many real screen pixels it occupies, multiplied again by the
   device pixel ratio. Drawing at 1:1 would show that stretch as blocky
   pixels, so we draw larger internally and shrink only at display time —
   this also keeps PDF/PNG/video exports sharp. */
export function schermFactor() {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
  return Math.min(4, Math.max(2, Math.ceil(dpr) + 1))
}
export const EXPORT_FACTOR = 4

export function scherpCanvas(breedte: number, hoogte: number, factor?: number) {
  const f = factor || 1
  const c = document.createElement('canvas')
  c.width = Math.round(breedte * f)
  c.height = Math.round(hoogte * f)
  const ctx = c.getContext('2d')!
  ctx.setTransform(f, 0, 0, f, 0, 0)
  return { canvas: c, ctx, factor: f }
}

export interface VeldTypeInfo {
  id: string
  l: string
  w: number
  h: number
}

export const VELD_TYPEN: VeldTypeInfo[] = [
  { id: 'leeg', l: '▭ Leeg', w: 580, h: 370 },
  { id: 'heel-h', l: '↔ Heel', w: 580, h: 370 },
  { id: 'heel-v', l: '↕ Heel', w: 370, h: 540 },
  { id: 'half-o', l: '⬇ ½Doel↓', w: 430, h: 320 },
  { id: 'half-b', l: '⬆ ½Doel↑', w: 430, h: 320 },
  { id: 'half-l', l: '⬅ ½Doel←', w: 320, h: 430 },
  { id: 'half-r', l: '➡ ½Doel→', w: 320, h: 430 },
]
export function veldTypeInfo(id: string): VeldTypeInfo {
  return VELD_TYPEN.find((v) => v.id === id) || VELD_TYPEN[1]
}

export function tekenVeld(ctx: CanvasRenderingContext2D, W: number, H: number, vt: string) {
  const toR = (d: number) => (d * Math.PI) / 180
  ctx.fillStyle = '#2e8b2e'
  ctx.fillRect(0, 0, W, H)
  for (let gi = 0; gi < 7; gi++) {
    ctx.fillStyle = gi % 2 === 0 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)'
    ctx.fillRect(0, gi * (H / 7), W, H / 7)
  }
  const FX = 14,
    FY = 10,
    FW = W - 28,
    FH = H - 20
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([])
  if (vt === 'leeg') {
    ctx.lineWidth = 2.5
    ctx.strokeRect(FX, FY, FW, FH)
    return
  }
  if (vt === 'heel-h') {
    ctx.strokeRect(FX, FY, FW, FH)
    const mx = FX + FW / 2
    ctx.beginPath()
    ctx.moveTo(mx, FY)
    ctx.lineTo(mx, FY + FH)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(mx, FY + FH / 2, Math.min(44, FW * 0.078), 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(mx, FY + FH / 2, 3, 0, 2 * Math.PI)
    ctx.fill()
    const pw = FW * 0.135,
      ph = FH * 0.56,
      gw = FW * 0.055,
      gh = FH * 0.25,
      goH = FH * 0.18,
      goD = 10
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(FX, FY + (FH - ph) / 2, pw, ph)
    ctx.strokeRect(FX, FY + (FH - gh) / 2, gw, gh)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2.5
    ctx.strokeRect(FX - goD, FY + (FH - goH) / 2, goD, goH)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(FX + FW - pw, FY + (FH - ph) / 2, pw, ph)
    ctx.strokeRect(FX + FW - gw, FY + (FH - gh) / 2, gw, gh)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2.5
    ctx.strokeRect(FX + FW, FY + (FH - goH) / 2, goD, goH)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(FX + pw * 0.65, FY + FH / 2, 3, 0, 2 * Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(FX + FW - pw * 0.65, FY + FH / 2, 3, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.5
    const dRxH = pw * 0.555,
      dRyH = ph * 0.227
    ctx.beginPath()
    ctx.ellipse(FX + pw * 0.65, FY + FH / 2, dRxH, dRyH, 0, toR(-51), toR(51), false)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(FX + FW - pw * 0.65, FY + FH / 2, dRxH, dRyH, 0, toR(129), toR(231), false)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(FX, FY, 7, 5, 0, 0, toR(90), false)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(FX + FW, FY, 7, 5, 0, toR(90), toR(180), false)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(FX, FY + FH, 7, 5, 0, toR(270), toR(360), false)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(FX + FW, FY + FH, 7, 5, 0, toR(180), toR(270), false)
    ctx.stroke()
    return
  }
  if (vt === 'heel-v') {
    ctx.strokeRect(FX, FY, FW, FH)
    const my = FY + FH / 2
    ctx.beginPath()
    ctx.moveTo(FX, my)
    ctx.lineTo(FX + FW, my)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(FX + FW / 2, my, Math.min(42, FH * 0.078), 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(FX + FW / 2, my, 3, 0, 2 * Math.PI)
    ctx.fill()
    const vpw = FW * 0.6,
      vph = FH * 0.165,
      vgw = FW * 0.32,
      vgh = FH * 0.055,
      vGW = FW * 0.22,
      vGH = 12
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(FX + (FW - vpw) / 2, FY, vpw, vph)
    ctx.strokeRect(FX + (FW - vgw) / 2, FY, vgw, vgh)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2.5
    ctx.strokeRect(FX + (FW - vGW) / 2, FY - vGH, vGW, vGH)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(FX + FW / 2, FY + vph * 0.65, 3, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.5
    const vdRx = vpw * 0.227,
      vdRy = vph * 0.555
    ctx.beginPath()
    ctx.ellipse(FX + FW / 2, FY + vph * 0.65, vdRx, vdRy, 0, toR(39), toR(141), false)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(FX + (FW - vpw) / 2, FY + FH - vph, vpw, vph)
    ctx.strokeRect(FX + (FW - vgw) / 2, FY + FH - vgh, vgw, vgh)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2.5
    ctx.strokeRect(FX + (FW - vGW) / 2, FY + FH, vGW, vGH)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(FX + FW / 2, FY + FH - vph * 0.65, 3, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(FX + FW / 2, FY + FH - vph * 0.65, vdRx, vdRy, 0, toR(219), toR(321), false)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(FX, FY, 5, 7, 0, 0, toR(90), false)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(FX + FW, FY, 5, 7, 0, toR(90), toR(180), false)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(FX, FY + FH, 5, 7, 0, toR(270), toR(360), false)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(FX + FW, FY + FH, 5, 7, 0, toR(180), toR(270), false)
    ctx.stroke()
    return
  }
  // Half fields
  ctx.strokeRect(FX, FY, FW, FH)
  const goalB = vt === 'half-o',
    goalT = vt === 'half-b',
    goalL = vt === 'half-l',
    goalR = vt === 'half-r'
  const vert = goalB || goalT
  ctx.setLineDash([8, 5])
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  if (goalB) {
    ctx.beginPath()
    ctx.moveTo(FX, FY)
    ctx.lineTo(FX + FW, FY)
    ctx.stroke()
  }
  if (goalT) {
    ctx.beginPath()
    ctx.moveTo(FX, FY + FH)
    ctx.lineTo(FX + FW, FY + FH)
    ctx.stroke()
  }
  if (goalL) {
    ctx.beginPath()
    ctx.moveTo(FX + FW, FY)
    ctx.lineTo(FX + FW, FY + FH)
    ctx.stroke()
  }
  if (goalR) {
    ctx.beginPath()
    ctx.moveTo(FX, FY)
    ctx.lineTo(FX, FY + FH)
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1.5
  const hPAm = vert ? FH * 0.36 : FW * 0.36,
    hPAc = vert ? FW * 0.6 : FH * 0.6
  const hGAm = vert ? FH * 0.09 : FW * 0.09,
    hGAc = vert ? FW * 0.32 : FH * 0.32
  const hGW = vert ? FW * 0.22 : FH * 0.22,
    hGD = 14
  const penD = hPAm * 0.65
  let paX = 0,
    paY = 0,
    paW = 0,
    paH = 0,
    gaX = 0,
    gaY = 0,
    gaW = 0,
    gaH = 0,
    glX = 0,
    glY = 0,
    glW = 0,
    glH = 0,
    penX = 0,
    penY = 0
  if (goalB) {
    paX = FX + (FW - hPAc) / 2
    paY = FY + FH - hPAm
    paW = hPAc
    paH = hPAm
    gaX = FX + (FW - hGAc) / 2
    gaY = FY + FH - hGAm
    gaW = hGAc
    gaH = hGAm
    glX = FX + (FW - hGW) / 2
    glY = FY + FH
    glW = hGW
    glH = hGD
    penX = FX + FW / 2
    penY = FY + FH - penD
  } else if (goalT) {
    paX = FX + (FW - hPAc) / 2
    paY = FY
    paW = hPAc
    paH = hPAm
    gaX = FX + (FW - hGAc) / 2
    gaY = FY
    gaW = hGAc
    gaH = hGAm
    glX = FX + (FW - hGW) / 2
    glY = FY - hGD
    glW = hGW
    glH = hGD
    penX = FX + FW / 2
    penY = FY + penD
  } else if (goalL) {
    paX = FX
    paY = FY + (FH - hPAc) / 2
    paW = hPAm
    paH = hPAc
    gaX = FX
    gaY = FY + (FH - hGAc) / 2
    gaW = hGAm
    gaH = hGAc
    glX = FX - hGD
    glY = FY + (FH - hGW) / 2
    glW = hGD
    glH = hGW
    penX = FX + penD
    penY = FY + FH / 2
  } else {
    paX = FX + FW - hPAm
    paY = FY + (FH - hPAc) / 2
    paW = hPAm
    paH = hPAc
    gaX = FX + FW - hGAm
    gaY = FY + (FH - hGAc) / 2
    gaW = hGAm
    gaH = hGAc
    glX = FX + FW
    glY = FY + (FH - hGW) / 2
    glW = hGD
    glH = hGW
    penX = FX + FW - penD
    penY = FY + FH / 2
  }
  ctx.strokeRect(paX, paY, paW, paH)
  ctx.strokeRect(gaX, gaY, gaW, gaH)
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 2.5
  ctx.strokeRect(glX, glY, glW, glH)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(penX, penY, 3, 0, 2 * Math.PI)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 1.5
  const hdRx = vert ? hPAc * 0.227 : hPAm * 0.555,
    hdRy = vert ? hPAm * 0.555 : hPAc * 0.227
  if (goalB) {
    ctx.beginPath()
    ctx.ellipse(penX, penY, hdRx, hdRy, 0, toR(219), toR(321), false)
    ctx.stroke()
  }
  if (goalT) {
    ctx.beginPath()
    ctx.ellipse(penX, penY, hdRx, hdRy, 0, toR(39), toR(141), false)
    ctx.stroke()
  }
  if (goalL) {
    ctx.beginPath()
    ctx.ellipse(penX, penY, hdRx, hdRy, 0, toR(-51), toR(51), false)
    ctx.stroke()
  }
  if (goalR) {
    ctx.beginPath()
    ctx.ellipse(penX, penY, hdRx, hdRy, 0, toR(129), toR(231), false)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.beginPath()
  ctx.ellipse(FX, FY, 6, 6, 0, 0, toR(90), false)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(FX + FW, FY, 6, 6, 0, toR(90), toR(180), false)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(FX, FY + FH, 6, 6, 0, toR(270), toR(360), false)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(FX + FW, FY + FH, 6, 6, 0, toR(180), toR(270), false)
  ctx.stroke()
}

export function pijl(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, kleur?: string) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const s = 11
  ctx.save()
  ctx.fillStyle = kleur || 'white'
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - s * Math.cos(angle - 0.42), y2 - s * Math.sin(angle - 0.42))
  ctx.lineTo(x2 - s * Math.cos(angle + 0.42), y2 - s * Math.sin(angle + 0.42))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function tekenlijn(ctx: CanvasRenderingContext2D, l: Lijn) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const W = '#ffffff'

  if (l.type === 'looplijn') {
    ctx.strokeStyle = W
    ctx.lineWidth = 2.6
    ctx.setLineDash([9, 5])
    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1)
    ctx.lineTo(l.x2, l.y2)
    ctx.stroke()
    pijl(ctx, l.x1, l.y1, l.x2, l.y2, W)
  } else if (l.type === 'passlijn') {
    ctx.strokeStyle = W
    ctx.lineWidth = 2.6
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1)
    ctx.lineTo(l.x2, l.y2)
    ctx.stroke()
    pijl(ctx, l.x1, l.y1, l.x2, l.y2, W)
  } else if (l.type === 'schietlijn') {
    const dx = l.x2 - l.x1,
      dy = l.y2 - l.y1
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / dist,
      uy = dy / dist,
      nx = -uy,
      ny = ux
    ctx.strokeStyle = W
    ctx.lineWidth = 3.2
    ctx.setLineDash([])
    ctx.lineJoin = 'miter'
    ctx.miterLimit = 6
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1)
    if (dist > 46) {
      const A = Math.min(11, dist * 0.11)
      const t1 = 0.6,
        t2 = 0.4
      ctx.lineTo(l.x1 + ux * dist * t1 + nx * A, l.y1 + uy * dist * t1 + ny * A)
      ctx.lineTo(l.x1 + ux * dist * t2 - nx * A, l.y1 + uy * dist * t2 - ny * A)
    }
    ctx.lineTo(l.x2, l.y2)
    ctx.stroke()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    pijl(ctx, l.x1, l.y1, l.x2, l.y2, W)
  } else if (l.type === 'dribbellijn') {
    const dx = l.x2 - l.x1,
      dy = l.y2 - l.y1
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / dist,
      uy = dy / dist
    const nx = -uy,
      ny = ux
    const pijlLengte = 10
    const eind = Math.max(2, dist - pijlLengte)
    const golf = 22,
      amp = 5.2
    const n = Math.max(16, Math.round(eind / 1.2))
    const pnt: [number, number][] = []
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * eind
      const demp = Math.min(1, (1 - i / n) / 0.16)
      const o = Math.sin((s / golf) * Math.PI * 2) * amp * demp
      pnt.push([l.x1 + ux * s + nx * o, l.y1 + uy * s + ny * o])
    }
    ctx.strokeStyle = W
    ctx.lineWidth = 2.6
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(pnt[0][0], pnt[0][1])
    for (let i = 1; i < pnt.length - 1; i++) {
      const mx = (pnt[i][0] + pnt[i + 1][0]) / 2,
        my = (pnt[i][1] + pnt[i + 1][1]) / 2
      ctx.quadraticCurveTo(pnt[i][0], pnt[i][1], mx, my)
    }
    ctx.lineTo(pnt[n][0], pnt[n][1])
    ctx.stroke()
    pijl(ctx, l.x1, l.y1, l.x2, l.y2, W)
  } else if (l.type === 'voorzetlijn') {
    const b = Number(l.bocht) === -1 ? -1 : 1
    const cx2 = (l.x1 + l.x2) / 2 - (l.y2 - l.y1) * 0.28 * b
    const cy2 = (l.y1 + l.y2) / 2 + (l.x2 - l.x1) * 0.28 * b
    ctx.strokeStyle = W
    ctx.lineWidth = 2.6
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1)
    ctx.quadraticCurveTo(cx2, cy2, l.x2, l.y2)
    ctx.stroke()
    pijl(ctx, cx2, cy2, l.x2, l.y2, W)
  }

  if (l.nr) {
    let lx = l.x1 + (l.x2 - l.x1) * 0.22
    let ly = l.y1 + (l.y2 - l.y1) * 0.22
    const rx = l.x2 - l.x1,
      ry = l.y2 - l.y1
    const len = Math.sqrt(rx * rx + ry * ry) || 1
    lx += (-ry / len) * 13
    ly += (rx / len) * 13
    ctx.setLineDash([])
    ctx.font = "800 15px 'Helvetica Neue',Arial,sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 3.5
    ctx.lineJoin = 'round'
    ctx.strokeStyle = l.nrDonker ? 'rgba(255,255,255,0.95)' : 'rgba(14,18,24,0.9)'
    ctx.strokeText(String(l.nr), lx, ly)
    ctx.fillStyle = l.nrDonker ? '#0e1218' : '#ffffff'
    ctx.fillText(String(l.nr), lx, ly)
  }
  ctx.restore()
}

interface NotitieOpmaak {
  regels: string[]
  fs: number
  regelH: number
  pad: number
  b: number
  h: number
}

export function notitieOpmaak(ctx: CanvasRenderingContext2D, el: Elem, k: number): NotitieOpmaak {
  const tekst = String(el.tekst || 'Notitie')
  const fs = Math.max(9, 11.5 * k)
  const maxB = 160 * k
  ctx.font = `600 ${fs.toFixed(1)}px 'Helvetica Neue',Arial,sans-serif`
  let regels: string[] = []
  tekst.split('\n').forEach((stuk) => {
    let huidig = ''
    stuk
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => {
        while (ctx.measureText(w).width > maxB && w.length > 1) {
          let knip = w.length
          while (knip > 1 && ctx.measureText(w.slice(0, knip)).width > maxB) knip--
          if (huidig) {
            regels.push(huidig)
            huidig = ''
          }
          regels.push(w.slice(0, knip))
          w = w.slice(knip)
        }
        const proef = huidig ? huidig + ' ' + w : w
        if (ctx.measureText(proef).width > maxB && huidig) {
          regels.push(huidig)
          huidig = w
        } else huidig = proef
      })
    regels.push(huidig)
  })
  if (regels.length === 0) regels = ['']
  let breedste = 0
  regels.forEach((r) => {
    breedste = Math.max(breedste, ctx.measureText(r).width)
  })
  const pad = fs * 0.75
  return {
    regels,
    fs,
    regelH: fs * 1.32,
    pad,
    b: breedste + pad * 2,
    h: regels.length * (fs * 1.32) + pad * 1.6,
  }
}

export function isZone(type: string) {
  return String(type || '').indexOf('zone-') === 0
}

export interface MateriaalInfo {
  id: string
  label: string
  icoon: string
  draai: boolean
}
export const MATERIAAL: MateriaalInfo[] = [
  { id: 'dummy', label: 'Pop', icoon: 'fa-solid fa-person', draai: false },
  { id: 'ladder', label: 'Speedladder', icoon: 'fa-solid fa-table-cells', draai: true },
  { id: 'hordje', label: 'Hordje', icoon: 'fa-solid fa-archway', draai: true },
  { id: 'stok', label: 'Slalomstok', icoon: 'fa-solid fa-grip-lines-vertical', draai: false },
  { id: 'hoedje', label: 'Hoedje', icoon: 'fa-regular fa-circle', draai: false },
  { id: 'minidoel', label: 'Klein doel', icoon: 'fa-solid fa-goal-net', draai: true },
  { id: 'ring', label: 'Ring', icoon: 'fa-regular fa-circle-dot', draai: false },
  { id: 'mand', label: 'Ballenmand', icoon: 'fa-solid fa-basket-shopping', draai: false },
]
export function isMateriaal(type: string) {
  return MATERIAAL.some((m) => m.id === type)
}
export function materiaalInfo(type: string) {
  return MATERIAAL.find((m) => m.id === type) || null
}

export interface ZoneKleurInfo {
  id: string
  vul: string
  rand: string
  label: string
}
export const ZONE_KLEUREN: ZoneKleurInfo[] = [
  { id: 'blauw', vul: 'rgba(56,150,255,0.30)', rand: '#5cc4ff', label: 'Blauw' },
  { id: 'rood', vul: 'rgba(230,60,75,0.28)', rand: '#ff7b88', label: 'Rood' },
  { id: 'grijs', vul: 'rgba(235,240,246,0.26)', rand: '#ffffff', label: 'Grijs' },
]
export interface ZoneVormInfo {
  id: string
  icoon: string
  label: string
  b: number
  h: number
}
export const ZONE_VORMEN: ZoneVormInfo[] = [
  { id: 'zone-cirkel', icoon: 'fa-regular fa-circle', label: 'Cirkel', b: 90, h: 90 },
  { id: 'zone-vierkant', icoon: 'fa-regular fa-square', label: 'Vierkant', b: 90, h: 90 },
  { id: 'zone-driehoek', icoon: 'fa-solid fa-play', label: 'Driehoek', b: 110, h: 95 },
]
export function zoneVormInfo(id: string) {
  return ZONE_VORMEN.find((v) => v.id === id) || ZONE_VORMEN[0]
}
export function zoneKleurInfo(id?: string) {
  return ZONE_KLEUREN.find((z) => z.id === id) || ZONE_KLEUREN[0]
}

export function afstandTotLijn(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1,
    dy = y2 - y1
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  const qx = x1 + t * dx,
    qy = y1 + t * dy
  return Math.sqrt((px - qx) * (px - qx) + (py - qy) * (py - qy))
}

export function draaibaar(type: string) {
  if (type === 'goal' || isZone(type)) return true
  const m = materiaalInfo(type)
  return !!(m && m.draai)
}
export function draaiAfstand(el: Elem, k: number) {
  if (isZone(el.type)) return Math.max(34, (Number(el.h) || 90) / 2 + 26)
  return Math.max(34, 30 * k + 22)
}

export function tekenelement(ctx: CanvasRenderingContext2D, el: Elem, gekozen?: boolean) {
  ctx.save()
  const x = el.x,
    y = el.y
  const k = Math.max(0.4, Math.min(3, Number(el.schaal) || 1))
  ctx.setLineDash([])

  if (el.type === 'speler' || el.type === 'speler-rood') {
    const r = 15 * k
    ctx.fillStyle = el.type === 'speler-rood' ? '#dc3545' : '#004aad'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2 * Math.sqrt(k)
    ctx.stroke()
    ctx.fillStyle = 'white'
    ctx.font = `bold ${(11 * k).toFixed(1)}px 'Helvetica Neue',Arial,sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(el.nr || ''), x, y)
    if (el.naam) {
      const voornaam = String(el.naam).split(' ')[0]
      const fs = Math.max(8, 9.5 * k)
      ctx.font = `bold ${fs.toFixed(1)}px 'Helvetica Neue',Arial,sans-serif`
      const bw = ctx.measureText(voornaam).width + 8
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      const by = y + r + 3
      if (ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(x - bw / 2, by, bw, fs + 5, 4)
        ctx.fill()
      } else ctx.fillRect(x - bw / 2, by, bw, fs + 5)
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'top'
      ctx.fillText(voornaam, x, by + 2.5)
      ctx.textBaseline = 'middle'
    }
  } else if (el.type === 'bal') {
    const r = 9.5 * k
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.92, r * 0.95, r * 0.34, 0, 0, Math.PI * 2)
    ctx.fill()
    const bol = ctx.createRadialGradient(x - r * 0.34, y - r * 0.4, r * 0.15, x, y, r)
    bol.addColorStop(0, '#ffffff')
    bol.addColorStop(0.72, '#f4f6f8')
    bol.addColorStop(1, '#d3d8de')
    ctx.fillStyle = bol
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#15181d'
    function vlak(cx: number, cy: number, straal: number, draai: number) {
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const hoek = draai + (i * Math.PI * 2) / 5
        const px = cx + Math.cos(hoek) * straal,
          py = cy + Math.sin(hoek) * straal
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    }
    vlak(x, y, r * 0.36, -Math.PI / 2)
    for (let v = 0; v < 5; v++) {
      const hk = -Math.PI / 2 + (v * Math.PI * 2) / 5 + Math.PI / 5
      vlak(x + Math.cos(hk) * r * 0.72, y + Math.sin(hk) * r * 0.72, r * 0.24, hk + Math.PI / 2)
    }
    ctx.strokeStyle = 'rgba(20,24,30,0.75)'
    ctx.lineWidth = Math.max(0.8, 1.1 * Math.sqrt(k))
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
  } else if (el.type === 'pion') {
    const h = 15 * k,
      b = 9.5 * k,
      g = 13 * k
    ctx.fillStyle = '#d95f00'
    ctx.beginPath()
    ctx.ellipse(x, y + 10 * k, g, 4.2 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    const kegel = ctx.createLinearGradient(x - b, y, x + b, y)
    kegel.addColorStop(0, '#ff8c1a')
    kegel.addColorStop(0.42, '#ff6a00')
    kegel.addColorStop(1, '#cc5200')
    ctx.fillStyle = kegel
    ctx.beginPath()
    ctx.moveTo(x, y - h)
    ctx.quadraticCurveTo(x + 4.5 * k, y - 4 * k, x + b, y + 9 * k)
    ctx.lineTo(x - b, y + 9 * k)
    ctx.quadraticCurveTo(x - 4.5 * k, y - 4 * k, x, y - h)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.beginPath()
    ctx.moveTo(x - 4.4 * k, y - 1.5 * k)
    ctx.lineTo(x + 4.4 * k, y - 1.5 * k)
    ctx.lineTo(x + 5.9 * k, y + 3.2 * k)
    ctx.lineTo(x - 5.9 * k, y + 3.2 * k)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1 * Math.sqrt(k)
    ctx.beginPath()
    ctx.moveTo(x, y - h)
    ctx.quadraticCurveTo(x + 4.5 * k, y - 4 * k, x + b, y + 9 * k)
    ctx.lineTo(x - b, y + 9 * k)
    ctx.quadraticCurveTo(x - 4.5 * k, y - 4 * k, x, y - h)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(x, y + 10 * k, g, 4.2 * k, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (el.type === 'dummy') {
    const b = 9 * k,
      h = 26 * k
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(x, y + h * 0.42, b * 1.15, b * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#3b4250'
    ctx.beginPath()
    ctx.ellipse(x, y + h * 0.4, b * 0.95, b * 0.33, 0, 0, Math.PI * 2)
    ctx.fill()
    const lijf = ctx.createLinearGradient(x - b, y, x + b, y)
    lijf.addColorStop(0, '#e8404f')
    lijf.addColorStop(0.45, '#cc2233')
    lijf.addColorStop(1, '#9e1a28')
    ctx.fillStyle = lijf
    ctx.beginPath()
    ctx.moveTo(x - b * 0.34, y - h * 0.22)
    ctx.quadraticCurveTo(x - b * 0.95, y + h * 0.1, x - b * 0.62, y + h * 0.38)
    ctx.lineTo(x + b * 0.62, y + h * 0.38)
    ctx.quadraticCurveTo(x + b * 0.95, y + h * 0.1, x + b * 0.34, y - h * 0.22)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y - h * 0.32, b * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(20,24,31,0.4)'
    ctx.lineWidth = Math.max(0.8, 1 * k)
    ctx.stroke()
  } else if (el.type === 'ladder') {
    const hk = ((Number(el.hoek) || 0) * Math.PI) / 180
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(hk)
    const b = 22 * k,
      h = 62 * k,
      vakken = 6
    ctx.fillStyle = 'rgba(0,0,0,0.16)'
    ctx.fillRect(-b / 2 + 1.5, -h / 2 + 2, b, h)
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    ctx.fillRect(-b / 2, -h / 2, b, h)
    ctx.strokeStyle = '#ffd400'
    ctx.lineWidth = Math.max(1.4, 2 * k)
    ctx.setLineDash([])
    ctx.strokeRect(-b / 2, -h / 2, b, h)
    for (let i = 1; i < vakken; i++) {
      const yy = -h / 2 + (h / vakken) * i
      ctx.beginPath()
      ctx.moveTo(-b / 2, yy)
      ctx.lineTo(b / 2, yy)
      ctx.stroke()
    }
    ctx.restore()
  } else if (el.type === 'hordje') {
    const hk2 = ((Number(el.hoek) || 0) * Math.PI) / 180
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(hk2)
    const b = 20 * k,
      h = 12 * k
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath()
    ctx.ellipse(0, h * 0.55, b * 0.55, b * 0.16, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffa000'
    ctx.lineWidth = Math.max(1.6, 2.4 * k)
    ctx.lineCap = 'round'
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(-b / 2, h / 2)
    ctx.lineTo(-b / 2, -h / 2)
    ctx.lineTo(b / 2, -h / 2)
    ctx.lineTo(b / 2, h / 2)
    ctx.stroke()
    ctx.restore()
  } else if (el.type === 'stok') {
    const b3 = 3 * k,
      h3 = 30 * k
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath()
    ctx.ellipse(x, y + h3 * 0.46, 7 * k, 2.6 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2f3a4a'
    ctx.beginPath()
    ctx.ellipse(x, y + h3 * 0.44, 6 * k, 2.2 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#f5f7fa' : '#e03a3a'
      ctx.fillRect(x - b3 / 2, y - h3 * 0.46 + ((h3 * 0.9) / 4) * i, b3, (h3 * 0.9) / 4)
    }
    ctx.strokeStyle = 'rgba(20,24,31,0.45)'
    ctx.lineWidth = Math.max(0.7, 0.9 * k)
    ctx.strokeRect(x - b3 / 2, y - h3 * 0.46, b3, h3 * 0.9)
  } else if (el.type === 'hoedje') {
    const r4 = 9 * k
    ctx.fillStyle = 'rgba(0,0,0,0.20)'
    ctx.beginPath()
    ctx.ellipse(x, y + r4 * 0.3, r4, r4 * 0.36, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffb020'
    ctx.beginPath()
    ctx.ellipse(x, y + r4 * 0.16, r4, r4 * 0.36, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff8c00'
    ctx.beginPath()
    ctx.ellipse(x, y, r4 * 0.62, r4 * 0.24, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(20,24,31,0.35)'
    ctx.lineWidth = Math.max(0.7, 0.9 * k)
    ctx.beginPath()
    ctx.ellipse(x, y + r4 * 0.16, r4, r4 * 0.36, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (el.type === 'minidoel') {
    const hk5 = ((Number(el.hoek) || 0) * Math.PI) / 180
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(hk5)
    const b5 = 30 * k,
      h5 = 13 * k
    ctx.fillStyle = 'rgba(0,0,0,0.20)'
    ctx.beginPath()
    ctx.ellipse(0, h5 * 0.55, b5 * 0.5, b5 * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.fillRect(-b5 / 2, -h5 / 2, b5, h5)
    ctx.strokeStyle = 'rgba(255,255,255,0.42)'
    ctx.lineWidth = Math.max(0.5, 0.7 * k)
    for (let i = 1; i < 5; i++) {
      const xx = -b5 / 2 + (b5 / 5) * i
      ctx.beginPath()
      ctx.moveTo(xx, -h5 / 2)
      ctx.lineTo(xx, h5 / 2)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(20,24,31,0.5)'
    ctx.lineWidth = Math.max(2, 2.8 * k) + 1.4
    ctx.beginPath()
    ctx.moveTo(-b5 / 2, h5 / 2)
    ctx.lineTo(-b5 / 2, -h5 / 2)
    ctx.lineTo(b5 / 2, -h5 / 2)
    ctx.lineTo(b5 / 2, h5 / 2)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(2, 2.8 * k)
    ctx.beginPath()
    ctx.moveTo(-b5 / 2, h5 / 2)
    ctx.lineTo(-b5 / 2, -h5 / 2)
    ctx.lineTo(b5 / 2, -h5 / 2)
    ctx.lineTo(b5 / 2, h5 / 2)
    ctx.stroke()
    ctx.restore()
  } else if (el.type === 'ring') {
    const r6 = 11 * k
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(x, y + r6 * 0.22, r6, r6 * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffd400'
    ctx.lineWidth = Math.max(2.2, 3.2 * k)
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.ellipse(x, y, r6, r6 * 0.4, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(20,24,31,0.35)'
    ctx.lineWidth = Math.max(0.6, 0.8 * k)
    ctx.beginPath()
    ctx.ellipse(x, y, r6, r6 * 0.4, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (el.type === 'mand') {
    const b7 = 16 * k,
      h7 = 13 * k
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath()
    ctx.ellipse(x, y + h7 * 0.62, b7 * 0.55, b7 * 0.17, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#14181f'
    ctx.lineWidth = Math.max(0.6, 0.8 * k)
    ;[
      [-0.26, -0.3],
      [0.24, -0.34],
      [0, -0.14],
    ].forEach((p) => {
      ctx.beginPath()
      ctx.arc(x + p[0] * b7, y + p[1] * h7, b7 * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })
    ctx.fillStyle = '#2f6fb5'
    ctx.beginPath()
    ctx.moveTo(x - b7 / 2, y - h7 * 0.1)
    ctx.lineTo(x + b7 / 2, y - h7 * 0.1)
    ctx.lineTo(x + b7 * 0.38, y + h7 * 0.55)
    ctx.lineTo(x - b7 * 0.38, y + h7 * 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = Math.max(0.6, 0.9 * k)
    for (let i = 1; i < 4; i++) {
      const t7 = i / 4
      ctx.beginPath()
      ctx.moveTo(x - b7 / 2 + b7 * 0.12 * t7, y - h7 * 0.1 + h7 * 0.65 * t7)
      ctx.lineTo(x + b7 / 2 - b7 * 0.12 * t7, y - h7 * 0.1 + h7 * 0.65 * t7)
      ctx.stroke()
    }
  } else if (el.type === 'goal') {
    const hoek = ((Number(el.hoek) || 0) * Math.PI) / 180
    const w = 46 * k,
      hp = 17 * k,
      dep = 14 * k,
      kr = 0.82
    const co = Math.cos(hoek),
      si = Math.sin(hoek)
    const grond = [
      [-w / 2, 0],
      [w / 2, 0],
      [(w * kr) / 2, -dep],
      [(-w * kr) / 2, -dep],
    ].map((p) => [p[0] * co - p[1] * si, p[0] * si + p[1] * co])
    let gx0 = 1e9,
      gx1 = -1e9,
      gy0 = 1e9,
      gy1 = -1e9
    grond.forEach((p) => {
      gx0 = Math.min(gx0, p[0])
      gx1 = Math.max(gx1, p[0])
      gy0 = Math.min(gy0, p[1])
      gy1 = Math.max(gy1, p[1])
    })
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.20)'
    ctx.beginPath()
    ctx.ellipse(
      x + (gx0 + gx1) / 2,
      y + (gy0 + gy1) / 2,
      Math.max(6, ((gx1 - gx0) / 2) * 0.92),
      Math.max(4, ((gy1 - gy0) / 2) * 0.92),
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(hoek)

    const f: [number, number][] = [
      [-w / 2, 0],
      [w / 2, 0],
      [w / 2, -hp],
      [-w / 2, -hp],
    ]
    const b: [number, number][] = f.map((p) => [p[0] * kr, p[1] * kr - dep])

    function vlak(pts: [number, number][], vulling: string) {
      ctx.beginPath()
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p[0], p[1])
        else ctx.lineTo(p[0], p[1])
      })
      ctx.closePath()
      ctx.fillStyle = vulling
      ctx.fill()
    }
    function maas(p1: [number, number], p2: [number, number], p3: [number, number], p4: [number, number], n1: number, n2: number) {
      ctx.strokeStyle = 'rgba(255,255,255,0.42)'
      ctx.lineWidth = Math.max(0.5, 0.7 * k)
      for (let i = 1; i < n1; i++) {
        const t = i / n1
        ctx.beginPath()
        ctx.moveTo(p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)
        ctx.lineTo(p4[0] + (p3[0] - p4[0]) * t, p4[1] + (p3[1] - p4[1]) * t)
        ctx.stroke()
      }
      for (let j = 1; j < n2; j++) {
        const t = j / n2
        ctx.beginPath()
        ctx.moveTo(p1[0] + (p4[0] - p1[0]) * t, p1[1] + (p4[1] - p1[1]) * t)
        ctx.lineTo(p2[0] + (p3[0] - p2[0]) * t, p2[1] + (p3[1] - p2[1]) * t)
        ctx.stroke()
      }
    }

    vlak(b, 'rgba(255,255,255,0.20)')
    vlak([f[3], f[2], b[2], b[3]], 'rgba(255,255,255,0.13)')
    vlak([f[0], f[3], b[3], b[0]], 'rgba(255,255,255,0.10)')
    vlak([f[1], f[2], b[2], b[1]], 'rgba(255,255,255,0.10)')

    ctx.setLineDash([])
    maas(b[0], b[1], b[2], b[3], 6, 4)
    maas(f[3], f[2], b[2], b[3], 6, 3)
    maas(f[0], f[3], b[3], b[0], 3, 3)
    maas(f[1], f[2], b[2], b[1], 3, 3)

    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = Math.max(0.8, 1.1 * k)
    ;[
      [f[2], b[2]],
      [f[3], b[3]],
      [f[0], b[0]],
      [f[1], b[1]],
    ].forEach((pr) => {
      ctx.beginPath()
      ctx.moveTo(pr[0][0], pr[0][1])
      ctx.lineTo(pr[1][0], pr[1][1])
      ctx.stroke()
    })

    ctx.strokeStyle = 'rgba(255,255,255,0.65)'
    ctx.lineWidth = Math.max(1, 1.4 * k)
    ctx.beginPath()
    ctx.moveTo(b[3][0], b[3][1])
    ctx.lineTo(b[2][0], b[2][1])
    ctx.lineTo(b[1][0], b[1][1])
    ctx.moveTo(b[3][0], b[3][1])
    ctx.lineTo(b[0][0], b[0][1])
    ctx.stroke()

    const dik = Math.max(2, 3.1 * k)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(20,24,31,0.5)'
    ctx.lineWidth = dik + Math.max(1.2, 1.6 * k)
    ctx.beginPath()
    ctx.moveTo(f[0][0], f[0][1])
    ctx.lineTo(f[3][0], f[3][1])
    ctx.lineTo(f[2][0], f[2][1])
    ctx.lineTo(f[1][0], f[1][1])
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = dik
    ctx.beginPath()
    ctx.moveTo(f[0][0], f[0][1])
    ctx.lineTo(f[3][0], f[3][1])
    ctx.lineTo(f[2][0], f[2][1])
    ctx.lineTo(f[1][0], f[1][1])
    ctx.stroke()

    ctx.restore()
  } else if (el.type === 'cirkel') {
    ctx.strokeStyle = 'rgba(255,255,150,0.75)'
    ctx.lineWidth = 2 * Math.sqrt(k)
    ctx.setLineDash([5 * k, 4 * k])
    ctx.beginPath()
    ctx.arc(x, y, 30 * k, 0, Math.PI * 2)
    ctx.stroke()
  } else if (el.type === 'notitie') {
    const o = notitieOpmaak(ctx, el, k)
    const x0 = x - o.b / 2,
      y0 = y - o.h / 2
    const r0 = Math.min(9 * k, o.h / 3)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(0,0,0,0.30)'
    if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(x0 + 1.5, y0 + 2.5, o.b, o.h, r0)
      ctx.fill()
    } else ctx.fillRect(x0 + 1.5, y0 + 2.5, o.b, o.h)
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.strokeStyle = 'rgba(20,24,31,0.35)'
    ctx.lineWidth = Math.max(1, 1.2 * k)
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x0, y0, o.b, o.h, r0)
    else ctx.rect(x0, y0, o.b, o.h)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#004aad'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x0, y0, Math.max(3, 3.5 * k), o.h, [r0, 0, 0, r0])
    else ctx.rect(x0, y0, Math.max(3, 3.5 * k), o.h)
    ctx.fill()
    ctx.fillStyle = '#14181f'
    ctx.font = `600 ${o.fs.toFixed(1)}px 'Helvetica Neue',Arial,sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    o.regels.forEach((r, i) => {
      ctx.fillText(r, x0 + o.pad + Math.max(3, 3.5 * k) * 0.6, y0 + o.pad * 0.8 + i * o.regelH)
    })
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
  } else if (isZone(el.type)) {
    ctx.save()
    const zh = ((Number(el.hoek) || 0) * Math.PI) / 180
    if (zh) {
      ctx.translate(x, y)
      ctx.rotate(zh)
      ctx.translate(-x, -y)
    }
    const kl = zoneKleurInfo(el.kleur)
    const b = Math.max(14, Number(el.b) || 70)
    const h = Math.max(14, Number(el.h) || 70)
    ctx.setLineDash([])
    ctx.fillStyle = kl.vul
    ctx.strokeStyle = kl.rand
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    if (el.type === 'zone-cirkel') {
      ctx.beginPath()
      ctx.ellipse(x, y, b / 2, h / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (el.type === 'zone-driehoek') {
      ctx.beginPath()
      ctx.moveTo(x, y - h / 2)
      ctx.lineTo(x + b / 2, y + h / 2)
      ctx.lineTo(x - b / 2, y + h / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else {
      const r = Math.min(10, b / 6, h / 6)
      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(x - b / 2, y - h / 2, b, h, r)
      } else {
        ctx.moveTo(x - b / 2 + r, y - h / 2)
        ctx.lineTo(x + b / 2 - r, y - h / 2)
        ctx.quadraticCurveTo(x + b / 2, y - h / 2, x + b / 2, y - h / 2 + r)
        ctx.lineTo(x + b / 2, y + h / 2 - r)
        ctx.quadraticCurveTo(x + b / 2, y + h / 2, x + b / 2 - r, y + h / 2)
        ctx.lineTo(x - b / 2 + r, y + h / 2)
        ctx.quadraticCurveTo(x - b / 2, y + h / 2, x - b / 2, y + h / 2 - r)
        ctx.lineTo(x - b / 2, y - h / 2 + r)
        ctx.quadraticCurveTo(x - b / 2, y - h / 2, x - b / 2 + r, y - h / 2)
        ctx.closePath()
      }
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }

  if (gekozen && draaibaar(el.type)) {
    const h2 = ((Number(el.hoek) || 0) * Math.PI) / 180
    const R = draaiAfstand(el, k)
    const hx = x + Math.sin(h2) * R,
      hy = y - Math.cos(h2) * R
    ctx.save()
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = 'rgba(255,212,0,0.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(hx, hy)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(hx, hy, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#ffd400'
    ctx.fill()
    ctx.strokeStyle = 'rgba(20,24,31,0.75)'
    ctx.lineWidth = 1.6
    ctx.stroke()
    ctx.strokeStyle = '#14181f'
    ctx.lineWidth = 1.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(hx, hy, 3.6, 0.6, 5.0)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(hx + 2.0, hy - 3.4)
    ctx.lineTo(hx + 3.9, hy - 1.6)
    ctx.lineTo(hx + 1.2, hy - 1.0)
    ctx.closePath()
    ctx.fillStyle = '#14181f'
    ctx.fill()
    ctx.restore()
  }

  if (gekozen) {
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = '#ffd400'
    ctx.lineWidth = 2
    if (el.type === 'notitie') {
      const o2 = notitieOpmaak(ctx, el, k)
      ctx.strokeRect(x - o2.b / 2 - 5, y - o2.h / 2 - 5, o2.b + 10, o2.h + 10)
    } else if (isZone(el.type)) {
      const b = (Number(el.b) || 70) / 2 + 6,
        h = (Number(el.h) || 70) / 2 + 6
      ctx.strokeRect(x - b, y - h, b * 2, h * 2)
    } else {
      const straal = (el.type === 'cirkel' ? 30 : el.type === 'goal' ? 22 : 17) * k + 6
      ctx.beginPath()
      ctx.arc(x, y, straal, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()
}

export interface PerspectiefStand {
  id: string
  label: string
  k: number
  icoon: string
}
export const PERSPECTIEF_STANDEN: PerspectiefStand[] = [
  { id: 'plat', label: 'Plat', k: 1, icoon: 'fa-solid fa-square' },
  { id: 'licht', label: 'Schuin', k: 0.68, icoon: 'fa-solid fa-panorama' },
  { id: 'sterk', label: 'Laag', k: 0.46, icoon: 'fa-solid fa-mountain-sun' },
]
export function perspectiefInfo(id: string) {
  return PERSPECTIEF_STANDEN.find((p) => p.id === id) || PERSPECTIEF_STANDEN[0]
}

export function projecteerPerspectief(
  bron: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  B: number,
  H: number,
  k: number,
  achtergrond?: string,
) {
  if (!k || k >= 0.999) {
    ctx.drawImage(bron, 0, 0, B, H)
    return
  }
  ctx.save()
  ctx.fillStyle = achtergrond || '#0f1a10'
  ctx.fillRect(0, 0, B, H)
  const bh = bron.height,
    bb = bron.width
  ctx.imageSmoothingEnabled = true
  for (let y = 0; y < H; y++) {
    const yy = H === 1 ? 1 : y / (H - 1)
    const s = k + (1 - k) * yy
    if (s <= 0.0001) continue
    const v = yy / s
    const sy = Math.min(bh - 1, Math.max(0, v * (bh - 1)))
    const db = B * s,
      dx = (B - db) / 2
    ctx.drawImage(bron, 0, sy, bb, 1, dx, y, db, 1.4)
  }
  ctx.restore()
}

export function tussenStand(a: Frame | undefined, b: Frame | undefined, t: number): { elems: Elem[]; lijnen: Lijn[] } {
  const soepel = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  const elemsUit = ((b && b.elems) || []).map((doel) => {
    const van = ((a && a.elems) || []).find((e) => e.id === doel.id)
    if (!van) return doel
    return { ...doel, x: van.x + (doel.x - van.x) * soepel, y: van.y + (doel.y - van.y) * soepel }
  })
  return { elems: elemsUit, lijnen: t > 0.75 ? (b && b.lijnen) || [] : (a && a.lijnen) || [] }
}

export function maakTekeningCanvas(tekening: { veldType?: string; lijnen?: Lijn[]; elems?: Elem[] } | null | undefined) {
  const vt = (tekening && tekening.veldType) || 'leeg'
  const info = veldTypeInfo(vt)
  const vel = scherpCanvas(info.w, info.h, EXPORT_FACTOR)
  const { canvas, ctx } = vel
  tekenVeld(ctx, info.w, info.h, vt)
  const lijnen = (tekening && tekening.lijnen) || []
  const elems = (tekening && tekening.elems) || []
  lijnen.forEach((l) => tekenlijn(ctx, l))
  elems.forEach((el) => tekenelement(ctx, el))
  return canvas
}
