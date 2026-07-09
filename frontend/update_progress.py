import datetime
import os

filepath = "../PROGRESS.md"
with open(filepath, "r") as f:
    content = f.read()

today = datetime.datetime.now().strftime("%Y-%m-%d")
entry = f"""## {today} — antigravity
- Shipped: Integrated AssistantChatInput into GlobalAssistant with fully custom styling and robust TypeScript parsing. Replaced original textarea logic with advanced model selection, attachments, drag-and-drop, and proper theming.
- Blockers: none
- Next: Deploy or test AI agent integration and the new chat interface extensively.
"""

lines = content.split('\n')
header_idx = -1
for i, line in enumerate(lines):
    if line.startswith("# "):
        header_idx = i
        break

if header_idx != -1:
    lines.insert(header_idx + 1, "\n" + entry)
else:
    lines.insert(0, entry + "\n")

with open(filepath, "w") as f:
    f.write('\n'.join(lines))
