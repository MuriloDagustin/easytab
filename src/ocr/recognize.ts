import type { createWorker as CreateWorker } from 'tesseract.js'

const MAX_BYTES = 10 * 1024 * 1024
const WHITELIST = '0123456789eEBGDAbhprxX|-~/\\()* '

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

async function preprocess(file: File): Promise<string | File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(3, Math.max(1, 1400 / bitmap.width))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = data.data
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
      const value = gray > 150 ? 255 : 0
      pixels[i] = pixels[i + 1] = pixels[i + 2] = value
    }
    ctx.putImageData(data, 0, 0)
    bitmap.close()
    return canvas.toDataURL('image/png')
  } catch {
    return file
  }
}

export async function runOcr(file: File, onProgress: (p: OcrProgress) => void): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new OcrError('Esse arquivo não é uma imagem. Envie um print ou foto da tablatura (PNG ou JPG).')
  }
  if (file.size > MAX_BYTES) {
    throw new OcrError('A imagem é muito grande (limite de 10 MB). Tente recortar só a parte da tablatura.')
  }

  onProgress({ percent: 2, message: 'Preparando a imagem…' })
  const source = await preprocess(file)

  let worker: Awaited<ReturnType<typeof CreateWorker>> | null = null
  try {
    // Tesseract só é baixado quando o usuário envia uma imagem.
    const { createWorker } = await import('tesseract.js')
    worker = await createWorker('eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        const message = PHASES[m.status] ?? 'Processando…'
        onProgress({ percent: Math.round(Math.max(2, m.progress * 100)), message })
      },
    })
    await worker.setParameters({
      tessedit_char_whitelist: WHITELIST,
      preserve_interword_spaces: '1',
    })
    const { data } = await worker.recognize(source)
    onProgress({ percent: 100, message: 'Leitura concluída.' })
    const text = data.text.trim()
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
