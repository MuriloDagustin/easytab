import type { ReactNode } from 'react'

interface Props {
  tone?: 'error' | 'warning' | 'info'
  title?: string
  children: ReactNode
}

const TONES = {
  error: 'border-danger/60 bg-danger/10 text-danger',
  warning: 'border-accent/50 bg-accent/10 text-accent-strong',
  info: 'border-border bg-surface-2 text-muted',
} as const

export function Alert({ tone = 'info', title, children }: Props) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${TONES[tone]}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}
