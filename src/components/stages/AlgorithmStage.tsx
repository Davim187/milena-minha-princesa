import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { siteConfig } from '../../config'
import { registerButton } from '../../services/interactionService'
import { Button } from '../ui/Button'
import { StageFrame } from '../StageFrame'

type Props = {
  onDone: () => void
}

export function AlgorithmStage({ onDone }: Props) {
  const vars = siteConfig.algorithm.variables
  const [varCount, setVarCount] = useState(0)
  const [calcCount, setCalcCount] = useState(0)
  const [result, setResult] = useState(false)

  useEffect(() => {
    if (varCount >= vars.length) return
    const t = window.setTimeout(() => setVarCount((n) => n + 1), 520)
    return () => window.clearTimeout(t)
  }, [varCount, vars.length])

  useEffect(() => {
    if (varCount < vars.length) return
    if (calcCount >= 3) {
      const t = window.setTimeout(() => setResult(true), 700)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setCalcCount((n) => n + 1), 700)
    return () => window.clearTimeout(t)
  }, [varCount, vars.length, calcCount])

  return (
    <StageFrame stageKey="algorithm" tone="system">
      <p className="font-mono text-[11px] tracking-[0.22em] text-fuchsia-300/60 uppercase">kernel</p>
      <h2 className="mt-2 font-display text-[1.7rem] text-white italic">{siteConfig.algorithm.title}</h2>

      <div className="mt-8 min-h-[200px] rounded-2xl border border-white/10 bg-black/35 p-5 font-mono text-[14px] text-fuchsia-100/90">
        {vars.slice(0, varCount).map((item) => (
          <p key={item} className="animate-fade-up py-0.5">
            <span className="text-fuchsia-400/70">{'>'}</span> {item}
          </p>
        ))}
        {varCount >= vars.length
          ? Array.from({ length: calcCount }, (_, i) => (
              <p key={`c-${i}`} className="animate-fade-up py-0.5 text-white/50">
                {siteConfig.algorithm.calculating}
              </p>
            ))
          : null}
      </div>

      {result ? (
        <div className="animate-fade-up mt-8 text-center">
          <p className="font-mono text-sm text-white/50">{siteConfig.algorithm.found}</p>
          <p className="mt-3 flex items-center justify-center gap-2 font-display text-5xl text-white">
            {siteConfig.algorithm.score}
            <Heart className="size-8 fill-rose-400 text-rose-400" />
          </p>
          <p className="mt-4 text-[1.05rem] text-white/75">{siteConfig.algorithm.caption}</p>
          <Button
            className="mt-8"
            onClick={() => {
              registerButton('ver_banco')
              onDone()
            }}
          >
            Ver banco de dados
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex justify-center">
          <span
            className="size-8 rounded-full border-2 border-white/15 border-t-rose-400"
            style={{ animation: 'spin-slow 0.9s linear infinite' }}
          />
        </div>
      )}
    </StageFrame>
  )
}
