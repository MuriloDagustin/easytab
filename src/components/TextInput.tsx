import { Alert } from './ui/Alert'
import { Button } from './ui/Button'

interface Props {
  value: string
  onChange: (text: string) => void
  onProcess: () => void
  onBack: () => void
  onUseExample: () => void
  error: string | null
  fromImage: boolean
}

export function TextInput({ value, onChange, onProcess, onBack, onUseExample, error, fromImage }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          ← Voltar
        </Button>
        <h1 className="text-lg font-semibold">Revisar tablatura</h1>
        <span className="w-20" />
      </header>

      {fromImage && (
        <Alert tone="warning" title="Revise antes de continuar">
          Este texto veio da leitura automática da imagem e costuma ter erros. Compare com a tablatura original e
          corrija números, hífens e as barras <code>|</code> antes de processar.
        </Alert>
      )}

      {error && <Alert tone="error" title="Não consegui ler essa tablatura">{error}</Alert>}

      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">
          Cole aqui a tablatura. Cada bloco precisa ter 6 linhas, uma por corda.
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={12}
          aria-label="Tablatura em texto"
          placeholder={'e|--------3----|\nB|-----3-------|\nG|--0----------|\nD|-------------|\nA|-------------|\nE|-------------|'}
          className="w-full resize-y rounded-xl border border-border bg-surface p-3 font-mono text-sm leading-6 whitespace-pre text-text placeholder:text-muted/50"
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onUseExample}>
          Usar tablatura de exemplo
        </Button>
        <Button variant="primary" size="lg" onClick={onProcess} disabled={!value.trim()}>
          Processar tablatura
        </Button>
      </div>
    </div>
  )
}
