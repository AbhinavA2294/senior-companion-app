lines = open('app/(dashboard)/admin/companions/[id]/page.tsx', encoding='utf-8').readlines()
end = len(lines)
for i, line in enumerate(lines):
    if line.strip() == "'@":
        end = i
        break
data = ''.join(lines[:end])
open('app/(dashboard)/admin/companions/[id]/page.tsx', 'w', encoding='utf-8').write(data)
print('Last line:', lines[end-1].strip())
