// ── cargasSemDt.js ──
// Fila de revisão das cargas SEM DT (tabela controle_operacional_sem_dt). CRUD puro.
//
// Contexto: a Suzano às vezes carrega sem DT; o SyncSupabase.gs captura essas linhas (com
// placa) aqui em vez de descartar. Um humano então CONFIRMA (carga real, segue no radar até
// ganhar DT) ou marca ERRO (descarta). Quando o DT verdadeiro chega na planilha, o banco
// concilia sozinho por placa+data_carr+origem (gatilho + conciliar_sem_dt_existentes) —
// por isso esta tela não precisa mexer em controle_operacional, só nos status daqui.
import { supaFetch } from "./supabase.js";

const TABELA = "controle_operacional_sem_dt";

// status: 'pendente' (a revisar) | 'confirmado' (carga real) | 'erro' (descartada) | 'conciliado' (ganhou DT).
export async function listarSemDt(conn, status) {
  const q = (s) => encodeURIComponent(s);
  let path = `${TABELA}?order=data_carr.asc,id.asc`;
  if (status) path = `${TABELA}?status=eq.${q(status)}&order=data_carr.asc,id.asc`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

// Contagem por status numa tacada só (pra badges das abas), sem puxar as linhas todas.
export async function contarSemDtPorStatus(conn) {
  const linhas = (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?select=status`)) || [];
  return linhas.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});
}

// Extrai "MM/YYYY" do data_carr — mesma lógica do agrupamento por mês do Dashboard
// (App.jsx dashData), pra o indicador "Sem DT" seguir o mesmo mês do "Carregamentos".
function mesDeDataCarr(dc) {
  const s = String(dc || "");
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) { const p = s.split("/"); return p[1] + "/" + p[2]; }
  if (/^\d{4}-\d{2}/.test(s))         { const p = s.split("-"); return p[1] + "/" + p[0]; }
  return "";
}

// Conta as cargas que AINDA aguardam DT (pendente + confirmado — exclui 'conciliado', que já
// virou DT real na principal, e 'erro', descartado), opcionalmente por tipo_carga e por mês
// (mesRef = "MM/YYYY"; "todos"/vazio = sem filtro de mês). Alimenta o indicador "Sem DT" do
// Dashboard, que lê a fila SEM tocar no DADOS global. Linha sem data_carr fica de fora quando
// um mês específico está selecionado (igual ao "Carregamentos", que também ignora sem-data).
export async function contarSemDtAguardando(conn, tipoCarga, mesRef, statuses) {
  const q = (s) => encodeURIComponent(s);
  const st = (statuses && statuses.length ? statuses : ["pendente", "confirmado"]).map(q).join(",");
  let path = `${TABELA}?select=data_carr&status=in.(${st})`;
  if (tipoCarga) path += `&tipo_carga=eq.${q(tipoCarga)}`;
  const linhas = (await supaFetch(conn.url, conn.key, "GET", path)) || [];
  if (!mesRef || mesRef === "todos") return linhas.length;
  return linhas.filter((l) => mesDeDataCarr(l.data_carr) === mesRef).length;
}

export async function decidirSemDt(conn, id, status, obs, revisadoPor) {
  const body = {
    status,
    revisado_em: new Date().toISOString(),
    revisado_obs: obs || null,
    revisado_por: revisadoPor || null,
    atualizado_em: new Date().toISOString(),
  };
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${encodeURIComponent(id)}`, body);
  return Array.isArray(res) ? res[0] : res;
}

// Volta uma decisão pra 'pendente' (ex.: marcou erro sem querer). Não mexe em 'conciliado',
// que é fechamento automático do banco.
export async function reabrirSemDt(conn, id) {
  return decidirSemDt(conn, id, "pendente", null, null);
}

// Correção manual dos campos da carga (placa/data/origem/valores/tipo_carga) direto na fila —
// ex.: a linha veio com placa ou valor errado da planilha e a pessoa arruma antes de confirmar.
export async function atualizarSemDt(conn, id, patch) {
  const body = { ...patch, atualizado_em: new Date().toISOString() };
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${encodeURIComponent(id)}`, body);
  return Array.isArray(res) ? res[0] : res;
}

// Exclusão DEFINITIVA da pendência. Atenção: se a linha ainda estiver na planilha (com placa e
// sem DT), o próximo sync a captura de novo. Para descartar de vez o que é lixo recorrente, use
// "Marcar erro" (status='erro'), que o sync preserva (ignore-duplicates) e não recaptura.
export async function excluirSemDt(conn, id) {
  return supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?id=eq.${encodeURIComponent(id)}`);
}
