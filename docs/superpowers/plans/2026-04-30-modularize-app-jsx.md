# Modularizar App.jsx — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quebrar App.jsx (9.053 linhas) em componentes focados, reduzindo o arquivo principal para ~1.500 linhas sem mudar nenhuma lógica de negócio.

**Architecture:** Extração "lift-and-shift" — cada bloco JSX vira um componente que recebe um objeto `ctx` com o state e callbacks necessários (padrão já estabelecido pelo `PlanilhaView`). App.jsx mantém todo o state e funções; os componentes são apenas render. Nenhuma lógica de negócio é movida neste plano.

**Tech Stack:** React 18, Vite 5, Python via bash para editar App.jsx (regra CLAUDE.md — nunca usar Edit/Write diretamente no App.jsx)

---

## Mapa de Arquivos

| Arquivo | Ação | Linhas atuais |
|---|---|---|
| `src/App.jsx` | Modificar — remover blocos JSX, adicionar imports | 9.053 |
| `src/views/DashboardView.jsx` | Criar | ~335 linhas extraídas |
| `src/views/DiariasView.jsx` | Criar | ~506 linhas extraídas |
| `src/views/DescargaView.jsx` | Criar | ~360 linhas extraídas |
| `src/views/MotoristasView.jsx` | Criar | ~144 linhas extraídas |
| `src/views/AdminView.jsx` | Criar | ~3.931 linhas extraídas |
| `src/modals/ModalEdit.jsx` | Criar | ~237 linhas extraídas |
| `src/modals/ModalMotorista.jsx` | Criar | ~222 linhas extraídas |
| `src/modals/ModalDetalhe.jsx` | Criar | ~417 linhas extraídas |
| `src/modals/ModalUsuario.jsx` | Criar | ~135 linhas extraídas |

> **Nota:** AdminView.jsx (~3.931 linhas) pode ser subdividido em sub-tarefas nas Tasks 9-11 se necessário.

---

## Convenção de cada Task

Cada extração segue o mesmo padrão:
1. Extrair o bloco JSX usando Python
2. Criar o arquivo do componente
3. Substituir o bloco em App.jsx pelo `<ComponenteNome ctx={ctx} />`
4. Adicionar import em App.jsx
5. `npm run build` — deve passar sem erros
6. Commit

**Regras CLAUDE.md obrigatórias:**
- Criar backup antes de qualquer edição: `cp App.jsx App.jsx.bak_$(date +%Y%m%d_%H%M%S)`
- Usar Python via bash para editar App.jsx
- Nunca usar heredoc bash para código JS/JSX
- Registrar no CHANGELOG.md

---

## Task 1: Criar pasta modals e MotoristasView (menor risco)

**Files:**
- Criar: `src/modals/` (pasta)
- Criar: `src/views/MotoristasView.jsx`
- Modificar: `src/App.jsx` (linhas 4979–5122)

- [ ] **Step 1: Backup e criar pasta modals**

```bash
cp "src/App.jsx" "src/App.jsx.bak_$(date +%Y%m%d_%H%M%S)"
mkdir -p src/modals
```

- [ ] **Step 2: Extrair bloco Motoristas do App.jsx via Python**

```python
# extract_motoristas.py
path = r"src/App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Encontrar linhas exatas (confirme com grep antes de rodar):
# grep -n "activeTab === \"motoristas\"" src/App.jsx
# O bloco começa em "{activeTab === "motoristas" && (()=>{"
# e termina no "}" que fecha o bloco (linha ~5122)

start = 4979 - 1  # 0-indexed
end = 5122        # exclusive

block = "".join(lines[start:end])
print(block[:500])  # preview
```

Rode: `python extract_motoristas.py`
Verifique que o bloco impresso é o render de Motoristas.

- [ ] **Step 3: Criar src/views/MotoristasView.jsx**

Crie o arquivo com o seguinte padrão:

```jsx
import React from "react";

export default function MotoristasView({ ctx }) {
  const {
    motoristas, buscaInput, setBuscaInput,
    modalOpen, setModalOpen, editIdx, setEditIdx, formData, setFormData,
    t, DESIGN, hexRgb, css, perms, showToast,
    saveMotoristasLS,
  } = ctx;

  // COLE AQUI o conteúdo do bloco extraído em Step 2
  // Substitua o return do IIFE pelo return do componente
  return (
    // ... bloco extraído ...
  );
}
```

> **Atenção:** O bloco original usa `(()=>{ ... })()` — remova o IIFE wrapper, transforme em `return (...)` do componente.

- [ ] **Step 4: Substituir bloco em App.jsx via Python**

```python
# replace_motoristas.py
path = r"src/App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

OLD = """{activeTab === "motoristas" && (()=>{
          // filtro de busca por nome ou placa (Item 3)"""

# Encontre o OLD exato copiando as primeiras 2 linhas do bloco
# e o trecho de fechamento "})()}". Substitua pelo tag abaixo:

NEW = """{activeTab === "motoristas" && (
          <MotoristasView ctx={{
            motoristas, buscaInput, setBuscaInput,
            modalOpen, setModalOpen, editIdx, setEditIdx, formData, setFormData,
            t, DESIGN, hexRgb, css, perms, showToast,
            saveMotoristasLS,
          }} />
        )}"""

count = content.count(OLD[:80])  # confirma match
print(f"Matches: {count}")
```

Rode o script, confirme `Matches: 1`, depois aplique o replace completo e salve.

- [ ] **Step 5: Adicionar import em App.jsx via Python**

```python
path = r"src/App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_import = "import PlanilhaView    from './views/PlanilhaView.jsx';"
new_import = "import PlanilhaView    from './views/PlanilhaView.jsx';\nimport MotoristasView  from './views/MotoristasView.jsx';"
content = content.replace(old_import, new_import)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Import adicionado.")
```

- [ ] **Step 6: Build**

```bash
cd "controle operacional" && npm run build 2>&1 | tail -5
```

Esperado: `✓ built in X.XXs` sem erros (warning de bundle size é normal).

- [ ] **Step 7: Commit**

```bash
git add src/views/MotoristasView.jsx src/App.jsx
git commit -m "refactor: extrai MotoristasView de App.jsx"
```

---

## Task 2: DashboardView (~335 linhas, linhas 3726–4060)

**Files:**
- Criar: `src/views/DashboardView.jsx`
- Modificar: `src/App.jsx` (linhas 3726–4060)

- [ ] **Step 1: Backup**

```bash
cp "src/App.jsx" "src/App.jsx.bak_$(date +%Y%m%d_%H%M%S)"
```

- [ ] **Step 2: Identificar props necessárias do Dashboard**

```bash
# Rode este grep para listar variáveis usadas no bloco:
awk 'NR>=3726 && NR<=4060' src/App.jsx | grep -oE '\b(dash[A-Za-z]+|dados[A-Za-z]+|motoristas|perms|t\b|css|DESIGN|hexRgb|showToast|canFin|setDash[A-Za-z]+)\b' | sort -u
```

- [ ] **Step 3: Criar src/views/DashboardView.jsx**

```jsx
import React from "react";
import { Chart } from "chart.js"; // só se necessário após verificar imports do bloco

export default function DashboardView({ ctx }) {
  const {
    dashMes, setDashMes, dashOrigem, setDashOrigem,
    dashHeroTab, setDashHeroTab,
    dadosBase, dadosExtras,
    motoristas, perms,
    t, DESIGN, hexRgb, css,
    canFin,
    // adicione aqui o que o grep do Step 2 revelar
  } = ctx;

  // bloco extraído — substitua o IIFE (() => { ... })() por return(...)
  return (
    // ... bloco das linhas 3726-4060 ...
  );
}
```

- [ ] **Step 4: Substituir bloco em App.jsx via Python**

```python
path = r"src/App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Início exato do bloco:
OLD_START = '{activeTab === "dashboard" && (() => {'
# Verifique o fechamento com: awk 'NR>=4055 && NR<=4065' src/App.jsx

# Novo conteúdo:
NEW = """{activeTab === "dashboard" && (
          <DashboardView ctx={{
            dashMes, setDashMes, dashOrigem, setDashOrigem,
            dashHeroTab, setDashHeroTab,
            dadosBase, dadosExtras,
            motoristas, perms, canFin,
            t, DESIGN, hexRgb, css,
          }} />
        )}"""

# Encontre e substitua o bloco completo (início até fechamento do IIFE)
```

- [ ] **Step 5: Adicionar import e build**

```python
# Adicionar import
old = "import MotoristasView  from './views/MotoristasView.jsx';"
new = old + "\nimport DashboardView   from './views/DashboardView.jsx';"
```

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/views/DashboardView.jsx src/App.jsx
git commit -m "refactor: extrai DashboardView de App.jsx"
```

---

## Task 3: ModalEdit (~237 linhas, linhas 6017–6253)

**Files:**
- Criar: `src/modals/ModalEdit.jsx`
- Modificar: `src/App.jsx` (linhas 6017–6253)

- [ ] **Step 1: Backup**

```bash
cp "src/App.jsx" "src/App.jsx.bak_$(date +%Y%m%d_%H%M%S)"
```

- [ ] **Step 2: Listar props necessárias**

```bash
awk 'NR>=6017 && NR<=6253' src/App.jsx | grep -oE '\b(form[A-Za-z]+|setForm[A-Za-z]+|modal[A-Za-z]+|setModal[A-Za-z]+|edit[A-Za-z]+|setEdit[A-Za-z]+|motoristas|dados[A-Za-z]+|perms|t\b|css|DESIGN|hexRgb|showToast|excluir[A-Za-z]+|setExcluir[A-Za-z]+)\b' | sort -u
```

- [ ] **Step 3: Criar src/modals/ModalEdit.jsx**

```jsx
import React from "react";

export default function ModalEdit({ ctx }) {
  const {
    formData, setFormData,
    modalOpen, setModalOpen,
    editIdx, editStep, setEditStep,
    excluirConfirm, setExcluirConfirm,
    excluirTexto, setExcluirTexto,
    motoristas, dadosBase, perms,
    t, DESIGN, hexRgb, css,
    showToast,
    // adicione o que o Step 2 revelar
  } = ctx;

  if (modalOpen !== "edit") return null;

  return (
    // ... bloco extraído das linhas 6017-6253 ...
  );
}
```

- [ ] **Step 4: Substituir em App.jsx**

```python
path = r"src/App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Substituir o bloco {modalOpen === "edit" && ( ... )} pelo componente
NEW = """<ModalEdit ctx={{
        formData, setFormData, modalOpen, setModalOpen,
        editIdx, editStep, setEditStep,
        excluirConfirm, setExcluirConfirm, excluirTexto, setExcluirTexto,
        motoristas, dadosBase, perms,
        t, DESIGN, hexRgb, css, showToast,
      }} />"""
```

- [ ] **Step 5: Import + build + commit**

```bash
npm run build 2>&1 | tail -5
git add src/modals/ModalEdit.jsx src/App.jsx
git commit -m "refactor: extrai ModalEdit de App.jsx"
```

---

## Task 4: ModalMotorista (~222 linhas, 6254–6475)

**Files:**
- Criar: `src/modals/ModalMotorista.jsx`
- Modificar: `src/App.jsx`

- [ ] **Step 1: Backup + extrair props**

```bash
cp "src/App.jsx" "src/App.jsx.bak_$(date +%Y%m%d_%H%M%S)"
awk 'NR>=6254 && NR<=6475' src/App.jsx | grep -oE '\b(motoristas|setMotoristas|formData|setFormData|modalOpen|setModalOpen|editIdx|t\b|css|DESIGN|hexRgb|showToast|saveMotoristasLS)\b' | sort -u
```

- [ ] **Step 2: Criar src/modals/ModalMotorista.jsx**

```jsx
import React from "react";

export default function ModalMotorista({ ctx }) {
  const {
    motoristas, formData, setFormData,
    modalOpen, setModalOpen, editIdx,
    t, DESIGN, hexRgb, css, showToast, saveMotoristasLS,
  } = ctx;

  if (modalOpen !== "motorista") return null;

  return (
    // ... bloco extraído 6254-6475 ...
  );
}
```

- [ ] **Step 3: Substituir, import, build, commit**

```bash
npm run build 2>&1 | tail -5
git add src/modals/ModalMotorista.jsx src/App.jsx
git commit -m "refactor: extrai ModalMotorista de App.jsx"
```

---

## Task 5: ModalDetalhe (~417 linhas, 6476–6892)

**Files:**
- Criar: `src/modals/ModalDetalhe.jsx`
- Modificar: `src/App.jsx`

- [ ] **Step 1: Backup + extrair props**

```bash
cp "src/App.jsx" "src/App.jsx.bak_$(date +%Y%m%d_%H%M%S)"
awk 'NR>=6476 && NR<=6892' src/App.jsx | grep -oE '\b(detalhe[A-Za-z]+|setDetalhe[A-Za-z]+|modalOpen|setModalOpen|dadosBase|perms|t\b|css|DESIGN|hexRgb|showToast|abrirOcorr[A-Za-z]+|motoristas)\b' | sort -u
```

- [ ] **Step 2: Criar src/modals/ModalDetalhe.jsx**

```jsx
import React from "react";

export default function ModalDetalhe({ ctx }) {
  const {
    detalheDT, modalOpen, setModalOpen,
    dadosBase, perms, motoristas,
    t, DESIGN, hexRgb, css, showToast,
    abrirOcorrModal,
    // adicione o que o Step 1 revelar
  } = ctx;

  if (modalOpen !== "detalhe" || !detalheDT) return null;

  return (
    // ... bloco extraído 6476-6892 ...
  );
}
```

- [ ] **Step 3: Substituir, import, build, commit**

```bash
npm run build 2>&1 | tail -5
git add src/modals/ModalDetalhe.jsx src/App.jsx
git commit -m "refactor: extrai ModalDetalhe de App.jsx"
```

---

## Task 6: ModalUsuario (~135 linhas, 6893–7027)

**Files:**
- Criar: `src/modals/ModalUsuario.jsx`
- Modificar: `src/App.jsx`

- [ ] **Step 1: Backup + extrair props**

```bash
cp "src/App.jsx" "src/App.jsx.bak_$(date +%Y%m%d_%H%M%S)"
awk 'NR>=6893 && NR<=7027' src/App.jsx | grep -oE '\b(usuarios|setUsuarios|formData|setFormData|modalOpen|setModalOpen|editIdx|perms|perfil|t\b|css|DESIGN|hexRgb|showToast)\b' | sort -u
```

- [ ] **Step 2: Criar src/modals/ModalUsuario.jsx**

```jsx
import React from "react";

export default function ModalUsuario({ ctx }) {
  const {
    usuarios, formData, setFormData,
    modalOpen, setModalOpen, editIdx, perms, perfil,
    t, DESIGN, hexRgb, css, showToast,
  } = ctx;

  if (modalOpen !== "usuario") return null;

  return (
    // ... bloco extraído 6893-7027 ...
  );
}
```

- [ ] **Step 3: Substituir, import, build, commit**

```bash
npm run build 2>&1 | tail -5
git add src/modals/ModalUsuario.jsx src/App.jsx
git commit -m "refactor: extrai ModalUsuario de App.jsx"
```

---

## Task 7: DiariasView (~506 linhas, 4078–4583)

**Files:**
- Criar: `src/views/DiariasView.jsx`
- Modificar: `src/App.jsx`

- [ ] **Step 1: Backup + listar props**

```bash
cp "src/App.jsx" "src/App.jsx.bak_$(date +%Y%m%d_%H%M%S)"
awk 'NR>=4078 && NR<=4583' src/App.jsx | grep -oE '\b(d[A-Z][a-zA-Z]+|setD[A-Z][a-zA-Z]+|dadosBase|dadosExtras|motoristas|extratoRows|setExtratoRows|extratoFileName|setExtratoFileName|perms|t\b|css|DESIGN|hexRgb|showToast|diariaView|setDiariaView|diariaCols|setDiariaCols|abrirDetalhe|abrirWpp[A-Za-z]+|exportCSV|exportPDF)\b' | sort -u
```

- [ ] **Step 2: Criar src/views/DiariasView.jsx**

```jsx
import React from "react";
import { exportCSV, exportPDF } from "../exportHelpers.jsx";

export default function DiariasView({ ctx }) {
  const {
    dFiltro, setDFiltro, dSubTab, setDSubTab,
    dPlanFiltroAno, setDPlanFiltroAno, dPlanFiltroMes, setDPlanFiltroMes,
    dPlanFiltroOrigem, setDPlanFiltroOrigem,
    dPlanFiltroIni, setDPlanFiltroIni, dPlanFiltroFim, setDPlanFiltroFim,
    extratoRows, setExtratoRows, extratoFileName, setExtratoFileName,
    extratoFiltro, setExtratoFiltro, extratoDataIni, setExtratoDataIni, extratoDataFim, setExtratoDataFim,
    diariaView, setDiariaView, diariaCols, setDiariaCols,
    dadosBase, dadosExtras, motoristas, perms,
    t, DESIGN, hexRgb, css, showToast,
    abrirDetalhe, abrirWppPagModal,
    // adicione o que o Step 1 revelar
  } = ctx;

  return (
    // ... bloco extraído 4078-4583 ...
  );
}
```

- [ ] **Step 3: Substituir, import, build, commit**

```bash
npm run build 2>&1 | tail -5
git add src/views/DiariasView.jsx src/App.jsx
git commit -m "refactor: extrai DiariasView de App.jsx"
```

---

## Task 8: DescargaView (~360 linhas, 4584–4943)

**Files:**
- Criar: `src/views/DescargaView.jsx`
- Modificar: `src/App.jsx`

- [ ] **Step 1: Backup + listar props**

```bash
cp "src/App.jsx" "src/App.jsx.bak_$(date +%Y%m%d_%H%M%S)"
awk 'NR>=4584 && NR<=4943' src/App.jsx | grep -oE '\b(dsc[A-Za-z]+|setDsc[A-Za-z]+|rodorrica[A-Za-z]+|setRodorrica[A-Za-z]+|dadosBase|dadosExtras|motoristas|perms|t\b|css|DESIGN|hexRgb|showToast|descargaView|setDescargaView|descargaCols|setDescargaCols|abrirDetalhe)\b' | sort -u
```

- [ ] **Step 2: Criar src/views/DescargaView.jsx**

```jsx
import React from "react";

export default function DescargaView({ ctx }) {
  const {
    dscTab, setDscTab, dscFiltroAno, setDscFiltroAno,
    dscFiltroMes, setDscFiltroMes, dscFiltroOrigem, setDscFiltroOrigem,
    dscFiltroIni, setDscFiltroIni, dscFiltroFim, setDscFiltroFim,
    dscData, setDscData,
    rodorricaRows, setRodorricaRows, rodorricaFileName, setRodorricaFileName,
    rodorricaFiltro, setRodorricaFiltro, rodorricaPeriodoIni, setRodorricaPeriodoIni,
    rodorricaPeriodoFim, setRodorricaPeriodoFim, rodorricaPeriodoModal, setRodorricaPeriodoModal,
    descargaView, setDescargaView, descargaCols, setDescargaCols,
    dadosBase, dadosExtras, motoristas, perms,
    t, DESIGN, hexRgb, css, showToast, abrirDetalhe,
  } = ctx;

  return (
    // ... bloco extraído 4584-4943 ...
  );
}
```

- [ ] **Step 3: Substituir, import, build, commit**

```bash
npm run build 2>&1 | tail -5
git add src/views/DescargaView.jsx src/App.jsx
git commit -m "refactor: extrai DescargaView de App.jsx"
```

---

## Task 9: AdminView — preparação (identificar sub-seções)

O bloco Admin (linhas 5123–9053, ~3.931 linhas) contém várias abas internas. Antes de extrair, mapeie as abas:

- [ ] **Step 1: Mapear abas do Admin**

```bash
grep -n "adminTab ===\|adminTab==\|aba.*admin\|subTab.*admin" src/App.jsx | head -30
grep -n "\"config\"\|\"usuarios\"\|\"logs\"\|\"apontamentos\"\|\"changelog\"\|\"desenvolvimento\"" src/App.jsx | awk 'NR>=5123' | head -20
```

- [ ] **Step 2: Anotar as linhas de cada aba**

Registre aqui após rodar o Step 1:
- Aba Config/ConfigDB: linhas ___ até ___
- Aba Usuarios: linhas ___ até ___
- Aba Logs: linhas ___ até ___
- Aba Apontamentos: linhas ___ até ___
- Aba Desenvolvimento: linhas ___ até ___

- [ ] **Step 3: Criar src/views/AdminView.jsx (shell vazio primeiro)**

```jsx
import React from "react";

export default function AdminView({ ctx }) {
  const {
    adminTab, setAdminTab,
    usuarios, setUsuarios, usuariosPendentes, setUsuariosPendentes,
    aprovarModal, setAprovarModal, aprovarPerfil, setAprovarPerfil,
    conexoes, setConexoes,
    motoristas,
    perfil, perms, usuarioLogado, customLogo, setCustomLogo,
    dadosBase, dadosExtras,
    t, DESIGN, hexRgb, css, showToast,
    saveConexoesLS, saveMotoristasLS,
    syncUsuariosRemoto,
    isAdmin,
    // adicione conforme necessário
  } = ctx;

  if (!isAdmin) return null;

  return (
    // bloco extraído 5123-9053
  );
}
```

- [ ] **Step 4: Backup + extrair bloco completo via Python**

```bash
cp "src/App.jsx" "src/App.jsx.bak_$(date +%Y%m%d_%H%M%S)"
```

```python
path = r"src/App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extrair linhas 5123-9053 (antes do fechamento do main render)
# Confirme o número exato com:
# grep -n "activeTab === \"admin\"" src/App.jsx
start = 5123 - 1  # 0-indexed
end = None  # até onde o bloco admin fecha — confirme manualmente

block = "".join(lines[start:end or len(lines)])
# Salve em arquivo temporário para inspeção
with open("admin_block_preview.txt", "w", encoding="utf-8") as f:
    f.write(block[:2000])
print("Primeiras 2000 chars salvas em admin_block_preview.txt")
```

- [ ] **Step 5: Colar bloco em AdminView.jsx + build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Substituir bloco em App.jsx**

```python
path = r"src/App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Identifique o início exato ('{activeTab === "admin" && isAdmin && (')
# e o fim do bloco. Substitua por:
NEW = """<AdminView ctx={{
          adminTab, setAdminTab,
          usuarios, setUsuarios, usuariosPendentes, setUsuariosPendentes,
          aprovarModal, setAprovarModal, aprovarPerfil, setAprovarPerfil,
          conexoes, setConexoes, motoristas,
          perfil, perms, usuarioLogado, customLogo, setCustomLogo,
          dadosBase, dadosExtras,
          t, DESIGN, hexRgb, css, showToast,
          saveConexoesLS, saveMotoristasLS, syncUsuariosRemoto, isAdmin,
        }} />"""
```

- [ ] **Step 7: Import + build + commit**

```bash
npm run build 2>&1 | tail -5
git add src/views/AdminView.jsx src/App.jsx
git commit -m "refactor: extrai AdminView de App.jsx (~3900 linhas)"
```

---

## Task 10: ModalConfigDB (dentro ou depois do AdminView)

Se após Task 9 o AdminView ainda tiver `modalOpen === "configdb"` com 2.000+ linhas, extraia:

**Files:**
- Criar: `src/modals/ModalConfigDB.jsx`
- Modificar: `src/views/AdminView.jsx`

- [ ] **Step 1: Localizar bloco no AdminView.jsx**

```bash
grep -n "modalOpen.*configdb\|configdb" src/views/AdminView.jsx | head -10
```

- [ ] **Step 2: Criar src/modals/ModalConfigDB.jsx** com padrão `{ ctx }` idêntico.

- [ ] **Step 3: Substituir em AdminView, build, commit**

```bash
npm run build 2>&1 | tail -5
git add src/modals/ModalConfigDB.jsx src/views/AdminView.jsx
git commit -m "refactor: extrai ModalConfigDB de AdminView.jsx"
```

---

## Task 11: Verificação final e limpeza de backups

- [ ] **Step 1: Checar tamanho final do App.jsx**

```bash
wc -l src/App.jsx
# Meta: abaixo de 2.000 linhas
```

- [ ] **Step 2: Build de produção limpo**

```bash
npm run build 2>&1
# Esperado: ✓ sem erros de TypeScript/React
```

- [ ] **Step 3: Remover backups antigos**

```bash
# Manter apenas o backup mais recente
ls src/App.jsx.bak_* | sort | head -n -1 | xargs rm -f
```

- [ ] **Step 4: Atualizar CHANGELOG.md**

```bash
# Adicione no topo do CHANGELOG.md:
# REFACTOR · App.jsx modularizado: extraídos 8 componentes (DashboardView, DiariasView,
# DescargaView, MotoristasView, AdminView, ModalEdit, ModalMotorista, ModalDetalhe,
# ModalUsuario, ModalConfigDB). App.jsx reduzido de 9.053 para <2.000 linhas.
```

- [ ] **Step 5: Commit final**

```bash
git add CHANGELOG.md
git commit -m "chore: atualiza changelog da modularização App.jsx"
```

---

## Self-Review

**Cobertura do spec:**
- ✅ App.jsx reduzido para < 2.000 linhas
- ✅ Nenhuma lógica de negócio movida (só render)
- ✅ Padrão `ctx` consistente com PlanilhaView existente
- ✅ Build passa após cada task (commits atômicos)
- ✅ Backups criados antes de cada edição (CLAUDE.md)
- ✅ Python via bash para editar App.jsx (CLAUDE.md)

**Possíveis gaps:**
- A Task 9 (AdminView ~3.931 linhas) pode precisar de sub-divisão adicional dependendo do que o grep revelar nas abas. A Task 10 (ModalConfigDB) endereça isso.
- Os números de linha são aproximados. Cada task começa com um step de verificação exata via grep antes de aplicar.
