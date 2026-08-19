// Sharing/export helpers for the tekenbord: PDF, PNG (WhatsApp-style share),
// an "all steps" strip image, and an animation video recording.
// Ported from legacy/fc-harlingen-app.html's exporteerTekeningPDF,
// deelTekeningAlsPNG, deelOfDownload, maakStappenStrook and
// exporteerAnimatieVideo. The legacy branding helpers (club logo, designer
// footer credit, toast system) don't exist in the new app, so the PDF
// header/footer is simplified to team name + date; everything else is a
// faithful port.

import { jsPDF } from 'jspdf'
import type { Frame } from './types'
import { EXPORT_FACTOR, perspectiefInfo, projecteerPerspectief, scherpCanvas, tekenelement, tekenlijn, tekenVeld, tussenStand, veldTypeInfo } from './render'

export const TEAM_NAAM = 'FC Harlingen JO19-2'

export function bewaarBestand(blob: Blob, bestandsnaam: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = bestandsnaam
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function deelOfDownload(blob: Blob, bestandsnaam: string, titel: string): Promise<'gedeeld' | 'gedownload'> {
  return new Promise((resolve) => {
    function opslaan() {
      bewaarBestand(blob, bestandsnaam)
      resolve('gedownload')
    }
    let raakscherm = false
    try {
      raakscherm = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    } catch {
      /* ignore */
    }
    if (!raakscherm) {
      opslaan()
      return
    }
    let bestand: File | null = null
    try {
      bestand = new File([blob], bestandsnaam, { type: blob.type })
    } catch {
      /* ignore */
    }
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean; share?: (data: { title: string; files: File[] }) => Promise<void> }
    if (!bestand || !nav.canShare || !nav.canShare({ files: [bestand] }) || !nav.share) {
      opslaan()
      return
    }
    nav
      .share({ title: titel, files: [bestand] })
      .then(() => resolve('gedeeld'))
      .catch(opslaan)
  })
}

function bestandsveilig(naam: string) {
  return String(naam || 'tekening')
    .replace(/[^a-z0-9\-_ ]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export async function deelTekeningAlsPNG(canvasEl: HTMLCanvasElement | null, naam?: string) {
  if (!canvasEl) throw new Error('Tekening kon niet gemaakt worden.')
  const bestandsnaam = bestandsveilig(naam || 'tekening') + '.png'
  const blob: Blob = await new Promise((resolve, reject) => {
    canvasEl.toBlob((b) => (b ? resolve(b) : reject(new Error('Tekening kon niet gemaakt worden.'))), 'image/png')
  })
  return deelOfDownload(blob, bestandsnaam, `${TEAM_NAAM} – ${naam || 'Tekening'}`)
}

function pdfVoet(doc: jsPDF, W: number, H: number, pagina: number, paginas: number) {
  doc.setDrawColor(225, 229, 234)
  doc.setLineWidth(0.3)
  doc.line(16, H - 14, W - 16, H - 14)
  doc.setTextColor(140, 148, 160)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`${TEAM_NAAM}  ·  ${new Date().toLocaleDateString('nl-NL')}`, 16, H - 8.5)
  if (paginas > 1) doc.text(`${pagina} / ${paginas}`, W - 16, H - 8.5, { align: 'right' })
}

export interface TekeningPdfInfo {
  type?: string
  doel?: string
  duur?: number
  aantalSpelers?: number
  leeftijd?: string
  veldGrootte?: string
  materialen?: string
  beschrijving?: string
  aandachtspunten?: string
  notities?: string
}

export function exporteerTekeningPDF(naam: string, canvasEl: HTMLCanvasElement | null, info?: TekeningPdfInfo) {
  if (!canvasEl) throw new Error('Tekening kon niet gemaakt worden.')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210,
    H = 297,
    M = 16
  const gegevens = info || {}

  doc.setFillColor(6, 47, 110)
  doc.rect(0, 0, W, 30, 'F')
  doc.setFillColor(56, 182, 255)
  doc.rect(0, 28, W, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(String(naam || 'Oefening'), M, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(170, 205, 255)
  const kopRegels: string[] = []
  if (gegevens.type) kopRegels.push(String(gegevens.type))
  if (gegevens.doel) kopRegels.push(String(gegevens.doel))
  if (gegevens.duur) kopRegels.push(`${gegevens.duur} min`)
  if (gegevens.aantalSpelers) kopRegels.push(`${gegevens.aantalSpelers} spelers`)
  if (gegevens.leeftijd) kopRegels.push(String(gegevens.leeftijd))
  doc.text(kopRegels.join('   ·   ') || TEAM_NAAM, M, 21)

  let y = 38
  try {
    const imgData = canvasEl.toDataURL('image/png')
    const aspect = canvasEl.width / canvasEl.height
    const beschB = W - 2 * M
    const beschH = 108
    let imgB = beschB,
      imgH = beschB / aspect
    if (imgH > beschH) {
      imgH = beschH
      imgB = imgH * aspect
    }
    doc.setFillColor(20, 85, 20)
    doc.roundedRect((W - imgB) / 2 - 2, y - 2, imgB + 4, imgH + 4, 2, 2, 'F')
    doc.addImage(imgData, 'PNG', (W - imgB) / 2, y, imgB, imgH)
    y += imgH + 10
  } catch {
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(10)
    doc.text('De tekening kon niet worden meegenomen.', M, y)
    y += 10
  }

  function blok(titel: string, tekst: string | undefined, accent?: boolean) {
    if (!tekst || !String(tekst).trim()) return
    const regels = doc.splitTextToSize(String(tekst).trim(), W - 2 * M - 6)
    const hoogte = regels.length * 4.6 + 12
    if (y + hoogte > H - 22) {
      doc.addPage()
      y = M
    }
    doc.setFillColor(accent ? 255 : 246, accent ? 247 : 248, accent ? 234 : 251)
    doc.roundedRect(M, y, W - 2 * M, hoogte, 2, 2, 'F')
    const accentKleur: [number, number, number] = accent ? [253, 126, 20] : [0, 74, 173]
    doc.setFillColor(accentKleur[0], accentKleur[1], accentKleur[2])
    doc.rect(M, y, 1.6, hoogte, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    const tekstKleur: [number, number, number] = accent ? [140, 70, 10] : [0, 58, 138]
    doc.setTextColor(tekstKleur[0], tekstKleur[1], tekstKleur[2])
    doc.text(titel.toUpperCase(), M + 6, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(35, 40, 50)
    doc.text(regels, M + 6, y + 12)
    y += hoogte + 5
  }

  const praktisch: string[] = []
  if (gegevens.veldGrootte) praktisch.push(`Veld: ${gegevens.veldGrootte}`)
  if (gegevens.materialen) praktisch.push(`Materialen: ${gegevens.materialen}`)
  if (gegevens.aantalSpelers) praktisch.push(`Spelers: ${gegevens.aantalSpelers}`)
  if (praktisch.length) blok('Benodigdheden', praktisch.join('\n'))

  blok('Uitleg', gegevens.beschrijving)
  blok('Aandachtspunten', gegevens.aandachtspunten, true)
  blok('Notities', gegevens.notities)

  if (!praktisch.length && !gegevens.beschrijving && !gegevens.aandachtspunten) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(140, 148, 160)
    doc.text('Bij deze oefening staat nog geen uitleg of materiaal ingevuld.', M, y + 4)
  }

  const pag = doc.getNumberOfPages()
  for (let p = 1; p <= pag; p++) {
    doc.setPage(p)
    pdfVoet(doc, W, H, p, pag)
  }

  const bestand = bestandsveilig(naam || 'oefening')
  doc.save(`${bestand || 'oefening'}.pdf`)
}

/* ── Alle stappen naast elkaar als één afbeelding ── */
export function maakStappenStrook(stappen: Frame[], veldType: string, naam: string, blik: string) {
  const info = veldTypeInfo(veldType)
  const n = stappen.length
  const kolommen = n <= 1 ? 1 : n <= 4 ? 2 : 3
  const rijen = Math.ceil(n / kolommen)
  const marge = 16,
    kopH = 54,
    labelH = 26
  const cel = { w: info.w, h: info.h }
  const W = marge + kolommen * (cel.w + marge)
  const H = kopH + marge + rijen * (labelH + cel.h + marge)

  const vel = scherpCanvas(W, H, EXPORT_FACTOR)
  const { canvas, ctx } = vel

  ctx.fillStyle = '#f4f6f9'
  ctx.fillRect(0, 0, W, H)
  const grad = ctx.createLinearGradient(0, 0, W, kopH)
  grad.addColorStop(0, '#062f6e')
  grad.addColorStop(1, '#004aad')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, kopH)
  ctx.fillStyle = '#ffffff'
  ctx.font = "bold 22px 'Helvetica Neue',Arial,sans-serif"
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(String(naam || 'Oefening').slice(0, 48), marge, kopH / 2 - 4)
  ctx.font = "12px 'Helvetica Neue',Arial,sans-serif"
  ctx.fillStyle = 'rgba(255,255,255,.75)'
  ctx.fillText(`${TEAM_NAAM}  ·  ${n} stappen`, marge, kopH / 2 + 16)

  stappen.forEach((s, i) => {
    const k = i % kolommen,
      r = Math.floor(i / kolommen)
    const x = marge + k * (cel.w + marge)
    const y = kopH + marge + r * (labelH + cel.h + marge)
    ctx.fillStyle = '#004aad'
    ctx.font = "bold 14px 'Helvetica Neue',Arial,sans-serif"
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`Stap ${i + 1}`, x, y + labelH / 2)

    const tv = scherpCanvas(cel.w, cel.h, EXPORT_FACTOR)
    const tijdelijk = tv.canvas,
      tctx = tv.ctx
    tekenVeld(tctx, cel.w, cel.h, veldType)
    ;(s.lijnen || []).forEach((l) => tekenlijn(tctx, l))
    ;(s.elems || []).forEach((el) => tekenelement(tctx, el))
    const kb = perspectiefInfo(blik || 'plat').k
    if (kb < 0.999) {
      const proj = document.createElement('canvas')
      proj.width = tijdelijk.width
      proj.height = tijdelijk.height
      projecteerPerspectief(tijdelijk, proj.getContext('2d')!, proj.width, proj.height, kb)
      ctx.drawImage(proj, x, y + labelH, cel.w, cel.h)
    } else {
      ctx.drawImage(tijdelijk, x, y + labelH, cel.w, cel.h)
    }
  })

  return canvas
}

/* ── Beste video-formaat dat de browser aankan ── */
function kiesVideoFormaat(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === 'undefined') return null
  const kandidaten = [
    { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ]
  for (const k of kandidaten) {
    try {
      if (MediaRecorder.isTypeSupported(k.mime)) return k
    } catch {
      /* ignore */
    }
  }
  return null
}

function tekenVideoKop(ctx: CanvasRenderingContext2D, W: number, naam: string, stapTekst: string) {
  ctx.save()
  ctx.fillStyle = 'rgba(6,26,58,0.82)'
  ctx.fillRect(0, 0, W, 34)
  ctx.fillStyle = '#ffffff'
  ctx.font = "bold 15px 'Helvetica Neue',Arial,sans-serif"
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(String(naam || 'Oefening').slice(0, 40), 12, 18)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#7fd0ff'
  ctx.font = "bold 13px 'Helvetica Neue',Arial,sans-serif"
  ctx.fillText(stapTekst, W - 12, 18)
  ctx.restore()
}

export interface AnimatieOpties {
  stappen: Frame[]
  veldType: string
  blik: string
  snelheid: number
  naam: string
  voortgang: (pct: number) => void
  klaar: (fout: string | null, blob?: Blob, ext?: string) => void
}

/* Neemt de gekozen stappen op als een korte video (canvas.captureStream +
   MediaRecorder — geen extra afhankelijkheid nodig). Geeft een afbreekfunctie
   terug, of null als opnemen niet kon starten (dan is klaar() al aangeroepen). */
export function exporteerAnimatieVideo(opties: AnimatieOpties): (() => void) | null {
  const stappen = opties.stappen || []
  const naam = opties.naam || 'Oefening'
  const perStap = opties.snelheid || 1200
  const voortgang = opties.voortgang || (() => {})
  const klaar = opties.klaar || (() => {})

  if (stappen.length < 2) {
    klaar('Maak eerst minstens twee stappen.')
    return null
  }
  const formaat = kiesVideoFormaat()
  if (!formaat) {
    klaar("Deze browser kan geen video opnemen. Gebruik 'Alle stappen' als afbeelding.")
    return null
  }

  const info = veldTypeInfo(opties.veldType)
  const vel = scherpCanvas(info.w, info.h, 3)
  const canvas = vel.canvas,
    ctx = vel.ctx

  let stream: MediaStream, recorder: MediaRecorder
  try {
    stream = canvas.captureStream(30)
    recorder = new MediaRecorder(stream, { mimeType: formaat.mime, videoBitsPerSecond: 3000000 })
  } catch (e) {
    klaar(`Opnemen lukte niet: ${(e as Error).message}`)
    return null
  }

  const brokken: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) brokken.push(e.data)
  }
  recorder.onstop = () => {
    const blob = new Blob(brokken, { type: formaat.mime })
    klaar(null, blob, formaat.ext)
  }

  const aanhoudStart = 600
  const aanhoudEind = 900
  const beweging = perStap * (stappen.length - 1)
  const totaal = aanhoudStart + beweging + aanhoudEind
  let gestopt = false
  let begin: number | null = null

  const plat = scherpCanvas(info.w, info.h, vel.factor)
  const vlakCanvas = plat.canvas,
    vctx = plat.ctx
  const kBlik = perspectiefInfo(opties.blik || 'plat').k

  function teken(scene: { elems: import('./types').Elem[]; lijnen: import('./types').Lijn[] }, stapTekst: string) {
    tekenVeld(vctx, info.w, info.h, opties.veldType)
    ;(scene.lijnen || []).forEach((l) => tekenlijn(vctx, l))
    ;(scene.elems || []).forEach((el) => tekenelement(vctx, el))
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    projecteerPerspectief(vlakCanvas, ctx, canvas.width, canvas.height, kBlik)
    ctx.restore()
    tekenVideoKop(ctx, info.w, naam, stapTekst)
  }

  function frame(nu: number) {
    if (gestopt) return
    if (begin === null) begin = nu
    const t = nu - begin
    let scene: { elems: import('./types').Elem[]; lijnen: import('./types').Lijn[] }
    let label: string
    if (t < aanhoudStart) {
      scene = stappen[0]
      label = `Stap 1 / ${stappen.length}`
    } else if (t < aanhoudStart + beweging) {
      const v = t - aanhoudStart
      const i = Math.min(stappen.length - 2, Math.floor(v / perStap))
      scene = tussenStand(stappen[i], stappen[i + 1], (v - i * perStap) / perStap)
      label = `Stap ${i + 1} → ${i + 2}`
    } else {
      scene = stappen[stappen.length - 1]
      label = `Stap ${stappen.length} / ${stappen.length}`
    }
    teken(scene, label)
    voortgang(Math.min(100, Math.round((t / totaal) * 100)))
    if (t >= totaal) {
      gestopt = true
      try {
        recorder.stop()
      } catch {
        /* ignore */
      }
      return
    }
    requestAnimationFrame(frame)
  }

  teken(stappen[0], `Stap 1 / ${stappen.length}`)
  try {
    recorder.start()
  } catch (e) {
    klaar(`Opnemen lukte niet: ${(e as Error).message}`)
    return null
  }
  requestAnimationFrame(frame)

  return function afbreken() {
    gestopt = true
    try {
      recorder.stop()
    } catch {
      /* ignore */
    }
  }
}
