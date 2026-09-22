import type { createWorker as CreateWorker } from 'tesseract.js'

const MAX_BYTES = 10 * 1024 * 1024
const WHITELIST = '0123456789eEBGDAbhprxXtT|-~/\\()* '

export interface OcrProgress {
  percent: number
  message: string
}

const PHASES: Record<string, string> = {
  loading_tesseract_core: 'Carregando o leitor de imagens…',
  initializing_tesseract: 'Preparando o leitor…',
  loading_language_traineddata: 'Baixando o modelo de reconhecimento…',
  initializing_api: 'Iniciando o reconhecimento…',
  recognizing_text: 'Lendo a tablatura da imagem…',
}

export class OcrError extends Error {}

interface Prepared {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

async function toBinaryCanvas(file: File): Promise<Prepared | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(3, Math.max(1, 1600 / bitmap.width))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const px = data.data
    // Threshold adaptativo simples pela média global; inverte fundo escuro.
    let sum = 0
    for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    const mean = sum / (px.length / 4)
    const darkBackground = mean < 128
    for (let i = 0; i < px.length; i += 4) {
      const gray = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      const ink = darkBackground ? gray > mean + 40 : gray < mean - 40
      const value = ink ? 0 : 255
      px[i] = px[i + 1] = px[i + 2] = value
      px[i + 3] = 255
    }
    ctx.putImageData(data, 0, 0)
    return { canvas, ctx }
  } catch {
    return null
  }
}

interface Band {
  top: number
  bottom: number
}

/**
 * Encontra as faixas horizontais com tinta (linhas de texto). Em tablatura, as seis
 * linhas de hífens formam faixas bem marcadas; ler cada faixa separadamente evita
 * que o OCR embaralhe linhas vizinhas.
 */
function rawBands(inkPerRow: number[], threshold: number): Band[] {
  const bands: Band[] = []
  let start = -1
  for (let y = 0; y <= inkPerRow.length; y++) {
    const hasInk = y < inkPerRow.length && inkPerRow[y] >= threshold
    if (hasInk && start === -1) start = y
    if (!hasInk && start !== -1) {
      bands.push({ top: start, bottom: y })
      start = -1
    }
  }
  return bands
}

/**
 * Em tablatura, os traços de hífens são a marca horizontal mais forte da imagem e
 * aparecem em múltiplos de 6. Procura do limiar mais alto para o mais baixo até achar
 * essas linhas-âncora e expande cada uma até metade do espaçamento, para incluir os
 * números que ficam acima e abaixo do traço.
 */
export function findTextBands(inkPerRow: number[], width: number): Band[] {
  let chosen: Band[] = []
  for (const ratio of [0.35, 0.25, 0.15, 0.08, 0.04, 0.02]) {
    const bands = rawBands(inkPerRow, Math.max(2, width * ratio))
    if (bands.length >= 6 && bands.length % 6 === 0) {
      chosen = bands
      break
    }
    if (bands.length >= 6 && !chosen.length) chosen = bands
  }
  if (chosen.length < 2) return chosen

  const centers = chosen.map((b) => (b.top + b.bottom) / 2)
  const gaps = centers.slice(1).map((c, i) => c - centers[i]).sort((a, b) => a - b)
  const pitch = gaps[Math.floor(gaps.length / 2)]
  const half = pitch * 0.48
  return centers.map((c) => ({
    top: Math.max(0, Math.round(c - half)),
    bottom: Math.min(inkPerRow.length, Math.round(c + half)),
  }))
}

function inkHistogram(ctx: CanvasRenderingContext2D, width: number, height: number): number[] {
  const data = ctx.getImageData(0, 0, width, height).data
  const rows: number[] = new Array(height).fill(0)
  for (let y = 0; y < height; y++) {
    let count = 0
    const rowStart = y * width * 4
    for (let x = 0; x < width; x++) if (data[rowStart + x * 4] === 0) count++
    rows[y] = count
  }
  return rows
}

function cropBand(source: HTMLCanvasElement, band: Band, pad: number): string {
  const top = Math.max(0, band.top - pad)
  const bottom = Math.min(source.height, band.bottom + pad)
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = bottom - top
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, top, source.width, bottom - top, 0, 0, canvas.width, bottom - top)
  return canvas.toDataURL('image/png')
}

/** Corrige confusões clássicas do OCR em tablatura sem inventar notas. */
export function cleanupTabText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim())
    .map((line) => {
      if (!/[-—–_]{2,}/.test(line)) return line
      let fixed = line
        .replace(/[—–_]/g, '-')
        .replace(/[lI!¦]/g, '|')
        .replace(/[Oo]/g, '0')
        .replace(/\s*\|\s*/g, '|')
        .replace(/-\s+-/g, '--')
      // Rótulo separado do corpo por espaço: "e |---" vira "e|---".
      fixed = fixed.replace(/^\s*([eEBGDA])\s+\|/, '$1|')
      return fixed
    })
    .join('\n')
}

const LABELS = ['e', 'B', 'G', 'D', 'A', 'E']
const BODY_LOOKALIKES: Record<string, string> = { S: '5', s: '5', Z: '2', z: '2', B: '8', g: '9', q: '9', D: '0' }
const isTabLine = (line: string) => /-{3,}/.test(line) && !/[a-zA-Z]{3,}/.test(line)

/**
 * Regras de consistência para blocos de 6 linhas que o OCR leu: rótulos na ordem
 * padrão quando vieram trocados, letras que parecem dígitos dentro do corpo e linhas
 * do mesmo comprimento. Não inventa notas: só corrige o que a forma da tab garante.
 */
export function repairTabGroups(text: string): string {
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    if (!isTabLine(lines[i])) {
      i++
      continue
    }
    let end = i
    while (end < lines.length && isTabLine(lines[end])) end++
    const size = end - i
    for (let start = i; start + 6 <= end && size % 6 === 0; start += 6) {
      const group = lines.slice(start, start + 6).map((line, k) => {
        const m = /^\s*([^|\-\s]{0,2})\s*\|?(.*)$/.exec(line)!
        const body = m[2].replace(/[SsZzBgqD]/g, (c) => BODY_LOOKALIKES[c])
        const label = m[1] && LABELS.includes(m[1]) ? m[1] : LABELS[k]
        return { label, body }
      })
      const labels = group.map((g) => g.label)
      const valid = new Set(labels).size === 6 && labels.every((l) => LABELS.includes(l))
      const lengths = group.map((g) => g.body.length).sort((a, b) => a - b)
      const target = lengths[2]
      group.forEach((g, k) => {
        let body = g.body
        const closed = body.endsWith('|')
        if (closed) body = body.slice(0, -1)
        if (body.length < target - (closed ? 1 : 0)) body = body.padEnd(target - (closed ? 1 : 0), '-')
        lines[start + k] = `${valid ? g.label : LABELS[k]}|${body}${closed ? '|' : ''}`
      })
    }
    i = end
  }
  return lines.join('\n')
}

/** Quantas linhas parecem cordas de tablatura (hífens seguidos, com ou sem números). */
export function countTabLines(text: string): number {
  return text.split('\n').filter((line) => /-{3,}/.test(line) && !/[a-zA-Z]{3,}/.test(line)).length
}

export async function runOcr(file: File, onProgress: (p: OcrProgress) => void): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new OcrError('Esse arquivo não é uma imagem. Envie um print ou foto da tablatura (PNG ou JPG).')
  }
  if (file.size > MAX_BYTES) {
    throw new OcrError('A imagem é muito grande (limite de 10 MB). Tente recortar só a parte da tablatura.')
  }

  onProgress({ percent: 2, message: 'Preparando a imagem…' })
  const prepared = await toBinaryCanvas(file)

  let lineSources: string[] | null = null
  let wholeSource: string | File = file
  if (prepared) {
    wholeSource = prepared.canvas.toDataURL('image/png')
    const bands = findTextBands(inkHistogram(prepared.ctx, prepared.canvas.width, prepared.canvas.height), prepared.canvas.width)
    if (bands.length >= 6 && bands.length <= 40) {
      lineSources = bands.map((b) => cropBand(prepared.canvas, b, 2))
    }
  }

  let worker: Awaited<ReturnType<typeof CreateWorker>> | null = null
  try {
    // Tesseract só é baixado quando o usuário envia uma imagem.
    const { createWorker, PSM } = await import('tesseract.js')
    worker = await createWorker('eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status !== 'recognizing_text') {
          onProgress({ percent: Math.round(Math.max(2, m.progress * 30)), message: PHASES[m.status] ?? 'Processando…' })
        }
      },
    })
    await worker.setParameters({ tessedit_char_whitelist: WHITELIST, preserve_interword_spaces: '1' })

    let text = ''
    if (lineSources) {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE })
      const lines: string[] = []
      for (let i = 0; i < lineSources.length; i++) {
        onProgress({ percent: 30 + Math.round(((i + 1) / lineSources.length) * 50), message: `Lendo linha ${i + 1} de ${lineSources.length}…` })
        const { data } = await worker.recognize(lineSources[i])
        lines.push(data.text.replace(/\n+/g, ' '))
      }
      text = repairTabGroups(cleanupTabText(lines.join('\n')))
    }

    // A leitura por linha falha em fotos tortas; a imagem inteira serve de comparação.
    if (countTabLines(text) < 6) {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      onProgress({ percent: 85, message: PHASES.recognizing_text })
      const { data } = await worker.recognize(wholeSource)
      const whole = repairTabGroups(cleanupTabText(data.text))
      if (countTabLines(whole) >= countTabLines(text)) text = whole
    }

    onProgress({ percent: 100, message: 'Leitura concluída.' })
    text = text.trim()
    if (!text) {
      throw new OcrError('Não consegui ler nenhum texto nessa imagem. Tente uma foto mais nítida e reta.')
    }
    return text
  } catch (error) {
    if (error instanceof OcrError) throw error
    throw new OcrError(
      'Falha ao reconhecer a imagem. O leitor precisa de internet na primeira vez para baixar o modelo. Verifique a conexão e tente de novo.',
    )
  } finally {
    await worker?.terminate().catch(() => undefined)
  }
}
