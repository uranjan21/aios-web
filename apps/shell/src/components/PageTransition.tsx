import { motion, type Variants } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// Staggered list container — use as parent of animated cards
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
}

// Individual card animation — use on each card inside a staggerContainer
export const cardEntrance: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: 'easeOut' as const } },
}
