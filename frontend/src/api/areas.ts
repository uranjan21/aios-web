import { api } from './client'
import type {
  FinanceSnapshot, FinanceExpense, HealthLog, HealthStreak,
  SkillInventory, CareerEvent, BusinessEvent, ContentItem, JobOpportunity, BudgetLimit,
  FinancialGoal, FinanceBill, FinanceIncome, CashFlowData, HealthGoal, NutritionToday,
  FinanceInvestment, InvestmentSummary, FinanceLoan, LoanSummary, SleepRecent,
} from '@/types'

// Finance
export const financeApi = {
  snapshots: () => api.get<FinanceSnapshot[]>('/areas/finance/snapshots').then(r => r.data),
  latestSnapshot: () => api.get<FinanceSnapshot | null>('/areas/finance/snapshots/latest').then(r => r.data),
  expenses: (month?: string, category?: string, limit = 50, offset = 0, time_range?: string) =>
    api.get<{ items: FinanceExpense[]; total: number; has_more: boolean }>(
      '/areas/finance/expenses', { params: { month, category, limit, offset, time_range } }
    ).then(r => r.data),
  createExpense: (data: { amount: number; category: string; description?: string }) =>
    api.post<FinanceExpense>('/areas/finance/expenses', data).then(r => r.data),
  // Goals (Savings Pots)
  goals: () => api.get<FinancialGoal[]>('/areas/finance/goals').then(r => r.data),
  createGoal: (d: {name:string; icon?:string; target_amount:number; current_amount?:number; deadline?:string|null; category?:string; color?:string}) => api.post<FinancialGoal>('/areas/finance/goals', d).then(r=>r.data),
  patchGoal: (id:string, d: Partial<{name:string; icon:string; target_amount:number; current_amount:number; deadline:string|null; color:string}>) => api.patch<FinancialGoal>(`/areas/finance/goals/${id}`, d).then(r=>r.data),
  deleteGoal: (id:string) => api.delete(`/areas/finance/goals/${id}`).then(r=>r.data),
  // Bills
  bills: () => api.get<FinanceBill[]>('/areas/finance/bills').then(r => r.data),
  createBill: (d: {name:string; amount:number; due_day:number; category?:string; is_auto_debit?:boolean; notes?:string}) => api.post<FinanceBill>('/areas/finance/bills', d).then(r=>r.data),
  patchBill: (id:string, d: Partial<FinanceBill>) => api.patch<FinanceBill>(`/areas/finance/bills/${id}`, d).then(r=>r.data),
  deleteBill: (id:string) => api.delete(`/areas/finance/bills/${id}`).then(r=>r.data),
  // Income
  income: () => api.get<FinanceIncome[]>('/areas/finance/income').then(r => r.data),
  createIncome: (d: {amount:number; source:string; description?:string; logged_at?:string}) => api.post<FinanceIncome>('/areas/finance/income', d).then(r=>r.data),
  // Cashflow
  cashflow: () => api.get<CashFlowData>('/areas/finance/cashflow').then(r => r.data),
  // Budget limits
  budgets: () => api.get<BudgetLimit[]>('/areas/finance/budgets').then(r => r.data),
  upsertBudget: (data: { category: string; monthly_limit: number }) =>
    api.put<BudgetLimit>('/areas/finance/budgets', data).then(r => r.data),
  deleteBudget: (category: string) =>
    api.delete(`/areas/finance/budgets/${encodeURIComponent(category)}`).then(r => r.data),
  // Accounts
  accounts: () => api.get<any[]>('/areas/finance/accounts').then(r => r.data),
  createAccount: (data: { name: string; type: string; balance?: number; currency?: string }) =>
    api.post<any>('/areas/finance/accounts', data).then(r => r.data),
  deleteAccount: (id: string) => api.delete(`/areas/finance/accounts/${id}`).then(r => r.data),
  // Categories
  categories: () => api.get<any[]>('/areas/finance/categories').then(r => r.data),
  createCategory: (data: { name: string; parent_id?: string | null; icon?: string | null }) =>
    api.post<any>('/areas/finance/categories', data).then(r => r.data),
  deleteCategory: (id: string) => api.delete(`/areas/finance/categories/${id}`).then(r => r.data),
  // Investments (portfolio)
  investments: () => api.get<FinanceInvestment[]>('/areas/finance/investments').then(r => r.data),
  investmentsSummary: () => api.get<InvestmentSummary>('/areas/finance/investments/summary').then(r => r.data),
  createInvestment: (d: { name: string; type: string; invested_amount: number; current_value: number; units?: number; purchase_date?: string | null; notes?: string }) =>
    api.post<FinanceInvestment>('/areas/finance/investments', d).then(r => r.data),
  patchInvestment: (id: string, d: Partial<{ name: string; type: string; invested_amount: number; current_value: number; units: number; purchase_date: string | null; notes: string }>) =>
    api.patch<FinanceInvestment>(`/areas/finance/investments/${id}`, d).then(r => r.data),
  deleteInvestment: (id: string) => api.delete(`/areas/finance/investments/${id}`).then(r => r.data),
  // Loans / EMI
  loans: () => api.get<FinanceLoan[]>('/areas/finance/loans').then(r => r.data),
  loansSummary: () => api.get<LoanSummary>('/areas/finance/loans/summary').then(r => r.data),
  createLoan: (d: { name: string; loan_type: string; lender?: string; principal_amount: number; outstanding_amount: number; interest_rate: number; emi_amount: number; emi_day: number; tenure_months?: number; notes?: string }) =>
    api.post<FinanceLoan>('/areas/finance/loans', d).then(r => r.data),
  patchLoan: (id: string, d: Partial<{ outstanding_amount: number; is_active: boolean; notes: string }>) =>
    api.patch<FinanceLoan>(`/areas/finance/loans/${id}`, d).then(r => r.data),
  deleteLoan: (id: string) => api.delete(`/areas/finance/loans/${id}`).then(r => r.data),
}

// Health
export const healthApi = {
  logs: (entry_type?: string) =>
    api.get<HealthLog[]>('/areas/health/logs', { params: { entry_type } }).then(r => r.data),
  createLog: (data: { entry_type: string; value?: number; unit?: string; notes?: string; logged_at?: string }) =>
    api.post<HealthLog>('/areas/health/logs', data).then(r => r.data),
  streak: () => api.get<HealthStreak>('/areas/health/streak').then(r => r.data),
  summary: () => api.get('/areas/health/summary').then(r => r.data),
  healthGoals: () => api.get<HealthGoal>('/areas/health/goals').then(r => r.data),
  updateHealthGoals: (d: Partial<HealthGoal>) => api.put<HealthGoal>('/areas/health/goals', d).then(r=>r.data),
  nutritionToday: () => api.get<NutritionToday>('/areas/health/nutrition/today').then(r => r.data),
  waterToday: () => api.get<{glasses_logged:number; target:number}>('/areas/health/water/today').then(r => r.data),
  stepsToday: () => api.get<{steps:number; target:number}>('/areas/health/steps/today').then(r => r.data),
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
}

// Career
export const careerApi = {
  summary: () => api.get<{ total_skills: number; last_skill_update: string | null; last_event_title: string | null; last_event_at: string | null }>('/areas/career/summary').then(r => r.data),
  skills: () => api.get<SkillInventory[]>('/areas/career/skills').then(r => r.data),
  updateSkill: (id: string, data: { level: string; notes?: string }) =>
    api.put<SkillInventory>(`/areas/career/skills/${id}`, data).then(r => r.data),
  events: () => api.get<CareerEvent[]>('/areas/career/events').then(r => r.data),
  createEvent: (data: { event_type: string; title: string; description?: string }) =>
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
  events: () => api.get<BusinessEvent[]>('/areas/business/events').then(r => r.data),
  createEvent: (data: { event_type: string; title: string; description?: string; mrr?: number }) =>
    api.post<BusinessEvent>('/areas/business/events', data).then(r => r.data),
  summary: () => api.get('/areas/business/summary').then(r => r.data),
}

// Captures (quick log inbox)
export const capturesApi = {
  create: (raw_text: string) => api.post('/captures', { raw_text }).then(r => r.data),
  list: () => api.get('/captures').then(r => r.data),
}

// Content
export const contentApi = {
  items: (status?: string, platform?: string) =>
    api.get<ContentItem[]>('/areas/content/items', { params: { status, platform } }).then(r => r.data),
  createItem: (data: { title: string; platform: string; content_type?: string; notes?: string }) =>
    api.post<ContentItem>('/areas/content/items', data).then(r => r.data),
  patchItem: (id: string, data: { title?: string; platform?: string; content_type?: string; status?: string; publish_date?: string; notes?: string }) =>
    api.patch<ContentItem>(`/areas/content/items/${id}`, data).then(r => r.data),
  deleteItem: (id: string) => api.delete(`/areas/content/items/${id}`).then(r => r.data),
  twitterQueue: () => api.get('/areas/content/twitter-queue').then(r => r.data),
}
