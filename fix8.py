data = open('app/(dashboard)/admin/companions/[id]/page.tsx', encoding='utf-8').read()
idx = data.find('supabase\n')
print(repr(data[idx-10:idx+60]))
