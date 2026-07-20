export const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

export const STATUS_OPTIONS = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
]

export const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
]

export const DOMAIN_OPTIONS = [
  { label: 'General', value: 'general' },
  { label: 'Finance', value: 'finance' },
  { label: 'Health', value: 'health' },
  { label: 'Career', value: 'career' },
  { label: 'Business', value: 'business' },
  { label: 'Content', value: 'content' },
]

export const DOMAIN_LABEL: Record<string, string> = {
  finance: 'Finance',
  health: 'Health',
  career: 'Career',
  business: 'Business',
  content: 'Content',
}
