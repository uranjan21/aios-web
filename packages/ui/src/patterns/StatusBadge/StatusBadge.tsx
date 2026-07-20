import type { ReactNode } from 'react';
import { Badge } from '../../primitives/Badge';
import type { BadgeTone } from '../../primitives/Badge';

/**
 * Maps a flexible string status onto one of the semantic Badge tones.
 * Consumers can extend by passing their own `toneMap`.
 */

export type StatusKind =
  | 'todo' | 'pending' | 'pending_data' | 'data_requested' | 'data_received'
  | 'data_verified' | 'in_progress' | 'filing_in_progress' | 'in_review'
  | 'waiting_client' | 'on_hold' | 'paused'
  | 'done' | 'paid' | 'filed' | 'received' | 'completed' | 'success' | 'active'
  | 'upcoming' | 'draft' | 'sent'
  | 'due' | 'partial' | 'partially_received'
  | 'overdue' | 'failed' | 'error' | 'destructive' | 'rejected' | 'not_received'
  | 'na'
  | string;

const DEFAULT_TONE_MAP: Record<string, { tone: BadgeTone; label?: string }> = {
  /* Neutral / not started */
  todo:               { tone: 'neutral',     label: 'To do' },
  pending:            { tone: 'neutral',     label: 'Pending' },
  pending_data:       { tone: 'neutral',     label: 'Pending data' },
  draft:              { tone: 'neutral',     label: 'Draft' },
  not_received:       { tone: 'destructive', label: 'Not received' },
  na:                 { tone: 'neutral',     label: 'N/A' },

  /* In-flight */
  in_progress:        { tone: 'info',        label: 'In progress' },
  filing_in_progress: { tone: 'info',        label: 'Filing…' },
  data_requested:     { tone: 'warning',     label: 'Requested' },
  data_received:      { tone: 'info',        label: 'Data received' },
  data_verified:      { tone: 'info',        label: 'Verified' },
  in_review:          { tone: 'info',        label: 'In review' },
  waiting_client:     { tone: 'warning',     label: 'Waiting on client' },
  partial:            { tone: 'warning',     label: 'Partial' },
  partially_received: { tone: 'warning',     label: 'Partial' },
  sent:               { tone: 'info',        label: 'Sent' },
  upcoming:           { tone: 'info',        label: 'Upcoming' },

  /* Caution */
  on_hold:            { tone: 'warning',     label: 'On hold' },
  paused:             { tone: 'warning',     label: 'Paused' },
  due:                { tone: 'warning',     label: 'Due today' },

  /* Success */
  done:               { tone: 'success',     label: 'Done' },
  completed:          { tone: 'success',     label: 'Completed' },
  paid:               { tone: 'success',     label: 'Paid' },
  filed:              { tone: 'success',     label: 'Filed' },
  received:           { tone: 'success',     label: 'Received' },
  success:            { tone: 'success',     label: 'Success' },
  active:             { tone: 'success',     label: 'Active' },

  /* Destructive */
  overdue:            { tone: 'destructive', label: 'Overdue' },
  failed:             { tone: 'destructive', label: 'Failed' },
  error:              { tone: 'destructive', label: 'Error' },
  destructive:        { tone: 'destructive', label: 'Destructive' },
  rejected:           { tone: 'destructive', label: 'Rejected' },
};

export interface StatusBadgeProps {
  status: string;
  /** Override the default mapping for this instance. */
  toneMap?: Record<string, { tone: BadgeTone; label?: string }>;
  /** Override the displayed label without changing the status key. */
  label?: ReactNode;
  /** Show a coloured dot. Default true. */
  dot?: boolean;
  size?: 'sm' | 'md';
}

function humanize(s: string) {
  return s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function StatusBadge({
  status,
  toneMap,
  label,
  dot = true,
  size = 'md',
}: StatusBadgeProps) {
  const map = { ...DEFAULT_TONE_MAP, ...(toneMap ?? {}) };
  const entry = map[status] ?? { tone: 'neutral' as BadgeTone, label: humanize(status) };
  return (
    <Badge tone={entry.tone} dot={dot} size={size}>
      {label ?? entry.label ?? humanize(status)}
    </Badge>
  );
}
