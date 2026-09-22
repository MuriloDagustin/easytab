import { describe, expect, it } from 'vitest'
import { getInstrument, sampleFile, sampleUrls, samplesBaseUrl } from './instruments'

describe('instrumentos', () => {
  it('mapeia notas para arquivos com sustenido como "s"', () => {
    expect(sampleFile('C#3')).toBe('Cs3.mp3')
    expect(sampleUrls(getInstrument('acoustic'))['A#2']).toBe('As2.mp3')
  })

  it('monta a URL base respeitando o prefixo do site', () => {
    expect(samplesBaseUrl(getInstrument('nylon'), '/')).toBe('/samples/nylon/')
    expect(samplesBaseUrl(getInstrument('electric'), '/app')).toBe('/app/samples/electric/')
  })

  it('cai no violão de aço para id desconhecido', () => {
    expect(getInstrument('banjo').id).toBe('acoustic')
  })
})
