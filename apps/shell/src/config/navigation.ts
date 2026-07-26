/**
 * Navigation — THE single source of truth.
 *
 * Before this file, three surfaces each carried their own hand-written list
 * and they disagreed about what the app even contains: the sidebar offered 16
 * destinations, the mobile bottom nav 5 (one of which, "Areas", pointed at a
 * bare redirect), and the command palette 10 — omitting Goals, Projects,
 * Sprints, Tasks, Review, Discoveries and Guide entirely. The keyboard
 * `g`-shortcuts were a fourth list, and TopBar's breadcrumb labels a fifth.
 *
 * Sidebar, BottomNav, CommandPalette, the breadcrumb labels and the goto
 * shortcuts all read from here now, so they cannot drift apart again.
 *
 * Adding a destination: add one entry. Set `primary: true` to surface it in
 * the mobile bottom nav (keep that to five or fewer — it is a fixed row).
 */
import {
  Bot,
  Briefcase,
  CalendarCheck,
  Heart,
  IndianRupee,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Target,
  type LucideIcon,
} from 'lucide-react';

export type NavGroup = 'Main' | 'Areas' | 'System';

export interface SubNavItem {
  /** Maps to the `?tab=` query param on the parent route. */
  tabKey: string;
  label: string;
  icon: LucideIcon;
}

export interface NavItem {
  /** Route path. Must match a route in router.tsx. */
  to: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
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
  /** Sub-pages rendered in the global sidebar; navigate via `?tab=` param. */
  subNav?: SubNavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app',          label: 'Today',    shortLabel: 'Home', icon: LayoutDashboard, group: 'Main',   shortcut: 'd', primary: true },
  { to: '/app/chat',     label: 'Chat',     icon: MessageSquare, group: 'Main',   shortcut: 'c', primary: true, module: 'chat' },
  { to: '/app/agents',   label: 'Agents',   icon: Bot,           group: 'Main',   shortcut: 'a', primary: true, module: 'agents' },
  { to: '/app/plan',     label: 'Plan',     icon: Target,        group: 'Main',   shortcut: 'p', primary: true },
  // Kept as its own destination rather than folded into the dashboard: the
  // weekly review is a guided flow that WRITES — it records goal progress via
  // goalsApi.addProgress and creates focus captures. It is not a second
  // rendering of the briefing, which is what the audit assumed.
  { to: '/app/review',   label: 'Review',   icon: CalendarCheck, group: 'Main',   shortcut: 'w' },

  { to: '/app/finance',  label: 'Finance',  icon: IndianRupee,   group: 'Areas',  shortcut: 'f', primary: true, module: 'finance' },
  { to: '/app/health',   label: 'Health',   icon: Heart,         group: 'Areas',  shortcut: 'h', module: 'health' },
  { to: '/app/career',   label: 'Career',   icon: Briefcase,     group: 'Areas',  shortcut: 'r', module: 'career' },

  { to: '/app/settings', label: 'Settings', icon: Settings,      group: 'System', shortcut: 's' },
  { to: '/app/admin',    label: 'Admin',    icon: Shield,        group: 'System', adminOnly: true },
];

export const NAV_GROUP_ORDER: NavGroup[] = ['Main', 'Areas', 'System'];

/** Items for a given group, honouring the admin flag. */
export function navItemsForGroup(group: NavGroup, isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((i) => i.group === group && (!i.adminOnly || isAdmin));
}

/** The (max five) destinations shown in the mobile bottom nav. */
export const PRIMARY_NAV: NavItem[] = NAV_ITEMS.filter((i) => i.primary);

/** `g`-prefix goto map: letter -> path. */
export const GOTO_SHORTCUTS: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.filter((i) => i.shortcut).map((i) => [i.shortcut as string, i.to]),
);

/**
 * Breadcrumb labels for every known path, including sub-pages that are not
 * themselves nav destinations.
 */
export const PAGE_NAMES: Record<string, string> = {
  ...Object.fromEntries(NAV_ITEMS.map((i) => [i.to, i.label])),
  '/app/finance/settings': 'Settings',
  '/app/health/settings': 'Settings',
  '/app/career/settings': 'Settings',
};
