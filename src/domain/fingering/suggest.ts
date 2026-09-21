import type { TabEvent } from '../tab/types'

const WINDOW = 3

/**
 * Sugere dedos só quando a mão fica claramente em uma posição de 4 casas.
 * Em qualquer caso duvidoso devolve null, para não ensinar digitação errada.
 */
export function suggestFingers(events: TabEvent[], index: number): Map<string, number> | null {
  return suggestFingersSequence(events)[index] ?? null
}

interface Hand {
  base: number
}

function fitsHand(frets: number[], base: number): boolean {
  return frets.every((f) => f >= base && f <= base + 3)
}

/**
 * Percorre a sequência mantendo a posição da mão enquanto as notas couberem nela,
 * para que a digitação não "pule" a cada nota. Reancora só quando precisa.
 */
export function suggestFingersSequence(events: TabEvent[]): Array<Map<string, number> | null> {
  const result: Array<Map<string, number> | null> = []
  let hand: Hand | null = null

  events.forEach((event, index) => {
    const pressed = event.notes.filter((n) => n.fret > 0 && !n.muted)
    if (!pressed.length) {
      result.push(null)
      return
    }
    const frets = pressed.map((n) => n.fret)

    if (!hand || !fitsHand(frets, hand.base)) {
      const upcoming = events
        .slice(index, index + WINDOW + 1)
        .flatMap((e) => e.notes.filter((n) => n.fret > 0 && !n.muted).map((n) => n.fret))
      const span = Math.max(...upcoming) - Math.min(...upcoming)
      // Salto grande logo à frente: não dá para saber onde a mão vai ficar.
      const anchor = span <= 3 ? Math.min(...upcoming) : null
      hand = anchor !== null && fitsHand(frets, anchor) ? { base: anchor } : null
    }

    if (!hand) {
      result.push(null)
      return
    }

    const fingers = new Map<string, number>()
    const used = new Set<number>()
    for (const note of pressed) {
      const finger = note.fret - hand.base + 1
      if (used.has(finger) && pressed.length > 1) {
        result.push(null)
        return
      }
      used.add(finger)
      fingers.set(`${note.string}:${note.fret}`, finger)
    }
    result.push(fingers)
  })

  return result
}
