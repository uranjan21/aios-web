# Card & GlassCard Usages Audit Report

This report presents findings from auditing Card and GlassCard usages, custom card containers, and layout wrappers in the general pages and common layouts of `aios-web` (excluding area pages under `pages/areas/`).

---

## 1. Summary of Audit Findings

| Component / Page | Location | Card Type | Subtitle? | Icon? | Filters / Actions | Placement | Recommendation / Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DashboardPage.tsx** | `SummaryCard` (Line 267) | Custom `AppCard` wrapper | No | Yes (custom) | None | N/A | Convert custom header to standard `icon`, `subtitle` and `action` props. |
| **DashboardPage.tsx** | `AreaTile` (Line 328) | Custom `AppCard` wrapper | No | Yes (custom) | None | N/A | Convert custom header to standard `icon`, `subtitle` and `action` props. |
| **DashboardPage.tsx** | Quick Capture (Line 542) | `@ledgr/ui` `GlassCard` | Yes | Yes | None | N/A | Add filter or page-link button inside the `action` prop. |
| **LoginPage.tsx** | `LoginCard` (Line 232) | Custom `form` wrapper | No | No | None | N/A | Replace custom wrapper with `@ledgr/ui` `GlassCard`/`Card`, add standard header. |
| **ChatPage.tsx** | N/A | None | N/A | N/A | N/A | N/A | No changes needed. Chat elements are correctly formatted. |
| **AgentsPage.tsx** | `AgentCard` (Line 297) | Custom `AppCard` wrapper | Yes | Yes | Status pill, Switch, Run button, Terminal button | `action` prop | **100% Compliant**. Excellent implementation. |
| **SettingsPage.tsx** | `Section` (Line 73) | `@ledgr/ui` `GlassCard` | Yes | Yes | None | N/A | Standardize actions/filters by moving context-specific settings buttons to `action`. |
| **SettingsPage.tsx** | Account Card (Line 459) | `@ledgr/ui` `GlassCard` | Yes | Yes | None | N/A | Move the "Sign out" button or user status badge to the `action` prop. |
| **IntegrationsPage.tsx** | `IntegrationCard` (Line 164) | `@ledgr/ui` `GlassCard` | Yes | Yes | Status Pill | `action` prop | **Compliant**. Suggest adding a filter for integration status on page-level. |
| **WorkspaceLayout.tsx** | `Rail` (Line 17) | Custom `div` wrapper | No | No | None | N/A | Refactor to use `@ledgr/ui` `Card` or add standard `title`, `subtitle`, `icon` props. |

---

## 2. Detailed Findings & Recommendations

### A. DashboardPage.tsx
- **File Path**: `frontend/src/pages/DashboardPage.tsx`
- **SummaryCard (Finance, Health, Agents)**
  - **Observation**: Currently defined as a custom extension (`SummaryCardWrapper` styled wrapper on `AppCard`). It builds a custom header inside the card body:
    ```tsx
    305:       <SummaryCardHeader>
    306:         <IconBadge icon={Icon} color={color} size="sm" />
    307:         <SummaryCardTitle>{title}</SummaryCardTitle>
    308:       </SummaryCardHeader>
    ```
    It has no subtitle or action filters.
  - **Recommendations**:
    - Refactor to use the standard `@ledgr/ui` `Card` or `GlassCard` props (`title`, `subtitle`, `icon`, `action`).
    - **Finance Card**:
      - `icon`: `<IndianRupee size={16} />`
      - `subtitle`: `"Overview of net worth, debt, and take-home income"`
      - `action`: Suggest a period filter dropdown: `<Select size="sm" options={[{label: 'This Month', value: 'month'}]} />`
    - **Health Card**:
      - `icon`: `<Heart size={16} />`
      - `subtitle`: `"Weight tracker and workout consistency"`
      - `action`: Suggest a range filter dropdown: `<Select size="sm" options={[{label: 'Last 30 Days', value: '30d'}]} />`
    - **Agents Card**:
      - `icon`: `<Zap size={16} />`
      - `subtitle`: `"Status and runtime logs of AI agents"`
      - `action`: Suggest a status filter: `<Select size="sm" options={[{label: 'All Agents', value: 'all'}, {label: 'Active Only', value: 'active'}]} />`

- **AreaTile (Career, Business, Content)**
  - **Observation**: Currently defined as a custom extension (`AreaTileWrapper` styled wrapper on `AppCard`). It builds a custom header inside the card body (Lines 365-368). It has no subtitle or action filters.
  - **Recommendations**:
    - Refactor to use the standard `@ledgr/ui` `Card` or `GlassCard` props.
    - **Career Card**:
      - `icon`: `<Briefcase size={16} />`
      - `subtitle`: `"Skill progression and activity tracker"`
      - `action`: Suggest a timeframe filter or link in the `action` prop.
    - **Business Card**:
      - `icon`: `<Rocket size={16} />`
      - `subtitle`: `"Monthly recurring revenue and shipping logs"`
      - `action`: Suggest an MRR timeframe/currency filter.
    - **Content Card**:
      - `icon`: `<PenLine size={16} />`
      - `subtitle`: `"Drafting pipeline and monthly publication count"`
      - `action`: Suggest a status filter (e.g. "Pipeline Status").

- **Quick Capture Card**
  - **Observation**: Correctly uses `@ledgr/ui` `GlassCard` with `title`, `subtitle`, and `icon={<Inbox size={16} />}` props. However, it lacks any action or filters.
  - **Recommendations**:
    - Add a relevant filter or navigation link inside the `action` prop. For example, a link to the full inbox/captures view: `<Button size="sm" variant="ghost">View All</Button>`.

---

### B. LoginPage.tsx
- **File Path**: `frontend/src/pages/LoginPage.tsx`
- **Observation**: The login form uses a custom styled form element (`LoginCard`, Line 232) which is styled to look like a card but does not use the standard `@ledgr/ui` component:
  ```tsx
  232: const LoginCard = styled.form`
  233:   background: ${({ theme }) => theme.color.card};
  234:   border: 1px solid ${({ theme }) => theme.color.border};
  235:   border-radius: ${({ theme }) => theme.radii.xl};
  ...
  ```
  It has no icon, subtitle, or header wrapper.
- **Recommendations**:
  - Replace the custom `form` styled wrapper with `@ledgr/ui`'s `GlassCard` or `Card`.
  - Add standard props:
    - `icon`: `<Shield size={16} />` (or `<Lock size={16} />`)
    - `title`: `"Welcome back"`
    - `subtitle`: `"Enter your passphrase to access your command center"`
    - `action`: Suggest a network or encrypt status badge (e.g. `<StatusPill label="Secure" tone="primary" />`).

---

### C. ChatPage.tsx
- **File Path**: `frontend/src/pages/ChatPage.tsx`
- **Observation**: ChatPage is a custom chat interface and doesn't use standard Card or GlassCard elements for UI components. It has message bubbles and input wrappers, but no chart, table, or KPI cards.
- **Recommendations**: No action needed.

---

### D. AgentsPage.tsx
- **File Path**: `frontend/src/pages/AgentsPage.tsx`
- **Observation**: Uses `AgentCardWrapper` which extends `AppCard`. It passes `title`, `subtitle`, `icon` correctly, and encapsulates the action buttons (StatusIndicator, Switch, Run button, Terminal button) correctly inside the `action` prop.
- **Recommendations**: **No action required**. This serves as a reference model for all other cards in the workspace.

---

### E. SettingsPage.tsx
- **File Path**: `frontend/src/pages/SettingsPage.tsx`
- **Section Component (Appearance, System Status, AI Usage, Keyboard Shortcuts)**
  - **Observation**: Uses `@ledgr/ui` `GlassCard` with `title`, `subtitle`, and `icon` props mapped via `SECTION_META` (Line 73). However, these sections currently have no header actions.
  - **Recommendations**:
    - **Appearance**: Suggest adding a "Reset Theme" option or toggle in the `action` prop.
    - **System Status**: Move the status info/refresh trigger (currently inside the card body) into the `action` prop.
    - **AI Usage**: Add a time filter (e.g., "Daily / Weekly / Monthly") to the `action` prop to filter the token gauge history.
    - **Keyboard Shortcuts**: Add a category search/filter dropdown in the `action` prop.
- **Account Card**
  - **Observation**: Uses `@ledgr/ui` `GlassCard` with `title`, `subtitle`, and `icon` props. The "Sign out" button is placed inside the card body (Lines 466-468).
  - **Recommendations**:
    - Move the "Sign out" button to the `action` prop of the `GlassCard` to align it with standard action positioning and keep the card body clean.

---

### F. IntegrationsPage.tsx
- **File Path**: `frontend/src/pages/IntegrationsPage.tsx`
- **Observation**: The `IntegrationCard` (Line 164) uses `GlassCard` correctly, utilizing `title`, `subtitle`, and custom status `icon` props. It places the `StatusPill` in the `action` prop.
- **Recommendations**:
  - The implementation is mostly compliant. Suggest adding a status filter (e.g. "All / Connected / Expired") in the page header to control the integration grid.

---

### G. WorkspaceLayout.tsx
- **File Path**: `frontend/src/components/layout/WorkspaceLayout.tsx`
- **Observation**: The `Rail` container (Line 17) uses a custom card-like `div` wrapper.
  ```tsx
  17: const Rail = styled.div`
  18:   width: 100%;
  19:   flex-shrink: 0;
  20:   display: flex;
  21:   flex-direction: column;
  22:   gap: 16px;
  23:   border-radius: ${({ theme }) => theme.radii['2xl']};
  24:   border: 1px solid ${({ theme }) => theme.color.border};
  25:   background: ${({ theme }) => theme.color.card};
  26:   box-shadow: ${({ theme }) => theme.shadow.xs};
  27:   padding: 16px;
  ...
  ```
  It does not have standard `title`, `subtitle`, or `icon` props.
- **Recommendations**:
  - Replace the custom `Rail` styled wrapper with a styled `@ledgr/ui` `Card` or `GlassCard` to leverage consistent layout properties.
  - Implement props for header, e.g. `icon={<LayoutDashboard size={16} />}` and `subtitle="Workspace tools & quick actions"`.
