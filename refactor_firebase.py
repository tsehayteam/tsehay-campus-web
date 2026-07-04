import os
import re

html_files = ['index.html', 'dashboard.html', 'courses.html', 'admin.html']
base_dir = r"c:\Users\Envy\OneDrive\Documents\Tsehay Campus - ሙሉ የ Full-Stack ኢ-ለ"

# First, extract the block from index.html
with open(os.path.join(base_dir, 'index.html'), 'r', encoding='utf-8') as f:
    content = f.read()

# Find the block starting with <!-- Firebase Integration --> and ending with </script>
pattern = re.compile(r'<!-- Firebase Integration -->\s*<script type="module">(.*?)</script>', re.DOTALL)
match = pattern.search(content)

if match:
    script_content = match.group(1).strip()
    # Write to assets/js/firebase-auth.js
    os.makedirs(os.path.join(base_dir, 'assets', 'js'), exist_ok=True)
    with open(os.path.join(base_dir, 'assets', 'js', 'firebase-auth.js'), 'w', encoding='utf-8') as f:
        f.write(script_content)
    print("Successfully extracted firebase-auth.js")
    
    # Replace in all files
    replacement = '<!-- Firebase Integration -->\n    <script type="module" src="assets/js/firebase-auth.js"></script>'
    for file in html_files:
        filepath = os.path.join(base_dir, file)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                file_content = f.read()
            
            # Replace the block
            new_content = pattern.sub(replacement, file_content)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file}")
else:
    print("Could not find Firebase Integration block in index.html")
