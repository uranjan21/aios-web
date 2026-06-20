import os
files = [
    "src/components/areas/health/HealthLogModal.tsx",
    "src/components/areas/business/BusinessLogModal.tsx",
    "src/components/areas/content/ContentCaptureModal.tsx",
    "src/components/areas/content/DraftModal.tsx",
    "src/components/areas/finance/TransactionsTab.tsx",
    "src/components/areas/finance/ImportCsvModal.tsx",
    "src/pages/areas/ContentPage.tsx"
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        
        # fix the specific regex messups
        content = content.replace('(visible) = title=""> {', '(visible) => {')
        content = content.replace('(v) = title=""> {', '(v) => {')
        content = content.replace('(v) = title="">{', '(v) => {')
        content = content.replace('(visible) = title="">', '(visible) =>')
        
        with open(filepath, 'w') as f:
            f.write(content)
