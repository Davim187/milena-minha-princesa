import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

type Props = {
  lines: readonly string[]
  onComplete?: () => void
  speed?: number
  linePause?: number
  className?: string
}

export function TypeLines({
  lines,
  onComplete,
  speed = 18,
  linePause = 420,
  className,
}: Props) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete
  const fired = useRef(false)

  useEffect(() => {
    let cancelled = false
    let line = 0
    let char = 0
    let acc = ''
    fired.current = false

    const tick = () => {
      if (cancelled) return
      if (line >= lines.length) {
        setDone(true)
        if (!fired.current) {
          fired.current = true
          completeRef.current?.()
        }
        return
      }
      const current = lines[line]
      if (char < current.length) {
        acc += current[char]
        char += 1
        setText(acc)
        window.setTimeout(tick, speed)
        return
      }
      acc += '\n'
      setText(acc)
      line += 1
      char = 0
      window.setTimeout(tick, linePause)
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [lines, speed, linePause])

  const rendered = text.split('\n')

  return (
    <div className={cn('font-mono text-[13px] leading-7 text-emerald-200/85 sm:text-[14px]', className)}>
      {rendered.map((row, index) => {
        const isLastRow = index === rendered.length - 1
        return (
          <p key={`${row}-${index}`}>
            {row ? <span className="mr-2 text-emerald-500/70">{'>'}</span> : null}
            {row}
            {isLastRow && !done ? <span className="animate-blink ml-0.5 text-emerald-300">█</span> : null}
          </p>
        )
      })}
    </div>
  )
}
