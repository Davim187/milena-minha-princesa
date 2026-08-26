import { useState } from 'react'
import { AlertTriangle, Database } from 'lucide-react'
import { siteConfig } from '../../config'
import { registerButton } from '../../services/interactionService'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { StageFrame } from '../StageFrame'

type Props = {
  onDone: () => void
}

type Row = { key: string; value: string; warn?: boolean }

export function DatabaseStage({ onDone }: Props) {
  const [fixed, setFixed] = useState(false)

  const rows: Row[] = [
    { key: 'nome', value: siteConfig.herName },
    { key: 'status', value: `${siteConfig.status} 👀` },
    { key: 'encontro', value: String(siteConfig.datesCount) },
    { key: 'beijos', value: String(siteConfig.kissesCount) },
    { key: 'conversas', value: siteConfig.conversations },
    { key: 'memórias', value: siteConfig.memories },
    ...(siteConfig.firstDate ? [{ key: 'primeiro_encontro', value: siteConfig.firstDate }] : []),
    { key: 'próximo_encontro', value: 'NULL', warn: true },
  ]

  return (
    <StageFrame stageKey="database" tone="system">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-rose-300" />
        <p className="font-mono text-[11px] tracking-[0.22em] text-rose-300/60 uppercase">db.local</p>
      </div>
      <h2 className="mt-2 text-[1.35rem] text-white">{siteConfig.database.title}</h2>

      <GlassCard className="mt-6 overflow-hidden" padded={false}>
        <div className="border-b border-white/8 px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-white/35 uppercase">
          table: suspects
        </div>
        <ul>
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-baseline justify-between gap-4 border-b border-white/6 px-4 py-3 last:border-b-0"
            >
              <span className="font-mono text-[12px] text-white/40">{row.key}</span>
              <span
                className={`max-w-[58%] text-right font-mono text-[13px] ${row.warn ? 'text-amber-300' : 'text-white/90'}`}
              >
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/8 px-4 py-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
        <p className="font-mono text-[13px] text-amber-100/90">{siteConfig.database.emptyWarning}</p>
      </div>

      {!fixed ? (
        <Button
          className="mt-7"
          onClick={() => {
            registerButton('corrigir_banco')
            setFixed(true)
          }}
        >
          {siteConfig.database.fixCta}
        </Button>
      ) : (
        <div className="animate-fade-up mt-7 space-y-4">
          <p className="text-[1.05rem] text-white">{siteConfig.database.fixResult}</p>
          <p className="text-2xl">😏</p>
          <Button
            variant="secondary"
            onClick={() => {
              registerButton('continuar_banco')
              onDone()
            }}
          >
            Continuar
          </Button>
        </div>
      )}
    </StageFrame>
  )
}
