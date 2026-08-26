import { Heart } from 'lucide-react'

const OFFSETS = ['18%', '32%', '48%', '62%', '76%', '40%']

type Props = {
  burstId: number
}

export function HeartBurst({ burstId }: Props) {
  if (!burstId) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 h-32 overflow-visible" aria-hidden>
      {OFFSETS.map((left, index) => (
        <Heart
          key={`${burstId}-${index}`}
          className="animate-heart-rise absolute bottom-0 size-4 fill-rose-400 text-rose-400"
          style={{ left, animationDelay: `${index * 70}ms` }}
        />
      ))}
    </div>
  )
}
