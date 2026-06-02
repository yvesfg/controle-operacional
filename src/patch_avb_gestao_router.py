import shutil, datetime, sys

path = r'C:\Users\yvesf\DevYFGroup\controle-operacional\src\App.jsx'
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
shutil.copy(path, path + f'.bak_avb_gestao_{ts}')

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# 1. Import GestaoAVB
old1 = "import LogisticaAVB from './views/avb/LogisticaAVB.jsx';"
new1 = """import LogisticaAVB from './views/avb/LogisticaAVB.jsx';
import GestaoAVB    from './views/avb/GestaoAVB.jsx';"""
if old1 not in c: errors.append("import")
else: c = c.replace(old1, new1, 1)

# 2. Adicionar tab "Gestão" — só aparece para AVB (avbOnly: true)
old2 = "    {k:\"motoristas\", l:\"Motori.\","
new2 = """    {k:"gestao", l:"Gestão", avbOnly:true,
      ico:(a)=>svgIco(a,<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></>)},
    {k:"motoristas", l:"Motori.","""
if old2 not in c: errors.append("tab-gestao")
else: c = c.replace(old2, new2, 1)

# 3. Filtro de tabs — adicionar filtro avbOnly
old3 = "].filter(tb => !tb.perm || perms[tb.perm] !== false).filter(tb => !(tb.k === \"diarias\" && baseAtual?.noDiarias));"
new3 = """].filter(tb => !tb.perm || perms[tb.perm] !== false)
    .filter(tb => !(tb.k === "diarias" && baseAtual?.noDiarias))
    .filter(tb => !tb.avbOnly || baseAtual?.id === "acailandia_avb");"""
if old3 not in c: errors.append("tab-filter")
else: c = c.replace(old3, new3, 1)

# 4. Render GestaoAVB — inserir após o bloco OperacionalView
old4 = """        {/* ═══ OPERACIONAL ═══ */}
        {activeTab === "operacional" && (
          <OperacionalView ctx={{"""
new4 = """        {/* ═══ GESTÃO AVB ═══ */}
        {baseAtual?.id === "acailandia_avb" && (
          <GestaoAVB ctx={{
            activeTab, DADOS,
            t, css, DESIGN, hexRgb, hIco, isMobile,
            abrirDetalhe,
          }} />
        )}

        {/* ═══ OPERACIONAL ═══ */}
        {activeTab === "operacional" && (
          <OperacionalView ctx={{"""
if old4 not in c: errors.append("render-gestao")
else: c = c.replace(old4, new4, 1)

if errors:
    print(f"ERROS: {errors}")
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("OK: GestaoAVB conectada — import + tab + render")
