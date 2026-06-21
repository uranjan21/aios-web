## 2026-06-21T00:48:51Z
You are Explorer 3 - Snippet & Link Verifier.
Your workspace directory is: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_explorer_audit_3

Objective:
Verify all code snippets and relative links across all markdown (.md) files in the project.

Tasks:
1. Initialize progress.md and BRIEFING.md in your workspace directory.
2. Scan all markdown files: CLAUDE.md, MEMORY.md, ORIGINAL_REQUEST.md (excluding our agent files), PROJECT.md, PROJECT_STRUCTURE.md, graphify-out/GRAPH_REPORT.md, ledgr-ui/README.md.
3. Validate every code snippet: check if the classes, imports, filenames, or API usage exist and match the actual implementation in the repository.
4. Validate every relative markdown link: check if the target files/directories actually exist.
5. Produce a detailed report named `audit_report_verification.md` in your workspace directory, listing every broken link and out-of-date code snippet with exact locations.
6. Send a message to the caller (main agent / orchestrator) with the path to your report.
