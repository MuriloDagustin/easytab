import type { TabEvent } from '../tab/types'

const MAX_BASE = 21
const SHIFT_COST = 3
const LOW_FINGER_WEIGHT = 0.2

type Fingers = Map<string, number>

function pressedNotes(event: TabEvent) {
  return event.notes.filter((n) => n.fret > 0 && !n.muted)
}

/** Dedos com o indicador na casa `base`, um dedo por casa; null se não cabe na mão. */
function fingersAt(event: TabEvent, base: number): Fingers | null {
  const fingers: Fingers = new Map()
  const used = new Set<number>()
  for (const note of pressedNotes(event)) {
    const finger = note.fret - base + 1
    if (finger < 1 || finger > 4 || used.has(finger)) return null
    used.add(finger)
    fingers.set(`${note.string}:${note.fret}`, finger)
  }
  return fingers
}

/**
 * Planeja a posição da mão no trecho inteiro (programação dinâmica): mudar de posição
 * custa, e dentro de uma posição cada dedo fica numa casa. A sugestão só aparece quando
 * é confiável: acordes, ou trechos na mesma posição que percorrem pelo menos três casas.
 * Notas isoladas e saltos ambíguos ficam sem dedo.
 */
export function suggestFingersSequence(events: TabEvent[]): Array<Fingers | null> {
  const chain = events
    .map((event, index) => ({ event, index, bases: [] as number[] }))
    .filter(({ event }) => pressedNotes(event).length > 0)
  for (const item of chain) {
    for (let b = 1; b <= MAX_BASE; b++) if (fingersAt(item.event, b)) item.bases.push(b)
  }
  const playable = chain.filter((c) => c.bases.length > 0)
  const result: Array<Fingers | null> = events.map(() => null)
  if (!playable.length) return result

  // Em acordes, prefere o indicador na casa mais baixa.
  const local = (event: TabEvent, base: number) => {
    const pressed = pressedNotes(event)
    return pressed.length > 1 ? LOW_FINGER_WEIGHT * (Math.min(...pressed.map((n) => n.fret)) - base) : 0
  }
  const cost: number[][] = []
  const from: number[][] = []
  playable.forEach((item, i) => {
    cost[i] = []
    from[i] = []
    item.bases.forEach((b, j) => {
      if (i === 0) {
        cost[i][j] = local(item.event, b)
        from[i][j] = -1
        return
      }
      let best = Infinity
      let arg = 0
      playable[i - 1].bases.forEach((pb, k) => {
        // Em empate, trocar de posição mais tarde é melhor: a mão fica onde está enquanto dá.
        const c = cost[i - 1][k] + (pb === b ? 0 : Math.abs(pb - b) + SHIFT_COST - i * 1e-6)
        if (c < best) {
          best = c
          arg = k
        }
      })
      cost[i][j] = best + local(item.event, b)
      from[i][j] = arg
    })
  })

  const chosen: number[] = new Array(playable.length)
  let j = cost.at(-1)!.indexOf(Math.min(...cost.at(-1)!))
  for (let i = playable.length - 1; i >= 0; i--) {
    chosen[i] = playable[i].bases[j]
    j = from[i][j]
  }

  let start = 0
  while (start < playable.length) {
    let end = start
    while (end + 1 < playable.length && chosen[end + 1] === chosen[start]) end++
    const run = playable.slice(start, end + 1)
    const frets = run.flatMap((r) => pressedNotes(r.event).map((n) => n.fret))
    const spansPosition = Math.max(...frets) - Math.min(...frets) >= 2
    for (const item of run) {
      const isChord = pressedNotes(item.event).length >= 2
      if (spansPosition || isChord) result[item.index] = fingersAt(item.event, chosen[start])
    }
    start = end + 1
  }
  return result
}

export function suggestFingers(events: TabEvent[], index: number): Fingers | null {
  return suggestFingersSequence(events)[index] ?? null
}
