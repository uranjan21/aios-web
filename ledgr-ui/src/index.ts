/**
 * @ledgr/ui — public surface
 *
 * Every export below is API-stable and themable via the ThemeProvider.
 * Internal helpers in `utils/` are intentionally not re-exported.
 */

/* ── Theme ──────────────────────────────────────────────────────────── */
export {
  ThemeProvider,
  GlobalStyles,
  lightTheme,
  darkTheme,
  tokens,
  palette,
  typography,
  spacing,
  radii,
  shadow,
  border,
  motion,
  zIndex,
  breakpoint,
} from './theme';
export type {
  Theme,
  SemanticColor,
  ThemeProviderProps,
} from './theme';

/* ── Primitives ─────────────────────────────────────────────────────── */
export * from './primitives/Button';
export * from './primitives/Input';
export * from './primitives/Textarea';
export * from './primitives/Label';
export * from './primitives/Card';
export * from './primitives/Badge';
export * from './primitives/Avatar';
export * from './primitives/Separator';
export * from './primitives/Stack';
export * from './primitives/Spinner';

/* ── Interactive ────────────────────────────────────────────────────── */
export * from './interactive/Checkbox';
export * from './interactive/Switch';
export * from './interactive/Tooltip';
export * from './interactive/Dialog';
export * from './interactive/Sheet';
export * from './interactive/Popover';
export * from './interactive/DropdownMenu';
export * from './interactive/Tabs';
export * from './interactive/Select';

/* ── Patterns ───────────────────────────────────────────────────────── */
export * from './patterns/EmptyState';
export * from './patterns/PageHeader';
export * from './patterns/AreaToolbar';
export * from './patterns/SegmentedControl';
export * from './patterns/StatusBadge';
export * from './patterns/MonthPicker';
export * from './patterns/DatePicker';
export * from './patterns/Toast';
export * from './patterns/ConfirmDialog';
export * from './patterns/ErrorBoundary';
export * from './patterns/Skeleton';

/* ── Layout shell ───────────────────────────────────────────────────── */
export * from './layout/AppShell';
export * from './layout/Sidebar';
export * from './layout/AppHeader';
export * from './layout/Breadcrumbs';
export * from './layout/MobileBottomNav';

/* ── Data viz ───────────────────────────────────────────────────────── */
export * from './data/StatCard';
export * from './data/DataTable';
export * from './data/KanbanBoard';
export * from './data/ChartCard';
export * from './patterns/KpiCard';
