import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PageHeaderProvider } from '@ledgr/ui'
import { ctLightTheme } from '@ct/shared/theme/ctTheme'

/**
 * AdminPage — the users table geometry.
 *
 * The audit fix (2026-08-16) was a `min-width` floor on the scroll container's
 * children: the wrapper had `overflow-x: auto` but the grid rows had no
 * intrinsic width, so at 375px nothing overflowed, nothing scrolled, and the
 * `1fr` email column collapsed to a few characters.
 *
 * That floor is `USER_TABLE_COLS * 110px`, so it is only correct while the
 * constant matches the number of columns actually rendered. The header row, a
 * data row and the loading skeleton are three independent hand-written lists of
 * cells — a mismatch between them is precisely what broke this before, and it
 * is invisible to `tsc`. These tests pin all three to the same number.
 */

const listUsers = vi.fn()
const stats = vi.fn()

vi.mock('@ct/shared/api/admin', () => ({
  adminApi: {
    stats: () => stats(),
    listUsers: (p: unknown) => listUsers(p),
    toggleAdmin: vi.fn(),
    deleteUser: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { AdminPage } = await import('./AdminPage')
const { useAuthStore } = await import('@ct/shared/stores/authStore')

const ADMIN_ID = '00000000-0000-0000-0000-0000000000aa'

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'someone@example.com',
  name: 'Someone Example',
  picture_url: null,
  auth_provider: 'password',
  is_admin: false,
  created_at: '2026-05-04T10:00:00Z',
  stripe_customer_id: null,
  current_period_end: null,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={ctLightTheme}>
        <PageHeaderProvider>
          <MemoryRouter>
            <AdminPage />
          </MemoryRouter>
        </PageHeaderProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

/**
 * The users table's own scroll container — the one the fix applies to.
 *
 * Anchored on the "Delete" header cell because the page ALSO renders a
 * read-only "Recent signups" module whose columns include User and Joined; the
 * interactive table is the only one with a Delete column.
 */
function usersTable(): HTMLElement {
  const deleteTh = screen.getByText('Delete')
  const head = deleteTh.parentElement
  if (!head) throw new Error('users table header not found')
  return head.parentElement as HTMLElement
}

/** Direct children of a grid row are its cells, one per column. */
function cellCount(row: Element): number {
  return row.children.length
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: { ...USER, id: ADMIN_ID, name: 'Admin', email: 'admin@example.com', is_admin: true } })
  stats.mockResolvedValue({ total_users: 1, free_users: 1, pro_users: 0, household_users: 0 })
  listUsers.mockResolvedValue({ users: [USER], total: 1, limit: 20, offset: 0 })
})
afterEach(() => { cleanup(); useAuthStore.setState({ user: null }) })

describe('AdminPage users table — column geometry', () => {
  it('renders the four documented columns in the header', async () => {
    renderPage()
    await screen.findByText('Delete')
    const head = usersTable().children[0]
    expect([...head.children].map(c => c.textContent))
      .toEqual(['User', 'Joined', 'Admin', 'Delete'])
  })

  it('gives the header, a data row and the skeleton the SAME cell count', async () => {
    // Hold the users query open so the skeleton and the header co-exist.
    let release: (v: unknown) => void = () => {}
    listUsers.mockReturnValue(new Promise((r) => { release = r }))

    renderPage()
    const table = await waitFor(usersTable)
    const header = table.children[0]
    const cols = cellCount(header)

    // 4 columns is the number the min-width floor is computed from.
    expect(cols).toBe(4)

    const skeletonRow = table.children[1]
    expect(cellCount(skeletonRow)).toBe(cols)

    release({ users: [USER], total: 1, limit: 20, offset: 0 })
    await screen.findByText('Someone Example')

    const dataRow = usersTable().children[1]
    expect(cellCount(dataRow)).toBe(cols)
  })

  it('floors the row width so the container can actually scroll it', async () => {
    renderPage()
    await screen.findByText('Someone Example')
    const table = usersTable()

    // Without this the grid just shrinks to the viewport at 375px: nothing
    // overflows, so `overflow-x: auto` never produces a scrollbar and the 1fr
    // user column collapses instead.
    expect(getComputedStyle(table).overflowX).toBe('auto')

    const floor = Number.parseInt(getComputedStyle(table.children[0]).minWidth, 10)
    expect(floor).toBe(4 * 110)
    // It must exceed the narrowest supported viewport, or it is not a floor.
    expect(floor).toBeGreaterThan(375)
  })
})

describe('AdminPage users table — behaviour', () => {
  it('does not offer the admin destructive controls on their own row', async () => {
    listUsers.mockResolvedValue({
      users: [{ ...USER, id: ADMIN_ID, name: 'Admin', email: 'admin@example.com', is_admin: true }],
      total: 1,
      limit: 20,
      offset: 0,
    })
    renderPage()
    await screen.findByText('Admin')
    // Self-delete and self-demotion are hidden — an admin locking themselves
    // out of their own instance has no recovery path in the UI.
    expect(screen.queryByTitle('Delete user')).toBeNull()
    expect(screen.queryByTitle('Revoke admin')).toBeNull()
  })

  it('tells an empty instance apart from an empty search', async () => {
    listUsers.mockResolvedValue({ users: [], total: 0, limit: 20, offset: 0 })
    renderPage()
    expect(await screen.findByText('No users yet.')).toBeDefined()
  })
})
