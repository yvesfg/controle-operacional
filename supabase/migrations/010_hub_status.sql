-- =============================================
-- Migration 010: status explícito em hub_profiles (Hub YFGroup)
-- =============================================
-- hub_profiles/hub_user_modulos são tabelas do Hub (seletor de módulos pós-
-- login, compartilhado por todos os apps YFGroup) -- não nasceram com
-- migration versionada, por isso o número pula direto pra cá.
--
-- BUG que isso corrige: a tela "Gerenciar acessos" (HubAdmin.jsx) hoje decide
-- se um usuário está "pendente" ou "com acesso" contando linhas em
-- hub_user_modulos (perfis.acessos.length). Quando o admin clica em "remover"
-- o último acesso de alguém, a linha é apagada e o usuário VOLTA pra
-- "pendente" -- não existe "negado", e não tem como tirar alguém de
-- "aguardando aprovação" de propósito. Casos reais no banco: os 3 usuários de
-- teste `claudecodeyfg*` foram criados com acesso, depois tiveram o acesso
-- removido, e ficaram presos em "pendente" apesar de terem sido negados de
-- fato.
--
-- Status vira campo PRÓPRIO do perfil, independente de quantos módulos ele
-- tem: 'pendente' (nunca decidido) | 'aprovado' | 'negado'.

ALTER TABLE hub_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovado', 'negado'));

-- Backfill: quem tem pelo menos 1 módulo ativo hoje claramente foi aprovado.
UPDATE hub_profiles p SET status = 'aprovado'
WHERE EXISTS (SELECT 1 FROM hub_user_modulos um WHERE um.user_id = p.id AND um.ativo = true);

-- Os 3 usuários de teste que hoje aparecem presos em "pendente" já foram
-- negados de fato (acesso removido pelo admin) -- corrigido manualmente aqui
-- porque a distinção "nunca teve acesso" x "teve e foi removido" não dá pra
-- inferir só dos dados (a linha em hub_user_modulos foi apagada, não
-- desativada). Dali em diante o app passa a desativar em vez de apagar.
UPDATE hub_profiles SET status = 'negado'
WHERE email IN ('claudecodeyfg@teste.yfgroup.internal', 'claudecodeyfgroup@teste.yfgroup.internal', 'claudecodeyfgroup2@teste.yfgroup.internal');

-- RPC privilegiada: só quem já É admin do hub pode mudar o status de outro
-- perfil. Ao negar, desativa (não apaga) os módulos dele -- defesa em
-- profundidade caso algum código antigo ainda decida acesso pela existência
-- de linha em hub_user_modulos em vez de checar o status.
CREATE OR REPLACE FUNCTION public.hub_admin_set_status(p_user_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_hub_admin() THEN
    RAISE EXCEPTION 'Apenas admin do hub pode alterar status de acesso';
  END IF;
  IF p_status NOT IN ('pendente', 'aprovado', 'negado') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  UPDATE hub_profiles SET status = p_status WHERE id = p_user_id;

  IF p_status = 'negado' THEN
    UPDATE hub_user_modulos SET ativo = false WHERE user_id = p_user_id AND ativo = true;
  END IF;
END;
$$;
