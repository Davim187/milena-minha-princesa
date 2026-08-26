import { useEffect, useMemo, useState } from 'react'
import { AmbientBackground } from './components/AmbientBackground'
import { DevModeOverlay } from './components/DevModeOverlay'
import { FooterEgg } from './components/FooterEgg'
import { SoundtrackButton } from './components/SoundtrackButton'
import { AlgorithmStage } from './components/stages/AlgorithmStage'
import { DatabaseStage } from './components/stages/DatabaseStage'
import { EvidenceStage } from './components/stages/EvidenceStage'
import { FinaleStage } from './components/stages/FinaleStage'
import { InterviewStage } from './components/stages/InterviewStage'
import { LandingStage } from './components/stages/LandingStage'
import { ProblemStage } from './components/stages/ProblemStage'
import { TerminalStage } from './components/stages/TerminalStage'
import { siteConfig } from './config'
import { enterStage, finalizarSessaoAtual, registerDevMode, registerEasterEgg, startSession } from './services/interactionService'
import type { Stage, Tone } from './types'





function toneFor(stage: Stage): Tone {
  if (stage === 'landing' || stage === 'terminal' || stage === 'evidence') return 'terminal'
  if (stage === 'finale') return 'soft'
  return 'system'
}

export default function App() {
  const [stage, setStage] = useState<Stage>('landing')
  const [titleTaps, setTitleTaps] = useState(0)
  const [hunter, setHunter] = useState(false)
  const [devTaps, setDevTaps] = useState(0)
  const [devOpen, setDevOpen] = useState(false)

  const tone = useMemo(() => toneFor(stage), [stage])

  useEffect(() => {
    startSession()
  }, [])

  useEffect(() => {
    enterStage(stage)
    if (stage === 'finale') {
      void finalizarSessaoAtual()
    }
  }, [stage])

  function tapTitle() {
    const next = titleTaps + 1
    setTitleTaps(next)
    if (next >= 6) {
      registerEasterEgg('titulo_projeto')
      setHunter(true)
    }
  }

  function tapDev() {
    const next = devTaps + 1
    setDevTaps(next)
    if (next >= 7) {
      registerDevMode()
      setDevOpen(true)
    }
  }

  return (
    <div className="relative min-h-svh overflow-x-hidden">
      <AmbientBackground tone={tone} />
      <SoundtrackButton />

      <button
        type="button"
        onClick={tapDev}
        className="fixed top-[max(0.85rem,env(safe-area-inset-top))] left-3 z-40 font-mono text-[10px] tracking-wider text-white/25 hover:text-white/50 sm:left-5"
      >
        {siteConfig.caseId}
      </button>

      {stage === 'landing' ? <LandingStage onStart={() => setStage('terminal')} onSecretTap={tapTitle} /> : null}
      {stage === 'terminal' ? <TerminalStage onDone={() => setStage('evidence')} /> : null}
      {stage === 'evidence' ? <EvidenceStage onDone={() => setStage('problem')} /> : null}
      {stage === 'problem' ? <ProblemStage onDone={() => setStage('interview')} /> : null}
      {stage === 'interview' ? <InterviewStage onDone={() => setStage('algorithm')} /> : null}
      {stage === 'algorithm' ? <AlgorithmStage onDone={() => setStage('database')} /> : null}
      {stage === 'database' ? <DatabaseStage onDone={() => setStage('finale')} /> : null}
      {stage === 'finale' ? <FinaleStage onSecretTap={tapTitle} /> : null}

      <FooterEgg visible={stage === 'landing' || stage === 'finale'} />
      <DevModeOverlay open={devOpen} onClose={() => setDevOpen(false)} />

      {hunter ? (
        <div className="animate-fade-up fixed inset-x-4 top-16 z-50 mx-auto max-w-sm rounded-2xl border border-white/15 bg-black/80 p-4 text-center backdrop-blur-xl">
          <p className="text-sm text-white">{siteConfig.easterEggs.hunter}</p>
          <p className="mt-1 text-[12px] text-white/45">{siteConfig.easterEggs.hunterHint}</p>
          <button
            type="button"
            className="mt-3 text-[12px] text-rose-200"
            onClick={() => setHunter(false)}
          >
            fechar
          </button>
        </div>
      ) : null}
    </div>
  )
}
