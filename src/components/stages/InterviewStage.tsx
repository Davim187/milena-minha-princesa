import { useEffect, useState } from 'react'
import type { PointerEvent } from 'react'
import { siteConfig } from '../../config'
import { cn } from '../../lib/cn'
import {
  ensurePergunta,
  registerButton,
  registerFleeingNo,
  registerOptionClick,
  registerRespostaFinal,
} from '../../services/interactionService'
import { Button } from '../ui/Button'
import { StageFrame } from '../StageFrame'

type Props = {
  onDone: () => void
}

type Step = 1 | 2 | 3

export function InterviewStage({ onDone }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [flee, setFlee] = useState({ x: 0, y: 0 })
  const [suspicious, setSuspicious] = useState(false)
  const [maybeNote, setMaybeNote] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [q2Message, setQ2Message] = useState<'none' | 'pending' | 'joke'>('none')
  const [q3Id, setQ3Id] = useState<string | null>(null)

  useEffect(() => {
    if (step === 1) ensurePergunta('pergunta_1')
    if (step === 2) ensurePergunta('pergunta_2')
    if (step === 3) ensurePergunta('pergunta_3')
  }, [step])

  function dodge(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    registerFleeingNo()
    setSuspicious(true)
    const x = Math.round(Math.random() * 120 - 40)
    const y = Math.round(Math.random() * -70 - 8)
    setFlee({ x, y })
  }

  function acceptMaybe() {
    registerOptionClick('pergunta_1', 'Talvez')
    registerRespostaFinal('pergunta_1', 'Talvez')
    setMaybeNote(true)
    window.setTimeout(() => setStep(2), 1300)
  }

  function acceptYes() {
    registerOptionClick('pergunta_1', 'Sim 👀')
    registerRespostaFinal('pergunta_1', 'Sim 👀')
    setAccepted(true)
    window.setTimeout(() => setStep(2), 900)
  }

  function handleNoQ2() {
    registerOptionClick('pergunta_2', 'NÃO')
    if (q2Message === 'pending') return
    setQ2Message('pending')
    window.setTimeout(() => setQ2Message('joke'), 1000)
  }

  function handleClaro() {
    registerOptionClick('pergunta_2', 'CLARO')
    registerRespostaFinal('pergunta_2', 'CLARO')
    setStep(3)
  }

  function handleOption(id: string, label: string) {
    setQ3Id(id)
    registerOptionClick('pergunta_3', label)
    registerRespostaFinal('pergunta_3', label)
  }

  const q3 = siteConfig.interview.q3Options.find((item) => item.id === q3Id)

  return (
    <StageFrame stageKey={`interview-${step}`} tone="system">
      <p className="font-mono text-[11px] tracking-[0.22em] text-rose-300/60 uppercase">entrevista</p>
      <h2 className="mt-2 text-[1.35rem] leading-snug text-white">{siteConfig.interview.title}</h2>

      {step === 1 ? (
        <div className="mt-8">
          <p className="text-[1.05rem] text-white/90">{siteConfig.interview.q1}</p>
          {suspicious ? (
            <p className="animate-fade-up mt-3 font-mono text-[13px] text-amber-300">
              {siteConfig.interview.q1Suspicious}
            </p>
          ) : null}
          {maybeNote ? (
            <p className="animate-fade-up mt-3 text-sm text-white/70">{siteConfig.interview.q1Maybe}</p>
          ) : null}
          {accepted ? (
            <p className="animate-fade-up mt-3 font-mono text-[13px] text-emerald-300">
              {siteConfig.interview.q1Yes}
            </p>
          ) : null}

          <div className="relative mt-8 min-h-[180px]">
            <Button
              variant="danger"
              className="absolute top-0 left-0 z-10 w-[46%] max-w-[9rem] transition-transform duration-200"
              style={{ transform: `translate(${flee.x}px, ${flee.y}px)` }}
              onPointerDown={dodge}
            >
              Não
            </Button>
            <div className="flex flex-col gap-3 pt-16">
              <Button variant="secondary" onClick={acceptMaybe} disabled={accepted || maybeNote}>
                Talvez
              </Button>
              <Button onClick={acceptYes} disabled={accepted || maybeNote}>
                Sim 👀
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="animate-fade-up mt-8">
          <p className="text-[1.05rem] text-white/90">{siteConfig.interview.q2}</p>
          {q2Message === 'pending' ? (
            <p className="mt-3 font-mono text-[13px] text-amber-200">{siteConfig.interview.q2No}</p>
          ) : null}
          {q2Message === 'joke' ? (
            <p className="animate-fade-up mt-3 text-sm text-white/70">{siteConfig.interview.q2Joke} 😂</p>
          ) : null}
          <div className="mt-8 flex flex-col gap-3">
            <Button variant="danger" onClick={handleNoQ2} disabled={q2Message === 'pending'}>
              NÃO
            </Button>
            <Button onClick={handleClaro}>CLARO</Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="animate-fade-up mt-8">
          <p className="text-[1.05rem] text-white/90">{siteConfig.interview.q3}</p>
          <div className="mt-5 flex flex-col gap-2.5">
            {siteConfig.interview.q3Options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleOption(option.id, `${option.emoji} ${option.label}`)}
                className={cn(
                  'min-h-12 cursor-pointer rounded-2xl border px-4 text-left text-[14px] transition',
                  q3Id === option.id
                    ? 'border-rose-400/40 bg-rose-400/15 text-white'
                    : 'border-white/10 bg-white/[0.04] text-white/85 hover:border-white/20',
                )}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
          {q3 ? (
            <div className="animate-fade-up mt-5 space-y-4">
              <p className="text-sm text-rose-100/85">{q3.reaction}</p>
              <Button
                onClick={() => {
                  registerButton('continuar_entrevista')
                  onDone()
                }}
              >
                Continuar investigação
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </StageFrame>
  )
}
