import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { siteConfig } from '../../config'
import { registerButton } from '../../services/interactionService'
import { Button } from '../ui/Button'
import { StageFrame } from '../StageFrame'
import { TypeLines } from '../ui/TypeLines'

type Props = {
  onDone: () => void
}

export function TerminalStage({ onDone }: Props) {
  const [showUnexpected, setShowUnexpected] = useState(false)

  return (
    <StageFrame stageKey="terminal" tone="terminal">
      <p className="font-mono text-[11px] tracking-[0.22em] text-emerald-400/60 uppercase">
        sys://investigation
      </p>
      <div className="mt-4 min-h-[240px] rounded-2xl border border-emerald-500/20 bg-black/55 p-4 sm:p-5">
        <TypeLines
          lines={siteConfig.terminalLogs}
          onComplete={() => setShowUnexpected(true)}
        />
        {showUnexpected ? (
          <p className="animate-fade-up mt-4 flex items-start gap-2 font-mono text-[13px] text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {siteConfig.unexpected}
          </p>
        ) : null}
      </div>
      {showUnexpected ? (
        <Button
          variant="terminal"
          className="mt-6"
          onClick={() => {
            registerButton('abrir_evidencias')
            onDone()
          }}
        >
          Abrir evidências
        </Button>
      ) : null}
    </StageFrame>
  )
}
