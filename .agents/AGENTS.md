# AiOs Web - Agent Guidelines

## Layout & UI Conventions

### Dynamic Header Actions (Portal Pattern)
- **Rule**: Never hardcode page-level action buttons (e.g. `Ask AI`, `Capture`, `Search`, `Reminders`) inside the `<PageHeader>` or `<AreaToolbar>` components for tabs/sub-pages unless they specifically apply globally.
- **Pattern**: When a specific tab (like `TransactionsTab` or `HistoryTab`) needs primary action buttons (like `+ Add Transaction` or `Export CSV`), wrap those buttons in the `<HeaderActionPortal>` from `@ledgr/ui`. This will dynamically "beam" those actions up into the top-right of the `PageHeader`.
- **Usage Example**:
  ```tsx
  import { HeaderActionPortal } from '@ledgr/ui';
  import { Button } from '@ledgr/ui';
  import { Plus } from 'lucide-react';

  export function SomeTab() {
    return (
      <>
        <HeaderActionPortal>
          <Button size="sm" variant="primary">
            <Plus size={12} /> Add Item
          </Button>
        </HeaderActionPortal>
        {/* Rest of the tab content... */}
      </>
    );
  }
  ```

### Standardized Card Headers
- **Rule**: All charts, table cards, and KPI tiles across all pages and tabs must have an icon and a 1-line faded subtitle explaining what the card is about.
- **Rule**: Each chart/table card should have its own filter or tabs (if relevant) positioned in the top-right side parallel to the card header.
- **Rule**: Chart legends should be positioned at the top parallel to the Title, adjacent (just before) the filters of that card.
- **Usage Example**:
  When using `Card` (or `GlassCard`) from `@ledgr/ui`, provide `icon`, `subtitle`, and `action` props.
  ```tsx
  <GlassCard 
    title="Top Categories" 
    subtitle="Highest spending categories"
    icon={<PieChart size={16} />}
    action={
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Render custom legend here if applicable */}
        <Select size="sm" options={[{label: 'This Month', value: 'month'}]} />
      </div>
    }
  >
    {/* Chart or table goes here */}
  </GlassCard>
  ```
