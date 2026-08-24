import type { LucideIcon } from 'lucide-react'
import {
  TrendingUp, Activity, Briefcase,
  MessageSquare, Bot, Plug,
} from 'lucide-react'

/**
 * Single source of truth for pricing. The LandingPage and the PricingPage both
 * read from here so the two surfaces cannot drift apart.
 *
 * ── TWO TIERS, NOT SIX (2026-08-23) ──────────────────────────────────────────
 * This used to present six independently purchasable $5 modules. The arithmetic
 * never supported that story: `computeMonthly` capped the a-la-carte total at
 * the bundle price, so the 5th module cost $2, the 6th was free, and nobody
 * could rationally buy five. It was a two-tier product wearing a six-option
 * configurator, and the configurator's main effect was to make a visitor do
 * combinatorics before they understood what the product did.
 *
 * So the PRICE is now Free or Everything. Module granularity survives
 * underneath as the ENTITLEMENT mechanism — `Subscription.modules`,
 * `require_module`, and the free tier's single chosen area all still work
 * exactly as before, and `billingApi.setModules` is still how a plan is set.
 * What changed is only what we ask a visitor to decide.
 */

/**
 * USD/month for a single module, retained because the free tier grants exactly
 * one and the entitlement model is still per-module. NOT shown as a price a
 * visitor can pick — see the note above.
 */
export const MODULE_PRICE = 5

/**
 * USD/month for Everything — now the only paid price.
 *
 * Signed off 2026-08-23 along with the collapse to two tiers. Billing is still
 * disabled, so nothing has ever charged against this value.
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

/** Free base: Dashboard + one area of the user's choice, forever. */
export const FREE_BASE_BLURB = 'Dashboard + any 1 area of your choice'

/** Every module key — what the paid tier grants. */
export const ALL_MODULE_KEYS = PRICING_MODULES.map(m => m.key)

/** Modules that add metered AI on top of the flat price. */
export const METERED_MODULES = PRICING_MODULES.filter(m => m.metered)
