# Diagnóstico — Sync Maracanaú (401 no Supabase API log)

**Data:** 2026-07-23 · **Projeto:** controle-operacional · **Supabase ref:** `qdrhkkjawklqfsoyxhpd`

## TL;DR

O Maracanaú **está sincronizando normalmente**. Os `401` (e um `400`) do API log vêm de **script(s) Apps Script duplicado/antigo**, não da planilha ativa. Premissa inicial ("não está sincronizando") não se confirmou.

## Evidências (consulta à API ao vivo com a anon key atual)

| Verificação | Resultado |
|---|---|
| `co_config → gsheet_sync_status_maracanau` | **ok:true**, `sincronizados:371`, `erros_http:0`, às **23/07 12:49** |
| Total de linhas em `controle_operacional_maracanau` | **372** (bate com os 371) |
| Upsert real mais recente (`updated_at`) | **23/07 11:04 (SP)** — hoje |
| GET na própria `controle_operacional_maracanau` com a anon key | **200** |
| Imperatriz / AVB no mesmo horário | 12:45 ok / 12:44 ok |
| Policies anon da tabela (schema snapshot 2026-07-22) | `anon_read/write/upd_maracanau (true)` — existem e liberam |

## Causa raiz

- **`401` = apikey rejeitada** (antes de policy; policy daria `403`). Como `gravarStatus` e o upsert usam a **mesma** `SUPA_KEY`, é impossível o mesmo script tomar 401 na tabela e 200 no `co_config`.
- Logo os erros são de **outros projetos Apps Script**, com key velha / coluna antiga:
  - `UAEmdDd--EA8…b7pclZcSXs` → `401` em `controle_operacional_maracanau?on_conflict=dt` (key antiga, ou execuções da manhã antes da correção).
  - `UAEmdDd_IHKKk…5Sp8yDf0` → `400` em `co_config?on_conflict=key` (usa `key` em vez de `chave`).
- Nenhum dos dois está no repo (só existiram `SyncSupabase.gs` e `SyncSupabase_AVB.gs`) — vivem só no Apps Script.

## Correção

Anon key **correta e atual** (mesma do `SyncSupabase_AVB.gs`, exp 2036). Nos scripts do Maracanaú, o topo deve ficar:

```javascript
var SUPA_URL  = 'https://qdrhkkjawklqfsoyxhpd.supabase.co';
var SUPA_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcmhra2phd2tscWZzb3l4aHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTY2ODQsImV4cCI6MjA4OTE3MjY4NH0.zHl9-Ei9IDBcxzoZDz650E4JsBeV0HsQqTDgDZ4K1B8';
```

No script que dá `400`: trocar `?on_conflict=key` → `?on_conflict=chave` e, no payload, `key:`/`value:` → `chave:`/`valor:`.

**Recomendado:** em vez de só corrigir a key das cópias, **apagar os gatilhos/projetos duplicados** (`…b7pclZcSXs` e `…5Sp8yDf0`) e deixar só o que já roda ok — dois/três scripts escrevendo na mesma tabela a cada 15 min é desperdício.

## Verificação (após agir)

1. `gsheet_sync_status_maracanau` deve **avançar de timestamp** a cada ~15 min.
2. No Supabase API log, as linhas `401`/`400` dessas duas ids devem **parar** de aparecer.

## Aberto

Quantos projetos/gatilhos apontam pra planilha do Maracanaú?
- **1** → os 401 são execuções antigas (já resolvido); só limpar/filtrar o log.
- **>1** → há duplicata ativa a remover.

## Observações

- A anon key acima é **pública** (já versionada no `_AVB.gs` e no bundle do front) — sem risco em expor.
- O `.gs` escreve via anon direto **por design** até a Fase B do lockdown (`docs/PLANO_V2_CONTINUACAO.md`).
