import re

with open('src/components/areas/finance/TransactionsTab.tsx', 'r') as f:
    content = f.read()

# 1. 
content = re.sub(
    r'<Select placeholder="Source account">\s*\{\(accounts \?\? \[\]\)\.map\(\(a: any\) => <Select\.Option key=\{a\.id\} value=\{a\.id\}>\{a\.name\}</Select\.Option>\)\}\s*</Select>',
    r'<Select placeholder="Source account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} />',
    content
)

# 2.
content = re.sub(
    r'<Select placeholder="Destination account">\s*\{\(accounts \?\? \[\]\)\.map\(\(a: any\) => <Select\.Option key=\{a\.id\} value=\{a\.id\}>\{a\.name\}</Select\.Option>\)\}\s*</Select>',
    r'<Select placeholder="Destination account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} />',
    content
)

# 3.
content = re.sub(
    r'<Select placeholder=\{effectiveKind === \'Expense\' \? \'Select category\' : \'Select source\'\} showSearch>\s*\{\(effectiveKind === \'Expense\' \? EXPENSE_CATEGORIES : INCOME_SOURCES\)\.map\(c => <Select\.Option key=\{c\} value=\{c\}>\{c\}</Select\.Option>\)\}\s*</Select>',
    r'<Select placeholder={effectiveKind === \'Expense\' ? \'Select category\' : \'Select source\'} options={(effectiveKind === \'Expense\' ? EXPENSE_CATEGORIES : INCOME_SOURCES).map(c => ({ label: c, value: c }))} />',
    content
)

# 4.
content = re.sub(
    r'<Select placeholder="No account" allowClear>\s*\{\(accounts \?\? \[\]\)\.map\(\(a: any\) => <Select\.Option key=\{a\.id\} value=\{a\.id\}>\{a\.name\}</Select\.Option>\)\}\s*</Select>',
    r'<Select placeholder="No account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} />',
    content
)

# 5.
content = re.sub(
    r'<Select placeholder="Category" showSearch>\s*\{EXPENSE_CATEGORIES\.map\(c => <Select\.Option key=\{c\} value=\{c\}>\{c\}</Select\.Option>\)\}\s*</Select>',
    r'<Select placeholder="Category" options={EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }))} />',
    content
)

with open('src/components/areas/finance/TransactionsTab.tsx', 'w') as f:
    f.write(content)

