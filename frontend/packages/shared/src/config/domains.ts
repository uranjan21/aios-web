/**
 * Life domains — THE single source of truth.
 *
 * Before this file existed the domain list was re-typed by hand in at least
 * eight places (ProjectsPage, SprintsPage, TasksPage/constants, GoalsPage tabs,
 * Sidebar, CommandPalette, DomainPulseCard, GlobalAddTaskDialog). They drifted:
 * the sidebar offered five domains, the command palette five, the task filter
 * six (it counted "General"), and none of them agreed on ordering. Anything
 * that enumerates domains must import from here instead.
 *
 * `ACTIVE_DOMAINS` is what the UI offers. `RETIRED_DOMAINS` are keys that no
 * longer have a surface but still exist in the database — the 2026-07-21
 * redesign removed the Business and Content areas without dropping their
 * tables, so a user can still own a goal, project or task tagged `business`.
 * Those rows must render with a real label instead of falling through to
 * blank, which is why `domainLabel()` resolves retired keys but the picker
 * options do not offer them.
 */

/** Domains with a live surface in the app. Order is the display order. */
export const ACTIVE_DOMAINS = [
  { key: 'finance', label: 'Finance' },
  { key: 'health', label: 'Health' },
  { key: 'career', label: 'Career' },
] as const;

/**
 * Keys retired from the UI whose data still exists.
 * Do NOT re-add these to `ACTIVE_DOMAINS` to "fix" a legacy row — the row is
 * meant to be re-tagged or left alone, not to resurrect a deleted area.
 */
export const RETIRED_DOMAINS = [
  { key: 'business', label: 'Business' },
  { key: 'content', label: 'Content' },
] as const;

export type ActiveDomainKey = (typeof ACTIVE_DOMAINS)[number]['key'];
export type RetiredDomainKey = (typeof RETIRED_DOMAINS)[number]['key'];

/** Every key that may appear on a record, live or legacy, plus the null bucket. */
export type DomainKey = ActiveDomainKey | RetiredDomainKey | 'general';

export const ACTIVE_DOMAIN_KEYS: readonly ActiveDomainKey[] = ACTIVE_DOMAINS.map((d) => d.key);

/** Label lookup covering active, retired and the domain-less bucket. */
const LABELS: Record<string, string> = {
  general: 'General',
  ...Object.fromEntries(ACTIVE_DOMAINS.map((d) => [d.key, d.label])),
  ...Object.fromEntries(RETIRED_DOMAINS.map((d) => [d.key, d.label])),
};

/**
 * Human label for any domain key, including retired ones and unknown values.
 * Never returns empty — an unrecognised key is title-cased rather than dropped,
 * so a future backend value degrades visibly instead of silently.
 */
export function domainLabel(key: string | null | undefined): string {
  if (!key) return LABELS.general;
  return LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** True when a key still has a live surface (i.e. is safe to link to). */
export function isActiveDomain(key: string | null | undefined): key is ActiveDomainKey {
  return !!key && ACTIVE_DOMAIN_KEYS.includes(key as ActiveDomainKey);
}

/**
 * Options for a domain picker: the domain-less bucket plus every active domain.
 * Retired keys are deliberately absent — nothing new should be tagged with them.
 */
export const DOMAIN_OPTIONS: { label: string; value: string }[] = [
  { label: 'General', value: 'general' },
  ...ACTIVE_DOMAINS.map((d) => ({ label: d.label, value: d.key })),
];

/**
 * Picker options for an existing record, which may already carry a retired key.
 * Keeps the current value selectable so opening an edit dialog on a legacy row
 * doesn't silently re-tag it as General on save.
 */
export function domainOptionsFor(currentValue?: string | null): { label: string; value: string }[] {
  if (currentValue && !DOMAIN_OPTIONS.some((o) => o.value === currentValue)) {
    return [...DOMAIN_OPTIONS, { label: domainLabel(currentValue), value: currentValue }];
  }
  return DOMAIN_OPTIONS;
}
