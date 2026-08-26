import { useEffect, useState } from 'react'
import { siteConfig } from '../../config'
import { cn } from '../../lib/cn'
import { registerButton } from '../../services/interactionService'
import { Button } from '../ui/Button'
import { StageFrame } from '../StageFrame'

type Props = {
  onDone: () => void
}

export function ProblemStage({ onDone }: Props) {
  const [failed, setFailed] = useState(false)
  const [shown, setShown] = useState(false)
  const [glitch, setGlitch] = useState(true)

  useEffect(() => {
    const show = window.setTimeout(() => setShown(true), 80)
    const stop = window.setTimeout(() => setGlitch(false), 1600)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(stop)
    }
  }, [])

  return (
    <StageFrame stageKey="problem" tone="system">
      <p className="font-mono text-[11px] tracking-[0.22em] text-rose-300/60 uppercase">runtime</p>
      <h2 className="mt-2 text-[1.35rem] text-white">{siteConfig.problem.heading}</h2>

      <div className="animate-pulse-alert mt-6 rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-5 text-center">
        <p className={cn('font-mono text-[13px] tracking-[0.18em] text-rose-200', glitch && 'animate-glitch')}>
          {siteConfig.problem.code}
        </p>
        <p className="mt-2 font-mono text-[1.05rem] font-medium text-white">{siteConfig.problem.codeName}</p>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-white/60">{siteConfig.problem.explanation}</p>

      <ul className="mt-7 space-y-4 font-mono text-[12px] text-white/80">
        {siteConfig.problem.metrics.map((metric) => (
          <li key={metric.label}>
            <div className="mb-1.5 flex justify-between gap-3">
              <span className="text-white/55">{metric.label}</span>
              <span className="text-rose-200">{metric.value}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-fuchsia-400 transition-[width] duration-1000 ease-out"
                style={{ width: shown ? `${metric.value}%` : '0%' }}
              />
            </div>
          </li>
        ))}
      </ul>

      {!failed ? (
        <Button
          className="mt-8"
          onClick={() => {
            registerButton('tentar_corrigir')
            setFailed(true)
          }}
        >
          {siteConfig.problem.fixCta}
        </Button>
      ) : (
        <div className="animate-fade-up mt-8 space-y-2">
          <p className="font-mono text-rose-200">{siteConfig.problem.fail}</p>
          <p className="text-sm text-white/55">{siteConfig.problem.permanent}</p>
          <Button
            className="mt-5"
            variant="secondary"
            onClick={() => {
              registerButton('aceitar_e_seguir')
              onDone()
            }}
          >
            Aceitar e seguir
          </Button>
        </div>
      )}
    </StageFrame>
  )
}
