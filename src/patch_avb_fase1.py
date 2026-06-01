#!/usr/bin/env python3
"""
patch_avb_fase1.py — Etapas 1, 2 e parcial 5 do plano AVB
ESCOPO: somente módulo AVB (acailandia_avb). Zero impacto em outros módulos.
"""
import re, sys

SRC = "C:/Users/yvesf/DevYFGroup/controle-operacional/src/App.jsx"

with open(SRC, encoding="utf-8") as f:
    txt = f.read()

original = txt

# ─────────────────────────────────────────────────────────────
# ETAPA 1 — Adicionar campos AVB ao SUPA_KNOWN_COLS
# Insere após a linha de "obs","sinistro","ocorrencias" (antes do fechamento ])
# ─────────────────────────────────────────────────────────────
OLD_COLS = '    "obs","sinistro","ocorrencias"\n  ];'
NEW_COLS = (
    '    "obs","sinistro","ocorrencias",\n'
    '    // ── Campos exclusivos AVB (acailandia_avb) ──\n'
    '    "codigo","data_homerico","data_liberacao","gerenciadora",\n'
    '    "rdo","contrato_mat","cadastro_fortes","cte_comp_num","cte_comp_vlr",\n'
    '    "contratante"\n'
    '  ];'
)
if OLD_COLS in txt:
    txt = txt.replace(OLD_COLS, NEW_COLS, 1)
    print("✓ Etapa 1: SUPA_KNOWN_COLS expandido com campos AVB")
else:
    print("✗ Etapa 1: padrão não encontrado em SUPA_KNOWN_COLS")

# ─────────────────────────────────────────────────────────────
# ETAPA 2 — Corrigir dashData: origens dinâmicas para AVB
# Substitui o bloco de ORIGENS_PERMITIDAS fixo por lógica condicional
# ─────────────────────────────────────────────────────────────
OLD_DASH = (
    '    // Origens fixas: apenas BELEM-PA e IMPERATRIZ-MA (confirmado no Supabase)\n'
    '    const ORIGENS_PERMITIDAS = [\n'
    '      { norm: "BELEM",      label: "BELEM-PA" },\n'
    '      { norm: "IMPERATRIZ", label: "IMPERATRIZ-MA" },\n'
    '    ];\n'
    '    // Filtra cidades pelo mês selecionado — mês seletor como origem dos filtros disponíveis\n'
    '    const mesRegs = dashMes === "todos" ? DADOS : (grupos[dashMes]?.regs || []);\n'
    '    const cidades = ORIGENS_PERMITIDAS\n'
    '      .filter(o => mesRegs.some(r => normOrigem(r.origem) === o.norm))\n'
    '      .map(o => o.norm);\n'
)
NEW_DASH = (
    '    // AVB: origens dinâmicas (qualquer cidade presente nos dados)\n'
    '    // Imperatriz/Belém: origens fixas para o filtro do dashboard\n'
    '    const ORIGENS_PERMITIDAS = [\n'
    '      { norm: "BELEM",      label: "BELEM-PA" },\n'
    '      { norm: "IMPERATRIZ", label: "IMPERATRIZ-MA" },\n'
    '    ];\n'
    '    // Filtra cidades pelo mês selecionado — mês seletor como origem dos filtros disponíveis\n'
    '    const mesRegs = dashMes === "todos" ? DADOS : (grupos[dashMes]?.regs || []);\n'
    '    const cidades = baseAtual?.id === "acailandia_avb"\n'
    '      ? [...new Set(mesRegs.map(r => normOrigem(r.origem)).filter(Boolean))]\n'
    '      : ORIGENS_PERMITIDAS.filter(o => mesRegs.some(r => normOrigem(r.origem) === o.norm)).map(o => o.norm);\n'
)
if OLD_DASH in txt:
    txt = txt.replace(OLD_DASH, NEW_DASH, 1)
    print("✓ Etapa 2a: dashData origens dinâmicas para AVB")
else:
    print("✗ Etapa 2a: padrão não encontrado no dashData origens")

# Adicionar baseAtual nas deps do dashData useMemo
OLD_DEPS = '  }, [DADOS, dashMes, dashOrigem]);'
NEW_DEPS = '  }, [DADOS, dashMes, dashOrigem, baseAtual]);'
if OLD_DEPS in txt:
    txt = txt.replace(OLD_DEPS, NEW_DEPS, 1)
    print("✓ Etapa 2b: baseAtual adicionado às deps do dashData")
else:
    print("✗ Etapa 2b: padrão não encontrado nas deps do dashData")

# Adicionar métricas financeiras AVB ao dashData (soma contrato, adt, saldo excluindo PENDENTES)
OLD_CTET = '    let cteT = 0; filtrado.forEach(r=>{ const v=parseFloat(r.vl_cte); if(!isNaN(v)) cteT+=v; })\n'
NEW_CTET = (
    '    let cteT = 0; filtrado.forEach(r=>{ const v=parseFloat(r.vl_cte); if(!isNaN(v)) cteT+=v; })\n'
    '    // ── Financeiro AVB — excluir PENDENTES das somas ──\n'
    '    let avbContratoT=0, avbAdtT=0, avbSaldoT=0;\n'
    '    if (baseAtual?.id === "acailandia_avb") {\n'
    '      filtrado.filter(r=>(r.status||"").toUpperCase()!=="PENDENTE").forEach(r=>{\n'
    '        const vc=parseFloat(String(r.vl_contrato||"").replace(/[R$\\s.]/g,"").replace(",","."));\n'
    '        const va=parseFloat(String(r.adiant||"").replace(/[R$\\s.]/g,"").replace(",","."));\n'
    '        const vs=parseFloat(String(r.saldo||"").replace(/[R$\\s.]/g,"").replace(",","."));\n'
    '        if(!isNaN(vc)) avbContratoT+=vc;\n'
    '        if(!isNaN(va)) avbAdtT+=va;\n'
    '        if(!isNaN(vs)) avbSaldoT+=vs;\n'
    '      });\n'
    '    }\n'
)
# Procurar versão sem \n final (pode ter espaços distintos)
pat = r'    let cteT = 0; filtrado\.forEach\(r=>\{ const v=parseFloat\(r\.vl_cte\); if\(!isNaN\(v\)\) cteT\+=v; \}\);?\n'
m = re.search(pat, txt)
if m:
    old_str = m.group(0)
    new_str = old_str + (
        '    // ── Financeiro AVB — excluir PENDENTES das somas ──\n'
        '    let avbContratoT=0, avbAdtT=0, avbSaldoT=0;\n'
        '    if (baseAtual?.id === "acailandia_avb") {\n'
        '      filtrado.filter(r=>(r.status||"").toUpperCase()!=="PENDENTE").forEach(r=>{\n'
        '        const vc=parseFloat(String(r.vl_contrato||"").replace(/[R$\\s.]/g,"").replace(",","."));\n'
        '        const va=parseFloat(String(r.adiant||"").replace(/[R$\\s.]/g,"").replace(",","."));\n'
        '        const vs=parseFloat(String(r.saldo||"").replace(/[R$\\s.]/g,"").replace(",","."));\n'
        '        if(!isNaN(vc)) avbContratoT+=vc;\n'
        '        if(!isNaN(va)) avbAdtT+=va;\n'
        '        if(!isNaN(vs)) avbSaldoT+=vs;\n'
        '      });\n'
        '    }\n'
    )
    txt = txt.replace(old_str, new_str, 1)
    print("✓ Etapa 2c: somas financeiras AVB adicionadas ao dashData")
else:
    print("✗ Etapa 2c: padrão cteT não encontrado")

# Incluir as novas métricas no return do dashData
OLD_RETURN = '    return { grupos, meses, filtrado, dtsU, cteT, cidades, normOrigem };'
NEW_RETURN = '    return { grupos, meses, filtrado, dtsU, cteT, cidades, normOrigem, avbContratoT, avbAdtT, avbSaldoT };'
if OLD_RETURN in txt:
    txt = txt.replace(OLD_RETURN, NEW_RETURN, 1)
    print("✓ Etapa 2d: retorno do dashData inclui métricas AVB")
else:
    print("✗ Etapa 2d: padrão return dashData não encontrado")

# ─────────────────────────────────────────────────────────────
# ETAPA 5 (alertas AVB) — adicionar flags de inconsistência
# ─────────────────────────────────────────────────────────────
OLD_ALERTAS = (
    '    DADOS.forEach(r => {\n'
    '      if (!r.nome?.trim()) return;\n'
    '      const da = parseData(r.data_agenda), dd = parseData(r.data_desc);\n'
    '      // Alerta de atraso na descarga — inclui ref. ao registro para botão de calendário\n'
    '      if (da && !dd) { const dif = diffDias(da,hoje); if (dif>=1) list.push({tipo:"danger",cat:"descarga",txt:`🚨 ${r.nome} · DT ${r.dt} · Agenda ${r.data_agenda} sem descarga (${dif}d)`,reg:r}); }\n'
    '      // Alerta de cobrança — saldo pendente após descarga\n'
    '      const saldo = parseFloat(r.saldo);\n'
    '      if (!isNaN(saldo) && saldo > 0 && dd) {\n'
    '        list.push({tipo:"warn",cat:"cobranca",txt:`💰 Cobrança pendente: ${r.nome} · DT ${r.dt} · Saldo ${fmtMoeda(r.saldo)}`,reg:r});\n'
    '      }\n'
    '    });\n'
    '    return list;\n'
    '  }, [DADOS]);'
)
NEW_ALERTAS = (
    '    DADOS.forEach(r => {\n'
    '      if (!r.nome?.trim()) return;\n'
    '      // ── Alertas AVB (somente base acailandia_avb) ──\n'
    '      if (baseAtual?.id === "acailandia_avb") {\n'
    '        const camposDatas = [r.data_carr, r.data_homerico, r.data_liberacao, r.data_manifesto];\n'
    '        const dataInvalida = camposDatas.some(d => d && !/^\\d{2}\\/\\d{2}\\/\\d{4}/.test(d) && !/^\\d{4}-\\d{2}-\\d{2}/.test(d));\n'
    '        if (dataInvalida) list.push({tipo:"warn",cat:"data_avb",txt:`Data inválida: ${r.contratante||r.nome} · Cód ${r.codigo||"—"}`,reg:r});\n'
    '        const semDoc = !r.cte || !r.mdf || !r.nf;\n'
    '        if (semDoc && (r.status||"").toUpperCase()==="CARREGADO") list.push({tipo:"info",cat:"doc_avb",txt:`Docs incompletos: ${r.contratante||r.nome} · Cód ${r.codigo||"—"}`,reg:r});\n'
    '        const codZero = !r.codigo || r.codigo==="0" || r.codigo==="00" || r.codigo==="000";\n'
    '        if (codZero) list.push({tipo:"info",cat:"revisao_avb",txt:`Revisão: código zerado · ${r.contratante||r.nome} · ${r.data_carr||"s/data"}`,reg:r});\n'
    '        return; // alertas AVB tratados — não aplicar alertas de descarga/saldo\n'
    '      }\n'
    '      // ── Alertas padrão (Imperatriz/Belém / Maracanau) ──\n'
    '      const da = parseData(r.data_agenda), dd = parseData(r.data_desc);\n'
    '      // Alerta de atraso na descarga — inclui ref. ao registro para botão de calendário\n'
    '      if (da && !dd) { const dif = diffDias(da,hoje); if (dif>=1) list.push({tipo:"danger",cat:"descarga",txt:`🚨 ${r.nome} · DT ${r.dt} · Agenda ${r.data_agenda} sem descarga (${dif}d)`,reg:r}); }\n'
    '      // Alerta de cobrança — saldo pendente após descarga\n'
    '      const saldo = parseFloat(r.saldo);\n'
    '      if (!isNaN(saldo) && saldo > 0 && dd) {\n'
    '        list.push({tipo:"warn",cat:"cobranca",txt:`💰 Cobrança pendente: ${r.nome} · DT ${r.dt} · Saldo ${fmtMoeda(r.saldo)}`,reg:r});\n'
    '      }\n'
    '    });\n'
    '    return list;\n'
    '  }, [DADOS, baseAtual]);'
)
if OLD_ALERTAS in txt:
    txt = txt.replace(OLD_ALERTAS, NEW_ALERTAS, 1)
    print("✓ Etapa 5: alertas AVB adicionados (data inválida, docs, código zero)")
else:
    print("✗ Etapa 5: padrão de alertas não encontrado")

# ─────────────────────────────────────────────────────────────
# Salvar
# ─────────────────────────────────────────────────────────────
if txt == original:
    print("\n⚠️  Nenhuma alteração foi aplicada — verifique os padrões acima")
    sys.exit(1)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(txt)
print(f"\n✅ App.jsx salvo com {txt.count(chr(10))} linhas")
