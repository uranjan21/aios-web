import os

def fix_import_modal():
    path = "src/components/areas/finance/ImportCsvModal.tsx"
    with open(path, 'r') as f:
        content = f.read()
    content = content.replace('className="w-full" placeholder="No account"', 'placeholder="No account"')
    content = content.replace('className="w-full" placeholder="Uncategorized"', 'placeholder="Uncategorized"')
    content = content.replace('tone="critical"', 'tone="destructive"')
    content = content.replace('variant="primary" icon={<Upload size={13} />}', 'variant="primary"')
    content = content.replace('Import {includedCount} row(s)', '<Upload size={13} className="mr-2 inline" />Import {includedCount} row(s)')
    with open(path, 'w') as f:
        f.write(content)

def fix_payoff_planner():
    path = "src/components/areas/finance/PayoffPlanner.tsx"
    with open(path, 'r') as f:
        content = f.read()
    content = content.replace("variant={i === 0 ? 'solid' : 'outline'}", "")
    with open(path, 'w') as f:
        f.write(content)

def fix_transactions_tab():
    path = "src/components/areas/finance/TransactionsTab.tsx"
    with open(path, 'r') as f:
        content = f.read()
    content = content.replace('onChange={setRecurring}', 'onChange={(val: any) => setRecurring(val?.target ? val.target.checked : val)}')
    content = content.replace('startAdornment="$"', 'prefix="$"')
    content = content.replace('mode="tags"', '')
    content = content.replace('suffixIcon={null}', '')
    content = content.replace('allowClear', '')
    content = content.replace('className="w-32"', '')
    content = content.replace('className="w-40"', '')
    content = content.replace('className="w-32 hidden md:block"', '')
    content = content.replace('className="min-w-[140px]"', '')
    content = content.replace('value: 7', 'value: "7"')
    content = content.replace('value: 30', 'value: "30"')
    content = content.replace('value: 90', 'value: "90"')
    content = content.replace('value: 12', 'value: "12"')
    content = content.replace('value: 36', 'value: "36"')
    content = content.replace('value: 60', 'value: "60"')
    content = content.replace('value: dayjs().year()', 'value: String(dayjs().year())')
    content = content.replace('value: dayjs().year() - 1', 'value: String(dayjs().year() - 1)')
    content = content.replace('size="sm"', 'size="small"')
    with open(path, 'w') as f:
        f.write(content)

def fix_nutrition_tab():
    path = "src/components/areas/health/NutritionTab.tsx"
    with open(path, 'r') as f:
        content = f.read()
    content = content.replace('size="sm"', 'size="small"')
    with open(path, 'w') as f:
        f.write(content)

fix_import_modal()
fix_payoff_planner()
fix_transactions_tab()
fix_nutrition_tab()
