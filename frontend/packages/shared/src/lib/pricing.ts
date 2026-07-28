import type { LucideIcon } from 'lucide-react'
import {
  TrendingUp, Activity, Briefcase,
  MessageSquare, Bot, Plug,
} from 'lucide-react'

/**
 * Single source of truth for the modular pricing model.
 * Both the LandingPage preview and the PricingPage configurator read from here,
 * so the two surfaces can never drift apart.
 *
 * Model: pay only for the modules you enable. Flat USD/mo per module, with a
 * discounted "Everything" bundle that grants all of them. AI Chat + Agents add
 * metered AI usage on top of their flat module price (free monthly cap, then
 * billed per use).
 */

export const MODULE_PRICE = 5 // USD / month, per enabled module

/**
 * USD / month for the "Everything" bundle.
 *
 * NEEDS PRODUCT SIGN-OFF. Retiring the Business and Content modules on
 * 2026-07-21 took the catalog from 8 modules to 6, so à-la-carte fell from $40
 * to $30 and the old $29 bundle would have saved a customer exactly $1 —
 * making the bundle pointless. This preserves the original discount ratio
 * (~27% off buying everything individually): 6 x $5 = $30 -> $22.
 * Billing is currently disabled, so nothing charges against this value.
 */
export const BUNDLE_PRICE = 22

export type ModuleGroup = 'area' | 'service'

export interface PricingModule {
  key: string
  label: string
  group: ModuleGroup
  icon: LucideIcon
  desc: string
  /** Adds metered AI usage on top of the flat module price. */
  metered?: boolean
}

export const PRICING_MODULES: PricingModule[] = [
  { key: 'finance', label: 'Finance', group: 'area', icon: TrendingUp, desc: 'Accounts, budgets, transactions, net worth.' },
  { key: 'health', label: 'Health', group: 'area', icon: Activity, desc: 'Fitness, nutrition, sleep & body metrics.' },
  { key: 'career', label: 'Career', group: 'area', icon: Briefcase, desc: 'Opportunity pipeline and skills.' },
  { key: 'chat', label: 'AI Chat', group: 'service', icon: MessageSquare, desc: 'Assistant that knows all your data.', metered: true },
  { key: 'agents', label: 'AI Agents', group: 'service', icon: Bot, desc: 'Autonomous insights & automations.', metered: true },
  { key: 'integrations', label: 'Integrations', group: 'service', icon: Plug, desc: 'Google, banks & external syncs.' },
]

export const TOTAL_MODULES = PRICING_MODULES.length // 6
export const FULL_PRICE = TOTAL_MODULES * MODULE_PRICE // 30 — sum of every module à la carte

/** Discount (USD/mo) of the bundle vs buying every module individually. */
export const BUNDLE_SAVINGS = FULL_PRICE - BUNDLE_PRICE // 8

/** Free base: Dashboard + one area of the user's choice, forever. */
export const FREE_BASE_BLURB = 'Dashboard + any 1 area of your choice'

/**
 * Effective monthly USD total for a set of selected module keys.
 * Once enough modules are picked that à-la-carte would cost more than the
 * bundle, the price is capped at the bundle — so the last few modules are free.
 */
export function computeMonthly(selectedCount: number): number {
  if (selectedCount <= 0) return 0
  return Math.min(selectedCount * MODULE_PRICE, BUNDLE_PRICE)
}

/** True once the selection is priced at (or above) the bundle — i.e. take all. */
export function isBundlePriced(selectedCount: number): boolean {
  return selectedCount > 0 && selectedCount * MODULE_PRICE >= BUNDLE_PRICE
}
