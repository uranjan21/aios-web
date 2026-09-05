> **Accuracy note (2026-07-21).** This file previously advertised several
> things that did not exist in any form: a "Premium Animated Loader" with
> four named visual styles (the loader is a plain `<Spinner>`), and
> "business-specific dashboards with tailored metrics" (those five files
> contained hardcoded EmptyState and no API calls). It also referenced
> `SAAS_IMPLEMENTATION_PLAN.md`, which does not exist. Those claims are
> removed. The Business and Content areas were deleted on 2026-07-21.

# Control Tower Web Features

This document provides a categorized list of all features currently implemented in the Control Tower Web platform, as well as planned capabilities.

**Note:** This file is automatically maintained. Whenever a new feature is added to the application, this document must be updated to reflect the change.

## 1. Finance Area 💰
*   **Transactions Management:** Log and manage income, expenses, and transfers.
*   **Intelligent Categorization:** Hierarchical income and expense tree structure.
*   **Multi-Account Tracking:** Track balances and transactions across multiple user-defined accounts.
*   **Analytics & Reporting:** Dedicated sections for tracking Budgets, Goals, Loans, Investments, and Bills.
*   **Real-time Balances:** Live balance recalculation with row-level locking to prevent race conditions.
*   **Email Ingestion (Finance OS):** Deterministic parsers read bank/credit-card alert emails from Gmail (HDFC/Axis/ICICI/SBI/CRED, read-only) and queue transactions idempotently into the review Inbox; a manual "Sync emails" trigger plus a 6-hourly poller.
*   **Auto-categorisation Rules:** Merchant rules (contains/equals/regex) that set category + account on ingested transactions automatically.
*   **Month-end Payables Checklist:** Unified view of rent, subscriptions, EMIs, and credit-card bills — how much, to whom, from which account — with per-month paid/unpaid tracking.
*   **Investment Commitment:** Track committed monthly SIP vs actually invested, alongside planned-vs-actual spend via budgets.
*   **Vault Summary & Backup:** Owner-only monthly finance summary written to the Obsidian vault, plus monthly CSV backup of all finance tables.

## 2. Health & Wellness 🏃‍♂️
*   **Fitness & Workouts:** Log workouts, exercises, and fitness goals.
*   **Nutrition Tracking:** Track daily meals and food intake.
*   **Body Metrics:** Log weight, body fat percentage, and steps.
*   **Sleep Tracking:** Monitor daily sleep duration.
*   **Habit Tracker:** Daily checklist for recurring healthy habits.
*   **Third-party Integrations:** Support for Google Fit metrics syncing.

## 3. Business Portfolio Hub 🏢
*   **Multi-Tenant Businesses:** Support for tracking multiple independent businesses (SaaS, Agency, E-commerce, Content, Freelance) in one portfolio hub.
*   **Event Logging:** Track product ships, marketing launches, and major business events.
*   **MRR Tracking:** Independent MRR history and revenue tracking per business.

## 4. Content Management System (CMS) 📝
*   **Overview Dashboard:** KPI cards, platform-mix pie charts, and publishing-cadence tracking.
*   **Pipeline Kanban:** Drag-and-drop workflow across Idea -> In Progress -> Scheduled -> Published.
*   **Content Calendar:** Monthly calendar view for scheduling posts.
*   **Content Library:** Searchable and filterable data table for all content pieces.
*   **Campaign Management:** Group content into broader campaigns and track collective performance.
*   **AI Editor Drawer:** Write content with AI-assisted drafting, set publish dates, attach to campaigns, and track manual engagement metrics (views, likes, comments, shares).

## 5. Career Area 💼
*   **Career Journal:** Log milestones, daily notes, and reflections.
*   **Job Opportunities:** Pipeline tracking for roles, applications, and job prospects.

## 6. Core AI & OS Capabilities 🧠
*   **Global Capture (⌘L) & Contextual Task Creation (R7):** Intercepts ⌘L on projects or sprints detail pages to open a Contextual Task Creation dialog pre-populating project/sprint fields; falls back to NLP-powered Global Capture note logging elsewhere.
*   **AI Vault Extractor & Global Inbox:** Automatically monitors the Obsidian Vault for new markdown file modifications, parses the text asynchronously using LLMs to extract intents (finance, health, business events), and queues them into a Global Inbox (e.g. pending transactions or actions) for user review or 24-hour auto-commit.
*   **Active Database + Vault Write Tools:** Proactive write capabilities (`create_action`, `update_goal`, `log_transaction`, `log_health_metric`) allowing chat and background agents to record structured data in Postgres, mirror the change into the relevant vault log file, and sync that file straight back into the vault store for RAG/search freshness.
*   **Interactive Saved Quotes (R6):** Save quotes, mark favorites, delete, and view random quotes via dedicated REST endpoints.
*   **Global Chat Assistant:** Overhauled interactive chat interface featuring custom transitions, keyboard accessibility (Escape key closing), responsive mobile width, tooltips, and strict WCAG 4.5:1 text contrast compliance. Supports file attachments (images/text), on-the-fly model switching, and chat session history.
*   **Per-User LLM Configuration (BYOK):** Override system default LLMs (OpenAI vs Anthropic) per-user and supply personal API keys to bypass token metering limits via the AI Configuration settings.
*   **Background Agents:** Scheduled tasks (anomaly scan, weekly digest, recurring financial tasks) with domain-scoped facts isolation, explicit task-to-domain mapping, graceful fallback modes with standardized warning prefixes, and structured writeback execution for selected agents via parsed action blocks. Features a URL-addressable advanced filtering UI for managing run-states, errors, and schedules, plus a real seed endpoint and clearer last-output inspection on the Agents page.
*   **Local Vault Sync:** Secure, local markdown file synchronization.

## 7. SaaS & Infrastructure ⚙️
*   **Multi-Tenancy:** Row-level isolation across all tables ensuring absolute privacy.
*   **Free, bring-your-own-API-key:** No billing, subscriptions or usage caps. Each user supplies their own OpenAI/Anthropic key (encrypted at rest) and their provider bills them directly.
*   **Authentication:** JWT-based strict authentication with Google OAuth integration support. "Remember me" extends the session to 30 days; a deep link hit while signed out returns the user to it after sign-in.
*   **In-App Guide (`/app/guide`):** The product manual — getting started, what each area and workspace entity is for, the agent roster and its schedules, keyboard shortcuts, where each setting lives, and troubleshooting. Every row that names a destination navigates to it, so reading it and using the app are the same act.
*   **Theme Engine:** "Premium Black + Gold" design system utilizing @ledgr/ui.


## 8. Workspace & Task Management 🗂️
*   **Cross-Domain Projects:** Group and track initiatives across Finance, Health, Career, and Business, complete with unified edit capabilities.
*   **Sprint Planning:** Organize work into time-bound sprints with easy modification and management.
*   **Task Tracking:** Manage daily to-dos with cross-domain tagging and prioritization.

---

## Upcoming / Planned Features 🚀


1.  **Engagement & Retention:** Daily Executive Briefings via email/push and a GitHub-style Activity Heatmap.
2.  **Frictionless Financial Sync:** Plaid integration for auto-categorized bank transactions.
3.  **Cross-Domain Synergies:** An AI engine that correlates data across domains (e.g., Sleep vs. Productivity, Diet vs. Spending) to generate actionable insights.
4.  **Multiplayer / Household Mode:** Secure sharing of finances and tasks across family members while keeping individual health/career data private.
5.  **Predictive Life Forecasting:** AI models that forecast future outcomes based on current trajectories (e.g., predicted burnout, financial runway).
6.  **Agentic Automation (Actionable AI):** AI that not only suggests insights but takes actions on your behalf (e.g., auto-blocking calendar time for stress relief, drafting outreach emails).
7.  **Voice-First Quick Capture:** Push-to-talk voice memos for completely hands-free logging, transcribed and routed by NLP.
8.  **Macro Goal Synthesis:** Visual mapping of daily micro-habits against annual macro-goals.
