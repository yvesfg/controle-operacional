#!/usr/bin/env python3
"""
patch_avb_planilha.py — Etapa 4 do plano AVB
- Corrige parseYMfilt para usar data_homerico/data_manifesto como fallback (AVB)
- Expande busca textual para campos AVB (codigo, cte, mdf, nf, cliente, contratante, gerenciadora)
- Adiciona filtros AVB na toolbar (contratante, gerenciadora) via ctx.baseAtual
- Colunas AVB dedicadas quando baseAtual.id === "acailandia_avb"
ESCOPO: somente AVB — a lógica original para outros módulos não é alterada.
"""
import sys

SRC = "C:/Users/yvesf/DevYFGroup/controle-operacional/src/views/PlanilhaView.jsx"

with open(SRC, encoding="utf-8") as f:
    txt = f.read()

original = txt

# ── 1. Adicionar baseAtual no destructuring do ctx ──────────────────
OLD_DESTRUCT = (
    '    t, isMobile,\n'
    '    ExportMenu,\n'
    '  } = ctx;'
)
NEW_DESTRUCT = (
    '    t, isMobile,\n'
    '    ExportMenu,\n'
    '    baseAtual,\n'
    '    planilhaFiltroContratante, setPlanilhaFiltroContratante,\n'
    '    planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora,\n'
    '  } = ctx;'
)
if OLD_DESTRUCT in txt:
    txt = txt.replace(OLD_DESTRUCT, NEW_DESTRUCT, 1)
    print("OK 1: baseAtual + filtros AVB no destructuring")
else:
    print("FAIL 1: destructuring nao encontrado")

# ── 2. Expandir parseYMfilt para usar campos AVB como fallback ───────
OLD_PYM = (
    'function parseYMfilt(s) {\n'
    '  if (!s) return null;\n'
    '  if (/^\\d{2}\\/\\d{2}\\/\\d{4}/.test(s)) { const p = s.split("/"); return { ano: p[2], mes: p[1] }; }\n'
    '  if (/^\\d{4}-\\d{2}-\\d{2}/.test(s))   { const p = s.split("-"); return { ano: p[0], mes: p[1] }; }\n'
    '  return null;\n'
    '}'
)
NEW_PYM = (
    'function parseYMfilt(s) {\n'
    '  if (!s) return null;\n'
    '  const str = String(s).trim();\n'
    '  if (/^\\d{2}\\/\\d{2}\\/\\d{4}/.test(str)) { const p = str.split("/"); return { ano: p[2], mes: p[1] }; }\n'
    '  if (/^\\d{4}-\\d{2}-\\d{2}/.test(str))   { const p = str.split("-"); return { ano: p[0], mes: p[1] }; }\n'
    '  return null;\n'
    '}\n'
    '\n'
    '// AVB: extrai ano/mes tentando varios campos de data do registro\n'
    'function parseYMfiltAvb(r) {\n'
    '  const campos = [r.data_carr, r.data_homerico, r.data_manifesto, r.data_liberacao];\n'
    '  for (const c of campos) {\n'
    '    const ym = parseYMfilt(c);\n'
    '    if (ym) return ym;\n'
    '  }\n'
    '  return null;\n'
    '}'
)
if OLD_PYM in txt:
    txt = txt.replace(OLD_PYM, NEW_PYM, 1)
    print("OK 2: parseYMfiltAvb adicionado")
else:
    print("FAIL 2: parseYMfilt nao encontrado")

# ── 3. Usar parseYMfiltAvb nos filtros disponiveis quando AVB ─────────
# anos
OLD_ANOS = (
    '  const anosDisp = [...new Set(DADOS.map(r => {\n'
    '    const ym = parseYMfilt(r.data_carr || r.data_desc || "");\n'
    '    return ym?.ano;\n'
    '  }).filter(Boolean))].sort((a, b) => b.localeCompare(a));'
)
NEW_ANOS = (
    '  const isAvb = baseAtual?.id === "acailandia_avb";\n'
    '  const anosDisp = [...new Set(DADOS.map(r => {\n'
    '    const ym = isAvb ? parseYMfiltAvb(r) : parseYMfilt(r.data_carr || r.data_desc || "");\n'
    '    return ym?.ano;\n'
    '  }).filter(Boolean))].sort((a, b) => b.localeCompare(a));'
)
if OLD_ANOS in txt:
    txt = txt.replace(OLD_ANOS, NEW_ANOS, 1)
    print("OK 3a: anosDisp usa parseYMfiltAvb")
else:
    print("FAIL 3a: anosDisp nao encontrado")

# meses
OLD_MESES = (
    '  const mesesDisp = [...new Set(DADOS.filter(r => {\n'
    '    if (!planilhaFiltroAno) return true;\n'
    '    const ym = parseYMfilt(r.data_carr || r.data_desc || "");\n'
    '    return ym?.ano === planilhaFiltroAno;\n'
    '  }).map(r => {\n'
    '    const ym = parseYMfilt(r.data_carr || r.data_desc || "");\n'
    '    return ym?.mes;\n'
    '  }).filter(Boolean))].sort();'
)
NEW_MESES = (
    '  const mesesDisp = [...new Set(DADOS.filter(r => {\n'
    '    if (!planilhaFiltroAno) return true;\n'
    '    const ym = isAvb ? parseYMfiltAvb(r) : parseYMfilt(r.data_carr || r.data_desc || "");\n'
    '    return ym?.ano === planilhaFiltroAno;\n'
    '  }).map(r => {\n'
    '    const ym = isAvb ? parseYMfiltAvb(r) : parseYMfilt(r.data_carr || r.data_desc || "");\n'
    '    return ym?.mes;\n'
    '  }).filter(Boolean))].sort();'
)
if OLD_MESES in txt:
    txt = txt.replace(OLD_MESES, NEW_MESES, 1)
    print("OK 3b: mesesDisp usa parseYMfiltAvb")
else:
    print("FAIL 3b: mesesDisp nao encontrado")

# ── 4. Expandir filtro de dados (dadosFiltrados) para AVB ─────────────
OLD_FILT_YM = (
    '  const dadosFiltrados = DADOS.filter(r => {\n'
    '    const ym = parseYMfilt(r.data_carr || r.data_desc || "");\n'
    '    if (planilhaFiltroAno   && ym?.ano !== planilhaFiltroAno)   return false;\n'
    '    if (planilhaFiltroMes   && ym?.mes !== planilhaFiltroMes)   return false;\n'
    '    if (planilhaFiltroOrigem && planilhaFiltroOrigem !== "todas"\n'
    '        && (r.origem || "").trim() !== planilhaFiltroOrigem)    return false;\n'
    '    if (planilhaFiltroDataDe && toISO(r.data_carr||r.data_agenda||"") < planilhaFiltroDataDe) return false;\n'
    '    if (planilhaFiltroDataAte && toISO(r.data_carr||r.data_agenda||"") > planilhaFiltroDataAte) return false;\n'
    '    if (planilhaBusca) {\n'
    '      const q = planilhaBusca.trim().toLowerCase();\n'
    '      const match = (r.dt||"").toLowerCase().includes(q)\n'
    '        || (r.placa||"").toLowerCase().includes(q)\n'
    '        || (r.nome||"").toLowerCase().includes(q);\n'
    '      if (!match) return false;\n'
    '    }\n'
    '    if (planilhaFiltroStatus) {\n'
    '      const s = (r.status||"Sem Status");\n'
    '      if (s !== planilhaFiltroStatus) return false;\n'
    '    }\n'
    '    return true;\n'
    '  });'
)
NEW_FILT_YM = (
    '  const dadosFiltrados = DADOS.filter(r => {\n'
    '    const ym = isAvb ? parseYMfiltAvb(r) : parseYMfilt(r.data_carr || r.data_desc || "");\n'
    '    if (planilhaFiltroAno   && ym?.ano !== planilhaFiltroAno)   return false;\n'
    '    if (planilhaFiltroMes   && ym?.mes !== planilhaFiltroMes)   return false;\n'
    '    if (planilhaFiltroOrigem && planilhaFiltroOrigem !== "todas"\n'
    '        && (r.origem || "").trim() !== planilhaFiltroOrigem)    return false;\n'
    '    if (planilhaFiltroDataDe && toISO(r.data_carr||r.data_agenda||"") < planilhaFiltroDataDe) return false;\n'
    '    if (planilhaFiltroDataAte && toISO(r.data_carr||r.data_agenda||"") > planilhaFiltroDataAte) return false;\n'
    '    // Filtros exclusivos AVB\n'
    '    if (isAvb && planilhaFiltroContratante && (r.contratante||"").trim() !== planilhaFiltroContratante) return false;\n'
    '    if (isAvb && planilhaFiltroGerenciadora && (r.gerenciadora||"").trim() !== planilhaFiltroGerenciadora) return false;\n'
    '    if (planilhaBusca) {\n'
    '      const q = planilhaBusca.trim().toLowerCase();\n'
    '      const matchBase = (r.dt||"").toLowerCase().includes(q)\n'
    '        || (r.placa||"").toLowerCase().includes(q)\n'
    '        || (r.nome||"").toLowerCase().includes(q);\n'
    '      // AVB: busca expandida\n'
    '      const matchAvb = isAvb && (\n'
    '        (r.codigo||"").toLowerCase().includes(q)\n'
    '        || (r.cte||"").toLowerCase().includes(q)\n'
    '        || (r.mdf||"").toLowerCase().includes(q)\n'
    '        || (r.nf||"").toLowerCase().includes(q)\n'
    '        || (r.cliente||"").toLowerCase().includes(q)\n'
    '        || (r.contratante||"").toLowerCase().includes(q)\n'
    '        || (r.gerenciadora||"").toLowerCase().includes(q)\n'
    '        || (r.placa2||"").toLowerCase().includes(q)\n'
    '      );\n'
    '      if (!matchBase && !matchAvb) return false;\n'
    '    }\n'
    '    if (planilhaFiltroStatus) {\n'
    '      const s = (r.status||"Sem Status");\n'
    '      if (s !== planilhaFiltroStatus) return false;\n'
    '    }\n'
    '    return true;\n'
    '  });'
)
if OLD_FILT_YM in txt:
    txt = txt.replace(OLD_FILT_YM, NEW_FILT_YM, 1)
    print("OK 4: filtros AVB expandidos no dadosFiltrados")
else:
    print("FAIL 4: dadosFiltrados nao encontrado")

# ── 5. Colunas AVB na grade ────────────────────────────────────────────
OLD_COLS_DEF = (
    'const COLS = [\n'
    '  {h:"DT",        k:"dt",         w:"11%"},\n'
    '  {h:"Motorista", k:"nome",        w:"18%"},\n'
    '  {h:"Placa",     k:"placa",       w:"11%"},\n'
    '  {h:"Origem",    k:"origem",      w:"13%"},\n'
    '  {h:"Destino",   k:"destino",     w:"13%"},\n'
    '  {h:"Carreg.",   k:"data_carr",   w:"11%"},\n'
    '  {h:"Agenda",    k:"data_agenda", w:"11%"},\n'
    '  {h:"Desc.",     k:"data_desc",   w:"11%"},\n'
    '  {h:"Status",    k:"status",      w:"11%"},\n'
    '];'
)
NEW_COLS_DEF = (
    'const COLS = [\n'
    '  {h:"DT",        k:"dt",         w:"11%"},\n'
    '  {h:"Motorista", k:"nome",        w:"18%"},\n'
    '  {h:"Placa",     k:"placa",       w:"11%"},\n'
    '  {h:"Origem",    k:"origem",      w:"13%"},\n'
    '  {h:"Destino",   k:"destino",     w:"13%"},\n'
    '  {h:"Carreg.",   k:"data_carr",   w:"11%"},\n'
    '  {h:"Agenda",    k:"data_agenda", w:"11%"},\n'
    '  {h:"Desc.",     k:"data_desc",   w:"11%"},\n'
    '  {h:"Status",    k:"status",      w:"11%"},\n'
    '];\n'
    '\n'
    '// Colunas exclusivas AVB (acailandia_avb)\n'
    'const COLS_AVB = [\n'
    '  {h:"Cód.",       k:"codigo",        w:"7%"},\n'
    '  {h:"Carreg.",    k:"data_carr",     w:"8%"},\n'
    '  {h:"Contratante",k:"contratante",   w:"14%"},\n'
    '  {h:"Cliente",    k:"cliente",       w:"13%"},\n'
    '  {h:"Motorista",  k:"nome",          w:"13%"},\n'
    '  {h:"Placas",     k:"placa",         w:"9%"},\n'
    '  {h:"Origem",     k:"origem",        w:"9%"},\n'
    '  {h:"Destino",    k:"destino",       w:"9%"},\n'
    '  {h:"Status",     k:"status",        w:"7%"},\n'
    '  {h:"Gerenc.",    k:"gerenciadora",  w:"7%"},\n'
    '  {h:"Contrato",   k:"vl_contrato",   w:"8%"},\n'
    '  {h:"ADT",        k:"adiant",        w:"7%"},\n'
    '  {h:"Saldo",      k:"saldo",         w:"6%"},\n'
    '  {h:"CTE",        k:"cte",           w:"6%"},\n'
    '  {h:"MDF",        k:"mdf",           w:"6%"},\n'
    '];'
)
if OLD_COLS_DEF in txt:
    txt = txt.replace(OLD_COLS_DEF, NEW_COLS_DEF, 1)
    print("OK 5: COLS_AVB definido")
else:
    print("FAIL 5: COLS nao encontrado")

# ── 6. Usar COLS_AVB na tabela quando isAvb ───────────────────────────
# A variavel isAvb é declarada no componente; COLS e COLS_AVB são modulo-level.
# Precisamos adicionar const activeCols dentro do componente e usar ela.
# Inserir após a declaracao de isAvb.
OLD_IS_AVB_LINE = '  const isAvb = baseAtual?.id === "acailandia_avb";\n'
NEW_IS_AVB_LINE = (
    '  const isAvb = baseAtual?.id === "acailandia_avb";\n'
    '  const activeCols = isAvb ? COLS_AVB : COLS;\n'
)
if OLD_IS_AVB_LINE in txt:
    txt = txt.replace(OLD_IS_AVB_LINE, NEW_IS_AVB_LINE, 1)
    print("OK 6a: activeCols definido")
else:
    print("FAIL 6a: isAvb line nao encontrada")

# Substituir COLS por activeCols na tabela
OLD_COLS_MAP1 = '            {COLS.map(c => <col key={c.k} style={{ width: c.w }} />)}'
NEW_COLS_MAP1 = '            {activeCols.map(c => <col key={c.k} style={{ width: c.w }} />)}'
if OLD_COLS_MAP1 in txt:
    txt = txt.replace(OLD_COLS_MAP1, NEW_COLS_MAP1, 1)
    print("OK 6b: colgroup usa activeCols")
else:
    print("FAIL 6b: colgroup nao encontrado")

OLD_COLS_MAP2 = '              {COLS.map(c => {'
NEW_COLS_MAP2 = '              {activeCols.map(c => {'
if OLD_COLS_MAP2 in txt:
    txt = txt.replace(OLD_COLS_MAP2, NEW_COLS_MAP2, 1)
    print("OK 6c: thead usa activeCols")
else:
    print("FAIL 6c: thead map nao encontrado")

# ── 7. Celulas da linha: AVB mostra placas agrupadas + flags ──────────
# Encontrar o bloco de <td> da linha e adicionar logica AVB
OLD_TD_ROW = (
    '                onClick={() => abrirDetalhe(r)}\n'
    '                onMouseOver={e => e.currentTarget.style.background = "var(--surface)"}'
)
NEW_TD_ROW = (
    '                onClick={() => abrirDetalhe(r)}\n'
    '                onMouseOver={e => e.currentTarget.style.background = "var(--surface)"}'
)
# Nao alterar o onClick/hover — vamos so modificar como as celulas sao renderizadas
# Precisamos trocar o map de COLS para usar activeCols e renderizar colunas AVB corretamente.
# Encontrar o bloco de renderizacao das celulas:
OLD_TD_CELLS = (
    '              {COLS.map(c => (\n'
    '                <td key={c.k}'
)
# Ja substituimos COLS.map acima para activeCols.map no thead.
# No tbody precisamos tambem. Verificar:
OLD_TBODY_COLS = '              {COLS.map(c => (\n'
if OLD_TBODY_COLS in txt:
    txt = txt.replace(OLD_TBODY_COLS, '              {activeCols.map(c => (\n', 1)
    print("OK 6d: tbody usa activeCols")
else:
    print("INFO 6d: tbody COLS.map nao encontrado (pode estar com outro formato)")

# ── 8. Filtros AVB na toolbar ─────────────────────────────────────────
# Inserir filtros Contratante e Gerenciadora apos o filtro de Origem, somente quando isAvb
OLD_ORIGEM_SELECT = (
    '        <select value={planilhaFiltroOrigem}\n'
    '          onChange={e => { setPlanilhaFiltroOrigem(e.target.value); setPlanilhaPagina(1); }}\n'
    '          style={{ ...selectStyle(planilhaFiltroOrigem !== "todas"), maxWidth: 200 }}>\n'
    '          <option value="todas">Todas as Origens</option>\n'
    '          {origensDisp.map(o => <option key={o} value={o}>{o}</option>)}\n'
    '        </select>'
)
NEW_ORIGEM_SELECT = (
    '        <select value={planilhaFiltroOrigem}\n'
    '          onChange={e => { setPlanilhaFiltroOrigem(e.target.value); setPlanilhaPagina(1); }}\n'
    '          style={{ ...selectStyle(planilhaFiltroOrigem !== "todas"), maxWidth: 200 }}>\n'
    '          <option value="todas">Todas as Origens</option>\n'
    '          {origensDisp.map(o => <option key={o} value={o}>{o}</option>)}\n'
    '        </select>\n'
    '\n'
    '        {/* Filtros exclusivos AVB */}\n'
    '        {isAvb && (() => {\n'
    '          const contrats = [...new Set(DADOS.map(r=>(r.contratante||"").trim()).filter(Boolean))].sort();\n'
    '          const gerenc   = [...new Set(DADOS.map(r=>(r.gerenciadora||"").trim()).filter(Boolean))].sort();\n'
    '          return (<>\n'
    '            <select value={planilhaFiltroContratante||""}\n'
    '              onChange={e=>{setPlanilhaFiltroContratante(e.target.value);setPlanilhaPagina(1);}}\n'
    '              style={selectStyle(!!planilhaFiltroContratante)}>\n'
    '              <option value="">Contratante: Todos</option>\n'
    '              {contrats.map(c=><option key={c} value={c}>{c}</option>)}\n'
    '            </select>\n'
    '            <select value={planilhaFiltroGerenciadora||""}\n'
    '              onChange={e=>{setPlanilhaFiltroGerenciadora(e.target.value);setPlanilhaPagina(1);}}\n'
    '              style={selectStyle(!!planilhaFiltroGerenciadora)}>\n'
    '              <option value="">Gerenc.: Todas</option>\n'
    '              {gerenc.map(g=><option key={g} value={g}>{g}</option>)}\n'
    '            </select>\n'
    '          </>);\n'
    '        })()}'
)
if OLD_ORIGEM_SELECT in txt:
    txt = txt.replace(OLD_ORIGEM_SELECT, NEW_ORIGEM_SELECT, 1)
    print("OK 7: filtros AVB (contratante/gerenciadora) adicionados na toolbar")
else:
    print("FAIL 7: select origem nao encontrado")

# ── 9. Limpar filtros AVB no botao Limpar ────────────────────────────
OLD_LIMPAR = (
    '          <button onClick={() => { setPlanilhaFiltroAno(""); setPlanilhaFiltroMes(""); setPlanilhaFiltroOrigem("todas"); setPlanilhaFiltroDataDe(""); setPlanilhaFiltroDataAte(""); setPlanilhaBusca(""); setPlanilhaFiltroStatus(""); setPlanilhaPagina(1); }}'
)
NEW_LIMPAR = (
    '          <button onClick={() => { setPlanilhaFiltroAno(""); setPlanilhaFiltroMes(""); setPlanilhaFiltroOrigem("todas"); setPlanilhaFiltroDataDe(""); setPlanilhaFiltroDataAte(""); setPlanilhaBusca(""); setPlanilhaFiltroStatus(""); if(setPlanilhaFiltroContratante)setPlanilhaFiltroContratante(""); if(setPlanilhaFiltroGerenciadora)setPlanilhaFiltroGerenciadora(""); setPlanilhaPagina(1); }}'
)
if OLD_LIMPAR in txt:
    txt = txt.replace(OLD_LIMPAR, NEW_LIMPAR, 1)
    print("OK 8: botao Limpar inclui filtros AVB")
else:
    print("FAIL 8: botao Limpar nao encontrado")

# ── Salvar ────────────────────────────────────────────────────────────
if txt == original:
    print("\nNENHUMA ALTERACAO APLICADA")
    sys.exit(1)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(txt)
print(f"\nPlanilhaView.jsx salvo ({txt.count(chr(10))} linhas)")
