import type { UserProfile } from '../stores/authStore'

/** Secondary identity line for profile surfaces (header, sidebar, account
 * popovers). Deliberately never the raw email address — the full address is
 * private and belongs only in Settings. */
export function accountLabel(
  user: Pick<UserProfile, 'is_admin' | 'auth_provider'> | null | undefined
): string {
  if (user?.is_admin) return 'Administrator'
  return user?.auth_provider === 'google' ? 'Google account' : 'Personal account'
}
