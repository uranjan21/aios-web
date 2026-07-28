import { motion } from 'framer-motion'
import { useMotion } from '@ct/shared/hooks/useMotion'

/**
 * Route transition.
 *
 * Previously held hardcoded variants and a fixed 0.18s duration, so it played
 * at full amplitude for users who had asked their OS for reduced motion — the
 * global CSS reduced-motion rule in GlobalStyles only reaches CSS transitions
 * and cannot touch framer-motion, which drives values in JS.
 *
 * It also exported `staggerContainer` and `cardEntrance` that nothing ever
 * imported; those are gone. The stagger primitives live in `useMotion()` now,
 * where the reduced-motion branch is applied once for every consumer.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { rise } = useMotion()

  return (
    <motion.div
      initial={rise.initial}
      animate={rise.animate}
      exit={rise.exit}
      transition={rise.transition}
    >
      {children}
    </motion.div>
  )
}
