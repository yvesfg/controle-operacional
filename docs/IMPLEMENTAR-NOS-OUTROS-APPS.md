# Como implementar o Gateway de IA nos outros apps

> **Leia antes:** O gateway de referência já está em produção no **Controle Operacional**.
> Este guia explica como levantar o serviço central e integrar **Frota** e **YFFinance**.

---

## Visão geral do fluxo

```
[Frota / YFFinance — front]
   ↓  POST /api/ai-proxy  (endpoint local p/ esconder o token)
[Função serverless do próprio app]
   ↓  POST https://yf-ai-gateway.vercel.app/api/extract
      header: x-ai-token: <AI_GATEWAY_TOKEN>
[yf-ai-gateway — serviço central]
   ↓  Gemini (a chave fica SÓ aqui)
   ↓  JSON neutro: { campo: valor, ... }
[App — front]
   ↓  Pré-preenche o formulário → operador confirma → grava no banco
```

A IA **só sugere**. O operador confirma antes de salvar.
A chave de IA fica **apenas** no `yf-ai-gateway`. Os outros apps nunca a veem.

---

## ETAPA 1 — Criar e publicar o yf-ai-gateway (15 min)

### 1.1 Criar o repo no GitHub

1. Acesse github.com/new
2. Nome: **yf-ai-gateway** · Privado ✓ · Sem README · Sem .gitignore
3. Copie os arquivos de `docs/gateway-template/` (neste repo) para o novo repo:

```
docs/gateway-template/  →  yf-ai-gateway/
  api/_ai/provider.js
  api/_ai/profiles.js
  api/_ai/engine.js
  api/extract.js
  vercel.json
  package.json
  .env.example
```

> **Dica rápida:** Abra uma sessão Claude Code com o repo `yf-ai-gateway` e diga
> "copie os arquivos de `docs/gateway-template/` do controle-operacional".

### 1.2 Deploy na Vercel

1. Vercel → Add New Project → Import `yf-ai-gateway`
2. Framework: **Other** (sem build step)
3. Settings → Environment Variables → adicione:

| Variável | Valor |
|---|---|
| `AI_API_KEY` | sua chave Gemini (a mesma do CO) |
| `AI_PROVIDER` | `gemini` |
| `AI_MODEL` | `gemini-2.0-flash` |
| `AI_GATEWAY_TOKEN` | gere com `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | URLs dos 3 apps separadas por vírgula |

4. Deploy. A URL do serviço será `https://yf-ai-gateway.vercel.app` (ou similar).

### 1.3 Testar o gateway isolado

```bash
curl -X POST https://yf-ai-gateway.vercel.app/api/extract \
  -H "Content-Type: application/json" \
  -H "x-ai-token: SEU_TOKEN" \
  -d '{"profile":"nfd","image":"<dataURL de uma foto de NFD>"}'
# Deve retornar: { "numero": "...", "valor": "...", "tipo": "...", ... }
```

---

## ETAPA 2 — Integrar no Frota (frota-yfgroup)

### 2.1 Variáveis de ambiente (Vercel do Frota)

| Variável | Valor |
|---|---|
| `AI_GATEWAY_URL` | `https://yf-ai-gateway.vercel.app/api/extract` |
| `AI_GATEWAY_TOKEN` | mesmo token gerado no 1.2 |

### 2.2 Endpoint serverless proxy (`api/ai-proxy.js`)

Crie este arquivo no Frota. Ele esconde o token e faz o CORS funcionar:

```js
// api/ai-proxy.js  (Frota — frota-yfgroup)
export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido" }); return; }
  try {
    const r = await fetch(process.env.AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ai-token": process.env.AI_GATEWAY_TOKEN,
      },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

### 2.3 Utilitário no front (`src/utils/aiExtract.js`)

```js
// src/utils/aiExtract.js  (Frota)
// Chama o proxy local que por sua vez chama o gateway central.
// A IA SÓ SUGERE — nunca grave direto sem confirmação do operador.

export async function aiExtract(profile, payload) {
  const r = await fetch("/api/ai-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, ...payload }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  return r.json();
}

// Analisa a foto de um documento (reduz antes de enviar)
export async function analisarFoto(dataUrl, profile = "nfd") {
  const small = await downscale(dataUrl, 1600, 0.8);
  return aiExtract(profile, { image: small, mimeType: "image/jpeg" });
}

// Mapeia cabeçalhos de uma planilha
export async function mapearPlanilha(headers, sample, profile) {
  return aiExtract(profile, { headers, sample });
}

function downscale(dataUrl, maxPx, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    img.src = dataUrl;
  });
}
```

### 2.4 Usar num modal do Frota (exemplo)

```jsx
import { useState } from "react";
import { analisarFoto } from "../utils/aiExtract.js";

// Dentro do componente, onde já existe upload de foto:
const [iaLoading, setIaLoading] = useState(false);

// Botão a adicionar após o upload de foto:
{fotos.length > 0 && (
  <button disabled={iaLoading} onClick={async () => {
    try {
      setIaLoading(true);
      const s = await analisarFoto(fotos[0].preview, "nfd"); // troque o profile
      // Pré-preenche os campos com as sugestões da IA:
      setForm(prev => ({
        ...prev,
        ...(s.numero ? { numero: s.numero } : {}),
        ...(s.valor  ? { valor:  s.valor  } : {}),
        ...(s.tipo   ? { tipo:   s.tipo   } : {}),
      }));
      showToast(`✨ IA sugeriu — confira os campos · ${Math.round((s.confianca||0)*100)}% conf.`, "ok");
    } catch (e) {
      showToast("⚠️ IA: " + e.message, "warn");
    } finally {
      setIaLoading(false);
    }
  }}>
    {iaLoading ? "Analisando…" : "✨ Analisar com IA"}
  </button>
)}
```

### 2.5 Adicionar perfil específico do Frota no gateway

Se o Frota tiver tipos de documento diferentes dos do CO, abra o `yf-ai-gateway`
e adicione o perfil em `api/_ai/profiles.js`:

```js
// Em profiles.js do yf-ai-gateway — adicione após os perfis existentes:
comprovante_frete: {
  kind: "image",
  buildInstruction() {
    return `Leia o comprovante de frete e extraia:
{ "cte": "<número do CT-e ou vazio>", "valor": "<R$ 0,00 ou vazio>",
  "remetente": "<nome ou vazio>", "destinatario": "<nome ou vazio>",
  "data": "<YYYY-MM-DD ou vazio>", "confianca": <0-1> }
Não invente. JSON apenas.`;
  },
  normalize(out) {
    return {
      cte: String(out?.cte || "").trim(),
      valor: String(out?.valor || "").trim(),
      remetente: String(out?.remetente || "").trim(),
      destinatario: String(out?.destinatario || "").trim(),
      data: String(out?.data || "").trim(),
      confianca: typeof out?.confianca === "number" ? out.confianca : null,
    };
  },
},
```

Depois chame com `profile: "comprovante_frete"`.

---

## ETAPA 3 — Integrar no YFFinance (yffinance)

**Igual ao Frota (etapas 2.1–2.4)** com duas diferenças:

### Variáveis de ambiente (Vercel do YFFinance)

Mesmas que o Frota: `AI_GATEWAY_URL` e `AI_GATEWAY_TOKEN`.

### Perfil típico para o YFFinance

```js
// Em profiles.js do yf-ai-gateway:
comprovante_pagamento: {
  kind: "image",
  buildInstruction() {
    return `Leia o comprovante de pagamento/transferência bancária brasileiro.
Extraia: { "valor": "<0,00 ou vazio>", "data": "<YYYY-MM-DD ou vazio>",
  "descricao": "<histórico/descrição resumido ou vazio>",
  "banco_origem": "<banco pagador ou vazio>",
  "banco_destino": "<banco recebedor ou vazio>",
  "confianca": <0-1> }
Não invente. JSON apenas.`;
  },
  normalize(out) {
    return {
      valor: String(out?.valor || "").trim(),
      data: String(out?.data || "").trim(),
      descricao: String(out?.descricao || "").trim(),
      banco_origem: String(out?.banco_origem || "").trim(),
      banco_destino: String(out?.banco_destino || "").trim(),
      confianca: typeof out?.confianca === "number" ? out.confianca : null,
    };
  },
},
```

---

## Resumo executivo (checklist)

### yf-ai-gateway
- [ ] Criar repo `yf-ai-gateway` (privado)
- [ ] Copiar `docs/gateway-template/` → raiz do repo
- [ ] Deploy na Vercel: setar `AI_API_KEY`, `AI_GATEWAY_TOKEN`, `ALLOWED_ORIGINS`
- [ ] Testar com `curl` (seção 1.3)
- [ ] Adicionar perfis do Frota/YFFinance em `api/_ai/profiles.js`

### Frota (`frota-yfgroup`)
- [ ] Setar `AI_GATEWAY_URL` e `AI_GATEWAY_TOKEN` na Vercel
- [ ] Criar `api/ai-proxy.js` (seção 2.2)
- [ ] Criar `src/utils/aiExtract.js` (seção 2.3)
- [ ] Adicionar botão "✨ Analisar com IA" nos modais de upload (seção 2.4)
- [ ] Liberar `ALLOWED_ORIGINS` no gateway com a URL do Frota

### YFFinance (`yffinance`)
- [ ] Setar `AI_GATEWAY_URL` e `AI_GATEWAY_TOKEN` na Vercel
- [ ] Criar `api/ai-proxy.js` (igual ao Frota)
- [ ] Criar `src/utils/aiExtract.js` (igual ao Frota)
- [ ] Adicionar botão nos modais de import/lançamento
- [ ] Liberar `ALLOWED_ORIGINS` no gateway com a URL do YFFinance

### Trocar de IA no futuro
- [ ] Editar **só** `api/_ai/provider.js` no `yf-ai-gateway`
- [ ] Setar nova chave na Vercel do gateway
- [ ] Um deploy → funciona nos 3 apps automaticamente

---

## Atenção: o que NÃO muda em cada app

- O banco de dados (Supabase) de cada app — o gateway nunca toca nele
- O fluxo de confirmação — a IA sugere; o operador sempre confirma antes de salvar
- O restante dos modais/forms — só se adiciona o botão de análise
