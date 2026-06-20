import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # fix specific regex messups from the previous script
    content = re.sub(r'\(isOpen\) = title="[^"]*"> !isOpen && onClose\(\)\}', r'(isOpen) => { if(!isOpen) onClose() }', content)
    content = re.sub(r'\(open\) = title="[^"]*"> !open && setOpen\(\w+\)\}', r'(open) => { if(!open) setOpen(false) }', content)
    content = re.sub(r'\(open\) = title="[^"]*"> !open && window\.open\([^)]*\)\}', r'(open) => { if(!open) window.open() }', content)
    
    # Catch any remaining `onOpenChange={(v) = title="..."> ...}`
    content = re.sub(r'onOpenChange=\{\(([^)]+)\) = title="([^"]*)">\s*([^<]+)\}', r'onOpenChange={(\1) => { \3 }} title="\2"', content)

    with open(filepath, 'w') as f:
        f.write(content)

import glob
for file in glob.glob("src/**/*.tsx", recursive=True):
    fix_file(file)

