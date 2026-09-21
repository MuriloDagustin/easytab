import { Button } from './ui/Button'

interface Props {
  onPasteTab: () => void
  onUploadImage: () => void
  onTryExample: () => void
  hasSavedSession: boolean
  onContinue: () => void
  onClearSaved: () => void
}

export function Home({
  onPasteTab,
  onUploadImage,
  onTryExample,
  hasSavedSession,
  onContinue,
  onClearSaved,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:py-16">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tab Fácil</h1>
        <p className="mt-3 text-base text-muted">
          Cole uma tablatura ou envie uma imagem. A gente explica nota por nota: qual corda tocar, qual casa
          apertar e como deve soar.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={onPasteTab}
          className="flex min-h-36 flex-col items-start justify-between rounded-2xl border border-border bg-surface p-5 text-left transition-colors hover:border-accent hover:bg-surface-2"
        >
          <span aria-hidden className="text-3xl">📋</span>
          <span>
            <span className="block text-lg font-semibold">Colar tablatura</span>
            <span className="mt-1 block text-sm text-muted">Cole o texto e corrija antes de processar.</span>
          </span>
        </button>

        <button
          onClick={onUploadImage}
          className="flex min-h-36 flex-col items-start justify-between rounded-2xl border border-border bg-surface p-5 text-left transition-colors hover:border-accent hover:bg-surface-2"
        >
          <span aria-hidden className="text-3xl">🖼️</span>
          <span>
            <span className="block text-lg font-semibold">Enviar imagem</span>
            <span className="mt-1 block text-sm text-muted">
              Print ou foto da tab. Você revisa o texto reconhecido.
            </span>
          </span>
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button variant="ghost" onClick={onTryExample}>
          Ver com a tablatura de exemplo
        </Button>

        {hasSavedSession && (
          <div className="flex w-full flex-col items-center gap-2 border-t border-border pt-4">
            <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={onContinue}>
              Continuar de onde parei
            </Button>
            <Button variant="danger" onClick={onClearSaved}>
              Apagar dados salvos
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
