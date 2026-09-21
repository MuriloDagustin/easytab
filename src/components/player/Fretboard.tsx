import { STRING_NAMES } from '../../domain/music/tuning'
import type { StringNumber, TabEvent } from '../../domain/tab/types'

interface Props {
  event: TabEvent
  minFret: number
  maxFret: number
  fingers: Map<string, number> | null
  showFingers: boolean
}

const STRING_WIDTHS = [1, 1.3, 1.7, 2.2, 2.8, 3.4]
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21]

export function Fretboard({ event, minFret, maxFret, fingers, showFingers }: Props) {
  const firstFret = Math.max(1, minFret)
  const lastFret = Math.max(firstFret + 3, maxFret)
  const fretCount = lastFret - firstFret + 1

  const padTop = 26
  const padBottom = 30
  const nutWidth = 58
  const fretWidth = 62
  const stringGap = 30
  const height = padTop + stringGap * 5 + padBottom
  const width = nutWidth + fretWidth * fretCount + 14

  const stringY = (s: StringNumber) => padTop + (s - 1) * stringGap
  const fretCenterX = (fret: number) => nutWidth + (fret - firstFret) * fretWidth + fretWidth / 2
  const fretLineX = (fret: number) => nutWidth + (fret - firstFret + 1) * fretWidth

  const markers = event.notes.map((note) => ({
    note,
    finger: showFingers ? (fingers?.get(`${note.string}:${note.fret}`) ?? null) : null,
  }))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Braço da guitarra com as posições da nota atual"
    >
      <rect x={nutWidth} y={padTop - 12} width={width - nutWidth - 14} height={stringGap * 5 + 24} rx="4" fill="#20242e" />
      <rect x={nutWidth - 7} y={padTop - 12} width={7} height={stringGap * 5 + 24} fill="#d8dbe3" />

      {Array.from({ length: fretCount }, (_, i) => firstFret + i).map((fret) => (
        <g key={fret}>
          <line
            x1={fretLineX(fret)}
            y1={padTop - 12}
            x2={fretLineX(fret)}
            y2={padTop + stringGap * 5 + 12}
            stroke="#5a6070"
            strokeWidth="2"
          />
          <text x={fretCenterX(fret)} y={height - 10} textAnchor="middle" className="fill-[#a3a9b8] text-[13px]">
            {fret}
          </text>
          {INLAYS.includes(fret) && (
            <circle cx={fretCenterX(fret)} cy={padTop + stringGap * 2.5} r="5" fill="#333947" />
          )}
          {fret === 12 && (
            <>
              <circle cx={fretCenterX(12)} cy={padTop + stringGap * 1.5} r="5" fill="#333947" />
              <circle cx={fretCenterX(12)} cy={padTop + stringGap * 3.5} r="5" fill="#333947" />
            </>
          )}
        </g>
      ))}

      {([1, 2, 3, 4, 5, 6] as StringNumber[]).map((s) => (
        <g key={s}>
          <line
            x1={nutWidth - 7}
            y1={stringY(s)}
            x2={width - 14}
            y2={stringY(s)}
            stroke="#8e95a6"
            strokeWidth={STRING_WIDTHS[s - 1]}
          />
          <text x={8} y={stringY(s) + 4} textAnchor="middle" className="fill-[#a3a9b8] text-[13px] font-medium">
            {STRING_NAMES[s].letter}
          </text>
        </g>
      ))}

      {markers.map(({ note, finger }) => {
        const y = stringY(note.string)
        if (note.fret === 0) {
          return (
            <g key={`${note.string}-${note.fret}`} data-string={note.string} data-fret={0}>
              <circle cx={nutWidth - 28} cy={y} r="11" fill="none" stroke="#f5b942" strokeWidth="3.5" />
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
