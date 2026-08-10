import ast
import os
import sys

def check_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'select(' in line and ('.execute(' in line or 'db.execute(' in line or 'db.exec(' in line):
            # basic heuristic check
            if 'user_id' not in line and 'current_user' not in line:
                block = " ".join(lines[i:min(i+4, len(lines))])
                if 'user_id' not in block and 'current_user' not in block:
                    print(f"{path}:{i+1} -> {line.strip()}")

for root, _, files in os.walk("/Users/utsavranjan/Projects - Agentic AI/Project - Control Tower/backend/app/api"):
    for file in files:
        if file.endswith(".py"):
            check_file(os.path.join(root, file))
