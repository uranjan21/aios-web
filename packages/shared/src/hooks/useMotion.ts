/**
 * Motion access point — the only sanctioned way to animate.
 *
 * The 2026-07-21 audit found 101 framer-motion call sites, none of which
 * honoured `prefers-reduced-motion`. The global CSS rule in GlobalStyles zeroes
 * `animation-duration` and `transition-duration`, but it cannot touch
 * JS-driven animation, so every spring and page transition played at full
 * amplitude for users who had asked the OS for less.
 *
 * This hook closes that gap: when the user prefers reduced motion it returns
 * variants that jump straight to the final state and transitions with zero
 * duration. Route animation through it rather than importing spring configs
 * directly, and the preference is honoured everywhere by construction.
 */
import { useEffect, useState } from 'react';
import type { Transition, Variants } from 'framer-motion';
import { motion as motionTokens } from '@ledgr/ui';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Live-updating `prefers-reduced-motion` state. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    setReduced(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export interface MotionKit {
  reduced: boolean;
  spring: { snappy: Transition; smooth: Transition; gentle: Transition };
  /** Fade + rise. The default surface entrance. */
  rise: { initial: Variants[string]; animate: Variants[string]; exit: Variants[string]; transition: Transition };
  /** Scale + fade. For popovers and cards that own a point of origin. */
  pop: { initial: Variants[string]; animate: Variants[string]; exit: Variants[string]; transition: Transition };
  /** Parent of a staggered list. Pair with `child`. */
  stagger: { initial: string; animate: string; variants: Variants };
  child: { variants: Variants };
  /** Seconds between siblings — 0 when reduced. */
  staggerDelay: number;
}

const NONE: Transition = { duration: 0 };

export function useMotion(): MotionKit {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    const still = { initial: {}, animate: {}, exit: {}, transition: NONE };
    return {
      reduced,
      spring: { snappy: NONE, smooth: NONE, gentle: NONE },
      rise: still,
      pop: still,
      // Both variant maps define only `show`, so a reduced-motion user lands
      // on the final state immediately with no transition to run.
      stagger: { initial: 'show', animate: 'show', variants: { show: {} } },
      child: { variants: { show: {} } },
      staggerDelay: 0,
    };
  }

  return {
    reduced,
    spring: motionTokens.spring as MotionKit['spring'],
    rise: {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -6 },
      transition: motionTokens.spring.smooth as unknown as Transition,
    },
    pop: {
      initial: { opacity: 0, scale: 0.97 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.98 },
      transition: motionTokens.spring.snappy as unknown as Transition,
    },
    stagger: {
      initial: 'hidden',
      animate: 'show',
      variants: {
        hidden: {},
        show: { transition: { staggerChildren: motionTokens.stagger } },
      } as Variants,
    },
    child: {
      variants: {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: motionTokens.spring.smooth as Transition },
      } as Variants,
    },
    staggerDelay: motionTokens.stagger,
  };
}
