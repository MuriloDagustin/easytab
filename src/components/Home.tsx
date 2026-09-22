import { useState } from 'react'
import { bestStreak, currentStreak, dayKey, stars } from '../domain/streak'
import type { SavedTab } from '../storage/persistence'
import { Alert } from './ui/Alert'
import { Button } from './ui/Button'

interface Props {
  tabs: SavedTab[]
  practiceDays: string[]
  parseError: string | null
  notice: string | null
  onPasteTab: () => void
  onUploadImage: () => void
  onTryExample: () => void
  onOpen: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function LibraryItem({
  tab,
  onOpen,
  onRename,
  onDelete,
}: {
  tab: SavedTab
  onOpen: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tab.name)
  const [confirming, setConfirming] = useState(false)
  const hard = tab.hardEvents.length
  const records = Object.values(tab.practice)
  const attempts = records.reduce((sum, r) => sum + r.attempts, 0)
  const hits = records.reduce((sum, r) => sum + r.hits, 0)

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              onRename(name)
              setEditing(false)
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Nome da tablatura"
              className="min-h-10 flex-1 rounded-lg border border-border bg-surface-2 px-2 text-sm"
            />
            <Button type="submit">Salvar</Button>
          </form>
        ) : (
          <button onClick={onOpen} className="block w-full text-left">
            <span className="block truncate font-semibold">{tab.name}</span>
            <span className="block text-xs text-muted">
              Atualizada em {formatDate(tab.updatedAt)}
              {hard > 0 && ` · ${hard} trecho${hard > 1 ? 's' : ''} difícil${hard > 1 ? 'eis' : ''}`}
              {tab.tuningId !== 'standard' && ' · afinação alternativa'}
              {tab.capo > 0 && ` · capo ${tab.capo}`}
              {attempts > 0 && ` · acerto ${Math.round((hits / attempts) * 100)}% ${'★'.repeat(stars(hits, attempts))}`}
            </span>
          </button>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {confirming ? (
          <>
            <Button variant="danger" onClick={onDelete}>
              Confirmar
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setEditing((v) => !v)} aria-label={`Renomear ${tab.name}`}>
              Renomear
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(true)} aria-label={`Apagar ${tab.name}`}>
              Apagar
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

export function Home({
  tabs,
  practiceDays,
  parseError,
  notice,
  onPasteTab,
  onUploadImage,
  onTryExample,
  onOpen,
  onRename,
  onDelete,
  onClearAll,
}: Props) {
  const toReview = tabs.filter((t) => t.hardEvents.length > 0)
  const today = dayKey(new Date())
  const streak = currentStreak(practiceDays, today)
  const best = bestStreak(practiceDays)
  const practicedToday = practiceDays.includes(today)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:py-16">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tab Fácil</h1>
        <p className="mt-3 text-base text-muted">
          Cole uma tablatura ou envie uma imagem. A gente explica nota por nota: qual corda tocar, qual casa
          apertar e como deve soar.
        </p>
      </header>

      {practiceDays.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4" data-streak>
          <div>
            <p className="text-lg font-semibold">
              🔥 {streak} dia{streak === 1 ? '' : 's'} seguido{streak === 1 ? '' : 's'} de prática
            </p>
            <p className="text-sm text-muted">
              {practicedToday ? 'Você já praticou hoje.' : streak > 0 ? 'Pratique hoje para não perder a sequência.' : 'Comece uma nova sequência hoje.'}
              {best > 1 && ` Melhor sequência: ${best} dias.`}
            </p>
          </div>
        </div>
      )}

      {notice && <Alert tone="info">{notice}</Alert>}
      {parseError && <Alert tone="error" title="Não consegui abrir essa tablatura">{parseError}</Alert>}

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

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onTryExample}>
          Ver com a tablatura de exemplo
        </Button>
      </div>

      {tabs.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Minhas tablaturas</h2>
          {toReview.length > 0 && (
            <Alert tone="warning" title="Para revisar">
              {toReview.length === 1
                ? `"${toReview[0].name}" tem trechos marcados como difíceis. Que tal praticar hoje?`
                : `${toReview.length} tablaturas têm trechos marcados como difíceis.`}
            </Alert>
          )}
          <ul className="flex flex-col gap-2">
            {tabs.map((tab) => (
              <LibraryItem
                key={tab.id}
                tab={tab}
                onOpen={() => onOpen(tab.id)}
                onRename={(name) => onRename(tab.id, name)}
                onDelete={() => onDelete(tab.id)}
              />
            ))}
          </ul>
          <div className="flex justify-center pt-2">
            <Button variant="danger" onClick={onClearAll}>
              Apagar dados salvos
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
