import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

content = open('src/App.jsx', encoding='utf-8').read()

old = '"cte","mdf","nf","mat","ro","ro_hora","cliente","sgs",'
new = '"cte","mdf","nf","mat","ro","ro_hora","ro_status","cliente","sgs",'

if old in content:
    content = content.replace(old, new, 1)
    open('src/App.jsx', 'w', encoding='utf-8').write(content)
    print('ro_status added to SUPA_KNOWN_COLS OK')
else:
    print('ERROR: pattern not found')
    # Show the actual line
    for i, l in enumerate(content.splitlines(), 1):
        if 'ro_hora' in l and 'SUPA' not in l:
            print(i, repr(l[:150]))
