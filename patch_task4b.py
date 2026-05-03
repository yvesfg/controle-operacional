import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

content = open('src/App.jsx', encoding='utf-8').read()

# The old tipo block (lines 5949-5960 from the inspection)
old = '''            {/* Tipo */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginBottom:6}}>Motivo</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {[["avaria","🔴"],["falta","🟡"],["devolução","🔵"],["sobra","🟢"]].map(([op,em])=>(
                  <button key={op} onClick={()=>setNfdForm(p=>({...p,tipo:op}))} style={{padding:"9px 4px",borderRadius:9,border:`1.5px solid ${nfdForm.tipo===op?t.danger:t.borda}`,background:nfdForm.tipo===op?`rgba(246,70,93,.1)`:`transparent`,color:nfdForm.tipo===op?t.danger:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:10,textTransform:"uppercase",letterSpacing:.5,transition:"all .15s"}}>
                    {em} {op}
                  </button>
                ))}
              </div>
              {nfdForm.tipo==="sobra"&&<div style={{fontSize:9,color:t.txt2,marginTop:6,background:t.bg,borderRadius:6,padding:"5px 9px",border:`1px solid ${t.borda}`,lineHeight:1.6}}>⚠️ Sobra: material recebido <strong style={{color:t.txt}}>sem documento</strong>. Nº é opcional — use fotos como comprovante.</div>}
            </div>'''

new = '''            {/* Tipo */}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:9,color:t.txt2,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Tipo</div>
              {(()=>{
                const TIPOS_NFD=[
                  {k:'avaria',l:'Avaria',cor:'#ff9800'},
                  {k:'falta',l:'Falta',cor:'#f6465d'},
                  {k:'dev_total',l:'Dev. Total',cor:'#9c27b0'},
                  {k:'dev_parcial',l:'Dev. Parcial',cor:'#e91e63'},
                  {k:'desacordo',l:'Desacordo',cor:'#f0b90b'},
                  {k:'rod',l:'ROD',cor:'#ef5350'},
                  {k:'sobra',l:'Sobra',cor:'#00e096'},
                ];
                const TIPOS_COM_NF_NFD=new Set(['falta','avaria','dev_total','dev_parcial','desacordo']);
                const nfListNFD=(formData?.nf||'').split(',').map(s=>s.trim()).filter(Boolean);
                return (<>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                    {TIPOS_NFD.map(tp=>{const ativo=nfdForm.tipo===tp.k;return(
                      <button key={tp.k} onClick={()=>setNfdForm(p=>({...p,tipo:tp.k}))}
                        style={{padding:'6px 4px',borderRadius:7,border:`1.5px solid ${ativo?tp.cor:t.borda}`,
                          background:ativo?`${tp.cor}22`:'transparent',color:ativo?tp.cor:t.txt2,
                          fontSize:10,fontWeight:ativo?700:400,cursor:'pointer',fontFamily:'inherit'}}>
                        {tp.l}
                      </button>
                    );})}
                  </div>
                  {TIPOS_COM_NF_NFD.has(nfdForm.tipo)&&nfListNFD.length>0&&(
                    <div style={{marginTop:8}}>
                      <div style={{fontSize:9,color:t.txt2,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>NFs Afetadas</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                        {nfListNFD.map(nf=>{
                          const cur=(nfdForm.nfs||'').split(',').map(s=>s.trim()).filter(Boolean);
                          const sel=cur.includes(nf);
                          return(<button key={nf} onClick={()=>{const next=sel?cur.filter(x=>x!==nf):[...cur,nf];setNfdForm(p=>({...p,nfs:next.join(', ')}));}}
                            style={{padding:'4px 10px',borderRadius:6,border:`1.5px solid ${sel?'#f0b90b':t.borda}`,
                              background:sel?'rgba(240,185,11,.1)':t.bg,color:sel?'#f0b90b':t.txt2,
                              fontSize:10,fontWeight:sel?700:400,cursor:'pointer'}}>
                            {nf}
                          </button>);
                        })}
                      </div>
                    </div>
                  )}
                  {nfdForm.tipo==='rod'&&(
                    <div style={{marginTop:8}}>
                      <label style={{fontSize:9,textTransform:'uppercase',letterSpacing:1.2,color:t.txt2,fontWeight:600,display:'block',marginBottom:4}}>Localização da Carga</label>
                      <input value={nfdForm.localizacao||''} onChange={e=>setNfdForm(p=>({...p,localizacao:e.target.value}))} placeholder='Ex: Em trânsito, SP – RJ km 210' style={css.inp}/>
                    </div>
                  )}
                </>);
              })()}
            </div>'''

if old in content:
    content = content.replace(old, new, 1)
    open('src/App.jsx', 'w', encoding='utf-8').write(content)
    print('NFD tipo block replaced OK')
else:
    print('ERROR: old block not found')
    # Show what's actually there
    idx = content.find('{/* Tipo */')
    if idx >= 0:
        print('Found Tipo comment at char', idx)
        print(repr(content[idx:idx+500]))
    else:
        print('No Tipo comment found either')
