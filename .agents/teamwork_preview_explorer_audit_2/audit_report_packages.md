# Audit Report: Sub-Package Markdown Files

**Audit Date**: 2026-06-21  
**Auditor**: Explorer 2 - Package Docs Auditor  
**Scope**: 
- `ledgr-ui/README.md`
- `graphify-out/GRAPH_REPORT.md`

---

## Executive Summary

An audit of the sub-package markdown files in the workspace was conducted to check for redundancy, formatting errors, broken links, typos, and out-of-date code snippets.
- **`ledgr-ui/README.md`**: Essential package documentation. It should be **kept and updated** because it contains discrepancies in component category listings, a false claim about TypeScript type enforcement, and minor spelling/vocabulary inconsistencies.
- **`graphify-out/GRAPH_REPORT.md`**: Stale auto-generated code graph analysis. It should be **deleted or moved out of source control** (and generated dynamically/git-ignored) because it is tied to an outdated commit, contains 28 broken Obsidian-style WikiLinks, and suffers from graph extraction noise where Python docstrings are parsed as nodes.

---

## Detailed Findings: `ledgr-ui/README.md`

### 1. Component Categories Discrepancies (Out-of-Date / Inaccurate)
The component listings in `ledgr-ui/README.md` (lines 52–60) do not match the exported public surface defined in `ledgr-ui/src/index.ts`.

- **Primitives (Line 56)**:
  * **Listed**: `Inline`
  * **Codebase**: `Inline` component does not exist in `ledgr-ui/src/primitives` or anywhere else in the codebase, nor is it exported.
  * **Missing**: `Spinner` exists in the codebase (`ledgr-ui/src/primitives/Spinner`) and is exported in `src/index.ts` but is not mentioned in the README.
- **Patterns (Line 58)**:
  * **Missing**: `AreaToolbar` (exported from `src/patterns/AreaToolbar`), `Skeleton` (exported from `src/patterns/Skeleton`), and `KpiCard` (exported from `src/patterns/KpiCard.tsx`) are all missing from this category in the README.
- **Layout (Line 59)**:
  * **Listed**: `Header`
  * **Codebase**: The layout header component is named and exported as `AppHeader` (from `ledgr-ui/src/layout/AppHeader`), not `Header`.

### 2. Inaccurate TypeScript Enforcement Claim (Line 77)
* **Claim**: `"Icon-only buttons require an aria-label prop (enforced via TypeScript when no children)."`
* **Codebase Verification**: The actual interface `ButtonProps` in `ledgr-ui/src/primitives/Button/Button.tsx` (lines 16–42) is defined as:
  ```tsx
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
    fullWidth?: boolean;
    as?: ElementType;
    href?: string;
    target?: string;
    rel?: string;
    to?: string;
  }
  ```
  Since `ButtonProps` extends React's `ButtonHTMLAttributes` and does not define a conditional/discriminated union for `children` and `aria-label`, TypeScript does **not** enforce an `aria-label` when no children are provided. For example, `<Button size="icon" />` compiles without errors.

### 3. Spelling/Grammar and Consistency (Lines 3, 64, 66)
* **UK vs. US Spelling**: The document uses the UK spelling `"colour"` (line 66: `"colour palettes"`) but elsewhere uses the US spelling `"color"` (e.g. line 37: `"color: {"`, line 67: `"props.theme.color.primary"`), which aligns with the codebase properties.
* **Terminology**: Uses `"themable"` (lines 3, 64), which is less standard than `"themeable"`, though acceptable.

### Recommendations for `ledgr-ui/README.md`
- **Update**: Correct the component list to remove `Inline` and add `Spinner`, `AreaToolbar`, `Skeleton`, and `KpiCard`.
- **Update**: Rename `Header` to `AppHeader` under Layout.
- **Update**: Correct or remove the claim about TypeScript-enforced `aria-label` rules for icon-only buttons, or update the TypeScript implementation in `Button.tsx` to actually enforce it.
- **Update**: Harmonize spelling to US English (`color`) for consistency.

---

## Detailed Findings: `graphify-out/GRAPH_REPORT.md`

### 1. Broken Links (Lines 18–46)
- The report includes a navigation table of "Community Hubs" using Obsidian-style WikiLinks, such as:
  `* [[_COMMUNITY_Community 0|Community 0]]`
  `* [[_COMMUNITY_Community 1|Community 1]]`
- These links are **broken** because no files starting with `_COMMUNITY_` exist in the `graphify-out` directory or the wider workspace.

### 2. Stale Commit and Outdated Analysis (Line 1, 13)
- Stated run date is `2026-06-09`, built from commit `9cf8acf0`.
- As a static file committed into the repository, this report immediately becomes stale and out of sync with subsequent code changes.

### 3. Extraction Parser Noise (Lines 76, 96, 100, 112, 124)
- The report contains multiple nodes named after Python docstrings rather than code identifiers. Examples:
  * `"Shared NVIDIA NIM OpenAI-compatible client."` (Line 96)
  * `"Claude API streaming caller + tool loop."` (Line 96)
  * `"Drop oldest messages until total estimated tokens < _HISTORY_TOKEN_LIMIT."` (Line 96)
  * `"APScheduler-based cron runner for AIOS agents."` (Line 100)
  * `"Extract structured data from vault markdown files."` (Line 112)
- This indicates that the parser used to generate the graph did not distinguish docstrings/comments from actual code entities, cluttering the report with sentences as nodes.

### Recommendations for `graphify-out/GRAPH_REPORT.md`
- **Delete**: Remove `graphify-out/GRAPH_REPORT.md` and the `graphify-out/cache/` directory from version control.
- **Alternative**: Add `graphify-out/` to `.gitignore`. Since this is a developer-specific generated artifact, it should not be checked into the source repository.
- **Tool Configuration**: If kept, the `graphify` config should be tuned to:
  * Exclude docstrings/comments from being treated as code nodes.
  * Generate standard Markdown links or disable WikiLinks output.
