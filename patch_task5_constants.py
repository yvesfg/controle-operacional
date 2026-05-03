import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

content = open('src/constants.js', encoding='utf-8').read()

# Show relevant lines
for i, l in enumerate(content.splitlines(), 1):
    if 'ro_hora' in l or 'ro"' in l or 'SUPA_KNOWN' in l:
        print(i, repr(l[:120]))
