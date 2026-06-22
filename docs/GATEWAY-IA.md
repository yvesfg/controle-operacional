# Gateway de IA — contrato compartilhado (CO · Frota · YFFinance)

Camada única de IA para **importação de documentos**. Um endpoint, um provedor,
um lugar para trocar de IA. Cada app chama o gateway e **traduz o resultado pro
seu próprio banco** — o gateway nunca conhece schema de banco de nenhum app.

## As 3 camadas (e a fronteira que não se cruza)

| Camada | Arquivo (referência neste repo) | Compartilhável? |
|---|---|---|
| **Provedor** (qual IA, chave, formato da chamada) | `api/_ai/provider.js` | ✅ trocar aqui afeta tudo |
| **Perfis** (prompt + formato neutro de saída por tipo de doc) | `api/_ai/profiles.js` | ✅ |
| **Motor** (orquestra perfil + provedor) | `api/_ai/engine.js` | ✅ |
| **Endpoint** (HTTP + auth) | `api/ai-extract.js` | ✅ |
| **Mapeamento → banco** (resultado → tabelas) | **em cada app** | ❌ fica local |

> Regra de ouro: o gateway devolve **fatos extraídos do documento** num formato
> neutro. Quem grava no Supabase (respeitando o schema de cada app) é cada app.

## Endpoint

```
POST /api/ai-extract
Content-Type: application/json
x-ai-token: <AI_GATEWAY_TOKEN>      # só se a env estiver setada
```

Corpo:

```jsonc
{
  "profile": "nfd" | "rodorrica" | ...,  // qual perfil de documento
  "image": "<dataURL ou base64>",        // perfis kind:"image"
  "mimeType": "image/jpeg",              // opcional
  "headers": ["COL A", "COL B", ...],    // perfis kind:"table"
  "sample": [ { "COL A": "..." }, ... ]  // perfis kind:"table" (poucas linhas)
}
```

Respostas (formato neutro, por perfil):

```jsonc
// profile: "nfd"
{ "numero": "123456", "valor": "1.234,56", "tipo": "avaria",
  "confianca": 0.92, "observacao": "" }

// profile: "rodorrica"
{ "mapping": { "DT CARREGAMENTO": "<cabeçalho real>", "VALOR FINAL": "...", ... } }
```

Erros: `{ "error": "<mensagem>" }` com 400 (entrada inválida / perfil
desconhecido), 401 (token), 405 (método), 500 (falha da IA).

## Como cada app integra

1. No upload, monte a carga (imagem em base64, ou `headers`+`sample` da planilha).
2. `POST /api/ai-extract` com o `profile` certo (proxie via uma function do
   próprio app **ou** chame o gateway central — ver abaixo).
3. **Pré-preencha o formulário** com o JSON neutro. A IA **sugere**; o operador
   confirma antes de salvar.
4. Grave no **seu** banco no seu próprio código de persistência.

## Trocar de IA

Só `api/_ai/provider.js`: implemente o equivalente a `geminiGenerate` para o novo
provedor e troque a env `AI_PROVIDER`. Nenhum app precisa de mudança.

## Adicionar um tipo de documento

Só `api/_ai/profiles.js`: adicione `{ kind, buildInstruction, normalize }`. O
endpoint e o motor não mudam.

## Variáveis de ambiente (servidor)

| Env | Função |
|---|---|
| `AI_API_KEY` | chave do provedor (ex.: Gemini) |
| `AI_PROVIDER` | provedor (default `gemini`) |
| `AI_MODEL` | modelo (default `gemini-2.0-flash`) |
| `AI_GATEWAY_TOKEN` | se setado, exige `x-ai-token` no endpoint |

## Centralizar de verdade (próximo passo, fora deste repo)

Hoje o núcleo `api/_ai/` + `api/ai-extract.js` roda **dentro do Controle
Operacional** (referência). Para virar um serviço único que Frota e YFFinance
consomem sem duplicar nada:

1. Copie `api/_ai/` e `api/ai-extract.js` para um projeto Vercel dedicado
   (ex.: `yf-ai-gateway`), com `AI_API_KEY` + `AI_GATEWAY_TOKEN`.
2. Em cada app, chame `https://yf-ai-gateway.vercel.app/api/ai-extract` com o
   token — e libere esse host no CSP (`connect-src`).
3. Trocar de IA passa a ser **um deploy**, válido para os 3 apps.
