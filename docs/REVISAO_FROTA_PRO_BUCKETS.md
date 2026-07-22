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

## O que fazer no frota-pro (sessão futura)
1. Confirmar no código do frota-pro onde as URLs desses 3 buckets são geradas/exibidas.
2. Trocar por **signed URLs** (`createSignedUrl`, com expiração) OU servir via proxy autenticado.
3. Tornar os buckets **privados** (`public = false`) — mesmo estado de `inspecoes-pneu`.
4. Adicionar **policies de Storage** (`storage.objects`) restringindo leitura a usuários
   autenticados/donos, em vez de acesso público.
5. Testar upload + exibição no frota-pro antes de fechar.

## Também no dashboard (Auth) — vale para todo o projeto Supabase
- **Leaked Password Protection Disabled** (advisor): ligar em
  Authentication → Policies (check HIBP de senha vazada). 1 clique, grátis.
  Baixo impacto no controle-operacional (auth próprio), mas protege o fluxo OAuth do hub.
