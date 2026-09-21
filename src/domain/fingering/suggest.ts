import type { TabEvent } from '../tab/types'

const WINDOW = 3

/**
 * Sugere dedos só quando a mão fica claramente em uma posição de 4 casas.
 * Em qualquer caso duvidoso devolve null, para não ensinar digitação errada.
 */
export function suggestFingers(events: TabEvent[], index: number): Map<string, number> | null {
  const event = events[index]
  if (!event) return null

  const pressed = event.notes.filter((n) => n.fret > 0)
  if (!pressed.length) return null

  const neighborhood = events.slice(Math.max(0, index - WINDOW), index + WINDOW + 1)
  const frets = neighborhood.flatMap((e) => e.notes.map((n) => n.fret)).filter((f) => f > 0)
  if (!frets.length) return null

  const base = Math.min(...frets)
  const span = Math.max(...frets) - base
  if (span > 3) return null

  const fingers = new Map<string, number>()
  const used = new Set<number>()
  for (const note of pressed) {
    const finger = note.fret - base + 1
    if (finger < 1 || finger > 4) return null
    if (used.has(finger) && pressed.length > 1) return null
    used.add(finger)
    fingers.set(`${note.string}:${note.fret}`, finger)
  }
  return fingers
}
