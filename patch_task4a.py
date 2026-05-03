import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

content = open('src/App.jsx', encoding='utf-8').read()

old = 'useState({numero:"",valor:"",tipo:"avaria"})'
new = 'useState({numero:"",valor:"",tipo:"avaria",nfs:"",localizacao:""})'

if old in content:
    content = content.replace(old, new, 1)
    open('src/App.jsx', 'w', encoding='utf-8').write(content)
    print('nfdForm useState updated OK')
else:
    print('ERROR: pattern not found')
    idx = content.find('useState({numero:')
    if idx >= 0:
        print('Actual snippet:', repr(content[idx:idx+80]))
