import { api } from './client'
import type {
  FinanceSnapshot, FinanceExpense, HealthLog, HealthStreak,
  SkillInventory, CareerEvent, JobOpportunity, BudgetLimit,
  FinancialGoal, FinanceBill, FinanceIncome, CashFlowData, HealthGoal, NutritionToday,
  FinanceInvestment, InvestmentSummary, FinanceLoan, LoanSummary, SleepRecent, HabitItem,
  WorkoutSessionItem, WorkoutPR, FoodDbItem,
  FinanceTransfer, BudgetStatus, LedgerEntry, NetWorth, TxnSearchResult,
  Account, Category, Capture,
} from '@ct/shared/types'

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
  raw_text?: string | null
  source_email_id?: string | null
  parser?: string | null
  /** null = auto-commit off (review required) */
  auto_commit_at: string | null
  status: string
}

export interface PayableItem {
  type: 'bill' | 'loan' | 'cc_bill'
  id: string
  name: string
  amount: number
  category: string
  due_day: number | null
  due_date: string | null
  min_due?: number | null
  account_id: string | null
  account_name: string | null
  is_auto_debit: boolean
  paid: boolean
  paid_at: string | null
  paid_from_account_id: string | null
}

export interface PayablesResponse {
  month: string
  items: PayableItem[]
  total: number
  total_paid: number
  total_unpaid: number
}

export interface CCBillItem {
  id: string
  account_id: string | null
  card_name: string | null
  statement_date: string | null
  due_date: string | null
  total_due: number
  min_due: number | null
  unbilled: number | null
  paid_at: string | null
  paid_amount: number | null
}

export interface MerchantRuleItem {
  id: string
  match_type: 'contains' | 'equals' | 'regex'
  pattern: string
  category_id: string | null
  account_id: string | null
  priority: number
  is_active: boolean
}

export interface IngestResult {
  fetched: number
  txns_queued: number
  cc_bills_queued: number
  skipped_dupes: number
}

export interface SimulationParams {
  months: number
  income_delta_pct: number
  spend_delta_pct: number
  one_time_amount?: number
  one_time_month?: number
}

export interface PendingStats {
  pending_count: number
  /** ISO datetime of the oldest queued item; null when the queue is empty. */
  oldest_pending_at: string | null
  filed_automatically_today: number
  filed_manually_today: number
}

export interface GoalContributionSeries {
  /** "YYYY-MM", oldest first. */
  months: string[]
  goals: Array<{
    goal_id: string
    name: string
    color: string
    /** Same length and order as `months`. Zeros are emitted, never gaps, and a
     *  value may be NEGATIVE — a withdrawal from the pot. */
    series: number[]
  }>
}

/**
 * A single deposit into (or, when negative, withdrawal from) a savings pot.
 *
 * NOTE: this comes back as a raw SQLModel row, so `amount` arrives on the wire
 * as a JSON *string* ("1500.00"), not a number. Typed as `number` to match the
 * convention used across this file — wrap it in `Number()` at the use site.
 */
export interface GoalContribution {
  id: string
  goal_id: string
  amount: number
  contributed_at: string
  note: string | null
  account_id: string | null
}

export interface InvestmentPerformance {
  /** NULL means not computable from the available cashflows. Render as unknown,
   *  NEVER as 0% — see api/areas/finance.py:1651. */
  xirr_pct: number | null
  committed_monthly: number
  realised_sip_monthly: number
  holdings: Array<{
    id: string
    name: string
    type: string
    invested: number
    current_value: number
    gain: number
    gain_pct: number
    xirr_pct: number | null
    cashflow_count: number
  }>
  /** Written by the nightly valuation job — empty until it has run once. */
  series: Array<{ date: string; invested: number; value: number }>
}

/** Raw ORM row — `amount`/`units` arrive as strings. See GoalContribution. */
export interface InvestmentTransaction {
  id: string
  investment_id: string
  kind: 'buy' | 'sell' | 'dividend'
  amount: number
  units: number | null
  transacted_at: string
  is_sip: boolean
  notes: string | null
  account_id: string | null
}

export interface LoanPayments {
  loan_id: string
  outstanding: number
  payments: Array<{
    period: string
    paid_at: string | null
    amount: number
    /** NULL (not 0) when the split predates the amortization capture. The UI
     *  must distinguish "no interest" from "not known" — finance.py:1970. */
    principal: number | null
    interest: number | null
  }>
}

export const financeApi = {
  netWorth: () => api.get<NetWorth>('/areas/finance/net-worth').then(r => r.data),
  simulate: (params: SimulationParams) =>
    api.post<SimulationResult>('/areas/finance/simulate', params).then(r => r.data),
  importCheck: (items: { logged_at: string; amount: number; kind: string; category?: string; description?: string }[]) =>
    api.post<{ duplicates: number[] }>('/areas/finance/import/check', { items }).then(r => r.data),
  importCommit: (items: { logged_at: string; amount: number; kind: string; category?: string; description?: string }[], account_id?: string) =>
    api.post<{ imported_expenses: number; imported_income: number; skipped: number }>('/areas/finance/import/commit', { items, account_id }).then(r => r.data),
  
  // Pending Transactions (Transaction Tracker)
  pending: () => api.get<FinancePendingTransaction[]>('/areas/finance/pending/').then(r => r.data),
  pendingStats: () => api.get<PendingStats>('/areas/finance/pending/stats').then(r => r.data),
  approvePending: (id: string, data: any) => api.post<FinancePendingTransaction>(`/areas/finance/pending/${id}/approve`, data).then(r => r.data),
  dismissPending: (id: string) => api.post<FinancePendingTransaction>(`/areas/finance/pending/${id}/dismiss`).then(r => r.data),
  bulkApprovePending: (ids: string[], account_id?: string) =>
    api.post<{ approved: number; skipped: { id: string; reason: string }[] }>('/areas/finance/pending/bulk-approve', { ids, account_id }).then(r => r.data),
  bulkDismissPending: (ids: string[]) =>
    api.post<{ dismissed: number }>('/areas/finance/pending/bulk-dismiss', { ids }).then(r => r.data),
  settings: () => api.get<{ auto_commit_hours: number | null }>('/areas/finance/settings').then(r => r.data),
  updateSettings: (d: { auto_commit_hours: number | null }) =>
    api.patch<{ auto_commit_hours: number | null }>('/areas/finance/settings', d).then(r => r.data),

  // Email ingestion (Finance OS)
  ingestRun: (newer_than_days = 3) =>
    api.post<IngestResult>('/areas/finance/ingest/run', null, { params: { newer_than_days } }).then(r => r.data),

  // Payables checklist
  payables: (month?: string) =>
    api.get<PayablesResponse>('/areas/finance/payables', { params: { month } }).then(r => r.data),
  togglePaid: (data: { obligation_type: string; obligation_id: string; period: string; paid: boolean; account_id?: string | null; paid_amount?: number | null }) =>
    api.post('/areas/finance/payables/pay', data).then(r => r.data),

  // Credit-card bills
  ccBills: () => api.get<CCBillItem[]>('/areas/finance/cc-bills').then(r => r.data),
  createCCBill: (d: { account_id?: string | null; card_name?: string; statement_date?: string | null; due_date?: string | null; total_due: number; min_due?: number | null; unbilled?: number | null }) =>
    api.post<CCBillItem>('/areas/finance/cc-bills', d).then(r => r.data),
  patchCCBill: (id: string, d: Partial<CCBillItem>) => api.patch<CCBillItem>(`/areas/finance/cc-bills/${id}`, d).then(r => r.data),
  deleteCCBill: (id: string) => api.delete(`/areas/finance/cc-bills/${id}`).then(r => r.data),

  // Merchant rules
  rules: () => api.get<MerchantRuleItem[]>('/areas/finance/rules').then(r => r.data),
  createRule: (d: { match_type: string; pattern: string; category_id?: string | null; account_id?: string | null; priority?: number; is_active?: boolean }) =>
    api.post<MerchantRuleItem>('/areas/finance/rules', d).then(r => r.data),
  patchRule: (id: string, d: Partial<MerchantRuleItem>) => api.patch<MerchantRuleItem>(`/areas/finance/rules/${id}`, d).then(r => r.data),
  deleteRule: (id: string) => api.delete(`/areas/finance/rules/${id}`).then(r => r.data),
  searchTransactions: (p: { q?: string; kind?: string; account_id?: string; category?: string; tag?: string; min_amount?: number; max_amount?: number; date_from?: string; date_to?: string; limit?: number; offset?: number }) =>
    api.get<TxnSearchResult>('/areas/finance/transactions/search', { params: p }).then(r => r.data),
  snapshots: () => api.get<FinanceSnapshot[]>('/areas/finance/snapshots').then(r => r.data),
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
  goalContributionsMonthly: (months = 6) =>
    api.get<GoalContributionSeries>('/areas/finance/goals/contributions/monthly', { params: { months } }).then(r => r.data),
  goalContributions: (goalId: string) =>
    api.get<GoalContribution[]>(`/areas/finance/goals/${goalId}/contributions`).then(r => r.data),
  createGoalContribution: (goalId: string, d: { amount: number; contributed_at?: string; note?: string | null; account_id?: string | null }) =>
    api.post<GoalContribution>(`/areas/finance/goals/${goalId}/contributions`, d).then(r => r.data),
  deleteGoalContribution: (goalId: string, contributionId: string) =>
    api.delete(`/areas/finance/goals/${goalId}/contributions/${contributionId}`).then(r => r.data),
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
  investmentsPerformance: (days = 180) =>
    api.get<InvestmentPerformance>('/areas/finance/investments/performance', { params: { days } }).then(r => r.data),
  investmentTransactions: (p?: { investment_id?: string; limit?: number }) =>
    api.get<InvestmentTransaction[]>('/areas/finance/investments/transactions', { params: p }).then(r => r.data),
  createInvestmentTransaction: (d: { investment_id: string; kind?: 'buy' | 'sell' | 'dividend'; amount: number; units?: number | null; transacted_at?: string; is_sip?: boolean; notes?: string | null; account_id?: string | null }) =>
    api.post<InvestmentTransaction>('/areas/finance/investments/transactions', d).then(r => r.data),
  deleteInvestmentTransaction: (id: string) =>
    api.delete(`/areas/finance/investments/transactions/${id}`).then(r => r.data),
  // Loans / EMI
  loans: () => api.get<FinanceLoan[]>('/areas/finance/loans').then(r => r.data),
  loansSummary: () => api.get<LoanSummary>('/areas/finance/loans/summary').then(r => r.data),
  createLoan: (d: { name: string; loan_type: string; lender?: string; principal_amount: number; outstanding_amount: number; interest_rate: number; emi_amount: number; emi_day: number; tenure_months?: number; notes?: string; account_id?: string }) =>
    api.post<FinanceLoan>('/areas/finance/loans', d).then(r => r.data),
  patchLoan: (id: string, d: Partial<{ name: string; loan_type: string; lender: string | null; principal_amount: number; outstanding_amount: number; interest_rate: number; emi_amount: number; emi_day: number; tenure_months: number | null; is_active: boolean; notes: string | null; account_id: string | null }>) =>
    api.patch<FinanceLoan>(`/areas/finance/loans/${id}`, d).then(r => r.data),
  deleteLoan: (id: string) => api.delete(`/areas/finance/loans/${id}`).then(r => r.data),
  loanPayments: (loanId: string) =>
    api.get<LoanPayments>(`/areas/finance/loans/${loanId}/payments`).then(r => r.data),
}

// Health
export interface RoutineExerciseItem {
  id?: string
  exercise: string
  target_sets: number | null
  target_reps: number | null
  target_weight_kg: number | null
}

export interface WorkoutRoutine {
  id: string
  name: string
  notes: string | null
  is_active: boolean
  /** 0 = Monday … 6 = Sunday, matching Python's date.weekday(). */
  days: number[]
  exercises: RoutineExerciseItem[]
}

export interface RoutinePayload {
  name: string
  notes?: string | null
  is_active?: boolean
  days: number[]
  exercises: Array<{ exercise: string; target_sets?: number | null; target_reps?: number | null; target_weight_kg?: number | null }>
}

interface AdherenceRef { id: string; name: string }

export interface WorkoutAdherenceDay {
  date: string
  weekday: number
  planned: AdherenceRef[]
  completed: AdherenceRef[]
  /** Empty for today — a day still open cannot have been missed. */
  missed: AdherenceRef[]
  /** Training that followed no routine at all. */
  unplanned: AdherenceRef[]
  /** A real routine done on a day it was not scheduled for. Distinct from
   *  `unplanned` on purpose: moving leg day is not going off-plan. */
  off_schedule: AdherenceRef[]
  is_future: boolean
}

export interface WorkoutAdherence {
  days: WorkoutAdherenceDay[]
  planned_total: number
  completed_total: number
  /** NULL when nothing was ever planned — "0%" would accuse a user with no
   *  routines of failing at something. Render as unknown, never as zero. */
  adherence_pct: number | null
  window_days: number
}

export interface MealMacros { calories: number; protein: number; carbs: number; fat: number }

export interface MealPlanEntryItem {
  id: string
  weekday: number
  meal_type: string
  food_id: string | null
  name: string
  quantity_grams: number
  /** NULL for a free-text line — the plan cannot know the macros of
   *  "Mum's sabzi", and zeros would understate the day. */
  macros: MealMacros | null
}

export interface MealPlan {
  id: string
  name: string
  notes: string | null
  is_active: boolean
  entries: MealPlanEntryItem[]
}

export interface MealPlanPayload {
  name: string
  notes?: string | null
  is_active?: boolean
  entries: Array<{ weekday: number; meal_type: string; food_id?: string | null; custom_name?: string | null; quantity_grams: number }>
}

export interface MealPlanToday {
  /** NULL when no plan is active — distinct from a plan with nothing today. */
  plan: { id: string; name: string } | null
  weekday: number
  entries: Array<Omit<MealPlanEntryItem, 'weekday' | 'food_id'> & {
    /** Matched by NAME against today's logged meals. A heuristic: meals logged
     *  through the plan always match, one typed by hand may not. */
    matched: boolean
  }>
  planned_totals: (MealMacros & {
    /** Free-text lines carry no macros, so the totals are a FLOOR, not a sum. */
    incomplete_lines: number
  }) | null
}

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
  /* Meal plans are the intent side of Nutrition. Until 2026-08-04 the daily
     macro targets in Health Settings were hand-typed numbers related to no
     actual food; a plan makes them derivable from real portions. */
  mealPlans: () => api.get<MealPlan[]>('/areas/health/meal-plans').then(r => r.data),
  mealPlanToday: () => api.get<MealPlanToday>('/areas/health/meal-plans/today').then(r => r.data),
  createMealPlan: (d: MealPlanPayload) => api.post<MealPlan>('/areas/health/meal-plans', d).then(r => r.data),
  patchMealPlan: (id: string, d: MealPlanPayload) => api.patch<MealPlan>(`/areas/health/meal-plans/${id}`, d).then(r => r.data),
  deleteMealPlan: (id: string) => api.delete(`/areas/health/meal-plans/${id}`).then(r => r.data),
  logMeal: (d: {calories:number; protein?:number; carbs?:number; fat?:number; meal_type?:string; food_name:string}) =>
    api.post<HealthLog>('/areas/health/logs', {
      entry_type: 'meal',
      value: d.calories,
      unit: 'kcal',
      notes: JSON.stringify({food_name:d.food_name, protein:d.protein??0, carbs:d.carbs??0, fat:d.fat??0, meal_type:d.meal_type??'snack'})
    }).then(r=>r.data),
  logWater: (glasses:number) => api.post<HealthLog>('/areas/health/logs', {entry_type:'water', value:glasses, unit:'glasses'}).then(r=>r.data),
  // Sleep
  sleepRecent: () => api.get<SleepRecent>('/areas/health/sleep/recent').then(r => r.data),
  /* Food catalogue — macros are PER 100g. The base list of ~50 Indian foods is
     seeded per user on the first call: the table was truncated by the
     multi-tenancy migration and had no write endpoint until 2026-08-03, so
     every user's catalogue had been empty and unfillable. */
  /* `limit` matters for pickers that must resolve an ALREADY-CHOSEN food: the
     default 25 is right for search-as-you-type, but a select whose options are
     capped renders a stored value as "Select…". Pass a high limit there. */
  foods: (q?: string, limit?: number) =>
    api.get<FoodDbItem[]>('/areas/health/foods', { params: { q, limit } }).then(r => r.data),
  createFood: (d: { name: string; calories: number; protein?: number; carbs?: number; fat?: number; serving_desc?: string | null; serving_grams?: number | null }) =>
    api.post<FoodDbItem>('/areas/health/foods', d).then(r => r.data),
  deleteFood: (id: string) => api.delete(`/areas/health/foods/${id}`).then(r => r.data),
  /* Routines are the PLAN; a WorkoutSession is the record. Health could only
     express the second until 2026-08-03, which is why "did I do what I said
     I would" was unanswerable. `days` is 0=Mon..6=Sun (date.weekday()). */
  routines: () => api.get<WorkoutRoutine[]>('/areas/health/routines').then(r => r.data),
  createRoutine: (d: RoutinePayload) => api.post<WorkoutRoutine>('/areas/health/routines', d).then(r => r.data),
  patchRoutine: (id: string, d: RoutinePayload) => api.patch<WorkoutRoutine>(`/areas/health/routines/${id}`, d).then(r => r.data),
  deleteRoutine: (id: string) => api.delete(`/areas/health/routines/${id}`).then(r => r.data),
  workoutAdherence: (days = 28) =>
    api.get<WorkoutAdherence>('/areas/health/workouts/adherence', { params: { days } }).then(r => r.data),
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
/** A dated written reflection. Added 2026-08-01. */
export interface JournalEntry {
  id: string
  entry_date: string
  body: string
  title?: string | null
  /** Comma-separated, derived server-side from the body by keyword match. */
  tags?: string | null
  word_count: number
  created_at: string
  updated_at: string
}

export interface JournalStats {
  total_entries: number
  entries_this_month: number
  words_this_month: number
  streak_days: number
  themes: Array<{ tag: string; count: number }>
}

export interface LearningResource {
  id: string
  title: string
  kind: string
  provider: string | null
  url: string | null
  status: 'planned' | 'in_progress' | 'completed' | 'abandoned'
  progress_pct: number
  skill_id: string | null
  /** Resolved server-side so the list does not need the skills query. */
  skill_name: string | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
}

export interface LearningPayload {
  title: string
  kind?: string
  provider?: string | null
  url?: string | null
  status?: string
  progress_pct?: number
  skill_id?: string | null
  started_at?: string | null
  completed_at?: string | null
  notes?: string | null
}

export interface EmploymentRole {
  id: string
  company: string
  title: string
  employment_type: string
  location: string | null
  start_date: string
  /** NULL = current. There is no `is_current` column — it is derived from this
   *  so the two cannot disagree. */
  end_date: string | null
  is_current: boolean
  months: number
  description: string | null
}

export interface RolePayload {
  company: string
  title: string
  employment_type?: string
  location?: string | null
  start_date: string
  end_date?: string | null
  description?: string | null
}

export const careerApi = {
  summary: () => api.get<{ total_skills: number; last_skill_update: string | null; last_event_title: string | null; last_event_at: string | null }>('/areas/career/summary').then(r => r.data),
  skills: () => api.get<SkillInventory[]>('/areas/career/skills').then(r => r.data),
  updateSkill: (id: string, data: { level: string; notes?: string }) =>
    api.put<SkillInventory>(`/areas/career/skills/${id}`, data).then(r => r.data),
  upsertSkill: (data: { skill_name: string; category: string; level: string; notes?: string }) =>
    api.post<SkillInventory>('/areas/career/skills', data).then(r => r.data),
  /* Learning resources. `skill_id` is the load-bearing field: it links a
     course to a `day_0` skill, turning a named gap into a plan for it. */
  learning: () => api.get<LearningResource[]>('/areas/career/learning').then(r => r.data),
  createLearning: (d: LearningPayload) => api.post<LearningResource>('/areas/career/learning', d).then(r => r.data),
  patchLearning: (id: string, d: LearningPayload) => api.patch<LearningResource>(`/areas/career/learning/${id}`, d).then(r => r.data),
  deleteLearning: (id: string) => api.delete(`/areas/career/learning/${id}`).then(r => r.data),
  // Employment history — current roles sort first, server-side.
  roles: () => api.get<EmploymentRole[]>('/areas/career/roles').then(r => r.data),
  createRole: (d: RolePayload) => api.post<EmploymentRole>('/areas/career/roles', d).then(r => r.data),
  patchRole: (id: string, d: RolePayload) => api.patch<EmploymentRole>(`/areas/career/roles/${id}`, d).then(r => r.data),
  deleteRole: (id: string) => api.delete(`/areas/career/roles/${id}`).then(r => r.data),
  events: () => api.get<CareerEvent[]>('/areas/career/events').then(r => r.data),
  createEvent: (data: { event_type: string; title: string; description?: string; skill?: string; skill_level?: string; occurred_at?: string }) =>
    api.post<CareerEvent>('/areas/career/events', data).then(r => r.data),
  // Job opportunities
  opportunities: () => api.get<JobOpportunity[]>('/areas/career/opportunities').then(r => r.data),

  // Journal
  journal: (limit = 50) =>
    api.get<JournalEntry[]>('/areas/career/journal', { params: { limit } }).then(r => r.data),
  journalStats: () => api.get<JournalStats>('/areas/career/journal/stats').then(r => r.data),
  createJournalEntry: (data: { body: string; title?: string; entry_date?: string }) =>
    api.post<JournalEntry>('/areas/career/journal', data).then(r => r.data),
  updateJournalEntry: (id: string, data: { body?: string; title?: string; entry_date?: string }) =>
    api.patch<JournalEntry>(`/areas/career/journal/${id}`, data).then(r => r.data),
  deleteJournalEntry: (id: string) =>
    api.delete(`/areas/career/journal/${id}`).then(r => r.data),
  createOpportunity: (data: { company: string; role: string; status?: string; notes?: string; url?: string; applied_date?: string | null }) =>
    api.post<JobOpportunity>('/areas/career/opportunities', data).then(r => r.data),
  patchOpportunity: (id: string, data: { status?: string; notes?: string; url?: string; applied_date?: string | null }) =>
    api.patch<JobOpportunity>(`/areas/career/opportunities/${id}`, data).then(r => r.data),
  deleteOpportunity: (id: string) =>
    api.delete(`/areas/career/opportunities/${id}`).then(r => r.data),
}

// Business

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
}

export const capturesApi = {
  create: (raw_text: string) => api.post<Capture>('/captures', { raw_text }).then(r => r.data),
  list: () => api.get<Capture[]>('/captures').then(r => r.data),
  parse: (text: string) => api.post<ParsedCapture>('/captures/parse', { text }).then(r => r.data),
}


