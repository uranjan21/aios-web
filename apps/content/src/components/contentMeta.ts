import type { ContentPlatform, ContentStatus, ContentPriority } from '@aios/shared/types'
import type { StatusPillTone } from '@aios/shared/components/lumina'

/** Platform display label + brand-tinted badge colours (hex only — no Tailwind). */
export const PLATFORM_META: Record<ContentPlatform, { label: string; color: string; bg: string }> = {
  linkedin:  { label: 'LinkedIn',  color: '#0A66C2', bg: 'rgba(10,102,194,0.12)' },
  twitter:   { label: 'Twitter/X', color: '#0284c7', bg: 'rgba(2,132,199,0.12)' },
  instagram: { label: 'Instagram', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  youtube:   { label: 'YouTube',   color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  blog:      { label: 'Blog',      color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
}

export const PLATFORMS: ContentPlatform[] = ['linkedin', 'twitter', 'instagram', 'youtube', 'blog']

export const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: 'Ideas',
  in_progress: 'In Progress',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
}

export const STATUS_TONE: Record<ContentStatus, StatusPillTone> = {
  idea: 'neutral',
  in_progress: 'blue',
  scheduled: 'amber',
  published: 'emerald',
  archived: 'neutral',
}

/** Kanban columns shown on the Pipeline board, in order. */
export const PIPELINE_COLS: ContentStatus[] = ['idea', 'in_progress', 'scheduled', 'published']

export const CONTENT_TYPES = ['post', 'thread', 'article', 'video', 'reel', 'short', 'newsletter', 'carousel'] as const

export const PRIORITY_META: Record<ContentPriority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#64748b' },
  medium: { label: 'Medium', color: '#CA8A04' },
  high:   { label: 'High',   color: '#dc2626' },
}

export function platformLabel(p: string): string {
  return (PLATFORM_META as Record<string, { label: string }>)[p]?.label ?? p
}

/** Parse a comma-separated tag string into a trimmed, non-empty array. */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}
