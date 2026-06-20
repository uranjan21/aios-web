import glob
import re

files = glob.glob('src/components/areas/finance/*.tsx')

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    # find all <PascalCase tags
    tags = set(re.findall(r'<([A-Z][a-zA-Z0-9]+)', content))
    
    # Extract all imports
    imports = []
    for line in content.split('\n'):
        if line.startswith('import'):
            imports.append(line)
    imports_str = '\n'.join(imports)
    
    # Check if each tag is imported
    for tag in tags:
        # Ignore known local components or intrinsic HTML that starts with capital (rare)
        # Check if it's in the import block
        if tag not in imports_str:
            # Check if it's declared locally
            if not re.search(fr'\b(const|function|class)\s+{tag}\b', content):
                # Check if it's a member like Select.Option (captured as Option)
                if not re.search(fr'\.\s*{tag}\b', content):
                    print(f"{file}: Possible missing import for {tag}")

