import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

content = open('src/modals/ModalDetalhe.jsx', encoding='utf-8').read()

# Add ro_status right after the RO entry in the data grid
old = '{l:"RO",v:r.ro},{l:"SGS"'
new = '{l:"RO",v:r.ro},{l:"Status RO",v:r.ro_status},{l:"SGS"'

if old in content:
    if 'ro_status' not in content:
        content = content.replace(old, new, 1)
        open('src/modals/ModalDetalhe.jsx', 'w', encoding='utf-8').write(content)
        print('ro_status added to ModalDetalhe data grid OK')
    else:
        print('ro_status already exists in ModalDetalhe')
else:
    print('ERROR: pattern not found')
    idx = content.find('"RO"')
    if idx >= 0:
        print('Actual snippet around RO:', repr(content[idx-5:idx+80]))
