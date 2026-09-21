export interface SharePayload {
  text: string
  tuningId?: string
  capo?: number
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeShare(payload: SharePayload): string {
  const params = new URLSearchParams()
  params.set('tab', toBase64Url(payload.text))
  if (payload.tuningId && payload.tuningId !== 'standard') params.set('tuning', payload.tuningId)
  if (payload.capo) params.set('capo', String(payload.capo))
  return params.toString()
}

export function decodeShare(hash: string): SharePayload | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  try {
    const params = new URLSearchParams(raw)
    const tab = params.get('tab')
    if (!tab) return null
    const text = fromBase64Url(tab)
    if (!text.trim()) return null
    const capo = Number(params.get('capo') ?? 0)
    return {
      text,
      tuningId: params.get('tuning') ?? undefined,
      capo: Number.isFinite(capo) && capo > 0 ? Math.min(capo, 9) : undefined,
    }
  } catch {
    return null
  }
}

export function buildShareUrl(payload: SharePayload, base = window.location.href.split('#')[0]): string {
  return `${base}#${encodeShare(payload)}`
}
