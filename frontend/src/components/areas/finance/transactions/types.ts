export type Txn = {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  category: string
  description: string | null
  logged_at: string
  account_id?: string | null
  category_id?: string | null
  tags?: string | null
  split_group_id?: string | null
}

export type Kind = 'Expense' | 'Income' | 'Transfer'
export type SortBy = 'date' | 'amount'
export type SortDir = 'desc' | 'asc'

export const keyOf = (t: Txn) => `${t.type}:${t.id}`
