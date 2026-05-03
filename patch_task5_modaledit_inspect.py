import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

lines = open('src/modals/ModalEdit.jsx', encoding='utf-8').readlines()
for i, l in enumerate(lines, 1):
    if 'ro_hora' in l or 'ro"' in l or 'Documentacao' in l or 'documentacao' in l.lower() or ('RO' in l and ('label' in l.lower() or 'field' in l.lower() or 'campo' in l.lower())):
        print(i, repr(l[:120]))
