import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

lines = open('src/views/OcorrenciasView.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if ('r.ro' in l or 'RO {' in l or '.ro' in l) and 'ro_status' not in l:
        for j in range(max(0,i-1), min(len(lines),i+4)):
            print(j+1, repr(lines[j][:140]))
        print('---')
