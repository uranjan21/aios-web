import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 to `target` over `duration` ms.
 * Returns the currently displayed (animated) value.
 */
export function useCountUp(target: number | null | undefined, duration = 900): number | null {
  const [display, setDisplay] = useState<number | null>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const prevTarget = useRef<number | null>(null)

  useEffect(() => {
    if (target == null) {
      setDisplay(null)
      return
    }

    const from = prevTarget.current ?? 0
    prevTarget.current = target

    // Skip animation if the delta is trivial
    if (Math.abs(target - from) < 0.01) {
      setDisplay(target)
      return
    }

    cancelAnimationFrame(rafRef.current)
    startRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (target - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplay(target)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return display
}
