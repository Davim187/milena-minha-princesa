import { useRef, useState } from 'react'
import { Music, VolumeX } from 'lucide-react'
import { siteConfig } from '../config'
import { cn } from '../lib/cn'
import { registerMusic } from '../services/interactionService'

export function SoundtrackButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [missing, setMissing] = useState(false)

  async function toggle() {
    setMissing(false)
    if (!audioRef.current) {
      const audio = new Audio(siteConfig.soundtrackSrc)
      audio.loop = true
      audio.volume = 0.38
      audioRef.current = audio
    }
    const audio = audioRef.current
    try {
      if (playing) {
        audio.pause()
        setPlaying(false)
        return
      }
      await audio.play()
      setPlaying(true)
      registerMusic(true)
    } catch {
      setMissing(true)
      setPlaying(false)
    }
  }

  return (
    <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-40 sm:right-5">
      <button
        type="button"
        onClick={() => void toggle()}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition hover:border-white/30 hover:text-white',
          playing && 'border-rose-400/40 text-rose-200',
        )}
        aria-label={playing ? 'Pausar trilha' : 'Tocar trilha'}
        title={missing ? 'Trilha não encontrada' : playing ? 'Pausar' : 'Tocar'}
      >
        {playing ? <Music size={16} /> : <VolumeX size={16} />}
      </button>
    </div>
  )
}
