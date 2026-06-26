lines = open('app/(dashboard)/admin/companions/[id]/page.tsx', encoding='utf-8').readlines()
# Find the first real import line
start = 0
for i, line in enumerate(lines):
    if line.strip().startswith('import type'):
        start = i
        break
data = ''.join(lines[start:])
open('app/(dashboard)/admin/companions/[id]/page.tsx', 'w', encoding='utf-8').write(data)
print('First line:', lines[start].strip())
