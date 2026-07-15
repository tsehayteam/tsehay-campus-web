import re

with open('../dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# match <header> ... </header>
match = re.search(r'(?s)(<header.*?</header>)', content)
if match:
    with open('dashboard_header.txt', 'w', encoding='utf-8') as out:
        out.write(match.group(1))
    print("Extracted header.")
else:
    print("Header not found.")
