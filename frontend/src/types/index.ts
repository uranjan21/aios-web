// ============================================================
// Shared TypeScript types — mirrors DB models + API responses
// ============================================================

export interface VaultSyncStatus {
  file_count: number
  last_synced: string | null
  conflicts: Array<{ id: string; path: string }>
  errors: Array<{ path: string; error: string }>
}

export interface ChatSession {
  id: string
  title: string | null
  tokens_used: number
  input_tokens: number
  output_tokens: number
  started_at: string
  last_message_at: string | null
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: unknown
  tool_results?: unknown
  tokens_used?: number
  created_at: string
}

export type ChatEvent =
  | { type: 'chunk'; content: string }
  | { type: 'tool_call'; tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; status: string; result: string; affected: string[] }
  | { type: 'done'; tokens: { input: number; output: number; daily_remaining: number }; affected_paths: string[] }
  | { type: 'error'; code: string; message: string; retry_after?: number }

export interface TokenBudget {
  used_today: number
  daily_limit: number
  percent: number
  reset_in_seconds: number
}

export interface Agent {
  id: string
  task_id: string
  name: string
  description: string | null
  cron_expression: string
  is_active: boolean
  last_run_at: string | null
  last_run_status: 'success' | 'error' | 'running' | null
  last_output_path: string | null
  last_output_text: string | null
  run_count: number
}

export interface FinanceSnapshot {
  id: string
  snapshot_month: string
  salary: number | null
  take_home: number | null
  net_worth: number | null
  cc_debt: number | null
  emergency_fund: number | null
  total_expenses: number | null
  notes: string | null
  is_estimated: boolean
}

export interface FinanceExpense {
  id: string
  logged_at: string
  amount: number
  category: string
  description: string | null
  source: string
}

export interface HealthLog {
  id: string
  logged_at: string
  entry_type: 'gym' | 'weight' | 'food' | 'water' | 'body_fat' | 'note'
  value: number | null
  unit: string | null
  notes: string | null
}

export interface HealthStreak {
  current_streak: number
  longest_streak: number
  last_workout_at?: string | null
}

export interface SkillInventory {
  id: string
  skill_name: string
  category: string
  level: 'day_0' | 'beginner' | 'practitioner' | 'competent' | 'proficient' | 'expert'
  notes: string | null
  last_updated: string
}

export interface CareerEvent {
  id: string
  occurred_at: string
  event_type: string
  title: string
  description: string | null
  skill: string | null
  skill_level: string | null
}

export interface BusinessEvent {
  id: string
  occurred_at: string
  product: string
  event_type: string
  title: string
  description: string | null
  mrr: number | null
}

export interface ContentItem {
  id: string
  title: string
  platform: 'linkedin' | 'twitter' | 'instagram' | 'youtube' | 'blog'
  status: 'idea' | 'in_progress' | 'scheduled' | 'published' | 'archived'
  idea_date: string | null
  publish_date: string | null
  content_type: string | null
  notes: string | null
}

export interface Integration {
  provider: 'notion' | 'gcal' | 'github'
  status: 'connected' | 'disconnected' | 'expired' | 'error'
  metadata: Record<string, unknown> | null
  token_expires_at: string | null
}

export type OpportunityStatus = 'prospect' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'closed'

export interface JobOpportunity {
  id: string
  company: string
  role: string
  status: OpportunityStatus
  applied_date: string | null
  notes: string | null
  url: string | null
  created_at: string
  updated_at: string
}

export interface BudgetLimit {
  category: string
  monthly_limit: number
  updated_at: string
}
