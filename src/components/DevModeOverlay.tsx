import { siteConfig } from '../config'
import { downloadInteractionData } from '../services/interactionService'

type Props = {
  open: boolean
  onClose: () => void
}

export function DevModeOverlay({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="animate-fade-up fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-emerald-400/25 bg-[#07140f]/95 p-4 font-mono text-[12px] text-emerald-200/90 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:bottom-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] tracking-[0.2em] text-emerald-400/70 uppercase">modo desenvolvedor</p>
        <button type="button" onClick={onClose} className="text-emerald-200/50 hover:text-white">
          fechar
        </button>
      </div>
      <ul className="space-y-1.5">
        {siteConfig.devComments.map((line) => (
          <li key={line} className={line.includes('BUG') ? 'text-amber-300/90' : undefined}>
            {line}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => downloadInteractionData()}
        className="mt-4 text-[11px] tracking-wide text-emerald-400/50 hover:text-emerald-200"
      >
        exportar registro
      </button>
    </div>
  )
}
