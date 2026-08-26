import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { useStageScroll } from '../hooks/useStageScroll'
import type { Tone } from '../types'

type Props = {
  stageKey: string
  tone?: Tone
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function StageFrame({ stageKey, tone = 'system', children, className, onClick }: Props) {
  useStageScroll(stageKey)

  return (
    <main
      className={cn(
        'relative mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-5 py-16 sm:max-w-lg sm:py-20',
        tone === 'soft' && 'max-w-md',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </main>
  )
}
