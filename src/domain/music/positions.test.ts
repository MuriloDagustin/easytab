import { describe, expect, it } from 'vitest'
import { alternatePositions } from './positions'
import { DEFAULT_SETUP } from './tuning'

describe('alternatePositions', () => {
  it('encontra a mesma nota em outras cordas', () => {
    // 1ª corda solta (E4) = 2ª corda casa 5 = 3ª casa 9 = 4ª casa 14.
    expect(alternatePositions(1, 0, DEFAULT_SETUP)).toEqual([
      { string: 2, fret: 5 },
      { string: 3, fret: 9 },
      { string: 4, fret: 14 },
    ])
  })

  it('respeita o limite de casas e ignora notas abaixo da corda solta', () => {
    expect(alternatePositions(6, 3, DEFAULT_SETUP)).toEqual([])
  })
})
