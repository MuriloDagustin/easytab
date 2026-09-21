import { useRef, useState } from 'react'
import { OcrError, runOcr } from '../ocr/recognize'
import { Alert } from './ui/Alert'
import { Button } from './ui/Button'

interface Props {
  onRecognized: (text: string) => void
  onBack: () => void
}

export function ImageInput({ onRecognized, onBack }: Props) {
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setProgress({ percent: 0, message: 'Preparando a imagem…' })
    try {
      const text = await runOcr(file, setProgress)
      onRecognized(text)
    } catch (e) {
      setError(e instanceof OcrError ? e.message : 'Algo deu errado ao ler a imagem. Tente novamente.')
    } finally {
      setProgress(null)
    }
  }

  const busy = progress !== null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          ← Voltar
        </Button>
        <h1 className="text-lg font-semibold">Enviar imagem</h1>
        <span className="w-20" />
      </header>

      {error && <Alert tone="error" title="Não deu para ler a imagem">{error}</Alert>}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!busy) void handleFile(e.dataTransfer.files[0])
        }}
        className={`flex min-h-56 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-accent bg-accent/5' : 'border-border bg-surface'
        }`}
      >
        {busy ? (
          <div className="w-full max-w-sm" role="status" aria-live="polite">
            <p className="mb-2 text-sm text-muted">{progress.message}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">{progress.percent}%</p>
          </div>
        ) : (
          <>
            <span aria-hidden className="text-4xl">🖼️</span>
            <p className="text-sm text-muted">
              Arraste uma imagem aqui ou escolha um arquivo.
              <br />
              Funciona melhor com prints nítidos e retos.
            </p>
            <Button variant="primary" size="lg" onClick={() => inputRef.current?.click()}>
              Escolher imagem
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Arquivo de imagem com a tablatura"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      <Alert tone="info">
        A leitura automática de tablatura erra com frequência. Depois do reconhecimento você vai revisar e
        corrigir o texto antes de processar. Na primeira vez o leitor baixa um modelo da internet.
      </Alert>
    </div>
  )
}
