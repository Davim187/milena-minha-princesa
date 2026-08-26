import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Props = {
  children: ReactNode
  className?: string
  padded?: boolean
}

export function GlassCard({ children, className, padded = true }: Props) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-white/10 bg-white/[0.045] shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl',
        padded && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}
