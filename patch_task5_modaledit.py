import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

content = open('src/modals/ModalEdit.jsx', encoding='utf-8').read()

old = '{k:"ro_hora",l:"Hora RO"},{k:"cliente"'
new = '{k:"ro_hora",l:"Hora RO"},{k:"ro_status",l:"Status RO",type:"select_opts",opts:["EM TRATATIVA","FINALIZADO"]},{k:"cliente"'

if old in content:
    if 'ro_status' not in content:
        content = content.replace(old, new, 1)
        open('src/modals/ModalEdit.jsx', 'w', encoding='utf-8').write(content)
        print('ro_status added to ModalEdit OK')
    else:
        print('ro_status already exists in ModalEdit')
else:
    print('ERROR: pattern not found')
    # Show what's around ro_hora
    idx = content.find('ro_hora')
    if idx >= 0:
        print('Actual snippet:', repr(content[idx-5:idx+80]))
