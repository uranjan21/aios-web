import os
import re
import sys

# Paths to exclude
EXCLUDES = [
    'node_modules',
    '.git',
    '.agents',
    '.deleted-graphify-out'
]

# Regex patterns
# Match [text](url) - url can contain spaces or newlines sometimes, but usually is a standard string.
# We also exclude external links (http, https, mailto, etc.)
INLINE_LINK_RE = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
REF_LINK_RE = re.compile(r'^\[([^\]]+)\]:\s*(\S+)', re.MULTILINE)

def should_exclude(path):
    for exc in EXCLUDES:
        if exc in path.split(os.sep):
            return True
    return False

def find_md_files(root_dir):
    md_files = []
    for root, dirs, files in os.walk(root_dir):
        # Prune excluded directories in-place
        dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
        for file in files:
            if file.endswith('.md'):
                full_path = os.path.join(root, file)
                if not should_exclude(full_path):
                    md_files.append(full_path)
    return md_files

def check_link(file_path, link_target, root_dir):
    # Remove anchors
    if '#' in link_target:
        link_target = link_target.split('#')[0]
    
    # Ignore empty targets (e.g., just an anchor like #header)
    if not link_target.strip():
        return True, ""

    # Ignore external links
    if link_target.startswith(('http://', 'https://', 'mailto:', 'tel:', 'ftp:')):
        return True, ""

    # Decode URL-encoded characters (like %20 for space)
    from urllib.parse import unquote
    link_target = unquote(link_target)

    # Relative to file directory
    file_dir = os.path.dirname(file_path)
    
    # Resolve target path
    if link_target.startswith('/'):
        # Root-relative (relative to repo root or filesystem root?)
        # Let's check both
        target_path_repo = os.path.join(root_dir, link_target.lstrip('/'))
        target_path_fs = link_target
        exists = os.path.exists(target_path_repo) or os.path.exists(target_path_fs)
        resolved_path = target_path_repo if os.path.exists(target_path_repo) else target_path_fs
    else:
        resolved_path = os.path.normpath(os.path.join(file_dir, link_target))
        exists = os.path.exists(resolved_path)

    if not exists:
        return False, resolved_path
    return True, resolved_path

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    print(f"Searching for markdown files in: {root_dir}")
    md_files = find_md_files(root_dir)
    print(f"Found {len(md_files)} markdown files:")
    for f in md_files:
        print(f"  - {os.path.relpath(f, root_dir)}")
    
    broken_links_count = 0
    total_links_count = 0

    for file_path in md_files:
        rel_file = os.path.relpath(file_path, root_dir)
        print(f"\nChecking links in {rel_file}...")
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Find inline links
        inline_links = INLINE_LINK_RE.findall(content)
        # Find reference links
        ref_links = REF_LINK_RE.findall(content)
        
        all_targets = [target for _, target in inline_links] + [target for _, target in ref_links]
        
        for target in all_targets:
            total_links_count += 1
            is_valid, resolved = check_link(file_path, target, root_dir)
            if not is_valid:
                print(f"  [BROKEN] {target} -> Resolved to: {resolved}")
                broken_links_count += 1
            else:
                # Debug logging for valid local links
                if not target.startswith(('http', 'mailto', 'tel')):
                    print(f"  [OK] {target} -> {os.path.relpath(resolved, root_dir)}")

    print("\n" + "="*40)
    print(f"Summary:")
    print(f"Total links checked: {total_links_count}")
    print(f"Broken links found: {broken_links_count}")
    print("="*40)

    if broken_links_count > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
