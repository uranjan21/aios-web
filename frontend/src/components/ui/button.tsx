/**
 * Re-exports @ledgr/ui Button so callers that import from @/components/ui/button
 * continue to work after the Tailwind → styled-components migration.
 *
 * Variant mapping (old → new):
 *   default  → primary
 *   secondary → secondary
 *   destructive → destructive
 *   outline → outline
 *   ghost   → ghost
 */
export { Button, type ButtonProps } from '@ledgr/ui'
