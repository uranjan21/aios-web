# Plan — Card Standardization Milestone

## Goal
Update all pages and tabs in the `aios-web` frontend to use standard `@ledgr/ui` Card/GlassCard layouts with icon, subtitle, and filters/legends aligned in the top-right `action` prop.

## Execution Steps

### Phase 1: Exploration and Analysis
- [ ] Scan codebase to find all `Card` and `GlassCard` usages, and any custom card `div`s.
- [ ] List all tabs and pages that render cards or charts.
- [ ] Verify standard props and behavior of Card component in `ledgr-ui` package.

### Phase 2: Implementation of Card Updates
- [ ] Update each page and tab:
  - Replace custom div card wrappers with standard `Card` or `GlassCard`.
  - Add `icon` and `subtitle` props.
  - Move/reposition segmented controls, filters, or chart legends to `action` prop of Card.
  - Implement a relevant filter (e.g., period or status select) if none exists.
  - Extract chart legends from canvas to HTML elements in `action` prop.
- [ ] Verify the application builds successfully with `npm run build` or `pnpm build`.

### Phase 3: Review and Challenge
- [ ] Dispatch Reviewers to ensure no styling overrides/paddings remain, and that the layout matches instructions.
- [ ] Dispatch Challengers to verify interactive filtering, layout correctness, and visual alignment.

### Phase 4: Forensic Audit and Verification
- [ ] Dispatch Forensic Auditor to check for any cheat/bypass/hardcoded behaviors and issue a CLEAN verdict.

### Phase 5: Handoff and Completion Notification
- [ ] Write handoff.md.
- [ ] Send completion message to parent agent.
