import React from "react";
import Toggle from "../components/Toggle.jsx";
import AlterarSenhaAdmin from '../components/AlterarSenhaAdmin.jsx';
import { TABLE_USUARIOS, PERMS_PADRAO, BASES as BASES_CONST } from '../constants.js';
import { saveJSON, loadJSON } from '../utils.js';

export default function AdminView({ ctx }) {
  const {
    activeTab, isAdmin,
    DADOS, motoristas,
    t, css, DESIGN,
    hIco,
    perfil,
    showToast, registrarLog,
    usuarios, setUsuarios,
    usuariosPendentes, setUsuariosPendentes,
    aprovarModal, setAprovarModal,
    aprovarPerfil, setAprovarPerfil,
    carregarPendentes,
    adminEmailVal, setAdminEmailVal,
    syncStatus, syncStatusLoading, setSyncStatus, setSyncStatusLoading,
    ultimaSync,
    sincronizar,
    conexoes, conexoesOpen, setConexoesOpen, saveConexoesLS,
    getConfigRemoto, setConfigRemoto,
    emailTemplate, emailTemplateOpen, setEmailTemplate, setEmailTemplateOpen,
    gsheetsOpen, setGsheetsOpen,
    oauthAccessOpen, setOauthAccessOpen,
    logsOpen, setLogsOpen, logsData, logsSubTab, setLogsSubTab, carregarLogs,
    contatosAdminOpen, setContatosAdminOpen,
    auditReport, auditarDesign,
    setModalOpen,
    getConexao, supaFetch,
    saveMotoristasLS,
    setMotImportPrefOpen, setMotImportPrefBusca, setMotImportPrefSel, setMotImportRaw,
    enviarEmailBoasVindas,
    connStatus,
  } = ctx;

  if (activeTab !== "admin" || !isAdmin) return null;
  return (
          <div>
            <div style={css.secTitle} className="sec-divider">{hIco(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,t.ouro,12)} Banco de Dados</div>            <div style={{...css.card,marginBottom:16}}>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${t.borda}`}}>
                <div style={{width:24,height:24,background:t.azul,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,t.azulLt,12)}</div>
                <div><div style={{fontSize:12,fontWeight:600,color:t.txt}}>Supabase PostgreSQL</div><div style={{fontSize:9,color:t.txt2}}>{ultimaSync?`Sync: ${ultimaSync}`:"Nunca sincronizado"}</div></div>
                <span style={{marginLeft:"auto",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:DESIGN.r.badge,...(connStatus==="online"?{background:`rgba(2,192,118,.08)`,color:t.verde,border:`1px solid rgba(2,192,118,.2)`}:{background:`rgba(246,70,93,.06)`,color:t.danger,border:`1px solid rgba(246,70,93,.15)`})}}>{connStatus==="online"?"ONLINE":"OFFLINE"}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:t.borda}}>
                <button onClick={sincronizar} style={{background:t.card,border:"none",padding:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:DESIGN.fnt.b}}>{hIco(<><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></>,t.azulLt,20)}<span style={{fontSize:9,color:t.txt2,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>Sincronizar</span></button>
                <button onClick={()=>setModalOpen("configdb")} style={{background:t.card,border:"none",padding:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:DESIGN.fnt.b}}>{hIco(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,t.txt2,20)}<span style={{fontSize:9,color:t.txt2,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>Config DB</span></button>
              </div>
            </div>

            {/* Gestão de usuários migrada para o Hub (Gerenciar acessos) */}
            <div style={{...css.card,marginBottom:12,padding:"14px",fontSize:11,color:t.txt2,lineHeight:1.6,display:"flex",gap:10,alignItems:"flex-start"}}>
              {hIco(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,t.ouro,16)}
              <span>A gestão de <b style={{color:t.ouro}}>usuários, perfis e permissões</b> agora fica no <b style={{color:t.ouro}}>Hub → Gerenciar acessos</b>. Saia para o Hub para liberar módulos, definir perfil/bases e permissões finas.</span>
            </div>

            {/* Conexões Supabase — colapsável */}
            <div style={{...css.secTitle,margin:"20px 0 2px",padding:"16px 0",cursor:"pointer",userSelect:"none"}} onClick={()=>setConexoesOpen(!conexoesOpen)}>
              {hIco(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,t.ouro,12)} Conexões Supabase <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{conexoesOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {conexoesOpen && (
              <div style={{marginBottom:16}}>
                {conexoes.map((c,i) => (
                  <div key={i} style={{background:t.card,borderRadius:10,border:`1px solid ${t.borda}`,padding:10,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                    {hIco(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,t.txt2,14)}
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name||c.url}</div></div>
                    <button onClick={()=>{const nc=[...conexoes];nc.splice(i,1);saveConexoesLS(nc);showToast("Removido");}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:DESIGN.r.badge,padding:"4px 8px",cursor:"pointer",fontSize:10,color:t.danger,fontFamily:DESIGN.fnt.b}}>✕</button>
                  </div>
                ))}
                <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
                  <input id="newSupaUrl" placeholder="https://xxx.supabase.co" style={css.inp} />
                  <input id="newSupaKey" placeholder="anon key" style={css.inp} />
                  <input id="newSupaName" placeholder="Nome da conexão" style={css.inp} />
                  <button onClick={()=>{
                    const url = document.getElementById("newSupaUrl").value.trim();
                    const key = document.getElementById("newSupaKey").value.trim();
                    const name = document.getElementById("newSupaName").value.trim() || "Conexão";
                    if (!url || !key) { showToast("⚠️ URL e Key obrigatórios","warn"); return; }
                    const nc = [...conexoes, {url,key,name}];
                    saveConexoesLS(nc);
                    saveJSON("co_conexao_ativa", nc.length-1);
                    showToast("✅ Conexão adicionada!","ok");
                  }} style={{...css.btnGreen,justifyContent:"center"}}>🗄️ CONECTAR</button>
                </div>
              </div>
            )}

            {/* Google Sheets */}
            <div style={{...css.secTitle,margin:"24px 0 2px",padding:"16px 0",cursor:"pointer",userSelect:"none"}} onClick={async()=>{
              const next=!gsheetsOpen; setGsheetsOpen(next);
              if(next&&!syncStatus){
                setSyncStatusLoading(true);
                const _syncKey = `gsheet_sync_status_${ctx.baseAtual?.id || "imperatriz_belem"}`;
                const v=await getConfigRemoto(_syncKey);
                setSyncStatus(v?JSON.parse(v):null);
                setSyncStatusLoading(false);
              }
            }}>
              {hIco(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,t.verde,12)} Sincronização Google Sheets <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{gsheetsOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {gsheetsOpen && (
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>

                {/* ── PAINEL DE STATUS DA ÚLTIMA SINCRONIZAÇÃO ── */}
                <div style={{...css.card,padding:12,border:`1px solid ${syncStatus?(syncStatus.ok?t.verde:(syncStatus.erros_http>0?t.danger:t.ouro)):t.borda}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:t.txt}}>📡 Última Sincronização</div>
                    <button onClick={async()=>{setSyncStatusLoading(true);const v=await getConfigRemoto(`gsheet_sync_status_${ctx.baseAtual?.id || "imperatriz_belem"}`);setSyncStatus(v?JSON.parse(v):null);setSyncStatusLoading(false);}} style={{...css.hBtn,fontSize:10,padding:"3px 8px",marginLeft:"auto"}}>{syncStatusLoading?"⏳":"↺ Atualizar"}</button>
                  </div>
                  {syncStatusLoading && <div style={{fontSize:10,color:t.txt2}}>Buscando status...</div>}
                  {!syncStatusLoading && !syncStatus && (
                    <div style={{fontSize:10,color:t.txt2}}>⚠️ Nenhum status encontrado — o script ainda não rodou ou não está gravando no Supabase.</div>
                  )}
                  {!syncStatusLoading && syncStatus && (
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{...css.badge(syncStatus.ok?t.verde:t.danger,syncStatus.ok?`rgba(2,192,118,.1)`:`rgba(246,70,93,.1)`,syncStatus.ok?`rgba(2,192,118,.3)`:`rgba(246,70,93,.3)`)}}>{syncStatus.ok?"✅ OK":"❌ COM ERROS"}</span>
                        <span style={{fontSize:10,color:t.txt2}}>🕐 {syncStatus.timestamp}</span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                        <div style={{background:t.card2,borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                          <div style={{fontSize:16,fontWeight:700,color:t.azulLt}}>{syncStatus.total_planilha||0}</div>
                          <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:1}}>Linhas na planilha</div>
                        </div>
                        <div style={{background:t.card2,borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                          <div style={{fontSize:16,fontWeight:700,color:t.verde}}>{syncStatus.sincronizados||0}</div>
                          <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:1}}>Sincronizados</div>
                        </div>
                        <div style={{background:t.card2,borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                          <div style={{fontSize:16,fontWeight:700,color:syncStatus.ignorados>0?t.ouro:t.txt2}}>{syncStatus.ignorados||0}</div>
                          <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:1}}>Ignorados</div>
                        </div>
                      </div>
                      {syncStatus.motivos_ignorados?.length>0&&(
                        <div style={{background:`rgba(217,98,43,.06)`,border:`1px solid rgba(217,98,43,.2)`,borderRadius:7,padding:"8px 10px"}}>
                          <div style={{fontSize:9,fontWeight:700,color:t.ouro,marginBottom:4}}>⚠️ Linhas ignoradas (sem DT preenchida):</div>
                          {syncStatus.motivos_ignorados.map((m,i)=><div key={i} style={{fontSize:9,color:t.txt2,lineHeight:1.6}}>• {m}</div>)}
                        </div>
                      )}
                      {syncStatus.info?.length>0&&(
                        <div style={{background:`rgba(59,130,246,.06)`,border:`1px solid rgba(59,130,246,.2)`,borderRadius:7,padding:"8px 10px"}}>
                          <div style={{fontSize:9,fontWeight:700,color:t.azulLt,marginBottom:4}}>📋 Abas processadas:</div>
                          {syncStatus.info.map((m,i)=><div key={i} style={{fontSize:9,color:t.txt2,lineHeight:1.6}}>• {m}</div>)}
                        </div>
                      )}
                      {syncStatus.erros_detalhes?.length>0&&(
                        <div style={{background:`rgba(246,70,93,.06)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:7,padding:"8px 10px"}}>
                          <div style={{fontSize:9,fontWeight:700,color:t.danger,marginBottom:4}}>❌ Erros de envio:</div>
                          {syncStatus.erros_detalhes.map((e,i)=><div key={i} style={{fontSize:9,color:t.txt2,lineHeight:1.6}}>• {e}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── SCRIPT APPS SCRIPT v2 ── */}
                <div style={{...css.card,padding:12,background:t.card2}}>
                  <div style={{fontSize:11,fontWeight:700,color:t.txt,marginBottom:4}}>📋 Apps Script v2 — Cole na planilha</div>
                  <div style={{fontSize:10,color:t.txt2,lineHeight:1.6,marginBottom:8}}>
                    <strong style={{color:t.ouro}}>Planilha → Extensões → Apps Script</strong> → cole o código abaixo → salve → rode <code style={{background:t.bg,padding:"1px 5px",borderRadius:4,color:t.verde}}>configurarGatilho()</code> <strong>UMA VEZ</strong> para ativar o sync automático de 15 em 15 min.
                  </div>
                  <div style={{background:t.bg,borderRadius:8,padding:10,border:`1px solid ${t.borda}`,overflowX:"auto",maxHeight:260,overflowY:"auto"}}>
                    <pre style={{fontSize:8.5,color:t.verde,margin:0,whiteSpace:"pre",lineHeight:1.55}}>{`// ═══════════════════════════════════════════════════════
// CTRL OPERACIONAL — Apps Script v2
// 1) Cole aqui  2) Preencha SUPA_URL e SUPA_KEY
// 3) Rode configurarGatilho() UMA VEZ → sync automático
// ═══════════════════════════════════════════════════════

var SUPA_URL = 'SUA_URL_SUPABASE';  // https://xxx.supabase.co
var SUPA_KEY = 'SUA_ANON_KEY';
var TABELA   = 'controle_operacional';
var TAB_CFG  = 'co_config';

// ── Função principal (chamada automaticamente a cada 15min) ──
function sincronizarComSupabase() {
  var inicio = new Date();
  var status = {
    timestamp: Utilities.formatDate(inicio,'America/Sao_Paulo','dd/MM/yyyy HH:mm:ss'),
    total_planilha:0, sincronizados:0, ignorados:0, erros_http:0,
    motivos_ignorados:[], erros_detalhes:[], ok:false
  };
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var dados = sheet.getDataRange().getValues();
    var header = dados[0];
    var mapa = {};
    header.forEach(function(col,i){
      var c=mapearColuna(col.toString().toLowerCase().trim());
      if(c) mapa[i]=c;
    });
    var temColDT = Object.values(mapa).indexOf('dt')>=0;
    if(!temColDT){
      status.erros_detalhes.push('CRÍTICO: coluna DT/Espelho não encontrada. Cabeçalhos: '+header.slice(0,8).join(', '));
      return gravarStatus(status);
    }
    status.total_planilha = dados.length-1;
    var registros = [];
    for(var r=1;r<dados.length;r++){
      var reg={}; var temDT=false; var linhaVazia=true;
      Object.keys(mapa).forEach(function(i){
        var v=dados[r][i];
        if(v instanceof Date) v=Utilities.formatDate(v,'America/Sao_Paulo','dd/MM/yyyy');
        var vs=v?v.toString().trim():'';
        reg[mapa[i]]=vs;
        if(vs) linhaVazia=false;
        if(mapa[i]==='dt'&&vs) temDT=true;
      });
      if(linhaVazia) continue;
      if(!temDT){
        status.ignorados++;
        if(status.motivos_ignorados.length<20)
          status.motivos_ignorados.push('Linha '+(r+1)+': DT/Espelho vazio');
        continue;
      }
      registros.push(reg);
    }
    // Envia em lotes de 50
    for(var i=0;i<registros.length;i+=50){
      try {
        var resp=UrlFetchApp.fetch(SUPA_URL+'/rest/v1/'+TABELA+'?on_conflict=dt',{
          method:'POST',
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,
            'Content-Type':'application/json',
            Prefer:'return=minimal,resolution=merge-duplicates'},
          payload:JSON.stringify(registros.slice(i,i+50)),
          muteHttpExceptions:true
        });
        var code=resp.getResponseCode();
        if(code>=200&&code<300){ status.sincronizados+=Math.min(50,registros.length-i); }
        else {
          status.erros_http++;
          var msg='Lote '+(Math.floor(i/50)+1)+': HTTP '+code;
          try{var b=JSON.parse(resp.getContentText());if(b.message)msg+=' — '+b.message;}catch(e){}
          if(status.erros_detalhes.length<10) status.erros_detalhes.push(msg);
        }
      } catch(he){
        status.erros_http++;
        if(status.erros_detalhes.length<10) status.erros_detalhes.push('Lote '+(Math.floor(i/50)+1)+': '+he.message);
      }
    }
    status.ok = status.erros_http===0;
  } catch(e) {
    status.erros_detalhes.push('ERRO GERAL: '+e.message);
    status.ok=false;
  }
  gravarStatus(status);
  Logger.log(JSON.stringify(status,null,2));
}

// ── Grava status no Supabase para o app ler ──────────────────
function gravarStatus(status){
  try{
    UrlFetchApp.fetch(SUPA_URL+'/rest/v1/'+TAB_CFG+'?on_conflict=chave',{
      method:'POST',
      headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,
        'Content-Type':'application/json',
        Prefer:'return=minimal,resolution=merge-duplicates'},
      payload:JSON.stringify([{chave:'gsheet_sync_status',
        valor:JSON.stringify(status),updated_at:new Date().toISOString()}]),
      muteHttpExceptions:true
    });
  }catch(e){Logger.log('Erro ao gravar status: '+e.message);}
}

// ── Rodar UMA VEZ para ativar sync automático ────────────────
function configurarGatilho(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==='sincronizarComSupabase') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizarComSupabase').timeBased().everyMinutes(15).create();
  Logger.log('✅ Gatilho de 15 min criado! Rodando sincronização agora...');
  sincronizarComSupabase();
}

// ── Mapeamento de colunas da planilha ────────────────────────
function mapearColuna(n){
  var m={
    'dt espelho':'dt','espelho':'dt','dt':'dt',
    // Motorista / nome (aceita variações)
    'nome':'nome','motorista':'nome','nome motorista':'nome','nome do motorista':'nome',
    'cpf':'cpf','placa':'placa','vinculo':'vinculo','status':'status',
    // Origem / Destino (aceita "- CIDADE/UF" e variações)
    'origem':'origem','origem - cidade/uf':'origem','origem cidade/uf':'origem','origem/uf':'origem','origem cidade':'origem',
    'destino':'destino','destino - cidade/uf':'destino','destino cidade/uf':'destino','destino/uf':'destino','destino cidade':'destino',
    'data carr.':'data_carr','data carregamento':'data_carr','data_carr':'data_carr',
    'data agenda':'data_agenda','data_agenda':'data_agenda','agenda':'data_agenda',
    'data desc.':'data_desc','data descarga':'data_desc','data_desc':'data_desc',
    // Valores (aceita "VALOR DO CTE", "VL CTE", etc.)
    'vl cte':'vl_cte','valor cte':'vl_cte','vl_cte':'vl_cte','valor do cte':'vl_cte',
    'vl contrato':'vl_contrato','vl_contrato':'vl_contrato','valor contrato':'vl_contrato','valor do contrato':'vl_contrato',
    'adiant':'adiant','adiantamento':'adiant',
    // Dias (aceita "QUANT. DIAS", "DIAS", etc.)
    'dias':'dias','quant. dias':'dias','quant dias':'dias','quantidade dias':'dias','qtd dias':'dias',
    'saldo':'saldo',
    'cte':'cte','mdf':'mdf','nf':'nf','nota fiscal':'nf','cliente':'cliente',
    'pag. descarga':'pag_descarga','pag descarga':'pag_descarga','pag.descarga':'pag_descarga','pagamento descarga':'pag_descarga',
    'pag. stretch':'pag_stretch','pag stretch':'pag_stretch','pag.stretch':'pag_stretch','pag. strech':'pag_stretch','pag strech':'pag_stretch',
    'shipmente id':'id_doc','shipment id':'id_doc','id_doc':'id_doc','id doc':'id_doc',
    'ro':'ro','r.o.':'ro','reg. ocorrencia':'ro','reg ocorrencia':'ro',
    'mat':'mat','contrato':'mat','contrato [mat ou mar]':'mat',
    'sgs':'sgs','alguma ocorrencia / sgs':'sgs','alguma ocorrencia':'sgs',
    'chegada':'chegada','chegada no cliente':'chegada','data chegada':'chegada',
    'gerenc':'gerenc','gerenciadora':'gerenc',
    'data manifesto':'data_manifesto','data do manifesto':'data_manifesto',
    'diaria_prev':'diaria_prev','diarias devida':'diaria_prev','diarias (devida r$)':'diaria_prev',
    'diaria_pg':'diaria_pg','diarias paga':'diaria_pg','diarias (paga r$)':'diaria_pg',
    'informou analista':'informou_analista','informou_analista':'informou_analista',
    'desc_aguardando':'desc_aguardando','aguardando descarga':'desc_aguardando'
  };
  return m[n]||null;
}`}</pre>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                    <div style={{background:`rgba(2,192,118,.06)`,border:`1px solid rgba(2,192,118,.2)`,borderRadius:7,padding:"8px 10px"}}>
                      <div style={{fontSize:9,fontWeight:700,color:t.verde,marginBottom:3}}>▶ Como ativar (1x apenas)</div>
                      <div style={{fontSize:9,color:t.txt2,lineHeight:1.7}}>1. Cole o script acima no Apps Script<br/>2. Preencha <code>SUPA_URL</code> e <code>SUPA_KEY</code><br/>3. No menu <strong style={{color:t.txt}}>Executar</strong> → <strong style={{color:t.verde}}>configurarGatilho</strong><br/>4. Autorize quando pedido<br/>✅ Pronto — sync automático a cada 15min</div>
                    </div>
                    <div style={{background:`rgba(246,70,93,.06)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:7,padding:"8px 10px"}}>
                      <div style={{fontSize:9,fontWeight:700,color:t.danger,marginBottom:3}}>🔍 Diagnóstico de registros ausentes</div>
                      <div style={{fontSize:9,color:t.txt2,lineHeight:1.7}}>Se uma DT está na planilha mas não no app:<br/>• Verifique a coluna DT/Espelho da linha<br/>• Rode o script manualmente e veja o painel acima<br/>• "Ignorados" lista as linhas com problema<br/>• Confirme que SUPA_URL e SUPA_KEY estão corretos</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alterar senha do Admin */}
            <AlterarSenhaAdmin t={t} css={css} showToast={showToast} onSalvar={async hash=>{await setConfigRemoto("admin_senha_hash",hash);await registrarLog("ALTERAR_SENHA_ADMIN","Senha do Admin alterada");}} />

            {/* Email do Admin (para login e OAuth) */}
            <div style={{marginTop:8,marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>Email do Admin (login OAuth / identificação)</div>
              <div style={{display:"flex",gap:8}}>
                <input value={adminEmailVal} onChange={e=>setAdminEmailVal(e.target.value)} placeholder="seu@email.com" style={{...css.inp,flex:1,fontSize:11}} />
                <button onClick={()=>{saveJSON("co_admin_email",adminEmailVal.trim().toLowerCase());showToast("✅ Email admin salvo","ok");}} style={{...css.btnGold,whiteSpace:"nowrap",fontSize:11}}>
                  {hIco(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,t.bg,13,1.8)}
                  Salvar
                </button>
              </div>
              <div style={{fontSize:9,color:t.txt2,marginTop:4,lineHeight:1.6}}>Este email é usado para identificar o admin no login e via OAuth Google. Não fica visível no código-fonte.</div>
            </div>

            {/* EMAIL BOAS-VINDAS */}
            <div style={{...css.secTitle,margin:"24px 0 2px",padding:"16px 0",cursor:"pointer",userSelect:"none"}} onClick={()=>setEmailTemplateOpen(!emailTemplateOpen)}>
              {hIco(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,t.ouro,12)} Email de Boas-vindas<span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{emailTemplateOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {emailTemplateOpen && (
              <div style={{...css.card,padding:14,marginBottom:16,background:t.card2}}>
                <p style={{fontSize:11,color:t.txt2,lineHeight:1.6,marginBottom:10}}>
                  Configure o email enviado ao criar novo usuario. Use <strong style={{color:t.ouro}}>&#123;nome&#125;</strong>, <strong style={{color:t.ouro}}>&#123;email&#125;</strong>, <strong style={{color:t.ouro}}>&#123;senha&#125;</strong>, <strong style={{color:t.ouro}}>&#123;perfil&#125;</strong>.
                </p>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Assunto</label>
                  <input value={emailTemplate.assunto} onChange={e=>setEmailTemplate(p=>({...p,assunto:e.target.value}))} style={{...css.inp,fontSize:12}} />
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Corpo do Email</label>
                  <textarea value={emailTemplate.corpo} onChange={e=>setEmailTemplate(p=>({...p,corpo:e.target.value}))} rows={9} style={{...css.inp,resize:"vertical",fontSize:11,lineHeight:1.6,fontFamily:"monospace"}} />
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>{saveJSON("co_email_template",emailTemplate);showToast("✅ Template salvo!","ok");registrarLog("EDITAR_EMAIL_TEMPLATE","Template de email atualizado");}} style={{...css.btnGreen,flex:1,justifyContent:"center",fontSize:12}}>💾 Salvar Template</button>
                  <button onClick={()=>enviarEmailBoasVindas({nome:"Teste",email:loadJSON("co_admin_email",""),perfil:"operador"},"senha123",false)} style={{...css.btnGold,flex:1,justifyContent:"center",fontSize:12}}>📧 Testar (Gmail)</button>
                  <button onClick={()=>enviarEmailBoasVindas({nome:"Teste",email:loadJSON("co_admin_email",""),perfil:"operador"},"senha123",true)} style={{...css.hBtn,flex:1,justifyContent:"center",fontSize:12}}>✉️ Outro Cliente</button>
                </div>
                <div style={{marginTop:8,padding:"8px 10px",background:t.bg,borderRadius:8,border:"1px solid "+t.borda,fontSize:10,color:t.txt2,lineHeight:1.6}}>
                  O email abre no seu cliente de email ja preenchido. Para usuarios novos, clique no botao Email no cadastro.
                </div>
              </div>
            )}

            {/* NORMALIZAR CONTATOS (Item 3) — colapsável */}
            <div style={{...css.secTitle,margin:"24px 0 2px",padding:"16px 0",cursor:"pointer",userSelect:"none"}} onClick={()=>setContatosAdminOpen(!contatosAdminOpen)}>
              {hIco(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,t.ouro,12)} Contatos / Motoristas <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{contatosAdminOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {contatosAdminOpen && <div style={{...css.card,padding:14,marginBottom:16,background:t.card2}}>
              <p style={{fontSize:11,color:t.txt2,lineHeight:1.6,marginBottom:10}}>
                Normaliza os dados de todos os motoristas cadastrados: capitalização dos nomes, formato de telefone <strong style={{color:t.txt}}>(XX) XXXXX-XXXX</strong> e placas em maiúsculas sem caracteres extras.
              </p>
              {/* ── Exportar ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700,marginBottom:6}}>📤 Exportar</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                <button onClick={()=>{
                  if(motoristas.length>=5){const ok=window.prompt(`Você está exportando ${motoristas.length} contatos. Digite ESTOU DE ACORDO para confirmar:`);if(!ok||ok.trim()!=="ESTOU DE ACORDO"){showToast("❌ Exportação cancelada","err");return;}}
                  const vcards=motoristas.map(m=>{const tel=(m.tel||"").replace(/\D/g,"");const nomeN=(m.nome||"").split(" ");const sob=nomeN.pop()||"";const prim=nomeN.join(" ");
                    return["BEGIN:VCARD","VERSION:3.0",`FN:${m.nome||""}`,`N:${sob};${prim};;;`,tel?`TEL;TYPE=CELL:+55${tel}`:"",m.cpf?`X-CPF:${m.cpf}`:"",`NOTE:Placa: ${[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).join(" | ")} | Vínculo: ${m.vinculo||"—"}`,"END:VCARD"].filter(Boolean).join("\r\n");
                  }).join("\r\n");
                  const blob=new Blob([vcards],{type:"text/vcard;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="motoristas_yfgroup.vcf";a.click();
                  showToast(`📤 ${motoristas.length} contatos exportados como vCard!`,"ok");
                }} style={{...css.hBtn,fontSize:12}}>📤 vCard (.vcf)</button>
                <button onClick={()=>{
                  if(motoristas.length>=5){const ok=window.prompt(`Você está exportando ${motoristas.length} contatos. Digite ESTOU DE ACORDO para confirmar:`);if(!ok||ok.trim()!=="ESTOU DE ACORDO"){showToast("❌ Exportação cancelada","err");return;}}
                  const header="Name,Given Name,Family Name,Phone 1 - Type,Phone 1 - Value,Notes";
                  const rows=motoristas.map(m=>{
                    const nomeN=(m.nome||"").split(" ");const sob=nomeN.pop()||"";const prim=nomeN.join(" ");
                    const tel=(m.tel||"").replace(/\D/g,"");
                    const tel2b=(m.tel2||"").replace(/\D/g,"");
                    const tel3b=(m.tel3||"").replace(/\D/g,"");
                    const nota=`CPF:${m.cpf||""} | Placa:${[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).join("/")} | Vínculo:${m.vinculo||""} | Banco:${m.banco||""} AGE:${m.agencia||""} CC:${m.conta||""}`;
                    return `"${m.nome||""}","${prim}","${sob}","Mobile","${tel?"+55"+tel:""}","Mobile","${tel2b?"+55"+tel2b:""}","Mobile","${tel3b?"+55"+tel3b:""}","${nota}"`;
                  });
                  const bom="\uFEFF";const blob=new Blob([bom+[header,...rows].join("\n")],{type:"text/csv;charset=utf-8"});
                  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="motoristas_google.csv";a.click();
                  showToast(`📤 ${motoristas.length} contatos exportados como CSV Google!`,"ok");
                }} style={{...css.hBtn,fontSize:12}}>📊 CSV Google</button>
                <button onClick={()=>{
                  const normalizados=motoristas.map(m=>({...m,nome:normalizarNome(m.nome),tel:normalizarTelefone(m.tel),placa1:normalizarPlaca(m.placa1),placa2:normalizarPlaca(m.placa2),placa3:normalizarPlaca(m.placa3),placa4:normalizarPlaca(m.placa4),favorecido:normalizarNome(m.favorecido)}));
                  saveMotoristasLS(normalizados);registrarLog("NORMALIZAR_CONTATOS",`${normalizados.length} motoristas normalizados`);showToast(`✅ ${normalizados.length} contatos normalizados!`,"ok");
                }} style={{...css.btnGold,fontSize:12}}>🔧 Normalizar</button>
              </div>

              {/* ── Importar ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700,marginBottom:6,marginTop:8}}>📥 Importar</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <label style={{...css.hBtn,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                  📥 CSV Google / vCard
                  <input type="file" accept=".csv,.vcf,.vcard" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files?.[0]; if(!f){return;}
                    const reader=new FileReader();
                    reader.onload=ev=>{
                      const txt=ev.target.result;
                      const parseVCard=(raw)=>{
                        const contatos=[];const blocos=raw.split(/END:VCARD/i);
                        blocos.forEach(bloco=>{
                          if(!bloco.toUpperCase().includes("BEGIN:VCARD"))return;
                          const fn=(bloco.match(/^FN:(.+)$/mi)||[])[1]?.trim()||"";
                          const n=(bloco.match(/^N:(.+)$/mi)||[])[1]?.trim()||"";
                          const nParts=n.split(";");const sobV=nParts[0]||"";const primV=nParts[1]||"";
                          const nomeV=fn||(primV+" "+sobV).trim();
                          const telM=bloco.match(/^TEL[^:]*:(.+)$/mi);
                          const telV=(telM?.[1]||"").replace(/\D/g,"").replace(/^55/,"");
                          const cpfM=bloco.match(/X-CPF:(.+)/i);const cpfV=(cpfM?.[1]||"").trim();
                          const noteM=bloco.match(/^NOTE:(.+)$/mi);const noteV=(noteM?.[1]||"");
                          const placaM=noteV.match(/Placa:\s*([\w/| ]+)/i);
                          const placas=(placaM?.[1]||"").split(/[|\/]/).map(p=>p.trim()).filter(Boolean);
                          if(nomeV)contatos.push({nome:nomeV,tel:telV,cpf:cpfV,placa1:placas[0]||"",placa2:placas[1]||"",placa3:placas[2]||"",placa4:placas[3]||""});
                        });
                        return contatos;
                      };
                      const parseCSV=(raw)=>{
                        // FIX: normalizar \r\n e \r (Google exporta Windows line endings)
                        const norm=raw.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
                        const lines=norm.trim().split("\n");
                        if(lines.length<2)return[];
                        // parser CSV real — suporta campos entre aspas com vírgulas internas
                        const parseRow=(line)=>{
                          const res=[];let cur="",inQ=false;
                          for(let i=0;i<line.length;i++){
                            const ch=line[i];
                            if(ch==='"'){
                              if(inQ&&line[i+1]==='"'){cur+='"';i++;}
                              else inQ=!inQ;
                            }else if(ch===','&&!inQ){res.push(cur.trim());cur="";}
                            else cur+=ch;
                          }
                          res.push(cur.trim());return res;
                        };
                        const headers=parseRow(lines[0]).map(h=>h.replace(/"/g,"").toLowerCase().trim());
                        // Suporte ao formato Google Contacts (First Name / Middle Name / Last Name)
                        const nameIdx    = headers.findIndex(h=>h==="name"||h==="full name"||h==="nome"||h==="nome completo");
                        const firstIdx   = headers.findIndex(h=>h==="first name");
                        const midIdx     = headers.findIndex(h=>h==="middle name");
                        const lastIdx    = headers.findIndex(h=>h==="last name");
                        // Todos os índices de telefone (Phone 1 - Value, Phone 2 - Value, ...)
                        const phoneIdxs  = headers.map((h,i)=>((h.includes("phone")&&h.includes("value"))||h==="phone"||h.includes("fone")||h==="telefone")?i:-1).filter(i=>i>=0);
                        const noteIdx    = headers.findIndex(h=>h.includes("note")||h.includes("obs")||h==="notas");
                        // Regex placa brasileira: antiga ABC1234 e Mercosul ABC1D23
                        const PLACA_RE   = /\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/g;
                        const extractPlacas=(txt)=>[...txt.toUpperCase().matchAll(PLACA_RE)].map(m=>m[1]);
                        return lines.slice(1).map(line=>{
                          if(!line.trim())return null;
                          const cols=parseRow(line);
                          // Montar nome: campo único ou concatenar First+Middle+Last
                          let nome="";
                          if(nameIdx>=0){ nome=cols[nameIdx]||""; }
                          else if(firstIdx>=0){
                            nome=[cols[firstIdx]||"", cols[midIdx>=0?midIdx:0]||"", cols[lastIdx>=0?lastIdx:0]||""]
                              .filter(Boolean).join(" ").trim();
                          }
                          // Primeiro telefone válido (≥8 dígitos)
                          let tel="";
                          for(const pi of phoneIdxs){
                            const v=(cols[pi]||"").replace(/\D/g,"").replace(/^55/,"");
                            if(v.length>=8){tel=v;break;}
                          }
                          const nota=noteIdx>=0?(cols[noteIdx]||""):"";
                          // Placas: extrair da nota E do nome (evitar duplicatas)
                          const allPlacas=[...new Set([...extractPlacas(nota),...extractPlacas(nome)])];
                          const cpfM=nota.match(/CPF[:\s]*([0-9./-]+)/i);
                          return nome?{nome,tel,cpf:(cpfM?.[1]||"").trim(),placa1:allPlacas[0]||"",placa2:allPlacas[1]||"",placa3:allPlacas[2]||"",placa4:allPlacas[3]||""}:null;
                        }).filter(Boolean);
                      };
                      const isVCard=txt.toUpperCase().includes("BEGIN:VCARD");
                      const importados=isVCard?parseVCard(txt):parseCSV(txt);
                      if(!importados.length){showToast("⚠️ Nenhum contato encontrado no arquivo","warn");return;}
                      // Comparar com existentes
                      const novos=[], conflitos=[];
                      importados.forEach(imp=>{
                        const nomeN=imp.nome.toUpperCase();
                        const cpfN=(imp.cpf||"").replace(/\D/g,"");
                        const placa1N=(imp.placa1||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
                        const existente=motoristas.find(m=>{
                          if(cpfN&&m.cpf&&m.cpf.replace(/\D/g,"")===cpfN)return true;
                          if(placa1N&&m.placa1&&m.placa1.toUpperCase().replace(/[^A-Z0-9]/g,"")===placa1N)return true;
                          return m.nome&&m.nome.toUpperCase()===nomeN;
                        });
                        if(existente){conflitos.push({atual:existente,imp,escolha:"manter"});}
                        else{novos.push(imp);}
                      });
                      // ── Sugestões de vínculo: contato importado × DADOS (por placa) ──
                      const vinculos=[];
                      const allImportados=[...novos,...conflitos.map(c=>c.imp)];
                      allImportados.forEach(imp=>{
                        const impPlacas=[imp.placa1,imp.placa2,imp.placa3,imp.placa4].filter(Boolean).map(p=>p.toUpperCase().replace(/[^A-Z0-9]/g,""));
                        if(!impPlacas.length)return;
                        DADOS.forEach(reg=>{
                          const regPlaca=(reg.placa||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
                          if(!regPlaca)return;
                          if(impPlacas.includes(regPlaca)){
                            // Só sugerir se o nome no registro for diferente ou vazio
                            const nomeReg=(reg.nome||"").toUpperCase().trim();
                            const nomeImp=imp.nome.toUpperCase().trim();
                            if(!nomeReg||nomeReg!==nomeImp){
                              vinculos.push({contato:imp,reg,placa:regPlaca,aceito:null});
                            }
                          }
                        });
                      });
                      // Deduplicar por DT (pegar só a 1ª sugestão por DT)
                      const vinculosUniq=vinculos.filter((v,i)=>vinculos.findIndex(x=>x.reg.dt===v.reg.dt&&x.contato.nome===v.contato.nome)===i);
                      // Guardar raw e abrir modal de filtro de prefixos
                      setMotImportRaw(importados);
                      const _pm = new Map();
                      importados.forEach(c=>{const p=(c.nome||"").trim().split(/\s+/)[0].toUpperCase();if(p)_pm.set(p,(_pm.get(p)||0)+1);});
                      const _pOrd = [..._pm.keys()].sort((a,b)=>_pm.get(b)-_pm.get(a));
                      const _PEXCL = new Set(["AGENC","AGENCIA","POSTO","SEGURO","BANCO","FILIAL","COOP","ASSOC","TRANS","TRANSP"]);
                      setMotImportPrefSel(new Set(_pOrd.filter(p=>!_PEXCL.has(p))));
                      setMotImportPrefBusca("");
                      setMotImportPrefOpen(true);
                    };
                    reader.readAsText(f,"utf-8");
                    e.target.value="";
                  }} />
                </label>
              </div>
              <div style={{padding:"8px 10px",background:t.bg,borderRadius:8,border:`1px solid ${t.borda}`,fontSize:10,color:t.txt2,lineHeight:1.5}}>
                💡 Google Contacts: <strong style={{color:t.txt}}>contacts.google.com</strong> → Exportar → CSV Google. Para importar, exporte da aba Motoristas ou baixe o .csv/.vcf e importe aqui.
              </div>
            </div>}

            {/* LOG DE ALTERACOES */}
            <div style={{...css.secTitle,margin:"24px 0 2px",padding:"16px 0",cursor:"pointer",userSelect:"none"}} onClick={async()=>{const next=!logsOpen;setLogsOpen(next);if(next)await carregarLogs();}}>
              {hIco(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="8 2 8 6 16 6 16 2"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,t.ouro,12)} Log de Alterações<span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{logsOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {logsOpen && (
              <div style={{marginBottom:16}}>
                {/* Sub-abas */}
                <div style={{display:"flex",gap:5,marginBottom:12}}>
                  {[{k:"dev",l:"🧑‍💻 Desenvolvimento"},{k:"op",l:"⚙️ Operacional"}].map(st=>(
                    <button key={st.k} onClick={()=>setLogsSubTab(st.k)} style={{padding:"6px 12px",fontSize:10,fontWeight:700,border:`1.5px solid ${logsSubTab===st.k?t.ouro:t.borda}`,borderRadius:DESIGN.r.badge,cursor:"pointer",background:logsSubTab===st.k?`rgba(217,98,43,.08)`:t.card2,color:logsSubTab===st.k?t.ouro:t.txt2,fontFamily:DESIGN.fnt.b}}>{st.l}</button>
                  ))}
                  {logsSubTab==="op" && <button onClick={carregarLogs} style={{...css.hBtn,fontSize:10,padding:"5px 10px",marginLeft:"auto"}}>↺ Atualizar</button>}
                </div>

                {/* ABA DESENVOLVIMENTO */}
                {logsSubTab==="dev" && (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>

                    {/* ── PAINEL AUDITORIA DE DESIGN ── */}
                    <div style={{...css.card,border:`1px solid ${t.ouro}`,overflow:"visible"}}>
                      <div style={{padding:"10px 14px 8px",borderBottom:`1px solid ${t.borda}`}}>
                        <div style={{...css.secTitle,marginBottom:4}}>
                          {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>,t.ouro,13,2)}
                          Auditoria de Design
                          <span style={{flex:1,height:1,background:t.borda,marginLeft:4}}/>
                        </div>
                        <div style={{fontSize:10,color:t.txt2,lineHeight:1.6,marginBottom:8}}>
                          Detecta elementos com estilos fora do padrão <strong style={{color:t.ouro}}>DESIGN.*</strong>.<br/>
                          Para alterar qualquer elemento globalmente: edite <strong style={{color:t.ouro}}>DESIGN</strong> no topo do arquivo → propaga em todo o código que usa <strong style={{color:t.ouro}}>css.*</strong>.
                        </div>
                        <div style={{background:t.card2,borderRadius:DESIGN.r.sm,padding:"8px 10px",fontSize:9,color:t.txt2,fontFamily:DESIGN.fnt.b,marginBottom:10,lineHeight:1.8}}>
                          {Object.entries(DESIGN).filter(([k])=>k!=="c").map(([k,v])=>(
                            <div key={k}><span style={{color:t.ouro}}>DESIGN.{k}</span> = {JSON.stringify(v)}</div>
                          ))}
                        </div>
                        <button onClick={auditarDesign} style={{...css.btnOutline,fontSize:11,padding:"8px 16px",minHeight:36}}>
                          {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.ouro,14,2)} Executar Auditoria
                        </button>
                      </div>
                      {auditReport && (
                        <div style={{padding:"10px 14px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <span style={{...css.badge(auditReport.total===0?t.verde:t.danger, auditReport.total===0?`rgba(2,192,118,.1)`:`rgba(246,70,93,.1)`, auditReport.total===0?`rgba(2,192,118,.3)`:`rgba(246,70,93,.3)`)}}>
                              {auditReport.total===0?"✓ TUDO OK":`${auditReport.total} VIOLAÇÕES`}
                            </span>
                            <span style={{fontSize:9,color:t.txt2}}>{auditReport.timestamp}</span>
                          </div>
                          {auditReport.total > 0 && (
                            <>
                              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                                {Object.entries(auditReport.tipos).map(([tipo,count])=>(
                                  <span key={tipo} style={{...css.badge(t.ouro,`rgba(217,98,43,.08)`,`rgba(217,98,43,.25)`)}}>{tipo}: {count}</span>
                                ))}
                              </div>
                              <div style={{maxHeight:180,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                                {auditReport.items.map((item,i)=>(
                                  <div key={i} style={{background:t.card2,borderRadius:DESIGN.r.tag,padding:"5px 8px",fontSize:9,color:t.txt2,display:"flex",gap:8,alignItems:"flex-start"}}>
                                    <span style={{color:t.danger,fontWeight:700,flexShrink:0}}>{item.tipo}</span>
                                    <span style={{color:t.txt,fontWeight:600}}>{item.valor}</span>
                                    <span style={{color:t.txt2,flex:1}}>→ {item.sugestao}</span>
                                    <span style={{color:t.txt2,flexShrink:0,fontStyle:"italic"}}>{item.label}</span>
                                  </div>
                                ))}
                              </div>
                              {auditReport.total > 30 && (
                                <div style={{fontSize:9,color:t.txt2,marginTop:4,textAlign:"center"}}>… e mais {auditReport.total-30} (ver window.__auditReport no console)</div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {DEV_CHANGELOG.map((sessao,si)=>(
                      <div key={si} style={{background:t.card,borderRadius:10,border:`1px solid ${t.azulLt}`,overflow:"hidden"}}>
                        <div style={{padding:"8px 12px",background:t.card2,display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:12}}>🧑‍💻</span>
                          <span style={{fontSize:11,fontWeight:700,color:t.txt}}>{sessao.sessao}</span>
                          <span style={{fontSize:9,color:t.txt2,marginLeft:"auto"}}>{sessao.data}</span>
                        </div>
                        <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:5}}>
                          {sessao.itens.map((item,ii)=>(
                            <div key={ii} style={{display:"flex",gap:7,alignItems:"flex-start"}}>
                              <span style={{color:t.verde,fontSize:10,flexShrink:0,marginTop:1}}>✓</span>
                              <span style={{fontSize:10,color:t.txt2,lineHeight:1.55}}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ABA OPERACIONAL */}
                {logsSubTab==="op" && (
                  <>
                    <div style={{fontSize:10,color:t.txt2,marginBottom:8}}>{logsData.length} eventos operacionais · tabela: co_logs_alteracoes</div>
                    {logsData.length===0?(
                      <div style={{...css.empty,padding:"16px 0",fontSize:11,color:t.txt2}}>
                        <div style={{fontSize:28,marginBottom:8}}>📭</div>
                        Nenhum evento operacional registrado ainda.<br/>
                        <span style={{fontSize:9}}>Eventos são criados ao editar, criar ou excluir registros no app.</span>
                      </div>
                    ):(
                      <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:360,overflowY:"auto"}}>
                        {logsData.map((log,li)=>(
                          <div key={li} style={{background:t.card,borderRadius:9,padding:"8px 12px",border:"1px solid "+(log.acao&&log.acao.includes("DELETAR")?t.danger:log.acao&&log.acao.includes("NOVO")?t.verde:t.ouro)}}>
                            <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:2}}>
                              <span style={{fontSize:10,fontWeight:700,color:t.txt}}>{log.acao}</span>
                              <span style={{fontSize:8,color:t.txt2,flexShrink:0}}>{new Date(log.data_hora).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</span>
                            </div>
                            <div style={{fontSize:11,color:t.txt2}}>{log.descricao}</div>
                            <div style={{fontSize:9,color:t.txt2,marginTop:2}}>Autor: {log.usuario} ({log.perfil_usuario})</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
  );
}
