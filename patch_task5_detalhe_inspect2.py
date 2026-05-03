import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

lines = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').readlines()

# Show all lines with r.ro
for i, l in enumerate(lines, 1):
    if 'r.ro' in l:
        print(i, repr(l[:150]))

# Also show line 144-160 context
print('\n--- lines 140-165 ---')
for j in range(139, min(len(lines), 166)):
    print(j+1, '|', lines[j], end='')
