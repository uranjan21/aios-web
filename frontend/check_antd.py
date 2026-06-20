import glob
import re

files = glob.glob('src/components/areas/finance/*.tsx')
antd_components = ['Table', 'Card', 'Empty', 'Tooltip', 'Progress', 'Statistic', 'Badge', 'Tag', 'Row', 'Col', 'List', 'Steps', 'Segmented']

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    for comp in antd_components:
        # If it's used as a JSX tag
        if re.search(fr'<{comp}\b', content):
            # Check if it's imported
            if not re.search(fr'\b{comp}\b', content[:content.find('<')]):
                print(f"{file}: Missing import for {comp}")

