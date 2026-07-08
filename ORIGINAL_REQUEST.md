# Original User Request

## Initial Request — 2026-07-06T21:39:33Z

Audit, fix, and enhance the AIOS Web platform's UI/UX, frontend, backend, and data consistency across 8 specific features including workspace domain syncing, layouts, quotes functionality, and dashboard grid.

Working directory: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web
Integrity mode: development

## Requirements

### R1. Domain Syncing for Workspace Entities
- Update the create/edit forms for Projects, Sprints, and Tasks so that if a specific domain (e.g., 'finance') is selected, the "Linked Goal" dropdown is filtered to only show goals belonging to that domain.
- Add tabs and table views to Projects, Sprints, and Tasks pages to match the Goals page structure.

### R2. PageHeader Description Alignment
- Modify the global `@ledgr/ui` `PageHeader` component so the subtitle/description appears directly below the main title rather than floating parallel/inline with it.

### R3. Content Page UI Consistency
- Audit the Content page tabs (Campaigns, etc.) and update them to ensure they use the standard `PageContainer`, `PageContent`, `AreaTabs`, and global padding/margins like other domain pages.

### R4. Collapsible Workspace Sections
- In Projects, Sprints, and Tasks pages, ensure that grouped sections (e.g., by domain or sprint) are collapsible (expand/collapse functionality).

### R5. Dashboard Layout Optimization
- On the Dashboard Page desktop view, move the Life Heatmap to the left column (Main) and ensure the Calendar has enough space in the right rail to prevent squeezing.

### R6. Interactive Saved Quotes Feature
- Implement a backend table for `saved_quotes`.
- Update the Dashboard quote component to include a "Refresh" icon (fetches a new quote) and a "Heart/Save" icon (saves to DB).
- For now, quotes just need to be saved to the database (a viewer UI is not required yet).

### R7. Contextual Quick Capture Button
- Update the Quick Capture (⌘L) or FAB button to default to "Add Task" for the current project/sprint if viewing one, otherwise fallback to the Global Capture (⌘L) modal.

## Acceptance Criteria

### Verification
- [ ] End-to-end programmatic tests pass (`pytest` in backend, `tsc` and `build` in frontend).
- [ ] Manual verification via UI walkthrough: The PageHeader subtitle is stacked vertically below the title across the app.
- [ ] Manual verification: Adding a Project in 'Finance' only shows Finance goals.
- [ ] Manual verification: Quotes can be saved to the database and persist after page reload.
- [ ] Manual verification: Dashboard desktop layout does not squeeze the calendar.

## Follow-up — 2026-07-07T00:46:03+05:30

Conduct a comprehensive UI/UX, design, and frontend audit of the aios-web application. You will directly implement fixes as you discover them across all pages, tabs, components, logic, and state management.

Working directory: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web
Integrity mode: development

## Requirements

### R1. UI/UX Audit and Design Generation
Use the `ui-ux-pro-max` search script to generate professional design recommendations and a cohesive design system for the app (e.g. SaaS, dashboard). Apply these guidelines during your audit.

### R2. Direct Implementation of Fixes
Directly implement design improvements, layout fixes, and accessibility enhancements across the frontend codebase as they are identified.

### R3. Component Logic & State Refactoring
Analyze React components for poor state management or structural issues and refactor them to improve performance, maintainability, and data flow.

### R4. Strict Styling Adherence
Strictly use `styled-components` and the `@ledgr/ui` theme tokens for all styling. Ensure absolutely no Tailwind CSS utility classes are used or introduced.

## Acceptance Criteria

### Execution & Implementation
- [ ] The `ui-ux-pro-max` script is executed with appropriate keywords to generate a comprehensive design system.
- [ ] Tailwind CSS is completely absent from all implemented or refactored styling.
- [ ] All new or modified styling strictly uses `styled-components` and `@ledgr/ui` tokens.
- [ ] The web app successfully compiles and builds (e.g., `npm run build` or `npm run type-check`) without type or syntax errors after all fixes are applied.
- [ ] Significant logic or state management refactors are documented in an audit report artifact alongside the code changes.

## Follow-up — 2026-07-07T03:19:06Z

# Teamwork Project Prompt — Draft

Conduct a comprehensive UI/UX refactor to enforce the new `AreaToolbar` button placement rules. Audit all tabs and pages, and reposition any single buttons according to the new design logic.

Working directory: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web
Integrity mode: development

## Requirements

### R1. AreaToolbar Pruning
Analyze every instance of `AreaToolbar` in the frontend codebase. If an `AreaToolbar` contains only a single element (e.g., a single "Add X" button), remove the `AreaToolbar` entirely and reposition the element.

### R2. Single Card Placement
If the tab contains only a single `Card` component for its main content, place the isolated button inside the right side of the `Card`'s header (parallel to the card's title).

### R3. Global PageHeader Placement
If the tab does not use a single `Card` (e.g., complex grid, lists, or multiple cards), use the `<HeaderActionPortal>` component to teleport the isolated button up to the global `PageHeader`'s action slot (parallel to the page title, aligned right).

### R4. Preserve Multi-Element Toolbars
If an `AreaToolbar` contains multiple elements (e.g., a view switcher and a button, or filters), leave the `AreaToolbar` as is.

## Acceptance Criteria

### Execution & Implementation
- [ ] No `AreaToolbar` component in the codebase contains only a single interactive element.
- [ ] Isolated buttons on single-card tabs are properly rendered in the right side of the card header.
- [ ] Isolated buttons on complex tabs successfully appear in the global `PageHeader` using `HeaderActionPortal`.
- [ ] The frontend compiles and builds successfully (e.g., `npm run build` or `npm run type-check`) with no errors.
- [ ] All 82 E2E tests still pass, ensuring no functional button flows were broken.

## Follow-up — 2026-07-08T08:25:00Z

Refactor the backend agent context generation so that agents only receive and output domain-specific facts rather than the global weekly summary.

Working directory: ~/teamwork_projects/agent_context_refactor
Integrity mode: development

### Requirements

#### R1. Domain-Specific Fact Functions
Break down the monolithic `_week_facts()` function in `backend/app/services/insights/digest.py` into separate, domain-specific functions (e.g., `_finance_facts()`, `_health_facts()`, `_content_facts()`, etc.).

#### R2. Scoped Agent Context
Update `_build_context` in `backend/app/services/agents/runners.py` so that each agent only calls the specific fact function(s) relevant to its domain, instead of aggregating everything.

#### R3. Standardized Fallback Message
When an agent skips LLM execution (e.g., due to AI quota limits in `run_agent_task`), prepend the fallback text with a standardized warning message indicating that the LLM was skipped. For example: `"⚠️ AI Quota Exceeded. Raw Data: ..."` followed by only that agent's domain-specific data.

### Acceptance Criteria

#### Context Segregation
- [ ] Running `aios-upi-tracker` with the LLM disabled returns only the warning prefix and finance-related fallback text, not health or content data.
- [ ] Running `aios-health-coach` with the LLM disabled returns only the warning prefix and health-related fallback text.

## Follow-up — 2026-07-08T09:28:08Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Migrate the AI OS backend from using NVIDIA NIM APIs to standard OpenAI APIs across all agents, insights, chat, and capture services.

Working directory: ~/teamwork_projects/openai_migration
Integrity mode: development

## Requirements

### R1. Configuration Updates
Update `backend/app/core/config.py` to support OpenAI. Replace `nvidia_api_key`, `nvidia_base_url`, and `nvidia_chat_model` with `openai_api_key` and `openai_chat_model` (defaulting to `gpt-4o`). Update the `llm_provider` to default to `openai`.

### R2. Client & Service Migration
- Rename `backend/app/services/ai/nvidia_client.py` to `openai_client.py` (or similar) and update the `AsyncOpenAI` instantiation to use the new OpenAI configs.
- Update `backend/app/services/ai/insights.py` and `backend/app/api/captures.py` to use the new OpenAI client and configuration instead of NVIDIA.

### R3. Chat Agent Migration
- Rename `backend/app/services/chat/nvidia_agent.py` to `openai_agent.py` and refactor `stream_nvidia_chat_response` to `stream_openai_chat_response`, using the standard OpenAI chat completions endpoint and configuration.
- Update `backend/app/services/chat/agent.py` to route to the new OpenAI streaming function.

### R4. Test Suite Alignment
Ensure any mock configurations or environment overrides in `backend/tests/conftest.py` are updated to reflect the new OpenAI variables (e.g., `OPENAI_API_KEY`) instead of NVIDIA.

## Acceptance Criteria

### Verification
- [ ] Codebase search for `nvidia` yields zero results in active Python application code (excluding `.env` examples).
- [ ] Running a backend unit test (e.g., `pytest backend/tests`) passes successfully with the new configuration mocking.
- [ ] A simulated call to `generate_text` in `insights.py` attempts to use `openai_api_key` and the configured `gpt-4o` model.

## Follow-up — 2026-07-08T16:21:56+05:30

Empower the AI OS agents with active "Write" capabilities. Agents should be able to actively log data into the PostgreSQL database, update Obsidian Vault files, and trigger UI updates, rather than just generating read-only markdown reports.

Working directory: ~/teamwork_projects/agent_write_tools
Integrity mode: development

### Requirements

#### R1. Database Write Tools
Extend `backend/app/services/chat/tools.py` to include tools for writing to the database. At a minimum, implement:
1. `create_action`: To create tasks/actions in the `Action` table.
2. `update_goal`: To update progress on goals in the `Goal` table.
3. `log_transaction`: To log a finance expense/income in the `FinanceTransaction` table.
4. `log_health_metric`: To log a workout or health metric.

#### R2. Vault Write Tools Enhancement
The tools `append_log` and `update_context` currently exist in `tools.py`. Ensure these tools are fully exposed, robustly handle missing files by creating them if necessary, and correctly map to the user's Obsidian Vault path.

#### R3. Agent System Prompt Updates
Update the agent system prompts (in `backend/app/api/agents.py` or the DB seed files) to explicitly instruct the agents to *use* these tools when they detect actionable information. For example, the `aios-health-coach` should use `log_health_metric` and `append_log` instead of just summarizing.

#### R4. UI Reflection
Ensure that the database writes performed by the tools correctly use the `AsyncSession` and commit the data so that the Frontend UI instantly reflects these changes upon the next fetch (or trigger a websocket refresh event if a notification system exists).

### Acceptance Criteria

#### Verification
- [ ] `tools.py` contains the new database write tools with proper JSON schema definitions.
- [ ] The `execute_tool` router handles the new database writes and successfully commits to the DB.
- [ ] Agent system prompts explicitly mention the ability to write to the DB and Vault.
- [ ] A simulated test confirms that an agent calling `create_action` successfully inserts a row into the database.
