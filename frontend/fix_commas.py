import os
import re

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
        
        # fix commas
        content = re.sub(r',\s*,', ',', content)
        content = re.sub(r'\{\s*,', '{', content)
        content = re.sub(r',\s*\}', '}', content)
        content = content.replace("Dialog, ,", "Dialog,")
        content = content.replace(", ,", ",")
        content = content.replace("{ ,", "{")
        content = content.replace(", }", "}")
        
        with open(filepath, 'w') as f:
            f.write(content)
