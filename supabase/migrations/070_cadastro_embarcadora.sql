-- =============================================
-- Migration 070: campos do cadastro exigido pela embarcadora (Suzano)
-- =============================================
-- Contexto: a embarcadora recebe hoje uma planilha preenchida à mão, em dois
-- layouts (blocos empilhados motorista/cavalo/carreta, e três abas
-- MOTORISTA/VEICULOS/CARRETA). O cadastro do app já tem nome, CPF, telefone e
-- as placas; o que falta são exatamente os campos do documento — CNH do
-- motorista e CRLV do veículo — que hoje são digitados de novo a cada envio.
--
-- Os erros que essa digitação produz estão nos arquivos reais: "MAISCULINO",
-- "MOTRISTA", CPF com ponto no lugar do dígito verificador, RENAVAM perdendo o
-- zero à esquerda. Por isso:
--   * renavam é TEXT, nunca numérico — zero à esquerda é significativo
--   * genero/funcao ficam com CHECK de vocabulário, o app só oferece opções
--   * as datas são date de verdade, não texto (validade da CNH vira alerta)
--
-- tanque_litros existe porque a embarcadora pede a capacidade do tanque, que
-- NÃO está no CRLV: é digitado uma vez por cavalo e fica (nas carretas é nulo,
-- que o gerador imprime como "X", igual ao modelo dela).
--
-- especie guarda o que o CRLV escreve ("CAMINHAO TRATOR", "SEMI-REBOQUE"): é a
-- fonte do "TIPO DO VEÍCULO" da planilha, cujo texto muda conforme o layout
-- pedido — a tradução é do template, não do banco.

-- ── Colunas ────────────────────────────────────────────────────────────────
ALTER TABLE motoristas
  ADD COLUMN IF NOT EXISTS cnh_numero               text,
  ADD COLUMN IF NOT EXISTS cnh_categoria            text,
  ADD COLUMN IF NOT EXISTS cnh_validade             date,
  ADD COLUMN IF NOT EXISTS cnh_primeira_habilitacao date,
  ADD COLUMN IF NOT EXISTS cnh_uf                   text,
  ADD COLUMN IF NOT EXISTS genero                   text,
  ADD COLUMN IF NOT EXISTS data_nascimento          date,
  ADD COLUMN IF NOT EXISTS funcao                   text,
  ADD COLUMN IF NOT EXISTS qualificacao             text,
  ADD COLUMN IF NOT EXISTS cadastro_concluido_em    timestamptz;

ALTER TABLE veiculos
  ADD COLUMN IF NOT EXISTS marca                  text,
  ADD COLUMN IF NOT EXISTS modelo                 text,
  ADD COLUMN IF NOT EXISTS cor                    text,
  ADD COLUMN IF NOT EXISTS ano                    smallint,
  ADD COLUMN IF NOT EXISTS renavam                text,
  ADD COLUMN IF NOT EXISTS chassi                 text,
  ADD COLUMN IF NOT EXISTS especie                text,
  ADD COLUMN IF NOT EXISTS tanque_litros          smallint,
  ADD COLUMN IF NOT EXISTS cpf_cnpj_responsavel   text;

-- Vocabulário fechado nos dois campos que a planilha manual mais erra.
-- NOT VALID: não reprova linha antiga (não existe nenhuma hoje, mas o cadastro
-- é editado por várias mãos e o CHECK só precisa valer daqui pra frente).
DO $$ BEGIN
  ALTER TABLE motoristas ADD CONSTRAINT motoristas_genero_chk
    CHECK (genero IS NULL OR genero IN ('MASCULINO','FEMININO')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE motoristas ADD CONSTRAINT motoristas_cnh_uf_chk
    CHECK (cnh_uf IS NULL OR cnh_uf ~ '^[A-Z]{2}$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Um RENAVAM pertence a um veículo só; digitar o do vizinho é erro silencioso.
CREATE UNIQUE INDEX IF NOT EXISTS idx_veiculos_renavam
  ON veiculos (renavam) WHERE renavam IS NOT NULL AND renavam <> '';

-- Busca "quem ainda não tem CNH lançada" na tela de pendências.
CREATE INDEX IF NOT EXISTS idx_motoristas_sem_cnh
  ON motoristas (id) WHERE cnh_numero IS NULL OR cnh_numero = '';

-- ── RPCs (migrations 025/026/041): whitelists precisam dos campos novos ─────
-- atualizar_motorista mudou de forma: o SET era montado sempre como texto
-- (`%I = ($1->>%L)`), o que estoura em coluna date ("column is of type date but
-- expression is of type text"). Passou pro modelo TIPADO do atualizar_veiculo,
-- com nullif(...,'') pra que campo apagado na tela vire NULL em vez de erro de
-- conversão. Os campos text continuam se comportando igual.
CREATE OR REPLACE FUNCTION public.atualizar_motorista(p_token text, p_id uuid, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_set text; v_row motoristas;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  SELECT string_agg(format('%I = nullif($1->>%L,'''')::%s',col,col,typ),', ') INTO v_set
    FROM (VALUES ('nome','text'),('cpf','text'),('tel','text'),('vinculo','text'),
                 ('banco','text'),('agencia','text'),('conta','text'),('favorecido','text'),
                 ('status_risco','text'),('observacao','text'),
                 ('pix_tipo','text'),('pix_chave','text'),
                 ('cnh_numero','text'),('cnh_categoria','text'),('cnh_validade','date'),
                 ('cnh_primeira_habilitacao','date'),('cnh_uf','text'),
                 ('genero','text'),('data_nascimento','date'),
                 ('funcao','text'),('qualificacao','text'),
                 ('cadastro_concluido_em','timestamptz')) AS allowed(col,typ)
    WHERE p_patch ? col;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM motoristas m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE motoristas SET %s WHERE id=$2 RETURNING *',v_set) USING p_patch,p_id INTO v_row;
  RETURN row_to_json(v_row); END; $function$;

CREATE OR REPLACE FUNCTION public.criar_motorista(p_token text, p_dados jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row motoristas;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  IF coalesce(p_dados->>'nome','')='' THEN RAISE EXCEPTION 'nome obrigatório' USING ERRCODE='P0001'; END IF;
  INSERT INTO motoristas (nome,cpf,tel,vinculo,banco,agencia,conta,favorecido,status_risco,
                          observacao,pix_tipo,pix_chave,criado_por,
                          cnh_numero,cnh_categoria,cnh_validade,cnh_primeira_habilitacao,cnh_uf,
                          genero,data_nascimento,funcao,qualificacao,cadastro_concluido_em)
  VALUES (p_dados->>'nome',p_dados->>'cpf',p_dados->>'tel',p_dados->>'vinculo',p_dados->>'banco',
          p_dados->>'agencia',p_dados->>'conta',p_dados->>'favorecido',p_dados->>'status_risco',
          p_dados->>'observacao',p_dados->>'pix_tipo',p_dados->>'pix_chave',p_dados->>'criado_por',
          p_dados->>'cnh_numero',p_dados->>'cnh_categoria',
          nullif(p_dados->>'cnh_validade','')::date,
          nullif(p_dados->>'cnh_primeira_habilitacao','')::date,
          p_dados->>'cnh_uf',p_dados->>'genero',
          nullif(p_dados->>'data_nascimento','')::date,
          p_dados->>'funcao',p_dados->>'qualificacao',
          nullif(p_dados->>'cadastro_concluido_em','')::timestamptz)
  RETURNING * INTO v_row; RETURN row_to_json(v_row); END; $function$;

CREATE OR REPLACE FUNCTION public.criar_veiculo(p_token text, p_dados jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row veiculos; v_placa text; v_existe boolean;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  v_placa := upper(regexp_replace(coalesce(p_dados->>'placa',''),'[^A-Za-z0-9]','','g'));
  IF v_placa='' THEN RAISE EXCEPTION 'placa obrigatória' USING ERRCODE='P0001'; END IF;
  SELECT EXISTS(SELECT 1 FROM veiculos WHERE placa=v_placa) INTO v_existe;
  IF v_existe THEN
    UPDATE veiculos SET
      tipo=coalesce(p_dados->>'tipo',tipo),
      config_eixos=coalesce(p_dados->>'config_eixos',config_eixos),
      carroceria=coalesce(p_dados->>'carroceria',carroceria),
      capacidade_m3=coalesce((p_dados->>'capacidade_m3')::numeric,capacidade_m3),
      motorista_id=coalesce((p_dados->>'motorista_id')::uuid,motorista_id),
      num_eixos=coalesce((p_dados->>'num_eixos')::smallint,num_eixos),
      marca=coalesce(nullif(p_dados->>'marca',''),marca),
      modelo=coalesce(nullif(p_dados->>'modelo',''),modelo),
      cor=coalesce(nullif(p_dados->>'cor',''),cor),
      ano=coalesce(nullif(p_dados->>'ano','')::smallint,ano),
      renavam=coalesce(nullif(p_dados->>'renavam',''),renavam),
      chassi=coalesce(nullif(p_dados->>'chassi',''),chassi),
      especie=coalesce(nullif(p_dados->>'especie',''),especie),
      tanque_litros=coalesce(nullif(p_dados->>'tanque_litros','')::smallint,tanque_litros),
      cpf_cnpj_responsavel=coalesce(nullif(p_dados->>'cpf_cnpj_responsavel',''),cpf_cnpj_responsavel)
    WHERE placa=v_placa RETURNING * INTO v_row;
  ELSE
    IF coalesce(p_dados->>'tipo','')='' THEN RAISE EXCEPTION 'tipo obrigatório' USING ERRCODE='P0001'; END IF;
    INSERT INTO veiculos (placa,tipo,config_eixos,carroceria,capacidade_m3,motorista_id,criado_por,num_eixos,
                          marca,modelo,cor,ano,renavam,chassi,especie,tanque_litros,cpf_cnpj_responsavel)
    VALUES (v_placa,p_dados->>'tipo',p_dados->>'config_eixos',p_dados->>'carroceria',
            (p_dados->>'capacidade_m3')::numeric,(p_dados->>'motorista_id')::uuid,
            p_dados->>'criado_por',(p_dados->>'num_eixos')::smallint,
            nullif(p_dados->>'marca',''),nullif(p_dados->>'modelo',''),nullif(p_dados->>'cor',''),
            nullif(p_dados->>'ano','')::smallint,nullif(p_dados->>'renavam',''),
            nullif(p_dados->>'chassi',''),nullif(p_dados->>'especie',''),
            nullif(p_dados->>'tanque_litros','')::smallint,nullif(p_dados->>'cpf_cnpj_responsavel',''))
    RETURNING * INTO v_row;
  END IF;
  RETURN row_to_json(v_row); END; $$;

CREATE OR REPLACE FUNCTION public.atualizar_veiculo(p_token text, p_placa text, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_set text; v_row veiculos; v_placa text;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  v_placa := upper(regexp_replace(coalesce(p_placa,''),'[^A-Za-z0-9]','','g'));
  SELECT string_agg(format('%I = nullif($1->>%L,'''')::%s',col,col,typ),', ') INTO v_set
    FROM (VALUES ('tipo','text'),('config_eixos','text'),('carroceria','text'),
                 ('capacidade_m3','numeric'),('motorista_id','uuid'),('num_eixos','smallint'),
                 ('criado_por','text'),('ativo','boolean'),
                 ('marca','text'),('modelo','text'),('cor','text'),('ano','smallint'),
                 ('renavam','text'),('chassi','text'),('especie','text'),
                 ('tanque_litros','smallint'),('cpf_cnpj_responsavel','text')) AS allowed(col,typ)
    WHERE p_patch ? col;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(v) FROM veiculos v WHERE placa=v_placa); END IF;
  EXECUTE format('UPDATE veiculos SET %s WHERE placa=$2 RETURNING *',v_set) USING p_patch,v_placa INTO v_row;
  RETURN row_to_json(v_row); END; $$;
