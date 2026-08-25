// ── cadastroEmbarcadora.js ──
// Regras do cadastro que a embarcadora exige (motorista + conjunto), num lugar só.
//
// Por que existe: a planilha era preenchida à mão e os arquivos reais mostram o
// preço disso — "MAISCULINO"/"MAICULINO"/"MASCULINO" na mesma coluna, "MOTRISTA",
// ESTADO CNH ora "MA" ora "MARANHÃO", RENAVAM com 9 dígitos porque o Excel comeu
// o zero à esquerda. Nada disso é erro de quem digita: é campo livre sem
// vocabulário. Aqui ficam o vocabulário, a normalização do que já chegou torto e
// a conta de "o que ainda falta neste cadastro".
//
// A tela de cadastro usa para sinalizar pendência; a exportação (fase 3) usa a
// MESMA lista pra não gerar arquivo incompleto — a regra é uma só.

export const GENEROS = ["MASCULINO", "FEMININO"];

// A embarcadora aceita texto livre em FUNÇÃO, mas quem preenche escreve sempre a
// mesma coisa (com erro de digitação). Lista curta cobre o real e mata o typo.
export const FUNCOES = ["MOTORISTA", "AJUDANTE", "OPERADOR"];

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const UF_POR_NOME = {
  ACRE:"AC", ALAGOAS:"AL", AMAPA:"AP", AMAZONAS:"AM", BAHIA:"BA", CEARA:"CE",
  "DISTRITO FEDERAL":"DF", "ESPIRITO SANTO":"ES", GOIAS:"GO", MARANHAO:"MA",
  "MATO GROSSO":"MT", "MATO GROSSO DO SUL":"MS", "MINAS GERAIS":"MG", PARA:"PA",
  PARAIBA:"PB", PARANA:"PR", PERNAMBUCO:"PE", PIAUI:"PI", "RIO DE JANEIRO":"RJ",
  "RIO GRANDE DO NORTE":"RN", "RIO GRANDE DO SUL":"RS", RONDONIA:"RO",
  RORAIMA:"RR", "SANTA CATARINA":"SC", "SAO PAULO":"SP", SERGIPE:"SE", TOCANTINS:"TO",
};

const semAcento = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

export const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");

// "MAISCULINO", "MAICULINO", "M" -> "MASCULINO". O que não reconhece volta vazio
// em vez de chutar: gênero errado no cadastro da embarcadora barra o motorista.
export function normalizarGenero(v) {
  const s = semAcento(v);
  if (!s) return "";
  if (s === "M" || s.startsWith("MASC") || s.startsWith("MAISC") || s.startsWith("MAIC")) return "MASCULINO";
  if (s === "F" || s.startsWith("FEM")) return "FEMININO";
  return "";
}

// "MOTRISTA" -> "MOTORISTA". Sem match, devolve em maiúscula sem acento (texto
// livre continua passando — a coluna da embarcadora aceita).
export function normalizarFuncao(v) {
  const s = semAcento(v);
  if (!s) return "";
  if (s.startsWith("MOT")) return "MOTORISTA";
  if (s.startsWith("AJUD")) return "AJUDANTE";
  if (s.startsWith("OPER")) return "OPERADOR";
  return s;
}

// Aceita "MA", "MARANHÃO" ou "IMPERATRIZ, MA" (como a CNH imprime no campo LOCAL).
export function normalizarUF(v) {
  const s = semAcento(v).replace(/\.$/, "");
  if (!s) return "";
  if (UFS.includes(s)) return s;
  if (UF_POR_NOME[s]) return UF_POR_NOME[s];
  const depoisDaVirgula = s.split(",").pop().trim();
  if (UFS.includes(depoisDaVirgula)) return depoisDaVirgula;
  return "";
}

// CPF é texto no banco (veio da planilha assim) e chega em três formatos: com
// máscara certa, com PONTO no lugar do dígito verificador ("844.951.701.04") e
// só dígitos. Comparação e gravação usam sempre os 11 dígitos.
export const cpfDigitos = (v) => soDigitos(v).slice(0, 11);

export function formatarCPF(v) {
  const d = cpfDigitos(v);
  if (d.length !== 11) return String(v ?? "").trim();
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

// RENAVAM tem 11 dígitos e zero à esquerda É significativo — a planilha manual
// perdeu o zero em pelo menos dois veículos ("549838660" e "894864203") porque a
// célula era numérica. Guardar como texto não basta: quem digita também omite.
export function normalizarRenavam(v) {
  const d = soDigitos(v);
  if (!d) return "";
  return d.length < 11 ? d.padStart(11, "0") : d;
}

export function renavamSuspeito(v) {
  const d = soDigitos(v);
  return !!d && d.length !== 11;
}

// ── Pendências ──────────────────────────────────────────────────────────────
// Um cadastro só é "completo" quando dá pra emitir a linha da planilha sem
// inventar nada. `veiculos` são as peças do conjunto (cavalo + carretas).

const FALTA_MOTORISTA = [
  ["nome",            "Nome"],
  ["cpf",             "CPF"],
  ["cnh_numero",      "Nº da CNH"],
  ["cnh_categoria",   "Categoria da CNH"],
  ["cnh_validade",    "Validade da CNH"],
  ["cnh_uf",          "UF da CNH"],
  ["genero",          "Gênero"],
  ["data_nascimento", "Nascimento"],
  ["tel",             "Telefone"],
  ["funcao",          "Função"],
];

const FALTA_VEICULO = [
  ["marca",   "marca"],
  ["modelo",  "modelo"],
  ["cor",     "cor"],
  ["ano",     "ano"],
  ["renavam", "RENAVAM"],
];

export function pendenciasCadastro(motorista = {}, veiculos = []) {
  const faltas = [];
  FALTA_MOTORISTA.forEach(([k, label]) => {
    if (!String(motorista[k] ?? "").trim()) faltas.push(label);
  });
  if (motorista.cpf && cpfDigitos(motorista.cpf).length !== 11) faltas.push("CPF incompleto");

  const cavalo = veiculos.filter((v) => v.tipo === "cavalo");
  if (!cavalo.length) faltas.push("Placa do cavalo");

  veiculos.forEach((v) => {
    const quem = `${v.tipo === "cavalo" ? "cavalo" : "carreta"} ${v.placa}`;
    FALTA_VEICULO.forEach(([k, label]) => {
      if (!String(v[k] ?? "").trim()) faltas.push(`${label} do ${quem}`);
    });
    if (renavamSuspeito(v.renavam)) faltas.push(`RENAVAM do ${quem} não tem 11 dígitos`);
    // Tanque só é exigido do cavalo — na carreta a planilha da embarcadora
    // escreve "X" (não existe tanque pra informar).
    if (v.tipo === "cavalo" && !String(v.tanque_litros ?? "").trim()) faltas.push(`Tanque do ${quem}`);
  });
  return faltas;
}

// CNH vencida derruba o cadastro na embarcadora — vale avisar antes de enviar.
export function cnhVencida(validade, hoje = new Date()) {
  if (!validade) return false;
  const d = new Date(`${String(validade).slice(0, 10)}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d < hoje;
}

// ── DT ──────────────────────────────────────────────────────────────────────
// A DT é a chave que o analista usa pra falar de uma carga, então ela precisa
// aparecer no cadastro e servir de filtro. O vínculo DT->motorista é o MESMO
// que o ModalWhatsApp já usa: CPF primeiro (só dígitos), depois nome exato,
// depois placa — nessa ordem, porque CPF é o único estável.
export function viagensDoMotorista(DADOS = [], motorista = {}) {
  const cpf = cpfDigitos(motorista.cpf);
  const nome = String(motorista.nome || "").toUpperCase().trim();
  const placas = [motorista.placa1, motorista.placa2, motorista.placa3, motorista.placa4]
    .filter(Boolean).map((p) => String(p).toUpperCase().replace(/[^A-Z0-9]/g, ""));
  return (DADOS || []).filter((reg) => {
    if (cpf && cpfDigitos(reg.cpf) === cpf) return true;
    if (nome && String(reg.nome || "").toUpperCase().trim() === nome) return true;
    const p = String(reg.placa || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return !!p && placas.includes(p);
  });
}

// As placas que valem pro envio são as DA VIAGEM, não as do cadastro: o motorista
// troca de carreta entre uma carga e outra, e a embarcadora quer o conjunto que
// rodou naquela DT. O cadastro entra só como preenchimento do que a DT não traz.
export function conjuntoDaViagem(reg = {}, motorista = {}) {
  const norm = (p) => String(p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const daDt = [reg.placa, reg.placa2, reg.placa3].map(norm).filter(Boolean);
  if (daDt.length) return daDt;
  return [motorista.placa1, motorista.placa2, motorista.placa3, motorista.placa4].map(norm).filter(Boolean);
}
