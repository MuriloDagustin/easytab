import type { Position } from '../../domain/music/positions'
import { stringInfo, type Setup } from '../../domain/music/tuning'
import type { StringNumber, TabEvent } from '../../domain/tab/types'

interface Props {
  event: TabEvent
  minFret: number
  maxFret: number
  fingers: Map<string, number> | null
  showFingers: boolean
  setup: Setup
  leftHanded?: boolean
  alternates?: Position[]
  onPlayString?: (string: StringNumber) => void
}

const STRING_WIDTHS = [1, 1.3, 1.7, 2.2, 2.8, 3.4]
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21]

export function Fretboard({
  event,
  minFret,
  maxFret,
  fingers,
  showFingers,
  setup,
  leftHanded = false,
  alternates = [],
  onPlayString,
}: Props) {
  const firstFret = Math.max(1, minFret)
  const lastFret = Math.max(firstFret + 3, maxFret)
  const fretCount = lastFret - firstFret + 1

  const padTop = 26
  const padBottom = 30
  const nutWidth = 62
  const fretWidth = 62
  const stringGap = 30
  const height = padTop + stringGap * 5 + padBottom
  const width = nutWidth + fretWidth * fretCount + 14

  // Canhoto: o desenho é espelhado na horizontal, com a pestana à direita.
  const mx = (x: number) => (leftHanded ? width - x : x)
  const rectX = (x: number, w: number) => (leftHanded ? width - x - w : x)

  const stringY = (s: StringNumber) => padTop + (s - 1) * stringGap
  const fretCenterX = (fret: number) => mx(nutWidth + (fret - firstFret) * fretWidth + fretWidth / 2)
  const fretLineX = (fret: number) => mx(nutWidth + (fret - firstFret + 1) * fretWidth)
  const openX = mx(nutWidth - 30)

  const markers = event.notes.map((note) => ({
    note,
    finger: showFingers ? (fingers?.get(`${note.string}:${note.fret}`) ?? null) : null,
  }))
  const visibleAlternates = alternates.filter((p) => p.fret === 0 || (p.fret >= firstFret && p.fret <= lastFret))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Braço da guitarra com as posições da nota atual${leftHanded ? ', visão de canhoto' : ''}`}
    >
      <rect x={rectX(nutWidth, width - nutWidth - 14)} y={padTop - 12} width={width - nutWidth - 14} height={stringGap * 5 + 24} rx="4" fill="#20242e" />
      <rect x={rectX(nutWidth - 7, 7)} y={padTop - 12} width={7} height={stringGap * 5 + 24} fill={setup.capo > 0 ? '#f5b942' : '#d8dbe3'} />
      {setup.capo > 0 && (
        <text x={mx(nutWidth - 3)} y={padTop - 16} textAnchor="middle" className="fill-[#f5b942] text-[10px] font-semibold">
          capo {setup.capo}
        </text>
      )}

      {Array.from({ length: fretCount }, (_, i) => firstFret + i).map((fret) => (
        <g key={fret}>
          <line x1={fretLineX(fret)} y1={padTop - 12} x2={fretLineX(fret)} y2={padTop + stringGap * 5 + 12} stroke="#5a6070" strokeWidth="2" />
          <text x={fretCenterX(fret)} y={height - 10} textAnchor="middle" className="fill-[#a3a9b8] text-[13px]">
            {fret}
          </text>
          {INLAYS.includes(fret) && <circle cx={fretCenterX(fret)} cy={padTop + stringGap * 2.5} r="5" fill="#333947" />}
          {fret === 12 && (
            <>
              <circle cx={fretCenterX(12)} cy={padTop + stringGap * 1.5} r="5" fill="#333947" />
              <circle cx={fretCenterX(12)} cy={padTop + stringGap * 3.5} r="5" fill="#333947" />
            </>
          )}
        </g>
      ))}

      {([1, 2, 3, 4, 5, 6] as StringNumber[]).map((s) => {
        const info = stringInfo(s, setup)
        const labelX = mx(12)
        return (
          <g key={s}>
            <line x1={mx(nutWidth - 7)} y1={stringY(s)} x2={mx(width - 14)} y2={stringY(s)} stroke="#8e95a6" strokeWidth={STRING_WIDTHS[s - 1]} />
            {onPlayString ? (
              <g
                role="button"
                tabIndex={0}
                aria-label={`Ouvir ${s}ª corda solta (${info.ptName})`}
                className="cursor-pointer"
                onClick={() => onPlayString(s)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onPlayString(s)
                  }
                }}
              >
                <rect x={labelX - 12} y={stringY(s) - 12} width={24} height={24} rx="6" fill="#1f232d" />
                <text x={labelX} y={stringY(s) + 4} textAnchor="middle" className="fill-[#eef0f4] text-[12px] font-semibold">
                  {info.letter}
                </text>
              </g>
            ) : (
              <text x={labelX} y={stringY(s) + 4} textAnchor="middle" className="fill-[#a3a9b8] text-[13px] font-medium">
                {info.letter}
              </text>
            )}
          </g>
        )
      })}

      {visibleAlternates.map((p) => (
        <g key={`alt-${p.string}-${p.fret}`} data-alt-string={p.string} data-alt-fret={p.fret}>
          <circle
            cx={p.fret === 0 ? openX : fretCenterX(p.fret)}
            cy={stringY(p.string)}
            r="11"
            fill="#0f1115"
            stroke="#7dd3fc"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <title>{`Mesma nota: corda ${p.string}, casa ${p.fret}`}</title>
        </g>
      ))}

      {markers.map(({ note, finger }) => {
        const y = stringY(note.string)
        if (note.muted) {
          return (
            <g key={`${note.string}-x`} data-string={note.string} data-fret="x">
              <line x1={openX - 8} y1={y - 8} x2={openX + 8} y2={y + 8} stroke="#f87171" strokeWidth="3.5" strokeLinecap="round" />
              <line x1={openX - 8} y1={y + 8} x2={openX + 8} y2={y - 8} stroke="#f87171" strokeWidth="3.5" strokeLinecap="round" />
              <title>{`Corda ${note.string} abafada`}</title>
            </g>
          )
        }
        if (note.fret === 0) {
          return (
            <g key={`${note.string}-${note.fret}`} data-string={note.string} data-fret={0}>
              <circle cx={openX} cy={y} r="11" fill="none" stroke="#f5b942" strokeWidth="3.5" />
              <title>{`Corda ${note.string} solta`}</title>
            </g>
          )
        }
        const x = fretCenterX(note.fret)
        return (
          <g key={`${note.string}-${note.fret}`} data-string={note.string} data-fret={note.fret}>
            <circle cx={x} cy={y} r="14" fill="#f5b942" stroke="#0f1115" strokeWidth="2" />
            {finger && (
              <text x={x} y={y + 5} textAnchor="middle" className="fill-[#1a1300] text-[14px] font-bold">
                {finger}
              </text>
            )}
            <title>{`Corda ${note.string}, casa ${note.fret}`}</title>
          </g>
        )
      })}
    </svg>
  )
}
