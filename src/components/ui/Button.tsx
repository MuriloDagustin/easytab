import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-strong active:bg-accent-strong font-semibold',
  secondary: 'bg-surface-2 text-text hover:bg-border border border-border',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-transparent text-danger border border-danger/50 hover:bg-danger/10',
}

const SIZES: Record<Size, string> = {
  md: 'px-4 py-2.5 text-sm min-h-11',
  lg: 'px-5 py-3.5 text-base min-h-13',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
