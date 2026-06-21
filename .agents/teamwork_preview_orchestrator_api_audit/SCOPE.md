# Scope: API Audit, Frontend Mapping, & Accessibility/UI-UX Verification

## Architecture
- **Backend API**: Python FastAPI application (located in `/backend`) defining routes under `/app/api`.
- **Frontend SPA**: React 18 application (located in `/frontend`) making API calls using client libraries.
- **Verification Tooling**: Custom integration/verification scripts checking API request/response shape.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | **Backend API Discovery & Documentation** | Scan Python backend files to identify and document all API endpoints (HTTP method, path, parameters, request body, response schema). Produce `API_INVENTORY.md`. | None | DONE |
| 2 | **Frontend Mapping Verification** | Identify where each backend API is called in the frontend, document the mappings in `API_MAPPING.md`, and write programmatic test/verification scripts. | Milestone 1 | DONE |
| 3 | **Accessibility & UI/UX Audit** | Perform a11y (aria, keyboard, contrast) and UI/UX reviews on frontend pages/features using those APIs using `a11y-debugging` and `ui-ux-pro-max` guidelines. | Milestone 2 | DONE |
| 4 | **Final Verification & Forensic Audit** | Run verification scripts, ensure `pnpm build` compiles cleanly, and run a Forensic Auditor to ensure absolute integrity of all audits and mappings. | Milestone 3 | IN_PROGRESS |

## Interface Contracts
- **`API_INVENTORY.md`**: Generated backend API catalog.
- **`API_MAPPING.md`**: Mapping list between backend routes and frontend components/functions.
- **`verify_mappings.py` / `verify_mappings.ts`**: Script to verify mappings and endpoint definitions programmatically.
