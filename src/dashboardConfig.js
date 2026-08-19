// ── dashboardConfig.js ──
// Catálogo dos pedaços do Dashboard, para que "o que cada usuário vê" seja DADO
// e não mais um dashboard por perfil.
//
// Onde fica: hub_user_modulos.config.dash = { kpis:{id:false}, blocos:{id:false} }.
// Só o que está DESLIGADO é gravado — chave ausente significa visível. Isso mantém
// todo mundo que já usa o app exatamente como está, e faz um usuário novo nascer
// com o painel cheio até alguém decidir podar.
//
// Quem lê: views/DashboardView.jsx (gates verKpi/verBloco).
// Quem escreve: screens/HubAdmin.jsx (chips por usuário).
//
// Os `req` são features do perfil da operação (operacao/perfil.js): o bloco só
// aparece na tela de configuração das bases que realmente têm aquilo — não faz
// sentido oferecer "Rastreamento documental" pra uma base que não usa.

export const DASH_KPIS = [
  { k: "hero",       l: "Carregamentos / Receita", d: "Número principal do período (alterna entre volume e receita)." },
  { k: "eficiencia", l: "Taxa de eficiência",      d: "% de cargas com status Carregado." },
  { k: "dts",        l: "DTs únicas",              d: "Documentos distintos no período." },
  { k: "efetivadas", l: "Cargas efetivadas",       d: "Saíram de PENDENTE.", req: "rastreamentoDocumental" },
  { k: "taxa_doc",   l: "Taxa documental",         d: "% com CTE + MDF + NF.", req: "rastreamentoDocumental" },
  { k: "sem_dt",     l: "Sem DT · revisar",        d: "Fila de cargas que rodaram sem DT.", req: "semDt" },
  { k: "sem_faturamento", l: "DTs sem faturamento", d: "Falta CTE, MDF, MAT, ID, NF ou Data Manifesto." },
  { k: "motoristas", l: "Motoristas ativos",       d: "Quantos rodaram no período." },
  { k: "cte_medio",  l: "CTE médio por viagem",    d: "Receita média por carregamento.", fin: true },
  { k: "diarias",    l: "Diárias a pagar",         d: "Saldo devido de diária.", fin: true, req: "diarias" },
  { k: "alertas",    l: "Alertas ativos",          d: "Contador de pendências do topo." },
];

export const DASH_BLOCOS = [
  { k: "por_base",     l: "Comparativo por base", d: "Só no modo \"Todas as bases\": uma linha por base, com drill." },
  { k: "grafico",      l: "Evolução do período", d: "Gráfico de área com a série do mês." },
  { k: "status",       l: "Status das cargas",   d: "Barra empilhada por status." },
  { k: "motoristas",   l: "Top motoristas",      d: "Ranking de quem mais rodou." },
  { k: "documental",   l: "Rastreamento documental", d: "Painel CTE/MDF/NF e o que está faltando.", req: "rastreamentoDocumental" },
  { k: "ranking",      l: "Ranking por cliente", d: "Pódio de volume por cliente/contratante.", req: "rankingCliente" },
  { k: "recentes",     l: "Registros recentes",  d: "Tabela das últimas cargas (abre o detalhe da DT)." },
  { k: "diarias",      l: "Painel de diárias",   d: "Resumo de diárias no lado direito.", req: "diarias" },
  { k: "descargas",    l: "Painel de descargas", d: "Agenda de descarga (hoje/atrasadas)." },
  { k: "destinos",     l: "Top destinos",        d: "Cidades que mais receberam carga." },
  { k: "diarias_pend", l: "Diárias pendentes",   d: "Quem tem saldo de diária a receber.", fin: true, req: "diarias" },
];

// Leitores. `cfg` é o config.dash do usuário; ausência = visível.
export const verKpi   = (cfg, k) => cfg?.kpis?.[k]   !== false;
export const verBloco = (cfg, k) => cfg?.blocos?.[k] !== false;

// ── Ordem (config.dash.ordem = { kpis:[ids], blocos:[ids] }) ─────────────────
// Quem arrasta os cards no Dashboard grava a ordem aqui. Id que não está na
// lista salva (KPI novo numa versão futura, ou card que a base não tinha)
// vai pro FIM, na ordem natural do código — nunca some por falta de registro.
export function ordenar(cfg, tipo, itens, getId = (x) => x.id) {
  const ordem = cfg?.ordem?.[tipo];
  if (!Array.isArray(ordem) || !ordem.length) return itens;
  const pos = new Map(ordem.map((id, i) => [id, i]));
  return [...itens].sort((a, b) => {
    const ia = pos.has(getId(a)) ? pos.get(getId(a)) : Infinity;
    const ib = pos.has(getId(b)) ? pos.get(getId(b)) : Infinity;
    return ia - ib;
  });
}

// ── Tamanho (config.dash.tamanhos = { kpis:{id:"p"|"m"|"g"} }) ───────────────
// A faixa de KPIs era `repeat(N,1fr)`: com 9 indicadores ligados cada card ficava
// com ~160px, o rótulo quebrava em três linhas e a régua da faixa sumia. Agora a
// grade tem 12 colunas fixas e cada card declara quantas ocupa — quem quer o card
// principal grande põe G e o resto continua P, sem espremer ninguém.
// Chave ausente = tamanho padrão, mesma regra da visibilidade e da ordem.
export const TAMANHOS = { p: 2, m: 3, g: 4 };       // colunas de 12
export const TAMANHO_ROTULO = { p: "P", m: "M", g: "G" };
export const COLUNAS_GRADE = 12;

export const getTamanho = (cfg, tipo, id, padrao = "p") =>
  (cfg?.tamanhos?.[tipo]?.[id] in TAMANHOS ? cfg.tamanhos[tipo][id] : padrao);

export const setTamanho = (cfg, tipo, id, valor) => ({
  ...cfg,
  tamanhos: { ...(cfg?.tamanhos || {}), [tipo]: { ...(cfg?.tamanhos?.[tipo] || {}), [id]: valor } },
});

// Escritores — devolvem um config.dash NOVO (nunca mutam o atual).
export const setOrdem = (cfg, tipo, ids) => ({
  ...cfg, ordem: { ...(cfg?.ordem || {}), [tipo]: ids },
});

// `visivel:false` grava a chave; voltar a visível REMOVE a chave, mantendo a
// regra "só o que está desligado aparece no config".
export function setVisivel(cfg, tipo, id, visivel) {
  const atual = { ...(cfg?.[tipo] || {}) };
  if (visivel) delete atual[id]; else atual[id] = false;
  return { ...cfg, [tipo]: atual };
}
