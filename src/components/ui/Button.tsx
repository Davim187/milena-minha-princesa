import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'terminal' | 'danger' | 'soft'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 text-white shadow-[0_12px_32px_rgba(232,121,249,0.25)] hover:brightness-110 active:scale-[0.98]',
  secondary:
    'border border-white/15 bg-white/[0.06] text-white hover:bg-white/12 active:scale-[0.98]',
  ghost: 'text-white/70 hover:bg-white/5 hover:text-white',
  terminal:
    'border border-emerald-400/40 bg-emerald-400/10 font-mono text-[13px] tracking-wide text-emerald-200 hover:bg-emerald-400/16 active:scale-[0.98]',
  danger:
    'border border-rose-400/40 bg-rose-500/15 font-mono text-[13px] tracking-wide text-rose-100 hover:bg-rose-500/25',
  soft: 'bg-rose-400 text-[#2a1018] hover:bg-rose-300 active:scale-[0.98]',
}

export function Button({
  children,
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-medium transition duration-200 disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
