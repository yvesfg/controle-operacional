// ── validators.js — validação de dados antes do upsert no Supabase ──

const VINCULO_OPTS   = ["TERCEIRO", "FROTA", "AGREGADO"];
const STATUS_OPTS    = ["CARREGADO", "PENDENTE", "NO-SHOW", "NÃO ACEITE", "EM ABERTO", "CANCELADO"];
const RO_STATUS_OPTS = ["EM TRATATIVA", "FINALIZADO"];
const ORIGEM_OPTS    = ["IMPERATRIZ-MA", "BELEM-PA"];
const SIM_NAO_OPTS   = ["sim", "nao"];

const NUM_FIELDS   = ["vl_cte","vl_contrato","adiant","saldo","diaria_prev","diaria_pg","vl_cte_comp","dias"];
const DATE_FIELDS  = ["data_carr","data_agenda","chegada","data_desc","data_manifesto","data_obs_chegada","data_obs_descarga","data_homerico","data_liberacao","data_criacao"];
const STR_MAX_255  = ["nome","cpf","placa","placa2","placa3","origem","destino","cte","mdf","nf","mat","ro","ro_hora","cliente","sgs","gerenc","forms","obs","sinistro","codigo","gerenciadora","contratante","rdo","contrato_mat","cadastro_fortes","cte_comp_num","minutas_dcc","cte_comp","mdf_comp","mat_comp"];

function isNullish(v) { return v === null || v === undefined; }

function checkEnum(campo, valor, opcoes) {
  if (isNullish(valor)) return null;
  if (!opcoes.includes(valor)) return `"${campo}" inválido: "${valor}". Permitidos: ${opcoes.join(", ")}`;
  return null;
}

function checkNumeric(campo, valor) {
  if (isNullish(valor)) return null;
  const n = typeof valor === "number" ? valor : parseFloat(String(valor).replace(",", "."));
  if (isNaN(n)) return `"${campo}" deve ser numérico, recebido: "${valor}"`;
  return null;
}

function checkStrLen(campo, valor, max) {
  if (isNullish(valor)) return null;
  if (typeof valor !== "string") return null;
  if (valor.length > max) return `"${campo}" excede ${max} caracteres (${valor.length})`;
  return null;
}

/**
 * Valida um registro operacional antes de enviar ao Supabase.
 * @param {object} reg — objeto limpo (sem _override, "" já convertido para null)
 * @returns {{ ok: boolean, erros: string[] }}
 */
export function validarRegistroOperacional(reg) {
  const erros = [];

  // Obrigatório
  if (!reg.dt) erros.push('"dt" é obrigatório');

  // ENUMs
  erros.push(checkEnum("vinculo",          reg.vinculo,          VINCULO_OPTS));
  erros.push(checkEnum("status",           reg.status,           STATUS_OPTS));
  erros.push(checkEnum("ro_status",        reg.ro_status,        RO_STATUS_OPTS));
  erros.push(checkEnum("origem",           reg.origem,           ORIGEM_OPTS));
  erros.push(checkEnum("informou_analista",reg.informou_analista, SIM_NAO_OPTS));

  // Numéricos
  for (const f of NUM_FIELDS) erros.push(checkNumeric(f, reg[f]));

  // Comprimento strings
  for (const f of STR_MAX_255) erros.push(checkStrLen(f, reg[f], 255));

  // obs/sinistro podem ser maiores
  erros.push(checkStrLen("obs_chegada",    reg.obs_chegada,    2000));
  erros.push(checkStrLen("obs_descarga",   reg.obs_descarga,   2000));

  // Boolean
  if (!isNullish(reg.desc_aguardando) && typeof reg.desc_aguardando !== "boolean") {
    erros.push('"desc_aguardando" deve ser boolean');
  }

  const lista = erros.filter(Boolean);
  return { ok: lista.length === 0, erros: lista };
}
