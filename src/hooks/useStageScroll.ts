import { useEffect } from 'react'

export function useStageScroll(key: string) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [key])
}
