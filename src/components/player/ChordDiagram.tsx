import { useEffect, useRef } from 'react'
import { chordShape } from '../../domain/music/chords'
import { Button } from '../ui/Button'

interface DiagramProps {
  name: string
  leftHanded?: boolean
  /** Cordas soltas da 6ª para a 1ª, em MIDI. */
  tuning?: number[]
}

export function ChordDiagram({ name, leftHanded = false, tuning }: DiagramProps) {
  const shape = chordShape(name, tuning)
  if (!shape) return <p className="text-sm text-muted">Não conheço uma forma para “{name}”.</p>

  const gap = 26
  const fretH = 30
  const left = 34
  const top = 34
  const rows = 5
  const width = left + gap * 5 + 26
  const height = top + fretH * rows + 18
  // Índice 0 = 6ª corda; canhoto inverte a ordem das colunas.
  const col = (i: number) => left + (leftHanded ? 5 - i : i) * gap
  const rowY = (fret: number) => top + (fret - shape.baseFret + 0.5) * fretH

  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} width={width * 1.3} height={height * 1.3} role="img" aria-label={`Diagrama do acorde ${name}`}>
        {shape.baseFret === 1 ? (
          <rect x={left - 1} y={top - 5} width={gap * 5 + 2} height={5} fill="#eef0f4" />
        ) : (
          <text x={left - 10} y={top + fretH / 2 + 4} textAnchor="end" className="fill-[#a3a9b8] text-[11px]">
            {shape.baseFret}ª
          </text>
        )}
        {Array.from({ length: rows + 1 }, (_, r) => (
          <line key={r} x1={left} x2={left + gap * 5} y1={top + r * fretH} y2={top + r * fretH} stroke="#5a6070" strokeWidth="1.5" />
        ))}
        {shape.frets.map((_, i) => (
          <line key={i} x1={col(i)} x2={col(i)} y1={top} y2={top + rows * fretH} stroke="#8e95a6" strokeWidth={1 + (5 - i) * 0.1 + (i === 0 ? 0.6 : 0)} />
        ))}
        {shape.frets.map((f, i) => {
          if (f === null) {
            return (
              <text key={`t${i}`} x={col(i)} y={top - 12} textAnchor="middle" className="fill-[#f87171] text-[13px] font-bold" data-muted>
                ×
              </text>
            )
          }
          if (f === 0) {
            return <circle key={`t${i}`} cx={col(i)} cy={top - 16} r="5" fill="none" stroke="#f5b942" strokeWidth="2" data-open />
          }
          return null
        })}
        {shape.barre && (
          <rect
            x={Math.min(col(6 - shape.barre.fromString), col(6 - shape.barre.toString)) - 10}
            y={rowY(shape.barre.fret) - 10}
            width={Math.abs(col(6 - shape.barre.toString) - col(6 - shape.barre.fromString)) + 20}
            height={20}
            rx="10"
            fill="#f5b942"
            data-barre
          />
        )}
        {shape.frets.map((f, i) =>
          f !== null && f > 0 ? (
            <g key={`d${i}`} data-dot={`${6 - i}:${f}`}>
              <circle cx={col(i)} cy={rowY(f)} r="10" fill="#f5b942" />
              {shape.fingers[i] && (
                <text x={col(i)} y={rowY(f) + 4} textAnchor="middle" className="fill-[#1a1300] text-[11px] font-bold">
                  {shape.fingers[i]}
                </text>
              )}
            </g>
          ) : null,
        )}
      </svg>
      {shape.simplified && (
        <figcaption className="max-w-56 text-center text-xs text-muted">
          Forma simplificada: algumas extensões da cifra ficaram de fora para caber na mão.
        </figcaption>
      )}
    </figure>
  )
}

interface DialogProps {
  name: string
  leftHanded: boolean
  tuning: number[]
  tuningName: string
  capo: number
  onClose: () => void
}

export function ChordDialog({ name, leftHanded, tuning, tuningName, capo, onClose }: DialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 print:hidden" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Acorde ${name}`}
        className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold">{name}</h2>
        <ChordDiagram name={name} leftHanded={leftHanded} tuning={tuning} />
        <p className="text-center text-xs text-muted">
          Números nas bolinhas são os dedos: 1 indicador, 2 médio, 3 anelar, 4 mínimo. × = não toque a corda.
          {` Afinação: ${tuningName}.`}
          {capo > 0 && ` Casas contadas a partir do capotraste na casa ${capo}.`}
        </p>
        <Button ref={closeRef} onClick={onClose} className="w-full">
          Fechar
        </Button>
      </div>
    </div>
  )
}
