# Refatoração App.jsx — Controle Operacional

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir App.jsx de ~8500 linhas para ~300 linhas de orquestrador puro, extraindo state, handlers e JSX em hooks e componentes focados, sem alterar nenhum comportamento visível.

**Architecture:** Cada domínio vira um custom hook (`src/hooks/use*.js`) que encapsula state + handlers. JSX das 4 telas condicionais vira componente em `src/screens/`. O sidebar sai do App.jsx para `src/components/AppSidebar.jsx`. App.jsx fica um thin orchestrator que compõe hooks e renderiza screens/sidebar.

**Tech Stack:** React 18, Vite, JavaScript (sem TypeScript), hooks pattern. Todas as edições ao App.jsx via Python script (arquivo muito grande — risco de truncamento com Edit/Write tools).

**Regra crítica:** Cada fase deve passar `npm run build` sem erros antes de commitar. Nenhuma alteração de comportamento — apenas reorganização estrutural.

---

## Mapa de arquivos

### Criar
| Arquivo | Responsabilidade |
|---|---|
| `src/screens/LoginScreen.jsx` | JSX da tela de login (Google OAuth + email/senha + primeiro login) |
| `src/screens/AprovacaoScreen.jsx` | JSX da tela "Aguardando Aprovação" |
| `src/screens/HubScreen.jsx` | JSX do seletor de módulo (hub YFGroup) |
| `src/screens/BaseSelectorScreen.jsx` | JSX do seletor de base operacional |
| `src/components/AppSidebar.jsx` | JSX completo do sidebar (nav, user card, theme toggle, logout) |
| `src/hooks/useAuth.js` | Estado e handlers de autenticação (authed, login, logout, OAuth, sessão) |
| `src/hooks/useDados.js` | Estado e handlers de dados (dadosBase, dadosExtras, sincronizar, salvarRegistro, deletarRegistro, supaUpsert) |
| `src/hooks/useUsuarios.js` | Estado e handlers de usuários (usuarios, syncUsuariosRemoto, carregarPendentes, aprovação) |
| `src/hooks/useOcorrencias.js` | Handlers de ocorrências (adicionarOcorrencia, salvarOcorrenciaExterna, abrirOcorrModal) |
| `src/hooks/usePlanilhaState.js` | Filtros e paginação da planilha (14 useState de planilha*) |
| `src/hooks/useDescargaState.js` | Filtros e tabs da descarga (dsc*, extrato*, rodorrica*) |
| `src/hooks/useDashboardState.js` | Estado do dashboard (dashMes, dashOrigem, dashChartType, dashGroupBy, dashHeroTab, dashDrillModal, dashRecentesN, Chart.js effects) |
| `src/hooks/useModalState.js` | Estado dos modais (modalOpen, editIdx, editStep, formData, excluirConfirm, detalheDT, ocorr*, nfd*, wpp*) |

### Modificar
| Arquivo | O que muda |
|---|---|
| `src/App.jsx` | Vira thin orchestrator: importa hooks + screens, passa props. Todas as edições via Python script. |

---

## Fase 1 — Telas condicionais (screens)

Extrair os 4 early-returns do App.jsx para componentes. Cada screen recebe props explícitas.
App.jsx troca o JSX inline pelo componente importado.

---

### Tarefa 1.1: AprovacaoScreen

**Arquivo:** `src/screens/AprovacaoScreen.jsx`

- [ ] **Criar o componente**

Ler App.jsx linhas ~2013–2075 e extrair o JSX exato para:

```jsx
// src/screens/AprovacaoScreen.jsx
import React from "react";
import { Toast } from "../components/Toast.jsx";
import loginLogo from "../../assets/images/logo-login.png";

export default function AprovacaoScreen({
  t, css, pendingUserInfo, carregarPendentes, handleLogout,
  toast, setPendingUserInfo, setAguardandoAprovacao,
}) {
  // JSX extraído de App.jsx linhas ~2013-2075
  // (copiar o return inteiro do bloco if (aguardandoAprovacao && !authed))
}
```

- [ ] **Substituir em App.jsx via Python**

```python
# script: scripts/phase1_aprovacao.py
# 1. Ler App.jsx
# 2. Localizar: "if (aguardandoAprovacao && !authed) {"
# 3. Capturar o bloco return completo
# 4. Substituir por: return <AprovacaoScreen t={t} css={css} pendingUserInfo={pendingUserInfo} carregarPendentes={carregarPendentes} handleLogout={handleLogout} toast={toast} setPendingUserInfo={setPendingUserInfo} setAguardandoAprovacao={setAguardandoAprovacao} />;
# 5. Adicionar import no topo: import AprovacaoScreen from "./screens/AprovacaoScreen.jsx";
```

- [ ] **Build limpo:** `cd controle-operacional && npm run build`
- [ ] **Commit:** `git add src/screens/AprovacaoScreen.jsx src/App.jsx && git commit -m "refactor: extrair AprovacaoScreen de App.jsx"`

---

### Tarefa 1.2: LoginScreen

**Arquivo:** `src/screens/LoginScreen.jsx`

- [ ] **Criar o componente**

Ler App.jsx linhas ~2078–2183 (bloco `if (!authed)`). Props necessárias:

```jsx
export default function LoginScreen({
  t, css, theme, setTheme,
  authEmail, setAuthEmail, authSenha, setAuthSenha, authMsg,
  handleLogin, iniciarOAuth, loginLogo,
  primeiroLogin, primLoginSenha, setPrimLoginSenha,
  primLoginSenha2, setPrimLoginSenha2, handlePrimeiroLoginSalvar,
  toast,
})
```

- [ ] **Substituir em App.jsx via Python**

Localizar: `if (!authed) {` (logo após o bloco de aprovação)
Substituir o bloco return por: `return <LoginScreen ... />;`
Adicionar import.

- [ ] **Build:** `npm run build`
- [ ] **Commit:** `git commit -m "refactor: extrair LoginScreen de App.jsx"`

---

### Tarefa 1.3: HubScreen

**Arquivo:** `src/screens/HubScreen.jsx`

- [ ] **Criar o componente**

Ler App.jsx linhas ~2184–2255 (bloco `if (authed && !hubScreen)`). Props:

```jsx
export default function HubScreen({
  t, css, loginLogo, hexRgb, handleLogout,
  onSelectControleOp,   // () => setHubScreen("controle_op")
  frotaUrl,             // import.meta.env.VITE_FROTA_URL
  getSupaTokens,        // () => sessionStorage.getItem("co_supa_tokens")
  toast,
})
```

Nota: mover `HUB_MODS` como constante de módulo (fora do componente) — resolve o finding #8 do code review.

- [ ] **Substituir em App.jsx via Python**

Localizar: `if (authed && !hubScreen) {`
Substituir por: `return <HubScreen onSelectControleOp={() => setHubScreen("controle_op")} frotaUrl={import.meta.env.VITE_FROTA_URL || "http://localhost:3000"} ... />;`

- [ ] **Build:** `npm run build`
- [ ] **Commit:** `git commit -m "refactor: extrair HubScreen de App.jsx, HUB_MODS como constante de módulo"`

---

### Tarefa 1.4: BaseSelectorScreen

**Arquivo:** `src/screens/BaseSelectorScreen.jsx`

- [ ] **Criar o componente**

Ler App.jsx linhas ~2258–2310 (bloco `if (authed && hubScreen === "controle_op" && !baseAtual && basesPermitidas.length > 1)`). Props:

```jsx
export default function BaseSelectorScreen({
  t, css, loginLogo, basesPermitidas, setBaseAtual, toast,
})
```

- [ ] **Substituir em App.jsx via Python**
- [ ] **Build:** `npm run build`
- [ ] **Commit:** `git commit -m "refactor: extrair BaseSelectorScreen de App.jsx"`

---

## Fase 2 — AppSidebar

### Tarefa 2.1: Extrair sidebar completo

**Arquivo:** `src/components/AppSidebar.jsx`

O sidebar começa em torno da linha 3310 (tag `<aside className="co-sidebar...">`) e vai até ~linha 3440. É o bloco mais volumoso inline.

- [ ] **Identificar exatamente as linhas**

```bash
grep -n "co-sidebar\|</aside>" src/App.jsx | head -20
```

- [ ] **Criar AppSidebar.jsx**

```jsx
// src/components/AppSidebar.jsx
import React from "react";
import { clickable } from "../utils.js";
// ... outros imports necessários

export default function AppSidebar({
  // nav
  activeTab, setActiveTab, perms, perfil, isAdmin,
  // base
  baseAtual, basesPermitidas, setBaseAtual, baseMenuOpen, setBaseMenuOpen,
  // user
  usuarioLogado, handleLogout, setModalOpen,
  // theme
  theme, setTheme, t, hIco,
  // ui
  isWide, mobileSidebarExpanded, setMobileSidebarExpanded, sidebarCollapsed, setSidebarCollapsed,
  // conexão
  connStatus, ultimaSync,
  // outros
  conexoesOpen, setConexoesOpen, alertasOpen, setAlertasOpen,
  gsheetsOpen, setGsheetsOpen, oauthAccessOpen, setOauthAccessOpen,
  logsOpen, setLogsOpen, contatosAdminOpen, setContatosAdminOpen,
  syncStatus, syncStatusLoading,
}) {
  // JSX extraído do <aside> ao </aside>
}
```

- [ ] **Substituir em App.jsx via Python**

No render principal do App, onde aparece `<aside className="co-sidebar...">`, substituir o bloco inteiro por `<AppSidebar ... />`.

- [ ] **Build:** `npm run build`
- [ ] **Commit:** `git commit -m "refactor: extrair AppSidebar de App.jsx (~1100 linhas)"`

---

## Fase 3 — Hook useAuth

### Tarefa 3.1: Extrair estado e handlers de autenticação

**Arquivo:** `src/hooks/useAuth.js`

Estado a mover do App.jsx:
- `authed`, `hubScreen`, `perfil`, `perms`, `authEmail`, `authSenha`, `authMsg`
- `primeiroLogin`, `primLoginSenha`, `primLoginSenha2`
- `sessionToken`, `basesPermitidas`, `usuarioLogado`
- `aguardandoAprovacao`, `pendingUserInfo`, `usuariosPendentes`
- `aprovarModal`, `aprovarPerfil`

Handlers a mover:
- `handleLogin`, `handleLogout`, `handlePrimeiroLoginSalvar`
- `checkSession` (lógica do useEffect linha 554)
- `oauthCallback` (lógica do useEffect linha 664)

```js
// src/hooks/useAuth.js
import { useState, useEffect, useCallback } from "react";
import { loadJSON, saveJSON, hashSenha, decodeJWT } from "../utils.js";
import { supaFetch } from "../supabase.js";
import { TABLE_USUARIOS, BASES } from "../constants.js";

export function useAuth({ showToast, getConexao, syncUsuariosRemoto }) {
  // ... todos os useState listados acima
  // ... todos os handlers
  // ... useEffect de checkSession (linha 554)
  // ... useEffect de oauthCallback (linha 664)

  return {
    authed, setAuthed, hubScreen, setHubScreen,
    perfil, perms, authEmail, setAuthEmail, authSenha, setAuthSenha, authMsg,
    primeiroLogin, primLoginSenha, setPrimLoginSenha, primLoginSenha2, setPrimLoginSenha2,
    sessionToken, basesPermitidas, setBasesPermitidas, usuarioLogado, setUsuarioLogado,
    aguardandoAprovacao, setAguardandoAprovacao, pendingUserInfo, setPendingUserInfo,
    usuariosPendentes, setUsuariosPendentes, aprovarModal, setAprovarModal, aprovarPerfil, setAprovarPerfil,
    handleLogin, handleLogout, handlePrimeiroLoginSalvar,
  };
}
```

- [ ] **Criar `src/hooks/useAuth.js`** com toda a lógica extraída
- [ ] **Remover do App.jsx via Python:** os useState + handlers + 2 useEffects correspondentes
- [ ] **Em App.jsx:** `const { authed, handleLogin, ... } = useAuth({ showToast, getConexao, syncUsuariosRemoto });`
- [ ] **Build:** `npm run build`
- [ ] **Commit:** `git commit -m "refactor: extrair useAuth hook de App.jsx"`

---

## Fase 4 — Hook useDados

### Tarefa 4.1: Extrair estado e handlers de dados/sync

**Arquivo:** `src/hooks/useDados.js`

Estado a mover:
- `dadosBase`, `dadosExtras`, `motoristas`, `conexoes`
- `connStatus`, `ultimaSync`, `syncStatus`, `syncStatusLoading`
- `historico`

Handlers a mover:
- `sincronizar`, `getConexao`, `supaUpsert`, `salvarRegistro`, `deletarRegistro`, `salvarMinutasDetalhe`
- `saveMotoristasLS`, `saveConexoesLS`
- `getConfigRemoto`, `setConfigRemoto`, `registrarLog`

useEffects a mover:
- linha 109: `if (authed && baseAtual) sincronizar()`
- linha 606: auto-refresh 15min

```js
// src/hooks/useDados.js
import { useState, useEffect, useCallback, useRef } from "react";
import { loadJSON, saveJSON } from "../utils.js";
import { supaFetch, supaStorageUpload } from "../supabase.js";
import { TABLE, BASES, TABLE_CONFIG, TABLE_LOGS } from "../constants.js";
import { parseData } from "../utils.js";

export function useDados({ authed, baseAtual, sessionToken, showToast, perfil }) {
  // ... useState
  // ... handlers
  // ... useEffects

  return {
    dadosBase, setDadosBase, dadosExtras, setDadosExtras,
    motoristas, setMotoristas, conexoes, setConexoes,
    connStatus, ultimaSync, syncStatus, syncStatusLoading,
    historico, setHistorico,
    sincronizar, getConexao, supaUpsert, salvarRegistro, deletarRegistro, salvarMinutasDetalhe,
    saveMotoristasLS, saveConexoesLS, getConfigRemoto, setConfigRemoto, registrarLog,
  };
}
```

- [ ] **Criar `src/hooks/useDados.js`**
- [ ] **Remover de App.jsx via Python**
- [ ] **Em App.jsx:** `const { dadosBase, sincronizar, salvarRegistro, ... } = useDados({ authed, baseAtual, ... });`
- [ ] **Build:** `npm run build`
- [ ] **Commit:** `git commit -m "refactor: extrair useDados hook de App.jsx"`

---

## Fase 5 — Hooks de UI state

### Tarefa 5.1: usePlanilhaState

**Arquivo:** `src/hooks/usePlanilhaState.js`

Estado a mover (14 variáveis `planilha*`):
`planilhaSortKey`, `planilhaSortDir`, `planilhaPagina`, `planilhaFiltroAno`, `planilhaFiltroMes`, `planilhaFiltroOrigem`, `planilhaFiltroDataDe`, `planilhaFiltroDataAte`, `planilhaFiltroStatus`, `planilhaFiltroContratante`, `planilhaFiltroGerenciadora`, `planilhaBusca`

```js
// src/hooks/usePlanilhaState.js
import { useState } from "react";

export function usePlanilhaState() {
  const [planilhaSortKey, setPlanilhaSortKey] = useState("dt");
  const [planilhaSortDir, setPlanilhaSortDir] = useState("desc");
  const [planilhaPagina, setPlanilhaPagina] = useState(1);
  const [planilhaFiltroAno, setPlanilhaFiltroAno] = useState("");
  const [planilhaFiltroMes, setPlanilhaFiltroMes] = useState("");
  const [planilhaFiltroOrigem, setPlanilhaFiltroOrigem] = useState("todos");
  const [planilhaFiltroDataDe, setPlanilhaFiltroDataDe] = useState("");
  const [planilhaFiltroDataAte, setPlanilhaFiltroDataAte] = useState("");
  const [planilhaFiltroStatus, setPlanilhaFiltroStatus] = useState("todos");
  const [planilhaFiltroContratante, setPlanilhaFiltroContratante] = useState("todos");
  const [planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora] = useState("todos");
  const [planilhaBusca, setPlanilhaBusca] = useState("");

  return {
    planilhaSortKey, setPlanilhaSortKey, planilhaSortDir, setPlanilhaSortDir,
    planilhaPagina, setPlanilhaPagina, planilhaFiltroAno, setPlanilhaFiltroAno,
    planilhaFiltroMes, setPlanilhaFiltroMes, planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
    planilhaFiltroDataDe, setPlanilhaFiltroDataDe, planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
    planilhaFiltroStatus, setPlanilhaFiltroStatus, planilhaFiltroContratante, setPlanilhaFiltroContratante,
    planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora, planilhaBusca, setPlanilhaBusca,
  };
}
```

- [ ] **Criar `src/hooks/usePlanilhaState.js`**
- [ ] **Remover de App.jsx via Python** (14 useState)
- [ ] **Em App.jsx:** `const planilhaState = usePlanilhaState(); const { planilhaSortKey, ... } = planilhaState;`
- [ ] **Build:** `npm run build`
- [ ] **Commit:** `git commit -m "refactor: extrair usePlanilhaState hook"`

---

### Tarefa 5.2: useDescargaState

**Arquivo:** `src/hooks/useDescargaState.js`

Estado a mover: `dscTab`, `dscFiltroAno`, `dscFiltroMes`, `dscFiltroOrigem`, `dscFiltroIni`, `dscFiltroFim`, `dscData`, `extratoRows`, `extratoFileName`, `prevExtratoSnap`, `extratoSheetInfo`, `extratoFiltro`, `extratoDataIni`, `extratoDataFim`, `rodorricaRows`, `rodorricaFileName`, `prevRodorricaSnap`, `rodorricaSheetInfo`, `rodorricaFiltro`, `rodorricaPeriodoIni`, `rodorricaPeriodoFim`, `rodorricaPeriodoModal`

- [ ] **Criar `src/hooks/useDescargaState.js`** com todos os useState
- [ ] **Remover de App.jsx via Python**
- [ ] **Commit:** `git commit -m "refactor: extrair useDescargaState hook"`

---

### Tarefa 5.3: useModalState

**Arquivo:** `src/hooks/useModalState.js`

Estado a mover: `modalOpen`, `editIdx`, `editStep`, `formData`, `excluirConfirm`, `excluirTexto`, `detalheDT`, `detalheMinDcc`, `detalheCteComp`, `detalheMinDsc`, `salvandoMins`, `detalheTemDcc`, `detalheSecDcc`, `detalheSecCteComp`, `detalheSecMinDsc`, `nfdAlertOpen`, `nfdForm`, `nfdFotos`, `nfdUploadando`, `nfdRegistrarOutra`, `ocorrChegadaAlert`, `wppModal`, `wppTel`, `wppPgto`, `wppValCheque`, `wppValConta`, `wppObs`, `wppModal2`, `wpp2Ro`, `wpp2Obs`, `wpp2IncluirObs`, `wpp2Conflitos`, `wppTipoOpen`, `wppSearchTxt`, `wppSearchReg`, `wppFatModal`, `wppPagModal`, `wppConfirmModal`, `wppFortes`, `wppDccMinutas`, `wppCteComp`, `wppDscMinutas`, `dashDrillModal`

Handler a mover: `fecharTopoModal`

- [ ] **Criar `src/hooks/useModalState.js`**
- [ ] **Remover de App.jsx via Python**
- [ ] **Commit:** `git commit -m "refactor: extrair useModalState hook"`

---

### Tarefa 5.4: useDashboardState

**Arquivo:** `src/hooks/useDashboardState.js`

Estado a mover: `dashMes`, `dashOrigem`, `dFiltro`, `dSubTab`, `dPlanFiltroAno`, `dPlanFiltroMes`, `dPlanFiltroOrigem`, `dPlanFiltroIni`, `dPlanFiltroFim`, `dashChartType`, `dashGroupBy`, `dashHeroTab`, `dashRecentesN`

useEffects a mover:
- linha 1322: reset `dashOrigem`
- linha 1582: renderizar/destruir gráficos Chart.js

Handlers a mover: `auditarDesign`

```js
// src/hooks/useDashboardState.js
import { useState, useEffect, useCallback, useRef } from "react";
// Chart.js imports

export function useDashboardState({ dadosBase, baseAtual, activeTab, theme, perms }) {
  // ...
  return { dashMes, setDashMes, dashOrigem, setDashOrigem, ... dashData };
}
```

- [ ] **Criar `src/hooks/useDashboardState.js`**
- [ ] **Mover useEffects Chart.js via Python** (linhas 1322 e 1582 — os mais complexos)
- [ ] **Remover de App.jsx via Python**
- [ ] **Build:** `npm run build`
- [ ] **Commit:** `git commit -m "refactor: extrair useDashboardState hook (inclui Chart.js effects)"`

---

## Fase 6 — Hooks de domínio

### Tarefa 6.1: useUsuarios

**Arquivo:** `src/hooks/useUsuarios.js`

Estado a mover: `usuarios`, `aguardandoAprovacao`, `pendingUserInfo`, `usuariosPendentes`, `aprovarModal`, `aprovarPerfil`

Handlers a mover: `syncUsuariosRemoto`, `carregarPendentes`, `enviarEmailBoasVindas`, `gerarCorpoEmail`, `carregarLogs`, `logsData`, `logsOpen`, `logsSubTab`, `emailTemplateOpen`, `emailTemplate`, `usuarioEmailPreview`

- [ ] **Criar `src/hooks/useUsuarios.js`**
- [ ] **Remover de App.jsx via Python**
- [ ] **Commit:** `git commit -m "refactor: extrair useUsuarios hook"`

---

### Tarefa 6.2: useOcorrencias

**Arquivo:** `src/hooks/useOcorrencias.js`

Estado a mover: `ocorrencias`, `novaOcorr`, `novaOcorrTipo`, `ocorrLoading`, `ocorrListExpanded`, `ocorrModalOpen`, `ocorrModalDT`, `ocorrModalRecord`, `ocorrModalList`, `ocorrModalLoading`, `ocorrModalExpanded`, `ocorrModalNova`, `ocorrModalTipo`

Handlers: `adicionarOcorrencia`, `salvarOcorrenciaExterna`, `abrirOcorrModal`, `adicionarOcorrenciaModal`

- [ ] **Criar `src/hooks/useOcorrencias.js`**
- [ ] **Remover de App.jsx via Python**
- [ ] **Commit:** `git commit -m "refactor: extrair useOcorrencias hook"`

---

### Tarefa 6.3: useBusca + useRelatorios

**Arquivo:** `src/hooks/useBusca.js`

Estado: `buscaTipo`, `buscaInput`, `buscaResult`, `buscaRelacionados`, `buscaError`, `buscaModalOpen`
Handler: `buscar`

**Arquivo:** `src/hooks/useRelatoriosState.js`

Estado: `relGeralOpen`, `relGeralFrom`, `relGeralTo`, `relGeralMotorista`, `relGeralStatus`, `relGeralOrigem`, `relGeralDestino`, `relGeralVinculo`, `relGeralSecoes`, `relGeralLoading`, `relGeralStatusOper`, `relMenuOpen`, `relOperOpen`, `relOperFrom`, `relOperTo`, `relOperSecoes`, `relDiariaOpen`, `relDiariaFrom`, `relDiariaTo`, `relDiariaMotorista`, `relDiariaVinculo`, `relDiariaStatus`, `relDescargaOpen`, `relCtrlDccOpen`, `relCtrlDccFrom`, `relCtrlDccTo`, `relDescargaFrom`, `relDescargaTo`, `relDescargaMotorista`, `relDescargaStatus`, `reportBuilderOpen`, `auditReport`

- [ ] **Criar ambos os hooks**
- [ ] **Remover de App.jsx via Python**
- [ ] **Commit:** `git commit -m "refactor: extrair useBusca e useRelatoriosState hooks"`

---

## Fase 7 — App.jsx final

### Tarefa 7.1: Verificar e limpar App.jsx residual

Neste ponto App.jsx deve ter apenas:
1. Imports dos hooks e screens/components
2. O componente App() com chamadas aos hooks
3. Passagem de props para screens/views
4. O JSX principal do app (sidebar + conteúdo)

Meta: App.jsx com menos de 400 linhas.

- [ ] **Contar linhas:** `wc -l src/App.jsx` (ou `(Get-Content App.jsx).Count` no PowerShell)
- [ ] **Se > 500 linhas:** identificar o que sobrou e extrair
- [ ] **Rodar build final:** `npm run build`
- [ ] **Testar manualmente as 4 telas condicionais** (login, aprovação, hub, base selector) e o sidebar
- [ ] **Commit final:** `git commit -m "refactor: App.jsx ~400 linhas — thin orchestrator"`

---

## Fase 8 — Deploy e validação

### Tarefa 8.1: Deploy production

- [ ] **Push:** `git push`
- [ ] **Deploy Vercel:** `vercel --prod --yes`
- [ ] **Verificar `https://controle-operacional-omega.vercel.app`** — login, hub, base selector, sidebar, planilha

---

## Notas de implementação

### Regra crítica para Python scripts
Cada script de edição no App.jsx deve:
1. Abrir o arquivo, localizar o trecho EXATO com `content.count(old) == 1`
2. Fazer a substituição
3. Salvar
4. Afirmar com `assert` antes de qualquer escrita

### Ordem de imports no App.jsx
Após todas as fases, o App.jsx importa na ordem:
```js
// React
import React, { useState, useCallback, useRef } from "react";
// Hooks locais
import { useAuth } from "./hooks/useAuth.js";
import { useDados } from "./hooks/useDados.js";
// ... demais hooks
// Screens
import LoginScreen from "./screens/LoginScreen.jsx";
// ... demais screens
// Components
import AppSidebar from "./components/AppSidebar.jsx";
// Views (já existiam)
import OperacionalView from "./views/OperacionalViewWrapper.jsx";
// ... demais views
```

### Compatibilidade com CLAUDE.md
- Toda edição ao App.jsx via Python script (nunca Edit/Write diretamente)
- Scripts salvos em `scripts/refactor_phase*.py` e deletados após execução
- Build de verificação após cada fase
