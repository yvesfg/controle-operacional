import { clickable } from '../utils.js';
import { Button } from "../design-system/components/Button.jsx";
import Icon from '../components/Icon.jsx';

import ModalHeader from "../components/ModalHeader.jsx";
export default function ModalMotoristaImport({ ctx }) {
  const {
    motImportOpen, setMotImportOpen,
    motImportData, setMotImportData,
    motImportConfirm, setMotImportConfirm,
    motImportStep, setMotImportStep,
    motoristas, DADOS, dadosExtras, setDadosBase,
    saveMotoristasLS, registrarLog, showToast,
    t, css,
  } = ctx;

  if (!motImportOpen || !motImportData) return null;

  const {novos, conflitos, vinculos=[]} = motImportData;
  const totalOps = novos.length + conflitos.length;
  const needsConfirm = totalOps >= 5;
  const confirmOk = !needsConfirm || motImportConfirm.trim() === "ESTOU DE ACORDO";
  const inpS = {...css.inp, fontSize:11, padding:"6px 9px"};
  const lblS = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:2};

  const aplicar = () => {
    if (!confirmOk) { showToast("Digite ESTOU DE ACORDO para confirmar","warn"); return; }
    const updated = [...motoristas];
    novos.forEach(n => { if (!updated.find(m=>m.nome===n.nome)) updated.push(n); });
    conflitos.forEach(c => {
      if (c.escolha === "usar") {
        const idx = updated.findIndex(m =>
          (c.atual.cpf && m.cpf && m.cpf.replace(/\D/g,"")===c.atual.cpf.replace(/\D/g,"")) ||
          (c.atual.placa1 && m.placa1 && m.placa1.toUpperCase()===c.atual.placa1.toUpperCase()) ||
          m.nome === c.atual.nome
        );
        if (idx >= 0) updated[idx] = {...updated[idx], ...c.imp};
      }
    });
    saveMotoristasLS(updated);
    registrarLog("IMPORTAR_CONTATOS", `${novos.length} novos + ${conflitos.filter(c=>c.escolha==="usar").length} atualizados`);
    showToast(`${novos.length} novos importados, ${conflitos.filter(c=>c.escolha==="usar").length} atualizados`, "ok");
    if(vinculos.length>0){
      setMotImportStep(2);
    } else {
      setMotImportOpen(false);
      setMotImportData(null);
      setMotImportConfirm("");
    }
  };

  const aplicarVinculos = () => {
    const aceitos = vinculos.filter(v=>v.aceito===true);
    if(!aceitos.length){ setMotImportOpen(false); setMotImportData(null); return; }
    const novosD = DADOS.map(reg=>{
      const match = aceitos.find(v=>v.reg.dt===reg.dt&&v.placa===(reg.placa||"").toUpperCase().replace(/[^A-Z0-9]/g,""));
      if(!match)return reg;
      return {...reg, nome:match.contato.nome, cpf:match.contato.cpf||reg.cpf||""};
    });
    setDadosBase(novosD.filter(r=>!dadosExtras.find(e=>e.dt===r.dt)));
    registrarLog("VINCULAR_CONTATOS", `${aceitos.length} DT(s) vinculadas via placa`);
    showToast(`${aceitos.length} DT${aceitos.length>1?"s":""} vinculada${aceitos.length>1?"s":""}`, "ok");
    setMotImportOpen(false);
    setMotImportData(null);
    setMotImportConfirm("");
  };

  return (
    <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setMotImportOpen(false)}>
      <div style={{...css.modal}}>
        {/* Header */}
        <ModalHeader tom="azul" icone="users"
          titulo={motImportStep===1?"IMPORTAR CONTATOS":"SUGESTÕES DE VÍNCULO"}
          sub={motImportStep===1
            ? `${novos.length} novos · ${conflitos.length} conflito${conflitos.length!==1?"s":""}`
            : `${vinculos.length} DT${vinculos.length!==1?"s":""} com placa correspondente`}
          onFechar={()=>setMotImportOpen(false)} />

        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:12,maxHeight:"calc(96vh - 120px)"}}>

          {/* ══ ETAPA 2: SUGESTÕES DE VÍNCULO ══ */}
          {motImportStep===2 && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{background:`rgba(22,119,255,.06)`,border:`1px solid rgba(22,119,255,.2)`,borderRadius:10,padding:"10px 12px",fontSize:10,color:t.azulLt,lineHeight:1.5,display:"flex",alignItems:"flex-start",gap:6}}>
                <Icon n="link" s={13} c={t.azulLt} style={{marginTop:1}}/><span>Encontramos placas dos contatos importados em DTs do sistema. Aceite para preencher o nome do motorista automaticamente.</span>
              </div>
              {vinculos.map((v,vi)=>(
                <div key={vi} style={{background:t.card,borderRadius:10,border:`1px solid ${v.aceito===true?t.verde:v.aceito===false?`rgba(128,128,128,.3)`:t.azulLt}`,padding:"10px 12px",opacity:v.aceito===false?.5:1,transition:"all .18s"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:700,color:t.txt,marginBottom:3}}>{v.contato.nome}</div>
                      <div style={{fontSize:9,color:t.txt2,display:"flex",gap:8,flexWrap:"wrap"}}>
                        {v.contato.tel&&<span style={{display:"inline-flex",alignItems:"center",gap:3}}><Icon n="phone" s={10} c={t.txt2}/> {v.contato.tel}</span>}
                        <span style={{background:`rgba(217,98,43,.1)`,border:`1px solid rgba(217,98,43,.25)`,borderRadius:4,padding:"1px 6px",color:t.ouro,fontWeight:700,display:"inline-flex",alignItems:"center",gap:3}}><Icon n="truck" s={10} c={t.ouro}/> {v.placa}</span>
                      </div>
                      <div style={{fontSize:9,color:t.txt2,marginTop:5,paddingTop:5,borderTop:`1px solid ${t.borda}`}}>
                        <span style={{color:t.azulLt,fontWeight:700}}>DT {v.reg.dt}</span>
                        {" · "}{v.reg.origem||"?"} <Icon n="arrow-right" s={13} /> {v.reg.destino||"?"}
                        {v.reg.nome&&<span style={{color:t.txt2}}> · atual: <em>{v.reg.nome}</em></span>}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                      <Button variant="success-outline" size="sm" onClick={()=>{const nv=[...vinculos];nv[vi]={...nv[vi],aceito:true};setMotImportData({...motImportData,vinculos:nv});}}><Icon n="check" s={11} c={t.verde} sw={2.2}/> Vincular</Button>
                      <Button variant="secondary" size="sm" onClick={()=>{const nv=[...vinculos];nv[vi]={...nv[vi],aceito:false};setMotImportData({...motImportData,vinculos:nv});}}><Icon n="x" s={11} c={t.txt2} sw={2.2}/> Pular</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* NOVOS */}
          {motImportStep===1 && novos.length > 0 && (
            <div>
              <div style={{fontSize:10,fontWeight:700,color:t.verde,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="check-circle" s={12} c={t.verde}/> {novos.length} novo{novos.length!==1?"s":""} a adicionar</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {novos.map((n,i)=>(
                  <div key={i} style={{background:t.card2,borderRadius:8,padding:"7px 10px",border:`1px solid ${t.verde}`,fontSize:10,color:t.txt}}>
                    <strong>{n.nome}</strong>
                    {n.tel && <span style={{color:t.txt2,marginLeft:8,display:"inline-flex",alignItems:"center",gap:3}}><Icon n="phone" s={10} c={t.txt2}/> {n.tel}</span>}
                    {n.placa1 && <span style={{color:t.ouro,marginLeft:8,display:"inline-flex",alignItems:"center",gap:3}}><Icon n="truck" s={10} c={t.ouro}/> {n.placa1}</span>}
                    {n.cpf && <span style={{color:t.txt2,marginLeft:8,display:"inline-flex",alignItems:"center",gap:3}}><Icon n="id" s={10} c={t.txt2}/> {n.cpf}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONFLITOS */}
          {motImportStep===1 && conflitos.length > 0 && (
            <div>
              <div style={{fontSize:10,fontWeight:700,color:t.warn,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="alert" s={12} c={t.warn}/> {conflitos.length} conflito{conflitos.length!==1?"s":""} — escolha o que manter</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {conflitos.map((c,ci)=>(
                  <div key={ci} style={{background:t.card,borderRadius:10,border:`1px solid ${t.borda}`,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${t.borda}`}}>
                      <div style={{padding:"6px 10px",background:c.escolha==="manter"?`rgba(2,192,118,.08)`:t.card2,borderRight:`1px solid ${t.borda}`,cursor:"pointer",transition:"background .2s"}} {...clickable(()=>{
                        const nc=[...conflitos]; nc[ci]={...nc[ci],escolha:"manter"}; setMotImportData({novos,conflitos:nc});
                      })}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                          <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${c.escolha==="manter"?t.verde:t.borda}`,background:c.escolha==="manter"?t.verde:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {c.escolha==="manter" && <div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}} />}
                          </div>
                          <span style={{fontSize:9,fontWeight:700,color:c.escolha==="manter"?t.verde:t.txt2,textTransform:"uppercase",letterSpacing:.8}}>Manter atual</span>
                        </div>
                        {[{l:"Nome",v:c.atual.nome},{l:"Tel",v:c.atual.tel},{l:"Placa",v:c.atual.placa1},{l:"CPF",v:c.atual.cpf}].filter(f=>f.v).map(f=>(
                          <div key={f.l} style={{fontSize:9,color:t.txt2}}>{f.l}: <strong style={{color:t.txt}}>{f.v}</strong></div>
                        ))}
                      </div>
                      <div style={{padding:"6px 10px",background:c.escolha==="usar"?`rgba(22,119,255,.08)`:t.card2,cursor:"pointer",transition:"background .2s"}} {...clickable(()=>{
                        const nc=[...conflitos]; nc[ci]={...nc[ci],escolha:"usar"}; setMotImportData({novos,conflitos:nc});
                      })}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                          <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${c.escolha==="usar"?t.azulLt:t.borda}`,background:c.escolha==="usar"?t.azulLt:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {c.escolha==="usar" && <div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}} />}
                          </div>
                          <span style={{fontSize:9,fontWeight:700,color:c.escolha==="usar"?t.azulLt:t.txt2,textTransform:"uppercase",letterSpacing:.8}}>Usar importado</span>
                        </div>
                        {[{l:"Nome",v:c.imp.nome},{l:"Tel",v:c.imp.tel},{l:"Placa",v:c.imp.placa1},{l:"CPF",v:c.imp.cpf}].filter(f=>f.v).map(f=>(
                          <div key={f.l} style={{fontSize:9,color:t.txt2}}>{f.l}: <strong style={{color:t.azulLt}}>{f.v}</strong></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmação para operações grandes */}
          {motImportStep===1 && needsConfirm && (
            <div style={{background:`rgba(217,98,43,.07)`,border:`1px solid rgba(217,98,43,.2)`,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,fontWeight:700,color:t.warn,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="lock" s={12} c={t.warn}/> Operação com {totalOps} contato{totalOps!==1?"s":""} — confirmação obrigatória</div>
              <div style={{marginBottom:6}}>
                <label style={lblS}>Digite <strong style={{color:t.ouro}}>ESTOU DE ACORDO</strong> para prosseguir</label>
                <input value={motImportConfirm} onChange={e=>setMotImportConfirm(e.target.value)} placeholder="ESTOU DE ACORDO" style={{...inpS,width:"100%",boxSizing:"border-box",border:`1.5px solid ${confirmOk?t.verde:t.borda}`,color:confirmOk?t.verde:t.txt}} />
              </div>
              {confirmOk && <div style={{fontSize:9,color:t.verde,display:"flex",alignItems:"center",gap:4}}><Icon n="check-circle" s={11} c={t.verde}/> Confirmado</div>}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8,flexShrink:0}}>
          <Button variant="secondary" size="md" onClick={()=>{setMotImportOpen(false);setMotImportData(null);setMotImportConfirm("");}} style={{ flex: "0 0 auto" }}>CANCELAR</Button>
          {motImportStep===1 ? (
            <Button variant={confirmOk ? "info-outline" : "secondary"} size="sm" onClick={aplicar} disabled={!confirmOk} style={{ flex: 1 }}>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}><Icon n="download" s={14} c="currentColor"/> IMPORTAR ({novos.length} novos + {conflitos.filter(c=>c.escolha==="usar").length} atualizações)</span>
              {vinculos.length>0&&<span style={{fontSize:10,opacity:.7,marginLeft:6}}><Icon n="arrow-right" s={13} /> depois {vinculos.length} sugestão{vinculos.length>1?"ões":""}</span>}
            </Button>
          ) : (
            <Button variant="success-outline" size="sm" onClick={aplicarVinculos} style={{ flex: 1 }}>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}><Icon n="link" s={14} c="currentColor"/> CONFIRMAR {vinculos.filter(v=>v.aceito===true).length} VÍNCULO{vinculos.filter(v=>v.aceito===true).length!==1?"S":""}</span>
              {vinculos.some(v=>v.aceito===null)&&<span style={{fontSize:10,opacity:.7,marginLeft:6}}>(pular restantes)</span>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
