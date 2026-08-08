import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface PortalProps {
  children: ReactNode;
  /** Mount target. Defaults to document.body. */
  container?: HTMLElement | null;
}

/**
 * Renders children into a container appended to document.body (or `container`).
 * SSR-safe: renders nothing when there is no document.
 *
 * This used to gate on `useState(false)` + `useEffect(() => setMounted(true))`,
 * which threw away the first render — and that broke every popover in the app
 * (fixed 2026-08-06). `PopoverContent` measures its own content in a
 * `useLayoutEffect` to position itself and flip `$ready` (which controls
 * `visibility`). With the mount gate, that layout effect ran while the portal
 * was still rendering `null`, so `contentRef.current` was null, `updatePosition`
 * hit its early return, and `setReady(true)` never fired. The surface then
 * mounted at `visibility: hidden; top: 0` and stayed there — the effect does not
 * re-run, because none of its deps changed. Only an incidental ResizeObserver
 * delivery, scroll or resize would rescue it, which is why the avatar menu
 * appeared "very late" rather than never.
 *
 * Resolving synchronously means the portal's children are committed (and refs
 * attached) before the parent's layout effect runs, which is the ordering
 * `PopoverContent` was written to assume. Keep it hook-free — reintroducing a
 * mount effect here silently reintroduces that bug.
 */
export function Portal({ children, container }: PortalProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, container ?? document.body);
}
