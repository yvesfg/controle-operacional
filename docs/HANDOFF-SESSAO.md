# Handoff — Continuação da sessão de desenvolvimento YFGroup

**Data:** 2026-06-23  
**Repositório principal:** `yvesfg/controle-operacional`  
**PR aberto:** [#8 — fix(ui): legibilidade do tema claro + perfil CRLV](https://github.com/yvesfg/controle-operacional/pull/8) (draft, pronto para merge)

---

## 1. O que foi feito nesta sessão

### 1.1 Gateway central de IA — `yf-ai-gateway` — PUBLICADO E FUNCIONANDO
- Repositório `yvesfg/yf-ai-gateway` criado na Vercel e no GitHub.
- Arquivos enviados: `api/_ai/provider.js`, `api/_ai/profiles.js`, `api/_ai/engine.js`, `api/extract.js`, `vercel.json`, `package.json`.
- Variáveis configuradas na Vercel do gateway:
  - `AI_API_KEY` = chave Gemini (mesma do controle-operacional)
  - `AI_GATEWAY_TOKEN` = `6dd8ae7c9ee21014a70d563a2f9821c7968ec47c8b22fa3a4507cc2f0f6fd121`
  - `AI_PROVIDER` = `gemini`
  - `AI_MODEL` = `gemini-2.0-flash`
  - `ALLOWED_ORIGINS` = `https://controle-operacional-omega.vercel.app,https://frota-yfgroup.vercel.app,https://yffinance.vercel.app`
- **Teste confirmado via PowerShell:** resposta `{"error":"profile ausente"}` = gateway vivo, token aceito, função executando.

### 1.2 Correção do tema claro — `PlanilhaView` ilegível (PR #8)
- **Causa:** linhas da Planilha usavam cores hardcoded do tema escuro (`rgba(255,255,255,.75)` no nome do motorista, `rgba(255,255,255,.4)` na rota, pastéis `#86efac`/`#a5b4fc` nos KPIs) — invisíveis sobre fundo branco.
- **Correção:** trocadas por tokens semânticos (`var(--text)`, `var(--text3)`, `var(--green)`, `var(--red)`, `var(--color-info)`, `var(--accent)`).
- `theme-light.css`: `--text2`/`--text3` alinhados aos valores WCAG AAA (`#424a5f`/`#5a6575`).
- **Arquivo:** `src/views/PlanilhaView.jsx` e `src/design-system/theme-light.css`.

### 1.3 Perfil CRLV adicionado à IA (PR #8)
- Novo perfil `crlv` em `api/_ai/profiles.js` e `docs/gateway-template/api/_ai/profiles.js`.
- Extrai: **placa, renavam, cpf/cnpj do proprietário, chassi, marca/modelo, ano, confiança**.
- É a fundação do fluxo CRLV → RNTRC → CIOT.
- Perfis disponíveis no gateway: `nfd, crlv, rodorrica`.

### 1.4 Diagnóstico do estado geral
| Item | Status |
|------|--------|
| IA atual (Gemini 2.0 Flash via gateway) | ✅ Funcionando |
| Camada `api/_ai/{provider,profiles,engine}` | ✅ Funcional |
| App "Consulta ANTT" no controle-operacional | ❌ NÃO EXISTE — só tile placeholder no Hub |
| App "Consulta ANTT" real | ✅ Existe em `C:\Users\yvesf\DevYFGroup\consulta-antt` + deploy `https://consulta-antt-mauve.vercel.app/` |
| "IA/API gratuita anterior" mencionada | ⚠️ Provavelmente está no `scopr` (`https://scopr-gray.vercel.app/`) ou no `consulta-antt` — **não inspecionado** |
| PlanilhaView no tema claro | ✅ Corrigido (PR #8) |

---

## 2. Arquitetura atual da IA

```
┌─────────────────────────────────────────────────────────────────┐
│                    yf-ai-gateway (Vercel)                       │
│  POST /api/extract { profile, image?, headers?, sample? }       │
│  Auth: x-ai-token header                                        │
│                                                                 │
│  api/_ai/provider.js   ← ÚNICA peça que muda ao trocar de IA   │
│  api/_ai/profiles.js   ← perfis: nfd | crlv | rodorrica         │
│  api/_ai/engine.js     ← orquestrador                           │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ x-ai-token
              ┌─────────────────────┼──────────────────┐
              ▼                     ▼                  ▼
   controle-operacional        frota-yfgroup       yffinance
   /api/ai-extract.js          (pendente)          (pendente)
   /api/analyze-nfd.js*        /api/ai-proxy.js    /api/ai-proxy.js
   /api/parse-rodorrica.js*
   (* cascas de compatibilidade)
```

**Para integrar Frota e YFFinance** (Etapa 2/3 pendente):
Criar em cada app:
```js
// api/ai-proxy.js
export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  const r = await fetch("https://yf-ai-gateway.vercel.app/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ai-token": process.env.AI_GATEWAY_TOKEN },
    body: JSON.stringify(req.body),
  });
  res.status(r.status).json(await r.json());
}
```
E adicionar `AI_GATEWAY_TOKEN = 6dd8ae7c9ee21014a70d563a2f9821c7968ec47c8b22fa3a4507cc2f0f6fd121` na Vercel de cada app.

---

## 3. O que ficou pendente (próximos passos priorizados)

### Alta prioridade — pode ser feito no `controle-operacional`

**A. Provider aceitar PDF**
Arquivo: `api/_ai/provider.js`  
Mudança pequena: passar `application/pdf` como `mime_type` no `inline_data` do Gemini (ele aceita nativamente). Sem isso, o fluxo CRLV só funciona com imagem, não PDF.

**B. `ModalDocIntake` — modal reutilizável de documentos**
Arquivo novo: `src/components/ModalDocIntake.jsx`  
Fluxo: upload/câmera → preview → extração via `/api/ai-extract` → revisão editável → confirmação.  
Parametrizado por `tipo` (crlv, cnh, doc_cavalo, doc_carreta, relatorio, pdf_generico).  
O `profile` do backend já existe; o modal é a UI genérica sobre ele.

**C. Fluxo CRLV completo**
Dentro do `ModalDocIntake` (quando `tipo=crlv`):
- Toggle: *"Proprietário do CRLV é o mesmo da RNTRC?"*
- Se não: campos manuais RNTRC
- Salvar estruturado: `{ placa, renavam, cpf_cnpj_crlv, rntrc: { mesmo_do_crlv, cpf_cnpj_rntrc } }`
- Isso habilita futura consulta de CIOT aberto (placa + RNTRC são as chaves)

**D. Redesign modal `ModalDetalhe.jsx` (img1)**
5 opções avaliadas (ver bloco 5 do diagnóstico). Recomendação: **Opção A — iOS Sheet segmentado** (1 coluna, segmented control: Resumo · Documentos · Acompanhamento). Maior ganho de clareza, ótimo mobile.

### Requer sessão local em `C:\Users\yvesf\DevYFGroup`

**E. Verificar a "IA/API gratuita anterior"**
Está em `scopr` (`https://scopr-gray.vercel.app/`) ou `consulta-antt`. Precisa inspecionar o código para comparar com Gemini e decidir se mantém.

**F. App Consulta ANTT (`consulta-antt`)**
Existe localmente e em `https://consulta-antt-mauve.vercel.app/`. Diagnosticar: o que já tem, qual API usa, se tem integração com a mesma chave/gateway, e se deve ser integrado ao hub ou permanecer standalone.

**G. Integração Frota e YFFinance com o gateway**
Criar `api/ai-proxy.js` + variável `AI_GATEWAY_TOKEN` em cada app. Ver seção 2 acima.

---

## 4. Decisões de arquitetura tomadas (não rever sem motivo)

- **AI só sugere, humano confirma** — regra de ouro do projeto. O modal de revisão nunca salva sem ação do usuário.
- **Chave de IA nunca no front** (sem `VITE_` prefix) — vive só no gateway ou no `api/` serverless.
- **Provider é a única peça que troca** ao mudar de IA — `api/_ai/provider.js`.
- **Adicionar tipo de documento = adicionar perfil** em `profiles.js` — sem tocar modal ou endpoints.
- **Gateway normaliza, app salva no próprio Supabase** — fronteira clara, sem vazamento de schema.
- **App.jsx nunca editado com Edit/Write** (risco de truncamento no arquivo de 93KB) — usar Python scripts.

---

## 5. Arquivos críticos por projeto

```
controle-operacional/
├── api/_ai/
│   ├── provider.js     ← trocar IA aqui
│   ├── profiles.js     ← adicionar documentos aqui (nfd, crlv, rodorrica)
│   └── engine.js       ← orquestrador (raramente muda)
├── api/ai-extract.js   ← endpoint único do CO
├── src/modals/ModalNFD.jsx       ← botão "Analisar foto com IA" (fase 1)
├── src/utils/analyzeNfdFoto.js   ← helper NFD
├── src/utils/rodorricaParse.js   ← helper Rodorrica (AI remap)
├── src/design-system/
│   ├── theme-light.css  ← tokens corrigidos (WCAG AAA)
│   └── theme-dark.css
├── src/views/PlanilhaView.jsx    ← cores semânticas corrigidas
├── docs/gateway-template/        ← cópia portátil do gateway (enviada ao yf-ai-gateway)
└── docs/IMPLEMENTAR-NOS-OUTROS-APPS.md   ← guia Frota + YFFinance

yf-ai-gateway/ (repo separado, publicado)
├── api/_ai/{provider,profiles,engine}.js
└── api/extract.js
```

---

## 6. Como retomar na sessão local

1. Abrir Claude Code na pasta `C:\Users\yvesf\DevYFGroup`:
   ```powershell
   cd C:\Users\yvesf\DevYFGroup
   claude
   ```
2. Carregar este arquivo como contexto inicial.
3. Pedir para verificar `scopr` e `consulta-antt` primeiro (diagnóstico da IA anterior).
4. Em seguida: `ModalDocIntake` + suporte PDF + fluxo CRLV no `controle-operacional`.
5. Mergar PR #8 quando confirmar que o tema claro está OK.

---

## 7. Credenciais / tokens (não colocar no git do projeto)

| Segredo | Onde está |
|---------|-----------|
| `AI_GATEWAY_TOKEN` | `6dd8ae7c9ee21014a70d563a2f9821c7968ec47c8b22fa3a4507cc2f0f6fd121` |
| `AI_API_KEY` (Gemini) | Configurada na Vercel do `controle-operacional` e `yf-ai-gateway` |
| Gateway URL | `https://yf-ai-gateway.vercel.app/api/extract` |

---

*Gerado em 2026-06-23 pela sessão Claude Code (claude.ai/code/session_01KrKKQcYGZdcc4k7Gp4PGFL)*
