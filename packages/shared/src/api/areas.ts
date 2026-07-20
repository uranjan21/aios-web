import { api } from './client'
import type {
  FinanceSnapshot, FinanceExpense, HealthLog, HealthStreak,
  SkillInventory, CareerEvent, Business, BusinessEvent, ContentItem, ContentCampaign, ContentStats, JobOpportunity, BudgetLimit,
  FinancialGoal, FinanceBill, FinanceIncome, CashFlowData, HealthGoal, NutritionToday,
  FinanceInvestment, InvestmentSummary, FinanceLoan, LoanSummary, SleepRecent, HabitItem,
  WorkoutSessionItem, WorkoutPR, FoodDbItem,
  FinanceTransfer, BudgetStatus, LedgerEntry, NetWorth, TxnSearchResult, FinanceHealthScore,
  Account, Category, Capture,
} from '@aios/shared/types'

// Finance
export interface SimulationResult {
  labels: string[]
  deterministic: number[]
  p10: number[]
  p50: number[]
  p90: number[]
  zero_month: number | null
  assumptions: {
    start_balance: number
    monthly_income: number
    monthly_spend_mean: number
    monthly_spend_std: number
    data_months: number
  }
}

export interface FinancePendingTransaction {
  id: string
  amount: number
  transaction_type: string
  payee_name: string | null
  suggested_category: string | null
  category_id: string | null
  account_id: string | null
  description: string | null
  logged_at: string
  raw_email_snippet: string
  txn_ref: string | null
  source_account_email: string | null
  /** Account last used for this source inbox — pre-fills the account picker. */
  suggested_account_id: string | null
  /** null = auto-commit off (review required) */
  auto_commit_at: string | null
  status: string
}

export interface SimulationParams {
  months: number
  income_delta_pct: number
  spend_delta_pct: number
  one_time_amount?: number
  one_time_month?: number
}

export const financeApi = {
  netWorth: () => api.get<NetWorth>('/areas/finance/net-worth').then(r => r.data),
  healthScore: () => api.get<FinanceHealthScore>('/areas/finance/health-score').then(r => r.data),
  simulate: (params: SimulationParams) =>
    api.post<SimulationResult>('/areas/finance/simulate', params).then(r => r.data),
  importCheck: (items: { logged_at: string; amount: number; kind: string; category?: string; description?: string }[]) =>
    api.post<{ duplicates: number[] }>('/areas/finance/import/check', { items }).then(r => r.data),
  importCommit: (items: { logged_at: string; amount: number; kind: string; category?: string; description?: string }[], account_id?: string) =>
    api.post<{ imported_expenses: number; imported_income: number; skipped: number }>('/areas/finance/import/commit', { items, account_id }).then(r => r.data),
  
  // Pending Transactions (Transaction Tracker)
  pending: () => api.get<FinancePendingTransaction[]>('/areas/finance/pending/').then(r => r.data),
  approvePending: (id: string, data: any) => api.post<FinancePendingTransaction>(`/areas/finance/pending/${id}/approve`, data).then(r => r.data),
  dismissPending: (id: string) => api.post<FinancePendingTransaction>(`/areas/finance/pending/${id}/dismiss`).then(r => r.data),
  bulkApprovePending: (ids: string[], account_id?: string) =>
    api.post<{ approved: number; skipped: { id: string; reason: string }[] }>('/areas/finance/pending/bulk-approve', { ids, account_id }).then(r => r.data),
  bulkDismissPending: (ids: string[]) =>
    api.post<{ dismissed: number }>('/areas/finance/pending/bulk-dismiss', { ids }).then(r => r.data),
  settings: () => api.get<{ auto_commit_hours: number | null }>('/areas/finance/settings').then(r => r.data),
  updateSettings: (d: { auto_commit_hours: number | null }) =>
    api.patch<{ auto_commit_hours: number | null }>('/areas/finance/settings', d).then(r => r.data),
  searchTransactions: (p: { q?: string; kind?: string; account_id?: string; category?: string; tag?: string; min_amount?: number; max_amount?: number; date_from?: string; date_to?: string; limit?: number; offset?: number }) =>
    api.get<TxnSearchResult>('/areas/finance/transactions/search', { params: p }).then(r => r.data),
  snapshots: () => api.get<FinanceSnapshot[]>('/areas/finance/snapshots').then(r => r.data),
  latestSnapshot: () => api.get<FinanceSnapshot | null>('/areas/finance/snapshots/latest').then(r => r.data),
  expenses: (month?: string, category?: string, limit = 50, offset = 0, time_range?: string, q?: string, account_id?: string) =>
    api.get<{ items: FinanceExpense[]; total: number; has_more: boolean }>(
      '/areas/finance/expenses', { params: { month, category, limit, offset, time_range, q, account_id } }
    ).then(r => r.data),
  createExpense: (data: { amount: number; category_id?: string | null; category?: string; description?: string; logged_at?: string; account_id?: string; tags?: string }) =>
    api.post<FinanceExpense>('/areas/finance/expenses', data).then(r => r.data),
  patchExpense: (id: string, d: Partial<{ amount: number; category_id: string | null; category: string | null; description: string | null; logged_at: string; account_id: string | null; tags: string | null }>) =>
    api.patch<FinanceExpense>(`/areas/finance/expenses/${id}`, d).then(r => r.data),
  deleteExpense: (id: string) => api.delete(`/areas/finance/expenses/${id}`).then(r => r.data),
  // Goals (Savings Pots)
  goals: () => api.get<FinancialGoal[]>('/areas/finance/goals').then(r => r.data),
  createGoal: (d: {name:string; icon?:string; target_amount:number; current_amount?:number; deadline?:string|null; category?:string; color?:string}) => api.post<FinancialGoal>('/areas/finance/goals', d).then(r=>r.data),
  patchGoal: (id:string, d: Partial<{name:string; icon:string; target_amount:number; current_amount:number; deadline:string|null; color:string}>) => api.patch<FinancialGoal>(`/areas/finance/goals/${id}`, d).then(r=>r.data),
  deleteGoal: (id:string) => api.delete(`/areas/finance/goals/${id}`).then(r=>r.data),
  // Bills
  bills: () => api.get<FinanceBill[]>('/areas/finance/bills').then(r => r.data),
  createBill: (d: {name:string; amount:number; due_day:number; category?:string; is_auto_debit?:boolean; notes?:string; account_id?:string}) => api.post<FinanceBill>('/areas/finance/bills', d).then(r=>r.data),
  patchBill: (id:string, d: Partial<FinanceBill>) => api.patch<FinanceBill>(`/areas/finance/bills/${id}`, d).then(r=>r.data),
  deleteBill: (id:string) => api.delete(`/areas/finance/bills/${id}`).then(r=>r.data),
  // Income
  income: (month?: string) => api.get<FinanceIncome[]>('/areas/finance/income', { params: { month } }).then(r => r.data),
  createIncome: (d: {amount:number; category_id?:string|null; source?:string; description?:string; logged_at?:string; account_id?:string; tags?:string}) => api.post<FinanceIncome>('/areas/finance/income', d).then(r=>r.data),
  patchIncome: (id: string, d: Partial<{ amount: number; category_id: string | null; source: string; description: string | null; logged_at: string; account_id: string | null; tags: string | null }>) =>
    api.patch<FinanceIncome>(`/areas/finance/income/${id}`, d).then(r => r.data),
  deleteIncome: (id: string) => api.delete(`/areas/finance/income/${id}`).then(r => r.data),
  // Transfers
  transfers: (month?: string) => api.get<FinanceTransfer[]>('/areas/finance/transfers', { params: { month } }).then(r => r.data),
  createTransfer: (d: { amount: number; from_account_id: string; to_account_id: string; description?: string; logged_at?: string }) =>
    api.post<FinanceTransfer>('/areas/finance/transfers', d).then(r => r.data),
  deleteTransfer: (id: string) => api.delete(`/areas/finance/transfers/${id}`).then(r => r.data),
  // Cashflow
  cashflow: (month?: string) => api.get<CashFlowData>('/areas/finance/cashflow', { params: { month } }).then(r => r.data),
  // Budget limits
  budgets: () => api.get<BudgetLimit[]>('/areas/finance/budgets').then(r => r.data),
  budgetStatus: (month?: string) => api.get<BudgetStatus>('/areas/finance/budgets/status', { params: { month } }).then(r => r.data),
  upsertBudget: (data: { category: string; monthly_limit: number }) =>
    api.put<BudgetLimit>('/areas/finance/budgets', data).then(r => r.data),
  deleteBudget: (category: string) =>
    api.delete(`/areas/finance/budgets/${encodeURIComponent(category)}`).then(r => r.data),
  // Accounts
  accounts: () => api.get<Account[]>('/areas/finance/accounts').then(r => r.data),
  createAccount: (data: { name: string; type: string; balance?: number; currency?: string }) =>
    api.post<Account>('/areas/finance/accounts', data).then(r => r.data),
  updateAccount: (id: string, data: Partial<{ name: string; type: string; balance: number; currency: string }>) =>
    api.patch<Account>(`/areas/finance/accounts/${id}`, data).then(r => r.data),
  deleteAccount: (id: string) => api.delete(`/areas/finance/accounts/${id}`).then(r => r.data),
  accountLedger: (id: string, limit = 50) =>
    api.get<{ account: Account; entries: LedgerEntry[] }>(`/areas/finance/accounts/${id}/ledger`, { params: { limit } }).then(r => r.data),
  // Categories
  categories: (kind?: 'expense' | 'income') => api.get<Category[]>('/areas/finance/categories', { params: { kind } }).then(r => r.data),
  createCategory: (data: { name: string; kind?: string; parent_id?: string | null; icon?: string | null }) =>
    api.post<Category>('/areas/finance/categories', data).then(r => r.data),
  updateCategory: (id: string, data: Partial<{ name: string; parent_id: string | null; icon: string | null }>) =>
    api.patch<Category>(`/areas/finance/categories/${id}`, data).then(r => r.data),
  deleteCategory: (id: string) => api.delete(`/areas/finance/categories/${id}`).then(r => r.data),
  // Investments (portfolio)
  investments: () => api.get<FinanceInvestment[]>('/areas/finance/investments').then(r => r.data),
  investmentsSummary: () => api.get<InvestmentSummary>('/areas/finance/investments/summary').then(r => r.data),
  createInvestment: (d: { name: string; type: string; invested_amount: number; current_value: number; units?: number; purchase_date?: string | null; notes?: string }) =>
    api.post<FinanceInvestment>('/areas/finance/investments', d).then(r => r.data),
  patchInvestment: (id: string, d: Partial<{ name: string; type: string; invested_amount: number; current_value: number; units: number | null; purchase_date: string | null; notes: string | null }>) =>
    api.patch<FinanceInvestment>(`/areas/finance/investments/${id}`, d).then(r => r.data),
  deleteInvestment: (id: string) => api.delete(`/areas/finance/investments/${id}`).then(r => r.data),
  // Loans / EMI
  loans: () => api.get<FinanceLoan[]>('/areas/finance/loans').then(r => r.data),
  loansSummary: () => api.get<LoanSummary>('/areas/finance/loans/summary').then(r => r.data),
  createLoan: (d: { name: string; loan_type: string; lender?: string; principal_amount: number; outstanding_amount: number; interest_rate: number; emi_amount: number; emi_day: number; tenure_months?: number; notes?: string; account_id?: string }) =>
    api.post<FinanceLoan>('/areas/finance/loans', d).then(r => r.data),
  patchLoan: (id: string, d: Partial<{ name: string; loan_type: string; lender: string | null; principal_amount: number; outstanding_amount: number; interest_rate: number; emi_amount: number; emi_day: number; tenure_months: number | null; is_active: boolean; notes: string | null; account_id: string | null }>) =>
    api.patch<FinanceLoan>(`/areas/finance/loans/${id}`, d).then(r => r.data),
  deleteLoan: (id: string) => api.delete(`/areas/finance/loans/${id}`).then(r => r.data),
}

// Health
export const healthApi = {
  logs: (entry_type?: string) =>
    api.get<{ items: HealthLog[]; next_cursor: string | null; has_more: boolean }>('/areas/health/logs', { params: { entry_type } }).then(r => r.data.items),
  createLog: (data: { entry_type: string; value?: number; unit?: string; notes?: string; logged_at?: string }) =>
    api.post<HealthLog>('/areas/health/logs', data).then(r => r.data),
  streak: () => api.get<HealthStreak>('/areas/health/streak').then(r => r.data),
  summary: () => api.get('/areas/health/summary').then(r => r.data),
  healthGoals: () => api.get<HealthGoal>('/areas/health/goals').then(r => r.data),
  updateHealthGoals: (d: Partial<HealthGoal>) => api.put<HealthGoal>('/areas/health/goals', d).then(r=>r.data),
  nutritionToday: () => api.get<NutritionToday>('/areas/health/nutrition/today').then(r => r.data),
  waterToday: () => api.get<{glasses_logged:number; target:number}>('/areas/health/water/today').then(r => r.data),
  stepsToday: () => api.get<{steps_logged:number; target:number}>('/areas/health/steps/today').then(r => r.data),
  logMeal: (d: {calories:number; protein?:number; carbs?:number; fat?:number; meal_type?:string; food_name:string}) =>
    api.post<HealthLog>('/areas/health/logs', {
      entry_type: 'meal',
      value: d.calories,
      unit: 'kcal',
      notes: JSON.stringify({food_name:d.food_name, protein:d.protein??0, carbs:d.carbs??0, fat:d.fat??0, meal_type:d.meal_type??'snack'})
    }).then(r=>r.data),
  logWater: (glasses:number) => api.post<HealthLog>('/areas/health/logs', {entry_type:'water', value:glasses, unit:'glasses'}).then(r=>r.data),
  logSteps: (steps:number) => api.post<HealthLog>('/areas/health/logs', {entry_type:'steps', value:steps, unit:'steps'}).then(r=>r.data),
  // Sleep
  sleepRecent: () => api.get<SleepRecent>('/areas/health/sleep/recent').then(r => r.data),
  foods: (q?: string) => api.get<FoodDbItem[]>('/areas/health/foods', { params: { q } }).then(r => r.data),
  createFood: (d: { name: string; calories: number; protein?: number; carbs?: number; fat?: number; serving_desc?: string; serving_grams?: number }) =>
    api.post<FoodDbItem>('/areas/health/foods', d).then(r => r.data),
  workouts: (limit = 10) => api.get<WorkoutSessionItem[]>('/areas/health/workouts', { params: { limit } }).then(r => r.data),
  workoutPrs: () => api.get<WorkoutPR[]>('/areas/health/workouts/prs').then(r => r.data),
  createWorkout: (d: { name: string; notes?: string; sets: { exercise: string; reps: number; weight_kg?: number }[] }) =>
    api.post<{ id: string; new_prs: { exercise: string; weight_kg: number; previous: number | null }[] }>('/areas/health/workouts', d).then(r => r.data),
  deleteWorkout: (id: string) => api.delete(`/areas/health/workouts/${id}`).then(r => r.data),
  habits: () => api.get<HabitItem[]>('/areas/health/habits').then(r => r.data),
  createHabit: (d: { name: string; icon?: string }) => api.post('/areas/health/habits', d).then(r => r.data),
  deleteHabit: (id: string) => api.delete(`/areas/health/habits/${id}`).then(r => r.data),
  toggleHabit: (id: string, date?: string) => api.post<{ checked: boolean; date: string }>(`/areas/health/habits/${id}/toggle`, { date }).then(r => r.data),
}

// Career
export const careerApi = {
  summary: () => api.get<{ total_skills: number; last_skill_update: string | null; last_event_title: string | null; last_event_at: string | null }>('/areas/career/summary').then(r => r.data),
  skills: () => api.get<SkillInventory[]>('/areas/career/skills').then(r => r.data),
  updateSkill: (id: string, data: { level: string; notes?: string }) =>
    api.put<SkillInventory>(`/areas/career/skills/${id}`, data).then(r => r.data),
  upsertSkill: (data: { skill_name: string; category: string; level: string; notes?: string }) =>
    api.post<SkillInventory>('/areas/career/skills', data).then(r => r.data),
  events: () => api.get<CareerEvent[]>('/areas/career/events').then(r => r.data),
  createEvent: (data: { event_type: string; title: string; description?: string; skill?: string; skill_level?: string; occurred_at?: string }) =>
    api.post<CareerEvent>('/areas/career/events', data).then(r => r.data),
  roadmap: () => api.get('/areas/career/roadmap').then(r => r.data),
  // Job opportunities
  opportunities: () => api.get<JobOpportunity[]>('/areas/career/opportunities').then(r => r.data),
  createOpportunity: (data: { company: string; role: string; status?: string; notes?: string; url?: string; applied_date?: string | null }) =>
    api.post<JobOpportunity>('/areas/career/opportunities', data).then(r => r.data),
  patchOpportunity: (id: string, data: { status?: string; notes?: string; url?: string; applied_date?: string | null }) =>
    api.patch<JobOpportunity>(`/areas/career/opportunities/${id}`, data).then(r => r.data),
  deleteOpportunity: (id: string) =>
    api.delete(`/areas/career/opportunities/${id}`).then(r => r.data),
}

// Business
export const businessApi = {
  list: () => api.get<Business[]>('/areas/business/').then(r => r.data),
  create: (data: { name: string; business_type: string; description?: string; color?: string }) =>
    api.post<Business>('/areas/business/', data).then(r => r.data),
  update: (id: string, data: Partial<{ name: string; business_type: string; status: string; description: string | null; color: string }>) =>
    api.patch<Business>(`/areas/business/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/areas/business/${id}`).then(r => r.data),
  events: (business_id?: string) => api.get<BusinessEvent[]>('/areas/business/events', { params: { business_id } }).then(r => r.data),
  createEvent: (data: { event_type: string; title: string; description?: string; mrr?: number; product?: string; business_id?: string; occurred_at?: string }) =>
    api.post<BusinessEvent>('/areas/business/events', data).then(r => r.data),
  summary: (business_id?: string) => api.get('/areas/business/summary', { params: { business_id } }).then(r => r.data),
  mrrHistory: (business_id?: string) => api.get<{ date: string; mrr: number; title: string }[]>('/areas/business/mrr-history', { params: { business_id } }).then(r => r.data),
}

// Captures (quick log inbox)
export interface ParsedCapture {
  domain: 'finance_expense' | 'finance_income' | 'health_meal' | 'health_water' | 'health_weight' | 'health_gym' | 'capture'
  fields: Record<string, any>
  summary: string
}

export const aiApi = {
  explain: (area: 'finance' | 'health') => api.post<{ text: string; facts?: string }>('/ai/explain', { area }).then(r => r.data),
  skillGap: (target_role: string) => api.post<{ text: string }>('/ai/skill-gap', { target_role }).then(r => r.data),
  draft: (title: string, platform: string, notes?: string) => api.post<{ text: string }>('/ai/draft', { title, platform, notes }).then(r => r.data),
  dailyBrief: () => api.post<{ text: string; generated_at: string }>('/ai/daily-brief').then(r => r.data),
}

export const capturesApi = {
  create: (raw_text: string) => api.post<Capture>('/captures', { raw_text }).then(r => r.data),
  list: () => api.get<Capture[]>('/captures').then(r => r.data),
  parse: (text: string) => api.post<ParsedCapture>('/captures/parse', { text }).then(r => r.data),
}

// Content
export interface ContentItemFilters {
  status?: string; platform?: string; content_type?: string
  campaign_id?: string; tag?: string; q?: string
}
export type ContentItemInput = Partial<Omit<ContentItem, 'id' | 'position' | 'views' | 'likes' | 'comments' | 'shares'>> & {
  views?: number; likes?: number; comments?: number; shares?: number; position?: number
}
export type CampaignInput = {
  name?: string; description?: string | null; goal?: string | null; color?: string
  status?: string; start_date?: string | null; end_date?: string | null
}

export const contentApi = {
  items: (filters: ContentItemFilters = {}) =>
    api.get<ContentItem[]>('/areas/content/items', { params: filters }).then(r => r.data),
  createItem: (data: ContentItemInput) =>
    api.post<ContentItem>('/areas/content/items', data).then(r => r.data),
  patchItem: (id: string, data: ContentItemInput) =>
    api.patch<ContentItem>(`/areas/content/items/${id}`, data).then(r => r.data),
  deleteItem: (id: string) => api.delete(`/areas/content/items/${id}`).then(r => r.data),

  campaigns: () => api.get<ContentCampaign[]>('/areas/content/campaigns').then(r => r.data),
  createCampaign: (data: CampaignInput) =>
    api.post<ContentCampaign>('/areas/content/campaigns', data).then(r => r.data),
  patchCampaign: (id: string, data: CampaignInput) =>
    api.patch<ContentCampaign>(`/areas/content/campaigns/${id}`, data).then(r => r.data),
  deleteCampaign: (id: string) => api.delete(`/areas/content/campaigns/${id}`).then(r => r.data),

  stats: () => api.get<ContentStats>('/areas/content/stats').then(r => r.data),
  twitterQueue: () => api.get('/areas/content/twitter-queue').then(r => r.data),
}
