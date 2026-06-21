import os
import re
import sys

WORKSPACE_ROOT = "/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web"
EXCLUDE_DIRS = {".git", "node_modules", ".agents", ".deleted-graphify-out"}

# Regex patterns for links
# 1. Inline links: [text](path)
INLINE_LINK_RE = re.compile(r'\[([^\]]*)\]\(([^)]+)\)')
# 2. Reference links: [text]: path
REF_LINK_RE = re.compile(r'^\[([^\]]+)\]:\s*([^\s]+)', re.MULTILINE)

def find_markdown_files(root):
    md_files = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Exclude specific directories
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for f in filenames:
            if f.endswith('.md'):
                md_files.append(os.path.join(dirpath, f))
    return md_files

def is_external(path):
    return path.startswith(('http://', 'https://', 'mailto:', 'ftp://'))

def verify_links():
    md_files = find_markdown_files(WORKSPACE_ROOT)
    print(f"Found {len(md_files)} markdown files:")
    for f in md_files:
        print(f"  - {os.path.relpath(f, WORKSPACE_ROOT)}")
    
    broken_links = []
    total_links_checked = 0
    
    for file_path in md_files:
        rel_file_path = os.path.relpath(file_path, WORKSPACE_ROOT)
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Find all inline links
        inline_matches = INLINE_LINK_RE.findall(content)
        # Find all reference links
        ref_matches = REF_LINK_RE.findall(content)
        
        links = []
        for text, path in inline_matches:
            links.append((path.strip(), "inline"))
        for text, path in ref_matches:
            links.append((path.strip(), "reference"))
            
        for path, link_type in links:
            if is_external(path):
                continue
            
            # Strip anchors or query params
            clean_path = path.split('#')[0].split('?')[0]
            if not clean_path:
                # E.g. link is just "#section" -> links to the same file, which exists
                continue
                
            total_links_checked += 1
            
            # Resolve the target path
            if clean_path.startswith('/'):
                target_path = os.path.join(WORKSPACE_ROOT, clean_path.lstrip('/'))
            else:
                target_path = os.path.join(os.path.dirname(file_path), clean_path)
                
            exists = os.path.exists(target_path)
            
            if not exists:
                # Let's also check if it's relative to workspace root (sometimes developers omit the leading slash)
                root_relative_target = os.path.join(WORKSPACE_ROOT, clean_path)
                if os.path.exists(root_relative_target):
                    continue
                
                broken_links.append({
                    "file": rel_file_path,
                    "link": path,
                    "target_resolved": os.path.relpath(target_path, WORKSPACE_ROOT),
                    "type": link_type
                })
                
    print("\n--- LINK VERIFICATION RESULTS ---")
    print(f"Total links checked: {total_links_checked}")
    if broken_links:
        print(f"Found {len(broken_links)} broken links:")
        for bl in broken_links:
            print(f"  In {bl['file']}: '{bl['link']}' (resolved to: {bl['target_resolved']})")
        sys.exit(1)
    else:
        print("All local markdown links verified successfully! No broken links found.")
        sys.exit(0)

if __name__ == '__main__':
    verify_links()
