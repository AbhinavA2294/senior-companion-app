data = open('app/(dashboard)/admin/companions/[id]/page.tsx', encoding='utf-8').read()
# Remove the duplicate - keep only the first occurrence by replacing second with empty
first = data.find('const admin = createAdminClient();')
second = data.find('const admin = createAdminClient();', first + 1)
if second != -1:
    data = data[:second] + data[second:].replace('const admin = createAdminClient();\n', '', 1)
    print('Removed duplicate')
else:
    print('No duplicate found')
open('app/(dashboard)/admin/companions/[id]/page.tsx', 'w', encoding='utf-8').write(data)
print('count now:', data.count('const admin = createAdminClient();'))
