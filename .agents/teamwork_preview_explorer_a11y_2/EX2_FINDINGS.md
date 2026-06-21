# Explorer 2 AI, Chat, & Health Audit Findings

This document details the accessibility (a11y) and UI/UX audit results for the AI/Chat and Health components in the `aios-web` codebase. The target files audited are:
- `frontend/src/pages/ChatPage.tsx`
- `frontend/src/pages/AgentsPage.tsx`
- `frontend/src/pages/areas/HealthPage.tsx`
- `frontend/src/components/areas/health/BodySleepTab.tsx`
- `frontend/src/components/areas/health/FitnessTab.tsx`
- `frontend/src/components/areas/health/NutritionTab.tsx`
- `frontend/src/components/areas/health/HistoryTab.tsx`

---

## 1. Accessibility (a11y) Findings & Gaps

### 1.1 Orphaned Inputs / Missing Label Associations
Several forms use `<StyledLabel>` adjacent to `<Input>` or `<Select>` elements without using `id` and `htmlFor` attributes to associate them programmatically. This leaves the inputs "orphaned" for screen readers.

*   **`frontend/src/components/areas/health/BodySleepTab.tsx`**
    *   **Date (Body Stats)**: Lines 490-491.
    *   **Weight (kg)**: Lines 494-495.
    *   **Body Fat %**: Lines 498-499.
    *   **Notes (Body)**: Lines 502-503.
    *   **Date (Sleep)**: Lines 517-518.
    *   **Hours Slept**: Lines 521-522.
    *   **Quality Select**: Lines 525-526.

    *Example Code (Before)*:
    ```tsx
    <StyledFormGroup>
      <StyledLabel>Weight (kg)</StyledLabel>
      <Input type="number" required placeholder="0" min={0} step={0.1} value={bodyFormState.weight_kg} onChange={(e: any) => setBodyFormState(p => ({ ...p, weight_kg: e.target.value }))} />
    </StyledFormGroup>
    ```

    *Proposed Fix (After)*:
    ```tsx
    <StyledFormGroup>
      <StyledLabel htmlFor="body-weight">Weight (kg)</StyledLabel>
      <Input id="body-weight" type="number" required placeholder="0" min={0} step={0.1} value={bodyFormState.weight_kg} onChange={(e: any) => setBodyFormState(p => ({ ...p, weight_kg: e.target.value }))} />
    </StyledFormGroup>
    ```

*   **`frontend/src/components/areas/health/FitnessTab.tsx`**
    *   **Goal Target**: Lines 225-232.

    *Example Code (Before)*:
    ```tsx
    <StyledGoalInputWrapper>
      <StyledGoalInputLabel>Target:</StyledGoalInputLabel>
      <StyledGoalInput
        type="number"
        value={target}
        ...
      />
    </StyledGoalInputWrapper>
    ```

    *Proposed Fix (After)*:
    ```tsx
    <StyledGoalInputWrapper>
      <StyledGoalInputLabel htmlFor={`goal-target-${goal.key}`}>Target:</StyledGoalInputLabel>
      <StyledGoalInput
        id={`goal-target-${goal.key}`}
        type="number"
        value={target}
        ...
      />
    </StyledGoalInputWrapper>
    ```

*   **`frontend/src/components/areas/health/NutritionTab.tsx`**
    *   **Food Name**: Line 615.
    *   **Meal Type**: Line 619.
    *   **Calories**: Line 626.
    *   **Protein**: Line 630.
    *   **Carbs**: Line 634.
    *   **Fat**: Line 638.

    *Proposed Fix*: Assign unique IDs (e.g. `food-name`, `meal-type`) to inputs and map them with `htmlFor` on the respective `<StyledLabel>` components.

### 1.2 Form Inputs Missing Labels or Accessible Names (`aria-label`)
Inputs that do not have visible text labels should have an `aria-label` attribute describing their purpose.

*   **`frontend/src/components/areas/health/FitnessTab.tsx`**
    *   **Session Name Input**: Line 982. Needs `aria-label="Workout session name"`.
    *   **Exercise Input**: Line 987. Needs `aria-label="Exercise name"`.
    *   **Reps Input**: Line 998. Needs `aria-label="Reps"`.
    *   **Weight Input**: Line 999. Needs `aria-label="Weight in kg"`.
    *   **Habit Name Input**: Line 1022. Needs `aria-label="Habit name"`.
    *   **Habit Icon Input**: Line 1029. Needs `aria-label="Habit emoji icon"`.
*   **`frontend/src/components/areas/health/NutritionTab.tsx`**
    *   **Search Food Input**: Line 573. Needs `aria-label="Search food database"`.
    *   **Grams Input**: Line 594. Needs `aria-label="Weight in grams"`.
*   **`frontend/src/components/areas/health/HistoryTab.tsx`**
    *   **Filter Type Select**: Line 139. Needs `aria-label="Filter logs by type"`.

### 1.3 Icon Buttons Missing Accessible Names
Buttons containing only SVG icons are unreadable by screen readers unless they contain an `aria-label`.

*   **`frontend/src/pages/AgentsPage.tsx`**
    *   **View Terminal Button**: Lines 563-574. The button wraps a `<Terminal size={14} />` icon but has no text or aria-label.

    *Example Code (Before)*:
    ```tsx
    <Button
      variant="outline"
      onClick={() => setTerminalOpen(true)}
      size="sm"
      style={{
        color: theme.color.mutedForeground,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Terminal size={14} />
    </Button>
    ```

    *Proposed Fix (After)*:
    ```tsx
    <Button
      variant="outline"
      onClick={() => setTerminalOpen(true)}
      size="sm"
      aria-label={`View terminal logs for ${agent.name}`}
      style={{
        color: theme.color.mutedForeground,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Terminal size={14} />
    </Button>
    ```

### 1.4 Missing Focus Styles & Keyboard Navigation
Clickable components must be focusable (using `tabIndex={0}` or native `<button>`/`<a>` elements) and support focus indicators.

*   **`frontend/src/pages/ChatPage.tsx`**
    *   **`ToolCallButton`**: Line 76. It does not have focus ring styles.
    *   **`SessionItem`**: Line 438. It is a clickable `div` that lacks `tabIndex={0}` and keyboard navigation handlers.
*   **`frontend/src/components/areas/health/BodySleepTab.tsx`**
    *   **`StyledListItem`**: Line 76. Hover styles indicate interactivity, but it does not support focus rings or `tabIndex`.
*   **`frontend/src/components/areas/health/FitnessTab.tsx`**
    *   **`StyledHabitDayButton`**: Line 416. Does not have a focus ring, nor does it support keyboard activation.
*   **`frontend/src/components/areas/health/NutritionTab.tsx`**
    *   **`StyledQuickAddButton`**: Line 304. Lacks `:focus-visible` styles.
    *   **`StyledMealItem`**: Line 221. Changes background on hover but lacks keyboard interaction and focus styling.

---

## 2. UI/UX & Styling Guidelines Compliance

### 2.1 Emojis Used as Icons
The UI/UX guidelines explicitly forbid raw emojis as UI icons. They should be replaced with Lucide/SVG icons.

*   **`frontend/src/pages/ChatPage.tsx`**
    *   **Quick Prompts Grid**: Emojis are used directly inside prompt buttons:
        ```typescript
        const QUICK_PROMPTS = [
          { label: '🏋️ Log gym session', value: "Log today's gym session" },
          { label: '💸 Week spending?', value: 'What did I spend this week?' },
          { label: '📈 Career summary', value: 'Summarize my career progress this month' },
          { label: '📅 Upcoming events', value: "What's on my calendar this week?" },
        ]
        ```
*   **`frontend/src/components/areas/health/FitnessTab.tsx`**
    *   **Default Habit Icon**: Uses `'🎯'` (Line 490).
    *   **New Habit Icon Placeholder**: Uses `"🧘"` (Line 1029).
*   **`frontend/src/components/areas/health/NutritionTab.tsx`**
    *   **Quick Adds**: Emojis are used directly inside quick add buttons:
        ```typescript
        const QUICK_ADDS = [
          { label: '🍛 Dal Rice', ... },
          { label: '🫓 Roti', ... },
          { label: '🥛 Whey', ... },
          { label: '☕ Coffee', ... },
        ]
        ```

### 2.2 Interactive Elements Missing Pointer Cursor
Interactive/clickable elements must display `cursor: pointer` on hover.

*   **`frontend/src/components/areas/health/BodySleepTab.tsx`**
    *   **`StyledListItem`**: Line 76. Lacks `cursor: pointer` (visual hover state exists).
*   **`frontend/src/components/areas/health/FitnessTab.tsx`**
    *   **`StyledHabitDayButton`**: Line 416. Lacks `cursor: pointer`.
*   **`frontend/src/components/areas/health/NutritionTab.tsx`**
    *   **`StyledMealItem`**: Line 221. Lacks `cursor: pointer` (visual hover state exists).

### 2.3 Strict Typography: Large / Bold KPI Values
The design guidelines in `MEMORY.md` state:
> *"NEVER use font-bold, text-lg, text-2xl, or text-3xl for values inside widget cards. KPI numbers and values must STRICTLY match the compact sidebar font sizes (e.g. text-[12px] or text-xs)."*

*   **`frontend/src/components/areas/health/FitnessTab.tsx`**
    *   **`StyledGoalCurrentValue`**: Line 128. Uses `font-size: 20px; font-weight: 700;`.
    *   **`StyledHabitsStatsValue`**: Line 600. Uses `font-size: 1.125rem; font-weight: 600;`.
*   **`frontend/src/components/areas/health/NutritionTab.tsx`**
    *   **`StyledCalorieRingValue`**: Line 112. Uses `font-size: 1.25rem (20px); font-weight: 700;`.

### 2.4 Border Radius Violations
The guidelines state:
> *"Border radii should be compact and consistent: use 10px for cards, table shells, and modal/dialog surfaces (avoid oversized corners)."*

*   **`frontend/src/pages/AgentsPage.tsx`**
    *   **`AgentSkeleton`**: Line 108. Uses `border-radius: 12px;` instead of `10px` / `theme.radii.xl`.
    *   **`AgentErrorBoundary`**: Line 52. Uses `borderRadius: "12px"` instead of `10px`.
*   **`frontend/src/pages/areas/HealthPage.tsx`**
    *   **`StyledFastingWrapper`**: Line 124. Uses `border-radius: 0.75rem;` (`12px`) instead of `10px`.

### 2.5 Responsive Layout Spacing Issues
*   **`frontend/src/components/areas/health/FitnessTab.tsx`**
    *   **`StyledHabitsGrid`**: Line 556. Styled as `grid-template-columns: repeat(3, 1fr);` without any media queries. On small mobile screens, the three KPI cards will get excessively squashed and overflow. It should wrap on mobile (e.g. `grid-template-columns: 1fr;` on mobile, `repeat(3, 1fr)` on desktop).

---

## 3. Project Guidelines Adherence

### 3.1 Portal Pattern Violation (Dynamic Header Actions)
The guideline in `AGENTS.md` states:
> *"When a specific tab (like `TransactionsTab` or `HistoryTab`) needs primary action buttons (like `+ Add Transaction` or `Export CSV`), wrap those buttons in the `<HeaderActionPortal>` from `@ledgr/ui`. This will dynamically 'beam' those actions up into the top-right of the `PageHeader`."*

*   **`frontend/src/components/areas/health/HistoryTab.tsx`**
    *   **Violation**: HistoryTab contains the **"Export CSV"** button and uses `onLogClick` to trigger the **"Add Entry"** modal, but **does NOT wrap these in `<HeaderActionPortal>`**. They are hardcoded inside the `action` slot of `GlassCard`.
    *   *Proposed Fix*: Wrap the header actions in `HeaderActionPortal` to match the portal patterns used in `BodySleepTab.tsx`, `FitnessTab.tsx`, and `NutritionTab.tsx`.

---

## Summary of Fixes Required
1.  **A11y Label Mapping**: Add `id` on inputs and matching `htmlFor` on labels in `BodySleepTab.tsx`, `FitnessTab.tsx`, and `NutritionTab.tsx`.
2.  **A11y Aria Labels**: Add `aria-label` to inputs lacking visual labels and the `Terminal` button in `AgentsPage.tsx`.
3.  **Keyboard Focus / Hover**: Add `cursor: pointer` to lists/buttons, and implement `:focus-visible` with `#CA8A04` gold accent (`theme.color.ring`).
4.  **Remove Emojis**: Replace raw emojis in chat quick prompts, nutrition quick-adds, and habit templates with Lucide/SVG icons.
5.  **Typography**: Squeeze large KPI font sizes (20px / 18px) down to `text-[12px]` or `text-xs` and remove bold weights.
6.  **Border Radius**: Replace hardcoded `12px` and `0.75rem` corners with `10px` / `theme.radii.xl` tokens.
7.  **HistoryTab Portal**: Implement `<HeaderActionPortal>` to beam up "Export CSV" and "Add Entry" buttons.
