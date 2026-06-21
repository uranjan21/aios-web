# Documentation Verification Audit Report

**Date**: 2026-06-21
**Explorer**: Explorer 3 - Snippet & Link Verifier
**Status**: Complete

This report documents the verification of code snippets, relative links, and file structure references across all primary markdown documentation files in the repository.

---

## Executive Summary

A comprehensive scan of all markdown files was completed. 
- **Relative Markdown Links**: No standard `[Label](path)` relative markdown links were found in the scanned files. However, 29 wiki-style links in `graphify-out/GRAPH_REPORT.md` referencing Community sub-pages are **broken**, as the target files do not exist.
- **Code Snippets and Code References**: Several outdated references and naming mismatches were found. Most notably, multiple files claim that the frontend uses **Tailwind CSS**, whereas the actual frontend stack uses **styled-components** and **Ant Design** (Tailwind CSS configuration files and dependencies are entirely absent). Additionally, some key files or component names mentioned in `CLAUDE.md` and `ledgr-ui/README.md` do not match the current codebase.

---

## Detailed Scanned Files Findings

### 1. `CLAUDE.md`
- **Issue 1.1: Inaccurate WebSocket File Reference**
  - **Location**: Line 188 (`## Key Entry Points`)
  - **Verbatim Text**: `WebSockets: Backend: /backend/app/api/sync.py, chat.py, agents.py; Frontend: /frontend/src/api/websocket.ts or similar`
  - **Observation**: `/frontend/src/api/websocket.ts` does not exist. WebSockets are instead instantiated directly inline using the browser-native `WebSocket` class in the following custom hooks:
    - `frontend/src/hooks/useChat.ts` (line 45)
    - `frontend/src/hooks/useNotifications.ts` (line 48)
    - `frontend/src/hooks/useVaultSync.ts` (line 25)
  - **Proposal**: 
    - **Before**: `Frontend: /frontend/src/api/websocket.ts or similar`
    - **After**: `Frontend: Inline WebSocket instantiations in frontend/src/hooks/useChat.ts, useNotifications.ts, and useVaultSync.ts`

- **Issue 1.2: Outdated Tailwind CSS Stack Reference**
  - **Location**: Lines 7 and 146
  - **Verbatim Text**: 
    - Line 7: `Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI + Ant Design`
    - Line 146: `Styling: Tailwind classes + Styled Components; prefer semantic tokens (bg-card, text-muted-foreground)`
  - **Observation**: Tailwind CSS is not part of the frontend project dependencies (`frontend/package.json` contains no tailwindcss package, nor are there any tailwind configs). Styling is handled by `@ledgr/ui` (which is styled-components based), custom `styled-components`, and `antd`.
  - **Proposal**:
    - **Before**: `Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI + Ant Design`
    - **After**: `Frontend: React 18 + TypeScript + Vite + styled-components + Radix UI (via @ledgr/ui) + Ant Design`
    - **Before**: `Styling: Tailwind classes + Styled Components; prefer semantic tokens (bg-card, text-muted-foreground)`
    - **After**: `Styling: styled-components and Ant Design; prefer @ledgr/ui theme values/tokens`

---

### 2. `PROJECT.md`
- **Issue 2.1: Outdated Stack Reference**
  - **Location**: Line 4 (`## Architecture`)
  - **Verbatim Text**: `- **Frontend SPA**: React 18 + TS + Tailwind + Ant Design.`
  - **Observation**: Tailwind CSS is not used in the project.
  - **Proposal**:
    - **Before**: `- **Frontend SPA**: React 18 + TS + Tailwind + Ant Design.`
    - **After**: `- **Frontend SPA**: React 18 + TS + styled-components + Ant Design.`

---

### 3. `PROJECT_STRUCTURE.md`
- **Issue 3.1: Non-existent Tailwind CSS Configuration Files in Tree**
  - **Location**: Lines 27-28 (`## Frontend Directory`)
  - **Verbatim Text**:
    ```
    ├── tailwind.config.ts      # Tailwind CSS configuration for styling and themes
    ├── postcss.config.js       # PostCSS configuration (used by Tailwind)
    ```
  - **Observation**: These files do not exist in the `/frontend` directory.
  - **Proposal**: Remove these lines from the directory map.

- **Issue 3.2: Inaccurate Description of `src/index.css`**
  - **Location**: Line 44 (`## Frontend Directory`) and Line 82 (`## Key Files Explained`)
  - **Verbatim Text**: 
    - Line 44: `│   ├── index.css               # Global CSS, Tailwind imports, and CSS variables`
    - Line 82: `- **`src/index.css`**: Defines CSS variables that power the application's dynamic theme (dark/light modes) and contains custom utility classes.`
  - **Observation**: `frontend/src/index.css` is only 4 lines of basic HTML element resets. There are no Tailwind imports, CSS variables, or custom utility classes in this file. The theme variables and global styles are managed via `@ledgr/ui`'s `GlobalStyles` and the custom theme in `frontend/src/theme/aiosTheme.ts`.
  - **Proposal**:
    - **Before**: `index.css               # Global CSS, Tailwind imports, and CSS variables`
    - **After**: `index.css               # Minimal CSS reset for pre-rendering`
    - **Before**: `- **`src/index.css`**: Defines CSS variables that power the application's dynamic theme (dark/light modes) and contains custom utility classes.`
    - **After**: `- **`src/index.css`**: Minimal pre-render reset stylesheet; styling and global variables are handled in theme files.`

---

### 4. `graphify-out/GRAPH_REPORT.md`
- **Issue 4.1: Broken Wiki-style Relative Links**
  - **Location**: Lines 18-46 (`## Community Hubs (Navigation)`)
  - **Verbatim Text**: `[[_COMMUNITY_Community 0|Community 0]]` through `[[_COMMUNITY_Community 28|Community 28]]`
  - **Observation**: These wiki-style links point to separate community reports (e.g. `_COMMUNITY_Community 0.md`), which were not generated and do not exist anywhere in the workspace.
  - **Proposal**: Remove the wiki-link markup or convert them to plain text.

- **Issue 4.2: Inaccurate Component Node Name**
  - **Location**: Line 84 (`### Community 2`)
  - **Verbatim Text**: `NotifItem()`
  - **Observation**: The actual React component in the codebase is named `NotifItemRow` (defined in `frontend/src/components/NotificationBell.tsx`).
  - **Proposal**: Update reference to `NotifItemRow()`.

- **Issue 4.3: Inaccurate Backend Function Node Name**
  - **Location**: Line 124 (`### Community 12`)
  - **Verbatim Text**: `get_goals()`
  - **Observation**: There is no backend python function or route named `get_goals()`. The actual functions are `list_goals` (in `backend/app/api/areas/finance.py`) and `get_health_goals` (in `backend/app/api/areas/health.py`).
  - **Proposal**: Update reference to `list_goals()` and/or `get_health_goals()`.

---

### 5. `ledgr-ui/README.md`
- **Issue 5.1: Missing/Non-existent Component `Inline`**
  - **Location**: Line 56 (`## Component categories`)
  - **Verbatim Text**: `| **Primitives** | Button, Input, Textarea, Label, Card, Badge, Avatar, Separator, Stack, Inline |`
  - **Observation**: The `Inline` component does not exist in `ledgr-ui/src/primitives` and is not exported in `ledgr-ui/src/index.ts`.
  - **Proposal**: Remove `Inline` from the table row of primitives.

- **Issue 5.2: Inconsistent Component Naming (`Header` vs `AppHeader`)**
  - **Location**: Line 59 (`## Component categories`)
  - **Verbatim Text**: `| **Layout** | AppShell, Sidebar, Header, Breadcrumbs, MobileBottomNav |`
  - **Observation**: In the actual codebase, the component is named `AppHeader`, not `Header` (located in `ledgr-ui/src/layout/AppHeader` and exported as `AppHeader` in `ledgr-ui/src/index.ts`).
  - **Proposal**: Replace `Header` with `AppHeader`.

---

### 6. `MEMORY.md`
- **Status**: Checked. No broken links or snippet mismatches found. The guidelines and details are fully accurate.

---

### 7. `ORIGINAL_REQUEST.md`
- **Status**: Checked. Contains the historical log of user requests; all code references are literal requirements requested in previous turns and are correct.

---

## Verification Commands & Method

To independently verify these findings:
1. **Frontend stack checking**: Run `cat frontend/package.json` to confirm there is no `tailwindcss` in `dependencies` or `devDependencies`.
2. **WebSocket entry point check**: Run `find frontend/src -name "*websocket*"` and notice it returns no results. Run `grep -rn "WebSocket" frontend/src/` to confirm that all WebSocket objects are created inline.
3. **Component existence checks**:
   - Run `ls ledgr-ui/src/primitives/Inline` (fails with "No such file or directory").
   - Run `ls ledgr-ui/src/layout/AppHeader` (succeeds).
   - Run `ls ledgr-ui/src/layout/Header` (fails).
4. **Wiki link checks**: Run `ls graphify-out/_COMMUNITY_Community*` (fails with "No such file or directory").
5. **Goals function checks**: Run `grep -rn "def get_goals" backend/` (fails to find any definitions). Run `grep -rn "def list_goals" backend/` (succeeds in `backend/app/api/areas/finance.py`).
