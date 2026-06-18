import { fmtMoeda, parseData, diffDias, brToInput } from '../utils.js';

/**
 * Factory que recebe os dados de contexto e retorna as funções de geração de relatório.
 * Chamado no render do App.jsx para que as funções sempre tenham acesso aos dados atuais.
 */
export function criarMotoresRelatorio({ customLogo, DADOS, motoristas, baseAtual }) {
  const relHtmlBase = (titulo, subtitulo, corpo) => {
    const now = new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"});
    const logoBlock = customLogo
      ? `<img src="${customLogo}" style="height:42px;object-fit:contain" />`
      : `<div style="width:44px;height:44px;background:linear-gradient(135deg,#f0b90b,#e5a800);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(240,185,11,.38)"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>`;
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=1200">
<title>${titulo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html{width:297mm}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#0d1421;color:#1a202c;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact;min-width:900px}
  .page{max-width:1050px;margin:0 auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.3)}
  .header{background:linear-gradient(135deg,#0d1421 0%,#1a2744 60%,#0d1e3a 100%);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .header-brand{display:flex;align-items:center;gap:14px}
  .brand-name{font-size:17px;font-weight:900;color:#fff;letter-spacing:2px;line-height:1.1;font-family:'Segoe UI',Arial,sans-serif}
  .brand-sub{font-size:10px;color:rgba(255,255,255,.45);font-weight:400;margin-top:3px}
  .brand-sub strong{color:#f0b90b;font-weight:700}
  .header-right{text-align:right;color:rgba(255,255,255,.6);font-size:10px;line-height:1.8;flex-shrink:0}
  .header-right strong{color:#f0b90b;font-size:12px;display:block;margin-bottom:2px;font-weight:800;letter-spacing:.5px}
  .subheader{background:linear-gradient(90deg,#f0b90b 0%,#f5cc3c 100%);padding:10px 32px;display:flex;align-items:center;gap:16px;border-bottom:3px solid #d9a50a}
  .subheader-title{font-size:15px;font-weight:900;color:#0a1628;letter-spacing:.8px;text-transform:uppercase}
  .subheader-sub{font-size:10px;color:#5a4200;font-weight:600;margin-top:2px}
  .content{padding:22px 32px}
  .section-title{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2.5px;color:#fff;margin:20px 0 12px;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,#1a3a6b,#2d5aa0);padding:7px 14px;border-radius:6px}
  .section-title::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.2)}
  .kpi-row{display:grid;gap:12px;margin-bottom:8px}
  .kpi-row.cols3{grid-template-columns:repeat(3,1fr)}
  .kpi-row.cols4{grid-template-columns:repeat(4,1fr)}
  .kpi-row.cols5{grid-template-columns:repeat(5,1fr)}
  .kpi{background:#f8faff;border:1.5px solid #dce8ff;border-radius:10px;padding:14px 16px;text-align:center}
  .kpi-val{font-size:22px;font-weight:900;color:#1a3a6b;line-height:1.1;font-variant-numeric:tabular-nums}
  .kpi-lbl{font-size:9px;color:#6b7a99;text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-weight:600}
  .kpi.green{border-color:#c3f0da;background:#f0faf5}.kpi.green .kpi-val{color:#0a7a45}
  .kpi.yellow{border-color:#f7e6a0;background:#fffbec}.kpi.yellow .kpi-val{color:#a07000}
  .kpi.red{border-color:#ffd0d0;background:#fff5f5}.kpi.red .kpi-val{color:#c0392b}
  .kpi.blue{border-color:#bcd4ff;background:#f0f5ff}.kpi.blue .kpi-val{color:#1a3a6b}
  table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px;border-radius:8px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.08)}
  thead tr{background:linear-gradient(90deg,#0a1628,#1a3a6b);color:#fff}
  thead th{padding:9px 10px;text-align:left;font-size:8.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-right:1px solid rgba(255,255,255,.08)}
  thead th:last-child{border-right:none}
  tbody tr:nth-child(even){background:#f7f9ff}
  tbody tr:hover{background:#e8f0ff}
  tbody td{padding:7px 10px;border-bottom:1px solid #e8edf5;vertical-align:middle;line-height:1.4}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .badge-ok{background:#d4f5e6;color:#0a7a45}
  .badge-pend{background:#fff3cc;color:#a07000}
  .badge-atraso{background:#ffe0d0;color:#c0392b}
  .badge-diaria{background:#e0e8ff;color:#2c4aab}
  .badge-sem{background:#e8ffe8;color:#0a7a45}
  .dt-chip{background:#1a3a6b;color:#f0b90b;border-radius:5px;padding:2px 7px;font-weight:800;font-size:10px;letter-spacing:1px;font-family:monospace}
  .driver-card{background:linear-gradient(135deg,#f0f5ff,#e8f0ff);border:1.5px solid #bcd4ff;border-radius:12px;padding:20px 24px;margin-bottom:6px;display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center}
  .driver-avatar{width:64px;height:64px;background:linear-gradient(135deg,#1a3a6b,#2d5aa0);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#f0b90b}
  .driver-name{font-size:20px;font-weight:800;color:#0a1628;margin-bottom:4px}
  .driver-info{font-size:10px;color:#4a5568;line-height:2}
  .driver-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:#f0b90b22;color:#7a5500;border:1px solid #f0b90b55}
  .trip-row-ok td{background:rgba(34,197,94,.08)}
  .trip-row-atraso td{background:rgba(239,68,68,.08)}
  .trip-row-diaria td{background:rgba(59,130,246,.08)}
  .trip-row-pend td{background:rgba(245,158,11,.08)}
  .sgs-item{background:#fff8ec;border:1px solid #f5dfa0;border-radius:8px;padding:10px 14px;margin-bottom:6px;display:flex;gap:14px;align-items:flex-start}
  .sgs-num{background:#f0b90b;color:#0a1628;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:800;white-space:nowrap}
  .sgs-info{font-size:10px;color:#5a4200;line-height:1.8}
  .footer{background:#0a1628;padding:14px 36px;display:flex;align-items:center;justify-content:space-between}
  .footer-txt{color:rgba(255,255,255,.4);font-size:9px}
  .footer-brand{color:#f0b90b;font-size:10px;font-weight:700;letter-spacing:1px}
  .info-box{background:#f0f8ff;border:1.5px solid #bcd4ff;border-radius:8px;padding:12px 16px;font-size:10px;color:#2c4aab;margin-bottom:12px}
  @page{size:landscape;margin:10mm 8mm}
  @media print{
    @page{size:landscape!important;margin:10mm 8mm}
    body{background:#fff}
    .page{box-shadow:none;max-width:100%;width:100%}
    .no-print{display:none!important}
    table{font-size:9px}
    thead th{font-size:8px;padding:6px 6px}
    tbody td{padding:5px 6px}
  }
</style>
</head><body>
<div class="page">
  <div class="header">
    <div class="header-brand">
      ${logoBlock}
      <div>
        <div class="brand-name">CTRL OPERACIONAL</div>
        <div class="brand-sub">by <strong>YFGroup</strong> · Imperatriz Logística</div>
      </div>
    </div>
    <div class="header-right">
      <strong>${titulo}</strong>
      ${subtitulo}<br>Gerado em ${now}
    </div>
  </div>
  ${corpo}
  <div class="footer">
    <span class="footer-txt">Documento gerado automaticamente — Controle Operacional · YFGroup</span>
    <span class="footer-brand">YF GROUP LOGÍSTICA</span>
  </div>
</div>
<div class="no-print" style="text-align:center;padding:18px 20px;background:#0d1421;border-top:2px solid #f0b90b22">
  <button onclick="window.print()" style="background:#f0b90b;color:#0a1628;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:1px">IMPRIMIR / SALVAR PDF</button>
  <button onclick="window.close()" style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.15);padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:10px">Fechar</button>
</div>
</body></html>`;
  };

  const gerarRelatorioMotorista = (mot) => {
    // Mapa DT → tipo de diária (calculado no useMemo diariasData)
    const diariasMap = new Map(diariasData.items.map(item=>[item.r.dt, item.tipo]));
    const viagens = DADOS.filter(r => {
      const nomeMatch = mot.nome && r.nome && r.nome.toUpperCase().trim() === mot.nome.toUpperCase().trim();
      const cpfMatch = mot.cpf && r.cpf && r.cpf.replace(/\D/g,"") === mot.cpf.replace(/\D/g,"");
      return nomeMatch || cpfMatch;
    }).sort((a,b) => {
      const da = a.data_carr||"", db = b.data_carr||"";
      const toSort = s => { if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return `${p[2]}-${p[1]}-${p[0]}`} return s; };
      return toSort(da).localeCompare(toSort(db));
    });
    const totalVlCte = viagens.reduce((s,r)=>s+(parseFloat(r.vl_cte)||0),0);
    const totalContrato = viagens.reduce((s,r)=>s+(parseFloat(r.vl_contrato)||0),0);
    const totalAdiant = viagens.reduce((s,r)=>s+(parseFloat(r.adiant)||0),0);
    const totalSaldo = viagens.reduce((s,r)=>s+(parseFloat(r.saldo)||0),0);
    const comDiaria = viagens.filter(r=>{const tp=diariasMap.get(r.dt)||"";return tp==="diaria"||tp==="atraso";}).length;
    const comSGS = viagens.filter(r=>r.sgs).length;
    const statusCount = {};
    viagens.forEach(r=>{const s=r.status||"—";statusCount[s]=(statusCount[s]||0)+1;});
    const fmt = v => v>0?`R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";
    const placas = [mot.placa1,mot.placa2,mot.placa3,mot.placa4].filter(Boolean);
    const badgeCor = {diaria:"badge-diaria",sem_diaria:"badge-sem",atraso:"badge-atraso",pendente:"badge-pend",ok:"badge-ok"};
    const statusBadge = s => {
      const m = {diaria:{c:"badge-diaria",l:"Com Diária"},sem_diaria:{c:"badge-sem",l:"Sem Diária"},atraso:{c:"badge-atraso",l:"Perdeu Agenda"},pendente:{c:"badge-pend",l:"Pendente"},ok:{c:"badge-ok",l:"OK"}};
      const x = m[s]||{c:"badge-pend",l:s||"—"};
      return `<span class="badge ${x.c}">${x.l}</span>`;
    };
    const corpo = `
  <div class="subheader">
    <div>
      <div class="subheader-title">📋 Relatório Individual do Motorista</div>
      <div class="subheader-sub">${viagens.length} viagem${viagens.length!==1?"s":""} registrada${viagens.length!==1?"s":""}</div>
    </div>
  </div>
  <div class="content">
    <div class="driver-card">
      <div class="driver-avatar">${(mot.nome||"M")[0].toUpperCase()}</div>
      <div>
        <div class="driver-name">${mot.nome||"—"}</div>
        <div class="driver-info">
          ${mot.cpf?`<span>🪪 CPF: <strong>${mot.cpf}</strong></span>&nbsp;&nbsp;`:""}
          ${mot.tel?`<span>📞 ${mot.tel}</span>&nbsp;&nbsp;`:""}
          ${mot.vinculo?`<span class="driver-badge">${mot.vinculo}</span>&nbsp;&nbsp;`:""}
        </div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          ${placas.map((p,i)=>`<span style="background:${i===0?"#f0b90b22":"#d4f5e6"};color:${i===0?"#7a5500":"#0a7a45"};border:1px solid ${i===0?"#f0b90b55":"#a0e0c0"};border-radius:4px;padding:2px 8px;font-weight:800;font-size:11px;letter-spacing:2px">${p}</span>`).join("")}
        </div>
        ${mot.banco?`<div style="margin-top:4px;font-size:10px;color:#4a5568">🏦 ${mot.banco}${mot.agencia?` · Ag ${mot.agencia}`:""}${mot.conta?` · CC ${mot.conta}`:""}</div>`:""}
        ${mot.pix_tipo?`<div style="margin-top:2px;font-size:10px;color:#2c4aab">PIX ${mot.pix_tipo}: ${mot.pix_chave||"—"}</div>`:""}
      </div>
    </div>
    <div class="section-title">📊 Resumo Financeiro e Operacional</div>
    <div class="kpi-row cols5">
      <div class="kpi blue"><div class="kpi-val">${viagens.length}</div><div class="kpi-lbl">Total Viagens</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalVlCte)}</div><div class="kpi-lbl">Valor CTE Total</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalContrato)}</div><div class="kpi-lbl">Valor Contrato</div></div>
      <div class="kpi ${comDiaria>0?"yellow":"green"}"><div class="kpi-val">${comDiaria}</div><div class="kpi-lbl">Com Diárias</div></div>
      <div class="kpi ${comSGS>0?"red":"green"}"><div class="kpi-val">${comSGS}</div><div class="kpi-lbl">SGS Abertos</div></div>
    </div>
    <div class="section-title">🚛 Histórico de Viagens</div>
    ${viagens.length===0?`<div class="info-box">Nenhuma viagem registrada para este motorista.</div>`:`
    <table>
      <thead><tr>
        <th>DT</th><th>Origem</th><th>Destino</th><th>Carregamento</th><th>Agenda</th>
        <th>Chegada</th><th>Descarga</th><th>Status</th><th>CTE</th><th>Contrato</th><th>Saldo</th><th>SGS</th>
      </tr></thead>
      <tbody>
        ${viagens.map(r=>{
          const tipo = diariasMap.get(r.dt)||"";
          const rowClass = tipo==="diaria"?"trip-row-diaria":tipo==="atraso"?"trip-row-atraso":tipo==="sem_diaria"?"trip-row-ok":"trip-row-pend";
          return `<tr class="${rowClass}">
            <td><span class="dt-chip">${r.dt||"—"}</span></td>
            <td>${r.origem||"—"}</td>
            <td>${r.destino||"—"}</td>
            <td>${r.data_carr||"—"}</td>
            <td>${r.data_agenda||"—"}</td>
            <td>${r.chegada||"—"}</td>
            <td>${r.data_desc||"—"}</td>
            <td>${statusBadge(tipo)}</td>
            <td>${r.vl_cte?`R$ ${parseFloat(r.vl_cte).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
            <td>${r.vl_contrato?`R$ ${parseFloat(r.vl_contrato).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
            <td>${r.saldo?`R$ ${parseFloat(r.saldo).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
            <td>${r.sgs?`<span class="badge badge-atraso">${r.sgs}</span>`:"—"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`}
    ${viagens.some(r=>r.cte||r.mdf||r.nf||r.mat)?`
    <div class="section-title">📄 Documentação das Viagens</div>
    <table>
      <thead><tr><th>DT</th><th>CTE</th><th>MDF</th><th>NF</th><th>MAT</th><th>RO</th><th>Cliente</th><th>Gerenciadora</th></tr></thead>
      <tbody>
        ${viagens.filter(r=>r.cte||r.mdf||r.nf||r.mat).map(r=>`<tr>
          <td><span class="dt-chip">${r.dt||"—"}</span></td>
          <td>${r.cte||"—"}</td><td>${r.mdf||"—"}</td><td>${r.nf||"—"}</td><td>${r.mat||"—"}</td>
          <td>${r.ro||"—"}</td><td>${r.cliente||"—"}</td><td>${r.gerenc||"—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>`:""}
  </div>`;
    const _html = relHtmlBase(`Motorista: ${mot.nome||"—"}`, `Relatório Individual · ${mot.nome||"—"}`, corpo);
    const _blob = new Blob([_html], {type:"text/html;charset=utf-8"});
    const _url  = URL.createObjectURL(_blob);
    window.open(_url, "_blank", "width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_url), 120000);
  };

  // Pré-carrega ocorrências do Supabase para uma lista de DTs antes de gerar o relatório
  const preCarregarOcorrencias = async (dtList) => {
    if (!dtList || dtList.length === 0) return;
    const conn = getConexao();
    if (!conn) return;
    try {
      // Busca todas as ocorrencias dos DTs em uma unica query
      const rawBulk = sessionToken
        ? await supaFetch(conn.url, conn.key, "POST", "rpc/listar_ocorrencias_bulk",
            {p_token: sessionToken, p_dts: dtList})
        : await (async () => {
            const dtsCod = dtList.map(dt => dt.replace(/'/g,"''")).join(",");
            return supaFetch(conn.url, conn.key, "GET",
              `${TABLE_OCORR}?dt=in.(${encodeURIComponent(dtsCod)})&order=data_hora.asc&select=*`);
          })();
      const data = Array.isArray(rawBulk) ? rawBulk.map(x => typeof x === "string" ? JSON.parse(x) : x) : [];
      if (Array.isArray(data)) {
        // Agrupa por DT e salva no localStorage
        const porDt = {};
        data.forEach(o => { if(!porDt[o.dt]) porDt[o.dt]=[]; porDt[o.dt].push(o); });
        dtList.forEach(dt => {
          if (porDt[dt]) saveJSON(`co_ocorr_${dt}`, porDt[dt]);
        });
      }
    } catch { /* silencioso — usa cache local se falhar */ }
  };

  const gerarRelatorioGeral = (from, to, filtros={}) => {
    // Mapa DT → tipo de diária (calculado no useMemo diariasData)
    const diariasMapG = new Map(diariasData.items.map(item=>[item.r.dt, item.tipo]));
    const parseD = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
    const fromD = from ? new Date(from) : null;
    const toD   = to   ? new Date(to)   : null;
    if(toD) toD.setHours(23,59,59,999);
    const {motorista:fMot="",statusDiaria:fStatus="",statusOper:fStatusOper="",origem:fOrigem="",destino:fDest="",vinculo:fVinc="",secoes:fSecoes={kpi:true,sumario:true,registros:true,sgs:true,ocorr_dt:true,diarias:false,descargas:false}} = filtros;
    // Mapa nome→vínculo para filtro de vínculo
    const motVincMap = new Map(motoristas.map(m=>[m.nome?.toUpperCase()?.trim()||"",m.vinculo||""]));
    const inRange = r => {
      const dateStr = r.data_carr || r.data_desc || r.chegada || "";
      const d = parseD(dateStr);
      if(!d) return !fromD && !toD;
      if(fromD && d < fromD) return false;
      if(toD   && d > toD)   return false;
      return true;
    };
    const regs = DADOS.filter(r => {
      if(!inRange(r)) return false;
      if(fMot && !(r.nome||"").toUpperCase().includes(fMot.toUpperCase())) return false;
      if(fOrigem && !(r.origem||"").toUpperCase().includes(fOrigem.toUpperCase())) return false;
      if(fDest && !(r.destino||"").toUpperCase().includes(fDest.toUpperCase())) return false;
      if(fVinc) { const v = motVincMap.get((r.nome||"").toUpperCase().trim()); if(v!==fVinc) return false; }
      if(fStatus) { const tp=diariasMapG.get(r.dt)||""; if(tp!==fStatus) return false; }
      if(fStatusOper && (r.status||"").toUpperCase().trim()!==fStatusOper.toUpperCase().trim()) return false;
      return true;
    }).sort((a,b)=>{
      const toSort = s => { if(!s)return ""; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return `${p[2]}-${p[1]}-${p[0]}`} return s; };
      return toSort(a.data_carr||"").localeCompare(toSort(b.data_carr||""));
    });
    const motoristasUnicos = new Set(regs.map(r=>r.nome).filter(Boolean));
    const totalCte = regs.reduce((s,r)=>s+(parseFloat(r.vl_cte)||0),0);
    const totalContrato = regs.reduce((s,r)=>s+(parseFloat(r.vl_contrato)||0),0);
    const totalAdiant = regs.reduce((s,r)=>s+(parseFloat(r.adiant)||0),0);
    const totalSaldo = regs.reduce((s,r)=>s+(parseFloat(r.saldo)||0),0);
    const comDiaria = regs.filter(r=>{const tp=diariasMapG.get(r.dt)||"";return tp==="diaria"||tp==="atraso";}).length;
    const comSGS = regs.filter(r=>r.sgs).length;
    // SGS items in range
    const sgsRange = sgsItems.filter(s=>{
      const d = parseD(s.data_chamado||s.ultimo_retorno||"");
      if(!d) return true;
      if(fromD && d<fromD) return false;
      if(toD && d>toD) return false;
      return true;
    });
    const fmt = v => v>0?`R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";
    const periodoStr = fromD||toD ? `${fromD?fromD.toLocaleDateString("pt-BR"):"início"} a ${toD?toD.toLocaleDateString("pt-BR"):"hoje"}` : "Todos os registros";
    const statusBadgeG = tipo => {
      const m = {diaria:{c:"badge-diaria",l:"Com Diária"},sem_diaria:{c:"badge-sem",l:"Sem Diária"},atraso:{c:"badge-atraso",l:"Perdeu Agenda"},pendente:{c:"badge-pend",l:"Pendente"},ok:{c:"badge-ok",l:"OK"}};
      const x = m[tipo]||{c:"badge-pend",l:tipo||"—"};
      return `<span class="badge ${x.c}">${x.l}</span>`;
    };
    // Agrupar por motorista para sumário
    const totalDiariaPrev = regs.reduce((s,r)=>{const tp=diariasMapG.get(r.dt)||"";return(tp==="diaria"||tp==="atraso")?s+(parseFloat(r.diaria_prev)||0):s;},0);
    const totalDiariaPg   = regs.reduce((s,r)=>{const tp=diariasMapG.get(r.dt)||"";return(tp==="diaria"||tp==="atraso")?s+(parseFloat(r.diaria_pg)||0):s;},0);
    const porMotorista = {};
    regs.forEach(r=>{
      const n=r.nome||"—";
      if(!porMotorista[n]) porMotorista[n]={viagens:0,cte:0,diarias:0,diariaPrev:0,diariaPg:0};
      porMotorista[n].viagens++;
      porMotorista[n].cte+=(parseFloat(r.vl_cte)||0);
      const tpG=diariasMapG.get(r.dt)||"";
      if(tpG==="diaria"||tpG==="atraso"){
        porMotorista[n].diarias++;
        porMotorista[n].diariaPrev+=(parseFloat(r.diaria_prev)||0);
        porMotorista[n].diariaPg+=(parseFloat(r.diaria_pg)||0);
      }
    });
    // Filtros ativos para exibição no cabeçalho do relatório
    const filtrosAtivos = [
      fMot?`Motorista: ${fMot}`:"",
      fStatusOper?`Status: ${fStatusOper}`:"",
      fStatus?`Diária: ${({diaria:"Com Diária",sem_diaria:"Sem Diária",atraso:"Perdeu Agenda",pendente:"Pendente"}[fStatus]||fStatus)}`:"",
      fOrigem?`Origem: ${fOrigem}`:"",
      fDest?`Destino: ${fDest}`:"",
      fVinc?`Vínculo: ${fVinc}`:"",
    ].filter(Boolean).join(" · ");
    const statusDistrib = {};
    regs.forEach(r=>{const s=(r.status||"—").trim();statusDistrib[s]=(statusDistrib[s]||0)+1;});
    const statusDistribArr = Object.entries(statusDistrib).sort((a,b)=>b[1]-a[1]);
    const statusOperBadge = s => {
      const map = {CARREGADO:{bg:"#d4f5e6",c:"#0a7a45"},PENDENTE:{bg:"#fff3cc",c:"#a07000"},"EM ABERTO":{bg:"#e0e8ff",c:"#2c4aab"},CANCELADO:{bg:"#ffe0d0",c:"#c0392b"},"NO-SHOW":{bg:"#ffe0d0",c:"#c0392b"},"NÃO ACEITE":{bg:"#ffd0d0",c:"#c0392b"}};
      const st = map[(s||"").toUpperCase()]||{bg:"#f0f0f0",c:"#666"};
      return `<span style="background:${st.bg};color:${st.c};border-radius:4px;padding:2px 7px;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.5px">${s||"—"}</span>`;
    };
    const corpo = `
  <div class="subheader">
    <div>
      <div class="subheader-title">Relatório Geral de Operações</div>
      <div class="subheader-sub">Período: ${periodoStr} · ${regs.length} registro${regs.length!==1?"s":""}${filtrosAtivos?` · ${filtrosAtivos}`:""}</div>
    </div>
  </div>
  <div class="content">
    ${fSecoes.kpi!==false?`
    <div class="section-title">Indicadores do Período</div>
    <div class="kpi-row cols4">
      <div class="kpi blue"><div class="kpi-val">${regs.length}</div><div class="kpi-lbl">Total de Viagens</div></div>
      <div class="kpi blue"><div class="kpi-val">${motoristasUnicos.size}</div><div class="kpi-lbl">Motoristas Ativos</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalCte)}</div><div class="kpi-lbl">Valor CTE Total</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalContrato)}</div><div class="kpi-lbl">Valor Contrato</div></div>
    </div>
    <div class="kpi-row cols4">
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalAdiant)}</div><div class="kpi-lbl">Adiantamentos</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalSaldo)}</div><div class="kpi-lbl">Saldos</div></div>
      <div class="kpi ${comDiaria>0?"yellow":"green"}"><div class="kpi-val">${comDiaria}</div><div class="kpi-lbl">Com Diárias</div></div>
      <div class="kpi ${comSGS>0?"red":"green"}"><div class="kpi-val">${comSGS}</div><div class="kpi-lbl">Ocorr. SGS</div></div>
    </div>
    ${totalDiariaPrev>0||totalDiariaPg>0?`
    <div class="section-title">Financeiro de Diárias</div>
    <div class="kpi-row cols3">
      <div class="kpi red"><div class="kpi-val" style="font-size:15px">${fmt(totalDiariaPrev)}</div><div class="kpi-lbl">Total Devido (Diárias)</div></div>
      <div class="kpi green"><div class="kpi-val" style="font-size:15px">${fmt(totalDiariaPg)}</div><div class="kpi-lbl">Total Pago (Diárias)</div></div>
      <div class="kpi ${(totalDiariaPrev-totalDiariaPg)>0?"red":"green"}"><div class="kpi-val" style="font-size:15px">${fmt(Math.abs(totalDiariaPrev-totalDiariaPg))}</div><div class="kpi-lbl">${(totalDiariaPrev-totalDiariaPg)>0?"A Pagar":"Quitado"}</div></div>
    </div>`:""}`:""}
    ${statusDistribArr.length>1?`
    <div class="section-title">Distribuição por Status Operacional</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      ${statusDistribArr.map(([s,n])=>{
        const pct=Math.round(n/regs.length*100);
        const mapC={CARREGADO:{bg:"#d4f5e6",bar:"#0a7a45",c:"#0a7a45"},PENDENTE:{bg:"#fff3cc",bar:"#f0b90b",c:"#a07000"},"EM ABERTO":{bg:"#e0e8ff",bar:"#3b82f6",c:"#2c4aab"},CANCELADO:{bg:"#ffe0d0",bar:"#ef4444",c:"#c0392b"},"NO-SHOW":{bg:"#ffe0d0",bar:"#ef4444",c:"#c0392b"},"NÃO ACEITE":{bg:"#ffd0d0",bar:"#c0392b",c:"#c0392b"}};
        const cl=mapC[(s||"").toUpperCase()]||{bg:"#f0f0f0",bar:"#aaa",c:"#555"};
        return '<div style="flex:1;min-width:130px;background:'+cl.bg+';border-radius:10px;padding:12px 14px;border:1px solid '+cl.bar+'33"><div style="font-size:18px;font-weight:900;color:'+cl.c+';line-height:1">'+n+'</div><div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:'+cl.c+';opacity:.8;margin:3px 0 6px">'+s+'</div><div style="height:4px;background:rgba(0,0,0,.08);border-radius:2px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+cl.bar+';border-radius:2px"></div></div><div style="font-size:8px;color:'+cl.c+';opacity:.7;margin-top:3px">'+pct+'%</div></div>';
      }).join("")}
    </div>`:""}
    ${fSecoes.sumario!==false && Object.keys(porMotorista).length>0?`
    <div class="section-title">Resumo por Motorista</div>
    <table>
      <thead><tr><th>Motorista</th><th>Vínculo</th><th style="text-align:right">Viagens</th><th style="text-align:right">Valor CTE</th><th style="text-align:right">Diárias</th><th style="text-align:right">Devido</th><th style="text-align:right">Pago</th></tr></thead>
      <tbody>
        ${Object.entries(porMotorista).sort((a,b)=>b[1].viagens-a[1].viagens).map(([n,v])=>`<tr>
          <td><strong>${n}</strong></td>
          <td style="font-size:9px;color:#4a5568">${motVincMap.get(n.toUpperCase().trim())||"—"}</td>
          <td style="text-align:right;font-weight:700;color:#1a3a6b">${v.viagens}</td>
          <td style="text-align:right">${v.cte>0?`R$ ${v.cte.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
          <td style="text-align:right">${v.diarias>0?`<span class="badge badge-diaria">${v.diarias}</span>`:"<span class='badge badge-ok'>0</span>"}</td>
          <td style="text-align:right;color:#c0392b">${v.diariaPrev>0?`R$ ${v.diariaPrev.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
          <td style="text-align:right;color:#0a7a45">${v.diariaPg>0?`R$ ${v.diariaPg.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>`:""}
    ${fSecoes.registros!==false?(()=>{
      const cols=filtros.colunas||{dt:true,nome:true,placa:true,origem:true,destino:true,data_carr:true,data_agenda:true,chegada:true,data_desc:true,dias:true,status:true,vl_cte:true,vl_contrato:true,diaria_prev:true,diaria_pg:true,ro:true,sgs:true};
      const colDefs=[
        {k:'dt',      h:'Espelho',      fn:r=>'<span class="dt-chip">'+(r.dt||'\u2014')+'</span>'},
        {k:'nome',    h:'Motorista',    fn:r=>'<strong>'+(r.nome||'\u2014')+'</strong>'},
        {k:'placa',   h:'Placa',        fn:r=>r.placa||'\u2014'},
        {k:'origem',  h:'Origem',       fn:r=>r.origem||'\u2014'},
        {k:'destino', h:'Destino',      fn:r=>r.destino||'\u2014'},
        {k:'cliente', h:'Cliente',      fn:r=>r.cliente||'\u2014'},
        {k:'data_carr',h:'Carregamento',fn:r=>r.data_carr||'\u2014'},
        {k:'data_agenda',h:'Agenda',    fn:r=>r.data_agenda||'\u2014'},
        {k:'chegada', h:'Chegada',      fn:r=>r.chegada||'\u2014'},
        {k:'data_desc',h:'Descarga',    fn:r=>r.data_desc||'\u2014'},
        {k:'dias',    h:'Dias',         fn:r=>r.dias||'\u2014'},
        {k:'status',  h:'Status Oper.', fn:r=>statusOperBadge(r.status)},
        {k:'vl_cte',  h:'Vl. CTE',      fn:r=>r.vl_cte?'R$ '+parseFloat(r.vl_cte).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'vl_contrato',h:'Vl. Contrato',fn:r=>r.vl_contrato?'R$ '+parseFloat(r.vl_contrato).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'adiant',  h:'Adiantamento', fn:r=>r.adiant?'R$ '+parseFloat(r.adiant).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'saldo',   h:'Saldo',        fn:r=>r.saldo?'R$ '+parseFloat(r.saldo).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'diaria_prev',h:'Di\u00e1ria Prev.',fn:r=>r.diaria_prev?'R$ '+parseFloat(r.diaria_prev).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'diaria_pg',h:'Di\u00e1ria Paga',fn:r=>r.diaria_pg?'R$ '+parseFloat(r.diaria_pg).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'cte',     h:'CTE',          fn:r=>r.cte||'\u2014'},
        {k:'mdf',     h:'MDF-e',        fn:r=>r.mdf||'\u2014'},
        {k:'nf',      h:'NF',           fn:r=>r.nf||'\u2014'},
        {k:'mat',     h:'MAT',          fn:r=>r.mat||'\u2014'},
        {k:'ro',      h:'RO',           fn:r=>r.ro||'\u2014'},
        {k:'sgs',     h:'SGS',          fn:r=>r.sgs?'<span class="badge badge-atraso">'+r.sgs+'</span>':'\u2014'},
        {k:'obs',     h:'Observa\u00e7\u00e3o',fn:r=>r.obs||'\u2014'},
      ].filter(c=>cols[c.k]);
      const rowCls=tp=>tp==='diaria'?'trip-row-diaria':tp==='atraso'?'trip-row-atraso':tp==='sem_diaria'?'trip-row-ok':'trip-row-pend';
      return '<div class="section-title">Todos os Registros no Per\u00edodo</div>'
        +(regs.length===0?'<div class="info-box">Nenhum registro encontrado para os filtros selecionados.</div>'
          :'<table><thead><tr>'+colDefs.map(c=>'<th>'+c.h+'</th>').join('')+'</tr></thead><tbody>'
          +regs.map(r=>{const tp=diariasMapG.get(r.dt)||'';return '<tr class="'+rowCls(tp)+'">'+colDefs.map(c=>'<td>'+c.fn(r)+'</td>').join('')+'</tr>';}).join('')
          +'</tbody></table>');})():""} 
    ${fSecoes.sgs!==false && sgsRange.length>0?`
    <div class="section-title">Ocorrências SGS no Período</div>
    ${sgsRange.map(s=>`<div class="sgs-item">
      <div><span class="sgs-num">SGS ${s.numero||"—"}</span></div>
      <div class="sgs-info">
        <strong style="color:#0a1628">${s.descricao||"—"}</strong><br>
        Abertura: ${s.data_chamado||"—"} · Último Retorno: ${s.ultimo_retorno||"—"}<br>
        Status: <span class="badge ${s.status==="encerrado"?"badge-ok":s.status==="andamento"?"badge-diaria":"badge-atraso"}">${s.status||"aberto"}</span>
        ${s.dt_rel?` · Espelho Relacionado: <span class="dt-chip">${s.dt_rel}</span>`:""}
      </div>
    </div>`).join("")}`:""}
    ${fSecoes.ocorr_dt!==false?(()=>{
      // Ocorrências registradas por DT (localStorage co_ocorr_XX)
      const ocorrDtList = [];
      regs.forEach(r => {
        const ocs = loadJSON(`co_ocorr_${r.dt}`,[]);
        if(ocs.length>0) ocorrDtList.push({r, ocs});
      });
      if(ocorrDtList.length===0) return "";
      return `<div class="section-title">Ocorrências por DT (Acompanhamento)</div>
      <table>
        <thead><tr><th>Espelho</th><th>Motorista</th><th>Tipo</th><th>Data/Hora</th><th>Texto</th><th>Usuário</th></tr></thead>
        <tbody>
          ${ocorrDtList.map(({r,ocs})=>ocs.map(o=>`<tr>
            <td><span class="dt-chip">${r.dt||"—"}</span></td>
            <td style="font-size:10px">${r.nome||"—"}</td>
            <td><span class="badge ${o.tipo==="alerta"?"badge-atraso":o.tipo==="status"?"badge-ok":"badge-pend"}">${o.tipo||"info"}</span></td>
            <td style="font-size:9px;white-space:nowrap">${o.data_hora?new Date(o.data_hora).toLocaleString("pt-BR"):"—"}</td>
            <td style="max-width:280px">${o.texto||"—"}</td>
            <td style="font-size:9px;color:#6b7a99">${o.usuario||"—"}</td>
          </tr>`).join("")).join("")}
        </tbody>
      </table>`;
    })():""}
    ${fSecoes.diarias!==false?(()=>{
      const diariasMapD2 = new Map(diariasData.items.map(i=>[i.r.dt,{tipo:i.tipo,dias:i.dias}]));
      const regsDiaria = regs.filter(r=>{const i=diariasMapD2.get(r.dt);return i&&(i.tipo==="diaria"||i.tipo==="atraso");});
      if(regsDiaria.length===0) return `<div class="section-title">Diárias no Período</div><p style="color:#666;font-size:11px;margin:8px 0">Nenhuma diária registrada no período.</p>`;
      const totD = regsDiaria.reduce((s,r)=>s+(parseFloat(r.diaria_prev)||0),0);
      const totPgD = regsDiaria.reduce((s,r)=>s+(parseFloat(r.diaria_pg)||0),0);
      const fmtD2 = v=>v>0?`R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—";
      return `<div class="section-title">Diárias no Período</div>
      <div class="kpi-row cols3" style="margin-bottom:10px">
        <div class="kpi yellow"><div class="kpi-val">${regsDiaria.length}</div><div class="kpi-lbl">Com Diária</div></div>
        <div class="kpi red"><div class="kpi-val" style="font-size:14px">${fmtD2(totD)}</div><div class="kpi-lbl">Total Devido</div></div>
        <div class="kpi green"><div class="kpi-val" style="font-size:14px">${fmtD2(totPgD)}</div><div class="kpi-lbl">Total Pago</div></div>
      </div>
      <table>
        <thead><tr><th>Espelho</th><th>Motorista</th><th>Placa</th><th>Carregamento</th><th>Agenda</th><th>Chegada</th><th>Descarga</th><th>Dias</th><th>Diária Prev.</th><th>Diária Paga</th><th>Saldo</th></tr></thead>
        <tbody>
          ${regsDiaria.map(r=>{
            const info=diariasMapD2.get(r.dt)||{};
            return `<tr class="trip-row-diaria">
              <td><span class="dt-chip">${r.dt||"—"}</span></td>
              <td><strong>${r.nome||"—"}</strong></td>
              <td style="font-size:9px;font-family:monospace">${r.placa||"—"}</td>
              <td>${r.data_carr||"—"}</td>
              <td>${r.data_agenda||"—"}</td>
              <td>${r.chegada||"—"}</td>
              <td>${r.data_desc||"—"}</td>
              <td style="text-align:center;font-weight:700">${info.dias!=null?info.dias:"—"}</td>
              <td>${r.diaria_prev?`R$ ${parseFloat(r.diaria_prev).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
              <td>${r.diaria_pg?`R$ ${parseFloat(r.diaria_pg).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
              <td style="font-weight:700;color:${(parseFloat(r.diaria_prev)||0)-(parseFloat(r.diaria_pg)||0)>0?"#c0392b":"#0a7a45"}">${fmtD2((parseFloat(r.diaria_prev)||0)-(parseFloat(r.diaria_pg)||0))}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
    })():""}
    ${fSecoes.descargas!==false?(()=>{
      const hojeG = new Date(); hojeG.setHours(0,0,0,0);
      const parseDA = s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);}if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s);return null;};
      const regsDesc = regs.filter(r=>r.data_agenda||r.data_desc);
      if(regsDesc.length===0) return `<div class="section-title">Descargas no Período</div><p style="color:#666;font-size:11px;margin:8px 0">Nenhuma descarga registrada no período.</p>`;
      const descOK=regsDesc.filter(r=>r.data_desc).length;
      const descAtrs=regsDesc.filter(r=>!r.data_desc&&parseDA(r.data_agenda)&&parseDA(r.data_agenda)<hojeG).length;
      const descPend=regsDesc.length-descOK-descAtrs;
      return `<div class="section-title">Descargas no Período</div>
      <div class="kpi-row cols3" style="margin-bottom:10px">
        <div class="kpi green"><div class="kpi-val">${descOK}</div><div class="kpi-lbl">Descarregados</div></div>
        <div class="kpi ${descAtrs>0?"red":"green"}"><div class="kpi-val">${descAtrs}</div><div class="kpi-lbl">Atrasados</div></div>
        <div class="kpi yellow"><div class="kpi-val">${descPend}</div><div class="kpi-lbl">Aguardando</div></div>
      </div>
      <table>
        <thead><tr><th>Espelho</th><th>Motorista</th><th>Destino</th><th>Carregamento</th><th>Agenda</th><th>Chegada</th><th>Data Descarga</th><th>Status</th><th>RO</th></tr></thead>
        <tbody>
          ${regsDesc.map(r=>{
            const dd=parseDA(r.data_desc),da=parseDA(r.data_agenda);
            const st=dd?"descarregado":(da&&da<hojeG?"atrasado":"pendente");
            const rc=st==="descarregado"?"trip-row-ok":st==="atrasado"?"trip-row-atraso":"trip-row-pend";
            const sbD=st==="descarregado"?`<span class="badge badge-ok">Descarregado</span>`:st==="atrasado"?`<span class="badge badge-atraso">Atrasado</span>`:`<span class="badge badge-pend">Aguardando</span>`;
            return `<tr class="${rc}">
              <td><span class="dt-chip">${r.dt||"—"}</span></td>
              <td><strong>${r.nome||"—"}</strong></td>
              <td>${r.destino||"—"}</td>
              <td>${r.data_carr||"—"}</td>
              <td>${r.data_agenda||"—"}</td>
              <td>${r.chegada||"—"}</td>
              <td>${r.data_desc||"—"}</td>
              <td>${sbD}</td>
              <td>${r.ro||"—"}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
    })():""}
  </div>`;
    const _html = relHtmlBase(`Relatório Geral · ${periodoStr}`, periodoStr, corpo);
    const _blob = new Blob([_html], {type:"text/html;charset=utf-8"});
    const _url  = URL.createObjectURL(_blob);
    window.open(_url, "_blank", "width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_url), 120000);
  };

  // ─── RELATÓRIO DE DIÁRIAS ──────────────────────────────────────────────────
  const gerarRelatorioDiarias = (from, to, filtros={}) => {
    const parseD2 = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
    const fromD = from ? new Date(from) : null;
    const toD   = to   ? new Date(to)   : null;
    if(toD) toD.setHours(23,59,59,999);
    const {motorista:fMot="", vinculo:fVinc="", status:fStatus=""} = filtros;
    const diariasMapD = new Map(diariasData.items.map(i=>[i.r.dt,{tipo:i.tipo,dias:i.dias}]));
    const motVincMapD = new Map(motoristas.map(m=>[m.nome?.toUpperCase()?.trim()||"",m.vinculo||""]));
    const inRangeD = r => {
      const d = parseD2(r.data_carr||r.data_desc||r.data_agenda||"");
      if(!d) return !fromD && !toD;
      if(fromD && d<fromD) return false;
      if(toD && d>toD) return false;
      return true;
    };
    const regs = DADOS.filter(r => {
      if(!diariasMapD.has(r.dt)) return false;
      if(!inRangeD(r)) return false;
      const info = diariasMapD.get(r.dt);
      if(fStatus && info.tipo!==fStatus) return false;
      if(fMot && !(r.nome||"").toUpperCase().includes(fMot.toUpperCase())) return false;
      if(fVinc && motVincMapD.get((r.nome||"").toUpperCase().trim())!==fVinc) return false;
      return true;
    }).sort((a,b)=>{const toSortD=s=>{if(!s)return"";if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return`${p[2]}-${p[1]}-${p[0]}`}return s;};return toSortD(a.data_carr||"").localeCompare(toSortD(b.data_carr||""));});
    const comD = regs.filter(r=>{const i=diariasMapD.get(r.dt)||{};return i.tipo==="diaria"||i.tipo==="atraso";});
    const totalDevido = comD.reduce((s,r)=>s+(parseFloat(r.diaria_prev)||0),0);
    const totalPago   = comD.reduce((s,r)=>s+(parseFloat(r.diaria_pg)||0),0);
    const aPagar = totalDevido-totalPago;
    const fmtD = v => `R$ ${Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    const periodoStr = fromD||toD?`${fromD?fromD.toLocaleDateString("pt-BR"):"início"} a ${toD?toD.toLocaleDateString("pt-BR"):"hoje"}`:"Todos os registros";
    const sbD = tipo=>{const m={diaria:{c:"badge-diaria",l:"Com Diária"},sem_diaria:{c:"badge-sem",l:"Sem Diária"},atraso:{c:"badge-atraso",l:"Perdeu Agenda"},pendente:{c:"badge-pend",l:"Pendente"},ok:{c:"badge-ok",l:"OK"}};const x=m[tipo]||{c:"badge-pend",l:tipo||"—"};return`<span class="badge ${x.c}">${x.l}</span>`;};
    const porMotD={};
    comD.forEach(r=>{const n=r.nome||"—";if(!porMotD[n])porMotD[n]={qtd:0,dev:0,pag:0};porMotD[n].qtd++;porMotD[n].dev+=(parseFloat(r.diaria_prev)||0);porMotD[n].pag+=(parseFloat(r.diaria_pg)||0);});
    const corpo=`
  <div class="subheader">
    <div>
      <div class="subheader-title">🛏️ Relatório de Diárias</div>
      <div class="subheader-sub">Período: ${periodoStr} · ${regs.length} registro${regs.length!==1?"s":""} · ${comD.length} com diária</div>
    </div>
  </div>
  <div class="content">
    <div class="section-title">Indicadores Financeiros de Diárias</div>
    <div class="kpi-row cols4">
      <div class="kpi blue"><div class="kpi-val">${regs.length}</div><div class="kpi-lbl">Registros no Período</div></div>
      <div class="kpi ${comD.length>0?"yellow":"green"}"><div class="kpi-val">${comD.length}</div><div class="kpi-lbl">Com Diária</div></div>
      <div class="kpi red"><div class="kpi-val" style="font-size:15px">${fmtD(totalDevido)}</div><div class="kpi-lbl">Total Devido</div></div>
      <div class="kpi green"><div class="kpi-val" style="font-size:15px">${fmtD(totalPago)}</div><div class="kpi-lbl">Total Pago</div></div>
    </div>
    <div class="kpi-row cols3">
      <div class="kpi ${aPagar>0?"red":"green"}"><div class="kpi-val" style="font-size:18px;font-weight:900">${fmtD(aPagar)}</div><div class="kpi-lbl">${aPagar>0?"💰 A Pagar":"✅ Quitado"}</div></div>
      <div class="kpi blue"><div class="kpi-val">${regs.filter(r=>{const i=diariasMapD.get(r.dt)||{};return i.tipo==="sem_diaria";}).length}</div><div class="kpi-lbl">Sem Diária</div></div>
      <div class="kpi"><div class="kpi-val">${regs.filter(r=>{const i=diariasMapD.get(r.dt)||{};return i.tipo==="pendente";}).length}</div><div class="kpi-lbl">Pendentes</div></div>
    </div>
    ${Object.keys(porMotD).length>0?`
    <div class="section-title">Resumo por Motorista</div>
    <table>
      <thead><tr><th>Motorista</th><th>Vínculo</th><th style="text-align:right">Diárias</th><th style="text-align:right">Devido</th><th style="text-align:right">Pago</th><th style="text-align:right">A Pagar</th></tr></thead>
      <tbody>${Object.entries(porMotD).sort((a,b)=>b[1].dev-a[1].dev).map(([n,v])=>`<tr>
        <td><strong>${n}</strong></td>
        <td style="font-size:9px;color:#4a5568">${motVincMapD.get(n.toUpperCase().trim())||"—"}</td>
        <td style="text-align:right;font-weight:700">${v.qtd}</td>
        <td style="text-align:right;color:#c0392b">${v.dev>0?`R$ ${v.dev.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
        <td style="text-align:right;color:#0a7a45">${v.pag>0?`R$ ${v.pag.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
        <td style="text-align:right;font-weight:800;color:${(v.dev-v.pag)>0?"#c0392b":"#0a7a45"}">${fmtD(v.dev-v.pag)}</td>
      </tr>`).join("")}</tbody>
    </table>`:""}
    <div class="section-title">Todos os Registros</div>
    ${regs.length===0?`<div class="info-box">Nenhum registro encontrado para os filtros selecionados.</div>`:`
    <table>
      <thead><tr><th>ID</th><th>Espelho</th><th>Motorista</th><th>Placa</th><th>Carregamento</th><th>Agenda</th><th>Chegada</th><th>Descarga</th><th>Status</th><th>Dias</th><th>Devido</th><th>Pago</th><th>A Pagar</th><th>CTE DCC</th><th>MDF DCC</th><th>DCC nº</th><th>Valor DCC</th><th>CTE COMP</th><th>MDF COMP</th><th>MAT COMP</th></tr></thead>
      <tbody>${regs.map(r=>{
        const info=diariasMapD.get(r.dt)||{tipo:"pendente",dias:null};
        const rc=info.tipo==="diaria"?"trip-row-diaria":info.tipo==="atraso"?"trip-row-atraso":info.tipo==="sem_diaria"?"trip-row-ok":"trip-row-pend";
        const temD=info.tipo==="diaria"||info.tipo==="atraso";
        const dev=parseFloat(r.diaria_prev)||0;
        const pag=parseFloat(r.diaria_pg)||0;
        const sal=dev-pag;
        let dccArr=[]; try{dccArr=Array.isArray(r.minutas_dcc)?r.minutas_dcc:(r.minutas_dcc?JSON.parse(r.minutas_dcc):[]);}catch{}
        const dcc0=dccArr[0]||{};
        const moreD=dccArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.cte||""}</span>`).join("");
        const moreMdf=dccArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.mdf||""}</span>`).join("");
        const moreNum=dccArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.num||""}</span>`).join("");
        const moreVal=dccArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.valor||""}</span>`).join("");
        return`<tr class="${rc}">
          <td style="font-family:monospace;font-size:9px;color:#6b7a99">${r.id_doc||"—"}</td>
          <td><span class="dt-chip">${r.dt||"—"}</span></td>
          <td><strong>${r.nome||"—"}</strong></td>
          <td style="font-family:monospace;font-size:9px">${r.placa||"—"}</td>
          <td>${r.data_carr||"—"}</td>
          <td>${r.data_agenda||"—"}</td>
          <td>${r.chegada||"—"}</td>
          <td>${r.data_desc||"—"}</td>
          <td>${sbD(info.tipo)}</td>
          <td style="text-align:center">${info.dias!=null?`<span class="badge badge-atraso">${info.dias}d</span>`:"—"}</td>
          <td style="color:#c0392b;font-weight:700">${temD&&dev>0?`R$ ${dev.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
          <td style="color:#0a7a45;font-weight:700">${temD&&pag>0?`R$ ${pag.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
          <td style="font-weight:800;color:${sal>0?"#c0392b":"#0a7a45"}">${temD?fmtD(sal):"—"}</td>
          <td style="font-size:9px;font-family:monospace">${dcc0.cte||"—"}${moreD}</td>
          <td style="font-size:9px;font-family:monospace">${dcc0.mdf||"—"}${moreMdf}</td>
          <td style="font-size:9px;font-family:monospace">${dcc0.num||"—"}${moreNum}</td>
          <td style="font-size:9px;color:#c0392b">${dcc0.valor||"—"}${moreVal}</td>
          <td style="font-size:9px;font-family:monospace">${r.cte_comp||"—"}</td>
          <td style="font-size:9px;font-family:monospace">${r.mdf_comp||"—"}</td>
          <td style="font-size:9px;font-family:monospace">${r.mat_comp||"—"}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`}
  </div>`;
    const _htmlD=relHtmlBase(`Relatório de Diárias · ${periodoStr}`,periodoStr,corpo);
    const _blobD=new Blob([_htmlD],{type:"text/html;charset=utf-8"});
    const _urlD=URL.createObjectURL(_blobD);
    window.open(_urlD,"_blank","width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_urlD),120000);
  };

  // ─── RELATÓRIO DE DESCARGAS ────────────────────────────────────────────────
  const gerarRelatorioDescargas = (from, to, filtros={}) => {
    const parseD3 = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
    const fromD = from ? new Date(from) : null;
    const toD   = to   ? new Date(to)   : null;
    if(toD) toD.setHours(23,59,59,999);
    const hojeD = new Date(); hojeD.setHours(0,0,0,0);
    const {motorista:fMot3="", status:fStatus3=""} = filtros;
    const inRange3 = r => {
      const d = parseD3(r.data_desc||r.data_agenda||r.chegada||"");
      if(!d) return !fromD && !toD;
      if(fromD && d<fromD) return false;
      if(toD && d>toD) return false;
      return true;
    };
    const getStatusDsc = r => {
      const dd = parseD3(r.data_desc); const da = parseD3(r.data_agenda);
      if(dd) return "descarregado";
      if(da && da<hojeD) return "atrasado";
      return "pendente";
    };
    const regs = DADOS.filter(r => {
      if(!r.data_agenda && !r.data_desc) return false;
      if(!inRange3(r)) return false;
      if(fMot3 && !(r.nome||"").toUpperCase().includes(fMot3.toUpperCase())) return false;
      if(fStatus3 && getStatusDsc(r)!==fStatus3) return false;
      return true;
    }).sort((a,b)=>{const toSort3=s=>{if(!s)return"";if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return`${p[2]}-${p[1]}-${p[0]}`}return s;};return toSort3(a.data_agenda||"").localeCompare(toSort3(b.data_agenda||""));});
    const descarregados=regs.filter(r=>!!r.data_desc);
    const atrasados=regs.filter(r=>!r.data_desc&&parseD3(r.data_agenda)&&parseD3(r.data_agenda)<hojeD);
    const pendentes=regs.filter(r=>!r.data_desc&&!(parseD3(r.data_agenda)&&parseD3(r.data_agenda)<hojeD));
    const periodoStr=fromD||toD?`${fromD?fromD.toLocaleDateString("pt-BR"):"início"} a ${toD?toD.toLocaleDateString("pt-BR"):"hoje"}`:"Todos os registros";
    const sbDsc=r=>{const s=getStatusDsc(r);if(s==="descarregado")return`<span class="badge badge-ok">Descarregado</span>`;if(s==="atrasado")return`<span class="badge badge-atraso">Atrasado</span>`;return`<span class="badge badge-pend">Aguardando</span>`;};
    const getDias=r=>{const da=parseD3(r.data_agenda);const dd=parseD3(r.data_desc);if(!da)return null;const ref=dd||hojeD;const diff=Math.floor((ref-da)/86400000);return diff>0?diff:null;};
    const txPercDesc = regs.length>0?Math.round(descarregados.length/regs.length*100):0;
    const corpo=`
  <div class="subheader">
    <div>
      <div class="subheader-title">📦 Relatório de Descargas</div>
      <div class="subheader-sub">Período: ${periodoStr} · ${regs.length} registro${regs.length!==1?"s":""} · ${txPercDesc}% descarregados</div>
    </div>
  </div>
  <div class="content">
    <div class="section-title">Indicadores de Descarga</div>
    <div class="kpi-row cols4">
      <div class="kpi blue"><div class="kpi-val">${regs.length}</div><div class="kpi-lbl">Total de Registros</div></div>
      <div class="kpi green"><div class="kpi-val">${descarregados.length}</div><div class="kpi-lbl">Descarregados</div></div>
      <div class="kpi ${atrasados.length>0?"red":"green"}"><div class="kpi-val">${atrasados.length}</div><div class="kpi-lbl">Atrasados</div></div>
      <div class="kpi yellow"><div class="kpi-val">${pendentes.length}</div><div class="kpi-lbl">Aguardando</div></div>
    </div>
    <div class="section-title">Registros de Descarga</div>
    ${regs.length===0?`<div class="info-box">Nenhum registro encontrado para os filtros selecionados.</div>`:`
    <table>
      <thead><tr><th>ID</th><th>Espelho</th><th>Motorista</th><th>Placa</th><th>Origem</th><th>Destino</th><th>Carregamento</th><th>Agenda</th><th>Chegada</th><th>Data Descarga</th><th>Status</th><th>Dias</th><th>RO</th><th>Tipo</th><th>CTE</th><th>MDF</th><th>Nº</th></tr></thead>
      <tbody>${regs.map(r=>{
        const st=getStatusDsc(r);
        const rc=st==="descarregado"?"trip-row-ok":st==="atrasado"?"trip-row-atraso":"trip-row-pend";
        const dias=getDias(r);
        let dscArr=[]; try{dscArr=Array.isArray(r.minutas_dsc)?r.minutas_dsc:(r.minutas_dsc?JSON.parse(r.minutas_dsc):[]);}catch{}
        const dsc0=dscArr[0]||{};
        const moreTyp=dscArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.tipo||""}</span>`).join("");
        const moreCte=dscArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.cte||""}</span>`).join("");
        const moreMdf=dscArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.mdf||""}</span>`).join("");
        const moreNum=dscArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.num||""}</span>`).join("");
        return`<tr class="${rc}">
          <td style="font-family:monospace;font-size:9px;color:#6b7a99">${r.id_doc||"—"}</td>
          <td><span class="dt-chip">${r.dt||"—"}</span></td>
          <td><strong>${r.nome||"—"}</strong></td>
          <td style="font-family:monospace;font-size:9px">${r.placa||"—"}</td>
          <td>${r.origem||"—"}</td>
          <td>${r.destino||"—"}</td>
          <td>${r.data_carr||"—"}</td>
          <td>${r.data_agenda||"—"}</td>
          <td>${r.chegada||"—"}</td>
          <td>${r.data_desc||"—"}</td>
          <td>${sbDsc(r)}</td>
          <td style="text-align:center">${dias!=null?`<span class="badge badge-atraso">${dias}d</span>`:"—"}</td>
          <td>${r.ro||"—"}</td>
          <td style="font-size:9px;font-weight:700;color:#1677ff">${dsc0.tipo||"—"}${moreTyp}</td>
          <td style="font-size:9px;font-family:monospace">${dsc0.cte||"—"}${moreCte}</td>
          <td style="font-size:9px;font-family:monospace">${dsc0.mdf||"—"}${moreMdf}</td>
          <td style="font-size:9px;font-family:monospace">${dsc0.num||"—"}${moreNum}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`}
  </div>`;
    const _htmlDsc=relHtmlBase(`Relatório de Descargas · ${periodoStr}`,periodoStr,corpo);
    const _blobDsc=new Blob([_htmlDsc],{type:"text/html;charset=utf-8"});
    const _urlDsc=URL.createObjectURL(_blobDsc);
    window.open(_urlDsc,"_blank","width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_urlDsc),120000);
  };

  // ─── RELATÓRIO OPERACIONAL (SGS + Apontamentos) ────────────────────────────
  const gerarRelatorioOperacional = (from, to, secoes={sgs:true,apontamentos:true}) => {
    const parseD4 = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
    const fromD = from ? new Date(from) : null;
    const toD   = to   ? new Date(to)   : null;
    if(toD) toD.setHours(23,59,59,999);
    const inRangeOp = (dateStr) => {
      const d = parseD4(dateStr||"");
      if(!d) return !fromD && !toD;
      if(fromD && d<fromD) return false;
      if(toD && d>toD) return false;
      return true;
    };
    const periodoStr4 = fromD||toD ? `${fromD?fromD.toLocaleDateString("pt-BR"):"início"} a ${toD?toD.toLocaleDateString("pt-BR"):"hoje"}` : "Todos os registros";
    // Filtrar SGS
    const sgsOp = sgsItems.filter(s => inRangeOp(s.data_chamado||s.ultimo_retorno||s.criado_em||""));
    // Filtrar Apontamentos
    const apontOp = apontItems.filter(a => inRangeOp(a.criado_em||a.mes_ref||""));
    // Badge de status SGS
    const sgsBadge = s => {
      if(s==="encerrado") return `<span class="badge badge-ok">Encerrado</span>`;
      if(s==="andamento") return `<span class="badge badge-diaria">Em Andamento</span>`;
      return `<span class="badge badge-atraso">Aberto</span>`;
    };
    const fmtVal = v => v?`R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—";
    const corpo4 = `
  <div class="subheader">
    <div>
      <div class="subheader-title">📋 Relatório Operacional</div>
      <div class="subheader-sub">Período: ${periodoStr4} · SGS: ${sgsOp.length} · Apontamentos: ${apontOp.length}</div>
    </div>
  </div>
  <div class="content">
    <div class="section-title">Resumo do Período</div>
    <div class="kpi-row cols3">
      <div class="kpi blue"><div class="kpi-val">${sgsOp.length}</div><div class="kpi-lbl">Chamados SGS</div></div>
      <div class="kpi ${sgsOp.filter(s=>s.status!=="encerrado").length>0?"red":"green"}"><div class="kpi-val">${sgsOp.filter(s=>s.status!=="encerrado").length}</div><div class="kpi-lbl">SGS em Aberto</div></div>
      <div class="kpi yellow"><div class="kpi-val">${apontOp.length}</div><div class="kpi-lbl">Apontamentos</div></div>
    </div>
    ${secoes.sgs!==false && sgsOp.length>0?`
    <div class="section-title">SGS — Chamados de Ocorrência</div>
    <table>
      <thead><tr><th>SGS</th><th>Descrição</th><th>Abertura</th><th>Último Retorno</th><th>Status</th><th>DT Relacionado</th><th>Retornos</th></tr></thead>
      <tbody>
      ${sgsOp.map(s=>{
        const rets = Array.isArray(s.retornos)?s.retornos:[];
        const rc = s.status==="encerrado"?"trip-row-ok":s.status==="andamento"?"trip-row-pend":"trip-row-atraso";
        return `<tr class="${rc}">
          <td><strong>SGS ${s.numero||"—"}</strong></td>
          <td>${s.descricao||"—"}</td>
          <td>${s.data_chamado||"—"}</td>
          <td>${s.ultimo_retorno||"—"}</td>
          <td>${sgsBadge(s.status)}</td>
          <td>${s.dt_rel?`<span class="dt-chip">${s.dt_rel}</span>`:"—"}</td>
          <td style="font-size:9px;max-width:220px">${rets.length>0?rets.map(r=>`<div style="margin-bottom:3px"><strong>${r.data||""}</strong>: ${r.descricao||""}</div>`).join(""):"—"}</td>
        </tr>`;
      }).join("")}
      </tbody>
    </table>`:secoes.sgs!==false?`<div class="section-title">SGS — Chamados de Ocorrência</div><p style="color:#666;font-size:11px;margin:8px 0">Nenhum chamado SGS no período.</p>`:""}
    ${secoes.apontamentos!==false && apontOp.length>0?`
    <div class="section-title">Apontamentos (Descarga / Stretch)</div>
    <table>
      <thead><tr><th>Nº</th><th>Pedido</th><th>Mês Ref.</th><th>Filial</th><th>Tipo</th><th>FRS · Folha</th><th>Valor</th><th>DT Relacionado</th><th>Cadastrado em</th></tr></thead>
      <tbody>
      ${apontOp.map(a=>{
        const rc = !a.frs_folha?"trip-row-atraso":"trip-row-ok";
        return `<tr class="${rc}">
          <td><strong>${a.numero||"—"}</strong></td>
          <td>${a.pedido||"—"}</td>
          <td>${a.mes_ref||"—"}</td>
          <td>${a.filial||"—"}</td>
          <td>${a.tipo||"—"}</td>
          <td>${a.frs_folha||`<span style="color:#c0392b;font-weight:700">⚠️ PENDENTE</span>`}</td>
          <td>${fmtVal(a.valor)}</td>
          <td>${a.dt_rel?`<span class="dt-chip">${a.dt_rel}</span>`:"—"}</td>
          <td style="font-size:9px">${a.criado_em?new Date(a.criado_em).toLocaleDateString("pt-BR"):"—"}</td>
        </tr>`;
      }).join("")}
      </tbody>
    </table>`:secoes.apontamentos!==false?`<div class="section-title">Apontamentos</div><p style="color:#666;font-size:11px;margin:8px 0">Nenhum apontamento no período.</p>`:""}
  </div>`;
    const _htmlOp = relHtmlBase(`Relatório Operacional · ${periodoStr4}`, periodoStr4, corpo4);
    const _blobOp = new Blob([_htmlOp],{type:"text/html;charset=utf-8"});
    const _urlOp = URL.createObjectURL(_blobOp);
    window.open(_urlOp,"_blank","width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_urlOp),120000);
  };

  return {
    relHtmlBase,
    gerarRelatorioGeral,
    gerarRelatorioDiarias,
    gerarRelatorioDescargas,
    gerarRelatorioOperacional,
  };
}
