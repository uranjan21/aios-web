import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface PortalProps {
  children: ReactNode;
  /** Mount target. Defaults to document.body. */
  container?: HTMLElement | null;
}

/**
 * Renders children into a container appended to document.body (or `container`).
 * SSR-safe: renders nothing until mounted in the browser.
 */
export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, container ?? document.body);
}
