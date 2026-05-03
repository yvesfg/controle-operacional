import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

content = open('src/views/OcorrenciasView.jsx', encoding='utf-8').read()

# Find the RO span and add ro_status badge after it
old = "{r.ro&&(<span style={{fontSize:10,fontFamily:\"'DM Mono',monospace\",background:\"rgba(249,115,22,.1)\",border:\"1px solid rgba(249,115,22,.3)\",borderRadius:5,padding:\"2px 8px\",color:\"#f97316\",fontWeight:700}}>RO {r.ro}</span>)}"
new_content = old + "\n          {r.ro_status&&<span style={{padding:'2px 6px',borderRadius:4,fontSize:9,fontWeight:700,\n            background:r.ro_status==='FINALIZADO'?'rgba(2,192,118,.1)':'rgba(240,185,11,.1)',\n            color:r.ro_status==='FINALIZADO'?'#02c076':'#f0b90b',\n            border:`1px solid ${r.ro_status==='FINALIZADO'?'rgba(2,192,118,.3)':'rgba(240,185,11,.3)'}`}}>\n            {r.ro_status}\n          </span>}"

if old in content:
    content = content.replace(old, new_content, 1)
    open('src/views/OcorrenciasView.jsx', 'w', encoding='utf-8').write(content)
    print('ro_status badge added to OcorrenciasView OK')
else:
    print('ERROR: RO span pattern not found')
    # Show actual content around r.ro
    idx = content.find('RO {r.ro}')
    if idx >= 0:
        print('Actual snippet:', repr(content[idx-200:idx+100]))
    else:
        print('Could not find "RO {r.ro}" either')
        idx2 = content.find('r.ro&&')
        if idx2 >= 0:
            print('Found r.ro&&:', repr(content[idx2:idx2+200]))
