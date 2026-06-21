# AIOS Web: Premium SaaS Implementation Plan (Updated)

Based on your feedback, we have parked the chat bots and email parsing features. Our new roadmap focuses heavily on Engagement (Briefings/Heatmaps), Cross-Domain Synergies, and Household Multiplayer mode.

---

## Phase 1: Engagement & Retention (Immediate Focus)
**Goal:** Hook the user immediately by providing proactive value and gamifying their daily life management.

### 1. Daily Executive Briefing (Approved ✅)
*   **Concept:** A personalized push notification or email summarizing yesterday's activity and today's outlook.
*   **Database Schema:** `BriefingPreference` storing `user_id`, `delivery_time`, `delivery_channel`, and `topics`.
*   **Backend Structure:** Use `AsyncIOScheduler` configured in FastAPI's lifespan. A periodic cron job scans for users due for delivery, aggregates their 24h data, prompts the LLM to generate a summary, and pushes it via SendGrid.
*   **Frontend Components:** `BriefingSettings` form to select preferences.

### 2. GitHub-style Life Heatmap (Approved ✅)
*   **Concept:** Visual representation of daily logging/activity consistency to encourage streaks.
*   **Database Schema:** Materialized view or `ActivityLog` table tracking `user_id`, `activity_date`, `activity_count`, and `activity_type`.
*   **Backend Structure:** `GET /analytics/heatmap?year=2026` returning a JSON array of daily activity intensities.
*   **Frontend Components:** `ActivityHeatmap` using `@ledgr/ui` styling, and a `StreaksWidget`.

---

## Phase 2: Frictionless Financial Sync 
**Goal:** Eliminate the #1 reason users churn from finance apps: manual data entry fatigue.

### 1. Plaid Bank Sync
*   **Clarification of the Use Case:** 
    Currently, you have to manually enter a transaction every time you buy a coffee or pay a bill. This gets exhausting. By integrating Plaid, the app securely connects to the user's bank (e.g., Chase, Wells Fargo) in **read-only** mode. 
    Whenever the user swipes their credit card in real life, the transaction automatically flows into AIOS Web in the background. The AI then categorizes it automatically (e.g., "Starbucks" -> "Dining/Coffee"). 
    *Result:* The user gets perfect financial tracking and budgeting without ever typing a single number.
*   **Technical Implementation:**
    *   Add `react-plaid-link` to frontend.
    *   Create `/integrations/plaid` webhook endpoints to listen for new bank transactions and ingest them into `TransactionRecord`.

---

## Phase 3: Premium Value Expansion (Cross-Domain Synergies)
**Goal:** Deliver undeniable "magic" moments that justify premium subscription tiers by correlating data that no other single app possesses.

*   **In-Depth Architecture:**
    We will build a new backend service: **The Synergy Engine**. This will run as a nightly batch job via `APScheduler`.
    
*   **Data Pipeline:**
    1.  **Extract:** The engine pulls the last 30 days of data across `finance_transactions`, `health_logs` (sleep, gym, weight), and `business_tasks`.
    2.  **Analyze (Math):** It uses statistical algorithms (e.g., calculating standard deviations and Pearson correlation coefficients) to find linked behaviors.
    3.  **Synthesize (LLM):** If a strong correlation is found (e.g., r > 0.7), the raw data is passed to Claude/GPT-4 to generate a human-readable, empathetic insight.

*   **Examples of Synergies we will track:**
    *   **Sleep x Productivity:** Correlating hours slept (from Google Fit) vs. Business Tasks completed. *(Insight: "You accomplish 40% fewer tasks on days following <6 hours of sleep.")*
    *   **Diet x Spending:** Correlating fast-food/restaurant expenses vs. weight/body fat logs. *(Insight: "Spending more than $150/week on dining out correlates with a 1kg weight gain for you.")*
    *   **Career Stress x Content:** Correlating high-meeting weeks (Google Calendar) with the type of content saved.

*   **Database Schema:**
    *   Create an `Insights` table: `id`, `user_id`, `domain_source_1`, `domain_source_2`, `correlation_score`, `ai_generated_message`, `created_at`, `is_read`.

*   **Frontend:**
    *   A dedicated **"AI Discoveries"** feed on the Dashboard that alerts users when the system finds a new hidden pattern in their life.

---

## Phase 4: Viral Growth & Network Effects (Multiplayer/Household)
**Goal:** Expand organic growth and drastically reduce churn by locking in entire households (couples/families). 

*   **In-Depth Architecture:**
    To support this securely without mixing private data (like individual weight or private career notes), we must introduce a robust Multi-Tenancy model using a `Household` entity.

*   **1. Database Schema & Access Control (SQLModel):**
    *   `Household` table: `id`, `name`, `created_by`.
    *   `HouseholdMember` link table: `user_id`, `household_id`, `role` (Admin, Member).
    *   Modify target tables (e.g., `TransactionRecord`, `Budget`, `Task`) to include an optional `household_id` FK alongside the existing `user_id` FK.

*   **2. Backend Logic (FastAPI Row-Level Filtering):**
    *   Update the core API dependencies. When fetching financial data, instead of querying `WHERE user_id = X`, the query becomes:
        `WHERE user_id = X OR household_id IN (SELECT household_id FROM HouseholdMember WHERE user_id = X)`.
    *   **Strict Privacy boundaries:** Health tables (`health_logs`) and private domains (`career_notes`) will **NOT** have a `household_id` column, ensuring they remain 100% private to the individual.

*   **3. The Invitation Flow:**
    *   `POST /api/households/invite`: Sends an email to a partner containing a secure JWT link.
    *   When the partner clicks the link, they create an account and are automatically joined to the `HouseholdMember` table.

*   **4. Frontend Experience:**
    *   **Context Switcher:** A dropdown in the TopBar allowing the user to toggle their view between "Personal" and "Household".
    *   **Joint Dashboard:** When in Household mode, the Dashboard aggregates both users' shared finances and shared tasks into single unified charts.
