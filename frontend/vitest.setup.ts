/**
 * Global test setup.
 *
 * `vitest.config.ts` sets `globals: false`, which means Testing Library cannot
 * auto-register its afterEach cleanup — it looks for a global `afterEach` and
 * silently does nothing when there isn't one. Without cleanup the jsdom document
 * ACCUMULATES across tests in a file, so a `queryBy…()).toBeNull()` assertion
 * starts passing or failing based on what an earlier test rendered. That is a
 * particularly nasty failure mode because it makes tests order-dependent while
 * each one looks correct in isolation.
 *
 * Registering it here means no test file has to remember.
 */
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)
