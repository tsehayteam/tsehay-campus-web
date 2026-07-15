import re
with open('c:/Users/Envy/OneDrive/Documents/Tsehay Campus - ሙሉ የ Full-Stack ኢ-ለ/courses.html', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.finditer(r'<div[^>]*class=[\'\"][^\'\"]*bg-white[^\'\"]*[\'\"][^>]*>[\s\S]{100,3000}</div>', text)
for i, match in enumerate(matches):
    if 'Birr' in match.group() or 'ኮርስ' in match.group() or 'course' in match.group().lower():
        with open('extracted_card.html', 'w', encoding='utf-8') as out:
            out.write(match.group()[:3000])
        print('Wrote to extracted_card.html')
        break
