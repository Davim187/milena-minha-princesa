import { Search } from 'lucide-react'
import { siteConfig } from '../../config'
import { registerButton } from '../../services/interactionService'
import { Button } from '../ui/Button'
import { StageFrame } from '../StageFrame'

type Props = {
  onStart: () => void
  onSecretTap: () => void
}

export function LandingStage({ onStart, onSecretTap }: Props) {
  return (
    <StageFrame stageKey="landing" tone="terminal" className="pb-28">
      <p className="font-mono text-[11px] tracking-[0.28em] text-emerald-400/70 uppercase">
        arquivo classificado
      </p>
      <button type="button" onClick={onSecretTap} className="mt-3 text-left">
        <h1 className="font-mono text-[1.85rem] leading-tight font-medium tracking-tight text-white sm:text-[2.15rem]">
          {siteConfig.projectName} <span className="text-rose-300">👀</span>
        </h1>
      </button>
      <p className="mt-2 font-mono text-[11px] text-white/35">
        {siteConfig.caseId} · operador: {siteConfig.authorName}
      </p>

      <div className="mt-8 space-y-3 rounded-2xl border border-emerald-400/20 bg-black/40 p-5 font-mono text-[14px] leading-relaxed text-emerald-100/90">
        <p>{siteConfig.landing.alert}</p>
        <p className="text-white/70">{siteConfig.landing.line1}</p>
        <p className="text-white/70">{siteConfig.landing.line2}</p>
      </div>

      <Button
        variant="terminal"
        className="mt-8 min-h-14"
        onClick={() => {
          registerButton('botao_iniciar')
          onStart()
        }}
      >
        {siteConfig.landing.cta}
        <Search className="size-4" />
      </Button>
    </StageFrame>
  )
}
