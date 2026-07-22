# Revisão de segurança — Buckets do frota-pro (OUTRO PROJETO)

> Criado a partir da auditoria de segurança do **controle-operacional** (2026-07-22).
> Este item **NÃO é do controle-operacional** — é do projeto **frota-pro**, mas usa o
> **mesmo projeto Supabase** (`controle-operacional`, ref `qdrhkkjawklqfsoyxhpd`).
> Abrir numa sessão do frota-pro para tratar.

## Problema (advisor Supabase: "Public Bucket Allows Listing")
Três buckets de Storage estão **públicos e com listagem permitida**:

| Bucket | público | conteúdo |
|---|---|---|
| `abastecimentos` | **sim** | comprovantes de abastecimento (fotos/PDF) |
| `manutencoes`    | **sim** | comprovantes/ordens de manutenção |
| `pneus`          | **sim** | fotos de pneus |
| `inspecoes-pneu` | não (já privado) | — (referência do estado correto) |

"Público + listável" = qualquer pessoa com a URL do bucket consegue **enumerar e baixar
todos os arquivos**, sem autenticação. Como são comprovantes operacionais, é exposição
indevida de documento (potencial LGPD, dependendo do que aparece nos comprovantes).

## Por que não foi corrigido agora
- São buckets do **frota-pro**, fora do escopo do app controle-operacional.
- O frota-pro exibe as imagens via **URL pública** (ver `supaStorageUpload` que retorna
  `.../object/public/<bucket>/...`). Torná-los privados **quebra a exibição** até o
  frota-pro passar a gerar **signed URLs**.

## O que fazer no frota-pro — STATUS 2026-07-22
1. ✅ URLs geradas em `src/lib/{abastecimentos,manutencoes,pneus}Repo.js` (getPublicUrl),
   exibidas em `AbastecimentoModal`, `ManutencaoModal` e `TireControlModal` (CardPneu).
2. ✅ Signed URLs implementadas: `src/lib/storageUrl.js` (`resolveStorageUrl`/`useStorageUrl`,
   1h de validade; aceita URL pública legada do banco ou path puro).
3./4. ✅ Migration `004_buckets_privados.sql` APLICADA em 2026-07-22 (após deploy do
   front): buckets private + read=tem_acesso viewer, escrita=editor (padrão inspecoes-pneu).
   Verificado: URL pública antiga responde 400; advisor "Public Bucket Allows Listing" sumiu.
5. ⏳ Teste manual pendente: abrir Frota pelo hub e conferir foto/NF em
   Abastecimento, Manutenção e Pneus (exibição via signed URL) + um upload novo.

## Também no dashboard (Auth) — vale para todo o projeto Supabase
- **Leaked Password Protection Disabled** (advisor): ❌ NÃO DISPONÍVEL — o check HIBP
  é exclusivo de **Pro Plan e acima** (tentado em 2026-07-22: "available on Pro Plans
  and up"; org YFGroup está no Free). O advisor vai continuar aparecendo — ignorar.
  Impacto real baixo: login principal do hub é Google OAuth (sem senha) e o
  controle-operacional usa auth próprio com hash via RPC.
