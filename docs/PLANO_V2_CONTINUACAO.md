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

## Fase A — `controle_operacional` READ-lockdown  ⚠️ 030 REVERTIDA PELA 033 (2º abort, 2026-07-23)
> A 030 funcionou no banco, mas o app zerou em prod horas depois — causa NÃO foi o
> deps-fix (que está correto e deployado): os testes das RPCs 031/032 chamaram
> `gerar_token_sessao('admin@sistema')` no banco, que ROTACIONA o token e derrubou a
> sessão viva do navegador. Com a leitura anon fechada, sem token válido = tela vazia.
> A 033 reabriu tudo (core + frete_conferencia).
>
> COMO REFAZER (3ª tentativa — checklist NOVO):
>   1. Testes de RPC no banco: criar usuário de teste temporário (nunca tokenar usuário real).
>   2. Conferir commit do front no origin/main E deploy Vercel concluído DEPOIS do commit.
>   3. Yves loga/recarrega; provar pelo Supabase API log que o app chama rpc/listar_operacional
>      e rpc/listar_frete_* (e NÃO GET nas tabelas) — só então derrubar as policies.
>   4. Após derrubar: Yves recarrega e confirma; monitorar logs por alguns minutos.

### Histórico — 028→029 (tentada e revertida)
**Fecha o CPF/financeiro do core sem tocar no `.gs`** (o .gs só ESCREVE, não lê).

> POST-MORTEM (2026-07-22): a 028 derrubou o SELECT anon e o dashboard ficou VAZIO.
> Causa: no front o sync roda em `[authed]` e o `sessionToken` é assíncrono → no 1º
> sync o token é null → GET anon → que a trava zerou. No banco a RPC funciona
> (listar_operacional retornou 1066 com token de admin). O fix de re-sync
> `[authed, sessionToken]` (ebf2138) resolve, mas não estava deployado quando a 028
> já valia. **Revertido pela 029.**
>
> COMO REFAZER COM SEGURANÇA:
> 1. Garantir que ebf2138 (re-sync) esteja DEPLOYADO e, idealmente, fazer o sync
>    AGUARDAR o token (não sincronizar sem token) em vez de cair no GET.
> 2. Com a policy AINDA aberta, logar no app e confirmar que o dashboard carrega
>    (o path RPC é usado quando há token) — só então derrubar o SELECT.
> 3. Reaplicar o DROP das 3 policies de leitura.

1. **Wiring (front) — ✅ FEITO 2026-07-23.** O efeito de re-sync já existe
   (`App.jsx:506`, `[authed, sessionToken]`) e o de troca de base também
   (`App.jsx:140`, `[baseAtual]`). O que faltava era a **CAUSA RAIZ**: o callback
   `sincronizar` (`useSyncHandlers.js`) estava memoizado com deps
   `[getConexao, dadosExtras, showToast]` — **sem `sessionToken` nem `baseAtual`** —,
   então congelava `sessionToken=null`/`baseAtual` da criação. Os efeitos re-disparavam
   mas chamavam o MESMO closure velho → caía no GET anon (mascarado enquanto a policy
   está aberta, porque o GET usa `tblRef.current`). Fix: deps agora são
   `[getConexao, dadosExtras, showToast, sessionToken, baseAtual]`. Com isso o path RPC
   usa o token/base frescos assim que chegam. Build OK.
2. ~~Verificar escopo de `sincronizar()`~~ — não se aplica (fix foi nas deps do hook).
3. **Migration** (drop só do SELECT anon nas 3 bases):
   ```sql
   DROP POLICY IF EXISTS anon_read_controle   ON controle_operacional;
   DROP POLICY IF EXISTS anon_read_avb         ON controle_operacional_avb;
   DROP POLICY IF EXISTS anon_read_maracanau   ON controle_operacional_maracanau;
   ```
4. **Provar antes** (✅ 2026-07-23): `listar_operacional(gerar_token_sessao('admin@sistema'),'imperatriz_belem',100000,0)`
   retornou **1071 linhas** no banco. Policies de leitura confirmadas AINDA ABERTAS (029 vigente).
   **Falta a prova no NAVEGADOR** (obrigatória antes do DROP): com o fix deployado e a
   policy ainda aberta, logar como admin e confirmar dashboard cheio (o path RPC é usado
   quando há token). **Provar depois:** anon `SELECT` nas 3 tabelas = 0 linhas.

   > ⚠️ ORDEM CRÍTICA: (1) Yves faz commit+push do fix (Vercel auto-deploy) →
   > (2) confirma no app logado que o dashboard carrega → (3) SÓ ENTÃO aplico a 028.
   > Não aplicar a 028 antes do deploy confirmado (foi o que quebrou da última vez).
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

### Progresso Fase C
- ✅ **`frete_conferencia` (2026-07-23)** — migration **031** (6 RPCs token-validadas) em prod;
  dual-path em `freteConferencia.js` + `setFreteToken` no App.jsx; build OK; testado no banco
  (reads 368/103/1, insert→patch→delete, token inválido rejeitado). **Go-live = migration 032**
  (drop das 4 policies anon), PRONTA e comentada — aplicar SÓ após deploy + confirmação no app
  (Conferência de Frete: lista/dashboard, decidir/estornar, importar, sinalizados).
- 🟡 **`despesas_filial` (2026-07-23)** — migration **037** (8 RPCs) em prod; dual-path em
  `despesas.js` + `setDespesasToken` no App.jsx; build OK; testado no banco (343/4/74, ciclo
  insert→patch→excluir). **Go-live = migration 038** PRONTA — aplicar após deploy + prova no
  API log (rpc/listar_despesas etc. na sessão do usuário; abas Painel Financeiro / Resultado /
  Créditos Pendentes usam a tabela).
- ⬜ `embarcadoras` — `embarcadoras.js` (CNPJ).
- ⬜ `co_ocorrencias` — `useOcorrHandlers.js` + `relatorioEngine.js` (leem por GET direto).

## Itens fora deste app (ver docs próprios)
- Buckets públicos do frota-pro → `docs/REVISAO_FROTA_PRO_BUCKETS.md`.
- Leaked Password Protection (dashboard Auth) → idem.

## Backlog de features (fazer DEPOIS da segurança)
- `docs/BACKLOG_POS_SEGURANCA.md` (COD BCO + PIX no cadastro; sinalizados/revisados clicáveis).
