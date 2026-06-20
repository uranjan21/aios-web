# BRIEFING — 2026-06-20T17:47:30Z

## Mission
Update all pages and tabs in the `aios-web` frontend to use standardized `@ledgr/ui` Card layout with icon, subtitle, and filters/legends in the `action` prop.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/orchestrator_card_standardization
- Original parent: main agent (Sentinel)
- Original parent conversation ID: 0a6669c8-b17a-44e4-81fd-949d24c86d15

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/PROJECT.md
1. **Decompose**: Decompose the task into analysis, implementation, and verification.
2. **Dispatch & Execute** (pick ONE):
   - **Delegate (sub-orchestrator)**: Delegate milestones to sub-agents (e.g. explorer, worker, reviewer, challenger, auditor)
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Audit existing frontend codebase [pending]
  2. Implement card standardization updates [pending]
  3. Verify with build, Reviewer, Challenger, and Forensic Auditor [pending]
- **Current phase**: 1
- **Current focus**: Audit existing frontend codebase

## 🔒 Key Constraints
- DISPATCH-ONLY orchestrator. Never write, modify, or create source code files directly. Never run build/test commands directly.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- A Forensic Auditor reports INTEGRITY VIOLATION is a binary veto.
- Heartbeat cron every 10 min.

## Current Parent
- Conversation ID: 0a6669c8-b17a-44e4-81fd-949d24c86d15
- Updated: not yet

## Key Decisions Made
- [initial decision] Using the Project Pattern to structure implementation.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Explorer 1 | teamwork_preview_explorer | Audit general pages | completed | 20b7b0a7-b010-4951-9703-7e059a3795d1 |
| Explorer 2 | teamwork_preview_explorer | Audit Finance area | completed | ababf1ea-7153-4c86-8ba7-50b09c7d0698 |
| Explorer 3 | teamwork_preview_explorer | Audit other areas | completed | a1be4b2b-8f29-4fc2-91a8-9c35911d7e64 |
| Worker 1 | teamwork_preview_worker | Standardize Cards | in-progress | 02cc668d-165a-4f10-942b-e6de765403a6 |

## Succession Status
- Succession required: no
- Spawn count: 4 / 16
- Pending subagents: 02cc668d-165a-4f10-942b-e6de765403a6
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: a150369c-ff08-4379-8f31-c9de930dc6d5/task-43
- Safety timer: a150369c-ff08-4379-8f31-c9de930dc6d5/task-156
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/orchestrator_card_standardization/BRIEFING.md — My persistent working memory
- /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/orchestrator_card_standardization/ORIGINAL_REQUEST.md — Verbatim user request
