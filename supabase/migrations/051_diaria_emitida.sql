-- =============================================
-- Migration 051: categoria 'diaria_emitida' (o CTe da diária cobrado do cliente)
-- =============================================
-- A diária tem DOIS documentos na planilha bruta e eles vinham em baldes errados:
--   D01/D05 -> categoria 'diaria': o que a empresa PAGA ao motorista na hora.
--              Saldo negativo (nesse CTe não há receita reconhecida).
--   código de FRETE -> o CTe emitido depois cobrando o cliente. Contrato zerado,
--              margem 100%, e estava somado junto com o frete de verdade: inflava
--              a margem do frete e escondia o custo real da diária.
--
-- Motivo (pedido do Yves): apresentar pra gestão, em um card, quanto custa a diária,
-- quanto dela volta em CTe e quanto é frete de verdade. Sem separar os dois
-- documentos não dá pra responder "a diária volta?".
--
-- A régua (espelhada em src/freteConferencia.js, ehDiariaEmitida) foi calibrada nos
-- 2.111 CTes de frete já importados (01-08/2026):
--   • margem 100% (saldo = frete_peso) ...... 243 casos x 1.868 de frete normal
--   • SEM nota fiscal ....................... 96% dos de margem 100% x 1% do frete
--   • valor redondo em centenas ............. 95% x 17%
--   • teto de R$ 5.000 ...................... a maior diária PAGA em 8 meses foi
--     R$ 3.600; acima disso é frete sem contrato preenchido, não diária.
-- Esperado: 227 reclassificados, 10 duvidosos pra fila, 6 seguem como frete.
--
-- NÃO toca em linha com categoria_manual = true (migration 049): categoria definida
-- por uma pessoa nunca é sobrescrita por regra automática.

-- Não há CHECK em `categoria` (conferido em produção), então o valor novo é aditivo.
-- A UNIQUE (cnpj_remetente, categoria, ctrc, periodo_ref) também não colide: a
-- categoria é nova, nenhuma linha existente já a usa.

UPDATE frete_conferencia
   SET categoria     = 'diaria_emitida',
       flag_baixa    = false,
       flag_negativa = false,
       flag_ambigua  = false,
       atualizado_em = now()
 WHERE categoria = 'frete'
   AND coalesce(categoria_manual, false) = false
   AND frete_peso > 0
   AND frete_peso <= 5000
   AND round(saldo::numeric, 2) = round(frete_peso::numeric, 2)
   AND coalesce(btrim(nfs), '') = ''
   AND round(frete_peso::numeric, 2) % 100 = 0;

-- Duvidosos: margem 100% dentro do teto, mas falham em UM dos dois sinais (tem NF
-- ou valor quebrado). Vão pra fila de revisão em vez de serem reclassificados no
-- escuro — quem revisa decide se é diária emitida ou frete com contrato esquecido.
UPDATE frete_conferencia
   SET flag_ambigua = true, atualizado_em = now()
 WHERE categoria = 'frete'
   AND coalesce(categoria_manual, false) = false
   AND decisao_manual IS NULL
   AND frete_peso > 0
   AND frete_peso <= 5000
   AND round(saldo::numeric, 2) = round(frete_peso::numeric, 2)
   AND (coalesce(btrim(nfs), '') = '') <> (round(frete_peso::numeric, 2) % 100 = 0);

COMMENT ON COLUMN frete_conferencia.categoria IS
  'frete | diaria_emitida | descarga | local | diaria | bonificacao. diaria = custo pago ao motorista (D01/D05, saldo negativo); diaria_emitida = o CTe da mesma diária cobrado do cliente depois (margem 100%). Ver src/freteConferencia.js.';
