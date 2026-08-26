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
     
    </div>
  )
}
