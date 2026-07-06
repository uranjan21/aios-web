# AIOS Web Features

This document provides a categorized list of all features currently implemented in the AIOS Web platform, as well as planned capabilities.

**Note:** This file is automatically maintained. Whenever a new feature is added to the application, this document must be updated to reflect the change.

## 1. Finance Area 💰
*   **Transactions Management:** Log and manage income, expenses, and transfers.
*   **Intelligent Categorization:** Hierarchical income and expense tree structure.
*   **Multi-Account Tracking:** Track balances and transactions across multiple user-defined accounts.
*   **Analytics & Reporting:** Dedicated sections for tracking Budgets, Goals, Loans, Investments, and Bills.
*   **Real-time Balances:** Live balance recalculation with row-level locking to prevent race conditions.

## 2. Health & Wellness 🏃‍♂️
*   **Fitness & Workouts:** Log workouts, exercises, and fitness goals.
*   **Nutrition Tracking:** Track daily meals and food intake.
*   **Body Metrics:** Log weight, body fat percentage, and steps.
*   **Sleep Tracking:** Monitor daily sleep duration.
*   **Habit Tracker:** Daily checklist for recurring healthy habits.
*   **Third-party Integrations:** Support for Google Fit metrics syncing.

## 3. Business Portfolio Hub 🏢
*   **Multi-Tenant Businesses:** Support for tracking multiple independent businesses (SaaS, Agency, E-commerce, Content, Freelance) in one portfolio hub.
*   **Business-Specific Dashboards:** Tailored tabs and metrics depending on the business type (e.g., SaasTabs, EcommerceTabs).
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
*   **Global Capture (⌘L):** A universal command modal that uses NLP to parse quick-log inputs and route them to the correct domain (e.g., "Spent $5 on coffee").
*   **Multi-LLM Chat Assistant:** Interactive chat powered by Anthropic Claude, OpenAI, or NVIDIA NIM, capable of querying personal data.
*   **Background Agents:** Scheduled tasks (anomaly scan, weekly digest, recurring financial tasks).
*   **Local Vault Sync:** Secure, local markdown file synchronization.

## 7. SaaS & Infrastructure ⚙️
*   **Multi-Tenancy:** Row-level isolation across all tables ensuring absolute privacy.
*   **Modular Pricing / Billing:** Pay-per-module Stripe integration with a free base tier and metered AI usage caps.
*   **Authentication:** JWT-based strict authentication with Google OAuth integration support.
*   **Theme Engine:** "Premium Black + Gold" design system utilizing @ledgr/ui.

## 8. Workspace & Task Management 🗂️
*   **Cross-Domain Projects:** Group and track initiatives across Finance, Health, Career, and Business.
*   **Sprint Planning:** Organize work into time-bound sprints.
*   **Task Tracking:** Manage daily to-dos with cross-domain tagging and prioritization.

---

## Upcoming / Planned Features 🚀
*(Refer to `SAAS_IMPLEMENTATION_PLAN.md` for full details)*

1.  **Engagement & Retention:** Daily Executive Briefings via email/push and a GitHub-style Activity Heatmap.
2.  **Frictionless Financial Sync:** Plaid integration for auto-categorized bank transactions.
3.  **Cross-Domain Synergies:** An AI engine that correlates data across domains (e.g., Sleep vs. Productivity, Diet vs. Spending) to generate actionable insights.
4.  **Multiplayer / Household Mode:** Secure sharing of finances and tasks across family members while keeping individual health/career data private.
5.  **Predictive Life Forecasting:** AI models that forecast future outcomes based on current trajectories (e.g., predicted burnout, financial runway).
6.  **Agentic Automation (Actionable AI):** AI that not only suggests insights but takes actions on your behalf (e.g., auto-blocking calendar time for stress relief, drafting outreach emails).
7.  **Voice-First Quick Capture:** Push-to-talk voice memos for completely hands-free logging, transcribed and routed by NLP.
8.  **Macro Goal Synthesis:** Visual mapping of daily micro-habits against annual macro-goals (Vision Board integration).
