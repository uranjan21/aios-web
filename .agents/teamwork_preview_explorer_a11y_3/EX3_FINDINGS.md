# Accessibility (a11y) & UI/UX Audit Findings

This report documents the detailed findings of the accessibility and UI/UX audit conducted on the Finance, Career, Business, and Content modules of the application.

---

## 1. Finance Module
### Audited Files:
- `frontend/src/pages/areas/FinancePage.tsx`
- `frontend/src/components/areas/finance/TransactionsTab.tsx`
- `frontend/src/components/areas/finance/AccountsTab.tsx`
- `frontend/src/components/areas/finance/AccountManager.tsx`
- `frontend/src/components/areas/finance/BudgetTab.tsx`
- `frontend/src/components/areas/finance/BudgetsTab.tsx`

### Detailed Observations:
1. **Unassociated Form Labels (`a11y-debugging` violation)**:
   - In `TransactionsTab.tsx` (lines 503-534, 571-578), form inputs have adjacent `<FormLabel>` elements but are not programmatically linked. There is no `id` attribute on the inputs or `htmlFor` on the labels.
     - *Code Snippet (Before)*:
       ```tsx
       <div>
         <FormLabel>Amount (₹)</FormLabel>
         <Input type="number" startAdornment="₹" placeholder="0.00" value={amount} ... />
       </div>
       ```
     - *Proposal (After)*:
       ```tsx
       <div>
         <FormLabel htmlFor="amount-input">Amount (₹)</FormLabel>
         <Input id="amount-input" type="number" startAdornment="₹" placeholder="0.00" value={amount} ... />
       </div>
       ```
   - In `TransactionsTab.tsx` (line 546-550), the category select and amount input inside the split mode array have no associated labels or `aria-label` tags at all.
   - In `BudgetsTab.tsx` (line 281-287), the select dropdown and limit inputs in `FormLayout` lack `<label>` or `aria-label` tags.
   - In `AccountManager.tsx` (line 296-337), inputs are nested inside labels (e.g. `<FieldLabel>Account name<Input ... /></FieldLabel>`). While nested inputs provide implicit association in native HTML, custom elements like `<Select>` require explicit linkings (e.g. `aria-label` or `aria-labelledby`) because they render custom `div` elements under the hood.
   - In `TransactionsTab.tsx` (line 759), the search input in the toolbar does not have an `aria-label` or `<label>` wrapper.
   - In `FilterModal` inside `TransactionsTab.tsx` (line 965): the amount range min/max inputs and date range start/end inputs share a single parent label but lack separate accessible names.

2. **Interactive Elements & Focus Rings (`ui-ux-pro-max` violation)**:
   - In `TransactionsTab.tsx` (line 268) and `BudgetsTab.tsx` (line 61), custom buttons (`TxnActionBtn` and `ActionContainer` buttons) lack focus indicators.
   - None of the audited files contain focus styles or outline rings that use the `#CA8A04` gold accent.
   - *Proposal*:
     ```css
     &:focus-visible {
       outline: 2px solid #CA8A04;
       outline-offset: 2px;
     }
     ```

3. **Raw Emojis as Icons (`ui-ux-pro-max` violation)**:
   - In `TransactionsTab.tsx` (line 327), a raw symbol character is used: `⧉ split`.
   - In `TransactionsTab.tsx` (line 552), `✕` (multiplication sign) is used as a button label.
   - In `TransactionsTab.tsx` (line 563), `✓` (checkmark sign) is used to indicate a successful sum match.
   - *Fix*: Replace with Lucide icons (`Split`, `X`, `Check`).

4. **Local Styling Overrides**:
   - `TransactionsTab.tsx` overrides padding and borders locally:
     - `TxnRowRoot` (line 205): `border-bottom: 1px solid var(--border);`
     - `SplitPanel` (line 146): Custom border-radius and background.
     - `TxnList_Wrap` (line 289): Local `max-height: 420px; overflow-y: auto; padding-right: 4px;` scroll overrides.

5. **Responsiveness**:
   - `SummaryGrid` (line 64) and `FormGrid` (line 111) in `TransactionsTab.tsx` use a fixed grid layout without media queries for mobile, which squeezes inputs and content on small viewports.

---

## 2. Career Module
### Audited Files:
- `frontend/src/pages/areas/CareerPage.tsx`
- `frontend/src/components/areas/career/OpportunitiesTab.tsx`
- `frontend/src/components/areas/career/RoadmapTab.tsx`
- `frontend/src/components/areas/career/CareerLogModal.tsx`
- `frontend/src/components/areas/career/SkillGapCard.tsx`

### Detailed Observations:
1. **Unassociated Form Labels**:
   - In `CareerPage.tsx` (lines 235, 266, 344, 377, 438), the dropdown selects (for skill level, status filters, pipeline filters, timeline filters, and radar filters) are unlabelled and lack `aria-label` tags.
   - In `OpportunitiesTab.tsx` (line 322), the status select in `OppRow` has no label or `aria-label`.
   - In `OpportunitiesTab.tsx` (lines 385-407), the Add Form inputs (Company, Role, URL, Notes) and Status select have unlinked `<FormLabel>` elements.
   - In `CareerLogModal.tsx` (lines 79-86, 122-132, 171-181), the forms for Milestones, Opportunities, and Skills lack `<label>` elements entirely and use only `placeholder` text on inputs, which is a major accessibility issue.
   - In `SkillGapCard.tsx` (line 90), the Target Role input has no label or `aria-label`.

2. **Interactive Elements & Focus Rings**:
   - In `OpportunitiesTab.tsx` (line 125), `DragCard` handles `onDrag` but cannot be navigated or focused using a keyboard. It lacks `tabIndex` or keyboard-based event listeners.
   - None of the buttons or inputs in Career Page tabs/modals define focus rings utilizing the gold accent `#CA8A04`.

3. **Raw Emojis as Icons**:
   - None found in this module.

4. **Local Styling Overrides**:
   - `CareerPage.tsx` overrides padding and borders locally for custom rows:
     - `AnimatedTimelineItem` (line 88): `padding: 10px 12px; border-radius: 8px; border: 1px solid ...;`
     - `SkillRowRoot` (line 96): `padding: 10px; border-radius: 12px;`
     - `OppRowRoot` (line 122): `padding: 12px; border-radius: 12px;`
   - `OpportunitiesTab.tsx` overrides list wrappers locally:
     - `AddFormRoot` (line 54): `border-radius: 18px; padding: 12px;`
     - `PipelineCol` (line 97): `border-radius: 12px; border: 1px solid ...; padding: 8px;`

5. **Responsiveness**:
   - `FormGrid2` in `OpportunitiesTab.tsx` (line 72) uses a fixed 2-column grid layout on mobile devices.
   - `TwoColGrid` and `HalfGrid` inside `CareerLogModal.tsx` (lines 10, 18) do not stack on viewports under 480px, causing narrow input widths.

---

## 3. Business Module
### Audited Files:
- `frontend/src/pages/areas/BusinessPage.tsx`
- `frontend/src/components/areas/business/EventsTab.tsx`
- `frontend/src/components/areas/business/SummaryTab.tsx`
- `frontend/src/components/areas/business/BusinessLogModal.tsx`

### Detailed Observations:
1. **Unassociated Form Labels**:
   - In `BusinessPage.tsx` (line 255, 367), the selects in `RunwayCalculator` and the event log filter lack labels and `aria-label` tags.
   - In `EventsTab.tsx` (line 103-120), the Event Type select, MRR input, Title input, and Description textarea have unlinked `<FormLabel>` elements.
   - In `EventsTab.tsx` (line 269), the filter select lacks an `aria-label`.
   - In `SummaryTab.tsx` (line 41), the MRR period filter lacks a label or `aria-label`.
   - In `BusinessLogModal.tsx` (line 77-85), the event type select, title input, and description textarea have no `<label>` tags or `aria-label` attributes.

2. **Interactive Elements & Focus Rings**:
   - No local styled buttons or inputs have focus rings utilizing the gold accent `#CA8A04`.

3. **Raw Emojis as Icons**:
   - In `SummaryTab.tsx` (line 226), raw emojis are used inside the status banner:
     - *Code*: `<span>{mrr > 0 ? '🟢' : '🟡'}</span>`
     - *Fix*: Replace with a themed `Badge` component or Lucide icon.

4. **Local Styling Overrides**:
   - `BusinessPage.tsx` (line 33) overrides padding: `@media (min-width: 768px) { padding: 1.5rem; }`.
   - `SummaryTab.tsx` (line 91) defines a custom icon wrapper: `IconWrap`.
   - `SummaryTab.tsx` (line 160) overrides borders and backgrounds: `StatusBanner`.

5. **Responsiveness & Usability (Critical)**:
   - **Static Runway Calculator**: In `BusinessPage.tsx` (line 238), the Runway Calculator is non-functional because the state values for Cash and Burn Rate are hardcoded inside the component:
     ```tsx
     const [cash, setCash] = useState(50000)
     const [burnRate, setBurnRate] = useState(5000)
     ```
     There are no `<Input>` elements to allow the user to modify these values. The calculator is completely static.
   - `FormGrid` in `EventsTab.tsx` (line 41) does not stack on mobile.
   - `FormGrid` in `BusinessLogModal.tsx` (line 13) does not stack on mobile.

---

## 4. Content Module
### Audited Files:
- `frontend/src/pages/areas/ContentPage.tsx`
- `frontend/src/components/areas/content/ContentCaptureModal.tsx`
- `frontend/src/components/areas/content/DraftModal.tsx`
- `frontend/src/components/areas/content/TwitterQueueCard.tsx`
- `frontend/src/components/areas/content/ColumnDropZone.tsx`

### Detailed Observations:
1. **Unassociated Form Labels**:
   - In `ContentPage.tsx` (line 627, 644), the inputs inside the Edit task title dialog and Set publish date dialog have no labels or `aria-label` tags.
   - In `ContentCaptureModal.tsx` (line 56, 71), the idea input and platform select have no labels or `aria-label` tags.
   - In `TwitterQueueCard.tsx` (line 89), the filter select has no label or `aria-label`.
   - In `EngagementWidget` inside `ContentPage.tsx` (line 340), the period select has no label or `aria-label`.

2. **Interactive Elements & Focus Rings**:
   - `CardActionBtn` (line 159) has no focus ring styling.
   - None of the buttons or inputs in Content Page tabs/modals define focus rings utilizing the gold accent `#CA8A04`.

3. **Raw Emojis as Icons**:
   - None found in this module.

4. **Local Styling Overrides**:
   - `ContentPage.tsx` contains numerous styling overrides:
     - `StatsChip` (line 95): Custom background, padding, border, and shadows.
     - `PlatformBadge` (line 136): Custom padding and border-radius.
     - `CardActions` (line 145): Custom shadow and border.
     - `StatItemRoot` (line 270): Custom background, padding, border-radius.
     - `StyledPublishedCard` (line 372): Overrides backgrounds and borders.

5. **Responsiveness**:
   - Responsive layout structure is handled well using CSS Grid with column spans adapting from mobile to desktop sizes.
