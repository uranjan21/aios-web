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
 * The redesign merged those two levels into one tree, every destination a real
 * route. `?tab=` is gone; the old URLs redirect (see router.tsx).
 *
 * ── 2026-08-05: THE TREE IS ACTUALLY A TREE NOW ───────────────────────────
 * The 08-01 shape declared five groups but never rendered them. The sidebar
 * flattened it: any area carrying `subs` was promoted to its own top-level
 * accordion, so "Areas" as a heading did not exist on screen, and all 31 rows
 * were open at once — a scrolling wall in which the current page was one row
 * among thirty.
 *
 * Two structural rules now hold, and the sidebar honours both:
 *
 *   1. A GROUP IS A HEADING, NOT A ROW. It labels its members and is never
 *      itself clickable.
 *   2. AN AREA CARRIES `subs` ONLY IF IT REALLY BRANCHES. A group holding one
 *      area whose subs are the actual destinations was two nested wrappers
 *      around one list, and it read as a duplicated heading ("Workspace"
 *      inside "Workspace"). Those are flattened: their destinations are now
 *      direct members of the group. Only Finance, Health and Career branch,
 *      because only they have a page-level identity distinct from their
 *      sub-pages.
 *
 * Result: 15 rows at rest instead of 31, and the group layer is visible.
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
  CalendarRange,
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
  Sunrise,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { DomainKey } from '@ct/shared/theme/ctTheme';

/**
 * Sidebar section headers, in render order.
 *
 * Renamed 2026-08-05. The old set described the codebase, not the user's day:
 * "Home" named a route rather than a purpose, "Areas" is an information-
 * architecture word, and "Intelligence" is not a thing anyone goes looking for
 * — you go looking for the assistant. Each heading now answers "what am I
 * doing when I come here".
 */
export type NavGroup = 'Daily' | 'Life areas' | 'Workspace' | 'Assistant' | 'System';

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
 * The tree. Sub-page ORDER is meaningful — overview-first, then roughly by how
 * often the page is opened.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Daily',
    key: 'group-daily',
    items: [
      /*
       * Flattened 2026-08-05. These were `subs` of a "Today" area inside a
       * "Home" group — two wrappers around three links, and the sidebar drew
       * the heading twice. They are peers: each is a different time horizon on
       * the same question, not a sub-page of the first one.
       */
      {
        key: 'today',
        label: 'Today',
        shortLabel: 'Home',
        to: '/app',
        icon: LayoutDashboard,
        group: 'Daily',
        shortcut: 'd',
        primary: true,
      },
      {
        /* RENAMED 2026-08-05: "Plan" -> "This week", /app/plan -> /app/week.
           `/app/plan` had already changed meaning once (on 2026-08-01 it went
           from the goals/projects/sprints/tasks page to the week planner) and
           kept a name pointing at the old one — while a "planning" sense of
           the word lived on in Workspace. The route now says what the page is.
           `/app/plan` redirects, including its `?view=` form. */
        key: 'week',
        label: 'This week',
        shortLabel: 'Week',
        to: '/app/week',
        icon: CalendarRange,
        group: 'Daily',
        shortcut: 'w',
      },
      {
        // A guided flow that WRITES — it records goal progress via
        // goalsApi.addProgress and creates focus captures. Not a second
        // rendering of the briefing.
        key: 'review',
        label: 'Weekly review',
        to: '/app/review',
        icon: Sunrise,
        group: 'Daily',
      },
    ],
  },
  {
    label: 'Life areas',
    key: 'group-areas',
    items: [
      {
        key: 'finance',
        label: 'Finance',
        to: '/app/finance',
        icon: IndianRupee,
        group: 'Life areas',
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

             ROUTE RENAMED 2026-08-05: /app/finance/settings -> /app/finance/setup.
             The label has said "Setup" since 08-03 — the page holds accounts,
             categories, loan and bill defaults and inbox automation, none of
             which are app settings — but the URL still said `settings`, which
             is the System group's word. The old path redirects with its query
             string intact, so `?section=accounts` deep links survive. */
          { key: 'setup',        label: 'Setup',        icon: SlidersHorizontal, to: '/app/finance/setup' },
        ],
      },
      {
        key: 'health',
        label: 'Health',
        to: '/app/health',
        icon: Heart,
        group: 'Life areas',
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
             nutrition) — the numeric reference lines the other modules draw
             against, not goal entities and not preferences.

             ROUTE RENAMED 2026-08-05: /app/health/settings -> /app/health/targets,
             for the same reason as Finance's Setup. The old path redirects. */
          { key: 'targets',   label: 'Targets',      icon: Target,          to: '/app/health/targets' },
        ],
      },
      {
        key: 'career',
        label: 'Career',
        to: '/app/career',
        icon: Briefcase,
        group: 'Life areas',
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
             redirects to Skills for old bookmarks. */
        ],
      },
    ],
  },
  {
    /*
     * Flattened 2026-08-05, same reason as Daily: this was a "Workspace" group
     * containing a "Workspace" area whose subs were the five real
     * destinations. The heading rendered twice and it cost a click to reach
     * any of them.
     *
     * The ROUTES stay `/app/workspace/*`. They are accurate — every one of
     * these renders `PlanPage`, mounted at `workspace/:section`, and
     * `useAreaSection('/app/workspace', …)` resolves against that prefix.
     * Renaming a correct URL to match a heading would cost a redirect and buy
     * a reader nothing.
     */
    label: 'Workspace',
    key: 'group-ws',
    items: [
      {
        key: 'projects', label: 'Projects', to: '/app/workspace/projects', icon: FolderKanban,
        group: 'Workspace', shortcut: 'k', primary: true, shortLabel: 'Work',
      },
      { key: 'goals',      label: 'Goals',      to: '/app/workspace/goals',      icon: Target,     group: 'Workspace' },
      { key: 'milestones', label: 'Milestones', to: '/app/workspace/milestones', icon: Milestone,  group: 'Workspace' },
      { key: 'sprints',    label: 'Sprints',    to: '/app/workspace/sprints',    icon: Activity,   group: 'Workspace' },
      { key: 'tasks',      label: 'Tasks',      to: '/app/workspace/tasks',      icon: ListChecks, group: 'Workspace' },
    ],
  },
  {
    label: 'Assistant',
    key: 'group-assistant',
    items: [
      { key: 'chat',   label: 'Chat',   to: '/app/chat',   icon: MessageSquare, group: 'Assistant', shortcut: 'c', primary: true, module: 'chat' },
      { key: 'agents', label: 'Agents', to: '/app/agents', icon: Bot,           group: 'Assistant', shortcut: 'a', primary: true, module: 'agents' },
    ],
  },
  {
    label: 'System',
    key: 'group-sys',
    items: [
      /*
       * NO `subs` (2026-08-03). Settings carried the same six entries here AND
       * in the rail that `AreaSettingsPage` renders inside the page, so the
       * user saw one list twice. The rail is the better home: it sits next to
       * what it switches.
       *
       * The `/app/settings/:section` routes are untouched — each tab is still
       * its own URL, and `resolvePath`'s `startsWith` branch keeps the
       * breadcrumb resolving to Settings.
       */
      {
        key: 'settings',
        label: 'Settings',
        to: '/app/settings',
        icon: Settings,
        group: 'System',
        shortcut: 's',
      },
      /* The product manual. No `module` — it describes the modules, so gating it
         would hide the explanation from exactly the people who need it. */
      { key: 'guide', label: 'Guide', to: '/app/guide', icon: BookOpen, group: 'System', shortcut: 'u' },
      { key: 'admin', label: 'Admin', to: '/app/admin', icon: Shield, group: 'System', adminOnly: true },
    ],
  },
];

export const NAV_GROUP_ORDER: NavGroup[] = ['Daily', 'Life areas', 'Workspace', 'Assistant', 'System'];

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
    // Deeper unlisted paths (e.g. /app/settings/security) still belong to the area.
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
