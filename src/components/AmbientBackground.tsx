import { cn } from '../lib/cn'
import type { Tone } from '../types'

type Props = {
  tone: Tone
}

export function AmbientBackground({ tone }: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div
        className={cn(
          'absolute inset-0 transition-colors duration-700',
          tone === 'terminal' && 'bg-[#05070a]',
          tone === 'system' && 'bg-[#07040e]',
          tone === 'soft' && 'bg-[#120c14]',
        )}
      />

      {tone === 'terminal' ? (
        <>
          <div className="animate-orb absolute -top-24 left-[-10%] size-[26rem] rounded-full bg-emerald-700/20 blur-[90px]" />
          <div
            className="animate-orb absolute right-[-15%] bottom-10 size-[22rem] rounded-full bg-cyan-800/15 blur-[90px]"
            style={{ animationDelay: '-8s' }}
          />
          <div className="scan-line absolute inset-x-0 h-28 bg-gradient-to-b from-transparent via-emerald-400/8 to-transparent" />
        </>
      ) : null}

      {tone === 'system' ? (
        <>
          <div className="animate-orb absolute -top-20 -left-10 size-[26rem] rounded-full bg-fuchsia-700/22 blur-[90px]" />
          <div
            className="animate-orb absolute top-1/3 -right-16 size-[24rem] rounded-full bg-rose-700/18 blur-[100px]"
            style={{ animationDelay: '-6s' }}
          />
          <div
            className="animate-orb absolute -bottom-20 left-1/4 size-[20rem] rounded-full bg-violet-800/18 blur-[90px]"
            style={{ animationDelay: '-12s' }}
          />
        </>
      ) : null}

      {tone === 'soft' ? (
        <>
          <div className="animate-orb absolute top-[-8%] left-[10%] size-[22rem] rounded-full bg-rose-400/16 blur-[100px]" />
          <div
            className="animate-orb absolute right-[5%] bottom-[10%] size-[18rem] rounded-full bg-amber-200/8 blur-[90px]"
            style={{ animationDelay: '-9s' }}
          />
        </>
      ) : null}

      <div
        className={cn(
          'absolute inset-0 opacity-[0.14] transition-opacity duration-700',
          tone === 'soft' && 'opacity-[0.06]',
        )}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
    </div>
  )
}
