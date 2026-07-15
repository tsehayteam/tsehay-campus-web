import re
with open('../courses.html', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'(?s)<div class="bg-dark rounded-3xl overflow-hidden.*?</div>\s*</div>\s*</div>', content)
if match:
    with open('card.txt', 'w', encoding='utf-8') as out:
        out.write(match.group(0))
else:
    print("Not found")
