import re
with open('../dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'(?s)<div id="course-view".*?<div id="my-courses-view"', content)
if match:
    with open('extracted.html', 'w', encoding='utf-8') as out:
        out.write(match.group(0))
else:
    print("Not found")
