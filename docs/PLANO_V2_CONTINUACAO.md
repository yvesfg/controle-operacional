# Plano V2 — continuação do lockdown (tabelas operacionais)

Estado em 2026-07-22. Já FECHADO em prod: `co_usuarios` (V1), `motoristas`, `veiculos`
(RPCs token-validadas + dual-path no front + policies anon derrubadas). Hardening de
`search_path`, ErrorBoundary e `verificarSenha` também feitos.

Falta fechar as tabelas abaixo (ainda com policies `anon ... USING(true)` — leitura/escrita
pela anon key). Cada uma segue o MESMO molde de motoristas, com uma diferença crítica em
`controle_operacional` (escritor externo).

## Inventário de acesso (como o app fala com cada tabela hoje)

| Tabela | Leitura (app) | Escrita (app) | Escritor EXTERNO | Sensibilidade |
|---|---|---|---|---|
| `controle_operacional` (+ `_avb`, `_maracanau`) | RPC `listar_operacional` (token) c/ fallback GET — **1 só ponto**: `useSyncHandlers.js:26` | **RPC** `upsert/patch/delete_operacional` (token) — `useDTHandlers.js` | **SIM — `SyncSupabase.gs`** faz `POST /rest/v1/controle_operacional?on_conflict=dt` direto (linha ~219) | CPF, financeiro |
| `co_config` | GET direto (`useAuthHandlers`) | POST direto | **SIM — `SyncSupabase.gs`** (TAB_CFG) | hash admin já protegido por policy |
| `co_ocorrencias` | GET direto (`useOcorrHandlers`, `relatorioEngine`) | POST direto (`useOcorrHandlers`) | Não | ocorrências |
| `embarcadoras` | GET direto (`embarcadoras.js`) | POST/PATCH direto | Não | CNPJ |
| `frete_conferencia` | GET direto (`freteConferencia.js`) | POST/PATCH/DELETE direto | Não | financeiro |
| `despesas_filial` | GET direto (`despesas.js`) | POST/PATCH/DELETE direto | Não | financeiro |
| `co_logs_alteracoes` | — | POST direto (`useAdminHandlers`) | Não | logs |

RPCs SECURITY DEFINER que já existem e ajudam: `listar_operacional`, `upsert_operacional`,
`upsert_operacional_cod`, `patch_operacional`, `delete_operacional`, `listar_ocorrencias`,
`listar_ocorrencias_bulk` (estas 2 de ocorrências existem mas o app AINDA lê por GET direto).

---

## Fase A — `controle_operacional` READ-lockdown (RECOMENDADO como próximo passo)
**Fecha o CPF/financeiro do core sem tocar no `.gs`** (o .gs só ESCREVE, não lê).

1. **Wiring (front):** garantir re-sync quando o token chega, senão o 1º load pode vir vazio.
   Em `App.jsx`, no efeito que já roda em `[sessionToken]` (o mesmo que chama
   `setMotoristasToken`), adicionar `if (sessionToken) sincronizar();`.
   (Hoje o sync roda em `[authed]`; o token é assíncrono e pode chegar depois.)
2. **Verificar** que `sincronizar()` está em escopo nesse ponto (vem de `useSyncHandlers`,
   linha ~432 — o efeito precisa vir DEPOIS dessa desestruturação).
3. **Migration** (drop só do SELECT anon nas 3 bases):
   ```sql
   DROP POLICY IF EXISTS anon_read_controle   ON controle_operacional;
   DROP POLICY IF EXISTS anon_read_avb         ON controle_operacional_avb;
   DROP POLICY IF EXISTS anon_read_maracanau   ON controle_operacional_maracanau;
   ```
4. **Provar antes** (rollback): `listar_operacional(gerar_token_sessao('admin@sistema'),'imperatriz_belem',...)` retorna linhas.
   **Provar depois:** anon `SELECT` nas 3 tabelas = 0 linhas.
5. Manter INSERT/UPDATE anon (o `.gs` depende) até a Fase B.

## Fase B — `controle_operacional` WRITE-lockdown (precisa reescrever o `.gs`)
1. Criar RPC de **upsert em lote** token-validada (o `.gs` upserta em bloco), ex.:
   `upsert_operacional_lote(p_token, p_base, p_rows jsonb)`.
2. Criar um **usuário de serviço** em `co_usuarios` (perfil próprio) + token de sessão
   longo/rotativo para o `.gs` (guardar em Script Properties do Apps Script).
3. Trocar no `SyncSupabase.gs`: `POST /rest/v1/controle_operacional` → `POST /rest/v1/rpc/upsert_operacional_lote`
   com `x-... ` e `{p_token, p_base, p_rows}`. Idem `co_config` (TAB_CFG) se for fechar.
4. **Yves cola o `.gs` novo e roda o sync** para validar.
5. Só então: `DROP POLICY anon_write/upd/del` de `controle_operacional*`.

## Fase C — tabelas app-only (`embarcadoras`, `frete_conferencia`, `despesas_filial`, `co_ocorrencias`)
Sem escritor externo → molde idêntico ao de motoristas (uma por vez, cada uma sua sessão):
1. Criar RPCs `listar_/criar_/atualizar_/excluir_<tabela>(p_token, ...)` (testar em rollback).
2. Dual-path no arquivo de domínio (`embarcadoras.js`, `freteConferencia.js`, `despesas.js`)
   + no caso de ocorrências, também `useOcorrHandlers.js`/`relatorioEngine.js` (leem por GET).
   Injetar token via `setXToken()` num efeito `[sessionToken]` no App (padrão motoristas.js).
3. Build + commit + push (dual-path é seguro, nada quebra enquanto policy aberta).
4. Deploy + teste → go-live: `DROP POLICY anon_*`.
Prioridade sugerida: `frete_conferencia` e `despesas_filial` (financeiro) > `embarcadoras` (CNPJ) > `co_ocorrencias`.

## Itens fora deste app (ver docs próprios)
- Buckets públicos do frota-pro → `docs/REVISAO_FROTA_PRO_BUCKETS.md`.
- Leaked Password Protection (dashboard Auth) → idem.

## Backlog de features (fazer DEPOIS da segurança)
- `docs/BACKLOG_POS_SEGURANCA.md` (COD BCO + PIX no cadastro; sinalizados/revisados clicáveis).
