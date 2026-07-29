// ── operacao/basesForm.js ──
// Conversão entre a linha de `co_bases` e o formulário do Admin (views/admin/BasesOperacao).
// Fica fora do componente porque é lógica pura — e porque o risco real desta tela é
// SILENCIOSO: se a ida-e-volta perder um campo, abrir e salvar uma base apagaria
// configuração sem ninguém perceber. Separado assim, dá pra testar sem navegador.
import { FEATURES_META, getPerfil } from "./perfil.js";

const PADRAO = getPerfil(undefined); // perfil neutro, sem base aplicada

// "papel:Papel" por linha <-> [{valor,label}]
export const valoresParaTexto = (vs) => (vs || []).map((o) => `${o.valor}:${o.label}`).join("\n");
export const textoParaValores = (txt) =>
  String(txt || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf(":");
    const valor = (i === -1 ? l : l.slice(0, i)).trim();
    return { valor, label: (i === -1 ? l : l.slice(i + 1)).trim() || valor };
  }).filter((o) => o.valor);

export const listaParaTexto = (v) => (v || []).join(", ");
export const textoParaLista = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

export function formDaBase(b) {
  const p = b?.perfil || {};
  return {
    id: b?.id || "",
    label: b?.label || "",
    tabela: b?.tabela || "controle_operacional",
    ordem: b?.ordem ?? 0,
    ancora: p.ancora || PADRAO.ancora,
    rotuloCliente: p.rotuloCliente || PADRAO.rotuloCliente,
    alertas: p.alertas || PADRAO.alertas,
    features: { ...PADRAO.features, ...(p.features || {}) },
    origem: listaParaTexto(p.vocab?.origem),
    complementarMargemZero: p.financeiro?.complementarMargemZero ?? PADRAO.financeiro.complementarMargemZero,
    incluirComplementarPadrao: p.financeiro?.incluirComplementarPadrao ?? PADRAO.financeiro.incluirComplementarPadrao,
    filialDespesas: p.financeiro?.filialDespesas || "",
    clfCampo: p.classificador?.campo || "tipo_carga",
    clfLabel: p.classificador?.label || "Tipo de carga",
    clfPadrao: p.classificador?.padrao || "",
    clfValores: valoresParaTexto(p.classificador?.valores),
  };
}

// Grava SÓ o que diverge do padrão embutido: campo deixado no valor padrão não vai pro
// banco, pra não congelar lá um default que amanhã pode mudar no código.
export function perfilDoForm(f) {
  const perfil = {};
  if (f.ancora !== PADRAO.ancora) perfil.ancora = f.ancora;
  if (f.rotuloCliente !== PADRAO.rotuloCliente) perfil.rotuloCliente = f.rotuloCliente;
  if (f.alertas !== PADRAO.alertas) perfil.alertas = f.alertas;

  const feats = {};
  for (const { k } of FEATURES_META) {
    if (!!f.features[k] !== !!PADRAO.features[k]) feats[k] = !!f.features[k];
  }
  if (Object.keys(feats).length) perfil.features = feats;

  const origem = textoParaLista(f.origem);
  if (origem.length) perfil.vocab = { origem };

  const fin = {};
  if (f.complementarMargemZero !== PADRAO.financeiro.complementarMargemZero) fin.complementarMargemZero = f.complementarMargemZero;
  if (f.incluirComplementarPadrao !== PADRAO.financeiro.incluirComplementarPadrao) fin.incluirComplementarPadrao = f.incluirComplementarPadrao;
  if (String(f.filialDespesas || "").trim()) fin.filialDespesas = String(f.filialDespesas).trim();
  if (Object.keys(fin).length) perfil.financeiro = fin;

  if (f.features.classificadores) {
    const valores = textoParaValores(f.clfValores);
    if (valores.length) {
      perfil.classificador = {
        campo: String(f.clfCampo || "").trim() || "tipo_carga",
        label: String(f.clfLabel || "").trim() || "Tipo de carga",
        padrao: String(f.clfPadrao || "").trim() || valores[0].valor,
        valores,
      };
    }
  }
  return perfil;
}
