# Aggregated Audit Findings & Actions

This document synthesizes findings from all three Explorer agents (Root Docs, Package Docs, and Snippet & Link Verifier) for the Documentation Audit, Cleaning, and Standardization project.

---

## 1. Files to Delete / Remove from Version Control
### **graphify-out/** (entire directory)
- **Status**: Delete directory completely.
- **Reason**: Stale, auto-generated files from 2026-06-09. Contains broken community wiki-links and Python docstring noise.
- **Action**: Delete the `graphify-out` directory and add `graphify-out/` to the root `.gitignore`.

---

## 2. Files to Keep and Update

### **.gitignore** (Root)
- **Action**: Add `graphify-out/` to the end of the file.

### **CLAUDE.md** (Root)
- **Action 1 (LLM Stack)**: Change the AI/LLMs bullet to: `Anthropic Claude SDK, OpenAI SDK, NVIDIA NIM (default llm_provider)`.
- **Action 2 (WebSocket Entry Point)**: Change `Frontend: /frontend/src/api/websocket.ts or similar` to `Frontend: Inline WebSocket instantiations in frontend/src/hooks/useChat.ts, useNotifications.ts, and useVaultSync.ts`.
- **Action 3 (Frontend Stack & Styling)**:
  - Change `React 18 + TypeScript + Vite + Tailwind CSS + Radix UI + Ant Design` to `React 18 + TypeScript + Vite + styled-components + Radix UI (via @ledgr/ui) + Ant Design`.
  - Change `Styling: Tailwind classes + Styled Components; prefer semantic tokens (bg-card, text-muted-foreground)` to `Styling: styled-components and Ant Design; prefer @ledgr/ui theme values/tokens`.
- **Action 4 (Code Paths)**:
  - Prefix root-relative paths like `/src/components`, `/src/api` with `frontend/` (e.g. `frontend/src/components`).
  - Prefix `/app/api/` and `/app/services/` with `backend/` (e.g. `backend/app/api/`).
  - Update router path naming description: `/app/api/<domain>.py` -> `backend/app/api/areas/<domain>.py`.
  - Update service layer description: `/app/services/<domain>/` -> `backend/app/services/` and add note that only `finance`, `insights`, and `notifications` have dedicated service sub-folders (others query database models directly in routers).
- **Action 5 (Root Tree)**:
  - Add missing root items in the directory tree: `PROJECT.md`, `ledgr-ui`, `run.sh`.
  - Add syntax highlighting tag (`text` or `directory`) to the directory tree code block.

### **MEMORY.md** (Root)
- **Action 1 (Numbering Skip)**: Renumber the first few sections to fix the numbering jump (it jumps from 1 to 6).
- **Action 2 (Page Title Contradiction)**: Update Rule 1 ("No Page-Level Headers/Titles") to resolve the contradiction with Rule 16.1. Clarify that page-level headers/titles should be rendered via the standard `@ledgr/ui` `<PageHeader>` component (which is what pages actually implement) rather than hardcoded within individual content cards.
- **Action 3 (Health Models)**: In the Health Area models list, replace `HealthStreak` (non-existent) with `HealthGoal, Habit, HabitCheck, WorkoutSession`.
- **Action 4 (Package Manager)**: Change the dependencies reference from `uv / poetry` to `uv`.

### **PROJECT.md** (Root)
- **Action 1 (Theme description)**: Correct the theme description from "Deep Cobalt" to "Warm Stone & Gold Accent".
- **Action 2 (Code Layout)**: Add `frontend/src/components/PageTransition.tsx` to the `Code Layout` paths.

### **PROJECT_STRUCTURE.md** (Root)
- **Action 1 (Backend description)**: Change `backend/                  # Backend API service (assumed Node/Python)` to `backend/                  # Python 3.11+ FastAPI and SQLModel Backend`.
- **Action 2 (Detailed Backend structure)**: Add the backend structure detail:
  ```
  ├── backend/
  │   ├── alembic/            # Database migrations
  │   ├── app/
  │   │   ├── api/            # API endpoints (auth, chat, and areas/)
  │   │   ├── core/           # Config and security
  │   │   ├── db/             # DB session management
  │   │   ├── models/         # SQLModel database models
  │   │   └── services/       # Services (finance, insights, notifications)
  ```
- **Action 3 (Frontend structure)**:
  - Add `theme/` directory under frontend `src/`.
  - Remove the non-existent `tailwind.config.ts` and `postcss.config.js` files from the tree.
  - Update description of `src/index.css` to: `index.css                 # Minimal CSS reset for pre-rendering` (and update its explanation in "Key Files Explained" to reflect that it is a basic pre-render reset and styling is handled via themes).
- **Action 4 (Root files)**: Add `PROJECT.md`, `ledgr-ui`, and `run.sh` to the root structure tree.
- **Action 5 (Formatting)**: Add syntax highlighting tags (e.g. `text` or `directory`) to all file tree code blocks.

### **ledgr-ui/README.md**
- **Action 1 (Spelling)**: Standardize spelling to US English (`color` instead of `colour`).
- **Action 2 (Primitives table)**: Remove the non-existent `Inline` component from the Primitives list. Add `Spinner` to Primitives.
- **Action 3 (Patterns & Layout)**:
  - Add `AreaToolbar`, `Skeleton`, and `KpiCard` to Patterns.
  - Rename Layout component `Header` to `AppHeader`.
- **Action 4 (Aria-label claim)**: Change the typescript enforcement claim to state that `aria-label` is highly recommended for accessibility on icon-only buttons (rather than claiming it is strictly enforced by TypeScript).
