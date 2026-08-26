import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { siteConfig } from '../../config'
import { cn } from '../../lib/cn'
import { openWhatsApp } from '../../services/interactionService'
import { Button } from '../ui/Button'
import { StageFrame } from '../StageFrame'

type Props = {
  onSecretTap: () => void
}

export function FinaleStage({ onSecretTap }: Props) {
  const lines = siteConfig.finale.lines
  const [count, setCount] = useState(1)
  const [showCta, setShowCta] = useState(false)
  const [prepared, setPrepared] = useState(false)
  const allVisible = count >= lines.length

  useEffect(() => {
    if (allVisible) return
    const delay = count <= 2 ? 2400 : 3200
    const t = window.setTimeout(() => setCount((n) => n + 1), delay)
    return () => window.clearTimeout(t)
  }, [count, allVisible])

  useEffect(() => {
    if (!allVisible || showCta) return
    const t = window.setTimeout(() => setShowCta(true), 2800)
    return () => window.clearTimeout(t)
  }, [allVisible, showCta])

  function advance() {
    if (!allVisible) setCount((n) => Math.min(lines.length, n + 1))
  }

  function handleWhatsApp() {
    if (prepared) {
      openWhatsApp()
      return
    }
    setPrepared(true)
    window.setTimeout(() => openWhatsApp(), 420)
  }

  return (
    <StageFrame
      stageKey="finale"
      tone="soft"
      className="relative justify-end pb-28 sm:justify-center"
      onClick={advance}
    >
      <button
        type="button"
        className="mb-8 text-left"
        onClick={(e) => {
          e.stopPropagation()
          onSecretTap()
        }}
      >
        <p className="font-mono text-[10px] tracking-[0.28em] text-rose-200/40 uppercase">arquivo encerrado</p>
      </button>

      <div className="space-y-5">
        {lines.slice(0, count).map((line, index) => {
          const isQuiet = line === 'Tá...' || line === 'Agora falando sério.'
          return (
            <p
              key={`${line}-${index}`}
              className={
                isQuiet
                  ? 'animate-fade-up font-display text-[1.55rem] text-white italic'
                  : 'animate-fade-up text-[1.05rem] leading-relaxed text-white/78'
              }
            >
              {line}
            </p>
          )
        })}
      </div>

      {showCta ? (
        <div className="animate-fade-up relative mt-10" onClick={(e) => e.stopPropagation()}>
          <p className="font-display text-[1.7rem] leading-snug text-white italic sm:text-[1.9rem]">
            {siteConfig.finale.highlight} 👀❤️
          </p>
          <p className="mt-8 text-center text-sm text-white/50">{siteConfig.whatsapp.hint} 😌</p>
          <Button
            variant="soft"
            className={cn('mt-5 min-h-14 text-[16px] transition', prepared && 'scale-[0.99]')}
            onClick={handleWhatsApp}
          >
            <MessageCircle className="size-5" />
            {prepared ? siteConfig.whatsapp.prepared + ' ❤️' : siteConfig.whatsapp.cta}
          </Button>
          <p className="mt-4 text-center font-mono text-[12px] tracking-wide text-white/40">
            {siteConfig.whatsapp.pending}
          </p>
        </div>
      ) : (
        <p className="mt-10 font-mono text-[11px] text-white/25">toque para continuar</p>
      )}
    </StageFrame>
  )
}
