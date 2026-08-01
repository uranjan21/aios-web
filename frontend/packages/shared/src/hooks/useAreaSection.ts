import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

/**
 * Resolves which sub-page of an area to render.
 *
 * Areas used to drive their content off a `?tab=` query param read by a
 * per-area `ModuleSidebar`. As of 2026-08-01 every sub-page is a real route
 * (`/app/finance/transactions`) listed in the global nav tree, so the section
 * comes from the `:section` route param instead.
 *
 * This hook also retires the old URLs: if it sees a legacy `?tab=` (or the
 * caller's own legacy key, e.g. Health's numeric `'1'` for its dashboard) it
 * maps it through `legacy` and REPLACES the history entry with the canonical
 * path. Replace, not push, so Back doesn't bounce the user between the two
 * spellings of the same page.
 *
 * @param basePath  e.g. `/app/finance`
 * @param fallback  section to use when the URL names none — the area's overview
 * @param legacy    old `?tab=` value -> new section key, for values that changed
 */
export function useAreaSection(
  basePath: string,
  fallback: string,
  legacy: Record<string, string> = {},
): string {
  const { section } = useParams<{ section?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const legacyTab = searchParams.get('tab')
  const fromLegacy = legacyTab ? (legacy[legacyTab] ?? legacyTab) : undefined

  useEffect(() => {
    if (!legacyTab) return
    const target = fromLegacy === fallback ? basePath : `${basePath}/${fromLegacy}`
    navigate(target, { replace: true })
  }, [legacyTab, fromLegacy, basePath, fallback, navigate])

  if (section) return legacy[section] ?? section
  return fromLegacy ?? fallback
}
