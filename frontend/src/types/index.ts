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
  account_id: string | null
  tags: string | null
  split_group_id: string | null
}

export interface HealthLog {
  id: string
  logged_at: string
  entry_type: 'gym' | 'weight' | 'food' | 'meal' | 'water' | 'steps' | 'body_fat' | 'sleep' | 'note'
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

export interface FinancialGoal {
  id: string; name: string; icon: string; target_amount: number;
  current_amount: number; deadline: string | null; category: string;
  color: string; created_at: string;
}
export interface FinanceBill {
  id: string; name: string; amount: number; due_day: number;
  category: string; is_auto_debit: boolean; is_active: boolean; notes: string | null;
  account_id: string | null; last_posted_period: string | null;
}
export interface FinanceIncome {
  id: string; amount: number; source: string; description: string | null; logged_at: string;
  account_id: string | null; tags: string | null;
}
export interface FinanceTransfer {
  id: string; amount: number; from_account_id: string; to_account_id: string;
  description: string | null; logged_at: string;
}
export interface BudgetStatusItem {
  category: string; monthly_limit: number; spent: number; remaining: number; pct: number;
}
export interface BudgetStatus {
  month: string; items: BudgetStatusItem[];
}
export interface LedgerEntry {
  id: string; kind: 'expense' | 'income' | 'transfer'; amount: number; label: string; logged_at: string;
}
export interface CashFlowData {
  month: string; income_total: number; expense_total: number; savings_rate: number;
  by_day: { date: string; income: number; expense: number }[];
}
export interface HealthGoal {
  calorie_target: number; protein_target: number; carb_target: number;
  fat_target: number; water_target: number; steps_target: number; sleep_target: number;
  height_cm: number | null;
}
export interface NutritionToday {
  calories: number; protein: number; carbs: number; fat: number;
  meals: { id: string; logged_at: string; notes: string | null }[];
}

// ── Investments (portfolio tracker) ────────────────────────────────────────────
export interface FinanceInvestment {
  id: string; name: string; type: string; invested_amount: number;
  current_value: number; units: number | null; purchase_date: string | null;
  notes: string | null; created_at: string;
}
export interface InvestmentSummary {
  total_invested: number; current_value: number; returns_amount: number;
  returns_pct: number; allocation: { type: string; value: number }[];
}

// ── Loans / EMI tracker ────────────────────────────────────────────
export interface FinanceLoan {
  id: string; name: string; loan_type: string; lender: string | null;
  principal_amount: number; outstanding_amount: number; interest_rate: number;
  emi_amount: number; emi_day: number; tenure_months: number | null;
  is_active: boolean; notes: string | null;
  account_id: string | null; last_posted_period: string | null;
}
export interface LoanSummary {
  total_outstanding: number; total_emi: number; active_count: number;
}
export interface NetWorth {
  net_worth: number; accounts_total: number; investments_total: number; loans_outstanding: number;
}
export interface HealthScoreComponent {
  key: string; label: string; available: boolean; score: number | null; display: string;
}
export interface FinanceHealthScore {
  score: number; band: 'excellent' | 'good' | 'fair' | 'attention'; components: HealthScoreComponent[];
  prev?: {
    score: number; band: 'excellent' | 'good' | 'fair' | 'attention'; components: HealthScoreComponent[];
  };
}
export interface TxnSearchItem {
  id: string; kind: 'expense' | 'income' | 'transfer'; logged_at: string;
  amount: number; category: string | null; description: string | null; account_id: string | null;
  tags: string | null; split_group_id: string | null;
}
export interface TxnSearchResult {
  items: TxnSearchItem[]; total: number; has_more: boolean;
}

// ── Food DB ──────────────────────────────────────────
export interface FoodDbItem {
  id: string; name: string; calories: number; protein: number; carbs: number; fat: number;
  serving_desc: string | null; serving_grams: number | null; is_custom: boolean;
}

// ── Workouts ─────────────────────────────────────────
export interface WorkoutSetItem {
  id: string; exercise: string; set_number: number; reps: number; weight_kg: number | null;
}
export interface WorkoutSessionItem {
  id: string; name: string; logged_at: string; notes: string | null; sets: WorkoutSetItem[];
}
export interface WorkoutPR {
  exercise: string; weight_kg: number; reps: number;
}

// ── Habits ───────────────────────────────────────────
export interface HabitItem {
  id: string; name: string; icon: string | null; streak: number; checks: string[];
}

// ── Sleep ────────────────────────────────────────────
export interface SleepRecent {
  daily: { date: string; hours: number; quality: string | null }[]
  weekly_avg: number; target: number; last_night: number | null;
}
