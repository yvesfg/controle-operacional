// ── ocorrenciaEtapas.js ──
// A linha da planilha lida como o que ela é: uma LINHA DO TEMPO.
//
// Na planilha, uma DT ocupa uma linha só e as colunas contam a viagem em ordem —
// carregou, chegou, obs da chegada, aguardando descarga, descarregou, obs da
// descarga, RO, NFD. O app mostrava isso como cards soltos com etiquetas
// coloridas, e a sequência (o que já aconteceu, o que falta) se perdia.
//
// Aqui a linha vira etapas com estado. Nada é inventado: cada etapa aponta para
// a coluna que já existe em controle_operacional.
//
// ATENÇÃO — as colunas de observação estão VAZIAS em 100% da base hoje
// (0 de 565 linhas em mai–ago/2026) porque `mapearColuna()` no SyncSupabase.gs
// não tem alias para elas: o que o analista escreve na planilha nunca sobe.
// Enquanto o sync não for corrigido, as etapas de obs aparecem como "sem
// registro" — o que é a verdade, e é justamente o que precisa ficar visível.

// Estados de uma etapa:
//   "feito"     — tem valor
//   "pendente"  — era esperada e não veio (a etapa seguinte já aconteceu, ou há
//                 ocorrência aberta sem relato)
//   "aguardando"— é a próxima da fila, ainda sem cobrança
//   "vazio"     — opcional e sem valor; não é falha
export const ESTADOS = ["feito", "pendente", "aguardando", "vazio"];

const cheio = (v) => String(v ?? "").trim() !== "";

// dd/MM/yyyy ou yyyy-MM-dd → Date (local, sem passeio de fuso)
export const paraData = (s) => {
  const t = String(s || "");
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (br) return new Date(+br[3], +br[2] - 1, +br[1]);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : null;
};

const diasEntre = (a, b) => (a && b ? Math.round((b - a) / 86400000) : null);

// Uma ocorrência "aberta" é o que justifica cobrar relato: RO, NFD ou SGS.
export const temOcorrencia = (r) => cheio(r?.ro) || cheio(r?.nfd?.numero) || cheio(r?.sgs);

export function etapasDaDt(r, hoje = new Date()) {
  if (!r) return [];
  const carregou   = cheio(r.data_carr);
  const chegou     = cheio(r.chegada);
  const descarregou= cheio(r.data_desc);
  const comOcorr   = temOcorrencia(r);

  // Observação sem relato só é cobrada quando há ocorrência aberta: viagem
  // tranquila não tem o que relatar, e marcar tudo como pendência transformaria
  // a tela num campo de alarme falso.
  const obsChegadaEsperada  = comOcorr && chegou;
  const obsDescargaEsperada = comOcorr && descarregou;

  const etapa = (id, label, valor, { data, esperada, opcional, anteriorFeita } = {}) => {
    const preenchida = cheio(valor);
    let estado;
    if (preenchida) estado = "feito";
    else if (esperada) estado = "pendente";
    else if (opcional) estado = "vazio";
    else if (anteriorFeita) estado = "aguardando";
    else estado = "vazio";
    return { id, label, valor: preenchida ? String(valor) : null, data: data || null, estado };
  };

  const lista = [
    etapa("carregou", "Carregou", r.data_carr, { data: r.data_carr }),
    etapa("chegou", "Chegou no cliente", r.chegada, { data: r.chegada, anteriorFeita: carregou }),
    etapa("obs_chegada", "Obs da chegada", r.obs_chegada, {
      data: r.data_obs_chegada, esperada: obsChegadaEsperada, opcional: !obsChegadaEsperada,
    }),
    etapa("aguardando", "Aguardando descarga", r.desc_aguardando, { opcional: true }),
    etapa("descarregou", "Descarregou", r.data_desc, { data: r.data_desc, anteriorFeita: chegou }),
    etapa("obs_descarga", "Obs da descarga", r.obs_descarga, {
      data: r.data_obs_descarga, esperada: obsDescargaEsperada, opcional: !obsDescargaEsperada,
    }),
  ];

  // RO e NFD só entram na trilha quando existem — são o desfecho excepcional,
  // não uma etapa que toda viagem deveria cumprir.
  if (cheio(r.ro)) lista.push({ id: "ro", label: "RO", valor: String(r.ro), data: r.ro_hora || null, estado: "feito", excecao: true });
  if (cheio(r.nfd?.numero)) lista.push({ id: "nfd", label: `NFD ${String(r.nfd.tipo || "").toUpperCase()}`.trim(), valor: String(r.nfd.numero), data: null, estado: "feito", excecao: true });
  if (cheio(r.sgs)) lista.push({ id: "sgs", label: "SGS", valor: String(r.sgs), data: null, estado: "feito", excecao: true });

  // Atraso: agendou a descarga, o dia passou e não descarregou.
  const agenda = paraData(r.data_agenda);
  if (agenda && !descarregou) {
    const zero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const d = diasEntre(agenda, zero);
    if (d != null && d >= 1) {
      const i = lista.findIndex((e) => e.id === "descarregou");
      if (i >= 0) lista[i] = { ...lista[i], estado: "pendente", label: `Descarregou · ${d}d de atraso`, atrasoDias: d };
    }
  }

  return lista;
}

// Onde a viagem parou e o que está faltando — o resumo que a tela usa pra
// ordenar e pra dizer, numa linha, o que precisa de gente.
export function resumoDt(r, hoje = new Date()) {
  const etapas = etapasDaDt(r, hoje);
  const feitas = etapas.filter((e) => e.estado === "feito" && !e.excecao);
  const pendentes = etapas.filter((e) => e.estado === "pendente");
  const ultima = feitas.length ? feitas[feitas.length - 1] : null;
  return {
    etapas,
    pendentes,
    ultima,
    // Ordena a lista: quem tem pendência aparece primeiro, e mais atraso sobe mais.
    peso: pendentes.reduce((s, e) => s + 10 + (e.atrasoDias || 0), 0),
    semRelato: temOcorrencia(r) && !cheio(r.obs_chegada) && !cheio(r.obs_descarga),
  };
}
