-- =============================================
-- Migration 039: EMERGÊNCIA — restaura SELECT anon (core, 3 bases) p/ destravar UPSERT do .gs
-- =============================================
-- A migration 035 (read-lockdown) quebrou o UPSERT (?on_conflict=dt) do SyncSupabase.gs
-- nas 3 bases (Imperatriz/Belém, AVB, Maracanaú) — TODAS, não só uma.
--
-- CAUSA RAIZ (achada em 2026-07-23, reproduzida com curl direto): Postgres exige
-- visibilidade via policy de SELECT pro papel executor pra resolver ON CONFLICT DO
-- UPDATE — mesmo pra uma linha TOTALMENTE NOVA (o mecanismo de arbitragem do conflito
-- precisa "ver" a tabela). Sem policy de SELECT pro anon, TODO upsert falha com
-- 401 / SQLSTATE 42501 "new row violates row-level security policy for table X",
-- mesmo as policies de INSERT/UPDATE estando 100% corretas (confirmado: with_check=true,
-- grants intactos). Isso ficou disfarçado de "script errado"/"chave errada" no
-- Maracanaú porque foi o primeiro caso investigado, mas o mesmo teste em
-- controle_operacional (core) reproduziu o MESMO erro.
--
-- LIÇÃO CRÍTICA pro plano (ver PLANO_V2_CONTINUACAO.md): Fase A (fechar leitura) e
-- Fase B (reescrever o .gs pra RPC) NÃO são independentes quando o escritor usa
-- UPSERT. Não dá pra fechar SELECT anon enquanto o .gs gravar direto via
-- ?on_conflict=... — tem que ser as duas juntas (ou B antes de A).
--
-- Restaura leitura anon nas 3 bases (mesmo texto da 033/rollback anterior).
CREATE POLICY anon_read_controle  ON controle_operacional             FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_avb        ON controle_operacional_avb         FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_maracanau  ON controle_operacional_maracanau   FOR SELECT TO anon USING (true);

-- Provado depois (curl direto, mesma chave/endpoint do .gs): upsert em controle_operacional
-- e controle_operacional_maracanau retornam 201 (antes: 401/42501 nos dois).
