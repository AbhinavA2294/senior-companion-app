data = open('app/(dashboard)/admin/companions/[id]/page.tsx', encoding='utf-8').read()
idx = data.find('supabase')
print(repr(data[idx-5:idx+50]))
