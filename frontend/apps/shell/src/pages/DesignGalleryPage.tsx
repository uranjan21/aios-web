/**
 * Design gallery — every modular page from the redesign canvas, rendered by
 * the real `ModuleGrid` with the canvas's own sample data.
 *
 * Why this exists: 21 of the 23 modular destinations already have working
 * live-data pages. Mounting the canvas's module lists at those routes would
 * make the app *look* finished while replacing real numbers with the
 * designer's placeholders. So the layouts live here until Phase 4 rebuilds
 * each page's module list from its API response — at which point the page
 * moves to its real route and drops out of this gallery.
 *
 * This is a design surface, not a product surface. It is intentionally not in
 * the nav tree; reach it at /app/design.
 */
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { textRole } from '@ledgr/ui'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { ModuleGrid } from '@ct/shared/components/modules'
import { PAGES, PAGE_META } from '@ct/shared/components/modules/pages'

const Picker = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1.5]};
`

const PickerChip = styled.button<{ $active: boolean }>`
  ${textRole('body-s')};
  font-weight: 600;
  font-family: inherit;
  padding: 6px 11px;
  border-radius: ${({ theme }) => theme.radii.xs};
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid ${({ $active, theme }) => ($active ? theme.color.accent : theme.color.border)};
  background: ${({ $active, theme }) => ($active ? theme.accent.soft : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.color.accent : theme.color.mutedForeground)};
  transition: background 150ms, color 150ms, border-color 150ms;

  &:hover {
    color: ${({ theme }) => theme.color.foreground};
    border-color: ${({ theme }) => theme.color.borderHover};
  }
`

const Note = styled.p`
  ${textRole('body-s')};
  color: ${({ theme }) => theme.color.mutedForeground};
  max-width: 70ch;
`

export function DesignGalleryPage() {
  const { key: rawKey } = useParams<{ key?: string }>()
  const navigate = useNavigate()

  const keys = useMemo(() => Object.keys(PAGES), [])
  // Route segments cannot carry a colon, so `finance:inbox` travels as
  // `finance-inbox` and is mapped back here.
  const key = rawKey ? rawKey.replace('-', ':') : keys[0]
  const modules = PAGES[key] ?? PAGES[keys[0]]

  return (
    <PageContainer>
      <PageContent>

        <Note>
          <strong>{key}</strong> — {PAGE_META[key] ?? 'Module composition from the redesign canvas'}.
          Layouts from <strong>Control Tower Redesign.dc.html</strong>, rendered by the
          production <code>ModuleGrid</code>. The numbers are the designer&rsquo;s sample data —
          each page moves to its real route once Phase 4 builds its modules from live API data.
        </Note>

        <Picker>
          {keys.map((k) => (
            <PickerChip
              key={k}
              $active={k === key}
              onClick={() => navigate(`/app/design/${k.replace(':', '-')}`)}
            >
              {k}
            </PickerChip>
          ))}
        </Picker>

        <ModuleGrid modules={modules} />
      </PageContent>
    </PageContainer>
  )
}
