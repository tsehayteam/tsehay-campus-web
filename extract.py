import re

with open('c:/Users/Envy/OneDrive/Documents/Tsehay Campus - ሙሉ የ Full-Stack ኢ-ለ/courses.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('courses-container')
if idx != -1:
    print(text[idx:idx+2500])
else:
    print("courses-container not found")
