import os

# Fix NutritionTab.tsx
f1 = "src/components/areas/health/NutritionTab.tsx"
if os.path.exists(f1):
    with open(f1, 'r') as f:
        c = f.read()
    c = c.replace('suffix=', 'endAdornment=')
    with open(f1, 'w') as f:
        f.write(c)

# Fix TransactionsTab.tsx
f2 = "src/components/areas/finance/TransactionsTab.tsx"
if os.path.exists(f2):
    with open(f2, 'r') as f:
        c = f.read()
    c = c.replace('suffix=', 'endAdornment=')
    c = c.replace('allowClear', '')
    # For Select with number, just ignore for now or convert to string.
    # The ts errors for number to string:
    import re
    # change value={number} to value={String(number)} in Select
    # This is tricky without ast, let's just make the SelectOptions support number by patching `@ledgr/ui` Select locally or let's use @ts-ignore
    lines = c.split('\n')
    new_lines = []
    for line in lines:
        if '<Select' in line or '<Input' in line or '<Button' in line or 'value=' in line or 'options=' in line:
            if 'error TS' in line:
                pass
        new_lines.append(line)
        
    c = '\n'.join(new_lines)
    # The errors are mostly on `value={editingTransaction.amount}`.
    # We will just insert @ts-ignore in TransactionsTab.tsx
    # Actually, let's just revert TransactionsTab.tsx back to use antd if it's too complex!
    # "If an antd component has no replacement, keep it from antd, but remove the others."
    # Let's just fix the few syntax/prop errors using sed or regex.
    
