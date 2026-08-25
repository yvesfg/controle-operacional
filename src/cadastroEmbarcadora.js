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

// ── Validação de CPF/CNPJ ───────────────────────────────────────────────────
// Contar dígito não basta: na planilha manual apareceu "894864203" (9 dígitos)
// no CPF/CNPJ do responsável, e CPF com PONTO no lugar do hífen, que ao perder a
// pontuação vira outro número. O dígito verificador é o que separa "número
// errado" de "número certo" — e é ele que a embarcadora confere.
export function cpfValido(v) {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (ate) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function cnpjValido(v) {
  const d = soDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (ate) => {
    let peso = ate - 7, soma = 0;
    for (let i = 0; i < ate; i++) {
      soma += Number(d[i]) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

// O responsável pelo veículo tanto pode ser pessoa quanto empresa — nos arquivos
// reais aparecem os dois ("436.364.893-72" e "02.191.966/0001-89").
export const cpfCnpjValido = (v) => cpfValido(v) || cnpjValido(v);

export function formatarCpfCnpj(v) {
  const d = soDigitos(v);
  if (d.length === 11) return formatarCPF(d);
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  return String(v ?? "").trim();
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
  if (motorista.cpf && !cpfValido(motorista.cpf)) {
    faltas.push(cpfDigitos(motorista.cpf).length !== 11 ? "CPF incompleto" : "CPF inválido");
  }

  const cavalo = veiculos.filter((v) => v.tipo === "cavalo");
  if (!cavalo.length) faltas.push("Placa do cavalo");

  veiculos.forEach((v) => {
    const quem = `${v.tipo === "cavalo" ? "cavalo" : "carreta"} ${v.placa}`;
    FALTA_VEICULO.forEach(([k, label]) => {
      if (!String(v[k] ?? "").trim()) faltas.push(`${label} do ${quem}`);
    });
    if (renavamSuspeito(v.renavam)) faltas.push(`RENAVAM do ${quem} não tem 11 dígitos`);
    // O responsável é coluna obrigatória nos dois modelos da embarcadora, e foi
    // onde a planilha manual deixou "894864203" — nem CPF nem CNPJ.
    if (!String(v.cpf_cnpj_responsavel ?? "").trim()) faltas.push(`CPF/CNPJ do responsável do ${quem}`);
    else if (!cpfCnpjValido(v.cpf_cnpj_responsavel)) faltas.push(`CPF/CNPJ do responsável do ${quem} é inválido`);
    // Tanque só é exigido do cavalo — na carreta a planilha da embarcadora
    // escreve "X" (não existe tanque pra informar).
    if (v.tipo === "cavalo" && !String(v.tanque_litros ?? "").trim()) faltas.push(`Tanque do ${quem}`);
  });

  // CNH vencida a embarcadora recusa — mandar assim é retrabalho garantido, então
  // entra como pendência e não como aviso.
  if (motorista.cnh_validade && cnhVencida(motorista.cnh_validade)) faltas.push("CNH vencida");
  return faltas;
}

export function cnhVencida(validade, hoje = new Date()) {
  if (!validade) return false;
  const d = new Date(`${String(validade).slice(0, 10)}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d < hoje;
}

// Dias até vencer (negativo = já venceu, null = sem data). A tela usa pra avisar
// antes do envio: CNH que vence em duas semanas volta como problema logo depois
// de o cadastro ter sido aceito.
export function diasParaVencerCnh(validade, hoje = new Date()) {
  if (!validade) return null;
  const d = new Date(`${String(validade).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((d - base) / 86400000);
}

export const DIAS_AVISO_CNH = 30;

// ── Conjunto da viagem ─────────────────────────────────────────
// As placas que valem pro envio são as DA VIAGEM, não as do cadastro: o motorista
// troca de carreta entre uma carga e outra, e a embarcadora quer o conjunto que
// rodou naquela DT. O cadastro entra só como preenchimento do que a DT não traz.
export function conjuntoDaViagem(reg = {}, motorista = {}) {
  const norm = (p) => String(p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const daDt = [reg.placa, reg.placa2, reg.placa3].map(norm).filter(Boolean);
  if (daDt.length) return daDt;
  return [motorista.placa1, motorista.placa2, motorista.placa3, motorista.placa4].map(norm).filter(Boolean);
}
