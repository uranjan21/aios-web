import glob
import re

files = glob.glob('src/components/areas/finance/*.tsx')

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    # find all <PascalCase tags
    tags = set(re.findall(r'<([A-Z][a-zA-Z0-9]+)', content))
    
    # Check if each tag is imported or defined in the file
    for tag in tags:
        # Check if it's imported
        if not re.search(fr'\b{tag}\b', content[:content.find('<')]):
            print(f"{file}: Missing import for {tag}?")

