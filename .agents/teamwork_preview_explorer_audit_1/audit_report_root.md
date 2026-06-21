# AIOS Root Markdown Files Audit Report

**Date**: June 21, 2026  
**Auditor**: Explorer 1 - Root Docs Auditor  
**Workspace**: `.agents/teamwork_preview_explorer_audit_1`

---

## 1. Executive Summary

An audit of the four root-level Markdown files (`CLAUDE.md`, `MEMORY.md`, `PROJECT.md`, and `PROJECT_STRUCTURE.md`) was performed to evaluate their utility, accuracy, formatting consistency, and alignment with the actual codebase. 

All four files contain valuable information and should be **kept**, but all require **updates** to resolve outdated information, file path discrepancies, logical contradictions, typos, and gaps.

Key findings include:
- **LLM/Theme Discrepancies**: Documentation lists OpenAI and Anthropic as the sole LLM providers, omitting the configured default NVIDIA NIM (Llama 3.3). Additionally, the theme is described as "Deep Cobalt" in multiple files, but is implemented as a "Warm Stone & Gold Accent" theme.
- **Structural Gaps**: `PROJECT_STRUCTURE.md` is frontend-centric and completely omits details about the backend structure, while characterizing it as "assumed Node/Python" (it is Python/FastAPI).
- **Logical Contradictions**: `MEMORY.md` includes a strict rule forbidding page-level headers/titles (Rule 1) while simultaneously prescribing a page layout structure that includes a top-level page title (Rule 16.1), which is what all pages currently implement.
- **Formatting Issues**: `MEMORY.md` has a numbering jump from Rule 1 to Rule 6 (rules 2-5 are missing).

---

## 2. File-by-File Detailed Audit

### A. CLAUDE.md
* **Status**: Keep with Updates
* **Utility**: High (essential developer guide and shortcut reference for agents)
* **Detailed Findings**:
  1. **Out-of-Date/Incorrect Code Paths**:
     - Line 135: `- **Router Naming**: /app/api/<domain>.py defines routers for a domain (e.g., finance.py, health.py)`.
       * **Reality**: The domain routers are actually located in `/backend/app/api/areas/` (e.g., `/backend/app/api/areas/finance.py`). The core features (auth, chat, etc.) are in `/backend/app/api/`. Also, the path should be prefixed with `backend/` in the repository root context.
     - Line 136: `- **Service Layer**: Domain logic lives in /app/services/<domain>/; routers call services and return JSON`.
       * **Reality**: First, the directory is `backend/app/services`. Second, domain service folders *only* exist for `finance`, `insights`, and `notifications`. Other domains (`health`, `career`, `business`, `content`) do not have service folders and query the database via SQLModel directly inside their routers.
     - Line 23: `Centralized axios-based API client in /src/api`.
       * **Reality**: In the root workspace, this should be `frontend/src/api`. Similar root-relative prefixing issues exist for `/src/components` (Line 25), `/app/services` (Line 32), and `/app/models` (Line 33).
  2. **Out-of-Date LLM Stack**:
     - Line 10: `- **AI/LLMs**: Anthropic Claude SDK, OpenAI SDK`.
       * **Reality**: It omits NVIDIA NIM, which is defined as the default `llm_provider` in `backend/app/core/config.py` and implemented via `openai` pointing to the NVIDIA base URL.
  3. **Missing Root Files**:
     - The directory tree in lines 81-129 does not list `PROJECT.md`, `ledgr-ui/` (the local UI package), or `run.sh` (a root runner script).
  4. **Formatting**:
     - The directory tree code block (lines 81-129) lacks a language tag (e.g., `text` or `directory`).

---

### B. MEMORY.md
* **Status**: Keep with Updates
* **Utility**: High (contains critical UI/UX layout constraints and persistent memory)
* **Detailed Findings**:
  1. **Formatting / Numbering Skips**:
     - Line 5: `1. **No Page-Level Headers/Titles**: ...`
     - Line 6: `6. **Max Grid Layout & Extreme Density**: ...`
     - **Reality**: Rules 2, 3, 4, and 5 are completely missing from the list.
  2. **Logical Contradiction**:
     - Rule 1 (Line 5) states: `Do NOT render titles or subtitles inside page content areas. The page title must ONLY be displayed as a Breadcrumb inside the global Header bar.`
     - Rule 16.1 (Line 17) states: `Strict Page Layout: Every page MUST adhere exactly to this structural hierarchy: 1. Top Level Title + Global Buttons: Page title on the top left, global action buttons on the top right.`
     - **Reality**: In the actual codebase, every page (e.g., `FinancePage.tsx`, `HealthPage.tsx`, `AgentsPage.tsx`) renders the `<PageHeader>` component containing `title` and `subtitle` inside the page body. This is a direct layout contradiction.
  3. **Out-of-Date Data Models**:
     - Line 28: `- **Health Area**: HealthLog, HealthStreak.`
       * **Reality**: There is no `HealthStreak` model in `backend/app/models/health.py`. The actual models are `HealthLog`, `HealthGoal`, `Habit`, `HabitCheck`, `WorkoutSession`, etc.
  4. **Out-of-Date Stack References**:
     - Line 24: `Dependencies managed via uv / poetry.`
       * **Reality**: The backend uses `uv` with a `uv.lock` file. There is no `poetry` configuration or `poetry.lock` in the repository.
  5. **Font Configuration Inconsistency**:
     - Line 11: `Use ONLY premium, clean sans-serif fonts (like Inter). NEVER use font-mono.`
       * **Reality**: `frontend/src/theme/aiosTheme.ts` configures `sans` as `DM Sans` and has a bug where `mono` is configured as `"DM Sans", monospace` (which is a sans font, not mono).

---

### C. PROJECT.md
* **Status**: Keep with Updates
* **Utility**: Medium (milestone tracking)
* **Detailed Findings**:
  1. **Theme Description Mismatch**:
     - Line 6: `- **Global Theme**: Stored in aiosTheme.ts, customized Deep Cobalt palette mapped to Light and Dark modes.`
       * **Reality**: `aiosTheme.ts` uses stone colors (`#1C1917` for card, `#FAFAF9` for background) and a gold accent (`#CA8A04`). The comment in the theme file itself also mentions "Deep Cobalt", but the actual colors are Warm Stone & Gold Accent.
  2. **Code Layout Structure Inaccuracy**:
     - Under `Code Layout` (lines 28-33), the `PageTransition.tsx` component is mentioned in "Interface Contracts" but is omitted from the layout paths list. Its actual path is `frontend/src/components/PageTransition.tsx` (not in `/ui` or `/layout`).

---

### D. PROJECT_STRUCTURE.md
* **Status**: Keep with Updates (or merge into `CLAUDE.md`)
* **Utility**: Medium (onboarding folder description)
* **Detailed Findings**:
  1. **Backend Ignorance / Typos**:
     - Line 9: `├── backend/                # Backend API service (assumed Node/Python)`
       * **Reality**: The backend is definitively Python 3.11+ using FastAPI and SQLModel. There is no Node backend.
  2. **Incomplete Directory Detail**:
     - The file completely omits detailing the structure of the `backend/` directory, which is large and complex.
  3. **Missing Root Files & Directories**:
     - The root file listing (lines 7-17) misses `PROJECT.md`, `ledgr-ui/`, `run.sh`, `.env`, `.npmrc`, `.agents/`, and `.agent/`.
  4. **Missing Frontend Source Folders**:
     - The `/frontend/src` outline (lines 39-75) omits the `theme` directory, which houses the central `aiosTheme.ts`.
  5. **Formatting**:
     - The tree structures in lines 7-17, 23-33, and 39-75 lack code block syntax highlighting tags.

---

## 3. Summary Recommendations

| File | Recommendation | Actions Required |
|---|---|---|
| **CLAUDE.md** | **Keep & Update** | • Fix backend router path to `/backend/app/api/areas/<domain>.py`.  <br>• Fix service layer path and clarify that only finance, insights, and notifications use a service layer.  <br>• Prefixe frontend/backend paths appropriately.  <br>• Add NVIDIA NIM to the AI stack.  <br>• Add missing root items (`PROJECT.md`, `ledgr-ui`, `run.sh`). |
| **MEMORY.md** | **Keep & Update** | • Fix numbering skip (rules 2-5).  <br>• Resolve contradiction between Rule 1 and Rule 16.1 regarding page titles.  <br>• Remove references to non-existent `HealthStreak` model and add actual models.  <br>• Remove poetry dependency management reference. |
| **PROJECT.md** | **Keep & Update** | • Correct theme palette description from "Deep Cobalt" to "Warm Stone & Gold Accent".  <br>• Add `frontend/src/components/PageTransition.tsx` to Code Layout section. |
| **PROJECT_STRUCTURE.md** | **Keep & Update** | • Correct backend description from "(assumed Node/Python)" to "FastAPI Python Backend".  <br>• Add detailed layout of the `backend/` folder.  <br>• Add `theme/` directory under frontend `src/`.  <br>• Add missing root files (`PROJECT.md`, `ledgr-ui`, `run.sh`).  <br>• Add syntax highlighting tags to code blocks. |
