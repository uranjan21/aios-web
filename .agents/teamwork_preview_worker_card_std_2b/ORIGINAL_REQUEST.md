# Worker 2b Request - Business & Career Card Standardization

## Working Directory
/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_2b

## Objective
Standardize card usage in `BusinessPage.tsx`, `SummaryTab.tsx` (business), and `CareerPage.tsx` per standard conventions.

## Specific Task Instructions

### 1. `frontend/src/pages/areas/BusinessPage.tsx`
- Runway Calculator: add `subtitle="Calculate cash runway based on burn rate"`.
- Ledgr Project Card: refactor to use standard `GlassCard` props:
  - `title="Ledgr"`
  - `subtitle="SaaS accounting for Indian freelancers"`
  - `icon={<Rocket size={16} />}`
  - `action={<Badge tone="info">Building</Badge>}`
  - Remove custom `ProjectHeader`, `ProjectTitle`, `ProjectDescription`, and `BadgeWrapper` styled components from the file.
- Event Timeline Card: add `subtitle="Recent venture milestones and decisions"`.

### 2. `frontend/src/components/areas/business/SummaryTab.tsx`
- MetricTile: remove the duplicate `<TileSub>{sub}</TileSub>` element from the card body since it is already rendered by standard `Card` subtitle prop.

### 3. `frontend/src/pages/areas/CareerPage.tsx`
- CareerStat: Refactor to use standard `Card` header props:
  - Skills Tracked: `icon={<BookOpen size={16} />}` and `subtitle="total skills tracked"`
  - Active Pipeline: `icon={<Briefcase size={16} />}` and `subtitle="open opportunities"`
  - In Play: `icon={<Target size={16} />}` and `subtitle="interview or offer stages"`
  - Milestones: `icon={<History size={16} />}` and `subtitle="timeline logs"`
- Opportunities Pipeline: Add `subtitle="Track active job applications and stages"`.
- Career Timeline: Add `subtitle="Career history and milestone timeline"`.
- Skills Radar: Add `subtitle="Visual mapping of core competencies"`.

## Integrity Constraints
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

## Completion Criteria
- Modify all specified files cleanly.
- Verify changes compile successfully.
- Write a `handoff.md` detailing changes, code diff references, and compilation validation.

## 2026-06-20T17:58:20Z
Read /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_2b/ORIGINAL_REQUEST.md and implement standard card layouts. Write progress to progress.md and handoff details to handoff.md. Use /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_2b as your working directory.

