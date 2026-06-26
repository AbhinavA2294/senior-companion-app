import sys
data = open('app/(dashboard)/admin/companions/[id]/page.tsx', encoding='utf-8').read()
# Remove the PowerShell wrapper if present
if data.startswith("@'\r\n") or data.startswith("@'\n"):
    data = data.split('\n', 1)[1]
if data.startswith(" = @'"):
    lines = data.split('\n')
    data = '\n'.join(lines[1:])
open('app/(dashboard)/admin/companions/[id]/page.tsx', 'w', encoding='utf-8').write(data)
print('First line:', data.split('\n')[0])
