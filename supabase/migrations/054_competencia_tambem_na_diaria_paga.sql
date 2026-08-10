-- =============================================
-- Migration 054: competência também na diária PAGA (D01/D05)
-- =============================================
-- CORREÇÃO da 053, que só deixava marcar competência na diária EMITIDA. O D01/D05 é emitido
-- antes ou depois do espelho de diária, então o que foi PAGO num mês pode se referir a dois
-- meses de espelho diferentes — e sem competência do lado do custo, comparar pago × emitido
-- por mês continua errado, só que agora do outro lado.
--
-- competencia_ref passa a valer nas duas categorias:
--   diaria         → mês do ESPELHO de diária a que o pagamento se refere
--   diaria_emitida → mês das diárias PAGAS que aquele CTe cobra
-- Vazio (o caso normal) = o próprio periodo_ref, comportamento de antes.

COMMENT ON COLUMN frete_conferencia.competencia_ref IS
  'Diaria paga (D01/D05): mes do espelho a que o pagamento se refere. Diaria emitida: mes das diarias pagas que o CTe cobra. NULL = mes de emissao.';

CREATE OR REPLACE FUNCTION public.definir_competencia_frete(p_token text, p_id uuid, p_ref text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row frete_conferencia; v_ref text;
BEGIN
  PERFORM _validar_token_e_base(p_token, null);
  v_ref := nullif(btrim(coalesce(p_ref, '')), '');
  IF v_ref IS NOT NULL AND v_ref !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Competencia invalida: % (use YYYY-MM)', p_ref USING ERRCODE='P0001';
  END IF;
  SELECT * INTO v_row FROM frete_conferencia WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CTe nao encontrado' USING ERRCODE='P0001'; END IF;
  IF v_row.categoria NOT IN ('diaria', 'diaria_emitida') THEN
    RAISE EXCEPTION 'Competencia so se aplica a diaria paga ou emitida (categoria atual: %)', v_row.categoria USING ERRCODE='P0001';
  END IF;
  UPDATE frete_conferencia SET competencia_ref = v_ref, atualizado_em = now()
   WHERE id = p_id RETURNING * INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;
