import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

content = open('src/modals/ModalEdit.jsx', encoding='utf-8').read()
lines = content.splitlines()

# Find all mentions of ro
for i, l in enumerate(lines, 1):
    if 'ro_hora' in l or ('"ro"' in l and 'k:' in l) or ("'ro'" in l and 'k:' in l):
        print(i, repr(l[:150]))

# Also look for select or opts patterns
print('\n--- select/opts patterns ---')
for i, l in enumerate(lines, 1):
    if 'select' in l.lower() or 'opts' in l:
        print(i, repr(l[:120]))
