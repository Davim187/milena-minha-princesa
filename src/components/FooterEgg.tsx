import { useState } from 'react'
import { siteConfig } from '../config'
import { registerEasterEgg } from '../services/interactionService'

type Props = {
  visible: boolean
}

export function FooterEgg({ visible }: Props) {
  const [open, setOpen] = useState(false)
  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
      <button
        type="button"
        onClick={() => {
          registerEasterEgg('rodape')
          setOpen(true)
        }}
        className="pointer-events-auto mx-auto max-w-xs text-[11px] leading-relaxed text-white/28 hover:text-white/50"
      >
        {siteConfig.easterEggs.footer}
      </button>
      {open ? (
        <p className="animate-fade-up mt-2 text-[12px] text-rose-200/70">
          {siteConfig.easterEggs.footerReply} 😂❤️
        </p>
      ) : null}
    </div>
  )
}
