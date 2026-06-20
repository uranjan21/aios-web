import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Fix the import
    content = re.sub(r'import \{([^}]*)DialogContent([^}]*)\} from \'@ledgr/ui\'', r"import {\1\2} from '@ledgr/ui'", content)
    content = re.sub(r'import \{([^}]*)DialogHeader([^}]*)\} from \'@ledgr/ui\'', r"import {\1\2} from '@ledgr/ui'", content)
    content = re.sub(r'import \{([^}]*)DialogTitle([^}]*)\} from \'@ledgr/ui\'', r"import {\1\2} from '@ledgr/ui'", content)
    
    # clean up empty imports or double commas
    content = re.sub(r',\s*,', ',', content)
    content = re.sub(r'\{\s*,\s*', '{ ', content)
    content = re.sub(r'\s*,\s*\}', ' }', content)

    # 2. Fix the JSX
    # We want to replace:
    # <Dialog open={x} onOpenChange={y}>
    #   <DialogContent>
    #     <DialogHeader>
    #       <DialogTitle>Title text</DialogTitle>
    #     </DialogHeader>
    #     ...content...
    #   </DialogContent>
    # </Dialog>
    
    # This is tricky with regex, so let's do a simpler targeted replacement
    
    # Extract title
    def repl_dialog(m):
        dialog_props = m.group(1)
        inner = m.group(2)
        
        title_match = re.search(r'<DialogTitle>([^<]*)</DialogTitle>', inner)
        title = title_match.group(1) if title_match else ""
        
        # Remove DialogContent, Header, Title tags
        inner = re.sub(r'<DialogContent[^>]*>', '', inner)
        inner = re.sub(r'</DialogContent>', '', inner)
        inner = re.sub(r'<DialogHeader[^>]*>', '', inner)
        inner = re.sub(r'</DialogHeader>', '', inner)
        inner = re.sub(r'<DialogTitle[^>]*>.*?</DialogTitle>', '', inner, flags=re.DOTALL)
        
        new_dialog = f'<Dialog {dialog_props} title="{title}">{inner}</Dialog>'
        return new_dialog
        
    content = re.sub(r'<Dialog([^>]*)>(.*?)</Dialog>', repl_dialog, content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)

import glob

files = [
    "src/components/areas/health/HealthLogModal.tsx",
    "src/components/areas/business/BusinessLogModal.tsx",
    "src/components/areas/content/ContentCaptureModal.tsx",
    "src/components/areas/content/DraftModal.tsx",
    "src/components/areas/finance/TransactionsTab.tsx",
    "src/components/areas/finance/ImportCsvModal.tsx",
    "src/pages/areas/ContentPage.tsx"
]

for file in files:
    if os.path.exists(file):
        print(f"Fixing {file}")
        fix_file(file)

