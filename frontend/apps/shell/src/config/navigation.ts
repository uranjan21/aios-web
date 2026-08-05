/**
 * Navigation — THE single source of truth.
 *
 * Before this file, three surfaces each carried their own hand-written list
 * and they disagreed about what the app even contains. Sidebar, BottomNav,
 * CommandPalette, the breadcrumb labels and the goto shortcuts all read from
 * here now, so they cannot drift apart again.
 *
 * ── 2026-08-01: FLAT LIST -> TWO-LEVEL TREE ───────────────────────────────
 * The app had two competing navigations: a flat 10-item global sidebar, plus a
 * SECOND per-area `ModuleSidebar` rendered inside Finance/Health/Plan/Agents
 * that drove content off a `?tab=` query param. A destination three levels deep
 * was therefore unaddressable, unbookmarkable and invisible to ⌘K.
 *
 * The redesign merges those two levels into one tree: 5 groups -> 9 areas ->
 * 34 destinations, every one a real route. `?tab=` is gone; the old URLs
 * redirect (see router.tsx).
 *
 * Adding a destination: add one entry. Set `primary: true` to surface it in
 * the mobile bottom nav (keep that to five or fewer — it is a fixed row).
 */
import {
  Activity,
  Apple,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  CalendarCheck,
  FolderKanban,
  Gem,
  GraduationCap,
  Heart,
  IndianRupee,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Milestone,
  Moon,
  PiggyBank,
  Receipt,
  Repeat,
  Scale,
  Settings,
  Shield,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { DomainKey } from '@ct/shared/theme/ctTheme';

/** Sidebar section headers, in render order. */
export type NavGroup = 'Home' | 'Areas' | 'Workspace' | 'Intelligence' | 'System';

export interface SubNavItem {
  /** Unique within its parent area. Also the last URL segment, where there is one. */
  key: string;
  label: string;
  icon: LucideIcon;
  /** Absolute route path. */
  to: string;
}

export interface NavItem {
  key: string;
  /** Route path for the area itself — its first sub-page when it has subs. */
  to: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  /**
   * Domain identity colour key. Resolved against `theme.domain` at render time
   * so the indicator rail repaints with the palette; areas without one get a
   * neutral. Deliberately not a hex here — this module must not import a theme.
   */
  domain?: DomainKey;
  /** Single-letter `g`-prefix keyboard shortcut, e.g. `g f` for Finance. */
  shortcut?: string;
  /** Show in the mobile bottom nav. Max five. */
  primary?: boolean;
  /** Only render for admins. */
  adminOnly?: boolean;
  /** Entitlement module gating this destination, if any. */
  module?: string;
  /** Short label for the bottom nav, where horizontal space is tight. */
  shortLabel?: string;
  /** Second-level destinations, rendered nested under the area in the sidebar. */
  subs?: SubNavItem[];
}

export interface NavSection {
  label: NavGroup;
  key: string;
  items: NavItem[];
}

/*
 * The tree, exactly as specified by the redesign canvas. Sub-page ORDER is
 * meaningful — it is the order the design lists them in, which runs
 * overview-first then roughly by how often the page is opened.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Home',
    key: 'group-home',
    items: [
      {
        key: 'today',
        label: 'Today',
        shortLabel: 'Home',
        to: '/app',
        icon: LayoutDashboard,
        group: 'Home',
        shortcut: 'd',
        primary: true,
        subs: [
          { key: 'overview', label: 'Overview',      icon: LayoutDashboard, to: '/app' },
          // The weekly review is a guided flow that WRITES — it records goal
          // progress via goalsApi.addProgress and creates focus captures. It is
          // not a second rendering of the briefing.
          { key: 'review',   label: 'Weekly review', icon: CalendarCheck,   to: '/app/review' },
          // NOTE: /app/plan CHANGED MEANING on 2026-08-01. It used to be the
          // goals/projects/sprints/tasks page (now under Workspace); it is now
          // the week time-blocking planner.
          { key: 'plan',     label: 'Plan',          icon: CalendarCheck,   to: '/app/plan' },
        ],
      },
    ],
  },
  {
    label: 'Areas',
    key: 'group-areas',
    items: [
      {
        key: 'finance',
        label: 'Finance',
        to: '/app/finance',
        icon: IndianRupee,
        group: 'Areas',
        domain: 'finance',
        shortcut: 'f',
        primary: true,
        module: 'finance',
        subs: [
          { key: 'overview',     label: 'Overview',     icon: LayoutDashboard, to: '/app/finance' },
          { key: 'transactions', label: 'Transactions', icon: Wallet,          to: '/app/finance/transactions' },
          { key: 'budgets',      label: 'Budgets',      icon: PiggyBank,       to: '/app/finance/budgets' },
          { key: 'bills',        label: 'Bills',        icon: Receipt,         to: '/app/finance/bills' },
          /* No Goals entry: goals and milestones are set in Workspace for every
             domain (2026-08-02). Finance keeps read-only goal progress on its
             Overview, and the savings-pot tracker lives at
             /app/workspace/goals?domain=finance. */
          { key: 'investments',  label: 'Investments',  icon: Gem,             to: '/app/finance/investments' },
          { key: 'inbox',        label: 'Inbox',        icon: Inbox,           to: '/app/finance/inbox' },
          /* No Accounts and no Loans entry (2026-08-03). Finance Setup's rail
             already renders the SAME components — `AccountManager` and
             `LoansTab`, not settings-only variants of them — so the two lived
             at two paths in two sidebars. They are Setup's now; the old routes
             redirect into the matching rail section.

             Setup is named for what it holds (accounts, categories, loan and
             bill defaults, inbox automation) rather than "Settings", which is
             the System group's word. Reaching it used to require a button in
             the page header; that header is gone and this is its entry point. */
          { key: 'setup',        label: 'Setup',        icon: SlidersHorizontal, to: '/app/finance/settings' },
        ],
      },
      {
        key: 'health',
        label: 'Health',
        to: '/app/health',
        icon: Heart,
        group: 'Areas',
        domain: 'health',
        shortcut: 'h',
        module: 'health',
        subs: [
          { key: 'overview',  label: 'Overview',     icon: LayoutDashboard, to: '/app/health' },
          { key: 'workouts',  label: 'Workouts',     icon: Activity,        to: '/app/health/workouts' },
          { key: 'nutrition', label: 'Nutrition',    icon: Apple,           to: '/app/health/nutrition' },
          { key: 'body',      label: 'Body metrics', icon: Scale,           to: '/app/health/body' },
          { key: 'sleep',     label: 'Sleep',        icon: Moon,            to: '/app/health/sleep' },
          { key: 'habits',    label: 'Habits',       icon: Repeat,          to: '/app/health/habits' },
          /* The page is one group literally labelled "Targets" (body, fitness,
             nutrition). Calling it that here is the honest name, and keeps
             "Settings" meaning the System group's page. */
          { key: 'targets',   label: 'Targets',      icon: Target,          to: '/app/health/settings' },
        ],
      },
      {
        key: 'career',
        label: 'Career',
        to: '/app/career',
        icon: Briefcase,
        group: 'Areas',
        domain: 'career',
        shortcut: 'r',
        module: 'career',
        subs: [
          { key: 'journal',       label: 'Journal',       icon: CalendarCheck, to: '/app/career' },
          /* Promoted out of Career Settings 2026-08-03. The inventory is the
             substance of the area, not a preference — and `day_0` in the level
             enum makes the learning queue a first-class view. */
          { key: 'skills',        label: 'Skills',        icon: GraduationCap, to: '/app/career/skills' },
          /* Learning sits next to Skills because it is what closes the gap
             Skills names: a resource links to a `day_0` skill (2026-08-04). */
          { key: 'learning',      label: 'Learning',      icon: BookOpen,      to: '/app/career/learning' },
          { key: 'experience',    label: 'Experience',    icon: Building2,     to: '/app/career/experience' },
          { key: 'opportunities', label: 'Opportunities', icon: TrendingUp,    to: '/app/career/opportunities' },
          /* No Preferences entry (2026-08-03). Career Settings hosted exactly
             one thing — the skills inventory — so once Skills became its own
             destination the page had no content left. `/app/career/settings`
             redirects to Skills for old bookmarks; CareerSettingsPage.tsx and
             SkillsManager.tsx are kept on disk, unreferenced, the same way the
             redesign kept BriefingCard and CareerLogModal. Restore an entry
             here if Career ever gains a real preference. */
        ],
      },
    ],
  },
  {
    label: 'Workspace',
    key: 'group-ws',
    items: [
      {
        key: 'workspace',
        label: 'Workspace',
        to: '/app/workspace/projects',
        icon: FolderKanban,
        group: 'Workspace',
        shortcut: 'k',
        primary: true,
        shortLabel: 'Work',
        subs: [
          { key: 'projects',   label: 'Projects',   icon: FolderKanban, to: '/app/workspace/projects' },
          { key: 'goals',      label: 'Goals',      icon: Target,       to: '/app/workspace/goals' },
          { key: 'milestones', label: 'Milestones', icon: Milestone,    to: '/app/workspace/milestones' },
          { key: 'sprints',    label: 'Sprints',    icon: Activity,     to: '/app/workspace/sprints' },
          { key: 'tasks',      label: 'Tasks',      icon: ListChecks,   to: '/app/workspace/tasks' },
        ],
      },
    ],
  },
  {
    label: 'Intelligence',
    key: 'group-intel',
    items: [
      { key: 'chat',   label: 'Chat',   to: '/app/chat',   icon: MessageSquare, group: 'Intelligence', shortcut: 'c', primary: true, module: 'chat' },
      { key: 'agents', label: 'Agents', to: '/app/agents', icon: Bot,           group: 'Intelligence', shortcut: 'a', primary: true, module: 'agents' },
    ],
  },
  {
    label: 'System',
    key: 'group-sys',
    items: [
      /*
       * NO `subs` (2026-08-03). Settings carried the same six entries here AND
       * in the rail that `AreaSettingsPage` renders inside the page, so the
       * user saw one list twice — the global sidebar expanded it, and the page
       * repeated it verbatim beside the content. The rail is the better home:
       * it sits next to what it switches, and it is the pattern every area
       * settings page already uses.
       *
       * The `/app/settings/:section` routes are untouched — each tab is still
       * its own URL, still bookmarkable, and `resolvePath`'s `startsWith`
       * branch keeps the breadcrumb resolving to Settings. What changed is
       * only that the sidebar stops enumerating them, and ⌘K offers one
       * "Settings" entry instead of six near-identical ones.
       */
      {
        key: 'settings',
        label: 'Settings',
        to: '/app/settings',
        icon: Settings,
        group: 'System',
        shortcut: 's',
      },
      { key: 'admin', label: 'Admin', to: '/app/admin', icon: Shield, group: 'System', adminOnly: true },
    ],
  },
];

export const NAV_GROUP_ORDER: NavGroup[] = ['Home', 'Areas', 'Workspace', 'Intelligence', 'System'];

/** Every area, flattened out of the tree. */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Sections with admin-only items filtered out for non-admins. */
export function navSections(isAdmin: boolean): NavSection[] {
  return NAV_SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly || isAdmin) }))
    .filter((s) => s.items.length > 0);
}

/** The (max five) destinations shown in the mobile bottom nav. */
export const PRIMARY_NAV: NavItem[] = NAV_ITEMS.filter((i) => i.primary);

/** `g`-prefix goto map: letter -> path. */
export const GOTO_SHORTCUTS: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.filter((i) => i.shortcut).map((i) => [i.shortcut as string, i.to]),
);

/**
 * Every addressable destination as a flat list — what ⌘K indexes. An area with
 * sub-pages contributes its subs, NOT itself, so the palette never offers two
 * entries that land on the same URL.
 */
export interface Destination {
  path: string;
  /** "Finance" for a sub-page, undefined for a standalone area. */
  area?: string;
  label: string;
  icon: LucideIcon;
  module?: string;
  adminOnly?: boolean;
}

export const DESTINATIONS: Destination[] = NAV_ITEMS.flatMap((item) =>
  item.subs
    ? item.subs.map((sub) => ({
        path: sub.to,
        area: item.label,
        label: sub.label,
        icon: sub.icon,
        module: item.module,
        adminOnly: item.adminOnly,
      }))
    : [{ path: item.to, label: item.label, icon: item.icon, module: item.module, adminOnly: item.adminOnly }],
);

/**
 * Resolve a pathname to its place in the tree. Longest-prefix match, so
 * `/app/finance/transactions` beats `/app/finance` and `/app` never swallows
 * everything. Returns nothing for paths outside the tree.
 */
export function resolvePath(pathname: string): { item: NavItem; sub?: SubNavItem } | undefined {
  let best: { item: NavItem; sub?: SubNavItem; len: number } | undefined;

  const consider = (len: number, item: NavItem, sub?: SubNavItem) => {
    if (!best || len > best.len) best = { item, sub, len };
  };

  for (const item of NAV_ITEMS) {
    for (const sub of item.subs ?? []) {
      if (sub.to === pathname) consider(sub.to.length, item, sub);
    }
    if (item.to === pathname) {
      // An area whose own path equals one of its subs' resolves to that sub,
      // so the sidebar highlights "Overview" rather than the bare area.
      const own = item.subs?.find((s) => s.to === pathname);
      consider(item.to.length, item, own);
    }
    // Deeper unlisted paths (e.g. /app/finance/settings) still belong to the area.
    if (pathname.startsWith(`${item.to}/`)) consider(item.to.length, item);
  }

  return best ? { item: best.item, sub: best.sub } : undefined;
}

/**
 * Breadcrumb labels for every known path, including sub-pages that are not
 * themselves nav destinations.
 */
export const PAGE_NAMES: Record<string, string> = {
  ...Object.fromEntries(NAV_ITEMS.map((i) => [i.to, i.label])),
  ...Object.fromEntries(DESTINATIONS.map((d) => [d.path, d.label])),
};
