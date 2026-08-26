import { useState } from 'react'
import { Heart } from 'lucide-react'
import { siteConfig } from '../../config'
import { registerButton } from '../../services/interactionService'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { HeartBurst } from '../HeartBurst'
import { StageFrame } from '../StageFrame'

type Props = {
  onDone: () => void
}

export function EvidenceStage({ onDone }: Props) {
  const [index, setIndex] = useState(0)
  const [kissOpen, setKissOpen] = useState(false)
  const [burst, setBurst] = useState(0)
  const [wrapUp, setWrapUp] = useState(false)
  const evidence = siteConfig.evidences[index]
  const isLast = index === siteConfig.evidences.length - 1

  if (!evidence) return null

  function next() {
    if (wrapUp) {
      onDone()
      return
    }
    registerButton(`evidencia_${evidence.id}`)
    if (isLast && 'reveal' in evidence && !kissOpen) {
      setKissOpen(true)
      setBurst((n) => n + 1)
      return
    }
    if (isLast && kissOpen) {
      setWrapUp(true)
      return
    }
    setIndex((n) => n + 1)
    setKissOpen(false)
  }

  return (
    <StageFrame stageKey={`evidence-${index}-${wrapUp ? 'end' : 'card'}`} tone="terminal" className="relative">
      <p className="font-mono text-[11px] tracking-[0.22em] text-emerald-400/60 uppercase">
        coleta de evidências
      </p>

      {!wrapUp ? (
        <GlassCard className="relative mt-5 overflow-visible border-emerald-400/15 bg-black/35">
          <p className="font-mono text-[12px] tracking-[0.16em] text-rose-300/80 uppercase">
            {evidence.title}
          </p>
          <p className="mt-4 text-[1.15rem] leading-snug text-white">{evidence.body}</p>

          {kissOpen && 'reveal' in evidence ? (
            <div className="mt-8 text-center">
              <Heart className="animate-heart-pop mx-auto size-10 fill-rose-400 text-rose-400" />
              <p className="animate-heart-pop mt-3 font-display text-[1.7rem] text-rose-100 italic">
                {evidence.reveal} ❤️
              </p>
            </div>
          ) : null}
        </GlassCard>
      ) : (
        <div className="animate-fade-up mt-10 text-center">
          <p className="font-mono text-amber-200">{siteConfig.investigationComplicated}</p>
        </div>
      )}

      <Button variant="terminal" className="mt-8" onClick={next}>
        {wrapUp ? 'Continuar' : isLast && kissOpen ? 'Próxima etapa' : 'Próxima evidência'}
      </Button>
      <HeartBurst burstId={burst} />
    </StageFrame>
  )
}
